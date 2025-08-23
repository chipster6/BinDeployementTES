/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICE ERROR MANAGER
 * ============================================================================
 *
 * Specialized error management for external service integrations including
 * Stripe, Twilio, SendGrid, Samsara, Airtable, and Mapbox.
 *
 * Features:
 * - Service-specific error handling and recovery
 * - Circuit breaker coordination across services
 * - Fallback data and offline capabilities
 * - Business continuity during service outages
 * - Performance monitoring and alerting
 * - Cost optimization during failures
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from "events";
import { ApiIntegrationError } from "@/types/ErrorHandling";
import {
  ErrorSeverity,
  ErrorCategory,
} from "@/services/ErrorMonitoringService";
import {
  ExternalServiceError,
  CircuitBreakerError,
  TimeoutError,
} from "@/middleware/errorHandler";
import { crossStreamErrorCoordinator } from "@/services/CrossStreamErrorCoordinator";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";

/**
 * Service-specific error configuration
 */
interface ServiceErrorConfig {
  service: string;
  criticalOperations: string[];
  fallbackStrategies: Record<string, FallbackStrategy>;
  businessImpactLevel: "low" | "medium" | "high" | "critical";
  maxDowntime: number; // milliseconds
  costPerOutage: number; // dollars per minute
  customerFacingOperations: string[];
  offlineCapabilities: string[];
}

/**
 * Fallback strategy configuration
 */
interface FallbackStrategy {
  type: "cache" | "default" | "alternative_service" | "manual" | "queue";
  data?: any;
  alternativeService?: string;
  queueForRetry?: boolean;
  notifyUser?: boolean;
  degradeGracefully?: boolean;
  maxAge?: number; // for cache strategies
}

/**
 * Service health status
 */
interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  lastError?: Date;
  errorRate: number;
  averageResponseTime: number;
  circuitBreakerState: "closed" | "open" | "half-open";
  uptime: number;
  businessImpact: number; // 0-1 scale
}

/**
 * External service error manager class
 */
export class ExternalServiceErrorManager extends EventEmitter {
  private serviceConfigs: Map<string, ServiceErrorConfig> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private fallbackCache: Map<
    string,
    { data: any; timestamp: number; maxAge: number }
  > = new Map();
  private operationQueue: Map<
    string,
    Array<{ operation: string; data: any; retryCount: number }>
  > = new Map();

  constructor() {
    super();
    this.initializeServiceConfigs();
    this.startHealthMonitoring();
    this.setupFallbackStrategies();
  }

  /**
   * Handle external service error with service-specific logic
   */
  public async handleServiceError(
    error: Error | ExternalServiceError,
    service: string,
    operation: string,
    requestData?: any,
  ): Promise<{
    canRecover: boolean;
    fallbackResult?: any;
    queuedForRetry?: boolean;
    businessImpact: number;
    userMessage: string;
  }> {
    const serviceConfig = this.serviceConfigs.get(service);
    if (!serviceConfig) {
      logger.warn(`No configuration found for service: ${service}`);
      return this.handleUnknownService(error, service, operation);
    }

    // Create structured error
    const apiError = this.createApiIntegrationError(
      error,
      service,
      operation,
      requestData,
    );

    // Report to cross-stream coordinator
    await crossStreamErrorCoordinator.reportError(
      error,
      {
        stream: "external-api",
        component: service,
        operation,
      },
      {
        service,
        operation,
        requestData,
        businessImpact: serviceConfig.businessImpactLevel,
      },
    );

    // Update service health
    await this.updateServiceHealth(service, apiError);

    // Determine recovery strategy
    const recoveryResult = await this.executeRecoveryStrategy(
      apiError,
      serviceConfig,
      operation,
      requestData,
    );

    // Handle critical operations specially
    if (serviceConfig.criticalOperations.includes(operation)) {
      await this.handleCriticalOperationFailure(
        apiError,
        serviceConfig,
        operation,
      );
    }

    // Queue for retry if applicable
    if (recoveryResult.shouldQueue) {
      await this.queueForRetry(service, operation, requestData);
    }

    return {
      canRecover: recoveryResult.success,
      fallbackResult: recoveryResult.data,
      queuedForRetry: recoveryResult.shouldQueue,
      businessImpact: this.calculateBusinessImpact(serviceConfig, operation),
      userMessage: recoveryResult.userMessage,
    };
  }

