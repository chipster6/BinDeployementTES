/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

import dotenv from 'dotenv';
import { logger } from '@/utils/logger';

// Load environment variables
dotenv.config();

/**
 * Configuration interface for type safety
 */
interface Config {
  env: string;
  app: {
    name: string;
    url: string;
    frontendUrl: string;
    customerPortalUrl: string;
  };
  server: {
    port: number;
  };
  api: {
    version: string;
  };
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
    };
  };
  redis: {
    url: string;
    host: string;
    port: number;
    password?: string;
    db: number;
    prefix: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  encryption: {
    key: string;
  };
  session: {
    secret: string;
    expiry: string;
  };
  rateLimit: {
    window: number;
    maxRequests: number;
    skipSuccess: boolean;
  };
  security: {
    bcryptRounds: number;
    mfaIssuer: string;
  };
  cors: {
    origins: string[];
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3: {
      bucket: string;
      photosBucket: string;
    };
    cloudfront: {
      domain: string;
    };
  };
  fileUpload: {
    maxSize: number;
    allowedTypes: string[];
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  sendgrid: {
    apiKey: string;
    fromEmail: string;
  };
  mapbox: {
    accessToken: string;
  };
  googleMaps: {
    apiKey: string;
  };
  samsara: {
    apiToken: string;
    groupId: string;
  };
  airtable: {
    apiKey: string;
    baseId: string;
  };
  monitoring: {
    sentryDsn?: string;
    datadogApiKey?: string;
    newRelicLicenseKey?: string;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
      fromName: string;
    };
  };
  cache: {
    ttl: {
      short: number;
      medium: number;
      long: number;
      routes: number;
    };
  };
  backgroundJobs: {
    redisUrl: string;
    concurrency: number;
  };
  aiService: {
    url: string;
    apiKey: string;
  };
  iotService: {
    url: string;
    apiKey: string;
    mqtt: {
      brokerUrl: string;
      username?: string;
      password?: string;
    };
  };
  logging: {
    level: string;
    format: string;
    filePath: string;
    maxSize: string;
    maxFiles: string;
  };
  healthCheck: {
    timeout: number;
  };
}

/**
 * Validate required environment variables
 */
function validateRequiredEnvVars(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Validate JWT secrets minimum length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
}

/**
 * Parse comma-separated string to array
 */
function parseStringArray(value: string | undefined, defaultValue: string[] = []): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Parse integer with default value
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean with default value
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Validate environment variables
validateRequiredEnvVars();

/**
 * Application configuration object
 */
export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  
  app: {
    name: process.env.APP_NAME || 'Waste Management API',
    url: process.env.APP_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    customerPortalUrl: process.env.CUSTOMER_PORTAL_URL || 'http://localhost:3002',
  },

  server: {
    port: parseInt(process.env.PORT, 3001),
  },

  api: {
    version: process.env.API_VERSION || 'v1',
  },

  database: {
    url: process.env.DATABASE_URL!,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'waste_mgmt',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: parseBoolean(process.env.DB_SSL, false),
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 2),
      max: parseInt(process.env.DB_POOL_MAX, 10),
    },
  },

  redis: {
    url: process.env.REDIS_URL!,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 0),
    prefix: process.env.REDIS_PREFIX || 'waste_mgmt:',
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },

  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
    expiry: process.env.SESSION_EXPIRY || '7d',
  },

  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW, 15),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    skipSuccess: parseBoolean(process.env.RATE_LIMIT_SKIP_SUCCESS, true),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 12),
    mfaIssuer: process.env.MFA_ISSUER || 'Waste Management System',
  },

  cors: {
    origins: parseStringArray(process.env.CORS_ORIGINS, ['http://localhost:3000']),
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'waste-mgmt-files',
      photosBucket: process.env.AWS_S3_PHOTOS_BUCKET || 'waste-mgmt-photos',
    },
    cloudfront: {
      domain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
    },
  },

  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10485760), // 10MB
    allowedTypes: parseStringArray(process.env.ALLOWED_FILE_TYPES, [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@waste-mgmt.com',
  },

  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  samsara: {
    apiToken: process.env.SAMSARA_API_TOKEN || '',
    groupId: process.env.SAMSARA_GROUP_ID || '',
  },

  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    datadogApiKey: process.env.DATADOG_API_KEY,
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || 'apikey',
      pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || '',
      from: process.env.SMTP_FROM || 'noreply@waste-mgmt.com',
      fromName: process.env.SMTP_FROM_NAME || 'Waste Management System',
    },
  },

  cache: {
    ttl: {
      short: parseInt(process.env.CACHE_TTL_SHORT, 300), // 5 minutes
      medium: parseInt(process.env.CACHE_TTL_MEDIUM, 1800), // 30 minutes
      long: parseInt(process.env.CACHE_TTL_LONG, 3600), // 1 hour
      routes: parseInt(process.env.CACHE_TTL_ROUTES, 7200), // 2 hours
    },
  },

  backgroundJobs: {
    redisUrl: process.env.QUEUE_REDIS_URL || process.env.REDIS_URL!,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY, 5),
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:3002',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
  },

  iotService: {
    url: process.env.IOT_SERVICE_URL || 'http://localhost:3003',
    apiKey: process.env.IOT_SERVICE_API_KEY || '',
    mqtt: {
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  healthCheck: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 5000),
  },
};

// Log configuration in non-production environments
if (config.env !== 'production') {
  logger.info('Configuration loaded', {
    component: 'config',
    env: config.env,
    port: config.server.port,
    database: {
      host: config.database.host,
      port: config.database.port,
      name: config.database.name
    },
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db
    }
  });
}