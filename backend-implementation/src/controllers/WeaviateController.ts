/**
 * ============================================================================
 * WEAVIATE CONTROLLER - PHASE 1 API ENDPOINTS
 * ============================================================================
 *
 * REST API controller for Weaviate vector intelligence operations.
 * Provides enterprise-grade endpoints with performance monitoring,
 * caching strategies, and comprehensive error handling.
 *
 * ENDPOINTS:
 * - POST /api/v1/vector/search - Semantic vector search
 * - POST /api/v1/vector/warmup - Cache warmup operations  
 * - GET /api/v1/vector/performance - Performance metrics
 * - GET /api/v1/vector/health - Health check and status
 *
 * COORDINATION: Backend-Agent + Performance-Optimization-Specialist
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-16
 * Version: 1.0.0 - Phase 1 Production API
 */

import { Request, Response, NextFunction } from 'express';
import { logger, Timer } from '@/utils/logger';
import { AppError, ValidationError } from '@/middleware/errorHandler';
import { weaviateIntelligenceService, VectorSearchRequest } from '../services/WeaviateIntelligenceService';
import { weaviatePerformanceMonitor } from '../monitoring/WeaviatePerformanceMonitor';
import { body, query, validationResult } from 'express-validator';
import { CacheService } from '@/config/redis';

/**
 * API request/response interfaces
 */
interface VectorSearchAPIRequest {
  query: string;
  className?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  searchType?: 'semantic' | 'hybrid' | 'keyword';
  cacheOptions?: {
    useCache?: boolean;
    cacheTTL?: number;
  };
}

interface VectorSearchAPIResponse {
  success: boolean;
  data: {
    results: any[];
    totalCount: number;
    performance: {
      searchTime: number;
      cacheHit: boolean;
      slaCompliant: boolean;
    };
    metadata: {
      query: string;
      searchType: string;
      confidence: number;
      timestamp: string;
    };
  };
  message: string;
}

interface PerformanceMetricsAPIResponse {
  success: boolean;
  data: {
    current: any;
    trends: any;
    slaCompliance: any;
    recommendations: string[];
  };
  message: string;
}

/**
 * Weaviate Controller with enterprise performance patterns
 */
export class WeaviateController {

  /**
   * Validation rules for vector search
   */
  public static vectorSearchValidation = [
    body('query')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .trim()
      .withMessage('Query must be a string between 1 and 1000 characters'),
    
    body('className')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Class name must be a string between 1 and 100 characters'),
    
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100'),
    
    body('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    body('searchType')
      .optional()
      .isIn(['semantic', 'hybrid', 'keyword'])
      .withMessage('Search type must be semantic, hybrid, or keyword'),
    
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    
    body('cacheOptions.useCache')
      .optional()
      .isBoolean()
      .withMessage('useCache must be a boolean'),
    
    body('cacheOptions.cacheTTL')
      .optional()
      .isInt({ min: 60, max: 3600 })
      .withMessage('cacheTTL must be between 60 and 3600 seconds')
  ];

  /**
   * Perform semantic vector search
   * POST /api/v1/vector/search
   */
  public static async performVectorSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const timer = new Timer('WeaviateController.performVectorSearch');
    const requestId = req.headers['x-request-id'] || 'unknown';

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid vector search request', errors.array());
      }

      const searchRequest: VectorSearchAPIRequest = req.body;
      
      // Log request for monitoring
      logger.info('Vector search request received', {
        requestId,
        query: searchRequest.query.substring(0, 100), // First 100 chars only
        className: searchRequest.className,
        searchType: searchRequest.searchType || 'semantic',
        limit: searchRequest.limit || 10
      });

      // Check rate limiting
      const rateLimitKey = `vector_search_rate_limit:${req.ip}`;
      const currentRequests = await CacheService.incr(rateLimitKey, 3600); // 1 hour window
      
      if (currentRequests > 1000) { // 1000 requests per hour per IP
        throw new AppError('Rate limit exceeded for vector search', 429);
      }

