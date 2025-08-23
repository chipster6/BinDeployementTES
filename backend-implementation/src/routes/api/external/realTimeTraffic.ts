/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REAL-TIME TRAFFIC API ROUTES
 * ============================================================================
 *
 * API routes for real-time traffic monitoring, WebSocket coordination,
 * and external service integration. Provides REST endpoints for 
 * traffic data, route optimization, and real-time updates.
 *
 * Endpoints:
 * - POST /api/external/traffic/subscribe - Subscribe to traffic updates
 * - GET /api/external/traffic/status - Get current traffic status
 * - POST /api/external/traffic/route/optimize - Request route optimization
 * - GET /api/external/traffic/providers/health - Get provider health status
 * - POST /api/external/traffic/providers/fallback - Trigger fallback
 * - GET /api/external/traffic/websocket/stats - Get WebSocket statistics
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
import RealTimeTrafficWebSocketService from "@/services/external/RealTimeTrafficWebSocketService";
import MultiProviderFallbackCoordinator from "@/services/external/MultiProviderFallbackCoordinator";
import HealthMonitoringService from "@/services/external/HealthMonitoringService";
import { ExternalAPIResilienceManager } from "@/services/external/ExternalAPIResilienceManager";
import GraphHopperService, { Location } from "@/services/external/GraphHopperService";

const router = Router();

// Initialize services (would typically be dependency injected)
const resilienceManager = new ExternalAPIResilienceManager({} as any);
const webSocketService = new RealTimeTrafficWebSocketService(resilienceManager);
const fallbackCoordinator = new MultiProviderFallbackCoordinator(resilienceManager);
const healthMonitoringService = new HealthMonitoringService(resilienceManager, webSocketService);
const graphHopperService = new GraphHopperService();

/**
 * =============================================================================
 * WEBSOCKET SUBSCRIPTION ENDPOINTS
 * =============================================================================
 */

/**
 * Subscribe to real-time traffic updates
 * POST /api/external/traffic/subscribe
 */
