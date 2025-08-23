/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TWILIO SMS SERVICE
 * ============================================================================
 *
 * Comprehensive Twilio SMS integration supporting:
 * - Customer notifications for service updates and billing
 * - Driver communications for route changes and updates
 * - Emergency communication capabilities
 * - Two-way SMS handling and status tracking
 * - Bulk messaging and campaign management
 *
 * Features:
 * - SMS delivery with status tracking
 * - Template-based messaging system
 * - Bulk messaging with rate limiting
 * - Two-way SMS conversation handling
 * - Emergency alert broadcasting
 * - Comprehensive delivery analytics
 * - Webhook handling for delivery status
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Twilio } from "twilio";
import {
  BaseExternalService,
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";
import { logger } from "@/utils/logger";
import { AuditLog } from "@/models/AuditLog";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  maskSensitiveData,
} from "@/utils/encryption";
import WebhookSecurityService from "./WebhookSecurityService";
import { redisClient } from "@/config/redis";

/**
 * SMS message interface
 */
export interface SmsMessage {
  id?: string;
  to: string;
  from: string;
  body: string;
  status?:
    | "queued"
    | "sending"
    | "sent"
    | "failed"
    | "delivered"
    | "undelivered"
    | "received";
  errorCode?: number;
  errorMessage?: string;
  direction?: "inbound" | "outbound";
  dateCreated?: Date;
  dateUpdated?: Date;
  dateSent?: Date;
  numSegments?: number;
  price?: string;
  uri?: string;
}

/**
 * SMS template interface
 */
export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
  category: "notification" | "alert" | "reminder" | "marketing" | "emergency";
}

/**
 * Bulk message request
 */
export interface BulkMessageRequest {
  recipients: {
    to: string;
    variables?: Record<string, string>;
  }[];
  templateId?: string;
  body?: string;
  from: string;
  scheduleTime?: Date;
  metadata?: Record<string, string>;
}

/**
 * Message status webhook payload
 */
export interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  MessageBody?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  NumSegments?: string;
  Price?: string;
  DateSent?: string;
  DateCreated?: string;
  DateUpdated?: string;
}

/**
 * Service configuration
 */
interface TwilioConfig extends ExternalServiceConfig {
  accountSid: string;
  authToken: string;
  webhookAuthToken?: string;
  enableKeyRotation?: boolean;
  keyRotationIntervalDays?: number;
  encryptPhoneNumbers?: boolean;
  auditAllMessages?: boolean;
  enablePhoneNumberValidation?: boolean;
}

/**
 * Twilio SMS service implementation
 */
export class TwilioService extends BaseExternalService {
  private twilio: Twilio;
  private webhookAuthToken?: string;
  private templates: Map<string, SmsTemplate> = new Map();
  private webhookSecurityService: WebhookSecurityService;
  private encryptPhoneNumbers: boolean;
  private auditAllMessages: boolean;
  private keyRotationEnabled: boolean;
  private keyRotationInterval: number;
  private enablePhoneNumberValidation: boolean;
  private readonly SENSITIVE_FIELDS = ['to', 'from', 'phone', 'phoneNumber'];

  constructor(config: TwilioConfig) {
    super({
      ...config,
      serviceName: "twilio",
      baseURL: "https://api.twilio.com",
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requests: 1000, // Twilio's default rate limit
        window: 1,
      },
    });

    this.twilio = new Twilio(config.accountSid, config.authToken);
    this.webhookAuthToken = config.webhookAuthToken;
    this.webhookSecurityService = new WebhookSecurityService();
    this.encryptPhoneNumbers = config.encryptPhoneNumbers !== false;
    this.auditAllMessages = config.auditAllMessages !== false;
    this.keyRotationEnabled = config.enableKeyRotation === true;
    this.keyRotationInterval = config?.keyRotationIntervalDays || 90;
    this.enablePhoneNumberValidation = config.enablePhoneNumberValidation !== false;

