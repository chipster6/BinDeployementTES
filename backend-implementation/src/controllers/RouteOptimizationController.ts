/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ROUTE OPTIMIZATION CONTROLLER
 * ============================================================================
 * 
 * API controller for OR-Tools route optimization functionality.
 * Provides RESTful endpoints for route optimization, real-time adaptation,
 * multi-objective planning, and performance analytics.
 *
 * Endpoints:
 * - POST /api/routes/optimize - Daily route optimization
 * - POST /api/routes/:id/adapt - Real-time route adaptation
 * - POST /api/routes/alternatives - Multi-objective optimization
 * - GET /api/routes/analytics/:organizationId - Performance analytics
 * - GET /api/routes/:id - Get optimization result
 * - GET /api/routes/history/:organizationId - Optimization history
 *
 * Features:
 * - Input validation and sanitization
 * - JWT authentication and authorization
 * - Rate limiting for optimization requests
 * - Comprehensive error handling
 * - Request/response logging
 * - Performance monitoring
 * - Caching strategies
 *
 * Performance Targets:
 * - Daily optimization: <30 seconds response time
 * - Real-time adaptation: <5 seconds response time
 * - Analytics generation: <2 seconds response time
 * - 99.9% API availability
 * - <100ms median response time for cached requests
 *
 * Created by: Innovation-Architect Agent (coordinating with Backend-Agent)
 * Date: 2025-08-18
 * Version: 1.0.0 - Phase 2 API Integration
 */

import type { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { logger, Timer } from "@/utils/logger";
import {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError
} from "@/middleware/errorHandler";
import RouteOptimizationService, {
  RouteOptimizationRequest,
  RouteAdaptationRequest,
  RouteOptimizationResponse,
  RoutePerformanceAnalytics
} from "@/services/RouteOptimizationService";
import { OptimizationObjectives } from "@/services/RouteOptimizationEngine";
import { authenticateToken, requireRole } from "@/middleware/auth";
import { ResponseHelper } from "@/utils/ResponseHelper";

/**
 * =============================================================================
 * RATE LIMITING CONFIGURATION
 * =============================================================================
 */

/**
 * Rate limiter for route optimization requests
 * Limited due to computational intensity
 */
const optimizationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 optimization requests per 15 minutes per IP
  message: {
    error: "Too many optimization requests. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Route optimization rate limit exceeded", {
      ip: req.ip,
      userId: req.user?.id,
      organizationId: req.body?.organizationId
    });
    
    throw new RateLimitError(
      "Route optimization rate limit exceeded. Maximum 10 requests per 15 minutes.",
      15 * 60 * 1000
    );
  }
});

/**
 * Rate limiter for real-time adaptation requests
 * More permissive for operational needs
 */
const adaptationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 adaptation requests per 5 minutes per IP
  message: {
    error: "Too many adaptation requests. Please try again later.",
    retryAfter: "5 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Route adaptation rate limit exceeded", {
      ip: req.ip,
      userId: req.user?.id,
      routeOptimizationId: req.params?.id
    });
    
    throw new RateLimitError(
      "Route adaptation rate limit exceeded. Maximum 50 requests per 5 minutes.",
      5 * 60 * 1000
    );
  }
});

/**
 * =============================================================================
 * VALIDATION RULES
 * =============================================================================
 */

/**
 * Validation rules for route optimization request
 */
export const validateOptimizationRequest = [
  body('organizationId')
    .isUUID(4)
    .withMessage('Organization ID must be a valid UUID'),
  
  body('optimizationDate')
    .isISO8601()
    .withMessage('Optimization date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        throw new Error('Optimization date cannot be in the past');
      }
      
      // Don't allow optimization more than 30 days in the future
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      if (date > maxDate) {
        throw new Error('Optimization date cannot be more than 30 days in the future');
      }
      
      return true;
    }),
  
  body('vehicleIds')
    .optional()
    .isArray()
    .withMessage('Vehicle IDs must be an array')
    .custom((value) => {
      if (value && value.length > 50) {
        throw new Error('Maximum 50 vehicles allowed per optimization');
      }
      if (value && value.some((id: any) => typeof id !== 'string')) {
        throw new Error('All vehicle IDs must be strings');
      }
      return true;
    }),
  
  body('binIds')
    .optional()
    .isArray()
    .withMessage('Bin IDs must be an array')
    .custom((value) => {
      if (value && value.length > 1000) {
        throw new Error('Maximum 1000 bins allowed per optimization');
      }
      if (value && value.some((id: any) => typeof id !== 'string')) {
        throw new Error('All bin IDs must be strings');
      }
      return true;
    }),
  
  body('maxOptimizationTime')
    .optional()
    .isInt({ min: 5, max: 300 })
    .withMessage('Max optimization time must be between 5 and 300 seconds'),
  
  body('useAdvancedAlgorithms')
    .optional()
    .isBoolean()
    .withMessage('Use advanced algorithms must be a boolean'),
  
  body('generateAlternatives')
    .optional()
    .isBoolean()
    .withMessage('Generate alternatives must be a boolean'),
  
  body('objectives')
    .optional()
    .isObject()
    .withMessage('Objectives must be an object')
    .custom((value) => {
      if (value) {
        const validObjectives = [
          'minimizeTotalDistance',
          'minimizeTotalTime',
          'minimizeFuelConsumption',
          'maximizeServiceQuality',
          'minimizeOperatingCost',
          'maximizeDriverSatisfaction',
          'minimizeEnvironmentalImpact'
        ];
        
        for (const key of Object.keys(value)) {
          if (!validObjectives.includes(key)) {
            throw new Error(`Invalid objective: ${key}`);
          }
          
          if (typeof value[key] !== 'number' || value[key] < 0 || value[key] > 1) {
            throw new Error(`Objective ${key} must be a number between 0 and 1`);
          }
        }
      }
      return true;
    })
];

