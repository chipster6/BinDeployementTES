import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "@/config";
import { redisClient } from "@/config/redis";
import { logger, logSecurityEvent } from "@/utils/logger";
import {
  rateLimitConfig,
  authRateLimitConfig,
} from "@/config/rateLimit.config";

const createRedisStore = () => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: `${config.redis.keyPrefix}rate_limit:`,
  });
};

const keyGenerator = (req: any): string => {
  return req.user?.id || req.ip;
};

const handler = (req: any, res: any, next: any, options: any) => {
  logSecurityEvent(
    "rate_limit_exceeded",
    {
      identifier: keyGenerator(req),
      url: req.originalUrl,
      method: req.method,
    },
    req.user?.id,
    req.ip,
    "medium",
  );
  res.status(options.statusCode).send(options?.message);
};

export const generalRateLimiter = rateLimit({
  ...rateLimitConfig,
  store: createRedisStore(),
  keyGenerator,
  handler,
});

export const authRateLimiter = rateLimit({
  ...authRateLimitConfig,
  store: createRedisStore(),
  keyGenerator,
  handler,
});

/**
 * Configurable rate limiter factory for API endpoints
 */
export const rateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options?.message,
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    store: createRedisStore(),
    keyGenerator,
    handler: (req, res, next, rateLimitOptions) => {
      logSecurityEvent(
        "rate_limit_exceeded",
        {
          identifier: keyGenerator(req),
          url: req.originalUrl,
          method: req.method,
          limit: options.max,
          window: options.windowMs
        },
        req.user?.id,
        req.ip,
        "medium",
      );
      res.status(429).json({
        success: false,
        message: options?.message,
        error: 'rate_limit_exceeded',
        retryAfter: Math.round(options.windowMs / 1000)
      });
    }
  });
};
