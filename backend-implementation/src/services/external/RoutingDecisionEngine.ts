/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ROUTING DECISION ENGINE
 * ============================================================================
 *
 * Core intelligent routing decision algorithms with error-aware capabilities.
 * Supports the Intelligent Traffic Routing Foundation with advanced algorithms.
 *
 * Features:
 * - Multi-criteria decision algorithms
 * - Error scenario optimization 
 * - Cost-aware routing with budget protection
 * - Performance-based routing decisions
 * - Machine learning integration
 * - Circuit breaker pattern support
 * - Real-time adaptation algorithms
 *
 * Performance Targets:
 * - Decision computation: <20ms
 * - Algorithm optimization: <10ms
 * - Risk assessment: <5ms
 * - Learning updates: <50ms
 *
 * Created by: Backend Development Agent (Group E Phase 1)
 * Date: 2025-08-19
 * Version: 1.0.0 - Decision Engine Foundation
 */

import { logger } from "@/utils/logger";
import { 
  SmartRoutingStrategy,
  IntelligentRoutingNode,
  SmartRoutingContext,
  SmartRoutingDecision
} from "./IntelligentTrafficRoutingFoundation";

/**
 * Decision algorithm configuration
 */
export interface DecisionAlgorithmConfig {
  algorithmId: string;
  name: string;
  description: string;
  strategy: SmartRoutingStrategy;
  weights: {
    performance: number;
    cost: number;
    reliability: number;
    health: number;
    intelligence: number;
  };
  thresholds: {
    minHealthScore: number;
    maxLatency: number;
    maxCostRatio: number;
    minSuccessRate: number;
    maxErrorRate: number;
  };
  adaptationSettings: {
    learningRate: number;
    adaptationSpeed: number;
    memoryLength: number;
    explorationRate: number;
  };
  errorHandling: {
    errorAwareness: boolean;
    circuitBreakerSupport: boolean;
    cascadeProtection: boolean;
    recoveryOptimization: boolean;
  };
}

/**
 * Algorithm performance metrics
 */
export interface AlgorithmMetrics {
  algorithmId: string;
  executionTime: number; // milliseconds
  accuracy: number; // percentage
  confidenceScore: number; // 0-100
  decisionQuality: number; // 0-100
  adaptationEffectiveness: number; // 0-100
  errorMitigation: number; // 0-100
  learningProgress: number; // 0-100
  computationalEfficiency: number; // decisions per second
}

/**
 * Decision context analysis result
 */
export interface ContextAnalysis {
  analysisId: string;
  context: SmartRoutingContext;
  criticalFactors: string[];
  riskAssessment: {
    overallRisk: "very_low" | "low" | "medium" | "high" | "very_high";
    riskFactors: Array<{
      factor: string;
      severity: "low" | "medium" | "high" | "critical";
      impact: string;
    }>;
  };
  recommendations: Array<{
    strategy: SmartRoutingStrategy;
    confidence: number;
    reasoning: string;
  }>;
  optimizationOpportunities: string[];
  constraintViolations: string[];
}

/**
 * Main routing decision engine
 */
export class RoutingDecisionEngine {
  private algorithms: Map<SmartRoutingStrategy, DecisionAlgorithmConfig> = new Map();
  private algorithmMetrics: Map<string, AlgorithmMetrics> = new Map();
  private decisionHistory: Array<{
    context: SmartRoutingContext;
    decision: SmartRoutingDecision;
    outcome: any;
    timestamp: Date;
  }> = [];
  
  private learningData: Map<string, any> = new Map();
  private adaptationRules: Map<string, any> = new Map();

  constructor() {
    this.initializeAlgorithms();
    this.initializeLearningSystem();
  }

