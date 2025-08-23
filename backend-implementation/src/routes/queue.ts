/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - QUEUE ROUTES
 * ============================================================================
 *
 * RESTful routes for queue management and job scheduling.
 * Provides comprehensive endpoints for background job processing.
 *
 * Features:
 * - Job creation and management
 * - Queue administration
 * - Performance monitoring
 * - Role-based access control
 * - Request validation and rate limiting
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import { Router } from 'express';
import { QueueController } from '@/controllers/QueueController';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Rate limiting configurations for different operations
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests to queue API',
});

const jobCreationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 job creations per minute
  message: 'Too many job creation requests',
});

const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin operations per window
  message: 'Too many admin operations',
});

/**
 * Middleware to log queue API requests
 */
const logQueueRequest = (req, res, next) => {
  logger.info('Queue API request:', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userRole: req.user?.role,
    params: req.params,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
};

/**
 * Apply common middleware to all routes
 */
router.use(authMiddleware);
router.use(generalRateLimit);
router.use(logQueueRequest);

/**
 * ============================================================================
 * QUEUE SERVICE MANAGEMENT
 * ============================================================================
 */

/**
 * Initialize queue service
 * POST /queue/initialize
 * 
 * @access Admin only
 * @description Initialize the queue service and all queues
 */
router.post(
  '/initialize',
  requireRole(['admin']),
  adminRateLimit,
  QueueController.initialize
);

/**
 * Get queue service status
 * GET /queue/status
 * 
 * @access Admin, Dispatcher, Manager
 * @description Get overall queue service status and health
 */
router.get(
  '/status',
  requireRole(['admin', 'dispatcher', 'manager']),
  QueueController.getStatus
);

/**
 * ============================================================================
 * JOB MANAGEMENT
 * ============================================================================
 */

/**
 * Add generic job to queue
 * POST /queue/jobs
 * 
 * @access Admin, Manager, Dispatcher (limited)
 * @description Add a job to any queue with specified data and options
 */
router.post(
  '/jobs',
  requireRole(['admin', 'manager', 'dispatcher']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.addJob
);

/**
 * Schedule recurring job
 * POST /queue/jobs/recurring
 * 
 * @access Admin only
 * @description Schedule a recurring job with cron expression
 */
router.post(
  '/jobs/recurring',
  requireRole(['admin']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.scheduleRecurringJob
);

/**
 * Get job details
 * GET /queue/:queueName/jobs/:jobId
 * 
 * @access Admin, Manager, Dispatcher
 * @description Get detailed information about a specific job
 */
router.get(
  '/:queueName/jobs/:jobId',
  requireRole(['admin', 'manager', 'dispatcher']),
  QueueController.getJob
);

/**
 * ============================================================================
 * BUSINESS-SPECIFIC JOB CREATION
 * ============================================================================
 */

/**
 * Create route optimization job
 * POST /queue/route-optimization
 * 
 * @access Admin, Manager, Dispatcher
 * @description Create a job to optimize route planning
 */
router.post(
  '/route-optimization',
  requireRole(['admin', 'manager', 'dispatcher']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.createRouteOptimizationJob
);

/**
 * Create billing job
 * POST /queue/billing
 * 
 * @access Admin, Manager
 * @description Create a job to generate customer billing/invoices
 */
router.post(
  '/billing',
  requireRole(['admin', 'manager']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.createBillingJob
);

/**
 * Create notification job
 * POST /queue/notifications
 * 
 * @access Admin, Manager, Dispatcher
 * @description Create a job to send notifications (email, SMS, push)
 */
router.post(
  '/notifications',
  requireRole(['admin', 'manager', 'dispatcher']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.createNotificationJob
);

/**
 * Create data synchronization job
 * POST /queue/data-sync
 * 
 * @access Admin, Manager
 * @description Create a job to synchronize data between systems
 */
router.post(
  '/data-sync',
  requireRole(['admin', 'manager']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.createDataSyncJob
);

/**
 * Create maintenance job
 * POST /queue/maintenance
 * 
 * @access Admin only
 * @description Create a maintenance job (cleanup, optimization, backup)
 */
router.post(
  '/maintenance',
  requireRole(['admin']),
  jobCreationRateLimit,
  validateRequest(['body']),
  QueueController.createMaintenanceJob
);

/**
 * ============================================================================
 * QUEUE STATISTICS AND MONITORING
 * ============================================================================
 */

/**
 * Get all queue statistics
 * GET /queue/stats
 * 
 * @access Admin, Manager, Dispatcher
 * @description Get statistics for all queues
 */
router.get(
  '/stats',
  requireRole(['admin', 'manager', 'dispatcher']),
  QueueController.getQueueStats
);

/**
 * Get specific queue statistics
 * GET /queue/stats/:queueName
 * 
 * @access Admin, Manager, Dispatcher
 * @description Get statistics for a specific queue
 */
router.get(
  '/stats/:queueName',
  requireRole(['admin', 'manager', 'dispatcher']),
  QueueController.getQueueStats
);

/**
 * ============================================================================
 * QUEUE ADMINISTRATION
 * ============================================================================
 */

/**
 * Pause queue processing
 * POST /queue/:queueName/pause
 * 
 * @access Admin only
 * @description Pause processing for a specific queue
 */
router.post(
  '/:queueName/pause',
  requireRole(['admin']),
  adminRateLimit,
  QueueController.pauseQueue
);

/**
 * Resume queue processing
 * POST /queue/:queueName/resume
 * 
 * @access Admin only
 * @description Resume processing for a specific queue
 */
router.post(
  '/:queueName/resume',
  requireRole(['admin']),
  adminRateLimit,
  QueueController.resumeQueue
);

/**
 * Clean queue
 * POST /queue/:queueName/clean
 * 
 * @access Admin only
 * @description Clean completed and failed jobs from queue
 */
router.post(
  '/:queueName/clean',
  requireRole(['admin']),
  adminRateLimit,
  validateRequest(['body']),
  QueueController.cleanQueue
);

/**
 * ============================================================================
 * QUEUE HEALTH AND DEBUG ENDPOINTS
 * ============================================================================
 */

/**
 * Get queue health check
 * GET /queue/health
 * 
 * @access Admin, Manager, Dispatcher
 * @description Basic health check for queue service
 */
router.get('/health', requireRole(['admin', 'manager', 'dispatcher']), (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'queue-service',
      version: '2.0.0',
      initialized: require('@/services/QueueService').queueService.isQueueServiceInitialized(),
      queues: require('@/services/QueueService').queueService.getQueueNames(),
    };
    
    res.json({
      success: true,
      data: health,
      message: 'Queue service health check passed'
    });
  } catch (error: unknown) {
    logger.error('Queue health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Queue service health check failed',
      error: error instanceof Error ? error?.message : String(error)
    });
  }
});

/**
 * Error handling middleware for queue routes
 */
router.use((error, req, res, next) => {
  logger.error('Queue route error:', {
    error: error instanceof Error ? error?.message : String(error),
    stack: error instanceof Error ? error?.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error?.details || [{ message: error instanceof Error ? error?.message : String(error) }]
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error instanceof Error ? error?.message : String(error)
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error in queue service'
  });
});

export default router;