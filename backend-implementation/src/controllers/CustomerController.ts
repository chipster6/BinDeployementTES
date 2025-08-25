/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CUSTOMER CONTROLLER
 * ============================================================================
 *
 * Handles customer management operations including CRUD, service configuration,
 * billing management, and service scheduling with proper authorization.
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response } from "express";
import { Op } from "sequelize";
import {
  Customer,
  CustomerModel,
  CustomerStatus,
  ServiceFrequency,
  PaymentTerms,
} from "@/models/Customer";
import { Organization } from "@/models/Organization";
import { UserModel } from "@/models/User";
import { logger } from "@/utils/logger";
import { withTransaction } from "@/config/database";

/**
 * Customer query interface for filtering
 */
interface CustomerQuery {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  frequency?: ServiceFrequency;
  search?: string;
  accountManager?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * Customer Controller Class
 */
export class CustomerController {
  /**
   * Get all customers with filtering and pagination
   */
  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;

      // Check permission
      if (!currentUser.canAccess("customers", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customers",
        });
        return;
      }

      // Parse query parameters
      const {
        page = 1,
        limit = 25,
        status,
        frequency,
        search,
        accountManager,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const whereClause: any = {
        deleted_at: null,
      };

      if (status && Object.values(CustomerStatus).includes(status)) {
        whereClause.status = status;
      }

      if (frequency && Object.values(ServiceFrequency).includes(frequency)) {
        whereClause.service_frequency = frequency;
      }

      if (accountManager) {
        whereClause.account_manager_id = accountManager;
      }

      // Include clauses for associations
      const includeClause = [
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name", "legal_name", "type", "status"]
        },
      ];

      // Search across customer and organization
      if (search) {
        const searchPattern = `%${search}%`;
        whereClause[Op.or] = [
          {
            customer_number: { [Op.iLike]: searchPattern },
          },
          {
            "$organization.name$": {
              [Op.iLike]: searchPattern,
            },
          },
          {
            "$organization.legal_name$": {
              [Op.iLike]: searchPattern,
            },
          },
        ];
      }

