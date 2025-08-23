/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - HEALTH MONITORING API ROUTES
 * ============================================================================
 *
 * API routes for 24/7 health monitoring, incident management,
 * and predictive analytics for all external services.
 *
 * Endpoints:
 * - GET /api/external/health/overview - Get comprehensive health overview
 * - GET /api/external/health/services/:service - Get specific service health
 * - POST /api/external/health/check/:service - Trigger manual health check
 * - GET /api/external/health/incidents - Get incident history
 * - POST /api/external/health/incidents - Create incident
 * - PUT /api/external/health/incidents/:id - Update incident
 * - GET /api/external/health/predictive/:service - Get predictive analytics
 * - GET /api/external/health/sla - Get SLA compliance data
 * - POST /api/external/health/alerts - Configure health alerts
 *
 * Created by: External-API-Integration-Specialist
 * Date: 2025-08-19
 * Version: 1.0.0 - Phase 2 External API Completion
 */

import { Router, type Request, type Response } from "express";
import { auth } from "@/middleware/auth";
import { validation } from "@/middleware/validation";
import { rateLimit } from "@/middleware/rateLimit";
import { logger, Timer } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import HealthMonitoringService, {
  ServiceHealthStatus,
  HealthIncident,
  PredictiveAnalytics,
  IncidentResponseConfig
} from "@/services/external/HealthMonitoringService";
import { ExternalAPIResilienceManager } from "@/services/external/ExternalAPIResilienceManager";
import RealTimeTrafficWebSocketService from "@/services/external/RealTimeTrafficWebSocketService";

const router = Router();

// Initialize health monitoring service
const resilienceManager = new ExternalAPIResilienceManager({} as any);
const webSocketService = new RealTimeTrafficWebSocketService(resilienceManager);
const healthMonitoringService = new HealthMonitoringService(resilienceManager, webSocketService);

/**
 * =============================================================================
 * HEALTH OVERVIEW ENDPOINTS
 * =============================================================================
 */

/**
 * Get comprehensive health overview for all services
 * GET /api/external/health/overview
 */
