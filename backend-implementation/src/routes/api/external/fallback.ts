/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - FALLBACK MANAGEMENT API
 * ============================================================================
 *
 * API endpoints for managing and monitoring fallback strategies:
 * - View fallback strategy configurations
 * - Monitor fallback execution analytics
 * - Manage service mesh health status
 * - Control fallback strategy activation/deactivation
 * - Real-time fallback events and notifications
 *
 * Features:
 * - RESTful API for fallback management
 * - Real-time WebSocket events for fallback monitoring
 * - Business impact analysis and cost optimization
 * - Service mesh status and health monitoring
 * - Advanced analytics and pattern detection
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import express from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { authMiddleware } from "@/middleware/authMiddleware";
import { rbacMiddleware } from "@/middleware/rbacMiddleware";
import { validateRequest } from "@/middleware/errorHandler";
import { fallbackStrategyManager } from "@/services/external/FallbackStrategyManager";
import { serviceMeshManager } from "@/services/external/ServiceMeshManager";
import { logger } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import Joi from "joi";

const router = express.Router();

/**
 * Validation schemas
 */
const fallbackStrategySchema = Joi.object({
  strategyId: Joi.string().required(),
  serviceName: Joi.string().required(),
  serviceType: Joi.string().required(),
  priority: Joi.number().integer().min(1).max(5).required(),
  businessCriticality: Joi.string().valid(
    "revenue_blocking",
    "operational_critical", 
    "customer_facing",
    "performance_optimization",
    "analytics_reporting",
    "background_processing"
  ).required(),
  strategyType: Joi.string().valid(
    "cache_only",
    "alternative_provider",
    "degraded_functionality",
    "manual_operation",
    "circuit_breaker",
    "hybrid_approach"
  ).required(),
  providers: Joi.array().items(Joi.object({
    providerId: Joi.string().required(),
    providerName: Joi.string().required(),
    serviceType: Joi.string().required(),
    priority: Joi.number().integer().min(1).required(),
    config: Joi.object().required(),
    costPerRequest: Joi.number().min(0).optional(),
    geographicRegion: Joi.string().optional(),
    capabilities: Joi.array().items(Joi.string()).required()
  })).required(),
  cacheStrategy: Joi.object({
    enabled: Joi.boolean().required(),
    maxAge: Joi.number().integer().min(0).required(),
    staleWhileRevalidate: Joi.boolean().required(),
    fallbackDataGenerator: Joi.string().optional()
  }).optional(),
  degradedFunctionality: Joi.object({
    enabledFeatures: Joi.array().items(Joi.string()).required(),
    disabledFeatures: Joi.array().items(Joi.string()).required(),
    fallbackData: Joi.any().optional(),
    userMessage: Joi.string().required()
  }).optional(),
  manualOperation: Joi.object({
    notificationChannels: Joi.array().items(Joi.string()).required(),
    escalationPath: Joi.array().items(Joi.string()).required(),
    instructions: Joi.string().required(),
    estimatedResolutionTime: Joi.number().integer().min(1).required()
  }).optional(),
  businessContinuity: Joi.object({
    maxDowntime: Joi.number().integer().min(1).required(),
    businessImpactLevel: Joi.string().valid("low", "medium", "high", "critical").required(),
    revenueImpactPerHour: Joi.number().min(0).required(),
    customerImpact: Joi.string().valid("none", "minor", "moderate", "severe").required()
  }).optional(),
  costOptimization: Joi.object({
    maxCostIncrease: Joi.number().min(0).max(100).required(),
    preferredProviders: Joi.array().items(Joi.string()).required(),
    budgetAlerts: Joi.boolean().required()
  }).optional()
});

const updateStrategySchema = Joi.object({
  priority: Joi.number().integer().min(1).max(5).optional(),
  businessCriticality: Joi.string().valid(
    "revenue_blocking",
    "operational_critical", 
    "customer_facing",
    "performance_optimization",
    "analytics_reporting",
    "background_processing"
  ).optional(),
  providers: Joi.array().items(Joi.object({
    providerId: Joi.string().required(),
    providerName: Joi.string().required(),
    serviceType: Joi.string().required(),
    priority: Joi.number().integer().min(1).required(),
    config: Joi.object().required(),
    costPerRequest: Joi.number().min(0).optional(),
    geographicRegion: Joi.string().optional(),
    capabilities: Joi.array().items(Joi.string()).required()
  })).optional(),
  businessContinuity: Joi.object({
    maxDowntime: Joi.number().integer().min(1).optional(),
    businessImpactLevel: Joi.string().valid("low", "medium", "high", "critical").optional(),
    revenueImpactPerHour: Joi.number().min(0).optional(),
    customerImpact: Joi.string().valid("none", "minor", "moderate", "severe").optional()
  }).optional()
});