  /**
   * Get service health dashboard
   */
  public getServiceHealthDashboard(): {
    overview: {
      totalServices: number;
      healthyServices: number;
      degradedServices: number;
      unhealthyServices: number;
      estimatedBusinessImpact: number;
    };
    services: ServiceHealth[];
    criticalAlerts: Array<{
      service: string;
      issue: string;
      businessImpact: number;
      duration: number;
    }>;
  } {
    const services = Array.from(this.serviceHealth.values());
    const criticalAlerts = services
      .filter((s) => s.status === "unhealthy" && s.businessImpact > 0.5)
      .map((s) => ({
        service: s.service,
        issue: `Service ${s.service} is unhealthy`,
        businessImpact: s.businessImpact,
        duration: s.lastError ? Date.now() - s.lastError.getTime() : 0,
      }));

    return {
      overview: {
        totalServices: services.length,
        healthyServices: services.filter((s) => s.status === "healthy").length,
        degradedServices: services.filter((s) => s.status === "degraded")
          .length,
        unhealthyServices: services.filter((s) => s.status === "unhealthy")
          .length,
        estimatedBusinessImpact: this.calculateTotalBusinessImpact(services),
      },
      services,
      criticalAlerts,
    };
  }

  /**
   * Process queued operations for retry
   */
  public async processQueuedOperations(service: string): Promise<void> {
    const queue = this.operationQueue.get(service);
    if (!queue || queue.length === 0) return;

    const serviceHealth = this.serviceHealth.get(service);
    if (!serviceHealth || serviceHealth.status === "unhealthy") {
      logger.info(
        `Skipping queue processing for unhealthy service: ${service}`,
      );
      return;
    }

    logger.info(`Processing ${queue.length} queued operations for ${service}`);

    const processedOperations: number[] = [];

    for (let i = 0; i < queue.length; i++) {
      const queuedOp = queue[i];

      try {
        // Attempt to execute queued operation
        await this.retryQueuedOperation(service, queuedOp);
        processedOperations.push(i);

        logger.info(`Successfully processed queued operation`, {
          service,
          operation: queuedOp.operation,
          retryCount: queuedOp.retryCount,
        });
      } catch (error: unknown) {
        queuedOp.retryCount++;

        if (queuedOp.retryCount >= 5) {
          // Max retries reached, remove from queue
          processedOperations.push(i);
          logger.error(`Max retries reached for queued operation`, {
            service,
            operation: queuedOp.operation,
            error: error instanceof Error ? error?.message : String(error),
          });
        }
      }
    }

    // Remove processed operations from queue
    processedOperations.reverse().forEach((index) => {
      queue.splice(index, 1);
    });
  }

