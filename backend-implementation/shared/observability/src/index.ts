/**
 * ============================================================================
 * SHARED OBSERVABILITY - LOGGING, TRACING, METRICS
 * ============================================================================
 * 
 * Centralized observability utilities for consistent logging, tracing,
 * and metrics collection across all services.
 */

import winston from 'winston';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { register as metricsRegister, Counter, Histogram, Gauge } from 'prom-client';
import type { TraceContext, LogContext } from '@waste-mgmt/types';

// =============================================================================
// STRUCTURED LOGGER
// =============================================================================

export interface LoggerOptions {
  service: string;
  level?: 'error' | 'warn' | 'info' | 'debug';
  format?: 'json' | 'simple';
  enableConsole?: boolean;
  enableFile?: boolean;
  filepath?: string;
}

export class StructuredLogger {
  private logger: winston.Logger;
  private service: string;

  constructor(options: LoggerOptions) {
    this.service = options.service;
    
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    if (options.format === 'simple') {
      formats.push(winston.format.simple());
    }

    const transports: winston.transport[] = [];

    if (options.enableConsole !== false) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    if (options.enableFile && options.filepath) {
      transports.push(new winston.transports.File({
        filename: options.filepath,
        format: winston.format.json()
      }));
    }

    this.logger = winston.createLogger({
      level: options.level || 'info',
      format: winston.format.combine(...formats),
      defaultMeta: {
        service: this.service,
        environment: process.env.NODE_ENV || 'development'
      },
      transports
    });
  }

  private enrichContext(
    message: string, 
    context?: LogContext, 
    meta?: Record<string, any>
  ): Record<string, any> {
    return {
      message,
      service: this.service,
      operation: context?.operation,
      user_id: context?.user_id,
      organization_id: context?.organization_id,
      trace_id: context?.trace_context?.trace_id,
      span_id: context?.trace_context?.span_id,
      ...context,
      ...meta
    };
  }

  error(message: string, context?: LogContext, meta?: Record<string, any>): void {
    this.logger.error(this.enrichContext(message, context, meta));
  }

  warn(message: string, context?: LogContext, meta?: Record<string, any>): void {
    this.logger.warn(this.enrichContext(message, context, meta));
  }

  info(message: string, context?: LogContext, meta?: Record<string, any>): void {
    this.logger.info(this.enrichContext(message, context, meta));
  }

  debug(message: string, context?: LogContext, meta?: Record<string, any>): void {
    this.logger.debug(this.enrichContext(message, context, meta));
  }
}

// =============================================================================
// DISTRIBUTED TRACING
// =============================================================================

export class TracingManager {
  private tracer: any;
  
  constructor(serviceName: string, version: string = '1.0.0') {
    // Initialize OpenTelemetry tracer
    this.tracer = trace.getTracer(serviceName, version);
  }

  /**
   * Start a new span
   */
  startSpan(name: string, parentContext?: TraceContext): Span {
    const span = this.tracer.startSpan(name, {
      parent: parentContext ? this.createSpanContext(parentContext) : undefined
    });
    
    return span;
  }

  /**
   * Create span context from TraceContext
   */
  private createSpanContext(traceContext: TraceContext) {
    // This would typically use OpenTelemetry context propagation
    return context.active();
  }

  /**
   * Wrap async operation with tracing
   */
  async traceOperation<T>(
    operationName: string,
    operation: (span: Span) => Promise<T>,
    parentContext?: TraceContext
  ): Promise<T> {
    const span = this.startSpan(operationName, parentContext);
    
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Extract trace context from current span
   */
  getCurrentTraceContext(): TraceContext | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) return null;

    const spanContext = activeSpan.spanContext();
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
      parent_span_id: undefined // Would need parent tracking
    };
  }
}

// =============================================================================
// PROMETHEUS METRICS
// =============================================================================

export class MetricsCollector {
  private counters = new Map<string, Counter<string>>();
  private histograms = new Map<string, Histogram<string>>();
  private gauges = new Map<string, Gauge<string>>();

  constructor(private serviceName: string) {
    // Clear existing metrics to avoid conflicts
    metricsRegister.clear();
  }

  /**
   * Get or create a counter metric
   */
  getCounter(name: string, help: string, labels: string[] = []): Counter<string> {
    const fullName = `${this.serviceName}_${name}_total`;
    
    if (!this.counters.has(fullName)) {
      this.counters.set(fullName, new Counter({
        name: fullName,
        help,
        labelNames: ['service', ...labels],
        registers: [metricsRegister]
      }));
    }
    
    return this.counters.get(fullName)!;
  }

  /**
   * Get or create a histogram metric
   */
  getHistogram(name: string, help: string, buckets?: number[], labels: string[] = []): Histogram<string> {
    const fullName = `${this.serviceName}_${name}`;
    
    if (!this.histograms.has(fullName)) {
      this.histograms.set(fullName, new Histogram({
        name: fullName,
        help,
        buckets,
        labelNames: ['service', ...labels],
        registers: [metricsRegister]
      }));
    }
    
    return this.histograms.get(fullName)!;
  }

