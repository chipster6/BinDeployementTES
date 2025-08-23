/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CORRELATION ID MIDDLEWARE
 * ============================================================================
 *
 * Correlation ID middleware for request tracing across microservices.
 * Implements distributed tracing capabilities for comprehensive security
 * monitoring and SIEM integration.
 *
 * Features:
 * - Automatic correlation ID generation and propagation
 * - Request context preservation across async operations
 * - Integration with existing logger system
 * - SIEM-compatible correlation tracking
 * - Performance monitoring integration
 * - Security event correlation support
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-22
 * Version: 1.0.0
 */

import { Request, type Response, type NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import { logger, Timer } from '@/utils/logger';
import { config } from '@/config';

/**
 * Correlation context interface
 */
export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  sessionId?: string;
  userId?: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  metadata: {
    source: string;
    method: string;
    path: string;
    userAgent?: string;
    clientIp?: string;
    requestSize?: number;
    responseSize?: number;
  };
}

/**
 * Extended Request interface with correlation context
 */
export interface CorrelationRequest extends Request {
  correlationId: string;
  requestId: string;
  traceId: string;
  spanId: string;
  correlationContext: CorrelationContext;
}

/**
 * Async local storage for correlation context
 */
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * =============================================================================
 * CORRELATION ID MIDDLEWARE
 * =============================================================================
 */

/**
 * Generate cryptographically secure correlation ID
 */
