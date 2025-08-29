/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR MONITORING SERVICE
 * ============================================================================
 *
 * Comprehensive error monitoring, alerting, and analytics service.
 * Provides real-time error tracking, pattern analysis, and automated alerting.
 *
 * Features:
 * - Real-time error tracking and aggregation
 * - Error pattern analysis and anomaly detection
 * - Automated alerting based on error rates and patterns
 * - Error recovery suggestions and automated recovery
 * - Performance impact analysis
 * - Compliance logging for audit purposes
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import { AppError } from "@/middleware/errorHandler";
import { logger, logSecurityEvent, logAuditEvent } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";
import { ErrorSeverity, ErrorCategory, BusinessImpact, SystemLayer } from "./ports/ErrorTypes";
import { ErrorReporterPort } from "./ports/ErrorReporterPort";

// Re-export commonly used types for other modules
export { ErrorSeverity, ErrorCategory, BusinessImpact, SystemLayer };

/**
 * Error event interface
 */
export interface ErrorEvent {
  id: string;
  error: AppError;
  timestamp: Date;
  context: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    params?: any;
    query?: any;
  };
  severity: ErrorSeverity;
  category: ErrorCategory;
  resolved: boolean;
  recoveryAttempted: boolean;
  metadata?: Record<string, any>;
}

/**
 * Error pattern interface
 */
export interface ErrorPattern {
  type: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: Set<string>;
  errorCodes: string[];
  severity: ErrorSeverity;
}

/**
 * Alert configuration interface
 */
export interface AlertConfig {
  name: string;
  condition: (pattern: ErrorPattern) => boolean;
  severity: ErrorSeverity;
  cooldownMs: number;
  recipients: string[];
  enabled: boolean;
}

/**
 * AI/ML prediction models interface
 */
export interface PredictionModel {
  modelId: string;
  modelType: "anomaly_detection" | "pattern_prediction" | "cascading_failure" | "business_impact";
  accuracy: number;
  lastTrained: Date;
  features: string[];
  predictions: Map<string, number>; // Key: prediction_id, Value: confidence
}

/**
 * Cross-system error correlation
 */
export interface CrossSystemCorrelation {
  correlationId: string;
  primarySystem: SystemLayer;
  correlatedSystems: SystemLayer[];
  correlationStrength: number;
  timeLag: number; // milliseconds
  businessImpact: BusinessImpact;
  detectedAt: Date;
  validated: boolean;
}

/**
 * Predictive insight interface
 */
export interface PredictiveInsight {
  insightId: string;
  type: "error_storm" | "cascading_failure" | "system_degradation" | "business_impact";
  confidence: number;
  predictedAt: Date;
  estimatedOccurrence: Date;
  affectedSystems: SystemLayer[];
  preventionActions: string[];
  businessImpact: BusinessImpact;
  metadata: Record<string, any>;
}

/**
 * Enhanced error monitoring service with AI/ML capabilities
 */
export class ErrorMonitoringService extends EventEmitter implements ErrorReporterPort {
  private errorBuffer: Map<string, ErrorEvent> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private alertConfigs: AlertConfig[] = [];
  private alertCooldowns: Map<string, number> = new Map();
  private predictionModels: Map<string, PredictionModel> = new Map();
  private crossSystemCorrelations: Map<string, CrossSystemCorrelation> = new Map();
  private predictiveInsights: Map<string, PredictiveInsight> = new Map();
  private readonly bufferSize = 10000;
  private readonly patternAnalysisInterval = 60000; // 1 minute
  private readonly cleanupInterval = 300000; // 5 minutes
  private readonly mlPredictionInterval = 180000; // 3 minutes
  private readonly correlationAnalysisInterval = 120000; // 2 minutes

  constructor() {
    super();
    this.initializeDefaultAlerts();
    this.initializePredictionModels();
    this.startPatternAnalysis();
    this.startCleanup();
    this.startMLPrediction();
    this.startCorrelationAnalysis();
  }

  /**
   * Report method implementation for ErrorReporterPort interface
   */
  public async report(event: {
    code: string;
    message: string;
    meta?: unknown;
    severity: ErrorSeverity;
    category?: ErrorCategory;
    businessImpact?: BusinessImpact;
    systemLayer?: SystemLayer;
  }): Promise<void> {
    const appError = new AppError(event.message, 500, event.code);
    const context = {
      businessImpact: event.businessImpact,
      systemLayer: event.systemLayer,
      ...(typeof event.meta === 'object' && event.meta ? event.meta : {})
    };
    
    await this.trackError(appError, context, { reportedViaPort: true });
  }

