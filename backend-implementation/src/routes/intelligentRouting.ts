/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - INTELLIGENT ROUTING API ROUTES
 * ============================================================================
 *
 * GROUP E SEQUENTIAL COORDINATION - PHASE 1: BACKEND FOUNDATION
 * 
 * API routes for intelligent traffic routing foundation and System-Architecture-Lead coordination.
 * Provides comprehensive routing decision, monitoring, and coordination endpoints.
 *
 * Features:
 * - Intelligent routing decision endpoints
 * - Health monitoring and system status
 * - Node registration and management
 * - Analytics and performance metrics
 * - Algorithm optimization controls
 * - System-Architecture-Lead coordination readiness
 *
 * Performance Targets:
 * - Decision endpoints: <50ms response time
 * - Health checks: <20ms response time
 * - Analytics queries: <200ms response time
 * - 99.9% uptime with intelligent fallbacks
 *
 * Created by: Backend Development Agent (Group E Phase 1)
 * Date: 2025-08-19
 * Version: 1.0.0 - Sequential Coordination Routes
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimitMiddleware } from '@/middleware/rateLimit';
import IntelligentRoutingController from '@/controllers/IntelligentRoutingController';

const router = Router();
const routingController = new IntelligentRoutingController();

/**
 * =============================================================================
 * INTELLIGENT ROUTING DECISION ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/routing/decision
 * Make intelligent routing decision with error-aware capabilities
 */
router.post(
  '/decision',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    skipSuccessfulRequests: false
  }),
  [
    // Request validation
    body('serviceName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Service name must be a string between 1-100 characters'),
    body('operation')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Operation must be a string between 1-100 characters'),
    body('organizationId')
      .optional()
      .isUUID()
      .withMessage('Organization ID must be a valid UUID'),
    body('businessCriticality')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Business criticality must be low, medium, high, or critical'),
    body('timeSensitivity')
      .optional()
      .isIn(['flexible', 'standard', 'urgent', 'immediate'])
      .withMessage('Time sensitivity must be flexible, standard, urgent, or immediate'),
    body('costSensitivity')
      .optional()
      .isIn(['none', 'low', 'medium', 'high', 'strict'])
      .withMessage('Cost sensitivity must be none, low, medium, high, or strict'),
    body('maxLatency')
      .optional()
      .isInt({ min: 50, max: 30000 })
      .withMessage('Max latency must be between 50-30000 milliseconds'),
    body('minSuccessRate')
      .optional()
      .isFloat({ min: 50, max: 100 })
      .withMessage('Min success rate must be between 50-100 percent'),
    body('maxErrorRate')
      .optional()
      .isFloat({ min: 0, max: 50 })
      .withMessage('Max error rate must be between 0-50 percent'),
    body('maxCostPerRequest')
      .optional()
      .isFloat({ min: 0.001, max: 10 })
      .withMessage('Max cost per request must be between 0.001-10 dollars'),
    body('emergencyBudgetAvailable')
      .optional()
      .isBoolean()
      .withMessage('Emergency budget available must be a boolean'),
    body('errorHistory')
      .optional()
      .isArray()
      .withMessage('Error history must be an array'),
    body('requiresSystemCoordination')
      .optional()
      .isBoolean()
      .withMessage('Requires system coordination must be a boolean'),
    body('coordinationScope')
      .optional()
      .isIn(['local', 'regional', 'global'])
      .withMessage('Coordination scope must be local, regional, or global'),
    body('crossStreamCoordination')
      .optional()
      .isBoolean()
      .withMessage('Cross stream coordination must be a boolean')
  ],
  validateRequest,
  routingController.makeRoutingDecision
);

/**
 * =============================================================================
 * HEALTH MONITORING AND STATUS ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/routing/health
 * Get intelligent routing system health status
 */
router.get(
  '/health',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    query('services')
      .optional()
      .isString()
      .withMessage('Services must be a comma-separated string'),
    query('detail_level')
      .optional()
      .isIn(['basic', 'standard', 'detailed'])
      .withMessage('Detail level must be basic, standard, or detailed')
  ],
  validateRequest,
  routingController.getHealthStatus
);