function generateCorrelationId(): string {
  return `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generate trace ID for distributed tracing
 */
function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate span ID for request spans
 */
function generateSpanId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Extract correlation ID from headers or generate new one
 */
function extractOrGenerateCorrelationId(req: Request): string {
  // Check various header formats
  const headerSources = [
    'x-correlation-id',
    'x-request-id',
    'correlation-id',
    'request-id',
    'x-trace-id'
  ];

  for (const header of headerSources) {
    const value = req.headers[header];
    if (value && typeof value === 'string') {
      // Validate correlation ID format
      if (/^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 8 && value.length <= 128) {
        return value;
      }
    }
  }

  return generateCorrelationId();
}

/**
 * Extract trace information from headers
 */
function extractTraceInfo(req: Request): { traceId: string; spanId: string; parentSpanId?: string } {
  const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();
  const spanId = generateSpanId();
  const parentSpanId = req.headers['x-parent-span-id'] as string;

  return { traceId, spanId, parentSpanId };
}

/**
 * Main correlation ID middleware
 */
export const correlationMiddleware = (
  req: CorrelationRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  try {
    // Extract or generate correlation information
    const correlationId = extractOrGenerateCorrelationId(req);
    const requestId = generateRequestId();
    const { traceId, spanId, parentSpanId } = extractTraceInfo(req);

    // Create correlation context
    const correlationContext: CorrelationContext = {
      correlationId,
      requestId,
      sessionId: req.headers['x-session-id'] as string,
      userId: (req as any).user?.id,
      traceId,
      spanId,
      parentSpanId,
      startTime
    };

    // Attach to request object
    req.correlationId = correlationId;
    req.requestId = requestId;
    req.traceId = traceId;
    req.spanId = spanId;
    req.correlationContext = correlationContext;

    // Set response headers for downstream services
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Span-ID', spanId);

    // Log request start with correlation info
    logger.info('Request started', {
      correlationId,
      requestId,
      traceId,
      spanId,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      clientIp: req.ip,
      userId: correlationContext.userId,
      sessionId: correlationContext.sessionId
    });

    // Capture response metrics
    const originalSend = res.send;
    res.send = function(body: any) {
      correlationContext.metadata.responseSize = Buffer.byteLength(body || '', 'utf8');
      
      // Log request completion
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        correlationId,
        requestId,
        traceId,
        spanId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestSize: correlationContext.metadata.requestSize,
        responseSize: correlationContext.metadata.responseSize,
        userId: correlationContext.userId
      });

      return originalSend.call(this, body);
    };

    // Run the rest of the middleware stack within correlation context
    correlationStorage.run(correlationContext, () => {
      next();
    });

  } catch (error: unknown) {
    logger.error('Correlation middleware error', {
      error: error instanceof Error ? error?.message : String(error),
      path: req.path,
      method: req.method
    });
    
    // Continue without correlation context if there's an error
    next();
  }
};

/**
 * =============================================================================
 * CORRELATION UTILITIES
 * =============================================================================
 */

/**
 * Get current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | undefined {
  const context = getCorrelationContext();
  return context?.correlationId;
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  const context = getCorrelationContext();
  return context?.requestId;
}

/**
 * Get current trace ID
 */
export function getTraceId(): string | undefined {
  const context = getCorrelationContext();
  return context?.traceId;
}

/**
 * Create child span for nested operations
 */
export function createChildSpan(operationName: string): {
  spanId: string;
  parentSpanId: string;
  traceId: string;
  correlationId: string;
} {
  const context = getCorrelationContext();
  if (!context) {
    throw new Error('No correlation context available');
  }

  const childSpanId = generateSpanId();
  
  logger.debug('Child span created', {
    operationName,
    childSpanId,
    parentSpanId: context.spanId,
    traceId: context.traceId,
    correlationId: context.correlationId
  });

  return {
    spanId: childSpanId,
    parentSpanId: context.spanId,
    traceId: context.traceId,
    correlationId: context.correlationId
  };
}

/**
 * Execute function within correlation context
 */
export function runWithCorrelation<T>(
  context: CorrelationContext,
  fn: () => T
): T {
  return correlationStorage.run(context, fn);
}

/**
 * Enhanced logger with correlation context
 */
export const correlatedLogger = {
  debug: (message: string, meta: any = {}) => {
    const context = getCorrelationContext();
    logger.debug(message, {
      ...meta,
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      traceId: context?.traceId,
      spanId: context?.spanId
    });
  },

  info: (message: string, meta: any = {}) => {
    const context = getCorrelationContext();
    logger.info(message, {
      ...meta,
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      traceId: context?.traceId,
      spanId: context?.spanId
    });
  },

  warn: (message: string, meta: any = {}) => {
    const context = getCorrelationContext();
    logger.warn(message, {
      ...meta,
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      traceId: context?.traceId,
      spanId: context?.spanId
    });
  },

  error: (message: string, meta: any = {}) => {
    const context = getCorrelationContext();
    logger.error(message, {
      ...meta,
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      traceId: context?.traceId,
      spanId: context?.spanId
    });
  }
};

/**
 * Timer with correlation context
 */
export class CorrelatedTimer extends Timer {
  private correlationId: string;
  private traceId: string;
  private spanId: string;

  constructor(name: string) {
    super(name);
    const context = getCorrelationContext();
    this.correlationId = context?.correlationId || 'unknown';
    this.traceId = context?.traceId || 'unknown';
    this.spanId = context?.spanId || 'unknown';
  }

  end(additionalData?: Record<string, any>): number {
    const duration = super.end({
      ...additionalData,
      correlationId: this.correlationId,
      traceId: this.traceId,
      spanId: this.spanId
    });

    return duration;
  }
}

/**
 * HTTP client wrapper with correlation propagation
 */
export function getCorrelatedHeaders(): Record<string, string> {
  const context = getCorrelationContext();
  if (!context) {
    return {};
  }

  return {
    'X-Correlation-ID': context.correlationId,
    'X-Request-ID': context.requestId,
    'X-Trace-ID': context.traceId,
    'X-Parent-Span-ID': context.spanId,
    ...(context.sessionId && { 'X-Session-ID': context.sessionId }),
    ...(context.userId && { 'X-User-ID': context.userId })
  };
}

/**
 * Database query wrapper with correlation
 */
export function withCorrelationContext<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const context = getCorrelationContext();
  const timer = new CorrelatedTimer(`db.${operation}`);

  correlatedLogger.debug(`Database operation started: ${operation}`);

  return fn()
    .then(result => {
      timer.end({ success: true });
      correlatedLogger.debug(`Database operation completed: ${operation}`);
      return result;
    })
    .catch(error => {
      timer.end({ success: false, error: error instanceof Error ? error?.message : String(error) });
      correlatedLogger.error(`Database operation failed: ${operation}`, {
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    });
}

/**
 * Express middleware for API routes with correlation
 */
export function withCorrelatedLogging(routeName: string) {
  return (req: CorrelationRequest, res: Response, next: NextFunction) => {
    correlatedLogger.info(`Route handler started: ${routeName}`, {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    });

    const timer = new CorrelatedTimer(`route.${routeName}`);

    res.on('finish', () => {
      timer.end({
        statusCode: res.statusCode,
        method: req.method,
        path: req.path
      });

      correlatedLogger.info(`Route handler completed: ${routeName}`, {
        statusCode: res.statusCode,
        method: req.method,
        path: req.path
      });
    });

    next();
  };
}

/**
 * SIEM integration helper
 */
export function getSIEMCorrelationData(): {
  correlationId: string;
  traceId: string;
  requestFlow: string[];
} | null {
  const context = getCorrelationContext();
  if (!context) {
    return null;
  }

  return {
    correlationId: context.correlationId,
    traceId: context.traceId,
    requestFlow: [
      `${context.metadata.method} ${context.metadata.path}`,
      `User: ${context?.userId || 'anonymous'}`,
      `Session: ${context?.sessionId || 'none'}`,
      `Duration: ${Date.now() - context.startTime}ms`
    ]
  };
}

/**
 * Export correlation middleware as default
 */
export default correlationMiddleware;