/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - RESILIENCE ERROR HANDLER MIDDLEWARE
 * ============================================================================
 *
 * Enhanced error handling middleware that integrates with the unified error
 * resilience framework. Provides intelligent error routing, fallback mechanisms,
 * and graceful degradation for all application requests.
 *
 * Resilience Features:
 * - Automatic error classification and routing
 * - Context-aware fallback responses
 * - Progressive degradation management
 * - Business continuity protection
 * - Comprehensive error monitoring
 * - User-friendly error messaging
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Enhanced Resilience Middleware
 */

import type { Request, Response, NextFunction } from "express";
import { logger, logError, logSecurityEvent } from "@/utils/logger";
import { config } from "@/config";
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ExternalServiceError,
  DatabaseOperationError,
  TimeoutError,
  CircuitBreakerError,
  ResourceUnavailableError
} from "./errorHandler";
import UnifiedErrorResilienceService, { 
  SystemComponent,
  BusinessImpactLevel
} from "../services/error/UnifiedErrorResilienceService";

/**
 * =============================================================================
 * RESILIENCE MIDDLEWARE INTERFACE
 * =============================================================================
 */

/**
 * Request context for error resilience
 */
interface ResilienceContext {
  component: SystemComponent;
  operation: string;
  businessImpact: BusinessImpactLevel;
  allowFallback: boolean;
  fallbackResponse?: any;
  userId?: string;
  organizationId?: string;
  requestId?: string;
}

/**
 * Fallback response template
 */
interface FallbackResponse {
  success: boolean;
  data?: any;
  message: string;
  fallback: true;
  degradationLevel?: number;
  limitations?: string[];
  retryAfter?: number;
}

/**
 * Error categorization for user-friendly messaging
 */
enum UserErrorCategory {
  TEMPORARY_UNAVAILABLE = 'temporary_unavailable',
  DEGRADED_SERVICE = 'degraded_service',
  MAINTENANCE_MODE = 'maintenance_mode',
  AUTHENTICATION_REQUIRED = 'authentication_required',
  PERMISSION_DENIED = 'permission_denied',
  VALIDATION_FAILED = 'validation_failed',
  RATE_LIMITED = 'rate_limited',
  EXTERNAL_DEPENDENCY = 'external_dependency'
}

/**
 * =============================================================================
 * RESILIENCE ERROR HANDLER MIDDLEWARE
 * =============================================================================
 */

export class ResilienceErrorHandlerMiddleware {
  private resilienceService: UnifiedErrorResilienceService;
  private fallbackTemplates: Map<string, FallbackResponse> = new Map();
  private userFriendlyMessages: Map<UserErrorCategory, {
    message: string;
    userAction: string;
    technicalNote?: string;
  }> = new Map();

  constructor() {
    this.resilienceService = new UnifiedErrorResilienceService();
    this.initializeFallbackTemplates();
    this.initializeUserMessages();
  }

  /**
   * Main resilience error handler middleware
   */
  public handle = async (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(err);
    }

    const requestId = req.headers["x-request-id"] as string || this.generateRequestId();
    const resilienceContext = this.extractResilienceContext(req, err);

