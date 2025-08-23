/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SECURITY DASHBOARD API
 * ============================================================================
 *
 * Comprehensive security dashboard API providing real-time security metrics,
 * threat intelligence feeds, and security monitoring data for coordinated
 * agent integration.
 *
 * Features:
 * - Real-time threat intelligence dashboard data
 * - Security metrics for Frontend dashboards
 * - SIEM integration data for DevOps agents
 * - ML training data for Innovation-Architect
 * - Backend security service coordination
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import { Router, type Request, type Response } from "express";
import { query, validationResult } from "express-validator";
import { authenticateToken, requirePermission } from "@/middleware/auth";
import { rateLimitMiddleware } from "@/middleware/rateLimiting";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
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
 * @route   GET /api/v1/security-dashboard/overview
 * @desc    Get comprehensive security dashboard overview
 * @access  Private (security role)
 */
router.get(
  "/overview",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 120 }), // 120 requests per minute
  async (req: Request, res: Response) => {
    try {
      logger.info("Fetching security dashboard overview", {
        userId: req.user?.id,
      });

      // Get current timestamp for consistency
      const timestamp = new Date();
      const last24h = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(timestamp.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch all security data in parallel
      const [
        serviceStatus,
        threatMetrics,
        ipMetrics,
        recentThreats,
        securityIncidents,
        vtSummary,
        abuseSummary,
        mispSummary,
      ] = await Promise.allSettled([
        threatIntelligenceService.getServiceStatus(),
        threatIntelligenceService.getMetrics(),
        ipReputationService.getMetrics(),
        threatIntelligenceService.getRealTimeThreatFeeds({ since: last24h }),
        getSecurityIncidents(last24h),
        virusTotalService.getThreatSummary(),
        abuseIPDBService.getThreatSummary(),
        mispIntegrationService.getThreatSummary(),
      ]);

      // Build overview data
      const overview = {
        timestamp,
        status: {
          overall: serviceStatus.status === "fulfilled" ? serviceStatus.value.status : "unhealthy",
          threatIntelligence: serviceStatus.status === "fulfilled" ? serviceStatus.value.status : "unhealthy",
          sources: {
            virustotal: vtSummary.status === "fulfilled" ? vtSummary.value.status : "unhealthy",
            abuseipdb: abuseSummary.status === "fulfilled" ? abuseSummary.value.status : "unhealthy",
            misp: mispSummary.status === "fulfilled" ? mispSummary.value.status : "unhealthy",
          },
        },
        metrics: {
          threat: {
            totalQueries: threatMetrics.status === "fulfilled" ? threatMetrics.value.totalQueries : 0,
            threatDetections: threatMetrics.status === "fulfilled" ? threatMetrics.value.threatDetections : 0,
            falsePositives: threatMetrics.status === "fulfilled" ? threatMetrics.value.falsePositives : 0,
            averageResponseTime: threatMetrics.status === "fulfilled" ? threatMetrics.value.performance?.averageResponseTime : 0,
          },
          ip: {
            totalQueries: ipMetrics.status === "fulfilled" ? ipMetrics.value.totalQueries : 0,
            maliciousDetected: ipMetrics.status === "fulfilled" ? ipMetrics.value.maliciousDetected : 0,
            cacheHitRate: ipMetrics.status === "fulfilled" ? ipMetrics.value.cacheHitRate : 0,
          },
        },
        threats: {
          last24h: {
            total: recentThreats.status === "fulfilled" ? recentThreats.value.length : 0,
            critical: recentThreats.status === "fulfilled" ? recentThreats.value.filter((t: any) => t.threatScore >= 90).length : 0,
            high: recentThreats.status === "fulfilled" ? recentThreats.value.filter((t: any) => t.threatScore >= 70 && t.threatScore < 90).length : 0,
            medium: recentThreats.status === "fulfilled" ? recentThreats.value.filter((t: any) => t.threatScore >= 40 && t.threatScore < 70).length : 0,
            low: recentThreats.status === "fulfilled" ? recentThreats.value.filter((t: any) => t.threatScore < 40).length : 0,
          },
          topThreats: recentThreats.status === "fulfilled" ? 
            recentThreats.value
              .sort((a: any, b: any) => b.threatScore - a.threatScore)
              .slice(0, 10) : [],
        },
        incidents: {
          total: securityIncidents.status === "fulfilled" ? securityIncidents.value.total : 0,
          blocked: securityIncidents.status === "fulfilled" ? securityIncidents.value.blocked : 0,
          investigated: securityIncidents.status === "fulfilled" ? securityIncidents.value.investigated : 0,
          recent: securityIncidents.status === "fulfilled" ? securityIncidents.value.recent : [],
        },
        sources: {
          virustotal: vtSummary.status === "fulfilled" ? vtSummary.value : { status: "unhealthy" },
          abuseipdb: abuseSummary.status === "fulfilled" ? abuseSummary.value : { status: "unhealthy" },
          misp: mispSummary.status === "fulfilled" ? mispSummary.value : { status: "unhealthy" },
        },
      };

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "security_dashboard_overview_accessed",
        resourceType: "security_dashboard",
        resourceId: "overview",
        details: {
          overallStatus: overview.status.overall,
          totalThreats: overview.threats.last24h.total,
          criticalThreats: overview.threats.last24h.critical,
          totalIncidents: overview.incidents.total,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, overview, "Security dashboard overview retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch security dashboard overview", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch security dashboard overview", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/security-dashboard/threat-trends
 * @desc    Get threat trends for analytics and ML training
 * @access  Private (security role)
 */
router.get(
  "/threat-trends",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  [
    query("period").optional().isIn(["24h", "7d", "30d"]).withMessage("Invalid period"),
    query("granularity").optional().isIn(["hour", "day"]).withMessage("Invalid granularity"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const period = req.query.period as string || "7d";
      const granularity = req.query.granularity as string || "day";

      logger.info("Fetching threat trends", {
        period,
        granularity,
        userId: req.user?.id,
      });

      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (period) {
        case "24h":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Fetch historical threat data
      const threatFeeds = await threatIntelligenceService.getRealTimeThreatFeeds({ since: startTime });
      
      // Group data by time buckets
      const trends = groupThreatsByTime(threatFeeds, startTime, now, granularity);

      // Calculate statistics for ML training
      const statistics = calculateThreatStatistics(threatFeeds);

      const response = {
        period,
        granularity,
        startTime,
        endTime: now,
        trends,
        statistics,
        mlTrainingData: {
          features: extractMLFeatures(threatFeeds),
          labels: threatFeeds.map((t: any) => ({
            target: t.target,
            threatScore: t.threatScore,
            malicious: t.threatScore >= 70,
            timestamp: t.timestamp,
          })),
        },
        summary: {
          totalThreats: threatFeeds.length,
          averageThreatScore: threatFeeds.length > 0 ? 
            threatFeeds.reduce((sum: number, t: any) => sum + t.threatScore, 0) / threatFeeds.length : 0,
          peakHour: findPeakThreatHour(trends),
          topSources: getTopThreatSources(threatFeeds),
        },
      };

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "threat_trends_accessed",
        resourceType: "security_dashboard",
        resourceId: "threat_trends",
        details: {
          period,
          granularity,
          totalThreats: response.summary.totalThreats,
          averageThreatScore: response.summary.averageThreatScore,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, response, "Threat trends retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch threat trends", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch threat trends", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/security-dashboard/siem-data
 * @desc    Get SIEM integration data for DevOps agents
 * @access  Private (security role)
 */
router.get(
  "/siem-data",
  authenticateToken,
  requirePermission("security:admin"),
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 requests per minute
  [
    query("format").optional().isIn(["json", "cef", "syslog"]).withMessage("Invalid format"),
    query("since").optional().isISO8601().withMessage("Since must be a valid ISO date"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHelper.validationError(res, errors.array());
    }

    try {
      const format = req.query.format as string || "json";
      const since = req.query.since ? new Date(req.query.since as string) : 
        new Date(Date.now() - 60 * 60 * 1000); // Last hour

      logger.info("Fetching SIEM integration data", {
        format,
        since,
        userId: req.user?.id,
      });

      // Get security events and threats
      const [threatFeeds, securityIncidents] = await Promise.allSettled([
        threatIntelligenceService.getRealTimeThreatFeeds({ since }),
        getSecurityIncidents(since),
      ]);

      // Format data for SIEM consumption
      let siemData: any[];

      switch (format) {
        case "cef":
          siemData = formatAsCEF(threatFeeds, securityIncidents);
          break;
        case "syslog":
          siemData = formatAsSyslog(threatFeeds, securityIncidents);
          break;
        default:
          siemData = formatAsJSON(threatFeeds, securityIncidents);
      }

      const response = {
        format,
        since,
        timestamp: new Date(),
        eventCount: siemData.length,
        data: siemData,
      };

      await AuditLog.create({
        userId: req.user!.id,
        customerId: null,
        action: "siem_data_accessed",
        resourceType: "security_dashboard",
        resourceId: "siem_data",
        details: {
          format,
          eventCount: response.eventCount,
          since,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return ResponseHelper.success(res, response, "SIEM data retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch SIEM data", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch SIEM data", statusCode: 500 });
    }
  }
);

/**
 * @route   GET /api/v1/security-dashboard/realtime-feed
 * @desc    Get real-time threat intelligence feed (WebSocket data)
 * @access  Private (security role)
 */
router.get(
  "/realtime-feed",
  authenticateToken,
  requirePermission("security:read"),
  rateLimitMiddleware({ windowMs: 60000, max: 60 }), // 60 requests per minute
  async (req: Request, res: Response) => {
    try {
      logger.info("Fetching real-time threat feed", {
        userId: req.user?.id,
      });

      // Get latest threats (last 5 minutes)
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const realtimeFeeds = await threatIntelligenceService.getRealTimeThreatFeeds({ since });

      // Get current system status
      const systemStatus = await threatIntelligenceService.getServiceStatus();

      // Format for real-time consumption
      const feedData = {
        timestamp: new Date(),
        status: systemStatus.status,
        threats: realtimeFeeds.map((threat: any) => ({
          id: `${threat.source}-${threat.target}-${threat.timestamp}`,
          target: threat.target,
          type: threat.targetType,
          threatScore: threat.threatScore,
          source: threat.source,
          timestamp: threat.timestamp,
          severity: getThreatSeverity(threat.threatScore),
        })),
        summary: {
          total: realtimeFeeds.length,
          critical: realtimeFeeds.filter((t: any) => t.threatScore >= 90).length,
          high: realtimeFeeds.filter((t: any) => t.threatScore >= 70 && t.threatScore < 90).length,
          medium: realtimeFeeds.filter((t: any) => t.threatScore >= 40 && t.threatScore < 70).length,
          low: realtimeFeeds.filter((t: any) => t.threatScore < 40).length,
        },
        sources: {
          virustotal: realtimeFeeds.filter((t: any) => t.source === "virustotal").length,
          abuseipdb: realtimeFeeds.filter((t: any) => t.source === "abuseipdb").length,
          misp: realtimeFeeds.filter((t: any) => t.source === "misp").length,
        },
      };

      return ResponseHelper.success(res, feedData, "Real-time threat feed retrieved");
    } catch (error: unknown) {
      logger.error("Failed to fetch real-time threat feed", {
        error: error instanceof Error ? error?.message : String(error),
        userId: req.user?.id,
      });

      return ResponseHelper.error(res, req, { message: "Failed to fetch real-time threat feed", statusCode: 500 });
    }
  }
);

/**
 * Helper functions
 */

async function getSecurityIncidents(since: Date) {
  try {
    // Get security incidents from audit logs
    const incidents = await AuditLog.findAll({
      where: {
        action: {
          $in: [
            "malicious_ip_blocked",
            "threat_intelligence_check",
            "security_violation",
            "suspicious_activity_detected",
          ],
        },
        createdAt: {
          $gte: since,
        },
      },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    const blocked = incidents.filter(i => i.action === "malicious_ip_blocked").length;
    const investigated = incidents.filter(i => i.action === "threat_intelligence_check").length;

    return {
      total: incidents.length,
      blocked,
      investigated,
      recent: incidents.slice(0, 10).map(incident => ({
        id: incident.id,
        action: incident.action,
        resourceId: incident.resourceId,
        details: incident.details,
        timestamp: incident.createdAt,
        severity: getSeverityFromAction(incident.action),
      })),
    };
  } catch (error: unknown) {
    logger.error("Failed to fetch security incidents", { error: error instanceof Error ? error?.message : String(error) });
    return { total: 0, blocked: 0, investigated: 0, recent: [] };
  }
}

function groupThreatsByTime(threats: any[], startTime: Date, endTime: Date, granularity: string) {
  const buckets: Record<string, any> = {};
  const bucketSize = granularity === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  // Initialize buckets
  for (let time = startTime.getTime(); time <= endTime.getTime(); time += bucketSize) {
    const key = new Date(time).toISOString();
    buckets[key] = {
      timestamp: new Date(time),
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      sources: {},
    };
  }

  // Fill buckets with threat data
  threats.forEach((threat: any) => {
    const threatTime = new Date(threat.timestamp);
    const bucketTime = Math.floor(threatTime.getTime() / bucketSize) * bucketSize;
    const key = new Date(bucketTime).toISOString();

    if (buckets[key]) {
      buckets[key].total++;
      
      if (threat.threatScore >= 90) buckets[key].critical++;
      else if (threat.threatScore >= 70) buckets[key].high++;
      else if (threat.threatScore >= 40) buckets[key].medium++;
      else buckets[key].low++;

      if (!buckets[key].sources[threat.source]) {
        buckets[key].sources[threat.source] = 0;
      }
      buckets[key].sources[threat.source]++;
    }
  });

  return Object.values(buckets);
}

function calculateThreatStatistics(threats: any[]) {
  if (threats.length === 0) {
    return {
      mean: 0,
      median: 0,
      standardDeviation: 0,
      distribution: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const scores = threats.map((t: any) => t.threatScore).sort((a, b) => a - b);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const median = scores[Math.floor(scores.length / 2)];
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    mean,
    median,
    standardDeviation,
    distribution: {
      critical: threats.filter((t: any) => t.threatScore >= 90).length,
      high: threats.filter((t: any) => t.threatScore >= 70 && t.threatScore < 90).length,
      medium: threats.filter((t: any) => t.threatScore >= 40 && t.threatScore < 70).length,
      low: threats.filter((t: any) => t.threatScore < 40).length,
    },
  };
}

function extractMLFeatures(threats: any[]) {
  return threats.map((threat: any) => ({
    threatScore: threat.threatScore,
    source: threat.source,
    targetType: threat.targetType,
    timestamp: threat.timestamp,
    hour: new Date(threat.timestamp).getHours(),
    dayOfWeek: new Date(threat.timestamp).getDay(),
  }));
}

function findPeakThreatHour(trends: any[]) {
  const hourlyCount: Record<number, number> = {};
  
  trends.forEach((trend: any) => {
    const hour = new Date(trend.timestamp).getHours();
    hourlyCount[hour] = (hourlyCount[hour] || 0) + trend.total;
  });

  let peakHour = 0;
  let maxCount = 0;
  
  Object.entries(hourlyCount).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = parseInt(hour);
    }
  });

  return { hour: peakHour, count: maxCount };
}

function getTopThreatSources(threats: any[]) {
  const sourceCounts: Record<string, number> = {};
  
  threats.forEach((threat: any) => {
    sourceCounts[threat.source] = (sourceCounts[threat.source] || 0) + 1;
  });

  return Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));
}

function formatAsJSON(threatFeeds: any, securityIncidents: any) {
  const threats = threatFeeds.status === "fulfilled" ? threatFeeds.value : [];
  const incidents = securityIncidents.status === "fulfilled" ? securityIncidents.value.recent : [];
  
  return [...threats, ...incidents].map((item: any) => ({
    timestamp: item.timestamp,
    type: item?.type || "security_incident",
    severity: getThreatSeverity(item?.threatScore || 50),
    source: item?.source || "system",
    target: item?.target || item.resourceId,
    details: item?.metadata || item.details,
  }));
}

function formatAsCEF(threatFeeds: any, securityIncidents: any) {
  // Common Event Format for SIEM integration
  const events = formatAsJSON(threatFeeds, securityIncidents);
  
  return events.map((event: any) => ({
    cef: `CEF:0|WasteManagement|ThreatIntel|1.0|${event.type}|${event.type}|${event.severity}|src=${event.target} shost=${event.source} rt=${event.timestamp}`,
    timestamp: event.timestamp,
    raw: event,
  }));
}

function formatAsSyslog(threatFeeds: any, securityIncidents: any) {
  // Syslog format for SIEM integration
  const events = formatAsJSON(threatFeeds, securityIncidents);
  
  return events.map((event: any) => ({
    syslog: `<134>1 ${event.timestamp} waste-mgmt-api threat-intel - - [source="${event.source}" target="${event.target}" severity="${event.severity}"] ${event.type}`,
    timestamp: event.timestamp,
    raw: event,
  }));
}

function calculateSeverityBreakdown(data: any[]) {
  return {
    critical: data.filter((d: any) => d.severity === "critical").length,
    high: data.filter((d: any) => d.severity === "high").length,
    medium: data.filter((d: any) => d.severity === "medium").length,
    low: data.filter((d: any) => d.severity === "low").length,
  };
}

function getThreatSeverity(score: number): string {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function getSeverityFromAction(action: string): string {
  const actionSeverity: Record<string, string> = {
    "malicious_ip_blocked": "high",
    "threat_intelligence_check": "medium",
    "security_violation": "high",
    "suspicious_activity_detected": "medium",
  };
  
  return actionSeverity[action] || "low";
}

export default router;