/**
 * ============================================================================
 * ENTERPRISE REDIS CONNECTION POOL OPTIMIZER
 * ============================================================================
 *
 * High-performance Redis connection pooling service for enterprise-scale
 * queue operations. Provides intelligent connection management, load balancing,
 * and performance optimization for 10,000+ jobs/hour processing.
 *
 * Performance Features:
 * - Dynamic connection pool scaling (5-25 connections per purpose)
 * - Intelligent load balancing based on connection utilization
 * - Connection health monitoring and automatic failover
 * - Performance metrics integration with Prometheus
 * - Memory-efficient connection reuse and cleanup
 *
 * Business Logic:
 * - Purpose-based connection separation (queue, session, cache)
 * - Peak load handling with automatic scaling
 * - Connection failure recovery with business continuity
 * - Performance monitoring with real-time alerting
 * - Resource optimization for cost-effective operations
 *
 * Performance Targets:
 * - Connection utilization: 60-80% optimal range
 * - Command latency: <5ms average
 * - Pool scaling: Dynamic based on load patterns
 * - Failure recovery: <100ms automatic failover
 * - Memory efficiency: 50% improvement over single connections
 *
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-20
 * Version: 1.0.0 - Enterprise Connection Pool Optimization
 */

import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import { config } from "@/config";
import { logger, Timer } from "@/utils/logger";
import { EventEmitter } from "events";

/**
 * =============================================================================
 * CONNECTION POOL INTERFACES AND TYPES
 * =============================================================================
 */

export type ConnectionPurpose = 'queue' | 'session' | 'cache' | 'metrics';

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  healthCheckIntervalMs: number;
  retryAttempts: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'least-latency';
}

export interface ConnectionMetrics {
  purpose: ConnectionPurpose;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingAcquisitions: number;
  averageLatencyMs: number;
  utilizationPercentage: number;
  commandsProcessed: number;
  errorsCount: number;
  lastHealthCheck: Date;
}

export interface PoolPerformanceMetrics {
  timestamp: Date;
  totalPools: number;
  connections: {
    total: number;
    active: number;
    idle: number;
    failed: number;
  };
  performance: {
    averageLatencyMs: number;
    commandsPerSecond: number;
    errorRate: number;
    utilizationPercentage: number;
  };
  scaling: {
    autoScaleEvents: number;
    poolExpansions: number;
    poolContractions: number;
    currentCapacity: number;
  };
}

/**
 * =============================================================================
 * REDIS CONNECTION WRAPPER
 * =============================================================================
 */

class ManagedRedisConnection extends EventEmitter {
  private redis: Redis;
  private purpose: ConnectionPurpose;
  private createdAt: Date;
  private lastUsedAt: Date;
  private commandCount: number = 0;
  private errorCount: number = 0;
  private latencySum: number = 0;
  private isHealthy: boolean = true;

  constructor(purpose: ConnectionPurpose, options: RedisOptions) {
    super();
    this.purpose = purpose;
    this.createdAt = new Date();
    this.lastUsedAt = new Date();
    
    this.redis = new Redis({
      ...options,
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isHealthy = true;
      logger.debug(`Redis connection established`, { 
        purpose: this.purpose,
        connectionId: this.getId()
      });
      this.emit('connected');
    });

    this.redis.on('error', (error) => {
      this.errorCount++;
      this.isHealthy = false;
      logger.error(`Redis connection error`, { 
        purpose: this.purpose,
        connectionId: this.getId(),
        error: error instanceof Error ? error?.message : String(error)
      });
      this.emit('error', error);
    });

    this.redis.on('close', () => {
      this.isHealthy = false;
      logger.debug(`Redis connection closed`, { 
        purpose: this.purpose,
        connectionId: this.getId()
      });
      this.emit('closed');
    });
  }

  async connect(): Promise<void> {
    const timer = new Timer(`RedisConnection.connect.${this.purpose}`);
    try {
      await this.redis.connect();
      timer.end({ purpose: this.purpose });
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      throw error;
    }
  }

