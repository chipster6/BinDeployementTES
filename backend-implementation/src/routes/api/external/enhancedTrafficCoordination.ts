/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ENHANCED TRAFFIC COORDINATION API ROUTES
 * ============================================================================
 *
 * API routes for enhanced traffic routing coordination with Backend Agent integration:
 * - Enhanced traffic routing coordination endpoints
 * - Backend Agent error system integration
 * - Real-time coordination monitoring and analytics
 * - Business-critical provider management
 * - Advanced optimization and decision tracking
 *
 * Features:
 * - Comprehensive coordination with Backend Agent error systems
 * - Multi-dimensional routing optimization (cost, performance, reliability)
 * - Real-time health monitoring and predictive analytics
 * - Business impact assessment and revenue protection
 * - Emergency mode activation with budget override capabilities
 *
 * Created by: System Architecture Lead
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import express from 'express';
import { auth } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { 
  EnhancedTrafficRoutingCoordinator,
  EnhancedCoordinationContext,
  EnhancedCoordinationResult
} from '@/services/external/EnhancedTrafficRoutingCoordinator';
import { 
  IntelligentTrafficRoutingService,
  RoutingStrategy
} from '@/services/external/IntelligentTrafficRoutingService';
import type { RoutingDecisionContext } from '@/services/external/IntelligentTrafficRoutingService';
import { 
  ErrorScenarioOptimizationService,
  ErrorScenarioType,
  OptimizationStrategy
} from '@/services/external/ErrorScenarioOptimizationService';
import type { ErrorScenarioContext } from '@/services/external/ErrorScenarioOptimizationService';
import { 
  FallbackStrategyManager,
  ServicePriority,
  BusinessCriticality 
} from '@/services/external/FallbackStrategyManager';

const router = express.Router();

/**
 * Initialize services (would be injected in real application)
 */
let enhancedCoordinator: EnhancedTrafficRoutingCoordinator;
let routingService: IntelligentTrafficRoutingService;
let optimizationService: ErrorScenarioOptimizationService;
let fallbackManager: FallbackStrategyManager;

// Initialize services
const initializeServices = () => {
  if (!enhancedCoordinator) {
    fallbackManager = new FallbackStrategyManager();
    routingService = new IntelligentTrafficRoutingService(fallbackManager, {} as any);
    optimizationService = new ErrorScenarioOptimizationService(
      fallbackManager,
      routingService,
      {} as any,
      {} as any
    );
    enhancedCoordinator = new EnhancedTrafficRoutingCoordinator(
      routingService,
      optimizationService,
      fallbackManager
    );
  }
};

/**
 * POST /api/external/enhanced-traffic-coordination/execute-coordination
 * Execute enhanced traffic routing coordination with Backend Agent integration
 */
