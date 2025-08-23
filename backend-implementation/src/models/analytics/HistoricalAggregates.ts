/**
 * ============================================================================
 * HISTORICAL DATA AGGREGATES - MATERIALIZED VIEWS FOR PREDICTIVE ANALYTICS
 * ============================================================================
 *
 * Pre-computed historical aggregations optimized for Prophet + LightGBM forecasting.
 * Includes customer behavior patterns, seasonal trends, and operational metrics.
 *
 * Created by: Database Architect Agent
 * Coordination: Phase 3 Predictive Foundation (Session ID: coordination-session-phase3-parallel-011)
 * Date: 2025-08-19
 * Version: 1.0.0 - Historical Data Aggregation Views
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
import type { MetricType, AggregationLevel } from "./TimeSeriesMetrics";

/**
 * Customer behavior aggregation periods
 */
export enum BehaviorPeriod {
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  LAST_180_DAYS = "last_180_days",
  LAST_365_DAYS = "last_365_days",
  LIFETIME = "lifetime",
}

/**
 * Trend direction indicators
 */
export enum TrendDirection {
  INCREASING = "increasing",
  DECREASING = "decreasing",
  STABLE = "stable",
  VOLATILE = "volatile",
}

/**
 * Customer behavior aggregates for churn prediction
 */
export interface CustomerBehaviorAggregatesAttributes {
  id: string;
  customerId: ForeignKey<string>;
  
  // Aggregation metadata
  period: BehaviorPeriod;
  calculatedAt: Date;
  dataStartDate: Date;
  dataEndDate: Date;
  
  // Service pattern metrics
  serviceMetrics: {
    totalServices: number;
    avgServicesPerWeek: number;
    avgServicesPerMonth: number;
    serviceFrequencyTrend: TrendDirection;
    missedServiceCount: number;
    missedServiceRate: number;
    lastServiceDate?: Date;
    daysSinceLastService?: number;
  };
  
  // Volume and weight patterns
  volumeMetrics: {
    totalVolumeCollected: number;
    avgVolumePerService: number;
    volumeTrend: TrendDirection;
    volumeVariability: number; // coefficient of variation
    peakVolumeMonth?: number;
    lowVolumeMonth?: number;
  };
  
  // Financial metrics
  financialMetrics: {
    totalRevenue: number;
    avgRevenuePerService: number;
    revenueTrend: TrendDirection;
    paymentTimeliness: number; // 0-1 score
    outstandingBalance: number;
    lastPaymentDate?: Date;
  };
  
  // Customer satisfaction indicators
  satisfactionMetrics: {
    complaintCount: number;
    complaintRate: number; // complaints per service
    avgResolutionTime?: number; // in hours
    satisfactionScore?: number; // 1-5 if available
    positiveInteractions: number;
    negativeInteractions: number;
  };
  
  // Operational efficiency
  operationalMetrics: {
    avgServiceDuration: number;
    routeEfficiencyScore: number;
    driverConsistency: number; // same driver percentage
    vehicleUtilization: number;
    onTimeServiceRate: number;
  };
  
  // Seasonality patterns
  seasonalPatterns: {
    quarterlyVolumes: number[]; // Q1, Q2, Q3, Q4
    monthlyTrends: number[]; // 12 months
    weeklyPatterns: number[]; // 7 days
    holidayImpact: number; // percentage change during holidays
    seasonalityStrength: number; // 0-1
  };
  
  // Churn risk indicators
  churnIndicators: {
    riskScore: number; // 0-1 (1 = high risk)
    riskFactors: string[];
    behaviorChangeDate?: Date;
    engagementTrend: TrendDirection;
    contractExpiryDate?: Date;
    daysToExpiry?: number;
  };
  
  // Predictive features (for ML models)
  features: {
    recency: number; // days since last service
    frequency: number; // services per month
    monetary: number; // average monthly revenue
    tenure: number; // customer lifetime in days
    volatility: number; // service volume volatility
    growth: number; // revenue growth rate
    satisfaction: number; // normalized satisfaction score
    engagement: number; // interaction frequency
  };
  
