/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - VECTOR INTELLIGENCE API ROUTES
 * ============================================================================
 *
 * PHASE 1 WEAVIATE DEPLOYMENT: Vector Intelligence API Endpoints
 * 
 * COORDINATION SESSION: phase-1-weaviate-parallel-deployment
 * BACKEND AGENT ROLE: API endpoint implementation with enterprise patterns
 * 
 * Endpoints:
 * - POST /api/ml/vector/search - Semantic search across operational data
 * - POST /api/ml/vector/ingest - Vectorize operational data
 * - GET /api/ml/vector/insights - Generate operational insights
 * - GET /api/ml/vector/health - Service health and performance metrics
 * 
 * Performance Requirements:
 * - <200ms response time (coordination with Performance-Optimization-Specialist)
 * - Aggressive caching for search results
 * - Rate limiting for resource protection
 * - Comprehensive error handling and monitoring
 *
 * Created by: Backend-Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateJWT, authorize } from '@/middleware/auth';
import { validateRequest, vectorValidation } from '@/middleware/validation';
import { rateLimiter } from '@/middleware/rateLimiter';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { logger, Timer } from '@/utils/logger';
import VectorIntelligenceService, { 
  OperationalData, 
  VectorSearchQuery 
} from '@/services/VectorIntelligenceService';
import { AppError, ValidationError } from '@/middleware/errorHandler';

const router = Router();

// Initialize Vector Intelligence Service
const vectorService = new VectorIntelligenceService();

/**
 * POST /api/ml/vector/search
 * Perform semantic search across operational data
 * 
 * COORDINATION: Performance-Specialist ensures <200ms response time
 */
router.post('/search',
  authenticateJWT,
  authorize(['admin', 'fleet_manager', 'operations_manager', 'user']),
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per user
    message: 'Too many search requests, please try again later'
  }),
  vectorValidation.search,
  async (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer('vectorAPI.search');

    try {
      const searchQuery: VectorSearchQuery = req.body;
      
      logger.info('Vector search request', {
        userId: req.user?.id,
        query: searchQuery.query,
        limit: searchQuery.limit,
        hasFilters: !!searchQuery.filters
      });

      // Execute semantic search
      const result = await vectorService.performSemanticSearch(searchQuery);

      timer.end({ 
        success: result.success, 
        resultCount: result.data?.length || 0 
      });

      if (!result.success) {
        return ResponseHelper.error(res, result?.message, 400, result.errors);
      }

      return ResponseHelper.success(res, result.data, result?.message, {
        resultCount: result.data?.length || 0,
        query: searchQuery.query,
        cached: result.meta?.cached || false,
        performance: {
          responseTime: timer.duration,
          threshold: searchQuery.threshold
        }
      });

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Vector search API error', {
        userId: req.user?.id,
        error: error instanceof Error ? error?.message : String(error),
        query: req.body.query
      });
      next(error);
    }
  }
);

/**
 * POST /api/ml/vector/ingest
 * Vectorize operational data for semantic search
 * 
 * COORDINATION: Database-Architect for batch optimization
 */
router.post('/ingest',
  authenticateJWT,
  authorize(['admin', 'operations_manager']), // Restricted to operations staff
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 ingestion requests per 15 minutes
    message: 'Ingestion rate limit exceeded, please wait before retrying'
  }),
  vectorValidation.ingest,
  async (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer('vectorAPI.ingest');

    try {
      const { data }: { data: OperationalData[] } = req.body;
      
      logger.info('Vector ingestion request', {
        userId: req.user?.id,
        dataCount: data.length,
        types: [...new Set(data.map(d => d.type))]
      });

      // Validate and transform data
      const validatedData = data.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));

      // Execute vectorization
      const result = await vectorService.vectorizeOperationalData(validatedData);

      timer.end({ 
        success: result.success, 
        processed: result.data?.totalProcessed || 0 
      });

      if (!result.success) {
        return ResponseHelper.error(res, result?.message, 400, result.errors);
      }

      return ResponseHelper.success(res, result.data, result?.message, {
        ingestionId: `ing_${Date.now()}`,
        performance: {
          responseTime: timer.duration,
          itemsPerSecond: result.data?.totalProcessed / (timer.duration / 1000)
        }
      });

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Vector ingestion API error', {
        userId: req.user?.id,
        error: error instanceof Error ? error?.message : String(error),
        dataCount: req.body?.data?.length
      });
      next(error);
    }
  }
);

