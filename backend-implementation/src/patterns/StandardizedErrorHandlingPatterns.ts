/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - STANDARDIZED ERROR HANDLING PATTERNS
 * ============================================================================
 *
 * Comprehensive error handling patterns for consistent error management
 * across the entire codebase. Provides standardized patterns for different
 * error categories with proper typing, logging, and recovery strategies.
 *
 * Error Categories:
 * 1. Database Operations
 * 2. External API Integration
 * 3. Business Logic Validation
 * 4. System Operations
 * 5. Authentication/Authorization
 * 6. Network and Communication
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Enterprise Error Standardization
 */

import { logger, Timer } from "@/utils/logger";
import {
  AppError,
  ValidationError,
  ExternalServiceError,
  DatabaseOperationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
  ConfigurationError,
} from "@/middleware/errorHandler";

/**
 * Error handling context interface
 */
export interface ErrorHandlingContext {
  operation: string;
  serviceName: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  businessImpact?: "low" | "medium" | "high" | "critical";
  retryable?: boolean;
}

/**
 * Standardized error handling result
 */
export interface ErrorHandlingResult<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  fallbackUsed?: boolean;
  retryCount?: number;
  recoveryStrategy?: string;
}

/**
 * Database operation error handler
 */
export class DatabaseErrorHandler {
  /**
   * Handle database operation with standardized error patterns
   */
  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext
  ): Promise<ErrorHandlingResult<T>> {
    const timer = new Timer(`${context.serviceName}.${context.operation}`);
    
    try {
      const result = await operation();
      timer.end({ success: true });
      
      logger.info(`${context.serviceName}.${context.operation} completed successfully`, {
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : 'Unknown error' });
      
      const standardizedError = this.standardizeDatabaseError(error, context);
      
      logger.error(`${context.serviceName}.${context.operation} failed`, {
        error: standardizedError?.message,
        code: standardizedError.code,
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
        businessImpact: context.businessImpact,
      });

      return {
        success: false,
        error: standardizedError,
      };
    }
  }

  /**
   * Standardize database errors to consistent AppError format
   */
  private static standardizeDatabaseError(error: unknown, context: ErrorHandlingContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle Sequelize specific errors
      if (error.name === "SequelizeValidationError") {
        return new ValidationError(`Database validation failed in ${context.operation}`, error);
      }
      
      if (error.name === "SequelizeUniqueConstraintError") {
        return new ValidationError(`Duplicate entry found in ${context.operation}`, error);
      }
      
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return new ValidationError(`Referenced record not found in ${context.operation}`, error);
      }
      
      if (error.name === "SequelizeConnectionError") {
        return new DatabaseOperationError(`Database connection failed during ${context.operation}`);
      }
      
      if (error.name === "SequelizeTimeoutError") {
        return new TimeoutError(context.operation, 30000);
      }

      return new DatabaseOperationError(`Database operation failed: ${error instanceof Error ? error?.message : String(error)}`, context.operation);
    }

    return new DatabaseOperationError(`Unknown database error in ${context.operation}`, context.operation);
  }
}

/**
 * External API error handler
 */
export class ExternalAPIErrorHandler {
  /**
   * Handle external API operation with standardized error patterns
   */
  static async handleExternalAPIOperation<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext & { serviceName: string; endpoint?: string }
  ): Promise<ErrorHandlingResult<T>> {
    const timer = new Timer(`external_api.${context.serviceName}.${context.operation}`);
    
    try {
      const result = await operation();
      timer.end({ success: true, service: context.serviceName });
      
      logger.info(`External API ${context.serviceName}.${context.operation} completed`, {
        service: context.serviceName,
        endpoint: context.endpoint,
        userId: context.userId,
        requestId: context.requestId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : 'Unknown error', service: context.serviceName });
      
      const standardizedError = this.standardizeExternalAPIError(error, context);
      
      logger.error(`External API ${context.serviceName}.${context.operation} failed`, {
        error: standardizedError?.message,
        code: standardizedError.code,
        service: context.serviceName,
        endpoint: context.endpoint,
        userId: context.userId,
        requestId: context.requestId,
        businessImpact: context.businessImpact,
      });

      return {
        success: false,
        error: standardizedError,
      };
    }
  }

  /**
   * Standardize external API errors to consistent AppError format
   */
  private static standardizeExternalAPIError(
    error: unknown, 
    context: ErrorHandlingContext & { serviceName: string }
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle Axios errors
      if (error.name === "AxiosError") {
        const axiosError = error as any;
        
        if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
          return new TimeoutError(context.operation, 30000);
        }
        
        if (axiosError.code === "ENOTFOUND" || axiosError.code === "ECONNREFUSED") {
          return new NetworkError(`Network error connecting to ${context.serviceName}`);
        }
        
        if (axiosError.response?.status === 401) {
          return new AuthenticationError(`Authentication failed with ${context.serviceName}`);
        }
        
        if (axiosError.response?.status === 403) {
          return new AuthorizationError(`Access denied by ${context.serviceName}`);
        }
        
        if (axiosError.response?.status === 429) {
          return new ExternalServiceError(
            context.serviceName,
            `Rate limit exceeded for ${context.serviceName}`,
            true
          );
        }
        
        if (axiosError.response?.status >= 500) {
          return new ExternalServiceError(
            context.serviceName,
            `Server error from ${context.serviceName}: ${axiosError.response.status}`,
            true
          );
        }
      }

      return new ExternalServiceError(
        context.serviceName,
        `External service error: ${error instanceof Error ? error?.message : String(error)}`,
        true
      );
    }

    return new ExternalServiceError(
      context.serviceName,
      `Unknown external service error in ${context.operation}`,
      false
    );
  }
}

