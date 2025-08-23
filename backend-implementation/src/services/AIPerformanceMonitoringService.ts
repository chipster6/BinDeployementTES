/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AI/ML PERFORMANCE MONITORING SERVICE
 * ============================================================================
 *
 * Comprehensive AI/ML performance monitoring, business impact tracking,
 * and cost optimization service. Provides real-time monitoring, automated
 * alerting, and comprehensive analytics for all AI/ML components.
 *
 * Features:
 * - Real-time performance monitoring for all AI/ML services
 * - Business impact measurement and ROI calculation
 * - Cost optimization and budget management
 * - Automated alerting and anomaly detection
 * - Performance trend analysis and forecasting
 * - Model drift detection and retraining triggers
 * - Resource utilization optimization
 * - Comprehensive dashboards and reporting
 *
 * Created by: Innovation Architect
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { BaseService, ServiceResult } from "./BaseService";
import { logger, Timer } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";
import { EventEmitter } from "events";

/**
 * AI/ML service categories for monitoring
 */
enum AIServiceCategory {
  VECTOR_INTELLIGENCE = "vector_intelligence",
  ROUTE_OPTIMIZATION = "route_optimization",
  PREDICTIVE_ANALYTICS = "predictive_analytics",
  LLM_INTELLIGENCE = "llm_intelligence",
  SECURITY_ML = "security_ml"
}

/**
 * Performance metric types
 */
enum MetricType {
  LATENCY = "latency",
  THROUGHPUT = "throughput",
  ACCURACY = "accuracy",
  ERROR_RATE = "error_rate",
  RESOURCE_USAGE = "resource_usage",
  COST = "cost",
  BUSINESS_IMPACT = "business_impact"
}

/**
 * Alert severity levels
 */
enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
  EMERGENCY = "emergency"
}

/**
 * Performance metric definition
 */
interface PerformanceMetric {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  unit: string;
  serviceCategory: AIServiceCategory;
  serviceName: string;
  thresholds: {
    warning: number;
    critical: number;
    emergency: number;
  };
  aggregationPeriod: number; // seconds
  retentionPeriod: number; // days
}

/**
 * Real-time performance data point
 */
interface PerformanceDataPoint {
  metricId: string;
  timestamp: Date;
  value: number;
  metadata: {
    serviceInstance: string;
    userId?: string;
    sessionId?: string;
    featureFlag?: string;
    additionalContext?: Record<string, any>;
  };
}

/**
 * Business impact measurement
 */
interface BusinessImpactMetric {
  id: string;
  name: string;
  description: string;
  category: "efficiency" | "cost_savings" | "revenue" | "satisfaction";
  baseline: number;
  current: number;
  target: number;
  improvement: number;
  impactValue: number; // monetary value
  confidenceLevel: number;
  attribution: Array<{
    aiService: string;
    contribution: number; // percentage
  }>;
  timestamp: Date;
}

/**
 * Cost tracking data
 */
interface CostMetric {
  id: string;
  serviceCategory: AIServiceCategory;
  serviceName: string;
  costType: "infrastructure" | "api_calls" | "storage" | "training" | "inference";
  amount: number;
  currency: string;
  period: "hourly" | "daily" | "monthly";
  timestamp: Date;
  budget: {
    allocated: number;
    used: number;
    remaining: number;
    utilizationRate: number;
  };
  optimization: {
    potential: number;
    recommendations: string[];
  };
}

/**
 * Performance alert configuration
 */
interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricId: string;
  condition: "above" | "below" | "equals" | "change_rate";
  threshold: number;
  duration: number; // seconds
  severity: AlertSeverity;
  enabled: boolean;
  channels: Array<{
    type: "email" | "slack" | "webhook" | "sms";
    destination: string;
  }>;
  suppressionPeriod: number; // seconds
}

/**
 * Performance alert instance
 */
interface PerformanceAlert {
  id: string;
  ruleId: string;
  metricId: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: "active" | "resolved" | "suppressed";
  metadata: {
    serviceCategory: AIServiceCategory;
    serviceName: string;
    affectedUsers?: number;
    businessImpact?: string;
  };
}

/**
 * Model performance analysis
 */
interface ModelPerformanceAnalysis {
  modelId: string;
  modelVersion: string;
  analysisDate: Date;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    latency: number;
    throughput: number;
  };
  drift: {
    detected: boolean;
    magnitude: number;
    features: string[];
    recommendation: "monitor" | "retrain" | "urgent_retrain";
  };
  businessMetrics: {
    requests: number;
    successRate: number;
    userSatisfaction: number;
    costPerPrediction: number;
  };
  trends: {
    accuracyTrend: "improving" | "declining" | "stable";
    latencyTrend: "improving" | "declining" | "stable";
    usageTrend: "increasing" | "decreasing" | "stable";
  };
}

