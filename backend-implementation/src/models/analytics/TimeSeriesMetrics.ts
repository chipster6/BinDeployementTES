/**
 * ============================================================================
 * TIME SERIES METRICS MODEL - PREDICTIVE ANALYTICS FOUNDATION
 * ============================================================================
 *
 * Optimized time series data schema for predictive analytics and forecasting.
 * Supports Prophet + LightGBM integration with efficient aggregation views.
 *
 * Created by: Database Architect Agent
 * Coordination: Phase 3 Predictive Foundation (Session ID: coordination-session-phase3-parallel-011)
 * Date: 2025-08-19
 * Version: 1.0.0 - Time Series Schema Optimization
 */

import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  NonAttribute,
  Association,
} from "sequelize";
import { database } from "@/config/database";
import { User } from "../User";
import { Customer } from "../Customer";
import { Route } from "../Route";
import { Vehicle } from "../Vehicle";

/**
 * Time series metric types for different prediction models
 */
export enum MetricType {
  // Waste collection metrics
  WASTE_VOLUME = "waste_volume",
  WASTE_WEIGHT = "waste_weight",
  COLLECTION_COUNT = "collection_count",
  
  // Route optimization metrics
  ROUTE_DURATION = "route_duration",
  ROUTE_DISTANCE = "route_distance",
  FUEL_CONSUMPTION = "fuel_consumption",
  STOPS_COUNT = "stops_count",
  
  // Customer behavior metrics
  SERVICE_FREQUENCY = "service_frequency",
  MISSED_COLLECTIONS = "missed_collections",
  CUSTOMER_SATISFACTION = "customer_satisfaction",
  CHURN_INDICATORS = "churn_indicators",
  
  // Operational metrics
  VEHICLE_UTILIZATION = "vehicle_utilization",
  DRIVER_EFFICIENCY = "driver_efficiency",
  MAINTENANCE_COSTS = "maintenance_costs",
  EQUIPMENT_DOWNTIME = "equipment_downtime",
  
  // Financial metrics
  REVENUE_PER_CUSTOMER = "revenue_per_customer",
  COST_PER_ROUTE = "cost_per_route",
  PROFIT_MARGIN = "profit_margin",
  
  // Environmental metrics
  CARBON_EMISSIONS = "carbon_emissions",
  RECYCLING_RATE = "recycling_rate",
  LANDFILL_DIVERSION = "landfill_diversion",
}

/**
 * Time aggregation levels for efficient querying
 */
export enum AggregationLevel {
  HOURLY = "hourly",
  DAILY = "daily", 
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

/**
 * Time series data quality indicators
 */
export enum DataQuality {
  HIGH = "high",        // Complete, validated data
  MEDIUM = "medium",    // Minor gaps or estimated values
  LOW = "low",         // Significant gaps or interpolated data
  ESTIMATED = "estimated", // Fully estimated/predicted values
}

/**
 * Time series metrics interface
 */
export interface TimeSeriesMetricsAttributes {
  id: string;
  
  // Time dimension (optimized for time-based queries)
  timestamp: Date;
  aggregationLevel: AggregationLevel;
  
  // Metric identification
  metricType: MetricType;
  metricName: string;
  
  // Dimensional attributes (for segmentation)
  customerId?: ForeignKey<string>;
  routeId?: ForeignKey<string>;
  vehicleId?: ForeignKey<string>;
  driverId?: ForeignKey<string>;
  
  // Geographic dimension
  region?: string;
  zone?: string;
  serviceArea?: any; // PostGIS geometry
  
  // Metric values (multiple value types for flexibility)
  numericValue?: number;
  categoricalValue?: string;
  booleanValue?: boolean;
  jsonValue?: Record<string, any>;
  
  // Statistical aggregates (pre-computed for performance)
  aggregates: {
    count: number;
    sum?: number;
    average?: number;
    minimum?: number;
    maximum?: number;
    standardDeviation?: number;
    percentile50?: number;
    percentile90?: number;
    percentile95?: number;
  };
  
  // Data quality and metadata
  dataQuality: DataQuality;
  confidence: number; // 0.0 to 1.0
  sampleSize?: number;
  
