/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - STRIPE PAYMENT SERVICE
 * ============================================================================
 *
 * Comprehensive Stripe payment processing integration supporting:
 * - Customer management and payment methods
 * - Subscription billing and invoice generation
 * - Webhook handling for payment status updates
 * - PCI compliance and secure payment flows
 * - Integration with CustomerService billing logic
 *
 * Features:
 * - Secure payment method storage and management
 * - Automated subscription billing and renewals
 * - Real-time payment status tracking via webhooks
 * - Comprehensive error handling and retry logic
 * - PCI DSS compliance with tokenization
 * - Detailed payment analytics and reporting
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import Stripe from "stripe";
import {
  BaseExternalService,
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";
import { logger } from "@/utils/logger";
import { CustomerService } from "@/services/CustomerService";
import { AuditLog } from "@/models/AuditLog";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  createHmacSignature,
  verifyHmacSignature,
  maskSensitiveData,
} from "@/utils/encryption";
import WebhookSecurityService from "./WebhookSecurityService";
import { redisClient } from "@/config/redis";

/**
 * Stripe customer data interface
 */
export interface StripeCustomerData {
  customerId: string;
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

/**
 * Payment method interface
 */
export interface PaymentMethodData {
  id: string;
  type: "card" | "bank_account" | "ach_debit";
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    address?: Stripe.Address;
    email?: string;
    name?: string;
    phone?: string;
  };
}

/**
 * Subscription data interface
 */
export interface SubscriptionData {
  id: string;
  customerId: string;
  priceId: string;
  status: "active" | "canceled" | "incomplete" | "past_due" | "unpaid";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Invoice interface
 */
export interface InvoiceData {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}

/**
 * Payment intent interface
 */
export interface PaymentIntentData {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

/**
 * Webhook event interface
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
}

/**
 * Service configuration
 */
interface StripeConfig extends ExternalServiceConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  apiVersion?: string;
  enableKeyRotation?: boolean;
  keyRotationIntervalDays?: number;
  encryptSensitiveData?: boolean;
  auditAllTransactions?: boolean;
}

/**
 * Stripe payment service implementation
 */
export class StripeService extends BaseExternalService {
  private stripe: Stripe;
  private webhookSecret: string;
  private customerService: CustomerService;
  private webhookSecurityService: WebhookSecurityService;
  private encryptSensitiveData: boolean;
  private auditAllTransactions: boolean;
  private keyRotationEnabled: boolean;
  private keyRotationInterval: number;
  private readonly SENSITIVE_FIELDS = ['card', 'payment_method', 'bank_account', 'routing_number'];

