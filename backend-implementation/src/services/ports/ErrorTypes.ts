/**
 * Shared error types for services to avoid circular dependencies
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error category classifications
 */
export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  DATABASE = "database",
  EXTERNAL_SERVICE = "external_service",
  NETWORK = "network",
  SYSTEM = "system",
  BUSINESS_LOGIC = "business_logic",
}

/**
 * Business impact levels for error classification
 */
export enum BusinessImpact {
  MINIMAL = "minimal",
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical",
  REVENUE_BLOCKING = "revenue_blocking"
}

/**
 * System layer types for error coordination
 */
export enum SystemLayer {
  PRESENTATION = "presentation",
  API = "api",
  APPLICATION = "application", 
  BUSINESS_LOGIC = "business_logic",
  DATA_ACCESS = "data_access",
  EXTERNAL_SERVICES = "external_services",
  DOMAIN = "domain",
  INFRASTRUCTURE = "infrastructure",
  DATABASE = "database",
  EXTERNAL = "external",
  SECURITY = "security",
  MONITORING = "monitoring",
  AI_ML = "ai_ml",
  SERVICE_MESH = "service_mesh"
}