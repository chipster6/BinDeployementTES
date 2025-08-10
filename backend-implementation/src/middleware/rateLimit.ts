/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - RATE LIMITING MIDDLEWARE
 * ============================================================================
 * 
 * Advanced rate limiting middleware with Redis backend.
 * Provides multiple rate limiting strategies and quota management.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { config } from '@/config';
import { redisClient, RateLimitService } from '@/config/redis';
import { logger, logSecurityEvent } from '@/utils/logger';
import { RateLimitError } from '@/middleware/errorHandler';

/**
 * Rate limit configuration for different endpoint types
 */
const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  general: {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: config.rateLimit.message,
  },
  
  // Authentication endpoints (stricter limits)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
      error: 'authentication_rate_limit',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 900, // 15 minutes
    },
  },
  
  // Password reset endpoints (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      error: 'password_reset_rate_limit',
      message: 'Too many password reset attempts, please try again in an hour.',
      retryAfter: 3600, // 1 hour
    },
  },
  
  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: {
      error: 'upload_rate_limit',
      message: 'Too many file uploads, please wait a moment.',
      retryAfter: 60,
    },
  },
  
  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
      error: 'search_rate_limit',
      message: 'Too many search requests, please slow down.',
      retryAfter: 60,
    },
  },
  
  // Report generation endpoints
  reports: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 reports per 5 minutes
    message: {
      error: 'report_rate_limit',
      message: 'Too many report requests, please wait a few minutes.',
      retryAfter: 300,
    },
  },
  
  // Webhook endpoints
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 webhook calls per minute
    message: {
      error: 'webhook_rate_limit',
      message: 'Webhook rate limit exceeded.',
      retryAfter: 60,
    },
  },
};

/**
 * Create Redis store for rate limiting
 */
const createRedisStore = () => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: `${config.redis.keyPrefix}rate_limit:`,
  });
};

