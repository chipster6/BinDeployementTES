/**
 * ============================================================================
 * ERROR HIERARCHY ANALYSIS AND VALIDATION FRAMEWORK
 * ============================================================================
 *
 * Comprehensive analysis of the existing error class hierarchy and validation
 * framework to ensure business logic integrity during error transformations.
 * Provides error classification, audit trail patterns, and validation rules.
 *
 * Components:
 * 1. Error Hierarchy Mapping
 * 2. Business Logic Validation Rules  
 * 3. Audit Trail Integration
 * 4. Error Code Standardization
 * 5. Error Context Preservation
 * 6. Transformation Validation
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Error Hierarchy Validation
 */

import { logger } from "@/utils/logger";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ExternalServiceError,
  DatabaseOperationError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
  RateLimitExceededError,
  ResourceUnavailableError,
  ConfigurationError,
} from "@/middleware/errorHandler";

/**
 * Error hierarchy mapping interface
 */
export interface ErrorHierarchyNode {
  errorClass: string;
  parentClass?: string;
  businessImpact: "minimal" | "low" | "medium" | "high" | "critical";
  customerFacing: boolean;
  retryable: boolean;
  auditRequired: boolean;
  alertLevel: "info" | "warn" | "error" | "critical";
  httpStatusCode: number;
  standardErrorCodes: string[];
  contextRequirements: string[];
  businessRules: ErrorBusinessRule[];
}

/**
 * Business rule for error handling
 */
export interface ErrorBusinessRule {
  ruleId: string;
  description: string;
  applies: (error: AppError, context?: any) => boolean;
  validate: (error: AppError, context?: any) => boolean;
  action: "log" | "alert" | "escalate" | "block" | "transform";
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Error transformation validation result
 */
export interface TransformationValidationResult {
  isValid: boolean;
  originalError: {
    type: string;
    message: string;
    context?: any;
  };
  transformedError: {
    type: string;
    message: string;
    code?: string;
    statusCode: number;
  };
  businessLogicIntact: boolean;
  auditTrailPreserved: boolean;
  contextPreserved: boolean;
  complianceRulesFollowed: boolean;
  validationErrors: string[];
  recommendations: string[];
}

/**
 * Error Hierarchy Analyzer
 */
export class ErrorHierarchyAnalyzer {
  private readonly errorHierarchy: Map<string, ErrorHierarchyNode> = new Map();
  private readonly businessRules: Map<string, ErrorBusinessRule> = new Map();
  
  constructor() {
    this.initializeErrorHierarchy();
    this.initializeBusinessRules();
  }

  /**
   * Analyze error hierarchy and validate structure
   */
  public analyzeErrorHierarchy(): {
    totalClasses: number;
    hierarchyDepth: number;
    businessImpactDistribution: Record<string, number>;
    retryableErrors: string[];
    nonRetryableErrors: string[];
    auditRequiredErrors: string[];
    customerFacingErrors: string[];
    analysisReport: string[];
  } {
    const hierarchy = Array.from(this.errorHierarchy.values());
    const analysis = {
      totalClasses: hierarchy.length,
      hierarchyDepth: this.calculateMaxDepth(),
      businessImpactDistribution: this.getBusinessImpactDistribution(hierarchy),
      retryableErrors: hierarchy.filter(h => h.retryable).map(h => h.errorClass),
      nonRetryableErrors: hierarchy.filter(h => !h.retryable).map(h => h.errorClass),
      auditRequiredErrors: hierarchy.filter(h => h.auditRequired).map(h => h.errorClass),
      customerFacingErrors: hierarchy.filter(h => h.customerFacing).map(h => h.errorClass),
      analysisReport: this.generateAnalysisReport(hierarchy),
    };

    logger.info("Error hierarchy analysis completed", analysis);
    return analysis;
  }

