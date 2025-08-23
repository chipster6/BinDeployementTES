/**
 * ============================================================================
 * ERROR BOUNDARY RESILIENCE PATTERNS
 * ============================================================================
 *
 * Comprehensive error boundary patterns for system resilience and graceful
 * failure management. Provides hierarchical error boundaries, circuit breaker
 * integration, and business continuity protection.
 *
 * Boundary Types:
 * 1. Application Level Boundaries
 * 2. Service Level Boundaries  
 * 3. Operation Level Boundaries
 * 4. External Integration Boundaries
 * 5. Database Transaction Boundaries
 * 6. Critical Business Process Boundaries
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Enterprise Error Boundaries
 */

import { logger, Timer } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import {
  AppError,
  ValidationError,
  ExternalServiceError,
  DatabaseOperationError,
  CircuitBreakerError,
  TimeoutError,
} from "@/middleware/errorHandler";
import { comprehensiveErrorOrchestrationHub } from "@/services/ComprehensiveErrorOrchestrationHub";

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  boundaryName: string;
  boundaryType: "application" | "service" | "operation" | "external" | "database" | "business_process";
  maxFailures: number;
  resetTimeout: number; // milliseconds
  enableCircuitBreaker: boolean;
  enableFallback: boolean;
  enableRetry: boolean;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    retryableErrors: string[];
  };
  businessImpact: "low" | "medium" | "high" | "critical";
  enableOrchestration: boolean;
  alertThreshold: number;
  enableGracefulDegradation: boolean;
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  totalRequests: number;
  successfulRequests: number;
  consecutiveFailures: number;
  lastResetTime: number;
}

/**
 * Error boundary result
 */
export interface ErrorBoundaryResult<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  boundaryTriggered: boolean;
  fallbackUsed: boolean;
  retryCount: number;
  circuitBreakerState: "closed" | "open" | "half_open";
  executionTime: number;
  recoveryStrategy?: string;
}

/**
 * Fallback strategy interface
 */
export interface FallbackStrategy<T = any> {
  name: string;
  priority: number;
  canExecute(error: AppError): boolean;
  execute(context: any): Promise<T>;
  getExpectedResult(): T;
}

/**
 * Base Error Boundary Implementation
 */
export abstract class ErrorBoundary<T = any> {
  protected config: ErrorBoundaryConfig;
  protected state: ErrorBoundaryState;
  protected fallbackStrategies: FallbackStrategy<T>[] = [];
  private readonly stateKey: string;

