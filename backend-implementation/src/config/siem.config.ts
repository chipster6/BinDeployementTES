/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SIEM CONFIGURATION
 * ============================================================================
 *
 * Comprehensive SIEM configuration module supporting multiple platforms
 * including ELK Stack, Splunk, DataDog, QRadar, and Azure Sentinel.
 * 
 * Features:
 * - Multi-platform SIEM configuration
 * - Environment-specific settings
 * - Security and compliance validation
 * - Performance optimization settings
 * - Alert and notification configuration
 * - Connection pooling and retry logic
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-22
 * Version: 1.0.0
 */

import { z } from 'zod';
import { logger } from '@/utils/logger';

/**
 * =============================================================================
 * SIEM CONFIGURATION SCHEMAS
 * =============================================================================
 */

/**
 * ELK Stack configuration schema
 */
const ELKConfigSchema = z.object({
  enabled: z.boolean().default(false),
  elasticsearch: z.object({
    host: z.string().url().optional(),
    port: z.number().int().min(1).max(65535).default(9200),
    protocol: z.enum(['http', 'https']).default('http'),
    index: z.string().min(1).default('waste-management-logs'),
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    maxRetries: z.number().int().min(0).max(10).default(3),
    requestTimeout: z.number().int().min(1000).max(300000).default(30000),
    sniffOnStart: z.boolean().default(false),
    sniffInterval: z.number().int().min(30000).optional()
  }),
  logstash: z.object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).default(5044),
    protocol: z.enum(['tcp', 'udp', 'http', 'https']).default('http'),
    endpoint: z.string().default('/logstash'),
    batchSize: z.number().int().min(1).max(10000).default(100),
    batchTimeout: z.number().int().min(100).max(60000).default(5000)
  }),
  kibana: z.object({
    host: z.string().url().optional(),
    port: z.number().int().min(1).max(65535).default(5601),
    basePath: z.string().default(''),
    username: z.string().optional(),
    password: z.string().optional()
  })
});

/**
 * Splunk configuration schema
 */
const SplunkConfigSchema = z.object({
  enabled: z.boolean().default(false),
  hec: z.object({
    endpoint: z.string().url(),
    token: z.string().min(36).max(36), // Splunk HEC tokens are 36 characters
    port: z.number().int().min(1).max(65535).default(8088),
    protocol: z.enum(['http', 'https']).default('https'),
    validateCertificate: z.boolean().default(true),
    sourcetype: z.string().default('waste_management_json'),
    source: z.string().default('waste_management_api'),
    index: z.string().default('main'),
    batchSize: z.number().int().min(1).max(1000).default(50),
    batchTimeout: z.number().int().min(1000).max(300000).default(10000),
    compression: z.boolean().default(true)
  }),
  search: z.object({
    host: z.string().url().optional(),
    port: z.number().int().min(1).max(65535).default(8089),
    username: z.string().optional(),
    password: z.string().optional(),
    owner: z.string().default('nobody'),
    app: z.string().default('search')
  })
});

/**
 * DataDog configuration schema
 */
const DataDogConfigSchema = z.object({
  enabled: z.boolean().default(false),
  logs: z.object({
    endpoint: z.string().url().default('https://http-intake.logs.datadoghq.com'),
    apiKey: z.string().min(32).max(32), // DataDog API keys are 32 characters
    service: z.string().default('waste-management-api'),
    source: z.string().default('nodejs'),
    hostname: z.string().optional(),
    tags: z.array(z.string()).default(['env:production', 'service:waste-management']),
    batchSize: z.number().int().min(1).max(1000).default(200),
    batchTimeout: z.number().int().min(100).max(60000).default(3000),
    compression: z.boolean().default(true)
  }),
  metrics: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().url().default('https://api.datadoghq.com'),
    apiKey: z.string().optional(),
    appKey: z.string().optional()
  }),
  apm: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().url().default('https://trace.agent.datadoghq.com'),
    serviceName: z.string().default('waste-management-api')
  })
});

/**
 * IBM QRadar configuration schema
 */
const QRadarConfigSchema = z.object({
  enabled: z.boolean().default(false),
  restApi: z.object({
    endpoint: z.string().url(),
    version: z.string().default('19.0'),
    secToken: z.string().min(1),
    validateCertificate: z.boolean().default(true),
    timeout: z.number().int().min(1000).max(300000).default(30000)
  }),
  syslog: z.object({
    enabled: z.boolean().default(false),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).default(514),
    protocol: z.enum(['udp', 'tcp', 'tls']).default('udp'),
    facility: z.number().int().min(0).max(23).default(16), // Local0
    severity: z.number().int().min(0).max(7).default(6) // Info
  })
});