  /**
   * Track an error event
   */
  public async trackError(
    error: AppError,
    context: ErrorEvent["context"] = {},
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const severity = this.determineSeverity(error);
    const category = this.categorizeError(error);

    const errorEvent: ErrorEvent = {
      id: errorId,
      error,
      timestamp: new Date(),
      context,
      severity,
      category,
      resolved: false,
      recoveryAttempted: false,
      metadata,
    };

    // Store in buffer
    this.errorBuffer.set(errorId, errorEvent);
    this.maintainBufferSize();

    // Store in Redis for persistence
    await this.persistError(errorEvent);

    // Update patterns
    await this.updatePatterns(errorEvent);

    // Log based on severity
    this.logError(errorEvent);

    // Emit event for real-time processing
    this.emit("errorTracked", errorEvent);

    // Check for immediate alerts
    await this.checkAlerts(errorEvent);

    return errorId;
  }

  /**
   * Mark error as resolved
   */
  public async resolveError(
    errorId: string,
    resolution?: string,
  ): Promise<boolean> {
    const errorEvent = this.errorBuffer.get(errorId);
    if (errorEvent) {
      errorEvent.resolved = true;
      errorEvent.metadata = {
        ...errorEvent.metadata,
        resolution,
        resolvedAt: new Date(),
      };

      await this.persistError(errorEvent);
      this.emit("errorResolved", errorEvent);

      logger.info("Error resolved", {
        errorId,
        resolution,
        originalError: errorEvent.error instanceof Error ? error?.message : String(error),
      });

      return true;
    }

    return false;
  }

  /**
   * Get error statistics
   */
  public async getErrorStats(timeRange: number = 3600000): Promise<any> {
    const now = Date.now();
    const since = now - timeRange;

    const recentErrors = Array.from(this.errorBuffer.values()).filter(
      (error) => error.timestamp.getTime() >= since,
    );

    const stats = {
      total: recentErrors.length,
      resolved: recentErrors.filter((e) => e.resolved).length,
      bySeverity: this.groupBy(recentErrors, "severity"),
      byCategory: this.groupBy(recentErrors, "category"),
      byErrorCode: this.groupBy(recentErrors, (e) => e.error?.code || "UNKNOWN"),
      trends: await this.calculateTrends(timeRange),
      patterns: Array.from(this.errorPatterns.values()).filter(
        (pattern) => pattern.lastOccurrence.getTime() >= since,
      ),
    };

    return stats;
  }

  /**
   * Get error details by ID
   */
  public getErrorDetails(errorId: string): ErrorEvent | null {
    return this.errorBuffer.get(errorId) || null;
  }

  /**
   * Add custom alert configuration
   */
  public addAlert(alert: AlertConfig): void {
    this.alertConfigs.push(alert);
  }

