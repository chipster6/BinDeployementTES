/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BILLING SERVICE
 * ============================================================================
 *
 * Comprehensive billing service for invoice generation, payment processing,
 * and billing automation. Integrates with Stripe and queue system for
 * scalable billing operations.
 *
 * Features:
 * - Automated invoice generation
 * - Payment processing integration
 * - Billing schedule management
 * - Tax calculations
 * - Credit management
 * - Billing notifications
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-20
 * Version: 1.0.0 - Queue Integration
 */

import { BaseService, ServiceResult } from '../BaseService';
import { logger, Timer } from '@/utils/logger';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { database } from '@/config/database';
import { AppError } from '@/middleware/errorHandler';

/**
 * Billing data interfaces
 */
export interface BillingPeriod {
  startDate: string;
  endDate: string;
}

export interface BillingService {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxAmount?: number;
  description?: string;
}

export interface CustomerBillingData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod?: string;
  taxId?: string;
}

export interface InvoiceGenerationRequest {
  customerId: string;
  organizationId: string;
  billingPeriod: BillingPeriod;
  services: BillingService[];
  dueDate: string;
  customerData: CustomerBillingData;
  notes?: string;
  termsAndConditions?: string;
}

export interface InvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  pdfUrl?: string;
  paymentUrl?: string;
  createdAt: string;
}

/**
 * Billing Service Class
 */
class BillingServiceClass extends BaseService {
  
  constructor() {
    super(null as any, 'BillingService');
    this.cacheNamespace = 'billing_service';
    this.defaultCacheTTL = 600; // 10 minutes
  }

  /**
   * Generate invoice for customer
   */
  async generateInvoice(request: InvoiceGenerationRequest): Promise<ServiceResult<InvoiceResult>> {
    const timer = new Timer('BillingService.generateInvoice');

    try {
      const { customerId, organizationId, billingPeriod, services, dueDate, customerData, notes } = request;

      // Validate input data
      const validation = this.validateInvoiceRequest(request);
      if (!validation.success) {
        return ResponseHelper.error(validation?.message, 400, validation.errors);
      }

      // Calculate billing amounts
      const calculations = await this.calculateBillingAmounts(services, customerData);

      // Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber(organizationId);

      // Create invoice record in database
      const invoiceData = await this.withTransaction(async (transaction) => {
        // Create invoice record
        const invoice = await database.models.Invoice.create({
          invoiceNumber,
          customerId,
          organizationId,
          billingPeriodStart: billingPeriod.startDate,
          billingPeriodEnd: billingPeriod.endDate,
          subtotalAmount: calculations.subtotal,
          taxAmount: calculations.tax,
          totalAmount: calculations.total,
          dueDate,
          status: 'draft',
          notes,
          customerData: JSON.stringify(customerData),
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction });

        // Create invoice line items
        for (const service of services) {
          await database.models.InvoiceLineItem.create({
            invoiceId: invoice.id,
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            quantity: service.quantity,
            unitPrice: service.unitPrice,
            totalAmount: service.totalAmount,
            description: service.description,
            createdAt: new Date()
          }, { transaction });
        }

        return invoice;
      });

      // Generate PDF invoice (async)
      const pdfUrl = await this.generateInvoicePDF(invoiceData, customerData, services);

      // Create payment URL if Stripe is configured
      const paymentUrl = await this.createPaymentLink(invoiceData, customerData);

      // Cache invoice data
      await this.setCache(`invoice:${invoiceData.id}`, {
        invoiceId: invoiceData.id,
        invoiceNumber,
        status: invoiceData.status
      }, { ttl: 3600 });

      const duration = timer.end({
        customerId,
        invoiceId: invoiceData.id,
        totalAmount: calculations.total
      });

      logger.info('Invoice generated successfully:', {
        invoiceId: invoiceData.id,
        customerId,
        totalAmount: calculations.total,
        duration: `${duration}ms`
      });

      return ResponseHelper.success({
        invoiceId: invoiceData.id,
        invoiceNumber,
        totalAmount: calculations.total,
        subtotalAmount: calculations.subtotal,
        taxAmount: calculations.tax,
        dueDate,
        status: 'draft',
        pdfUrl,
        paymentUrl,
        createdAt: invoiceData.createdAt.toISOString()
      }, 'Invoice generated successfully');

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Invoice generation failed:', {
        customerId: request.customerId,
        error: error instanceof Error ? error?.message : String(error),
        stack: error instanceof Error ? error?.stack : undefined
      });

      if (error instanceof AppError) {
        return ResponseHelper.error(error instanceof Error ? error?.message : String(error), error.statusCode);
      }

