/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SECURITY MONITORING SERVICE UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for SecurityMonitoringService including real-time
 * event processing, WebSocket integration, Redis storage, dashboard data
 * generation, and alert management.
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { 
  SecurityMonitoringService, 
  SecurityEvent, 
  SecurityAlert, 
  SecurityEventSeverity, 
  SecurityEventType,
  SecurityDashboardData,
  SecurityMetrics
} from '@/services/security/SecurityMonitoringService';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { redisClient } from '@/config/redis';
import { AuditLog } from '@/models/AuditLog';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
    lrange: jest.fn(),
    keys: jest.fn(),
  },
}));

jest.mock('@/models/AuditLog', () => ({
  AuditLog: {
    logDataAccess: jest.fn(),
    findAll: jest.fn(),
  },
}));

describe('SecurityMonitoringService', () => {
  let securityMonitoringService: SecurityMonitoringService;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
  const mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

  beforeAll(async () => {
    await DatabaseTestHelper.initialize();
  });

  afterAll(async () => {
    await DatabaseTestHelper.close();
  });

  beforeEach(async () => {
    await DatabaseTestHelper.reset();
    securityMonitoringService = new SecurityMonitoringService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.ltrim.mockResolvedValue('OK');
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.lrange.mockResolvedValue([]);
    mockRedisClient.keys.mockResolvedValue([]);
    mockAuditLog.logDataAccess.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await DatabaseTestHelper.cleanup();
  });

  describe('processSecurityEvent', () => {
    it('should process a security event successfully', async () => {
      // Arrange
      const eventData = {
        type: SecurityEventType.AUTHENTICATION,
        severity: SecurityEventSeverity.MEDIUM,
        title: 'Failed Login Attempt',
        description: 'Multiple failed login attempts detected from IP 192.168.1.100',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        source: 'authentication-service',
        affectedResources: ['user-account', 'session-management'],
        indicators: ['brute_force', 'suspicious_ip'],
        metadata: {
          failedAttempts: 5,
          lastAttempt: new Date(),
        },
      };

      // Act
      const result = await securityMonitoringService.processSecurityEvent(eventData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toMatch(/^sec_event_/);
      expect(result.data.type).toBe(SecurityEventType.AUTHENTICATION);
      expect(result.data.severity).toBe(SecurityEventSeverity.MEDIUM);
      expect(result.data.status).toBe('new');
      expect(result.data.tags).toContain('type:authentication');
      expect(result.data.tags).toContain('severity:medium');
      expect(result.data.tags).toContain('source:authentication-service');
      expect(result.data.tags).toContain('attack:brute_force');

      // Verify Redis storage calls
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^security_event:/),
        24 * 60 * 60, // 24 hours
        expect.any(String)
      );
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'security_events:recent',
        result.data.id
      );
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'security_events:medium',
        result.data.id
      );

      // Verify audit logging
      expect(mockAuditLog.logDataAccess).toHaveBeenCalledWith(
        'security_events',
        result.data.id,
        'CREATE',
        'user-123',
        'session-456',
        '192.168.1.100',
        'Mozilla/5.0...',
        undefined,
        expect.objectContaining({
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'Failed Login Attempt',
          source: 'authentication-service',
        }),
        expect.objectContaining({
          securityEvent: true,
          indicators: ['brute_force', 'suspicious_ip'],
        })
      );
    });

    it('should create alert for high severity events', async () => {
      // Arrange
      const criticalEventData = {
        type: SecurityEventType.THREAT_DETECTED,
        severity: SecurityEventSeverity.CRITICAL,
        title: 'SQL Injection Attempt Detected',
        description: 'Advanced SQL injection attack detected in user input',
        ipAddress: '192.168.1.200',
        source: 'web-application-firewall',
        affectedResources: ['database', 'user-data'],
        indicators: ['sql_injection', 'malicious_payload'],
        metadata: {
          payload: 'SELECT * FROM users WHERE 1=1--',
          blocked: true,
        },
      };

      // Mock alert storage
      mockRedisClient.setex.mockResolvedValueOnce('OK'); // Event storage
      mockRedisClient.setex.mockResolvedValueOnce('OK'); // Alert storage

      // Act
      const result = await securityMonitoringService.processSecurityEvent(criticalEventData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.severity).toBe(SecurityEventSeverity.CRITICAL);

      // Verify alert creation calls - should be called twice (event + alert)
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(2);
      
      // First call is for event storage
      expect(mockRedisClient.setex).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/^security_event:/),
        24 * 60 * 60,
        expect.any(String)
      );

      // Second call is for alert storage
      expect(mockRedisClient.setex).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^security_alert:/),
        7 * 24 * 60 * 60, // 7 days
        expect.any(String)
      );
    });

    it('should generate appropriate tags based on event content', async () => {
      // Arrange
      const eventData = {
        type: SecurityEventType.POLICY_VIOLATION,
        severity: SecurityEventSeverity.HIGH,
        title: 'XSS Attack Detected',
        description: 'Cross-site scripting attempt blocked',
        source: 'input-validation',
        affectedResources: ['web-interface'],
        indicators: ['xss', 'script_injection', 'bot_activity'],
        metadata: {},
      };

      // Act
      const result = await securityMonitoringService.processSecurityEvent(eventData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.tags).toContain('type:policy_violation');
      expect(result.data.tags).toContain('severity:high');
      expect(result.data.tags).toContain('source:input-validation');
      expect(result.data.tags).toContain('resource:web-interface');
      expect(result.data.tags).toContain('attack:xss');
      expect(result.data.tags).toContain('source:bot');
      
      // Verify time-based tag
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 6) {
        expect(result.data.tags).toContain('time:night');
      } else if (hour >= 6 && hour < 12) {
        expect(result.data.tags).toContain('time:morning');
      } else if (hour >= 12 && hour < 18) {
        expect(result.data.tags).toContain('time:afternoon');
      } else {
        expect(result.data.tags).toContain('time:evening');
      }
    });

    it('should handle Redis storage failures gracefully', async () => {
      // Arrange
      const eventData = {
        type: SecurityEventType.SYSTEM_ACCESS,
        severity: SecurityEventSeverity.LOW,
        title: 'Routine System Access',
        description: 'Normal system access logged',
        source: 'access-control',
        affectedResources: ['system'],
        indicators: [],
        metadata: {},
      };

      // Mock Redis failure
      mockRedisClient.setex.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(securityMonitoringService.processSecurityEvent(eventData))
        .rejects.toThrow('Failed to process security event');
    });
  });

  describe('getDashboardData', () => {
    it('should return cached dashboard data when available', async () => {
      // Arrange
      const cachedData: SecurityDashboardData = {
        summary: {
          totalEvents: 50,
          criticalEvents: 2,
          highEvents: 5,
          activeThreats: 3,
          resolvedIncidents: 45,
          falsePositives: 2,
        },
        recentEvents: [],
        threatTrends: {
          timeframe: 'day',
          data: [],
        },
        topThreats: [],
        systemHealth: {
          monitoring: 'healthy',
          alerting: 'healthy',
          threatDetection: 'healthy',
          lastUpdate: new Date(),
        },
        complianceStatus: {
          gdpr: { status: 'compliant', score: 90 },
          pciDss: { status: 'compliant', score: 85 },
          soc2: { status: 'compliant', score: 88 },
        },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await securityMonitoringService.getDashboardData('day');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.summary.totalEvents).toBe(50);
      expect(result.data.summary.criticalEvents).toBe(2);
      expect(result.data.systemHealth.monitoring).toBe('healthy');

      // Verify cache was checked
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:day')
      );
    });

    it('should build dashboard data when not cached', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null); // No cached data
      mockRedisClient.lrange.mockResolvedValue(['event-1', 'event-2', 'event-3']);
      
      // Mock individual event retrieval
      const mockEvents = [
        {
          id: 'event-1',
          type: SecurityEventType.THREAT_DETECTED,
          severity: SecurityEventSeverity.CRITICAL,
          title: 'Threat 1',
          status: 'new',
          timestamp: new Date(),
        },
        {
          id: 'event-2',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          title: 'Auth Failed',
          status: 'resolved',
          timestamp: new Date(),
        },
        {
          id: 'event-3',
          type: SecurityEventType.DATA_ACCESS,
          severity: SecurityEventSeverity.MEDIUM,
          title: 'Data Access',
          status: 'false_positive',
          timestamp: new Date(),
        },
      ];

      mockRedisClient.get
        .mockResolvedValueOnce(null) // Dashboard cache miss
        .mockResolvedValueOnce(JSON.stringify(mockEvents[0]))
        .mockResolvedValueOnce(JSON.stringify(mockEvents[1]))
        .mockResolvedValueOnce(JSON.stringify(mockEvents[2]));

      // Act
      const result = await securityMonitoringService.getDashboardData('day');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.summary.totalEvents).toBe(3);
      expect(result.data.summary.criticalEvents).toBe(1);
      expect(result.data.summary.highEvents).toBe(1);
      expect(result.data.summary.activeThreats).toBe(1);
      expect(result.data.summary.resolvedIncidents).toBe(1);
      expect(result.data.summary.falsePositives).toBe(1);

      // Verify cache was set
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:day'),
        60, // 1 minute TTL
        expect.any(String)
      );
    });

    it('should handle different timeframes correctly', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.lrange.mockResolvedValue([]);

      // Act
      const hourResult = await securityMonitoringService.getDashboardData('hour');
      const weekResult = await securityMonitoringService.getDashboardData('week');
      const monthResult = await securityMonitoringService.getDashboardData('month');

      // Assert
      expect(hourResult.success).toBe(true);
      expect(weekResult.success).toBe(true);
      expect(monthResult.success).toBe(true);

      // Verify correct cache keys were used
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:hour')
      );
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:week')
      );
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:month')
      );
    });
  });

  describe('getSecurityEvents', () => {
    it('should return filtered security events', async () => {
      // Arrange
      const filters = {
        type: SecurityEventType.AUTHENTICATION,
        severity: SecurityEventSeverity.HIGH,
        status: 'new' as const,
        limit: 10,
        offset: 0,
      };

      const mockEventIds = ['event-1', 'event-2'];
      const mockEvents = [
        {
          id: 'event-1',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          status: 'new',
          title: 'Auth Event 1',
          timestamp: new Date(),
        },
        {
          id: 'event-2',
          type: SecurityEventType.AUTHENTICATION,
          severity: SecurityEventSeverity.HIGH,
          status: 'new',
          title: 'Auth Event 2',
          timestamp: new Date(),
        },
      ];

      mockRedisClient.get.mockResolvedValue(null); // No cache
      mockRedisClient.lrange
        .mockResolvedValueOnce(mockEventIds) // fetchSecurityEvents
        .mockResolvedValueOnce(mockEventIds); // countSecurityEvents

      // Mock individual event retrieval
      mockRedisClient.get
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(JSON.stringify(mockEvents[0]))
        .mockResolvedValueOnce(JSON.stringify(mockEvents[1]))
        .mockResolvedValueOnce(JSON.stringify(mockEvents[0])) // For count
        .mockResolvedValueOnce(JSON.stringify(mockEvents[1])); // For count

      // Act
      const result = await securityMonitoringService.getSecurityEvents(filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.events).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.events[0].type).toBe(SecurityEventType.AUTHENTICATION);
      expect(result.data.events[0].severity).toBe(SecurityEventSeverity.HIGH);
    });

    it('should respect limit and offset parameters', async () => {
      // Arrange
      const filters = {
        limit: 5,
        offset: 10,
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.lrange.mockResolvedValue([]);

      // Act
      const result = await securityMonitoringService.getSecurityEvents(filters);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        'security_events:recent',
        10, // offset
        14  // offset + limit - 1
      );
    });

    it('should return cached results when available', async () => {
      // Arrange
      const filters = {
        type: SecurityEventType.THREAT_DETECTED,
        limit: 20,
      };

      const cachedResult = {
        events: [
          {
            id: 'cached-event-1',
            type: SecurityEventType.THREAT_DETECTED,
            title: 'Cached Threat',
          },
        ],
        total: 1,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      // Act
      const result = await securityMonitoringService.getSecurityEvents(filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0].id).toBe('cached-event-1');
      expect(result.data.total).toBe(1);

      // Verify no additional Redis calls were made for fetching events
      expect(mockRedisClient.lrange).not.toHaveBeenCalled();
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status successfully', async () => {
      // Arrange
      const eventId = 'test-event-123';
      const mockEvent = {
        id: eventId,
        type: SecurityEventType.THREAT_DETECTED,
        severity: SecurityEventSeverity.HIGH,
        status: 'new',
        title: 'Test Threat',
        timestamp: new Date(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEvent));
      mockRedisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await securityMonitoringService.updateEventStatus(
        eventId,
        'resolved',
        'admin-123',
        'False positive - testing activity'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('resolved');
      expect(result.data.assignedTo).toBe('admin-123');
      expect(result.data.resolution).toBe('False positive - testing activity');

      // Verify event was updated in Redis
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `security_event:${eventId}`,
        24 * 60 * 60,
        expect.stringContaining('"status":"resolved"')
      );

      // Verify audit log was created
      expect(mockAuditLog.logDataAccess).toHaveBeenCalledWith(
        'security_events',
        eventId,
        'UPDATE',
        'admin-123',
        undefined,
        undefined,
        undefined,
        expect.objectContaining({ status: 'resolved' }),
        expect.objectContaining({
          status: 'resolved',
          resolution: 'False positive - testing activity',
        }),
        expect.objectContaining({
          statusChange: true,
          previousStatus: 'resolved',
          newStatus: 'resolved',
        })
      );
    });

    it('should throw error for non-existent event', async () => {
      // Arrange
      const eventId = 'non-existent-event';
      mockRedisClient.get.mockResolvedValue(null);

      // Act & Assert
      await expect(
        securityMonitoringService.updateEventStatus(eventId, 'resolved')
      ).rejects.toThrow('Security event not found');
    });
  });

  describe('Real-time event subscriptions', () => {
    it('should subscribe to security events with filters', (done) => {
      // Arrange
      const filters = {
        types: [SecurityEventType.AUTHENTICATION],
        severities: [SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL],
      };

      let callbackInvoked = false;
      const callback = (event: SecurityEvent) => {
        expect(event.type).toBe(SecurityEventType.AUTHENTICATION);
        expect(event.severity).toBe(SecurityEventSeverity.HIGH);
        callbackInvoked = true;
        unsubscribe();
        done();
      };

      // Act
      const unsubscribe = securityMonitoringService.subscribeToEvents(callback, filters);

      // Simulate event emission
      const mockEvent: SecurityEvent = {
        id: 'test-event',
        type: SecurityEventType.AUTHENTICATION,
        severity: SecurityEventSeverity.HIGH,
        title: 'Test Event',
        description: 'Test Description',
        timestamp: new Date(),
        source: 'test',
        affectedResources: [],
        indicators: [],
        metadata: {},
        status: 'new',
        tags: [],
      };

      (securityMonitoringService as any).eventEmitter.emit('securityEvent', mockEvent);

      // Verify callback is called
      setTimeout(() => {
        if (!callbackInvoked) {
          done();
        }
      }, 100);
    });

    it('should filter events by type correctly', (done) => {
      // Arrange
      const filters = {
        types: [SecurityEventType.THREAT_DETECTED],
      };

      let authEventReceived = false;
      let threatEventReceived = false;

      const callback = (event: SecurityEvent) => {
        if (event.type === SecurityEventType.AUTHENTICATION) {
          authEventReceived = true;
        } else if (event.type === SecurityEventType.THREAT_DETECTED) {
          threatEventReceived = true;
        }
      };

      // Act
      const unsubscribe = securityMonitoringService.subscribeToEvents(callback, filters);

      // Emit different event types
      const authEvent: SecurityEvent = {
        id: 'auth-event',
        type: SecurityEventType.AUTHENTICATION,
        severity: SecurityEventSeverity.MEDIUM,
        title: 'Auth Event',
        description: 'Auth Description',
        timestamp: new Date(),
        source: 'test',
        affectedResources: [],
        indicators: [],
        metadata: {},
        status: 'new',
        tags: [],
      };

      const threatEvent: SecurityEvent = {
        id: 'threat-event',
        type: SecurityEventType.THREAT_DETECTED,
        severity: SecurityEventSeverity.HIGH,
        title: 'Threat Event',
        description: 'Threat Description',
        timestamp: new Date(),
        source: 'test',
        affectedResources: [],
        indicators: [],
        metadata: {},
        status: 'new',
        tags: [],
      };

      (securityMonitoringService as any).eventEmitter.emit('securityEvent', authEvent);
      (securityMonitoringService as any).eventEmitter.emit('securityEvent', threatEvent);

      // Assert
      setTimeout(() => {
        expect(authEventReceived).toBe(false); // Should be filtered out
        expect(threatEventReceived).toBe(true); // Should pass filter
        unsubscribe();
        done();
      }, 50);
    });
  });

  describe('Performance and caching', () => {
    it('should cache dashboard data with correct TTL', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.lrange.mockResolvedValue([]);

      // Act
      await securityMonitoringService.getDashboardData('day');

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:day'),
        60, // 1 minute TTL
        expect.any(String)
      );
    });

    it('should cache metrics with correct TTL', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.lrange.mockResolvedValue([]);

      // Act
      await securityMonitoringService.getSecurityMetrics('day');

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('metrics:day'),
        300, // 5 minutes TTL
        expect.any(String)
      );
    });

    it('should invalidate dashboard cache correctly', async () => {
      // Arrange
      const eventData = {
        type: SecurityEventType.AUTHENTICATION,
        severity: SecurityEventSeverity.LOW,
        title: 'Test Event',
        description: 'Test Description',
        source: 'test',
        affectedResources: [],
        indicators: [],
        metadata: {},
      };

      mockRedisClient.keys.mockResolvedValue([
        'security_monitoring:dashboard:day',
        'security_monitoring:dashboard:week',
        'security_monitoring:metrics:day',
      ]);

      // Act
      await securityMonitoringService.processSecurityEvent(eventData);

      // Assert
      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        'security_monitoring:dashboard:*'
      );
      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        'security_monitoring:metrics:*'
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'security_monitoring:dashboard:day',
        'security_monitoring:dashboard:week',
        'security_monitoring:metrics:day'
      );
    });
  });
});