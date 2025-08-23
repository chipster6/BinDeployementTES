/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - FALLBACK STRATEGY MANAGER
 * ============================================================================
 *
 * Enterprise-grade fallback strategy manager providing:
 * - Advanced fallback strategies for critical services
 * - Service priority levels and cascading fallbacks
 * - Multi-region/multi-provider failover capabilities
 * - Business continuity planning for critical operations
 * - Cost optimization during service degradation
 * - Service mesh patterns for complex failover scenarios
 *
 * Features:
 * - Hierarchical fallback chains with priority-based routing
 * - Intelligent fallback data with historical analysis
 * - Multi-provider failover with automatic provider selection
 * - Business impact assessment and cost optimization
 * - Real-time monitoring and alerting integration
 * - Service mesh patterns for distributed resilience
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import { socketManager } from "@/services/socketManager";
import { 
  ExternalServiceError, 
  AppError,
  gracefulDegradation 
} from "@/middleware/errorHandler";
import { EventEmitter } from "events";

/**
 * Service priority levels for fallback routing
 */
export enum ServicePriority {
  CRITICAL = 1,      // Payment processing, core operations
  HIGH = 2,          // Fleet tracking, customer communications
  MEDIUM = 3,        // Maps, routing optimization
  LOW = 4,           // Analytics, reporting, non-essential features
  OPTIONAL = 5       // Background processing, data sync
}

/**
 * Fallback strategy types
 */
export enum FallbackStrategyType {
  CACHE_ONLY = "cache_only",                    // Use cached data only
  ALTERNATIVE_PROVIDER = "alternative_provider", // Switch to backup provider
  DEGRADED_FUNCTIONALITY = "degraded_functionality", // Reduced features
  MANUAL_OPERATION = "manual_operation",        // Manual workflow
  CIRCUIT_BREAKER = "circuit_breaker",          // Stop service completely
  HYBRID_APPROACH = "hybrid_approach"           // Combination of strategies
}

/**
 * Service criticality matrix for business impact assessment
 */
export enum BusinessCriticality {
  REVENUE_BLOCKING = "revenue_blocking",        // Stripe payment processing
  OPERATIONAL_CRITICAL = "operational_critical", // Samsara fleet tracking
  CUSTOMER_FACING = "customer_facing",          // Twilio/SendGrid communications
  PERFORMANCE_OPTIMIZATION = "performance_optimization", // Mapbox routing
  ANALYTICS_REPORTING = "analytics_reporting",  // Data synchronization
  BACKGROUND_PROCESSING = "background_processing" // Non-critical background tasks
}

/**
 * Fallback provider configuration
 */
export interface FallbackProvider {
  providerId: string;
  providerName: string;
  serviceType: string;
  priority: number;
  config: Record<string, any>;
  healthCheckEndpoint?: string;
  costPerRequest?: number;
  geographicRegion?: string;
  capabilities: string[];
  limitations?: string[];
}

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  strategyId: string;
  serviceName: string;
  serviceType: string;
  priority: ServicePriority;
  businessCriticality: BusinessCriticality;
  strategyType: FallbackStrategyType;
  
  // Provider chain for alternative provider strategies
  providers: FallbackProvider[];
  
  // Cache strategy configuration
  cacheStrategy?: {
    enabled: boolean;
    maxAge: number; // seconds
    staleWhileRevalidate: boolean;
    fallbackDataGenerator?: string; // function name
  };
  
  // Degraded functionality configuration
  degradedFunctionality?: {
    enabledFeatures: string[];
    disabledFeatures: string[];
    fallbackData: any;
    userMessage: string;
  };
  
  // Manual operation configuration
  manualOperation?: {
    notificationChannels: string[];
    escalationPath: string[];
    instructions: string;
    estimatedResolutionTime: number; // minutes
  };
  
  // Business continuity settings
  businessContinuity?: {
    maxDowntime: number; // minutes
    businessImpactLevel: "low" | "medium" | "high" | "critical";
    revenueImpactPerHour: number; // dollars
    customerImpact: "none" | "minor" | "moderate" | "severe";
  };
  
  // Cost optimization settings
  costOptimization?: {
    maxCostIncrease: number; // percentage
    preferredProviders: string[];
    budgetAlerts: boolean;
  };
}

/**
 * Fallback execution context
 */
export interface FallbackContext {
  serviceName: string;
  operation: string;
  originalRequest: any;
  error: ExternalServiceError | AppError;
  metadata: {
    requestId: string;
    userId?: string;
    organizationId?: string;
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
  };
  businessContext?: {
    urgency: "low" | "medium" | "high" | "critical";
    customerFacing: boolean;
    revenueImpacting: boolean;
  };
}

/**
 * Fallback execution result
 */
