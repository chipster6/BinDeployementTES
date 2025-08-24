/**
 * ============================================================================
 * REFACTORED BIN ROUTES
 * ============================================================================
 *
 * Clean Architecture route definitions for bin management endpoints.
 * Demonstrates separation of concerns with focused controllers.
 *
 * Features:
 * - Modular route organization
 * - Clear separation of bin management concerns
 * - Proper middleware application
 * - RESTful endpoint design
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 * Version: 2.0.0
 */

import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import {
  BinController,
  BinIoTController,
  BinAnalyticsController,
  CustomerBinController,
} from "@/controllers/refactored/BinController";

const router = Router();

// Apply authentication to all bin routes
router.use(requireAuth);

// ============================================================================
// MAIN BIN CRUD ROUTES
// ============================================================================

/**
 * Primary bin management endpoints
 */
router.get("/", BinController.getBins);
router.post("/", BinController.createBin);
router.get("/:id", BinController.getBinById);
router.put("/:id", BinController.updateBin);
router.delete("/:id", BinController.deleteBin);

// ============================================================================
// IOT AND SENSOR ROUTES
// ============================================================================

/**
 * IoT-specific endpoints for sensor data and location updates
 */
router.put("/:id/fill-level", BinIoTController.updateFillLevel);
router.put("/:id/location", BinIoTController.updateLocation);

// ============================================================================
// ANALYTICS AND REPORTING ROUTES
// ============================================================================

/**
 * Analytics and reporting endpoints
 */
router.get("/analytics/overview", BinAnalyticsController.getBinAnalytics);
router.get("/service-needed", BinAnalyticsController.getBinsNeedingService);

// ============================================================================
// CUSTOMER-SPECIFIC ROUTES
// ============================================================================

/**
 * Customer-specific bin endpoints
 */
router.get("/customer/:customerId", CustomerBinController.getBinsByCustomer);

export default router;