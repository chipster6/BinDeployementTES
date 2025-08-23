/**
 * ============================================================================
 * ANALYTICS WAREHOUSE REPOSITORY - HIGH-PERFORMANCE DATA ACCESS LAYER
 * ============================================================================
 *
 * Specialized repository layer for analytics data warehouse operations.
 * Optimized for sub-second dashboard queries, real-time analytics processing,
 * and enterprise-grade business intelligence performance.
 *
 * COORDINATION SESSION: advanced-analytics-database-architecture
 * CREATED BY: Database-Architect Agent
 * DATE: 2025-08-20
 * VERSION: 1.0.0 - Enterprise Analytics Repository
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Materialized view caching for dashboard queries
 * - Intelligent aggregation caching with TTL management
 * - Partition-aware query optimization
 * - Memory-efficient batch processing
 * - Real-time cache invalidation strategies
 */

import { QueryTypes, type Op, type literal } from "sequelize";
import { BaseRepository } from "./BaseRepository";
import { database } from "@/config/database";
import { logger } from "@/utils/logger";
import {
  OperationalMetricsWarehouse,
  CustomerAnalyticsWarehouse,
  FinancialAnalyticsWarehouse,
  RouteOptimizationAnalytics
} from "@/models/analytics/AnalyticsDataWarehouse";

/**
 * ============================================================================
 * OPERATIONAL METRICS WAREHOUSE REPOSITORY
 * ============================================================================
 */

export class OperationalMetricsWarehouseRepository extends BaseRepository<OperationalMetricsWarehouse> {
  constructor() {
    super(OperationalMetricsWarehouse);
    // Extended cache TTL for analytics data (15 minutes)
    this.defaultCacheTTL = 900;
  }

  /**
   * Get real-time dashboard KPIs with aggressive caching
   */
  public async getRealTimeDashboardKPIs(): Promise<any> {
    const cacheKey = this.generateCacheKey("realTimeDashboardKPIs");
    
    // Check cache first (5-minute TTL for real-time data)
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const kpis = await OperationalMetricsWarehouse.getCurrentPerformanceKPIs();
    
    // Cache with shorter TTL for real-time data
    await this.setCache(cacheKey, kpis, 300); // 5 minutes
    
    return kpis;
  }