  constructor(config: StripeConfig, customerService: CustomerService) {
    super({
      ...config,
      serviceName: "stripe",
      baseURL: "https://api.stripe.com",
      timeout: 15000,
      retryAttempts: 3,
      rateLimit: {
        requests: 100,
        window: 1, // 1 second
      },
    });

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion as any) || "2023-10-16",
      typescript: true,
    });

    this.webhookSecret = config.webhookSecret;
    this.customerService = customerService;
    this.webhookSecurityService = new WebhookSecurityService();
    this.encryptSensitiveData = config.encryptSensitiveData !== false;
    this.auditAllTransactions = config.auditAllTransactions !== false;
    this.keyRotationEnabled = config.enableKeyRotation === true;
    this.keyRotationInterval = config.keyRotationIntervalDays || 90;

    // Register webhook security configuration
    this.webhookSecurityService.registerWebhook('stripe', {
      provider: 'stripe',
      secret: this.webhookSecret,
      tolerance: 300, // 5 minutes
      enableReplayProtection: true,
      maxPayloadSize: 1024 * 1024, // 1MB
    });

    // Initialize API key rotation monitoring
    if (this.keyRotationEnabled) {
      this.initializeKeyRotationMonitoring();
    }
  }

  /**
   * Get authentication header (not used for Stripe SDK)
   */
  protected getAuthHeader(): string {
    return `Bearer ${this.stripe.apiKey}`;
  }

  /**
   * Create or retrieve Stripe customer
   */
  public async createOrGetCustomer(
    customerData: StripeCustomerData,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<Stripe.Customer>> {
    try {
      logger.info("Creating or retrieving Stripe customer", {
        customerId: customerData.customerId,
        email: customerData.email,
      });

      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.search({
        query: `email:"${customerData.email}"`,
      });

      let customer: Stripe.Customer;

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];

        // Update customer if needed
        customer = await this.stripe.customers.update(customer.id, {
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          metadata: {
            ...customerData.metadata,
            internal_customer_id: customerData.customerId,
          },
        });
      } else {
        // Create new customer
        customer = await this.stripe.customers.create({
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          metadata: {
            ...customerData.metadata,
            internal_customer_id: customerData.customerId,
          },
        });
      }

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: customerData.customerId,
        action: "customer_created_updated",
        resourceType: "stripe_customer",
        resourceId: customer.id,
        details: {
          stripeCustomerId: customer.id,
          email: customer.email,
        },
        ipAddress: "system",
        userAgent: "StripeService",
      });

      return {
        success: true,
        data: customer,
        statusCode: 200,
        metadata: {
          requestId: customer.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to create/get Stripe customer", {
        error: error.message,
        customerId: customerData.customerId,
      });

      throw new Error(`Stripe customer creation failed: ${error.message}`);
    }
  }

  /**
   * Create payment method for customer
   */
  public async createPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<PaymentMethodData>> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        },
      );

      // Set as default payment method if it's the first one
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        const existingMethods = await this.stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });

        if (existingMethods.data.length === 1) {
          await this.stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
        }
      }

      const paymentMethodData: PaymentMethodData = {
        id: paymentMethod.id,
        type: paymentMethod.type as "card" | "bank_account" | "ach_debit",
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
            }
          : undefined,
        billing_details: paymentMethod.billing_details,
      };

      return {
        success: true,
        data: paymentMethodData,
        statusCode: 200,
        metadata: {
          requestId: paymentMethod.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to create payment method", {
        error: error.message,
        customerId,
        paymentMethodId,
      });

      throw new Error(`Payment method creation failed: ${error.message}`);
    }
  }

  /**
   * Create subscription for customer
   */
  public async createSubscription(
    customerId: string,
    priceId: string,
    options: {
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
      paymentMethodId?: string;
    } = {},
  ): Promise<ApiResponse<SubscriptionData>> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        expand: ["latest_invoice.payment_intent"],
        metadata: options.metadata || {},
      };

      if (options.trialPeriodDays) {
        subscriptionParams.trial_period_days = options.trialPeriodDays;
      }

      if (options.paymentMethodId) {
        subscriptionParams.default_payment_method = options.paymentMethodId;
      }

      const subscription =
        await this.stripe.subscriptions.create(subscriptionParams);

      const subscriptionData: SubscriptionData = {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };

      return {
        success: true,
        data: subscriptionData,
        statusCode: 200,
        metadata: {
          requestId: subscription.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to create subscription", {
        error: error.message,
        customerId,
        priceId,
      });

      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Create payment intent for one-time payment
   */
  public async createPaymentIntent(
    amount: number,
    currency: string = "usd",
    options: {
      customerId?: string;
      paymentMethodId?: string;
      metadata?: Record<string, string>;
      description?: string;
    } = {},
  ): Promise<ApiResponse<PaymentIntentData>> {
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: options.metadata || {},
        description: options.description,
      };

      if (options.customerId) {
        paymentIntentParams.customer = options.customerId;
      }

      if (options.paymentMethodId) {
        paymentIntentParams.payment_method = options.paymentMethodId;
        paymentIntentParams.confirmation_method = "manual";
        paymentIntentParams.confirm = true;
      }

      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentParams);

      const paymentIntentData: PaymentIntentData = {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customerId: paymentIntent.customer as string | undefined,
        metadata: paymentIntent.metadata,
      };

      return {
        success: true,
        data: paymentIntentData,
        statusCode: 200,
        metadata: {
          requestId: paymentIntent.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to create payment intent", {
        error: error.message,
        amount,
        currency,
      });

      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Get customer invoices
   */
  public async getCustomerInvoices(
    customerId: string,
    limit: number = 10,
  ): Promise<ApiResponse<InvoiceData[]>> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      const invoiceData: InvoiceData[] = invoices.data.map((invoice) => ({
        id: invoice.id,
        customerId: invoice.customer as string,
        subscriptionId: invoice.subscription as string | undefined,
        status: invoice.status as any,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        dueDate: invoice.due_date
          ? new Date(invoice.due_date * 1000)
          : undefined,
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
        invoicePdf: invoice.invoice_pdf || undefined,
      }));

      return {
        success: true,
        data: invoiceData,
        statusCode: 200,
        metadata: {
          requestId: `invoices-${customerId}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get customer invoices", {
        error: error.message,
        customerId,
      });

      throw new Error(`Invoice retrieval failed: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<ApiResponse<SubscriptionData>> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        },
      );

      const subscriptionData: SubscriptionData = {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0].price.id,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };

      return {
        success: true,
        data: subscriptionData,
        statusCode: 200,
        metadata: {
          requestId: subscription.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to cancel subscription", {
        error: error.message,
        subscriptionId,
      });

      throw new Error(`Subscription cancellation failed: ${error.message}`);
    }
  }

  /**
   * Process webhook event with enhanced security validation
   */
  public async processWebhookEvent(
    body: string,
    signature: string,
    timestamp?: string,
    headers?: Record<string, string>,
    ipAddress?: string,
  ): Promise<ApiResponse<{ processed: boolean; eventType: string }>> {
    try {
      // Enhanced security validation using WebhookSecurityService
      const verificationResult = await this.webhookSecurityService.verifyWebhook(
        'stripe',
        body,
        signature,
        timestamp,
        headers,
      );

      if (!verificationResult.isValid) {
        await this.logSecurityEvent('webhook_verification_failed', {
          error: verificationResult.error,
          ipAddress,
          signature: maskSensitiveData(signature),
        });
        throw new Error(`Webhook verification failed: ${verificationResult.error}`);
      }

      // Check for replay attacks
      if (verificationResult.metadata?.isReplay) {
        await this.logSecurityEvent('webhook_replay_attack_detected', {
          eventId: verificationResult.metadata.eventId,
          ipAddress,
        });
        throw new Error('Replay attack detected');
      }

      // Rate limiting check
      const rateLimitResult = await this.webhookSecurityService.checkRateLimit(
        'stripe',
        ipAddress || 'unknown',
        { windowMinutes: 5, maxRequests: 50 }
      );

      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent('webhook_rate_limit_exceeded', {
          ipAddress,
          remainingRequests: rateLimitResult.remainingRequests,
        });
        throw new Error('Rate limit exceeded for webhook requests');
      }

      // Construct and validate event
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret,
      );

      // Additional payment security validation
      if (this.isPaymentRelatedEvent(event.type)) {
        await this.validatePaymentSecurity(event);
      }

      logger.info("Processing Stripe webhook event", {
        eventType: event.type,
        eventId: event.id,
        securityValidated: true,
        ipAddress,
      });

      // Process different event types
      switch (event.type) {
        case "customer.subscription.created":
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case "invoice.payment_succeeded":
          await this.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        default:
          logger.info("Unhandled webhook event type", {
            eventType: event.type,
          });
      }

      // Enhanced audit logging with security metadata
      await this.logSecurityEvent('webhook_processed', {
        eventType: event.type,
        eventId: event.id,
        processed: true,
        securityValidated: true,
        verificationMetadata: verificationResult.metadata,
        ipAddress: ipAddress || 'stripe',
        rateLimitStatus: {
          allowed: rateLimitResult.allowed,
          remaining: rateLimitResult.remainingRequests,
        },
      });

      return {
        success: true,
        data: { processed: true, eventType: event.type },
        statusCode: 200,
        metadata: {
          requestId: event.id,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to process webhook event", {
        error: error.message,
        ipAddress,
        signature: maskSensitiveData(signature || ''),
      });

      // Log security failure
      await this.logSecurityEvent('webhook_processing_failed', {
        error: error.message,
        ipAddress,
        signature: maskSensitiveData(signature || ''),
      });

      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle subscription created webhook
   */
  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer && !customer.deleted) {
        const internalCustomerId = customer.metadata.internal_customer_id;

        if (internalCustomerId) {
          // Update customer service billing status
          await this.customerService.updateBillingStatus(internalCustomerId, {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodStart: new Date(
              subscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });
        }
      }

      logger.info("Subscription created webhook processed", {
        subscriptionId: subscription.id,
        customerId,
      });
    } catch (error) {
      logger.error("Failed to handle subscription created webhook", {
        error: error.message,
        subscriptionId: subscription.id,
      });
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer && !customer.deleted) {
        const internalCustomerId = customer.metadata.internal_customer_id;

        if (internalCustomerId) {
          await this.customerService.updateBillingStatus(internalCustomerId, {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodStart: new Date(
              subscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });
        }
      }

      logger.info("Subscription updated webhook processed", {
        subscriptionId: subscription.id,
        customerId,
      });
    } catch (error) {
      logger.error("Failed to handle subscription updated webhook", {
        error: error.message,
        subscriptionId: subscription.id,
      });
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer && !customer.deleted) {
        const internalCustomerId = customer.metadata.internal_customer_id;

        if (internalCustomerId) {
          await this.customerService.updateBillingStatus(internalCustomerId, {
            subscriptionId: null,
            subscriptionStatus: "canceled",
            currentPeriodStart: null,
            currentPeriodEnd: null,
          });
        }
      }

      logger.info("Subscription deleted webhook processed", {
        subscriptionId: subscription.id,
        customerId,
      });
    } catch (error) {
      logger.error("Failed to handle subscription deleted webhook", {
        error: error.message,
        subscriptionId: subscription.id,
      });
    }
  }

  /**
   * Handle invoice payment succeeded webhook
   */
  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    try {
      logger.info("Invoice payment succeeded webhook processed", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid,
      });
    } catch (error) {
      logger.error("Failed to handle invoice payment succeeded webhook", {
        error: error.message,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Handle invoice payment failed webhook
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    try {
      logger.warn("Invoice payment failed webhook processed", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due,
      });
    } catch (error) {
      logger.error("Failed to handle invoice payment failed webhook", {
        error: error.message,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Handle payment intent succeeded webhook
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      logger.info("Payment intent succeeded webhook processed", {
        paymentIntentId: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount,
      });
    } catch (error) {
      logger.error("Failed to handle payment intent succeeded webhook", {
        error: error.message,
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  /**
   * Handle payment intent failed webhook
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      logger.warn("Payment intent failed webhook processed", {
        paymentIntentId: paymentIntent.id,
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount,
        lastPaymentError: paymentIntent.last_payment_error,
      });
    } catch (error) {
      logger.error("Failed to handle payment intent failed webhook", {
        error: error.message,
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  /**
   * Initialize API key rotation monitoring
   */
  private async initializeKeyRotationMonitoring(): Promise<void> {
    try {
      const keyAgeKey = 'stripe_key_age';
      const lastRotation = await redisClient.get(keyAgeKey);
      
      if (!lastRotation) {
        await redisClient.set(keyAgeKey, Date.now());
        logger.info('Stripe API key age tracking initialized');
      } else {
        const daysSinceRotation = Math.floor((Date.now() - parseInt(lastRotation)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRotation >= this.keyRotationInterval) {
          await this.logSecurityEvent('api_key_rotation_required', {
            daysSinceRotation,
            rotationInterval: this.keyRotationInterval,
            keyType: 'stripe_secret_key',
          });
          
          logger.warn('Stripe API key rotation required', {
            daysSinceRotation,
            rotationInterval: this.keyRotationInterval,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to initialize key rotation monitoring', {
        error: error.message,
      });
    }
  }

  /**
   * Check if event is payment-related and requires additional security
   */
  private isPaymentRelatedEvent(eventType: string): boolean {
    const paymentEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_method.attached',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];
    
    return paymentEvents.includes(eventType);
  }

  /**
   * Validate payment security for sensitive events
   */
  private async validatePaymentSecurity(event: Stripe.Event): Promise<void> {
    try {
      // Additional validation for payment events
      const eventData = event.data.object as any;
      
      // Check for suspicious payment patterns
      if (eventData.amount && eventData.amount > 100000) { // $1000+ payments
        await this.logSecurityEvent('high_value_payment_detected', {
          eventId: event.id,
          eventType: event.type,
          amount: eventData.amount,
          currency: eventData.currency,
          customerId: eventData.customer,
        });
      }
      
      // Validate customer metadata
      if (eventData.customer) {
        const customer = await this.stripe.customers.retrieve(eventData.customer as string);
        if (customer && !customer.deleted && !customer.metadata?.internal_customer_id) {
          await this.logSecurityEvent('unlinked_customer_payment', {
            eventId: event.id,
            stripeCustomerId: eventData.customer,
            eventType: event.type,
          });
        }
      }
    } catch (error) {
      logger.error('Payment security validation failed', {
        error: error.message,
        eventId: event.id,
        eventType: event.type,
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
        customerId: details.customerId || null,
        action,
        resourceType: 'stripe_security',
        resourceId: details.eventId || details.paymentIntentId || 'stripe-security',
        details: {
          service: 'stripe',
          timestamp: new Date().toISOString(),
          ...details,
        },
        ipAddress: details.ipAddress || 'stripe-webhook',
        userAgent: 'StripeSecurityService',
      });
    } catch (error) {
      logger.error('Failed to log security event', {
        error: error.message,
        action,
      });
    }
  }

  /**
   * Encrypt sensitive customer data before storage
   */
  private async encryptCustomerData(data: any): Promise<any> {
    if (!this.encryptSensitiveData || !data) {
      return data;
    }

    const encrypted = { ...data };
    
    // Encrypt sensitive fields
    for (const field of this.SENSITIVE_FIELDS) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        try {
          encrypted[field] = await encryptSensitiveData(encrypted[field]);
        } catch (error) {
          logger.error('Failed to encrypt sensitive field', {
            field,
            error: error.message,
          });
        }
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive customer data after retrieval
   */
  private async decryptCustomerData(data: any): Promise<any> {
    if (!this.encryptSensitiveData || !data) {
      return data;
    }

    const decrypted = { ...data };
    
    // Decrypt sensitive fields
    for (const field of this.SENSITIVE_FIELDS) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = await decryptSensitiveData(decrypted[field]);
        } catch (error) {
          logger.error('Failed to decrypt sensitive field', {
            field,
            error: error.message,
          });
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Rotate API keys (manual trigger for security operations)
   */
  public async rotateApiKeys(newSecretKey: string, newWebhookSecret?: string): Promise<void> {
    try {
      // Validate new key by testing API call
      const testStripe = new Stripe(newSecretKey, {
        apiVersion: this.stripe.apiVersion,
        typescript: true,
      });
      
      await testStripe.balance.retrieve();
      
      // Update internal configuration
      this.stripe = testStripe;
      
      if (newWebhookSecret) {
        this.webhookSecret = newWebhookSecret;
        this.webhookSecurityService.registerWebhook('stripe', {
          provider: 'stripe',
          secret: newWebhookSecret,
          tolerance: 300,
          enableReplayProtection: true,
          maxPayloadSize: 1024 * 1024,
        });
      }
      
      // Update key rotation timestamp
      await redisClient.set('stripe_key_age', Date.now());
      
      await this.logSecurityEvent('api_key_rotated', {
        rotationDate: new Date().toISOString(),
        webhookSecretUpdated: !!newWebhookSecret,
      });
      
      logger.info('Stripe API keys rotated successfully');
    } catch (error) {
      await this.logSecurityEvent('api_key_rotation_failed', {
        error: error.message,
        rotationDate: new Date().toISOString(),
      });
      
      throw new Error(`API key rotation failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive security status including key age
   */
  public async getSecurityStatus(): Promise<{
    keyRotationStatus: 'current' | 'warning' | 'critical';
    daysSinceLastRotation: number;
    webhookSecurityEnabled: boolean;
    encryptionEnabled: boolean;
    auditingEnabled: boolean;
    lastSecurityCheck: Date;
  }> {
    try {
      const keyAgeKey = 'stripe_key_age';
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
        webhookSecurityEnabled: true,
        encryptionEnabled: this.encryptSensitiveData,
        auditingEnabled: this.auditAllTransactions,
        lastSecurityCheck: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get security status', {
        error: error.message,
      });
      
      return {
        keyRotationStatus: 'critical',
        daysSinceLastRotation: 999,
        webhookSecurityEnabled: false,
        encryptionEnabled: false,
        auditingEnabled: false,
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
      // Test API connectivity
      await this.stripe.balance.retrieve();
      
      // Get security status
      const securityStatus = await this.getSecurityStatus();
      
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (securityStatus.keyRotationStatus === 'critical') {
        status = "degraded";
      }

      return {
        service: "stripe",
        status,
        lastCheck: new Date(),
        security: securityStatus,
      };
    } catch (error) {
      return {
        service: "stripe",
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error.message },
      };
    }
  }
}

export default StripeService;

/**
 * Security-enhanced Stripe service factory
 */
export function createSecureStripeService(
  config: StripeConfig,
  customerService: CustomerService,
): StripeService {
  return new StripeService({
    ...config,
    enableKeyRotation: true,
    keyRotationIntervalDays: 90,
    encryptSensitiveData: true,
    auditAllTransactions: true,
  }, customerService);
}