  // Audit fields
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer behavior aggregates model
 */
export class CustomerBehaviorAggregates extends Model<
  InferAttributes<CustomerBehaviorAggregates>,
  InferCreationAttributes<CustomerBehaviorAggregates>
> {
  declare id: CreationOptional<string>;
  declare customerId: ForeignKey<string>;
  declare period: BehaviorPeriod;
  declare calculatedAt: Date;
  declare dataStartDate: Date;
  declare dataEndDate: Date;
  
  declare serviceMetrics: CustomerBehaviorAggregatesAttributes["serviceMetrics"];
  declare volumeMetrics: CustomerBehaviorAggregatesAttributes["volumeMetrics"];
  declare financialMetrics: CustomerBehaviorAggregatesAttributes["financialMetrics"];
  declare satisfactionMetrics: CustomerBehaviorAggregatesAttributes["satisfactionMetrics"];
  declare operationalMetrics: CustomerBehaviorAggregatesAttributes["operationalMetrics"];
  declare seasonalPatterns: CustomerBehaviorAggregatesAttributes["seasonalPatterns"];
  declare churnIndicators: CustomerBehaviorAggregatesAttributes["churnIndicators"];
  declare features: CustomerBehaviorAggregatesAttributes["features"];
  
  declare createdBy: ForeignKey<string> | null;
  declare updatedBy: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare customer?: NonAttribute<Customer>;
  declare creator?: NonAttribute<User>;
  declare updater?: NonAttribute<User>;
  
  /**
   * Get churn risk level
   */
  getChurnRiskLevel(): "low" | "medium" | "high" | "critical" {
    const riskScore = this.churnIndicators.riskScore;
    if (riskScore >= 0.8) return "critical";
    if (riskScore >= 0.6) return "high";
    if (riskScore >= 0.4) return "medium";
    return "low";
  }
  
  /**
   * Get customer lifetime value estimate
   */
  getLifetimeValueEstimate(): number {
    const monthlyRevenue = this.features.monetary;
    const tenureMonths = this.features.tenure / 30;
    const churnProbability = this.churnIndicators.riskScore;
    
    // Simple LTV calculation: Monthly Revenue / Churn Rate
    const expectedLifetimeMonths = 1 / Math.max(churnProbability, 0.01);
    return monthlyRevenue * expectedLifetimeMonths;
  }
  
  /**
   * Check if customer shows signs of growth
   */
  isGrowingCustomer(): boolean {
    return (
      this.volumeMetrics.volumeTrend === TrendDirection.INCREASING &&
      this.financialMetrics.revenueTrend === TrendDirection.INCREASING &&
      this.features.growth > 0.05 // 5% growth
    );
  }
  
  /**
   * Static method to calculate RFM scores for all customers
   */
  static async calculateRFMScores(
    period: BehaviorPeriod = BehaviorPeriod.LAST_365_DAYS
  ): Promise<Map<string, { recency: number; frequency: number; monetary: number; score: string }>> {
    const aggregates = await CustomerBehaviorAggregates.findAll({
      where: { period },
      include: [{ model: Customer, as: "customer" }],
    });
    
    if (aggregates.length === 0) return new Map();
    
    // Extract RFM values
    const rfmData = aggregates.map(agg => ({
      customerId: agg.customerId,
      recency: agg.features.recency,
      frequency: agg.features.frequency,
      monetary: agg.features.monetary,
    }));
    
    // Calculate quintiles for scoring
    const recencyValues = rfmData.map(d => d.recency).sort((a, b) => a - b);
    const frequencyValues = rfmData.map(d => d.frequency).sort((a, b) => b - a);
    const monetaryValues = rfmData.map(d => d.monetary).sort((a, b) => b - a);
    
    const getQuintile = (value: number, sortedValues: number[], reverse = false): number => {
      const index = sortedValues.findIndex(v => (reverse ? v <= value : v >= value));
      return Math.ceil(((index + 1) / sortedValues.length) * 5);
    };
    
    const results = new Map();
    
    rfmData.forEach(data => {
      const rScore = getQuintile(data.recency, recencyValues, true); // Lower recency = higher score
      const fScore = getQuintile(data.frequency, frequencyValues);
      const mScore = getQuintile(data.monetary, monetaryValues);
      
      // RFM segment classification
      let segment = "";
      if (rScore >= 4 && fScore >= 4) segment = "Champions";
      else if (rScore >= 3 && fScore >= 3) segment = "Loyal Customers";
      else if (rScore >= 4 && fScore <= 2) segment = "New Customers";
      else if (rScore >= 3 && fScore <= 2) segment = "Potential Loyalists";
      else if (rScore <= 2 && fScore >= 3) segment = "At Risk";
      else if (rScore <= 2 && fScore <= 2 && mScore >= 3) segment = "Cannot Lose Them";
      else if (rScore <= 2 && fScore <= 2 && mScore <= 2) segment = "Lost";
      else segment = "Others";
      
      results.set(data.customerId, {
        recency: rScore,
        frequency: fScore,
        monetary: mScore,
        score: `${rScore}${fScore}${mScore}`,
        segment,
      });
    });
    
    return results;
  }
}

/**
 * Operational metrics aggregates for route and fleet optimization
 */
export interface OperationalMetricsAggregatesAttributes {
  id: string;
  
