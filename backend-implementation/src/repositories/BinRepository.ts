/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN REPOSITORY
 * ============================================================================
 *
 * Bin-specific repository extending BaseRepository.
 * Provides specialized data access methods for Bin entity operations.
 *
 * Features:
 * - Location-based queries and spatial searches
 * - Capacity and service status filtering
 * - Customer and route-specific lookups
 * - Maintenance and IoT data access
 * - Service scheduling queries
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Op, WhereOptions, literal, fn, col } from "sequelize";
import { Bin, BinType, BinStatus } from "@/models/Bin";
import { Customer } from "@/models/Customer";
import { ServiceEvent } from "@/models/ServiceEvent";
import { BaseRepository, RepositoryFilter, PaginationResult } from "./BaseRepository";
import { logger } from "@/utils/logger";

/**
 * Bin search criteria with spatial support
 */
export interface BinSearchCriteria extends RepositoryFilter {
  customerId?: string;
  type?: BinType;
  status?: BinStatus;
  capacityMin?: number;
  capacityMax?: number;
  lastServiceBefore?: Date;
  lastServiceAfter?: Date;
  needsService?: boolean;
  maintenanceStatus?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  serialNumbers?: string[];
  search?: string;
}

/**
 * Bin analytics interface
 */
export interface BinAnalytics {
  total: number;
  active: number;
  byType: Record<BinType, number>;
  byStatus: Record<BinStatus, number>;
  byCapacityRange: Record<string, number>;
  averageCapacity: number;
  needingService: number;
  recentServices: number;
  maintenanceIssues: number;
}

/**
 * Service schedule interface
 */
export interface ServiceScheduleSummary {
  binId: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  currentCapacity: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  priority: "low" | "normal" | "high" | "urgent";
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

/**
 * Bin repository class
 */
export class BinRepository extends BaseRepository<Bin> {
  constructor() {
    super(Bin);
  }

  /**
   * Find bins by serial number with full details
   */
  public async findBySerialNumber(
    serialNumber: string,
    includeCustomer: boolean = true
  ): Promise<Bin | null> {
    const cacheKey = this.generateCacheKey("findBySerialNumber", {
      serialNumber,
      includeCustomer,
    });

    const cached = await this.getFromCache<Bin>(cacheKey);
    if (cached) return cached;

    const include = [];
    if (includeCustomer) {
      include.push({
        model: Customer,
        as: "customer",
        attributes: ["id", "companyName", "contactName", "email"],
      });
    }

    const bin = await Bin.findOne({
      where: { serialNumber },
      include,
    });

    if (bin) {
      await this.setCache(cacheKey, bin);
    }

    return bin;
  }

  /**
   * Find bins within radius of location
   */
  public async findBinsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number,
    options: {
      status?: BinStatus;
      customerId?: string;
      limit?: number;
    } = {}
  ): Promise<Array<Bin & { distance: number }>> {
    const whereClause: WhereOptions = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    };

    if (options.status) {
      whereClause.status = options.status;
    }

    if (options.customerId) {
      whereClause.customerId = options.customerId;
    }

    // Use PostGIS distance calculation if available, otherwise use Haversine
    const distanceQuery = literal(`
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    `);

