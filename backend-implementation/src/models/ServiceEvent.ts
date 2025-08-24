/**
 * ============================================================================
 * SERVICE EVENT MODEL - WASTE COLLECTION TRACKING
 * ============================================================================
 *
 * Implements service events (pickups, deliveries, maintenance, inspections)
 * with GPS tracking, photo documentation, and comprehensive status management.
 *
 * Created by: Database Architect Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  Association,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
} from "sequelize";
import { database } from "@/config/database";

// Define event types enum
export enum ServiceEventType {
  PICKUP = "pickup",
  DELIVERY = "delivery",
  MAINTENANCE = "maintenance",
  INSPECTION = "inspection",
  COMPLAINT = "complaint",
}

// Define event status enum
export enum ServiceEventStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  RESCHEDULED = "rescheduled",
}

/**
 * Service event model interface
 */
export interface ServiceEventAttributes {
  id: string;
  customerId: ForeignKey<string>;
  routeId?: ForeignKey<string>;
  driverId?: ForeignKey<string>;
  vehicleId?: ForeignKey<string>;
  eventType: ServiceEventType;
  eventStatus: ServiceEventStatus;
  scheduledDate: Date;
  scheduledTime?: string; // Time in HH:MM format
  actualStartTime?: Date;
  actualEndTime?: Date;
  serviceLocation?: any; // PostGIS POINT geometry
  serviceAddress?: string;
  serviceInstructions?: string;
  notes?: string;
  photoUrls?: string[];
  signatureUrl?: string;
  weightCollectedLbs?: number;
  volumeCollectedCubicYards?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: ForeignKey<string>;
}

export interface ServiceEventCreationAttributes
  extends Omit<
    ServiceEventAttributes,
    "id" | "createdAt" | "updatedAt" | "version" | "eventStatus"
  > {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  eventStatus?: CreationOptional<ServiceEventStatus>;
}

/**
 * Service event model class
 */
export class ServiceEvent extends Model<
  InferAttributes<ServiceEvent>,
  InferCreationAttributes<ServiceEvent>
> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare customerId: ForeignKey<string>;
  declare routeId: ForeignKey<string> | null;
  declare driverId: ForeignKey<string> | null;
  declare vehicleId: ForeignKey<string> | null;
  declare eventType: ServiceEventType;
  declare eventStatus: CreationOptional<ServiceEventStatus>;
  declare scheduledDate: Date;
  declare scheduledTime: string | null;
  declare actualStartTime: Date | null;
  declare actualEndTime: Date | null;
  declare serviceLocation: any; // PostGIS geometry
  declare serviceAddress: string | null;
  declare serviceInstructions: string | null;
  declare notes: string | null;
  declare photoUrls: string[] | null;
  declare signatureUrl: string | null;
  declare weightCollectedLbs: number | null;
  declare volumeCollectedCubicYards: number | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Foreign keys for audit trail
  declare createdBy: ForeignKey<string> | null;
  declare updatedBy: ForeignKey<string> | null;

  // Audit fields
  declare version: CreationOptional<number>;
  declare deletedAt: Date | null;
  declare deletedBy: ForeignKey<string> | null;

  // Association declarations - will be populated when associations are defined
  declare getCustomer: BelongsToGetAssociationMixin<any>; // Customer
  declare setCustomer: BelongsToSetAssociationMixin<any, string>; // Customer
  declare getRoute: BelongsToGetAssociationMixin<any>; // Route
  declare setRoute: BelongsToSetAssociationMixin<any, string>; // Route
  declare getDriver: BelongsToGetAssociationMixin<any>; // Driver
  declare setDriver: BelongsToSetAssociationMixin<any, string>; // Driver
  declare getVehicle: BelongsToGetAssociationMixin<any>; // Vehicle
  declare setVehicle: BelongsToSetAssociationMixin<any, string>; // Vehicle
  declare getCreatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setCreatedByUser: BelongsToSetAssociationMixin<any, string>; // User
  declare getUpdatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setUpdatedByUser: BelongsToSetAssociationMixin<any, string>; // User

  // Associations - will be defined in associations file
  declare static associations: {
    customer: Association<ServiceEvent, any>;
    route: Association<ServiceEvent, any>;
    driver: Association<ServiceEvent, any>;
    vehicle: Association<ServiceEvent, any>;
    createdByUser: Association<ServiceEvent, any>;
    updatedByUser: Association<ServiceEvent, any>;
  };

  /**
   * Instance methods
   */

  // Check if service event is scheduled
  public isScheduled(): boolean {
    return this.eventStatus === ServiceEventStatus.SCHEDULED;
  }

  // Check if service event is in progress
  public isInProgress(): boolean {
    return this.eventStatus === ServiceEventStatus.IN_PROGRESS;
  }

  // Check if service event is completed
  public isCompleted(): boolean {
    return this.eventStatus === ServiceEventStatus.COMPLETED;
  }

  // Check if service event is cancelled
  public isCancelled(): boolean {
    return this.eventStatus === ServiceEventStatus.CANCELLED;
  }

  // Check if service event is rescheduled
  public isRescheduled(): boolean {
    return this.eventStatus === ServiceEventStatus.RESCHEDULED;
  }

  // Get event type label
  public getEventTypeLabel(): string {
    switch (this.eventType) {
      case ServiceEventType.PICKUP:
        return "Pickup";
      case ServiceEventType.DELIVERY:
        return "Delivery";
      case ServiceEventType.MAINTENANCE:
        return "Maintenance";
      case ServiceEventType.INSPECTION:
        return "Inspection";
      case ServiceEventType.COMPLAINT:
        return "Complaint";
      default:
        return "Unknown";
    }
  }

  // Get event status label
  public getEventStatusLabel(): string {
    switch (this.eventStatus) {
      case ServiceEventStatus.SCHEDULED:
        return "Scheduled";
      case ServiceEventStatus.IN_PROGRESS:
        return "In Progress";
      case ServiceEventStatus.COMPLETED:
        return "Completed";
      case ServiceEventStatus.CANCELLED:
        return "Cancelled";
      case ServiceEventStatus.RESCHEDULED:
        return "Rescheduled";
      default:
        return "Unknown";
    }
  }

  // Get scheduled date and time formatted
  public getScheduledDateTime(): string {
    const dateStr = this.scheduledDate.toLocaleDateString();
    if (this.scheduledTime) {
      return `${dateStr} at ${this.scheduledTime}`;
    }
    return dateStr;
  }

  // Get actual duration in minutes
  public getActualDurationMinutes(): number | null {
    if (!this.actualStartTime || !this.actualEndTime) {
      return null;
    }

    const diffMs =
      this.actualEndTime.getTime() - this.actualStartTime.getTime();
    return Math.round(diffMs / (1000 * 60));
  }

  // Get actual duration formatted
  public getActualDurationFormatted(): string {
    const minutes = this.getActualDurationMinutes();
    if (minutes === null) {
      return "Not recorded";
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // Check if event is overdue
  public isOverdue(): boolean {
    if (this.isCompleted() || this.isCancelled()) {
      return false;
    }

    const now = new Date();
    const scheduledDateTime = new Date(this.scheduledDate);

    if (this.scheduledTime) {
      const [hours, minutes] = this.scheduledTime.split(":").map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
    }

    return now > scheduledDateTime;
  }

  // Check if event is due today
  public isDueToday(): boolean {
    const today = new Date();
    const scheduledDate = new Date(this.scheduledDate);

    return (
      today.getFullYear() === scheduledDate.getFullYear() &&
      today.getMonth() === scheduledDate.getMonth() &&
      today.getDate() === scheduledDate.getDate()
    );
  }

  // Check if event has photos
  public hasPhotos(): boolean {
    return !!(this.photoUrls && this.photoUrls.length > 0);
  }

  // Get number of photos
  public getPhotoCount(): number {
    return this.photoUrls ? this.photoUrls.length : 0;
  }

  // Check if event has signature
  public hasSignature(): boolean {
    return !!(this.signatureUrl && this.signatureUrl.trim().length > 0);
  }

  // Check if event has weight recorded
  public hasWeightRecorded(): boolean {
    return this.weightCollectedLbs !== null && this.weightCollectedLbs > 0;
  }

  // Check if event has volume recorded
  public hasVolumeRecorded(): boolean {
    return (
      this.volumeCollectedCubicYards !== null &&
      this.volumeCollectedCubicYards > 0
    );
  }

  // Get weight formatted
  public getWeightFormatted(): string {
    if (!this.weightCollectedLbs) {
      return "Not recorded";
    }

    return `${this.weightCollectedLbs.toLocaleString()} lbs`;
  }

  // Get volume formatted
  public getVolumeFormatted(): string {
    if (!this.volumeCollectedCubicYards) {
      return "Not recorded";
    }

    return `${this.volumeCollectedCubicYards.toFixed(2)} cubic yards`;
  }

  // Check if event is assigned to route
  public isAssignedToRoute(): boolean {
    return !!this.routeId;
  }

  // Check if event has driver assigned
  public hasDriverAssigned(): boolean {
    return !!this.driverId;
  }

  // Check if event has vehicle assigned
  public hasVehicleAssigned(): boolean {
    return !!this.vehicleId;
  }

  // Check if event is fully assigned
  public isFullyAssigned(): boolean {
    return (
      this.isAssignedToRoute() &&
      this.hasDriverAssigned() &&
      this.hasVehicleAssigned()
    );
  }

  // Check if event has location coordinates
  public hasLocationCoordinates(): boolean {
    return !!this.serviceLocation;
  }

  /**
   * Static methods
   */

  // Find service events by customer
  public static async findByCustomer(
    customerId: string,
  ): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        customerId,
        deletedAt: null,
      },
      order: [["scheduledDate", "DESC"]],
    });
  }

  // Find service events by route
  public static async findByRoute(routeId: string): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        routeId,
        deletedAt: null,
      },
      order: [
        ["scheduledDate", "ASC"],
        ["scheduledTime", "ASC"],
      ],
    });
  }

  // Find service events by driver
  public static async findByDriver(driverId: string): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        driverId,
        deletedAt: null,
      },
      order: [["scheduledDate", "DESC"]],
    });
  }

  // Find service events by date range
  public static async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        scheduledDate: {
          [database.Op.between]: [startDate, endDate],
        },
        deletedAt: null,
      },
      order: [
        ["scheduledDate", "ASC"],
        ["scheduledTime", "ASC"],
      ],
    });
  }

  // Find service events due today
  public static async findDueToday(): Promise<ServiceEvent[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    return await ServiceEvent.findAll({
      where: {
        scheduledDate: {
          [database.Op.between]: [startOfDay, endOfDay],
        },
        eventStatus: {
          [database.Op.in]: [
            ServiceEventStatus.SCHEDULED,
            ServiceEventStatus.IN_PROGRESS,
          ],
        },
        deletedAt: null,
      },
      order: [["scheduledTime", "ASC"]],
    });
  }

  // Find overdue service events
  public static async findOverdue(): Promise<ServiceEvent[]> {
    const now = new Date();

    return await ServiceEvent.findAll({
      where: {
        scheduledDate: {
          [database.Op.lt]: now,
        },
        eventStatus: {
          [database.Op.in]: [
            ServiceEventStatus.SCHEDULED,
            ServiceEventStatus.IN_PROGRESS,
          ],
        },
        deletedAt: null,
      },
      order: [["scheduledDate", "ASC"]],
    });
  }

  // Find service events by status
  public static async findByStatus(
    status: ServiceEventStatus,
  ): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        eventStatus: status,
        deletedAt: null,
      },
      order: [["scheduledDate", "ASC"]],
    });
  }

  // Find service events by type
  public static async findByType(
    eventType: ServiceEventType,
  ): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        eventType,
        deletedAt: null,
      },
      order: [["scheduledDate", "DESC"]],
    });
  }

  // Find incomplete service events
  public static async findIncomplete(): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: {
        eventStatus: {
          [database.Op.in]: [
            ServiceEventStatus.SCHEDULED,
            ServiceEventStatus.IN_PROGRESS,
            ServiceEventStatus.RESCHEDULED,
          ],
        },
        deletedAt: null,
      },
      order: [["scheduledDate", "ASC"]],
    });
  }

  // Find service events within radius of a point (requires PostGIS)
  public static async findWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<ServiceEvent[]> {
    return await ServiceEvent.findAll({
      where: database.where(
        database.fn(
          "ST_DWithin",
          database.col("service_location"),
          database.fn("ST_GeogFromText", `POINT(${longitude} ${latitude})`),
          radiusKm * 1000, // Convert km to meters
        ),
        true,
      ),
      attributes: [
        "*",
        [
          database.fn(
            "ST_Distance",
            database.col("service_location"),
            database.fn("ST_GeogFromText", `POINT(${longitude} ${latitude})`),
          ),
          "distance",
        ],
      ],
      order: database.literal('"distance" ASC'),
    });
  }

  // Get service event statistics
  public static async getServiceEventStatistics(): Promise<any> {
    const [statusStats, typeStats] = await Promise.all([
      // Status distribution
      ServiceEvent.findAll({
        attributes: [
          "eventStatus",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: { deletedAt: null },
        group: ["eventStatus"],
        raw: true,
      }),

      // Type distribution
      ServiceEvent.findAll({
        attributes: [
          "eventType",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: { deletedAt: null },
        group: ["eventType"],
        raw: true,
      }),
    ]);

    // Get completion statistics
    const completionStats = await ServiceEvent.findAll({
      attributes: [
        [database.fn("COUNT", database.col("id")), "totalEvents"],
        [
          database.fn(
            "COUNT",
            database.literal("CASE WHEN event_status = 'completed' THEN 1 END"),
          ),
          "completedEvents",
        ],
        [
          database.fn(
            "AVG",
            database.literal(
              "CASE WHEN actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (actual_end_time - actual_start_time))/60 END",
            ),
          ),
          "avgDurationMinutes",
        ],
        [
          database.fn("SUM", database.col("weight_collected_lbs")),
          "totalWeightLbs",
        ],
        [
          database.fn("SUM", database.col("volume_collected_cubic_yards")),
          "totalVolumeCubicYards",
        ],
      ],
      where: { deletedAt: null },
      raw: true,
    });

    return {
      byStatus: statusStats,
      byType: typeStats,
      completion: completionStats[0],
    };
  }

  // Get daily completion rate
  public static async getDailyCompletionRate(date: Date): Promise<number> {
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );

    const stats = await ServiceEvent.findAll({
      attributes: [
        [database.fn("COUNT", database.col("id")), "totalEvents"],
        [
          database.fn(
            "COUNT",
            database.literal("CASE WHEN event_status = 'completed' THEN 1 END"),
          ),
          "completedEvents",
        ],
      ],
      where: {
        scheduledDate: {
          [database.Op.between]: [startOfDay, endOfDay],
        },
        deletedAt: null,
      },
      raw: true,
    });

    const result = stats[0] as any;
    const totalEvents = parseInt(result.totalEvents) || 0;
    const completedEvents = parseInt(result.completedEvents) || 0;

    if (totalEvents === 0) {
      return 0;
    }

    return (completedEvents / totalEvents) * 100;
  }
}

