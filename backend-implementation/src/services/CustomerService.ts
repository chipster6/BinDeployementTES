/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CUSTOMER SERVICE
 * ============================================================================
 *
 * Business logic service for customer management operations.
 * Handles customer lifecycle, billing, service configuration, and relationship management.
 *
 * Features:
 * - Customer creation and management
 * - Service configuration and billing
 * - Contact and communication management
 * - Service history and analytics
 * - Account status and lifecycle
 * - Integration with billing systems
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Op, Transaction } from "sequelize";
import { Customer, ServiceFrequency, PaymentTerms } from "@/models/Customer";
import { Organization } from "@/models/Organization";
import { Bin } from "@/models/Bin";
import { ServiceEvent } from "@/models/ServiceEvent";
import type { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { BaseService, ServiceResult, PaginatedResult } from "./BaseService";
import { logger, Timer } from "@/utils/logger";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  maskSensitiveData,
} from "@/utils/encryption";
import {
  AppError,
  ValidationError,
  NotFoundError,
} from "@/middleware/errorHandler";

/**
 * Customer creation data interface
 */
interface CreateCustomerData {
  organizationId: string;
  companyName: string;
  contactName: string;
  contactTitle?: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  serviceTypes: string[];
  containerTypes: string[];
  serviceFrequency: ServiceFrequency;
  paymentTerms: PaymentTerms;
  billingContactId?: string;
  accountManagerId?: string;
  primaryDriverId?: string;
  specialInstructions?: string;
  creditLimit?: number;
  taxId?: string;
  website?: string;
  notes?: string;
}

/**
 * Service configuration interface
 */
interface ServiceConfiguration {
  serviceTypes: string[];
  containerTypes: string[];
  frequency: ServiceFrequency;
  preferredTimeWindows?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  }[];
  specialRequirements?: string[];
  hazardousMaterials?: boolean;
  recyclingProgram?: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

/**
 * Billing information interface
 */
interface BillingInfo {
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  currentBalance?: number;
  billingAddress?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  billingContactId?: string;
  taxId?: string;
  taxExempt?: boolean;
  invoiceDeliveryMethod?: "email" | "mail" | "portal";
  paymentMethods?: {
    type: "credit_card" | "bank_transfer" | "check";
    isDefault: boolean;
    details: Record<string, any>;
  }[];
}

/**
 * Customer search criteria
 */
