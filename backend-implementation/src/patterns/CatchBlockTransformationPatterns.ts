/**
 * ============================================================================
 * CATCH BLOCK TRANSFORMATION PATTERNS
 * ============================================================================
 *
 * Specific patterns for transforming existing catch(error) blocks to
 * catch(error: unknown) with proper error handling and type safety.
 * This file provides direct transformation patterns for the most common
 * error handling scenarios found in the codebase.
 *
 * Pattern Categories:
 * 1. Service Layer Error Patterns
 * 2. Controller Layer Error Patterns  
 * 3. Database Operation Error Patterns
 * 4. External API Error Patterns
 * 5. Middleware Error Patterns
 * 6. Utility Function Error Patterns
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Catch Block Standardization
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
} from "@/middleware/errorHandler";

/**
 * PATTERN 1: Service Layer Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   timer.end({ error: error instanceof Error ? error?.message : String(error) });
 *   logger.error("Operation failed", { error: error instanceof Error ? error?.message : String(error) });
 *   throw new AppError(`Operation failed: ${error instanceof Error ? error?.message : String(error)}`, 500);
 * }
 * 
 * AFTER:
 */
export const transformServiceLayerError = (
  error: unknown,
  timer: Timer,
  operation: string,
  serviceName: string,
  context?: Record<string, any>
): never => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown error occurred';
  timer.end({ error: errorMessage });
  
  logger.error(`${serviceName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    operation,
    serviceName,
    ...context,
  });

  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === "SequelizeValidationError") {
      throw new ValidationError(`${operation} validation failed`, error);
    }
    
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new ValidationError(`Duplicate entry in ${operation}`, error);
    }
    
    if (error.name === "SequelizeConnectionError") {
      throw new DatabaseOperationError(`Database connection failed during ${operation}`);
    }

    throw new AppError(`${operation} failed: ${error instanceof Error ? error?.message : String(error)}`, 500, "SERVICE_ERROR");
  }

  throw new AppError(`${operation} failed due to unknown error`, 500, "UNKNOWN_SERVICE_ERROR");
};

/**
 * PATTERN 2: Controller Layer Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   logger.error("Controller operation failed", { error: error instanceof Error ? error?.message : String(error) });
 *   return ResponseHelper.error(error instanceof Error ? error?.message : String(error), 500);
 * }
 * 
 * AFTER:
 */
export const transformControllerLayerError = (
  error: unknown,
  operation: string,
  controllerName: string,
  userId?: string,
  requestId?: string
): AppError => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown error occurred';
  
  logger.error(`${controllerName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    operation,
    controllerName,
    userId,
    requestId,
  });

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle validation errors
    if (error.name === "ValidationError" || error instanceof Error ? error?.message : String(error).includes("validation")) {
      return new ValidationError(`${operation} validation failed`, error);
    }
    
    // Handle authentication errors
    if (error.name === "JsonWebTokenError" || error instanceof Error ? error?.message : String(error).includes("authentication")) {
      return new AuthenticationError(`Authentication failed in ${operation}`);
    }
    
    // Handle authorization errors
    if (error instanceof Error ? error?.message : String(error).includes("permission") || error instanceof Error ? error?.message : String(error).includes("unauthorized")) {
      return new AuthorizationError(`Access denied in ${operation}`);
    }

    return new AppError(`${operation} failed: ${error instanceof Error ? error?.message : String(error)}`, 500, "CONTROLLER_ERROR");
  }

  return new AppError(`${operation} failed due to unknown error`, 500, "UNKNOWN_CONTROLLER_ERROR");
};

/**
 * PATTERN 3: Database Operation Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   logger.error("Database operation failed", { error: error instanceof Error ? error?.message : String(error) });
 *   throw new DatabaseOperationError(error instanceof Error ? error?.message : String(error));
 * }
 * 
 * AFTER:
 */
