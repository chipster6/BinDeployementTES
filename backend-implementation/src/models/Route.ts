/**
 * ============================================================================
 * ROUTE MODEL - ROUTE MANAGEMENT AND OPTIMIZATION
 * ============================================================================
 *
 * Implements routes management with geographic data, AI optimization,
 * and driver/vehicle assignments for efficient waste collection.
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
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from "sequelize";
import { database } from "@/config/database";

// Define route types enum
export enum RouteType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  INDUSTRIAL = "industrial",
  MIXED = "mixed",
}

// Define route status enum
export enum RouteStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  OPTIMIZING = "optimizing",
  ARCHIVED = "archived",
}

// Define service days enum
export enum ServiceDay {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

/**
 * Route model interface
 */
export interface RouteAttributes {
  id: string;
  routeNumber: string;
  routeName: string;
  description?: string;
  territory?: string;
  estimatedDurationMinutes?: number;
  estimatedDistanceMiles?: number;
  serviceDay?: ServiceDay;
  routeType?: RouteType;
  status: RouteStatus;
  driverId?: ForeignKey<string>;
  vehicleId?: ForeignKey<string>;
  routeGeometry?: any; // PostGIS LINESTRING geometry
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  // AI optimization fields
  aiOptimized: boolean;
  optimizationScore?: number;
  lastOptimizedAt?: Date;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: ForeignKey<string>;
}

export interface RouteCreationAttributes
  extends Omit<
    RouteAttributes,
    "id" | "createdAt" | "updatedAt" | "version" | "status" | "aiOptimized"
  > {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  status?: CreationOptional<RouteStatus>;
  aiOptimized?: CreationOptional<boolean>;
}

/**
 * Route optimization result interface
 */
export interface RouteOptimizationResult {
  originalDistance: number;
  optimizedDistance: number;
  originalDuration: number;
  optimizedDuration: number;
  fuelSavingsEstimated: number;
  costSavingsEstimated: number;
  optimizationScore: number;
  appliedAt?: Date;
}

/**
 * Route model class
 */
export class Route extends Model<
  InferAttributes<Route>,
  InferCreationAttributes<Route>
> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare routeNumber: string;
  declare routeName: string;
  declare description: string | null;
  declare territory: string | null;
  declare estimatedDurationMinutes: number | null;
  declare estimatedDistanceMiles: number | null;
  declare serviceDay: ServiceDay | null;
  declare routeType: RouteType | null;
  declare status: CreationOptional<RouteStatus>;
  declare driverId: ForeignKey<string> | null;
  declare vehicleId: ForeignKey<string> | null;
  declare routeGeometry: any; // PostGIS geometry

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Foreign keys for audit trail
  declare createdBy: ForeignKey<string> | null;
  declare updatedBy: ForeignKey<string> | null;

  // AI optimization fields
  declare aiOptimized: CreationOptional<boolean>;
  declare optimizationScore: number | null;
  declare lastOptimizedAt: Date | null;

  // Audit fields
  declare version: CreationOptional<number>;
  declare deletedAt: Date | null;
  declare deletedBy: ForeignKey<string> | null;

  // Association declarations - will be populated when associations are defined
  declare getDriver: BelongsToGetAssociationMixin<any>; // Driver
  declare setDriver: BelongsToSetAssociationMixin<any, string>; // Driver
  declare getVehicle: BelongsToGetAssociationMixin<any>; // Vehicle
  declare setVehicle: BelongsToSetAssociationMixin<any, string>; // Vehicle
  declare getCreatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setCreatedByUser: BelongsToSetAssociationMixin<any, string>; // User
  declare getUpdatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setUpdatedByUser: BelongsToSetAssociationMixin<any, string>; // User

  // Has many associations
  declare getServiceEvents: HasManyGetAssociationsMixin<any>; // ServiceEvent
  declare createServiceEvent: HasManyCreateAssociationMixin<any>; // ServiceEvent
  declare getOptimizationResults: HasManyGetAssociationsMixin<any>; // RouteOptimization

  // Associations - will be defined in associations file
  declare static associations: {
    driver: Association<Route, any>;
    vehicle: Association<Route, any>;
    createdByUser: Association<Route, any>;
    updatedByUser: Association<Route, any>;
    serviceEvents: Association<Route, any>;
    optimizationResults: Association<Route, any>;
  };

  /**
   * Instance methods
   */

  // Check if route is active
  public isActive(): boolean {
    return this.status === RouteStatus.ACTIVE;
  }

  // Check if route is inactive
  public isInactive(): boolean {
    return this.status === RouteStatus.INACTIVE;
  }

  // Check if route is being optimized
  public isOptimizing(): boolean {
    return this.status === RouteStatus.OPTIMIZING;
  }

  // Check if route is archived
  public isArchived(): boolean {
    return this.status === RouteStatus.ARCHIVED;
  }

  // Get route status label
  public getStatusLabel(): string {
    switch (this.status) {
      case RouteStatus.ACTIVE:
        return "Active";
      case RouteStatus.INACTIVE:
        return "Inactive";
      case RouteStatus.OPTIMIZING:
        return "Optimizing";
      case RouteStatus.ARCHIVED:
        return "Archived";
      default:
        return "Unknown";
    }
  }

  // Get route type label
  public getRouteTypeLabel(): string {
    switch (this.routeType) {
      case RouteType.RESIDENTIAL:
        return "Residential";
      case RouteType.COMMERCIAL:
        return "Commercial";
      case RouteType.INDUSTRIAL:
        return "Industrial";
      case RouteType.MIXED:
        return "Mixed";
      default:
        return "Not Specified";
    }
  }

  // Get service day label
  public getServiceDayLabel(): string {
    if (!this.serviceDay) {
      return "Not Scheduled";
    }

    return this.serviceDay.charAt(0).toUpperCase() + this.serviceDay.slice(1);
  }

  // Check if route has driver assigned
  public hasDriverAssigned(): boolean {
    return !!this.driverId;
  }

  // Check if route has vehicle assigned
  public hasVehicleAssigned(): boolean {
    return !!this.vehicleId;
  }

  // Check if route is fully assigned (driver + vehicle)
  public isFullyAssigned(): boolean {
    return this.hasDriverAssigned() && this.hasVehicleAssigned();
  }

  // Check if route has been AI optimized
  public isAiOptimized(): boolean {
    return this.aiOptimized;
  }

  // Get estimated duration in human readable format
  public getEstimatedDurationFormatted(): string {
    if (!this.estimatedDurationMinutes) {
      return "Not estimated";
    }

    const hours = Math.floor(this.estimatedDurationMinutes / 60);
    const minutes = this.estimatedDurationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  // Get estimated distance formatted
  public getEstimatedDistanceFormatted(): string {
    if (!this.estimatedDistanceMiles) {
      return "Not estimated";
    }

    return `${this.estimatedDistanceMiles.toFixed(1)} miles`;
  }

  // Get optimization score formatted as percentage
  public getOptimizationScoreFormatted(): string {
    if (!this.optimizationScore) {
      return "Not optimized";
    }

    return `${this.optimizationScore.toFixed(1)}%`;
  }

  // Check if route needs optimization (not optimized in X days)
  public needsOptimization(daysSinceLastOptimization: number = 30): boolean {
    if (!this.lastOptimizedAt) {
      return true;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastOptimization);

    return this.lastOptimizedAt < cutoffDate;
  }

  // Get days since last optimization
  public getDaysSinceLastOptimization(): number | null {
    if (!this.lastOptimizedAt) {
      return null;
    }

    const today = new Date();
    const diffTime = today.getTime() - this.lastOptimizedAt.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  // Calculate efficiency score based on distance and duration
  public calculateEfficiencyScore(): number {
    if (!this.estimatedDistanceMiles || !this.estimatedDurationMinutes) {
      return 0;
    }

    // Simple efficiency calculation: miles per minute
    const efficiency =
      this.estimatedDistanceMiles / (this.estimatedDurationMinutes / 60);

    // Normalize to 0-100 scale (assuming 15 mph average is good)
    return Math.min(100, (efficiency / 15) * 100);
  }

  // Check if route has geometry data
  public hasGeometry(): boolean {
    return !!this.routeGeometry;
  }

  /**
   * Static methods
   */

  // Find route by route number
  public static async findByRouteNumber(
    routeNumber: string,
  ): Promise<Route | null> {
    return await Route.findOne({
      where: {
        routeNumber,
        deletedAt: null,
      },
    });
  }

  // Find active routes
  public static async findActive(): Promise<Route[]> {
    return await Route.findAll({
      where: {
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find routes by service day
  public static async findByServiceDay(
    serviceDay: ServiceDay,
  ): Promise<Route[]> {
    return await Route.findAll({
      where: {
        serviceDay,
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find routes by territory
  public static async findByTerritory(territory: string): Promise<Route[]> {
    return await Route.findAll({
      where: {
        territory,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find routes by driver
  public static async findByDriver(driverId: string): Promise<Route[]> {
    return await Route.findAll({
      where: {
        driverId,
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find routes by vehicle
  public static async findByVehicle(vehicleId: string): Promise<Route[]> {
    return await Route.findAll({
      where: {
        vehicleId,
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find unassigned routes (no driver or vehicle)
  public static async findUnassigned(): Promise<Route[]> {
    return await Route.findAll({
      where: {
        [database.Sequelize.Op.or]: [{ driverId: null }, { vehicleId: null }],
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Find routes needing optimization
  public static async findNeedingOptimization(
    daysSinceLastOptimization: number = 30,
  ): Promise<Route[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastOptimization);

    return await Route.findAll({
      where: {
        [database.Sequelize.Op.or]: [
          { lastOptimizedAt: null },
          { lastOptimizedAt: { [database.Sequelize.Op.lt]: cutoffDate } },
        ],
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [
        [
          database.fn(
            "COALESCE",
            database.col("last_optimized_at"),
            database.literal("'1970-01-01'"),
          ),
          "ASC",
        ],
        ["routeNumber", "ASC"],
      ],
    });
  }

  // Find routes by type
  public static async findByType(routeType: RouteType): Promise<Route[]> {
    return await Route.findAll({
      where: {
        routeType,
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Generate next route number
  public static async generateRouteNumber(territory?: string): Promise<string> {
    const prefix = territory ? territory.substring(0, 3).toUpperCase() : "RTE";

    // Find the highest existing route number with this prefix
    const lastRoute = await Route.findOne({
      where: {
        routeNumber: {
          [database.Sequelize.Op.like]: `${prefix}%`,
        },
      },
      order: [["routeNumber", "DESC"]],
    });

    let nextNumber = 1;
    if (lastRoute && lastRoute.routeNumber) {
      // Extract number from route number (e.g., RTE-001234 -> 1234)
      const match = lastRoute.routeNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    // Format with leading zeros
    const paddedNumber = nextNumber.toString().padStart(6, "0");
    return `${prefix}-${paddedNumber}`;
  }

  // Check if route number is already taken
  public static async isRouteNumberTaken(
    routeNumber: string,
    excludeRouteId?: string,
  ): Promise<boolean> {
    const whereClause: any = {
      routeNumber,
      deletedAt: null,
    };

    if (excludeRouteId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeRouteId };
    }

    const route = await Route.findOne({ where: whereClause });
    return !!route;
  }

  // Get routes within radius of a point (requires PostGIS)
  public static async findWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Route[]> {
    return await Route.findAll({
      where: database.where(
        database.fn(
          "ST_DWithin",
          database.col("route_geometry"),
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
            database.col("route_geometry"),
            database.fn("ST_GeogFromText", `POINT(${longitude} ${latitude})`),
          ),
          "distance",
        ],
      ],
      order: database.literal('"distance" ASC'),
    });
  }

  // Get route statistics
  public static async getRouteStatistics(): Promise<any> {
    const [statusStats, typeStats, dayStats] = await Promise.all([
      // Status distribution
      Route.findAll({
        attributes: [
          "status",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: { deletedAt: null },
        group: ["status"],
        raw: true,
      }),

      // Type distribution
      Route.findAll({
        attributes: [
          "routeType",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: {
          deletedAt: null,
          routeType: { [database.Sequelize.Op.ne]: null },
        },
        group: ["routeType"],
        raw: true,
      }),

      // Service day distribution
      Route.findAll({
        attributes: [
          "serviceDay",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: {
          deletedAt: null,
          serviceDay: { [database.Sequelize.Op.ne]: null },
        },
        group: ["serviceDay"],
        raw: true,
      }),
    ]);

    // Get optimization statistics
    const optimizationStats = await Route.findAll({
      attributes: [
        [database.fn("COUNT", database.col("id")), "totalRoutes"],
        [
          database.fn(
            "COUNT",
            database.literal("CASE WHEN ai_optimized = true THEN 1 END"),
          ),
          "optimizedRoutes",
        ],
        [
          database.fn("AVG", database.col("optimization_score")),
          "avgOptimizationScore",
        ],
        [
          database.fn("AVG", database.col("estimated_distance_miles")),
          "avgDistance",
        ],
        [
          database.fn("AVG", database.col("estimated_duration_minutes")),
          "avgDuration",
        ],
      ],
      where: { deletedAt: null },
      raw: true,
    });

    return {
      byStatus: statusStats,
      byType: typeStats,
      byServiceDay: dayStats,
      optimization: optimizationStats[0],
    };
  }

  // Get daily route schedule
  public static async getDailySchedule(date: Date): Promise<Route[]> {
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase() as ServiceDay;

    return await Route.findAll({
      where: {
        serviceDay: dayName,
        status: RouteStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["routeNumber", "ASC"]],
    });
  }

  // Get territory statistics
  public static async getTerritoryStatistics(): Promise<any[]> {
    return await Route.findAll({
      attributes: [
        "territory",
        [database.fn("COUNT", database.col("id")), "routeCount"],
        [
          database.fn("AVG", database.col("estimated_distance_miles")),
          "avgDistance",
        ],
        [
          database.fn("AVG", database.col("estimated_duration_minutes")),
          "avgDuration",
        ],
        [
          database.fn("SUM", database.col("estimated_distance_miles")),
          "totalDistance",
        ],
      ],
      where: {
        deletedAt: null,
        territory: { [database.Sequelize.Op.ne]: null },
      },
      group: ["territory"],
      order: [["territory", "ASC"]],
    });
  }
}

/**
 * Model definition
 */
Route.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    routeNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "routes_route_number_unique",
        msg: "Route number is already in use",
      },
      field: "route_number",
      validate: {
        len: {
          args: [3, 50],
          msg: "Route number must be between 3 and 50 characters",
        },
        notEmpty: {
          msg: "Route number is required",
        },
      },
    },
    routeName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "route_name",
      validate: {
        len: {
          args: [1, 255],
          msg: "Route name must be between 1 and 255 characters",
        },
        notEmpty: {
          msg: "Route name is required",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: "Description must be less than 2000 characters",
        },
      },
    },
    territory: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [1, 100],
          msg: "Territory must be between 1 and 100 characters",
        },
      },
    },
    estimatedDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estimated_duration_minutes",
      validate: {
        min: {
          args: [1],
          msg: "Estimated duration must be at least 1 minute",
        },
        max: {
          args: [1440], // 24 hours
          msg: "Estimated duration cannot exceed 24 hours",
        },
      },
    },
    estimatedDistanceMiles: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: "estimated_distance_miles",
      validate: {
        min: {
          args: [0],
          msg: "Estimated distance cannot be negative",
        },
        max: {
          args: [999999.99],
          msg: "Estimated distance is too large",
        },
        isDecimal: {
          msg: "Estimated distance must be a valid decimal number",
        },
      },
    },
    serviceDay: {
      type: DataTypes.ENUM(...Object.values(ServiceDay)),
      allowNull: true,
      field: "service_day",
      validate: {
        isIn: {
          args: [Object.values(ServiceDay)],
          msg: "Invalid service day",
        },
      },
    },
    routeType: {
      type: DataTypes.ENUM(...Object.values(RouteType)),
      allowNull: true,
      field: "route_type",
      validate: {
        isIn: {
          args: [Object.values(RouteType)],
          msg: "Invalid route type",
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RouteStatus)),
      allowNull: false,
      defaultValue: RouteStatus.ACTIVE,
      validate: {
        isIn: {
          args: [Object.values(RouteStatus)],
          msg: "Invalid route status",
        },
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
    routeGeometry: {
      type: DataTypes.GEOMETRY("LINESTRING", 4326),
      allowNull: true,
      field: "route_geometry",
    },
    aiOptimized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "ai_optimized",
    },
    optimizationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "optimization_score",
      validate: {
        min: {
          args: [0],
          msg: "Optimization score cannot be negative",
        },
        max: {
          args: [100],
          msg: "Optimization score cannot exceed 100",
        },
        isDecimal: {
          msg: "Optimization score must be a valid decimal number",
        },
      },
    },
    lastOptimizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_optimized_at",
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
    tableName: "routes",
    schema: "core",
    timestamps: true,
    paranoid: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    deletedAt: "deletedAt",
    underscored: true,
    indexes: [
      {
        name: "idx_routes_route_number",
        fields: ["route_number"],
        unique: true,
        where: { deleted_at: null },
      },
      {
        name: "idx_routes_territory",
        fields: ["territory"],
        where: { deleted_at: null },
      },
      {
        name: "idx_routes_driver_id",
        fields: ["driver_id"],
        where: { deleted_at: null },
      },
      {
        name: "idx_routes_vehicle_id",
        fields: ["vehicle_id"],
        where: { deleted_at: null },
      },
      {
        name: "idx_routes_service_day",
        fields: ["service_day"],
      },
      {
        name: "idx_routes_route_type",
        fields: ["route_type"],
      },
      {
        name: "idx_routes_status",
        fields: ["status"],
        where: { deleted_at: null },
      },
      {
        name: "idx_routes_ai_optimized",
        fields: ["ai_optimized"],
      },
      {
        name: "idx_routes_last_optimized_at",
        fields: ["last_optimized_at"],
        where: { last_optimized_at: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_routes_geometry",
        fields: [database.fn("ST_GeogFromWKB", database.col("route_geometry"))],
        using: "GIST",
        where: { route_geometry: { [database.Sequelize.Op.ne]: null } },
      },
    ],
    hooks: {
      beforeValidate: async (route: Route) => {
        // Auto-generate route number if not provided
        if (!route.routeNumber) {
          route.routeNumber = await Route.generateRouteNumber(
            route?.territory || undefined,
          );
        }

        // Normalize territory to uppercase
        if (route.territory) {
          route.territory = route.territory.toUpperCase();
        }
      },
      beforeUpdate: (route: Route) => {
        // Increment version for optimistic locking
        route.version = (route?.version || 1) + 1;

        // Update optimization timestamp if optimization score changed
        if (route.changed("optimizationScore") && route.optimizationScore) {
          route.lastOptimizedAt = new Date();
          route.aiOptimized = true;
        }
      },
    },
    scopes: {
      active: {
        where: {
          status: RouteStatus.ACTIVE,
          deletedAt: null,
        },
      },
      inactive: {
        where: {
          status: RouteStatus.INACTIVE,
          deletedAt: null,
        },
      },
      optimizing: {
        where: {
          status: RouteStatus.OPTIMIZING,
          deletedAt: null,
        },
      },
      byServiceDay: (day: ServiceDay) => ({
        where: {
          serviceDay: day,
          status: RouteStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      byType: (type: RouteType) => ({
        where: {
          routeType: type,
          deletedAt: null,
        },
      }),
      byTerritory: (territory: string) => ({
        where: {
          territory: territory.toUpperCase(),
          deletedAt: null,
        },
      }),
      assigned: {
        where: {
          driverId: { [database.Sequelize.Op.ne]: null },
          vehicleId: { [database.Sequelize.Op.ne]: null },
          status: RouteStatus.ACTIVE,
          deletedAt: null,
        },
      },
      unassigned: {
        where: {
          [database.Sequelize.Op.or]: [{ driverId: null }, { vehicleId: null }],
          status: RouteStatus.ACTIVE,
          deletedAt: null,
        },
      },
      optimized: {
        where: {
          aiOptimized: true,
          deletedAt: null,
        },
      },
      needingOptimization: (days: number = 30) => ({
        where: {
          [database.Sequelize.Op.or]: [
            { lastOptimizedAt: null },
            {
              lastOptimizedAt: {
                [database.Sequelize.Op.lt]: new Date(
                  Date.now() - days * 24 * 60 * 60 * 1000,
                ),
              },
            },
          ],
          status: RouteStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      withGeometry: {
        where: {
          routeGeometry: { [database.Sequelize.Op.ne]: null },
          deletedAt: null,
        },
      },
    },
  },
);

export default Route;
