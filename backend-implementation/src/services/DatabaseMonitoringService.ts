/**
 * ============================================================================
 * DATABASE MONITORING SERVICE - CRITICAL PRODUCTION INFRASTRUCTURE
 * ============================================================================
 *
 * Comprehensive database performance monitoring and connection pool management
 * for production-scale waste management operations.
 *
 * Created by: Database Architect Agent
 * Date: 2025-08-12
 * Priority: TIER 1 CRITICAL (48-hour timeline)
 * Version: 1.0.0
 */

import { sequelize, getConnectionPoolStats } from "@/config/database";
import { logger } from "@/utils/logger";
import { EventEmitter } from "events";

/**
 * Database performance metrics interface
 */
interface DatabaseMetrics {
  timestamp: Date;
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    utilization: number;
    status: "healthy" | "warning" | "critical";
  };
  queryPerformance: {
    avgResponseTime: number;
    slowQueries: number;
    totalQueries: number;
    errorsPerMinute: number;
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkLatency: number;
  };
}

/**
 * Connection pool alert levels
 */
enum AlertLevel {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

/**
 * Database monitoring service for production operations
 */
export class DatabaseMonitoringService extends EventEmitter {
  private monitoringInterval?: NodeJS.Timeout;
  private metrics: DatabaseMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private alertThresholds = {
    connectionUtilization: {
      warning: 75,
      critical: 90,
      emergency: 95,
    },
    responseTime: {
      warning: 100, // ms
      critical: 500, // ms
      emergency: 1000, // ms
    },
    errorRate: {
      warning: 5, // errors per minute
      critical: 20,
      emergency: 50,
    },
  };

  private queryCount = 0;
  private totalResponseTime = 0;
  private errorCount = 0;
  private slowQueryCount = 0;

  constructor() {
    super();
    this.setupDatabaseHooks();
  }

  /**
   * Setup database query hooks for performance monitoring
   */
  private setupDatabaseHooks(): void {
    // Monitor query performance
    sequelize.addHook("beforeQuery", (options) => {
      options.startTime = Date.now();
    });

    sequelize.addHook("afterQuery", (options, query) => {
      const endTime = Date.now();
      const startTime = (options as any)?.startTime || endTime;
      const duration = endTime - startTime;

      this.queryCount++;
      this.totalResponseTime += duration;

      // Track slow queries (>100ms)
      if (duration > 100) {
        this.slowQueryCount++;
        logger.warn("Slow query detected", {
          duration: `${duration}ms`,
          sql: options.logging ? query?.sql : "[SQL logging disabled]",
        });
      }

      // Emit query performance event
      this.emit("queryPerformance", {
        duration,
        sql: options.logging ? query?.sql : "[SQL logging disabled]",
        type: query?.type || "unknown",
      });
    });

    sequelize.addHook("afterQueryError", (error, options) => {
      this.errorCount++;
      logger.error("Database query error", {
        error: error instanceof Error ? error?.message : String(error),
        sql: options.logging ? error.sql : "[SQL logging disabled]",
      });

      this.emit("queryError", {
        error: error instanceof Error ? error?.message : String(error),
        sql: options.logging ? error.sql : "[SQL logging disabled]",
      });
    });
  }

