/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COST-AWARE FALLBACK STRATEGY SERVICE
 * ============================================================================
 *
 * Advanced cost-aware fallback strategies with budget protection mechanisms.
 * Supports intelligent traffic routing with emergency fallback scenarios.
 *
 * Features:
 * - Budget-aware fallback selection
 * - Emergency cost override mechanisms
 * - Multi-tier fallback strategies
 * - Cost optimization during failures
 * - Real-time budget monitoring
 * - Automatic cost throttling
 * - Performance vs cost trade-offs
 *
 * Performance Targets:
 * - Fallback decision time: <100ms
 * - Cost calculation: <20ms
 * - Budget check: <10ms
 * - 15-25% cost reduction during error scenarios
 *
 * Created by: Backend Development Agent (Group E Phase 1)
 * Date: 2025-08-19
 * Version: 1.0.0 - Cost-Aware Fallback Foundation
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { 
  IntelligentRoutingNode,
  SmartRoutingContext
} from "./IntelligentTrafficRoutingFoundation";
import { EventEmitter } from "events";

/**
 * Cost-aware fallback strategy types
 */
export enum FallbackStrategy {
  BUDGET_PRESERVING = "budget_preserving",
  EMERGENCY_OVERRIDE = "emergency_override",
  GRADUATED_DEGRADATION = "graduated_degradation",
  COST_THROTTLING = "cost_throttling",
  PERFORMANCE_SACRIFICE = "performance_sacrifice",
  HYBRID_COST_AWARE = "hybrid_cost_aware"
}

/**
 * Budget monitoring configuration
 */
export interface BudgetMonitoringConfig {
  monitoringId: string;
  serviceName: string;
  budgetLimits: {
    hourly: number; // dollars
    daily: number; // dollars
    monthly: number; // dollars
    emergency: number; // dollars
  };
  alertThresholds: {
    warning: number; // percentage of budget
    critical: number; // percentage of budget
    emergency: number; // percentage of budget
  };
  costTracking: {
    currentHourly: number;
    currentDaily: number;
    currentMonthly: number;
    projectedHourly: number;
    projectedDaily: number;
    projectedMonthly: number;
  };
  overrideSettings: {
    emergencyOverrideEnabled: boolean;
    maxOverrideAmount: number; // dollars
    overrideApprovalRequired: boolean;
    autoThrottleEnabled: boolean;
  };
  lastUpdated: Date;
}

/**
 * Fallback decision context
 */
export interface FallbackDecisionContext {
  originalNode: IntelligentRoutingNode;
  availableNodes: IntelligentRoutingNode[];
  routingContext: SmartRoutingContext;
  budgetStatus: {
    remainingHourly: number;
    remainingDaily: number;
    remainingMonthly: number;
    emergencyAvailable: boolean;
    overrideAuthorized: boolean;
  };
  errorScenario: {
    errorType: string;
    severity: "low" | "medium" | "high" | "critical";
    cascadingRisk: boolean;
    estimatedDuration: number; // minutes
    businessImpact: number; // dollar amount
  };
  performanceRequirements: {
    maxAcceptableLatency: number;
    minAcceptableSuccessRate: number;
    maxAcceptableErrorRate: number;
    performanceDegradationAllowed: boolean;
  };
  costConstraints: {
    maxCostIncrease: number; // percentage
    absoluteCostLimit: number; // dollars
    costOptimizationPriority: "high" | "medium" | "low";
  };
}

/**
 * Fallback decision result
 */
export interface FallbackDecisionResult {
  decisionId: string;
  strategy: FallbackStrategy;
  selectedNode: IntelligentRoutingNode | null;
  fallbackTier: number; // 1 = primary, 2 = secondary, 3 = emergency
  costImpact: {
    originalCost: number;
    fallbackCost: number;
    costDifference: number;
    costIncrease: number; // percentage
    budgetImpact: number; // percentage of remaining budget
  };
  performanceImpact: {
    latencyChange: number; // milliseconds
    successRateChange: number; // percentage
    expectedDegradation: "none" | "minimal" | "moderate" | "significant";
  };
  budgetProjection: {
    hourlyBurnRate: number;
    dailyProjection: number;
    monthlyProjection: number;
    budgetExhaustionTime: Date | null;
  };
  riskAssessment: {
    level: "very_low" | "low" | "medium" | "high" | "very_high";
    factors: string[];
    mitigationStrategies: string[];
  };
  recommendedActions: Array<{
    action: string;
    priority: "low" | "medium" | "high" | "critical";
    timeline: string;
    costImpact: number;
  }>;
  metadata: {
    decisionTime: number; // milliseconds
    confidenceScore: number; // 0-100
    algorithmVersion: string;
    fallbackReason: string;
  };
}

/**
 * Cost monitoring analytics
 */
