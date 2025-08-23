/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SENDGRID EMAIL SERVICE
 * ============================================================================
 *
 * Comprehensive SendGrid email integration supporting:
 * - Transactional email templates and delivery
 * - Customer onboarding and service communications
 * - Billing statements and payment receipts
 * - Marketing communications and service updates
 * - Email template management and personalization
 *
 * Features:
 * - Dynamic template rendering with personalization
 * - Bulk email campaigns with segmentation
 * - Email delivery tracking and analytics
 * - Bounce and spam handling
 * - Email list management and suppression
 * - A/B testing and campaign optimization
 * - Webhook handling for delivery events
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import sgMail from "@sendgrid/mail";
import {
  BaseExternalService,
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";
import { logger } from "@/utils/logger";
import { AuditLog } from "@/models/AuditLog";

/**
 * Email message interface
 */
export interface EmailMessage {
  id?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: {
    email: string;
    name?: string;
  };
  replyTo?: {
    email: string;
    name?: string;
  };
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
    contentId?: string;
  }>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  batchId?: string;
}

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent?: string;
  plainContent?: string;
  generation: "legacy" | "dynamic";
  versions: Array<{
    id: string;
    templateId: string;
    active: boolean;
    name: string;
    htmlContent?: string;
    plainContent?: string;
    subject: string;
  }>;
}

/**
 * Contact interface
 */
export interface Contact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customFields?: Record<string, any>;
  listIds?: string[];
}

/**
 * Campaign interface
 */
export interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  htmlContent?: string;
  plainContent?: string;
  templateId?: string;
  listIds?: string[];
  segmentIds?: string[];
  categories?: string[];
  sendAt?: Date;
  status?: "draft" | "scheduled" | "sent";
}

/**
 * Webhook event interface
 */
export interface SendGridWebhookEvent {
  email: string;
  timestamp: number;
  event:
    | "processed"
    | "delivered"
    | "open"
    | "click"
    | "bounce"
    | "dropped"
    | "spamreport"
    | "unsubscribe"
    | "group_unsubscribe"
    | "group_resubscribe";
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  sg_event_id: string;
  sg_message_id: string;
  category?: string[];
  asm_group_id?: number;
}

/**
 * Service configuration
 */
interface SendGridConfig extends ExternalServiceConfig {
  apiKey: string;
  webhookVerificationKey?: string;
  defaultFromEmail: string;
  defaultFromName?: string;
}

/**
 * SendGrid email service implementation
 */
export class SendGridService extends BaseExternalService {
  private apiKey: string;
  private webhookVerificationKey?: string;
  private defaultFrom: {
    email: string;
    name?: string;
  };

  constructor(config: SendGridConfig) {
    super({
      ...config,
      serviceName: "sendgrid",
      baseURL: "https://api.sendgrid.com/v3",
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requests: 600, // SendGrid's default rate limit
        window: 60, // per minute
      },
    });

    this.apiKey = config.apiKey;
    this.webhookVerificationKey = config.webhookVerificationKey;
    this.defaultFrom = {
      email: config.defaultFromEmail,
      name: config.defaultFromName,
    };

