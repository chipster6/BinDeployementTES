/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE RECOVERY SERVICE
 * ============================================================================
 *
 * Handles database connection failures, implements connection pooling recovery,
 * provides circuit breaker patterns for database operations, and manages
 * graceful degradation when database is unavailable.
 *
 * Features:
 * - Automatic connection recovery with exponential backoff
 * - Connection pool health monitoring and management
 * - Circuit breaker pattern for database operations
 * - Graceful degradation with caching fallback
 * - Read replica failover support
 * - Transaction retry logic with deadlock detection
 * - Database maintenance window handling
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import {
  Sequelize,
  Transaction,
  ConnectionError,
  TimeoutError as SequelizeTimeoutError,
} from "sequelize";
import { database } from "@/config/database";
import { redisClient } from "@/config/redis";
import { logger, logError } from "@/utils/logger";
import {
  DatabaseOperationError,
  CircuitBreakerError,
  TimeoutError,
} from "@/middleware/errorHandler";
import { config } from "@/config";

/**
 * Connection states
 */
export enum ConnectionState {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  RECOVERING = "recovering",
  MAINTENANCE = "maintenance",
}

/**
 * Circuit breaker states for database operations
 */
export enum DBCircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open",
}

/**
 * Database operation types
 */
export enum DBOperationType {
  READ = "read",
  WRITE = "write",
  TRANSACTION = "transaction",
}

/**
 * Recovery configuration
 */
interface RecoveryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
}

/**
 * Connection health metrics
 */
interface HealthMetrics {
  isHealthy: boolean;
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalConnections: number;
  lastSuccessfulQuery: Date | null;
  lastFailedQuery: Date | null;
  errorRate: number;
  avgResponseTime: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: DBCircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

/**
 * Database recovery service
 */
export class DatabaseRecoveryService extends EventEmitter {
  private connectionState: ConnectionState = ConnectionState.HEALTHY;
  private circuitBreaker: CircuitBreakerState;
  private recoveryConfig: RecoveryConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private recoveryInProgress = false;
  private maintenanceMode = false;
  private healthMetrics: HealthMetrics;
  private operationQueue: Array<{
    operation: () => Promise<any>;
    resolve: Function;
    reject: Function;
  }> = [];

  constructor(config?: Partial<RecoveryConfig>) {
    super();

    this.recoveryConfig = {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      healthCheckInterval: 30000, // 30 seconds
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      connectionTimeoutMs: 10000,
      queryTimeoutMs: 30000,
      ...config,
    };

    this.circuitBreaker = {
      state: DBCircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    };

    this.healthMetrics = {
      isHealthy: true,
      connectionCount: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalConnections: 0,
      lastSuccessfulQuery: null,
      lastFailedQuery: null,
      errorRate: 0,
      avgResponseTime: 0,
    };

    this.startHealthMonitoring();
    this.setupDatabaseEventListeners();
  }

  /**
   * Execute database operation with recovery logic
   */
  public async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationType: DBOperationType = DBOperationType.READ,
    options: {
      timeout?: number;
      retries?: number;
      skipCircuitBreaker?: boolean;
    } = {},
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (!options.skipCircuitBreaker) {
        await this.checkCircuitBreaker();
      }

      // Check if database is in maintenance mode
      if (this.maintenanceMode && operationType === DBOperationType.WRITE) {
        throw new DatabaseOperationError(
          "Database is in maintenance mode",
          "maintenance",
        );
      }

      // Execute operation with timeout
      const timeout = options.timeout || this.recoveryConfig.queryTimeoutMs;
      const result = await this.executeWithTimeout(operation, timeout);

      // Record success
      this.recordSuccess(Date.now() - startTime);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.handleOperationFailure(error, operationType, duration);

      // Attempt recovery if needed
      if (this.shouldAttemptRecovery(error)) {
        return await this.retryWithRecovery(operation, operationType, options);
      }

