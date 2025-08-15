/**
 * ============================================================================
 * PERFORMANCE COORDINATION DASHBOARD
 * ============================================================================
 *
 * Central coordination service for Database-Architect partnership.
 * Consolidates database, cache, spatial, and statistical performance metrics
 * to provide comprehensive performance optimization insights.
 *
 * COORDINATION: Master dashboard for Database-Architect performance tracking
 * TARGETS: Sub-200ms responses, >85% cache hit ratio, >90% connection efficiency
 *
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { logger, Timer } from "@/utils/logger";
import { CacheService } from "@/config/redis";
import { databasePerformanceMonitor } from "./DatabasePerformanceMonitor";
import { databaseOptimizationService } from "./DatabaseOptimizationService";
import { cachedStatisticsService } from "./CachedStatisticsService";
import { spatialQueryOptimizationService } from "./SpatialQueryOptimizationService";
import { AppError } from "@/middleware/errorHandler";

/**
 * Comprehensive performance metrics interface
 */
export interface CoordinationPerformanceMetrics {
  timestamp: Date;
  database: {
    connectionPool: {
      utilization: number;
      status: "healthy" | "warning" | "critical";
      active: number;
      total: number;
      efficiency: number;
    };
    queryPerformance: {
      averageResponseTime: number;
      slowQueries: number;
      queriesPerSecond: number;
      p95ResponseTime: number;
    };
    optimization: {
      indexesOptimized: number;
      recommendationsCount: number;
      lastOptimizationRun: Date | null;
      performanceGrade: "optimal" | "good" | "needs_attention" | "critical";
    };
  };
  cache: {
    statistics: {
      hitRatio: number;
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
    };
    spatial: {
      hitRatio: number;
      averageQueryTime: number;
      totalSpatialQueries: number;
      spatialIndexEffectiveness: number;
    };
    redis: {
      status: "healthy" | "unhealthy";
      memoryUsage: string;
      responseTime: number;
    };
  };
  performance: {
    overallGrade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
    targetsMet: number;
    totalTargets: number;
    criticalIssues: number;
    improvementOpportunities: string[];
  };
  coordination: {
    databaseArchitectSync: boolean;
    lastCoordinationUpdate: Date;
    activeOptimizations: string[];
    pendingOptimizations: string[];
  };
}

/**
 * Performance targets for coordination
 */
interface PerformanceTargets {
  apiResponseTimeTarget: number;          // 200ms
  connectionPoolEfficiencyTarget: number; // 85%
  cacheHitRatioTarget: number;           // 90%
  spatialQueryTimeTarget: number;        // 50ms
  databaseQueryTimeTarget: number;       // 100ms
}

/**
 * Optimization recommendations
 */
interface OptimizationRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: "database" | "cache" | "spatial" | "application";
  title: string;
  description: string;
  estimatedImprovement: string;
  implementationEffort: "low" | "medium" | "high";
  coordinationRequired: boolean;
  databaseArchitectInvolvement: boolean;
}

class PerformanceCoordinationDashboard {
  private readonly targets: PerformanceTargets = {
    apiResponseTimeTarget: 200,        // ms
    connectionPoolEfficiencyTarget: 85, // %
    cacheHitRatioTarget: 90,           // %
    spatialQueryTimeTarget: 50,        // ms
    databaseQueryTimeTarget: 100,      // ms
  };

  private activeOptimizations: Set<string> = new Set();
  private lastCoordinationSync: Date = new Date();

