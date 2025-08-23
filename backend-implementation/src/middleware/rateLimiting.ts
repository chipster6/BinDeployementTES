/**
 * ADVANCED RATE LIMITING MIDDLEWARE
 * Comprehensive rate limiting for different endpoint categories
 * 
 * Features:
 * - Role-based rate limiting
 * - Endpoint-specific limits
 * - Redis-backed distributed rate limiting
 * - Intelligent burst handling
 * - Performance monitoring integration
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import type { Request, Response } from 'express';
import { CacheService } from '../services/CacheService';
import { Logger } from '../utils/Logger';
import { ResponseHelper } from '../utils/ResponseHelper';

const logger = new Logger('RateLimiting');

// Rate limiting configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Analytics endpoints - more generous for dashboard usage
  analytics: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many analytics requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 500, // 500 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Authentication endpoints - stricter
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: 'Too many authentication attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Predictive analytics - more restrictive due to computational cost
  predictions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    message: 'Too many prediction requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Real-time endpoints - higher frequency allowed
  realtime: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many real-time requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

// Role-based rate limit multipliers
const ROLE_MULTIPLIERS = {
  admin: 3.0,
  executive: 2.5,
  manager: 2.0,
  analyst: 1.5,
  user: 1.0,
  guest: 0.5
};

// Create Redis store if available
let redisStore;
try {
  redisStore = new RedisStore({
    // Use existing CacheService Redis connection if available
    sendCommand: (...args: string[]) => CacheService.redis?.call(...args),
  });
} catch (error: unknown) {
  logger.warn('Redis rate limiting store not available, using memory store', error);
  redisStore = undefined;
}

// Enhanced rate limiter factory with role-based adjustments
function createRateLimiter(config: any, options: { 
  roleAware?: boolean,
  skipSuccessfulRequests?: boolean,
  skipFailedRequests?: boolean 
} = {}) {
  return rateLimit({
    ...config,
    store: redisStore,
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path.includes('/health')) {
        return true;
      }
      
      // Skip for internal service calls
      if (req.headers['x-internal-service']) {
        return true;
      }
      
      return false;
    },
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const user = (req as any).user;
      if (user?.id) {
        return `user:${user.id}`;
      }
      return req.ip;
    },
    max: (req: Request) => {
      if (!options.roleAware) {
        return config.max;
      }
      
      const user = (req as any).user;
      const userRole = user?.role || 'guest';
      const multiplier = ROLE_MULTIPLIERS[userRole] || 1.0;
      
      return Math.floor(config.max * multiplier);
    },
    onLimitReached: (req: Request, res: Response) => {
      const user = (req as any).user;
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: user?.id,
        userRole: user?.role,
        endpoint: req.path,
        method: req.method,
        userAgent: req.headers['user-agent']
      });
    },
    handler: (req: Request, res: Response) => {
      ResponseHelper.error(res, req, { message: config?.message, statusCode: 429 });
    },
    ...options
  });
}

// Analytics-specific rate limiter with role awareness
export const rateLimitAnalytics = createRateLimiter(RATE_LIMIT_CONFIGS.analytics, {
  roleAware: true,
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

// General API rate limiter
export const rateLimitAPI = createRateLimiter(RATE_LIMIT_CONFIGS.api, {
  roleAware: true
});

// Authentication rate limiter (stricter)
export const rateLimitAuth = createRateLimiter(RATE_LIMIT_CONFIGS.auth, {
  roleAware: false, // No role multiplier for auth
  skipSuccessfulRequests: true, // Only count failed attempts
  skipFailedRequests: false
});

// Predictive analytics rate limiter (computational cost aware)
export const rateLimitPredictions = createRateLimiter(RATE_LIMIT_CONFIGS.predictions, {
  roleAware: true,
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

// Real-time endpoints rate limiter
export const rateLimitRealtime = createRateLimiter(RATE_LIMIT_CONFIGS.realtime, {
  roleAware: true,
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

// Adaptive rate limiter that adjusts based on system load
export function createAdaptiveRateLimiter(baseConfig: any) {
  return async (req: Request, res: Response, next: Function) => {
    try {
      // Get current system metrics
      const systemLoad = await getSystemLoad();
      
      // Adjust rate limits based on system load
      let adjustedMax = baseConfig.max;
      if (systemLoad > 0.8) {
        adjustedMax = Math.floor(baseConfig.max * 0.5); // Reduce by 50%
      } else if (systemLoad > 0.6) {
        adjustedMax = Math.floor(baseConfig.max * 0.75); // Reduce by 25%
      }
      
      // Create dynamic rate limiter
      const dynamicLimiter = rateLimit({
        ...baseConfig,
        max: adjustedMax,
        store: redisStore,
        keyGenerator: (req: Request) => {
          const user = (req as any).user;
          return user?.id ? `adaptive:user:${user.id}` : `adaptive:ip:${req.ip}`;
        }
      });
      
      return dynamicLimiter(req, res, next);
    } catch (error: unknown) {
      logger.error('Adaptive rate limiter error', error);
      // Fallback to base rate limiter
      const fallbackLimiter = createRateLimiter(baseConfig);
      return fallbackLimiter(req, res, next);
    }
  };
}

// Helper function to get system load (placeholder implementation)
async function getSystemLoad(): Promise<number> {
  try {
    // In a real implementation, this would check:
    // - CPU usage
    // - Memory usage
    // - Database connection pool utilization
    // - Redis memory usage
    // - Active request count
    
    // For now, return a mock value
    return Math.random() * 0.5; // Simulate low load
  } catch (error: unknown) {
    logger.error('Failed to get system load', error);
    return 0.5; // Conservative fallback
  }
}

// Rate limiting statistics and monitoring
export class RateLimitMonitor {
  static async getStats(timeWindow: number = 3600): Promise<any> {
    try {
      // This would query Redis for rate limiting statistics
      return {
        totalRequests: 0,
        blockedRequests: 0,
        topIPs: [],
        topUsers: [],
        endpointStats: {},
        systemLoad: await getSystemLoad()
      };
    } catch (error: unknown) {
      logger.error('Failed to get rate limit stats', error);
      return null;
    }
  }
  
  static async resetUserLimits(userId: number): Promise<boolean> {
    try {
      // Reset rate limits for a specific user
      if (redisStore && CacheService.redis) {
        await CacheService.redis.del(`user:${userId}`);
        return true;
      }
      return false;
    } catch (error: unknown) {
      logger.error('Failed to reset user rate limits', error);
      return false;
    }
  }
  
  static async resetIPLimits(ip: string): Promise<boolean> {
    try {
      // Reset rate limits for a specific IP
      if (redisStore && CacheService.redis) {
        await CacheService.redis.del(ip);
        return true;
      }
      return false;
    } catch (error: unknown) {
      logger.error('Failed to reset IP rate limits', error);
      return false;
    }
  }
}

// Export default rate limiter
export default rateLimitAPI;