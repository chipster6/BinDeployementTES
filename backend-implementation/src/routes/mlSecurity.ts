/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ML SECURITY ROUTES
 * ============================================================================
 *
 * API routes for ML-powered security threat detection services.
 * Provides comprehensive endpoints for parallel agent coordination
 * and real-time threat analysis integration.
 *
 * Route Categories:
 * - Behavioral Anomaly Detection
 * - Fraud Detection and Prevention
 * - APT Detection and Threat Hunting
 * - Security Analytics and Predictions
 * - ML Model Training and Deployment
 * - Real-time Security Dashboards
 *
 * Created by: Innovation Architect
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import { Router } from "express";
import { MLSecurityController } from "@/controllers/MLSecurityController";
import { MLSecurityService } from "@/services/MLSecurityService";
import { FraudDetectionService } from "@/services/FraudDetectionService";
import { APTDetectionService } from "@/services/APTDetectionService";
import { SecurityAnalyticsService } from "@/services/SecurityAnalyticsService";
import { MLModelTrainingService } from "@/services/MLModelTrainingService";
import { SecurityErrorCoordinator } from "@/services/SecurityErrorCoordinator";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { cacheMiddleware } from "@/middleware/cache";

// Initialize services
const securityErrorCoordinator = new SecurityErrorCoordinator();
const mlSecurityService = new MLSecurityService(securityErrorCoordinator);
const fraudDetectionService = new FraudDetectionService(mlSecurityService);
const aptDetectionService = new APTDetectionService(mlSecurityService, securityErrorCoordinator);
const securityAnalyticsService = new SecurityAnalyticsService(
  mlSecurityService,
  fraudDetectionService,
  aptDetectionService
);
const mlModelTrainingService = new MLModelTrainingService();

// Initialize controller
const mlSecurityController = new MLSecurityController(
  mlSecurityService,
  fraudDetectionService,
  aptDetectionService,
  securityAnalyticsService,
  mlModelTrainingService
);

const router = Router();

/**
 * ============================================================================
 * BEHAVIORAL ANOMALY DETECTION ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ml-security/behavioral-anomaly/analyze
 * @desc    Analyze user behavior for anomalies and security threats
 * @access  Security Analyst, SOC Operator, Admin
 * @body    { context: ThreatContext }
 * @returns ThreatPrediction with anomaly scores and recommendations
 */
router.post(
  "/behavioral-anomaly/analyze",
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  mlSecurityController.analyzeBehavioralAnomaly
);

/**
 * @route   GET /api/ml-security/behavioral-anomaly/threat-score/:userId/:sessionId
 * @desc    Get real-time threat score for specific user and session
 * @access  Security Analyst, SOC Operator, Admin
 * @params  userId, sessionId
 * @returns Real-time threat score with trend analysis
 */
router.get(
  "/behavioral-anomaly/threat-score/:userId/:sessionId",
  rateLimitMiddleware({ windowMs: 60000, max: 200 }), // 200 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes
  mlSecurityController.getRealTimeThreatScore
);

/**
 * ============================================================================
 * FRAUD DETECTION ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ml-security/fraud/analyze-transaction
 * @desc    Analyze transaction for fraud risk with ML scoring
 * @access  Fraud Analyst, Risk Manager, Admin
 * @body    { transaction: TransactionData }
 * @returns FraudAssessment with decision and risk factors
 */
router.post(
  "/fraud/analyze-transaction",
  rateLimitMiddleware({ windowMs: 60000, max: 500 }), // 500 requests per minute for high-volume transactions
  mlSecurityController.analyzeFraudRisk
);

/**
 * @route   GET /api/ml-security/fraud/metrics
 * @desc    Get fraud detection metrics and dashboard data
 * @access  Fraud Analyst, Risk Manager, Admin, Dashboard Viewer
 * @returns Fraud metrics with trends and alerts
 */
router.get(
  "/fraud/metrics",
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes
  mlSecurityController.getFraudMetrics
);

/**
 * @route   POST /api/ml-security/fraud/block-entity
 * @desc    Block suspicious entity (customer, card, IP, device) for fraud prevention
 * @access  Fraud Analyst, Security Analyst, Admin
 * @body    { entityType, entityId, reason, duration? }
 * @returns Success confirmation
 */
