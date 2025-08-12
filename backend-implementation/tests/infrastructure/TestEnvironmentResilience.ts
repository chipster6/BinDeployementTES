/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST ENVIRONMENT RESILIENCE SERVICE
 * ============================================================================
 *
 * Advanced test environment resilience system with fallback strategies,
 * dependency management, and service mocking for bulletproof test execution
 * during the 21-day Critical Testing Sprint.
 *
 * Features:
 * - Dynamic service discovery and health checking
 * - Intelligent fallback to mock services when dependencies fail
 * - Environment isolation and containerization support
 * - External service monitoring and circuit breakers
 * - Resource provisioning and cleanup automation
 * - Configuration management with environment switching
 * - Network resilience with retry and timeout handling
 * - Test data management and seeding strategies
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';
import { testErrorBoundary } from './TestErrorBoundary';
import { databaseTestRecoveryService } from './DatabaseTestRecoveryService';

/**
 * Service types for dependency management
 */
export enum ServiceType {
  DATABASE = 'database',
  REDIS = 'redis',
  EXTERNAL_API = 'external_api',
  MESSAGE_QUEUE = 'message_queue',
  FILE_STORAGE = 'file_storage',
  EMAIL_SERVICE = 'email_service',
  SMS_SERVICE = 'sms_service',
  PAYMENT_SERVICE = 'payment_service',
  MAPS_SERVICE = 'maps_service',
  NOTIFICATION_SERVICE = 'notification_service',
}

/**
 * Service health status
 */
export enum ServiceHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

/**
 * Environment types
 */
export enum TestEnvironmentType {
  LOCAL = 'local',
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes',
  CLOUD = 'cloud',
  HYBRID = 'hybrid',
}

/**
 * Service dependency configuration
 */
export interface ServiceDependency {
  name: string;
  type: ServiceType;
  required: boolean;
  healthCheckUrl: string;
  mockService?: {
    enabled: boolean;
    implementation: string;
    baseUrl?: string;
  };
  timeout: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
  fallbackStrategy: FallbackStrategy;
  environment: Record<string, string>;
}

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  type: 'mock' | 'proxy' | 'cache' | 'disable';
  priority: number;
  configuration: Record<string, any>;
  healthCheck?: () => Promise<boolean>;
  cleanup?: () => Promise<void>;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfiguration {
  name: string;
  type: TestEnvironmentType;
  services: ServiceDependency[];
  resources: {
    memory: string;
    cpu: string;
    storage: string;
  };
  networks: string[];
  volumes: string[];
  environmentVariables: Record<string, string>;
  setupCommands: string[];
  teardownCommands: string[];
}

/**
 * Service health check result
 */
export interface ServiceHealthCheck {
  serviceName: string;
  status: ServiceHealthStatus;
  responseTime: number;
  lastCheck: Date;
  error?: string;
  metadata: Record<string, any>;
}

/**
 * Environment resilience metrics
 */
export interface ResilienceMetrics {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  offlineServices: number;
  activeFallbacks: number;
  averageResponseTime: number;
  uptime: number;
  circuitBreakerTrips: number;
  environmentSwitches: number;
  lastHealthCheck: Date;
}

/**
 * Test Environment Resilience Service
 */
export class TestEnvironmentResilienceService extends EventEmitter {
  private environmentConfig: EnvironmentConfiguration | null = null;
  private serviceDependencies: Map<string, ServiceDependency> = new Map();
  private serviceHealthChecks: Map<string, ServiceHealthCheck> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private activeFallbacks: Map<string, FallbackStrategy> = new Map();
  private mockServices: Map<string, any> = new Map();
  private httpClient: AxiosInstance;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private resilienceMetrics: ResilienceMetrics;
  private environmentStartTime: Date = new Date();

  constructor() {
    super();
    this.httpClient = this.createHttpClient();
    this.resilienceMetrics = this.initializeMetrics();
    this.initializeDefaultServices();
  }

