/**
 * ============================================================================
 * API GATEWAY - MICROSERVICES ENTRY POINT
 * ============================================================================
 * 
 * Central API Gateway that routes requests to appropriate services.
 * Handles cross-cutting concerns: authentication, rate limiting, tracing.
 */

import './types'; // Augment Express types
import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { 
  AuthorizationClient,
  createAuthMiddleware
} from '@waste-mgmt/authz';
import {
  ObservabilityClient,
  createObservabilityMiddleware
} from '@waste-mgmt/observability';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.GATEWAY_PORT || '3000'),
  
  // Service endpoints (will expand as we extract services)
  services: {
    monolith: {
      target: process.env.MONOLITH_URL || 'http://localhost:3001',
      pathRewrite: { '^/api/v1': '/api/v1' }
    },
    // Future service endpoints:
    // auth: { target: 'http://localhost:3002', pathRewrite: { '^/api/v1/auth': '/' } },
    // operations: { target: 'http://localhost:3003', pathRewrite: { '^/api/v1/operations': '/' } },
    // spatial: { target: 'http://localhost:3004', pathRewrite: { '^/api/v1/spatial': '/' } },
    // integration: { target: 'http://localhost:3005', pathRewrite: { '^/api/v1/integration': '/' } },
    // ai: { target: 'http://localhost:3006', pathRewrite: { '^/api/v1/ai': '/' } },
    // analytics: { target: 'http://localhost:3007', pathRewrite: { '^/api/v1/analytics': '/' } }
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-key',
    audience: process.env.JWT_AUDIENCE || 'waste-management'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // CORS settings  
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-ID', 'X-Parent-Span-ID']
  }
};

// =============================================================================
// INITIALIZE OBSERVABILITY & SECURITY
// =============================================================================

const observability = new ObservabilityClient('api-gateway', {
  level: process.env.LOG_LEVEL as any || 'info',
  enableConsole: true
});

const authClient = new AuthorizationClient(
  config.jwt.secret,
  config.jwt.audience
);

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors(config.cors));

// Compression
app.use(compression() as any);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit(config.rateLimit));

// Observability middleware (tracing, logging, metrics)
app.use(createObservabilityMiddleware(observability));

// =============================================================================
// HEALTH CHECKS & OBSERVABILITY ENDPOINTS
// =============================================================================

// Health check
app.get('/health', observability.createHealthCheck());

// Metrics (Prometheus format)
app.get('/metrics', observability.createMetricsEndpoint());

// Gateway status
app.get('/gateway/status', (req, res) => {
  res.json({
    gateway: 'api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      monolith: { 
        status: 'active',
        target: config.services.monolith.target
      }
      // Will add other services as they're extracted
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE (SELECTIVE)
// =============================================================================

// Public routes (no auth required)
const publicRoutes = [
  '/health',
  '/metrics', 
  '/gateway/status',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/webhooks'  // Webhooks have their own auth
];

// Apply auth middleware to protected routes
app.use((req, res, next) => {
  // Skip auth for public routes
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Apply auth middleware for protected routes
  const authMiddleware = createAuthMiddleware(authClient, {
    service_name: 'api-gateway',
    resource_extractor: (req) => {
      // Extract resource info from URL for fine-grained permissions
      const pathParts = req.path.split('/');
      if (pathParts.length >= 4) {
        return {
          type: pathParts[3], // e.g., 'customers', 'bins', 'routes'
          id: pathParts[4] || 'collection',
          // Additional context could be extracted here
        };
      }
      return undefined;
    }
  });
  
  authMiddleware(req, res, next);
});

// =============================================================================
// SERVICE ROUTING
// =============================================================================

// Monolith proxy (temporary - will be replaced by individual service proxies)
const proxyOptions: Options = {
  target: config.services.monolith.target,
  changeOrigin: true,
  pathRewrite: config.services.monolith.pathRewrite,
  
  // Forward headers for tracing
  on: {
    proxyReq: (proxyReq: any, req: any) => {
      if (req.trace_context) {
        proxyReq.setHeader('X-Trace-ID', req.trace_context.trace_id);
        proxyReq.setHeader('X-Span-ID', req.trace_context.span_id);
        proxyReq.setHeader('X-Parent-Span-ID', req.trace_context.span_id);
      }
      
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.user_id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-Organization-ID', req.user.organization_id);
      }
    },
    
    // Log proxy events
    proxyRes: (proxyRes: any, req: any) => {
      observability.logger.debug('Proxy response', {
        service: 'api-gateway',
        operation: 'proxy_response',
        target_service: 'monolith',
        status: proxyRes.statusCode,
        trace_context: req.trace_context
      });
    },
    
    error: (err: any, req: any, res: any) => {
      observability.logger.error('Proxy error', {
        service: 'api-gateway', 
        operation: 'proxy_error',
        target_service: 'monolith',
        error: err.message,
        trace_context: req.trace_context
      });
      
      res.status(503).json({
        error: 'service_unavailable',
        message: 'Backend service is temporarily unavailable',
        retry_after: 30
      });
    }
  }
};

app.use('/api/v1', createProxyMiddleware(proxyOptions));

// =============================================================================
// FUTURE SERVICE PROXIES (COMMENTED FOR NOW)
// =============================================================================

/*
// Auth Service (when extracted)
app.use('/api/v1/auth', createProxyMiddleware({
  target: config.services.auth.target,
  changeOrigin: true,
  pathRewrite: config.services.auth.pathRewrite
}));

// Operations Service (when extracted) 
app.use('/api/v1/operations', createProxyMiddleware({
  target: config.services.operations.target,
  changeOrigin: true,
  pathRewrite: config.services.operations.pathRewrite
}));

// Additional service proxies will be added during extraction phases
*/

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req: any, res: any) => {
  observability.logger.warn('Route not found', {
    service: 'api-gateway',
    operation: '404_not_found',
    path: req.path,
    method: req.method,
    trace_context: req.trace_context
  });
  
  res.status(404).json({
    error: 'route_not_found',
    message: `Route ${req.method} ${req.path} not found`,
    available_routes: {
      health: 'GET /health',
      metrics: 'GET /metrics', 
      status: 'GET /gateway/status',
      api: 'ALL /api/v1/*'
    }
  });
});

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  observability.logger.error('Gateway error', {
    service: 'api-gateway',
    operation: 'error_handler', 
    error: error.message,
    stack: error.stack,
    trace_context: req.trace_context
  });
  
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
    trace_id: req.trace_context?.trace_id
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(config.port, () => {
  observability.logger.info('API Gateway started', {
    service: 'api-gateway',
    operation: 'startup',
    port: config.port,
    environment: process.env.NODE_ENV || 'development',
    services: Object.keys(config.services)
  });
  
  console.log(`🚀 API Gateway running on port ${config.port}`);
  console.log(`📊 Health: http://localhost:${config.port}/health`);
  console.log(`📈 Metrics: http://localhost:${config.port}/metrics`);
  console.log(`🔍 Status: http://localhost:${config.port}/gateway/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  observability.logger.info('Gateway shutting down', {
    service: 'api-gateway',
    operation: 'shutdown'
  });
  
  server.close(() => {
    observability.logger.info('Gateway stopped', {
      service: 'api-gateway', 
      operation: 'stopped'
    });
    process.exit(0);
  });
});

export default app;