/**
 * ============================================================================
 * OPTIMIZED ROUTE MODEL - ROUTE OPTIMIZATION METADATA STORAGE
 * ============================================================================
 *
 * Implements optimized route metadata storage with optimization results,
 * business impact metrics, and performance tracking for route optimization.
 *
 * COORDINATION: Backend-Agent + Innovation-Architect
 * Backend-Agent: Model definition and database integration (THIS FILE)
 * Innovation-Architect: OR-Tools optimization result structures
 *
 * Created by: Backend-Agent (Phase 2 Coordination)
 * Date: 2025-08-18
 * Version: 1.0.0 - Phase 2 Route Optimization Model
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

// Define optimization algorithm enum
export enum OptimizationAlgorithm {
  OR_TOOLS = "or_tools",
  HEURISTIC = "heuristic", 
  FALLBACK = "fallback",
  MACHINE_LEARNING = "machine_learning"
}

// Define optimization status enum
export enum OptimizationStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  APPLIED = "applied",
  ARCHIVED = "archived"
}

/**
 * Optimized Route model interface
 */
export interface OptimizedRouteAttributes {
  id: string;
  optimizationId: string; // Group optimization ID
  baseRouteId: ForeignKey<string>; // Reference to original Route
  
  // Optimization metadata
  algorithmUsed: OptimizationAlgorithm;
  status: OptimizationStatus;
  optimizationLevel: string; // fast, balanced, thorough
  optimizationScore: number; // 0-100
  
  // Route assignment
  assignedDriverId?: ForeignKey<string>;
  assignedVehicleId?: ForeignKey<string>;
  
  // Distance and time metrics
  originalDistance: number; // miles
  optimizedDistance: number; // miles
  distanceReduction: number; // miles saved
  distanceSavingsPercent: number;
  
  originalDuration: number; // minutes
  optimizedDuration: number; // minutes
  timeReduction: number; // minutes saved
  timeSavingsPercent: number;
  
  // Business impact metrics
  fuelSavingsGallons: number;
  fuelSavingsDollars: number;
  co2ReductionKg: number;
  estimatedCostSavings: number; // dollars
  
  // Efficiency metrics
  efficiencyGain: number; // percentage
  onTimeDeliveryImprovement: number; // percentage
  customerServiceImpact: number; // percentage
  
  // Waypoint and route data
  optimizedWaypoints: any; // JSON array of waypoints
  routeGeometry?: any; // PostGIS LINESTRING geometry
  constraints: any; // JSON constraints applied
  
  // Processing metadata
  executionTimeMs: number;
  processedAt: Date;
  appliedAt?: Date;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  version: number;
  
  // Validation and warnings
  constraintViolations: number;
  warnings?: any; // JSON array of warnings
  validatedAt?: Date;
  
  // Archive fields
  archivedAt?: Date;
  archivedBy?: ForeignKey<string>;
  archiveReason?: string;
}

export interface OptimizedRouteCreationAttributes
  extends Omit<
    OptimizedRouteAttributes,
    "id" | "createdAt" | "updatedAt" | "version" | "status"
  > {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  status?: CreationOptional<OptimizationStatus>;
}

/**
 * OptimizedRoute model class
 */
export class OptimizedRoute extends Model<
  InferAttributes<OptimizedRoute>,
  InferCreationAttributes<OptimizedRoute>
> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare optimizationId: string;
  declare baseRouteId: ForeignKey<string>;
  
  // Optimization metadata
  declare algorithmUsed: OptimizationAlgorithm;
  declare status: CreationOptional<OptimizationStatus>;
  declare optimizationLevel: string;
  declare optimizationScore: number;
  
  // Route assignment
  declare assignedDriverId: ForeignKey<string> | null;
  declare assignedVehicleId: ForeignKey<string> | null;
  
  // Distance and time metrics
  declare originalDistance: number;
  declare optimizedDistance: number;
  declare distanceReduction: number;
  declare distanceSavingsPercent: number;
  
  declare originalDuration: number;
  declare optimizedDuration: number;
  declare timeReduction: number;
  declare timeSavingsPercent: number;
  
  // Business impact metrics
  declare fuelSavingsGallons: number;
  declare fuelSavingsDollars: number;
  declare co2ReductionKg: number;
  declare estimatedCostSavings: number;
  
  // Efficiency metrics
  declare efficiencyGain: number;
  declare onTimeDeliveryImprovement: number;
  declare customerServiceImpact: number;
  
  // Waypoint and route data
  declare optimizedWaypoints: any;
  declare routeGeometry: any;
  declare constraints: any;
  
  // Processing metadata
  declare executionTimeMs: number;
  declare processedAt: Date;
  declare appliedAt: Date | null;
  
  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Foreign keys for audit trail
  declare createdBy: ForeignKey<string> | null;
  declare updatedBy: ForeignKey<string> | null;
  declare version: CreationOptional<number>;
  
  // Validation and warnings
  declare constraintViolations: number;
  declare warnings: any;
  declare validatedAt: Date | null;
  
  // Archive fields
  declare archivedAt: Date | null;
  declare archivedBy: ForeignKey<string> | null;
  declare archiveReason: string | null;

  // Association declarations
  declare getBaseRoute: BelongsToGetAssociationMixin<any>; // Route
  declare setBaseRoute: BelongsToSetAssociationMixin<any, string>; // Route
  declare getAssignedDriver: BelongsToGetAssociationMixin<any>; // Driver
  declare setAssignedDriver: BelongsToSetAssociationMixin<any, string>; // Driver
  declare getAssignedVehicle: BelongsToGetAssociationMixin<any>; // Vehicle
  declare setAssignedVehicle: BelongsToSetAssociationMixin<any, string>; // Vehicle
  declare getCreatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setCreatedByUser: BelongsToSetAssociationMixin<any, string>; // User

  // Associations - will be defined in associations file
  declare static associations: {
    baseRoute: Association<OptimizedRoute, any>;
    assignedDriver: Association<OptimizedRoute, any>;
    assignedVehicle: Association<OptimizedRoute, any>;
    createdByUser: Association<OptimizedRoute, any>;
    updatedByUser: Association<OptimizedRoute, any>;
  };

  /**
   * Instance methods
   */

  // Check if optimization is completed
  public isCompleted(): boolean {
    return this.status === OptimizationStatus.COMPLETED;
  }

  // Check if optimization is applied
  public isApplied(): boolean {
    return this.status === OptimizationStatus.APPLIED;
  }

  // Check if optimization failed
  public isFailed(): boolean {
    return this.status === OptimizationStatus.FAILED;
  }

  // Check if optimization is archived
  public isArchived(): boolean {
    return this.status === OptimizationStatus.ARCHIVED;
  }

  // Get status label
  public getStatusLabel(): string {
    switch (this.status) {
      case OptimizationStatus.PENDING:
        return "Pending";
      case OptimizationStatus.PROCESSING:
        return "Processing";
      case OptimizationStatus.COMPLETED:
        return "Completed";
      case OptimizationStatus.FAILED:
        return "Failed";
      case OptimizationStatus.APPLIED:
        return "Applied";
      case OptimizationStatus.ARCHIVED:
        return "Archived";
      default:
        return "Unknown";
    }
  }

  // Get algorithm label
  public getAlgorithmLabel(): string {
    switch (this.algorithmUsed) {
      case OptimizationAlgorithm.OR_TOOLS:
        return "OR-Tools";
      case OptimizationAlgorithm.HEURISTIC:
        return "Heuristic";
      case OptimizationAlgorithm.FALLBACK:
        return "Fallback";
      case OptimizationAlgorithm.MACHINE_LEARNING:
        return "Machine Learning";
      default:
        return "Unknown";
    }
  }

  // Check if route has significant improvements
  public hasSignificantImprovements(threshold: number = 5): boolean {
    return this.distanceSavingsPercent >= threshold || 
           this.timeSavingsPercent >= threshold;
  }

  // Get distance savings formatted
  public getDistanceSavingsFormatted(): string {
    return `${this.distanceReduction.toFixed(1)} miles (${this.distanceSavingsPercent.toFixed(1)}%)`;
  }

  // Get time savings formatted
  public getTimeSavingsFormatted(): string {
    const hours = Math.floor(this.timeReduction / 60);
    const minutes = this.timeReduction % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return `${timeStr} (${this.timeSavingsPercent.toFixed(1)}%)`;
  }

  // Get cost savings formatted
  public getCostSavingsFormatted(): string {
    return `$${this.estimatedCostSavings.toFixed(2)}`;
  }

  // Get environmental impact formatted
  public getEnvironmentalImpactFormatted(): string {
    return {
      fuelSaved: `${this.fuelSavingsGallons.toFixed(1)} gallons`,
      co2Reduced: `${this.co2ReductionKg.toFixed(1)} kg CO2`
    };
  }

  // Calculate total business value
  public calculateTotalBusinessValue(): number {
    return this.estimatedCostSavings + 
           (this?.fuelSavingsDollars || 0) +
           (this.efficiencyGain * 10); // Rough efficiency value
  }

  // Check if route needs validation
  public needsValidation(): boolean {
    return !this?.validatedAt || this.constraintViolations > 0;
  }

  // Get processing time formatted
  public getProcessingTimeFormatted(): string {
    if (this.executionTimeMs < 1000) {
      return `${this.executionTimeMs}ms`;
    } else if (this.executionTimeMs < 60000) {
      return `${(this.executionTimeMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(this.executionTimeMs / 60000);
      const seconds = Math.floor((this.executionTimeMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Static methods
   */

  // Find optimizations by optimization ID
  public static async findByOptimizationId(
    optimizationId: string
  ): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        optimizationId,
        archivedAt: null
      },
      order: [["optimizationScore", "DESC"]]
    });
  }

  // Find optimizations by base route
  public static async findByBaseRoute(
    baseRouteId: string
  ): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        baseRouteId,
        archivedAt: null
      },
      order: [["processedAt", "DESC"]]
    });
  }

  // Find current applied optimizations
  public static async findApplied(): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        status: OptimizationStatus.APPLIED,
        archivedAt: null
      },
      order: [["appliedAt", "DESC"]]
    });
  }

  // Find recent optimizations
  public static async findRecent(limit: number = 50): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        archivedAt: null
      },
      order: [["processedAt", "DESC"]],
      limit
    });
  }

  // Find optimizations by algorithm
  public static async findByAlgorithm(
    algorithm: OptimizationAlgorithm
  ): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        algorithmUsed: algorithm,
        archivedAt: null
      },
      order: [["processedAt", "DESC"]]
    });
  }

  // Find optimizations with significant improvements
  public static async findWithSignificantImprovements(
    threshold: number = 10
  ): Promise<OptimizedRoute[]> {
    return await OptimizedRoute.findAll({
      where: {
        [database.Op.or]: [
          { distanceSavingsPercent: { [database.Op.gte]: threshold } },
          { timeSavingsPercent: { [database.Op.gte]: threshold } }
        ],
        archivedAt: null
      },
      order: [["optimizationScore", "DESC"]]
    });
  }

  // Get optimization statistics
  public static async getOptimizationStatistics(): Promise<any> {
    const [statusStats, algorithmStats, performanceStats] = await Promise.all([
      // Status distribution
      OptimizedRoute.findAll({
        attributes: [
          "status",
          [database.fn("COUNT", database.col("id")), "count"]
        ],
        where: { archivedAt: null },
        group: ["status"],
        raw: true
      }),

      // Algorithm distribution
      OptimizedRoute.findAll({
        attributes: [
          "algorithmUsed",
          [database.fn("COUNT", database.col("id")), "count"],
          [database.fn("AVG", database.col("optimization_score")), "avgScore"]
        ],
        where: { archivedAt: null },
        group: ["algorithmUsed"],
        raw: true
      }),

      // Performance statistics
      OptimizedRoute.findAll({
        attributes: [
          [database.fn("COUNT", database.col("id")), "totalOptimizations"],
          [database.fn("AVG", database.col("optimization_score")), "avgOptimizationScore"],
          [database.fn("AVG", database.col("distance_savings_percent")), "avgDistanceSavings"],
          [database.fn("AVG", database.col("time_savings_percent")), "avgTimeSavings"],
          [database.fn("SUM", database.col("estimated_cost_savings")), "totalCostSavings"],
          [database.fn("SUM", database.col("fuel_savings_gallons")), "totalFuelSavings"],
          [database.fn("SUM", database.col("co2_reduction_kg")), "totalCo2Reduction"],
          [database.fn("AVG", database.col("execution_time_ms")), "avgExecutionTime"]
        ],
        where: { 
          archivedAt: null,
          status: OptimizationStatus.COMPLETED 
        },
        raw: true
      })
    ]);

    return {
      byStatus: statusStats,
      byAlgorithm: algorithmStats,
      performance: performanceStats[0]
    };
  }

  // Archive old optimizations
  public static async archiveOldOptimizations(
    daysOld: number = 90,
    archivedBy?: string
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const [affectedCount] = await OptimizedRoute.update(
      {
        status: OptimizationStatus.ARCHIVED,
        archivedAt: new Date(),
        archivedBy,
        archiveReason: `Automatic archive after ${daysOld} days`
      },
      {
        where: {
          processedAt: { [database.Op.lt]: cutoffDate },
          status: { [database.Op.ne]: OptimizationStatus.APPLIED },
          archivedAt: null
        }
      }
    );

    return affectedCount;
  }
}

/**
 * Model definition
 */
OptimizedRoute.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    optimizationId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "optimization_id",
      validate: {
        len: {
          args: [1, 100],
          msg: "Optimization ID must be 1-100 characters"
        },
        notEmpty: {
          msg: "Optimization ID is required"
        }
      }
    },
    baseRouteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "base_route_id",
      references: {
        model: "routes",
        key: "id"
      }
    },
    algorithmUsed: {
      type: DataTypes.ENUM(...Object.values(OptimizationAlgorithm)),
      allowNull: false,
      field: "algorithm_used",
      validate: {
        isIn: {
          args: [Object.values(OptimizationAlgorithm)],
          msg: "Invalid optimization algorithm"
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OptimizationStatus)),
      allowNull: false,
      defaultValue: OptimizationStatus.PENDING,
      validate: {
        isIn: {
          args: [Object.values(OptimizationStatus)],
          msg: "Invalid optimization status"
        }
      }
    },
    optimizationLevel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "optimization_level",
      defaultValue: "balanced",
      validate: {
        isIn: {
          args: [["fast", "balanced", "thorough"]],
          msg: "Optimization level must be fast, balanced, or thorough"
        }
      }
    },
    optimizationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "optimization_score",
      validate: {
        min: {
          args: [0],
          msg: "Optimization score cannot be negative"
        },
        max: {
          args: [100],
          msg: "Optimization score cannot exceed 100"
        }
      }
    },
    assignedDriverId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_driver_id",
      references: {
        model: "drivers",
        key: "id"
      }
    },
    assignedVehicleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_vehicle_id",
      references: {
        model: "vehicles",
        key: "id"
      }
    },
    originalDistance: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "original_distance",
      validate: {
        min: {
          args: [0],
          msg: "Original distance cannot be negative"
        }
      }
    },
    optimizedDistance: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "optimized_distance",
      validate: {
        min: {
          args: [0],
          msg: "Optimized distance cannot be negative"
        }
      }
    },
    distanceReduction: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "distance_reduction",
      validate: {
        min: {
          args: [0],
          msg: "Distance reduction cannot be negative"
        }
      }
    },
    distanceSavingsPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "distance_savings_percent",
      validate: {
        min: {
          args: [0],
          msg: "Distance savings percent cannot be negative"
        }
      }
    },
    originalDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "original_duration",
      validate: {
        min: {
          args: [0],
          msg: "Original duration cannot be negative"
        }
      }
    },
    optimizedDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "optimized_duration",
      validate: {
        min: {
          args: [0],
          msg: "Optimized duration cannot be negative"
        }
      }
    },
    timeReduction: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "time_reduction",
      validate: {
        min: {
          args: [0],
          msg: "Time reduction cannot be negative"
        }
      }
    },
    timeSavingsPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "time_savings_percent",
      validate: {
        min: {
          args: [0],
          msg: "Time savings percent cannot be negative"
        }
      }
    },
    fuelSavingsGallons: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
      field: "fuel_savings_gallons"
    },
    fuelSavingsDollars: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
      field: "fuel_savings_dollars"
    },
    co2ReductionKg: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
      field: "co2_reduction_kg"
    },
    estimatedCostSavings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "estimated_cost_savings"
    },
    efficiencyGain: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "efficiency_gain"
    },
    onTimeDeliveryImprovement: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "on_time_delivery_improvement"
    },
    customerServiceImpact: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "customer_service_impact"
    },
    optimizedWaypoints: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "optimized_waypoints"
    },
    routeGeometry: {
      type: DataTypes.GEOMETRY("LINESTRING", 4326),
      allowNull: true,
      field: "route_geometry"
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "constraints"
    },
    executionTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "execution_time_ms",
      validate: {
        min: {
          args: [0],
          msg: "Execution time cannot be negative"
        }
      }
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "processed_at"
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "applied_at"
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
      references: {
        model: "users",
        key: "id"
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
      references: {
        model: "users",
        key: "id"
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    constraintViolations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "constraint_violations"
    },
    warnings: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "validated_at"
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "archived_at"
    },
    archivedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "archived_by",
      references: {
        model: "users",
        key: "id"
      }
    },
    archiveReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "archive_reason"
    }
  },
  {
    sequelize: database,
    tableName: "optimized_routes",
    schema: "core",
    timestamps: true,
    paranoid: false, // Using archivedAt instead
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    underscored: true,
    indexes: [
      {
        name: "idx_optimized_routes_optimization_id",
        fields: ["optimization_id"]
      },
      {
        name: "idx_optimized_routes_base_route_id",
        fields: ["base_route_id"]
      },
      {
        name: "idx_optimized_routes_status",
        fields: ["status"],
        where: { archived_at: null }
      },
      {
        name: "idx_optimized_routes_algorithm",
        fields: ["algorithm_used"]
      },
      {
        name: "idx_optimized_routes_processed_at",
        fields: ["processed_at"]
      },
      {
        name: "idx_optimized_routes_applied_at",
        fields: ["applied_at"],
        where: { applied_at: { [database.Op.ne]: null } }
      },
      {
        name: "idx_optimized_routes_score",
        fields: ["optimization_score"]
      },
      {
        name: "idx_optimized_routes_savings",
        fields: ["distance_savings_percent", "time_savings_percent"]
      },
      {
        name: "idx_optimized_routes_geometry",
        fields: [database.fn("ST_GeogFromWKB", database.col("route_geometry"))],
        using: "GIST",
        where: { route_geometry: { [database.Op.ne]: null } }
      }
    ],
    hooks: {
      beforeUpdate: (optimizedRoute: OptimizedRoute) => {
        // Increment version for optimistic locking
        optimizedRoute.version = (optimizedRoute?.version || 1) + 1;

        // Set applied timestamp when status changes to applied
        if (optimizedRoute.changed("status") && optimizedRoute.status === OptimizationStatus.APPLIED) {
          optimizedRoute.appliedAt = new Date();
        }
      }
    },
    scopes: {
      active: {
        where: {
          archivedAt: null
        }
      },
      completed: {
        where: {
          status: OptimizationStatus.COMPLETED,
          archivedAt: null
        }
      },
      applied: {
        where: {
          status: OptimizationStatus.APPLIED,
          archivedAt: null
        }
      },
      byAlgorithm: (algorithm: OptimizationAlgorithm) => ({
        where: {
          algorithmUsed: algorithm,
          archivedAt: null
        }
      }),
      withSignificantImprovements: (threshold: number = 10) => ({
        where: {
          [database.Op.or]: [
            { distanceSavingsPercent: { [database.Op.gte]: threshold } },
            { timeSavingsPercent: { [database.Op.gte]: threshold } }
          ],
          archivedAt: null
        }
      }),
      recent: (days: number = 30) => ({
        where: {
          processedAt: {
            [database.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          },
          archivedAt: null
        }
      })
    }
  }
);

export default OptimizedRoute;