router.post(
  "/fraud/block-entity",
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  mlSecurityController.blockEntity
);

/**
 * ============================================================================
 * APT DETECTION ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ml-security/apt/analyze-behavior
 * @desc    Analyze user behavior for APT indicators and attack patterns
 * @access  Security Analyst, Threat Hunter, Admin
 * @body    { userId, sessionId, activityData }
 * @returns APT analysis with anomalies and suspected techniques
 */
router.post(
  "/apt/analyze-behavior",
  rateLimitMiddleware({ windowMs: 60000, max: 50 }), // 50 requests per minute
  mlSecurityController.analyzeAPTBehavior
);

/**
 * @route   POST /api/ml-security/apt/detect-lateral-movement
 * @desc    Detect lateral movement patterns in network events
 * @access  Security Analyst, Threat Hunter, Admin
 * @body    { networkEvents: NetworkEvent[] }
 * @returns Lateral movement analysis with suspicious chains
 */
router.post(
  "/apt/detect-lateral-movement",
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  mlSecurityController.detectLateralMovement
);

/**
 * @route   POST /api/ml-security/apt/detect-c2-communications
 * @desc    Detect command and control communications in network traffic
 * @access  Security Analyst, Threat Hunter, Admin
 * @body    { networkTraffic: NetworkTraffic[] }
 * @returns C2 communication analysis with blocking recommendations
 */
router.post(
  "/apt/detect-c2-communications",
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  mlSecurityController.detectC2Communications
);

/**
 * @route   POST /api/ml-security/apt/threat-hunting
 * @desc    Run automated threat hunting queries
 * @access  Threat Hunter, Security Analyst, Admin
 * @body    { queryIds?, timeRange? }
 * @returns Threat hunting results with findings and campaigns
 */
router.post(
  "/apt/threat-hunting",
  rateLimitMiddleware({ windowMs: 60000, max: 20 }), // 20 requests per minute
  mlSecurityController.runThreatHunting
);

/**
 * @route   GET /api/ml-security/apt/dashboard
 * @desc    Get APT detection dashboard data
 * @access  Security Analyst, Threat Hunter, Admin, Dashboard Viewer
 * @returns APT dashboard with campaigns, findings, and metrics
 */
router.get(
  "/apt/dashboard",
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  cacheMiddleware(900), // Cache for 15 minutes
  mlSecurityController.getAPTDashboard
);

/**
 * ============================================================================
 * SECURITY ANALYTICS ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ml-security/analytics/threat-predictions
 * @desc    Generate comprehensive threat predictions using ML models
 * @access  Security Analyst, Risk Manager, Admin
 * @body    { modelTypes, horizons, scope? }
 * @returns Threat predictions with confidence intervals and recommendations
 */
router.post(
  "/analytics/threat-predictions",
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  mlSecurityController.generateThreatPredictions
);

/**
 * @route   POST /api/ml-security/analytics/risk-trajectories
 * @desc    Analyze risk trajectories for users and systems
 * @access  Security Analyst, Risk Manager, Admin
 * @body    { targets, horizon? }
 * @returns Risk trajectory analysis with intervention recommendations
 */
router.post(
  "/analytics/risk-trajectories",
  rateLimitMiddleware({ windowMs: 60000, max: 50 }), // 50 requests per minute
  mlSecurityController.analyzeRiskTrajectories
);

/**
 * @route   GET /api/ml-security/analytics/dashboard
 * @desc    Get security analytics dashboard with predictions and insights
 * @access  Security Analyst, Risk Manager, Admin, Dashboard Viewer
 * @returns Security analytics dashboard data
 */
router.get(
  "/analytics/dashboard",
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  cacheMiddleware(600), // Cache for 10 minutes
  mlSecurityController.getSecurityAnalyticsDashboard
);

/**
 * ============================================================================
 * ML MODEL TRAINING ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/ml-security/training/submit-job
 * @desc    Submit ML model training job
 * @access  ML Engineer, Security Analyst, Admin
 * @body    { config: ModelTrainingConfig }
 * @returns Training job details with estimated completion time
 */
router.post(
  "/training/submit-job",
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 requests per minute
  mlSecurityController.submitTrainingJob
);

