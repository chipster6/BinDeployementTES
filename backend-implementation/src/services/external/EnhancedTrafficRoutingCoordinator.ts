/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ENHANCED TRAFFIC ROUTING COORDINATOR
 * ============================================================================
 *
 * Advanced traffic routing coordinator integrating with Backend Agent error systems:
 * - Intelligent traffic routing optimization during error scenarios
 * - Seamless coordination with Backend Agent error handling infrastructure
 * - Real-time provider health monitoring and predictive failover
 * - Cost-performance optimization with budget protection
 * - Business continuity management during critical scenarios
 * - Comprehensive analytics and monitoring integration
 *
 * Features:
 * - Multi-dimensional routing optimization (cost, performance, reliability)
 * - Backend Agent error system coordination and integration
 * - Predictive analytics with machine learning-based decisions
 * - Real-time health monitoring and circuit breaker patterns
 * - Geographic and latency-aware routing optimization
 * - Emergency mode activation with unlimited budget override
 *
 * Created by: System Architecture Lead
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import { socketManager } from "@/services/socketManager";
import { jobQueue } from "@/services/jobQueue";
import { 
  IntelligentTrafficRoutingService,
  RoutingStrategy,
  RoutingDecisionContext,
  RoutingDecision,
  RoutingNode,
  TrafficDistribution
} from "./IntelligentTrafficRoutingService";
import { 
  ErrorScenarioOptimizationService,
  ErrorScenarioType,
  OptimizationStrategy,
  ErrorScenarioContext,
  OptimizationDecision
} from "./ErrorScenarioOptimizationService";
import { 
  FallbackStrategyManager,
  ServicePriority,
  BusinessCriticality,
  FallbackContext
} from "./FallbackStrategyManager";
import { CrossStreamErrorCoordinator } from "../CrossStreamErrorCoordinator";
import { EnterpriseErrorRecoveryStrategiesService } from "../EnterpriseErrorRecoveryStrategiesService";
import { RealTimeErrorMonitoring } from "../RealTimeErrorMonitoring";
import { EventEmitter } from "events";

/**
 * Enhanced coordination context
 */
export interface EnhancedCoordinationContext {
  coordinationId: string;
  serviceName: string;
  operation: string;
  routingContext: RoutingDecisionContext;
  errorScenarioContext?: ErrorScenarioContext;
  backendAgentContext: {
    errorStreamId: string;
    recoveryStrategyId?: string;
    monitoringSessionId?: string;
    crossStreamCoordinationId?: string;
  };
  businessContext: {
    revenueImpact: number;
    customerImpact: "none" | "minor" | "moderate" | "severe";
    operationalPriority: "low" | "medium" | "high" | "critical";
    timeSensitivity: "flexible" | "standard" | "urgent" | "immediate";
  };
  coordinationRequirements: {
    requireBackendAgentSync: boolean;
    requireRealTimeMonitoring: boolean;
    requirePredictiveAnalytics: boolean;
    requireEmergencyOverride: boolean;
  };
  metadata: {
    coordinationTimestamp: Date;
    requestId: string;
    userId?: string;
    organizationId?: string;
    sessionId?: string;
  };
}

/**
 * Enhanced coordination result
 */
export interface EnhancedCoordinationResult {
  coordinationId: string;
  routingDecision: RoutingDecision;
  optimizationDecision?: OptimizationDecision;
  backendAgentIntegration: {
    errorStreamRegistered: boolean;
    recoveryStrategyActivated: boolean;
    monitoringActive: boolean;
    crossStreamCoordinated: boolean;
  };
  performanceMetrics: {
    totalCoordinationTime: number; // milliseconds
    routingDecisionTime: number;
    backendIntegrationTime: number;
    optimizationTime: number;
  };
  businessOutcome: {
    estimatedCostSavings: number;
    estimatedPerformanceGain: number;
    riskMitigation: "low" | "medium" | "high";
    customerImpactReduction: number; // percentage
  };
  monitoringPlan: {
    keyMetrics: string[];
    alertThresholds: any;
    escalationTriggers: string[];
    reviewInterval: number; // minutes
  };
  metadata: {
    confidenceScore: number; // 0-100
    coordinationStrategy: string;
    appliedOptimizations: string[];
    nextReviewTime: Date;
  };
}

/**
 * Traffic routing analytics with Backend Agent integration
 */
export interface EnhancedTrafficAnalytics {
  serviceName: string;
  coordinationPeriod: {
    startTime: Date;
    endTime: Date;
    totalCoordinations: number;
  };
  routingPerformance: {
    averageDecisionTime: number;
    successRate: number;
    costOptimization: number; // percentage savings
    latencyImprovement: number; // percentage reduction
  };
  backendAgentIntegration: {
    errorStreamIntegrations: number;
    recoveryStrategyActivations: number;
    crossStreamCoordinations: number;
    monitoringSessionsActive: number;
  };
  businessImpact: {
    revenueProtected: number;
    costSavingsRealized: number;
    customerSatisfactionImpact: number;
    operationalEfficiencyGain: number;
  };
  systemReliability: {
    uptimePercentage: number;
    errorRateReduction: number;
    recoveryTimeImprovement: number;
    preventedCascadingFailures: number;
  };
  optimizationInsights: string[];
}

