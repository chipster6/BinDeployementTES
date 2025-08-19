/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR RESILIENCE ROUTES
 * ============================================================================
 *
 * API routes for enterprise error resilience management, providing access to
 * error orchestration, AI prediction, analytics dashboards, and cross-system
 * propagation prevention. Designed for operations teams, executives, and
 * automated monitoring systems.
 *
 * Features:
 * - Enterprise error resilience status and metrics
 * - Real-time error analytics and prediction endpoints
 * - Business continuity assessment and reporting
 * - Cross-system error propagation management
 * - AI-powered error prediction and prevention
 * - Traffic routing and cost optimization controls
 * - Executive dashboards and compliance reporting
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { Router, Request, Response, NextFunction } from "express";
import { enterpriseErrorResilience } from "@/services/EnterpriseErrorResilienceService";
import { errorAnalyticsDashboard } from "@/services/ErrorAnalyticsDashboardService";
import { aiErrorPrediction } from "@/services/AIErrorPredictionService";
import { crossSystemErrorPropagation } from "@/services/CrossSystemErrorPropagationService";
import { errorOrchestration } from "@/services/ErrorOrchestrationService";
import { SystemLayer, BusinessImpact } from "@/services/ErrorOrchestrationService";
import { auth } from "@/middleware/auth";
import { AppError } from "@/middleware/errorHandler";
import { logger } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";

const router = Router();

/**
 * @route GET /api/error-resilience/status
 * @desc Get enterprise error resilience status
 * @access Private (Operations, Management, Executive)
 */
