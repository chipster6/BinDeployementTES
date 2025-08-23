/**
 * ============================================================================
 * CONNECTION POOL SCALING CONFIGURATION
 * ============================================================================
 *
 * Advanced connection pool optimization and scaling configuration for
 * production-grade database performance with MFA encryption workloads.
 *
 * MESH COORDINATION SESSION: COORD-PROD-FIXES-MESH-20250820-001
 * 
 * COORDINATION WITH:
 * - Performance-Optimization-Specialist: Pool scaling and optimization algorithms
 * - Security Agent: Encrypted authentication workload performance requirements  
 * - System-Architecture-Lead: Production architecture and scaling patterns
 *
 * Created by: Database-Architect (Mesh Coordination)
 * Enhanced for: MFA Encryption + Production Load Scaling
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { config } from "@/config";
import type { Options } from "sequelize";

/**
 * Connection Pool Configuration Tiers
 */
export enum ConnectionPoolTier {
  DEVELOPMENT = "development",
  STAGING = "staging", 
  PRODUCTION = "production",
  ENTERPRISE = "enterprise"
}

/**
 * Advanced connection pool configuration interface
 */
export interface AdvancedConnectionPoolConfig {
  // Basic pool settings
  min: number;
  max: number;
  idle: number;
  acquire: number;
  evict: number;
  
  // Advanced settings
  validate?: boolean;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  
  // Scaling configuration
  scaling: {
    enabled: boolean;
    targetUtilization: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    scaleUpStep: number;
    scaleDownStep: number;
    cooldownMs: number;
  };
  
  // Performance monitoring
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      highUtilization: number;
      longWaitTime: number;
      connectionErrors: number;
    };
    metrics: {
      collectIntervalMs: number;
      retentionDays: number;
    };
  };
  
  // Health check configuration
  healthCheck: {
    enabled: boolean;
    intervalMs: number;
    timeoutMs: number;
    retries: number;
  };
}

/**
 * Connection pool configurations by environment tier
 */
export const CONNECTION_POOL_CONFIGS: Record<ConnectionPoolTier, AdvancedConnectionPoolConfig> = {
  [ConnectionPoolTier.DEVELOPMENT]: {
    min: 5,
    max: 20,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
    
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 10000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    validate: true,
    
    scaling: {
      enabled: false,
      targetUtilization: 70,
      scaleUpThreshold: 80,
      scaleDownThreshold: 40,
      scaleUpStep: 5,
      scaleDownStep: 2,
      cooldownMs: 60000
    },
    
    monitoring: {
      enabled: true,
      alertThresholds: {
        highUtilization: 85,
        longWaitTime: 5000,
        connectionErrors: 5
      },
      metrics: {
        collectIntervalMs: 30000,
        retentionDays: 7
      }
    },
    
    healthCheck: {
      enabled: true,
      intervalMs: 30000,
      timeoutMs: 5000,
      retries: 3
    }
  },

  [ConnectionPoolTier.STAGING]: {
    min: 15,
    max: 50,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
    
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 10000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    validate: true,
    
    scaling: {
      enabled: true,
      targetUtilization: 65,
      scaleUpThreshold: 75,
      scaleDownThreshold: 35,
      scaleUpStep: 10,
      scaleDownStep: 5,
      cooldownMs: 120000
    },
    
    monitoring: {
      enabled: true,
      alertThresholds: {
        highUtilization: 80,
        longWaitTime: 3000,
        connectionErrors: 10
      },
      metrics: {
        collectIntervalMs: 15000,
        retentionDays: 14
      }
    },
    
    healthCheck: {
      enabled: true,
      intervalMs: 15000,
      timeoutMs: 3000,
      retries: 3
    }
  },

  [ConnectionPoolTier.PRODUCTION]: {
    min: 25,
    max: 120,
    idle: 30000,
    acquire: 60000,
    evict: 1000,
    
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 15000,
    destroyTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 500,
    validate: true,
    
    scaling: {
      enabled: true,
      targetUtilization: 60,
      scaleUpThreshold: 70,
      scaleDownThreshold: 30,
      scaleUpStep: 15,
      scaleDownStep: 8,
      cooldownMs: 300000 // 5 minutes
    },
    
    monitoring: {
      enabled: true,
      alertThresholds: {
        highUtilization: 75,
        longWaitTime: 2000,
        connectionErrors: 20
      },
      metrics: {
        collectIntervalMs: 10000,
        retentionDays: 30
      }
    },
    
    healthCheck: {
      enabled: true,
      intervalMs: 10000,
      timeoutMs: 2000,
      retries: 5
    }
  },

  [ConnectionPoolTier.ENTERPRISE]: {
    min: 50,
    max: 200,
    idle: 60000,
    acquire: 90000,
    evict: 1000,
    
    acquireTimeoutMillis: 90000,
    createTimeoutMillis: 20000,
    destroyTimeoutMillis: 10000,
    idleTimeoutMillis: 60000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 1000,
    validate: true,
    
    scaling: {
      enabled: true,
      targetUtilization: 55,
      scaleUpThreshold: 65,
      scaleDownThreshold: 25,
      scaleUpStep: 20,
      scaleDownStep: 10,
      cooldownMs: 600000 // 10 minutes
    },
    
    monitoring: {
      enabled: true,
      alertThresholds: {
        highUtilization: 70,
        longWaitTime: 1500,
        connectionErrors: 50
      },
      metrics: {
        collectIntervalMs: 5000,
        retentionDays: 90
      }
    },
    
    healthCheck: {
      enabled: true,
      intervalMs: 5000,
      timeoutMs: 1000,
      retries: 7
    }
  }
};