/**
 * =============================================================================
 * NODE REGISTRATION AND MANAGEMENT ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/routing/nodes/register
 * Register intelligent routing nodes for a service
 */
router.post(
  '/nodes/register',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute (less frequent operation)
    skipSuccessfulRequests: false
  }),
  [
    body('serviceName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Service name must be a string between 1-100 characters'),
    body('nodes')
      .isArray({ min: 1 })
      .withMessage('Nodes must be a non-empty array'),
    body('nodes.*.nodeId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Node ID must be a string between 1-100 characters'),
    body('nodes.*.providerName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Provider name must be a string between 1-100 characters'),
    body('nodes.*.endpoint')
      .isURL()
      .withMessage('Endpoint must be a valid URL'),
    body('nodes.*.region')
      .optional()
      .isString()
      .withMessage('Region must be a string'),
    body('nodes.*.averageLatency')
      .optional()
      .isInt({ min: 1, max: 30000 })
      .withMessage('Average latency must be between 1-30000 milliseconds'),
    body('nodes.*.successRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Success rate must be between 0-100 percent'),
    body('nodes.*.maxCapacity')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Max capacity must be between 1-10000'),
    body('nodes.*.costPerRequest')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('Cost per request must be between 0-10 dollars'),
    body('nodes.*.healthScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Health score must be between 0-100'),
    body('nodes.*.supportsErrorCoordination')
      .optional()
      .isBoolean()
      .withMessage('Supports error coordination must be a boolean'),
    body('nodes.*.supportsPerformanceMonitoring')
      .optional()
      .isBoolean()
      .withMessage('Supports performance monitoring must be a boolean'),
    body('nodes.*.supportsRealTimeUpdates')
      .optional()
      .isBoolean()
      .withMessage('Supports real-time updates must be a boolean')
  ],
  validateRequest,
  routingController.registerNodes
);

/**
 * =============================================================================
 * ANALYTICS AND PERFORMANCE METRICS ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/routing/analytics
 * Get routing analytics and performance metrics
 */
router.get(
  '/analytics',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    query('timeframe')
      .optional()
      .isIn(['15m', '1h', '6h', '24h', '7d', '30d'])
      .withMessage('Timeframe must be 15m, 1h, 6h, 24h, 7d, or 30d'),
    query('services')
      .optional()
      .isString()
      .withMessage('Services must be a comma-separated string'),
    query('include_details')
      .optional()
      .isBoolean()
      .withMessage('Include details must be a boolean')
  ],
  validateRequest,
  routingController.getAnalytics
);

/**
 * =============================================================================
 * ALGORITHM OPTIMIZATION ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/routing/algorithms/optimize
 * Optimize algorithm parameters based on learning data
 */
router.post(
  '/algorithms/optimize',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute (infrequent operation)
    skipSuccessfulRequests: false
  }),
  [
    body('algorithmId')
      .optional()
      .isString()
      .withMessage('Algorithm ID must be a string'),
    body('resetLearning')
      .optional()
      .isBoolean()
      .withMessage('Reset learning must be a boolean')
  ],
  validateRequest,
  routingController.optimizeAlgorithms
);

/**
 * =============================================================================
 * SYSTEM-ARCHITECTURE-LEAD COORDINATION ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/routing/coordination/readiness
 * Get System-Architecture-Lead coordination readiness status
 */
router.get(
  '/coordination/readiness',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    skipSuccessfulRequests: true
  }),
  routingController.getCoordinationReadiness
);

/**
 * =============================================================================
 * ADVANCED ROUTING ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/routing/decision/bulk
 * Make bulk routing decisions for multiple requests
 */
