/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - THREAT INTELLIGENCE API ROUTES
 * ============================================================================
 *
 * RESTful API endpoints for threat intelligence services providing:
 * - IP reputation checking and analysis
 * - Multi-source threat intelligence aggregation
 * - Real-time threat feeds and monitoring
 * - Threat reporting and IOC management
 * - Security dashboard data endpoints
 *
 * Features:
 * - Comprehensive threat analysis endpoints
 * - Real-time threat intelligence feeds
 * - Batch processing capabilities
 * - Integration with Frontend dashboards
 * - DevOps SIEM system data feeds
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import { Router, type Request, type Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticateToken, requirePermission } from "@/middleware/auth";
import { rateLimitMiddleware } from "@/middleware/rateLimiting";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { logger } from "@/utils/logger";
import { AuditLog } from "@/models/AuditLog";
import { 
  threatIntelligenceService,
  ipReputationService,
  virusTotalService,
  abuseIPDBService,
  mispIntegrationService,
} from "@/services/external";

const router = Router();

/**
 * @route   GET /api/v1/threat-intelligence/status
 * @desc    Get threat intelligence service status
 * @access  Private (security role)
 */
router.get(
  "/status",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  async (req: Request, res: Response) => {
    try {
      logger.info("Fetching threat intelligence service status", {
        userId: req.user?.id,
      });

      const status = await threatIntelligenceService.getServiceStatus();

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_intelligence_status_checked",
        resourceType: "threat_intelligence",
        resourceId: "service_status",
        details: {
          status: status.status,
          sourceCount: Object.keys(status.sources).length,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, status, "Threat intelligence service status retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch threat intelligence service status", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch service status", statusCode: 500 });
    }
  }
);

/**
 * @route   POST /api/v1/threat-intelligence/analyze
 * @desc    Analyze threat for any indicator
 * @access  Private (security role)
 */
router.post(
  "/analyze",
  authenticateToken,
  requirePermission("security:write"),
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  [
    body("target").notEmpty().withMessage("Target indicator is required"),
    body("type").isIn(["ip", "domain", "file", "url", "email"]).withMessage("Invalid indicator type"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const { target, type } = req.body;

      logger.info("Starting threat intelligence analysis", {
        target,
        type,
        userId: req.user?.id,
      });

      const result = await threatIntelligenceService.analyzeThreat(target, type);

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_analysis_performed",
        resourceType: "threat_intelligence",
        resourceId: target,
        details: {
          type,
          threatScore: result.overallThreatScore,
          malicious: result.malicious,
          confidence: result.confidence,
          action: result.recommendations.action,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      logger.info("Threat intelligence analysis completed", {
        target,
        type,
        threatScore: result.overallThreatScore,
        malicious: result.malicious,
        userId: req.user?.id,
      });

      return ResponseHelper.success(res, result, "Threat analysis completed");
    } catch (error: unknown) {
      logger.error("Failed to perform threat analysis", {
        error: error instanceof Error ? error?.message : String(error),
        target: req.body.target,
        type: req.body.type,
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to perform threat analysis", statusCode: 500 });
    }
  }
);

/**
 * @route   POST /api/v1/threat-intelligence/batch-analyze
 * @desc    Batch analyze multiple threats
 * @access  Private (security role)
 */
router.post(
  "/batch-analyze",
  authenticateToken,
  requirePermission("security:write"),
  rateLimitMiddleware({ windowMs: 300000, max: 5 }), // 5 requests per 5 minutes
  [
    body("indicators").isArray({ min: 1, max: 100 }).withMessage("Indicators array required (max 100)"),
    body("indicators.*.target").notEmpty().withMessage("Target indicator is required"),
    body("indicators.*.type").isIn(["ip", "domain", "file", "url", "email"]).withMessage("Invalid indicator type"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const { indicators } = req.body;

      logger.info("Starting batch threat intelligence analysis", {
        indicatorCount: indicators.length,
        userId: req.user?.id,
      });

      const results = await threatIntelligenceService.batchAnalyzeThreats(indicators);

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "batch_threat_analysis_performed",
        resourceType: "threat_intelligence",
        resourceId: "batch_analysis",
        details: {
          indicatorCount: indicators.length,
          resultsCount: results.length,
          maliciousCount: results.filter(r => r.malicious).length,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      logger.info("Batch threat intelligence analysis completed", {
        indicatorCount: indicators.length,
        resultsCount: results.length,
        maliciousCount: results.filter(r => r.malicious).length,
        userId: req.user?.id,
      });

      return ResponseHelper.success(res, {
        results,
        summary: {
          total: indicators.length,
          processed: results.length,
          malicious: results.filter(r => r.malicious).length,
          high_risk: results.filter(r => r.overallThreatScore >= 70).length,
        },
      }, "Batch threat analysis completed");
    } catch (error: unknown) {
      logger.error("Failed to perform batch threat analysis", {
        error: error instanceof Error ? error?.message : String(error),
        indicatorCount: req.body?.indicators?.length,
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to perform batch threat analysis", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/threat-intelligence/ip/:ip/reputation
 * @desc    Get comprehensive IP reputation
 * @access  Private (security role)
 */
router.get(
  "/ip/:ip/reputation",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  [
    param("ip").isIP().withMessage("Valid IP address required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const { ip } = req.params;

      logger.info("Checking IP reputation", {
        ip,
        userId: req.user?.id,
      });

      const result = await ipReputationService.checkIPReputation(ip);

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "ip_reputation_checked",
        resourceType: "ip_reputation",
        resourceId: ip,
        details: {
          riskScore: result.riskScore,
          overallRisk: result.overallRisk,
          malicious: result.malicious,
          action: result.recommendations.action,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, result, "IP reputation retrieved");
    } catch (error: unknown) {
      logger.error("Failed to check IP reputation", {
        error: error instanceof Error ? error?.message : String(error),
        ip: req.params.ip,
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to check IP reputation", statusCode: 500 });
    }
  }
);

/**
 * @route   POST /api/v1/threat-intelligence/ip/batch-reputation
 * @desc    Batch check IP reputations
 * @access  Private (security role)
 */
router.post(
  "/ip/batch-reputation",
  authenticateToken,
  requirePermission("security:write"),
  rateLimitMiddleware({ windowMs: 300000, max: 10 }), // 10 requests per 5 minutes
  [
    body("ips").isArray({ min: 1, max: 50 }).withMessage("IPs array required (max 50)"),
    body("ips.*").isIP().withMessage("Valid IP addresses required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const { ips } = req.body;

      logger.info("Starting batch IP reputation check", {
        ipCount: ips.length,
        userId: req.user?.id,
      });

      const result = await ipReputationService.batchCheckIPs(ips);

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "batch_ip_reputation_checked",
        resourceType: "ip_reputation",
        resourceId: "batch_check",
        details: {
          ipCount: ips.length,
          processed: result.processed,
          malicious: result.malicious,
          errors: result.errors,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, result, "Batch IP reputation check completed");
    } catch (error: unknown) {
      logger.error("Failed to perform batch IP reputation check", {
        error: error instanceof Error ? error?.message : String(error),
        ipCount: req.body?.ips?.length,
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to perform batch IP reputation check", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/threat-intelligence/feeds
 * @desc    Get real-time threat feeds
 * @access  Private (security role)
 */
router.get(
  "/feeds",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  [
    query("threatLevel").optional().isIn(["low", "medium", "high", "critical"]).withMessage("Invalid threat level"),
    query("types").optional().isArray().withMessage("Types must be an array"),
    query("sources").optional().isArray().withMessage("Sources must be an array"),
    query("since").optional().isISO8601().withMessage("Since must be a valid ISO date"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const filters: any = {};
      
      if (req.query.threatLevel) filters.threatLevel = req.query.threatLevel;
      if (req.query.types) filters.types = req.query.types;
      if (req.query.sources) filters.sources = req.query.sources;
      if (req.query.since) filters.since = new Date(req.query.since as string);

      logger.info("Fetching real-time threat feeds", {
        filters,
        userId: req.user?.id,
      });

      const feeds = await threatIntelligenceService.getRealTimeThreatFeeds(filters);

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_feeds_accessed",
        resourceType: "threat_intelligence",
        resourceId: "threat_feeds",
        details: {
          feedCount: feeds.length,
          filters,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, {
        feeds,
        count: feeds.length,
        filters,
        timestamp: new Date(),
      }, "Threat feeds retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch threat feeds", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch threat feeds", statusCode: 500 });
    }
  }
);

/**
 * @route   POST /api/v1/threat-intelligence/report-malicious
 * @desc    Report malicious IP or indicator
 * @access  Private (security role)
 */
router.post(
  "/report-malicious",
  authenticateToken,
  requirePermission("security:write"),
  rateLimitMiddleware({ windowMs: 300000, max: 20 }), // 20 requests per 5 minutes
  [
    body("target").notEmpty().withMessage("Target indicator is required"),
    body("type").isIn(["ip", "domain", "file", "url", "email"]).withMessage("Invalid indicator type"),
    body("categories").isArray({ min: 1 }).withMessage("Categories array required"),
    body("comment").isLength({ min: 10, max: 500 }).withMessage("Comment must be 10-500 characters"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const { target, type, categories, comment } = req.body;

      logger.info("Reporting malicious indicator", {
        target,
        type,
        categories,
        userId: req.user?.id,
      });

      let result;
      
      if (type === "ip") {
        result = await ipReputationService.reportMaliciousIP(target, categories, comment);
      } else {
        // For other types, report to MISP
        const mispResult = await mispIntegrationService.submitIOC(
          target,
          type,
          "Network activity",
          comment
        );
        result = {
          success: mispResult.success,
          sources: mispResult.success ? ["MISP"] : [],
        };
      }

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "malicious_indicator_reported",
        resourceType: "threat_intelligence",
        resourceId: target,
        details: {
          type,
          categories,
          success: result.success,
          sources: result.sources,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, result, "Malicious indicator reported");
    } catch (error: unknown) {
      logger.error("Failed to report malicious indicator", {
        error: error instanceof Error ? error?.message : String(error),
        target: req.body.target,
        type: req.body.type,
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to report malicious indicator", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/threat-intelligence/metrics
 * @desc    Get threat intelligence metrics
 * @access  Private (security role)
 */
router.get(
  "/metrics",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  async (req: Request, res: Response) => {
    try {
      logger.info("Fetching threat intelligence metrics", {
        userId: req.user?.id,
      });

      const [
        threatMetrics,
        ipMetrics,
        vtSummary,
        abuseSummary,
        mispSummary,
      ] = await Promise.allSettled([
        threatIntelligenceService.getMetrics(),
        ipReputationService.getMetrics(),
        virusTotalService.getThreatSummary(),
        abuseIPDBService.getThreatSummary(),
        mispIntegrationService.getThreatSummary(),
      ]);

      const metrics = {
        overall: {
          threatIntelligence: threatMetrics.status === "fulfilled" ? threatMetrics.value : null,
          ipReputation: ipMetrics.status === "fulfilled" ? ipMetrics.value : null,
        },
        sources: {
          virustotal: vtSummary.status === "fulfilled" ? vtSummary.value : null,
          abuseipdb: abuseSummary.status === "fulfilled" ? abuseSummary.value : null,
          misp: mispSummary.status === "fulfilled" ? mispSummary.value : null,
        },
        timestamp: new Date(),
      };

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_intelligence_metrics_accessed",
        resourceType: "threat_intelligence",
        resourceId: "metrics",
        details: {
          metricsAccessed: Object.keys(metrics.overall).length + Object.keys(metrics.sources).length,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, metrics, "Threat intelligence metrics retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch threat intelligence metrics", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch threat intelligence metrics", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/threat-intelligence/dashboard
 * @desc    Get threat intelligence dashboard data for Frontend
 * @access  Private (security role)
 */
router.get(
  "/dashboard",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  async (req: Request, res: Response) => {
    try {
      logger.info("Fetching threat intelligence dashboard data", {
        userId: req.user?.id,
      });

      // Get recent threat feeds
      const recentFeeds = await threatIntelligenceService.getRealTimeThreatFeeds({
        since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      // Get service status
      const serviceStatus = await threatIntelligenceService.getServiceStatus();

      // Get metrics
      const metrics = await threatIntelligenceService.getMetrics();

      // Calculate dashboard statistics
      const dashboardData = {
        overview: {
          totalQueries: metrics.totalQueries,
          threatDetections: metrics.threatDetections,
          activeSources: Object.values(serviceStatus.sources).filter((s: any) => s.status === "healthy").length,
          recentFeedsCount: recentFeeds.length,
        },
        threatLevel: {
          critical: recentFeeds.filter(f => f.threatScore >= 90).length,
          high: recentFeeds.filter(f => f.threatScore >= 70 && f.threatScore < 90).length,
          medium: recentFeeds.filter(f => f.threatScore >= 40 && f.threatScore < 70).length,
          low: recentFeeds.filter(f => f.threatScore < 40).length,
        },
        sources: serviceStatus.sources,
        recentActivity: recentFeeds.slice(0, 10), // Last 10 threats
        performance: {
          averageResponseTime: metrics.performance?.averageResponseTime || 0,
          cacheHitRate: metrics.performance?.cacheHitRate || 0,
          errorRate: metrics.performance?.errorRate || 0,
        },
        timestamp: new Date(),
      };

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_intelligence_dashboard_accessed",
        resourceType: "threat_intelligence",
        resourceId: "dashboard",
        details: {
          totalQueries: dashboardData.overview.totalQueries,
          threatDetections: dashboardData.overview.threatDetections,
          activeSources: dashboardData.overview.activeSources,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, dashboardData, "Threat intelligence dashboard data retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch threat intelligence dashboard data", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch dashboard data", statusCode: 500 });
    }
  }
);

export default router;