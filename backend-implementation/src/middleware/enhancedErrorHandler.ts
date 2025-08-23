/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ENHANCED ERROR HANDLER INTEGRATION
 * ============================================================================
 *
 * Enhanced error handler that integrates all advanced error handling services
 * with the existing middleware infrastructure. Provides seamless coordination
 * between error orchestration, monitoring, recovery, analytics, classification,
 * and cross-system propagation management.
 *
 * Features:
 * - Seamless integration with existing errorHandler middleware
 * - Automatic error orchestration and recovery strategy execution
 * - Real-time error monitoring and analytics integration
 * - Advanced error classification with security threat detection
 * - Cross-system error propagation management
 * - Production-ready error recovery with business impact awareness
 * - Service mesh coordination for distributed error handling
 * - Comprehensive error analytics and reporting
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-15
 * Version: 2.0.0
 */

import type { Request, Response, NextFunction } from "express";
import { AppError, errorHandler, gracefulDegradation } from "./errorHandler";
import { errorRecoveryMiddleware } from "./errorRecoveryMiddleware";
import { errorOrchestration } from "@/services/ErrorOrchestrationService";
import { errorMonitoring } from "@/services/ErrorMonitoringService";
import { productionErrorRecovery } from "@/services/ProductionErrorRecoveryService";
import { crossSystemErrorPropagation } from "@/services/CrossSystemErrorPropagationService";
import { errorAnalyticsDashboard } from "@/services/ErrorAnalyticsDashboardService";
import { advancedErrorClassification } from "@/services/AdvancedErrorClassificationService";
import { enterpriseErrorRecoveryStrategies } from "@/services/EnterpriseErrorRecoveryStrategiesService";
import { logger, logError, logSecurityEvent, logAuditEvent } from "@/utils/logger";
import { config } from "@/config";

/**
 * Enhanced error handling configuration
 */
interface EnhancedErrorConfig {
  enableOrchestration: boolean;
  enableAdvancedClassification: boolean;
  enableProductionRecovery: boolean;
  enableCrossSystemPropagation: boolean;
  enableServiceMeshCoordination: boolean;
  enableRealTimeAnalytics: boolean;
  enableSecurityThreatDetection: boolean;
  businessImpactThreshold: string;
  autoRecoveryEnabled: boolean;
  escalationEnabled: boolean;
}

/**
 * Enhanced error context
 */
interface EnhancedErrorContext {
  requestId: string;
  userId?: string;
  organizationId?: string;
  ip: string;
  userAgent?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  businessContext?: {
    urgency: "low" | "medium" | "high" | "critical";
    customerFacing: boolean;
    revenueImpacting: boolean;
    complianceRequired: boolean;
  };
  systemContext?: {
    currentLoad: number;
    availableCapacity: number;
    healthScore: number;
    recentErrors: number;
  };
}

/**
 * Enhanced error processing result
 */
interface EnhancedErrorResult {
  errorId: string;
  classificationId: string;
  orchestrationId?: string;
  recoveryExecuted: boolean;
  recoveryStrategy?: string;
  businessImpactAssessment: any;
  securityThreatDetected: boolean;
  crossSystemImpact: boolean;
  analyticsRecorded: boolean;
  escalated: boolean;
  processingTime: number;
}

/**
 * Enhanced error handler class
 */
class EnhancedErrorHandler {
  private config: EnhancedErrorConfig;
  private processingQueue: Map<string, Promise<any>> = new Map();
  private readonly maxConcurrentProcessing = 10;

  constructor() {
    this.config = {
      enableOrchestration: config.errorHandling?.orchestration?.enabled ?? true,
      enableAdvancedClassification: config.errorHandling?.classification?.enabled ?? true,
      enableProductionRecovery: config.errorHandling?.production?.enabled ?? true,
      enableCrossSystemPropagation: config.errorHandling?.crossSystem?.enabled ?? true,
      enableServiceMeshCoordination: config.errorHandling?.serviceMesh?.enabled ?? true,
      enableRealTimeAnalytics: config.errorHandling?.analytics?.enabled ?? true,
      enableSecurityThreatDetection: config.errorHandling?.security?.enabled ?? true,
      businessImpactThreshold: config.errorHandling?.businessImpactThreshold ?? "medium",
      autoRecoveryEnabled: config.errorHandling?.autoRecovery?.enabled ?? true,
      escalationEnabled: config.errorHandling?.escalation?.enabled ?? true
    };
  }

