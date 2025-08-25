/**
 * ============================================================================
 * TIERED RATE LIMITING MIDDLEWARE - SECURITY HARDENED
 * ============================================================================
 * 
 * Role-based rate limiting middleware with production security settings:
 * - Anonymous users: 100 requests/15 minutes
 * - Authenticated users: 1000 requests/15 minutes  
 * - Admin users: 5000 requests/15 minutes
 * 
 * Created for: Critical Security Hardening Implementation
 * Date: 2025-08-24
 * ============================================================================
 */

import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Request, Response } from "express";
import { config } from "@/config";
import { redisClient } from "@/config/redis";
import { logger, logSecurityEvent } from "@/utils/logger";
import { UserRole } from "@/models/User";
import type { AuthenticatedRequest } from "@/middleware/auth";

/**
 * Create Redis store for rate limiting
 */
const createRedisStore = (keyPrefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: `${config.redis.keyPrefix}rate_limit:${keyPrefix}:`,
  });
};

/**
 * Enhanced key generator that includes user role for tiered limiting
 */
const createKeyGenerator = (userType: 'anonymous' | 'authenticated' | 'admin') => {
  return (req: Request): string => {
    const authReq = req as AuthenticatedRequest;
    const baseKey = authReq.user?.id || req.ip || 'unknown';
    return `${userType}:${baseKey}`;
  };
};

/**
 * Enhanced rate limit handler with security event logging
 */
const createRateLimitHandler = (userType: 'anonymous' | 'authenticated' | 'admin', limit: number) => {
  return (req: Request, res: Response): void => {
    const authReq = req as AuthenticatedRequest;
    
    // Log security event for rate limit exceeded
    logSecurityEvent(
      "rate_limit_exceeded",
      {
        userType,
        limit,
        identifier: authReq.user?.id || req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
        userId: authReq.user?.id,
        userRole: authReq.user?.role,
      },
      authReq.user?.id,
      req.ip,
      "high", // High severity for potential abuse
    );

    // Enhanced error response with retry information
    res.status(429).json({
      success: false,
      error: 'rate_limit_exceeded',
      message: `Too many requests. Limit: ${limit} requests per 15 minutes for ${userType} users.`,
      limit,
      userType,
      retryAfter: Math.round(900), // 15 minutes in seconds
      timestamp: new Date().toISOString(),
    });
  };
};

/**
 * ANONYMOUS USERS RATE LIMITER (100 requests/15 minutes)
 * Applied to unauthenticated requests
 */
export const anonymousRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'rate_limit_exceeded',
    message: 'Too many requests from anonymous users. Limit: 100 requests per 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('anonymous'),
  keyGenerator: createKeyGenerator('anonymous'),
  handler: createRateLimitHandler('anonymous', 100),
  skip: (req: Request) => {
    // Skip if user is authenticated
    const authReq = req as AuthenticatedRequest;
    return !!authReq.user;
  },
  onLimitReached: (req: Request) => {
    logger.warn("Anonymous rate limit reached", {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.originalUrl,
      method: req.method,
    });
  },
});

/**
 * AUTHENTICATED USERS RATE LIMITER (1000 requests/15 minutes)
 * Applied to authenticated non-admin users
 */
export const authenticatedRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    success: false,
    error: 'rate_limit_exceeded',
    message: 'Too many requests from authenticated users. Limit: 1000 requests per 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('authenticated'),
  keyGenerator: createKeyGenerator('authenticated'),
  handler: createRateLimitHandler('authenticated', 1000),
  skip: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    // Skip if user is not authenticated or is admin
    return !authReq.user || authReq.user.role === UserRole.SUPER_ADMIN || authReq.user.role === UserRole.ADMIN;
  },
  onLimitReached: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn("Authenticated user rate limit reached", {
      userId: authReq.user?.id,
      userRole: authReq.user?.role,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });
  },
});

/**
 * ADMIN USERS RATE LIMITER (5000 requests/15 minutes)
 * Applied to admin and super admin users
 */
export const adminRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per window
  message: {
    success: false,
    error: 'rate_limit_exceeded',
    message: 'Too many requests from admin users. Limit: 5000 requests per 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('admin'),
  keyGenerator: createKeyGenerator('admin'),
  handler: createRateLimitHandler('admin', 5000),
  skip: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    // Only apply to admin users
    return !authReq.user || (authReq.user.role !== UserRole.SUPER_ADMIN && authReq.user.role !== UserRole.ADMIN);
  },
  onLimitReached: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn("Admin user rate limit reached", {
      userId: authReq.user?.id,
      userRole: authReq.user?.role,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });
  },
});

/**
 * CRITICAL ENDPOINTS RATE LIMITER (Stricter limits for sensitive operations)
 * Applied to authentication, password reset, and critical operations
 */
export const criticalEndpointsRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 attempts per 15 minutes for critical operations
  message: {
    success: false,
    error: 'critical_rate_limit_exceeded',
    message: 'Too many attempts on critical endpoints. Limit: 10 requests per 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('critical'),
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return `critical:${authReq.user?.id || req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    
    // Log critical security event
    logSecurityEvent(
      "critical_rate_limit_exceeded",
      {
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
        identifier: authReq.user?.id || req.ip,
      },
      authReq.user?.id,
      req.ip,
      "critical", // Critical severity for sensitive endpoints
    );

    res.status(429).json({
      success: false,
      error: 'critical_rate_limit_exceeded',
      message: 'Too many attempts on critical endpoints. Please try again later.',
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    });
  },
  onLimitReached: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    logger.error("Critical endpoint rate limit reached - potential abuse", {
      userId: authReq.user?.id,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  },
});

/**
 * COMBINED TIERED RATE LIMITING MIDDLEWARE
 * Applies appropriate rate limits based on user authentication status and role
 */
export const tieredRateLimit = [
  anonymousRateLimit,
  authenticatedRateLimit,
  adminRateLimit,
];

/**
 * Rate limiter factory for custom limits on specific endpoints
 */
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: 'rate_limit_exceeded',
      message: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(options.keyPrefix),
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return `${options.keyPrefix}:${authReq.user?.id || req.ip}`;
    },
    handler: (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      
      logSecurityEvent(
        "custom_rate_limit_exceeded",
        {
          keyPrefix: options.keyPrefix,
          limit: options.max,
          window: options.windowMs,
          url: req.originalUrl,
          method: req.method,
        },
        authReq.user?.id,
        req.ip,
        options.severity || "medium",
      );

      res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message: options.message,
        retryAfter: Math.round(options.windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
  });
};

/**
 * Middleware to log rate limit statistics for monitoring
 */
export const rateLimitMonitoring = (req: Request, res: Response, next: Function): void => {
  const authReq = req as AuthenticatedRequest;
  
  // Add rate limit headers for monitoring
  const rateLimitType = authReq.user 
    ? (authReq.user.role === UserRole.SUPER_ADMIN || authReq.user.role === UserRole.ADMIN ? 'admin' : 'authenticated')
    : 'anonymous';

  res.setHeader('X-Rate-Limit-Type', rateLimitType);
  res.setHeader('X-User-Role', authReq.user?.role || 'anonymous');
  
  next();
};

// Export all rate limiters for easy access
export default {
  tieredRateLimit,
  anonymousRateLimit,
  authenticatedRateLimit,
  adminRateLimit,
  criticalEndpointsRateLimit,
  createCustomRateLimit,
  rateLimitMonitoring,
};