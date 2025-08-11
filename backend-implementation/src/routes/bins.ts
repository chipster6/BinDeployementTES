/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN ROUTES
 * ============================================================================
 *
 * Bin management API endpoints with comprehensive IoT integration,
 * fill level monitoring, GPS tracking, and service scheduling.
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Router } from "express";
import { body, query, param } from "express-validator";
import { BinController } from "@/controllers/BinController";
import { authenticateToken } from "@/middleware/auth";
import { BinType, BinStatus, BinMaterial } from "@/models/Bin";

const router = Router();

/**
 * Validation rules for bin management endpoints
 */

// Query parameter validation for listing bins
const getBinsValidation = [
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
    .isIn(Object.values(BinStatus))
    .withMessage("Invalid status specified"),
  query("binType")
    .optional()
    .isIn(Object.values(BinType))
    .withMessage("Invalid bin type specified"),
  query("customerId")
    .optional()
    .isUUID()
    .withMessage("Customer ID must be a valid UUID"),
  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("Search term must be 1-100 characters"),
  query("gpsEnabled")
    .optional()
    .isBoolean()
    .withMessage("GPS enabled must be a boolean"),
  query("sensorEnabled")
    .optional()
    .isBoolean()
    .withMessage("Sensor enabled must be a boolean"),
  query("needsService")
    .optional()
    .isBoolean()
    .withMessage("Needs service must be a boolean"),
  query("overdue")
    .optional()
    .isBoolean()
    .withMessage("Overdue must be a boolean"),
  query("fillLevelMin")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level minimum must be 0-100"),
  query("fillLevelMax")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level maximum must be 0-100"),
  query("sortBy")
    .optional()
    .isIn([
      "created_at",
      "updated_at",
      "bin_number",
      "status",
      "bin_type",
      "fill_level_percent",
      "next_service_date",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Sort order must be ASC or DESC"),
];

// Create bin validation
const createBinValidation = [
  body("binNumber")
    .optional()
    .isLength({ min: 3, max: 50 })
    .trim()
    .withMessage("Bin number must be 3-50 characters"),
  body("customerId").isUUID().withMessage("Valid customer ID is required"),
  body("binType")
    .isIn(Object.values(BinType))
    .withMessage("Valid bin type is required"),
  body("size")
    .isLength({ min: 1, max: 20 })
    .trim()
    .withMessage("Size is required (1-20 characters)"),
  body("capacityCubicYards")
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage("Capacity must be between 0 and 999999.99 cubic yards"),
  body("material")
    .optional()
    .isIn(Object.values(BinMaterial))
    .withMessage("Invalid bin material"),
  body("color")
    .optional()
    .isLength({ min: 1, max: 20 })
    .trim()
    .withMessage("Color must be 1-20 characters"),
  body("installationDate")
    .optional()
    .isISO8601()
    .withMessage("Installation date must be in ISO 8601 format"),
  body("gpsEnabled")
    .optional()
    .isBoolean()
    .withMessage("GPS enabled must be a boolean"),
  body("sensorEnabled")
    .optional()
    .isBoolean()
    .withMessage("Sensor enabled must be a boolean"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be a valid GeoJSON point"),
];

// Update bin validation
const updateBinValidation = [
  body("binNumber")
    .optional()
    .isLength({ min: 3, max: 50 })
    .trim()
    .withMessage("Bin number must be 3-50 characters"),
  body("customerId")
    .optional()
    .isUUID()
    .withMessage("Customer ID must be a valid UUID"),
  body("binType")
    .optional()
    .isIn(Object.values(BinType))
    .withMessage("Invalid bin type"),
  body("size")
    .optional()
    .isLength({ min: 1, max: 20 })
    .trim()
    .withMessage("Size must be 1-20 characters"),
  body("capacityCubicYards")
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage("Capacity must be between 0 and 999999.99 cubic yards"),
  body("material")
    .optional()
    .isIn(Object.values(BinMaterial))
    .withMessage("Invalid bin material"),
  body("color")
    .optional()
    .isLength({ min: 1, max: 20 })
    .trim()
    .withMessage("Color must be 1-20 characters"),
  body("status")
    .optional()
    .isIn(Object.values(BinStatus))
    .withMessage("Invalid bin status"),
  body("installationDate")
    .optional()
    .isISO8601()
    .withMessage("Installation date must be in ISO 8601 format"),
  body("lastServiceDate")
    .optional()
    .isISO8601()
    .withMessage("Last service date must be in ISO 8601 format"),
  body("nextServiceDate")
    .optional()
    .isISO8601()
    .withMessage("Next service date must be in ISO 8601 format"),
  body("gpsEnabled")
    .optional()
    .isBoolean()
    .withMessage("GPS enabled must be a boolean"),
  body("sensorEnabled")
    .optional()
    .isBoolean()
    .withMessage("Sensor enabled must be a boolean"),
  body("fillLevelPercent")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level percentage must be 0-100"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be a valid GeoJSON point"),
];

// Fill level update validation
const updateFillLevelValidation = [
  body("fillLevelPercent")
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level percentage must be 0-100"),
];

// Parameter validation
const binIdValidation = [
  param("id").isUUID().withMessage("Bin ID must be a valid UUID"),
];

const customerIdValidation = [
  param("customerId").isUUID().withMessage("Customer ID must be a valid UUID"),
];

/**
 * Bin Management Routes
 */

// @route   GET /api/v1/bins
// @desc    Get all bins with filtering and pagination
// @access  Private (Admin, Office Staff, Dispatcher, Driver)
router.get("/", authenticateToken, getBinsValidation, BinController.getBins);

// @route   POST /api/v1/bins
// @desc    Create new bin
// @access  Private (Admin, Office Staff)
router.post(
  "/",
  authenticateToken,
  createBinValidation,
  BinController.createBin,
);

// @route   GET /api/v1/bins/analytics/overview
// @desc    Get bin analytics and statistics
// @access  Private (Admin, Office Staff, Dispatcher)
router.get(
  "/analytics/overview",
  authenticateToken,
  BinController.getBinAnalytics,
);

// @route   GET /api/v1/bins/customer/:customerId
// @desc    Get bins by customer
// @access  Private (Admin, Office Staff, Customer owns)
router.get(
  "/customer/:customerId",
  authenticateToken,
  customerIdValidation,
  BinController.getBinsByCustomer,
);

// @route   GET /api/v1/bins/:id
// @desc    Get bin by ID
// @access  Private (Admin, Office Staff, Dispatcher, Driver, Customer owns)
router.get(
  "/:id",
  authenticateToken,
  binIdValidation,
  BinController.getBinById,
);

// @route   PUT /api/v1/bins/:id
// @desc    Update bin information
// @access  Private (Admin, Office Staff)
router.put(
  "/:id",
  authenticateToken,
  binIdValidation,
  updateBinValidation,
  BinController.updateBin,
);

// @route   DELETE /api/v1/bins/:id
// @desc    Delete bin (soft delete)
// @access  Private (Admin)
router.delete(
  "/:id",
  authenticateToken,
  binIdValidation,
  BinController.deleteBin,
);

// @route   PUT /api/v1/bins/:id/fill-level
// @desc    Update bin fill level (IoT sensor endpoint)
// @access  Private (Admin, Office Staff, System)
router.put(
  "/:id/fill-level",
  authenticateToken,
  binIdValidation,
  updateFillLevelValidation,
  BinController.updateFillLevel,
);

/**
 * Bin Service and Maintenance Routes (Placeholders)
 */

// @route   GET /api/v1/bins/requiring-service
// @desc    Get bins requiring service
// @access  Private (Admin, Dispatcher, Driver)
router.get("/requiring-service", authenticateToken, (req, res) => {
  // TODO: Implement service requirements endpoint
  res.status(200).json({
    success: true,
    message: "Bins requiring service not yet implemented",
    data: {
      bins: [],
      totalBins: 0,
      criticalFillLevel: [],
      overdueBins: [],
      lastUpdated: new Date().toISOString(),
    },
  });
});

// @route   GET /api/v1/bins/overdue
// @desc    Get bins overdue for service
// @access  Private (Admin, Dispatcher, Driver)
router.get("/overdue", authenticateToken, (req, res) => {
  // TODO: Implement overdue bins endpoint
  res.status(200).json({
    success: true,
    message: "Overdue bins not yet implemented",
    data: {
      bins: [],
      totalOverdue: 0,
      averageDaysOverdue: 0,
      lastUpdated: new Date().toISOString(),
    },
  });
});

// @route   GET /api/v1/bins/smart
// @desc    Get smart bins (with GPS or sensors)
// @access  Private (Admin, Office Staff, Dispatcher)
router.get("/smart", authenticateToken, (req, res) => {
  // TODO: Implement smart bins endpoint
  res.status(200).json({
    success: true,
    message: "Smart bins not yet implemented",
    data: {
      bins: [],
      totalSmartBins: 0,
      gpsEnabled: 0,
      sensorEnabled: 0,
      batteryLevels: {},
      lastUpdated: new Date().toISOString(),
    },
  });
});

/**
 * Bin Location and GPS Tracking Routes (Placeholders)
 */

// @route   GET /api/v1/bins/near
// @desc    Find bins near a location
// @access  Private (Admin, Dispatcher, Driver)
router.get("/near", authenticateToken, (req, res) => {
  // TODO: Implement location-based bin search
  res.status(200).json({
    success: true,
    message: "Location-based bin search not yet implemented",
    data: {
      bins: [],
      location: {
        latitude: req.query.lat,
        longitude: req.query.lng,
        radius: req.query.radius || 1000,
      },
      totalBins: 0,
    },
  });
});

// @route   PUT /api/v1/bins/:id/location
// @desc    Update bin GPS location
// @access  Private (Admin, Office Staff, System)
router.put("/:id/location", authenticateToken, binIdValidation, (req, res) => {
  // TODO: Implement GPS location update
  res.status(200).json({
    success: true,
    message: "GPS location update not yet implemented",
  });
});

/**
 * Bin Sensor Data and IoT Routes (Placeholders)
 */

// @route   GET /api/v1/bins/:id/sensor-data
// @desc    Get bin sensor data history
// @access  Private (Admin, Office Staff, Dispatcher, Customer owns)
router.get(
  "/:id/sensor-data",
  authenticateToken,
  binIdValidation,
  (req, res) => {
    // TODO: Implement sensor data retrieval
    res.status(200).json({
      success: true,
      message: "Sensor data retrieval not yet implemented",
      data: {
        binId: req.params.id,
        sensorData: [],
        totalReadings: 0,
        latestReading: null,
        lastUpdated: new Date().toISOString(),
      },
    });
  },
);

// @route   POST /api/v1/bins/:id/sensor-data
// @desc    Add new sensor data reading
// @access  Private (System, IoT devices)
router.post(
  "/:id/sensor-data",
  authenticateToken,
  binIdValidation,
  (req, res) => {
    // TODO: Implement sensor data ingestion
    res.status(200).json({
      success: true,
      message: "Sensor data ingestion not yet implemented",
    });
  },
);

/**
 * Bin Maintenance and Service History Routes (Placeholders)
 */

// @route   GET /api/v1/bins/:id/service-history
// @desc    Get bin service history
// @access  Private (Admin, Office Staff, Customer owns)
router.get(
  "/:id/service-history",
  authenticateToken,
  binIdValidation,
  (req, res) => {
    // TODO: Implement service history
    res.status(200).json({
      success: true,
      message: "Service history not yet implemented",
      data: {
        binId: req.params.id,
        serviceEvents: [],
        totalEvents: 0,
        lastService: null,
        nextScheduledService: null,
      },
    });
  },
);

// @route   POST /api/v1/bins/:id/service
// @desc    Record bin service event
// @access  Private (Admin, Dispatcher, Driver)
router.post("/:id/service", authenticateToken, binIdValidation, (req, res) => {
  // TODO: Implement service event recording
  res.status(200).json({
    success: true,
    message: "Service event recording not yet implemented",
  });
});

// @route   GET /api/v1/bins/due-for-replacement
// @desc    Get bins due for replacement
// @access  Private (Admin, Office Staff)
router.get("/due-for-replacement", authenticateToken, (req, res) => {
  // TODO: Implement replacement due analysis
  res.status(200).json({
    success: true,
    message: "Replacement due analysis not yet implemented",
    data: {
      bins: [],
      totalDueForReplacement: 0,
      averageAge: 0,
      replacementCost: 0,
    },
  });
});

export default router;
