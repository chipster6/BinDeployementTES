/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - APPLICATION CONFIGURATION
 * ============================================================================
 *
 * Core application settings including environment, server, performance,
 * logging, and feature flags.
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-15
 * Version: 2.0.0 - Refactored from monolithic config
 */

import * as Joi from "joi";

/**
 * Application environment variable validation schema
 */
export const appEnvSchema = Joi.object({
  // Core application settings
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3001),
  API_VERSION: Joi.string().default("v1"),
  APP_NAME: Joi.string().default("waste-management-api"),

  // Application features
  ENABLE_SWAGGER_UI: Joi.boolean().default(true),
  ENABLE_API_DOCS: Joi.boolean().default(true),
  DEBUG_SQL: Joi.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: Joi.boolean().default(false),

  // Performance settings
  ENABLE_COMPRESSION: Joi.boolean().default(true),
  COMPRESSION_LEVEL: Joi.number().min(1).max(9).default(6),
  REQUEST_SIZE_LIMIT: Joi.string().default("50mb"),
  ENABLE_ETAG: Joi.boolean().default(true),
  ENABLE_CACHE_CONTROL: Joi.boolean().default(true),

  // Logging configuration
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "http", "verbose", "debug", "silly")
    .default("info"),
  LOG_FILE_MAX_SIZE: Joi.string().default("20m"),
  LOG_FILE_MAX_FILES: Joi.string().default("14d"),
  ENABLE_REQUEST_LOGGING: Joi.boolean().default(true),
  ENABLE_ERROR_TRACKING: Joi.boolean().default(true),

  // Background Jobs
  QUEUE_REDIS_HOST: Joi.string().default("localhost"),
  QUEUE_REDIS_PORT: Joi.number().default(6379),
  QUEUE_REDIS_DB: Joi.number().default(1),
  ENABLE_QUEUE_DASHBOARD: Joi.boolean().default(true),
  QUEUE_DASHBOARD_PORT: Joi.number().default(3003),

  // WebSocket
  WEBSOCKET_PORT: Joi.number().default(3002),

  // Health Check
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_DATABASE: Joi.boolean().default(true),
  HEALTH_CHECK_REDIS: Joi.boolean().default(true),
  HEALTH_CHECK_EXTERNAL_APIS: Joi.boolean().default(true),

  // CORS
  CORS_ORIGINS: Joi.string().default(
    "http://localhost:3000,http://localhost:3001",
  ),

  // Notifications
  ENABLE_EMAIL_NOTIFICATIONS: Joi.boolean().default(true),
  ENABLE_SMS_NOTIFICATIONS: Joi.boolean().default(true),
  ENABLE_PUSH_NOTIFICATIONS: Joi.boolean().default(false),
  NOTIFICATION_QUEUE_ENABLED: Joi.boolean().default(true),

  // Compliance
  ENABLE_AUDIT_LOGGING: Joi.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: Joi.number().default(2555), // 7 years
  GDPR_COMPLIANCE_ENABLED: Joi.boolean().default(true),
  PCI_COMPLIANCE_ENABLED: Joi.boolean().default(true),
});

/**
 * Validate application environment variables
 */
export const validateAppEnv = () => {
  const { error, value } = appEnvSchema.validate(process.env);
  if (error) {
    throw new Error(`App configuration validation error: ${error instanceof Error ? error?.message : String(error)}`);
  }
  return value;
};

/**
 * Application configuration interface
 */
