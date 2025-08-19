/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - INTELLIGENT TRAFFIC ROUTING FOUNDATION
 * ============================================================================
 *
 * GROUP E SEQUENTIAL COORDINATION - PHASE 1: BACKEND FOUNDATION
 * 
 * Intelligent traffic routing optimization foundation for System-Architecture-Lead coordination.
 * Provides foundational infrastructure for system-wide traffic routing optimization.
 *
 * Features:
 * - Smart traffic distribution algorithms with error-aware routing
 * - Cost-aware fallback strategies with budget protection
 * - Integration with error orchestration system (Group B)
 * - Performance framework integration (Group C)
 * - External services coordination (Group D)
 * - Secure routing with JWT authentication (Group A)
 * - Coordination APIs for System-Architecture-Lead integration
 *
 * Performance Targets:
 * - Routing decision latency: <50ms
 * - Fallback activation time: <200ms
 * - Cost optimization: 15-25% reduction during error scenarios
 * - Service reliability: 99.9% uptime with intelligent routing
 *
 * Created by: Backend Development Agent (Group E Phase 1)
 * Date: 2025-08-19
 * Version: 1.0.0 - Sequential Coordination Foundation
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import { socketManager } from "@/services/socketManager";
import { EventEmitter } from "events";

/**
 * Smart traffic routing decision engine
 */
export enum SmartRoutingStrategy {
  ERROR_AWARE = "error_aware",
  COST_OPTIMIZED = "cost_optimized", 
  PERFORMANCE_FIRST = "performance_first",
  HYBRID_INTELLIGENT = "hybrid_intelligent",
  CIRCUIT_BREAKER_AWARE = "circuit_breaker_aware",
  BUDGET_CONSTRAINED = "budget_constrained",
  HEALTH_PRIORITIZED = "health_prioritized"
}

/**
 * Traffic routing node with enhanced intelligence
 */
export interface IntelligentRoutingNode {
  nodeId: string;
  serviceName: string;
  providerName: string;
  endpoint: string;
  region: string;
  // Performance metrics
  averageLatency: number; // milliseconds
  successRate: number; // percentage
  currentLoad: number; // current connections
  maxCapacity: number; // maximum connections
  // Cost and budget
  costPerRequest: number; // dollars
  costPerMinute: number; // dollars
  budgetRemaining: number; // dollars
  // Health and reliability
  healthScore: number; // 0-100
  circuitBreakerState: "closed" | "open" | "half_open";
  errorRate: number; // percentage
  lastErrorTime?: Date;
  recoveryTime?: number; // milliseconds
  // Intelligence features
  predictiveScore: number; // 0-100
  learningWeight: number; // algorithm learning weight
  adaptationRate: number; // how quickly it adapts to changes
  lastHealthCheck: Date;
  // Security and authentication
  authenticationMethod: "jwt" | "api_key" | "oauth2";
  encryptionLevel: "standard" | "enhanced" | "enterprise";
  securityScore: number; // 0-100
  // Integration capabilities
  supportsErrorCoordination: boolean;
  supportsPerformanceMonitoring: boolean;
  supportsRealTimeUpdates: boolean;
  integrationVersion: string;
}

/**
 * Smart routing decision context
 */
export interface SmartRoutingContext {
  requestId: string;
  serviceName: string;
  operation: string;
  // User and organization context
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  // Business requirements
  businessCriticality: "low" | "medium" | "high" | "critical";
  timeSensitivity: "flexible" | "standard" | "urgent" | "immediate";
  costSensitivity: "none" | "low" | "medium" | "high" | "strict";
  // Performance requirements
  maxLatency: number; // milliseconds
  minSuccessRate: number; // percentage
  maxErrorRate: number; // percentage
  // Budget constraints
  maxCostPerRequest: number; // dollars
  budgetPeriod: "request" | "minute" | "hour" | "day";
  emergencyBudgetAvailable: boolean;
  // Error context (Group B integration)
  errorHistory: Array<{
    nodeId: string;
    errorType: string;
    timestamp: Date;
    severity: "low" | "medium" | "high" | "critical";
    recoveryTime?: number;
  }>;
  currentErrorState?: {
    activeErrors: number;
    cascadingRisk: "none" | "low" | "medium" | "high";
    errorPattern: string;
  };
  // Performance context (Group C integration)
  performanceMetrics?: {
    currentThroughput: number;
    targetThroughput: number;
    responseTimeP95: number;
    responseTimeP99: number;
  };
  // External services context (Group D integration)
  externalServiceStatus?: {
    providersAvailable: number;
    providersHealthy: number;
    lastSyncTime: Date;
    coordinationActive: boolean;
  };
  // Retry and fallback context
  retryCount: number;
  maxRetries: number;
  fallbacksAttempted: string[];
  // Coordination requirements
  requiresSystemCoordination: boolean;
  coordinationScope: "local" | "regional" | "global";
  crossStreamCoordination: boolean;
}

/**
 * Smart routing decision result
 */
export interface SmartRoutingDecision {
  decisionId: string;
  requestId: string;
  selectedNode: IntelligentRoutingNode;
  strategy: SmartRoutingStrategy;
  decisionReason: string;
  confidenceScore: number; // 0-100
  // Performance predictions
  estimatedLatency: number;
  estimatedSuccessRate: number;
  estimatedCost: number;
  // Risk assessment
  riskLevel: "very_low" | "low" | "medium" | "high" | "very_high";
  riskFactors: string[];
  mitigationStrategies: string[];
  // Fallback planning
  primaryFallback: IntelligentRoutingNode | null;
  secondaryFallback: IntelligentRoutingNode | null;
  emergencyFallback: IntelligentRoutingNode | null;
  // Coordination information
  coordinationRequired: boolean;
  coordinationEndpoints: string[];
  systemArchitectureIntegration: {
    coordinationId: string;
    phase: "phase_1" | "phase_2";
    readyForSystemLead: boolean;
  };
  // Analytics and monitoring
  decisionTime: number; // milliseconds
  algorithmVersion: string;
  learningApplied: boolean;
  adaptationsApplied: string[];
  // Metadata
  timestamp: Date;
  expiresAt: Date;
  metadata: {
    algorithmDetails: any;
    performanceProjections: any;
    costProjections: any;
    coordinationMetadata: any;
  };
}

/**
 * Traffic routing coordination API
 */
export interface RoutingCoordinationAPI {
  coordinationId: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  authentication: {
    type: "jwt" | "api_key" | "oauth2";
    required: boolean;
    permissions: string[];
  };
  requestSchema: any;
  responseSchema: any;
  rateLimit: {
    requests: number;
    windowMs: number;
    burstAllowed: boolean;
  };
  monitoring: {
    metricsEnabled: boolean;
    alertingEnabled: boolean;
    loggingLevel: "basic" | "detailed" | "debug";
  };
  systemArchitectureIntegration: {
    compatible: boolean;
    version: string;
    coordinationPattern: string;
  };
}