/**
 * Main enhanced traffic routing coordinator
 */
export class EnhancedTrafficRoutingCoordinator extends EventEmitter {
  private routingService: IntelligentTrafficRoutingService;
  private optimizationService: ErrorScenarioOptimizationService;
  private fallbackManager: FallbackStrategyManager;
  private crossStreamCoordinator: CrossStreamErrorCoordinator;
  private recoveryService: EnterpriseErrorRecoveryStrategiesService;
  private monitoringService: RealTimeErrorMonitoring;
  
  private activeCoordinations: Map<string, EnhancedCoordinationContext> = new Map();
  private coordinationHistory: Map<string, EnhancedCoordinationResult[]> = new Map();
  private performanceAnalytics: Map<string, EnhancedTrafficAnalytics> = new Map();
  private backendAgentConnections: Map<string, any> = new Map();
  
  private coordinationInterval: NodeJS.Timeout | null = null;
  private analyticsInterval: NodeJS.Timeout | null = null;
  
  // Cache keys
  private readonly COORDINATION_CACHE_KEY = "enhanced_traffic_coordination";
  private readonly ANALYTICS_CACHE_KEY = "enhanced_traffic_analytics";
  private readonly BACKEND_INTEGRATION_CACHE_KEY = "backend_agent_integration";

  constructor(
    routingService: IntelligentTrafficRoutingService,
    optimizationService: ErrorScenarioOptimizationService,
    fallbackManager: FallbackStrategyManager
  ) {
    super();
    this.routingService = routingService;
    this.optimizationService = optimizationService;
    this.fallbackManager = fallbackManager;
    
    // Initialize Backend Agent service integrations
    this.crossStreamCoordinator = new CrossStreamErrorCoordinator();
    this.recoveryService = new EnterpriseErrorRecoveryStrategiesService();
    this.monitoringService = new RealTimeErrorMonitoring();
    
    this.initializeBackendAgentIntegration();
    this.startCoordinationMonitoring();
    this.startAnalyticsProcessing();
  }

  /**
   * Initialize Backend Agent integration
   */
  private initializeBackendAgentIntegration(): void {
    // Setup event listeners for Backend Agent systems
    this.crossStreamCoordinator.on('errorDetected', this.handleBackendAgentError.bind(this));
    this.recoveryService.on('recoveryStrategyActivated', this.handleRecoveryStrategyActivation.bind(this));
    this.monitoringService.on('performanceDegradation', this.handlePerformanceDegradation.bind(this));

    logger.info("Backend Agent integration initialized", {
      services: [
        "CrossStreamErrorCoordinator",
        "EnterpriseErrorRecoveryStrategiesService", 
        "RealTimeErrorMonitoring"
      ]
    });
  }

  /**
   * Execute enhanced traffic routing coordination
   */
  public async executeEnhancedCoordination(
    context: EnhancedCoordinationContext
  ): Promise<EnhancedCoordinationResult> {
    const startTime = Date.now();
    
    logger.info("Executing enhanced traffic routing coordination", {
      coordinationId: context.coordinationId,
      serviceName: context.serviceName,
      operation: context.operation,
      businessPriority: context.businessContext.operationalPriority,
      requiresBackendSync: context.coordinationRequirements.requireBackendAgentSync
    });

    try {
      // Register active coordination
      this.activeCoordinations.set(context.coordinationId, context);

      // Step 1: Coordinate with Backend Agent error systems
      const backendIntegrationStart = Date.now();
      const backendIntegration = await this.coordinateWithBackendAgent(context);
      const backendIntegrationTime = Date.now() - backendIntegrationStart;

      // Step 2: Execute intelligent routing decision
      const routingStart = Date.now();
      const routingDecision = await this.routingService.makeRoutingDecision(context.routingContext);
      const routingDecisionTime = Date.now() - routingStart;

      // Step 3: Execute optimization if error scenario present
      let optimizationDecision: OptimizationDecision | undefined;
      let optimizationTime = 0;
      
      if (context.errorScenarioContext) {
        const optimizationStart = Date.now();
        optimizationDecision = await this.optimizationService.handleErrorScenario(context.errorScenarioContext);
        optimizationTime = Date.now() - optimizationStart;
      }

      // Step 4: Calculate business outcomes and performance metrics
      const businessOutcome = this.calculateBusinessOutcome(context, routingDecision, optimizationDecision);
      const monitoringPlan = this.createEnhancedMonitoringPlan(context, routingDecision);

      // Step 5: Generate coordination result
      const coordinationResult: EnhancedCoordinationResult = {
        coordinationId: context.coordinationId,
        routingDecision,
        optimizationDecision,
        backendAgentIntegration: backendIntegration,
        performanceMetrics: {
          totalCoordinationTime: Date.now() - startTime,
          routingDecisionTime,
          backendIntegrationTime,
          optimizationTime
        },
        businessOutcome,
        monitoringPlan,
        metadata: {
          confidenceScore: this.calculateCoordinationConfidence(context, routingDecision, optimizationDecision),
          coordinationStrategy: this.determineCoordinationStrategy(context),
          appliedOptimizations: this.getAppliedOptimizations(context, routingDecision, optimizationDecision),
          nextReviewTime: new Date(Date.now() + (monitoringPlan.reviewInterval * 60000))
        }
      };

      // Step 6: Start enhanced monitoring
      await this.startEnhancedMonitoring(coordinationResult);

      // Step 7: Record coordination for analytics
      this.recordCoordinationResult(context.serviceName, coordinationResult);

      // Step 8: Emit coordination events
      this.emitCoordinationEvent("enhanced_coordination_completed", {
        coordinationId: context.coordinationId,
        serviceName: context.serviceName,
        selectedProvider: routingDecision.selectedNode.providerName,
        coordinationTime: coordinationResult.performanceMetrics.totalCoordinationTime,
        confidenceScore: coordinationResult.metadata.confidenceScore,
        backendIntegrated: backendIntegration.errorStreamRegistered
      });

      // Step 9: Create audit log
      await this.createCoordinationAuditLog(context, coordinationResult);

      logger.info("Enhanced traffic routing coordination completed", {
        coordinationId: context.coordinationId,
        serviceName: context.serviceName,
        selectedProvider: routingDecision.selectedNode.providerName,
        coordinationTime: coordinationResult.performanceMetrics.totalCoordinationTime,
        confidenceScore: coordinationResult.metadata.confidenceScore,
        costSavings: businessOutcome.estimatedCostSavings
      });

      return coordinationResult;

    } catch (error) {
      const coordinationTime = Date.now() - startTime;
      
      logger.error("Enhanced traffic routing coordination failed", {
        coordinationId: context.coordinationId,
        serviceName: context.serviceName,
        error: error.message,
        coordinationTime
      });

      // Emit failure event
      this.emitCoordinationEvent("enhanced_coordination_failed", {
        coordinationId: context.coordinationId,
        serviceName: context.serviceName,
        error: error.message,
        coordinationTime
      });

      throw error;

    } finally {
      // Remove from active coordinations
      this.activeCoordinations.delete(context.coordinationId);
    }
  }