/**
 * Azure Sentinel configuration schema
 */
const SentinelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  workspaceId: z.string().uuid(),
  sharedKey: z.string().min(1),
  logType: z.string().default('WasteManagementLogs'),
  timeStampField: z.string().default('timestamp'),
  endpoint: z.string().url().optional(),
  region: z.string().default('eastus'),
  batchSize: z.number().int().min(1).max(30000).default(100),
  batchTimeout: z.number().int().min(1000).max(300000).default(5000)
});

/**
 * Streaming configuration schema
 */
const StreamingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().int().min(1024).max(65535).default(8081),
  path: z.string().default('/siem/stream'),
  maxClients: z.number().int().min(1).max(10000).default(100),
  maxMessagesPerSecond: z.number().int().min(1).max(100000).default(1000),
  maxBytesPerSecond: z.number().int().min(1024).max(1073741824).default(1048576), // 1MB
  heartbeatInterval: z.number().int().min(1000).max(300000).default(30000),
  compression: z.boolean().default(true),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['*']),
    credentials: z.boolean().default(false)
  }),
  auth: z.object({
    required: z.boolean().default(true),
    method: z.enum(['jwt', 'apikey', 'basic']).default('jwt'),
    skipPatterns: z.array(z.string()).default(['/health', '/metrics'])
  })
});

/**
 * Correlation engine configuration schema
 */
const CorrelationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  windowSize: z.number().int().min(60000).max(3600000).default(1800000), // 30 minutes
  maxEvents: z.number().int().min(100).max(1000000).default(10000),
  cleanupInterval: z.number().int().min(60000).max(86400000).default(3600000), // 1 hour
  rules: z.object({
    defaultEnabled: z.boolean().default(true),
    customRulesPath: z.string().optional(),
    reloadInterval: z.number().int().min(60000).optional()
  }),
  alerting: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.enum(['email', 'slack', 'teams', 'webhook', 'sms'])).default(['email']),
    rateLimit: z.number().int().min(1).max(3600).default(60) // seconds between alerts
  })
});

/**
 * Performance configuration schema
 */
const PerformanceConfigSchema = z.object({
  bufferSize: z.number().int().min(100).max(1000000).default(10000),
  flushInterval: z.number().int().min(100).max(60000).default(5000),
  compressionLevel: z.number().int().min(0).max(9).default(6),
  retryAttempts: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(100).max(30000).default(1000),
  timeout: z.number().int().min(1000).max(300000).default(30000),
  connectionPool: z.object({
    maxConnections: z.number().int().min(1).max(100).default(10),
    keepAlive: z.boolean().default(true),
    keepAliveTimeout: z.number().int().min(1000).max(300000).default(30000)
  }),
  metrics: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().int().min(1000).max(300000).default(60000),
    retention: z.number().int().min(3600).max(604800).default(86400) // 24 hours
  })
});

/**
 * Main SIEM configuration schema
 */
const SIEMConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultPlatform: z.enum(['elk', 'splunk', 'datadog', 'qradar', 'sentinel']).default('elk'),
  elk: ELKConfigSchema.optional(),
  splunk: SplunkConfigSchema.optional(),
  datadog: DataDogConfigSchema.optional(),
  qradar: QRadarConfigSchema.optional(),
  sentinel: SentinelConfigSchema.optional(),
  streaming: StreamingConfigSchema,
  correlation: CorrelationConfigSchema,
  performance: PerformanceConfigSchema,
  security: z.object({
    encryption: z.object({
      enabled: z.boolean().default(true),
      algorithm: z.string().default('aes-256-gcm'),
      keyRotation: z.number().int().min(86400).max(31536000).default(2592000) // 30 days
    }),
    validation: z.object({
      strictMode: z.boolean().default(true),
      maxFieldLength: z.number().int().min(100).max(1000000).default(65536),
      allowedFields: z.array(z.string()).optional()
    }),
    audit: z.object({
      logConfigChanges: z.boolean().default(true),
      logAccessAttempts: z.boolean().default(true),
      retention: z.number().int().min(86400).max(31536000).default(2592000) // 30 days
    })
  })
});

/**
 * =============================================================================
 * ENVIRONMENT VARIABLE VALIDATION
 * =============================================================================
 */

/**
 * Validate SIEM environment variables
 */
