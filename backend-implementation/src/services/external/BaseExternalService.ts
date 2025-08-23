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

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { logger, Timer } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import {
  ExternalServiceError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
  gracefulDegradation,
} from "@/middleware/errorHandler";
import { 
  fallbackStrategyManager, 
  FallbackContext,
  ServicePriority,
  BusinessCriticality 
} from "./FallbackStrategyManager";
import { serviceMeshManager } from "./ServiceMeshManager";

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
  // Enhanced fallback configuration
  servicePriority?: ServicePriority;
  businessCriticality?: BusinessCriticality;
  enableServiceMesh?: boolean;
  enableAdvancedFallback?: boolean;
  fallbackStrategies?: string[];
  regions?: string[];
  healthCheckEndpoint?: string;
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
  useGracefulDegradation?: boolean;
  fallbackData?: any;
  metadata?: Record<string, any>;
  // Enhanced fallback options
  useServiceMesh?: boolean;
  useAdvancedFallback?: boolean;
  businessContext?: {
    urgency: "low" | "medium" | "high" | "critical";
    customerFacing: boolean;
    revenueImpacting: boolean;
  };
  preferredRegion?: string;
  maxCostIncrease?: number; // percentage
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
    fallbackUsed?: boolean;
    fallbackStrategy?: string;
    serviceMeshNodeId?: string;
    costImpact?: number;
    degradationLevel?: "none" | "minor" | "moderate" | "severe";
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
      servicePriority: ServicePriority.MEDIUM,
      businessCriticality: BusinessCriticality.PERFORMANCE_OPTIMIZATION,
      enableServiceMesh: true,
      enableAdvancedFallback: true,
      ...config,
    };

    this.serviceName = this.config.serviceName;
    this.circuitBreakerKey = `circuit_breaker:${this.serviceName}`;
    this.rateLimitKey = `rate_limit:${this.serviceName}`;

    this.initializeClient();
    this.registerWithServiceMesh();
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
        logger.error(`${this.serviceName} Request Error`, {
          error: error instanceof Error ? error?.message : String(error),
        });
        return Promise.reject(error);
      },
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
          message: error instanceof Error ? error?.message : String(error),
          data: error.response?.data,
        });

        return Promise.reject(error);
      },
    );
  }

  /**
   * Make API request with enhanced fallback mechanisms
   */
  protected async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const timer = new Timer(`${this.serviceName}.${method}.${endpoint}`);
    const requestId = options.metadata?.requestId || this.generateRequestId();
    
    // Try service mesh routing first if enabled
    if (this.config.enableServiceMesh && options.useServiceMesh !== false) {
      try {
        return await this.executeServiceMeshRequest<T>(
          method, 
          endpoint, 
          data, 
          options, 
          timer,
          requestId
        );
      } catch (meshError) {
        logger.warn("Service mesh request failed, falling back to direct request", {
          serviceName: this.serviceName,
          error: meshError?.message
        });
        // Continue with direct request as fallback
      }
    }

    // Direct request execution
    return await this.executeDirectRequest<T>(
      method,
      endpoint,
      data,
      options,
      timer,
      requestId
    );
  }

  /**
   * Execute request through service mesh
   */
  private async executeServiceMeshRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {},
    timer: Timer,
    requestId: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await serviceMeshManager.executeServiceRequest(
        this.serviceName,
        `${method}:${endpoint}`,
        { method, endpoint, data, options },
        {
          requestId,
          userId: options.metadata?.userId,
          organizationId: options.metadata?.organizationId,
          region: options.preferredRegion,
          businessContext: options.businessContext
        }
      );

      const duration = timer.end({
        success: true,
        serviceMesh: true
      });

      return {
        success: true,
        data: result.data,
        statusCode: 200,
      };

    } catch (error: unknown) {
      // If service mesh fails, try advanced fallback if enabled
      if (this.config.enableAdvancedFallback && options.useAdvancedFallback !== false) {
        return await this.executeAdvancedFallback<T>(
          method,
          endpoint,
          data,
          options,
          error,
          timer,
          requestId
        );
      }
      throw error;
    }
  }

  /**
   * Execute direct request (original implementation with enhancements)
   */
  private async executeDirectRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {},
    timer: Timer,
    requestId: string
  ): Promise<ApiResponse<T>> {
    let attempt = 0;
    const maxAttempts = options?.retries || this.config?.retryAttempts || 3;

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
            timeout: options?.timeout || this.config.timeout,
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
            requestConfig.headers = {
              ...requestConfig.headers,
              skipAuth: true,
            };
          }

          const response = await this.client.request(requestConfig);

          // Record successful request for circuit breaker
          if (!options.skipCircuitBreaker) {
            await this.recordSuccess();
          }

          const duration = timer.end({
            success: true,
            attempt,
            statusCode: response.status,
          });

          return {
            success: true,
            data: response.data,
            statusCode: response.status,
            headers: response.headers,
          };
        } catch (error: unknown) {
          const axiosError = error as AxiosError;
          const isRetryableError = this.isRetryableError(axiosError);

          // Record failure for circuit breaker
          if (!options.skipCircuitBreaker) {
            await this.recordFailure();
          }

          // If this is the last attempt or not retryable, try fallback strategies
          if (
            attempt >= maxAttempts ||
            !isRetryableError ||
            options.skipRetry
          ) {
            const duration = timer.end({
              error: axiosError?.message,
              attempt,
              statusCode: axiosError.response?.status,
            });

            const serviceError = new ExternalServiceError(
              this.serviceName,
              this.formatErrorMessage(axiosError),
              isRetryableError,
            );

            // Try advanced fallback if enabled
            if (this.config.enableAdvancedFallback && options.useAdvancedFallback !== false) {
              try {
                return await this.executeAdvancedFallback<T>(
                  method,
                  endpoint,
                  data,
                  options,
                  serviceError,
                  timer,
                  requestId
                );
              } catch (fallbackError) {
                logger.error("Advanced fallback failed", {
                  serviceName: this.serviceName,
                  originalError: serviceError?.message,
                  fallbackError: fallbackError?.message
                });
              }
            }

            // Try basic graceful degradation if enabled
            if (options.useGracefulDegradation) {
              try {
                const fallbackResult =
                  await gracefulDegradation.handleGracefully(serviceError, {
                    serviceName: this.serviceName,
                    fallbackData: options.fallbackData,
                    requestData: { method, endpoint, data },
                  });

                return {
                  success: false,
                  data: fallbackResult,
                  error: serviceError?.message,
                  statusCode: serviceError.statusCode,
                };
              } catch (degradationError) {
                // Graceful degradation failed, continue with original error
              }
            }

            throw serviceError;
          }

          // Wait before retry with exponential backoff
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);

          logger.warn(`${this.serviceName} request failed, retrying`, {
            attempt,
            maxAttempts,
            delay,
            error: axiosError?.message,
          });
        }
      }
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(this.serviceName, error instanceof Error ? error?.message : String(error));
    }

    // This should never be reached
    throw new ExternalServiceError(
      this.serviceName,
      "Unexpected error occurred",
    );
  }

  /**
   * Execute advanced fallback strategy
   */
  private async executeAdvancedFallback<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {},
    error: any,
    timer: Timer,
    requestId: string
  ): Promise<ApiResponse<T>> {
    logger.info("Executing advanced fallback strategy", {
      serviceName: this.serviceName,
      method,
      endpoint,
      error: error instanceof Error ? error?.message : String(error)
    });

    // Create fallback context
    const fallbackContext: FallbackContext = {
      serviceName: this.serviceName,
      operation: `${method}:${endpoint}`,
      originalRequest: { method, endpoint, data, options },
      error,
      businessContext: options.businessContext
    };

    try {
      const fallbackResult = await fallbackStrategyManager.executeFallback(fallbackContext);
      
      const duration = timer.end({
        success: fallbackResult.success,
        fallback: true,
        strategy: fallbackResult.strategy.strategyId
      });

      return {
        success: fallbackResult.success,
        data: fallbackResult.data,
        error: fallbackResult.success ? undefined : error instanceof Error ? error?.message : String(error),
        statusCode: fallbackResult.success ? 200 : (error?.statusCode || 503),
      };

    } catch (fallbackError) {
      logger.error("Advanced fallback execution failed", {
        serviceName: this.serviceName,
        originalError: error instanceof Error ? error?.message : String(error),
        fallbackError: fallbackError?.message
      });
      
      throw error; // Return original error if fallback fails
    }
  }

  /**
   * GET request wrapper
   */
  protected async get<T>(
    endpoint: string,
    params?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("GET", endpoint, params, options);
  }

  /**
   * POST request wrapper
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("POST", endpoint, data, options);
  }

  /**
   * PUT request wrapper
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("PUT", endpoint, data, options);
  }

  /**
   * DELETE request wrapper
   */
  protected async delete<T>(
    endpoint: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("DELETE", endpoint, undefined, options);
  }

  /**
   * PATCH request wrapper
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest("PATCH", endpoint, data, options);
  }

  /**
   * Abstract method for authentication header
   */
  protected abstract getAuthHeader(): string;

  /**
   * Register service with service mesh
   */
  private registerWithServiceMesh(): void {
    if (!this.config.enableServiceMesh) {
      return;
    }

    try {
      // Register service node with mesh manager
      serviceMeshManager.registerNode({
        nodeId: `${this.serviceName}-primary-${this.config.regions?.[0] || 'us-east-1'}`,
        serviceName: this.serviceName,
        serviceType: this.getServiceType(),
        region: this.config.regions?.[0] || 'us-east-1',
        endpoint: this.config.baseURL,
        healthCheckEndpoint: this.config?.healthCheckEndpoint || `${this.config.baseURL}/health`,
        priority: this.config?.servicePriority || ServicePriority.MEDIUM,
        businessCriticality: this.config?.businessCriticality || BusinessCriticality.PERFORMANCE_OPTIMIZATION,
        capabilities: this.getServiceCapabilities(),
        dependencies: []-deployment-001`,
          lastHealthCheck: new Date(),
          uptime: 100,
          requestCount: 0,
          errorCount: 0
        },
        config: {
          maxConcurrentConnections: 50,
          timeout: this.config?.timeout || 10000,
          retryPolicy: {
            maxRetries: this.config?.retryAttempts || 3,
            backoffMultiplier: 2,
            maxBackoffMs: 10000
          },
          circuitBreaker: {
            threshold: this.config?.circuitBreakerThreshold || 5,
            timeout: this.config?.circuitBreakerTimeout || 30000,
            monitoringPeriod: 60000
          }
        }
      });

      logger.info("Service registered with service mesh", {
        serviceName: this.serviceName,
        serviceType: this.getServiceType(),
        priority: this.config.servicePriority,
        businessCriticality: this.config.businessCriticality
      });

    } catch (error: unknown) {
      logger.warn("Failed to register service with service mesh", {
        serviceName: this.serviceName,
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  /**
   * Get service type for classification
   */
  private getServiceType(): string {
    // Override in specific service implementations
    return "external_api";
  }

  /**
   * Get service capabilities
   */
  private getServiceCapabilities(): string[] {
    // Override in specific service implementations
    return ["api_requests"];
  }

  /**
   * Get enhanced health status including fallback capabilities
   */
  public async getEnhancedHealthStatus(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    circuitBreaker?: any;
    serviceMesh?: any;
    fallbackStrategies?: any;
    lastCheck: Date;
  }> {
    const basicHealth = await this.getHealthStatus();
    
    let serviceMeshHealth = null;
    let fallbackStrategies = null;

    if (this.config.enableServiceMesh) {
      try {
        const meshStatus = serviceMeshManager.getServiceMeshStatus();
        serviceMeshHealth = {
          totalNodes: meshStatus.totalNodes,
          healthyNodes: meshStatus.healthyNodes,
          openCircuitBreakers: meshStatus.openCircuitBreakers
        };
      } catch (error: unknown) {
        logger.warn("Failed to get service mesh health", {
          serviceName: this.serviceName,
          error: error instanceof Error ? error?.message : String(error)
        });
      }
    }

    if (this.config.enableAdvancedFallback) {
      try {
        const strategiesHealth = fallbackStrategyManager.getStrategiesHealthStatus();
        const serviceStrategies = Object.values(strategiesHealth)
          .filter((strategy: any) => strategy.serviceName === this.serviceName);
        
        fallbackStrategies = {
          totalStrategies: serviceStrategies.length,
          healthyProviders: serviceStrategies.reduce((sum: number, strategy: any) => sum + strategy.healthyProviders, 0),
          totalProviders: serviceStrategies.reduce((sum: number, strategy: any) => sum + strategy.totalProviders, 0)
        };
      } catch (error: unknown) {
        logger.warn("Failed to get fallback strategies health", {
          serviceName: this.serviceName,
          error: error instanceof Error ? error?.message : String(error)
        });
      }
    }

    return {
      ...basicHealth,
      serviceMesh: serviceMeshHealth,
      fallbackStrategies
    };
  }

  /**
   * Execute request with business context for intelligent routing
   */
  protected async executeWithBusinessContext<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    businessContext?: {
      urgency: "low" | "medium" | "high" | "critical";
      customerFacing: boolean;
      revenueImpacting: boolean;
      userId?: string;
      organizationId?: string;
    }
  ): Promise<ApiResponse<T>> {
    const options: ApiRequestOptions = {
      useServiceMesh: true,
      useAdvancedFallback: true,
      businessContext
    };

    // Adjust timeouts based on business context
    if (businessContext) {
      switch (businessContext.urgency) {
        case "critical":
          options.timeout = this.config.timeout ? this.config.timeout * 0.5 : 5000; // Faster timeout for critical
          options.retries = 1; // Fewer retries for critical - fail fast to fallback
          break;
        case "high":
          options.timeout = this.config.timeout ? this.config.timeout * 0.8 : 8000;
          options.retries = 2;
          break;
        case "low":
          options.timeout = this.config.timeout ? this.config.timeout * 1.5 : 15000; // More time for low priority
          options.retries = this.config?.retryAttempts || 3;
          break;
      }

      // For revenue impacting requests, ensure advanced fallback is enabled
      if (businessContext.revenueImpacting) {
        options.useAdvancedFallback = true;
        options.maxCostIncrease = 50; // Allow higher cost for revenue protection
      }
    }

    return this.makeRequest<T>(method, endpoint, data, options);
  }

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
            "Service temporarily unavailable (circuit breaker open)",
          );
        } else {
          // Move to half-open state
          circuit.state = CircuitState.HALF_OPEN;
          await redisClient.setex(
            this.circuitBreakerKey,
            300, // 5 minutes
            JSON.stringify(circuit),
          );
        }
      }
    } catch (error: unknown) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      // If Redis is down, just log and continue
      logger.warn(`Circuit breaker check failed for ${this.serviceName}`, {
        error: error instanceof Error ? error?.message : String(error),
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
        JSON.stringify(circuit),
      );
    } catch (error: unknown) {
      logger.warn(`Failed to record success for ${this.serviceName}`, {
        error: error instanceof Error ? error?.message : String(error),
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
      if (circuit.failureCount >= (this.config?.circuitBreakerThreshold || 5)) {
        circuit.state = CircuitState.OPEN;
        circuit.nextRetryTime =
          Date.now() + (this.config?.circuitBreakerTimeout || 30000);
      }

      await redisClient.setex(
        this.circuitBreakerKey,
        300, // 5 minutes
        JSON.stringify(circuit),
      );
    } catch (error: unknown) {
      logger.warn(`Failed to record failure for ${this.serviceName}`, {
        error: error instanceof Error ? error?.message : String(error),
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
          `Rate limit exceeded (${requests} requests per ${window}s)`,
        );
      }
    } catch (error: unknown) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      // If Redis is down, just log and continue
      logger.warn(`Rate limit check failed for ${this.serviceName}`, {
        error: error instanceof Error ? error?.message : String(error),
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
    return (
      status >= 500 ||
      status === 408 ||
      status === 429 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config?.retryDelay || 1000;
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
      return `Request error: ${error instanceof Error ? error?.message : String(error)}`;
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
    } catch (error: unknown) {
      return {
        service: this.serviceName,
        status: "unhealthy",
        lastCheck: new Date(),
      };
    }
  }
}

export default BaseExternalService;