/**
 * MFA encryption workload-specific optimizations
 */
export const MFA_WORKLOAD_OPTIMIZATIONS = {
  // Additional connections needed for MFA operations
  mfaConnectionBoost: 10,
  
  // Extended timeouts for encryption operations
  encryptionTimeoutMs: 5000,
  
  // Batch size for bulk MFA operations
  batchProcessingSize: 100,
  
  // Connection reservation for critical MFA operations
  reservedConnections: 5
};

/**
 * Get optimized connection pool configuration for current environment
 */
export function getOptimizedConnectionPoolConfig(): AdvancedConnectionPoolConfig {
  const environment = config.app.nodeEnv;
  let tier: ConnectionPoolTier;
  
  switch (environment) {
    case 'development':
      tier = ConnectionPoolTier.DEVELOPMENT;
      break;
    case 'staging':
      tier = ConnectionPoolTier.STAGING;
      break;
    case 'production':
      // Determine if enterprise tier based on configuration
      const isEnterprise = config.database.pool.max >= 150 || 
                          process.env.DB_TIER === 'enterprise';
      tier = isEnterprise ? ConnectionPoolTier.ENTERPRISE : ConnectionPoolTier.PRODUCTION;
      break;
    default:
      tier = ConnectionPoolTier.DEVELOPMENT;
  }
  
  const baseConfig = CONNECTION_POOL_CONFIGS[tier];
  
  // Apply MFA workload optimizations if MFA is enabled
  const mfaEnabled = config.security?.mfa?.enabled || false;
  if (mfaEnabled) {
    return {
      ...baseConfig,
      max: baseConfig.max + MFA_WORKLOAD_OPTIMIZATIONS.mfaConnectionBoost,
      acquire: Math.max(baseConfig.acquire, MFA_WORKLOAD_OPTIMIZATIONS.encryptionTimeoutMs),
      acquireTimeoutMillis: Math.max(
        baseConfig?.acquireTimeoutMillis || 30000,
        MFA_WORKLOAD_OPTIMIZATIONS.encryptionTimeoutMs
      )
    };
  }
  
  return baseConfig;
}

