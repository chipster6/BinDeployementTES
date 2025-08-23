/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - IN-MEMORY JOB QUEUE
 * ============================================================================
 * 
 * Fallback in-memory job queue service for when Redis is unavailable.
 * Provides essential job processing capabilities to maintain business
 * continuity during queue service failures.
 *
 * Features:
 * - In-memory job storage and processing
 * - Job retry logic with exponential backoff
 * - Priority queue support
 * - Job status tracking and monitoring
 * - Graceful degradation from Redis
 * - Memory usage monitoring and limits
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import { logger, logError, logAuditEvent } from '@/utils/logger';
import { EventEmitter } from 'events';

export interface Job {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processAfter: Date;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface ProcessorFunction {
  (job: Job): Promise<any>;
}

export interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  memoryUsage: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
}

export class InMemoryJobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private processors = new Map<string, ProcessorFunction>();
  private processing = new Set<string>();
  private processingInterval: NodeJS.Timeout | null = null;
  private delayedJobsInterval: NodeJS.Timeout | null = null;
  
  private config = {
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB limit
    processingInterval: 1000, // 1 second
    maxConcurrentJobs: 10,
    defaultMaxAttempts: 3,
    defaultPriority: 0,
    cleanupInterval: 300000, // 5 minutes
    maxJobAge: 3600000, // 1 hour
  };

  private metrics = {
    totalProcessed: 0,
    totalFailed: 0,
    startTime: Date.now(),
    processingTimes: [] as number[],
    lastCleanup: Date.now()
  };

  constructor() {
    super();
    this.startProcessing();
    this.startDelayedJobProcessor();
    this.startCleanup();
    
    logger.info('InMemoryJobQueue initialized', {
      config: this.config
    });
  }

  /**
   * Add a job to the queue
   */
  public addJob(type: string, data: any, options: JobOptions = {}): string {
    const jobId = this.generateJobId();
    const now = new Date();
    const processAfter = options.delay ? new Date(now.getTime() + options.delay) : now;
    
    const job: Job = {
      id: jobId,
      type,
      data,
      priority: options.priority || this.config.defaultPriority,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.defaultMaxAttempts,
      createdAt: now,
      processAfter,
      status: options.delay ? 'delayed' : 'pending'
    };

    // Check memory usage before adding
    if (this.getCurrentMemoryUsage() >= this.config.maxMemoryUsage) {
      this.cleanupOldJobs();
      if (this.getCurrentMemoryUsage() >= this.config.maxMemoryUsage) {
        throw new Error('In-memory queue at capacity - cannot add new jobs');
      }
    }

    this.jobs.set(jobId, job);
    
    logger.debug('Job added to in-memory queue', {
      jobId,
      type,
      priority: job.priority,
      delayed: !!options.delay
    });

    this.emit('job:added', job);
    return jobId;
  }

  /**
   * Register a processor for a specific job type
   */
  public process(type: string, processor: ProcessorFunction): void {
    this.processors.set(type, processor);
    
    logger.info('Job processor registered', {
      type,
      totalProcessors: this.processors.size
    });
  }

  /**
   * Get job status
   */
  public getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get queue metrics
   */
  public getMetrics(): QueueMetrics {
    const jobs = Array.from(this.jobs.values());
    const memoryUsage = this.getCurrentMemoryUsage();
    const uptime = Date.now() - this.metrics.startTime;
    const throughputPerMinute = (this.metrics.totalProcessed / (uptime / 60000));
    const avgProcessingTime = this.metrics.processingTimes.length > 0 ?
      this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length : 0;

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      delayedJobs: jobs.filter(j => j.status === 'delayed').length,
      memoryUsage,
      averageProcessingTime: avgProcessingTime,
      throughputPerMinute
    };
  }

  /**
   * Get all jobs with optional filtering
   */
  public getJobs(filter?: {
    status?: Job['status'];
    type?: string;
    limit?: number;
  }): Job[] {
    let jobs = Array.from(this.jobs.values());

    if (filter?.status) {
      jobs = jobs.filter(job => job.status === filter.status);
    }

    if (filter?.type) {
      jobs = jobs.filter(job => job.type === filter.type);
    }

    if (filter?.limit) {
      jobs = jobs.slice(0, filter.limit);
    }

    return jobs.sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Remove a job from the queue
   */
  public removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    this.jobs.delete(jobId);
    this.processing.delete(jobId);
    
    logger.debug('Job removed from queue', { jobId, status: job.status });
    this.emit('job:removed', job);
    
    return true;
  }

  /**
   * Retry a failed job
   */
  public retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.lastError = undefined;
    job.processAfter = new Date();
    
    logger.info('Job marked for retry', { jobId, type: job.type });
    this.emit('job:retry', job);
    
    return true;
  }

  /**
   * Pause queue processing
   */
  public pause(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.delayedJobsInterval) {
      clearInterval(this.delayedJobsInterval);
      this.delayedJobsInterval = null;
    }
    
    logger.info('InMemoryJobQueue paused');
    this.emit('queue:paused');
  }

  /**
   * Resume queue processing
   */
  public resume(): void {
    if (!this.processingInterval) {
      this.startProcessing();
    }
    
    if (!this.delayedJobsInterval) {
      this.startDelayedJobProcessor();
    }
    
    logger.info('InMemoryJobQueue resumed');
    this.emit('queue:resumed');
  }

  /**
   * Clear all jobs
   */
  public clear(): void {
    const jobCount = this.jobs.size;
    this.jobs.clear();
    this.processing.clear();
    
    logger.info('InMemoryJobQueue cleared', { clearedJobs: jobCount });
    this.emit('queue:cleared', jobCount);
  }

  /**
   * Shutdown the queue
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down InMemoryJobQueue');
    
    this.pause();
    
    // Wait for current processing jobs to complete
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.processing.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.processing.size > 0) {
      logger.warn('Shutdown timeout - some jobs may not have completed', {
        remainingJobs: this.processing.size
      });
    }
    
    this.emit('queue:shutdown');
  }

  // Private methods
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processNextJobs();
    }, this.config.processingInterval);
  }

  private startDelayedJobProcessor(): void {
    this.delayedJobsInterval = setInterval(() => {
      this.processDelayedJobs();
    }, this.config.processingInterval);
  }

  private startCleanup(): void {
    setInterval(() => {
      this.cleanupOldJobs();
    }, this.config.cleanupInterval);
  }

  private async processNextJobs(): Promise<void> {
    const availableSlots = this.config.maxConcurrentJobs - this.processing.size;
    if (availableSlots <= 0) {
      return;
    }

    const pendingJobs = this.getJobs({ status: 'pending', limit: availableSlots });
    
    for (const job of pendingJobs) {
      if (this.processing.size >= this.config.maxConcurrentJobs) {
        break;
      }
      
      await this.processJob(job);
    }
  }

  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      logger.warn('No processor found for job type', { 
        jobId: job.id, 
        type: job.type 
      });
      return;
    }

    job.status = 'processing';
    job.attempts++;
    this.processing.add(job.id);
    
    const startTime = Date.now();
    
    try {
      logger.debug('Processing job', { 
        jobId: job.id, 
        type: job.type, 
        attempt: job.attempts 
      });
      
      this.emit('job:processing', job);
      
      const result = await processor(job);
      const processingTime = Date.now() - startTime;
      
      job.status = 'completed';
      this.processing.delete(job.id);
      this.metrics.totalProcessed++;
      this.metrics.processingTimes.push(processingTime);
      
      // Keep only recent processing times for average calculation
      if (this.metrics.processingTimes.length > 100) {
        this.metrics.processingTimes = this.metrics.processingTimes.slice(-100);
      }
      
      logger.debug('Job completed successfully', { 
        jobId: job.id, 
        type: job.type,
        processingTime
      });
      
      this.emit('job:completed', job, result);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      job.lastError = (error as Error).message;
      this.processing.delete(job.id);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.metrics.totalFailed++;
        
        logger.error('Job failed permanently', {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: job.lastError
        });
        
        this.emit('job:failed', job, error);
      } else {
        // Schedule retry with backoff
        const delay = this.calculateRetryDelay(job.attempts);
        job.processAfter = new Date(Date.now() + delay);
        job.status = 'delayed';
        
        logger.warn('Job failed, scheduling retry', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          retryAfter: job.processAfter.toISOString(),
          error: job.lastError
        });
        
        this.emit('job:retry_scheduled', job);
      }
      
      logError(error as Error, 'in_memory_job_processing_error', {
        jobId: job.id,
        type: job.type,
        attempt: job.attempts,
        processingTime
      });
    }
  }

  private processDelayedJobs(): void {
    const now = new Date();
    const delayedJobs = this.getJobs({ status: 'delayed' });
    
    for (const job of delayedJobs) {
      if (job.processAfter <= now) {
        job.status = 'pending';
        logger.debug('Delayed job moved to pending', { 
          jobId: job.id, 
          type: job.type 
        });
        this.emit('job:delayed_to_pending', job);
      }
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  private cleanupOldJobs(): void {
    const now = Date.now();
    const jobsToDelete: string[] = [];
    
    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - job.createdAt.getTime();
      
      // Remove old completed or failed jobs
      if ((job.status === 'completed' || job.status === 'failed') && 
          jobAge > this.config.maxJobAge) {
        jobsToDelete.push(jobId);
      }
    }
    
    for (const jobId of jobsToDelete) {
      this.jobs.delete(jobId);
    }
    
    if (jobsToDelete.length > 0) {
      logger.info('Cleaned up old jobs', { 
        deletedCount: jobsToDelete.length,
        totalJobs: this.jobs.size
      });
    }
    
    this.metrics.lastCleanup = now;
  }

  private getCurrentMemoryUsage(): number {
    // Rough estimate of memory usage
    const jobsString = JSON.stringify(Array.from(this.jobs.values()));
    return jobsString.length * 2; // Approximate UTF-16 encoding
  }

  private generateJobId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default InMemoryJobQueue;