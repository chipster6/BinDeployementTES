/**
 * ============================================================================
 * PERFORMANCE OPTIMIZATION ROUTES
 * ============================================================================
 *
 * API routes for comprehensive performance optimization framework.
 * Provides endpoints for deployment, execution, monitoring, and coordination
 * of all performance optimization services.
 *
 * Routes:
 * - POST /api/performance/deploy - Deploy optimization framework
 * - POST /api/performance/execute - Execute comprehensive optimization
 * - GET /api/performance/status - Get optimization status
 * - GET /api/performance/metrics - Get performance metrics
 * - GET /api/performance/benchmark - Get performance benchmarks
 * - POST /api/performance/coordinate - Coordinate with other services
 * - GET /api/performance/memory/profile - Get memory profiling data
 * - GET /api/performance/api/status - Get API acceleration status
 * - GET /api/performance/dashboard/status - Get dashboard optimization status
 *
 * Created by: Performance Optimization Specialist
 * Date: 2025-08-18
 * Version: 1.0.0
 */

import { Router } from "express";
import { body, query, param } from "express-validator";
import { auth } from "@/middleware/auth";
import { validation } from "@/middleware/validation";
import { rateLimit } from "@/middleware/rateLimit";
import { performanceOptimizationController } from "@/controllers/PerformanceOptimizationController";
import { logger } from "@/utils/logger";

const router = Router();

/**
 * Apply middleware to all performance optimization routes
 */
router.use(auth); // Require authentication
router.use(rateLimit({ windowMs: 60000, max: 100 })); // Rate limiting

/**
 * POST /api/performance/deploy
 * Deploy comprehensive performance optimization framework
 * Requires admin permissions for production deployment
 */
