import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Security log format - sanitized for security events
const securityLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Sanitize sensitive data from security logs
    const sanitizedMeta = { ...meta };
    
    // Remove or mask sensitive fields
    if (sanitizedMeta.password) delete sanitizedMeta.password;
    if (sanitizedMeta.token) sanitizedMeta.token = '[REDACTED]';
    if (sanitizedMeta.secret) sanitizedMeta.secret = '[REDACTED]';
    if (sanitizedMeta.apiKey) sanitizedMeta.apiKey = '[REDACTED]';
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedMeta,
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'waste-management-system',
    version: '1.0.0',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test',
    }),
    
    // File transport for general logs
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
    
    // Separate file transport for errors
    new DailyRotateFile({
      level: 'error',
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
    
    // Security events log
    new DailyRotateFile({
      level: 'warn',
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d', // Keep security logs longer
      format: securityLogFormat,
      // Only log security-related events
      filter: (info) => info.securityEvent === true,
    }),
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directory might already exist
}

export default logger;