    try {
      // Route error through resilience framework
      const resilienceResult = await this.resilienceService.handleSystemError(err, {
        component: resilienceContext.component,
        operation: resilienceContext.operation,
        userId: resilienceContext.userId,
        organizationId: resilienceContext.organizationId,
        additionalData: {
          request: this.sanitizeRequestForLogging(req),
          error: err,
          businessImpact: resilienceContext.businessImpact
        }
      });

      // Handle successful resilience recovery
      if (resilienceResult.success) {
        await this.sendResilienceResponse(res, resilienceResult, resilienceContext, requestId);
        return;
      }

      // Handle resilience fallback
      if (resilienceResult.fallback && resilienceContext.allowFallback) {
        await this.sendFallbackResponse(res, resilienceResult, resilienceContext, requestId);
        return;
      }

      // If resilience framework couldn't handle, fall back to standard error handling
      await this.sendStandardErrorResponse(res, err, resilienceContext, requestId);

    } catch (resilienceError) {
      // Resilience framework itself failed - use emergency error handling
      logger.error("Resilience framework error", {
        requestId,
        originalError: err?.message,
        resilienceError: resilienceError?.message,
        component: resilienceContext.component,
        operation: resilienceContext.operation
      });

      await this.sendEmergencyErrorResponse(res, err, requestId);
    }
  };

  /**
   * =============================================================================
   * RESPONSE HANDLING METHODS
   * =============================================================================
   */

  /**
   * Send successful resilience recovery response
   */
  private async sendResilienceResponse(
    res: Response,
    resilienceResult: any,
    context: ResilienceContext,
    requestId: string
  ): Promise<void> {
    const statusCode = this.determineStatusCode(resilienceResult, context);
    
    const response = {
      status: "success",
      data: resilienceResult.data,
      message: resilienceResult?.message || "Request processed successfully",
      timestamp: new Date().toISOString()
    };

    logger.info("Resilience recovery successful", {
      requestId,
      component: context.component,
      operation: context.operation,
      statusCode,
      recoveryType: resilienceResult.recoveryType
    });

    res.status(statusCode).json(response);
  }

  /**
   * Send fallback response when primary operation fails
   */
  private async sendFallbackResponse(
    res: Response,
    resilienceResult: any,
    context: ResilienceContext,
    requestId: string
  ): Promise<void> {
    const fallbackTemplate = this.getFallbackTemplate(context.component, context.operation);
    const systemHealth = await this.resilienceService.getSystemHealthReport();
    
    const response: FallbackResponse = {
      success: true,
      data: resilienceResult?.data || fallbackTemplate.data,
      message: this.getFallbackMessage(context),
      fallback: true,
      degradationLevel: systemHealth.data?.degradationLevel || 0,
      limitations: this.getFallbackLimitations(context),
      retryAfter: this.calculateRetryAfter(context)
    };

    // Add user-friendly messaging
    const userCategory = this.categorizeForUser(context.component, resilienceResult);
    const userMessage = this.userFriendlyMessages.get(userCategory);
    
    if (userMessage) {
      response?.message = userMessage?.message;
      response.data = {
        ...response.data,
        userAction: userMessage.userAction,
        technicalNote: config.app.nodeEnv === "development" ? userMessage.technicalNote : undefined
      };
    }

    logger.warn("Fallback response sent", {
      requestId,
      component: context.component,
      operation: context.operation,
      degradationLevel: response.degradationLevel,
      fallbackStrategy: resilienceResult.fallbackStrategy
    });

    res.status(202).json(response); // 202 Accepted for fallback responses
  }

  /**
   * Send standard error response when resilience options are exhausted
   */
  private async sendStandardErrorResponse(
    res: Response,
    error: any,
    context: ResilienceContext,
    requestId: string
  ): Promise<void> {
    let appError = error;

    // Convert to AppError if needed
    if (!(error instanceof AppError)) {
      appError = new AppError(
        config.app.nodeEnv === "production" ? "Service temporarily unavailable" : error instanceof Error ? error?.message : String(error),
        error?.statusCode || 503,
        'SERVICE_UNAVAILABLE'
      );
    }

    const userCategory = this.categorizeForUser(context.component, error);
    const userMessage = this.userFriendlyMessages.get(userCategory);

    const response = {
      status: appError.status,
      error: {
        code: appError?.code || "SERVICE_ERROR",
        message: userMessage?.message || appError?.message,
        userAction: userMessage?.userAction,
        retryAfter: this.calculateRetryAfter(context)
      },
      timestamp: new Date().toISOString()
    };

    // Log error appropriately
    if (appError.statusCode >= 500) {
      logError(
        appError,
        {
          requestId,
          component: context.component,
          operation: context.operation,
          businessImpact: context.businessImpact
        },
        context.userId,
        req.ip
      );
    }

    logger.error("Standard error response sent", {
      requestId,
      component: context.component,
      statusCode: appError.statusCode,
      errorCode: appError.code,
      businessImpact: context.businessImpact
    });

    res.status(appError.statusCode).json(response);
  }

  /**
   * Send emergency error response when everything else fails
   */
  private async sendEmergencyErrorResponse(
    res: Response,
    error: any,
    requestId: string
  ): Promise<void> {
    const emergencyResponse = {
      status: "error",
      error: {
        code: "SYSTEM_ERROR",
        message: "The system is currently experiencing difficulties. Please try again later.",
        userAction: "Please try your request again in a few minutes. If the problem persists, contact support."
      }
    };

    logger.error("Emergency error response sent", {
      requestId,
      originalError: error instanceof Error ? error?.message : String(error),
      emergencyMode: true
    });

    res.status(503).json(emergencyResponse);
  }

  /**
   * =============================================================================
   * CONTEXT EXTRACTION AND CONFIGURATION
   * =============================================================================
   */

  /**
   * Extract resilience context from request
   */
  private extractResilienceContext(req: Request, error: any): ResilienceContext {
    const path = req.path;
    const method = req.method;
    
    // Determine component based on request path
    let component = SystemComponent.FRONTEND; // Default
    let operation = `${method.toLowerCase()}_${path}`;
    let businessImpact = BusinessImpactLevel.MEDIUM; // Default
    let allowFallback = true;

    // Route-based component detection
    if (path.includes('/api/auth/')) {
      component = SystemComponent.AUTHENTICATION;
      businessImpact = BusinessImpactLevel.HIGH;
      allowFallback = false; // Auth should not have fallbacks
    } else if (path.includes('/api/routes/') || path.includes('/route-optimization/')) {
      component = SystemComponent.ROUTE_OPTIMIZATION;
      businessImpact = BusinessImpactLevel.HIGH;
      operation = this.extractRouteOperation(path, method);
    } else if (path.includes('/api/crypto/') || path.includes('/mfa/')) {
      component = SystemComponent.CRYPTO_SERVICE;
      businessImpact = BusinessImpactLevel.HIGH;
      allowFallback = false; // Crypto operations shouldn't have fallbacks
    } else if (path.includes('/api/external/')) {
      component = SystemComponent.EXTERNAL_API;
      businessImpact = BusinessImpactLevel.MEDIUM;
    } else if (path.includes('/api/cache/')) {
      component = SystemComponent.CACHE;
      businessImpact = BusinessImpactLevel.LOW;
    }

    // Adjust based on error type
    if (error instanceof DatabaseOperationError) {
      component = SystemComponent.DATABASE;
      businessImpact = BusinessImpactLevel.HIGH;
    } else if (error instanceof ExternalServiceError) {
      component = SystemComponent.EXTERNAL_API;
      businessImpact = BusinessImpactLevel.MEDIUM;
    }

    return {
      component,
      operation,
      businessImpact,
      allowFallback,
      userId: req.user?.id,
      organizationId: req.user?.organizationId || req.headers['x-organization-id'] as string,
      requestId: req.headers["x-request-id"] as string
    };
  }

  /**
   * Extract specific route operation from path
   */
  private extractRouteOperation(path: string, method: string): string {
    if (path.includes('optimize')) return 'optimize_routes';
    if (path.includes('adapt')) return 'adapt_routes';
    if (path.includes('fallback')) return 'fallback_routes';
    return `route_${method.toLowerCase()}`;
  }

  /**
   * Initialize fallback templates
   */
  private initializeFallbackTemplates(): void {
    // Route optimization fallbacks
    this.fallbackTemplates.set('route_optimization_optimize', {
      success: true,
      data: {
        routes: [],
        optimization: 'simplified',
        message: 'Using simplified routing algorithm'
      },
      message: 'Route optimization is using simplified algorithms due to system load',
      fallback: true,
      limitations: ['Advanced optimization features disabled', 'Traffic data may not be current']
    });

    // Database operation fallbacks
    this.fallbackTemplates.set('database_read', {
      success: true,
      data: null,
      message: 'Data temporarily unavailable, using cached information where possible',
      fallback: true,
      limitations: ['Data may not be current', 'Some details may be missing']
    });

    // External API fallbacks
    this.fallbackTemplates.set('external_api', {
      success: true,
      data: {
        status: 'degraded',
        message: 'External service integration temporarily limited'
      },
      message: 'External service features are temporarily limited',
      fallback: true,
      limitations: ['Real-time data unavailable', 'Some integrations disabled']
    });
  }

  /**
   * Initialize user-friendly messages
   */
  private initializeUserMessages(): void {
    this.userFriendlyMessages.set(UserErrorCategory.TEMPORARY_UNAVAILABLE, {
      message: "This service is temporarily unavailable. We're working to restore it quickly.",
      userAction: "Please try again in a few minutes. Your data is safe.",
      technicalNote: "Service experiencing temporary difficulties"
    });

    this.userFriendlyMessages.set(UserErrorCategory.DEGRADED_SERVICE, {
      message: "Service is running in limited mode to ensure stability.",
      userAction: "Core functionality is available. Some advanced features may be temporarily disabled.",
      technicalNote: "System running in degraded mode"
    });

    this.userFriendlyMessages.set(UserErrorCategory.AUTHENTICATION_REQUIRED, {
      message: "Please sign in to access this feature.",
      userAction: "Sign in with your account credentials.",
      technicalNote: "Authentication token missing or expired"
    });

    this.userFriendlyMessages.set(UserErrorCategory.PERMISSION_DENIED, {
      message: "You don't have permission to perform this action.",
      userAction: "Contact your administrator if you believe this is incorrect.",
      technicalNote: "Insufficient permissions for requested operation"
    });

    this.userFriendlyMessages.set(UserErrorCategory.VALIDATION_FAILED, {
      message: "Please check your input and try again.",
      userAction: "Review the highlighted fields and correct any errors.",
      technicalNote: "Input validation failed"
    });

    this.userFriendlyMessages.set(UserErrorCategory.RATE_LIMITED, {
      message: "You're making requests too quickly. Please slow down.",
      userAction: "Wait a moment before trying again.",
      technicalNote: "Rate limit exceeded"
    });

    this.userFriendlyMessages.set(UserErrorCategory.EXTERNAL_DEPENDENCY, {
      message: "A required external service is currently unavailable.",
      userAction: "Please try again later. We're working to resolve this.",
      technicalNote: "External service dependency failure"
    });
  }

  /**
   * =============================================================================
   * HELPER METHODS
   * =============================================================================
   */

  /**
   * Get fallback template for component and operation
   */
  private getFallbackTemplate(component: SystemComponent, operation: string): FallbackResponse {
    const key = `${component}_${operation}`;
    return this.fallbackTemplates.get(key) || this.getDefaultFallbackTemplate();
  }

  /**
   * Get default fallback template
   */
  private getDefaultFallbackTemplate(): FallbackResponse {
    return {
      success: true,
      data: null,
      message: 'Service is temporarily running in limited mode',
      fallback: true,
      limitations: ['Some features may be temporarily unavailable']
    };
  }

  /**
   * Categorize error for user-friendly messaging
   */
  private categorizeForUser(component: SystemComponent, error: any): UserErrorCategory {
    if (error instanceof AuthenticationError) {
      return UserErrorCategory.AUTHENTICATION_REQUIRED;
    }
    if (error instanceof AuthorizationError) {
      return UserErrorCategory.PERMISSION_DENIED;
    }
    if (error instanceof ValidationError) {
      return UserErrorCategory.VALIDATION_FAILED;
    }
    if (error instanceof ExternalServiceError) {
      return UserErrorCategory.EXTERNAL_DEPENDENCY;
    }
    if (error instanceof CircuitBreakerError || error instanceof ResourceUnavailableError) {
      return UserErrorCategory.DEGRADED_SERVICE;
    }
    
    return UserErrorCategory.TEMPORARY_UNAVAILABLE;
  }

  /**
   * Get fallback message based on context
   */
  private getFallbackMessage(context: ResilienceContext): string {
    switch (context.component) {
      case SystemComponent.ROUTE_OPTIMIZATION:
        return "Route optimization is using simplified algorithms to ensure service availability";
      case SystemComponent.DATABASE:
        return "Using cached data while database connectivity is restored";
      case SystemComponent.EXTERNAL_API:
        return "External service integrations are temporarily limited";
      default:
        return "Service is running in limited mode to maintain availability";
    }
  }

  /**
   * Get fallback limitations based on context
   */
  private getFallbackLimitations(context: ResilienceContext): string[] {
    const limitations: string[] = [];
    
    switch (context.component) {
      case SystemComponent.ROUTE_OPTIMIZATION:
        limitations.push("Advanced optimization algorithms disabled");
        limitations.push("Real-time traffic data may be limited");
        break;
      case SystemComponent.DATABASE:
        limitations.push("Data may not be current");
        limitations.push("Some historical data may be unavailable");
        break;
      case SystemComponent.EXTERNAL_API:
        limitations.push("Third-party integrations limited");
        limitations.push("Real-time updates may be delayed");
        break;
    }
    
    return limitations;
  }

  /**
   * Calculate retry after time based on context
   */
  private calculateRetryAfter(context: ResilienceContext): number {
    switch (context.businessImpact) {
      case BusinessImpactLevel.CRITICAL:
        return 300; // 5 minutes
      case BusinessImpactLevel.HIGH:
        return 180; // 3 minutes
      case BusinessImpactLevel.MEDIUM:
        return 60;  // 1 minute
      default:
        return 30;  // 30 seconds
    }
  }

  /**
   * Determine appropriate status code
   */
  private determineStatusCode(resilienceResult: any, context: ResilienceContext): number {
    if (resilienceResult.fallback) {
      return 202; // Accepted - processed with limitations
    }
    if (context.businessImpact === BusinessImpactLevel.CRITICAL) {
      return 200; // OK - critical operations should appear successful when recovered
    }
    return 200; // OK
  }

  /**
   * Check if operation can be retried
   */
  private canRetry(error: AppError, context: ResilienceContext): boolean {
    // Don't retry auth errors, validation errors, or permission errors
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError ||
        error instanceof ValidationError) {
      return false;
    }

    // Don't retry crypto operations
    if (context.component === SystemComponent.CRYPTO_SERVICE) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize request for logging
   */
  private sanitizeRequestForLogging(req: Request): any {
    return {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for']
      },
      ip: req.ip,
      userId: req.user?.id
    };
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create and export middleware instance
 */
const resilienceErrorHandler = new ResilienceErrorHandlerMiddleware();

/**
 * Express middleware function
 */
export const resilienceErrorMiddleware = resilienceErrorHandler.handle;

/**
 * Health check endpoint for resilience status
 */
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthReport = await resilienceErrorHandler.resilienceService.getSystemHealthReport();
    
    if (healthReport.success) {
      res.status(200).json({
        status: 'healthy',
        ...healthReport.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        message: healthReport?.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: unknown) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

export default resilienceErrorHandler;