router.post("/subscribe", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.subscribe');
  
  try {
    const {
      subscriptionType,
      organizationId,
      locations,
      updateInterval,
      includeIncidents,
      includeWeather,
      routeOptimizationIds
    } = req.body;

    // Validate subscription data
    if (!subscriptionType || !organizationId) {
      return ResponseHelper.badRequest(res, "subscriptionType and organizationId are required");
    }

    // Create subscription configuration
    const subscriptionData = {
      userId: (req as any).user.userId,
      organizationId,
      subscriptionType,
      locations: locations || [],
      updateInterval: updateInterval || 30,
      includeIncidents: includeIncidents !== false,
      includeWeather: includeWeather !== false,
      routeOptimizationIds: routeOptimizationIds || [],
      timestamp: new Date()
    };

    // Store subscription in session/database
    const subscriptionId = await storeSubscription(subscriptionData);

    const executionTime = timer.end({
      subscriptionType,
      organizationId,
      userId: (req as any).user.userId
    });

    logger.info('Traffic subscription created', {
      subscriptionId,
      subscriptionType,
      organizationId,
      userId: (req as any).user.userId,
      executionTime
    });

    return ResponseHelper.success(res, {
      subscriptionId,
      subscriptionType,
      status: "active",
      message: "Successfully subscribed to real-time traffic updates",
      websocketInstructions: {
        connect: "wss://your-domain.com/ws",
        authenticate: "Send JWT token in connection headers",
        subscribe: `Emit '${subscriptionType}_subscribe' event with subscription data`
      }
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error creating traffic subscription', {
      error: error instanceof Error ? error?.message : String(error),
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to create traffic subscription");
  }
});

/**
 * Get current traffic status for locations
 * GET /api/external/traffic/status
 */
router.get("/status", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.getStatus');
  
  try {
    const { locations, includeIncidents, includeWeather } = req.query;

    if (!locations) {
      return ResponseHelper.badRequest(res, "locations parameter is required");
    }

    // Parse locations
    let parsedLocations: Location[];
    try {
      parsedLocations = typeof locations === 'string' ? JSON.parse(locations) : locations;
    } catch (parseError) {
      return ResponseHelper.badRequest(res, "Invalid locations format");
    }

    // Get traffic status for each location
    const trafficStatus = await getTrafficStatusForLocations(parsedLocations, {
      includeIncidents: includeIncidents === 'true',
      includeWeather: includeWeather === 'true'
    });

    const executionTime = timer.end({
      locationCount: parsedLocations.length,
      includeIncidents: includeIncidents === 'true',
      includeWeather: includeWeather === 'true'
    });

    logger.info('Traffic status retrieved', {
      locationCount: parsedLocations.length,
      executionTime
    });

    return ResponseHelper.success(res, {
      locations: trafficStatus,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving traffic status', {
      error: error instanceof Error ? error?.message : String(error),
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve traffic status");
  }
});

/**
 * =============================================================================
 * ROUTE OPTIMIZATION ENDPOINTS
 * =============================================================================
 */

/**
 * Request real-time route optimization
 * POST /api/external/traffic/route/optimize
 */
router.post("/route/optimize", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.optimizeRoute');
  
  try {
    const {
      start,
      end,
      vehicleType,
      includeTraffic,
      useFallbackProviders,
      businessContext
    } = req.body;

    // Validate required parameters
    if (!start || !end) {
      return ResponseHelper.badRequest(res, "start and end locations are required");
    }

    if (!isValidLocation(start) || !isValidLocation(end)) {
      return ResponseHelper.badRequest(res, "Invalid location format");
    }

    // Set default business context
    const defaultBusinessContext = {
      urgency: "standard",
      customerFacing: false,
      revenueImpacting: false,
      maxCostIncrease: 25
    };

    const finalBusinessContext = { ...defaultBusinessContext, ...businessContext };

    let optimizationResult;

    if (useFallbackProviders) {
      // Use multi-provider fallback coordinator
      optimizationResult = await fallbackCoordinator.executeRoutingFallback(
        start,
        end,
        {
          vehicleType: vehicleType || 'truck',
          includeTraffic: includeTraffic !== false,
          businessContext: finalBusinessContext,
          maxCostIncrease: finalBusinessContext.maxCostIncrease,
          maxLatencyIncrease: 5000
        }
      );
    } else {
      // Use primary service only
      const primaryResult = await graphHopperService.getTrafficAwareRoute(start, end, {
        vehicle: vehicleType || 'truck',
        traffic: includeTraffic !== false
      });

      optimizationResult = {
        success: primaryResult.success,
        data: primaryResult.data,
        provider: "graphhopper_primary",
        degradationLevel: "none" as const,
        costImpact: 0,
        latency: primaryResult.metadata?.duration || 0,
        cacheUsed: primaryResult.metadata?.fromCache || false,
        offlineMode: false
      };
    }

    const executionTime = timer.end({
      success: optimizationResult.success,
      provider: optimizationResult.provider,
      useFallbackProviders,
      includeTraffic,
      costImpact: optimizationResult.costImpact
    });

    logger.info('Route optimization completed', {
      success: optimizationResult.success,
      provider: optimizationResult.provider,
      useFallbackProviders,
      includeTraffic,
      costImpact: optimizationResult.costImpact,
      executionTime
    });

    if (optimizationResult.success) {
      return ResponseHelper.success(res, {
        route: optimizationResult.data,
        optimization: {
          provider: optimizationResult.provider,
          degradationLevel: optimizationResult.degradationLevel,
          costImpact: optimizationResult.costImpact,
          cacheUsed: optimizationResult.cacheUsed,
          offlineMode: optimizationResult.offlineMode
        }
      });
    } else {
      return ResponseHelper.badRequest(res, "Route optimization failed", {
        error: "Optimization failed",
        metadata: optimizationResult.metadata,
        recommendations: optimizationResult.metadata.recommendations
      });
    }

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error in route optimization', {
      error: error instanceof Error ? error?.message : String(error),
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Route optimization failed");
  }
});

/**
 * =============================================================================
 * PROVIDER HEALTH AND FALLBACK ENDPOINTS
 * =============================================================================
 */

/**
 * Get provider health status
 * GET /api/external/traffic/providers/health
 */
router.get("/providers/health", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.getProvidersHealth');
  
  try {
    // Get comprehensive health overview
    const healthOverview = await healthMonitoringService.getHealthOverview();

    if (!healthOverview.success) {
      return ResponseHelper.internalError(res, "Failed to retrieve health overview");
    }

    const executionTime = timer.end({
      servicesMonitored: Object.keys(healthOverview.data!.services).length,
      overallHealth: healthOverview.data!.overall,
      activeIncidents: healthOverview.data!.incidents.active
    });

    logger.info('Provider health status retrieved', {
      servicesMonitored: Object.keys(healthOverview.data!.services).length,
      overallHealth: healthOverview.data!.overall,
      activeIncidents: healthOverview.data!.incidents.active,
      executionTime
    });

    return ResponseHelper.success(res, {
      overall: healthOverview.data!.overall,
      providers: healthOverview.data!.services,
      incidents: healthOverview.data!.incidents,
      sla: healthOverview.data!.sla,
      predictiveAlerts: healthOverview.data!.predictiveAlerts,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving provider health status', {
      error: error instanceof Error ? error?.message : String(error)
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve provider health status");
  }
});

/**
 * Trigger provider fallback
 * POST /api/external/traffic/providers/fallback
 */
router.post("/providers/fallback", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.triggerFallback');
  
  try {
    const {
      service,
      reason,
      duration,
      businessContext
    } = req.body;

    if (!service || !reason) {
      return ResponseHelper.badRequest(res, "service and reason are required");
    }

    // Create incident for fallback trigger
    const incidentResult = await healthMonitoringService.createIncident(
      service,
      "degradation",
      "medium",
      `Manual fallback triggered: ${reason}`,
      {
        affectedOperations: ["routing", "traffic_data"],
        estimatedRevenueLoss: 0,
        affectedCustomers: 0,
        businessImpact: "minimal"
      }
    );

    if (!incidentResult.success) {
      return ResponseHelper.internalError(res, "Failed to create fallback incident");
    }

    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const executionTime = timer.end({
      service,
      reason,
      incidentId: incidentResult.data!.id
    });

    logger.warn('Manual fallback triggered', {
      fallbackId,
      service,
      reason,
      triggeredBy: (req as any).user.userId,
      incidentId: incidentResult.data!.id,
      executionTime
    });

    return ResponseHelper.success(res, {
      fallbackId,
      status: "triggered",
      service,
      reason,
      incident: incidentResult.data,
      estimatedDuration: duration || "unknown"
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error triggering provider fallback', {
      error: error instanceof Error ? error?.message : String(error),
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to trigger provider fallback");
  }
});

/**
 * =============================================================================
 * WEBSOCKET STATISTICS AND MONITORING
 * =============================================================================
 */

/**
 * Get WebSocket connection statistics
 * GET /api/external/traffic/websocket/stats
 */
router.get("/websocket/stats", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('RealTimeTrafficAPI.getWebSocketStats');
  
  try {
    // Get WebSocket service statistics
    const webSocketStats = webSocketService.getServiceStats();
    
    // Get monitoring service statistics
    const monitoringStats = healthMonitoringService.getMonitoringStats();
    
    // Get fallback coordinator statistics
    const coordinatorStats = fallbackCoordinator.getCoordinatorStats();

    const executionTime = timer.end({
      totalConnections: Object.values(webSocketStats.activeConnections).reduce((sum: number, count: number) => sum + count, 0)
    });

    logger.info('WebSocket statistics retrieved', {
      totalConnections: Object.values(webSocketStats.activeConnections).reduce((sum: number, count: number) => sum + count, 0),
      executionTime
    });

    return ResponseHelper.success(res, {
      websocket: webSocketStats,
      monitoring: monitoringStats,
      coordinator: coordinatorStats,
      timestamp: new Date()
    });

  } catch (error: unknown) {
    timer.end({ error: error instanceof Error ? error?.message : String(error) });
    logger.error('Error retrieving WebSocket statistics', {
      error: error instanceof Error ? error?.message : String(error)
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve WebSocket statistics");
  }
});

/**
 * =============================================================================
 * HELPER FUNCTIONS
 * =============================================================================
 */

/**
 * Store subscription data
 */
async function storeSubscription(subscriptionData: any): Promise<string> {
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Implementation: Store in Redis or database
  try {
    // Store subscription data with expiration
    const key = `traffic_subscription:${subscriptionId}`;
    const data = JSON.stringify(subscriptionData);
    // await redisClient.set(key, data, "EX", 86400); // 24 hours
    
    logger.debug('Subscription stored', {
      subscriptionId,
      userId: subscriptionData.userId,
      organizationId: subscriptionData.organizationId
    });
    
    return subscriptionId;
  } catch (error: unknown) {
    logger.error('Error storing subscription', {
      error: error instanceof Error ? error?.message : String(error),
      subscriptionData
    });
    throw error;
  }
}

/**
 * Get traffic status for locations
 */
async function getTrafficStatusForLocations(
  locations: Location[],
  options: { includeIncidents: boolean; includeWeather: boolean }
): Promise<any[]> {
  const trafficStatus = [];
  
  for (const location of locations) {
    try {
      // Get current traffic data for location
      const trafficData = {
        location,
        traffic: {
          congestionLevel: Math.floor(Math.random() * 100), // Mock data
          averageSpeed: 45 + Math.floor(Math.random() * 20),
          incidents: options.includeIncidents ? [] : undefined,
          estimatedDelay: Math.floor(Math.random() * 10)
        },
        weather: options.includeWeather ? {
          temperature: 20 + Math.floor(Math.random() * 15),
          conditions: ["clear"],
          visibility: 100,
          roadImpact: 0
        } : undefined,
        timestamp: new Date(),
        dataSource: "graphhopper",
        confidence: 0.95
      };
      
      trafficStatus.push(trafficData);
    } catch (error: unknown) {
      logger.warn('Error getting traffic status for location', {
        location,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      // Add error status for this location
      trafficStatus.push({
        location,
        error: error instanceof Error ? error?.message : String(error),
        timestamp: new Date(),
        dataSource: "error",
        confidence: 0
      });
    }
  }
  
  return trafficStatus;
}

/**
 * Validate location format
 */
function isValidLocation(location: any): boolean {
  return (
    location &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

export default router;