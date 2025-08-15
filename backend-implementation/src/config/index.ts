/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CONFIGURATION
 * ============================================================================
 *
 * Central configuration management for the entire application.
 * Loads and validates environment variables, provides type-safe config access.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import Joi from "joi";

/**
 * Environment variable validation schema
 */
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3001),
  API_VERSION: Joi.string().default("v1"),
  APP_NAME: Joi.string().default("waste-management-api"),

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

  // Redis
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default("waste_mgmt:"),
  REDIS_TTL_DEFAULT: Joi.number().default(3600),

  // JWT - RS256 requires public/private key pairs
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_REFRESH_PRIVATE_KEY: Joi.string().required(),
  JWT_REFRESH_PUBLIC_KEY: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  JWT_ALGORITHM: Joi.string().default("RS256"),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  HASH_ROUNDS: Joi.number().default(12),

  // Security
  SESSION_SECRET: Joi.string().min(32).required(),
  BCRYPT_ROUNDS: Joi.number().default(12),
  MFA_ISSUER: Joi.string().default("Waste Management System"),
  PASSWORD_RESET_TOKEN_EXPIRY: Joi.number().default(3600000),
  ACCOUNT_LOCKOUT_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_TIME: Joi.number().default(1800000),
  FORCE_HTTPS: Joi.boolean().default(false),
  TRUST_PROXY: Joi.boolean().default(false),
  SECURE_COOKIES: Joi.boolean().default(false),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(3600000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(true),

  // AWS
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default("us-east-1"),
  AWS_S3_BUCKET: Joi.string().optional(),
  AWS_S3_BUCKET_PHOTOS: Joi.string().optional(),
  AWS_S3_BUCKET_DOCUMENTS: Joi.string().optional(),
  AWS_CLOUDFRONT_URL: Joi.string().optional(),

  // External Services
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PUBLIC_KEY: Joi.string().optional(),

  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: Joi.string().optional(),

  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  SENDGRID_FROM_NAME: Joi.string().default("Waste Management System"),

  SAMSARA_API_TOKEN: Joi.string().optional(),
  SAMSARA_BASE_URL: Joi.string().default("https://api.samsara.com/v1"),
  SAMSARA_WEBHOOK_SECRET: Joi.string().optional(),

  AIRTABLE_API_KEY: Joi.string().optional(),
  AIRTABLE_BASE_ID: Joi.string().optional(),

  MAPBOX_ACCESS_TOKEN: Joi.string().optional(),
  MAPBOX_STYLE_URL: Joi.string().default("mapbox://styles/mapbox/streets-v11"),

  // Threat Intelligence Services
  VIRUSTOTAL_API_KEY: Joi.string().optional(),
  ABUSEIPDB_API_KEY: Joi.string().optional(),
  SHODAN_API_KEY: Joi.string().optional(),
  MISP_URL: Joi.string().optional(),
  MISP_API_KEY: Joi.string().optional(),
  CROWDSTRIKE_CLIENT_ID: Joi.string().optional(),
  CROWDSTRIKE_CLIENT_SECRET: Joi.string().optional(),
  SPLUNK_HOST: Joi.string().optional(),
  SPLUNK_TOKEN: Joi.string().optional(),

  // AI/ML Services Configuration
  // Weaviate Vector Database
  WEAVIATE_URL: Joi.string().default("http://localhost:8080"),
  WEAVIATE_API_KEY: Joi.string().optional(),
  WEAVIATE_BATCH_SIZE: Joi.number().default(100),
  WEAVIATE_TIMEOUT: Joi.number().default(30000),
  
  // OpenAI Integration for Vector Generation
  OPENAI_API_KEY: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().default("text-embedding-ada-002"),
  OPENAI_MAX_TOKENS: Joi.number().default(8192),
  OPENAI_TEMPERATURE: Joi.number().default(0.1),
  
  // OR-Tools Route Optimization
  ORTOOLS_LICENSE_KEY: Joi.string().optional(),
  ORTOOLS_SOLVER_TIMEOUT: Joi.number().default(30000), // 30 seconds
  ORTOOLS_MAX_VEHICLES: Joi.number().default(50),
  
  // GraphHopper Traffic API
  GRAPHHOPPER_API_KEY: Joi.string().optional(),
  GRAPHHOPPER_BASE_URL: Joi.string().default("https://graphhopper.com/api/1"),
  GRAPHHOPPER_TIMEOUT: Joi.number().default(15000),
  
  // Local LLM Configuration (Llama 3.1 8B)
  LLM_SERVICE_URL: Joi.string().default("http://localhost:8001"),
  LLM_MODEL_PATH: Joi.string().default("/app/models/llama-3.1-8b"),
  LLM_MAX_CONTEXT_LENGTH: Joi.number().default(8192),
  LLM_MAX_BATCH_SIZE: Joi.number().default(8),
  LLM_TIMEOUT: Joi.number().default(30000),
  
  // ML Training Configuration
  ML_TRAINING_DATA_PATH: Joi.string().default("/app/data/training"),
  ML_MODEL_STORAGE_PATH: Joi.string().default("/app/models"),
  ML_CACHE_PATH: Joi.string().default("/app/cache"),
  ML_BATCH_SIZE: Joi.number().default(1000),
  ML_VALIDATION_SPLIT: Joi.number().default(0.2),
  ML_TEST_SPLIT: Joi.number().default(0.1),
  
  // AI/ML Feature Flags
  ENABLE_VECTOR_SEARCH: Joi.boolean().default(false), // Disabled by default until deployment
  ENABLE_ROUTE_OPTIMIZATION_ML: Joi.boolean().default(false),
  ENABLE_PREDICTIVE_ANALYTICS: Joi.boolean().default(false),
  ENABLE_LLM_ASSISTANCE: Joi.boolean().default(false),
  ENABLE_ML_AUDIT_LOGGING: Joi.boolean().default(true),
  
  // ML Performance Configuration
  ML_VECTOR_SEARCH_CACHE_TTL: Joi.number().default(3600), // 1 hour
  ML_PREDICTION_CACHE_TTL: Joi.number().default(1800), // 30 minutes
  ML_MODEL_REFRESH_INTERVAL: Joi.number().default(86400000), // 24 hours
  ML_PERFORMANCE_MONITORING: Joi.boolean().default(true),

  // Application Features
  ENABLE_SWAGGER_UI: Joi.boolean().default(true),
  ENABLE_API_DOCS: Joi.boolean().default(true),
  DEBUG_SQL: Joi.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: Joi.boolean().default(false),

  // Performance
  ENABLE_COMPRESSION: Joi.boolean().default(true),
  COMPRESSION_LEVEL: Joi.number().min(1).max(9).default(6),
  REQUEST_SIZE_LIMIT: Joi.string().default("50mb"),
  ENABLE_ETAG: Joi.boolean().default(true),
  ENABLE_CACHE_CONTROL: Joi.boolean().default(true),

  // Logging
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
}).unknown();

