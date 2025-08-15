/**
 * ============================================================================
 * PERFORMANCE COORDINATION ROUTES
 * ============================================================================
 *
 * API endpoints for Database-Architect coordination and performance monitoring.
 * Exposes comprehensive performance metrics, optimization recommendations,
 * and benchmark capabilities for coordinated performance enhancement.
 *
 * COORDINATION: Primary interface for Database-Architect partnership
 * PERFORMANCE: Real-time metrics and optimization coordination
 *
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { Router, Request, Response } from "express";
import { authenticate, authorize } from "@/middleware/auth";
import { logger } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { performanceCoordinationDashboard } from "@/services/PerformanceCoordinationDashboard";
import { cachedStatisticsService } from "@/services/CachedStatisticsService";
import { spatialQueryOptimizationService } from "@/services/SpatialQueryOptimizationService";
import { databasePerformanceMonitor } from "@/services/DatabasePerformanceMonitor";
import { databaseOptimizationService } from "@/services/DatabaseOptimizationService";

const router = Router();

/**
 * Apply authentication to all performance coordination routes
 * Only system admins should access performance coordination endpoints
 */
router.use(authenticate);
router.use(authorize(["admin", "system_admin"]));

/**
 * GET /api/performance/coordination/metrics
 * Get comprehensive performance metrics coordinated with Database-Architect
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    logger.info("Performance coordination metrics requested", {
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
    });

    const metrics = await performanceCoordinationDashboard.getCoordinationMetrics();

    logger.info("Performance coordination metrics collected", {
      overallGrade: metrics.performance.overallGrade,
      targetsMet: metrics.performance.targetsMet,
      criticalIssues: metrics.performance.criticalIssues,
    });

    return ResponseHelper.success(res, {
      metrics,
      summary: {
        status: metrics.performance.overallGrade,
        databaseArchitectSync: metrics.coordination.databaseArchitectSync,
        activeOptimizations: metrics.coordination.activeOptimizations.length,
        criticalIssues: metrics.performance.criticalIssues,
      },
    }, "Performance coordination metrics retrieved successfully");
  } catch (error) {
    logger.error("Performance coordination metrics retrieval failed", error);
    return ResponseHelper.error(res, "Failed to retrieve performance metrics", 500);
  }
});

/**
 * GET /api/performance/coordination/recommendations
 * Get optimization recommendations coordinated with Database-Architect
 */
router.get("/recommendations", async (req: Request, res: Response) => {
  try {
    logger.info("Performance optimization recommendations requested", {
      userId: (req as any).user?.id,
    });

    const recommendations = await performanceCoordinationDashboard.getOptimizationRecommendations();

    const summary = {
      totalRecommendations: recommendations.length,
      byPriority: {
        critical: recommendations.filter(r => r.priority === "critical").length,
        high: recommendations.filter(r => r.priority === "high").length,
        medium: recommendations.filter(r => r.priority === "medium").length,
        low: recommendations.filter(r => r.priority === "low").length,
      },
      coordinationRequired: recommendations.filter(r => r.coordinationRequired).length,
      databaseArchitectInvolvement: recommendations.filter(r => r.databaseArchitectInvolvement).length,
    };

    logger.info("Performance optimization recommendations generated", summary);

    return ResponseHelper.success(res, {
      recommendations,
      summary,
    }, "Optimization recommendations retrieved successfully");
  } catch (error) {
    logger.error("Performance recommendations retrieval failed", error);
    return ResponseHelper.error(res, "Failed to retrieve optimization recommendations", 500);
  }
});

/**
 * POST /api/performance/coordination/benchmark
 * Run comprehensive performance benchmark with Database-Architect coordination
 */
router.post("/benchmark", async (req: Request, res: Response) => {
  try {
    logger.info("Performance benchmark initiated", {
      userId: (req as any).user?.id,
    });

    const benchmarkResults = await performanceCoordinationDashboard.runPerformanceBenchmark();

    logger.info("Performance benchmark completed", {
      benchmarkScore: benchmarkResults.benchmarkScore,
      improvement: benchmarkResults.improvement.percentImprovement,
    });

    return ResponseHelper.success(res, {
      benchmark: benchmarkResults,
      interpretation: {
        score: benchmarkResults.benchmarkScore,
        grade: benchmarkResults.results.performance.overallGrade,
        improvement: `${benchmarkResults.improvement.percentImprovement}%`,
        status: benchmarkResults.benchmarkScore >= 80 ? "excellent" : 
                benchmarkResults.benchmarkScore >= 70 ? "good" : 
                benchmarkResults.benchmarkScore >= 60 ? "acceptable" : "needs_improvement",
      },
    }, "Performance benchmark completed successfully");
  } catch (error) {
    logger.error("Performance benchmark failed", error);
    return ResponseHelper.error(res, "Performance benchmark failed", 500);
  }
});

