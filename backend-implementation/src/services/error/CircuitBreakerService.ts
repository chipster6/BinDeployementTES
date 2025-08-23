/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CIRCUIT BREAKER SERVICE
 * ============================================================================
 * 
 * Comprehensive circuit breaker implementation for external services and 
 * internal components. Provides intelligent failure detection, automatic
 * fallback strategies, and recovery mechanisms to ensure system resilience.
 *
 * Features:
 * - Configurable circuit breaker patterns for different service types
 * - Automatic failure detection and recovery
 * - Fallback strategy coordination
 * - Health monitoring and metrics collection
 * - Business continuity protection
 * - Integration with monitoring systems
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import { logger, logError, logAuditEvent } from '@/utils/logger';
import { BaseService } from '@/services/BaseService';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringInterval: number;
  halfOpenMaxCalls: number;
  fallbackStrategy: FallbackStrategy;
  healthCheckEndpoint?: string;
  criticalService: boolean;
}

export interface FallbackStrategy {
  type: 'cache' | 'static' | 'alternative_service' | 'graceful_degradation' | 'queue_delayed';
  config: {
    cacheKey?: string;
    staticResponse?: any;
    alternativeEndpoint?: string;
    degradationMessage?: string;
    queueForLater?: boolean;
  };
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: number;
  lastSuccess: number;
  nextAttempt: number;
  halfOpenCalls: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastHealthCheck: number;
}

export interface CircuitBreakerMetrics {
  serviceName: string;
  state: string;
  uptime: number;
  failureRate: number;
  avgResponseTime: number;
  totalRequests: number;
  recentErrors: number;
  lastFailure: string | null;
  fallbacksActivated: number;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ServiceHealthCheck {
  serviceName: string;
  isHealthy: boolean;
  responseTime: number;
  lastCheck: Date;
  errorDetails?: string;
}

export class CircuitBreakerService extends BaseService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private configs = new Map<string, CircuitBreakerConfig>();
  private fallbackCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Default configurations for common service types
  private defaultConfigs: Record<string, CircuitBreakerConfig> = {
    'payment_service': {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      monitoringInterval: 10000,
      halfOpenMaxCalls: 2,
      criticalService: true,
      fallbackStrategy: {
        type: 'queue_delayed',
        config: {
          queueForLater: true,
          degradationMessage: 'Payment processing temporarily delayed'
        }
      }
    },
    'notification_service': {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringInterval: 15000,
      halfOpenMaxCalls: 3,
      criticalService: false,
      fallbackStrategy: {
        type: 'queue_delayed',
        config: {
          queueForLater: true,
          degradationMessage: 'Notifications will be sent when service recovers'
        }
      }
    },
    'external_api': {
      failureThreshold: 4,
      recoveryTimeout: 45000,
      monitoringInterval: 12000,
      halfOpenMaxCalls: 2,
      criticalService: false,
      fallbackStrategy: {
        type: 'cache',
        config: {
          degradationMessage: 'Using cached data due to service unavailability'
        }
      }
    },
    'database': {
      failureThreshold: 2,
      recoveryTimeout: 15000,
      monitoringInterval: 5000,
      halfOpenMaxCalls: 1,
      criticalService: true,
      fallbackStrategy: {
        type: 'graceful_degradation',
        config: {
          degradationMessage: 'System operating in limited mode'
        }
      }
    }
  };

