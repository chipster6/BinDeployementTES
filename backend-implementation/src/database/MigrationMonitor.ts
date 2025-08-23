/**
 * ============================================================================
 * MIGRATION MONITORING AND ROLLBACK AUTOMATION SYSTEM
 * ============================================================================
 *
 * Real-time monitoring system for database migrations with automated rollback
 * capabilities, health checks, and alert management for production safety.
 *
 * Features:
 * - Real-time migration progress monitoring
 * - Automated rollback triggers based on health metrics
 * - Performance impact monitoring during migrations
 * - Alert system for migration failures and anomalies
 * - Integration with existing performance monitoring
 * - Rollback decision automation based on configurable thresholds
 *
 * Created by: Database-Architect
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';
import { sequelize } from '@/config/database';
import { logger } from '@/utils/logger';
import { databasePerformanceMonitor } from './performance-monitor';
import { migrationManager } from './MigrationManager';
import { backupService } from './BackupService';
import { QueryTypes } from 'sequelize';

/**
 * Migration health status enumeration
 */
export enum MigrationHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  FAILING = 'failing',
}

/**
 * Rollback trigger types
 */
export enum RollbackTrigger {
  MANUAL = 'manual',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  CONNECTION_POOL_EXHAUSTION = 'connection_pool_exhaustion',
  TIMEOUT = 'timeout',
  ERROR_THRESHOLD = 'error_threshold',
  HEALTH_CHECK_FAILURE = 'health_check_failure',
  DISK_SPACE = 'disk_space',
}

/**
 * Migration monitoring configuration
 */
export interface MigrationMonitorConfig {
  enabled: boolean;
  monitoringInterval: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  autoRollbackEnabled: boolean;
  thresholds: {
    maxMigrationDuration: number; // seconds
    maxConnectionUtilization: number; // percentage
    maxResponseTime: number; // milliseconds
    maxErrorRate: number; // percentage
    minAvailableConnections: number; // absolute number
    maxDiskUsage: number; // percentage
  };
  notifications: {
    webhookUrl?: string;
    emailRecipients?: string[];
    slackChannel?: string;
  };
}

/**
 * Migration health metrics
 */
export interface MigrationHealthMetrics {
  migrationId: string;
  status: MigrationHealthStatus;
  timestamp: Date;
  
  // Performance metrics
  connectionPoolUtilization: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  queryThroughput: number;
  
  // System metrics
  diskUsage: number;
  memoryUsage: number;
  cpuUsage: number;
  
  // Migration-specific metrics
  migrationDuration: number; // seconds
  recordsProcessed: number;
  estimatedCompletion: number; // seconds
  
  // Alerts and warnings
  activeAlerts: string[];
  warnings: string[];
}

/**
 * Rollback decision interface
 */
export interface RollbackDecision {
  shouldRollback: boolean;
  trigger: RollbackTrigger;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: MigrationHealthMetrics;
  confidence: number; // 0-100
}

/**
 * Migration Monitor Class
 */
export class MigrationMonitor extends EventEmitter {
  private static instance: MigrationMonitor;
  private readonly config: MigrationMonitorConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private currentMigrations: Map<string, MigrationHealthMetrics> = new Map();
  private alertHistory: Array<{ timestamp: Date; message: string; level: string }> = [];
  
  private constructor(config: MigrationMonitorConfig) {
    super();
    this.config = {
      enabled: true,
      monitoringInterval: 5000, // 5 seconds
      healthCheckInterval: 10000, // 10 seconds
      autoRollbackEnabled: false, // Conservative default
      thresholds: {
        maxMigrationDuration: 3600, // 1 hour
        maxConnectionUtilization: 85, // 85%
        maxResponseTime: 2000, // 2 seconds
        maxErrorRate: 5, // 5%
        minAvailableConnections: 10,
        maxDiskUsage: 90, // 90%
      },
      notifications: {},
      ...config,
    };
  }

  public static getInstance(config?: MigrationMonitorConfig): MigrationMonitor {
    if (!MigrationMonitor.instance) {
      MigrationMonitor.instance = new MigrationMonitor(config || {} as MigrationMonitorConfig);
    }
    return MigrationMonitor.instance;
  }

