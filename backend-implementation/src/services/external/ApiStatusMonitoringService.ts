/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - API STATUS MONITORING SERVICE
 * ============================================================================
 *
 * Real-time API status monitoring service providing comprehensive Frontend
 * coordination with user-friendly error messages, status indicators, and
 * proactive alerting for seamless Backend-Frontend integration.
 *
 * Features:
 * - Real-time status indicators for all external APIs
 * - User-friendly error transformation for Frontend display
 * - Proactive health monitoring with predictive alerting
 * - Service dependency mapping and cascade failure detection
 * - Cost impact analysis integration
 * - Performance trend analysis and recommendations
 * - Automated escalation and recovery suggestions
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { socketManager } from "@/services/socketManager";
import { externalServicesManager } from "./ExternalServicesManager";
import { jobQueue } from "@/services/jobQueue";

/**
 * API Status indicator for Frontend display
 */
export interface ApiStatusIndicator {
  serviceName: string;
  status: "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastIncident?: string;
  userFriendlyMessage: string;
  technicalDetails?: string;
  impactLevel: "none" | "low" | "medium" | "high" | "critical";
  estimatedResolution?: string;
  workaroundAvailable: boolean;
  dependentServices: string[];
  timestamp: Date;
}

/**
 * User-friendly error message mapping
 */
export interface UserFriendlyError {
  originalError: string;
  userMessage: string;
  severity: "info" | "warning" | "error" | "critical";
  suggestedAction?: string;
  workaround?: string;
  escalationRequired: boolean;
  impactDescription: string;
}

/**
 * Service dependency mapping
 */
export interface ServiceDependency {
  serviceName: string;
  dependsOn: string[];
  dependents: string[];
  criticalPath: boolean;
  cascadeRisk: "low" | "medium" | "high";
}

/**
 * API Status Monitoring Service implementation
 */
export class ApiStatusMonitoringService {
  private statusIndicators: Map<string, ApiStatusIndicator> = new Map();
  private serviceDependencies: Map<string, ServiceDependency> = new Map();
  private errorTransformations: Map<string, (error: any) => UserFriendlyError> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds: Map<string, any> = new Map();
  private incidentHistory: any[] = [];

  constructor() {
    this.initializeServiceDependencies();
    this.initializeErrorTransformations();
    this.initializeAlertThresholds();
  }

  /**
   * Initialize the API status monitoring service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing API Status Monitoring Service');

      // Start real-time monitoring
      await this.startRealTimeMonitoring();

      // Initialize status indicators for all services
      await this.initializeStatusIndicators();

      // Setup proactive health checks
      await this.setupProactiveHealthChecks();

      // Start incident tracking
      await this.startIncidentTracking();

      logger.info('API Status Monitoring Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API Status Monitoring Service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Initialize service dependencies mapping
   */
  private initializeServiceDependencies(): void {
    // Define service dependencies for cascade failure detection
    this.serviceDependencies.set('stripe', {
      serviceName: 'stripe',
      dependsOn: [],
      dependents: ['customer_portal', 'billing_system'],
      criticalPath: true,
      cascadeRisk: 'high',
    });

    this.serviceDependencies.set('samsara', {
      serviceName: 'samsara',
      dependsOn: ['maps'],
      dependents: ['fleet_tracking', 'route_optimization'],
      criticalPath: true,
      cascadeRisk: 'high',
    });

    this.serviceDependencies.set('twilio', {
      serviceName: 'twilio',
      dependsOn: [],
      dependents: ['customer_notifications', 'driver_alerts'],
      criticalPath: true,
      cascadeRisk: 'medium',
    });

    this.serviceDependencies.set('sendgrid', {
      serviceName: 'sendgrid',
      dependsOn: [],
      dependents: ['email_notifications', 'customer_communications'],
      criticalPath: false,
      cascadeRisk: 'low',
    });

    this.serviceDependencies.set('maps', {
      serviceName: 'maps',
      dependsOn: [],
      dependents: ['route_optimization', 'location_services', 'samsara'],
      criticalPath: true,
      cascadeRisk: 'high',
    });

    this.serviceDependencies.set('airtable', {
      serviceName: 'airtable',
      dependsOn: [],
      dependents: ['data_sync', 'reporting'],
      criticalPath: false,
      cascadeRisk: 'low',
    });

    logger.debug('Service dependencies initialized', {
      totalServices: this.serviceDependencies.size,
    });
  }

