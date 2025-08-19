/**
 * ============================================================================
 * WEAVIATE ROUTES - PHASE 1 API ENDPOINTS
 * ============================================================================
 *
 * REST API routes for Weaviate vector intelligence operations.
 * Provides comprehensive endpoints with authentication, rate limiting,
 * and performance monitoring integration.
 *
 * ROUTES:
 * - POST /api/v1/vector/search - Semantic vector search
 * - POST /api/v1/vector/warmup - Cache warmup operations
 * - GET /api/v1/vector/performance - Performance metrics  
 * - GET /api/v1/vector/health - Health check and status
 * - GET /api/v1/vector/stats - Service statistics
 *
 * COORDINATION: Backend-Agent + Performance-Optimization-Specialist
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-16
 * Version: 1.0.0 - Phase 1 Production Routes
 */

import { Router } from 'express';
import { WeaviateController } from '../controllers/WeaviateController';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { performanceMiddleware } from '../middleware/performance';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

/**
 * Middleware stack for Weaviate operations
 */
const weaviateMiddleware = [
  authMiddleware, // JWT authentication required
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 requests per minute per user
    message: 'Too many vector search requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  performanceMiddleware, // Track API performance
  auditMiddleware // Audit logging for compliance
];

/**
 * Health monitoring middleware (no auth required)
 */
const healthMiddleware = [
  performanceMiddleware // Only performance tracking for health checks
];

/**
 * Administrative middleware (enhanced auth required)
 */
const adminMiddleware = [
  authMiddleware,
  // Additional admin role check would go here
  performanceMiddleware,
  auditMiddleware
];

// ============================================================================
// VECTOR SEARCH OPERATIONS
// ============================================================================

/**
 * @route   POST /api/v1/vector/search
 * @desc    Perform semantic vector search with multi-layer caching
 * @access  Private (JWT required)
 * @params  {string} query - Search query text
 * @params  {string} [className] - Weaviate class name  
 * @params  {number} [limit=10] - Maximum results to return
 * @params  {number} [offset=0] - Results offset for pagination
 * @params  {object} [filters] - Additional search filters
 * @params  {string} [searchType=semantic] - Search type: semantic, hybrid, keyword
 * @params  {object} [cacheOptions] - Caching configuration
 * @returns {VectorSearchAPIResponse} Search results with performance metrics
 * @example
 * POST /api/v1/vector/search
 * {
 *   "query": "waste collection route optimization",
 *   "className": "WasteOperation",
 *   "limit": 10,
 *   "searchType": "semantic",
 *   "filters": { "status": "active" },
 *   "cacheOptions": { "useCache": true, "cacheTTL": 1800 }
 * }
 */
router.post(
  '/search',
  ...weaviateMiddleware,
  WeaviateController.vectorSearchValidation,
  WeaviateController.performVectorSearch
);

/**
 * @route   POST /api/v1/vector/warmup  
 * @desc    Warmup vector cache with common queries for optimal performance
 * @access  Private (JWT required)
 * @returns {object} Warmup completion status and cache metrics
 * @example
 * POST /api/v1/vector/warmup
 * Response: {
 *   "success": true,
 *   "data": {
 *     "warmupCompleted": true,
 *     "cacheMetrics": { "hitRatio": 0.95, "connectionHealth": "healthy" }
 *   }
 * }
 */
router.post(
  '/warmup',
  ...adminMiddleware,
  WeaviateController.warmupVectorCache
);

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * @route   GET /api/v1/vector/performance
 * @desc    Get comprehensive performance metrics and SLA compliance
 * @access  Private (JWT required)
 * @returns {PerformanceMetricsAPIResponse} Detailed performance analytics
 * @example
 * GET /api/v1/vector/performance
 * Response: {
 *   "data": {
 *     "current": { "apiResponseTime": 150, "slaCompliance": 98.5 },
 *     "trends": { "recentTrend": "improving" },
 *     "recommendations": ["Optimize HNSW parameters"]
 *   }
 * }
 */
router.get(
  '/performance',
  ...weaviateMiddleware,
  WeaviateController.getPerformanceMetrics
);