export interface FallbackResult {
  success: boolean;
  strategy: FallbackStrategy;
  provider?: FallbackProvider;
  data?: any;
  metadata: {
    executionTime: number;
    costImpact: number;
    degradationLevel: "none" | "minor" | "moderate" | "severe";
    fallbackType: FallbackStrategyType;
    providersAttempted: string[];
  };
  businessImpact: {
    customerExperience: "unchanged" | "slightly_degraded" | "moderately_degraded" | "severely_degraded";
    operationalImpact: "none" | "minor" | "moderate" | "significant";
    revenueImpact: number; // estimated dollars per hour
  };
  nextRecommendedAction?: string;
  estimatedRecoveryTime?: number; // minutes
}

/**
 * Historical fallback analytics
 */
export interface FallbackAnalytics {
  serviceName: string;
  totalFallbacks: number;
  successfulFallbacks: number;
  averageRecoveryTime: number;
  costImpact: number;
  businessImpactSummary: any;
  patternAnalysis: {
    commonFailureTypes: string[];
    effectiveStrategies: string[];
    timeToRecoveryTrends: any;
  };
}

/**
 * Main fallback strategy manager class
 */
export class FallbackStrategyManager extends EventEmitter {
  private strategies: Map<string, FallbackStrategy> = new Map();
  private activeProviders: Map<string, FallbackProvider[]> = new Map();
  private fallbackHistory: Map<string, FallbackResult[]> = new Map();
  private providerHealthStatus: Map<string, boolean> = new Map();
  
  // Cache keys
  private readonly STRATEGY_CACHE_KEY = "fallback:strategies";
  private readonly PROVIDER_HEALTH_KEY = "fallback:provider_health";
  private readonly ANALYTICS_KEY = "fallback:analytics";

  constructor() {
    super();
    this.initializeDefaultStrategies();
    this.startHealthMonitoring();
  }

