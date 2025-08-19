/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ARTILLERY HELPER FUNCTIONS
 * ============================================================================
 *
 * Helper functions for Artillery performance testing
 * Provides authentication, validation, and performance measurement utilities
 *
 * Created by: Testing Agent (Phase 3 Performance Validation)
 * Date: 2025-08-16
 * Version: 1.0.0
 */

const crypto = require('crypto');

// Performance tracking
const performanceMetrics = {
  errorOrchestration: {
    totalRequests: 0,
    totalResponseTime: 0,
    businessContinuitySuccess: 0,
    revenueProtectionSuccess: 0
  },
  securityMonitoring: {
    totalEvents: 0,
    totalResponseTime: 0,
    eventProcessingSuccess: 0,
    dashboardGenerationSuccess: 0
  },
  externalServices: {
    totalHealthChecks: 0,
    totalResponseTime: 0,
    serviceCoordinationSuccess: 0,
    costOptimizationSum: 0
  }
};

/**
 * Set authentication token for requests
 */
function setAuthToken(requestParams, context, ee, next) {
  // Generate test JWT token
  const payload = {
    userId: `perf_test_user_${Math.random().toString(36).substr(2, 9)}`,
    role: 'performance_tester',
    permissions: ['read:all', 'write:test'],
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  // Simple base64 encoding for test token
  const token = 'perf_test_' + Buffer.from(JSON.stringify(payload)).toString('base64');
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['Authorization'] = `Bearer ${token}`;
  
  return next();
}

/**
 * Generate random IP address
 */
function randomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * Generate random string
 */
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate random boolean
 */
function randomBoolean() {
  return Math.random() < 0.5;
}

/**
 * Generate random integer in range
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float in range
 */
function randomFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(1);
}

/**
 * Generate ISO timestamp
 */
function isoTimestamp() {
  return new Date().toISOString();
}

/**
 * Generate Unix timestamp
 */
