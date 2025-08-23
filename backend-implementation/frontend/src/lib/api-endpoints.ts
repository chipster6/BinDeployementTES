/**
 * ============================================================================
 * COMPREHENSIVE API ENDPOINTS CONFIGURATION
 * ============================================================================
 * 
 * Complete mapping of all backend API routes organized by functional domain.
 * This configuration provides a centralized source of truth for all API endpoints
 * and enables type-safe API client interactions.
 * 
 * Features:
 * - Organized by functional domains
 * - Environment-aware base URLs
 * - Parameterized route generation
 * - TypeScript type safety
 * - Comprehensive endpoint coverage
 * 
 * Created by: Frontend UI Specialist
 * Date: 2025-08-23
 * Version: 1.0.0
 */

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';

/**
 * Base API configuration
 */
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  VERSION: API_VERSION,
  FULL_BASE_URL: `${API_BASE_URL}${API_VERSION}`,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  UPDATE_PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  ENABLE_MFA: '/auth/mfa/enable',
  DISABLE_MFA: '/auth/mfa/disable',
  VERIFY_MFA: '/auth/mfa/verify',
  GENERATE_BACKUP_CODES: '/auth/mfa/backup-codes',
} as const;

/**
 * Core entity endpoints
 */
export const USERS_ENDPOINTS = {
  LIST: '/users',
  CREATE: '/users',
  GET: (id: string) => `/users/${id}`,
  UPDATE: (id: string) => `/users/${id}`,
  DELETE: (id: string) => `/users/${id}`,
  SEARCH: '/users/search',
  BULK_UPDATE: '/users/bulk',
  EXPORT: '/users/export',
} as const;

export const CUSTOMERS_ENDPOINTS = {
  LIST: '/customers',
  CREATE: '/customers',
  GET: (id: string) => `/customers/${id}`,
  UPDATE: (id: string) => `/customers/${id}`,
  DELETE: (id: string) => `/customers/${id}`,
  SEARCH: '/customers/search',
  EXPORT: '/customers/export',
  SERVICE_HISTORY: (id: string) => `/customers/${id}/service-history`,
  BILLING_HISTORY: (id: string) => `/customers/${id}/billing`,
  CONTRACTS: (id: string) => `/customers/${id}/contracts`,
} as const;

export const BINS_ENDPOINTS = {
  LIST: '/bins',
  CREATE: '/bins',
  GET: (id: string) => `/bins/${id}`,
  UPDATE: (id: string) => `/bins/${id}`,
  DELETE: (id: string) => `/bins/${id}`,
  SEARCH: '/bins/search',
  BY_CUSTOMER: (customerId: string) => `/bins/customer/${customerId}`,
  NEARBY: '/bins/nearby',
  STATUS_UPDATE: (id: string) => `/bins/${id}/status`,
  SERVICE_EVENTS: (id: string) => `/bins/${id}/service-events`,
  LOCATION_HISTORY: (id: string) => `/bins/${id}/location-history`,
} as const;

/**
 * Route optimization endpoints
 */
export const ROUTE_OPTIMIZATION_ENDPOINTS = {
  OPTIMIZE: '/routes/optimize',
  ADAPT: '/routes/adapt',
  CURRENT: '/routes/current',
  PERFORMANCE: '/routes/performance',
  ANALYTICS: '/routes/analytics',
  HISTORY: '/routes/optimization-history',
  STATUS: '/routes/optimization-status',
  EXPORT: (optimizationId: string) => `/routes/optimization/${optimizationId}/export`,
  DOWNLOAD: (optimizationId: string, format: string) => `/routes/optimization/${optimizationId}/download?format=${format}`,
} as const;

/**
 * Predictive analytics endpoints
 */
export const PREDICTIVE_ANALYTICS_ENDPOINTS = {
  FORECAST: '/predictive-analytics/forecast',
  BATCH_FORECAST: '/predictive-analytics/batch-forecast',
  STATUS: '/predictive-analytics/status',
  PERFORMANCE_METRICS: '/predictive-analytics/performance-metrics',
  HEALTH: '/predictive-analytics/health',
  HEALTH_ADVANCED: '/predictive-analytics/health-advanced',
  STREAM: (modelId: string) => `/predictive-analytics/stream/${modelId}`,
  
  // Prophet endpoints
  PROPHET: {
    TRAIN: '/predictive-analytics/prophet/train',
    FORECAST: (modelId: string) => `/predictive-analytics/prophet/${modelId}/forecast`,
    SEASONALITY: (modelId: string) => `/predictive-analytics/prophet/${modelId}/seasonality`,
    MODELS: '/predictive-analytics/prophet/models',
    CACHE: '/predictive-analytics/prophet/cache',
    DIAGNOSTICS: (modelId: string) => `/predictive-analytics/prophet/${modelId}/diagnostics`,
    CROSS_VALIDATE: (modelId: string) => `/predictive-analytics/prophet/${modelId}/cross-validate`,
  },
  
  // LightGBM endpoints
  LIGHTGBM: {
    TRAIN: '/predictive-analytics/lightgbm/train',
    PREDICT: '/predictive-analytics/lightgbm/predict',
    OPTIMIZE: '/predictive-analytics/lightgbm/optimize',
    MODELS: '/predictive-analytics/lightgbm/models',
    CACHE: '/predictive-analytics/lightgbm/cache',
    DIAGNOSTICS: (modelId: string) => `/predictive-analytics/lightgbm/${modelId}/diagnostics`,
    CROSS_VALIDATE: (modelId: string) => `/predictive-analytics/lightgbm/${modelId}/cross-validate`,
  },
} as const;

