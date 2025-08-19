/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COST MONITORING API ROUTES
 * ============================================================================
 *
 * API routes for comprehensive cost monitoring dashboard, budget tracking,
 * and cost optimization across all 6 external services.
 *
 * Endpoints:
 * - GET /api/external/cost/analytics - Get cost analytics and trends
 * - POST /api/external/cost/budgets - Create cost budget
 * - GET /api/external/cost/budgets/:organizationId - Get organization budgets
 * - POST /api/external/cost/alerts - Create cost alert
 * - GET /api/external/cost/real-time - Get real-time cost data
 * - GET /api/external/cost/providers/comparison - Get provider cost comparison
 * - POST /api/external/cost/record - Record API call cost (internal)
 * - GET /api/external/cost/reports - Generate cost reports
 *
 * Created by: External-API-Integration-Specialist
 * Date: 2025-08-19
 * Version: 1.0.0 - Phase 2 External API Completion
 */

import { Router, Request, Response } from "express";
import { auth } from "@/middleware/auth";
import { validation } from "@/middleware/validation";
import { rateLimit } from "@/middleware/rateLimit";
import { logger, Timer } from "@/utils/logger";
import { ResponseHelper } from "@/utils/ResponseHelper";
import CostMonitoringDashboardService, {
  APICallCost,
  CostBudget,
  CostAlert,
  CostAnalytics
} from "@/services/external/CostMonitoringDashboardService";

const router = Router();

// Initialize cost monitoring service
const costMonitoringService = new CostMonitoringDashboardService();

/**
 * =============================================================================
 * COST ANALYTICS ENDPOINTS
 * =============================================================================
 */

/**
 * Get comprehensive cost analytics
 * GET /api/external/cost/analytics
 */
router.get("/analytics", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.getAnalytics');
  
  try {
    const {
      organizationId,
      startDate,
      endDate,
      granularity,
      services
    } = req.query;

    // Validate required parameters
    if (!organizationId) {
      return ResponseHelper.badRequest(res, "organizationId is required");
    }

    // Parse date range
    const timeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: endDate ? new Date(endDate as string) : new Date()
    };

    // Validate date range
    if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
      return ResponseHelper.badRequest(res, "Invalid date format");
    }

    if (timeRange.start >= timeRange.end) {
      return ResponseHelper.badRequest(res, "Start date must be before end date");
    }

    // Get cost analytics
    const analyticsResult = await costMonitoringService.getCostAnalytics(
      organizationId as string,
      timeRange,
      (granularity as any) || "day"
    );

    if (!analyticsResult.success) {
      return ResponseHelper.internalError(res, analyticsResult.message!);
    }

    const executionTime = timer.end({
      organizationId,
      timeRangeDays: Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)),
      granularity: granularity || "day"
    });

    logger.info('Cost analytics retrieved', {
      organizationId,
      timeRange,
      totalCost: analyticsResult.data!.totals.totalCost,
      totalRequests: analyticsResult.data!.totals.totalRequests,
      executionTime
    });

    return ResponseHelper.success(res, {
      analytics: analyticsResult.data,
      timeRange,
      metadata: {
        executionTime,
        dataFreshness: "5-minute-cache",
        servicesIncluded: services ? (services as string).split(',') : ["all"]
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error retrieving cost analytics', {
      error: error.message,
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve cost analytics");
  }
});

/**
 * Get real-time cost data
 * GET /api/external/cost/real-time
 */
