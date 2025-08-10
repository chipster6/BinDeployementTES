/**
 * Redis Configuration and Connection
 * Redis setup for caching, session storage, and background job queuing
 */

import Redis from 'ioredis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Redis connection options
 */
const redisOptions: Redis.RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.prefix,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
  maxLoadingTimeout: 5000,
  enableAutoPipelining: true,
  // Connection pool settings
  family: 4,
  keepAlive: true,
  // Reconnection settings
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
};

/**
 * Create Redis connection instance
 */
export const redis = new Redis(config.redis.url, redisOptions);

/**
 * Create separate Redis instance for background jobs
 */
export const jobsRedis = new Redis(config.backgroundJobs.redisUrl, {
  ...redisOptions,
  keyPrefix: `${config.redis.prefix}jobs:`,
  db: 1, // Use different database for jobs
});

/**
 * Create separate Redis instance for pub/sub
 */
export const pubSubRedis = new Redis(config.redis.url, {
  ...redisOptions,
  keyPrefix: `${config.redis.prefix}pubsub:`,
  db: 2, // Use different database for pub/sub
});

/**
 * Redis utility functions and cache management
 */
export class RedisUtils {
  /**
   * Test Redis connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis connection test failed:', error, { component: 'redis' });
      return false;
    }
  }

  /**
   * Get Redis health information
   */
  static async getHealthInfo(): Promise<{
    status: 'healthy' | 'unhealthy';
    memory: string;
    uptime: number;
    connectedClients: number;
    version: string;
  }> {
    try {
      const info = await redis.info('memory');
      const serverInfo = await redis.info('server');
      const clientInfo = await redis.info('clients');

      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Parse uptime
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

      // Parse connected clients
      const clientsMatch = clientInfo.match(/connected_clients:(\d+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;

      // Parse version
      const versionMatch = serverInfo.match(/redis_version:(.+)/);
      const version = versionMatch ? versionMatch[1].trim() : 'unknown';

      return {
        status: 'healthy',
        memory,
        uptime,
        connectedClients,
        version,
      };
    } catch (error) {
      logger.error('Failed to get Redis health info:', error, { component: 'redis' });
      return {
        status: 'unhealthy',
        memory: 'unknown',
        uptime: 0,
        connectedClients: 0,
        version: 'unknown',
      };
    }
  }

  /**
   * Cache data with TTL
   */
  static async set(
    key: string, 
    value: any, 
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serializedValue);
      } else {
        await redis.set(key, serializedValue);
      }
      
      logger.debug('Cache set', { key, ttl: ttlSeconds, component: 'redis' });
    } catch (error) {
      logger.error('Cache set failed:', error, { key, component: 'redis' });
      throw error;
    }
  }

  /**
   * Get cached data
   */
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      
      if (!value) {
        logger.debug('Cache miss', { key, component: 'redis' });
        return null;
      }

      logger.debug('Cache hit', { key, component: 'redis' });
      
      try {
        return JSON.parse(value);
      } catch {
        // Return as string if not valid JSON
        return value as T;
      }
    } catch (error) {
      logger.error('Cache get failed:', error, { key, component: 'redis' });
      return null;
    }
  }

  /**
   * Delete cached data
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.debug('Cache deleted', { key, component: 'redis' });
    } catch (error) {
      logger.error('Cache delete failed:', error, { key, component: 'redis' });
      throw error;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await redis.del(...keys);
      logger.debug('Cache pattern deleted', { pattern, count: deletedCount, component: 'redis' });
      return deletedCount;
    } catch (error) {
      logger.error('Cache pattern delete failed:', error, { pattern, component: 'redis' });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists check failed:', error, { key, component: 'redis' });
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  static async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redis.expire(key, ttlSeconds);
      logger.debug('Cache TTL set', { key, ttl: ttlSeconds, component: 'redis' });
    } catch (error) {
      logger.error('Cache expire failed:', error, { key, ttl: ttlSeconds, component: 'redis' });
      throw error;
    }
  }

  /**
   * Increment counter
   */
  static async incr(key: string): Promise<number> {
    try {
      const result = await redis.incr(key);
      logger.debug('Counter incremented', { key, value: result, component: 'redis' });
      return result;
    } catch (error) {
      logger.error('Counter increment failed:', error, { key, component: 'redis' });
      throw error;
    }
  }

  /**
   * Decrement counter
   */
  static async decr(key: string): Promise<number> {
    try {
      const result = await redis.decr(key);
      logger.debug('Counter decremented', { key, value: result, component: 'redis' });
      return result;
    } catch (error) {
      logger.error('Counter decrement failed:', error, { key, component: 'redis' });
      throw error;
    }
  }

  /**
   * Add to set
   */
  static async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await redis.sadd(key, ...members);
      logger.debug('Set members added', { key, members, added: result, component: 'redis' });
      return result;
    } catch (error) {
      logger.error('Set add failed:', error, { key, members, component: 'redis' });
      throw error;
    }
  }

  /**
   * Remove from set
   */
  static async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await redis.srem(key, ...members);
      logger.debug('Set members removed', { key, members, removed: result, component: 'redis' });
      return result;
    } catch (error) {
      logger.error('Set remove failed:', error, { key, members, component: 'redis' });
      throw error;
    }
  }

  /**
   * Get all set members
   */
  static async smembers(key: string): Promise<string[]> {
    try {
      const result = await redis.smembers(key);
      logger.debug('Set members retrieved', { key, count: result.length, component: 'redis' });
      return result;
    } catch (error) {
      logger.error('Set members get failed:', error, { key, component: 'redis' });
      throw error;
    }
  }

  /**
   * Check if member is in set
   */
  static async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error('Set membership check failed:', error, { key, member, component: 'redis' });
      return false;
    }
  }

  /**
   * Hash operations - set field
   */
  static async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.hset(key, field, serializedValue);
      logger.debug('Hash field set', { key, field, component: 'redis' });
    } catch (error) {
      logger.error('Hash set failed:', error, { key, field, component: 'redis' });
      throw error;
    }
  }

  /**
   * Hash operations - get field
   */
  static async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await redis.hget(key, field);
      
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Hash get failed:', error, { key, field, component: 'redis' });
      return null;
    }
  }

  /**
   * Hash operations - get all fields
   */
  static async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    try {
      const result = await redis.hgetall(key);
      
      if (!result || Object.keys(result).length === 0) {
        return null;
      }

      // Parse JSON values
      const parsed: any = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }

      return parsed as T;
    } catch (error) {
      logger.error('Hash getall failed:', error, { key, component: 'redis' });
      return null;
    }
  }

  /**
   * Publish message to channel
   */
  static async publish(channel: string, message: any): Promise<void> {
    try {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      await pubSubRedis.publish(channel, serializedMessage);
      logger.debug('Message published', { channel, component: 'redis' });
    } catch (error) {
      logger.error('Publish failed:', error, { channel, component: 'redis' });
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  static async subscribe(
    channel: string, 
    callback: (channel: string, message: any) => void
  ): Promise<void> {
    try {
      await pubSubRedis.subscribe(channel);
      
      pubSubRedis.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(receivedChannel, parsedMessage);
          } catch {
            callback(receivedChannel, message);
          }
        }
      });

      logger.debug('Subscribed to channel', { channel, component: 'redis' });
    } catch (error) {
      logger.error('Subscribe failed:', error, { channel, component: 'redis' });
      throw error;
    }
  }

  /**
   * Clear all cache data (use with caution!)
   */
  static async flushdb(): Promise<void> {
    try {
      await redis.flushdb();
      logger.warn('Redis database flushed', { component: 'redis' });
    } catch (error) {
      logger.error('Redis flush failed:', error, { component: 'redis' });
      throw error;
    }
  }
}

// Set up connection event listeners
redis.on('connect', () => {
  logger.info('Redis connection established', { component: 'redis' });
});

redis.on('ready', () => {
  logger.info('Redis connection ready', { component: 'redis' });
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error, { component: 'redis' });
});

redis.on('close', () => {
  logger.warn('Redis connection closed', { component: 'redis' });
});

redis.on('reconnecting', (ms) => {
  logger.info('Redis reconnecting', { delay: ms, component: 'redis' });
});

// Test connection on startup
RedisUtils.testConnection().then(isConnected => {
  if (isConnected) {
    logger.info('Redis connection test successful', { component: 'redis' });
  } else {
    logger.error('Redis connection test failed', { component: 'redis' });
  }
}).catch(error => {
  logger.error('Redis connection test error:', error, { component: 'redis' });
});

export default redis;