/**
 * Business logic error handler
 */
export class BusinessLogicErrorHandler {
  /**
   * Handle business logic operation with standardized error patterns
   */
  static async handleBusinessLogicOperation<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext
  ): Promise<ErrorHandlingResult<T>> {
    const timer = new Timer(`business_logic.${context.serviceName}.${context.operation}`);
    
    try {
      const result = await operation();
      timer.end({ success: true });
      
      logger.info(`Business logic ${context.serviceName}.${context.operation} completed`, {
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : 'Unknown error' });
      
      const standardizedError = this.standardizeBusinessLogicError(error, context);
      
      logger.error(`Business logic ${context.serviceName}.${context.operation} failed`, {
        error: standardizedError?.message,
        code: standardizedError.code,
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
        businessImpact: context.businessImpact,
      });

      return {
        success: false,
        error: standardizedError,
      };
    }
  }

  /**
   * Standardize business logic errors to consistent AppError format
   */
  private static standardizeBusinessLogicError(error: unknown, context: ErrorHandlingContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific business logic error patterns
      if (error instanceof Error ? error?.message : String(error).includes("validation")) {
        return new ValidationError(`Business validation failed in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`);
      }
      
      if (error instanceof Error ? error?.message : String(error).includes("not found")) {
        return new ValidationError(`Resource not found in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`);
      }
      
      if (error instanceof Error ? error?.message : String(error).includes("permission") || error instanceof Error ? error?.message : String(error).includes("unauthorized")) {
        return new AuthorizationError(`Permission denied in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`);
      }

      return new AppError(
        `Business logic error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`,
        400,
        "BUSINESS_LOGIC_ERROR"
      );
    }

    return new AppError(
      `Unknown business logic error in ${context.operation}`,
      500,
      "UNKNOWN_BUSINESS_ERROR"
    );
  }
}

/**
 * System operation error handler
 */
export class SystemOperationErrorHandler {
  /**
   * Handle system operation with standardized error patterns
   */
  static async handleSystemOperation<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext
  ): Promise<ErrorHandlingResult<T>> {
    const timer = new Timer(`system.${context.serviceName}.${context.operation}`);
    
    try {
      const result = await operation();
      timer.end({ success: true });
      
      logger.info(`System operation ${context.serviceName}.${context.operation} completed`, {
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : 'Unknown error' });
      
      const standardizedError = this.standardizeSystemError(error, context);
      
      logger.error(`System operation ${context.serviceName}.${context.operation} failed`, {
        error: standardizedError?.message,
        code: standardizedError.code,
        userId: context.userId,
        requestId: context.requestId,
        metadata: context.metadata,
        businessImpact: context.businessImpact,
      });

      return {
        success: false,
        error: standardizedError,
      };
    }
  }

  /**
   * Standardize system errors to consistent AppError format
   */
  private static standardizeSystemError(error: unknown, context: ErrorHandlingContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific system error patterns
      if (error instanceof Error ? error?.message : String(error).includes("configuration") || error instanceof Error ? error?.message : String(error).includes("config")) {
        return new ConfigurationError(`Configuration error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`);
      }
      
      if (error instanceof Error ? error?.message : String(error).includes("file") || error instanceof Error ? error?.message : String(error).includes("ENOENT")) {
        return new AppError(
          `File system error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`,
          500,
          "FILE_SYSTEM_ERROR"
        );
      }
      
      if (error instanceof Error ? error?.message : String(error).includes("memory") || error instanceof Error ? error?.message : String(error).includes("heap")) {
        return new AppError(
          `Memory error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`,
          500,
          "MEMORY_ERROR"
        );
      }

      return new AppError(
        `System error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`,
        500,
        "SYSTEM_ERROR"
      );
    }

    return new AppError(
      `Unknown system error in ${context.operation}`,
      500,
      "UNKNOWN_SYSTEM_ERROR"
    );
  }
}

