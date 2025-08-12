/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR RECOVERY MIDDLEWARE
 * ============================================================================
 *
 * Advanced error recovery middleware that integrates error monitoring,
 * graceful degradation, and automated recovery strategies across the application.
 * Provides comprehensive error boundary functionality for Express.js.
 *
 * Features:
 * - Automatic error classification and routing
 * - Integrated error monitoring and alerting
 * - Graceful degradation with fallback responses
 * - Recovery strategy execution
 * - Performance impact tracking
 * - Security incident detection and response
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from "express";
import {
  AppError,
  ExternalServiceError,
  DatabaseOperationError,
  TimeoutError,
  CircuitBreakerError,
  NetworkError,
  gracefulDegradation,
} from "@/middleware/errorHandler";
import { errorMonitoring } from "@/services/ErrorMonitoringService";
import { databaseRecovery } from "@/services/DatabaseRecoveryService";
import { logger, logError, logSecurityEvent } from "@/utils/logger";
import { config } from "@/config";

/**
 * Recovery strategy interface
 */
interface RecoveryStrategy {
  name: string;
  canHandle: (error: AppError, context: any) => boolean;
  recover: (error: AppError, context: any) => Promise<any>;
  priority: number;
}

/**
 * Request context interface
 */
interface RequestContext {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  url: string;
  method: string;
  startTime: number;
  headers: Record<string, string>;
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Recovery response interface
 */
interface RecoveryResponse {
  recovered: boolean;
  strategy?: string;
  fallbackData?: any;
  retryAfter?: number;
  message: string;
}

/**
 * Error recovery middleware class
 */
export class ErrorRecoveryMiddleware {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private securityThresholds = {
    maxFailuresPerMinute: 50,
    maxFailuresPerUser: 10,
    suspiciousPatterns: ["SQL injection", "XSS", "CSRF"],
  };

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Main error recovery middleware function
   */
  public middleware = async (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    const context = this.buildRequestContext(req);
    let appError = this.normalizeError(error);

    try {
      // Track the error
      const errorId = await errorMonitoring.trackError(appError, {
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
        method: context.method,
        headers: context.headers,
        body: context.body,
        params: context.params,
        query: context.query,
      });

      // Check for security incidents
      await this.checkSecurityIncident(appError, context);

      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(appError, context);

      if (recoveryResult.recovered) {
        // Recovery successful - send recovered response
        await this.sendRecoveredResponse(
          res,
          appError,
          recoveryResult,
          context,
        );

        // Mark error as resolved
        await errorMonitoring.resolveError(errorId, recoveryResult.strategy);
      } else {
        // Recovery failed - send error response with fallback if available
        await this.sendErrorResponse(res, appError, context, recoveryResult);
      }
    } catch (recoveryError) {
      // Recovery process failed - fall back to basic error handling
      logger.error("Error recovery process failed", {
        originalError: appError.message,
        recoveryError: recoveryError.message,
        context,
      });

      await this.sendErrorResponse(res, appError, context);
    }
  };