  /**
   * Initialize decision algorithms
   */
  private initializeAlgorithms(): void {
    // Error-aware algorithm
    this.algorithms.set(SmartRoutingStrategy.ERROR_AWARE, {
      algorithmId: "error_aware_v1",
      name: "Error-Aware Routing",
      description: "Prioritizes nodes with low error rates and strong recovery capabilities",
      strategy: SmartRoutingStrategy.ERROR_AWARE,
      weights: {
        performance: 0.20,
        cost: 0.10,
        reliability: 0.40,
        health: 0.25,
        intelligence: 0.05
      },
      thresholds: {
        minHealthScore: 70,
        maxLatency: 1000,
        maxCostRatio: 2.0,
        minSuccessRate: 95,
        maxErrorRate: 5
      },
      adaptationSettings: {
        learningRate: 0.15,
        adaptationSpeed: 0.20,
        memoryLength: 20,
        explorationRate: 0.10
      },
      errorHandling: {
        errorAwareness: true,
        circuitBreakerSupport: true,
        cascadeProtection: true,
        recoveryOptimization: true
      }
    });

    // Cost-optimized algorithm
    this.algorithms.set(SmartRoutingStrategy.COST_OPTIMIZED, {
      algorithmId: "cost_optimized_v1",
      name: "Cost-Optimized Routing",
      description: "Minimizes costs while maintaining acceptable performance",
      strategy: SmartRoutingStrategy.COST_OPTIMIZED,
      weights: {
        performance: 0.15,
        cost: 0.50,
        reliability: 0.15,
        health: 0.15,
        intelligence: 0.05
      },
      thresholds: {
        minHealthScore: 60,
        maxLatency: 2000,
        maxCostRatio: 1.0,
        minSuccessRate: 90,
        maxErrorRate: 10
      },
      adaptationSettings: {
        learningRate: 0.10,
        adaptationSpeed: 0.15,
        memoryLength: 30,
        explorationRate: 0.05
      },
      errorHandling: {
        errorAwareness: true,
        circuitBreakerSupport: false,
        cascadeProtection: false,
        recoveryOptimization: false
      }
    });

    // Performance-first algorithm
    this.algorithms.set(SmartRoutingStrategy.PERFORMANCE_FIRST, {
      algorithmId: "performance_first_v1",
      name: "Performance-First Routing",
      description: "Prioritizes lowest latency and highest throughput",
      strategy: SmartRoutingStrategy.PERFORMANCE_FIRST,
      weights: {
        performance: 0.50,
        cost: 0.05,
        reliability: 0.25,
        health: 0.15,
        intelligence: 0.05
      },
      thresholds: {
        minHealthScore: 80,
        maxLatency: 500,
        maxCostRatio: 3.0,
        minSuccessRate: 98,
        maxErrorRate: 2
      },
      adaptationSettings: {
        learningRate: 0.20,
        adaptationSpeed: 0.25,
        memoryLength: 15,
        explorationRate: 0.15
      },
      errorHandling: {
        errorAwareness: true,
        circuitBreakerSupport: true,
        cascadeProtection: true,
        recoveryOptimization: true
      }
    });

    // Hybrid intelligent algorithm
    this.algorithms.set(SmartRoutingStrategy.HYBRID_INTELLIGENT, {
      algorithmId: "hybrid_intelligent_v1",
      name: "Hybrid Intelligent Routing",
      description: "Balances all factors with machine learning optimization",
      strategy: SmartRoutingStrategy.HYBRID_INTELLIGENT,
      weights: {
        performance: 0.25,
        cost: 0.20,
        reliability: 0.25,
        health: 0.20,
        intelligence: 0.10
      },
      thresholds: {
        minHealthScore: 75,
        maxLatency: 800,
        maxCostRatio: 1.5,
        minSuccessRate: 96,
        maxErrorRate: 4
      },
      adaptationSettings: {
        learningRate: 0.25,
        adaptationSpeed: 0.30,
        memoryLength: 25,
        explorationRate: 0.20
      },
      errorHandling: {
        errorAwareness: true,
        circuitBreakerSupport: true,
        cascadeProtection: true,
        recoveryOptimization: true
      }
    });

    logger.info("Routing decision algorithms initialized", {
      algorithmsCount: this.algorithms.size,
      strategies: Array.from(this.algorithms.keys())
    });
  }

  /**
   * Initialize learning system
   */
  private initializeLearningSystem(): void {
    // Initialize learning data for each algorithm
    for (const [strategy, config] of this.algorithms) {
      this.learningData.set(config.algorithmId, {
        successHistory: [],
        failureHistory: [],
        adaptationHistory: [],
        performanceMetrics: {
          averageExecutionTime: 0,
          averageAccuracy: 0,
          successRate: 0
        },
        lastUpdate: new Date()
      });
    }

    logger.info("Learning system initialized for routing algorithms");
  }