      return ResponseHelper.error('Failed to generate invoice', 500, error);
    }
  }

  /**
   * Process payment for invoice
   */
  async processPayment(invoiceId: string, paymentData: any): Promise<ServiceResult> {
    const timer = new Timer('BillingService.processPayment');

    try {
      // Load invoice
      const invoice = await database.models.Invoice.findByPk(invoiceId);
      if (!invoice) {
        return ResponseHelper.error('Invoice not found', 404);
      }

      if (invoice.status === 'paid') {
        return ResponseHelper.error('Invoice is already paid', 400);
      }

      // Process payment through Stripe
      const { StripeService } = await import('./StripeService');
      const paymentResult = await StripeService.processPayment({
        amount: invoice.totalAmount,
        currency: 'usd',
        customerId: invoice.customerId,
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        ...paymentData
      });

      if (!paymentResult.success) {
        return ResponseHelper.error('Payment processing failed', 400, paymentResult.errors);
      }

      // Update invoice status
      await this.withTransaction(async (transaction) => {
        await invoice.update({
          status: 'paid',
          paidAt: new Date(),
          paymentId: paymentResult.data.paymentId,
          paymentMethod: paymentResult.data.paymentMethod,
          updatedAt: new Date()
        }, { transaction });

        // Create payment record
        await database.models.Payment.create({
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: invoice.totalAmount,
          currency: 'usd',
          paymentId: paymentResult.data.paymentId,
          paymentMethod: paymentResult.data.paymentMethod,
          status: 'completed',
          processedAt: new Date(),
          createdAt: new Date()
        }, { transaction });
      });

      // Clear invoice cache
      await this.deleteFromCache(`invoice:${invoiceId}`);

      // Queue payment confirmation notification
      const { queueService } = await import('../QueueService');
      await queueService.addJob('notifications', 'payment-confirmation', {
        recipientId: invoice.customerId,
        type: 'email',
        channel: 'billing',
        template: 'payment-confirmation',
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          paidAt: new Date().toISOString()
        },
        priority: 8
      });

      const duration = timer.end({
        invoiceId,
        amount: invoice.totalAmount,
        paymentId: paymentResult.data.paymentId
      });

      logger.info('Payment processed successfully:', {
        invoiceId,
        paymentId: paymentResult.data.paymentId,
        amount: invoice.totalAmount,
        duration: `${duration}ms`
      });

      return ResponseHelper.success({
        invoiceId,
        paymentId: paymentResult.data.paymentId,
        amount: invoice.totalAmount,
        status: 'paid'
      }, 'Payment processed successfully');

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Payment processing failed:', {
        invoiceId,
        error: error instanceof Error ? error?.message : String(error)
      });

      return ResponseHelper.error('Failed to process payment', 500, error);
    }
  }

  /**
   * Get billing history for customer
   */
  async getBillingHistory(customerId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ServiceResult> {
    const timer = new Timer('BillingService.getBillingHistory');

    try {
      const { limit = 50, offset = 0, status, startDate, endDate } = options;

      const whereClause: any = { customerId };

      if (status) {
        whereClause.status = status;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          [database.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { count, rows: invoices } = await database.models.Invoice.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: database.models.InvoiceLineItem,
            as: 'lineItems'
          },
          {
            model: database.models.Payment,
            as: 'payments',
            required: false
          }
        ]
      });

      const duration = timer.end({
        customerId,
        invoicesFound: invoices.length
      });

      return ResponseHelper.success({
        invoices: invoices.map(invoice => ({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          paidAt: invoice.paidAt,
          lineItems: invoice.lineItems,
          payments: invoice.payments
        })),
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count
        }
      }, 'Billing history retrieved');

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Get billing history failed:', {
        customerId,
        error: error instanceof Error ? error?.message : String(error)
      });

      return ResponseHelper.error('Failed to retrieve billing history', 500, error);
    }
  }

  /**
   * Generate recurring billing jobs
   */
  async scheduleRecurringBilling(organizationId: string, billingSchedule: {
    customerId: string;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
    services: BillingService[];
    startDate: string;
    endDate?: string;
  }): Promise<ServiceResult> {
    const timer = new Timer('BillingService.scheduleRecurringBilling');

    try {
      const { customerId, frequency, services, startDate, endDate } = billingSchedule;

      // Generate cron expression based on frequency
      let cronExpression: string;
      switch (frequency) {
        case 'weekly':
          cronExpression = '0 9 * * 1'; // Every Monday at 9 AM
          break;
        case 'monthly':
          cronExpression = '0 9 1 * *'; // First day of month at 9 AM
          break;
        case 'quarterly':
          cronExpression = '0 9 1 */3 *'; // First day of quarter at 9 AM
          break;
        case 'annually':
          cronExpression = '0 9 1 1 *'; // January 1st at 9 AM
          break;
        default:
          return ResponseHelper.error('Invalid billing frequency', 400);
      }

      // Schedule recurring job
      const { queueService } = await import('../QueueService');
      const result = await queueService.scheduleRecurringJob(
        'billing-generation',
        `recurring-billing-${customerId}`,
        {
          customerId,
          organizationId,
          services,
          billingPeriod: this.calculateBillingPeriod(frequency, startDate),
          dueDate: this.calculateDueDate(frequency, startDate)
        },
        cronExpression
      );

      if (result.success) {
        // Store recurring billing configuration
        await database.models.RecurringBilling.create({
          customerId,
          organizationId,
          frequency,
          services: JSON.stringify(services),
          cronExpression,
          startDate,
          endDate,
          isActive: true,
          createdAt: new Date()
        });

        const duration = timer.end({ customerId, frequency });

        logger.info('Recurring billing scheduled:', {
          customerId,
          frequency,
          cronExpression,
          duration: `${duration}ms`
        });
      }

      return result;

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error('Schedule recurring billing failed:', error);
      return ResponseHelper.error('Failed to schedule recurring billing', 500, error);
    }
  }

  // Private helper methods

  private validateInvoiceRequest(request: InvoiceGenerationRequest): { success: boolean; message?: string; errors?: any } {
    if (!request.customerId || !request.organizationId) {
      return { success: false, message: 'Customer ID and Organization ID are required' };
    }

    if (!request?.services || request.services.length === 0) {
      return { success: false, message: 'At least one service is required for billing' };
    }

    if (!request.billingPeriod.startDate || !request.billingPeriod.endDate) {
      return { success: false, message: 'Billing period start and end dates are required' };
    }

    if (new Date(request.dueDate) <= new Date()) {
      return { success: false, message: 'Due date must be in the future' };
    }

    return { success: true };
  }

  private async calculateBillingAmounts(services: BillingService[], customerData: CustomerBillingData): Promise<{
    subtotal: number;
    tax: number;
    total: number;
  }> {
    let subtotal = 0;
    
    for (const service of services) {
      subtotal += service.totalAmount || (service.quantity * service.unitPrice);
    }

    // Calculate tax based on customer location (simplified)
    const taxRate = await this.getTaxRate(customerData.billingAddress.state);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }

  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    // Generate unique invoice number
    const year = new Date().getFullYear();
    const sequence = await this.getNextInvoiceSequence(organizationId, year);
    return `INV-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  private async getNextInvoiceSequence(organizationId: string, year: number): Promise<number> {
    // Get next sequence number for invoice numbering
    const lastInvoice = await database.models.Invoice.findOne({
      where: {
        organizationId,
        createdAt: {
          [database.Sequelize.Op.gte]: new Date(`${year}-01-01`),
          [database.Sequelize.Op.lt]: new Date(`${year + 1}-01-01`)
        }
      },
      order: [['createdAt', 'DESC']]
    });

    return lastInvoice ? 
      parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1 : 
      1;
  }

  private async getTaxRate(state: string): Promise<number> {
    // Simplified tax calculation - in production, use tax service
    const taxRates = {
      'CA': 0.0875, // California
      'NY': 0.08, // New York
      'TX': 0.0625, // Texas
      'FL': 0.06, // Florida
    };

    return taxRates[state] || 0.05; // Default 5% tax
  }

  private async generateInvoicePDF(invoiceData: any, customerData: CustomerBillingData, services: BillingService[]): Promise<string> {
    // Placeholder for PDF generation - integrate with PDF library
    // Return URL to generated PDF
    return `https://example.com/invoices/${invoiceData.id}.pdf`;
  }

  private async createPaymentLink(invoiceData: any, customerData: CustomerBillingData): Promise<string> {
    // Placeholder for Stripe payment link creation
    return `https://billing.example.com/pay/${invoiceData.id}`;
  }

  private calculateBillingPeriod(frequency: string, startDate: string): BillingPeriod {
    const start = new Date(startDate);
    let end = new Date(start);

    switch (frequency) {
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'annually':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }

  private calculateDueDate(frequency: string, startDate: string): string {
    const start = new Date(startDate);
    const due = new Date(start);
    due.setDate(due.getDate() + 30); // 30 days to pay
    return due.toISOString();
  }
}

// Export singleton instance
export const BillingService = new BillingServiceClass();
export default BillingService;