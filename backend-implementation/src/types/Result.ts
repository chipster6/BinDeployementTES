/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - RESULT TYPE PATTERN
 * ============================================================================
 *
 * Modern functional error handling pattern to replace throw/catch.
 * Provides type-safe error handling with better composition.
 *
 * Benefits:
 * - Explicit error handling in function signatures
 * - Better composability and chaining
 * - Type-safe error propagation
 * - No hidden exceptions
 * - Better testing and debugging
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-18
 * Version: 1.0.0
 */

/**
 * Result type that represents either success or failure
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Success variant containing the successful value
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
}

/**
 * Failure variant containing the error
 */
export interface Failure<E> {
  readonly success: false;
  readonly data?: never;
  readonly error: E;
}

/**
 * Application-specific error types
 */
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
  originalError?: Error;
}

/**
 * Common error codes for the application
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Result factory functions
 */
export const Result = {
  /**
   * Create a successful result
   */
  success: <T>(data: T): Success<T> => ({
    success: true,
    data,
  }),

  /**
   * Create a failure result
   */
  failure: <E>(error: E): Failure<E> => ({
    success: false,
    error,
  }),

  /**
   * Create an app error failure
   */
  error: (
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    statusCode?: number
  ): Failure<AppError> => ({
    success: false,
    error: {
      code,
      message,
      details,
      statusCode,
    },
  }),

  /**
   * Wrap a promise to return a Result instead of throwing
   */
  async wrap<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await promise;
      return Result.success(data);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Execute a function and wrap the result
   */
  try<T>(fn: () => T): Result<T, Error> {
    try {
      const data = fn();
      return Result.success(data);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Execute an async function and wrap the result
   */
  async tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await fn();
      return Result.success(data);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Check if a result is successful
   */
  isSuccess: <T, E>(result: Result<T, E>): result is Success<T> => {
    return result.success === true;
  },

  /**
   * Check if a result is a failure
   */
  isFailure: <T, E>(result: Result<T, E>): result is Failure<E> => {
    return result.success === false;
  },

  /**
   * Get data from result or throw error
   */
  unwrap: <T, E>(result: Result<T, E>): T => {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    throw result.error;
  },

  /**
   * Get data from result or return default value
   */
  unwrapOr: <T, E>(result: Result<T, E>, defaultValue: T): T => {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Get data from result or compute default value
   */
  unwrapOrElse: <T, E>(result: Result<T, E>, fn: (error: E) => T): T => {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    return fn(result.error);
  },

  /**
   * Map the success value
   */
  map: <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> => {
    if (Result.isSuccess(result)) {
      return Result.success(fn(result.data));
    }
    return result;
  },

  /**
   * Map the error value
   */
  mapError: <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
    if (Result.isFailure(result)) {
      return Result.failure(fn(result.error));
    }
    return result;
  },

  /**
   * Chain operations (flatMap)
   */
  chain: <T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> => {
    if (Result.isSuccess(result)) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * Async chain operations
   */
  chainAsync: async <T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> => {
    if (Result.isSuccess(result)) {
      return await fn(result.data);
    }
    return result;
  },

  /**
   * Tap into the result for side effects without changing it
   */
  tap: <T, E>(result: Result<T, E>, fn: (data: T) => void): Result<T, E> => {
    if (Result.isSuccess(result)) {
      fn(result.data);
    }
    return result;
  },

  /**
   * Tap into the error for side effects without changing it
   */
  tapError: <T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> => {
    if (Result.isFailure(result)) {
      fn(result.error);
    }
    return result;
  },

  /**
   * Convert all results in array to a single result
   */
  all: <T, E>(results: Result<T, E>[]): Result<T[], E> => {
    const data: T[] = [];
    
    for (const result of results) {
      if (Result.isFailure(result)) {
        return result;
      }
      data.push(result.data);
    }
    
    return Result.success(data);
  },

  /**
   * Convert any successful result in array, ignore failures
   */
  any: <T, E>(results: Result<T, E>[]): Result<T[], E> => {
    const data: T[] = [];
    const errors: E[] = [];
    
    for (const result of results) {
      if (Result.isSuccess(result)) {
        data.push(result.data);
      } else {
        errors.push(result.error);
      }
    }
    
    if (data.length > 0) {
      return Result.success(data);
    }
    
    // Return the first error if no successes
    return results.length > 0 && Result.isFailure(results[0])
      ? results[0]
      : Result.failure(errors[0]);
  },

  /**
   * Filter successful results
   */
  filterSuccess: <T, E>(results: Result<T, E>[]): T[] => {
    return results
      .filter(Result.isSuccess)
      .map(result => result.data);
  },

  /**
   * Filter failed results
   */
  filterFailures: <T, E>(results: Result<T, E>[]): E[] => {
    return results
      .filter(Result.isFailure)
      .map(result => result.error);
  },

  /**
   * Partition results into successes and failures
   */
  partition: <T, E>(results: Result<T, E>[]): [T[], E[]] => {
    const successes: T[] = [];
    const failures: E[] = [];
    
    for (const result of results) {
      if (Result.isSuccess(result)) {
        successes.push(result.data);
      } else {
        failures.push(result.error);
      }
    }
    
    return [successes, failures];
  },
};

/**
 * Utility functions for creating common error types
 */
export const AppErrors = {
  validation: (message: string, details?: Record<string, any>): AppError => ({
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details,
    statusCode: 400,
  }),

  authentication: (message: string = 'Authentication required'): AppError => ({
    code: ErrorCode.AUTHENTICATION_ERROR,
    message,
    statusCode: 401,
  }),

  authorization: (message: string = 'Access denied'): AppError => ({
    code: ErrorCode.AUTHORIZATION_ERROR,
    message,
    statusCode: 403,
  }),

  notFound: (resource: string): AppError => ({
    code: ErrorCode.NOT_FOUND_ERROR,
    message: `${resource} not found`,
    statusCode: 404,
  }),

  conflict: (message: string): AppError => ({
    code: ErrorCode.CONFLICT_ERROR,
    message,
    statusCode: 409,
  }),

  externalService: (service: string, message: string): AppError => ({
    code: ErrorCode.EXTERNAL_SERVICE_ERROR,
    message: `External service error (${service}): ${message}`,
    details: { service },
    statusCode: 502,
  }),

  database: (message: string, originalError?: Error): AppError => ({
    code: ErrorCode.DATABASE_ERROR,
    message: `Database error: ${message}`,
    originalError,
    statusCode: 500,
  }),

  internal: (message: string = 'Internal server error', originalError?: Error): AppError => ({
    code: ErrorCode.INTERNAL_ERROR,
    message,
    originalError,
    statusCode: 500,
  }),

  rateLimit: (retryAfter?: number): AppError => ({
    code: ErrorCode.RATE_LIMIT_ERROR,
    message: 'Rate limit exceeded',
    details: { retryAfter },
    statusCode: 429,
  }),

  timeout: (operation: string): AppError => ({
    code: ErrorCode.TIMEOUT_ERROR,
    message: `Operation timed out: ${operation}`,
    details: { operation },
    statusCode: 408,
  }),
};

/**
 * Type guards for specific error types
 */
export const isValidationError = (error: AppError): boolean =>
  error.code === ErrorCode.VALIDATION_ERROR;

export const isAuthenticationError = (error: AppError): boolean =>
  error.code === ErrorCode.AUTHENTICATION_ERROR;

export const isAuthorizationError = (error: AppError): boolean =>
  error.code === ErrorCode.AUTHORIZATION_ERROR;

export const isNotFoundError = (error: AppError): boolean =>
  error.code === ErrorCode.NOT_FOUND_ERROR;

/**
 * Convert AppError to HTTP response format
 */
export const errorToHttpResponse = (error: AppError) => ({
  success: false,
  error: {
    code: error.code,
    message: error.message,
    details: error.details,
  },
  statusCode: error.statusCode || 500,
});

export default Result;