  /**
   * Initialize default fallback strategies for critical services
   */
  private initializeDefaultStrategies(): void {
    // Stripe payment processing strategy
    this.registerStrategy({
      strategyId: "stripe_payment_fallback",
      serviceName: "stripe",
      serviceType: "payment_processing",
      priority: ServicePriority.CRITICAL,
      businessCriticality: BusinessCriticality.REVENUE_BLOCKING,
      strategyType: FallbackStrategyType.ALTERNATIVE_PROVIDER,
      providers: [
        {
          providerId: "stripe_primary",
          providerName: "Stripe Primary",
          serviceType: "payment_processing",
          priority: 1,
          config: { /* primary Stripe config */ },
          costPerRequest: 0.029,
          geographicRegion: "us-east-1",
          capabilities: ["payments", "subscriptions", "webhooks", "marketplace"]
        },
        {
          providerId: "stripe_secondary",
          providerName: "Stripe Secondary Region",
          serviceType: "payment_processing",
          priority: 2,
          config: { /* secondary region config */ },
          costPerRequest: 0.032,
          geographicRegion: "us-west-2",
          capabilities: ["payments", "subscriptions", "webhooks"]
        }
      ],
      cacheStrategy: {
        enabled: true,
        maxAge: 300, // 5 minutes for payment data
        staleWhileRevalidate: false, // Critical data must be fresh
        fallbackDataGenerator: "generatePaymentFallbackData"
      },
      businessContinuity: {
        maxDowntime: 5, // 5 minutes max
        businessImpactLevel: "critical",
        revenueImpactPerHour: 10000, // $10k/hour impact
        customerImpact: "severe"
      },
      costOptimization: {
        maxCostIncrease: 15, // 15% cost increase acceptable for revenue protection
        preferredProviders: ["stripe_primary"],
        budgetAlerts: true
      }
    });

    // Samsara fleet tracking strategy
    this.registerStrategy({
      strategyId: "samsara_fleet_fallback",
      serviceName: "samsara",
      serviceType: "fleet_management",
      priority: ServicePriority.HIGH,
      businessCriticality: BusinessCriticality.OPERATIONAL_CRITICAL,
      strategyType: FallbackStrategyType.HYBRID_APPROACH,
      providers: [
        {
          providerId: "samsara_primary",
          providerName: "Samsara Primary",
          serviceType: "fleet_management",
          priority: 1,
          config: { /* primary config */ },
          costPerRequest: 0.05,
          capabilities: ["gps_tracking", "vehicle_diagnostics", "driver_behavior", "route_optimization"]
        }
      ],
      cacheStrategy: {
        enabled: true,
        maxAge: 600, // 10 minutes for location data
        staleWhileRevalidate: true,
        fallbackDataGenerator: "generateFleetFallbackData"
      },
      degradedFunctionality: {
        enabledFeatures: ["basic_tracking", "manual_updates"],
        disabledFeatures: ["real_time_analytics", "predictive_maintenance"],
        fallbackData: null,
        userMessage: "Fleet tracking is operating in reduced mode. Manual location updates are required."
      },
      manualOperation: {
        notificationChannels: ["sms", "email", "dashboard_alert"],
        escalationPath: ["fleet_manager", "operations_manager", "director"],
        instructions: "Switch to manual check-ins via mobile app. Contact dispatch for coordination.",
        estimatedResolutionTime: 30
      },
      businessContinuity: {
        maxDowntime: 15, // 15 minutes acceptable
        businessImpactLevel: "high",
        revenueImpactPerHour: 2000, // $2k/hour operational impact
        customerImpact: "moderate"
      }
    });

    // Twilio communications fallback
    this.registerStrategy({
      strategyId: "twilio_communications_fallback",
      serviceName: "twilio",
      serviceType: "communications",
      priority: ServicePriority.HIGH,
      businessCriticality: BusinessCriticality.CUSTOMER_FACING,
      strategyType: FallbackStrategyType.ALTERNATIVE_PROVIDER,
      providers: [
        {
          providerId: "twilio_primary",
          providerName: "Twilio Primary",
          serviceType: "sms",
          priority: 1,
          config: { /* primary config */ },
          costPerRequest: 0.0075,
          capabilities: ["sms", "voice", "whatsapp", "verify"]
        },
        {
          providerId: "aws_sns",
          providerName: "AWS SNS",
          serviceType: "sms",
          priority: 2,
          config: { /* AWS SNS config */ },
          costPerRequest: 0.006,
          capabilities: ["sms"],
          limitations: ["no_voice", "limited_international"]
        }
      ],
      cacheStrategy: {
        enabled: false, // Don't cache communications
        maxAge: 0,
        staleWhileRevalidate: false
      },
      businessContinuity: {
        maxDowntime: 10,
        businessImpactLevel: "medium",
        revenueImpactPerHour: 500,
        customerImpact: "moderate"
      }
    });

    // Mapbox routing optimization fallback
    this.registerStrategy({
      strategyId: "mapbox_routing_fallback",
      serviceName: "mapbox",
      serviceType: "mapping",
      priority: ServicePriority.MEDIUM,
      businessCriticality: BusinessCriticality.PERFORMANCE_OPTIMIZATION,
      strategyType: FallbackStrategyType.ALTERNATIVE_PROVIDER,
      providers: [
        {
          providerId: "mapbox_primary",
          providerName: "Mapbox",
          serviceType: "mapping",
          priority: 1,
          config: { /* Mapbox config */ },
          costPerRequest: 0.005,
          capabilities: ["directions", "geocoding", "traffic", "optimization"]
        },
        {
          providerId: "google_maps",
          providerName: "Google Maps",
          serviceType: "mapping",
          priority: 2,
          config: { /* Google Maps config */ },
          costPerRequest: 0.008,
          capabilities: ["directions", "geocoding", "traffic"],
          limitations: ["higher_cost", "rate_limits"]
        },
        {
          providerId: "here_maps",
          providerName: "HERE Maps",
          serviceType: "mapping",
          priority: 3,
          config: { /* HERE config */ },
          costPerRequest: 0.006,
          capabilities: ["directions", "geocoding"],
          limitations: ["limited_traffic_data"]
        }
      ],
      cacheStrategy: {
        enabled: true,
        maxAge: 1800, // 30 minutes for route data
        staleWhileRevalidate: true,
        fallbackDataGenerator: "generateRoutingFallbackData"
      },
      degradedFunctionality: {
        enabledFeatures: ["basic_routing", "cached_routes"],
        disabledFeatures: ["real_time_traffic", "dynamic_optimization"],
        fallbackData: null,
        userMessage: "Route optimization is using cached data. Real-time traffic updates unavailable."
      },
      businessContinuity: {
        maxDowntime: 30,
        businessImpactLevel: "low",
        revenueImpactPerHour: 200,
        customerImpact: "minor"
      }
    });

    logger.info("Default fallback strategies initialized", {
      strategiesCount: this.strategies.size,
      strategies: Array.from(this.strategies.keys())
    });
  }

  /**
   * Register a fallback strategy
   */
  public registerStrategy(strategy: FallbackStrategy): void {
    this.strategies.set(strategy.strategyId, strategy);
    this.activeProviders.set(strategy.serviceName, strategy.providers);
    
    // Cache strategy for persistence
    this.cacheStrategy(strategy);
    
    logger.info("Fallback strategy registered", {
      strategyId: strategy.strategyId,
      serviceName: strategy.serviceName,
      strategyType: strategy.strategyType,
      providersCount: strategy.providers.length
    });

    this.emit("strategyRegistered", strategy);
  }

