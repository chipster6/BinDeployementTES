/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN SERVICE
 * ============================================================================
 *
 * Business logic service for bin management operations.
 * Handles bin lifecycle, location tracking, service scheduling, and IoT integration.
 *
 * Features:
 * - Bin creation and management
 * - Location and GPS tracking
 * - Service scheduling and routing
 * - Capacity monitoring and alerts
 * - Maintenance tracking
 * - IoT sensor integration
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Op, Transaction } from "sequelize";
import { Bin, BinType, BinStatus } from "@/models/Bin";
import { Customer } from "@/models/Customer";
import { ServiceEvent } from "@/models/ServiceEvent";
import { AuditLog } from "@/models/AuditLog";
import { BaseService, ServiceResult, PaginatedResult } from "./BaseService";
import { logger, Timer } from "@/utils/logger";
import { 
  AppError, 
  ValidationError, 
  NotFoundError 
} from "@/middleware/errorHandler";

/**
 * Bin creation data interface
 */
interface CreateBinData {
  serialNumber: string;
  type: BinType;
  capacity: number;
  customerId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  installationDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Bin location data
 */
interface BinLocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  timestamp?: Date;
  source?: "gps" | "manual" | "geocoded";
}

/**
 * Bin capacity reading
 */
interface CapacityReading {
  level: number; // 0-100 percentage
  weight?: number; // in kg
  temperature?: number; // in Celsius
  timestamp: Date;
  source: "sensor" | "manual" | "estimated";
  sensorId?: string;
}

/**
 * Service scheduling data
 */
interface ServiceScheduleData {
  scheduledDate: Date;
  serviceType: string;
  priority?: "low" | "normal" | "high" | "urgent";
  notes?: string;
  assignedDriverId?: string;
  estimatedDuration?: number; // in minutes
}

/**
 * Bin search criteria
 */
interface BinSearchCriteria {
  customerId?: string;
  type?: BinType;
  status?: BinStatus;
  capacityMin?: number;
  capacityMax?: number;
  lastServiceBefore?: Date;
  lastServiceAfter?: Date;
  needsService?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in km
  };
  search?: string;
}

/**
 * Bin service class
 */
export class BinService extends BaseService<Bin> {
  constructor() {
    super(Bin, "BinService");
  }