  /**
   * Add custom recovery strategy
   */
  public addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove recovery strategy
   */
  public removeRecoveryStrategy(name: string): boolean {
    const index = this.recoveryStrategies.findIndex((s) => s.name === name);
    if (index >= 0) {
      this.recoveryStrategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Build request context
   */
  private buildRequestContext(req: Request): RequestContext {
    return {
      requestId:
        (req.headers["x-request-id"] as string) ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: (req as any).user?.id,
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
      method: req.method,
      startTime: Date.now(),
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      params: req.params,
      query: req.query,
    };
  }

  /**
   * Normalize error to AppError
   */
  private normalizeError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Convert common error types
    if (error.name === "ValidationError") {
      return new AppError(
        error.message,
        400,
        "VALIDATION_ERROR",
        error.details,
      );
    }

    if (error.name === "UnauthorizedError" || error.status === 401) {
      return new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    if (error.name === "ForbiddenError" || error.status === 403) {
      return new AppError("Access denied", 403, "ACCESS_DENIED");
    }

    // Generic error
    return new AppError(
      config.app.nodeEnv === "production"
        ? "Internal server error"
        : error.message,
      error.statusCode || error.status || 500,
      error.code || "INTERNAL_ERROR",
    );
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(
    error: AppError,
    context: RequestContext,
  ): Promise<RecoveryResponse> {
    // Try recovery strategies in priority order
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canHandle(error, context)) {
        try {
          logger.info(`Attempting recovery with strategy: ${strategy.name}`, {
            error: error.message,
            context: context.url,
          });

          const result = await strategy.recover(error, context);

          return {
            recovered: true,
            strategy: strategy.name,
            fallbackData: result,
            message: `Recovered using ${strategy.name} strategy`,
          };
        } catch (strategyError) {
          logger.warn(`Recovery strategy ${strategy.name} failed`, {
            error: error.message,
            strategyError: strategyError.message,
          });
        }
      }
    }

    // Try graceful degradation as last resort
    try {
      const fallbackResult = await gracefulDegradation.handleGracefully(error, {
        requestContext: context,
      });

      return {
        recovered: true,
        strategy: "graceful_degradation",
        fallbackData: fallbackResult,
        retryAfter: fallbackResult.retryAfter,
        message: "Service temporarily degraded",
      };
    } catch (degradationError) {
      return {
        recovered: false,
        message: "Unable to recover from error",
      };
    }
  }

  /**
   * Send recovered response
   */
  private async sendRecoveredResponse(
    res: Response,
    error: AppError,
    recovery: RecoveryResponse,
    context: RequestContext,
  ): Promise<void> {
    const response = {
      success: false,
      recovered: true,
      message: recovery.message,
      data: recovery.fallbackData,
      error: {
        code: error.code,
        message: error.message,
        recoveredBy: recovery.strategy,
      },
      metadata: {
        requestId: context.requestId,
        duration: Date.now() - context.startTime,
        timestamp: new Date().toISOString(),
        retryAfter: recovery.retryAfter,
      },
    };

    // Set retry headers if applicable
    if (recovery.retryAfter) {
      res.set("Retry-After", Math.ceil(recovery.retryAfter / 1000).toString());
    }

    res.status(error.statusCode < 500 ? error.statusCode : 200).json(response);

    logger.info("Error recovered successfully", {
      errorCode: error.code,
      strategy: recovery.strategy,
      requestId: context.requestId,
    });
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(
    res: Response,
    error: AppError,
    context: RequestContext,
    recovery?: RecoveryResponse,
  ): Promise<void> {
    const response: any = {
      success: false,
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: error.message,
      },
      metadata: {
        requestId: context.requestId,
        duration: Date.now() - context.startTime,
        timestamp: new Date().toISOString(),
      },
    };

    // Include recovery information if available
    if (recovery) {
      response.recovery = {
        attempted: true,
        succeeded: recovery.recovered,
        retryAfter: recovery.retryAfter,
      };

      if (recovery.retryAfter) {
        res.set(
          "Retry-After",
          Math.ceil(recovery.retryAfter / 1000).toString(),
        );
      }
    }

    // Include error details in development
    if (config.app.nodeEnv === "development") {
      response.error.details = error.details;
      response.error.stack = error.stack;
    }

    // Include validation errors
    if (error.details && error.code === "VALIDATION_ERROR") {
      response.error.validation = error.details;
    }

    res.status(error.statusCode).json(response);

    logError(
      error,
      {
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        duration: Date.now() - context.startTime,
        recovery: recovery
          ? {
              attempted: true,
              succeeded: recovery.recovered,
              strategy: recovery.strategy,
            }
          : { attempted: false },
      },
      context.userId,
      context.ip,
    );
  }

  /**
   * Check for security incidents
   */
  private async checkSecurityIncident(
    error: AppError,
    context: RequestContext,
  ): Promise<void> {
    const isSecurityRelated =
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.code?.includes("SECURITY") ||
      error.code?.includes("AUTHENTICATION") ||
      error.code?.includes("AUTHORIZATION");

    if (isSecurityRelated) {
      logSecurityEvent(
        "security_error_detected",
        {
          error: error.message,
          code: error.code,
          url: context.url,
          method: context.method,
          userAgent: context.userAgent,
        },
        context.userId,
        context.ip,
        error.statusCode === 401 ? "medium" : "high",
      );

      // Check for potential attacks
      const suspiciousPatterns = this.securityThresholds.suspiciousPatterns;
      const isSuspicious = suspiciousPatterns.some((pattern) =>
        error.message.toLowerCase().includes(pattern.toLowerCase()),
      );

      if (isSuspicious) {
        logSecurityEvent(
          "potential_security_attack",
          {
            error: error.message,
            pattern: suspiciousPatterns.find((p) =>
              error.message.toLowerCase().includes(p.toLowerCase()),
            ),
            context,
          },
          context.userId,
          context.ip,
          "critical",
        );
      }
    }
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Database recovery strategy
    this.addRecoveryStrategy({
      name: "database_recovery",
      priority: 100,
      canHandle: (error) => error instanceof DatabaseOperationError,
      recover: async (error, context) => {
        // Try to use cached data or trigger database recovery
        const cachedData = await databaseRecovery.getCachedFallback(
          context.url,
        );
        if (cachedData) {
          return {
            data: cachedData,
            message: "Serving cached data due to database issues",
            retryAfter: 60000, // 1 minute
          };
        }

        // Trigger database connection check
        await databaseRecovery.checkConnection();
        throw new Error("No cached data available");
      },
    });

    // External service recovery strategy
    this.addRecoveryStrategy({
      name: "external_service_recovery",
      priority: 90,
      canHandle: (error) => error instanceof ExternalServiceError,
      recover: async (error: ExternalServiceError, context) => {
        if (!error.retryable) {
          throw new Error("Service error is not retryable");
        }

        return {
          message: `External service ${error.service} is temporarily unavailable`,
          retryAfter: 300000, // 5 minutes
          serviceStatus: "degraded",
        };
      },
    });

    // Timeout recovery strategy
    this.addRecoveryStrategy({
      name: "timeout_recovery",
      priority: 80,
      canHandle: (error) => error instanceof TimeoutError,
      recover: async (error: TimeoutError, context) => {
        // For read operations, try to serve cached data
        if (context.method === "GET") {
          return {
            message: "Request timed out, please try again",
            retryAfter: 30000, // 30 seconds
            suggestion:
              "Consider breaking down your request into smaller parts",
          };
        }

        throw new Error("Write operation timeout cannot be recovered");
      },
    });

    // Circuit breaker recovery strategy
    this.addRecoveryStrategy({
      name: "circuit_breaker_recovery",
      priority: 70,
      canHandle: (error) => error instanceof CircuitBreakerError,
      recover: async (error, context) => {
        return {
          message: "Service is temporarily unavailable due to high error rates",
          retryAfter: 300000, // 5 minutes
          status: "circuit_open",
          healthCheck: "/health",
        };
      },
    });

    // Network recovery strategy
    this.addRecoveryStrategy({
      name: "network_recovery",
      priority: 60,
      canHandle: (error) => error instanceof NetworkError,
      recover: async (error, context) => {
        return {
          message: "Network connectivity issues detected",
          retryAfter: 60000, // 1 minute
          suggestion: "Check your internet connection and try again",
        };
      },
    });

    // Generic read operation recovery
    this.addRecoveryStrategy({
      name: "read_operation_cache",
      priority: 50,
      canHandle: (error, context) =>
        context.method === "GET" && error.statusCode >= 500,
      recover: async (error, context) => {
        // Try to serve stale cached data for read operations
        const cacheKey = `stale:${context.url}:${JSON.stringify(context.query)}`;
        const staleData = await databaseRecovery.getCachedFallback(cacheKey);

        if (staleData) {
          return {
            data: staleData,
            message: "Serving cached data due to service issues",
            stale: true,
            retryAfter: 120000, // 2 minutes
          };
        }

        throw new Error("No cached data available");
      },
    });
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "***REDACTED***";
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") return body;

    const sanitized = { ...body };
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "creditCard",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    });

    return sanitized;
  }
}

// Export middleware instance
export const errorRecoveryMiddleware = new ErrorRecoveryMiddleware();

export default errorRecoveryMiddleware;