  /**
   * Start database monitoring with specified interval
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    logger.info("Starting database monitoring", {
      interval: `${intervalMs}ms`,
      alertThresholds: this.alertThresholds,
    });

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error: unknown) {
        logger.error("Database monitoring collection failed:", error);
      }
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop database monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info("Database monitoring stopped");
    }
  }

  /**
   * Collect comprehensive database metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Get connection pool statistics
      const poolStats = await getConnectionPoolStats();

      // Calculate query performance metrics
      const avgResponseTime = this.queryCount > 0 
        ? Math.round(this.totalResponseTime / this.queryCount)
        : 0;

      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        connectionPool: {
          total: poolStats.pool.total,
          active: poolStats.pool.active,
          idle: poolStats.pool.idle,
          waiting: poolStats.pool.waiting,
          utilization: poolStats.pool.utilization,
          status: poolStats.status,
        },
        queryPerformance: {
          avgResponseTime,
          slowQueries: this.slowQueryCount,
          totalQueries: this.queryCount,
          errorsPerMinute: this.errorCount,
        },
        systemHealth: {
          cpuUsage: 0, // Would integrate with system monitoring
          memoryUsage: 0,
          diskIO: 0,
          networkLatency: 0,
        },
      };

      // Store metrics
      this.addMetrics(metrics);

      // Check alert conditions
      this.checkAlerts(metrics);

      // Emit metrics event
      this.emit("metrics", metrics);

      // Log metrics periodically
      if (this.metrics.length % 10 === 0) {
        logger.info("Database metrics collected", {
          connectionPool: metrics.connectionPool,
          queryPerformance: metrics.queryPerformance,
        });
      }

    } catch (error: unknown) {
      logger.error("Failed to collect database metrics:", error);
    }
  }

  /**
   * Add metrics to history with rotation
   */
  private addMetrics(metrics: DatabaseMetrics): void {
    this.metrics.push(metrics);
    
    // Rotate metrics history
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Check alert conditions and emit alerts
   */
  private checkAlerts(metrics: DatabaseMetrics): void {
    const { connectionPool, queryPerformance } = metrics;

    // Connection pool utilization alerts
    if (connectionPool.utilization >= this.alertThresholds.connectionUtilization.emergency) {
      this.emitAlert(AlertLevel.EMERGENCY, "Connection pool at emergency capacity", {
        utilization: connectionPool.utilization,
        active: connectionPool.active,
        total: connectionPool.total,
      });
    } else if (connectionPool.utilization >= this.alertThresholds.connectionUtilization.critical) {
      this.emitAlert(AlertLevel.CRITICAL, "Connection pool critically high", {
        utilization: connectionPool.utilization,
        active: connectionPool.active,
        total: connectionPool.total,
      });
    } else if (connectionPool.utilization >= this.alertThresholds.connectionUtilization.warning) {
      this.emitAlert(AlertLevel.WARNING, "Connection pool utilization high", {
        utilization: connectionPool.utilization,
        active: connectionPool.active,
        total: connectionPool.total,
      });
    }

    // Query performance alerts
    if (queryPerformance.avgResponseTime >= this.alertThresholds.responseTime.critical) {
      this.emitAlert(AlertLevel.CRITICAL, "Database response time critical", {
        avgResponseTime: queryPerformance.avgResponseTime,
        slowQueries: queryPerformance.slowQueries,
      });
    } else if (queryPerformance.avgResponseTime >= this.alertThresholds.responseTime.warning) {
      this.emitAlert(AlertLevel.WARNING, "Database response time elevated", {
        avgResponseTime: queryPerformance.avgResponseTime,
        slowQueries: queryPerformance.slowQueries,
      });
    }

    // Error rate alerts
    if (queryPerformance.errorsPerMinute >= this.alertThresholds.errorRate.critical) {
      this.emitAlert(AlertLevel.CRITICAL, "Database error rate critical", {
        errorsPerMinute: queryPerformance.errorsPerMinute,
        totalQueries: queryPerformance.totalQueries,
      });
    }
  }

  /**
   * Emit alert with context
   */
  private emitAlert(level: AlertLevel, message: string, context: any): void {
    const alert = {
      level,
      message,
      context,
      timestamp: new Date(),
    };

    logger.warn(`Database Alert [${level.toUpperCase()}]: ${message}`, context);
    this.emit("alert", alert);
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): DatabaseMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Get connection pool health summary
   */
  public async getConnectionPoolHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    summary: string;
    recommendations: string[];
    stats: any;
  }> {
    const poolStats = await getConnectionPoolStats();
    const recommendations: string[] = [];

    if (poolStats.status === "critical") {
      recommendations.push("Immediately scale connection pool size");
      recommendations.push("Investigate slow queries and connection leaks");
      recommendations.push("Consider implementing connection pooling optimizations");
    } else if (poolStats.status === "warning") {
      recommendations.push("Monitor connection usage closely");
      recommendations.push("Consider scaling pool size proactively");
      recommendations.push("Review query performance optimization");
    }

    return {
      status: poolStats.status,
      summary: `Connection pool at ${poolStats.pool.utilization}% utilization (${poolStats.pool.active}/${poolStats.pool.total} connections)`,
      recommendations,
      stats: poolStats,
    };
  }

  /**
   * Reset performance counters
   */
  public resetCounters(): void {
    this.queryCount = 0;
    this.totalResponseTime = 0;
    this.errorCount = 0;
    this.slowQueryCount = 0;
    logger.info("Database performance counters reset");
  }

  /**
   * Update alert thresholds
   */
  public updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info("Database alert thresholds updated", this.alertThresholds);
  }
}

// Export singleton instance
export const databaseMonitoring = new DatabaseMonitoringService();
export default databaseMonitoring;