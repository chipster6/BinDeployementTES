/**
 * ============================================================================
 * PREDICTIVE MODELS STORAGE - ENHANCED ML MODEL LIFECYCLE MANAGEMENT
 * ============================================================================
 *
 * Advanced predictive model storage with Prophet + LightGBM optimization.
 * Includes model versioning, feature stores, and performance tracking.
 *
 * Created by: Database Architect Agent
 * Coordination: Phase 3 Predictive Foundation (Session ID: coordination-session-phase3-parallel-011)
 * Date: 2025-08-19
 * Version: 1.0.0 - Predictive Model Storage Design
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
import { MLModel } from "../MLModel";

/**
 * Prediction model types for waste management
 */
export enum PredictionModelType {
  // Demand forecasting
  WASTE_VOLUME_FORECAST = "waste_volume_forecast",
  SERVICE_DEMAND_FORECAST = "service_demand_forecast",
  SEASONAL_DEMAND_FORECAST = "seasonal_demand_forecast",
  
  // Customer analytics
  CHURN_PREDICTION = "churn_prediction",
  CUSTOMER_LIFETIME_VALUE = "customer_lifetime_value",
  SATISFACTION_PREDICTION = "satisfaction_prediction",
  
  // Operational optimization
  ROUTE_OPTIMIZATION = "route_optimization",
  VEHICLE_MAINTENANCE_PREDICTION = "vehicle_maintenance_prediction",
  DRIVER_PERFORMANCE_PREDICTION = "driver_performance_prediction",
  
  // Financial forecasting
  REVENUE_FORECAST = "revenue_forecast",
  COST_PREDICTION = "cost_prediction",
  PROFIT_OPTIMIZATION = "profit_optimization",
  
  // Environmental impact
  CARBON_EMISSION_PREDICTION = "carbon_emission_prediction",
  RECYCLING_RATE_FORECAST = "recycling_rate_forecast",
  WASTE_REDUCTION_POTENTIAL = "waste_reduction_potential",
}

/**
 * Model algorithm types
 */
export enum ModelAlgorithm {
  PROPHET = "prophet",
  LIGHTGBM = "lightgbm",
  XGBOOST = "xgboost",
  LSTM = "lstm",
  ARIMA = "arima",
  LINEAR_REGRESSION = "linear_regression",
  RANDOM_FOREST = "random_forest",
  ENSEMBLE = "ensemble",
}

/**
 * Prediction horizon types
 */
export enum PredictionHorizon {
  REAL_TIME = "real_time",        // < 1 hour
  SHORT_TERM = "short_term",      // 1 hour - 1 day
  MEDIUM_TERM = "medium_term",    // 1 day - 1 week
  LONG_TERM = "long_term",        // 1 week - 1 month
  STRATEGIC = "strategic",        // > 1 month
}

/**
 * Feature store for ML model inputs
 */
export interface ModelFeatureStoreAttributes {
  id: string;
  
  // Feature identification
  featureName: string;
  featureVersion: string;
  featureType: "numerical" | "categorical" | "boolean" | "text" | "datetime" | "geospatial";
  
  // Feature metadata
  description: string;
  unit?: string;
  dataSource: string;
  
  // Feature engineering
  computation: {
    query?: string;
    aggregation?: string;
    transformation?: string;
    windowSize?: number;
    dependencies?: string[];
  };
  
  // Data quality metrics
  quality: {
    completeness: number;     // 0-1
    accuracy: number;         // 0-1
    consistency: number;      // 0-1
    timeliness: number;       // 0-1
    lastValidated: Date;
  };
  
  // Statistical properties
  statistics: {
    count: number;
    mean?: number;
    median?: number;
    standardDeviation?: number;
    minimum?: number;
    maximum?: number;
    percentiles?: number[];
    distinctValues?: number;
    nullCount: number;
    outlierCount?: number;
  };
  
  // Value distribution (for categorical)
  valueDistribution?: Array<{
    value: string | number;
    count: number;
    percentage: number;
  }>;
  
  // Temporal properties
  temporalInfo: {
    updateFrequency: "real_time" | "hourly" | "daily" | "weekly" | "monthly";
    latestUpdate: Date;
    historicalRange: {
      startDate: Date;
      endDate: Date;
    };
    seasonalPattern?: boolean;
    trendPattern?: "increasing" | "decreasing" | "stable" | "cyclical";
  };
  
  // Model usage tracking
  modelUsage: {
    activeModels: string[];
    usageCount: number;
    lastUsed: Date;
    performanceImpact: number; // Feature importance average across models
  };
  