/**
 * Key generator function for rate limiting
 */
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  const ip = req.ip;
  
  // Use user ID if authenticated, otherwise use IP
  if (userId) {
    return `user:${userId}`;
  }
  
  return `ip:${ip}`;
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req: Request, res: Response, next: NextFunction) => {
  const identifier = keyGenerator(req);
  
  logSecurityEvent(
    'rate_limit_exceeded',
    {
      identifier,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'],
    },
    (req as any).user?.id,
    req.ip,
    'medium'
  );
  
  // Get rate limit info from headers
  const limit = res.getHeader('X-RateLimit-Limit');
  const remaining = res.getHeader('X-RateLimit-Remaining');
  const reset = res.getHeader('X-RateLimit-Reset');
  
  const error = new RateLimitError();
  
  res.status(429).json({
    error: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later.',
    details: {
      limit,
      remaining,
      reset,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req: Request): boolean => {
  // Skip for health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }
  
  // Skip for internal services (if configured)
  const internalIPs = ['127.0.0.1', '::1'];
  if (config.app.nodeEnv === 'development' && internalIPs.includes(req.ip)) {
    return true;
  }
  
  // Skip for successful requests (if configured)
  if (config.rateLimit.skipSuccessfulRequests) {
    // This will be handled by the express-rate-limit library
    return false;
  }
  
  return false;
};

/**
 * Create rate limiter with specific configuration
 */
const createRateLimiter = (configKey: keyof typeof RATE_LIMIT_CONFIGS) => {
  const limiterConfig = RATE_LIMIT_CONFIGS[configKey];
  
  return rateLimit({
    store: createRedisStore(),
    windowMs: limiterConfig.windowMs,
    max: limiterConfig.max,
    message: limiterConfig.message,
    keyGenerator,
    handler: rateLimitHandler,
    skip: skipRateLimit,
    skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
    skipFailedRequests: false,
    requestWasSuccessful: (req: Request, res: Response) => res.statusCode < 400,
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req: Request, res: Response, options: any) => {
      logger.warn(`Rate limit reached for ${keyGenerator(req)}`, {
        limit: options.max,
        windowMs: options.windowMs,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.id,
      });
    },
  });
};

/**
 * General API rate limiter
 */
export const rateLimitMiddleware = createRateLimiter('general');

/**
 * Authentication rate limiter
 */
export const authRateLimit = createRateLimiter('auth');

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimit = createRateLimiter('passwordReset');

/**
 * File upload rate limiter
 */
export const uploadRateLimit = createRateLimiter('upload');

/**
 * Search rate limiter
 */
export const searchRateLimit = createRateLimiter('search');

/**
 * Report generation rate limiter
 */
export const reportRateLimit = createRateLimiter('reports');

/**
 * Webhook rate limiter
 */
export const webhookRateLimit = createRateLimiter('webhook');

/**
 * Advanced rate limiting with quota management
 */
export class AdvancedRateLimit {
  /**
   * Check user quota for specific resource
   */
  static async checkQuota(
    userId: string,
    resource: string,
    limit: number,
    windowMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<{
    allowed: boolean;
    used: number;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const key = `quota:${userId}:${resource}`;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;
      
      const used = await redisClient.incr(windowKey);
      
      if (used === 1) {
        await redisClient.expire(windowKey, Math.ceil(windowMs / 1000));
      }
      
      const remaining = Math.max(0, limit - used);
      const resetTime = windowStart + windowMs;
      
      return {
        allowed: used <= limit,
        used,
        remaining,
        resetTime,
      };
    } catch (error) {
      logger.error('Quota check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        used: 1,
        remaining: limit - 1,
        resetTime: Date.now() + windowMs,
      };
    }
  }
  
  /**
   * Check burst rate limiting (short-term high-frequency protection)
   */
  static async checkBurstLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number = 1000 // 1 second default
  ): Promise<boolean> {
    try {
      const key = `burst:${identifier}`;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;
      
      const count = await redisClient.incr(windowKey);
      
      if (count === 1) {
        await redisClient.expire(windowKey, Math.ceil(windowMs / 1000));
      }
      
      return count <= maxRequests;
    } catch (error) {
      logger.error('Burst limit check failed:', error);
      return true; // Fail open
    }
  }
  
  /**
   * Sliding window rate limiter
   */
  static async slidingWindowLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const key = `sliding:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Remove old entries
      await redisClient.zremrangebyscore(key, '-inf', windowStart);
      
      // Count current entries
      const count = await redisClient.zcard(key);
      
      // Check if allowed
      const allowed = count < maxRequests;
      
      if (allowed) {
        // Add current request
        await redisClient.zadd(key, now, `${now}-${Math.random()}`);
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }
      
      return {
        allowed,
        count: count + (allowed ? 1 : 0),
        remaining: Math.max(0, maxRequests - count - (allowed ? 1 : 0)),
        resetTime: now + windowMs,
      };
    } catch (error) {
      logger.error('Sliding window rate limit failed:', error);
      return {
        allowed: true,
        count: 1,
        remaining: maxRequests - 1,
        resetTime: Date.now() + windowMs,
      };
    }
  }
}

/**
 * Custom rate limit middleware with advanced features
 */
export const customRateLimit = (options: {
  max: number;
  windowMs: number;
  burst?: {
    max: number;
    windowMs: number;
  };
  quota?: {
    resource: string;
    limit: number;
    windowMs: number;
  };
  message?: any;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = keyGenerator(req);
      
      // Check burst limit if configured
      if (options.burst) {
        const burstAllowed = await AdvancedRateLimit.checkBurstLimit(
          identifier,
          options.burst.max,
          options.burst.windowMs
        );
        
        if (!burstAllowed) {
          logSecurityEvent(
            'burst_limit_exceeded',
            { identifier, burst: options.burst },
            (req as any).user?.id,
            req.ip,
            'high'
          );
          
          return res.status(429).json({
            error: 'burst_limit_exceeded',
            message: 'Too many requests in a short time',
            retryAfter: Math.ceil(options.burst.windowMs / 1000),
          });
        }
      }
      
      // Check quota if configured
      if (options.quota && (req as any).user?.id) {
        const quotaResult = await AdvancedRateLimit.checkQuota(
          (req as any).user.id,
          options.quota.resource,
          options.quota.limit,
          options.quota.windowMs
        );
        
        if (!quotaResult.allowed) {
          logSecurityEvent(
            'quota_exceeded',
            { 
              userId: (req as any).user.id,
              resource: options.quota.resource,
              quota: quotaResult 
            },
            (req as any).user.id,
            req.ip,
            'medium'
          );
          
          return res.status(429).json({
            error: 'quota_exceeded',
            message: `Quota exceeded for ${options.quota.resource}`,
            quota: quotaResult,
          });
        }
        
        // Add quota headers
        res.setHeader('X-Quota-Limit', options.quota.limit);
        res.setHeader('X-Quota-Used', quotaResult.used);
        res.setHeader('X-Quota-Remaining', quotaResult.remaining);
        res.setHeader('X-Quota-Reset', new Date(quotaResult.resetTime).toISOString());
      }
      
      // Check sliding window rate limit
      const rateLimitResult = await AdvancedRateLimit.slidingWindowLimit(
        identifier,
        options.max,
        options.windowMs
      );
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      
      if (!rateLimitResult.allowed) {
        logSecurityEvent(
          'rate_limit_exceeded',
          { identifier, rateLimit: rateLimitResult },
          (req as any).user?.id,
          req.ip,
          'medium'
        );
        
        return res.status(429).json(
          options.message || {
            error: 'rate_limit_exceeded',
            message: 'Too many requests',
            rateLimit: rateLimitResult,
          }
        );
      }
      
      next();
    } catch (error) {
      logger.error('Custom rate limit error:', error);
      next(error);
    }
  };
};

// Export default rate limiter
export default rateLimitMiddleware;