  // Seasonality indicators
  seasonality: {
    isHoliday?: boolean;
    dayOfWeek: number; // 1-7
    weekOfYear: number; // 1-53
    monthOfYear: number; // 1-12
    quarterOfYear: number; // 1-4
    isWeekend: boolean;
    seasonName?: string; // spring, summer, fall, winter
  };
  
  // External factors (weather, events, etc.)
  externalFactors?: {
    weatherCondition?: string;
    temperature?: number;
    precipitation?: number;
    specialEvent?: string;
    trafficCondition?: string;
  };
  
  // Audit and tracking
  createdBy?: ForeignKey<string>;
  dataSource: string; // system_generated, manual_entry, api_import, etc.
  sourceJobId?: string; // Reference to the aggregation job that created this record
  
  // Standard timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time series metrics model
 */
export class TimeSeriesMetrics extends Model<
  InferAttributes<TimeSeriesMetrics>,
  InferCreationAttributes<TimeSeriesMetrics>
> {
  // Primary key
  declare id: CreationOptional<string>;
  
  // Time dimension
  declare timestamp: Date;
  declare aggregationLevel: AggregationLevel;
  
  // Metric identification
  declare metricType: MetricType;
  declare metricName: string;
  
  // Dimensional foreign keys
  declare customerId: ForeignKey<string> | null;
  declare routeId: ForeignKey<string> | null;
  declare vehicleId: ForeignKey<string> | null;
  declare driverId: ForeignKey<string> | null;
  
  // Geographic dimension
  declare region: string | null;
  declare zone: string | null;
  declare serviceArea: any; // PostGIS geometry
  
  // Metric values
  declare numericValue: number | null;
  declare categoricalValue: string | null;
  declare booleanValue: boolean | null;
  declare jsonValue: Record<string, any> | null;
  
  // Pre-computed aggregates
  declare aggregates: {
    count: number;
    sum?: number;
    average?: number;
    minimum?: number;
    maximum?: number;
    standardDeviation?: number;
    percentile50?: number;
    percentile90?: number;
    percentile95?: number;
  };
  
  // Data quality
  declare dataQuality: DataQuality;
  declare confidence: number;
  declare sampleSize: number | null;
  
  // Seasonality
  declare seasonality: {
    isHoliday?: boolean;
    dayOfWeek: number;
    weekOfYear: number;
    monthOfYear: number;
    quarterOfYear: number;
    isWeekend: boolean;
    seasonName?: string;
  };
  
  // External factors
  declare externalFactors: {
    weatherCondition?: string;
    temperature?: number;
    precipitation?: number;
    specialEvent?: string;
    trafficCondition?: string;
  } | null;
  
  // Audit fields
  declare createdBy: ForeignKey<string> | null;
  declare dataSource: string;
  declare sourceJobId: string | null;
  
  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare customer?: NonAttribute<Customer>;
  declare route?: NonAttribute<Route>;
  declare vehicle?: NonAttribute<Vehicle>;
  declare creator?: NonAttribute<User>;
  
  // Association declarations
  declare static associations: {
    customer: Association<TimeSeriesMetrics, Customer>;
    route: Association<TimeSeriesMetrics, Route>;
    vehicle: Association<TimeSeriesMetrics, Vehicle>;
    creator: Association<TimeSeriesMetrics, User>;
  };
  
  /**
   * Instance methods for data analysis
   */
  
  /**
   * Check if this metric is suitable for forecasting
   */
  isForecastable(): boolean {
    return (
      this.dataQuality !== DataQuality.LOW &&
      this.confidence >= 0.7 &&
      this.numericValue !== null
    );
  }
  
  /**
   * Get seasonal category
   */
  getSeasonalCategory(): string {
    const { isWeekend, isHoliday, monthOfYear } = this.seasonality;
    
    if (isHoliday) return "holiday";
    if (isWeekend) return "weekend";
    
    // Seasonal mapping
    if (monthOfYear >= 3 && monthOfYear <= 5) return "spring";
    if (monthOfYear >= 6 && monthOfYear <= 8) return "summer";
    if (monthOfYear >= 9 && monthOfYear <= 11) return "fall";
    return "winter";
  }
  
  /**
   * Get trend direction based on historical comparison
   */
  async getTrendDirection(periodDays: number = 30): Promise<"up" | "down" | "stable"> {
    const compareDate = new Date(this.timestamp);
    compareDate.setDate(compareDate.getDate() - periodDays);
    
    const historicalMetric = await TimeSeriesMetrics.findOne({
      where: {
        metricType: this.metricType,
        metricName: this.metricName,
        customerId: this.customerId,
        routeId: this.routeId,
        vehicleId: this.vehicleId,
        timestamp: {
          [database.Sequelize.Op.gte]: compareDate,
          [database.Sequelize.Op.lt]: this.timestamp,
        },
      },
      order: [["timestamp", "DESC"]],
    });
    
    if (!historicalMetric || !historicalMetric.numericValue || !this.numericValue) {
      return "stable";
    }
    
    const changePercent = 
      ((this.numericValue - historicalMetric.numericValue) / historicalMetric.numericValue) * 100;
    
    if (changePercent > 5) return "up";
    if (changePercent < -5) return "down";
    return "stable";
  }
  
  /**
   * Static methods for time series analysis
   */
  
  /**
   * Get time series data for forecasting
   */
  static async getTimeSeriesForForecasting(
    metricType: MetricType,
    options: {
      customerId?: string;
      routeId?: string;
      vehicleId?: string;
      startDate?: Date;
      endDate?: Date;
      aggregationLevel?: AggregationLevel;
      minDataQuality?: DataQuality;
    } = {}
  ): Promise<TimeSeriesMetrics[]> {
    const whereClause: any = {
      metricType,
      numericValue: { [database.Sequelize.Op.ne]: null },
    };
    
    if (options.customerId) whereClause.customerId = options.customerId;
    if (options.routeId) whereClause.routeId = options.routeId;
    if (options.vehicleId) whereClause.vehicleId = options.vehicleId;
    
    if (options?.startDate || options.endDate) {
      whereClause.timestamp = {};
      if (options.startDate) whereClause.timestamp[database.Sequelize.Op.gte] = options.startDate;
      if (options.endDate) whereClause.timestamp[database.Sequelize.Op.lte] = options.endDate;
    }
    
    if (options.aggregationLevel) {
      whereClause.aggregationLevel = options.aggregationLevel;
    }
    
    // Data quality filtering
    if (options.minDataQuality) {
      const qualityOrder = [DataQuality.LOW, DataQuality.MEDIUM, DataQuality.HIGH];
      const minIndex = qualityOrder.indexOf(options.minDataQuality);
      whereClause.dataQuality = {
        [database.Sequelize.Op.in]: qualityOrder.slice(minIndex),
      };
    }
    
    return await TimeSeriesMetrics.findAll({
      where: whereClause,
      order: [["timestamp", "ASC"]],
      limit: 10000, // Prevent memory issues
    });
  }
  
  /**
   * Calculate seasonal decomposition data
   */
  static async getSeasonalDecomposition(
    metricType: MetricType,
    customerId?: string,
    periodMonths: number = 24
  ): Promise<{
    trend: Array<{ timestamp: Date; value: number }>;
    seasonal: Array<{ period: string; factor: number }>;
    residual: Array<{ timestamp: Date; value: number }>;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);
    
    const data = await this.getTimeSeriesForForecasting(metricType, {
      customerId,
      startDate,
      endDate,
      aggregationLevel: AggregationLevel.DAILY,
      minDataQuality: DataQuality.MEDIUM,
    });
    
    // Simplified seasonal decomposition (for full implementation, use Prophet)
    const values = data.map(d => d.numericValue!);
    const timestamps = data.map(d => d.timestamp);
    
    // Calculate moving average for trend
    const trendWindow = 30; // 30-day moving average
    const trend = values.map((value, index) => {
      const start = Math.max(0, index - Math.floor(trendWindow / 2));
      const end = Math.min(values.length, index + Math.floor(trendWindow / 2) + 1);
      const windowValues = values.slice(start, end);
      const average = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      
      return { timestamp: timestamps[index], value: average };
    });
    
    // Calculate seasonal factors (day of week)
    const seasonalFactors = new Map<number, number[]>();
    data.forEach(d => {
      const dayOfWeek = d.seasonality.dayOfWeek;
      if (!seasonalFactors.has(dayOfWeek)) {
        seasonalFactors.set(dayOfWeek, []);
      }
      seasonalFactors.get(dayOfWeek)!.push(d.numericValue!);
    });
    
    const seasonal = Array.from(seasonalFactors.entries()).map(([day, values]) => {
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const overallAverage = data.reduce((sum, d) => sum + d.numericValue!, 0) / data.length;
      return {
        period: `day_${day}`,
        factor: average / overallAverage,
      };
    });
    
    // Calculate residual (actual - trend - seasonal)
    const residual = data.map((d, index) => {
      const trendValue = trend[index]?.value || d.numericValue!;
      const seasonalFactor = seasonal.find(s => s.period === `day_${d.seasonality.dayOfWeek}`)?.factor || 1;
      const expected = trendValue * seasonalFactor;
      
      return {
        timestamp: d.timestamp,
        value: d.numericValue! - expected,
      };
    });
    
    return { trend, seasonal, residual };
  }
  
