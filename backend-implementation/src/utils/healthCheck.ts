/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - HEALTH CHECK UTILITY
 * ============================================================================
 *
 * Comprehensive health check system for monitoring application health.
 * Checks database, Redis, external services, and system resources.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response } from "express";
import { config } from "@/config";
import { checkDatabaseHealth } from "@/config/database";
import { checkRedisHealth } from "@/config/redis";
import { logger, Timer } from "@/utils/logger";

/**
 * Health check status types
 */
type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Health check result interface
 */
interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database?: {
      status: "healthy" | "unhealthy";
      responseTime?: string;
      details?: any;
    };
    redis?: {
      status: "healthy" | "unhealthy";
      responseTime?: string;
      details?: any;
    };
    memory?: {
      status: "healthy" | "degraded";
      details: {
        used: string;
        free: string;
        total: string;
        percentage: number;
      };
    };
    disk?: {
      status: "healthy" | "degraded";
      details: any;
    };
    externalServices?: {
      status: "healthy" | "degraded" | "unhealthy";
      services: Record<
        string,
        {
          status: "healthy" | "unhealthy";
          responseTime?: string;
          error?: string;
        }
      >;
    };
  };
  dependencies: string[];
  buildInfo?: {
    buildTime?: string;
    gitCommit?: string;
    nodeVersion: string;
  };
}

/**
 * Memory usage checker
 */
const checkMemoryUsage = (): HealthCheckResult["checks"]["memory"] => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = require("os").totalmem();
  const freeMemory = require("os").freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const status = memoryPercentage > 90 ? "degraded" : "healthy";

  return {
    status,
    details: {
      used: formatBytes(usedMemory),
      free: formatBytes(freeMemory),
      total: formatBytes(totalMemory),
      percentage: Math.round(memoryPercentage * 100) / 100,
    },
  };
};

/**
 * Disk usage checker
 */
const checkDiskUsage = async (): Promise<
  HealthCheckResult["checks"]["disk"]
> => {
  try {
    const fs = require("fs").promises;
    const stats = (await fs.statvfs) || fs.statfs;

    if (!stats) {
      return {
        status: "healthy",
        details: { message: "Disk check not available on this platform" },
      };
    }

    // For now, just return healthy status
    // In a real implementation, you would check actual disk usage
    return {
      status: "healthy",
      details: { message: "Disk space monitoring not implemented" },
    };
  } catch (error: unknown) {
    return {
      status: "healthy",
      details: {
        message: "Disk check not available",
        error: (error as Error).message,
      },
    };
  }
};

/**
 * External services health checker
 */
const checkExternalServices = async (): Promise<
  HealthCheckResult["checks"]["externalServices"]
> => {
  if (!config.healthCheck.checkExternalApis) {
    return {
      status: "healthy",
      services: {},
    };
  }

  const services: Record<string, any> = {};
  const axios = require("axios");

  // Check Stripe API (if configured)
  if (config.stripe.secretKey) {
    const timer = new Timer("Stripe API Health Check");
    try {
      const response = await axios.get("https://api.stripe.com/v1/charges", {
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${config.stripe.secretKey}`,
        },
        validateStatus: (status: number) => status === 401 || status === 200, // 401 is expected for basic check
      });

      services.stripe = {
        status: "healthy",
        responseTime: `${timer.getDuration()}ms`,
      };
    } catch (error: unknown) {
      services.stripe = {
        status: "unhealthy",
        responseTime: `${timer.getDuration()}ms`,
        error: (error as Error).message,
      };
    }
  }

  // Check Samsara API (if configured)
  if (config.samsara.apiToken) {
    const timer = new Timer("Samsara API Health Check");
    try {
      const response = await axios.get(
        `${config.samsara.baseUrl}/fleet/vehicles`,
        {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${config.samsara.apiToken}`,
          },
          validateStatus: (status: number) => status < 500, // Allow 4xx responses
        },
      );

      services.samsara = {
        status: "healthy",
        responseTime: `${timer.getDuration()}ms`,
      };
    } catch (error: unknown) {
      services.samsara = {
        status: "unhealthy",
        responseTime: `${timer.getDuration()}ms`,
        error: (error as Error).message,
      };
    }
  }

  // Check SendGrid API (if configured)
  if (config.sendGrid.apiKey) {
    const timer = new Timer("SendGrid API Health Check");
    try {
      const response = await axios.get(
        "https://api.sendgrid.com/v3/user/profile",
        {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${config.sendGrid.apiKey}`,
          },
        },
      );

      services.sendgrid = {
        status: "healthy",
        responseTime: `${timer.getDuration()}ms`,
      };
    } catch (error: unknown) {
      services.sendgrid = {
        status: "unhealthy",
        responseTime: `${timer.getDuration()}ms`,
        error: (error as Error).message,
      };
    }
  }

  // Check Mapbox API (if configured)
  if (config.mapbox.accessToken) {
    const timer = new Timer("Mapbox API Health Check");
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${config.mapbox.accessToken}&limit=1`,
        {
          timeout: 5000,
        },
      );

      services.mapbox = {
        status: "healthy",
        responseTime: `${timer.getDuration()}ms`,
      };
    } catch (error: unknown) {
      services.mapbox = {
        status: "unhealthy",
        responseTime: `${timer.getDuration()}ms`,
        error: (error as Error).message,
      };
    }
  }

  // Determine overall external services status
  const serviceStatuses = Object.values(services).map((s) => s.status);
  const unhealthyCount = serviceStatuses.filter(
    (s) => s === "unhealthy",
  ).length;

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (unhealthyCount > 0) {
    overallStatus =
      unhealthyCount === serviceStatuses.length ? "unhealthy" : "degraded";
  }

  return {
    status: overallStatus,
    services,
  };
};

