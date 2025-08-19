/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR OPTIMIZATION API ROUTES
 * ============================================================================
 *
 * API routes for error scenario optimization and intelligent traffic routing:
 * - Error scenario handling endpoints
 * - Traffic routing optimization controls
 * - Cost-aware fallback management
 * - Real-time optimization monitoring
 * - Analytics and reporting endpoints
 *
 * Features:
 * - Comprehensive error scenario management
 * - Intelligent routing decision APIs
 * - Budget-aware fallback controls
 * - Real-time optimization monitoring
 * - Performance analytics and insights
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import express from 'express';
import { auth } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { 
  IntelligentTrafficRoutingService,
  RoutingStrategy,
  RoutingDecisionContext 
} from '@/services/external/IntelligentTrafficRoutingService';
import { 
  CostAwareFallbackService,
  CostControlStrategy 
} from '@/services/external/CostAwareFallbackService';
import { 
  ErrorScenarioOptimizationService,
  ErrorScenarioType,
  OptimizationStrategy,
  ErrorScenarioContext 
} from '@/services/external/ErrorScenarioOptimizationService';
import { 
  FallbackStrategyManager,
  ServicePriority,
  BusinessCriticality 
} from '@/services/external/FallbackStrategyManager';

const router = express.Router();

/**
 * Initialize services (would be injected in real application)
 */
let optimizationService: ErrorScenarioOptimizationService;
let routingService: IntelligentTrafficRoutingService;
let costService: CostAwareFallbackService;
let fallbackManager: FallbackStrategyManager;

// Initialize services
const initializeServices = () => {
  if (!optimizationService) {
    fallbackManager = new FallbackStrategyManager();
    routingService = new IntelligentTrafficRoutingService(fallbackManager, {} as any);
    costService = new CostAwareFallbackService(fallbackManager, routingService);
    optimizationService = new ErrorScenarioOptimizationService(
      fallbackManager,
      routingService,
      costService,
      {} as any
    );
  }
};

/**
 * POST /api/external/error-optimization/handle-scenario
 * Handle error scenario with comprehensive optimization
 */