  // Audit fields
  createdBy: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Model feature store model
 */
export class ModelFeatureStore extends Model<
  InferAttributes<ModelFeatureStore>,
  InferCreationAttributes<ModelFeatureStore>
> {
  declare id: CreationOptional<string>;
  declare featureName: string;
  declare featureVersion: string;
  declare featureType: "numerical" | "categorical" | "boolean" | "text" | "datetime" | "geospatial";
  declare description: string;
  declare unit: string | null;
  declare dataSource: string;
  
  declare computation: ModelFeatureStoreAttributes["computation"];
  declare quality: ModelFeatureStoreAttributes["quality"];
  declare statistics: ModelFeatureStoreAttributes["statistics"];
  declare valueDistribution: ModelFeatureStoreAttributes["valueDistribution"];
  declare temporalInfo: ModelFeatureStoreAttributes["temporalInfo"];
  declare modelUsage: ModelFeatureStoreAttributes["modelUsage"];
  
  declare createdBy: ForeignKey<string>;
  declare updatedBy: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare isActive: boolean;
  
  // Associations
  declare creator?: NonAttribute<User>;
  declare updater?: NonAttribute<User>;
  
  /**
   * Check if feature is ready for production use
   */
  isProductionReady(): boolean {
    return (
      this.isActive &&
      this.quality.completeness >= 0.95 &&
      this.quality.accuracy >= 0.9 &&
      this.quality.consistency >= 0.9 &&
      this.statistics.nullCount / this.statistics.count < 0.05
    );
  }
  
  /**
   * Get feature quality score (0-100)
   */
  getQualityScore(): number {
    const weights = {
      completeness: 0.3,
      accuracy: 0.3,
      consistency: 0.2,
      timeliness: 0.2,
    };
    
    return (
      this.quality.completeness * weights.completeness +
      this.quality.accuracy * weights.accuracy +
      this.quality.consistency * weights.consistency +
      this.quality.timeliness * weights.timeliness
    ) * 100;
  }
  
  /**
   * Update feature statistics
   */
  async updateStatistics(newStats: Partial<ModelFeatureStoreAttributes["statistics"]>): Promise<void> {
    this.statistics = {
      ...this.statistics,
      ...newStats,
    };
    
    // Update temporal info
    this.temporalInfo = {
      ...this.temporalInfo,
      latestUpdate: new Date(),
    };
    
    await this.save();
  }
}

/**
 * Model predictions with enhanced tracking
 */
export interface ModelPredictionResultsAttributes {
  id: string;
  
  // Model reference
  modelId: ForeignKey<string>;
  predictionModelType: PredictionModelType;
  modelVersion: string;
  
  // Prediction metadata
  predictionId: string;
  predictionHorizon: PredictionHorizon;
  targetDate: Date;
  predictionMadeAt: Date;
  
  // Input features (versioned)
  inputFeatures: {
    featureVector: Record<string, any>;
    featureVersions: Record<string, string>;
    dataQuality: number;
    completeness: number;
  };
  
  // Prediction results
  predictions: {
    pointEstimate: number;
    confidenceInterval: {
      lower: number;
      upper: number;
      confidence: number; // e.g., 0.95 for 95% CI
    };
    probabilityDistribution?: Array<{
      value: number;
      probability: number;
    }>;
    seasonalComponents?: {
      trend: number;
      seasonal: number;
      holiday: number;
      residual: number;
    };
  };
  
  // Model performance
  performance: {
    executionTime: number;    // milliseconds
    memoryUsage?: number;     // MB
    computeCost?: number;     // dollars
    fallbackUsed: boolean;
    cacheHit: boolean;
  };
  
  // Prediction context
  context: {
    customerId?: string;
    routeId?: string;
    vehicleId?: string;
    geographicRegion?: string;
    externalFactors?: Record<string, any>;
    businessContext?: Record<string, any>;
  };
  
  // Actual outcome (for model evaluation)
  actualOutcome?: {
    actualValue: number;
    observedAt: Date;
    absoluteError?: number;
    percentageError?: number;
    withinConfidenceInterval?: boolean;
  };
  
  // Feedback and adjustments
  feedback?: {
    userFeedback?: number;    // 1-5 rating
    businessOutcome?: string;
    adjustmentsMade?: Record<string, any>;
    feedbackTimestamp?: Date;
  };
  
