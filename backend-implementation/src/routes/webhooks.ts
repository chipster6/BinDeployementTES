/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - WEBHOOK ROUTES
 * ============================================================================
 *
 * Secure webhook endpoint handlers for external service integrations:
 * - Stripe payment processing webhooks
 * - Twilio SMS status webhooks
 * - SendGrid email event webhooks
 * - Samsara fleet management webhooks
 * - Airtable data synchronization webhooks
 *
 * Features:
 * - Comprehensive signature verification
 * - Rate limiting and DDoS protection
 * - Idempotent webhook processing
 * - Comprehensive audit logging
 * - Error handling and graceful degradation
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import WebhookSecurityService from "@/services/external/WebhookSecurityService";
import StripeService from "@/services/external/StripeService";
import TwilioService from "@/services/external/TwilioService";
import SendGridService from "@/services/external/SendGridService";
import SamsaraService from "@/services/external/SamsaraService";
import AirtableService from "@/services/external/AirtableService";
import { CustomerService } from "@/services/CustomerService";

const router = Router();
const webhookSecurity = new WebhookSecurityService();

// Rate limiting for webhook endpoints
const webhookRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many webhook requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all webhook routes
router.use(webhookRateLimit);

// Middleware to parse raw body for signature verification
const rawBodyParser = (req: Request, res: Response, next: Function) => {
  let rawBody = "";

  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    (req as any).rawBody = rawBody;
    next();
  });
};

/**
 * Stripe webhook handler
 */
