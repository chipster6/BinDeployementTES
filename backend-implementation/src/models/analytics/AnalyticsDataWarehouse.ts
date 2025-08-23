/**
 * ============================================================================
 * ANALYTICS DATA WAREHOUSE - ENTERPRISE BUSINESS INTELLIGENCE MODELS
 * ============================================================================
 *
 * Comprehensive analytics data warehouse models designed for enterprise-grade
 * business intelligence, real-time analytics, and advanced reporting.
 *
 * COORDINATION SESSION: advanced-analytics-database-architecture
 * CREATED BY: Database-Architect Agent
 * DATE: 2025-08-20
 * VERSION: 1.0.0 - Enterprise Analytics Foundation
 *
 * PERFORMANCE TARGETS:
 * - Sub-second dashboard queries via materialized views
 * - Real-time analytics processing <100ms data ingestion
 * - Historical analysis <5 seconds for 2-year datasets
 * - Concurrent analytics users: 25+ simultaneous dashboards
 * - Data retention: 7-year historical with performance optimization
 */

import { DataTypes, type Model, type Optional, type Sequelize } from "sequelize";
import { database } from "@/config/database";

/**
 * ============================================================================
 * OPERATIONAL METRICS DATA WAREHOUSE
 * ============================================================================
 */

/**
 * Real-time operational metrics aggregation
 * Optimized for sub-second dashboard performance
 */
export interface OperationalMetricsWarehouseAttributes {
  id: string;
  metric_date: Date;
  metric_hour: number;
  
  // Route Performance Metrics
  total_routes_completed: number;
  total_distance_traveled: number; // kilometers
  total_fuel_consumed: number; // liters
  avg_route_efficiency: number; // percentage 0-100
  avg_speed: number; // km/h
  total_stops_completed: number;
  avg_stop_duration: number; // minutes
  
  // Vehicle Utilization
  vehicle_count: number;
  vehicles_active: number;
  vehicle_utilization_rate: number; // percentage
  total_maintenance_events: number;
  avg_vehicle_downtime: number; // hours
  
  // Driver Performance
  driver_count: number;
  drivers_active: number;
  avg_driver_efficiency: number; // percentage
  total_safety_incidents: number;
  avg_overtime_hours: number;
  
  // Customer Service Metrics
  total_customers_served: number;
  total_service_requests: number;
  service_completion_rate: number; // percentage
  avg_customer_satisfaction: number; // 1-5 scale
  total_complaints: number;
  total_compliments: number;
  
  // Financial Performance
  total_revenue: number; // dollars
  total_costs: number; // dollars
  profit_margin: number; // percentage
  cost_per_kilometer: number;
  revenue_per_customer: number;
  
  // Environmental Impact
  total_co2_emissions: number; // kg
  total_waste_collected: number; // tons
  recycling_rate: number; // percentage
  
  // System Performance
  api_response_time_avg: number; // milliseconds
  system_uptime: number; // percentage
  error_rate: number; // percentage
  
  // Predictive Analytics
  churn_risk_score: number; // 0-100
  maintenance_prediction_accuracy: number; // percentage
  route_optimization_savings: number; // percentage
  
  created_at: Date;
  updated_at: Date;
}

export interface OperationalMetricsWarehouseCreationAttributes
  extends Optional<
    OperationalMetricsWarehouseAttributes,
    "id" | "created_at" | "updated_at"
  > {}

