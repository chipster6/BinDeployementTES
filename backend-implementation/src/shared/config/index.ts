/**
 * Shared configuration for clean architecture modules
 * 
 * Re-exports the existing sophisticated configuration system for use
 * in the new modular structure while maintaining compatibility.
 */
import { config } from "../../config/index";

// Re-export the comprehensive configuration
export const CONFIG = config;

// Export specific config sections for easy access in clean architecture
export const {
  app: APP_CONFIG,
  database: DATABASE_CONFIG, 
  security: SECURITY_CONFIG,
  external: EXTERNAL_CONFIG,
  redis: REDIS_CONFIG
} = config;
