/**
 * ============================================================================
 * STANDARDIZED RESPONSE UTILITIES
 * ============================================================================
 * 
 * Centralized response utilities that implement the canonical ApiResponse<T>
 * and PaginatedData<T> types for consistent API responses.
 * 
 * Created by: TypeScript Zero-Error Remediation (Phase 2)
 * Date: 2025-08-27
 */

import type { ApiResponse, PaginatedData, PaginationMeta, SuccessResponse, ErrorResponse } from "@/types/api";

/**
 * Success response class for consistent API responses
 */
export class SuccessResponse<T = any> implements SuccessResponse<T> {
  public readonly success = true;
  public readonly data?: T;
  public readonly message?: string;
  public readonly meta?: Record<string, any>;

  constructor(data?: T, message?: string, meta?: Record<string, any>) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  /**
   * Create a paginated success response
   */
  static paginated<T>(
    items: T[],
    pagination: PaginationMeta,
    message?: string
  ): SuccessResponse<PaginatedData<T>> {
    return new SuccessResponse<PaginatedData<T>>(
      { items, pagination },
      message
    );
  }

  /**
   * Create a simple success response
   */
  static create<T>(data?: T, message?: string, meta?: Record<string, any>): SuccessResponse<T> {
    return new SuccessResponse<T>(data, message, meta);
  }
}

/**
 * Error response class for consistent API error responses
 */
export class ErrorResponse implements ErrorResponse {
  public readonly success = false;
  public readonly message: string;
  public readonly errors?: any[];
  public readonly meta?: Record<string, any>;

  constructor(message: string, errors?: any[], meta?: Record<string, any>) {
    this.message = message;
    this.errors = errors;
    this.meta = meta;
  }

  /**
   * Create a validation error response
   */
  static validation(errors: any[], message: string = "Validation failed"): ErrorResponse {
    return new ErrorResponse(message, errors);
  }

  /**
   * Create a simple error response
   */
  static create(message: string, errors?: any[], meta?: Record<string, any>): ErrorResponse {
    return new ErrorResponse(message, errors, meta);
  }
}

/**
 * Response factory for creating standardized API responses
 */
export const ResponseFactory = {
  /**
   * Create successful response
   */
  success: <T>(data?: T, message?: string, meta?: Record<string, any>): ApiResponse<T> => ({
    success: true,
    data,
    message,
    meta,
  }),

  /**
   * Create error response
   */
  error: (message: string, errors?: any[], meta?: Record<string, any>): ApiResponse => ({
    success: false,
    message,
    errors,
    meta,
  }),

  /**
   * Create paginated response
   */
  paginated: <T>(
    items: T[],
    pagination: PaginationMeta,
    message?: string
  ): ApiResponse<PaginatedData<T>> => ({
    success: true,
    data: {
      items,
      pagination,
    },
    message,
  }),
};

// Export for backward compatibility
export { ApiResponse, PaginatedData, PaginationMeta } from "@/types/api";