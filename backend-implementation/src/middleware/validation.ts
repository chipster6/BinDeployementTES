/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REQUEST VALIDATION MIDDLEWARE
 * ============================================================================
 *
 * PHASE 1 WEAVIATE DEPLOYMENT: Request validation for Vector Intelligence API
 * 
 * COORDINATION SESSION: phase-1-weaviate-parallel-deployment
 * BACKEND AGENT ROLE: Comprehensive input validation and security hardening
 * 
 * Provides Joi-based request validation with comprehensive error handling
 * and security-focused input sanitization for all API endpoints.
 *
 * Created by: Backend-Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';
import { ValidationError } from '@/middleware/errorHandler';
import { ResponseHelper } from '@/utils/ResponseHelper';

/**
 * Validation target type
 */
type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Validation options interface
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  convert?: boolean;
}

/**
 * Create validation middleware for specific request part
 * 
 * @param schema - Joi validation schema
 * @param target - Request part to validate (body, query, params, headers)
 * @param options - Validation options
 */
export const validateRequest = (
  schema: Joi.Schema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) => {
  const defaultOptions: ValidationOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    convert: true,
    ...options
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || 'unknown';
    
    try {
      // Get the data to validate based on target
      let dataToValidate: any;
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'headers':
          dataToValidate = req.headers;
          break;
        default:
          dataToValidate = req.body;
      }

      // Validate against schema
      const { error, value } = schema.validate(dataToValidate, defaultOptions);

      if (error) {
        // Extract validation error details
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));

        logger.warn('Request validation failed', {
          requestId,
          target,
          path: req.path,
          method: req.method,
          userId: req.user?.id,
          errors: errorDetails
        });

        // Create validation error
        const validationError = new ValidationError(
          'Request validation failed',
          errorDetails
        );

        return ResponseHelper.error(
          res,
          'Invalid request data',
          400,
          errorDetails.map(detail => `${detail.field}: ${detail.message}`)
        );
      }

      // Update request with validated and sanitized data
      switch (target) {
        case 'body':
          req.body = value;
          break;
        case 'query':
          req.query = value;
          break;
        case 'params':
          req.params = value;
          break;
        case 'headers':
          req.headers = value;
          break;
      }

      logger.debug('Request validation successful', {
        requestId,
        target,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });

      next();

    } catch (validationError) {
      logger.error('Validation middleware error', {
        requestId,
        target,
        path: req.path,
        method: req.method,
        error: validationError.message
      });

      return ResponseHelper.error(
        res,
        'Validation processing failed',
        500
      );
    }
  };
};

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  /**
   * Pagination schema for query parameters
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  /**
   * Common ID parameter schema
   */
  id: Joi.object({
    id: Joi.string().uuid().required()
  }),

  /**
   * Date range query schema
   */
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    timeframe: Joi.string().valid('24h', '7d', '30d', '90d').optional()
  }).and('startDate', 'endDate'),

  /**
   * Search query schema
   */
  search: Joi.object({
    q: Joi.string().min(3).max(500).optional(),
    query: Joi.string().min(3).max(500).optional(),
    filters: Joi.object().optional()
  }),

  /**
   * Common headers schema for API requests
   */
  headers: Joi.object({
    'content-type': Joi.string().valid('application/json').required(),
    'authorization': Joi.string().pattern(/^Bearer .+/).required(),
    'x-request-id': Joi.string().uuid().optional(),
    'x-api-version': Joi.string().valid('v1').optional()
  }).unknown(true)
};

/**
 * Validation middleware specifically for Vector Intelligence API
 */
export const vectorValidation = {
  /**
   * Vector search request validation
   */
  search: validateRequest(
    Joi.object({
      query: Joi.string().required().min(3).max(500)
        .description('Search query for semantic search'),
      limit: Joi.number().optional().min(1).max(100).default(10)
        .description('Maximum number of results to return'),
      filters: Joi.object().optional()
        .description('Additional filters for search refinement'),
      threshold: Joi.number().optional().min(0).max(1).default(0.7)
        .description('Minimum similarity threshold for results'),
      includeMetadata: Joi.boolean().optional().default(true)
        .description('Include metadata in search results')
    })
  ),

  /**
   * Vector ingestion request validation
   */
  ingest: validateRequest(
    Joi.object({
      data: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('bin', 'route', 'service_event', 'customer_issue', 'vehicle_maintenance').required(),
          title: Joi.string().required().min(5).max(200),
          description: Joi.string().required().min(10).max(2000),
          location: Joi.object({
            latitude: Joi.number().required().min(-90).max(90),
            longitude: Joi.number().required().min(-180).max(180),
            address: Joi.string().optional()
          }).optional(),
          timestamp: Joi.date().required(),
          metadata: Joi.object().optional().default({}),
          businessContext: Joi.object({
            priority: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
            category: Joi.string().required(),
            impact: Joi.string().valid('operational', 'financial', 'customer', 'safety').required()
          }).required()
        })
      ).required().min(1).max(1000)
        .description('Array of operational data to vectorize')
    })
  ),

  /**
   * Vector insights request validation
   */
  insights: validateRequest(
    Joi.object({
      timeframe: Joi.string().optional().valid('24h', '7d', '30d', '90d').default('7d')
        .description('Timeframe for insights generation')
    }),
    'query'
  )
};

/**
 * Security-focused input sanitization
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  try {
    // Sanitize common injection patterns
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove or escape potentially dangerous patterns
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: URLs
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitize(req.query);
    }

    logger.debug('Input sanitization completed', {
      requestId,
      path: req.path,
      method: req.method
    });

    next();

  } catch (error) {
    logger.error('Input sanitization error', {
      requestId,
      path: req.path,
      method: req.method,
      error: error.message
    });

    return ResponseHelper.error(
      res,
      'Input processing failed',
      500
    );
  }
};

/**
 * Rate limiting validation for API endpoints
 */
export const validateRateLimit = (maxRequests: number, windowMs: number, message?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This is a placeholder for rate limiting validation
    // In production, this would integrate with Redis-based rate limiting
    
    const requestId = req.headers['x-request-id'] || 'unknown';
    const userId = req.user?.id || 'anonymous';
    
    logger.debug('Rate limit validation', {
      requestId,
      userId,
      maxRequests,
      windowMs,
      path: req.path
    });

    // For now, just log and continue
    // TODO: Implement actual rate limiting logic with Redis
    next();
  };
};

/**
 * Export validation middleware factory
 */
export default validateRequest;