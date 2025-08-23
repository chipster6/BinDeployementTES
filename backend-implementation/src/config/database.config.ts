/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE CONFIGURATION
 * ============================================================================
 *
 * Database configuration including PostgreSQL, Redis, Weaviate vector database,
 * and AI/ML database enhancements. Phase 1 Weaviate integration support.
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * 
 * COORDINATION WITH:
 * - Backend-Agent: Repository pattern extensions and API integration
 * - Performance-Optimization-Specialist: Storage performance validation and caching
 * - Innovation-Architect: Weaviate cluster configuration and vector operations
 *
 * Created by: Database-Architect (updated for Weaviate integration)
 * Date: 2025-08-16
 * Version: 2.1.0 - Enhanced with Weaviate vector database support
 */

import * as Joi from "joi";

/**
 * Database environment variable validation schema
 */
export const databaseEnvSchema = Joi.object({
  // Database - Enhanced for AI/ML workloads
  DB_HOST: Joi.string().default("localhost"),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MIN: Joi.number().default(25), // Increased for ML workloads
  DB_POOL_MAX: Joi.number().default(180), // Scaled for AI/ML integration (50% increase)
  DB_POOL_IDLE: Joi.number().default(30000),
  DB_POOL_ACQUIRE: Joi.number().default(30000),
  DB_POOL_EVICT: Joi.number().default(5000),
  DB_POOL_VALIDATE: Joi.boolean().default(true),
  DB_POOL_HANDLE_DISCONNECTS: Joi.boolean().default(true),
  
  // AI/ML Database Configuration
  DB_ML_DEDICATED_CONNECTIONS: Joi.number().default(30), // Reserved for ML operations
  DB_VECTOR_OPERATION_CONNECTIONS: Joi.number().default(15), // Reserved for vector operations
  DB_TRAINING_JOB_CONNECTIONS: Joi.number().default(10), // Reserved for model training
  DB_ML_QUERY_TIMEOUT: Joi.number().default(300000), // 5 minutes for ML operations
  DB_ENABLE_ML_ROUTING: Joi.boolean().default(true), // Enable intelligent query routing

  // Redis configuration
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default("waste_mgmt:"),
  REDIS_TTL_DEFAULT: Joi.number().default(3600),

  // Weaviate Vector Database Configuration
  WEAVIATE_HOST: Joi.string().default("localhost"),
  WEAVIATE_PORT: Joi.number().default(8080),
  WEAVIATE_SCHEME: Joi.string().valid("http", "https").default("http"),
  WEAVIATE_API_KEY: Joi.string().allow("").optional(),
  WEAVIATE_OPENAI_API_KEY: Joi.string().allow("").optional(),
  WEAVIATE_TIMEOUT: Joi.number().default(30000), // 30 seconds
  WEAVIATE_RETRIES: Joi.number().default(3),
  WEAVIATE_RETRY_DELAY: Joi.number().default(1000), // 1 second
  WEAVIATE_BATCH_SIZE: Joi.number().default(100),
  WEAVIATE_CONSISTENCY_LEVEL: Joi.string().valid("ONE", "QUORUM", "ALL").default("ONE"),
  WEAVIATE_ENABLE_BACKUP: Joi.boolean().default(true),
  WEAVIATE_BACKUP_INTERVAL_HOURS: Joi.number().default(24),

  // Vector Sync Configuration
  VECTOR_SYNC_ENABLED: Joi.boolean().default(true),
  VECTOR_SYNC_BATCH_SIZE: Joi.number().default(50),
  VECTOR_SYNC_INTERVAL_SECONDS: Joi.number().default(30),
  VECTOR_SYNC_RETRY_MAX: Joi.number().default(5),
  VECTOR_SYNC_RETRY_BACKOFF_MS: Joi.number().default(2000),
  VECTOR_CONTENT_EMBEDDING_MODEL: Joi.string().default("text-embedding-ada-002"),
  VECTOR_QUALITY_THRESHOLD: Joi.number().min(0).max(1).default(0.7),

  // Debug SQL flag (needed for database logging)
  DEBUG_SQL: Joi.boolean().default(false),
});

/**
 * Validate database environment variables
 */
export const validateDatabaseEnv = () => {
  const { error, value } = databaseEnvSchema.validate(process.env);
  if (error) {
    throw new Error(`Database configuration validation error: ${error instanceof Error ? error?.message : String(error)}`);
  }
  return value;
};

/**
 * Database configuration interface including Weaviate vector database
 */
