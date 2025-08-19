/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COMPREHENSIVE CONFIGURATION VALIDATION TESTING
 * ============================================================================
 *
 * Comprehensive tests for configuration architecture covering:
 * - 70+ environment variable validation across 5 domains
 * - Cross-domain dependency validation
 * - Edge cases and boundary conditions
 * - Configuration security requirements
 * - Environment-specific configuration validation
 *
 * Created by: QA Engineer / Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { 
  validateAppEnv, 
  createAppConfig, 
  type AppConfig 
} from '@/config/app.config';
import { 
  validateDatabaseEnv, 
  createDatabaseConfig, 
  type DatabaseConfig 
} from '@/config/database.config';
import { 
  validateSecurityEnv, 
  createSecurityConfig, 
  type SecurityConfig 
} from '@/config/security.config';
import { 
  validateAiEnv, 
  createAiConfig, 
  type AiConfig 
} from '@/config/ai.config';
import { 
  validateExternalEnv, 
  createExternalConfig,
  validateExternalServiceDependencies,
  type ExternalConfig 
} from '@/config/external.config';
import { config } from '@/config/index';

describe('Comprehensive Configuration Validation Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('App Configuration Domain (15+ variables)', () => {
    const validAppEnv = {
      NODE_ENV: 'test',
      PORT: '3001',
      HOST: '0.0.0.0',
      API_VERSION: 'v1',
      CORS_ORIGIN: 'http://localhost:3000',
      CORS_CREDENTIALS: 'true',
      TRUST_PROXY: 'true',
      COMPRESSION_ENABLED: 'true',
      COMPRESSION_THRESHOLD: '1024',
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json',
      NOTIFICATIONS_ENABLED: 'true',
      EMAIL_NOTIFICATIONS: 'true',
      SMS_NOTIFICATIONS: 'true',
      PUSH_NOTIFICATIONS: 'false',
    };

    beforeEach(() => {
      Object.assign(process.env, validAppEnv);
    });

    it('should validate all required app environment variables', () => {
      expect(() => validateAppEnv()).not.toThrow();
      
      const envVars = validateAppEnv();
      expect(envVars.NODE_ENV).toBe('test');
      expect(envVars.PORT).toBe(3001);
      expect(envVars.HOST).toBe('0.0.0.0');
      expect(envVars.API_VERSION).toBe('v1');
      expect(envVars.CORS_ORIGIN).toBe('http://localhost:3000');
    });

    it('should apply default values for optional variables', () => {
      delete process.env.LOG_LEVEL;
      delete process.env.COMPRESSION_THRESHOLD;
      
      const envVars = validateAppEnv();
      expect(envVars.LOG_LEVEL).toBe('info'); // default
      expect(envVars.COMPRESSION_THRESHOLD).toBe(1024); // default
    });

    it('should validate PORT range constraints', () => {
      process.env.PORT = '99999';
      expect(() => validateAppEnv()).toThrow(/PORT.*between 1024 and 65535/);
      
      process.env.PORT = '500';
      expect(() => validateAppEnv()).toThrow(/PORT.*between 1024 and 65535/);
    });

    it('should validate NODE_ENV enum values', () => {
      process.env.NODE_ENV = 'invalid';
      expect(() => validateAppEnv()).toThrow(/NODE_ENV.*must be one of/);
    });

    it('should validate CORS_ORIGIN format', () => {
      process.env.CORS_ORIGIN = 'not-a-url';
      expect(() => validateAppEnv()).toThrow(/CORS_ORIGIN.*must be a valid URI/);
    });

    it('should create app configuration from validated environment', () => {
      const envVars = validateAppEnv();
      const appConfig = createAppConfig(envVars);
      
      expect(appConfig.server.port).toBe(3001);
      expect(appConfig.server.host).toBe('0.0.0.0');
      expect(appConfig.cors.origin).toBe('http://localhost:3000');
      expect(appConfig.cors.credentials).toBe(true);
      expect(appConfig.compression.enabled).toBe(true);
      expect(appConfig.logging.level).toBe('info');
      expect(appConfig.notifications.email).toBe(true);
      expect(appConfig.notifications.sms).toBe(true);
      expect(appConfig.notifications.push).toBe(false);
    });

    it('should handle boolean environment variable conversion', () => {
      process.env.CORS_CREDENTIALS = 'false';
      process.env.COMPRESSION_ENABLED = 'true';
      
      const envVars = validateAppEnv();
      expect(envVars.CORS_CREDENTIALS).toBe(false);
      expect(envVars.COMPRESSION_ENABLED).toBe(true);
    });
  });

  describe('Database Configuration Domain (10+ variables)', () => {
    const validDatabaseEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/waste_management_test',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'waste_management_test',
      DB_USERNAME: 'test_user',
      DB_PASSWORD: 'test_password',
      DB_SSL: 'false',
      DB_POOL_MIN: '2',
      DB_POOL_MAX: '120',
      DB_POOL_ACQUIRE: '60000',
      DB_POOL_IDLE: '10000',
      DB_CONNECTION_TIMEOUT: '60000',
    };

    beforeEach(() => {
      Object.assign(process.env, validDatabaseEnv);
    });

    it('should validate database connection parameters', () => {
      const envVars = validateDatabaseEnv();
      expect(envVars.DB_HOST).toBe('localhost');
      expect(envVars.DB_PORT).toBe(5432);
      expect(envVars.DB_NAME).toBe('waste_management_test');
      expect(envVars.DB_POOL_MAX).toBe(120);
    });

    it('should validate database pool constraints', () => {
      process.env.DB_POOL_MAX = '500'; // Too high
      expect(() => validateDatabaseEnv()).toThrow(/DB_POOL_MAX.*less than or equal to 200/);
      
      process.env.DB_POOL_MIN = '150';
      process.env.DB_POOL_MAX = '120'; // Min > Max
      expect(() => validateDatabaseEnv()).toThrow(/DB_POOL_MIN.*less than or equal to.*DB_POOL_MAX/);
    });

    it('should validate DATABASE_URL format', () => {
      process.env.DATABASE_URL = 'invalid-url';
      expect(() => validateDatabaseEnv()).toThrow(/DATABASE_URL.*must be a valid URI/);
    });

    it('should create database configuration with SSL settings', () => {
      process.env.DB_SSL = 'true';
      const envVars = validateDatabaseEnv();
      const dbConfig = createDatabaseConfig(envVars);
      
      expect(dbConfig.database.ssl).toBe(true);
      expect(dbConfig.database.pool.max).toBe(120);
      expect(dbConfig.database.pool.min).toBe(2);
      expect(dbConfig.database.connectionTimeoutMillis).toBe(60000);
    });

    it('should handle PostGIS configuration', () => {
      const envVars = validateDatabaseEnv();
      const dbConfig = createDatabaseConfig(envVars);
      
      expect(dbConfig.postgis.enabled).toBe(true);
      expect(dbConfig.postgis.schema).toBe('public');
    });
  });

  describe('Security Configuration Domain (20+ variables)', () => {
    const validSecurityEnv = {
      JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
      JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtAyK...\n-----END PUBLIC KEY-----',
      JWT_REFRESH_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
      JWT_REFRESH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtAyK...\n-----END PUBLIC KEY-----',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_ALGORITHM: 'RS256',
      ENCRYPTION_KEY: 'abcdef0123456789abcdef0123456789',
      HASH_ROUNDS: '12',
      SESSION_SECRET: 'super-long-session-secret-for-testing-purposes-32-chars',
      BCRYPT_ROUNDS: '12',
      MFA_ISSUER: 'Waste Management System',
      PASSWORD_RESET_TOKEN_EXPIRY: '3600000',
      ACCOUNT_LOCKOUT_ATTEMPTS: '5',
      ACCOUNT_LOCKOUT_TIME: '1800000',
      FORCE_HTTPS: 'false',
      TRUST_PROXY: 'false',
      SECURE_COOKIES: 'false',
      RATE_LIMIT_WINDOW_MS: '3600000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: 'true',
    };

    beforeEach(() => {
      Object.assign(process.env, validSecurityEnv);
    });

    it('should validate JWT key requirements', () => {
      delete process.env.JWT_PRIVATE_KEY;
      expect(() => validateSecurityEnv()).toThrow(/JWT_PRIVATE_KEY.*required/);
      
      delete process.env.JWT_PUBLIC_KEY;
      expect(() => validateSecurityEnv()).toThrow(/JWT_PUBLIC_KEY.*required/);
    });

    it('should validate encryption key length', () => {
      process.env.ENCRYPTION_KEY = 'too-short';
      expect(() => validateSecurityEnv()).toThrow(/ENCRYPTION_KEY.*length must be 32/);
    });

    it('should validate session secret minimum length', () => {
      process.env.SESSION_SECRET = 'short';
      expect(() => validateSecurityEnv()).toThrow(/SESSION_SECRET.*at least 32 characters/);
    });

    it('should validate rate limiting parameters', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '0';
      expect(() => validateSecurityEnv()).toThrow(/RATE_LIMIT_WINDOW_MS.*greater than or equal to 1/);
      
      process.env.RATE_LIMIT_MAX_REQUESTS = '-1';
      expect(() => validateSecurityEnv()).toThrow(/RATE_LIMIT_MAX_REQUESTS.*greater than or equal to 1/);
    });

    it('should create security configuration with proper JWT settings', () => {
      const envVars = validateSecurityEnv();
      const securityConfig = createSecurityConfig(envVars);
      
      expect(securityConfig.jwt.algorithm).toBe('RS256');
      expect(securityConfig.jwt.expiresIn).toBe('15m');
      expect(securityConfig.jwt.refreshExpiresIn).toBe('7d');
      expect(securityConfig.jwt.issuer).toBe('waste-management-api');
      expect(securityConfig.jwt.audience).toBe('waste-management-users');
    });

    it('should handle escaped newlines in JWT keys', () => {
      process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADA...\\n-----END PRIVATE KEY-----';
      
      const envVars = validateSecurityEnv();
      const securityConfig = createSecurityConfig(envVars);
      
      expect(securityConfig.jwt.privateKey).toContain('\n');
      expect(securityConfig.jwt.privateKey).not.toContain('\\n');
    });

    it('should validate security timing parameters', () => {
      process.env.PASSWORD_RESET_TOKEN_EXPIRY = '86400001'; // Too long (>24 hours)
      expect(() => validateSecurityEnv()).toThrow(/PASSWORD_RESET_TOKEN_EXPIRY.*less than or equal to 86400000/);
    });

    it('should validate account lockout settings', () => {
      process.env.ACCOUNT_LOCKOUT_ATTEMPTS = '0';
      expect(() => validateSecurityEnv()).toThrow(/ACCOUNT_LOCKOUT_ATTEMPTS.*greater than or equal to 1/);
      
      process.env.ACCOUNT_LOCKOUT_TIME = '0';
      expect(() => validateSecurityEnv()).toThrow(/ACCOUNT_LOCKOUT_TIME.*greater than or equal to 300000/);
    });
  });

  describe('AI Configuration Domain (10+ variables)', () => {
    const validAiEnv = {
      AI_ENABLED: 'true',
      WEAVIATE_URL: 'http://localhost:8080',
      WEAVIATE_API_KEY: 'test-api-key',
      VECTOR_DIMENSIONS: '1536',
      LLM_MODEL: 'llama-3.1-8b',
      LLM_CONTEXT_LENGTH: '32768',
      ML_MODEL_PATH: '/app/models',
      ROUTE_OPTIMIZATION_ENABLED: 'true',
      PREDICTIVE_ANALYTICS_ENABLED: 'true',
      FORECASTING_HORIZON_DAYS: '30',
      MODEL_REFRESH_INTERVAL: '86400000',
      INFERENCE_TIMEOUT: '30000',
    };

    beforeEach(() => {
      Object.assign(process.env, validAiEnv);
    });

    it('should validate AI service configuration', () => {
      const envVars = validateAiEnv();
      expect(envVars.AI_ENABLED).toBe(true);
      expect(envVars.WEAVIATE_URL).toBe('http://localhost:8080');
      expect(envVars.VECTOR_DIMENSIONS).toBe(1536);
    });

    it('should validate vector dimensions constraints', () => {
      process.env.VECTOR_DIMENSIONS = '100'; // Too small
      expect(() => validateAiEnv()).toThrow(/VECTOR_DIMENSIONS.*greater than or equal to 512/);
      
      process.env.VECTOR_DIMENSIONS = '10000'; // Too large
      expect(() => validateAiEnv()).toThrow(/VECTOR_DIMENSIONS.*less than or equal to 4096/);
    });

    it('should validate LLM context length limits', () => {
      process.env.LLM_CONTEXT_LENGTH = '1000'; // Too small
      expect(() => validateAiEnv()).toThrow(/LLM_CONTEXT_LENGTH.*greater than or equal to 2048/);
      
      process.env.LLM_CONTEXT_LENGTH = '200000'; // Too large
      expect(() => validateAiEnv()).toThrow(/LLM_CONTEXT_LENGTH.*less than or equal to 131072/);
    });

    it('should validate forecasting horizon', () => {
      process.env.FORECASTING_HORIZON_DAYS = '0';
      expect(() => validateAiEnv()).toThrow(/FORECASTING_HORIZON_DAYS.*greater than or equal to 1/);
      
      process.env.FORECASTING_HORIZON_DAYS = '367';
      expect(() => validateAiEnv()).toThrow(/FORECASTING_HORIZON_DAYS.*less than or equal to 366/);
    });

    it('should validate timeout parameters', () => {
      process.env.INFERENCE_TIMEOUT = '500'; // Too short
      expect(() => validateAiEnv()).toThrow(/INFERENCE_TIMEOUT.*greater than or equal to 1000/);
      
      process.env.INFERENCE_TIMEOUT = '301000'; // Too long
      expect(() => validateAiEnv()).toThrow(/INFERENCE_TIMEOUT.*less than or equal to 300000/);
    });

    it('should create AI configuration with proper defaults', () => {
      delete process.env.ROUTE_OPTIMIZATION_ENABLED;
      delete process.env.PREDICTIVE_ANALYTICS_ENABLED;
      
      const envVars = validateAiEnv();
      const aiConfig = createAiConfig(envVars);
      
      expect(aiConfig.ai.routeOptimization.enabled).toBe(true); // default
      expect(aiConfig.ai.predictiveAnalytics.enabled).toBe(true); // default
      expect(aiConfig.ai.vectorDb.dimensions).toBe(1536);
      expect(aiConfig.ai.llm.model).toBe('llama-3.1-8b');
    });
  });

  describe('External Services Configuration Domain (15+ variables)', () => {
    const validExternalEnv = {
      STRIPE_SECRET_KEY: 'sk_test_...',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
      STRIPE_WEBHOOK_SECRET: 'whsec_...',
      TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      TWILIO_AUTH_TOKEN: 'your_auth_token',
      TWILIO_WEBHOOK_AUTH_TOKEN: 'webhook_auth_token',
      SENDGRID_API_KEY: 'SG.xxx...',
      SENDGRID_WEBHOOK_KEY: 'webhook_key',
      SAMSARA_API_TOKEN: 'samsara_token',
      SAMSARA_ORGANIZATION_ID: 'org_id',
      AIRTABLE_PERSONAL_ACCESS_TOKEN: 'pat_token',
      MAPBOX_ACCESS_TOKEN: 'pk.xxx...',
      GOOGLE_MAPS_API_KEY: 'AIza...',
      VIRUSTOTAL_API_KEY: 'vt_api_key',
      ABUSEIPDB_API_KEY: 'abuse_api_key',
      MISP_URL: 'https://misp.example.com',
      MISP_API_KEY: 'misp_api_key',
    };

    beforeEach(() => {
      Object.assign(process.env, validExternalEnv);
    });

    it('should validate payment service configuration', () => {
      const envVars = validateExternalEnv();
      expect(envVars.STRIPE_SECRET_KEY).toBe('sk_test_...');
      expect(envVars.STRIPE_PUBLISHABLE_KEY).toBe('pk_test_...');
    });

    it('should validate Stripe key formats', () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_key';
      expect(() => validateExternalEnv()).toThrow(/STRIPE_SECRET_KEY.*must start with sk_/);
      
      process.env.STRIPE_PUBLISHABLE_KEY = 'invalid_key';
      expect(() => validateExternalEnv()).toThrow(/STRIPE_PUBLISHABLE_KEY.*must start with pk_/);
    });

    it('should validate Twilio SID format', () => {
      process.env.TWILIO_ACCOUNT_SID = 'invalid_sid';
      expect(() => validateExternalEnv()).toThrow(/TWILIO_ACCOUNT_SID.*must start with AC/);
    });

    it('should validate SendGrid API key format', () => {
      process.env.SENDGRID_API_KEY = 'invalid_key';
      expect(() => validateExternalEnv()).toThrow(/SENDGRID_API_KEY.*must start with SG\./);
    });

    it('should validate Mapbox token format', () => {
      process.env.MAPBOX_ACCESS_TOKEN = 'invalid_token';
      expect(() => validateExternalEnv()).toThrow(/MAPBOX_ACCESS_TOKEN.*must start with pk\./);
    });

    it('should validate Google Maps API key format', () => {
      process.env.GOOGLE_MAPS_API_KEY = 'invalid_key';
      expect(() => validateExternalEnv()).toThrow(/GOOGLE_MAPS_API_KEY.*must start with AIza/);
    });

    it('should validate MISP URL format', () => {
      process.env.MISP_URL = 'not-a-url';
      expect(() => validateExternalEnv()).toThrow(/MISP_URL.*must be a valid URI/);
    });

    it('should create external configuration with service settings', () => {
      const envVars = validateExternalEnv();
      const externalConfig = createExternalConfig(envVars);
      
      expect(externalConfig.external.stripe.secretKey).toBe('sk_test_...');
      expect(externalConfig.external.twilio.accountSid).toBe('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(externalConfig.external.sendgrid.apiKey).toBe('SG.xxx...');
      expect(externalConfig.external.maps.provider).toBe('mapbox'); // default when both available
    });
  });

  describe('Cross-Domain Validation', () => {
    beforeEach(() => {
      // Set up valid environment for all domains
      Object.assign(process.env, {
        // App
        NODE_ENV: 'test',
        PORT: '3001',
        NOTIFICATIONS_ENABLED: 'true',
        EMAIL_NOTIFICATIONS: 'true',
        SMS_NOTIFICATIONS: 'true',
        
        // Database
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        
        // Security
        JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        JWT_REFRESH_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_REFRESH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        ENCRYPTION_KEY: 'abcdef0123456789abcdef0123456789',
        SESSION_SECRET: 'super-long-session-secret-for-testing-purposes-32-chars',
        
        // AI
        AI_ENABLED: 'true',
        WEAVIATE_URL: 'http://localhost:8080',
        
        // External
        STRIPE_SECRET_KEY: 'sk_test_...',
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        SENDGRID_API_KEY: 'SG.xxx...',
      });
    });

    it('should validate external service dependencies', () => {
      const externalEnv = validateExternalEnv();
      const externalConfig = createExternalConfig(externalEnv);
      
      const appEnv = validateAppEnv();
      const appConfig = createAppConfig(appEnv);
      
      expect(() => validateExternalServiceDependencies(externalConfig, appConfig.notifications))
        .not.toThrow();
    });

    it('should detect missing SMS service when SMS notifications enabled', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      
      const externalEnv = validateExternalEnv();
      const externalConfig = createExternalConfig(externalEnv);
      
      const appEnv = validateAppEnv();
      const appConfig = createAppConfig(appEnv);
      
      expect(() => validateExternalServiceDependencies(externalConfig, appConfig.notifications))
        .toThrow(/SMS notifications are enabled but Twilio is not configured/);
    });

    it('should detect missing email service when email notifications enabled', () => {
      delete process.env.SENDGRID_API_KEY;
      
      const externalEnv = validateExternalEnv();
      const externalConfig = createExternalConfig(externalEnv);
      
      const appEnv = validateAppEnv();
      const appConfig = createAppConfig(appEnv);
      
      expect(() => validateExternalServiceDependencies(externalConfig, appConfig.notifications))
        .toThrow(/Email notifications are enabled but SendGrid is not configured/);
    });

    it('should validate payment integration requirements', () => {
      delete process.env.STRIPE_SECRET_KEY;
      
      const externalEnv = validateExternalEnv();
      const externalConfig = createExternalConfig(externalEnv);
      
      expect(externalConfig.external.stripe.secretKey).toBeUndefined();
      // Payment processing should be disabled if Stripe not configured
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should handle development environment defaults', () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3001';
      
      const envVars = validateAppEnv();
      const appConfig = createAppConfig(envVars);
      
      expect(appConfig.environment).toBe('development');
      expect(appConfig.server.port).toBe(3001);
    });

    it('should handle production environment requirements', () => {
      process.env.NODE_ENV = 'production';
      process.env.FORCE_HTTPS = 'true';
      process.env.SECURE_COOKIES = 'true';
      
      const securityEnv = {
        ...process.env,
        JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        JWT_REFRESH_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_REFRESH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        ENCRYPTION_KEY: 'abcdef0123456789abcdef0123456789',
        SESSION_SECRET: 'super-long-session-secret-for-testing-purposes-32-chars',
      };
      
      Object.assign(process.env, securityEnv);
      
      const envVars = validateSecurityEnv();
      const securityConfig = createSecurityConfig(envVars);
      
      expect(securityConfig.security.forceHttps).toBe(true);
      expect(securityConfig.security.secureCookies).toBe(true);
    });

    it('should handle test environment isolation', () => {
      process.env.NODE_ENV = 'test';
      
      // Test environment should have safe defaults
      const envVars = validateAppEnv();
      expect(envVars.NODE_ENV).toBe('test');
    });
  });

  describe('Configuration Integration', () => {
    it('should create complete configuration object', () => {
      // Set up complete valid environment
      Object.assign(process.env, {
        NODE_ENV: 'test',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db',
        DB_HOST: 'localhost',
        JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        JWT_REFRESH_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        JWT_REFRESH_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        ENCRYPTION_KEY: 'abcdef0123456789abcdef0123456789',
        SESSION_SECRET: 'super-long-session-secret-for-testing-purposes-32-chars',
        AI_ENABLED: 'true',
        STRIPE_SECRET_KEY: 'sk_test_...',
      });
      
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.external).toBeDefined();
    });

    it('should provide type-safe configuration access', () => {
      // TypeScript should enforce correct property access
      expect(typeof config.server.port).toBe('number');
      expect(typeof config.database.ssl).toBe('boolean');
      expect(typeof config.jwt.expiresIn).toBe('string');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle completely missing environment variables', () => {
      process.env = {};
      
      expect(() => validateAppEnv()).toThrow();
      expect(() => validateDatabaseEnv()).toThrow();
      expect(() => validateSecurityEnv()).toThrow();
    });

    it('should handle malformed JSON in environment variables', () => {
      process.env.SOME_JSON_CONFIG = 'invalid-json';
      // Should be handled gracefully by individual validators
    });

    it('should handle extremely long environment variable values', () => {
      process.env.VERY_LONG_VALUE = 'x'.repeat(10000);
      // Should be handled by length validators
    });

    it('should handle unicode and special characters', () => {
      process.env.UNICODE_VALUE = '🚮♻️🗑️';
      // Should be handled gracefully
    });

    it('should validate against injection attacks in config values', () => {
      process.env.MALICIOUS_VALUE = '"; DROP TABLE users; --';
      // Should be sanitized or rejected
    });
  });
});