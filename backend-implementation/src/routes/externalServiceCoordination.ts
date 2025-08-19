/**
 * ============================================================================
 * EXTERNAL SERVICE COORDINATION ROUTES
 * ============================================================================
 *
 * Comprehensive routing configuration for External Service Performance
 * Optimization with Frontend Agent coordination, providing RESTful APIs
 * for cost monitoring, batching performance, and real-time integration.
 *
 * Route Categories:
 * - Service Status & Health Monitoring
 * - Cost Monitoring & Budget Management
 * - Intelligent Batching Performance
 * - Webhook Coordination & Processing
 * - Rate Limiting & Optimization
 * - Frontend Integration & Real-time Data
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-18
 * Version: 1.0.0
 * Coordination: Group D - Frontend Agent Integration
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { auth } from '@/middleware/auth';
import { validation } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';
import { externalServiceCoordinationController } from '@/controllers/ExternalServiceCoordinationController';

const router = Router();

/**
 * Apply authentication middleware to all routes
 */
router.use(auth);

/**
 * Service Status & Health Monitoring Routes
 */

/**
 * GET /api/external-services/status
 * Get comprehensive service status for Frontend dashboards
 */
router.get(
  '/status',
  [
    query('includeMetrics')
      .optional()
      .isBoolean()
      .withMessage('includeMetrics must be boolean'),
    query('realtime')
      .optional()
      .isBoolean()
      .withMessage('realtime must be boolean'),
    validation,
  ],
  externalServiceCoordinationController.getServiceStatus.bind(externalServiceCoordinationController)
);

/**
 * GET /api/external-services/:serviceName/health
 * Get detailed health information for specific service
 */