  /**
   * Main enhanced error handling middleware
   */
  public middleware = async (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    const processingStartTime = Date.now();
    const context = this.buildErrorContext(req);
    
    logger.info("ENHANCED ERROR PROCESSING INITIATED", {
      errorMessage: error instanceof Error ? error?.message : String(error),
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method
    });

    try {
      // Check processing queue capacity
      if (this.processingQueue.size >= this.maxConcurrentProcessing) {
        logger.warn("Error processing queue at capacity, using basic handling", {
          queueSize: this.processingQueue.size,
          requestId: context.requestId
        });
        return await this.executeBasicErrorHandling(error, req, res, next);
      }

      // Add to processing queue
      const processingPromise = this.processEnhancedError(error, context, req, res);
      this.processingQueue.set(context.requestId, processingPromise);

      try {
        const result = await processingPromise;
        
        logger.info("ENHANCED ERROR PROCESSING COMPLETED", {
          requestId: context.requestId,
          errorId: result.errorId,
          processingTime: result.processingTime,
          recoveryExecuted: result.recoveryExecuted,
          securityThreatDetected: result.securityThreatDetected
        });

        // Send enhanced error response
        await this.sendEnhancedErrorResponse(error, result, context, res);

      } finally {
        this.processingQueue.delete(context.requestId);
      }

    } catch (processingError) {
      logger.error("ENHANCED ERROR PROCESSING FAILED", {
        requestId: context.requestId,
        processingError: processingError?.message,
        originalError: error instanceof Error ? error?.message : String(error)
      });

      // Fallback to basic error handling
      await this.executeBasicErrorHandling(error, req, res, next);
    }
  };

