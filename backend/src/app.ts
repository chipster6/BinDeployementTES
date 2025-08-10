/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXPRESS APPLICATION SETUP
 * ============================================================================
 * Main Express application configuration with security, middleware, and routes
 * Based on: artifacts/system-design.yml, artifacts/security-requirements.yml
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Configuration and utilities
import config from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers';
import { requestLogger } from './middleware/requestLogger';
import { securityHeaders } from './middleware/securityHeaders';

// Authentication middleware
import { authMiddleware } from './middleware/auth';
import { rbacMiddleware } from './middleware/rbac';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import routeRoutes from './routes/routes';
import serviceEventRoutes from './routes/serviceEvents';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import trackingRoutes from './routes/tracking';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';

// Real-time services
import { initializeSocketIO } from './services/socketService';

/**
 * Create and configure Express application
 */
export function createApp(): { app: Application; server: any; io: Server } {
  const app: Application = express();
  const server = createServer(app);

  // Initialize Socket.IO for real-time features
  const io = initializeSocketIO(server);

  // ========================================================================
  // TRUST PROXY AND BASIC SETUP
  // ========================================================================
  
  // Trust proxy for accurate IP addresses behind load balancers
  app.set('trust proxy', 1);

  // ========================================================================
  // SECURITY MIDDLEWARE
  // ========================================================================

  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.mapbox.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "*.mapbox.com", "*.amazonaws.com"],
        connectSrc: ["'self'", "api.stripe.com", "*.samsara.com", "*.mapbox.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false // Disable for API usage
  }));

  // Custom security headers
  app.use(securityHeaders);

  // CORS configuration
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = config.cors.allowedOrigins;
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    maxAge: 86400 // 24 hours
  }));

  // ========================================================================
  // GENERAL MIDDLEWARE
  // ========================================================================

  // Compression
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Body parsing
  app.use(express.json({ 
    limit: '10mb',
    verify: (req: any, res, buf) => {
      // Store raw body for webhook signature verification
      if (req.originalUrl?.startsWith('/api/v1/webhooks/')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // ========================================================================
  // RATE LIMITING
  // ========================================================================

  // General rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      // Different limits based on authentication
      if (req.headers.authorization) {
        return 1000; // Authenticated users
      }
      return 100; // Anonymous users
    },
    message: {
      type: 'https://docs.waste-mgmt.com/errors/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use API key if available, otherwise IP
      return req.headers['x-api-key'] as string || req.ip;
    }
  });

  // Authentication rate limiting (stricter)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      type: 'https://docs.waste-mgmt.com/errors/auth-rate-limit-exceeded',
      title: 'Authentication Rate Limit Exceeded',
      status: 429,
      detail: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true
  });

  // Apply rate limiters
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/refresh', authLimiter);
  app.use('/api/v1', generalLimiter);

  // ========================================================================
  // API ROUTES
  // ========================================================================

  // Health check (no authentication required)
  app.use('/api/v1/health', healthRoutes);

  // Public routes (no authentication)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);

  // Protected routes (require authentication)
  app.use('/api/v1/users', authMiddleware, userRoutes);
  app.use('/api/v1/customers', authMiddleware, customerRoutes);
  app.use('/api/v1/vehicles', authMiddleware, vehicleRoutes);
  app.use('/api/v1/drivers', authMiddleware, driverRoutes);
  app.use('/api/v1/routes', authMiddleware, routeRoutes);
  app.use('/api/v1/service-events', authMiddleware, serviceEventRoutes);
  app.use('/api/v1/invoices', authMiddleware, invoiceRoutes);
  app.use('/api/v1/payments', authMiddleware, paymentRoutes);
  app.use('/api/v1/tracking', authMiddleware, trackingRoutes);
  app.use('/api/v1/analytics', authMiddleware, rbacMiddleware(['admin', 'super_admin']), analyticsRoutes);

  // ========================================================================
  // API DOCUMENTATION ROUTE
  // ========================================================================

  app.get('/api/v1/docs', (req: Request, res: Response) => {
    res.json({
      title: 'Waste Management System API',
      version: '1.0.0',
      description: 'Comprehensive REST API for waste management operations',
      docs: 'https://docs.waste-mgmt.com',
      openapi: 'https://api.waste-mgmt.com/api/v1/openapi.json',
      endpoints: {
        authentication: '/api/v1/auth',
        users: '/api/v1/users',
        customers: '/api/v1/customers',
        fleet: {
          vehicles: '/api/v1/vehicles',
          drivers: '/api/v1/drivers'
        },
        operations: {
          routes: '/api/v1/routes',
          'service-events': '/api/v1/service-events'
        },
        billing: {
          invoices: '/api/v1/invoices',
          payments: '/api/v1/payments'
        },
        tracking: '/api/v1/tracking',
        analytics: '/api/v1/analytics',
        webhooks: '/api/v1/webhooks',
        health: '/api/v1/health'
      }
    });
  });

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Waste Management System API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      docs: '/api/v1/docs'
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  // ========================================================================
  // GRACEFUL SHUTDOWN
  // ========================================================================

  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      logger.info('HTTP server closed.');
      
      // Close database connections, Redis, etc.
      Promise.all([
        // Add cleanup promises here
      ]).then(() => {
        logger.info('All connections closed. Exiting process.');
        process.exit(0);
      }).catch((error) => {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Graceful shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  return { app, server, io };
}

export default createApp;