  /**
   * Start migration monitoring
   */
  public startMonitoring(): void {
    if (!this.config.enabled) {
      logger.info('Migration monitoring is disabled');
      return;
    }

    if (this.isMonitoring) {
      logger.warn('Migration monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting migration monitoring system');

    // Start performance monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMigrationMetrics();
    }, this.config.monitoringInterval);

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    this.emit('monitoring_started');
  }

  /**
   * Stop migration monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    logger.info('Migration monitoring stopped');
    this.emit('monitoring_stopped');
  }

  /**
   * Register a migration for monitoring
   */
  public registerMigration(migrationId: string): void {
    const initialMetrics: MigrationHealthMetrics = {
      migrationId,
      status: MigrationHealthStatus.HEALTHY,
      timestamp: new Date(),
      connectionPoolUtilization: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      queryThroughput: 0,
      diskUsage: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      migrationDuration: 0,
      recordsProcessed: 0,
      estimatedCompletion: 0,
      activeAlerts: [],
      warnings: [],
    };

    this.currentMigrations.set(migrationId, initialMetrics);
    this.emit('migration_registered', { migrationId, metrics: initialMetrics });
  }

  /**
   * Unregister a migration from monitoring
   */
  public unregisterMigration(migrationId: string): void {
    this.currentMigrations.delete(migrationId);
    this.emit('migration_unregistered', { migrationId });
  }

  /**
   * Collect migration performance metrics
   */
  private async collectMigrationMetrics(): Promise<void> {
    try {
      for (const [migrationId, previousMetrics] of this.currentMigrations) {
        const metrics = await this.gatherMetricsForMigration(migrationId, previousMetrics);
        this.currentMigrations.set(migrationId, metrics);
        
        // Evaluate rollback decision if auto-rollback is enabled
        if (this.config.autoRollbackEnabled) {
          const rollbackDecision = await this.evaluateRollbackDecision(metrics);
          if (rollbackDecision.shouldRollback) {
            await this.executeAutomaticRollback(migrationId, rollbackDecision);
          }
        }
        
        this.emit('metrics_collected', { migrationId, metrics });
      }
    } catch (error: unknown) {
      logger.error('Failed to collect migration metrics:', error);
    }
  }

  /**
   * Gather metrics for a specific migration
   */
  private async gatherMetricsForMigration(
    migrationId: string,
    previousMetrics: MigrationHealthMetrics
  ): Promise<MigrationHealthMetrics> {
    try {
      // Get database performance metrics
      const performanceSummary = await databasePerformanceMonitor.getPerformanceSummary();
      const poolStats = await databasePerformanceMonitor.getConnectionPoolStats();
      
      // Get migration-specific metrics from database
      const migrationData = await this.getMigrationProgressData(migrationId);
      
      // Calculate system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      const metrics: MigrationHealthMetrics = {
        migrationId,
        status: this.calculateHealthStatus(performanceSummary, poolStats, systemMetrics),
        timestamp: new Date(),
        
        // Performance metrics
        connectionPoolUtilization: poolStats.utilization,
        activeConnections: poolStats.active,
        averageResponseTime: performanceSummary.avgResponseTime,
        errorRate: this.calculateErrorRate(performanceSummary),
        queryThroughput: performanceSummary.queryThroughput,
        
        // System metrics
        diskUsage: systemMetrics.diskUsage,
        memoryUsage: systemMetrics.memoryUsage,
        cpuUsage: systemMetrics.cpuUsage,
        
        // Migration-specific metrics
        migrationDuration: migrationData.duration,
        recordsProcessed: migrationData.recordsProcessed,
        estimatedCompletion: migrationData.estimatedCompletion,
        
        // Alerts and warnings
        activeAlerts: await this.generateAlerts(performanceSummary, poolStats, systemMetrics),
        warnings: this.generateWarnings(performanceSummary, poolStats, systemMetrics),
      };

      return metrics;
    } catch (error: unknown) {
      logger.error(`Failed to gather metrics for migration ${migrationId}:`, error);
      return {
        ...previousMetrics,
        status: MigrationHealthStatus.CRITICAL,
        timestamp: new Date(),
        activeAlerts: ['Failed to collect metrics'],
      };
    }
  }

  /**
   * Evaluate whether to trigger automatic rollback
   */
  private async evaluateRollbackDecision(metrics: MigrationHealthMetrics): Promise<RollbackDecision> {
    const reasons: string[] = [];
    let trigger: RollbackTrigger = RollbackTrigger.MANUAL;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check migration duration
    if (metrics.migrationDuration > this.config.thresholds.maxMigrationDuration) {
      reasons.push(`Migration duration exceeded threshold: ${metrics.migrationDuration}s > ${this.config.thresholds.maxMigrationDuration}s`);
      trigger = RollbackTrigger.TIMEOUT;
      severity = 'high';
    }

    // Check connection pool utilization
    if (metrics.connectionPoolUtilization > this.config.thresholds.maxConnectionUtilization) {
      reasons.push(`Connection pool utilization too high: ${metrics.connectionPoolUtilization}% > ${this.config.thresholds.maxConnectionUtilization}%`);
      trigger = RollbackTrigger.CONNECTION_POOL_EXHAUSTION;
      severity = 'critical';
    }

    // Check response time
    if (metrics.averageResponseTime > this.config.thresholds.maxResponseTime) {
      reasons.push(`Average response time too high: ${metrics.averageResponseTime}ms > ${this.config.thresholds.maxResponseTime}ms`);
      trigger = RollbackTrigger.PERFORMANCE_DEGRADATION;
      severity = severity === 'critical' ? 'critical' : 'high';
    }

    // Check error rate
    if (metrics.errorRate > this.config.thresholds.maxErrorRate) {
      reasons.push(`Error rate too high: ${metrics.errorRate}% > ${this.config.thresholds.maxErrorRate}%`);
      trigger = RollbackTrigger.ERROR_THRESHOLD;
      severity = 'critical';
    }

    // Check disk usage
    if (metrics.diskUsage > this.config.thresholds.maxDiskUsage) {
      reasons.push(`Disk usage too high: ${metrics.diskUsage}% > ${this.config.thresholds.maxDiskUsage}%`);
      trigger = RollbackTrigger.DISK_SPACE;
      severity = 'critical';
    }

    // Check available connections
    const availableConnections = 120 - metrics.activeConnections; // Assuming max 120 connections
    if (availableConnections < this.config.thresholds.minAvailableConnections) {
      reasons.push(`Available connections too low: ${availableConnections} < ${this.config.thresholds.minAvailableConnections}`);
      trigger = RollbackTrigger.CONNECTION_POOL_EXHAUSTION;
      severity = 'critical';
    }

    const shouldRollback = reasons.length > 0;
    const confidence = shouldRollback ? Math.min(95, reasons.length * 30) : 0;

    return {
      shouldRollback,
      trigger,
      reason: reasons.join('; '),
      severity,
      metrics,
      confidence,
    };
  }

  /**
   * Execute automatic rollback
   */
  private async executeAutomaticRollback(
    migrationId: string,
    decision: RollbackDecision
  ): Promise<void> {
    try {
      logger.warn(`Executing automatic rollback for migration ${migrationId}`, {
        trigger: decision.trigger,
        reason: decision.reason,
        severity: decision.severity,
        confidence: decision.confidence,
      });

      // Send alert before rollback
      await this.sendAlert(
        'critical',
        `Automatic rollback triggered for migration ${migrationId}`,
        {
          trigger: decision.trigger,
          reason: decision.reason,
          metrics: decision.metrics,
        }
      );

      // Execute rollback
      const rollbackResult = await migrationManager.rollbackMigration(migrationId);
      
      this.emit('automatic_rollback_executed', {
        migrationId,
        decision,
        rollbackResult,
      });

      // Send success notification
      await this.sendAlert(
        'warning',
        `Automatic rollback completed for migration ${migrationId}`,
        { rollbackResult }
      );

    } catch (error: unknown) {
      logger.error(`Failed to execute automatic rollback for migration ${migrationId}:`, error);
      
      await this.sendAlert(
        'critical',
        `Automatic rollback failed for migration ${migrationId}: ${error instanceof Error ? error?.message : String(error)}`,
        { error }
      );
      
      this.emit('automatic_rollback_failed', {
        migrationId,
        decision,
        error,
      });
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      // Check database connectivity
      await sequelize.authenticate();
      
      // Check migration manager status
      const migrationStatus = await migrationManager.getStatus();
      
      // Check backup service status
      const backupStats = await backupService.getBackupStats();
      
      // Emit health check results
      this.emit('health_check_completed', {
        timestamp: new Date(),
        migrationStatus,
        backupStats,
        activeMigrations: this.currentMigrations.size,
      });
      
    } catch (error: unknown) {
      logger.error('Health check failed:', error);
      
      this.emit('health_check_failed', {
        timestamp: new Date(),
        error,
      });
      
      await this.sendAlert('critical', 'Migration monitoring health check failed', { error });
    }
  }

  /**
   * Helper methods
   */
  private calculateHealthStatus(
    performanceSummary: any,
    poolStats: any,
    systemMetrics: any
  ): MigrationHealthStatus {
    if (
      poolStats.utilization > 95 ||
      performanceSummary.avgResponseTime > 5000 ||
      systemMetrics.diskUsage > 95
    ) {
      return MigrationHealthStatus.CRITICAL;
    }
    
    if (
      poolStats.utilization > 85 ||
      performanceSummary.avgResponseTime > 2000 ||
      systemMetrics.diskUsage > 90
    ) {
      return MigrationHealthStatus.WARNING;
    }
    
    return MigrationHealthStatus.HEALTHY;
  }

  private calculateErrorRate(performanceSummary: any): number {
    // Calculate error rate based on performance summary
    return (performanceSummary.connectionErrors / Math.max(1, performanceSummary.queryThroughput)) * 100;
  }

  private async getMigrationProgressData(migrationId: string): Promise<{
    duration: number;
    recordsProcessed: number;
    estimatedCompletion: number;
  }> {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          EXTRACT(EPOCH FROM (NOW() - started_at)) as duration,
          COALESCE(affected_rows, 0) as records_processed
        FROM migration_history 
        WHERE migration_id = :migrationId 
          AND status = 'running'
      `, {
        type: QueryTypes.SELECT,
        replacements: { migrationId },
      });

      const data = results as any;
      return {
        duration: data?.duration || 0,
        recordsProcessed: data?.records_processed || 0,
        estimatedCompletion: 0, // Would implement based on progress calculation
      };
    } catch (error: unknown) {
      return { duration: 0, recordsProcessed: 0, estimatedCompletion: 0 };
    }
  }

  private async getSystemMetrics(): Promise<{
    diskUsage: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    // Placeholder implementation - would integrate with system monitoring
    return {
      diskUsage: 50, // Percentage
      memoryUsage: 60, // Percentage
      cpuUsage: 30, // Percentage
    };
  }

  private async generateAlerts(
    performanceSummary: any,
    poolStats: any,
    systemMetrics: any
  ): Promise<string[]> {
    const alerts: string[] = [];
    
    if (poolStats.utilization > 90) {
      alerts.push('High connection pool utilization');
    }
    
    if (performanceSummary.avgResponseTime > 3000) {
      alerts.push('High average response time');
    }
    
    if (systemMetrics.diskUsage > 85) {
      alerts.push('High disk usage');
    }
    
    return alerts;
  }

  private generateWarnings(
    performanceSummary: any,
    poolStats: any,
    systemMetrics: any
  ): string[] {
    const warnings: string[] = [];
    
    if (poolStats.utilization > 75) {
      warnings.push('Moderate connection pool utilization');
    }
    
    if (performanceSummary.slowQueries > 10) {
      warnings.push('Multiple slow queries detected');
    }
    
    return warnings;
  }

  private async sendAlert(
    level: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    const alert = {
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    this.alertHistory.push({ timestamp: alert.timestamp, message, level });
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Send to configured notification channels
    if (this.config.notifications.webhookUrl) {
      try {
        const response = await fetch(this.config.notifications.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
        
        if (!response.ok) {
          logger.warn('Failed to send webhook notification:', response.statusText);
        }
      } catch (error: unknown) {
        logger.warn('Failed to send webhook notification:', error);
      }
    }

    this.emit('alert_sent', alert);
  }

  /**
   * Public API methods
   */
  public getCurrentMigrations(): Map<string, MigrationHealthMetrics> {
    return new Map(this.currentMigrations);
  }

  public getMigrationMetrics(migrationId: string): MigrationHealthMetrics | undefined {
    return this.currentMigrations.get(migrationId);
  }

  public getAlertHistory(limit: number = 100): Array<{ timestamp: Date; message: string; level: string }> {
    return this.alertHistory.slice(-limit);
  }

  public async forceRollback(migrationId: string, reason: string): Promise<void> {
    const metrics = this.currentMigrations.get(migrationId);
    if (!metrics) {
      throw new Error(`Migration ${migrationId} not found in monitoring`);
    }

    const decision: RollbackDecision = {
      shouldRollback: true,
      trigger: RollbackTrigger.MANUAL,
      reason,
      severity: 'high',
      metrics,
      confidence: 100,
    };

    await this.executeAutomaticRollback(migrationId, decision);
  }

  public getMonitoringStatus(): {
    isRunning: boolean;
    activeMigrations: number;
    config: MigrationMonitorConfig;
    uptime: number;
  } {
    return {
      isRunning: this.isMonitoring,
      activeMigrations: this.currentMigrations.size,
      config: this.config,
      uptime: 0, // Would track actual uptime
    };
  }
}

// Export singleton instance
export const migrationMonitor = MigrationMonitor.getInstance();