/**
 * Validate and load environment variables
 */
const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

/**
 * Application configuration object
 */
export const config = {
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
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    keyPrefix: envVars.REDIS_KEY_PREFIX,
    defaultTTL: envVars.REDIS_TTL_DEFAULT,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
  },

  jwt: {
    privateKey: envVars.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
    publicKey: envVars.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    refreshPrivateKey: envVars.JWT_REFRESH_PRIVATE_KEY.replace(/\\n/g, '\n'),
    refreshPublicKey: envVars.JWT_REFRESH_PUBLIC_KEY.replace(/\\n/g, '\n'),
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    algorithm: envVars.JWT_ALGORITHM,
    issuer: "waste-management-api",
    audience: "waste-management-users",
  },

  security: {
    encryptionKey: envVars.ENCRYPTION_KEY,
    hashRounds: envVars.HASH_ROUNDS,
    sessionSecret: envVars.SESSION_SECRET,
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    mfa: {
      issuer: envVars.MFA_ISSUER,
      window: 2, // Allow 2 windows of 30 seconds each
    },
    passwordReset: {
      tokenExpiry: envVars.PASSWORD_RESET_TOKEN_EXPIRY,
    },
    accountLockout: {
      attempts: envVars.ACCOUNT_LOCKOUT_ATTEMPTS,
      time: envVars.ACCOUNT_LOCKOUT_TIME,
    },
    forceHttps: envVars.FORCE_HTTPS,
    trustProxy: envVars.TRUST_PROXY,
    secureCookies: envVars.SECURE_COOKIES,
    helmet: {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      csp: {
        enabled: true,
      },
    },
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
    message: {
      error: "rate_limit_exceeded",
      message: "Too many requests, please try again later.",
      retryAfter: Math.ceil(envVars.RATE_LIMIT_WINDOW_MS / 1000),
    },
  },

  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3: {
      bucket: envVars.AWS_S3_BUCKET,
      photosBucket: envVars.AWS_S3_BUCKET_PHOTOS,
      documentsBucket: envVars.AWS_S3_BUCKET_DOCUMENTS,
    },
    cloudFrontUrl: envVars.AWS_CLOUDFRONT_URL,
  },

  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    publicKey: envVars.STRIPE_PUBLIC_KEY,
  },

  twilio: {
    accountSid: envVars.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN,
    phoneNumber: envVars.TWILIO_PHONE_NUMBER,
    messagingServiceSid: envVars.TWILIO_MESSAGING_SERVICE_SID,
  },

  sendGrid: {
    apiKey: envVars.SENDGRID_API_KEY,
    fromEmail: envVars.SENDGRID_FROM_EMAIL,
    fromName: envVars.SENDGRID_FROM_NAME,
  },

  samsara: {
    apiToken: envVars.SAMSARA_API_TOKEN,
    baseUrl: envVars.SAMSARA_BASE_URL,
    webhookSecret: envVars.SAMSARA_WEBHOOK_SECRET,
  },

  airtable: {
    apiKey: envVars.AIRTABLE_API_KEY,
    baseId: envVars.AIRTABLE_BASE_ID,
    tables: {
      customers: "Customers",
      contracts: "Service Agreements",
    },
  },

  mapbox: {
    accessToken: envVars.MAPBOX_ACCESS_TOKEN,
    styleUrl: envVars.MAPBOX_STYLE_URL,
  },

  // Threat Intelligence Services Configuration
  threatIntelligence: {
    virusTotal: {
      apiKey: envVars.VIRUSTOTAL_API_KEY,
      baseUrl: "https://www.virustotal.com/vtapi/v2",
      v3BaseUrl: "https://www.virustotal.com/api/v3",
    },
    abuseIPDB: {
      apiKey: envVars.ABUSEIPDB_API_KEY,
      baseUrl: "https://api.abuseipdb.com/api/v2",
    },
    shodan: {
      apiKey: envVars.SHODAN_API_KEY,
      baseUrl: "https://api.shodan.io",
    },
    misp: {
      url: envVars.MISP_URL,
      apiKey: envVars.MISP_API_KEY,
      verifyCert: true,
    },
    crowdstrike: {
      clientId: envVars.CROWDSTRIKE_CLIENT_ID,
      clientSecret: envVars.CROWDSTRIKE_CLIENT_SECRET,
      baseUrl: "https://api.crowdstrike.com",
    },
    splunk: {
      host: envVars.SPLUNK_HOST,
      token: envVars.SPLUNK_TOKEN,
      port: 8089,
      protocol: "https",
    },
  },

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

  // AI/ML Services Configuration
  aiMl: {
    // Vector Intelligence Foundation
    weaviate: {
      url: envVars.WEAVIATE_URL,
      apiKey: envVars.WEAVIATE_API_KEY,
      batchSize: envVars.WEAVIATE_BATCH_SIZE,
      timeout: envVars.WEAVIATE_TIMEOUT,
    },
    
    // OpenAI Integration
    openai: {
      apiKey: envVars.OPENAI_API_KEY,
      model: envVars.OPENAI_MODEL,
      maxTokens: envVars.OPENAI_MAX_TOKENS,
      temperature: envVars.OPENAI_TEMPERATURE,
    },
    
    // Route Optimization Engine
    orTools: {
      licenseKey: envVars.ORTOOLS_LICENSE_KEY,
      solverTimeout: envVars.ORTOOLS_SOLVER_TIMEOUT,
      maxVehicles: envVars.ORTOOLS_MAX_VEHICLES,
    },
    
    // Traffic Integration
    graphHopper: {
      apiKey: envVars.GRAPHHOPPER_API_KEY,
      baseUrl: envVars.GRAPHHOPPER_BASE_URL,
      timeout: envVars.GRAPHHOPPER_TIMEOUT,
    },
    
    // Local LLM Intelligence
    llm: {
      serviceUrl: envVars.LLM_SERVICE_URL,
      modelPath: envVars.LLM_MODEL_PATH,
      maxContextLength: envVars.LLM_MAX_CONTEXT_LENGTH,
      maxBatchSize: envVars.LLM_MAX_BATCH_SIZE,
      timeout: envVars.LLM_TIMEOUT,
    },
    
    // ML Training Configuration
    training: {
      dataPath: envVars.ML_TRAINING_DATA_PATH,
      modelStoragePath: envVars.ML_MODEL_STORAGE_PATH,
      cachePath: envVars.ML_CACHE_PATH,
      batchSize: envVars.ML_BATCH_SIZE,
      validationSplit: envVars.ML_VALIDATION_SPLIT,
      testSplit: envVars.ML_TEST_SPLIT,
    },
    
    // Feature Flags
    features: {
      vectorSearch: envVars.ENABLE_VECTOR_SEARCH,
      routeOptimizationML: envVars.ENABLE_ROUTE_OPTIMIZATION_ML,
      predictiveAnalytics: envVars.ENABLE_PREDICTIVE_ANALYTICS,
      llmAssistance: envVars.ENABLE_LLM_ASSISTANCE,
      auditLogging: envVars.ENABLE_ML_AUDIT_LOGGING,
    },
    
    // Performance Configuration
    performance: {
      vectorSearchCacheTTL: envVars.ML_VECTOR_SEARCH_CACHE_TTL,
      predictionCacheTTL: envVars.ML_PREDICTION_CACHE_TTL,
      modelRefreshInterval: envVars.ML_MODEL_REFRESH_INTERVAL,
      monitoring: envVars.ML_PERFORMANCE_MONITORING,
    },
  },
} as const;

/**
 * Validate required external service configurations based on features enabled
 */
if (config.stripe.secretKey && !config.stripe.webhookSecret) {
  throw new Error(
    "STRIPE_WEBHOOK_SECRET is required when Stripe is configured",
  );
}

if (
  config.notifications.sms.enabled &&
  (!config.twilio.accountSid || !config.twilio.authToken)
) {
  throw new Error(
    "Twilio configuration is required when SMS notifications are enabled",
  );
}

if (config.notifications.email.enabled && !config.sendGrid.apiKey) {
  throw new Error(
    "SendGrid configuration is required when email notifications are enabled",
  );
}

// Export configuration type for TypeScript
export type Config = typeof config;
