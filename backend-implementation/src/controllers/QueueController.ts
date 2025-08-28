/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - QUEUE CONTROLLER
 * ============================================================================
 *
 * RESTful API controller for queue management and job scheduling.
 * Provides endpoints for job creation, monitoring, and queue administration.
 *
 * Features:
 * - Job creation and scheduling
 * - Queue statistics and monitoring
 * - Queue administration (pause/resume/clean)
 * - Job status tracking
 * - Performance metrics
 * - Role-based access control
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import type { Request, Response, NextFunction } from 'express';
import { queueService } from '@/services/QueueService';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { logger } from '@/utils/logger';
import { AppError, ValidationError } from '@/middleware/errorHandler';
import Joi from 'joi';

/**
 * Validation schemas for queue operations
 */
const addJobSchema = Joi.object({
  queueName: Joi.string().required().valid(
    'route-optimization',
    'billing-generation', 
    'notifications',
    'data-sync',
    'maintenance',
    'external-api-coordination'
  ),
  jobName: Joi.string().required().min(1).max(100),
  data: Joi.object().required(),
  options: Joi.object({
    priority: Joi.number().integer().min(0).max(100).default(0),
    delay: Joi.number().integer().min(0).default(0),
    attempts: Joi.number().integer().min(1).max(10).default(3),
    removeOnComplete: Joi.number().integer().min(0).default(20),
    removeOnFail: Joi.number().integer().min(0).default(50),
  }).default({})
});

const scheduleRecurringJobSchema = Joi.object({
  queueName: Joi.string().required(),
  jobName: Joi.string().required().min(1).max(100),
  data: Joi.object().required(),
  cronExpression: Joi.string().required().pattern(/^(\*|[0-5]?\d)(\s+(\*|[0-1]?\d|2[0-3]))(\s+(\*|[1-2]?\d|3[01]))(\s+(\*|[1-9]|1[0-2]))(\s+(\*|[0-6]))$/),
  options: Joi.object().default({})
});

const routeOptimizationJobSchema = Joi.object({
  routeId: Joi.string().uuid().required(),
  organizationId: Joi.string().uuid().required(),
  constraints: Joi.object({
    maxDistance: Joi.number().positive(),
    maxDuration: Joi.number().positive(),
    vehicleCapacity: Joi.number().positive(),
    timeWindows: Joi.array().items(
      Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required()
      })
    )
  }).default({}),
  preferences: Joi.object({
    optimizeFor: Joi.string().valid('distance', 'time', 'fuel', 'balanced').default('balanced'),
    avoidTolls: Joi.boolean().default(false),
    avoidHighways: Joi.boolean().default(false)
  }).required(),
  priority: Joi.number().integer().min(0).max(100).default(10)
});

const billingJobSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  organizationId: Joi.string().uuid().required(),
  billingPeriod: Joi.object({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required()
  }).required(),
  services: Joi.array().items(
    Joi.object({
      serviceId: Joi.string().uuid().required(),
      quantity: Joi.number().positive().required(),
      unitPrice: Joi.number().positive().required()
    })
  ).min(1).required(),
  dueDate: Joi.string().isoDate().required(),
  priority: Joi.number().integer().min(0).max(100).default(5)
});

const notificationJobSchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  type: Joi.string().valid('email', 'sms', 'push', 'webhook').required(),
  channel: Joi.string().required(),
  template: Joi.string().required(),
  data: Joi.object().required(),
  priority: Joi.number().integer().min(0).max(100).default(5),
  scheduledAt: Joi.string().isoDate(),
  retryAttempts: Joi.number().integer().min(0).max(5).default(3)
});

const dataSyncJobSchema = Joi.object({
  source: Joi.string().valid('airtable', 'external_api', 'database').required(),
  target: Joi.string().valid('database', 'external_api').required(),
  entityType: Joi.string().required(),
  syncMode: Joi.string().valid('full', 'incremental', 'delta').default('incremental'),
  lastSyncTimestamp: Joi.string().isoDate(),
  filters: Joi.object().default({}),
  batchSize: Joi.number().integer().min(1).max(1000).default(100)
});

const maintenanceJobSchema = Joi.object({
  task: Joi.string().valid(
    'cleanup_logs',
    'optimize_database', 
    'backup_data',
    'update_analytics'
  ).required(),
  parameters: Joi.object().required(),
  scheduledAt: Joi.string().isoDate()
});

/**
 * Queue Controller Class
 */
export class QueueController {