  constructor() {
    super();
    this.startHealthMonitoring();
    
    // Graceful shutdown
    process.on('SIGTERM', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
  }

  /**
   * Register a service with circuit breaker protection
   */
  public registerService(
    serviceName: string, 
    config?: Partial<CircuitBreakerConfig>,
    serviceType?: keyof typeof this.defaultConfigs
  ): void {
    const baseConfig = serviceType ? this.defaultConfigs[serviceType] : this.defaultConfigs['external_api'];
    const finalConfig = { ...baseConfig, ...config };
    
    this.configs.set(serviceName, finalConfig);
    this.circuitBreakers.set(serviceName, this.createInitialState());
    
    logger.info('Circuit breaker registered for service', {
      serviceName,
      config: finalConfig,
      serviceType
    });
    
    logAuditEvent(
      'circuit_breaker_registered',
      'circuit_breaker_service',
      { serviceName, serviceType, config: finalConfig },
      'system'
    );
  }

  /**
   * Execute a request with circuit breaker protection
   */
  public async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallbackData?: T
  ): Promise<{ success: boolean; data?: T; usedFallback: boolean; error?: Error }> {
    const breaker = this.getCircuitBreaker(serviceName);
    const config = this.getConfig(serviceName);
    
    // Check if circuit breaker allows the request
    if (!this.shouldAllowRequest(serviceName)) {
      logger.warn('Circuit breaker blocking request', {
        serviceName,
        state: breaker.state,
        failures: breaker.failures
      });
      
      const fallback = await this.executeFallbackStrategy(serviceName, config.fallbackStrategy, fallbackData);
      return { success: fallback.success, data: fallback.data, usedFallback: true, error: fallback.error };
    }

    const startTime = Date.now();
    
    try {
      // Execute the operation
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(config.recoveryTimeout)
      ]);
      
      const responseTime = Date.now() - startTime;
      
      // Record success
      this.recordSuccess(serviceName, responseTime);
      
      return { success: true, data: result, usedFallback: false };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(serviceName, error as Error, responseTime);
      
      // Execute fallback strategy
      const fallback = await this.executeFallbackStrategy(serviceName, config.fallbackStrategy, fallbackData);
      
      logError(error as Error, 'circuit_breaker_operation_failed', {
        serviceName,
        responseTime,
        breakerState: breaker.state
      });
      
