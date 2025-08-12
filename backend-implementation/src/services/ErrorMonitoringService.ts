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

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error category classifications
 */
export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  DATABASE = "database",
  EXTERNAL_SERVICE = "external_service",
  NETWORK = "network",
  SYSTEM = "system",
  BUSINESS_LOGIC = "business_logic",
  SECURITY = "security",
}

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
 * Error monitoring service class
 */
export class ErrorMonitoringService extends EventEmitter {
  private errorBuffer: Map<string, ErrorEvent> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private alertConfigs: AlertConfig[] = [];
  private alertCooldowns: Map<string, number> = new Map();
  private readonly bufferSize = 10000;
  private readonly patternAnalysisInterval = 60000; // 1 minute
  private readonly cleanupInterval = 300000; // 5 minutes

  constructor() {
    super();
    this.initializeDefaultAlerts();
    this.startPatternAnalysis();
    this.startCleanup();
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
        originalError: errorEvent.error.message,
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
      byErrorCode: this.groupBy(recentErrors, (e) => e.error.code || "UNKNOWN"),
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
          message: errorEvent.error.message,
          code: errorEvent.error.code,
          statusCode: errorEvent.error.statusCode,
          stack: errorEvent.error.stack,
        },
      };

      await redisClient.setex(key, 86400, JSON.stringify(data)); // 24 hours TTL
    } catch (error) {
      logger.warn("Failed to persist error to Redis", {
        errorId: errorEvent.id,
        error: error.message,
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
    return `${errorEvent.category}_${errorEvent.error.code || "UNKNOWN"}`;
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
      error: errorEvent.error.message,
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
        message: triggerEvent.error.message,
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
}

// Global error monitoring instance
export const errorMonitoring = new ErrorMonitoringService();

export default ErrorMonitoringService;