  /**
   * Validate error transformation maintains business logic integrity
   */
  public validateTransformation(
    originalError: unknown,
    transformedError: AppError,
    context?: any
  ): TransformationValidationResult {
    const result: TransformationValidationResult = {
      isValid: true,
      originalError: {
        type: originalError instanceof Error ? originalError.constructor.name : typeof originalError,
        message: originalError instanceof Error ? originalError?.message : String(originalError),
        context,
      },
      transformedError: {
        type: transformedError.constructor.name,
        message: transformedError?.message,
        code: transformedError.code,
        statusCode: transformedError.statusCode,
      },
      businessLogicIntact: true,
      auditTrailPreserved: true,
      contextPreserved: true,
      complianceRulesFollowed: true,
      validationErrors: [],
      recommendations: [],
    };

    // Validate error class mapping
    const hierarchyNode = this.errorHierarchy.get(transformedError.constructor.name);
    if (!hierarchyNode) {
      result.isValid = false;
      result.validationErrors.push(`Unknown error class: ${transformedError.constructor.name}`);
    }

    // Validate business logic integrity
    result.businessLogicIntact = this.validateBusinessLogicIntegrity(
      originalError,
      transformedError,
      context
    );

    if (!result.businessLogicIntact) {
      result.isValid = false;
      result.validationErrors.push("Business logic integrity compromised");
    }

    // Validate audit trail preservation
    result.auditTrailPreserved = this.validateAuditTrailPreservation(
      originalError,
      transformedError,
      context
    );

    if (!result.auditTrailPreserved) {
      result.isValid = false;
      result.validationErrors.push("Audit trail not properly preserved");
    }

    // Validate context preservation
    result.contextPreserved = this.validateContextPreservation(
      originalError,
      transformedError,
      context
    );

    if (!result.contextPreserved) {
      result.validationErrors.push("Important context information lost");
      result.recommendations.push("Preserve original error context in details field");
    }

    // Validate compliance rules
    result.complianceRulesFollowed = this.validateComplianceRules(
      transformedError,
      context
    );

    if (!result.complianceRulesFollowed) {
      result.isValid = false;
      result.validationErrors.push("Compliance rules not followed");
    }

    // Apply business rules
    this.applyBusinessRules(transformedError, context, result);

    // Generate recommendations
    this.generateRecommendations(result);

    return result;
  }

  /**
   * Get standardized error code for error type
   */
  public getStandardizedErrorCode(errorClass: string): string {
    const hierarchyNode = this.errorHierarchy.get(errorClass);
    return hierarchyNode?.standardErrorCodes[0] || "UNKNOWN_ERROR";
  }

  /**
   * Check if error requires audit logging
   */
  public requiresAuditLogging(error: AppError): boolean {
    const hierarchyNode = this.errorHierarchy.get(error.constructor.name);
    return hierarchyNode?.auditRequired || false;
  }

  /**
   * Get business impact level for error
   */
  public getBusinessImpact(error: AppError): string {
    const hierarchyNode = this.errorHierarchy.get(error.constructor.name);
    return hierarchyNode?.businessImpact || "medium";
  }