  // Audit fields
  createdBy?: ForeignKey<string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model prediction results model
 */
export class ModelPredictionResults extends Model<
  InferAttributes<ModelPredictionResults>,
  InferCreationAttributes<ModelPredictionResults>
> {
  declare id: CreationOptional<string>;
  declare modelId: ForeignKey<string>;
  declare predictionModelType: PredictionModelType;
  declare modelVersion: string;
  declare predictionId: string;
  declare predictionHorizon: PredictionHorizon;
  declare targetDate: Date;
  declare predictionMadeAt: Date;
  
  declare inputFeatures: ModelPredictionResultsAttributes["inputFeatures"];
  declare predictions: ModelPredictionResultsAttributes["predictions"];
  declare performance: ModelPredictionResultsAttributes["performance"];
  declare context: ModelPredictionResultsAttributes["context"];
  declare actualOutcome: ModelPredictionResultsAttributes["actualOutcome"];
  declare feedback: ModelPredictionResultsAttributes["feedback"];
  
  declare createdBy: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare model?: NonAttribute<MLModel>;
  declare creator?: NonAttribute<User>;
  
  /**
   * Check if prediction is accurate (within confidence interval)
   */
  isAccurate(): boolean | null {
    if (!this.actualOutcome) return null;
    
    const { actualValue } = this.actualOutcome;
    const { lower, upper } = this.predictions.confidenceInterval;
    
    return actualValue >= lower && actualValue <= upper;
  }
  
  /**
   * Calculate prediction error metrics
   */
  getErrorMetrics(): {
    absoluteError: number;
    percentageError: number;
    withinCI: boolean;
  } | null {
    if (!this.actualOutcome) return null;
    
    const actual = this.actualOutcome.actualValue;
    const predicted = this.predictions.pointEstimate;
    
    const absoluteError = Math.abs(actual - predicted);
    const percentageError = Math.abs((actual - predicted) / actual) * 100;
    const withinCI = this.isAccurate() || false;
    
    return { absoluteError, percentageError, withinCI };
  }
  
  /**
   * Update with actual outcome
   */
  async recordActualOutcome(
    actualValue: number,
    observedAt: Date = new Date()
  ): Promise<void> {
    const absoluteError = Math.abs(actualValue - this.predictions.pointEstimate);
    const percentageError = this.predictions.pointEstimate !== 0 
      ? Math.abs((actualValue - this.predictions.pointEstimate) / this.predictions.pointEstimate) * 100
      : 0;
    
    const withinConfidenceInterval = 
      actualValue >= this.predictions.confidenceInterval.lower &&
      actualValue <= this.predictions.confidenceInterval.upper;
    
    this.actualOutcome = {
      actualValue,
      observedAt,
      absoluteError,
      percentageError,
      withinConfidenceInterval,
    };
    
    await this.save();
  }
  
  /**
   * Static method to calculate model accuracy metrics
   */
  static async calculateModelAccuracy(
    modelId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalPredictions: number;
    predictionsWithActuals: number;
    accuracyRate: number;
    meanAbsoluteError: number;
    meanAbsolutePercentageError: number;
    withinCIRate: number;
  }> {
    const predictions = await ModelPredictionResults.findAll({
      where: {
        modelId,
        predictionMadeAt: {
          [database.Sequelize.Op.between]: [timeRange.start, timeRange.end],
        },
      },
    });
    
    const predictionsWithActuals = predictions.filter(p => p.actualOutcome);
    
    if (predictionsWithActuals.length === 0) {
      return {
        totalPredictions: predictions.length,
        predictionsWithActuals: 0,
        accuracyRate: 0,
        meanAbsoluteError: 0,
        meanAbsolutePercentageError: 0,
        withinCIRate: 0,
      };
    }
    
    const errors = predictionsWithActuals.map(p => p.getErrorMetrics()!);
    const withinCICount = errors.filter(e => e.withinCI).length;
    
    const meanAbsoluteError = errors.reduce((sum, e) => sum + e.absoluteError, 0) / errors.length;
    const meanAbsolutePercentageError = errors.reduce((sum, e) => sum + e.percentageError, 0) / errors.length;
    
    return {
      totalPredictions: predictions.length,
      predictionsWithActuals: predictionsWithActuals.length,
      accuracyRate: (predictionsWithActuals.length / predictions.length) * 100,
      meanAbsoluteError,
      meanAbsolutePercentageError,
      withinCIRate: (withinCICount / predictionsWithActuals.length) * 100,
    };
  }
}

/**
 * Model performance tracking over time
 */
export interface ModelPerformanceTrackingAttributes {
  id: string;
  
