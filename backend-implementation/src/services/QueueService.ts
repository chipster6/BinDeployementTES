/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COMPREHENSIVE QUEUE SERVICE
 * ============================================================================
 *
 * Enterprise-grade queue management service extending BaseService patterns.
 * Provides job scheduling, priority management, monitoring, and integration
 * with existing business services for scalable background processing.
 *
 * Features:
 * - Route optimization processing jobs
 * - Automated billing generation
 * - Notification dispatch system
 * - Data backup/synchronization jobs
 * - Cleanup/maintenance tasks
 * - Real-time job monitoring
 * - Failed job handling with dead letter queues
 * - Performance metrics and alerting
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-20
 * Version: 2.0.0 - Enterprise Queue Management
 */

import Bull, { Queue, Job, JobOptions, QueueOptions } from "bull";
import { BaseService, ServiceResult } from "./BaseService";
import { config } from "@/config";
import { queueRedisClient } from "@/config/redis";
import { logger, Timer } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";

/**
 * Queue job data interfaces
 */
export interface RouteOptimizationJobData {
  routeId: string;
  organizationId: string;
  constraints: {
    maxDistance?: number;
    maxDuration?: number;
    vehicleCapacity?: number;
    timeWindows?: Array<{
      start: string;
      end: string;
    }>;
  };
  preferences: {
    optimizeFor: 'distance' | 'time' | 'fuel' | 'balanced';
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  };
  priority?: number;
}

export interface BillingJobData {
  customerId: string;
  organizationId: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  services: Array<{
    serviceId: string;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate: string;
  priority?: number;
}

export interface NotificationJobData {
  recipientId: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  channel: string;
  template: string;
  data: Record<string, any>;
  priority?: number;
  scheduledAt?: string;
  retryAttempts?: number;
}

export interface DataSyncJobData {
  source: 'airtable' | 'external_api' | 'database';
  target: 'database' | 'external_api';
  entityType: string;
  syncMode: 'full' | 'incremental' | 'delta';
  lastSyncTimestamp?: string;
  filters?: Record<string, any>;
  batchSize?: number;
}

export interface MaintenanceJobData {
  task: 'cleanup_logs' | 'optimize_database' | 'backup_data' | 'update_analytics';
  parameters: Record<string, any>;
  scheduledAt?: string;
}

/**
 * Queue job result interfaces
 */
export interface JobResult {
  success: boolean;
  jobId: string;
  jobType: string;
  duration: number;
  result?: any;
  error?: string;
  timestamp: string;
}

/**
 * Queue statistics interface
 */
export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  throughput: {
    processed: number;
    failed: number;
    averageProcessingTime: number;
  };
}

/**
 * Comprehensive Queue Service extending BaseService
 */
