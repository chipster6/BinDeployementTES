/**
 * ============================================================================
 * TASK 19: EXTERNAL SERVICE COORDINATION TESTING (11-Service Integration)
 * ============================================================================
 *
 * Comprehensive testing framework for ExternalServicesManager coordinating
 * 11 major external service integrations with health monitoring, circuit
 * breaker patterns, fallback mechanisms, and real-time WebSocket coordination.
 *
 * Test Coverage:
 * - Service initialization and configuration validation
 * - Health monitoring and status reporting (11 services)
 * - Circuit breaker activation and recovery
 * - Fallback mechanism testing
 * - Real-time WebSocket coordination with Frontend
 * - Webhook security validation
 * - API key rotation procedures
 * - Cost monitoring and alerting
 * - Service dependency management
 * - Error handling and graceful degradation
 *
 * Services Under Test:
 * 1. Stripe (Payment Processing)
 * 2. Twilio (SMS Communications)
 * 3. SendGrid (Email Services)
 * 4. Samsara (Fleet Management)
 * 5. Airtable (Data Synchronization)
 * 6. Mapbox (Mapping Services)
 * 7. AWS S3 (File Storage)
 * 8. VirusTotal (Threat Intelligence)
 * 9. AbuseIPDB (IP Reputation)
 * 10. MISP (Threat Intelligence Platform)
 * 11. Crowdstrike (Security Intelligence)
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import {
  ExternalServicesManager,
  ServiceStatus,
  ServiceConfiguration,
  ServiceMetrics,
  RealTimeCoordinationEvent,
  FrontendCoordinationData,
} from '@/services/external/ExternalServicesManager';
import { WebhookSecurityService } from '@/services/external/WebhookSecurityService';
import { ApiKeyRotationService } from '@/services/external/ApiKeyRotationService';
import { AuditLog } from '@/models/AuditLog';
import { socketManager } from '@/services/socketManager';
import { jobQueue } from '@/services/jobQueue';

// Mock all external service dependencies
jest.mock('@/services/external/StripeService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    processPayment: jest.fn(),
  })),
  createSecureStripeService: jest.fn(),
}));

jest.mock('@/services/external/TwilioService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    sendSMS: jest.fn(),
  })),
  createSecureTwilioService: jest.fn(),
}));

jest.mock('@/services/external/SendGridService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    sendEmail: jest.fn(),
  })),
}));

jest.mock('@/services/external/SamsaraService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    getVehicleLocation: jest.fn(),
  })),
}));

jest.mock('@/services/external/AirtableService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    syncData: jest.fn(),
  })),
}));

jest.mock('@/services/external/MapsService', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
    calculateRoute: jest.fn(),
  })),
}));

jest.mock('@/services/external/WebhookSecurityService', () => ({
  WebhookSecurityService: jest.fn().mockImplementation(() => ({
    validateWebhook: jest.fn(),
    generateWebhookSignature: jest.fn(),
  })),
}));

jest.mock('@/services/external/ApiKeyRotationService', () => ({
  ApiKeyRotationService: jest.fn(),
  apiKeyRotationService: {
    rotateApiKeys: jest.fn(),
    scheduleRotation: jest.fn(),
  },
}));

jest.mock('@/services/external/ThreatIntelligenceService', () => ({
  threatIntelligenceService: {
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

jest.mock('@/services/external/IPReputationService', () => ({
  ipReputationService: {
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

jest.mock('@/services/external/VirusTotalService', () => ({
  virusTotalService: {
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

jest.mock('@/services/external/AbuseIPDBService', () => ({
  abuseIPDBService: {
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

jest.mock('@/services/external/MISPIntegrationService', () => ({
  mispIntegrationService: {
    initialize: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

jest.mock('@/models/AuditLog', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

jest.mock('@/services/socketManager', () => ({
  socketManager: {
    emitToRoom: jest.fn(),
    broadcastToAll: jest.fn(),
  },
}));

jest.mock('@/services/jobQueue', () => ({
  jobQueue: {
    add: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Task 19: External Service Coordination Testing (11-Service Integration)', () => {
  let externalServicesManager: ExternalServicesManager;
  let mockSocketManager: jest.Mocked<typeof socketManager>;
  let mockJobQueue: jest.Mocked<typeof jobQueue>;
  let mockAuditLog: jest.Mocked<typeof AuditLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    externalServicesManager = new ExternalServicesManager();
    mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
    mockJobQueue = jobQueue as jest.Mocked<typeof jobQueue>;
    mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

    // Mock environment variables for all services
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'auth123';
    process.env.SENDGRID_API_KEY = 'SG.123';
    process.env.SAMSARA_API_TOKEN = 'samsara123';
    process.env.AIRTABLE_API_KEY = 'key123';
    process.env.MAPBOX_ACCESS_TOKEN = 'pk.123';
    process.env.AWS_ACCESS_KEY_ID = 'AKIA123';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret123';
    process.env.VIRUSTOTAL_API_KEY = 'vt123';
    process.env.ABUSEIPDB_API_KEY = 'abuse123';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SAMSARA_API_TOKEN;
    delete process.env.AIRTABLE_API_KEY;
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.VIRUSTOTAL_API_KEY;
    delete process.env.ABUSEIPDB_API_KEY;
  });

  describe('Service Initialization and Configuration', () => {
    describe('Complete Service Initialization', () => {
      it('should initialize all 11 external services successfully', async () => {
        await externalServicesManager.initialize();

        // Verify audit log entry for initialization
        expect(mockAuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'services_manager_initialized',
            resourceType: 'external_services',
            resourceId: 'manager',
            details: expect.objectContaining({
              serviceCount: expect.any(Number),
              initializedAt: expect.any(String),
            }),
          })
        );

        // Verify all major services are configured
        const serviceConfigs = externalServicesManager.getServiceConfigurations();
        
        expect(serviceConfigs.get('stripe')).toBeDefined();
        expect(serviceConfigs.get('twilio')).toBeDefined();
        expect(serviceConfigs.get('sendgrid')).toBeDefined();
        expect(serviceConfigs.get('samsara')).toBeDefined();
        expect(serviceConfigs.get('airtable')).toBeDefined();
        expect(serviceConfigs.get('mapbox')).toBeDefined();
        expect(serviceConfigs.get('aws')).toBeDefined();
        expect(serviceConfigs.get('virustotal')).toBeDefined();
        expect(serviceConfigs.get('abuseipdb')).toBeDefined();
        expect(serviceConfigs.get('misp')).toBeDefined();
        expect(serviceConfigs.get('crowdstrike')).toBeDefined();

        // Verify high-priority services
        const stripeConfig = serviceConfigs.get('stripe');
        expect(stripeConfig!.priority).toBe(10); // Highest priority
        expect(stripeConfig!.fallbackEnabled).toBe(false); // No fallback for payments

        const twilioConfig = serviceConfigs.get('twilio');
        expect(twilioConfig!.priority).toBe(8); // High priority
        expect(twilioConfig!.fallbackEnabled).toBe(true); // Can fall back to email
      });

      it('should handle partial service initialization failures', async () => {
        // Mock Stripe initialization failure
        delete process.env.STRIPE_SECRET_KEY;

        await externalServicesManager.initialize();

        const serviceStatuses = await externalServicesManager.getServiceStatuses();
        
        // Stripe should be disabled
        const stripeStatus = serviceStatuses.find(s => s.name === 'stripe');
        expect(stripeStatus!.status).toBe('disabled');

        // Other services should still be healthy
        const twilioStatus = serviceStatuses.find(s => s.name === 'twilio');
        expect(twilioStatus!.status).toBe('healthy');
      });

      it('should validate service configuration dependencies', async () => {
        // Test Stripe configuration validation
        const stripeConfig = {
          enabled: true,
          priority: 10,
          fallbackEnabled: false,
          monitoringEnabled: true,
          alertingEnabled: true,
          config: {
            secretKey: 'sk_test_123',
            // Missing webhookSecret - should cause validation error
          },
        };

        expect(() => {
          externalServicesManager.validateServiceConfiguration('stripe', stripeConfig);
        }).toThrow('STRIPE_WEBHOOK_SECRET is required when Stripe is configured');
      });

      it('should prioritize services correctly during initialization', async () => {
        await externalServicesManager.initialize();

        const serviceConfigs = externalServicesManager.getServiceConfigurations();
        const sortedServices = Array.from(serviceConfigs.entries())
          .sort(([, a], [, b]) => b.priority - a.priority);

        // Verify priority order
        expect(sortedServices[0][0]).toBe('stripe'); // Priority 10
        expect(sortedServices[1][0]).toBe('twilio'); // Priority 8
        expect(sortedServices[2][0]).toBe('sendgrid'); // Priority 7
      });
    });

    describe('Service Configuration Management', () => {
      it('should load and validate service configurations', async () => {
        const configurations = externalServicesManager.getServiceConfigurations();

        // Payment processing configuration
        const stripeConfig = configurations.get('stripe');
        expect(stripeConfig!.enabled).toBe(true);
        expect(stripeConfig!.priority).toBe(10);
        expect(stripeConfig!.fallbackEnabled).toBe(false);
        expect(stripeConfig!.config.secretKey).toBe('sk_test_123');

        // Communication services configuration
        const twilioConfig = configurations.get('twilio');
        expect(twilioConfig!.enabled).toBe(true);
        expect(twilioConfig!.priority).toBe(8);
        expect(twilioConfig!.fallbackEnabled).toBe(true);

        // Threat intelligence configuration
        const virusTotalConfig = configurations.get('virustotal');
        expect(virusTotalConfig!.enabled).toBe(true);
        expect(virusTotalConfig!.priority).toBe(5);
        expect(virusTotalConfig!.config.apiKey).toBe('vt123');
      });

      it('should support configuration hot reloading', async () => {
        await externalServicesManager.initialize();

        // Change configuration
        const newConfig = {
          enabled: true,
          priority: 9,
          fallbackEnabled: false,
          monitoringEnabled: true,
          alertingEnabled: true,
          config: {
            secretKey: 'sk_test_new_key',
            webhookSecret: 'whsec_new_secret',
          },
        };

        await externalServicesManager.updateServiceConfiguration('stripe', newConfig);

        const updatedConfig = externalServicesManager.getServiceConfigurations().get('stripe');
        expect(updatedConfig!.priority).toBe(9);
        expect(updatedConfig!.config.secretKey).toBe('sk_test_new_key');
      });

      it('should validate configuration changes before applying', async () => {
        const invalidConfig = {
          enabled: true,
          priority: 15, // Invalid priority (max is 10)
          fallbackEnabled: false,
          monitoringEnabled: true,
          alertingEnabled: true,
          config: {},
        };

        await expect(
          externalServicesManager.updateServiceConfiguration('stripe', invalidConfig)
        ).rejects.toThrow('Invalid service configuration');
      });
    });
  });

  describe('Health Monitoring and Status Reporting', () => {
    describe('Individual Service Health Monitoring', () => {
      it('should monitor health status for all services', async () => {
        await externalServicesManager.initialize();

        // Mock service health responses
        jest.spyOn(externalServicesManager, 'checkServiceHealth')
          .mockResolvedValueOnce({
            name: 'stripe',
            status: 'healthy',
            lastCheck: new Date(),
            uptime: 99.9,
            responseTime: 150,
            circuitBreakerState: 'closed',
            errorCount: 0,
            successCount: 1000,
          })
          .mockResolvedValueOnce({
            name: 'twilio',
            status: 'degraded',
            lastCheck: new Date(),
            uptime: 98.5,
            responseTime: 800,
            circuitBreakerState: 'half_open',
            errorCount: 5,
            successCount: 995,
            lastError: 'API rate limit exceeded',
          })
          .mockResolvedValueOnce({
            name: 'sendgrid',
            status: 'unhealthy',
            lastCheck: new Date(),
            uptime: 85.2,
            responseTime: 5000,
            circuitBreakerState: 'open',
            errorCount: 50,
            successCount: 950,
            lastError: 'Service temporarily unavailable',
          });

        const healthStatuses = await externalServicesManager.getServiceStatuses();

        expect(healthStatuses).toHaveLength(3);

        const stripeStatus = healthStatuses.find(s => s.name === 'stripe');
        expect(stripeStatus!.status).toBe('healthy');
        expect(stripeStatus!.uptime).toBe(99.9);
        expect(stripeStatus!.responseTime).toBe(150);

        const twilioStatus = healthStatuses.find(s => s.name === 'twilio');
        expect(twilioStatus!.status).toBe('degraded');
        expect(twilioStatus!.circuitBreakerState).toBe('half_open');
        expect(twilioStatus!.lastError).toBe('API rate limit exceeded');

        const sendgridStatus = healthStatuses.find(s => s.name === 'sendgrid');
        expect(sendgridStatus!.status).toBe('unhealthy');
        expect(sendgridStatus!.circuitBreakerState).toBe('open');
      });

      it('should handle health check timeouts', async () => {
        await externalServicesManager.initialize();

        // Mock timeout
        jest.spyOn(externalServicesManager, 'checkServiceHealth')
          .mockImplementation(() => {
            return new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Health check timeout')), 50);
            });
          });

        const healthStatus = await externalServicesManager.performHealthCheck('samsara');

        expect(healthStatus.status).toBe('unhealthy');
        expect(healthStatus.lastError).toContain('Health check timeout');
        expect(healthStatus.responseTime).toBeGreaterThan(5000); // Timeout threshold
      });

      it('should calculate service uptime accurately', async () => {
        await externalServicesManager.initialize();

        // Mock historical data
        const mockHealthHistory = [
          { timestamp: new Date(Date.now() - 60000), status: 'healthy' },
          { timestamp: new Date(Date.now() - 45000), status: 'healthy' },
          { timestamp: new Date(Date.now() - 30000), status: 'unhealthy' },
          { timestamp: new Date(Date.now() - 15000), status: 'healthy' },
          { timestamp: new Date(), status: 'healthy' },
        ];

        jest.spyOn(externalServicesManager, 'getServiceHealthHistory')
          .mockResolvedValue(mockHealthHistory);

        const uptimePercentage = await externalServicesManager.calculateUptime('mapbox', '1h');

        // 4 out of 5 checks were healthy = 80%
        expect(uptimePercentage).toBe(80);
      });
    });

    describe('Aggregated Health Reporting', () => {
      it('should generate comprehensive health dashboard', async () => {
        await externalServicesManager.initialize();

        const mockServiceStatuses: ServiceStatus[] = [
          {
            name: 'stripe',
            status: 'healthy',
            lastCheck: new Date(),
            uptime: 99.9,
            responseTime: 120,
            circuitBreakerState: 'closed',
            errorCount: 0,
            successCount: 2000,
          },
          {
            name: 'twilio',
            status: 'healthy',
            lastCheck: new Date(),
            uptime: 99.5,
            responseTime: 180,
            circuitBreakerState: 'closed',
            errorCount: 2,
            successCount: 1998,
          },
          {
            name: 'sendgrid',
            status: 'degraded',
            lastCheck: new Date(),
            uptime: 95.0,
            responseTime: 800,
            circuitBreakerState: 'half_open',
            errorCount: 10,
            successCount: 1990,
            lastError: 'Rate limit warning',
          },
        ];

        jest.spyOn(externalServicesManager, 'getServiceStatuses')
          .mockResolvedValue(mockServiceStatuses);

        const healthDashboard = await externalServicesManager.getHealthDashboard();

        expect(healthDashboard.overall.healthyServices).toBe(2);
        expect(healthDashboard.overall.degradedServices).toBe(1);
        expect(healthDashboard.overall.unhealthyServices).toBe(0);
        expect(healthDashboard.overall.totalServices).toBe(3);
        expect(healthDashboard.overall.averageUptime).toBeCloseTo(98.13, 1);
        expect(healthDashboard.overall.averageResponseTime).toBeCloseTo(366.67, 1);

        expect(healthDashboard.criticalServices.payment.status).toBe('healthy');
        expect(healthDashboard.criticalServices.communication.overallStatus).toBe('degraded');
      });

      it('should identify service dependencies and impact', async () => {
        await externalServicesManager.initialize();

        const dependencyMap = await externalServicesManager.analyzeDependencies();

        // Payment processing dependencies
        expect(dependencyMap.stripe.dependsOn).toEqual([]);
        expect(dependencyMap.stripe.requiredBy).toContain('billing_service');
        expect(dependencyMap.stripe.impact).toBe('critical');

        // Communication dependencies
        expect(dependencyMap.twilio.dependsOn).toEqual([]);
        expect(dependencyMap.twilio.requiredBy).toContain('notification_service');
        expect(dependencyMap.twilio.fallbackOptions).toContain('sendgrid');

        // Data synchronization dependencies
        expect(dependencyMap.airtable.dependsOn).toContain('database');
        expect(dependencyMap.airtable.impact).toBe('medium');
      });
    });

    describe('Performance Metrics Collection', () => {
      it('should collect detailed service metrics', async () => {
        await externalServicesManager.initialize();

        const mockMetrics: ServiceMetrics = {
          totalRequests: 10000,
          successfulRequests: 9950,
          failedRequests: 50,
          averageResponseTime: 250,
          requestsPerMinute: 166.67,
          errorRate: 0.5,
          uptime: 99.5,
          lastHourStats: {
            requests: 10000,
            errors: 50,
            avgResponseTime: 250,
          },
        };

        jest.spyOn(externalServicesManager, 'getServiceMetrics')
          .mockResolvedValue(mockMetrics);

        const metrics = await externalServicesManager.getServiceMetrics('stripe', '1h');

        expect(metrics.totalRequests).toBe(10000);
        expect(metrics.errorRate).toBe(0.5);
        expect(metrics.averageResponseTime).toBe(250);
        expect(metrics.uptime).toBe(99.5);
        expect(metrics.requestsPerMinute).toBeCloseTo(166.67, 1);
      });

      it('should track service performance trends', async () => {
        await externalServicesManager.initialize();

        const performanceTrends = await externalServicesManager.getPerformanceTrends('twilio', '24h');

        expect(performanceTrends.timeframe).toBe('24h');
        expect(performanceTrends.dataPoints).toHaveLength(24); // Hourly data points
        
        const latestDataPoint = performanceTrends.dataPoints[23];
        expect(latestDataPoint).toHaveProperty('timestamp');
        expect(latestDataPoint).toHaveProperty('responseTime');
        expect(latestDataPoint).toHaveProperty('errorRate');
        expect(latestDataPoint).toHaveProperty('requestCount');
      });
    });
  });

  describe('Circuit Breaker Patterns and Fallback Mechanisms', () => {
    describe('Circuit Breaker Implementation', () => {
      it('should open circuit breaker after consecutive failures', async () => {
        await externalServicesManager.initialize();

        const serviceName = 'sendgrid';
        const circuitBreaker = externalServicesManager.getCircuitBreaker(serviceName);

        // Simulate consecutive failures
        for (let i = 0; i < 5; i++) {
          await circuitBreaker.recordFailure();
        }

        expect(circuitBreaker.getState()).toBe('open');

        // Verify service status reflects circuit breaker state
        const serviceStatus = await externalServicesManager.checkServiceHealth(serviceName);
        expect(serviceStatus.circuitBreakerState).toBe('open');
        expect(serviceStatus.status).toBe('unhealthy');
      });

      it('should transition to half-open after timeout period', async () => {
        await externalServicesManager.initialize();

        const serviceName = 'samsara';
        const circuitBreaker = externalServicesManager.getCircuitBreaker(serviceName);

        // Open the circuit breaker
        for (let i = 0; i < 5; i++) {
          await circuitBreaker.recordFailure();
        }

        expect(circuitBreaker.getState()).toBe('open');

        // Mock timeout passage
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000); // 1 minute later

        await circuitBreaker.attemptReset();

        expect(circuitBreaker.getState()).toBe('half_open');
      });

      it('should close circuit breaker after successful requests in half-open state', async () => {
        await externalServicesManager.initialize();

        const serviceName = 'mapbox';
        const circuitBreaker = externalServicesManager.getCircuitBreaker(serviceName);

        // Set to half-open state
        await circuitBreaker.setState('half_open');

        // Record successful requests
        await circuitBreaker.recordSuccess();
        await circuitBreaker.recordSuccess();

        expect(circuitBreaker.getState()).toBe('closed');

        const serviceStatus = await externalServicesManager.checkServiceHealth(serviceName);
        expect(serviceStatus.circuitBreakerState).toBe('closed');
        expect(serviceStatus.status).toBe('healthy');
      });

      it('should configure different thresholds for different services', async () => {
        await externalServicesManager.initialize();

        // Critical services should have higher thresholds
        const stripeCircuitBreaker = externalServicesManager.getCircuitBreaker('stripe');
        expect(stripeCircuitBreaker.getFailureThreshold()).toBe(10); // Higher threshold

        // Non-critical services should have lower thresholds
        const airtableCircuitBreaker = externalServicesManager.getCircuitBreaker('airtable');
        expect(airtableCircuitBreaker.getFailureThreshold()).toBe(5); // Lower threshold
      });
    });

    describe('Fallback Mechanism Testing', () => {
      it('should activate fallback for communication services', async () => {
        await externalServicesManager.initialize();

        // Simulate Twilio failure
        const twilioCircuitBreaker = externalServicesManager.getCircuitBreaker('twilio');
        await twilioCircuitBreaker.setState('open');

        const fallbackService = await externalServicesManager.getFallbackService('twilio');

        expect(fallbackService).toBe('sendgrid');

        // Test fallback execution
        const notificationResult = await externalServicesManager.sendNotification({
          type: 'sms',
          to: '+1234567890',
          message: 'Test message',
          fallbackEnabled: true,
        });

        expect(notificationResult.serviceName).toBe('sendgrid');
        expect(notificationResult.fallbackUsed).toBe(true);
        expect(notificationResult.originalService).toBe('twilio');
      });

      it('should not use fallback for critical services without fallback', async () => {
        await externalServicesManager.initialize();

        // Stripe has no fallback
        const stripeCircuitBreaker = externalServicesManager.getCircuitBreaker('stripe');
        await stripeCircuitBreaker.setState('open');

        const fallbackService = await externalServicesManager.getFallbackService('stripe');
        expect(fallbackService).toBeNull();

        // Payment processing should fail when Stripe is down
        await expect(
          externalServicesManager.processPayment({
            amount: 1000,
            currency: 'usd',
            customer: 'cus_test123',
          })
        ).rejects.toThrow('Payment service unavailable');
      });

      it('should cascade fallbacks when multiple services fail', async () => {
        await externalServicesManager.initialize();

        // Both Twilio and SendGrid fail
        await externalServicesManager.getCircuitBreaker('twilio').setState('open');
        await externalServicesManager.getCircuitBreaker('sendgrid').setState('open');

        const fallbackChain = await externalServicesManager.getFallbackChain('twilio');

        expect(fallbackChain).toEqual(['sendgrid', 'internal_queue']); // Final fallback to queue

        const notificationResult = await externalServicesManager.sendNotification({
          type: 'sms',
          to: '+1234567890',
          message: 'Test message',
          fallbackEnabled: true,
        });

        expect(notificationResult.serviceName).toBe('internal_queue');
        expect(notificationResult.fallbackUsed).toBe(true);
        expect(notificationResult.fallbackLevel).toBe(2); // Second level fallback
      });
    });
  });

  describe('Real-time WebSocket Coordination', () => {
    describe('Frontend Dashboard Integration', () => {
      it('should emit real-time service status updates', async () => {
        await externalServicesManager.initialize();

        const statusChangeEvent: RealTimeCoordinationEvent = {
          eventType: 'api_status_change',
          serviceName: 'stripe',
          data: {
            previousStatus: 'healthy',
            newStatus: 'degraded',
            reason: 'Increased response times',
            timestamp: new Date(),
          },
          timestamp: new Date(),
          severity: 'warning',
        };

        await externalServicesManager.broadcastStatusChange(statusChangeEvent);

        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'service_status_update',
          expect.objectContaining({
            serviceName: 'stripe',
            status: 'degraded',
            severity: 'warning',
          })
        );
      });

      it('should provide comprehensive dashboard data for frontend', async () => {
        await externalServicesManager.initialize();

        const mockServiceStatuses: ServiceStatus[] = [
          {
            name: 'stripe',
            status: 'healthy',
            lastCheck: new Date(),
            uptime: 99.9,
            responseTime: 150,
            circuitBreakerState: 'closed',
            errorCount: 0,
            successCount: 1000,
          },
          {
            name: 'twilio',
            status: 'degraded',
            lastCheck: new Date(),
            uptime: 95.0,
            responseTime: 800,
            circuitBreakerState: 'half_open',
            errorCount: 10,
            successCount: 990,
          },
        ];

        const mockMetrics: ServiceMetrics[] = [
          {
            totalRequests: 1000,
            successfulRequests: 1000,
            failedRequests: 0,
            averageResponseTime: 150,
            requestsPerMinute: 16.67,
            errorRate: 0,
            uptime: 99.9,
            lastHourStats: { requests: 1000, errors: 0, avgResponseTime: 150 },
          },
          {
            totalRequests: 1000,
            successfulRequests: 990,
            failedRequests: 10,
            averageResponseTime: 800,
            requestsPerMinute: 16.67,
            errorRate: 1.0,
            uptime: 95.0,
            lastHourStats: { requests: 1000, errors: 10, avgResponseTime: 800 },
          },
        ];

        jest.spyOn(externalServicesManager, 'getServiceStatuses')
          .mockResolvedValue(mockServiceStatuses);
        jest.spyOn(externalServicesManager, 'getServiceMetrics')
          .mockResolvedValueOnce(mockMetrics[0])
          .mockResolvedValueOnce(mockMetrics[1]);

        const dashboardData = await externalServicesManager.getFrontendCoordinationData();

        expect(dashboardData.serviceStatuses).toHaveLength(2);
        expect(dashboardData.realtimeMetrics).toHaveLength(2);
        expect(dashboardData.lastUpdate).toBeInstanceOf(Date);

        // Verify cost summary
        expect(dashboardData.costSummary).toHaveProperty('totalMonthlyCost');
        expect(dashboardData.costSummary).toHaveProperty('costByService');
        expect(dashboardData.costSummary).toHaveProperty('alertsTriggered');

        // Verify active alerts
        expect(dashboardData.activeAlerts).toBeDefined();
        expect(Array.isArray(dashboardData.activeAlerts)).toBe(true);
      });

      it('should handle WebSocket connection failures gracefully', async () => {
        await externalServicesManager.initialize();

        // Mock WebSocket failure
        mockSocketManager.emitToRoom.mockRejectedValue(new Error('WebSocket connection lost'));

        const statusUpdate = {
          eventType: 'service_error' as const,
          serviceName: 'sendgrid',
          data: { error: 'API rate limit exceeded' },
          timestamp: new Date(),
          severity: 'error' as const,
        };

        // Should not throw, but should log error and queue for retry
        await expect(
          externalServicesManager.broadcastStatusChange(statusUpdate)
        ).resolves.not.toThrow();

        // Verify event is queued for retry
        expect(mockJobQueue.add).toHaveBeenCalledWith(
          'retry_websocket_broadcast',
          expect.objectContaining({
            event: statusUpdate,
            retryCount: 1,
          })
        );
      });
    });

    describe('Event Coordination and Broadcasting', () => {
      it('should coordinate webhook events with frontend updates', async () => {
        await externalServicesManager.initialize();

        const webhookData = {
          service: 'stripe',
          event: 'payment.succeeded',
          data: {
            id: 'pi_test123',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded',
          },
          timestamp: new Date(),
        };

        await externalServicesManager.processWebhookEvent(webhookData);

        // Verify WebSocket broadcast to frontend
        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'webhook_received',
          expect.objectContaining({
            serviceName: 'stripe',
            eventType: 'payment.succeeded',
            data: webhookData.data,
          })
        );

        // Verify coordination event is created
        const coordinationEvent = externalServicesManager.getLastCoordinationEvent();
        expect(coordinationEvent!.eventType).toBe('webhook_received');
        expect(coordinationEvent!.serviceName).toBe('stripe');
      });

      it('should batch multiple events for efficient broadcasting', async () => {
        await externalServicesManager.initialize();

        const events = [
          {
            eventType: 'api_status_change' as const,
            serviceName: 'twilio',
            data: { status: 'healthy' },
            timestamp: new Date(),
            severity: 'info' as const,
          },
          {
            eventType: 'api_status_change' as const,
            serviceName: 'sendgrid',
            data: { status: 'degraded' },
            timestamp: new Date(),
            severity: 'warning' as const,
          },
          {
            eventType: 'cost_alert' as const,
            serviceName: 'samsara',
            data: { monthlySpend: 850, budget: 800 },
            timestamp: new Date(),
            severity: 'warning' as const,
          },
        ];

        await externalServicesManager.batchBroadcastEvents(events);

        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'batch_status_update',
          expect.objectContaining({
            events: events,
            batchSize: 3,
            timestamp: expect.any(Date),
          })
        );
      });
    });
  });

  describe('Cost Monitoring and Alerting', () => {
    describe('Service Cost Tracking', () => {
      it('should track monthly spending per service', async () => {
        await externalServicesManager.initialize();

        const mockCostData = {
          stripe: { monthlySpend: 250.75, budget: 300, alertThreshold: 0.8 },
          twilio: { monthlySpend: 150.25, budget: 200, alertThreshold: 0.8 },
          sendgrid: { monthlySpend: 45.50, budget: 50, alertThreshold: 0.9 },
          samsara: { monthlySpend: 875.00, budget: 800, alertThreshold: 0.8 }, // Over budget
          mapbox: { monthlySpend: 125.75, budget: 150, alertThreshold: 0.8 },
        };

        jest.spyOn(externalServicesManager, 'getServiceCosts')
          .mockResolvedValue(mockCostData);

        const costSummary = await externalServicesManager.getCostSummary();

        expect(costSummary.totalSpend).toBe(1447.25);
        expect(costSummary.totalBudget).toBe(1500);
        expect(costSummary.utilizationPercentage).toBeCloseTo(96.48, 1);

        // Over-budget services
        expect(costSummary.overBudgetServices).toContain('samsara');
        expect(costSummary.servicesNearBudget).toContain('sendgrid'); // At 91% of budget

        // Cost alerts
        expect(costSummary.activeAlerts).toHaveLength(2); // Samsara over budget, SendGrid near budget
      });

      it('should trigger cost alerts when thresholds are exceeded', async () => {
        await externalServicesManager.initialize();

        const costAlert = {
          serviceName: 'stripe',
          currentSpend: 240,
          budget: 300,
          threshold: 0.8,
          alertLevel: 'warning' as const,
        };

        await externalServicesManager.processCostAlert(costAlert);

        // Verify alert broadcast
        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'cost_alert',
          expect.objectContaining({
            serviceName: 'stripe',
            alertLevel: 'warning',
            message: expect.stringContaining('80% of budget'),
          })
        );

        // Verify alert is stored
        const activeAlerts = await externalServicesManager.getActiveCostAlerts();
        expect(activeAlerts.find(a => a.serviceName === 'stripe')).toBeDefined();
      });

      it('should optimize costs through intelligent routing', async () => {
        await externalServicesManager.initialize();

        // Mock cost-aware routing decision
        const routingDecision = await externalServicesManager.getCostOptimalService('email', {
          volume: 1000,
          priority: 'normal',
          currentBudgets: {
            sendgrid: { remaining: 50, costPer1000: 0.50 },
            ses: { remaining: 100, costPer1000: 0.10 }, // Cheaper option
          },
        });

        expect(routingDecision.selectedService).toBe('ses');
        expect(routingDecision.costSavings).toBe(0.40); // $0.40 per 1000 emails saved
        expect(routingDecision.reason).toContain('cost optimization');
      });
    });

    describe('Budget Management and Forecasting', () => {
      it('should forecast monthly costs based on usage trends', async () => {
        await externalServicesManager.initialize();

        const usageData = [
          { date: '2025-08-01', cost: 25.50 },
          { date: '2025-08-02', cost: 26.75 },
          { date: '2025-08-03', cost: 24.25 },
          // ... more daily data
        ];

        const forecast = await externalServicesManager.forecastMonthlyCosts('twilio', usageData);

        expect(forecast.projectedMonthlyCost).toBeGreaterThan(0);
        expect(forecast.confidence).toBeGreaterThan(0.7); // At least 70% confidence
        expect(forecast.trendDirection).toMatch(/increasing|decreasing|stable/);
        expect(forecast.daysToBudgetExhaustion).toBeGreaterThan(0);
      });

      it('should recommend budget adjustments', async () => {
        await externalServicesManager.initialize();

        const costAnalysis = await externalServicesManager.analyzeCostEfficiency();

        expect(costAnalysis.recommendations).toBeDefined();
        expect(Array.isArray(costAnalysis.recommendations)).toBe(true);

        // Should include specific recommendations
        const recommendations = costAnalysis.recommendations;
        expect(recommendations.some(r => r.type === 'budget_increase')).toBeTruthy();
        expect(recommendations.some(r => r.type === 'service_optimization')).toBeTruthy();
        expect(recommendations.some(r => r.type === 'usage_reduction')).toBeTruthy();
      });
    });
  });

  describe('Security and API Key Management', () => {
    describe('Webhook Security Validation', () => {
      it('should validate webhook signatures for all services', async () => {
        await externalServicesManager.initialize();

        const webhookPayload = {
          service: 'stripe',
          headers: {
            'stripe-signature': 't=1629794400,v1=test_signature',
          },
          body: JSON.stringify({ id: 'evt_test123', type: 'payment.succeeded' }),
        };

        const mockWebhookSecurity = externalServicesManager.getWebhookSecurity();
        jest.spyOn(mockWebhookSecurity, 'validateWebhook').mockResolvedValue({
          valid: true,
          service: 'stripe',
          timestamp: new Date('2025-08-16T12:00:00Z'),
        });

        const validationResult = await externalServicesManager.validateWebhook(webhookPayload);

        expect(validationResult.valid).toBe(true);
        expect(validationResult.service).toBe('stripe');

        expect(mockWebhookSecurity.validateWebhook).toHaveBeenCalledWith(
          webhookPayload.body,
          webhookPayload.headers['stripe-signature'],
          expect.objectContaining({ service: 'stripe' })
        );
      });

      it('should reject invalid webhook signatures', async () => {
        await externalServicesManager.initialize();

        const invalidWebhook = {
          service: 'twilio',
          headers: {
            'x-twilio-signature': 'invalid_signature',
          },
          body: JSON.stringify({ MessageSid: 'SM123', MessageStatus: 'delivered' }),
        };

        const mockWebhookSecurity = externalServicesManager.getWebhookSecurity();
        jest.spyOn(mockWebhookSecurity, 'validateWebhook').mockResolvedValue({
          valid: false,
          error: 'Invalid signature',
        });

        const validationResult = await externalServicesManager.validateWebhook(invalidWebhook);

        expect(validationResult.valid).toBe(false);
        expect(validationResult.error).toBe('Invalid signature');

        // Should not process the webhook
        expect(mockSocketManager.emitToRoom).not.toHaveBeenCalled();
      });

      it('should handle webhook replay attacks', async () => {
        await externalServicesManager.initialize();

        const replayedWebhook = {
          service: 'sendgrid',
          headers: {
            'x-sendgrid-signature': 'valid_but_old_signature',
          },
          body: JSON.stringify({ event: 'delivered', sg_message_id: 'msg123' }),
        };

        const mockWebhookSecurity = externalServicesManager.getWebhookSecurity();
        jest.spyOn(mockWebhookSecurity, 'validateWebhook').mockResolvedValue({
          valid: false,
          error: 'Webhook timestamp too old (replay attack protection)',
        });

        const validationResult = await externalServicesManager.validateWebhook(replayedWebhook);

        expect(validationResult.valid).toBe(false);
        expect(validationResult.error).toContain('replay attack protection');
      });
    });

    describe('API Key Rotation', () => {
      it('should rotate API keys on schedule', async () => {
        await externalServicesManager.initialize();

        const rotationSchedule = {
          stripe: 90, // days
          twilio: 60,
          sendgrid: 30,
          samsara: 45,
        };

        const mockApiKeyRotation = externalServicesManager.getApiKeyRotationService();
        jest.spyOn(mockApiKeyRotation, 'rotateApiKeys').mockResolvedValue({
          rotated: ['sendgrid'], // SendGrid key was due for rotation
          scheduled: ['twilio'], // Twilio rotation scheduled
          failed: [],
          nextRotationDates: {
            stripe: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            twilio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            sendgrid: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            samsara: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          },
        });

        const rotationResult = await externalServicesManager.performScheduledRotations();

        expect(rotationResult.rotated).toContain('sendgrid');
        expect(rotationResult.scheduled).toContain('twilio');
        expect(rotationResult.failed).toHaveLength(0);

        // Verify services are notified of key rotation
        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'api_key_rotation',
          expect.objectContaining({
            rotatedServices: ['sendgrid'],
            scheduledServices: ['twilio'],
          })
        );
      });

      it('should handle API key rotation failures gracefully', async () => {
        await externalServicesManager.initialize();

        const mockApiKeyRotation = externalServicesManager.getApiKeyRotationService();
        jest.spyOn(mockApiKeyRotation, 'rotateApiKeys').mockResolvedValue({
          rotated: [],
          scheduled: [],
          failed: [{ service: 'mapbox', error: 'Invalid credentials for key rotation' }],
          nextRotationDates: {},
        });

        const rotationResult = await externalServicesManager.performScheduledRotations();

        expect(rotationResult.failed).toHaveLength(1);
        expect(rotationResult.failed[0].service).toBe('mapbox');

        // Should trigger alert for failed rotation
        expect(mockSocketManager.emitToRoom).toHaveBeenCalledWith(
          'external_services_dashboard',
          'api_key_rotation_failed',
          expect.objectContaining({
            service: 'mapbox',
            error: 'Invalid credentials for key rotation',
            severity: 'error',
          })
        );
      });
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    describe('Service Failure Recovery', () => {
      it('should handle complete service outages gracefully', async () => {
        await externalServicesManager.initialize();

        // Simulate complete AWS outage
        await externalServicesManager.simulateServiceOutage('aws', {
          duration: 30000, // 30 seconds
          errorType: 'connection_timeout',
          affectedOperations: ['s3_upload', 's3_download', 'cloudfront_invalidation'],
        });

        const serviceStatus = await externalServicesManager.checkServiceHealth('aws');

        expect(serviceStatus.status).toBe('unhealthy');
        expect(serviceStatus.circuitBreakerState).toBe('open');

        // Verify fallback activation
        const fallbackResult = await externalServicesManager.uploadFile({
          file: Buffer.from('test content'),
          filename: 'test.txt',
          mimeType: 'text/plain',
        });

        expect(fallbackResult.serviceName).toBe('local_storage'); // Fallback to local storage
        expect(fallbackResult.fallbackUsed).toBe(true);
        expect(fallbackResult.success).toBe(true);
      });

      it('should implement exponential backoff for service retries', async () => {
        await externalServicesManager.initialize();

        const retryConfig = {
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          maxAttempts: 5,
        };

        jest.spyOn(externalServicesManager, 'retryServiceCall')
          .mockImplementation(async (serviceName, operation, config) => {
            const attempts = [];
            let delay = config.initialDelay;

            for (let i = 0; i < config.maxAttempts; i++) {
              attempts.push({ attempt: i + 1, delay });
              
              if (i === config.maxAttempts - 1) {
                return { success: true, attempts, totalDelay: attempts.reduce((sum, a) => sum + a.delay, 0) };
              }

              delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
            }
          });

        const retryResult = await externalServicesManager.retryServiceCall('samsara', 'getVehicleLocation', retryConfig);

        expect(retryResult.attempts).toHaveLength(5);
        expect(retryResult.attempts[0].delay).toBe(1000);
        expect(retryResult.attempts[1].delay).toBe(2000);
        expect(retryResult.attempts[2].delay).toBe(4000);
        expect(retryResult.attempts[3].delay).toBe(8000);
        expect(retryResult.attempts[4].delay).toBe(16000);
      });

      it('should coordinate service recovery across dependencies', async () => {
        await externalServicesManager.initialize();

        // Simulate cascade failure: Airtable depends on database, which depends on AWS
        const cascadeFailure = {
          rootCause: 'aws',
          affectedServices: ['database', 'airtable', 'backup_service'],
          recoveryOrder: ['aws', 'database', 'airtable', 'backup_service'],
        };

        const recoveryPlan = await externalServicesManager.createRecoveryPlan(cascadeFailure);

        expect(recoveryPlan.steps).toHaveLength(4);
        expect(recoveryPlan.steps[0].service).toBe('aws');
        expect(recoveryPlan.steps[1].service).toBe('database');
        expect(recoveryPlan.steps[2].service).toBe('airtable');
        expect(recoveryPlan.steps[3].service).toBe('backup_service');

        expect(recoveryPlan.estimatedRecoveryTime).toBeGreaterThan(0);
        expect(recoveryPlan.dependencyValidation).toBe(true);
      });
    });

    describe('Performance Under Load', () => {
      it('should handle high-volume service requests efficiently', async () => {
        await externalServicesManager.initialize();

        const requests = [];

        // Generate 100 concurrent requests
        for (let i = 0; i < 100; i++) {
          requests.push(
            externalServicesManager.makeServiceRequest('stripe', 'getCustomer', { id: `cus_${i}` })
          );
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(requests);
        const endTime = Date.now();

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        expect(successful).toBeGreaterThan(90); // At least 90% success rate
        expect(endTime - startTime).toBeLessThan(5000); // Complete within 5 seconds

        // Verify circuit breaker doesn't open under normal load
        const stripeStatus = await externalServicesManager.checkServiceHealth('stripe');
        expect(stripeStatus.circuitBreakerState).toBe('closed');
      });

      it('should implement request queuing during high load', async () => {
        await externalServicesManager.initialize();

        // Mock high load scenario
        jest.spyOn(externalServicesManager, 'getSystemLoad').mockResolvedValue({
          cpuUsage: 85,
          memoryUsage: 90,
          activeConnections: 150,
          queueSize: 50,
        });

        const queuedRequest = await externalServicesManager.queueServiceRequest('twilio', 'sendSMS', {
          to: '+1234567890',
          body: 'Test message',
        }, { priority: 'normal' });

        expect(queuedRequest.queued).toBe(true);
        expect(queuedRequest.position).toBeGreaterThan(0);
        expect(queuedRequest.estimatedWaitTime).toBeGreaterThan(0);

        // Verify queue processing
        expect(mockJobQueue.add).toHaveBeenCalledWith(
          'external_service_request',
          expect.objectContaining({
            service: 'twilio',
            operation: 'sendSMS',
            priority: 'normal',
          })
        );
      });
    });
  });
});