  /**
   * Create a new bin
   */
  public async createBin(
    binData: CreateBinData,
    createdBy: string,
    transaction?: Transaction
  ): Promise<ServiceResult<Bin>> {
    const timer = new Timer("BinService.createBin");

    try {
      // Validate required fields
      await this.validateBinData(binData);

      // Check if serial number already exists
      const existingBin = await Bin.findOne({
        where: { serialNumber: binData.serialNumber }
      });

      if (existingBin) {
        throw new ValidationError("Bin with this serial number already exists");
      }

      // Verify customer exists
      const customer = await Customer.findByPk(binData.customerId);
      if (!customer) {
        throw new ValidationError("Customer not found");
      }

      const result = await this.withTransaction(async (tx) => {
        // Create bin
        const bin = await Bin.create({
          serialNumber: binData.serialNumber,
          type: binData.type,
          capacity: binData.capacity,
          customerId: binData.customerId,
          status: BinStatus.ACTIVE,
          latitude: binData.latitude,
          longitude: binData.longitude,
          address: binData.address,
          installationDate: binData.installationDate || new Date(),
          lastServiceDate: null,
          nextServiceDate: this.calculateNextServiceDate(binData.type, customer.serviceFrequency),
          currentCapacity: 0,
          maintenanceStatus: "good",
          notes: binData.notes,
          metadata: binData.metadata || {},
        }, { transaction: tx });

        // Log bin creation
        await AuditLog.create({
          userId: createdBy,
          action: "bin_created",
          entityType: "Bin",
          entityId: bin.id,
          changes: {
            serialNumber: binData.serialNumber,
            type: binData.type,
            customerId: binData.customerId,
          },
          metadata: {
            createdBy,
            ip: null,
          },
        }, { transaction: tx });

        return bin;
      }, transaction);

      timer.end({ success: true, binId: result.id });
      logger.info("Bin created successfully", {
        binId: result.id,
        serialNumber: binData.serialNumber,
        type: binData.type,
        customerId: binData.customerId,
      });

      return {
        success: true,
        data: result,
        message: "Bin created successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Bin creation failed", {
        serialNumber: binData.serialNumber,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create bin", 500);
    }
  }

  /**
   * Update bin location
   */
  public async updateLocation(
    binId: string,
    locationData: BinLocationData,
    updatedBy: string
  ): Promise<ServiceResult<Bin>> {
    const timer = new Timer("BinService.updateLocation");

    try {
      const bin = await this.findById(binId);
      if (!bin) {
        throw new NotFoundError("Bin not found");
      }

      const result = await this.withTransaction(async (transaction) => {
        // Store previous location for audit
        const previousLocation = {
          latitude: bin.latitude,
          longitude: bin.longitude,
          address: bin.address,
        };

        // Update bin location
        const updatedBin = await bin.update({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
          locationUpdatedAt: locationData.timestamp || new Date(),
          locationAccuracy: locationData.accuracy,
          locationSource: locationData.source || "manual",
        }, { transaction });

        // Log location change
        await AuditLog.create({
          userId: updatedBy,
          action: "bin_location_updated",
          entityType: "Bin",
          entityId: binId,
          changes: {
            previousLocation,
            newLocation: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              address: locationData.address,
            },
            source: locationData.source,
          },
        }, { transaction });

        return updatedBin;
      });

      // Clear bin cache
      await this.deleteFromCache(`id:${binId}`);

      timer.end({ success: true, binId });
      logger.info("Bin location updated", {
        binId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        updatedBy,
      });

      return {
        success: true,
        data: result,
        message: "Bin location updated successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Bin location update failed", {
        binId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to update bin location", 500);
    }
  }

  /**
   * Record capacity reading
   */
  public async recordCapacityReading(
    binId: string,
    reading: CapacityReading
  ): Promise<ServiceResult<Bin>> {
    const timer = new Timer("BinService.recordCapacityReading");

    try {
      const bin = await this.findById(binId);
      if (!bin) {
        throw new NotFoundError("Bin not found");
      }

      // Validate capacity reading
      if (reading.level < 0 || reading.level > 100) {
        throw new ValidationError("Capacity level must be between 0 and 100");
      }

      const result = await this.withTransaction(async (transaction) => {
        // Update current capacity
        const updatedBin = await bin.update({
          currentCapacity: reading.level,
          lastCapacityUpdate: reading.timestamp,
          sensorData: {
            ...bin.sensorData,
            lastReading: reading,
            readings: [
              reading,
              ...(bin.sensorData?.readings || []).slice(0, 99), // Keep last 100 readings
            ],
          },
        }, { transaction });

        // Check if bin needs service
        if (reading.level >= 80) {
          await this.scheduleServiceIfNeeded(bin, reading.level, transaction);
        }

        return updatedBin;
      });

      // Clear cache
      await this.deleteFromCache(`id:${binId}`);

      timer.end({ success: true, binId, level: reading.level });
      logger.info("Capacity reading recorded", {
        binId,
        level: reading.level,
        source: reading.source,
      });

      return {
        success: true,
        data: result,
        message: "Capacity reading recorded successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Capacity reading failed", {
        binId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to record capacity reading", 500);
    }
  }

  /**
   * Schedule service for bin
   */
  public async scheduleService(
    binId: string,
    scheduleData: ServiceScheduleData,
    scheduledBy: string
  ): Promise<ServiceResult<ServiceEvent>> {
    const timer = new Timer("BinService.scheduleService");

    try {
      const bin = await this.findById(binId);
      if (!bin) {
        throw new NotFoundError("Bin not found");
      }

      const result = await this.withTransaction(async (transaction) => {
        // Create service event
        const serviceEvent = await ServiceEvent.create({
          binId,
          customerId: bin.customerId,
          serviceType: scheduleData.serviceType,
          scheduledDate: scheduleData.scheduledDate,
          status: "scheduled",
          priority: scheduleData.priority || "normal",
          assignedDriverId: scheduleData.assignedDriverId,
          estimatedDuration: scheduleData.estimatedDuration,
          notes: scheduleData.notes,
          createdBy: scheduledBy,
        }, { transaction });

        // Update bin's next service date if this is sooner
        if (!bin.nextServiceDate || scheduleData.scheduledDate < bin.nextServiceDate) {
          await bin.update({
            nextServiceDate: scheduleData.scheduledDate,
          }, { transaction });
        }

        // Log service scheduling
        await AuditLog.create({
          userId: scheduledBy,
          action: "service_scheduled",
          entityType: "Bin",
          entityId: binId,
          changes: {
            serviceType: scheduleData.serviceType,
            scheduledDate: scheduleData.scheduledDate,
            priority: scheduleData.priority,
          },
        }, { transaction });

        return serviceEvent;
      });

      // Clear cache
      await this.deleteFromCache(`id:${binId}`);

      timer.end({ success: true, binId, serviceEventId: result.id });
      logger.info("Service scheduled for bin", {
        binId,
        serviceType: scheduleData.serviceType,
        scheduledDate: scheduleData.scheduledDate,
        scheduledBy,
      });

      return {
        success: true,
        data: result,
        message: "Service scheduled successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Service scheduling failed", {
        binId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to schedule service", 500);
    }
  }

  /**
   * Search bins with advanced criteria
   */
  public async searchBins(
    criteria: BinSearchCriteria,
    pagination?: { page: number; limit: number }
  ): Promise<ServiceResult<PaginatedResult<Bin> | Bin[]>> {
    const timer = new Timer("BinService.searchBins");

    try {
      const whereClause = await this.buildSearchWhereClause(criteria);
      
      const options: any = {
        where: whereClause,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "companyName", "contactName"],
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
        resultsCount: Array.isArray(result) ? result.length : result.data.length 
      });

      return {
        success: true,
        data: result,
        message: "Bins retrieved successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Bin search failed", { error: error.message });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to search bins", 500);
    }
  }

  /**
   * Get bins needing service
   */
  public async getBinsNeedingService(): Promise<ServiceResult<Bin[]>> {
    const timer = new Timer("BinService.getBinsNeedingService");

    try {
      const bins = await Bin.findAll({
        where: {
          status: BinStatus.ACTIVE,
          [Op.or]: [
            { currentCapacity: { [Op.gte]: 80 } },
            { nextServiceDate: { [Op.lte]: new Date() } },
            { maintenanceStatus: "needs_repair" },
          ],
        },
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "companyName", "contactName", "priority"],
          },
        ],
        order: [
          ["currentCapacity", "DESC"],
          ["nextServiceDate", "ASC"],
        ],
      });

      timer.end({ success: true, count: bins.length });

      return {
        success: true,
        data: bins,
        message: `Found ${bins.length} bins needing service`,
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Failed to get bins needing service", { error: error.message });
      throw new AppError("Failed to get bins needing service", 500);
    }
  }

  /**
   * Get bin statistics
   */
  public async getBinStatistics(customerId?: string): Promise<ServiceResult<Record<string, any>>> {
    const timer = new Timer("BinService.getBinStatistics");

    try {
      const whereClause = customerId ? { customerId } : {};

      const [
        totalBins,
        activeBins,
        binsNeedingService,
        averageCapacity,
        binsByType,
        recentServices,
      ] = await Promise.all([
        Bin.count({ where: whereClause }),
        Bin.count({ where: { ...whereClause, status: BinStatus.ACTIVE } }),
        Bin.count({
          where: {
            ...whereClause,
            status: BinStatus.ACTIVE,
            [Op.or]: [
              { currentCapacity: { [Op.gte]: 80 } },
              { nextServiceDate: { [Op.lte]: new Date() } },
            ],
          },
        }),
        Bin.findOne({
          where: { ...whereClause, status: BinStatus.ACTIVE },
          attributes: [
            [Bin.sequelize?.fn("AVG", Bin.sequelize?.col("currentCapacity")), "average"],
          ],
        }),
        Bin.findAll({
          where: whereClause,
          attributes: [
            "type",
            [Bin.sequelize?.fn("COUNT", "*"), "count"],
          ],
          group: ["type"],
        }),
        ServiceEvent.count({
          where: {
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            ...(customerId && { customerId }),
          },
        }),
      ]);

      const statistics = {
        total: totalBins,
        active: activeBins,
        inactive: totalBins - activeBins,
        needingService: binsNeedingService,
        averageCapacity: Math.round((averageCapacity as any)?.dataValues?.average || 0),
        byType: binsByType.reduce((acc, item) => {
          acc[(item as any).type] = parseInt((item as any).dataValues.count);
          return acc;
        }, {} as Record<string, number>),
        recentServices,
        serviceRate: totalBins > 0 ? Math.round((binsNeedingService / totalBins) * 100) : 0,
      };

      timer.end({ success: true });

      return {
        success: true,
        data: statistics,
        message: "Statistics retrieved successfully",
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Failed to get bin statistics", { error: error.message });
      throw new AppError("Failed to get bin statistics", 500);
    }
  }

  /**
   * Private helper methods
   */

  private async validateBinData(binData: CreateBinData): Promise<void> {
    const errors: any[] = [];

    if (!binData.serialNumber || binData.serialNumber.trim().length === 0) {
      errors.push({ field: "serialNumber", message: "Serial number is required" });
    }

    if (!binData.type || !Object.values(BinType).includes(binData.type)) {
      errors.push({ field: "type", message: "Valid bin type is required" });
    }

    if (!binData.capacity || binData.capacity <= 0) {
      errors.push({ field: "capacity", message: "Capacity must be greater than 0" });
    }

    if (!binData.customerId) {
      errors.push({ field: "customerId", message: "Customer ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", { errors });
    }
  }

  private calculateNextServiceDate(binType: BinType, serviceFrequency: string): Date {
    const now = new Date();
    let daysToAdd = 7; // Default weekly

    switch (serviceFrequency) {
      case "daily":
        daysToAdd = 1;
        break;
      case "weekly":
        daysToAdd = 7;
        break;
      case "biweekly":
        daysToAdd = 14;
        break;
      case "monthly":
        daysToAdd = 30;
        break;
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private async scheduleServiceIfNeeded(
    bin: Bin,
    capacityLevel: number,
    transaction: Transaction
  ): Promise<void> {
    if (capacityLevel < 80) return;

    // Check if service is already scheduled
    const existingService = await ServiceEvent.findOne({
      where: {
        binId: bin.id,
        status: "scheduled",
        scheduledDate: { [Op.gte]: new Date() },
      },
      transaction,
    });

    if (existingService) return;

    // Schedule urgent service
    const urgentServiceDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    await ServiceEvent.create({
      binId: bin.id,
      customerId: bin.customerId,
      serviceType: "collection",
      scheduledDate: urgentServiceDate,
      status: "scheduled",
      priority: capacityLevel >= 95 ? "urgent" : "high",
      notes: `Auto-scheduled due to ${capacityLevel}% capacity`,
      createdBy: "system",
    }, { transaction });

    logger.info("Auto-scheduled service for bin", {
      binId: bin.id,
      capacityLevel,
      scheduledDate: urgentServiceDate,
    });
  }

  private async buildSearchWhereClause(criteria: BinSearchCriteria): Promise<any> {
    const whereClause: any = {};

    if (criteria.customerId) {
      whereClause.customerId = criteria.customerId;
    }

    if (criteria.type) {
      whereClause.type = criteria.type;
    }

    if (criteria.status) {
      whereClause.status = criteria.status;
    }

    if (criteria.capacityMin !== undefined || criteria.capacityMax !== undefined) {
      whereClause.currentCapacity = {};
      if (criteria.capacityMin !== undefined) {
        whereClause.currentCapacity[Op.gte] = criteria.capacityMin;
      }
      if (criteria.capacityMax !== undefined) {
        whereClause.currentCapacity[Op.lte] = criteria.capacityMax;
      }
    }

    if (criteria.lastServiceBefore || criteria.lastServiceAfter) {
      whereClause.lastServiceDate = {};
      if (criteria.lastServiceBefore) {
        whereClause.lastServiceDate[Op.lte] = criteria.lastServiceBefore;
      }
      if (criteria.lastServiceAfter) {
        whereClause.lastServiceDate[Op.gte] = criteria.lastServiceAfter;
      }
    }

    if (criteria.needsService) {
      whereClause[Op.or] = [
        { currentCapacity: { [Op.gte]: 80 } },
        { nextServiceDate: { [Op.lte]: new Date() } },
      ];
    }

    if (criteria.search) {
      const searchPattern = `%${criteria.search}%`;
      whereClause[Op.or] = [
        { serialNumber: { [Op.iLike]: searchPattern } },
        { address: { [Op.iLike]: searchPattern } },
        { notes: { [Op.iLike]: searchPattern } },
      ];
    }

    return whereClause;
  }
}

export default BinService;