export interface DatabaseConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    dialect: "postgres";
    pool: {
      min: number;
      max: number;
      idle: number;
      acquire: number;
      evict?: number | undefined;
      validate?: boolean | undefined;
      handleDisconnects?: boolean | undefined;
    };
    mlWorkloads: {
      dedicatedConnections: number;
      vectorOperationConnections: number;
      trainingJobConnections: number;
      queryTimeout: number;
      enableIntelligentRouting: boolean;
    };
    logging: boolean | ((sql: string) => void);
  };
  redis: {
    host: string;
    port: number;
    password?: string | undefined;
    db: number;
    keyPrefix: string;
    defaultTTL: number;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
    keepAlive: number;
  };
  weaviate: {
    host: string;
    port: number;
    scheme: "http" | "https";
    apiKey?: string | undefined;
    openaiApiKey?: string | undefined;
    timeout: number;
    retries: number;
    retryDelay: number;
    batchSize: number;
    consistencyLevel: "ONE" | "QUORUM" | "ALL";
    enableBackup: boolean;
    backupIntervalHours: number;
  };
  vectorSync: {
    enabled: boolean;
    batchSize: number;
    intervalSeconds: number;
    retryMax: number;
    retryBackoffMs: number;
    embeddingModel: string;
    qualityThreshold: number;
  };
}

/**
 * Create database configuration from validated environment variables
 */
export const createDatabaseConfig = (envVars: any): DatabaseConfig => ({
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    database: envVars.DB_NAME,
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
    ssl: envVars.DB_SSL,
    dialect: "postgres" as const,
    pool: {
      min: envVars.DB_POOL_MIN,
      max: envVars.DB_POOL_MAX,
      idle: envVars.DB_POOL_IDLE,
      acquire: envVars.DB_POOL_ACQUIRE,
      evict: envVars.DB_POOL_EVICT,
      validate: envVars.DB_POOL_VALIDATE,
      handleDisconnects: envVars.DB_POOL_HANDLE_DISCONNECTS,
    },
    // AI/ML Enhanced Database Configuration
    mlWorkloads: {
      dedicatedConnections: envVars.DB_ML_DEDICATED_CONNECTIONS,
      vectorOperationConnections: envVars.DB_VECTOR_OPERATION_CONNECTIONS,
      trainingJobConnections: envVars.DB_TRAINING_JOB_CONNECTIONS,
      queryTimeout: envVars.DB_ML_QUERY_TIMEOUT,
      enableIntelligentRouting: envVars.DB_ENABLE_ML_ROUTING,
    },
    logging: envVars.DEBUG_SQL ? console.log : false,
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars?.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    keyPrefix: envVars.REDIS_KEY_PREFIX,
    defaultTTL: envVars.REDIS_TTL_DEFAULT,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
  },

  // Weaviate Vector Database Configuration
  weaviate: {
    host: envVars.WEAVIATE_HOST,
    port: envVars.WEAVIATE_PORT,
    scheme: envVars.WEAVIATE_SCHEME as "http" | "https",
    apiKey: envVars?.WEAVIATE_API_KEY || undefined,
    openaiApiKey: envVars?.WEAVIATE_OPENAI_API_KEY || undefined,
    timeout: envVars.WEAVIATE_TIMEOUT,
    retries: envVars.WEAVIATE_RETRIES,
    retryDelay: envVars.WEAVIATE_RETRY_DELAY,
    batchSize: envVars.WEAVIATE_BATCH_SIZE,
    consistencyLevel: envVars.WEAVIATE_CONSISTENCY_LEVEL as "ONE" | "QUORUM" | "ALL",
    enableBackup: envVars.WEAVIATE_ENABLE_BACKUP,
    backupIntervalHours: envVars.WEAVIATE_BACKUP_INTERVAL_HOURS,
  },

  // Vector Synchronization Configuration
  vectorSync: {
    enabled: envVars.VECTOR_SYNC_ENABLED,
    batchSize: envVars.VECTOR_SYNC_BATCH_SIZE,
    intervalSeconds: envVars.VECTOR_SYNC_INTERVAL_SECONDS,
    retryMax: envVars.VECTOR_SYNC_RETRY_MAX,
    retryBackoffMs: envVars.VECTOR_SYNC_RETRY_BACKOFF_MS,
    embeddingModel: envVars.VECTOR_CONTENT_EMBEDDING_MODEL,
    qualityThreshold: envVars.VECTOR_QUALITY_THRESHOLD,
  },
});