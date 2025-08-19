/**
 * ============================================================================
 * MASTER TRAFFIC COORDINATION API
 * ============================================================================
 *
 * PHASE 2: SYSTEM-WIDE COORDINATION API LAYER
 * Comprehensive API endpoints for master system-wide traffic coordination
 * building on Phase 1 Backend Agent foundation.
 *
 * API Features:
 * - System-wide traffic coordination execution
 * - Advanced load balancing configuration
 * - Cross-service coordination management
 * - Groups A-D integration endpoints
 * - Real-time coordination monitoring
 * - System analytics and insights
 * - Enterprise-grade coordination policies
 *
 * Performance Targets:
 * - API response time: <200ms
 * - System coordination: <100ms
 * - Cross-service latency: <50ms overhead
 * - Load balancing efficiency: 95%+
 * - System reliability: 99.99% uptime
 *
 * Created by: System Architecture Lead
 * Date: 2025-08-19
 * Version: 2.0.0 - System-Wide Coordination APIs
 */

import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';
import { body, param, query } from 'express-validator';
import MasterTrafficCoordinationController from '@/controllers/MasterTrafficCoordinationController';

const router = Router();

// Initialize controller
const masterCoordinationController = new MasterTrafficCoordinationController();

/**
 * =============================================================================
 * SYSTEM-WIDE COORDINATION ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/master-coordination/execute-system-coordination
 * Execute comprehensive system-wide traffic coordination
 */
router.post(
  '/execute-system-coordination',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 system coordinations per minute
    skipSuccessfulRequests: false
  }),
  [
    body('sourceService')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Source service must be a valid string'),
    body('targetServices')
      .isArray({ min: 1, max: 20 })
      .withMessage('Target services must be a non-empty array with max 20 services'),
    body('targetServices.*')
      .isString()
      .withMessage('Each target service must be a valid string'),
    body('coordinationType')
      .isIn(['traffic_routing', 'load_balancing', 'failover', 'scaling'])
      .withMessage('Invalid coordination type'),
    body('priority')
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    
    // Security context validation
    body('securityContext.authenticationRequired')
      .isBoolean()
      .withMessage('Authentication required must be a boolean'),
    body('securityContext.rbacPolicies')
      .isArray()
      .withMessage('RBAC policies must be an array'),
    body('securityContext.encryptionLevel')
      .isIn(['standard', 'enhanced', 'maximum'])
      .withMessage('Invalid encryption level'),
    
    // Error orchestration context validation
    body('errorOrchestrationContext.cascadeProtection')
      .isBoolean()
      .withMessage('Cascade protection must be a boolean'),
    body('errorOrchestrationContext.recoveryStrategies')
      .isArray()
      .withMessage('Recovery strategies must be an array'),
    body('errorOrchestrationContext.monitoringLevel')
      .isIn(['basic', 'enhanced', 'comprehensive'])
      .withMessage('Invalid monitoring level'),
    
    // Performance context validation
    body('performanceContext.latencyTarget')
      .isInt({ min: 1, max: 10000 })
      .withMessage('Latency target must be between 1 and 10000 ms'),
    body('performanceContext.throughputTarget')
      .isInt({ min: 1, max: 100000 })
      .withMessage('Throughput target must be between 1 and 100000 rps'),
    body('performanceContext.resourceOptimization')
      .isBoolean()
      .withMessage('Resource optimization must be a boolean'),
    
    // Frontend context validation
    body('frontendContext.realTimeUpdates')
      .isBoolean()
      .withMessage('Real-time updates must be a boolean'),
    body('frontendContext.webSocketChannels')
      .isArray()
      .withMessage('WebSocket channels must be an array'),
    body('frontendContext.uiNotifications')
      .isBoolean()
      .withMessage('UI notifications must be a boolean'),
    
    // Business context validation
    body('businessContext.revenueImpact')
      .isNumeric()
      .withMessage('Revenue impact must be a number'),
    body('businessContext.customerTier')
      .isIn(['standard', 'premium', 'enterprise'])
      .withMessage('Invalid customer tier'),
    body('businessContext.slaRequirements')
      .isArray()
      .withMessage('SLA requirements must be an array')
  ],
  validateRequest,
  masterCoordinationController.executeSystemCoordination
);

/**
 * POST /api/v1/master-coordination/configure-load-balancing
 * Configure advanced system-wide load balancing
 */
router.post(
  '/configure-load-balancing',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 configurations per minute
    skipSuccessfulRequests: false
  }),
  [
    body('strategy')
      .isIn([
        'round_robin_system',
        'weighted_performance',
        'least_latency',
        'health_distributed',
        'geographic_smart',
        'cost_performance_hybrid',
        'predictive_system',
        'adaptive_intelligent'
      ])
      .withMessage('Invalid load balancing strategy'),
    body('services')
      .isArray({ min: 1, max: 50 })
      .withMessage('Services must be a non-empty array with max 50 services'),
    body('services.*')
      .isString()
      .withMessage('Each service must be a valid string'),
    body('performanceTargets')
      .isObject()
      .withMessage('Performance targets must be an object'),
    body('geographicDistribution')
      .optional()
      .isObject()
      .withMessage('Geographic distribution must be an object'),
    body('circuitBreakerEnabled')
      .optional()
      .isBoolean()
      .withMessage('Circuit breaker enabled must be a boolean')
  ],
  validateRequest,
  masterCoordinationController.configureLoadBalancing
);

/**
 * =============================================================================
 * SYSTEM MONITORING AND ANALYTICS ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/master-coordination/system-status
 * Get comprehensive system coordination status
 */
router.get(
  '/system-status',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    query('includeDetailedMetrics')
      .optional()
      .isBoolean()
      .withMessage('Include detailed metrics must be a boolean'),
    query('timeWindow')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Time window must be between 1 and 1440 minutes')
  ],
  validateRequest,
  masterCoordinationController.getSystemStatus
);

/**
 * GET /api/v1/master-coordination/coordination-analytics
 * Get system coordination analytics and insights
 */
router.get(
  '/coordination-analytics',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    query('timeRange')
      .optional()
      .isIn(['1h', '6h', '24h', '7d', '30d'])
      .withMessage('Invalid time range'),
    query('services')
      .optional()
      .isString()
      .withMessage('Services must be a comma-separated string'),
    query('includePredictions')
      .optional()
      .isBoolean()
      .withMessage('Include predictions must be a boolean')
  ],
  validateRequest,
  masterCoordinationController.getCoordinationAnalytics
);

/**
 * =============================================================================
 * GROUP INTEGRATION ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/master-coordination/group-integration-status
 * Get Groups A-D integration status and health
 */
router.get(
  '/group-integration-status',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 90, // 90 requests per minute
    skipSuccessfulRequests: true
  }),
  masterCoordinationController.getGroupIntegrationStatus
);

/**
 * =============================================================================
 * COORDINATION MANAGEMENT ENDPOINTS
 * =============================================================================
 */

/**
 * GET /api/v1/master-coordination/active-coordinations
 * Get currently active system coordinations
 */
router.get(
  '/active-coordinations',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 180, // 180 requests per minute
    skipSuccessfulRequests: true
  }),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'completed', 'failed', 'pending'])
      .withMessage('Invalid status filter')
  ],
  validateRequest,
  masterCoordinationController.getActiveCoordinations
);

/**
 * GET /api/v1/master-coordination/health
 * Get master coordination service health status
 */
router.get(
  '/health',
  authMiddleware,
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    skipSuccessfulRequests: true
  }),
  masterCoordinationController.getServiceHealth
);

export default router;