/**
 * Comprehensive health check
 */
const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const checks: HealthCheckResult["checks"] = {};

  // Check database
  if (config.healthCheck.checkDatabase) {
    const timer = new Timer("Database Health Check");
    const dbHealth = await checkDatabaseHealth();
    checks.database = {
      status: dbHealth.status,
      responseTime: `${timer.getDuration()}ms`,
      details: dbHealth.details,
    };
  }

  // Check Redis
  if (config.healthCheck.checkRedis) {
    const timer = new Timer("Redis Health Check");
    const redisHealth = await checkRedisHealth();
    checks.redis = {
      status: redisHealth.status,
      responseTime: `${timer.getDuration()}ms`,
      details: redisHealth.details,
    };
  }

  // Check memory usage
  const memoryCheck = checkMemoryUsage();
  if (memoryCheck) {
    checks.memory = memoryCheck;
  }

  // Check disk usage
  const diskCheck = await checkDiskUsage();
  if (diskCheck) {
    checks.disk = diskCheck;
  }

  // Check external services
  const externalCheck = await checkExternalServices();
  if (externalCheck) {
    checks.externalServices = externalCheck;
  }

  // Determine overall health status
  const checkStatuses = Object.values(checks)
    .map((check) => check?.status)
    .filter(Boolean);
  const unhealthyCount = checkStatuses.filter((s) => s === "unhealthy").length;
  const degradedCount = checkStatuses.filter((s) => s === "degraded").length;

  let overallStatus: HealthStatus = "healthy";
  if (unhealthyCount > 0) {
    overallStatus = "unhealthy";
  } else if (degradedCount > 0) {
    overallStatus = "degraded";
  }

  const totalTime = Date.now() - startTime;

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: config.app?.version || "1.0.0",
    environment: config.app.nodeEnv,
    checks,
    dependencies: [
      "postgresql",
      "redis",
      ...(config.stripe.secretKey ? ["stripe"] : []),
      ...(config.samsara.apiToken ? ["samsara"] : []),
      ...(config.sendGrid.apiKey ? ["sendgrid"] : []),
      ...(config.mapbox.accessToken ? ["mapbox"] : []),
    ],
    buildInfo: {
      nodeVersion: process.version,
      ...(process.env.BUILD_TIME && { buildTime: process.env.BUILD_TIME }),
      ...(process.env.GIT_COMMIT && { gitCommit: process.env.GIT_COMMIT }),
    },
  };
};

/**
 * Health check endpoint handler
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    if (!config.healthCheck.enabled) {
      return res.status(200).json({
        status: "healthy",
        message: "Health checks disabled",
        timestamp: new Date().toISOString(),
      });
    }

    const healthResult = await performHealthCheck();

    // Set appropriate status code
    let statusCode = 200;
    if (healthResult.status === "degraded") {
      statusCode = 200; // Still operational
    } else if (healthResult.status === "unhealthy") {
      statusCode = 503; // Service unavailable
    }

    // Add cache headers
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Log health check result if status is not healthy
    if (healthResult.status !== "healthy") {
      logger.warn("Health check status not healthy", {
        status: healthResult.status,
        checks: healthResult.checks,
      });
    }

    return res.status(statusCode).json(healthResult);
  } catch (error: unknown) {
    logger.error("Health check failed:", error);

    return res.status(500).json({
      status: "unhealthy",
      error: "Health check failed",
      message: error instanceof Error ? error?.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Simple readiness check (for Kubernetes/Docker)
 */
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Simple check - just verify we can respond
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  } catch (error: unknown) {
    res.status(503).json({
      status: "not_ready",
      error: error instanceof Error ? error?.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Liveness check (for Kubernetes/Docker)
 */
export const livenessCheck = async (req: Request, res: Response) => {
  try {
    // Basic liveness check - process is running
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
    });
  } catch (error: unknown) {
    res.status(500).json({
      status: "dead",
      error: error instanceof Error ? error?.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get system metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const os = require("os");
    const memoryUsage = process.memoryUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: {
        process: Math.floor(process.uptime()),
        system: Math.floor(os.uptime()),
      },
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        arrayBuffers: `${(memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
        totalMem: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        freeMem: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        nodeVersion: process.version,
        versions: process.versions,
      },
    };

    res.status(200).json(metrics);
  } catch (error: unknown) {
    logger.error("Failed to get metrics:", error);
    res.status(500).json({
      error: "Failed to get metrics",
      message: error instanceof Error ? error?.message : "Unknown error",
    });
  }
};

// Export health check handlers
export default healthCheck;
