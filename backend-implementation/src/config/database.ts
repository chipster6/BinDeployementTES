/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ENHANCED DATABASE CONFIGURATION FOR AI/ML
 * ============================================================================
 *
 * PostgreSQL database configuration optimized for AI/ML workloads with
 * Weaviate vector database integration for Phase 1 vector intelligence.
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * 
 * COORDINATION WITH:
 * - Backend-Agent: Service layer integration and API endpoints
 * - Performance-Optimization-Specialist: Connection pooling and optimization
 * - Innovation-Architect: Weaviate cluster configuration
 *
 * Created by: Database-Architect
 * Enhanced for: AI/ML Integration + Phase 1 Weaviate Deployment
 * Date: 2025-08-16
 * Version: 2.1.0 - Weaviate Vector Database Integration
 */

import { Sequelize, QueryTypes } from "sequelize";
import type { Transaction } from "sequelize";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import { WeaviateConnectionManager, WeaviateConnection } from "../database/WeaviateConnection";
import { VectorSyncService } from "../services/VectorSyncService";

/**
 * Sequelize instance configuration
 */
export const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    dialect: config.database.dialect,
    host: config.database.host,
    port: config.database.port,

    // PRODUCTION-HARDENED SSL Configuration
    dialectOptions: {
      ssl: config.database.ssl ? (() => {
        // Import SSL manager for production-ready configuration
        try {
          const { getProductionSSLConfig } = require('@/database/ssl-config');
          return getProductionSSLConfig();
        } catch (error) {
          logger.warn('SSL config not available, using basic configuration');
          return config.database.ssl;
        }
      })() : false,
    },

    // PRODUCTION-READY CONNECTION POOL CONFIGURATION
    // Scaled from 20 to 120+ connections for enterprise production load
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
      idle: config.database.pool.idle,
      acquire: config.database.pool.acquire,
      evict: config.database.pool.evict,
      validate: config.database.pool.validate ? (client: any) => true : undefined,
      // Enhanced connection health monitoring
      acquireTimeoutMillis: config.database.pool.acquire,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: config.database.pool.idle,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
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
 * ENHANCED DATABASE CONNECTION POOL MONITORING
 * Critical for production load support and performance optimization
 */
export const getConnectionPoolStats = async (): Promise<{
  status: "healthy" | "warning" | "critical";
  pool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    utilization: number;
  };
  performance: {
    avgResponseTime: number;
    slowQueries: number;
    connectionErrors: number;
  };
  config: {
    min: number;
    max: number;
    acquire: number;
    idle: number;
  };
}> => {
  try {
    const connectionManager = sequelize.connectionManager as any;
    const pool = connectionManager.pool;
    const poolStats = {
      total: pool?.size || 0,
      active: pool?.borrowed || 0,
      idle: pool?.available || 0,
      waiting: pool?.pending || 0,
      utilization: pool?.size > 0 ? Math.round((pool.borrowed / pool.size) * 100) : 0,
    };

    // Determine pool health status
    let status: "healthy" | "warning" | "critical" = "healthy";
    if (poolStats.utilization > 90) {
      status = "critical";
    } else if (poolStats.utilization > 75) {
      status = "warning";
    }

    return {
      status,
      pool: poolStats,
      performance: {
        avgResponseTime: await (async () => {
          try {
            const { databasePerformanceMonitor } = require('@/database/performance-monitor');
            const summary = await databasePerformanceMonitor.getPerformanceSummary();
            return summary.avgResponseTime;
          } catch {
            return 0;
          }
        })(),
        slowQueries: await (async () => {
          try {
            const { databasePerformanceMonitor } = require('@/database/performance-monitor');
            const summary = await databasePerformanceMonitor.getPerformanceSummary();
            return summary.slowQueries;
          } catch {
            return 0;
          }
        })(),
        connectionErrors: await (async () => {
          try {
            const { databasePerformanceMonitor } = require('@/database/performance-monitor');
            const summary = await databasePerformanceMonitor.getPerformanceSummary();
            return summary.connectionErrors;
          } catch {
            return 0;
          }
        })(),
      },
      config: {
        min: config.database.pool.min,
        max: config.database.pool.max,
        acquire: config.database.pool.acquire,
        idle: config.database.pool.idle,
      },
    };
  } catch (error) {
    logger.error("Connection pool stats failed:", error);
    return {
      status: "critical",
      pool: { total: 0, active: 0, idle: 0, waiting: 0, utilization: 0 },
      performance: { avgResponseTime: 0, slowQueries: 0, connectionErrors: 0 },
      config: {
        min: config.database.pool.min,
        max: config.database.pool.max,
        acquire: config.database.pool.acquire,
        idle: config.database.pool.idle,
      },
    };
  }
};

/**
 * Database connection health check
 */
