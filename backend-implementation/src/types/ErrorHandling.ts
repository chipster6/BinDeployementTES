/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CROSS-STREAM ERROR HANDLING TYPES
 * ============================================================================
 *
 * Comprehensive type definitions for error handling across all system streams.
 * Provides consistent error interfaces for frontend, backend, and external APIs.
 *
 * Features:
 * - Cross-stream error coordination types
 * - User-friendly error message formats
 * - API integration error specifications
 * - Frontend error boundary types
 * - Real-time error monitoring interfaces
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import {
  ErrorSeverity,
  ErrorCategory,
} from "@/services/ErrorMonitoringService";

/**
 * Base error interface for all system components
 */
export interface BaseSystemError {
  id: string;
  code: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  metadata?: Record<string, any>;
}

/**
 * Cross-stream error context for coordinated handling
 */
export interface CrossStreamErrorContext {
  stream:
    | "frontend"
    | "backend"
    | "external-api"
    | "security"
    | "testing"
    | "database";
  component: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  correlationId?: string;
  traceId?: string;
}

/**
 * User-friendly error display interface
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  actionable: boolean;
  actions?: ErrorAction[];
  severity: "info" | "warning" | "error" | "critical";
  dismissible: boolean;
  autoHide?: number; // milliseconds
  category: string;
  icon?: string;
  color?: string;
}

/**
 * Error action interface for user interactions
 */
export interface ErrorAction {
  label: string;
  action: "retry" | "refresh" | "navigate" | "contact" | "dismiss" | "custom";
  target?: string;
  handler?: string;
  params?: Record<string, any>;
  primary?: boolean;
}

/**
 * Frontend error boundary interface
 */
export interface FrontendErrorBoundary {
  id: string;
  component: string;
  error: Error;
  errorInfo: {
    componentStack: string;
    errorBoundary?: string;
  };
  fallbackComponent?: string;
  retry: boolean;
  reportToMonitoring: boolean;
  context: CrossStreamErrorContext;
}

/**
 * API integration error interface
 */
export interface ApiIntegrationError extends BaseSystemError {
  service:
    | "stripe"
    | "twilio"
    | "sendgrid"
    | "samsara"
    | "airtable"
    | "mapbox"
    | "other";
  endpoint: string;
  method: string;
  statusCode?: number;
  response?: any;
  retryable: boolean;
  retryAttempts: number;
  nextRetryIn?: number;
  circuitBreakerState?: "open" | "closed" | "half-open";
  fallbackAvailable: boolean;
  fallbackData?: any;
}

/**
 * Security error interface
 */
export interface SecurityError extends BaseSystemError {
  securityLevel: "low" | "medium" | "high" | "critical";
  threatType:
    | "authentication"
    | "authorization"
    | "injection"
    | "bruteforce"
    | "suspicious"
    | "other";
  blocked: boolean;
  reportedToSecurity: boolean;
  automaticResponse?: string;
  requiresInvestigation: boolean;
}

/**
 * Business operation error interface
 */
export interface BusinessOperationError extends BaseSystemError {
  operation:
    | "bin-management"
    | "route-optimization"
    | "customer-management"
    | "billing"
    | "scheduling"
    | "other";
  businessImpact: "none" | "low" | "medium" | "high" | "critical";
  revenueImpact?: number;
  customerImpact: boolean;
  workaroundAvailable: boolean;
  workaround?: string;
  escalationRequired: boolean;
}

/**
 * Real-time error event interface
 */
export interface RealTimeErrorEvent {
  eventId: string;
  error: BaseSystemError;
  context: CrossStreamErrorContext;
  userFriendly: UserFriendlyError;
  resolved: boolean;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  relatedEvents?: string[];
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  name: string;
  applicable: (error: BaseSystemError) => boolean;
  canRecover: (error: BaseSystemError, context?: any) => Promise<boolean>;
  recover: (error: BaseSystemError, context?: any) => Promise<any>;
  fallback?: (error: BaseSystemError, context?: any) => Promise<any>;
  maxAttempts: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  backoffDelay: number;
}

/**
 * Graceful degradation configuration
 */
export interface GracefulDegradationConfig {
  feature: string;
  fallbackBehavior: "disable" | "readonly" | "cached" | "simplified" | "manual";
  fallbackMessage: string;
  maintenanceMode: boolean;
  estimatedRecoveryTime?: number;
  alternativeActions?: ErrorAction[];
  dataSourceFallback?: string;
  notifyUsers: boolean;
}

/**
 * Error monitoring dashboard interface
 */
export interface ErrorMonitoringDashboard {
  overview: {
    totalErrors: number;
    unresolvedErrors: number;
    criticalErrors: number;
    errorRate: number;
    uptime: number;
    lastUpdate: Date;
  };
  byStream: Record<
    string,
    {
      count: number;
      severity: Record<ErrorSeverity, number>;
      trend: "increasing" | "decreasing" | "stable";
    }
  >;
  recentErrors: RealTimeErrorEvent[];
  alerts: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
  performance: {
    averageResolutionTime: number;
    mttr: number; // Mean Time To Recovery
    mtbf: number; // Mean Time Between Failures
  };
}

/**
 * Error coordination message interface
 */
export interface ErrorCoordinationMessage {
  messageId: string;
  source: string;
  target: string[];
  errorId: string;
  action: "report" | "escalate" | "resolve" | "acknowledge" | "recover";
  data: any;
  priority: "low" | "medium" | "high" | "urgent";
  timestamp: Date;
}

/**
 * Error handling configuration per stream
 */
