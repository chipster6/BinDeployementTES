/**
 * ============================================================================
 * REFACTORED BIN CONTROLLER
 * ============================================================================
 *
 * Clean, focused bin controller following Clean Architecture principles.
 * Thin controller that delegates business logic to dedicated services.
 *
 * Responsibilities:
 * - Request/response handling
 * - Input validation coordination
 * - Service orchestration
 * - Response formatting
 * - Permission checking
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 * Version: 2.0.0
 */

import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/auth";
import { validateAndHandle } from "@/middleware/validation/validationHandler";
import {
  validateBinCreation,
  validateBinUpdate,
  validateFillLevelUpdate,
  validateBinSearch,
  validateBinId,
  validateCustomerId,
} from "@/middleware/validation/binValidation";
import { generalRateLimiter } from "@/middleware/rateLimit";
import BinService from "@/services/BinService";
import { ResponseFormatter } from "@/utils/responseFormatter";
import { UserRole } from "@/models/User";
import { logger } from "@/utils/logger";
import type { PaginatedResult } from "@/services/BaseService";
import type { Bin } from "@/models/Bin";

/**
 * Type for search bins result data
 */
type SearchBinsResultData = PaginatedResult<Bin> | Bin[];

/**
 * Main Bin Controller - handles primary CRUD operations
 */
export class BinController {
  private static binService = new BinService();

