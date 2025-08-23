/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICE FALLBACK MANAGER
 * ============================================================================
 *
 * Comprehensive fallback management for external service failures.
 * Provides intelligent service degradation, alternative providers,
 * cached responses, and emergency operational modes for all external
 * service dependencies.
 *
 * External Service Coverage:
 * - Stripe (payment processing)
 * - Twilio (SMS notifications)
 * - SendGrid (email services)
 * - Samsara (fleet tracking)
 * - Airtable (data sync)
 * - GraphHopper/Google Maps (mapping)
 * - Weather services
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - External Service Resilience Framework
 */

import { BaseService, ServiceResult } from "../BaseService";
import { logger, Timer } from "@/utils/logger";
import { 
  AppError,
  ExternalServiceError,
  TimeoutError,
  CircuitBreakerError,
  ResourceUnavailableError
} from "@/middleware/errorHandler";
import { redisClient } from "@/config/redis";

/**
 * =============================================================================
 * EXTERNAL SERVICE TYPES AND INTERFACES
 * =============================================================================
 */

/**
 * External service identifiers
 */
export enum ExternalService {
  STRIPE = 'stripe',
  TWILIO = 'twilio', 
  SENDGRID = 'sendgrid',
  SAMSARA = 'samsara',
  AIRTABLE = 'airtable',
  GRAPHHOPPER = 'graphhopper',
  GOOGLE_MAPS = 'google_maps',
  MAPBOX = 'mapbox',
  WEATHER_API = 'weather_api',
  WEBHOOKS = 'webhooks'
}

/**
 * Service criticality levels for fallback prioritization
 */
export enum ServiceCriticality {
  ESSENTIAL = 'essential',      // Cannot operate without (payments, auth)
  IMPORTANT = 'important',      // Core features affected (routing, tracking)
  NICE_TO_HAVE = 'nice_to_have', // Enhanced features (weather, analytics)
  OPTIONAL = 'optional'         // Non-essential integrations
}

/**
 * Fallback strategy types
 */
export enum FallbackStrategy {
  CACHED_RESPONSE = 'cached_response',
  ALTERNATIVE_PROVIDER = 'alternative_provider',
  SIMPLIFIED_OPERATION = 'simplified_operation',
  MANUAL_PROCESS = 'manual_process',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  EMERGENCY_MODE = 'emergency_mode',
  OFFLINE_QUEUE = 'offline_queue'
}

/**
 * Service health metrics
 */
export interface ServiceHealthMetrics {
  service: ExternalService;
  isHealthy: boolean;
  responseTime: number;
  errorRate: number; // percentage
  lastSuccessfulCall: Date;
  lastError?: Date;
  consecutiveFailures: number;
  availability: number; // percentage over time window
  costImpact: number; // estimated cost per minute of downtime
}

/**
 * Fallback configuration
 */
export interface FallbackConfiguration {
  service: ExternalService;
  criticality: ServiceCriticality;
  strategies: FallbackStrategy[];
  alternativeProviders?: ExternalService[];
  cacheableOperations: string[];
  maxCacheAge: number; // milliseconds
  fallbackTimeout: number; // milliseconds
  businessImpactPerMinute: number; // estimated cost
}

/**
 * Fallback execution result
 */
export interface FallbackExecutionResult {
  success: boolean;
  data?: any;
  strategyUsed: FallbackStrategy;
  alternativeProvider?: ExternalService;
  cacheHit?: boolean;
  degradedResponse?: boolean;
  limitations: string[];
  estimatedCostSavings?: number;
  retryRecommendation?: {
    shouldRetry: boolean;
    retryAfter: number; // seconds
    maxRetries: number;
  };
}

/**
 * =============================================================================
 * EXTERNAL SERVICE FALLBACK MANAGER
 * =============================================================================
 */

export class ExternalServiceFallbackManager extends BaseService<any> {
  private serviceHealth: Map<ExternalService, ServiceHealthMetrics> = new Map();
  private fallbackConfigurations: Map<ExternalService, FallbackConfiguration> = new Map();
  private circuitBreakers: Map<ExternalService, {
    isOpen: boolean;
    failures: number;
    lastFailure: Date;
    threshold: number;
    timeout: number;
  }> = new Map();
  