  // Aggregation scope
  aggregationType: "route" | "vehicle" | "driver" | "zone" | "global";
  entityId?: string; // ID of route, vehicle, driver, or zone
  period: AggregationLevel;
  periodStart: Date;
  periodEnd: Date;
  
  // Route performance metrics
  routeMetrics: {
    totalRoutes: number;
    avgRouteDuration: number;
    avgRouteDistance: number;
    avgStopsPerRoute: number;
    onTimeCompletionRate: number;
    fuelEfficiency: number;
    costPerMile: number;
    customerSatisfactionScore?: number;
  };
  
  // Vehicle utilization metrics
  vehicleMetrics: {
    totalVehicles: number;
    avgUtilizationRate: number;
    avgMaintenanceCost: number;
    breakdownCount: number;
    avgRepairTime: number;
    fuelConsumption: number;
    emissionsPerMile: number;
    vehicleLifetime: number;
  };
  
  // Driver performance metrics
  driverMetrics: {
    totalDrivers: number;
    avgEfficiencyScore: number;
    avgHoursWorked: number;
    safetyIncidentCount: number;
    customerRatingAvg?: number;
    trainingHoursCompleted: number;
    overtimeRate: number;
    turnoverRate: number;
  };
  
  // Service quality metrics
  qualityMetrics: {
    serviceCompletionRate: number;
    avgServiceTime: number;
    customerComplaintRate: number;
    firstTimeFixRate: number;
    serviceAccuracyRate: number;
    avgResponseTime: number;
    qualityScore: number;
  };
  
  // Financial performance
  financialMetrics: {
    totalRevenue: number;
    totalCosts: number;
    profitMargin: number;
    costPerCustomer: number;
    revenuePerMile: number;
    avgContractValue: number;
    collectionEfficiency: number;
  };
  
  // Environmental impact
  environmentalMetrics: {
    totalEmissions: number;
    emissionsPerCustomer: number;
    recyclingRate: number;
    wasteDispersionRate: number;
    fuelConsumptionRate: number;
    carbonFootprint: number;
  };
  
  // Predictive indicators
  predictiveIndicators: {
    demandForecast: number;
    capacityUtilization: number;
    maintenanceRisk: number;
    growthPotential: number;
    seasonalityIndex: number;
    volatilityScore: number;
  };
  
