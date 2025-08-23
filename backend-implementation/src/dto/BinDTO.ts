/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN DTO
 * ============================================================================
 *
 * Data Transfer Object for Bin entity operations.
 * Handles bin data transformation, validation, and serialization.
 *
 * Features:
 * - Bin location and capacity data transformation
 * - Service status and maintenance data formatting
 * - Customer context handling
 * - IoT sensor data processing
 * - API response optimization
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Model } from "sequelize";
import Joi from "joi";
import { BaseDTO, DTOTransformOptions } from "./BaseDTO";
import type { Bin, BinType, BinStatus } from "@/models/Bin";
import { Customer } from "@/models/Customer";

/**
 * Bin DTO data interface
 */
export interface BinDTOData {
  id?: string;
  serialNumber: string;
  type: BinType;
  status: BinStatus;
  capacity: number;
  currentCapacity: number;
  customerId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  installationDate?: Date;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  lastCapacityUpdate?: Date;
  locationUpdatedAt?: Date;
  maintenanceStatus: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Derived fields
  capacityPercentage?: number;
  needsService?: boolean;
  serviceOverdue?: boolean;
  locationAccuracy?: number;
  locationSource?: string;

  // Customer data (when included)
  customerName?: string;
  customerContactName?: string;
  customerEmail?: string;

  // Sensor data (simplified)
  sensorStatus?: "online" | "offline" | "unknown";
  lastReading?: {
    timestamp: Date;
    level: number;
    source: string;
  };

  // Service data (when included)
  upcomingService?: {
    scheduledDate: Date;
    serviceType: string;
    assignedDriver?: string;
  };
}

/**
 * Bin creation DTO
 */
export interface CreateBinDTOData {
  serialNumber: string;
  type: BinType;
  capacity: number;
  customerId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  installationDate?: Date;
  notes?: string;
}

/**
 * Bin update DTO
 */
export interface UpdateBinDTOData {
  status?: BinStatus;
  latitude?: number;
  longitude?: number;
  address?: string;
  currentCapacity?: number;
  maintenanceStatus?: string;
  notes?: string;
}

/**
 * Location update DTO
 */
export interface BinLocationUpdateDTOData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  source?: "gps" | "manual" | "geocoded";
}

/**
 * Bin DTO class
 */
export class BinDTO extends BaseDTO<BinDTOData> {
  constructor(data?: BinDTOData | Bin | Model, options?: DTOTransformOptions) {
    super(data, options);
  }