router.get("/real-time", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.getRealTimeData');
  
  try {
    const { organizationId, services } = req.query;

    if (!organizationId) {
      return ResponseHelper.badRequest(res, "organizationId is required");
    }

    // Parse services
    const requestedServices = services ? (services as string).split(',') : undefined;

    // Get real-time cost data
    const realTimeResult = await costMonitoringService.getRealTimeCostData(
      organizationId as string,
      requestedServices
    );

    if (!realTimeResult.success) {
      return ResponseHelper.internalError(res, realTimeResult.message!);
    }

    const executionTime = timer.end({
      organizationId,
      servicesQueried: requestedServices?.length || 6
    });

    logger.debug('Real-time cost data retrieved', {
      organizationId,
      servicesQueried: requestedServices?.length || 6,
      executionTime
    });

    return ResponseHelper.success(res, {
      realTimeData: realTimeResult.data,
      timestamp: new Date(),
      metadata: {
        executionTime,
        dataFreshness: "real-time",
        servicesQueried: requestedServices || ["graphhopper", "google_maps", "mapbox", "twilio", "sendgrid", "stripe"]
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error retrieving real-time cost data', {
      error: error.message,
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve real-time cost data");
  }
});

/**
 * Get provider cost comparison
 * GET /api/external/cost/providers/comparison
 */
router.get("/providers/comparison", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.getProviderComparison');
  
  try {
    const {
      service,
      startDate,
      endDate
    } = req.query;

    if (!service) {
      return ResponseHelper.badRequest(res, "service is required");
    }

    // Parse date range
    const timeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: endDate ? new Date(endDate as string) : new Date()
    };

    // Validate date range
    if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
      return ResponseHelper.badRequest(res, "Invalid date format");
    }

    // Get provider comparison
    const comparisonResult = await costMonitoringService.getProviderCostComparison(
      service as string,
      timeRange
    );

    if (!comparisonResult.success) {
      return ResponseHelper.internalError(res, comparisonResult.message!);
    }

    const executionTime = timer.end({
      service,
      timeRangeDays: Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
    });

    logger.info('Provider cost comparison retrieved', {
      service,
      timeRange,
      providersCompared: comparisonResult.data!.providers.length,
      potentialSavings: comparisonResult.data!.recommendations.potentialSavings,
      executionTime
    });

    return ResponseHelper.success(res, {
      comparison: comparisonResult.data,
      timeRange,
      metadata: {
        executionTime,
        analysisDepth: "comprehensive"
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error retrieving provider cost comparison', {
      error: error.message,
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve provider cost comparison");
  }
});

/**
 * =============================================================================
 * BUDGET MANAGEMENT ENDPOINTS
 * =============================================================================
 */

/**
 * Create cost budget
 * POST /api/external/cost/budgets
 */
router.post("/budgets", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.createBudget');
  
  try {
    const budgetData = {
      ...req.body,
      createdBy: (req as any).user.userId
    };

    // Validate required fields
    if (!budgetData.organizationId || !budgetData.service || !budgetData.amount) {
      return ResponseHelper.badRequest(res, "organizationId, service, and amount are required");
    }

    // Validate budget amount
    if (budgetData.amount <= 0) {
      return ResponseHelper.badRequest(res, "Budget amount must be positive");
    }

    // Validate budget type
    const validBudgetTypes = ["daily", "weekly", "monthly", "yearly"];
    if (!validBudgetTypes.includes(budgetData.budgetType)) {
      return ResponseHelper.badRequest(res, "Invalid budget type");
    }

    // Create budget
    const budgetResult = await costMonitoringService.createCostBudget(budgetData);

    if (!budgetResult.success) {
      return ResponseHelper.badRequest(res, budgetResult.message!);
    }

    const executionTime = timer.end({
      organizationId: budgetData.organizationId,
      service: budgetData.service,
      amount: budgetData.amount,
      budgetType: budgetData.budgetType
    });

    logger.info('Cost budget created', {
      budgetId: budgetResult.data!.id,
      organizationId: budgetData.organizationId,
      service: budgetData.service,
      amount: budgetData.amount,
      budgetType: budgetData.budgetType,
      createdBy: budgetData.createdBy,
      executionTime
    });

    return ResponseHelper.success(res, {
      budget: budgetResult.data,
      message: "Budget created successfully",
      metadata: {
        executionTime,
        createdBy: budgetData.createdBy
      }
    }, 201);

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error creating cost budget', {
      error: error.message,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to create cost budget");
  }
});

/**
 * Get organization budgets
 * GET /api/external/cost/budgets/:organizationId
 */
router.get("/budgets/:organizationId", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.getOrganizationBudgets');
  
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return ResponseHelper.badRequest(res, "organizationId is required");
    }

    // Get organization budgets
    const budgetsResult = await costMonitoringService.getOrganizationBudgets(organizationId);

    if (!budgetsResult.success) {
      return ResponseHelper.internalError(res, budgetsResult.message!);
    }

    const executionTime = timer.end({
      organizationId,
      budgetCount: budgetsResult.data!.length
    });

    logger.info('Organization budgets retrieved', {
      organizationId,
      budgetCount: budgetsResult.data!.length,
      executionTime
    });

    return ResponseHelper.success(res, {
      budgets: budgetsResult.data,
      organizationId,
      metadata: {
        executionTime,
        budgetCount: budgetsResult.data!.length
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error retrieving organization budgets', {
      error: error.message,
      organizationId: req.params.organizationId
    });
    
    return ResponseHelper.internalError(res, "Failed to retrieve organization budgets");
  }
});

/**
 * =============================================================================
 * ALERT MANAGEMENT ENDPOINTS
 * =============================================================================
 */

/**
 * Create cost alert
 * POST /api/external/cost/alerts
 */
router.post("/alerts", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.createAlert');
  
  try {
    const alertData = req.body;

    // Validate required fields
    if (!alertData.organizationId || !alertData.alertType) {
      return ResponseHelper.badRequest(res, "organizationId and alertType are required");
    }

    // Validate alert type
    const validAlertTypes = ["budget_threshold", "cost_spike", "anomaly", "quota_exceeded"];
    if (!validAlertTypes.includes(alertData.alertType)) {
      return ResponseHelper.badRequest(res, "Invalid alert type");
    }

    // Create alert
    const alertResult = await costMonitoringService.createCostAlert(alertData);

    if (!alertResult.success) {
      return ResponseHelper.badRequest(res, alertResult.message!);
    }

    const executionTime = timer.end({
      organizationId: alertData.organizationId,
      alertType: alertData.alertType
    });

    logger.info('Cost alert created', {
      alertId: alertResult.data!.id,
      organizationId: alertData.organizationId,
      alertType: alertData.alertType,
      executionTime
    });

    return ResponseHelper.success(res, {
      alert: alertResult.data,
      message: "Alert created successfully",
      metadata: {
        executionTime
      }
    }, 201);

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error creating cost alert', {
      error: error.message,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to create cost alert");
  }
});

