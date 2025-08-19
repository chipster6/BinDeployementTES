/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COMPREHENSIVE SECURITY MONITORING TESTING
 * ============================================================================
 *
 * Comprehensive tests for security monitoring system covering:
 * - Redis integration for security state management
 * - WebSocket coordination for real-time security alerts
 * - Threat detection and response mechanisms
 * - API key rotation and audit trails
 * - Multi-factor authentication validation
 * - Session management and security
 *
 * Created by: QA Engineer / Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { SecurityMonitoringService } from '@/services/security/SecurityMonitoringService';
import { SessionService } from '@/services/SessionService';
import { ApiKeyRotationService } from '@/services/external/ApiKeyRotationService';
import { ThreatDetectionService } from '@/services/security/ThreatDetectionService';
import { socketManager } from '@/services/socketManager';
import { redisClient } from '@/config/redis';
import { AuditLog } from '@/models/AuditLog';
import { UserSession } from '@/models/UserSession';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/config/redis');
jest.mock('@/services/socketManager');
jest.mock('@/models/AuditLog');
jest.mock('@/models/UserSession');
jest.mock('@/utils/logger');

describe('Comprehensive Security Monitoring Tests', () => {
  let securityMonitoring: SecurityMonitoringService;
  let sessionService: SessionService;
  let apiKeyRotation: ApiKeyRotationService;
  let threatDetection: ThreatDetectionService;
  let mockRedis: jest.Mocked<typeof redisClient>;
  let mockSocketManager: jest.Mocked<typeof socketManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedis = redisClient as jest.Mocked<typeof redisClient>;
    mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
    
    securityMonitoring = new SecurityMonitoringService();
    sessionService = new SessionService();
    apiKeyRotation = new ApiKeyRotationService();
    threatDetection = new ThreatDetectionService();

    // Setup Redis mocks
    mockRedis.get = jest.fn();
    mockRedis.setex = jest.fn();
    mockRedis.del = jest.fn();
    mockRedis.keys = jest.fn();
    mockRedis.hget = jest.fn();
    mockRedis.hset = jest.fn();
    mockRedis.hincrby = jest.fn();
    mockRedis.multi = jest.fn().mockReturnValue({
      hincrby: jest.fn().mockReturnThis(),
      hset: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    });

    // Setup Socket Manager mocks
    mockSocketManager.sendToRole = jest.fn();
    mockSocketManager.broadcastToRoom = jest.fn();
    mockSocketManager.sendToUser = jest.fn();

    // Setup Model mocks
    (AuditLog.create as jest.Mock) = jest.fn();
    (UserSession.findAll as jest.Mock) = jest.fn();
    (UserSession.destroy as jest.Mock) = jest.fn();
  });

  describe('Redis Security State Management', () => {
    describe('Security Event Storage', () => {
      it('should store security events in Redis with TTL', async () => {
        const securityEvent = {
          type: 'authentication_failure',
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date(),
          severity: 'high' as const,
          details: { reason: 'invalid_password' }
        };

        await securityMonitoring.recordSecurityEvent(securityEvent);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^security_event:/),
          3600, // 1 hour TTL
          JSON.stringify(securityEvent)
        );
      });

      it('should retrieve security events from Redis', async () => {
        const mockEvents = [
          { type: 'login_success', userId: 'user123' },
          { type: 'permission_denied', userId: 'user456' }
        ];
        
        mockRedis.keys.mockResolvedValue(['security_event:1', 'security_event:2']);
        mockRedis.get
          .mockResolvedValueOnce(JSON.stringify(mockEvents[0]))
          .mockResolvedValueOnce(JSON.stringify(mockEvents[1]));

        const events = await securityMonitoring.getRecentSecurityEvents('user123', 24);

        expect(mockRedis.keys).toHaveBeenCalledWith('security_event:user123:*');
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('login_success');
      });

      it('should handle Redis failures gracefully', async () => {
        mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

        const securityEvent = {
          type: 'authentication_failure' as const,
          userId: 'user123',
          ipAddress: '192.168.1.1',
          severity: 'high' as const
        };

        await expect(securityMonitoring.recordSecurityEvent(securityEvent))
          .resolves.not.toThrow();

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to store security event in Redis',
          expect.objectContaining({
            error: 'Redis connection failed'
          })
        );
      });
    });

    describe('Threat Intelligence Caching', () => {
      it('should cache IP reputation data', async () => {
        const ipAddress = '192.168.1.100';
        const reputationData = {
          score: 85,
          categories: ['malware', 'spam'],
          lastSeen: new Date(),
          source: 'threat_intelligence'
        };

        await threatDetection.cacheIpReputation(ipAddress, reputationData);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `ip_reputation:${ipAddress}`,
          86400, // 24 hours
          JSON.stringify(reputationData)
        );
      });

      it('should retrieve cached IP reputation', async () => {
        const ipAddress = '192.168.1.100';
        const cachedData = {
          score: 85,
          categories: ['malware'],
          cached: true
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

        const reputation = await threatDetection.getIpReputation(ipAddress);

        expect(mockRedis.get).toHaveBeenCalledWith(`ip_reputation:${ipAddress}`);
        expect(reputation).toEqual(cachedData);
      });

      it('should invalidate threat intelligence cache on updates', async () => {
        const pattern = 'threat_intel:*';
        const keys = ['threat_intel:ip:1', 'threat_intel:domain:1'];

        mockRedis.keys.mockResolvedValue(keys);

        await threatDetection.invalidateThreatCache();

        expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
        expect(mockRedis.del).toHaveBeenCalledWith(...keys);
      });
    });

    describe('Session Security Management', () => {
      it('should store session security metadata', async () => {
        const sessionId = 'session123';
        const securityMetadata = {
          deviceFingerprint: 'fingerprint123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          lastActivity: new Date(),
          securityScore: 95,
          anomalyDetected: false
        };

        await sessionService.updateSessionSecurity(sessionId, securityMetadata);

        expect(mockRedis.hset).toHaveBeenCalledWith(
          `session_security:${sessionId}`,
          expect.objectContaining({
            deviceFingerprint: 'fingerprint123',
            securityScore: '95',
            anomalyDetected: 'false'
          })
        );
      });

      it('should detect concurrent session anomalies', async () => {
        const userId = 'user123';
        const activeSessions = [
          { id: 'session1', ipAddress: '192.168.1.1', location: 'New York' },
          { id: 'session2', ipAddress: '203.0.113.1', location: 'Tokyo' }
        ];

        (UserSession.findAll as jest.Mock).mockResolvedValue(activeSessions);

        const anomalies = await sessionService.detectSessionAnomalies(userId);

        expect(anomalies).toContainEqual(
          expect.objectContaining({
            type: 'geographic_anomaly',
            severity: 'high',
            details: expect.objectContaining({
              sessions: activeSessions
            })
          })
        );
      });

      it('should enforce session limits per user', async () => {
        const userId = 'user123';
        const maxSessions = 3;
        const existingSessions = Array.from({ length: 4 }, (_, i) => ({
          id: `session${i}`,
          lastActivity: new Date(Date.now() - i * 60000) // Progressive age
        }));

        (UserSession.findAll as jest.Mock).mockResolvedValue(existingSessions);

        await sessionService.enforceSessionLimits(userId, maxSessions);

        // Should terminate oldest session
        expect(UserSession.destroy).toHaveBeenCalledWith({
          where: { id: 'session3' }
        });
      });
    });
  });

  describe('WebSocket Security Coordination', () => {
    describe('Real-time Security Alerts', () => {
      it('should broadcast critical security alerts to admins', async () => {
        const securityAlert = {
          type: 'brute_force_attack',
          severity: 'critical' as const,
          source: '192.168.1.100',
          target: 'user123',
          timestamp: new Date(),
          details: {
            attemptCount: 10,
            timeWindow: '5 minutes'
          }
        };

        await securityMonitoring.broadcastSecurityAlert(securityAlert);

        expect(mockSocketManager.sendToRole).toHaveBeenCalledWith(
          'admin',
          'critical_security_alert',
          expect.objectContaining({
            type: 'brute_force_attack',
            severity: 'critical',
            source: '192.168.1.100'
          })
        );
      });

      it('should send targeted security notifications to affected users', async () => {
        const userId = 'user123';
        const securityNotification = {
          type: 'suspicious_login',
          severity: 'warning' as const,
          details: {
            ipAddress: '203.0.113.1',
            location: 'Unknown',
            timestamp: new Date()
          }
        };

        await securityMonitoring.notifyUserSecurity(userId, securityNotification);

        expect(mockSocketManager.sendToUser).toHaveBeenCalledWith(
          userId,
          'security_notification',
          expect.objectContaining({
            type: 'suspicious_login',
            severity: 'warning'
          })
        );
      });

      it('should broadcast system-wide security updates', async () => {
        const systemUpdate = {
          type: 'security_policy_update',
          message: 'Multi-factor authentication is now required',
          effectiveDate: new Date(),
          impactLevel: 'high' as const
        };

        await securityMonitoring.broadcastSystemSecurityUpdate(systemUpdate);

        expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          'security_updates',
          'system_security_update',
          systemUpdate
        );
      });

      it('should handle WebSocket connection failures gracefully', async () => {
        mockSocketManager.sendToRole.mockRejectedValue(new Error('WebSocket connection failed'));

        const securityAlert = {
          type: 'unauthorized_access' as const,
          severity: 'high' as const,
          source: '192.168.1.100'
        };

        await expect(securityMonitoring.broadcastSecurityAlert(securityAlert))
          .resolves.not.toThrow();

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to broadcast security alert via WebSocket',
          expect.objectContaining({
            error: 'WebSocket connection failed'
          })
        );
      });
    });

    describe('Security Dashboard Coordination', () => {
      it('should provide real-time security metrics for dashboard', async () => {
        const mockMetrics = {
          activeThreats: 3,
          blockedIPs: 15,
          suspiciousActivities: 7,
          lastHourAlerts: 12,
          systemSecurityScore: 92
        };

        mockRedis.hget
          .mockResolvedValueOnce('3')  // activeThreats
          .mockResolvedValueOnce('15') // blockedIPs
          .mockResolvedValueOnce('7')  // suspiciousActivities
          .mockResolvedValueOnce('12') // lastHourAlerts
          .mockResolvedValueOnce('92'); // systemSecurityScore

        const metrics = await securityMonitoring.getSecurityDashboardMetrics();

        expect(metrics).toEqual(mockMetrics);
        expect(mockRedis.hget).toHaveBeenCalledTimes(5);
      });

      it('should update security metrics in real-time', async () => {
        const metricUpdates = {
          activeThreats: 5,
          newBlockedIP: '203.0.113.100',
          securityScoreChange: -2
        };

        await securityMonitoring.updateSecurityMetrics(metricUpdates);

        expect(mockRedis.hset).toHaveBeenCalledWith(
          'security_metrics',
          'activeThreats',
          '5'
        );

        expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          'security_dashboard',
          'metrics_update',
          metricUpdates
        );
      });

      it('should aggregate security events for dashboard trends', async () => {
        const timeRange = { start: new Date(), end: new Date() };
        const mockTrendData = [
          { hour: '14:00', authenticationFailures: 5, suspiciousIPs: 2 },
          { hour: '15:00', authenticationFailures: 8, suspiciousIPs: 3 }
        ];

        mockRedis.keys.mockResolvedValue(['security_event:1', 'security_event:2']);
        mockRedis.get
          .mockResolvedValueOnce(JSON.stringify({ type: 'auth_failure', timestamp: timeRange.start }))
          .mockResolvedValueOnce(JSON.stringify({ type: 'suspicious_ip', timestamp: timeRange.end }));

        const trends = await securityMonitoring.getSecurityTrends(timeRange);

        expect(trends).toBeDefined();
        expect(Array.isArray(trends)).toBe(true);
      });
    });
  });

  describe('API Key Security and Rotation', () => {
    describe('API Key Rotation Management', () => {
      it('should schedule API key rotation', async () => {
        const serviceName = 'stripe';
        const rotationSchedule = {
          nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          frequency: 'monthly' as const,
          autoRotate: true
        };

        await apiKeyRotation.scheduleRotation(serviceName, rotationSchedule);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `api_key_rotation:${serviceName}`,
          30 * 24 * 60 * 60, // 30 days in seconds
          JSON.stringify(rotationSchedule)
        );
      });

      it('should detect overdue API key rotations', async () => {
        const overdueServices = ['twilio', 'sendgrid'];
        mockRedis.keys.mockResolvedValue(['api_key_rotation:twilio', 'api_key_rotation:sendgrid']);
        
        const overdueRotation = {
          nextRotation: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          frequency: 'monthly'
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(overdueRotation));

        const overdueRotations = await apiKeyRotation.getOverdueRotations();

        expect(overdueRotations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              service: 'twilio',
              status: 'overdue'
            })
          ])
        );
      });

      it('should perform emergency API key revocation', async () => {
        const serviceName = 'stripe';
        const reason = 'suspected_compromise';
        const revokedBy = 'admin123';

        await apiKeyRotation.emergencyRevocation(serviceName, reason, revokedBy);

        expect(AuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'emergency_api_key_revocation',
            resourceType: 'api_key',
            resourceId: serviceName,
            details: expect.objectContaining({
              reason,
              revokedBy,
              emergency: true
            })
          })
        );

        expect(mockSocketManager.sendToRole).toHaveBeenCalledWith(
          'admin',
          'emergency_api_revocation',
          expect.objectContaining({
            service: serviceName,
            reason
          })
        );
      });

      it('should validate API key strength and security', async () => {
        const apiKey = 'sk_test_weak123';
        const securityAnalysis = await apiKeyRotation.analyzeKeyStrength(apiKey);

        expect(securityAnalysis).toEqual(
          expect.objectContaining({
            strength: expect.oneOf(['weak', 'medium', 'strong']),
            recommendations: expect.any(Array),
            compliance: expect.objectContaining({
              length: expect.any(Boolean),
              complexity: expect.any(Boolean),
              pattern: expect.any(Boolean)
            })
          })
        );
      });
    });

    describe('API Key Audit Trails', () => {
      it('should log API key usage patterns', async () => {
        const serviceName = 'stripe';
        const usageData = {
          requestCount: 150,
          lastUsed: new Date(),
          ipAddresses: ['192.168.1.1', '203.0.113.1'],
          userAgents: ['Backend-Service/1.0'],
          endpoints: ['/v1/charges', '/v1/customers']
        };

        await apiKeyRotation.logKeyUsage(serviceName, usageData);

        expect(mockRedis.hincrby).toHaveBeenCalledWith(
          `api_usage:${serviceName}`,
          'requestCount',
          150
        );

        expect(mockRedis.hset).toHaveBeenCalledWith(
          `api_usage:${serviceName}`,
          'lastUsed',
          usageData.lastUsed.toISOString()
        );
      });

      it('should detect anomalous API key usage', async () => {
        const serviceName = 'twilio';
        const suspiciousUsage = {
          requestCount: 10000, // Unusually high
          ipAddresses: ['203.0.113.100'], // New IP
          timePattern: 'outside_business_hours'
        };

        const anomalies = await apiKeyRotation.detectUsageAnomalies(serviceName, suspiciousUsage);

        expect(anomalies).toContainEqual(
          expect.objectContaining({
            type: 'unusual_request_volume',
            severity: 'high',
            threshold: expect.any(Number)
          })
        );
      });

      it('should generate API security compliance reports', async () => {
        const complianceReport = await apiKeyRotation.generateComplianceReport();

        expect(complianceReport).toEqual(
          expect.objectContaining({
            overallCompliance: expect.oneOf(['compliant', 'non_compliant', 'partial']),
            services: expect.any(Array),
            recommendations: expect.any(Array),
            lastAudit: expect.any(Date)
          })
        );
      });
    });
  });

  describe('Multi-Factor Authentication Security', () => {
    describe('MFA Validation and Coordination', () => {
      it('should validate TOTP codes with time windows', async () => {
        const userId = 'user123';
        const token = '123456';
        const secret = 'JBSWY3DPEHPK3PXP';

        const validationResult = await securityMonitoring.validateMFAToken(userId, token, secret);

        expect(validationResult).toEqual(
          expect.objectContaining({
            valid: expect.any(Boolean),
            window: expect.any(Number),
            timestamp: expect.any(Date)
          })
        );
      });

      it('should prevent MFA token replay attacks', async () => {
        const userId = 'user123';
        const token = '123456';
        const tokenKey = `mfa_used:${userId}:${token}`;

        // Simulate token already used
        mockRedis.get.mockResolvedValue('used');

        const validationResult = await securityMonitoring.validateMFAToken(userId, token);

        expect(validationResult.valid).toBe(false);
        expect(validationResult.reason).toBe('token_already_used');
      });

      it('should track MFA backup code usage', async () => {
        const userId = 'user123';
        const backupCode = 'backup123';

        await securityMonitoring.useBackupCode(userId, backupCode);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `backup_code_used:${userId}:${backupCode}`,
          86400, // 24 hours
          'used'
        );

        expect(AuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'mfa_backup_code_used',
            userId,
            details: expect.objectContaining({
              backupCode: expect.stringMatching(/\*+/) // Should be masked
            })
          })
        );
      });

      it('should enforce MFA requirement based on risk assessment', async () => {
        const userId = 'user123';
        const riskFactors = {
          newDevice: true,
          newLocation: true,
          vpnUsage: false,
          timeOfAccess: 'business_hours'
        };

        const mfaRequired = await securityMonitoring.assessMFARequirement(userId, riskFactors);

        expect(mfaRequired).toEqual(
          expect.objectContaining({
            required: expect.any(Boolean),
            reason: expect.any(String),
            riskScore: expect.any(Number),
            factors: riskFactors
          })
        );
      });
    });

    describe('MFA Security Monitoring', () => {
      it('should monitor MFA setup and recovery events', async () => {
        const userId = 'user123';
        const mfaEvent = {
          type: 'mfa_setup',
          method: 'totp',
          deviceName: 'iPhone 13',
          success: true
        };

        await securityMonitoring.recordMFAEvent(userId, mfaEvent);

        expect(AuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'mfa_setup',
            userId,
            details: mfaEvent
          })
        );

        expect(mockSocketManager.sendToUser).toHaveBeenCalledWith(
          userId,
          'mfa_security_update',
          expect.objectContaining({
            type: 'mfa_setup',
            timestamp: expect.any(Date)
          })
        );
      });

      it('should alert on suspicious MFA activities', async () => {
        const userId = 'user123';
        const suspiciousActivity = {
          type: 'multiple_failed_attempts',
          count: 5,
          timeWindow: '10 minutes',
          ipAddress: '203.0.113.100'
        };

        await securityMonitoring.alertSuspiciousMFA(userId, suspiciousActivity);

        expect(mockSocketManager.sendToRole).toHaveBeenCalledWith(
          'security',
          'suspicious_mfa_activity',
          expect.objectContaining({
            userId,
            activity: suspiciousActivity,
            severity: 'high'
          })
        );
      });

      it('should generate MFA security metrics', async () => {
        const mfaMetrics = await securityMonitoring.getMFASecurityMetrics();

        expect(mfaMetrics).toEqual(
          expect.objectContaining({
            enrollmentRate: expect.any(Number),
            activeUsers: expect.any(Number),
            backupCodeUsage: expect.any(Number),
            suspiciousActivities: expect.any(Number),
            complianceScore: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Threat Detection and Response', () => {
    describe('Automated Threat Detection', () => {
      it('should detect brute force attacks', async () => {
        const ipAddress = '203.0.113.100';
        const failedAttempts = Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 30000), // 30 seconds apart
          userId: `user${i % 3}`, // Multiple users
          type: 'authentication_failure'
        }));

        mockRedis.keys.mockResolvedValue(
          failedAttempts.map((_, i) => `security_event:${i}`)
        );
        mockRedis.get.mockImplementation((key) => 
          Promise.resolve(JSON.stringify(failedAttempts[parseInt(key.split(':')[1])]))
        );

        const threats = await threatDetection.analyzeBruteForceAttempts(ipAddress);

        expect(threats).toContainEqual(
          expect.objectContaining({
            type: 'brute_force_attack',
            severity: 'high',
            source: ipAddress,
            details: expect.objectContaining({
              attemptCount: 10,
              affectedUsers: 3
            })
          })
        );
      });

      it('should detect credential stuffing attacks', async () => {
        const suspiciousLogins = [
          { email: 'user1@example.com', password: 'common123', success: false },
          { email: 'user2@example.com', password: 'common123', success: false },
          { email: 'user3@example.com', password: 'common123', success: false }
        ];

        const threats = await threatDetection.analyzeCredentialStuffing(suspiciousLogins);

        expect(threats).toContainEqual(
          expect.objectContaining({
            type: 'credential_stuffing',
            severity: 'critical',
            pattern: 'common_password_multiple_accounts'
          })
        );
      });

      it('should detect privilege escalation attempts', async () => {
        const userId = 'user123';
        const escalationAttempts = [
          { action: 'access_admin_panel', denied: true },
          { action: 'modify_user_roles', denied: true },
          { action: 'access_financial_data', denied: true }
        ];

        const threats = await threatDetection.analyzePrivilegeEscalation(userId, escalationAttempts);

        expect(threats).toContainEqual(
          expect.objectContaining({
            type: 'privilege_escalation',
            severity: 'high',
            userId,
            attemptCount: 3
          })
        );
      });
    });

    describe('Automated Response Mechanisms', () => {
      it('should automatically block suspicious IP addresses', async () => {
        const ipAddress = '203.0.113.100';
        const blockReason = 'brute_force_attack';
        const duration = 3600; // 1 hour

        await threatDetection.blockIP(ipAddress, blockReason, duration);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `blocked_ip:${ipAddress}`,
          duration,
          JSON.stringify({
            reason: blockReason,
            blockedAt: expect.any(String),
            duration
          })
        );

        expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          'security_alerts',
          'ip_blocked',
          expect.objectContaining({
            ipAddress,
            reason: blockReason
          })
        );
      });

      it('should enforce account lockout for compromised users', async () => {
        const userId = 'user123';
        const lockoutReason = 'suspicious_activity';
        const duration = 1800; // 30 minutes

        await threatDetection.lockoutUser(userId, lockoutReason, duration);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          `user_lockout:${userId}`,
          duration,
          JSON.stringify({
            reason: lockoutReason,
            lockedAt: expect.any(String),
            duration
          })
        );

        expect(mockSocketManager.sendToUser).toHaveBeenCalledWith(
          userId,
          'account_locked',
          expect.objectContaining({
            reason: lockoutReason,
            duration
          })
        );
      });

      it('should escalate critical threats to security team', async () => {
        const criticalThreat = {
          type: 'data_exfiltration_attempt',
          severity: 'critical' as const,
          source: '203.0.113.100',
          target: 'customer_database',
          evidence: ['unusual_query_patterns', 'large_data_transfer']
        };

        await threatDetection.escalateThreat(criticalThreat);

        expect(mockSocketManager.sendToRole).toHaveBeenCalledWith(
          'security',
          'critical_threat_escalation',
          criticalThreat
        );

        expect(AuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'critical_threat_escalated',
            resourceType: 'security_incident',
            details: criticalThreat
          })
        );
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis failures in security monitoring', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis unavailable'));

      const securityEvent = {
        type: 'authentication_failure' as const,
        userId: 'user123',
        severity: 'medium' as const
      };

      await expect(securityMonitoring.recordSecurityEvent(securityEvent))
        .resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis'),
        expect.any(Object)
      );
    });

    it('should continue security operations when WebSocket fails', async () => {
      mockSocketManager.broadcastToRoom.mockRejectedValue(new Error('WebSocket error'));

      const threat = {
        type: 'suspicious_activity' as const,
        severity: 'medium' as const
      };

      await expect(threatDetection.broadcastThreat(threat))
        .resolves.not.toThrow();
    });

    it('should maintain security state during partial failures', async () => {
      // Simulate mixed success/failure
      mockRedis.setex.mockResolvedValueOnce('OK').mockRejectedValueOnce(new Error('Partial failure'));

      const events = [
        { type: 'login_success' as const, userId: 'user1' },
        { type: 'login_failure' as const, userId: 'user2' }
      ];

      const results = await Promise.allSettled(
        events.map(event => securityMonitoring.recordSecurityEvent(event))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // Should not throw
    });
  });
});