  /**
   * Get validation schema for bin data
   */
  protected getValidationSchema(): Joi.ObjectSchema {
    return Joi.object({
      id: Joi.string().uuid().optional(),
      serialNumber: Joi.string().min(3).max(50).required(),
      type: Joi.string()
        .valid(...Object.values(BinType))
        .required(),
      status: Joi.string()
        .valid(...Object.values(BinStatus))
        .optional(),
      capacity: Joi.number().positive().max(10000).required(), // Max 10,000 liters
      currentCapacity: Joi.number().min(0).max(100).optional(), // Percentage
      customerId: Joi.string().uuid().required(),
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
      address: Joi.string().max(500).optional(),
      installationDate: Joi.date().max("now").optional(),
      lastServiceDate: Joi.date().optional(),
      nextServiceDate: Joi.date().optional(),
      lastCapacityUpdate: Joi.date().optional(),
      locationUpdatedAt: Joi.date().optional(),
      maintenanceStatus: Joi.string()
        .valid(
          "good",
          "needs_maintenance",
          "needs_repair",
          "under_maintenance",
          "decommissioned",
        )
        .optional(),
      notes: Joi.string().max(1000).optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),

      // Derived fields
      capacityPercentage: Joi.number().min(0).max(100).optional(),
      needsService: Joi.boolean().optional(),
      serviceOverdue: Joi.boolean().optional(),
      locationAccuracy: Joi.number().min(0).optional(),
      locationSource: Joi.string()
        .valid("gps", "manual", "geocoded")
        .optional(),

      // Customer fields
      customerName: Joi.string().optional(),
      customerContactName: Joi.string().optional(),
      customerEmail: Joi.string().email().optional(),

      // Sensor fields
      sensorStatus: Joi.string()
        .valid("online", "offline", "unknown")
        .optional(),
      lastReading: Joi.object({
        timestamp: Joi.date().required(),
        level: Joi.number().min(0).max(100).required(),
        source: Joi.string().required(),
      }).optional(),

      // Service fields
      upcomingService: Joi.object({
        scheduledDate: Joi.date().required(),
        serviceType: Joi.string().required(),
        assignedDriver: Joi.string().optional(),
      }).optional(),
    });
  }

  /**
   * Get field mappings between model and DTO
   */
  protected getFieldMappings(): Record<string, string> {
    return {
      // Bin model fields
      id: "id",
      serialNumber: "serialNumber",
      type: "type",
      status: "status",
      capacity: "capacity",
      currentCapacity: "currentCapacity",
      customerId: "customerId",
      latitude: "latitude",
      longitude: "longitude",
      address: "address",
      installationDate: "installationDate",
      lastServiceDate: "lastServiceDate",
      nextServiceDate: "nextServiceDate",
      lastCapacityUpdate: "lastCapacityUpdate",
      locationUpdatedAt: "locationUpdatedAt",
      locationAccuracy: "locationAccuracy",
      locationSource: "locationSource",
      maintenanceStatus: "maintenanceStatus",
      notes: "notes",
      createdAt: "createdAt",
      updatedAt: "updatedAt",

      // Customer fields
      "customer.companyName": "customerName",
      "customer.contactName": "customerContactName",
      "customer.email": "customerEmail",
    };
  }

  /**
   * Get sensitive fields that should be masked
   */
  protected getSensitiveFields(): string[] {
    return [
      "customerEmail", // Mask customer email
      "latitude", // Optionally mask exact coordinates for privacy
      "longitude", // Optionally mask exact coordinates for privacy
    ];
  }

  /**
   * Transform Bin model to DTO data
   */
  protected fromModel(model: Model): BinDTOData {
    const binData = model.toJSON() as any;

    const dtoData: BinDTOData = {
      id: binData.id,
      serialNumber: binData.serialNumber,
      type: binData.type,
      status: binData.status,
      capacity: binData.capacity,
      currentCapacity: binData.currentCapacity,
      customerId: binData.customerId,
      latitude: binData.latitude,
      longitude: binData.longitude,
      address: binData.address,
      installationDate: binData?.installationDate || undefined,
      lastServiceDate: binData?.lastServiceDate || undefined,
      nextServiceDate: binData?.nextServiceDate || undefined,
      lastCapacityUpdate: binData.lastCapacityUpdate,
      locationUpdatedAt: binData.locationUpdatedAt,
      locationAccuracy: binData.locationAccuracy,
      locationSource: binData.locationSource,
      maintenanceStatus: binData.maintenanceStatus,
      notes: binData.notes,
      createdAt: binData.createdAt,
      updatedAt: binData.updatedAt,
    };

    // Calculate derived fields
    dtoData.capacityPercentage = binData.currentCapacity;
    dtoData.needsService = this.calculateNeedsService(model as Bin);
    dtoData.serviceOverdue = this.calculateServiceOverdue(model as Bin);

    // Handle customer data if included
    if (binData.customer) {
      const customer = binData.customer as any;
      // Access organization data if available
      if (customer.organization) {
        dtoData.customerName = customer.organization.name;
        dtoData.customerContactName = customer.organization.contact_name;
        dtoData.customerEmail = customer.organization.email;
      } else {
        dtoData.customerName = customer?.customer_number || "Unknown";
        dtoData.customerContactName = "Unknown";
        dtoData.customerEmail = "Unknown";
      }
    }

    // Handle sensor data
    if (binData.sensorData) {
      const sensorData = binData.sensorData;
      dtoData.sensorStatus = this.determineSensorStatus(sensorData);

      if (sensorData.lastReading) {
        dtoData.lastReading = {
          timestamp: new Date(sensorData.lastReading.timestamp),
          level: sensorData.lastReading.level,
          source: sensorData.lastReading.source,
        };
      }
    }

    // Handle upcoming service data if included
    if (binData.serviceEvents && binData.serviceEvents.length > 0) {
      const upcomingService = binData.serviceEvents.find(
        (se: any) =>
          se.status === "scheduled" && new Date(se.scheduledDate) > new Date(),
      );

      if (upcomingService) {
        dtoData.upcomingService = {
          scheduledDate: new Date(upcomingService.scheduledDate),
          serviceType: upcomingService.serviceType,
          assignedDriver:
            upcomingService.assignedDriver?.firstName +
            " " +
            upcomingService.assignedDriver?.lastName,
        };
      }
    }

    return dtoData;
  }

  /**
   * Get bin location as formatted address
   */
  public getFormattedLocation(): string {
    const address = this.getField("address");
    const lat = this.getField("latitude");
    const lng = this.getField("longitude");

    if (address) {
      return address;
    } else if (lat && lng) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } else {
      return "Location not available";
    }
  }

  /**
   * Get capacity status as color-coded string
   */
  public getCapacityStatus(): {
    level: string;
    color: string;
    urgency: number;
  } {
    const capacity = this.getField("currentCapacity") || 0;

    if (capacity >= 95) {
      return { level: "Critical", color: "#dc2626", urgency: 4 };
    } else if (capacity >= 85) {
      return { level: "High", color: "#ea580c", urgency: 3 };
    } else if (capacity >= 70) {
      return { level: "Medium", color: "#d97706", urgency: 2 };
    } else if (capacity >= 50) {
      return { level: "Normal", color: "#16a34a", urgency: 1 };
    } else {
      return { level: "Low", color: "#0284c7", urgency: 0 };
    }
  }

  /**
   * Get service priority based on multiple factors
   */
  public getServicePriority(): { priority: string; score: number } {
    let score = 0;

    // Capacity factor (0-40 points)
    const capacity = this.getField("currentCapacity") || 0;
    score += Math.min(capacity * 0.4, 40);

    // Overdue factor (0-30 points)
    if (this.getField("serviceOverdue")) {
      const nextService = this.getField("nextServiceDate");
      if (nextService) {
        const daysOverdue = Math.floor(
          (Date.now() - nextService.getTime()) / (1000 * 60 * 60 * 24),
        );
        score += Math.min(daysOverdue * 2, 30);
      }
    }

    // Maintenance factor (0-20 points)
    const maintenance = this.getField("maintenanceStatus");
    if (maintenance === "needs_repair") score += 20;
    else if (maintenance === "needs_maintenance") score += 10;

    // Status factor (0-10 points)
    const status = this.getField("status");
    if (status === BinStatus.ACTIVE) score += 0;
    else if (status === BinStatus.MAINTENANCE) score += 5;
    else if (status === BinStatus.RETIRED) score += 10;

    // Determine priority based on score
    let priority: string;
    if (score >= 80) priority = "urgent";
    else if (score >= 60) priority = "high";
    else if (score >= 30) priority = "normal";
    else priority = "low";

    return { priority, score: Math.round(score) };
  }

  /**
   * Get time until next service
   */
  public getTimeToNextService(): string {
    const nextService = this.getField("nextServiceDate");
    if (!nextService) return "Not scheduled";

    const now = new Date();
    const diffMs = nextService.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else {
      return `In ${diffDays} days`;
    }
  }

  /**
   * Get summary data for list/map views
   */
  public toSummaryJSON(): any {
    const capacityStatus = this.getCapacityStatus();
    const serviceInfo = this.getServicePriority();

    return {
      id: this.getField("id"),
      serialNumber: this.getField("serialNumber"),
      type: this.getField("type"),
      status: this.getField("status"),
      currentCapacity: this.getField("currentCapacity"),
      customerName: this.getField("customerName"),
      address: this.getField("address"),
      latitude: this.getField("latitude"),
      longitude: this.getField("longitude"),
      needsService: this.getField("needsService"),
      serviceOverdue: this.getField("serviceOverdue"),
      capacityPercentage: this.getField("capacityPercentage"),
      // Add computed fields
      capacityStatus: capacityStatus.level,
      capacityColor: capacityStatus.color,
      servicePriority: serviceInfo.priority,
      timeToNextService: this.getTimeToNextService(),
    };
  }

  /**
   * Get detailed data for individual bin view
   */
  public toDetailedJSON(): BinDTOData {
    const data = this.toJSON();
    const capacityStatus = this.getCapacityStatus();
    const serviceInfo = this.getServicePriority();

    return {
      ...data,
      // Add computed fields for detailed view
      formattedLocation: this.getFormattedLocation(),
      capacityStatus: capacityStatus.level,
      capacityColor: capacityStatus.color,
      capacityUrgency: capacityStatus.urgency,
      servicePriority: serviceInfo.priority,
      servicePriorityScore: serviceInfo.score,
      timeToNextService: this.getTimeToNextService(),
    } as BinDTOData;
  }

  /**
   * Static factory methods
   */

  /**
   * Create DTO from Bin model
   */
  public static fromBinModel(bin: Bin, options?: DTOTransformOptions): BinDTO {
    return new BinDTO(bin, options);
  }

  /**
   * Create DTO from creation data
   */
  public static fromCreateData(data: CreateBinDTOData): BinDTO {
    const dtoData: BinDTOData = {
      serialNumber: data.serialNumber.toUpperCase(),
      type: data.type,
      status: BinStatus.ACTIVE,
      capacity: data.capacity,
      currentCapacity: 0, // New bins start empty
      customerId: data.customerId,
      maintenanceStatus: "good",
      needsService: false,
      serviceOverdue: false,
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.installationDate !== undefined && {
        installationDate: data.installationDate,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    // Only add installationDate if not provided
    if (!data.installationDate) {
      dtoData.installationDate = new Date();
    }

    return new BinDTO(dtoData);
  }

  /**
   * Private helper methods
   */

  private calculateNeedsService(bin: Bin): boolean {
    return (
      (bin as any).currentCapacity >= 80 ||
      ((bin as any).nextServiceDate &&
        (bin as any).nextServiceDate <= new Date()) ||
      (bin as any).maintenanceStatus === "needs_repair"
    );
  }

  private calculateServiceOverdue(bin: Bin): boolean {
    return (bin as any).nextServiceDate
      ? (bin as any).nextServiceDate < new Date()
      : false;
  }

  private determineSensorStatus(
    sensorData: any,
  ): "online" | "offline" | "unknown" {
    if (!sensorData?.lastReading) return "unknown";

    const lastReading = new Date(sensorData.lastReading.timestamp);
    const hoursSinceReading =
      (Date.now() - lastReading.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReading <= 4) return "online";
    else if (hoursSinceReading <= 24) return "offline";
    else return "unknown";
  }
}

export default BinDTO;
