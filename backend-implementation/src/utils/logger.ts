/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - LOGGING UTILITY
 * ============================================================================
 *
 * Centralized logging configuration using Winston.
 * Provides structured logging with multiple transports and log levels.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import * as winston from "winston";
import * as path from "path";
import * as fs from "fs";
// DailyRotateFile is "export =" CJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DailyRotateFile = require("winston-daily-rotate-file");
import { config } from "@/config";

/**
 * Custom log format for consistent output
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : "";
    const stackString = stack ? `\n${stack}` : "";
    return `${timestamp} [${level}]: ${message}${metaString}${stackString}`;
  }),
);

/**
 * Development format (more readable)
 */
const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: "HH:mm:ss.SSS",
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    const stackString = stack ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
  }),
);

/**
 * Production format (JSON structured)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Create logger transports based on environment
 */
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: config.app.nodeEnv === "production" ? prodFormat : devFormat,
    }),
  );

  // File transports (only in non-test environment)
  if (config.app.nodeEnv !== "test") {
    // Error log file
    transports.push(
      new DailyRotateFile({
        filename: path.join("logs", "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "error",
        format: prodFormat,
        maxSize: config.logging.file.maxSize,
        maxFiles: config.logging.file.maxFiles,
        zippedArchive: true,
        handleExceptions: true,
        handleRejections: true,
      }),
    );

    // Combined log file
    transports.push(
      new DailyRotateFile({
        filename: path.join("logs", "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: prodFormat,
        maxSize: config.logging.file.maxSize,
        maxFiles: config.logging.file.maxFiles,
        zippedArchive: true,
        handleExceptions: true,
        handleRejections: true,
      }),
    );

    // Access log file (for HTTP requests)
    transports.push(
      new DailyRotateFile({
        filename: path.join("logs", "access-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "http",
        format: prodFormat,
        maxSize: config.logging.file.maxSize,
        maxFiles: config.logging.file.maxFiles,
        zippedArchive: true,
      }),
    );

    // Audit log file (for compliance)
    if (config.compliance.audit.enabled) {
      transports.push(
        new DailyRotateFile({
          filename: path.join("logs", "audit-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
          maxSize: config.logging.file.maxSize,
          maxFiles: `${config.compliance.audit.retentionDays}d`,
          zippedArchive: true,
        }),
      );
    }
  }

  return transports;
};

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: createTransports(),
  exitOnError: false,
  silent: config.app.nodeEnv === "test" && !process.env.ENABLE_LOGGING_IN_TESTS,
});

/**
 * Audit logger for compliance logging
 */
export const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: config.compliance.audit.enabled
    ? [
        new DailyRotateFile({
          filename: path.join("logs", "audit-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: config.logging.file.maxSize,
          maxFiles: `${config.compliance.audit.retentionDays}d`,
          zippedArchive: true,
        }),
      ]
    : [],
  silent: !config.compliance.audit.enabled,
});

/**
 * Security logger for security events
 */
export const securityLogger = winston.createLogger({
  level: "warn",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: devFormat,
    }),
    ...(config.app.nodeEnv !== "test"
      ? [
          new DailyRotateFile({
            filename: path.join("logs", "security-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: config.logging.file.maxSize,
            maxFiles: config.logging.file.maxFiles,
            zippedArchive: true,
          }),
        ]
      : []),
  ],
  silent: config.app.nodeEnv === "test" && !process.env.ENABLE_LOGGING_IN_TESTS,
});

/**
 * Performance logger for monitoring slow operations
 */
export const performanceLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    ...(config.app.nodeEnv !== "test"
      ? [
          new DailyRotateFile({
            filename: path.join("logs", "performance-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: config.logging.file.maxSize,
            maxFiles: "7d", // Keep performance logs for 7 days
            zippedArchive: true,
          }),
        ]
      : []),
  ],
  silent: config.app.nodeEnv === "test",
});

/**
 * HTTP request logger (used by Morgan middleware)
 */