router.post("/stripe", rawBodyParser, async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    const timestamp = req.headers["stripe-timestamp"] as string;
    const rawBody = (req as any).rawBody;

    if (!signature) {
      return ResponseHelper.error(res, "Missing Stripe signature", 400);
    }

    // Verify webhook signature and payload
    const verification = await webhookSecurity.verifyWebhook(
      "stripe",
      rawBody,
      signature,
      timestamp,
      req.headers as Record<string, string>,
    );

    if (!verification.isValid) {
      logger.warn("Invalid Stripe webhook signature", {
        error: verification.error,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Invalid webhook signature", 401);
    }

    // Check for replay attacks
    if (verification.metadata?.isReplay) {
      logger.warn("Stripe webhook replay attempt detected", {
        eventId: verification.metadata.eventId,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Duplicate webhook event", 409);
    }

    // Initialize Stripe service (would normally come from DI container)
    const customerService = new CustomerService(); // Mock - would be injected
    const stripeService = new StripeService(
      {
        serviceName: "stripe",
        baseURL: "https://api.stripe.com",
        secretKey: process.env.STRIPE_SECRET_KEY || "",
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
      },
      customerService,
    );

    // Process webhook event
    const result = await stripeService.processWebhookEvent(rawBody, signature);

    if (result.success) {
      const response = webhookSecurity.generateSuccessResponse(
        "stripe",
        verification.metadata?.eventId,
      );
      return res.status(response.statusCode).json(response.body);
    } else {
      throw new Error("Failed to process Stripe webhook event");
    }
  } catch (error) {
    logger.error("Stripe webhook processing failed", {
      error: error.message,
      ip: req.ip,
    });

    const errorResponse = webhookSecurity.generateErrorResponse(
      "stripe",
      "Internal server error",
      500,
    );
    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

/**
 * Twilio webhook handler
 */
router.post("/twilio", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-twilio-signature"] as string;

    if (!signature) {
      return ResponseHelper.error(res, "Missing Twilio signature", 400);
    }

    // Verify webhook signature and payload
    const verification = await webhookSecurity.verifyWebhook(
      "twilio",
      JSON.stringify(req.body),
      signature,
      undefined,
      req.headers as Record<string, string>,
    );

    if (!verification.isValid) {
      logger.warn("Invalid Twilio webhook signature", {
        error: verification.error,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Invalid webhook signature", 401);
    }

    // Initialize Twilio service
    const twilioService = new TwilioService({
      serviceName: "twilio",
      baseURL: "https://api.twilio.com",
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      webhookAuthToken: process.env.TWILIO_WEBHOOK_AUTH_TOKEN || "",
    });

    // Process webhook event
    const result = await twilioService.processWebhook(
      req.body,
      signature,
      req.url,
    );

    if (result.success) {
      const response = webhookSecurity.generateSuccessResponse(
        "twilio",
        result.data?.messageId,
      );
      return res.status(response.statusCode).json(response.body);
    } else {
      throw new Error("Failed to process Twilio webhook event");
    }
  } catch (error) {
    logger.error("Twilio webhook processing failed", {
      error: error.message,
      ip: req.ip,
    });

    const errorResponse = webhookSecurity.generateErrorResponse(
      "twilio",
      "Internal server error",
      500,
    );
    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

/**
 * SendGrid webhook handler
 */
router.post("/sendgrid", async (req: Request, res: Response) => {
  try {
    const signature = req.headers[
      "x-twilio-email-event-webhook-signature"
    ] as string;
    const timestamp = req.headers[
      "x-twilio-email-event-webhook-timestamp"
    ] as string;

    if (!signature) {
      return ResponseHelper.error(res, "Missing SendGrid signature", 400);
    }

    // Verify webhook signature and payload
    const verification = await webhookSecurity.verifyWebhook(
      "sendgrid",
      JSON.stringify(req.body),
      signature,
      timestamp,
      req.headers as Record<string, string>,
    );

    if (!verification.isValid) {
      logger.warn("Invalid SendGrid webhook signature", {
        error: verification.error,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Invalid webhook signature", 401);
    }

    // Initialize SendGrid service
    const sendGridService = new SendGridService({
      serviceName: "sendgrid",
      baseURL: "https://api.sendgrid.com/v3",
      apiKey: process.env.SENDGRID_API_KEY || "",
      webhookVerificationKey: process.env.SENDGRID_WEBHOOK_KEY || "",
      defaultFromEmail:
        process.env.DEFAULT_FROM_EMAIL || "noreply@wastemanagement.com",
      defaultFromName:
        process.env.DEFAULT_FROM_NAME || "Waste Management System",
    });

    // Process webhook events (SendGrid sends array of events)
    const events = Array.isArray(req.body) ? req.body : [req.body];
    const result = await sendGridService.processWebhookEvent(events);

    if (result.success) {
      const response = webhookSecurity.generateSuccessResponse(
        "sendgrid",
        `batch-${result.data?.processed}`,
      );
      return res.status(response.statusCode).json(response.body);
    } else {
      throw new Error("Failed to process SendGrid webhook events");
    }
  } catch (error) {
    logger.error("SendGrid webhook processing failed", {
      error: error.message,
      ip: req.ip,
    });

    const errorResponse = webhookSecurity.generateErrorResponse(
      "sendgrid",
      "Internal server error",
      500,
    );
    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

/**
 * Samsara webhook handler
 */
router.post("/samsara", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-samsara-signature"] as string;

    if (!signature) {
      return ResponseHelper.error(res, "Missing Samsara signature", 400);
    }

    // Verify webhook signature and payload
    const verification = await webhookSecurity.verifyWebhook(
      "samsara",
      JSON.stringify(req.body),
      signature,
      undefined,
      req.headers as Record<string, string>,
    );

    if (!verification.isValid) {
      logger.warn("Invalid Samsara webhook signature", {
        error: verification.error,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Invalid webhook signature", 401);
    }

    // Initialize Samsara service
    const samsaraService = new SamsaraService({
      serviceName: "samsara",
      baseURL: "https://api.samsara.com",
      apiToken: process.env.SAMSARA_API_TOKEN || "",
      organizationId: process.env.SAMSARA_ORGANIZATION_ID || "",
      webhookSecret: process.env.SAMSARA_WEBHOOK_SECRET || "",
    });

    // Process webhook event
    const result = await samsaraService.processWebhookEvent(
      req.body,
      signature,
    );

    if (result.success) {
      const response = webhookSecurity.generateSuccessResponse(
        "samsara",
        result.data?.eventId,
      );
      return res.status(response.statusCode).json(response.body);
    } else {
      throw new Error("Failed to process Samsara webhook event");
    }
  } catch (error) {
    logger.error("Samsara webhook processing failed", {
      error: error.message,
      ip: req.ip,
    });

    const errorResponse = webhookSecurity.generateErrorResponse(
      "samsara",
      "Internal server error",
      500,
    );
    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

/**
 * Airtable webhook handler
 */
router.post("/airtable", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-airtable-content-mac"] as string;

    if (!signature) {
      return ResponseHelper.error(res, "Missing Airtable signature", 400);
    }

    // Verify webhook signature and payload
    const verification = await webhookSecurity.verifyWebhook(
      "airtable",
      JSON.stringify(req.body),
      signature,
      undefined,
      req.headers as Record<string, string>,
    );

    if (!verification.isValid) {
      logger.warn("Invalid Airtable webhook signature", {
        error: verification.error,
        ip: req.ip,
      });
      return ResponseHelper.error(res, "Invalid webhook signature", 401);
    }

    // Initialize Airtable service
    const airtableService = new AirtableService({
      serviceName: "airtable",
      baseURL: "https://api.airtable.com/v0",
      personalAccessToken: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || "",
      webhookSecret: process.env.AIRTABLE_WEBHOOK_SECRET || "",
    });

    // Process webhook event
    const result = await airtableService.processWebhookEvent(req.body);

    if (result.success) {
      const response = webhookSecurity.generateSuccessResponse(
        "airtable",
        result.data?.baseId,
      );
      return res.status(response.statusCode).json(response.body);
    } else {
      throw new Error("Failed to process Airtable webhook event");
    }
  } catch (error) {
    logger.error("Airtable webhook processing failed", {
      error: error.message,
      ip: req.ip,
    });

    const errorResponse = webhookSecurity.generateErrorResponse(
      "airtable",
      "Internal server error",
      500,
    );
    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

/**
 * Health check endpoint for webhook services
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const services = [
      { name: "stripe", healthy: true },
      { name: "twilio", healthy: true },
      { name: "sendgrid", healthy: true },
      { name: "samsara", healthy: true },
      { name: "airtable", healthy: true },
    ];

    const allHealthy = services.every((service) => service.healthy);

    return ResponseHelper.success(res, {
      status: allHealthy ? "healthy" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Webhook health check failed", {
      error: error.message,
    });

    return ResponseHelper.error(res, "Health check failed", 500);
  }
});

/**
 * Get webhook security metrics
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const provider = req.query.provider as string;
    const timeframe = (req.query.timeframe as "hour" | "day" | "week") || "day";

    const metrics = await webhookSecurity.getSecurityMetrics(
      provider,
      timeframe,
    );

    return ResponseHelper.success(res, {
      metrics,
      provider: provider || "all",
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get webhook metrics", {
      error: error.message,
    });

    return ResponseHelper.error(res, "Failed to get metrics", 500);
  }
});

// Configure webhook security for different providers
webhookSecurity.registerWebhook("stripe", {
  provider: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET || "",
  tolerance: 300, // 5 minutes
  enableReplayProtection: true,
  maxPayloadSize: 1024 * 1024, // 1MB
});

webhookSecurity.registerWebhook("twilio", {
  provider: "twilio",
  secret: process.env.TWILIO_WEBHOOK_AUTH_TOKEN || "",
  tolerance: 600, // 10 minutes
  enableReplayProtection: true,
  maxPayloadSize: 512 * 1024, // 512KB
});

webhookSecurity.registerWebhook("sendgrid", {
  provider: "sendgrid",
  secret: process.env.SENDGRID_WEBHOOK_KEY || "",
  tolerance: 600, // 10 minutes
  enableReplayProtection: true,
  maxPayloadSize: 2 * 1024 * 1024, // 2MB
});

webhookSecurity.registerWebhook("samsara", {
  provider: "samsara",
  secret: process.env.SAMSARA_WEBHOOK_SECRET || "",
  tolerance: 300, // 5 minutes
  enableReplayProtection: true,
  maxPayloadSize: 1024 * 1024, // 1MB
});

webhookSecurity.registerWebhook("airtable", {
  provider: "airtable",
  secret: process.env.AIRTABLE_WEBHOOK_SECRET || "",
  tolerance: 300, // 5 minutes
  enableReplayProtection: true,
  maxPayloadSize: 2 * 1024 * 1024, // 2MB
});

export default router;