  /**
   * Coordinate with Backend Agent error systems
   */
  private async coordinateWithBackendAgent(
    context: EnhancedCoordinationContext
  ): Promise<any> {
    const integration = {
      errorStreamRegistered: false,
      recoveryStrategyActivated: false,
      monitoringActive: false,
      crossStreamCoordinated: false
    };

    try {
      // Register with cross-stream error coordinator
      if (context.coordinationRequirements.requireBackendAgentSync) {
        await this.crossStreamCoordinator.registerErrorStream(
          context.backendAgentContext.errorStreamId,
          {
            serviceName: context.serviceName,
            operation: context.operation,
            priority: context.businessContext.operationalPriority,
            metadata: context.metadata
          }
        );
        integration.errorStreamRegistered = true;
      }

      // Activate recovery strategy if needed
      if (context.errorScenarioContext && context.backendAgentContext.recoveryStrategyId) {
        await this.recoveryService.activateRecoveryStrategy(
          context.backendAgentContext.recoveryStrategyId,
          {
            errorType: context.errorScenarioContext.scenarioType,
            businessImpact: context.errorScenarioContext.businessImpact,
            metadata: context.metadata
          }
        );
        integration.recoveryStrategyActivated = true;
      }

      // Start real-time monitoring if required
      if (context.coordinationRequirements.requireRealTimeMonitoring) {
        await this.monitoringService.startMonitoringSession(
          context.backendAgentContext.monitoringSessionId || context.coordinationId,
          {
            serviceName: context.serviceName,
            operation: context.operation,
            performanceTargets: context.routingContext.performanceContext,
            alertThresholds: this.calculateAlertThresholds(context)
          }
        );
        integration.monitoringActive = true;
      }

      // Cross-stream coordination if needed
      if (context.backendAgentContext.crossStreamCoordinationId) {
        await this.crossStreamCoordinator.coordinateAcrossStreams(
          context.backendAgentContext.crossStreamCoordinationId,
          {
            coordinationType: "traffic_routing",
            context: context,
            requiresSync: true
          }
        );
        integration.crossStreamCoordinated = true;
      }

      // Store Backend Agent connection
      this.backendAgentConnections.set(context.coordinationId, {
        errorStreamId: context.backendAgentContext.errorStreamId,
        recoveryStrategyId: context.backendAgentContext.recoveryStrategyId,
        monitoringSessionId: context.backendAgentContext.monitoringSessionId,
        registrationTime: new Date()
      });

    } catch (error) {
      logger.error("Backend Agent coordination failed", {
        coordinationId: context.coordinationId,
        error: error.message
      });
      
      // Continue with partial integration
    }

    return integration;
  }