  constructor(config: ErrorBoundaryConfig) {
    this.config = config;
    this.stateKey = `error_boundary:${config.boundaryName}`;
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      consecutiveFailures: 0,
      lastResetTime: Date.now(),
    };
    this.loadState();
  }

  /**
   * Execute operation within error boundary
   */
  public async execute(
    operation: () => Promise<T>,
    context?: any
  ): Promise<ErrorBoundaryResult<T>> {
    const startTime = Date.now();
    const timer = new Timer(`error_boundary.${this.config.boundaryName}`);
    
    // Check circuit breaker state
    if (this.shouldRejectRequest()) {
      timer.end({ circuitBreakerOpen: true });
      return {
        success: false,
        error: new CircuitBreakerError(this.config.boundaryName),
        boundaryTriggered: true,
        fallbackUsed: false,
        retryCount: 0,
        circuitBreakerState: "open",
        executionTime: Date.now() - startTime,
      };
    }

    this.state.totalRequests++;
    let retryCount = 0;
    let lastError: AppError | undefined;
    const maxRetries = this.config.retryConfig?.maxRetries || 0;

    // Retry loop
    while (retryCount <= maxRetries) {
      try {
        const result = await this.executeWithTimeout(operation);
        
        // Success - record and return
        await this.recordSuccess();
        timer.end({ success: true, retryCount });
        
        return {
          success: true,
          data: result,
          boundaryTriggered: false,
          fallbackUsed: false,
          retryCount,
          circuitBreakerState: this.state.isOpen ? "open" : "closed",
          executionTime: Date.now() - startTime,
        };

      } catch (error: unknown) {
        const standardizedError = this.standardizeError(error);
        lastError = standardizedError;
        
        // Check if error is retryable
        if (this.isRetryableError(standardizedError) && retryCount < maxRetries) {
          retryCount++;
          
          // Calculate retry delay
          const delay = this.config.retryConfig?.exponentialBackoff
            ? (this.config.retryConfig?.retryDelay || 1000) * Math.pow(2, retryCount - 1)
            : (this.config.retryConfig?.retryDelay || 1000);
          
          logger.warn(`Error boundary retry attempt ${retryCount}`, {
            boundaryName: this.config.boundaryName,
            error: standardizedError?.message,
            retryDelay: delay,
          });
          
          await this.delay(delay);
          continue;
        }
        
        // No more retries - record failure
        await this.recordFailure(standardizedError);
        break;
      }
    }

    // Operation failed - try fallback strategies
    if (this.config.enableFallback && lastError) {
      const fallbackResult = await this.tryFallbackStrategies(lastError, context);
      if (fallbackResult.success) {
        timer.end({ fallbackUsed: true, retryCount });
        return {
          ...fallbackResult,
          retryCount,
          circuitBreakerState: this.state.isOpen ? "open" : "closed",
          executionTime: Date.now() - startTime,
        };
      }
    }

    // Trigger comprehensive error orchestration if enabled
    if (this.config.enableOrchestration && lastError) {
      await this.triggerErrorOrchestration(lastError, context);
    }

    timer.end({ error: lastError?.message, retryCount });
    
    return {
      success: false,
      error: lastError || new AppError("Operation failed", 500),
      boundaryTriggered: true,
      fallbackUsed: false,
      retryCount,
      circuitBreakerState: this.state.isOpen ? "open" : "closed",
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Register fallback strategy
   */
  public registerFallback(strategy: FallbackStrategy<T>): void {
    this.fallbackStrategies.push(strategy);
    this.fallbackStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get current boundary state
   */
  public getState(): ErrorBoundaryState {
    return { ...this.state };
  }

  /**
   * Reset boundary state
   */
  public async reset(): Promise<void> {
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      totalRequests: this.state.totalRequests,
      successfulRequests: this.state.successfulRequests,
      consecutiveFailures: 0,
      lastResetTime: Date.now(),
    };
    await this.saveState();
    
    logger.info(`Error boundary ${this.config.boundaryName} reset`, {
      boundaryName: this.config.boundaryName,
    });
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout(operation: () => Promise<T>): Promise<T> {
    if (!this.config.retryConfig) {
      return await operation();
    }

    const timeout = 30000; // 30 seconds default timeout
    
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(this.config.boundaryName, timeout));
      }, timeout);

      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Check if request should be rejected by circuit breaker
   */
  private shouldRejectRequest(): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }

    const now = Date.now();
    
    // Check if circuit breaker should reset
    if (this.state.isOpen && now - this.state.lastFailureTime > this.config.resetTimeout) {
      this.state.isOpen = false;
      this.state.consecutiveFailures = 0;
      this.saveState();
      
      logger.info(`Circuit breaker reset for ${this.config.boundaryName}`, {
        boundaryName: this.config.boundaryName,
      });
    }

    return this.state.isOpen;
  }

  /**
   * Record successful operation
   */
  private async recordSuccess(): Promise<void> {
    this.state.successfulRequests++;
    this.state.consecutiveFailures = 0;
    
    if (this.state.isOpen) {
      this.state.isOpen = false;
      logger.info(`Circuit breaker closed for ${this.config.boundaryName}`, {
        boundaryName: this.config.boundaryName,
      });
    }
    
    await this.saveState();
  }

  /**
   * Record failed operation
   */
  private async recordFailure(error: AppError): Promise<void> {
    this.state.failureCount++;
    this.state.consecutiveFailures++;
    this.state.lastFailureTime = Date.now();
    
    // Check if circuit breaker should open
    if (this.config.enableCircuitBreaker && 
        this.state.consecutiveFailures >= this.config.maxFailures) {
      this.state.isOpen = true;
      
      logger.error(`Circuit breaker opened for ${this.config.boundaryName}`, {
        boundaryName: this.config.boundaryName,
        consecutiveFailures: this.state.consecutiveFailures,
        error: error instanceof Error ? error?.message : String(error),
      });
    }
    
    // Check if alerting threshold reached
    if (this.state.consecutiveFailures >= this.config.alertThreshold) {
      await this.triggerAlert(error);
    }
    
    await this.saveState();
  }

  /**
   * Try fallback strategies
   */
  private async tryFallbackStrategies(
    error: AppError, 
    context: any
  ): Promise<ErrorBoundaryResult<T>> {
    for (const strategy of this.fallbackStrategies) {
      if (strategy.canExecute(error)) {
        try {
          logger.info(`Executing fallback strategy: ${strategy.name}`, {
            boundaryName: this.config.boundaryName,
            strategy: strategy.name,
            error: error instanceof Error ? error?.message : String(error),
          });
          
          const result = await strategy.execute(context);
          
          return {
            success: true,
            data: result,
            boundaryTriggered: true,
            fallbackUsed: true,
            retryCount: 0,
            circuitBreakerState: this.state.isOpen ? "open" : "closed",
            executionTime: 0,
            recoveryStrategy: strategy.name,
          };
          
        } catch (fallbackError) {
          logger.error(`Fallback strategy ${strategy.name} failed`, {
            boundaryName: this.config.boundaryName,
            strategy: strategy.name,
            originalError: error instanceof Error ? error?.message : String(error),
            fallbackError: fallbackError instanceof Error ? fallbackError?.message : 'Unknown fallback error',
          });
        }
      }
    }

    return {
      success: false,
      error,
      boundaryTriggered: true,
      fallbackUsed: false,
      retryCount: 0,
      circuitBreakerState: this.state.isOpen ? "open" : "closed",
      executionTime: 0,
    };
  }

  /**
   * Trigger comprehensive error orchestration
   */
  private async triggerErrorOrchestration(error: AppError, context: any): Promise<void> {
    try {
      await comprehensiveErrorOrchestrationHub.executeComprehensiveOrchestration(
        error,
        {
          businessImpact: this.config.businessImpact as any,
          orchestrationLevel: "enhanced" as any,
          coordinationStrategy: "adaptive" as any,
          businessContext: {
            revenueAtRisk: this.calculateRevenueAtRisk(),
            customersAffected: this.calculateCustomersAffected(),
            slaImpact: this.calculateSLAImpact(),
            urgency: this.config.businessImpact,
            escalationRequired: this.config.businessImpact === "critical",
            complianceRequirements: [],
          },
          technicalContext: {
            environment: "production",
            region: "us-east-1",
            zone: "us-east-1a",
          },
        }
      );
    } catch (orchestrationError) {
      logger.error("Error orchestration failed", {
        boundaryName: this.config.boundaryName,
        originalError: error instanceof Error ? error?.message : String(error),
        orchestrationError: orchestrationError instanceof Error ? orchestrationError?.message : 'Unknown orchestration error',
      });
    }
  }

  /**
   * Trigger alert for threshold breach
   */
  private async triggerAlert(error: AppError): Promise<void> {
    logger.error(`Error boundary alert threshold reached`, {
      boundaryName: this.config.boundaryName,
      boundaryType: this.config.boundaryType,
      consecutiveFailures: this.state.consecutiveFailures,
      alertThreshold: this.config.alertThreshold,
      businessImpact: this.config.businessImpact,
      error: error instanceof Error ? error?.message : String(error),
      errorCode: error.code,
    });

    // Additional alerting logic can be implemented here
    // (e.g., send to monitoring system, notify on-call engineers)
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AppError): boolean {
    if (!this.config.enableRetry || !this.config.retryConfig) {
      return false;
    }

    return this.config.retryConfig.retryableErrors.includes(error?.code || "UNKNOWN");
  }

  /**
   * Standardize error to AppError
   */
  private standardizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        `${this.config.boundaryName} operation failed: ${error instanceof Error ? error?.message : String(error)}`,
        500,
        "BOUNDARY_ERROR"
      );
    }

    return new AppError(
      `${this.config.boundaryName} operation failed due to unknown error`,
      500,
      "UNKNOWN_BOUNDARY_ERROR"
    );
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load state from Redis
   */
  private async loadState(): Promise<void> {
    try {
      const stateData = await redisClient.get(this.stateKey);
      if (stateData) {
        this.state = { ...this.state, ...JSON.parse(stateData) };
      }
    } catch (error: unknown) {
      logger.warn(`Failed to load error boundary state for ${this.config.boundaryName}`, {
        error: error instanceof Error ? error?.message : 'Unknown error',
      });
    }
  }

  /**
   * Save state to Redis
   */
  private async saveState(): Promise<void> {
    try {
      await redisClient.setex(this.stateKey, 86400, JSON.stringify(this.state)); // 24 hours TTL
    } catch (error: unknown) {
      logger.warn(`Failed to save error boundary state for ${this.config.boundaryName}`, {
        error: error instanceof Error ? error?.message : 'Unknown error',
      });
    }
  }

  // Business impact calculation methods (to be overridden by specific implementations)
  protected calculateRevenueAtRisk(): number {
    return 0;
  }

  protected calculateCustomersAffected(): number {
    return 0;
  }

  protected calculateSLAImpact(): number {
    return 0;
  }
}

