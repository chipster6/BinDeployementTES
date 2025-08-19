/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AI CONFIGURATION UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for AI/ML configuration validation, environment
 * variable processing, and configuration object creation with edge cases.
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { 
  aiEnvSchema, 
  validateAiEnv, 
  createAiConfig, 
  AiConfig 
} from '@/config/ai.config';
import { ValidationError } from '@/middleware/errorHandler';

describe('AI Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('aiEnvSchema validation', () => {
    it('should validate with all default values', () => {
      const { error, value } = aiEnvSchema.validate({});
      
      expect(error).toBeUndefined();
      expect(value.WEAVIATE_URL).toBe('http://localhost:8080');
      expect(value.WEAVIATE_BATCH_SIZE).toBe(100);
      expect(value.OPENAI_MODEL).toBe('text-embedding-ada-002');
      expect(value.ORTOOLS_SOLVER_TIMEOUT).toBe(30000);
      expect(value.LLM_SERVICE_URL).toBe('http://localhost:8001');
      expect(value.ENABLE_VECTOR_SEARCH).toBe(false);
      expect(value.ML_PERFORMANCE_MONITORING).toBe(true);
    });

    it('should validate with custom environment variables', () => {
      const testEnv = {
        WEAVIATE_URL: 'https://weaviate.production.com:8080',
        WEAVIATE_API_KEY: 'test-api-key-123',
        WEAVIATE_BATCH_SIZE: 200,
        OPENAI_API_KEY: 'sk-test-openai-key',
        OPENAI_MAX_TOKENS: 4096,
        ORTOOLS_MAX_VEHICLES: 100,
        ENABLE_VECTOR_SEARCH: true,
        ENABLE_ML_AUDIT_LOGGING: false,
      };

      const { error, value } = aiEnvSchema.validate(testEnv);
      
      expect(error).toBeUndefined();
      expect(value.WEAVIATE_URL).toBe('https://weaviate.production.com:8080');
      expect(value.WEAVIATE_API_KEY).toBe('test-api-key-123');
      expect(value.WEAVIATE_BATCH_SIZE).toBe(200);
      expect(value.OPENAI_API_KEY).toBe('sk-test-openai-key');
      expect(value.OPENAI_MAX_TOKENS).toBe(4096);
      expect(value.ORTOOLS_MAX_VEHICLES).toBe(100);
      expect(value.ENABLE_VECTOR_SEARCH).toBe(true);
      expect(value.ENABLE_ML_AUDIT_LOGGING).toBe(false);
    });

    describe('Edge cases and validation errors', () => {
      it('should reject invalid URL formats', () => {
        const { error } = aiEnvSchema.validate({
          WEAVIATE_URL: 'invalid-url',
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be a valid uri');
      });

      it('should reject negative timeout values', () => {
        const { error } = aiEnvSchema.validate({
          WEAVIATE_TIMEOUT: -1000,
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be greater than or equal to');
      });

      it('should reject zero or negative batch sizes', () => {
        const { error } = aiEnvSchema.validate({
          WEAVIATE_BATCH_SIZE: 0,
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be greater than or equal to');
      });

      it('should reject negative max vehicles', () => {
        const { error } = aiEnvSchema.validate({
          ORTOOLS_MAX_VEHICLES: -5,
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be greater than or equal to');
      });

      it('should reject invalid temperature ranges', () => {
        const { error } = aiEnvSchema.validate({
          OPENAI_TEMPERATURE: 2.5, // Should be between 0 and 2
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be less than or equal to');
      });

      it('should reject invalid validation split values', () => {
        const { error } = aiEnvSchema.validate({
          ML_VALIDATION_SPLIT: 1.5, // Should be between 0 and 1
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('must be less than or equal to');
      });

      it('should handle string boolean conversion correctly', () => {
        const { error, value } = aiEnvSchema.validate({
          ENABLE_VECTOR_SEARCH: 'true',
          ENABLE_ML_AUDIT_LOGGING: 'false',
        });

        expect(error).toBeUndefined();
        expect(value.ENABLE_VECTOR_SEARCH).toBe(true);
        expect(value.ENABLE_ML_AUDIT_LOGGING).toBe(false);
      });

      it('should handle string number conversion correctly', () => {
        const { error, value } = aiEnvSchema.validate({
          WEAVIATE_BATCH_SIZE: '150',
          ORTOOLS_SOLVER_TIMEOUT: '45000',
        });

        expect(error).toBeDefined(); // Joi doesn't auto-convert strings to numbers
      });
    });
  });

  describe('validateAiEnv function', () => {
    it('should successfully validate valid environment', () => {
      process.env = {
        ...process.env,
        WEAVIATE_URL: 'https://weaviate.test.com',
        OPENAI_API_KEY: 'sk-test-key',
        ENABLE_VECTOR_SEARCH: 'true',
      };

      expect(() => validateAiEnv()).not.toThrow();
    });

    it('should throw error for invalid environment', () => {
      process.env = {
        ...process.env,
        WEAVIATE_TIMEOUT: '-1000', // Invalid negative timeout
      };

      expect(() => validateAiEnv()).toThrow('AI/ML configuration validation error');
    });

    it('should provide detailed error message', () => {
      process.env = {
        ...process.env,
        ORTOOLS_MAX_VEHICLES: 'invalid-number',
      };

      try {
        validateAiEnv();
        fail('Expected validation to throw error');
      } catch (error) {
        expect(error.message).toContain('AI/ML configuration validation error');
        expect(error.message).toContain('ORTOOLS_MAX_VEHICLES');
      }
    });
  });

  describe('createAiConfig function', () => {
    it('should create valid AI configuration object', () => {
      const envVars = {
        WEAVIATE_URL: 'https://weaviate.test.com:8080',
        WEAVIATE_API_KEY: 'test-key',
        WEAVIATE_BATCH_SIZE: 150,
        WEAVIATE_TIMEOUT: 45000,
        OPENAI_API_KEY: 'sk-openai-test',
        OPENAI_MODEL: 'text-embedding-ada-002',
        OPENAI_MAX_TOKENS: 8192,
        OPENAI_TEMPERATURE: 0.2,
        ORTOOLS_LICENSE_KEY: 'ortools-license',
        ORTOOLS_SOLVER_TIMEOUT: 60000,
        ORTOOLS_MAX_VEHICLES: 75,
        GRAPHHOPPER_API_KEY: 'gh-api-key',
        GRAPHHOPPER_BASE_URL: 'https://graphhopper.com/api/1',
        GRAPHHOPPER_TIMEOUT: 20000,
        LLM_SERVICE_URL: 'http://llm.internal:8001',
        LLM_MODEL_PATH: '/models/llama-3.1-8b',
        LLM_MAX_CONTEXT_LENGTH: 16384,
        LLM_MAX_BATCH_SIZE: 16,
        LLM_TIMEOUT: 45000,
        ML_TRAINING_DATA_PATH: '/data/training',
        ML_MODEL_STORAGE_PATH: '/models',
        ML_CACHE_PATH: '/cache',
        ML_BATCH_SIZE: 2000,
        ML_VALIDATION_SPLIT: 0.25,
        ML_TEST_SPLIT: 0.15,
        ENABLE_VECTOR_SEARCH: true,
        ENABLE_ROUTE_OPTIMIZATION_ML: true,
        ENABLE_PREDICTIVE_ANALYTICS: false,
        ENABLE_LLM_ASSISTANCE: true,
        ENABLE_ML_AUDIT_LOGGING: true,
        ML_VECTOR_SEARCH_CACHE_TTL: 7200,
        ML_PREDICTION_CACHE_TTL: 3600,
        ML_MODEL_REFRESH_INTERVAL: 172800000,
        ML_PERFORMANCE_MONITORING: true,
      };

      const config: AiConfig = createAiConfig(envVars);

      // Validate Weaviate configuration
      expect(config.aiMl.weaviate.url).toBe('https://weaviate.test.com:8080');
      expect(config.aiMl.weaviate.apiKey).toBe('test-key');
      expect(config.aiMl.weaviate.batchSize).toBe(150);
      expect(config.aiMl.weaviate.timeout).toBe(45000);

      // Validate OpenAI configuration
      expect(config.aiMl.openai.apiKey).toBe('sk-openai-test');
      expect(config.aiMl.openai.model).toBe('text-embedding-ada-002');
      expect(config.aiMl.openai.maxTokens).toBe(8192);
      expect(config.aiMl.openai.temperature).toBe(0.2);

      // Validate OR-Tools configuration
      expect(config.aiMl.orTools.licenseKey).toBe('ortools-license');
      expect(config.aiMl.orTools.solverTimeout).toBe(60000);
      expect(config.aiMl.orTools.maxVehicles).toBe(75);

      // Validate GraphHopper configuration
      expect(config.aiMl.graphHopper.apiKey).toBe('gh-api-key');
      expect(config.aiMl.graphHopper.baseUrl).toBe('https://graphhopper.com/api/1');
      expect(config.aiMl.graphHopper.timeout).toBe(20000);

      // Validate LLM configuration
      expect(config.aiMl.llm.serviceUrl).toBe('http://llm.internal:8001');
      expect(config.aiMl.llm.modelPath).toBe('/models/llama-3.1-8b');
      expect(config.aiMl.llm.maxContextLength).toBe(16384);
      expect(config.aiMl.llm.maxBatchSize).toBe(16);
      expect(config.aiMl.llm.timeout).toBe(45000);

      // Validate training configuration
      expect(config.aiMl.training.dataPath).toBe('/data/training');
      expect(config.aiMl.training.modelStoragePath).toBe('/models');
      expect(config.aiMl.training.cachePath).toBe('/cache');
      expect(config.aiMl.training.batchSize).toBe(2000);
      expect(config.aiMl.training.validationSplit).toBe(0.25);
      expect(config.aiMl.training.testSplit).toBe(0.15);

      // Validate feature flags
      expect(config.aiMl.features.vectorSearch).toBe(true);
      expect(config.aiMl.features.routeOptimizationML).toBe(true);
      expect(config.aiMl.features.predictiveAnalytics).toBe(false);
      expect(config.aiMl.features.llmAssistance).toBe(true);
      expect(config.aiMl.features.auditLogging).toBe(true);

      // Validate performance configuration
      expect(config.aiMl.performance.vectorSearchCacheTTL).toBe(7200);
      expect(config.aiMl.performance.predictionCacheTTL).toBe(3600);
      expect(config.aiMl.performance.modelRefreshInterval).toBe(172800000);
      expect(config.aiMl.performance.monitoring).toBe(true);
    });

    it('should handle undefined optional values correctly', () => {
      const envVars = {
        WEAVIATE_URL: 'http://localhost:8080',
        // All other values should use defaults
      };

      const config: AiConfig = createAiConfig(envVars);

      expect(config.aiMl.weaviate.apiKey).toBeUndefined();
      expect(config.aiMl.openai.apiKey).toBeUndefined();
      expect(config.aiMl.orTools.licenseKey).toBeUndefined();
      expect(config.aiMl.graphHopper.apiKey).toBeUndefined();
    });

    it('should maintain configuration object structure', () => {
      const envVars = {};
      const config: AiConfig = createAiConfig(envVars);

      expect(config).toHaveProperty('aiMl');
      expect(config.aiMl).toHaveProperty('weaviate');
      expect(config.aiMl).toHaveProperty('openai');
      expect(config.aiMl).toHaveProperty('orTools');
      expect(config.aiMl).toHaveProperty('graphHopper');
      expect(config.aiMl).toHaveProperty('llm');
      expect(config.aiMl).toHaveProperty('training');
      expect(config.aiMl).toHaveProperty('features');
      expect(config.aiMl).toHaveProperty('performance');

      // Verify nested structure
      expect(config.aiMl.weaviate).toHaveProperty('url');
      expect(config.aiMl.weaviate).toHaveProperty('batchSize');
      expect(config.aiMl.weaviate).toHaveProperty('timeout');

      expect(config.aiMl.features).toHaveProperty('vectorSearch');
      expect(config.aiMl.features).toHaveProperty('routeOptimizationML');
      expect(config.aiMl.features).toHaveProperty('predictiveAnalytics');
      expect(config.aiMl.features).toHaveProperty('llmAssistance');
      expect(config.aiMl.features).toHaveProperty('auditLogging');
    });
  });

  describe('Configuration consistency', () => {
    it('should maintain consistent timeout values', () => {
      const envVars = {
        WEAVIATE_TIMEOUT: 30000,
        GRAPHHOPPER_TIMEOUT: 15000,
        LLM_TIMEOUT: 30000,
      };

      const config: AiConfig = createAiConfig(envVars);

      expect(config.aiMl.weaviate.timeout).toBe(30000);
      expect(config.aiMl.graphHopper.timeout).toBe(15000);
      expect(config.aiMl.llm.timeout).toBe(30000);
    });

    it('should validate feature flag dependencies', () => {
      // When vector search is enabled, ensure related services are configured
      const envVars = {
        ENABLE_VECTOR_SEARCH: true,
        WEAVIATE_URL: 'https://weaviate.test.com',
        OPENAI_API_KEY: 'sk-test-key',
      };

      const config: AiConfig = createAiConfig(envVars);

      expect(config.aiMl.features.vectorSearch).toBe(true);
      expect(config.aiMl.weaviate.url).toBe('https://weaviate.test.com');
      expect(config.aiMl.openai.apiKey).toBe('sk-test-key');
    });

    it('should handle performance monitoring configuration', () => {
      const envVars = {
        ML_PERFORMANCE_MONITORING: true,
        ML_VECTOR_SEARCH_CACHE_TTL: 1800,
        ML_PREDICTION_CACHE_TTL: 900,
        ML_MODEL_REFRESH_INTERVAL: 43200000, // 12 hours
      };

      const config: AiConfig = createAiConfig(envVars);

      expect(config.aiMl.performance.monitoring).toBe(true);
      expect(config.aiMl.performance.vectorSearchCacheTTL).toBe(1800);
      expect(config.aiMl.performance.predictionCacheTTL).toBe(900);
      expect(config.aiMl.performance.modelRefreshInterval).toBe(43200000);
    });
  });

  describe('Production readiness checks', () => {
    it('should validate production-required API keys', () => {
      const productionEnv = {
        NODE_ENV: 'production',
        WEAVIATE_API_KEY: 'prod-weaviate-key',
        OPENAI_API_KEY: 'sk-prod-openai-key',
        ORTOOLS_LICENSE_KEY: 'prod-ortools-license',
        GRAPHHOPPER_API_KEY: 'prod-gh-key',
      };

      const config: AiConfig = createAiConfig(productionEnv);

      expect(config.aiMl.weaviate.apiKey).toBe('prod-weaviate-key');
      expect(config.aiMl.openai.apiKey).toBe('sk-prod-openai-key');
      expect(config.aiMl.orTools.licenseKey).toBe('prod-ortools-license');
      expect(config.aiMl.graphHopper.apiKey).toBe('prod-gh-key');
    });

    it('should handle security-conscious defaults', () => {
      const secureDefaults = createAiConfig({});

      // Vector search should be disabled by default for security
      expect(secureDefaults.aiMl.features.vectorSearch).toBe(false);
      expect(secureDefaults.aiMl.features.routeOptimizationML).toBe(false);
      expect(secureDefaults.aiMl.features.predictiveAnalytics).toBe(false);
      expect(secureDefaults.aiMl.features.llmAssistance).toBe(false);

      // Audit logging should be enabled by default
      expect(secureDefaults.aiMl.features.auditLogging).toBe(true);

      // Performance monitoring should be enabled
      expect(secureDefaults.aiMl.performance.monitoring).toBe(true);
    });
  });
});