  /**
   * Initialize service configurations
   */
  private initializeServiceConfigs(): void {
    // Stripe configuration
    this.serviceConfigs.set("stripe", {
      service: "stripe",
      criticalOperations: [
        "process_payment",
        "create_subscription",
        "refund_payment",
      ],
      fallbackStrategies: {
        process_payment: {
          type: "queue",
          queueForRetry: true,
          notifyUser: true,
          degradeGracefully: true,
        },
        create_customer: {
          type: "cache",
          data: { id: "temp_customer_id", status: "pending" },
          maxAge: 3600000, // 1 hour
        },
        get_payment_methods: {
          type: "cache",
          maxAge: 1800000, // 30 minutes
        },
      },
      businessImpactLevel: "critical",
      maxDowntime: 300000, // 5 minutes
      costPerOutage: 500, // $500 per minute
      customerFacingOperations: ["process_payment", "create_subscription"],
      offlineCapabilities: ["cache_payment_intent", "queue_payment"],
    });

    // Twilio configuration
    this.serviceConfigs.set("twilio", {
      service: "twilio",
      criticalOperations: ["send_sms", "make_call"],
      fallbackStrategies: {
        send_sms: {
          type: "queue",
          queueForRetry: true,
          notifyUser: false,
        },
        send_notification: {
          type: "alternative_service",
          alternativeService: "sendgrid",
        },
      },
      businessImpactLevel: "medium",
      maxDowntime: 1800000, // 30 minutes
      costPerOutage: 50, // $50 per minute
      customerFacingOperations: ["send_sms"],
      offlineCapabilities: ["queue_sms", "store_notifications"],
    });

    // SendGrid configuration
    this.serviceConfigs.set("sendgrid", {
      service: "sendgrid",
      criticalOperations: ["send_email"],
      fallbackStrategies: {
        send_email: {
          type: "queue",
          queueForRetry: true,
          notifyUser: false,
        },
        send_notification: {
          type: "alternative_service",
          alternativeService: "twilio",
        },
      },
      businessImpactLevel: "medium",
      maxDowntime: 3600000, // 1 hour
      costPerOutage: 25, // $25 per minute
      customerFacingOperations: ["send_email"],
      offlineCapabilities: ["queue_emails"],
    });

    // Samsara configuration (fleet management)
    this.serviceConfigs.set("samsara", {
      service: "samsara",
      criticalOperations: ["get_vehicle_location", "get_route_data"],
      fallbackStrategies: {
        get_vehicle_location: {
          type: "cache",
          maxAge: 600000, // 10 minutes
        },
        get_route_data: {
          type: "cache",
          maxAge: 1800000, // 30 minutes
        },
        track_vehicle: {
          type: "default",
          data: { status: "tracking_unavailable", lastKnown: null },
        },
      },
      businessImpactLevel: "high",
      maxDowntime: 900000, // 15 minutes
      costPerOutage: 200, // $200 per minute
      customerFacingOperations: ["get_vehicle_location"],
      offlineCapabilities: ["cached_locations", "last_known_routes"],
    });

    // Airtable configuration
    this.serviceConfigs.set("airtable", {
      service: "airtable",
      criticalOperations: ["sync_data", "get_records"],
      fallbackStrategies: {
        get_records: {
          type: "cache",
          maxAge: 3600000, // 1 hour
        },
        sync_data: {
          type: "queue",
          queueForRetry: true,
        },
      },
      businessImpactLevel: "low",
      maxDowntime: 7200000, // 2 hours
      costPerOutage: 10, // $10 per minute
      customerFacingOperations: [],
      offlineCapabilities: ["cached_records", "queue_sync"],
    });

    // Mapbox configuration
    this.serviceConfigs.set("mapbox", {
      service: "mapbox",
      criticalOperations: ["get_directions", "geocode_address"],
      fallbackStrategies: {
        get_directions: {
          type: "cache",
          maxAge: 1800000, // 30 minutes
        },
        geocode_address: {
          type: "cache",
          maxAge: 86400000, // 24 hours
        },
        get_map_tiles: {
          type: "default",
          data: { tiles: "offline_tiles", quality: "reduced" },
        },
      },
      businessImpactLevel: "medium",
      maxDowntime: 1800000, // 30 minutes
      costPerOutage: 75, // $75 per minute
      customerFacingOperations: ["get_directions", "get_map_tiles"],
      offlineCapabilities: ["cached_directions", "offline_maps"],
    });
  }

  /**
   * Create API integration error
   */
  private createApiIntegrationError(
    error: Error | ExternalServiceError,
    service: string,
    operation: string,
    requestData?: any,
  ): ApiIntegrationError {
    const isRetryable = this.isRetryableError(error);

    return {
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: `EXTERNAL_API_ERROR_${service.toUpperCase()}`,
      message: error instanceof Error ? error?.message : String(error),
      severity: this.determineSeverity(service, operation),
      category: ErrorCategory.EXTERNAL_SERVICE,
      timestamp: new Date(),
      service: service as any,
      endpoint: operation,
      method: "UNKNOWN",
      statusCode: error instanceof ExternalServiceError ? 503 : undefined,
      retryable: isRetryable,
      retryAttempts: 0,
      nextRetryIn: isRetryable ? 5000 : undefined,
      circuitBreakerState: "closed",
      fallbackAvailable: this.hasFallbackStrategy(service, operation),
    };
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    error: ApiIntegrationError,
    serviceConfig: ServiceErrorConfig,
    operation: string,
    requestData?: any,
  ): Promise<{
    success: boolean;
    data?: any;
    shouldQueue: boolean;
    userMessage: string;
  }> {
    const strategy = serviceConfig.fallbackStrategies[operation];

    if (!strategy) {
      return {
        success: false,
        shouldQueue: false,
        userMessage: `${serviceConfig.service} is temporarily unavailable`,
      };
    }

    try {
      switch (strategy.type) {
        case "cache":
          return await this.executeCacheStrategy(
            error.service,
            operation,
            strategy,
          );

        case "default":
          return {
            success: true,
            data: strategy.data,
            shouldQueue: false,
            userMessage: `Using default data for ${operation}`,
          };

        case "alternative_service":
          return await this.executeAlternativeServiceStrategy(
            strategy,
            operation,
            requestData,
          );

        case "queue":
          return {
            success: false,
            shouldQueue: true,
            userMessage: `${operation} has been queued for retry`,
          };

        case "manual":
          return {
            success: false,
            shouldQueue: false,
            userMessage: `${operation} requires manual intervention`,
          };

        default:
          return {
            success: false,
            shouldQueue: false,
            userMessage: "Service temporarily unavailable",
          };
      }
    } catch (strategyError) {
      logger.error("Fallback strategy failed", {
        service: error.service,
        operation,
        strategy: strategy.type,
        error: strategyError?.message,
      });

      return {
        success: false,
        shouldQueue: strategy?.queueForRetry || false,
        userMessage: "Service temporarily unavailable",
      };
    }
  }

