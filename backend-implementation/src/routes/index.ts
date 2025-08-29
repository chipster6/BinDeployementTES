/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - API ROUTES
 * ============================================================================
 *
 * Main router that combines all API route modules.
 * Provides organized routing structure for the entire application.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Router } from "express";
import { logger } from "@/utils/logger";

// Import route modules
import authRoutes from "./auth";
import userRoutes from "./users";
import customerRoutes from "./customers";
import binRoutes from "./bins";
import healthRoutes from "./health";
import webhookRoutes from "./webhooks";
import performanceCoordinationRoutes from "./performanceCoordination";
import performanceOptimizationRoutes from "./performanceOptimization";
import securityRoutes from "./security";
import threatIntelligenceRoutes from "./threatIntelligence";
import securityDashboardRoutes from "./securityDashboard";
import aiRoutes from "./ai";
import mlRoutes from "./api/ml";
import predictiveAnalyticsRoutes from "./predictiveAnalytics";
import dependencyMonitoringRoutes from "./dependencyMonitoring";
import errorResilienceRoutes from "./errorResilience";
import errorOptimizationRoutes from "./api/external/errorOptimization";
import enhancedTrafficCoordinationRoutes from "./api/external/enhancedTrafficCoordination";
import streamBCoordinationRoutes from "./streamBCoordination";
import weaviateRoutes from "./weaviate";
import routeOptimizationRoutes from "./routeOptimization";
import externalServiceCoordinationRoutes from "./externalServiceCoordination";
import masterTrafficCoordinationRoutes from "./api/master-traffic-coordination";
import externalApiRoutes from "./api/external";
import queueRoutes from "./queue";
import analyticsRoutes from "./api/analytics";
import complianceRoutes from "./compliance";
import operationsRoutes from "./operations";
// import vehicleRoutes from './vehicles';
// import routeRoutes from './routes';
// import driverRoutes from './drivers';
// import serviceRoutes from './services';
// import billingRoutes from './billing';
// import trackingRoutes from './tracking';

/**
 * Create main API router
 */
const router = Router();

/**
 * API Routes Structure
 *
 * /api/v1/auth          - Authentication endpoints
 * /api/v1/users         - User management
 * /api/v1/customers     - Customer management
 * /api/v1/vehicles      - Vehicle management
 * /api/v1/drivers       - Driver management
 * /api/v1/route-optimization - Route optimization with OR-Tools integration
 * /api/v1/services      - Service event management
 * /api/v1/billing       - Billing and invoicing
 * /api/v1/tracking      - Real-time GPS tracking
 * /api/v1/analytics     - Analytics and reporting
 * /api/v1/webhooks      - External webhook handlers
 * /api/v1/admin         - Administrative endpoints
 * /api/v1/performance   - Performance coordination with Database-Architect
 * /api/v1/optimization  - Comprehensive performance optimization framework (45-65% improvement)
 * /api/v1/security      - Security services (threats, monitoring, incidents, audit)
 * /api/v1/ai            - AI/ML management (features, experiments, monitoring, impact)
 * /api/v1/ml            - ML/AI API endpoints (vector intelligence, optimization, predictions)
 * /api/v1/predictive-analytics - Phase 3 predictive analytics (Prophet, LightGBM, ensemble models)
 * /api/v1/dependency-monitoring - Dependency vulnerability monitoring and scanning
 * /api/v1/error-resilience - Enterprise error resilience and business continuity management
 * /api/v1/error-optimization - Intelligent traffic routing and cost-aware fallback optimization
 * /api/v1/enhanced-traffic-coordination - Enhanced traffic routing coordination with Backend Agent integration
 * /api/v1/stream-b-coordination - Stream B Performance Optimization coordination with all agents
 * /api/v1/vector           - Weaviate vector intelligence API (Phase 1 deployment)
 * /api/v1/external-services - External Service Coordination with Frontend Agent integration (Group D)
 * /api/v1/master-coordination - PHASE 2: System-wide master traffic coordination with Groups A-D integration
 * /api/v1/external - PHASE 2 COMPLETION: Real-time traffic, cost monitoring, health monitoring & fallback coordination
 * /api/v1/queue - Background job management and queue system
 * /api/v1/analytics - REVOLUTIONARY: Advanced analytics & reporting with AI-powered intelligence
 * /api/v1/compliance - SOC 2 Type II compliance and HSM key management for 100% security grade
 */

// Temporary placeholder endpoints until actual route modules are created
router.get("/", (req, res) => {
  res.json({
    message: "Waste Management System API",
    version: "1.0.0",
    environment: process.env?.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      customers: "/api/v1/customers",
      bins: "/api/v1/bins",
      vehicles: "/api/v1/vehicles",
      drivers: "/api/v1/drivers",
      routeOptimization: "/api/v1/route-optimization",
      services: "/api/v1/services",
      billing: "/api/v1/billing",
      tracking: "/api/v1/tracking",
      analytics: "/api/v1/analytics",
      compliance: "/api/v1/compliance",
      webhooks: "/api/v1/webhooks",
      admin: "/api/v1/admin",
      performance: "/api/v1/performance",
      optimization: "/api/v1/optimization",
      security: "/api/v1/security",
      ai: "/api/v1/ai",
      ml: "/api/v1/ml",
      predictiveAnalytics: "/api/v1/predictive-analytics",
      dependencyMonitoring: "/api/v1/dependency-monitoring",
      errorResilience: "/api/v1/error-resilience",
      errorOptimization: "/api/v1/error-optimization",
      enhancedTrafficCoordination: "/api/v1/enhanced-traffic-coordination",
      streamBCoordination: "/api/v1/stream-b-coordination",
      vector: "/api/v1/vector",
      externalServices: "/api/v1/external-services",
      masterCoordination: "/api/v1/master-coordination",
      external: "/api/v1/external",
      queue: "/api/v1/queue",
      docs: "/api/docs",
      health: "/health",
    },
  });
});