/**
 * Validation rules for route adaptation request
 */
export const validateAdaptationRequest = [
  param('id')
    .isUUID(4)
    .withMessage('Route optimization ID must be a valid UUID'),
  
  body('changes')
    .isObject()
    .withMessage('Changes must be an object'),
  
  body('changes.newBins')
    .optional()
    .isArray()
    .withMessage('New bins must be an array')
    .custom((value) => {
      if (value && value.length > 100) {
        throw new Error('Maximum 100 new bins allowed per adaptation');
      }
      return true;
    }),
  
  body('changes.removedBins')
    .optional()
    .isArray()
    .withMessage('Removed bins must be an array')
    .custom((value) => {
      if (value && value.length > 100) {
        throw new Error('Maximum 100 removed bins allowed per adaptation');
      }
      return true;
    }),
  
  body('changes.unavailableVehicles')
    .optional()
    .isArray()
    .withMessage('Unavailable vehicles must be an array'),
  
  body('priority')
    .isIn(['emergency', 'urgent', 'standard'])
    .withMessage('Priority must be emergency, urgent, or standard'),
  
  body('maxAdaptationTime')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Max adaptation time must be between 1 and 30 seconds')
];

/**
 * Validation rules for analytics request
 */
export const validateAnalyticsRequest = [
  param('organizationId')
    .isUUID(4)
    .withMessage('Organization ID must be a valid UUID'),
  
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(value);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      // Don't allow more than 1 year range
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        throw new Error('Date range cannot exceed 1 year');
      }
      
      return true;
    })
];

/**
 * =============================================================================
 * ROUTE OPTIMIZATION CONTROLLER
 * =============================================================================
 */

export class RouteOptimizationController {
  private routeOptimizationService: RouteOptimizationService;

  constructor() {
    this.routeOptimizationService = new RouteOptimizationService();
  }

  /**
   * =============================================================================
   * MAIN OPTIMIZATION ENDPOINTS
   * =============================================================================
   */

