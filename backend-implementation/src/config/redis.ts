/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REDIS CONFIGURATION
 * ============================================================================
 *
 * Redis client configuration for caching, sessions, and job queues.
 * Provides connection management, health checks, and utility functions.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import { config } from "./index";
import { logger } from "../utils/logger";

/**
 * Redis client configuration options
 */
const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  ...(config.redis.password && { password: config.redis.password }),
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  enableReadyCheck: config.redis.enableReadyCheck,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  lazyConnect: config.redis.lazyConnect,
  keepAlive: config.redis.keepAlive,
  family: 4, // 4 (IPv4) or 6 (IPv6)
  connectTimeout: 60000,
  commandTimeout: 5000,
  enableOfflineQueue: false,
  readOnly: false,

  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.debug(`Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },

  // Reconnect on error
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    return err?.message.includes(targetError);
  },
};

/**
 * Main Redis client instance
 */
export const redisClient = new Redis(redisOptions);

/**
 * Redis client for sessions (separate database)
 */
export const sessionRedisClient = new Redis({
  ...redisOptions,
  db: (config.redis?.db || 0) + 1, // Use db + 1 for sessions
  keyPrefix: `${config.redis.keyPrefix}session:`,
});

/**
 * Redis client for job queue (separate database)
 */
export const queueRedisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  db: (config.redis?.db || 0) + 2, // Use db + 2 for queue
  keyPrefix: `${config.redis.keyPrefix}queue:`,
  ...redisOptions,
});

/**
 * Redis event handlers
 */
redisClient.on("connect", () => {
  logger.info("✅ Redis client connected");
});

redisClient.on("ready", () => {
  logger.info("✅ Redis client ready");
});

redisClient.on("error", (err: Error) => {
  logger.error("❌ Redis client error:", {
    message: err?.message,
    stack: err?.stack,
  });
});

redisClient.on("close", () => {
  logger.info("📪 Redis connection closed");
});

redisClient.on("reconnecting", () => {
  logger.info("🔄 Redis client reconnecting...");
});

redisClient.on("end", () => {
  logger.info("🔚 Redis connection ended");
});

/**
 * Session Redis event handlers
 */
sessionRedisClient.on("connect", () => {
  logger.info("✅ Session Redis client connected");
});

sessionRedisClient.on("error", (err: Error) => {
  logger.error("❌ Session Redis client error:", err?.message);
});

/**
 * Queue Redis event handlers
 */
queueRedisClient.on("connect", () => {
  logger.info("✅ Queue Redis client connected");
});

queueRedisClient.on("error", (err: Error) => {
  logger.error("❌ Queue Redis client error:", err?.message);
});

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED REDIS TYPE SAFETY INTERFACES
 * =============================================================================
 * Triangle Coordination: Performance-Optimization-Specialist + Code-Refactoring-Analyst + Database-Architect
 */

export interface RedisHealthDetails {
  responseTime: string;
  ping: "✅" | "❌";
  sessionPing: "✅" | "❌";
  queuePing: "✅" | "❌";
  testOperation: "✅" | "❌";
  host: string;
  port: number;
  db: number;
  keyPrefix: string;
  version?: string;
  memory?: string;
}

export interface RedisHealthCheckResult {
  status: "healthy" | "unhealthy";
  details: RedisHealthDetails | {
    error: string;
    host: string;
    port: number;
    db: number;
  };
}

export interface RedisPerformanceMetrics {
  connectionCount: number;
  commandsProcessed: number;
  memoryUsage: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: Date;
}

export interface RedisConnectionPoolConfig {
  host: string;
  port: number;
  db: number;
  keyPrefix: string;
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  retryStrategy: (times: number) => number;
}

/**
 * Redis health check with enhanced type safety
 */
export const checkRedisHealth = async (): Promise<RedisHealthCheckResult> => {
  try {
    const startTime = Date.now();

    // Test main client
    const pong = await redisClient.ping();
    const responseTime = Date.now() - startTime;

    // Get Redis info
    const info = await redisClient.info();
    const memoryInfo = await redisClient.info("memory");

    // Test set/get operation
    const testKey = `health_check:${Date.now()}`;
    await redisClient.set(testKey, "test", "EX", 10);
    const testValue = await redisClient.get(testKey);
    await redisClient.del(testKey);

    // Test session client
    const sessionPong = await sessionRedisClient.ping();

    // Test queue client
    const queuePong = await queueRedisClient.ping();

    return {
      status: "healthy",
      details: {
        responseTime: `${responseTime}ms`,
        ping: pong === "PONG" ? "✅" : "❌",
        sessionPing: sessionPong === "PONG" ? "✅" : "❌",
        queuePing: queuePong === "PONG" ? "✅" : "❌",
        testOperation: testValue === "test" ? "✅" : "❌",
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix,
        ...((() => {
          const versionLine = info
            .split("\n")
            .find((line) => line.startsWith("redis_version:"));
          const version = versionLine?.split(":")[1]?.trim();
          return version ? { version } : {};
        })()),
        ...((() => {
          const memoryLine = memoryInfo
            .split("\n")
            .find((line) => line.startsWith("used_memory_human:"));
          const memory = memoryLine?.split(":")[1]?.trim();
          return memory ? { memory } : {};
        })()),
      },
    };
  } catch (error: unknown) {
    logger.error("Redis health check failed:", error);
    return {
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error?.message : "Unknown error",
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
      },
    };
  }
};

/**
 * Initialize Redis connections
 */
export const initializeRedis = async (): Promise<void> => {
  try {
    logger.info("🔗 Initializing Redis connections...");

    // Connect main client
    await redisClient.ping();
    logger.info("✅ Main Redis client connected");

    // Connect session client
    await sessionRedisClient.ping();
    logger.info("✅ Session Redis client connected");

    // Connect queue client
    await queueRedisClient.ping();
    logger.info("✅ Queue Redis client connected");
  } catch (error: unknown) {
    logger.error("❌ Failed to initialize Redis:", error);
    throw error;
  }
};

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED CACHE SERVICE WITH STRICT TYPING
 * =============================================================================
 * Eliminates 'any' types and implements performance monitoring
 */

export type CacheableValue = string | number | boolean | object | null;

export interface CacheOperationOptions {
  ttl?: number;
  useCompression?: boolean;
  enableMetrics?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  averageResponseTime: number;
  lastResetTime: Date;
}

export class CacheService {
  private static metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    averageResponseTime: 0,
    lastResetTime: new Date(),
  };

  /**
   * Set a value in cache with TTL and performance tracking
   */
  static async set<T extends CacheableValue>(
    key: string,
    value: T,
    options: CacheOperationOptions = {},
  ): Promise<void> {
    const { ttl = config.redis.defaultTTL, enableMetrics = true } = options;
    const startTime = performance.now();
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setex(key, ttl, serializedValue);
      
      if (enableMetrics) {
        this.metrics.sets++;
        this.updateAverageResponseTime(performance.now() - startTime);
      }
      
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error: unknown) {
      if (enableMetrics) {
        this.metrics.errors++;
      }
      logger.error(`Cache SET failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from cache with strict typing and performance tracking
   */
  static async get<T extends CacheableValue>(
    key: string,
    options: { enableMetrics?: boolean } = {},
  ): Promise<T | null> {
    const { enableMetrics = true } = options;
    const startTime = performance.now();
    try {
      const value = await redisClient.get(key);
      
      if (!value) {
        if (enableMetrics) {
          this.metrics.misses++;
          this.updateAverageResponseTime(performance.now() - startTime);
        }
        return null;
      }

      const parsedValue = JSON.parse(value) as T;
      
      if (enableMetrics) {
        this.metrics.hits++;
        this.updateAverageResponseTime(performance.now() - startTime);
      }
      
      logger.debug(`Cache GET: ${key} (found)`);
      return parsedValue;
    } catch (error: unknown) {
      if (enableMetrics) {
        this.metrics.errors++;
      }
      logger.error(`Cache GET failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  static async del(key: string): Promise<boolean> {
    try {
      const result = await redisClient.del(key);
      logger.debug(`Cache DEL: ${key} (${result ? "deleted" : "not found"})`);
      return result > 0;
    } catch (error: unknown) {
      logger.error(`Cache DEL failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error: unknown) {
      logger.error(`Cache EXISTS failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiry for a key
   */
  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redisClient.expire(key, ttl);
      return result === 1;
    } catch (error: unknown) {
      logger.error(`Cache EXPIRE failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error: unknown) {
      logger.error(`Cache TTL failed for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  static async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await redisClient.incr(key);
      if (ttl && value === 1) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error: unknown) {
      logger.error(`Cache INCR failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a counter
   */
  static async decr(key: string): Promise<number> {
    try {
      return await redisClient.decr(key);
    } catch (error: unknown) {
      logger.error(`Cache DECR failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   */
  static async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await redisClient.mget(...keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error: unknown) {
      logger.error(`Cache MGET failed for keys ${keys.join(", ")}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  static async mset(
    keyValues: Record<string, any>,
    ttl?: number,
  ): Promise<void> {
    try {
      const serializedKeyValues: string[] = [];
      Object.entries(keyValues).forEach(([key, value]) => {
        serializedKeyValues.push(key, JSON.stringify(value));
      });

      await redisClient.mset(...serializedKeyValues);

      // Set TTL for all keys if specified
      if (ttl) {
        const pipeline = redisClient.pipeline();
        Object.keys(keyValues).forEach((key) => {
          pipeline.expire(key, ttl);
        });
        await pipeline.exec();
      }
    } catch (error: unknown) {
      logger.error(`Cache MSET failed:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache with pattern
   */
  static async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await redisClient.del(...keys);
      logger.info(`Cache cleared ${result} keys matching pattern: ${pattern}`);
      return result;
    } catch (error: unknown) {
      logger.error(`Cache clear pattern failed for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Add item to a list
   */
  static async lpush(key: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await redisClient.lpush(key, serializedValue);
    } catch (error: unknown) {
      logger.error(`Cache LPUSH failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get items from a list
   */
  static async lrange<T = any>(
    key: string,
    start: number = 0,
    stop: number = -1,
  ): Promise<T[]> {
    try {
      const values = await redisClient.lrange(key, start, stop);
      return values.map((value) => JSON.parse(value));
    } catch (error: unknown) {
      logger.error(`Cache LRANGE failed for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Add item to a set
   */
  static async sadd(key: string, ...values: any[]): Promise<number> {
    try {
      const serializedValues = values.map((value) => JSON.stringify(value));
      return await redisClient.sadd(key, ...serializedValues);
    } catch (error: unknown) {
      logger.error(`Cache SADD failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a set
   */
  static async smembers<T = any>(key: string): Promise<T[]> {
    try {
      const values = await redisClient.smembers(key);
      return values.map((value) => JSON.parse(value));
    } catch (error: unknown) {
      logger.error(`Cache SMEMBERS failed for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  static async sismember<T extends CacheableValue>(key: string, value: T): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await redisClient.sismember(key, serializedValue);
      return result === 1;
    } catch (error: unknown) {
      logger.error(`Cache SISMEMBER failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * =============================================================================
   * PERFORMANCE MONITORING AND OPTIMIZATION METHODS
   * =============================================================================
   */

  /**
   * Update average response time with exponential moving average
   */
  private static updateAverageResponseTime(responseTime: number): void {
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageResponseTime = 
      this.metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  /**
   * Get current cache performance metrics
   */
  static getPerformanceMetrics(): CacheMetrics & { hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      hitRate,
    };
  }

  /**
   * Reset performance metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      averageResponseTime: 0,
      lastResetTime: new Date(),
    };
  }

  /**
   * Get Redis connection pool performance status
   */
  static async getConnectionPoolStatus(): Promise<RedisPerformanceMetrics> {
    try {
      const info = await redisClient.info();
      const connectedClients = parseInt(
        info.split('\n').find(line => line.startsWith('connected_clients:'))?.split(':')[1] || '0'
      );
      
      const commandsProcessed = parseInt(
        info.split('\n').find(line => line.startsWith('total_commands_processed:'))?.split(':')[1] || '0'
      );
      
      const usedMemory = parseInt(
        info.split('\n').find(line => line.startsWith('used_memory:'))?.split(':')[1] || '0'
      );

      const { hitRate } = this.getPerformanceMetrics();

      return {
        connectionCount: connectedClients,
        commandsProcessed,
        memoryUsage: usedMemory,
        cacheHitRate: hitRate,
        averageResponseTime: this.metrics.averageResponseTime,
        errorRate: this.metrics.errors / (this.metrics.sets + this.metrics.hits + this.metrics.misses) * 100,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to get Redis performance metrics:', error);
      throw error;
    }
  }
}

/**
 * =============================================================================
 * PERFORMANCE-OPTIMIZED SESSION SERVICE WITH STRICT TYPING
 * =============================================================================
 */

export interface SessionData {
  userId: string;
  email?: string;
  role: string;
  organizationId?: string;
  permissions: string[];
  lastActivity: Date;
  deviceFingerprint?: string;
  ipAddress?: string;
}

export interface SessionOptions {
  ttl?: number;
  updateLastActivity?: boolean;
  enableMetrics?: boolean;
}

export class SessionService {
  private static sessionMetrics = {
    activeSessions: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    lastUpdate: new Date(),
  };

  /**
   * Set session data with strict typing and performance tracking
   */
  static async setSession(
    sessionId: string,
    data: SessionData,
    options: SessionOptions = {},
  ): Promise<void> {
    const { ttl = 86400, updateLastActivity = true, enableMetrics = true } = options;
    try {
      const sessionData = updateLastActivity ? 
        { ...data, lastActivity: new Date() } : data;
      
      const serializedData = JSON.stringify(sessionData);
      await sessionRedisClient.setex(sessionId, ttl, serializedData);
      
      if (enableMetrics) {
        this.sessionMetrics.totalSessions++;
        this.sessionMetrics.lastUpdate = new Date();
      }
      
      logger.debug(`Session SET: ${sessionId}`);
    } catch (error: unknown) {
      logger.error(`Session SET failed for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session data with strict typing
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await sessionRedisClient.get(sessionId);
      if (!data) return null;

      const sessionData = JSON.parse(data) as SessionData;
      
      // Ensure lastActivity is converted back to Date object
      if (sessionData.lastActivity) {
        sessionData.lastActivity = new Date(sessionData.lastActivity);
      }
      
      return sessionData;
    } catch (error: unknown) {
      logger.error(`Session GET failed for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const result = await sessionRedisClient.del(sessionId);
      logger.debug(`Session DEL: ${sessionId}`);
      return result > 0;
    } catch (error: unknown) {
      logger.error(`Session DEL failed for ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Refresh session expiry
   */
  static async refreshSession(
    sessionId: string,
    ttl: number = 86400,
  ): Promise<boolean> {
    try {
      const result = await sessionRedisClient.expire(sessionId, ttl);
      return result === 1;
    } catch (error: unknown) {
      logger.error(`Session REFRESH failed for ${sessionId}:`, error);
      return false;
    }
  }
}

/**
 * Rate limiting utility functions
 */
export class RateLimitService {
  /**
   * Check and increment rate limit counter
   */
  static async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const key = `rate_limit:${identifier}`;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;

      const current = await redisClient.incr(windowKey);

      if (current === 1) {
        await redisClient.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      const remaining = Math.max(0, maxRequests - current);
      const resetTime = windowStart + windowMs;

      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime,
      };
    } catch (error: unknown) {
      logger.error(`Rate limit check failed for ${identifier}:`, error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + windowMs,
      };
    }
  }
}

/**
 * Close all Redis connections gracefully
 */
export const closeRedisConnections = async (): Promise<void> => {
  logger.info("🔄 Closing Redis connections...");

  const closePromises = [
    redisClient.quit(),
    sessionRedisClient.quit(),
    queueRedisClient.quit(),
  ];

  try {
    await Promise.allSettled(closePromises);
    logger.info("✅ All Redis connections closed");
  } catch (error: unknown) {
    logger.error("❌ Error closing Redis connections:", error);
  }
};

// Export Redis clients and utilities
export default redisClient;