export interface CostMonitoringAnalytics {
  serviceName: string;
  period: {
    startTime: Date;
    endTime: Date;
    duration: number; // hours
  };
  costMetrics: {
    totalSpent: number;
    averageCostPerRequest: number;
    peakCostPerHour: number;
    costTrend: "increasing" | "decreasing" | "stable";
    budgetUtilization: number; // percentage
  };
  fallbackMetrics: {
    totalFallbacks: number;
    costSavings: number;
    costIncreases: number;
    netCostImpact: number;
    averageFallbackDuration: number; // minutes
  };
  optimizationOpportunities: Array<{
    opportunity: string;
    potentialSavings: number;
    implementationComplexity: "low" | "medium" | "high";
    timeToImplement: number; // hours
  }>;
  riskMetrics: {
    budgetOverruns: number;
    emergencyOverrides: number;
    criticalCostEvents: number;
    averageRiskLevel: string;
  };
}

/**
 * Main cost-aware fallback strategy service
 */
export class CostAwareFallbackStrategy extends EventEmitter {
  private budgetConfigs: Map<string, BudgetMonitoringConfig> = new Map();
  private fallbackHistory: Map<string, FallbackDecisionResult[]> = new Map();
  private costAnalytics: Map<string, CostMonitoringAnalytics> = new Map();
  
  private budgetMonitoringInterval: NodeJS.Timeout | null = null;
  private costOptimizationInterval: NodeJS.Timeout | null = null;
  
  // Cache keys
  private readonly BUDGET_CACHE_KEY = "cost_aware_fallback_budget";
  private readonly FALLBACK_CACHE_KEY = "cost_aware_fallback_history";
  private readonly COST_ANALYTICS_CACHE_KEY = "cost_monitoring_analytics";

  constructor() {
    super();
    this.initializeBudgetMonitoring();
    this.startCostOptimization();
  }

  /**
   * Initialize budget monitoring for services
   */
  private initializeBudgetMonitoring(): void {
    // Initialize budget monitoring for critical services
    this.registerBudgetMonitoring("stripe_payments", {
      monitoringId: "budget_stripe_payments",
      serviceName: "stripe_payments",
      budgetLimits: {
        hourly: 100, // $100/hour
        daily: 2000, // $2000/day
        monthly: 50000, // $50,000/month
        emergency: 5000 // $5,000 emergency
      },
      alertThresholds: {
        warning: 70, // 70% of budget
        critical: 85, // 85% of budget
        emergency: 95 // 95% of budget
      },
      costTracking: {
        currentHourly: 25,
        currentDaily: 450,
        currentMonthly: 12000,
        projectedHourly: 28,
        projectedDaily: 480,
        projectedMonthly: 13500
      },
      overrideSettings: {
        emergencyOverrideEnabled: true,
        maxOverrideAmount: 10000,
        overrideApprovalRequired: false,
        autoThrottleEnabled: true
      },
      lastUpdated: new Date()
    });

    this.registerBudgetMonitoring("external_apis", {
      monitoringId: "budget_external_apis",
      serviceName: "external_apis",
      budgetLimits: {
        hourly: 50, // $50/hour
        daily: 1000, // $1000/day
        monthly: 25000, // $25,000/month
        emergency: 2500 // $2,500 emergency
      },
      alertThresholds: {
        warning: 75,
        critical: 90,
        emergency: 95
      },
      costTracking: {
        currentHourly: 15,
        currentDaily: 280,
        currentMonthly: 7500,
        projectedHourly: 18,
        projectedDaily: 320,
        projectedMonthly: 8800
      },
      overrideSettings: {
        emergencyOverrideEnabled: true,
        maxOverrideAmount: 5000,
        overrideApprovalRequired: true,
        autoThrottleEnabled: true
      },
      lastUpdated: new Date()
    });

    this.budgetMonitoringInterval = setInterval(async () => {
      await this.updateBudgetMonitoring();
    }, 300000); // Update every 5 minutes

    logger.info("Cost-aware fallback strategy initialized", {
      servicesMonitored: this.budgetConfigs.size,
      budgetMonitoringActive: true
    });
  }

  /**
   * Register budget monitoring for a service
   */
  public registerBudgetMonitoring(serviceName: string, config: BudgetMonitoringConfig): void {
    this.budgetConfigs.set(serviceName, config);
    this.cacheBudgetConfig(serviceName, config);
    
    logger.info("Budget monitoring registered", {
      serviceName,
      hourlyLimit: config.budgetLimits.hourly,
      dailyLimit: config.budgetLimits.daily,
      emergencyOverrideEnabled: config.overrideSettings.emergencyOverrideEnabled
    });

    this.emit("budgetMonitoringRegistered", { serviceName, config });
  }

