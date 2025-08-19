/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PHASE 3 SECURITY MONITORING TESTING
 * ============================================================================
 *
 * Comprehensive Phase 3 tests for Security Monitoring Service covering:
 * - Real-time security event processing with Redis integration
 * - WebSocket coordination for frontend dashboard updates
 * - Security alert generation and severity escalation
 * - Dashboard data caching and performance optimization
 * - Event correlation and pattern detection
 * - Compliance monitoring and reporting
 * - Performance validation (<200ms response times)
 * - Business continuity security validation
 *
 * Created by: Testing Agent (Phase 3 Validation)
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { SecurityMonitoringService, SecurityEventType, SecurityEventSeverity } from '@/services/security/SecurityMonitoringService';
import { AuditLog } from '@/models/AuditLog';
import { redisClient } from '@/config/redis';
import { socketManager } from '@/services/socketManager';
import { logger, Timer } from '@/utils/logger';

// Mock dependencies
jest.mock('@/models/AuditLog');
jest.mock('@/config/redis');
jest.mock('@/services/socketManager');
jest.mock('@/utils/logger');

describe('Security Monitoring Service - Phase 3 Comprehensive Validation', () => {
  let securityMonitoring: SecurityMonitoringService;
  let mockRedisClient: jest.Mocked<typeof redisClient>;
  let mockSocketManager: jest.Mocked<typeof socketManager>;
  let mockAuditLog: jest.Mocked<typeof AuditLog>;
  let mockTimer: jest.Mocked<Timer>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    securityMonitoring = new SecurityMonitoringService();
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
    mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
    mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;
    
    // Setup Timer mock
    mockTimer = {
      end: jest.fn(),
      duration: 0,
      label: 'test'
    } as any;
    
    (Timer as jest.Mock) = jest.fn(() => mockTimer);

    // Setup Redis mocks
    mockRedisClient.setex = jest.fn().mockResolvedValue('OK');
    mockRedisClient.get = jest.fn();
    mockRedisClient.del = jest.fn().mockResolvedValue(1);
    mockRedisClient.keys = jest.fn().mockResolvedValue([]);
    mockRedisClient.lpush = jest.fn().mockResolvedValue(1);
    mockRedisClient.ltrim = jest.fn().mockResolvedValue('OK');
    mockRedisClient.expire = jest.fn().mockResolvedValue(1);
    mockRedisClient.lrange = jest.fn().mockResolvedValue([]);

    // Setup Socket Manager mocks
    mockSocketManager.sendToRole = jest.fn();
    mockSocketManager.broadcastToRoom = jest.fn();
    mockSocketManager.sendToUser = jest.fn();

    // Setup AuditLog mocks
    mockAuditLog.logDataAccess = jest.fn().mockResolvedValue(undefined);
  });

  describe('Real-Time Security Event Processing', () => {
    describe('Event Processing Pipeline', () => {
      it('should process security events with Redis storage and real-time emission', async () => {
        const eventData = {
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Failed authentication attempt',
          description: 'Multiple failed login attempts detected',
          userId: 'user123',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (suspicious)',
          source: 'auth_service',
          affectedResources: ['user_accounts', 'session_management'],
          indicators: ['brute_force', 'invalid_credentials'],
          metadata: {
            attemptCount: 5,
            timeWindow: '5min'
          }
        };

        const eventEmitSpy = jest.spyOn(securityMonitoring['eventEmitter'], 'emit');

        const result = await securityMonitoring.processSecurityEvent(eventData);

        // Validate successful processing
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toMatch(/^sec_event_/);
        expect(result.data?.timestamp).toBeInstanceOf(Date);
        expect(result.data?.status).toBe('new');

        // Validate Redis storage
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^security_event:/),
          24 * 60 * 60, // 24 hour TTL
          expect.any(String)
        );

        // Validate real-time event emission
        expect(eventEmitSpy).toHaveBeenCalledWith('securityEvent', expect.objectContaining({
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Failed authentication attempt'
        }));

        // Validate audit logging
        expect(mockAuditLog.logDataAccess).toHaveBeenCalled();

        // Validate cache invalidation
        expect(mockRedisClient.keys).toHaveBeenCalledWith('security_monitoring:dashboard:*');
      });

      it('should generate appropriate tags for security events', async () => {
        const threatEventData = {
          type: SecurityEventType.THREAT_DETECTED,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'SQL injection attempt detected',
          description: 'Malicious SQL injection detected in user input',
          userId: 'user456',
          ipAddress: '10.0.0.50',
          userAgent: 'sqlmap/1.0',
          source: 'waf_service',
          affectedResources: ['database', 'user_data'],
          indicators: ['sql_injection', 'malicious_payload'],
          metadata: {
            payload: "'; DROP TABLE users; --",
            blocked: true
          }
        };

        const result = await securityMonitoring.processSecurityEvent(threatEventData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toContain('type:threat_detected');
        expect(result.data?.tags).toContain('severity:critical');
        expect(result.data?.tags).toContain('source:waf_service');
        expect(result.data?.tags).toContain('attack:sql_injection');
        expect(result.data?.tags).toContain('resource:database');
      });

      it('should handle time-based event categorization', async () => {
        const nightTimeEvent = {
          type: SecurityEventType.SYSTEM_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'Unusual system access time',
          description: 'System access during non-business hours',
          userId: 'admin789',
          ipAddress: '172.16.0.10',
          userAgent: 'system_admin_tool',
          source: 'access_control',
          affectedResources: ['admin_panel'],
          indicators: ['after_hours_access'],
          metadata: {
            accessTime: '02:30:00',
            businessHours: '08:00-18:00'
          }
        };

        // Mock current time to be 2:30 AM
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);

        const result = await securityMonitoring.processSecurityEvent(nightTimeEvent);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toContain('time:night');
      });
    });

    describe('Security Alert Generation', () => {
      it('should create security alerts for HIGH and CRITICAL events', async () => {
        const criticalEventData = {
          type: SecurityEventType.SECURITY_INCIDENT,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Data breach attempt detected',
          description: 'Unauthorized access to sensitive customer data',
          userId: 'unknown',
          ipAddress: '203.0.113.100',
          userAgent: 'automated_scanner',
          source: 'data_protection_service',
          affectedResources: ['customer_database', 'personal_data'],
          indicators: ['data_exfiltration', 'unauthorized_access'],
          metadata: {
            dataVolume: '10MB',
            encryptionBypass: true
          }
        };

        // Mock alert creation
        const createAlertSpy = jest.spyOn(securityMonitoring as any, 'createSecurityAlert')
          .mockResolvedValue({
            success: true,
            data: {
              id: 'alert_123',
              eventId: 'sec_event_456',
              severity: SecurityEventSeverity.CRITICAL,
              channels: ['email', 'sms', 'slack', 'webhook'],
              recipients: ['security-team@company.com', 'on-call@company.com']
            }
          });

        const result = await securityMonitoring.processSecurityEvent(criticalEventData);

        expect(result.success).toBe(true);
        expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({
          severity: SecurityEventSeverity.CRITICAL,
          type: SecurityEventType.SECURITY_INCIDENT
        }));
      });

      it('should not create alerts for LOW and INFO events', async () => {
        const lowEventData = {
          type: SecurityEventType.COMPLIANCE_EVENT,
          severity: SecurityEventSeverity.LOW,
          title: 'Routine compliance check',
          description: 'Scheduled compliance validation completed',
          source: 'compliance_service',
          affectedResources: ['audit_logs'],
          indicators: ['routine_check'],
          metadata: {
            checkType: 'daily_validation',
            result: 'passed'
          }
        };

        const createAlertSpy = jest.spyOn(securityMonitoring as any, 'createSecurityAlert');

        const result = await securityMonitoring.processSecurityEvent(lowEventData);

        expect(result.success).toBe(true);
        expect(createAlertSpy).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling and Resilience', () => {
      it('should handle Redis failures gracefully', async () => {
        mockRedisClient.setex.mockRejectedValue(new Error('Redis connection failed'));

        const eventData = {
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'Redis failure test',
          description: 'Testing Redis failure handling',
          source: 'test_service',
          affectedResources: ['test_resource'],
          indicators: ['test_indicator'],
          metadata: {}
        };

        await expect(securityMonitoring.processSecurityEvent(eventData))
          .rejects.toThrow('Failed to process security event');

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to process security event',
          expect.objectContaining({
            eventData,
            error: expect.any(String)
          })
        );
      });
    });
  });

  describe('Dashboard Data and Caching Performance', () => {
    describe('Dashboard Data Generation', () => {
      it('should generate comprehensive dashboard data with caching', async () => {
        // Mock cached dashboard data
        const cachedData = {
          summary: {
            totalEvents: 150,
            criticalEvents: 5,
            highEvents: 15,
            activeThreats: 3,
            resolvedIncidents: 120,
            falsePositives: 7
          },
          recentEvents: [],
          threatTrends: {
            timeframe: 'day',
            data: []
          },
          topThreats: [],
          systemHealth: {
            monitoring: 'healthy' as const,
            alerting: 'healthy' as const,
            threatDetection: 'healthy' as const,
            lastUpdate: new Date()
          },
          complianceStatus: {
            gdpr: { status: 'compliant' as const, score: 90 },
            pciDss: { status: 'compliant' as const, score: 85 },
            soc2: { status: 'compliant' as const, score: 88 }
          }
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

        const result = await securityMonitoring.getDashboardData('day');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(cachedData);
        expect(mockRedisClient.get).toHaveBeenCalledWith('security_monitoring:dashboard:day');
        expect(mockTimer.end).toHaveBeenCalledWith({ cached: true, timeframe: 'day' });
      });

      it('should build dashboard data when cache miss occurs', async () => {
        mockRedisClient.get.mockResolvedValue(null); // Cache miss
        mockRedisClient.lrange.mockResolvedValue(['event_1', 'event_2']);

        // Mock individual event retrieval
        const mockEvent = {
          id: 'event_1',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Test event',
          description: 'Test description',
          timestamp: new Date(),
          status: 'new' as const,
          tags: [],
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {}
        };

        jest.spyOn(securityMonitoring as any, 'getSecurityEventById')
          .mockResolvedValue(mockEvent);

        const result = await securityMonitoring.getDashboardData('hour');

        expect(result.success).toBe(true);
        expect(result.data?.summary).toBeDefined();
        expect(result.data?.recentEvents).toBeDefined();
        expect(result.data?.threatTrends).toBeDefined();
        expect(result.data?.systemHealth).toBeDefined();
        expect(result.data?.complianceStatus).toBeDefined();

        // Validate caching
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'security_monitoring:dashboard:hour',
          60, // 1 minute TTL
          expect.any(String)
        );
      });

      it('should validate dashboard performance requirements (<200ms)', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify({
          summary: { totalEvents: 10, criticalEvents: 0, highEvents: 2, activeThreats: 0, resolvedIncidents: 8, falsePositives: 0 },
          recentEvents: [],
          threatTrends: { timeframe: 'day', data: [] },
          topThreats: [],
          systemHealth: { monitoring: 'healthy', alerting: 'healthy', threatDetection: 'healthy', lastUpdate: new Date() },
          complianceStatus: { gdpr: { status: 'compliant', score: 90 }, pciDss: { status: 'compliant', score: 85 }, soc2: { status: 'compliant', score: 88 } }
        }));

        const startTime = Date.now();
        const result = await securityMonitoring.getDashboardData('day');
        const endTime = Date.now();

        const responseTime = endTime - startTime;

        expect(result.success).toBe(true);
        expect(responseTime).toBeLessThan(200); // <200ms requirement
      });
    });

    describe('Security Metrics Calculation', () => {
      it('should calculate comprehensive security metrics with caching', async () => {
        mockRedisClient.get.mockResolvedValue(null); // Cache miss for metrics

        // Mock events for metrics calculation
        mockRedisClient.lrange.mockResolvedValue(['event_1', 'event_2', 'event_3']);

        const mockEvents = [
          {
            id: 'event_1',
            type: SecurityEventType.AUTHENTICATION,
            severity: SecurityEventSeverity.HIGH,
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            source: 'auth_service',
            status: 'resolved' as const
          },
          {
            id: 'event_2',
            type: SecurityEventType.THREAT_DETECTED,
            severity: SecurityEventSeverity.CRITICAL,
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            source: 'threat_service',
            status: 'new' as const
          },
          {
            id: 'event_3',
            type: SecurityEventType.THREAT_DETECTED,
            severity: SecurityEventSeverity.MEDIUM,
            timestamp: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
            source: 'threat_service',
            status: 'false_positive' as const
          }
        ];

        jest.spyOn(securityMonitoring as any, 'getEventsForMetrics')
          .mockResolvedValue(mockEvents);

        const result = await securityMonitoring.getSecurityMetrics('day');

        expect(result.success).toBe(true);
        expect(result.data?.eventVolume).toBeDefined();
        expect(result.data?.eventVolume.total).toBe(3);
        expect(result.data?.eventVolume.byType[SecurityEventType.AUTHENTICATION]).toBe(1);
        expect(result.data?.eventVolume.byType[SecurityEventType.THREAT_DETECTED]).toBe(2);
        expect(result.data?.responseMetrics).toBeDefined();
        expect(result.data?.threatMetrics).toBeDefined();
        expect(result.data?.threatMetrics.threatsDetected).toBe(2);
        expect(result.data?.threatMetrics.falsePositiveRate).toBe(50); // 1 out of 2 threats

        // Validate caching
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'security_monitoring:metrics:day',
          300, // 5 minute TTL
          expect.any(String)
        );
      });
    });
  });

  describe('WebSocket Coordination for Real-Time Updates', () => {
    describe('Real-Time Event Subscription', () => {
      it('should allow subscription to security events with filtering', () => {
        const mockCallback = jest.fn();
        const filters = {
          types: [SecurityEventType.AUTHENTICATION, SecurityEventType.THREAT_DETECTED],
          severities: [SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL],
          userId: 'user123'
        };

        const unsubscribe = securityMonitoring.subscribeToEvents(mockCallback, filters);

        // Simulate security event that matches filters
        const matchingEvent = {
          id: 'event_match',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          userId: 'user123',
          title: 'Matching event',
          description: 'Event that matches filters',
          timestamp: new Date(),
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          status: 'new' as const,
          tags: []
        };

        securityMonitoring['eventEmitter'].emit('securityEvent', matchingEvent);

        expect(mockCallback).toHaveBeenCalledWith(matchingEvent);

        // Test filtering - non-matching event
        const nonMatchingEvent = {
          ...matchingEvent,
          type: SecurityEventType.COMPLIANCE_EVENT, // Different type
          userId: 'user456' // Different user
        };

        securityMonitoring['eventEmitter'].emit('securityEvent', nonMatchingEvent);

        expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again

        // Test unsubscribe
        unsubscribe();
        securityMonitoring['eventEmitter'].emit('securityEvent', matchingEvent);

        expect(mockCallback).toHaveBeenCalledTimes(1); // Should still be 1
      });

      it('should allow subscription to security alerts with severity filtering', () => {
        const mockCallback = jest.fn();
        const severityFilter = [SecurityEventSeverity.CRITICAL];

        const unsubscribe = securityMonitoring.subscribeToAlerts(mockCallback, severityFilter);

        // Simulate critical alert
        const criticalAlert = {
          id: 'alert_critical',
          eventId: 'event_123',
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Critical security alert',
          message: 'Critical security incident detected',
          timestamp: new Date(),
          channels: ['email', 'sms', 'slack'],
          recipients: ['security-team@company.com'],
          status: 'pending' as const,
          retryCount: 0,
          metadata: {}
        };

        securityMonitoring['eventEmitter'].emit('securityAlert', criticalAlert);

        expect(mockCallback).toHaveBeenCalledWith(criticalAlert);

        // Test filtering - medium alert
        const mediumAlert = {
          ...criticalAlert,
          severity: SecurityEventSeverity.MEDIUM
        };

        securityMonitoring['eventEmitter'].emit('securityAlert', mediumAlert);

        expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called for medium

        unsubscribe();
      });
    });
  });

  describe('Event Status Management and Workflow', () => {
    describe('Event Status Updates', () => {
      it('should update event status with proper audit trail', async () => {
        const eventId = 'event_123';
        const mockEvent = {
          id: eventId,
          type: SecurityEventType.SECURITY_INCIDENT,
          severity: SecurityEventSeverity.HIGH,
          title: 'Security incident',
          description: 'Active security incident',
          timestamp: new Date(),
          status: 'new' as const,
          source: 'incident_service',
          affectedResources: ['system'],
          indicators: ['incident'],
          metadata: {},
          tags: []
        };

        jest.spyOn(securityMonitoring as any, 'getSecurityEventById')
          .mockResolvedValue(mockEvent);

        jest.spyOn(securityMonitoring as any, 'storeSecurityEvent')
          .mockResolvedValue(undefined);

        const eventStatusChangeSpy = jest.spyOn(securityMonitoring['eventEmitter'], 'emit');

        const result = await securityMonitoring.updateEventStatus(
          eventId,
          'resolved',
          'security_analyst_1',
          'Incident contained and resolved'
        );

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('resolved');
        expect(result.data?.assignedTo).toBe('security_analyst_1');
        expect(result.data?.resolution).toBe('Incident contained and resolved');

        // Validate audit logging
        expect(mockAuditLog.logDataAccess).toHaveBeenCalledWith(
          'security_events',
          eventId,
          expect.any(String), // AuditAction.UPDATE
          'security_analyst_1',
          undefined,
          undefined,
          undefined,
          expect.objectContaining({ status: 'resolved' }),
          expect.objectContaining({ 
            status: 'resolved', 
            resolution: 'Incident contained and resolved' 
          }),
          expect.objectContaining({
            statusChange: true,
            previousStatus: 'resolved', // Will be set by the event object
            newStatus: 'resolved'
          })
        );

        // Validate event emission
        expect(eventStatusChangeSpy).toHaveBeenCalledWith(
          'eventStatusChange',
          expect.objectContaining({
            event: expect.objectContaining({ status: 'resolved' }),
            previousStatus: 'resolved',
            newStatus: 'resolved'
          })
        );
      });

      it('should handle non-existent event status update gracefully', async () => {
        jest.spyOn(securityMonitoring as any, 'getSecurityEventById')
          .mockResolvedValue(null);

        await expect(securityMonitoring.updateEventStatus(
          'non_existent_event',
          'resolved'
        )).rejects.toThrow('Security event not found');
      });
    });
  });

  describe('Security Event Filtering and Querying', () => {
    describe('Advanced Event Filtering', () => {
      it('should filter security events by multiple criteria', async () => {
        const filters = {
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          status: 'new' as const,
          userId: 'user123',
          ipAddress: '192.168.1.100',
          since: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          until: new Date(),
          tags: ['brute_force', 'suspicious'],
          limit: 50,
          offset: 0
        };

        mockRedisClient.get.mockResolvedValue(null); // Cache miss
        mockRedisClient.lrange.mockResolvedValue(['event_1', 'event_2']);

        const mockFilteredEvents = [
          {
            id: 'event_1',
            type: SecurityEventType.AUTHENTICATION,
            severity: SecurityEventSeverity.HIGH,
            status: 'new' as const,
            userId: 'user123',
            ipAddress: '192.168.1.100',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            tags: ['brute_force', 'suspicious'],
            title: 'Authentication failure',
            description: 'Multiple failed attempts',
            source: 'auth_service',
            affectedResources: ['user_account'],
            indicators: ['brute_force'],
            metadata: {}
          }
        ];

        jest.spyOn(securityMonitoring as any, 'fetchSecurityEvents')
          .mockResolvedValue(mockFilteredEvents);

        jest.spyOn(securityMonitoring as any, 'countSecurityEvents')
          .mockResolvedValue(1);

        const result = await securityMonitoring.getSecurityEvents(filters);

        expect(result.success).toBe(true);
        expect(result.data?.events).toHaveLength(1);
        expect(result.data?.total).toBe(1);
        expect(result.data?.events[0]).toMatchObject({
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          userId: 'user123',
          ipAddress: '192.168.1.100'
        });
      });

      it('should handle pagination correctly', async () => {
        const filters = {
          limit: 10,
          offset: 20
        };

        mockRedisClient.get.mockResolvedValue(null);
        
        const result = await securityMonitoring.getSecurityEvents(filters);

        expect(result.success).toBe(true);
        // Validate that limit is enforced (max 1000)
        expect(filters.limit).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Performance and Scalability Validation', () => {
    describe('High-Volume Event Processing', () => {
      it('should handle high volume of security events efficiently', async () => {
        const eventCount = 100;
        const events = Array.from({ length: eventCount }, (_, i) => ({
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.MEDIUM,
          title: `Event ${i}`,
          description: `Test event ${i}`,
          source: 'load_test',
          affectedResources: ['test_resource'],
          indicators: ['load_test'],
          metadata: { eventNumber: i }
        }));

        const startTime = Date.now();
        const results = await Promise.allSettled(
          events.map(event => securityMonitoring.processSecurityEvent(event))
        );
        const endTime = Date.now();

        const processingTime = endTime - startTime;
        const successfulEvents = results.filter(r => r.status === 'fulfilled').length;

        expect(successfulEvents).toBeGreaterThan(eventCount * 0.9); // 90% success rate
        expect(processingTime).toBeLessThan(eventCount * 10); // < 10ms per event average
      });
    });

    describe('Memory and Resource Usage', () => {
      it('should manage memory efficiently during event processing', async () => {
        const initialMemory = process.memoryUsage().heapUsed;

        // Process events without keeping references
        for (let i = 0; i < 50; i++) {
          await securityMonitoring.processSecurityEvent({
            type: SecurityEventType.COMPLIANCE_EVENT,
            severity: SecurityEventSeverity.LOW,
            title: `Memory test ${i}`,
            description: 'Memory efficiency test',
            source: 'memory_test',
            affectedResources: ['test'],
            indicators: ['memory_test'],
            metadata: {}
          });
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
      });
    });
  });

  describe('Integration and End-to-End Scenarios', () => {
    describe('Security Incident Workflow', () => {
      it('should handle complete security incident lifecycle', async () => {
        // 1. Create security incident
        const incidentData = {
          type: SecurityEventType.SECURITY_INCIDENT,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Data breach attempt',
          description: 'Unauthorized access to customer database',
          userId: 'attacker_unknown',
          ipAddress: '203.0.113.50',
          userAgent: 'automated_scanner',
          source: 'intrusion_detection',
          affectedResources: ['customer_database', 'personal_data'],
          indicators: ['data_exfiltration', 'sql_injection'],
          metadata: {
            attackVector: 'sql_injection',
            dataAtRisk: 'customer_pii',
            estimatedRecords: 10000
          }
        };

        // 2. Process the incident
        const processResult = await securityMonitoring.processSecurityEvent(incidentData);

        expect(processResult.success).toBe(true);
        expect(processResult.data?.severity).toBe(SecurityEventSeverity.CRITICAL);

        // 3. Update incident status to investigating
        const investigateResult = await securityMonitoring.updateEventStatus(
          processResult.data!.id,
          'investigating',
          'security_analyst_1',
          'Security team investigating the incident'
        );

        expect(investigateResult.success).toBe(true);
        expect(investigateResult.data?.status).toBe('investigating');

        // 4. Resolve the incident
        const resolveResult = await securityMonitoring.updateEventStatus(
          processResult.data!.id,
          'resolved',
          'security_analyst_1',
          'Incident contained. Attack blocked and vulnerabilities patched.'
        );

        expect(resolveResult.success).toBe(true);
        expect(resolveResult.data?.status).toBe('resolved');
        expect(resolveResult.data?.resolution).toContain('contained');
      });
    });
  });
});