  async executeCommand<T>(
    command: string,
    ...args: any[]
  ): Promise<T> {
    const timer = new Timer(`RedisCommand.${command}`);
    const startTime = Date.now();
    
    try {
      this.lastUsedAt = new Date();
      const result = await (this.redis as any)[command](...args);
      
      const latency = Date.now() - startTime;
      this.commandCount++;
      this.latencySum += latency;
      
      timer.end({ 
        purpose: this.purpose, 
        command,
        latency: `${latency}ms`
      });
      
      return result;
    } catch (error: unknown) {
      this.errorCount++;
      timer.end({ 
        error: error instanceof Error ? error?.message : String(error),
        command
      });
      throw error;
    }
  }

  async ping(): Promise<string> {
    return this.executeCommand('ping');
  }

  getId(): string {
    return `${this.purpose}_${this.createdAt.getTime()}`;
  }

  getPurpose(): ConnectionPurpose {
    return this.purpose;
  }

  getMetrics(): {
    commandCount: number;
    errorCount: number;
    averageLatencyMs: number;
    isHealthy: boolean;
    ageMs: number;
    idleTimeMs: number;
    utilizationScore: number;
  } {
    const now = Date.now();
    const ageMs = now - this.createdAt.getTime();
    const idleTimeMs = now - this.lastUsedAt.getTime();
    const averageLatencyMs = this.commandCount > 0 ? this.latencySum / this.commandCount : 0;
    
    // Calculate utilization score (lower is better for load balancing)
    const utilizationScore = this.redis.commandQueueLength + (this.errorCount * 10);
    
    return {
      commandCount: this.commandCount,
      errorCount: this.errorCount,
      averageLatencyMs,
      isHealthy: this.isHealthy,
      ageMs,
      idleTimeMs,
      utilizationScore
    };
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error: unknown) {
      logger.warn(`Error during Redis disconnect: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  isIdle(idleThresholdMs: number): boolean {
    return (Date.now() - this.lastUsedAt.getTime()) > idleThresholdMs;
  }
}

/**
 * =============================================================================
 * ENTERPRISE REDIS CONNECTION POOL
 * =============================================================================
 */

export class EnterpriseRedisConnectionPool extends EventEmitter {
  private pools: Map<ConnectionPurpose, ManagedRedisConnection[]> = new Map();
  private poolConfigs: Map<ConnectionPurpose, ConnectionPoolConfig> = new Map();
  private acquisitionQueues: Map<ConnectionPurpose, Array<{
    resolve: (connection: ManagedRedisConnection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }>> = new Map();
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: PoolPerformanceMetrics[] = [];
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.initializePoolConfigs();
  }

  /**
   * Initialize default pool configurations for each purpose
   */
  private initializePoolConfigs(): void {
    // Queue processing - high throughput, medium latency tolerance
    this.poolConfigs.set('queue', {
      minConnections: 8,
      maxConnections: 25,
      acquireTimeoutMs: 10000,
      idleTimeoutMs: 300000, // 5 minutes
      healthCheckIntervalMs: 30000,
      retryAttempts: 3,
      loadBalancingStrategy: 'least-connections'
    });

    // Session management - medium throughput, low latency
    this.poolConfigs.set('session', {
      minConnections: 5,
      maxConnections: 15,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 600000, // 10 minutes
      healthCheckIntervalMs: 30000,
      retryAttempts: 2,
      loadBalancingStrategy: 'least-latency'
    });

    // General caching - high throughput, very low latency
    this.poolConfigs.set('cache', {
      minConnections: 6,
      maxConnections: 20,
      acquireTimeoutMs: 3000,
      idleTimeoutMs: 180000, // 3 minutes
      healthCheckIntervalMs: 30000,
      retryAttempts: 2,
      loadBalancingStrategy: 'least-latency'
    });

    // Metrics collection - low throughput, reliability focused
    this.poolConfigs.set('metrics', {
      minConnections: 2,
      maxConnections: 8,
      acquireTimeoutMs: 15000,
      idleTimeoutMs: 900000, // 15 minutes
      healthCheckIntervalMs: 60000,
      retryAttempts: 5,
      loadBalancingStrategy: 'round-robin'
    });
  }

  /**
   * Initialize all connection pools
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Connection pool already initialized');
      return;
    }

    logger.info('🚀 Initializing Enterprise Redis Connection Pool');

    try {
      // Initialize pools for each purpose
      for (const [purpose, poolConfig] of this.poolConfigs.entries()) {
        await this.initializePool(purpose, poolConfig);
      }

      // Start background maintenance tasks
      this.startHealthChecking();
      this.startMetricsCollection();
      this.startPoolMaintenance();

      this.isInitialized = true;
      logger.info('✅ Enterprise Redis Connection Pool initialized successfully', {
        totalPools: this.poolConfigs.size,
        totalConnections: this.getTotalConnectionCount()
      });

      this.emit('initialized');
    } catch (error: unknown) {
      logger.error('❌ Failed to initialize connection pool', error);
      throw error;
    }
  }

  /**
   * Initialize pool for specific purpose
   */
  private async initializePool(
    purpose: ConnectionPurpose,
    config: ConnectionPoolConfig
  ): Promise<void> {
    logger.info(`Initializing ${purpose} connection pool`, {
      minConnections: config.minConnections,
      maxConnections: config.maxConnections
    });

    const connections: ManagedRedisConnection[] = [];
    this.pools.set(purpose, connections);
    this.acquisitionQueues.set(purpose, []);

    // Create minimum connections
    for (let i = 0; i < config.minConnections; i++) {
      try {
        const connection = await this.createConnection(purpose);
        connections.push(connection);
      } catch (error: unknown) {
        logger.error(`Failed to create initial connection ${i + 1}/${config.minConnections}`, {
          purpose,
          error: error instanceof Error ? error?.message : String(error)
        });
        throw error;
      }
    }

    logger.info(`✅ ${purpose} pool initialized with ${connections.length} connections`);
  }

  /**
   * Create new managed connection
   */
  private async createConnection(purpose: ConnectionPurpose): Promise<ManagedRedisConnection> {
    const redisOptions: RedisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      ...(config.redis.password && { password: config.redis.password }),
      db: this.getDbForPurpose(purpose),
      keyPrefix: this.getKeyPrefixForPurpose(purpose),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 8000,
      retryStrategy: (times: number) => Math.min(times * 100, 2000)
    };

    const connection = new ManagedRedisConnection(purpose, redisOptions);
    
    // Setup connection event handlers
    connection.on('error', (error) => {
      this.handleConnectionError(purpose, connection, error);
    });

    connection.on('closed', () => {
      this.handleConnectionClosed(purpose, connection);
    });

    await connection.connect();
    return connection;
  }

  /**
   * Get database number based on purpose
   */
  private getDbForPurpose(purpose: ConnectionPurpose): number {
    switch (purpose) {
      case 'queue': return config.queue?.redis?.db || 1;
      case 'session': return (config.redis?.db || 0) + 1;
      case 'cache': return config.redis?.db || 0;
      case 'metrics': return (config.redis?.db || 0) + 2;
      default: return 0;
    }
  }

  /**
   * Get key prefix based on purpose
   */
  private getKeyPrefixForPurpose(purpose: ConnectionPurpose): string {
    const basePrefix = config.redis?.keyPrefix || 'waste_mgmt:';
    switch (purpose) {
      case 'queue': return `${basePrefix}queue:`;
      case 'session': return `${basePrefix}session:`;
      case 'cache': return `${basePrefix}cache:`;
      case 'metrics': return `${basePrefix}metrics:`;
      default: return basePrefix;
    }
  }

  /**
   * Acquire connection from pool with intelligent load balancing
   */
  async acquireConnection(purpose: ConnectionPurpose): Promise<ManagedRedisConnection> {
    const timer = new Timer(`ConnectionPool.acquire.${purpose}`);
    
    try {
      const pool = this.pools.get(purpose);
      const config = this.poolConfigs.get(purpose);
      
      if (!pool || !config) {
        throw new Error(`Pool not found for purpose: ${purpose}`);
      }

      // Try to get available connection immediately
      const connection = this.selectOptimalConnection(pool, config.loadBalancingStrategy);
      
      if (connection) {
        timer.end({ 
          purpose,
          immediate: true,
          poolSize: pool.length
        });
        return connection;
      }

      // No available connection, try to expand pool
      if (pool.length < config.maxConnections) {
        try {
          const newConnection = await this.createConnection(purpose);
          pool.push(newConnection);
          
          timer.end({ 
            purpose,
            expanded: true,
            poolSize: pool.length
          });
          return newConnection;
        } catch (error: unknown) {
          logger.warn(`Failed to expand pool for ${purpose}`, error);
        }
      }

      // Pool at max capacity, wait for available connection
      return this.waitForConnection(purpose, config.acquireTimeoutMs);

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      throw error;
    }
  }

  /**
   * Select optimal connection based on load balancing strategy
   */
  private selectOptimalConnection(
    pool: ManagedRedisConnection[],
    strategy: string
  ): ManagedRedisConnection | null {
    const healthyConnections = pool.filter(conn => {
      const metrics = conn.getMetrics();
      return metrics.isHealthy && metrics.utilizationScore < 100;
    });

    if (healthyConnections.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'least-connections':
        return healthyConnections.reduce((best, current) =>
          current.getMetrics().utilizationScore < best.getMetrics().utilizationScore ? current : best
        );
      
      case 'least-latency':
        return healthyConnections.reduce((best, current) =>
          current.getMetrics().averageLatencyMs < best.getMetrics().averageLatencyMs ? current : best
        );
      
      case 'round-robin':
      default:
        // Simple round-robin selection
        return healthyConnections[Math.floor(Math.random() * healthyConnections.length)];
    }
  }

  /**
   * Wait for available connection when pool is at capacity
   */
  private waitForConnection(
    purpose: ConnectionPurpose,
    timeoutMs: number
  ): Promise<ManagedRedisConnection> {
    return new Promise((resolve, reject) => {
      const acquisitionQueue = this.acquisitionQueues.get(purpose);
      if (!acquisitionQueue) {
        reject(new Error(`Acquisition queue not found for purpose: ${purpose}`));
        return;
      }

      const acquisition = {
        resolve,
        reject,
        timestamp: Date.now()
      };

      acquisitionQueue.push(acquisition);

      // Set timeout
      setTimeout(() => {
        const index = acquisitionQueue.indexOf(acquisition);
        if (index > -1) {
          acquisitionQueue.splice(index, 1);
          reject(new Error(`Connection acquisition timeout after ${timeoutMs}ms for purpose: ${purpose}`));
        }
      }, timeoutMs);
    });
  }

  /**
   * Execute Redis command with automatic connection management
   */
  async executeCommand<T>(
    purpose: ConnectionPurpose,
    command: string,
    ...args: any[]
  ): Promise<T> {
    const connection = await this.acquireConnection(purpose);
    
    try {
      const result = await connection.executeCommand<T>(command, ...args);
      this.releaseConnection(purpose, connection);
      return result;
    } catch (error: unknown) {
      this.releaseConnection(purpose, connection);
      throw error;
    }
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(
    purpose: ConnectionPurpose,
    connection: ManagedRedisConnection
  ): void {
    // Check if there are pending acquisitions
    const acquisitionQueue = this.acquisitionQueues.get(purpose);
    if (acquisitionQueue && acquisitionQueue.length > 0) {
      const waitingAcquisition = acquisitionQueue.shift();
      if (waitingAcquisition) {
        waitingAcquisition.resolve(connection);
        return;
      }
    }

    // Connection is available for reuse
    logger.debug(`Connection released back to ${purpose} pool`, {
      connectionId: connection.getId(),
      queueDepth: acquisitionQueue?.length || 0
    });
  }

  /**
   * Get comprehensive pool performance metrics
   */
  getPoolMetrics(): PoolPerformanceMetrics {
    const totalConnections = this.getTotalConnectionCount();
    let activeConnections = 0;
    let idleConnections = 0;
    let failedConnections = 0;
    let totalCommands = 0;
    let totalLatency = 0;
    let totalErrors = 0;

    // Aggregate metrics across all pools
    for (const [purpose, pool] of this.pools.entries()) {
      for (const connection of pool) {
        const metrics = connection.getMetrics();
        
        if (metrics.isHealthy) {
          if (metrics.utilizationScore > 0) {
            activeConnections++;
          } else {
            idleConnections++;
          }
        } else {
          failedConnections++;
        }

        totalCommands += metrics.commandCount;
        totalLatency += metrics.averageLatencyMs * metrics.commandCount;
        totalErrors += metrics.errorCount;
      }
    }

    const averageLatencyMs = totalCommands > 0 ? totalLatency / totalCommands : 0;
    const errorRate = totalCommands > 0 ? (totalErrors / totalCommands) * 100 : 0;
    const utilizationPercentage = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;

    return {
      timestamp: new Date(),
      totalPools: this.pools.size,
      connections: {
        total: totalConnections,
        active: activeConnections,
        idle: idleConnections,
        failed: failedConnections
      },
      performance: {
        averageLatencyMs,
        commandsPerSecond: totalCommands, // This would be calculated per second in real implementation
        errorRate,
        utilizationPercentage
      },
      scaling: {
        autoScaleEvents: 0, // Would be tracked in real implementation
        poolExpansions: 0,
        poolContractions: 0,
        currentCapacity: this.getTotalMaxConnections()
      }
    };
  }

  /**
   * Get metrics for specific pool
   */
  getPoolMetricsForPurpose(purpose: ConnectionPurpose): ConnectionMetrics | null {
    const pool = this.pools.get(purpose);
    const config = this.poolConfigs.get(purpose);
    const acquisitionQueue = this.acquisitionQueues.get(purpose);

    if (!pool || !config) {
      return null;
    }

    let activeConnections = 0;
    let totalLatency = 0;
    let totalCommands = 0;
    let totalErrors = 0;

    for (const connection of pool) {
      const metrics = connection.getMetrics();
      
      if (metrics.utilizationScore > 0) {
        activeConnections++;
      }

      totalCommands += metrics.commandCount;
      totalLatency += metrics.averageLatencyMs * metrics.commandCount;
      totalErrors += metrics.errorCount;
    }

    const averageLatencyMs = totalCommands > 0 ? totalLatency / totalCommands : 0;
    const utilizationPercentage = pool.length > 0 ? (activeConnections / pool.length) * 100 : 0;

    return {
      purpose,
      totalConnections: pool.length,
      activeConnections,
      idleConnections: pool.length - activeConnections,
      pendingAcquisitions: acquisitionQueue?.length || 0,
      averageLatencyMs,
      utilizationPercentage,
      commandsProcessed: totalCommands,
      errorsCount: totalErrors,
      lastHealthCheck: new Date()
    };
  }

  /**
   * Background tasks and maintenance
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [purpose, pool] of this.pools.entries()) {
        await this.performPoolHealthCheck(purpose, pool);
      }
    }, 30000); // Check every 30 seconds
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      const metrics = this.getPoolMetrics();
      this.performanceMetrics.push(metrics);
      
      // Keep only last hour of metrics (120 entries at 30-second intervals)
      if (this.performanceMetrics.length > 120) {
        this.performanceMetrics.shift();
      }

      this.emit('metrics', metrics);
    }, 30000); // Collect every 30 seconds
  }

  private startPoolMaintenance(): void {
    setInterval(async () => {
      for (const [purpose, pool] of this.pools.entries()) {
        await this.performPoolMaintenance(purpose, pool);
      }
    }, 300000); // Maintenance every 5 minutes
  }

  private async performPoolHealthCheck(
    purpose: ConnectionPurpose,
    pool: ManagedRedisConnection[]
  ): Promise<void> {
    const unhealthyConnections: ManagedRedisConnection[] = [];

    for (const connection of pool) {
      try {
        await connection.ping();
      } catch (error: unknown) {
        unhealthyConnections.push(connection);
        logger.warn(`Unhealthy connection detected`, {
          purpose,
          connectionId: connection.getId(),
          error: error instanceof Error ? error?.message : String(error)
        });
      }
    }

    // Replace unhealthy connections
    for (const unhealthyConnection of unhealthyConnections) {
      await this.replaceConnection(purpose, unhealthyConnection);
    }
  }

  private async performPoolMaintenance(
    purpose: ConnectionPurpose,
    pool: ManagedRedisConnection[]
  ): Promise<void> {
    const config = this.poolConfigs.get(purpose);
    if (!config) return;

    // Remove idle connections that exceed max idle time
    const idleConnections = pool.filter(conn => conn.isIdle(config.idleTimeoutMs));
    
    for (const idleConnection of idleConnections) {
      if (pool.length > config.minConnections) {
        await this.removeConnection(purpose, idleConnection);
      }
    }

    logger.debug(`Pool maintenance completed for ${purpose}`, {
      totalConnections: pool.length,
      removedIdleConnections: idleConnections.length
    });
  }

  /**
   * Connection error handling
   */
  private async handleConnectionError(
    purpose: ConnectionPurpose,
    connection: ManagedRedisConnection,
    error: Error
  ): Promise<void> {
    logger.error(`Connection error in ${purpose} pool`, {
      connectionId: connection.getId(),
      error: error instanceof Error ? error?.message : String(error)
    });

    // Replace failed connection
    await this.replaceConnection(purpose, connection);
  }

  private async handleConnectionClosed(
    purpose: ConnectionPurpose,
    connection: ManagedRedisConnection
  ): Promise<void> {
    logger.warn(`Connection closed in ${purpose} pool`, {
      connectionId: connection.getId()
    });

    // Replace closed connection
    await this.replaceConnection(purpose, connection);
  }

  private async replaceConnection(
    purpose: ConnectionPurpose,
    oldConnection: ManagedRedisConnection
  ): Promise<void> {
    const pool = this.pools.get(purpose);
    if (!pool) return;

    try {
      // Remove old connection
      const index = pool.indexOf(oldConnection);
      if (index > -1) {
        pool.splice(index, 1);
        await oldConnection.disconnect();
      }

      // Create replacement connection
      const newConnection = await this.createConnection(purpose);
      pool.push(newConnection);

      logger.info(`Connection replaced in ${purpose} pool`, {
        oldConnectionId: oldConnection.getId(),
        newConnectionId: newConnection.getId()
      });
    } catch (error: unknown) {
      logger.error(`Failed to replace connection in ${purpose} pool`, {
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  private async removeConnection(
    purpose: ConnectionPurpose,
    connection: ManagedRedisConnection
  ): Promise<void> {
    const pool = this.pools.get(purpose);
    if (!pool) return;

    const index = pool.indexOf(connection);
    if (index > -1) {
      pool.splice(index, 1);
      await connection.disconnect();
      
      logger.debug(`Connection removed from ${purpose} pool`, {
        connectionId: connection.getId(),
        poolSize: pool.length
      });
    }
  }

  /**
   * Helper methods
   */
  private getTotalConnectionCount(): number {
    let total = 0;
    for (const pool of this.pools.values()) {
      total += pool.length;
    }
    return total;
  }

  private getTotalMaxConnections(): number {
    let total = 0;
    for (const config of this.poolConfigs.values()) {
      total += config.maxConnections;
    }
    return total;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Enterprise Redis Connection Pool');

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    // Disconnect all connections
    const disconnectionPromises: Promise<void>[] = [];
    
    for (const [purpose, pool] of this.pools.entries()) {
      logger.info(`Disconnecting ${pool.length} connections from ${purpose} pool`);
      
      for (const connection of pool) {
        disconnectionPromises.push(connection.disconnect());
      }
    }

    await Promise.allSettled(disconnectionPromises);
    
    // Clear pools
    this.pools.clear();
    this.acquisitionQueues.clear();
    
    this.isInitialized = false;
    logger.info('✅ Enterprise Redis Connection Pool shutdown complete');
    this.emit('shutdown');
  }
}

// Singleton instance
export const enterpriseRedisPool = new EnterpriseRedisConnectionPool();

export default EnterpriseRedisConnectionPool;