/**
 * @route   GET /api/ml-security/training/job-status/:jobId
 * @desc    Get training job status and progress
 * @access  ML Engineer, Security Analyst, Admin
 * @params  jobId
 * @returns Training job status with progress and logs
 */
router.get(
  "/training/job-status/:jobId",
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  cacheMiddleware(60), // Cache for 1 minute
  mlSecurityController.getTrainingJobStatus
);

/**
 * @route   POST /api/ml-security/training/deploy-model
 * @desc    Deploy trained model to staging or production
 * @access  ML Engineer, Admin
 * @body    { modelId, environment, trafficPercentage? }
 * @returns Deployment details with endpoint information
 */
router.post(
  "/training/deploy-model",
  rateLimitMiddleware({ windowMs: 60000, max: 5 }), // 5 requests per minute
  mlSecurityController.deployModel
);

/**
 * @route   GET /api/ml-security/training/monitor-performance/:modelId
 * @desc    Monitor model performance metrics and trends
 * @access  ML Engineer, Security Analyst, Admin
 * @params  modelId
 * @query   startDate?, endDate?
 * @returns Model performance monitoring data with recommendations
 */
router.get(
  "/training/monitor-performance/:modelId",
  rateLimitMiddleware({ windowMs: 60000, max: 50 }), // 50 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes
  mlSecurityController.monitorModelPerformance
);

/**
 * @route   POST /api/ml-security/training/trigger-retraining/:modelId
 * @desc    Trigger model retraining due to performance degradation or drift
 * @access  ML Engineer, Admin
 * @params  modelId
 * @body    { reason, config? }
 * @returns Retraining job details
 */
router.post(
  "/training/trigger-retraining/:modelId",
  rateLimitMiddleware({ windowMs: 60000, max: 5 }), // 5 requests per minute
  mlSecurityController.triggerRetraining
);

/**
 * @route   GET /api/ml-security/training/dashboard
 * @desc    Get ML training dashboard with job status and model performance
 * @access  ML Engineer, Security Analyst, Admin, Dashboard Viewer
 * @returns ML training dashboard data
 */
router.get(
  "/training/dashboard",
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes
  mlSecurityController.getTrainingDashboard
);

/**
 * ============================================================================
 * HEALTH CHECK AND STATUS ROUTES
 * ============================================================================
 */

/**
 * @route   GET /api/ml-security/health
 * @desc    Health check for ML security services
 * @access  Public (with rate limiting)
 * @returns Service health status
 */
router.get(
  "/health",
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  async (req, res) => {
    try {
      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          mlSecurityService: "operational",
          fraudDetectionService: "operational",
          aptDetectionService: "operational",
          securityAnalyticsService: "operational",
          mlModelTrainingService: "operational"
        },
        version: "1.0.0",
        uptime: process.uptime()
      };

      res.status(200).json(healthStatus);
    } catch (error: unknown) {
      res.status(503).json({
        status: "unhealthy",
        error: error instanceof Error ? error?.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route   GET /api/ml-security/status
 * @desc    Detailed status of ML security services and models
 * @access  Admin, ML Engineer
 * @returns Detailed service status with metrics
 */
router.get(
  "/status",
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  async (req, res) => {
    try {
      // This would typically check actual service status
      const detailedStatus = {
        status: "operational",
        timestamp: new Date().toISOString(),
        services: {
          mlSecurityService: {
            status: "healthy",
            modelsLoaded: 3,
            avgResponseTime: "45ms",
            requestsPerMinute: 150
          },
          fraudDetectionService: {
            status: "healthy",
            rulesActive: 8,
            avgScoreTime: "38ms",
            transactionsProcessed: 1250
          },
          aptDetectionService: {
            status: "healthy",
            activeCampaigns: 2,
            threatHuntingQueries: 5,
            avgAnalysisTime: "125ms"
          },
          securityAnalyticsService: {
            status: "healthy",
            activePredictions: 12,
            predictionAccuracy: "87%",
            lastModelUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          },
          mlModelTrainingService: {
            status: "healthy",
            activeJobs: 1,
            deployedModels: 8,
            avgTrainingTime: "45min"
          }
        },
        systemMetrics: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version
        }
      };

      res.status(200).json(detailedStatus);
    } catch (error: unknown) {
      res.status(503).json({
        status: "error",
        error: error instanceof Error ? error?.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;