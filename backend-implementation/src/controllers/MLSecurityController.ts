/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ML SECURITY CONTROLLER
 * ============================================================================
 *
 * API controller for ML-powered security threat detection services.
 * Provides endpoints for parallel agent coordination and real-time
 * threat analysis integration.
 *
 * Features:
 * - Behavioral anomaly detection API endpoints
 * - Fraud detection and scoring APIs
 * - APT detection and threat hunting APIs
 * - Security analytics and prediction APIs
 * - ML model training and deployment APIs
 * - Real-time threat monitoring dashboard feeds
 * - Cross-agent coordination protocols
 *
 * Created by: Innovation Architect
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import type { Request, Response, NextFunction } from "express";
import { MLSecurityService } from "@/services/MLSecurityService";
import { FraudDetectionService } from "@/services/FraudDetectionService";
import { APTDetectionService } from "@/services/APTDetectionService";
import { SecurityAnalyticsService } from "@/services/SecurityAnalyticsService";
import { MLModelTrainingService } from "@/services/MLModelTrainingService";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { logger } from "@/utils/logger";
import { AppError, ValidationError } from "@/middleware/errorHandler";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { validateRequest } from "@/middleware/validation";
import { body, query, param } from "express-validator";

/**
 * ML Security Controller class
 */
export class MLSecurityController {
  private mlSecurityService: MLSecurityService;
  private fraudDetectionService: FraudDetectionService;
  private aptDetectionService: APTDetectionService;
  private securityAnalyticsService: SecurityAnalyticsService;
  private mlModelTrainingService: MLModelTrainingService;

  constructor(
    mlSecurityService: MLSecurityService,
    fraudDetectionService: FraudDetectionService,
    aptDetectionService: APTDetectionService,
    securityAnalyticsService: SecurityAnalyticsService,
    mlModelTrainingService: MLModelTrainingService
  ) {
    this.mlSecurityService = mlSecurityService;
    this.fraudDetectionService = fraudDetectionService;
    this.aptDetectionService = aptDetectionService;
    this.securityAnalyticsService = securityAnalyticsService;
    this.mlModelTrainingService = mlModelTrainingService;
  }