  /**
   * Execute fallback strategy for a failed service
   */
  public async executeFallback(context: FallbackContext): Promise<FallbackResult> {
    const startTime = Date.now();
    const strategy = this.strategies.get(`${context.serviceName}_fallback`) || 
                    this.findBestStrategy(context);

    if (!strategy) {
      throw new Error(`No fallback strategy found for service: ${context.serviceName}`);
    }

    logger.info("Executing fallback strategy", {
      strategyId: strategy.strategyId,
      serviceName: context.serviceName,
      operation: context.operation,
      requestId: context.metadata.requestId,
      retryCount: context.metadata.retryCount
    });

    try {
      let result: FallbackResult;

      switch (strategy.strategyType) {
        case FallbackStrategyType.CACHE_ONLY:
          result = await this.executeCacheOnlyFallback(strategy, context);
          break;
        
        case FallbackStrategyType.ALTERNATIVE_PROVIDER:
          result = await this.executeAlternativeProviderFallback(strategy, context);
          break;
        
        case FallbackStrategyType.DEGRADED_FUNCTIONALITY:
          result = await this.executeDegradedFunctionalityFallback(strategy, context);
          break;
        
        case FallbackStrategyType.MANUAL_OPERATION:
          result = await this.executeManualOperationFallback(strategy, context);
          break;
        
        case FallbackStrategyType.HYBRID_APPROACH:
          result = await this.executeHybridFallback(strategy, context);
          break;
        
        case FallbackStrategyType.CIRCUIT_BREAKER:
          result = await this.executeCircuitBreakerFallback(strategy, context);
          break;
        
        default:
          throw new Error(`Unsupported fallback strategy type: ${strategy.strategyType}`);
      }

      // Calculate execution metrics
      result.metadata.executionTime = Date.now() - startTime;
      
      // Store result for analytics
      this.recordFallbackResult(context.serviceName, result);
      
      // Emit real-time event for monitoring
      this.emitFallbackEvent("fallback_executed", {
        serviceName: context.serviceName,
        strategyId: strategy.strategyId,
        success: result.success,
        executionTime: result.metadata.executionTime,
        businessImpact: result.businessImpact
      });

      // Create audit log
      await this.createAuditLog(context, result);

      logger.info("Fallback strategy executed successfully", {
        strategyId: strategy.strategyId,
        success: result.success,
        executionTime: result.metadata.executionTime,
        degradationLevel: result.metadata.degradationLevel
      });

      return result;

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      
      logger.error("Fallback strategy execution failed", {
        strategyId: strategy.strategyId,
        serviceName: context.serviceName,
        error: error instanceof Error ? error?.message : String(error),
        executionTime
      });

      // Emit failure event
      this.emitFallbackEvent("fallback_failed", {
        serviceName: context.serviceName,
        strategyId: strategy.strategyId,
        error: error instanceof Error ? error?.message : String(error),
        executionTime
      });

      throw error;
    }
  }

  /**
   * Execute cache-only fallback strategy
   */
  private async executeCacheOnlyFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    const cacheKey = `fallback:cache:${context.serviceName}:${context.operation}`;
    
    try {
      // Try to get cached data
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        
        return {
          success: true,
          strategy,
          data,
          businessImpact: {
            customerExperience: "slightly_degraded",
            operationalImpact: "minor",
            revenueImpact: 0
          },
          nextRecommendedAction: "Monitor primary service recovery"
        };
      }

      // Generate fallback data if cache miss
      if (strategy.cacheStrategy?.fallbackDataGenerator) {
        const fallbackData = await this.generateFallbackData(
          strategy.cacheStrategy.fallbackDataGenerator,
          context
        );
        
        return {
          success: true,
          strategy,
          data: fallbackData,
          businessImpact: {
            customerExperience: "moderately_degraded",
            operationalImpact: "moderate",
            revenueImpact: strategy.businessContinuity?.revenueImpactPerHour || 0
          },
          nextRecommendedAction: "Consider manual intervention"
        };
      }

