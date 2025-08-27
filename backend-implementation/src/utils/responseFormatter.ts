/**
 * ============================================================================
 * RESPONSE FORMATTER UTILITY
 * ============================================================================
 * 
 * Standardized response formatting utility for consistent API responses.
 * Compatible with existing ResponseHelper interface while providing enhanced features.
 * 
 * Features:
 * - Backward compatible with ResponseHelper API
 * - Consistent success/error response formats
 * - Pagination metadata handling
 * - Error sanitization for production
 * - Type-safe response interfaces
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 * Updated: 2025-08-24 - Made compatible with ResponseHelper interface
 */

import type { Response } from "express";
import type { ApiResponse, PaginationMeta, PaginatedData } from "@/types/api";

/**
 * Response options interfaces - compatible with ResponseHelper
 */
export interface ErrorResponseOptions {
  message: string;
  statusCode?: number;
  errors?: any[];
}

export interface SuccessResponseOptions<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
}

// Types are now imported from centralized location

/**
 * Response formatter class
 */
export class ResponseFormatter {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    meta?: Record<string, any>
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send successful response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    items: T[],
    pagination: PaginationMeta,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<PaginatedData<T>> = {
      success: true,
      message,
      data: {
        items,
        pagination,
      },
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: any[],
    data?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
      data,
    };

    // Sanitize error details in production
    if (process.env.NODE_ENV === "production" && errors) {
      response.errors = errors.map(err => ({
        field: err.field,
        message: err.message,
      }));
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: any[],
    message: string = "Validation failed"
  ): void {
    this.error(res, message, 400, errors);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    resource: string = "Resource",
    message?: string
  ): void {
    this.error(res, message || `${resource} not found`, 404);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): void {
    this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = "Insufficient permissions"
  ): void {
    this.error(res, message, 403);
  }

  /**
   * Send conflict response
   */
  static conflict(
    res: Response,
    message: string,
    data?: any
  ): void {
    this.error(res, message, 409, undefined, data);
  }

  /**
   * Send server error response
   */
  static serverError(
    res: Response,
    message: string = "Internal server error",
    error?: any
  ): void {
    const errors = error && process.env.NODE_ENV === "development" 
      ? [{ message: error.message, stack: error.stack }]
      : undefined;
    
    this.error(res, message, 500, errors);
  }

  /**
   * Create pagination metadata
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const pages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  }

  // ============================================================================
  // BACKWARD COMPATIBILITY METHODS - Compatible with ResponseHelper
  // ============================================================================

  /**
   * Send successful response (ResponseHelper compatible)
   */
  static successCompat<T = any>(res: Response, options: SuccessResponseOptions<T>): Response {
    const { data, message = 'Success', statusCode = 200 } = options;
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send error response (ResponseHelper compatible)
   */
  static errorCompat(res: Response, options: ErrorResponseOptions): Response {
    const { message, statusCode = 500, errors = [] } = options;
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  /**
   * Send paginated response (ResponseHelper compatible)
   */
  static paginated<T = any>(res: Response, data: T[], pagination: any): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination
    });
  }

  /**
   * Send created response (ResponseHelper compatible)
   */
  static created<T = any>(res: Response, data: T, message: string = 'Created successfully'): Response {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send bad request response (ResponseHelper compatible)
   */
  static badRequest(res: Response, message: string, errors: any[] = []): Response {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  /**
   * Send no content response (ResponseHelper compatible)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send internal error response (ResponseHelper compatible)
   */
  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return res.status(500).json({
      success: false,
      message
    });
  }
}

export default ResponseFormatter;