router.post('/execute-coordination', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      serviceName,
      operation,
      routingContext,
      errorScenarioContext,
      backendAgentContext,
      businessContext,
      coordinationRequirements,
      metadata
    } = req.body;

    // Validate required fields
    if (!serviceName || !operation || !routingContext) {
      return ResponseHelper.error(res, req, { message: 'Service name, operation, and routing context are required', statusCode: 400 });
    }

    // Create enhanced coordination context
    const coordinationContext: EnhancedCoordinationContext = {
      coordinationId: `coordination_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      serviceName,
      operation,
      routingContext: {
        serviceName,
        operation,
        requestMetadata: {
          requestId: routingContext.requestMetadata?.requestId || `req_${Date.now()}`,
          userId: routingContext.requestMetadata?.userId || req.user?.id,
          organizationId: routingContext.requestMetadata?.organizationId || req.user?.organizationId,
          clientRegion: routingContext.requestMetadata?.clientRegion,
          priority: routingContext.requestMetadata?.priority || ServicePriority.MEDIUM,
          businessCriticality: routingContext.requestMetadata?.businessCriticality || BusinessCriticality.CUSTOMER_FACING,
          retryCount: routingContext.requestMetadata?.retryCount || 0,
          maxRetries: routingContext.requestMetadata?.maxRetries || 3
        },
        errorHistory: {
          recentErrors: routingContext.errorHistory?.recentErrors || [],
          failurePatterns: routingContext.errorHistory?.failurePatterns || []
        },
        budgetConstraints: {
          remainingBudget: routingContext.budgetConstraints?.remainingBudget || 1000,
          costPerRequestLimit: routingContext.budgetConstraints?.costPerRequestLimit || 0.1,
          budgetPeriod: routingContext.budgetConstraints?.budgetPeriod || "daily"
        },
        performanceContext: {
          currentLatency: routingContext.performanceContext?.currentLatency || 500,
          targetLatency: routingContext.performanceContext?.targetLatency || 300,
          currentThroughput: routingContext.performanceContext?.currentThroughput || 100,
          targetThroughput: routingContext.performanceContext?.targetThroughput || 200
        }
      },
      errorScenarioContext: errorScenarioContext ? {
        scenarioId: errorScenarioContext?.scenarioId || `scenario_${Date.now()}`,
        scenarioType: errorScenarioContext.scenarioType as ErrorScenarioType,
        serviceName,
        operation,
        severity: errorScenarioContext.severity,
        businessImpact: {
          revenueAtRisk: errorScenarioContext.businessImpact?.revenueAtRisk || 0,
          customerImpact: errorScenarioContext.businessImpact?.customerImpact || "none",
          operationalImpact: errorScenarioContext.businessImpact?.operationalImpact || "none",
          timeToResolution: errorScenarioContext.businessImpact?.timeToResolution || 30
        },
        errorDetails: {
          originalError: new Error(errorScenarioContext.errorDetails?.originalError || "Unknown error"),
          failedProviders: errorScenarioContext.errorDetails?.failedProviders || [],
          retryAttempts: errorScenarioContext.errorDetails?.retryAttempts || 0,
          errorPattern: errorScenarioContext.errorDetails?.errorPattern || "unknown",
          cascadingServices: errorScenarioContext.errorDetails?.cascadingServices || []
        },
        budgetConstraints: {
          remainingBudget: errorScenarioContext.budgetConstraints?.remainingBudget || 1000,
          maxAllowableCost: errorScenarioContext.budgetConstraints?.maxAllowableCost || 0.1,
          budgetPeriod: errorScenarioContext.budgetConstraints?.budgetPeriod || "daily",
          emergencyBudgetAvailable: errorScenarioContext.budgetConstraints?.emergencyBudgetAvailable || false
        },
        performanceRequirements: {
          maxLatency: errorScenarioContext.performanceRequirements?.maxLatency || 1000,
          minThroughput: errorScenarioContext.performanceRequirements?.minThroughput || 100,
          minSuccessRate: errorScenarioContext.performanceRequirements?.minSuccessRate || 95
        },
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        timestamp: new Date(),
        priority: metadata?.priority || ServicePriority.MEDIUM,
        businessCriticality: metadata?.businessCriticality || BusinessCriticality.CUSTOMER_FACING
      } : undefined,
      backendAgentContext: {
        errorStreamId: backendAgentContext?.errorStreamId || `stream_${Date.now()}`,
        recoveryStrategyId: backendAgentContext?.recoveryStrategyId,
        monitoringSessionId: backendAgentContext?.monitoringSessionId,
        crossStreamCoordinationId: backendAgentContext?.crossStreamCoordinationId
      },
      businessContext: {
        revenueImpact: businessContext?.revenueImpact || 0,
        customerImpact: businessContext?.customerImpact || "none",
        operationalPriority: businessContext?.operationalPriority || "medium",
        timeSensitivity: businessContext?.timeSensitivity || "standard"
      },
      coordinationRequirements: {
        requireBackendAgentSync: coordinationRequirements?.requireBackendAgentSync || false,
        requireRealTimeMonitoring: coordinationRequirements?.requireRealTimeMonitoring || false,
        requirePredictiveAnalytics: coordinationRequirements?.requirePredictiveAnalytics || false,
        requireEmergencyOverride: coordinationRequirements?.requireEmergencyOverride || false
      },
      metadata: {
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        sessionId: metadata?.sessionId
      }
    };

    // Execute enhanced coordination
    const coordinationResult = await enhancedCoordinator.executeEnhancedCoordination(coordinationContext);

    logger.info('Enhanced traffic coordination executed successfully', {
      coordinationId: coordinationResult.coordinationId,
      serviceName,
      selectedProvider: coordinationResult.routingDecision.selectedNode.providerName,
      coordinationTime: coordinationResult.performanceMetrics.totalCoordinationTime,
      backendIntegrated: coordinationResult.backendAgentIntegration.errorStreamRegistered,
      userId: req.user?.id
    });

    ResponseHelper.success(res, coordinationResult, 'Enhanced traffic coordination completed successfully');

  } catch (error: unknown) {
    logger.error('Enhanced traffic coordination failed', {
      error: error instanceof Error ? error?.message : String(error),
      serviceName: req.body.serviceName,
      userId: req.user?.id,
      body: req.body
    });
    ResponseHelper.error(res, req, { message: 'Failed to execute enhanced traffic coordination', statusCode: 500 });
  }
});

/**
 * POST /api/external/enhanced-traffic-coordination/backend-agent-error
 * Handle Backend Agent error event through enhanced coordination
 */
router.post('/backend-agent-error', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      errorType,
      serviceName,
      operation,
      severity,
      errorMessage,
      businessImpact,
      errorDetails,
      streamId,
      recoveryStrategyId,
      monitoringSessionId
    } = req.body;

    // Validate required fields
    if (!errorType || !serviceName || !severity) {
      return ResponseHelper.error(res, req, { message: 'Error type, service name, and severity are required', statusCode: 400 });
    }

    // Create coordination context from Backend Agent error
    const coordinationContext: EnhancedCoordinationContext = {
      coordinationId: `backend_error_coordination_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      serviceName,
      operation: operation || "error_handling",
      routingContext: {
        serviceName,
        operation: operation || "error_handling",
        requestMetadata: {
          requestId: `backend_error_${Date.now()}`,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          priority: severity === "critical" ? ServicePriority.CRITICAL : ServicePriority.HIGH,
          businessCriticality: BusinessCriticality.CUSTOMER_FACING,
          retryCount: errorDetails?.retryAttempts || 0,
          maxRetries: 3
        },
        errorHistory: {
          recentErrors: errorDetails?.recentErrors || [],
          failurePatterns: errorDetails?.failurePatterns || [errorType]
        },
        budgetConstraints: {
          remainingBudget: 1000,
          costPerRequestLimit: severity === "critical" ? 0.5 : 0.1,
          budgetPeriod: "daily"
        },
        performanceContext: {
          currentLatency: 1000, // Assume degraded
          targetLatency: 300,
          currentThroughput: 0.5, // Assume reduced
          targetThroughput: 100
        }
      },
      errorScenarioContext: {
        scenarioId: `backend_error_scenario_${Date.now()}`,
        scenarioType: this.mapErrorTypeToScenarioType(errorType),
        serviceName,
        operation: operation || "error_handling",
        severity: severity,
        businessImpact: {
          revenueAtRisk: businessImpact?.revenueAtRisk || 0,
          customerImpact: businessImpact?.customerImpact || "moderate",
          operationalImpact: businessImpact?.operationalImpact || "significant",
          timeToResolution: businessImpact?.timeToResolution || 15
        },
        errorDetails: {
          originalError: new Error(errorMessage || "Backend Agent error"),
          failedProviders: errorDetails?.failedProviders || [],
          retryAttempts: errorDetails?.retryAttempts || 0,
          errorPattern: errorType,
          cascadingServices: errorDetails?.cascadingServices || []
        },
        budgetConstraints: {
          remainingBudget: 1000,
          maxAllowableCost: severity === "critical" ? 0.5 : 0.1,
          budgetPeriod: "daily",
          emergencyBudgetAvailable: severity === "critical"
        },
        performanceRequirements: {
          maxLatency: severity === "critical" ? 500 : 1000,
          minThroughput: 100,
          minSuccessRate: severity === "critical" ? 99 : 95
        }`,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          timestamp: new Date(),
          priority: severity === "critical" ? ServicePriority.CRITICAL : ServicePriority.HIGH,
          businessCriticality: BusinessCriticality.CUSTOMER_FACING
        }
      },
      backendAgentContext: {
        errorStreamId: streamId || `stream_${Date.now()}`,
        recoveryStrategyId,
        monitoringSessionId,
        crossStreamCoordinationId: `cross_stream_${Date.now()}`
      },
      businessContext: {
        revenueImpact: businessImpact?.revenueAtRisk || 0,
        customerImpact: businessImpact?.customerImpact || "moderate",
        operationalPriority: severity === "critical" ? "critical" : "high",
        timeSensitivity: severity === "critical" ? "immediate" : "urgent"
      },
      coordinationRequirements: {
        requireBackendAgentSync: true,
        requireRealTimeMonitoring: true,
        requirePredictiveAnalytics: severity === "critical",
        requireEmergencyOverride: severity === "critical"
      },
      metadata: {
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      }
    };

    // Execute coordination for Backend Agent error
    const coordinationResult = await enhancedCoordinator.executeEnhancedCoordination(coordinationContext);

    logger.info('Backend Agent error handled through enhanced coordination', {
      coordinationId: coordinationResult.coordinationId,
      errorType,
      serviceName,
      severity,
      selectedProvider: coordinationResult.routingDecision.selectedNode.providerName,
      userId: req.user?.id
    });

    ResponseHelper.success(res, {
      coordinationResult,
      backendAgentResponse: {
        errorHandled: true,
        coordinationId: coordinationResult.coordinationId,
        recoveryStrategy: coordinationResult.optimizationDecision?.selectedStrategy,
        estimatedResolutionTime: coordinationResult.monitoringPlan.reviewInterval
      }
    }, 'Backend Agent error handled successfully');

  } catch (error: unknown) {
    logger.error('Backend Agent error handling failed', {
      error: error instanceof Error ? error?.message : String(error),
      errorType: req.body.errorType,
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to handle Backend Agent error', statusCode: 500 });
  }
});

/**
 * GET /api/external/enhanced-traffic-coordination/coordination-analytics
 * Get comprehensive coordination analytics
 */
router.get('/coordination-analytics', auth, async (req, res) => {
  try {
    initializeServices();
    
    const analytics = await enhancedCoordinator.getCoordinationAnalytics();

    ResponseHelper.success(res, analytics, 'Coordination analytics retrieved successfully');

  } catch (error: unknown) {
    logger.error('Failed to get coordination analytics', {
      error: error instanceof Error ? error?.message : String(error),
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to retrieve coordination analytics', statusCode: 500 });
  }
});

/**
 * GET /api/external/enhanced-traffic-coordination/active-coordinations
 * Get currently active coordinations
 */
router.get('/active-coordinations', auth, async (req, res) => {
  try {
    initializeServices();
    
    const activeCoordinations = enhancedCoordinator.getActiveCoordinations();
    const coordinationsArray = Array.from(activeCoordinations.entries()).map(([id, context]) => ({
      coordinationId: id,
      ...context
    }));

    ResponseHelper.success(res, {
      count: coordinationsArray.length,
      coordinations: coordinationsArray
    }, 'Active coordinations retrieved successfully');

  } catch (error: unknown) {
    logger.error('Failed to get active coordinations', {
      error: error instanceof Error ? error?.message : String(error),
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to retrieve active coordinations', statusCode: 500 });
  }
});

/**
 * GET /api/external/enhanced-traffic-coordination/backend-agent-connections
 * Get Backend Agent connection status
 */
router.get('/backend-agent-connections', auth, async (req, res) => {
  try {
    initializeServices();
    
    const connections = enhancedCoordinator.getBackendAgentConnections();
    const connectionsArray = Array.from(connections.entries()).map(([id, connection]) => ({
      coordinationId: id,
      ...connection
    }));

    ResponseHelper.success(res, {
      count: connectionsArray.length,
      connections: connectionsArray,
      integrationStatus: {
        errorStreamIntegrations: connectionsArray.filter(c => c.errorStreamId).length,
        recoveryStrategyConnections: connectionsArray.filter(c => c.recoveryStrategyId).length,
        monitoringSessionConnections: connectionsArray.filter(c => c.monitoringSessionId).length
      }
    }, 'Backend Agent connections retrieved successfully');

  } catch (error: unknown) {
    logger.error('Failed to get Backend Agent connections', {
      error: error instanceof Error ? error?.message : String(error),
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to retrieve Backend Agent connections', statusCode: 500 });
  }
});

/**
 * POST /api/external/enhanced-traffic-coordination/emergency-override
 * Activate emergency coordination mode with budget override
 */
router.post('/emergency-override', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      serviceName,
      operation,
      emergencyReason,
      maxBudgetOverride,
      durationMinutes,
      businessJustification
    } = req.body;

    // Validate required fields
    if (!serviceName || !emergencyReason || !businessJustification) {
      return ResponseHelper.error(res, req, { message: 'Service name, emergency reason, and business justification are required', statusCode: 400 });
    }

    // Create emergency coordination context
    const emergencyContext: EnhancedCoordinationContext = {
      coordinationId: `emergency_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      serviceName,
      operation: operation || "emergency_override",
      routingContext: {
        serviceName,
        operation: operation || "emergency_override",
        requestMetadata: {
          requestId: `emergency_${Date.now()}`,
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          priority: ServicePriority.CRITICAL,
          businessCriticality: BusinessCriticality.REVENUE_BLOCKING,
          retryCount: 0,
          maxRetries: 5
        },
        errorHistory: {
          recentErrors: [],
          failurePatterns: ["emergency_scenario"]
        },
        budgetConstraints: {
          remainingBudget: maxBudgetOverride || 10000,
          costPerRequestLimit: maxBudgetOverride || 1.0,
          budgetPeriod: "emergency"
        },
        performanceContext: {
          currentLatency: 2000,
          targetLatency: 100,
          currentThroughput: 0.1,
          targetThroughput: 1000
        }
      },
      errorScenarioContext: {
        scenarioId: `emergency_scenario_${Date.now()}`,
        scenarioType: ErrorScenarioType.EMERGENCY_SCENARIO,
        serviceName,
        operation: operation || "emergency_override",
        severity: "critical",
        businessImpact: {
          revenueAtRisk: maxBudgetOverride || 10000,
          customerImpact: "severe",
          operationalImpact: "significant",
          timeToResolution: durationMinutes || 60
        },
        errorDetails: {
          originalError: new Error(emergencyReason),
          failedProviders: [],
          retryAttempts: 0,
          errorPattern: "emergency_override",
          cascadingServices: []
        },
        budgetConstraints: {
          remainingBudget: maxBudgetOverride || 10000,
          maxAllowableCost: maxBudgetOverride || 1.0,
          budgetPeriod: "emergency",
          emergencyBudgetAvailable: true
        },
        performanceRequirements: {
          maxLatency: 100,
          minThroughput: 1000,
          minSuccessRate: 99.9
        },
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        timestamp: new Date(),
        priority: ServicePriority.CRITICAL,
        businessCriticality: BusinessCriticality.REVENUE_BLOCKING
      },
      backendAgentContext: {
        errorStreamId: `emergency_stream_${Date.now()}`,
        recoveryStrategyId: "emergency_recovery",
        monitoringSessionId: `emergency_monitoring_${Date.now()}`,
        crossStreamCoordinationId: `emergency_coordination_${Date.now()}`
      },
      businessContext: {
        revenueImpact: maxBudgetOverride || 10000,
        customerImpact: "severe",
        operationalPriority: "critical",
        timeSensitivity: "immediate"
      },
      coordinationRequirements: {
        requireBackendAgentSync: true,
        requireRealTimeMonitoring: true,
        requirePredictiveAnalytics: true,
        requireEmergencyOverride: true
      },
      metadata: {
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      }
    };

    // Execute emergency coordination
    const coordinationResult = await enhancedCoordinator.executeEnhancedCoordination(emergencyContext);

    // Log emergency activation
    logger.warn('Emergency coordination mode activated', {
      coordinationId: coordinationResult.coordinationId,
      serviceName,
      emergencyReason,
      maxBudgetOverride: maxBudgetOverride || 10000,
      businessJustification,
      userId: req.user?.id
    });

    ResponseHelper.success(res, {
      coordinationResult,
      emergencyStatus: {
        activated: true,
        coordinationId: coordinationResult.coordinationId,
        maxBudgetOverride: maxBudgetOverride || 10000,
        durationMinutes: durationMinutes || 60,
        estimatedCost: coordinationResult.routingDecision.estimatedCost,
        selectedProvider: coordinationResult.routingDecision.selectedNode.providerName
      }
    }, 'Emergency coordination mode activated successfully');

  } catch (error: unknown) {
    logger.error('Emergency override activation failed', {
      error: error instanceof Error ? error?.message : String(error),
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to activate emergency coordination mode', statusCode: 500 });
  }
});