      // Execute query
      const { count, rows: customers } = await Customer.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: Number(limit),
        offset,
        order: [[sortBy, sortOrder]],
        distinct: true, // Important for accurate count with joins
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / Number(limit));
      const hasNext = Number(page) < totalPages;
      const hasPrev = Number(page) > 1;

      res.status(200).json({
        success: true,
        data: {
          customers: customers.map((customer) => ({
            ...customer.toSafeJSON(),
            organization:
              (customer as any).organization?.toSafeJSON?.() ||
              (customer as any).organization,
          })),
          pagination: {
            currentPage: Number(page),
            totalPages,
            totalItems: count,
            itemsPerPage: Number(limit),
            hasNext,
            hasPrev,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customers failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customer",
        });
        return;
      }

      const customer = await Customer.findByPk(id, {
        include: [
          {
            model: Organization,
            as: "organization",
          },
        ],
      });

      if (!customer || customer.deleted_at) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          customer: {
            ...customer.toSafeJSON(),
            organization:
              (customer as any).organization?.toSafeJSON?.() ||
              (customer as any).organization,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customer by ID failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create new customer
   */
  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;

      // Check permission
      if (!currentUser.canAccess("customers", "create")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to create customers",
        });
        return;
      }

      // No validation required

      // Extract request body parameters
      const {
        organizationId,
        serviceConfig,
        billingMethod,
        paymentTerms,
        serviceStartDate,
        serviceEndDate,
        rates,
        accountManagerId,
        primaryDriverId,
        billingContactId
      } = req.body;

      // Check for existing customer for this organization
      const existingCustomer = await Customer.findOne({
        where: {
          organization_id: organizationId,
          deleted_at: null,
        },
      });

      if (existingCustomer) {
        res.status(409).json({
          success: false,
          message: "Customer already exists for this organization",
        });
        return;
      }

      // Create customer
      const customer = await withTransaction(async (transaction) => {
        return await Customer.createWithConfig({
          organization_id: organizationId,
          service_config: serviceConfig,
          billing_method: billingMethod,
          payment_terms: paymentTerms,
          ...(serviceStartDate && { service_start_date: new Date(serviceStartDate) }),
          rates,
          account_manager_id: accountManagerId,
          created_by: currentUser.id,
        });
      });

      // Set additional fields
      if (serviceEndDate) customer.service_end_date = new Date(serviceEndDate);
      if (primaryDriverId) customer.primary_driver_id = primaryDriverId;
      if (billingContactId) customer.billing_contact_id = billingContactId;

      await customer.save();

      // Fetch customer with organization for response
      const customerWithOrg = await Customer.findByPk(customer.id, {
        include: [
          {
            model: Organization,
            as: "organization",
          },
        ],
      });

      logger.info("Customer created successfully", {
        customerId: customer.id,
        customerNumber: customer.customer_number,
        organizationId: organizationId,
        createdBy: currentUser.id,
      });

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: {
          customer: {
            ...customerWithOrg!.toSafeJSON(),
            organization:
              (customerWithOrg as any)?.organization?.toSafeJSON?.() ||
              (customerWithOrg as any)?.organization,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Create customer failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "update")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to update customer",
        });
        return;
      }

      // No validation required

      const {
        status,
        serviceConfig,
        billingMethod,
        paymentTerms,
        serviceStartDate,
        serviceEndDate,
        rates,
        accountManagerId,
        primaryDriverId,
        billingContactId,
      } = req.body;

      // Get customer record
      const customer = await Customer.findByPk(id);
      if (!customer) {
        res.status(404).json({
          success: false,
          message: "Customer not found"
        });
        return;
      }

      // Update fields
      if (status !== undefined) customer.status = status;
      if (serviceConfig) customer.setServiceConfig(serviceConfig);
      if (billingMethod) customer.billing_method = billingMethod;
      if (paymentTerms) customer.payment_terms = paymentTerms;
      if (serviceStartDate !== undefined) {
        customer.service_start_date = serviceStartDate
          ? new Date(serviceStartDate)
          : null;
      }
      if (serviceEndDate !== undefined) {
        customer.service_end_date = serviceEndDate
          ? new Date(serviceEndDate)
          : null;
      }
      if (accountManagerId !== undefined)
        customer.account_manager_id = accountManagerId;
      if (primaryDriverId !== undefined)
        customer.primary_driver_id = primaryDriverId;
      if (billingContactId !== undefined)
        customer.billing_contact_id = billingContactId;

      // Update rates
      if (rates) {
        if (rates.base !== undefined) customer.base_rate = rates.base;
        if (rates.service !== undefined) customer.service_rate = rates.service;
        if (rates.container !== undefined)
          customer.container_rate = rates.container;
        if (rates.fuelSurcharge !== undefined)
          customer.fuel_surcharge = rates.fuelSurcharge;
      }

      customer.updated_by = currentUser.id;
      await customer.save();

      // Fetch updated customer with organization
      const updatedCustomer = await Customer.findByPk(customer.id, {
        include: [
          {
            model: Organization,
            as: "organization",
          },
        ],
      });

      logger.info("Customer updated successfully", {
        customerId: customer.id,
        customerNumber: customer.customer_number,
        updatedBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: {
          customer: {
            ...updatedCustomer!.toSafeJSON(),
            organization:
              (updatedCustomer as any)?.organization?.toSafeJSON?.() ||
              (updatedCustomer as any)?.organization,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Update customer failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete customer (soft delete)
   */
  static async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "delete")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to delete customer",
        });
        return;
      }

      const customer = await Customer.findByPk(id);
      if (!customer || customer.deleted_at) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Check if customer has active services (placeholder logic)
      const hasActiveServices = await customer.hasActiveServices();
      if (hasActiveServices) {
        res.status(400).json({
          success: false,
          message: "Cannot delete customer with active services",
        });
        return;
      }

      // Soft delete
      customer.deleted_by = currentUser.id;
      await customer.destroy(); // This triggers soft delete due to paranoid: true

      logger.info("Customer deleted successfully", {
        customerId: customer.id,
        customerNumber: customer.customer_number,
        deletedBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Delete customer failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get customers by status
   */
  static async getCustomersByStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { status } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customers",
        });
        return;
      }

      // Validate status
      if (!Object.values(CustomerStatus).includes(status as CustomerStatus)) {
        res.status(400).json({
          success: false,
          message: "Invalid status specified",
        });
        return;
      }

      const customers = await Customer.findByStatus(status as CustomerStatus);

      res.status(200).json({
        success: true,
        data: {
          customers: customers.map((customer) => customer.toSafeJSON()),
          status,
          count: customers.length,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customers by status failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get customers due for service
   */
  static async getCustomersDueForService(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;

      // Check permission
      if (!currentUser.canAccess("service_events", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view service schedules",
        });
        return;
      }

      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      const customers = await Customer.findDueForService(targetDate);

      res.status(200).json({
        success: true,
        data: {
          customers: customers.map((customer) => customer.toSafeJSON()),
          targetDate: targetDate.toISOString(),
          count: customers.length,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customers due for service failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get customers by service frequency
   */
  static async getCustomersByFrequency(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { frequency } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customers",
        });
        return;
      }

      // Validate frequency
      if (
        !Object.values(ServiceFrequency).includes(frequency as ServiceFrequency)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid frequency specified",
        });
        return;
      }

      const customers = await Customer.findByFrequency(
        frequency as ServiceFrequency,
      );

      res.status(200).json({
        success: true,
        data: {
          customers: customers.map((customer) => customer.toSafeJSON()),
          frequency,
          count: customers.length,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customers by frequency failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get customers by account manager
   */
  static async getCustomersByAccountManager(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { managerId } = req.params;

      if (!managerId) {
        res.status(400).json({
          success: false,
          message: "Manager ID is required",
        });
        return;
      }

      // Check permission
      if (!currentUser.canAccess("customers", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customers",
        });
        return;
      }

      const customers = await Customer.findByAccountManager(managerId);

      res.status(200).json({
        success: true,
        data: {
          customers: customers.map((customer) => customer.toSafeJSON()),
          accountManagerId: managerId,
          count: customers.length,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get customers by account manager failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update customer service configuration
   */
  static async updateServiceConfig(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("customers", "update")) {
        res.status(403).json({
          success: false,
          message:
            "Insufficient permissions to update customer service configuration",
        });
        return;
      }

      // No validation required

      const { serviceConfig } = req.body;

      // Find customer
      const customer = await Customer.findByPk(id);
      if (!customer) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Update service configuration
      customer.setServiceConfig(serviceConfig);
      customer.updated_by = currentUser.id;
      await customer.save();

      logger.info("Customer service configuration updated", {
        customerId: customer.id,
        customerNumber: customer.customer_number,
        updatedBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "Service configuration updated successfully",
        data: {
          customer: customer.toSafeJSON(),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Update service config failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default CustomerController;
