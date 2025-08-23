/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - RESPONSE HELPER UTILITY
 * ============================================================================
 *
 * Standardized response helper to eliminate code duplication across controllers.
 * Provides consistent API response formats and status codes.
 *
 * Features:
 * - Standardized success and error responses
 * - Pagination support
 * - Request ID tracking
 * - Performance metrics
 * - Consistent error handling
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import type { Response, Request } from "express";
import { logger } from "@/utils/logger";

/**
 * Standard API response structure
 */
interface ApiResponse<T = any> {
  success: boolean;
  status: string;
  message?: string;
  data?: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    processingTime?: string;
    pagination?: PaginationMeta;
  };
  errors?: any[];
}

/**
 * Pagination metadata
 */
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Success response options
 */
interface SuccessResponseOptions<T> {
  data?: T;
  message?: string;
  statusCode?: number;
  pagination?: PaginationMeta;
  meta?: Record<string, any>;
}

/**
 * Error response options
 */
interface ErrorResponseOptions {
  message?: string;
  statusCode?: number;
  errors?: any[];
  code?: string;
  meta?: Record<string, any>;
}

/**
 * Response Helper Class
 */
export class ResponseHelper {
  private static getRequestId(req: Request): string | undefined {
    return req.headers["x-request-id"] as string | undefined;
  }

  private static getProcessingTime(req: Request): string | undefined {
    const startTime = (req as any)._startTime as number | undefined;
    if (startTime) {
      return `${Date.now() - startTime}ms`;
    }
    return undefined;
  }

  private static buildResponse<T>(
    success: boolean,
    status: string,
    options: SuccessResponseOptions<T> | ErrorResponseOptions,
    req: Request,
  ): ApiResponse<T> {
    const requestId = this.getRequestId(req);
    const processingTime = this.getProcessingTime(req);

    const response: ApiResponse<T> = {
      success,
      status,
      meta: {
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
        ...(processingTime && { processingTime }),
        ...options.meta,
      },
    };

    if (options?.message) {
      response.message = options.message;
    }

    if (success && "data" in options && options.data !== undefined) {
      response.data = options.data;
    }

    if (success && "pagination" in options && options.pagination) {
      response.meta!.pagination = options.pagination;
    }

    if (!success && "errors" in options && options.errors) {
      response.errors = options.errors;
    }

    return response;
  }

  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    req: Request,
    options: SuccessResponseOptions<T> = {},
  ): Response {
    const statusCode = options?.statusCode || 200;
    const message = options?.message || "Request successful";

    const response = this.buildResponse(
      true,
      "success",
      { ...options, message },
      req,
    );

    // Log successful response
    logger.info("API Response", {
      requestId: response.meta?.requestId,
      statusCode,
      url: req.originalUrl,
      method: req.method,
      processingTime: response.meta?.processingTime,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    req: Request,
    data: T,
    message: string = "Resource created successfully",
  ): Response {
    return this.success(res, req, {
      data,
      message,
      statusCode: 201,
    });
  }

  /**
   * Send updated response (200)
   */
  static updated<T>(
    res: Response,
    req: Request,
    data: T,
    message: string = "Resource updated successfully",
  ): Response {
    return this.success(res, req, {
      data,
      message,
      statusCode: 200,
    });
  }

  /**
   * Send deleted response (200)
   */
  static deleted(
    res: Response,
    req: Request,
    message: string = "Resource deleted successfully",
  ): Response {
    return this.success(res, req, {
      message,
      statusCode: 200,
    });
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    req: Request,
    data: T[],
    pagination: PaginationMeta,
    message: string = "Data retrieved successfully",
  ): Response {
    return this.success(res, req, {
      data,
      message,
      pagination,
      statusCode: 200,
    });
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response, req: Request): Response {
    // Log no content response
    logger.info("API No Content Response", {
      requestId: this.getRequestId(req),
      statusCode: 204,
      url: req.originalUrl,
      method: req.method,
      processingTime: this.getProcessingTime(req),
    });

    return res.status(204).send();
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    req: Request,
    options: ErrorResponseOptions = {},
  ): Response {
    const statusCode = options?.statusCode || 500;
    const message = options?.message || "Internal server error";
    const status = statusCode >= 500 ? "error" : "fail";

    const response = this.buildResponse(
      false,
      status,
      { ...options, message },
      req,
    );

    // Add error code if provided
    if (options.code) {
      (response as any).code = options.code;
    }

    // Log error response
    logger.error("API Error Response", {
      requestId: response.meta?.requestId,
      statusCode,
      message,
      code: options.code,
      url: req.originalUrl,
      method: req.method,
      errors: options.errors,
      processingTime: response.meta?.processingTime,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    req: Request,
    message: string = "Bad request",
    errors?: any[],
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 400,
      code: "BAD_REQUEST",
      ...(errors && { errors }),
    });
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    req: Request,
    message: string = "Authentication required",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    req: Request,
    message: string = "Access denied",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    req: Request,
    message: string = "Resource not found",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    req: Request,
    errors: any[],
    message: string = "Validation failed",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 422,
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  /**
   * Send too many requests response (429)
   */
  static tooManyRequests(
    res: Response,
    req: Request,
    message: string = "Too many requests",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
    });
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response,
    req: Request,
    message: string = "Internal server error",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 500,
      code: "INTERNAL_ERROR",
    });
  }

  /**
   * Send service unavailable response (503)
   */
  static serviceUnavailable(
    res: Response,
    req: Request,
    message: string = "Service temporarily unavailable",
  ): Response {
    return this.error(res, req, {
      message,
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }
}

/**
 * Middleware to add start time for processing time calculation
 */
export const addStartTime = (req: Request, _res: Response, next: Function) => {
  (req as any)._startTime = Date.now();
  next();
};

/**
 * Export response helper as default
 */
export default ResponseHelper;