  // Model identification
  modelId: ForeignKey<string>;
  trackingPeriod: "hourly" | "daily" | "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  
  // Performance metrics
  metrics: {
    totalPredictions: number;
    predictionsWithActuals: number;
    accuracyRate: number;
    meanAbsoluteError: number;
    meanAbsolutePercentageError: number;
    withinConfidenceIntervalRate: number;
    averageExecutionTime: number;
    averageMemoryUsage: number;
    cacheHitRate: number;
    fallbackUsageRate: number;
  };
  
  // Drift detection
  drift: {
    featureDrift: Record<string, number>;
    conceptDrift: number;
    performanceDrift: number;
    dataQualityDrift: number;
    driftDetected: boolean;
    driftThreshold: number;
  };
  
  // Business impact
  businessImpact: {
    decisionsInfluenced: number;
    estimatedValueGenerated: number;
    costSavings: number;
    userSatisfactionScore?: number;
    businessOutcomes: Record<string, any>;
  };
  
  // Recommendations
  recommendations: {
    retrainRequired: boolean;
    retrainUrgency: "low" | "medium" | "high" | "critical";
    featureUpdatesNeeded: string[];
    performanceOptimizations: string[];
    businessActions: string[];
  };
  
  // Audit fields
  calculatedAt: Date;
  createdBy?: ForeignKey<string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model performance tracking model
 */
export class ModelPerformanceTracking extends Model<
  InferAttributes<ModelPerformanceTracking>,
  InferCreationAttributes<ModelPerformanceTracking>
> {
  declare id: CreationOptional<string>;
  declare modelId: ForeignKey<string>;
  declare trackingPeriod: "hourly" | "daily" | "weekly" | "monthly";
  declare periodStart: Date;
  declare periodEnd: Date;
  
  declare metrics: ModelPerformanceTrackingAttributes["metrics"];
  declare drift: ModelPerformanceTrackingAttributes["drift"];
  declare businessImpact: ModelPerformanceTrackingAttributes["businessImpact"];
  declare recommendations: ModelPerformanceTrackingAttributes["recommendations"];
  
  declare calculatedAt: Date;
  declare createdBy: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare model?: NonAttribute<MLModel>;
  declare creator?: NonAttribute<User>;
  
  /**
   * Get overall model health score (0-100)
   */
  getHealthScore(): number {
    const weights = {
      accuracy: 0.4,
      performance: 0.2,
      drift: 0.2,
      businessImpact: 0.2,
    };
    
    // Accuracy score (based on confidence interval rate)
    const accuracyScore = Math.min(this.metrics.withinConfidenceIntervalRate, 100);
    
    // Performance score (based on execution time and cache hit rate)
    const performanceScore = (
      Math.min(100, 1000 / this.metrics.averageExecutionTime) * 0.5 +
      this.metrics.cacheHitRate * 0.5
    );
    
    // Drift score (inverted - lower drift is better)
    const driftScore = Math.max(0, 100 - (this.drift.performanceDrift * 100));
    
    // Business impact score (normalized)
    const businessScore = Math.min(100, this.businessImpact.estimatedValueGenerated / 1000);
    
    return (
      accuracyScore * weights.accuracy +
      performanceScore * weights.performance +
      driftScore * weights.drift +
      businessScore * weights.businessImpact
    );
  }
  
  /**
   * Determine if model needs immediate attention
   */
  needsAttention(): {
    urgent: boolean;
    reasons: string[];
    priority: "low" | "medium" | "high" | "critical";
  } {
    const reasons = [];
    let priority: "low" | "medium" | "high" | "critical" = "low";
    
    // Check accuracy degradation
    if (this.metrics.withinConfidenceIntervalRate < 70) {
      reasons.push("Low prediction accuracy");
      priority = "high";
    }
    
    // Check drift
    if (this.drift.driftDetected) {
      reasons.push("Model drift detected");
      if (this.drift.performanceDrift > 0.3) {
        priority = "critical";
      } else {
        priority = "high";
      }
    }
    
    // Check performance
    if (this.metrics.averageExecutionTime > 5000) { // 5 seconds
      reasons.push("Slow prediction performance");
      priority = priority === "critical" ? "critical" : "medium";
    }
    
    // Check fallback usage
    if (this.metrics.fallbackUsageRate > 20) {
      reasons.push("High fallback usage rate");
      priority = priority === "critical" ? "critical" : "medium";
    }
    
    // Check retrain recommendation
    if (this.recommendations.retrainRequired && this.recommendations.retrainUrgency === "critical") {
      reasons.push("Critical retrain required");
      priority = "critical";
    }
    
    return {
      urgent: reasons.length > 0,
      reasons,
      priority,
    };
  }
}

/**
 * Initialize models
 */
ModelFeatureStore.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    featureName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "feature_name",
    },
    featureVersion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "feature_version",
    },
    featureType: {
      type: DataTypes.ENUM("numerical", "categorical", "boolean", "text", "datetime", "geospatial"),
      allowNull: false,
      field: "feature_type",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    dataSource: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "data_source",
    },
    computation: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    quality: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    statistics: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    valueDistribution: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "value_distribution",
    },
    temporalInfo: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "temporal_info",
    },
    modelUsage: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "model_usage",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
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
    modelName: "ModelFeatureStore",
    tableName: "model_feature_store",
    schema: "analytics",
    timestamps: true,
    indexes: [
      {
        name: "idx_feature_store_name_version",
        fields: ["feature_name", "feature_version"],
        unique: true,
      },
      {
        name: "idx_feature_store_type_active",
        fields: ["feature_type", "is_active"],
      },
      {
        name: "idx_feature_store_usage_gin",
        fields: ["model_usage"],
        using: "GIN",
      },
      {
        name: "idx_feature_store_quality_gin",
        fields: ["quality"],
        using: "GIN",
      },
      {
        name: "idx_feature_store_temporal_gin",
        fields: ["temporal_info"],
        using: "GIN",
      },
    ],
  }
);