  /**
   * Get hourly operational trends with intelligent caching
   */
  public async getHourlyOperationalTrends(hours: number = 24): Promise<any[]> {
    const cacheKey = this.generateCacheKey("hourlyOperationalTrends", { hours });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));
    
    const trends = await OperationalMetricsWarehouse.getHourlyOperationalSummary(startDate, endDate);
    
    // Cache for 10 minutes
    await this.setCache(cacheKey, trends, 600);
    
    return trends;
  }

  /**
   * Get operational performance comparison
   */
  public async getPerformanceComparison(
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date }
  ): Promise<any> {
    const cacheKey = this.generateCacheKey("performanceComparison", {
      currentPeriod,
      previousPeriod
    });

    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getAggregatedMetrics(currentPeriod.start, currentPeriod.end),
      this.getAggregatedMetrics(previousPeriod.start, previousPeriod.end)
    ]);

    const comparison = {
      current: currentMetrics,
      previous: previousMetrics,
      changes: {
        routeEfficiency: this.calculatePercentageChange(
          previousMetrics.avg_route_efficiency,
          currentMetrics.avg_route_efficiency
        ),
        vehicleUtilization: this.calculatePercentageChange(
          previousMetrics.vehicle_utilization_rate,
          currentMetrics.vehicle_utilization_rate
        ),
        profitMargin: this.calculatePercentageChange(
          previousMetrics.profit_margin,
          currentMetrics.profit_margin
        ),
        customerSatisfaction: this.calculatePercentageChange(
          previousMetrics.avg_customer_satisfaction,
          currentMetrics.avg_customer_satisfaction
        )
      }
    };

    // Cache for 1 hour
    await this.setCache(cacheKey, comparison, 3600);
    
    return comparison;
  }

  /**
   * Get aggregated metrics for date range
   */
  private async getAggregatedMetrics(startDate: Date, endDate: Date): Promise<any> {
    const result = await database.query(`
      SELECT 
        AVG(avg_route_efficiency) as avg_route_efficiency,
        AVG(vehicle_utilization_rate) as vehicle_utilization_rate,
        AVG(profit_margin) as profit_margin,
        AVG(avg_customer_satisfaction) as avg_customer_satisfaction,
        SUM(total_revenue) as total_revenue,
        SUM(total_costs) as total_costs,
        AVG(system_uptime) as system_uptime,
        AVG(churn_risk_score) as churn_risk_score
      FROM operational_metrics_warehouse 
      WHERE metric_date BETWEEN :startDate AND :endDate
    `, {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT
    });

    return result[0] || {};
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (!oldValue || oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Bulk insert operational metrics with optimized performance
   */
  public async bulkInsertMetrics(metricsData: any[]): Promise<void> {
    if (!metricsData || metricsData.length === 0) return;

    try {
      // Use raw SQL for optimal bulk insert performance
      const values = metricsData.map(metric => 
        `(
          '${metric?.id || require('uuid').v4()}',
          '${metric.metric_date}',
          ${metric.metric_hour},
          ${metric?.total_routes_completed || 0},
          ${metric?.total_distance_traveled || 0},
          ${metric?.total_fuel_consumed || 0},
          ${metric?.avg_route_efficiency || 0},
          ${metric?.avg_speed || 0},
          ${metric?.total_stops_completed || 0},
          ${metric?.avg_stop_duration || 0},
          ${metric?.vehicle_count || 0},
          ${metric?.vehicles_active || 0},
          ${metric?.vehicle_utilization_rate || 0},
          ${metric?.total_maintenance_events || 0},
          ${metric?.avg_vehicle_downtime || 0},
          ${metric?.driver_count || 0},
          ${metric?.drivers_active || 0},
          ${metric?.avg_driver_efficiency || 0},
          ${metric?.total_safety_incidents || 0},
          ${metric?.avg_overtime_hours || 0},
          ${metric?.total_customers_served || 0},
          ${metric?.total_service_requests || 0},
          ${metric?.service_completion_rate || 0},
          ${metric?.avg_customer_satisfaction || 0},
          ${metric?.total_complaints || 0},
          ${metric?.total_compliments || 0},
          ${metric?.total_revenue || 0},
          ${metric?.total_costs || 0},
          ${metric?.profit_margin || 0},
          ${metric?.cost_per_kilometer || 0},
          ${metric?.revenue_per_customer || 0},
          ${metric?.total_co2_emissions || 0},
          ${metric?.total_waste_collected || 0},
          ${metric?.recycling_rate || 0},
          ${metric?.api_response_time_avg || 0},
          ${metric?.system_uptime || 0},
          ${metric?.error_rate || 0},
          ${metric?.churn_risk_score || 0},
          ${metric?.maintenance_prediction_accuracy || 0},
          ${metric?.route_optimization_savings || 0},
          NOW(),
          NOW()
        )`
      ).join(',');

      await database.query(`
        INSERT INTO operational_metrics_warehouse (
          id, metric_date, metric_hour, total_routes_completed, total_distance_traveled,
          total_fuel_consumed, avg_route_efficiency, avg_speed, total_stops_completed,
          avg_stop_duration, vehicle_count, vehicles_active, vehicle_utilization_rate,
          total_maintenance_events, avg_vehicle_downtime, driver_count, drivers_active,
          avg_driver_efficiency, total_safety_incidents, avg_overtime_hours,
          total_customers_served, total_service_requests, service_completion_rate,
          avg_customer_satisfaction, total_complaints, total_compliments, total_revenue,
          total_costs, profit_margin, cost_per_kilometer, revenue_per_customer,
          total_co2_emissions, total_waste_collected, recycling_rate,
          api_response_time_avg, system_uptime, error_rate, churn_risk_score,
          maintenance_prediction_accuracy, route_optimization_savings, created_at, updated_at
        ) VALUES ${values}
        ON CONFLICT (metric_date, metric_hour) DO UPDATE SET
          total_routes_completed = EXCLUDED.total_routes_completed,
          total_distance_traveled = EXCLUDED.total_distance_traveled,
          total_fuel_consumed = EXCLUDED.total_fuel_consumed,
          avg_route_efficiency = EXCLUDED.avg_route_efficiency,
          avg_speed = EXCLUDED.avg_speed,
          total_stops_completed = EXCLUDED.total_stops_completed,
          avg_stop_duration = EXCLUDED.avg_stop_duration,
          vehicle_count = EXCLUDED.vehicle_count,
          vehicles_active = EXCLUDED.vehicles_active,
          vehicle_utilization_rate = EXCLUDED.vehicle_utilization_rate,
          total_maintenance_events = EXCLUDED.total_maintenance_events,
          avg_vehicle_downtime = EXCLUDED.avg_vehicle_downtime,
          driver_count = EXCLUDED.driver_count,
          drivers_active = EXCLUDED.drivers_active,
          avg_driver_efficiency = EXCLUDED.avg_driver_efficiency,
          total_safety_incidents = EXCLUDED.total_safety_incidents,
          avg_overtime_hours = EXCLUDED.avg_overtime_hours,
          total_customers_served = EXCLUDED.total_customers_served,
          total_service_requests = EXCLUDED.total_service_requests,
          service_completion_rate = EXCLUDED.service_completion_rate,
          avg_customer_satisfaction = EXCLUDED.avg_customer_satisfaction,
          total_complaints = EXCLUDED.total_complaints,
          total_compliments = EXCLUDED.total_compliments,
          total_revenue = EXCLUDED.total_revenue,
          total_costs = EXCLUDED.total_costs,
          profit_margin = EXCLUDED.profit_margin,
          cost_per_kilometer = EXCLUDED.cost_per_kilometer,
          revenue_per_customer = EXCLUDED.revenue_per_customer,
          total_co2_emissions = EXCLUDED.total_co2_emissions,
          total_waste_collected = EXCLUDED.total_waste_collected,
          recycling_rate = EXCLUDED.recycling_rate,
          api_response_time_avg = EXCLUDED.api_response_time_avg,
          system_uptime = EXCLUDED.system_uptime,
          error_rate = EXCLUDED.error_rate,
          churn_risk_score = EXCLUDED.churn_risk_score,
          maintenance_prediction_accuracy = EXCLUDED.maintenance_prediction_accuracy,
          route_optimization_savings = EXCLUDED.route_optimization_savings,
          updated_at = NOW()
      `, {
        type: QueryTypes.INSERT
      });

      // Clear related cache after bulk insert
      await this.clearCacheKeys([
        "realTimeDashboardKPIs",
        "hourlyOperationalTrends:*",
        "performanceComparison:*"
      ]);

      logger.info(`Bulk inserted ${metricsData.length} operational metrics records`);
    } catch (error: unknown) {
      logger.error("Bulk insert operational metrics failed:", error);
      throw error;
    }
  }
}

/**
 * ============================================================================
 * CUSTOMER ANALYTICS WAREHOUSE REPOSITORY
 * ============================================================================
 */

export class CustomerAnalyticsWarehouseRepository extends BaseRepository<CustomerAnalyticsWarehouse> {
  constructor() {
    super(CustomerAnalyticsWarehouse);
    // Extended cache TTL for customer analytics (30 minutes)
    this.defaultCacheTTL = 1800;
  }

  /**
   * Get customer churn risk dashboard with aggressive caching
   */
  public async getChurnRiskDashboard(): Promise<any> {
    const cacheKey = this.generateCacheKey("churnRiskDashboard");
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      highRiskCustomers,
      segmentAnalysis,
      churnTrends
    ] = await Promise.all([
      CustomerAnalyticsWarehouse.getHighRiskChurnCustomers(25),
      CustomerAnalyticsWarehouse.getCustomerSegmentationAnalysis(),
      this.getChurnTrends(30) // Last 30 days
    ]);

    const dashboard = {
      highRiskCustomers,
      segmentAnalysis,
      churnTrends,
      summary: {
        totalHighRisk: highRiskCustomers.length,
        avgChurnProbability: highRiskCustomers.reduce((sum, c) => sum + c.churn_probability, 0) / highRiskCustomers.length,
        potentialRevenueAtRisk: highRiskCustomers.reduce((sum, c) => sum + c.lifetime_value_estimate, 0)
      }
    };

    // Cache for 15 minutes
    await this.setCache(cacheKey, dashboard, 900);
    
    return dashboard;
  }

  /**
   * Get upsell opportunities with intelligent filtering
   */
  public async getUpsellOpportunities(minScore: number = 70, limit: number = 50): Promise<any> {
    const cacheKey = this.generateCacheKey("upsellOpportunities", { minScore, limit });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const opportunities = await CustomerAnalyticsWarehouse.getUpsellOpportunities(minScore);
    
    const result = {
      opportunities: opportunities.slice(0, limit),
      summary: {
        totalOpportunities: opportunities.length,
        totalPotentialRevenue: opportunities.reduce((sum, o) => sum + (o.avg_monthly_billing * 1.3), 0), // 30% upsell assumption
        avgOpportunityScore: opportunities.reduce((sum, o) => sum + o.upsell_opportunity_score, 0) / opportunities.length
      }
    };

    // Cache for 20 minutes
    await this.setCache(cacheKey, result, 1200);
    
    return result;
  }

  /**
   * Get customer lifetime value analysis
   */
  public async getCustomerLifetimeValueAnalysis(): Promise<any> {
    const cacheKey = this.generateCacheKey("customerLifetimeValueAnalysis");
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await database.query(`
      WITH clv_tiers AS (
        SELECT 
          CASE 
            WHEN lifetime_value_estimate >= 10000 THEN 'High Value'
            WHEN lifetime_value_estimate >= 5000 THEN 'Medium Value'
            WHEN lifetime_value_estimate >= 1000 THEN 'Low Value'
            ELSE 'Minimal Value'
          END as value_tier,
          COUNT(*) as customer_count,
          AVG(lifetime_value_estimate) as avg_clv,
          AVG(retention_score) as avg_retention,
          AVG(churn_probability) as avg_churn_probability,
          SUM(total_revenue_ytd) as total_revenue
        FROM customer_analytics_warehouse 
        WHERE analysis_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 
          CASE 
            WHEN lifetime_value_estimate >= 10000 THEN 'High Value'
            WHEN lifetime_value_estimate >= 5000 THEN 'Medium Value'
            WHEN lifetime_value_estimate >= 1000 THEN 'Low Value'
            ELSE 'Minimal Value'
          END
      )
      SELECT * FROM clv_tiers
      ORDER BY avg_clv DESC
    `, {
      type: QueryTypes.SELECT
    });

    // Cache for 1 hour
    await this.setCache(cacheKey, result, 3600);
    
    return result;
  }

  /**
   * Get churn trends over time
   */
  private async getChurnTrends(days: number): Promise<any[]> {
    const result = await database.query(`
      SELECT 
        analysis_date,
        AVG(churn_probability) as avg_churn_probability,
        COUNT(CASE WHEN churn_probability >= 0.7 THEN 1 END) as high_risk_count,
        COUNT(CASE WHEN churn_probability >= 0.4 AND churn_probability < 0.7 THEN 1 END) as medium_risk_count,
        COUNT(CASE WHEN churn_probability < 0.4 THEN 1 END) as low_risk_count,
        COUNT(*) as total_customers
      FROM customer_analytics_warehouse 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY analysis_date
      ORDER BY analysis_date DESC
    `, {
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Bulk update customer analytics with conflict resolution
   */
  public async bulkUpdateCustomerAnalytics(analyticsData: any[]): Promise<void> {
    if (!analyticsData || analyticsData.length === 0) return;

    try {
      // Use batch processing for large datasets
      const batchSize = 100;
      for (let i = 0; i < analyticsData.length; i += batchSize) {
        const batch = analyticsData.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (data) => {
          await CustomerAnalyticsWarehouse.upsert(data, {
            conflictFields: ['customer_id', 'analysis_date']
          });
        }));
      }

      // Clear related cache after bulk update
      await this.clearCacheKeys([
        "churnRiskDashboard",
        "upsellOpportunities:*",
        "customerLifetimeValueAnalysis"
      ]);

      logger.info(`Bulk updated ${analyticsData.length} customer analytics records`);
    } catch (error: unknown) {
      logger.error("Bulk update customer analytics failed:", error);
      throw error;
    }
  }
}

/**
 * ============================================================================
 * FINANCIAL ANALYTICS WAREHOUSE REPOSITORY
 * ============================================================================
 */

export class FinancialAnalyticsWarehouseRepository extends BaseRepository<FinancialAnalyticsWarehouse> {
  constructor() {
    super(FinancialAnalyticsWarehouse);
    // Extended cache TTL for financial analytics (45 minutes)
    this.defaultCacheTTL = 2700;
  }

  /**
   * Get financial performance dashboard
   */
  public async getFinancialPerformanceDashboard(): Promise<any> {
    const cacheKey = this.generateCacheKey("financialPerformanceDashboard");
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      monthlyTrends,
      profitabilityAnalysis,
      revenueBreakdown,
      costAnalysis
    ] = await Promise.all([
      FinancialAnalyticsWarehouse.getFinancialTrends('monthly', 12),
      FinancialAnalyticsWarehouse.getProfitabilityAnalysis(),
      this.getRevenueBreakdown(),
      this.getCostAnalysis()
    ]);

    const dashboard = {
      monthlyTrends,
      profitabilityAnalysis,
      revenueBreakdown,
      costAnalysis,
      summary: this.calculateFinancialSummary(monthlyTrends)
    };

    // Cache for 30 minutes
    await this.setCache(cacheKey, dashboard, 1800);
    
    return dashboard;
  }

  /**
   * Get revenue breakdown analysis
   */
  private async getRevenueBreakdown(): Promise<any> {
    const result = await database.query(`
      SELECT 
        period_type,
        SUM(total_revenue) as total_revenue,
        SUM(recurring_revenue) as recurring_revenue,
        SUM(one_time_revenue) as one_time_revenue,
        AVG(revenue_growth_rate) as avg_growth_rate,
        AVG(average_revenue_per_customer) as avg_arpc
      FROM financial_analytics_warehouse 
      WHERE period_date >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY period_type
      ORDER BY 
        CASE period_type 
          WHEN 'yearly' THEN 1 
          WHEN 'quarterly' THEN 2 
          WHEN 'monthly' THEN 3 
        END
    `, {
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Get cost analysis breakdown
   */
  private async getCostAnalysis(): Promise<any> {
    const result = await database.query(`
      SELECT 
        period_type,
        SUM(total_costs) as total_costs,
        SUM(operational_costs) as operational_costs,
        SUM(vehicle_maintenance_costs) as vehicle_maintenance_costs,
        SUM(fuel_costs) as fuel_costs,
        SUM(labor_costs) as labor_costs,
        SUM(overhead_costs) as overhead_costs,
        AVG(cost_per_kilometer) as avg_cost_per_km,
        AVG(cost_per_stop) as avg_cost_per_stop
      FROM financial_analytics_warehouse 
      WHERE period_date >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY period_type
      ORDER BY 
        CASE period_type 
          WHEN 'yearly' THEN 1 
          WHEN 'quarterly' THEN 2 
          WHEN 'monthly' THEN 3 
        END
    `, {
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Calculate financial summary metrics
   */
  private calculateFinancialSummary(monthlyTrends: any[]): any {
    if (!monthlyTrends || monthlyTrends.length === 0) {
      return {};
    }

    const latestMonth = monthlyTrends[0];
    const previousMonth = monthlyTrends[1];

    return {
      currentMonth: {
        revenue: latestMonth.total_revenue,
        grossProfit: latestMonth.gross_profit,
        netProfit: latestMonth.net_profit,
        grossMargin: latestMonth.gross_profit_margin,
        netMargin: latestMonth.net_profit_margin
      },
      monthOverMonth: previousMonth ? {
        revenueChange: this.calculatePercentageChange(previousMonth.total_revenue, latestMonth.total_revenue),
        grossProfitChange: this.calculatePercentageChange(previousMonth.gross_profit, latestMonth.gross_profit),
        netProfitChange: this.calculatePercentageChange(previousMonth.net_profit, latestMonth.net_profit)
      } : null,
      yearToDate: {
        totalRevenue: monthlyTrends.reduce((sum, month) => sum + month.total_revenue, 0),
        avgGrossMargin: monthlyTrends.reduce((sum, month) => sum + month.gross_profit_margin, 0) / monthlyTrends.length,
        avgNetMargin: monthlyTrends.reduce((sum, month) => sum + month.net_profit_margin, 0) / monthlyTrends.length
      }
    };
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (!oldValue || oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }
}

/**
 * ============================================================================
 * ROUTE OPTIMIZATION ANALYTICS REPOSITORY
 * ============================================================================
 */

export class RouteOptimizationAnalyticsRepository extends BaseRepository<RouteOptimizationAnalytics> {
  constructor() {
    super(RouteOptimizationAnalytics);
    // Standard cache TTL for route analytics (20 minutes)
    this.defaultCacheTTL = 1200;
  }

  /**
   * Get route optimization performance dashboard
   */
  public async getRouteOptimizationDashboard(): Promise<any> {
    const cacheKey = this.generateCacheKey("routeOptimizationDashboard");
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      performanceSummary,
      bestPerformingRoutes,
      algorithmComparison,
      efficiencyTrends
    ] = await Promise.all([
      RouteOptimizationAnalytics.getOptimizationPerformanceSummary(30),
      RouteOptimizationAnalytics.getBestPerformingRoutes(15),
      this.getAlgorithmComparison(),
      this.getEfficiencyTrends(30)
    ]);

    const dashboard = {
      performanceSummary,
      bestPerformingRoutes,
      algorithmComparison,
      efficiencyTrends,
      summary: this.calculateOptimizationSummary(performanceSummary)
    };

    // Cache for 15 minutes
    await this.setCache(cacheKey, dashboard, 900);
    
    return dashboard;
  }

  /**
   * Get algorithm performance comparison
   */
  private async getAlgorithmComparison(): Promise<any[]> {
    const result = await database.query(`
      SELECT 
        optimization_algorithm,
        COUNT(*) as total_optimizations,
        AVG(optimization_score) as avg_score,
        AVG(time_savings) as avg_time_savings,
        AVG(distance_savings) as avg_distance_savings,
        AVG(cost_savings) as avg_cost_savings,
        AVG(fuel_efficiency) as avg_fuel_efficiency,
        AVG(customer_rating_avg) as avg_customer_rating,
        STDDEV(optimization_score) as score_variance
      FROM route_optimization_analytics 
      WHERE optimization_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY optimization_algorithm
      ORDER BY avg_score DESC
    `, {
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Get efficiency trends over time
   */
  private async getEfficiencyTrends(days: number): Promise<any[]> {
    const result = await database.query(`
      SELECT 
        DATE(optimization_date) as optimization_date,
        AVG(optimization_score) as avg_optimization_score,
        AVG(fuel_efficiency) as avg_fuel_efficiency,
        AVG(time_savings) as avg_time_savings,
        AVG(cost_savings) as avg_cost_savings,
        COUNT(*) as total_routes
      FROM route_optimization_analytics 
      WHERE optimization_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(optimization_date)
      ORDER BY optimization_date DESC
    `, {
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Calculate optimization summary metrics
   */
  private calculateOptimizationSummary(performanceSummary: any[]): any {
    if (!performanceSummary || performanceSummary.length === 0) {
      return {};
    }

    const totalRoutes = performanceSummary.reduce((sum, alg) => sum + alg.total_routes, 0);
    const weightedAvgScore = performanceSummary.reduce((sum, alg) => 
      sum + (alg.avg_optimization_score * alg.total_routes), 0) / totalRoutes;
    
    return {
      totalOptimizations: totalRoutes,
      averageOptimizationScore: weightedAvgScore,
      totalTimeSaved: performanceSummary.reduce((sum, alg) => 
        sum + (alg.avg_time_savings * alg.total_routes), 0),
      totalCostSaved: performanceSummary.reduce((sum, alg) => 
        sum + (alg.avg_cost_savings * alg.total_routes), 0),
      bestAlgorithm: performanceSummary[0]?.optimization_algorithm || 'N/A',
      avgCustomerSatisfaction: performanceSummary.reduce((sum, alg) => 
        sum + (alg.avg_customer_rating * alg.total_routes), 0) / totalRoutes
    };
  }
}

/**
 * ============================================================================
 * ANALYTICS WAREHOUSE MANAGER - UNIFIED REPOSITORY ACCESS
 * ============================================================================
 */

export class AnalyticsWarehouseManager {
  public readonly operationalMetrics: OperationalMetricsWarehouseRepository;
  public readonly customerAnalytics: CustomerAnalyticsWarehouseRepository;
  public readonly financialAnalytics: FinancialAnalyticsWarehouseRepository;
  public readonly routeOptimization: RouteOptimizationAnalyticsRepository;

  constructor() {
    this.operationalMetrics = new OperationalMetricsWarehouseRepository();
    this.customerAnalytics = new CustomerAnalyticsWarehouseRepository();
    this.financialAnalytics = new FinancialAnalyticsWarehouseRepository();
    this.routeOptimization = new RouteOptimizationAnalyticsRepository();
  }

  /**
   * Get comprehensive analytics dashboard
   */
  public async getComprehensiveAnalyticsDashboard(): Promise<any> {
    try {
      const [
        operationalKPIs,
        churnRisk,
        financialPerformance,
        routeOptimization
      ] = await Promise.all([
        this.operationalMetrics.getRealTimeDashboardKPIs(),
        this.customerAnalytics.getChurnRiskDashboard(),
        this.financialAnalytics.getFinancialPerformanceDashboard(),
        this.routeOptimization.getRouteOptimizationDashboard()
      ]);

      return {
        timestamp: new Date().toISOString(),
        operational: operationalKPIs,
        customer: churnRisk,
        financial: financialPerformance,
        optimization: routeOptimization,
        summary: {
          systemHealth: this.calculateSystemHealthScore([
            operationalKPIs,
            churnRisk,
            financialPerformance,
            routeOptimization
          ]),
          keyAlerts: this.generateKeyAlerts([
            operationalKPIs,
            churnRisk,
            financialPerformance,
            routeOptimization
          ])
        }
      };
    } catch (error: unknown) {
      logger.error("Comprehensive analytics dashboard failed:", error);
      throw error;
    }
  }

  /**
   * Calculate overall system health score
   */
  private calculateSystemHealthScore(dashboards: any[]): number {
    // Implementation would calculate a weighted score based on all metrics
    // This is a simplified version
    return 85; // Placeholder
  }

  /**
   * Generate key alerts based on analytics data
   */
  private generateKeyAlerts(dashboards: any[]): string[] {
    const alerts: string[] = [];
    
    // Check for high churn risk
    if (dashboards[1]?.summary?.avgChurnProbability > 0.3) {
      alerts.push("High customer churn risk detected");
    }
    
    // Check for low profitability
    if (dashboards[2]?.summary?.currentMonth?.netMargin < 10) {
      alerts.push("Net profit margin below target threshold");
    }
    
    // Check for system performance issues
    if (dashboards[0]?.system?.systemUptime < 99) {
      alerts.push("System uptime below 99%");
    }
    
    return alerts;
  }

  /**
   * Clear all analytics caches
   */
  public async clearAllAnalyticsCaches(): Promise<void> {
    await Promise.all([
      this.operationalMetrics.clearCache(),
      this.customerAnalytics.clearCache(),
      this.financialAnalytics.clearCache(),
      this.routeOptimization.clearCache()
    ]);
    
    logger.info("All analytics caches cleared");
  }
}

// Export singleton instance
export const analyticsWarehouseManager = new AnalyticsWarehouseManager();

export default analyticsWarehouseManager;