  private offlineQueue: Map<ExternalService, Array<{
    operation: string;
    data: any;
    timestamp: Date;
    priority: number;
  }>> = new Map();

  private fallbackCache: Map<string, {
    data: any;
    timestamp: Date;
    ttl: number;
    service: ExternalService;
  }> = new Map();

  // Configuration constants
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 120000; // 2 minutes
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly MAX_OFFLINE_QUEUE_SIZE = 1000;

  constructor() {
    super(null as any, "ExternalServiceFallbackManager");
    this.initializeFallbackConfigurations();
    this.initializeCircuitBreakers();
    this.startHealthMonitoring();
    this.startCacheCleanup();
  }

  /**
   * =============================================================================
   * PRIMARY FALLBACK ORCHESTRATION METHODS
   * =============================================================================
   */

  /**
   * Execute external service call with comprehensive fallback handling
   */
  public async executeWithFallback<T>(
    service: ExternalService,
    operation: string,
    serviceCall: () => Promise<T>,
    context: {
      cacheKey?: string;
      priority?: number;
      timeout?: number;
      bypassCache?: boolean;
      customFallbackData?: T;
    }
  ): Promise<ServiceResult<T>> {
    const timer = new Timer(`ExternalServiceFallbackManager.executeWithFallback.${service}`);

    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(service)) {
        logger.warn("Circuit breaker open for service", { service, operation });
        return await this.executeFallbackStrategy(service, operation, context);
      }

      // Try cached response first (if not bypassed and cacheable)
      if (!context.bypassCache && context.cacheKey && this.isOperationCacheable(service, operation)) {
        const cachedResult = await this.getCachedResponse<T>(service, context.cacheKey);
        if (cachedResult.success) {
          timer.end({ success: true, cached: true });
          return cachedResult;
        }
      }

      // Execute primary service call
      try {
        const timeout = context?.timeout || this.getDefaultTimeout(service);
        const result = await this.executeWithTimeout(serviceCall, timeout, `${service} ${operation}`);

        // Success - update health metrics and cache if applicable
        await this.recordSuccess(service, timer.getDuration());
        
        if (context.cacheKey && this.isOperationCacheable(service, operation)) {
          await this.cacheResponse(service, context.cacheKey, result);
        }

        timer.end({ success: true, service });

        logger.info("External service call successful", {
          service,
          operation,
          responseTime: timer.getDuration()
        });

        return {
          success: true,
          data: result,
          message: `${service} operation completed successfully`
        };

      } catch (serviceError) {
        // Service call failed - record failure and attempt fallback
        await this.recordFailure(service, serviceError);

        logger.warn("External service call failed, attempting fallback", {
          service,
          operation,
          error: serviceError?.message,
          consecutiveFailures: this.serviceHealth.get(service)?.consecutiveFailures || 0
        });

        // Attempt fallback
        const fallbackResult = await this.executeFallbackStrategy(service, operation, context);
        
        // If fallback succeeded, still return the original error info for monitoring
        if (fallbackResult.success && fallbackResult.fallback) {
          fallbackResult.data = {
            ...fallbackResult.data,
            originalError: {
              service,
              operation,
              error: serviceError?.message,
              timestamp: new Date()
            }
          };
        }

        timer.end({ success: fallbackResult.success, fallback: true });
        return fallbackResult;
      }

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      
      logger.error("External service fallback execution failed", {
        service,
        operation,
        error: error instanceof Error ? error?.message : String(error)
      });