/**
 * =============================================================================
 * INTERNAL API ENDPOINTS
 * =============================================================================
 */

/**
 * Record API call cost (internal endpoint)
 * POST /api/external/cost/record
 */
router.post("/record", auth, validation, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.recordCost');
  
  try {
    const costData: APICallCost = req.body;

    // Validate cost data
    if (!costData.service || !costData.cost || !costData.organizationId) {
      return ResponseHelper.badRequest(res, "service, cost, and organizationId are required");
    }

    // Add metadata
    costData.id = `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    costData.timestamp = new Date();
    costData.currency = "USD";

    // Record cost
    const recordResult = await costMonitoringService.recordAPICallCost(costData);

    if (!recordResult.success) {
      return ResponseHelper.internalError(res, recordResult.message!);
    }

    const executionTime = timer.end({
      service: costData.service,
      cost: costData.cost,
      organizationId: costData.organizationId
    });

    logger.debug('API call cost recorded', {
      costId: costData.id,
      service: costData.service,
      cost: costData.cost,
      organizationId: costData.organizationId,
      executionTime
    });

    return ResponseHelper.success(res, {
      costId: costData.id,
      recorded: true,
      message: "Cost data recorded successfully",
      metadata: {
        executionTime
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error recording API call cost', {
      error: error.message,
      body: req.body
    });
    
    return ResponseHelper.internalError(res, "Failed to record cost data");
  }
});

/**
 * =============================================================================
 * REPORTING ENDPOINTS
 * =============================================================================
 */

/**
 * Generate cost reports
 * GET /api/external/cost/reports
 */
router.get("/reports", auth, rateLimit, async (req: Request, res: Response) => {
  const timer = new Timer('CostMonitoringAPI.generateReports');
  
  try {
    const {
      organizationId,
      reportType,
      startDate,
      endDate,
      format
    } = req.query;

    if (!organizationId || !reportType) {
      return ResponseHelper.badRequest(res, "organizationId and reportType are required");
    }

    // Validate report type
    const validReportTypes = ["summary", "detailed", "trends", "comparison", "budget_analysis"];
    if (!validReportTypes.includes(reportType as string)) {
      return ResponseHelper.badRequest(res, "Invalid report type");
    }

    // Parse date range
    const timeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date()
    };

    // Generate report based on type
    const report = await generateCostReport(
      organizationId as string,
      reportType as string,
      timeRange,
      format as string || "json"
    );

    const executionTime = timer.end({
      organizationId,
      reportType,
      format: format || "json"
    });

    logger.info('Cost report generated', {
      organizationId,
      reportType,
      format: format || "json",
      timeRange,
      executionTime
    });

    return ResponseHelper.success(res, {
      report,
      reportType,
      timeRange,
      metadata: {
        executionTime,
        format: format || "json",
        generatedAt: new Date()
      }
    });

  } catch (error) {
    timer.end({ error: error.message });
    logger.error('Error generating cost report', {
      error: error.message,
      query: req.query
    });
    
    return ResponseHelper.internalError(res, "Failed to generate cost report");
  }
});

/**
 * =============================================================================
 * HELPER FUNCTIONS
 * =============================================================================
 */

/**
 * Generate cost report based on type
 */
async function generateCostReport(
  organizationId: string,
  reportType: string,
  timeRange: { start: Date; end: Date },
  format: string
): Promise<any> {
  // Get analytics data
  const analyticsResult = await costMonitoringService.getCostAnalytics(
    organizationId,
    timeRange,
    "day"
  );

  if (!analyticsResult.success) {
    throw new Error("Failed to retrieve analytics for report");
  }

  const analytics = analyticsResult.data!;

  switch (reportType) {
    case "summary":
      return {
        type: "summary",
        organization: organizationId,
        timeRange,
        summary: {
          totalCost: analytics.totals.totalCost,
          totalRequests: analytics.totals.totalRequests,
          averageCostPerRequest: analytics.totals.averageCostPerRequest,
          projectedMonthlyCost: analytics.totals.projectedMonthlyCost,
          topService: analytics.serviceBreakdown[0]?.service || "none",
          budgetStatus: analytics.budgetStatus.length > 0 ? analytics.budgetStatus[0].status : "ok"
        }
      };

    case "detailed":
      return {
        type: "detailed",
        organization: organizationId,
        timeRange,
        analytics
      };

    case "trends":
      return {
        type: "trends",
        organization: organizationId,
        timeRange,
        trends: analytics.costTrends,
        serviceBreakdown: analytics.serviceBreakdown
      };

    case "comparison":
      return {
        type: "comparison",
        organization: organizationId,
        timeRange,
        serviceComparison: analytics.serviceBreakdown,
        recommendations: analytics.recommendations
      };

    case "budget_analysis":
      return {
        type: "budget_analysis",
        organization: organizationId,
        timeRange,
        budgets: analytics.budgetStatus,
        recommendations: analytics.recommendations.filter(r => r.type === "budget_adjustment")
      };

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

export default router;