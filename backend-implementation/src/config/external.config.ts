/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES CONFIGURATION
 * ============================================================================
 *
 * External services configuration including AWS, payment processing,
 * communication services, and threat intelligence integrations.
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-15
 * Version: 2.0.0 - Refactored from monolithic config
 */

import * as Joi from "joi";

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED EXTERNAL SERVICES TYPE SAFETY
 * =============================================================================
 * Triangle Coordination: Performance-Optimization-Specialist + Code-Refactoring-Analyst + Database-Architect
 */

export type ExternalServiceStatus = "enabled" | "disabled" | "testing";

export interface RequiredExternalServiceConfig {
  enabled: true;
  credentials: {
    apiKey: string;
    webhookSecret?: string;
  };
  performanceMetrics: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    lastChecked: Date;
  };
}

export interface OptionalExternalServiceConfig {
  enabled: false;
  credentials?: never;
  performanceMetrics?: never;
}

export type ConditionalExternalServiceConfig = 
  | RequiredExternalServiceConfig 
  | OptionalExternalServiceConfig;

export interface ExternalServiceHealthCheck {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  lastChecked: Date;
  responseTime: number;
  errorRate: number;
  rateLimitRemaining?: number;
}

// Feature-Flag Based Configuration Types
export interface NotificationConfig {
  email: { enabled: boolean };
  sms: { enabled: boolean };
  push: { enabled: boolean };
}

export type ConditionalStripeConfig<T extends NotificationConfig> = 
  T['email']['enabled'] extends true 
    ? RequiredExternalServiceConfig & { publicKey: string }
    : OptionalExternalServiceConfig;

export type ConditionalTwilioConfig<T extends NotificationConfig> = 
  T['sms']['enabled'] extends true 
    ? RequiredExternalServiceConfig & {
        credentials: {
          apiKey: string;
          authToken: string;
          phoneNumber: string;
          messagingServiceSid?: string;
        };
      }
    : OptionalExternalServiceConfig;

export type ConditionalSendGridConfig<T extends NotificationConfig> = 
  T['email']['enabled'] extends true 
    ? RequiredExternalServiceConfig & {
        credentials: {
          apiKey: string;
          fromEmail: string;
          fromName: string;
        };
      }
    : OptionalExternalServiceConfig;

/**
 * External services environment variable validation schema
 */
export const externalEnvSchema = Joi.object({
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
});

/**
 * Validate external services environment variables
 */
export const validateExternalEnv = () => {
  const { error, value } = externalEnvSchema.validate(process.env);
  if (error) {
    throw new Error(`External services configuration validation error: ${error instanceof Error ? error?.message : String(error)}`);
  }
  return value;
};

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED EXTERNAL SERVICES CONFIGURATION INTERFACE
 * =============================================================================
 * Enhanced with strict conditional typing and performance monitoring
 */

export interface EnhancedAWSConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  s3: {
    bucket?: string;
    photosBucket?: string;
    documentsBucket?: string;
  };
  cloudFrontUrl?: string;
  performanceMetrics?: {
    requestsPerSecond: number;
    averageLatency: number;
    errorRate: number;
  };
}

export interface EnhancedStripeConfig {
  secretKey?: string;
  webhookSecret?: string;
  publicKey?: string;
  performanceMetrics?: {
    transactionsPerMinute: number;
    averageProcessingTime: number;
    webhookDeliveryRate: number;
  };
}

export interface EnhancedTwilioConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
  performanceMetrics?: {
    messagesPerMinute: number;
    deliveryRate: number;
    averageDeliveryTime: number;
  };
}

export interface EnhancedSendGridConfig {
  apiKey?: string;
  fromEmail?: string;
  fromName: string;
  performanceMetrics?: {
    emailsPerMinute: number;
    deliveryRate: number;
    bounceRate: number;
  };
}

/**
 * Main external services configuration interface with performance optimization
 */
export interface ExternalConfig {
  aws: EnhancedAWSConfig;
  stripe: EnhancedStripeConfig;
  twilio: EnhancedTwilioConfig;
  sendGrid: EnhancedSendGridConfig;
  samsara: {
    apiToken?: string | undefined;
    baseUrl: string;
    webhookSecret?: string | undefined;
  };
  airtable: {
    apiKey?: string | undefined;
    baseId?: string | undefined;
    tables: {
      customers: string;
      contracts: string;
    };
  };
  mapbox: {
    accessToken?: string | undefined;
    styleUrl: string;
  };
  threatIntelligence: {
    virusTotal: {
      apiKey?: string;
      baseUrl: string;
      v3BaseUrl: string;
    };
    abuseIPDB: {
      apiKey?: string;
      baseUrl: string;
    };
    shodan: {
      apiKey?: string;
      baseUrl: string;
    };
    misp: {
      url?: string;
      apiKey?: string;
      verifyCert: boolean;
    };
    crowdstrike: {
      clientId?: string;
      clientSecret?: string;
      baseUrl: string;
    };
    splunk: {
      host?: string;
      token?: string;
      port: number;
      protocol: string;
    };
  };
}

/**
 * Create external services configuration from validated environment variables
 */
export const createExternalConfig = (envVars: any): ExternalConfig => ({
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
});

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED CROSS-SERVICE VALIDATION
 * =============================================================================
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performanceImpact: 'low' | 'medium' | 'high';
}

export const validateExternalServiceDependencies = (
  config: ExternalConfig, 
  notifications: NotificationConfig
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let performanceImpact: 'low' | 'medium' | 'high' = 'low';
  // Validate required external service configurations based on features enabled
  if (config.stripe.secretKey && !config.stripe.webhookSecret) {
    errors.push("STRIPE_WEBHOOK_SECRET is required when Stripe is configured");
    performanceImpact = 'high';
  }

  if (notifications.sms.enabled && (!config.twilio.accountSid || !config.twilio.authToken)) {
    errors.push("Twilio configuration is required when SMS notifications are enabled");
    performanceImpact = 'medium';
  }

  if (notifications.email.enabled && !config.sendGrid.apiKey) {
    errors.push("SendGrid configuration is required when email notifications are enabled");
    performanceImpact = 'medium';
  }

  // Performance-specific warnings
  if (notifications.email.enabled && notifications.sms.enabled && notifications.push.enabled) {
    warnings.push("Multiple notification services enabled - consider performance impact");
    performanceImpact = performanceImpact === 'low' ? 'medium' : performanceImpact;
  }

  // Check for missing performance monitoring configurations
  if (config.stripe.secretKey && !config.stripe.performanceMetrics) {
    warnings.push("Stripe performance monitoring not configured - recommend enabling for production");
  }

  if (config.twilio.accountSid && !config.twilio.performanceMetrics) {
    warnings.push("Twilio performance monitoring not configured - recommend enabling for production");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    performanceImpact,
  };
};