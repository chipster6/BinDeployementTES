/**
 * ============================================================================
 * APPLICATION CONSTANTS
 * ============================================================================
 *
 * Centralized configuration constants for the waste management system.
 * Extracted from hard-coded values to improve maintainability.
 *
 * Categories:
 * - Bin Service Constants
 * - Pagination Limits
 * - Performance Thresholds
 * - Time Constants
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

// ============================================================================
// BIN SERVICE CONSTANTS
// ============================================================================

/**
 * Bin fill level threshold for service requirements
 * When a bin reaches this percentage, it needs service
 */
export const BIN_SERVICE_THRESHOLD = 80; // 80%

/**
 * Default bin capacity in cubic yards if not specified
 */
export const DEFAULT_BIN_CAPACITY = 8.0;

/**
 * Maximum bin capacity allowed in cubic yards
 */
export const MAX_BIN_CAPACITY = 40.0;

/**
 * Bin serial number prefix mapping
 */
export const BIN_SERIAL_PREFIXES = {
  RESIDENTIAL: 'RES',
  COMMERCIAL: 'COM', 
  INDUSTRIAL: 'IND',
  RECYCLING: 'REC',
  ORGANIC: 'ORG',
  HAZARDOUS: 'HAZ',
} as const;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

/**
 * Default page size for paginated results
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum page size allowed per request
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Maximum page number allowed
 */
export const MAX_PAGE_NUMBER = 10000;

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

/**
 * Database query timeout in milliseconds
 */
export const DB_QUERY_TIMEOUT = 30000; // 30 seconds

/**
 * Cache TTL for bin data in seconds
 */
export const BIN_CACHE_TTL = 300; // 5 minutes

/**
 * Maximum concurrent requests per user
 */
export const MAX_CONCURRENT_REQUESTS = 10;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

/**
 * Refresh token cookie max age in milliseconds
 */
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Session timeout in milliseconds
 */
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Rate limit window in milliseconds
 */
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Minimum password length
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Maximum email length
 */
export const MAX_EMAIL_LENGTH = 255;

/**
 * Maximum bin number length
 */
export const MAX_BIN_NUMBER_LENGTH = 50;

/**
 * Minimum bin number length
 */
export const MIN_BIN_NUMBER_LENGTH = 3;

// ============================================================================
// HTTP STATUS CODES (for consistency)
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// ENVIRONMENT CONSTANTS
// ============================================================================

/**
 * Check if running in production environment
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Check if running in development environment
 */
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Check if running in test environment
 */
export const IS_TEST = process.env.NODE_ENV === 'test';

export default {
  BIN_SERVICE_THRESHOLD,
  DEFAULT_BIN_CAPACITY,
  MAX_BIN_CAPACITY,
  BIN_SERIAL_PREFIXES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_PAGE_NUMBER,
  DB_QUERY_TIMEOUT,
  BIN_CACHE_TTL,
  MAX_CONCURRENT_REQUESTS,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_TIMEOUT,
  RATE_LIMIT_WINDOW,
  MIN_PASSWORD_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_BIN_NUMBER_LENGTH,
  MIN_BIN_NUMBER_LENGTH,
  HTTP_STATUS,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
};