
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { LifecycleService } from '@/services/lifecycleService';
import { MiddlewareService } from '@/services/middlewareService';
import { RouteService } from '@/services/routeService';
import { DatabaseService } from '@/services/databaseService';
import { JobService } from '@/services/jobService';
import { socketManager } from '@/services/socketManager';
import { errorHandler } from '@/middleware/errorHandler';

class Application {
  public async start(): Promise<void> {
    const app = express();
    const server = createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Instantiate services
    const databaseService = new DatabaseService();
    const jobService = new JobService();
    const middlewareService = new MiddlewareService(app);
    const routeService = new RouteService(app);
    const lifecycleService = new LifecycleService(server, io, databaseService, jobService);

    // Connect to dependencies
    await databaseService.connect();
    await jobService.initialize();

    // Initialize middleware and routes
    middlewareService.initialize();
    await routeService.initialize();

    // Initialize Socket.IO
    socketManager.initialize(io);

    // Initialize final error handler
    app.use(errorHandler);

    // Start the server
    await lifecycleService.start(config.port);
  }
}

const application = new Application();
application.start().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export { application };
