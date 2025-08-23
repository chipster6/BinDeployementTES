/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE PERFORMANCE MONITOR
 * ============================================================================
 *
 * Critical infrastructure service for real-time database performance monitoring.
 * Supports production-scale connection pool management and query optimization.
 * 
 * TIER 1 CRITICAL INFRASTRUCTURE - 72-HOUR EMERGENCY DEPLOYMENT
 *
 * Created by: Database Architect
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { sequelize, getConnectionPoolStats } from "@/config/database";
import { redisClient, CacheService } from "@/config/redis";
import { EventEmitter } from "events";

/**
 * Database Performance Metrics Interface
 */
export interface DatabaseMetrics {
  connectionPool: {
    status: "healthy" | "warning" | "critical";
    total: number;
    active: number;
    idle: number;
    waiting: number;
    utilization: number;
    errors: number;
  };
  queryPerformance: {
    avgResponseTime: number;
    slowQueries: number;
    queriesPerSecond: number;
    activeQueries: number;
  };
  resources: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    connections: number;
  };
  health: {
    database: "healthy" | "unhealthy";
    redis: "healthy" | "unhealthy";
    overall: "healthy" | "degraded" | "critical";
  };
  timestamp: Date;
}

/**
 * Query Performance Tracking
 */
export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any;
  stackTrace?: string;
}

/**
 * Performance Alert Types
 */
export interface PerformanceAlert {
  type: "connection_pool" | "slow_query" | "resource_limit" | "health_check";
  severity: "warning" | "critical";
  message: string;
  metrics: Partial<DatabaseMetrics>;
  timestamp: Date;
}

/**
 * Database Performance Monitor Class
 */
class DatabasePerformanceMonitor extends EventEmitter {
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private queryInterceptor?: any;
  private slowQueries: SlowQuery[] = [];
  private metrics: DatabaseMetrics[] = [];
  
  // Performance thresholds
  private readonly thresholds = {
    connectionPoolWarning: 75, // % utilization
    connectionPoolCritical: 90,
    slowQueryThreshold: 1000, // ms
    maxSlowQueries: 100,
    maxMetricsHistory: 1000,
    responseTimeWarning: 500, // ms
    responseTimeCritical: 2000,
  };

  constructor() {
    super();
    this.setupQueryInterceptor();
  }

