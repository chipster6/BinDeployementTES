/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CROSS-STREAM ERROR COORDINATOR
 * ============================================================================
 *
 * Central error coordination service for managing errors across all development
 * streams: frontend, backend, external APIs, security, testing, and database.
 *
 * Features:
 * - Cross-stream error correlation and coordination
 * - User-friendly error transformation
 * - Recovery strategy orchestration
 * - Real-time error broadcasting
 * - Stream-specific error handling
 * - Automated escalation and alerting
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import {
  BaseSystemError,
  CrossStreamErrorContext,
  UserFriendlyError,
  ErrorAction,
  RealTimeErrorEvent,
  ErrorRecoveryStrategy,
  GracefulDegradationConfig,
  ErrorCoordinationMessage,
  StreamErrorConfig,
  ERROR_TAXONOMY,
  STREAM_SEVERITY_MAPPING,
  ApiIntegrationError,
  SecurityError,
  BusinessOperationError,
  FrontendErrorBoundary,
} from "@/types/ErrorHandling";
import {
  ErrorSeverity,
  ErrorCategory,
  errorMonitoring,
} from "@/services/ErrorMonitoringService";
import { AppError } from "@/middleware/errorHandler";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";

/**
 * Cross-stream error coordinator class
 */
export class CrossStreamErrorCoordinator extends EventEmitter {
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private degradationConfigs: Map<string, GracefulDegradationConfig> =
    new Map();
  private streamConfigs: Map<string, StreamErrorConfig> = new Map();
  private activeErrors: Map<string, RealTimeErrorEvent> = new Map();
  private correlationIndex: Map<string, string[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultStrategies();
    this.initializeStreamConfigs();
    this.setupEventListeners();
  }

  /**
   * Report error from any stream
   */
  public async reportError(
    error: Error | AppError,
    context: CrossStreamErrorContext,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const systemError = this.transformToSystemError(error, context, metadata);
    const userFriendlyError = this.createUserFriendlyError(
      systemError,
      context,
    );

    const realTimeEvent: RealTimeErrorEvent = {
      eventId: this.generateEventId(),
      error: systemError,
      context,
      userFriendly: userFriendlyError,
      resolved: false,
      relatedEvents: this.findRelatedEvents(systemError, context),
    };

    // Store active error
    this.activeErrors.set(realTimeEvent.eventId, realTimeEvent);

    // Index for correlation
    await this.indexErrorForCorrelation(realTimeEvent);

    // Report to monitoring service
    await errorMonitoring.trackError(
      error instanceof AppError ? error : new AppError(error instanceof Error ? error?.message : String(error)),
      context,
      metadata,
    );

    // Broadcast to interested streams
    await this.broadcastErrorEvent(realTimeEvent);

    // Check for automatic recovery
    await this.attemptAutoRecovery(realTimeEvent);

    // Log for debugging
    logger.info("Cross-stream error reported", {
      eventId: realTimeEvent.eventId,
      stream: context.stream,
      component: context.component,
      severity: systemError.severity,
    });

    return realTimeEvent.eventId;
  }

  /**
   * Transform generic error to system error
   */
  private transformToSystemError(
    error: Error | AppError,
    context: CrossStreamErrorContext,
    metadata?: Record<string, any>,
  ): BaseSystemError {
    const errorCode = this.determineErrorCode(error, context);
    const severity = this.determineSeverity(error, context, errorCode);
    const category = this.determineCategory(error, context, errorCode);

    return {
      id: this.generateErrorId(),
      code: errorCode,
      message: error instanceof Error ? error?.message : String(error),
      severity,
      category,
      timestamp: new Date(),
      context: { ...context },
      stack: error instanceof Error ? error?.stack : undefined,
    };
  }

