/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COST-AWARE FALLBACK SERVICE
 * ============================================================================
 *
 * Advanced cost-aware fallback strategy implementation providing:
 * - Budget-conscious fallback routing with real-time cost monitoring
 * - Dynamic cost thresholds with business impact assessment
 * - Multi-tier cost optimization during service failures
 * - Revenue protection mechanisms during critical scenarios
 * - Cost prediction models for fallback decision making
 * - Budget allocation and emergency spending controls
 *
 * Features:
 * - Real-time budget monitoring with cost prediction
 * - Intelligent cost-aware routing during failures
 * - Emergency budget controls with automatic cost capping
 * - Revenue impact assessment and protection
 * - Cost optimization algorithms with performance balancing
 * - Business continuity cost models
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
  FallbackStrategyManager,
  FallbackProvider,
  FallbackContext,
  FallbackResult,
  ServicePriority,
  BusinessCriticality 
} from "./FallbackStrategyManager";
import { IntelligentTrafficRoutingService, RoutingDecisionContext } from "./IntelligentTrafficRoutingService";
import { EventEmitter } from "events";

/**
 * Cost control strategy types
 */
export enum CostControlStrategy {
  STRICT_BUDGET_ENFORCEMENT = "strict_budget_enforcement",
  REVENUE_PROTECTION = "revenue_protection",
  PERFORMANCE_BALANCED = "performance_balanced",
  EMERGENCY_SPENDING = "emergency_spending",
  COST_MINIMIZATION = "cost_minimization",
  BUSINESS_CONTINUITY = "business_continuity"
}

/**
 * Budget period types
 */
export enum BudgetPeriod {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly"
}

/**
 * Cost tier configuration
 */
export interface CostTier {
  tierId: string;
  tierName: string;
  maxCostPerRequest: number; // dollars
  maxTotalCost: number; // dollars per period
  budgetPeriod: BudgetPeriod;
  performanceTargets: {
    maxLatencyMs: number;
    minSuccessRate: number; // percentage
    maxErrorRate: number; // percentage
  };
  allowedProviders: string[];
  restrictions: string[];
  escalationThreshold: number; // percentage of budget
}

/**
 * Budget allocation configuration
 */
export interface BudgetAllocation {
  serviceName: string;
  totalBudget: number; // dollars
  budgetPeriod: BudgetPeriod;
  costTiers: CostTier[];
  emergencyBudget: {
    amount: number;
    triggerConditions: string[];
    approvalRequired: boolean;
    autoActivation: boolean;
  };
  revenueProtection: {
    enabled: boolean;
    maxRevenueImpact: number; // dollars per hour
    protectionThreshold: number; // percentage
  };
  costOptimization: {
    enabled: boolean;
    targetSavings: number; // percentage
    optimizationStrategies: string[];
  };
}

/**
 * Cost monitoring data
 */
export interface CostMonitoringData {
  serviceName: string;
  currentPeriod: {
    startTime: Date;
    endTime: Date;
    budgetPeriod: BudgetPeriod;
  };
  spending: {
    totalSpent: number;
    budgetUtilization: number; // percentage
    costPerRequest: number;
    requestCount: number;
  };
  projections: {
    projectedSpending: number;
    budgetOverrun: number;
    timeToOverrun: number; // minutes
    costTrend: "increasing" | "decreasing" | "stable";
  };
  alerts: Array<{
    alertType: "budget_warning" | "cost_spike" | "overrun_prediction" | "emergency_activation";
    severity: "info" | "warning" | "error" | "critical";
    message: string;
    threshold: number;
    currentValue: number;
    timestamp: Date;
  }>;
}

/**
 * Cost-aware routing decision
 */
export interface CostAwareRoutingDecision {
  selectedProvider: FallbackProvider;
  costJustification: string;
  budgetImpact: {
    immediateImpact: number;
    projectedImpact: number;
    budgetUtilizationAfter: number;
  };
  businessImpact: {
    revenueProtection: number;
    operationalContinuity: string;
    customerExperienceImpact: string;
  };
  alternatives: Array<{
    provider: FallbackProvider;
    cost: number;
    performanceTradeoff: string;
    recommendation: string;
  }>;
  costOptimizations: string[];
  emergencyMeasures?: {
    activated: boolean;
    measures: string[];
    estimatedDuration: number; // minutes
  };
}

/**
 * Revenue protection configuration
 */
export interface RevenueProtectionConfig {
  serviceName: string;
  revenueStreams: Array<{
    streamId: string;
    description: string;
    revenuePerHour: number;
    dependentServices: string[];
    protectionPriority: "low" | "medium" | "high" | "critical";
  }>;
  protectionStrategies: Array<{
    strategyId: string;
    description: string;
    costLimit: number;
    revenueThreshold: number;
    activationConditions: string[];
  }>;
  emergencyProtocols: Array<{
    protocolId: string;
    triggerConditions: string[];
    actions: string[];
    maxCost: number;
    approvalRequired: boolean;
  }>;
}

