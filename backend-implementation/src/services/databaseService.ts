import { logger } from "@/utils/logger";
import { database } from "@/config/database";
import { redisClient } from "@/config/redis";

export class DatabaseService {
  public async connect(): Promise<void> {
    logger.info("Connecting to databases...");
    try {
      await database.authenticate();
      logger.info("PostgreSQL connected successfully");
      await redisClient.ping();
      logger.info("Redis connected successfully");
    } catch (error: unknown) {
      logger.error("Database connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    logger.info("Disconnecting from databases...");
    const promises = [
      database.close().then(() => logger.info("Database connection closed")),
      redisClient.quit().then(() => logger.info("Redis connection closed")),
    ];
    await Promise.allSettled(promises);
  }
}
