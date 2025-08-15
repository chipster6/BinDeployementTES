/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - WEBHOOK COORDINATION SERVICE
 * ============================================================================
 *
 * Specialized service for coordinating webhook processing between Backend-Agent
 * and Frontend-Agent with real-time updates and comprehensive error handling.
 *
 * Features:
 * - Real-time webhook event broadcasting to Frontend
 * - Intelligent webhook retry logic with exponential backoff
 * - Webhook payload validation and sanitization
 * - Idempotent processing to handle duplicate deliveries
 * - Comprehensive audit logging and monitoring
 * - Cost impact analysis for webhook processing
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import { socketManager } from "@/services/socketManager";
import { jobQueue } from "@/services/jobQueue";
import { externalServicesManager } from "./ExternalServicesManager";
import WebhookSecurityService from "./WebhookSecurityService";

/**
 * Webhook processing result interface
 */
export interface WebhookProcessingResult {
  success: boolean;
  processingTime: number;
  eventId: string;
  serviceName: string;
  webhookType: string;
  error?: string;
  retryCount: number;
  nextRetryAt?: Date;
  frontendNotified: boolean;
}

/**
 * Webhook coordination metadata
 */
export interface WebhookCoordinationMetadata {
  receivedAt: Date;
  processedAt?: Date;
  frontendBroadcastAt?: Date;
  jobQueuedAt?: Date;
  retryScheduledAt?: Date;
  coordinationEvents: string[];
}

/**
 * Webhook coordination service implementation
 */
export class WebhookCoordinationService {
  private webhookSecurity: WebhookSecurityService;
  private processingQueue: Map<string, any> = new Map();
  private retrySchedules: Map<string, NodeJS.Timeout> = new Map();
  private coordinationEnabled: boolean = true;
  
  // Webhook processing metrics
  private totalWebhooksProcessed: number = 0;
  private successfulWebhooks: number = 0;
  private failedWebhooks: number = 0;
  private averageProcessingTime: number = 0;

  constructor() {
    this.webhookSecurity = new WebhookSecurityService();
  }