  /**
   * Initialize user-friendly error transformations
   */
  private initializeErrorTransformations(): void {
    // Stripe error transformations
    this.errorTransformations.set('stripe', (error: any) => {
      if (error.message?.includes('card_declined')) {
        return {
          originalError: error.message,
          userMessage: 'Payment method was declined. Please try a different card or contact your bank.',
          severity: 'warning',
          suggestedAction: 'Update payment method',
          workaround: 'Try using a different payment method',
          escalationRequired: false,
          impactDescription: 'Customer cannot complete payment',
        };
      }

      if (error.message?.includes('rate_limit')) {
        return {
          originalError: error.message,
          userMessage: 'Payment system is experiencing high traffic. Please wait a moment and try again.',
          severity: 'warning',
          suggestedAction: 'Retry in a few seconds',
          workaround: 'Queue payment for later processing',
          escalationRequired: false,
          impactDescription: 'Temporary payment delays',
        };
      }

      return {
        originalError: error.message || 'Unknown payment error',
        userMessage: 'Payment system is temporarily unavailable. Our team has been notified.',
        severity: 'error',
        suggestedAction: 'Try again in a few minutes',
        escalationRequired: true,
        impactDescription: 'Payment processing unavailable',
      };
    });

    // Twilio error transformations
    this.errorTransformations.set('twilio', (error: any) => {
      if (error.message?.includes('invalid_phone')) {
        return {
          originalError: error.message,
          userMessage: 'Phone number format is invalid. Please check and try again.',
          severity: 'warning',
          suggestedAction: 'Verify phone number format',
          escalationRequired: false,
          impactDescription: 'SMS delivery failed',
        };
      }

      return {
        originalError: error.message || 'Unknown SMS error',
        userMessage: 'SMS service is temporarily unavailable. Notifications may be delayed.',
        severity: 'warning',
        workaround: 'Check email for important updates',
        escalationRequired: false,
        impactDescription: 'SMS notifications delayed',
      };
    });

    // Samsara error transformations
    this.errorTransformations.set('samsara', (error: any) => {
      return {
        originalError: error.message || 'Unknown fleet tracking error',
        userMessage: 'Fleet tracking data may be delayed. Vehicle locations will update shortly.',
        severity: 'warning',
        workaround: 'Use last known vehicle positions',
        escalationRequired: true,
        impactDescription: 'Real-time fleet tracking affected',
      };
    });

    // Maps error transformations
    this.errorTransformations.set('maps', (error: any) => {
      return {
        originalError: error.message || 'Unknown mapping error',
        userMessage: 'Route optimization temporarily unavailable. Using cached routes.',
        severity: 'warning',
        workaround: 'Manual route planning available',
        escalationRequired: false,
        impactDescription: 'Route optimization degraded',
      };
    });

    // Default transformation for unknown services
    this.errorTransformations.set('default', (error: any) => {
      return {
        originalError: error.message || 'Unknown service error',
        userMessage: 'A service is temporarily unavailable. Our team is working to restore it.',
        severity: 'error',
        escalationRequired: true,
        impactDescription: 'Service functionality limited',
      };
    });

    logger.debug('Error transformations initialized', {
      totalTransformations: this.errorTransformations.size,
    });
  }

  /**
   * Initialize alert thresholds for proactive monitoring
   */
  private initializeAlertThresholds(): void {
    this.alertThresholds.set('response_time', {
      warning: 2000, // 2 seconds
      critical: 5000, // 5 seconds
    });

    this.alertThresholds.set('error_rate', {
      warning: 5, // 5%
      critical: 15, // 15%
    });

    this.alertThresholds.set('uptime', {
      warning: 95, // 95%
      critical: 90, // 90%
    });

    logger.debug('Alert thresholds initialized');
  }