/**
 * @route   GET /api/v1/vector/stats
 * @desc    Get vector service statistics and operational metrics
 * @access  Private (JWT required)  
 * @returns {object} Service statistics and performance trends
 * @example
 * GET /api/v1/vector/stats
 * Response: {
 *   "data": {
 *     "statistics": { "totalRequests": 1250, "averageResponseTime": "145ms" },
 *     "performance": { "recentTrend": "stable", "slaViolations": 2 }
 *   }
 * }
 */
router.get(
  '/stats',
  ...weaviateMiddleware,
  WeaviateController.getVectorStats
);

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * @route   GET /api/v1/vector/health
 * @desc    Get Weaviate service health status and connection diagnostics
 * @access  Public (no auth required for health checks)
 * @returns {object} Health status with detailed diagnostics
 * @example
 * GET /api/v1/vector/health
 * Response: {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "details": {
 *       "connection": { "status": "healthy", "responseTime": "15ms" },
 *       "performance": { "slaCompliance": "98.5%" },
 *       "sla": { "apiResponseTimeSLA": true, "cacheHitRatioSLA": true }
 *     }
 *   }
 * }
 */
router.get(
  '/health',
  ...healthMiddleware,
  WeaviateController.getHealthStatus
);

/**
 * @route   GET /api/v1/vector/health/detailed
 * @desc    Get detailed health diagnostics (admin access)
 * @access  Private (JWT required)
 * @returns {object} Comprehensive health diagnostics with internal metrics
 */
router.get(
  '/health/detailed',
  ...adminMiddleware,
  WeaviateController.getHealthStatus
);

// ============================================================================
// API DOCUMENTATION
// ============================================================================

/**
 * @route   GET /api/v1/vector/docs
 * @desc    Get API documentation and usage examples
 * @access  Public
 * @returns {object} API documentation and endpoint descriptions
 */
router.get('/docs', (req, res) => {
  const documentation = {
    service: 'Weaviate Vector Intelligence API',
    version: '1.0.0',
    description: 'Enterprise-grade vector search API with <200ms SLA',
    baseUrl: '/api/v1/vector',
    authentication: 'JWT Bearer token required (except health endpoints)',
    rateLimits: {
      general: '100 requests per minute per user',
      search: '50 searches per minute per user',
      warmup: '5 warmups per hour per user'
    },
    endpoints: [
      {
        method: 'POST',
        path: '/search',
        description: 'Perform semantic vector search',
        authentication: 'required',
        rateLimit: '50/min',
        sla: '<200ms response time'
      },
      {
        method: 'POST', 
        path: '/warmup',
        description: 'Warmup vector cache',
        authentication: 'required',
        rateLimit: '5/hour',
        sla: '<30s completion time'
      },
      {
        method: 'GET',
        path: '/performance',
        description: 'Get performance metrics',
        authentication: 'required',
        rateLimit: '100/min',
        sla: '<100ms response time'
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Health status check',
        authentication: 'none',
        rateLimit: '300/min',
        sla: '<50ms response time'
      },
      {
        method: 'GET',
        path: '/stats',
        description: 'Service statistics',
        authentication: 'required', 
        rateLimit: '100/min',
        sla: '<100ms response time'
      }
    ],
    examples: {
      search: {
        url: 'POST /api/v1/vector/search',
        headers: {
          'Authorization': 'Bearer <jwt_token>',
          'Content-Type': 'application/json'
        },
        body: {
          query: 'waste collection route optimization',
          className: 'WasteOperation',
          limit: 10,
          searchType: 'semantic'
        }
      },
      performance: {
        url: 'GET /api/v1/vector/performance',
        headers: {
          'Authorization': 'Bearer <jwt_token>'
        }
      }
    },
    slaTargets: {
      apiResponseTime: '<200ms',
      vectorSearchTime: '<150ms',
      cacheHitRatio: '>95%',
      errorRate: '<1%',
      availability: '>99.9%'
    },
    supportedSearchTypes: [
      {
        type: 'semantic',
        description: 'AI-powered semantic understanding',
        useCase: 'Finding conceptually similar content'
      },
      {
        type: 'hybrid',
        description: 'Combination of semantic and keyword search',
        useCase: 'Balanced relevance and precision'
      },
      {
        type: 'keyword',
        description: 'Traditional keyword matching',
        useCase: 'Exact term matching requirements'
      }
    ]
  };

  res.status(200).json({
    success: true,
    data: documentation,
    message: 'Weaviate Vector Intelligence API documentation'
  });
});

export default router;