  /**
   * Process incoming webhook with comprehensive coordination
   */
  public async processWebhookWithCoordination(
    serviceName: string,
    webhookData: any,
    headers: Record<string, string>
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId(serviceName, webhookData);
    
    const metadata: WebhookCoordinationMetadata = {
      receivedAt: new Date(),
      coordinationEvents: [],
    };

    try {
      // Step 1: Security validation
      const securityResult = await this.validateWebhookSecurity(
        serviceName, 
        webhookData, 
        headers
      );
      
      if (!securityResult.valid) {
        await this.handleSecurityFailure(serviceName, securityResult, metadata);
        throw new Error(`Webhook security validation failed: ${securityResult.reason}`);
      }

      metadata.coordinationEvents.push('security_validated');

      // Step 2: Duplicate detection
      const isDuplicate = await this.checkDuplicateWebhook(eventId, webhookData);
      if (isDuplicate) {
        logger.info('Duplicate webhook detected, skipping processing', {
          serviceName,
          eventId,
        });
        
        return {
          success: true,
          processingTime: Date.now() - startTime,
          eventId,
          serviceName,
          webhookType: webhookData.type || 'unknown',
          retryCount: 0,
          frontendNotified: false,
        };
      }

      metadata.coordinationEvents.push('duplicate_check_passed');

      // Step 3: Real-time Frontend notification (immediate)
      await this.broadcastWebhookReceived(serviceName, webhookData, eventId);
      metadata.frontendBroadcastAt = new Date();
      metadata.coordinationEvents.push('frontend_notified');

      // Step 4: Queue background processing job
      await this.queueWebhookProcessingJob(serviceName, webhookData, eventId);
      metadata.jobQueuedAt = new Date();
      metadata.coordinationEvents.push('background_job_queued');

      // Step 5: Immediate processing for critical webhooks
      const processingResult = await this.performImmediateProcessing(
        serviceName, 
        webhookData, 
        eventId
      );
      
      metadata.processedAt = new Date();
      metadata.coordinationEvents.push('immediate_processing_completed');

      // Step 6: Update coordination metrics
      await this.updateCoordinationMetrics(serviceName, processingResult, metadata);

      // Step 7: Store processing result for audit
      await this.storeWebhookResult(eventId, processingResult, metadata);

      const totalProcessingTime = Date.now() - startTime;
      
      // Update service metrics in ExternalServicesManager
      await externalServicesManager.handleWebhookCoordination(
        serviceName,
        webhookData,
        { ...processingResult, processingTime: totalProcessingTime }
      );

      logger.info('Webhook coordination completed successfully', {
        serviceName,
        eventId,
        processingTime: totalProcessingTime,
        coordinationEvents: metadata.coordinationEvents,
      });

      this.updateProcessingMetrics(true, totalProcessingTime);

      return {
        success: true,
        processingTime: totalProcessingTime,
        eventId,
        serviceName,
        webhookType: webhookData.type || 'unknown',
        retryCount: 0,
        frontendNotified: true,
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      
      logger.error('Webhook coordination failed', {
        serviceName,
        eventId,
        error: error.message,
        processingTime: totalProcessingTime,
        coordinationEvents: metadata.coordinationEvents,
      });

      // Notify Frontend of error
      await this.broadcastWebhookError(serviceName, webhookData, eventId, error);

      // Schedule retry if applicable
      const shouldRetry = await this.shouldRetryWebhook(serviceName, error);
      if (shouldRetry) {
        await this.scheduleWebhookRetry(serviceName, webhookData, eventId, 1);
      }

      this.updateProcessingMetrics(false, totalProcessingTime);

      return {
        success: false,
        processingTime: totalProcessingTime,
        eventId,
        serviceName,
        webhookType: webhookData.type || 'unknown',
        error: error.message,
        retryCount: 0,
        nextRetryAt: shouldRetry ? new Date(Date.now() + 30000) : undefined,
        frontendNotified: true,
      };
    }
  }

  /**
   * Validate webhook security with comprehensive checks
   */
  private async validateWebhookSecurity(
    serviceName: string,
    webhookData: any,
    headers: Record<string, string>
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Use WebhookSecurityService for signature verification
      const verificationResult = await this.webhookSecurity.verifyWebhookSignature(
        serviceName,
        JSON.stringify(webhookData),
        headers
      );

      if (!verificationResult.valid) {
        return {
          valid: false,
          reason: verificationResult.error || 'Signature verification failed',
        };
      }

      // Additional payload validation
      if (!webhookData || typeof webhookData !== 'object') {
        return {
          valid: false,
          reason: 'Invalid webhook payload structure',
        };
      }

      // Service-specific validation
      const serviceValidation = await this.performServiceSpecificValidation(
        serviceName,
        webhookData
      );

      return serviceValidation;
    } catch (error) {
      logger.error('Webhook security validation error', {
        serviceName,
        error: error.message,
      });
      
      return {
        valid: false,
        reason: `Security validation error: ${error.message}`,
      };
    }
  }

  /**
   * Perform service-specific webhook validation
   */
  private async performServiceSpecificValidation(
    serviceName: string,
    webhookData: any
  ): Promise<{ valid: boolean; reason?: string }> {
    switch (serviceName) {
      case 'stripe':
        return this.validateStripeWebhook(webhookData);
      case 'twilio':
        return this.validateTwilioWebhook(webhookData);
      case 'sendgrid':
        return this.validateSendGridWebhook(webhookData);
      case 'samsara':
        return this.validateSamsaraWebhook(webhookData);
      case 'airtable':
        return this.validateAirtableWebhook(webhookData);
      default:
        return { valid: true }; // Allow unknown services for now
    }
  }

  /**
   * Validate Stripe webhook payload
   */
  private validateStripeWebhook(webhookData: any): { valid: boolean; reason?: string } {
    if (!webhookData.type || !webhookData.data) {
      return { valid: false, reason: 'Missing required Stripe webhook fields' };
    }

    // Validate critical payment events
    const criticalEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.deleted',
    ];

