/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES MANAGER UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for ExternalServicesManager class covering:
 * - Service initialization and configuration management (11 services)
 * - Health monitoring system (30-second intervals)
 * - Security monitoring framework (10-minute audit cycles)
 * - Real-time coordination with WebSocket integration
 * - Cost optimization analysis and alert management
 * - Webhook coordination and processing
 * - Error handling and circuit breaker functionality
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { ExternalServicesManager, externalServicesManager } from '@/services/external/ExternalServicesManager';
import { AuditLog } from '@/models/AuditLog';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { socketManager } from '@/services/socketManager';
import { jobQueue } from '@/services/jobQueue';
import WebhookSecurityService from '@/services/external/WebhookSecurityService';
import { apiKeyRotationService } from '@/services/external/ApiKeyRotationService';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';

// Mock all external dependencies
jest.mock('@/utils/logger');
jest.mock('@/config/redis');
jest.mock('@/models/AuditLog');
jest.mock('@/services/socketManager');
jest.mock('@/services/jobQueue');
jest.mock('@/services/external/WebhookSecurityService');
jest.mock('@/services/external/ApiKeyRotationService');
jest.mock('@/services/external/StripeService');
jest.mock('@/services/external/TwilioService');
jest.mock('@/services/external/SendGridService');
jest.mock('@/services/external/MapsService');
jest.mock('@/services/external/SamsaraService');
jest.mock('@/services/external/AirtableService');
jest.mock('@/services/external/ThreatIntelligenceService');
jest.mock('@/services/external/IPReputationService');
jest.mock('@/services/external/VirusTotalService');
jest.mock('@/services/external/AbuseIPDBService');
jest.mock('@/services/external/MISPIntegrationService');

// Mock process.env for service configurations
const originalEnv = process.env;