/**
 * Model definition
 */
ServiceEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "customer_id",
      references: {
        model: "customers",
        key: "id",
      },
    },
    routeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "route_id",
      references: {
        model: "routes",
        key: "id",
      },
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "driver_id",
      references: {
        model: "drivers",
        key: "id",
      },
    },
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "vehicle_id",
      references: {
        model: "vehicles",
        key: "id",
      },
    },
    eventType: {
      type: DataTypes.ENUM(...Object.values(ServiceEventType)),
      allowNull: false,
      field: "event_type",
      validate: {
        isIn: {
          args: [Object.values(ServiceEventType)],
          msg: "Invalid service event type",
        },
      },
    },
    eventStatus: {
      type: DataTypes.ENUM(...Object.values(ServiceEventStatus)),
      allowNull: false,
      defaultValue: ServiceEventStatus.SCHEDULED,
      field: "event_status",
      validate: {
        isIn: {
          args: [Object.values(ServiceEventStatus)],
          msg: "Invalid service event status",
        },
      },
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "scheduled_date",
      validate: {
        isDate: {
          msg: "Scheduled date must be a valid date",
        },
      },
    },
    scheduledTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: "scheduled_time",
    },
    actualStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "actual_start_time",
    },
    actualEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "actual_end_time",
      validate: {
        isAfterStartTime(value: Date | null) {
          if (value && this.actualStartTime && value <= this.actualStartTime) {
            throw new Error("Actual end time must be after actual start time");
          }
        },
      },
    },
    serviceLocation: {
      type: DataTypes.GEOMETRY("POINT", 4326),
      allowNull: true,
      field: "service_location",
    },
    serviceAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "service_address",
      validate: {
        len: {
          args: [0, 500],
          msg: "Service address must be less than 500 characters",
        },
      },
    },
    serviceInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "service_instructions",
      validate: {
        len: {
          args: [0, 2000],
          msg: "Service instructions must be less than 2000 characters",
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: "Notes must be less than 2000 characters",
        },
      },
    },
    photoUrls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      field: "photo_urls",
    },
    signatureUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "signature_url",
      validate: {
        isUrl: {
          msg: "Signature URL must be a valid URL",
        },
      },
    },
    weightCollectedLbs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "weight_collected_lbs",
      validate: {
        min: {
          args: [0],
          msg: "Weight collected cannot be negative",
        },
        isDecimal: {
          msg: "Weight collected must be a valid decimal number",
        },
      },
    },
    volumeCollectedCubicYards: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: "volume_collected_cubic_yards",
      validate: {
        min: {
          args: [0],
          msg: "Volume collected cannot be negative",
        },
        isDecimal: {
          msg: "Volume collected must be a valid decimal number",
        },
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: "Version must be at least 1",
        },
      },
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "deleted_by",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize: database,
    tableName: "service_events",
    schema: "core",
    timestamps: true,
    paranoid: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    deletedAt: "deletedAt",
    underscored: true,
    indexes: [
      {
        name: "idx_service_events_customer_id",
        fields: ["customer_id"],
      },
      {
        name: "idx_service_events_route_id",
        fields: ["route_id"],
      },
      {
        name: "idx_service_events_driver_id",
        fields: ["driver_id"],
      },
      {
        name: "idx_service_events_vehicle_id",
        fields: ["vehicle_id"],
      },
      {
        name: "idx_service_events_scheduled_date",
        fields: ["scheduled_date"],
      },
      {
        name: "idx_service_events_event_type",
        fields: ["event_type"],
      },
      {
        name: "idx_service_events_event_status",
        fields: ["event_status"],
      },
      {
        name: "idx_service_events_location",
        fields: [
          database.fn("ST_GeogFromWKB", database.col("service_location")),
        ],
        using: "GIST",
        where: { service_location: { [database.Op.ne]: null } },
      },
      {
        name: "idx_service_events_scheduled_date_time",
        fields: ["scheduled_date", "scheduled_time"],
      },
      {
        name: "idx_service_events_actual_times",
        fields: ["actual_start_time", "actual_end_time"],
        where: {
          actual_start_time: { [database.Op.ne]: null },
          actual_end_time: { [database.Op.ne]: null },
        },
      },
    ],
    hooks: {
      beforeValidate: (serviceEvent: ServiceEvent) => {
        // Ensure scheduled time is in HH:MM format if provided
        if (serviceEvent.scheduledTime) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(serviceEvent.scheduledTime)) {
            throw new Error("Scheduled time must be in HH:MM format");
          }
        }
      },
      beforeUpdate: (serviceEvent: ServiceEvent) => {
        // Increment version for optimistic locking
        serviceEvent.version = (serviceEvent?.version || 1) + 1;

        // Auto-set start time when status changes to in_progress
        if (
          serviceEvent.changed("eventStatus") &&
          serviceEvent.eventStatus === ServiceEventStatus.IN_PROGRESS &&
          !serviceEvent.actualStartTime
        ) {
          serviceEvent.actualStartTime = new Date();
        }

        // Auto-set end time when status changes to completed
        if (
          serviceEvent.changed("eventStatus") &&
          serviceEvent.eventStatus === ServiceEventStatus.COMPLETED &&
          !serviceEvent.actualEndTime
        ) {
          serviceEvent.actualEndTime = new Date();
        }
      },
    },
    scopes: {
      scheduled: {
        where: {
          eventStatus: ServiceEventStatus.SCHEDULED,
          deletedAt: null,
        },
      },
      inProgress: {
        where: {
          eventStatus: ServiceEventStatus.IN_PROGRESS,
          deletedAt: null,
        },
      },
      completed: {
        where: {
          eventStatus: ServiceEventStatus.COMPLETED,
          deletedAt: null,
        },
      },
      cancelled: {
        where: {
          eventStatus: ServiceEventStatus.CANCELLED,
          deletedAt: null,
        },
      },
      dueToday: {
        where: {
          scheduledDate: new Date(),
          eventStatus: {
            [database.Op.in]: [
              ServiceEventStatus.SCHEDULED,
              ServiceEventStatus.IN_PROGRESS,
            ],
          },
          deletedAt: null,
        },
      },
      overdue: {
        where: {
          scheduledDate: {
            [database.Op.lt]: new Date(),
          },
          eventStatus: {
            [database.Op.in]: [
              ServiceEventStatus.SCHEDULED,
              ServiceEventStatus.IN_PROGRESS,
            ],
          },
          deletedAt: null,
        },
      },
      byType: (eventType: ServiceEventType) => ({
        where: {
          eventType,
          deletedAt: null,
        },
      }),
      byCustomer: (customerId: string) => ({
        where: {
          customerId,
          deletedAt: null,
        },
      }),
      byRoute: (routeId: string) => ({
        where: {
          routeId,
          deletedAt: null,
        },
      }),
      byDriver: (driverId: string) => ({
        where: {
          driverId,
          deletedAt: null,
        },
      }),
      withPhotos: {
        where: {
          photoUrls: {
            [database.Op.ne]: null,
          },
          deletedAt: null,
        },
      },
      withSignature: {
        where: {
          signatureUrl: {
            [database.Op.ne]: null,
          },
          deletedAt: null,
        },
      },
      withWeightData: {
        where: {
          weightCollectedLbs: {
            [database.Op.gt]: 0,
          },
          deletedAt: null,
        },
      },
    },
  },
);

export default ServiceEvent;
