/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - JOB SERVICE INTEGRATION
 * ============================================================================
 *
 * Legacy job service integration wrapper for backward compatibility.
 * Delegates to the new QueueService for all queue operations.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-20
 * Version: 2.0.0 - Queue Service Integration
 */

import { logger } from "@/utils/logger";
import { config } from "@/config";
import { queueService } from "@/services/QueueService";

export class JobService {
  public async initialize(): Promise<void> {
    if (config.queue.enabled) {
      logger.info("Initializing comprehensive queue service...");
      try {
        const result = await queueService.initialize();
        if (result.success) {
          logger.info("Queue service initialized successfully:", result.data);
        } else {
          logger.warn("Queue service initialization completed with warnings:", result?.message);
        }
      } catch (error: unknown) {
        logger.error("Queue service initialization failed:", error);
        // Do not throw, as the queue might not be critical for basic operations
      }
    } else {
      logger.info("Queue service disabled in configuration");
    }
  }

  public async close(): Promise<void> {
    if (config.queue.enabled && queueService.isQueueServiceInitialized()) {
      logger.info("Closing comprehensive queue service...");
      try {
        const result = await queueService.close();
        if (result.success) {
          logger.info("Queue service closed successfully");
        } else {
          logger.warn("Queue service close completed with warnings:", result?.message);
        }
      } catch (error: unknown) {
        logger.error("Queue service close failed:", error);
      }
    }
  }

  /**
   * Legacy method - delegates to QueueService
   */
  public isInitialized(): boolean {
    return queueService.isQueueServiceInitialized();
  }

  /**
   * Legacy method - delegates to QueueService for job creation
   */
  public async addJob(queueName: string, jobName: string, data: any, options: any = {}): Promise<any> {
    try {
      const result = await queueService.addJob(queueName, jobName, data, options);
      return result;
    } catch (error: unknown) {
      logger.error("Legacy addJob method failed:", error);
      throw error;
    }
  }

  /**
   * Get queue service statistics
   */
  public async getStats(): Promise<any> {
    try {
      const result = await queueService.getQueueStats();
      return result;
    } catch (error: unknown) {
      logger.error("Get queue stats failed:", error);
      throw error;
    }
  }
}