  /**
   * Check if error is customer-facing
   */
  public isCustomerFacing(error: AppError): boolean {
    const hierarchyNode = this.errorHierarchy.get(error.constructor.name);
    return hierarchyNode?.customerFacing || false;
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(error: AppError): boolean {
    const hierarchyNode = this.errorHierarchy.get(error.constructor.name);
    return hierarchyNode?.retryable || false;
  }

  /**
   * Initialize error hierarchy mapping
   */
  private initializeErrorHierarchy(): void {
    // Base AppError
    this.errorHierarchy.set("AppError", {
      errorClass: "AppError",
      businessImpact: "medium",
      customerFacing: false,
      retryable: false,
      auditRequired: true,
      alertLevel: "error",
      httpStatusCode: 500,
      standardErrorCodes: ["INTERNAL_ERROR"],
      contextRequirements: ["operation", "serviceName"],
      businessRules: [],
    });

    // Authentication Errors
    this.errorHierarchy.set("AuthenticationError", {
      errorClass: "AuthenticationError",
      parentClass: "AppError",
      businessImpact: "high",
      customerFacing: true,
      retryable: false,
      auditRequired: true,
      alertLevel: "warn",
      httpStatusCode: 401,
      standardErrorCodes: ["AUTHENTICATION_FAILED", "INVALID_TOKEN", "TOKEN_EXPIRED"],
      contextRequirements: ["userId", "requestId", "ip"],
      businessRules: [],
    });

    // Authorization Errors
    this.errorHierarchy.set("AuthorizationError", {
      errorClass: "AuthorizationError",
      parentClass: "AppError",
      businessImpact: "high",
      customerFacing: true,
      retryable: false,
      auditRequired: true,
      alertLevel: "warn",
      httpStatusCode: 403,
      standardErrorCodes: ["ACCESS_DENIED", "INSUFFICIENT_PERMISSIONS"],
      contextRequirements: ["userId", "requestId", "resource", "action"],
      businessRules: [],
    });

    // Validation Errors
    this.errorHierarchy.set("ValidationError", {
      errorClass: "ValidationError",
      parentClass: "AppError",
      businessImpact: "low",
      customerFacing: true,
      retryable: false,
      auditRequired: false,
      alertLevel: "info",
      httpStatusCode: 400,
      standardErrorCodes: ["VALIDATION_ERROR", "INVALID_INPUT", "MISSING_FIELD"],
      contextRequirements: ["field", "value", "rule"],
      businessRules: [],
    });

    // Database Operation Errors
    this.errorHierarchy.set("DatabaseOperationError", {
      errorClass: "DatabaseOperationError",
      parentClass: "AppError",
      businessImpact: "high",
      customerFacing: false,
      retryable: true,
      auditRequired: true,
      alertLevel: "error",
      httpStatusCode: 500,
      standardErrorCodes: ["DATABASE_ERROR", "CONNECTION_FAILED", "QUERY_FAILED"],
      contextRequirements: ["operation", "table", "query"],
      businessRules: [],
    });

    // External Service Errors
    this.errorHierarchy.set("ExternalServiceError", {
      errorClass: "ExternalServiceError",
      parentClass: "AppError",
      businessImpact: "medium",
      customerFacing: false,
      retryable: true,
      auditRequired: true,
      alertLevel: "warn",
      httpStatusCode: 503,
      standardErrorCodes: ["EXTERNAL_SERVICE_ERROR", "SERVICE_UNAVAILABLE"],
      contextRequirements: ["service", "endpoint", "operation"],
      businessRules: [],
    });

    // Network Errors
    this.errorHierarchy.set("NetworkError", {
      errorClass: "NetworkError",
      parentClass: "AppError",
      businessImpact: "medium",
      customerFacing: false,
      retryable: true,
      auditRequired: false,
      alertLevel: "warn",
      httpStatusCode: 503,
      standardErrorCodes: ["NETWORK_ERROR", "CONNECTION_FAILED"],
      contextRequirements: ["host", "operation"],
      businessRules: [],
    });

    // Timeout Errors
    this.errorHierarchy.set("TimeoutError", {
      errorClass: "TimeoutError",
      parentClass: "AppError",
      businessImpact: "medium",
      customerFacing: false,
      retryable: true,
      auditRequired: true,
      alertLevel: "warn",
      httpStatusCode: 408,
      standardErrorCodes: ["TIMEOUT_ERROR", "OPERATION_TIMEOUT"],
      contextRequirements: ["operation", "timeout", "duration"],
      businessRules: [],
    });

    // Circuit Breaker Errors
    this.errorHierarchy.set("CircuitBreakerError", {
      errorClass: "CircuitBreakerError",
      parentClass: "AppError",
      businessImpact: "high",
      customerFacing: false,
      retryable: false,
      auditRequired: true,
      alertLevel: "error",
      httpStatusCode: 503,
      standardErrorCodes: ["CIRCUIT_BREAKER_OPEN", "SERVICE_DEGRADED"],
      contextRequirements: ["service", "failures", "threshold"],
      businessRules: [],
    });

    // Rate Limit Errors
    this.errorHierarchy.set("RateLimitExceededError", {
      errorClass: "RateLimitExceededError",
      parentClass: "AppError",
      businessImpact: "low",
      customerFacing: true,
      retryable: true,
      auditRequired: false,
      alertLevel: "info",
      httpStatusCode: 429,
      standardErrorCodes: ["RATE_LIMIT_EXCEEDED", "TOO_MANY_REQUESTS"],
      contextRequirements: ["limit", "window", "retryAfter"],
      businessRules: [],
    });

    // Configuration Errors
    this.errorHierarchy.set("ConfigurationError", {
      errorClass: "ConfigurationError",
      parentClass: "AppError",
      businessImpact: "critical",
      customerFacing: false,
      retryable: false,
      auditRequired: true,
      alertLevel: "critical",
      httpStatusCode: 500,
      standardErrorCodes: ["CONFIG_ERROR", "INVALID_CONFIG"],
      contextRequirements: ["configKey", "configValue", "environment"],
      businessRules: [],
    });
  }

  /**
   * Initialize business rules for error handling
   */
  private initializeBusinessRules(): void {
    // Authentication failure business rule
    this.businessRules.set("AUTH_FAILURE_MONITORING", {
      ruleId: "AUTH_FAILURE_MONITORING",
      description: "Monitor authentication failures for security threats",
      applies: (error: AppError) => error instanceof AuthenticationError,
      validate: (error: AppError, context: any) => {
        return context?.userId !== undefined && context?.ip !== undefined;
      },
      action: "alert",
      severity: "high",
    });

    // Database error escalation rule
    this.businessRules.set("DATABASE_ERROR_ESCALATION", {
      ruleId: "DATABASE_ERROR_ESCALATION",
      description: "Escalate database errors that affect critical operations",
      applies: (error: AppError) => error instanceof DatabaseOperationError,
      validate: (error: AppError, context: any) => {
        const criticalOperations = ["billing", "payment", "user_creation"];
        return !criticalOperations.includes(context?.operation);
      },
      action: "escalate",
      severity: "critical",
    });

    // External service degradation rule
    this.businessRules.set("EXTERNAL_SERVICE_DEGRADATION", {
      ruleId: "EXTERNAL_SERVICE_DEGRADATION",
      description: "Monitor external service degradation patterns",
      applies: (error: AppError) => error instanceof ExternalServiceError,
      validate: (error: AppError, context: any) => {
        return (error as ExternalServiceError).retryable === true;
      },
      action: "log",
      severity: "medium",
    });

    // Configuration error blocking rule
    this.businessRules.set("CONFIG_ERROR_BLOCKING", {
      ruleId: "CONFIG_ERROR_BLOCKING",
      description: "Block operations on critical configuration errors",
      applies: (error: AppError) => error instanceof ConfigurationError,
      validate: (error: AppError, context: any) => {
        const criticalConfigs = ["database", "security", "encryption"];
        return criticalConfigs.some(config => error instanceof Error ? error?.message : String(error).toLowerCase().includes(config));
      },
      action: "block",
      severity: "critical",
    });
  }

  /**
   * Validate business logic integrity
   */
  private validateBusinessLogicIntegrity(
    originalError: unknown,
    transformedError: AppError,
    context?: any
  ): boolean {
    // Check that the transformation preserves the essential business meaning
    if (originalError instanceof Error) {
      // Validation errors should remain validation errors
      if (originalError.name.includes("Validation") && !(transformedError instanceof ValidationError)) {
        return false;
      }
      
      // Authentication errors should remain authentication errors
      if (originalError.name.includes("JWT") && !(transformedError instanceof AuthenticationError)) {
        return false;
      }
      
      // Database errors should map to appropriate database error types
      if (originalError.name.includes("Sequelize") && !(transformedError instanceof DatabaseOperationError || transformedError instanceof ValidationError)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate audit trail preservation
   */
  private validateAuditTrailPreservation(
    originalError: unknown,
    transformedError: AppError,
    context?: any
  ): boolean {
    const hierarchyNode = this.errorHierarchy.get(transformedError.constructor.name);
    
    if (hierarchyNode?.auditRequired) {
      // Check that required context is present
      const missingContext = hierarchyNode.contextRequirements.filter(
        req => !context || context[req] === undefined
      );
      
      return missingContext.length === 0;
    }

    return true;
  }

  /**
   * Validate context preservation
   */
  private validateContextPreservation(
    originalError: unknown,
    transformedError: AppError,
    context?: any
  ): boolean {
    // Check that important information from the original error is preserved
    if (originalError instanceof Error) {
      // Stack trace should be preserved in development
      if (process.env.NODE_ENV === "development" && !transformedError?.stack) {
        return false;
      }
      
      // Original error message should be preserved or enhanced
      if (!transformedError?.message.includes(originalError?.message) && 
          transformedError?.message.length < originalError?.message.length) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate compliance rules
   */
  private validateComplianceRules(transformedError: AppError, context?: any): boolean {
    // GDPR compliance - sensitive data should not be exposed in error messages
    const sensitivePatterns = [
      /password/i,
      /ssn/i,
      /credit.?card/i,
      /phone.?number/i,
      /email.*@/i,
    ];
    
    const hasSensitiveData = sensitivePatterns.some(pattern => 
      pattern.test(transformedError?.message)
    );
    
    return !hasSensitiveData;
  }

  /**
   * Apply business rules to transformation
   */
  private applyBusinessRules(
    transformedError: AppError,
    context: any,
    result: TransformationValidationResult
  ): void {
    for (const rule of this.businessRules.values()) {
      if (rule.applies(transformedError, context)) {
        const isValid = rule.validate(transformedError, context);
        
        if (!isValid) {
          result.validationErrors.push(`Business rule violation: ${rule.description}`);
          
          if (rule.action === "block") {
            result.isValid = false;
          }
          
          result.recommendations.push(
            `Apply ${rule.action} action for rule: ${rule.ruleId} (Severity: ${rule.severity})`
          );
        }
      }
    }
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(result: TransformationValidationResult): void {
    if (!result.contextPreserved) {
      result.recommendations.push("Include original error details in transformed error");
    }
    
    if (!result.auditTrailPreserved) {
      result.recommendations.push("Ensure all required audit context is provided");
    }
    
    if (result.validationErrors.length > 0) {
      result.recommendations.push("Review and fix validation errors before deployment");
    }
  }

  /**
   * Calculate maximum hierarchy depth
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    
    for (const node of this.errorHierarchy.values()) {
      let depth = 1;
      let currentNode = node;
      
      while (currentNode.parentClass) {
        depth++;
        currentNode = this.errorHierarchy.get(currentNode.parentClass)!;
        if (!currentNode) break;
      }
      
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }

  /**
   * Get business impact distribution
   */
  private getBusinessImpactDistribution(hierarchy: ErrorHierarchyNode[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const node of hierarchy) {
      distribution[node.businessImpact] = (distribution[node.businessImpact] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Generate analysis report
   */
  private generateAnalysisReport(hierarchy: ErrorHierarchyNode[]): string[] {
    const report: string[] = [];
    
    report.push(`Total error classes: ${hierarchy.length}`);
    report.push(`Customer-facing errors: ${hierarchy.filter(h => h.customerFacing).length}`);
    report.push(`Retryable errors: ${hierarchy.filter(h => h.retryable).length}`);
    report.push(`Audit-required errors: ${hierarchy.filter(h => h.auditRequired).length}`);
    report.push(`Critical impact errors: ${hierarchy.filter(h => h.businessImpact === "critical").length}`);
    
    const uniqueStatusCodes = new Set(hierarchy.map(h => h.httpStatusCode));
    report.push(`Unique HTTP status codes: ${uniqueStatusCodes.size}`);
    
    return report;
  }
}

/**
 * Global error hierarchy analyzer instance
 */
export const errorHierarchyAnalyzer = new ErrorHierarchyAnalyzer();

/**
 * Validation helper function for error transformations
 */
export const validateErrorTransformation = (
  originalError: unknown,
  transformedError: AppError,
  context?: any
): TransformationValidationResult => {
  return errorHierarchyAnalyzer.validateTransformation(originalError, transformedError, context);
};

/**
 * Helper function to check if error requires special handling
 */
export const getErrorHandlingRequirements = (error: AppError): {
  requiresAudit: boolean;
  businessImpact: string;
  isCustomerFacing: boolean;
  isRetryable: boolean;
  standardCode: string;
} => {
  return {
    requiresAudit: errorHierarchyAnalyzer.requiresAuditLogging(error),
    businessImpact: errorHierarchyAnalyzer.getBusinessImpact(error),
    isCustomerFacing: errorHierarchyAnalyzer.isCustomerFacing(error),
    isRetryable: errorHierarchyAnalyzer.isRetryable(error),
    standardCode: errorHierarchyAnalyzer.getStandardizedErrorCode(error.constructor.name),
  };
};

export default errorHierarchyAnalyzer;