export interface StreamErrorConfig {
  stream: string;
  errorReporting: {
    enabled: boolean;
    endpoint?: string;
    batchSize?: number;
    flushInterval?: number;
  };
  userNotifications: {
    enabled: boolean;
    showStack: boolean;
    autoHide: boolean;
    persistence: boolean;
  };
  recovery: {
    autoRetry: boolean;
    maxRetries: number;
    backoffStrategy: string;
    fallbackEnabled: boolean;
  };
  monitoring: {
    realTime: boolean;
    alerting: boolean;
    dashboardEnabled: boolean;
    metricsCollection: boolean;
  };
}

/**
 * Error taxonomy for consistent classification
 */
export const ERROR_TAXONOMY = {
  // Frontend Errors
  FRONTEND: {
    RENDER_ERROR: "FRONTEND_RENDER_ERROR",
    COMPONENT_CRASH: "FRONTEND_COMPONENT_CRASH",
    ROUTE_ERROR: "FRONTEND_ROUTE_ERROR",
    STATE_ERROR: "FRONTEND_STATE_ERROR",
    NETWORK_REQUEST_ERROR: "FRONTEND_NETWORK_REQUEST_ERROR",
  },

  // Backend Errors
  BACKEND: {
    VALIDATION_ERROR: "BACKEND_VALIDATION_ERROR",
    DATABASE_ERROR: "BACKEND_DATABASE_ERROR",
    AUTHENTICATION_ERROR: "BACKEND_AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR: "BACKEND_AUTHORIZATION_ERROR",
    BUSINESS_LOGIC_ERROR: "BACKEND_BUSINESS_LOGIC_ERROR",
  },

  // External API Errors
  EXTERNAL_API: {
    SERVICE_UNAVAILABLE: "EXTERNAL_API_SERVICE_UNAVAILABLE",
    RATE_LIMITED: "EXTERNAL_API_RATE_LIMITED",
    AUTHENTICATION_FAILED: "EXTERNAL_API_AUTHENTICATION_FAILED",
    INVALID_RESPONSE: "EXTERNAL_API_INVALID_RESPONSE",
    TIMEOUT: "EXTERNAL_API_TIMEOUT",
  },

  // Security Errors
  SECURITY: {
    UNAUTHORIZED_ACCESS: "SECURITY_UNAUTHORIZED_ACCESS",
    SUSPICIOUS_ACTIVITY: "SECURITY_SUSPICIOUS_ACTIVITY",
    INJECTION_ATTEMPT: "SECURITY_INJECTION_ATTEMPT",
    BRUTE_FORCE: "SECURITY_BRUTE_FORCE",
    TOKEN_EXPIRED: "SECURITY_TOKEN_EXPIRED",
  },

  // System Errors
  SYSTEM: {
    RESOURCE_EXHAUSTED: "SYSTEM_RESOURCE_EXHAUSTED",
    CONFIGURATION_ERROR: "SYSTEM_CONFIGURATION_ERROR",
    DEPENDENCY_UNAVAILABLE: "SYSTEM_DEPENDENCY_UNAVAILABLE",
    PERFORMANCE_DEGRADATION: "SYSTEM_PERFORMANCE_DEGRADATION",
    MAINTENANCE_MODE: "SYSTEM_MAINTENANCE_MODE",
  },
} as const;

/**
 * Error severity mapping for different streams
 */
export const STREAM_SEVERITY_MAPPING = {
  frontend: {
    [ERROR_TAXONOMY.FRONTEND.COMPONENT_CRASH]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.FRONTEND.RENDER_ERROR]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.FRONTEND.ROUTE_ERROR]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.FRONTEND.STATE_ERROR]: ErrorSeverity.LOW,
    [ERROR_TAXONOMY.FRONTEND.NETWORK_REQUEST_ERROR]: ErrorSeverity.MEDIUM,
  },
  backend: {
    [ERROR_TAXONOMY.BACKEND.DATABASE_ERROR]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.BACKEND.AUTHENTICATION_ERROR]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.BACKEND.AUTHORIZATION_ERROR]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.BACKEND.VALIDATION_ERROR]: ErrorSeverity.LOW,
    [ERROR_TAXONOMY.BACKEND.BUSINESS_LOGIC_ERROR]: ErrorSeverity.MEDIUM,
  },
  externalApi: {
    [ERROR_TAXONOMY.EXTERNAL_API.SERVICE_UNAVAILABLE]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.EXTERNAL_API.TIMEOUT]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.EXTERNAL_API.RATE_LIMITED]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.EXTERNAL_API.AUTHENTICATION_FAILED]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.EXTERNAL_API.INVALID_RESPONSE]: ErrorSeverity.MEDIUM,
  },
  security: {
    [ERROR_TAXONOMY.SECURITY.INJECTION_ATTEMPT]: ErrorSeverity.CRITICAL,
    [ERROR_TAXONOMY.SECURITY.BRUTE_FORCE]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.SECURITY.UNAUTHORIZED_ACCESS]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.SECURITY.SUSPICIOUS_ACTIVITY]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.SECURITY.TOKEN_EXPIRED]: ErrorSeverity.LOW,
  },
  system: {
    [ERROR_TAXONOMY.SYSTEM.RESOURCE_EXHAUSTED]: ErrorSeverity.CRITICAL,
    [ERROR_TAXONOMY.SYSTEM.DEPENDENCY_UNAVAILABLE]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.SYSTEM.CONFIGURATION_ERROR]: ErrorSeverity.HIGH,
    [ERROR_TAXONOMY.SYSTEM.PERFORMANCE_DEGRADATION]: ErrorSeverity.MEDIUM,
    [ERROR_TAXONOMY.SYSTEM.MAINTENANCE_MODE]: ErrorSeverity.LOW,
  },
} as const;

export type ErrorTaxonomy = typeof ERROR_TAXONOMY;
export type StreamSeverityMapping = typeof STREAM_SEVERITY_MAPPING;