    const bins = await Bin.findAll({
      where: whereClause,
      attributes: [
        "*",
        [distanceQuery, "distance"],
      ],
      having: literal(`
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${longitude})) + 
          sin(radians(${latitude})) * sin(radians(latitude))
        ) <= ${radiusKm}
      `),
      order: [[literal("distance"), "ASC"]],
      limit: options.limit || 50,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "companyName", "contactName"],
        },
      ],
    }) as any;

    return bins;
  }

  /**
   * Find bins needing immediate service
   */
  public async findBinsNeedingUrgentService(): Promise<Bin[]> {
    return this.findAll({
      where: {
        status: BinStatus.ACTIVE,
        [Op.or]: [
          { currentCapacity: { [Op.gte]: 90 } }, // 90%+ full
          { 
            nextServiceDate: { 
              [Op.and]: [
                { [Op.lte]: new Date() },
                { [Op.ne]: null },
              ],
            },
          },
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
  }

  /**
   * Find bins by capacity range
   */
  public async findBinsByCapacityRange(
    minCapacity: number,
    maxCapacity: number,
    customerId?: string
  ): Promise<Bin[]> {
    const whereClause: WhereOptions = {
      currentCapacity: {
        [Op.gte]: minCapacity,
        [Op.lte]: maxCapacity,
      },
      status: BinStatus.ACTIVE,
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "companyName"],
        },
      ],
      order: [["currentCapacity", "DESC"]],
    });
  }

  /**
   * Get service schedule for bins
   */
  public async getServiceSchedule(
    filters: {
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      priority?: string;
    } = {}
  ): Promise<ServiceScheduleSummary[]> {
    const whereClause: WhereOptions = {
      status: BinStatus.ACTIVE,
    };

    if (filters.customerId) {
      whereClause.customerId = filters.customerId;
    }

    let dateFilter: WhereOptions = {};
    if (filters.startDate || filters.endDate) {
      dateFilter.nextServiceDate = {};
      if (filters.startDate) {
        dateFilter.nextServiceDate[Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        dateFilter.nextServiceDate[Op.lte] = filters.endDate;
      }
    }

    const bins = await Bin.findAll({
      where: { ...whereClause, ...dateFilter },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "companyName", "priority"],
        },
        {
          model: ServiceEvent,
          as: "serviceEvents",
          where: {
            status: "scheduled",
            scheduledDate: { [Op.gte]: new Date() },
          },
          required: false,
          limit: 1,
          order: [["scheduledDate", "ASC"]],
        },
      ],
      order: [["nextServiceDate", "ASC"]],
    });

    return bins.map(bin => {
      let priority: "low" | "normal" | "high" | "urgent" = "normal";
      
      // Determine priority based on capacity and customer priority
      if (bin.currentCapacity >= 95) {
        priority = "urgent";
      } else if (bin.currentCapacity >= 85) {
        priority = "high";
      } else if (bin.customer?.priority === "high") {
        priority = "high";
      } else if (bin.customer?.priority === "low") {
        priority = "low";
      }

      return {
        binId: bin.id,
        serialNumber: bin.serialNumber,
        customerId: bin.customerId,
        customerName: bin.customer?.companyName || "Unknown",
        currentCapacity: bin.currentCapacity,
        lastServiceDate: bin.lastServiceDate,
        nextServiceDate: bin.nextServiceDate,
        priority,
        location: {
          latitude: bin.latitude,
          longitude: bin.longitude,
          address: bin.address,
        },
      };
    });
  }

  /**
   * Get bin analytics
   */
  public async getBinAnalytics(customerId?: string): Promise<BinAnalytics> {
    const whereClause = customerId ? { customerId } : {};

    const [
      totalBins,
      activeBins,
      binsByType,
      binsByStatus,
      capacityStats,
      binsNeedingService,
      recentServices,
      maintenanceIssues,
    ] = await Promise.all([
      this.count(whereClause),
      this.count({ ...whereClause, status: BinStatus.ACTIVE }),
      
      // Bins by type
      Bin.findAll({
        where: whereClause,
        attributes: [
          "type",
          [fn("COUNT", "*"), "count"],
        ],
        group: ["type"],
        raw: true,
      }),
      
      // Bins by status
      Bin.findAll({
        where: whereClause,
        attributes: [
          "status",
          [fn("COUNT", "*"), "count"],
        ],
        group: ["status"],
        raw: true,
      }),
      
      // Capacity statistics
      Bin.findAll({
        where: whereClause,
        attributes: [
          [fn("AVG", col("currentCapacity")), "average"],
          [fn("COUNT", literal("CASE WHEN current_capacity >= 80 THEN 1 END")), "high"],
          [fn("COUNT", literal("CASE WHEN current_capacity >= 50 AND current_capacity < 80 THEN 1 END")), "medium"],
          [fn("COUNT", literal("CASE WHEN current_capacity < 50 THEN 1 END")), "low"],
        ],
        raw: true,
      }),
      
      // Bins needing service
      this.count({
        ...whereClause,
        [Op.or]: [
          { currentCapacity: { [Op.gte]: 80 } },
          { nextServiceDate: { [Op.lte]: new Date() } },
        ],
      }),
      
      // Recent services (last 30 days)
      ServiceEvent.count({
        where: {
          createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...(customerId && { customerId }),
        },
      }),
      
      // Maintenance issues
      this.count({
        ...whereClause,
        maintenanceStatus: { [Op.in]: ["needs_repair", "under_maintenance"] },
      }),
    ]);

    // Process type statistics
    const byType: Record<BinType, number> = {} as Record<BinType, number>;
    Object.values(BinType).forEach(type => {
      byType[type] = 0;
    });
    binsByType.forEach((item: any) => {
      if (item.type && Object.values(BinType).includes(item.type)) {
        byType[item.type as BinType] = parseInt(item.count);
      }
    });

    // Process status statistics
    const byStatus: Record<BinStatus, number> = {} as Record<BinStatus, number>;
    Object.values(BinStatus).forEach(status => {
      byStatus[status] = 0;
    });
    binsByStatus.forEach((item: any) => {
      if (item.status && Object.values(BinStatus).includes(item.status)) {
        byStatus[item.status as BinStatus] = parseInt(item.count);
      }
    });

    // Process capacity ranges
    const capacityData = capacityStats[0] as any;
    const byCapacityRange = {
      "0-50%": parseInt(capacityData?.low || 0),
      "50-80%": parseInt(capacityData?.medium || 0),
      "80-100%": parseInt(capacityData?.high || 0),
    };

    return {
      total: totalBins,
      active: activeBins,
      byType,
      byStatus,
      byCapacityRange,
      averageCapacity: Math.round(parseFloat(capacityData?.average || "0")),
      needingService: binsNeedingService,
      recentServices,
      maintenanceIssues,
    };
  }

  /**
   * Find bins with recent sensor readings
   */
  public async findBinsWithRecentReadings(
    hoursAgo: number = 24
  ): Promise<Bin[]> {
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return this.findAll({
      where: {
        status: BinStatus.ACTIVE,
        lastCapacityUpdate: { [Op.gte]: cutoffDate },
      },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "companyName"],
        },
      ],
      order: [["lastCapacityUpdate", "DESC"]],
    });
  }

  /**
   * Search bins with advanced criteria
   */
  public async searchBins(
    criteria: BinSearchCriteria,
    pagination?: { page: number; limit: number }
  ): Promise<PaginationResult<Bin> | Bin[]> {
    const whereClause = this.buildBinSearchWhereClause(criteria);

    const options = {
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "companyName", "contactName"],
        },
      ],
      order: criteria.order || [["updatedAt", "DESC"]],
      attributes: criteria.attributes,
    };

    if (pagination) {
      return this.findAndCountAll(options, pagination);
    } else {
      return this.findAll(options);
    }
  }

  /**
   * Batch update bin status
   */
  public async batchUpdateStatus(
    binIds: string[],
    status: BinStatus
  ): Promise<number> {
    return this.updateWhere(
      { id: { [Op.in]: binIds } },
      { status }
    );
  }

  /**
   * Get bins summary for customer
   */
  public async getCustomerBinsSummary(customerId: string): Promise<Record<string, any>> {
    const [
      totalBins,
      activeBins,
      binsNeedingService,
      averageCapacity,
      lastServiceDate,
    ] = await Promise.all([
      this.count({ customerId }),
      this.count({ customerId, status: BinStatus.ACTIVE }),
      this.count({
        customerId,
        [Op.or]: [
          { currentCapacity: { [Op.gte]: 80 } },
          { nextServiceDate: { [Op.lte]: new Date() } },
        ],
      }),
      Bin.findOne({
        where: { customerId, status: BinStatus.ACTIVE },
        attributes: [[fn("AVG", col("currentCapacity")), "average"]],
        raw: true,
      }),
      Bin.findOne({
        where: { customerId },
        attributes: [[fn("MAX", col("lastServiceDate")), "lastService"]],
        raw: true,
      }),
    ]);

    return {
      total: totalBins,
      active: activeBins,
      inactive: totalBins - activeBins,
      needingService: binsNeedingService,
      averageCapacity: Math.round(parseFloat((averageCapacity as any)?.average || "0")),
      lastServiceDate: (lastServiceDate as any)?.lastService,
    };
  }

  /**
   * Private helper methods
   */

  private buildBinSearchWhereClause(criteria: BinSearchCriteria): WhereOptions {
    const whereClause: WhereOptions = {};

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

    if (criteria.maintenanceStatus) {
      whereClause.maintenanceStatus = criteria.maintenanceStatus;
    }

    if (criteria.serialNumbers && criteria.serialNumbers.length > 0) {
      whereClause.serialNumber = { [Op.in]: criteria.serialNumbers };
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

export default BinRepository;