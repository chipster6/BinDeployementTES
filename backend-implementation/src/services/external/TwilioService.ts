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
}

/**
 * Twilio SMS service implementation
 */
export class TwilioService extends BaseExternalService {
  private twilio: Twilio;
  private webhookAuthToken?: string;
  private templates: Map<string, SmsTemplate> = new Map();

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

    this.initializeTemplates();
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

      const message = await this.twilio.messages.create(messageData);

      const smsMessage: SmsMessage = {
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
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
        metadata: {
          requestId: message.sid,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to send SMS message", {
        error: error.message,
        to: this.maskPhoneNumber(to),
        from,
      });

      throw new Error(`SMS sending failed: ${error.message}`);
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
    } catch (error) {
      logger.error("Failed to send templated SMS", {
        error: error.message,
        to: this.maskPhoneNumber(to),
        templateId,
      });

      throw new Error(`Templated SMS sending failed: ${error.message}`);
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
            let messageBody = request.body || "";

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
          } catch (error) {
            failed.push({
              to: recipient.to,
              error: error.message,
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
          requestId: `bulk-${Date.now()}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to send bulk SMS", {
        error: error.message,
        recipientCount: request.recipients.length,
      });

      throw new Error(`Bulk SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Get message status
   */
  public async getMessageStatus(
    messageSid: string,
  ): Promise<ApiResponse<SmsMessage>> {
    try {
      const message = await this.twilio.messages(messageSid).fetch();

      const smsMessage: SmsMessage = {
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
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
        metadata: {
          requestId: messageSid,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get message status", {
        error: error.message,
        messageSid,
      });

      throw new Error(`Message status retrieval failed: ${error.message}`);
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

      const messages = await this.twilio.messages.list(options);

      const smsMessages: SmsMessage[] = messages.map((message) => ({
        id: message.sid,
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status as any,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
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
          requestId: `history-${phoneNumber}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get message history", {
        error: error.message,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      });

      throw new Error(`Message history retrieval failed: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook
   */
  public async processWebhook(
    body: TwilioWebhookPayload,
    signature?: string,
    url?: string,
  ): Promise<ApiResponse<{ processed: boolean; messageId: string }>> {
    try {
      // Validate webhook signature if auth token is provided
      if (this.webhookAuthToken && signature && url) {
        const isValid = this.twilio.validateRequest(
          this.webhookAuthToken,
          signature,
          url,
          body,
        );

        if (!isValid) {
          throw new Error("Invalid webhook signature");
        }
      }

      logger.info("Processing Twilio webhook", {
        messageSid: body.MessageSid,
        status: body.MessageStatus,
        to: this.maskPhoneNumber(body.To),
      });

      // Process different message statuses
      switch (body.MessageStatus) {
        case "delivered":
          await this.handleMessageDelivered(body);
          break;

        case "failed":
        case "undelivered":
          await this.handleMessageFailed(body);
          break;

        case "sent":
          await this.handleMessageSent(body);
          break;

        case "received":
          await this.handleMessageReceived(body);
          break;

        default:
          logger.info("Unhandled message status", {
            status: body.MessageStatus,
          });
      }

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "webhook_processed",
        resourceType: "twilio_webhook",
        resourceId: body.MessageSid,
        details: {
          status: body.MessageStatus,
          to: this.maskPhoneNumber(body.To),
          from: body.From,
        },
        ipAddress: "twilio",
        userAgent: "TwilioWebhook",
      });

      return {
        success: true,
        data: { processed: true, messageId: body.MessageSid },
        statusCode: 200,
        metadata: {
          requestId: body.MessageSid,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to process Twilio webhook", {
        error: error.message,
        messageSid: body.MessageSid,
      });

      throw new Error(`Webhook processing failed: ${error.message}`);
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
          } catch (error) {
            logger.error("Failed to send emergency SMS", {
              error: error.message,
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
          requestId: `emergency-${Date.now()}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to send emergency broadcast", {
        error: error.message,
        recipientCount: recipients.length,
      });

      throw new Error(`Emergency broadcast failed: ${error.message}`);
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
   * Get service health status
   */
  public async getServiceHealth(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    lastCheck: Date;
    details?: any;
  }> {
    try {
      // Test API connectivity by fetching account details
      await this.twilio.api.accounts(this.twilio.accountSid).fetch();

      return {
        service: "twilio",
        status: "healthy",
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        service: "twilio",
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error.message },
      };
    }
  }
}

export default TwilioService;