  /**
   * Execute cost-aware fallback decision
   */
  public async executeFallbackDecision(context: FallbackDecisionContext): Promise<FallbackDecisionResult> {
    const startTime = Date.now();
    const decisionId = `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    logger.info("Executing cost-aware fallback decision", {
      decisionId,
      originalNode: context.originalNode.nodeId,
      availableNodes: context.availableNodes.length,
      errorSeverity: context.errorScenario.severity,
      budgetRemaining: context.budgetStatus.remainingHourly
    });

    try {
      // Determine optimal fallback strategy
      const strategy = this.selectOptimalFallbackStrategy(context);
      
      // Execute strategy-specific fallback logic
      const fallbackResult = await this.executeFallbackStrategy(strategy, context, decisionId);
      
      // Update cost tracking
      await this.updateCostTracking(context.routingContext.serviceName, fallbackResult);
      
      // Record fallback decision
      this.recordFallbackDecision(context.routingContext.serviceName, fallbackResult);
      
      const decisionTime = Date.now() - startTime;
      fallbackResult.metadata.decisionTime = decisionTime;

      // Emit fallback event
      this.emitFallbackEvent("cost_aware_fallback_executed", {
        decisionId,
        strategy,
        costImpact: fallbackResult.costImpact.costIncrease,
        selectedNode: fallbackResult.selectedNode?.nodeId,
        decisionTime
      });

      logger.info("Cost-aware fallback decision completed", {
        decisionId,
        strategy,
        selectedNode: fallbackResult.selectedNode?.nodeId,
        costImpact: fallbackResult.costImpact.costIncrease,
        decisionTime
      });

      return fallbackResult;

    } catch (error) {
      const decisionTime = Date.now() - startTime;
      
      logger.error("Cost-aware fallback decision failed", {
        decisionId,
        error: error.message,
        decisionTime
      });

      this.emitFallbackEvent("cost_aware_fallback_failed", {
        decisionId,
        error: error.message,
        decisionTime
      });

      throw error;
    }
  }

  /**
   * Select optimal fallback strategy based on context
   */
  private selectOptimalFallbackStrategy(context: FallbackDecisionContext): FallbackStrategy {
    // Emergency override if critical error and authorized
    if (context.errorScenario.severity === "critical" && 
        context.budgetStatus.overrideAuthorized) {
      return FallbackStrategy.EMERGENCY_OVERRIDE;
    }

    // Budget preserving if budget is low
    if (context.budgetStatus.remainingHourly < 50 && 
        !context.budgetStatus.emergencyAvailable) {
      return FallbackStrategy.BUDGET_PRESERVING;
    }

    // Cost throttling if high cost increase
    if (context.costConstraints.maxCostIncrease < 20) {
      return FallbackStrategy.COST_THROTTLING;
    }

    // Graduated degradation for balanced approach
    if (context.performanceRequirements.performanceDegradationAllowed) {
      return FallbackStrategy.GRADUATED_DEGRADATION;
    }

    // Performance sacrifice if cost is priority
    if (context.costConstraints.costOptimizationPriority === "high") {
      return FallbackStrategy.PERFORMANCE_SACRIFICE;
    }

    // Default to hybrid cost-aware
    return FallbackStrategy.HYBRID_COST_AWARE;
  }

  /**
   * Execute strategy-specific fallback logic
   */
  private async executeFallbackStrategy(
    strategy: FallbackStrategy,
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    switch (strategy) {
      case FallbackStrategy.BUDGET_PRESERVING:
        return this.executeBudgetPreservingFallback(context, decisionId);
      
      case FallbackStrategy.EMERGENCY_OVERRIDE:
        return this.executeEmergencyOverrideFallback(context, decisionId);
      
      case FallbackStrategy.GRADUATED_DEGRADATION:
        return this.executeGraduatedDegradationFallback(context, decisionId);
      
      case FallbackStrategy.COST_THROTTLING:
        return this.executeCostThrottlingFallback(context, decisionId);
      
      case FallbackStrategy.PERFORMANCE_SACRIFICE:
        return this.executePerformanceSacrificeFallback(context, decisionId);
      
      case FallbackStrategy.HYBRID_COST_AWARE:
        return this.executeHybridCostAwareFallback(context, decisionId);
      
      default:
        return this.executeHybridCostAwareFallback(context, decisionId);
    }
  }

  /**
   * Execute budget preserving fallback
   */
  private async executeBudgetPreservingFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Find cheapest available node
    const costSortedNodes = context.availableNodes
      .filter(node => node.costPerRequest <= context.originalNode.costPerRequest)
      .sort((a, b) => a.costPerRequest - b.costPerRequest);

    const selectedNode = costSortedNodes[0] || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "budget_preserving");

    return {
      decisionId,
      strategy: FallbackStrategy.BUDGET_PRESERVING,
      selectedNode,
      fallbackTier: selectedNode ? 1 : 3,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Monitor budget consumption closely",
          priority: "high",
          timeline: "immediate",
          costImpact: 0
        },
        {
          action: "Consider increasing budget allocation",
          priority: "medium",
          timeline: "within 24 hours",
          costImpact: 1000
        }
      ],
      metadata: {
        decisionTime: 0, // Will be set by caller
        confidenceScore: selectedNode ? 85 : 30,
        algorithmVersion: "v1.0.0-budget-preserving",
        fallbackReason: "Budget preservation required due to low remaining budget"
      }
    };
  }

  /**
   * Execute emergency override fallback
   */
  private async executeEmergencyOverrideFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Select best performing node regardless of cost
    const performanceSortedNodes = context.availableNodes
      .sort((a, b) => {
        const scoreA = (a.successRate * 0.6) + ((1000 - a.averageLatency) * 0.4);
        const scoreB = (b.successRate * 0.6) + ((1000 - b.averageLatency) * 0.4);
        return scoreB - scoreA;
      });

    const selectedNode = performanceSortedNodes[0] || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "emergency_override");

    return {
      decisionId,
      strategy: FallbackStrategy.EMERGENCY_OVERRIDE,
      selectedNode,
      fallbackTier: 1,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Document emergency override usage",
          priority: "high",
          timeline: "immediate",
          costImpact: 0
        },
        {
          action: "Review budget allocation post-emergency",
          priority: "high",
          timeline: "within 2 hours",
          costImpact: 0
        },
        {
          action: "Implement cost controls for future emergencies",
          priority: "medium",
          timeline: "within 48 hours",
          costImpact: 500
        }
      ],
      metadata: {
        decisionTime: 0,
        confidenceScore: selectedNode ? 95 : 50,
        algorithmVersion: "v1.0.0-emergency-override",
        fallbackReason: "Emergency override authorized for critical error scenario"
      }
    };
  }

  /**
   * Execute graduated degradation fallback
   */
  private async executeGraduatedDegradationFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Balance cost and performance with acceptable degradation
    const balancedNodes = context.availableNodes.map(node => {
      const costScore = Math.max(0, 100 - ((node.costPerRequest / context.originalNode.costPerRequest) * 100));
      const performanceScore = (node.successRate * 0.6) + ((1000 - node.averageLatency) * 0.4);
      const balancedScore = (costScore * 0.4) + (performanceScore * 0.6);
      
      return { node, score: balancedScore };
    }).sort((a, b) => b.score - a.score);

    const selectedNode = balancedNodes[0]?.node || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "graduated_degradation");

    return {
      decisionId,
      strategy: FallbackStrategy.GRADUATED_DEGRADATION,
      selectedNode,
      fallbackTier: 2,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Monitor performance degradation impact",
          priority: "medium",
          timeline: "within 1 hour",
          costImpact: 0
        },
        {
          action: "Prepare to upgrade if degradation is significant",
          priority: "medium",
          timeline: "within 4 hours",
          costImpact: 200
        }
      ],
      metadata: {
        decisionTime: 0,
        confidenceScore: selectedNode ? 80 : 40,
        algorithmVersion: "v1.0.0-graduated-degradation",
        fallbackReason: "Balanced cost-performance approach with acceptable degradation"
      }
    };
  }

  /**
   * Execute cost throttling fallback
   */
  private async executeCostThrottlingFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Throttle to stay within cost increase limits
    const maxAllowableCost = context.originalNode.costPerRequest * (1 + context.costConstraints.maxCostIncrease / 100);
    
    const affordableNodes = context.availableNodes
      .filter(node => node.costPerRequest <= maxAllowableCost)
      .sort((a, b) => {
        // Prioritize best performance within cost constraints
        const scoreA = a.successRate - (a.averageLatency / 10);
        const scoreB = b.successRate - (b.averageLatency / 10);
        return scoreB - scoreA;
      });

    const selectedNode = affordableNodes[0] || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "cost_throttling");

    return {
      decisionId,
      strategy: FallbackStrategy.COST_THROTTLING,
      selectedNode,
      fallbackTier: selectedNode ? 2 : 3,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Review cost increase thresholds",
          priority: "low",
          timeline: "within 24 hours",
          costImpact: 0
        },
        {
          action: "Consider temporary budget increase if needed",
          priority: "medium",
          timeline: "within 6 hours",
          costImpact: 500
        }
      ],
      metadata: {
        decisionTime: 0,
        confidenceScore: selectedNode ? 75 : 25,
        algorithmVersion: "v1.0.0-cost-throttling",
        fallbackReason: "Cost throttling applied to stay within increase limits"
      }
    };
  }

  /**
   * Execute performance sacrifice fallback
   */
  private async executePerformanceSacrificeFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Sacrifice performance for cost savings
    const costOptimizedNodes = context.availableNodes
      .filter(node => node.costPerRequest < context.originalNode.costPerRequest)
      .sort((a, b) => a.costPerRequest - b.costPerRequest);

    const selectedNode = costOptimizedNodes[0] || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "performance_sacrifice");

    return {
      decisionId,
      strategy: FallbackStrategy.PERFORMANCE_SACRIFICE,
      selectedNode,
      fallbackTier: 3,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Monitor business impact of performance degradation",
          priority: "high",
          timeline: "immediate",
          costImpact: 0
        },
        {
          action: "Prepare performance restoration plan",
          priority: "medium",
          timeline: "within 2 hours",
          costImpact: 300
        }
      ],
      metadata: {
        decisionTime: 0,
        confidenceScore: selectedNode ? 70 : 20,
        algorithmVersion: "v1.0.0-performance-sacrifice",
        fallbackReason: "Performance sacrificed for cost optimization priority"
      }
    };
  }

  /**
   * Execute hybrid cost-aware fallback
   */
  private async executeHybridCostAwareFallback(
    context: FallbackDecisionContext,
    decisionId: string
  ): Promise<FallbackDecisionResult> {
    // Hybrid approach balancing cost, performance, and risk
    const hybridScoredNodes = context.availableNodes.map(node => {
      const costScore = this.calculateCostScore(node, context);
      const performanceScore = this.calculatePerformanceScore(node, context);
      const riskScore = this.calculateRiskScore(node, context);
      
      // Dynamic weights based on context
      let weights = { cost: 0.4, performance: 0.4, risk: 0.2 };
      
      if (context.costConstraints.costOptimizationPriority === "high") {
        weights = { cost: 0.5, performance: 0.3, risk: 0.2 };
      } else if (context.errorScenario.severity === "critical") {
        weights = { cost: 0.2, performance: 0.5, risk: 0.3 };
      }
      
      const hybridScore = 
        (costScore * weights.cost) +
        (performanceScore * weights.performance) +
        (riskScore * weights.risk);
      
      return { node, score: hybridScore };
    }).sort((a, b) => b.score - a.score);

    const selectedNode = hybridScoredNodes[0]?.node || null;
    
    const costImpact = this.calculateCostImpact(context.originalNode, selectedNode);
    const performanceImpact = this.calculatePerformanceImpact(context.originalNode, selectedNode);
    const budgetProjection = this.calculateBudgetProjection(context, selectedNode);
    const riskAssessment = this.assessFallbackRisk(context, selectedNode, "hybrid_cost_aware");

    return {
      decisionId,
      strategy: FallbackStrategy.HYBRID_COST_AWARE,
      selectedNode,
      fallbackTier: 1,
      costImpact,
      performanceImpact,
      budgetProjection,
      riskAssessment,
      recommendedActions: [
        {
          action: "Monitor hybrid fallback performance",
          priority: "medium",
          timeline: "within 30 minutes",
          costImpact: 0
        },
        {
          action: "Optimize weights based on outcomes",
          priority: "low",
          timeline: "within 24 hours",
          costImpact: 0
        }
      ],
      metadata: {
        decisionTime: 0,
        confidenceScore: selectedNode ? 85 : 35,
        algorithmVersion: "v1.0.0-hybrid-cost-aware",
        fallbackReason: "Hybrid approach balancing cost, performance, and risk factors"
      }
    };
  }

  /**
   * Calculate cost impact
   */
  private calculateCostImpact(
    originalNode: IntelligentRoutingNode,
    fallbackNode: IntelligentRoutingNode | null
  ): any {
    if (!fallbackNode) {
      return {
        originalCost: originalNode.costPerRequest,
        fallbackCost: 0,
        costDifference: -originalNode.costPerRequest,
        costIncrease: -100,
        budgetImpact: 0
      };
    }

    const costDifference = fallbackNode.costPerRequest - originalNode.costPerRequest;
    const costIncrease = (costDifference / originalNode.costPerRequest) * 100;

    return {
      originalCost: originalNode.costPerRequest,
      fallbackCost: fallbackNode.costPerRequest,
      costDifference,
      costIncrease,
      budgetImpact: Math.abs(costDifference) / fallbackNode.budgetRemaining * 100
    };
  }

  /**
   * Calculate performance impact
   */
  private calculatePerformanceImpact(
    originalNode: IntelligentRoutingNode,
    fallbackNode: IntelligentRoutingNode | null
  ): any {
    if (!fallbackNode) {
      return {
        latencyChange: Infinity,
        successRateChange: -100,
        expectedDegradation: "significant" as const
      };
    }

    const latencyChange = fallbackNode.averageLatency - originalNode.averageLatency;
    const successRateChange = fallbackNode.successRate - originalNode.successRate;
    
    let expectedDegradation: "none" | "minimal" | "moderate" | "significant";
    
    if (latencyChange <= 50 && successRateChange >= -2) {
      expectedDegradation = "none";
    } else if (latencyChange <= 200 && successRateChange >= -5) {
      expectedDegradation = "minimal";
    } else if (latencyChange <= 500 && successRateChange >= -10) {
      expectedDegradation = "moderate";
    } else {
      expectedDegradation = "significant";
    }

    return {
      latencyChange,
      successRateChange,
      expectedDegradation
    };
  }

  /**
   * Calculate budget projection
   */
  private calculateBudgetProjection(
    context: FallbackDecisionContext,
    fallbackNode: IntelligentRoutingNode | null
  ): any {
    if (!fallbackNode) {
      return {
        hourlyBurnRate: 0,
        dailyProjection: 0,
        monthlyProjection: 0,
        budgetExhaustionTime: null
      };
    }

    // Estimate requests per hour based on current load
    const estimatedRequestsPerHour = Math.max(100, fallbackNode.currentLoad * 10);
    const hourlyBurnRate = fallbackNode.costPerRequest * estimatedRequestsPerHour;
    const dailyProjection = hourlyBurnRate * 24;
    const monthlyProjection = dailyProjection * 30;

    let budgetExhaustionTime = null;
    if (context.budgetStatus.remainingHourly > 0) {
      const hoursUntilExhaustion = context.budgetStatus.remainingHourly / hourlyBurnRate;
      budgetExhaustionTime = new Date(Date.now() + (hoursUntilExhaustion * 3600000));
    }

    return {
      hourlyBurnRate,
      dailyProjection,
      monthlyProjection,
      budgetExhaustionTime
    };
  }

  /**
   * Assess fallback risk
   */
  private assessFallbackRisk(
    context: FallbackDecisionContext,
    fallbackNode: IntelligentRoutingNode | null,
    strategy: string
  ): any {
    const riskFactors = [];
    let riskScore = 0;

    if (!fallbackNode) {
      riskFactors.push("no_fallback_available");
      riskScore += 50;
    } else {
      // Cost risk
      if (fallbackNode.costPerRequest > context.originalNode.costPerRequest * 1.5) {
        riskFactors.push("high_cost_increase");
        riskScore += 20;
      }

      // Performance risk
      if (fallbackNode.averageLatency > context.originalNode.averageLatency * 2) {
        riskFactors.push("significant_latency_increase");
        riskScore += 25;
      }

      if (fallbackNode.successRate < context.originalNode.successRate - 10) {
        riskFactors.push("significant_reliability_decrease");
        riskScore += 25;
      }

      // Budget risk
      if (context.budgetStatus.remainingHourly < 100) {
        riskFactors.push("low_budget_remaining");
        riskScore += 15;
      }

      // Error scenario risk
      if (context.errorScenario.cascadingRisk) {
        riskFactors.push("cascading_failure_risk");
        riskScore += 20;
      }
    }

    let riskLevel: "very_low" | "low" | "medium" | "high" | "very_high";
    if (riskScore < 20) riskLevel = "very_low";
    else if (riskScore < 40) riskLevel = "low";
    else if (riskScore < 60) riskLevel = "medium";
    else if (riskScore < 80) riskLevel = "high";
    else riskLevel = "very_high";

    const mitigationStrategies = this.generateMitigationStrategies(riskFactors, strategy);

    return {
      level: riskLevel,
      factors: riskFactors,
      mitigationStrategies
    };
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(riskFactors: string[], strategy: string): string[] {
    const strategies = [];

    if (riskFactors.includes("high_cost_increase")) {
      strategies.push("Implement cost monitoring and alerts");
      strategies.push("Consider budget reallocation");
    }

    if (riskFactors.includes("significant_latency_increase")) {
      strategies.push("Monitor performance impact on business metrics");
      strategies.push("Prepare performance restoration plan");
    }

    if (riskFactors.includes("significant_reliability_decrease")) {
      strategies.push("Increase monitoring frequency");
      strategies.push("Prepare primary service restoration");
    }

    if (riskFactors.includes("low_budget_remaining")) {
      strategies.push("Request emergency budget approval");
      strategies.push("Implement cost throttling measures");
    }

    if (riskFactors.includes("cascading_failure_risk")) {
      strategies.push("Isolate failed services");
      strategies.push("Implement circuit breaker patterns");
    }

    return strategies;
  }

  /**
   * Helper scoring methods
   */
  private calculateCostScore(node: IntelligentRoutingNode, context: FallbackDecisionContext): number {
    const originalCost = context.originalNode.costPerRequest;
    const costRatio = node.costPerRequest / originalCost;
    return Math.max(0, 100 - (costRatio * 50)); // Lower cost = higher score
  }

  private calculatePerformanceScore(node: IntelligentRoutingNode, context: FallbackDecisionContext): number {
    let score = node.successRate * 0.6; // Base on success rate
    score += Math.max(0, 100 - (node.averageLatency / 10)) * 0.4; // Add latency component
    return Math.min(100, score);
  }

  private calculateRiskScore(node: IntelligentRoutingNode, context: FallbackDecisionContext): number {
    let score = node.healthScore * 0.5;
    
    // Penalty for circuit breaker issues
    if (node.circuitBreakerState !== "closed") score -= 30;
    
    // Bonus for error coordination support
    if (node.supportsErrorCoordination) score += 20;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update budget monitoring
   */
  private async updateBudgetMonitoring(): Promise<void> {
    for (const [serviceName, config] of this.budgetConfigs) {
      try {
        await this.updateServiceBudgetMetrics(serviceName, config);
      } catch (error) {
        logger.error(`Budget monitoring update failed for ${serviceName}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Update service budget metrics
   */
  private async updateServiceBudgetMetrics(serviceName: string, config: BudgetMonitoringConfig): Promise<void> {
    // In a real implementation, this would fetch actual cost data from billing APIs
    // For now, simulate cost tracking updates
    
    const currentHour = new Date().getHours();
    const baseHourlyCost = config.costTracking.currentHourly;
    
    // Simulate cost fluctuations
    const fluctuation = (Math.random() - 0.5) * 0.2; // ±10% fluctuation
    config.costTracking.currentHourly = baseHourlyCost * (1 + fluctuation);
    config.costTracking.projectedHourly = config.costTracking.currentHourly * 1.1;
    
    // Update daily and monthly projections
    config.costTracking.projectedDaily = config.costTracking.projectedHourly * 24;
    config.costTracking.projectedMonthly = config.costTracking.projectedDaily * 30;
    
    config.lastUpdated = new Date();
    
    // Check for budget alerts
    await this.checkBudgetAlerts(serviceName, config);
    
    // Cache updated config
    this.cacheBudgetConfig(serviceName, config);
  }

  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(serviceName: string, config: BudgetMonitoringConfig): Promise<void> {
    const hourlyUtilization = (config.costTracking.currentHourly / config.budgetLimits.hourly) * 100;
    const dailyUtilization = (config.costTracking.projectedDaily / config.budgetLimits.daily) * 100;
    
    if (hourlyUtilization >= config.alertThresholds.emergency) {
      this.emitBudgetAlert("emergency", serviceName, {
        utilization: hourlyUtilization,
        period: "hourly",
        threshold: config.alertThresholds.emergency
      });
    } else if (hourlyUtilization >= config.alertThresholds.critical) {
      this.emitBudgetAlert("critical", serviceName, {
        utilization: hourlyUtilization,
        period: "hourly",
        threshold: config.alertThresholds.critical
      });
    } else if (hourlyUtilization >= config.alertThresholds.warning) {
      this.emitBudgetAlert("warning", serviceName, {
        utilization: hourlyUtilization,
        period: "hourly",
        threshold: config.alertThresholds.warning
      });
    }
  }

  /**
   * Start cost optimization
   */
  private startCostOptimization(): void {
    this.costOptimizationInterval = setInterval(async () => {
      await this.performCostOptimization();
    }, 900000); // Optimize every 15 minutes

    logger.info("Cost optimization monitoring started");
  }

  /**
   * Perform cost optimization analysis
   */
  private async performCostOptimization(): Promise<void> {
    for (const serviceName of this.budgetConfigs.keys()) {
      try {
        await this.analyzeServiceCostOptimization(serviceName);
      } catch (error) {
        logger.error(`Cost optimization analysis failed for ${serviceName}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Analyze service cost optimization
   */
  private async analyzeServiceCostOptimization(serviceName: string): Promise<void> {
    const history = this.fallbackHistory.get(serviceName) || [];
    
    if (history.length < 5) return; // Need sufficient data
    
    // Analyze cost savings opportunities
    const recentDecisions = history.slice(-20); // Last 20 decisions
    const totalCostSavings = recentDecisions.reduce((sum, decision) => 
      sum + Math.max(0, -decision.costImpact.costDifference), 0
    );
    
    const totalCostIncreases = recentDecisions.reduce((sum, decision) => 
      sum + Math.max(0, decision.costImpact.costDifference), 0
    );
    
    const netCostImpact = totalCostSavings - totalCostIncreases;
    
    logger.info("Cost optimization analysis completed", {
      serviceName,
      recentDecisions: recentDecisions.length,
      totalCostSavings: Math.round(totalCostSavings * 100) / 100,
      totalCostIncreases: Math.round(totalCostIncreases * 100) / 100,
      netCostImpact: Math.round(netCostImpact * 100) / 100
    });
  }

  /**
   * Record fallback decision
   */
  private recordFallbackDecision(serviceName: string, decision: FallbackDecisionResult): void {
    const history = this.fallbackHistory.get(serviceName) || [];
    history.push(decision);
    
    // Keep only last 100 decisions
    if (history.length > 100) {
      history.shift();
    }
    
    this.fallbackHistory.set(serviceName, history);
    
    // Cache for persistence
    this.cacheFallbackHistory(serviceName, history);
  }

  /**
   * Update cost tracking
   */
  private async updateCostTracking(serviceName: string, result: FallbackDecisionResult): Promise<void> {
    const config = this.budgetConfigs.get(serviceName);
    if (!config) return;
    
    // Update cost tracking based on fallback decision
    if (result.selectedNode) {
      const costImpact = result.costImpact.costDifference;
      config.costTracking.currentHourly += costImpact;
      config.costTracking.projectedHourly += costImpact * 1.1; // Add 10% buffer
    }
    
    config.lastUpdated = new Date();
    this.cacheBudgetConfig(serviceName, config);
  }

  /**
   * Cache operations
   */
  private async cacheBudgetConfig(serviceName: string, config: BudgetMonitoringConfig): Promise<void> {
    const cacheKey = `${this.BUDGET_CACHE_KEY}:${serviceName}`;
    await redisClient.setex(cacheKey, 3600, JSON.stringify(config));
  }

  private async cacheFallbackHistory(serviceName: string, history: FallbackDecisionResult[]): Promise<void> {
    const cacheKey = `${this.FALLBACK_CACHE_KEY}:${serviceName}`;
    await redisClient.setex(cacheKey, 1800, JSON.stringify(history));
  }

  /**
   * Event emission
   */
  private emitFallbackEvent(eventType: string, data: any): void {
    const event = {
      eventType,
      timestamp: new Date(),
      ...data
    };

    this.emit(eventType, event);
  }

  private emitBudgetAlert(severity: string, serviceName: string, data: any): void {
    const alert = {
      alertType: "budget_threshold_exceeded",
      severity,
      serviceName,
      timestamp: new Date(),
      ...data
    };

    this.emit("budgetAlert", alert);
    
    logger.warn("Budget alert triggered", {
      severity,
      serviceName,
      utilization: data.utilization,
      period: data.period
    });
  }

  /**
   * Get cost monitoring analytics
   */
  public async getCostMonitoringAnalytics(serviceName: string): Promise<CostMonitoringAnalytics | null> {
    const config = this.budgetConfigs.get(serviceName);
    const history = this.fallbackHistory.get(serviceName) || [];
    
    if (!config || history.length === 0) return null;
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const recentDecisions = history.filter(d => d.metadata.decisionTime >= oneHourAgo.getTime());
    
    const analytics: CostMonitoringAnalytics = {
      serviceName,
      period: {
        startTime: oneHourAgo,
        endTime: now,
        duration: 1
      },
      costMetrics: {
        totalSpent: config.costTracking.currentHourly,
        averageCostPerRequest: config.costTracking.currentHourly / Math.max(1, recentDecisions.length),
        peakCostPerHour: config.costTracking.projectedHourly,
        costTrend: config.costTracking.projectedHourly > config.costTracking.currentHourly ? "increasing" : "decreasing",
        budgetUtilization: (config.costTracking.currentHourly / config.budgetLimits.hourly) * 100
      },
      fallbackMetrics: {
        totalFallbacks: recentDecisions.length,
        costSavings: recentDecisions.reduce((sum, d) => sum + Math.max(0, -d.costImpact.costDifference), 0),
        costIncreases: recentDecisions.reduce((sum, d) => sum + Math.max(0, d.costImpact.costDifference), 0),
        netCostImpact: recentDecisions.reduce((sum, d) => sum + d.costImpact.costDifference, 0),
        averageFallbackDuration: 30 // Would be calculated from actual duration data
      },
      optimizationOpportunities: [
        {
          opportunity: "Implement predictive fallback scheduling",
          potentialSavings: 500,
          implementationComplexity: "medium",
          timeToImplement: 8
        }
      ],
      riskMetrics: {
        budgetOverruns: recentDecisions.filter(d => d.costImpact.costIncrease > 50).length,
        emergencyOverrides: recentDecisions.filter(d => d.strategy === FallbackStrategy.EMERGENCY_OVERRIDE).length,
        criticalCostEvents: recentDecisions.filter(d => d.riskAssessment.level === "high" || d.riskAssessment.level === "very_high").length,
        averageRiskLevel: this.calculateAverageRiskLevel(recentDecisions)
      }
    };
    
    return analytics;
  }

  /**
   * Calculate average risk level
   */
  private calculateAverageRiskLevel(decisions: FallbackDecisionResult[]): string {
    if (decisions.length === 0) return "low";
    
    const riskValues = decisions.map(d => {
      switch (d.riskAssessment.level) {
        case "very_low": return 1;
        case "low": return 2;
        case "medium": return 3;
        case "high": return 4;
        case "very_high": return 5;
        default: return 2;
      }
    });
    
    const average = riskValues.reduce((sum, val) => sum + val, 0) / riskValues.length;
    
    if (average < 1.5) return "very_low";
    if (average < 2.5) return "low";
    if (average < 3.5) return "medium";
    if (average < 4.5) return "high";
    return "very_high";
  }

  /**
   * Get budget monitoring status
   */
  public getBudgetMonitoringStatus(): Map<string, BudgetMonitoringConfig> {
    return new Map(this.budgetConfigs);
  }

  /**
   * Gracefully shutdown the service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down Cost-Aware Fallback Strategy Service");

    if (this.budgetMonitoringInterval) {
      clearInterval(this.budgetMonitoringInterval);
      this.budgetMonitoringInterval = null;
    }

    if (this.costOptimizationInterval) {
      clearInterval(this.costOptimizationInterval);
      this.costOptimizationInterval = null;
    }
    
    this.budgetConfigs.clear();
    this.fallbackHistory.clear();
    this.costAnalytics.clear();

    logger.info("Cost-Aware Fallback Strategy Service shutdown complete");
  }
}

export { FallbackStrategy, BudgetMonitoringConfig, FallbackDecisionContext, FallbackDecisionResult };
export default CostAwareFallbackStrategy;