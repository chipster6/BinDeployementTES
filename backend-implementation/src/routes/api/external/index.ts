/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES API ROUTES INDEX
 * ============================================================================
 *
 * Central routing configuration for all external service coordination APIs.
 * Provides unified access to real-time traffic, cost monitoring, and health
 * monitoring endpoints with consistent authentication and middleware.
 *
 * Route Structure:
 * - /api/external/traffic/* - Real-time traffic and WebSocket coordination
 * - /api/external/cost/* - Cost monitoring and budget management  
 * - /api/external/health/* - Health monitoring and incident management
 * - /api/external/fallback/* - Multi-provider fallback coordination
 * - /api/external/websocket/* - WebSocket statistics and management
 *
 * Created by: External-API-Integration-Specialist
 * Date: 2025-08-19
 * Version: 1.0.0 - Phase 2 External API Completion
 */

import { Router } from "express";
import { logger } from "@/utils/logger";

// Import route modules
import realTimeTrafficRoutes from "./realTimeTraffic";
import costMonitoringRoutes from "./costMonitoring";
import healthMonitoringRoutes from "./healthMonitoring";
import fallbackRoutes from "./fallback";

const router = Router();

/**
 * =============================================================================
 * ROUTE REGISTRATION
 * =============================================================================
 */

// Real-time traffic monitoring and WebSocket coordination
router.use("/traffic", realTimeTrafficRoutes);

// Cost monitoring and budget management
router.use("/cost", costMonitoringRoutes);

// Health monitoring and incident management
router.use("/health", healthMonitoringRoutes);

// Multi-provider fallback coordination
router.use("/fallback", fallbackRoutes);

/**
 * =============================================================================
 * ROOT ENDPOINT - EXTERNAL SERVICES STATUS
 * =============================================================================
 */

/**
 * Get external services overview
 * GET /api/external
 */
router.get("/", async (req, res) => {
  try {
    const overview = {
      message: "External Services API - Phase 2 Integration Complete",
      version: "1.0.0",
      services: {
        traffic: {
          description: "Real-time traffic monitoring and WebSocket coordination",
          endpoints: [
            "POST /traffic/subscribe",
            "GET /traffic/status", 
            "POST /traffic/route/optimize",
            "GET /traffic/providers/health",
            "GET /traffic/websocket/stats"
          ],
          status: "operational"
        },
        cost: {
          description: "Cost monitoring and budget management",
          endpoints: [
            "GET /cost/analytics",
            "POST /cost/budgets",
            "GET /cost/real-time",
            "GET /cost/providers/comparison",
            "GET /cost/reports"
          ],
          status: "operational"
        },
        health: {
          description: "24/7 health monitoring and incident management",
          endpoints: [
            "GET /health/overview",
            "GET /health/services/:service",
            "POST /health/incidents",
            "GET /health/predictive/:service",
            "GET /health/sla"
          ],
          status: "operational"
        },
        fallback: {
          description: "Multi-provider fallback coordination",
          endpoints: [
            "POST /fallback/execute",
            "GET /fallback/status",
            "POST /fallback/test",
            "GET /fallback/performance"
          ],
          status: "operational"
        }
      },
      capabilities: {
        realTimeMonitoring: true,
        costOptimization: true,
        predictiveAnalytics: true,
        multiProviderFallback: true,
        incidentManagement: true,
        slaMonitoring: true,
        webSocketIntegration: true,
        businessContinuity: true
      },
      integration: {
        monitoredServices: [
          "GraphHopper (Traffic & Routing)",
          "Google Maps (Fallback routing)",
          "Mapbox (Alternative routing)",
          "Twilio (SMS notifications)",
          "SendGrid (Email services)",
          "Stripe (Payment processing)"
        ],
        features: [
          "Real-time WebSocket updates",
          "Cost monitoring with budget alerts",
          "24/7 health monitoring",
          "Predictive failure detection",
          "Automated incident response",
          "Multi-provider intelligent fallback",
          "Business continuity management",
          "SLA compliance tracking"
        ]
      },
      documentation: {
        apiDocs: "/api/external/docs",
        webSocketProtocol: "/api/external/websocket/protocol",
        healthGuide: "/api/external/health/guide",
        costOptimization: "/api/external/cost/optimization-guide"
      },
      timestamp: new Date().toISOString()
    };

    logger.info('External services overview requested', {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      data: overview
    });

  } catch (error: unknown) {
    logger.error('Error generating external services overview', {
      error: error instanceof Error ? error?.message : String(error)
    });

    res.status(500).json({
      success: false,
      message: "Failed to generate services overview",
      error: "Internal server error"
    });
  }
});

/**
 * =============================================================================
 * HEALTH CHECK ENDPOINT
 * =============================================================================
 */

/**
 * External services health check
 * GET /api/external/ping
 */
router.get("/ping", async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        traffic: "operational",
        cost: "operational", 
        health: "operational",
        fallback: "operational"
      },
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env?.NODE_ENV || "development"
    };

    res.status(200).json({
      success: true,
      data: healthStatus
    });

  } catch (error: unknown) {
    logger.error('Error in external services health check', {
      error: error instanceof Error ? error?.message : String(error)
    });

    res.status(500).json({
      success: false,
      message: "Health check failed",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * =============================================================================
 * ERROR HANDLERS
 * =============================================================================
 */

/**
 * 404 handler for unknown external API routes
 */
router.use("*", (req, res) => {
  logger.warn('External API route not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: "External API endpoint not found",
    availableEndpoints: [
      "/api/external/traffic/*",
      "/api/external/cost/*", 
      "/api/external/health/*",
      "/api/external/fallback/*"
    ],
    documentation: "/api/external"
  });
});

export default router;