/**
 * GET /api/external/fallback/strategies
 * Get all fallback strategies with health status
 */
router.get(
  "/strategies",
  authMiddleware,
  rbacMiddleware(["admin", "operations_manager", "system_administrator"]),
  asyncHandler(async (req, res) => {
    logger.info("Fetching fallback strategies", {
      userId: req.user?.id,
      userRole: req.user?.role,
    });

    try {
      // Get strategies health status
      const strategiesHealth = fallbackStrategyManager.getStrategiesHealthStatus();
      
      // Get service mesh status
      const serviceMeshStatus = serviceMeshManager.getServiceMeshStatus();
      
      // Get detailed health status for all nodes
      const detailedHealth = serviceMeshManager.getDetailedHealthStatus();

      const response = {
        strategies: strategiesHealth,
        serviceMesh: {
          ...serviceMeshStatus,
          detailedHealth
        },
        summary: {
          totalStrategies: Object.keys(strategiesHealth).length,
          healthyStrategies: Object.values(strategiesHealth).filter(
            (strategy: any) => strategy.healthyProviders === strategy.totalProviders
          ).length,
          totalServiceMeshNodes: serviceMeshStatus.totalNodes,
          healthyServiceMeshNodes: serviceMeshStatus.healthyNodes
        },
        lastUpdate: new Date()
      };

      ResponseHelper.success(res, response, "Fallback strategies retrieved successfully");

    } catch (error) {
      logger.error("Failed to fetch fallback strategies", {
        error: error.message,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to fetch fallback strategies", 500);
    }
  })
);

/**
 * GET /api/external/fallback/strategies/:strategyId
 * Get specific fallback strategy details
 */
router.get(
  "/strategies/:strategyId",
  authMiddleware,
  rbacMiddleware(["admin", "operations_manager", "system_administrator"]),
  asyncHandler(async (req, res) => {
    const { strategyId } = req.params;

    try {
      // Get strategy health status
      const strategiesHealth = fallbackStrategyManager.getStrategiesHealthStatus();
      const strategy = strategiesHealth[strategyId];

      if (!strategy) {
        return ResponseHelper.error(res, "Fallback strategy not found", 404);
      }

      // Get circuit breaker status for strategy
      const circuitBreakerStatus = serviceMeshManager.getCircuitBreakerStatus()
        .filter(cb => cb.serviceName === strategy.serviceName);

      const response = {
        strategy,
        circuitBreakers: circuitBreakerStatus,
        lastUpdate: new Date()
      };

      ResponseHelper.success(res, response, "Fallback strategy details retrieved successfully");

    } catch (error) {
      logger.error("Failed to fetch fallback strategy details", {
        error: error.message,
        strategyId,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to fetch fallback strategy details", 500);
    }
  })
);

/**
 * GET /api/external/fallback/analytics/:serviceName
 * Get fallback analytics for a specific service
 */
router.get(
  "/analytics/:serviceName",
  authMiddleware,
  rbacMiddleware(["admin", "operations_manager", "system_administrator"]),
  asyncHandler(async (req, res) => {
    const { serviceName } = req.params;

    try {
      const analytics = await fallbackStrategyManager.getFallbackAnalytics(serviceName);

      ResponseHelper.success(res, analytics, "Fallback analytics retrieved successfully");

    } catch (error) {
      logger.error("Failed to fetch fallback analytics", {
        error: error.message,
        serviceName,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to fetch fallback analytics", 500);
    }
  })
);

/**
 * POST /api/external/fallback/strategies
 * Create new fallback strategy
 */
router.post(
  "/strategies",
  authMiddleware,
  rbacMiddleware(["admin", "system_administrator"]),
  validateRequest(fallbackStrategySchema),
  asyncHandler(async (req, res) => {
    const strategyData = req.body;

    logger.info("Creating new fallback strategy", {
      strategyId: strategyData.strategyId,
      serviceName: strategyData.serviceName,
      userId: req.user?.id,
    });

    try {
      // Register the new strategy
      fallbackStrategyManager.registerStrategy(strategyData);

      logger.info("Fallback strategy created successfully", {
        strategyId: strategyData.strategyId,
        serviceName: strategyData.serviceName,
        userId: req.user?.id,
      });

      ResponseHelper.success(
        res,
        { strategyId: strategyData.strategyId },
        "Fallback strategy created successfully",
        201
      );

    } catch (error) {
      logger.error("Failed to create fallback strategy", {
        error: error.message,
        strategyData,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to create fallback strategy", 500);
    }
  })
);

/**
 * PUT /api/external/fallback/strategies/:strategyId
 * Update existing fallback strategy
 */
router.put(
  "/strategies/:strategyId",
  authMiddleware,
  rbacMiddleware(["admin", "system_administrator"]),
  validateRequest(updateStrategySchema),
  asyncHandler(async (req, res) => {
    const { strategyId } = req.params;
    const updates = req.body;

    logger.info("Updating fallback strategy", {
      strategyId,
      updates: Object.keys(updates),
      userId: req.user?.id,
    });

    try {
      await fallbackStrategyManager.updateStrategy(strategyId, updates);

      logger.info("Fallback strategy updated successfully", {
        strategyId,
        userId: req.user?.id,
      });

      ResponseHelper.success(
        res,
        { strategyId },
        "Fallback strategy updated successfully"
      );

    } catch (error) {
      logger.error("Failed to update fallback strategy", {
        error: error.message,
        strategyId,
        updates,
        userId: req.user?.id,
      });

      if (error.message.includes("not found")) {
        ResponseHelper.error(res, "Fallback strategy not found", 404);
      } else {
        ResponseHelper.error(res, "Failed to update fallback strategy", 500);
      }
    }
  })
);

/**
 * DELETE /api/external/fallback/strategies/:strategyId
 * Remove fallback strategy
 */
router.delete(
  "/strategies/:strategyId",
  authMiddleware,
  rbacMiddleware(["admin", "system_administrator"]),
  asyncHandler(async (req, res) => {
    const { strategyId } = req.params;

    logger.info("Removing fallback strategy", {
      strategyId,
      userId: req.user?.id,
    });

    try {
      fallbackStrategyManager.removeStrategy(strategyId);

      logger.info("Fallback strategy removed successfully", {
        strategyId,
        userId: req.user?.id,
      });

      ResponseHelper.success(
        res,
        { strategyId },
        "Fallback strategy removed successfully"
      );

    } catch (error) {
      logger.error("Failed to remove fallback strategy", {
        error: error.message,
        strategyId,
        userId: req.user?.id,
      });

      if (error.message.includes("not found")) {
        ResponseHelper.error(res, "Fallback strategy not found", 404);
      } else {
        ResponseHelper.error(res, "Failed to remove fallback strategy", 500);
      }
    }
  })
);

/**
 * GET /api/external/fallback/service-mesh/status
 * Get service mesh status and health
 */
router.get(
  "/service-mesh/status",
  authMiddleware,
  rbacMiddleware(["admin", "operations_manager", "system_administrator"]),
  asyncHandler(async (req, res) => {
    try {
      const status = serviceMeshManager.getServiceMeshStatus();
      const detailedHealth = serviceMeshManager.getDetailedHealthStatus();
      const circuitBreakers = serviceMeshManager.getCircuitBreakerStatus();

      const response = {
        status,
        detailedHealth,
        circuitBreakers,
        lastUpdate: new Date()
      };

      ResponseHelper.success(res, response, "Service mesh status retrieved successfully");

    } catch (error) {
      logger.error("Failed to fetch service mesh status", {
        error: error.message,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to fetch service mesh status", 500);
    }
  })
);

/**
 * POST /api/external/fallback/test/:serviceName
 * Test fallback strategy execution
 */
router.post(
  "/test/:serviceName",
  authMiddleware,
  rbacMiddleware(["admin", "system_administrator"]),
  asyncHandler(async (req, res) => {
    const { serviceName } = req.params;
    const { operation = "test", simulateError = true } = req.body;

    logger.info("Testing fallback strategy", {
      serviceName,
      operation,
      simulateError,
      userId: req.user?.id,
    });

    try {
      // Create test fallback context
      const testContext = {
        serviceName,
        operation,
        originalRequest: { test: true },
        error: new Error("Test error for fallback strategy validation"),
        metadata: {
          requestId: `test-${Date.now()}`,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          timestamp: new Date(),
          retryCount: 3,
          maxRetries: 3
        },
        businessContext: {
          urgency: "medium" as const,
          customerFacing: false,
          revenueImpacting: false
        }
      };

      const result = await fallbackStrategyManager.executeFallback(testContext);

      logger.info("Fallback strategy test completed", {
        serviceName,
        success: result.success,
        strategy: result.strategy.strategyId,
        userId: req.user?.id,
      });

      ResponseHelper.success(res, {
        testResult: result,
        testContext: {
          serviceName,
          operation,
          simulateError
        }
      }, "Fallback strategy test completed successfully");

    } catch (error) {
      logger.error("Fallback strategy test failed", {
        error: error.message,
        serviceName,
        operation,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, `Fallback strategy test failed: ${error.message}`, 500);
    }
  })
);

/**
 * GET /api/external/fallback/health-dashboard
 * Get comprehensive health dashboard data
 */
router.get(
  "/health-dashboard",
  authMiddleware,
  rbacMiddleware(["admin", "operations_manager", "system_administrator"]),
  asyncHandler(async (req, res) => {
    try {
      // Get all health data
      const strategiesHealth = fallbackStrategyManager.getStrategiesHealthStatus();
      const serviceMeshStatus = serviceMeshManager.getServiceMeshStatus();
      const detailedHealth = serviceMeshManager.getDetailedHealthStatus();
      const circuitBreakers = serviceMeshManager.getCircuitBreakerStatus();

      // Calculate overall system health score
      const totalServices = Object.keys(strategiesHealth).length;
      const healthyServices = Object.values(strategiesHealth).filter(
        (strategy: any) => strategy.healthyProviders === strategy.totalProviders
      ).length;
      
      const systemHealthScore = totalServices > 0 ? 
        Math.round((healthyServices / totalServices) * 100) : 100;

      // Get critical alerts
      const criticalAlerts = [];
      
      // Check for open circuit breakers
      const openCircuitBreakers = circuitBreakers.filter(cb => cb.state === "open");
      if (openCircuitBreakers.length > 0) {
        criticalAlerts.push({
          type: "circuit_breaker",
          severity: "critical",
          message: `${openCircuitBreakers.length} circuit breaker(s) are open`,
          services: openCircuitBreakers.map(cb => cb.serviceName),
          timestamp: new Date()
        });
      }

      // Check for unhealthy services
      const unhealthyServices = detailedHealth.filter(health => health.status === "unhealthy");
      if (unhealthyServices.length > 0) {
        criticalAlerts.push({
          type: "service_health",
          severity: "high",
          message: `${unhealthyServices.length} service(s) are unhealthy`,
          services: unhealthyServices.map(health => health.serviceName),
          timestamp: new Date()
        });
      }

      const dashboard = {
        overview: {
          systemHealthScore,
          totalServices,
          healthyServices,
          degradedServices: Object.values(strategiesHealth).filter(
            (strategy: any) => strategy.healthyProviders < strategy.totalProviders && strategy.healthyProviders > 0
          ).length,
          failedServices: Object.values(strategiesHealth).filter(
            (strategy: any) => strategy.healthyProviders === 0
          ).length,
          totalServiceMeshNodes: serviceMeshStatus.totalNodes,
          healthyServiceMeshNodes: serviceMeshStatus.healthyNodes,
          openCircuitBreakers: serviceMeshStatus.openCircuitBreakers
        },
        alerts: {
          critical: criticalAlerts.filter(alert => alert.severity === "critical"),
          high: criticalAlerts.filter(alert => alert.severity === "high"),
          medium: criticalAlerts.filter(alert => alert.severity === "medium"),
          total: criticalAlerts.length
        },
        serviceMesh: {
          status: serviceMeshStatus,
          detailedHealth: detailedHealth.slice(0, 10), // Top 10 for dashboard
          circuitBreakers: circuitBreakers.slice(0, 10) // Top 10 for dashboard
        },
        fallbackStrategies: {
          totalStrategies: Object.keys(strategiesHealth).length,
          activeStrategies: Object.values(strategiesHealth).filter(
            (strategy: any) => strategy.healthyProviders > 0
          ).length,
          strategiesByPriority: Object.values(strategiesHealth).reduce((acc: any, strategy: any) => {
            acc[strategy.priority] = (acc[strategy.priority] || 0) + 1;
            return acc;
          }, {}),
          strategiesByCriticality: Object.values(strategiesHealth).reduce((acc: any, strategy: any) => {
            acc[strategy.businessCriticality] = (acc[strategy.businessCriticality] || 0) + 1;
            return acc;
          }, {})
        },
        lastUpdate: new Date()
      };

      ResponseHelper.success(res, dashboard, "Health dashboard data retrieved successfully");

    } catch (error) {
      logger.error("Failed to fetch health dashboard data", {
        error: error.message,
        userId: req.user?.id,
      });

      ResponseHelper.error(res, "Failed to fetch health dashboard data", 500);
    }
  })
);

export default router;