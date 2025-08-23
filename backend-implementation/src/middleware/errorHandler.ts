/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR HANDLER MIDDLEWARE
 * ============================================================================
 *
 * Global error handling middleware for Express application.
 * Provides consistent error responses and logging.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response, NextFunction } from "express";
import { ValidationError as JoiValidationError } from "joi";
import {
  ValidationError as SequelizeValidationError,
  DatabaseError,
} from "sequelize";
import { logger, logError, logSecurityEvent } from "@/utils/logger";
import { config } from "@/config";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed", details?: any) {
    super(message, 401, "AUTHENTICATION_FAILED", details);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "ACCESS_DENIED");
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400, "BAD_REQUEST");
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  public service: string;
  public retryable: boolean;

  constructor(service: string, message?: string, retryable: boolean = true) {
    super(
      message || `External service ${service} is currently unavailable`,
      503,
      "EXTERNAL_SERVICE_ERROR",
      { service, retryable },
    );
    this.service = service;
    this.retryable = retryable;
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = "Network error occurred") {
    super(message, 503, "NETWORK_ERROR");
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation ${operation} timed out after ${timeout}ms`,
      408,
      "TIMEOUT_ERROR",
      { operation, timeout },
    );
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends AppError {
  constructor(service: string) {
    super(
      `Service ${service} is temporarily unavailable (circuit breaker open)`,
      503,
      "CIRCUIT_BREAKER_OPEN",
      { service },
    );
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends AppError {
  constructor(limit: number, window: number, retryAfter?: number) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}s`,
      429,
      "RATE_LIMIT_EXCEEDED",
      { limit, window, retryAfter },
    );
  }
}

/**
 * Resource not available error
 */
export class ResourceUnavailableError extends AppError {
  constructor(resource: string, reason?: string) {
    super(
      `Resource ${resource} is currently unavailable${reason ? `: ${reason}` : ""}`,
      503,
      "RESOURCE_UNAVAILABLE",
      { resource, reason },
    );
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    super(message, 500, "CONFIGURATION_ERROR", { configKey });
  }
}

/**
 * Database operation error
 */
export class DatabaseOperationError extends AppError {
  constructor(message: string, operation?: string) {
    super(message, 500, "DATABASE_ERROR", { operation });
  }
}

/**
 * Handle Joi validation errors
 */
const handleJoiError = (error: JoiValidationError): AppError => {
  const errors = error.details.map((detail) => ({
    field: detail.path.join("."),
    message: detail?.message,
    value: detail.context?.value,
  }));

  return new ValidationError("Validation failed", { errors });
};

/**
 * Handle Sequelize validation errors
 */
const handleSequelizeValidationError = (
  error: SequelizeValidationError,
): AppError => {
  const errors = error.errors.map((err) => ({
    field: err.path,
    message: err?.message,
    value: err.value,
    type: err.type,
  }));

  return new ValidationError("Database validation failed", { errors });
};

/**
 * Handle Sequelize database errors
 */
const handleSequelizeDatabaseError = (error: DatabaseError): AppError => {
  // Handle specific database error types
  switch (error.parent?.code) {
    case "23505": // Unique constraint violation
      return new ValidationError("Duplicate entry found", {
        constraint: error.parent.constraint,
        detail: error.parent.detail,
      });

    case "23503": // Foreign key constraint violation
      return new ValidationError("Referenced record not found", {
        constraint: error.parent.constraint,
        detail: error.parent.detail,
      });

    case "23514": // Check constraint violation
      return new ValidationError("Data constraint violation", {
        constraint: error.parent.constraint,
        detail: error.parent.detail,
      });

    case "08006": // Connection failure
    case "08003": // Connection does not exist
      return new DatabaseOperationError("Database connection failed");

    case "53300": // Too many connections
      return new DatabaseOperationError("Database connection limit reached");

    default:
      return new DatabaseOperationError(
        config.app.nodeEnv === "production"
          ? "Database operation failed"
          : error instanceof Error ? error?.message : String(error),
      );
  }
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error: any): AppError => {
  if (error.name === "JsonWebTokenError") {
    return new AuthenticationError("Invalid token");
  }
  if (error.name === "TokenExpiredError") {
    return new AuthenticationError("Token expired");
  }
  if (error.name === "NotBeforeError") {
    return new AuthenticationError("Token not active");
  }
  return new AuthenticationError("Token validation failed");
};

/**
 * Handle Multer errors (file upload)
 */
const handleMulterError = (error: any): AppError => {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return new ValidationError("File too large");
    case "LIMIT_FILE_COUNT":
      return new ValidationError("Too many files");
    case "LIMIT_UNEXPECTED_FILE":
      return new ValidationError("Unexpected file field");
    default:
      return new ValidationError("File upload error");
  }
};

/**
 * Send error response
 */