/**
 * Service Level Error Boundary
 */
export class ServiceErrorBoundary<T = any> extends ErrorBoundary<T> {
  constructor(serviceName: string, config?: Partial<ErrorBoundaryConfig>) {
    super({
      boundaryName: `service_${serviceName}`,
      boundaryType: "service",
      maxFailures: 5,
      resetTimeout: 60000, // 1 minute
      enableCircuitBreaker: true,
      enableFallback: true,
      enableRetry: true,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "EXTERNAL_SERVICE_ERROR"],
      },
      businessImpact: "medium",
      enableOrchestration: true,
      alertThreshold: 3,
      enableGracefulDegradation: true,
      ...config,
    });
  }

  protected calculateRevenueAtRisk(): number {
    return 5000; // $5k default for service failures
  }

  protected calculateCustomersAffected(): number {
    return 100; // 100 customers default
  }

  protected calculateSLAImpact(): number {
    return 99.9; // 99.9% SLA target
  }
}

/**
 * Database Operation Error Boundary
 */
export class DatabaseErrorBoundary<T = any> extends ErrorBoundary<T> {
  constructor(operationName: string, config?: Partial<ErrorBoundaryConfig>) {
    super({
      boundaryName: `database_${operationName}`,
      boundaryType: "database",
      maxFailures: 3,
      resetTimeout: 30000, // 30 seconds
      enableCircuitBreaker: true,
      enableFallback: true,
      enableRetry: true,
      retryConfig: {
        maxRetries: 2,
        retryDelay: 500,
        exponentialBackoff: true,
        retryableErrors: ["DATABASE_ERROR", "TIMEOUT_ERROR"],
      },
      businessImpact: "high",
      enableOrchestration: true,
      alertThreshold: 2,
      enableGracefulDegradation: true,
      ...config,
    });
  }