/**
 * POST /api/performance/coordination/sync
 * Update coordination status with Database-Architect
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { activeOptimizations, completedOptimizations } = req.body;

    if (!Array.isArray(activeOptimizations)) {
      return ResponseHelper.error(res, "activeOptimizations must be an array", 400);
    }

    logger.info("Coordination status sync requested", {
      userId: (req as any).user?.id,
      activeOptimizations: activeOptimizations.length,
      completedOptimizations: (completedOptimizations || []).length,
    });

    await performanceCoordinationDashboard.updateCoordinationStatus(
      activeOptimizations,
      completedOptimizations || []
    );

    return ResponseHelper.success(res, {
      syncStatus: "completed",
      timestamp: new Date(),
      activeOptimizations: activeOptimizations.length,
      completedOptimizations: (completedOptimizations || []).length,
    }, "Coordination status synced successfully");
  } catch (error) {
    logger.error("Coordination sync failed", error);
    return ResponseHelper.error(res, "Coordination sync failed", 500);
  }
});

/**
 * GET /api/performance/coordination/statistics
 * Get cached statistics performance metrics
 */
router.get("/statistics", async (req: Request, res: Response) => {
  try {
    const { customerId, forceRefresh } = req.query;

    logger.info("Statistics performance metrics requested", {
      userId: (req as any).user?.id,
      customerId: customerId as string,
      forceRefresh: forceRefresh === "true",
    });

    const [routeStats, binStats, cacheMetrics] = await Promise.all([
      cachedStatisticsService.getRouteStatistics({
        forceRefresh: forceRefresh === "true",
      }),
      cachedStatisticsService.getBinStatistics(
        customerId as string,
        { forceRefresh: forceRefresh === "true" }
      ),
      cachedStatisticsService.getCachePerformanceMetrics(),
    ]);

    return ResponseHelper.success(res, {
      statistics: {
        routes: routeStats,
        bins: binStats,
      },
      cachePerformance: cacheMetrics,
      metadata: {
        customerId: customerId as string || null,
        forceRefresh: forceRefresh === "true",
        timestamp: new Date(),
      },
    }, "Statistics performance metrics retrieved successfully");
  } catch (error) {
    logger.error("Statistics performance metrics retrieval failed", error);
    return ResponseHelper.error(res, "Failed to retrieve statistics metrics", 500);
  }
});

/**
 * GET /api/performance/coordination/spatial
 * Get spatial query performance metrics
 */
router.get("/spatial", async (req: Request, res: Response) => {
  try {
    logger.info("Spatial performance metrics requested", {
      userId: (req as any).user?.id,
    });

    const spatialMetrics = spatialQueryOptimizationService.getSpatialPerformanceMetrics();

    return ResponseHelper.success(res, {
      spatialPerformance: spatialMetrics,
      status: {
        performance: spatialMetrics.averageQueryTime < 50 ? "excellent" :
                    spatialMetrics.averageQueryTime < 100 ? "good" :
                    spatialMetrics.averageQueryTime < 200 ? "acceptable" : "needs_improvement",
        cacheEffectiveness: spatialMetrics.cacheHitRatio > 80 ? "excellent" :
                           spatialMetrics.cacheHitRatio > 60 ? "good" :
                           spatialMetrics.cacheHitRatio > 40 ? "acceptable" : "needs_improvement",
        indexEffectiveness: spatialMetrics.spatialIndexEffectiveness > 80 ? "excellent" :
                           spatialMetrics.spatialIndexEffectiveness > 60 ? "good" :
                           spatialMetrics.spatialIndexEffectiveness > 40 ? "acceptable" : "needs_improvement",
      },
    }, "Spatial performance metrics retrieved successfully");
  } catch (error) {
    logger.error("Spatial performance metrics retrieval failed", error);
    return ResponseHelper.error(res, "Failed to retrieve spatial performance metrics", 500);
  }
});

/**
 * POST /api/performance/coordination/spatial/warmup
 * Warmup spatial query cache
 */
router.post("/spatial/warmup", async (req: Request, res: Response) => {
  try {
    logger.info("Spatial cache warmup initiated", {
      userId: (req as any).user?.id,
    });

    await spatialQueryOptimizationService.warmupSpatialCache();

    return ResponseHelper.success(res, {
      warmupStatus: "completed",
      timestamp: new Date(),
    }, "Spatial cache warmup completed successfully");
  } catch (error) {
    logger.error("Spatial cache warmup failed", error);
    return ResponseHelper.error(res, "Spatial cache warmup failed", 500);
  }
});

/**
 * DELETE /api/performance/coordination/cache
 * Clear performance-related caches
 */