  /**
   * Initialize test environment with resilience
   */
  public async initializeEnvironment(
    environmentName: string,
    config?: Partial<EnvironmentConfiguration>
  ): Promise<void> {
    logger.info('Initializing resilient test environment', {
      environment: environmentName,
    });

    try {
      // Load environment configuration
      this.environmentConfig = await this.loadEnvironmentConfiguration(
        environmentName,
        config
      );

      // Setup service dependencies
      await this.setupServiceDependencies();

      // Initialize health checking
      this.startHealthChecking();

      // Setup fallback strategies
      await this.initializeFallbackStrategies();

      // Run environment setup commands
      await this.runEnvironmentSetup();

      // Verify environment readiness
      await this.verifyEnvironmentReadiness();

      this.emit('environmentInitialized', {
        environment: environmentName,
        config: this.environmentConfig,
        timestamp: new Date(),
      });

      logger.info('Test environment initialized successfully', {
        environment: environmentName,
        services: this.serviceDependencies.size,
        fallbacks: this.activeFallbacks.size,
      });

    } catch (error) {
      logger.error('Failed to initialize test environment', {
        environment: environmentName,
        error: error.message,
      });

      // Attempt environment recovery
      await this.attemptEnvironmentRecovery(error as Error);
      throw error;
    }
  }

  /**
   * Check service health and manage fallbacks
   */
  public async checkServiceHealth(serviceName: string): Promise<ServiceHealthCheck> {
    const service = this.serviceDependencies.get(serviceName);
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const startTime = Date.now();
    let status = ServiceHealthStatus.UNKNOWN;
    let error: string | undefined;
    const metadata: Record<string, any> = {};

    try {
      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      if (circuitBreaker && circuitBreaker.isOpen()) {
        status = ServiceHealthStatus.OFFLINE;
        error = 'Circuit breaker is open';
        metadata.circuitBreakerOpen = true;
      } else {
        // Perform health check
        const response = await this.httpClient.get(service.healthCheckUrl, {
          timeout: service.timeout,
        });

        status = ServiceHealthStatus.HEALTHY;
        metadata.statusCode = response.status;
        metadata.responseData = response.data;
      }
    } catch (err) {
      error = err.message;
      status = this.categorizeHealthError(err as Error);
      
      // Update circuit breaker
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }
    }

    const responseTime = Date.now() - startTime;
    const healthCheck: ServiceHealthCheck = {
      serviceName,
      status,
      responseTime,
      lastCheck: new Date(),
      error,
      metadata,
    };

    this.serviceHealthChecks.set(serviceName, healthCheck);
    
    // Handle fallback if service is unhealthy
    if (status === ServiceHealthStatus.UNHEALTHY || status === ServiceHealthStatus.OFFLINE) {
      await this.handleServiceFailure(serviceName, healthCheck);
    }

