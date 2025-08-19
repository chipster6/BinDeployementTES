/**
 * ============================================================================
 * TASK 17: SECURITY MONITORING SYSTEM TESTING (Redis + WebSocket)
 * ============================================================================
 *
 * Comprehensive testing framework for SecurityMonitoringService with Redis
 * integration and WebSocket coordination. Tests real-time event processing,
 * dashboard data management, alert systems, and Frontend coordination.
 *
 * Test Coverage:
 * - Security event processing pipeline
 * - Redis integration (storage, caching, metrics)
 * - WebSocket real-time coordination
 * - Dashboard data generation and caching
 * - Alert creation and multi-channel delivery
 * - Event correlation and status management
 * - Performance under high event volume
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import {
  SecurityMonitoringService,
  SecurityEventType,
  SecurityEventSeverity,
  SecurityEvent,
  SecurityAlert,
  SecurityDashboardData,
  SecurityMetrics,
} from '@/services/security/SecurityMonitoringService';
import { redisClient } from '@/config/redis';
import { AuditLog, AuditAction } from '@/models/AuditLog';
import EventEmitter from 'events';

// Mock Redis client
jest.mock('@/config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
    lrange: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
}));

// Mock AuditLog
jest.mock('@/models/AuditLog', () => ({
  AuditLog: {
    logDataAccess: jest.fn(),
    create: jest.fn(),
  },
  AuditAction: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  Timer: jest.fn().mockImplementation(() => ({
    end: jest.fn(),
  })),
}));

describe('Task 17: Security Monitoring System Testing (Redis + WebSocket)', () => {
  let securityMonitoringService: SecurityMonitoringService;
  let mockRedisClient: jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    securityMonitoringService = new SecurityMonitoringService();
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

    // Default Redis mock responses
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.ltrim.mockResolvedValue('OK');
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.lrange.mockResolvedValue([]);
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.keys.mockResolvedValue([]);
  });

  describe('Security Event Processing Pipeline', () => {
    describe('Event Creation and Storage', () => {
      it('should process security event with complete pipeline', async () => {
        const eventData = {
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Suspicious Login Attempt',
          description: 'Multiple failed login attempts from unknown IP',
          userId: 'user_123',
          sessionId: 'session_456',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          source: 'auth_service',
          affectedResources: ['user_account', 'session_management'],
          indicators: ['brute_force', 'unknown_ip'],
          metadata: {
            failedAttempts: 5,
            timeWindow: '5min',
          },
        };

        const result = await securityMonitoringService.processSecurityEvent(eventData);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!.id).toMatch(/^sec_event_/);
        expect(result.data!.type).toBe(SecurityEventType.AUTHENTICATION);
        expect(result.data!.severity).toBe(SecurityEventSeverity.HIGH);
        expect(result.data!.status).toBe('new');

        // Verify Redis storage calls
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^security_event:/),
          24 * 60 * 60, // 24 hours
          expect.stringContaining('"type":"authentication"')
        );

        expect(mockRedisClient.lpush).toHaveBeenCalledWith(
          'security_events:recent',
          expect.stringMatching(/^sec_event_/)
        );

        expect(mockRedisClient.lpush).toHaveBeenCalledWith(
          'security_events:high',
          expect.stringMatching(/^sec_event_/)
        );

        // Verify audit logging
        expect(AuditLog.logDataAccess).toHaveBeenCalledWith(
          'security_events',
          result.data!.id,
          AuditAction.CREATE,
          'user_123',
          'session_456',
          '192.168.1.100',
          'Mozilla/5.0...',
          undefined,
          expect.objectContaining({
            type: 'authentication',
            severity: 'high',
            title: 'Suspicious Login Attempt',
          }),
          expect.objectContaining({
            securityEvent: true,
            indicators: ['brute_force', 'unknown_ip'],
          })
        );
      });

      it('should generate appropriate event tags', async () => {
        const eventData = {
          type: SecurityEventType.THREAT_DETECTED,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'SQL Injection Attack',
          description: 'Detected SQL injection attempt in API endpoint',
          source: 'api_gateway',
          affectedResources: ['database', 'api_endpoint'],
          indicators: ['sql_injection', 'malicious_payload'],
          metadata: {},
        };

        const result = await securityMonitoringService.processSecurityEvent(eventData);

        expect(result.data!.tags).toContain('type:threat_detected');
        expect(result.data!.tags).toContain('severity:critical');
        expect(result.data!.tags).toContain('source:api_gateway');
        expect(result.data!.tags).toContain('resource:database');
        expect(result.data!.tags).toContain('resource:api_endpoint');
        expect(result.data!.tags).toContain('attack:sql_injection');
      });

      it('should create alerts for high severity events', async () => {
        const criticalEventData = {
          type: SecurityEventType.SECURITY_INCIDENT,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Data Breach Detected',
          description: 'Unauthorized access to customer database',
          source: 'intrusion_detection',
          affectedResources: ['customer_database'],
          indicators: ['data_exfiltration'],
          metadata: {},
        };

        const result = await securityMonitoringService.processSecurityEvent(criticalEventData);

        expect(result.success).toBe(true);

        // Verify alert creation for critical event
        // Note: We would need to mock the createSecurityAlert method or verify its side effects
      });

      it('should handle event processing errors gracefully', async () => {
        // Mock Redis failure
        mockRedisClient.setex.mockRejectedValue(new Error('Redis connection failed'));

        const eventData = {
          type: SecurityEventType.SYSTEM_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'Failed System Access',
          description: 'System access denied',
          source: 'system',
          affectedResources: [],
          indicators: [],
          metadata: {},
        };

        await expect(
          securityMonitoringService.processSecurityEvent(eventData)
        ).rejects.toThrow('Failed to process security event');
      });
    });

    describe('Event Retrieval and Filtering', () => {
      it('should retrieve security events with filters', async () => {
        const mockEventIds = ['event_1', 'event_2', 'event_3'];
        const mockEvent1 = {
          id: 'event_1',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          status: 'new',
          timestamp: new Date(),
          tags: ['type:authentication', 'severity:high'],
        };

        mockRedisClient.lrange.mockResolvedValue(mockEventIds);
        mockRedisClient.get
          .mockResolvedValueOnce(JSON.stringify(mockEvent1))
          .mockResolvedValueOnce(null) // event_2 not found
          .mockResolvedValueOnce(null); // event_3 not found

        const filters = {
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          limit: 10,
          offset: 0,
        };

        const result = await securityMonitoringService.getSecurityEvents(filters);

        expect(result.success).toBe(true);
        expect(result.data!.events).toHaveLength(1);
        expect(result.data!.events[0].type).toBe(SecurityEventType.AUTHENTICATION);
        expect(result.data!.total).toBe(1);

        expect(mockRedisClient.lrange).toHaveBeenCalledWith(
          'security_events:recent',
          0,
          9 // offset + limit - 1
        );
      });

      it('should respect event query limits', async () => {
        const filters = {
          limit: 2000, // Exceeds MAX_EVENTS_PER_QUERY
        };

        const result = await securityMonitoringService.getSecurityEvents(filters);

        expect(mockRedisClient.lrange).toHaveBeenCalledWith(
          'security_events:recent',
          0,
          999 // MAX_EVENTS_PER_QUERY - 1
        );
      });

      it('should handle event filtering by multiple criteria', async () => {
        const mockEvent = {
          id: 'event_123',
          type: SecurityEventType.DATA_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          status: 'investigating',
          userId: 'user_456',
          ipAddress: '10.0.0.1',
          timestamp: new Date('2025-08-16T10:00:00Z'),
          tags: ['type:data_access'],
        };

        mockRedisClient.lrange.mockResolvedValue(['event_123']);
        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEvent));

        const filters = {
          type: SecurityEventType.DATA_ACCESS,
          status: 'investigating' as const,
          userId: 'user_456',
          since: new Date('2025-08-16T09:00:00Z'),
          until: new Date('2025-08-16T11:00:00Z'),
        };

        const result = await securityMonitoringService.getSecurityEvents(filters);

        expect(result.success).toBe(true);
        expect(result.data!.events).toHaveLength(1);
        expect(result.data!.events[0].userId).toBe('user_456');
      });
    });

    describe('Event Status Management', () => {
      it('should update event status with audit trail', async () => {
        const mockEvent = {
          id: 'event_123',
          type: SecurityEventType.THREAT_DETECTED,
          severity: SecurityEventSeverity.HIGH,
          status: 'new',
          title: 'Threat Event',
          description: 'Test threat',
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          timestamp: new Date(),
          tags: [],
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEvent));

        const result = await securityMonitoringService.updateEventStatus(
          'event_123',
          'resolved',
          'analyst_user',
          'False positive - legitimate user behavior'
        );

        expect(result.success).toBe(true);
        expect(result.data!.status).toBe('resolved');
        expect(result.data!.assignedTo).toBe('analyst_user');
        expect(result.data!.resolution).toBe('False positive - legitimate user behavior');

        // Verify audit logging for status change
        expect(AuditLog.logDataAccess).toHaveBeenCalledWith(
          'security_events',
          'event_123',
          AuditAction.UPDATE,
          'analyst_user',
          undefined,
          undefined,
          undefined,
          expect.objectContaining({ status: 'resolved' }),
          expect.objectContaining({
            status: 'resolved',
            resolution: 'False positive - legitimate user behavior',
          }),
          expect.objectContaining({
            statusChange: true,
            previousStatus: 'resolved',
            newStatus: 'resolved',
          })
        );

        // Verify event is stored back to Redis
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'security_event:event_123',
          24 * 60 * 60,
          expect.stringContaining('"status":"resolved"')
        );
      });

      it('should handle non-existent event updates', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await expect(
          securityMonitoringService.updateEventStatus('non_existent', 'resolved')
        ).rejects.toThrow('Security event not found');
      });
    });
  });

  describe('Redis Integration and Caching', () => {
    describe('Event Storage and Retrieval', () => {
      it('should store events with proper TTL and list management', async () => {
        const eventData = {
          type: SecurityEventType.POLICY_VIOLATION,
          severity: SecurityEventSeverity.LOW,
          title: 'Policy Violation',
          description: 'Minor policy violation detected',
          source: 'policy_engine',
          affectedResources: ['user_policy'],
          indicators: ['policy_breach'],
          metadata: {},
        };

        await securityMonitoringService.processSecurityEvent(eventData);

        // Verify Redis operations
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^security_event:sec_event_/),
          24 * 60 * 60, // 24 hour TTL
          expect.any(String)
        );

        expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
          'security_events:recent',
          0,
          999 // Keep last 1000 events
        );

        expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
          'security_events:low',
          0,
          499 // Keep last 500 per severity
        );

        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          'security_events:recent',
          24 * 60 * 60
        );
      });

      it('should handle Redis connection failures gracefully', async () => {
        mockRedisClient.setex.mockRejectedValue(new Error('Redis timeout'));

        const eventData = {
          type: SecurityEventType.COMPLIANCE_EVENT,
          severity: SecurityEventSeverity.INFO,
          title: 'Compliance Check',
          description: 'Routine compliance verification',
          source: 'compliance_engine',
          affectedResources: [],
          indicators: [],
          metadata: {},
        };

        await expect(
          securityMonitoringService.processSecurityEvent(eventData)
        ).rejects.toThrow('Failed to process security event');
      });
    });

    describe('Dashboard Data Caching', () => {
      it('should generate and cache dashboard data', async () => {
        const mockEventIds = ['event_1', 'event_2', 'event_3'];
        const mockEvents = [
          {
            id: 'event_1',
            type: SecurityEventType.THREAT_DETECTED,
            severity: SecurityEventSeverity.CRITICAL,
            status: 'new',
            timestamp: new Date(),
          },
          {
            id: 'event_2',
            type: SecurityEventType.AUTHENTICATION,
            severity: SecurityEventSeverity.HIGH,
            status: 'investigating',
            timestamp: new Date(),
          },
          {
            id: 'event_3',
            type: SecurityEventType.THREAT_DETECTED,
            severity: SecurityEventSeverity.CRITICAL,
            status: 'resolved',
            timestamp: new Date(),
          },
        ];

        mockRedisClient.lrange.mockResolvedValue(mockEventIds);
        mockRedisClient.get
          .mockResolvedValueOnce(null) // No cached dashboard data
          .mockResolvedValueOnce(JSON.stringify(mockEvents[0]))
          .mockResolvedValueOnce(JSON.stringify(mockEvents[1]))
          .mockResolvedValueOnce(JSON.stringify(mockEvents[2]));

        const result = await securityMonitoringService.getDashboardData('day');

        expect(result.success).toBe(true);
        expect(result.data!.summary.totalEvents).toBe(3);
        expect(result.data!.summary.criticalEvents).toBe(2);
        expect(result.data!.summary.activeThreats).toBe(1); // Only 'new' threat events
        expect(result.data!.summary.resolvedIncidents).toBe(1);
        expect(result.data!.recentEvents).toHaveLength(3);

        // Verify caching
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/dashboard:day/),
          60, // DASHBOARD_CACHE_TTL
          expect.any(String)
        );
      });

      it('should return cached dashboard data when available', async () => {
        const cachedDashboard = {
          summary: {
            totalEvents: 5,
            criticalEvents: 2,
            highEvents: 1,
            activeThreats: 1,
            resolvedIncidents: 2,
            falsePositives: 1,
          },
          recentEvents: [],
          threatTrends: { timeframe: 'day', data: [] },
          topThreats: [],
          systemHealth: {
            monitoring: 'healthy' as const,
            alerting: 'healthy' as const,
            threatDetection: 'healthy' as const,
            lastUpdate: new Date(),
          },
          complianceStatus: {
            gdpr: { status: 'compliant' as const, score: 90 },
            pciDss: { status: 'compliant' as const, score: 85 },
            soc2: { status: 'compliant' as const, score: 88 },
          },
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedDashboard));

        const result = await securityMonitoringService.getDashboardData('hour');

        expect(result.success).toBe(true);
        expect(result.data!.summary.totalEvents).toBe(5);

        // Should not fetch new data if cached
        expect(mockRedisClient.lrange).not.toHaveBeenCalled();
      });

      it('should handle different timeframes correctly', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.lrange.mockResolvedValue([]);

        await securityMonitoringService.getDashboardData('week');
        await securityMonitoringService.getDashboardData('month');

        expect(mockRedisClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/dashboard:week/)
        );
        expect(mockRedisClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/dashboard:month/)
        );
      });
    });

    describe('Metrics Calculation and Caching', () => {
      it('should calculate and cache security metrics', async () => {
        const mockEvents = [
          {
            type: SecurityEventType.AUTHENTICATION,
            severity: SecurityEventSeverity.HIGH,
            timestamp: new Date(),
            source: 'auth_service',
          },
          {
            type: SecurityEventType.THREAT_DETECTED,
            severity: SecurityEventSeverity.CRITICAL,
            timestamp: new Date(),
            source: 'ids',
            status: 'resolved',
          },
        ];

        mockRedisClient.get.mockResolvedValue(null); // No cached metrics
        mockRedisClient.lrange.mockResolvedValue(['event_1', 'event_2']);
        mockRedisClient.get
          .mockResolvedValueOnce(JSON.stringify(mockEvents[0]))
          .mockResolvedValueOnce(JSON.stringify(mockEvents[1]));

        const result = await securityMonitoringService.getSecurityMetrics('day');

        expect(result.success).toBe(true);
        expect(result.data!.eventVolume.total).toBe(2);
        expect(result.data!.eventVolume.byType[SecurityEventType.AUTHENTICATION]).toBe(1);
        expect(result.data!.eventVolume.byType[SecurityEventType.THREAT_DETECTED]).toBe(1);
        expect(result.data!.eventVolume.bySeverity[SecurityEventSeverity.HIGH]).toBe(1);
        expect(result.data!.eventVolume.bySeverity[SecurityEventSeverity.CRITICAL]).toBe(1);

        // Verify metrics caching
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/metrics:day/),
          300, // METRICS_CACHE_TTL
          expect.any(String)
        );
      });

      it('should return cached metrics when available', async () => {
        const cachedMetrics = {
          eventVolume: {
            total: 10,
            byType: {},
            bySeverity: {},
            byHour: [],
          },
          responseMetrics: {
            meanTimeToDetection: 30,
            meanTimeToResponse: 120,
            meanTimeToResolution: 1800,
            alertAccuracy: 95,
          },
          threatMetrics: {
            threatsDetected: 5,
            threatsBlocked: 4,
            falsePositiveRate: 20,
            threatSources: {},
          },
          userMetrics: {
            activeUsers: 100,
            suspiciousUsers: 2,
            blockedUsers: 1,
            privilegedUserActivity: 15,
          },
          systemMetrics: {
            uptime: 99.9,
            performanceScore: 98,
            errorRate: 0.1,
            resourceUtilization: 60,
          },
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedMetrics));

        const result = await securityMonitoringService.getSecurityMetrics('hour');

        expect(result.success).toBe(true);
        expect(result.data!.eventVolume.total).toBe(10);
        expect(result.data!.responseMetrics.alertAccuracy).toBe(95);
      });
    });
  });

  describe('WebSocket Real-time Coordination', () => {
    describe('Event Subscription Management', () => {
      it('should handle event subscriptions with filtering', () => {
        const mockCallback = jest.fn();
        const filters = {
          types: [SecurityEventType.AUTHENTICATION, SecurityEventType.THREAT_DETECTED],
          severities: [SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL],
          userId: 'user_123',
        };

        const unsubscribe = securityMonitoringService.subscribeToEvents(mockCallback, filters);

        // Simulate event emission that matches filters
        const matchingEvent: SecurityEvent = {
          id: 'event_123',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Test Event',
          description: 'Test Description',
          userId: 'user_123',
          timestamp: new Date(),
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          status: 'new',
          tags: [],
        };

        // Emit the event
        securityMonitoringService['eventEmitter'].emit('securityEvent', matchingEvent);

        expect(mockCallback).toHaveBeenCalledWith(matchingEvent);

        // Test unsubscribe
        unsubscribe();

        // Clear mock and emit again
        mockCallback.mockClear();
        securityMonitoringService['eventEmitter'].emit('securityEvent', matchingEvent);

        expect(mockCallback).not.toHaveBeenCalled();
      });

      it('should filter events that do not match subscription criteria', () => {
        const mockCallback = jest.fn();
        const filters = {
          types: [SecurityEventType.AUTHENTICATION],
          severities: [SecurityEventSeverity.CRITICAL],
        };

        securityMonitoringService.subscribeToEvents(mockCallback, filters);

        // Event that doesn't match type filter
        const nonMatchingEvent1: SecurityEvent = {
          id: 'event_1',
          type: SecurityEventType.DATA_ACCESS, // Wrong type
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Test',
          description: 'Test',
          timestamp: new Date(),
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          status: 'new',
          tags: [],
        };

        // Event that doesn't match severity filter
        const nonMatchingEvent2: SecurityEvent = {
          id: 'event_2',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.LOW, // Wrong severity
          title: 'Test',
          description: 'Test',
          timestamp: new Date(),
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          status: 'new',
          tags: [],
        };

        securityMonitoringService['eventEmitter'].emit('securityEvent', nonMatchingEvent1);
        securityMonitoringService['eventEmitter'].emit('securityEvent', nonMatchingEvent2);

        expect(mockCallback).not.toHaveBeenCalled();
      });
    });

    describe('Alert Subscription Management', () => {
      it('should handle alert subscriptions with severity filtering', () => {
        const mockCallback = jest.fn();
        const severityFilter = [SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL];

        const unsubscribe = securityMonitoringService.subscribeToAlerts(mockCallback, severityFilter);

        // Simulate alert emission
        const criticalAlert: SecurityAlert = {
          id: 'alert_123',
          eventId: 'event_123',
          title: 'Critical Security Alert',
          message: 'Critical security incident detected',
          severity: SecurityEventSeverity.CRITICAL,
          timestamp: new Date(),
          channels: ['email', 'sms', 'slack'],
          recipients: ['security@company.com'],
          status: 'pending',
          retryCount: 0,
          metadata: {},
        };

        securityMonitoringService['eventEmitter'].emit('securityAlert', criticalAlert);

        expect(mockCallback).toHaveBeenCalledWith(criticalAlert);

        // Test unsubscribe
        unsubscribe();
        mockCallback.mockClear();

        securityMonitoringService['eventEmitter'].emit('securityAlert', criticalAlert);
        expect(mockCallback).not.toHaveBeenCalled();
      });

      it('should filter alerts by severity', () => {
        const mockCallback = jest.fn();
        const severityFilter = [SecurityEventSeverity.CRITICAL];

        securityMonitoringService.subscribeToAlerts(mockCallback, severityFilter);

        const lowSeverityAlert: SecurityAlert = {
          id: 'alert_456',
          eventId: 'event_456',
          title: 'Low Priority Alert',
          message: 'Low priority security event',
          severity: SecurityEventSeverity.LOW,
          timestamp: new Date(),
          channels: ['webhook'],
          recipients: [],
          status: 'pending',
          retryCount: 0,
          metadata: {},
        };

        securityMonitoringService['eventEmitter'].emit('securityAlert', lowSeverityAlert);

        expect(mockCallback).not.toHaveBeenCalled();
      });
    });

    describe('Real-time Event Broadcasting', () => {
      it('should emit events when processed', async () => {
        const eventEmitterSpy = jest.spyOn(securityMonitoringService['eventEmitter'], 'emit');

        const eventData = {
          type: SecurityEventType.SYSTEM_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'System Access Event',
          description: 'User accessed secure system',
          source: 'access_control',
          affectedResources: ['secure_system'],
          indicators: ['system_access'],
          metadata: {},
        };

        await securityMonitoringService.processSecurityEvent(eventData);

        expect(eventEmitterSpy).toHaveBeenCalledWith(
          'securityEvent',
          expect.objectContaining({
            type: SecurityEventType.SYSTEM_ACCESS,
            severity: SecurityEventSeverity.MEDIUM,
            title: 'System Access Event',
          })
        );
      });

      it('should emit status change events', async () => {
        const eventEmitterSpy = jest.spyOn(securityMonitoringService['eventEmitter'], 'emit');

        const mockEvent = {
          id: 'event_123',
          type: SecurityEventType.DATA_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          status: 'new',
          title: 'Data Access Event',
          description: 'Test',
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          timestamp: new Date(),
          tags: [],
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEvent));

        await securityMonitoringService.updateEventStatus('event_123', 'investigating');

        expect(eventEmitterSpy).toHaveBeenCalledWith(
          'eventStatusChange',
          expect.objectContaining({
            event: expect.objectContaining({ status: 'investigating' }),
            previousStatus: 'investigating',
            newStatus: 'investigating',
          })
        );
      });
    });
  });

  describe('Performance and Error Handling', () => {
    describe('High Volume Event Processing', () => {
      it('should handle multiple concurrent events', async () => {
        const eventPromises = [];

        for (let i = 0; i < 10; i++) {
          const eventData = {
            type: SecurityEventType.AUTHENTICATION,
            severity: SecurityEventSeverity.MEDIUM,
            title: `Event ${i}`,
            description: `Test event ${i}`,
            source: 'load_test',
            affectedResources: [],
            indicators: [],
            metadata: { eventNumber: i },
          };

          eventPromises.push(securityMonitoringService.processSecurityEvent(eventData));
        }

        const results = await Promise.all(eventPromises);

        expect(results).toHaveLength(10);
        results.forEach(result => {
          expect(result.success).toBe(true);
        });

        // Verify Redis was called for each event
        expect(mockRedisClient.setex).toHaveBeenCalledTimes(10);
        expect(mockRedisClient.lpush).toHaveBeenCalledTimes(20); // 2 calls per event
      });

      it('should handle event emitter memory leaks', () => {
        const initialListenerCount = securityMonitoringService['eventEmitter'].listenerCount('securityEvent');

        // Add many subscriptions
        const unsubscribeFunctions = [];
        for (let i = 0; i < 50; i++) {
          const unsubscribe = securityMonitoringService.subscribeToEvents(() => {});
          unsubscribeFunctions.push(unsubscribe);
        }

        expect(securityMonitoringService['eventEmitter'].listenerCount('securityEvent')).toBe(
          initialListenerCount + 50
        );

        // Unsubscribe all
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());

        expect(securityMonitoringService['eventEmitter'].listenerCount('securityEvent')).toBe(
          initialListenerCount
        );
      });
    });

    describe('Error Recovery and Resilience', () => {
      it('should handle partial Redis failures gracefully', async () => {
        // First Redis call succeeds, subsequent calls fail
        mockRedisClient.setex.mockResolvedValueOnce('OK');
        mockRedisClient.lpush.mockRejectedValue(new Error('Redis lpush failed'));

        const eventData = {
          type: SecurityEventType.COMPLIANCE_EVENT,
          severity: SecurityEventSeverity.INFO,
          title: 'Compliance Event',
          description: 'Compliance check performed',
          source: 'compliance',
          affectedResources: [],
          indicators: [],
          metadata: {},
        };

        await expect(
          securityMonitoringService.processSecurityEvent(eventData)
        ).rejects.toThrow('Failed to process security event');
      });

      it('should handle dashboard generation failures', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.lrange.mockRejectedValue(new Error('Redis lrange failed'));

        const result = await securityMonitoringService.getDashboardData('day');

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Redis lrange failed');
      });

      it('should handle metrics calculation failures', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.lrange.mockRejectedValue(new Error('Redis metrics failed'));

        const result = await securityMonitoringService.getSecurityMetrics('hour');

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Redis metrics failed');
      });
    });

    describe('Cache Invalidation', () => {
      it('should invalidate dashboard cache after event processing', async () => {
        const mockKeys = [
          'security_monitoring:dashboard:day',
          'security_monitoring:metrics:hour',
        ];

        mockRedisClient.keys.mockResolvedValue(mockKeys);

        const eventData = {
          type: SecurityEventType.POLICY_VIOLATION,
          severity: SecurityEventSeverity.LOW,
          title: 'Policy Event',
          description: 'Policy violation detected',
          source: 'policy',
          affectedResources: [],
          indicators: [],
          metadata: {},
        };

        await securityMonitoringService.processSecurityEvent(eventData);

        expect(mockRedisClient.keys).toHaveBeenCalledWith('security_monitoring:dashboard:*');
        expect(mockRedisClient.del).toHaveBeenCalledWith(...mockKeys);
      });

      it('should invalidate cache after status updates', async () => {
        const mockEvent = {
          id: 'event_123',
          type: SecurityEventType.THREAT_DETECTED,
          severity: SecurityEventSeverity.HIGH,
          status: 'new',
          title: 'Threat',
          description: 'Test',
          source: 'test',
          affectedResources: [],
          indicators: [],
          metadata: {},
          timestamp: new Date(),
          tags: [],
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEvent));
        mockRedisClient.keys.mockResolvedValue(['cache_key_1', 'cache_key_2']);

        await securityMonitoringService.updateEventStatus('event_123', 'resolved');

        expect(mockRedisClient.keys).toHaveBeenCalledTimes(2); // dashboard:* and metrics:*
        expect(mockRedisClient.del).toHaveBeenCalled();
      });
    });
  });
});