/**
 * Analytics and reporting endpoints
 */
export const ANALYTICS_ENDPOINTS = {
  DASHBOARD: '/analytics/dashboard',
  METRICS: '/analytics/metrics',
  REPORTS: '/analytics/reports',
  EXPORT: '/analytics/export',
  REAL_TIME: '/analytics/real-time',
  CUSTOM_QUERY: '/analytics/query',
  
  // Specific analytics domains
  FINANCIAL: '/analytics/financial',
  OPERATIONAL: '/analytics/operational',
  FLEET: '/analytics/fleet',
  EXECUTIVE: '/analytics/executive',
  COMPLIANCE: '/analytics/compliance',
} as const;

/**
 * Security endpoints
 */
export const SECURITY_ENDPOINTS = {
  HEALTH: '/security/health',
  
  // Threat detection
  THREATS: {
    ANALYZE: '/security/threats/analyze',
    ACTIVE: '/security/threats/active',
    RESPOND: '/security/threats/respond',
  },
  
  // Security monitoring
  MONITORING: {
    DASHBOARD: '/security/monitoring/dashboard',
    EVENTS: '/security/monitoring/events',
    ALERTS: '/security/monitoring/alerts',
  },
  
  // Incident response
  INCIDENTS: {
    CREATE: '/security/incidents/create',
    ACTIVE: '/security/incidents/active',
    ESCALATE: (id: string) => `/security/incidents/${id}/escalate`,
  },
  
  // Security audit
  AUDIT: {
    EVENTS: '/security/audit/events',
    COMPLIANCE_REPORT: '/security/audit/compliance-report',
    METRICS: '/security/audit/metrics',
  },
} as const;

/**
 * Compliance endpoints (SOC 2 and HSM)
 */
export const COMPLIANCE_ENDPOINTS = {
  // SOC 2 compliance
  SOC2: {
    STATUS: '/compliance/soc2/status',
    INITIALIZE: '/compliance/soc2/initialize',
    CONTROLS_TEST: '/compliance/soc2/controls/test',
    REPORT: '/compliance/soc2/report',
  },
  
  // HSM management
  HSM: {
    STATUS: '/compliance/hsm/status',
    INITIALIZE: '/compliance/hsm/initialize',
    KEYS: '/compliance/hsm/keys',
    ROTATE_KEY: (keyId: string) => `/compliance/hsm/keys/${keyId}/rotate`,
    ENCRYPT: '/compliance/hsm/encrypt',
    DECRYPT: '/compliance/hsm/decrypt',
  },
} as const;

/**
 * AI/ML services endpoints
 */
export const ML_ENDPOINTS = {
  MODELS: '/ml/models',
  DEPLOYMENTS: '/ml/deployments',
  DEPLOY_MODEL: '/ml/deployments',
  PIPELINES: '/ml/pipelines',
  TRIGGER_PIPELINE: '/ml/pipelines/trigger',
  
  // Weaviate vector database
  WEAVIATE: {
    SEARCH: '/weaviate/search',
    INDEX: '/weaviate/index',
    DELETE: '/weaviate/delete',
    SCHEMA: '/weaviate/schema',
    HEALTH: '/weaviate/health',
    METRICS: '/weaviate/metrics',
  },
  
  // ML security
  SECURITY: {
    SCAN: '/ml/security/scan',
    THREATS: '/ml/security/threats',
    POLICIES: '/ml/security/policies',
  },
} as const;

/**
 * External service coordination endpoints
 */
export const EXTERNAL_SERVICES_ENDPOINTS = {
  STATUS: '/external-services/status',
  COSTS: '/external-services/costs',
  FALLBACKS: '/external-services/fallbacks',
  ACTIVATE_FALLBACK: (serviceName: string) => `/external-services/fallbacks/${serviceName}/activate`,
  DEACTIVATE_FALLBACK: (serviceName: string) => `/external-services/fallbacks/${serviceName}/deactivate`,
  TEST_SERVICE: (serviceName: string) => `/external-services/test/${serviceName}`,
  
  // Traffic optimization
  TRAFFIC: {
    OPTIMIZATION: '/external-services/traffic-optimization',
    STATUS: '/external-services/traffic-optimization/status',
    HEALTH: '/external-services/traffic-optimization/health',
  },
  
  // Cost monitoring
  COST_MONITORING: {
    METRICS: '/external-services/cost-monitoring/metrics',
    ALERTS: '/external-services/cost-monitoring/alerts',
    BUDGET: '/external-services/cost-monitoring/budget',
  },
} as const;