  /**
   * START PRODUCTION MONITORING
   * Critical for 72-hour emergency deployment
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoring) {
      logger.warn("Database performance monitoring already running");
      return;
    }

    logger.info("🚀 Starting database performance monitoring", {
      interval: `${intervalMs}ms`,
      thresholds: this.thresholds,
    });

    this.monitoring = true;
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      intervalMs
    );

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * STOP MONITORING
   */
  public stopMonitoring(): void {
    if (!this.monitoring) return;

    logger.info("⏹️ Stopping database performance monitoring");
    
    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * COLLECT REAL-TIME METRICS
   * Critical for production load monitoring
   */
  private async collectMetrics(): Promise<void> {
    try {
      const startTime = Date.now();

      // Collect connection pool stats
      const poolStats = await getConnectionPoolStats();
      
      // Collect query performance stats
      const queryStats = this.getQueryPerformanceStats();
      
      // Test database connectivity and response time
      const dbHealthStartTime = Date.now();
      await sequelize.authenticate();
      const dbResponseTime = Date.now() - dbHealthStartTime;
      
      // Test Redis connectivity
      const redisHealthStartTime = Date.now();
      await redisClient.ping();
      const redisResponseTime = Date.now() - redisHealthStartTime;

      // Get database resource usage (PostgreSQL specific)
      const resourceStats = await this.getDatabaseResourceStats();

      // Build comprehensive metrics
      const metrics: DatabaseMetrics = {
        connectionPool: {
          status: poolStats.status,
          total: poolStats.pool.total,
          active: poolStats.pool.active,
          idle: poolStats.pool.idle,
          waiting: poolStats.pool.waiting,
          utilization: poolStats.pool.utilization,
          errors: 0, // Would track connection errors in production
        },
        queryPerformance: {
          avgResponseTime: queryStats.avgResponseTime,
          slowQueries: this.slowQueries.length,
          queriesPerSecond: queryStats.queriesPerSecond,
          activeQueries: queryStats.activeQueries,
        },
        resources: {
          connections: poolStats.pool.total,
          ...resourceStats,
        },
        health: {
          database: dbResponseTime < 1000 ? "healthy" : "unhealthy",
          redis: redisResponseTime < 1000 ? "healthy" : "unhealthy",
          overall: this.calculateOverallHealth(poolStats, dbResponseTime, redisResponseTime),
        },
        timestamp: new Date(),
      };

      // Store metrics
      this.addMetrics(metrics);

      // Check for alerts
      this.checkAlerts(metrics);

      // Cache metrics for external access
      await this.cacheMetrics(metrics);

      const collectionTime = Date.now() - startTime;
      logger.debug("📊 Metrics collected", {
        collectionTime: `${collectionTime}ms`,
        poolUtilization: `${metrics.connectionPool.utilization}%`,
        dbResponseTime: `${dbResponseTime}ms`,
        redisResponseTime: `${redisResponseTime}ms`,
      });

    } catch (error: unknown) {
      logger.error("❌ Failed to collect database metrics:", error);
      
      // Emit critical error alert
      this.emit("alert", {
        type: "health_check",
        severity: "critical",
        message: "Database metrics collection failed",
        metrics: {},
        timestamp: new Date(),
      } as PerformanceAlert);
    }
  }

  /**
   * SETUP QUERY INTERCEPTOR FOR PERFORMANCE TRACKING
   * Critical for identifying slow queries in production
   */
  private setupQueryInterceptor(): void {
    // Hook into Sequelize's query execution
    sequelize.addHook("beforeQuery", (options: any) => {
      options._queryStartTime = Date.now();
    });

    sequelize.addHook("afterQuery", (options: any, query: any) => {
      const duration = Date.now() - options._queryStartTime;
      
      // Track slow queries
      if (duration > this.thresholds.slowQueryThreshold) {
        this.addSlowQuery({
          query: options?.sql || "Unknown query",
          duration,
          timestamp: new Date(),
          parameters: options.bind,
        });

        logger.warn("🐌 Slow query detected", {
          duration: `${duration}ms`,
          query: options.sql?.substring(0, 200) + "...",
        });
      }

      // Emit slow query alert
      if (duration > this.thresholds.responseTimeCritical) {
        this.emit("alert", {
          type: "slow_query",
          severity: "critical",
          message: `Critical slow query: ${duration}ms`,
          metrics: { queryPerformance: { avgResponseTime: duration } },
          timestamp: new Date(),
        } as PerformanceAlert);
      }
    });
  }

  /**
   * GET DATABASE RESOURCE STATISTICS
   * PostgreSQL-specific resource monitoring
   */
  private async getDatabaseResourceStats(): Promise<Partial<DatabaseMetrics['resources']>> {
    try {
      // Get PostgreSQL connection count
      const [connectionResults] = await sequelize.query(`
        SELECT count(*) as total_connections,
               count(*) FILTER (WHERE state = 'active') as active_connections,
               count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `);

      // Get database size and performance stats
      const [performanceResults] = await sequelize.query(`
        SELECT 
          pg_database_size(current_database()) as db_size_bytes,
          (SELECT sum(numbackends) FROM pg_stat_database WHERE datname = current_database()) as backends
      `);

      const connectionData = connectionResults[0] as any;
      const performanceData = performanceResults[0] as any;

      return {
        connections: parseInt(connectionData.total_connections) || 0,
        diskUsage: parseInt(performanceData.db_size_bytes) || 0,
      };

    } catch (error: unknown) {
      logger.error("Failed to get database resource stats:", error);
      return {};
    }
  }

  /**
   * GET QUERY PERFORMANCE STATISTICS
   */
  private getQueryPerformanceStats(): DatabaseMetrics['queryPerformance'] {
    const recentSlowQueries = this.slowQueries.filter(
      query => Date.now() - query.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const avgResponseTime = recentSlowQueries.length > 0
      ? recentSlowQueries.reduce((sum, query) => sum + query.duration, 0) / recentSlowQueries.length
      : 0;

    return {
      avgResponseTime,
      slowQueries: recentSlowQueries.length,
      queriesPerSecond: 0, // Would implement query counter in production
      activeQueries: 0, // Would track active queries in production
    };
  }

  /**
   * CALCULATE OVERALL SYSTEM HEALTH
   */
  private calculateOverallHealth(
    poolStats: any,
    dbResponseTime: number,
    redisResponseTime: number
  ): "healthy" | "degraded" | "critical" {
    
    // Critical conditions
    if (
      poolStats.status === "critical" ||
      dbResponseTime > 5000 ||
      redisResponseTime > 5000
    ) {
      return "critical";
    }

    // Warning conditions
    if (
      poolStats.status === "warning" ||
      dbResponseTime > 1000 ||
      redisResponseTime > 1000
    ) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * CHECK FOR PERFORMANCE ALERTS
   */
  private checkAlerts(metrics: DatabaseMetrics): void {
    // Connection pool alerts
    if (metrics.connectionPool.utilization >= this.thresholds.connectionPoolCritical) {
      this.emit("alert", {
        type: "connection_pool",
        severity: "critical",
        message: `Critical connection pool utilization: ${metrics.connectionPool.utilization}%`,
        metrics,
        timestamp: new Date(),
      } as PerformanceAlert);
    } else if (metrics.connectionPool.utilization >= this.thresholds.connectionPoolWarning) {
      this.emit("alert", {
        type: "connection_pool",
        severity: "warning",
        message: `High connection pool utilization: ${metrics.connectionPool.utilization}%`,
        metrics,
        timestamp: new Date(),
      } as PerformanceAlert);
    }

    // Response time alerts
    if (metrics.queryPerformance.avgResponseTime >= this.thresholds.responseTimeCritical) {
      this.emit("alert", {
        type: "slow_query",
        severity: "critical",
        message: `Critical average response time: ${metrics.queryPerformance.avgResponseTime}ms`,
        metrics,
        timestamp: new Date(),
      } as PerformanceAlert);
    }

    // Health alerts
    if (metrics.health.overall === "critical") {
      this.emit("alert", {
        type: "health_check",
        severity: "critical",
        message: "Database system health is critical",
        metrics,
        timestamp: new Date(),
      } as PerformanceAlert);
    }
  }

  /**
   * ADD SLOW QUERY TO TRACKING
   */
  private addSlowQuery(slowQuery: SlowQuery): void {
    this.slowQueries.push(slowQuery);
    
    // Limit slow query history
    if (this.slowQueries.length > this.thresholds.maxSlowQueries) {
      this.slowQueries = this.slowQueries.slice(-this.thresholds.maxSlowQueries);
    }
  }

  /**
   * ADD METRICS TO HISTORY
   */
  private addMetrics(metrics: DatabaseMetrics): void {
    this.metrics.push(metrics);
    
    // Limit metrics history
    if (this.metrics.length > this.thresholds.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.thresholds.maxMetricsHistory);
    }
  }

  /**
   * CACHE METRICS FOR EXTERNAL ACCESS
   */
  private async cacheMetrics(metrics: DatabaseMetrics): Promise<void> {
    try {
      await CacheService.set("database:performance:current", metrics, 300); // 5 minutes
      await CacheService.set("database:performance:history", this.metrics.slice(-100), 3600); // 1 hour
      await CacheService.set("database:slow_queries", this.slowQueries.slice(-50), 3600);
    } catch (error: unknown) {
      logger.error("Failed to cache performance metrics:", error);
    }
  }

  /**
   * PUBLIC API - GET CURRENT METRICS
   */
  public getCurrentMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * PUBLIC API - GET METRICS HISTORY
   */
  public getMetricsHistory(limit: number = 100): DatabaseMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * PUBLIC API - GET SLOW QUERIES
   */
  public getSlowQueries(limit: number = 50): SlowQuery[] {
    return this.slowQueries.slice(-limit);
  }

  /**
   * PUBLIC API - GET PERFORMANCE SUMMARY
   */
  public getPerformanceSummary(): {
    status: string;
    connectionPool: string;
    avgResponseTime: string;
    slowQueries: number;
    uptime: string;
  } {
    const current = this.getCurrentMetrics();
    if (!current) {
      return {
        status: "No data",
        connectionPool: "N/A",
        avgResponseTime: "N/A",
        slowQueries: 0,
        uptime: "N/A",
      };
    }

    return {
      status: current.health.overall,
      connectionPool: `${current.connectionPool.utilization}% (${current.connectionPool.active}/${current.connectionPool.total})`,
      avgResponseTime: `${current.queryPerformance.avgResponseTime}ms`,
      slowQueries: current.queryPerformance.slowQueries,
      uptime: this.monitoring ? "Active" : "Stopped",
    };
  }

  /**
   * PUBLIC API - FORCE METRICS COLLECTION
   */
  public async forceMetricsCollection(): Promise<DatabaseMetrics | null> {
    await this.collectMetrics();
    return this.getCurrentMetrics();
  }

  /**
   * PUBLIC API - CLEAR HISTORY
   */
  public clearHistory(): void {
    this.metrics = [];
    this.slowQueries = [];
    logger.info("📊 Performance monitoring history cleared");
  }
}

// Singleton instance for global use
export const databasePerformanceMonitor = new DatabasePerformanceMonitor();

// Event listeners for logging alerts
databasePerformanceMonitor.on("alert", (alert: PerformanceAlert) => {
  const logLevel = alert.severity === "critical" ? "error" : "warn";
  logger[logLevel]("🚨 Database performance alert", {
    type: alert.type,
    severity: alert.severity,
    message: alert?.message,
    timestamp: alert.timestamp,
  });
});

export default databasePerformanceMonitor;