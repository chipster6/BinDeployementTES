/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CONFIGURATION (REFACTORED)
 * ============================================================================
 *
 * Composed configuration management for the entire application.
 * Loads and validates environment variables from domain-specific modules,
 * provides type-safe config access.
 *
 * Refactored by: Code Refactoring Analyst
 * Date: 2025-08-15
 * Version: 2.0.0 - Modular domain-specific configuration
 */

import { 
  validateAppEnv, 
  createAppConfig, 
  type AppConfig 
} from "./app.config";
import { 
  validateDatabaseEnv, 
  createDatabaseConfig, 
  type DatabaseConfig 
} from "./database.config";
import { 
  validateSecurityEnv, 
  createSecurityConfig, 
  type SecurityConfig 
} from "./security.config";
import { 
  validateAiEnv, 
  createAiConfig, 
  type AiConfig 
} from "./ai.config";
import { 
  validateExternalEnv, 
  createExternalConfig, 
  validateExternalServiceDependencies,
  type ExternalConfig 
} from "./external.config";

/**
 * Validate all environment variables across all domains
 */
const validateAllEnvironmentVariables = () => {
  // Validate each domain independently
  const appEnv = validateAppEnv();
  const databaseEnv = validateDatabaseEnv();
  const securityEnv = validateSecurityEnv();
  const aiEnv = validateAiEnv();
  const externalEnv = validateExternalEnv();

  // Return combined environment variables
  return {
    ...appEnv,
    ...databaseEnv,
    ...securityEnv,
    ...aiEnv,
    ...externalEnv,
  };
};

/**
 * Validate and load environment variables
 */
const envVars = validateAllEnvironmentVariables();

/**
 * Create domain-specific configurations
 */
const appConfig = createAppConfig(envVars);
const databaseConfig = createDatabaseConfig(envVars);
const securityConfig = createSecurityConfig(envVars);
const aiConfig = createAiConfig(envVars);
const externalConfig = createExternalConfig(envVars);

/**
 * Combined configuration type
 */
export type Config = AppConfig & DatabaseConfig & SecurityConfig & AiConfig & ExternalConfig;

/**
 * Application configuration object (composed from all domains)
 */
export const config: Config = {
  ...appConfig,
  ...databaseConfig,
  ...securityConfig,
  ...aiConfig,
  ...externalConfig,
} as const;

/**
 * Cross-domain validation logic
 * (Validates dependencies between different service domains)
 */
validateExternalServiceDependencies(
  externalConfig,
  appConfig.notifications
);

// Export individual domain configurations for specific use cases
export { appConfig, databaseConfig, securityConfig, aiConfig, externalConfig };

// Export domain-specific types
export type { AppConfig, DatabaseConfig, SecurityConfig, AiConfig, ExternalConfig };

// Export configuration type for TypeScript
export default config;