export const transformDatabaseOperationError = (
  error: unknown,
  operation: string,
  modelName: string,
  context?: Record<string, any>
): never => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown database error occurred';
  
  logger.error(`Database operation ${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    operation,
    modelName,
    ...context,
  });

  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    // Handle Sequelize specific errors
    if (error.name === "SequelizeValidationError") {
      throw new ValidationError(`Database validation failed for ${modelName}`, error);
    }
    
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new ValidationError(`Duplicate ${modelName} entry`, error);
    }
    
    if (error.name === "SequelizeForeignKeyConstraintError") {
      throw new ValidationError(`Referenced ${modelName} record not found`, error);
    }
    
    if (error.name === "SequelizeConnectionError") {
      throw new DatabaseOperationError(`Database connection failed during ${modelName} ${operation}`);
    }
    
    if (error.name === "SequelizeTimeoutError") {
      throw new TimeoutError(`${modelName} ${operation}`, 30000);
    }

    throw new DatabaseOperationError(`${modelName} ${operation} failed: ${error instanceof Error ? error?.message : String(error)}`);
  }

  throw new DatabaseOperationError(`${modelName} ${operation} failed due to unknown error`);
};

/**
 * PATTERN 4: External API Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   logger.error("API call failed", { error: error instanceof Error ? error?.message : String(error) });
 *   throw new ExternalServiceError("ExternalService", error instanceof Error ? error?.message : String(error));
 * }
 * 
 * AFTER:
 */
export const transformExternalAPIError = (
  error: unknown,
  serviceName: string,
  operation: string,
  endpoint?: string,
  context?: Record<string, any>
): never => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown external API error occurred';
  
  logger.error(`External API ${serviceName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    serviceName,
    operation,
    endpoint,
    ...context,
  });

  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    // Handle Axios errors
    if (error.name === "AxiosError") {
      const axiosError = error as any;
      
      if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
        throw new TimeoutError(`${serviceName} ${operation}`, 30000);
      }
      
      if (axiosError.code === "ENOTFOUND" || axiosError.code === "ECONNREFUSED") {
        throw new NetworkError(`Network error connecting to ${serviceName}`);
      }
      
      if (axiosError.response?.status === 401) {
        throw new AuthenticationError(`Authentication failed with ${serviceName}`);
      }
      
      if (axiosError.response?.status === 403) {
        throw new AuthorizationError(`Access denied by ${serviceName}`);
      }
      
      if (axiosError.response?.status === 429) {
        throw new ExternalServiceError(serviceName, `Rate limit exceeded for ${serviceName}`, true);
      }
      
      if (axiosError.response?.status >= 500) {
        throw new ExternalServiceError(
          serviceName,
          `Server error from ${serviceName}: ${axiosError.response.status}`,
          true
        );
      }
    }

    // Handle fetch errors
    if (error.name === "FetchError" || error instanceof Error ? error?.message : String(error).includes("fetch")) {
      throw new NetworkError(`Network error during ${serviceName} ${operation}`);
    }

    throw new ExternalServiceError(serviceName, `${operation} failed: ${error instanceof Error ? error?.message : String(error)}`, true);
  }

  throw new ExternalServiceError(serviceName, `${operation} failed due to unknown error`, false);
};

/**
 * PATTERN 5: Middleware Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   logger.error("Middleware failed", { error: error instanceof Error ? error?.message : String(error) });
 *   next(error);
 * }
 * 
 * AFTER:
 */
export const transformMiddlewareError = (
  error: unknown,
  middlewareName: string,
  operation: string,
  requestId?: string,
  userId?: string
): AppError => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown middleware error occurred';
  
  logger.error(`Middleware ${middlewareName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    middlewareName,
    operation,
    requestId,
    userId,
  });

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
      return new AuthenticationError("Invalid token");
    }
    
    if (error.name === "TokenExpiredError") {
      return new AuthenticationError("Token expired");
    }
    
    if (error.name === "NotBeforeError") {
      return new AuthenticationError("Token not active");
    }

    // Handle validation errors
    if (error.name === "ValidationError" || error instanceof Error ? error?.message : String(error).includes("validation")) {
      return new ValidationError(`${middlewareName} validation failed`, error);
    }

    return new AppError(`${middlewareName} ${operation} failed: ${error instanceof Error ? error?.message : String(error)}`, 500, "MIDDLEWARE_ERROR");
  }

  return new AppError(`${middlewareName} ${operation} failed due to unknown error`, 500, "UNKNOWN_MIDDLEWARE_ERROR");
};

/**
 * PATTERN 6: Utility Function Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   logger.error("Utility function failed", { error: error instanceof Error ? error?.message : String(error) });
 *   return null;
 * }
 * 
 * AFTER:
 */
export const transformUtilityFunctionError = (
  error: unknown,
  functionName: string,
  operation: string,
  shouldThrow: boolean = false,
  context?: Record<string, any>
): AppError | null => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown utility error occurred';
  
  logger.error(`Utility function ${functionName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    functionName,
    operation,
    ...context,
  });

  if (error instanceof AppError) {
    if (shouldThrow) {
      throw error;
    }
    return error;
  }

  const standardizedError = error instanceof Error
    ? new AppError(`${functionName} ${operation} failed: ${error instanceof Error ? error?.message : String(error)}`, 500, "UTILITY_ERROR")
    : new AppError(`${functionName} ${operation} failed due to unknown error`, 500, "UNKNOWN_UTILITY_ERROR");

  if (shouldThrow) {
    throw standardizedError;
  }

  return standardizedError;
};

/**
 * PATTERN 7: Async Handler Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   next(error);
 * }
 * 
 * AFTER:
 */