router.get("/status", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resilienceStatus = await enterpriseErrorResilience.getResilienceStatus();
    
    ResponseHelper.success(res, resilienceStatus, "Resilience status retrieved", {
      cached: false,
      timestamp: new Date(),
      nextUpdate: new Date(Date.now() + 30000) // Next update in 30 seconds
    });

  } catch (error) {
    logger.error("Failed to get resilience status", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/business-continuity
 * @desc Execute business continuity assessment
 * @access Private (Management, Executive)
 */
router.get("/business-continuity", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check authorization for business continuity access
    if (!["manager", "executive", "cto", "coo"].includes(req.user?.role)) {
      throw new AppError("Insufficient permissions for business continuity assessment", 403);
    }

    const assessment = await enterpriseErrorResilience.executeBusinessContinuityAssessment();
    
    ResponseHelper.success(res, assessment, "Business continuity assessment completed", {
      assessmentId: `bca_${Date.now()}`,
      reportGenerated: new Date(),
      nextAssessment: new Date(Date.now() + 3600000) // Next assessment in 1 hour
    });

  } catch (error) {
    logger.error("Business continuity assessment failed", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/analytics/dashboard/:dashboardId
 * @desc Get real-time error analytics dashboard
 * @access Private (Operations, Engineering)
 */
router.get("/analytics/dashboard/:dashboardId", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId } = req.params;
    const { filters, timeRange } = req.query;
    
    const customFilters = filters ? JSON.parse(filters as string) : undefined;
    
    const dashboard = await errorAnalyticsDashboard.getRealTimeDashboard(
      dashboardId,
      req.user?.id,
      customFilters
    );
    
    ResponseHelper.success(res, dashboard, "Dashboard data retrieved", {
      dashboardId,
      userId: req.user?.id,
      filters: customFilters
    });

  } catch (error) {
    logger.error("Failed to get analytics dashboard", { 
      error: error.message, 
      dashboardId: req.params.dashboardId,
      userId: req.user?.id 
    });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/analytics/executive
 * @desc Get executive error analytics dashboard
 * @access Private (Executive, C-Level)
 */
router.get("/analytics/executive", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check executive access
    if (!["executive", "ceo", "cto", "coo", "cfo"].includes(req.user?.role)) {
      throw new AppError("Executive access required", 403);
    }

    const executiveDashboard = await errorAnalyticsDashboard.getExecutiveDashboard();
    
    ResponseHelper.success(res, executiveDashboard, "Executive dashboard retrieved", {
      generatedFor: req.user?.role,
      confidentialityLevel: "executive",
      reportingPeriod: "last_24_hours"
    });

  } catch (error) {
    logger.error("Failed to get executive dashboard", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/prediction/generate
 * @desc Generate AI-powered error predictions
 * @access Private (Operations, Engineering)
 */
router.post("/prediction/generate", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { predictionWindow, systemLayer, options } = req.body;
    
    // Validate prediction window
    if (!predictionWindow?.start || !predictionWindow?.end) {
      throw new AppError("Invalid prediction window", 400);
    }

    const window = {
      start: new Date(predictionWindow.start),
      end: new Date(predictionWindow.end)
    };

    const predictions = await aiErrorPrediction.generateErrorPredictions(
      window,
      systemLayer,
      options
    );
    
    ResponseHelper.success(res, predictions, "Error predictions generated", {
      predictionWindow: window,
      systemLayer,
      modelAccuracy: predictions.metadata.featureImportance,
      executionTime: predictions.metadata.executionTime
    });

  } catch (error) {
    logger.error("Error prediction generation failed", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/prediction/accuracy
 * @desc Get prediction accuracy metrics
 * @access Private (Engineering, Management)
 */
router.get("/prediction/accuracy", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeRange } = req.query;
    
    let timeRangeObj;
    if (timeRange) {
      const parsed = JSON.parse(timeRange as string);
      timeRangeObj = {
        start: new Date(parsed.start),
        end: new Date(parsed.end)
      };
    }

    const accuracy = await aiErrorPrediction.getPredictionAccuracy(timeRangeObj);
    
    ResponseHelper.success(res, accuracy, "Prediction accuracy metrics retrieved", {
      timeRange: timeRangeObj,
      calculatedAt: new Date()
    });

  } catch (error) {
    logger.error("Failed to get prediction accuracy", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/prevention/execute
 * @desc Execute proactive error prevention strategy
 * @access Private (Operations, Management)
 */
router.post("/prevention/execute", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { strategyId, context } = req.body;
    
    if (!strategyId || !context) {
      throw new AppError("Strategy ID and context are required", 400);
    }

    // Check authorization for prevention execution
    if (!["operations", "manager", "team_lead"].includes(req.user?.role)) {
      throw new AppError("Insufficient permissions for prevention strategy execution", 403);
    }

    const result = await aiErrorPrediction.executePreventionStrategy(strategyId, {
      ...context,
      executedBy: req.user?.id,
      executedAt: new Date()
    });
    
    ResponseHelper.success(res, result, "Prevention strategy executed", {
      strategyId,
      executedBy: req.user?.id,
      executionTime: result.executionTime
    });

  } catch (error) {
    logger.error("Prevention strategy execution failed", { 
      error: error.message, 
      strategyId: req.body.strategyId,
      userId: req.user?.id 
    });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/propagation/analytics
 * @desc Get cross-system error propagation analytics
 * @access Private (Engineering, Operations)
 */
router.get("/propagation/analytics", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeRange = 3600000 } = req.query; // Default 1 hour
    
    const analytics = await crossSystemErrorPropagation.getCrossSystemAnalytics(
      parseInt(timeRange as string)
    );
    
    ResponseHelper.success(res, analytics, "Cross-system propagation analytics retrieved", {
      timeRange: parseInt(timeRange as string),
      generatedAt: new Date()
    });

  } catch (error) {
    logger.error("Failed to get propagation analytics", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/propagation/prevent-cascade
 * @desc Prevent cascade failure across systems
 * @access Private (Operations, Emergency Response)
 */
router.post("/propagation/prevent-cascade", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerEventId, maxImpactThreshold } = req.body;
    
    if (!triggerEventId) {
      throw new AppError("Trigger event ID is required", 400);
    }

    // Check emergency response authorization
    if (!["operations", "emergency_response", "manager"].includes(req.user?.role)) {
      throw new AppError("Emergency response authorization required", 403);
    }

    // This would require retrieving the trigger event - simplified for demo
    const mockTriggerEvent = {
      propagationId: triggerEventId,
      sourceError: new AppError("Mock cascade trigger", 500),
      sourceSystem: SystemLayer.API,
      targetSystems: [SystemLayer.DATA_ACCESS, SystemLayer.EXTERNAL_SERVICES],
      propagationPath: ["api->database", "api->external"],
      businessImpact: BusinessImpact.HIGH,
      containmentStrategy: "isolate" as any,
      preventedCascades: [],
      timestamp: new Date(),
      metadata: {
        affectedOperations: [],
        isolationActions: [],
        recoveryActions: []
      }
    };

    const preventionResult = await crossSystemErrorPropagation.preventCascadeFailure(
      mockTriggerEvent,
      maxImpactThreshold || BusinessImpact.HIGH
    );
    
    ResponseHelper.success(res, preventionResult, "Cascade prevention executed", {
      triggerEventId,
      executedBy: req.user?.id,
      maxImpactThreshold: maxImpactThreshold || BusinessImpact.HIGH
    });

  } catch (error) {
    logger.error("Cascade prevention failed", { 
      error: error.message, 
      triggerEventId: req.body.triggerEventId,
      userId: req.user?.id 
    });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/orchestration/health
 * @desc Get error orchestration system health
 * @access Private (Operations, Monitoring)
 */
router.get("/orchestration/health", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemHealth = await errorOrchestration.getSystemHealthStatus();
    
    ResponseHelper.success(res, systemHealth, "Error orchestration health retrieved", {
      checkedAt: new Date(),
      systemsMonitored: Object.keys(systemHealth.layers).length
    });

  } catch (error) {
    logger.error("Failed to get orchestration health", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/orchestration/emergency-continuity
 * @desc Execute emergency business continuity plan
 * @access Private (Emergency Response, Executive)
 */
router.post("/orchestration/emergency-continuity", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { impact, affectedSystems, authorizationCode } = req.body;
    
    // Check emergency authorization
    if (!["emergency_response", "executive", "cto", "coo"].includes(req.user?.role)) {
      throw new AppError("Emergency response authorization required", 403);
    }

    // Validate authorization code (simplified - in production use proper 2FA)
    if (authorizationCode !== "EMERGENCY_OVERRIDE_2025") {
      throw new AppError("Invalid emergency authorization code", 403);
    }

    const continuityPlan = await errorOrchestration.executeEmergencyBusinessContinuity(
      impact || BusinessImpact.CRITICAL,
      affectedSystems || []
    );
    
    ResponseHelper.success(res, continuityPlan, "Emergency business continuity plan executed", {
      authorizedBy: req.user?.id,
      authorizationLevel: req.user?.role,
      executedAt: new Date(),
      confidentialityLevel: "restricted"
    });

  } catch (error) {
    logger.error("Emergency continuity execution failed", { 
      error: error.message, 
      userId: req.user?.id,
      role: req.user?.role 
    });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/monitoring/prometheus
 * @desc Get Prometheus integration status
 * @access Private (Engineering, DevOps)
 */
router.get("/monitoring/prometheus", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prometheusIntegration = await errorAnalyticsDashboard.getPrometheusIntegration();
    
    ResponseHelper.success(res, prometheusIntegration, "Prometheus integration status retrieved");

  } catch (error) {
    logger.error("Failed to get Prometheus integration", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/monitoring/prometheus/query
 * @desc Execute custom Prometheus query
 * @access Private (Engineering, DevOps)
 */
router.post("/monitoring/prometheus/query", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, timeRange } = req.body;
    
    if (!query) {
      throw new AppError("Prometheus query is required", 400);
    }

    let timeRangeObj;
    if (timeRange) {
      timeRangeObj = {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end)
      };
    }

    const result = await errorAnalyticsDashboard.executePrometheusQuery(query, timeRangeObj);
    
    ResponseHelper.success(res, result, "Prometheus query executed", {
      query,
      timeRange: timeRangeObj,
      executedBy: req.user?.id
    });

  } catch (error) {
    logger.error("Prometheus query execution failed", { 
      error: error.message, 
      query: req.body.query,
      userId: req.user?.id 
    });
    next(error);
  }
});

/**
 * @route GET /api/error-resilience/monitoring/grafana
 * @desc Get Grafana integration status
 * @access Private (Engineering, DevOps)
 */
router.get("/monitoring/grafana", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grafanaIntegration = await errorAnalyticsDashboard.getGrafanaIntegration();
    
    ResponseHelper.success(res, grafanaIntegration, "Grafana integration status retrieved");

  } catch (error) {
    logger.error("Failed to get Grafana integration", { error: error.message, userId: req.user?.id });
    next(error);
  }
});

/**
 * @route POST /api/error-resilience/dashboard/export
 * @desc Export dashboard data for compliance reporting
 * @access Private (Management, Compliance)
 */
router.post("/dashboard/export", auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dashboardId, format, timeRange } = req.body;
    
    if (!dashboardId || !format || !timeRange) {
      throw new AppError("Dashboard ID, format, and time range are required", 400);
    }

    // Check export permissions
    if (!["manager", "compliance", "auditor", "executive"].includes(req.user?.role)) {
      throw new AppError("Insufficient permissions for dashboard export", 403);
    }

    const timeRangeObj = {
      start: new Date(timeRange.start),
      end: new Date(timeRange.end)
    };

    const exportResult = await errorAnalyticsDashboard.exportDashboardData(
      dashboardId,
      format,
      timeRangeObj,
      req.user?.id
    );
    
    ResponseHelper.success(res, exportResult, "Dashboard data exported", {
      dashboardId,
      format,
      timeRange: timeRangeObj,
      exportedBy: req.user?.id
    });

  } catch (error) {
    logger.error("Dashboard export failed", { 
      error: error.message, 
      dashboardId: req.body.dashboardId,
      userId: req.user?.id 
    });
    next(error);
  }
});

export default router;