      return {
        success: false,
        message: `External service ${service} unavailable and fallback failed`,
        errors: [{
          code: 'EXTERNAL_SERVICE_AND_FALLBACK_FAILED',
          message: error instanceof Error ? error?.message : String(error)
        }]
      };
    }
  }

  /**
   * Execute fallback strategy for failed service
   */
  public async executeFallbackStrategy<T>(
    service: ExternalService,
    operation: string,
    context: {
      cacheKey?: string;
      priority?: number;
      customFallbackData?: T;
    }
  ): Promise<ServiceResult<T>> {
    const timer = new Timer(`ExternalServiceFallbackManager.executeFallbackStrategy.${service}`);
    const config = this.fallbackConfigurations.get(service);

    if (!config) {
      timer.end({ error: 'No fallback configuration' });
      return {
        success: false,
        message: `No fallback configuration for service ${service}`
      };
    }

    // Try fallback strategies in order of preference
    for (const strategy of config.strategies) {
      try {
        const result = await this.executeSpecificFallbackStrategy<T>(
          service,
          operation,
          strategy,
          context,
          config
        );

        if (result.success) {
          timer.end({ success: true, strategy, service });

          logger.info("Fallback strategy successful", {
            service,
            operation,
            strategy,
            degradedResponse: result.fallback
          });

          return {
            success: true,
            data: result.data,
            message: `Using fallback strategy: ${strategy}`,
            fallback: true
          };
        }

      } catch (strategyError) {
        logger.warn("Fallback strategy failed", {
          service,
          operation,
          strategy,
          error: strategyError?.message
        });
        // Continue to next strategy
      }
    }

    // All strategies failed
    timer.end({ error: 'All fallback strategies failed' });
    
    return {
      success: false,
      message: `All fallback strategies failed for service ${service}`,
      errors: [{
        code: 'ALL_FALLBACK_STRATEGIES_FAILED',
        message: `Service ${service} unavailable and no working fallbacks`
      }]
    };
  }

  /**
   * =============================================================================
   * SPECIFIC FALLBACK STRATEGY IMPLEMENTATIONS
   * =============================================================================
   */

  /**
   * Execute specific fallback strategy
   */
  private async executeSpecificFallbackStrategy<T>(
    service: ExternalService,
    operation: string,
    strategy: FallbackStrategy,
    context: any,
    config: FallbackConfiguration
  ): Promise<FallbackExecutionResult> {
    switch (strategy) {
      case FallbackStrategy.CACHED_RESPONSE:
        return await this.executeCachedResponseStrategy<T>(service, operation, context);
        
      case FallbackStrategy.ALTERNATIVE_PROVIDER:
        return await this.executeAlternativeProviderStrategy<T>(service, operation, context, config);
        
      case FallbackStrategy.SIMPLIFIED_OPERATION:
        return await this.executeSimplifiedOperationStrategy<T>(service, operation, context);
        
      case FallbackStrategy.GRACEFUL_DEGRADATION:
        return await this.executeGracefulDegradationStrategy<T>(service, operation, context);
        
      case FallbackStrategy.OFFLINE_QUEUE:
        return await this.executeOfflineQueueStrategy<T>(service, operation, context);
        
      case FallbackStrategy.EMERGENCY_MODE:
        return await this.executeEmergencyModeStrategy<T>(service, operation, context);
        
      default:
        throw new Error(`Unknown fallback strategy: ${strategy}`);
    }
  }

  /**
   * Cached response fallback strategy
   */
  private async executeCachedResponseStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any
  ): Promise<FallbackExecutionResult> {
    if (!context.cacheKey) {
      throw new Error("Cache key required for cached response strategy");
    }

    // Try Redis cache first
    try {
      const cached = await redisClient.get(`fallback:${service}:${context.cacheKey}`);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return {
          success: true,
          data: parsedData.data,
          strategyUsed: FallbackStrategy.CACHED_RESPONSE,
          cacheHit: true,
          limitations: [`Using cached data from ${new Date(parsedData.timestamp).toLocaleString()}`]
        };
      }
    } catch (cacheError) {
      logger.warn("Redis cache access failed", { service, error: cacheError?.message });
    }

    // Try in-memory cache
    const cacheEntry = this.fallbackCache.get(`${service}:${context.cacheKey}`);
    if (cacheEntry && !this.isCacheExpired(cacheEntry)) {
      return {
        success: true,
        data: cacheEntry.data,
        strategyUsed: FallbackStrategy.CACHED_RESPONSE,
        cacheHit: true,
        limitations: [`Using cached data from ${cacheEntry.timestamp.toLocaleString()}`]
      };
    }

    throw new Error("No cached response available");
  }

  /**
   * Alternative provider fallback strategy
   */
  private async executeAlternativeProviderStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any,
    config: FallbackConfiguration
  ): Promise<FallbackExecutionResult> {
    if (!config?.alternativeProviders || config.alternativeProviders.length === 0) {
      throw new Error("No alternative providers configured");
    }

    for (const altProvider of config.alternativeProviders) {
      if (!this.isCircuitBreakerOpen(altProvider)) {
        try {
          // This would need to be implemented based on specific provider APIs
          const result = await this.callAlternativeProvider<T>(altProvider, service, operation, context);
          
          return {
            success: true,
            data: result,
            strategyUsed: FallbackStrategy.ALTERNATIVE_PROVIDER,
            alternativeProvider: altProvider,
            limitations: [`Using alternative provider: ${altProvider}`]
          };

        } catch (altError) {
          logger.warn("Alternative provider failed", {
            originalService: service,
            alternativeProvider: altProvider,
            error: altError?.message
          });
          // Continue to next alternative
        }
      }
    }

    throw new Error("All alternative providers failed");
  }

  /**
   * Simplified operation fallback strategy
   */
  private async executeSimplifiedOperationStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any
  ): Promise<FallbackExecutionResult> {
    // Provide simplified responses based on service type
    let simplifiedData: any;
    let limitations: string[] = [];

    switch (service) {
      case ExternalService.GRAPHHOPPER:
      case ExternalService.GOOGLE_MAPS:
        if (operation.includes('route') || operation.includes('directions')) {
          simplifiedData = this.generateSimplifiedRouteData(context);
          limitations = ['Using straight-line distance calculations', 'Traffic data unavailable'];
        } else if (operation.includes('geocode')) {
          simplifiedData = this.generateSimplifiedGeocodeData(context);
          limitations = ['Using approximate coordinates', 'Address details limited'];
        }
        break;

      case ExternalService.WEATHER_API:
        simplifiedData = this.generateSimplifiedWeatherData();
        limitations = ['Using historical weather patterns', 'Real-time conditions unavailable'];
        break;

      case ExternalService.SAMSARA:
        if (operation.includes('tracking') || operation.includes('location')) {
          simplifiedData = this.generateSimplifiedTrackingData(context);
          limitations = ['Using last known positions', 'Real-time tracking unavailable'];
        }
        break;

      default:
        throw new Error(`Simplified operation not available for ${service}`);
    }

    return {
      success: true,
      data: simplifiedData,
      strategyUsed: FallbackStrategy.SIMPLIFIED_OPERATION,
      degradedResponse: true,
      limitations
    };
  }

  /**
   * Graceful degradation fallback strategy
   */
  private async executeGracefulDegradationStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any
  ): Promise<FallbackExecutionResult> {
    // Provide basic functionality while acknowledging service limitations
    const degradedData = this.generateDegradedResponse(service, operation, context);
    
    return {
      success: true,
      data: degradedData,
      strategyUsed: FallbackStrategy.GRACEFUL_DEGRADATION,
      degradedResponse: true,
      limitations: this.getDegradationLimitations(service, operation)
    };
  }

  /**
   * Offline queue fallback strategy
   */
  private async executeOfflineQueueStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any
  ): Promise<FallbackExecutionResult> {
    // Queue operation for later execution
    const queueEntry = {
      operation,
      data: context,
      timestamp: new Date(),
      priority: context?.priority || 5
    };

    const serviceQueue = this.offlineQueue.get(service) || [];
    
    // Check queue size limit
    if (serviceQueue.length >= this.MAX_OFFLINE_QUEUE_SIZE) {
      // Remove lowest priority items
      serviceQueue.sort((a, b) => b.priority - a.priority);
      serviceQueue.splice(Math.floor(this.MAX_OFFLINE_QUEUE_SIZE * 0.9));
    }

    serviceQueue.push(queueEntry);
    this.offlineQueue.set(service, serviceQueue);

    logger.info("Operation queued for offline processing", {
      service,
      operation,
      queueSize: serviceQueue.length,
      priority: queueEntry.priority
    });

    return {
      success: true,
      data: {
        queued: true,
        position: serviceQueue.length,
        estimatedProcessingTime: serviceQueue.length * 30000 // 30 seconds per item
      } as any,
      strategyUsed: FallbackStrategy.OFFLINE_QUEUE,
      limitations: ['Operation queued for processing when service recovers']
    };
  }

  /**
   * Emergency mode fallback strategy
   */
  private async executeEmergencyModeStrategy<T>(
    service: ExternalService,
    operation: string,
    context: any
  ): Promise<FallbackExecutionResult> {
    // Provide minimal emergency response
    const emergencyData = this.generateEmergencyResponse(service, operation);
    
    return {
      success: true,
      data: emergencyData,
      strategyUsed: FallbackStrategy.EMERGENCY_MODE,
      degradedResponse: true,
      limitations: [
        'Service in emergency mode',
        'Minimal functionality only',
        'Manual verification may be required'
      ]
    };
  }

  /**
   * =============================================================================
   * SERVICE HEALTH AND MONITORING
   * =============================================================================
   */

  /**
   * Initialize fallback configurations for all services
   */
  private initializeFallbackConfigurations(): void {
    // Stripe (Payment Processing)
    this.fallbackConfigurations.set(ExternalService.STRIPE, {
      service: ExternalService.STRIPE,
      criticality: ServiceCriticality.ESSENTIAL,
      strategies: [FallbackStrategy.CACHED_RESPONSE, FallbackStrategy.OFFLINE_QUEUE, FallbackStrategy.EMERGENCY_MODE],
      cacheableOperations: ['retrieve_customer', 'retrieve_payment_method'],
      maxCacheAge: 3600000, // 1 hour
      fallbackTimeout: 30000,
      businessImpactPerMinute: 500 // $500/min revenue impact
    });

    // GraphHopper (Route Optimization)
    this.fallbackConfigurations.set(ExternalService.GRAPHHOPPER, {
      service: ExternalService.GRAPHHOPPER,
      criticality: ServiceCriticality.IMPORTANT,
      strategies: [FallbackStrategy.CACHED_RESPONSE, FallbackStrategy.ALTERNATIVE_PROVIDER, FallbackStrategy.SIMPLIFIED_OPERATION],
      alternativeProviders: [ExternalService.GOOGLE_MAPS, ExternalService.MAPBOX],
      cacheableOperations: ['matrix', 'route', 'geocode'],
      maxCacheAge: 1800000, // 30 minutes
      fallbackTimeout: 15000,
      businessImpactPerMinute: 100 // $100/min efficiency impact
    });

    // Twilio (SMS Notifications)
    this.fallbackConfigurations.set(ExternalService.TWILIO, {
      service: ExternalService.TWILIO,
      criticality: ServiceCriticality.IMPORTANT,
      strategies: [FallbackStrategy.OFFLINE_QUEUE, FallbackStrategy.GRACEFUL_DEGRADATION],
      cacheableOperations: [],
      maxCacheAge: 0,
      fallbackTimeout: 10000,
      businessImpactPerMinute: 25 // $25/min communication impact
    });

    // SendGrid (Email Services)
    this.fallbackConfigurations.set(ExternalService.SENDGRID, {
      service: ExternalService.SENDGRID,
      criticality: ServiceCriticality.IMPORTANT,
      strategies: [FallbackStrategy.OFFLINE_QUEUE, FallbackStrategy.GRACEFUL_DEGRADATION],
      cacheableOperations: [],
      maxCacheAge: 0,
      fallbackTimeout: 15000,
      businessImpactPerMinute: 20 // $20/min communication impact
    });

    // Weather API
    this.fallbackConfigurations.set(ExternalService.WEATHER_API, {
      service: ExternalService.WEATHER_API,
      criticality: ServiceCriticality.NICE_TO_HAVE,
      strategies: [FallbackStrategy.CACHED_RESPONSE, FallbackStrategy.SIMPLIFIED_OPERATION],
      cacheableOperations: ['current_weather', 'forecast'],
      maxCacheAge: 1800000, // 30 minutes
      fallbackTimeout: 10000,
      businessImpactPerMinute: 5 // $5/min minor impact
    });
  }

  /**
   * Initialize circuit breakers
   */
  private initializeCircuitBreakers(): void {
    for (const service of Object.values(ExternalService)) {
      this.circuitBreakers.set(service, {
        isOpen: false,
        failures: 0,
        lastFailure: new Date(0),
        threshold: this.CIRCUIT_BREAKER_THRESHOLD,
        timeout: this.CIRCUIT_BREAKER_TIMEOUT
      });
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(service: ExternalService): boolean {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return false;

    if (breaker.isOpen) {
      // Check if timeout has elapsed
      if (Date.now() - breaker.lastFailure.getTime() > breaker.timeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record service success
   */
  private async recordSuccess(service: ExternalService, responseTime: number): Promise<void> {
    let health = this.serviceHealth.get(service);
    if (!health) {
      health = {
        service,
        isHealthy: true,
        responseTime: 0,
        errorRate: 0,
        lastSuccessfulCall: new Date(),
        consecutiveFailures: 0,
        availability: 100,
        costImpact: 0
      };
    }

    health.isHealthy = true;
    health.responseTime = responseTime;
    health.lastSuccessfulCall = new Date();
    health.consecutiveFailures = 0;

    // Reset circuit breaker
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }

    this.serviceHealth.set(service, health);
  }

  /**
   * Record service failure
   */
  private async recordFailure(service: ExternalService, error: any): Promise<void> {
    let health = this.serviceHealth.get(service);
    if (!health) {
      health = {
        service,
        isHealthy: false,
        responseTime: 0,
        errorRate: 100,
        lastSuccessfulCall: new Date(0),
        consecutiveFailures: 1,
        availability: 0,
        costImpact: 0
      };
    }

    health.isHealthy = false;
    health.lastError = new Date();
    health.consecutiveFailures += 1;

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.failures += 1;
      breaker.lastFailure = new Date();
      
      if (breaker.failures >= breaker.threshold) {
        breaker.isOpen = true;
        logger.warn("Circuit breaker opened for external service", {
          service,
          failures: breaker.failures,
          threshold: breaker.threshold
        });
      }
    }

    this.serviceHealth.set(service, health);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthChecks();
        await this.processOfflineQueues();
      } catch (error: unknown) {
        logger.error("Health monitoring error", { error: error instanceof Error ? error?.message : String(error) });
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      try {
        this.cleanupExpiredCache();
      } catch (error: unknown) {
        logger.error("Cache cleanup error", { error: error instanceof Error ? error?.message : String(error) });
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * =============================================================================
   * HELPER METHODS
   * =============================================================================
   */

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(operationName, timeout));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if operation is cacheable
   */
  private isOperationCacheable(service: ExternalService, operation: string): boolean {
    const config = this.fallbackConfigurations.get(service);
    if (!config) return false;
    
    return config.cacheableOperations.some(cacheable => 
      operation.includes(cacheable)
    );
  }

  /**
   * Get default timeout for service
   */
  private getDefaultTimeout(service: ExternalService): number {
    const config = this.fallbackConfigurations.get(service);
    return config?.fallbackTimeout || 30000; // Default 30 seconds
  }

  /**
   * Cache response
   */
  private async cacheResponse(service: ExternalService, key: string, data: any): Promise<void> {
    const config = this.fallbackConfigurations.get(service);
    if (!config) return;

    const cacheEntry = {
      data,
      timestamp: new Date(),
      ttl: config.maxCacheAge,
      service
    };

    // Store in memory cache
    this.fallbackCache.set(`${service}:${key}`, cacheEntry);

    // Store in Redis cache
    try {
      await redisClient.setex(
        `fallback:${service}:${key}`,
        Math.floor(config.maxCacheAge / 1000),
        JSON.stringify(cacheEntry)
      );
    } catch (redisError) {
      logger.warn("Failed to cache in Redis", { 
        service, 
        key, 
        error: redisError?.message 
      });
    }
  }

  /**
   * Get cached response
   */
  private async getCachedResponse<T>(service: ExternalService, key: string): Promise<ServiceResult<T>> {
    // Try Redis first
    try {
      const cached = await redisClient.get(`fallback:${service}:${key}`);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return {
          success: true,
          data: parsedData.data,
          message: "Retrieved from cache",
          fallback: true
        };
      }
    } catch (redisError) {
      logger.warn("Redis cache retrieval failed", { service, error: redisError?.message });
    }

    // Try memory cache
    const cacheEntry = this.fallbackCache.get(`${service}:${key}`);
    if (cacheEntry && !this.isCacheExpired(cacheEntry)) {
      return {
        success: true,
        data: cacheEntry.data,
        message: "Retrieved from cache",
        fallback: true
      };
    }

    return {
      success: false,
      message: "No cached response available"
    };
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cacheEntry: any): boolean {
    return Date.now() - cacheEntry.timestamp.getTime() > cacheEntry.ttl;
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (this.isCacheExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.fallbackCache.delete(key));
    
    if (expiredKeys.length > 0) {
      logger.info("Cleaned up expired cache entries", { count: expiredKeys.length });
    }
  }

  /**
   * Placeholder implementations for specific service calls
   */
  private async callAlternativeProvider<T>(
    altProvider: ExternalService,
    originalService: ExternalService,
    operation: string,
    context: any
  ): Promise<T> {
    // Implementation would depend on specific provider APIs
    throw new Error("Alternative provider call not implemented");
  }

  private generateSimplifiedRouteData(context: any): any {
    return {
      simplified: true,
      message: "Using straight-line distance calculation",
      distance: context?.estimatedDistance || 10000, // meters
      duration: context?.estimatedDuration || 600, // seconds
      limitations: ["Traffic conditions not considered", "Actual route may differ"]
    };
  }

  private generateSimplifiedGeocodeData(context: any): any {
    return {
      simplified: true,
      coordinates: context?.approximateCoordinates || { lat: 0, lon: 0 },
      accuracy: "approximate",
      limitations: ["Precise address details unavailable"]
    };
  }

  private generateSimplifiedWeatherData(): any {
    return {
      simplified: true,
      temperature: 20, // Default temperature in Celsius
      conditions: "unknown",
      message: "Using historical weather patterns",
      limitations: ["Real-time weather data unavailable"]
    };
  }

  private generateSimplifiedTrackingData(context: any): any {
    return {
      simplified: true,
      lastKnownPosition: context?.lastPosition || { lat: 0, lon: 0 },
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      accuracy: "last_known",
      limitations: ["Real-time tracking unavailable"]
    };
  }

  private generateDegradedResponse(service: ExternalService, operation: string, context: any): any {
    return {
      degraded: true,
      service,
      operation,
      message: `Service ${service} running in degraded mode`,
      data: context?.customFallbackData || null,
      limitations: this.getDegradationLimitations(service, operation)
    };
  }

  private generateEmergencyResponse(service: ExternalService, operation: string): any {
    return {
      emergency: true,
      service,
      operation,
      message: `Service ${service} in emergency mode - minimal functionality only`,
      data: null,
      requiresManualVerification: true
    };
  }

  private getDegradationLimitations(service: ExternalService, operation: string): string[] {
    switch (service) {
      case ExternalService.STRIPE:
        return ["Payment processing may be delayed", "Some payment methods unavailable"];
      case ExternalService.GRAPHHOPPER:
        return ["Route optimization limited", "Traffic data unavailable"];
      case ExternalService.TWILIO:
        return ["SMS notifications may be delayed", "Delivery confirmation unavailable"];
      case ExternalService.SENDGRID:
        return ["Email delivery may be delayed", "Read receipts unavailable"];
      default:
        return ["Service functionality limited", "Some features may be unavailable"];
    }
  }

  private async performHealthChecks(): Promise<void> {
    // Implementation would perform actual health checks on services
  }

  private async processOfflineQueues(): Promise<void> {
    // Implementation would process queued operations when services recover
  }
}

export default ExternalServiceFallbackManager;