export class OperationalMetricsWarehouse
  extends Model<
    OperationalMetricsWarehouseAttributes,
    OperationalMetricsWarehouseCreationAttributes
  >
  implements OperationalMetricsWarehouseAttributes
{
  public id!: string;
  public metric_date!: Date;
  public metric_hour!: number;
  
  public total_routes_completed!: number;
  public total_distance_traveled!: number;
  public total_fuel_consumed!: number;
  public avg_route_efficiency!: number;
  public avg_speed!: number;
  public total_stops_completed!: number;
  public avg_stop_duration!: number;
  
  public vehicle_count!: number;
  public vehicles_active!: number;
  public vehicle_utilization_rate!: number;
  public total_maintenance_events!: number;
  public avg_vehicle_downtime!: number;
  
  public driver_count!: number;
  public drivers_active!: number;
  public avg_driver_efficiency!: number;
  public total_safety_incidents!: number;
  public avg_overtime_hours!: number;
  
  public total_customers_served!: number;
  public total_service_requests!: number;
  public service_completion_rate!: number;
  public avg_customer_satisfaction!: number;
  public total_complaints!: number;
  public total_compliments!: number;
  
  public total_revenue!: number;
  public total_costs!: number;
  public profit_margin!: number;
  public cost_per_kilometer!: number;
  public revenue_per_customer!: number;
  
  public total_co2_emissions!: number;
  public total_waste_collected!: number;
  public recycling_rate!: number;
  
  public api_response_time_avg!: number;
  public system_uptime!: number;
  public error_rate!: number;
  
  public churn_risk_score!: number;
  public maintenance_prediction_accuracy!: number;
  public route_optimization_savings!: number;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Get hourly operational summary for dashboard
   */
  public static async getHourlyOperationalSummary(
    startDate: Date,
    endDate: Date
  ): Promise<OperationalMetricsWarehouse[]> {
    return await this.findAll({
      where: {
        metric_date: {
          [DataTypes.Op.between]: [startDate, endDate]
        }
      },
      order: [['metric_date', 'DESC'], ['metric_hour', 'DESC']],
      limit: 168 // 7 days * 24 hours
    });
  }

  /**
   * Get real-time performance KPIs
   */
  public static async getCurrentPerformanceKPIs(): Promise<any> {
    const latestMetrics = await this.findOne({
      order: [['metric_date', 'DESC'], ['metric_hour', 'DESC']]
    });

    if (!latestMetrics) return null;

    return {
      operational: {
        routeEfficiency: latestMetrics.avg_route_efficiency,
        vehicleUtilization: latestMetrics.vehicle_utilization_rate,
        driverEfficiency: latestMetrics.avg_driver_efficiency,
        serviceCompletionRate: latestMetrics.service_completion_rate
      },
      financial: {
        profitMargin: latestMetrics.profit_margin,
        costPerKm: latestMetrics.cost_per_kilometer,
        revenuePerCustomer: latestMetrics.revenue_per_customer
      },
      environmental: {
        co2Emissions: latestMetrics.total_co2_emissions,
        wasteCollected: latestMetrics.total_waste_collected,
        recyclingRate: latestMetrics.recycling_rate
      },
      system: {
        apiResponseTime: latestMetrics.api_response_time_avg,
        systemUptime: latestMetrics.system_uptime,
        errorRate: latestMetrics.error_rate
      },
      predictive: {
        churnRisk: latestMetrics.churn_risk_score,
        maintenanceAccuracy: latestMetrics.maintenance_prediction_accuracy,
        routeOptimizationSavings: latestMetrics.route_optimization_savings
      }
    };
  }
}

/**
 * ============================================================================
 * CUSTOMER ANALYTICS DATA WAREHOUSE
 * ============================================================================
 */

/**
 * Customer behavior and churn prediction analytics
 * Optimized for customer intelligence and retention
 */
export interface CustomerAnalyticsWarehouseAttributes {
  id: string;
  customer_id: string;
  analysis_date: Date;
  
  // RFM Analysis
  recency_score: number; // 1-5 scale
  frequency_score: number; // 1-5 scale  
  monetary_score: number; // 1-5 scale
  rfm_segment: string; // Champions, Loyal, At Risk, etc.
  
  // Behavioral Metrics
  total_service_requests: number;
  avg_days_between_requests: number;
  service_completion_rate: number;
  complaint_rate: number;
  compliment_rate: number;
  payment_timeliness_score: number; // 1-5 scale
  
  // Engagement Metrics
  portal_login_frequency: number;
  mobile_app_usage: number;
  email_open_rate: number;
  sms_response_rate: number;
  customer_survey_participation: number;
  
  // Financial Metrics
  total_revenue_ytd: number;
  avg_monthly_billing: number;
  payment_method_risk_score: number; // 1-5 scale
  credit_score_tier: string; // A, B, C, D
  
  // Churn Prediction
  churn_probability: number; // 0-1 probability
  churn_risk_tier: string; // Low, Medium, High, Critical
  retention_score: number; // 0-100
  lifetime_value_estimate: number;
  