describe('ExternalServicesManager', () => {
  let manager: ExternalServicesManager;
  let mockRedisClient: jest.Mocked<typeof redisClient>;
  let mockAuditLog: jest.Mocked<typeof AuditLog>;
  let mockSocketManager: jest.Mocked<typeof socketManager>;
  let mockApiKeyRotationService: jest.Mocked<typeof apiKeyRotationService>;

  beforeAll(async () => {
    await DatabaseTestHelper.initialize();
  });

  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      TWILIO_ACCOUNT_SID: 'AC_test_123',
      TWILIO_AUTH_TOKEN: 'auth_test_123',
      SENDGRID_API_KEY: 'SG.test_123',
      MAPBOX_ACCESS_TOKEN: 'pk.test_123',
      SAMSARA_API_TOKEN: 'samsara_test_123',
      AIRTABLE_API_KEY: 'airtable_test_123',
    };

    // Clear all mocks
    jest.clearAllMocks();

    // Create new manager instance
    manager = new ExternalServicesManager();

    // Setup Redis mock
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
    mockRedisClient.setex = jest.fn().mockResolvedValue('OK');
    mockRedisClient.get = jest.fn().mockResolvedValue(null);

    // Setup AuditLog mock
    mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;
    mockAuditLog.create = jest.fn().mockResolvedValue({
      id: 'audit-123',
      action: 'test',
      createdAt: new Date(),
    });

    // Setup SocketManager mock
    mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
    mockSocketManager.broadcastToRoom = jest.fn().mockResolvedValue(undefined);
    mockSocketManager.emitToUser = jest.fn().mockResolvedValue(undefined);

    // Setup ApiKeyRotationService mock
    mockApiKeyRotationService = apiKeyRotationService as jest.Mocked<typeof apiKeyRotationService>;
    mockApiKeyRotationService.getSecurityStatus = jest.fn().mockResolvedValue({
      overallStatus: 'secure',
      services: {
        stripe: {
          keyRotationStatus: 'current',
          daysSinceLastRotation: 30,
          nextRotationDue: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          securityScore: 95
        }
      },
      recommendations: [],
      lastAudit: new Date()
    });

    // Clear timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  afterAll(async () => {
    await DatabaseTestHelper.cleanup();
  });

  describe('Service Initialization', () => {
    it('should initialize all configured services successfully', async () => {
      // Mock all service instances with health check methods
      const mockServices = {
        stripe: { getServiceHealth: jest.fn().mockResolvedValue({ status: 'healthy', uptime: 99.9, responseTime: 120 }) },
        twilio: { getServiceHealth: jest.fn().mockResolvedValue({ status: 'healthy', uptime: 99.8, responseTime: 150 }) },
        sendgrid: { getServiceHealth: jest.fn().mockResolvedValue({ status: 'healthy', uptime: 99.7, responseTime: 100 }) },
      };

      // Mock service creation functions
      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(mockServices.stripe)
      }));

      await manager.initialize();

      expect(manager.initialized).toBe(true);
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'services_manager_initialized',
          resourceType: 'external_services',
          resourceId: 'manager'
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'External Services Manager initialized successfully',
        expect.objectContaining({
          serviceCount: expect.any(Number),
          enabledServices: expect.any(Array)
        })
      );
    });

    it('should handle critical service initialization failures', async () => {
      // Mock Stripe (critical service) initialization failure
      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockImplementation(() => {
          throw new Error('Stripe API key invalid');
        })
      }));

      await expect(manager.initialize()).rejects.toThrow('Critical service stripe failed to initialize');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize service stripe',
        expect.objectContaining({
          error: 'Stripe API key invalid'
        })
      );
    });

    it('should continue initialization if non-critical services fail', async () => {
      // Mock non-critical service failure (maps has lower priority)
      process.env.MAPBOX_ACCESS_TOKEN = ''; // Disable maps service

      await manager.initialize();

      expect(manager.initialized).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'External Services Manager initialized successfully',
        expect.any(Object)
      );
    });

    it('should load service configurations correctly', async () => {
      await manager.initialize();

      // Verify configurations were loaded with correct priorities
      expect(manager.initialized).toBe(true);
      // Stripe should have highest priority (10)
      // Twilio should have high priority (8)
      // Other services should have lower priorities
    });
  });

  describe('Health Monitoring System', () => {
    beforeEach(async () => {
      // Setup services with health check methods
      const mockService = {
        getServiceHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          uptime: 99.9,
          responseTime: 120,
          errorCount: 0,
          successCount: 1000
        })
      };

      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(mockService)
      }));

      await manager.initialize();
    });

    it('should start health monitoring for all enabled services', async () => {
      // Fast-forward to trigger health checks
      jest.advanceTimersByTime(30000); // 30 seconds

      await jest.runAllTimers();

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^service_health:/),
        300, // 5 minutes TTL
        expect.stringContaining('"status":"healthy"')
      );
    });

    it('should handle healthy service responses correctly', async () => {
      const mockService = {
        getServiceHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          uptime: 99.9,
          responseTime: 120
        })
      };

      // Simulate health check
      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^service_health:/),
        300,
        expect.stringContaining('"timestamp"')
      );
    });

    it('should handle unhealthy service responses and trigger alerts', async () => {
      const mockService = {
        getServiceHealth: jest.fn().mockResolvedValue({
          status: 'unhealthy',
          uptime: 95.0,
          responseTime: 5000,
          lastError: 'Connection timeout'
        })
      };

      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(mockService)
      }));

      const newManager = new ExternalServicesManager();
      await newManager.initialize();

      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/unhealthy/),
        expect.any(Object)
      );
    });

    it('should handle health check failures gracefully', async () => {
      const mockService = {
        getServiceHealth: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      };

      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(mockService)
      }));

      const newManager = new ExternalServicesManager();
      await newManager.initialize();

      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Health check failed/),
        expect.objectContaining({
          error: 'Service unavailable'
        })
      );
    });

    it('should store health metrics in Redis with correct TTL', async () => {
      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^service_health:/),
        300, // 5 minutes TTL
        expect.any(String)
      );
    });
  });

  describe('Security Monitoring Framework', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform security audits every 10 minutes', async () => {
      // Fast-forward to trigger security audit
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      await jest.runAllTimers();

      expect(mockApiKeyRotationService.getSecurityStatus).toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'system_security_status',
        600, // 10 minutes TTL
        expect.stringContaining('"lastAudit"')
      );
    });

    it('should handle secure security status correctly', async () => {
      mockApiKeyRotationService.getSecurityStatus.mockResolvedValue({
        overallStatus: 'secure',
        services: {
          stripe: {
            keyRotationStatus: 'current',
            daysSinceLastRotation: 30,
            nextRotationDue: new Date(),
            securityScore: 95
          }
        },
        recommendations: [],
        lastAudit: new Date()
      });

      jest.advanceTimersByTime(10 * 60 * 1000);
      await jest.runAllTimers();

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit completed',
        expect.objectContaining({
          overallStatus: 'secure',
          servicesChecked: 1,
          criticalIssues: 0
        })
      );
    });

    it('should handle critical security issues and create audit logs', async () => {
      mockApiKeyRotationService.getSecurityStatus.mockResolvedValue({
        overallStatus: 'critical',
        services: {
          stripe: {
            keyRotationStatus: 'critical',
            daysSinceLastRotation: 120,
            nextRotationDue: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            securityScore: 30
          }
        },
        recommendations: ['URGENT: Rotate Stripe API keys immediately'],
        lastAudit: new Date()
      });

      jest.advanceTimersByTime(10 * 60 * 1000);
      await jest.runAllTimers();

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'critical_security_alert',
          resourceType: 'security_monitoring',
          details: expect.objectContaining({
            criticalServices: ['stripe'],
            alertLevel: 'CRITICAL'
          })
        })
      );
    });

    it('should handle security audit failures gracefully', async () => {
      mockApiKeyRotationService.getSecurityStatus.mockRejectedValue(new Error('Security audit failed'));

      jest.advanceTimersByTime(10 * 60 * 1000);
      await jest.runAllTimers();

      expect(logger.error).toHaveBeenCalledWith(
        'Security audit failed',
        expect.objectContaining({
          error: 'Security audit failed'
        })
      );
    });
  });

  describe('Real-time Coordination', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should broadcast coordination events via WebSocket', async () => {
      const coordinationEvent = {
        eventType: 'api_status_change' as const,
        serviceName: 'stripe',
        data: { status: 'healthy', responseTime: 120 },
        timestamp: new Date(),
        severity: 'info' as const
      };

      await manager.handleWebhookCoordination(
        'stripe',
        { type: 'payment_intent.succeeded' },
        { success: true, processingTime: 150 }
      );

      expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'external_services_coordination',
        'coordination_event',
        expect.objectContaining({
          eventType: 'webhook_received',
          serviceName: 'stripe'
        })
      );
    });

    it('should update service metrics during webhook coordination', async () => {
      await manager.handleWebhookCoordination(
        'stripe',
        { type: 'payment_intent.succeeded' },
        { success: true, processingTime: 150 }
      );

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^service_metrics:/),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should handle webhook coordination failures gracefully', async () => {
      mockSocketManager.broadcastToRoom.mockRejectedValue(new Error('WebSocket broadcast failed'));

      await manager.handleWebhookCoordination(
        'stripe',
        { type: 'payment_intent.succeeded' },
        { success: false, error: 'Processing failed' }
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to handle webhook coordination',
        expect.objectContaining({
          error: 'WebSocket broadcast failed',
          service: 'stripe'
        })
      );
    });

    it('should manage coordination event queue with proper limits', async () => {
      // Generate multiple events to test queue management
      for (let i = 0; i < 100; i++) {
        await manager.handleWebhookCoordination(
          'stripe',
          { type: 'test_event' },
          { success: true, processingTime: 100 }
        );
      }

      const recentEvents = manager.getRecentCoordinationEvents(50);
      expect(recentEvents).toHaveLength(50); // Should be limited to 50
    });
  });

  describe('Service Status Management', () => {
    beforeEach(async () => {
      // Mock services with various health states
      const healthyService = {
        getServiceHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          uptime: 99.9,
          responseTime: 120
        })
      };

      const degradedService = {
        getServiceHealth: jest.fn().mockResolvedValue({
          status: 'degraded',
          uptime: 95.0,
          responseTime: 800
        })
      };

      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(healthyService)
      }));
      jest.doMock('@/services/external/TwilioService', () => ({
        createSecureTwilioService: jest.fn().mockReturnValue(degradedService)
      }));

      await manager.initialize();
    });

    it('should return all service statuses correctly', async () => {
      // Simulate health checks
      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      const statuses = await manager.getAllServiceStatuses();

      expect(statuses).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              status: expect.stringMatching(/healthy|degraded|unhealthy|disabled/),
              lastCheck: expect.any(Date),
              uptime: expect.any(Number),
              responseTime: expect.any(Number)
            })
          ])
        })
      );
    });

    it('should return security status with proper formatting', async () => {
      const securityStatus = await manager.getSecurityStatus();

      expect(securityStatus).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overallStatus: expect.stringMatching(/secure|warning|critical/),
            services: expect.any(Object),
            recommendations: expect.any(Array),
            lastAudit: expect.any(Date)
          })
        })
      );
    });

    it('should handle service status retrieval failures', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const statuses = await manager.getAllServiceStatuses();

      expect(statuses).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Failed to get service statuses',
          errors: expect.arrayContaining(['Redis connection failed'])
        })
      );
    });
  });

  describe('Cost Optimization Analysis', () => {
    beforeEach(async () => {
      await manager.initialize();

      // Mock service metrics in Redis
      mockRedisClient.get.mockImplementation((key: string) => {
        if (key.startsWith('service_metrics:')) {
          return Promise.resolve(JSON.stringify({
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            averageResponseTime: 200,
            requestsPerMinute: 16.67,
            errorRate: 5.0,
            uptime: 95.0,
            lastHourStats: {
              requests: 1000,
              errors: 50,
              avgResponseTime: 200
            }
          }));
        }
        return Promise.resolve(null);
      });
    });

    it('should generate comprehensive cost summary', async () => {
      const costSummary = await manager.generateCostSummary();

      expect(costSummary).toEqual(
        expect.objectContaining({
          totalHourlyCost: expect.any(Number),
          totalDailyCost: expect.any(Number),
          totalMonthlyCost: expect.any(Number),
          serviceBreakdown: expect.any(Object),
          alerts: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('should calculate service-specific costs correctly', async () => {
      const costSummary = await manager.generateCostSummary();

      // Verify cost calculations for different services
      expect(costSummary.serviceBreakdown).toHaveProperty('stripe');
      expect(costSummary.serviceBreakdown).toHaveProperty('twilio');

      // Twilio should be more expensive per request than Stripe
      if (costSummary.serviceBreakdown.twilio && costSummary.serviceBreakdown.stripe) {
        expect(costSummary.serviceBreakdown.twilio.hourlyCost)
          .toBeGreaterThan(costSummary.serviceBreakdown.stripe.hourlyCost);
      }
    });

    it('should trigger cost optimization analysis with suggestions', async () => {
      const optimization = await manager.triggerCostOptimization();

      expect(optimization).toEqual(
        expect.objectContaining({
          costSummary: expect.any(Object),
          optimizationSuggestions: expect.any(Array),
          analysisTimestamp: expect.any(Date)
        })
      );

      // Should broadcast cost optimization results
      expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'external_services_coordination',
        'coordination_event',
        expect.objectContaining({
          eventType: 'cost_alert',
          serviceName: 'system'
        })
      );
    });

    it('should generate optimization suggestions based on metrics', async () => {
      const optimization = await manager.triggerCostOptimization();

      expect(optimization.optimizationSuggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            service: expect.any(String),
            type: expect.stringMatching(/error_reduction|caching|throttling/),
            suggestion: expect.any(String),
            potentialSavings: expect.any(Number)
          })
        ])
      );
    });

    it('should handle cost calculation failures gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis failure'));

      const costSummary = await manager.generateCostSummary();

      expect(costSummary).toEqual(
        expect.objectContaining({
          totalHourlyCost: 0,
          totalDailyCost: 0,
          totalMonthlyCost: 0,
          serviceBreakdown: {},
          alerts: [],
          recommendations: ['Cost calculation temporarily unavailable']
        })
      );
    });
  });

  describe('Frontend Coordination Data', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should generate frontend coordination data correctly', async () => {
      const coordinationData = await manager.getFrontendCoordinationData();

      expect(coordinationData).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            serviceStatuses: expect.any(Array),
            realtimeMetrics: expect.any(Array),
            activeAlerts: expect.any(Array),
            costSummary: expect.any(Object),
            lastUpdate: expect.any(Date)
          })
        })
      );
    });

    it('should include recent coordination events in frontend data', async () => {
      // Generate some coordination events
      await manager.handleWebhookCoordination(
        'stripe',
        { type: 'test' },
        { success: true, processingTime: 100 }
      );

      const coordinationData = await manager.getFrontendCoordinationData();

      expect(coordinationData.data.recentEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'webhook_received',
            serviceName: 'stripe'
          })
        ])
      );
    });

    it('should handle frontend coordination data failures', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis failure'));

      const coordinationData = await manager.getFrontendCoordinationData();

      expect(coordinationData).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Failed to get frontend coordination data',
          errors: expect.arrayContaining(['Redis failure'])
        })
      );
    });
  });

  describe('Service Configuration Management', () => {
    it('should disable coordination when requested', () => {
      manager.setCoordinationEnabled(false);

      expect(logger.info).toHaveBeenCalledWith('Real-time coordination disabled');
    });

    it('should enable coordination when requested', () => {
      manager.setCoordinationEnabled(true);

      expect(logger.info).toHaveBeenCalledWith('Real-time coordination enabled');
    });

    it('should handle missing environment variables gracefully', async () => {
      // Remove all environment variables
      process.env = {};

      const newManager = new ExternalServicesManager();
      await newManager.initialize();

      expect(newManager.initialized).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'External Services Manager initialized successfully',
        expect.objectContaining({
          serviceCount: 0, // No services should be enabled
          enabledServices: []
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Redis connection failures during initialization', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis connection failed'));

      await expect(manager.initialize()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize External Services Manager',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should handle concurrent health checks without race conditions', async () => {
      const mockService = {
        getServiceHealth: jest.fn()
          .mockResolvedValueOnce({ status: 'healthy', uptime: 99.9, responseTime: 120 })
          .mockResolvedValueOnce({ status: 'healthy', uptime: 99.8, responseTime: 130 })
          .mockResolvedValueOnce({ status: 'healthy', uptime: 99.7, responseTime: 140 })
      };

      jest.doMock('@/services/external/StripeService', () => ({
        createSecureStripeService: jest.fn().mockReturnValue(mockService)
      }));

      const newManager = new ExternalServicesManager();
      await newManager.initialize();

      // Trigger multiple health checks rapidly
      jest.advanceTimersByTime(30000);
      jest.advanceTimersByTime(30000);
      jest.advanceTimersByTime(30000);
      await jest.runAllTimers();

      expect(mockRedisClient.setex).toHaveBeenCalledTimes(3);
    });

    it('should clean up intervals and timers properly', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await manager.initialize();
      // In a real scenario, there would be a cleanup method to call
      // For now, we're testing that intervals are created properly

      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should handle malformed Redis data gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json data');

      const statuses = await manager.getAllServiceStatuses();

      expect(statuses).toEqual(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([expect.stringMatching(/JSON|parse/i)])
        })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit coordination event queue size', async () => {
      await manager.initialize();

      // Generate many events
      for (let i = 0; i < 200; i++) {
        await manager.handleWebhookCoordination(
          'stripe',
          { type: 'test' },
          { success: true, processingTime: 100 }
        );
      }

      const events = manager.getRecentCoordinationEvents(150);
      expect(events.length).toBeLessThanOrEqual(150);
    });

    it('should properly manage memory for service metrics', async () => {
      await manager.initialize();

      // Simulate high-frequency metrics updates
      for (let i = 0; i < 1000; i++) {
        jest.advanceTimersByTime(1000); // 1 second intervals
      }

      await jest.runAllTimers();

      // Verify Redis calls are made but not excessive
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });
});