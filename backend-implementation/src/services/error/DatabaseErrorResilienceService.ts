/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE ERROR RESILIENCE SERVICE
 * ============================================================================
 *
 * Comprehensive error resilience system for database operations.
 * Provides bulletproof error handling, graceful degradation, and recovery
 * strategies for all database interactions, including PostgreSQL and Redis.
 *
 * Database Resilience Features:
 * - Circuit breaker patterns for database connections
 * - Connection pool monitoring and recovery
 * - Query timeout and retry mechanisms
 * - Graceful degradation for read operations
 * - Transaction rollback and recovery
 * - Cache fallback strategies
 * - Connection health monitoring
 *
 * Created by: Error Resilience Guardian  
 * Date: 2025-08-20
 * Version: 1.0.0 - Comprehensive Database Error Handling
 */

import { BaseService, ServiceResult } from "../BaseService";
import { logger, Timer } from "@/utils/logger";
import { 
  AppError,
  DatabaseOperationError,
  TimeoutError,
  CircuitBreakerError,
  ResourceUnavailableError,
  ConfigurationError
} from "@/middleware/errorHandler";
import { sequelize } from "@/config/database";
import { redisClient } from "@/config/redis";
import { Transaction, ConnectionError, TimeoutError as SequelizeTimeoutError } from "sequelize";

/**
 * =============================================================================
 * DATABASE ERROR CLASSIFICATION
 * =============================================================================
 */

/**
 * Database error types for comprehensive classification
 */
export enum DatabaseErrorType {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_LOST = 'CONNECTION_LOST',
  CONNECTION_POOL_EXHAUSTED = 'CONNECTION_POOL_EXHAUSTED',
  
  // Query errors
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  QUERY_SYNTAX_ERROR = 'QUERY_SYNTAX_ERROR',
  DEADLOCK_DETECTED = 'DEADLOCK_DETECTED',
  LOCK_TIMEOUT = 'LOCK_TIMEOUT',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Transaction errors
  TRANSACTION_ROLLBACK = 'TRANSACTION_ROLLBACK',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  SERIALIZATION_FAILURE = 'SERIALIZATION_FAILURE',
  TRANSACTION_ABORTED = 'TRANSACTION_ABORTED',
  
  // Data errors
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  CHECK_CONSTRAINT_VIOLATION = 'CHECK_CONSTRAINT_VIOLATION',
  NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',
  
  // System errors
  DISK_FULL = 'DISK_FULL',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  INSUFFICIENT_PRIVILEGE = 'INSUFFICIENT_PRIVILEGE',
  DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE',
  
  // Cache errors (Redis)
  CACHE_CONNECTION_FAILED = 'CACHE_CONNECTION_FAILED',
  CACHE_TIMEOUT = 'CACHE_TIMEOUT',
  CACHE_MEMORY_EXCEEDED = 'CACHE_MEMORY_EXCEEDED',
  CACHE_EVICTION_POLICY_TRIGGERED = 'CACHE_EVICTION_POLICY_TRIGGERED'
}

/**
 * Database error severity levels
 */
export enum DatabaseErrorSeverity {
  LOW = 'low',        // Minor performance impact
  MEDIUM = 'medium',  // Some operations affected
  HIGH = 'high',      // Major functionality impacted
  CRITICAL = 'critical' // System-wide database failure
}

/**
 * Database operation types
 */
export enum DatabaseOperationType {
  READ = 'read',
  WRITE = 'write',
  TRANSACTION = 'transaction',
  BULK_OPERATION = 'bulk_operation',
  CACHE_OPERATION = 'cache_operation',
  MIGRATION = 'migration',
  BACKUP = 'backup'
}

/**
 * Database fallback strategies
 */
export enum DatabaseFallbackStrategy {
  CACHE_FALLBACK = 'cache_fallback',
  READ_REPLICA = 'read_replica',
  DEGRADED_SERVICE = 'degraded_service',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  CIRCUIT_BREAKER = 'circuit_breaker',
  OFFLINE_MODE = 'offline_mode'
}

