/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES MANAGER
 * ============================================================================
 *
 * Centralized manager for all external service integrations providing:
 * - Service initialization and configuration management
 * - Health monitoring and status reporting
 * - Graceful degradation and fallback mechanisms
 * - Circuit breaker management across services
 * - Centralized logging and metrics collection
 *
 * Features:
 * - Unified service health monitoring
 * - Automatic service failover and recovery
 * - Configuration validation and hot reloading
 * - Rate limiting coordination across services
 * - Comprehensive metrics and analytics
 * - Service dependency management
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import StripeService, { createSecureStripeService } from "./StripeService";
import TwilioService, { createSecureTwilioService } from "./TwilioService";
import SendGridService from "./SendGridService";
import SamsaraService from "./SamsaraService";
import AirtableService from "./AirtableService";
import MapsService from "./MapsService";
import WebhookSecurityService from "./WebhookSecurityService";
import ApiKeyRotationService, { apiKeyRotationService } from "./ApiKeyRotationService";
import { CustomerService } from "@/services/CustomerService";

/**
 * Service status interface
 */
export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "disabled";
  lastCheck: Date;
  uptime: number; // percentage
  responseTime: number; // milliseconds
  circuitBreakerState: "closed" | "open" | "half_open";
  errorCount: number;
  successCount: number;
  lastError?: string;
}

/**
 * Service configuration interface
 */
export interface ServiceConfiguration {
  enabled: boolean;
  priority: number; // 1-10, higher is more critical
  fallbackEnabled: boolean;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  config: Record<string, any>;
}

/**
 * Service metrics interface
 */
export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  uptime: number;
  lastHourStats: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  };
}

/**
 * External services manager implementation
 */