  /**
   * Analyze routing context and provide recommendations
   */
  public analyzeContext(context: SmartRoutingContext): ContextAnalysis {
    const startTime = Date.now();
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Identify critical factors
    const criticalFactors = this.identifyCriticalFactors(context);
    
    // Perform risk assessment
    const riskAssessment = this.performRiskAssessment(context);
    
    // Generate strategy recommendations
    const recommendations = this.generateStrategyRecommendations(context);
    
    // Identify optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(context);
    
    // Check for constraint violations
    const constraintViolations = this.checkConstraintViolations(context);

    const analysis: ContextAnalysis = {
      analysisId,
      context,
      criticalFactors,
      riskAssessment,
      recommendations,
      optimizationOpportunities,
      constraintViolations
    };

    const analysisTime = Date.now() - startTime;
    
    logger.debug("Context analysis completed", {
      analysisId,
      analysisTime,
      criticalFactorsCount: criticalFactors.length,
      riskLevel: riskAssessment.overallRisk,
      recommendationsCount: recommendations.length
    });

    return analysis;
  }

  /**
   * Execute routing decision algorithm
   */
  public async executeDecisionAlgorithm(
    strategy: SmartRoutingStrategy,
    nodes: IntelligentRoutingNode[],
    context: SmartRoutingContext
  ): Promise<IntelligentRoutingNode> {
    const algorithm = this.algorithms.get(strategy);
    if (!algorithm) {
      throw new Error(`Algorithm not found for strategy: ${strategy}`);
    }

    const startTime = Date.now();
    
    try {
      // Apply algorithm-specific logic
      const selectedNode = await this.applyAlgorithmLogic(algorithm, nodes, context);
      
      // Record performance metrics
      const executionTime = Date.now() - startTime;
      this.recordAlgorithmMetrics(algorithm.algorithmId, executionTime, true);
      
      // Update learning data
      await this.updateLearningData(algorithm.algorithmId, {
        context,
        selectedNode,
        success: true,
        executionTime
      });

      logger.debug("Decision algorithm executed successfully", {
        algorithmId: algorithm.algorithmId,
        strategy,
        selectedNode: selectedNode.nodeId,
        executionTime
      });

      return selectedNode;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordAlgorithmMetrics(algorithm.algorithmId, executionTime, false);
      
      logger.error("Decision algorithm execution failed", {
        algorithmId: algorithm.algorithmId,
        strategy,
        error: error.message,
        executionTime
      });

      throw error;
    }
  }

  /**
   * Apply algorithm-specific logic
   */
  private async applyAlgorithmLogic(
    algorithm: DecisionAlgorithmConfig,
    nodes: IntelligentRoutingNode[],
    context: SmartRoutingContext
  ): Promise<IntelligentRoutingNode> {
    // Filter nodes based on algorithm thresholds
    const eligibleNodes = this.filterNodesByThresholds(nodes, algorithm, context);
    
    if (eligibleNodes.length === 0) {
      throw new Error("No nodes meet algorithm thresholds");
    }

    // Score nodes using algorithm weights and criteria
    const scoredNodes = this.scoreNodes(eligibleNodes, algorithm, context);
    
    // Apply learning adjustments
    const adjustedNodes = await this.applyLearningAdjustments(scoredNodes, algorithm, context);
    
    // Apply error-aware adjustments if enabled
    if (algorithm.errorHandling.errorAwareness) {
      this.applyErrorAwareAdjustments(adjustedNodes, context);
    }
    
    // Select best node
    adjustedNodes.sort((a, b) => b.score - a.score);
    return adjustedNodes[0].node;
  }

