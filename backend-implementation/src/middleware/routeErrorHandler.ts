/**
 * ============================================================================
 * ROUTE ERROR HANDLER MIDDLEWARE
 * ============================================================================
 * 
 * Comprehensive error handling middleware specifically designed for route
 * optimization endpoints. Provides graceful degradation and meaningful
 * error responses for all route optimization failures.
 * 
 * Features:
 * - Route optimization service error boundaries
 * - Service unavailability handling
 * - External API failure graceful degradation
 * - Runtime error prevention
 * - Comprehensive logging and monitoring
 * 
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Emergency Bug Fix
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export interface RouteOptimizationError extends Error {
  code?: string;
  statusCode?: number;
  context?: any;
  retryable?: boolean;
}

/**
 * Route optimization service error boundary wrapper
 * Provides comprehensive error handling and graceful degradation
 */
export class RouteOptimizationErrorBoundary {
  /**
   * Wrap service method calls with error boundary protection
   */
  static async executeWithBoundary<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: any = {}
  ): Promise<{ success: boolean; data?: T; error?: string; fallback?: boolean }> {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error: any) {
      return this.handleServiceError(error, operationName, context);
    }
  }

  /**
   * Handle service errors with categorization and fallback strategies
   */
  private static handleServiceError(
    error: any,
    operationName: string,
    context: any
  ): { success: boolean; error: string; fallback?: boolean } {
    const errorContext = {
      operation: operationName,
      timestamp: new Date().toISOString(),
      ...context
    };

    // Service initialization errors
    if (error instanceof Error ? error?.message : String(error)?.includes('Route optimization service is not available')) {
      logger.error('Route optimization service unavailable', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'high'
      });

      return {
        success: false,
        error: 'Route optimization service is temporarily unavailable. Please try again later.',
        fallback: true
      };
    }

    // External API errors
    if (error.code === 'EXTERNAL_API_ERROR' || error instanceof Error ? error?.message : String(error)?.includes('external')) {
      logger.error('External API error in route optimization', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'medium'
      });

      return {
        success: false,
        error: 'External service error occurred. Using fallback optimization methods.',
        fallback: true
      };
    }

    // Validation errors
    if (error.code === 'VALIDATION_ERROR') {
      logger.warn('Route optimization validation error', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'low'
      });

      return {
        success: false,
        error: error instanceof Error ? error?.message : String(error) || 'Invalid request parameters for route optimization'
      };
    }

    // Permission errors
    if (error.code === 'PERMISSION_ERROR') {
      logger.warn('Route optimization permission error', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'low'
      });

      return {
        success: false,
        error: 'Insufficient permissions for route optimization operation'
      };
    }

    // Timeout errors
    if (error.code === 'TIMEOUT_ERROR' || error instanceof Error ? error?.message : String(error)?.includes('timeout')) {
      logger.error('Route optimization timeout', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'medium'
      });

      return {
        success: false,
        error: 'Route optimization timed out. Please try with reduced scope or try again later.',
        fallback: true
      };
    }

    // Database errors
    if (error.code?.startsWith('DB_') || error instanceof Error ? error?.message : String(error)?.includes('database')) {
      logger.error('Database error in route optimization', {
        ...errorContext,
        error: error instanceof Error ? error?.message : String(error),
        severity: 'high'
      });

      return {
        success: false,
        error: 'Database error occurred. Route optimization temporarily unavailable.',
        fallback: true
      };
    }

    // Unknown errors - log with full context
    logger.error('Unknown route optimization error', {
      ...errorContext,
      error: error instanceof Error ? error?.message : String(error),
      stack: error instanceof Error ? error?.stack : undefined,
      severity: 'high'
    });

    return {
      success: false,
      error: 'An unexpected error occurred during route optimization. Please try again later.'
    };
  }
}

/**
 * Express middleware for handling route optimization errors
 */
export const routeOptimizationErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only handle route optimization related errors
  if (!req.path.includes('/route-optimization')) {
    return next(error);
  }

  const context = {
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    organizationId: req.body?.organizationId || req.query?.organizationId
  };

  const errorResponse = RouteOptimizationErrorBoundary['handleServiceError'](
    error,
    `${req.method} ${req.path}`,
    context
  );

  // Determine status code based on error type
  let statusCode = 500;
  if (error.code === 'VALIDATION_ERROR') statusCode = 400;
  if (error.code === 'PERMISSION_ERROR') statusCode = 403;
  if (error.code === 'TIMEOUT_ERROR') statusCode = 408;
  if (error.statusCode) statusCode = error.statusCode;

  res.status(statusCode).json({
    success: false,
    message: errorResponse.error,
    fallbackAvailable: errorResponse?.fallback || false,
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation helper for route optimization requests
 */
export const validateRouteOptimizationRequest = (req: Request): string[] => {
  const errors: string[] = [];

  // Common validations for optimization requests
  if (req.body.organizationId && !isValidUUID(req.body.organizationId)) {
    errors.push('Invalid organization ID format');
  }

  if (req.body.optimizationDate) {
    const date = new Date(req.body.optimizationDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid optimization date format');
    }
  }

  if (req.body.vehicleIds && !Array.isArray(req.body.vehicleIds)) {
    errors.push('vehicleIds must be an array');
  }

  if (req.body.binIds && !Array.isArray(req.body.binIds)) {
    errors.push('binIds must be an array');
  }

  return errors;
};

/**
 * Service availability check middleware
 */
export const checkServiceAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if route optimization service is available
    // This would be implemented based on your service registry or health check
    const isServiceAvailable = true; // TODO: Implement actual health check

    if (!isServiceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Route optimization service is temporarily unavailable',
        fallbackAvailable: true,
        retryAfter: 300 // 5 minutes
      });
    }

    next();
  } catch (error: any) {
    logger.error('Service availability check failed', {
      path: req.path,
      error: error instanceof Error ? error?.message : String(error)
    });

    res.status(503).json({
      success: false,
      message: 'Unable to verify service availability',
      fallbackAvailable: true
    });
  }
};

/**
 * Helper function to validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default {
  RouteOptimizationErrorBoundary,
  routeOptimizationErrorHandler,
  validateRouteOptimizationRequest,
  checkServiceAvailability
};