router.post('/handle-scenario', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      scenarioType,
      serviceName,
      operation,
      severity,
      businessImpact,
      errorDetails,
      budgetConstraints,
      performanceRequirements,
      metadata
    } = req.body;

    // Validate required fields
    if (!scenarioType || !serviceName || !operation || !severity) {
      return ResponseHelper.error(res, 'Missing required fields', 400);
    }

    // Create error scenario context
    const scenarioContext: ErrorScenarioContext = {
      scenarioId: `scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      scenarioType: scenarioType as ErrorScenarioType,
      serviceName,
      operation,
      severity,
      businessImpact: {
        revenueAtRisk: businessImpact?.revenueAtRisk || 0,
        customerImpact: businessImpact?.customerImpact || "none",
        operationalImpact: businessImpact?.operationalImpact || "none",
        timeToResolution: businessImpact?.timeToResolution || 30
      },
      errorDetails: {
        originalError: new Error(errorDetails?.originalError || "Unknown error"),
        failedProviders: errorDetails?.failedProviders || [],
        retryAttempts: errorDetails?.retryAttempts || 0,
        errorPattern: errorDetails?.errorPattern || "unknown",
        cascadingServices: errorDetails?.cascadingServices || []
      },
      budgetConstraints: {
        remainingBudget: budgetConstraints?.remainingBudget || 1000,
        maxAllowableCost: budgetConstraints?.maxAllowableCost || 0.1,
        budgetPeriod: budgetConstraints?.budgetPeriod || "daily",
        emergencyBudgetAvailable: budgetConstraints?.emergencyBudgetAvailable || false
      },
      performanceRequirements: {
        maxLatency: performanceRequirements?.maxLatency || 1000,
        minThroughput: performanceRequirements?.minThroughput || 100,
        minSuccessRate: performanceRequirements?.minSuccessRate || 95
      },
      metadata: {
        requestId: metadata?.requestId || `req_${Date.now()}`,
        userId: metadata?.userId || req.user?.id,
        organizationId: metadata?.organizationId || req.user?.organizationId,
        clientRegion: metadata?.clientRegion,
        timestamp: new Date(),
        priority: metadata?.priority || ServicePriority.MEDIUM,
        businessCriticality: metadata?.businessCriticality || BusinessCriticality.CUSTOMER_FACING
      }
    };

    // Handle the error scenario
    const optimizationDecision = await optimizationService.handleErrorScenario(scenarioContext);

    logger.info('Error scenario handled successfully', {
      scenarioId: scenarioContext.scenarioId,
      serviceName,
      strategy: optimizationDecision.selectedStrategy,
      userId: req.user?.id
    });

    ResponseHelper.success(res, optimizationDecision, 'Error scenario optimization completed');

  } catch (error) {
    logger.error('Error scenario handling failed', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });
    ResponseHelper.error(res, 'Failed to handle error scenario', 500);
  }
});

/**
 * POST /api/external/error-optimization/routing-decision
 * Make intelligent routing decision
 */
router.post('/routing-decision', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      serviceName,
      operation,
      requestMetadata,
      errorHistory,
      budgetConstraints,
      performanceContext
    } = req.body;

    // Validate required fields
    if (!serviceName || !operation) {
      return ResponseHelper.error(res, 'Service name and operation are required', 400);
    }

    // Create routing decision context
    const routingContext: RoutingDecisionContext = {
      serviceName,
      operation,
      requestMetadata: {
        requestId: requestMetadata?.requestId || `req_${Date.now()}`,
        userId: requestMetadata?.userId || req.user?.id,
        organizationId: requestMetadata?.organizationId || req.user?.organizationId,
        clientRegion: requestMetadata?.clientRegion,
        priority: requestMetadata?.priority || ServicePriority.MEDIUM,
        businessCriticality: requestMetadata?.businessCriticality || BusinessCriticality.CUSTOMER_FACING,
        retryCount: requestMetadata?.retryCount || 0,
        maxRetries: requestMetadata?.maxRetries || 3
      },
      errorHistory: {
        recentErrors: errorHistory?.recentErrors || [],
        failurePatterns: errorHistory?.failurePatterns || []
      },
      budgetConstraints: {
        remainingBudget: budgetConstraints?.remainingBudget || 1000,
        costPerRequestLimit: budgetConstraints?.costPerRequestLimit || 0.1,
        budgetPeriod: budgetConstraints?.budgetPeriod || "daily"
      },
      performanceContext: {
        currentLatency: performanceContext?.currentLatency || 500,
        targetLatency: performanceContext?.targetLatency || 300,
        currentThroughput: performanceContext?.currentThroughput || 100,
        targetThroughput: performanceContext?.targetThroughput || 200
      }
    };

    // Make routing decision
    const routingDecision = await routingService.makeRoutingDecision(routingContext);

    logger.info('Routing decision completed', {
      serviceName,
      selectedNode: routingDecision.selectedNode.nodeId,
      strategy: routingDecision.routingStrategy,
      userId: req.user?.id
    });

    ResponseHelper.success(res, routingDecision, 'Routing decision completed');

  } catch (error) {
    logger.error('Routing decision failed', {
      error: error.message,
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to make routing decision', 500);
  }
});

/**
 * POST /api/external/error-optimization/cost-aware-fallback
 * Execute cost-aware fallback decision
 */
router.post('/cost-aware-fallback', auth, async (req, res) => {
  try {
    initializeServices();
    
    const {
      serviceName,
      operation,
      originalRequest,
      error,
      metadata,
      businessContext
    } = req.body;

    // Validate required fields
    if (!serviceName || !operation) {
      return ResponseHelper.error(res, 'Service name and operation are required', 400);
    }

    // Create fallback context
    const fallbackContext = {
      serviceName,
      operation,
      originalRequest: originalRequest || {},
      error: new Error(error?.message || "Unknown error"),
      metadata: {
        requestId: metadata?.requestId || `req_${Date.now()}`,
        userId: metadata?.userId || req.user?.id,
        organizationId: metadata?.organizationId || req.user?.organizationId,
        timestamp: new Date(),
        retryCount: metadata?.retryCount || 0,
        maxRetries: metadata?.maxRetries || 3
      },
      businessContext: {
        urgency: businessContext?.urgency || "medium",
        customerFacing: businessContext?.customerFacing || false,
        revenueImpacting: businessContext?.revenueImpacting || false
      }
    };

    // Make cost-aware fallback decision
    const costDecision = await costService.makeCostAwareFallbackDecision(fallbackContext);

    logger.info('Cost-aware fallback decision completed', {
      serviceName,
      selectedProvider: costDecision.selectedProvider.providerId,
      cost: costDecision.selectedProvider.costPerRequest,
      userId: req.user?.id
    });

    ResponseHelper.success(res, costDecision, 'Cost-aware fallback decision completed');

  } catch (error) {
    logger.error('Cost-aware fallback decision failed', {
      error: error.message,
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to make cost-aware fallback decision', 500);
  }
});

/**
 * GET /api/external/error-optimization/routing-analytics/:serviceName
 * Get routing analytics for a service
 */
router.get('/routing-analytics/:serviceName', auth, async (req, res) => {
  try {
    initializeServices();
    
    const { serviceName } = req.params;

    if (!serviceName) {
      return ResponseHelper.error(res, 'Service name is required', 400);
    }

    const analytics = await routingService.getRoutingAnalytics(serviceName);

    ResponseHelper.success(res, analytics, 'Routing analytics retrieved');

  } catch (error) {
    logger.error('Failed to get routing analytics', {
      error: error.message,
      serviceName: req.params.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve routing analytics', 500);
  }
});

/**
 * GET /api/external/error-optimization/cost-monitoring/:serviceName
 * Get cost monitoring data for a service
 */
router.get('/cost-monitoring/:serviceName', auth, async (req, res) => {
  try {
    initializeServices();
    
    const { serviceName } = req.params;

    if (!serviceName) {
      return ResponseHelper.error(res, 'Service name is required', 400);
    }

    const costData = await costService.getCostMonitoringData(serviceName);

    ResponseHelper.success(res, costData, 'Cost monitoring data retrieved');

  } catch (error) {
    logger.error('Failed to get cost monitoring data', {
      error: error.message,
      serviceName: req.params.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve cost monitoring data', 500);
  }
});

/**
 * GET /api/external/error-optimization/optimization-analytics
 * Get comprehensive optimization analytics
 */
router.get('/optimization-analytics', auth, async (req, res) => {
  try {
    initializeServices();
    
    const analytics = await optimizationService.getOptimizationAnalytics();

    ResponseHelper.success(res, analytics, 'Optimization analytics retrieved');

  } catch (error) {
    logger.error('Failed to get optimization analytics', {
      error: error.message,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve optimization analytics', 500);
  }
});

/**
 * GET /api/external/error-optimization/active-scenarios
 * Get currently active error scenarios
 */
router.get('/active-scenarios', auth, async (req, res) => {
  try {
    initializeServices();
    
    const activeScenarios = optimizationService.getActiveScenarios();
    const scenariosArray = Array.from(activeScenarios.entries()).map(([id, context]) => ({
      scenarioId: id,
      ...context
    }));

    ResponseHelper.success(res, {
      count: scenariosArray.length,
      scenarios: scenariosArray
    }, 'Active scenarios retrieved');

  } catch (error) {
    logger.error('Failed to get active scenarios', {
      error: error.message,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve active scenarios', 500);
  }
});

/**
 * GET /api/external/error-optimization/cost-report
 * Get comprehensive cost report for all services
 */
router.get('/cost-report', auth, async (req, res) => {
  try {
    initializeServices();
    
    const costReport = await costService.getCostReport();

    ResponseHelper.success(res, costReport, 'Cost report generated');

  } catch (error) {
    logger.error('Failed to generate cost report', {
      error: error.message,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to generate cost report', 500);
  }
});

/**
 * GET /api/external/error-optimization/system-status
 * Get overall system status for routing and optimization
 */
router.get('/system-status', auth, async (req, res) => {
  try {
    initializeServices();
    
    const routingStatus = routingService.getSystemStatus();
    const activeScenarios = optimizationService.getActiveScenarios();
    
    const systemStatus = {
      routing: routingStatus,
      activeScenarios: {
        count: activeScenarios.size,
        criticalScenarios: Array.from(activeScenarios.values())
          .filter(scenario => scenario.severity === "critical").length
      },
      lastUpdate: new Date()
    };

    ResponseHelper.success(res, systemStatus, 'System status retrieved');

  } catch (error) {
    logger.error('Failed to get system status', {
      error: error.message,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve system status', 500);
  }
});

/**
 * POST /api/external/error-optimization/register-traffic-distribution
 * Register new traffic distribution configuration
 */
router.post('/register-traffic-distribution', auth, async (req, res) => {
  try {
    initializeServices();
    
    const { serviceName, distribution } = req.body;

    if (!serviceName || !distribution) {
      return ResponseHelper.error(res, 'Service name and distribution configuration are required', 400);
    }

    // Validate distribution configuration
    if (!distribution.strategy || !distribution.nodes || !Array.isArray(distribution.nodes)) {
      return ResponseHelper.error(res, 'Invalid distribution configuration', 400);
    }

    // Register the traffic distribution
    routingService.registerTrafficDistribution(serviceName, distribution);

    logger.info('Traffic distribution registered', {
      serviceName,
      strategy: distribution.strategy,
      nodeCount: distribution.nodes.length,
      userId: req.user?.id
    });

    ResponseHelper.success(res, { serviceName, registered: true }, 'Traffic distribution registered');

  } catch (error) {
    logger.error('Failed to register traffic distribution', {
      error: error.message,
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to register traffic distribution', 500);
  }
});

/**
 * POST /api/external/error-optimization/register-budget-allocation
 * Register budget allocation for a service
 */
router.post('/register-budget-allocation', auth, async (req, res) => {
  try {
    initializeServices();
    
    const { serviceName, allocation } = req.body;

    if (!serviceName || !allocation) {
      return ResponseHelper.error(res, 'Service name and budget allocation are required', 400);
    }

    // Validate allocation configuration
    if (!allocation.totalBudget || !allocation.budgetPeriod || !allocation.costTiers) {
      return ResponseHelper.error(res, 'Invalid budget allocation configuration', 400);
    }

    // Register the budget allocation
    costService.registerBudgetAllocation(serviceName, allocation);

    logger.info('Budget allocation registered', {
      serviceName,
      totalBudget: allocation.totalBudget,
      budgetPeriod: allocation.budgetPeriod,
      userId: req.user?.id
    });

    ResponseHelper.success(res, { serviceName, registered: true }, 'Budget allocation registered');

  } catch (error) {
    logger.error('Failed to register budget allocation', {
      error: error.message,
      serviceName: req.body.serviceName,
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to register budget allocation', 500);
  }
});

/**
 * GET /api/external/error-optimization/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        routing: 'operational',
        costManagement: 'operational',
        optimization: 'operational',
        fallbackManager: 'operational'
      }
    };

    ResponseHelper.success(res, healthStatus, 'Error optimization services are healthy');

  } catch (error) {
    logger.error('Health check failed', {
      error: error.message
    });
    ResponseHelper.error(res, 'Health check failed', 500);
  }
});

export default router;