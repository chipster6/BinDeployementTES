/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN CONTROLLER
 * ============================================================================
 *
 * Bin management controller with comprehensive CRUD operations, IoT integration,
 * fill level monitoring, and service scheduling functionality.
 *
 * Features:
 * - Full bin CRUD operations with validation
 * - Fill level monitoring and alerts
 * - GPS location tracking
 * - Service scheduling and optimization
 * - Customer assignment and management
 * - Analytics and reporting
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response } from "express";
import { Op } from "sequelize";
import { logger } from "@/utils/logger";
import { Bin, BinType, BinStatus, BinMaterial } from "@/models/Bin";
import { Customer } from "@/models/Customer";
import { User, UserRole } from "@/models/User";
import type { AuthenticatedRequest } from "@/middleware/auth";

/**
 * Bin Controller Class
 */
export class BinController {
  /**
   * Get all bins with filtering and pagination
   *
   * @route GET /api/v1/bins
   * @access Private (Admin, Dispatcher, Office Staff, Driver)
   */
  public static async getBins(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Extract authenticated user
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      // Extract query parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 10),
      );
      const offset = (page - 1) * limit;

      // Filtering parameters
      const status = req.query.status as BinStatus;
      const binType = req.query.binType as BinType;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;
      const gpsEnabled = req.query.gpsEnabled === "true";
      const sensorEnabled = req.query.sensorEnabled === "true";
      const needsService = req.query.needsService === "true";
      const overdue = req.query.overdue === "true";
      const fillLevelMin = parseInt(req.query.fillLevelMin as string);
      const fillLevelMax = parseInt(req.query.fillLevelMax as string);

      // Sorting parameters
      const sortBy = (req.query.sortBy as string) || "created_at";
      const sortOrder = (
        (req.query.sortOrder as string) || "DESC"
      ).toUpperCase();

      // Build where clause
      const whereClause: any = {
        deletedAt: null,
      };

      if (status) whereClause.status = status;
      if (binType) whereClause.binType = binType;
      if (customerId) whereClause.customerId = customerId;
      if (gpsEnabled) whereClause.gpsEnabled = true;
      if (sensorEnabled) whereClause.sensorEnabled = true;

      // Fill level filtering
      if (!isNaN(fillLevelMin) || !isNaN(fillLevelMax)) {
        whereClause.fillLevelPercent = {};
        if (!isNaN(fillLevelMin))
          whereClause.fillLevelPercent[Op.gte] = fillLevelMin;
        if (!isNaN(fillLevelMax))
          whereClause.fillLevelPercent[Op.lte] = fillLevelMax;
      }

      // Service needs filtering
      if (needsService) {
        whereClause.fillLevelPercent = {
          [Op.gte]: 80,
        };
      }

      // Overdue filtering
      if (overdue) {
        whereClause.nextServiceDate = {
          [Op.lt]: new Date(),
        };
      }

      // Search functionality
      if (search) {
        whereClause[Op.or] = [
          {
            binNumber: { [Op.iLike]: `%${search}%` },
          },
          { size: { [Op.iLike]: `%${search}%` } },
          { color: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Execute query with pagination
      const { rows: bins, count: totalBins } = await Bin.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "customerNumber", "organizationId"],
            include: [
              {
                association: "organization",
                attributes: ["id", "name", "displayName"],
              },
            ],
          },
          {
            model: User,
            as: "createdByUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [[sortBy, sortOrder]],
        limit,
        offset,
      });

      // Log access
      logger.info("Bins retrieved", {
        userId: user.id,
        totalBins,
        filters: { status, binType, customerId, search },
        pagination: { page, limit },
      });