export interface AppConfig {
  app: {
    nodeEnv: string;
    name: string;
    version: string;
    enableSwaggerUI: boolean;
    enableApiDocs: boolean;
    debugSql: boolean;
    mockExternalServices: boolean;
  };
  server: {
    port: number;
    host: string;
  };
  port: number;
  logging: {
    level: string;
    file: {
      maxSize: string;
      maxFiles: string;
    };
    enableRequestLogging: boolean;
    enableErrorTracking: boolean;
  };
  performance: {
    enableCompression: boolean;
    compressionLevel: number;
    requestSizeLimit: string;
    enableEtag: boolean;
    enableCacheControl: boolean;
  };
  queue: {
    enabled: boolean;
    redis: {
      host: string;
      port: number;
      db: number;
    };
    dashboard: {
      enabled: boolean;
      port: number;
    };
  };
  websocket: {
    port: number;
    pingTimeout: number;
    pingInterval: number;
  };
  healthCheck: {
    enabled: boolean;
    checkDatabase: boolean;
    checkRedis: boolean;
    checkExternalApis: boolean;
    timeout: number;
  };
  cors: {
    origins: string[];
  };
  notifications: {
    email: { enabled: boolean };
    sms: { enabled: boolean };
    push: { enabled: boolean };
    queue: { enabled: boolean };
  };
  compliance: {
    audit: {
      enabled: boolean;
      retentionDays: number;
    };
    gdpr: { enabled: boolean };
    pci: { enabled: boolean };
  };
}

/**
 * Create application configuration from validated environment variables
 */
export const createAppConfig = (envVars: any): AppConfig => ({
  app: {
    nodeEnv: envVars.NODE_ENV,
    name: envVars.APP_NAME,
    version: envVars.API_VERSION,
    enableSwaggerUI: envVars.ENABLE_SWAGGER_UI,
    enableApiDocs: envVars.ENABLE_API_DOCS,
    debugSql: envVars.DEBUG_SQL,
    mockExternalServices: envVars.MOCK_EXTERNAL_SERVICES,
  },

  server: {
    port: envVars.PORT,
    host: "0.0.0.0",
  },

  port: envVars.PORT,

  logging: {
    level: envVars.LOG_LEVEL,
    file: {
      maxSize: envVars.LOG_FILE_MAX_SIZE,
      maxFiles: envVars.LOG_FILE_MAX_FILES,
    },
    enableRequestLogging: envVars.ENABLE_REQUEST_LOGGING,
    enableErrorTracking: envVars.ENABLE_ERROR_TRACKING,
  },

  performance: {
    enableCompression: envVars.ENABLE_COMPRESSION,
    compressionLevel: envVars.COMPRESSION_LEVEL,
    requestSizeLimit: envVars.REQUEST_SIZE_LIMIT,
    enableEtag: envVars.ENABLE_ETAG,
    enableCacheControl: envVars.ENABLE_CACHE_CONTROL,
  },

  queue: {
    enabled: true,
    redis: {
      host: envVars.QUEUE_REDIS_HOST,
      port: envVars.QUEUE_REDIS_PORT,
      db: envVars.QUEUE_REDIS_DB,
    },
    dashboard: {
      enabled: envVars.ENABLE_QUEUE_DASHBOARD,
      port: envVars.QUEUE_DASHBOARD_PORT,
    },
  },

  websocket: {
    port: envVars.WEBSOCKET_PORT,
    pingTimeout: 60000,
    pingInterval: 25000,
  },

  healthCheck: {
    enabled: envVars.HEALTH_CHECK_ENABLED,
    checkDatabase: envVars.HEALTH_CHECK_DATABASE,
    checkRedis: envVars.HEALTH_CHECK_REDIS,
    checkExternalApis: envVars.HEALTH_CHECK_EXTERNAL_APIS,
    timeout: 5000,
  },

  cors: {
    origins: envVars.CORS_ORIGINS.split(",").map((origin: string) =>
      origin.trim(),
    ),
  },

  notifications: {
    email: {
      enabled: envVars.ENABLE_EMAIL_NOTIFICATIONS,
    },
    sms: {
      enabled: envVars.ENABLE_SMS_NOTIFICATIONS,
    },
    push: {
      enabled: envVars.ENABLE_PUSH_NOTIFICATIONS,
    },
    queue: {
      enabled: envVars.NOTIFICATION_QUEUE_ENABLED,
    },
  },

  compliance: {
    audit: {
      enabled: envVars.ENABLE_AUDIT_LOGGING,
      retentionDays: envVars.AUDIT_LOG_RETENTION_DAYS,
    },
    gdpr: {
      enabled: envVars.GDPR_COMPLIANCE_ENABLED,
    },
    pci: {
      enabled: envVars.PCI_COMPLIANCE_ENABLED,
    },
  },
});