export const checkDatabaseHealth = async (): Promise<{
  status: "healthy" | "unhealthy";
  details: Record<string, any>;
  connectionPool?: any;
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

    // Get connection pool stats
    const poolStats = await getConnectionPoolStats();

    return {
      status: poolStats.status === "critical" ? "unhealthy" : "healthy",
      details: {
        connectionTime: `${connectionTime}ms`,
        version: results[0]?.version,
        currentTime: results[0]?.current_time,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
      },
      connectionPool: poolStats,
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

/**
 * ============================================================================
 * WEAVIATE VECTOR DATABASE INTEGRATION
 * ============================================================================
 */

/**
 * Initialize Weaviate vector database connection
 */
export const initializeWeaviate = async (): Promise<WeaviateConnection> => {
  try {
    logger.info('Initializing Weaviate vector database...');

    // Initialize the connection manager with configuration
    WeaviateConnectionManager.initialize(config.weaviate);

    // Get the connection instance
    const weaviateConnection = await WeaviateConnectionManager.getInstance();
    
    // Test connection health
    const health = await weaviateConnection.getHealthStatus();
    
    if (!health.healthy) {
      throw new Error(`Weaviate health check failed: response time ${health.responseTime}ms`);
    }

    logger.info('✅ Weaviate vector database initialized successfully', {
      version: health.version,
      hostname: health.hostname,
      responseTime: health.responseTime
    });

    return weaviateConnection;
  } catch (error) {
    logger.error('❌ Failed to initialize Weaviate vector database:', error);
    throw error;
  }
};

/**
 * Initialize Vector Sync Service
 */
export const initializeVectorSync = async (
  weaviateConnection: WeaviateConnection
): Promise<VectorSyncService> => {
  try {
    logger.info('Initializing Vector Sync Service...');

    const vectorSyncService = new VectorSyncService(
      sequelize,
      weaviateConnection,
      config.vectorSync,
      logger
    );

    await vectorSyncService.initialize();

    logger.info('✅ Vector Sync Service initialized successfully');

    return vectorSyncService;
  } catch (error) {
    logger.error('❌ Failed to initialize Vector Sync Service:', error);
    throw error;
  }
};

/**
 * Check Weaviate connection health
 */
export const checkWeaviateHealth = async (): Promise<{
  status: "healthy" | "unhealthy";
  details: Record<string, any>;
}> => {
  try {
    const weaviateConnection = await WeaviateConnectionManager.getInstance();
    const health = await weaviateConnection.getHealthStatus();

    return {
      status: health.healthy ? "healthy" : "unhealthy",
      details: {
        healthy: health.healthy,
        version: health.version,
        hostname: health.hostname,
        responseTime: `${health.responseTime}ms`,
        host: config.weaviate.host,
        port: config.weaviate.port,
        scheme: config.weaviate.scheme
      }
    };
  } catch (error) {
    logger.error("Weaviate health check failed:", error);
    return {
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        host: config.weaviate.host,
        port: config.weaviate.port,
        scheme: config.weaviate.scheme
      }
    };
  }
};

/**
 * Get comprehensive database health including PostgreSQL and Weaviate
 */
export const checkComprehensiveDatabaseHealth = async (): Promise<{
  status: "healthy" | "warning" | "unhealthy";
  postgresql: any;
  weaviate: any;
  vectorSync?: any;
}> => {
  try {
    // Check PostgreSQL health
    const postgresHealth = await checkDatabaseHealth();
    
    // Check Weaviate health
    const weaviateHealth = await checkWeaviateHealth();

    // Determine overall status
    let overallStatus: "healthy" | "warning" | "unhealthy" = "healthy";
    
    if (postgresHealth.status === "unhealthy" || weaviateHealth.status === "unhealthy") {
      overallStatus = "unhealthy";
    } else if (postgresHealth.connectionPool?.status === "warning") {
      overallStatus = "warning";
    }

    const result = {
      status: overallStatus,
      postgresql: postgresHealth,
      weaviate: weaviateHealth
    };

    // Add vector sync metrics if available
    try {
      const weaviateConnection = await WeaviateConnectionManager.getInstance();
      const vectorSyncService = new VectorSyncService(
        sequelize, 
        weaviateConnection, 
        config.vectorSync
      );
      const syncMetrics = await vectorSyncService.getSyncMetrics();
      
      (result as any).vectorSync = {
        status: "operational",
        enabled: config.vectorSync.enabled,
        batchSize: config.vectorSync.batchSize,
        intervalSeconds: config.vectorSync.intervalSeconds,
        metrics: syncMetrics
      };
    } catch (error) {
      (result as any).vectorSync = {
        status: "unavailable",
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return result;
  } catch (error) {
    logger.error("Comprehensive database health check failed:", error);
    return {
      status: "unhealthy",
      postgresql: { status: "unhealthy", details: { error: "Health check failed" } },
      weaviate: { status: "unhealthy", details: { error: "Health check failed" } }
    };
  }
};

/**
 * Initialize complete database system (PostgreSQL + Weaviate + Vector Sync)
 */
export const initializeCompleteDatabaseSystem = async (): Promise<{
  postgresql: Sequelize;
  weaviate: WeaviateConnection;
  vectorSync: VectorSyncService;
}> => {
  try {
    logger.info('Initializing complete database system...');

    // Initialize PostgreSQL
    await initializeDatabase();

    // Initialize Weaviate
    const weaviateConnection = await initializeWeaviate();

    // Initialize Vector Sync Service
    const vectorSyncService = await initializeVectorSync(weaviateConnection);

    logger.info('✅ Complete database system initialized successfully');

    return {
      postgresql: sequelize,
      weaviate: weaviateConnection,
      vectorSync: vectorSyncService
    };
  } catch (error) {
    logger.error('❌ Failed to initialize complete database system:', error);
    throw error;
  }
};

/**
 * Close all database connections gracefully
 */
export const closeAllDatabaseConnections = async (): Promise<void> => {
  try {
    logger.info('Closing all database connections...');

    // Close Weaviate connections
    await WeaviateConnectionManager.closeAll();

    // Close PostgreSQL connection
    await closeDatabaseConnection();

    logger.info('✅ All database connections closed gracefully');
  } catch (error) {
    logger.error('❌ Error closing database connections:', error);
    throw error;
  }
};

// Export database instance and utilities
export { sequelize as database };
export default sequelize;