  /**
   * Optimize routes for daily planning
   * POST /api/routes/optimize
   */
  public optimizeRoutes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.optimizeRoutes');
    
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError("Validation failed", errors.array());
      }
      
      // Extract and validate request data
      const request: RouteOptimizationRequest = {
        organizationId: req.body.organizationId,
        optimizationDate: new Date(req.body.optimizationDate),
        vehicleIds: req.body.vehicleIds,
        binIds: req.body.binIds,
        objectives: req.body.objectives,
        maxOptimizationTime: req.body.maxOptimizationTime,
        useAdvancedAlgorithms: req.body?.useAdvancedAlgorithms || false,
        generateAlternatives: req.body?.generateAlternatives || false
      };
      
      // Authorization check - user must belong to organization
      if (!this.hasOrganizationAccess(req.user, request.organizationId)) {
        const error = new AppError("Insufficient permissions for this organization", 403);
        return next(error);
      }
      
      // Execute optimization
      const result = await this.routeOptimizationService.optimizeRoutes(
        request,
        req.user?.id
      );
      
      const executionTime = timer.end({
        success: result.success,
        organizationId: request.organizationId,
        routeCount: result.data?.routes?.length || 0
      });

      logger.info("Route optimization request completed", {
        userId: req.user?.id,
        organizationId: request.organizationId,
        executionTime,
        success: result.success,
        optimizationId: result.data?.optimizationId
      });

      // Return response
      if (result.success) {
        ResponseHelper.success(res, result.data!, result?.message, {
          executionTime,
          cached: executionTime < 1000 // Likely cached if very fast
        });
      } else {
        ResponseHelper.error(res, result?.message || "Optimization failed", 400, result.errors);
      }
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Route optimization failed", {
        userId: req.user?.id,
        organizationId: req.body?.organizationId,
        error: error instanceof Error ? error?.message : String(error),
        stack: error instanceof Error ? error?.stack : undefined
      });
      
      next(error);
    }
  };

  /**
   * Adapt routes in real-time
   * POST /api/routes/:id/adapt
   */
  public adaptRoutes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.adaptRoutes');
    
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError("Validation failed", errors.array());
      }
      
      // Extract request data
      const request: RouteAdaptationRequest = {
        routeOptimizationId: req.params.id,
        changes: req.body.changes,
        priority: req.body.priority,
        maxAdaptationTime: req.body?.maxAdaptationTime || 5
      };
      
      // Execute adaptation
      const result = await this.routeOptimizationService.adaptRoutes(
        request,
        req.user?.id
      );
      
      const executionTime = timer.end({
        success: result.success,
        routeOptimizationId: request.routeOptimizationId,
        priority: request.priority
      });

      logger.info("Route adaptation request completed", {
        userId: req.user?.id,
        routeOptimizationId: request.routeOptimizationId,
        executionTime,
        success: result.success,
        priority: request.priority
      });

      // Return response
      if (result.success) {
        ResponseHelper.success(res, result.data!, result?.message, {
          executionTime,
          priority: request.priority
        });
      } else {
        ResponseHelper.error(res, result?.message || "Adaptation failed", 400, result.errors);
      }
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Route adaptation failed", {
        userId: req.user?.id,
        routeOptimizationId: req.params?.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      next(error);
    }
  };

  /**
   * Generate optimization alternatives using multi-objective optimization
   * POST /api/routes/alternatives
   */
  public generateAlternatives = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.generateAlternatives');
    
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError("Validation failed", errors.array());
      }
      
      // Extract request data
      const request: RouteOptimizationRequest = {
        organizationId: req.body.organizationId,
        optimizationDate: new Date(req.body.optimizationDate),
        vehicleIds: req.body.vehicleIds,
        binIds: req.body.binIds,
        maxOptimizationTime: req.body?.maxOptimizationTime || 60,
        useAdvancedAlgorithms: true,
        generateAlternatives: true
      };
      
      const objectives: OptimizationObjectives = {
        minimizeTotalDistance: req.body.objectives?.minimizeTotalDistance || 0.25,
        minimizeTotalTime: req.body.objectives?.minimizeTotalTime || 0.25,
        minimizeFuelConsumption: req.body.objectives?.minimizeFuelConsumption || 0.2,
        maximizeServiceQuality: req.body.objectives?.maximizeServiceQuality || 0.15,
        minimizeOperatingCost: req.body.objectives?.minimizeOperatingCost || 0.1,
        maximizeDriverSatisfaction: req.body.objectives?.maximizeDriverSatisfaction || 0.03,
        minimizeEnvironmentalImpact: req.body.objectives?.minimizeEnvironmentalImpact || 0.02,
        timeWindowCompliance: 100,
        capacityConstraints: 100,
        driverHoursCompliance: 50,
        vehicleCapabilityMatch: 25
      };
      
      // Authorization check
      if (!this.hasOrganizationAccess(req.user, request.organizationId)) {
        const error = new AppError("Insufficient permissions for this organization", 403);
        return next(error);
      }
      
      // Execute multi-objective optimization
      const result = await this.routeOptimizationService.generateOptimizationAlternatives(
        request,
        objectives,
        req.user?.id
      );
      
      const executionTime = timer.end({
        success: result.success,
        organizationId: request.organizationId,
        solutionCount: result.data?.solutions?.length || 0
      });

      logger.info("Alternative optimization request completed", {
        userId: req.user?.id,
        organizationId: request.organizationId,
        executionTime,
        success: result.success,
        solutionCount: result.data?.solutions?.length || 0
      });

      // Return response
      if (result.success) {
        ResponseHelper.success(res, result.data!, result?.message, {
          executionTime,
          solutionCount: result.data?.solutions?.length || 0
        });
      } else {
        ResponseHelper.error(res, result?.message || "Alternative generation failed", 400, result.errors);
      }
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Alternative optimization failed", {
        userId: req.user?.id,
        organizationId: req.body?.organizationId,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      next(error);
    }
  };

  /**
   * =============================================================================
   * ANALYTICS AND REPORTING ENDPOINTS
   * =============================================================================
   */

  /**
   * Get route performance analytics
   * GET /api/routes/analytics/:organizationId
   */
  public getAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.getAnalytics');
    
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError("Validation failed", errors.array());
      }
      
      const organizationId = req.params.organizationId;
      const timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      };
      
      // Authorization check
      if (!this.hasOrganizationAccess(req.user, organizationId)) {
        const error = new AppError("Insufficient permissions for this organization", 403);
        return next(error);
      }
      
      // Get analytics
      const result = await this.routeOptimizationService.getRouteAnalytics(
        organizationId,
        timeRange,
        req.user?.id
      );
      
      const executionTime = timer.end({
        success: result.success,
        organizationId,
        timeRangeDays: Math.ceil(
          (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
        )
      });

      logger.info("Route analytics request completed", {
        userId: req.user?.id,
        organizationId,
        executionTime,
        success: result.success,
        timeRange
      });

      // Return response
      if (result.success) {
        ResponseHelper.success(res, result.data!, result?.message, {
          executionTime,
          timeRange,
          cached: executionTime < 500 // Likely cached if very fast
        });
      } else {
        ResponseHelper.error(res, result?.message || "Analytics generation failed", 400, result.errors);
      }
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Route analytics failed", {
        userId: req.user?.id,
        organizationId: req.params?.organizationId,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      next(error);
    }
  };

  /**
   * Get specific optimization result
   * GET /api/routes/:id
   */
  public getOptimization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.getOptimization');
    
    try {
      const optimizationId = req.params.id;
      
      // Validation
      if (!optimizationId) {
        throw new ValidationError("Optimization ID is required");
      }
      
      // Get optimization result (implementation would query database)
      // For now, return appropriate response
      const result = {
        success: false,
        message: "Optimization result retrieval not yet implemented"
      };
      
      const executionTime = timer.end({
        optimizationId,
        success: result.success
      });

      ResponseHelper.error(res, req, { message: result?.message, statusCode: 501 }); // Not implemented
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Get optimization failed", {
        userId: req.user?.id,
        optimizationId: req.params?.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      next(error);
    }
  };

  /**
   * Get optimization history for organization
   * GET /api/routes/history/:organizationId
   */
  public getOptimizationHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const timer = new Timer('RouteOptimizationController.getOptimizationHistory');
    
    try {
      const organizationId = req.params.organizationId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      
      // Authorization check
      if (!this.hasOrganizationAccess(req.user, organizationId)) {
        const error = new AppError("Insufficient permissions for this organization", 403);
        return next(error);
      }
      
      // Get optimization history (implementation would query database)
      // For now, return appropriate response
      const result = {
        success: false,
        message: "Optimization history retrieval not yet implemented"
      };
      
      const executionTime = timer.end({
        organizationId,
        page,
        limit,
        success: result.success
      });

      ResponseHelper.error(res, req, { message: result?.message, statusCode: 501 }); // Not implemented
      
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      logger.error("Get optimization history failed", {
        userId: req.user?.id,
        organizationId: req.params?.organizationId,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      next(error);
    }
  };

  /**
   * =============================================================================
   * HELPER METHODS
   * =============================================================================
   */

  /**
   * Check if user has access to organization
   */
  private hasOrganizationAccess(user: any, organizationId: string): boolean {
    if (!user) return false;
    
    // Admin users have access to all organizations
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }
    
    // Users must belong to the organization
    return user.organizationId === organizationId;
  }
}