router.post(
  "/deploy",
  [
    body("dryRun").optional().isBoolean().withMessage("dryRun must be a boolean"),
    body("environment").optional().isIn(["development", "staging", "production"]).withMessage("Invalid environment"),
    body("coordinationMode").optional().isIn(["parallel", "sequential"]).withMessage("Invalid coordination mode"),
    body("targetImprovement").optional().isInt({ min: 1, max: 100 }).withMessage("Target improvement must be 1-100%"),
    validation
  ],
  async (req, res) => {
    try {
      logger.info("🚀 Performance optimization framework deployment requested", {
        user: req.user?.id,
        environment: req.body.environment || "development",
        dryRun: req.body.dryRun || false
      });

      await performanceOptimizationController.deployOptimizationFramework(req, res);
    } catch (error) {
      logger.error("Performance optimization deployment route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * POST /api/performance/execute
 * Execute comprehensive performance optimization
 * Supports selective optimization execution
 */
router.post(
  "/execute",
  [
    body("includeMemoryCPU").optional().isBoolean().withMessage("includeMemoryCPU must be a boolean"),
    body("includeAPIOptimization").optional().isBoolean().withMessage("includeAPIOptimization must be a boolean"),
    body("includeDashboardOptimization").optional().isBoolean().withMessage("includeDashboardOptimization must be a boolean"),
    body("dryRun").optional().isBoolean().withMessage("dryRun must be a boolean"),
    body("priority").optional().isIn(["low", "medium", "high", "critical"]).withMessage("Invalid priority level"),
    body("coordinateWithServices").optional().isArray().withMessage("coordinateWithServices must be an array"),
    validation
  ],
  async (req, res) => {
    try {
      logger.info("🔧 Performance optimization execution requested", {
        user: req.user?.id,
        includeMemoryCPU: req.body.includeMemoryCPU !== false,
        includeAPIOptimization: req.body.includeAPIOptimization !== false,
        includeDashboardOptimization: req.body.includeDashboardOptimization !== false,
        dryRun: req.body.dryRun || false
      });

      await performanceOptimizationController.executeComprehensiveOptimization(req, res);
    } catch (error) {
      logger.error("Performance optimization execution route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/status
 * Get current performance optimization status
 * Returns status of all optimization services
 */
router.get(
  "/status",
  [
    query("includeDetails").optional().isBoolean().withMessage("includeDetails must be a boolean"),
    query("service").optional().isIn(["framework", "memoryCPU", "api", "dashboard", "all"]).withMessage("Invalid service type"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("📊 Performance optimization status requested", {
        user: req.user?.id,
        includeDetails: req.query.includeDetails === "true",
        service: req.query.service || "all"
      });

      await performanceOptimizationController.getOptimizationStatus(req, res);
    } catch (error) {
      logger.error("Performance optimization status route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/metrics
 * Get comprehensive performance metrics
 * Supports filtering by metric type and time range
 */
router.get(
  "/metrics",
  [
    query("type").optional().isIn(["all", "api", "dashboard", "memory", "coordination"]).withMessage("Invalid metrics type"),
    query("includeHistory").optional().isBoolean().withMessage("includeHistory must be a boolean"),
    query("limit").optional().isInt({ min: 1, max: 1000 }).withMessage("Limit must be between 1 and 1000"),
    query("timeRange").optional().isIn(["1h", "6h", "24h", "7d", "30d"]).withMessage("Invalid time range"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("📈 Performance metrics requested", {
        user: req.user?.id,
        type: req.query.type || "all",
        includeHistory: req.query.includeHistory === "true",
        limit: req.query.limit || 100
      });

      await performanceOptimizationController.getPerformanceMetrics(req, res);
    } catch (error) {
      logger.error("Performance metrics route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/benchmark
 * Get performance benchmarks and improvement tracking
 * Provides historical benchmark data and trends
 */
router.get(
  "/benchmark",
  [
    query("service").optional().isIn(["all", "framework", "api", "dashboard", "memory"]).withMessage("Invalid service type"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("includeTrends").optional().isBoolean().withMessage("includeTrends must be a boolean"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("📊 Performance benchmarks requested", {
        user: req.user?.id,
        service: req.query.service || "all",
        limit: req.query.limit || 10,
        includeTrends: req.query.includeTrends === "true"
      });

      await performanceOptimizationController.getPerformanceBenchmarks(req, res);
    } catch (error) {
      logger.error("Performance benchmarks route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * POST /api/performance/coordinate
 * Coordinate performance optimization with other services
 * Enables cross-service optimization coordination
 */
router.post(
  "/coordinate",
  [
    body("services").isArray({ min: 1 }).withMessage("Services array is required"),
    body("services.*").isString().withMessage("Each service must be a string"),
    body("optimizationTargets").optional().isObject().withMessage("optimizationTargets must be an object"),
    body("coordinationType").optional().isIn(["parallel", "sequential"]).withMessage("Invalid coordination type"),
    body("priority").optional().isIn(["low", "medium", "high", "critical"]).withMessage("Invalid priority level"),
    validation
  ],
  async (req, res) => {
    try {
      logger.info("🤝 Performance coordination requested", {
        user: req.user?.id,
        services: req.body.services,
        coordinationType: req.body.coordinationType || "parallel",
        priority: req.body.priority || "medium"
      });

      await performanceOptimizationController.coordinatePerformanceOptimization(req, res);
    } catch (error) {
      logger.error("Performance coordination route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/memory/profile
 * Get detailed memory profiling data
 * Provides memory usage analysis and leak detection
 */
router.get(
  "/memory/profile",
  [
    query("includeLeaks").optional().isBoolean().withMessage("includeLeaks must be a boolean"),
    query("includeGCMetrics").optional().isBoolean().withMessage("includeGCMetrics must be a boolean"),
    query("timeRange").optional().isIn(["1h", "6h", "24h"]).withMessage("Invalid time range"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("🧠 Memory profiling data requested", {
        user: req.user?.id,
        includeLeaks: req.query.includeLeaks === "true",
        includeGCMetrics: req.query.includeGCMetrics === "true"
      });

      // This would call a specific memory profiling method
      res.json({
        success: true,
        data: {
          memoryUsage: process.memoryUsage(),
          profilerStatus: "active",
          message: "Memory profiling endpoint - implementation pending"
        }
      });
    } catch (error) {
      logger.error("Memory profiling route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/api/status
 * Get API acceleration status and metrics
 * Provides API response time optimization details
 */
router.get(
  "/api/status",
  [
    query("includeEndpoints").optional().isBoolean().withMessage("includeEndpoints must be a boolean"),
    query("includeOptimizations").optional().isBoolean().withMessage("includeOptimizations must be a boolean"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("🚀 API acceleration status requested", {
        user: req.user?.id,
        includeEndpoints: req.query.includeEndpoints === "true",
        includeOptimizations: req.query.includeOptimizations === "true"
      });

      // This would call the API accelerator status method
      res.json({
        success: true,
        data: {
          acceleratorStatus: "active",
          targetResponseTime: "200ms",
          message: "API acceleration status endpoint - implementation pending"
        }
      });
    } catch (error) {
      logger.error("API acceleration status route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/dashboard/status
 * Get dashboard optimization status and metrics
 * Provides frontend performance optimization details
 */
router.get(
  "/dashboard/status",
  [
    query("includeComponents").optional().isBoolean().withMessage("includeComponents must be a boolean"),
    query("includeAssets").optional().isBoolean().withMessage("includeAssets must be a boolean"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("🎨 Dashboard optimization status requested", {
        user: req.user?.id,
        includeComponents: req.query.includeComponents === "true",
        includeAssets: req.query.includeAssets === "true"
      });

      // This would call the dashboard optimizer status method
      res.json({
        success: true,
        data: {
          optimizerStatus: "active",
          targetLoadTime: "2s",
          message: "Dashboard optimization status endpoint - implementation pending"
        }
      });
    } catch (error) {
      logger.error("Dashboard optimization status route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * POST /api/performance/test/load
 * Execute performance load testing
 * Simulates high load to test optimization effectiveness
 */
router.post(
  "/test/load",
  [
    body("duration").optional().isInt({ min: 10, max: 300 }).withMessage("Duration must be between 10 and 300 seconds"),
    body("concurrency").optional().isInt({ min: 1, max: 100 }).withMessage("Concurrency must be between 1 and 100"),
    body("endpoints").optional().isArray().withMessage("Endpoints must be an array"),
    body("dryRun").optional().isBoolean().withMessage("dryRun must be a boolean"),
    validation
  ],
  async (req, res) => {
    try {
      logger.info("🧪 Performance load test requested", {
        user: req.user?.id,
        duration: req.body.duration || 60,
        concurrency: req.body.concurrency || 10,
        dryRun: req.body.dryRun || false
      });

      // This would execute performance load testing
      res.json({
        success: true,
        data: {
          testStatus: "initiated",
          duration: req.body.duration || 60,
          concurrency: req.body.concurrency || 10,
          message: "Performance load test endpoint - implementation pending"
        }
      });
    } catch (error) {
      logger.error("Performance load test route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /api/performance/reports/summary
 * Get comprehensive performance optimization report
 * Provides detailed analysis and recommendations
 */
router.get(
  "/reports/summary",
  [
    query("timeRange").optional().isIn(["24h", "7d", "30d", "90d"]).withMessage("Invalid time range"),
    query("format").optional().isIn(["json", "pdf", "csv"]).withMessage("Invalid format"),
    query("includeRecommendations").optional().isBoolean().withMessage("includeRecommendations must be a boolean"),
    validation
  ],
  async (req, res) => {
    try {
      logger.debug("📋 Performance report requested", {
        user: req.user?.id,
        timeRange: req.query.timeRange || "7d",
        format: req.query.format || "json",
        includeRecommendations: req.query.includeRecommendations === "true"
      });

      // This would generate comprehensive performance report
      res.json({
        success: true,
        data: {
          reportType: "summary",
          timeRange: req.query.timeRange || "7d",
          format: req.query.format || "json",
          message: "Performance report endpoint - implementation pending"
        }
      });
    } catch (error) {
      logger.error("Performance report route error", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * Error handling middleware for performance optimization routes
 */
router.use((error: any, req: any, res: any, next: any) => {
  logger.error("Performance optimization route error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id
  });

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Performance optimization operation failed",
    timestamp: new Date().toISOString()
  });
});

export default router;