/**
 * Unified error handler factory
 */
export class StandardizedErrorHandler {
  /**
   * Handle any operation with appropriate error handler based on context
   */
  static async handleOperation<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext & { 
      errorType: "database" | "external_api" | "business_logic" | "system" 
    }
  ): Promise<ErrorHandlingResult<T>> {
    switch (context.errorType) {
      case "database":
        return DatabaseErrorHandler.handleDatabaseOperation(operation, context);
      
      case "external_api":
        return ExternalAPIErrorHandler.handleExternalAPIOperation(operation, context as any);
      
      case "business_logic":
        return BusinessLogicErrorHandler.handleBusinessLogicOperation(operation, context);
      
      case "system":
        return SystemOperationErrorHandler.handleSystemOperation(operation, context);
      
      default:
        // Fallback to system handler
        return SystemOperationErrorHandler.handleSystemOperation(operation, context);
    }
  }

  /**
   * Transform catch block unknown error to standardized error
   */
  static standardizeUnknownError(
    error: unknown,
    context: ErrorHandlingContext & { errorType?: "database" | "external_api" | "business_logic" | "system" }
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const errorType = context?.errorType || "system";
    
    switch (errorType) {
      case "database":
        return DatabaseErrorHandler["standardizeDatabaseError"](error, context);
      
      case "external_api":
        return ExternalAPIErrorHandler["standardizeExternalAPIError"](error, context as any);
      
      case "business_logic":
        return BusinessLogicErrorHandler["standardizeBusinessLogicError"](error, context);
      
      case "system":
        return SystemOperationErrorHandler["standardizeSystemError"](error, context);
      
      default:
        if (error instanceof Error) {
          return new AppError(
            `Unknown error in ${context.operation}: ${error instanceof Error ? error?.message : String(error)}`,
            500,
            "UNKNOWN_ERROR"
          );
        }
        return new AppError(
          `Unknown error in ${context.operation}`,
          500,
          "UNKNOWN_ERROR"
        );
    }
  }
}

/**
 * Error boundary pattern for comprehensive error handling
 */
export class ErrorBoundary {
  /**
   * Execute operation within error boundary with comprehensive handling
   */
  static async execute<T>(
    operation: () => Promise<T>,
    context: ErrorHandlingContext & { 
      errorType: "database" | "external_api" | "business_logic" | "system";
      fallbackStrategy?: () => Promise<T>;
      retryConfig?: {
        maxRetries: number;
        retryDelay: number;
        exponentialBackoff: boolean;
      };
    }
  ): Promise<ErrorHandlingResult<T>> {
    let lastError: AppError | undefined;
    let retryCount = 0;
    const maxRetries = context.retryConfig?.maxRetries || 0;

    while (retryCount <= maxRetries) {
      try {
        const result = await StandardizedErrorHandler.handleOperation(operation, context);
        
        if (result.success) {
          return {
            ...result,
            retryCount,
          };
        }
        
        lastError = result.error;
        
        // Check if error is retryable
        if (!context?.retryable || retryCount >= maxRetries) {
          break;
        }
        
        // Wait before retry
        if (context.retryConfig && retryCount < maxRetries) {
          const delay = context.retryConfig.exponentialBackoff
            ? context.retryConfig.retryDelay * Math.pow(2, retryCount)
            : context.retryConfig.retryDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        retryCount++;
      } catch (boundaryError) {
        // Boundary itself failed
        lastError = StandardizedErrorHandler.standardizeUnknownError(boundaryError, context);
        break;
      }
    }

    // Try fallback strategy if available
    if (context.fallbackStrategy && lastError) {
      try {
        const fallbackResult = await context.fallbackStrategy();
        return {
          success: true,
          data: fallbackResult,
          fallbackUsed: true,
          retryCount,
          recoveryStrategy: "fallback",
        };
      } catch (fallbackError) {
        logger.error("Fallback strategy failed", {
          originalError: lastError?.message,
          fallbackError: fallbackError instanceof Error ? fallbackError?.message : 'Unknown fallback error',
          context,
        });
      }
    }

    return {
      success: false,
      error: lastError || new AppError("Operation failed without specific error", 500),
      retryCount,
    };
  }
}

// Export all handlers for individual use
export {
  DatabaseErrorHandler,
  ExternalAPIErrorHandler,
  BusinessLogicErrorHandler,
  SystemOperationErrorHandler,
};