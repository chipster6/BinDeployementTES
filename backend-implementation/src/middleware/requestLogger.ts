/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REQUEST LOGGER MIDDLEWARE
 * ============================================================================
 * 
 * Custom request logging middleware with performance tracking.
 * Provides detailed logging of HTTP requests and responses.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, httpLogger, performanceLogger, Timer } from '@/utils/logger';
import { config } from '@/config';

/**
 * Extended Request interface with timing and ID
 */
interface ExtendedRequest extends Request {
  requestId?: string;
  startTime?: number;
  timer?: Timer;
}

/**
 * Sanitize sensitive data from request body
 */
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'credit_card', 'ssn', 'social_security', 'bank_account',
    'api_key', 'access_token', 'refresh_token'
  ];

  const sanitized = { ...body };

  const sanitizeObject = (obj: any, path: string = ''): any => {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field) || fullPath.toLowerCase().includes(field)
      );

      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key], fullPath);
      }
    });

    return obj;
  };

  return sanitizeObject(sanitized);
};

/**
 * Sanitize sensitive headers
 */
const sanitizeHeaders = (headers: any): any => {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization', 'cookie', 'x-api-key', 'x-auth-token',
    'x-access-token', 'x-refresh-token', 'x-session-token'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Get client IP address
 */
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  const cfConnectingIP = req.headers['cf-connecting-ip'] as string;
  
  return cfConnectingIP || realIP || forwarded?.split(',')[0] || req.connection.remoteAddress || 'unknown';
};

/**
 * Get user agent information
 */
const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Determine if request should be logged
 */
const shouldLog = (req: Request): boolean => {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return false;
  }

  // Skip static files in production
  if (config.app.nodeEnv === 'production' && req.path.startsWith('/uploads')) {
    return false;
  }

  // Skip OPTIONS requests unless in debug mode
  if (req.method === 'OPTIONS' && !config.app.debugSql) {
    return false;
  }

  return true;
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();
  req.timer = new Timer(`Request: ${req.method} ${req.path}`);

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Skip logging if not needed
  if (!shouldLog(req)) {
    return next();
  }

  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Log incoming request
  const requestData = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    body: config.app.nodeEnv === 'development' ? sanitizeBody(req.body) : undefined,
    headers: config.app.debugSql ? sanitizeHeaders(req.headers) : {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': userAgent,
    },
    ip: clientIP,
    userAgent,
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id,
  };

  logger.http('Incoming request', requestData);

  // Capture response data
  const originalSend = res.send;
  let responseBody: any;

  res.send = function(data) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Log response when request completes
  res.on('finish', () => {
    const duration = Date.now() - req.startTime!;
    const statusCategory = Math.floor(res.statusCode / 100);

    const responseData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      responseSize: Buffer.isBuffer(responseBody) ? responseBody.length : 
                   typeof responseBody === 'string' ? responseBody.length : 0,
      ip: clientIP,
      userAgent,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    };

    // Choose log level based on status code
    let logLevel = 'info';
    if (statusCategory === 4) { // 4xx errors
      logLevel = 'warn';
      responseData.body = config.app.nodeEnv === 'development' ? 
        JSON.stringify(responseBody).substring(0, 500) : undefined;
    } else if (statusCategory === 5) { // 5xx errors
      logLevel = 'error';
      responseData.body = config.app.nodeEnv === 'development' ? 
        JSON.stringify(responseBody).substring(0, 500) : undefined;
    }

    logger.log(logLevel, 'Request completed', responseData);

    // Log to HTTP logger for access logs
    httpLogger.http('HTTP Request', {
      ...requestData,
      ...responseData,
      responseTime: duration,
    });

    // Log slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      performanceLogger.warn('Slow request detected', {
        ...responseData,
        threshold: '1000ms',
        performance: 'slow',
      });
    }

    // End the timer
    if (req.timer) {
      req.timer.end({
        statusCode: res.statusCode,
        route: req.route?.path || req.path,
        method: req.method,
      });
    }
  });

  // Log response errors
  res.on('error', (error) => {
    logger.error('Response error', {
      requestId,
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      ip: clientIP,
      userId: (req as any).user?.id,
    });
  });

  next();
};

/**
 * Express Morgan format for combined logs
 */
export const morganFormat = config.app.nodeEnv === 'production' 
  ? 'combined'
  : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * Custom Morgan tokens
 */
export const setupMorganTokens = (morgan: any) => {
  // Request ID token
  morgan.token('request-id', (req: ExtendedRequest) => req.requestId || 'unknown');
  
  // User ID token
  morgan.token('user-id', (req: any) => req.user?.id || 'anonymous');
  
  // Response time in milliseconds
  morgan.token('response-time-ms', (req: any, res: any) => {
    if (!req._startTime) return '0';
    const diff = process.hrtime(req._startTime);
    return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
  });

  // Request body size
  morgan.token('req-body-size', (req: any) => {
    return req.headers['content-length'] || '0';
  });

  // Custom combined format with additional fields
  morgan.format('custom', 
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" ' +
    ':status :res[content-length] ":referrer" ":user-agent" ' +
    ':response-time-ms ms :request-id'
  );
};

/**
 * Request context middleware (adds common context to all requests)
 */
export const requestContext = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  // Add common request metadata
  (req as any).context = {
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ip: getClientIP(req),
    userAgent: getUserAgent(req),
    method: req.method,
    path: req.path,
    url: req.originalUrl,
  };

  next();
};

/**
 * API response time header middleware
 */
export const responseTimeHeader = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

// Export middleware and utilities
export default requestLogger;