/**
 * Monitoring and observability endpoints
 */
export const MONITORING_ENDPOINTS = {
  HEALTH: '/monitoring/health',
  METRICS: '/monitoring/metrics',
  ALERTS: '/monitoring/alerts',
  ACKNOWLEDGE_ALERT: (alertId: string) => `/monitoring/alerts/${alertId}/acknowledge`,
  SILENCE_ALERT: (alertId: string) => `/monitoring/alerts/${alertId}/silence`,
  
  // Performance monitoring
  PERFORMANCE: {
    DASHBOARD: '/performance/dashboard',
    METRICS: '/performance/metrics',
    COORDINATION: '/performance/coordination',
    OPTIMIZATION: '/performance/optimization',
  },
  
  // System health
  SYSTEM: {
    HEALTH: '/health',
    STATUS: '/status',
    DEPENDENCIES: '/health/dependencies',
  },
} as const;

/**
 * Queue and job management endpoints
 */
export const QUEUE_ENDPOINTS = {
  STATUS: '/queue/status',
  STATS: '/queue/stats',
  JOBS: '/queue/jobs',
  RETRY_JOB: (jobId: string) => `/queue/jobs/${jobId}/retry`,
  CANCEL_JOB: (jobId: string) => `/queue/jobs/${jobId}/cancel`,
  FAILED_JOBS: '/queue/jobs/failed',
  ACTIVE_JOBS: '/queue/jobs/active',
  COMPLETED_JOBS: '/queue/jobs/completed',
  PURGE_COMPLETED: '/queue/purge/completed',
  PURGE_FAILED: '/queue/purge/failed',
} as const;

/**
 * WebSocket endpoints
 */
export const WEBSOCKET_ENDPOINTS = {
  BASE_URL: API_BASE_URL.replace(/^http/, 'ws'),
  MONITORING: '/ws/monitoring',
  SECURITY: '/ws/security',
  ANALYTICS: '/ws/analytics',
  ROUTE_UPDATES: '/ws/route-updates',
  BIN_UPDATES: '/ws/bin-updates',
  ALERTS: '/ws/alerts',
} as const;

/**
 * Feature flags and A/B testing endpoints
 */
export const FEATURE_FLAGS_ENDPOINTS = {
  FLAGS: '/features/flags',
  CREATE_FLAG: '/features/flags',
  UPDATE_FLAG: (id: string) => `/features/flags/${id}`,
  TOGGLE_FLAG: (id: string) => `/features/flags/${id}/toggle`,
  AB_TESTS: '/features/ab-tests',
  CREATE_AB_TEST: '/features/ab-tests',
  START_AB_TEST: (id: string) => `/features/ab-tests/${id}/start`,
  STOP_AB_TEST: (id: string) => `/features/ab-tests/${id}/stop`,
} as const;

/**
 * Operations and deployment endpoints
 */
export const OPERATIONS_ENDPOINTS = {
  INFRASTRUCTURE: '/operations/infrastructure',
  DEPLOYMENTS: '/operations/deployments',
  CREATE_DEPLOYMENT: '/operations/deployments',
  GET_DEPLOYMENT: (id: string) => `/operations/deployments/${id}`,
  ROLLBACK_DEPLOYMENT: (id: string) => `/operations/deployments/${id}/rollback`,
  RESTART_SERVICE: '/operations/services/restart',
  SCALE_SERVICE: '/operations/services/scale',
} as const;

/**
 * Utility function to build full URL
 */
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.FULL_BASE_URL}${endpoint}`;
}

/**
 * Utility function to build WebSocket URL
 */
export function buildWebSocketUrl(endpoint: string): string {
  return `${WEBSOCKET_ENDPOINTS.BASE_URL}${endpoint}`;
}

/**
 * Complete endpoints registry
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USERS: USERS_ENDPOINTS,
  CUSTOMERS: CUSTOMERS_ENDPOINTS,
  BINS: BINS_ENDPOINTS,
  ROUTE_OPTIMIZATION: ROUTE_OPTIMIZATION_ENDPOINTS,
  PREDICTIVE_ANALYTICS: PREDICTIVE_ANALYTICS_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  SECURITY: SECURITY_ENDPOINTS,
  COMPLIANCE: COMPLIANCE_ENDPOINTS,
  ML: ML_ENDPOINTS,
  EXTERNAL_SERVICES: EXTERNAL_SERVICES_ENDPOINTS,
  MONITORING: MONITORING_ENDPOINTS,
  QUEUE: QUEUE_ENDPOINTS,
  WEBSOCKET: WEBSOCKET_ENDPOINTS,
  FEATURE_FLAGS: FEATURE_FLAGS_ENDPOINTS,
  OPERATIONS: OPERATIONS_ENDPOINTS,
} as const;

export default API_ENDPOINTS;