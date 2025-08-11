/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CUSTOMER ROUTES
 * ============================================================================
 *
 * Customer management API endpoints with service configuration, billing,
 * and operational features with proper authorization and validation.
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Router } from "express";
import { body, query } from "express-validator";
import { CustomerController } from "@/controllers/CustomerController";
import { authenticateToken } from "@/middleware/auth";
import {
  CustomerStatus,
  ServiceFrequency,
  PaymentTerms,
} from "@/models/Customer";

const router = Router();

/**
 * Validation rules for customer management endpoints
 */

// Query parameter validation for listing customers
const getCustomersValidation = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Page must be a positive integer (1-10000)"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(Object.values(CustomerStatus))
    .withMessage("Invalid status specified"),
  query("frequency")
    .optional()
    .isIn(Object.values(ServiceFrequency))
    .withMessage("Invalid service frequency specified"),
  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("Search term must be 1-100 characters"),
  query("accountManager")
    .optional()
    .isUUID()
    .withMessage("Account manager must be a valid UUID"),
  query("sortBy")
    .optional()
    .isIn([
      "created_at",
      "updated_at",
      "customer_number",
      "status",
      "service_frequency",
      "next_service_date",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Sort order must be ASC or DESC"),
];

// Create customer validation
const createCustomerValidation = [
  body("organizationId")
    .isUUID()
    .withMessage("Valid organization ID is required"),
  body("serviceConfig")
    .isObject()
    .withMessage("Service configuration is required"),
  body("serviceConfig.service_type")
    .isArray({ min: 1 })
    .withMessage("At least one service type is required"),
  body("serviceConfig.container_types")
    .isArray({ min: 1 })
    .withMessage("At least one container type is required"),
  body("serviceConfig.frequency")
    .isIn(Object.values(ServiceFrequency))
    .withMessage("Valid service frequency is required"),
  body("serviceConfig.preferred_day")
    .optional()
    .isIn([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid preferred day"),
  body("serviceConfig.preferred_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Preferred time must be in HH:MM format"),
  body("serviceConfig.special_instructions")
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage("Special instructions must be 1000 characters or less"),
  body("billingMethod")
    .optional()
    .isIn(["monthly_invoice", "automatic_payment", "prepaid", "on_account"])
    .withMessage("Invalid billing method"),
  body("paymentTerms")
    .optional()
    .isIn(Object.values(PaymentTerms))
    .withMessage("Invalid payment terms"),
  body("serviceStartDate")
    .optional()
    .isISO8601()
    .withMessage("Service start date must be in ISO 8601 format"),
  body("serviceEndDate")
    .optional()
    .isISO8601()
    .withMessage("Service end date must be in ISO 8601 format"),
  body("rates").optional().isObject().withMessage("Rates must be an object"),
  body("rates.base")
    .optional()
    .isFloat({ min: 0, max: 99999.99 })
    .withMessage("Base rate must be between 0 and 99999.99"),
  body("rates.service")
    .optional()
    .isFloat({ min: 0, max: 9999.99 })
    .withMessage("Service rate must be between 0 and 9999.99"),
  body("rates.container")
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage("Container rate must be between 0 and 999.99"),
  body("rates.fuel_surcharge")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("Fuel surcharge must be between 0 and 1 (0-100%)"),
  body("accountManagerId")
    .optional()
    .isUUID()
    .withMessage("Account manager ID must be a valid UUID"),
  body("primaryDriverId")
    .optional()
    .isUUID()
    .withMessage("Primary driver ID must be a valid UUID"),
  body("billingContactId")
    .optional()
    .isUUID()
    .withMessage("Billing contact ID must be a valid UUID"),
];

// Update customer validation
const updateCustomerValidation = [
  body("status")
    .optional()
    .isIn(Object.values(CustomerStatus))
    .withMessage("Invalid customer status"),
  body("serviceConfig")
    .optional()
    .isObject()
    .withMessage("Service configuration must be an object"),
  body("serviceConfig.service_type")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one service type is required"),
  body("serviceConfig.container_types")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one container type is required"),
  body("serviceConfig.frequency")
    .optional()
    .isIn(Object.values(ServiceFrequency))
    .withMessage("Invalid service frequency"),
  body("serviceConfig.preferred_day")
    .optional()
    .isIn([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid preferred day"),
  body("serviceConfig.preferred_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Preferred time must be in HH:MM format"),
  body("serviceConfig.special_instructions")
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage("Special instructions must be 1000 characters or less"),
  body("billingMethod")
    .optional()
    .isIn(["monthly_invoice", "automatic_payment", "prepaid", "on_account"])
    .withMessage("Invalid billing method"),
  body("paymentTerms")
    .optional()
    .isIn(Object.values(PaymentTerms))
    .withMessage("Invalid payment terms"),
  body("serviceStartDate")
    .optional()
    .isISO8601()
    .withMessage("Service start date must be in ISO 8601 format"),
  body("serviceEndDate")
    .optional()
    .isISO8601()
    .withMessage("Service end date must be in ISO 8601 format"),
  body("rates").optional().isObject().withMessage("Rates must be an object"),
  body("rates.base")
    .optional()
    .isFloat({ min: 0, max: 99999.99 })
    .withMessage("Base rate must be between 0 and 99999.99"),
  body("rates.service")
    .optional()
    .isFloat({ min: 0, max: 9999.99 })
    .withMessage("Service rate must be between 0 and 9999.99"),
  body("rates.container")
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage("Container rate must be between 0 and 999.99"),
  body("rates.fuelSurcharge")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("Fuel surcharge must be between 0 and 1 (0-100%)"),
  body("accountManagerId")
    .optional()
    .isUUID()
    .withMessage("Account manager ID must be a valid UUID"),
  body("primaryDriverId")
    .optional()
    .isUUID()
    .withMessage("Primary driver ID must be a valid UUID"),
  body("billingContactId")
    .optional()
    .isUUID()
    .withMessage("Billing contact ID must be a valid UUID"),
];

// Service configuration update validation
const updateServiceConfigValidation = [
  body("serviceConfig")
    .isObject()
    .withMessage("Service configuration is required"),
  body("serviceConfig.service_type")
    .isArray({ min: 1 })
    .withMessage("At least one service type is required"),
  body("serviceConfig.container_types")
    .isArray({ min: 1 })
    .withMessage("At least one container type is required"),
  body("serviceConfig.frequency")
    .isIn(Object.values(ServiceFrequency))
    .withMessage("Valid service frequency is required"),
  body("serviceConfig.preferred_day")
    .optional()
    .isIn([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid preferred day"),
  body("serviceConfig.preferred_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Preferred time must be in HH:MM format"),
  body("serviceConfig.special_instructions")
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage("Special instructions must be 1000 characters or less"),
];

/**
 * Customer Management Routes
 */

// @route   GET /api/v1/customers
// @desc    Get all customers with filtering and pagination
// @access  Private (Admin, Office Staff, Dispatcher)
router.get(
  "/",
  authenticateToken,
  getCustomersValidation,
  CustomerController.getCustomers,
);

// @route   POST /api/v1/customers
// @desc    Create new customer
// @access  Private (Admin, Office Staff)
router.post(
  "/",
  authenticateToken,
  createCustomerValidation,
  CustomerController.createCustomer,
);

// @route   GET /api/v1/customers/status/:status
// @desc    Get customers by status
// @access  Private (Admin, Office Staff, Dispatcher)
router.get(
  "/status/:status",
  authenticateToken,
  CustomerController.getCustomersByStatus,
);

// @route   GET /api/v1/customers/frequency/:frequency
// @desc    Get customers by service frequency
// @access  Private (Admin, Office Staff, Dispatcher)
router.get(
  "/frequency/:frequency",
  authenticateToken,
  CustomerController.getCustomersByFrequency,
);

// @route   GET /api/v1/customers/manager/:managerId
// @desc    Get customers by account manager
// @access  Private (Admin, Office Staff, Account Manager)
router.get(
  "/manager/:managerId",
  authenticateToken,
  CustomerController.getCustomersByAccountManager,
);

// @route   GET /api/v1/customers/due-for-service
// @desc    Get customers due for service
// @access  Private (Admin, Dispatcher, Driver)
router.get(
  "/due-for-service",
  authenticateToken,
  CustomerController.getCustomersDueForService,
);

// @route   GET /api/v1/customers/:id
// @desc    Get customer by ID
// @access  Private (Admin, Office Staff, Account Manager, Customer)
router.get("/:id", authenticateToken, CustomerController.getCustomerById);

// @route   PUT /api/v1/customers/:id
// @desc    Update customer information
// @access  Private (Admin, Office Staff, Account Manager)
router.put(
  "/:id",
  authenticateToken,
  updateCustomerValidation,
  CustomerController.updateCustomer,
);

// @route   DELETE /api/v1/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Admin)
router.delete("/:id", authenticateToken, CustomerController.deleteCustomer);

/**
 * Customer Service Configuration Routes
 */

// @route   PUT /api/v1/customers/:id/service-config
// @desc    Update customer service configuration
// @access  Private (Admin, Office Staff, Account Manager)
router.put(
  "/:id/service-config",
  authenticateToken,
  updateServiceConfigValidation,
  CustomerController.updateServiceConfig,
);

// @route   GET /api/v1/customers/:id/service-history
// @desc    Get customer service history
// @access  Private (Admin, Office Staff, Account Manager, Customer)
router.get("/:id/service-history", authenticateToken, (req, res) => {
  // TODO: Implement service history
  res.status(200).json({
    success: true,
    message: "Service history not yet implemented",
    data: {
      customerId: req.params.id,
      serviceEvents: [],
      totalEvents: 0,
      lastService: null,
      nextService: null,
    },
  });
});

// @route   GET /api/v1/customers/:id/next-service
// @desc    Get customer's next scheduled service
// @access  Private (Admin, Dispatcher, Driver, Customer)
router.get("/:id/next-service", authenticateToken, (req, res) => {
  // TODO: Implement next service calculation
  res.status(200).json({
    success: true,
    message: "Next service calculation not yet implemented",
    data: {
      customerId: req.params.id,
      nextServiceDate: null,
      serviceType: null,
      estimatedTime: null,
      assignedDriver: null,
      specialInstructions: null,
    },
  });
});

/**
 * Customer Billing and Invoice Routes
 */

// @route   GET /api/v1/customers/:id/invoices
// @desc    Get customer invoices
// @access  Private (Admin, Office Staff, Account Manager, Customer)
router.get("/:id/invoices", authenticateToken, (req, res) => {
  // TODO: Implement invoice retrieval
  res.status(200).json({
    success: true,
    message: "Customer invoices not yet implemented",
    data: {
      customerId: req.params.id,
      invoices: [],
      totalInvoices: 0,
      totalAmount: 0,
      outstandingAmount: 0,
    },
  });
});

// @route   GET /api/v1/customers/:id/billing-summary
// @desc    Get customer billing summary
// @access  Private (Admin, Office Staff, Account Manager, Customer)
router.get("/:id/billing-summary", authenticateToken, (req, res) => {
  // TODO: Implement billing summary
  res.status(200).json({
    success: true,
    message: "Billing summary not yet implemented",
    data: {
      customerId: req.params.id,
      currentBalance: 0,
      monthlyRate: 0,
      lastPayment: null,
      nextBillingDate: null,
      paymentMethod: null,
    },
  });
});

/**
 * Customer Analytics and Reporting Routes
 */

// @route   GET /api/v1/customers/:id/analytics
// @desc    Get customer analytics
// @access  Private (Admin, Office Staff, Account Manager)
router.get("/:id/analytics", authenticateToken, (req, res) => {
  // TODO: Implement customer analytics
  res.status(200).json({
    success: true,
    message: "Customer analytics not yet implemented",
    data: {
      customerId: req.params.id,
      serviceFrequency: null,
      averageServiceTime: null,
      customerSatisfaction: null,
      revenueData: {},
      trends: {},
    },
  });
});

// @route   GET /api/v1/customers/stats/overview
// @desc    Get customer statistics overview
// @access  Private (Admin, Office Staff)
router.get("/stats/overview", authenticateToken, (req, res) => {
  // TODO: Implement customer statistics
  res.status(200).json({
    success: true,
    message: "Customer statistics not yet implemented",
    data: {
      totalCustomers: 0,
      activeCustomers: 0,
      newCustomersThisMonth: 0,
      customersByStatus: {},
      customersByFrequency: {},
      revenueByCustomer: {},
      lastUpdated: new Date().toISOString(),
    },
  });
});

/**
 * Customer Communication Routes
 */

// @route   POST /api/v1/customers/:id/notifications
// @desc    Send notification to customer
// @access  Private (Admin, Office Staff, Account Manager)
router.post("/:id/notifications", authenticateToken, (req, res) => {
  // TODO: Implement customer notifications
  res.status(200).json({
    success: true,
    message: "Customer notifications not yet implemented",
  });
});

// @route   GET /api/v1/customers/:id/communication-history
// @desc    Get customer communication history
// @access  Private (Admin, Office Staff, Account Manager)
router.get("/:id/communication-history", authenticateToken, (req, res) => {
  // TODO: Implement communication history
  res.status(200).json({
    success: true,
    message: "Communication history not yet implemented",
    data: {
      customerId: req.params.id,
      communications: [],
      totalCommunications: 0,
    },
  });
});

/**
 * Customer Location and Route Management Routes
 */

// @route   GET /api/v1/customers/:id/routes
// @desc    Get customer's assigned routes
// @access  Private (Admin, Dispatcher, Driver)
router.get("/:id/routes", authenticateToken, (req, res) => {
  // TODO: Implement route assignments
  res.status(200).json({
    success: true,
    message: "Customer routes not yet implemented",
    data: {
      customerId: req.params.id,
      routes: [],
      activeRoutes: [],
      scheduledRoutes: [],
    },
  });
});

// @route   PUT /api/v1/customers/:id/location
// @desc    Update customer service location
// @access  Private (Admin, Office Staff, Account Manager)
router.put("/:id/location", authenticateToken, (req, res) => {
  // TODO: Implement location updates
  res.status(200).json({
    success: true,
    message: "Location updates not yet implemented",
  });
});

export default router;