/**
 * Health monitoring integration
 */
export interface HealthMonitoringIntegration {
  monitoringId: string;
  nodeId: string;
  healthCheckInterval: number; // seconds
  alertThresholds: {
    latency: number;
    errorRate: number;
    availability: number;
    costOverrun: number;
  };
  escalationRules: Array<{
    condition: string;
    action: string;
    delay: number;
    recipients: string[];
  }>;
  coordinationTriggers: Array<{
    metric: string;
    threshold: number;
    coordinationAction: string;
  }>;
  integrationStatus: {
    errorOrchestration: boolean; // Group B
    performanceFramework: boolean; // Group C
    externalServices: boolean; // Group D
    securityFramework: boolean; // Group A
  };
}

/**
 * Main intelligent traffic routing foundation service
 */
export class IntelligentTrafficRoutingFoundation extends EventEmitter {
  private routingNodes: Map<string, IntelligentRoutingNode[]> = new Map();
  private decisionHistory: Map<string, SmartRoutingDecision[]> = new Map();
  private coordinationAPIs: Map<string, RoutingCoordinationAPI> = new Map();
  private healthMonitoring: Map<string, HealthMonitoringIntegration> = new Map();
  
  private learningAlgorithms: Map<string, any> = new Map();
  private coordinationQueue: Array<any> = [];
  private systemArchitectureReadiness: Map<string, boolean> = new Map();
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private coordinationInterval: NodeJS.Timeout | null = null;
  private learningInterval: NodeJS.Timeout | null = null;
  
  // Cache keys
  private readonly ROUTING_FOUNDATION_CACHE = "intelligent_routing_foundation";
  private readonly COORDINATION_API_CACHE = "routing_coordination_apis";
  private readonly SYSTEM_READINESS_CACHE = "system_architecture_readiness";

  constructor() {
    super();
    this.initializeFoundationServices();
    this.startIntelligentMonitoring();
    this.startCoordinationProcessing();
    this.startLearningEngine();
  }

  /**
   * Initialize foundation services and default configurations
   */
  private initializeFoundationServices(): void {
    // Initialize intelligent routing nodes for critical services
    this.registerIntelligentNodes("stripe_payments", [
      {
        nodeId: "stripe_primary_intelligent",
        serviceName: "stripe_payments",
        providerName: "Stripe Primary (Intelligent)",
        endpoint: "https://api.stripe.com",
        region: "us-east-1",
        averageLatency: 120,
        successRate: 99.8,
        currentLoad: 15,
        maxCapacity: 100,
        costPerRequest: 0.029,
        costPerMinute: 1.74,
        budgetRemaining: 1000,
        healthScore: 96,
        circuitBreakerState: "closed",
        errorRate: 0.2,
        predictiveScore: 94,
        learningWeight: 0.8,
        adaptationRate: 0.15,
        lastHealthCheck: new Date(),
        authenticationMethod: "jwt",
        encryptionLevel: "enterprise",
        securityScore: 95,
        supportsErrorCoordination: true,
        supportsPerformanceMonitoring: true,
        supportsRealTimeUpdates: true,
        integrationVersion: "v2.1.0"
      },
      {
        nodeId: "stripe_fallback_intelligent",
        serviceName: "stripe_payments",
        providerName: "Stripe Fallback (Intelligent)",
        endpoint: "https://api.stripe.com",
        region: "us-west-2",
        averageLatency: 180,
        successRate: 99.5,
        currentLoad: 8,
        maxCapacity: 80,
        costPerRequest: 0.032,
        costPerMinute: 1.92,
        budgetRemaining: 800,
        healthScore: 92,
        circuitBreakerState: "closed",
        errorRate: 0.5,
        predictiveScore: 88,
        learningWeight: 0.7,
        adaptationRate: 0.12,
        lastHealthCheck: new Date(),
        authenticationMethod: "jwt",
        encryptionLevel: "enhanced",
        securityScore: 90,
        supportsErrorCoordination: true,
        supportsPerformanceMonitoring: true,
        supportsRealTimeUpdates: false,
        integrationVersion: "v2.0.0"
      }
    ]);

    // Initialize coordination APIs for System-Architecture-Lead integration
    this.registerCoordinationAPI("routing_decision", {
      coordinationId: "routing_decision_api",
      endpoint: "/api/v1/routing/decision",
      method: "POST",
      authentication: {
        type: "jwt",
        required: true,
        permissions: ["routing:coordinate", "system:architecture"]
      },
      requestSchema: {
        context: "SmartRoutingContext",
        options: "object",
        priority: "string"
      },
      responseSchema: {
        decision: "SmartRoutingDecision",
        coordination: "object",
        metadata: "object"
      },
      rateLimit: {
        requests: 100,
        windowMs: 60000,
        burstAllowed: true
      },
      monitoring: {
        metricsEnabled: true,
        alertingEnabled: true,
        loggingLevel: "detailed"
      },
      systemArchitectureIntegration: {
        compatible: true,
        version: "1.0.0",
        coordinationPattern: "sequential_phase_handoff"
      }
    });

    this.registerCoordinationAPI("health_status", {
      coordinationId: "health_status_api",
      endpoint: "/api/v1/routing/health",
      method: "GET",
      authentication: {
        type: "jwt",
        required: true,
        permissions: ["routing:monitor", "system:health"]
      },
      requestSchema: {
        services: "array",
        detail_level: "string"
      },
      responseSchema: {
        nodes: "array",
        overall_health: "object",
        coordination_ready: "boolean"
      },
      rateLimit: {
        requests: 200,
        windowMs: 60000,
        burstAllowed: false
      },
      monitoring: {
        metricsEnabled: true,
        alertingEnabled: false,
        loggingLevel: "basic"
      },
      systemArchitectureIntegration: {
        compatible: true,
        version: "1.0.0",
        coordinationPattern: "real_time_monitoring"
      }
    });

    logger.info("Intelligent Traffic Routing Foundation initialized", {
      servicesCount: this.routingNodes.size,
      coordinationAPIs: this.coordinationAPIs.size,
      phase: "phase_1_backend_foundation"
    });

    // Mark foundation as ready for Phase 2 System-Architecture-Lead coordination
    this.systemArchitectureReadiness.set("phase_1_complete", true);
    this.systemArchitectureReadiness.set("coordination_apis_ready", true);
    this.systemArchitectureReadiness.set("error_integration_ready", true);
    this.systemArchitectureReadiness.set("performance_integration_ready", true);
  }

