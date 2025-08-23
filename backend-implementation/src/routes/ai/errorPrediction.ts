/**
 * ============================================================================
 * ERROR PREDICTION API ROUTES - HUB AUTHORITY COMPLIANT IMPLEMENTATION
 * ============================================================================
 *
 * RESTful API routes for decomposed error prediction services using dependency
 * injection and maintaining compatibility with existing API contracts.
 *
 * Hub Authority Requirements:
 * - Use decomposed services via dependency injection
 * - Maintain existing API compatibility
 * - Consistent error handling and response formats
 * - Authentication and authorization middleware
 * - Performance monitoring integration
 *
 * Services:
 * - ErrorPredictionEngineService (<100ms prediction response)
 * - MLModelManagementService (<30s model deployment)
 * - ErrorAnalyticsService (real-time analytics)
 * - ErrorCoordinationService (cross-stream coordination)
 */

import { Router } from "express";
import { authenticateToken, requireRole } from "@/middleware/auth";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { logger, Timer } from "@/utils/logger";
import {
  getErrorPredictionEngine,
  getMLModelManager,
  getErrorAnalytics,
  getErrorCoordination,
} from "@/container/ServiceContainer";

const router = Router();

// Middleware for all error prediction routes
router.use(authenticateToken);

/**
 * ============================================================================
 * ERROR PREDICTION ENGINE ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ai/error-prediction/predict
 * @desc    Generate error prediction with 85%+ accuracy and <100ms response
 * @access  Admin, Operations, System
 */