  /**
   * Filter nodes by algorithm thresholds
   */
  private filterNodesByThresholds(
    nodes: IntelligentRoutingNode[],
    algorithm: DecisionAlgorithmConfig,
    context: SmartRoutingContext
  ): IntelligentRoutingNode[] {
    return nodes.filter(node => {
      // Health score threshold
      if (node.healthScore < algorithm.thresholds.minHealthScore) {
        return false;
      }

      // Latency threshold
      if (node.averageLatency > algorithm.thresholds.maxLatency) {
        return false;
      }

      // Cost ratio threshold
      const costRatio = node.costPerRequest / context.maxCostPerRequest;
      if (costRatio > algorithm.thresholds.maxCostRatio) {
        return false;
      }

      // Success rate threshold
      if (node.successRate < algorithm.thresholds.minSuccessRate) {
        return false;
      }

      // Error rate threshold
      if (node.errorRate > algorithm.thresholds.maxErrorRate) {
        return false;
      }

      // Circuit breaker check if supported
      if (algorithm.errorHandling.circuitBreakerSupport && node.circuitBreakerState === "open") {
        return false;
      }

      return true;
    });
  }

  /**
   * Score nodes using algorithm weights
   */
  private scoreNodes(
    nodes: IntelligentRoutingNode[],
    algorithm: DecisionAlgorithmConfig,
    context: SmartRoutingContext
  ): Array<{ node: IntelligentRoutingNode; score: number; breakdown: any }> {
    return nodes.map(node => {
      const scores = {
        performance: this.calculatePerformanceScore(node, context),
        cost: this.calculateCostScore(node, context),
        reliability: this.calculateReliabilityScore(node, context),
        health: node.healthScore,
        intelligence: node.predictiveScore
      };

      // Apply algorithm weights
      const weightedScore = 
        (scores.performance * algorithm.weights.performance) +
        (scores.cost * algorithm.weights.cost) +
        (scores.reliability * algorithm.weights.reliability) +
        (scores.health * algorithm.weights.health) +
        (scores.intelligence * algorithm.weights.intelligence);

      return {
        node,
        score: weightedScore,
        breakdown: scores
      };
    });
  }

  /**
   * Apply learning adjustments to node scores
   */
  private async applyLearningAdjustments(
    scoredNodes: Array<{ node: IntelligentRoutingNode; score: number; breakdown: any }>,
    algorithm: DecisionAlgorithmConfig,
    context: SmartRoutingContext
  ): Promise<Array<{ node: IntelligentRoutingNode; score: number; breakdown: any }>> {
    const learningData = this.learningData.get(algorithm.algorithmId);
    if (!learningData) {
      return scoredNodes;
    }

    // Apply learning-based score adjustments
    return scoredNodes.map(item => {
      let adjustedScore = item.score;
      
      // Reward nodes with good historical performance
      const nodeHistory = learningData.successHistory.filter((h: any) => h.nodeId === item.node.nodeId);
      if (nodeHistory.length > 0) {
        const successRate = nodeHistory.filter((h: any) => h.success).length / nodeHistory.length;
        adjustedScore += (successRate - 0.5) * 10; // +/-5 points based on historical success
      }
      
      // Apply exploration bonus for under-utilized nodes
      const nodeUsage = this.decisionHistory.filter(h => 
        h.decision.selectedNode.nodeId === item.node.nodeId
      ).length;
      
      const averageUsage = this.decisionHistory.length / scoredNodes.length;
      if (nodeUsage < averageUsage * 0.5) {
        adjustedScore += algorithm.adaptationSettings.explorationRate * 10;
      }

      return {
        ...item,
        score: adjustedScore
      };
    });
  }

  /**
   * Apply error-aware adjustments
   */
  private applyErrorAwareAdjustments(
    scoredNodes: Array<{ node: IntelligentRoutingNode; score: number; breakdown: any }>,
    context: SmartRoutingContext
  ): void {
    // Penalize nodes with recent errors
    scoredNodes.forEach(item => {
      const recentErrors = context.errorHistory.filter(error => 
        error.nodeId === item.node.nodeId &&
        Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
      );

      // Apply error penalty
      const errorPenalty = recentErrors.length * 5;
      item.score = Math.max(0, item.score - errorPenalty);

      // Apply severity-based penalty
      const criticalErrors = recentErrors.filter(e => e.severity === "critical").length;
      const severityPenalty = criticalErrors * 15;
      item.score = Math.max(0, item.score - severityPenalty);
    });
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    let score = 0;
    
    // Latency score (0-100, lower latency = higher score)
    const latencyScore = Math.max(0, 100 - (node.averageLatency / context.maxLatency) * 100);
    score += latencyScore * 0.5;
    
    // Load utilization score (0-100, lower utilization = higher score)
    const utilizationScore = Math.max(0, 100 - (node.currentLoad / node.maxCapacity) * 100);
    score += utilizationScore * 0.3;
    
    // Success rate contribution
    score += node.successRate * 0.2;
    
    return Math.min(100, score);
  }

