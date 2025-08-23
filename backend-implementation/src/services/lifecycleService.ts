import { logger } from "@/utils/logger";
import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { DatabaseService } from "./databaseService";
import { JobService } from "./jobService";

export class LifecycleService {
  private server: Server;
  private io: SocketIOServer;
  private databaseService: DatabaseService;
  private jobService: JobService;

  constructor(
    server: Server,
    io: SocketIOServer,
    databaseService: DatabaseService,
    jobService: JobService,
  ) {
    this.server = server;
    this.io = io;
    this.databaseService = databaseService;
    this.jobService = jobService;
  }

  public async start(port: number): Promise<void> {
    try {
      logger.info("Starting Waste Management API Server...");
      this.startServer(port);
      this.setupShutdownHandlers();
    } catch (error: unknown) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  private startServer(port: number): void {
    this.server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  }

  private setupShutdownHandlers(): void {
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      this.shutdown().then(() => process.exit(0));
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      shutdown("unhandledRejection");
    });
  }

  private async shutdown(): Promise<void> {
    logger.info("Initiating graceful shutdown...");

    this.io.close();
    logger.info("Socket.IO server closed");

    await new Promise<void>((resolve) =>
      this.server.close(() => {
        logger.info("HTTP server closed");
        resolve();
      }),
    );

    await this.databaseService.disconnect();
    await this.jobService.close();

    logger.info("Graceful shutdown completed");
  }
}