  // Service Quality
  avg_service_rating: number; // 1-5 scale
  service_consistency_score: number; // 0-100
  issue_resolution_time_avg: number; // hours
  
  // Geographic Analysis
  service_area_density: string; // Urban, Suburban, Rural
  route_efficiency_impact: number; // percentage
  
  // Predictive Insights
  upsell_opportunity_score: number; // 0-100
  contract_renewal_probability: number; // 0-1
  referral_likelihood: number; // 0-100
  
  created_at: Date;
  updated_at: Date;
}

export interface CustomerAnalyticsWarehouseCreationAttributes
  extends Optional<
    CustomerAnalyticsWarehouseAttributes,
    "id" | "created_at" | "updated_at"
  > {}

export class CustomerAnalyticsWarehouse
  extends Model<
    CustomerAnalyticsWarehouseAttributes,
    CustomerAnalyticsWarehouseCreationAttributes
  >
  implements CustomerAnalyticsWarehouseAttributes
{
  public id!: string;
  public customer_id!: string;
  public analysis_date!: Date;
  
  public recency_score!: number;
  public frequency_score!: number;
  public monetary_score!: number;
  public rfm_segment!: string;
  
  public total_service_requests!: number;
  public avg_days_between_requests!: number;
  public service_completion_rate!: number;
  public complaint_rate!: number;
  public compliment_rate!: number;
  public payment_timeliness_score!: number;
  
  public portal_login_frequency!: number;
  public mobile_app_usage!: number;
  public email_open_rate!: number;
  public sms_response_rate!: number;
  public customer_survey_participation!: number;
  
  public total_revenue_ytd!: number;
  public avg_monthly_billing!: number;
  public payment_method_risk_score!: number;
  public credit_score_tier!: string;
  
  public churn_probability!: number;
  public churn_risk_tier!: string;
  public retention_score!: number;
  public lifetime_value_estimate!: number;
  
  public avg_service_rating!: number;
  public service_consistency_score!: number;
  public issue_resolution_time_avg!: number;
  
  public service_area_density!: string;
  public route_efficiency_impact!: number;
  
  public upsell_opportunity_score!: number;
  public contract_renewal_probability!: number;
  public referral_likelihood!: number;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Get high-risk churn customers
   */
  public static async getHighRiskChurnCustomers(limit: number = 50): Promise<CustomerAnalyticsWarehouse[]> {
    return await this.findAll({
      where: {
        churn_probability: {
          [DataTypes.Op.gte]: 0.7
        }
      },
      order: [['churn_probability', 'DESC']],
      limit
    });
  }

  /**
   * Get customer segmentation analysis
   */
  public static async getCustomerSegmentationAnalysis(): Promise<any> {
    const segments = await database.query(`
      SELECT 
        rfm_segment,
        COUNT(*) as customer_count,
        AVG(retention_score) as avg_retention_score,
        AVG(lifetime_value_estimate) as avg_lifetime_value,
        AVG(churn_probability) as avg_churn_probability,
        SUM(total_revenue_ytd) as total_segment_revenue
      FROM customer_analytics_warehouse 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY rfm_segment
      ORDER BY total_segment_revenue DESC
    `, {
      type: 'SELECT'
    });

    return segments;
  }

  /**
   * Get upsell opportunities
   */
  public static async getUpsellOpportunities(minScore: number = 70): Promise<CustomerAnalyticsWarehouse[]> {
    return await this.findAll({
      where: {
        upsell_opportunity_score: {
          [DataTypes.Op.gte]: minScore
        },
        churn_probability: {
          [DataTypes.Op.lt]: 0.3 // Low churn risk
        }
      },
      order: [['upsell_opportunity_score', 'DESC']],
      limit: 100
    });
  }
}

/**
 * ============================================================================
 * FINANCIAL ANALYTICS DATA WAREHOUSE 
 * ============================================================================
 */

/**
 * Financial performance and revenue optimization analytics
 */
export interface FinancialAnalyticsWarehouseAttributes {
  id: string;
  period_date: Date;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  
  // Revenue Analytics
  total_revenue: number;
  recurring_revenue: number;
  one_time_revenue: number;
  revenue_growth_rate: number; // percentage vs previous period
  