/**
 * =============================================================================
 * ROUTE DEFINITIONS
 * =============================================================================
 */

import { Router } from "express";

const router = Router();
const controller = new RouteOptimizationController();

// Apply authentication to all routes
router.use(authenticateToken);

// Route optimization endpoints
router.post(
  '/optimize',
  optimizationRateLimit,
  requireRole(['admin', 'fleet_manager', 'dispatcher']),
  validateOptimizationRequest,
  controller.optimizeRoutes
);

router.post(
  '/:id/adapt',
  adaptationRateLimit,
  requireRole(['admin', 'fleet_manager', 'dispatcher', 'driver']),
  validateAdaptationRequest,
  controller.adaptRoutes
);

router.post(
  '/alternatives',
  optimizationRateLimit,
  requireRole(['admin', 'fleet_manager']),
  validateOptimizationRequest,
  controller.generateAlternatives
);

// Analytics and reporting endpoints
router.get(
  '/analytics/:organizationId',
  requireRole(['admin', 'fleet_manager', 'dispatcher']),
  validateAnalyticsRequest,
  controller.getAnalytics
);

router.get(
  '/history/:organizationId',
  requireRole(['admin', 'fleet_manager', 'dispatcher']),
  controller.getOptimizationHistory
);

router.get(
  '/:id',
  requireRole(['admin', 'fleet_manager', 'dispatcher', 'driver']),
  controller.getOptimization
);

export default router;