router.delete("/cache", async (req: Request, res: Response) => {
  try {
    const { scope } = req.query; // 'routes', 'bins', 'spatial', 'all'

    logger.info("Performance cache clear requested", {
      userId: (req as any).user?.id,
      scope: scope as string,
    });

    let clearedCount = 0;

    switch (scope) {
      case "routes":
        await cachedStatisticsService.invalidateStatisticsCache("routes");
        break;
      case "bins":
        await cachedStatisticsService.invalidateStatisticsCache("bins");
        break;
      case "spatial":
        clearedCount = await spatialQueryOptimizationService.clearSpatialCache();
        break;
      case "all":
      default:
        await Promise.all([
          cachedStatisticsService.invalidateStatisticsCache("all"),
          spatialQueryOptimizationService.clearSpatialCache(),
        ]);
        break;
    }

    return ResponseHelper.success(res, {
      cacheCleared: true,
      scope: scope as string || "all",
      clearedCount,
      timestamp: new Date(),
    }, "Performance cache cleared successfully");
  } catch (error) {
    logger.error("Performance cache clear failed", error);
    return ResponseHelper.error(res, "Failed to clear performance cache", 500);
  }
});

/**
 * GET /api/performance/coordination/database
 * Get database performance metrics from Database-Architect coordination
 */
router.get("/database", async (req: Request, res: Response) => {
  try {
    logger.info("Database performance metrics requested", {
      userId: (req as any).user?.id,
    });

    const [currentMetrics, optimizationStatus, performanceSummary] = await Promise.all([
      databasePerformanceMonitor.getCurrentMetrics(),
      databaseOptimizationService.getOptimizationStatus(),
      databasePerformanceMonitor.getPerformanceSummary(),
    ]);

    return ResponseHelper.success(res, {
      database: {
        currentMetrics,
        optimization: optimizationStatus,
        summary: performanceSummary,
      },
      coordination: {
        connectionPoolStatus: currentMetrics?.connectionPool?.status || "unknown",
        queryPerformanceGrade: optimizationStatus?.performance || "unknown",
        lastOptimization: optimizationStatus?.lastAnalysis || null,
      },
    }, "Database performance metrics retrieved successfully");
  } catch (error) {
    logger.error("Database performance metrics retrieval failed", error);
    return ResponseHelper.error(res, "Failed to retrieve database performance metrics", 500);
  }
});

/**
 * POST /api/performance/coordination/database/analyze
 * Trigger database performance analysis
 */
router.post("/database/analyze", async (req: Request, res: Response) => {
  try {
    logger.info("Database performance analysis initiated", {
      userId: (req as any).user?.id,
    });

    const analysisResults = await databaseOptimizationService.analyzePerformance();

    logger.info("Database performance analysis completed", {
      totalTables: analysisResults.summary.totalTables,
      totalIndexes: analysisResults.summary.totalIndexes,
      recommendations: analysisResults.recommendations.length,
    });

    return ResponseHelper.success(res, {
      analysis: analysisResults,
      summary: {
        tablesAnalyzed: analysisResults.summary.totalTables,
        indexesAnalyzed: analysisResults.summary.totalIndexes,
        recommendationsGenerated: analysisResults.recommendations.length,
        largestTable: analysisResults.summary.largestTable,
      },
    }, "Database performance analysis completed successfully");
  } catch (error) {
    logger.error("Database performance analysis failed", error);
    return ResponseHelper.error(res, "Database performance analysis failed", 500);
  }
});

/**
 * GET /api/performance/coordination/health
 * Comprehensive health check for performance coordination
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.allSettled([
      databasePerformanceMonitor.getCurrentMetrics(),
      spatialQueryOptimizationService.getSpatialPerformanceMetrics(),
      cachedStatisticsService.getCachePerformanceMetrics(),
    ]);

    const health = {
      database: healthChecks[0].status === "fulfilled" ? "healthy" : "unhealthy",
      spatial: healthChecks[1].status === "fulfilled" ? "healthy" : "unhealthy",
      cache: healthChecks[2].status === "fulfilled" ? "healthy" : "unhealthy",
      overall: healthChecks.every(check => check.status === "fulfilled") ? "healthy" : "degraded",
    };

    const statusCode = health.overall === "healthy" ? 200 : 503;

    return ResponseHelper.success(res, {
      health,
      checks: {
        database: healthChecks[0].status,
        spatial: healthChecks[1].status,
        cache: healthChecks[2].status,
      },
      timestamp: new Date(),
    }, "Performance coordination health check completed", statusCode);
  } catch (error) {
    logger.error("Performance coordination health check failed", error);
    return ResponseHelper.error(res, "Health check failed", 503);
  }
});

export default router;