  /**
   * Start real-time monitoring
   */
  private async startRealTimeMonitoring(): Promise<void> {
    // Monitor status every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.performStatusCheck();
    }, 10000);

    logger.info('Real-time API status monitoring started');
  }

  /**
   * Initialize status indicators for all services
   */
  private async initializeStatusIndicators(): Promise<void> {
    const services = ['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'];

    for (const serviceName of services) {
      const initialStatus: ApiStatusIndicator = {
        serviceName,
        status: 'operational',
        responseTime: 0,
        uptime: 100,
        errorRate: 0,
        userFriendlyMessage: 'All systems operational',
        impactLevel: 'none',
        workaroundAvailable: false,
        dependentServices: this.serviceDependencies.get(serviceName)?.dependents || [],
        timestamp: new Date(),
      };

      this.statusIndicators.set(serviceName, initialStatus);
    }

    // Broadcast initial status to Frontend
    await this.broadcastStatusUpdate('initialization');

    logger.info('Status indicators initialized for all services');
  }

  /**
   * Setup proactive health checks
   */
  private async setupProactiveHealthChecks(): Promise<void> {
    // Schedule proactive health analysis job
    await jobQueue.addJob(
      'external-api-coordination',
      'proactive-health-check',
      {
        jobType: 'proactive-health-check',
        checkInterval: 'every_5_minutes',
      },
      {
        repeat: { every: 300000 }, // 5 minutes
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    );

    logger.info('Proactive health checks scheduled');
  }

  /**
   * Start incident tracking
   */
  private async startIncidentTracking(): Promise<void> {
    // Load historical incidents from Redis
    try {
      const historicalData = await redisClient.get('api_incidents_history');
      if (historicalData) {
        this.incidentHistory = JSON.parse(historicalData);
      }
    } catch (error) {
      logger.warn('Could not load incident history', { error: error.message });
    }

    logger.info('Incident tracking started');
  }

  /**
   * Perform comprehensive status check
   */
  private async performStatusCheck(): Promise<void> {
    try {
      // Get latest service statuses from ExternalServicesManager
      const serviceStatuses = await externalServicesManager.getAllServiceStatuses();

      for (const serviceStatus of serviceStatuses) {
        await this.updateStatusIndicator(serviceStatus);
      }

      // Check for cascade failures
      await this.checkCascadeFailures();

      // Broadcast status updates to Frontend
      await this.broadcastStatusUpdate('periodic_check');

    } catch (error) {
      logger.error('Status check failed', {
        error: error.message,
      });
    }
  }

  /**
   * Update status indicator with real-time data
   */
  private async updateStatusIndicator(serviceStatus: any): Promise<void> {
    const serviceName = serviceStatus.name;
    const currentIndicator = this.statusIndicators.get(serviceName);

    if (!currentIndicator) {
      return;
    }

    // Determine user-friendly status
    let userFriendlyStatus: ApiStatusIndicator['status'] = 'operational';
    let impactLevel: ApiStatusIndicator['impactLevel'] = 'none';
    let userFriendlyMessage = 'All systems operational';

    if (serviceStatus.status === 'unhealthy') {
      userFriendlyStatus = 'major_outage';
      impactLevel = 'critical';
      userFriendlyMessage = 'Service is currently unavailable';
    } else if (serviceStatus.status === 'degraded') {
      userFriendlyStatus = 'degraded';
      impactLevel = 'medium';
      userFriendlyMessage = 'Service is experiencing some issues';
    } else if (serviceStatus.responseTime > this.alertThresholds.get('response_time')?.warning) {
      userFriendlyStatus = 'degraded';
      impactLevel = 'low';
      userFriendlyMessage = 'Service is responding slower than usual';
    } else if (serviceStatus.errorCount > 0) {
      userFriendlyStatus = 'partial_outage';
      impactLevel = 'medium';
      userFriendlyMessage = 'Some requests are failing';
    }

    // Update indicator
    const updatedIndicator: ApiStatusIndicator = {
      ...currentIndicator,
      status: userFriendlyStatus,
      responseTime: serviceStatus.responseTime,
      uptime: serviceStatus.uptime || 0,
      errorRate: serviceStatus.errorCount > 0 ? 
        (serviceStatus.errorCount / (serviceStatus.errorCount + serviceStatus.successCount)) * 100 : 0,
      userFriendlyMessage,
      impactLevel,
      estimatedResolution: this.getEstimatedResolution(userFriendlyStatus, serviceName),
      workaroundAvailable: this.hasWorkaround(serviceName, userFriendlyStatus),
      timestamp: new Date(),
    };

    // Check for status changes
    const statusChanged = currentIndicator.status !== updatedIndicator.status;
    
    this.statusIndicators.set(serviceName, updatedIndicator);

    // Handle status changes
    if (statusChanged) {
      await this.handleStatusChange(serviceName, currentIndicator.status, updatedIndicator.status);
    }

    // Check alert thresholds
    await this.checkAlertThresholds(serviceName, updatedIndicator);
  }

  /**
   * Handle status changes and incidents
   */
  private async handleStatusChange(
    serviceName: string,
    oldStatus: ApiStatusIndicator['status'],
    newStatus: ApiStatusIndicator['status']
  ): Promise<void> {
    logger.info('Service status changed', {
      serviceName,
      oldStatus,
      newStatus,
    });

    // Create incident record
    const incident = {
      serviceName,
      oldStatus,
      newStatus,
      timestamp: new Date(),
      severity: this.getIncidentSeverity(newStatus),
      resolved: newStatus === 'operational',
    };

    this.incidentHistory.push(incident);

    // Keep only last 100 incidents
    if (this.incidentHistory.length > 100) {
      this.incidentHistory = this.incidentHistory.slice(-100);
    }

    // Store incident history in Redis
    try {
      await redisClient.setex(
        'api_incidents_history',
        86400, // 24 hours
        JSON.stringify(this.incidentHistory)
      );
    } catch (error) {
      logger.warn('Could not store incident history', { error: error.message });
    }

    // Broadcast status change
    await this.broadcastStatusChange(serviceName, oldStatus, newStatus, incident);

    // Check for cascade impact
    await this.assessCascadeImpact(serviceName, newStatus);
  }

  /**
   * Check for cascade failures
   */
  private async checkCascadeFailures(): Promise<void> {
    const cascadeRisks = [];

    for (const [serviceName, dependency] of this.serviceDependencies.entries()) {
      const serviceIndicator = this.statusIndicators.get(serviceName);
      
      if (serviceIndicator && serviceIndicator.status !== 'operational') {
        // Check impact on dependent services
        for (const dependentService of dependency.dependents) {
          cascadeRisks.push({
            failedService: serviceName,
            impactedService: dependentService,
            riskLevel: dependency.cascadeRisk,
            criticalPath: dependency.criticalPath,
          });
        }
      }
    }

    if (cascadeRisks.length > 0) {
      await this.handleCascadeRisk(cascadeRisks);
    }
  }

  /**
   * Handle cascade risk scenarios
   */
  private async handleCascadeRisk(cascadeRisks: any[]): Promise<void> {
    const criticalRisks = cascadeRisks.filter(risk => risk.criticalPath && risk.riskLevel === 'high');

    if (criticalRisks.length > 0) {
      // Send emergency alert for critical cascade risks
      socketManager.sendToRole('admin', 'cascade_failure_risk', {
        criticalRisks,
        totalRisks: cascadeRisks.length,
        timestamp: new Date().toISOString(),
        priority: 'EMERGENCY',
        recommendedActions: this.getCascadeRecoveryActions(criticalRisks),
      });

      logger.error('Critical cascade failure risk detected', {
        criticalRisks,
      });
    }

    // Broadcast general cascade risk information
    socketManager.broadcastToRoom('api_status_updates', 'cascade_risk_detected', {
      cascadeRisks,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check alert thresholds and send notifications
   */
  private async checkAlertThresholds(
    serviceName: string,
    indicator: ApiStatusIndicator
  ): Promise<void> {
    const alerts = [];

    // Response time alerts
    const responseTimeThresholds = this.alertThresholds.get('response_time');
    if (indicator.responseTime > responseTimeThresholds.critical) {
      alerts.push({
        type: 'response_time',
        severity: 'critical',
        message: `${serviceName} response time is critically slow (${indicator.responseTime}ms)`,
        threshold: responseTimeThresholds.critical,
        currentValue: indicator.responseTime,
      });
    } else if (indicator.responseTime > responseTimeThresholds.warning) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `${serviceName} response time is elevated (${indicator.responseTime}ms)`,
        threshold: responseTimeThresholds.warning,
        currentValue: indicator.responseTime,
      });
    }

    // Error rate alerts
    const errorRateThresholds = this.alertThresholds.get('error_rate');
    if (indicator.errorRate > errorRateThresholds.critical) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `${serviceName} error rate is critically high (${indicator.errorRate.toFixed(1)}%)`,
        threshold: errorRateThresholds.critical,
        currentValue: indicator.errorRate,
      });
    } else if (indicator.errorRate > errorRateThresholds.warning) {
      alerts.push({
        type: 'error_rate',
        severity: 'warning',
        message: `${serviceName} error rate is elevated (${indicator.errorRate.toFixed(1)}%)`,
        threshold: errorRateThresholds.warning,
        currentValue: indicator.errorRate,
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendProactiveAlerts(serviceName, alerts);
    }
  }

  /**
   * Send proactive alerts
   */
  private async sendProactiveAlerts(serviceName: string, alerts: any[]): Promise<void> {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');

    // Send critical alerts to admins immediately
    if (criticalAlerts.length > 0) {
      socketManager.sendToRole('admin', 'proactive_critical_alert', {
        serviceName,
        alerts: criticalAlerts,
        timestamp: new Date().toISOString(),
        priority: 'HIGH',
        suggestedActions: this.getProactiveActions(serviceName, criticalAlerts),
      });
    }

    // Broadcast all alerts to monitoring room
    socketManager.broadcastToRoom('api_status_updates', 'proactive_alerts', {
      serviceName,
      alerts,
      timestamp: new Date().toISOString(),
    });

    logger.warn('Proactive alerts sent', {
      serviceName,
      alertCount: alerts.length,
      criticalAlerts: criticalAlerts.length,
    });
  }

  /**
   * Transform error into user-friendly message
   */
  public transformError(serviceName: string, error: any): UserFriendlyError {
    const transformer = this.errorTransformations.get(serviceName) || 
                      this.errorTransformations.get('default')!;
    
    return transformer(error);
  }

  /**
   * Get current API status for Frontend
   */
  public getCurrentApiStatus(): ApiStatusIndicator[] {
    return Array.from(this.statusIndicators.values());
  }

  /**
   * Get service status by name
   */
  public getServiceStatus(serviceName: string): ApiStatusIndicator | null {
    return this.statusIndicators.get(serviceName) || null;
  }

  /**
   * Broadcast status updates to Frontend
   */
  private async broadcastStatusUpdate(trigger: string): Promise<void> {
    const currentStatus = this.getCurrentApiStatus();
    
    socketManager.broadcastToRoom('api_status_updates', 'status_indicators_update', {
      statusIndicators: currentStatus,
      trigger,
      timestamp: new Date().toISOString(),
      overallHealth: this.calculateOverallHealth(currentStatus),
    });
  }

  /**
   * Broadcast specific status change
   */
  private async broadcastStatusChange(
    serviceName: string,
    oldStatus: string,
    newStatus: string,
    incident: any
  ): Promise<void> {
    socketManager.broadcastToRoom('api_status_updates', 'service_status_changed', {
      serviceName,
      oldStatus,
      newStatus,
      incident,
      timestamp: new Date().toISOString(),
      userFriendlyMessage: this.statusIndicators.get(serviceName)?.userFriendlyMessage,
    });

    // Send specific notifications for critical changes
    if (newStatus === 'major_outage') {
      socketManager.sendToRole('admin', 'service_major_outage', {
        serviceName,
        incident,
        affectedFeatures: this.getAffectedFeatures(serviceName),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Helper methods
   */
  private getEstimatedResolution(status: string, serviceName: string): string | undefined {
    const resolutionTimes = {
      degraded: '5-10 minutes',
      partial_outage: '15-30 minutes',
      major_outage: '1-2 hours',
      maintenance: 'As scheduled',
    };

    return resolutionTimes[status as keyof typeof resolutionTimes];
  }

  private hasWorkaround(serviceName: string, status: string): boolean {
    const workarounds = {
      stripe: status !== 'major_outage',
      twilio: true, // Email fallback
      sendgrid: true, // SMS fallback
      maps: true, // Cached routes
      samsara: false,
      airtable: true, // Local caching
    };

    return workarounds[serviceName as keyof typeof workarounds] || false;
  }

  private getIncidentSeverity(status: string): string {
    const severityMap = {
      operational: 'resolved',
      degraded: 'minor',
      partial_outage: 'major',
      major_outage: 'critical',
      maintenance: 'scheduled',
    };

    return severityMap[status as keyof typeof severityMap] || 'unknown';
  }

  private getCascadeRecoveryActions(criticalRisks: any[]): string[] {
    const actions = [
      'Activate backup systems for critical services',
      'Switch to manual processes where possible',
      'Notify affected users about service degradation',
      'Prioritize recovery of critical path services',
    ];

    return actions;
  }

  private getProactiveActions(serviceName: string, alerts: any[]): string[] {
    const actions = [];
    
    for (const alert of alerts) {
      switch (alert.type) {
        case 'response_time':
          actions.push(`Investigate ${serviceName} performance bottlenecks`);
          actions.push('Scale up service resources if needed');
          break;
        case 'error_rate':
          actions.push(`Review ${serviceName} error logs`);
          actions.push('Check for recent deployments or configuration changes');
          break;
      }
    }

    return actions;
  }

  private calculateOverallHealth(statusIndicators: ApiStatusIndicator[]): any {
    const statusCounts = {
      operational: 0,
      degraded: 0,
      partial_outage: 0,
      major_outage: 0,
      maintenance: 0,
    };

    for (const indicator of statusIndicators) {
      statusCounts[indicator.status]++;
    }

    let overallStatus = 'operational';
    if (statusCounts.major_outage > 0) {
      overallStatus = 'major_outage';
    } else if (statusCounts.partial_outage > 0) {
      overallStatus = 'partial_outage';
    } else if (statusCounts.degraded > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      totalServices: statusIndicators.length,
      operationalServices: statusCounts.operational,
      degradedServices: statusCounts.degraded,
      statusCounts,
    };
  }

  private getAffectedFeatures(serviceName: string): string[] {
    const featureMap = {
      stripe: ['Payment processing', 'Subscription management', 'Billing'],
      twilio: ['SMS notifications', 'Customer communications', 'Driver alerts'],
      sendgrid: ['Email notifications', 'Customer emails', 'Reports'],
      samsara: ['Fleet tracking', 'Vehicle monitoring', 'Driver safety'],
      maps: ['Route optimization', 'Location services', 'Navigation'],
      airtable: ['Data synchronization', 'Reporting', 'External integrations'],
    };

    return featureMap[serviceName as keyof typeof featureMap] || ['Unknown features'];
  }

  private assessCascadeImpact(serviceName: string, newStatus: string): Promise<void> {
    // Implementation for assessing cascade impact
    return Promise.resolve();
  }

  /**
   * Get monitoring statistics
   */
  public getMonitoringStats(): any {
    return {
      totalServices: this.statusIndicators.size,
      operationalServices: Array.from(this.statusIndicators.values()).filter(s => s.status === 'operational').length,
      incidentCount: this.incidentHistory.length,
      lastUpdate: new Date(),
      monitoringActive: this.monitoringInterval !== null,
    };
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.statusIndicators.clear();
    this.incidentHistory = [];

    logger.info('API Status Monitoring Service shutdown complete');
  }
}

// Export singleton instance
export const apiStatusMonitoringService = new ApiStatusMonitoringService();
export default ApiStatusMonitoringService;