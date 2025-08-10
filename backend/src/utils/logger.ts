/**
 * Centralized Logging System
 * Winston-based logging with multiple transports, structured logging, and security compliance
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '@/config';

/**
 * Log levels (Winston standard)
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

/**
 * Custom log format for structured JSON logging
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'stack']
  }),
  winston.format.json()
);

/**
 * Custom log format for human-readable console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      const sanitizedMeta = sanitizeLogData(meta);
      log += ` ${JSON.stringify(sanitizedMeta)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

/**
 * Sanitize log data to remove sensitive information
 */
function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'credit_card',
    'ssn',
    'tax_id',
    'bank_account',
    'api_key',
    'access_token',
    'refresh_token',
    'jwt',
    'mfa_secret'
  ];

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      keyLower.includes(sensitiveKey)
    );

    if (isSensitive) {
      (sanitized as any)[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeLogData(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create file transport with daily rotation
 */
function createFileTransport(level: string, filename: string): DailyRotateFile {
  return new DailyRotateFile({
    level,
    filename: path.join(config.logging.filePath, `%DATE%-${filename}.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: jsonFormat,
    auditFile: path.join(config.logging.filePath, `${filename}-audit.json`),
    createSymlink: true,
    symlinkName: `${filename}-current.log`,
    zippedArchive: true,
  });
}

/**
 * Create Winston logger instance
 */
const createLogger = (): winston.Logger => {
  const transports: winston.transport[] = [];

  // Console transport (always enabled for development, optional for production)
  if (config.env === 'development' || config.env === 'test') {
    transports.push(
      new winston.transports.Console({
        level: config.logging.level,
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );
  }

  // File transports (disabled for test environment)
  if (config.env !== 'test') {
    // Error logs
    transports.push(createFileTransport('error', 'error'));

    // Combined logs
    transports.push(createFileTransport('info', 'combined'));

    // HTTP access logs
    transports.push(createFileTransport('http', 'access'));

    // Debug logs (only in development)
    if (config.env === 'development') {
      transports.push(createFileTransport('debug', 'debug'));
    }
  }

  return winston.createLogger({
    level: config.logging.level,
    levels: LOG_LEVELS,
    format: jsonFormat,
    defaultMeta: {
      service: 'waste-management-api',
      environment: config.env,
      version: '1.0.0'
    },
    transports,
    exceptionHandlers: config.env !== 'test' ? [
      createFileTransport('error', 'exceptions')
    ] : [],
    rejectionHandlers: config.env !== 'test' ? [
      createFileTransport('error', 'rejections')
    ] : [],
    exitOnError: false
  });
};

/**
 * Main logger instance
 */
export const logger = createLogger();

/**
 * Logger utility functions
 */
export class LoggerUtils {
  /**
   * Log API request
   */
  static logRequest(req: any, res: any, duration: number): void {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      requestId: req.requestId,
      component: 'api'
    };

    // Determine log level based on status code
    if (res.statusCode >= 400) {
      if (res.statusCode >= 500) {
        logger.error('HTTP Error', logData);
      } else {
        logger.warn('HTTP Warning', logData);
      }
    } else {
      logger.http('HTTP Request', logData);
    }
  }

  /**
   * Log database operation
   */
  static logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    recordId?: string,
    error?: Error
  ): void {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      recordId,
      component: 'database'
    };

    if (error) {
      logger.error('Database Error', { ...logData, error: error.message });
    } else {
      logger.debug('Database Operation', logData);
    }
  }

  /**
   * Log security event
   */
  static logSecurityEvent(
    eventType: string,
    userId?: string,
    ip?: string,
    details?: any
  ): void {
    const logData = {
      eventType,
      userId,
      ip,
      details: sanitizeLogData(details),
      component: 'security',
      severity: 'high'
    };

    logger.warn('Security Event', logData);
  }

  /**
   * Log authentication event
   */
  static logAuthEvent(
    event: 'login_success' | 'login_failed' | 'logout' | 'token_refresh' | 'mfa_enabled' | 'mfa_disabled',
    userId?: string,
    ip?: string,
    userAgent?: string,
    details?: any
  ): void {
    const logData = {
      event,
      userId,
      ip,
      userAgent,
      details: sanitizeLogData(details),
      component: 'authentication'
    };

    if (event === 'login_failed') {
      logger.warn('Authentication Failed', logData);
    } else {
      logger.info('Authentication Event', logData);
    }
  }

  /**
   * Log business operation
   */
  static logBusinessOperation(
    operation: string,
    entityType: string,
    entityId: string,
    userId: string,
    details?: any
  ): void {
    const logData = {
      operation,
      entityType,
      entityId,
      userId,
      details: sanitizeLogData(details),
      component: 'business'
    };

    logger.info('Business Operation', logData);
  }

  /**
   * Log performance metric
   */
  static logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    context?: any
  ): void {
    const logData = {
      metric,
      value,
      unit,
      context: sanitizeLogData(context),
      component: 'performance'
    };

    logger.info('Performance Metric', logData);
  }

  /**
   * Log external API call
   */
  static logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: Error
  ): void {
    const logData = {
      service,
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
      component: 'external_api'
    };

    if (error) {
      logger.error('External API Error', { ...logData, error: error.message });
    } else {
      logger.info('External API Call', logData);
    }
  }

  /**
   * Log background job
   */
  static logBackgroundJob(
    jobType: string,
    jobId: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
    error?: Error
  ): void {
    const logData = {
      jobType,
      jobId,
      status,
      duration: duration ? `${duration}ms` : undefined,
      component: 'background_job'
    };

    if (status === 'failed' && error) {
      logger.error('Background Job Failed', { ...logData, error: error.message });
    } else {
      logger.info('Background Job', logData);
    }
  }

  /**
   * Create child logger with additional context
   */
  static createChildLogger(context: Record<string, any>): winston.Logger {
    return logger.child(sanitizeLogData(context));
  }
}

/**
 * Stream interface for Morgan HTTP logging middleware
 */
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Log startup information
logger.info('Logger initialized', {
  level: config.logging.level,
  format: config.logging.format,
  environment: config.env,
  component: 'logger'
});

export default logger;