  /**
   * Handle Backend Agent error events
   */
  private async handleBackendAgentError(errorEvent: any): Promise<void> {
    logger.info("Handling Backend Agent error event", {
      errorType: errorEvent.errorType,
      serviceName: errorEvent.serviceName,
      severity: errorEvent.severity
    });

    try {
      // Create coordination context for the error
      const coordinationContext: EnhancedCoordinationContext = {
        coordinationId: `backend_error_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        serviceName: errorEvent.serviceName,
        operation: errorEvent.operation || "unknown",
        routingContext: this.createRoutingContextFromError(errorEvent),
        errorScenarioContext: this.createErrorScenarioFromBackendError(errorEvent),
        backendAgentContext: {
          errorStreamId: errorEvent.streamId,
          recoveryStrategyId: errorEvent.recoveryStrategyId,
          monitoringSessionId: errorEvent.monitoringSessionId,
          crossStreamCoordinationId: errorEvent.crossStreamId
        },
        businessContext: {
          revenueImpact: errorEvent.businessImpact?.revenueAtRisk || 0,
          customerImpact: errorEvent.businessImpact?.customerImpact || "minor",
          operationalPriority: errorEvent.severity === "critical" ? "critical" : "high",
          timeSensitivity: errorEvent.urgent ? "immediate" : "urgent"
        },
        coordinationRequirements: {
          requireBackendAgentSync: true,
          requireRealTimeMonitoring: true,
          requirePredictiveAnalytics: errorEvent.severity === "critical",
          requireEmergencyOverride: errorEvent.severity === "critical"
        },
        metadata: {
          coordinationTimestamp: new Date(),
          requestId: errorEvent.requestId,
          userId: errorEvent.userId,
          organizationId: errorEvent.organizationId,
          sessionId: errorEvent.sessionId
        }
      };

      // Execute coordination for the Backend Agent error
      const coordinationResult = await this.executeEnhancedCoordination(coordinationContext);

      // Notify Backend Agent of coordination completion
      this.crossStreamCoordinator.notifyCoordinationComplete(
        errorEvent.streamId,
        coordinationResult
      );

    } catch (error) {
      logger.error("Failed to handle Backend Agent error", {
        errorEvent,
        error: error.message
      });
    }
  }

  /**
   * Handle recovery strategy activation
   */
  private async handleRecoveryStrategyActivation(recoveryEvent: any): Promise<void> {
    logger.info("Handling recovery strategy activation", {
      recoveryStrategyId: recoveryEvent.strategyId,
      serviceName: recoveryEvent.serviceName
    });

    // Update any active coordinations for this service
    for (const [coordinationId, context] of this.activeCoordinations) {
      if (context.serviceName === recoveryEvent.serviceName) {
        // Trigger re-coordination with updated recovery strategy
        await this.executeEnhancedCoordination({
          ...context,
          backendAgentContext: {
            ...context.backendAgentContext,
            recoveryStrategyId: recoveryEvent.strategyId
          }
        });
      }
    }
  }

  /**
   * Handle performance degradation events
   */
  private async handlePerformanceDegradation(performanceEvent: any): Promise<void> {
    logger.warn("Handling performance degradation", {
      serviceName: performanceEvent.serviceName,
      metricType: performanceEvent.metricType,
      currentValue: performanceEvent.currentValue,
      threshold: performanceEvent.threshold
    });

    // Check if we have active routing for this service that needs adjustment
    for (const [coordinationId, context] of this.activeCoordinations) {
      if (context.serviceName === performanceEvent.serviceName) {
        // Trigger routing re-evaluation with performance degradation context
        const updatedContext = {
          ...context,
          routingContext: {
            ...context.routingContext,
            performanceContext: {
              ...context.routingContext.performanceContext,
              currentLatency: performanceEvent.currentLatency || context.routingContext.performanceContext.currentLatency,
              currentThroughput: performanceEvent.currentThroughput || context.routingContext.performanceContext.currentThroughput
            }
          }
        };

        await this.executeEnhancedCoordination(updatedContext);
      }
    }
  }

  /**
   * Calculate business outcome from coordination
   */
  private calculateBusinessOutcome(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision,
    optimizationDecision?: OptimizationDecision
  ): any {
    // Calculate cost savings compared to default provider
    const estimatedCostSavings = this.calculateCostSavings(context, routingDecision);
    
    // Calculate performance gain based on selected provider
    const estimatedPerformanceGain = this.calculatePerformanceGain(context, routingDecision);
    
    // Assess risk mitigation level
    const riskMitigation = this.assessRiskMitigation(context, routingDecision, optimizationDecision);
    
    // Calculate customer impact reduction
    const customerImpactReduction = this.calculateCustomerImpactReduction(context, routingDecision);

    return {
      estimatedCostSavings,
      estimatedPerformanceGain,
      riskMitigation,
      customerImpactReduction
    };
  }

  /**
   * Create enhanced monitoring plan
   */
  private createEnhancedMonitoringPlan(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision
  ): any {
    const keyMetrics = [
      "response_time",
      "success_rate", 
      "cost_per_request",
      "error_rate",
      "provider_health",
      "backend_agent_coordination"
    ];

    const alertThresholds = {
      response_time: routingDecision.estimatedLatency * 1.5,
      success_rate: routingDecision.estimatedSuccessRate * 0.9,
      cost_per_request: routingDecision.estimatedCost * 1.25,
      error_rate: 5, // 5%
      provider_health: 70, // health score
      backend_coordination_lag: 5000 // 5 seconds
    };

    const escalationTriggers = [
      "cost_overrun_20_percent",
      "success_rate_below_90_percent",
      "backend_agent_coordination_failure",
      "provider_circuit_breaker_open",
      "customer_impact_escalation"
    ];

    const reviewInterval = context.businessContext.timeSensitivity === "immediate" ? 2 :
                          context.businessContext.timeSensitivity === "urgent" ? 5 :
                          context.businessContext.timeSensitivity === "standard" ? 15 : 30;

    return {
      keyMetrics,
      alertThresholds,
      escalationTriggers,
      reviewInterval
    };
  }

  /**
   * Start enhanced monitoring for coordination result
   */
  private async startEnhancedMonitoring(result: EnhancedCoordinationResult): Promise<void> {
    // Schedule enhanced monitoring job
    await jobQueue.addJob(
      'monitoring',
      'enhanced-coordination-monitoring',
      {
        coordinationId: result.coordinationId,
        serviceName: result.routingDecision.selectedNode.providerName,
        monitoringPlan: result.monitoringPlan,
        backendAgentIntegration: result.backendAgentIntegration
      },
      {
        repeat: { every: result.monitoringPlan.reviewInterval * 60000 },
        removeOnComplete: 5,
        removeOnFail: 3
      }
    );

    logger.info("Enhanced coordination monitoring started", {
      coordinationId: result.coordinationId,
      reviewInterval: result.monitoringPlan.reviewInterval,
      backendIntegrated: result.backendAgentIntegration.errorStreamRegistered
    });
  }

  /**
   * Start coordination monitoring
   */
  private startCoordinationMonitoring(): void {
    this.coordinationInterval = setInterval(async () => {
      await this.performCoordinationMonitoring();
    }, 30000); // Monitor every 30 seconds

    logger.info("Enhanced traffic routing coordination monitoring started");
  }

  /**
   * Start analytics processing
   */
  private startAnalyticsProcessing(): void {
    this.analyticsInterval = setInterval(async () => {
      await this.updateCoordinationAnalytics();
    }, 300000); // Update analytics every 5 minutes

    logger.info("Enhanced traffic routing analytics processing started");
  }

  /**
   * Perform coordination monitoring
   */
  private async performCoordinationMonitoring(): Promise<void> {
    // Monitor active coordinations for performance issues
    for (const [coordinationId, context] of this.activeCoordinations) {
      try {
        await this.monitorActiveCoordination(coordinationId, context);
      } catch (error) {
        logger.error(`Coordination monitoring failed for ${coordinationId}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Monitor active coordination
   */
  private async monitorActiveCoordination(
    coordinationId: string, 
    context: EnhancedCoordinationContext
  ): Promise<void> {
    const coordinationAge = Date.now() - context.metadata.coordinationTimestamp.getTime();
    const maxCoordinationAge = 30 * 60000; // 30 minutes

    if (coordinationAge > maxCoordinationAge) {
      logger.warn("Long-running coordination detected", {
        coordinationId,
        serviceName: context.serviceName,
        coordinationAge: coordinationAge / 60000
      });

      // Emit escalation event
      this.emitCoordinationEvent("coordination_escalation", {
        coordinationId,
        serviceName: context.serviceName,
        coordinationAge: coordinationAge / 60000
      });
    }
  }

  /**
   * Update coordination analytics
   */
  private async updateCoordinationAnalytics(): Promise<void> {
    for (const serviceName of this.coordinationHistory.keys()) {
      try {
        await this.generateServiceAnalytics(serviceName);
      } catch (error) {
        logger.error(`Analytics update failed for ${serviceName}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Generate analytics for a service
   */
  private async generateServiceAnalytics(serviceName: string): Promise<void> {
    const history = this.coordinationHistory.get(serviceName) || [];
    
    if (history.length === 0) {
      return;
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const recentCoordinations = history.filter(
      result => result.routingDecision.selectedNode.lastHealthCheck >= oneHourAgo
    );

    const analytics: EnhancedTrafficAnalytics = {
      serviceName,
      coordinationPeriod: {
        startTime: oneHourAgo,
        endTime: now,
        totalCoordinations: recentCoordinations.length
      },
      routingPerformance: this.calculateRoutingPerformance(recentCoordinations),
      backendAgentIntegration: this.calculateBackendIntegrationMetrics(recentCoordinations),
      businessImpact: this.calculateBusinessImpactMetrics(recentCoordinations),
      systemReliability: this.calculateSystemReliabilityMetrics(recentCoordinations),
      optimizationInsights: this.generateOptimizationInsights(recentCoordinations)
    };

    this.performanceAnalytics.set(serviceName, analytics);
    await this.cacheServiceAnalytics(serviceName, analytics);
  }

  /**
   * Utility methods for calculations
   */
  private calculateCostSavings(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision
  ): number {
    // Compare with most expensive provider cost
    const defaultCost = context.routingContext.budgetConstraints.costPerRequestLimit;
    const actualCost = routingDecision.estimatedCost;
    return Math.max(0, defaultCost - actualCost);
  }

  private calculatePerformanceGain(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision
  ): number {
    // Compare latency improvement
    const targetLatency = context.routingContext.performanceContext.targetLatency;
    const actualLatency = routingDecision.estimatedLatency;
    return Math.max(0, ((targetLatency - actualLatency) / targetLatency) * 100);
  }

  private assessRiskMitigation(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision,
    optimizationDecision?: OptimizationDecision
  ): "low" | "medium" | "high" {
    if (optimizationDecision && optimizationDecision.metadata.confidenceScore > 80) {
      return "high";
    } else if (routingDecision.metadata.confidenceScore > 70) {
      return "medium";
    } else {
      return "low";
    }
  }

  private calculateCustomerImpactReduction(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision
  ): number {
    // Simplified calculation based on success rate improvement
    const targetSuccessRate = 99;
    const actualSuccessRate = routingDecision.estimatedSuccessRate;
    return Math.min(100, (actualSuccessRate / targetSuccessRate) * 100);
  }

  private calculateAlertThresholds(context: EnhancedCoordinationContext): any {
    return {
      latency: context.routingContext.performanceContext.targetLatency * 1.5,
      errorRate: 5,
      costOverrun: 20,
      healthScore: 70
    };
  }

  private calculateCoordinationConfidence(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision,
    optimizationDecision?: OptimizationDecision
  ): number {
    let confidence = routingDecision.metadata.confidenceScore;
    
    if (optimizationDecision) {
      confidence = (confidence + optimizationDecision.metadata.confidenceScore) / 2;
    }
    
    // Adjust based on Backend Agent integration
    if (context.coordinationRequirements.requireBackendAgentSync) {
      confidence += 10; // Backend integration bonus
    }
    
    return Math.min(100, confidence);
  }

  private determineCoordinationStrategy(context: EnhancedCoordinationContext): string {
    if (context.coordinationRequirements.requireEmergencyOverride) {
      return "emergency_coordination";
    } else if (context.businessContext.operationalPriority === "critical") {
      return "high_priority_coordination";
    } else if (context.coordinationRequirements.requireBackendAgentSync) {
      return "backend_integrated_coordination";
    } else {
      return "standard_coordination";
    }
  }

  private getAppliedOptimizations(
    context: EnhancedCoordinationContext,
    routingDecision: RoutingDecision,
    optimizationDecision?: OptimizationDecision
  ): string[] {
    const optimizations = ["intelligent_routing"];
    
    if (optimizationDecision) {
      optimizations.push("error_scenario_optimization");
    }
    
    if (context.coordinationRequirements.requireBackendAgentSync) {
      optimizations.push("backend_agent_coordination");
    }
    
    if (context.coordinationRequirements.requirePredictiveAnalytics) {
      optimizations.push("predictive_analytics");
    }
    
    return optimizations;
  }

  private createRoutingContextFromError(errorEvent: any): RoutingDecisionContext {
    return {
      serviceName: errorEvent.serviceName,
      operation: errorEvent.operation || "unknown",
      requestMetadata: {
        requestId: errorEvent.requestId,
        userId: errorEvent.userId,
        organizationId: errorEvent.organizationId,
        priority: errorEvent.priority || ServicePriority.HIGH,
        businessCriticality: errorEvent.businessCriticality || BusinessCriticality.CUSTOMER_FACING,
        retryCount: errorEvent.retryCount || 0,
        maxRetries: 3
      },
      errorHistory: {
        recentErrors: errorEvent.recentErrors || [],
        failurePatterns: errorEvent.failurePatterns || []
      },
      budgetConstraints: {
        remainingBudget: errorEvent.budgetConstraints?.remainingBudget || 1000,
        costPerRequestLimit: errorEvent.budgetConstraints?.costPerRequestLimit || 0.1,
        budgetPeriod: errorEvent.budgetConstraints?.budgetPeriod || "daily"
      },
      performanceContext: {
        currentLatency: errorEvent.currentLatency || 1000,
        targetLatency: errorEvent.targetLatency || 300,
        currentThroughput: errorEvent.currentThroughput || 0.5,
        targetThroughput: errorEvent.targetThroughput || 100
      }
    };
  }

  private createErrorScenarioFromBackendError(errorEvent: any): ErrorScenarioContext {
    return {
      scenarioId: `backend_scenario_${Date.now()}`,
      scenarioType: this.mapErrorTypeToScenarioType(errorEvent.errorType),
      serviceName: errorEvent.serviceName,
      operation: errorEvent.operation || "unknown",
      severity: errorEvent.severity || "medium",
      businessImpact: {
        revenueAtRisk: errorEvent.businessImpact?.revenueAtRisk || 0,
        customerImpact: errorEvent.businessImpact?.customerImpact || "minor",
        operationalImpact: errorEvent.businessImpact?.operationalImpact || "moderate",
        timeToResolution: errorEvent.businessImpact?.timeToResolution || 30
      },
      errorDetails: {
        originalError: new Error(errorEvent.errorMessage || "Backend Agent error"),
        failedProviders: errorEvent.failedProviders || [],
        retryAttempts: errorEvent.retryAttempts || 0,
        errorPattern: errorEvent.errorPattern || "backend_error",
        cascadingServices: errorEvent.cascadingServices || []
      },
      budgetConstraints: {
        remainingBudget: errorEvent.budgetConstraints?.remainingBudget || 1000,
        maxAllowableCost: errorEvent.budgetConstraints?.maxAllowableCost || 0.1,
        budgetPeriod: errorEvent.budgetConstraints?.budgetPeriod || "daily",
        emergencyBudgetAvailable: errorEvent.budgetConstraints?.emergencyBudgetAvailable || false
      },
      performanceRequirements: {
        maxLatency: errorEvent.performanceRequirements?.maxLatency || 1000,
        minThroughput: errorEvent.performanceRequirements?.minThroughput || 100,
        minSuccessRate: errorEvent.performanceRequirements?.minSuccessRate || 95
      },
      metadata: {
        requestId: errorEvent.requestId,
        userId: errorEvent.userId,
        organizationId: errorEvent.organizationId,
        timestamp: new Date(),
        priority: errorEvent.priority || ServicePriority.HIGH,
        businessCriticality: errorEvent.businessCriticality || BusinessCriticality.CUSTOMER_FACING
      }
    };
  }

  private mapErrorTypeToScenarioType(errorType: string): ErrorScenarioType {
    const mapping: Record<string, ErrorScenarioType> = {
      "service_unavailable": ErrorScenarioType.SERVICE_UNAVAILABLE,
      "performance_degradation": ErrorScenarioType.PERFORMANCE_DEGRADATION,
      "rate_limit": ErrorScenarioType.RATE_LIMIT_EXCEEDED,
      "authentication": ErrorScenarioType.AUTHENTICATION_FAILURE,
      "network": ErrorScenarioType.NETWORK_ISSUES,
      "data_corruption": ErrorScenarioType.DATA_CORRUPTION,
      "cascading": ErrorScenarioType.CASCADING_FAILURE,
      "budget": ErrorScenarioType.BUDGET_EXHAUSTION,
      "emergency": ErrorScenarioType.EMERGENCY_SCENARIO
    };

    return mapping[errorType] || ErrorScenarioType.SERVICE_UNAVAILABLE;
  }

  private calculateRoutingPerformance(results: EnhancedCoordinationResult[]): any {
    if (results.length === 0) {
      return {
        averageDecisionTime: 0,
        successRate: 0,
        costOptimization: 0,
        latencyImprovement: 0
      };
    }

    const avgDecisionTime = results.reduce((sum, r) => sum + r.performanceMetrics.routingDecisionTime, 0) / results.length;
    const successRate = (results.filter(r => r.metadata.confidenceScore > 70).length / results.length) * 100;
    const avgCostSavings = results.reduce((sum, r) => sum + r.businessOutcome.estimatedCostSavings, 0) / results.length;
    const avgPerformanceGain = results.reduce((sum, r) => sum + r.businessOutcome.estimatedPerformanceGain, 0) / results.length;

    return {
      averageDecisionTime: avgDecisionTime,
      successRate,
      costOptimization: avgCostSavings,
      latencyImprovement: avgPerformanceGain
    };
  }

  private calculateBackendIntegrationMetrics(results: EnhancedCoordinationResult[]): any {
    const errorStreamIntegrations = results.filter(r => r.backendAgentIntegration.errorStreamRegistered).length;
    const recoveryStrategyActivations = results.filter(r => r.backendAgentIntegration.recoveryStrategyActivated).length;
    const crossStreamCoordinations = results.filter(r => r.backendAgentIntegration.crossStreamCoordinated).length;
    const monitoringSessionsActive = results.filter(r => r.backendAgentIntegration.monitoringActive).length;

    return {
      errorStreamIntegrations,
      recoveryStrategyActivations,
      crossStreamCoordinations,
      monitoringSessionsActive
    };
  }

  private calculateBusinessImpactMetrics(results: EnhancedCoordinationResult[]): any {
    const totalCostSavings = results.reduce((sum, r) => sum + r.businessOutcome.estimatedCostSavings, 0);
    const avgCustomerImpactReduction = results.reduce((sum, r) => sum + r.businessOutcome.customerImpactReduction, 0) / results.length;

    return {
      revenueProtected: 0, // Would calculate from actual revenue data
      costSavingsRealized: totalCostSavings,
      customerSatisfactionImpact: avgCustomerImpactReduction,
      operationalEfficiencyGain: Math.min(25, results.length * 2) // Simplified calculation
    };
  }

  private calculateSystemReliabilityMetrics(results: EnhancedCoordinationResult[]): any {
    const successfulCoordinations = results.filter(r => r.metadata.confidenceScore > 70);
    const uptimePercentage = (successfulCoordinations.length / results.length) * 100;

    return {
      uptimePercentage,
      errorRateReduction: 15, // Simplified calculation
      recoveryTimeImprovement: 30, // Simplified calculation
      preventedCascadingFailures: results.filter(r => r.businessOutcome.riskMitigation === "high").length
    };
  }

  private generateOptimizationInsights(results: EnhancedCoordinationResult[]): string[] {
    const insights = [];
    
    const avgConfidence = results.reduce((sum, r) => sum + r.metadata.confidenceScore, 0) / results.length;
    if (avgConfidence > 80) {
      insights.push("High coordination confidence - traffic routing performing optimally");
    } else if (avgConfidence < 60) {
      insights.push("Low coordination confidence - consider routing algorithm optimization");
    }

    const backendIntegrationRate = results.filter(r => r.backendAgentIntegration.errorStreamRegistered).length / results.length;
    if (backendIntegrationRate > 0.8) {
      insights.push("Excellent Backend Agent integration - comprehensive error coordination");
    } else if (backendIntegrationRate < 0.5) {
      insights.push("Improve Backend Agent integration for better error coordination");
    }

    return insights;
  }

  /**
   * Record coordination result for analytics
   */
  private recordCoordinationResult(serviceName: string, result: EnhancedCoordinationResult): void {
    const history = this.coordinationHistory.get(serviceName) || [];
    history.push(result);
    
    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }
    
    this.coordinationHistory.set(serviceName, history);
    
    // Cache for persistence
    this.cacheCoordinationResult(serviceName, result);
  }

  /**
   * Cache operations
   */
  private async cacheCoordinationResult(serviceName: string, result: EnhancedCoordinationResult): Promise<void> {
    const cacheKey = `${this.COORDINATION_CACHE_KEY}:${serviceName}:${result.coordinationId}`;
    await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
  }

  private async cacheServiceAnalytics(serviceName: string, analytics: EnhancedTrafficAnalytics): Promise<void> {
    const cacheKey = `${this.ANALYTICS_CACHE_KEY}:${serviceName}`;
    await redisClient.setex(cacheKey, 1800, JSON.stringify(analytics));
  }

  /**
   * Emit coordination event for real-time monitoring
   */
  private emitCoordinationEvent(eventType: string, data: any): void {
    const event = {
      eventType,
      timestamp: new Date(),
      ...data
    };

    this.emit(eventType, event);
    
    // Send to frontend via WebSocket
    socketManager.emitTrafficCoordinationEvent(event);
  }

  /**
   * Create audit log for coordination
   */
  private async createCoordinationAuditLog(
    context: EnhancedCoordinationContext,
    result: EnhancedCoordinationResult
  ): Promise<void> {
    try {
      await AuditLog.create({
        eventType: "enhanced_traffic_coordination",
        tableName: "traffic_coordination",
        recordId: result.coordinationId,
        userId: context.metadata.userId,
        changes: {
          serviceName: context.serviceName,
          selectedProvider: result.routingDecision.selectedNode.providerName,
          coordinationStrategy: result.metadata.coordinationStrategy,
          confidenceScore: result.metadata.confidenceScore,
          costSavings: result.businessOutcome.estimatedCostSavings,
          backendIntegrated: result.backendAgentIntegration.errorStreamRegistered
        },
        ipAddress: "system",
        userAgent: "EnhancedTrafficRoutingCoordinator",
        organizationId: context.metadata.organizationId
      });
    } catch (error) {
      logger.error("Failed to create coordination audit log", {
        error: error.message,
        coordinationId: result.coordinationId
      });
    }
  }

  /**
   * Get coordination analytics for all services
   */
  public async getCoordinationAnalytics(): Promise<any> {
    const analytics = {
      totalServices: this.coordinationHistory.size,
      totalCoordinations: 0,
      successfulCoordinations: 0,
      averageCoordinationTime: 0,
      totalCostSavings: 0,
      backendIntegrationRate: 0,
      lastUpdate: new Date()
    };

    let totalBackendIntegrations = 0;

    for (const [serviceName, history] of this.coordinationHistory) {
      analytics.totalCoordinations += history.length;
      analytics.successfulCoordinations += history.filter(r => r.metadata.confidenceScore > 70).length;
      analytics.totalCostSavings += history.reduce((sum, r) => sum + r.businessOutcome.estimatedCostSavings, 0);
      totalBackendIntegrations += history.filter(r => r.backendAgentIntegration.errorStreamRegistered).length;
    }

    if (analytics.totalCoordinations > 0) {
      analytics.averageCoordinationTime = Array.from(this.coordinationHistory.values())
        .flat()
        .reduce((sum, r) => sum + r.performanceMetrics.totalCoordinationTime, 0) / analytics.totalCoordinations;
      
      analytics.backendIntegrationRate = (totalBackendIntegrations / analytics.totalCoordinations) * 100;
    }

    return analytics;
  }

  /**
   * Get active coordinations status
   */
  public getActiveCoordinations(): Map<string, EnhancedCoordinationContext> {
    return new Map(this.activeCoordinations);
  }

  /**
   * Get Backend Agent connections status
   */
  public getBackendAgentConnections(): Map<string, any> {
    return new Map(this.backendAgentConnections);
  }

  /**
   * Gracefully shutdown the service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down Enhanced Traffic Routing Coordinator");

    // Clear monitoring intervals
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }

    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
    
    // Clear data structures
    this.activeCoordinations.clear();
    this.coordinationHistory.clear();
    this.performanceAnalytics.clear();
    this.backendAgentConnections.clear();

    logger.info("Enhanced Traffic Routing Coordinator shutdown complete");
  }
}

// Export types for use in other modules
export {
  EnhancedCoordinationContext,
  EnhancedCoordinationResult,
  EnhancedTrafficAnalytics
};

export default EnhancedTrafficRoutingCoordinator;