/**
 * Dynamic connection pool scaling manager
 */
export class ConnectionPoolScalingManager {
  private scalingConfig: AdvancedConnectionPoolConfig;
  private lastScaleAction: number = 0;
  private currentMetrics: any = {};
  
  constructor(config: AdvancedConnectionPoolConfig) {
    this.scalingConfig = config;
  }
  
  /**
   * Update pool metrics for scaling decisions
   */
  updateMetrics(metrics: {
    utilization: number;
    waitingConnections: number;
    connectionErrors: number;
    avgWaitTime: number;
  }): void {
    this.currentMetrics = {
      ...metrics,
      timestamp: Date.now()
    };
    
    if (this.scalingConfig.scaling.enabled) {
      this.evaluateScaling();
    }
  }
  
  /**
   * Evaluate if scaling action is needed
   */
  private evaluateScaling(): void {
    const now = Date.now();
    const { scaling } = this.scalingConfig;
    
    // Check cooldown period
    if (now - this.lastScaleAction < scaling.cooldownMs) {
      return;
    }
    
    const utilization = this.currentMetrics.utilization;
    const waitingConnections = this.currentMetrics?.waitingConnections || 0;
    
    // Scale up conditions
    if (utilization > scaling?.scaleUpThreshold || waitingConnections > 5) {
      this.recommendScaleUp();
    }
    // Scale down conditions
    else if (utilization < scaling.scaleDownThreshold && waitingConnections === 0) {
      this.recommendScaleDown();
    }
  }
  
  /**
   * Recommend scaling up the connection pool
   */
  private recommendScaleUp(): void {
    const currentMax = this.scalingConfig.max;
    const newMax = Math.min(currentMax + this.scalingConfig.scaling.scaleUpStep, 300);
    
    logger.info('Connection pool scaling recommendation: SCALE UP', {
      currentMax,
      newMax,
      utilization: this.currentMetrics.utilization,
      waiting: this.currentMetrics.waitingConnections,
      reason: 'High utilization or waiting connections detected'
    });
    
    this.lastScaleAction = Date.now();
    
    // In production, this would trigger actual pool reconfiguration
    this.logScalingRecommendation('scale-up', currentMax, newMax);
  }
  
  /**
   * Recommend scaling down the connection pool
   */
  private recommendScaleDown(): void {
    const currentMax = this.scalingConfig.max;
    const minAllowed = Math.max(this.scalingConfig.min * 2, 20);
    const newMax = Math.max(currentMax - this.scalingConfig.scaling.scaleDownStep, minAllowed);
    
    if (newMax < currentMax) {
      logger.info('Connection pool scaling recommendation: SCALE DOWN', {
        currentMax,
        newMax,
        utilization: this.currentMetrics.utilization,
        reason: 'Low utilization with no waiting connections'
      });
      
      this.lastScaleAction = Date.now();
      this.logScalingRecommendation('scale-down', currentMax, newMax);
    }
  }
  
  /**
   * Log scaling recommendation for monitoring
   */
  private logScalingRecommendation(action: string, currentMax: number, newMax: number): void {
    // In production, this would insert into monitoring.connection_pool_optimization table
    logger.info('Connection Pool Scaling Recommendation Logged', {
      action,
      currentMax,
      newMax,
      timestamp: new Date().toISOString(),
      metrics: this.currentMetrics
    });
  }
}

/**
 * Performance monitoring for connection pools
 */
export class ConnectionPoolMonitor {
  private monitoringConfig: AdvancedConnectionPoolConfig['monitoring'];
  private alertThresholds: AdvancedConnectionPoolConfig['monitoring']['alertThresholds'];
  
  constructor(config: AdvancedConnectionPoolConfig) {
    this.monitoringConfig = config.monitoring;
    this.alertThresholds = config.monitoring.alertThresholds;
  }
  