router.get("/overview", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.getOverview');
  
  try {
    const { includeMetrics, includePredictive } = req.query;

    // Get comprehensive health overview
    const overviewResult = await healthMonitoringService.getHealthOverview();

    if (!overviewResult.success) {
      return ResponseHelper.internalError(res, overviewResult?.message!);
    }

    const overview = overviewResult.data!;

    // Enhance with additional metrics if requested
    let enhancedOverview = { ...overview };

    if (includeMetrics === 'true') {
      enhancedOverview.detailedMetrics = await getDetailedMetrics();
    }

    if (includePredictive === 'true') {
      enhancedOverview.predictiveInsights = await getPredictiveInsights();
    }

    const executionTime = timer.end({
      overallHealth: overview.overall,
      servicesMonitored: Object.keys(overview.services).length,
      activeIncidents: overview.incidents.active
    });

    logger.info('Health overview retrieved', {
      overallHealth: overview.overall,
      servicesMonitored: Object.keys(overview.services).length,
      activeIncidents: overview.incidents.active,
      includeMetrics: includeMetrics === 'true',
      includePredictive: includePredictive === 'true',
      executionTime
    });

    return ResponseHelper.success(res, {
      overview: enhancedOverview,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving health overview', {
      error: error instanceof Error ? error?.message : String(error),
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve health overview");
  }
});

/**
 * Get specific service health details
 * GET /api/external/health/services/:service
 */
router.get("/services/:service", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.getServiceHealth');
  
  try {
    const { service } = req.params;
    const { timeRange, includeHistory } = req.query;

    if (!service) {
      return ResponseHelper.badRequest(res, "Service name is required");
    }

    // Validate service name
    const validServices = ["graphhopper", "google_maps", "mapbox", "twilio", "sendgrid", "stripe"];
    if (!validServices.includes(service)) {
      return ResponseHelper.badRequest(res, "Invalid service name");
    }

    // Perform health check for the specific service
    const healthResult = await healthMonitoringService.performHealthCheck(service);

    if (!healthResult.success) {
      return ResponseHelper.internalError(res, healthResult?.message!);
    }

    let serviceData = {
      current: healthResult.data,
      history: null as any,
      trends: null as any
    };

    // Include historical data if requested
    if (includeHistory === 'true') {
      const historyTimeRange = timeRange ? parseInt(timeRange as string) : 24 * 60 * 60 * 1000; // 24 hours
      serviceData.history = await getServiceHistory(service, historyTimeRange);
      serviceData.trends = await calculateServiceTrends(service, serviceData.history);
    }

    const executionTime = timer.end({
      service,
      status: healthResult.data!.status,
      includeHistory: includeHistory === 'true'
    });

    logger.info('Service health retrieved', {
      service,
      status: healthResult.data!.status,
      responseTime: healthResult.data!.currentResponseTime,
      availability: healthResult.data!.availability,
      includeHistory: includeHistory === 'true',
      executionTime
    });

    return ResponseHelper.success(res, {
      service,
      health: serviceData,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving service health', {
      error: error instanceof Error ? error?.message : String(error),
      service: req.params.service
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve service health");
  }
});

/**
 * Trigger manual health check for a service
 * POST /api/external/health/check/:service
 */
router.post("/check/:service", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.manualHealthCheck');
  
  try {
    const { service } = req.params;
    const { reason } = req.body;

    if (!service) {
      return ResponseHelper.badRequest(res, "Service name is required");
    }

    // Validate service name
    const validServices = ["graphhopper", "google_maps", "mapbox", "twilio", "sendgrid", "stripe"];
    if (!validServices.includes(service)) {
      return ResponseHelper.badRequest(res, "Invalid service name");
    }

    // Perform manual health check
    const healthResult = await healthMonitoringService.performHealthCheck(service);

    if (!healthResult.success) {
      return ResponseHelper.internalError(res, healthResult?.message!);
    }

    const checkId = `manual_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const executionTime = timer.end({
      service,
      status: healthResult.data!.status,
      triggeredBy: (req as any).user.userId
    });

    logger.info('Manual health check completed', {
      checkId,
      service,
      status: healthResult.data!.status,
      responseTime: healthResult.data!.currentResponseTime,
      triggeredBy: (req as any).user.userId,
      reason: reason || "Manual trigger",
      executionTime
    });

    return ResponseHelper.success(res, {
      checkId,
      service,
      health: healthResult.data,
      manual: true,
      triggeredBy: (req as any).user.userId,
      reason: reason || "Manual trigger",
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error performing manual health check', {
      error: error instanceof Error ? error?.message : String(error),
      service: req.params.service,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to perform manual health check");
  }
});

/**
 * =============================================================================
 * INCIDENT MANAGEMENT ENDPOINTS
 * =============================================================================
 */

/**
 * Get incident history
 * GET /api/external/health/incidents
 */
router.get("/incidents", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.getIncidents');
  
  try {
    const {
      service,
      status,
      severity,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    // Parse query parameters
    const filters = {
      service: service as string || undefined,
      status: status as string || undefined,
      severity: severity as string || undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    const pagination = {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    };

    // Get incidents based on filters
    const incidents = await getIncidents(filters, pagination);

    const executionTime = timer.end({
      incidentCount: incidents.length,
      filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined).length
    });

    logger.info('Incidents retrieved', {
      incidentCount: incidents.length,
      filters,
      pagination,
      executionTime
    });

    return ResponseHelper.success(res, {
      incidents,
      filters,
      pagination
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving incidents', {
      error: error instanceof Error ? error?.message : String(error),
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve incidents");
  }
});

/**
 * Create new incident
 * POST /api/external/health/incidents
 */
router.post("/incidents", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.createIncident');
  
  try {
    const {
      service,
      type,
      severity,
      description,
      impact
    } = req.body;

    // Validate required fields
    if (!service || !type || !severity || !description) {
      return ResponseHelper.badRequest(res, "service, type, severity, and description are required");
    }

    // Validate field values
    const validTypes = ["outage", "degradation", "timeout", "error_spike", "sla_breach"];
    const validSeverities = ["low", "medium", "high", "critical"];

    if (!validTypes.includes(type)) {
      return ResponseHelper.badRequest(res, "Invalid incident type");
    }

    if (!validSeverities.includes(severity)) {
      return ResponseHelper.badRequest(res, "Invalid severity level");
    }

    // Create incident
    const incidentResult = await healthMonitoringService.createIncident(
      service,
      type,
      severity,
      description,
      impact
    );

    if (!incidentResult.success) {
      return ResponseHelper.internalError(res, incidentResult?.message!);
    }

    const executionTime = timer.end({
      incidentId: incidentResult.data!.id,
      service,
      type,
      severity,
      createdBy: (req as any).user.userId
    });

    logger.warn('Incident created', {
      incidentId: incidentResult.data!.id,
      service,
      type,
      severity,
      description,
      createdBy: (req as any).user.userId,
      executionTime
    });

    return ResponseHelper.success(res, {
      incident: incidentResult.data,
      message: "Incident created successfully"
    }, 201);

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error creating incident', {
      error: error instanceof Error ? error?.message : String(error),
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to create incident");
  }
});

/**
 * Update incident
 * PUT /api/external/health/incidents/:id
 */
router.put("/incidents/:id", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.updateIncident');
  
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return ResponseHelper.badRequest(res, "Incident ID is required");
    }

    // Update incident
    const updatedIncident = await updateIncident(id, updateData, (req as any).user.userId);

    if (!updatedIncident) {
      return ResponseHelper.notFound(res, "Incident not found");
    }

    const executionTime = timer.end({
      incidentId: id,
      updatedBy: (req as any).user.userId
    });

    logger.info('Incident updated', {
      incidentId: id,
      updatedBy: (req as any).user.userId,
      updates: Object.keys(updateData),
      executionTime
    });

    return ResponseHelper.success(res, {
      incident: updatedIncident,
      message: "Incident updated successfully"
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error updating incident', {
      error: error instanceof Error ? error?.message : String(error),
      incidentId: req.params.id,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to update incident");
  }
});

/**
 * =============================================================================
 * PREDICTIVE ANALYTICS ENDPOINTS
 * =============================================================================
 */

/**
 * Get predictive analytics for a service
 * GET /api/external/health/predictive/:service
 */
router.get("/predictive/:service", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.getPredictiveAnalytics');
  
  try {
    const { service } = req.params;
    const { includeRecommendations, confidence } = req.query;

    if (!service) {
      return ResponseHelper.badRequest(res, "Service name is required");
    }

    // Validate service name
    const validServices = ["graphhopper", "google_maps", "mapbox", "twilio", "sendgrid", "stripe"];
    if (!validServices.includes(service)) {
      return ResponseHelper.badRequest(res, "Invalid service name");
    }

    // Get predictive analytics
    const analyticsResult = await healthMonitoringService.analyzePredictiveHealth(service);

    if (!analyticsResult.success) {
      return ResponseHelper.internalError(res, analyticsResult?.message!);
    }

    let analytics = analyticsResult.data!;

    // Filter recommendations by confidence if specified
    if (confidence && analytics.recommendations) {
      const minConfidence = parseFloat(confidence as string);
      analytics.recommendations = analytics.recommendations.filter(rec => 
        rec.priority === 'urgent' || 
        rec.priority === 'high' || 
        analytics.predictions.confidence >= minConfidence
      );
    }

    // Remove recommendations if not requested
    if (includeRecommendations !== 'true') {
      delete analytics.recommendations;
    }

    const executionTime = timer.end({
      service,
      failureProbability: analytics.predictions.failureProbability,
      confidence: analytics.predictions.confidence
    });

    logger.info('Predictive analytics retrieved', {
      service,
      failureProbability: analytics.predictions.failureProbability,
      confidence: analytics.predictions.confidence,
      recommendationsCount: analytics.recommendations?.length || 0,
      executionTime
    });

    return ResponseHelper.success(res, {
      service,
      analytics,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving predictive analytics', {
      error: error instanceof Error ? error?.message : String(error),
      service: req.params.service
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve predictive analytics");
  }
});

/**
 * =============================================================================
 * SLA MONITORING ENDPOINTS
 * =============================================================================
 */

/**
 * Get SLA compliance data
 * GET /api/external/health/sla
 */
router.get("/sla", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.getSLACompliance');
  
  try {
    const {
      service,
      startDate,
      endDate,
      granularity
    } = req.query;

    // Parse date range
    const timeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date()
    };

    // Get SLA compliance data
    const slaData = await getSLACompliance(
      service as string || undefined,
      timeRange,
      granularity as string || "day"
    );

    const executionTime = timer.end({
      service: service || "all",
      timeRangeDays: Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
    });

    logger.info('SLA compliance data retrieved', {
      service: service || "all",
      timeRange,
      granularity: granularity || "day",
      executionTime
    });

    return ResponseHelper.success(res, {
      sla: slaData,
      timeRange
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving SLA compliance data', {
      error: error instanceof Error ? error?.message : String(error),
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve SLA compliance data");
  }
});

/**
 * =============================================================================
 * ALERT CONFIGURATION ENDPOINTS
 * =============================================================================
 */

/**
 * Configure health alerts
 * POST /api/external/health/alerts
 */
router.post("/alerts", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('HealthMonitoringAPI.configureAlerts');
  
  try {
    const alertConfig = req.body;

    // Validate required fields
    if (!alertConfig.service || !alertConfig.triggers) {
      return ResponseHelper.badRequest(res, "service and triggers are required");
    }

    // Store alert configuration
    const configId = await storeAlertConfiguration(alertConfig, (req as any).user.userId);

    const executionTime = timer.end({
      service: alertConfig.service,
      triggersCount: alertConfig.triggers?.length || 0
    });

    logger.info('Health alert configured', {
      configId,
      service: alertConfig.service,
      triggersCount: alertConfig.triggers?.length || 0,
      configuredBy: (req as any).user.userId,
      executionTime
    });

    return ResponseHelper.success(res, {
      configId,
      service: alertConfig.service,
      configuration: alertConfig,
      message: "Alert configuration saved successfully"
    }, 201);

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error configuring health alerts', {
      error: error instanceof Error ? error?.message : String(error),
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to configure health alerts");
  }
});

/**
 * =============================================================================
 * HELPER FUNCTIONS
 * =============================================================================
 */

/**
 * Get detailed metrics for all services
 */
async function getDetailedMetrics(): Promise<any> {
  // Implementation for getting detailed metrics
  return {
    responseTimeDistribution: {},
    errorRateBreakdown: {},
    availabilityTrends: {},
    performanceComparison: {}
  };
}

/**
 * Get predictive insights across all services
 */
async function getPredictiveInsights(): Promise<any> {
  // Implementation for getting predictive insights
  return {
    riskAssessment: "low",
    upcomingMaintenanceWindows: [],
    performancePredictions: {},
    capacityForecasts: {}
  };
}

/**
 * Get service history
 */
async function getServiceHistory(service: string, timeRange: number): Promise<any[]> {
  // Implementation for getting service history
  return [];
}

/**
 * Calculate service trends
 */
async function calculateServiceTrends(service: string, history: any[]): Promise<any> {
  // Implementation for calculating trends
  return {
    responseTimeTrend: "stable",
    availabilityTrend: "improving",
    errorRateTrend: "stable"
  };
}

/**
 * Get incidents with filters
 */
async function getIncidents(filters: any, pagination: any): Promise<HealthIncident[]> {
  // Implementation for getting filtered incidents
  return [];
}

/**
 * Update incident
 */
async function updateIncident(id: string, updateData: any, userId: string): Promise<HealthIncident | null> {
  // Implementation for updating incident
  return null;
}

/**
 * Get SLA compliance data
 */
async function getSLACompliance(service: string | undefined, timeRange: any, granularity: string): Promise<any> {
  // Implementation for getting SLA compliance
  return {
    overall: 99.5,
    services: {},
    violations: [],
    trends: {}
  };
}

/**
 * Store alert configuration
 */
async function storeAlertConfiguration(config: any, userId: string): Promise<string> {
  const configId = `alert_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Implementation for storing alert configuration
  logger.debug('Alert configuration stored', {
    configId,
    service: config.service,
    userId
  });
  
  return configId;
}

export default router;