/**
 * GET /api/ml/vector/insights
 * Generate operational insights from vector patterns
 * 
 * COORDINATION: Performance-Specialist for insight caching optimization
 */
router.get('/insights',
  authenticateJWT,
  authorize(['admin', 'fleet_manager', 'operations_manager']),
  rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 insights requests per 5 minutes
    message: 'Insights generation rate limit exceeded'
  }),
  vectorValidation.insights,
  async (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer('vectorAPI.insights');

    try {
      const { timeframe } = req.query;
      
      logger.info('Vector insights request', {
        userId: req.user?.id,
        timeframe
      });

      // Generate operational insights
      const result = await vectorService.generateOperationalInsights(timeframe as string);

      timer.end({ 
        success: result.success, 
        patternsFound: result.data?.patterns?.length || 0 
      });

      if (!result.success) {
        return ResponseHelper.error(res, result?.message, 400, result.errors);
      }

      return ResponseHelper.success(res, result.data, result?.message, {
        timeframe,
        cached: result.meta?.cached || false,
        generatedAt: new Date(),
        performance: {
          responseTime: timer.duration
        }
      });

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Vector insights API error', {
        userId: req.user?.id,
        error: error instanceof Error ? error?.message : String(error),
        timeframe: req.query.timeframe
      });
      next(error);
    }
  }
);

/**
 * GET /api/ml/vector/health
 * Get vector intelligence service health and performance metrics
 */
router.get('/health',
  authenticateJWT,
  authorize(['admin', 'operations_manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer('vectorAPI.health');

    try {
      logger.info('Vector health check request', {
        userId: req.user?.id
      });

      // Get service health
      const result = await vectorService.getVectorIntelligenceHealth();

      timer.end({ success: result.success });

      if (!result.success) {
        return ResponseHelper.error(res, result?.message, 503, result.errors);
      }

      return ResponseHelper.success(res, result.data, result?.message, {
        checkedAt: new Date(),
        performance: {
          responseTime: timer.duration
        }
      });

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Vector health check API error', {
        userId: req.user?.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      next(error);
    }
  }
);

/**
 * POST /api/ml/vector/deploy
 * Deploy and initialize Weaviate connection
 * 
 * COORDINATION: Database-Architect for schema deployment
 */
router.post('/deploy',
  authenticateJWT,
  authorize(['admin']), // Admin only for deployment
  rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 deployment attempts per hour
    message: 'Deployment rate limit exceeded'
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer('vectorAPI.deploy');

    try {
      logger.info('Vector deployment request', {
        userId: req.user?.id,
        userRole: req.user?.role
      });

      // Deploy Weaviate connection and schema
      const result = await vectorService.deployWeaviateConnection();

      timer.end({ success: result.success });

      if (!result.success) {
        return ResponseHelper.error(res, result?.message, 500, result.errors);
      }

      return ResponseHelper.success(res, result.data, result?.message, {
        deployedAt: new Date(),
        deployedBy: req.user?.id,
        performance: {
          responseTime: timer.duration
        }
      });

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Vector deployment API error', {
        userId: req.user?.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      next(error);
    }
  }
);

/**
 * Error handling middleware for vector API routes
 */
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Vector API route error', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    error: error instanceof Error ? error?.message : String(error)
  });

  if (error instanceof ValidationError) {
    return ResponseHelper.error(res, 'Validation failed', 400, error.errors);
  }

  if (error instanceof AppError) {
    return ResponseHelper.error(res, error instanceof Error ? error?.message : String(error), error.statusCode);
  }

  return ResponseHelper.error(res, req, { message: 'Internal server error in vector intelligence API', statusCode: 500 });
});

export default router;