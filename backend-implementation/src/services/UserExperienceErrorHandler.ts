/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER EXPERIENCE ERROR HANDLER
 * ============================================================================
 *
 * Specialized service for transforming technical errors into user-friendly
 * experiences and implementing graceful degradation patterns.
 *
 * Features:
 * - User-friendly error message transformation
 * - Context-aware error presentation
 * - Progressive degradation strategies
 * - Recovery guidance for users
 * - Accessibility-compliant error handling
 * - Multi-language error support
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import {
  UserFriendlyError,
  ErrorAction,
  GracefulDegradationConfig,
  BaseSystemError,
  CrossStreamErrorContext,
  ERROR_TAXONOMY,
} from "@/types/ErrorHandling";
import {
  ErrorSeverity,
  ErrorCategory,
} from "@/services/ErrorMonitoringService";
import { logger } from "@/utils/logger";
import { config } from "@/config";

/**
 * Error message templates by context and user type
 */
interface ErrorMessageTemplate {
  title: string;
  message: string;
  technicalDetails?: string;
  recoverySteps?: string[];
  preventionTips?: string[];
  estimatedResolution?: string;
  alternativeActions?: string[];
}

/**
 * User context for personalized error handling
 */
interface UserContext {
  id?: string;
  type: "customer" | "driver" | "admin" | "manager" | "technician" | "guest";
  experience: "novice" | "intermediate" | "expert";
  preferences?: {
    language?: string;
    accessibility?: boolean;
    verboseErrors?: boolean;
    technicalDetails?: boolean;
  };
  businessContext?: {
    organization?: string;
    role?: string;
    permissions?: string[];
  };
}

/**
 * Degradation mode configuration
 */
interface DegradationMode {
  name: string;
  description: string;
  affectedFeatures: string[];
  availableFeatures: string[];
  userMessage: string;
  recoveryActions: ErrorAction[];
  estimatedDuration?: number;
  automaticRecovery?: boolean;
}

/**
 * User experience error handler class
 */