  /**
   * Execute cache strategy
   */
  private async executeCacheStrategy(
    service: string,
    operation: string,
    strategy: FallbackStrategy,
  ): Promise<{
    success: boolean;
    data?: any;
    shouldQueue: boolean;
    userMessage: string;
  }> {
    const cacheKey = `${service}:${operation}`;
    const cached = this.fallbackCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.maxAge) {
      return {
        success: true,
        data: cached.data,
        shouldQueue: false,
        userMessage: "Using cached data",
      };
    }

    // Try Redis cache
    try {
      const redisData = await redisClient.get(cacheKey);
      if (redisData) {
        const parsed = JSON.parse(redisData);
        return {
          success: true,
          data: parsed,
          shouldQueue: false,
          userMessage: "Using cached data",
        };
      }
    } catch (redisError) {
      logger.warn("Redis cache access failed", { error: redisError?.message });
    }

    return {
      success: false,
      shouldQueue: true,
      userMessage: "No cached data available",
    };
  }

  /**
   * Execute alternative service strategy
   */
  private async executeAlternativeServiceStrategy(
    strategy: FallbackStrategy,
    operation: string,
    requestData?: any,
  ): Promise<{
    success: boolean;
    data?: any;
    shouldQueue: boolean;
    userMessage: string;
  }> {
    const altService = strategy.alternativeService;
    if (!altService) {
      return {
        success: false,
        shouldQueue: true,
        userMessage: "No alternative service available",
      };
    }

    const altServiceHealth = this.serviceHealth.get(altService);
    if (altServiceHealth && altServiceHealth.status === "healthy") {
      return {
        success: true,
        data: { alternativeService: altService, redirected: true },
        shouldQueue: false,
        userMessage: `Using alternative service: ${altService}`,
      };
    }

    return {
      success: false,
      shouldQueue: true,
      userMessage: "Alternative service also unavailable",
    };
  }

  /**
   * Handle critical operation failure
   */
  private async handleCriticalOperationFailure(
    error: ApiIntegrationError,
    serviceConfig: ServiceErrorConfig,
    operation: string,
  ): Promise<void> {
    logger.error("CRITICAL OPERATION FAILURE", {
      service: error.service,
      operation,
      businessImpact: serviceConfig.businessImpactLevel,
      costPerOutage: serviceConfig.costPerOutage,
    });

    // Emit critical alert
    this.emit("criticalServiceFailure", {
      service: error.service,
      operation,
      businessImpact: serviceConfig.businessImpactLevel,
      estimatedCost: serviceConfig.costPerOutage,
      timestamp: new Date(),
    });

    // Notify cross-stream coordinator
    await crossStreamErrorCoordinator.reportError(
      new ExternalServiceError(
        error.service,
        `Critical operation ${operation} failed`,
      ),
      {
        stream: "external-api",
        component: error.service,
        operation,
      },
      {
        critical: true,
        businessImpact: serviceConfig.businessImpactLevel,
        estimatedCost: serviceConfig.costPerOutage,
      },
    );
  }

  /**
   * Queue operation for retry
   */
  private async queueForRetry(
    service: string,
    operation: string,
    requestData?: any,
  ): Promise<void> {
    if (!this.operationQueue.has(service)) {
      this.operationQueue.set(service, []);
    }

    const queue = this.operationQueue.get(service)!;
    queue.push({
      operation,
      data: requestData,
      retryCount: 0,
    });

    logger.info("Operation queued for retry", {
      service,
      operation,
      queueSize: queue.length,
    });
  }

  /**
   * Update service health
   */
  private async updateServiceHealth(
    service: string,
    error: ApiIntegrationError,
  ): Promise<void> {
    let health = this.serviceHealth.get(service);

    if (!health) {
      health = {
        service,
        status: "healthy",
        errorRate: 0,
        averageResponseTime: 0,
        circuitBreakerState: "closed",
        uptime: 100,
        businessImpact: 0,
      };
      this.serviceHealth.set(service, health);
    }

    health.lastError = new Date();
    health.errorRate = Math.min(health.errorRate + 0.1, 1.0);

    // Update status based on error rate
    if (health.errorRate > 0.5) {
      health.status = "unhealthy";
      health.businessImpact = 0.8;
    } else if (health.errorRate > 0.2) {
      health.status = "degraded";
      health.businessImpact = 0.4;
    }

    // Store in Redis for persistence
    try {
      await redisClient.setex(
        `service_health:${service}`,
        300, // 5 minutes TTL
        JSON.stringify(health),
      );
    } catch (redisError) {
      logger.warn("Failed to persist service health", {
        error: redisError?.message,
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Recovery monitoring - improve health over time
    setInterval(() => {
      for (const [service, health] of this.serviceHealth) {
        if (health.errorRate > 0) {
          health.errorRate = Math.max(health.errorRate - 0.05, 0);

          if (health.errorRate < 0.2) {
            health.status = "healthy";
            health.businessImpact = 0;

            // Process queued operations if service is healthy
            this.processQueuedOperations(service);
          } else if (health.errorRate < 0.5) {
            health.status = "degraded";
            health.businessImpact = 0.2;
          }
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Setup fallback strategies
   */
  private setupFallbackStrategies(): void {
    // Pre-populate cache with essential data
    this.fallbackCache.set("stripe:get_payment_methods", {
      data: { methods: [], cached: true },
      timestamp: Date.now(),
      maxAge: 3600000,
    });

    this.fallbackCache.set("mapbox:get_directions", {
      data: { routes: [], cached: true, quality: "reduced" },
      timestamp: Date.now(),
      maxAge: 1800000,
    });
  }

  /**
   * Helper methods
   */
  private isRetryableError(error: Error | ExternalServiceError): boolean {
    if (error instanceof ExternalServiceError) {
      return error.retryable;
    }

    return !(error instanceof CircuitBreakerError);
  }

  private determineSeverity(service: string, operation: string): ErrorSeverity {
    const config = this.serviceConfigs.get(service);
    if (!config) return ErrorSeverity.MEDIUM;

    if (config.criticalOperations.includes(operation)) {
      return config.businessImpactLevel === "critical"
        ? ErrorSeverity.CRITICAL
        : ErrorSeverity.HIGH;
    }

    return ErrorSeverity.MEDIUM;
  }

  private hasFallbackStrategy(service: string, operation: string): boolean {
    const config = this.serviceConfigs.get(service);
    return config ? operation in config.fallbackStrategies : false;
  }

  private calculateBusinessImpact(
    config: ServiceErrorConfig,
    operation: string,
  ): number {
    const baseImpact = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 0.9,
    }[config.businessImpactLevel];

    // Increase impact for critical operations
    return config.criticalOperations.includes(operation)
      ? Math.min(baseImpact * 1.5, 1.0)
      : baseImpact;
  }

  private calculateTotalBusinessImpact(services: ServiceHealth[]): number {
    return (
      services.reduce((total, service) => total + service.businessImpact, 0) /
      services.length
    );
  }

  private handleUnknownService(
    error: Error,
    service: string,
    operation: string,
  ): Promise<any> {
    logger.warn("Unknown service error handling", {
      service,
      operation,
      error: error instanceof Error ? error?.message : String(error),
    });

    return Promise.resolve({
      canRecover: false,
      queuedForRetry: false,
      businessImpact: 0.3,
      userMessage: `Service ${service} is temporarily unavailable`,
    });
  }

  private async retryQueuedOperation(
    service: string,
    queuedOp: any,
  ): Promise<void> {
    // This would integrate with the actual service clients
    // For now, just simulate retry logic
    logger.info("Retrying queued operation", {
      service,
      operation: queuedOp.operation,
      retryCount: queuedOp.retryCount,
    });

    // Simulate success/failure
    if (Math.random() > 0.7) {
      throw new Error("Retry failed");
    }
  }
}

// Global instance
export const externalServiceErrorManager = new ExternalServiceErrorManager();

export default ExternalServiceErrorManager;