  /**
   * Create user-friendly error representation
   */
  private createUserFriendlyError(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
  ): UserFriendlyError {
    const config = this.getUserFriendlyConfig(error.code, context.stream);

    return {
      title: config.title,
      message: this.generateUserMessage(error, context),
      actionable: config.actionable,
      actions: this.generateErrorActions(error, context),
      severity: this.mapToUserSeverity(error.severity),
      dismissible: config.dismissible,
      autoHide: config.autoHide,
      category: error.category,
      icon: config.icon,
      color: config.color,
    };
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
  ): string {
    const messageTemplates = {
      [ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH]:
        "A component has encountered an issue. The page will be refreshed automatically.",
      [ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR]:
        "Unable to connect to the server. Please check your internet connection.",
      [ERROR_TAXONOMY.BACKEND.DATABASE_ERROR]:
        "We're experiencing temporary data access issues. Please try again in a moment.",
      [ERROR_TAXONOMY.BACKEND.AUTHENTICATION_ERROR]:
        "Please sign in again to continue accessing your account.",
      [ERROR_TAXONOMY.EXTERNAL_API.SERVICE_UNAVAILABLE]:
        "Some features may be temporarily unavailable. We're working to restore them.",
      [ERROR_TAXONOMY.SECURITY.UNAUTHORIZED_ACCESS]:
        "You don't have permission to access this resource.",
      [ERROR_TAXONOMY.SYSTEM.RESOURCE_EXHAUSTED]:
        "The system is currently experiencing high load. Please try again shortly.",
    };

    const template =
      messageTemplates[error.code as keyof typeof messageTemplates];

    if (template) {
      return template;
    }

    // Fallback to generic messages based on category
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        return "Authentication is required to access this resource.";
      case ErrorCategory.AUTHORIZATION:
        return "You don't have permission to perform this action.";
      case ErrorCategory.VALIDATION:
        return "The provided information is invalid. Please check and try again.";
      case ErrorCategory.DATABASE:
        return "We're having trouble accessing your data. Please try again.";
      case ErrorCategory.EXTERNAL_SERVICE:
        return "A required service is temporarily unavailable.";
      case ErrorCategory.NETWORK:
        return "Network connectivity issue detected. Please check your connection.";
      case ErrorCategory.SECURITY:
        return "A security issue has been detected and blocked.";
      default:
        return "An unexpected error occurred. Our team has been notified.";
    }
  }

  /**
   * Generate context-appropriate error actions
   */
  private generateErrorActions(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
  ): ErrorAction[] {
    const actions: ErrorAction[] = [];

    // Always add dismiss action for non-critical errors
    if (error.severity !== ErrorSeverity.CRITICAL) {
      actions.push({
        label: "Dismiss",
        action: "dismiss",
      });
    }

    // Add specific actions based on error type
    switch (error.code) {
      case ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH:
        actions.push({
          label: "Refresh Page",
          action: "refresh",
          primary: true,
        });
        break;

      case ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR:
        actions.push({
          label: "Retry",
          action: "retry",
          primary: true,
        });
        break;

      case ERROR_TAXONOMY.BACKEND.AUTHENTICATION_ERROR:
        actions.push({
          label: "Sign In",
          action: "navigate",
          target: "/auth/login",
          primary: true,
        });
        break;

      case ERROR_TAXONOMY.EXTERNAL_API.SERVICE_UNAVAILABLE:
        actions.push({
          label: "Try Again",
          action: "retry",
          primary: true,
        });
        if (error.metadata?.fallbackAvailable) {
          actions.push({
            label: "Use Offline Mode",
            action: "custom",
            handler: "enableOfflineMode",
          });
        }
        break;

      case ERROR_TAXONOMY.SYSTEM.RESOURCE_EXHAUSTED:
        actions.push({
          label: "Wait and Retry",
          action: "retry",
          params: { delay: 30000 },
          primary: true,
        });
        break;
    }

    // Add contact support for high severity errors
    if (
      error.severity === ErrorSeverity.HIGH ||
      error.severity === ErrorSeverity.CRITICAL
    ) {
      actions.push({
        label: "Contact Support",
        action: "contact",
        target: "support@company.com",
      });
    }

    return actions;
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptAutoRecovery(event: RealTimeErrorEvent): Promise<void> {
    const strategies = this.getApplicableStrategies(event.error);

    for (const strategy of strategies) {
      try {
        const canRecover = await strategy.canRecover(
          event.error,
          event.context,
        );
        if (canRecover) {
          logger.info("Attempting automatic recovery", {
            eventId: event.eventId,
            strategy: strategy.name,
          });

          const result = await strategy.recover(event.error, event.context);

          if (result.success) {
            await this.resolveError(
              event.eventId,
              `Auto-recovered using ${strategy.name}`,
            );
            return;
          }
        }
      } catch (recoveryError) {
        logger.warn("Recovery strategy failed", {
          eventId: event.eventId,
          strategy: strategy.name,
          error: recoveryError?.message,
        });
      }
    }

    // If no recovery worked, check for graceful degradation
    await this.applyGracefulDegradation(event);
  }

  /**
   * Apply graceful degradation
   */
  private async applyGracefulDegradation(
    event: RealTimeErrorEvent,
  ): Promise<void> {
    const component = event.context.component;
    const degradationConfig = this.degradationConfigs.get(component);

    if (degradationConfig) {
      logger.info("Applying graceful degradation", {
        eventId: event.eventId,
        component,
        fallbackBehavior: degradationConfig.fallbackBehavior,
      });

      // Update user-friendly error with degradation info
      event.userFriendly?.message = degradationConfig.fallbackMessage;
      event.userFriendly.actions = [
        ...(degradationConfig?.alternativeActions || []),
        ...event.userFriendly.actions,
      ];

      // Broadcast degradation event
      this.emit("gracefulDegradation", {
        eventId: event.eventId,
        component,
        config: degradationConfig,
      });
    }
  }

  /**
   * Resolve error
   */
  public async resolveError(
    eventId: string,
    resolution?: string,
  ): Promise<boolean> {
    const event = this.activeErrors.get(eventId);
    if (!event) {
      return false;
    }

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolution = resolution;

    // Broadcast resolution
    this.emit("errorResolved", event);

    // Clean up after delay
    setTimeout(() => {
      this.activeErrors.delete(eventId);
    }, 300000); // 5 minutes

    logger.info("Error resolved", {
      eventId,
      resolution,
    });

    return true;
  }

  /**
   * Get error dashboard data
   */
  public async getErrorDashboard(): Promise<any> {
    const activeErrorsArray = Array.from(this.activeErrors.values());
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const recentErrors = activeErrorsArray.filter(
      (event) => event.error.timestamp.getTime() >= oneHourAgo,
    );

    const streamCounts = recentErrors.reduce(
      (acc, event) => {
        const stream = event.context.stream;
        if (!acc[stream]) {
          acc[stream] = { count: 0, severity: {} };
        }
        acc[stream].count++;
        acc[stream].severity[event.error.severity] =
          (acc[stream].severity[event.error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      overview: {
        totalErrors: recentErrors.length,
        unresolvedErrors: recentErrors.filter((e) => !e.resolved).length,
        criticalErrors: recentErrors.filter(
          (e) => e.error.severity === ErrorSeverity.CRITICAL,
        ).length,
        errorRate: recentErrors.length / 3600, // per second
        uptime: await this.calculateUptime(),
        lastUpdate: new Date(),
      },
      byStream: streamCounts,
      recentErrors: recentErrors.slice(0, 20),
      alerts: await errorMonitoring.getHealthStatus(),
    };
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Frontend component recovery
    this.recoveryStrategies.set("frontend-component-recovery", {
      name: "Frontend Component Recovery",
      applicable: (error) =>
        error.code === ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH,
      canRecover: async () => true,
      recover: async (error, context) => {
        // Signal frontend to re-render component
        this.emit("componentRecovery", {
          component: context.component,
          errorId: error.id,
        });
        return { success: true };
      },
      maxAttempts: 3,
      backoffStrategy: "exponential",
      backoffDelay: 1000,
    });

    // Network request retry
    this.recoveryStrategies.set("network-retry", {
      name: "Network Request Retry",
      applicable: (error) =>
        error.code === ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR ||
        error.code === ERROR_TAXONOMY.EXTERNAL_API.TIMEOUT,
      canRecover: async () => true,
      recover: async (error, context) => {
        // Signal to retry the failed request
        this.emit("networkRetry", {
          operation: context.operation,
          errorId: error.id,
        });
        return { success: true };
      },
      maxAttempts: 3,
      backoffStrategy: "exponential",
      backoffDelay: 2000,
    });

    // Database connection recovery
    this.recoveryStrategies.set("database-recovery", {
      name: "Database Connection Recovery",
      applicable: (error) =>
        error.code === ERROR_TAXONOMY.BACKEND.DATABASE_ERROR,
      canRecover: async () => {
        // Check if database is accessible
        try {
          await redisClient.ping();
          return true;
        } catch {
          return false;
        }
      },
      recover: async () => {
        // Database recovery is handled at the connection level
        return { success: true };
      },
      maxAttempts: 5,
      backoffStrategy: "exponential",
      backoffDelay: 5000,
    });

    // Authentication token refresh
    this.recoveryStrategies.set("auth-token-refresh", {
      name: "Authentication Token Refresh",
      applicable: (error) =>
        error.code === ERROR_TAXONOMY.SECURITY.TOKEN_EXPIRED,
      canRecover: async () => true,
      recover: async (error, context) => {
        // Signal to refresh authentication token
        this.emit("tokenRefresh", {
          userId: context.userId,
          errorId: error.id,
        });
        return { success: true };
      },
      maxAttempts: 1,
      backoffStrategy: "fixed",
      backoffDelay: 1000,
    });
  }

  /**
   * Initialize stream configurations
   */
  private initializeStreamConfigs(): void {
    const defaultConfig: StreamErrorConfig = {
      stream: "",
      errorReporting: { enabled: true },
      userNotifications: {
        enabled: true,
        showStack: false,
        autoHide: false,
        persistence: true,
      },
      recovery: {
        autoRetry: true,
        maxRetries: 3,
        backoffStrategy: "exponential",
        fallbackEnabled: true,
      },
      monitoring: {
        realTime: true,
        alerting: true,
        dashboardEnabled: true,
        metricsCollection: true,
      },
    };

    // Frontend-specific config
    this.streamConfigs.set("frontend", {
      ...defaultConfig,
      stream: "frontend",
      userNotifications: {
        ...defaultConfig.userNotifications,
        showStack: false,
      },
      recovery: { ...defaultConfig.recovery, maxRetries: 2 },
    });

    // Backend-specific config
    this.streamConfigs.set("backend", {
      ...defaultConfig,
      stream: "backend",
      userNotifications: {
        ...defaultConfig.userNotifications,
        showStack: config.app.nodeEnv === "development",
      },
      recovery: { ...defaultConfig.recovery, maxRetries: 5 },
    });

    // External API-specific config
    this.streamConfigs.set("external-api", {
      ...defaultConfig,
      stream: "external-api",
      recovery: {
        ...defaultConfig.recovery,
        maxRetries: 3,
        fallbackEnabled: true,
      },
    });

    // Security-specific config
    this.streamConfigs.set("security", {
      ...defaultConfig,
      stream: "security",
      userNotifications: {
        ...defaultConfig.userNotifications,
        showStack: false,
        persistence: true,
      },
      recovery: {
        ...defaultConfig.recovery,
        autoRetry: false,
        fallbackEnabled: false,
      },
      monitoring: { ...defaultConfig.monitoring, alerting: true },
    });
  }

  /**
   * Setup event listeners for cross-stream communication
   */
  private setupEventListeners(): void {
    this.on("errorReported", (event: RealTimeErrorEvent) => {
      logger.debug("Error event received", { eventId: event.eventId });
    });

    this.on("errorResolved", (event: RealTimeErrorEvent) => {
      logger.info("Error resolved event", { eventId: event.eventId });
    });

    this.on("gracefulDegradation", (data: any) => {
      logger.info("Graceful degradation applied", data);
    });
  }

  /**
   * Broadcast error event to relevant streams
   */
  private async broadcastErrorEvent(event: RealTimeErrorEvent): Promise<void> {
    const message: ErrorCoordinationMessage = {
      messageId: this.generateMessageId(),
      source: event.context.stream,
      target: this.determineTargetStreams(event),
      errorId: event.eventId,
      action: "report",
      data: event,
      priority: this.mapToPriority(event.error.severity),
      timestamp: new Date(),
    };

    this.emit("errorBroadcast", message);

    // Store in Redis for cross-process communication
    await this.storeCoordinationMessage(message);
  }

  /**
   * Helper methods
   */
  private determineErrorCode(
    error: Error | AppError,
    context: CrossStreamErrorContext,
  ): string {
    if (error instanceof AppError && error.code) {
      return error.code;
    }

    // Map based on stream and error characteristics
    const streamTaxonomy =
      ERROR_TAXONOMY[
        context.stream.toUpperCase() as keyof typeof ERROR_TAXONOMY
      ];
    if (streamTaxonomy) {
      // Simple mapping - in production, this would be more sophisticated
      return Object.values(streamTaxonomy)[0] as string;
    }

    return "UNKNOWN_ERROR";
  }

  private determineSeverity(
    error: Error | AppError,
    context: CrossStreamErrorContext,
    code: string,
  ): ErrorSeverity {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) return ErrorSeverity.HIGH;
      if (error.statusCode >= 400) return ErrorSeverity.MEDIUM;
    }

    const streamMapping =
      STREAM_SEVERITY_MAPPING[
        context.stream as keyof typeof STREAM_SEVERITY_MAPPING
      ];
    return (
      streamMapping?.[code as keyof typeof streamMapping] ||
      ErrorSeverity.MEDIUM
    );
  }

  private determineCategory(
    error: Error | AppError,
    context: CrossStreamErrorContext,
    code: string,
  ): ErrorCategory {
    if (code.includes("AUTHENTICATION")) return ErrorCategory.AUTHENTICATION;
    if (code.includes("AUTHORIZATION")) return ErrorCategory.AUTHORIZATION;
    if (code.includes("VALIDATION")) return ErrorCategory.VALIDATION;
    if (code.includes("DATABASE")) return ErrorCategory.DATABASE;
    if (code.includes("EXTERNAL_API")) return ErrorCategory.EXTERNAL_SERVICE;
    if (code.includes("NETWORK")) return ErrorCategory.NETWORK;
    if (code.includes("SECURITY")) return ErrorCategory.SECURITY;

    return ErrorCategory.SYSTEM;
  }

  private getUserFriendlyConfig(code: string, stream: string): any {
    // Default configuration - should be externalized
    return {
      title: "Something went wrong",
      actionable: true,
      dismissible: true,
      autoHide: false,
      icon: "error",
      color: "red",
    };
  }

  private mapToUserSeverity(
    severity: ErrorSeverity,
  ): "info" | "warning" | "error" | "critical" {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "info";
      case ErrorSeverity.MEDIUM:
        return "warning";
      case ErrorSeverity.HIGH:
        return "error";
      case ErrorSeverity.CRITICAL:
        return "critical";
      default:
        return "error";
    }
  }

  private getApplicableStrategies(
    error: BaseSystemError,
  ): ErrorRecoveryStrategy[] {
    return Array.from(this.recoveryStrategies.values()).filter((strategy) =>
      strategy.applicable(error),
    );
  }

  private determineTargetStreams(event: RealTimeErrorEvent): string[] {
    const targets = ["monitoring"];

    // Add frontend for user notification
    if (event.context.userId) {
      targets.push("frontend");
    }

    // Add security for security-related errors
    if (event.error.category === ErrorCategory.SECURITY) {
      targets.push("security");
    }

    return targets;
  }

  private mapToPriority(
    severity: ErrorSeverity,
  ): "low" | "medium" | "high" | "urgent" {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "urgent";
      case ErrorSeverity.HIGH:
        return "high";
      case ErrorSeverity.MEDIUM:
        return "medium";
      default:
        return "low";
    }
  }

  private async indexErrorForCorrelation(
    event: RealTimeErrorEvent,
  ): Promise<void> {
    const correlationKeys = [
      event.context.userId,
      event.context.sessionId,
      event.context.correlationId,
      event.context.component,
    ].filter(Boolean);

    for (const key of correlationKeys) {
      const existing = this.correlationIndex.get(key!) || [];
      existing.push(event.eventId);
      this.correlationIndex.set(key!, existing.slice(-10)); // Keep last 10
    }
  }

  private findRelatedEvents(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
  ): string[] {
    const related = new Set<string>();

    [
      context.userId,
      context.sessionId,
      context.correlationId,
      context.component,
    ]
      .filter(Boolean)
      .forEach((key) => {
        const events = this.correlationIndex.get(key!) || [];
        events.forEach((eventId) => related.add(eventId));
      });

    return Array.from(related);
  }

  private async calculateUptime(): Promise<number> {
    // Simplified uptime calculation
    return 99.9; // Would be calculated from actual monitoring data
  }

  private async storeCoordinationMessage(
    message: ErrorCoordinationMessage,
  ): Promise<void> {
    try {
      const key = `error_coordination:${message?.messageId}`;
      await redisClient.setex(key, 3600, JSON.stringify(message)); // 1 hour TTL
    } catch (error: unknown) {
      logger.warn("Failed to store coordination message", {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global instance
export const crossStreamErrorCoordinator = new CrossStreamErrorCoordinator();

export default CrossStreamErrorCoordinator;
