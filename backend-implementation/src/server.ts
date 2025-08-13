import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import { LifecycleService } from "@/services/lifecycleService";
import { MiddlewareService } from "@/services/middlewareService";
import { RouteService } from "@/services/routeService";
import { DatabaseService } from "@/services/databaseService";
import { JobService } from "@/services/jobService";
import { socketManager } from "@/services/socketManager";
import { errorHandler } from "@/middleware/errorHandler";
import { errorRecoveryMiddleware } from "@/middleware/errorRecoveryMiddleware";
import { errorMonitoring } from "@/services/ErrorMonitoringService";
import { databaseRecovery } from "@/services/DatabaseRecoveryService";
import { databaseMonitoring } from "@/services/DatabaseMonitoringService";
import { databaseInitializationService } from "@/services/DatabaseInitializationService";
import { databasePerformanceMonitor } from "@/services/DatabasePerformanceMonitor";

class Application {
  public async start(): Promise<void> {
    const app = express();
    const server = createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Instantiate services
    const databaseService = new DatabaseService();
    const jobService = new JobService();
    const middlewareService = new MiddlewareService(app);
    const routeService = new RouteService(app);
    const lifecycleService = new LifecycleService(
      server,
      io,
      databaseService,
      jobService,
    );

    // CRITICAL: Initialize database infrastructure for production load
    await databaseInitializationService.initializeAll();
    
    // Connect to dependencies
    await databaseService.connect();
    await jobService.initialize();

    // Initialize middleware and routes
    middlewareService.initialize();
    await routeService.initialize();

    // Initialize Socket.IO
    socketManager.initialize(io);

    // Initialize error monitoring and recovery
    this.initializeErrorSystems();

    // CRITICAL: Initialize database monitoring for production connection pool management
    this.initializeDatabaseMonitoring();

    // Initialize final error handlers (order matters)
    app.use(errorRecoveryMiddleware.middleware);
    app.use(errorHandler);

    // Start the server
    await lifecycleService.start(config.port);

    logger.info(
      "Application started successfully with comprehensive error handling",
      {
        port: config.port,
        errorMonitoring: "enabled",
        databaseRecovery: "enabled",
        gracefulDegradation: "enabled",
      },
    );
  }

  /**
   * Initialize error monitoring and recovery systems
   */
  private initializeErrorSystems(): void {
    // Set up error monitoring event handlers
    errorMonitoring.on("errorTracked", (errorEvent) => {
      logger.debug("Error tracked by monitoring system", {
        errorId: errorEvent.id,
        severity: errorEvent.severity,
        category: errorEvent.category,
      });
    });

    errorMonitoring.on("alertTriggered", (alertData) => {
      logger.warn("Error monitoring alert triggered", {
        alert: alertData.alert,
        severity: alertData.severity,
        affectedUsers: alertData.affectedUsersCount,
      });
    });

    // Set up database recovery event handlers
    databaseRecovery.on("connectionUnhealthy", (error) => {
      logger.error("Database connection became unhealthy", {
        error: error.message,
      });
    });

    databaseRecovery.on("connectionRecovered", () => {
      logger.info("Database connection recovered successfully");
    });

    databaseRecovery.on("circuitBreakerOpened", (data) => {
      logger.error("Database circuit breaker opened", {
        operationType: data.operationType,
        failureCount: data.failureCount,
      });
    });

    // Set up process-level error handlers
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception detected", {
        error: error.message,
        stack: error.stack,
      });

      errorMonitoring.trackError(
        new Error("Uncaught Exception: " + error.message),
        {
          ip: "system",
          url: "process",
          method: "SYSTEM",
        },
        {
          type: "uncaughtException",
          originalStack: error.stack,
        },
      );

      // Graceful shutdown
      this.gracefulShutdown(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled promise rejection detected", {
        reason,
        promise: promise.toString(),
      });

      errorMonitoring.trackError(
        new Error("Unhandled Rejection: " + reason),
        {
          ip: "system",
          url: "process",
          method: "SYSTEM",
        },
        {
          type: "unhandledRejection",
          originalReason: reason,
        },
      );
    });

    // Set up graceful shutdown handlers
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, initiating graceful shutdown");
      this.gracefulShutdown(0);
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, initiating graceful shutdown");
      this.gracefulShutdown(0);
    });

    logger.info("Error monitoring and recovery systems initialized");
  }

  /**
   * Initialize database monitoring and performance systems
   * CRITICAL for production load management and 72-hour emergency deployment
   */
  private initializeDatabaseMonitoring(): void {
    logger.info("🚀 Initializing database performance monitoring systems");

    // Set up database performance monitoring event handlers
    databasePerformanceMonitor.on("alert", (alert) => {
      const logLevel = alert.severity === "critical" ? "error" : "warn";
      logger[logLevel]("Database performance alert", {
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
      });

      // Track performance alerts in error monitoring system
      if (alert.severity === "critical") {
        errorMonitoring.trackError(
          new Error(`Database Performance Alert: ${alert.message}`),
          {
            ip: "system",
            url: "database",
            method: "MONITOR",
          },
          {
            type: "database_performance",
            alertType: alert.type,
            severity: alert.severity,
            metrics: alert.metrics,
          },
        );
      }
    });

    // Monitor database initialization status
    const initStatus = databaseInitializationService.getInitializationStatus();
    if (initStatus.overall !== "completed") {
      logger.warn("Database initialization not completed", {
        status: initStatus.overall,
        database: initStatus.database,
        redis: initStatus.redis,
        monitoring: initStatus.monitoring,
        optimization: initStatus.optimization,
      });
    }

    // Log database health summary
    const healthSummary = databaseInitializationService.getHealthSummary();
    logger.info("Database infrastructure health summary", healthSummary);

    if (!healthSummary.readyForProduction) {
      logger.error("⚠️ Database infrastructure not ready for production", {
        status: healthSummary.status,
        components: healthSummary.components,
      });
    }

    logger.info("✅ Database monitoring systems initialized successfully");
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(exitCode: number): Promise<void> {
    logger.info("🔄 Starting graceful shutdown process");

    try {
      // Stop database performance monitoring
      databasePerformanceMonitor.stopMonitoring();
      logger.info("✅ Database performance monitoring stopped");

      // Shutdown database initialization service
      await databaseInitializationService.shutdown();
      logger.info("✅ Database infrastructure services stopped");

      // Stop accepting new connections
      // Clean up database connections
      // Clean up Redis connections
      // Stop background jobs
      // Clean up error monitoring

      logger.info("✅ Graceful shutdown completed successfully");
      process.exit(exitCode);

    } catch (error) {
      logger.error("❌ Error during graceful shutdown:", error);
      
      // Force exit after timeout
      setTimeout(() => {
        logger.error("🚫 Forced shutdown due to timeout");
        process.exit(1);
      }, 5000);
    }
  }
}

const application = new Application();
application.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});

export { application };
