import rateLimit from "express-rate-limit";

/**
 * Rate limiting configuration interface for type safety
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean | undefined;
  message?: {
    error: string;
    message: string;
    retryAfter: number;
  } | undefined;
}

/**
 * Standard API rate limiting configuration
 */
export const rateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Authentication endpoint rate limiting configuration
 */
export const authRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
};