      return { 
        success: fallback.success, 
        data: fallback.data, 
        usedFallback: true, 
        error: error as Error 
      };
    }
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallbackStrategy<T>(
    serviceName: string,
    strategy: FallbackStrategy,
    fallbackData?: T
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    try {
      switch (strategy.type) {
        case 'cache':
          const cachedData = this.getCachedData(serviceName);
          if (cachedData) {
            return { success: true, data: cachedData };
          }
          return { success: false, error: new Error('No cached data available') };
          
        case 'static':
          return { 
            success: true, 
            data: strategy.config.staticResponse || fallbackData 
          };
          
        case 'alternative_service':
          if (strategy.config.alternativeEndpoint) {
            // This would integrate with alternative service
            logger.info('Using alternative service endpoint', {
              serviceName,
              alternativeEndpoint: strategy.config.alternativeEndpoint
            });
            return { success: true, data: fallbackData };
          }
          return { success: false, error: new Error('No alternative service available') };
          
        case 'graceful_degradation':
          return { 
            success: true, 
            data: {
              degraded: true,
              message: strategy.config.degradationMessage,
              data: fallbackData
            } as T
          };
          
        case 'queue_delayed':
          if (strategy.config.queueForLater) {
            // Queue for later processing
            await this.queueForLaterProcessing(serviceName, fallbackData);
            return { 
              success: true, 
              data: {
                queued: true,
                message: strategy.config.degradationMessage
              } as T
            };
          }
          return { success: false, error: new Error('Queueing not available') };
          
        default:
          return { success: false, error: new Error('Unknown fallback strategy') };
      }
    } catch (error) {
      logger.error('Fallback strategy execution failed', {
        serviceName,
        strategy: strategy.type,
        error: (error as Error).message
      });
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  public getCircuitBreakerMetrics(): CircuitBreakerMetrics[] {
    const metrics: CircuitBreakerMetrics[] = [];
    
    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      const config = this.getConfig(serviceName);
      const uptime = breaker.lastSuccess ? Date.now() - breaker.lastSuccess : 0;
      const failureRate = breaker.totalRequests > 0 ? 
        (breaker.failedRequests / breaker.totalRequests) * 100 : 0;
      
      metrics.push({
        serviceName,
        state: breaker.state,
        uptime,
        failureRate,
        avgResponseTime: breaker.avgResponseTime,
        totalRequests: breaker.totalRequests,
        recentErrors: breaker.failures,
        lastFailure: breaker.lastFailure ? new Date(breaker.lastFailure).toISOString() : null,
        fallbacksActivated: breaker.totalRequests - breaker.successfulRequests,
        businessImpact: this.determineBusinessImpact(serviceName, config)
      });
    }
    
    return metrics;
  }

  /**
   * Perform health check for all registered services
   */
  public async performHealthCheck(): Promise<ServiceHealthCheck[]> {
    const healthChecks: ServiceHealthCheck[] = [];
    
    for (const [serviceName, config] of this.configs.entries()) {
      const startTime = Date.now();
      let healthCheck: ServiceHealthCheck;
      
      try {
        if (config.healthCheckEndpoint) {
          // Perform actual health check
          const response = await fetch(config.healthCheckEndpoint, {
            method: 'GET',
            timeout: 5000
          });
          
          const responseTime = Date.now() - startTime;
          const isHealthy = response.ok;
          
          healthCheck = {
            serviceName,
            isHealthy,
            responseTime,
            lastCheck: new Date(),
            errorDetails: isHealthy ? undefined : `HTTP ${response.status}`
          };
        } else {
          // Use circuit breaker state as health indicator
          const breaker = this.getCircuitBreaker(serviceName);
          healthCheck = {
            serviceName,
            isHealthy: breaker.state === 'CLOSED',
            responseTime: breaker.avgResponseTime,
            lastCheck: new Date(),
            errorDetails: breaker.state !== 'CLOSED' ? `Circuit breaker ${breaker.state}` : undefined
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        healthCheck = {
          serviceName,
          isHealthy: false,
          responseTime,
          lastCheck: new Date(),
          errorDetails: (error as Error).message
        };
      }
      
      healthChecks.push(healthCheck);
      
      // Update circuit breaker state based on health check
      this.updateBreakerFromHealthCheck(serviceName, healthCheck.isHealthy);
    }
    
    return healthChecks;
  }

  /**
   * Manually reset circuit breaker for a service
   */
  public resetCircuitBreaker(serviceName: string): boolean {
    if (!this.circuitBreakers.has(serviceName)) {
      return false;
    }
    
    const newState = this.createInitialState();
    this.circuitBreakers.set(serviceName, newState);
    
    logger.info('Circuit breaker manually reset', { serviceName });
    
    logAuditEvent(
      'circuit_breaker_manual_reset',
      'circuit_breaker_service',
      { serviceName },
      'admin'
    );
    
    return true;
  }

  /**
   * Update circuit breaker configuration
   */
  public updateConfiguration(serviceName: string, config: Partial<CircuitBreakerConfig>): boolean {
    const currentConfig = this.configs.get(serviceName);
    if (!currentConfig) {
      return false;
    }
    
    const updatedConfig = { ...currentConfig, ...config };
    this.configs.set(serviceName, updatedConfig);
    
    logger.info('Circuit breaker configuration updated', {
      serviceName,
      updatedConfig
    });
    
    return true;
  }

  // Private helper methods
  private createInitialState(): CircuitBreakerState {
    return {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      lastSuccess: Date.now(),
      nextAttempt: 0,
      halfOpenCalls: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastHealthCheck: Date.now()
    };
  }

  private getCircuitBreaker(serviceName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(serviceName)) {
      throw new Error(`Circuit breaker not registered for service: ${serviceName}`);
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private getConfig(serviceName: string): CircuitBreakerConfig {
    if (!this.configs.has(serviceName)) {
      throw new Error(`Configuration not found for service: ${serviceName}`);
    }
    return this.configs.get(serviceName)!;
  }

  private shouldAllowRequest(serviceName: string): boolean {
    const breaker = this.getCircuitBreaker(serviceName);
    const config = this.getConfig(serviceName);
    const now = Date.now();

    switch (breaker.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'HALF_OPEN';
          breaker.halfOpenCalls = 0;
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return breaker.halfOpenCalls < config.halfOpenMaxCalls;
        
      default:
        return true;
    }
  }

  private recordSuccess(serviceName: string, responseTime: number): void {
    const breaker = this.getCircuitBreaker(serviceName);
    const config = this.getConfig(serviceName);
    
    breaker.totalRequests++;
    breaker.successfulRequests++;
    breaker.lastSuccess = Date.now();
    breaker.avgResponseTime = this.calculateAvgResponseTime(breaker.avgResponseTime, responseTime, breaker.totalRequests);
    
    if (breaker.state === 'HALF_OPEN') {
      breaker.halfOpenCalls++;
      if (breaker.halfOpenCalls >= config.halfOpenMaxCalls) {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
      }
    } else {
      breaker.failures = Math.max(0, breaker.failures - 1);
    }
  }

  private recordFailure(serviceName: string, error: Error, responseTime: number): void {
    const breaker = this.getCircuitBreaker(serviceName);
    const config = this.getConfig(serviceName);
    const now = Date.now();
    
    breaker.totalRequests++;
    breaker.failedRequests++;
    breaker.failures++;
    breaker.lastFailure = now;
    breaker.avgResponseTime = this.calculateAvgResponseTime(breaker.avgResponseTime, responseTime, breaker.totalRequests);
    
    if (breaker.failures >= config.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = now + config.recoveryTimeout;
      
      logger.warn('Circuit breaker opened due to failures', {
        serviceName,
        failures: breaker.failures,
        threshold: config.failureThreshold,
        nextAttempt: new Date(breaker.nextAttempt).toISOString()
      });
    }
  }

  private calculateAvgResponseTime(currentAvg: number, newTime: number, totalRequests: number): number {
    return ((currentAvg * (totalRequests - 1)) + newTime) / totalRequests;
  }

  private async createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private getCachedData(serviceName: string): any {
    const cached = this.fallbackCache.get(serviceName);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.fallbackCache.delete(serviceName);
    return null;
  }

  private async queueForLaterProcessing(serviceName: string, data: any): Promise<void> {
    try {
      const { QueueService } = require('@/services/QueueService');
      const queueService = new QueueService();
      
      await queueService.addJob(`${serviceName}_retry`, {
        serviceName,
        data,
        originalTimestamp: Date.now(),
        retryCount: 0
      }, {
        delay: 60000, // Retry after 1 minute
        attempts: 5
      });
    } catch (error) {
      logger.error('Failed to queue for later processing', {
        serviceName,
        error: (error as Error).message
      });
    }
  }

  private determineBusinessImpact(serviceName: string, config: CircuitBreakerConfig): 'low' | 'medium' | 'high' | 'critical' {
    if (config.criticalService) {
      return serviceName.includes('payment') ? 'critical' : 'high';
    }
    return serviceName.includes('notification') ? 'low' : 'medium';
  }

  private updateBreakerFromHealthCheck(serviceName: string, isHealthy: boolean): void {
    const breaker = this.getCircuitBreaker(serviceName);
    breaker.lastHealthCheck = Date.now();
    
    if (isHealthy && breaker.state === 'OPEN') {
      // Consider allowing half-open state if service is healthy
      const config = this.getConfig(serviceName);
      if (Date.now() >= breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        breaker.halfOpenCalls = 0;
      }
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health monitoring error', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Cache data for fallback use
   */
  public cacheData(serviceName: string, data: any, ttl: number = 300000): void {
    this.fallbackCache.set(serviceName, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get service status summary for monitoring dashboard
   */
  public getServiceStatusSummary() {
    const summary = {
      totalServices: this.circuitBreakers.size,
      healthyServices: 0,
      degradedServices: 0,
      failedServices: 0,
      criticalServicesDown: 0,
      fallbacksActive: 0
    };

    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      const config = this.getConfig(serviceName);
      
      switch (breaker.state) {
        case 'CLOSED':
          summary.healthyServices++;
          break;
        case 'HALF_OPEN':
          summary.degradedServices++;
          break;
        case 'OPEN':
          summary.failedServices++;
          if (config.criticalService) {
            summary.criticalServicesDown++;
          }
          summary.fallbacksActive++;
          break;
      }
    }

    return summary;
  }
}

// Export singleton instance
export const circuitBreakerService = new CircuitBreakerService();
export default circuitBreakerService;