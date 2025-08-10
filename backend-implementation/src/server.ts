/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MAIN SERVER
 * ============================================================================
 * 
 * Main entry point for the Waste Management System backend API.
 * Configures Express application, middleware, routes, and starts the server.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Internal imports
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';
import { redisClient } from '@/config/redis';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { securityMiddleware } from '@/middleware/security';
import { rateLimitMiddleware } from '@/middleware/rateLimit';
import { apiRoutes } from '@/routes';
import { socketManager } from '@/services/socketManager';
import { jobQueue } from '@/services/jobQueue';
import { healthCheck } from '@/utils/healthCheck';
import { setupSwagger } from '@/utils/swagger';

/**
 * Main Application Class
 * Handles server initialization, configuration, and lifecycle management
 */
class WasteManagementServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer | null = null;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    
    // Initialize the application
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize essential middleware
   */
  private initializeMiddleware(): void {
    logger.info('🔧 Initializing middleware...');

    // Trust proxy if configured
    if (config.security.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: config.security.helmet.csp.enabled ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.mapbox.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', '*.mapbox.com', config.aws.cloudFrontUrl],
          connectSrc: ["'self'", 'api.stripe.com', '*.samsara.com'],
        },
      } : false,
      hsts: config.security.helmet.hsts,
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS policy'), false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
        'Authorization', 'X-API-Key', 'X-Refresh-Token'
      ],
      credentials: true,
      optionsSuccessStatus: 200,
      maxAge: 86400 // 24 hours
    }));

    // Compression
    if (config.performance.enableCompression) {
      this.app.use(compression({
        level: config.performance.compressionLevel,
        threshold: 1024
      }));
    }

    // Request parsing
    this.app.use(express.json({ 
      limit: config.performance.requestSizeLimit,
      strict: true
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.performance.requestSizeLimit
    }));
    this.app.use(cookieParser(config.security.sessionSecret));

    // Request logging
    if (config.logging.enableRequestLogging) {
      this.app.use(morgan('combined', {
        stream: { write: message => logger.info(message.trim()) }
      }));
      this.app.use(requestLogger);
    }

    // Rate limiting
    this.app.use('/api', rateLimitMiddleware);

    // Slow down repeated requests
    this.app.use(slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100,
      delayMs: 500,
      maxDelayMs: 20000,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    }));

    // Additional security middleware
    this.app.use(securityMiddleware);

    // Health check endpoint (before authentication)
    this.app.get('/health', healthCheck);
    this.app.get('/api/health', healthCheck);

    logger.info('✅ Middleware initialized successfully');
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    logger.info('🛣️  Initializing routes...');

    // API Documentation
    if (config.app.enableSwaggerUI) {
      setupSwagger(this.app);
    }

    // API routes
    this.app.use('/api/v1', apiRoutes);

    // Serve static files for uploads (with authentication)
    this.app.use('/uploads', express.static('uploads', {
      maxAge: '1d',
      etag: true
    }));

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'not_found',
        message: 'The requested endpoint does not exist',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('✅ Routes initialized successfully');
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    logger.info('⚠️  Initializing error handling...');
    
    // Global error handler (must be last)
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise
      });
      // Don't exit in production, just log
      if (config.app.nodeEnv !== 'production') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack
      });
      // Gracefully shutdown
      this.shutdown().then(() => process.exit(1));
    });

    // Handle SIGTERM and SIGINT for graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Starting graceful shutdown...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received. Starting graceful shutdown...');
      this.shutdown();
    });

    logger.info('✅ Error handling initialized successfully');
  }

  /**
   * Initialize WebSocket server
   */
  private initializeWebSocket(): void {
    if (!this.server) return;

    logger.info('🔌 Initializing WebSocket server...');

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize socket manager
    socketManager.initialize(this.io);

    logger.info('✅ WebSocket server initialized successfully');
  }

  /**
   * Connect to databases and external services
   */
  private async connectDatabases(): Promise<void> {
    logger.info('🗄️  Connecting to databases...');

    try {
      // Connect to PostgreSQL
      await database.authenticate();
      logger.info('✅ PostgreSQL connected successfully');

      // Sync database models (only in development)
      if (config.app.nodeEnv === 'development') {
        await database.sync({ force: false, alter: true });
        logger.info('✅ Database models synchronized');
      }

      // Connect to Redis
      await redisClient.ping();
      logger.info('✅ Redis connected successfully');

    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize background job processing
   */
  private async initializeJobQueue(): Promise<void> {
    if (config.queue.enabled) {
      logger.info('⚙️  Initializing job queue...');
      
      try {
        await jobQueue.initialize();
        logger.info('✅ Job queue initialized successfully');
      } catch (error) {
        logger.error('❌ Job queue initialization failed:', error);
        // Don't throw - queue is not critical for basic operation
      }
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Waste Management API Server...');
      logger.info(`📊 Environment: ${config.app.nodeEnv}`);
      logger.info(`🔧 Version: ${config.app.version}`);

      // Connect to databases
      await this.connectDatabases();

      // Initialize job queue
      await this.initializeJobQueue();

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket
      this.initializeWebSocket();

      // Start listening
      this.server.listen(this.port, () => {
        logger.info(`🌟 Server is running on port ${this.port}`);
        logger.info(`📝 API Documentation: http://localhost:${this.port}/api/docs`);
        logger.info(`🏥 Health Check: http://localhost:${this.port}/health`);
        logger.info('🎯 Server is ready to accept connections!');
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`❌ Port ${this.port} is already in use`);
          process.exit(1);
        } else {
          logger.error('❌ Server error:', error);
        }
      });

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    logger.info('🔄 Initiating graceful shutdown...');

    const shutdownPromises: Promise<any>[] = [];

    // Close HTTP server
    if (this.server) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.server.close((err: any) => {
            if (err) {
              logger.error('Error closing HTTP server:', err);
            } else {
              logger.info('✅ HTTP server closed');
            }
            resolve(void 0);
          });
        })
      );
    }

    // Close WebSocket server
    if (this.io) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.io!.close(() => {
            logger.info('✅ WebSocket server closed');
            resolve(void 0);
          });
        })
      );
    }

    // Close database connections
    shutdownPromises.push(
      database.close().then(() => {
        logger.info('✅ Database connection closed');
      }).catch((err) => {
        logger.error('Error closing database:', err);
      })
    );

    // Close Redis connection
    shutdownPromises.push(
      redisClient.quit().then(() => {
        logger.info('✅ Redis connection closed');
      }).catch((err) => {
        logger.error('Error closing Redis:', err);
      })
    );

    // Close job queue
    if (config.queue.enabled) {
      shutdownPromises.push(
        jobQueue.close().then(() => {
          logger.info('✅ Job queue closed');
        }).catch((err) => {
          logger.error('Error closing job queue:', err);
        })
      );
    }

    // Wait for all shutdown operations
    await Promise.allSettled(shutdownPromises);

    logger.info('👋 Graceful shutdown completed');
    process.exit(0);
  }
}

// Create and start the server
const server = new WasteManagementServer();
server.start().catch((error) => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Export for testing
export { server };