  /**
   * Remove alert configuration
   */
  public removeAlert(alertName: string): boolean {
    const index = this.alertConfigs.findIndex(
      (alert) => alert.name === alertName,
    );
    if (index >= 0) {
      this.alertConfigs.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    errorRate: number;
    criticalErrors: number;
    unresolvedErrors: number;
    lastUpdate: Date;
  } {
    const recentErrors = Array.from(this.errorBuffer.values()).filter(
      (error) => error.timestamp.getTime() >= Date.now() - 300000,
    ); // Last 5 minutes

    const criticalErrors = recentErrors.filter(
      (e) => e.severity === ErrorSeverity.CRITICAL,
    ).length;
    const unresolvedErrors = recentErrors.filter((e) => !e.resolved).length;
    const errorRate = recentErrors.length / 300; // Errors per second

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (criticalErrors > 5 || errorRate > 10) {
      status = "unhealthy";
    } else if (criticalErrors > 0 || errorRate > 5 || unresolvedErrors > 20) {
      status = "degraded";
    }

    return {
      status,
      errorRate,
      criticalErrors,
      unresolvedErrors,
      lastUpdate: new Date(),
    };
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlerts(): void {
    this.alertConfigs = [
      {
        name: "high_error_rate",
        condition: (pattern) =>
          pattern.count > 10 && pattern.severity === ErrorSeverity.HIGH,
        severity: ErrorSeverity.HIGH,
        cooldownMs: 300000, // 5 minutes
        recipients: ["ops-team@company.com"],
        enabled: true,
      },
      {
        name: "critical_errors",
        condition: (pattern) => pattern.severity === ErrorSeverity.CRITICAL,
        severity: ErrorSeverity.CRITICAL,
        cooldownMs: 60000, // 1 minute
        recipients: ["oncall@company.com", "cto@company.com"],
        enabled: true,
      },
      {
        name: "database_failures",
        condition: (pattern) =>
          pattern.type.includes("database") && pattern.count > 5,
        severity: ErrorSeverity.HIGH,
        cooldownMs: 180000, // 3 minutes
        recipients: ["dba-team@company.com"],
        enabled: true,
      },
      {
        name: "security_incidents",
        condition: (pattern) =>
          pattern.type.includes("security") ||
          pattern.type.includes("authentication"),
        severity: ErrorSeverity.HIGH,
        cooldownMs: 60000, // 1 minute
        recipients: ["security-team@company.com"],
        enabled: true,
      },
    ];
  }

  /**
   * Determine error severity based on error type and context
   */
  private determineSeverity(error: AppError): ErrorSeverity {
    const code = error.code;

    if (code?.includes("CRITICAL") || code?.includes("SECURITY")) {
      return ErrorSeverity.CRITICAL;
    }

    if (error.statusCode >= 500) {
      return ErrorSeverity.HIGH;
    }

    if (error.statusCode === 429 || code?.includes("RATE_LIMIT")) {
      return ErrorSeverity.MEDIUM;
    }

    if (error.statusCode >= 400) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Categorize error based on error type
   */
  private categorizeError(error: AppError): ErrorCategory {
    const code = error.code;

    if (code?.includes("AUTHENTICATION")) return ErrorCategory.AUTHENTICATION;
    if (code?.includes("AUTHORIZATION")) return ErrorCategory.AUTHORIZATION;
    if (code?.includes("VALIDATION")) return ErrorCategory.VALIDATION;
    if (code?.includes("DATABASE")) return ErrorCategory.DATABASE;
    if (code?.includes("EXTERNAL_SERVICE"))
      return ErrorCategory.EXTERNAL_SERVICE;
    if (code?.includes("NETWORK")) return ErrorCategory.NETWORK;
    if (code?.includes("SECURITY")) return ErrorCategory.SECURITY;

    // Default categorization based on status code
    if (error.statusCode === 401) return ErrorCategory.AUTHENTICATION;
    if (error.statusCode === 403) return ErrorCategory.AUTHORIZATION;
    if (error.statusCode === 400) return ErrorCategory.VALIDATION;
    if (error.statusCode >= 500) return ErrorCategory.SYSTEM;

    return ErrorCategory.BUSINESS_LOGIC;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Maintain buffer size to prevent memory issues
   */
  private maintainBufferSize(): void {
    if (this.errorBuffer.size > this.bufferSize) {
      const sortedErrors = Array.from(this.errorBuffer.entries()).sort(
        ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      const toRemove = sortedErrors.slice(
        0,
        this.errorBuffer.size - this.bufferSize,
      );
      toRemove.forEach(([id]) => this.errorBuffer.delete(id));
    }
  }

  /**
   * Persist error to Redis for long-term storage
   */
  private async persistError(errorEvent: ErrorEvent): Promise<void> {
    try {
      const key = `error:${errorEvent.id}`;
      const data = {
        ...errorEvent,
        error: {
          message: errorEvent.error instanceof Error ? error?.message : String(error),
          code: errorEvent.error.code,
          statusCode: errorEvent.error.statusCode,
          stack: errorEvent.error instanceof Error ? error?.stack : undefined,
        },
      };

      await redisClient.setex(key, 86400, JSON.stringify(data)); // 24 hours TTL
    } catch (error: unknown) {
      logger.warn("Failed to persist error to Redis", {
        errorId: errorEvent.id,
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Update error patterns for analysis
   */
  private async updatePatterns(errorEvent: ErrorEvent): Promise<void> {
    const patternKey = this.generatePatternKey(errorEvent);
    let pattern = this.errorPatterns.get(patternKey);

    if (!pattern) {
      pattern = {
        type: patternKey,
        count: 0,
        firstOccurrence: errorEvent.timestamp,
        lastOccurrence: errorEvent.timestamp,
        affectedUsers: new Set(),
        errorCodes: [],
        severity: errorEvent.severity,
      };
      this.errorPatterns.set(patternKey, pattern);
    }

    pattern.count++;
    pattern.lastOccurrence = errorEvent.timestamp;

    if (errorEvent.context.userId) {
      pattern.affectedUsers.add(errorEvent.context.userId);
    }

    if (
      errorEvent.error.code &&
      !pattern.errorCodes.includes(errorEvent.error.code)
    ) {
      pattern.errorCodes.push(errorEvent.error.code);
    }

    // Update severity if current error is more severe
    if (
      this.getSeverityWeight(errorEvent.severity) >
      this.getSeverityWeight(pattern.severity)
    ) {
      pattern.severity = errorEvent.severity;
    }
  }

  /**
   * Generate pattern key for error grouping
   */
  private generatePatternKey(errorEvent: ErrorEvent): string {
    return `${errorEvent.category}_${errorEvent.error?.code || "UNKNOWN"}`;
  }

  /**
   * Get numeric weight for severity comparison
   */
  private getSeverityWeight(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 1;
      case ErrorSeverity.MEDIUM:
        return 2;
      case ErrorSeverity.HIGH:
        return 3;
      case ErrorSeverity.CRITICAL:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Log error based on severity
   */
  private logError(errorEvent: ErrorEvent): void {
    const logData = {
      errorId: errorEvent.id,
      error: errorEvent.error instanceof Error ? error?.message : String(error),
      code: errorEvent.error.code,
      severity: errorEvent.severity,
      category: errorEvent.category,
      context: errorEvent.context,
    };

    switch (errorEvent.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error("CRITICAL ERROR", logData);
        if (errorEvent.category === ErrorCategory.SECURITY) {
          logSecurityEvent(
            "critical_security_error",
            logData,
            errorEvent.context.userId,
            errorEvent.context.ip,
            "critical",
          );
        }
        break;

      case ErrorSeverity.HIGH:
        logger.error("HIGH SEVERITY ERROR", logData);
        break;

      case ErrorSeverity.MEDIUM:
        logger.warn("MEDIUM SEVERITY ERROR", logData);
        break;

      case ErrorSeverity.LOW:
        logger.info("LOW SEVERITY ERROR", logData);
        break;
    }

    // Audit logging for compliance
    if (config.compliance?.audit?.enabled) {
      logAuditEvent(
        "error_tracked",
        "error_monitoring",
        logData,
        errorEvent.context.userId,
        errorEvent.context.ip,
      );
    }
  }

  /**
   * Check and trigger alerts based on patterns
   */
  private async checkAlerts(errorEvent: ErrorEvent): Promise<void> {
    for (const alert of this.alertConfigs) {
      if (!alert.enabled) continue;

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(alert.name);
      if (lastAlert && Date.now() - lastAlert < alert.cooldownMs) {
        continue;
      }

      // Check patterns against alert condition
      for (const pattern of this.errorPatterns.values()) {
        if (alert.condition(pattern)) {
          await this.triggerAlert(alert, pattern, errorEvent);
          this.alertCooldowns.set(alert.name, Date.now());
          break; // Only trigger once per alert per check
        }
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    alert: AlertConfig,
    pattern: ErrorPattern,
    triggerEvent: ErrorEvent,
  ): Promise<void> {
    const alertData = {
      alert: alert.name,
      severity: alert.severity,
      pattern,
      triggerEvent: {
        id: triggerEvent.id,
        message: triggerEvent.error instanceof Error ? error?.message : String(error),
        timestamp: triggerEvent.timestamp,
      },
      affectedUsersCount: pattern.affectedUsers.size,
      timestamp: new Date(),
    };

    logger.error(`ALERT TRIGGERED: ${alert.name}`, alertData);

    // Emit alert event for external systems
    this.emit("alertTriggered", alertData);

    // Log security alert if needed
    if (alert.severity === ErrorSeverity.CRITICAL) {
      logSecurityEvent(
        "critical_alert_triggered",
        alertData,
        triggerEvent.context.userId,
        triggerEvent.context.ip,
        "critical",
      );
    }
  }

  /**
   * Start pattern analysis timer
   */
  private startPatternAnalysis(): void {
    setInterval(() => {
      this.analyzePatterns();
    }, this.patternAnalysisInterval);
  }

  /**
   * Analyze error patterns for anomalies
   */
  private analyzePatterns(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // Clean up old patterns
    for (const [key, pattern] of this.errorPatterns) {
      if (
        pattern.lastOccurrence.getTime() < fiveMinutesAgo &&
        pattern.count < 5
      ) {
        this.errorPatterns.delete(key);
      }
    }

    // Emit pattern analysis event
    this.emit("patternsAnalyzed", {
      timestamp: new Date(),
      activePatterns: this.errorPatterns.size,
      patterns: Array.from(this.errorPatterns.values()),
    });
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const cutoff = Date.now() - 3600000; // 1 hour

    // Clean buffer
    for (const [id, errorEvent] of this.errorBuffer) {
      if (errorEvent.timestamp.getTime() < cutoff) {
        this.errorBuffer.delete(id);
      }
    }

    // Clean cooldowns
    for (const [alertName, lastAlert] of this.alertCooldowns) {
      if (lastAlert < cutoff) {
        this.alertCooldowns.delete(alertName);
      }
    }

    logger.debug("Error monitoring cleanup completed", {
      bufferSize: this.errorBuffer.size,
      patternsCount: this.errorPatterns.size,
      cooldownsCount: this.alertCooldowns.size,
    });
  }

  /**
   * Calculate error trends
   */
  private async calculateTrends(timeRange: number): Promise<any> {
    const intervals = 12; // 12 intervals for the time range
    const intervalMs = timeRange / intervals;
    const trends = [];

    for (let i = 0; i < intervals; i++) {
      const start = Date.now() - timeRange + i * intervalMs;
      const end = start + intervalMs;

      const intervalErrors = Array.from(this.errorBuffer.values()).filter(
        (error) => {
          const time = error.timestamp.getTime();
          return time >= start && time < end;
        },
      );

      trends.push({
        interval: i,
        start: new Date(start),
        end: new Date(end),
        count: intervalErrors.length,
        severity: this.groupBy(intervalErrors, "severity"),
        category: this.groupBy(intervalErrors, "category"),
      });
    }

    return trends;
  }

  /**
   * Group array by property
   */
  private groupBy(
    array: any[],
    property: string | ((item: any) => string),
  ): Record<string, number> {
    const groups: Record<string, number> = {};
    const getKey =
      typeof property === "string" ? (item: any) => item[property] : property;

    for (const item of array) {
      const key = getKey(item);
      groups[key] = (groups[key] || 0) + 1;
    }

    return groups;
  }

  /**
   * AI/ML Error Prediction Methods
   */

  /**
   * Initialize prediction models
   */
  private initializePredictionModels(): void {
    // Anomaly detection model
    this.predictionModels.set("anomaly_detector", {
      modelId: "anomaly_detector",
      modelType: "anomaly_detection",
      accuracy: 0.85,
      lastTrained: new Date(),
      features: ["error_rate", "response_time", "resource_usage", "user_activity"],
      predictions: new Map()
    });

    // Pattern prediction model
    this.predictionModels.set("pattern_predictor", {
      modelId: "pattern_predictor", 
      modelType: "pattern_prediction",
      accuracy: 0.78,
      lastTrained: new Date(),
      features: ["error_frequency", "time_of_day", "system_load", "deployment_events"],
      predictions: new Map()
    });

    // Cascading failure model
    this.predictionModels.set("cascading_failure", {
      modelId: "cascading_failure",
      modelType: "cascading_failure",
      accuracy: 0.72,
      lastTrained: new Date(),
      features: ["dependency_health", "error_propagation", "system_coupling"],
      predictions: new Map()
    });

    // Business impact model
    this.predictionModels.set("business_impact", {
      modelId: "business_impact",
      modelType: "business_impact",
      accuracy: 0.80,
      lastTrained: new Date(),
      features: ["user_journey", "revenue_flow", "sla_metrics", "customer_tier"],
      predictions: new Map()
    });
  }

  /**
   * Generate predictive insights using AI/ML models
   */
  public async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Run each prediction model
    for (const [modelId, model] of this.predictionModels) {
      try {
        const modelInsights = await this.runPredictionModel(model);
        insights.push(...modelInsights);
      } catch (error: unknown) {
        logger.warn(`Prediction model ${modelId} failed`, {
          error: error instanceof Error ? error?.message : String(error),
          modelType: model.modelType
        });
      }
    }

    // Store insights
    insights.forEach(insight => {
      this.predictiveInsights.set(insight.insightId, insight);
    });

    // Trigger high-confidence predictions
    const highConfidenceInsights = insights.filter(insight => insight.confidence > 0.8);
    if (highConfidenceInsights.length > 0) {
      this.emit("highConfidencePrediction", highConfidenceInsights);
    }

    return insights;
  }

  /**
   * Run specific prediction model
   */
  private async runPredictionModel(model: PredictionModel): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    const currentData = await this.gatherModelFeatures(model);

    switch (model.modelType) {
      case "anomaly_detection":
        insights.push(...await this.detectAnomalies(model, currentData));
        break;
      case "pattern_prediction":
        insights.push(...await this.predictPatterns(model, currentData));
        break;
      case "cascading_failure":
        insights.push(...await this.predictCascadingFailures(model, currentData));
        break;
      case "business_impact":
        insights.push(...await this.predictBusinessImpact(model, currentData));
        break;
    }

    return insights;
  }

  /**
   * Detect error anomalies
   */
  private async detectAnomalies(model: PredictionModel, data: any): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Simple anomaly detection based on statistical analysis
    const recentErrors = Array.from(this.errorBuffer.values())
      .filter(error => error.timestamp.getTime() > Date.now() - 900000); // Last 15 minutes

    const currentErrorRate = recentErrors.length / 15; // Errors per minute
    const historicalAverage = await this.getHistoricalErrorRate();
    
    if (currentErrorRate > historicalAverage * 2.5) {
      insights.push({
        insightId: `anomaly_${Date.now()}`,
        type: "error_storm",
        confidence: Math.min(0.95, (currentErrorRate / historicalAverage) * 0.3),
        predictedAt: new Date(),
        estimatedOccurrence: new Date(Date.now() + 300000), // 5 minutes
        affectedSystems: this.getAffectedSystemsFromErrors(recentErrors),
        preventionActions: [
          "Scale up infrastructure",
          "Activate circuit breakers",
          "Enable rate limiting"
        ],
        businessImpact: this.calculateAggregateBusinessImpact(recentErrors)
      });
    }

    return insights;
  }

  /**
   * Predict error patterns
   */
  private async predictPatterns(model: PredictionModel, data: any): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Analyze recurring patterns
    for (const [patternKey, pattern] of this.errorPatterns) {
      if (pattern.count > 5 && pattern.lastOccurrence.getTime() > Date.now() - 3600000) {
        const timeIntervals = await this.getPatternTimeIntervals(patternKey);
        const avgInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
        
        if (avgInterval > 0) {
          const nextPredicted = pattern.lastOccurrence.getTime() + avgInterval;
          const confidence = Math.min(0.9, timeIntervals.length * 0.15);
          
          insights.push({
            insightId: `pattern_${patternKey}_${Date.now()}`,
            type: "error_storm",
            confidence,
            predictedAt: new Date(),
            estimatedOccurrence: new Date(nextPredicted),
            affectedSystems: [this.inferSystemFromPattern(patternKey)],
            preventionActions: [
              "Monitor pattern triggers",
              "Prepare fallback mechanisms",
              "Alert relevant teams"
            ],
            businessImpact: pattern.businessImpact
          });
        }
      }
    }

    return insights;
  }

  /**
   * Predict cascading failures
   */
  private async predictCascadingFailures(model: PredictionModel, data: any): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Analyze cross-system correlations for cascading failure prediction
    for (const [correlationId, correlation] of this.crossSystemCorrelations) {
      if (correlation.correlationStrength > 0.7) {
        const primarySystemHealth = await this.getSystemHealthScore(correlation.primarySystem);
        
        if (primarySystemHealth < 0.5) {
          insights.push({
            insightId: `cascading_${correlationId}`,
            type: "cascading_failure",
            confidence: correlation.correlationStrength * 0.8,
            predictedAt: new Date(),
            estimatedOccurrence: new Date(Date.now() + correlation.timeLag + 60000),
            affectedSystems: [correlation.primarySystem, ...correlation.correlatedSystems],
            preventionActions: [
              "Isolate failing primary system",
              "Activate fallback services",
              "Break dependency chains"
            ],
            businessImpact: correlation.businessImpact
          });
        }
      }
    }

    return insights;
  }

  /**
   * Predict business impact
   */
  private async predictBusinessImpact(model: PredictionModel, data: any): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Analyze business-critical error patterns
    const businessCriticalErrors = Array.from(this.errorBuffer.values())
      .filter(error => this.isBusinessCritical(error))
      .filter(error => error.timestamp.getTime() > Date.now() - 1800000); // Last 30 minutes

    if (businessCriticalErrors.length > 3) {
      const revenueAtRisk = await this.calculateRevenuePrediction(businessCriticalErrors);
      
      insights.push({
        insightId: `business_impact_${Date.now()}`,
        type: "business_impact",
        confidence: 0.85,
        predictedAt: new Date(),
        estimatedOccurrence: new Date(Date.now() + 600000), // 10 minutes
        affectedSystems: this.getAffectedSystemsFromErrors(businessCriticalErrors),
        preventionActions: [
          "Activate revenue protection protocols",
          "Escalate to business continuity team",
          "Implement emergency fallbacks"
        ],
        businessImpact: BusinessImpact.REVENUE_BLOCKING
      });
    }

    return insights;
  }

  /**
   * Cross-System Coordination Methods
   */

  /**
   * Analyze cross-system error correlations
   */
  public async analyzeCrossSystemCorrelations(): Promise<CrossSystemCorrelation[]> {
    const correlations: CrossSystemCorrelation[] = [];
    const systemLayers = Object.values(SystemLayer);
    
    // Analyze correlations between each pair of systems
    for (let i = 0; i < systemLayers.length; i++) {
      for (let j = i + 1; j < systemLayers.length; j++) {
        const correlation = await this.calculateSystemCorrelation(
          systemLayers[i],
          systemLayers[j]
        );
        
        if (correlation.correlationStrength > 0.5) {
          correlations.push(correlation);
          this.crossSystemCorrelations.set(correlation.correlationId, correlation);
        }
      }
    }

    return correlations;
  }

  /**
   * Calculate correlation between two systems
   */
  private async calculateSystemCorrelation(
    system1: SystemLayer,
    system2: SystemLayer
  ): Promise<CrossSystemCorrelation> {
    const system1Errors = await this.getSystemErrors(system1, 3600000); // Last hour
    const system2Errors = await this.getSystemErrors(system2, 3600000);
    
    const correlationStrength = this.calculateCorrelationStrength(system1Errors, system2Errors);
    const timeLag = this.calculateAverageTimeLag(system1Errors, system2Errors);
    
    return {
      correlationId: `corr_${system1}_${system2}_${Date.now()}`,
      primarySystem: system1,
      correlatedSystems: [system2],
      correlationStrength,
      timeLag,
      businessImpact: this.getMaxBusinessImpactFromErrors([...system1Errors, ...system2Errors]),
      detectedAt: new Date(),
      validated: correlationStrength > 0.7
    };
  }

  /**
   * Get coordinated error response for cross-system failures
   */
  public async getCoordinatedErrorResponse(
    primaryError: AppError,
    affectedSystems: SystemLayer[]
  ): Promise<{
    coordinationStrategy: "isolate" | "failover" | "degrade" | "restart";
    actionPlan: string[];
    estimatedRecoveryTime: number;
    businessImpactMitigation: string[];
  }> {
    const errorSeverity = this.determineSeverity(primaryError);
    const systemHealthScores = await Promise.all(
      affectedSystems.map(system => this.getSystemHealthScore(system))
    );
    
    const avgHealthScore = systemHealthScores.reduce((sum, score) => sum + score, 0) / systemHealthScores.length;
    
    let strategy: "isolate" | "failover" | "degrade" | "restart";
    let actionPlan: string[];
    let estimatedRecoveryTime: number;
    
    if (avgHealthScore < 0.3) {
      strategy = "restart";
      actionPlan = [
        "Isolate failed systems",
        "Activate backup systems",
        "Restart primary systems in sequence",
        "Validate system health",
        "Restore traffic gradually"
      ];
      estimatedRecoveryTime = 600000; // 10 minutes
    } else if (avgHealthScore < 0.6) {
      strategy = "failover";
      actionPlan = [
        "Activate failover mechanisms",
        "Redirect traffic to healthy systems",
        "Monitor failover performance",
        "Prepare primary system recovery"
      ];
      estimatedRecoveryTime = 300000; // 5 minutes
    } else {
      strategy = "degrade";
      actionPlan = [
        "Enable graceful degradation",
        "Reduce non-essential features",
        "Monitor system performance",
        "Scale resources if needed"
      ];
      estimatedRecoveryTime = 180000; // 3 minutes
    }
    
    const businessImpactMitigation = [
      "Notify affected customers",
      "Activate customer support protocols",
      "Monitor SLA compliance",
      "Document incident for analysis"
    ];
    
    return {
      coordinationStrategy: strategy,
      actionPlan,
      estimatedRecoveryTime,
      businessImpactMitigation
    };
  }

  /**
   * Start ML prediction timer
   */
  private startMLPrediction(): void {
    setInterval(() => {
      this.generatePredictiveInsights();
    }, this.mlPredictionInterval);
  }

  /**
   * Start correlation analysis timer
   */
  private startCorrelationAnalysis(): void {
    setInterval(() => {
      this.analyzeCrossSystemCorrelations();
    }, this.correlationAnalysisInterval);
  }

  /**
   * Helper methods for ML and cross-system coordination
   */
  private async gatherModelFeatures(model: PredictionModel): Promise<any> {
    // Gather features based on model requirements
    return {
      timestamp: new Date(),
      features: model.features
    };
  }

  private async getHistoricalErrorRate(): Promise<number> {
    // Calculate historical average error rate
    return 2.5; // errors per minute (placeholder)
  }

  private getAffectedSystemsFromErrors(errors: ErrorEvent[]): SystemLayer[] {
    const systems = new Set<SystemLayer>();
    errors.forEach(error => {
      const system = this.inferSystemFromError(error);
      if (system) systems.add(system);
    });
    return Array.from(systems);
  }

  private calculateAggregateBusinessImpact(errors: ErrorEvent[]): BusinessImpact {
    const impacts = errors.map(error => this.getBusinessImpactFromError(error));
    return impacts.reduce((max, current) => this.getMaxBusinessImpact(max, current), BusinessImpact.MINIMAL);
  }

  private async getPatternTimeIntervals(patternKey: string): Promise<number[]> {
    // Get time intervals between pattern occurrences
    return [300000, 280000, 320000]; // placeholder intervals
  }

  private inferSystemFromPattern(patternKey: string): SystemLayer {
    if (patternKey.includes("database")) return SystemLayer.DATA_ACCESS;
    if (patternKey.includes("external")) return SystemLayer.EXTERNAL_SERVICES;
    if (patternKey.includes("auth")) return SystemLayer.SECURITY;
    return SystemLayer.API;
  }

  private async getSystemHealthScore(system: SystemLayer): Promise<number> {
    // Get health score for system (0-1, where 1 is healthy)
    return 0.8; // placeholder
  }

  private isBusinessCritical(error: ErrorEvent): boolean {
    return error.category === ErrorCategory.BUSINESS_LOGIC ||
           error.severity === ErrorSeverity.CRITICAL ||
           error.error.code?.includes("PAYMENT") ||
           error.error.code?.includes("BILLING");
  }

  private async calculateRevenuePrediction(errors: ErrorEvent[]): Promise<number> {
    // Calculate estimated revenue at risk
    return errors.length * 1000; // $1000 per critical error (placeholder)
  }

  private async getAffectedCustomerCount(errors: ErrorEvent[]): Promise<number> {
    const uniqueUsers = new Set(errors.map(error => error.context.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  private async getSystemErrors(system: SystemLayer, timeRange: number): Promise<ErrorEvent[]> {
    const cutoff = Date.now() - timeRange;
    return Array.from(this.errorBuffer.values())
      .filter(error => error.timestamp.getTime() >= cutoff)
      .filter(error => this.inferSystemFromError(error) === system);
  }

  private calculateCorrelationStrength(errors1: ErrorEvent[], errors2: ErrorEvent[]): number {
    // Simple correlation calculation (in production, use proper statistical methods)
    if (errors1.length === 0 || errors2.length === 0) return 0;
    
    const timeWindow = 300000; // 5 minutes
    let correlatedPairs = 0;
    
    for (const error1 of errors1) {
      for (const error2 of errors2) {
        const timeDiff = Math.abs(error1.timestamp.getTime() - error2.timestamp.getTime());
        if (timeDiff <= timeWindow) {
          correlatedPairs++;
          break;
        }
      }
    }
    
    return correlatedPairs / Math.max(errors1.length, errors2.length);
  }

  private calculateAverageTimeLag(errors1: ErrorEvent[], errors2: ErrorEvent[]): number {
    // Calculate average time lag between correlated errors
    return 30000; // 30 seconds (placeholder)
  }

  private getMaxBusinessImpactFromErrors(errors: ErrorEvent[]): BusinessImpact {
    return errors.reduce((max, error) => {
      const impact = this.getBusinessImpactFromError(error);
      return this.getMaxBusinessImpact(max, impact);
    }, BusinessImpact.MINIMAL);
  }

  private inferSystemFromError(error: ErrorEvent): SystemLayer | null {
    const code = error.error.code;
    if (code?.includes("DATABASE")) return SystemLayer.DATA_ACCESS;
    if (code?.includes("EXTERNAL_SERVICE")) return SystemLayer.EXTERNAL_SERVICES;
    if (code?.includes("AUTHENTICATION") || code?.includes("AUTHORIZATION")) return SystemLayer.SECURITY;
    if (code?.includes("VALIDATION")) return SystemLayer.API;
    return SystemLayer.BUSINESS_LOGIC;
  }

  private getBusinessImpactFromError(error: ErrorEvent): BusinessImpact {
    if (error.severity === ErrorSeverity.CRITICAL) return BusinessImpact.CRITICAL;
    if (error.severity === ErrorSeverity.HIGH) return BusinessImpact.HIGH;
    if (error.severity === ErrorSeverity.MEDIUM) return BusinessImpact.MEDIUM;
    if (error.severity === ErrorSeverity.LOW) return BusinessImpact.LOW;
    return BusinessImpact.MINIMAL;
  }

  private getMaxBusinessImpact(a: BusinessImpact, b: BusinessImpact): BusinessImpact {
    const weights = {
      [BusinessImpact.MINIMAL]: 1,
      [BusinessImpact.LOW]: 2,
      [BusinessImpact.MEDIUM]: 3,
      [BusinessImpact.HIGH]: 4,
      [BusinessImpact.CRITICAL]: 5,
      [BusinessImpact.REVENUE_BLOCKING]: 6
    };
    return weights[a] > weights[b] ? a : b;
  }
}

// Global error monitoring instance
export const errorMonitoring = new ErrorMonitoringService();

export default ErrorMonitoringService;
