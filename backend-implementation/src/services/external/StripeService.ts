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
}

/**
 * Stripe payment service implementation
 */
export class StripeService extends BaseExternalService {
  private stripe: Stripe;
  private webhookSecret: string;
  private customerService: CustomerService;

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
   * Process webhook event
   */
  public async processWebhookEvent(
    body: string,
    signature: string,
  ): Promise<ApiResponse<{ processed: boolean; eventType: string }>> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret,
      );

      logger.info("Processing Stripe webhook event", {
        eventType: event.type,
        eventId: event.id,
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

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "webhook_processed",
        resourceType: "stripe_webhook",
        resourceId: event.id,
        details: {
          eventType: event.type,
          processed: true,
        },
        ipAddress: "stripe",
        userAgent: "StripeWebhook",
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
   * Get service health status
   */
  public async getServiceHealth(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    lastCheck: Date;
    details?: any;
  }> {
    try {
      // Test API connectivity
      await this.stripe.balance.retrieve();

      return {
        service: "stripe",
        status: "healthy",
        lastCheck: new Date(),
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
