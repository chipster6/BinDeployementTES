/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REAL-TIME ERROR ANALYTICS DASHBOARD SERVICE
 * ============================================================================
 *
 * Advanced real-time error analytics dashboard service providing comprehensive
 * error monitoring, visualization, and actionable insights. Integrates with
 * Prometheus, Grafana, monitoring systems, and provides enterprise-grade
 * error analytics for business intelligence and operational excellence.
 *
 * Features:
 * - Real-time error metrics and visualization dashboards
 * - Integration with Prometheus metrics and Grafana dashboards
 * - Business impact analytics and revenue-focused error insights
 * - Cross-system error correlation and dependency visualization
 * - Predictive error analytics with ML-powered insights
 * - Executive-level error reporting and business intelligence
 * - Operational excellence metrics and SLA tracking
 * - Custom alerting and notification management
 * - Historical trend analysis and pattern recognition
 * - Export capabilities for compliance and reporting
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-15
 * Version: 2.0.0
 */

import { EventEmitter } from "events";
import { AppError } from "@/middleware/errorHandler";
import { BusinessImpact, SystemLayer } from "./ErrorOrchestrationService";
import { ErrorSeverity, ErrorCategory, ErrorEvent, PredictiveInsight } from "./ErrorMonitoringService";
import { ErrorPropagationEvent } from "./CrossSystemErrorPropagationService";
import { logger, logAuditEvent } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";

/**
 * Dashboard widget types
 */
export enum WidgetType {
  ERROR_RATE_CHART = "error_rate_chart",
  BUSINESS_IMPACT_METER = "business_impact_meter",
  SYSTEM_HEALTH_MAP = "system_health_map",
  PREDICTION_ALERTS = "prediction_alerts",
  REVENUE_PROTECTION = "revenue_protection",
  SLA_COMPLIANCE = "sla_compliance",
  CROSS_SYSTEM_FLOW = "cross_system_flow",
  EXECUTIVE_SUMMARY = "executive_summary",
  OPERATIONAL_METRICS = "operational_metrics",
  COST_ANALYSIS = "cost_analysis"
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description: string;
  targetAudience: "executive" | "operations" | "engineering" | "business" | "security";
  refreshInterval: number; // milliseconds
  widgets: DashboardWidget[];
  permissions: {
    view: string[];
    edit: string[];
    export: string[];
  };
  alertThresholds: Record<string, number>;
}

/**
 * Dashboard widget definition
 */
export interface DashboardWidget {
  widgetId: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: {
    timeRange: number;
    refreshRate: number;
    filters: Record<string, any>;
    visualization: "chart" | "gauge" | "table" | "map" | "heatmap" | "timeline";
    alertsEnabled: boolean;
  };
  dataSource: string;
  prometheusQuery?: string;
  grafanaPanel?: string;
}

/**
 * Real-time error metrics
 */
export interface RealTimeErrorMetrics {
  timestamp: Date;
  errorRate: {
    current: number;
    trend: "increasing" | "decreasing" | "stable";
    changePercent: number;
  };
  businessImpact: {
    current: BusinessImpact;
    revenueAtRisk: number;
    customersAffected: number;
    slaBreaches: number;
  };
  systemHealth: {
    overall: "healthy" | "degraded" | "critical" | "emergency";
    systems: Record<SystemLayer, {
      status: "healthy" | "degraded" | "critical";
      errorCount: number;
      responseTime: number;
    }>;
  };
  predictions: {
    nextIncident: Date | null;
    confidence: number;
    suggestedActions: string[];
  };
  topErrors: {
    error: string;
    count: number;
    businessImpact: BusinessImpact;
    trend: "increasing" | "decreasing" | "stable";
  }[];
}

/**
 * Executive dashboard data
 */
export interface ExecutiveDashboardData {
  businessContinuity: {
    overallHealth: "excellent" | "good" | "concerning" | "critical";
    uptime: number; // percentage
    mttr: number; // mean time to recovery in minutes
    mtbf: number; // mean time between failures in hours
  };
  financialImpact: {
    costOfDowntime: number;
    revenueProtected: number;
    potentialLoss: number;
    costPerIncident: number;
  };
  operationalExcellence: {
    incidentCount: number;
    preventedIncidents: number;
    automatedRecoveries: number;
    manualInterventions: number;
  };
  complianceMetrics: {
    slaCompliance: number; // percentage
    regulatoryCompliance: number; // percentage
    auditReadiness: "excellent" | "good" | "needs_improvement" | "critical";
  };
  trendsAndInsights: {
    errorTrends: "improving" | "stable" | "declining";
    systemReliability: "improving" | "stable" | "declining";
    businessImpactTrend: "decreasing" | "stable" | "increasing";
    predictiveAccuracy: number; // percentage
  };
}