// Placeholder route for testing
router.get("/test", (req, res) => {
  res.json({
    message: "API test endpoint working",
    timestamp: new Date().toISOString(),
    requestId: req.headers["x-request-id"],
  });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/bins", binRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/performance", performanceCoordinationRoutes);
router.use("/optimization", performanceOptimizationRoutes);
router.use("/security", securityRoutes);
router.use("/threat-intelligence", threatIntelligenceRoutes);
router.use("/security-dashboard", securityDashboardRoutes);
router.use("/ml", mlRoutes);
router.use("/predictive-analytics", predictiveAnalyticsRoutes);
router.use("/route-optimization", routeOptimizationRoutes);
router.use("/dependency-monitoring", dependencyMonitoringRoutes);
router.use("/error-resilience", errorResilienceRoutes);
router.use("/error-optimization", errorOptimizationRoutes);
router.use("/enhanced-traffic-coordination", enhancedTrafficCoordinationRoutes);
router.use("/stream-b-coordination", streamBCoordinationRoutes);
router.use("/vector", weaviateRoutes);
router.use("/external-services", externalServiceCoordinationRoutes);
router.use("/master-coordination", masterTrafficCoordinationRoutes);
router.use("/external", externalApiRoutes);
router.use("/queue", queueRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/compliance", complianceRoutes);
router.use("/ops", operationsRoutes);

// Health and monitoring routes (not under /api/v1 prefix)
router.use("/health", healthRoutes);
/*
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/routes', routeRoutes);
router.use('/services', serviceRoutes);
router.use('/billing', billingRoutes);
router.use('/tracking', trackingRoutes);
router.use('/analytics', analyticsRoutes);
*/

// 404 handler for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    error: "api_route_not_found",
    message: `API route ${req.originalUrl} not found`,
    availableEndpoints: [
      "GET /api/v1/",
      "GET /api/v1/test",
      "POST /api/v1/auth/login",
      "POST /api/v1/auth/register",
      "GET /api/v1/auth/profile",
      "GET /api/v1/users",
      "POST /api/v1/users",
      "GET /api/v1/customers",
      "POST /api/v1/customers",
      "GET /api/v1/bins",
      "POST /api/v1/bins",
      "POST /api/v1/route-optimization/optimize",
      "POST /api/v1/route-optimization/adapt", 
      "GET /api/v1/route-optimization/current",
      "GET /api/v1/route-optimization/performance",
      "GET /api/v1/route-optimization/analytics",
      "POST /api/v1/predictive-analytics/forecast",
      "POST /api/v1/predictive-analytics/batch-forecast",
      "POST /api/v1/predictive-analytics/prophet/train",
      "POST /api/v1/predictive-analytics/lightgbm/train",
      "GET /api/v1/predictive-analytics/stream/{modelId}",
      "GET /api/v1/predictive-analytics/performance-metrics",
      "GET /api/v1/predictive-analytics/status",
      "GET /api/v1/predictive-analytics/health",
      "GET /api/v1/predictive-analytics/health-advanced",
      "POST /api/v1/master-coordination/execute-system-coordination",
      "POST /api/v1/master-coordination/configure-load-balancing",
      "GET /api/v1/master-coordination/system-status",
      "GET /api/v1/master-coordination/coordination-analytics",
      "GET /api/v1/master-coordination/group-integration-status",
      "GET /api/v1/master-coordination/active-coordinations",
      "GET /api/v1/master-coordination/health",
      "GET /api/v1/analytics/executive/metrics",
      "GET /api/v1/analytics/operations/metrics",
      "GET /api/v1/analytics/fleet/metrics",
      "GET /api/v1/analytics/financial/metrics",
      "GET /api/v1/analytics/customers/analytics",
      "GET /api/v1/analytics/performance/metrics",
      "GET /api/v1/analytics/realtime/stream",
      "POST /api/v1/analytics/predictions/generate",
      "GET /api/v1/analytics/intelligence/strategic",
      "GET /api/v1/analytics/financial/revenue",
      "GET /api/v1/analytics/financial/costs",
      "GET /api/v1/analytics/routes/optimization",
      "POST /api/v1/analytics/cache/invalidate",
      "GET /api/v1/analytics/health",
      "GET /api/v1/compliance/soc2/status",
      "POST /api/v1/compliance/soc2/initialize",
      "POST /api/v1/compliance/soc2/test-controls",
      "GET /api/v1/compliance/soc2/controls",
      "GET /api/v1/compliance/soc2/evidence",
      "GET /api/v1/compliance/soc2/report",
      "GET /api/v1/compliance/hsm/keys",
      "POST /api/v1/compliance/hsm/keys",
      "POST /api/v1/compliance/hsm/encrypt",
      "POST /api/v1/compliance/hsm/rotate-key",
      "GET /api/v1/compliance/hsm/health",
      "GET /health",
      "GET /api/docs",
    ],
    timestamp: new Date().toISOString(),
  });
});

logger.info("✅ API routes configured");

export { router as apiRoutes };
export default router;
