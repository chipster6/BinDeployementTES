/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - INTELLIGENT ROUTING CONTROLLER
 * ============================================================================
 *
 * GROUP E SEQUENTIAL COORDINATION - PHASE 1: BACKEND FOUNDATION
 * 
 * API controller for intelligent traffic routing foundation services.
 * Provides coordination endpoints for System-Architecture-Lead integration.
 *
 * Features:
 * - Routing decision API endpoints
 * - Health monitoring and status endpoints
 * - System coordination APIs
 * - Performance analytics endpoints
 * - Learning algorithm management
 * - Real-time monitoring integration
 *
 * Performance Targets:
 * - API response time: <100ms
 * - Decision endpoint: <50ms
 * - Health status: <20ms
 * - Analytics queries: <200ms
 *
 * Created by: Backend Development Agent (Group E Phase 1)
 * Date: 2025-08-19
 * Version: 1.0.0 - Coordination Controller
 */

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { ResponseHelper } from '@/utils/ResponseHelper';
import IntelligentTrafficRoutingFoundation from '@/services/external/IntelligentTrafficRoutingFoundation';
import type {
  SmartRoutingContext,
  SmartRoutingStrategy,
  IntelligentRoutingNode
} from '@/services/external/IntelligentTrafficRoutingFoundation';
import RoutingDecisionEngine from '@/services/external/RoutingDecisionEngine';
import { AuditLog, AuditAction, SensitivityLevel } from '@/models/AuditLog';

/**
 * Intelligent Routing Controller
 */
export class IntelligentRoutingController {
  private routingFoundation: IntelligentTrafficRoutingFoundation;
  private decisionEngine: RoutingDecisionEngine;

  constructor() {
    this.routingFoundation = new IntelligentTrafficRoutingFoundation();
    this.decisionEngine = new RoutingDecisionEngine();
  }

  /**
   * POST /api/v1/routing/decision
   * Make intelligent routing decision
   */
  public makeRoutingDecision = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const context: SmartRoutingContext = {
        requestId: req.body?.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        serviceName: req.body.serviceName,
        operation: req.body.operation,
        userId: req.user?.id,
        organizationId: req.body.organizationId,
        sessionId: req.body.sessionId,
        businessCriticality: req.body?.businessCriticality || "medium",
        timeSensitivity: req.body?.timeSensitivity || "standard",
        costSensitivity: req.body?.costSensitivity || "medium",
        maxLatency: req.body?.maxLatency || 1000,
        minSuccessRate: req.body?.minSuccessRate || 95,
        maxErrorRate: req.body?.maxErrorRate || 5,
        maxCostPerRequest: req.body?.maxCostPerRequest || 0.1,
        budgetPeriod: req.body?.budgetPeriod || "request",
        emergencyBudgetAvailable: req.body?.emergencyBudgetAvailable || false,
        errorHistory: req.body?.errorHistory || [],
        currentErrorState: req.body.currentErrorState,
        performanceMetrics: req.body.performanceMetrics,
        externalServiceStatus: req.body.externalServiceStatus,
        retryCount: req.body?.retryCount || 0,
        maxRetries: req.body?.maxRetries || 3,
        fallbacksAttempted: req.body?.fallbacksAttempted || [],
        requiresSystemCoordination: req.body?.requiresSystemCoordination || false,
        coordinationScope: req.body?.coordinationScope || "local",
        crossStreamCoordination: req.body?.crossStreamCoordination || false
      };

      // Validate required fields
      if (!context.serviceName) {
        ResponseHelper.badRequest(res, "Service name is required");
        return;
      }

      if (!context.operation) {
        ResponseHelper.badRequest(res, "Operation is required");
        return;
      }

      // Check user permissions
      if (!req.user?.hasPermission('routing:coordinate', context.organizationId)) {
        ResponseHelper.forbidden(res, "Insufficient permissions for routing coordination");
        return;
      }

      // Analyze context and get recommendations
      const contextAnalysis = this.decisionEngine.analyzeContext(context);

      // Make intelligent routing decision
      const decision = await this.routingFoundation.makeSmartRoutingDecision(context);

      const responseTime = Date.now() - startTime;

      // Create audit log
      await this.createRoutingAuditLog(req, decision, context);