export const httpLogger = winston.createLogger({
  level: "http",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    ...(config.app.nodeEnv !== "test" && config.logging.enableRequestLogging
      ? [
          new DailyRotateFile({
            filename: path.join("logs", "http-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: config.logging.file.maxSize,
            maxFiles: "30d", // Keep HTTP logs for 30 days
            zippedArchive: true,
          }),
        ]
      : []),
  ],
  silent: config.app.nodeEnv === "test" || !config.logging.enableRequestLogging,
});

/**
 * Log structured event with additional context
 */
export const logEvent = (
  level: string,
  event: string,
  data: Record<string, any> = {},
  userId?: string,
  ip?: string,
) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    userId,
    ip,
    environment: config.app.nodeEnv,
    version: config.app.version,
    ...data,
  };

  logger.log(level, `Event: ${event}`, logData);
};

/**
 * Log security event
 */
export const logSecurityEvent = (
  event: string,
  data: Record<string, any> = {},
  userId?: string,
  ip?: string,
  severity: "low" | "medium" | "high" | "critical" = "medium",
) => {
  const logData = {
    event,
    severity,
    timestamp: new Date().toISOString(),
    userId,
    ip,
    environment: config.app.nodeEnv,
    ...data,
  };

  securityLogger.warn(`Security Event: ${event}`, logData);

  // Also log to audit logger if enabled
  if (config.compliance.audit.enabled) {
    auditLogger.info(`Security Event: ${event}`, logData);
  }
};

/**
 * Log audit event for compliance
 */
export const logAuditEvent = (
  action: string,
  resource: string,
  data: Record<string, any> = {},
  userId?: string,
  ip?: string,
) => {
  if (!config.compliance.audit.enabled) return;

  const logData = {
    action,
    resource,
    timestamp: new Date().toISOString(),
    userId,
    ip,
    environment: config.app.nodeEnv,
    ...data,
  };

  auditLogger.info(`Audit: ${action} on ${resource}`, logData);
};

/**
 * Log performance metrics
 */
export const logPerformance = (
  operation: string,
  duration: number,
  data: Record<string, any> = {},
) => {
  const logData = {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...data,
  };

  performanceLogger.info(
    `Performance: ${operation} took ${duration}ms`,
    logData,
  );

  // Log warning for slow operations
  if (duration > 5000) {
    // 5 seconds
    logger.warn(
      `Slow operation detected: ${operation} took ${duration}ms`,
      logData,
    );
  }
};

/**
 * Create child logger with additional context
 */
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Timer utility for measuring operation duration
 */
export class Timer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * End timer and log duration
   */
  end(additionalData?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    logPerformance(this.name, duration, additionalData);
    return duration;
  }

  /**
   * Get current duration without ending timer
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Error logging with stack trace
 */
export const logError = (
  error: Error | string,
  context: Record<string, any> = {},
  userId?: string,
  ip?: string,
) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    userId,
    ip,
    environment: config.app.nodeEnv,
    ...context,
  };

  if (error instanceof Error) {
    logger.error(error instanceof Error ? error?.message : String(error), {
      ...errorData,
      stack: error instanceof Error ? error?.stack : undefined,
      name: error.name,
    });
  } else {
    logger.error(error, errorData);
  }
};

/**
 * Log database operations
 */
export const logDatabaseOperation = (
  operation: string,
  table: string,
  duration?: number,
  rowsAffected?: number,
) => {
  const logData = {
    operation,
    table,
    duration,
    rowsAffected,
    timestamp: new Date().toISOString(),
  };

  logger.debug(`DB Operation: ${operation} on ${table}`, logData);

  if (duration && duration > 1000) {
    // Log slow queries
    logger.warn(
      `Slow database query: ${operation} on ${table} took ${duration}ms`,
      logData,
    );
  }
};



/**
 * Ensure logs directory exists
 */
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export DailyRotateFile for other modules that need it
export { DailyRotateFile };

// Export default logger
export default logger;