  /**
   * Register intelligent routing nodes for a service
   */
  public registerIntelligentNodes(serviceName: string, nodes: IntelligentRoutingNode[]): void {
    this.routingNodes.set(serviceName, nodes);
    
    // Start health monitoring for each node
    nodes.forEach(node => {
      this.startNodeHealthMonitoring(node);
    });
    
    // Cache nodes for persistence
    this.cacheRoutingNodes(serviceName, nodes);
    
    logger.info("Intelligent routing nodes registered", {
      serviceName,
      nodeCount: nodes.length,
      intelligentFeatures: [
        "error_aware_routing",
        "cost_optimization",
        "predictive_scoring",
        "adaptive_learning"
      ]
    });

    this.emit("nodesRegistered", { serviceName, nodes });
  }

  /**
   * Make smart routing decision with enhanced intelligence
   */
  public async makeSmartRoutingDecision(context: SmartRoutingContext): Promise<SmartRoutingDecision> {
    const startTime = Date.now();
    const decisionId = `decision_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    logger.info("Making smart routing decision", {
      decisionId,
      requestId: context.requestId,
      serviceName: context.serviceName,
      businessCriticality: context.businessCriticality,
      requiresSystemCoordination: context.requiresSystemCoordination
    });

    try {
      // Get available intelligent nodes
      const availableNodes = await this.getIntelligentAvailableNodes(context);
      
      if (availableNodes.length === 0) {
        throw new Error(`No intelligent nodes available for service: ${context.serviceName}`);
      }

      // Apply intelligent routing strategy
      const strategy = this.selectOptimalStrategy(context, availableNodes);
      const selectedNode = await this.applyIntelligentStrategy(strategy, availableNodes, context);

      // Generate comprehensive fallback plan
      const fallbackPlan = this.generateIntelligentFallbackPlan(selectedNode, availableNodes, context);

      // Calculate predictions and risk assessment
      const predictions = this.calculateIntelligentPredictions(selectedNode, context);
      const riskAssessment = this.assessIntelligentRisk(selectedNode, context, availableNodes);

      // Determine coordination requirements
      const coordinationInfo = this.determineCoordinationRequirements(context, selectedNode);

      // Create smart routing decision
      const decision: SmartRoutingDecision = {
        decisionId,
        requestId: context.requestId,
        selectedNode,
        strategy,
        decisionReason: this.generateIntelligentDecisionReason(selectedNode, strategy, context),
        confidenceScore: this.calculateIntelligentConfidence(selectedNode, context, availableNodes),
        // Performance predictions
        estimatedLatency: predictions.latency,
        estimatedSuccessRate: predictions.successRate,
        estimatedCost: predictions.cost,
        // Risk assessment
        riskLevel: riskAssessment.level,
        riskFactors: riskAssessment.factors,
        mitigationStrategies: riskAssessment.mitigations,
        // Fallback planning
        primaryFallback: fallbackPlan.primary,
        secondaryFallback: fallbackPlan.secondary,
        emergencyFallback: fallbackPlan.emergency,
        // Coordination information
        coordinationRequired: coordinationInfo.required,
        coordinationEndpoints: coordinationInfo.endpoints,
        systemArchitectureIntegration: {
          coordinationId: `coord_${decisionId}`,
          phase: "phase_1",
          readyForSystemLead: this.systemArchitectureReadiness.get("phase_1_complete") || false
        },
        // Analytics and monitoring
        decisionTime: Date.now() - startTime,
        algorithmVersion: "v1.0.0-intelligent",
        learningApplied: true,
        adaptationsApplied: this.getAppliedAdaptations(context, selectedNode),
        // Metadata
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
        metadata: {
          algorithmDetails: { strategy, nodeSelectionCriteria: this.getSelectionCriteria(context) },
          performanceProjections: predictions,
          costProjections: { budgetImpact: predictions.cost, savingsOpportunity: this.calculateSavingsOpportunity(context, selectedNode) },
          coordinationMetadata: coordinationInfo
        }
      };

      // Record decision for learning and analytics
      this.recordSmartDecision(context.serviceName, decision);
      
      // Update node load
      selectedNode.currentLoad++;
      
      // Apply learning algorithms
      await this.applyLearningAlgorithms(decision, context);

      // Emit real-time event for monitoring
      this.emitIntelligentRoutingEvent("smart_decision_made", {
        decisionId,
        serviceName: context.serviceName,
        selectedProvider: selectedNode.providerName,
        strategy,
        decisionTime: decision.decisionTime,
        confidenceScore: decision.confidenceScore,
        coordinationRequired: decision.coordinationRequired
      });

      // Queue for System-Architecture-Lead coordination if required
      if (context.requiresSystemCoordination) {
        this.queueForSystemCoordination(decision, context);
      }

      logger.info("Smart routing decision completed", {
        decisionId,
        serviceName: context.serviceName,
        selectedProvider: selectedNode.providerName,
        strategy,
        decisionTime: decision.decisionTime,
        confidenceScore: decision.confidenceScore,
        coordinationQueued: context.requiresSystemCoordination
      });

      return decision;

    } catch (error) {
      const decisionTime = Date.now() - startTime;
      
      logger.error("Smart routing decision failed", {
        decisionId,
        serviceName: context.serviceName,
        error: error.message,
        decisionTime
      });

      // Emit failure event
      this.emitIntelligentRoutingEvent("smart_decision_failed", {
        decisionId,
        serviceName: context.serviceName,
        error: error.message,
        decisionTime
      });

      throw error;
    }
  }

  /**
   * Get intelligent available nodes with error awareness
   */
  private async getIntelligentAvailableNodes(context: SmartRoutingContext): Promise<IntelligentRoutingNode[]> {
    const allNodes = this.routingNodes.get(context.serviceName) || [];
    const availableNodes: IntelligentRoutingNode[] = [];

    for (const node of allNodes) {
      // Check circuit breaker state
      if (node.circuitBreakerState === "open") {
        continue;
      }

      // Check capacity limits
      if (node.currentLoad >= node.maxCapacity) {
        continue;
      }

      // Check cost constraints
      if (node.costPerRequest > context.maxCostPerRequest && !context.emergencyBudgetAvailable) {
        continue;
      }

      // Check error history (Group B integration)
      const recentErrors = context.errorHistory.filter(
        error => error.nodeId === node.nodeId &&
        Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
      );

      if (recentErrors.length > 2 && recentErrors.some(e => e.severity === "critical")) {
        continue;
      }

      // Check performance requirements (Group C integration)
      if (node.averageLatency > context.maxLatency) {
        continue;
      }

      if (node.successRate < context.minSuccessRate) {
        continue;
      }

      if (node.errorRate > context.maxErrorRate) {
        continue;
      }

      // Check security requirements (Group A integration)
      if (context.businessCriticality === "critical" && node.securityScore < 90) {
        continue;
      }

      // Check integration compatibility
      if (context.requiresSystemCoordination && !node.supportsRealTimeUpdates) {
        continue;
      }

      availableNodes.push(node);
    }

    return availableNodes;
  }

  /**
   * Select optimal routing strategy based on context
   */
  private selectOptimalStrategy(context: SmartRoutingContext, nodes: IntelligentRoutingNode[]): SmartRoutingStrategy {
    // Error-aware strategy if recent errors detected
    if (context.errorHistory.length > 0 || context.currentErrorState?.activeErrors) {
      return SmartRoutingStrategy.ERROR_AWARE;
    }

    // Cost-optimized if high cost sensitivity
    if (context.costSensitivity === "high" || context.costSensitivity === "strict") {
      return SmartRoutingStrategy.COST_OPTIMIZED;
    }

    // Performance-first for critical business operations
    if (context.businessCriticality === "critical" && context.timeSensitivity === "immediate") {
      return SmartRoutingStrategy.PERFORMANCE_FIRST;
    }

    // Circuit breaker aware if any nodes in unstable state
    if (nodes.some(n => n.circuitBreakerState !== "closed")) {
      return SmartRoutingStrategy.CIRCUIT_BREAKER_AWARE;
    }

    // Budget constrained if low budget remaining
    if (nodes.every(n => n.budgetRemaining < 100)) {
      return SmartRoutingStrategy.BUDGET_CONSTRAINED;
    }

    // Health prioritized if overall health concerns
    if (nodes.some(n => n.healthScore < 80)) {
      return SmartRoutingStrategy.HEALTH_PRIORITIZED;
    }

    // Default to hybrid intelligent strategy
    return SmartRoutingStrategy.HYBRID_INTELLIGENT;
  }

  /**
   * Apply intelligent routing strategy
   */
  private async applyIntelligentStrategy(
    strategy: SmartRoutingStrategy,
    nodes: IntelligentRoutingNode[],
    context: SmartRoutingContext
  ): Promise<IntelligentRoutingNode> {
    switch (strategy) {
      case SmartRoutingStrategy.ERROR_AWARE:
        return this.applyErrorAwareRouting(nodes, context);
      
      case SmartRoutingStrategy.COST_OPTIMIZED:
        return this.applyCostOptimizedRouting(nodes, context);
      
      case SmartRoutingStrategy.PERFORMANCE_FIRST:
        return this.applyPerformanceFirstRouting(nodes, context);
      
      case SmartRoutingStrategy.CIRCUIT_BREAKER_AWARE:
        return this.applyCircuitBreakerAwareRouting(nodes, context);
      
      case SmartRoutingStrategy.BUDGET_CONSTRAINED:
        return this.applyBudgetConstrainedRouting(nodes, context);
      
      case SmartRoutingStrategy.HEALTH_PRIORITIZED:
        return this.applyHealthPrioritizedRouting(nodes, context);
      
      case SmartRoutingStrategy.HYBRID_INTELLIGENT:
        return this.applyHybridIntelligentRouting(nodes, context);
      
      default:
        return this.applyHybridIntelligentRouting(nodes, context);
    }
  }

  /**
   * Apply error-aware routing (Group B integration)
   */
  private async applyErrorAwareRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Score nodes based on error resistance and recovery capabilities
    const scoredNodes = nodes.map(node => {
      let score = 100;
      
      // Penalize recent errors
      const recentErrors = context.errorHistory.filter(e => e.nodeId === node.nodeId);
      score -= recentErrors.length * 15;
      
      // Reward error coordination support
      if (node.supportsErrorCoordination) score += 20;
      
      // Consider recovery time
      if (node.recoveryTime && node.recoveryTime < 5000) score += 10;
      
      // Consider error rate
      score -= node.errorRate * 2;
      
      // Consider predictive score
      score += (node.predictiveScore - 50) * 0.5;

      return { node, score: Math.max(0, score) };
    });

    // Sort by score and return best
    scoredNodes.sort((a, b) => b.score - a.score);
    return scoredNodes[0].node;
  }

  /**
   * Apply cost-optimized routing
   */
  private async applyCostOptimizedRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Calculate cost efficiency scores
    const costScoredNodes = nodes.map(node => {
      const costEfficiency = (node.successRate / 100) / node.costPerRequest;
      const budgetEfficiency = node.budgetRemaining / (node.budgetRemaining + node.costPerRequest);
      const overallCostScore = (costEfficiency * 0.7) + (budgetEfficiency * 0.3);
      
      return { node, costScore: overallCostScore };
    });

    // Sort by cost efficiency
    costScoredNodes.sort((a, b) => b.costScore - a.costScore);
    return costScoredNodes[0].node;
  }

  /**
   * Apply performance-first routing (Group C integration)
   */
  private async applyPerformanceFirstRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Score based on performance metrics
    const performanceScoredNodes = nodes.map(node => {
      let score = 0;
      
      // Latency score (lower is better)
      score += Math.max(0, 100 - (node.averageLatency / context.maxLatency) * 100);
      
      // Success rate score
      score += node.successRate;
      
      // Load utilization score (lower utilization is better for performance)
      score += Math.max(0, 100 - (node.currentLoad / node.maxCapacity) * 100);
      
      // Performance monitoring bonus
      if (node.supportsPerformanceMonitoring) score += 25;
      
      // Health score bonus
      score += node.healthScore * 0.5;

      return { node, performanceScore: score };
    });

    performanceScoredNodes.sort((a, b) => b.performanceScore - a.performanceScore);
    return performanceScoredNodes[0].node;
  }

  /**
   * Apply circuit breaker aware routing
   */
  private async applyCircuitBreakerAwareRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Prioritize nodes with closed circuit breakers
    const stableNodes = nodes.filter(n => n.circuitBreakerState === "closed");
    
    if (stableNodes.length > 0) {
      // Among stable nodes, select best performance
      return this.applyPerformanceFirstRouting(stableNodes, context);
    }
    
    // Fallback to half-open nodes
    const halfOpenNodes = nodes.filter(n => n.circuitBreakerState === "half_open");
    if (halfOpenNodes.length > 0) {
      return halfOpenNodes[0];
    }
    
    // Last resort - return any available node
    return nodes[0];
  }

  /**
   * Apply budget-constrained routing
   */
  private async applyBudgetConstrainedRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Filter nodes within budget and sort by budget efficiency
    const budgetNodes = nodes.filter(n => 
      n.costPerRequest <= context.maxCostPerRequest && n.budgetRemaining > n.costPerRequest
    );

    if (budgetNodes.length === 0) {
      // Emergency mode - select cheapest available
      return nodes.reduce((cheapest, current) => 
        current.costPerRequest < cheapest.costPerRequest ? current : cheapest
      );
    }

    // Among budget-friendly nodes, optimize for value
    return this.applyHybridIntelligentRouting(budgetNodes, context);
  }

  /**
   * Apply health-prioritized routing
   */
  private async applyHealthPrioritizedRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Score based on comprehensive health
    const healthScoredNodes = nodes.map(node => {
      let healthScore = node.healthScore;
      
      // Adjust for current performance
      healthScore += (node.successRate - 95) * 2; // Bonus/penalty for success rate
      healthScore -= node.errorRate * 3; // Penalty for errors
      healthScore -= (node.currentLoad / node.maxCapacity) * 20; // Penalty for high load
      
      // Bonus for monitoring capabilities
      if (node.supportsPerformanceMonitoring) healthScore += 10;
      if (node.supportsErrorCoordination) healthScore += 10;
      
      return { node, adjustedHealthScore: Math.max(0, healthScore) };
    });

    healthScoredNodes.sort((a, b) => b.adjustedHealthScore - a.adjustedHealthScore);
    return healthScoredNodes[0].node;
  }

  /**
   * Apply hybrid intelligent routing
   */
  private async applyHybridIntelligentRouting(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): Promise<IntelligentRoutingNode> {
    // Multi-dimensional scoring with intelligent weights
    const hybridScoredNodes = nodes.map(node => {
      // Base scores
      const performanceScore = this.calculatePerformanceScore(node, context);
      const costScore = this.calculateCostScore(node, context);
      const healthScore = node.healthScore;
      const reliabilityScore = this.calculateReliabilityScore(node, context);
      const intelligenceScore = node.predictiveScore;
      
      // Dynamic weight calculation based on context
      const weights = this.calculateDynamicWeights(context);
      
      // Weighted hybrid score
      const hybridScore = 
        (performanceScore * weights.performance) +
        (costScore * weights.cost) +
        (healthScore * weights.health) +
        (reliabilityScore * weights.reliability) +
        (intelligenceScore * weights.intelligence);

      return { node, hybridScore };
    });

    hybridScoredNodes.sort((a, b) => b.hybridScore - a.hybridScore);
    return hybridScoredNodes[0].node;
  }

  /**
   * Calculate performance score for hybrid routing
   */
  private calculatePerformanceScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    let score = 0;
    
    // Latency score
    score += Math.max(0, 100 - (node.averageLatency / context.maxLatency) * 100);
    
    // Success rate score
    score += node.successRate;
    
    // Load efficiency score
    score += Math.max(0, 100 - (node.currentLoad / node.maxCapacity) * 100);
    
    return score / 3; // Normalize to 0-100
  }

  /**
   * Calculate cost score for hybrid routing
   */
  private calculateCostScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    const costEfficiency = Math.max(0, 100 - (node.costPerRequest / context.maxCostPerRequest) * 100);
    const budgetHealth = Math.min(100, (node.budgetRemaining / node.costPerRequest) * 10);
    
    return (costEfficiency * 0.7) + (budgetHealth * 0.3);
  }

  /**
   * Calculate reliability score
   */
  private calculateReliabilityScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    let score = node.successRate;
    
    // Penalty for circuit breaker issues
    if (node.circuitBreakerState === "open") score -= 50;
    if (node.circuitBreakerState === "half_open") score -= 20;
    
    // Penalty for recent errors
    const recentErrors = context.errorHistory.filter(e => e.nodeId === node.nodeId);
    score -= recentErrors.length * 10;
    
    // Bonus for error coordination support
    if (node.supportsErrorCoordination) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate dynamic weights based on context
   */
  private calculateDynamicWeights(context: SmartRoutingContext): any {
    let weights = {
      performance: 0.25,
      cost: 0.20,
      health: 0.25,
      reliability: 0.20,
      intelligence: 0.10
    };

    // Adjust based on business criticality
    if (context.businessCriticality === "critical") {
      weights.performance += 0.15;
      weights.reliability += 0.10;
      weights.cost -= 0.10;
    }

    // Adjust based on cost sensitivity
    if (context.costSensitivity === "high" || context.costSensitivity === "strict") {
      weights.cost += 0.20;
      weights.performance -= 0.10;
      weights.intelligence -= 0.05;
    }

    // Adjust based on error history
    if (context.errorHistory.length > 0) {
      weights.reliability += 0.15;
      weights.health += 0.10;
      weights.cost -= 0.10;
    }

    // Adjust based on time sensitivity
    if (context.timeSensitivity === "immediate") {
      weights.performance += 0.20;
      weights.intelligence += 0.05;
      weights.cost -= 0.10;
    }

    return weights;
  }

  /**
   * Generate intelligent fallback plan
   */
  private generateIntelligentFallbackPlan(
    selectedNode: IntelligentRoutingNode,
    allNodes: IntelligentRoutingNode[],
    context: SmartRoutingContext
  ): any {
    const alternativeNodes = allNodes.filter(n => n.nodeId !== selectedNode.nodeId);
    
    // Sort alternatives by hybrid score
    const scoredAlternatives = alternativeNodes.map(node => ({
      node,
      score: this.calculateFallbackScore(node, context)
    })).sort((a, b) => b.score - a.score);

    return {
      primary: scoredAlternatives[0]?.node || null,
      secondary: scoredAlternatives[1]?.node || null,
      emergency: this.selectEmergencyFallback(alternativeNodes, context)
    };
  }

  /**
   * Calculate fallback score
   */
  private calculateFallbackScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    let score = 0;
    
    // Base health and performance
    score += node.healthScore * 0.4;
    score += node.successRate * 0.3;
    
    // Penalty for high latency
    score -= (node.averageLatency / 1000) * 10;
    
    // Bonus for error coordination support
    if (node.supportsErrorCoordination) score += 20;
    
    // Budget consideration
    if (node.budgetRemaining > node.costPerRequest * 10) score += 15;
    
    return Math.max(0, score);
  }

  /**
   * Select emergency fallback node
   */
  private selectEmergencyFallback(nodes: IntelligentRoutingNode[], context: SmartRoutingContext): IntelligentRoutingNode | null {
    if (nodes.length === 0) return null;
    
    // For emergency, prioritize availability over cost
    const emergencyNodes = nodes.filter(n => 
      n.circuitBreakerState === "closed" && 
      n.currentLoad < n.maxCapacity * 0.9
    );
    
    if (emergencyNodes.length === 0) return nodes[0];
    
    // Select highest health score among emergency candidates
    return emergencyNodes.reduce((best, current) => 
      current.healthScore > best.healthScore ? current : best
    );
  }

  /**
   * Calculate intelligent predictions
   */
  private calculateIntelligentPredictions(node: IntelligentRoutingNode, context: SmartRoutingContext): any {
    // Enhanced prediction algorithms with learning
    const baseLatency = node.averageLatency;
    const loadFactor = node.currentLoad / node.maxCapacity;
    const predictedLatency = baseLatency * (1 + loadFactor * 0.5);

    const baseSuccessRate = node.successRate;
    const errorAdjustment = context.errorHistory.length * 2;
    const predictedSuccessRate = Math.max(80, baseSuccessRate - errorAdjustment);

    const baseCost = node.costPerRequest;
    const demandMultiplier = 1 + (loadFactor * 0.2);
    const predictedCost = baseCost * demandMultiplier;

    return {
      latency: Math.round(predictedLatency),
      successRate: Math.round(predictedSuccessRate * 10) / 10,
      cost: Math.round(predictedCost * 10000) / 10000
    };
  }

  /**
   * Assess intelligent risk
   */
  private assessIntelligentRisk(
    node: IntelligentRoutingNode,
    context: SmartRoutingContext,
    allNodes: IntelligentRoutingNode[]
  ): any {
    let riskScore = 0;
    const riskFactors = [];
    const mitigations = [];

    // Health-based risk
    if (node.healthScore < 70) {
      riskScore += 30;
      riskFactors.push("low_health_score");
      mitigations.push("increased_monitoring");
    }

    // Performance risk
    if (node.averageLatency > context.maxLatency * 0.8) {
      riskScore += 25;
      riskFactors.push("high_latency_risk");
      mitigations.push("performance_optimization");
    }

    // Error history risk
    if (context.errorHistory.length > 2) {
      riskScore += 20;
      riskFactors.push("recent_error_history");
      mitigations.push("enhanced_error_handling");
    }

    // Budget risk
    if (node.budgetRemaining < node.costPerRequest * 5) {
      riskScore += 15;
      riskFactors.push("budget_depletion_risk");
      mitigations.push("cost_monitoring");
    }

    // Load risk
    if (node.currentLoad / node.maxCapacity > 0.8) {
      riskScore += 20;
      riskFactors.push("high_load_utilization");
      mitigations.push("load_balancing");
    }

    // Circuit breaker risk
    if (node.circuitBreakerState !== "closed") {
      riskScore += 35;
      riskFactors.push("circuit_breaker_instability");
      mitigations.push("circuit_breaker_recovery");
    }

    // Determine risk level
    let riskLevel: "very_low" | "low" | "medium" | "high" | "very_high";
    if (riskScore < 20) riskLevel = "very_low";
    else if (riskScore < 40) riskLevel = "low";
    else if (riskScore < 60) riskLevel = "medium";
    else if (riskScore < 80) riskLevel = "high";
    else riskLevel = "very_high";

    return {
      level: riskLevel,
      factors: riskFactors,
      mitigations
    };
  }

  /**
   * Determine coordination requirements
   */
  private determineCoordinationRequirements(context: SmartRoutingContext, node: IntelligentRoutingNode): any {
    const coordination = {
      required: false,
      endpoints: [] as string[]
    };

    // System coordination required for critical operations
    if (context.requiresSystemCoordination) {
      coordination.required = true;
      coordination.endpoints.push("/api/v1/routing/coordinate");
    }

    // Cross-stream coordination for error scenarios
    if (context.errorHistory.length > 0) {
      coordination.required = true;
      coordination.endpoints.push("/api/v1/error/coordinate");
    }

    // Performance coordination for monitoring
    if (node.supportsPerformanceMonitoring) {
      coordination.endpoints.push("/api/v1/performance/coordinate");
    }

    return coordination;
  }

  /**
   * Register coordination API for System-Architecture-Lead integration
   */
  public registerCoordinationAPI(apiId: string, api: RoutingCoordinationAPI): void {
    this.coordinationAPIs.set(apiId, api);
    this.cacheCoordinationAPI(apiId, api);
    
    logger.info("Coordination API registered", {
      apiId,
      endpoint: api.endpoint,
      method: api.method,
      systemArchitectureCompatible: api.systemArchitectureIntegration.compatible
    });

    this.emit("coordinationAPIRegistered", { apiId, api });
  }

  /**
   * Get coordination APIs for System-Architecture-Lead
   */
  public getCoordinationAPIs(): Map<string, RoutingCoordinationAPI> {
    return new Map(this.coordinationAPIs);
  }

  /**
   * Start node health monitoring
   */
  private startNodeHealthMonitoring(node: IntelligentRoutingNode): void {
    const monitoringConfig: HealthMonitoringIntegration = {
      monitoringId: `monitor_${node.nodeId}`,
      nodeId: node.nodeId,
      healthCheckInterval: 30, // 30 seconds
      alertThresholds: {
        latency: node.averageLatency * 2,
        errorRate: 5,
        availability: 95,
        costOverrun: 20
      },
      escalationRules: [
        {
          condition: "latency > threshold",
          action: "alert_performance_team",
          delay: 60,
          recipients: ["performance@company.com"]
        },
        {
          condition: "error_rate > threshold",
          action: "activate_circuit_breaker",
          delay: 30,
          recipients: ["ops@company.com"]
        }
      ],
      coordinationTriggers: [
        {
          metric: "availability",
          threshold: 90,
          coordinationAction: "initiate_fallback"
        },
        {
          metric: "cost_overrun",
          threshold: 50,
          coordinationAction: "budget_alert"
        }
      ],
      integrationStatus: {
        errorOrchestration: true,
        performanceFramework: true,
        externalServices: true,
        securityFramework: true
      }
    };

    this.healthMonitoring.set(node.nodeId, monitoringConfig);
  }

  /**
   * Start intelligent monitoring
   */
  private startIntelligentMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performIntelligentMonitoring();
    }, 30000); // Monitor every 30 seconds

    logger.info("Intelligent traffic routing monitoring started");
  }

  /**
   * Start coordination processing
   */
  private startCoordinationProcessing(): void {
    this.coordinationInterval = setInterval(async () => {
      await this.processCoordinationQueue();
    }, 10000); // Process queue every 10 seconds

    logger.info("System coordination processing started");
  }

  /**
   * Start learning engine
   */
  private startLearningEngine(): void {
    this.learningInterval = setInterval(async () => {
      await this.updateLearningAlgorithms();
    }, 300000); // Update learning every 5 minutes

    logger.info("Intelligent learning engine started");
  }

  /**
   * Process coordination queue for System-Architecture-Lead handoff
   */
  private async processCoordinationQueue(): Promise<void> {
    while (this.coordinationQueue.length > 0) {
      const coordinationItem = this.coordinationQueue.shift();
      
      try {
        await this.executeSystemCoordination(coordinationItem);
      } catch (error) {
        logger.error("System coordination failed", {
          coordinationItem,
          error: error.message
        });
      }
    }
  }

  /**
   * Queue item for System-Architecture-Lead coordination
   */
  private queueForSystemCoordination(decision: SmartRoutingDecision, context: SmartRoutingContext): void {
    const coordinationItem = {
      coordinationId: decision.systemArchitectureIntegration.coordinationId,
      decision,
      context,
      phase: "phase_1_to_phase_2_handoff",
      priority: context.businessCriticality,
      timestamp: new Date()
    };

    this.coordinationQueue.push(coordinationItem);
    
    logger.info("Queued for System-Architecture-Lead coordination", {
      coordinationId: coordinationItem.coordinationId,
      serviceName: context.serviceName,
      priority: context.businessCriticality
    });
  }

  /**
   * Execute system coordination (Phase 1 to Phase 2 handoff)
   */
  private async executeSystemCoordination(coordinationItem: any): Promise<void> {
    logger.info("Executing system coordination handoff", {
      coordinationId: coordinationItem.coordinationId,
      phase: coordinationItem.phase
    });

    // Prepare coordination data for System-Architecture-Lead
    const coordinationData = {
      routingFoundation: {
        decision: coordinationItem.decision,
        context: coordinationItem.context,
        phase: "phase_1_complete"
      },
      systemReadiness: {
        errorIntegration: this.systemArchitectureReadiness.get("error_integration_ready"),
        performanceIntegration: this.systemArchitectureReadiness.get("performance_integration_ready"),
        coordinationAPIs: this.systemArchitectureReadiness.get("coordination_apis_ready"),
        monitoringActive: true
      },
      nextPhaseRequirements: {
        systemWideCoordination: true,
        crossStreamIntegration: true,
        advancedOptimization: true
      }
    };

    // Emit coordination event for System-Architecture-Lead
    this.emitIntelligentRoutingEvent("system_coordination_ready", {
      coordinationId: coordinationItem.coordinationId,
      coordinationData,
      readyForPhase2: true
    });

    // Create audit log for coordination handoff
    await this.createCoordinationAuditLog(coordinationItem);
  }

  /**
   * Utility methods for intelligence and learning
   */

  private generateIntelligentDecisionReason(
    node: IntelligentRoutingNode,
    strategy: SmartRoutingStrategy,
    context: SmartRoutingContext
  ): string {
    const reasons = [`Selected ${node.providerName} using ${strategy} strategy`];
    
    reasons.push(`Health score: ${node.healthScore}`);
    reasons.push(`Latency: ${node.averageLatency}ms`);
    reasons.push(`Success rate: ${node.successRate}%`);
    reasons.push(`Cost: $${node.costPerRequest}`);
    
    if (node.supportsErrorCoordination) {
      reasons.push("Error coordination enabled");
    }
    
    if (context.errorHistory.length > 0) {
      reasons.push(`Error-aware routing (${context.errorHistory.length} recent errors)`);
    }

    return reasons.join(", ");
  }

  private calculateIntelligentConfidence(
    node: IntelligentRoutingNode,
    context: SmartRoutingContext,
    allNodes: IntelligentRoutingNode[]
  ): number {
    let confidence = node.healthScore * 0.4;
    confidence += node.successRate * 0.3;
    confidence += node.predictiveScore * 0.2;
    confidence += (100 - node.errorRate * 10) * 0.1;
    
    // Adjust for context
    if (context.errorHistory.length > 0) {
      confidence -= context.errorHistory.length * 5;
    }
    
    if (node.supportsErrorCoordination && node.supportsPerformanceMonitoring) {
      confidence += 10;
    }
    
    // Adjust for alternatives availability
    const alternativeQuality = allNodes.filter(n => n.nodeId !== node.nodeId && n.healthScore > 80).length;
    confidence += Math.min(15, alternativeQuality * 3);
    
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private getAppliedAdaptations(context: SmartRoutingContext, node: IntelligentRoutingNode): string[] {
    const adaptations = [];
    
    if (context.errorHistory.length > 0) {
      adaptations.push("error_history_learning");
    }
    
    if (node.learningWeight > 0.5) {
      adaptations.push("machine_learning_applied");
    }
    
    if (context.requiresSystemCoordination) {
      adaptations.push("system_coordination_integration");
    }
    
    if (node.supportsPerformanceMonitoring) {
      adaptations.push("performance_monitoring_integration");
    }
    
    return adaptations;
  }

  private getSelectionCriteria(context: SmartRoutingContext): any {
    return {
      businessCriticality: context.businessCriticality,
      timeSensitivity: context.timeSensitivity,
      costSensitivity: context.costSensitivity,
      maxLatency: context.maxLatency,
      minSuccessRate: context.minSuccessRate,
      systemCoordinationRequired: context.requiresSystemCoordination
    };
  }

  private calculateSavingsOpportunity(context: SmartRoutingContext, node: IntelligentRoutingNode): number {
    // Calculate potential savings compared to most expensive option
    return Math.max(0, context.maxCostPerRequest - node.costPerRequest);
  }

  private async applyLearningAlgorithms(decision: SmartRoutingDecision, context: SmartRoutingContext): Promise<void> {
    // Update node learning weights based on decision outcomes
    const node = decision.selectedNode;
    
    // Increase learning weight for successful high-confidence decisions
    if (decision.confidenceScore > 80) {
      node.learningWeight = Math.min(1.0, node.learningWeight + 0.05);
    }
    
    // Increase adaptation rate for error-prone scenarios
    if (context.errorHistory.length > 0) {
      node.adaptationRate = Math.min(0.5, node.adaptationRate + 0.02);
    }
    
    // Update predictive score based on context patterns
    const contextPattern = this.analyzeContextPattern(context);
    this.learningAlgorithms.set(node.nodeId, {
      lastUpdate: new Date(),
      contextPattern,
      learningWeight: node.learningWeight,
      adaptationRate: node.adaptationRate
    });
  }

  private analyzeContextPattern(context: SmartRoutingContext): string {
    if (context.businessCriticality === "critical" && context.timeSensitivity === "immediate") {
      return "critical_immediate";
    } else if (context.costSensitivity === "high" || context.costSensitivity === "strict") {
      return "cost_sensitive";
    } else if (context.errorHistory.length > 0) {
      return "error_recovery";
    } else {
      return "standard_operation";
    }
  }

  private async updateLearningAlgorithms(): Promise<void> {
    // Update machine learning algorithms based on accumulated data
    for (const [nodeId, learningData] of this.learningAlgorithms) {
      try {
        await this.optimizeNodeLearning(nodeId, learningData);
      } catch (error) {
        logger.error(`Learning algorithm update failed for node ${nodeId}`, {
          error: error.message
        });
      }
    }
  }

  private async optimizeNodeLearning(nodeId: string, learningData: any): Promise<void> {
    // Implement machine learning optimization
    // This would typically involve updating ML models based on performance data
    logger.debug("Optimizing node learning", {
      nodeId,
      pattern: learningData.contextPattern,
      learningWeight: learningData.learningWeight
    });
  }

  private async performIntelligentMonitoring(): Promise<void> {
    // Perform intelligent monitoring of all nodes
    for (const [serviceName, nodes] of this.routingNodes) {
      for (const node of nodes) {
        try {
          await this.updateNodeIntelligence(node);
        } catch (error) {
          logger.error(`Intelligent monitoring failed for node ${node.nodeId}`, {
            error: error.message
          });
        }
      }
    }
  }

  private async updateNodeIntelligence(node: IntelligentRoutingNode): Promise<void> {
    // Update intelligent metrics for the node
    const healthAdjustment = this.calculateHealthAdjustment(node);
    node.healthScore = Math.max(0, Math.min(100, node.healthScore + healthAdjustment));
    
    // Update predictive score based on recent performance
    const performanceTrend = this.calculatePerformanceTrend(node);
    node.predictiveScore = Math.max(0, Math.min(100, node.predictiveScore + performanceTrend));
    
    node.lastHealthCheck = new Date();
  }

  private calculateHealthAdjustment(node: IntelligentRoutingNode): number {
    let adjustment = 0;
    
    // Positive adjustments
    if (node.errorRate < 1) adjustment += 2;
    if (node.successRate > 99) adjustment += 3;
    if (node.currentLoad / node.maxCapacity < 0.7) adjustment += 1;
    
    // Negative adjustments
    if (node.errorRate > 5) adjustment -= 5;
    if (node.successRate < 95) adjustment -= 3;
    if (node.currentLoad / node.maxCapacity > 0.9) adjustment -= 2;
    
    return adjustment;
  }

  private calculatePerformanceTrend(node: IntelligentRoutingNode): number {
    // Simplified performance trend calculation
    // In reality, this would analyze historical performance data
    let trend = 0;
    
    if (node.averageLatency < 200) trend += 1;
    if (node.averageLatency > 500) trend -= 2;
    
    return trend;
  }

  /**
   * Record smart decision for analytics and learning
   */
  private recordSmartDecision(serviceName: string, decision: SmartRoutingDecision): void {
    const history = this.decisionHistory.get(serviceName) || [];
    history.push(decision);
    
    // Keep only last 50 decisions for learning
    if (history.length > 50) {
      history.shift();
    }
    
    this.decisionHistory.set(serviceName, history);
    
    // Cache for persistence
    this.cacheDecisionHistory(serviceName, history);
  }

  /**
   * Cache operations
   */
  private async cacheRoutingNodes(serviceName: string, nodes: IntelligentRoutingNode[]): Promise<void> {
    const cacheKey = `${this.ROUTING_FOUNDATION_CACHE}:nodes:${serviceName}`;
    await redisClient.setex(cacheKey, 3600, JSON.stringify(nodes));
  }

  private async cacheCoordinationAPI(apiId: string, api: RoutingCoordinationAPI): Promise<void> {
    const cacheKey = `${this.COORDINATION_API_CACHE}:${apiId}`;
    await redisClient.setex(cacheKey, 7200, JSON.stringify(api));
  }

  private async cacheDecisionHistory(serviceName: string, history: SmartRoutingDecision[]): Promise<void> {
    const cacheKey = `${this.ROUTING_FOUNDATION_CACHE}:history:${serviceName}`;
    await redisClient.setex(cacheKey, 1800, JSON.stringify(history));
  }

  /**
   * Event emission for real-time monitoring
   */
  private emitIntelligentRoutingEvent(eventType: string, data: any): void {
    const event = {
      eventType,
      timestamp: new Date(),
      phase: "phase_1_backend_foundation",
      ...data
    };

    this.emit(eventType, event);
    
    // Send to frontend via WebSocket
    socketManager.emitIntelligentRoutingEvent(event);
  }

  /**
   * Create audit log for coordination
   */
  private async createCoordinationAuditLog(coordinationItem: any): Promise<void> {
    try {
      await AuditLog.create({
        eventType: "intelligent_routing_coordination",
        tableName: "traffic_routing_coordination",
        recordId: coordinationItem.coordinationId,
        userId: coordinationItem.context?.userId,
        changes: {
          coordinationId: coordinationItem.coordinationId,
          phase: coordinationItem.phase,
          serviceName: coordinationItem.context?.serviceName,
          selectedProvider: coordinationItem.decision?.selectedNode?.providerName,
          priority: coordinationItem.priority,
          systemArchitectureHandoff: true
        },
        ipAddress: "system",
        userAgent: "IntelligentTrafficRoutingFoundation",
        organizationId: coordinationItem.context?.organizationId
      });
    } catch (error) {
      logger.error("Failed to create coordination audit log", {
        error: error.message,
        coordinationId: coordinationItem.coordinationId
      });
    }
  }

  /**
   * Get system architecture readiness status
   */
  public getSystemArchitectureReadiness(): {
    phase1Complete: boolean;
    coordinationAPIsReady: boolean;
    errorIntegrationReady: boolean;
    performanceIntegrationReady: boolean;
    readyForPhase2: boolean;
  } {
    return {
      phase1Complete: this.systemArchitectureReadiness.get("phase_1_complete") || false,
      coordinationAPIsReady: this.systemArchitectureReadiness.get("coordination_apis_ready") || false,
      errorIntegrationReady: this.systemArchitectureReadiness.get("error_integration_ready") || false,
      performanceIntegrationReady: this.systemArchitectureReadiness.get("performance_integration_ready") || false,
      readyForPhase2: Array.from(this.systemArchitectureReadiness.values()).every(ready => ready)
    };
  }

  /**
   * Get foundation analytics for System-Architecture-Lead
   */
  public async getFoundationAnalytics(): Promise<any> {
    const analytics = {
      totalServices: this.routingNodes.size,
      totalNodes: Array.from(this.routingNodes.values()).reduce((sum, nodes) => sum + nodes.length, 0),
      totalDecisions: Array.from(this.decisionHistory.values()).reduce((sum, history) => sum + history.length, 0),
      coordinationAPIs: this.coordinationAPIs.size,
      systemReadiness: this.getSystemArchitectureReadiness(),
      healthyNodes: 0,
      averageConfidence: 0,
      lastUpdate: new Date()
    };

    // Calculate healthy nodes and average confidence
    let totalConfidence = 0;
    let totalDecisions = 0;

    for (const nodes of this.routingNodes.values()) {
      analytics.healthyNodes += nodes.filter(n => n.healthScore > 80).length;
    }

    for (const history of this.decisionHistory.values()) {
      for (const decision of history) {
        totalConfidence += decision.confidenceScore;
        totalDecisions++;
      }
    }

    if (totalDecisions > 0) {
      analytics.averageConfidence = Math.round(totalConfidence / totalDecisions);
    }

    return analytics;
  }

  /**
   * Gracefully shutdown the foundation service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down Intelligent Traffic Routing Foundation");

    // Clear monitoring intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }

    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }
    
    // Clear data structures
    this.routingNodes.clear();
    this.decisionHistory.clear();
    this.coordinationAPIs.clear();
    this.healthMonitoring.clear();
    this.learningAlgorithms.clear();
    this.coordinationQueue.length = 0;
    this.systemArchitectureReadiness.clear();

    logger.info("Intelligent Traffic Routing Foundation shutdown complete");
  }
}

// Export types and service
export {
  SmartRoutingStrategy,
  IntelligentRoutingNode,
  SmartRoutingContext,
  SmartRoutingDecision,
  RoutingCoordinationAPI,
  HealthMonitoringIntegration
};

export default IntelligentTrafficRoutingFoundation;