      res.status(200).json({
        success: true,
        message: "Bins retrieved successfully",
        data: {
          bins,
          pagination: {
            page,
            limit,
            total: totalBins,
            pages: Math.ceil(totalBins / limit),
          },
          filters: {
            status,
            binType,
            customerId,
            search,
            gpsEnabled,
            sensorEnabled,
            needsService,
            overdue,
            fillLevelRange:
              !isNaN(fillLevelMin) || !isNaN(fillLevelMax)
                ? {
                    min: fillLevelMin,
                    max: fillLevelMax,
                  }
                : null,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error retrieving bins:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving bins",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Create new bin
   *
   * @route POST /api/v1/bins
   * @access Private (Admin, Office Staff)
   */
  public static async createBin(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Extract authenticated user
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      const {
        binNumber,
        customerId,
        binType,
        size,
        capacityCubicYards,
        material,
        color,
        installationDate,
        gpsEnabled,
        sensorEnabled,
        location,
      } = req.body;

      // Validate customer exists
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        res.status(400).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Check if bin number is already taken (if provided)
      if (binNumber) {
        const existingBin = await Bin.isBinNumberTaken(binNumber);
        if (existingBin) {
          res.status(400).json({
            success: false,
            message: "Bin number is already in use",
          });
          return;
        }
      }

      // Create bin
      const bin = await Bin.create({
        binNumber:
          binNumber || (await Bin.generateBinNumber(binType, customerId)),
        customerId,
        binType,
        size,
        capacityCubicYards,
        material,
        color,
        installationDate,
        gpsEnabled: gpsEnabled || false,
        sensorEnabled: sensorEnabled || false,
        location,
        createdBy: user.id,
        updatedBy: user.id,
      });

      // Fetch the created bin with associations
      const createdBin = await Bin.findByPk(bin.id, {
        include: [
          {
            model: Customer,
            as: "customer",
            include: [{ association: "organization" }],
          },
          {
            model: User,
            as: "createdByUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      logger.info("Bin created successfully", {
        binId: bin.id,
        binNumber: bin.binNumber,
        customerId,
        binType,
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        message: "Bin created successfully",
        data: {
          bin: createdBin,
        },
      });
    } catch (error: any) {
      logger.error("Error creating bin:", error);

      if (error.name === "SequelizeValidationError") {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e: any) => ({
            field: e.path,
            message: e?.message,
          })),
        });
        return;
      }

      if (error.name === "SequelizeUniqueConstraintError") {
        res.status(409).json({
          success: false,
          message: "Bin number must be unique",
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Internal server error while creating bin",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Get bin by ID
   *
   * @route GET /api/v1/bins/:id
   * @access Private (Admin, Office Staff, Dispatcher, Driver, Customer owns)
   */
  public static async getBinById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      // Check permissions
      if (!user.canAccess("bins", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view bin details",
        });
        return;
      }

      const bin = await Bin.findByPk(id, {
        include: [
          {
            model: Customer,
            as: "customer",
            include: [{ association: "organization" }],
          },
          {
            model: User,
            as: "createdByUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "updatedByUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      });

      if (!bin) {
        res.status(404).json({
          success: false,
          message: "Bin not found",
        });
        return;
      }

      // Additional authorization for customer users
      if (
        user.role === UserRole.CUSTOMER ||
        user.role === UserRole.CUSTOMER_STAFF
      ) {
        // TODO: Implement customer ownership validation
        // For now, allow all customer users to view bins
      }

      // Calculate derived properties
      const binData = {
        ...bin.toJSON(),
        computed: {
          displayIdentifier: bin.getDisplayIdentifier(),
          binTypeLabel: bin.getBinTypeLabel(),
          statusLabel: bin.getStatusLabel(),
          materialLabel: bin.getMaterialLabel(),
          capacityFormatted: bin.getCapacityFormatted(),
          fillLevelStatus: bin.getFillLevelStatus(),
          fillLevelColorCode: bin.getFillLevelColorCode(),
          isActive: bin.isActive(),
          isSmartBin: bin.isSmartBin(),
          needsService: bin.needsService(),
          isOverdueForService: bin.isOverdueForService(),
          daysUntilNextService: bin.getDaysUntilNextService(),
          daysSinceLastService: bin.getDaysSinceLastService(),
          installationAgeMonths: bin.getInstallationAgeMonths(),
          isDueForReplacement: bin.isDueForReplacement(),
          hasLocationCoordinates: bin.hasLocationCoordinates(),
        },
      };

      logger.info("Bin retrieved by ID", {
        binId: id,
        userId: user.id,
        binNumber: bin.binNumber,
      });

      res.status(200).json({
        success: true,
        message: "Bin retrieved successfully",
        data: {
          bin: binData,
        },
      });
    } catch (error: any) {
      logger.error("Error retrieving bin by ID:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving bin",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Update bin information
   *
   * @route PUT /api/v1/bins/:id
   * @access Private (Admin, Office Staff)
   */
  public static async updateBin(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Extract authenticated user
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      // Extract bin ID from params
      const { id } = req.params;

      const bin = await Bin.findByPk(id);
      if (!bin) {
        res.status(404).json({
          success: false,
          message: "Bin not found",
        });
        return;
      }

      const {
        binNumber,
        customerId,
        binType,
        size,
        capacityCubicYards,
        material,
        color,
        status,
        installationDate,
        lastServiceDate,
        nextServiceDate,
        gpsEnabled,
        sensorEnabled,
        fillLevelPercent,
        location,
      } = req.body;

      // Check bin number uniqueness if changing
      if (binNumber && binNumber !== bin.binNumber) {
        const existingBin = await Bin.isBinNumberTaken(binNumber, bin.id);
        if (existingBin) {
          res.status(400).json({
            success: false,
            message: "Bin number is already in use",
          });
          return;
        }
      }

      // Validate customer exists if changing
      if (customerId && customerId !== bin.customerId) {
        const customer = await Customer.findByPk(customerId);
        if (!customer) {
          res.status(400).json({
            success: false,
            message: "Customer not found",
          });
          return;
        }
      }

      // Store original values for audit
      const originalData = {
        binNumber: bin.binNumber,
        customerId: bin.customerId,
        status: bin.status,
        fillLevelPercent: bin.fillLevelPercent,
      };

      // Update bin
      await bin.update({
        binNumber,
        customerId,
        binType,
        size,
        capacityCubicYards,
        material,
        color,
        status,
        installationDate,
        lastServiceDate,
        nextServiceDate,
        gpsEnabled,
        sensorEnabled,
        fillLevelPercent,
        location,
        updatedBy: user.id,
      });

      // Fetch updated bin with associations
      const updatedBin = await Bin.findByPk(bin.id, {
        include: [
          {
            model: Customer,
            as: "customer",
            include: [{ association: "organization" }],
          },
          {
            model: User,
            as: "updatedByUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      logger.info("Bin updated successfully", {
        binId: bin.id,
        binNumber: bin.binNumber,
        updatedBy: user.id,
        changes: req.body,
      });

      res.status(200).json({
        success: true,
        message: "Bin updated successfully",
        data: {
          bin: updatedBin,
        },
      });
    } catch (error: any) {
      logger.error("Error updating bin:", error);

      if (error.name === "SequelizeValidationError") {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e: any) => ({
            field: e.path,
            message: e?.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Internal server error while updating bin",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Delete bin (soft delete)
   *
   * @route DELETE /api/v1/bins/:id
   * @access Private (Admin only)
   */
  public static async deleteBin(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      // Check permissions (only admins can delete bins)
      if (!user.canAccess("bins", "delete")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to delete bins",
        });
        return;
      }

      const bin = await Bin.findByPk(id);
      if (!bin) {
        res.status(404).json({
          success: false,
          message: "Bin not found",
        });
        return;
      }

      // Soft delete the bin
      await bin.update({
        deletedAt: new Date(),
        deletedBy: user.id,
      });

      logger.warn("Bin deleted", {
        binId: bin.id,
        binNumber: bin.binNumber,
        deletedBy: user.id,
      });

      res.status(200).json({
        success: true,
        message: "Bin deleted successfully",
        data: {
          binId: bin.id,
          binNumber: bin.binNumber,
          deletedAt: bin.deletedAt,
        },
      });
    } catch (error: any) {
      logger.error("Error deleting bin:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while deleting bin",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Get bins by customer
   *
   * @route GET /api/v1/bins/customer/:customerId
   * @access Private (Admin, Office Staff, Customer owns)
   */
  public static async getBinsByCustomer(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user;
      const { customerId } = req.params;
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }
      
      if (!customerId) {
        res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
        return;
      }

      // Check permissions
      if (!user.canAccess("bins", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view customer bins",
        });
        return;
      }

      // Additional authorization for customer users
      if (
        user.role === UserRole.CUSTOMER ||
        user.role === UserRole.CUSTOMER_STAFF
      ) {
        // TODO: Validate that the user belongs to the customer organization
        // For now, allow access
      }

      const bins = await Bin.findByCustomer(customerId);

      logger.info("Customer bins retrieved", {
        customerId,
        userId: user.id,
        binCount: bins.length,
      });

      res.status(200).json({
        success: true,
        message: "Customer bins retrieved successfully",
        data: {
          customerId,
          bins,
          totalBins: bins.length,
          activeBins: bins.filter((bin) => bin.status === BinStatus.ACTIVE)
            .length,
          smartBins: bins.filter((bin) => bin.isSmartBin()).length,
        },
      });
    } catch (error: any) {
      logger.error("Error retrieving customer bins:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving customer bins",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Update bin fill level (typically called by IoT sensors)
   *
   * @route PUT /api/v1/bins/:id/fill-level
   * @access Private (Admin, Office Staff, System)
   */
  public static async updateFillLevel(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Extract authenticated user
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      // Extract bin ID from params
      const { id } = req.params;
      const { fillLevelPercent } = req.body;

      const bin = await Bin.findByPk(id);
      if (!bin) {
        res.status(404).json({
          success: false,
          message: "Bin not found",
        });
        return;
      }

      const previousFillLevel = bin.fillLevelPercent;

      // Update fill level
      await bin.update({
        fillLevelPercent,
        updatedBy: user.id,
      });

      // Check if service is now needed
      const needsService = bin.needsService();
      const fillLevelStatus = bin.getFillLevelStatus();

      logger.info("Bin fill level updated", {
        binId: bin.id,
        binNumber: bin.binNumber,
        previousFillLevel,
        newFillLevel: fillLevelPercent,
        needsService,
        updatedBy: user.id,
      });

      res.status(200).json({
        success: true,
        message: "Bin fill level updated successfully",
        data: {
          binId: bin.id,
          binNumber: bin.binNumber,
          fillLevelPercent,
          fillLevelStatus,
          needsService,
          colorCode: bin.getFillLevelColorCode(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating bin fill level:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while updating fill level",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }

  /**
   * Get bin statistics and analytics
   *
   * @route GET /api/v1/bins/analytics/overview
   * @access Private (Admin, Office Staff, Dispatcher)
   */
  public static async getBinAnalytics(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user;

      // Check permissions
      if (!user.canAccess("analytics", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view bin analytics",
        });
        return;
      }

      // Get comprehensive bin statistics
      const [
        binStats,
        fillLevelDistribution,
        overdueCount,
        smartBinCount,
        dueForReplacementCount,
      ] = await Promise.all([
        Bin.getBinStatistics(),
        Bin.getFillLevelDistribution(),
        Bin.findOverdue().then((bins) => bins.length),
        Bin.findSmartBins().then((bins) => bins.length),
        Bin.getBinsDueForReplacement().then((bins) => bins.length),
      ]);

      logger.info("Bin analytics retrieved", {
        userId: user.id,
      });

      res.status(200).json({
        success: true,
        message: "Bin analytics retrieved successfully",
        data: {
          overview: binStats,
          fillLevelDistribution,
          alerts: {
            overdueService: overdueCount,
            needingReplacement: dueForReplacementCount,
          },
          smartBins: {
            total: smartBinCount,
            percentage: binStats.smartBins?.totalBins
              ? Math.round((smartBinCount / binStats.smartBins.totalBins) * 100)
              : 0,
          },
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error retrieving bin analytics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving analytics",
        error:
          process.env.NODE_ENV === "development" ? error instanceof Error ? error?.message : String(error) : undefined,
      });
    }
  }
}

export default BinController;
