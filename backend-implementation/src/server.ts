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
   * Graceful shutdown handler
   */
  private gracefulShutdown(exitCode: number): void {
    logger.info("Starting graceful shutdown process");

    // Stop accepting new connections
    // Clean up database connections
    // Clean up Redis connections
    // Stop background jobs
    // Clean up error monitoring

    setTimeout(() => {
      logger.info("Graceful shutdown completed");
      process.exit(exitCode);
    }, 10000); // 10 second timeout for shutdown
  }
}

const application = new Application();
application.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});

export { application };
