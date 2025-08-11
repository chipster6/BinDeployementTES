import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import { requestLogger } from "@/middleware/requestLogger";
import { securityMiddleware } from "@/middleware/security";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { healthCheck } from "@/utils/healthCheck";

export class MiddlewareService {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public initialize(): void {
    logger.info("Initializing middleware...");

    if (config.security.trustProxy) {
      this.app.set("trust proxy", 1);
    }

    this.app.use(helmet(config.security.helmet));
    this.app.use(cors(config.cors));

    if (config.performance.enableCompression) {
      this.app.use(compression(config.performance.compression));
    }

    this.app.use(
      express.json({
        limit: config.performance.requestSizeLimit,
        strict: true,
      }),
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: config.performance.requestSizeLimit,
      }),
    );
    this.app.use(cookieParser(config.security.sessionSecret));

    if (config.logging.enableRequestLogging) {
      this.app.use(
        morgan("combined", {
          stream: { write: (message) => logger.info(message.trim()) },
        }),
      );
      this.app.use(requestLogger);
    }

    this.app.use("/api", rateLimitMiddleware);
    this.app.use(securityMiddleware);

    this.app.get("/health", healthCheck);
    this.app.get("/api/health", healthCheck);

    logger.info("Middleware initialized successfully");
  }
}