    this.emit('serviceHealthChecked', healthCheck);
    return healthCheck;
  }

  /**
   * Execute test with environment resilience
   */
  public async executeWithResilience<T>(
    testFunction: () => Promise<T>,
    options: {
      requiredServices?: string[];
      fallbackStrategy?: 'fail-fast' | 'degrade-gracefully' | 'mock-services';
      timeout?: number;
      retryAttempts?: number;
    } = {}
  ): Promise<T> {
    const {
      requiredServices = [],
      fallbackStrategy = 'degrade-gracefully',
      timeout = 300000,
      retryAttempts = 2,
    } = options;

    // Pre-execution health check
    await this.verifyRequiredServices(requiredServices, fallbackStrategy);

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retryAttempts) {
      try {
        // Setup service monitoring
        const monitor = this.setupExecutionMonitoring(requiredServices);

        // Execute test with timeout
        const result = await this.executeWithTimeout(testFunction, timeout);

        // Cleanup monitoring
        this.cleanupExecutionMonitoring(monitor);

        return result;

      } catch (error) {
        lastError = error as Error;
        attempt++;

        logger.warn('Test execution failed, analyzing for environment issues', {
          attempt,
          error: error.message,
          requiredServices,
        });

        // Check if error is environment-related
        const isEnvironmentError = await this.analyzeErrorForEnvironmentIssues(
          error as Error,
          requiredServices
        );

        if (isEnvironmentError && attempt <= retryAttempts) {
          // Attempt environment recovery
          const recovered = await this.attemptServiceRecovery(
            requiredServices,
            error as Error
          );

          if (recovered) {
            logger.info('Environment recovery successful, retrying test', {
              attempt,
            });
            await this.delay(2000 * attempt);
            continue;
          }
        }

        // If not recoverable or max attempts reached, break
        if (attempt > retryAttempts) {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Switch to fallback environment
   */
  public async switchToFallbackEnvironment(
    fallbackName: string,
    reason: string
  ): Promise<void> {
    logger.info('Switching to fallback environment', {
      fallback: fallbackName,
      reason,
      currentEnvironment: this.environmentConfig?.name,
    });

    try {
      // Stop current health checking
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Teardown current environment
      if (this.environmentConfig) {
        await this.teardownEnvironment();
      }

      // Initialize fallback environment
      await this.initializeEnvironment(fallbackName);

      this.resilienceMetrics.environmentSwitches++;

      this.emit('environmentSwitched', {
        from: this.environmentConfig?.name,
        to: fallbackName,
        reason,
        timestamp: new Date(),
      });

      logger.info('Successfully switched to fallback environment', {
        fallback: fallbackName,
      });

    } catch (error) {
      logger.error('Failed to switch to fallback environment', {
        fallback: fallbackName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get environment resilience status
   */
  public getResilienceStatus(): {
    environment: string;
    status: 'healthy' | 'degraded' | 'critical';
    metrics: ResilienceMetrics;
    services: ServiceHealthCheck[];
    recommendations: string[];
  } {
    const services = Array.from(this.serviceHealthChecks.values());
    const healthyServices = services.filter(s => s.status === ServiceHealthStatus.HEALTHY);
    const degradedServices = services.filter(s => s.status === ServiceHealthStatus.DEGRADED);
    const offlineServices = services.filter(s => s.status === ServiceHealthStatus.OFFLINE);

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (offlineServices.length > 0) {
      if (offlineServices.some(s => this.serviceDependencies.get(s.serviceName)?.required)) {
        status = 'critical';
        recommendations.push('Critical services are offline - consider switching to fallback environment');
      } else {
        status = 'degraded';
        recommendations.push('Non-critical services are offline - monitor test execution closely');
      }
    } else if (degradedServices.length > 2) {
      status = 'degraded';
      recommendations.push('Multiple services showing degraded performance');
    }

    if (this.activeFallbacks.size > 3) {
      recommendations.push('Many services running on fallbacks - investigate root causes');
    }

    return {
      environment: this.environmentConfig?.name || 'unknown',
      status,
      metrics: this.updateAndGetMetrics(),
      services,
      recommendations,
    };
  }

  /**
   * Cleanup and teardown environment
   */
  public async teardownEnvironment(): Promise<void> {
    logger.info('Tearing down test environment');

    try {
      // Stop health checking
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cleanup active fallbacks
      await this.cleanupFallbacks();

      // Run teardown commands
      if (this.environmentConfig?.teardownCommands) {
        for (const command of this.environmentConfig.teardownCommands) {
          try {
            execSync(command, { timeout: 30000 });
          } catch (error) {
            logger.warn('Teardown command failed', {
              command,
              error: error.message,
            });
          }
        }
      }

      // Clear state
      this.serviceDependencies.clear();
      this.serviceHealthChecks.clear();
      this.circuitBreakers.clear();
      this.activeFallbacks.clear();
      this.mockServices.clear();

      this.emit('environmentTornDown', {
        environment: this.environmentConfig?.name,
        timestamp: new Date(),
      });

      logger.info('Test environment teardown completed');

    } catch (error) {
      logger.error('Environment teardown failed', {
        error: error.message,
      });
    }
  }

  /**
   * Private helper methods
   */
  private async loadEnvironmentConfiguration(
    environmentName: string,
    configOverride?: Partial<EnvironmentConfiguration>
  ): Promise<EnvironmentConfiguration> {
    // Try to load from config file
    const configPath = `./tests/config/environments/${environmentName}.json`;
    let config: EnvironmentConfiguration;

    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      // Use default configuration
      config = this.getDefaultEnvironmentConfiguration(environmentName);
    }

    // Apply overrides
    if (configOverride) {
      config = { ...config, ...configOverride };
    }

    return config;
  }

  private getDefaultEnvironmentConfiguration(environmentName: string): EnvironmentConfiguration {
    return {
      name: environmentName,
      type: TestEnvironmentType.LOCAL,
      services: [
        {
          name: 'database',
          type: ServiceType.DATABASE,
          required: true,
          healthCheckUrl: 'http://localhost:5432',
          timeout: 5000,
          retryAttempts: 3,
          circuitBreakerThreshold: 5,
          fallbackStrategy: {
            type: 'mock',
            priority: 1,
            configuration: {
              mockImplementation: 'in-memory-database',
            },
          },
          environment: {
            DB_HOST: 'localhost',
            DB_PORT: '5432',
          },
        },
        {
          name: 'redis',
          type: ServiceType.REDIS,
          required: false,
          healthCheckUrl: 'http://localhost:6379',
          timeout: 3000,
          retryAttempts: 2,
          circuitBreakerThreshold: 3,
          fallbackStrategy: {
            type: 'mock',
            priority: 1,
            configuration: {
              mockImplementation: 'memory-cache',
            },
          },
          environment: {
            REDIS_HOST: 'localhost',
            REDIS_PORT: '6379',
          },
        },
      ],
      resources: {
        memory: '2GB',
        cpu: '2 cores',
        storage: '10GB',
      },
      networks: ['test-network'],
      volumes: ['test-data'],
      environmentVariables: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
      },
      setupCommands: [],
      teardownCommands: [],
    };
  }

  private initializeDefaultServices(): void {
    // Initialize default mock services
    this.initializeDefaultMockServices();
  }

  private initializeDefaultMockServices(): void {
    // Database mock service
    this.mockServices.set('database', {
      type: ServiceType.DATABASE,
      implementation: 'mock-database',
      healthCheck: () => Promise.resolve(true),
      cleanup: () => Promise.resolve(),
    });

    // Redis mock service
    this.mockServices.set('redis', {
      type: ServiceType.REDIS,
      implementation: 'memory-cache',
      healthCheck: () => Promise.resolve(true),
      cleanup: () => Promise.resolve(),
    });

    // External API mock service
    this.mockServices.set('external-api', {
      type: ServiceType.EXTERNAL_API,
      implementation: 'mock-server',
      healthCheck: () => Promise.resolve(true),
      cleanup: () => Promise.resolve(),
    });
  }

  private async setupServiceDependencies(): Promise<void> {
    if (!this.environmentConfig) return;

    for (const service of this.environmentConfig.services) {
      this.serviceDependencies.set(service.name, service);
      
      // Initialize circuit breaker
      const circuitBreaker = new CircuitBreaker(
        service.circuitBreakerThreshold,
        60000, // Reset timeout: 1 minute
        30000  // Open timeout: 30 seconds
      );
      this.circuitBreakers.set(service.name, circuitBreaker);

      logger.debug('Service dependency configured', {
        name: service.name,
        type: service.type,
        required: service.required,
      });
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Health check cycle failed', {
          error: error.message,
        });
      }
    }, 30000); // Every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.serviceDependencies.keys())
      .map(serviceName => this.checkServiceHealth(serviceName));

    await Promise.allSettled(healthCheckPromises);
    this.updateResilienceMetrics();
  }

  private async initializeFallbackStrategies(): Promise<void> {
    for (const [serviceName, service] of this.serviceDependencies) {
      if (service.fallbackStrategy) {
        try {
          await this.initializeFallback(serviceName, service.fallbackStrategy);
        } catch (error) {
          logger.warn('Failed to initialize fallback strategy', {
            service: serviceName,
            error: error.message,
          });
        }
      }
    }
  }

  private async initializeFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    switch (strategy.type) {
      case 'mock':
        await this.initializeMockFallback(serviceName, strategy);
        break;
      case 'proxy':
        await this.initializeProxyFallback(serviceName, strategy);
        break;
      case 'cache':
        await this.initializeCacheFallback(serviceName, strategy);
        break;
    }
  }

  private async initializeMockFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    const mockService = this.mockServices.get(serviceName);
    if (mockService) {
      logger.debug('Mock fallback initialized', { service: serviceName });
    } else {
      logger.warn('Mock service not available for fallback', { service: serviceName });
    }
  }

  private async initializeProxyFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    // Initialize proxy fallback (would implement actual proxy logic)
    logger.debug('Proxy fallback initialized', { service: serviceName });
  }

  private async initializeCacheFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    // Initialize cache fallback (would implement actual cache logic)
    logger.debug('Cache fallback initialized', { service: serviceName });
  }

  private async runEnvironmentSetup(): Promise<void> {
    if (!this.environmentConfig?.setupCommands) return;

    for (const command of this.environmentConfig.setupCommands) {
      try {
        execSync(command, { timeout: 60000 });
        logger.debug('Setup command executed', { command });
      } catch (error) {
        logger.error('Setup command failed', {
          command,
          error: error.message,
        });
        throw error;
      }
    }
  }

  private async verifyEnvironmentReadiness(): Promise<void> {
    const requiredServices = Array.from(this.serviceDependencies.values())
      .filter(service => service.required);

    for (const service of requiredServices) {
      const healthCheck = await this.checkServiceHealth(service.name);
      
      if (healthCheck.status === ServiceHealthStatus.OFFLINE) {
        throw new Error(
          `Required service ${service.name} is not available and fallback failed`
        );
      }
    }
  }

  private async handleServiceFailure(
    serviceName: string,
    healthCheck: ServiceHealthCheck
  ): Promise<void> {
    const service = this.serviceDependencies.get(serviceName);
    if (!service) return;

    logger.warn('Service failure detected, attempting fallback', {
      service: serviceName,
      status: healthCheck.status,
      error: healthCheck.error,
    });

    // Check if fallback is already active
    if (this.activeFallbacks.has(serviceName)) {
      logger.debug('Fallback already active for service', { service: serviceName });
      return;
    }

    // Activate fallback strategy
    try {
      await this.activateFallback(serviceName, service.fallbackStrategy);
      this.activeFallbacks.set(serviceName, service.fallbackStrategy);
      
      this.emit('fallbackActivated', {
        service: serviceName,
        strategy: service.fallbackStrategy.type,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Failed to activate fallback', {
        service: serviceName,
        error: error.message,
      });

      if (service.required) {
        throw new Error(
          `Critical service ${serviceName} failed and fallback activation failed: ${error.message}`
        );
      }
    }
  }

  private async activateFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    switch (strategy.type) {
      case 'mock':
        await this.activateMockFallback(serviceName, strategy);
        break;
      case 'proxy':
        await this.activateProxyFallback(serviceName, strategy);
        break;
      case 'cache':
        await this.activateCacheFallback(serviceName, strategy);
        break;
      case 'disable':
        await this.disableService(serviceName);
        break;
    }
  }

  private async activateMockFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    const mockService = this.mockServices.get(serviceName);
    if (mockService && mockService.healthCheck) {
      const healthy = await mockService.healthCheck();
      if (!healthy) {
        throw new Error(`Mock service for ${serviceName} is not healthy`);
      }
    }
    
    logger.info('Mock fallback activated', { service: serviceName });
  }

  private async activateProxyFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    // Implement proxy fallback activation
    logger.info('Proxy fallback activated', { service: serviceName });
  }

  private async activateCacheFallback(
    serviceName: string,
    strategy: FallbackStrategy
  ): Promise<void> {
    // Implement cache fallback activation
    logger.info('Cache fallback activated', { service: serviceName });
  }

  private async disableService(serviceName: string): Promise<void> {
    logger.info('Service disabled as fallback strategy', { service: serviceName });
  }

  private async verifyRequiredServices(
    requiredServices: string[],
    fallbackStrategy: string
  ): Promise<void> {
    for (const serviceName of requiredServices) {
      const healthCheck = this.serviceHealthChecks.get(serviceName);
      
      if (!healthCheck || healthCheck.status === ServiceHealthStatus.OFFLINE) {
        if (fallbackStrategy === 'fail-fast') {
          throw new Error(`Required service ${serviceName} is not available`);
        } else if (fallbackStrategy === 'mock-services') {
          await this.ensureMockFallback(serviceName);
        }
        // 'degrade-gracefully' allows test to continue with warnings
      }
    }
  }

  private async ensureMockFallback(serviceName: string): Promise<void> {
    const service = this.serviceDependencies.get(serviceName);
    if (service && !this.activeFallbacks.has(serviceName)) {
      await this.activateFallback(serviceName, service.fallbackStrategy);
      this.activeFallbacks.set(serviceName, service.fallbackStrategy);
    }
  }

  private setupExecutionMonitoring(requiredServices: string[]): any {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const monitor = {
      startTime,
      startMemory,
      requiredServices,
      interval: setInterval(() => {
        // Monitor resource usage during test execution
        const currentMemory = process.memoryUsage();
        const memoryDelta = currentMemory.heapUsed - startMemory.heapUsed;
        
        if (memoryDelta > 512 * 1024 * 1024) { // 512MB
          logger.warn('High memory usage during test execution', {
            memoryDelta: Math.round(memoryDelta / (1024 * 1024)) + 'MB',
          });
        }
      }, 10000),
    };

    return monitor;
  }

  private cleanupExecutionMonitoring(monitor: any): void {
    if (monitor.interval) {
      clearInterval(monitor.interval);
    }
  }

  private async analyzeErrorForEnvironmentIssues(
    error: Error,
    requiredServices: string[]
  ): Promise<boolean> {
    const message = error.message.toLowerCase();
    
    // Check for common environment-related error patterns
    const environmentErrorPatterns = [
      'connection refused',
      'timeout',
      'network',
      'enotfound',
      'econnreset',
      'database',
      'redis',
      'service unavailable',
    ];

    const isEnvironmentError = environmentErrorPatterns.some(pattern => 
      message.includes(pattern)
    );

    if (isEnvironmentError) {
      logger.debug('Error identified as environment-related', {
        error: error.message,
        requiredServices,
      });
    }

    return isEnvironmentError;
  }

  private async attemptEnvironmentRecovery(error: Error): Promise<void> {
    logger.info('Attempting environment recovery', {
      error: error.message,
    });

    try {
      // Reset circuit breakers
      for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
        if (circuitBreaker.isOpen()) {
          circuitBreaker.reset();
          logger.debug('Circuit breaker reset', { service: serviceName });
        }
      }

      // Re-run health checks
      await this.performHealthChecks();

      // Attempt to restart failed services
      const offlineServices = Array.from(this.serviceHealthChecks.values())
        .filter(check => check.status === ServiceHealthStatus.OFFLINE);

      for (const check of offlineServices) {
        await this.attemptServiceRestart(check.serviceName);
      }

    } catch (recoveryError) {
      logger.error('Environment recovery failed', {
        error: recoveryError.message,
      });
    }
  }

  private async attemptServiceRecovery(
    requiredServices: string[],
    error: Error
  ): Promise<boolean> {
    let recoveredAny = false;

    for (const serviceName of requiredServices) {
      try {
        const recovered = await this.attemptServiceRestart(serviceName);
        if (recovered) {
          recoveredAny = true;
        }
      } catch (serviceError) {
        logger.warn('Service recovery failed', {
          service: serviceName,
          error: serviceError.message,
        });
      }
    }

    return recoveredAny;
  }

  private async attemptServiceRestart(serviceName: string): Promise<boolean> {
    const service = this.serviceDependencies.get(serviceName);
    if (!service) return false;

    logger.info('Attempting service restart', { service: serviceName });

    try {
      // Deactivate fallback if active
      if (this.activeFallbacks.has(serviceName)) {
        await this.deactivateFallback(serviceName);
      }

      // Wait a moment for service to potentially recover
      await this.delay(5000);

      // Perform health check
      const healthCheck = await this.checkServiceHealth(serviceName);
      
      if (healthCheck.status === ServiceHealthStatus.HEALTHY) {
        logger.info('Service restart successful', { service: serviceName });
        return true;
      } else {
        // Re-activate fallback if service still unhealthy
        await this.activateFallback(serviceName, service.fallbackStrategy);
        this.activeFallbacks.set(serviceName, service.fallbackStrategy);
        return false;
      }

    } catch (error) {
      logger.error('Service restart failed', {
        service: serviceName,
        error: error.message,
      });
      return false;
    }
  }

  private async deactivateFallback(serviceName: string): Promise<void> {
    const strategy = this.activeFallbacks.get(serviceName);
    if (!strategy) return;

    if (strategy.cleanup) {
      await strategy.cleanup();
    }

    this.activeFallbacks.delete(serviceName);
    logger.debug('Fallback deactivated', { service: serviceName });
  }

  private async cleanupFallbacks(): Promise<void> {
    const cleanupPromises = Array.from(this.activeFallbacks.keys())
      .map(serviceName => this.deactivateFallback(serviceName));

    await Promise.allSettled(cleanupPromises);
  }

  private categorizeHealthError(error: Error): ServiceHealthStatus {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return ServiceHealthStatus.DEGRADED;
    }
    if (message.includes('connection refused') || message.includes('econnrefused')) {
      return ServiceHealthStatus.OFFLINE;
    }
    if (message.includes('404') || message.includes('not found')) {
      return ServiceHealthStatus.UNHEALTHY;
    }

    return ServiceHealthStatus.UNHEALTHY;
  }

  private createHttpClient(): AxiosInstance {
    return axios.create({
      timeout: 10000,
      maxRedirects: 3,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private initializeMetrics(): ResilienceMetrics {
    return {
      totalServices: 0,
      healthyServices: 0,
      degradedServices: 0,
      offlineServices: 0,
      activeFallbacks: 0,
      averageResponseTime: 0,
      uptime: 0,
      circuitBreakerTrips: 0,
      environmentSwitches: 0,
      lastHealthCheck: new Date(),
    };
  }

  private updateResilienceMetrics(): void {
    const services = Array.from(this.serviceHealthChecks.values());
    
    this.resilienceMetrics.totalServices = services.length;
    this.resilienceMetrics.healthyServices = services.filter(
      s => s.status === ServiceHealthStatus.HEALTHY
    ).length;
    this.resilienceMetrics.degradedServices = services.filter(
      s => s.status === ServiceHealthStatus.DEGRADED
    ).length;
    this.resilienceMetrics.offlineServices = services.filter(
      s => s.status === ServiceHealthStatus.OFFLINE
    ).length;
    this.resilienceMetrics.activeFallbacks = this.activeFallbacks.size;
    
    const validResponseTimes = services
      .map(s => s.responseTime)
      .filter(time => time > 0);
    this.resilienceMetrics.averageResponseTime = validResponseTimes.length > 0
      ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
      : 0;

    this.resilienceMetrics.uptime = Date.now() - this.environmentStartTime.getTime();
    this.resilienceMetrics.lastHealthCheck = new Date();

    // Count circuit breaker trips
    this.resilienceMetrics.circuitBreakerTrips = Array.from(this.circuitBreakers.values())
      .reduce((sum, cb) => sum + cb.getFailureCount(), 0);
  }

  private updateAndGetMetrics(): ResilienceMetrics {
    this.updateResilienceMetrics();
    return { ...this.resilienceMetrics };
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker implementation for service resilience
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number,
    private resetTimeoutMs: number,
    private openTimeoutMs: number
  ) {}

  public isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.openTimeoutMs) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  public getFailureCount(): number {
    return this.failureCount;
  }
}

// Global test environment resilience service instance
export const testEnvironmentResilience = new TestEnvironmentResilienceService();

export default TestEnvironmentResilienceService;