  // Cost Analytics
  total_costs: number;
  operational_costs: number;
  vehicle_maintenance_costs: number;
  fuel_costs: number;
  labor_costs: number;
  overhead_costs: number;
  
  // Profitability
  gross_profit: number;
  gross_profit_margin: number;
  net_profit: number;
  net_profit_margin: number;
  ebitda: number;
  ebitda_margin: number;
  
  // Customer Financial Metrics
  average_revenue_per_customer: number;
  customer_acquisition_cost: number;
  customer_lifetime_value: number;
  churn_rate: number;
  net_revenue_retention: number;
  
  // Operational Financial Efficiency
  cost_per_kilometer: number;
  cost_per_stop: number;
  revenue_per_route: number;
  fuel_efficiency_cost_savings: number;
  
  // Cash Flow
  operating_cash_flow: number;
  free_cash_flow: number;
  accounts_receivable: number;
  accounts_payable: number;
  
  // Forecasting Metrics
  revenue_forecast_accuracy: number; // percentage
  cost_forecast_accuracy: number; // percentage
  budget_variance: number; // percentage
  
  created_at: Date;
  updated_at: Date;
}

export interface FinancialAnalyticsWarehouseCreationAttributes
  extends Optional<
    FinancialAnalyticsWarehouseAttributes,
    "id" | "created_at" | "updated_at"
  > {}

export class FinancialAnalyticsWarehouse
  extends Model<
    FinancialAnalyticsWarehouseAttributes,
    FinancialAnalyticsWarehouseCreationAttributes
  >
  implements FinancialAnalyticsWarehouseAttributes
{
  public id!: string;
  public period_date!: Date;
  public period_type!: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  
  public total_revenue!: number;
  public recurring_revenue!: number;
  public one_time_revenue!: number;
  public revenue_growth_rate!: number;
  
  public total_costs!: number;
  public operational_costs!: number;
  public vehicle_maintenance_costs!: number;
  public fuel_costs!: number;
  public labor_costs!: number;
  public overhead_costs!: number;
  
  public gross_profit!: number;
  public gross_profit_margin!: number;
  public net_profit!: number;
  public net_profit_margin!: number;
  public ebitda!: number;
  public ebitda_margin!: number;
  
  public average_revenue_per_customer!: number;
  public customer_acquisition_cost!: number;
  public customer_lifetime_value!: number;
  public churn_rate!: number;
  public net_revenue_retention!: number;
  
  public cost_per_kilometer!: number;
  public cost_per_stop!: number;
  public revenue_per_route!: number;
  public fuel_efficiency_cost_savings!: number;
  
  public operating_cash_flow!: number;
  public free_cash_flow!: number;
  public accounts_receivable!: number;
  public accounts_payable!: number;
  
  public revenue_forecast_accuracy!: number;
  public cost_forecast_accuracy!: number;
  public budget_variance!: number;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Get financial performance trends
   */
  public static async getFinancialTrends(
    periodType: 'monthly' | 'quarterly' = 'monthly',
    periods: number = 12
  ): Promise<FinancialAnalyticsWarehouse[]> {
    return await this.findAll({
      where: {
        period_type: periodType
      },
      order: [['period_date', 'DESC']],
      limit: periods
    });
  }

  /**
   * Get profitability analysis
   */
  public static async getProfitabilityAnalysis(): Promise<any> {
    const result = await database.query(`
      SELECT 
        period_type,
        AVG(gross_profit_margin) as avg_gross_margin,
        AVG(net_profit_margin) as avg_net_margin,
        AVG(ebitda_margin) as avg_ebitda_margin,
        AVG(revenue_growth_rate) as avg_revenue_growth,
        COUNT(*) as periods_analyzed
      FROM financial_analytics_warehouse 
      WHERE period_date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY period_type
      ORDER BY 
        CASE period_type 
          WHEN 'yearly' THEN 1 
          WHEN 'quarterly' THEN 2 
          WHEN 'monthly' THEN 3 
          WHEN 'weekly' THEN 4 
          WHEN 'daily' THEN 5 
        END
    `, {
      type: 'SELECT'
    });

    return result;
  }
}

/**
 * ============================================================================
 * ROUTE OPTIMIZATION ANALYTICS
 * ============================================================================
 */

