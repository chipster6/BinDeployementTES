/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AI/ML CONFIGURATION
 * ============================================================================
 *
 * AI/ML services configuration including Weaviate vector database,
 * OpenAI integration, route optimization, and local LLM.
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-15
 * Version: 2.0.0 - Refactored from monolithic config
 */

import Joi from "joi";

/**
 * AI/ML environment variable validation schema
 */
export const aiEnvSchema = Joi.object({
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
});

/**
 * Validate AI/ML environment variables
 */
export const validateAiEnv = () => {
  const { error, value } = aiEnvSchema.validate(process.env);
  if (error) {
    throw new Error(`AI/ML configuration validation error: ${error.message}`);
  }
  return value;
};

/**
 * AI/ML configuration interface
 */
export interface AiConfig {
  aiMl: {
    // Vector Intelligence Foundation
    weaviate: {
      url: string;
      apiKey?: string;
      batchSize: number;
      timeout: number;
    };
    
    // OpenAI Integration
    openai: {
      apiKey?: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
    
    // Route Optimization Engine
    orTools: {
      licenseKey?: string;
      solverTimeout: number;
      maxVehicles: number;
    };
    
    // Traffic Integration
    graphHopper: {
      apiKey?: string;
      baseUrl: string;
      timeout: number;
    };
    
    // Local LLM Intelligence
    llm: {
      serviceUrl: string;
      modelPath: string;
      maxContextLength: number;
      maxBatchSize: number;
      timeout: number;
    };
    
    // ML Training Configuration
    training: {
      dataPath: string;
      modelStoragePath: string;
      cachePath: string;
      batchSize: number;
      validationSplit: number;
      testSplit: number;
    };
    
    // Feature Flags
    features: {
      vectorSearch: boolean;
      routeOptimizationML: boolean;
      predictiveAnalytics: boolean;
      llmAssistance: boolean;
      auditLogging: boolean;
    };
    
    // Performance Configuration
    performance: {
      vectorSearchCacheTTL: number;
      predictionCacheTTL: number;
      modelRefreshInterval: number;
      monitoring: boolean;
    };
  };
}

/**
 * Create AI/ML configuration from validated environment variables
 */
export const createAiConfig = (envVars: any): AiConfig => ({
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
});