    if (criticalEvents.includes(webhookData.type)) {
      if (!webhookData.data.object || !webhookData.data.object.id) {
        return { valid: false, reason: 'Missing critical payment object data' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate Twilio webhook payload
   */
  private validateTwilioWebhook(webhookData: any): { valid: boolean; reason?: string } {
    if (!webhookData.MessageSid && !webhookData.CallSid) {
      return { valid: false, reason: 'Missing Twilio message or call SID' };
    }

    return { valid: true };
  }

  /**
   * Validate SendGrid webhook payload
   */
  private validateSendGridWebhook(webhookData: any): { valid: boolean; reason?: string } {
    if (!Array.isArray(webhookData)) {
      return { valid: false, reason: 'SendGrid webhook must be an array' };
    }

    for (const event of webhookData) {
      if (!event.email || !event.event) {
        return { valid: false, reason: 'Missing required SendGrid event fields' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate Samsara webhook payload
   */
  private validateSamsaraWebhook(webhookData: any): { valid: boolean; reason?: string } {
    if (!webhookData.eventType || !webhookData.data) {
      return { valid: false, reason: 'Missing Samsara event type or data' };
    }

    return { valid: true };
  }

  /**
   * Validate Airtable webhook payload
   */
  private validateAirtableWebhook(webhookData: any): { valid: boolean; reason?: string } {
    if (!webhookData.base || !webhookData.webhook) {
      return { valid: false, reason: 'Missing Airtable base or webhook information' };
    }

    return { valid: true };
  }

  /**
   * Check for duplicate webhook processing
   */
  private async checkDuplicateWebhook(eventId: string, webhookData: any): Promise<boolean> {
    try {
      const duplicateKey = `webhook_processed:${eventId}`;
      const exists = await redisClient.exists(duplicateKey);
      
      if (exists) {
        return true;
      }

      // Store event ID to prevent duplicates (24 hour expiry)
      await redisClient.setex(duplicateKey, 86400, JSON.stringify({
        processedAt: new Date().toISOString(),
        dataHash: this.hashWebhookData(webhookData),
      }));

      return false;
    } catch (error) {
      logger.error('Error checking webhook duplicates', {
        eventId,
        error: error.message,
      });
      // If Redis is unavailable, allow processing to continue
      return false;
    }
  }

  /**
   * Broadcast webhook received event to Frontend
   */
  private async broadcastWebhookReceived(
    serviceName: string,
    webhookData: any,
    eventId: string
  ): Promise<void> {
    if (!this.coordinationEnabled) {
      return;
    }

    try {
      const broadcastData = {
        eventId,
        serviceName,
        webhookType: webhookData.type || 'unknown',
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(webhookData).length,
        status: 'received',
      };

      // Broadcast to webhook monitoring room
      socketManager.broadcastToRoom('webhook_events', 'webhook_received', broadcastData);

      // Notify service-specific rooms
      socketManager.broadcastToRoom(
        `${serviceName}_webhooks`,
        'webhook_received',
        broadcastData
      );

      // Notify admin and dispatcher roles
      socketManager.sendToRole('admin', 'webhook_received', {
        ...broadcastData,
        priority: this.getWebhookPriority(serviceName, webhookData.type),
      });

      logger.debug('Webhook received event broadcasted', {
        serviceName,
        eventId,
        webhookType: webhookData.type,
      });
    } catch (error) {
      logger.error('Failed to broadcast webhook received event', {
        serviceName,
        eventId,
        error: error.message,
      });
    }
  }

  /**
   * Queue webhook processing job for background handling
   */
  private async queueWebhookProcessingJob(
    serviceName: string,
    webhookData: any,
    eventId: string
  ): Promise<void> {
    try {
      const jobData = {
        serviceName,
        webhookData,
        eventId,
        queuedAt: new Date().toISOString(),
      };

      // Determine job queue based on service priority
      const queueName = this.getWebhookJobQueue(serviceName, webhookData.type);
      const priority = this.getWebhookPriority(serviceName, webhookData.type);

      await jobQueue.addJob(queueName, 'webhook-processing', jobData, {
        priority,
        attempts: 3,
        removeOnComplete: 50,
        removeOnFail: 20,
      });

      logger.debug('Webhook processing job queued', {
        serviceName,
        eventId,
        queueName,
        priority,
      });
    } catch (error) {
      logger.error('Failed to queue webhook processing job', {
        serviceName,
        eventId,
        error: error.message,
      });
    }
  }

  /**
   * Perform immediate processing for critical webhooks
   */
  private async performImmediateProcessing(
    serviceName: string,
    webhookData: any,
    eventId: string
  ): Promise<any> {
    try {
      // Only process critical webhooks immediately
      if (!this.isCriticalWebhook(serviceName, webhookData.type)) {
        return { processed: false, reason: 'Non-critical webhook, queued for background processing' };
      }

      logger.info('Processing critical webhook immediately', {
        serviceName,
        eventId,
        webhookType: webhookData.type,
      });

      // Service-specific immediate processing
      switch (serviceName) {
        case 'stripe':
          return await this.processStripeWebhookImmediate(webhookData);
        case 'samsara':
          return await this.processSamsaraWebhookImmediate(webhookData);
        case 'twilio':
          return await this.processTwilioWebhookImmediate(webhookData);
        default:
          return { processed: false, reason: 'No immediate processing defined for service' };
      }
    } catch (error) {
      logger.error('Immediate webhook processing failed', {
        serviceName,
        eventId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update coordination metrics
   */
  private async updateCoordinationMetrics(
    serviceName: string,
    processingResult: any,
    metadata: WebhookCoordinationMetadata
  ): Promise<void> {
    try {
      const metricsKey = `webhook_coordination_metrics:${serviceName}`;
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
      const hourlyKey = `${metricsKey}:${currentHour}`;

      const multi = redisClient.multi();
      multi.hincrby(hourlyKey, 'total_webhooks', 1);
      multi.hincrby(hourlyKey, processingResult.processed ? 'processed_webhooks' : 'queued_webhooks', 1);
      multi.hincrby(hourlyKey, 'coordination_events', metadata.coordinationEvents.length);
      multi.expire(hourlyKey, 3600 * 24); // 24 hour retention

      await multi.exec();
    } catch (error) {
      logger.error('Failed to update coordination metrics', {
        serviceName,
        error: error.message,
      });
    }
  }

  /**
   * Store webhook processing result for audit
   */
  private async storeWebhookResult(
    eventId: string,
    result: any,
    metadata: WebhookCoordinationMetadata
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: 'webhook_processed',
        resourceType: 'webhook_coordination',
        resourceId: eventId,
        details: {
          result,
          metadata,
          coordinationComplete: true,
        },
        ipAddress: 'webhook',
        userAgent: 'WebhookCoordinationService',
      });
    } catch (error) {
      logger.error('Failed to store webhook result audit', {
        eventId,
        error: error.message,
      });
    }
  }

  /**
   * Handle security validation failure
   */
  private async handleSecurityFailure(
    serviceName: string,
    securityResult: any,
    metadata: WebhookCoordinationMetadata
  ): Promise<void> {
    await AuditLog.create({
      userId: null,
      customerId: null,
      action: 'webhook_security_failure',
      resourceType: 'webhook_security',
      resourceId: serviceName,
      details: {
        securityResult,
        metadata,
        securityLevel: 'HIGH',
      },
      ipAddress: 'webhook',
      userAgent: 'WebhookCoordinationService',
    });

    // Notify security team
    socketManager.sendToRole('admin', 'webhook_security_alert', {
      serviceName,
      reason: securityResult.reason,
      timestamp: new Date().toISOString(),
      severity: 'high',
    });
  }

  /**
   * Broadcast webhook error to Frontend
   */
  private async broadcastWebhookError(
    serviceName: string,
    webhookData: any,
    eventId: string,
    error: Error
  ): Promise<void> {
    if (!this.coordinationEnabled) {
      return;
    }

    try {
      const errorData = {
        eventId,
        serviceName,
        webhookType: webhookData.type || 'unknown',
        error: error.message,
        timestamp: new Date().toISOString(),
        severity: 'error',
      };

      socketManager.broadcastToRoom('webhook_events', 'webhook_error', errorData);
      socketManager.sendToRole('admin', 'webhook_processing_error', errorData);
    } catch (broadcastError) {
      logger.error('Failed to broadcast webhook error', {
        serviceName,
        eventId,
        error: broadcastError.message,
      });
    }
  }

  /**
   * Helper methods for webhook classification and processing
   */
  private generateEventId(serviceName: string, webhookData: any): string {
    const timestamp = Date.now();
    const dataHash = this.hashWebhookData(webhookData).substring(0, 8);
    return `${serviceName}_${timestamp}_${dataHash}`;
  }

  private hashWebhookData(webhookData: any): string {
    // Simple hash for webhook data (in production, use crypto.createHash)
    return Buffer.from(JSON.stringify(webhookData)).toString('base64').substring(0, 16);
  }

  private getWebhookPriority(serviceName: string, webhookType?: string): number {
    const priorities = {
      stripe: 10, // Highest priority for payments
      samsara: 9, // High priority for fleet tracking
      twilio: 8,  // High priority for communications
      sendgrid: 7,
      airtable: 5,
      maps: 6,
    };

    return priorities[serviceName as keyof typeof priorities] || 5;
  }

  private getWebhookJobQueue(serviceName: string, webhookType?: string): string {
    // Critical webhooks go to high-priority queue
    if (this.isCriticalWebhook(serviceName, webhookType)) {
      return 'notifications'; // High-priority queue
    }
    
    return 'data-sync'; // Standard webhook processing queue
  }

  private isCriticalWebhook(serviceName: string, webhookType?: string): boolean {
    const criticalWebhooks = {
      stripe: ['payment_intent.payment_failed', 'invoice.payment_failed'],
      samsara: ['vehicle.emergency', 'driver.alert'],
      twilio: ['message.failed', 'call.failed'],
    };

    const critical = criticalWebhooks[serviceName as keyof typeof criticalWebhooks];
    return critical ? critical.includes(webhookType || '') : false;
  }

  private async shouldRetryWebhook(serviceName: string, error: Error): Promise<boolean> {
    // Don't retry security failures or validation errors
    if (error.message.includes('security') || error.message.includes('validation')) {
      return false;
    }

    // Retry temporary failures
    return error.message.includes('timeout') || 
           error.message.includes('connection') ||
           error.message.includes('server error');
  }

  private async scheduleWebhookRetry(
    serviceName: string,
    webhookData: any,
    eventId: string,
    retryCount: number
  ): Promise<void> {
    const delay = Math.min(30000 * Math.pow(2, retryCount - 1), 300000); // Max 5 minutes
    
    const timeout = setTimeout(async () => {
      logger.info(`Retrying webhook processing (attempt ${retryCount})`, {
        serviceName,
        eventId,
      });

      try {
        await this.processWebhookWithCoordination(serviceName, webhookData, {});
      } catch (error) {
        if (retryCount < 3) {
          await this.scheduleWebhookRetry(serviceName, webhookData, eventId, retryCount + 1);
        }
      }
    }, delay);

    this.retrySchedules.set(eventId, timeout);
  }

  private updateProcessingMetrics(success: boolean, processingTime: number): void {
    this.totalWebhooksProcessed++;
    
    if (success) {
      this.successfulWebhooks++;
    } else {
      this.failedWebhooks++;
    }

    // Update average processing time
    this.averageProcessingTime = 
      (this.averageProcessingTime * (this.totalWebhooksProcessed - 1) + processingTime) / 
      this.totalWebhooksProcessed;
  }

  /**
   * Placeholder immediate processing methods (implement based on business logic)
   */
  private async processStripeWebhookImmediate(webhookData: any): Promise<any> {
    // Implement Stripe payment webhook immediate processing
    return { processed: true, action: 'payment_status_updated' };
  }

  private async processSamsaraWebhookImmediate(webhookData: any): Promise<any> {
    // Implement Samsara fleet tracking immediate processing
    return { processed: true, action: 'vehicle_location_updated' };
  }

  private async processTwilioWebhookImmediate(webhookData: any): Promise<any> {
    // Implement Twilio communication webhook immediate processing
    return { processed: true, action: 'message_status_updated' };
  }

  /**
   * Get webhook coordination statistics
   */
  public getCoordinationStats(): any {
    return {
      totalWebhooksProcessed: this.totalWebhooksProcessed,
      successfulWebhooks: this.successfulWebhooks,
      failedWebhooks: this.failedWebhooks,
      successRate: this.totalWebhooksProcessed > 0 ? 
        (this.successfulWebhooks / this.totalWebhooksProcessed) * 100 : 0,
      averageProcessingTime: this.averageProcessingTime,
      activeRetries: this.retrySchedules.size,
      coordinationEnabled: this.coordinationEnabled,
    };
  }

  /**
   * Enable/disable webhook coordination
   */
  public setCoordinationEnabled(enabled: boolean): void {
    this.coordinationEnabled = enabled;
    logger.info(`Webhook coordination ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear retry schedules (cleanup)
   */
  public cleanup(): void {
    for (const timeout of this.retrySchedules.values()) {
      clearTimeout(timeout);
    }
    this.retrySchedules.clear();
    logger.info('Webhook coordination service cleanup completed');
  }
}

// Export singleton instance
export const webhookCoordinationService = new WebhookCoordinationService();
export default WebhookCoordinationService;