const sendErrorResponse = (
  res: Response,
  error: AppError,
  requestId?: string,
) => {
  const response: any = {
    status: error.status,
    error: {
      code: error?.code || "INTERNAL_ERROR",
      message: error instanceof Error ? error?.message : String(error),
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Include error details in development
  if (config.app.nodeEnv === "development") {
    response.error.details = error.details;
    response.error instanceof Error ? error?.stack : undefined = error instanceof Error ? error?.stack : undefined;
  }

  // Include validation errors
  if (error.details && error.code === "VALIDATION_ERROR") {
    response.error.validation = error.details;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Development error response (includes stack trace)
 */
const sendErrorDev = (err: AppError, req: Request, res: Response) => {
  const requestId = req.headers["x-request-id"] as string;

  logger.error("Error in development mode:", {
    error: err?.message,
    stack: err?.stack,
    requestId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  sendErrorResponse(res, err, requestId);
};

/**
 * Production error response (no stack trace)
 */
const sendErrorProd = (err: AppError, req: Request, res: Response) => {
  const requestId = req.headers["x-request-id"] as string;

  // Log operational errors
  if (err.isOperational) {
    logError(
      err,
      {
        requestId,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      },
      req.user?.id,
      req.ip,
    );

    sendErrorResponse(res, err, requestId);
  } else {
    // Log programming errors
    logger.error("Non-operational error in production:", {
      error: err?.message,
      stack: err?.stack,
      requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    // Send generic error message
    const genericError = new AppError(
      "Something went wrong",
      500,
      "INTERNAL_ERROR",
    );
    sendErrorResponse(res, genericError, requestId);
  }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  // Convert known error types to AppError
  if (err.isJoi) {
    error = handleJoiError(err);
  } else if (err instanceof SequelizeValidationError) {
    error = handleSequelizeValidationError(err);
  } else if (err instanceof DatabaseError) {
    error = handleSequelizeDatabaseError(err);
  } else if (err.name && err.name.includes("JWT")) {
    error = handleJWTError(err);
  } else if (err.code && err.code.startsWith("LIMIT_")) {
    error = handleMulterError(err);
  } else if (!(err instanceof AppError)) {
    // Convert unknown errors to AppError
    error = new AppError(
      config.app.nodeEnv === "production"
        ? "Internal server error"
        : err?.message,
      err?.statusCode || 500,
    );
    error instanceof Error ? error?.stack : undefined = err?.stack;
    error.isOperational = false;
  }

  // Log security-related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    logSecurityEvent(
      "authorization_failed",
      {
        error: error instanceof Error ? error?.message : String(error),
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get("User-Agent"),
      },
      req.user?.id,
      req.ip,
      "medium",
    );
  }

  // Handle rate limit errors
  if (error instanceof RateLimitError) {
    res.set({
      "Retry-After": Math.round(config.rateLimit.windowMs / 1000),
      "X-RateLimit-Limit": config.rateLimit.maxRequests,
      "X-RateLimit-Remaining": 0,
      "X-RateLimit-Reset": new Date(
        Date.now() + config.rateLimit.windowMs,
      ).toISOString(),
    });
  }

  // Send appropriate error response
  if (config.app.nodeEnv === "development") {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Handle 404 errors (catch-all for undefined routes)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation middleware wrapper
 */
export const validateRequest = (
  schema: any,
  property: "body" | "query" | "params" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property]);
    if (error) {
      return next(error);
    }
    next();
  };
};

/**
 * Database transaction wrapper with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string = "Database operation",
): Promise<T> => {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof SequelizeValidationError) {
      throw handleSequelizeValidationError(error);
    } else if (error instanceof DatabaseError) {
      throw handleSequelizeDatabaseError(error);
    } else if (error instanceof AppError) {
      throw error;
    } else {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      throw new DatabaseOperationError(`${context} failed: ${errorMessage}`);
    }
  }
};

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError, context?: any): Promise<any>;
}

/**
 * Graceful degradation handler
 */
export class GracefulDegradationHandler {
  private fallbackHandlers: Map<string, Function> = new Map();

  registerFallback(errorCode: string, handler: Function) {
    this.fallbackHandlers.set(errorCode, handler);
  }

  async handleGracefully(error: AppError, context?: any): Promise<any> {
    const handler = this.fallbackHandlers.get(error?.code || "DEFAULT");
    if (handler) {
      try {
        return await handler(error, context);
      } catch (fallbackError: unknown) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError?.message : 'Unknown fallback error';
        logger.error("Fallback handler failed", {
          originalError: error instanceof Error ? error?.message : String(error),
          fallbackError: fallbackErrorMessage,
        });
      }
    }
    throw error;
  }
}

// Global graceful degradation instance
export const gracefulDegradation = new GracefulDegradationHandler();

// Register default fallback handlers
gracefulDegradation.registerFallback(
  "EXTERNAL_SERVICE_ERROR",
  async (error: ExternalServiceError) => {
    return {
      success: false,
      message: `Service ${error.service} is temporarily unavailable. Please try again later.`,
      fallback: true,
      retryAfter: 300, // 5 minutes
    };
  },
);

gracefulDegradation.registerFallback(
  "DATABASE_ERROR",
  async (error: DatabaseOperationError) => {
    return {
      success: false,
      message:
        "Data service is temporarily unavailable. Please try again in a moment.",
      fallback: true,
      retryAfter: 60, // 1 minute
    };
  },
);

gracefulDegradation.registerFallback(
  "TIMEOUT_ERROR",
  async (error: TimeoutError) => {
    return {
      success: false,
      message: "Request is taking longer than expected. Please try again.",
      fallback: true,
      retryAfter: 30, // 30 seconds
    };
  },
);

// Export error classes and middleware
export {
  AuthenticationError,
  AuthorizationError,
  ValidationError as AppValidationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  DatabaseOperationError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
  RateLimitExceededError,
  ResourceUnavailableError,
  ConfigurationError,
};

// Default export
export default AppError;
