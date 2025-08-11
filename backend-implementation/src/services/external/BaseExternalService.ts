/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BASE EXTERNAL SERVICE
 * ============================================================================
 *
 * Abstract base class for external service integrations.
 * Provides consistent patterns for API calls, error handling, retry logic,
 * rate limiting, and circuit breaker functionality.
 *
 * Features:
 * - HTTP client with proper configuration
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Rate limiting and throttling
 * - Request/response logging
 * - Error handling and fallback mechanisms
 * - Performance monitoring
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { logger, Timer } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { ExternalServiceError } from "@/middleware/errorHandler";

/**
 * Service configuration interface
 */
export interface ExternalServiceConfig {
  serviceName: string;
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  headers?: Record<string, string>;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  retries?: number;
  timeout?: number;
  skipAuth?: boolean;
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
  metadata?: Record<string, any>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  metadata?: {
    requestId?: string;
    duration: number;
    attempt: number;
    fromCache?: boolean;
  };
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open",
}

/**
 * Circuit breaker interface
 */
interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

/**
 * Abstract base external service class
 */
export abstract class BaseExternalService {
  protected config: ExternalServiceConfig;
  protected client: AxiosInstance;
  protected serviceName: string;
  protected circuitBreakerKey: string;
  protected rateLimitKey: string;

  constructor(config: ExternalServiceConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      ...config,
    };

    this.serviceName = this.config.serviceName;
    this.circuitBreakerKey = `circuit_breaker:${this.serviceName}`;
    this.rateLimitKey = `rate_limit:${this.serviceName}`;

