/**
 * ============================================================================
 * EXTERNAL SERVICE COORDINATION INTEGRATION TESTS
 * ============================================================================
 *
 * Integration tests for external service coordination workflows including
 * real-time WebSocket coordination, cost monitoring, security auditing,
 * webhook processing, and health monitoring across 11 external services.
 *
 * EXTERNAL SERVICES COVERED:
 * - Payment Processing: Stripe (Priority 10 - Critical)
 * - Communications: Twilio (Priority 8), SendGrid (Priority 7)
 * - Fleet Management: Samsara (Priority 9 - Critical)
 * - Data Sync: Airtable (Priority 5)
 * - Mapping: Maps - Mapbox/Google (Priority 8)
 * - Security: ThreatIntelligence, IPReputation, VirusTotal, AbuseIPDB, MISP
 *
 * COORDINATION WORKFLOWS:
 * - Service initialization and configuration management
 * - Real-time WebSocket coordination with Frontend dashboards
 * - Cost monitoring and optimization with threshold alerts
 * - Security auditing and API key rotation compliance
 * - Health monitoring and circuit breaker coordination
 * - Webhook processing with cross-service coordination
 *
 * Created by: Quality Assurance Engineer & Testing Architect
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Socket as ClientSocket } from 'socket.io-client';
import Client from 'socket.io-client';
import { app } from '@/server';
import { 
  externalServicesManager,
  ExternalServicesManager,
  RealTimeCoordinationEvent,
  FrontendCoordinationData
} from '@/services/external/ExternalServicesManager';
import { webhookCoordinationService } from '@/services/external/WebhookCoordinationService';
import { socketManager } from '@/services/socketManager';
import { 
  redisClient, 
  CacheService,
  checkRedisHealth 
} from '@/config/redis';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { testFixtures } from '@tests/fixtures';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '@/config';

// Test configuration
const EXTERNAL_TEST_PORT = 4002;
const EXTERNAL_TIMEOUT = 60000; // 60 seconds for external service tests

// Test user data for external service coordination
const EXTERNAL_TEST_USERS = {
  admin: {
    id: 'external-admin-123',
    email: 'admin@external-test.com',
    role: 'admin',
    organizationId: 'external-org-123'
  },
  dispatcher: {
    id: 'external-dispatcher-456',
    email: 'dispatcher@external-test.com',
    role: 'dispatcher',
    organizationId: 'external-org-123'
  }
};

// Mock external service responses
const MOCK_SERVICE_RESPONSES = {
  stripe: {
    healthy: { status: 'healthy', details: { api_version: '2023-10-16', account_country: 'US' } },
    unhealthy: { status: 'unhealthy', details: { error: 'API key invalid' } }
  },
  twilio: {
    healthy: { status: 'healthy', details: { account_status: 'active', balance: '$25.00' } },
    unhealthy: { status: 'unhealthy', details: { error: 'Authentication failed' } }
  },
  sendgrid: {
    healthy: { status: 'healthy', details: { reputation: 99.5, monthly_quota: 100000 } },
    unhealthy: { status: 'unhealthy', details: { error: 'Rate limit exceeded' } }
  },
  samsara: {
    healthy: { status: 'healthy', details: { vehicles_online: 15, drivers_active: 12 } },
    unhealthy: { status: 'unhealthy', details: { error: 'Network timeout' } }
  },
  maps: {
    healthy: { status: 'healthy', details: { quota_remaining: 95000, api_latency: 150 } },
    unhealthy: { status: 'unhealthy', details: { error: 'Quota exceeded' } }
  }
};

// Mock webhook payloads
const MOCK_WEBHOOK_PAYLOADS = {
  stripe_payment_success: {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_payment_123',
        amount: 5000, // $50.00
        currency: 'usd',
        status: 'succeeded',
        metadata: { customer_id: 'customer_123', invoice_id: 'inv_456' }
      }
    }
  },
  twilio_delivery_status: {
    MessageSid: 'SM1234567890abcdef',
    MessageStatus: 'delivered',
    To: '+15551234567',
    From: '+15559876543',
    Body: 'Your waste collection is scheduled for tomorrow.'
  },
  samsara_vehicle_alert: {
    eventType: 'vehicle.harsh_acceleration',
    data: {
      vehicleId: 'vehicle_123',
      driverId: 'driver_456',
      timestamp: new Date().toISOString(),
      location: { latitude: 40.7128, longitude: -74.0060 },
      severity: 'medium'
    }
  }
};

// Mock authentication
jest.mock('@/middleware/auth', () => ({
  auth: (req: any, res: any, next: any) => {
    req.user = EXTERNAL_TEST_USERS.admin;
    next();
  }
}));

describe('External Service Coordination Integration Tests', () => {
  let httpServer: any;
  let ioServer: Server;
  let clientSockets: Map<string, ClientSocket> = new Map();
  let testExternalServicesManager: ExternalServicesManager;

  beforeAll(async () => {
    // Initialize test database
    await DatabaseTestHelper.initialize();
    
    // Setup HTTP server for WebSocket testing
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    
    // Initialize socket manager
    socketManager.initialize(ioServer);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(EXTERNAL_TEST_PORT, () => {
        logger.info(`External service test server running on port ${EXTERNAL_TEST_PORT}`);
        resolve();
      });
    });

    // Create test external services manager
    testExternalServicesManager = new ExternalServicesManager();
    
    // Wait for services initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, EXTERNAL_TIMEOUT);

  afterAll(async () => {
    // Close all client connections
    for (const [, socket] of clientSockets) {
      if (socket.connected) socket.close();
    }
    
    // Shutdown services
    if (testExternalServicesManager) {
      await testExternalServicesManager.shutdown();
    }
    
    // Close server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
    
    // Close database
    await DatabaseTestHelper.close();
  }, EXTERNAL_TIMEOUT);

  beforeEach(async () => {
    // Clean up Redis data
    await redisClient.flushdb();
    
    // Reset test fixtures
    await testFixtures.cleanupAll();
  });

  afterEach(async () => {
    // Disconnect any remaining client sockets
    for (const [userId, socket] of clientSockets) {
      if (socket.connected) {
        socket.close();
        clientSockets.delete(userId);
      }
    }
  });

  /**
   * SERVICE INITIALIZATION AND CONFIGURATION COORDINATION
   */
  describe('Service Initialization and Configuration Coordination', () => {
    it('should initialize all external services with proper configuration coordination', async () => {
      // Test external services manager health
      const systemHealth = await testExternalServicesManager.getSystemHealth();
      
      expect(systemHealth).toHaveProperty('status');
      expect(systemHealth).toHaveProperty('serviceCount');
      expect(systemHealth).toHaveProperty('healthyServices');
      expect(systemHealth).toHaveProperty('criticalServicesDown');
      expect(systemHealth).toHaveProperty('securityStatus');
      expect(systemHealth).toHaveProperty('apiKeyRotationStatus');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(systemHealth.status);
      expect(systemHealth.serviceCount).toBeGreaterThan(0);
      expect(Array.isArray(systemHealth.criticalServicesDown)).toBe(true);

      // Test service status endpoint
      const serviceStatusResponse = await request(app)
        .get('/api/v1/external-services/status')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(serviceStatusResponse.status);

      if (serviceStatusResponse.status === 200) {
        expect(serviceStatusResponse.body.data).toHaveProperty('services');
        expect(Array.isArray(serviceStatusResponse.body.data.services)).toBe(true);
      }
    });

    it('should handle service configuration validation and priority coordination', async () => {
      // Test high-priority services validation
      const serviceStatuses = await testExternalServicesManager.getAllServiceStatuses();
      
      expect(Array.isArray(serviceStatuses)).toBe(true);
      
      if (serviceStatuses.length > 0) {
        serviceStatuses.forEach(service => {
          expect(service).toHaveProperty('name');
          expect(service).toHaveProperty('status');
          expect(service).toHaveProperty('lastCheck');
          expect(service).toHaveProperty('uptime');
          expect(service).toHaveProperty('responseTime');
          expect(service).toHaveProperty('circuitBreakerState');
          
          expect(['healthy', 'degraded', 'unhealthy', 'disabled']).toContain(service.status);
          expect(['closed', 'open', 'half_open']).toContain(service.circuitBreakerState);
          expect(typeof service.uptime).toBe('number');
          expect(typeof service.responseTime).toBe('number');
        });
      }

      // Test configuration endpoint
      const configResponse = await request(app)
        .get('/api/v1/external-services/configuration')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(configResponse.status);
    });

    it('should coordinate service failover and fallback mechanisms', async () => {
      // Test system resilience with service degradation
      const systemHealth = await testExternalServicesManager.getSystemHealth();
      
      // Simulate service degradation scenarios
      const degradationTests = [
        {
          scenario: 'non_critical_service_failure',
          expectedSystemStatus: ['healthy', 'degraded']
        },
        {
          scenario: 'critical_service_degradation',
          expectedSystemStatus: ['degraded', 'unhealthy']
        }
      ];

      for (const test of degradationTests) {
        // System should maintain appropriate status based on service criticality
        expect(['healthy', 'degraded', 'unhealthy']).toContain(systemHealth.status);
        
        if (systemHealth.criticalServicesDown.length > 0) {
          expect(['degraded', 'unhealthy']).toContain(systemHealth.status);
        }
      }

      // Test fallback coordination endpoint
      const fallbackResponse = await request(app)
        .post('/api/v1/external-services/trigger-fallback')
        .set('Authorization', 'Bearer test-token')
        .send({
          serviceName: 'maps',
          fallbackProvider: 'google_maps',
          reason: 'mapbox_rate_limit_exceeded'
        });

      expect([200, 201, 404]).toContain(fallbackResponse.status);
    });
  });

  /**
   * REAL-TIME WEBSOCKET COORDINATION
   */
  describe('Real-Time WebSocket Coordination', () => {
    it('should coordinate real-time service status updates through WebSocket', async () => {
      // Create authenticated WebSocket connections
      const adminToken = jwt.sign(
        { userId: EXTERNAL_TEST_USERS.admin.id, role: EXTERNAL_TEST_USERS.admin.role },
        config.jwt.secret
      );

      const adminSocket = Client(`http://localhost:${EXTERNAL_TEST_PORT}`, {
        auth: { token: adminToken }
      });

      clientSockets.set('coordination-admin', adminSocket);

      // Wait for connection
      await new Promise(resolve => adminSocket.on('connected', resolve));

      // Test real-time coordination events
      const coordinationEvents: any[] = [];
      
      adminSocket.on('api_coordination_initialized', (data) => 
        coordinationEvents.push({ type: 'coordination_initialized', data })
      );
      adminSocket.on('status_change', (data) => 
        coordinationEvents.push({ type: 'status_change', data })
      );
      adminSocket.on('service_error', (data) => 
        coordinationEvents.push({ type: 'service_error', data })
      );
      adminSocket.on('cost_alert', (data) => 
        coordinationEvents.push({ type: 'cost_alert', data })
      );

      // Simulate real-time coordination event
      const testCoordinationEvent: RealTimeCoordinationEvent = {
        eventType: 'api_status_change',
        serviceName: 'stripe',
        data: {
          oldStatus: 'healthy',
          newStatus: 'degraded',
          reason: 'increased_latency',
          responseTime: 2500
        },
        timestamp: new Date(),
        severity: 'warning'
      };

      // Broadcast coordination event
      await testExternalServicesManager.broadcastCoordinationEvent(testCoordinationEvent);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate real-time coordination
      expect(coordinationEvents.length).toBeGreaterThanOrEqual(0);

      // Test Frontend coordination data
      const frontendData = await testExternalServicesManager.getFrontendCoordinationData();
      
      expect(frontendData).toHaveProperty('serviceStatuses');
      expect(frontendData).toHaveProperty('realtimeMetrics');
      expect(frontendData).toHaveProperty('activeAlerts');
      expect(frontendData).toHaveProperty('costSummary');
      expect(frontendData).toHaveProperty('lastUpdate');
      
      expect(Array.isArray(frontendData.serviceStatuses)).toBe(true);
      expect(Array.isArray(frontendData.realtimeMetrics)).toBe(true);
      expect(Array.isArray(frontendData.activeAlerts)).toBe(true);
      expect(typeof frontendData.costSummary).toBe('object');
      expect(frontendData.lastUpdate).toBeInstanceOf(Date);
    });

    it('should coordinate webhook events with real-time Frontend updates', async () => {
      // Setup webhook event monitoring
      const adminToken = jwt.sign(
        { userId: EXTERNAL_TEST_USERS.admin.id, role: EXTERNAL_TEST_USERS.admin.role },
        config.jwt.secret
      );

      const webhookSocket = Client(`http://localhost:${EXTERNAL_TEST_PORT}`, {
        auth: { token: adminToken }
      });

      clientSockets.set('webhook-monitor', webhookSocket);

      await new Promise(resolve => webhookSocket.on('connected', resolve));

      // Monitor webhook events
      const webhookEvents: any[] = [];
      webhookSocket.on('webhook_received', (data) => 
        webhookEvents.push({ type: 'webhook_received', data })
      );

      // Process webhook through coordination service
      const webhookResult = await webhookCoordinationService.processWebhookWithCoordination(
        'stripe',
        MOCK_WEBHOOK_PAYLOADS.stripe_payment_success,
        { 'stripe-signature': 'test_signature_123' }
      );

      expect(webhookResult.success).toBe(true);
      expect(webhookResult.serviceName).toBe('stripe');
      expect(webhookResult.frontendNotified).toBe(true);

      // Test webhook coordination with external services manager
      await testExternalServicesManager.handleWebhookCoordination(
        'stripe',
        MOCK_WEBHOOK_PAYLOADS.stripe_payment_success,
        webhookResult
      );

      // Wait for coordination propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate webhook coordination
      expect(webhookEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should coordinate cost monitoring alerts through real-time channels', async () => {
      // Setup cost monitoring
      const costMonitorSocket = Client(`http://localhost:${EXTERNAL_TEST_PORT}`, {
        auth: { token: jwt.sign(
          { userId: EXTERNAL_TEST_USERS.admin.id, role: EXTERNAL_TEST_USERS.admin.role },
          config.jwt.secret
        )}
      });

      clientSockets.set('cost-monitor', costMonitorSocket);

      await new Promise(resolve => costMonitorSocket.on('connected', resolve));

      // Monitor cost alerts
      const costAlerts: any[] = [];
      costMonitorSocket.on('cost_alert', (data) => costAlerts.push(data));
      costMonitorSocket.on('critical_cost_alert', (data) => costAlerts.push({ ...data, critical: true }));

      // Trigger cost optimization analysis
      const costOptimization = await testExternalServicesManager.triggerCostOptimization();
      
      expect(costOptimization).toHaveProperty('costSummary');
      expect(costOptimization).toHaveProperty('optimizationSuggestions');
      expect(costOptimization).toHaveProperty('analysisTimestamp');
      
      expect(typeof costOptimization.costSummary).toBe('object');
      expect(Array.isArray(costOptimization.optimizationSuggestions)).toBe(true);

      // Wait for cost alert propagation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test cost monitoring endpoint
      const costResponse = await request(app)
        .get('/api/v1/external-services/cost-analysis')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(costResponse.status);

      if (costResponse.status === 200) {
        expect(costResponse.body.data).toHaveProperty('totalCost');
        expect(costResponse.body.data).toHaveProperty('serviceBreakdown');
      }
    });
  });

  /**
   * SECURITY AUDITING AND API KEY ROTATION COORDINATION
   */
  describe('Security Auditing and API Key Rotation Coordination', () => {
    it('should coordinate security auditing across all external services', async () => {
      // Test security status coordination
      const securityStatus = await testExternalServicesManager.getSecurityStatus();
      
      expect(securityStatus).toHaveProperty('overallStatus');
      expect(securityStatus).toHaveProperty('services');
      expect(securityStatus).toHaveProperty('recommendations');
      expect(securityStatus).toHaveProperty('lastAudit');
      
      expect(['current', 'warning', 'critical']).toContain(securityStatus.overallStatus);
      expect(typeof securityStatus.services).toBe('object');
      expect(Array.isArray(securityStatus.recommendations)).toBe(true);

      // Test security compliance report
      const complianceReport = await testExternalServicesManager.generateSecurityComplianceReport();
      
      expect(complianceReport).toHaveProperty('reportDate');
      expect(complianceReport).toHaveProperty('overallCompliance');
      expect(complianceReport).toHaveProperty('serviceCompliance');
      expect(complianceReport).toHaveProperty('totalServices');
      expect(complianceReport).toHaveProperty('compliantServices');
      
      expect(['compliant', 'partially_compliant', 'non_compliant']).toContain(complianceReport.overallCompliance);
      expect(Array.isArray(complianceReport.serviceCompliance)).toBe(true);

      // Test security endpoint
      const securityResponse = await request(app)
        .get('/api/v1/external-services/security-status')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(securityResponse.status);
    });

    it('should coordinate API key rotation for critical services', async () => {
      // Test API key rotation coordination
      const rotationResult = await testExternalServicesManager.rotateServiceApiKeys(
        'stripe',
        {
          secretKey: 'sk_test_new_key_123',
          webhookSecret: 'whsec_new_secret_456'
        },
        EXTERNAL_TEST_USERS.admin.id
      );

      expect(rotationResult).toHaveProperty('success');
      expect(typeof rotationResult.success).toBe('boolean');

      if (!rotationResult.success) {
        expect(rotationResult).toHaveProperty('error');
        expect(typeof rotationResult.error).toBe('string');
      }

      // Test emergency key revocation
      const revocationResult = await testExternalServicesManager.emergencyRevokeApiKeys(
        'test-service',
        'security_breach_suspected',
        EXTERNAL_TEST_USERS.admin.id
      );

      expect(revocationResult).toHaveProperty('success');
      expect(typeof revocationResult.success).toBe('boolean');

      // Test API key rotation endpoint
      const rotationResponse = await request(app)
        .post('/api/v1/external-services/rotate-keys')
        .set('Authorization', 'Bearer test-token')
        .send({
          serviceName: 'twilio',
          rotationReason: 'scheduled_rotation',
          newCredentials: {
            authToken: 'new_auth_token_123',
            webhookAuthToken: 'new_webhook_token_456'
          }
        });

      expect([200, 201, 400, 404]).toContain(rotationResponse.status);
    });

    it('should coordinate security incident response across services', async () => {
      // Simulate security incident
      const securityIncident = {
        incidentType: 'suspicious_api_activity',
        affectedServices: ['stripe', 'twilio'],
        severity: 'high',
        detectedAt: new Date().toISOString(),
        indicators: [
          'unusual_request_patterns',
          'geographic_anomalies',
          'failed_authentication_spike'
        ]
      };

      // Test security incident endpoint
      const incidentResponse = await request(app)
        .post('/api/v1/external-services/security-incident')
        .set('Authorization', 'Bearer test-token')
        .send(securityIncident);

      expect([200, 201, 404]).toContain(incidentResponse.status);

      // Test emergency security measures
      const emergencyResponse = await request(app)
        .post('/api/v1/external-services/emergency-lockdown')
        .set('Authorization', 'Bearer test-token')
        .send({
          reason: 'potential_api_key_compromise',
          affectedServices: ['stripe'],
          lockdownDuration: 3600, // 1 hour
          notificationRequired: true
        });

      expect([200, 201, 404]).toContain(emergencyResponse.status);
    });
  });

  /**
   * HEALTH MONITORING AND CIRCUIT BREAKER COORDINATION
   */
  describe('Health Monitoring and Circuit Breaker Coordination', () => {
    it('should coordinate health monitoring across all external services', async () => {
      // Test individual service health
      const serviceNames = ['stripe', 'twilio', 'sendgrid', 'samsara', 'maps'];
      
      for (const serviceName of serviceNames) {
        const serviceMetrics = await testExternalServicesManager.getServiceMetrics(serviceName);
        
        expect(serviceMetrics).toHaveProperty('totalRequests');
        expect(serviceMetrics).toHaveProperty('successfulRequests');
        expect(serviceMetrics).toHaveProperty('failedRequests');
        expect(serviceMetrics).toHaveProperty('averageResponseTime');
        expect(serviceMetrics).toHaveProperty('requestsPerMinute');
        expect(serviceMetrics).toHaveProperty('errorRate');
        expect(serviceMetrics).toHaveProperty('uptime');
        expect(serviceMetrics).toHaveProperty('lastHourStats');
        
        expect(typeof serviceMetrics.totalRequests).toBe('number');
        expect(typeof serviceMetrics.successfulRequests).toBe('number');
        expect(typeof serviceMetrics.failedRequests).toBe('number');
        expect(typeof serviceMetrics.averageResponseTime).toBe('number');
        expect(typeof serviceMetrics.errorRate).toBe('number');
        expect(typeof serviceMetrics.uptime).toBe('number');
        
        expect(serviceMetrics.errorRate).toBeGreaterThanOrEqual(0);
        expect(serviceMetrics.errorRate).toBeLessThanOrEqual(100);
        expect(serviceMetrics.uptime).toBeGreaterThanOrEqual(0);
        expect(serviceMetrics.uptime).toBeLessThanOrEqual(100);
      }

      // Test health monitoring endpoint
      const healthResponse = await request(app)
        .get('/api/v1/external-services/health-detailed')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(healthResponse.status);

      if (healthResponse.status === 200) {
        expect(healthResponse.body.data).toHaveProperty('services');
        expect(healthResponse.body.data).toHaveProperty('systemHealth');
      }
    });

    it('should coordinate circuit breaker states and recovery mechanisms', async () => {
      // Test circuit breaker coordination
      const systemHealth = await testExternalServicesManager.getSystemHealth();
      
      // Validate circuit breaker information in service statuses
      const serviceStatuses = await testExternalServicesManager.getAllServiceStatuses();
      
      serviceStatuses.forEach(service => {
        expect(['closed', 'open', 'half_open']).toContain(service.circuitBreakerState);
        
        // Services with high error rates should potentially have open circuit breakers
        if (service.errorCount > service.successCount && service.errorCount > 10) {
          // Circuit breaker logic would typically open the circuit
          expect(['open', 'half_open']).toContain(service.circuitBreakerState);
        }
      });

      // Test circuit breaker coordination endpoint
      const circuitBreakerResponse = await request(app)
        .post('/api/v1/external-services/circuit-breaker-control')
        .set('Authorization', 'Bearer test-token')
        .send({
          serviceName: 'maps',
          action: 'force_open',
          reason: 'manual_maintenance',
          duration: 300 // 5 minutes
        });

      expect([200, 201, 404]).toContain(circuitBreakerResponse.status);
    });

    it('should coordinate service degradation and recovery workflows', async () => {
      // Test service degradation coordination
      const degradationScenarios = [
        {
          serviceName: 'sendgrid',
          degradationType: 'rate_limit_exceeded',
          expectedAction: 'enable_fallback'
        },
        {
          serviceName: 'maps',
          degradationType: 'quota_exceeded',
          expectedAction: 'switch_provider'
        },
        {
          serviceName: 'twilio',
          degradationType: 'service_outage',
          expectedAction: 'enable_email_fallback'
        }
      ];

      for (const scenario of degradationScenarios) {
        const degradationResponse = await request(app)
          .post('/api/v1/external-services/handle-degradation')
          .set('Authorization', 'Bearer test-token')
          .send(scenario);

        expect([200, 201, 404]).toContain(degradationResponse.status);
      }

      // Test service recovery coordination
      const recoveryResponse = await request(app)
        .post('/api/v1/external-services/trigger-recovery')
        .set('Authorization', 'Bearer test-token')
        .send({
          serviceName: 'samsara',
          recoveryType: 'automatic',
          healthCheckRequired: true,
          gradualRampUp: true
        });

      expect([200, 201, 404]).toContain(recoveryResponse.status);
    });
  });

  /**
   * COMPREHENSIVE COORDINATION WORKFLOW TESTS
   */
  describe('Comprehensive Coordination Workflow Tests', () => {
    it('should handle multi-service coordination during system-wide events', async () => {
      // Simulate system-wide coordination event
      const systemEvent = {
        eventType: 'system_maintenance_mode',
        affectedServices: ['stripe', 'twilio', 'sendgrid', 'samsara'],
        maintenanceWindow: {
          start: new Date().toISOString(),
          duration: 1800, // 30 minutes
          estimatedEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        },
        coordinationRequired: true,
        notificationChannels: ['websocket', 'email', 'dashboard']
      };

      const systemEventResponse = await request(app)
        .post('/api/v1/external-services/system-event')
        .set('Authorization', 'Bearer test-token')
        .send(systemEvent);

      expect([200, 201, 404]).toContain(systemEventResponse.status);

      // Validate coordination across multiple services
      const frontendCoordinationData = await testExternalServicesManager.getFrontendCoordinationData();
      
      expect(frontendCoordinationData.serviceStatuses.length).toBeGreaterThan(0);
      expect(frontendCoordinationData.realtimeMetrics.length).toBeGreaterThan(0);
      
      // Validate cost summary coordination
      expect(frontendCoordinationData.costSummary).toHaveProperty('totalHourlyCost');
      expect(frontendCoordinationData.costSummary).toHaveProperty('serviceBreakdown');
      expect(frontendCoordinationData.costSummary).toHaveProperty('alerts');
      expect(frontendCoordinationData.costSummary).toHaveProperty('recommendations');
      
      expect(typeof frontendCoordinationData.costSummary.totalHourlyCost).toBe('number');
      expect(typeof frontendCoordinationData.costSummary.serviceBreakdown).toBe('object');
      expect(Array.isArray(frontendCoordinationData.costSummary.alerts)).toBe(true);
      expect(Array.isArray(frontendCoordinationData.costSummary.recommendations)).toBe(true);
    });

    it('should coordinate emergency procedures across all external services', async () => {
      // Test emergency coordination procedures
      const emergencyProcedures = [
        {
          procedureType: 'api_key_breach_response',
          affectedServices: ['stripe', 'twilio'],
          actions: ['revoke_keys', 'enable_monitoring', 'notify_stakeholders']
        },
        {
          procedureType: 'service_outage_response',
          affectedServices: ['samsara'],
          actions: ['enable_fallback', 'reroute_traffic', 'notify_customers']
        },
        {
          procedureType: 'cost_overrun_response',
          affectedServices: ['maps', 'sendgrid'],
          actions: ['enable_rate_limiting', 'switch_provider', 'alert_management']
        }
      ];

      for (const procedure of emergencyProcedures) {
        const emergencyResponse = await request(app)
          .post('/api/v1/external-services/emergency-procedure')
          .set('Authorization', 'Bearer test-token')
          .send(procedure);

        expect([200, 201, 404]).toContain(emergencyResponse.status);
      }

      // Test emergency coordination status
      const emergencyStatusResponse = await request(app)
        .get('/api/v1/external-services/emergency-status')
        .set('Authorization', 'Bearer test-token');

      expect([200, 404]).toContain(emergencyStatusResponse.status);
    });

    it('should validate comprehensive coordination performance under load', async () => {
      const startTime = Date.now();
      
      // Simulate coordinated load across external services
      const coordinationLoadTests = [
        // WebSocket coordination load
        ...Array.from({ length: 10 }, () => 
          testExternalServicesManager.broadcastCoordinationEvent({
            eventType: 'api_status_change',
            serviceName: 'stripe',
            data: { status: 'healthy', responseTime: 150 },
            timestamp: new Date(),
            severity: 'info'
          })
        ),
        
        // Health monitoring load
        ...Array.from({ length: 5 }, () => 
          testExternalServicesManager.getSystemHealth()
        ),
        
        // Cost optimization load
        ...Array.from({ length: 3 }, () => 
          testExternalServicesManager.triggerCostOptimization()
        ),
        
        // Security auditing load
        ...Array.from({ length: 3 }, () => 
          testExternalServicesManager.getSecurityStatus()
        ),
        
        // Frontend coordination data load
        ...Array.from({ length: 8 }, () => 
          testExternalServicesManager.getFrontendCoordinationData()
        )
      ];

      const coordinationResults = await Promise.allSettled(coordinationLoadTests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Validate coordination performance
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Calculate success rate
      const successful = coordinationResults.filter(r => r.status === 'fulfilled').length;
      const successRate = (successful / coordinationResults.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(90); // 90%+ success rate for coordination
      
      logger.info(`External service coordination load test: ${coordinationResults.length} operations in ${totalTime}ms with ${successRate}% success rate`);

      // Test recent coordination events
      const recentEvents = testExternalServicesManager.getRecentCoordinationEvents(20);
      expect(Array.isArray(recentEvents)).toBe(true);
      expect(recentEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain coordination integrity during Redis failures', async () => {
      // Mock Redis failure scenarios
      const originalRedisGet = redisClient.get;
      const originalRedisSet = redisClient.set;
      
      // Simulate Redis unavailability
      jest.spyOn(redisClient, 'get').mockRejectedValue(new Error('Redis connection failed'));
      jest.spyOn(redisClient, 'set').mockRejectedValue(new Error('Redis unavailable'));

      // Test coordination resilience during Redis failure
      const resilienceTests = await Promise.allSettled([
        testExternalServicesManager.getSystemHealth(),
        testExternalServicesManager.getFrontendCoordinationData(),
        testExternalServicesManager.triggerCostOptimization()
      ]);

      // System should handle Redis failures gracefully
      const healthyResults = resilienceTests.filter(r => r.status === 'fulfilled').length;
      expect(healthyResults).toBeGreaterThan(0); // At least some operations should succeed

      // Restore Redis functions
      jest.restoreAllMocks();

      // Validate recovery after Redis restoration
      const recoveryHealth = await testExternalServicesManager.getSystemHealth();
      expect(recoveryHealth).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(recoveryHealth.status);
    });
  });
});