  /**
   * Get all bins with filtering and pagination
   * @route GET /api/v1/bins
   */
  static getBins = [
    generalRateLimiter,
    ...validateAndHandle(validateBinSearch),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "read")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to view bins");
        }

        // Extract and validate pagination
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

        // Build search criteria from query parameters
        const searchCriteria = {
          customerId: req.query.customerId as string,
          type: req.query.binType,
          status: req.query.status,
          capacityMin: parseInt(req.query.fillLevelMin as string),
          capacityMax: parseInt(req.query.fillLevelMax as string),
          needsService: req.query.needsService === "true",
          search: req.query.search as string,
        };

        // Clean undefined values
        Object.keys(searchCriteria).forEach(key => {
          if (searchCriteria[key] === undefined || (typeof searchCriteria[key] === 'number' && isNaN(searchCriteria[key]))) {
            delete searchCriteria[key];
          }
        });

        const result = await this.binService.searchBins(searchCriteria, { page, limit });

        if (!result.success) {
          return ResponseFormatter.serverError(res, "Failed to retrieve bins");
        }

        const data: SearchBinsResultData = result.data!;
        
        // Check if data is a paginated result (has 'data' and 'pagination' properties)
        if ('data' in data && 'pagination' in data) {
          // Paginated result
          return ResponseFormatter.successWithPagination(
            res,
            data.data,
            ResponseFormatter.createPaginationMeta(page, limit, data.pagination.total),
            "Bins retrieved successfully"
          );
        } else {
          // Non-paginated result (array of bins)
          return ResponseFormatter.success(res, data, "Bins retrieved successfully");
        }
      } catch (error: unknown) {
        logger.error("Error retrieving bins:", error);
        ResponseFormatter.serverError(res, "Internal server error while retrieving bins");
      }
    },
  ];

  /**
   * Create new bin
   * @route POST /api/v1/bins
   */
  static createBin = [
    generalRateLimiter,
    ...validateAndHandle(validateBinCreation),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "create")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to create bins");
        }

        const binData = {
          serialNumber: req.body.binNumber || await this.generateBinNumber(req.body.binType, req.body.customerId),
          type: req.body.binType,
          capacity: req.body.capacityCubicYards,
          customerId: req.body.customerId,
          latitude: req.body.location?.latitude,
          longitude: req.body.location?.longitude,
          address: req.body.location?.address,
          installationDate: req.body.installationDate ? new Date(req.body.installationDate) : undefined,
          notes: req.body.notes,
          metadata: {
            size: req.body.size,
            material: req.body.material,
            color: req.body.color,
            gpsEnabled: req.body.gpsEnabled || false,
            sensorEnabled: req.body.sensorEnabled || false,
          },
        };

        const result = await this.binService.createBin(binData, req.user.id);

        if (!result.success) {
          return ResponseFormatter.error(res, result.message || "Failed to create bin", 400);
        }

        ResponseFormatter.success(
          res,
          { bin: result.data },
          "Bin created successfully",
          201
        );
      } catch (error: unknown) {
        logger.error("Error creating bin:", error);
        ResponseFormatter.serverError(res, "Internal server error while creating bin");
      }
    },
  ];

  /**
   * Get bin by ID
   * @route GET /api/v1/bins/:id
   */
  static getBinById = [
    generalRateLimiter,
    ...validateAndHandle(validateBinId),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "read")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to view bin details");
        }

        const { id } = req.params;
        const bin = await this.binService.findById(id);

        if (!bin) {
          return ResponseFormatter.notFound(res, "Bin");
        }

        // Additional authorization for customer users
        if (req.user.role === UserRole.CUSTOMER || req.user.role === UserRole.CUSTOMER_STAFF) {
          // Validate customer ownership of the bin
          if (req.user.customerId && bin.customerId !== req.user.customerId) {
            return ResponseFormatter.forbidden(res, "Access denied - bin belongs to different customer");
          }
        }

        ResponseFormatter.success(
          res,
          { bin },
          "Bin retrieved successfully"
        );
      } catch (error: unknown) {
        logger.error("Error retrieving bin by ID:", error);
        ResponseFormatter.serverError(res, "Internal server error while retrieving bin");
      }
    },
  ];

  /**
   * Update bin information
   * @route PUT /api/v1/bins/:id
   */
  static updateBin = [
    generalRateLimiter,
    ...validateAndHandle(validateBinUpdate),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "update")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to update bins");
        }

        const { id } = req.params;
        const updateData = req.body;

        const result = await this.binService.update(id, updateData);

        if (!result) {
          return ResponseFormatter.notFound(res, "Bin");
        }

        ResponseFormatter.success(
          res,
          { bin: result },
          "Bin updated successfully"
        );
      } catch (error: unknown) {
        logger.error("Error updating bin:", error);
        ResponseFormatter.serverError(res, "Internal server error while updating bin");
      }
    },
  ];

  /**
   * Delete bin (soft delete)
   * @route DELETE /api/v1/bins/:id
   */
  static deleteBin = [
    generalRateLimiter,
    ...validateAndHandle(validateBinId),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions (only admins can delete bins)
        if (!req.user?.canAccess("bins", "delete")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to delete bins");
        }

        const { id } = req.params;
        const deleted = await this.binService.delete(id);

        if (!deleted) {
          return ResponseFormatter.notFound(res, "Bin");
        }

        ResponseFormatter.success(res, { deleted: true }, "Bin deleted successfully");
      } catch (error: unknown) {
        logger.error("Error deleting bin:", error);
        ResponseFormatter.serverError(res, "Internal server error while deleting bin");
      }
    },
  ];

  /**
   * Generate bin number (utility method)
   */
  private static async generateBinNumber(binType: string, customerId: string): Promise<string> {
    // This should ideally be in the BinService, but keeping it simple for now
    const timestamp = Date.now().toString().slice(-6);
    const typeCode = binType.substring(0, 2).toUpperCase();
    const customerCode = customerId.substring(0, 4).toUpperCase();
    return `${typeCode}-${customerCode}-${timestamp}`;
  }
}

/**
 * Bin IoT Controller - Separate concern for IoT-related operations
 */
export class BinIoTController {
  private static binService = new BinService();

  /**
   * Update bin fill level (typically called by IoT sensors)
   * @route PUT /api/v1/bins/:id/fill-level
   */
  static updateFillLevel = [
    generalRateLimiter,
    ...validateAndHandle(validateFillLevelUpdate),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "update")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to update bin fill level");
        }

        const { id } = req.params;
        const { fillLevelPercent } = req.body;

        const capacityReading = {
          level: fillLevelPercent,
          timestamp: new Date(),
          source: req.user.role === UserRole.SYSTEM ? "sensor" : "manual" as const,
        };

        const result = await this.binService.recordCapacityReading(id, capacityReading);

        if (!result.success) {
          return ResponseFormatter.error(res, result.message || "Failed to update fill level", 400);
        }

        ResponseFormatter.success(
          res,
          {
            binId: id,
            fillLevelPercent,
            needsService: result.data?.currentCapacity >= 80,
          },
          "Bin fill level updated successfully"
        );
      } catch (error: unknown) {
        logger.error("Error updating bin fill level:", error);
        ResponseFormatter.serverError(res, "Internal server error while updating fill level");
      }
    },
  ];

  /**
   * Update bin location
   * @route PUT /api/v1/bins/:id/location
   */
  static updateLocation = [
    generalRateLimiter,
    ...validateAndHandle(validateBinId),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "update")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to update bin location");
        }

        const { id } = req.params;
        const locationData = {
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          address: req.body.address,
          accuracy: req.body.accuracy,
          timestamp: new Date(),
          source: req.user.role === UserRole.SYSTEM ? "gps" : "manual" as const,
        };

        const result = await this.binService.updateLocation(id, locationData, req.user.id);

        if (!result.success) {
          return ResponseFormatter.error(res, result.message || "Failed to update location", 400);
        }

        ResponseFormatter.success(
          res,
          { bin: result.data },
          "Bin location updated successfully"
        );
      } catch (error: unknown) {
        logger.error("Error updating bin location:", error);
        ResponseFormatter.serverError(res, "Internal server error while updating location");
      }
    },
  ];
}