  /**
   * Process enhanced error with all services
   */
  private async processEnhancedError(
    error: any,
    context: EnhancedErrorContext,
    req: Request,
    res: Response
  ): Promise<EnhancedErrorResult> {
    const startTime = Date.now();
    let appError = error instanceof AppError ? error : new AppError(error instanceof Error ? error?.message : String(error), error?.statusCode || 500);
    
    // Initialize result
    const result: EnhancedErrorResult = {
      errorId: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classificationId: "",
      recoveryExecuted: false,
      businessImpactAssessment: null,
      securityThreatDetected: false,
      crossSystemImpact: false,
      analyticsRecorded: false,
      escalated: false,
      processingTime: 0
    };

    try {
      // 1. Advanced Error Classification (if enabled)
      if (this.config.enableAdvancedClassification) {
        const classification = await advancedErrorClassification.classifyError(appError, {
          userId: context.userId,
          ip: context.ip,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          requestPath: context.endpoint,
          requestBody: req.body,
          headers: req.headers as Record<string, string>
        });
        
        result.classificationId = classification.classificationId;
        result.securityThreatDetected = classification.securityThreat.level !== "none";
        result.businessImpactAssessment = classification.businessRisk;

        // Update error with classification insights
        if (classification.primaryCategory) {
          appError.code = `${appError?.code || "UNKNOWN"}_${classification.primaryCategory}`;
        }
      }

      // 2. Cross-System Error Propagation Analysis (if enabled)
      if (this.config.enableCrossSystemPropagation) {
        const propagationEvent = await crossSystemErrorPropagation.handleCrossSystemError(
          appError,
          this.determineSystemLayer(appError),
          {
            operationType: `${context.method}_${context.endpoint}`,
            affectedResources: [context.endpoint]
          }
        );
        
        result.crossSystemImpact = propagationEvent.targetSystems.length > 0;
      }

      // 3. Error Orchestration (if enabled)
      if (this.config.enableOrchestration) {
        const orchestrationResult = await errorOrchestration.orchestrateError(appError, {
          systemLayer: this.determineSystemLayer(appError),
          businessImpact: this.determineBusinessImpact(appError, context.businessContext),
          customerFacing: context.businessContext?.customerFacing ?? true,
          revenueImpacting: context.businessContext?.revenueImpacting ?? false,
          requestContext: {
            userId: context.userId,
            organizationId: context.organizationId,
            ip: context.ip,
            userAgent: context.userAgent,
            requestId: context.requestId,
            endpoint: context.endpoint,
            method: context.method
          }
        });
        
        result.orchestrationId = orchestrationResult.strategy;
      }

      // 4. Production Error Recovery (if enabled and conditions met)
      if (this.config.enableProductionRecovery && this.shouldExecuteRecovery(appError, context)) {
        const recoveryResult = await productionErrorRecovery.executeProductionRecovery(
          appError,
          config.app.nodeEnv === "production" ? "production" : "staging",
          {
            businessImpact: this.determineBusinessImpact(appError, context.businessContext),
            affectedSystems: [this.determineSystemLayer(appError)],
            customerFacing: context.businessContext?.customerFacing ?? true,
            revenueImpacting: context.businessContext?.revenueImpacting ?? false
          }
        );
        
        result.recoveryExecuted = recoveryResult.success;
        result.recoveryStrategy = recoveryResult.strategy;
      }

      // 5. Service Mesh Recovery (if enabled and applicable)
      if (this.config.enableServiceMeshCoordination && this.isServiceMeshApplicable(appError)) {
        const recoveryRecommendations = await enterpriseErrorRecoveryStrategies.getRecoveryStrategyRecommendations(
          appError,
          context?.systemContext || {
            currentLoad: 50,
            availableCapacity: 80,
            healthScore: 0.9,
            recentErrors: 5
          }
        );
        
        // Execute primary recovery strategy if auto-recovery is enabled
        if (this.config.autoRecoveryEnabled && recoveryRecommendations.expectedOutcome.riskLevel === "low") {
          const strategyResult = await enterpriseErrorRecoveryStrategies.executeRecoveryStrategy(
            appError,
            recoveryRecommendations.primary.strategyId,
            context.businessContext
          );
          
          if (!result.recoveryExecuted && strategyResult.success) {
            result.recoveryExecuted = true;
            result.recoveryStrategy = strategyResult.strategyId;
          }
        }
      }

      // 6. Real-time Analytics Recording (if enabled)
      if (this.config.enableRealTimeAnalytics) {
        // Record error in analytics system
        await errorAnalyticsDashboard.setupWebSocketConnection(
          context.requestId,
          "operations", // Default to operations dashboard
          {
            errorType: appError.code,
            businessImpact: this.determineBusinessImpact(appError, context.businessContext),
            systemLayer: this.determineSystemLayer(appError)
          }
        );
        
        result.analyticsRecorded = true;
      }

      // 7. Error Monitoring Integration
      const errorId = await errorMonitoring.trackError(appError, {
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.endpoint,
        method: context.method,
        headers: req.headers as Record<string, string>,
        body: req.body,
        params: req.params,
        query: req.query
      });
      
      result.errorId = errorId;

      // 8. Escalation Logic (if enabled)
      if (this.config.escalationEnabled) {
        result.escalated = await this.checkAndExecuteEscalation(appError, result, context);
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (processingError) {
      logger.error("Error during enhanced processing", {
        processingError: processingError?.message,
        originalError: appError?.message,
        requestId: context.requestId
      });
      
      result.processingTime = Date.now() - startTime;
      throw processingError;
    }
  }

  /**
   * Send enhanced error response
   */
  private async sendEnhancedErrorResponse(
    error: AppError,
    result: EnhancedErrorResult,
    context: EnhancedErrorContext,
    res: Response
  ): Promise<void> {
    const response = {
      success: false,
      error: {
        id: result.errorId,
        code: error?.code || "INTERNAL_ERROR",
        message: error instanceof Error ? error?.message : String(error),
        classification: result.classificationId,
        recovery: {
          attempted: result.recoveryExecuted,
          strategy: result.recoveryStrategy,
          crossSystemImpact: result.crossSystemImpact
        },
        security: {
          threatDetected: result.securityThreatDetected,
          requiresAttention: result.securityThreatDetected && result.escalated
        }
      }
    };

    // Add development details if in development mode
    if (config.app.nodeEnv === "development") {
      (response as any).debug = {
        stack: error instanceof Error ? error?.stack : undefined,
        classification: result.classificationId,
        orchestration: result.orchestrationId,
        businessImpact: result.businessImpactAssessment
      };
    }

    // Set appropriate status code
    const statusCode = result.recoveryExecuted ? 
      (error.statusCode < 500 ? error.statusCode : 503) : // Service degraded but operational
      error.statusCode;

    res.status(statusCode).json(response);

    // Log the enhanced response
    logAuditEvent(
      "enhanced_error_response_sent",
      "enhanced_error_handler",
      {
        errorId: result.errorId,
        statusCode,
        recoveryExecuted: result.recoveryExecuted,
        securityThreatDetected: result.securityThreatDetected,
        crossSystemImpact: result.crossSystemImpact
      },
      context.userId,
      context.ip
    );
  }

  /**
   * Build error context from request
   */
  private buildErrorContext(req: Request): EnhancedErrorContext {
    return {
      requestId: (req.headers["x-request-id"] as string) || 
                 `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: (req as any).user?.id,
      organizationId: (req as any).user?.organizationId,
      ip: req?.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.get("User-Agent"),
      sessionId: (req as any).sessionID,
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date(),
      businessContext: this.extractBusinessContext(req),
      systemContext: this.extractSystemContext(req)
    };
  }

  /**
   * Extract business context from request
   */
  private extractBusinessContext(req: Request): EnhancedErrorContext["businessContext"] {
    // Extract business context from request headers, user info, etc.
    const userRole = (req as any).user?.role;
    const isCustomerFacing = req.originalUrl.includes("/api/customer") || req.originalUrl.includes("/api/public");
    const isRevenueImpacting = req.originalUrl.includes("/payment") || req.originalUrl.includes("/billing");
    
    return {
      urgency: this.determineUrgency(req),
      customerFacing: isCustomerFacing,
      revenueImpacting: isRevenueImpacting,
      complianceRequired: userRole === "admin" || isRevenueImpacting
    };
  }

  /**
   * Extract system context from request
   */
  private extractSystemContext(req: Request): EnhancedErrorContext["systemContext"] {
    // This would integrate with actual system monitoring
    return {
      currentLoad: 50, // Placeholder
      availableCapacity: 80, // Placeholder  
      healthScore: 0.9, // Placeholder
      recentErrors: 5 // Placeholder
    };
  }

  /**
   * Execute basic error handling as fallback
   */
  private async executeBasicErrorHandling(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Use existing error handler as fallback
    return errorHandler(error, req, res, next);
  }

  // Helper methods
  private determineUrgency(req: Request): "low" | "medium" | "high" | "critical" {
    if (req.originalUrl.includes("/emergency") || req.originalUrl.includes("/critical")) {
      return "critical";
    }
    if (req.method !== "GET" || req.originalUrl.includes("/payment")) {
      return "high";
    }
    if (req.originalUrl.includes("/admin")) {
      return "medium";
    }
    return "low";
  }

  private determineSystemLayer(error: AppError): any {
    const code = error.code?.toLowerCase() || "";
    if (code.includes("database")) return "data_access";
    if (code.includes("external")) return "external_services";
    if (code.includes("auth")) return "security";
    if (code.includes("validation")) return "api";
    return "business_logic";
  }

  private determineBusinessImpact(error: AppError, businessContext?: any): any {
    if (businessContext?.revenueImpacting) return "high";
    if (businessContext?.customerFacing) return "medium";
    if (error.statusCode >= 500) return "medium";
    return "low";
  }

  private shouldExecuteRecovery(error: AppError, context: EnhancedErrorContext): boolean {
    return error.statusCode >= 500 || 
           context.businessContext?.revenueImpacting === true ||
           context.businessContext?.urgency === "critical";
  }

  private isServiceMeshApplicable(error: AppError): boolean {
    return error.statusCode >= 500 || 
           error.code?.includes("EXTERNAL_SERVICE") ||
           error.code?.includes("NETWORK");
  }

  private async checkAndExecuteEscalation(
    error: AppError,
    result: EnhancedErrorResult,
    context: EnhancedErrorContext
  ): Promise<boolean> {
    const shouldEscalate = result.securityThreatDetected ||
                          (!result.recoveryExecuted && error.statusCode >= 500) ||
                          context.businessContext?.urgency === "critical";

    if (shouldEscalate) {
      // Log escalation
      logSecurityEvent(
        "error_escalated",
        {
          errorId: result.errorId,
          reason: result.securityThreatDetected ? "security_threat" : "recovery_failed",
          businessImpact: result.businessImpactAssessment,
          context: {
            endpoint: context.endpoint,
            method: context.method,
            urgency: context.businessContext?.urgency
          }
        },
        context.userId,
        context.ip,
        "high"
      );
      
      return true;
    }

    return false;
  }
}

// Create and export enhanced error handler instance
const enhancedErrorHandler = new EnhancedErrorHandler();

/**
 * Enhanced error handling middleware function
 */
export const enhancedErrorHandlerMiddleware = enhancedErrorHandler.middleware;

/**
 * Composed error handling middleware that includes both basic and enhanced handling
 */
export const composedErrorHandler = [
  enhancedErrorHandlerMiddleware,
  errorRecoveryMiddleware.middleware,
  errorHandler
];

export default enhancedErrorHandler;