export function validateSIEMEnv(): Record<string, any> {
  const env = process.env;

  // Collect SIEM-related environment variables
  const siemEnvVars: Record<string, any> = {
    // General SIEM settings
    SIEM_ENABLED: env.SIEM_ENABLED === 'true',
    SIEM_DEFAULT_PLATFORM: env?.SIEM_DEFAULT_PLATFORM || 'elk',

    // ELK Stack
    ELK_ENABLED: env.ELK_ENABLED === 'true',
    ELASTICSEARCH_HOST: env.ELASTICSEARCH_HOST,
    ELASTICSEARCH_PORT: env.ELASTICSEARCH_PORT ? parseInt(env.ELASTICSEARCH_PORT) : undefined,
    ELASTICSEARCH_PROTOCOL: env.ELASTICSEARCH_PROTOCOL,
    ELASTICSEARCH_INDEX: env.ELASTICSEARCH_INDEX,
    ELASTICSEARCH_USERNAME: env.ELASTICSEARCH_USERNAME,
    ELASTICSEARCH_PASSWORD: env.ELASTICSEARCH_PASSWORD,
    ELASTICSEARCH_API_KEY: env.ELASTICSEARCH_API_KEY,
    LOGSTASH_HOST: env.LOGSTASH_HOST,
    LOGSTASH_PORT: env.LOGSTASH_PORT ? parseInt(env.LOGSTASH_PORT) : undefined,
    KIBANA_HOST: env.KIBANA_HOST,

    // Splunk
    SPLUNK_ENABLED: env.SPLUNK_ENABLED === 'true',
    SPLUNK_HEC_ENDPOINT: env.SPLUNK_HEC_ENDPOINT,
    SPLUNK_HEC_TOKEN: env.SPLUNK_HEC_TOKEN,
    SPLUNK_INDEX: env.SPLUNK_INDEX,
    SPLUNK_SOURCETYPE: env.SPLUNK_SOURCETYPE,

    // DataDog
    DATADOG_ENABLED: env.DATADOG_ENABLED === 'true',
    DATADOG_API_KEY: env.DATADOG_API_KEY,
    DATADOG_LOGS_ENDPOINT: env.DATADOG_LOGS_ENDPOINT,
    DATADOG_SERVICE: env.DATADOG_SERVICE,

    // QRadar
    QRADAR_ENABLED: env.QRADAR_ENABLED === 'true',
    QRADAR_ENDPOINT: env.QRADAR_ENDPOINT,
    QRADAR_SEC_TOKEN: env.QRADAR_SEC_TOKEN,
    QRADAR_SYSLOG_HOST: env.QRADAR_SYSLOG_HOST,

    // Azure Sentinel
    SENTINEL_ENABLED: env.SENTINEL_ENABLED === 'true',
    SENTINEL_WORKSPACE_ID: env.SENTINEL_WORKSPACE_ID,
    SENTINEL_SHARED_KEY: env.SENTINEL_SHARED_KEY,
    SENTINEL_LOG_TYPE: env.SENTINEL_LOG_TYPE,

    // Streaming
    SIEM_STREAMING_ENABLED: env.SIEM_STREAMING_ENABLED !== 'false',
    SIEM_STREAMING_PORT: env.SIEM_STREAMING_PORT ? parseInt(env.SIEM_STREAMING_PORT) : undefined,
    SIEM_MAX_CLIENTS: env.SIEM_MAX_CLIENTS ? parseInt(env.SIEM_MAX_CLIENTS) : undefined,

    // Correlation
    SIEM_CORRELATION_ENABLED: env.SIEM_CORRELATION_ENABLED !== 'false',
    SIEM_CORRELATION_WINDOW: env.SIEM_CORRELATION_WINDOW ? parseInt(env.SIEM_CORRELATION_WINDOW) : undefined,

    // Performance
    SIEM_BUFFER_SIZE: env.SIEM_BUFFER_SIZE ? parseInt(env.SIEM_BUFFER_SIZE) : undefined,
    SIEM_FLUSH_INTERVAL: env.SIEM_FLUSH_INTERVAL ? parseInt(env.SIEM_FLUSH_INTERVAL) : undefined,
    SIEM_RETRY_ATTEMPTS: env.SIEM_RETRY_ATTEMPTS ? parseInt(env.SIEM_RETRY_ATTEMPTS) : undefined,

    // Security
    SIEM_ENCRYPTION_ENABLED: env.SIEM_ENCRYPTION_ENABLED !== 'false',
    SIEM_STRICT_VALIDATION: env.SIEM_STRICT_VALIDATION !== 'false',
    SIEM_AUDIT_ENABLED: env.SIEM_AUDIT_ENABLED !== 'false'
  };

  // Remove undefined values
  Object.keys(siemEnvVars).forEach(key => {
    if (siemEnvVars[key] === undefined) {
      delete siemEnvVars[key];
    }
  });

  return siemEnvVars;
}