  /**
   * Get comprehensive performance metrics coordinated with Database-Architect
   */
  public async getCoordinationMetrics(): Promise<CoordinationPerformanceMetrics> {
    const timer = new Timer("PerformanceCoordinationDashboard.getCoordinationMetrics");

    try {
      logger.info("Collecting coordinated performance metrics");

      // Collect all performance data in parallel
      const [
        databaseMetrics,
        optimizationStatus,
        statisticsCacheMetrics,
        spatialPerformanceMetrics,
        redisHealthStatus
      ] = await Promise.allSettled([
        databasePerformanceMonitor.getCurrentMetrics(),
        databaseOptimizationService.getOptimizationStatus(),
        cachedStatisticsService.getCachePerformanceMetrics(),
        spatialQueryOptimizationService.getSpatialPerformanceMetrics(),
        this.checkRedisPerformance(),
      ]);

      // Process database metrics
      const dbMetrics = databaseMetrics.status === 'fulfilled' ? databaseMetrics.value : null;
      const dbOptimization = optimizationStatus.status === 'fulfilled' ? optimizationStatus.value : null;
      const statsCache = statisticsCacheMetrics.status === 'fulfilled' ? statisticsCacheMetrics.value : null;
      const spatialMetrics = spatialPerformanceMetrics.status === 'fulfilled' ? spatialPerformanceMetrics.value : null;
      const redisHealth = redisHealthStatus.status === 'fulfilled' ? redisHealthStatus.value : null;

      // Build comprehensive metrics
      const metrics: CoordinationPerformanceMetrics = {
        timestamp: new Date(),
        database: {
          connectionPool: {
            utilization: dbMetrics?.connectionPool?.utilization || 0,
            status: dbMetrics?.connectionPool?.status || "critical",
            active: dbMetrics?.connectionPool?.active || 0,
            total: dbMetrics?.connectionPool?.total || 0,
            efficiency: this.calculateConnectionPoolEfficiency(dbMetrics),
          },
          queryPerformance: {
            averageResponseTime: dbMetrics?.queryPerformance?.avgResponseTime || 0,
            slowQueries: dbMetrics?.queryPerformance?.slowQueries || 0,
            queriesPerSecond: dbMetrics?.queryPerformance?.queriesPerSecond || 0,
            p95ResponseTime: this.estimateP95ResponseTime(dbMetrics),
          },
          optimization: {
            indexesOptimized: dbOptimization?.criticalIndexes || 0,
            recommendationsCount: dbOptimization?.recommendations || 0,
            lastOptimizationRun: dbOptimization?.lastAnalysis || null,
            performanceGrade: dbOptimization?.performance || "critical",
          },
        },
        cache: {
          statistics: {
            hitRatio: statsCache?.cacheHitRatio || 0,
            totalRequests: statsCache?.totalRequests || 0,
            cacheHits: statsCache?.cacheHits || 0,
            cacheMisses: statsCache?.cacheMisses || 0,
          },
          spatial: {
            hitRatio: spatialMetrics?.cacheHitRatio || 0,
            averageQueryTime: spatialMetrics?.averageQueryTime || 0,
            totalSpatialQueries: spatialMetrics?.totalQueries || 0,
            spatialIndexEffectiveness: spatialMetrics?.spatialIndexEffectiveness || 0,
          },
          redis: {
            status: redisHealth?.status || "unhealthy",
            memoryUsage: redisHealth?.memoryUsage || "Unknown",
            responseTime: redisHealth?.responseTime || 0,
          },
        },
        performance: this.calculateOverallPerformance(dbMetrics, statsCache, spatialMetrics),
        coordination: {
          databaseArchitectSync: this.isDatabaseArchitectSynced(),
          lastCoordinationUpdate: this.lastCoordinationSync,
          activeOptimizations: Array.from(this.activeOptimizations),
          pendingOptimizations: this.getPendingOptimizations(),
        },
      };

      logger.info("Coordinated performance metrics collected", {
        overallGrade: metrics.performance.overallGrade,
        targetsMet: metrics.performance.targetsMet,
        criticalIssues: metrics.performance.criticalIssues,
        duration: timer.end({ success: true }),
      });

      return metrics;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Failed to collect coordination metrics", error);
      throw new AppError("Failed to collect performance coordination metrics", 500);
    }
  }

  /**
   * Get optimization recommendations coordinated with Database-Architect
   */
  public async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const timer = new Timer("PerformanceCoordinationDashboard.getOptimizationRecommendations");

