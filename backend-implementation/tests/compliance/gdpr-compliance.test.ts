/**
 * ============================================================================
 * GDPR COMPLIANCE TESTING FRAMEWORK
 * ============================================================================
 *
 * Comprehensive GDPR compliance validation tests covering:
 * - Data Protection Rights (Articles 15-20)
 * - Consent Management System
 * - Breach Notification (72-hour compliance)
 * - Data Retention and Deletion
 * - Cross-border Data Transfer
 *
 * Target: 90%+ GDPR Compliance Score
 *
 * Created by: Compliance Testing Framework
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { User, UserRole, UserStatus } from '@/models/User';
import { AuditLog, AuditAction } from '@/models/AuditLog';
import { SecurityAuditService } from '@/services/security/SecurityAuditService';
import { SecurityMonitoringService } from '@/services/security/SecurityMonitoringService';
import { encryptDatabaseField, decryptDatabaseField } from '@/utils/encryption';
import { database } from '@/config/database';
import { Op } from 'sequelize';

describe('GDPR Compliance Testing Framework', () => {
  let auditService: SecurityAuditService;
  let monitoringService: SecurityMonitoringService;
  let testUser: User;
  let testUserForDeletion: User;

  beforeAll(async () => {
    await database.sync({ force: false });
    auditService = new SecurityAuditService();
    monitoringService = new SecurityMonitoringService();
  });

  beforeEach(async () => {
    // Create test user with GDPR consent
    testUser = await User.create({
      email: `gdpr-test-${Date.now()}@example.com`,
      password_hash: await User.hashPassword('TestPassword123!'),
      first_name: 'GDPR',
      last_name: 'Test',
      phone: '+1234567890',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      gdpr_consent_given: true,
      gdpr_consent_date: new Date(),
      data_retention_until: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await User.destroy({ where: { email: { [Op.like]: 'gdpr-test-%' } }, force: true });
    await User.destroy({ where: { email: { [Op.like]: 'delete-test-%' } }, force: true });
  });

  describe('Data Subject Rights Implementation (Articles 15-20)', () => {
    test('Right to Access (Article 15) - Complete data export', async () => {
      // Test comprehensive data export functionality
      const exportData = await auditService.exportComplianceData(
        testUser.id,
        'GDPR',
        ['JSON', 'CSV', 'XML']
      );

      // Verify export contains all personal data
      expect(exportData).toHaveProperty('personal_data');
      expect(exportData.personal_data).toEqual(
        expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
          first_name: testUser.first_name,
          last_name: testUser.last_name,
          phone: testUser.phone,
          created_at: expect.any(Date),
          gdpr_consent_given: true,
          gdpr_consent_date: expect.any(Date),
        })
      );

      // Verify export includes all related data categories
      expect(exportData).toHaveProperty('audit_logs');
      expect(exportData).toHaveProperty('sessions');
      expect(exportData).toHaveProperty('service_interactions');

      // Verify sensitive data is properly handled
      expect(exportData.personal_data).not.toHaveProperty('password_hash');
      expect(exportData.personal_data).not.toHaveProperty('mfa_secret');

      // Verify export metadata
      expect(exportData).toHaveProperty('export_metadata');
      expect(exportData.export_metadata).toEqual(
        expect.objectContaining({
          exported_at: expect.any(Date),
          export_format: expect.arrayContaining(['JSON', 'CSV', 'XML']),
          data_controller: expect.any(String),
          legal_basis: 'GDPR Article 15 - Right to Access',
        })
      );

      // Test structured data portability format
      expect(exportData.personal_data).toHaveProperty('structured_format');
      expect(exportData.personal_data.structured_format).toBe(true);
    });

    test('Right to Rectification (Article 16) - Data modification tracking', async () => {
      const originalData = { ...testUser.dataValues };

      // Perform data modification
      await testUser.update({
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+9876543210',
      });

      // Verify audit log captures all changes
      const auditLogs = await AuditLog.findAll({
        where: {
          userId: testUser.id,
          action: AuditAction.UPDATE,
          resourceType: 'users',
        },
        order: [['created_at', 'DESC']],
        limit: 1,
      });

      expect(auditLogs).toHaveLength(1);
      const auditLog = auditLogs[0];

      // Verify before/after values are properly captured
      expect(auditLog.oldValues).toEqual(
        expect.objectContaining({
          first_name: originalData.first_name,
          last_name: originalData.last_name,
          phone: originalData.phone,
        })
      );

      expect(auditLog.newValues).toEqual(
        expect.objectContaining({
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+9876543210',
        })
      );

      // Verify integrity checksum is generated and valid
      expect(auditLog.checksum).toBeTruthy();
      expect(auditLog.checksum).toHaveLength(64); // SHA-256 length
      expect(auditLog.verifyIntegrity()).toBe(true);

      // Verify GDPR-specific metadata
      expect(auditLog.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'data_rectification',
          fields_modified: expect.arrayContaining(['first_name', 'last_name', 'phone']),
        })
      );
    });

    test('Right to Erasure (Article 17) - Secure data deletion', async () => {
      // Create test user for deletion
      testUserForDeletion = await User.create({
        email: `delete-test-${Date.now()}@example.com`,
        password_hash: await User.hashPassword('TestPassword123!'),
        first_name: 'Delete',
        last_name: 'Test',
        role: UserRole.CUSTOMER,
        gdpr_consent_given: true,
      });

      const userId = testUserForDeletion.id;

      // Create related audit data
      await AuditLog.create({
        userId: userId,
        action: AuditAction.CREATE,
        resourceType: 'users',
        resourceId: userId,
        details: { user_created: true },
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      });

      // Perform GDPR-compliant deletion (soft delete)
      await testUserForDeletion.destroy();

      // Verify user is soft deleted
      const deletedUser = await User.findByPk(userId, { paranoid: false });
      expect(deletedUser).toBeTruthy();
      expect(deletedUser.deleted_at).toBeTruthy();
      expect(deletedUser.deleted_by).toBeTruthy();

      // Verify user cannot be found in normal queries
      const activeUser = await User.findByPk(userId);
      expect(activeUser).toBeNull();

      // Verify audit trail is preserved for compliance
      const preservedAudits = await AuditLog.findAll({
        where: { userId: userId },
      });
      expect(preservedAudits.length).toBeGreaterThan(0);

      // Verify deletion audit entry
      const deletionAudit = await AuditLog.findOne({
        where: {
          userId: userId,
          action: AuditAction.DELETE,
          resourceType: 'users',
        },
      });
      expect(deletionAudit).toBeTruthy();
      expect(deletionAudit.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'right_to_erasure',
          deletion_reason: 'user_request',
          data_retention_period_expired: false,
        })
      );
    });

    test('Right to Data Portability (Article 20) - Structured export', async () => {
      // Test machine-readable structured export
      const portabilityData = await auditService.exportUserData(
        testUser.id,
        'structured'
      );

      // Verify structured format compliance
      expect(portabilityData).toEqual(
        expect.objectContaining({
          format: 'JSON',
          version: '1.0',
          exported_at: expect.any(Date),
          data_subject: expect.any(Object),
        })
      );

      // Verify comprehensive data inclusion
      expect(portabilityData.data_subject).toEqual(
        expect.objectContaining({
          personal_identifiers: expect.objectContaining({
            email: testUser.email,
            name: {
              first: testUser.first_name,
              last: testUser.last_name,
            },
            phone: testUser.phone,
          }),
          account_data: expect.objectContaining({
            role: testUser.role,
            status: testUser.status,
            created_at: expect.any(String),
            consent_history: expect.any(Array),
          }),
          service_data: expect.any(Object),
        })
      );

      // Verify machine-readable format requirements
      expect(typeof portabilityData).toBe('object');
      expect(JSON.stringify(portabilityData)).toBeTruthy(); // Valid JSON

      // Verify no sensitive security data is included
      expect(JSON.stringify(portabilityData)).not.toContain('password');
      expect(JSON.stringify(portabilityData)).not.toContain('mfa_secret');
      expect(JSON.stringify(portabilityData)).not.toContain('session_token');
    });

    test('Right to Restrict Processing (Article 18) - Data processing limitation', async () => {
      // Test processing restriction mechanism
      await testUser.update({
        status: UserStatus.SUSPENDED,
        processing_restricted: true,
        processing_restriction_reason: 'user_request_article_18',
      });

      // Verify processing restriction is enforced
      expect(testUser.status).toBe(UserStatus.SUSPENDED);
      expect(testUser.processing_restricted).toBe(true);

      // Verify audit log for restriction
      const restrictionAudit = await AuditLog.findOne({
        where: {
          userId: testUser.id,
          action: AuditAction.UPDATE,
          details: {
            processing_restricted: true,
          },
        },
        order: [['created_at', 'DESC']],
      });

      expect(restrictionAudit).toBeTruthy();
      expect(restrictionAudit.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'processing_restriction',
          restriction_reason: 'user_request_article_18',
          restricted_at: expect.any(String),
        })
      );
    });
  });

  describe('Consent Management System (Article 7)', () => {
    test('Consent tracking with automated timestamps', async () => {
      const initialConsentDate = testUser.gdpr_consent_date;

      // Test consent revocation
      await testUser.revokeGdprConsent();
      expect(testUser.gdpr_consent_given).toBe(false);
      expect(testUser.gdpr_consent_date).not.toEqual(initialConsentDate);

      // Test consent re-granting
      await testUser.giveGdprConsent();
      expect(testUser.gdpr_consent_given).toBe(true);
      expect(testUser.gdpr_consent_date).toBeTruthy();

      // Verify consent audit trail
      const consentAudits = await AuditLog.findAll({
        where: {
          userId: testUser.id,
          [Op.or]: [
            { 'details.gdpr_consent_given': true },
            { 'details.gdpr_consent_given': false },
          ],
        },
        order: [['created_at', 'ASC']],
      });

      expect(consentAudits.length).toBeGreaterThanOrEqual(2);

      // Verify consent withdrawal audit
      const withdrawalAudit = consentAudits.find(
        audit => audit.details.gdpr_consent_given === false
      );
      expect(withdrawalAudit).toBeTruthy();
      expect(withdrawalAudit.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'consent_withdrawal',
          withdrawal_method: 'user_request',
          previous_consent_date: expect.any(String),
        })
      );
    });

    test('Granular consent management for different processing purposes', async () => {
      // Test consent for specific processing purposes
      const consentPurposes = {
        marketing: true,
        analytics: false,
        service_improvement: true,
        third_party_sharing: false,
      };

      await testUser.update({
        consent_purposes: consentPurposes,
      });

      // Verify granular consent storage
      expect(testUser.consent_purposes).toEqual(consentPurposes);

      // Verify audit log for granular consent
      const consentAudit = await AuditLog.findOne({
        where: {
          userId: testUser.id,
          action: AuditAction.UPDATE,
          'details.consent_purposes': { [Op.ne]: null },
        },
        order: [['created_at', 'DESC']],
      });

      expect(consentAudit).toBeTruthy();
      expect(consentAudit.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'granular_consent_update',
          consent_purposes: consentPurposes,
        })
      );
    });
  });

  describe('Breach Notification (Article 33-34) - 72-hour compliance', () => {
    test('Automated breach detection and notification workflow', async () => {
      const mockBreachEvent = {
        type: 'data_breach',
        severity: 'CRITICAL',
        affected_users: [testUser.id],
        description: 'Simulated personal data breach for GDPR testing',
        detected_at: new Date(),
        breach_categories: ['confidentiality', 'integrity'],
        personal_data_involved: true,
        likely_consequences: 'Identity theft risk, financial fraud risk',
      };

      // Trigger breach detection and notification workflow
      await monitoringService.processSecurityEvent(mockBreachEvent);

      // Verify security alert creation
      const alerts = await SecurityAlert.findAll({
        where: {
          severity: 'CRITICAL',
          type: 'data_breach',
          affected_users: { [Op.contains]: [testUser.id] },
        },
        order: [['created_at', 'DESC']],
        limit: 1,
      });

      expect(alerts).toHaveLength(1);
      const alert = alerts[0];

      // Verify 72-hour notification requirement tracking
      expect(alert.notification_required).toBe(true);
      expect(alert.regulatory_deadline).toBeTruthy();

      // Calculate time difference for 72-hour compliance
      const deadlineHours = Math.abs(
        alert.regulatory_deadline.getTime() - alert.created_at.getTime()
      ) / (1000 * 60 * 60);
      expect(deadlineHours).toBeLessThanOrEqual(72);

      // Verify breach assessment
      expect(alert.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'breach_notification',
          breach_categories: expect.arrayContaining(['confidentiality', 'integrity']),
          personal_data_involved: true,
          risk_assessment: expect.any(String),
          notification_authorities: expect.any(Array),
        })
      );

      // Verify automatic notification preparation
      expect(alert.details.notification_status).toBe('prepared');
      expect(alert.details.authority_notification_required).toBe(true);
      expect(alert.details.data_subject_notification_required).toBe(true);
    });

    test('Breach risk assessment and impact analysis', async () => {
      const lowRiskBreach = {
        type: 'data_breach',
        severity: 'LOW',
        affected_users: [testUser.id],
        description: 'Low-risk pseudonymized data exposure',
        personal_data_involved: false,
        data_pseudonymized: true,
        technical_measures: ['encryption', 'access_controls'],
      };

      await monitoringService.processSecurityEvent(lowRiskBreach);

      const lowRiskAlert = await SecurityAlert.findOne({
        where: {
          severity: 'LOW',
          type: 'data_breach',
        },
        order: [['created_at', 'DESC']],
      });

      // Verify risk-based notification requirements
      expect(lowRiskAlert.details.authority_notification_required).toBe(false);
      expect(lowRiskAlert.details.data_subject_notification_required).toBe(false);
      expect(lowRiskAlert.details.risk_level).toBe('low');
      expect(lowRiskAlert.details.notification_exemption_reason).toContain(
        'pseudonymized data'
      );
    });
  });

  describe('Data Retention and Deletion (Article 5)', () => {
    test('Automated data retention enforcement', async () => {
      // Test data retention period validation
      expect(testUser.data_retention_until).toBeTruthy();

      const retentionDate = new Date(testUser.data_retention_until);
      const creationDate = new Date(testUser.created_at);
      const retentionYears = 
        (retentionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      // Verify 7-year retention period for customer data
      expect(Math.round(retentionYears)).toBe(7);

      // Test retention period extension for legal basis
      await testUser.update({
        data_retention_until: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
        retention_extension_reason: 'legal_obligation',
      });

      // Verify retention extension audit
      const retentionAudit = await AuditLog.findOne({
        where: {
          userId: testUser.id,
          action: AuditAction.UPDATE,
          'details.retention_extension_reason': 'legal_obligation',
        },
        order: [['created_at', 'DESC']],
      });

      expect(retentionAudit).toBeTruthy();
      expect(retentionAudit.details).toEqual(
        expect.objectContaining({
          gdpr_context: 'retention_period_extension',
          new_retention_until: expect.any(String),
          extension_reason: 'legal_obligation',
          legal_basis: expect.any(String),
        })
      );
    });

    test('Automated deletion of expired data', async () => {
      // Create user with expired retention period
      const expiredUser = await User.create({
        email: `expired-${Date.now()}@example.com`,
        password_hash: await User.hashPassword('TestPassword123!'),
        first_name: 'Expired',
        last_name: 'User',
        role: UserRole.CUSTOMER,
        data_retention_until: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      // Simulate automated retention cleanup process
      const expiredUsers = await User.findAll({
        where: {
          data_retention_until: {
            [Op.lt]: new Date(),
          },
          deleted_at: null,
        },
      });

      expect(expiredUsers).toContainEqual(
        expect.objectContaining({
          id: expiredUser.id,
        })
      );

      // Test automated deletion process
      for (const user of expiredUsers) {
        await user.destroy();

        // Log retention-based deletion
        await AuditLog.create({
          userId: user.id,
          action: AuditAction.DELETE,
          resourceType: 'users',
          resourceId: user.id,
          details: {
            gdpr_context: 'automated_retention_deletion',
            retention_period_expired: true,
            deletion_date: new Date(),
          },
          ipAddress: 'system',
          userAgent: 'retention_cleanup_service',
        });
      }

      // Verify expired user is deleted
      const deletedExpiredUser = await User.findByPk(expiredUser.id);
      expect(deletedExpiredUser).toBeNull();
    });
  });

  describe('Cross-border Data Transfer (Chapter V)', () => {
    test('Data transfer compliance tracking', async () => {
      const transferEvent = {
        user_id: testUser.id,
        transfer_type: 'third_country',
        destination_country: 'US',
        legal_basis: 'adequacy_decision',
        purpose: 'service_provision',
        safeguards: ['privacy_shield', 'contractual_clauses'],
        transfer_date: new Date(),
      };

      // Log data transfer for compliance tracking
      await AuditLog.create({
        userId: testUser.id,
        action: AuditAction.TRANSFER,
        resourceType: 'personal_data',
        resourceId: testUser.id,
        details: {
          gdpr_context: 'cross_border_transfer',
          ...transferEvent,
        },
        ipAddress: 'system',
        userAgent: 'data_transfer_service',
      });

      // Verify transfer audit
      const transferAudit = await AuditLog.findOne({
        where: {
          userId: testUser.id,
          action: AuditAction.TRANSFER,
          'details.gdpr_context': 'cross_border_transfer',
        },
        order: [['created_at', 'DESC']],
      });

      expect(transferAudit).toBeTruthy();
      expect(transferAudit.details).toEqual(
        expect.objectContaining({
          destination_country: 'US',
          legal_basis: 'adequacy_decision',
          safeguards: expect.arrayContaining(['privacy_shield', 'contractual_clauses']),
        })
      );
    });
  });
});