  /**
   * Get or create a gauge metric
   */
  getGauge(name: string, help: string, labels: string[] = []): Gauge<string> {
    const fullName = `${this.serviceName}_${name}`;
    
    if (!this.gauges.has(fullName)) {
      this.gauges.set(fullName, new Gauge({
        name: fullName,
        help,
        labelNames: ['service', ...labels],
        registers: [metricsRegister]
      }));
    }
    
    return this.gauges.get(fullName)!;
  }

  /**
   * Increment request counter
   */
  incrementRequestCount(method: string, endpoint: string, status: number): void {
    const counter = this.getCounter(
      'http_requests',
      'Total HTTP requests',
      ['method', 'endpoint', 'status']
    );
    
    counter.inc({
      service: this.serviceName,
      method,
      endpoint,
      status: status.toString()
    });
  }

  /**
   * Record request duration
   */
  recordRequestDuration(method: string, endpoint: string, duration: number): void {
    const histogram = this.getHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10], // Default buckets
      ['method', 'endpoint']
    );
    
    histogram.observe({
      service: this.serviceName,
      method,
      endpoint
    }, duration);
  }

  /**
   * Set active connections gauge
   */
  setActiveConnections(count: number): void {
    const gauge = this.getGauge('active_connections', 'Number of active connections');
    gauge.set({ service: this.serviceName }, count);
  }

  /**
   * Get metrics in Prometheus format
   */
  getMetrics(): Promise<string> {
    return metricsRegister.metrics();
  }
}

// =============================================================================
// PERFORMANCE TIMER
// =============================================================================

export class Timer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * End timer and return duration
   */
  end(metadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    
    // Could emit to structured logger or metrics here
    console.debug(`Timer: ${this.operation} took ${duration}ms`, metadata);
    
    return duration;
  }

  /**
   * Get current elapsed time without ending
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

// =============================================================================
// UNIFIED OBSERVABILITY CLIENT
// =============================================================================

export class ObservabilityClient {
  public logger: StructuredLogger;
  public tracing: TracingManager;
  public metrics: MetricsCollector;

  constructor(
    serviceName: string,
    options: Partial<LoggerOptions> = {}
  ) {
    this.logger = new StructuredLogger({
      service: serviceName,
      ...options
    });
    
    this.tracing = new TracingManager(serviceName);
    this.metrics = new MetricsCollector(serviceName);
  }

  /**
   * Create performance timer
   */
  createTimer(operation: string): Timer {
    return new Timer(operation);
  }

  /**
   * Health check endpoint helper
   */
  createHealthCheck() {
    return async (req: any, res: any) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: this.logger['service'],
        version: process.env.SERVICE_VERSION || '1.0.0',
        uptime: process.uptime()
      };

      res.status(200).json(health);
    };
  }

  /**
   * Metrics endpoint helper
   */
  createMetricsEndpoint() {
    return async (req: any, res: any) => {
      try {
        const metrics = await this.metrics.getMetrics();
        res.set('Content-Type', metricsRegister.contentType);
        res.end(metrics);
      } catch (error) {
        res.status(500).json({
          error: 'metrics_unavailable',
          message: 'Failed to collect metrics'
        });
      }
    };
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

export function createObservabilityMiddleware(observability: ObservabilityClient) {
  return (req: any, res: any, next: any) => {
    const timer = observability.createTimer(`${req.method} ${req.path}`);
    
    // Extract or create trace context
    const traceContext: TraceContext = {
      trace_id: req.headers['x-trace-id'] || `trace-${Date.now()}-${Math.random()}`,
      span_id: `span-${Date.now()}-${Math.random()}`,
      parent_span_id: req.headers['x-parent-span-id']
    };

    // Add to request for downstream use
    req.trace_context = traceContext;

    // Log incoming request
    observability.logger.info('Incoming request', {
      service: observability.logger['service'],
      operation: `${req.method} ${req.path}`,
      trace_context: traceContext,
      user_id: req.user?.id,
      ip_address: req.ip
    });

    // Track metrics
    const originalSend = res.send;
    res.send = function(body: any) {
      const duration = timer.end();
      
      // Record metrics
      observability.metrics.incrementRequestCount(
        req.method,
        req.path,
        res.statusCode
      );
      
      observability.metrics.recordRequestDuration(
        req.method,
        req.path,
        duration / 1000 // Convert to seconds
      );

      // Log response
      observability.logger.info('Request completed', {
        service: observability.logger['service'],
        operation: `${req.method} ${req.path}`,
        trace_context: traceContext,
        status_code: res.statusCode,
        duration_ms: duration
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Classes and functions are exported inline above
// Types are exported inline above