  // Audit fields
  calculatedAt: Date;
  dataQuality: number; // 0-1 score
  createdBy?: ForeignKey<string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Operational metrics aggregates model
 */
export class OperationalMetricsAggregates extends Model<
  InferAttributes<OperationalMetricsAggregates>,
  InferCreationAttributes<OperationalMetricsAggregates>
> {
  declare id: CreationOptional<string>;
  declare aggregationType: "route" | "vehicle" | "driver" | "zone" | "global";
  declare entityId: string | null;
  declare period: AggregationLevel;
  declare periodStart: Date;
  declare periodEnd: Date;
  
  declare routeMetrics: OperationalMetricsAggregatesAttributes["routeMetrics"];
  declare vehicleMetrics: OperationalMetricsAggregatesAttributes["vehicleMetrics"];
  declare driverMetrics: OperationalMetricsAggregatesAttributes["driverMetrics"];
  declare qualityMetrics: OperationalMetricsAggregatesAttributes["qualityMetrics"];
  declare financialMetrics: OperationalMetricsAggregatesAttributes["financialMetrics"];
  declare environmentalMetrics: OperationalMetricsAggregatesAttributes["environmentalMetrics"];
  declare predictiveIndicators: OperationalMetricsAggregatesAttributes["predictiveIndicators"];
  
  declare calculatedAt: Date;
  declare dataQuality: number;
  declare createdBy: ForeignKey<string> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare creator?: NonAttribute<User>;
  
  /**
   * Get overall performance score (0-100)
   */
  getPerformanceScore(): number {
    const weights = {
      efficiency: 0.25,
      quality: 0.25,
      financial: 0.25,
      environmental: 0.25,
    };
    
    const efficiencyScore = (
      this.routeMetrics.onTimeCompletionRate * 0.4 +
      this.vehicleMetrics.avgUtilizationRate * 0.3 +
      this.driverMetrics.avgEfficiencyScore * 0.3
    ) * 100;
    
    const qualityScore = (
      this.qualityMetrics.serviceCompletionRate * 0.4 +
      this.qualityMetrics.firstTimeFixRate * 0.3 +
      this.qualityMetrics.qualityScore * 0.3
    ) * 100;
    
    const financialScore = Math.min(this.financialMetrics.profitMargin * 10, 100);
    
    const environmentalScore = (
      this.environmentalMetrics.recyclingRate * 0.6 +
      (1 - Math.min(this.environmentalMetrics.emissionsPerCustomer / 100, 1)) * 0.4
    ) * 100;
    
    return (
      efficiencyScore * weights.efficiency +
      qualityScore * weights.quality +
      financialScore * weights.financial +
      environmentalScore * weights.environmental
    );
  }
  
  /**
   * Identify optimization opportunities
   */
  getOptimizationOpportunities(): Array<{ area: string; potential: number; priority: "high" | "medium" | "low" }> {
    const opportunities = [];
    
    // Route optimization opportunities
    if (this.routeMetrics.onTimeCompletionRate < 0.9) {
      opportunities.push({
        area: "Route Scheduling",
        potential: (0.9 - this.routeMetrics.onTimeCompletionRate) * 100,
        priority: "high" as const,
      });
    }
    
    // Vehicle utilization
    if (this.vehicleMetrics.avgUtilizationRate < 0.8) {
      opportunities.push({
        area: "Vehicle Utilization",
        potential: (0.8 - this.vehicleMetrics.avgUtilizationRate) * 100,
        priority: "high" as const,
      });
    }
    
    // Fuel efficiency
    if (this.routeMetrics.fuelEfficiency < 8) { // MPG threshold
      opportunities.push({
        area: "Fuel Efficiency",
        potential: ((8 - this.routeMetrics.fuelEfficiency) / 8) * 100,
        priority: "medium" as const,
      });
    }
    
    // Customer satisfaction
    if (this.routeMetrics.customerSatisfactionScore && this.routeMetrics.customerSatisfactionScore < 4.0) {
      opportunities.push({
        area: "Customer Satisfaction",
        potential: ((4.0 - this.routeMetrics.customerSatisfactionScore) / 4.0) * 100,
        priority: "high" as const,
      });
    }
    
    return opportunities.sort((a, b) => b.potential - a.potential);
  }
  
  /**
   * Static method to get trend analysis
   */
  static async getTrendAnalysis(
    aggregationType: string,
    entityId?: string,
    periods: number = 12
  ): Promise<{
    metrics: string[];
    trends: Array<{ metric: string; direction: TrendDirection; changePercent: number }>;
  }> {
    const whereClause: any = { aggregationType };
    if (entityId) whereClause.entityId = entityId;
    
    const recentData = await OperationalMetricsAggregates.findAll({
      where: whereClause,
      order: [["periodStart", "DESC"]],
      limit: periods,
    });
    
    if (recentData.length < 2) {
      return { metrics: [], trends: [] };
    }
    
    const latest = recentData[0];
    const previous = recentData[Math.min(periods - 1, recentData.length - 1)];
    
    const trends = [];
    const metrics = ["onTimeCompletionRate", "profitMargin", "serviceCompletionRate", "recyclingRate"];
    
    metrics.forEach(metric => {
      const currentValue = getNestedValue(latest, metric);
      const previousValue = getNestedValue(previous, metric);
      
      if (currentValue !== null && previousValue !== null && previousValue !== 0) {
        const changePercent = ((currentValue - previousValue) / previousValue) * 100;
        let direction: TrendDirection = TrendDirection.STABLE;
        
        if (Math.abs(changePercent) > 10) {
          direction = TrendDirection.VOLATILE;
        } else if (changePercent > 2) {
          direction = TrendDirection.INCREASING;
        } else if (changePercent < -2) {
          direction = TrendDirection.DECREASING;
        }
        
        trends.push({ metric, direction, changePercent });
      }
    });
    
    return { metrics, trends };
  }
}

/**
 * Helper function to get nested object values
 */
function getNestedValue(obj: any, path: string): number | null {
  // Simple implementation for known paths
  switch (path) {
    case "onTimeCompletionRate":
      return obj.routeMetrics?.onTimeCompletionRate || null;
    case "profitMargin":
      return obj.financialMetrics?.profitMargin || null;
    case "serviceCompletionRate":
      return obj.qualityMetrics?.serviceCompletionRate || null;
    case "recyclingRate":
      return obj.environmentalMetrics?.recyclingRate || null;
    default:
      return null;
  }
}

/**
 * Initialize models
 */
CustomerBehaviorAggregates.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    period: {
      type: DataTypes.ENUM(...Object.values(BehaviorPeriod)),
      allowNull: false,
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "calculated_at",
    },
    dataStartDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_start_date",
    },
    dataEndDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_end_date",
    },
    serviceMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "service_metrics",
    },
    volumeMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "volume_metrics",
    },
    financialMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "financial_metrics",
    },
    satisfactionMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "satisfaction_metrics",
    },
    operationalMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "operational_metrics",
    },
    seasonalPatterns: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "seasonal_patterns",
    },
    churnIndicators: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "churn_indicators",
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
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
    modelName: "CustomerBehaviorAggregates",
    tableName: "customer_behavior_aggregates",
    schema: "analytics",
    timestamps: true,
    indexes: [
      {
        name: "idx_customer_behavior_customer_period",
        fields: ["customer_id", "period"],
        unique: true,
      },
      {
        name: "idx_customer_behavior_calculated_at",
        fields: ["calculated_at"],
      },
      {
        name: "idx_customer_behavior_churn_risk",
        fields: [database.literal("(churn_indicators->>'riskScore')::numeric DESC")],
      },
      {
        name: "idx_customer_behavior_features_gin",
        fields: ["features"],
        using: "GIN",
      },
    ],
  }
);