/**
 * Route performance and optimization analytics
 */
export interface RouteOptimizationAnalyticsAttributes {
  id: string;
  route_id: string;
  optimization_date: Date;
  optimization_algorithm: string;
  
  // Route Performance
  planned_distance: number; // kilometers
  actual_distance: number; // kilometers
  distance_variance: number; // percentage
  planned_duration: number; // minutes
  actual_duration: number; // minutes
  duration_variance: number; // percentage
  
  // Efficiency Metrics
  fuel_efficiency: number; // km/liter
  stops_per_hour: number;
  avg_stop_duration: number; // minutes
  route_completion_rate: number; // percentage
  
  // Cost Analysis
  fuel_cost: number;
  labor_cost: number;
  vehicle_depreciation: number;
  total_route_cost: number;
  cost_per_stop: number;
  cost_per_kilometer: number;
  
  // Environmental Impact
  co2_emissions: number; // kg
  noise_pollution_score: number; // 0-100
  route_density_impact: number; // 0-100
  
  // Optimization Results
  optimization_score: number; // 0-100
  time_savings: number; // minutes
  distance_savings: number; // kilometers
  cost_savings: number; // dollars
  
  // Traffic and Weather Impact
  traffic_delay_minutes: number;
  weather_impact_score: number; // 0-100
  construction_delays: number; // minutes
  
  // Customer Satisfaction
  on_time_delivery_rate: number; // percentage
  customer_rating_avg: number; // 1-5 scale
  service_quality_score: number; // 0-100
  
  created_at: Date;
  updated_at: Date;
}

export interface RouteOptimizationAnalyticsCreationAttributes
  extends Optional<
    RouteOptimizationAnalyticsAttributes,
    "id" | "created_at" | "updated_at"
  > {}

export class RouteOptimizationAnalytics
  extends Model<
    RouteOptimizationAnalyticsAttributes,
    RouteOptimizationAnalyticsCreationAttributes
  >
  implements RouteOptimizationAnalyticsAttributes
{
  public id!: string;
  public route_id!: string;
  public optimization_date!: Date;
  public optimization_algorithm!: string;
  
  public planned_distance!: number;
  public actual_distance!: number;
  public distance_variance!: number;
  public planned_duration!: number;
  public actual_duration!: number;
  public duration_variance!: number;
  
  public fuel_efficiency!: number;
  public stops_per_hour!: number;
  public avg_stop_duration!: number;
  public route_completion_rate!: number;
  
  public fuel_cost!: number;
  public labor_cost!: number;
  public vehicle_depreciation!: number;
  public total_route_cost!: number;
  public cost_per_stop!: number;
  public cost_per_kilometer!: number;
  
  public co2_emissions!: number;
  public noise_pollution_score!: number;
  public route_density_impact!: number;
  
  public optimization_score!: number;
  public time_savings!: number;
  public distance_savings!: number;
  public cost_savings!: number;
  
  public traffic_delay_minutes!: number;
  public weather_impact_score!: number;
  public construction_delays!: number;
  
  public on_time_delivery_rate!: number;
  public customer_rating_avg!: number;
  public service_quality_score!: number;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Get route optimization performance summary
   */
  public static async getOptimizationPerformanceSummary(days: number = 30): Promise<any> {
    const result = await database.query(`
      SELECT 
        optimization_algorithm,
        COUNT(*) as total_routes,
        AVG(optimization_score) as avg_optimization_score,
        AVG(time_savings) as avg_time_savings,
        AVG(distance_savings) as avg_distance_savings,
        AVG(cost_savings) as avg_cost_savings,
        AVG(fuel_efficiency) as avg_fuel_efficiency,
        AVG(on_time_delivery_rate) as avg_on_time_rate,
        AVG(customer_rating_avg) as avg_customer_rating
      FROM route_optimization_analytics 
      WHERE optimization_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY optimization_algorithm
      ORDER BY avg_optimization_score DESC
    `, {
      type: 'SELECT'
    });

    return result;
  }

  /**
   * Get best performing routes
   */
  public static async getBestPerformingRoutes(limit: number = 20): Promise<RouteOptimizationAnalytics[]> {
    return await this.findAll({
      where: {
        optimization_date: {
          [DataTypes.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      order: [['optimization_score', 'DESC']],
      limit
    });
  }
}

/**
 * ============================================================================
 * INITIALIZE ANALYTICS WAREHOUSE MODELS
 * ============================================================================
 */

// Initialize OperationalMetricsWarehouse
OperationalMetricsWarehouse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    metric_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Date of the metrics (YYYY-MM-DD)"
    },
    metric_hour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 23 },
      comment: "Hour of the day (0-23)"
    },
    
    // Route Performance Metrics
    total_routes_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_distance_traveled: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_fuel_consumed: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    avg_route_efficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    avg_speed: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_stops_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    avg_stop_duration: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Vehicle Utilization
    vehicle_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    vehicles_active: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    vehicle_utilization_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    total_maintenance_events: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    avg_vehicle_downtime: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Driver Performance
    driver_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    drivers_active: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    avg_driver_efficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    total_safety_incidents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    avg_overtime_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Customer Service Metrics
    total_customers_served: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_service_requests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    service_completion_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    avg_customer_satisfaction: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 }
    },
    total_complaints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_compliments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Financial Performance
    total_revenue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_costs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    profit_margin: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    cost_per_kilometer: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    revenue_per_customer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Environmental Impact
    total_co2_emissions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_waste_collected: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    recycling_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    // System Performance
    api_response_time_avg: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    system_uptime: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    error_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    // Predictive Analytics
    churn_risk_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    maintenance_prediction_accuracy: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    route_optimization_savings: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    tableName: "operational_metrics_warehouse",
    indexes: [
      {
        name: "idx_operational_metrics_date_hour",
        fields: ["metric_date", "metric_hour"],
        unique: true
      },
      {
        name: "idx_operational_metrics_date_desc",
        fields: [{ name: "metric_date", order: "DESC" }]
      },
      {
        name: "idx_operational_metrics_efficiency",
        fields: ["avg_route_efficiency", "vehicle_utilization_rate"]
      },
      {
        name: "idx_operational_metrics_performance",
        fields: ["profit_margin", "service_completion_rate", "system_uptime"]
      }
    ],
    comment: "Hourly aggregated operational metrics for real-time dashboard performance"
  }
);