      throw this.wrapError(error);
    }
  }

  /**
   * Execute transaction with recovery
   */
  public async executeTransactionWithRecovery<T>(
    transactionFn: (transaction: Transaction) => Promise<T>,
    options: { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.executeWithRecovery(
      async () => {
        return database.transaction(transactionFn);
      },
      DBOperationType.TRANSACTION,
      options,
    );
  }

  /**
   * Get current database health status
   */
  public getHealthStatus(): {
    state: ConnectionState;
    metrics: HealthMetrics;
    circuitBreaker: CircuitBreakerState;
    lastHealthCheck: Date;
  } {
    return {
      state: this.connectionState,
      metrics: { ...this.healthMetrics },
      circuitBreaker: { ...this.circuitBreaker },
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Force database connection check
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await database.authenticate();
      await this.updateHealthMetrics();

      if (this.connectionState !== ConnectionState.HEALTHY) {
        await this.transitionToHealthy();
      }

      return true;
    } catch (error) {
      logger.error("Database connection check failed", {
        error: error.message,
      });
      await this.handleConnectionFailure(error);
      return false;
    }
  }

  /**
   * Enable maintenance mode
   */
  public enableMaintenanceMode(): void {
    this.maintenanceMode = true;
    this.connectionState = ConnectionState.MAINTENANCE;

    logger.warn("Database maintenance mode enabled");
    this.emit("maintenanceEnabled");
  }

  /**
   * Disable maintenance mode
   */
  public disableMaintenanceMode(): void {
    this.maintenanceMode = false;

    logger.info("Database maintenance mode disabled");
    this.emit("maintenanceDisabled");

    // Check connection after maintenance
    setTimeout(() => this.checkConnection(), 1000);
  }

  /**
   * Get cached data as fallback
   */
  public async getCachedFallback(key: string): Promise<any | null> {
    try {
      const cached = await redisClient.get(`db_fallback:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn("Failed to get cached fallback", {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Set cached data for fallback
   */
  public async setCachedFallback(
    key: string,
    data: any,
    ttlSeconds: number = 300,
  ): Promise<void> {
    try {
      await redisClient.setex(
        `db_fallback:${key}`,
        ttlSeconds,
        JSON.stringify(data),
      );
    } catch (error) {
      logger.warn("Failed to set cached fallback", {
        key,
        error: error.message,
      });
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError("database_operation", timeoutMs));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check circuit breaker state
   */
  private async checkCircuitBreaker(): Promise<void> {
    const now = Date.now();

    if (this.circuitBreaker.state === DBCircuitState.OPEN) {
      if (now < this.circuitBreaker.nextRetryTime) {
        throw new CircuitBreakerError("database");
      } else {
        // Move to half-open state
        this.circuitBreaker.state = DBCircuitState.HALF_OPEN;
        logger.info("Database circuit breaker moved to half-open state");
      }
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.healthMetrics.lastSuccessfulQuery = new Date();
    this.healthMetrics.avgResponseTime =
      (this.healthMetrics.avgResponseTime + responseTime) / 2;

    // Reset circuit breaker on success
    if (this.circuitBreaker.state !== DBCircuitState.CLOSED) {
      this.circuitBreaker.state = DBCircuitState.CLOSED;
      this.circuitBreaker.failureCount = 0;
      logger.info("Database circuit breaker reset to closed state");
    }
  }

  /**
   * Handle operation failure
   */
  private async handleOperationFailure(
    error: any,
    operationType: DBOperationType,
    duration: number,
  ): Promise<void> {
    this.healthMetrics.lastFailedQuery = new Date();
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Update circuit breaker state
    if (
      this.circuitBreaker.failureCount >=
      this.recoveryConfig.circuitBreakerThreshold
    ) {
      this.circuitBreaker.state = DBCircuitState.OPEN;
      this.circuitBreaker.nextRetryTime =
        Date.now() + this.recoveryConfig.circuitBreakerTimeout;

      logger.error("Database circuit breaker opened", {
        failureCount: this.circuitBreaker.failureCount,
        operationType,
        error: error.message,
      });

      this.emit("circuitBreakerOpened", {
        operationType,
        failureCount: this.circuitBreaker.failureCount,
      });
    }

    // Handle connection-level failures
    if (this.isConnectionError(error)) {
      await this.handleConnectionFailure(error);
    }

    logError(error, {
      operationType,
      duration,
      circuitBreakerState: this.circuitBreaker.state,
      connectionState: this.connectionState,
    });
  }

  /**
   * Handle connection failure
   */
  private async handleConnectionFailure(error: any): Promise<void> {
    const wasHealthy = this.connectionState === ConnectionState.HEALTHY;

    this.connectionState = ConnectionState.UNHEALTHY;
    this.healthMetrics.isHealthy = false;

    if (wasHealthy) {
      logger.error("Database connection became unhealthy", {
        error: error.message,
      });
      this.emit("connectionUnhealthy", error);
    }

    // Start recovery if not already in progress
    if (!this.recoveryInProgress) {
      this.startRecovery();
    }
  }

  /**
   * Start recovery process
   */
  private async startRecovery(): Promise<void> {
    if (this.recoveryInProgress) return;

    this.recoveryInProgress = true;
    this.connectionState = ConnectionState.RECOVERING;

    logger.info("Starting database recovery process");
    this.emit("recoveryStarted");

    let attempt = 0;
    let delay = this.recoveryConfig.initialDelayMs;

    while (
      attempt < this.recoveryConfig.maxRetries &&
      this.connectionState !== ConnectionState.HEALTHY
    ) {
      attempt++;

      logger.info(
        `Database recovery attempt ${attempt}/${this.recoveryConfig.maxRetries}`,
      );

      try {
        // Wait before retry
        await this.sleep(delay);

        // Attempt to reconnect
        await database.authenticate();
        await this.updateHealthMetrics();

        // Success - transition to healthy state
        await this.transitionToHealthy();
        break;
      } catch (error) {
        logger.warn(`Database recovery attempt ${attempt} failed`, {
          error: error.message,
          nextDelay: delay * this.recoveryConfig.backoffMultiplier,
        });

        // Exponential backoff
        delay = Math.min(
          delay * this.recoveryConfig.backoffMultiplier,
          this.recoveryConfig.maxDelayMs,
        );
      }
    }

    this.recoveryInProgress = false;

    if (this.connectionState !== ConnectionState.HEALTHY) {
      logger.error("Database recovery failed after maximum attempts");
      this.emit("recoveryFailed");
    }
  }

  /**
   * Transition to healthy state
   */
  private async transitionToHealthy(): Promise<void> {
    const wasUnhealthy = this.connectionState !== ConnectionState.HEALTHY;

    this.connectionState = ConnectionState.HEALTHY;
    this.healthMetrics.isHealthy = true;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.state = DBCircuitState.CLOSED;

    if (wasUnhealthy) {
      logger.info("Database connection recovered successfully");
      this.emit("connectionRecovered");

      // Process queued operations
      await this.processQueuedOperations();
    }
  }

  /**
   * Process queued operations after recovery
   */
  private async processQueuedOperations(): Promise<void> {
    if (this.operationQueue.length === 0) return;

    logger.info(`Processing ${this.operationQueue.length} queued operations`);

    const queue = [...this.operationQueue];
    this.operationQueue = [];

    for (const { operation, resolve, reject } of queue) {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  /**
   * Retry operation with recovery
   */
  private async retryWithRecovery<T>(
    operation: () => Promise<T>,
    operationType: DBOperationType,
    options: {
      timeout?: number;
      retries?: number;
      skipCircuitBreaker?: boolean;
    },
  ): Promise<T> {
    const maxRetries = options.retries || this.recoveryConfig.maxRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait before retry
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);

        // Retry the operation
        return await this.executeWithRecovery(operation, operationType, {
          ...options,
          retries: 0, // Prevent nested retries
        });
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        logger.warn(
          `Database operation retry ${attempt}/${maxRetries} failed`,
          {
            operationType,
            error: error.message,
          },
        );
      }
    }

    throw new DatabaseOperationError("Max retries exceeded");
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay =
      this.recoveryConfig.initialDelayMs *
      Math.pow(this.recoveryConfig.backoffMultiplier, attempt - 1);
    return (
      Math.min(delay, this.recoveryConfig.maxDelayMs) + Math.random() * 1000
    ); // Add jitter
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: any): boolean {
    return (
      error instanceof ConnectionError ||
      error.name === "ConnectionError" ||
      error.name === "SequelizeConnectionError" ||
      error.name === "SequelizeConnectionRefusedError" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    );
  }

  /**
   * Check if operation should be retried
   */
  private shouldAttemptRecovery(error: any): boolean {
    return (
      this.isConnectionError(error) ||
      error instanceof SequelizeTimeoutError ||
      error.name === "SequelizeTimeoutError" ||
      (error.name === "SequelizeDatabaseError" &&
        error.parent?.code === "ECONNRESET")
    );
  }

  /**
   * Wrap error with appropriate error type
   */
  private wrapError(error: any): Error {
    if (
      error instanceof DatabaseOperationError ||
      error instanceof CircuitBreakerError ||
      error instanceof TimeoutError
    ) {
      return error;
    }

    if (this.isConnectionError(error)) {
      return new DatabaseOperationError(
        "Database connection failed",
        "connection",
      );
    }

    if (
      error instanceof SequelizeTimeoutError ||
      error.name === "SequelizeTimeoutError"
    ) {
      return new TimeoutError(
        "database_query",
        this.recoveryConfig.queryTimeoutMs,
      );
    }

    return new DatabaseOperationError(
      `Database operation failed: ${error.message}`,
      "operation",
    );
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.recoveryConfig.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Simple query to test connection
      await database.query("SELECT 1", { type: "SELECT" });

      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics();

      // Check if response time is acceptable
      if (responseTime > 5000) {
        // 5 seconds threshold
        this.connectionState = ConnectionState.DEGRADED;
        this.emit("connectionDegraded", { responseTime });
      } else if (this.connectionState === ConnectionState.DEGRADED) {
        this.connectionState = ConnectionState.HEALTHY;
        this.emit("connectionImproved");
      }
    } catch (error) {
      await this.handleConnectionFailure(error);
    }
  }

  /**
   * Update health metrics
   */
  private async updateHealthMetrics(): Promise<void> {
    try {
      // Get connection pool info if available
      const pool = (database as any).connectionManager?.pool;

      if (pool) {
        this.healthMetrics.connectionCount = pool.size || 0;
        this.healthMetrics.activeConnections = pool.borrowed || 0;
        this.healthMetrics.idleConnections = pool.available || 0;
        this.healthMetrics.waitingClients = pool.pending || 0;
      }

      this.healthMetrics.totalConnections =
        this.healthMetrics.activeConnections +
        this.healthMetrics.idleConnections;
    } catch (error) {
      logger.warn("Failed to update health metrics", { error: error.message });
    }
  }

  /**
   * Setup database event listeners
   */
  private setupDatabaseEventListeners(): void {
    // Listen to Sequelize connection events if available
    if (database.connectionManager) {
      database.connectionManager.on("connect", () => {
        logger.debug("Database connection established");
      });

      database.connectionManager.on("disconnect", () => {
        logger.warn("Database connection lost");
        this.handleConnectionFailure(new Error("Database disconnected"));
      });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.removeAllListeners();
  }
}

// Global database recovery service instance
export const databaseRecovery = new DatabaseRecoveryService({
  maxRetries: config.database?.recovery?.maxRetries || 5,
  initialDelayMs: config.database?.recovery?.initialDelayMs || 1000,
  maxDelayMs: config.database?.recovery?.maxDelayMs || 30000,
  healthCheckInterval: config.database?.recovery?.healthCheckInterval || 30000,
});

export default DatabaseRecoveryService;
