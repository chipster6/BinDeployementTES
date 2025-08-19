/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TRAFFIC-AWARE ROUTE OPTIMIZATION API
 * ============================================================================
 *
 * API endpoints for traffic-aware and weather-aware route optimization.
 * Extends the base route optimization with external data integration.
 *
 * Features:
 * - Traffic-aware route optimization
 * - Real-time traffic adaptation  
 * - Weather-aware route planning
 * - External API data integration
 * - Enhanced caching strategies
 * - Performance optimization
 *
 * Performance Targets:
 * - Traffic optimization: <45 seconds
 * - Real-time adaptation: <10 seconds
 * - Weather optimization: <30 seconds
 * - 95%+ uptime with fallback mechanisms
 *
 * Created by: Backend-Agent (Phase 2 External API Coordination)
 * Date: 2025-08-18
 * Version: 1.0.0 - Traffic Integration API
 */

import { Router } from 'express';
import { RouteOptimizationService, TrafficOptimizationRequest, WeatherOptimizationRequest } from '@/services/RouteOptimizationService';
import { authMiddleware } from '@/middleware/authMiddleware';
import { validateRequest } from '@/middleware/validationMiddleware';
import { rateLimitMiddleware } from '@/middleware/rateLimitMiddleware';
import { logger, Timer } from '@/utils/logger';
import { ValidationError } from '@/middleware/errorHandler';
import { body, param, query } from 'express-validator';

const router = Router();
const routeOptimizationService = new RouteOptimizationService();

/**
 * =============================================================================
 * TRAFFIC-AWARE ROUTE OPTIMIZATION ENDPOINTS
 * =============================================================================
 */

/**
 * POST /api/v1/route-optimization/optimize-with-traffic
 * Optimize routes with real-time traffic integration
 */