    sgMail.setApiKey(this.apiKey);
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Send single email
   */
  public async sendEmail(
    message: EmailMessage,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<{ messageId: string; status: string }>> {
    try {
      logger.info("Sending email", {
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        templateId: message.templateId,
      });

      // Prepare message data
      const emailData: any = {
        to: message.to,
        from: message?.from || this.defaultFrom,
        subject: message.subject,
      };

      if (message.cc) emailData.cc = message.cc;
      if (message.bcc) emailData.bcc = message.bcc;
      if (message.replyTo) emailData.replyTo = message.replyTo;

      // Use template or direct content
      if (message.templateId && message.dynamicTemplateData) {
        emailData.templateId = message.templateId;
        emailData.dynamicTemplateData = message.dynamicTemplateData;
      } else {
        if (message.html) emailData.html = message.html;
        if (message.text) emailData.text = message.text;
      }

      if (message.attachments) emailData.attachments = message.attachments;
      if (message.categories) emailData.categories = message.categories;
      if (message.customArgs) emailData.customArgs = message.customArgs;
      if (message.sendAt) emailData.sendAt = message.sendAt;
      if (message.batchId) emailData.batchId = message.batchId;

      const [response] = await sgMail.send(emailData);

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "email_sent",
        resourceType: "sendgrid_email",
        resourceId: response.headers["x-message-id"],
        details: {
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          templateId: message.templateId,
          status: response.statusCode,
        },
        ipAddress: "system",
        userAgent: "SendGridService",
      });

      return {
        success: true,
        data: {
          messageId: response.headers["x-message-id"],
          status: response.statusCode.toString(),
        },
        statusCode: response.statusCode,
      };
    } catch (error: unknown) {
      logger.error("Failed to send email", {
        error: error instanceof Error ? error?.message : String(error),
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
      });

      throw new Error(`Email sending failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Send bulk emails
   */
  public async sendBulkEmails(
    messages: EmailMessage[],
    options?: ApiRequestOptions,
  ): Promise<
    ApiResponse<{
      totalSent: number;
      successful: number;
      failed: Array<{ email: string; error: string }>;
    }>
  > {
    try {
      logger.info("Sending bulk emails", {
        messageCount: messages.length,
      });

      let successful = 0;
      const failed: Array<{ email: string; error: string }> = [];

      // Process emails in batches to respect rate limits
      const batchSize = 50;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        const batchPromises = batch.map(async (message) => {
          try {
            await this.sendEmail(message);
            successful++;
          } catch (error: unknown) {
            const recipients = Array.isArray(message.to)
              ? message.to.join(", ")
              : message.to;
            failed.push({
              email: recipients,
              error: error instanceof Error ? error?.message : String(error),
            });
          }
        });

        await Promise.allSettled(batchPromises);

        // Add delay between batches to respect rate limits
        if (i + batchSize < messages.length) {
          await this.sleep(1000);
        }
      }

      return {
        success: true,
        data: {
          totalSent: messages.length,
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
      logger.error("Failed to send bulk emails", {
        error: error instanceof Error ? error?.message : String(error),
        messageCount: messages.length,
      });

      throw new Error(`Bulk email sending failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Send transactional email with template
   */
  public async sendTransactionalEmail(
    templateId: string,
    to: string,
    dynamicTemplateData: Record<string, any>,
    options: {
      from?: { email: string; name?: string };
      subject?: string;
      categories?: string[];
      customArgs?: Record<string, string>;
    } = {},
  ): Promise<ApiResponse<{ messageId: string; status: string }>> {
    const message: EmailMessage = {
      to,
      from: options?.from || this.defaultFrom,
      subject: options?.subject || "Important Update",
      templateId,
      dynamicTemplateData,
      categories: options.categories,
      customArgs: options.customArgs,
    };

    return this.sendEmail(message);
  }

  /**
   * Get email templates
   */
  public async getTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const response = await this.get<{
        result: Array<{
          id: string;
          name: string;
          generation: string;
          versions: Array<{
            id: string;
            template_id: string;
            active: number;
            name: string;
            html_content?: string;
            plain_content?: string;
            subject: string;
          }>;
        }>;
      }>("/templates", {}, { skipAuth: false });

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve templates");
      }

      const templates: EmailTemplate[] = response.data.result.map(
        (template) => ({
          id: template.id,
          name: template.name,
          subject: template.versions[0]?.subject || "",
          htmlContent: template.versions[0]?.html_content,
          plainContent: template.versions[0]?.plain_content,
          generation: template.generation as "legacy" | "dynamic",
          versions: template.versions.map((version) => ({
            id: version.id,
            templateId: version.template_id,
            active: version.active === 1,
            name: version.name,
            htmlContent: version.html_content,
            plainContent: version.plain_content,
            subject: version.subject,
          })),
        }),
      );

      return {
        success: true,
        data: templates,
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get email templates", {
        error: error instanceof Error ? error?.message : String(error),
      });