// Initialize CustomerAnalyticsWarehouse
CustomerAnalyticsWarehouse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customers",
        key: "id"
      }
    },
    analysis_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    
    // RFM Analysis
    recency_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    frequency_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    monetary_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    rfm_segment: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    
    // Behavioral Metrics
    total_service_requests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    avg_days_between_requests: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    service_completion_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    complaint_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    compliment_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    payment_timeliness_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    
    // Engagement Metrics
    portal_login_frequency: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    mobile_app_usage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    email_open_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    sms_response_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    customer_survey_participation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Financial Metrics
    total_revenue_ytd: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    avg_monthly_billing: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    payment_method_risk_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    credit_score_tier: {
      type: DataTypes.STRING(1),
      allowNull: false,
      validate: { isIn: [["A", "B", "C", "D"]] }
    },
    
    // Churn Prediction
    churn_probability: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 1 }
    },
    churn_risk_tier: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [["Low", "Medium", "High", "Critical"]] }
    },
    retention_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    lifetime_value_estimate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Service Quality
    avg_service_rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 }
    },
    service_consistency_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    issue_resolution_time_avg: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Geographic Analysis
    service_area_density: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [["Urban", "Suburban", "Rural"]] }
    },
    route_efficiency_impact: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Predictive Insights
    upsell_opportunity_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    contract_renewal_probability: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 1 }
    },
    referral_likelihood: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    tableName: "customer_analytics_warehouse",
    indexes: [
      {
        name: "idx_customer_analytics_customer_date",
        fields: ["customer_id", "analysis_date"],
        unique: true
      },
      {
        name: "idx_customer_analytics_churn_probability",
        fields: [{ name: "churn_probability", order: "DESC" }]
      },
      {
        name: "idx_customer_analytics_rfm_segment",
        fields: ["rfm_segment", "lifetime_value_estimate"]
      },
      {
        name: "idx_customer_analytics_upsell",
        fields: [{ name: "upsell_opportunity_score", order: "DESC" }]
      },
      {
        name: "idx_customer_analytics_risk_tier",
        fields: ["churn_risk_tier", "retention_score"]
      }
    ],
    comment: "Customer behavior analytics and churn prediction data warehouse"
  }
);

