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
// SECURITY HARDENING IMPORTS
import { tieredRateLimit, rateLimitMonitoring } from "@/middleware/tieredRateLimit";
import { 
  requestSizeSecurityStack, 
  emergencyRequestSizeBlocker 
} from "@/middleware/requestSizeSecurity";

export class MiddlewareService {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public initialize(): void {
    logger.info("Initializing middleware with security hardening...");

    if (config.security.trustProxy) {
      this.app.set("trust proxy", 1);
    }

    // CRITICAL: Emergency request size blocker (first line of defense)
    this.app.use(emergencyRequestSizeBlocker);
    
    // Enhanced helmet configuration for production
    this.app.use(helmet(config.security.helmet));
    this.app.use(cors(config.cors));

    // Compression middleware
    if (config.performance.enableCompression) {
      this.app.use(compression(config.performance.compression));
    }

    // SECURITY HARDENED: Request size validation stack
    this.app.use(requestSizeSecurityStack);

    // Body parsing with secure size limits
    this.app.use(
      express.json({
        limit: '1mb', // Hardened limit
        strict: true,
        verify: (req, res, buf) => {
          // Additional verification for JSON payloads
          if (buf.length > 1024 * 1024) { // 1MB check
            const error = new Error('Request size too large');
            error.name = 'PayloadTooLargeError';
            throw error;
          }
        }
      }),
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: '1mb', // Hardened limit
        verify: (req, res, buf) => {
          // Additional verification for URL encoded payloads
          if (buf.length > 1024 * 1024) { // 1MB check
            const error = new Error('Request size too large');
            error.name = 'PayloadTooLargeError';
            throw error;
          }
        }
      }),
    );
    this.app.use(cookieParser(config.security.sessionSecret));

    // Request logging with security monitoring
    if (config.logging.enableRequestLogging) {
      this.app.use(
        morgan("combined", {
          stream: { write: (message) => logger.info(message.trim()) },
        }),
      );
      this.app.use(requestLogger);
    }

    // SECURITY HARDENED: Rate limiting monitoring
    this.app.use(rateLimitMonitoring);

    // SECURITY HARDENED: Tiered rate limiting (replaces simple rate limiting)
    this.app.use("/api", ...tieredRateLimit);
    
    // Enhanced security middleware
    this.app.use(securityMiddleware);

    // Health check endpoints (exempt from heavy rate limiting)
    this.app.get("/health", healthCheck);
    this.app.get("/api/health", healthCheck);

    logger.info("Middleware initialized successfully with security hardening");
  }
}