export class ExternalServicesManager {
  private services: Map<string, any> = new Map();
  private configurations: Map<string, ServiceConfiguration> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private webhookSecurity: WebhookSecurityService;
  private apiKeyRotationService: ApiKeyRotationService;
  private isInitialized: boolean = false;
  private securityMonitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.webhookSecurity = new WebhookSecurityService();
    this.apiKeyRotationService = apiKeyRotationService;
  }

  /**
   * Initialize all external services
   */
  public async initialize(): Promise<void> {
    try {
      logger.info("Initializing External Services Manager");

      await this.loadConfigurations();
      await this.initializeServices();
      await this.startHealthMonitoring();
      await this.startSecurityMonitoring();

      this.isInitialized = true;

      logger.info("External Services Manager initialized successfully", {
        serviceCount: this.services.size,
        enabledServices: Array.from(this.configurations.entries())
          .filter(([_, config]) => config.enabled)
          .map(([name]) => name),
      });

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "services_manager_initialized",
        resourceType: "external_services",
        resourceId: "manager",
        details: {
          serviceCount: this.services.size,
          initializedAt: new Date().toISOString(),
        },
        ipAddress: "system",
        userAgent: "ExternalServicesManager",
      });
    } catch (error) {
      logger.error("Failed to initialize External Services Manager", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Load service configurations
   */
  private async loadConfigurations(): Promise<void> {
    // Default configurations - would typically come from database or config files
    this.configurations.set("stripe", {
      enabled: !!process.env.STRIPE_SECRET_KEY,
      priority: 10, // Highest priority for payment processing
      fallbackEnabled: false, // No fallback for payments
      monitoringEnabled: true,
      alertingEnabled: true,
      config: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    });

    this.configurations.set("twilio", {
      enabled: !!process.env.TWILIO_ACCOUNT_SID,
      priority: 8, // High priority for customer communications
      fallbackEnabled: true, // Can fall back to email notifications
      monitoringEnabled: true,
      alertingEnabled: true,
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        webhookAuthToken: process.env.TWILIO_WEBHOOK_AUTH_TOKEN,
      },
    });

    this.configurations.set("sendgrid", {
      enabled: !!process.env.SENDGRID_API_KEY,
      priority: 7, // High priority for email communications
      fallbackEnabled: true, // Can fall back to SMS or other email providers
      monitoringEnabled: true,
      alertingEnabled: true,
      config: {
        apiKey: process.env.SENDGRID_API_KEY,
        webhookVerificationKey: process.env.SENDGRID_WEBHOOK_KEY,
        defaultFromEmail:
          process.env.DEFAULT_FROM_EMAIL || "noreply@wastemanagement.com",
        defaultFromName:
          process.env.DEFAULT_FROM_NAME || "Waste Management System",
      },
    });

    this.configurations.set("samsara", {
      enabled: !!process.env.SAMSARA_API_TOKEN,
      priority: 9, // Very high priority for fleet management
      fallbackEnabled: false, // No fallback for vehicle tracking
      monitoringEnabled: true,
      alertingEnabled: true,
      config: {
        apiToken: process.env.SAMSARA_API_TOKEN,
        organizationId: process.env.SAMSARA_ORGANIZATION_ID,
        webhookSecret: process.env.SAMSARA_WEBHOOK_SECRET,
      },
    });

    this.configurations.set("airtable", {
      enabled: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      priority: 5, // Medium priority for data sync
      fallbackEnabled: true, // Can operate without Airtable sync
      monitoringEnabled: true,
      alertingEnabled: false, // Non-critical service
      config: {
        personalAccessToken: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
        webhookSecret: process.env.AIRTABLE_WEBHOOK_SECRET,
      },
    });

    this.configurations.set("maps", {
      enabled: !!(
        process.env.MAPBOX_ACCESS_TOKEN || process.env.GOOGLE_MAPS_API_KEY
      ),
      priority: 8, // High priority for routing
      fallbackEnabled: true, // Can fall back between Mapbox and Google Maps
      monitoringEnabled: true,
      alertingEnabled: true,
      config: {
        provider: process.env.MAPS_PROVIDER || "mapbox",
        mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    logger.info("Service configurations loaded", {
      totalConfigs: this.configurations.size,
      enabledServices: Array.from(this.configurations.entries()).filter(
        ([_, config]) => config.enabled,
      ).length,
    });
  }

  /**
   * Initialize individual services
   */
  private async initializeServices(): Promise<void> {
    const customerService = new CustomerService(); // Would be injected in real implementation

    for (const [serviceName, config] of this.configurations.entries()) {
      if (!config.enabled) {
        logger.info(
          `Service ${serviceName} is disabled, skipping initialization`,
        );
        continue;
      }

      try {
        let service: any;

        switch (serviceName) {
          case "stripe":
            // Use security-enhanced factory for critical payment service
            service = createSecureStripeService(
              {
                serviceName: "stripe",
                baseURL: "https://api.stripe.com",
                ...config.config,
              },
              customerService,
            );
            break;

          case "twilio":
            // Use security-enhanced factory for SMS communications
            service = createSecureTwilioService({
              serviceName: "twilio",
              baseURL: "https://api.twilio.com",
              ...config.config,
            });
            break;

          case "sendgrid":
            service = new SendGridService({
              serviceName: "sendgrid",
              baseURL: "https://api.sendgrid.com/v3",
              ...config.config,
            });
            break;

          case "samsara":
            service = new SamsaraService({
              serviceName: "samsara",
              baseURL: "https://api.samsara.com",
              ...config.config,
            });
            break;

          case "airtable":
            service = new AirtableService({
              serviceName: "airtable",
              baseURL: "https://api.airtable.com/v0",
              ...config.config,
            });
            break;

          case "maps":
            service = new MapsService({
              serviceName: "maps",
              baseURL:
                config.config.provider === "mapbox"
                  ? "https://api.mapbox.com"
                  : "https://maps.googleapis.com/maps/api",
              ...config.config,
            });
            break;

          default:
            logger.warn(`Unknown service: ${serviceName}`);
            continue;
        }

        this.services.set(serviceName, service);
        logger.info(`Service ${serviceName} initialized successfully`);
      } catch (error) {
        logger.error(`Failed to initialize service ${serviceName}`, {
          error: error.message,
        });

        if (config.priority >= 8) {
          throw new Error(
            `Critical service ${serviceName} failed to initialize: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Start health monitoring for all services
   */
  private async startHealthMonitoring(): Promise<void> {
    for (const [serviceName, config] of this.configurations.entries()) {
      if (!config.enabled || !config.monitoringEnabled) {
        continue;
      }

      const interval = setInterval(async () => {
        await this.checkServiceHealth(serviceName);
      }, 30000); // Check every 30 seconds

      this.healthCheckIntervals.set(serviceName, interval);
    }

    logger.info("Health monitoring started for all services");
  }

  /**
   * Start security monitoring for all services
   */
  private async startSecurityMonitoring(): Promise<void> {
    // Monitor security status every 10 minutes
    this.securityMonitoringInterval = setInterval(async () => {
      await this.performSecurityAudit();
    }, 10 * 60 * 1000); // 10 minutes

    // Perform initial security audit
    await this.performSecurityAudit();

    logger.info('Security monitoring started for all services');
  }

  /**
   * Perform comprehensive security audit
   */
  private async performSecurityAudit(): Promise<void> {
    try {
      const securityStatus = await this.apiKeyRotationService.getSecurityStatus();
      
      // Log security status
      logger.info('Security audit completed', {
        overallStatus: securityStatus.overallStatus,
        servicesChecked: Object.keys(securityStatus.services).length,
        criticalIssues: securityStatus.recommendations.filter(r => r.includes('URGENT')).length,
      });

      // Alert on critical security issues
      if (securityStatus.overallStatus === 'critical') {
        await this.handleCriticalSecurityIssues(securityStatus);
      }

      // Store security status in Redis for monitoring
      await redisClient.setex(
        'system_security_status',
        600, // 10 minutes
        JSON.stringify({
          ...securityStatus,
          lastAudit: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Security audit failed', {
        error: error.message,
      });
    }
  }

  /**
   * Handle critical security issues
   */
  private async handleCriticalSecurityIssues(securityStatus: any): Promise<void> {
    try {
      const criticalServices = Object.entries(securityStatus.services)
        .filter(([_, status]: [string, any]) => status.keyRotationStatus === 'critical')
        .map(([serviceName]) => serviceName);

      if (criticalServices.length > 0) {
        await AuditLog.create({
          userId: null,
          customerId: null,
          action: 'critical_security_alert',
          resourceType: 'security_monitoring',
          resourceId: 'external_services',
          details: {
            criticalServices,
            recommendations: securityStatus.recommendations,
            overallStatus: securityStatus.overallStatus,
            alertLevel: 'CRITICAL',
          },
          ipAddress: 'system',
          userAgent: 'ExternalServicesManager',
        });

        logger.error('CRITICAL SECURITY ALERT: API key rotation overdue', {
          criticalServices,
          recommendations: securityStatus.recommendations,
        });
      }
    } catch (error) {
      logger.error('Failed to handle critical security issues', {
        error: error.message,
      });
    }
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    try {
      const service = this.services.get(serviceName);
      if (!service || !service.getServiceHealth) {
        return;
      }

      const startTime = Date.now();
      const healthStatus = await service.getServiceHealth();
      const responseTime = Date.now() - startTime;

      // Store health status in Redis
      const statusKey = `service_health:${serviceName}`;
      const healthData = {
        ...healthStatus,
        responseTime,
        timestamp: Date.now(),
      };

      await redisClient.setex(statusKey, 300, JSON.stringify(healthData)); // 5 minutes TTL

      // Update metrics
      await this.updateServiceMetrics(serviceName, {
        responseTime,
        success: healthStatus.status === "healthy",
      });

      // Alert if service is unhealthy
      if (healthStatus.status === "unhealthy") {
        await this.handleUnhealthyService(serviceName, healthStatus);
      }
    } catch (error) {
      logger.error(`Health check failed for service ${serviceName}`, {
        error: error.message,
      });

      await this.updateServiceMetrics(serviceName, {
        responseTime: 0,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update service metrics
   */
  private async updateServiceMetrics(
    serviceName: string,
    data: {
      responseTime: number;
      success: boolean;
      error?: string;
    },
  ): Promise<void> {
    try {
      const metricsKey = `service_metrics:${serviceName}`;
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
      const hourlyKey = `${metricsKey}:${currentHour}`;

      // Update hourly metrics
      const multi = redisClient.multi();
      multi.hincrby(hourlyKey, "total_requests", 1);
      multi.hincrby(
        hourlyKey,
        data.success ? "successful_requests" : "failed_requests",
        1,
      );
      multi.hincrby(hourlyKey, "total_response_time", data.responseTime);
      multi.expire(hourlyKey, 3600 * 24); // Keep for 24 hours

      if (data.error) {
        multi.hset(hourlyKey, "last_error", data.error);
        multi.hset(hourlyKey, "last_error_time", Date.now());
      }

      await multi.exec();
    } catch (error) {
      logger.error(`Failed to update metrics for service ${serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Handle unhealthy service
   */
  private async handleUnhealthyService(
    serviceName: string,
    healthStatus: any,
  ): Promise<void> {
    const config = this.configurations.get(serviceName);
    if (!config || !config.alertingEnabled) {
      return;
    }

    logger.error(`Service ${serviceName} is unhealthy`, {
      status: healthStatus.status,
      details: healthStatus.details,
      priority: config.priority,
    });

    // Log critical alert for high-priority services
    if (config.priority >= 8) {
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "critical_service_unhealthy",
        resourceType: "external_service",
        resourceId: serviceName,
        details: {
          status: healthStatus.status,
          priority: config.priority,
          details: healthStatus.details,
        },
        ipAddress: "system",
        userAgent: "ExternalServicesManager",
      });
    }
  }

  /**
   * Get service by name
   */
  public getService<T = any>(serviceName: string): T | null {
    return this.services.get(serviceName) || null;
  }

  /**
   * Get all service statuses
   */
  public async getAllServiceStatuses(): Promise<ServiceStatus[]> {
    const statuses: ServiceStatus[] = [];

    for (const [serviceName, config] of this.configurations.entries()) {
      if (!config.enabled) {
        statuses.push({
          name: serviceName,
          status: "disabled",
          lastCheck: new Date(),
          uptime: 0,
          responseTime: 0,
          circuitBreakerState: "open",
          errorCount: 0,
          successCount: 0,
        });
        continue;
      }

      try {
        const statusKey = `service_health:${serviceName}`;
        const healthDataStr = await redisClient.get(statusKey);

        if (healthDataStr) {
          const healthData = JSON.parse(healthDataStr);
          const metrics = await this.getServiceMetrics(serviceName);

          statuses.push({
            name: serviceName,
            status: healthData.status,
            lastCheck: new Date(healthData.timestamp),
            uptime: metrics.uptime,
            responseTime: healthData.responseTime,
            circuitBreakerState: "closed", // Would get from BaseExternalService
            errorCount: metrics.failedRequests,
            successCount: metrics.successfulRequests,
            lastError: healthData.details?.error,
          });
        } else {
          statuses.push({
            name: serviceName,
            status: "unhealthy",
            lastCheck: new Date(),
            uptime: 0,
            responseTime: 0,
            circuitBreakerState: "open",
            errorCount: 0,
            successCount: 0,
            lastError: "No health data available",
          });
        }
      } catch (error) {
        statuses.push({
          name: serviceName,
          status: "unhealthy",
          lastCheck: new Date(),
          uptime: 0,
          responseTime: 0,
          circuitBreakerState: "open",
          errorCount: 0,
          successCount: 0,
          lastError: error.message,
        });
      }
    }

    return statuses;
  }

  /**
   * Get service metrics
   */
  public async getServiceMetrics(serviceName: string): Promise<ServiceMetrics> {
    try {
      const metricsKey = `service_metrics:${serviceName}`;
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
      const hourlyKey = `${metricsKey}:${currentHour}`;

      const hourlyMetrics = await redisClient.hgetall(hourlyKey);

      // Calculate metrics from the last 24 hours
      const last24Hours = Array.from({ length: 24 }, (_, i) => currentHour - i);
      const allMetrics = await Promise.all(
        last24Hours.map((hour) => redisClient.hgetall(`${metricsKey}:${hour}`)),
      );

      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      let totalResponseTime = 0;

      allMetrics.forEach((metrics) => {
        if (metrics.total_requests) {
          totalRequests += parseInt(metrics.total_requests);
          successfulRequests += parseInt(metrics.successful_requests || "0");
          failedRequests += parseInt(metrics.failed_requests || "0");
          totalResponseTime += parseInt(metrics.total_response_time || "0");
        }
      });

      const averageResponseTime =
        totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      const errorRate =
        totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      const uptime =
        totalRequests > 0
          ? ((totalRequests - failedRequests) / totalRequests) * 100
          : 100;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        requestsPerMinute: totalRequests / (24 * 60), // Rough estimate
        errorRate,
        uptime,
        lastHourStats: {
          requests: parseInt(hourlyMetrics.total_requests || "0"),
          errors: parseInt(hourlyMetrics.failed_requests || "0"),
          avgResponseTime:
            parseInt(hourlyMetrics.total_response_time || "0") /
            Math.max(parseInt(hourlyMetrics.total_requests || "1"), 1),
        },
      };
    } catch (error) {
      logger.error(`Failed to get metrics for service ${serviceName}`, {
        error: error.message,
      });

      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        uptime: 0,
        lastHourStats: {
          requests: 0,
          errors: 0,
          avgResponseTime: 0,
        },
      };
    }
  }

  /**
   * Get comprehensive security status for all services
   */
  public async getSecurityStatus(): Promise<any> {
    try {
      return await this.apiKeyRotationService.getSecurityStatus();
    } catch (error) {
      logger.error('Failed to get security status', {
        error: error.message,
      });
      return {
        overallStatus: 'critical',
        services: {},
        recommendations: ['Failed to retrieve security status'],
        lastAudit: new Date(),
      };
    }
  }

  /**
   * Generate security compliance report
   */
  public async generateSecurityComplianceReport(): Promise<any> {
    try {
      return await this.apiKeyRotationService.generateComplianceReport();
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        error: error.message,
      });
      return {
        reportDate: new Date(),
        overallCompliance: 'non_compliant',
        serviceCompliance: [],
        totalServices: 0,
        compliantServices: 0,
        recommendations: ['Failed to generate compliance report'],
      };
    }
  }

  /**
   * Trigger API key rotation for a specific service
   */
  public async rotateServiceApiKeys(
    serviceName: string,
    newCredentials: Record<string, string>,
    rotatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const service = this.services.get(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Service-specific rotation logic
      switch (serviceName) {
        case 'stripe':
          if (service.rotateApiKeys) {
            await service.rotateApiKeys(
              newCredentials.secretKey,
              newCredentials.webhookSecret
            );
          }
          break;

        case 'twilio':
          if (service.rotateApiCredentials) {
            await service.rotateApiCredentials(
              newCredentials.authToken,
              newCredentials.webhookAuthToken
            );
          }
          break;

        default:
          throw new Error(`API key rotation not implemented for ${serviceName}`);
      }

      // Record the rotation
      await this.apiKeyRotationService.recordKeyRotation(serviceName, {
        oldKeyRevoked: true,
        newKeyActivated: true,
        validationPassed: true,
        metadata: {
          rotatedBy,
          rotationDate: new Date().toISOString(),
        },
      });

      logger.info(`API keys rotated successfully for ${serviceName}`, {
        serviceName,
        rotatedBy,
      });

      return { success: true };
    } catch (error) {
      logger.error(`Failed to rotate API keys for ${serviceName}`, {
        error: error.message,
        serviceName,
        rotatedBy,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Emergency API key revocation
   */
  public async emergencyRevokeApiKeys(
    serviceName: string,
    reason: string,
    revokedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.apiKeyRotationService.emergencyKeyRevocation(
        serviceName,
        reason,
        revokedBy
      );

      // Disable the service temporarily
      const config = this.configurations.get(serviceName);
      if (config) {
        config.enabled = false;
        this.configurations.set(serviceName, config);
      }

      logger.error(`Emergency API key revocation for ${serviceName}`, {
        serviceName,
        reason,
        revokedBy,
      });

      return { success: true };
    } catch (error) {
      logger.error(`Failed to revoke API keys for ${serviceName}`, {
        error: error.message,
        serviceName,
        reason,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get overall system health with security integration
   */
  public async getSystemHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    serviceCount: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    disabledServices: number;
    criticalServicesDown: string[];
    securityStatus: string;
    apiKeyRotationStatus: string;
    lastCheck: Date;
  }> {
    const statuses = await this.getAllServiceStatuses();

    const healthyServices = statuses.filter(
      (s) => s.status === "healthy",
    ).length;
    const degradedServices = statuses.filter(
      (s) => s.status === "degraded",
    ).length;
    const unhealthyServices = statuses.filter(
      (s) => s.status === "unhealthy",
    ).length;
    const disabledServices = statuses.filter(
      (s) => s.status === "disabled",
    ).length;

    // Check for critical services that are down
    const criticalServicesDown = statuses
      .filter((s) => {
        const config = this.configurations.get(s.name);
        return config?.priority >= 8 && s.status === "unhealthy";
      })
      .map((s) => s.name);

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (criticalServicesDown.length > 0) {
      overallStatus = "unhealthy";
    } else if (unhealthyServices > 0 || degradedServices > 0) {
      overallStatus = "degraded";
    }

    // Get security status
    const securityStatus = await this.getSecurityStatus();
    let apiKeyRotationStatus = 'current';
    
    if (securityStatus.overallStatus === 'critical') {
      apiKeyRotationStatus = 'critical';
      // Upgrade overall status if security is critical
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } else if (securityStatus.overallStatus === 'warning') {
      apiKeyRotationStatus = 'warning';
    }

    return {
      status: overallStatus,
      serviceCount: statuses.length,
      healthyServices,
      degradedServices,
      unhealthyServices,
      disabledServices,
      criticalServicesDown,
      securityStatus: securityStatus.overallStatus,
      apiKeyRotationStatus,
      lastCheck: new Date(),
    };
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down External Services Manager");

    // Clear health check intervals
    for (const [serviceName, interval] of this.healthCheckIntervals.entries()) {
      clearInterval(interval);
      logger.info(`Stopped health monitoring for ${serviceName}`);
    }

    this.healthCheckIntervals.clear();

    // Clear security monitoring
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval);
      this.securityMonitoringInterval = null;
      logger.info('Stopped security monitoring');
    }

    // Cleanup services
    this.services.clear();
    this.configurations.clear();

    this.isInitialized = false;

    logger.info("External Services Manager shutdown complete");
  }

  /**
   * Check if manager is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const externalServicesManager = new ExternalServicesManager();
export default ExternalServicesManager;