/**
 * Bin Analytics Controller - Separate concern for analytics and reporting
 */
export class BinAnalyticsController {
  private static binService = new BinService();

  /**
   * Get bin statistics and analytics
   * @route GET /api/v1/bins/analytics/overview
   */
  static getBinAnalytics = [
    generalRateLimiter,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("analytics", "read")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to view bin analytics");
        }

        const customerId = req.query.customerId as string;
        const result = await this.binService.getBinStatistics(customerId);

        if (!result.success) {
          return ResponseFormatter.serverError(res, "Failed to retrieve bin analytics");
        }

        ResponseFormatter.success(
          res,
          result.data,
          "Bin analytics retrieved successfully"
        );
      } catch (error: unknown) {
        logger.error("Error retrieving bin analytics:", error);
        ResponseFormatter.serverError(res, "Internal server error while retrieving analytics");
      }
    },
  ];

  /**
   * Get bins needing service
   * @route GET /api/v1/bins/service-needed
   */
  static getBinsNeedingService = [
    generalRateLimiter,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "read")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to view service data");
        }

        const result = await this.binService.getBinsNeedingService();

        if (!result.success) {
          return ResponseFormatter.serverError(res, "Failed to retrieve bins needing service");
        }

        ResponseFormatter.success(
          res,
          { bins: result.data },
          result.message || "Bins needing service retrieved successfully"
        );
      } catch (error: unknown) {
        logger.error("Error retrieving bins needing service:", error);
        ResponseFormatter.serverError(res, "Internal server error while retrieving service data");
      }
    },
  ];
}

/**
 * Customer Bin Controller - Separate concern for customer-specific operations
 */
export class CustomerBinController {
  private static binService = new BinService();

  /**
   * Get bins by customer
   * @route GET /api/v1/bins/customer/:customerId
   */
  static getBinsByCustomer = [
    generalRateLimiter,
    ...validateAndHandle(validateCustomerId),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        // Check permissions
        if (!req.user?.canAccess("bins", "read")) {
          return ResponseFormatter.forbidden(res, "Insufficient permissions to view customer bins");
        }

        const { customerId } = req.params;

        // Additional authorization for customer users
        if (req.user.role === UserRole.CUSTOMER || req.user.role === UserRole.CUSTOMER_STAFF) {
          // Validate that the user belongs to the customer organization being queried
          if (req.user.customerId && customerId !== req.user.customerId) {
            return ResponseFormatter.forbidden(res, "Access denied - cannot access other customer's bins");
          }
        }

        const searchCriteria = { customerId };
        const result = await this.binService.searchBins(searchCriteria);

        if (!result.success) {
          return ResponseFormatter.serverError(res, "Failed to retrieve customer bins");
        }

        const bins = Array.isArray(result.data) ? result.data : result.data?.data || [];

        ResponseFormatter.success(
          res,
          {
            customerId,
            bins,
            totalBins: bins.length,
            activeBins: bins.filter((bin: any) => bin.status === "ACTIVE").length,
            smartBins: bins.filter((bin: any) => bin.metadata?.gpsEnabled || bin.metadata?.sensorEnabled).length,
          },
          "Customer bins retrieved successfully"
        );
      } catch (error: unknown) {
        logger.error("Error retrieving customer bins:", error);
        ResponseFormatter.serverError(res, "Internal server error while retrieving customer bins");
      }
    },
  ];
}

export default BinController;