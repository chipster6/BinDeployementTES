/**
 * ============================================================================
 * PERFORMANCE MONITORING SYSTEM
 * ============================================================================
 *
 * Production-ready performance monitoring to ensure optimizations remain
 * effective and detect performance regressions in real-time.
 *
 * Features:
 * - Database connection pool monitoring with 75%/90% alerting thresholds
 * - Cache performance tracking and hit ratio monitoring
 * - Response time monitoring with P95/P99 tracking
 * - Automated alerting for performance degradation
 *
 * Created by: Performance Optimization Specialist  
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { getConnectionPoolStats } from "../config/database";
import { redisClient } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  timestamp: number;
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    utilization: number;
    waitingConnections: number;
  };
  cache: {
    hitRatio: number;
    responseTime: number;
    invalidationRate: number;
    memoryUsage: number;
  };
  queries: {
    totalCount: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

/**
 * Performance alert interface
 */
interface PerformanceAlert {
  level: "warning" | "critical";
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  context: Record<string, any>;
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor extends EventEmitter {
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: PerformanceMetrics[] = [];
  private responseTimes: number[] = [];
  private cacheOperations: { type: string; responseTime: number; timestamp: number }[] = [];
  
  // Alert thresholds
  private readonly thresholds = {
    connectionPool: {
      warning: 75, // 75% utilization
      critical: 90, // 90% utilization
    },
    responseTime: {
      warning: 500, // 500ms P95
      critical: 1000, // 1000ms P95
    },
    cacheHitRatio: {
      warning: 80, // 80% hit ratio
      critical: 70, // 70% hit ratio
    },
    errorRate: {
      warning: 1, // 1% error rate
      critical: 5, // 5% error rate
    },
  };

  /**
   * Start performance monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn("Performance monitoring is already running");
      return;
    }

    logger.info("🔍 Starting performance monitoring", { intervalMs });
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info("🛑 Stopping performance monitoring");
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Collect connection pool metrics
      const poolStats = await getConnectionPoolStats();
      
      // Collect cache metrics
      const cacheMetrics = await this.collectCacheMetrics();
      
      // Collect query performance metrics
      const queryMetrics = this.collectQueryMetrics();
      
      // Collect system metrics
      const systemMetrics = this.collectSystemMetrics();

      const metrics: PerformanceMetrics = {
        timestamp,
        connectionPool: {
          total: poolStats.pool.total,
          active: poolStats.pool.active,
          idle: poolStats.pool.idle,
          utilization: poolStats.pool.utilization,
          waitingConnections: poolStats.pool.waiting || 0,
        },
        cache: cacheMetrics,
        queries: queryMetrics,
        system: systemMetrics,
      };

      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }

      // Check for alerts
      this.checkAlerts(metrics);

      // Emit metrics event
      this.emit("metrics", metrics);

      logger.debug("Performance metrics collected", {
        poolUtilization: `${metrics.connectionPool.utilization}%`,
        cacheHitRatio: `${metrics.cache.hitRatio}%`,
        avgResponseTime: `${metrics.queries.avgResponseTime}ms`,
      });

    } catch (error) {
      logger.error("Failed to collect performance metrics", error);
    }
  }

  /**
   * Collect cache performance metrics
   */
  private async collectCacheMetrics(): Promise<PerformanceMetrics["cache"]> {
    try {
      const startTime = performance.now();
      
      // Test cache performance
      const testKey = "perf:monitor:test";
      await redisClient.setex(testKey, 10, "test");
      const cached = await redisClient.get(testKey);
      await redisClient.del(testKey);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Calculate hit ratio from recent cache operations
      const recentOperations = this.cacheOperations.filter(
        op => op.timestamp > Date.now() - 300000 // Last 5 minutes
      );
      
      const hitRatio = recentOperations.length > 0 ? 
        (recentOperations.filter(op => op.type === "hit").length / recentOperations.length) * 100 : 95;

      // Get Redis memory usage
      const info = await redisClient.info("memory");
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      // Calculate invalidation rate
      const invalidations = recentOperations.filter(op => op.type === "invalidation");
      const invalidationRate = invalidations.length / 5; // per minute

      return {
        hitRatio,
        responseTime,
        invalidationRate,
        memoryUsage,
      };

    } catch (error) {
      logger.warn("Failed to collect cache metrics", error);
      return {
        hitRatio: 0,
        responseTime: 0,
        invalidationRate: 0,
        memoryUsage: 0,
      };
    }
  }

  /**
   * Collect query performance metrics
   */
  private collectQueryMetrics(): PerformanceMetrics["queries"] {
    const recentResponseTimes = this.responseTimes.filter(
      time => time > 0 // Filter valid response times
    ).slice(-1000); // Last 1000 queries

    if (recentResponseTimes.length === 0) {
      return {
        totalCount: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
      };
    }

    const sortedTimes = recentResponseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      totalCount: recentResponseTimes.length,
      avgResponseTime: Math.round(
        recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length
      ),
      p95ResponseTime: Math.round(sortedTimes[p95Index] || 0),
      p99ResponseTime: Math.round(sortedTimes[p99Index] || 0),
      errorRate: 0, // Would be calculated from actual error tracking
    };
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): PerformanceMetrics["system"] {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: memUsage.heapUsed,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: process.uptime(),
    };
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Connection pool utilization alerts
    if (metrics.connectionPool.utilization >= this.thresholds.connectionPool.critical) {
      alerts.push({
        level: "critical",
        metric: "connection_pool_utilization",
        message: "Database connection pool utilization critical",
        value: metrics.connectionPool.utilization,
        threshold: this.thresholds.connectionPool.critical,
        timestamp: metrics.timestamp,
        context: { 
          active: metrics.connectionPool.active,
          total: metrics.connectionPool.total,
          waiting: metrics.connectionPool.waitingConnections,
        },
      });
    } else if (metrics.connectionPool.utilization >= this.thresholds.connectionPool.warning) {
      alerts.push({
        level: "warning",
        metric: "connection_pool_utilization",
        message: "Database connection pool utilization high",
        value: metrics.connectionPool.utilization,
        threshold: this.thresholds.connectionPool.warning,
        timestamp: metrics.timestamp,
        context: { 
          active: metrics.connectionPool.active,
          total: metrics.connectionPool.total,
        },
      });
    }