  /**
   * Check pool health and trigger alerts if needed
   */
  checkHealth(metrics: {
    utilization: number;
    avgWaitTime: number;
    connectionErrors: number;
    activeConnections: number;
    totalConnections: number;
  }): {
    status: 'healthy' | 'warning' | 'critical';
    alerts: string[];
    recommendations: string[];
  } {
    const alerts: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check utilization
    if (metrics.utilization > this.alertThresholds.highUtilization) {
      alerts.push(`High connection pool utilization: ${metrics.utilization}%`);
      recommendations.push('Consider increasing connection pool size');
      status = 'warning';
      
      if (metrics.utilization > 90) {
        status = 'critical';
        recommendations.push('Immediate pool scaling required to prevent connection exhaustion');
      }
    }
    
    // Check wait times
    if (metrics.avgWaitTime > this.alertThresholds.longWaitTime) {
      alerts.push(`Long average wait time: ${metrics.avgWaitTime}ms`);
      recommendations.push('Investigate slow queries or increase pool size');
      status = status === 'critical' ? 'critical' : 'warning';
    }
    
    // Check connection errors
    if (metrics.connectionErrors > this.alertThresholds.connectionErrors) {
      alerts.push(`High connection error rate: ${metrics.connectionErrors} errors`);
      recommendations.push('Check database connectivity and network issues');
      status = 'critical';
    }
    
    return { status, alerts, recommendations };
  }
}

/**
 * Create optimized Sequelize pool configuration
 */
export function createOptimizedSequelizePoolConfig(): Options['pool'] {
  const config = getOptimizedConnectionPoolConfig();
  
  return {
    min: config.min,
    max: config.max,
    idle: config.idle,
    acquire: config.acquire,
    evict: config.evict,
    validate: config.validate ? (() => true) : undefined,
    
    // Extended configuration
    acquireTimeoutMillis: config.acquireTimeoutMillis,
    createTimeoutMillis: config.createTimeoutMillis,
    destroyTimeoutMillis: config.destroyTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
    reapIntervalMillis: config.reapIntervalMillis,
    createRetryIntervalMillis: config.createRetryIntervalMillis,
  };
}

/**
 * Initialize connection pool monitoring and scaling
 */
export function initializeConnectionPoolManagement(): {
  scalingManager: ConnectionPoolScalingManager;
  monitor: ConnectionPoolMonitor;
} {
  const config = getOptimizedConnectionPoolConfig();
  
  const scalingManager = new ConnectionPoolScalingManager(config);
  const monitor = new ConnectionPoolMonitor(config);
  
  logger.info('Connection pool management initialized', {
    tier: determineTier(),
    config: {
      min: config.min,
      max: config.max,
      scalingEnabled: config.scaling.enabled,
      monitoringEnabled: config.monitoring.enabled
    }
  });
  
  return { scalingManager, monitor };
}

/**
 * Helper to determine current configuration tier
 */
function determineTier(): ConnectionPoolTier {
  const environment = config.app.nodeEnv;
  const isEnterprise = config.database.pool.max >= 150 || 
                       process.env.DB_TIER === 'enterprise';
  
  switch (environment) {
    case 'development':
      return ConnectionPoolTier.DEVELOPMENT;
    case 'staging':
      return ConnectionPoolTier.STAGING;
    case 'production':
      return isEnterprise ? ConnectionPoolTier.ENTERPRISE : ConnectionPoolTier.PRODUCTION;
    default:
      return ConnectionPoolTier.DEVELOPMENT;
  }
}

/**
 * Export configuration utilities
 */
export default {
  getOptimizedConnectionPoolConfig,
  createOptimizedSequelizePoolConfig,
  initializeConnectionPoolManagement,
  ConnectionPoolScalingManager,
  ConnectionPoolMonitor,
  CONNECTION_POOL_CONFIGS,
  MFA_WORKLOAD_OPTIMIZATIONS
};