export class UserExperienceErrorHandler extends EventEmitter {
  private messageTemplates: Map<string, ErrorMessageTemplate> = new Map();
  private degradationModes: Map<string, DegradationMode> = new Map();
  private activeUserSessions: Map<string, UserContext> = new Map();
  private featureFlags: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.initializeMessageTemplates();
    this.initializeDegradationModes();
    this.loadFeatureFlags();
  }

  /**
   * Transform technical error to user-friendly representation
   */
  public createUserFriendlyError(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
    userContext?: UserContext,
  ): UserFriendlyError {
    const template = this.getMessageTemplate(error.code, context, userContext);
    const actions = this.generateContextualActions(error, context, userContext);
    const severity = this.mapToUserSeverity(error.severity);

    // Personalize message based on user context
    const personalizedMessage = this.personalizeMessage(
      template,
      userContext,
      context,
    );

    return {
      title: template.title,
      message: personalizedMessage?.message,
      actionable: actions.length > 0,
      actions,
      severity,
      dismissible: this.isDismissible(error.severity, error.category),
      autoHide: this.getAutoHideDelay(error.severity),
      category: this.mapToUserCategory(error.category),
      icon: this.getErrorIcon(error.code, severity),
      color: this.getErrorColor(severity),
    };
  }

  /**
   * Apply graceful degradation based on error context
   */
  public async applyGracefulDegradation(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
    userContext?: UserContext,
  ): Promise<GracefulDegradationConfig> {
    const degradationMode = this.determineDegradationMode(error, context);

    if (!degradationMode) {
      // No degradation needed
      return this.createMinimalDegradation(error);
    }

    const config: GracefulDegradationConfig = {
      feature: context.component,
      fallbackBehavior: this.determineFallbackBehavior(error.category),
      fallbackMessage: this.createDegradationMessage(
        degradationMode,
        userContext,
      ),
      maintenanceMode: degradationMode.name === "maintenance",
      estimatedRecoveryTime: degradationMode.estimatedDuration,
      alternativeActions: this.adaptActionsForUser(
        degradationMode.recoveryActions,
        userContext,
      ),
      dataSourceFallback: this.getDataSourceFallback(context.component),
      notifyUsers: this.shouldNotifyUsers(error.severity, degradationMode),
    };

    // Log degradation application
    logger.info("Graceful degradation applied", {
      errorId: error.id,
      component: context.component,
      mode: degradationMode.name,
      user: userContext?.id,
    });

    // Emit degradation event
    this.emit("degradationApplied", {
      config,
      error,
      context,
      userContext,
    });

    return config;
  }

  /**
   * Get user guidance for error recovery
   */
  public getUserRecoveryGuidance(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
    userContext?: UserContext,
  ): {
    canUserRecover: boolean;
    steps: string[];
    estimatedTime: number;
    requiredPermissions?: string[];
    contactSupport: boolean;
  } {
    const template = this.getMessageTemplate(error.code, context, userContext);

    return {
      canUserRecover: this.canUserRecover(error, userContext),
      steps: template?.recoverySteps || [],
      estimatedTime: this.estimateRecoveryTime(error.code),
      requiredPermissions: this.getRequiredPermissions(error.code, context),
      contactSupport: this.shouldContactSupport(error.severity, userContext),
    };
  }

  /**
   * Register user session for personalized error handling
   */
  public registerUserSession(userId: string, userContext: UserContext): void {
    this.activeUserSessions.set(userId, userContext);
  }

  /**
   * Get error metrics for user experience analysis
   */
  public getUXErrorMetrics(): {
    dismissalRate: number;
    recoverySuccessRate: number;
    userSatisfactionScore: number;
    commonUserActions: Record<string, number>;
    degradationImpact: Record<string, number>;
  } {
    // This would be calculated from actual user interaction data
    // For now, returning mock data structure
    return {
      dismissalRate: 0.65,
      recoverySuccessRate: 0.78,
      userSatisfactionScore: 3.2,
      commonUserActions: {
        retry: 45,
        dismiss: 32,
        contact_support: 15,
        refresh: 8,
      },
      degradationImpact: {
        readonly: 0.25,
        cached: 0.15,
        simplified: 0.35,
        disabled: 0.25,
      },
    };
  }

  /**
   * Initialize message templates
   */
  private initializeMessageTemplates(): void {
    // Waste management specific templates
    this?.messageTemplates.set(ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH, {
      title: "Display Issue",
      message:
        "We're having trouble displaying this information. The page will refresh automatically.",
      recoverySteps: [
        "Wait for automatic refresh",
        "If issue persists, refresh manually",
        "Clear browser cache if needed",
      ],
      estimatedResolution: "30 seconds",
    });

    this?.messageTemplates.set(ERROR_TAXONOMY.BACKEND.DATABASE_ERROR, {
      title: "Service Temporarily Unavailable",
      message:
        "We're having trouble accessing your waste management data. Your information is safe and we're working to restore access.",
      recoverySteps: [
        "Wait a moment and try again",
        "Check if other features are working",
        "Contact support if issue persists",
      ],
      estimatedResolution: "2-5 minutes",
      preventionTips: [
        "Regular data backups are performed automatically",
        "Consider using offline mode for critical operations",
      ],
    });

    this?.messageTemplates.set(ERROR_TAXONOMY.EXTERNAL_API.SERVICE_UNAVAILABLE, {
      title: "Third-party Service Issue",
      message:
        "One of our partner services is temporarily unavailable. Some features may be limited.",
      recoverySteps: [
        "Try again in a few minutes",
        "Use available alternative features",
        "Contact support for urgent issues",
      ],
      alternativeActions: [
        "Use manual entry for now",
        "Save data locally and sync later",
        "Switch to backup service if available",
      ],
      estimatedResolution: "15-30 minutes",
    });

    this?.messageTemplates.set(ERROR_TAXONOMY.SECURITY.UNAUTHORIZED_ACCESS, {
      title: "Access Denied",
      message:
        "You don't have permission to access this waste management feature. Contact your administrator if you believe this is incorrect.",
      recoverySteps: [
        "Check with your supervisor",
        "Contact system administrator",
        "Use alternative authorized features",
      ],
    });

    // Business-specific templates
    this?.messageTemplates.set("BILLING_ERROR", {
      title: "Billing System Issue",
      message:
        "We're having trouble processing billing information. No charges have been processed incorrectly.",
      recoverySteps: [
        "Try the operation again",
        "Contact billing department",
        "Check account status",
      ],
      estimatedResolution: "10-15 minutes",
    });

    this?.messageTemplates.set("ROUTE_OPTIMIZATION_ERROR", {
      title: "Route Planning Unavailable",
      message:
        "Our route optimization service is temporarily unavailable. You can still create manual routes.",
      alternativeActions: [
        "Create routes manually",
        "Use previous route templates",
        "Contact dispatch for assistance",
      ],
      estimatedResolution: "20-30 minutes",
    });
  }

  /**
   * Initialize degradation modes
   */
  private initializeDegradationModes(): void {
    this.degradationModes.set("readonly", {
      name: "readonly",
      description: "Read-only mode with limited editing capabilities",
      affectedFeatures: ["create", "update", "delete"],
      availableFeatures: ["view", "export", "search", "filter"],
      userMessage:
        "Editing is temporarily disabled. You can still view and export data.",
      recoveryActions: [
        { label: "View Data", action: "custom", handler: "viewOnlyMode" },
        { label: "Export Report", action: "custom", handler: "exportData" },
        {
          label: "Contact Support",
          action: "contact",
          target: "support@company.com",
        },
      ],
      estimatedDuration: 900000, // 15 minutes
      automaticRecovery: true,
    });

    this.degradationModes.set("cached", {
      name: "cached",
      description: "Using cached data with limited real-time updates",
      affectedFeatures: ["real-time-updates", "live-tracking"],
      availableFeatures: ["cached-data", "basic-operations", "offline-sync"],
      userMessage:
        "Showing cached information. Real-time updates are temporarily unavailable.",
      recoveryActions: [
        { label: "Refresh When Available", action: "retry" },
        { label: "Use Offline Mode", action: "custom", handler: "offlineMode" },
      ],
      estimatedDuration: 600000, // 10 minutes
      automaticRecovery: true,
    });

    this.degradationModes.set("simplified", {
      name: "simplified",
      description: "Basic functionality with advanced features disabled",
      affectedFeatures: [
        "advanced-analytics",
        "ai-optimization",
        "complex-reports",
      ],
      availableFeatures: [
        "basic-operations",
        "simple-reports",
        "core-features",
      ],
      userMessage:
        "Advanced features are temporarily unavailable. Core waste management functions remain active.",
      recoveryActions: [
        { label: "Use Basic Features", action: "custom", handler: "basicMode" },
        {
          label: "Download Simple Report",
          action: "custom",
          handler: "simpleReport",
        },
      ],
      estimatedDuration: 1800000, // 30 minutes
    });

    this.degradationModes.set("maintenance", {
      name: "maintenance",
      description: "System maintenance in progress",
      affectedFeatures: ["all-features"],
      availableFeatures: ["status-page", "emergency-contacts"],
      userMessage:
        "System maintenance is in progress. Emergency operations remain available.",
      recoveryActions: [
        { label: "Check Status", action: "navigate", target: "/status" },
        {
          label: "Emergency Contact",
          action: "contact",
          target: "emergency@company.com",
        },
      ],
    });
  }

  /**
   * Load feature flags for error handling
   */
  private loadFeatureFlags(): void {
    // This would typically load from configuration service
    this.featureFlags.set("enhancedErrorMessages", true);
    this.featureFlags.set("userGuidedRecovery", true);
    this.featureFlags.set("accessibilityMode", true);
    this.featureFlags.set("multiLanguageSupport", false);
    this.featureFlags.set("degradationNotifications", true);
  }

  /**
   * Get appropriate message template
   */
  private getMessageTemplate(
    errorCode: string,
    context: CrossStreamErrorContext,
    userContext?: UserContext,
  ): ErrorMessageTemplate {
    let template = this?.messageTemplates.get(errorCode);

    if (!template) {
      // Fallback to generic template based on category
      template = this.getGenericTemplate(errorCode);
    }

    // Customize based on user context
    if (userContext) {
      template = this.customizeForUser(template, userContext);
    }

    return template;
  }

  /**
   * Generate contextual actions based on error and user
   */
  private generateContextualActions(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
    userContext?: UserContext,
  ): ErrorAction[] {
    const actions: ErrorAction[] = [];

    // Default actions based on error severity
    if (error.severity !== ErrorSeverity.CRITICAL) {
      actions.push({ label: "Dismiss", action: "dismiss" });
    }

    // Recovery actions based on user capabilities
    if (this.canUserRecover(error, userContext)) {
      actions.push({
        label: "Try Again",
        action: "retry",
        primary: true,
      });
    }

    // Context-specific actions
    switch (context.stream) {
      case "frontend":
        if (error.code === ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH) {
          actions.push({
            label: "Refresh Page",
            action: "refresh",
            primary: true,
          });
        }
        break;

      case "backend":
        if (error.category === ErrorCategory.AUTHENTICATION) {
          actions.push({
            label: "Sign In Again",
            action: "navigate",
            target: "/auth/login",
            primary: true,
          });
        }
        break;

      case "external-api":
        actions.push({
          label: "Use Offline Mode",
          action: "custom",
          handler: "enableOfflineMode",
        });
        break;
    }

    // User-role specific actions
    if (userContext?.type === "admin" || userContext?.type === "manager") {
      actions.push({
        label: "View Details",
        action: "custom",
        handler: "showTechnicalDetails",
      });
    }

    // Always add support contact for high severity
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
   * Helper methods
   */
  private personalizeMessage(
    template: ErrorMessageTemplate,
    userContext?: UserContext,
    context?: CrossStreamErrorContext,
  ): { message: string } {
    let message = template?.message;

    if (userContext?.preferences?.verboseErrors && template.technicalDetails) {
      message += ` (Technical: ${template.technicalDetails})`;
    }

    if (userContext?.businessContext?.organization) {
      message = message.replace(
        "your",
        `${userContext.businessContext.organization}'s`,
      );
    }

    return { message };
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

  private mapToUserCategory(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return "access";
      case ErrorCategory.AUTHORIZATION:
        return "permission";
      case ErrorCategory.VALIDATION:
        return "input";
      case ErrorCategory.DATABASE:
        return "data";
      case ErrorCategory.EXTERNAL_SERVICE:
        return "service";
      case ErrorCategory.NETWORK:
        return "connection";
      case ErrorCategory.SECURITY:
        return "security";
      default:
        return "system";
    }
  }

  private isDismissible(
    severity: ErrorSeverity,
    category: ErrorCategory,
  ): boolean {
    return (
      severity !== ErrorSeverity.CRITICAL && category !== ErrorCategory.SECURITY
    );
  }

  private getAutoHideDelay(severity: ErrorSeverity): number | undefined {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 5000;
      case ErrorSeverity.MEDIUM:
        return undefined;
      case ErrorSeverity.HIGH:
        return undefined;
      case ErrorSeverity.CRITICAL:
        return undefined;
      default:
        return undefined;
    }
  }

  private getErrorIcon(errorCode: string, severity: string): string {
    if (errorCode.includes("SECURITY")) return "shield";
    if (errorCode.includes("NETWORK")) return "wifi-off";
    if (errorCode.includes("DATABASE")) return "database";
    if (severity === "critical") return "alert-triangle";
    return "alert-circle";
  }

  private getErrorColor(severity: string): string {
    switch (severity) {
      case "info":
        return "blue";
      case "warning":
        return "yellow";
      case "error":
        return "red";
      case "critical":
        return "purple";
      default:
        return "gray";
    }
  }

  private determineDegradationMode(
    error: BaseSystemError,
    context: CrossStreamErrorContext,
  ): DegradationMode | null {
    if (error.category === ErrorCategory.DATABASE) {
      return this.degradationModes.get("cached");
    }

    if (error.category === ErrorCategory.EXTERNAL_SERVICE) {
      return this.degradationModes.get("simplified");
    }

    if (error.severity === ErrorSeverity.CRITICAL) {
      return this.degradationModes.get("readonly");
    }

    return null;
  }

  private determineFallbackBehavior(
    category: ErrorCategory,
  ): "disable" | "readonly" | "cached" | "simplified" | "manual" {
    switch (category) {
      case ErrorCategory.DATABASE:
        return "cached";
      case ErrorCategory.EXTERNAL_SERVICE:
        return "simplified";
      case ErrorCategory.NETWORK:
        return "cached";
      case ErrorCategory.SECURITY:
        return "disable";
      default:
        return "readonly";
    }
  }

  private createDegradationMessage(
    mode: DegradationMode,
    userContext?: UserContext,
  ): string {
    let message = mode.userMessage;

    if (mode.estimatedDuration && userContext?.preferences?.verboseErrors) {
      const minutes = Math.ceil(mode.estimatedDuration / 60000);
      message += ` Expected restoration in ${minutes} minutes.`;
    }

    return message;
  }

  private adaptActionsForUser(
    actions: ErrorAction[],
    userContext?: UserContext,
  ): ErrorAction[] {
    if (!userContext) return actions;

    return actions.filter((action) => {
      // Filter actions based on user permissions or experience level
      if (action.action === "contact" && userContext.type === "guest") {
        return false; // Guests might not have support access
      }
      return true;
    });
  }

  private getDataSourceFallback(component: string): string | undefined {
    const fallbacks: Record<string, string> = {
      dashboard: "cached_dashboard",
      routes: "static_routes",
      customers: "cached_customers",
      bins: "local_bins",
    };

    return fallbacks[component];
  }

  private shouldNotifyUsers(
    severity: ErrorSeverity,
    mode: DegradationMode,
  ): boolean {
    return severity >= ErrorSeverity?.MEDIUM || mode.name === "maintenance";
  }

  private canUserRecover(
    error: BaseSystemError,
    userContext?: UserContext,
  ): boolean {
    // Simple recovery capability check
    const recoverableErrors = [
      ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR,
      ERROR_TAXONOMY.BACKEND.AUTHENTICATION_ERROR,
    ];

    return recoverableErrors.includes(error.code as any);
  }

  private estimateRecoveryTime(errorCode: string): number {
    const estimates: Record<string, number> = {
      [ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH]: 30,
      [ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR]: 60,
      [ERROR_TAXONOMY.BACKEND.DATABASE_ERROR]: 300,
      [ERROR_TAXONOMY.EXTERNAL_API.SERVICE_UNAVAILABLE]: 900,
    };

    return estimates[errorCode] || 120; // Default 2 minutes
  }

  private getRequiredPermissions(
    errorCode: string,
    context: CrossStreamErrorContext,
  ): string[] | undefined {
    if (errorCode.includes("AUTHORIZATION")) {
      return ["read_access", "component_access"];
    }
    return undefined;
  }

  private shouldContactSupport(
    severity: ErrorSeverity,
    userContext?: UserContext,
  ): boolean {
    return severity >= ErrorSeverity?.HIGH || userContext?.type === "customer";
  }

  private getGenericTemplate(errorCode: string): ErrorMessageTemplate {
    return {
      title: "Something went wrong",
      message:
        "We encountered an unexpected issue. Our team has been notified and is working on a solution.",
      recoverySteps: [
        "Try refreshing the page",
        "Wait a moment and try again",
        "Contact support if the issue persists",
      ],
      estimatedResolution: "5-10 minutes",
    };
  }

  private customizeForUser(
    template: ErrorMessageTemplate,
    userContext: UserContext,
  ): ErrorMessageTemplate {
    // Customize based on user experience level
    if (userContext.experience === "novice") {
      return {
        ...template,
        message: this.simplifyMessage(template?.message),
        recoverySteps: template.recoverySteps?.slice(0, 2), // Show fewer steps
      };
    }

    return template;
  }

  private simplifyMessage(message: string): string {
    return message
      .replace(/technical|system|service/gi, "")
      .replace(/temporarily/gi, "for now")
      .trim();
  }

  private createMinimalDegradation(
    error: BaseSystemError,
  ): GracefulDegradationConfig {
    return {
      feature: "system",
      fallbackBehavior: "readonly",
      fallbackMessage: "Some features may be temporarily limited.",
      maintenanceMode: false,
      notifyUsers: false,
    };
  }
}

// Global instance
export const userExperienceErrorHandler = new UserExperienceErrorHandler();

export default UserExperienceErrorHandler;