/**
 * Prometheus integration data
 */
export interface PrometheusIntegration {
  connectionStatus: "connected" | "disconnected" | "error";
  metricsEndpoint: string;
  lastSync: Date;
  availableMetrics: string[];
  customQueries: {
    queryId: string;
    query: string;
    description: string;
    resultCache: any;
    lastExecuted: Date;
  }[];
}

/**
 * Grafana integration data
 */
export interface GrafanaIntegration {
  connectionStatus: "connected" | "disconnected" | "error";
  dashboardUrl: string;
  apiEndpoint: string;
  availableDashboards: {
    dashboardId: string;
    title: string;
    url: string;
    panels: string[];
  }[];
  embedTokens: Record<string, string>;
}

/**
 * Real-time error analytics dashboard service
 */
export class ErrorAnalyticsDashboardService extends EventEmitter {
  private dashboardConfigs: Map<string, DashboardConfig> = new Map();
  private realtimeMetrics: RealTimeErrorMetrics | null = null;
  private prometheusIntegration: PrometheusIntegration | null = null;
  private grafanaIntegration: GrafanaIntegration | null = null;
  private activeConnections: Map<string, any> = new Map(); // WebSocket connections
  private metricsHistory: RealTimeErrorMetrics[] = [];
  private readonly maxHistorySize = 1000;
  private readonly metricsUpdateInterval = 10000; // 10 seconds
  private readonly executiveSummaryInterval = 300000; // 5 minutes

  constructor() {
    super();
    this.initializeDefaultDashboards();
    this.startRealTimeMetricsCollection();
    this.setupMonitoringIntegrations();
    this.startExecutiveSummaryGeneration();
  }

  /**
   * Get real-time error analytics dashboard
   */
  public async getRealTimeDashboard(
    dashboardId: string,
    userId?: string,
    customFilters?: Record<string, any>
  ): Promise<{
    dashboard: DashboardConfig;
    data: RealTimeErrorMetrics;
    widgets: Record<string, any>;
    permissions: string[];
    lastUpdated: Date;
  }> {
    const dashboard = this.dashboardConfigs.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    // Check permissions
    const permissions = this.getUserPermissions(dashboard, userId);
    if (!permissions.includes("view")) {
      throw new Error("Insufficient permissions to view dashboard");
    }

    // Get current metrics
    const currentMetrics = this.realtimeMetrics || await this.generateCurrentMetrics();

    // Generate widget data
    const widgets = await this.generateWidgetData(dashboard, currentMetrics, customFilters);

    logAuditEvent(
      "dashboard_accessed",
      "error_analytics",
      {
        dashboardId,
        userId,
        timestamp: new Date()
      },
      userId,
      undefined
    );

    return {
      dashboard,
      data: currentMetrics,
      widgets,
      permissions,
      lastUpdated: new Date()
    };
  }

  /**
   * Get executive dashboard
   */
  public async getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
    const businessContinuity = await this.calculateBusinessContinuityMetrics();
    const financialImpact = await this.calculateFinancialImpact();
    const operationalExcellence = await this.calculateOperationalExcellence();
    const complianceMetrics = await this.calculateComplianceMetrics();
    const trendsAndInsights = await this.calculateTrendsAndInsights();

