/**
 * ============================================================================
 * ERROR ANALYTICS SERVICE INTERFACE
 * ============================================================================
 * 
 * Interface for error analytics, reporting, and visualization service.
 * Handles error trend analysis, business impact reporting, and dashboard data.
 * 
 * Hub Authority Requirements:
 * - Real-time analytics processing
 * - Business impact analysis
 * - Dashboard data aggregation
 */

import { BusinessImpact, SystemLayer } from "../../services/ErrorOrchestrationService";

/**
 * Error analytics time range
 */
export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: "minute" | "hour" | "day" | "week" | "month";
}

/**
 * Error trend data point
 */
export interface ErrorTrendPoint {
  timestamp: Date;
  errorCount: number;
  errorRate: number;
  businessImpact: BusinessImpact;
  systemLayer: SystemLayer;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Business impact metrics
 */
export interface BusinessImpactMetrics {
  totalRevenueAtRisk: number;
  customersAffected: number;
  serviceDowntime: number; // minutes
  slaViolations: number;
  impactByLayer: Record<SystemLayer, {
    errorCount: number;
    revenueAtRisk: number;
    customersAffected: number;
  }>;
  recovery: {
    averageRecoveryTime: number;
    recoverySuccess: number; // percentage
  };
}

/**
 * System health metrics
 */
export interface SystemHealthMetrics {
  overallHealth: "healthy" | "degraded" | "critical" | "emergency";
  healthByLayer: Record<SystemLayer, {
    health: "healthy" | "degraded" | "critical";
    errorRate: number;
    uptime: number; // percentage
    responseTime: number;
  }>;
  trends: {
    improving: SystemLayer[];
    degrading: SystemLayer[];
    stable: SystemLayer[];
  };
}

/**
 * Anomaly detection results
 */
export interface AnomalyAnalytics {
  anomaliesDetected: number;
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topAnomalies: {
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    timestamp: Date;
    affectedMetrics: string[];
    businessImpact: BusinessImpact;
  }[];
  detectionAccuracy: number;
}

/**
 * Prevention strategy effectiveness
 */
export interface PreventionAnalytics {
  strategiesExecuted: number;
  successRate: number;
  costSavings: number;
  preventedErrors: number;
  topStrategies: {
    strategyId: string;
    name: string;
    executionCount: number;
    successRate: number;
    avgCostSavings: number;
    effectiveness: number;
  }[];
  roi: number;
}

/**
 * Dashboard data for visualization
 */
export interface DashboardData {
  summary: {
    totalErrors: number;
    errorRate: number;
    systemHealth: "healthy" | "degraded" | "critical" | "emergency";
    businessImpact: BusinessImpact;
    activeAnomalies: number;
  };
  trends: {
    errorTrend: ErrorTrendPoint[];
    healthTrend: {
      timestamp: Date;
      overallHealth: number; // 0-1 scale
      layerHealth: Record<SystemLayer, number>;
    }[];
  };
  realTime: {
    currentErrorRate: number;
    activeIncidents: number;
    systemStatus: Record<SystemLayer, "up" | "down" | "degraded">;
    lastUpdate: Date;
  };
}

/**
 * Error Analytics Service Interface
 * Hub Authority Requirement: Analytics and reporting functionality
 */
export interface IErrorAnalytics {
  /**
   * Get error trends over time period
   * Hub Requirement: Time-series error trend analysis
   */
  getErrorTrends(timeRange: AnalyticsTimeRange, filters?: {
    systemLayer?: SystemLayer;
    severity?: string[];
    businessImpact?: BusinessImpact[];
  }): Promise<ErrorTrendPoint[]>;

  /**
   * Calculate business impact metrics
   * Hub Requirement: Business impact analysis and reporting
   */
  getBusinessImpactMetrics(timeRange: AnalyticsTimeRange): Promise<BusinessImpactMetrics>;

  /**
   * Get system health metrics and analysis
   * Hub Requirement: System health monitoring and analysis
   */
  getSystemHealthMetrics(timeRange: AnalyticsTimeRange): Promise<SystemHealthMetrics>;

  /**
   * Get anomaly detection analytics
   * Hub Requirement: Anomaly detection performance analysis
   */
  getAnomalyAnalytics(timeRange: AnalyticsTimeRange): Promise<AnomalyAnalytics>;

  /**
   * Get prevention strategy effectiveness analytics
   * Hub Requirement: Prevention strategy performance analysis
   */
  getPreventionAnalytics(timeRange: AnalyticsTimeRange): Promise<PreventionAnalytics>;

  /**
   * Generate dashboard data for real-time monitoring
   * Hub Requirement: Dashboard data aggregation and formatting
   */
  getDashboardData(timeRange: AnalyticsTimeRange): Promise<DashboardData>;

  /**
   * Generate custom analytics report
   * Hub Requirement: Custom analytics and reporting
   */
  generateCustomReport(config: {
    title: string;
    timeRange: AnalyticsTimeRange;
    metrics: string[];
    filters: Record<string, any>;
    groupBy?: string[];
    format: "json" | "csv" | "pdf";
  }): Promise<{
    reportId: string;
    data: any;
    downloadUrl?: string;
  }>;

  /**
   * Get real-time analytics stream
   * Hub Requirement: Real-time analytics processing
   */
  getRealtimeAnalytics(): Promise<{
    errorRate: number;
    systemHealth: number;
    activeAnomalies: number;
    businessImpact: number;
    lastUpdate: Date;
  }>;

  /**
   * Export analytics data for external systems
   * Hub Requirement: Analytics data export capability
   */
  exportAnalyticsData(config: {
    timeRange: AnalyticsTimeRange;
    metrics: string[];
    format: "json" | "csv" | "parquet";
    destination?: "s3" | "gcs" | "local";
  }): Promise<{
    exportId: string;
    location: string;
    recordCount: number;
  }>;
}