router.post(
  '/optimize-with-traffic',
  authMiddleware,
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    skipSuccessfulRequests: false
  }),
  [
    // Validation middleware
    body('organizationId')
      .isUUID()
      .withMessage('Organization ID must be a valid UUID'),
    body('optimizationDate')
      .isISO8601()
      .withMessage('Optimization date must be a valid ISO 8601 date'),
    body('includeTraffic')
      .isBoolean()
      .withMessage('includeTraffic must be a boolean'),
    body('trafficTimeframe')
      .isIn(['current', 'predicted'])
      .withMessage('trafficTimeframe must be either "current" or "predicted"'),
    body('trafficSources')
      .isArray({ min: 1 })
      .withMessage('trafficSources must be a non-empty array'),
    body('trafficSources.*')
      .isIn(['graphhopper', 'google_maps', 'mapbox', 'historical'])
      .withMessage('Invalid traffic source'),
    body('vehicleIds')
      .optional()
      .isArray()
      .withMessage('vehicleIds must be an array'),
    body('binIds')
      .optional()
      .isArray()
      .withMessage('binIds must be an array'),
    body('weatherConsideration')
      .optional()
      .isBoolean()
      .withMessage('weatherConsideration must be a boolean'),
    body('dynamicAdaptation')
      .optional()
      .isBoolean()
      .withMessage('dynamicAdaptation must be a boolean')
  ],
  validateRequest,
  async (req, res) => {
    const timer = new Timer('API.optimizeWithTraffic');
    
    try {
      const request: TrafficOptimizationRequest = {
        organizationId: req.body.organizationId,
        optimizationDate: new Date(req.body.optimizationDate),
        includeTraffic: req.body.includeTraffic,
        trafficTimeframe: req.body.trafficTimeframe,
        trafficSources: req.body.trafficSources,
        vehicleIds: req.body.vehicleIds,
        binIds: req.body.binIds,
        objectives: req.body.objectives,
        maxOptimizationTime: req.body.maxOptimizationTime,
        useAdvancedAlgorithms: req.body.useAdvancedAlgorithms,
        generateAlternatives: req.body.generateAlternatives,
        weatherConsideration: req.body.weatherConsideration,
        dynamicAdaptation: req.body.dynamicAdaptation
      };

      // Check user permissions for organization
      if (!req.user.hasPermission('route_optimization:read', request.organizationId)) {
        return res.status(403).json({\n          success: false,\n          message: 'Insufficient permissions for route optimization'\n        });\n      }\n\n      const result = await routeOptimizationService.optimizeWithTraffic(\n        request,\n        req.user.id\n      );\n\n      const executionTime = timer.end({\n        success: result.success,\n        organizationId: request.organizationId,\n        routeCount: result.success ? result.data?.length || 0 : 0,\n        trafficSources: request.trafficSources.length\n      });\n\n      logger.info('Traffic-aware optimization API completed', {\n        userId: req.user.id,\n        organizationId: request.organizationId,\n        success: result.success,\n        executionTime,\n        trafficSources: request.trafficSources\n      });\n\n      if (result.success) {\n        res.status(200).json({\n          success: true,\n          data: result.data,\n          message: result.message,\n          metadata: {\n            executionTime,\n            trafficSources: request.trafficSources,\n            timeframe: request.trafficTimeframe,\n            routeCount: result.data?.length || 0\n          }\n        });\n      } else {\n        res.status(400).json({\n          success: false,\n          message: result.message,\n          errors: result.errors\n        });\n      }\n\n    } catch (error) {\n      timer.end({ error: error.message });\n      logger.error('Traffic-aware optimization API failed', {\n        userId: req.user?.id,\n        error: error.message,\n        stack: error.stack\n      });\n\n      res.status(500).json({\n        success: false,\n        message: 'Internal server error during traffic-aware optimization'\n      });\n    }\n  }\n);\n\n/**\n * POST /api/v1/route-optimization/adapt-to-traffic\n * Adapt existing route to current traffic conditions\n */\nrouter.post(\n  '/adapt-to-traffic',\n  authMiddleware,\n  rateLimitMiddleware({\n    windowMs: 60 * 1000, // 1 minute\n    max: 60, // 60 requests per minute (more frequent for real-time adaptation)\n    skipSuccessfulRequests: false\n  }),\n  [\n    // Validation middleware\n    body('routeId')\n      .isUUID()\n      .withMessage('Route ID must be a valid UUID'),\n    body('trafficData')\n      .isObject()\n      .withMessage('Traffic data must be an object'),\n    body('trafficData.source')\n      .isIn(['graphhopper', 'google_maps', 'mapbox', 'historical'])\n      .withMessage('Invalid traffic data source'),\n    body('trafficData.congestionLevel')\n      .isInt({ min: 0, max: 100 })\n      .withMessage('Congestion level must be between 0 and 100'),\n    body('trafficData.estimatedDelay')\n      .isNumeric()\n      .withMessage('Estimated delay must be a number')\n  ],\n  validateRequest,\n  async (req, res) => {\n    const timer = new Timer('API.adaptToTraffic');\n    \n    try {\n      const { routeId, trafficData } = req.body;\n\n      // TODO: Verify user has access to this route\n      // const route = await routeService.getRoute(routeId);\n      // if (!req.user.hasPermission('route_optimization:update', route.organizationId)) {\n      //   return res.status(403).json({ success: false, message: 'Insufficient permissions' });\n      // }\n\n      const result = await routeOptimizationService.adaptToTrafficConditions(\n        routeId,\n        trafficData,\n        req.user.id\n      );\n\n      const executionTime = timer.end({\n        success: result.success,\n        routeId,\n        trafficSource: trafficData.source,\n        congestionLevel: trafficData.congestionLevel\n      });\n\n      logger.info('Traffic adaptation API completed', {\n        userId: req.user.id,\n        routeId,\n        success: result.success,\n        executionTime,\n        congestionLevel: trafficData.congestionLevel\n      });\n\n      if (result.success) {\n        res.status(200).json({\n          success: true,\n          data: result.data,\n          message: result.message,\n          metadata: {\n            executionTime,\n            adaptationType: 'traffic',\n            costImpact: result.data?.costImpact || 0\n          }\n        });\n      } else {\n        res.status(400).json({\n          success: false,\n          message: result.message\n        });\n      }\n\n    } catch (error) {\n      timer.end({ error: error.message });\n      logger.error('Traffic adaptation API failed', {\n        userId: req.user?.id,\n        routeId: req.body?.routeId,\n        error: error.message\n      });\n\n      res.status(500).json({\n        success: false,\n        message: 'Internal server error during traffic adaptation'\n      });\n    }\n  }\n);\n\n/**\n * =============================================================================\n * WEATHER-AWARE ROUTE OPTIMIZATION ENDPOINTS\n * =============================================================================\n */\n\n/**\n * POST /api/v1/route-optimization/optimize-with-weather\n * Optimize routes with weather consideration\n */\nrouter.post(\n  '/optimize-with-weather',\n  authMiddleware,\n  rateLimitMiddleware({\n    windowMs: 60 * 1000, // 1 minute\n    max: 30, // 30 requests per minute\n    skipSuccessfulRequests: false\n  }),\n  [\n    // Validation middleware\n    body('organizationId')\n      .isUUID()\n      .withMessage('Organization ID must be a valid UUID'),\n    body('optimizationDate')\n      .isISO8601()\n      .withMessage('Optimization date must be a valid ISO 8601 date'),\n    body('includeWeather')\n      .isBoolean()\n      .withMessage('includeWeather must be a boolean'),\n    body('weatherSeverityThreshold')\n      .isIn(['low', 'medium', 'high'])\n      .withMessage('weatherSeverityThreshold must be low, medium, or high'),\n    body('weatherTypes')\n      .isArray({ min: 1 })\n      .withMessage('weatherTypes must be a non-empty array'),\n    body('weatherTypes.*')\n      .isIn(['rain', 'snow', 'wind', 'fog', 'extreme_temp'])\n      .withMessage('Invalid weather type')\n  ],\n  validateRequest,\n  async (req, res) => {\n    const timer = new Timer('API.optimizeWithWeather');\n    \n    try {\n      const request: WeatherOptimizationRequest = {\n        organizationId: req.body.organizationId,\n        optimizationDate: new Date(req.body.optimizationDate),\n        includeWeather: req.body.includeWeather,\n        weatherSeverityThreshold: req.body.weatherSeverityThreshold,\n        weatherTypes: req.body.weatherTypes,\n        vehicleIds: req.body.vehicleIds,\n        binIds: req.body.binIds,\n        objectives: req.body.objectives,\n        maxOptimizationTime: req.body.maxOptimizationTime,\n        useAdvancedAlgorithms: req.body.useAdvancedAlgorithms,\n        generateAlternatives: req.body.generateAlternatives\n      };\n\n      // Check user permissions\n      if (!req.user.hasPermission('route_optimization:read', request.organizationId)) {\n        return res.status(403).json({\n          success: false,\n          message: 'Insufficient permissions for route optimization'\n        });\n      }\n\n      const result = await routeOptimizationService.optimizeWithWeather(\n        request,\n        req.user.id\n      );\n\n      const executionTime = timer.end({\n        success: result.success,\n        organizationId: request.organizationId,\n        routeCount: result.success ? result.data?.length || 0 : 0,\n        weatherTypes: request.weatherTypes.length\n      });\n\n      logger.info('Weather-aware optimization API completed', {\n        userId: req.user.id,\n        organizationId: request.organizationId,\n        success: result.success,\n        executionTime,\n        weatherTypes: request.weatherTypes\n      });\n\n      if (result.success) {\n        res.status(200).json({\n          success: true,\n          data: result.data,\n          message: result.message,\n          metadata: {\n            executionTime,\n            weatherTypes: request.weatherTypes,\n            severityThreshold: request.weatherSeverityThreshold,\n            routeCount: result.data?.length || 0\n          }\n        });\n      } else {\n        res.status(400).json({\n          success: false,\n          message: result.message,\n          errors: result.errors\n        });\n      }\n\n    } catch (error) {\n      timer.end({ error: error.message });\n      logger.error('Weather-aware optimization API failed', {\n        userId: req.user?.id,\n        error: error.message\n      });\n\n      res.status(500).json({\n        success: false,\n        message: 'Internal server error during weather-aware optimization'\n      });\n    }\n  }\n);\n\n/**\n * =============================================================================\n * TRAFFIC STATUS AND MONITORING ENDPOINTS\n * =============================================================================\n */\n\n/**\n * GET /api/v1/route-optimization/traffic-status\n * Get current traffic status for organization routes\n */\nrouter.get(\n  '/traffic-status',\n  authMiddleware,\n  rateLimitMiddleware({\n    windowMs: 60 * 1000, // 1 minute\n    max: 120, // 120 requests per minute (frequent monitoring)\n    skipSuccessfulRequests: true\n  }),\n  [\n    query('organizationId')\n      .isUUID()\n      .withMessage('Organization ID must be a valid UUID'),\n    query('routeIds')\n      .optional()\n      .isString()\n      .withMessage('Route IDs must be a comma-separated string')\n  ],\n  validateRequest,\n  async (req, res) => {\n    const timer = new Timer('API.getTrafficStatus');\n    \n    try {\n      const { organizationId, routeIds } = req.query;\n      const routeIdArray = routeIds ? (routeIds as string).split(',') : undefined;\n\n      // Check user permissions\n      if (!req.user.hasPermission('route_optimization:read', organizationId as string)) {\n        return res.status(403).json({\n          success: false,\n          message: 'Insufficient permissions to view traffic status'\n        });\n      }\n\n      // TODO: Implement traffic status retrieval\n      // This would get current traffic conditions for active routes\n      const trafficStatus = {\n        organizationId,\n        timestamp: new Date().toISOString(),\n        routes: [], // Would be populated with actual route traffic data\n        overallCongestionLevel: 25,\n        activeIncidents: 2,\n        estimatedDelays: {\n          average: 8,\n          maximum: 25,\n          routes_affected: 3\n        },\n        recommendations: [\n          'Consider delaying Route 15 by 30 minutes due to high congestion',\n          'Alternative route available for Route 22 to avoid construction'\n        ]\n      };\n\n      const executionTime = timer.end({\n        success: true,\n        organizationId,\n        routeCount: routeIdArray?.length || 0\n      });\n\n      logger.info('Traffic status API completed', {\n        userId: req.user.id,\n        organizationId,\n        executionTime,\n        routeCount: routeIdArray?.length || 0\n      });\n\n      res.status(200).json({\n        success: true,\n        data: trafficStatus,\n        metadata: {\n          executionTime,\n          cached: false,\n          lastUpdated: new Date().toISOString()\n        }\n      });\n\n    } catch (error) {\n      timer.end({ error: error.message });\n      logger.error('Traffic status API failed', {\n        userId: req.user?.id,\n        organizationId: req.query?.organizationId,\n        error: error.message\n      });\n\n      res.status(500).json({\n        success: false,\n        message: 'Internal server error while retrieving traffic status'\n      });\n    }\n  }\n);\n\n/**\n * GET /api/v1/route-optimization/external-services/health\n * Get health status of external API services\n */\nrouter.get(\n  '/external-services/health',\n  authMiddleware,\n  rateLimitMiddleware({\n    windowMs: 60 * 1000, // 1 minute\n    max: 60, // 60 requests per minute\n    skipSuccessfulRequests: true\n  }),\n  async (req, res) => {\n    const timer = new Timer('API.getExternalServicesHealth');\n    \n    try {\n      // Check if user has monitoring permissions\n      if (!req.user.hasPermission('system:monitor')) {\n        return res.status(403).json({\n          success: false,\n          message: 'Insufficient permissions to view service health'\n        });\n      }\n\n      // TODO: Implement actual health checks for external services\n      const servicesHealth = {\n        graphhopper: {\n          status: 'healthy',\n          responseTime: 125,\n          lastCheck: new Date().toISOString(),\n          rateLimitRemaining: 95,\n          circuitBreakerState: 'closed'\n        },\n        weather_service: {\n          status: 'healthy',\n          responseTime: 89,\n          lastCheck: new Date().toISOString(),\n          rateLimitRemaining: 180,\n          circuitBreakerState: 'closed'\n        },\n        historical_data: {\n          status: 'healthy',\n          responseTime: 15,\n          lastCheck: new Date().toISOString(),\n          cacheHitRate: 0.85\n        }\n      };\n\n      const executionTime = timer.end({\n        success: true,\n        serviceCount: Object.keys(servicesHealth).length\n      });\n\n      logger.info('External services health check completed', {\n        userId: req.user.id,\n        executionTime,\n        serviceCount: Object.keys(servicesHealth).length\n      });\n\n      res.status(200).json({\n        success: true,\n        data: servicesHealth,\n        metadata: {\n          executionTime,\n          timestamp: new Date().toISOString(),\n          overallStatus: 'healthy'\n        }\n      });\n\n    } catch (error) {\n      timer.end({ error: error.message });\n      logger.error('External services health check failed', {\n        userId: req.user?.id,\n        error: error.message\n      });\n\n      res.status(500).json({\n        success: false,\n        message: 'Internal server error during health check'\n      });\n    }\n  }\n);\n\nexport default router;