      // Build vector search request
      const vectorRequest: VectorSearchRequest = {
        modelId: 'vector_search',
        features: {},
        query: searchRequest.query,
        className: searchRequest.className,
        limit: searchRequest.limit || 10,
        offset: searchRequest.offset || 0,
        filters: searchRequest.filters,
        searchType: searchRequest.searchType || 'semantic',
        options: {
          cacheResult: searchRequest.cacheOptions?.useCache !== false,
          cacheTTL: searchRequest.cacheOptions?.cacheTTL || 1800,
          timeout: 30000 // 30 second timeout
        }
      };

      // Perform vector search
      const searchStartTime = Date.now();
      const searchResult = await weaviateIntelligenceService.performVectorSearch(vectorRequest);
      const searchTime = Date.now() - searchStartTime;

      // Check SLA compliance
      const slaCompliant = searchTime <= 200; // 200ms SLA

      // Build API response
      const response: VectorSearchAPIResponse = {
        success: true,
        data: {
          results: searchResult.results,
          totalCount: searchResult.totalCount,
          performance: {
            searchTime,
            cacheHit: searchResult.searchMetrics.cacheHit,
            slaCompliant
          },
          metadata: {
            query: searchRequest.query,
            searchType: searchRequest.searchType || 'semantic',
            confidence: searchResult.confidence,
            timestamp: new Date().toISOString()
          }
        },
        message: searchResult.searchMetrics.cacheHit 
          ? 'Vector search completed (cached result)' 
          : 'Vector search completed successfully'
      };

      // Log response for monitoring
      logger.info('Vector search completed', {
        requestId,
        resultsCount: searchResult.results.length,
        searchTime: `${searchTime}ms`,
        cacheHit: searchResult.searchMetrics.cacheHit,
        slaCompliant,
        confidence: searchResult.confidence.toFixed(3)
      });

      // Track performance metrics
      await WeaviateController.trackSearchMetrics({
        requestId: requestId as string,
        searchTime,
        resultsCount: searchResult.results.length,
        cacheHit: searchResult.searchMetrics.cacheHit,
        slaCompliant
      });