export const transformAsyncHandlerError = (
  error: unknown,
  handlerName: string,
  requestId?: string,
  userId?: string
): AppError => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown async handler error occurred';
  
  logger.error(`Async handler ${handlerName} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    handlerName,
    requestId,
    userId,
  });

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(`${handlerName} failed: ${error instanceof Error ? error?.message : String(error)}`, 500, "ASYNC_HANDLER_ERROR");
  }

  return new AppError(`${handlerName} failed due to unknown error`, 500, "UNKNOWN_ASYNC_ERROR");
};

/**
 * PATTERN 8: Configuration Loading Error Transformation
 * 
 * BEFORE:
 * } catch (error: unknown) {
 *   console.error("Config loading failed:", error instanceof Error ? error?.message : String(error));
 *   process.exit(1);
 * }
 * 
 * AFTER:
 */
export const transformConfigurationError = (
  error: unknown,
  configName: string,
  operation: string,
  isCritical: boolean = true
): never => {
  const errorMessage = error instanceof Error ? error?.message : 'Unknown configuration error occurred';
  
  logger.error(`Configuration ${configName}.${operation} failed`, {
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    configName,
    operation,
    isCritical,
  });

  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    if (error instanceof Error ? error?.message : String(error).includes("ENOENT") || error instanceof Error ? error?.message : String(error).includes("file")) {
      throw new AppError(
        `Configuration file ${configName} not found`,
        500,
        "CONFIG_FILE_NOT_FOUND"
      );
    }
    
    if (error instanceof Error ? error?.message : String(error).includes("parse") || error instanceof Error ? error?.message : String(error).includes("JSON")) {
      throw new AppError(
        `Configuration ${configName} parsing failed: ${error instanceof Error ? error?.message : String(error)}`,
        500,
        "CONFIG_PARSE_ERROR"
      );
    }

    throw new AppError(
      `Configuration ${configName} ${operation} failed: ${error instanceof Error ? error?.message : String(error)}`,
      500,
      "CONFIG_ERROR"
    );
  }

  throw new AppError(
    `Configuration ${configName} ${operation} failed due to unknown error`,
    500,
    "UNKNOWN_CONFIG_ERROR"
  );
};

/**
 * UNIVERSAL ERROR TRANSFORMER
 * 
 * Automatically detects error context and applies appropriate transformation
 */
export const transformUnknownError = (
  error: unknown,
  context: {
    type: "service" | "controller" | "database" | "external_api" | "middleware" | "utility" | "async_handler" | "configuration";
    name: string;
    operation: string;
    additionalContext?: Record<string, any>;
    shouldThrow?: boolean;
  }
): AppError | never => {
  switch (context.type) {
    case "service":
      transformServiceLayerError(
        error,
        new Timer(`${context.name}.${context.operation}`),
        context.operation,
        context.name,
        context.additionalContext
      );
      break;
    
    case "controller":
      return transformControllerLayerError(
        error,
        context.operation,
        context.name,
        context.additionalContext?.userId,
        context.additionalContext?.requestId
      );
    
    case "database":
      transformDatabaseOperationError(
        error,
        context.operation,
        context.name,
        context.additionalContext
      );
      break;
    
    case "external_api":
      transformExternalAPIError(
        error,
        context.name,
        context.operation,
        context.additionalContext?.endpoint,
        context.additionalContext
      );
      break;
    
    case "middleware":
      return transformMiddlewareError(
        error,
        context.name,
        context.operation,
        context.additionalContext?.requestId,
        context.additionalContext?.userId
      );
    
    case "utility":
      return transformUtilityFunctionError(
        error,
        context.name,
        context.operation,
        context?.shouldThrow || false,
        context.additionalContext
      );
    
    case "async_handler":
      return transformAsyncHandlerError(
        error,
        context.name,
        context.additionalContext?.requestId,
        context.additionalContext?.userId
      );
    
    case "configuration":
      transformConfigurationError(
        error,
        context.name,
        context.operation,
        context.additionalContext?.isCritical !== false
      );
      break;
    
    default:
      // Default fallback
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error occurred';
      throw new AppError(
        `${context.name} ${context.operation} failed: ${errorMessage}`,
        500,
        "UNKNOWN_ERROR"
      );
  }
};

/**
 * QUICK REFERENCE PATTERNS
 * 
 * These are the most common transformations to apply directly in catch blocks:
 */

// For service methods:
// } catch (error: unknown) {
//   transformServiceLayerError(error, timer, "operationName", "ServiceName", { additional: "context" });
// }

// For controllers:
// } catch (error: unknown) {
//   const appError = transformControllerLayerError(error, "operationName", "ControllerName", userId, requestId);
//   return ResponseHelper.error(appError?.message, appError.statusCode);
// }

// For database operations:
// } catch (error: unknown) {
//   transformDatabaseOperationError(error, "create", "User", { userId: "123" });
// }

// For external API calls:
// } catch (error: unknown) {
//   transformExternalAPIError(error, "TwilioService", "sendSMS", "/v1/sms", { phoneNumber: "+1234567890" });
// }

// For middleware:
// } catch (error: unknown) {
//   const appError = transformMiddlewareError(error, "AuthMiddleware", "validateToken", requestId, userId);
//   next(appError);
// }

export default {
  transformServiceLayerError,
  transformControllerLayerError,
  transformDatabaseOperationError,
  transformExternalAPIError,
  transformMiddlewareError,
  transformUtilityFunctionError,
  transformAsyncHandlerError,
  transformConfigurationError,
  transformUnknownError,
};