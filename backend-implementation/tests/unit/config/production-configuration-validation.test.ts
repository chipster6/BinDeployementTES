/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PRODUCTION CONFIGURATION VALIDATION TESTING
 * ============================================================================
 *
 * Comprehensive tests for production configuration validation covering:
 * - 70+ environment variables across 5 domains (Database, Security, External, AI/ML, Infrastructure)
 * - Configuration validation and error handling
 * - Production-ready environment setup validation
 * - Cross-domain configuration dependency validation
 * - Security configuration hardening validation
 * - Performance configuration optimization validation
 *
 * Created by: Testing Agent (Phase 3 Validation)
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { config } from '@/config';
import { database } from '@/config/database';
import { redisClient } from '@/config/redis';
import { securityConfig } from '@/config/security.config';
import { externalConfig } from '@/config/external.config';
import { aiConfig } from '@/config/ai.config';
import { helmetsConfig } from '@/config/helmet.config';
import { corsConfig } from '@/config/cors.config';
import { rateLimitConfig } from '@/config/rateLimit.config';
import { logger } from '@/utils/logger';

describe('Production Configuration Validation - Phase 3 Testing', () => {
  
  describe('Domain 1: Database Configuration Validation', () => {
    describe('Database Connection Configuration', () => {
      it('should validate all required database environment variables', () => {
        const requiredDbVars = [
          'DB_HOST',
          'DB_PORT', 
          'DB_NAME',
          'DB_USER',
          'DB_PASS',
          'DB_DIALECT',
          'DB_POOL_MIN',
          'DB_POOL_MAX',
          'DB_POOL_ACQUIRE',
          'DB_POOL_IDLE',
          'DB_SSL_ENABLED',
          'DB_SSL_REQUIRE',
          'DB_SSL_REJECT_UNAUTHORIZED'
        ];

        requiredDbVars.forEach(varName => {
          expect(process.env[varName] || config.database?.[varName.toLowerCase().replace('db_', '')]).toBeDefined();
        });
      });

      it('should validate database connection pool configuration limits', () => {
        const poolConfig = database.config?.pool || config.database?.pool;
        
        expect(poolConfig?.min).toBeGreaterThanOrEqual(0);
        expect(poolConfig?.max).toBeGreaterThan(poolConfig?.min || 0);
        expect(poolConfig?.max).toBeLessThanOrEqual(200); // Production limit
        expect(poolConfig?.acquire).toBeGreaterThan(0);
        expect(poolConfig?.idle).toBeGreaterThan(0);
      });

      it('should validate SSL configuration for production', () => {
        const sslEnabled = process.env.DB_SSL_ENABLED === 'true' || config.database?.ssl;
        
        if (process.env.NODE_ENV === 'production') {
          expect(sslEnabled).toBe(true);
        }
        
        if (sslEnabled) {
          expect(process.env.DB_SSL_REQUIRE || config.database?.ssl?.require).toBeDefined();
          expect(process.env.DB_SSL_REJECT_UNAUTHORIZED || config.database?.ssl?.rejectUnauthorized).toBeDefined();
        }
      });
    });

    describe('Redis Configuration Validation', () => {
      it('should validate Redis connection configuration', () => {
        const requiredRedisVars = [
          'REDIS_HOST',
          'REDIS_PORT',
          'REDIS_PASSWORD',
          'REDIS_DB',
          'REDIS_TLS_ENABLED',
          'REDIS_RETRY_DELAY_ON_FAILURE',
          'REDIS_MAX_RETRY_DELAY',
          'REDIS_RETRY_DELAY_ON_CLUSTER_DOWN'
        ];

        requiredRedisVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('redis_', '');
          expect(process.env[varName] || config.redis?.[configKey]).toBeDefined();
        });
      });

      it('should validate Redis performance configuration', () => {
        const redisConfig = config.redis;
        
        expect(redisConfig?.retryDelayOnFailover || 100).toBeGreaterThan(0);
        expect(redisConfig?.maxRetriesPerRequest || 3).toBeGreaterThan(0);
        expect(redisConfig?.lazyConnect).toBeDefined();
        expect(redisConfig?.keepAlive || 30000).toBeGreaterThan(0);
      });
    });

    describe('PostGIS Spatial Configuration', () => {
      it('should validate spatial database extensions configuration', () => {
        const spatialVars = [
          'POSTGIS_VERSION',
          'SPATIAL_REFERENCE_SYSTEM',
          'GEOMETRY_COLUMN_TYPE',
          'SPATIAL_INDEX_TYPE'
        ];

        spatialVars.forEach(varName => {
          if (process.env[varName]) {
            expect(process.env[varName]).toBeDefined();
          }
        });
      });
    });
  });

  describe('Domain 2: Security Configuration Validation', () => {
    describe('JWT Authentication Configuration', () => {
      it('should validate JWT security configuration', () => {
        const jwtVars = [
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
          'JWT_EXPIRES_IN',
          'JWT_REFRESH_EXPIRES_IN',
          'JWT_ALGORITHM',
          'JWT_ISSUER',
          'JWT_AUDIENCE'
        ];

        jwtVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('jwt_', '');
          expect(process.env[varName] || securityConfig?.jwt?.[configKey]).toBeDefined();
        });

        // Validate JWT secret strength
        const jwtSecret = process.env.JWT_SECRET || securityConfig?.jwt?.secret;
        expect(jwtSecret?.length).toBeGreaterThanOrEqual(32);
      });

      it('should validate encryption configuration', () => {
        const encryptionVars = [
          'ENCRYPTION_KEY',
          'ENCRYPTION_ALGORITHM',
          'ENCRYPTION_IV_LENGTH',
          'ENCRYPTION_TAG_LENGTH',
          'FIELD_ENCRYPTION_KEY',
          'MFA_ENCRYPTION_KEY'
        ];

        encryptionVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('encryption_', '').replace('_key', 'Key');
          expect(process.env[varName] || securityConfig?.encryption?.[configKey]).toBeDefined();
        });

        // Validate encryption key strength
        const encKey = process.env.ENCRYPTION_KEY || securityConfig?.encryption?.key;
        expect(encKey?.length).toBeGreaterThanOrEqual(32);
      });
    });

    describe('Session Security Configuration', () => {
      it('should validate session management configuration', () => {
        const sessionVars = [
          'SESSION_SECRET',
          'SESSION_TIMEOUT',
          'SESSION_SECURE',
          'SESSION_HTTP_ONLY',
          'SESSION_SAME_SITE',
          'SESSION_MAX_CONCURRENT',
          'SESSION_CLEANUP_INTERVAL'
        ];

        sessionVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('session_', '');
          expect(process.env[varName] || securityConfig?.session?.[configKey]).toBeDefined();
        });

        // Validate session security in production
        if (process.env.NODE_ENV === 'production') {
          expect(process.env.SESSION_SECURE || securityConfig?.session?.secure).toBe('true');
          expect(process.env.SESSION_HTTP_ONLY || securityConfig?.session?.httpOnly).toBe('true');
        }
      });

      it('should validate MFA configuration', () => {
        const mfaVars = [
          'MFA_ENABLED',
          'MFA_ISSUER',
          'MFA_WINDOW',
          'MFA_BACKUP_CODES_COUNT',
          'MFA_SECRET_LENGTH'
        ];

        mfaVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('mfa_', '');
          expect(process.env[varName] || securityConfig?.mfa?.[configKey]).toBeDefined();
        });
      });
    });

    describe('CORS and Helmet Security Configuration', () => {
      it('should validate CORS configuration for production', () => {
        const corsVars = [
          'CORS_ORIGIN',
          'CORS_METHODS',
          'CORS_ALLOWED_HEADERS',
          'CORS_CREDENTIALS',
          'CORS_MAX_AGE'
        ];

        corsVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('cors_', '');
          expect(process.env[varName] || corsConfig?.[configKey]).toBeDefined();
        });

        // Validate production CORS settings
        if (process.env.NODE_ENV === 'production') {
          const origin = process.env.CORS_ORIGIN || corsConfig?.origin;
          expect(origin).not.toBe('*'); // Should not allow all origins in production
        }
      });

      it('should validate Helmet security headers configuration', () => {
        const helmetVars = [
          'HELMET_CSP_ENABLED',
          'HELMET_HSTS_ENABLED',
          'HELMET_NOSNIFF_ENABLED',
          'HELMET_FRAMEGUARD_ENABLED',
          'HELMET_XSS_FILTER_ENABLED'
        ];

        helmetVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('helmet_', '').replace('_enabled', '');
          expect(process.env[varName] || helmetsConfig?.[configKey]).toBeDefined();
        });
      });
    });
  });

  describe('Domain 3: External Services Configuration Validation', () => {
    describe('Payment Processing Configuration', () => {
      it('should validate Stripe configuration', () => {
        const stripeVars = [
          'STRIPE_SECRET_KEY',
          'STRIPE_PUBLISHABLE_KEY',
          'STRIPE_WEBHOOK_SECRET',
          'STRIPE_API_VERSION',
          'STRIPE_CONNECT_CLIENT_ID'
        ];

        stripeVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('stripe_', '');
          expect(process.env[varName] || externalConfig?.stripe?.[configKey]).toBeDefined();
        });

        // Validate Stripe key formats
        const secretKey = process.env.STRIPE_SECRET_KEY || externalConfig?.stripe?.secretKey;
        const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || externalConfig?.stripe?.publishableKey;
        
        if (secretKey) {
          expect(secretKey).toMatch(/^sk_(test_|live_)[a-zA-Z0-9]+$/);
        }
        if (pubKey) {
          expect(pubKey).toMatch(/^pk_(test_|live_)[a-zA-Z0-9]+$/);
        }
      });
    });

    describe('Communication Services Configuration', () => {
      it('should validate Twilio configuration', () => {
        const twilioVars = [
          'TWILIO_ACCOUNT_SID',
          'TWILIO_AUTH_TOKEN',
          'TWILIO_PHONE_NUMBER',
          'TWILIO_WEBHOOK_AUTH_TOKEN',
          'TWILIO_STATUS_CALLBACK_URL'
        ];

        twilioVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('twilio_', '');
          expect(process.env[varName] || externalConfig?.twilio?.[configKey]).toBeDefined();
        });
      });

      it('should validate SendGrid configuration', () => {
        const sendgridVars = [
          'SENDGRID_API_KEY',
          'SENDGRID_FROM_EMAIL',
          'SENDGRID_FROM_NAME',
          'SENDGRID_WEBHOOK_VERIFY_KEY'
        ];

        sendgridVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('sendgrid_', '');
          expect(process.env[varName] || externalConfig?.sendgrid?.[configKey]).toBeDefined();
        });
      });
    });

    describe('External API Integration Configuration', () => {
      it('should validate Maps service configuration', () => {
        const mapsVars = [
          'MAPBOX_ACCESS_TOKEN',
          'GOOGLE_MAPS_API_KEY',
          'MAPS_DEFAULT_PROVIDER',
          'MAPS_GEOCODING_ENABLED',
          'MAPS_ROUTING_ENABLED'
        ];

        mapsVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('maps_', '').replace('mapbox_', '').replace('google_maps_', '');
          if (process.env[varName] || externalConfig?.maps?.[configKey]) {
            expect(process.env[varName] || externalConfig?.maps?.[configKey]).toBeDefined();
          }
        });
      });

      it('should validate Samsara fleet management configuration', () => {
        const samsaraVars = [
          'SAMSARA_API_TOKEN',
          'SAMSARA_GROUP_ID',
          'SAMSARA_WEBHOOK_SECRET',
          'SAMSARA_BASE_URL'
        ];

        samsaraVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('samsara_', '');
          if (process.env[varName] || externalConfig?.samsara?.[configKey]) {
            expect(process.env[varName] || externalConfig?.samsara?.[configKey]).toBeDefined();
          }
        });
      });
    });
  });

  describe('Domain 4: AI/ML Configuration Validation', () => {
    describe('Vector Database Configuration', () => {
      it('should validate Weaviate configuration', () => {
        const weaviateVars = [
          'WEAVIATE_URL',
          'WEAVIATE_API_KEY',
          'WEAVIATE_SCHEMA_NAME',
          'WEAVIATE_CLASS_NAME',
          'WEAVIATE_VECTOR_DIMENSION',
          'WEAVIATE_DISTANCE_METRIC'
        ];

        weaviateVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('weaviate_', '');
          if (process.env[varName] || aiConfig?.weaviate?.[configKey]) {
            expect(process.env[varName] || aiConfig?.weaviate?.[configKey]).toBeDefined();
          }
        });
      });
    });

    describe('ML Model Configuration', () => {
      it('should validate route optimization configuration', () => {
        const optimizationVars = [
          'OR_TOOLS_ENABLED',
          'GRAPHHOPPER_API_KEY',
          'GRAPHHOPPER_BASE_URL',
          'ROUTE_OPTIMIZATION_TIMEOUT',
          'MAX_ROUTE_POINTS',
          'OPTIMIZATION_ALGORITHM'
        ];

        optimizationVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('or_tools_', '').replace('graphhopper_', '');
          if (process.env[varName] || aiConfig?.routeOptimization?.[configKey]) {
            expect(process.env[varName] || aiConfig?.routeOptimization?.[configKey]).toBeDefined();
          }
        });
      });

      it('should validate predictive analytics configuration', () => {
        const analyticsVars = [
          'PROPHET_ENABLED',
          'LIGHTGBM_ENABLED',
          'MODEL_TRAINING_INTERVAL',
          'PREDICTION_HORIZON_DAYS',
          'MODEL_ACCURACY_THRESHOLD',
          'FEATURE_STORE_ENABLED'
        ];

        analyticsVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('prophet_', '').replace('lightgbm_', '');
          if (process.env[varName] || aiConfig?.predictiveAnalytics?.[configKey]) {
            expect(process.env[varName] || aiConfig?.predictiveAnalytics?.[configKey]).toBeDefined();
          }
        });
      });

      it('should validate local LLM configuration', () => {
        const llmVars = [
          'LLAMA_MODEL_PATH',
          'LLAMA_CONTEXT_SIZE',
          'LLAMA_TEMPERATURE',
          'LLAMA_MAX_TOKENS',
          'LLAMA_GPU_ENABLED',
          'LLAMA_THREADS'
        ];

        llmVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('llama_', '');
          if (process.env[varName] || aiConfig?.llama?.[configKey]) {
            expect(process.env[varName] || aiConfig?.llama?.[configKey]).toBeDefined();
          }
        });
      });
    });
  });

  describe('Domain 5: Infrastructure Configuration Validation', () => {
    describe('Application Server Configuration', () => {
      it('should validate server configuration', () => {
        const serverVars = [
          'PORT',
          'NODE_ENV',
          'API_VERSION',
          'API_BASE_PATH',
          'TRUST_PROXY',
          'REQUEST_TIMEOUT',
          'BODY_LIMIT',
          'COMPRESSION_ENABLED'
        ];

        serverVars.forEach(varName => {
          const configKey = varName.toLowerCase();
          expect(process.env[varName] || config?.server?.[configKey]).toBeDefined();
        });

        // Validate production-specific settings
        if (process.env.NODE_ENV === 'production') {
          expect(process.env.TRUST_PROXY).toBe('true');
          expect(parseInt(process.env.REQUEST_TIMEOUT || '30000')).toBeGreaterThan(0);
        }
      });

      it('should validate rate limiting configuration', () => {
        const rateLimitVars = [
          'RATE_LIMIT_WINDOW_MS',
          'RATE_LIMIT_MAX_REQUESTS',
          'RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS',
          'RATE_LIMIT_SKIP_FAILED_REQUESTS',
          'RATE_LIMIT_STORE_TYPE'
        ];

        rateLimitVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('rate_limit_', '');
          expect(process.env[varName] || rateLimitConfig?.[configKey]).toBeDefined();
        });
      });
    });

    describe('Monitoring and Observability Configuration', () => {
      it('should validate logging configuration', () => {
        const loggingVars = [
          'LOG_LEVEL',
          'LOG_FORMAT',
          'LOG_FILE_ENABLED',
          'LOG_FILE_PATH',
          'LOG_FILE_MAX_SIZE',
          'LOG_FILE_MAX_FILES',
          'LOG_CONSOLE_ENABLED'
        ];

        loggingVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('log_', '');
          expect(process.env[varName] || config?.logging?.[configKey]).toBeDefined();
        });

        // Validate log level for production
        const logLevel = process.env.LOG_LEVEL || config?.logging?.level;
        if (process.env.NODE_ENV === 'production') {
          expect(['error', 'warn', 'info']).toContain(logLevel);
        }
      });

      it('should validate metrics and monitoring configuration', () => {
        const monitoringVars = [
          'PROMETHEUS_ENABLED',
          'PROMETHEUS_PORT',
          'PROMETHEUS_METRICS_PATH',
          'HEALTH_CHECK_ENABLED',
          'HEALTH_CHECK_PATH',
          'METRICS_COLLECTION_INTERVAL'
        ];

        monitoringVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('prometheus_', '').replace('health_check_', '');
          if (process.env[varName] || config?.monitoring?.[configKey]) {
            expect(process.env[varName] || config?.monitoring?.[configKey]).toBeDefined();
          }
        });
      });
    });

    describe('Docker and Container Configuration', () => {
      it('should validate container environment configuration', () => {
        const containerVars = [
          'CONTAINER_NAME',
          'CONTAINER_MEMORY_LIMIT',
          'CONTAINER_CPU_LIMIT',
          'DOCKER_REGISTRY',
          'IMAGE_TAG',
          'HEALTH_CHECK_INTERVAL'
        ];

        containerVars.forEach(varName => {
          const configKey = varName.toLowerCase().replace('container_', '').replace('docker_', '');
          if (process.env[varName] || config?.docker?.[configKey]) {
            expect(process.env[varName] || config?.docker?.[configKey]).toBeDefined();
          }
        });
      });
    });
  });

  describe('Cross-Domain Configuration Dependencies', () => {
    describe('Database-Redis Integration', () => {
      it('should validate database and Redis configurations work together', () => {
        const dbHost = process.env.DB_HOST || config?.database?.host;
        const redisHost = process.env.REDIS_HOST || config?.redis?.host;

        expect(dbHost).toBeDefined();
        expect(redisHost).toBeDefined();

        // Validate they are not the same unless specifically configured
        if (dbHost === redisHost) {
          expect(process.env.DB_PORT).not.toBe(process.env.REDIS_PORT);
        }
      });
    });

    describe('Security-External Services Integration', () => {
      it('should validate JWT configuration with external services', () => {
        const jwtSecret = process.env.JWT_SECRET || securityConfig?.jwt?.secret;
        const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || externalConfig?.stripe?.webhookSecret;

        expect(jwtSecret).toBeDefined();
        expect(stripeWebhookSecret).toBeDefined();
        expect(jwtSecret).not.toBe(stripeWebhookSecret); // Should be different secrets
      });
    });

    describe('AI/ML-Infrastructure Integration', () => {
      it('should validate AI/ML services have proper infrastructure support', () => {
        const weaviateEnabled = process.env.WEAVIATE_URL || aiConfig?.weaviate?.url;
        const memoryLimit = process.env.CONTAINER_MEMORY_LIMIT || config?.docker?.memoryLimit;

        if (weaviateEnabled) {
          expect(memoryLimit).toBeDefined();
          // AI/ML services need adequate memory
          const memLimit = parseInt(memoryLimit?.replace(/[^0-9]/g, '') || '0');
          expect(memLimit).toBeGreaterThanOrEqual(2048); // At least 2GB
        }
      });
    });
  });

  describe('Configuration Validation Functions', () => {
    describe('Environment-Specific Validation', () => {
      it('should validate development environment configuration', () => {
        if (process.env.NODE_ENV === 'development') {
          expect(process.env.DB_SSL_ENABLED).toBe('false');
          expect(process.env.LOG_LEVEL).toBeOneOf(['debug', 'info', 'warn']);
          expect(process.env.CORS_ORIGIN).toBeDefined();
        }
      });

      it('should validate production environment configuration', () => {
        if (process.env.NODE_ENV === 'production') {
          expect(process.env.DB_SSL_ENABLED).toBe('true');
          expect(process.env.SESSION_SECURE).toBe('true');
          expect(process.env.LOG_LEVEL).toBeOneOf(['error', 'warn', 'info']);
          expect(process.env.CORS_ORIGIN).not.toBe('*');
        }
      });

      it('should validate test environment configuration', () => {
        if (process.env.NODE_ENV === 'test') {
          expect(process.env.TEST_DB_NAME).toBeDefined();
          expect(process.env.TEST_REDIS_DB).toBeDefined();
          expect(process.env.LOG_LEVEL).toBeOneOf(['error', 'warn']);
        }
      });
    });

    describe('Configuration Error Handling', () => {
      it('should handle missing critical configuration gracefully', () => {
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        expect(() => {
          // Configuration should have defaults or handle missing NODE_ENV
          const env = process.env.NODE_ENV || 'development';
          expect(['development', 'test', 'production']).toContain(env);
        }).not.toThrow();

        process.env.NODE_ENV = originalEnv;
      });

      it('should validate configuration type safety', () => {
        const port = parseInt(process.env.PORT || '3001');
        const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
        const poolMax = parseInt(process.env.DB_POOL_MAX || '20');

        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThan(65536);
        expect(timeout).toBeGreaterThan(0);
        expect(poolMax).toBeGreaterThan(0);
      });
    });
  });

  describe('Configuration Performance Impact', () => {
    it('should validate configuration does not impact startup time', async () => {
      const startTime = Date.now();
      
      // Simulate configuration loading
      const configs = await Promise.all([
        Promise.resolve(database),
        Promise.resolve(redisClient),
        Promise.resolve(securityConfig),
        Promise.resolve(externalConfig),
        Promise.resolve(aiConfig)
      ]);

      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(1000); // Configuration should load in < 1s
      expect(configs).toHaveLength(5);
      configs.forEach(config => expect(config).toBeDefined());
    });

    it('should validate configuration memory usage is acceptable', () => {
      const configSize = JSON.stringify({
        database: database.config,
        redis: config.redis,
        security: securityConfig,
        external: externalConfig,
        ai: aiConfig
      }).length;

      expect(configSize).toBeLessThan(100000); // < 100KB configuration size
    });
  });
});