function timestamp() {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// ERROR ORCHESTRATION VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate error orchestration performance
 */
function validateOrchestrationPerformance(context, events, done) {
  const startTime = Date.now();
  const duration = context.vars.orchestrationDuration || 0;
  const businessContinuity = context.vars.businessContinuity;

  performanceMetrics.errorOrchestration.totalRequests++;
  performanceMetrics.errorOrchestration.totalResponseTime += duration;

  if (businessContinuity === true) {
    performanceMetrics.errorOrchestration.businessContinuitySuccess++;
  }

  // Validate performance requirements
  if (duration > 5000) {
    events.emit('counter', 'performance.error_orchestration.slow_response', 1);
  }

  if (duration <= 2000) {
    events.emit('counter', 'performance.error_orchestration.fast_response', 1);
  }

  events.emit('histogram', 'orchestration_duration', duration);
  events.emit('rate', 'business_continuity_rate', businessContinuity === true ? 1 : 0);

  return done();
}

/**
 * Validate health check performance
 */
function validateHealthCheckPerformance(context, events, done) {
  const systemHealth = context.vars.systemHealth;
  const errorRate = context.vars.errorRate || 0;

  // Health check should complete quickly
  events.emit('counter', 'performance.health_check.completed', 1);
  
  if (errorRate < 5) {
    events.emit('counter', 'performance.health_check.low_error_rate', 1);
  }

  if (systemHealth === 'healthy') {
    events.emit('counter', 'performance.health_check.system_healthy', 1);
  }

  return done();
}

/**
 * Validate revenue protection performance
 */
function validateRevenueProtectionPerformance(context, events, done) {
  const duration = context.vars.revenueDuration || 0;
  const strategy = context.vars.recoveryStrategy;

  performanceMetrics.errorOrchestration.revenueProtectionSuccess++;

  // Revenue protection must be fast
  if (duration <= 3000) {
    events.emit('counter', 'performance.revenue_protection.fast_recovery', 1);
  }

  events.emit('histogram', 'revenue_protection_response_time', duration);
  events.emit('counter', 'recovery_strategy_distribution', strategy);

  return done();
}

/**
 * Validate emergency business continuity performance
 */
function validateEmergencyContinuityPerformance(context, events, done) {
  const recoveryTime = context.vars.recoveryTime;

  if (recoveryTime) {
    const estimatedMs = new Date(recoveryTime).getTime() - Date.now();
    events.emit('histogram', 'emergency_recovery_time', Math.max(0, estimatedMs));
  }

  events.emit('counter', 'performance.emergency_continuity.activated', 1);

  return done();
}

// ============================================================================
// SECURITY MONITORING VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate security event performance
 */
function validateSecurityEventPerformance(context, events, done) {
  const eventId = context.vars.eventId;
  const eventTimestamp = context.vars.eventTimestamp;

  performanceMetrics.securityMonitoring.totalEvents++;

  if (eventId) {
    performanceMetrics.securityMonitoring.eventProcessingSuccess++;
    events.emit('counter', 'performance.security_events.processed', 1);
  }

  // Measure event processing latency
  if (eventTimestamp) {
    const processingLatency = Date.now() - new Date(eventTimestamp).getTime();
    events.emit('histogram', 'security_event_processing_time', processingLatency);

    if (processingLatency <= 100) {
      events.emit('counter', 'performance.security_events.fast_processing', 1);
    }
  }

  events.emit('rate', 'event_processing_rate', eventId ? 1 : 0);

  return done();
}

/**
 * Validate dashboard performance
 */
function validateDashboardPerformance(context, events, done) {
  const totalEvents = context.vars.totalEvents || 0;
  const criticalEvents = context.vars.criticalEvents || 0;

  performanceMetrics.securityMonitoring.dashboardGenerationSuccess++;

  events.emit('counter', 'performance.security_dashboard.generated', 1);
  events.emit('histogram', 'dashboard_generation_time', Date.now());

  if (totalEvents > 0) {
    events.emit('counter', 'performance.security_dashboard.with_data', 1);
  }

  events.emit('rate', 'dashboard_generation_rate', 1);

  return done();
}

/**
 * Validate metrics performance
 */
function validateMetricsPerformance(context, events, done) {
  const totalVolume = context.vars.totalVolume || 0;
  const avgResponseTime = context.vars.avgResponseTime || 0;

  events.emit('counter', 'performance.security_metrics.calculated', 1);
  events.emit('histogram', 'security_event_volume', totalVolume);

  if (avgResponseTime <= 200) {
    events.emit('counter', 'performance.security_metrics.fast_calculation', 1);
  }

  return done();
}

/**
 * Validate critical alert performance
 */
function validateCriticalAlertPerformance(context, events, done) {
  const criticalEventId = context.vars.criticalEventId;

  if (criticalEventId) {
    events.emit('counter', 'performance.critical_alerts.processed', 1);
    events.emit('histogram', 'critical_alert_response_time', Date.now());
  }

  events.emit('rate', 'alert_delivery_rate', criticalEventId ? 1 : 0);

  return done();
}

/**
 * Validate query performance
 */
function validateQueryPerformance(context, events, done) {
  const queryTotal = context.vars.queryTotal || 0;
  const queryEvents = context.vars.queryEvents || [];

  events.emit('counter', 'performance.security_query.executed', 1);
  events.emit('histogram', 'security_query_results', queryTotal);

  if (Array.isArray(queryEvents) && queryEvents.length > 0) {
    events.emit('counter', 'performance.security_query.with_results', 1);
  }

  return done();
}

// ============================================================================
// EXTERNAL SERVICES VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate service health performance
 */
function validateServiceHealthPerformance(context, events, done) {
  const overallHealth = context.vars.overallHealth;
  const serviceStatuses = context.vars.serviceStatuses || {};
  const healthCheckTime = context.vars.healthCheckTime || 0;

  performanceMetrics.externalServices.totalHealthChecks++;
  performanceMetrics.externalServices.totalResponseTime += healthCheckTime;

  events.emit('histogram', 'service_health_check_time', healthCheckTime);

  if (overallHealth === 'healthy') {
    events.emit('counter', 'performance.service_health.overall_healthy', 1);
  }

  const healthyServices = Object.values(serviceStatuses).filter(status => 
    status.status === 'healthy' || status.status === 'operational'
  ).length;

  events.emit('histogram', 'healthy_services_count', healthyServices);
  events.emit('rate', 'external_service_availability', healthyServices / Object.keys(serviceStatuses).length);

  return done();
}

/**
 * Validate individual service performance
 */
function validateIndividualServicePerformance(context, events, done) {
  const serviceStatus = context.vars.serviceStatus;
  const serviceResponseTime = context.vars.serviceResponseTime || 0;

  events.emit('histogram', 'individual_service_response_time', serviceResponseTime);

  if (serviceStatus === 'healthy' || serviceStatus === 'operational') {
    events.emit('counter', 'performance.individual_service.healthy', 1);
  }

  if (serviceResponseTime <= 1000) {
    events.emit('counter', 'performance.individual_service.fast_response', 1);
  }

  return done();
}

/**
 * Validate cost optimization performance
 */
function validateCostOptimizationPerformance(context, events, done) {
  const totalSavings = context.vars.totalSavings || 0;
  const optimizationPercentage = context.vars.optimizationPercentage || 0;
  const optimizationTime = context.vars.optimizationTime || 0;

  performanceMetrics.externalServices.costOptimizationSum += optimizationPercentage;

  events.emit('histogram', 'cost_optimization_calculation_time', optimizationTime);
  events.emit('histogram', 'cost_savings_percentage', optimizationPercentage);

  if (optimizationPercentage >= 20) {
    events.emit('counter', 'performance.cost_optimization.target_achieved', 1);
  }

  if (optimizationTime <= 500) {
    events.emit('counter', 'performance.cost_optimization.fast_calculation', 1);
  }

  return done();
}

/**
 * Validate metrics collection performance
 */
function validateMetricsCollectionPerformance(context, events, done) {
  const totalRequests = context.vars.totalRequests || 0;
  const avgResponseTime = context.vars.avgResponseTime || 0;
  const errorRate = context.vars.errorRate || 0;

  events.emit('histogram', 'metrics_collection_volume', totalRequests);
  events.emit('histogram', 'service_average_response_time', avgResponseTime);
  events.emit('histogram', 'service_error_rate', errorRate);

  if (errorRate <= 5) {
    events.emit('counter', 'performance.metrics_collection.low_error_rate', 1);
  }

  return done();
}

/**
 * Validate rate limit performance
 */
function validateRateLimitPerformance(context, events, done) {
  const rateLimitData = context.vars.rateLimitData || {};
  const rateLimitCheckTime = context.vars.rateLimitCheckTime || 0;

  events.emit('histogram', 'rate_limit_check_time', rateLimitCheckTime);

  const servicesWithLimits = Object.keys(rateLimitData).length;
  events.emit('histogram', 'services_with_rate_limits', servicesWithLimits);

  if (rateLimitCheckTime <= 200) {
    events.emit('counter', 'performance.rate_limit.fast_check', 1);
  }

  return done();
}

/**
 * Validate coordination performance
 */
function validateCoordinationPerformance(context, events, done) {
  const coordinationTime = context.vars.coordinationTime || 0;
  const successCount = context.vars.successCount || 0;
  const failureCount = context.vars.failureCount || 0;

  performanceMetrics.externalServices.serviceCoordinationSuccess += successCount;

  events.emit('histogram', 'service_coordination_time', coordinationTime);
  events.emit('counter', 'service_coordination_successes', successCount);
  events.emit('counter', 'service_coordination_failures', failureCount);

  const successRate = successCount / (successCount + failureCount);
  events.emit('rate', 'service_coordination_success_rate', successRate);

  if (coordinationTime <= 3000) {
    events.emit('counter', 'performance.coordination.fast_execution', 1);
  }

  return done();
}

/**
 * Validate failover performance
 */
function validateFailoverPerformance(context, events, done) {
  const failoverTime = context.vars.failoverTime || 0;
  const fallbackService = context.vars.fallbackService;
  const failoverSuccess = context.vars.failoverSuccess;

  events.emit('histogram', 'failover_switch_time', failoverTime);

  if (failoverSuccess === true) {
    events.emit('counter', 'performance.failover.successful', 1);
    events.emit('rate', 'failover_success_rate', 1);
  } else {
    events.emit('rate', 'failover_success_rate', 0);
  }

  if (failoverTime <= 1000) {
    events.emit('counter', 'performance.failover.fast_switch', 1);
  }

  return done();
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

module.exports = {
  setAuthToken,
  validateOrchestrationPerformance,
  validateHealthCheckPerformance,
  validateRevenueProtectionPerformance,
  validateEmergencyContinuityPerformance,
  validateSecurityEventPerformance,
  validateDashboardPerformance,
  validateMetricsPerformance,
  validateCriticalAlertPerformance,
  validateQueryPerformance,
  validateServiceHealthPerformance,
  validateIndividualServicePerformance,
  validateCostOptimizationPerformance,
  validateMetricsCollectionPerformance,
  validateRateLimitPerformance,
  validateCoordinationPerformance,
  validateFailoverPerformance,
  
  // Utility functions for template variables
  $randomIP: randomIP,
  $randomString: randomString,
  $randomBoolean: randomBoolean,
  $randomInt: randomInt,
  $randomFloat: randomFloat,
  $isoTimestamp: isoTimestamp,
  $timestamp: timestamp,
  
  // Performance metrics access
  getPerformanceMetrics: () => performanceMetrics
};