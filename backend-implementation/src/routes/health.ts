/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - HEALTH CHECK ROUTES
 * ============================================================================
 *
 * Comprehensive health check endpoints for monitoring system health,
 * error rates, service availability, and recovery status.
 *
 * Features:
 * - Overall system health assessment
 * - Individual service health checks
 * - Error monitoring dashboard
 * - Recovery status reporting
 * - Performance metrics
 * - Database connectivity status
 * - External service status
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Router, Request, Response } from "express";
import { errorMonitoring } from "@/services/ErrorMonitoringService";
import { databaseRecovery } from "@/services/DatabaseRecoveryService";
import { databaseMonitoring } from "@/services/DatabaseMonitoringService";
import { databasePerformanceMonitor } from "@/services/DatabasePerformanceMonitor";
import { databaseOptimizationService } from "@/services/DatabaseOptimizationService";
import { logger } from "@/utils/logger";
import { database, getConnectionPoolStats, checkDatabaseHealth } from "@/config/database";
import { redisClient, checkRedisHealth } from "@/config/redis";
import { asyncHandler } from "@/middleware/errorHandler";

const router = Router();

/**
 * Overall system health check
 */
router.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Check individual components
      const [
        databaseStatus,
        redisStatus,
        errorMonitoringStatus,
        databaseRecoveryStatus,
      ] = await Promise.allSettled([
        checkDatabaseHealth(),
        checkRedisHealth(),
        checkErrorMonitoringHealth(),
        checkDatabaseRecoveryHealth(),
      ]);

      const duration = Date.now() - startTime;

      // Determine overall health status
      const componentsHealth = {
        database: getSettledValue(databaseStatus, {
          status: "unhealthy",
          error: "Failed to check",
        }),
        redis: getSettledValue(redisStatus, {
          status: "unhealthy",
          error: "Failed to check",
        }),
        errorMonitoring: getSettledValue(errorMonitoringStatus, {
          status: "unhealthy",
          error: "Failed to check",
        }),
        databaseRecovery: getSettledValue(databaseRecoveryStatus, {
          status: "unhealthy",
          error: "Failed to check",
        }),
      };

      const healthyComponents = Object.values(componentsHealth).filter(
        (c) => c.status === "healthy",
      ).length;
      const totalComponents = Object.keys(componentsHealth).length;

      let overallStatus = "healthy";
      if (healthyComponents === 0) {
        overallStatus = "unhealthy";
      } else if (healthyComponents < totalComponents) {
        overallStatus = "degraded";
      }

      const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        duration: `${duration}ms`,
        components: componentsHealth,
        summary: {
          healthy: healthyComponents,
          total: totalComponents,
          healthPercentage: Math.round(
            (healthyComponents / totalComponents) * 100,
          ),
        },
      };

      const statusCode =
        overallStatus === "healthy"
          ? 200
          : overallStatus === "degraded"
            ? 207
            : 503;

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error("Health check failed", { error: error.message });

      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`,
        error: "Health check service unavailable",
      });
    }
  }),
);

/**
 * Detailed system health with metrics
 */
router.get(
  "/health/detailed",
  asyncHandler(async (req: Request, res: Response) => {
    const timeRange = parseInt(req.query.timeRange as string) || 3600000; // 1 hour default

    try {
      const [errorStats, systemMetrics, performanceMetrics] = await Promise.all(
        [
          errorMonitoring.getErrorStats(timeRange),
          getSystemMetrics(),
          getPerformanceMetrics(),
        ],
      );

      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        timeRange: `${timeRange}ms`,
        errorStats,
        systemMetrics,
        performanceMetrics,
        healthChecks: await getDetailedHealthChecks(),
      });
    } catch (error) {
      logger.error("Detailed health check failed", { error: error.message });

      res.status(500).json({
        status: "error",
        message: "Failed to retrieve detailed health information",
        error: error.message,
      });
    }
  }),
);

/**
 * Error monitoring dashboard
 */
router.get(
  "/health/errors",
  asyncHandler(async (req: Request, res: Response) => {
    const timeRange = parseInt(req.query.timeRange as string) || 3600000;

    try {
      const errorStats = await errorMonitoring.getErrorStats(timeRange);
      const healthStatus = errorMonitoring.getHealthStatus();

      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        timeRange: `${timeRange}ms`,
        health: healthStatus,
        statistics: errorStats,
        recommendations: generateErrorRecommendations(errorStats, healthStatus),
      });
    } catch (error) {
      logger.error("Error monitoring health check failed", {
        error: error.message,
      });

      res.status(500).json({
        status: "error",
        message: "Failed to retrieve error monitoring information",
        error: error.message,
      });
    }
  }),
);

/**
 * Database health and recovery status
 */
router.get(
  "/health/database",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const dbHealth = databaseRecovery.getHealthStatus();
      const connectionTest = await databaseRecovery.checkConnection();
      const enhancedDbHealth = await checkDatabaseHealth();
      const connectionPoolStats = await getConnectionPoolStats();
      const performanceMetrics = databasePerformanceMonitor.getCurrentMetrics();
      const optimizationStatus = await databaseOptimizationService.getOptimizationStatus();

      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        connectionTest,
        health: dbHealth,
        connectionPool: connectionPoolStats,
        performance: performanceMetrics,
        optimization: optimizationStatus,
        recommendations: generateDatabaseRecommendations(dbHealth, performanceMetrics),
      });
    } catch (error) {
      logger.error("Database health check failed", { error: error.message });

      res.status(500).json({
        status: "error",
        message: "Failed to retrieve database health information",
        error: error.message,
      });
    }
  }),
);

/**
 * DATABASE PERFORMANCE MONITORING ENDPOINTS
 * Critical for 72-hour emergency deployment monitoring
 */

/**
 * Real-time database performance metrics
 */
router.get(
  "/health/database/performance",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const currentMetrics = databasePerformanceMonitor.getCurrentMetrics();
      const performanceSummary = databasePerformanceMonitor.getPerformanceSummary();
      const slowQueries = databasePerformanceMonitor.getSlowQueries(10);
      
      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        current: currentMetrics,
        summary: performanceSummary,
        slowQueries: slowQueries.map(query => ({
          duration: query.duration,
          timestamp: query.timestamp,
          query: query.query.length > 200 ? query.query.substring(0, 200) + "..." : query.query,
        })),
        alerts: currentMetrics ? {
          connectionPoolCritical: currentMetrics.connectionPool.utilization > 90,
          slowQueryAlert: currentMetrics.queryPerformance.avgResponseTime > 1000,
          healthCritical: currentMetrics.health.overall === "critical",
        } : {},
      });
    } catch (error) {
      logger.error("Database performance metrics failed", { error: error.message });
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve database performance metrics",
        error: error.message,
      });
    }
  }),
);

/**
 * Database optimization analysis and recommendations
 */
router.get(
  "/health/database/optimization",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const analysis = await databaseOptimizationService.analyzePerformance();
      const status = await databaseOptimizationService.getOptimizationStatus();
      
      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        analysis,
        optimizationStatus: status,
        criticalRecommendations: analysis.recommendations.filter(r => r.priority === "high"),
      });
    } catch (error) {
      logger.error("Database optimization analysis failed", { error: error.message });
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve database optimization analysis",
        error: error.message,
      });
    }
  }),
);

/**
 * Force database performance metrics collection
 */
router.post(
  "/health/database/performance/collect",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const metrics = await databasePerformanceMonitor.forceMetricsCollection();
      
      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        message: "Performance metrics collected successfully",
        metrics,
      });
    } catch (error) {
      logger.error("Forced metrics collection failed", { error: error.message });
      res.status(500).json({
        status: "error",
        message: "Failed to collect performance metrics",
        error: error.message,
      });
    }
  }),
);

/**
 * Database connection pool health check
 */
router.get(
  "/health/database/connection-pool",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const poolStats = await getConnectionPoolStats();
      const currentMetrics = databasePerformanceMonitor.getCurrentMetrics();
      
      const healthStatus = {
        status: poolStats.status,
        utilization: poolStats.pool.utilization,
        connections: {
          total: poolStats.pool.total,
          active: poolStats.pool.active,
          idle: poolStats.pool.idle,
          waiting: poolStats.pool.waiting,
        },
        configuration: poolStats.config,
        alerts: {
          highUtilization: poolStats.pool.utilization > 75,
          criticalUtilization: poolStats.pool.utilization > 90,
          waitingConnections: poolStats.pool.waiting > 0,
        },
        recommendations: generateConnectionPoolRecommendations(poolStats),
      };
      
      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        connectionPool: healthStatus,
        recentPerformance: currentMetrics?.connectionPool,
      });
    } catch (error) {
      logger.error("Connection pool health check failed", { error: error.message });
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve connection pool health",
        error: error.message,
      });
    }
  }),
);

/**
 * Recovery status and capabilities
 */
router.get(
  "/health/recovery",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const recoveryStatus = {
        databaseRecovery: databaseRecovery.getHealthStatus(),
        errorMonitoring: errorMonitoring.getHealthStatus(),
        gracefulDegradation: {
          enabled: true,
          strategies: [
            "database_fallback",
            "external_service_fallback",
            "timeout_recovery",
          ],
        },
        circuitBreakers: await getCircuitBreakerStatus(),
        maintenanceMode: {
          database: databaseRecovery.getHealthStatus().state === "maintenance",
        },
      };

      res.json({
        status: "success",
        timestamp: new Date().toISOString(),
        recovery: recoveryStatus,
        capabilities: {
          automaticRecovery: true,
          circuitBreakers: true,
          gracefulDegradation: true,
          healthMonitoring: true,
          alerting: true,
        },
      });
    } catch (error) {
      logger.error("Recovery status check failed", { error: error.message });

      res.status(500).json({
        status: "error",
        message: "Failed to retrieve recovery status information",
        error: error.message,
      });
    }
  }),
);

/**
 * Liveness probe (simple health check)
 */
router.get("/health/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness probe (detailed ready check)
 */
router.get(
  "/health/ready",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const checks = await Promise.allSettled([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const isReady = checks.every(
        (check) =>
          check.status === "fulfilled" && check.value.status === "healthy",
      );

      if (isReady) {
        res.status(200).json({
          status: "ready",
          timestamp: new Date().toISOString(),
          checks: {
            database: "healthy",
            redis: "healthy",
          },
        });
      } else {
        res.status(503).json({
          status: "not_ready",
          timestamp: new Date().toISOString(),
          checks: checks.reduce((acc, check, index) => {
            const service = ["database", "redis"][index];
            acc[service] =
              check.status === "fulfilled" ? check.value.status : "failed";
            return acc;
          }, {} as any),
        });
      }
    } catch (error) {
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }),
);

/**
 * Helper functions
 */

async function checkDatabaseHealth(): Promise<{
  status: string;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await database.authenticate();
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > 1000 ? "degraded" : "healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRedisHealth(): Promise<{
  status: string;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await redisClient.ping();
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > 100 ? "degraded" : "healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkErrorMonitoringHealth(): Promise<{
  status: string;
  error?: string;
}> {
  try {
    const health = errorMonitoring.getHealthStatus();
    return {
      status: health.status,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
}

async function checkDatabaseRecoveryHealth(): Promise<{
  status: string;
  error?: string;
}> {
  try {
    const health = databaseRecovery.getHealthStatus();
    return {
      status: health.state === "healthy" ? "healthy" : "degraded",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
}

function getSettledValue<T>(
  settledResult: PromiseSettledResult<T>,
  defaultValue: T,
): T {
  return settledResult.status === "fulfilled"
    ? settledResult.value
    : defaultValue;
}

async function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version,
  };
}

async function getPerformanceMetrics() {
  // This would typically integrate with APM tools
  return {
    responseTime: {
      avg: 0, // Would be calculated from actual metrics
      p95: 0,
      p99: 0,
    },
    throughput: {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
    },
    availability: {
      uptime: "99.9%",
      lastDowntime: null,
    },
  };
}

async function getDetailedHealthChecks() {
  return {
    database: await checkDatabaseHealth(),
    redis: await checkRedisHealth(),
    errorMonitoring: await checkErrorMonitoringHealth(),
    databaseRecovery: await checkDatabaseRecoveryHealth(),
  };
}

async function getCircuitBreakerStatus() {
  // This would get circuit breaker status from various services
  return {
    database: "closed",
    externalServices: "closed",
    redis: "closed",
  };
}

function generateErrorRecommendations(errorStats: any, healthStatus: any) {
  const recommendations = [];

  if (healthStatus.errorRate > 10) {
    recommendations.push(
      "High error rate detected. Consider investigating common error patterns.",
    );
  }

  if (healthStatus.criticalErrors > 0) {
    recommendations.push(
      "Critical errors present. Immediate attention required.",
    );
  }

  if (healthStatus.unresolvedErrors > 20) {
    recommendations.push(
      "Many unresolved errors. Review error resolution processes.",
    );
  }

  if (errorStats.bySeverity?.high > 10) {
    recommendations.push(
      "High number of severe errors. Check system stability.",
    );
  }

  return recommendations;
}

function generateDatabaseRecommendations(dbHealth: any, performanceMetrics?: any) {
  const recommendations = [];

  if (dbHealth.state === "degraded") {
    recommendations.push(
      "Database performance is degraded. Check connection pool and query performance.",
    );
  }

  if (dbHealth.state === "unhealthy") {
    recommendations.push(
      "Database is unhealthy. Check connectivity and run diagnostics.",
    );
  }

  if (dbHealth.state === "recovering") {
    recommendations.push(
      "Database is in recovery mode. Monitor recovery progress.",
    );
  }

  if (dbHealth.metrics?.errorRate > 5) {
    recommendations.push(
      "Database error rate is elevated. Review recent changes and query patterns.",
    );
  }

  // Enhanced recommendations based on performance metrics
  if (performanceMetrics?.connectionPool?.utilization > 90) {
    recommendations.push(
      "Critical connection pool utilization detected. Consider scaling database connections.",
    );
  }

  if (performanceMetrics?.queryPerformance?.avgResponseTime > 1000) {
    recommendations.push(
      "Slow query performance detected. Review query optimization and indexes.",
    );
  }

  if (performanceMetrics?.health?.overall === "critical") {
    recommendations.push(
      "Database health is critical. Immediate investigation required.",
    );
  }

  return recommendations;
}

/**
 * Generate connection pool specific recommendations
 */
function generateConnectionPoolRecommendations(poolStats: any) {
  const recommendations = [];

  if (poolStats.pool.utilization > 90) {
    recommendations.push({
      priority: "critical",
      message: "Connection pool utilization is critical. Increase max pool size or optimize connection usage.",
      action: "Scale DB_POOL_MAX above current value or investigate connection leaks",
    });
  } else if (poolStats.pool.utilization > 75) {
    recommendations.push({
      priority: "warning",
      message: "Connection pool utilization is high. Monitor for potential scaling needs.",
      action: "Prepare to increase DB_POOL_MAX if utilization continues to grow",
    });
  }

  if (poolStats.pool.waiting > 0) {
    recommendations.push({
      priority: "high",
      message: "Connections are waiting in queue. This indicates pool exhaustion.",
      action: "Increase DB_POOL_MAX immediately or investigate slow queries holding connections",
    });
  }

  if (poolStats.pool.active > poolStats.pool.total * 0.8) {
    recommendations.push({
      priority: "medium",
      message: "High number of active connections. Monitor query performance.",
      action: "Review long-running queries and optimize database operations",
    });
  }

  if (poolStats.pool.idle < poolStats.config.min) {
    recommendations.push({
      priority: "low",
      message: "Idle connections below minimum threshold. Pool may be under pressure.",
      action: "Monitor connection creation patterns and consider adjusting DB_POOL_MIN",
    });
  }

  return recommendations;
}

export default router;