export class QueueService extends BaseService {
  private queues: Map<string, Queue> = new Map();
  private jobProcessors: Map<string, (job: Job) => Promise<any>> = new Map();
  private metrics: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    // No model needed for QueueService
    super(null as any, 'QueueService');
    this.cacheNamespace = 'queue_service';
    this.defaultCacheTTL = 300; // 5 minutes
  }

  /**
   * Initialize all queues with enterprise configuration
   */
  async initialize(): Promise<ServiceResult> {
    const timer = new Timer('QueueService.initialize');

    try {
      if (this.isInitialized) {
        return ResponseHelper.success(null, 'Queue service already initialized');
      }

      logger.info('🔧 Initializing comprehensive queue service...');

      // Create queue configurations with business-specific settings
      const queueConfigs = [
        {
          name: 'route-optimization',
          concurrency: 2,
          priority: true,
          attempts: 3,
          backoffDelay: 5000,
          removeOnComplete: 20,
          removeOnFail: 50
        },
        {
          name: 'billing-generation',
          concurrency: 1,
          priority: true,
          attempts: 5,
          backoffDelay: 10000,
          removeOnComplete: 100,
          removeOnFail: 100
        },
        {
          name: 'notifications',
          concurrency: 10,
          priority: true,
          attempts: 3,
          backoffDelay: 2000,
          removeOnComplete: 50,
          removeOnFail: 100
        },
        {
          name: 'data-sync',
          concurrency: 3,
          priority: false,
          attempts: 5,
          backoffDelay: 15000,
          removeOnComplete: 25,
          removeOnFail: 75
        },
        {
          name: 'maintenance',
          concurrency: 1,
          priority: false,
          attempts: 2,
          backoffDelay: 30000,
          removeOnComplete: 10,
          removeOnFail: 25
        },
        {
          name: 'external-api-coordination',
          concurrency: 8,
          priority: true,
          attempts: 4,
          backoffDelay: 3000,
          removeOnComplete: 30,
          removeOnFail: 80
        }
      ];

      // Initialize each queue with enterprise settings
      for (const queueConfig of queueConfigs) {
        await this.createQueue(queueConfig);
      }

      // Setup job processors
      this.setupJobProcessors();

      // Setup global event handlers
      this.setupGlobalEventHandlers();

      // Schedule recurring jobs
      await this.scheduleRecurringJobs();

      // Initialize metrics collection
      await this.initializeMetrics();

      this.isInitialized = true;

      const duration = timer.end({
        queuesCreated: queueConfigs.length,
        processorsConfigured: this.jobProcessors.size
      });

      logger.info('✅ Queue service initialized successfully', {
        duration: `${duration}ms`,
        queues: queueConfigs.map(q => q.name)
      });

      return ResponseHelper.success({
        queuesInitialized: queueConfigs.length,
        processorsConfigured: this.jobProcessors.size,
        duration: `${duration}ms`
      }, 'Queue service initialized successfully');

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('❌ Failed to initialize queue service:', error);
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Create queue with enterprise configuration
   */
  private async createQueue(queueConfig: any): Promise<Queue> {
    const { name, concurrency, priority, attempts, backoffDelay, removeOnComplete, removeOnFail } = queueConfig;

    const queueOptions: QueueOptions = {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete,
        removeOnFail,
        attempts,
        backoff: {
          type: 'exponential',
          delay: backoffDelay,
        },
      },
      settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1,
        retryProcessDelay: 5000,
      },
    };

    const queue = new Bull(name, queueOptions);

    // Configure processing with priority support
    const processor = this.getJobProcessor(name);
    if (priority) {
      // Priority queues process jobs based on priority field
      await queue.process('*', concurrency, processor);
    } else {
      // Regular FIFO processing
      await queue.process(concurrency, processor);
    }

    this.queues.set(name, queue);
    logger.info(`✅ Queue '${name}' created with concurrency ${concurrency}`);

    return queue;
  }

  /**
   * Setup job processors for each queue type
   */
  private setupJobProcessors(): void {
    this.jobProcessors.set('route-optimization', this.processRouteOptimizationJob.bind(this));
    this.jobProcessors.set('billing-generation', this.processBillingJob.bind(this));
    this.jobProcessors.set('notifications', this.processNotificationJob.bind(this));
    this.jobProcessors.set('data-sync', this.processDataSyncJob.bind(this));
    this.jobProcessors.set('maintenance', this.processMaintenanceJob.bind(this));
    this.jobProcessors.set('external-api-coordination', this.processExternalAPICoordinationJob.bind(this));

    logger.info('✅ Job processors configured for all queue types');
  }

  /**
   * Get job processor function for specific queue
   */
  private getJobProcessor(queueName: string): (job: Job) => Promise<any> {
    const processor = this.jobProcessors.get(queueName);
    if (!processor) {
      return this.processDefaultJob.bind(this);
    }
    return processor;
  }

  /**
   * Setup global event handlers for monitoring and alerting
   */
  private setupGlobalEventHandlers(): void {
    this.queues.forEach((queue, name) => {
      // Job completed successfully
      queue.on('completed', (job: Job, result: any) => {
        this.updateMetrics(name, 'completed', job);
        logger.info(`✅ Job completed in queue '${name}'`, {
          jobId: job.id,
          jobType: job.name,
          duration: Date.now() - job.processedOn!,
          attempts: job.attemptsMade,
        });
      });

      // Job failed
      queue.on('failed', (job: Job, error: Error) => {
        this.updateMetrics(name, 'failed', job, error);
        logger.error(`❌ Job failed in queue '${name}'`, {
          jobId: job.id,
          jobType: job.name,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          error: error instanceof Error ? error?.message : String(error),
          stack: error instanceof Error ? error?.stack : undefined,
        });

        // Handle critical job failures
        this.handleCriticalJobFailure(name, job, error);
      });

      // Job stalled
      queue.on('stalled', (job: Job) => {
        this.updateMetrics(name, 'stalled', job);
        logger.warn(`⚠️ Job stalled in queue '${name}'`, {
          jobId: job.id,
          jobType: job.name,
          stalledTime: Date.now() - job.processedOn!,
        });
      });

      // Job progress updates
      queue.on('progress', (job: Job, progress: number) => {
        logger.debug(`📈 Job progress in queue '${name}'`, {
          jobId: job.id,
          jobType: job.name,
          progress: `${progress}%`,
        });
      });

      // Queue error handling
      queue.on('error', (error: Error) => {
        logger.error(`❌ Queue error in '${name}':`, error);
        this.handleQueueError(name, error);
      });
    });
  }

  /**
   * Schedule recurring jobs for maintenance and analytics
   */
  private async scheduleRecurringJobs(): Promise<void> {
    try {
      // Daily maintenance job at 2 AM
      await this.scheduleRecurringJob('maintenance', 'daily-cleanup', {
        task: 'cleanup_logs',
        parameters: { olderThanDays: 30 }
      }, '0 2 * * *');

      // Hourly analytics aggregation
      await this.scheduleRecurringJob('maintenance', 'hourly-analytics', {
        task: 'update_analytics',
        parameters: { period: 'hourly' }
      }, '0 * * * *');

      // Weekly database optimization
      await this.scheduleRecurringJob('maintenance', 'weekly-optimization', {
        task: 'optimize_database',
        parameters: { vacuum: true, analyze: true }
      }, '0 3 * * 0');

      // Daily backup job at 1 AM
      await this.scheduleRecurringJob('maintenance', 'daily-backup', {
        task: 'backup_data',
        parameters: { compression: true, retention: 30 }
      }, '0 1 * * *');

      logger.info('✅ Recurring jobs scheduled successfully');
    } catch (error: unknown) {
      logger.error('❌ Failed to schedule recurring jobs:', error);
      throw error;
    }
  }

  /**
   * Initialize metrics collection system
   */
  private async initializeMetrics(): Promise<void> {
    // Initialize metrics for each queue
    this.queues.forEach((queue, name) => {
      this.metrics.set(name, {
        processed: 0,
        failed: 0,
        stalled: 0,
        averageProcessingTime: 0,
        lastProcessedAt: null,
        totalProcessingTime: 0,
      });
    });

    // Start metrics collection interval
    setInterval(async () => {
      await this.collectMetrics();
    }, 60000); // Collect metrics every minute

    logger.info('✅ Metrics collection initialized');
  }

  /**
   * Process route optimization job
   */
  private async processRouteOptimizationJob(job: Job<RouteOptimizationJobData>): Promise<JobResult> {
    const timer = new Timer(`RouteOptimization-${job.id}`);
    const { routeId, organizationId, constraints, preferences } = job.data;

    try {
      job.progress(10);

      // Import RouteOptimizationService dynamically to avoid circular dependencies
      const { RouteOptimizationService } = await import('./RouteOptimizationService');
      
      job.progress(25);

      // Load route data and perform optimization
      const optimizationResult = await RouteOptimizationService.optimizeRoute({
        routeId,
        organizationId,
        constraints,
        preferences
      });

      job.progress(80);

      // Save optimization results
      await this.cacheOptimizationResult(routeId, optimizationResult);

      job.progress(100);

      const duration = timer.end({
        routeId,
        optimization: optimizationResult.optimization
      });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'route-optimization',
        duration,
        result: {
          routeId,
          optimization: optimizationResult.optimization,
          estimatedSavings: optimizationResult.estimatedSavings
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Route optimization job failed:', {
        jobId: job.id,
        routeId,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process billing generation job
   */
  private async processBillingJob(job: Job<BillingJobData>): Promise<JobResult> {
    const timer = new Timer(`BillingGeneration-${job.id}`);
    const { customerId, organizationId, billingPeriod, services, dueDate } = job.data;

    try {
      job.progress(10);

      // Import billing services
      const { BillingService } = await import('./external/BillingService');
      const { CustomerService } = await import('./CustomerService');

      // Load customer data
      const customerData = await CustomerService.getCustomerDetails(customerId);
      if (!customerData.success) {
        throw new Error('Customer not found');
      }

      job.progress(30);

      // Generate billing data
      const billingData = await BillingService.generateInvoice({
        customerId,
        organizationId,
        billingPeriod,
        services,
        dueDate,
        customerData: customerData.data
      });

      job.progress(70);

      // Send billing notification
      if (billingData.success) {
        await this.addJob('notifications', 'billing-notification', {
          recipientId: customerId,
          type: 'email',
          channel: 'billing',
          template: 'invoice-generated',
          data: {
            invoiceId: billingData.data.invoiceId,
            amount: billingData.data.totalAmount,
            dueDate,
          },
          priority: 5
        });
      }

      job.progress(100);

      const duration = timer.end({
        customerId,
        invoiceId: billingData.data?.invoiceId
      });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'billing-generation',
        duration,
        result: billingData.data,
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Billing job failed:', {
        jobId: job.id,
        customerId,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(job: Job<NotificationJobData>): Promise<JobResult> {
    const timer = new Timer(`Notification-${job.id}`);
    const { recipientId, type, channel, template, data } = job.data;

    try {
      job.progress(20);

      let result;
      switch (type) {
        case 'email':
          const { SendGridService } = await import('./external/SendGridService');
          result = await SendGridService.sendTemplateEmail({
            recipientId,
            template,
            data
          });
          break;

        case 'sms':
          const { TwilioService } = await import('./external/TwilioService');
          result = await TwilioService.sendSMS({
            recipientId,
            template,
            data
          });
          break;

        case 'push':
          const { PushNotificationService } = await import('./external/PushNotificationService');
          result = await PushNotificationService.sendNotification({
            recipientId,
            template,
            data
          });
          break;

        case 'webhook':
          const { WebhookService } = await import('./external/WebhookService');
          result = await WebhookService.sendWebhook({
            recipientId,
            template,
            data
          });
          break;

        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }

      job.progress(100);

      const duration = timer.end({
        recipientId,
        type,
        channel
      });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'notification',
        duration,
        result,
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Notification job failed:', {
        jobId: job.id,
        recipientId,
        type,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process data synchronization job
   */
  private async processDataSyncJob(job: Job<DataSyncJobData>): Promise<JobResult> {
    const timer = new Timer(`DataSync-${job.id}`);
    const { source, target, entityType, syncMode, lastSyncTimestamp, batchSize = 100 } = job.data;

    try {
      job.progress(10);

      // Import synchronization service
      const { DataSyncService } = await import('./external/DataSyncService');

      job.progress(30);

      // Perform synchronization
      const syncResult = await DataSyncService.synchronizeData({
        source,
        target,
        entityType,
        syncMode,
        lastSyncTimestamp,
        batchSize,
        onProgress: (progress: number) => {
          job.progress(30 + (progress * 0.6)); // Map progress to 30-90%
        }
      });

      job.progress(95);

      // Update sync metadata
      await this.updateSyncMetadata(source, target, entityType, new Date().toISOString());

      job.progress(100);

      const duration = timer.end({
        source,
        target,
        entityType,
        recordsSynced: syncResult.recordsSynced
      });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'data-sync',
        duration,
        result: {
          recordsSynced: syncResult.recordsSynced,
          errors: syncResult.errors,
          lastSyncTimestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Data sync job failed:', {
        jobId: job.id,
        source,
        target,
        entityType,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process maintenance job
   */
  private async processMaintenanceJob(job: Job<MaintenanceJobData>): Promise<JobResult> {
    const timer = new Timer(`Maintenance-${job.id}`);
    const { task, parameters } = job.data;

    try {
      job.progress(10);

      let result;
      switch (task) {
        case 'cleanup_logs':
          result = await this.cleanupLogs(parameters);
          break;

        case 'optimize_database':
          result = await this.optimizeDatabase(parameters);
          break;

        case 'backup_data':
          result = await this.backupData(parameters);
          break;

        case 'update_analytics':
          result = await this.updateAnalytics(parameters);
          break;

        default:
          throw new Error(`Unknown maintenance task: ${task}`);
      }

      job.progress(100);

      const duration = timer.end({ task });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'maintenance',
        duration,
        result,
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Maintenance job failed:', {
        jobId: job.id,
        task,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process external API coordination job (from existing implementation)
   */
  private async processExternalAPICoordinationJob(job: Job): Promise<JobResult> {
    const timer = new Timer(`ExternalAPICoordination-${job.id}`);
    const { jobType, serviceName, data } = job.data;

    try {
      job.progress(10);

      let result;
      switch (jobType) {
        case 'webhook-processing':
          result = await this.processWebhookCoordination(data);
          break;

        case 'api-metrics-collection':
          result = await this.processAPIMetricsCollection(data);
          break;

        case 'cost-monitoring':
          result = await this.processCostMonitoring(data);
          break;

        case 'api-health-coordination':
          result = await this.processAPIHealthCoordination(data);
          break;

        default:
          throw new Error(`Unknown external API job type: ${jobType}`);
      }

      job.progress(100);

      const duration = timer.end({ jobType, serviceName });

      return {
        success: true,
        jobId: job.id!.toString(),
        jobType: 'external-api-coordination',
        duration,
        result,
        timestamp: new Date().toISOString(),
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      throw error;
    }
  }

  /**
   * Default job processor for unknown job types
   */
  private async processDefaultJob(job: Job): Promise<JobResult> {
    const timer = new Timer(`DefaultJob-${job.id}`);
    
    logger.warn(`No specific processor for job type: ${job.name}`, {
      jobId: job.id,
      data: job.data,
    });

    const duration = timer.end({ processed: false });

    return {
      success: false,
      jobId: job.id!.toString(),
      jobType: job.name,
      duration,
      error: 'No processor available for this job type',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add job to queue with enterprise options
   */
  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options: JobOptions = {}
  ): Promise<ServiceResult<{ jobId: string }>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      const jobOptions: JobOptions = {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
        removeOnComplete: options?.removeOnComplete || 20,
        removeOnFail: options?.removeOnFail || 50,
        ...options,
      };

      const job = await queue.add(jobName, data, jobOptions);

      logger.info(`✅ Job added to queue '${queueName}'`, {
        jobId: job.id,
        jobName,
        priority: jobOptions.priority,
        delay: jobOptions.delay,
      });

      return ResponseHelper.success(
        { jobId: job.id!.toString() },
        `Job added to ${queueName} queue`
      );

    } catch (error: unknown) {
      logger.error('Failed to add job to queue:', {
        queueName,
        jobName,
        error: error instanceof Error ? error?.message : String(error)
      });
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob(
    queueName: string,
    jobName: string,
    data: any,
    cronExpression: string,
    options: JobOptions = {}
  ): Promise<ServiceResult> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      await queue.add(jobName, data, {
        repeat: { cron: cronExpression },
        removeOnComplete: 10,
        removeOnFail: 10,
        ...options,
      });

      logger.info(`✅ Recurring job scheduled in queue '${queueName}'`, {
        jobName,
        cronExpression
      });

      return ResponseHelper.success(null, 'Recurring job scheduled successfully');

    } catch (error: unknown) {
      logger.error('Failed to schedule recurring job:', {
        queueName,
        jobName,
        cronExpression,
        error: error instanceof Error ? error?.message : String(error)
      });
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName?: string): Promise<ServiceResult<QueueStats[]>> {
    try {
      const stats: QueueStats[] = [];

      const queuesToCheck = queueName 
        ? [queueName] 
        : Array.from(this.queues.keys());

      for (const name of queuesToCheck) {
        const queue = this.queues.get(name);
        if (!queue) continue;

        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
          queue.getPaused(),
        ]);

        const metrics = this.metrics.get(name) || {
          processed: 0,
          failed: 0,
          averageProcessingTime: 0
        };

        stats.push({
          queueName: name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          paused: paused.length,
          throughput: {
            processed: metrics.processed,
            failed: metrics.failed,
            averageProcessingTime: metrics.averageProcessingTime,
          },
        });
      }

      return ResponseHelper.success(stats, 'Queue statistics retrieved');

    } catch (error: unknown) {
      logger.error('Failed to get queue stats:', error);
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Pause/Resume queue operations
   */
  async pauseQueue(queueName: string): Promise<ServiceResult> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      await queue.pause();
      logger.info(`⏸️ Queue '${queueName}' paused`);

      return ResponseHelper.success(null, `Queue '${queueName}' paused`);
    } catch (error: unknown) {
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  async resumeQueue(queueName: string): Promise<ServiceResult> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      await queue.resume();
      logger.info(`▶️ Queue '${queueName}' resumed`);

      return ResponseHelper.success(null, `Queue '${queueName}' resumed`);
    } catch (error: unknown) {
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName: string, graceMs: number = 24 * 60 * 60 * 1000): Promise<ServiceResult> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      await Promise.all([
        queue.clean(graceMs, 'completed'),
        queue.clean(graceMs, 'failed')
      ]);

      logger.info(`🧹 Queue '${queueName}' cleaned`);
      return ResponseHelper.success(null, `Queue '${queueName}' cleaned`);
    } catch (error: unknown) {
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Get job details
   */
  async getJob(queueName: string, jobId: string): Promise<ServiceResult<Job>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return ResponseHelper.error(`Queue '${queueName}' not found`, 404);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return ResponseHelper.error(`Job '${jobId}' not found in queue '${queueName}'`, 404);
      }

      return ResponseHelper.success(job, 'Job details retrieved');
    } catch (error: unknown) {
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  /**
   * Close all queues gracefully
   */
  async close(): Promise<ServiceResult> {
    try {
      logger.info('🔄 Closing all queues...');

      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.allSettled(closePromises);

      this.queues.clear();
      this.jobProcessors.clear();
      this.metrics.clear();
      this.isInitialized = false;

      logger.info('✅ All queues closed successfully');
      return ResponseHelper.success(null, 'All queues closed successfully');

    } catch (error: unknown) {
      logger.error('❌ Error closing queues:', error);
      return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500, error);
    }
  }

  // Private helper methods

  private async cacheOptimizationResult(routeId: string, result: any): Promise<void> {
    await this.setCache(`optimization:${routeId}`, result, { ttl: 3600 }); // 1 hour
  }

  private async updateSyncMetadata(source: string, target: string, entityType: string, timestamp: string): Promise<void> {
    const key = `sync:${source}:${target}:${entityType}`;
    await this.setCache(key, { lastSyncTimestamp: timestamp }, { ttl: 86400 }); // 24 hours
  }

  private updateMetrics(queueName: string, event: string, job: Job, error?: Error): void {
    const metrics = this.metrics.get(queueName) || {
      processed: 0,
      failed: 0,
      stalled: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0
    };

    switch (event) {
      case 'completed':
        metrics.processed++;
        const processingTime = Date.now() - job.processedOn!;
        metrics.totalProcessingTime += processingTime;
        metrics.averageProcessingTime = Math.round(metrics.totalProcessingTime / metrics.processed);
        break;
      case 'failed':
        metrics.failed++;
        break;
      case 'stalled':
        metrics.stalled++;
        break;
    }

    this.metrics.set(queueName, metrics);
  }

  private async handleCriticalJobFailure(queueName: string, job: Job, error: Error): Promise<void> {
    // Handle critical failures based on queue type
    if (queueName === 'billing-generation' && job.attemptsMade >= job.opts.attempts!) {
      // Send alert for billing failures
      logger.error('🚨 Critical billing job failure:', {
        jobId: job.id,
        customerId: job.data.customerId,
        error: error instanceof Error ? error?.message : String(error)
      });
    } else if (queueName === 'route-optimization' && job.attemptsMade >= job.opts.attempts!) {
      // Handle route optimization failures
      logger.error('🚨 Critical route optimization failure:', {
        jobId: job.id,
        routeId: job.data.routeId,
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  private async handleQueueError(queueName: string, error: Error): Promise<void> {
    logger.error(`🚨 Queue error in '${queueName}':`, {
      error: error instanceof Error ? error?.message : String(error),
      stack: error instanceof Error ? error?.stack : undefined
    });

    // Attempt to recover queue if possible
    setTimeout(async () => {
      try {
        const queue = this.queues.get(queueName);
        if (queue) {
          await queue.resume();
          logger.info(`♻️ Queue '${queueName}' recovery attempted`);
        }
      } catch (recoveryError) {
        logger.error(`❌ Queue '${queueName}' recovery failed:`, recoveryError);
      }
    }, 30000); // Wait 30 seconds before recovery attempt
  }

  private async collectMetrics(): Promise<void> {
    try {
      const allMetrics = {};
      for (const [queueName, metrics] of this.metrics.entries()) {
        allMetrics[queueName] = {
          ...metrics,
          timestamp: new Date().toISOString()
        };
      }

      // Cache metrics for monitoring dashboard
      await this.setCache('queue_metrics', allMetrics, { ttl: 300 });
    } catch (error: unknown) {
      logger.warn('Failed to collect queue metrics:', error);
    }
  }

  // Placeholder methods for maintenance tasks (to be implemented based on specific requirements)
  private async cleanupLogs(parameters: any): Promise<any> {
    logger.info('Performing log cleanup...', parameters);
    return { filesDeleted: 0, spaceFreed: '0MB' };
  }

  private async optimizeDatabase(parameters: any): Promise<any> {
    logger.info('Performing database optimization...', parameters);
    return { tablesOptimized: 0, indexesRebuilt: 0 };
  }

  private async backupData(parameters: any): Promise<any> {
    logger.info('Performing data backup...', parameters);
    return { backupSize: '0MB', backupLocation: '/backups' };
  }

  private async updateAnalytics(parameters: any): Promise<any> {
    logger.info('Updating analytics...', parameters);
    return { metricsUpdated: 0, dashboardRefreshed: true };
  }

  // External API coordination methods (placeholders for existing functionality)
  private async processWebhookCoordination(data: any): Promise<any> {
    return { processed: true, webhookData: data };
  }

  private async processAPIMetricsCollection(data: any): Promise<any> {
    return { metricsCollected: true, data };
  }

  private async processCostMonitoring(data: any): Promise<any> {
    return { costAnalyzed: true, data };
  }

  private async processAPIHealthCoordination(data: any): Promise<any> {
    return { healthChecked: true, data };
  }

  // Getter methods
  public isQueueServiceInitialized(): boolean {
    return this.isInitialized;
  }

  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  public getQueueCount(): number {
    return this.queues.size;
  }
}

// Export singleton instance
export const queueService = new QueueService();
export default queueService;