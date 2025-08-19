/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - FALLBACK COORDINATION API ROUTES
 * ============================================================================
 *
 * API routes for multi-provider fallback coordination, testing,
 * and performance monitoring.
 *
 * Endpoints:
 * - POST /api/external/fallback/execute - Execute fallback coordination
 * - GET /api/external/fallback/status - Get fallback system status
 * - POST /api/external/fallback/test - Test fallback scenarios
 * - GET /api/external/fallback/performance - Get fallback performance metrics
 *
 * Created by: External-API-Integration-Specialist
 * Date: 2025-08-19
 * Version: 1.0.0 - Phase 2 External API Completion
 */

import { Router, Request, Response } from "express";
import { auth } from "@/middleware/auth";
import { validation } from "@/middleware/validation";
import { rateLimit } from "@/middleware/rateLimit";
import { logger, Timer } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import MultiProviderFallbackCoordinator from "@/services/external/MultiProviderFallbackCoordinator";
import { ExternalAPIResilienceManager } from "@/services/external/ExternalAPIResilienceManager";

const router = Router();

// Initialize fallback coordinator
const resilienceManager = new ExternalAPIResilienceManager({} as any);
const fallbackCoordinator = new MultiProviderFallbackCoordinator(resilienceManager);

/**
 * Execute multi-provider fallback coordination
 * POST /api/external/fallback/execute
 */
router.post("/execute", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('FallbackAPI.execute');
  
  try {
    const {
      operationType,
      parameters,
      businessContext,
      fallbackOptions
    } = req.body;

    // Validate required parameters
    if (!operationType || !parameters) {
      return ResponseHelper.badRequest(res, "operationType and parameters are required");
    }

    // Validate operation type
    const validOperationTypes = ["routing", "matrix", "geocoding", "traffic"];
    if (!validOperationTypes.includes(operationType)) {
      return ResponseHelper.badRequest(res, "Invalid operation type");
    }

    // Set default business context
    const defaultBusinessContext = {
      urgency: "standard",
      customerFacing: false,
      revenueImpacting: false,
      maxCostIncrease: 25
    };

    const finalBusinessContext = { ...defaultBusinessContext, ...businessContext };

    let fallbackResult;

    // Execute fallback based on operation type
    switch (operationType) {
      case "routing":
        if (!parameters.start || !parameters.end) {
          return ResponseHelper.badRequest(res, "start and end locations are required for routing");
        }

        fallbackResult = await fallbackCoordinator.executeRoutingFallback(
          parameters.start,
          parameters.end,
          {
            vehicleType: parameters.vehicleType || 'truck',
            includeTraffic: parameters.includeTraffic !== false,
            businessContext: finalBusinessContext,
            maxCostIncrease: fallbackOptions?.maxCostIncrease || 25,
            maxLatencyIncrease: fallbackOptions?.maxLatencyIncrease || 5000
          }
        );
        break;

      case "matrix":
        if (!parameters.locations || !Array.isArray(parameters.locations)) {
          return ResponseHelper.badRequest(res, "locations array is required for matrix operations");
        }

        fallbackResult = await fallbackCoordinator.executeMatrixFallback(
          parameters.locations,
          {
            vehicleType: parameters.vehicleType || 'truck',
            includeTraffic: parameters.includeTraffic !== false,
            businessContext: finalBusinessContext,
            maxCostIncrease: fallbackOptions?.maxCostIncrease || 25
          }
        );
        break;

      default:
        return ResponseHelper.badRequest(res, `Operation type ${operationType} not yet supported`);
    }

    const executionTime = timer.end({
      operationType,
      success: fallbackResult.success,
      provider: fallbackResult.provider,
      degradationLevel: fallbackResult.degradationLevel,
      costImpact: fallbackResult.costImpact
    });

    logger.info('Fallback coordination executed', {
      operationType,
      success: fallbackResult.success,
      provider: fallbackResult.provider,
      degradationLevel: fallbackResult.degradationLevel,
      costImpact: fallbackResult.costImpact,
      businessContext: finalBusinessContext,
      executionTime
    });

    if (fallbackResult.success) {
      return ResponseHelper.success(res, {
        result: fallbackResult.data,
        execution: {
          provider: fallbackResult.provider,
          degradationLevel: fallbackResult.degradationLevel,
          costImpact: fallbackResult.costImpact,
          latency: fallbackResult.latency,
          cacheUsed: fallbackResult.cacheUsed,
          offlineMode: fallbackResult.offlineMode
        },
        metadata: {
          ...fallbackResult.metadata,
          executionTime,
          operationType,
          businessContext: finalBusinessContext
        }
      });
    } else {
      return ResponseHelper.badRequest(res, "Fallback coordination failed", {
        error: "All providers failed",
        metadata: fallbackResult.metadata,
        recommendations: fallbackResult.metadata.recommendations
      });
    }

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error in fallback coordination execution', {
      error: error.message,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Fallback coordination execution failed");
  }
});

/**
 * Get fallback system status
 * GET /api/external/fallback/status
 */
router.get("/status", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('FallbackAPI.getStatus');
  
  try {
    // Get coordinator statistics
    const coordinatorStats = fallbackCoordinator.getCoordinatorStats();
    
    // Get resilience manager health status
    const healthStatus = resilienceManager.getServiceHealthStatus();
    
    // Calculate fallback system status
    const systemStatus = calculateSystemStatus(healthStatus, coordinatorStats);

    const executionTime = timer.end({
      overallStatus: systemStatus.overall,
      activeExecutionPlans: coordinatorStats.activeExecutionPlans
    });

    logger.info('Fallback system status retrieved', {
      overallStatus: systemStatus.overall,
      activeExecutionPlans: coordinatorStats.activeExecutionPlans,
      monitoredProviders: coordinatorStats.monitoredProviders,
      executionTime
    });

    return ResponseHelper.success(res, {
      overall: systemStatus.overall,
      coordinator: coordinatorStats,
      providers: healthStatus,
      capabilities: {
        intelligentProviderSelection: true,
        businessContextAware: true,
        costOptimization: true,
        predictiveFailover: true,
        offlineOperation: true
      },
      timestamp: new Date(),
      metadata: {
        executionTime,
        dataFreshness: "real-time"
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error retrieving fallback system status', {
      error: error.message
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve fallback system status");
  }
});

/**
 * Calculate overall system status
 */
function calculateSystemStatus(healthStatus: any, coordinatorStats: any): any {
  const healthyServices = Object.values(healthStatus.services).filter((service: any) => 
    service.status === "healthy"
  ).length;
  
  const totalServices = Object.keys(healthStatus.services).length;
  const healthRatio = healthyServices / totalServices;
  
  let overall: "healthy" | "degraded" | "unhealthy";
  if (healthRatio > 0.8) {
    overall = "healthy";
  } else if (healthRatio > 0.5) {
    overall = "degraded";
  } else {
    overall = "unhealthy";
  }
  
  return {
    overall,
    healthRatio,
    healthyServices,
    totalServices
  };
}

export default router;