router.post("/predict", requireRole(["admin", "operations", "system"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.predict");
  
  try {
    const predictionService = getErrorPredictionEngine();
    const { predictionWindow, systemLayer, features, historicalData, businessContext } = req.body;

    // Validate required fields
    if (!predictionWindow || !predictionWindow.start || !predictionWindow.end) {
      return res.status(400).json(ResponseHelper.error("Prediction window is required", ["Missing start or end time"]));
    }

    const predictionContext = {
      predictionWindow: {
        start: new Date(predictionWindow.start),
        end: new Date(predictionWindow.end),
      },
      systemLayer,
      features: features || {},
      historicalData: historicalData || [],
      businessContext,
    };

    const result = await predictionService.generatePrediction(predictionContext);

    timer.end({
      predictionId: result.predictionId,
      executionTime: result.executionTime,
      modelsUsed: Object.keys(result.modelContributions).length,
    });

    // Hub Requirement: Log performance for <100ms monitoring
    if (result.executionTime > 100) {
      logger.warn("Prediction API exceeded 100ms threshold", {
        predictionId: result.predictionId,
        executionTime: result.executionTime,
        endpoint: "/predict",
      });
    }

    res.json(ResponseHelper.success(result, "Error prediction generated successfully"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Error prediction API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/predict",
      body: req.body,
    });
    res.status(500).json(ResponseHelper.error("Failed to generate error prediction", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/batch
 * @desc    Generate batch predictions for multiple contexts
 * @access  Admin, Operations, System
 */
router.post("/batch", requireRole(["admin", "operations", "system"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.batch");

  try {
    const predictionService = getErrorPredictionEngine();
    const { contexts } = req.body;

    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return res.status(400).json(ResponseHelper.error("Prediction contexts array is required", ["Empty or invalid contexts"]));
    }

    // Validate and transform contexts
    const predictionContexts = contexts.map(context => ({
      predictionWindow: {
        start: new Date(context.predictionWindow.start),
        end: new Date(context.predictionWindow.end),
      },
      systemLayer: context.systemLayer,
      features: context?.features || {},
      historicalData: context?.historicalData || [],
      businessContext: context.businessContext,
    }));

    const results = await predictionService.generateBatchPredictions(predictionContexts);

    timer.end({
      contextCount: contexts.length,
      resultCount: results.length,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
    });

    res.json(ResponseHelper.success(results, `${results.length} batch predictions generated successfully`));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Batch prediction API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/batch",
      contextCount: req.body?.contexts?.length || 0,
    });
    res.status(500).json(ResponseHelper.error("Failed to generate batch predictions", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/performance
 * @desc    Get prediction engine performance metrics
 * @access  Admin, Operations
 */
router.get("/performance", requireRole(["admin", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.performance");

  try {
    const predictionService = getErrorPredictionEngine();
    const performance = await predictionService.getPredictionPerformance();

    timer.end({
      averageResponseTime: performance.averageResponseTime,
      accuracy: performance.accuracy,
    });

    res.json(ResponseHelper.success(performance, "Prediction performance metrics retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Prediction performance API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/performance",
    });
    res.status(500).json(ResponseHelper.error("Failed to get prediction performance", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/validate
 * @desc    Validate prediction accuracy against test data
 * @access  Admin, Data Science
 */
router.post("/validate", requireRole(["admin", "data_science"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.validate");

  try {
    const predictionService = getErrorPredictionEngine();
    const { testData } = req.body;

    if (!testData || !testData.features || !testData.expectedOutcomes) {
      return res.status(400).json(ResponseHelper.error("Test data is required", ["Missing features or expectedOutcomes"]));
    }

    const validationData = {
      features: testData.features,
      expectedOutcomes: testData.expectedOutcomes,
      timeRange: {
        start: new Date(testData.timeRange?.start || Date.now() - 24 * 3600000),
        end: new Date(testData.timeRange?.end || Date.now()),
      },
    };

    const accuracy = await predictionService.validatePredictionAccuracy(validationData);

    timer.end({
      overallAccuracy: accuracy.overall.accuracy,
      modelsValidated: Object.keys(accuracy.byModel).length,
    });

    res.json(ResponseHelper.success(accuracy, "Prediction accuracy validation completed"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Prediction validation API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/validate",
    });
    res.status(500).json(ResponseHelper.error("Failed to validate prediction accuracy", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * ============================================================================
 * ML MODEL MANAGEMENT ROUTES
 * ============================================================================
 */

/**
 * @route   GET /api/ai/error-prediction/models
 * @desc    List all ML models with filtering
 * @access  Admin, Data Science, Operations
 */
router.get("/models", requireRole(["admin", "data_science", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.list");

  try {
    const modelManager = getMLModelManager();
    const { status, type, minAccuracy } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (type) filters.type = type as string;
    if (minAccuracy) filters.performance = { minAccuracy: parseFloat(minAccuracy as string) };

    const models = await modelManager.listModels(filters);

    timer.end({
      modelCount: models.length,
      filters: Object.keys(filters),
    });

    res.json(ResponseHelper.success(models, `${models.length} models retrieved`));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Models list API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models",
    });
    res.status(500).json(ResponseHelper.error("Failed to retrieve models", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/models/:modelId/deploy
 * @desc    Deploy ML model with <30 second deployment requirement
 * @access  Admin, Data Science
 */
router.post("/models/:modelId/deploy", requireRole(["admin", "data_science"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.deploy");

  try {
    const modelManager = getMLModelManager();
    const { modelId } = req.params;
    const modelConfig = req.body;

    // Add model ID to config
    modelConfig.modelId = modelId;

    const result = await modelManager.deployModel(modelConfig);

    timer.end({
      modelId,
      success: result.success,
      deploymentTime: result.deploymentTime,
    });

    // Hub Requirement: Check <30 second deployment time
    if (result.deploymentTime > 30) {
      logger.warn("Model deployment exceeded 30s threshold", {
        modelId,
        deploymentTime: result.deploymentTime,
        endpoint: "/models/deploy",
      });
    }

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(ResponseHelper.success(result, result?.message));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Model deployment API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models/deploy",
      modelId: req.params.modelId,
    });
    res.status(500).json(ResponseHelper.error("Failed to deploy model", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/models/:modelId/rollback
 * @desc    Rollback model to previous version
 * @access  Admin, Data Science
 */
router.post("/models/:modelId/rollback", requireRole(["admin", "data_science"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.rollback");

  try {
    const modelManager = getMLModelManager();
    const { modelId } = req.params;
    const { targetVersion } = req.body;

    const result = await modelManager.rollbackModel(modelId, targetVersion);

    timer.end({
      modelId,
      success: result.success,
      rollbackTime: result.deploymentTime,
    });

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(ResponseHelper.success(result, result?.message));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Model rollback API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models/rollback",
      modelId: req.params.modelId,
    });
    res.status(500).json(ResponseHelper.error("Failed to rollback model", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/models/train
 * @desc    Start model training job
 * @access  Admin, Data Science
 */
router.post("/models/train", requireRole(["admin", "data_science"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.train");

  try {
    const modelManager = getMLModelManager();
    const trainingConfig = req.body;

    if (!trainingConfig.modelId) {
      return res.status(400).json(ResponseHelper.error("Model ID is required", ["Missing modelId in training config"]));
    }

    const jobId = await modelManager.startTrainingJob(trainingConfig);

    timer.end({
      modelId: trainingConfig.modelId,
      jobId,
    });

    res.status(201).json(ResponseHelper.success({ jobId }, "Training job started successfully"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Model training API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models/train",
      modelId: req.body.modelId,
    });
    res.status(500).json(ResponseHelper.error("Failed to start training job", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/models/jobs/:jobId
 * @desc    Get training job status
 * @access  Admin, Data Science
 */
router.get("/models/jobs/:jobId", requireRole(["admin", "data_science"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.jobStatus");

  try {
    const modelManager = getMLModelManager();
    const { jobId } = req.params;

    const job = await modelManager.getTrainingJobStatus(jobId);

    timer.end({
      jobId,
      status: job.status,
      progress: job.progress,
    });

    res.json(ResponseHelper.success(job, "Training job status retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Training job status API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models/jobs/status",
      jobId: req.params.jobId,
    });
    res.status(500).json(ResponseHelper.error("Failed to get training job status", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/models/:modelId/health
 * @desc    Get model deployment health status
 * @access  Admin, Operations
 */
router.get("/models/:modelId/health", requireRole(["admin", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.models.health");

  try {
    const modelManager = getMLModelManager();
    const { modelId } = req.params;

    const health = await modelManager.getModelHealth(modelId);

    timer.end({
      modelId,
      status: health.status,
      responseTime: health.responseTime,
    });

    res.json(ResponseHelper.success(health, "Model health status retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Model health API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/models/health",
      modelId: req.params.modelId,
    });
    res.status(500).json(ResponseHelper.error("Failed to get model health", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * ============================================================================
 * ERROR ANALYTICS ROUTES
 * ============================================================================
 */

/**
 * @route   GET /api/ai/error-prediction/analytics/trends
 * @desc    Get error trends analysis
 * @access  Admin, Operations, Business Intelligence
 */
router.get("/analytics/trends", requireRole(["admin", "operations", "business_intelligence"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.analytics.trends");

  try {
    const analyticsService = getErrorAnalytics();
    const { start, end, granularity, systemLayer, severity, businessImpact } = req.query;

    const timeRange = {
      start: new Date(start as string || Date.now() - 24 * 3600000),
      end: new Date(end as string || Date.now()),
      granularity: (granularity as any) || "hour",
    };

    const filters: any = {};
    if (systemLayer) filters.systemLayer = systemLayer;
    if (severity) filters.severity = (severity as string).split(",");
    if (businessImpact) filters.businessImpact = (businessImpact as string).split(",");

    const trends = await analyticsService.getErrorTrends(timeRange, filters);

    timer.end({
      timeRange: `${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`,
      dataPoints: trends.length,
      granularity: timeRange.granularity,
    });

    res.json(ResponseHelper.success(trends, `${trends.length} trend data points retrieved`));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Error trends API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/analytics/trends",
    });
    res.status(500).json(ResponseHelper.error("Failed to get error trends", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/analytics/dashboard
 * @desc    Get comprehensive analytics dashboard
 * @access  Admin, Operations, Business Intelligence
 */
router.get("/analytics/dashboard", requireRole(["admin", "operations", "business_intelligence"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.analytics.dashboard");

  try {
    const analyticsService = getErrorAnalytics();
    const { start, end, granularity } = req.query;

    const timeRange = {
      start: new Date(start as string || Date.now() - 24 * 3600000),
      end: new Date(end as string || Date.now()),
      granularity: (granularity as any) || "hour",
    };

    const dashboard = await analyticsService.getDashboardData(timeRange);

    timer.end({
      timeRange: `${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`,
      totalErrors: dashboard.summary.totalErrors,
      systemHealth: dashboard.summary.systemHealth,
    });

    res.json(ResponseHelper.success(dashboard, "Analytics dashboard data retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Analytics dashboard API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/analytics/dashboard",
    });
    res.status(500).json(ResponseHelper.error("Failed to get analytics dashboard", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/analytics/realtime
 * @desc    Get real-time analytics stream
 * @access  Admin, Operations
 */
router.get("/analytics/realtime", requireRole(["admin", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.analytics.realtime");

  try {
    const analyticsService = getErrorAnalytics();
    const realtimeData = await analyticsService.getRealtimeAnalytics();

    timer.end({
      errorRate: realtimeData.errorRate,
      systemHealth: realtimeData.systemHealth,
      activeAnomalies: realtimeData.activeAnomalies,
    });

    res.json(ResponseHelper.success(realtimeData, "Real-time analytics retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Real-time analytics API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/analytics/realtime",
    });
    res.status(500).json(ResponseHelper.error("Failed to get real-time analytics", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * ============================================================================
 * ERROR COORDINATION ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ai/error-prediction/coordination/register
 * @desc    Register stream for error coordination
 * @access  System, Admin
 */
router.post("/coordination/register", requireRole(["system", "admin"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.coordination.register");

  try {
    const coordinationService = getErrorCoordination();
    const context = req.body;

    if (!context.streamId || !context.streamType) {
      return res.status(400).json(ResponseHelper.error("Stream ID and type are required", ["Missing streamId or streamType"]));
    }

    const result = await coordinationService.registerStream(context);

    timer.end({
      streamId: context.streamId,
      streamType: context.streamType,
      registered: result.registered,
    });

    res.status(201).json(ResponseHelper.success(result, "Stream registered for coordination"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Stream registration API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/coordination/register",
    });
    res.status(500).json(ResponseHelper.error("Failed to register stream", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   POST /api/ai/error-prediction/coordination/coordinate
 * @desc    Coordinate error event across streams
 * @access  System, Admin
 */
router.post("/coordination/coordinate", requireRole(["system", "admin"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.coordination.coordinate");

  try {
    const coordinationService = getErrorCoordination();
    const event = req.body;

    if (!event.eventId || !event.sourceStream) {
      return res.status(400).json(ResponseHelper.error("Event ID and source stream are required", ["Missing eventId or sourceStream"]));
    }

    const result = await coordinationService.coordinateErrorEvent(event);

    timer.end({
      coordinationId: result.coordinationId,
      success: result.success,
      executionTime: result.executionTime,
      streamsAffected: result.streamsAffected.length,
    });

    res.json(ResponseHelper.success(result, "Error event coordination completed"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Error coordination API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/coordination/coordinate",
    });
    res.status(500).json(ResponseHelper.error("Failed to coordinate error event", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/coordination/health
 * @desc    Get all streams health status
 * @access  Admin, Operations
 */
router.get("/coordination/health", requireRole(["admin", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.coordination.health");

  try {
    const coordinationService = getErrorCoordination();
    const healthStatuses = await coordinationService.getAllStreamsHealth();

    const streamCount = Object.keys(healthStatuses).length;
    const healthyStreams = Object.values(healthStatuses).filter(h => h.health === "healthy").length;

    timer.end({
      streamCount,
      healthyStreams,
      healthPercentage: streamCount > 0 ? (healthyStreams / streamCount) * 100 : 0,
    });

    res.json(ResponseHelper.success(healthStatuses, `Health status for ${streamCount} streams retrieved`));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Coordination health API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/coordination/health",
    });
    res.status(500).json(ResponseHelper.error("Failed to get coordination health", [error instanceof Error ? error?.message : String(error)]));
  }
});

/**
 * @route   GET /api/ai/error-prediction/coordination/analytics
 * @desc    Get coordination analytics and performance metrics
 * @access  Admin, Operations
 */
router.get("/coordination/analytics", requireRole(["admin", "operations"]), async (req, res) => {
  const timer = new Timer("api.errorPrediction.coordination.analytics");

  try {
    const coordinationService = getErrorCoordination();
    const { start, end } = req.query;

    const timeRange = {
      start: new Date(start as string || Date.now() - 24 * 3600000),
      end: new Date(end as string || Date.now()),
    };

    const analytics = await coordinationService.getCoordinationAnalytics(timeRange);

    timer.end({
      coordinationEvents: analytics.coordinationEvents,
      successRate: analytics.successRate,
      cascadesPrevented: analytics.cascadesPrevented,
    });

    res.json(ResponseHelper.success(analytics, "Coordination analytics retrieved"));

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error("Coordination analytics API failed", {
      error: error instanceof Error ? error?.message : String(error),
      endpoint: "/coordination/analytics",
    });
    res.status(500).json(ResponseHelper.error("Failed to get coordination analytics", [error instanceof Error ? error?.message : String(error)]));
  }
});

export default router;