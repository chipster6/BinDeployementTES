/**
 * Waste Management Platform API Server
 * Main server entry point with security, middleware, and route configuration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Internal imports
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';
import { redis } from '@/config/redis';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { securityHeaders } from '@/middleware/security.middleware';
import { authenticationMiddleware } from '@/middleware/auth.middleware';
import { auditLogger } from '@/middleware/audit.middleware';

// Route imports
import authRoutes from '@/routes/auth.routes';
import customerRoutes from '@/routes/customer.routes';
import routeRoutes from '@/routes/route.routes';
import serviceEventRoutes from '@/routes/service-event.routes';
import vehicleRoutes from '@/routes/vehicle.routes';
import driverRoutes from '@/routes/driver.routes';
import invoiceRoutes from '@/routes/invoice.routes';
import binRoutes from '@/routes/bin.routes';
import analyticsRoutes from '@/routes/analytics.routes';
import healthRoutes from '@/routes/health.routes';
import webhookRoutes from '@/routes/webhook.routes';

// Services
import { SocketService } from '@/services/socket.service';
import { BackgroundJobService } from '@/services/background-job.service';

/**
 * Main Application Class
 * Handles server initialization, middleware setup, and graceful shutdown
 */
class WasteManagementAPI {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private socketService: SocketService;
  private backgroundJobService: BackgroundJobService;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize Express middleware stack
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "cdn.mapbox.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "*.mapbox.com", "*.amazonaws.com"],
          connectSrc: ["'self'", "api.stripe.com", "*.samsara.com"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'
      ]
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.window * 60 * 1000,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: config.rateLimit.window * 60
      },
      skip: (req) => {
        // Skip rate limiting for health checks and authenticated admin requests
        if (req.path === '/api/v1/health') return true;
        return false;
      }
    });
    this.app.use('/api', limiter);

    // Logging
    if (config.env !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            logger.info(message.trim(), { component: 'express' });
          }
        }
      }));
    }

    // Custom security headers
    this.app.use(securityHeaders);

    // Request ID and audit logging
    this.app.use(auditLogger);

    // Trust proxy (important for rate limiting and IP detection)
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialize API routes with versioning
   */
  private initializeRoutes(): void {
    const apiV1 = `/api/${config.api.version}`;

    // Health check (no auth required)
    this.app.use(`${apiV1}/health`, healthRoutes);

    // Webhooks (special handling - no auth middleware)
    this.app.use(`${apiV1}/webhooks`, webhookRoutes);

    // Authentication routes
    this.app.use(`${apiV1}/auth`, authRoutes);

    // Protected routes - require authentication
    this.app.use(authenticationMiddleware);

    // Business logic routes
    this.app.use(`${apiV1}/customers`, customerRoutes);
    this.app.use(`${apiV1}/routes`, routeRoutes);
    this.app.use(`${apiV1}/service-events`, serviceEventRoutes);
    this.app.use(`${apiV1}/vehicles`, vehicleRoutes);
    this.app.use(`${apiV1}/drivers`, driverRoutes);
    this.app.use(`${apiV1}/invoices`, invoiceRoutes);
    this.app.use(`${apiV1}/bins`, binRoutes);
    this.app.use(`${apiV1}/analytics`, analyticsRoutes);
    this.app.use(`${apiV1}/dashboard`, analyticsRoutes); // dashboard metrics

    // API documentation redirect
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Waste Management Platform API',
        version: config.api.version,
        environment: config.env,
        documentation: `${config.app.url}/api/docs`,
        health: `${config.app.url}/api/${config.api.version}/health`,
        timestamp: new Date().toISOString()
      });
    });

    // API root
    this.app.get(`${apiV1}`, (req, res) => {
      res.json({
        message: 'Waste Management Platform API',
        version: config.api.version,
        endpoints: {
          auth: `${apiV1}/auth`,
          customers: `${apiV1}/customers`,
          routes: `${apiV1}/routes`,
          'service-events': `${apiV1}/service-events`,
          vehicles: `${apiV1}/vehicles`,
          drivers: `${apiV1}/drivers`,
          invoices: `${apiV1}/invoices`,
          bins: `${apiV1}/bins`,
          analytics: `${apiV1}/analytics`,
          health: `${apiV1}/health`
        }
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize Socket.IO for real-time communications
   */
  private initializeSocketIO(): void {
    this.server = createServer(this.app);
    
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origins,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.socketService = new SocketService(this.io);
    this.socketService.initialize();

    logger.info('Socket.IO initialized', { component: 'socket' });
  }

  /**
   * Initialize background job processing
   */
  private initializeBackgroundJobs(): void {
    this.backgroundJobService = new BackgroundJobService();
    this.backgroundJobService.initialize();
    
    logger.info('Background job service initialized', { component: 'background-jobs' });
  }

  /**
   * Test database and Redis connections
   */
  private async testConnections(): Promise<void> {
    try {
      // Test database connection
      await database.raw('SELECT 1');
      logger.info('Database connection established', { component: 'database' });

      // Test Redis connection
      await redis.ping();
      logger.info('Redis connection established', { component: 'redis' });

    } catch (error) {
      logger.error('Connection test failed:', error, { component: 'startup' });
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Test connections first
      await this.testConnections();

      // Initialize real-time services
      this.initializeSocketIO();
      this.initializeBackgroundJobs();

      // Start HTTP server
      const port = config.server.port;
      this.server.listen(port, () => {
        logger.info(`🚀 Waste Management API Server started`, {
          component: 'server',
          port,
          environment: config.env,
          version: config.api.version,
          processId: process.pid
        });
      });

      // Graceful shutdown handlers
      this.setupShutdownHandlers();

    } catch (error) {
      logger.error('Failed to start server:', error, { component: 'server' });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`, { component: 'server' });

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve) => {
            this.server.close(() => {
              logger.info('HTTP server closed', { component: 'server' });
              resolve();
            });
          });
        }

        // Close Socket.IO
        if (this.io) {
          this.io.close();
          logger.info('Socket.IO server closed', { component: 'socket' });
        }

        // Stop background jobs
        if (this.backgroundJobService) {
          await this.backgroundJobService.stop();
          logger.info('Background jobs stopped', { component: 'background-jobs' });
        }

        // Close database connections
        await database.destroy();
        logger.info('Database connections closed', { component: 'database' });

        // Close Redis connections
        await redis.quit();
        logger.info('Redis connections closed', { component: 'redis' });

        logger.info('Graceful shutdown completed', { component: 'server' });
        process.exit(0);

      } catch (error) {
        logger.error('Error during graceful shutdown:', error, { component: 'server' });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error, { component: 'server' });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise }, { component: 'server' });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Get Express app instance (useful for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get Socket.IO instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Create and start the server
const api = new WasteManagementAPI();

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  api.start().catch((error) => {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  });
}

export default api;
export { WasteManagementAPI };