    // Register webhook security configuration
    if (this.webhookAuthToken) {
      this.webhookSecurityService.registerWebhook('twilio', {
        provider: 'twilio',
        secret: this.webhookAuthToken,
        tolerance: 300, // 5 minutes
        enableReplayProtection: true,
        maxPayloadSize: 64 * 1024, // 64KB
      });
    }

    this.initializeTemplates();

    // Initialize API key rotation monitoring
    if (this.keyRotationEnabled) {
      this.initializeKeyRotationMonitoring();
    }
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.twilio.accountSid}:${this.twilio.authToken}`,
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  /**
   * Initialize default SMS templates
   */
  private initializeTemplates(): void {
    const defaultTemplates: SmsTemplate[] = [
      {
        id: "service_reminder",
        name: "Service Reminder",
        body: "Hi {{customerName}}, your waste pickup is scheduled for {{serviceDate}} between {{timeWindow}}. Reply STOP to opt out.",
        variables: ["customerName", "serviceDate", "timeWindow"],
        category: "reminder",
      },
      {
        id: "service_completed",
        name: "Service Completed",
        body: "Your waste pickup at {{address}} has been completed. Thank you for choosing our service!",
        variables: ["address"],
        category: "notification",
      },
      {
        id: "payment_reminder",
        name: "Payment Reminder",
        body: "Hi {{customerName}}, your payment of ${{amount}} is due on {{dueDate}}. Pay now at {{paymentLink}}",
        variables: ["customerName", "amount", "dueDate", "paymentLink"],
        category: "reminder",
      },
      {
        id: "driver_route_update",
        name: "Driver Route Update",
        body: "Route update: {{routeDetails}}. Next stop: {{nextAddress}} at {{estimatedTime}}.",
        variables: ["routeDetails", "nextAddress", "estimatedTime"],
        category: "notification",
      },
      {
        id: "emergency_alert",
        name: "Emergency Alert",
        body: "URGENT: {{alertMessage}}. Please respond immediately if you need assistance.",
        variables: ["alertMessage"],
        category: "emergency",
      },
      {
        id: "service_delay",
        name: "Service Delay Notification",
        body: "Hi {{customerName}}, your scheduled pickup has been delayed. New estimated time: {{newTime}}. We apologize for the inconvenience.",
        variables: ["customerName", "newTime"],
        category: "alert",
      },
    ];

    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send single SMS message
   */
  public async sendSms(
    to: string,
    body: string,
    from: string,
    options: {
      statusCallback?: string;
      metadata?: Record<string, string>;
      scheduleTime?: Date;
    } = {},
  ): Promise<ApiResponse<SmsMessage>> {
    try {
      logger.info("Sending SMS message", {
        to: this.maskPhoneNumber(to),
        from,
        bodyLength: body.length,
      });

      const messageData: any = {
        to,
        from,
        body,
      };

      if (options.statusCallback) {
        messageData.statusCallback = options.statusCallback;
      }

      if (options.scheduleTime && options.scheduleTime > new Date()) {
        messageData.scheduleType = "fixed";
        messageData.sendAt = options.scheduleTime.toISOString();
      }

      const message = await this.twilio?.messages.create(messageData);

      const smsMessage: SmsMessage = {
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message?.errorCode || undefined,
        errorMessage: message?.errorMessage || undefined,
        direction: message.direction as any,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
        numSegments: message.numSegments,
        price: message.price,
        uri: message.uri,
      };

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "sms_sent",
        resourceType: "twilio_sms",
        resourceId: message.sid,
        details: {
          to: this.maskPhoneNumber(to),
          from,
          status: message.status,
          numSegments: message.numSegments,
        },
        ipAddress: "system",
        userAgent: "TwilioService",
      });

      return {
        success: true,
        data: smsMessage,
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to send SMS message", {
        error: error instanceof Error ? error?.message : String(error),
        to: this.maskPhoneNumber(to),
        from,
      });

      throw new Error(`SMS sending failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Send SMS using template
   */
  public async sendTemplatedSms(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    from: string,
    options?: {
      statusCallback?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<ApiResponse<SmsMessage>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Replace template variables
      let body = template.body;
      template.variables.forEach((variable) => {
        const value = variables[variable] || "";
        body = body.replace(new RegExp(`{{${variable}}}`, "g"), value);
      });

      return await this.sendSms(to, body, from, options);
    } catch (error: unknown) {
      logger.error("Failed to send templated SMS", {
        error: error instanceof Error ? error?.message : String(error),
        to: this.maskPhoneNumber(to),
        templateId,
      });

      throw new Error(`Templated SMS sending failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Send bulk SMS messages
   */
  public async sendBulkSms(
    request: BulkMessageRequest,
    options?: ApiRequestOptions,
  ): Promise<
    ApiResponse<{
      totalSent: number;
      successful: SmsMessage[];
      failed: Array<{ to: string; error: string }>;
    }>
  > {
    try {
      logger.info("Sending bulk SMS messages", {
        recipientCount: request.recipients.length,
        templateId: request.templateId,
        from: request.from,
      });

      const successful: SmsMessage[] = [];
      const failed: Array<{ to: string; error: string }> = [];

      // Process messages in batches to respect rate limits
      const batchSize = 10;
      for (let i = 0; i < request.recipients.length; i += batchSize) {
        const batch = request.recipients.slice(i, i + batchSize);

        const batchPromises = batch.map(async (recipient) => {
          try {
            let messageBody = request?.body || "";

            // Use template if provided
            if (request.templateId) {
              const template = this.templates.get(request.templateId);
              if (!template) {
                throw new Error(`Template not found: ${request.templateId}`);
              }

              messageBody = template.body;
              if (recipient.variables) {
                template.variables.forEach((variable) => {
                  const value = recipient.variables![variable] || "";
                  messageBody = messageBody.replace(
                    new RegExp(`{{${variable}}}`, "g"),
                    value,
                  );
                });
              }
            }

            const result = await this.sendSms(
              recipient.to,
              messageBody,
              request.from,
              {
                scheduleTime: request.scheduleTime,
                metadata: request.metadata,
              },
            );

            if (result.success && result.data) {
              successful.push(result.data);
            }
          } catch (error: unknown) {
            failed.push({
              to: recipient.to,
              error: error instanceof Error ? error?.message : String(error),
            });
          }
        });

        await Promise.allSettled(batchPromises);

        // Add delay between batches to respect rate limits
        if (i + batchSize < request.recipients.length) {
          await this.sleep(1000);
        }
      }

      return {
        success: true,
        data: {
          totalSent: successful.length,
          successful,
          failed,
        },
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to send bulk SMS", {
        error: error instanceof Error ? error?.message : String(error),
        recipientCount: request.recipients.length,
      });

      throw new Error(`Bulk SMS sending failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get message status
   */
  public async getMessageStatus(
    messageSid: string,
  ): Promise<ApiResponse<SmsMessage>> {
    try {
      const message = await this.twilio?.messages(messageSid).fetch();

      const smsMessage: SmsMessage = {
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message?.errorCode || undefined,
        errorMessage: message?.errorMessage || undefined,
        direction: message.direction as any,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
        numSegments: message.numSegments,
        price: message.price,
        uri: message.uri,
      };

      return {
        success: true,
        data: smsMessage,
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to get message status", {
        error: error instanceof Error ? error?.message : String(error),
        messageSid,
      });

      throw new Error(`Message status retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get message history for a phone number
   */
  public async getMessageHistory(
    phoneNumber: string,
    limit: number = 50,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ApiResponse<SmsMessage[]>> {
    try {
      const options: any = {
        to: phoneNumber,
        limit,
      };

      if (startDate) {
        options.dateSentAfter = startDate;
      }

      if (endDate) {
        options.dateSentBefore = endDate;
      }

      const messages = await this.twilio?.messages.list(options);

      const smsMessages: SmsMessage[] = messages.map((message) => ({
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message?.errorCode || undefined,
        errorMessage: message?.errorMessage || undefined,
        direction: message.direction as any,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
        numSegments: message.numSegments,
        price: message.price,
        uri: message.uri,
      }));

      return {
        success: true,
        data: smsMessages,
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get message history", {
        error: error instanceof Error ? error?.message : String(error),
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      });

      throw new Error(`Message history retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Process incoming webhook with enhanced security validation
   */
  public async processWebhook(
    body: TwilioWebhookPayload | string,
    signature?: string,
    url?: string,
    headers?: Record<string, string>,
    ipAddress?: string,
  ): Promise<ApiResponse<{ processed: boolean; messageId: string }>> {
    try {
      // Enhanced security validation using WebhookSecurityService
      if (this.webhookAuthToken) {
        const verificationResult = await this.webhookSecurityService.verifyWebhook(
          'twilio',
          typeof body === 'string' ? body : JSON.stringify(body),
          signature || '',
          undefined, // Twilio doesn't use timestamp in header
          headers,
        );

        if (!verificationResult.isValid) {
          await this.logSecurityEvent('webhook_verification_failed', {
            error: verificationResult.error,
            ipAddress,
            signature: maskSensitiveData(signature || ''),
          });
          throw new Error(`Webhook verification failed: ${verificationResult.error}`);
        }

        // Check for replay attacks
        if (verificationResult.metadata?.isReplay) {
          await this.logSecurityEvent('webhook_replay_attack_detected', {
            messageId: verificationResult.metadata.eventId,
            ipAddress,
          });
          throw new Error('Replay attack detected');
        }

        // Rate limiting check
        const rateLimitResult = await this.webhookSecurityService.checkRateLimit(
          'twilio',
          ipAddress || 'unknown',
          { windowMinutes: 5, maxRequests: 100 }
        );

        if (!rateLimitResult.allowed) {
          await this.logSecurityEvent('webhook_rate_limit_exceeded', {
            ipAddress,
            remainingRequests: rateLimitResult.remainingRequests,
          });
          throw new Error('Rate limit exceeded for webhook requests');
        }
      }

      // Parse body if it's a string
      const webhookPayload: TwilioWebhookPayload = typeof body === 'string' ? JSON.parse(body) : body;

      // Validate phone numbers for suspicious patterns
      await this.validatePhoneNumberSecurity(webhookPayload);

      logger.info("Processing Twilio webhook", {
        messageSid: webhookPayload.MessageSid,
        status: webhookPayload.MessageStatus,
        to: this.maskPhoneNumber(webhookPayload.To),
        securityValidated: true,
        ipAddress,
      });

      // Process different message statuses
      switch (webhookPayload.MessageStatus) {
        case "delivered":
          await this.handleMessageDelivered(webhookPayload);
          break;

        case "failed":
        case "undelivered":
          await this.handleMessageFailed(webhookPayload);
          break;

        case "sent":
          await this.handleMessageSent(webhookPayload);
          break;

        case "received":
          await this.handleMessageReceived(webhookPayload);
          break;

        default:
          logger.info("Unhandled message status", {
            status: webhookPayload.MessageStatus,
          });
      }

      // Enhanced audit logging with security metadata
      await this.logSecurityEvent('webhook_processed', {
        messageId: webhookPayload.MessageSid,
        status: webhookPayload.MessageStatus,
        to: this.maskPhoneNumber(webhookPayload.To),
        from: this.maskPhoneNumber(webhookPayload.From),
        processed: true,
        securityValidated: true,
        ipAddress: ipAddress || 'twilio',
      });

      return {
        success: true,
        data: { processed: true, messageId: webhookPayload.MessageSid },
        statusCode: 200,
      };
    } catch (error: unknown) {
      const webhookPayload = typeof body === 'string' ? JSON.parse(body || '{}') : body;
      logger.error("Failed to process Twilio webhook", {
        error: error instanceof Error ? error?.message : String(error),
        messageSid: webhookPayload?.MessageSid,
        ipAddress,
      });

      // Log security failure
      await this.logSecurityEvent('webhook_processing_failed', {
        error: error instanceof Error ? error?.message : String(error),
        ipAddress,
        signature: maskSensitiveData(signature || ''),
      });

      throw new Error(`Webhook processing failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Send emergency broadcast
   */
  public async sendEmergencyBroadcast(
    recipients: string[],
    alertMessage: string,
    from: string,
  ): Promise<
    ApiResponse<{
      totalSent: number;
      successful: number;
      failed: number;
    }>
  > {
    try {
      logger.warn("Sending emergency broadcast", {
        recipientCount: recipients.length,
        from,
      });

      const template = this.templates.get("emergency_alert");
      if (!template) {
        throw new Error("Emergency alert template not found");
      }

      const body = template.body.replace("{{alertMessage}}", alertMessage);
      let successful = 0;
      let failed = 0;

      // Send emergency messages with higher concurrency
      const batchSize = 20;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const batchPromises = batch.map(async (recipient) => {
          try {
            await this.sendSms(recipient, body, from, {
              metadata: { type: "emergency", priority: "high" },
            });
            successful++;
          } catch (error: unknown) {
            logger.error("Failed to send emergency SMS", {
              error: error instanceof Error ? error?.message : String(error),
              to: this.maskPhoneNumber(recipient),
            });
            failed++;
          }
        });

        await Promise.allSettled(batchPromises);
      }

      return {
        success: true,
        data: {
          totalSent: successful + failed,
          successful,
          failed,
        },
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to send emergency broadcast", {
        error: error instanceof Error ? error?.message : String(error),
        recipientCount: recipients.length,
      });

      throw new Error(`Emergency broadcast failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Handle message delivered webhook
   */
  private async handleMessageDelivered(
    payload: TwilioWebhookPayload,
  ): Promise<void> {
    logger.info("Message delivered", {
      messageSid: payload.MessageSid,
      to: this.maskPhoneNumber(payload.To),
    });
  }

  /**
   * Handle message failed webhook
   */
  private async handleMessageFailed(
    payload: TwilioWebhookPayload,
  ): Promise<void> {
    logger.error("Message delivery failed", {
      messageSid: payload.MessageSid,
      to: this.maskPhoneNumber(payload.To),
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage,
    });
  }

  /**
   * Handle message sent webhook
   */
  private async handleMessageSent(
    payload: TwilioWebhookPayload,
  ): Promise<void> {
    logger.info("Message sent", {
      messageSid: payload.MessageSid,
      to: this.maskPhoneNumber(payload.To),
    });
  }

  /**
   * Handle incoming message webhook
   */
  private async handleMessageReceived(
    payload: TwilioWebhookPayload,
  ): Promise<void> {
    logger.info("Message received", {
      messageSid: payload.MessageSid,
      from: this.maskPhoneNumber(payload.From),
      body: payload.MessageBody,
    });

    // Handle opt-out requests
    if (
      payload.MessageBody &&
      payload.MessageBody.toLowerCase().includes("stop")
    ) {
      // TODO: Implement opt-out logic
      logger.info("Opt-out request received", {
        from: this.maskPhoneNumber(payload.From),
      });
    }
  }

  /**
   * Add custom SMS template
   */
  public addTemplate(template: SmsTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get available templates
   */
  public getTemplates(): SmsTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return phoneNumber.slice(0, -4) + "****";
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initialize API key rotation monitoring
   */
  private async initializeKeyRotationMonitoring(): Promise<void> {
    try {
      const keyAgeKey = 'twilio_key_age';
      const lastRotation = await redisClient.get(keyAgeKey);
      
      if (!lastRotation) {
        await redisClient.set(keyAgeKey, Date.now());
        logger.info('Twilio API key age tracking initialized');
      } else {
        const daysSinceRotation = Math.floor((Date.now() - parseInt(lastRotation)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRotation >= this.keyRotationInterval) {
          await this.logSecurityEvent('api_key_rotation_required', {
            daysSinceRotation,
            rotationInterval: this.keyRotationInterval,
            keyType: 'twilio_auth_token',
          });
          
          logger.warn('Twilio API key rotation required', {
            daysSinceRotation,
            rotationInterval: this.keyRotationInterval,
          });
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to initialize key rotation monitoring', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Validate phone number security patterns
   */
  private async validatePhoneNumberSecurity(payload: TwilioWebhookPayload): Promise<void> {
    try {
      // Check for suspicious phone number patterns
      const suspiciousPatterns = [
        /^\+1234567890$/, // Test numbers
        /^\+000/, // Invalid area codes
        /^\+999/, // Reserved numbers
      ];
      
      const isToSuspicious = suspiciousPatterns.some(pattern => pattern.test(payload.To));
      const isFromSuspicious = suspiciousPatterns.some(pattern => pattern.test(payload.From));
      
      if (isToSuspicious || isFromSuspicious) {
        await this.logSecurityEvent('suspicious_phone_number_detected', {
          messageId: payload.MessageSid,
          to: this.maskPhoneNumber(payload.To),
          from: this.maskPhoneNumber(payload.From),
          status: payload.MessageStatus,
        });
      }
      
      // Check for rapid message frequency from same number
      if (payload.MessageStatus === 'received') {
        const rateLimitKey = `sms_frequency:${payload.From}`;
        const messageCount = await redisClient.incr(rateLimitKey);
        
        if (messageCount === 1) {
          await redisClient.expire(rateLimitKey, 60); // 1 minute window
        }
        
        if (messageCount > 10) { // More than 10 messages per minute
          await this.logSecurityEvent('high_frequency_messaging_detected', {
            messageId: payload.MessageSid,
            from: this.maskPhoneNumber(payload.From),
            messageCount,
            timeWindow: '1 minute',
          });
        }
      }
    } catch (error: unknown) {
      logger.error('Phone number security validation failed', {
        error: error instanceof Error ? error?.message : String(error),
        messageId: payload.MessageSid,
      });
    }
  }

  /**
   * Enhanced security event logging
   */
  private async logSecurityEvent(
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId: null,
        customerId: details?.customerId || null,
        action,
        resourceType: 'twilio_security',
        resourceId: details?.messageId || 'twilio-security',
        details: {
          service: 'twilio',
          timestamp: new Date().toISOString(),
          ...details,
        },
        ipAddress: details?.ipAddress || 'twilio-webhook',
        userAgent: 'TwilioSecurityService',
      });
    } catch (error: unknown) {
      logger.error('Failed to log security event', {
        error: error instanceof Error ? error?.message : String(error),
        action,
      });
    }
  }

  /**
   * Encrypt sensitive phone data before storage
   */
  private async encryptPhoneData(data: any): Promise<any> {
    if (!this.encryptPhoneNumbers || !data) {
      return data;
    }

    const encrypted = { ...data };
    
    // Encrypt sensitive fields
    for (const field of this.SENSITIVE_FIELDS) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        try {
          encrypted[field] = await encryptSensitiveData(encrypted[field]);
        } catch (error: unknown) {
          logger.error('Failed to encrypt sensitive field', {
            field,
            error: error instanceof Error ? error?.message : String(error),
          });
        }
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive phone data after retrieval
   */
  private async decryptPhoneData(data: any): Promise<any> {
    if (!this.encryptPhoneNumbers || !data) {
      return data;
    }

    const decrypted = { ...data };
    
    // Decrypt sensitive fields
    for (const field of this.SENSITIVE_FIELDS) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = await decryptSensitiveData(decrypted[field]);
        } catch (error: unknown) {
          logger.error('Failed to decrypt sensitive field', {
            field,
            error: error instanceof Error ? error?.message : String(error),
          });
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Validate phone number format and security
   */
  private validatePhoneNumber(phoneNumber: string): { isValid: boolean; reason?: string } {
    if (!this.enablePhoneNumberValidation) {
      return { isValid: true };
    }
    
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      return { isValid: false, reason: 'Invalid E.164 format' };
    }
    
    // Check for known test/suspicious numbers
    const suspiciousPatterns = [
      /^\+1234567890$/, // Common test number
      /^\+000/, // Invalid area code
      /^\+999/, // Reserved
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(phoneNumber))) {
      return { isValid: false, reason: 'Suspicious phone number pattern' };
    }
    
    return { isValid: true };
  }

  /**
   * Rotate API credentials (manual trigger for security operations)
   */
  public async rotateApiCredentials(newAuthToken: string, newWebhookAuthToken?: string): Promise<void> {
    try {
      // Validate new credentials by testing API call
      const testTwilio = new Twilio(this.twilio.accountSid, newAuthToken);
      
      await testTwilio.api.accounts(this.twilio.accountSid).fetch();
      
      // Update internal configuration
      this.twilio = testTwilio;
      
      if (newWebhookAuthToken) {
        this.webhookAuthToken = newWebhookAuthToken;
        this.webhookSecurityService.registerWebhook('twilio', {
          provider: 'twilio',
          secret: newWebhookAuthToken,
          tolerance: 300,
          enableReplayProtection: true,
          maxPayloadSize: 64 * 1024,
        });
      }
      
      // Update key rotation timestamp
      await redisClient.set('twilio_key_age', Date.now());
      
      await this.logSecurityEvent('api_credentials_rotated', {
        rotationDate: new Date().toISOString(),
        webhookTokenUpdated: !!newWebhookAuthToken,
      });
      
      logger.info('Twilio API credentials rotated successfully');
    } catch (error: unknown) {
      await this.logSecurityEvent('api_credentials_rotation_failed', {
        error: error instanceof Error ? error?.message : String(error),
        rotationDate: new Date().toISOString(),
      });
      
      throw new Error(`API credentials rotation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get comprehensive security status
   */
  public async getSecurityStatus(): Promise<{
    keyRotationStatus: 'current' | 'warning' | 'critical';
    daysSinceLastRotation: number;
    webhookSecurityEnabled: boolean;
    phoneEncryptionEnabled: boolean;
    auditingEnabled: boolean;
    phoneValidationEnabled: boolean;
    lastSecurityCheck: Date;
  }> {
    try {
      const keyAgeKey = 'twilio_key_age';
      const lastRotation = await redisClient.get(keyAgeKey);
      
      let daysSinceLastRotation = 0;
      let keyRotationStatus: 'current' | 'warning' | 'critical' = 'current';
      
      if (lastRotation) {
        daysSinceLastRotation = Math.floor((Date.now() - parseInt(lastRotation)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastRotation >= this.keyRotationInterval) {
          keyRotationStatus = 'critical';
        } else if (daysSinceLastRotation >= this.keyRotationInterval * 0.8) {
          keyRotationStatus = 'warning';
        }
      }
      
      return {
        keyRotationStatus,
        daysSinceLastRotation,
        webhookSecurityEnabled: !!this.webhookAuthToken,
        phoneEncryptionEnabled: this.encryptPhoneNumbers,
        auditingEnabled: this.auditAllMessages,
        phoneValidationEnabled: this.enablePhoneNumberValidation,
        lastSecurityCheck: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to get security status', {
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return {
        keyRotationStatus: 'critical',
        daysSinceLastRotation: 999,
        webhookSecurityEnabled: false,
        phoneEncryptionEnabled: false,
        auditingEnabled: false,
        phoneValidationEnabled: false,
        lastSecurityCheck: new Date(),
      };
    }
  }

  /**
   * Get service health status with security metrics
   */
  public async getServiceHealth(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    lastCheck: Date;
    details?: any;
    security?: any;
  }> {
    try {
      // Test API connectivity by fetching account details
      await this.twilio.api.accounts(this.twilio.accountSid).fetch();
      
      // Get security status
      const securityStatus = await this.getSecurityStatus();
      
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (securityStatus.keyRotationStatus === 'critical') {
        status = "degraded";
      }

      return {
        service: "twilio",
        status,
        lastCheck: new Date(),
        security: securityStatus,
      };
    } catch (error: unknown) {
      return {
        service: "twilio",
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error instanceof Error ? error?.message : String(error) },
      };
    }
  }
}

export default TwilioService;

/**
 * Security-enhanced Twilio service factory
 */
export function createSecureTwilioService(
  config: TwilioConfig,
): TwilioService {
  return new TwilioService({
    ...config,
    enableKeyRotation: true,
    keyRotationIntervalDays: 90,
    encryptPhoneNumbers: true,
    auditAllMessages: true,
    enablePhoneNumberValidation: true,
  });
}