    this.initializeClient();
  }

  /**
   * Initialize HTTP client with interceptors
   */
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "User-Agent": "WasteManagement/1.0.0",
        ...this.config.headers,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key if provided
        if (this.config.apiKey && !config.headers.skipAuth) {
          config.headers.Authorization = this.getAuthHeader();
        }

        // Add request ID for tracking
        config.headers["X-Request-ID"] = this.generateRequestId();

        logger.debug(`${this.serviceName} API Request`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: this.maskSensitiveHeaders(config.headers),
        });

        return config;
      },
      (error) => {
        logger.error(`${this.serviceName} Request Error`, { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`${this.serviceName} API Response`, {
          status: response.status,
          url: response.config.url,
          duration: this.getResponseTime(response),
        });

        return response;
      },
      (error) => {
        logger.error(`${this.serviceName} Response Error`, {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make API request with retry logic and circuit breaker
   */
  protected async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const timer = new Timer(`${this.serviceName}.${method}.${endpoint}`);
    let attempt = 0;
    const maxAttempts = options.retries || this.config.retryAttempts || 3;

    try {
      // Check circuit breaker
      if (!options.skipCircuitBreaker) {
        await this.checkCircuitBreaker();
      }

      // Check rate limit
      if (this.config.rateLimit) {
        await this.checkRateLimit();
      }

      while (attempt < maxAttempts) {
        attempt++;

        try {
          const requestConfig: AxiosRequestConfig = {
            method,
            url: endpoint,
            timeout: options.timeout || this.config.timeout,
            metadata: options.metadata,
          };

          if (data) {
            if (method === "GET") {
              requestConfig.params = data;
            } else {
              requestConfig.data = data;
            }
          }

          if (options.skipAuth) {
            requestConfig.headers = { ...requestConfig.headers, skipAuth: true };
          }

          const response = await this.client.request(requestConfig);

          // Record successful request for circuit breaker
          if (!options.skipCircuitBreaker) {
            await this.recordSuccess();
          }

          const duration = timer.end({ 
            success: true, 
            attempt, 
            statusCode: response.status 
          });

          return {
            success: true,
            data: response.data,
            statusCode: response.status,
            headers: response.headers,
            metadata: {
              requestId: response.headers["x-request-id"],
              duration,
              attempt,
            },
          };

        } catch (error) {
          const axiosError = error as AxiosError;
          const isRetryableError = this.isRetryableError(axiosError);

          // Record failure for circuit breaker
          if (!options.skipCircuitBreaker) {
            await this.recordFailure();
          }

          // If this is the last attempt or not retryable, throw
          if (attempt >= maxAttempts || !isRetryableError || options.skipRetry) {
            const duration = timer.end({ 
              error: axiosError.message, 
              attempt, 
              statusCode: axiosError.response?.status 
            });

            throw new ExternalServiceError(
              this.serviceName,
              this.formatErrorMessage(axiosError)
            );
          }

          // Wait before retry with exponential backoff
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);

          logger.warn(`${this.serviceName} request failed, retrying`, {
            attempt,
            maxAttempts,
            delay,
            error: axiosError.message,
          });
        }
      }

    } catch (error) {
      timer.end({ error: error.message });
      
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(this.serviceName, error.message);
    }

    // This should never be reached
    throw new ExternalServiceError(this.serviceName, "Unexpected error occurred");
  }

  /**
   * GET request wrapper
   */
  protected async get<T>(
    endpoint: string,
    params?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("GET", endpoint, params, options);
  }

  /**
   * POST request wrapper
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("POST", endpoint, data, options);
  }

  /**
   * PUT request wrapper
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("PUT", endpoint, data, options);
  }

  /**
   * DELETE request wrapper
   */
  protected async delete<T>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("DELETE", endpoint, undefined, options);
  }

  /**
   * PATCH request wrapper
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("PATCH", endpoint, data, options);
  }

  /**
   * Abstract method for authentication header
   */
  protected abstract getAuthHeader(): string;

  /**
   * Check circuit breaker state
   */
  private async checkCircuitBreaker(): Promise<void> {
    try {
      const circuitData = await redisClient.get(this.circuitBreakerKey);
      if (!circuitData) return;

      const circuit: CircuitBreaker = JSON.parse(circuitData);
      const now = Date.now();

      if (circuit.state === CircuitState.OPEN) {
        if (now < circuit.nextRetryTime) {
          throw new ExternalServiceError(
            this.serviceName,
            "Service temporarily unavailable (circuit breaker open)"
          );
        } else {
          // Move to half-open state
          circuit.state = CircuitState.HALF_OPEN;
          await redisClient.setex(
            this.circuitBreakerKey,
            300, // 5 minutes
            JSON.stringify(circuit)
          );
        }
      }
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      // If Redis is down, just log and continue
      logger.warn(`Circuit breaker check failed for ${this.serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Record successful request
   */
  private async recordSuccess(): Promise<void> {
    try {
      const circuitData = await redisClient.get(this.circuitBreakerKey);
      if (!circuitData) return;

      const circuit: CircuitBreaker = JSON.parse(circuitData);
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;

      await redisClient.setex(
        this.circuitBreakerKey,
        300, // 5 minutes
        JSON.stringify(circuit)
      );
    } catch (error) {
      logger.warn(`Failed to record success for ${this.serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Record failed request
   */
  private async recordFailure(): Promise<void> {
    try {
      let circuit: CircuitBreaker;
      const circuitData = await redisClient.get(this.circuitBreakerKey);
      
      if (circuitData) {
        circuit = JSON.parse(circuitData);
      } else {
        circuit = {
          state: CircuitState.CLOSED,
          failureCount: 0,
          lastFailureTime: 0,
          nextRetryTime: 0,
        };
      }

      circuit.failureCount++;
      circuit.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (circuit.failureCount >= (this.config.circuitBreakerThreshold || 5)) {
        circuit.state = CircuitState.OPEN;
        circuit.nextRetryTime = Date.now() + (this.config.circuitBreakerTimeout || 30000);
      }

      await redisClient.setex(
        this.circuitBreakerKey,
        300, // 5 minutes
        JSON.stringify(circuit)
      );
    } catch (error) {
      logger.warn(`Failed to record failure for ${this.serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    try {
      const { requests, window } = this.config.rateLimit;
      const key = `${this.rateLimitKey}:${Math.floor(Date.now() / (window * 1000))}`;
      
      const current = await redisClient.incr(key);
      await redisClient.expire(key, window);

      if (current > requests) {
        throw new ExternalServiceError(
          this.serviceName,
          `Rate limit exceeded (${requests} requests per ${window}s)`
        );
      }
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      // If Redis is down, just log and continue
      logger.warn(`Rate limit check failed for ${this.serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors are retryable
    if (!error.response) return true;

    const status = error.response.status;
    
    // Retry on server errors and some client errors
    return status >= 500 || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get response time from response
   */
  private getResponseTime(response: AxiosResponse): number {
    const requestTime = response.config.metadata?.startTime;
    return requestTime ? Date.now() - requestTime : 0;
  }

  /**
   * Mask sensitive headers for logging
   */
  private maskSensitiveHeaders(headers: any): any {
    const masked = { ...headers };
    const sensitiveHeaders = ["authorization", "x-api-key", "cookie"];
    
    sensitiveHeaders.forEach((header) => {
      if (masked[header]) {
        masked[header] = "*****";
      }
    });

    return masked;
  }

  /**
   * Format error message
   */
  private formatErrorMessage(error: AxiosError): string {
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      return "Network error: No response received";
    } else {
      return `Request error: ${error.message}`;
    }
  }

  /**
   * Get service health status
   */
  public async getHealthStatus(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    circuitBreaker?: CircuitBreaker;
    lastCheck: Date;
  }> {
    try {
      const circuitData = await redisClient.get(this.circuitBreakerKey);
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      let circuit: CircuitBreaker | undefined;

      if (circuitData) {
        circuit = JSON.parse(circuitData);
        
        if (circuit.state === CircuitState.OPEN) {
          status = "unhealthy";
        } else if (circuit.failureCount > 0) {
          status = "degraded";
        }
      }

      return {
        service: this.serviceName,
        status,
        circuitBreaker: circuit,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: "unhealthy",
        lastCheck: new Date(),
      };
    }
  }
}

export default BaseExternalService;