    // Query response time alerts
    if (metrics.queries.p95ResponseTime >= this.thresholds.responseTime.critical) {
      alerts.push({
        level: "critical",
        metric: "query_response_time",
        message: "Query response time critical (P95)",
        value: metrics.queries.p95ResponseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: metrics.timestamp,
        context: {
          avgResponseTime: metrics.queries.avgResponseTime,
          p99ResponseTime: metrics.queries.p99ResponseTime,
        },
      });
    } else if (metrics.queries.p95ResponseTime >= this.thresholds.responseTime.warning) {
      alerts.push({
        level: "warning",
        metric: "query_response_time",
        message: "Query response time elevated (P95)",
        value: metrics.queries.p95ResponseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: metrics.timestamp,
        context: {
          avgResponseTime: metrics.queries.avgResponseTime,
        },
      });
    }

    // Cache hit ratio alerts
    if (metrics.cache.hitRatio <= this.thresholds.cacheHitRatio.critical) {
      alerts.push({
        level: "critical",
        metric: "cache_hit_ratio",
        message: "Cache hit ratio critically low",
        value: metrics.cache.hitRatio,
        threshold: this.thresholds.cacheHitRatio.critical,
        timestamp: metrics.timestamp,
        context: {
          invalidationRate: metrics.cache.invalidationRate,
          responseTime: metrics.cache.responseTime,
        },
      });
    } else if (metrics.cache.hitRatio <= this.thresholds.cacheHitRatio.warning) {
      alerts.push({
        level: "warning",
        metric: "cache_hit_ratio",
        message: "Cache hit ratio below optimal",
        value: metrics.cache.hitRatio,
        threshold: this.thresholds.cacheHitRatio.warning,
        timestamp: metrics.timestamp,
        context: {
          invalidationRate: metrics.cache.invalidationRate,
        },
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit("alert", alert);
      logger.warn(`Performance Alert [${alert.level}]: ${alert.message}`, {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        context: alert.context,
      });
    });
  }

  /**
   * Record query response time
   */
  public recordQueryTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times (last 10,000)
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }
  }

  /**
   * Record cache operation
   */
  public recordCacheOperation(type: "hit" | "miss" | "invalidation", responseTime: number = 0): void {
    this.cacheOperations.push({
      type,
      responseTime,
      timestamp: Date.now(),
    });

    // Keep only recent operations (last 5,000)
    if (this.cacheOperations.length > 5000) {
      this.cacheOperations = this.cacheOperations.slice(-2500);
    }
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): Record<string, any> {
    if (this.metrics.length === 0) {
      return { status: "no_data", message: "No metrics available" };
    }

    const latest = this.metrics[this.metrics.length - 1];
    const last10 = this.metrics.slice(-10);
    
    const avgPoolUtilization = last10.reduce((sum, m) => sum + m.connectionPool.utilization, 0) / last10.length;
    const avgResponseTime = last10.reduce((sum, m) => sum + m.queries.avgResponseTime, 0) / last10.length;
    const avgCacheHitRatio = last10.reduce((sum, m) => sum + m.cache.hitRatio, 0) / last10.length;

    return {
      status: "active",
      timestamp: latest.timestamp,
      current: {
        connectionPoolUtilization: `${latest.connectionPool.utilization}%`,
        cacheHitRatio: `${latest.cache.hitRatio}%`,
        avgResponseTime: `${latest.queries.avgResponseTime}ms`,
        p95ResponseTime: `${latest.queries.p95ResponseTime}ms`,
      },
      trends: {
        avgPoolUtilization: `${Math.round(avgPoolUtilization)}%`,
        avgResponseTime: `${Math.round(avgResponseTime)}ms`,
        avgCacheHitRatio: `${Math.round(avgCacheHitRatio)}%`,
      },
      health: this.assessSystemHealth(latest),
    };
  }

  /**
   * Assess system health
   */
  private assessSystemHealth(metrics: PerformanceMetrics): string {
    if (
      metrics.connectionPool.utilization < this.thresholds.connectionPool.warning &&
      metrics.queries.p95ResponseTime < this.thresholds.responseTime.warning &&
      metrics.cache.hitRatio > this.thresholds.cacheHitRatio.warning
    ) {
      return "healthy";
    }

    if (
      metrics.connectionPool.utilization >= this.thresholds.connectionPool.critical ||
      metrics.queries.p95ResponseTime >= this.thresholds.responseTime.critical ||
      metrics.cache.hitRatio <= this.thresholds.cacheHitRatio.critical
    ) {
      return "critical";
    }

    return "degraded";
  }

  /**
   * Get recent metrics
   */
  public getRecentMetrics(count: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();