  protected calculateRevenueAtRisk(): number {
    return 10000; // $10k default for database failures
  }

  protected calculateCustomersAffected(): number {
    return 500; // 500 customers default
  }

  protected calculateSLAImpact(): number {
    return 99.5; // 99.5% SLA impact
  }
}

/**
 * External API Error Boundary
 */
export class ExternalAPIErrorBoundary<T = any> extends ErrorBoundary<T> {
  constructor(serviceName: string, config?: Partial<ErrorBoundaryConfig>) {
    super({
      boundaryName: `external_api_${serviceName}`,
      boundaryType: "external",
      maxFailures: 10,
      resetTimeout: 120000, // 2 minutes
      enableCircuitBreaker: true,
      enableFallback: true,
      enableRetry: true,
      retryConfig: {
        maxRetries: 5,
        retryDelay: 2000,
        exponentialBackoff: true,
        retryableErrors: [
          "EXTERNAL_SERVICE_ERROR",
          "NETWORK_ERROR", 
          "TIMEOUT_ERROR",
          "CIRCUIT_BREAKER_OPEN"
        ],
      },
      businessImpact: "medium",
      enableOrchestration: true,
      alertThreshold: 5,
      enableGracefulDegradation: true,
      ...config,
    });
  }

  protected calculateRevenueAtRisk(): number {
    return 2000; // $2k default for external API failures
  }

  protected calculateCustomersAffected(): number {
    return 50; // 50 customers default
  }

  protected calculateSLAImpact(): number {
    return 99.9; // 99.9% SLA target
  }
}

/**
 * Critical Business Process Error Boundary
 */
export class CriticalBusinessProcessErrorBoundary<T = any> extends ErrorBoundary<T> {
  constructor(processName: string, config?: Partial<ErrorBoundaryConfig>) {
    super({
      boundaryName: `critical_process_${processName}`,
      boundaryType: "business_process",
      maxFailures: 1,
      resetTimeout: 300000, // 5 minutes
      enableCircuitBreaker: true,
      enableFallback: true,
      enableRetry: true,
      retryConfig: {
        maxRetries: 1,
        retryDelay: 5000,
        exponentialBackoff: false,
        retryableErrors: ["TIMEOUT_ERROR", "NETWORK_ERROR"],
      },
      businessImpact: "critical",
      enableOrchestration: true,
      alertThreshold: 1,
      enableGracefulDegradation: true,
      ...config,
    });
  }

  protected calculateRevenueAtRisk(): number {
    return 50000; // $50k default for critical process failures
  }

  protected calculateCustomersAffected(): number {
    return 1000; // 1000 customers default
  }

  protected calculateSLAImpact(): number {
    return 99.0; // 99.0% SLA impact
  }
}

// Export factory functions for easy creation
export const createServiceBoundary = <T = any>(serviceName: string, config?: Partial<ErrorBoundaryConfig>) =>
  new ServiceErrorBoundary<T>(serviceName, config);

export const createDatabaseBoundary = <T = any>(operationName: string, config?: Partial<ErrorBoundaryConfig>) =>
  new DatabaseErrorBoundary<T>(operationName, config);

export const createExternalAPIBoundary = <T = any>(serviceName: string, config?: Partial<ErrorBoundaryConfig>) =>
  new ExternalAPIErrorBoundary<T>(serviceName, config);

export const createCriticalProcessBoundary = <T = any>(processName: string, config?: Partial<ErrorBoundaryConfig>) =>
  new CriticalBusinessProcessErrorBoundary<T>(processName, config);

export default {
  ErrorBoundary,
  ServiceErrorBoundary,
  DatabaseErrorBoundary,
  ExternalAPIErrorBoundary,
  CriticalBusinessProcessErrorBoundary,
  createServiceBoundary,
  createDatabaseBoundary,
  createExternalAPIBoundary,
  createCriticalProcessBoundary,
};