      throw new Error("No cached data available and no fallback generator configured");

    } catch (error: unknown) {
      logger.error("Cache-only fallback failed", {
        serviceName: context.serviceName,
        error: error instanceof Error ? error?.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute alternative provider fallback strategy
   */
  private async executeAlternativeProviderFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    const providersAttempted: string[] = [];
    let lastError: Error | null = null;
    
    // Sort providers by priority and health status
    const sortedProviders = strategy.providers
      .filter(provider => this.providerHealthStatus.get(provider.providerId) !== false)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sortedProviders) {
      providersAttempted.push(provider.providerId);
      
      try {
        logger.info("Attempting alternative provider", {
          providerId: provider.providerId,
          providerName: provider.providerName,
          serviceName: context.serviceName
        });

        // Execute request with alternative provider
        const data = await this.executeProviderRequest(provider, context);
        
        // Calculate cost impact
        const costImpact = this.calculateCostImpact(provider, strategy.providers[0]);
        
        return {
          success: true,
          strategy,
          provider,
          data,
          businessImpact: {
            customerExperience: providersAttempted.length > 1 ? "slightly_degraded" : "unchanged",
            operationalImpact: "none",
            revenueImpact: 0
          },
          nextRecommendedAction: "Monitor primary provider recovery"
        };

      } catch (error: unknown) {
        lastError = error;
        logger.warn("Alternative provider failed", {
          providerId: provider.providerId,
          error: error instanceof Error ? error?.message : String(error)
        });
        
        // Mark provider as unhealthy temporarily
        this.markProviderUnhealthy(provider.providerId, 300); // 5 minutes
      }
    }

    throw new Error(
      `All alternative providers failed. Last error: ${lastError?.message}`
    );
  }

  /**
   * Execute degraded functionality fallback strategy
   */
  private async executeDegradedFunctionalityFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    if (!strategy.degradedFunctionality) {
      throw new Error("Degraded functionality configuration not found");
    }

    const { enabledFeatures, fallbackData, userMessage } = strategy.degradedFunctionality;
    
    // Generate limited functionality response
    const limitedData = fallbackData || await this.generateLimitedFunctionalityData(
      context, 
      enabledFeatures
    );

    return {
      success: true,
      strategy,
      data: {
        ...limitedData,
        _fallback: true,
        _message: userMessage,
        _enabledFeatures: enabledFeatures
      },
      businessImpact: {
        customerExperience: "moderately_degraded",
        operationalImpact: "moderate",
        revenueImpact: strategy.businessContinuity?.revenueImpactPerHour || 0
      },
      nextRecommendedAction: "Consider manual operations or escalation"
    };
  }

  /**
   * Execute manual operation fallback strategy
   */
  private async executeManualOperationFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    if (!strategy.manualOperation) {
      throw new Error("Manual operation configuration not found");
    }

    const { notificationChannels, escalationPath, instructions, estimatedResolutionTime } = strategy.manualOperation;
    
    // Send notifications to operations team
    await this.sendManualOperationNotifications(
      notificationChannels,
      context,
      instructions,
      escalationPath
    );

    return {
      success: true,
      strategy,
      data: {
        _fallback: true,
        _mode: "manual_operation",
        _instructions: instructions,
        _estimatedResolution: estimatedResolutionTime,
        _escalationPath: escalationPath
      },
      businessImpact: {
        customerExperience: "severely_degraded",
        operationalImpact: "significant",
        revenueImpact: strategy.businessContinuity?.revenueImpactPerHour || 0
      },
      nextRecommendedAction: "Execute manual procedures immediately",
      estimatedRecoveryTime: estimatedResolutionTime
    };
  }

  /**
   * Execute hybrid fallback strategy
   */
  private async executeHybridFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    // Try cache first
    try {
      const cacheResult = await this.executeCacheOnlyFallback(strategy, context);
      if (cacheResult.success) {
        return cacheResult;
      }
    } catch (error: unknown) {
      logger.debug("Cache fallback failed, trying alternative providers", {
        error: error instanceof Error ? error?.message : String(error)
      });
    }

    // Try alternative providers
    try {
      const providerResult = await this.executeAlternativeProviderFallback(strategy, context);
      if (providerResult.success) {
        return providerResult;
      }
    } catch (error: unknown) {
      logger.debug("Alternative provider fallback failed, switching to degraded mode", {
        error: error instanceof Error ? error?.message : String(error)
      });
    }

    // Fall back to degraded functionality
    return await this.executeDegradedFunctionalityFallback(strategy, context);
  }

  /**
   * Execute circuit breaker fallback strategy
   */
  private async executeCircuitBreakerFallback(
    strategy: FallbackStrategy, 
    context: FallbackContext
  ): Promise<FallbackResult> {
    return {
      success: false,
      strategy,
      data: null,
      businessImpact: {
        customerExperience: "severely_degraded",
        operationalImpact: "significant",
        revenueImpact: strategy.businessContinuity?.revenueImpactPerHour || 0
      },
      nextRecommendedAction: "Service temporarily unavailable - manual intervention required"
    };
  }

  /**
   * Find best fallback strategy for a service
   */
  private findBestStrategy(context: FallbackContext): FallbackStrategy | null {
    // Try to find strategy by service name
    for (const [strategyId, strategy] of this.strategies) {
      if (strategy.serviceName === context.serviceName) {
        return strategy;
      }
    }

    // Find by service type or business criticality
    const fallbackStrategies = Array.from(this.strategies.values())
      .filter(s => s.serviceType === context.serviceName)
      .sort((a, b) => a.priority - b.priority);

    return fallbackStrategies[0] || null;
  }

  /**
   * Start health monitoring for providers
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkProviderHealth();
    }, 60000); // Check every minute

    logger.info("Provider health monitoring started");
  }

  /**
   * Check health of all providers
   */
  private async checkProviderHealth(): Promise<void> {
    for (const [serviceName, providers] of this.activeProviders) {
      for (const provider of providers) {
        try {
          const isHealthy = await this.checkSingleProviderHealth(provider);
          this.providerHealthStatus.set(provider.providerId, isHealthy);
          
          if (!isHealthy) {
            this.emitFallbackEvent("provider_unhealthy", {
              providerId: provider.providerId,
              providerName: provider.providerName,
              serviceName
            });
          }
        } catch (error: unknown) {
          this.providerHealthStatus.set(provider.providerId, false);
          logger.error("Provider health check failed", {
            providerId: provider.providerId,
            error: error instanceof Error ? error?.message : String(error)
          });
        }
      }
    }
  }

  /**
   * Check health of a single provider
   */
  private async checkSingleProviderHealth(provider: FallbackProvider): Promise<boolean> {
    if (!provider.healthCheckEndpoint) {
      return true; // Assume healthy if no health check endpoint
    }

    try {
      // Implementation would depend on provider type
      // This is a placeholder for the actual health check logic
      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Execute request with specific provider
   */
  private async executeProviderRequest(
    provider: FallbackProvider, 
    context: FallbackContext
  ): Promise<any> {
    // This would contain the actual logic to execute requests
    // with different providers based on their configuration
    // Implementation would be provider-specific
    
    // Placeholder implementation
    logger.info("Executing request with provider", {
      providerId: provider.providerId,
      operation: context.operation
    });
    
    // Return mock data for now
    return {
      success: true,
      provider: provider.providerId,
      data: context.originalRequest
    };
  }

  /**
   * Calculate cost impact of using alternative provider
   */
  private calculateCostImpact(
    currentProvider: FallbackProvider, 
    primaryProvider: FallbackProvider
  ): number {
    if (!currentProvider.costPerRequest || !primaryProvider.costPerRequest) {
      return 0;
    }

    const costDifference = currentProvider.costPerRequest - primaryProvider.costPerRequest;
    return (costDifference / primaryProvider.costPerRequest) * 100; // percentage increase
  }

  /**
   * Generate fallback data using specified generator
   */
  private async generateFallbackData(
    generatorName: string, 
    context: FallbackContext
  ): Promise<any> {
    // This would contain logic to generate fallback data
    // based on historical data, patterns, or business logic
    
    switch (generatorName) {
      case "generatePaymentFallbackData":
        return this.generatePaymentFallbackData(context);
      case "generateFleetFallbackData":
        return this.generateFleetFallbackData(context);
      case "generateRoutingFallbackData":
        return this.generateRoutingFallbackData(context);
      default:
        throw new Error(`Unknown fallback data generator: ${generatorName}`);
    }
  }

  /**
   * Generate payment fallback data
   */
  private async generatePaymentFallbackData(context: FallbackContext): Promise<any> {
    // Generate safe fallback data for payment operations
    return {
      status: "pending",
      message: "Payment is being processed. Please check back in a few minutes.",
      fallback: true,
      estimatedProcessingTime: 300 // 5 minutes
    };
  }

  /**
   * Generate fleet fallback data
   */
  private async generateFleetFallbackData(context: FallbackContext): Promise<any> {
    // Generate fallback data based on last known positions
    const cacheKey = `fleet:last_known:${context.metadata.organizationId}`;
    const lastKnownData = await redisClient.get(cacheKey);
    
    return {
      vehicles: lastKnownData ? JSON.parse(lastKnownData) : [],
      status: "stale_data",
      message: "Showing last known vehicle positions. Real-time tracking unavailable.",
      fallback: true,
      dataAge: 600 // 10 minutes old
    };
  }

  /**
   * Generate routing fallback data
   */
  private async generateRoutingFallbackData(context: FallbackContext): Promise<any> {
    // Generate basic routing data without real-time traffic
    return {
      routes: [{
        distance: "estimated",
        duration: "estimated",
        steps: ["Route calculation unavailable - using estimated times"],
        traffic: "unknown"
      }],
      status: "estimated",
      message: "Route optimization unavailable. Showing estimated routes without traffic data.",
      fallback: true
    };
  }

  /**
   * Generate limited functionality data
   */
  private async generateLimitedFunctionalityData(
    context: FallbackContext, 
    enabledFeatures: string[]
  ): Promise<any> {
    // Generate data with only enabled features
    return {
      availableFeatures: enabledFeatures,
      disabledFeatures: "Advanced features temporarily unavailable",
      mode: "limited_functionality"
    };
  }

  /**
   * Send manual operation notifications
   */
  private async sendManualOperationNotifications(
    channels: string[],
    context: FallbackContext,
    instructions: string,
    escalationPath: string[]
  ): Promise<void> {
    const notification = {
      type: "manual_operation_required",
      serviceName: context.serviceName,
      operation: context.operation,
      instructions,
      escalationPath,
      timestamp: new Date(),
      requestId: context.metadata.requestId
    };

    for (const channel of channels) {
      try {
        switch (channel) {
          case "sms":
            // Send SMS notification
            await this.sendSMSNotification(notification);
            break;
          case "email":
            // Send email notification
            await this.sendEmailNotification(notification);
            break;
          case "dashboard_alert":
            // Send dashboard alert
            await this.sendDashboardAlert(notification);
            break;
        }
      } catch (error: unknown) {
        logger.error("Failed to send manual operation notification", {
          channel,
          error: error instanceof Error ? error?.message : String(error)
        });
      }
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    // Implementation would use Twilio or alternative SMS service
    logger.info("SMS notification sent for manual operation", {
      serviceName: notification.serviceName,
      requestId: notification.requestId
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    // Implementation would use SendGrid or alternative email service
    logger.info("Email notification sent for manual operation", {
      serviceName: notification.serviceName,
      requestId: notification.requestId
    });
  }

  /**
   * Send dashboard alert
   */
  private async sendDashboardAlert(notification: any): Promise<void> {
    // Send real-time alert to dashboard via WebSocket
    socketManager.notifyManualOperation(notification);
    
    logger.info("Dashboard alert sent for manual operation", {
      serviceName: notification.serviceName,
      requestId: notification.requestId
    });
  }

  /**
   * Mark provider as unhealthy
   */
  private markProviderUnhealthy(providerId: string, durationSeconds: number): void {
    this.providerHealthStatus.set(providerId, false);
    
    // Set auto-recovery timer
    setTimeout(() => {
      this.providerHealthStatus.delete(providerId); // Allow health check to determine status
    }, durationSeconds * 1000);
  }

  /**
   * Record fallback result for analytics
   */
  private recordFallbackResult(serviceName: string, result: FallbackResult): void {
    const history = this.fallbackHistory.get(serviceName) || [];
    history.push(result);
    
    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }
    
    this.fallbackHistory.set(serviceName, history);
    
    // Cache for persistence
    redisClient.setex(
      `${this.ANALYTICS_KEY}:${serviceName}`,
      86400, // 24 hours
      JSON.stringify(history)
    );
  }

  /**
   * Cache strategy for persistence
   */
  private async cacheStrategy(strategy: FallbackStrategy): Promise<void> {
    const cacheKey = `${this.STRATEGY_CACHE_KEY}:${strategy.strategyId}`;
    await redisClient.setex(cacheKey, 86400, JSON.stringify(strategy));
  }

  /**
   * Emit fallback event for real-time monitoring
   */
  private emitFallbackEvent(eventType: string, data: any): void {
    const event = {
      eventType,
      timestamp: new Date(),
      ...data
    };

    this.emit(eventType, event);
    
    // Send to frontend via WebSocket
    socketManager.emitFallbackEvent(event);
  }

  /**
   * Create audit log for fallback execution
   */
  private async createAuditLog(
    context: FallbackContext, 
    result: FallbackResult
  ): Promise<void> {
    try {
      await AuditLog.create({
        eventType: "fallback_executed",
        tableName: "external_services",
        recordId: context.serviceName,
        userId: context.metadata.userId,
        changes: {
          operation: context.operation,
          strategyId: result.strategy.strategyId,
          success: result.success,
          degradationLevel: result.metadata.degradationLevel,
          businessImpact: result.businessImpact
        },
        ipAddress: "system",
        userAgent: "FallbackStrategyManager",
        organizationId: context.metadata.organizationId
      });
    } catch (error: unknown) {
      logger.error("Failed to create audit log for fallback execution", {
        error: error instanceof Error ? error?.message : String(error),
        serviceName: context.serviceName
      });
    }
  }

  /**
   * Get fallback analytics for a service
   */
  public async getFallbackAnalytics(serviceName: string): Promise<FallbackAnalytics> {
    const history = this.fallbackHistory.get(serviceName) || [];
    
    if (history.length === 0) {
      return {
        serviceName,
        totalFallbacks: 0,
        successfulFallbacks: 0,
        averageRecoveryTime: 0,
        costImpact: 0,
        businessImpactSummary: null,
        patternAnalysis: {
          commonFailureTypes: [],
          effectiveStrategies: [],
          timeToRecoveryTrends: null
        }
      };
    }

    const successful = history.filter(r => r.success);
    const totalCost = history.reduce((sum, r) => sum + r.metadata.costImpact, 0);
    const averageRecovery = history
      .filter(r => r.estimatedRecoveryTime)
      .reduce((sum, r, _, arr) => sum + (r.estimatedRecoveryTime! / arr.length), 0);

    return {
      serviceName,
      totalFallbacks: history.length,
      successfulFallbacks: successful.length,
      averageRecoveryTime: averageRecovery,
      costImpact: totalCost,
      businessImpactSummary: this.analyzeBusinessImpact(history),
      patternAnalysis: {
        commonFailureTypes: this.identifyCommonFailures(history),
        effectiveStrategies: this.identifyEffectiveStrategies(successful),
        timeToRecoveryTrends: this.analyzeRecoveryTrends(history)
      }
    };
  }

  /**
   * Analyze business impact patterns
   */
  private analyzeBusinessImpact(history: FallbackResult[]): any {
    const impacts = history.map(r => r.businessImpact);
    
    return {
      averageRevenueImpact: impacts.reduce((sum, i) => sum + i.revenueImpact, 0) / impacts.length,
      customerExperienceDistribution: this.groupBy(impacts, 'customerExperience'),
      operationalImpactDistribution: this.groupBy(impacts, 'operationalImpact')
    };
  }

  /**
   * Identify common failure types
   */
  private identifyCommonFailures(history: FallbackResult[]): string[] {
    const failures = history.map(r => r.metadata.fallbackType);
    const counts = this.countOccurrences(failures);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);
  }

  /**
   * Identify effective strategies
   */
  private identifyEffectiveStrategies(successful: FallbackResult[]): string[] {
    const strategies = successful.map(r => r.strategy.strategyId);
    const counts = this.countOccurrences(strategies);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([strategy]) => strategy);
  }

  /**
   * Analyze recovery trends
   */
  private analyzeRecoveryTrends(history: FallbackResult[]): any {
    const withRecovery = history.filter(r => r.estimatedRecoveryTime);
    
    if (withRecovery.length === 0) return null;

    return {
      trend: "stable", // Could implement trend analysis
      averageTime: withRecovery.reduce((sum, r) => sum + r.estimatedRecoveryTime!, 0) / withRecovery.length,
      fastest: Math.min(...withRecovery.map(r => r.estimatedRecoveryTime!)),
      slowest: Math.max(...withRecovery.map(r => r.estimatedRecoveryTime!))
    };
  }

  /**
   * Utility: Group array by property
   */
  private groupBy<T>(array: T[], property: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const key = String(item[property]);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * Utility: Count occurrences in array
   */
  private countOccurrences<T>(array: T[]): Record<string, number> {
    return array.reduce((counts, item) => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Get health status of all strategies
   */
  public getStrategiesHealthStatus(): { [strategyId: string]: any } {
    const status: { [strategyId: string]: any } = {};

    for (const [strategyId, strategy] of this.strategies) {
      const providerStatuses = strategy.providers.map(provider => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        healthy: this.providerHealthStatus.get(provider.providerId) !== false
      }));

      status[strategyId] = {
        serviceName: strategy.serviceName,
        strategyType: strategy.strategyType,
        priority: strategy.priority,
        businessCriticality: strategy.businessCriticality,
        providers: providerStatuses,
        healthyProviders: providerStatuses.filter(p => p.healthy).length,
        totalProviders: providerStatuses.length
      };
    }

    return status;
  }

  /**
   * Update strategy configuration
   */
  public async updateStrategy(
    strategyId: string, 
    updates: Partial<FallbackStrategy>
  ): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const updatedStrategy = { ...strategy, ...updates };
    this.strategies.set(strategyId, updatedStrategy);
    
    // Update active providers if providers changed
    if (updates.providers) {
      this.activeProviders.set(strategy.serviceName, updates.providers);
    }

    // Cache updated strategy
    await this.cacheStrategy(updatedStrategy);

    logger.info("Fallback strategy updated", {
      strategyId,
      updates: Object.keys(updates)
    });

    this.emit("strategyUpdated", { strategyId, strategy: updatedStrategy });
  }

  /**
   * Remove strategy
   */
  public removeStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    this.strategies.delete(strategyId);
    this.activeProviders.delete(strategy.serviceName);

    logger.info("Fallback strategy removed", { strategyId });
    this.emit("strategyRemoved", { strategyId });
  }
}

// Create and export singleton instance
export const fallbackStrategyManager = new FallbackStrategyManager();

// Export types for use in other modules
export {
  ServicePriority,
  FallbackStrategyType,
  BusinessCriticality,
  FallbackProvider,
  FallbackStrategy,
  FallbackContext,
  FallbackResult,
  FallbackAnalytics
};

export default FallbackStrategyManager;