/**
 * GET /api/external/enhanced-traffic-coordination/performance-metrics/:serviceName
 * Get performance metrics for a specific service
 */
router.get('/performance-metrics/:serviceName', auth, async (req, res) => {
  try {
    initializeServices();
    
    const { serviceName } = req.params;
    const { timeframe } = req.query;

    if (!serviceName) {
      return ResponseHelper.error(res, req, { message: 'Service name is required', statusCode: 400 });
    }

    // Get service-specific analytics (this would typically fetch from the analytics cache)
    const analytics = await enhancedCoordinator.getCoordinationAnalytics();
    
    // Filter for specific service (simplified for this example)
    const serviceMetrics = {
      serviceName,
      timeframe: timeframe || "1h",
      performanceMetrics: {
        averageCoordinationTime: analytics.averageCoordinationTime,
        successRate: (analytics.successfulCoordinations / Math.max(1, analytics.totalCoordinations)) * 100,
        backendIntegrationRate: analytics.backendIntegrationRate,
        costOptimization: analytics.totalCostSavings / Math.max(1, analytics.totalCoordinations)
      },
      businessImpact: {
        totalCostSavings: analytics.totalCostSavings,
        coordinationsHandled: analytics.totalCoordinations,
        emergencyModeActivations: 0, // Would track from actual data
        averageResolutionTime: analytics.averageCoordinationTime / 60000 // Convert to minutes
      },
      systemHealth: {
        activeCoordinations: enhancedCoordinator.getActiveCoordinations().size,
        backendConnections: enhancedCoordinator.getBackendAgentConnections().size,
        lastUpdate: new Date()
      }
    };

    ResponseHelper.success(res, serviceMetrics, 'Performance metrics retrieved successfully');

  } catch (error: unknown) {
    logger.error('Failed to get performance metrics', {
      error: error instanceof Error ? error?.message : String(error),
      serviceName: req.params.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, req, { message: 'Failed to retrieve performance metrics', statusCode: 500 });
  }
});

/**
 * GET /api/external/enhanced-traffic-coordination/health
 * Health check endpoint for enhanced coordination services
 */
router.get('/health', (req, res) => {
  try {
    initializeServices();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        enhancedCoordinator: 'operational',
        routingService: 'operational',
        optimizationService: 'operational',
        fallbackManager: 'operational'
      },
      backendAgentIntegration: {
        crossStreamCoordinator: 'operational',
        recoveryService: 'operational',
        monitoringService: 'operational'
      },
      activeCoordinations: enhancedCoordinator?.getActiveCoordinations()?.size || 0,
      backendConnections: enhancedCoordinator?.getBackendAgentConnections()?.size || 0
    };

    ResponseHelper.success(res, healthStatus, 'Enhanced coordination services are healthy');

  } catch (error: unknown) {
    logger.error('Enhanced coordination health check failed', {
      error: error instanceof Error ? error?.message : String(error)
    });
    ResponseHelper.error(res, req, { message: 'Health check failed', statusCode: 500 });
  }
});

/**
 * Utility function to map error types to scenario types
 */
function mapErrorTypeToScenarioType(errorType: string): ErrorScenarioType {
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

export default router;