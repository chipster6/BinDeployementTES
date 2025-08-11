/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE CONFIGURATION
 * ============================================================================
 *
 * PostgreSQL database configuration using Sequelize ORM.
 * Provides connection management, model loading, and database operations.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Sequelize, QueryTypes, Transaction } from "sequelize";
import { config } from "@/config";
import { logger } from "@/utils/logger";

/**
 * Sequelize instance configuration
 */
export const sequelize = new Sequelize({
  dialect: config.database.dialect,
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,

  // SSL Configuration
  dialectOptions: {
    ssl: config.database.ssl
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
    // Enable PostGIS extension
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    typeCast: true,
  },

  // Connection Pool
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
    idle: config.database.pool.idle,
    acquire: config.database.pool.acquire,
    evict: 1000,
  },

  // Logging
  logging:
    config.database.logging ||
    ((sql: string) => {
      if (config.app.debugSql) {
        logger.debug("SQL Query:", { sql });
      }
    }),

  // Define options
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: true, // Soft deletes
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },

  // Performance optimizations
  benchmark: config.app.nodeEnv === "development",
  minifyAliases: true,

  // Retry options
  retry: {
    max: 3,
    timeout: 30000,
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
  },

  // Hook definitions
  hooks: {
    beforeConnect: (config) => {
      logger.debug("Attempting to connect to database...", {
        host: config.host,
        port: config.port,
        database: config.database,
      });
    },
    afterConnect: (connection) => {
      logger.info("Database connection established successfully");
    },
    beforeDisconnect: () => {
      logger.info("Disconnecting from database...");
    },
    afterDisconnect: () => {
      logger.info("Database connection closed");
    },
  },
});

/**
 * Database connection health check
 */
export const checkDatabaseHealth = async (): Promise<{
  status: "healthy" | "unhealthy";
  details: Record<string, any>;
}> => {
  try {
    const startTime = Date.now();

    // Test connection
    await sequelize.authenticate();

    // Test basic query
    const [results] = (await sequelize.query(
      "SELECT NOW() as current_time, VERSION() as version",
    )) as [any[], any];
    const connectionTime = Date.now() - startTime;

    return {
      status: "healthy",
      details: {
        connectionTime: `${connectionTime}ms`,
        version: results[0]?.version,
        currentTime: results[0]?.current_time,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
      },
    };
  } catch (error) {
    logger.error("Database health check failed:", error);
    return {
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
      },
    };
  }
};

/**
 * Initialize database connection with retry logic
 */
export const initializeDatabase = async (): Promise<void> => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info(
        `Connecting to database (attempt ${retries + 1}/${maxRetries})...`,
      );

      // Test connection
      await sequelize.authenticate();

      // Verify PostGIS extension is available
      if (config.app.nodeEnv !== "test") {
        try {
          await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
          await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
          await sequelize.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
          logger.info("✅ Database extensions verified/created");
        } catch (extensionError) {
          logger.warn("Could not create/verify extensions:", extensionError);
        }
      }

      logger.info("✅ Database connection established successfully");
      return;
    } catch (error) {
      retries++;
      logger.error(`Database connection attempt ${retries} failed:`, error);

      if (retries >= maxRetries) {
        logger.error("❌ Max database connection retries exceeded");
        throw new Error(
          `Database connection failed after ${maxRetries} attempts: ${error}`,
        );
      }

      // Wait before retry (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, retries), 30000);
      logger.info(`Retrying database connection in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};

/**
 * Synchronize database models (development only)
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  if (config.app.nodeEnv === "production") {
    logger.warn("Database sync skipped in production environment");
    return;
  }

  try {
    logger.info("Synchronizing database models...");

    await sequelize.sync({
      force,
      alter: !force,
      logging: config.app.debugSql ? console.log : false,
    });

    logger.info("✅ Database models synchronized successfully");
  } catch (error) {
    logger.error("❌ Database synchronization failed:", error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info("✅ Database connection closed gracefully");
  } catch (error) {
    logger.error("❌ Error closing database connection:", error);
    throw error;
  }
};

/**
 * Transaction helper function
 */
export const withTransaction = async <T>(
  callback: (transaction: Transaction) => Promise<T>,
): Promise<T> => {
  const transaction = await sequelize.transaction();

  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Raw query helper with proper error handling
 */
export const rawQuery = async (
  sql: string,
  replacements?: Record<string, any>,
): Promise<any[]> => {
  try {
    const results = await sequelize.query(sql, {
      ...(replacements && { replacements }),
      type: QueryTypes.SELECT,
    });
    return results;
  } catch (error) {
    logger.error("Raw query failed:", { sql, replacements, error });
    throw error;
  }
};

/**
 * Bulk operations helper
 */
export const bulkCreate = async (
  model: any,
  data: any[],
  options: any = {},
): Promise<any[]> => {
  return await model.bulkCreate(data, {
    validate: true,
    ignoreDuplicates: false,
    updateOnDuplicate: [],
    ...options,
  });
};

/**
 * Database migration helper
 */
export const runMigrations = async (): Promise<void> => {
  // This would typically use Sequelize CLI or Umzug for migrations
  // For now, just log that migrations should be run separately
  logger.info("Database migrations should be run using: npm run db:migrate");
};

/**
 * Database seed helper
 */
export const runSeeds = async (): Promise<void> => {
  // This would typically use Sequelize CLI for seeds
  // For now, just log that seeds should be run separately
  logger.info("Database seeds should be run using: npm run db:seed");
};

// Export database instance and utilities
export { sequelize as database };
export default sequelize;