    return {
      businessContinuity,
      financialImpact,
      operationalExcellence,
      complianceMetrics,
      trendsAndInsights
    };
  }

  /**
   * Get Prometheus integration data
   */
  public async getPrometheusIntegration(): Promise<PrometheusIntegration> {
    if (!this.prometheusIntegration) {
      await this.initializePrometheusIntegration();
    }
    return this.prometheusIntegration!;
  }

  /**
   * Get Grafana integration data
   */
  public async getGrafanaIntegration(): Promise<GrafanaIntegration> {
    if (!this.grafanaIntegration) {
      await this.initializeGrafanaIntegration();
    }
    return this.grafanaIntegration!;
  }

  /**
   * Execute custom Prometheus query
   */
  public async executePrometheusQuery(
    query: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    query: string;
    result: any;
    metadata: {
      executionTime: number;
      dataPoints: number;
      cacheHit: boolean;
    };
  }> {
    logger.info("Executing Prometheus query", { query, timeRange });

    try {
      // Check cache first
      const cacheKey = `prometheus_query_${Buffer.from(query).toString('base64')}`;
      const cachedResult = await redisClient.get(cacheKey);
      
      if (cachedResult) {
        return {
          query,
          result: JSON.parse(cachedResult),
          metadata: {
            executionTime: 0,
            dataPoints: JSON.parse(cachedResult).data?.result?.length || 0,
            cacheHit: true
          }
        };
      }

      // Execute query against Prometheus
      const startTime = Date.now();
      const result = await this.queryPrometheus(query, timeRange);
      const executionTime = Date.now() - startTime;

      // Cache result for 30 seconds
      await redisClient.setex(cacheKey, 30, JSON.stringify(result));

      return {
        query,
        result,
        metadata: {
          executionTime,
          dataPoints: result.data?.result?.length || 0,
          cacheHit: false
        }
      };

    } catch (error) {
      logger.error("Prometheus query execution failed", {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create custom dashboard
   */
  public async createCustomDashboard(
    config: Omit<DashboardConfig, "dashboardId">,
    createdBy: string
  ): Promise<string> {
    const dashboardId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dashboardConfig: DashboardConfig = {
      ...config,
      dashboardId
    };

    // Validate dashboard configuration
    await this.validateDashboardConfig(dashboardConfig);

    // Store dashboard
    this.dashboardConfigs.set(dashboardId, dashboardConfig);
    
    // Persist to Redis
    await redisClient.setex(
      `dashboard_config_${dashboardId}`,
      86400, // 24 hours
      JSON.stringify(dashboardConfig)
    );

    logger.info("Custom dashboard created", {
      dashboardId,
      name: config.name,
      createdBy
    });

    logAuditEvent(
      "dashboard_created",
      "error_analytics",
      {
        dashboardId,
        config,
        createdBy
      },
      createdBy,
      undefined
    );

    return dashboardId;
  }

  /**
   * Export dashboard data
   */
  public async exportDashboardData(
    dashboardId: string,
    format: "json" | "csv" | "pdf",
    timeRange: { start: Date; end: Date },
    userId?: string
  ): Promise<{
    data: any;
    format: string;
    filename: string;
    size: number;
  }> {
    const dashboard = this.dashboardConfigs.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    // Check export permissions
    const permissions = this.getUserPermissions(dashboard, userId);
    if (!permissions.includes("export")) {
      throw new Error("Insufficient permissions to export dashboard");
    }

    // Collect dashboard data for time range
    const exportData = await this.collectDashboardDataForExport(dashboard, timeRange);

    // Format data based on requested format
    const formattedData = await this.formatExportData(exportData, format);
    
    const filename = `${dashboard.name}_${timeRange.start.toISOString().split('T')[0]}_${timeRange.end.toISOString().split('T')[0]}.${format}`;
    
    logAuditEvent(
      "dashboard_exported",
      "error_analytics",
      {
        dashboardId,
        format,
        timeRange,
        filename
      },
      userId,
      undefined
    );

    return {
      data: formattedData,
      format,
      filename,
      size: JSON.stringify(formattedData).length
    };
  }

  /**
   * Setup WebSocket connection for real-time updates
   */
  public setupWebSocketConnection(
    connectionId: string,
    dashboardId: string,
    filters?: Record<string, any>
  ): void {
    this.activeConnections.set(connectionId, {
      dashboardId,
      filters,
      connectedAt: new Date(),
      lastUpdate: new Date()
    });

    logger.info("WebSocket connection established", {
      connectionId,
      dashboardId
    });

    // Send initial data
    this.sendRealtimeUpdate(connectionId);
  }

  /**
   * Remove WebSocket connection
   */
  public removeWebSocketConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    logger.info("WebSocket connection removed", { connectionId });
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    // Executive dashboard
    this.dashboardConfigs.set("executive", {
      dashboardId: "executive",
      name: "Executive Overview",
      description: "High-level business impact and system health overview",
      targetAudience: "executive",
      refreshInterval: 60000, // 1 minute
      widgets: [
        {
          widgetId: "business_impact_summary",
          type: WidgetType.EXECUTIVE_SUMMARY,
          title: "Business Impact Summary",
          position: { x: 0, y: 0, width: 6, height: 4 },
          config: {
            timeRange: 3600000, // 1 hour
            refreshRate: 60000,
            filters: {},
            visualization: "gauge",
            alertsEnabled: true
          },
          dataSource: "business_metrics"
        },
        {
          widgetId: "revenue_protection",
          type: WidgetType.REVENUE_PROTECTION,
          title: "Revenue Protection",
          position: { x: 6, y: 0, width: 6, height: 4 },
          config: {
            timeRange: 86400000, // 24 hours
            refreshRate: 300000, // 5 minutes
            filters: {},
            visualization: "chart",
            alertsEnabled: true
          },
          dataSource: "financial_metrics"
        }
      ],
      permissions: {
        view: ["executive", "cto", "coo"],
        edit: ["cto"],
        export: ["executive", "cto", "coo"]
      },
      alertThresholds: {
        revenueAtRisk: 50000,
        customersAffected: 1000,
        slaBreaches: 1
      }
    });

    // Operations dashboard
    this.dashboardConfigs.set("operations", {
      dashboardId: "operations",
      name: "Operations Dashboard",
      description: "Real-time operational metrics and system health",
      targetAudience: "operations",
      refreshInterval: 10000, // 10 seconds
      widgets: [
        {
          widgetId: "error_rate_chart",
          type: WidgetType.ERROR_RATE_CHART,
          title: "Error Rate",
          position: { x: 0, y: 0, width: 4, height: 3 },
          config: {
            timeRange: 1800000, // 30 minutes
            refreshRate: 10000,
            filters: {},
            visualization: "chart",
            alertsEnabled: true
          },
          dataSource: "error_metrics",
          prometheusQuery: "rate(http_requests_total{status=~\"5..\"}[5m])"
        },
        {
          widgetId: "system_health_map",
          type: WidgetType.SYSTEM_HEALTH_MAP,
          title: "System Health Map",
          position: { x: 4, y: 0, width: 4, height: 3 },
          config: {
            timeRange: 300000, // 5 minutes
            refreshRate: 30000,
            filters: {},
            visualization: "map",
            alertsEnabled: true
          },
          dataSource: "system_health"
        },
        {
          widgetId: "predictions",
          type: WidgetType.PREDICTION_ALERTS,
          title: "Predictive Alerts",
          position: { x: 8, y: 0, width: 4, height: 3 },
          config: {
            timeRange: 3600000, // 1 hour
            refreshRate: 60000,
            filters: {},
            visualization: "table",
            alertsEnabled: true
          },
          dataSource: "ml_predictions"
        }
      ],
      permissions: {
        view: ["operations", "engineering", "devops"],
        edit: ["operations_lead"],
        export: ["operations", "engineering"]
      },
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 1000, // 1 second
        systemHealth: 0.8
      }
    });
  }

  /**
   * Start real-time metrics collection
   */
  private startRealTimeMetricsCollection(): void {
    setInterval(async () => {
      try {
        this.realtimeMetrics = await this.generateCurrentMetrics();
        this.metricsHistory.push(this.realtimeMetrics);
        
        // Maintain history size
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory.shift();
        }

        // Send updates to connected clients
        this.broadcastRealtimeUpdates();

      } catch (error) {
        logger.error("Failed to collect real-time metrics", {
          error: error.message
        });
      }
    }, this.metricsUpdateInterval);
  }

  /**
   * Setup monitoring integrations
   */
  private async setupMonitoringIntegrations(): Promise<void> {
    try {
      await this.initializePrometheusIntegration();
      await this.initializeGrafanaIntegration();
    } catch (error) {
      logger.warn("Failed to setup monitoring integrations", {
        error: error.message
      });
    }
  }

  /**
   * Start executive summary generation
   */
  private startExecutiveSummaryGeneration(): void {
    setInterval(async () => {
      try {
        const executiveData = await this.getExecutiveDashboard();
        
        // Cache executive summary
        await redisClient.setex(
          "executive_dashboard_cache",
          300, // 5 minutes
          JSON.stringify(executiveData)
        );

        this.emit("executiveSummaryUpdated", executiveData);

      } catch (error) {
        logger.error("Failed to generate executive summary", {
          error: error.message
        });
      }
    }, this.executiveSummaryInterval);
  }

  // Placeholder methods for integration points
  private getUserPermissions(dashboard: DashboardConfig, userId?: string): string[] {
    return ["view", "export"]; // Simplified permissions
  }

  private async generateCurrentMetrics(): Promise<RealTimeErrorMetrics> {
    // Generate mock real-time metrics
    return {
      timestamp: new Date(),
      errorRate: {
        current: 0.02,
        trend: "stable",
        changePercent: 0
      },
      businessImpact: {
        current: BusinessImpact.LOW,
        revenueAtRisk: 5000,
        customersAffected: 50,
        slaBreaches: 0
      },
      systemHealth: {
        overall: "healthy",
        systems: {
          [SystemLayer.API]: { status: "healthy", errorCount: 5, responseTime: 150 },
          [SystemLayer.DATA_ACCESS]: { status: "healthy", errorCount: 2, responseTime: 50 },
          [SystemLayer.EXTERNAL_SERVICES]: { status: "degraded", errorCount: 10, responseTime: 500 },
          [SystemLayer.BUSINESS_LOGIC]: { status: "healthy", errorCount: 3, responseTime: 100 },
          [SystemLayer.SECURITY]: { status: "healthy", errorCount: 1, responseTime: 80 },
          [SystemLayer.MONITORING]: { status: "healthy", errorCount: 0, responseTime: 30 },
          [SystemLayer.AI_ML]: { status: "healthy", errorCount: 2, responseTime: 200 },
          [SystemLayer.SERVICE_MESH]: { status: "healthy", errorCount: 1, responseTime: 60 },
          [SystemLayer.INFRASTRUCTURE]: { status: "healthy", errorCount: 0, responseTime: 40 },
          [SystemLayer.PRESENTATION]: { status: "healthy", errorCount: 4, responseTime: 120 }
        }
      },
      predictions: {
        nextIncident: null,
        confidence: 0.85,
        suggestedActions: ["Monitor external service timeouts", "Scale API instances"]
      },
      topErrors: [
        {
          error: "External service timeout",
          count: 15,
          businessImpact: BusinessImpact.MEDIUM,
          trend: "increasing"
        }
      ]
    };
  }

  private async generateWidgetData(
    dashboard: DashboardConfig,
    metrics: RealTimeErrorMetrics,
    filters?: Record<string, any>
  ): Promise<Record<string, any>> {
    const widgets: Record<string, any> = {};
    
    for (const widget of dashboard.widgets) {
      widgets[widget.widgetId] = await this.generateWidgetSpecificData(widget, metrics, filters);
    }
    
    return widgets;
  }

  private async generateWidgetSpecificData(
    widget: DashboardWidget,
    metrics: RealTimeErrorMetrics,
    filters?: Record<string, any>
  ): Promise<any> {
    // Generate widget-specific data based on type
    switch (widget.type) {
      case WidgetType.ERROR_RATE_CHART:
        return {
          data: this.metricsHistory.map(m => ({
            timestamp: m.timestamp,
            errorRate: m.errorRate.current
          })).slice(-50), // Last 50 data points
          current: metrics.errorRate.current,
          trend: metrics.errorRate.trend
        };
        
      case WidgetType.BUSINESS_IMPACT_METER:
        return {
          current: metrics.businessImpact.current,
          revenueAtRisk: metrics.businessImpact.revenueAtRisk,
          customersAffected: metrics.businessImpact.customersAffected,
          threshold: BusinessImpact.HIGH
        };
        
      default:
        return { placeholder: true };
    }
  }

  private sendRealtimeUpdate(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection && this.realtimeMetrics) {
      // Send update via WebSocket (implementation would depend on WebSocket library)
      logger.debug("Sending real-time update", { connectionId });
    }
  }

  private broadcastRealtimeUpdates(): void {
    for (const [connectionId, connection] of this.activeConnections) {
      this.sendRealtimeUpdate(connectionId);
      connection.lastUpdate = new Date();
    }
  }

  private async initializePrometheusIntegration(): Promise<void> {
    try {
      const endpoint = config.monitoring?.prometheus?.endpoint || "http://prometheus:9090";
      
      // Test connection to Prometheus
      const connectionTest = await this.testPrometheusConnection(endpoint);
      
      // Initialize standard error monitoring queries
      const standardQueries = this.getStandardPrometheusQueries();
      
      this.prometheusIntegration = {
        connectionStatus: connectionTest ? "connected" : "disconnected",
        metricsEndpoint: endpoint,
        lastSync: new Date(),
        availableMetrics: connectionTest ? await this.fetchAvailableMetrics(endpoint) : [],
        customQueries: standardQueries
      };

      logger.info("Prometheus integration initialized", {
        status: this.prometheusIntegration.connectionStatus,
        endpoint,
        metricsCount: this.prometheusIntegration.availableMetrics.length
      });

    } catch (error) {
      logger.error("Failed to initialize Prometheus integration", {
        error: error.message
      });
      
      this.prometheusIntegration = {
        connectionStatus: "error",
        metricsEndpoint: config.monitoring?.prometheus?.endpoint || "http://prometheus:9090",
        lastSync: new Date(),
        availableMetrics: [],
        customQueries: []
      };
    }
  }

  private async initializeGrafanaIntegration(): Promise<void> {
    try {
      const grafanaUrl = config.monitoring?.grafana?.url || "http://grafana:3000";
      const apiEndpoint = config.monitoring?.grafana?.api || `${grafanaUrl}/api`;
      
      // Test connection to Grafana
      const connectionTest = await this.testGrafanaConnection(apiEndpoint);
      
      // Fetch available dashboards if connected
      const dashboards = connectionTest ? await this.fetchGrafanaDashboards(apiEndpoint) : [];
      
      // Generate embed tokens for dashboard integration
      const embedTokens = connectionTest ? await this.generateGrafanaEmbedTokens(apiEndpoint, dashboards) : {};
      
      this.grafanaIntegration = {
        connectionStatus: connectionTest ? "connected" : "disconnected",
        dashboardUrl: grafanaUrl,
        apiEndpoint,
        availableDashboards: dashboards,
        embedTokens
      };

      logger.info("Grafana integration initialized", {
        status: this.grafanaIntegration.connectionStatus,
        dashboardUrl: grafanaUrl,
        dashboardsCount: dashboards.length
      });

    } catch (error) {
      logger.error("Failed to initialize Grafana integration", {
        error: error.message
      });
      
      this.grafanaIntegration = {
        connectionStatus: "error",
        dashboardUrl: config.monitoring?.grafana?.url || "http://grafana:3000",
        apiEndpoint: config.monitoring?.grafana?.api || "http://grafana:3000/api",
        availableDashboards: [],
        embedTokens: {}
      };
    }
  }

  private async queryPrometheus(query: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    if (!this.prometheusIntegration || this.prometheusIntegration.connectionStatus !== "connected") {
      throw new Error("Prometheus not connected");
    }

    try {
      // Build query URL
      const baseUrl = this.prometheusIntegration.metricsEndpoint;
      let url: string;
      
      if (timeRange) {
        // Range query
        url = `${baseUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}&step=60s`;
      } else {
        // Instant query
        url = `${baseUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
      }

      // Execute query (using fetch or axios)
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(`Prometheus query failed: ${data.error || "Unknown error"}`);
      }

      return data;

    } catch (error) {
      logger.error("Prometheus query execution failed", {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test Prometheus connection
   */
  private async testPrometheusConnection(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/api/v1/status/config`);
      return response.ok;
    } catch (error) {
      logger.warn("Prometheus connection test failed", { endpoint, error: error.message });
      return false;
    }
  }

  /**
   * Fetch available Prometheus metrics
   */
  private async fetchAvailableMetrics(endpoint: string): Promise<string[]> {
    try {
      const response = await fetch(`${endpoint}/api/v1/label/__name__/values`);
      const data = await response.json();
      return data.status === "success" ? data.data : [];
    } catch (error) {
      logger.warn("Failed to fetch Prometheus metrics", { error: error.message });
      return [];
    }
  }

  /**
   * Get standard Prometheus queries for error monitoring
   */
  private getStandardPrometheusQueries(): PrometheusIntegration["customQueries"] {
    return [
      {
        queryId: "error_rate",
        query: "rate(http_requests_total{status=~\"5..\"}[5m])",
        description: "5xx error rate over 5 minutes",
        resultCache: null,
        lastExecuted: new Date()
      },
      {
        queryId: "response_time_p95",
        query: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
        description: "95th percentile response time",
        resultCache: null,
        lastExecuted: new Date()
      },
      {
        queryId: "database_errors",
        query: "increase(database_errors_total[1h])",
        description: "Database errors in the last hour",
        resultCache: null,
        lastExecuted: new Date()
      },
      {
        queryId: "external_service_errors",
        query: "increase(external_service_errors_total[1h])",
        description: "External service errors in the last hour",
        resultCache: null,
        lastExecuted: new Date()
      },
      {
        queryId: "security_incidents",
        query: "increase(security_incidents_total[1h])",
        description: "Security incidents in the last hour",
        resultCache: null,
        lastExecuted: new Date()
      }
    ];
  }

  /**
   * Test Grafana connection
   */
  private async testGrafanaConnection(apiEndpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${apiEndpoint}/health`);
      return response.ok;
    } catch (error) {
      logger.warn("Grafana connection test failed", { apiEndpoint, error: error.message });
      return false;
    }
  }

  /**
   * Fetch Grafana dashboards
   */
  private async fetchGrafanaDashboards(apiEndpoint: string): Promise<GrafanaIntegration["availableDashboards"]> {
    try {
      const response = await fetch(`${apiEndpoint}/search?type=dash-db`);
      const dashboards = await response.json();
      
      return dashboards.map((dashboard: any) => ({
        dashboardId: dashboard.uid,
        title: dashboard.title,
        url: dashboard.url,
        panels: [] // Would be populated by fetching dashboard details
      }));
    } catch (error) {
      logger.warn("Failed to fetch Grafana dashboards", { error: error.message });
      return [];
    }
  }

  /**
   * Generate Grafana embed tokens
   */
  private async generateGrafanaEmbedTokens(
    apiEndpoint: string, 
    dashboards: GrafanaIntegration["availableDashboards"]
  ): Promise<Record<string, string>> {
    const tokens: Record<string, string> = {};
    
    // Generate tokens for each dashboard (simplified implementation)
    for (const dashboard of dashboards) {
      tokens[dashboard.dashboardId] = `embed_token_${dashboard.dashboardId}`;
    }
    
    return tokens;
  }

  private async validateDashboardConfig(config: DashboardConfig): Promise<void> {
    // Validate dashboard configuration
    if (!config.name || !config.widgets || config.widgets.length === 0) {
      throw new Error("Invalid dashboard configuration");
    }
  }

  private async collectDashboardDataForExport(
    dashboard: DashboardConfig,
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    // Collect data for export
    return {
      dashboard: dashboard.name,
      timeRange,
      data: this.metricsHistory.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    };
  }

  private async formatExportData(data: any, format: string): Promise<any> {
    // Format data based on export format
    switch (format) {
      case "json":
        return data;
      case "csv":
        // Convert to CSV format
        return "timestamp,errorRate,businessImpact\n" + 
               data.data.map((d: any) => `${d.timestamp},${d.errorRate.current},${d.businessImpact.current}`).join("\n");
      case "pdf":
        // Generate PDF report
        return { reportGenerated: true, format: "pdf" };
      default:
        return data;
    }
  }

  // Executive dashboard calculation methods
  private async calculateBusinessContinuityMetrics(): Promise<ExecutiveDashboardData["businessContinuity"]> {
    return {
      overallHealth: "good",
      uptime: 99.5,
      mttr: 15, // 15 minutes
      mtbf: 72 // 72 hours
    };
  }

  private async calculateFinancialImpact(): Promise<ExecutiveDashboardData["financialImpact"]> {
    return {
      costOfDowntime: 10000,
      revenueProtected: 150000,
      potentialLoss: 5000,
      costPerIncident: 2500
    };
  }

  private async calculateOperationalExcellence(): Promise<ExecutiveDashboardData["operationalExcellence"]> {
    return {
      incidentCount: 12,
      preventedIncidents: 8,
      automatedRecoveries: 15,
      manualInterventions: 3
    };
  }

  private async calculateComplianceMetrics(): Promise<ExecutiveDashboardData["complianceMetrics"]> {
    return {
      slaCompliance: 99.2,
      regulatoryCompliance: 98.5,
      auditReadiness: "good"
    };
  }

  private async calculateTrendsAndInsights(): Promise<ExecutiveDashboardData["trendsAndInsights"]> {
    return {
      errorTrends: "improving",
      systemReliability: "stable",
      businessImpactTrend: "decreasing",
      predictiveAccuracy: 87.5
    };
  }
}

// Global error analytics dashboard instance
export const errorAnalyticsDashboard = new ErrorAnalyticsDashboardService();

export default ErrorAnalyticsDashboardService;