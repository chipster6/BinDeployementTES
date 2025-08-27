/**
 * ============================================================================
 * SHARED API TYPES
 * ============================================================================
 * 
 * Centralized API type definitions for consistent response shapes
 * across all controllers and services.
 * 
 * Created by: TypeScript Zero-Error Remediation (Phase 2)
 * Date: 2025-08-27
 */

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: PaginationMeta;
  meta?: Record<string, any>;
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated data wrapper interface
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  meta?: Record<string, any>;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

/**
 * Type-safe response helpers
 */
export const ApiResponseHelpers = {
  /**
   * Create successful response
   */
  success: <T>(data?: T, message?: string, meta?: Record<string, any>): SuccessResponse<T> => ({
    success: true,
    data,
    message,
    meta,
  }),

  /**
   * Create error response
   */
  error: (message: string, errors?: any[], meta?: Record<string, any>): ErrorResponse => ({
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
  ): SuccessResponse<PaginatedData<T>> => ({
    success: true,
    data: {
      items,
      pagination,
    },
    message,
  }),
};