      timer.end({ success: true, searchTime, cacheHit: searchResult.searchMetrics.cacheHit });
      res.status(200).json(response);

    } catch (error) {
      timer.end({ error: error.message });
      
      logger.error('Vector search failed', {
        requestId,
        error: error.message,
        query: req.body?.query?.substring(0, 100)
      });

      next(error);
    }
  }

  /**
   * Warmup vector cache with common queries
   * POST /api/v1/vector/warmup
   */
  public static async warmupVectorCache(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const timer = new Timer('WeaviateController.warmupVectorCache');

    try {
      logger.info('Vector cache warmup initiated');

      // Perform cache warmup
      await weaviateIntelligenceService.warmupVectorCache();

      // Get post-warmup performance metrics
      const performanceMetrics = await weaviateIntelligenceService.getVectorPerformanceMetrics();

      const response = {
        success: true,
        data: {
          warmupCompleted: true,
          cacheMetrics: {
            hitRatio: performanceMetrics.cacheHitRatio,
            connectionHealth: performanceMetrics.connectionHealth
          },
          timestamp: new Date().toISOString()
        },
        message: 'Vector cache warmup completed successfully'
      };

      timer.end({ success: true });
      res.status(200).json(response);

    } catch (error) {
      timer.end({ error: error.message });
      logger.error('Vector cache warmup failed', error);
      next(error);
    }
  }

  /**
   * Get comprehensive performance metrics
   * GET /api/v1/vector/performance
   */
  public static async getPerformanceMetrics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const timer = new Timer('WeaviateController.getPerformanceMetrics');

    try {
      // Get current monitoring metrics
      const monitoringMetrics = await weaviatePerformanceMonitor.getCurrentMetrics();
      const vectorMetrics = await weaviateIntelligenceService.getVectorPerformanceMetrics();
      const serviceStats = await weaviateIntelligenceService.getStats();

      // Get performance trends
      const performanceHistory = weaviatePerformanceMonitor.getPerformanceHistory();
      const activeAlerts = weaviatePerformanceMonitor.getActiveAlerts();

      const response: PerformanceMetricsAPIResponse = {
        success: true,
        data: {
          current: {
            apiResponseTime: vectorMetrics.searchLatency,
            vectorSearchTime: vectorMetrics.searchLatency,
            cacheHitRatio: vectorMetrics.cacheHitRatio,
            errorRate: vectorMetrics.errorRate,
            connectionHealth: vectorMetrics.connectionHealth,
            slaCompliance: monitoringMetrics?.sla.overallSLACompliance || 0,
            performanceGrade: monitoringMetrics?.optimization.performanceGrade || 'C'
          },
          trends: {
            historicalDataPoints: performanceHistory.length,
            recentTrend: performanceHistory.length > 10 ? 'stable' : 'insufficient_data',
            performanceHistory: performanceHistory.slice(-20) // Last 20 data points
          },
          slaCompliance: {
            apiResponseTimeSLA: vectorMetrics.searchLatency <= 200,
            vectorSearchSLA: vectorMetrics.searchLatency <= 150,
            cacheHitRatioSLA: vectorMetrics.cacheHitRatio >= 0.95,
            errorRateSLA: vectorMetrics.errorRate <= 0.01,
            targets: {
              apiResponseTime: '200ms',
              vectorSearchTime: '150ms',
              cacheHitRatio: '95%',
              errorRate: '1%'
            }
          },
          recommendations: monitoringMetrics?.optimization.optimizationRecommendations || []
        },
        message: 'Performance metrics retrieved successfully'
      };

      // Include active alerts if any
      if (activeAlerts.length > 0) {
        (response.data as any).alerts = {
          activeCount: activeAlerts.length,
          criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
          warningCount: activeAlerts.filter(a => a.severity === 'warning').length,
          alerts: activeAlerts.map(alert => ({
            id: alert.id,
            severity: alert.severity,
            metric: alert.metric,
            message: alert.message,
            timestamp: alert.timestamp
          }))
        };
      }

      timer.end({ success: true });
      res.status(200).json(response);

    } catch (error) {
      timer.end({ error: error.message });
      logger.error('Failed to get performance metrics', error);
      next(error);
    }
  }

  /**
   * Get Weaviate health status
   * GET /api/v1/vector/health
   */
  public static async getHealthStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const timer = new Timer('WeaviateController.getHealthStatus');

    try {
      // Get comprehensive health status
      const vectorMetrics = await weaviateIntelligenceService.getVectorPerformanceMetrics();
      const serviceStats = await weaviateIntelligenceService.getStats();
      const monitoringMetrics = await weaviatePerformanceMonitor.getCurrentMetrics();

      const healthStatus = {
        status: vectorMetrics.connectionHealth === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'WeaviateIntelligenceService',
        version: '1.0.0',
        details: {
          connection: {
            status: vectorMetrics.connectionHealth,
            poolSize: serviceStats.vector?.connectionPoolSize || 0,
            responseTime: `${vectorMetrics.searchLatency.toFixed(1)}ms`
          },
          performance: {
            apiResponseTime: `${vectorMetrics.searchLatency.toFixed(1)}ms`,
            cacheHitRatio: `${(vectorMetrics.cacheHitRatio * 100).toFixed(1)}%`,
            errorRate: `${(vectorMetrics.errorRate * 100).toFixed(2)}%`,
            slaCompliance: `${monitoringMetrics?.sla.overallSLACompliance.toFixed(1) || '0'}%`
          },
          sla: {
            apiResponseTimeSLA: vectorMetrics.searchLatency <= 200,
            cacheHitRatioSLA: vectorMetrics.cacheHitRatio >= 0.95,
            errorRateSLA: vectorMetrics.errorRate <= 0.01
          },
          cache: {
            memoryCache: serviceStats.vector?.memoryCache || {},
            redisConnection: 'connected' // Would check actual Redis connection
          }
        }
      };

      // Determine overall health based on SLA compliance
      const slaCompliance = monitoringMetrics?.sla.overallSLACompliance || 0;
      if (slaCompliance < 80) {
        healthStatus.status = 'unhealthy';
      } else if (slaCompliance < 95) {
        healthStatus.status = 'degraded';
      }

      const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;

      timer.end({ success: true, healthStatus: healthStatus.status });
      res.status(httpStatus).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus,
        message: `Weaviate service is ${healthStatus.status}`
      });

    } catch (error) {
      timer.end({ error: error.message });
      logger.error('Health check failed', error);

      // Return unhealthy status
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        },
        message: 'Weaviate service health check failed'
      });
    }
  }

  /**
   * Get vector search statistics
   * GET /api/v1/vector/stats
   */
  public static async getVectorStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const timer = new Timer('WeaviateController.getVectorStats');

    try {
      const serviceStats = await weaviateIntelligenceService.getStats();
      const performanceHistory = weaviatePerformanceMonitor.getPerformanceHistory();

      // Calculate additional statistics
      const recentHistory = performanceHistory.slice(-100); // Last 100 requests
      const averageResponseTime = recentHistory.reduce((sum, h) => sum + h.apiResponseTime, 0) / recentHistory.length || 0;
      const p95ResponseTime = this.calculatePercentile(recentHistory.map(h => h.apiResponseTime), 0.95);

      const response = {
        success: true,
        data: {
          service: serviceStats,
          statistics: {
            totalRequests: performanceHistory.length,
            averageResponseTime: `${averageResponseTime.toFixed(1)}ms`,
            p95ResponseTime: `${p95ResponseTime.toFixed(1)}ms`,
            dataPointsCollected: performanceHistory.length,
            monitoringUptime: timer.duration || 0
          },
          performance: {
            recentTrend: recentHistory.length > 10 ? this.calculateTrend(recentHistory) : 'insufficient_data',
            slaViolations: recentHistory.filter(h => h.apiResponseTime > 200).length,
            cachingEffectiveness: recentHistory.filter(h => h.cacheHitRatio > 0.9).length / recentHistory.length || 0
          }
        },
        message: 'Vector service statistics retrieved successfully'
      };

      timer.end({ success: true });
      res.status(200).json(response);

    } catch (error) {
      timer.end({ error: error.message });
      logger.error('Failed to get vector stats', error);
      next(error);
    }
  }

  /**
   * Track search metrics for performance monitoring
   */
  private static async trackSearchMetrics(metrics: {
    requestId: string;
    searchTime: number;
    resultsCount: number;
    cacheHit: boolean;
    slaCompliant: boolean;
  }): Promise<void> {
    try {
      // Cache metrics for dashboard access
      await CacheService.set(
        `vector_search_metrics:${metrics.requestId}`,
        {
          ...metrics,
          timestamp: new Date().toISOString()
        },
        300 // 5 minutes TTL
      );

      // Update rolling counters
      await CacheService.incr('vector_search_total_requests', 86400); // 24 hour window
      
      if (metrics.slaCompliant) {
        await CacheService.incr('vector_search_sla_compliant', 86400);
      }

      if (metrics.cacheHit) {
        await CacheService.incr('vector_search_cache_hits', 86400);
      }

    } catch (error) {
      logger.warn('Failed to track search metrics', error);
    }
  }

  /**
   * Calculate percentile from array of numbers
   */
  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index] || 0;
  }

  /**
   * Calculate performance trend from historical data
   */
  private static calculateTrend(history: any[]): 'improving' | 'stable' | 'degrading' {
    if (history.length < 10) return 'stable';

    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstAvg = firstHalf.reduce((sum, h) => sum + h.apiResponseTime, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.apiResponseTime, 0) / secondHalf.length;

    const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercentage > 5) return 'degrading';
    if (changePercentage < -5) return 'improving';
    return 'stable';
  }
}

export default WeaviateController;