OperationalMetricsAggregates.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    aggregationType: {
      type: DataTypes.ENUM("route", "vehicle", "driver", "zone", "global"),
      allowNull: false,
      field: "aggregation_type",
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "entity_id",
    },
    period: {
      type: DataTypes.ENUM(...Object.values(AggregationLevel)),
      allowNull: false,
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
    routeMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "route_metrics",
    },
    vehicleMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "vehicle_metrics",
    },
    driverMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "driver_metrics",
    },
    qualityMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "quality_metrics",
    },
    financialMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "financial_metrics",
    },
    environmentalMetrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "environmental_metrics",
    },
    predictiveIndicators: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "predictive_indicators",
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "calculated_at",
    },
    dataQuality: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.0,
      field: "data_quality",
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
    modelName: "OperationalMetricsAggregates",
    tableName: "operational_metrics_aggregates",
    schema: "analytics",
    timestamps: true,
    indexes: [
      {
        name: "idx_operational_metrics_type_entity_period",
        fields: ["aggregation_type", "entity_id", "period", "period_start"],
      },
      {
        name: "idx_operational_metrics_period_range",
        fields: ["period_start", "period_end"],
      },
      {
        name: "idx_operational_metrics_calculated_at",
        fields: ["calculated_at"],
      },
      {
        name: "idx_operational_metrics_financial_gin",
        fields: ["financial_metrics"],
        using: "GIN",
      },
      {
        name: "idx_operational_metrics_predictive_gin",
        fields: ["predictive_indicators"],
        using: "GIN",
      },
    ],
  }
);

// Define associations
CustomerBehaviorAggregates.belongsTo(Customer, { as: "customer", foreignKey: "customerId" });
CustomerBehaviorAggregates.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
CustomerBehaviorAggregates.belongsTo(User, { as: "updater", foreignKey: "updatedBy" });

OperationalMetricsAggregates.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

export {
  CustomerBehaviorAggregates,
  OperationalMetricsAggregates,
  BehaviorPeriod,
  TrendDirection,
};