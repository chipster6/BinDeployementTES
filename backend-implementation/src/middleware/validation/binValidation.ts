/**
 * ============================================================================
 * BIN VALIDATION MIDDLEWARE
 * ============================================================================
 * 
 * Extracted validation rules for bin management endpoints.
 * Centralized validation logic for reusability and maintainability.
 * 
 * Features:
 * - Bin creation validation rules
 * - Bin update validation rules
 * - Fill level validation rules
 * - Search parameter validation
 * - Standardized error handling
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

import { body, query, param, ValidationChain } from "express-validator";
import { BinType, BinStatus, BinMaterial } from "@/models/Bin";

/**
 * Bin creation validation middleware
 */
export const validateBinCreation: ValidationChain[] = [
  body("binNumber")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Bin number must be between 1-50 characters"),

  body("customerId")
    .isUUID()
    .withMessage("Valid customer ID required"),

  body("binType")
    .isIn(Object.values(BinType))
    .withMessage("Valid bin type required"),

  body("size")
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Bin size is required"),

  body("capacityCubicYards")
    .isFloat({ min: 0.1, max: 100 })
    .withMessage("Capacity must be between 0.1 and 100 cubic yards"),

  body("material")
    .optional()
    .isIn(Object.values(BinMaterial))
    .withMessage("Invalid bin material"),

  body("color")
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage("Color must not exceed 50 characters"),

  body("installationDate")
    .optional()
    .isISO8601()
    .withMessage("Installation date must be valid ISO date"),

  body("gpsEnabled")
    .optional()
    .isBoolean()
    .withMessage("GPS enabled must be boolean"),

  body("sensorEnabled")
    .optional()
    .isBoolean()
    .withMessage("Sensor enabled must be boolean"),

  body("location.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("location.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
];

/**
 * Bin update validation middleware
 */
export const validateBinUpdate: ValidationChain[] = [
  param("id")
    .isUUID()
    .withMessage("Valid bin ID required"),

  body("binNumber")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Bin number must be between 1-50 characters"),

  body("customerId")
    .optional()
    .isUUID()
    .withMessage("Valid customer ID required"),

  body("binType")
    .optional()
    .isIn(Object.values(BinType))
    .withMessage("Valid bin type required"),

  body("size")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Bin size must be valid"),

  body("capacityCubicYards")
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage("Capacity must be between 0.1 and 100 cubic yards"),

  body("material")
    .optional()
    .isIn(Object.values(BinMaterial))
    .withMessage("Invalid bin material"),

  body("status")
    .optional()
    .isIn(Object.values(BinStatus))
    .withMessage("Invalid bin status"),

  body("fillLevelPercent")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level must be between 0 and 100"),

  body("lastServiceDate")
    .optional()
    .isISO8601()
    .withMessage("Last service date must be valid ISO date"),

  body("nextServiceDate")
    .optional()
    .isISO8601()
    .withMessage("Next service date must be valid ISO date"),
];

/**
 * Fill level update validation middleware
 */
export const validateFillLevelUpdate: ValidationChain[] = [
  param("id")
    .isUUID()
    .withMessage("Valid bin ID required"),

  body("fillLevelPercent")
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level must be between 0 and 100"),
];

/**
 * Bin search query validation middleware
 */
export const validateBinSearch: ValidationChain[] = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(Object.values(BinStatus))
    .withMessage("Invalid bin status"),

  query("binType")
    .optional()
    .isIn(Object.values(BinType))
    .withMessage("Invalid bin type"),

  query("customerId")
    .optional()
    .isUUID()
    .withMessage("Invalid customer ID"),

  query("fillLevelMin")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level min must be between 0 and 100"),

  query("fillLevelMax")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Fill level max must be between 0 and 100"),

  query("gpsEnabled")
    .optional()
    .isBoolean()
    .withMessage("GPS enabled must be boolean"),

  query("sensorEnabled")
    .optional()
    .isBoolean()
    .withMessage("Sensor enabled must be boolean"),

  query("needsService")
    .optional()
    .isBoolean()
    .withMessage("Needs service must be boolean"),

  query("overdue")
    .optional()
    .isBoolean()
    .withMessage("Overdue must be boolean"),

  query("sortBy")
    .optional()
    .isIn([
      "created_at",
      "updated_at",
      "binNumber",
      "fillLevelPercent",
      "nextServiceDate",
      "lastServiceDate",
    ])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC", "asc", "desc"])
    .withMessage("Sort order must be ASC or DESC"),
];

/**
 * Bin ID parameter validation middleware
 */
export const validateBinId: ValidationChain[] = [
  param("id")
    .isUUID()
    .withMessage("Valid bin ID required"),
];

/**
 * Customer ID parameter validation middleware
 */
export const validateCustomerId: ValidationChain[] = [
  param("customerId")
    .isUUID()
    .withMessage("Valid customer ID required"),
];