// Initialize FinancialAnalyticsWarehouse
FinancialAnalyticsWarehouse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    period_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    period_type: {
      type: DataTypes.ENUM("daily", "weekly", "monthly", "quarterly", "yearly"),
      allowNull: false
    },
    
    // Revenue Analytics
    total_revenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    recurring_revenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    one_time_revenue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    revenue_growth_rate: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    
    // Cost Analytics
    total_costs: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    operational_costs: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    vehicle_maintenance_costs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    fuel_costs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    labor_costs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    overhead_costs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Profitability
    gross_profit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    gross_profit_margin: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    net_profit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    net_profit_margin: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    ebitda: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    ebitda_margin: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    
    // Customer Financial Metrics
    average_revenue_per_customer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    customer_acquisition_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    customer_lifetime_value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    churn_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    net_revenue_retention: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Operational Financial Efficiency
    cost_per_kilometer: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    cost_per_stop: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    revenue_per_route: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    fuel_efficiency_cost_savings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Cash Flow
    operating_cash_flow: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    free_cash_flow: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    accounts_receivable: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    accounts_payable: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Forecasting Metrics
    revenue_forecast_accuracy: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    cost_forecast_accuracy: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    budget_variance: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    tableName: "financial_analytics_warehouse",
    indexes: [
      {
        name: "idx_financial_analytics_period",
        fields: ["period_type", "period_date"],
        unique: true
      },
      {
        name: "idx_financial_analytics_date_desc",
        fields: [{ name: "period_date", order: "DESC" }]
      },
      {
        name: "idx_financial_analytics_profitability",
        fields: ["gross_profit_margin", "net_profit_margin", "ebitda_margin"]
      },
      {
        name: "idx_financial_analytics_growth",
        fields: ["revenue_growth_rate", "total_revenue"]
      }
    ],
    comment: "Financial performance and revenue optimization analytics warehouse"
  }
);

// Initialize RouteOptimizationAnalytics
RouteOptimizationAnalytics.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    route_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "routes",
        key: "id"
      }
    },
    optimization_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    optimization_algorithm: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    
    // Route Performance
    planned_distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    actual_distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    distance_variance: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    planned_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actual_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    duration_variance: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    
    // Efficiency Metrics
    fuel_efficiency: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    stops_per_hour: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    avg_stop_duration: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    route_completion_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    // Cost Analysis
    fuel_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    labor_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    vehicle_depreciation: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_route_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    cost_per_stop: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    cost_per_kilometer: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    
    // Environmental Impact
    co2_emissions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    noise_pollution_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    route_density_impact: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    // Optimization Results
    optimization_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    time_savings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    distance_savings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    cost_savings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Traffic and Weather Impact
    traffic_delay_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    weather_impact_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    construction_delays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Customer Satisfaction
    on_time_delivery_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    customer_rating_avg: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 }
    },
    service_quality_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    tableName: "route_optimization_analytics",
    indexes: [
      {
        name: "idx_route_optimization_route_date",
        fields: ["route_id", "optimization_date"]
      },
      {
        name: "idx_route_optimization_date_desc",
        fields: [{ name: "optimization_date", order: "DESC" }]
      },
      {
        name: "idx_route_optimization_algorithm",
        fields: ["optimization_algorithm", "optimization_score"]
      },
      {
        name: "idx_route_optimization_performance",
        fields: [{ name: "optimization_score", order: "DESC" }]
      },
      {
        name: "idx_route_optimization_cost_savings",
        fields: [{ name: "cost_savings", order: "DESC" }]
      }
    ],
    comment: "Route performance and optimization analytics with comprehensive metrics"
  }
);

// Export all analytics warehouse models
export {
  OperationalMetricsWarehouse,
  CustomerAnalyticsWarehouse,
  FinancialAnalyticsWarehouse,
  RouteOptimizationAnalytics
};

export default {
  OperationalMetricsWarehouse,
  CustomerAnalyticsWarehouse,
  FinancialAnalyticsWarehouse,
  RouteOptimizationAnalytics
};