/**
 * =============================================================================
 * CONFIGURATION CREATION
 * =============================================================================
 */

/**
 * Create SIEM configuration from environment variables
 */
export function createSIEMConfig(envVars: Record<string, any>): any {
  try {
    const config: any = {
      enabled: envVars?.SIEM_ENABLED || true,
      defaultPlatform: envVars?.SIEM_DEFAULT_PLATFORM || 'elk'
    };

    // ELK Stack configuration
    if (envVars?.ELK_ENABLED || envVars.ELASTICSEARCH_HOST) {
      config.elk = {
        enabled: envVars?.ELK_ENABLED || false,
        elasticsearch: {
          host: envVars.ELASTICSEARCH_HOST,
          port: envVars?.ELASTICSEARCH_PORT || 9200,
          protocol: envVars?.ELASTICSEARCH_PROTOCOL || 'http',
          index: envVars?.ELASTICSEARCH_INDEX || 'waste-management-logs',
          username: envVars.ELASTICSEARCH_USERNAME,
          password: envVars.ELASTICSEARCH_PASSWORD,
          apiKey: envVars.ELASTICSEARCH_API_KEY
        },
        logstash: {
          host: envVars.LOGSTASH_HOST,
          port: envVars?.LOGSTASH_PORT || 5044
        },
        kibana: {
          host: envVars.KIBANA_HOST,
          port: 5601
        }
      };
    }

    // Splunk configuration
    if (envVars?.SPLUNK_ENABLED || envVars.SPLUNK_HEC_ENDPOINT) {
      config.splunk = {
        enabled: envVars?.SPLUNK_ENABLED || false,
        hec: {
          endpoint: envVars.SPLUNK_HEC_ENDPOINT,
          token: envVars.SPLUNK_HEC_TOKEN,
          index: envVars?.SPLUNK_INDEX || 'main',
          sourcetype: envVars?.SPLUNK_SOURCETYPE || 'waste_management_json'
        }
      };
    }

    // DataDog configuration
    if (envVars?.DATADOG_ENABLED || envVars.DATADOG_API_KEY) {
      config.datadog = {
        enabled: envVars?.DATADOG_ENABLED || false,
        logs: {
          endpoint: envVars?.DATADOG_LOGS_ENDPOINT || 'https://http-intake.logs.datadoghq.com',
          apiKey: envVars.DATADOG_API_KEY,
          service: envVars?.DATADOG_SERVICE || 'waste-management-api'
        }
      };
    }

    // QRadar configuration
    if (envVars?.QRADAR_ENABLED || envVars.QRADAR_ENDPOINT) {
      config.qradar = {
        enabled: envVars?.QRADAR_ENABLED || false,
        restApi: {
          endpoint: envVars.QRADAR_ENDPOINT,
          secToken: envVars.QRADAR_SEC_TOKEN
        },
        syslog: {
          enabled: !!envVars.QRADAR_SYSLOG_HOST,
          host: envVars.QRADAR_SYSLOG_HOST
        }
      };
    }

    // Azure Sentinel configuration
    if (envVars?.SENTINEL_ENABLED || envVars.SENTINEL_WORKSPACE_ID) {
      config.sentinel = {
        enabled: envVars?.SENTINEL_ENABLED || false,
        workspaceId: envVars.SENTINEL_WORKSPACE_ID,
        sharedKey: envVars.SENTINEL_SHARED_KEY,
        logType: envVars?.SENTINEL_LOG_TYPE || 'WasteManagementLogs'
      };
    }

    // Streaming configuration
    config.streaming = {
      enabled: envVars.SIEM_STREAMING_ENABLED !== false,
      port: envVars?.SIEM_STREAMING_PORT || 8081,
      maxClients: envVars?.SIEM_MAX_CLIENTS || 100
    };

    // Correlation configuration
    config.correlation = {
      enabled: envVars.SIEM_CORRELATION_ENABLED !== false,
      windowSize: envVars?.SIEM_CORRELATION_WINDOW || 1800000 // 30 minutes
    };

    // Performance configuration
    config.performance = {
      bufferSize: envVars?.SIEM_BUFFER_SIZE || 10000,
      flushInterval: envVars?.SIEM_FLUSH_INTERVAL || 5000,
      retryAttempts: envVars?.SIEM_RETRY_ATTEMPTS || 3
    };

    // Security configuration
    config.security = {
      encryption: {
        enabled: envVars.SIEM_ENCRYPTION_ENABLED !== false
      },
      validation: {
        strictMode: envVars.SIEM_STRICT_VALIDATION !== false
      },
      audit: {
        logConfigChanges: envVars.SIEM_AUDIT_ENABLED !== false
      }
    };

    return config;

  } catch (error: unknown) {
    logger.error('Failed to create SIEM configuration', {
      error: error instanceof Error ? error?.message : String(error)
    });
    throw new Error(`SIEM configuration creation failed: ${error instanceof Error ? error?.message : String(error)}`);
  }
}