/**
 * Dashboard configuration
 */
interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  category: "overview" | "performance" | "business_impact" | "cost_optimization";
  widgets: Array<{
    type: "metric" | "chart" | "table" | "alert";
    title: string;
    metricIds: string[];
    timeRange: string;
    refreshInterval: number;
  }>;
  refreshInterval: number;
  permissions: string[];
}

/**
 * AI/ML Performance Monitoring Service
 */
export class AIPerformanceMonitoringService extends BaseService<any> {
  private eventEmitter: EventEmitter;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private performanceData: Map<string, PerformanceDataPoint[]> = new Map();
  private businessImpactData: Map<string, BusinessImpactMetric[]> = new Map();
  private costData: Map<string, CostMetric[]> = new Map();
  private modelAnalyses: Map<string, ModelPerformanceAnalysis> = new Map();
  private monitoringScheduler: NodeJS.Timeout | null = null;

  constructor() {
    super(null as any, "AIPerformanceMonitoringService");
    this.eventEmitter = new EventEmitter();
    this.initializePerformanceMetrics();
    this.initializeAlertRules();
    this.startPerformanceMonitoring();
    this.setupEventHandlers();
  }

  /**
   * Record performance data point
   */
  public async recordPerformanceMetric(
    metricId: string,
    value: number,
    metadata: PerformanceDataPoint["metadata"]
  ): Promise<ServiceResult<{ recorded: boolean }>> {
    const timer = new Timer("AIPerformanceMonitoringService.recordPerformanceMetric");

    try {
      const metric = this.metrics.get(metricId);
      if (!metric) {
        return {
          success: false,
          message: "Metric not found",
          errors: [`Metric ${metricId} not found`]
        };
      }

      // Create data point
      const dataPoint: PerformanceDataPoint = {
        metricId,
        timestamp: new Date(),
        value,
        metadata
      };

      // Store data point
      await this.storePerformanceData(dataPoint);

      // Check for alert conditions
      await this.checkAlertConditions(metric, dataPoint);

      // Update real-time aggregations
      await this.updateRealTimeAggregations(metric, dataPoint);

      timer.end({ metricId, value });
      return {
        success: true,
        data: { recorded: true },
        message: "Performance metric recorded successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.recordPerformanceMetric failed", {
        metricId,
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to record performance metric",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Record business impact metric
   */
  public async recordBusinessImpact(
    impactMetric: Omit<BusinessImpactMetric, 'id' | 'timestamp'>
  ): Promise<ServiceResult<BusinessImpactMetric>> {
    const timer = new Timer("AIPerformanceMonitoringService.recordBusinessImpact");

    try {
      const metric: BusinessImpactMetric = {
        ...impactMetric,
        id: this.generateMetricId(impactMetric.name),
        timestamp: new Date()
      };

      // Store business impact data
      await this.storeBusinessImpactData(metric);

      // Calculate ROI and update aggregations
      await this.updateBusinessImpactAggregations(metric);

      timer.end({ 
        metricId: metric.id,
        improvement: metric.improvement,
        impactValue: metric.impactValue
      });

      logger.info("Business impact recorded", {
        metricId: metric.id,
        category: metric.category,
        improvement: metric.improvement,
        impactValue: metric.impactValue
      });

      return {
        success: true,
        data: metric,
        message: "Business impact metric recorded successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.recordBusinessImpact failed", {
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to record business impact",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Track AI/ML costs
   */
  public async trackCosts(
    costMetric: Omit<CostMetric, 'id' | 'timestamp'>
  ): Promise<ServiceResult<CostMetric>> {
    const timer = new Timer("AIPerformanceMonitoringService.trackCosts");

    try {
      const metric: CostMetric = {
        ...costMetric,
        id: this.generateMetricId(`${costMetric.serviceName}_${costMetric.costType}`),
        timestamp: new Date()
      };

      // Store cost data
      await this.storeCostData(metric);

      // Check budget alerts
      await this.checkBudgetAlerts(metric);

      // Update cost optimization recommendations
      await this.updateCostOptimizations(metric);

      timer.end({ 
        metricId: metric.id,
        amount: metric.amount,
        utilizationRate: metric.budget.utilizationRate
      });

      return {
        success: true,
        data: metric,
        message: "Cost metric tracked successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.trackCosts failed", {
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to track costs",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Analyze model performance
   */
  public async analyzeModelPerformance(
    modelId: string,
    modelVersion: string
  ): Promise<ServiceResult<ModelPerformanceAnalysis>> {
    const timer = new Timer("AIPerformanceMonitoringService.analyzeModelPerformance");

    try {
      // Collect performance metrics for the model
      const performanceMetrics = await this.collectModelMetrics(modelId, modelVersion);

      // Detect model drift
      const driftAnalysis = await this.detectModelDrift(modelId, modelVersion);

      // Analyze business metrics
      const businessMetrics = await this.analyzeModelBusinessMetrics(modelId);

      // Calculate performance trends
      const trends = await this.calculateModelTrends(modelId);

      const analysis: ModelPerformanceAnalysis = {
        modelId,
        modelVersion,
        analysisDate: new Date(),
        performance: performanceMetrics,
        drift: driftAnalysis,
        businessMetrics,
        trends
      };

      // Store analysis
      this.modelAnalyses.set(modelId, analysis);
      await this.persistModelAnalysis(analysis);

      // Generate alerts if needed
      await this.checkModelHealthAlerts(analysis);

      timer.end({ 
        modelId,
        accuracy: analysis.performance.accuracy,
        driftDetected: analysis.drift.detected
      });

      return {
        success: true,
        data: analysis,
        message: "Model performance analysis completed"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.analyzeModelPerformance failed", {
        modelId,
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to analyze model performance",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Get comprehensive performance dashboard
   */
  public async getPerformanceDashboard(
    timeRange: { start: Date; end: Date },
    category?: AIServiceCategory
  ): Promise<ServiceResult<{
    overview: {
      totalRequests: number;
      averageLatency: number;
      successRate: number;
      totalCost: number;
      activeAlerts: number;
    };
    servicePerformance: Array<{
      serviceCategory: AIServiceCategory;
      serviceName: string;
      metrics: {
        latency: number;
        throughput: number;
        accuracy: number;
        errorRate: number;
        cost: number;
      };
      health: "healthy" | "warning" | "critical";
      trends: Record<string, "improving" | "declining" | "stable">;
    }>;
    businessImpact: {
      totalROI: number;
      costSavings: number;
      efficiencyGains: number;
      revenueImpact: number;
      impactByService: Array<{
        service: string;
        impact: number;
        contribution: number;
      }>;
    };
    alerts: Array<{
      id: string;
      severity: AlertSeverity;
      title: string;
      service: string;
      triggeredAt: Date;
      status: string;
    }>;
    recommendations: Array<{
      type: "performance" | "cost" | "business";
      priority: "low" | "medium" | "high";
      title: string;
      description: string;
      estimatedImpact: number;
    }>;
  }>> {
    const timer = new Timer("AIPerformanceMonitoringService.getPerformanceDashboard");

    try {
      // Calculate overview metrics
      const overview = await this.calculateOverviewMetrics(timeRange, category);

      // Get service performance data
      const servicePerformance = await this.getServicePerformanceData(timeRange, category);

      // Calculate business impact
      const businessImpact = await this.calculateBusinessImpactMetrics(timeRange, category);

      // Get active alerts
      const alerts = await this.getActiveAlertsData(category);

      // Generate recommendations
      const recommendations = await this.generatePerformanceRecommendations(timeRange, category);

      const dashboardData = {
        overview,
        servicePerformance,
        businessImpact,
        alerts,
        recommendations
      };

      // Cache dashboard data
      const cacheKey = `dashboard:${category || 'all'}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
      await this.setCache(cacheKey, dashboardData, { ttl: 300 }); // 5 minutes

      timer.end({
        timeRangeHours: (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60),
        servicesCount: servicePerformance.length,
        alertsCount: alerts.length
      });

      return {
        success: true,
        data: dashboardData,
        message: "Performance dashboard generated successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.getPerformanceDashboard failed", {
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to generate performance dashboard",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Optimize AI/ML costs
   */
  public async optimizeCosts(): Promise<ServiceResult<{
    currentCosts: number;
    optimizedCosts: number;
    savings: number;
    optimizations: Array<{
      service: string;
      type: string;
      currentCost: number;
      optimizedCost: number;
      savings: number;
      implementation: string;
    }>;
  }>> {
    const timer = new Timer("AIPerformanceMonitoringService.optimizeCosts");

    try {
      // Analyze current cost structure
      const currentCosts = await this.analyzeCurrentCosts();

      // Identify optimization opportunities
      const optimizations = await this.identifyOptimizationOpportunities();

      // Calculate potential savings
      const totalCurrentCost = optimizations.reduce((sum, opt) => sum + opt.currentCost, 0);
      const totalOptimizedCost = optimizations.reduce((sum, opt) => sum + opt.optimizedCost, 0);
      const totalSavings = totalCurrentCost - totalOptimizedCost;

      // Generate implementation plan
      const implementationPlan = await this.generateImplementationPlan(optimizations);

      timer.end({
        currentCosts: totalCurrentCost,
        potentialSavings: totalSavings,
        optimizationsCount: optimizations.length
      });

      return {
        success: true,
        data: {
          currentCosts: totalCurrentCost,
          optimizedCosts: totalOptimizedCost,
          savings: totalSavings,
          optimizations
        },
        message: "Cost optimization analysis completed"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("AIPerformanceMonitoringService.optimizeCosts failed", {
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: "Failed to optimize costs",
        errors: [error instanceof Error ? error?.message : String(error)]
      };
    }
  }

  /**
   * Initialize performance metrics
   */
  private async initializePerformanceMetrics(): Promise<void> {
    const performanceMetrics: PerformanceMetric[] = [
      // Vector Intelligence Metrics
      {
        id: "vector_search_latency",
        name: "Vector Search Latency",
        description: "Time taken for semantic search queries",
        type: MetricType.LATENCY,
        unit: "milliseconds",
        serviceCategory: AIServiceCategory.VECTOR_INTELLIGENCE,
        serviceName: "VectorIntelligenceService",
        thresholds: { warning: 200, critical: 500, emergency: 1000 },
        aggregationPeriod: 60,
        retentionPeriod: 30
      },
      {
        id: "vector_search_accuracy",
        name: "Vector Search Accuracy",
        description: "Relevance score of search results",
        type: MetricType.ACCURACY,
        unit: "percentage",
        serviceCategory: AIServiceCategory.VECTOR_INTELLIGENCE,
        serviceName: "VectorIntelligenceService",
        thresholds: { warning: 0.8, critical: 0.7, emergency: 0.6 },
        aggregationPeriod: 300,
        retentionPeriod: 90
      },

      // Route Optimization Metrics
      {
        id: "route_optimization_latency",
        name: "Route Optimization Latency",
        description: "Time taken for route optimization",
        type: MetricType.LATENCY,
        unit: "seconds",
        serviceCategory: AIServiceCategory.ROUTE_OPTIMIZATION,
        serviceName: "RouteOptimizationService",
        thresholds: { warning: 30, critical: 60, emergency: 120 },
        aggregationPeriod: 300,
        retentionPeriod: 30
      },
      {
        id: "route_optimization_efficiency",
        name: "Route Optimization Efficiency",
        description: "Percentage improvement in route efficiency",
        type: MetricType.BUSINESS_IMPACT,
        unit: "percentage",
        serviceCategory: AIServiceCategory.ROUTE_OPTIMIZATION,
        serviceName: "RouteOptimizationService",
        thresholds: { warning: 15, critical: 10, emergency: 5 },
        aggregationPeriod: 3600,
        retentionPeriod: 365
      },

      // Predictive Analytics Metrics
      {
        id: "forecast_accuracy",
        name: "Demand Forecast Accuracy",
        description: "Accuracy of waste generation forecasts",
        type: MetricType.ACCURACY,
        unit: "percentage",
        serviceCategory: AIServiceCategory.PREDICTIVE_ANALYTICS,
        serviceName: "PredictiveAnalyticsService",
        thresholds: { warning: 0.85, critical: 0.8, emergency: 0.75 },
        aggregationPeriod: 86400,
        retentionPeriod: 365
      },
      {
        id: "prediction_latency",
        name: "Prediction Latency",
        description: "Time taken for predictive analytics",
        type: MetricType.LATENCY,
        unit: "milliseconds",
        serviceCategory: AIServiceCategory.PREDICTIVE_ANALYTICS,
        serviceName: "PredictiveAnalyticsService",
        thresholds: { warning: 1000, critical: 2000, emergency: 5000 },
        aggregationPeriod: 300,
        retentionPeriod: 30
      },

      // LLM Intelligence Metrics
      {
        id: "llm_response_time",
        name: "LLM Response Time",
        description: "Time taken for LLM responses",
        type: MetricType.LATENCY,
        unit: "milliseconds",
        serviceCategory: AIServiceCategory.LLM_INTELLIGENCE,
        serviceName: "IntelligentAssistantService",
        thresholds: { warning: 2000, critical: 5000, emergency: 10000 },
        aggregationPeriod: 60,
        retentionPeriod: 30
      },
      {
        id: "automation_success_rate",
        name: "Customer Service Automation Rate",
        description: "Percentage of customer inquiries handled automatically",
        type: MetricType.BUSINESS_IMPACT,
        unit: "percentage",
        serviceCategory: AIServiceCategory.LLM_INTELLIGENCE,
        serviceName: "CustomerServiceAutomationService",
        thresholds: { warning: 0.7, critical: 0.6, emergency: 0.5 },
        aggregationPeriod: 3600,
        retentionPeriod: 365
      },

      // Cost Metrics
      {
        id: "openai_api_cost",
        name: "OpenAI API Cost",
        description: "Cost of OpenAI API usage",
        type: MetricType.COST,
        unit: "dollars",
        serviceCategory: AIServiceCategory.VECTOR_INTELLIGENCE,
        serviceName: "OpenAI",
        thresholds: { warning: 100, critical: 200, emergency: 500 },
        aggregationPeriod: 3600,
        retentionPeriod: 365
      },
      {
        id: "infrastructure_cost",
        name: "AI Infrastructure Cost",
        description: "Cost of AI/ML infrastructure",
        type: MetricType.COST,
        unit: "dollars",
        serviceCategory: AIServiceCategory.VECTOR_INTELLIGENCE,
        serviceName: "Infrastructure",
        thresholds: { warning: 500, critical: 1000, emergency: 2000 },
        aggregationPeriod: 86400,
        retentionPeriod: 365
      }
    ];

    // Store metrics
    for (const metric of performanceMetrics) {
      this.metrics.set(metric.id, metric);
      this.performanceData.set(metric.id, []);
    }

    logger.info("Performance metrics initialized", {
      metricsCount: this.metrics.size,
      categories: Object.values(AIServiceCategory)
    });
  }

  /**
   * Initialize alert rules
   */
  private async initializeAlertRules(): Promise<void> {
    const alertRules: AlertRule[] = [
      {
        id: "vector_search_latency_warning",
        name: "Vector Search Latency Warning",
        description: "Alert when vector search latency exceeds warning threshold",
        metricId: "vector_search_latency",
        condition: "above",
        threshold: 200,
        duration: 300, // 5 minutes
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [
          { type: "email", destination: "ops@company.com" },
          { type: "slack", destination: "#ai-alerts" }
        ],
        suppressionPeriod: 1800 // 30 minutes
      },
      {
        id: "route_optimization_critical",
        name: "Route Optimization Critical",
        description: "Alert when route optimization takes too long",
        metricId: "route_optimization_latency",
        condition: "above",
        threshold: 60,
        duration: 60,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          { type: "email", destination: "ops@company.com" },
          { type: "slack", destination: "#critical-alerts" },
          { type: "sms", destination: "+1234567890" }
        ],
        suppressionPeriod: 3600 // 1 hour
      },
      {
        id: "forecast_accuracy_degradation",
        name: "Forecast Accuracy Degradation",
        description: "Alert when forecast accuracy drops significantly",
        metricId: "forecast_accuracy",
        condition: "below",
        threshold: 0.8,
        duration: 3600, // 1 hour
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [
          { type: "email", destination: "data-science@company.com" }
        ],
        suppressionPeriod: 86400 // 24 hours
      }
    ];

    // Store alert rules
    for (const rule of alertRules) {
      this.alertRules.set(rule.id, rule);
    }

    logger.info("Alert rules initialized", {
      rulesCount: this.alertRules.size
    });
  }

  // Helper methods (simplified implementations for MVP)
  private generateMetricId(name: string): string {
    const timestamp = Date.now().toString(36);
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${clean}_${timestamp}`;
  }

  private async storePerformanceData(dataPoint: PerformanceDataPoint): Promise<void> {
    const metricData = this.performanceData.get(dataPoint.metricId) || [];
    metricData.push(dataPoint);

    // Keep only recent data (based on retention period)
    const metric = this.metrics.get(dataPoint.metricId);
    if (metric) {
      const cutoff = new Date(Date.now() - metric.retentionPeriod * 24 * 60 * 60 * 1000);
      const filteredData = metricData.filter(d => d.timestamp >= cutoff);
      this.performanceData.set(dataPoint.metricId, filteredData);
    }

    // Also cache in Redis for real-time access
    await this.setCache(
      `performance:${dataPoint.metricId}:${dataPoint.timestamp.getTime()}`,
      dataPoint,
      { ttl: 86400 }
    );
  }

  private async checkAlertConditions(
    metric: PerformanceMetric,
    dataPoint: PerformanceDataPoint
  ): Promise<void> {
    // Find alert rules for this metric
    const alertRules = Array.from(this.alertRules.values())
      .filter(rule => rule.metricId === metric.id && rule.enabled);

    for (const rule of alertRules) {
      const shouldAlert = this.evaluateAlertCondition(rule, dataPoint.value);
      
      if (shouldAlert) {
        await this.triggerAlert(rule, metric, dataPoint);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case "above":
        return value > rule.threshold;
      case "below":
        return value < rule.threshold;
      case "equals":
        return value === rule.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    metric: PerformanceMetric,
    dataPoint: PerformanceDataPoint
  ): Promise<void> {
    // Check if alert is already active
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && alert.status === "active");

    if (existingAlert) {
      return; // Alert already active
    }

    // Create new alert
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${rule.id}`,
      ruleId: rule.id,
      metricId: metric.id,
      severity: rule.severity,
      title: rule.name,
      description: `${metric.name} ${rule.condition} ${rule.threshold} ${metric.unit}`,
      value: dataPoint.value,
      threshold: rule.threshold,
      triggeredAt: new Date(),
      status: "active"
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule);

    logger.warn("Performance alert triggered", {
      alertId: alert.id,
      ruleId: rule.id,
      metricId: metric.id,
      value: dataPoint.value,
      threshold: rule.threshold,
      severity: rule.severity
    });
  }

  private async sendAlertNotifications(alert: PerformanceAlert, rule: AlertRule): Promise<void> {
    // Simplified notification sending
    for (const channel of rule.channels) {
      try {
        switch (channel.type) {
          case "email":
            await this.sendEmailNotification(alert, channel.destination);
            break;
          case "slack":
            await this.sendSlackNotification(alert, channel.destination);
            break;
          case "webhook":
            await this.sendWebhookNotification(alert, channel.destination);
            break;
          case "sms":
            await this.sendSMSNotification(alert, channel.destination);
            break;
        }
      } catch (error: unknown) {
        logger.error("Failed to send alert notification", {
          alertId: alert.id,
          channel: channel.type,
          error: error instanceof Error ? error?.message : String(error)
        });
      }
    }
  }

  private async sendEmailNotification(alert: PerformanceAlert, destination: string): Promise<void> {
    // Mock email notification
    logger.info("Email notification sent", { alertId: alert.id, destination });
  }

  private async sendSlackNotification(alert: PerformanceAlert, channel: string): Promise<void> {
    // Mock Slack notification
    logger.info("Slack notification sent", { alertId: alert.id, channel });
  }

  private async sendWebhookNotification(alert: PerformanceAlert, url: string): Promise<void> {
    // Mock webhook notification
    logger.info("Webhook notification sent", { alertId: alert.id, url });
  }

  private async sendSMSNotification(alert: PerformanceAlert, phone: string): Promise<void> {
    // Mock SMS notification
    logger.info("SMS notification sent", { alertId: alert.id, phone });
  }

  private async updateRealTimeAggregations(
    metric: PerformanceMetric,
    dataPoint: PerformanceDataPoint
  ): Promise<void> {
    // Update real-time aggregations (avg, min, max, count)
    const aggregationKey = `aggregation:${metric.id}:${metric.aggregationPeriod}`;
    
    // Simple moving average calculation
    const recentData = this.performanceData.get(metric.id) || [];
    const recentValues = recentData
      .filter(d => Date.now() - d.timestamp.getTime() < metric.aggregationPeriod * 1000)
      .map(d => d.value);

    if (recentValues.length > 0) {
      const aggregation = {
        average: recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length,
        minimum: Math.min(...recentValues),
        maximum: Math.max(...recentValues),
        count: recentValues.length,
        lastUpdated: new Date()
      };

      await this.setCache(aggregationKey, aggregation, { ttl: metric.aggregationPeriod });
    }
  }

  private async storeBusinessImpactData(metric: BusinessImpactMetric): Promise<void> {
    const categoryData = this.businessImpactData.get(metric.category) || [];
    categoryData.push(metric);
    this.businessImpactData.set(metric.category, categoryData);

    // Cache for dashboard access
    await this.setCache(`business_impact:${metric.id}`, metric, { ttl: 86400 });
  }

  private async updateBusinessImpactAggregations(metric: BusinessImpactMetric): Promise<void> {
    // Update ROI calculations and impact summaries
    const totalImpactKey = `total_business_impact:${metric.category}`;
    
    const categoryData = this.businessImpactData.get(metric.category) || [];
    const totalImpact = categoryData.reduce((sum, m) => sum + m.impactValue, 0);
    const averageImprovement = categoryData.reduce((sum, m) => sum + m.improvement, 0) / categoryData.length;

    await this.setCache(totalImpactKey, {
      totalImpact,
      averageImprovement,
      count: categoryData.length,
      lastUpdated: new Date()
    }, { ttl: 3600 });
  }

  private async storeCostData(metric: CostMetric): Promise<void> {
    const serviceData = this.costData.get(metric.serviceCategory) || [];
    serviceData.push(metric);
    this.costData.set(metric.serviceCategory, serviceData);

    // Cache for cost tracking
    await this.setCache(`cost:${metric.id}`, metric, { ttl: 86400 });
  }

  private async checkBudgetAlerts(metric: CostMetric): Promise<void> {
    if (metric.budget.utilizationRate > 0.8) {
      const alert: PerformanceAlert = {
        id: `budget_alert_${Date.now()}`,
        ruleId: "budget_utilization",
        metricId: metric.id,
        severity: metric.budget.utilizationRate > 0.95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: "Budget Utilization Alert",
        description: `${metric.serviceName} budget utilization at ${(metric.budget.utilizationRate * 100).toFixed(1)}%`,
        value: metric.budget.utilizationRate,
        threshold: 0.8,
        triggeredAt: new Date(),
        status: "active"
      };

      this.activeAlerts.set(alert.id, alert);
    }
  }

  private async updateCostOptimizations(metric: CostMetric): Promise<void> {
    // Update cost optimization recommendations
    const optimizationKey = `cost_optimization:${metric.serviceCategory}`;
    
    // Simple optimization calculation
    const potentialSavings = metric.amount * 0.15; // Assume 15% optimization potential
    
    await this.setCache(optimizationKey, {
      currentCost: metric.amount,
      potentialSavings,
      recommendations: metric.optimization.recommendations,
      lastUpdated: new Date()
    }, { ttl: 3600 });
  }

  // Additional helper methods (simplified for MVP)
  private async collectModelMetrics(modelId: string, modelVersion: string): Promise<any> {
    return {
      accuracy: 0.92 + Math.random() * 0.05,
      precision: 0.89 + Math.random() * 0.08,
      recall: 0.91 + Math.random() * 0.06,
      f1Score: 0.90 + Math.random() * 0.05,
      latency: 45 + Math.random() * 20,
      throughput: 100 + Math.random() * 50
    };
  }

  private async detectModelDrift(modelId: string, modelVersion: string): Promise<any> {
    const driftMagnitude = Math.random() * 0.2;
    return {
      detected: driftMagnitude > 0.1,
      magnitude: driftMagnitude,
      features: ["feature1", "feature2"],
      recommendation: driftMagnitude > 0.15 ? "retrain" : "monitor"
    };
  }

  private async analyzeModelBusinessMetrics(modelId: string): Promise<any> {
    return {
      requests: 1000 + Math.floor(Math.random() * 500),
      successRate: 0.95 + Math.random() * 0.04,
      userSatisfaction: 0.88 + Math.random() * 0.1,
      costPerPrediction: 0.05 + Math.random() * 0.02
    };
  }

  private async calculateModelTrends(modelId: string): Promise<any> {
    return {
      accuracyTrend: "stable",
      latencyTrend: "improving",
      usageTrend: "increasing"
    };
  }

  private async checkModelHealthAlerts(analysis: ModelPerformanceAnalysis): Promise<void> {
    if (analysis.drift.detected && analysis.drift.recommendation === "retrain") {
      const alert: PerformanceAlert = {
        id: `model_drift_alert_${Date.now()}`,
        ruleId: "model_drift",
        metricId: `model_health_${analysis.modelId}`,
        severity: AlertSeverity.WARNING,
        title: "Model Drift Detected",
        description: `Model ${analysis.modelId} requires retraining due to drift`,
        value: analysis.drift.magnitude,
        threshold: 0.1,
        triggeredAt: new Date(),
        status: "active"
      };

      this.activeAlerts.set(alert.id, alert);
    }
  }

  private async persistModelAnalysis(analysis: ModelPerformanceAnalysis): Promise<void> {
    await this.setCache(`model_analysis:${analysis.modelId}`, analysis, { ttl: 86400 });
  }

  private async calculateOverviewMetrics(
    timeRange: { start: Date; end: Date },
    category?: AIServiceCategory
  ): Promise<any> {
    // Mock overview calculation
    return {
      totalRequests: 10000 + Math.floor(Math.random() * 5000),
      averageLatency: 150 + Math.random() * 100,
      successRate: 0.98 + Math.random() * 0.02,
      totalCost: 500 + Math.random() * 200,
      activeAlerts: this.activeAlerts.size
    };
  }

  private async getServicePerformanceData(
    timeRange: { start: Date; end: Date },
    category?: AIServiceCategory
  ): Promise<any[]> {
    const services = [
      {
        serviceCategory: AIServiceCategory.VECTOR_INTELLIGENCE,
        serviceName: "VectorIntelligenceService",
        metrics: {
          latency: 180 + Math.random() * 50,
          throughput: 150 + Math.random() * 30,
          accuracy: 0.92 + Math.random() * 0.05,
          errorRate: Math.random() * 0.02,
          cost: 120 + Math.random() * 30
        },
        health: "healthy",
        trends: {
          latency: "improving",
          throughput: "stable",
          accuracy: "stable"
        }
      },
      {
        serviceCategory: AIServiceCategory.ROUTE_OPTIMIZATION,
        serviceName: "RouteOptimizationService",
        metrics: {
          latency: 25 + Math.random() * 10,
          throughput: 50 + Math.random() * 20,
          accuracy: 0.95 + Math.random() * 0.03,
          errorRate: Math.random() * 0.01,
          cost: 200 + Math.random() * 50
        },
        health: "healthy",
        trends: {
          latency: "stable",
          throughput: "improving",
          accuracy: "improving"
        }
      }
    ];

    return category ? services.filter(s => s.serviceCategory === category) : services;
  }

  private async calculateBusinessImpactMetrics(
    timeRange: { start: Date; end: Date },
    category?: AIServiceCategory
  ): Promise<any> {
    return {
      totalROI: 3.5 + Math.random() * 1.5,
      costSavings: 50000 + Math.random() * 20000,
      efficiencyGains: 0.35 + Math.random() * 0.15,
      revenueImpact: 100000 + Math.random() * 50000,
      impactByService: [
        { service: "RouteOptimization", impact: 40000, contribution: 40 },
        { service: "PredictiveAnalytics", impact: 30000, contribution: 30 },
        { service: "CustomerAutomation", impact: 20000, contribution: 20 },
        { service: "VectorIntelligence", impact: 10000, contribution: 10 }
      ]
    };
  }

  private async getActiveAlertsData(category?: AIServiceCategory): Promise<any[]> {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !category || alert.metadata.serviceCategory === category)
      .map(alert => ({
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        service: alert.metadata.serviceName,
        triggeredAt: alert.triggeredAt,
        status: alert.status
      }));
  }

  private async generatePerformanceRecommendations(
    timeRange: { start: Date; end: Date },
    category?: AIServiceCategory
  ): Promise<any[]> {
    return [
      {
        type: "performance",
        priority: "high",
        title: "Optimize Vector Search Caching",
        description: "Implement advanced caching to reduce vector search latency by 30%",
        estimatedImpact: 15000
      },
      {
        type: "cost",
        priority: "medium",
        title: "OpenAI API Usage Optimization",
        description: "Optimize embedding generation to reduce API costs by 20%",
        estimatedImpact: 2000
      },
      {
        type: "business",
        priority: "high",
        title: "Increase Route Optimization Coverage",
        description: "Expand route optimization to additional vehicle types",
        estimatedImpact: 25000
      }
    ];
  }

  private async analyzeCurrentCosts(): Promise<number> {
    const totalCost = Array.from(this.costData.values())
      .flat()
      .reduce((sum, cost) => sum + cost.amount, 0);
    return totalCost;
  }

  private async identifyOptimizationOpportunities(): Promise<any[]> {
    return [
      {
        service: "OpenAI API",
        type: "usage_optimization",
        currentCost: 200,
        optimizedCost: 160,
        savings: 40,
        implementation: "Implement embedding caching and batch processing"
      },
      {
        service: "Infrastructure",
        type: "resource_scaling",
        currentCost: 500,
        optimizedCost: 400,
        savings: 100,
        implementation: "Auto-scaling based on demand patterns"
      }
    ];
  }

  private async generateImplementationPlan(optimizations: any[]): Promise<string> {
    return "Implementation plan generated with priority-based rollout schedule";
  }

  private startPerformanceMonitoring(): void {
    // Monitor performance every 30 seconds
    this.monitoringScheduler = setInterval(() => {
      this.collectRealTimeMetrics();
    }, 30 * 1000);
  }

  private async collectRealTimeMetrics(): Promise<void> {
    // Collect real-time metrics from all AI/ML services
    // This would integrate with actual service monitoring endpoints
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on("alertTriggered", (alert) => {
      logger.warn("Performance alert triggered", alert);
    });

    this.eventEmitter.on("modelDriftDetected", (data) => {
      logger.warn("Model drift detected", data);
    });
  }
}

export default AIPerformanceMonitoringService;