router.post(
  '/decision/bulk',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    skipSuccessfulRequests: false
  }),
  [
    body('requests')
      .isArray({ min: 1, max: 10 })
      .withMessage('Requests must be an array between 1-10 items'),
    body('requests.*.serviceName')
      .isString()
      .withMessage('Each request must have a service name'),
    body('requests.*.operation')
      .isString()
      .withMessage('Each request must have an operation'),
    body('requests.*.priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical')
  ],
  validateRequest,
  async (req, res) => {
    // Bulk decision processing would be implemented here
    // For now, return a placeholder response
    res.status(501).json({
      success: false,
      message: "Bulk routing decisions not yet implemented"
    });
  }
);

/**
 * GET /api/v1/routing/strategies
 * Get available routing strategies and their configurations
 */
router.get(
  '/strategies',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    skipSuccessfulRequests: true
  }),
  async (req, res) => {
    try {
      const strategies = [
        {
          strategy: "error_aware",
          name: "Error-Aware Routing",
          description: "Prioritizes nodes with low error rates and strong recovery capabilities",
          useCase: "High-reliability requirements with recent error activity",
          performance: {
            reliability: "high",
            latency: "medium",
            cost: "medium"
          }
        },
        {
          strategy: "cost_optimized",
          name: "Cost-Optimized Routing",
          description: "Minimizes costs while maintaining acceptable performance",
          useCase: "Budget-constrained operations with cost sensitivity",
          performance: {
            reliability: "medium",
            latency: "medium",
            cost: "high"
          }
        },
        {
          strategy: "performance_first",
          name: "Performance-First Routing",
          description: "Prioritizes lowest latency and highest throughput",
          useCase: "Critical operations requiring immediate response",
          performance: {
            reliability: "high",
            latency: "high",
            cost: "low"
          }
        },
        {
          strategy: "hybrid_intelligent",
          name: "Hybrid Intelligent Routing",
          description: "Balances all factors with machine learning optimization",
          useCase: "General-purpose routing with adaptive optimization",
          performance: {
            reliability: "high",
            latency: "high",
            cost: "medium"
          }
        },
        {
          strategy: "circuit_breaker_aware",
          name: "Circuit Breaker Aware Routing",
          description: "Routes around failing services with circuit breaker integration",
          useCase: "Service instability with circuit breaker patterns",
          performance: {
            reliability: "high",
            latency: "medium",
            cost: "medium"
          }
        },
        {
          strategy: "budget_constrained",
          name: "Budget Constrained Routing",
          description: "Ensures routing stays within strict budget limits",
          useCase: "Operations with hard budget constraints",
          performance: {
            reliability: "medium",
            latency: "low",
            cost: "high"
          }
        },
        {
          strategy: "health_prioritized",
          name: "Health Prioritized Routing",
          description: "Routes based on comprehensive node health metrics",
          useCase: "System health optimization and maintenance",
          performance: {
            reliability: "high",
            latency: "medium",
            cost: "medium"
          }
        }
      ];

      res.json({
        success: true,
        data: {
          strategies,
          defaultStrategy: "hybrid_intelligent",
          recommendationEngine: true,
          adaptiveLearning: true
        },
        message: "Routing strategies retrieved successfully"
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve routing strategies"
      });
    }
  }
);

/**
 * =============================================================================
 * MONITORING AND DEBUGGING ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/routing/debug/decisions/:decisionId
 * Get detailed information about a specific routing decision
 */
router.get(
  '/debug/decisions/:decisionId',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    param('decisionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Decision ID is required')
  ],
  validateRequest,
  async (req, res) => {
    // Decision debugging would be implemented here
    res.status(501).json({
      success: false,
      message: "Decision debugging not yet implemented"
    });
  }
);

/**
 * GET /api/v1/routing/debug/algorithms
 * Get detailed algorithm performance and debugging information
 */
router.get(
  '/debug/algorithms',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    skipSuccessfulRequests: true
  }),
  async (req, res) => {
    // Algorithm debugging would be implemented here
    res.status(501).json({
      success: false,
      message: "Algorithm debugging not yet implemented"
    });
  }
);

export default router;