  /**
   * Detect anomalies in time series data
   */
  static async detectAnomalies(
    metricType: MetricType,
    options: {
      customerId?: string;
      routeId?: string;
      lookbackDays?: number;
      thresholdStdDev?: number;
    } = {}
  ): Promise<TimeSeriesMetrics[]> {
    const lookbackDays = options?.lookbackDays || 30;
    const thresholdStdDev = options?.thresholdStdDev || 2.0;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    
    const data = await this.getTimeSeriesForForecasting(metricType, {
      customerId: options.customerId,
      routeId: options.routeId,
      startDate,
      endDate,
      aggregationLevel: AggregationLevel.DAILY,
    });
    
    if (data.length < 7) return []; // Need minimum data for anomaly detection
    
    const values = data.map(d => d.numericValue!);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const upperBound = mean + (thresholdStdDev * stdDev);
    const lowerBound = mean - (thresholdStdDev * stdDev);
    
    return data.filter(d => d.numericValue! > upperBound || d.numericValue! < lowerBound);
  }
}

/**
 * Model initialization with optimized indexing for time series queries
 */
TimeSeriesMetrics.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "timestamp",
    },
    aggregationLevel: {
      type: DataTypes.ENUM(...Object.values(AggregationLevel)),
      allowNull: false,
      field: "aggregation_level",
    },
    metricType: {
      type: DataTypes.ENUM(...Object.values(MetricType)),
      allowNull: false,
      field: "metric_type",
    },
    metricName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "metric_name",
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "vehicle_id",
      references: {
        model: "vehicles",
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
    region: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    zone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    serviceArea: {
      type: DataTypes.GEOMETRY("POLYGON", 4326),
      allowNull: true,
      field: "service_area",
    },
    numericValue: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: true,
      field: "numeric_value",
    },
    categoricalValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "categorical_value",
    },
    booleanValue: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: "boolean_value",
    },
    jsonValue: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "json_value",
    },
    aggregates: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { count: 1 },
    },
    dataQuality: {
      type: DataTypes.ENUM(...Object.values(DataQuality)),
      allowNull: false,
      defaultValue: DataQuality.HIGH,
      field: "data_quality",
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    sampleSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "sample_size",
    },
    seasonality: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    externalFactors: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "external_factors",
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
    dataSource: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "system_generated",
      field: "data_source",
    },
    sourceJobId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "source_job_id",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    modelName: "TimeSeriesMetrics",
    tableName: "time_series_metrics",
    schema: "analytics",
    timestamps: true,
    indexes: [
      // Time-based indexes (most critical for time series)
      {
        name: "idx_time_series_timestamp_metric",
        fields: ["timestamp", "metric_type", "aggregation_level"],
        using: "BTREE",
      },
      {
        name: "idx_time_series_metric_timestamp_desc",
        fields: ["metric_type", { name: "timestamp", order: "DESC" }],
        using: "BTREE",
      },
      
      // Dimensional indexes for segmentation
      {
        name: "idx_time_series_customer_metric_time",
        fields: ["customer_id", "metric_type", "timestamp"],
        where: { customer_id: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_time_series_route_metric_time",
        fields: ["route_id", "metric_type", "timestamp"],
        where: { route_id: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_time_series_vehicle_metric_time",
        fields: ["vehicle_id", "metric_type", "timestamp"],
        where: { vehicle_id: { [database.Sequelize.Op.ne]: null } },
      },
      
      // Composite indexes for common query patterns
      {
        name: "idx_time_series_type_level_quality",
        fields: ["metric_type", "aggregation_level", "data_quality"],
      },
      {
        name: "idx_time_series_region_zone_time",
        fields: ["region", "zone", "timestamp"],
        where: { 
          region: { [database.Sequelize.Op.ne]: null },
          zone: { [database.Sequelize.Op.ne]: null },
        },
      },
      
      // Seasonality index for pattern analysis
      {
        name: "idx_time_series_seasonality_gin",
        fields: ["seasonality"],
        using: "GIN",
      },
      
      // Aggregates index for statistical queries
      {
        name: "idx_time_series_aggregates_gin",
        fields: ["aggregates"],
        using: "GIN",
      },
      
      // Geographic index
      {
        name: "idx_time_series_service_area_gist",
        fields: ["service_area"],
        using: "GIST",
        where: { service_area: { [database.Sequelize.Op.ne]: null } },
      },
      
      // Data quality and forecasting suitability
      {
        name: "idx_time_series_forecastable",
        fields: ["metric_type", "data_quality", "confidence", "numeric_value"],
        where: {
          numeric_value: { [database.Sequelize.Op.ne]: null },
          confidence: { [database.Sequelize.Op.gte]: 0.7 },
        },
      },
    ],
    hooks: {
      beforeCreate: (metrics: TimeSeriesMetrics) => {
        // Auto-populate seasonality information
        const timestamp = metrics.timestamp;
        const dayOfWeek = timestamp.getDay() === 0 ? 7 : timestamp.getDay(); // Monday = 1, Sunday = 7
        const weekOfYear = getWeekOfYear(timestamp);
        const monthOfYear = timestamp.getMonth() + 1;
        const quarterOfYear = Math.ceil(monthOfYear / 3);
        const isWeekend = dayOfWeek >= 6;
        
        metrics.seasonality = {
          ...metrics.seasonality,
          dayOfWeek,
          weekOfYear,
          monthOfYear,
          quarterOfYear,
          isWeekend,
        };
      },
      beforeUpdate: (metrics: TimeSeriesMetrics) => {
        // Update seasonality if timestamp changed
        if (metrics.changed("timestamp")) {
          const timestamp = metrics.timestamp;
          const dayOfWeek = timestamp.getDay() === 0 ? 7 : timestamp.getDay();
          const weekOfYear = getWeekOfYear(timestamp);
          const monthOfYear = timestamp.getMonth() + 1;
          const quarterOfYear = Math.ceil(monthOfYear / 3);
          const isWeekend = dayOfWeek >= 6;
          
          metrics.seasonality = {
            ...metrics.seasonality,
            dayOfWeek,
            weekOfYear,
            monthOfYear,
            quarterOfYear,
            isWeekend,
          };
        }
      },
    },
  }
);

/**
 * Helper function to calculate week of year
 */
function getWeekOfYear(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.ceil(dayOfYear / 7);
}

// Define associations
TimeSeriesMetrics.belongsTo(Customer, { as: "customer", foreignKey: "customerId" });
TimeSeriesMetrics.belongsTo(Route, { as: "route", foreignKey: "routeId" });
TimeSeriesMetrics.belongsTo(Vehicle, { as: "vehicle", foreignKey: "vehicleId" });
TimeSeriesMetrics.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

export { TimeSeriesMetrics, MetricType, AggregationLevel, DataQuality };