    try {
      const metrics = await this.getCoordinationMetrics();
      const recommendations: OptimizationRecommendation[] = [];

      // Database connection pool optimization
      if (metrics.database.connectionPool.efficiency < this.targets.connectionPoolEfficiencyTarget) {
        recommendations.push({
          priority: "high",
          category: "database",
          title: "Connection Pool Optimization Required",
          description: `Connection pool efficiency is ${metrics.database.connectionPool.efficiency}%, target is ${this.targets.connectionPoolEfficiencyTarget}%`,
          estimatedImprovement: "20-30% query throughput improvement",
          implementationEffort: "medium",
          coordinationRequired: true,
          databaseArchitectInvolvement: true,
        });
      }

      // Statistical query caching
      if (metrics.cache.statistics.hitRatio < this.targets.cacheHitRatioTarget) {
        recommendations.push({
          priority: "critical",
          category: "cache",
          title: "Statistical Query Caching Implementation",
          description: `Cache hit ratio is ${metrics.cache.statistics.hitRatio}%, target is ${this.targets.cacheHitRatioTarget}%`,
          estimatedImprovement: "70-90% response time improvement for statistical endpoints",
          implementationEffort: "high",
          coordinationRequired: true,
          databaseArchitectInvolvement: true,
        });
      }

      // Spatial query optimization
      if (metrics.cache.spatial.averageQueryTime > this.targets.spatialQueryTimeTarget) {
        recommendations.push({
          priority: "high",
          category: "spatial",
          title: "Spatial Query Index Optimization",
          description: `Spatial queries average ${metrics.cache.spatial.averageQueryTime}ms, target is ${this.targets.spatialQueryTimeTarget}ms`,
          estimatedImprovement: "50-80% spatial query performance improvement",
          implementationEffort: "medium",
          coordinationRequired: true,
          databaseArchitectInvolvement: true,
        });
      }

      // Database query performance
      if (metrics.database.queryPerformance.averageResponseTime > this.targets.databaseQueryTimeTarget) {
        recommendations.push({
          priority: "high",
          category: "database",
          title: "Database Query Performance Optimization",
          description: `Average query time is ${metrics.database.queryPerformance.averageResponseTime}ms, target is ${this.targets.databaseQueryTimeTarget}ms`,
          estimatedImprovement: "40-60% overall system performance improvement",
          implementationEffort: "high",
          coordinationRequired: true,
          databaseArchitectInvolvement: true,
        });
      }

      // N+1 query elimination
      if (metrics.database.queryPerformance.slowQueries > 5) {
        recommendations.push({
          priority: "medium",
          category: "application",
          title: "N+1 Query Pattern Elimination",
          description: `${metrics.database.queryPerformance.slowQueries} slow queries detected, likely N+1 patterns`,
          estimatedImprovement: "60-85% reduction in query count",
          implementationEffort: "medium",
          coordinationRequired: true,
          databaseArchitectInvolvement: false,
        });
      }

      // Redis performance optimization
      if (metrics.cache.redis.responseTime > 10) {
        recommendations.push({
          priority: "medium",
          category: "cache",
          title: "Redis Performance Optimization",
          description: `Redis response time is ${metrics.cache.redis.responseTime}ms, should be <10ms`,
          estimatedImprovement: "15-25% cache operation performance improvement",
          implementationEffort: "low",
          coordinationRequired: false,
          databaseArchitectInvolvement: false,
        });
      }

      logger.info("Optimization recommendations generated", {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter(r => r.priority === "critical").length,
        highCount: recommendations.filter(r => r.priority === "high").length,
        coordinationRequired: recommendations.filter(r => r.coordinationRequired).length,
        duration: timer.end({ success: true }),
      });

      return recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Failed to generate optimization recommendations", error);
      throw new AppError("Failed to generate optimization recommendations", 500);
    }
  }

  /**
   * Execute coordinated performance benchmark
   */
  public async runPerformanceBenchmark(): Promise<{
    results: CoordinationPerformanceMetrics;
    benchmarkScore: number;
    improvement: {
      before: Partial<CoordinationPerformanceMetrics>;
      after: Partial<CoordinationPerformanceMetrics>;
      percentImprovement: number;
    };
  }> {
    const timer = new Timer("PerformanceCoordinationDashboard.runPerformanceBenchmark");

    try {
      logger.info("Starting coordinated performance benchmark");

      // Record baseline metrics
      const baselineMetrics = await this.getCoordinationMetrics();

      // Run optimization warm-up
      await Promise.all([
        spatialQueryOptimizationService.warmupSpatialCache(),
        this.warmupStatisticsCache(),
        databasePerformanceMonitor.forceMetricsCollection(),
      ]);

      // Wait for warm-up to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Collect post-warmup metrics
      const optimizedMetrics = await this.getCoordinationMetrics();

      // Calculate benchmark score (0-100)
      const benchmarkScore = this.calculateBenchmarkScore(optimizedMetrics);

      // Calculate improvement
      const improvement = this.calculatePerformanceImprovement(baselineMetrics, optimizedMetrics);

      const results = {
        results: optimizedMetrics,
        benchmarkScore,
        improvement,
      };

      logger.info("Performance benchmark completed", {
        benchmarkScore,
        improvementPercent: improvement.percentImprovement,
        duration: timer.end({ success: true }),
      });

      return results;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Performance benchmark failed", error);
      throw new AppError("Performance benchmark failed", 500);
    }
  }

  /**
   * Update coordination status with Database-Architect
   */
  public async updateCoordinationStatus(
    activeOptimizations: string[],
    completedOptimizations: string[] = []
  ): Promise<void> {
    try {
      // Update active optimizations
      this.activeOptimizations.clear();
      activeOptimizations.forEach(opt => this.activeOptimizations.add(opt));

      // Update coordination timestamp
      this.lastCoordinationSync = new Date();

      // Cache coordination status
      await CacheService.set("performance:coordination:status", {
        activeOptimizations: Array.from(this.activeOptimizations),
        completedOptimizations,
        lastUpdate: this.lastCoordinationSync,
        databaseArchitectSync: true,
      }, 3600); // 1 hour TTL

      logger.info("Coordination status updated", {
        activeOptimizations: activeOptimizations.length,
        completedOptimizations: completedOptimizations.length,
        lastSync: this.lastCoordinationSync,
      });
    } catch (error) {
      logger.error("Failed to update coordination status", error);
    }
  }

  /**
   * Private helper methods
   */
  private calculateConnectionPoolEfficiency(metrics: any): number {
    if (!metrics?.connectionPool) return 0;
    const { active, total, utilization } = metrics.connectionPool;
    return Math.min(100, (active / total) * 100 * (utilization / 100));
  }

  private estimateP95ResponseTime(metrics: any): number {
    const avgTime = metrics?.queryPerformance?.avgResponseTime || 0;
    return Math.round(avgTime * 2.5); // Rough P95 estimation
  }

  private calculateOverallPerformance(dbMetrics: any, cacheMetrics: any, spatialMetrics: any) {
    const scores = [];
    
    // Database performance score
    const dbScore = this.getPerformanceScore(dbMetrics?.queryPerformance?.avgResponseTime || 1000, this.targets.databaseQueryTimeTarget);
    scores.push(dbScore);

    // Cache performance score
    const cacheScore = this.getPerformanceScore(100 - (cacheMetrics?.cacheHitRatio || 0), 100 - this.targets.cacheHitRatioTarget);
    scores.push(cacheScore);

    // Spatial performance score
    const spatialScore = this.getPerformanceScore(spatialMetrics?.averageQueryTime || 1000, this.targets.spatialQueryTimeTarget);
    scores.push(spatialScore);

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const targetsMet = scores.filter(score => score >= 80).length;
    const totalTargets = scores.length;
    const criticalIssues = scores.filter(score => score < 50).length;

    // Grade calculation
    let overallGrade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
    if (averageScore >= 95) overallGrade = "A+";
    else if (averageScore >= 90) overallGrade = "A";
    else if (averageScore >= 85) overallGrade = "B+";
    else if (averageScore >= 80) overallGrade = "B";
    else if (averageScore >= 70) overallGrade = "C";
    else if (averageScore >= 60) overallGrade = "D";
    else overallGrade = "F";

    // Improvement opportunities
    const improvementOpportunities = [];
    if (dbScore < 80) improvementOpportunities.push("Database query optimization");
    if (cacheScore < 80) improvementOpportunities.push("Cache hit ratio improvement");
    if (spatialScore < 80) improvementOpportunities.push("Spatial query optimization");

    return {
      overallGrade,
      targetsMet,
      totalTargets,
      criticalIssues,
      improvementOpportunities,
    };
  }

  private getPerformanceScore(actual: number, target: number): number {
    if (actual <= target) return 100;
    const ratio = target / actual;
    return Math.max(0, Math.min(100, ratio * 100));
  }

  private isDatabaseArchitectSynced(): boolean {
    const timeSinceSync = Date.now() - this.lastCoordinationSync.getTime();
    return timeSinceSync < 3600000; // 1 hour
  }

  private getPendingOptimizations(): string[] {
    return [
      "Statistical query caching implementation",
      "Composite spatial index deployment",
      "N+1 query pattern elimination",
      "Connection pool dynamic scaling",
    ];
  }

  private async checkRedisPerformance() {
    const startTime = Date.now();
    try {
      await CacheService.get("performance:health:check");
      const responseTime = Date.now() - startTime;
      return {
        status: "healthy" as const,
        responseTime,
        memoryUsage: "Unknown", // Would implement Redis INFO parsing
      };
    } catch (error) {
      return {
        status: "unhealthy" as const,
        responseTime: Date.now() - startTime,
        memoryUsage: "Unknown",
      };
    }
  }

  private async warmupStatisticsCache(): Promise<void> {
    try {
      await Promise.all([
        cachedStatisticsService.getRouteStatistics({ forceRefresh: false }),
        cachedStatisticsService.getBinStatistics(undefined, { forceRefresh: false }),
        cachedStatisticsService.getDashboardStatistics(undefined, { forceRefresh: false }),
      ]);
    } catch (error) {
      logger.warn("Statistics cache warmup failed", error);
    }
  }

  private calculateBenchmarkScore(metrics: CoordinationPerformanceMetrics): number {
    const weights = {
      connectionPoolEfficiency: 0.25,
      cacheHitRatio: 0.25,
      spatialQueryTime: 0.25,
      databaseQueryTime: 0.25,
    };

    const scores = {
      connectionPoolEfficiency: this.getPerformanceScore(
        100 - metrics.database.connectionPool.efficiency,
        100 - this.targets.connectionPoolEfficiencyTarget
      ),
      cacheHitRatio: this.getPerformanceScore(
        100 - metrics.cache.statistics.hitRatio,
        100 - this.targets.cacheHitRatioTarget
      ),
      spatialQueryTime: this.getPerformanceScore(
        metrics.cache.spatial.averageQueryTime,
        this.targets.spatialQueryTimeTarget
      ),
      databaseQueryTime: this.getPerformanceScore(
        metrics.database.queryPerformance.averageResponseTime,
        this.targets.databaseQueryTimeTarget
      ),
    };

    const weightedScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return Math.round(weightedScore * 100) / 100;
  }

  private calculatePerformanceImprovement(
    before: CoordinationPerformanceMetrics,
    after: CoordinationPerformanceMetrics
  ) {
    const beforeScore = this.calculateBenchmarkScore(before);
    const afterScore = this.calculateBenchmarkScore(after);
    const percentImprovement = ((afterScore - beforeScore) / beforeScore) * 100;

    return {
      before: {
        database: before.database,
        cache: before.cache,
      },
      after: {
        database: after.database,
        cache: after.cache,
      },
      percentImprovement: Math.round(percentImprovement * 100) / 100,
    };
  }
}

// Singleton instance for global use
export const performanceCoordinationDashboard = new PerformanceCoordinationDashboard();
export default performanceCoordinationDashboard;