  /**
   * Initialize queue service
   * POST /api/v1/queue/initialize
   */
  static async initialize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Queue initialization requested by user:', {
        userId: req.user?.id,
        userRole: req.user?.role
      });

      const result = await queueService.initialize();
      
      if (result.success) {
        res.json(ResponseHelper.success(res, { data: result.data, message: result?.message }));
      } else {
        ResponseHelper.error(res, { message: result?.message || 'Failed to initialize queues', statusCode: 500 });
      }
    } catch (error: unknown) {
      logger.error('Queue initialization failed:', error);
      next(new AppError('Failed to initialize queue service', 500));
    }
  }

  /**
   * Add job to queue
   * POST /api/v1/queue/jobs
   */
  static async addJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = addJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid job data', error.details));
      }

      const { queueName, jobName, data, options } = value;

      // Validate job-specific data based on queue type
      const validationResult = QueueController.validateJobData(queueName, data);
      if (!validationResult.success) {
        return next(new ValidationError('Invalid job data', validationResult.errors));
      }

      const result = await queueService.addJob(queueName, jobName, data, options);

      if (result.success) {
        logger.info('Job added successfully:', {
          jobId: result.data?.jobId,
          queueName,
          jobName,
          userId: req.user?.id
        });

        ResponseHelper.success(res, { data: result.data, message: result?.message, statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message || 'Failed to add job', statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Add job failed:', error);
      next(new AppError('Failed to add job to queue', 500));
    }
  }

  /**
   * Schedule recurring job
   * POST /api/v1/queue/jobs/recurring
   */
  static async scheduleRecurringJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = scheduleRecurringJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid recurring job data', error.details));
      }

      const { queueName, jobName, data, cronExpression, options } = value;

      const result = await queueService.scheduleRecurringJob(
        queueName, 
        jobName, 
        data, 
        cronExpression, 
        options
      );

      if (result.success) {
        logger.info('Recurring job scheduled successfully:', {
          queueName,
          jobName,
          cronExpression,
          userId: req.user?.id
        });

        ResponseHelper.success(res, { data: null, message: result?.message, statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message || 'Failed to schedule recurring job', statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Schedule recurring job failed:', error);
      next(new AppError('Failed to schedule recurring job', 500));
    }
  }

  /**
   * Create route optimization job
   * POST /api/v1/queue/route-optimization
   */
  static async createRouteOptimizationJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = routeOptimizationJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid route optimization job data', error.details));
      }

      const result = await queueService.addJob('route-optimization', 'optimize-route', value, {
        priority: value.priority
      });

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Route optimization job created', statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Create route optimization job failed:', error);
      next(new AppError('Failed to create route optimization job', 500));
    }
  }

  /**
   * Create billing job
   * POST /api/v1/queue/billing
   */
  static async createBillingJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = billingJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid billing job data', error.details));
      }

      const result = await queueService.addJob('billing-generation', 'generate-invoice', value, {
        priority: value.priority
      });

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Billing job created', statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Create billing job failed:', error);
      next(new AppError('Failed to create billing job', 500));
    }
  }

  /**
   * Create notification job
   * POST /api/v1/queue/notifications
   */
  static async createNotificationJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = notificationJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid notification job data', error.details));
      }

      const result = await queueService.addJob('notifications', 'send-notification', value, {
        priority: value.priority,
        delay: value.scheduledAt ? new Date(value.scheduledAt).getTime() - Date.now() : 0
      });

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Notification job created', statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Create notification job failed:', error);
      next(new AppError('Failed to create notification job', 500));
    }
  }

  /**
   * Create data sync job
   * POST /api/v1/queue/data-sync
   */
  static async createDataSyncJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = dataSyncJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid data sync job data', error.details));
      }

      const result = await queueService.addJob('data-sync', 'sync-data', value);

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Data sync job created', statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Create data sync job failed:', error);
      next(new AppError('Failed to create data sync job', 500));
    }
  }

  /**
   * Create maintenance job
   * POST /api/v1/queue/maintenance
   */
  static async createMaintenanceJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = maintenanceJobSchema.validate(req.body);
      if (error) {
        return next(new ValidationError('Invalid maintenance job data', error.details));
      }

      const result = await queueService.addJob('maintenance', 'maintenance-task', value, {
        delay: value.scheduledAt ? new Date(value.scheduledAt).getTime() - Date.now() : 0
      });

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Maintenance job created', statusCode: 201 });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 400 });
      }
    } catch (error: unknown) {
      logger.error('Create maintenance job failed:', error);
      next(new AppError('Failed to create maintenance job', 500));
    }
  }

  /**
   * Get queue statistics
   * GET /api/v1/queue/stats/:queueName?
   */
  static async getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queueName = req.params.queueName;
      
      const result = await queueService.getQueueStats(queueName);

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Queue statistics retrieved' });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 404 });
      }
    } catch (error: unknown) {
      logger.error('Get queue stats failed:', error);
      next(new AppError('Failed to get queue statistics', 500));
    }
  }

  /**
   * Get job details
   * GET /api/v1/queue/:queueName/jobs/:jobId
   */
  static async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queueName, jobId } = req.params;

      if (!queueName || !jobId) {
        return next(new ValidationError('Queue name and job ID are required'));
      }

      const result = await queueService.getJob(queueName, jobId);

      if (result.success) {
        ResponseHelper.success(res, { data: result.data, message: 'Job details retrieved' });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 404 });
      }
    } catch (error: unknown) {
      logger.error('Get job failed:', error);
      next(new AppError('Failed to get job details', 500));
    }
  }

  /**
   * Pause queue
   * POST /api/v1/queue/:queueName/pause
   */
  static async pauseQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        return next(new ValidationError('Queue name is required'));
      }

      const result = await queueService.pauseQueue(queueName);

      if (result.success) {
        logger.info(`Queue '${queueName}' paused by user:`, {
          userId: req.user?.id,
          userRole: req.user?.role
        });

        ResponseHelper.success(res, { data: null, message: result?.message });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 404 });
      }
    } catch (error: unknown) {
      logger.error('Pause queue failed:', error);
      next(new AppError('Failed to pause queue', 500));
    }
  }

  /**
   * Resume queue
   * POST /api/v1/queue/:queueName/resume
   */
  static async resumeQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        return next(new ValidationError('Queue name is required'));
      }

      const result = await queueService.resumeQueue(queueName);

      if (result.success) {
        logger.info(`Queue '${queueName}' resumed by user:`, {
          userId: req.user?.id,
          userRole: req.user?.role
        });

        ResponseHelper.success(res, { data: null, message: result?.message });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 404 });
      }
    } catch (error: unknown) {
      logger.error('Resume queue failed:', error);
      next(new AppError('Failed to resume queue', 500));
    }
  }

  /**
   * Clean queue
   * POST /api/v1/queue/:queueName/clean
   */
  static async cleanQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queueName } = req.params;
      const { graceMs = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours

      if (!queueName) {
        return next(new ValidationError('Queue name is required'));
      }

      const result = await queueService.cleanQueue(queueName, graceMs);

      if (result.success) {
        logger.info(`Queue '${queueName}' cleaned by user:`, {
          userId: req.user?.id,
          userRole: req.user?.role,
          graceMs
        });

        ResponseHelper.success(res, { data: null, message: result?.message });
      } else {
        ResponseHelper.error(res, { message: result?.message, statusCode: 404 });
      }
    } catch (error: unknown) {
      logger.error('Clean queue failed:', error);
      next(new AppError('Failed to clean queue', 500));
    }
  }

  /**
   * Get queue service status
   * GET /api/v1/queue/status
   */
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isInitialized = queueService.isQueueServiceInitialized();
      const queueNames = queueService.getQueueNames();
      const queueCount = queueService.getQueueCount();

      ResponseHelper.success(res, {
        data: {
          initialized: isInitialized,
          queueCount,
          queueNames,
          version: '2.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        message: 'Queue service status retrieved'
      });

    } catch (error: unknown) {
      logger.error('Get queue status failed:', error);
      next(new AppError('Failed to get queue service status', 500));
    }
  }

  /**
   * Validate job-specific data based on queue type
   */
  private static validateJobData(queueName: string, data: any): { success: boolean; errors?: any[] } {
    try {
      let schema;

      switch (queueName) {
        case 'route-optimization':
          schema = routeOptimizationJobSchema.fork(['priority'], (s) => s.forbidden());
          break;
        case 'billing-generation':
          schema = billingJobSchema.fork(['priority'], (s) => s.forbidden());
          break;
        case 'notifications':
          schema = notificationJobSchema.fork(['priority'], (s) => s.forbidden());
          break;
        case 'data-sync':
          schema = dataSyncJobSchema;
          break;
        case 'maintenance':
          schema = maintenanceJobSchema;
          break;
        default:
          // For external-api-coordination and other queues, allow flexible data structure
          return { success: true };
      }

      const { error } = schema.validate(data);
      if (error) {
        return { success: false, errors: error.details };
      }

      return { success: true };
    } catch (error: unknown) {
      return { success: false, errors: [{ message: 'Job data validation failed' }] };
    }
  }
}

export default QueueController;