router.get(
  '/:serviceName/health',
  [
    param('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    validation,
  ],
  async (req, res) => {
    // This would be implemented in the controller
    res.json({ message: 'Service health endpoint - to be implemented' });
  }
);

/**
 * Cost Monitoring & Budget Management Routes
 */

/**
 * GET /api/external-services/cost-monitoring
 * Get cost monitoring data for Frontend cost dashboards
 */
router.get(
  '/cost-monitoring',
  [
    query('timeframe')
      .optional()
      .isIn(['1h', '6h', '24h', '7d', '30d'])
      .withMessage('Invalid timeframe'),
    query('includeProjections')
      .optional()
      .isBoolean()
      .withMessage('includeProjections must be boolean'),
    validation,
  ],
  externalServiceCoordinationController.getCostMonitoring.bind(externalServiceCoordinationController)
);

/**
 * POST /api/external-services/budget-alert
 * Configure budget alert thresholds
 */
router.post(
  '/budget-alert',
  [
    body('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    body('alertType')
      .notEmpty()
      .isIn(['warning', 'critical', 'emergency'])
      .withMessage('Invalid alert type'),
    body('threshold')
      .isNumeric()
      .isFloat({ min: 1, max: 100 })
      .withMessage('Threshold must be between 1-100'),
    validation,
  ],
  async (req, res) => {
    // Budget alert configuration endpoint
    res.json({ message: 'Budget alert configuration endpoint - to be implemented' });
  }
);

/**
 * Intelligent Batching Performance Routes
 */

/**
 * GET /api/external-services/batching-performance
 * Get intelligent batching performance metrics
 */
router.get(
  '/batching-performance',
  [
    query('service')
      .optional()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    validation,
  ],
  externalServiceCoordinationController.getBatchingPerformance.bind(externalServiceCoordinationController)
);

/**
 * POST /api/external-services/batch-request
 * Submit request through intelligent batching
 */
router.post(
  '/batch-request',
  [
    rateLimit({ windowMs: 60000, max: 100 }), // 100 requests per minute
    body('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    body('method')
      .notEmpty()
      .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .withMessage('Invalid HTTP method'),
    body('endpoint')
      .notEmpty()
      .isString()
      .withMessage('Endpoint is required'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.urgency')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid urgency level'),
    body('options.customerFacing')
      .optional()
      .isBoolean()
      .withMessage('customerFacing must be boolean'),
    body('options.revenueImpacting')
      .optional()
      .isBoolean()
      .withMessage('revenueImpacting must be boolean'),
    validation,
  ],
  externalServiceCoordinationController.submitBatchRequest.bind(externalServiceCoordinationController)
);

/**
 * GET /api/external-services/batch-queue/:serviceName
 * Get current batch queue status for service
 */
router.get(
  '/batch-queue/:serviceName',
  [
    param('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    validation,
  ],
  async (req, res) => {
    // Batch queue status endpoint
    res.json({ message: 'Batch queue status endpoint - to be implemented' });
  }
);

/**
 * Webhook Coordination & Processing Routes
 */

/**
 * GET /api/external-services/webhook-coordination
 * Get webhook coordination statistics
 */
router.get(
  '/webhook-coordination',
  [
    query('timeframe')
      .optional()
      .isIn(['15m', '1h', '6h', '24h'])
      .withMessage('Invalid timeframe'),
    validation,
  ],
  externalServiceCoordinationController.getWebhookCoordination.bind(externalServiceCoordinationController)
);

/**
 * POST /api/external-services/webhook/:serviceName
 * Process webhook with coordination
 */
router.post(
  '/webhook/:serviceName',
  [
    rateLimit({ windowMs: 60000, max: 1000 }), // 1000 webhooks per minute
    param('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable'])
      .withMessage('Invalid service name'),
    // Note: Webhook validation happens in the controller
    validation,
  ],
  externalServiceCoordinationController.processWebhook.bind(externalServiceCoordinationController)
);

/**
 * GET /api/external-services/webhook-events
 * Get recent webhook events
 */
router.get(
  '/webhook-events',
  [
    query('serviceName')
      .optional()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable'])
      .withMessage('Invalid service name'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100'),
    query('eventType')
      .optional()
      .isString()
      .withMessage('Event type must be string'),
    validation,
  ],
  async (req, res) => {
    // Recent webhook events endpoint
    res.json({ message: 'Recent webhook events endpoint - to be implemented' });
  }
);

/**
 * Rate Limiting & Optimization Routes
 */

/**
 * GET /api/external-services/:serviceName/rate-limit
 * Get rate limit status for service
 */
router.get(
  '/:serviceName/rate-limit',
  [
    param('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    validation,
  ],
  externalServiceCoordinationController.getRateLimitStatus.bind(externalServiceCoordinationController)
);

/**
 * POST /api/external-services/check-rate-limit
 * Check if request is allowed under current rate limits
 */
router.post(
  '/check-rate-limit',
  [
    body('serviceName')
      .notEmpty()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    validation,
  ],
  async (req, res) => {
    // Rate limit check endpoint
    res.json({ message: 'Rate limit check endpoint - to be implemented' });
  }
);

/**
 * POST /api/external-services/trigger-optimization
 * Trigger cost optimization analysis
 */
router.post(
  '/trigger-optimization',
  [
    rateLimit({ windowMs: 300000, max: 10 }), // 10 requests per 5 minutes
    body('optimizationType')
      .optional()
      .isIn(['quick', 'standard', 'comprehensive', 'deep'])
      .withMessage('Invalid optimization type'),
    body('targetServices')
      .optional()
      .isArray()
      .withMessage('targetServices must be an array'),
    body('targetServices.*')
      .optional()
      .isIn(['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'])
      .withMessage('Invalid service name in targetServices'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Invalid priority'),
    validation,
  ],
  externalServiceCoordinationController.triggerOptimization.bind(externalServiceCoordinationController)
);

/**
 * Frontend Integration & Real-time Data Routes
 */

/**
 * GET /api/external-services/frontend-coordination
 * Get comprehensive Frontend coordination data
 */
router.get(
  '/frontend-coordination',
  [
    query('includeHistory')
      .optional()
      .isBoolean()
      .withMessage('includeHistory must be boolean'),
    validation,
  ],
  externalServiceCoordinationController.getFrontendCoordinationData.bind(externalServiceCoordinationController)
);

/**
 * GET /api/external-services/realtime-metrics
 * Get real-time metrics for WebSocket connections
 */
router.get(
  '/realtime-metrics',
  async (req, res) => {
    // Real-time metrics endpoint
    res.json({ message: 'Real-time metrics endpoint - to be implemented' });
  }
);

/**
 * POST /api/external-services/websocket-test
 * Test WebSocket connectivity and performance
 */
router.post(
  '/websocket-test',
  [
    body('testType')
      .optional()
      .isIn(['latency', 'throughput', 'connectivity'])
      .withMessage('Invalid test type'),
    validation,
  ],
  async (req, res) => {
    // WebSocket test endpoint
    res.json({ message: 'WebSocket test endpoint - to be implemented' });
  }
);

/**
 * Analytics & Reporting Routes
 */

/**
 * GET /api/external-services/analytics/performance
 * Get performance analytics across all services
 */
router.get(
  '/analytics/performance',
  [
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Invalid period'),
    query('metrics')
      .optional()
      .isArray()
      .withMessage('Metrics must be an array'),
    validation,
  ],
  async (req, res) => {
    // Performance analytics endpoint
    res.json({ message: 'Performance analytics endpoint - to be implemented' });
  }
);

/**
 * GET /api/external-services/analytics/cost-savings
 * Get detailed cost savings report
 */
router.get(
  '/analytics/cost-savings',
  [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'quarter'])
      .withMessage('Invalid period'),
    query('breakdown')
      .optional()
      .isBoolean()
      .withMessage('breakdown must be boolean'),
    validation,
  ],
  async (req, res) => {
    // Cost savings analytics endpoint
    res.json({ message: 'Cost savings analytics endpoint - to be implemented' });
  }
);

/**
 * Administrative Routes
 */

/**
 * POST /api/external-services/admin/reset-metrics
 * Reset performance metrics (admin only)
 */
router.post(
  '/admin/reset-metrics',
  [
    // Add admin role check middleware here
    body('confirm')
      .equals('RESET_METRICS')
      .withMessage('Confirmation required'),
    validation,
  ],
  async (req, res) => {
    // Admin metrics reset endpoint
    res.json({ message: 'Admin metrics reset endpoint - to be implemented' });
  }
);

/**
 * GET /api/external-services/admin/system-health
 * Get comprehensive system health (admin only)
 */
router.get(
  '/admin/system-health',
  async (req, res) => {
    // Admin system health endpoint
    res.json({ message: 'Admin system health endpoint - to be implemented' });
  }
);

/**
 * Error handling middleware
 */
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('External Service Coordination route error', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    message: 'External service coordination error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  });
});

export default router;