/**
 * Main cost-aware fallback service
 */
export class CostAwareFallbackService extends EventEmitter {
  private budgetAllocations: Map<string, BudgetAllocation> = new Map();
  private costMonitoring: Map<string, CostMonitoringData> = new Map();
  private revenueProtection: Map<string, RevenueProtectionConfig> = new Map();
  private costTiers: Map<string, CostTier[]> = new Map();
  private emergencyBudgetActive: Map<string, boolean> = new Map();
  private fallbackManager: FallbackStrategyManager;
  private routingService: IntelligentTrafficRoutingService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // Cache keys
  private readonly COST_CACHE_KEY = "cost_aware_fallback";
  private readonly BUDGET_CACHE_KEY = "budget_monitoring";
  private readonly REVENUE_PROTECTION_KEY = "revenue_protection";

  constructor(
    fallbackManager: FallbackStrategyManager,
    routingService: IntelligentTrafficRoutingService
  ) {
    super();
    this.fallbackManager = fallbackManager;
    this.routingService = routingService;
    this.initializeDefaultBudgetAllocations();
    this.startCostMonitoring();
  }

  /**
   * Initialize default budget allocations for critical services
   */
  private initializeDefaultBudgetAllocations(): void {
    // Stripe payment processing budget
    this.registerBudgetAllocation("stripe", {
      serviceName: "stripe",
      totalBudget: 1000, // $1000/day
      budgetPeriod: BudgetPeriod.DAILY,
      costTiers: [
        {
          tierId: "tier_1_standard",
          tierName: "Standard Operations",
          maxCostPerRequest: 0.029,
          maxTotalCost: 600, // $600/day (60% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 300,
            minSuccessRate: 99.5,
            maxErrorRate: 0.5
          },
          allowedProviders: ["stripe_primary"],
          restrictions: [],
          escalationThreshold: 80
        },
        {
          tierId: "tier_2_escalated",
          tierName: "Escalated Operations",
          maxCostPerRequest: 0.035,
          maxTotalCost: 300, // $300/day (30% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 500,
            minSuccessRate: 99.0,
            maxErrorRate: 1.0
          },
          allowedProviders: ["stripe_primary", "stripe_secondary"],
          restrictions: ["requires_approval"],
          escalationThreshold: 95
        },
        {
          tierId: "tier_3_emergency",
          tierName: "Emergency Operations",
          maxCostPerRequest: 0.050,
          maxTotalCost: 100, // $100/day (10% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 1000,
            minSuccessRate: 95.0,
            maxErrorRate: 5.0
          },
          allowedProviders: ["stripe_emergency"],
          restrictions: ["emergency_only", "auto_approval"],
          escalationThreshold: 100
        }
      ],
      emergencyBudget: {
        amount: 500, // $500 emergency fund
        triggerConditions: ["revenue_blocking", "critical_failure"],
        approvalRequired: false,
        autoActivation: true
      },
      revenueProtection: {
        enabled: true,
        maxRevenueImpact: 10000, // $10k/hour revenue at risk
        protectionThreshold: 90 // Activate when 90% budget used
      },
      costOptimization: {
        enabled: true,
        targetSavings: 15, // 15% cost reduction target
        optimizationStrategies: ["caching", "rate_limiting", "provider_optimization"]
      }
    });

    // Samsara fleet tracking budget
    this.registerBudgetAllocation("samsara", {
      serviceName: "samsara",
      totalBudget: 200, // $200/day
      budgetPeriod: BudgetPeriod.DAILY,
      costTiers: [
        {
          tierId: "tier_1_standard",
          tierName: "Standard Fleet Operations",
          maxCostPerRequest: 0.05,
          maxTotalCost: 140, // $140/day (70% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 500,
            minSuccessRate: 99.0,
            maxErrorRate: 1.0
          },
          allowedProviders: ["samsara_primary"],
          restrictions: [],
          escalationThreshold: 75
        },
        {
          tierId: "tier_2_degraded",
          tierName: "Degraded Operations",
          maxCostPerRequest: 0.07,
          maxTotalCost: 60, // $60/day (30% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 1000,
            minSuccessRate: 95.0,
            maxErrorRate: 5.0
          },
          allowedProviders: ["samsara_backup", "manual_tracking"],
          restrictions: ["reduced_features"],
          escalationThreshold: 95
        }
      ],
      emergencyBudget: {
        amount: 100, // $100 emergency fund
        triggerConditions: ["fleet_tracking_failure"],
        approvalRequired: true,
        autoActivation: false
      },
      revenueProtection: {
        enabled: true,
        maxRevenueImpact: 2000, // $2k/hour operational impact
        protectionThreshold: 85
      },
      costOptimization: {
        enabled: true,
        targetSavings: 20, // 20% cost reduction target
        optimizationStrategies: ["data_caching", "update_batching", "predictive_fetching"]
      }
    });

    // Maps service budget
    this.registerBudgetAllocation("maps", {
      serviceName: "maps",
      totalBudget: 50, // $50/day
      budgetPeriod: BudgetPeriod.DAILY,
      costTiers: [
        {
          tierId: "tier_1_optimized",
          tierName: "Cost-Optimized Routing",
          maxCostPerRequest: 0.005,
          maxTotalCost: 30, // $30/day (60% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 400,
            minSuccessRate: 99.0,
            maxErrorRate: 1.0
          },
          allowedProviders: ["mapbox_primary"],
          restrictions: [],
          escalationThreshold: 70
        },
        {
          tierId: "tier_2_premium",
          tierName: "Premium Routing",
          maxCostPerRequest: 0.008,
          maxTotalCost: 20, // $20/day (40% of budget)
          budgetPeriod: BudgetPeriod.DAILY,
          performanceTargets: {
            maxLatencyMs: 600,
            minSuccessRate: 98.0,
            maxErrorRate: 2.0
          },
          allowedProviders: ["google_maps", "here_maps"],
          restrictions: ["performance_reduced"],
          escalationThreshold: 90
        }
      ],
      emergencyBudget: {
        amount: 25, // $25 emergency fund
        triggerConditions: ["routing_service_failure"],
        approvalRequired: false,
        autoActivation: true
      },
      revenueProtection: {
        enabled: false,
        maxRevenueImpact: 0,
        protectionThreshold: 100
      },
      costOptimization: {
        enabled: true,
        targetSavings: 25, // 25% cost reduction target
        optimizationStrategies: ["route_caching", "provider_rotation", "bulk_requests"]
      }
    });

    logger.info("Default budget allocations initialized", {
      allocationsCount: this.budgetAllocations.size,
      services: Array.from(this.budgetAllocations.keys())
    });
  }

  /**
   * Register budget allocation for a service
   */
  public registerBudgetAllocation(serviceName: string, allocation: BudgetAllocation): void {
    this.budgetAllocations.set(serviceName, allocation);
    this.costTiers.set(serviceName, allocation.costTiers);
    
    // Initialize cost monitoring
    this.initializeCostMonitoring(serviceName, allocation);
    
    // Cache allocation
    this.cacheBudgetAllocation(serviceName, allocation);
    
    logger.info("Budget allocation registered", {
      serviceName,
      totalBudget: allocation.totalBudget,
      budgetPeriod: allocation.budgetPeriod,
      tiersCount: allocation.costTiers.length
    });

    this.emit("budgetAllocationRegistered", { serviceName, allocation });
  }

  /**
   * Make cost-aware fallback decision
   */
  public async makeCostAwareFallbackDecision(context: FallbackContext): Promise<CostAwareRoutingDecision> {
    const startTime = Date.now();
    const allocation = this.budgetAllocations.get(context.serviceName);
    
    if (!allocation) {
      throw new Error(`No budget allocation found for service: ${context.serviceName}`);
    }

    logger.info("Making cost-aware fallback decision", {
      serviceName: context.serviceName,
      operation: context.operation,
      requestId: context.metadata.requestId,
      retryCount: context.metadata.retryCount
    });

    try {
      // Get current cost monitoring data
      const costData = await this.getCostMonitoringData(context.serviceName);
      
      // Determine appropriate cost tier
      const costTier = this.determineCostTier(allocation, costData, context);
      
      // Get available providers within cost constraints
      const availableProviders = await this.getAffordableProviders(
        context.serviceName,
        costTier,
        costData,
        context
      );
      
      if (availableProviders.length === 0) {
        // Trigger emergency measures if no affordable providers
        return await this.handleEmergencyFallback(allocation, costData, context);
      }

      // Select optimal provider based on cost and performance
      const selectedProvider = await this.selectOptimalProvider(
        availableProviders,
        costTier,
        costData,
        context
      );

      // Calculate budget impact
      const budgetImpact = this.calculateBudgetImpact(
        selectedProvider,
        costData,
        allocation
      );

      // Assess business impact
      const businessImpact = await this.assessBusinessImpact(
        selectedProvider,
        context,
        allocation
      );

      // Generate alternatives
      const alternatives = this.generateCostAlternatives(
        availableProviders,
        selectedProvider,
        costTier
      );

      // Identify cost optimizations
      const costOptimizations = this.identifyCostOptimizations(
        allocation,
        costData,
        context
      );

      const decision: CostAwareRoutingDecision = {
        selectedProvider,
        costJustification: this.generateCostJustification(
          selectedProvider,
          costTier,
          costData,
          context
        ),
        budgetImpact,
        businessImpact,
        alternatives,
        costOptimizations
      };

      // Update cost monitoring
      await this.updateCostMonitoring(
        context.serviceName,
        selectedProvider.costPerRequest || 0,
        Date.now() - startTime
      );

      // Check for budget alerts
      await this.checkBudgetAlerts(context.serviceName, costData);

      // Emit cost-aware decision event
      this.emitCostEvent("cost_aware_decision", {
        serviceName: context.serviceName,
        selectedProvider: selectedProvider.providerId,
        cost: selectedProvider.costPerRequest,
        budgetUtilization: budgetImpact.budgetUtilizationAfter,
        tier: costTier.tierName
      });

      logger.info("Cost-aware fallback decision completed", {
        serviceName: context.serviceName,
        selectedProvider: selectedProvider.providerId,
        cost: selectedProvider.costPerRequest,
        budgetUtilization: budgetImpact.budgetUtilizationAfter
      });

      return decision;

    } catch (error) {
      const decisionTime = Date.now() - startTime;
      
      logger.error("Cost-aware fallback decision failed", {
        serviceName: context.serviceName,
        error: error.message,
        decisionTime
      });

      // Emit failure event
      this.emitCostEvent("cost_decision_failed", {
        serviceName: context.serviceName,
        error: error.message,
        decisionTime
      });

      throw error;
    }
  }

  /**
   * Determine appropriate cost tier based on current situation
   */
  private determineCostTier(
    allocation: BudgetAllocation,
    costData: CostMonitoringData,
    context: FallbackContext
  ): CostTier {
    const { budgetUtilization } = costData.spending;
    
    // Emergency conditions
    if (context.businessContext?.revenueImpacting || 
        context.businessContext?.urgency === "critical") {
      return allocation.costTiers[allocation.costTiers.length - 1]; // Highest tier
    }
    
    // Budget-based tier selection
    for (const tier of allocation.costTiers) {
      if (budgetUtilization <= tier.escalationThreshold) {
        return tier;
      }
    }
    
    // Default to highest tier if over budget
    return allocation.costTiers[allocation.costTiers.length - 1];
  }

  /**
   * Get providers that are affordable within current cost constraints
   */
  private async getAffordableProviders(
    serviceName: string,
    costTier: CostTier,
    costData: CostMonitoringData,
    context: FallbackContext
  ): Promise<FallbackProvider[]> {
    // Get all available providers for the service
    const fallbackStrategy = this.fallbackManager["strategies"].get(`${serviceName}_fallback`);
    if (!fallbackStrategy) {
      return [];
    }

    const availableProviders = fallbackStrategy.providers.filter(provider => {
      // Check if provider is in allowed list for this tier
      if (!costTier.allowedProviders.includes(provider.providerId)) {
        return false;
      }

      // Check cost per request constraint
      if ((provider.costPerRequest || 0) > costTier.maxCostPerRequest) {
        return false;
      }

      // Check if adding this request would exceed tier budget
      const projectedCost = costData.spending.totalSpent + (provider.costPerRequest || 0);
      if (projectedCost > costTier.maxTotalCost) {
        return false;
      }

      // Check if provider meets performance targets
      if (provider.healthCheckEndpoint) {
        // Would need actual health check - simplified for now
        return true;
      }

      return true;
    });

    return availableProviders;
  }

  /**
   * Select optimal provider from affordable options
   */
  private async selectOptimalProvider(
    providers: FallbackProvider[],
    costTier: CostTier,
    costData: CostMonitoringData,
    context: FallbackContext
  ): Promise<FallbackProvider> {
    if (providers.length === 1) {
      return providers[0];
    }

    // Score providers based on cost, performance, and business context
    const providerScores = providers.map(provider => {
      let score = 0;
      
      // Cost score (lower cost = higher score)
      const costScore = (costTier.maxCostPerRequest - (provider.costPerRequest || 0)) / costTier.maxCostPerRequest * 100;
      score += costScore * 0.4; // 40% weight on cost
      
      // Performance score (based on capabilities and region)
      const performanceScore = this.calculateProviderPerformanceScore(provider, costTier);
      score += performanceScore * 0.4; // 40% weight on performance
      
      // Business context score
      const businessScore = this.calculateBusinessContextScore(provider, context);
      score += businessScore * 0.2; // 20% weight on business context
      
      return { provider, score };
    });

    // Sort by score (descending) and return best provider
    providerScores.sort((a, b) => b.score - a.score);
    return providerScores[0].provider;
  }

  /**
   * Handle emergency fallback when no affordable providers available
   */
  private async handleEmergencyFallback(
    allocation: BudgetAllocation,
    costData: CostMonitoringData,
    context: FallbackContext
  ): Promise<CostAwareRoutingDecision> {
    logger.warn("No affordable providers available, activating emergency measures", {
      serviceName: context.serviceName,
      budgetUtilization: costData.spending.budgetUtilization
    });

    // Check if emergency budget is available
    if (allocation.emergencyBudget.autoActivation && 
        !this.emergencyBudgetActive.get(context.serviceName)) {
      
      await this.activateEmergencyBudget(context.serviceName, allocation);
      
      // Retry with emergency budget
      const emergencyTier = allocation.costTiers[allocation.costTiers.length - 1];
      const emergencyProviders = await this.getEmergencyProviders(
        context.serviceName,
        emergencyTier,
        context
      );
      
      if (emergencyProviders.length > 0) {
        const selectedProvider = emergencyProviders[0]; // Use first available emergency provider
        
        return {
          selectedProvider,
          costJustification: "Emergency budget activated due to no affordable providers",
          budgetImpact: {
            immediateImpact: selectedProvider.costPerRequest || 0,
            projectedImpact: (selectedProvider.costPerRequest || 0) * 100, // Assume 100 requests
            budgetUtilizationAfter: 100 // Emergency budget utilization
          },
          businessImpact: {
            revenueProtection: allocation.revenueProtection.maxRevenueImpact,
            operationalContinuity: "emergency_mode",
            customerExperienceImpact: "minimal_degradation"
          },
          alternatives: [],
          costOptimizations: ["emergency_cost_controls"],
          emergencyMeasures: {
            activated: true,
            measures: ["emergency_budget_activation", "elevated_cost_limits"],
            estimatedDuration: 60 // 1 hour
          }
        };
      }
    }

    // If no emergency options available, return circuit breaker decision
    throw new Error("No affordable providers available and emergency budget cannot be activated");
  }

  /**
   * Calculate budget impact of using selected provider
   */
  private calculateBudgetImpact(
    provider: FallbackProvider,
    costData: CostMonitoringData,
    allocation: BudgetAllocation
  ): any {
    const immediateImpact = provider.costPerRequest || 0;
    const projectedHourlyRequests = costData.spending.requestCount || 100; // Estimate
    const projectedImpact = immediateImpact * projectedHourlyRequests;
    
    const newTotalSpent = costData.spending.totalSpent + immediateImpact;
    const budgetUtilizationAfter = (newTotalSpent / allocation.totalBudget) * 100;

    return {
      immediateImpact,
      projectedImpact,
      budgetUtilizationAfter
    };
  }

  /**
   * Assess business impact of provider selection
   */
  private async assessBusinessImpact(
    provider: FallbackProvider,
    context: FallbackContext,
    allocation: BudgetAllocation
  ): Promise<any> {
    const revenueProtection = context.businessContext?.revenueImpacting ? 
      allocation.revenueProtection.maxRevenueImpact : 0;
    
    const operationalContinuity = provider.capabilities.includes("full_functionality") ?
      "maintained" : "reduced";
    
    const customerExperienceImpact = provider.limitations ? 
      "moderate_degradation" : "minimal_impact";

    return {
      revenueProtection,
      operationalContinuity,
      customerExperienceImpact
    };
  }

  /**
   * Generate cost alternatives
   */
  private generateCostAlternatives(
    availableProviders: FallbackProvider[],
    selectedProvider: FallbackProvider,
    costTier: CostTier
  ): any[] {
    return availableProviders
      .filter(p => p.providerId !== selectedProvider.providerId)
      .map(provider => ({
        provider,
        cost: provider.costPerRequest || 0,
        performanceTradeoff: this.assessPerformanceTradeoff(provider, selectedProvider),
        recommendation: this.generateProviderRecommendation(provider, costTier)
      }));
  }

  /**
   * Identify cost optimization opportunities
   */
  private identifyCostOptimizations(
    allocation: BudgetAllocation,
    costData: CostMonitoringData,
    context: FallbackContext
  ): string[] {
    const optimizations = [];
    
    if (costData.spending.budgetUtilization > 70) {
      optimizations.push("implement_request_caching");
    }
    
    if (context.metadata.retryCount > 0) {
      optimizations.push("optimize_retry_strategies");
    }
    
    if (allocation.costOptimization.enabled) {
      optimizations.push(...allocation.costOptimization.optimizationStrategies);
    }
    
    return optimizations;
  }

  /**
   * Start cost monitoring for all services
   */
  private startCostMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performCostMonitoring();
    }, 60000); // Monitor every minute

    logger.info("Cost monitoring started for all services");
  }

  /**
   * Perform cost monitoring for all services
   */
  private async performCostMonitoring(): Promise<void> {
    for (const serviceName of this.budgetAllocations.keys()) {
      try {
        await this.updateServiceCostMonitoring(serviceName);
      } catch (error) {
        logger.error(`Cost monitoring failed for ${serviceName}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Update cost monitoring for a specific service
   */
  private async updateServiceCostMonitoring(serviceName: string): Promise<void> {
    const allocation = this.budgetAllocations.get(serviceName);
    if (!allocation) return;

    const costData = await this.getCostMonitoringData(serviceName);
    
    // Update projections
    await this.updateCostProjections(serviceName, costData);
    
    // Check for alerts
    await this.checkBudgetAlerts(serviceName, costData);
    
    // Cache updated data
    await this.cacheCostMonitoring(serviceName, costData);
  }

  /**
   * Initialize cost monitoring for a service
   */
  private initializeCostMonitoring(serviceName: string, allocation: BudgetAllocation): void {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, allocation.budgetPeriod);
    const periodEnd = this.getPeriodEnd(periodStart, allocation.budgetPeriod);

    const costData: CostMonitoringData = {
      serviceName,
      currentPeriod: {
        startTime: periodStart,
        endTime: periodEnd,
        budgetPeriod: allocation.budgetPeriod
      },
      spending: {
        totalSpent: 0,
        budgetUtilization: 0,
        costPerRequest: 0,
        requestCount: 0
      },
      projections: {
        projectedSpending: 0,
        budgetOverrun: 0,
        timeToOverrun: 0,
        costTrend: "stable"
      },
      alerts: []
    };

    this.costMonitoring.set(serviceName, costData);
  }

  /**
   * Get cost monitoring data
   */
  public async getCostMonitoringData(serviceName: string): Promise<CostMonitoringData> {
    let costData = this.costMonitoring.get(serviceName);
    
    if (!costData) {
      const allocation = this.budgetAllocations.get(serviceName);
      if (allocation) {
        this.initializeCostMonitoring(serviceName, allocation);
        costData = this.costMonitoring.get(serviceName)!;
      } else {
        throw new Error(`No cost monitoring data for service: ${serviceName}`);
      }
    }

    // Check if we need to start a new period
    const now = new Date();
    if (now > costData.currentPeriod.endTime) {
      await this.startNewBudgetPeriod(serviceName);
      costData = this.costMonitoring.get(serviceName)!;
    }

    return costData;
  }

  /**
   * Update cost monitoring with new request cost
   */
  private async updateCostMonitoring(
    serviceName: string,
    cost: number,
    processingTime: number
  ): Promise<void> {
    const costData = await this.getCostMonitoringData(serviceName);
    const allocation = this.budgetAllocations.get(serviceName)!;

    // Update spending
    costData.spending.totalSpent += cost;
    costData.spending.requestCount += 1;
    costData.spending.costPerRequest = costData.spending.totalSpent / costData.spending.requestCount;
    costData.spending.budgetUtilization = (costData.spending.totalSpent / allocation.totalBudget) * 100;

    // Update monitoring data
    this.costMonitoring.set(serviceName, costData);

    // Emit cost update event
    this.emitCostEvent("cost_updated", {
      serviceName,
      cost,
      totalSpent: costData.spending.totalSpent,
      budgetUtilization: costData.spending.budgetUtilization
    });
  }

  /**
   * Update cost projections
   */
  private async updateCostProjections(serviceName: string, costData: CostMonitoringData): Promise<void> {
    const allocation = this.budgetAllocations.get(serviceName)!;
    const timeElapsed = Date.now() - costData.currentPeriod.startTime.getTime();
    const totalPeriodDuration = costData.currentPeriod.endTime.getTime() - costData.currentPeriod.startTime.getTime();
    const timeRemaining = totalPeriodDuration - timeElapsed;

    if (timeElapsed > 0 && costData.spending.requestCount > 0) {
      // Calculate spending rate
      const spendingRate = costData.spending.totalSpent / (timeElapsed / 3600000); // per hour
      
      // Project total spending for the period
      const projectedSpending = spendingRate * (totalPeriodDuration / 3600000);
      
      // Calculate potential overrun
      const budgetOverrun = Math.max(0, projectedSpending - allocation.totalBudget);
      
      // Calculate time to overrun
      const timeToOverrun = budgetOverrun > 0 ? 
        (allocation.totalBudget - costData.spending.totalSpent) / spendingRate * 60 : 0; // minutes

      // Update projections
      costData.projections = {
        projectedSpending,
        budgetOverrun,
        timeToOverrun,
        costTrend: this.calculateCostTrend(serviceName)
      };
    }
  }

  /**
   * Check for budget alerts
   */
  private async checkBudgetAlerts(serviceName: string, costData: CostMonitoringData): Promise<void> {
    const allocation = this.budgetAllocations.get(serviceName)!;
    const newAlerts = [];

    // Budget utilization warnings
    if (costData.spending.budgetUtilization > 90) {
      newAlerts.push({
        alertType: "budget_warning" as const,
        severity: "critical" as const,
        message: `Budget 90% utilized (${costData.spending.budgetUtilization.toFixed(1)}%)`,
        threshold: 90,
        currentValue: costData.spending.budgetUtilization,
        timestamp: new Date()
      });
    } else if (costData.spending.budgetUtilization > 75) {
      newAlerts.push({
        alertType: "budget_warning" as const,
        severity: "warning" as const,
        message: `Budget 75% utilized (${costData.spending.budgetUtilization.toFixed(1)}%)`,
        threshold: 75,
        currentValue: costData.spending.budgetUtilization,
        timestamp: new Date()
      });
    }

    // Overrun prediction alerts
    if (costData.projections.budgetOverrun > 0) {
      newAlerts.push({
        alertType: "overrun_prediction" as const,
        severity: "error" as const,
        message: `Budget overrun projected: $${costData.projections.budgetOverrun.toFixed(2)}`,
        threshold: allocation.totalBudget,
        currentValue: costData.projections.projectedSpending,
        timestamp: new Date()
      });
    }

    // Cost spike detection
    const recentCostRate = this.calculateRecentCostRate(serviceName);
    const historicalAverage = this.calculateHistoricalAverageCost(serviceName);
    
    if (recentCostRate > historicalAverage * 2) {
      newAlerts.push({
        alertType: "cost_spike" as const,
        severity: "warning" as const,
        message: `Cost spike detected: ${((recentCostRate / historicalAverage - 1) * 100).toFixed(1)}% above average`,
        threshold: historicalAverage,
        currentValue: recentCostRate,
        timestamp: new Date()
      });
    }

    // Add new alerts and remove old ones
    costData.alerts = [
      ...costData.alerts.filter(alert => 
        Date.now() - alert.timestamp.getTime() < 3600000 // Keep alerts for 1 hour
      ),
      ...newAlerts
    ];

    // Emit alerts
    for (const alert of newAlerts) {
      this.emitCostEvent("budget_alert", {
        serviceName,
        alert,
        budgetUtilization: costData.spending.budgetUtilization
      });
    }
  }

  /**
   * Activate emergency budget for a service
   */
  private async activateEmergencyBudget(serviceName: string, allocation: BudgetAllocation): Promise<void> {
    this.emergencyBudgetActive.set(serviceName, true);
    
    // Log emergency activation
    await AuditLog.create({
      eventType: "emergency_budget_activated",
      tableName: "cost_management",
      recordId: serviceName,
      userId: null,
      changes: {
        emergencyBudget: allocation.emergencyBudget.amount,
        reason: "no_affordable_providers",
        autoActivated: allocation.emergencyBudget.autoActivation
      },
      ipAddress: "system",
      userAgent: "CostAwareFallbackService"
    });

    // Emit emergency activation event
    this.emitCostEvent("emergency_budget_activated", {
      serviceName,
      emergencyBudget: allocation.emergencyBudget.amount,
      autoActivated: allocation.emergencyBudget.autoActivation
    });

    logger.warn("Emergency budget activated", {
      serviceName,
      emergencyBudget: allocation.emergencyBudget.amount
    });
  }

  /**
   * Utility methods
   */
  private calculateProviderPerformanceScore(provider: FallbackProvider, costTier: CostTier): number {
    let score = 50; // Base score
    
    // Score based on capabilities
    if (provider.capabilities.includes("full_functionality")) score += 30;
    if (provider.capabilities.includes("high_availability")) score += 20;
    
    // Penalties for limitations
    if (provider.limitations?.includes("higher_cost")) score -= 10;
    if (provider.limitations?.includes("rate_limits")) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateBusinessContextScore(provider: FallbackProvider, context: FallbackContext): number {
    let score = 50; // Base score
    
    // Business criticality adjustments
    if (context.businessContext?.revenueImpacting && 
        provider.capabilities.includes("revenue_protection")) {
      score += 40;
    }
    
    if (context.businessContext?.urgency === "critical" && 
        provider.capabilities.includes("emergency_support")) {
      score += 30;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private assessPerformanceTradeoff(provider: FallbackProvider, selectedProvider: FallbackProvider): string {
    const costDiff = (provider.costPerRequest || 0) - (selectedProvider.costPerRequest || 0);
    
    if (costDiff > 0.01) {
      return "higher_cost_better_performance";
    } else if (costDiff < -0.01) {
      return "lower_cost_reduced_performance";
    } else {
      return "similar_cost_and_performance";
    }
  }

  private generateProviderRecommendation(provider: FallbackProvider, costTier: CostTier): string {
    if ((provider.costPerRequest || 0) > costTier.maxCostPerRequest * 0.8) {
      return "cost_effective_within_tier";
    } else if ((provider.costPerRequest || 0) < costTier.maxCostPerRequest * 0.5) {
      return "highly_cost_effective";
    } else {
      return "balanced_cost_performance";
    }
  }

  private generateCostJustification(
    provider: FallbackProvider,
    costTier: CostTier,
    costData: CostMonitoringData,
    context: FallbackContext
  ): string {
    const justifications = [];
    
    justifications.push(`Selected ${provider.providerName} within ${costTier.tierName} tier`);
    justifications.push(`Cost: $${(provider.costPerRequest || 0).toFixed(4)} per request`);
    justifications.push(`Budget utilization: ${costData.spending.budgetUtilization.toFixed(1)}%`);
    
    if (context.businessContext?.revenueImpacting) {
      justifications.push("Revenue protection prioritized");
    }
    
    if (context.metadata.retryCount > 0) {
      justifications.push(`Retry attempt ${context.metadata.retryCount}`);
    }
    
    return justifications.join(", ");
  }

  private async getEmergencyProviders(
    serviceName: string,
    emergencyTier: CostTier,
    context: FallbackContext
  ): Promise<FallbackProvider[]> {
    // This would typically get emergency providers with higher cost limits
    // For now, return empty array as placeholder
    return [];
  }

  private calculateCostTrend(serviceName: string): "increasing" | "decreasing" | "stable" {
    // Simplified trend calculation - would analyze historical data
    return "stable";
  }

  private calculateRecentCostRate(serviceName: string): number {
    // Simplified calculation - would analyze recent cost data
    return 0.01;
  }

  private calculateHistoricalAverageCost(serviceName: string): number {
    // Simplified calculation - would analyze historical cost data
    return 0.01;
  }

  private startNewBudgetPeriod(serviceName: string): Promise<void> {
    const allocation = this.budgetAllocations.get(serviceName)!;
    this.initializeCostMonitoring(serviceName, allocation);
    return Promise.resolve();
  }

  private getPeriodStart(date: Date, period: BudgetPeriod): Date {
    const start = new Date(date);
    
    switch (period) {
      case BudgetPeriod.HOURLY:
        start.setMinutes(0, 0, 0);
        break;
      case BudgetPeriod.DAILY:
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.WEEKLY:
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case BudgetPeriod.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private getPeriodEnd(start: Date, period: BudgetPeriod): Date {
    const end = new Date(start);
    
    switch (period) {
      case BudgetPeriod.HOURLY:
        end.setHours(end.getHours() + 1);
        break;
      case BudgetPeriod.DAILY:
        end.setDate(end.getDate() + 1);
        break;
      case BudgetPeriod.WEEKLY:
        end.setDate(end.getDate() + 7);
        break;
      case BudgetPeriod.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
    }
    
    return end;
  }

  /**
   * Cache operations
   */
  private async cacheBudgetAllocation(serviceName: string, allocation: BudgetAllocation): Promise<void> {
    const cacheKey = `${this.BUDGET_CACHE_KEY}:allocation:${serviceName}`;
    await redisClient.setex(cacheKey, 3600, JSON.stringify(allocation));
  }

  private async cacheCostMonitoring(serviceName: string, costData: CostMonitoringData): Promise<void> {
    const cacheKey = `${this.COST_CACHE_KEY}:monitoring:${serviceName}`;
    await redisClient.setex(cacheKey, 300, JSON.stringify(costData));
  }

  /**
   * Emit cost event for real-time monitoring
   */
  private emitCostEvent(eventType: string, data: any): void {
    const event = {
      eventType,
      timestamp: new Date(),
      ...data
    };

    this.emit(eventType, event);
    
    // Send to frontend via WebSocket
    socketManager.emitCostEvent(event);
  }

  /**
   * Get comprehensive cost report for all services
   */
  public async getCostReport(): Promise<any> {
    const report = {
      totalServices: this.budgetAllocations.size,
      totalBudget: 0,
      totalSpent: 0,
      overallUtilization: 0,
      services: [],
      alerts: [],
      emergencyBudgetActivations: 0,
      lastUpdate: new Date()
    };

    for (const [serviceName, allocation] of this.budgetAllocations) {
      const costData = await this.getCostMonitoringData(serviceName);
      
      report.totalBudget += allocation.totalBudget;
      report.totalSpent += costData.spending.totalSpent;
      
      if (this.emergencyBudgetActive.get(serviceName)) {
        report.emergencyBudgetActivations++;
      }
      
      (report.services as any[]).push({
        serviceName,
        budget: allocation.totalBudget,
        spent: costData.spending.totalSpent,
        utilization: costData.spending.budgetUtilization,
        projectedSpending: costData.projections.projectedSpending,
        alerts: costData.alerts.length,
        emergencyActive: this.emergencyBudgetActive.get(serviceName) || false
      });
      
      report.alerts.push(...costData.alerts);
    }

    report.overallUtilization = (report.totalSpent / report.totalBudget) * 100;

    return report;
  }

  /**
   * Gracefully shutdown the service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down Cost-Aware Fallback Service");

    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Clear data structures
    this.budgetAllocations.clear();
    this.costMonitoring.clear();
    this.revenueProtection.clear();
    this.costTiers.clear();
    this.emergencyBudgetActive.clear();

    logger.info("Cost-Aware Fallback Service shutdown complete");
  }
}

// Export types for use in other modules
export {
  CostControlStrategy,
  BudgetPeriod,
  CostTier,
  BudgetAllocation,
  CostMonitoringData,
  CostAwareRoutingDecision,
  RevenueProtectionConfig
};

export default CostAwareFallbackService;