  /**
   * Analyze behavioral anomaly for threat detection
   */
  public analyzeBehavioralAnomaly = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "soc_operator"]),
    validateRequest([
      body("context.request.ip").isIP().withMessage("Valid IP address required"),
      body("context.request.userAgent").notEmpty().withMessage("User agent required"),
      body("context.user.id").notEmpty().withMessage("User ID required"),
      body("context.session.id").notEmpty().withMessage("Session ID required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { context } = req.body;

        const result = await this.mlSecurityService.analyzeBehavioralAnomaly(context);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Behavioral anomaly analysis completed", {
          userId: context.user.id,
          riskLevel: result.data.riskLevel,
          anomalyScore: result.data.anomalyScore,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.analyzeBehavioralAnomaly failed", {
          error: error instanceof Error ? error?.message : String(error),
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get real-time threat score for user/session
   */
  public getRealTimeThreatScore = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "soc_operator"]),
    validateRequest([
      param("userId").notEmpty().withMessage("User ID required"),
      param("sessionId").notEmpty().withMessage("Session ID required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, sessionId } = req.params;

        const result = await this.mlSecurityService.getRealTimeThreatScore(userId, sessionId);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getRealTimeThreatScore failed", {
          error: error instanceof Error ? error?.message : String(error),
          userId: req.params.userId,
          sessionId: req.params.sessionId,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Analyze transaction for fraud risk
   */
  public analyzeFraudRisk = [
    authMiddleware,
    requireRole(["admin", "fraud_analyst", "risk_manager"]),
    validateRequest([
      body("transaction.id").notEmpty().withMessage("Transaction ID required"),
      body("transaction.customerId").notEmpty().withMessage("Customer ID required"),
      body("transaction.amount").isNumeric().withMessage("Valid amount required"),
      body("transaction.currency").isLength({ min: 3, max: 3 }).withMessage("Valid currency code required"),
      body("transaction.paymentMethod.type").isIn(["card", "bank_transfer", "digital_wallet"]).withMessage("Valid payment method required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { transaction } = req.body;

        const result = await this.fraudDetectionService.analyzeTransaction(transaction);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Fraud risk analysis completed", {
          transactionId: transaction.id,
          customerId: transaction.customerId,
          decision: result.data.decision,
          fraudScore: result.data.fraudScore,
          riskLevel: result.data.riskLevel,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.analyzeFraudRisk failed", {
          error: error instanceof Error ? error?.message : String(error),
          transactionId: req.body.transaction?.id,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get fraud detection metrics for dashboard
   */
  public getFraudMetrics = [
    authMiddleware,
    requireRole(["admin", "fraud_analyst", "risk_manager", "dashboard_viewer"]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.fraudDetectionService.getFraudMetrics();

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 500, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getFraudMetrics failed", {
          error: error instanceof Error ? error?.message : String(error),
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Analyze APT behavior patterns
   */
  public analyzeAPTBehavior = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "threat_hunter"]),
    validateRequest([
      body("userId").notEmpty().withMessage("User ID required"),
      body("sessionId").notEmpty().withMessage("Session ID required"),
      body("activityData.actions").isArray().withMessage("Actions array required"),
      body("activityData.networkActivity").isArray().withMessage("Network activity array required"),
      body("activityData.systemEvents").isArray().withMessage("System events array required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, sessionId, activityData } = req.body;

        const result = await this.aptDetectionService.analyzeAPTBehavior(
          userId,
          sessionId,
          activityData
        );

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("APT behavior analysis completed", {
          userId,
          sessionId,
          anomaliesDetected: result.data.anomalies.length,
          riskScore: result.data.riskScore,
          suspectedTechniques: result.data.suspectedTechniques.length,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.analyzeAPTBehavior failed", {
          error: error instanceof Error ? error?.message : String(error),
          userId: req.body.userId,
          sessionId: req.body.sessionId,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Detect lateral movement patterns
   */
  public detectLateralMovement = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "threat_hunter"]),
    validateRequest([
      body("networkEvents").isArray().withMessage("Network events array required"),
      body("networkEvents.*.sourceIp").isIP().withMessage("Valid source IP required"),
      body("networkEvents.*.targetIp").isIP().withMessage("Valid target IP required"),
      body("networkEvents.*.protocol").notEmpty().withMessage("Protocol required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { networkEvents } = req.body;

        const result = await this.aptDetectionService.detectLateralMovement(networkEvents);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Lateral movement detection completed", {
          networkEventsCount: networkEvents.length,
          movementsDetected: result.data.movements.length,
          suspiciousChains: result.data.suspiciousChains.length,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.detectLateralMovement failed", {
          error: error instanceof Error ? error?.message : String(error),
          eventCount: req.body?.networkEvents?.length,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Detect command and control communications
   */
  public detectC2Communications = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "threat_hunter"]),
    validateRequest([
      body("networkTraffic").isArray().withMessage("Network traffic array required"),
      body("networkTraffic.*.sourceIp").isIP().withMessage("Valid source IP required"),
      body("networkTraffic.*.destinationIp").isIP().withMessage("Valid destination IP required"),
      body("networkTraffic.*.protocol").notEmpty().withMessage("Protocol required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { networkTraffic } = req.body;

        const result = await this.aptDetectionService.detectC2Communications(networkTraffic);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("C2 communication detection completed", {
          trafficCount: networkTraffic.length,
          c2Communications: result.data.c2Communications.length,
          blockedCommunications: result.data.blockedCommunications,
          suspiciousPatterns: result.data.suspiciousPatterns.length,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.detectC2Communications failed", {
          error: error instanceof Error ? error?.message : String(error),
          trafficCount: req.body?.networkTraffic?.length,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Run threat hunting queries
   */
  public runThreatHunting = [
    authMiddleware,
    requireRole(["admin", "threat_hunter", "security_analyst"]),
    validateRequest([
      body("queryIds").optional().isArray().withMessage("Query IDs must be array"),
      body("timeRange.start").optional().isISO8601().withMessage("Valid start date required"),
      body("timeRange.end").optional().isISO8601().withMessage("Valid end date required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { queryIds, timeRange } = req.body;

        const timeRangeObj = timeRange ? {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end)
        } : undefined;

        const result = await this.aptDetectionService.runThreatHunting(queryIds, timeRangeObj);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Threat hunting completed", {
          queryIds: queryIds?.length || "all",
          totalFindings: result.data.totalFindings,
          newCampaigns: result.data.newCampaigns.length,
          updatedCampaigns: result.data.updatedCampaigns.length,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.runThreatHunting failed", {
          error: error instanceof Error ? error?.message : String(error),
          queryIds: req.body.queryIds,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get APT dashboard data
   */
  public getAPTDashboard = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "threat_hunter", "dashboard_viewer"]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.aptDetectionService.getAPTDashboard();

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 500, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getAPTDashboard failed", {
          error: error instanceof Error ? error?.message : String(error),
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Generate threat predictions
   */
  public generateThreatPredictions = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "risk_manager"]),
    validateRequest([
      body("modelTypes").isArray().withMessage("Model types array required"),
      body("horizons").isArray().withMessage("Horizons array required"),
      body("scope.userId").optional().notEmpty().withMessage("User ID must not be empty"),
      body("scope.systemId").optional().notEmpty().withMessage("System ID must not be empty")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { modelTypes, horizons, scope } = req.body;

        const result = await this.securityAnalyticsService.generateThreatPredictions(
          modelTypes,
          horizons,
          scope
        );

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Threat predictions generated", {
          modelTypes: modelTypes.length,
          horizons: horizons.length,
          predictionsGenerated: result.data.predictions.length,
          avgConfidence: result.data.summary.avgConfidence,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.generateThreatPredictions failed", {
          error: error instanceof Error ? error?.message : String(error),
          modelTypes: req.body.modelTypes,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Analyze risk trajectories
   */
  public analyzeRiskTrajectories = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "risk_manager"]),
    validateRequest([
      body("targets").isArray().withMessage("Targets array required"),
      body("targets.*.type").isIn(["user", "system"]).withMessage("Valid target type required"),
      body("targets.*.id").notEmpty().withMessage("Target ID required"),
      body("horizon").optional().isIn(["1h", "6h", "24h", "7d", "30d", "90d"]).withMessage("Valid horizon required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { targets, horizon } = req.body;

        const result = await this.securityAnalyticsService.analyzeRiskTrajectories(targets, horizon);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Risk trajectory analysis completed", {
          targetsAnalyzed: targets.length,
          highRiskTargets: result.data.summary.highRiskTargets,
          interventionsRecommended: result.data.interventions.length,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.analyzeRiskTrajectories failed", {
          error: error instanceof Error ? error?.message : String(error),
          targetCount: req.body?.targets?.length,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get security analytics dashboard
   */
  public getSecurityAnalyticsDashboard = [
    authMiddleware,
    requireRole(["admin", "security_analyst", "risk_manager", "dashboard_viewer"]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.securityAnalyticsService.getSecurityAnalyticsDashboard();

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 500, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getSecurityAnalyticsDashboard failed", {
          error: error instanceof Error ? error?.message : String(error),
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Submit ML model training job
   */
  public submitTrainingJob = [
    authMiddleware,
    requireRole(["admin", "ml_engineer", "security_analyst"]),
    validateRequest([
      body("config.modelType").notEmpty().withMessage("Model type required"),
      body("config.algorithm").notEmpty().withMessage("Training algorithm required"),
      body("config.features").isArray().withMessage("Features array required"),
      body("config.trainingData.source").notEmpty().withMessage("Training data source required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { config } = req.body;

        const result = await this.mlModelTrainingService.submitTrainingJob(config);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("ML training job submitted", {
          jobId: result.data.jobId,
          modelType: config.modelType,
          algorithm: config.algorithm,
          estimatedDuration: result.data.estimatedDuration,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.submitTrainingJob failed", {
          error: error instanceof Error ? error?.message : String(error),
          modelType: req.body.config?.modelType,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get training job status
   */
  public getTrainingJobStatus = [
    authMiddleware,
    requireRole(["admin", "ml_engineer", "security_analyst"]),
    validateRequest([
      param("jobId").notEmpty().withMessage("Job ID required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { jobId } = req.params;

        const result = await this.mlModelTrainingService.getTrainingJobStatus(jobId);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 404, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getTrainingJobStatus failed", {
          error: error instanceof Error ? error?.message : String(error),
          jobId: req.params.jobId,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Deploy trained model
   */
  public deployModel = [
    authMiddleware,
    requireRole(["admin", "ml_engineer"]),
    validateRequest([
      body("modelId").notEmpty().withMessage("Model ID required"),
      body("environment").isIn(["staging", "production"]).withMessage("Valid environment required"),
      body("trafficPercentage").optional().isInt({ min: 1, max: 100 }).withMessage("Traffic percentage must be 1-100")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { modelId, environment, trafficPercentage = 100 } = req.body;

        const result = await this.mlModelTrainingService.deployModel(
          modelId,
          environment,
          trafficPercentage
        );

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Model deployment initiated", {
          modelId,
          environment,
          deploymentId: result.data.deploymentId,
          trafficPercentage,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.deployModel failed", {
          error: error instanceof Error ? error?.message : String(error),
          modelId: req.body.modelId,
          environment: req.body.environment,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Monitor model performance
   */
  public monitorModelPerformance = [
    authMiddleware,
    requireRole(["admin", "ml_engineer", "security_analyst"]),
    validateRequest([
      param("modelId").notEmpty().withMessage("Model ID required"),
      query("startDate").optional().isISO8601().withMessage("Valid start date required"),
      query("endDate").optional().isISO8601().withMessage("Valid end date required")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { modelId } = req.params;
        const { startDate, endDate } = req.query;

        const timeRange = startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        } : undefined;

        const result = await this.mlModelTrainingService.monitorModelPerformance(modelId, timeRange);

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 404, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.monitorModelPerformance failed", {
          error: error instanceof Error ? error?.message : String(error),
          modelId: req.params.modelId,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Get ML training dashboard
   */
  public getTrainingDashboard = [
    authMiddleware,
    requireRole(["admin", "ml_engineer", "security_analyst", "dashboard_viewer"]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.mlModelTrainingService.getTrainingDashboard();

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 500, result.errors);
        }

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.getTrainingDashboard failed", {
          error: error instanceof Error ? error?.message : String(error),
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Block suspicious entity for fraud prevention
   */
  public blockEntity = [
    authMiddleware,
    requireRole(["admin", "fraud_analyst", "security_analyst"]),
    validateRequest([
      body("entityType").isIn(["customer", "card", "ip", "device"]).withMessage("Valid entity type required"),
      body("entityId").notEmpty().withMessage("Entity ID required"),
      body("reason").notEmpty().withMessage("Block reason required"),
      body("duration").optional().isInt({ min: 300 }).withMessage("Duration must be at least 300 seconds")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entityType, entityId, reason, duration } = req.body;

        const result = await this.fraudDetectionService.blockEntity(
          entityType,
          entityId,
          reason,
          duration
        );

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.warn("Entity blocked for fraud prevention", {
          entityType,
          entityId,
          reason,
          duration,
          blockedBy: req.user?.id,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, undefined, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.blockEntity failed", {
          error: error instanceof Error ? error?.message : String(error),
          entityType: req.body.entityType,
          entityId: req.body.entityId,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];

  /**
   * Trigger model retraining
   */
  public triggerRetraining = [
    authMiddleware,
    requireRole(["admin", "ml_engineer"]),
    validateRequest([
      param("modelId").notEmpty().withMessage("Model ID required"),
      body("reason").notEmpty().withMessage("Retraining reason required"),
      body("config").optional().isObject().withMessage("Config must be object")
    ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { modelId } = req.params;
        const { reason, config } = req.body;

        const result = await this.mlModelTrainingService.triggerRetraining(
          modelId,
          reason,
          config
        );

        if (!result.success) {
          return ResponseHelper.error(res, result?.message, 400, result.errors);
        }

        logger.info("Model retraining triggered", {
          modelId,
          reason,
          jobId: result.data.jobId,
          triggeredBy: req.user?.id,
          requestId: req.headers["x-request-id"]
        });

        return ResponseHelper.success(res, result.data, result?.message);

      } catch (error: unknown) {
        logger.error("MLSecurityController.triggerRetraining failed", {
          error: error instanceof Error ? error?.message : String(error),
          modelId: req.params.modelId,
          reason: req.body.reason,
          requestId: req.headers["x-request-id"]
        });
        next(error);
      }
    }
  ];
}

export default MLSecurityController;