      throw new Error(`Template retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Add contact to list
   */
  public async addContact(
    contact: Contact,
    listIds?: string[],
  ): Promise<ApiResponse<{ id: string; email: string }>> {
    try {
      const contactData = {
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        phone_number: contact.phone,
        address_line_1: contact.address?.line1,
        address_line_2: contact.address?.line2,
        city: contact.address?.city,
        state_province_region: contact.address?.state,
        postal_code: contact.address?.postalCode,
        country: contact.address?.country,
        custom_fields: contact.customFields,
        list_ids: listIds || contact?.listIds || [],
      };

      const response = await this.put<{
        job_id: string;
      }>("/marketing/contacts", {
        contacts: [contactData],
      });

      if (!response.success || !response.data) {
        throw new Error("Failed to add contact");
      }

      return {
        success: true,
        data: {
          id: response.data.job_id,
          email: contact.email,
        },
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to add contact", {
        error: error instanceof Error ? error?.message : String(error),
        email: contact.email,
      });

      throw new Error(`Contact creation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Create email campaign
   */
  public async createCampaign(
    campaign: EmailCampaign,
  ): Promise<ApiResponse<{ id: string; name: string; status: string }>> {
    try {
      const campaignData = {
        name: campaign.name,
        send_to: {
          list_ids: campaign.listIds,
          segment_ids: campaign.segmentIds,
        },
        email_config: {
          subject: campaign.subject,
          html_content: campaign.htmlContent,
          plain_content: campaign.plainContent,
          generate_plain_content: !campaign.plainContent,
          editor: "code",
        },
        sender: {
          from: {
            email: campaign.fromEmail,
            name: campaign.fromName,
          },
          reply_to: {
            email: campaign?.replyToEmail || campaign.fromEmail,
          },
        },
        categories: campaign.categories,
      };

      const response = await this.post<{
        id: string;
        name: string;
        status: string;
      }>("/marketing/singlesends", campaignData);

      if (!response.success || !response.data) {
        throw new Error("Failed to create campaign");
      }

      return {
        success: true,
        data: response.data,
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to create campaign", {
        error: error instanceof Error ? error?.message : String(error),
        campaignName: campaign.name,
      });

      throw new Error(`Campaign creation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Schedule campaign
   */
  public async scheduleCampaign(
    campaignId: string,
    sendAt: Date,
  ): Promise<ApiResponse<{ id: string; status: string; sendAt: Date }>> {
    try {
      const response = await this.patch<{
        id: string;
        status: string;
        send_at: string;
      }>(`/marketing/singlesends/${campaignId}/schedule`, {
        send_at: sendAt.toISOString(),
      });

      if (!response.success || !response.data) {
        throw new Error("Failed to schedule campaign");
      }

      return {
        success: true,
        data: {
          id: response.data.id,
          status: response.data.status,
          sendAt: new Date(response.data.send_at),
        },
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to schedule campaign", {
        error: error instanceof Error ? error?.message : String(error),
        campaignId,
        sendAt,
      });

      throw new Error(`Campaign scheduling failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Process webhook event
   */
  public async processWebhookEvent(
    events: SendGridWebhookEvent[],
  ): Promise<ApiResponse<{ processed: number; skipped: number }>> {
    try {
      logger.info("Processing SendGrid webhook events", {
        eventCount: events.length,
      });

      let processed = 0;
      let skipped = 0;

      for (const event of events) {
        try {
          await this.handleWebhookEvent(event);
          processed++;
        } catch (error: unknown) {
          logger.warn("Failed to process webhook event", {
            error: error instanceof Error ? error?.message : String(error),
            eventId: event.sg_event_id,
            eventType: event.event,
          });
          skipped++;
        }
      }

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "webhook_batch_processed",
        resourceType: "sendgrid_webhook",
        resourceId: `batch-${Date.now()}`,
        details: {
          processed,
          skipped,
          totalEvents: events.length,
        },
        ipAddress: "sendgrid",
        userAgent: "SendGridWebhook",
      });

      return {
        success: true,
        data: { processed, skipped },
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to process webhook events", {
        error: error instanceof Error ? error?.message : String(error),
        eventCount: events.length,
      });

      throw new Error(`Webhook processing failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Handle individual webhook event
   */
  private async handleWebhookEvent(event: SendGridWebhookEvent): Promise<void> {
    switch (event.event) {
      case "delivered":
        await this.handleEmailDelivered(event);
        break;

      case "open":
        await this.handleEmailOpened(event);
        break;

      case "click":
        await this.handleEmailClicked(event);
        break;

      case "bounce":
        await this.handleEmailBounced(event);
        break;

      case "dropped":
        await this.handleEmailDropped(event);
        break;

      case "spamreport":
        await this.handleSpamReport(event);
        break;

      case "unsubscribe":
        await this.handleUnsubscribe(event);
        break;

      default:
        logger.info("Unhandled webhook event type", {
          eventType: event.event,
          eventId: event.sg_event_id,
        });
    }
  }

  /**
   * Handle email delivered event
   */
  private async handleEmailDelivered(
    event: SendGridWebhookEvent,
  ): Promise<void> {
    logger.info("Email delivered", {
      email: event.email,
      messageId: event.sg_message_id,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle email opened event
   */
  private async handleEmailOpened(event: SendGridWebhookEvent): Promise<void> {
    logger.info("Email opened", {
      email: event.email,
      messageId: event.sg_message_id,
      timestamp: event.timestamp,
      userAgent: event.useragent,
    });
  }

  /**
   * Handle email clicked event
   */
  private async handleEmailClicked(event: SendGridWebhookEvent): Promise<void> {
    logger.info("Email link clicked", {
      email: event.email,
      messageId: event.sg_message_id,
      url: event.url,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle email bounced event
   */
  private async handleEmailBounced(event: SendGridWebhookEvent): Promise<void> {
    logger.warn("Email bounced", {
      email: event.email,
      messageId: event.sg_message_id,
      reason: event.reason,
      status: event.status,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle email dropped event
   */
  private async handleEmailDropped(event: SendGridWebhookEvent): Promise<void> {
    logger.warn("Email dropped", {
      email: event.email,
      messageId: event.sg_message_id,
      reason: event.reason,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle spam report event
   */
  private async handleSpamReport(event: SendGridWebhookEvent): Promise<void> {
    logger.warn("Spam report received", {
      email: event.email,
      messageId: event.sg_message_id,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle unsubscribe event
   */
  private async handleUnsubscribe(event: SendGridWebhookEvent): Promise<void> {
    logger.info("Email unsubscribe", {
      email: event.email,
      messageId: event.sg_message_id,
      timestamp: event.timestamp,
    });
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
      // Test API connectivity by getting user profile
      await this.get("/user/profile");

      return {
        service: "sendgrid",
        status: "healthy",
        lastCheck: new Date(),
      };
    } catch (error: unknown) {
      return {
        service: "sendgrid",
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error instanceof Error ? error?.message : String(error) },
      };
    }
  }
}

export default SendGridService;