/**
 * =============================================================================
 * CONFIGURATION VALIDATION
 * =============================================================================
 */

/**
 * Validate SIEM configuration
 */
export function validateSIEMConfig(config: any): any {
  try {
    const validatedConfig = SIEMConfigSchema.parse(config);
    
    logger.info('SIEM configuration validated successfully', {
      enabled: validatedConfig.enabled,
      platforms: {
        elk: validatedConfig.elk?.enabled || false,
        splunk: validatedConfig.splunk?.enabled || false,
        datadog: validatedConfig.datadog?.enabled || false,
        qradar: validatedConfig.qradar?.enabled || false,
        sentinel: validatedConfig.sentinel?.enabled || false
      },
      streaming: validatedConfig.streaming.enabled,
      correlation: validatedConfig.correlation.enabled
    });

    return validatedConfig;

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((err: unknown) => {
        const zodIssue = err as z.ZodIssue;
        return {
          field: zodIssue.path.join('.'),
          message: zodIssue?.message,
          code: zodIssue.code
        };
      });

      logger.error('SIEM configuration validation failed', {
        errors: formattedErrors
      });

      throw new Error(`SIEM configuration validation failed: ${JSON.stringify(formattedErrors)}`);
    }

    logger.error('SIEM configuration validation error', {
      error: error instanceof Error ? error?.message : String(error)
    });

    throw new Error(`SIEM configuration validation failed: ${error instanceof Error ? error?.message : String(error)}`);
  }
}

/**
 * =============================================================================
 * CONFIGURATION UTILITIES
 * =============================================================================
 */

/**
 * Get active SIEM platforms
 */
export function getActiveSIEMPlatforms(config: any): string[] {
  const activePlatforms: string[] = [];

  if (config.elk?.enabled) activePlatforms.push('elk');
  if (config.splunk?.enabled) activePlatforms.push('splunk');
  if (config.datadog?.enabled) activePlatforms.push('datadog');
  if (config.qradar?.enabled) activePlatforms.push('qradar');
  if (config.sentinel?.enabled) activePlatforms.push('sentinel');

  return activePlatforms;
}

/**
 * Check if any SIEM platform is configured
 */
export function hasSIEMPlatforms(config: any): boolean {
  return getActiveSIEMPlatforms(config).length > 0;
}

/**
 * Get SIEM configuration summary for logging
 */
export function getSIEMConfigSummary(config: any): Record<string, any> {
  return {
    enabled: config.enabled,
    defaultPlatform: config.defaultPlatform,
    activePlatforms: getActiveSIEMPlatforms(config),
    streaming: {
      enabled: config.streaming.enabled,
      port: config.streaming.port,
      maxClients: config.streaming.maxClients
    },
    correlation: {
      enabled: config.correlation.enabled,
      windowSize: config.correlation.windowSize
    },
    performance: {
      bufferSize: config.performance.bufferSize,
      flushInterval: config.performance.flushInterval
    },
    security: {
      encryption: config.security.encryption.enabled,
      strictValidation: config.security.validation.strictMode,
      auditEnabled: config.security.audit.logConfigChanges
    }
  };
}

/**
 * Export configuration types for TypeScript
 */
export type SIEMConfig = z.infer<typeof SIEMConfigSchema>;
export type ELKConfig = z.infer<typeof ELKConfigSchema>;
export type SplunkConfig = z.infer<typeof SplunkConfigSchema>;
export type DataDogConfig = z.infer<typeof DataDogConfigSchema>;
export type QRadarConfig = z.infer<typeof QRadarConfigSchema>;
export type SentinelConfig = z.infer<typeof SentinelConfigSchema>;
export type StreamingConfig = z.infer<typeof StreamingConfigSchema>;
export type CorrelationConfig = z.infer<typeof CorrelationConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

/**
 * Export all schemas for external validation
 */
export {
  SIEMConfigSchema,
  ELKConfigSchema,
  SplunkConfigSchema,
  DataDogConfigSchema,
  QRadarConfigSchema,
  SentinelConfigSchema,
  StreamingConfigSchema,
  CorrelationConfigSchema,
  PerformanceConfigSchema
};