interface CustomerSearchCriteria {
  organizationId?: string;
  status?: string;
  serviceFrequency?: ServiceFrequency;
  paymentTerms?: PaymentTerms;
  accountManagerId?: string;
  city?: string;
  state?: string;
  hasOverdueBalance?: boolean;
  serviceTypes?: string[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Customer service class
 */
export class CustomerService extends BaseService<Customer> {
  constructor() {
    super(Customer, "CustomerService");
  }

  /**
   * Create a new customer
   */
  public async createCustomer(
    customerData: CreateCustomerData,
    createdBy: string,
    transaction?: Transaction,
  ): Promise<ServiceResult<Customer>> {
    const timer = new Timer("CustomerService.createCustomer");

    try {
      // Validate required fields
      await this.validateCustomerData(customerData);

      // Check if customer already exists
      const existingCustomer = await Customer.findOne({
        where: {
          email: customerData.email.toLowerCase(),
          organizationId: customerData.organizationId,
        },
      });

      if (existingCustomer) {
        throw new ValidationError(
          "Customer with this email already exists in organization",
        );
      }

      // Verify organization exists
      const organization = await Organization.findByPk(
        customerData.organizationId,
      );
      if (!organization) {
        throw new ValidationError("Organization not found");
      }

      const result = await this.withTransaction(async (tx) => {
        // Generate customer number
        const customerNumber = await this.generateCustomerNumber(
          customerData.organizationId,
          tx,
        );

        // Encrypt sensitive data
        const encryptedPhone = customerData.phone
          ? await encryptSensitiveData(customerData.phone)
          : null;
        const encryptedTaxId = customerData.taxId
          ? await encryptSensitiveData(customerData.taxId)
          : null;

        // Create customer
        const customer = await Customer.create(
          {
            organizationId: customerData.organizationId,
            customerNumber,
            companyName: customerData.companyName,
            contactName: customerData.contactName,
            contactTitle: customerData.contactTitle,
            email: customerData.email.toLowerCase(),
            phone: encryptedPhone,
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            zipCode: customerData.zipCode,
            country: customerData?.country || "US",
            serviceTypes: customerData.serviceTypes,
            containerTypes: customerData.containerTypes,
            serviceFrequency: customerData.serviceFrequency,
            paymentTerms: customerData.paymentTerms,
            billingContactId: customerData.billingContactId,
            accountManagerId: customerData.accountManagerId,
            primaryDriverId: customerData.primaryDriverId,
            specialInstructions: customerData.specialInstructions,
            creditLimit: customerData.creditLimit,
            taxId: encryptedTaxId,
            website: customerData.website,
            notes: customerData.notes,
            status: "active",
            totalValue: 0,
            currentBalance: 0,
            lastServiceDate: null,
            nextServiceDate: this.calculateNextServiceDate(
              customerData.serviceFrequency,
            ),
          },
          { transaction: tx },
        );

        // Log customer creation
        await AuditLog.create(
          {
            userId: createdBy,
            action: "customer_created",
            entityType: "Customer",
            entityId: customer.id,
            changes: {
              companyName: customerData.companyName,
              email: maskSensitiveData(customerData.email),
              organizationId: customerData.organizationId,
            },
          },
          { transaction: tx },
        );

        return customer;
      }, transaction);

      timer.end({ success: true, customerId: result.id });
      logger.info("Customer created successfully", {
        customerId: result.id,
        companyName: customerData.companyName,
        email: maskSensitiveData(customerData.email),
        organizationId: customerData.organizationId,
      });

      return {
        success: true,
        data: result,
        message: "Customer created successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Customer creation failed", {
        companyName: customerData.companyName,
        email: maskSensitiveData(customerData.email),
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create customer", 500);
    }
  }

  /**
   * Update service configuration
   */
  public async updateServiceConfiguration(
    customerId: string,
    serviceConfig: ServiceConfiguration,
    updatedBy: string,
  ): Promise<ServiceResult<Customer>> {
    const timer = new Timer("CustomerService.updateServiceConfiguration");

    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      const result = await this.withTransaction(async (transaction) => {
        // Store previous configuration for audit
        const previousConfig = {
          serviceTypes: customer.serviceTypes,
          containerTypes: customer.containerTypes,
          serviceFrequency: customer.serviceFrequency,
        };

        // Calculate new next service date if frequency changed
        let nextServiceDate = customer.nextServiceDate;
        if (serviceConfig.frequency !== customer.serviceFrequency) {
          nextServiceDate = this.calculateNextServiceDate(
            serviceConfig.frequency,
          );
        }

        // Update customer service configuration
        const updatedCustomer = await customer.update(
          {
            serviceTypes: serviceConfig.serviceTypes,
            containerTypes: serviceConfig.containerTypes,
            serviceFrequency: serviceConfig.frequency,
            nextServiceDate,
            specialInstructions: serviceConfig.specialRequirements?.join("; "),
          },
          { transaction },
        );

        // Log configuration change
        await AuditLog.create(
          {
            userId: updatedBy,
            action: "service_config_updated",
            entityType: "Customer",
            entityId: customerId,
            changes: {
              previousConfig,
              newConfig: serviceConfig,
            },
          },
          { transaction },
        );

        return updatedCustomer;
      });

      // Clear customer cache
      await this.deleteFromCache(`id:${customerId}`);

      timer.end({ success: true, customerId });
      logger.info("Customer service configuration updated", {
        customerId,
        serviceTypes: serviceConfig.serviceTypes,
        frequency: serviceConfig.frequency,
        updatedBy,
      });

      return {
        success: true,
        data: result,
        message: "Service configuration updated successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Service configuration update failed", {
        customerId,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to update service configuration", 500);
    }
  }

  /**
   * Update billing information
   */
  public async updateBillingInfo(
    customerId: string,
    billingInfo: BillingInfo,
    updatedBy: string,
  ): Promise<ServiceResult<Customer>> {
    const timer = new Timer("CustomerService.updateBillingInfo");

    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      const result = await this.withTransaction(async (transaction) => {
        const updateData: any = {
          paymentTerms: billingInfo.paymentTerms,
          creditLimit: billingInfo.creditLimit,
          billingContactId: billingInfo.billingContactId,
        };

        // Encrypt sensitive billing data
        if (billingInfo.taxId) {
          updateData.taxId = await encryptSensitiveData(billingInfo.taxId);
        }

        // Update billing metadata
        updateData.metadata = {
          ...customer.metadata,
          billing: {
            billingAddress: billingInfo.billingAddress,
            taxExempt: billingInfo.taxExempt,
            invoiceDeliveryMethod: billingInfo.invoiceDeliveryMethod,
            paymentMethods: billingInfo.paymentMethods,
          },
        };

        const updatedCustomer = await customer.update(updateData, {
          transaction,
        });

        // Log billing update
        await AuditLog.create(
          {
            userId: updatedBy,
            action: "billing_info_updated",
            entityType: "Customer",
            entityId: customerId,
            changes: {
              paymentTerms: billingInfo.paymentTerms,
              creditLimit: billingInfo.creditLimit,
              taxId: billingInfo.taxId ? "updated" : "unchanged",
            },
          },
          { transaction },
        );

        return updatedCustomer;
      });

      // Clear customer cache
      await this.deleteFromCache(`id:${customerId}`);

      timer.end({ success: true, customerId });
      logger.info("Customer billing information updated", {
        customerId,
        paymentTerms: billingInfo.paymentTerms,
        updatedBy,
      });

      return {
        success: true,
        data: result,
        message: "Billing information updated successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Billing information update failed", {
        customerId,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to update billing information", 500);
    }
  }

  /**
   * Get customer with decrypted sensitive data
   */
  public async getCustomerById(
    customerId: string,
  ): Promise<ServiceResult<Customer>> {
    try {
      const customer = await this.findById(customerId, {
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name", "type"],
          },
          {
            model: User,
            as: "accountManager",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      });

      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      // Decrypt sensitive fields
      if (customer.phone) {
        try {
          (customer as any).phone = await decryptSensitiveData(customer.phone);
        } catch (error: unknown) {
          logger.warn("Failed to decrypt customer phone", {
            customerId,
            error: error instanceof Error ? error?.message : String(error),
          });
          (customer as any).phone = null;
        }
      }

      if (customer.taxId) {
        try {
          (customer as any).taxId = await decryptSensitiveData(customer.taxId);
        } catch (error: unknown) {
          logger.warn("Failed to decrypt customer tax ID", {
            customerId,
            error: error instanceof Error ? error?.message : String(error),
          });
          (customer as any).taxId = null;
        }
      }

      return {
        success: true,
        data: customer,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to get customer", 500);
    }
  }

  /**
   * Search customers with advanced criteria
   */
  public async searchCustomers(
    criteria: CustomerSearchCriteria,
    pagination?: { page: number; limit: number },
  ): Promise<ServiceResult<PaginatedResult<Customer> | Customer[]>> {
    const timer = new Timer("CustomerService.searchCustomers");

    try {
      const whereClause = await this.buildSearchWhereClause(criteria);

      const options: any = {
        where: whereClause,
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name", "type"],
          },
          {
            model: User,
            as: "accountManager",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
        order: [["updatedAt", "DESC"]],
      };

      let result;
      if (pagination) {
        result = await this.findAll(options, pagination);
      } else {
        result = await this.findAll(options);
      }

      timer.end({
        success: true,
        resultsCount: Array.isArray(result)
          ? result.length
          : result.data.length,
      });

      return {
        success: true,
        data: result,
        message: "Customers retrieved successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Customer search failed", { error: error instanceof Error ? error?.message : String(error) });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to search customers", 500);
    }
  }

  /**
   * Get customer service history
   */
  public async getServiceHistory(
    customerId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ServiceResult<ServiceEvent[]>> {
    const timer = new Timer("CustomerService.getServiceHistory");

    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      const serviceEvents = await ServiceEvent.findAll({
        where: { customerId },
        include: [
          {
            model: Bin,
            as: "bin",
            attributes: ["id", "serialNumber", "type", "address"],
          },
          {
            model: User,
            as: "assignedDriver",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
        order: [["scheduledDate", "DESC"]],
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      });

      timer.end({ success: true, eventsCount: serviceEvents.length });

      return {
        success: true,
        data: serviceEvents,
        message: "Service history retrieved successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Service history retrieval failed", {
        customerId,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to get service history", 500);
    }
  }

  /**
   * Get customer analytics
   */
  public async getCustomerAnalytics(
    customerId: string,
  ): Promise<ServiceResult<Record<string, any>>> {
    const timer = new Timer("CustomerService.getCustomerAnalytics");

    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      const [
        totalBins,
        totalServices,
        recentServices,
        averageServiceTime,
        missedServices,
        totalValue,
      ] = await Promise.all([
        Bin.count({ where: { customerId } }),
        ServiceEvent.count({ where: { customerId } }),
        ServiceEvent.count({
          where: {
            customerId,
            completedAt: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        ServiceEvent.findOne({
          where: { customerId, status: "completed" },
          attributes: [
            [
              ServiceEvent.sequelize?.fn(
                "AVG",
                ServiceEvent.sequelize?.literal(
                  "EXTRACT(epoch FROM (completed_at - started_at))/60",
                ),
              ),
              "average_minutes",
            ],
          ],
        }),
        ServiceEvent.count({
          where: {
            customerId,
            status: "missed",
          },
        }),
        ServiceEvent.sum("totalCost", { where: { customerId } }),
      ]);

      const analytics = {
        bins: {
          total: totalBins,
        },
        services: {
          total: totalServices,
          recent: recentServices, // Last 30 days
          missed: missedServices,
          averageTime: Math.round(
            (averageServiceTime as any)?.dataValues?.average_minutes || 0,
          ),
        },
        billing: {
          totalValue: totalValue || 0,
          currentBalance: customer.currentBalance,
          creditLimit: customer.creditLimit,
          creditUtilization: customer.creditLimit
            ? Math.round((customer.currentBalance / customer.creditLimit) * 100)
            : 0,
        },
        performance: {
          serviceReliability:
            totalServices > 0
              ? Math.round(
                  ((totalServices - missedServices) / totalServices) * 100,
                )
              : 100,
          lastServiceDate: customer.lastServiceDate,
          nextServiceDate: customer.nextServiceDate,
        },
        trends: {
          // This would include more complex analytics in a real implementation
          monthlyGrowth: 0,
          serviceFrequencyTrend: "stable",
        },
      };

      timer.end({ success: true });

      return {
        success: true,
        data: analytics,
        message: "Customer analytics retrieved successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Customer analytics failed", {
        customerId,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to get customer analytics", 500);
    }
  }

  /**
   * Deactivate customer account
   */
  public async deactivateCustomer(
    customerId: string,
    reason: string,
    deactivatedBy: string,
  ): Promise<ServiceResult<void>> {
    const timer = new Timer("CustomerService.deactivateCustomer");

    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }

      await this.withTransaction(async (transaction) => {
        // Update customer status
        await customer.update(
          {
            status: "inactive"
          },
          { transaction },
        );

        // Cancel pending services
        await ServiceEvent.update(
          { status: "cancelled", notes: "Customer account deactivated" },
          {
            where: {
              customerId,
              status: "scheduled",
            },
            transaction,
          },
        );

        // Log deactivation
        await AuditLog.create(
          {
            userId: deactivatedBy,
            action: "customer_deactivated",
            entityType: "Customer",
            entityId: customerId,
            changes: {
              status: { from: "active", to: "inactive" },
              reason,
            },
          },
          { transaction },
        );
      });

      // Clear customer cache
      await this.deleteFromCache(`id:${customerId}`);

      timer.end({ success: true, customerId });
      logger.info("Customer deactivated", {
        customerId,
        reason,
        deactivatedBy,
      });

      return {
        success: true,
        message: "Customer deactivated successfully",
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Customer deactivation failed", {
        customerId,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to deactivate customer", 500);
    }
  }

  /**
   * Private helper methods
   */

  private async validateCustomerData(
    customerData: CreateCustomerData,
  ): Promise<void> {
    const errors: any[] = [];

    if (
      !customerData.companyName ||
      customerData.companyName.trim().length === 0
    ) {
      errors.push({
        field: "companyName",
        message: "Company name is required",
      });
    }

    if (
      !customerData.contactName ||
      customerData.contactName.trim().length === 0
    ) {
      errors.push({
        field: "contactName",
        message: "Contact name is required",
      });
    }

    if (!customerData.email || !customerData.email.includes("@")) {
      errors.push({ field: "email", message: "Valid email is required" });
    }

    if (!customerData?.address || customerData.address.trim().length === 0) {
      errors.push({ field: "address", message: "Address is required" });
    }

    if (!customerData.organizationId) {
      errors.push({
        field: "organizationId",
        message: "Organization ID is required",
      });
    }

    if (!customerData?.serviceTypes || customerData.serviceTypes.length === 0) {
      errors.push({
        field: "serviceTypes",
        message: "At least one service type is required",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", { errors });
    }
  }

  private async generateCustomerNumber(
    organizationId: string,
    transaction: Transaction,
  ): Promise<string> {
    const count = await Customer.count({
      where: { organizationId },
      transaction,
    });

    const orgPrefix = organizationId.slice(0, 3).toUpperCase();
    const number = String(count + 1).padStart(6, "0");
    return `${orgPrefix}-${number}`;
  }

  private calculateNextServiceDate(frequency: ServiceFrequency): Date {
    const now = new Date();
    let daysToAdd = 7; // Default weekly

    switch (frequency) {
      case ServiceFrequency.DAILY:
        daysToAdd = 1;
        break;
      case ServiceFrequency.WEEKLY:
        daysToAdd = 7;
        break;
      case ServiceFrequency.BIWEEKLY:
        daysToAdd = 14;
        break;
      case ServiceFrequency.MONTHLY:
        daysToAdd = 30;
        break;
      case ServiceFrequency.QUARTERLY:
        daysToAdd = 90;
        break;
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private async buildSearchWhereClause(
    criteria: CustomerSearchCriteria,
  ): Promise<any> {
    const whereClause: any = {};

    if (criteria.organizationId) {
      whereClause.organizationId = criteria.organizationId;
    }

    if (criteria.status) {
      whereClause.status = criteria.status;
    }

    if (criteria.serviceFrequency) {
      whereClause.serviceFrequency = criteria.serviceFrequency;
    }

    if (criteria.paymentTerms) {
      whereClause.paymentTerms = criteria.paymentTerms;
    }

    if (criteria.accountManagerId) {
      whereClause.accountManagerId = criteria.accountManagerId;
    }

    if (criteria.city) {
      whereClause.city = { [Op.iLike]: `%${criteria.city}%` };
    }

    if (criteria.state) {
      whereClause.state = criteria.state;
    }

    if (criteria.hasOverdueBalance) {
      whereClause.currentBalance = { [Op.gt]: 0 };
    }

    if (criteria.serviceTypes && criteria.serviceTypes.length > 0) {
      whereClause.serviceTypes = { [Op.overlap]: criteria.serviceTypes };
    }

    if (criteria?.createdAfter || criteria.createdBefore) {
      whereClause.createdAt = {};
      if (criteria.createdAfter) {
        whereClause.createdAt[Op.gte] = criteria.createdAfter;
      }
      if (criteria.createdBefore) {
        whereClause.createdAt[Op.lte] = criteria.createdBefore;
      }
    }

    if (criteria.search) {
      const searchPattern = `%${criteria.search}%`;
      whereClause[Op.or] = [
        { companyName: { [Op.iLike]: searchPattern } },
        { contactName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } },
        { customerNumber: { [Op.iLike]: searchPattern } },
      ];
    }

    return whereClause;
  }
}

export default CustomerService;