ModelPredictionResults.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "model_id",
      references: {
        model: "ml_models",
        key: "id",
      },
    },
    predictionModelType: {
      type: DataTypes.ENUM(...Object.values(PredictionModelType)),
      allowNull: false,
      field: "prediction_model_type",
    },
    modelVersion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "model_version",
    },
    predictionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "prediction_id",
    },
    predictionHorizon: {
      type: DataTypes.ENUM(...Object.values(PredictionHorizon)),
      allowNull: false,
      field: "prediction_horizon",
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "target_date",
    },
    predictionMadeAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "prediction_made_at",
    },
    inputFeatures: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "input_features",
    },
    predictions: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    performance: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    actualOutcome: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "actual_outcome",
    },
    feedback: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    modelName: "ModelPredictionResults",
    tableName: "model_prediction_results",
    schema: "analytics",
    timestamps: true,
    indexes: [
      {
        name: "idx_prediction_results_model_target",
        fields: ["model_id", "target_date"],
      },
      {
        name: "idx_prediction_results_type_horizon",
        fields: ["prediction_model_type", "prediction_horizon"],
      },
      {
        name: "idx_prediction_results_made_at",
        fields: ["prediction_made_at"],
      },
      {
        name: "idx_prediction_results_context_gin",
        fields: ["context"],
        using: "GIN",
      },
      {
        name: "idx_prediction_results_actual_outcome",
        fields: [database.literal("(actual_outcome IS NOT NULL)")],
        where: { actual_outcome: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_prediction_results_performance_gin",
        fields: ["performance"],
        using: "GIN",
      },
    ],
  }
);

ModelPerformanceTracking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "model_id",
      references: {
        model: "ml_models",
        key: "id",
      },
    },
    trackingPeriod: {
      type: DataTypes.ENUM("hourly", "daily", "weekly", "monthly"),
      allowNull: false,
      field: "tracking_period",
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "period_start",
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "period_end",
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    drift: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    businessImpact: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "business_impact",
    },
    recommendations: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "calculated_at",
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
    modelName: "ModelPerformanceTracking",
    tableName: "model_performance_tracking",
    schema: "analytics",
    timestamps: true,
    indexes: [
      {
        name: "idx_performance_tracking_model_period",
        fields: ["model_id", "tracking_period", "period_start"],
      },
      {
        name: "idx_performance_tracking_calculated_at",
        fields: ["calculated_at"],
      },
      {
        name: "idx_performance_tracking_drift_gin",
        fields: ["drift"],
        using: "GIN",
      },
      {
        name: "idx_performance_tracking_metrics_gin",
        fields: ["metrics"],
        using: "GIN",
      },
      {
        name: "idx_performance_tracking_recommendations_gin",
        fields: ["recommendations"],
        using: "GIN",
      },
    ],
  }
);

// Define associations
ModelFeatureStore.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
ModelFeatureStore.belongsTo(User, { as: "updater", foreignKey: "updatedBy" });

ModelPredictionResults.belongsTo(MLModel, { as: "model", foreignKey: "modelId" });
ModelPredictionResults.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

ModelPerformanceTracking.belongsTo(MLModel, { as: "model", foreignKey: "modelId" });
ModelPerformanceTracking.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

export {
  ModelFeatureStore,
  ModelPredictionResults,
  ModelPerformanceTracking,
  PredictionModelType,
  ModelAlgorithm,
  PredictionHorizon,
};