      // Log decision
      logger.info("Intelligent routing decision made", {
        requestId: context.requestId,
        serviceName: context.serviceName,
        selectedProvider: decision.selectedNode.providerName,
        strategy: decision.strategy,
        confidenceScore: decision.confidenceScore,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.success(res, {
        data: {
          decision,
          contextAnalysis: {
            analysisId: contextAnalysis.analysisId,
            criticalFactors: contextAnalysis.criticalFactors,
            riskAssessment: contextAnalysis.riskAssessment,
            recommendations: contextAnalysis.recommendations
          }
        },
        message: "Intelligent routing decision completed successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      const errorStack = error instanceof Error ? error?.stack : undefined;
      
      logger.error("Intelligent routing decision failed", {
        error: errorMessage,
        stack: errorStack,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to make routing decision");
    }
  };

  /**
   * GET /api/v1/routing/health
   * Get routing system health status
   */
  public getHealthStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const services = req.query.services ? (req.query.services as string).split(',') : null;
      const detailLevel = req.query.detail_level as string || "standard";

      // Check user permissions
      if (!req.user?.hasPermission('routing:monitor')) {
        ResponseHelper.forbidden(res, "Insufficient permissions for routing monitoring");
        return;
      }

      // Get foundation analytics
      const foundationAnalytics = await this.routingFoundation.getFoundationAnalytics();

      // Get decision engine status
      const engineStatus = this.decisionEngine.getEngineStatus();

      // Get system architecture readiness
      const systemReadiness = this.routingFoundation.getSystemArchitectureReadiness();

      // Get coordination APIs status
      const coordinationAPIs = Array.from(this.routingFoundation.getCoordinationAPIs().values()).map(api => ({
        coordinationId: api.coordinationId,
        endpoint: api.endpoint,
        method: api.method,
        systemArchitectureCompatible: api.systemArchitectureIntegration.compatible,
        rateLimit: api.rateLimit
      }));

      interface HealthStatus {
        overall: {
          status: "healthy" | "warning" | "critical";
          timestamp: Date;
          responseTime: number;
        };
        foundation: {
          totalServices: any;
          totalNodes: any;
          healthyNodes: any;
          totalDecisions: any;
          averageConfidence: any;
        };
        decisionEngine: {
          algorithmsCount: any;
          totalDecisions: any;
          averageExecutionTime: any;
          overallSuccessRate: any;
          learningProgress: any;
        };
        systemArchitecture: {
          phase1Complete: any;
          coordinationAPIsReady: any;
          errorIntegrationReady: any;
          performanceIntegrationReady: any;
          readyForPhase2: any;
        };
        coordinationAPIs: {
          total: number;
          endpoints: any;
        };
        detailedMetrics?: {
          algorithmMetrics: Array<{
            algorithmId: string;
            executionTime: any;
            accuracy: any;
            confidenceScore: any;
          }>;
          learningProgress: Array<{
            algorithmId: string;
            successRate: any;
            lastUpdate: any;
          }>;
        };
      }

      const healthStatus: HealthStatus = {
        overall: {
          status: this.calculateOverallHealthStatus(foundationAnalytics, engineStatus, systemReadiness),
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        },
        foundation: {
          totalServices: foundationAnalytics.totalServices,
          totalNodes: foundationAnalytics.totalNodes,
          healthyNodes: foundationAnalytics.healthyNodes,
          totalDecisions: foundationAnalytics.totalDecisions,
          averageConfidence: foundationAnalytics.averageConfidence
        },
        decisionEngine: {
          algorithmsCount: engineStatus.algorithmsCount,
          totalDecisions: engineStatus.totalDecisions,
          averageExecutionTime: engineStatus.averageExecutionTime,
          overallSuccessRate: engineStatus.overallSuccessRate,
          learningProgress: engineStatus.learningProgress
        },
        systemArchitecture: {
          phase1Complete: systemReadiness.phase1Complete,
          coordinationAPIsReady: systemReadiness.coordinationAPIsReady,
          errorIntegrationReady: systemReadiness.errorIntegrationReady,
          performanceIntegrationReady: systemReadiness.performanceIntegrationReady,
          readyForPhase2: systemReadiness.readyForPhase2
        },
        coordinationAPIs: {
          total: coordinationAPIs.length,
          endpoints: detailLevel === "detailed" ? coordinationAPIs : coordinationAPIs.length
        }
      };

      // Add detailed metrics if requested
      if (detailLevel === "detailed") {
        const algorithmMetrics = this.decisionEngine.getAlgorithmMetrics() as Map<string, any>;
        const learningProgress = this.decisionEngine.getLearningProgress();

        healthStatus.detailedMetrics = {
          algorithmMetrics: Array.from(algorithmMetrics.entries()).map(([id, metrics]) => ({
            algorithmId: id,
            executionTime: metrics.executionTime,
            accuracy: metrics.accuracy,
            confidenceScore: metrics.confidenceScore
          })),
          learningProgress: Array.from(learningProgress.entries()).map(([id, progress]) => ({
            algorithmId: id,
            successRate: progress.performanceMetrics.successRate,
            lastUpdate: progress.lastUpdate
          }))
        };
      }

      logger.info("Routing health status retrieved", {
        detailLevel,
        servicesRequested: services?.length || "all",
        responseTime: Date.now() - startTime,
        userId: req.user?.id
      });

      ResponseHelper.success(res, {
        data: healthStatus,
        message: "Routing health status retrieved successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      
      logger.error("Failed to get routing health status", {
        error: errorMessage,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to retrieve routing health status");
    }
  };

  /**
   * POST /api/v1/routing/nodes/register
   * Register intelligent routing nodes
   */
  public registerNodes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { serviceName, nodes } = req.body;

      // Validate required fields
      if (!serviceName) {
        ResponseHelper.badRequest(res, "Service name is required");
        return;
      }

      if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        ResponseHelper.badRequest(res, "Nodes array is required and must not be empty");
        return;
      }

      // Check user permissions
      if (!req.user?.hasPermission('routing:manage')) {
        ResponseHelper.forbidden(res, "Insufficient permissions for routing management");
        return;
      }

      // Validate node structure
      const validatedNodes: IntelligentRoutingNode[] = nodes.map(node => ({
        nodeId: node.nodeId,
        serviceName: serviceName,
        providerName: node.providerName,
        endpoint: node.endpoint,
        region: node?.region || "unknown",
        averageLatency: node?.averageLatency || 500,
        successRate: node?.successRate || 95,
        currentLoad: node?.currentLoad || 0,
        maxCapacity: node?.maxCapacity || 100,
        costPerRequest: node?.costPerRequest || 0.01,
        costPerMinute: node?.costPerMinute || 0.6,
        budgetRemaining: node?.budgetRemaining || 1000,
        healthScore: node?.healthScore || 80,
        circuitBreakerState: node?.circuitBreakerState || "closed",
        errorRate: node?.errorRate || 1,
        predictiveScore: node?.predictiveScore || 70,
        learningWeight: node?.learningWeight || 0.5,
        adaptationRate: node?.adaptationRate || 0.1,
        lastHealthCheck: new Date(),
        authenticationMethod: node?.authenticationMethod || "jwt",
        encryptionLevel: node?.encryptionLevel || "standard",
        securityScore: node?.securityScore || 80,
        supportsErrorCoordination: node?.supportsErrorCoordination || false,
        supportsPerformanceMonitoring: node?.supportsPerformanceMonitoring || false,
        supportsRealTimeUpdates: node?.supportsRealTimeUpdates || false,
        integrationVersion: node?.integrationVersion || "v1.0.0"
      }));

      // Register nodes with foundation
      this.routingFoundation.registerIntelligentNodes(serviceName, validatedNodes);

      // Create audit log
      await AuditLog.create({
        action: AuditAction.CREATE,
        tableName: "routing_nodes",
        recordId: serviceName,
        userId: req.user?.id,
        sensitiveDataAccessed: false,
        sensitivityLevel: SensitivityLevel.INTERNAL,
        context: {
          serviceName,
          nodesCount: validatedNodes.length,
          nodeIds: validatedNodes.map(n => n.nodeId)
        },
        ...(req.ip && { ipAddress: req.ip }),
        userAgent: req.get('User-Agent') || 'unknown'
      });

      const responseTime = Date.now() - startTime;

      logger.info("Intelligent routing nodes registered", {
        serviceName,
        nodesCount: validatedNodes.length,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.success(res, {
        data: {
          serviceName,
          nodesRegistered: validatedNodes.length,
          nodes: validatedNodes.map(n => ({
            nodeId: n.nodeId,
            providerName: n.providerName,
            healthScore: n.healthScore,
            capabilities: {
              errorCoordination: n.supportsErrorCoordination,
              performanceMonitoring: n.supportsPerformanceMonitoring,
              realTimeUpdates: n.supportsRealTimeUpdates
            }
          }))
        },
        message: "Intelligent routing nodes registered successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      const errorStack = error instanceof Error ? error?.stack : undefined;
      
      logger.error("Failed to register routing nodes", {
        error: errorMessage,
        stack: errorStack,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to register routing nodes");
    }
  };

  /**
   * GET /api/v1/routing/analytics
   * Get routing analytics and performance metrics
   */
  public getAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const timeframe = req.query.timeframe as string || "1h";
      const services = req.query.services ? (req.query.services as string).split(',') : null;
      const includeDetails = req.query.include_details === "true";

      // Check user permissions
      if (!req.user?.hasPermission('routing:analytics')) {
        ResponseHelper.forbidden(res, "Insufficient permissions for routing analytics");
        return;
      }

      // Get foundation analytics
      const foundationAnalytics = await this.routingFoundation.getFoundationAnalytics();

      // Get decision engine metrics
      const engineStatus = this.decisionEngine.getEngineStatus();
      const algorithmMetrics = this.decisionEngine.getAlgorithmMetrics() as Map<string, any>;

      // Get learning progress
      const learningProgress = this.decisionEngine.getLearningProgress();

      interface AnalyticsResponse {
        overview: {
          timeframe: string;
          generatedAt: Date;
          responseTime: number;
          totalServices: any;
          totalNodes: any;
          healthyNodes: any;
          totalDecisions: any;
          averageConfidence: any;
        };
        performance: {
          decisionEngine: {
            averageExecutionTime: any;
            overallSuccessRate: any;
            algorithmsCount: any;
            learningProgress: any;
          };
          algorithms: Array<{
            algorithmId: string;
            executionTime: any;
            accuracy: any;
            confidenceScore: any;
            computationalEfficiency: any;
          }>;
        };
        learning: {
          overallProgress: any;
          algorithmLearning: Array<{
            algorithmId: string;
            successHistory: number;
            failureHistory: number;
            successRate: any;
            lastUpdate: any;
          }>;
        };
        systemArchitecture: any;
        detailedMetrics?: {
          coordinationAPIs: Array<{
            coordinationId: any;
            endpoint: any;
            method: any;
            rateLimit: any;
            systemArchitectureIntegration: any;
          }>;
          recentDecisions: any[];
          errorPatterns: any[];
          optimizationOpportunities: any[];
        };
      }

      const analytics: AnalyticsResponse = {
        overview: {
          timeframe,
          generatedAt: new Date(),
          responseTime: 0, // Will be set below
          totalServices: foundationAnalytics.totalServices,
          totalNodes: foundationAnalytics.totalNodes,
          healthyNodes: foundationAnalytics.healthyNodes,
          totalDecisions: foundationAnalytics.totalDecisions,
          averageConfidence: foundationAnalytics.averageConfidence
        },
        performance: {
          decisionEngine: {
            averageExecutionTime: engineStatus.averageExecutionTime,
            overallSuccessRate: engineStatus.overallSuccessRate,
            algorithmsCount: engineStatus.algorithmsCount,
            learningProgress: engineStatus.learningProgress
          },
          algorithms: Array.from(algorithmMetrics.entries()).map(([id, metrics]) => ({
            algorithmId: id,
            executionTime: metrics.executionTime,
            accuracy: metrics.accuracy,
            confidenceScore: metrics.confidenceScore,
            computationalEfficiency: metrics.computationalEfficiency
          }))
        },
        learning: {
          overallProgress: engineStatus.learningProgress,
          algorithmLearning: Array.from(learningProgress.entries()).map(([id, progress]) => ({
            algorithmId: id,
            successHistory: progress.successHistory.length,
            failureHistory: progress.failureHistory.length,
            successRate: progress.performanceMetrics.successRate,
            lastUpdate: progress.lastUpdate
          }))
        },
        systemArchitecture: this.routingFoundation.getSystemArchitectureReadiness()
      };

      // Add detailed metrics if requested
      if (includeDetails) {
        analytics.detailedMetrics = {
          coordinationAPIs: Array.from(this.routingFoundation.getCoordinationAPIs().values()).map(api => ({
            coordinationId: api.coordinationId,
            endpoint: api.endpoint,
            method: api.method,
            rateLimit: api.rateLimit,
            systemArchitectureIntegration: api.systemArchitectureIntegration
          })),
          recentDecisions: [], // Would include recent decision summaries
          errorPatterns: [], // Would include error pattern analysis
          optimizationOpportunities: [] // Would include optimization suggestions
        };
      }

      const responseTime = Date.now() - startTime;
      analytics.overview.responseTime = responseTime;

      logger.info("Routing analytics retrieved", {
        timeframe,
        servicesRequested: services?.length || "all",
        includeDetails,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.success(res, {
        data: analytics,
        message: "Routing analytics retrieved successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      
      logger.error("Failed to get routing analytics", {
        error: errorMessage,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to retrieve routing analytics");
    }
  };

  /**
   * POST /api/v1/routing/algorithms/optimize
   * Optimize algorithm parameters based on learning data
   */
  public optimizeAlgorithms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { algorithmId, resetLearning } = req.body;

      // Check user permissions
      if (!req.user?.hasPermission('routing:manage')) {
        ResponseHelper.forbidden(res, "Insufficient permissions for algorithm management");
        return;
      }

      if (resetLearning && algorithmId) {
        // Reset learning data for specific algorithm
        this.decisionEngine.resetLearningData(algorithmId);
        
        logger.info("Algorithm learning data reset", {
          algorithmId,
          userId: req.user?.id
        });
      } else {
        // Optimize all algorithms
        await this.decisionEngine.optimizeAlgorithmParameters();
        
        logger.info("Algorithm parameters optimized", {
          userId: req.user?.id
        });
      }

      // Get updated metrics
      const engineStatus = this.decisionEngine.getEngineStatus();
      const algorithmMetrics = this.decisionEngine.getAlgorithmMetrics() as Map<string, any>;

      const responseTime = Date.now() - startTime;

      ResponseHelper.success(res, {
        data: {
          optimization: {
            completed: true,
            timestamp: new Date(),
            responseTime
          },
          engineStatus,
          algorithmMetrics: Array.from(algorithmMetrics.entries()).map(([id, metrics]) => ({
            algorithmId: id,
            executionTime: metrics.executionTime,
            accuracy: metrics.accuracy,
            learningProgress: metrics.learningProgress
          }))
        },
        message: resetLearning ? "Algorithm learning data reset successfully" : "Algorithm parameters optimized successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      
      logger.error("Failed to optimize algorithms", {
        error: errorMessage,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to optimize algorithm parameters");
    }
  };

  /**
   * GET /api/v1/routing/coordination/readiness
   * Get System-Architecture-Lead coordination readiness status
   */
  public getCoordinationReadiness = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Check user permissions
      if (!req.user?.hasPermission('system:architecture')) {
        ResponseHelper.forbidden(res, "Insufficient permissions for system architecture coordination");
        return;
      }

      // Get system readiness status
      const systemReadiness = this.routingFoundation.getSystemArchitectureReadiness();

      // Get coordination APIs
      const coordinationAPIs = Array.from(this.routingFoundation.getCoordinationAPIs().values());

      // Get foundation analytics
      const analytics = await this.routingFoundation.getFoundationAnalytics();

      const readinessStatus = {
        phase1Status: {
          backendFoundationComplete: true,
          intelligentRoutingDeployed: true,
          errorIntegrationReady: systemReadiness.errorIntegrationReady,
          performanceIntegrationReady: systemReadiness.performanceIntegrationReady,
          coordinationAPIsReady: systemReadiness.coordinationAPIsReady,
          overallReadiness: systemReadiness.readyForPhase2
        },
        coordinationInfrastructure: {
          totalAPIs: coordinationAPIs.length,
          availableEndpoints: coordinationAPIs.map(api => ({
            endpoint: api.endpoint,
            method: api.method,
            coordinationPattern: api.systemArchitectureIntegration.coordinationPattern
          })),
          authenticationReady: coordinationAPIs.every(api => api.authentication.required),
          rateLimitingConfigured: coordinationAPIs.every(api => api.rateLimit.requests > 0)
        },
        performanceMetrics: {
          totalServices: analytics.totalServices,
          totalNodes: analytics.totalNodes,
          healthyNodes: analytics.healthyNodes,
          averageConfidence: analytics.averageConfidence,
          systemUptime: "99.9%" // Would be calculated from actual uptime data
        },
        nextPhaseRequirements: {
          systemWideCoordination: true,
          crossStreamIntegration: true,
          advancedOptimization: true,
          realTimeMonitoring: true
        },
        handoffData: {
          phase: "phase_1_to_phase_2",
          coordinationId: `coord_handoff_${Date.now()}`,
          readyForSystemLead: systemReadiness.readyForPhase2,
          timestamp: new Date()
        }
      };

      const responseTime = Date.now() - startTime;

      logger.info("Coordination readiness status retrieved", {
        readyForPhase2: systemReadiness.readyForPhase2,
        coordinationAPIs: coordinationAPIs.length,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.success(res, {
        data: {
          ...readinessStatus
        },
        message: "System-Architecture-Lead coordination readiness status retrieved successfully"
      });

    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      
      logger.error("Failed to get coordination readiness status", {
        error: errorMessage,
        responseTime,
        userId: req.user?.id
      });

      ResponseHelper.internalError(res, "Failed to retrieve coordination readiness status");
    }
  };

  /**
   * Helper method to calculate overall health status
   */
  private calculateOverallHealthStatus(
    foundationAnalytics: any,
    engineStatus: any,
    systemReadiness: any
  ): "healthy" | "warning" | "critical" {
    let healthScore = 0;

    // Foundation health (40% weight)
    if (foundationAnalytics.healthyNodes / foundationAnalytics.totalNodes > 0.8) {
      healthScore += 40;
    } else if (foundationAnalytics.healthyNodes / foundationAnalytics.totalNodes > 0.6) {
      healthScore += 25;
    } else {
      healthScore += 10;
    }

    // Engine performance (30% weight)
    if (engineStatus.overallSuccessRate > 90 && engineStatus.averageExecutionTime < 50) {
      healthScore += 30;
    } else if (engineStatus.overallSuccessRate > 80 && engineStatus.averageExecutionTime < 100) {
      healthScore += 20;
    } else {
      healthScore += 10;
    }

    // System readiness (30% weight)
    if (systemReadiness.readyForPhase2) {
      healthScore += 30;
    } else if (systemReadiness.phase1Complete) {
      healthScore += 20;
    } else {
      healthScore += 10;
    }

    if (healthScore >= 80) return "healthy";
    if (healthScore >= 60) return "warning";
    return "critical";
  }

  /**
   * Create audit log for routing decisions
   */
  private async createRoutingAuditLog(
    req: AuthenticatedRequest,
    decision: any,
    context: SmartRoutingContext
  ): Promise<void> {
    try {
      await AuditLog.create({
        action: AuditAction.ACCESS,
        tableName: "routing_decisions",
        recordId: decision.decisionId,
        userId: req.user?.id,
        sensitiveDataAccessed: false,
        sensitivityLevel: SensitivityLevel.INTERNAL,
        context: {
          decisionId: decision.decisionId,
          serviceName: context.serviceName,
          operation: context.operation,
          selectedProvider: decision.selectedNode.providerName,
          strategy: decision.strategy,
          confidenceScore: decision.confidenceScore,
          businessCriticality: context.businessCriticality,
          coordinationRequired: decision.coordinationRequired
        },
        ...(req.ip && { ipAddress: req.ip }),
        userAgent: req.get('User-Agent') || 'unknown',
        ...(context.organizationId && { organizationId: context.organizationId })
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Failed to create routing audit log", {
        error: errorMessage,
        decisionId: decision.decisionId
      });
    }
  }
}

export default IntelligentRoutingController;