  /**
   * Calculate cost score
   */
  private calculateCostScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    // Cost efficiency score (0-100, lower cost = higher score)
    const costEfficiency = Math.max(0, 100 - (node.costPerRequest / context.maxCostPerRequest) * 100);
    
    // Budget health score
    const budgetHealth = Math.min(100, (node.budgetRemaining / node.costPerRequest) * 10);
    
    return (costEfficiency * 0.7) + (budgetHealth * 0.3);
  }

  /**
   * Calculate reliability score
   */
  private calculateReliabilityScore(node: IntelligentRoutingNode, context: SmartRoutingContext): number {
    let score = node.successRate;
    
    // Circuit breaker penalty
    if (node.circuitBreakerState === "open") score -= 40;
    if (node.circuitBreakerState === "half_open") score -= 15;
    
    // Error rate penalty
    score -= node.errorRate * 5;
    
    // Recent error penalty
    const recentErrors = context.errorHistory.filter(e => e.nodeId === node.nodeId).length;
    score -= recentErrors * 8;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify critical factors in context
   */
  private identifyCriticalFactors(context: SmartRoutingContext): string[] {
    const factors = [];
    
    if (context.businessCriticality === "critical") {
      factors.push("critical_business_operation");
    }
    
    if (context.timeSensitivity === "immediate") {
      factors.push("immediate_time_requirement");
    }
    
    if (context.costSensitivity === "strict") {
      factors.push("strict_cost_constraint");
    }
    
    if (context.errorHistory.length > 0) {
      factors.push("recent_error_activity");
    }
    
    if (context.currentErrorState?.cascadingRisk !== "none") {
      factors.push("cascading_failure_risk");
    }
    
    if (context.maxLatency < 500) {
      factors.push("low_latency_requirement");
    }
    
    if (context.minSuccessRate > 99) {
      factors.push("high_reliability_requirement");
    }
    
    return factors;
  }

  /**
   * Perform comprehensive risk assessment
   */
  private performRiskAssessment(context: SmartRoutingContext): any {
    const riskFactors = [];
    let totalRisk = 0;

    // Business criticality risk
    if (context.businessCriticality === "critical") {
      riskFactors.push({
        factor: "critical_business_operation",
        severity: "high" as const,
        impact: "High business impact if routing fails"
      });
      totalRisk += 25;
    }

    // Error history risk
    if (context.errorHistory.length > 2) {
      riskFactors.push({
        factor: "recent_error_pattern",
        severity: "medium" as const,
        impact: "Pattern of recent errors indicates instability"
      });
      totalRisk += 20;
    }

    // Cascading failure risk
    if (context.currentErrorState?.cascadingRisk === "high") {
      riskFactors.push({
        factor: "cascading_failure_potential",
        severity: "critical" as const,
        impact: "High risk of cascading failures across services"
      });
      totalRisk += 35;
    }

    // Budget constraint risk
    if (context.costSensitivity === "strict" && !context.emergencyBudgetAvailable) {
      riskFactors.push({
        factor: "budget_constraint",
        severity: "medium" as const,
        impact: "Limited budget may restrict routing options"
      });
      totalRisk += 15;
    }

    // Performance requirement risk
    if (context.maxLatency < 200 && context.timeSensitivity === "immediate") {
      riskFactors.push({
        factor: "aggressive_performance_requirement",
        severity: "high" as const,
        impact: "Very tight performance requirements may be hard to meet"
      });
      totalRisk += 20;
    }

    // Determine overall risk level
    let overallRisk: "very_low" | "low" | "medium" | "high" | "very_high";
    if (totalRisk < 20) overallRisk = "very_low";
    else if (totalRisk < 40) overallRisk = "low";
    else if (totalRisk < 60) overallRisk = "medium";
    else if (totalRisk < 80) overallRisk = "high";
    else overallRisk = "very_high";

    return {
      overallRisk,
      riskFactors
    };
  }

  /**
   * Generate strategy recommendations
   */
  private generateStrategyRecommendations(context: SmartRoutingContext): Array<{
    strategy: SmartRoutingStrategy;
    confidence: number;
    reasoning: string;
  }> {
    const recommendations = [];

    // Error-aware recommendation
    if (context.errorHistory.length > 0 || context.currentErrorState?.activeErrors) {
      recommendations.push({
        strategy: SmartRoutingStrategy.ERROR_AWARE,
        confidence: 85,
        reasoning: "Recent errors detected, prioritizing error-resistant routing"
      });
    }

    // Performance-first recommendation
    if (context.businessCriticality === "critical" && context.timeSensitivity === "immediate") {
      recommendations.push({
        strategy: SmartRoutingStrategy.PERFORMANCE_FIRST,
        confidence: 90,
        reasoning: "Critical operation with immediate timing requires performance-first routing"
      });
    }

    // Cost-optimized recommendation
    if (context.costSensitivity === "high" || context.costSensitivity === "strict") {
      recommendations.push({
        strategy: SmartRoutingStrategy.COST_OPTIMIZED,
        confidence: 80,
        reasoning: "High cost sensitivity requires cost-optimized routing strategy"
      });
    }

    // Hybrid intelligent recommendation (default)
    recommendations.push({
      strategy: SmartRoutingStrategy.HYBRID_INTELLIGENT,
      confidence: 75,
      reasoning: "Balanced approach suitable for most scenarios with intelligent optimization"
    });

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    
    return recommendations;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(context: SmartRoutingContext): string[] {
    const opportunities = [];

    if (context.errorHistory.length > 0) {
      opportunities.push("Implement predictive error avoidance");
    }

    if (context.costSensitivity !== "none") {
      opportunities.push("Apply cost optimization algorithms");
    }

    if (context.maxLatency > 1000) {
      opportunities.push("Optimize for lower latency requirements");
    }

    if (context.requiresSystemCoordination) {
      opportunities.push("Enable cross-system coordination optimization");
    }

    return opportunities;
  }

  /**
   * Check for constraint violations
   */
  private checkConstraintViolations(context: SmartRoutingContext): string[] {
    const violations = [];

    if (context.maxLatency < 100) {
      violations.push("Extremely low latency requirement may be unrealistic");
    }

    if (context.minSuccessRate > 99.9) {
      violations.push("Very high success rate requirement may limit routing options");
    }

    if (context.maxCostPerRequest < 0.001) {
      violations.push("Very low cost limit may prevent quality service routing");
    }

    return violations;
  }

  /**
   * Record algorithm performance metrics
   */
  private recordAlgorithmMetrics(algorithmId: string, executionTime: number, success: boolean): void {
    const metrics = this.algorithmMetrics.get(algorithmId) || {
      algorithmId,
      executionTime: 0,
      accuracy: 0,
      confidenceScore: 0,
      decisionQuality: 0,
      adaptationEffectiveness: 0,
      errorMitigation: 0,
      learningProgress: 0,
      computationalEfficiency: 0
    };

    // Update metrics
    metrics.executionTime = (metrics.executionTime + executionTime) / 2; // Moving average
    metrics.accuracy = success ? Math.min(100, metrics.accuracy + 1) : Math.max(0, metrics.accuracy - 1);
    metrics.computationalEfficiency = 1000 / metrics.executionTime; // decisions per second

    this.algorithmMetrics.set(algorithmId, metrics);
  }

  /**
   * Update learning data
   */
  private async updateLearningData(algorithmId: string, data: any): Promise<void> {
    const learningData = this.learningData.get(algorithmId);
    if (!learningData) return;

    // Record success or failure
    if (data.success) {
      learningData.successHistory.push({
        nodeId: data.selectedNode.nodeId,
        context: data.context,
        executionTime: data.executionTime,
        timestamp: new Date()
      });
    } else {
      learningData.failureHistory.push({
        context: data.context,
        error: data.error,
        timestamp: new Date()
      });
    }

    // Limit history size
    if (learningData.successHistory.length > 100) {
      learningData.successHistory.shift();
    }
    if (learningData.failureHistory.length > 50) {
      learningData.failureHistory.shift();
    }

    // Update performance metrics
    const totalOperations = learningData.successHistory.length + learningData.failureHistory.length;
    if (totalOperations > 0) {
      learningData.performanceMetrics.successRate = 
        (learningData.successHistory.length / totalOperations) * 100;
    }

    learningData.lastUpdate = new Date();
  }

  /**
   * Get algorithm metrics
   */
  public getAlgorithmMetrics(algorithmId?: string): Map<string, AlgorithmMetrics> | AlgorithmMetrics | null {
    if (algorithmId) {
      return this.algorithmMetrics.get(algorithmId) || null;
    }
    return new Map(this.algorithmMetrics);
  }

  /**
   * Get learning progress for all algorithms
   */
  public getLearningProgress(): Map<string, any> {
    return new Map(this.learningData);
  }

  /**
   * Optimize algorithm parameters based on learning data
   */
  public async optimizeAlgorithmParameters(): Promise<void> {
    for (const [strategy, algorithm] of this.algorithms) {
      try {
        await this.optimizeIndividualAlgorithm(algorithm);
      } catch (error) {
        logger.error(`Failed to optimize algorithm ${algorithm.algorithmId}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Optimize individual algorithm parameters
   */
  private async optimizeIndividualAlgorithm(algorithm: DecisionAlgorithmConfig): Promise<void> {
    const learningData = this.learningData.get(algorithm.algorithmId);
    if (!learningData || learningData.successHistory.length < 10) {
      return; // Need more data for optimization
    }

    // Analyze performance patterns
    const successRate = learningData.performanceMetrics.successRate;
    
    // Adjust learning rate based on success rate
    if (successRate > 80) {
      algorithm.adaptationSettings.learningRate = Math.min(0.3, algorithm.adaptationSettings.learningRate + 0.01);
    } else if (successRate < 60) {
      algorithm.adaptationSettings.learningRate = Math.max(0.05, algorithm.adaptationSettings.learningRate - 0.01);
    }

    // Adjust exploration rate based on diversity of successful decisions
    const uniqueNodes = new Set(learningData.successHistory.map((h: any) => h.nodeId)).size;
    if (uniqueNodes < 2) {
      algorithm.adaptationSettings.explorationRate = Math.min(0.3, algorithm.adaptationSettings.explorationRate + 0.02);
    }

    logger.debug("Algorithm parameters optimized", {
      algorithmId: algorithm.algorithmId,
      successRate,
      learningRate: algorithm.adaptationSettings.learningRate,
      explorationRate: algorithm.adaptationSettings.explorationRate
    });
  }

  /**
   * Reset learning data for algorithm
   */
  public resetLearningData(algorithmId: string): void {
    const learningData = this.learningData.get(algorithmId);
    if (learningData) {
      learningData.successHistory = [];
      learningData.failureHistory = [];
      learningData.adaptationHistory = [];
      learningData.performanceMetrics = {
        averageExecutionTime: 0,
        averageAccuracy: 0,
        successRate: 0
      };
      learningData.lastUpdate = new Date();
    }
  }

  /**
   * Get decision engine status
   */
  public getEngineStatus(): {
    algorithmsCount: number;
    totalDecisions: number;
    averageExecutionTime: number;
    overallSuccessRate: number;
    learningProgress: number;
  } {
    const totalDecisions = this.decisionHistory.length;
    const avgExecutionTime = Array.from(this.algorithmMetrics.values())
      .reduce((sum, metrics) => sum + metrics.executionTime, 0) / this.algorithmMetrics.size;
    
    const learningDataArray = Array.from(this.learningData.values());
    const overallSuccessRate = learningDataArray.length > 0 ?
      learningDataArray.reduce((sum: number, data: any) => sum + data.performanceMetrics.successRate, 0) / learningDataArray.length : 0;

    return {
      algorithmsCount: this.algorithms.size,
      totalDecisions,
      averageExecutionTime: Math.round(avgExecutionTime),
      overallSuccessRate: Math.round(overallSuccessRate),
      learningProgress: Math.min(100, totalDecisions * 2) // Simplified progress calculation
    };
  }
}

export default RoutingDecisionEngine;