/**
 * Database error context
 */
export interface DatabaseErrorContext {
  operation: DatabaseOperationType;
  tableName?: string;
  queryType?: string;
  errorType: DatabaseErrorType;
  severity: DatabaseErrorSeverity;
  recoverable: boolean;
  canUseFallback: boolean;
  fallbackStrategy?: DatabaseFallbackStrategy;
  connectionInfo?: {
    host: string;
    database: string;
    poolSize: number;
    activeConnections: number;
  };
  attemptCount?: number;
  executionTime?: number;
  timestamp: Date;
  additionalData?: any;
}

/**
 * Connection health status
 */
export interface ConnectionHealthStatus {
  isHealthy: boolean;
  latency: number;
  activeConnections: number;
  totalConnections: number;
  connectionUtilization: number; // percentage
  errors: number;
  lastError?: Date;
  uptime: number;
}

/**
 * =============================================================================
 * DATABASE ERROR RESILIENCE SERVICE
 * =============================================================================
 */

export class DatabaseErrorResilienceService extends BaseService<any> {
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: Date;
    isOpen: boolean;
    threshold: number;
    timeout: number;
    halfOpenRequests: number;
  }> = new Map();

  private connectionHealthHistory: Map<string, ConnectionHealthStatus[]> = new Map();
  private queryRetryCount: Map<string, number> = new Map();
  private transactionRegistry: Map<string, { 
    startTime: Date; 
    operations: string[];
    timeout: number;
  }> = new Map();

  // Configuration constants
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 120000; // 2 minutes
  private readonly QUERY_TIMEOUT = 30000; // 30 seconds
  private readonly TRANSACTION_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CONNECTION_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONNECTION_UTILIZATION = 80; // 80%

  constructor() {
    super(null as any, "DatabaseErrorResilienceService");
    this.initializeCircuitBreakers();
    this.startHealthMonitoring();
  }

  /**
   * =============================================================================
   * PRIMARY RESILIENCE METHODS
   * =============================================================================
   */

  /**
   * Execute database query with comprehensive error handling
   */
  public async executeQueryWithResilience<T>(
    queryFn: () => Promise<T>,
    context: {
      operation: DatabaseOperationType;
      tableName?: string;
      queryType?: string;
      timeout?: number;
      fallbackData?: T;
      cacheKey?: string;
    }
  ): Promise<ServiceResult<T>> {
    const timer = new Timer('DatabaseErrorResilienceService.executeQueryWithResilience');
    const operationId = this.generateOperationId(context?.queryType || 'unknown');

    try {
      // Pre-flight checks
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.isHealthy && !this.canUseCircuitBreaker(context.operation)) {
        return await this.handleUnhealthyDatabase(context);
      }

      // Check circuit breaker
      const circuitKey = this.getCircuitBreakerKey(context.operation, context.tableName);
      if (this.isCircuitBreakerOpen(circuitKey)) {
        return await this.handleCircuitBreakerOpen(context);
      }

      let lastError: any = null;
      const timeout = context?.timeout || this.QUERY_TIMEOUT;

      // Attempt operation with retry logic
      for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(
            queryFn,
            timeout,
            `Database ${context.operation} operation`
          );

          // Success - reset circuit breaker
          this.resetCircuitBreaker(circuitKey);
          this.queryRetryCount.delete(operationId);

          const executionTime = timer.end({
            success: true,
            operation: context.operation,
            tableName: context.tableName,
            attempt,
            timeout
          });

          logger.info("Database query executed successfully", {
            operation: context.operation,
            tableName: context.tableName,
            queryType: context.queryType,
            attempt,
            executionTime
          });

          return {
            success: true,
            data: result,
            message: "Database operation completed successfully"
          };

        } catch (error: unknown) {
          lastError = error;
          const errorContext = this.createErrorContext(
            context.operation,
            error,
            context.tableName,
            context.queryType,
            attempt
          );

          logger.warn("Database query attempt failed", {
            operation: context.operation,
            tableName: context.tableName,
            attempt,
            maxAttempts: this.MAX_RETRY_ATTEMPTS,
            error: error instanceof Error ? error?.message : String(error),
            errorType: errorContext.errorType,
            severity: errorContext.severity
          });

          // Check if we should attempt fallback
          if (this.shouldAttemptFallback(errorContext, context)) {
            const fallbackResult = await this.attemptFallback(context, errorContext);
            if (fallbackResult.success) {
              timer.end({ success: true, fallback: true });
              return fallbackResult;
            }
          }

          // Handle specific error types
          if (this.isDeadlockError(error)) {
            await this.handleDeadlock(operationId, attempt);
          } else if (this.isConnectionError(error)) {
            await this.handleConnectionError(operationId, attempt);
          } else if (!this.isRetryableError(error)) {
            // Non-retryable error - fail immediately
            break;
          }

          // Wait before retry (exponential backoff)
          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            await this.waitWithBackoff(attempt);
          }
        }
      }

      // All attempts failed
      this.recordCircuitBreakerFailure(circuitKey);
      this.queryRetryCount.set(operationId, this.MAX_RETRY_ATTEMPTS);

      timer.end({ error: lastError?.message, maxAttemptsReached: true });

      // Final fallback attempt
      if (context.fallbackData !== undefined || context.cacheKey) {
        const fallbackResult = await this.attemptFinalFallback(context);
        if (fallbackResult.success) {
          return fallbackResult;
        }
      }

      return {
        success: false,
        message: `Database operation failed after ${this.MAX_RETRY_ATTEMPTS} attempts`,
        errors: [{
          code: this.classifyError(lastError),
          message: lastError?.message || "Database operation failed"
        }]
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return this.handleCriticalError(error, context);
    }
  }

  /**
   * Execute database transaction with comprehensive error handling
   */
  public async executeTransactionWithResilience<T>(
    transactionFn: (transaction: Transaction) => Promise<T>,
    context: {
      timeout?: number;
      isolationLevel?: string;
      readOnly?: boolean;
      tableName?: string;
      operationDescription?: string;
    }
  ): Promise<ServiceResult<T>> {
    const timer = new Timer('DatabaseErrorResilienceService.executeTransactionWithResilience');
    const transactionId = this.generateTransactionId();

    try {
      const timeout = context?.timeout || this.TRANSACTION_TIMEOUT;
      
      // Register transaction
      this.transactionRegistry.set(transactionId, {
        startTime: new Date(),
        operations: [context?.operationDescription || 'unknown'],
        timeout
      });

      // Check if we can start transaction
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.isHealthy) {
        return {
          success: false,
          message: "Database is unhealthy, cannot start transaction",
          errors: [{
            code: DatabaseErrorType.DATABASE_UNAVAILABLE,
            message: "Database service is currently unavailable"
          }]
        };
      }

      let lastError: any = null;

      for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const result = await sequelize.transaction({
            isolationLevel: context.isolationLevel as any,
            readOnly: context.readOnly,
            timeout
          }, async (transaction: Transaction) => {
            // Set transaction timeout
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new TimeoutError(`Transaction timed out after ${timeout}ms`, timeout));
              }, timeout);
            });

            // Execute transaction function with timeout
            return await Promise.race([
              transactionFn(transaction),
              timeoutPromise
            ]);
          });

          // Success - cleanup and return
          this.transactionRegistry.delete(transactionId);

          const executionTime = timer.end({
            success: true,
            attempt,
            transactionId,
            timeout,
            tableName: context.tableName
          });

          logger.info("Database transaction completed successfully", {
            transactionId,
            attempt,
            executionTime,
            tableName: context.tableName,
            operationDescription: context.operationDescription
          });

          return {
            success: true,
            data: result,
            message: "Transaction completed successfully"
          };

        } catch (error: unknown) {
          lastError = error;
          
          const errorContext = this.createErrorContext(
            DatabaseOperationType.TRANSACTION,
            error,
            context.tableName,
            'transaction',
            attempt
          );

          logger.warn("Database transaction attempt failed", {
            transactionId,
            attempt,
            maxAttempts: this.MAX_RETRY_ATTEMPTS,
            error: error instanceof Error ? error?.message : String(error),
            errorType: errorContext.errorType,
            tableName: context.tableName
          });

          // Handle specific transaction errors
          if (this.isSerializationFailure(error) || this.isDeadlockError(error)) {
            // These are retryable transaction errors
            if (attempt < this.MAX_RETRY_ATTEMPTS) {
              await this.waitWithBackoff(attempt);
              continue;
            }
          } else {
            // Non-retryable error - fail immediately
            break;
          }
        }
      }

      // All attempts failed
      this.transactionRegistry.delete(transactionId);
      timer.end({ error: lastError?.message, maxAttemptsReached: true });

      return {
        success: false,
        message: `Transaction failed after ${this.MAX_RETRY_ATTEMPTS} attempts`,
        errors: [{
          code: this.classifyError(lastError),
          message: lastError?.message || "Transaction failed"
        }]
      };

    } catch (error: unknown) {
      this.transactionRegistry.delete(transactionId);
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return this.handleCriticalError(error, { operation: DatabaseOperationType.TRANSACTION });
    }
  }

  /**
   * Execute cache operation with error handling
   */
  public async executeCacheOperationWithResilience<T>(
    cacheOperation: () => Promise<T>,
    context: {
      operation: 'get' | 'set' | 'del' | 'exists';
      key: string;
      fallbackValue?: T;
      timeout?: number;
    }
  ): Promise<ServiceResult<T>> {
    const timer = new Timer('DatabaseErrorResilienceService.executeCacheOperationWithResilience');

    try {
      // Check Redis connection
      if (!redisClient || !redisClient.isReady) {
        logger.warn("Redis client is not ready", {
          operation: context.operation,
          key: context.key
        });

        if (context.fallbackValue !== undefined) {
          return {
            success: true,
            data: context.fallbackValue,
            message: "Using fallback value due to cache unavailability",
            fallback: true
          };
        }

        return {
          success: false,
          message: "Cache service unavailable and no fallback provided",
          errors: [{
            code: DatabaseErrorType.CACHE_CONNECTION_FAILED,
            message: "Redis connection failed"
          }]
        };
      }

      // Execute cache operation with timeout
      const timeout = context?.timeout || 5000; // 5 seconds for cache operations
      
      try {
        const result = await this.executeWithTimeout(
          cacheOperation,
          timeout,
          `Cache ${context.operation} operation`
        );

        timer.end({ success: true, operation: context.operation });
        return {
          success: true,
          data: result,
          message: "Cache operation completed successfully"
        };

      } catch (error: unknown) {
        logger.warn("Cache operation failed", {
          operation: context.operation,
          key: context.key,
          error: error instanceof Error ? error?.message : String(error)
        });

        // For GET operations, return fallback if available
        if (context.operation === 'get' && context.fallbackValue !== undefined) {
          timer.end({ success: true, fallback: true });
          return {
            success: true,
            data: context.fallbackValue,
            message: "Using fallback value due to cache error",
            fallback: true
          };
        }

        // For SET operations, log but don't fail the request
        if (context.operation === 'set') {
          timer.end({ success: true, cacheSkipped: true });
          return {
            success: true,
            data: undefined as any,
            message: "Cache set operation failed but continuing",
            fallback: true
          };
        }

        timer.end({ error: error instanceof Error ? error?.message : String(error) });
        return {
          success: false,
          message: `Cache ${context.operation} operation failed`,
          errors: [{
            code: DatabaseErrorType.CACHE_TIMEOUT,
            message: error instanceof Error ? error?.message : String(error)
          }]
        };
      }

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return {
        success: false,
        message: "Critical error in cache operation",
        errors: [{
          code: DatabaseErrorType.CACHE_CONNECTION_FAILED,
          message: error instanceof Error ? error?.message : String(error)
        }]
      };
    }
  }

  /**
   * =============================================================================
   * CONNECTION HEALTH MONITORING
   * =============================================================================
   */

  /**
   * Start connection health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error: unknown) {
        logger.error("Health check failed", { error: error instanceof Error ? error?.message : String(error) });
      }
    }, this.CONNECTION_HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform comprehensive database health check
   */
  public async performHealthCheck(): Promise<ConnectionHealthStatus> {
    const timer = new Timer('DatabaseErrorResilienceService.performHealthCheck');

    try {
      const startTime = Date.now();
      
      // Test database connection with simple query
      await sequelize.authenticate();
      const latency = Date.now() - startTime;

      // Get connection pool statistics
      const pool = sequelize.connectionManager.pool;
      const poolStats = {
        totalConnections: pool?.size || 0,
        activeConnections: pool?.used || 0,
        idleConnections: pool?.available || 0
      };

      const connectionUtilization = poolStats.totalConnections > 0 
        ? (poolStats.activeConnections / poolStats.totalConnections) * 100 
        : 0;

      // Determine health status
      const isHealthy = 
        latency < 5000 && // Less than 5 seconds latency
        connectionUtilization < this.MAX_CONNECTION_UTILIZATION;

      const healthStatus: ConnectionHealthStatus = {
        isHealthy,
        latency,
        activeConnections: poolStats.activeConnections,
        totalConnections: poolStats.totalConnections,
        connectionUtilization,
        errors: 0,
        uptime: Date.now() - startTime
      };

      // Store health history
      const history = this.connectionHealthHistory.get('postgresql') || [];
      history.push(healthStatus);
      if (history.length > 100) history.shift(); // Keep last 100 records
      this.connectionHealthHistory.set('postgresql', history);

      timer.end({ 
        isHealthy, 
        latency, 
        connectionUtilization,
        activeConnections: poolStats.activeConnections
      });

      if (!isHealthy) {
        logger.warn("Database health check indicates unhealthy state", {
          latency,
          connectionUtilization,
          activeConnections: poolStats.activeConnections,
          totalConnections: poolStats.totalConnections
        });
      }

      return healthStatus;

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      
      const unhealthyStatus: ConnectionHealthStatus = {
        isHealthy: false,
        latency: -1,
        activeConnections: 0,
        totalConnections: 0,
        connectionUtilization: 100,
        errors: 1,
        lastError: new Date(),
        uptime: 0
      };

      logger.error("Database health check failed", {
        error: error instanceof Error ? error?.message : String(error),
        errorType: this.classifyError(error)
      });

      return unhealthyStatus;
    }
  }

  /**
   * =============================================================================
   * ERROR CLASSIFICATION AND RECOVERY
   * =============================================================================
   */

  /**
   * Create comprehensive error context
   */
  private createErrorContext(
    operation: DatabaseOperationType,
    error: any,
    tableName?: string,
    queryType?: string,
    attemptCount = 1
  ): DatabaseErrorContext {
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, operation);
    
    return {
      operation,
      tableName,
      queryType,
      errorType,
      severity,
      recoverable: this.isRecoverable(errorType),
      canUseFallback: this.canUseFallback(errorType, operation),
      attemptCount,
      timestamp: new Date(),
      additionalData: {
        errorMessage: error instanceof Error ? error?.message : String(error),
        errorCode: error.parent?.code,
        errorName: error.name,
        constraint: error.parent?.constraint
      }
    };
  }

  /**
   * Classify database errors
   */
  private classifyError(error: any): DatabaseErrorType {
    if (!error) return DatabaseErrorType.DATABASE_UNAVAILABLE;

    // Connection errors
    if (error instanceof ConnectionError) {
      return DatabaseErrorType.CONNECTION_FAILED;
    }
    
    if (error instanceof SequelizeTimeoutError) {
      return DatabaseErrorType.QUERY_TIMEOUT;
    }

    // PostgreSQL error codes
    const errorCode = error.parent?.code || error.code;
    switch (errorCode) {
      case '08000':
      case '08003':
      case '08006':
        return DatabaseErrorType.CONNECTION_FAILED;
      case '08001':
        return DatabaseErrorType.CONNECTION_TIMEOUT;
      case '53300':
        return DatabaseErrorType.CONNECTION_POOL_EXHAUSTED;
      case '40001':
        return DatabaseErrorType.SERIALIZATION_FAILURE;
      case '40P01':
        return DatabaseErrorType.DEADLOCK_DETECTED;
      case '55P03':
        return DatabaseErrorType.LOCK_TIMEOUT;
      case '23505':
        return DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION;
      case '23503':
        return DatabaseErrorType.FOREIGN_KEY_VIOLATION;
      case '23514':
        return DatabaseErrorType.CHECK_CONSTRAINT_VIOLATION;
      case '23502':
        return DatabaseErrorType.NOT_NULL_VIOLATION;
      case '53100':
        return DatabaseErrorType.DISK_FULL;
      case '53200':
        return DatabaseErrorType.OUT_OF_MEMORY;
      case '42501':
        return DatabaseErrorType.INSUFFICIENT_PRIVILEGE;
      default:
        if (error instanceof Error ? error?.message : String(error)?.includes('timeout')) {
          return DatabaseErrorType.QUERY_TIMEOUT;
        }
        if (error instanceof Error ? error?.message : String(error)?.includes('deadlock')) {
          return DatabaseErrorType.DEADLOCK_DETECTED;
        }
        if (error instanceof Error ? error?.message : String(error)?.includes('connection')) {
          return DatabaseErrorType.CONNECTION_FAILED;
        }
        return DatabaseErrorType.DATABASE_UNAVAILABLE;
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    errorType: DatabaseErrorType,
    operation: DatabaseOperationType
  ): DatabaseErrorSeverity {
    // Critical errors that affect system stability
    const criticalErrors = [
      DatabaseErrorType.CONNECTION_POOL_EXHAUSTED,
      DatabaseErrorType.DATABASE_UNAVAILABLE,
      DatabaseErrorType.DISK_FULL,
      DatabaseErrorType.OUT_OF_MEMORY
    ];

    if (criticalErrors.includes(errorType)) {
      return DatabaseErrorSeverity.CRITICAL;
    }

    // High severity errors
    const highSeverityErrors = [
      DatabaseErrorType.CONNECTION_FAILED,
      DatabaseErrorType.TRANSACTION_ABORTED,
      DatabaseErrorType.DATA_CORRUPTION
    ];

    if (highSeverityErrors.includes(errorType)) {
      return DatabaseErrorSeverity.HIGH;
    }

    // Medium severity for constraints and locks
    const mediumSeverityErrors = [
      DatabaseErrorType.DEADLOCK_DETECTED,
      DatabaseErrorType.LOCK_TIMEOUT,
      DatabaseErrorType.CONSTRAINT_VIOLATION
    ];

    if (mediumSeverityErrors.includes(errorType)) {
      return DatabaseErrorSeverity.MEDIUM;
    }

    return DatabaseErrorSeverity.LOW;
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(errorType: DatabaseErrorType): boolean {
    const nonRecoverableErrors = [
      DatabaseErrorType.INSUFFICIENT_PRIVILEGE,
      DatabaseErrorType.DATA_CORRUPTION,
      DatabaseErrorType.QUERY_SYNTAX_ERROR,
      DatabaseErrorType.CHECK_CONSTRAINT_VIOLATION,
      DatabaseErrorType.NOT_NULL_VIOLATION
    ];

    return !nonRecoverableErrors.includes(errorType);
  }

  /**
   * Check if fallback can be used
   */
  private canUseFallback(
    errorType: DatabaseErrorType,
    operation: DatabaseOperationType
  ): boolean {
    // Read operations can often use cache fallback
    if (operation === DatabaseOperationType.READ) {
      const readFallbackErrors = [
        DatabaseErrorType.CONNECTION_FAILED,
        DatabaseErrorType.QUERY_TIMEOUT,
        DatabaseErrorType.DATABASE_UNAVAILABLE
      ];
      return readFallbackErrors.includes(errorType);
    }

    // Write operations have limited fallback options
    return false;
  }

  /**
   * =============================================================================
   * CIRCUIT BREAKER IMPLEMENTATION
   * =============================================================================
   */

  /**
   * Initialize circuit breakers
   */
  private initializeCircuitBreakers(): void {
    const operations = [
      'database_read',
      'database_write',
      'database_transaction',
      'cache_operation'
    ];

    operations.forEach(operation => {
      this.circuitBreakers.set(operation, {
        failures: 0,
        lastFailure: new Date(0),
        isOpen: false,
        threshold: this.CIRCUIT_BREAKER_THRESHOLD,
        timeout: this.CIRCUIT_BREAKER_TIMEOUT,
        halfOpenRequests: 0
      });
    });
  }

  /**
   * Get circuit breaker key
   */
  private getCircuitBreakerKey(
    operation: DatabaseOperationType,
    tableName?: string
  ): string {
    return tableName 
      ? `database_${operation}_${tableName}`
      : `database_${operation}`;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return false;

    if (breaker.isOpen) {
      // Check if timeout has elapsed
      if (Date.now() - breaker.lastFailure.getTime() > breaker.timeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        breaker.halfOpenRequests = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;

    breaker.failures += 1;
    breaker.lastFailure = new Date();

    if (breaker.failures >= breaker.threshold) {
      breaker.isOpen = true;
      logger.warn("Database circuit breaker opened", {
        key,
        failures: breaker.failures,
        threshold: breaker.threshold
      });
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;

    breaker.failures = 0;
    breaker.isOpen = false;
    breaker.halfOpenRequests = 0;
  }

  /**
   * =============================================================================
   * HELPER METHODS
   * =============================================================================
   */

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(operationName, timeout));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Wait with exponential backoff
   */
  private async waitWithBackoff(attempt: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return new Promise(resolve => setTimeout(resolve, delay + jitter));
  }

  /**
   * Check specific error types
   */
  private isDeadlockError(error: any): boolean {
    return error.parent?.code === '40P01' || 
           error instanceof Error ? error?.message : String(error)?.includes('deadlock');
  }

  private isConnectionError(error: any): boolean {
    const connectionCodes = ['08000', '08001', '08003', '08006', '53300'];
    return connectionCodes.includes(error.parent?.code) ||
           error instanceof ConnectionError ||
           error instanceof Error ? error?.message : String(error)?.includes('connection');
  }

  private isSerializationFailure(error: any): boolean {
    return error.parent?.code === '40001' ||
           error instanceof Error ? error?.message : String(error)?.includes('serialization failure');
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      DatabaseErrorType.DEADLOCK_DETECTED,
      DatabaseErrorType.SERIALIZATION_FAILURE,
      DatabaseErrorType.CONNECTION_TIMEOUT,
      DatabaseErrorType.QUERY_TIMEOUT,
      DatabaseErrorType.LOCK_TIMEOUT
    ];
    
    const errorType = this.classifyError(error);
    return retryableErrors.includes(errorType);
  }

  /**
   * Generate unique identifiers
   */
  private generateOperationId(queryType: string): string {
    return `${queryType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle specific error scenarios
   */
  private async handleDeadlock(operationId: string, attempt: number): Promise<void> {
    logger.info("Handling deadlock scenario", { operationId, attempt });
    // Implement deadlock-specific handling if needed
  }

  private async handleConnectionError(operationId: string, attempt: number): Promise<void> {
    logger.warn("Handling connection error", { operationId, attempt });
    // Implement connection-specific handling if needed
  }

  /**
   * Fallback handling methods
   */
  private async attemptFallback<T>(
    context: any,
    errorContext: DatabaseErrorContext
  ): Promise<ServiceResult<T>> {
    if (context.cacheKey && context.operation === DatabaseOperationType.READ) {
      // Try to get data from cache
      const cacheResult = await this.executeCacheOperationWithResilience(
        () => redisClient.get(context.cacheKey),
        {
          operation: 'get',
          key: context.cacheKey,
          timeout: 2000
        }
      );

      if (cacheResult.success && cacheResult.data) {
        try {
          const parsedData = JSON.parse(cacheResult.data as string);
          return {
            success: true,
            data: parsedData,
            message: "Using cached data as fallback",
            fallback: true
          };
        } catch (parseError) {
          logger.warn("Failed to parse cached fallback data", {
            cacheKey: context.cacheKey,
            error: parseError?.message
          });
        }
      }
    }

    return { success: false, message: "No fallback available" };
  }

  private async attemptFinalFallback<T>(context: any): Promise<ServiceResult<T>> {
    if (context.fallbackData !== undefined) {
      return {
        success: true,
        data: context.fallbackData,
        message: "Using provided fallback data",
        fallback: true
      };
    }

    return { success: false, message: "No final fallback available" };
  }

  private async handleUnhealthyDatabase<T>(context: any): Promise<ServiceResult<T>> {
    logger.warn("Database is unhealthy, attempting fallback", {
      operation: context.operation,
      tableName: context.tableName
    });

    return await this.attemptFallback(context, {
      operation: context.operation,
      errorType: DatabaseErrorType.DATABASE_UNAVAILABLE,
      severity: DatabaseErrorSeverity.HIGH,
      recoverable: false,
      canUseFallback: true,
      timestamp: new Date()
    });
  }

  private async handleCircuitBreakerOpen<T>(context: any): Promise<ServiceResult<T>> {
    logger.warn("Circuit breaker is open for database operation", {
      operation: context.operation,
      tableName: context.tableName
    });

    const fallbackResult = await this.attemptFallback(context, {
      operation: context.operation,
      errorType: DatabaseErrorType.DATABASE_UNAVAILABLE,
      severity: DatabaseErrorSeverity.HIGH,
      recoverable: false,
      canUseFallback: true,
      fallbackStrategy: DatabaseFallbackStrategy.CIRCUIT_BREAKER,
      timestamp: new Date()
    });

    if (fallbackResult.success) {
      return fallbackResult;
    }

    return {
      success: false,
      message: "Database service is temporarily unavailable",
      errors: [{
        code: DatabaseErrorType.DATABASE_UNAVAILABLE,
        message: "Circuit breaker is open"
      }]
    };
  }

  private handleCriticalError(error: any, context: any): ServiceResult<any> {
    logger.error("Critical database error", {
      operation: context.operation,
      tableName: context.tableName,
      error: error instanceof Error ? error?.message : String(error),
      stack: error instanceof Error ? error?.stack : undefined
    });

    return {
      success: false,
      message: "Critical database error occurred",
      errors: [{
        code: DatabaseErrorType.DATABASE_UNAVAILABLE,
        message: "Database service is temporarily unavailable"
      }]
    };
  }

  private canUseCircuitBreaker(operation: DatabaseOperationType): boolean {
    return operation === DatabaseOperationType.READ;
  }

  private shouldAttemptFallback(errorContext: DatabaseErrorContext, context: any): boolean {
    return errorContext.canUseFallback && 
           (context?.cacheKey || context.fallbackData !== undefined);
  }
}

export default DatabaseErrorResilienceService;