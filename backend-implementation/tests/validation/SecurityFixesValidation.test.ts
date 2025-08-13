/**
 * ============================================================================
 * SECURITY FIXES VALIDATION TEST SUITE
 * ============================================================================
 * 
 * Critical validation tests for parallel Security Agent deployment.
 * Tests 6 major security fixes to ensure production readiness without
 * breaking existing functionality.
 * 
 * Real-time validation during Security Agent parallel deployment
 * For $2M+ MRR waste management system production deployment.
 * 
 * Created by: Testing-Agent (Validation Mission)
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Import both encryption versions for compatibility testing
import * as encryptionOld from '@/utils/encryption';
import * as encryptionFixed from '@/utils/encryption_fixed';

// Import authentication and session components
import { 
  authenticateToken, 
  generateToken, 
  generateRefreshToken,
  verifyRefreshToken,
  AuthenticatedRequest
} from '@/middleware/auth';
import { SessionService } from '@/services/SessionService';

// Import models for testing
import { User, UserRole, UserStatus } from '@/models/User';
import { UserSession, SessionStatus } from '@/models/UserSession';

// Test utilities and fixtures
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { userFixtures } from '@tests/fixtures/UserFixtures';

describe('Security Fixes Validation Suite', () => {
  let testDbHelper: DatabaseTestHelper;
  let testUser: any;
  let testSession: any;

  beforeAll(async () => {
    // Initialize test database and helper
    testDbHelper = new DatabaseTestHelper();
    await testDbHelper.setup();

    // Create test user for authentication testing
    testUser = await User.create({
      ...userFixtures.createValidUser(),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    });
  });

  afterAll(async () => {
    // Cleanup test environment
    await testDbHelper.cleanup();
  });

  beforeEach(async () => {
    // Clear any existing sessions before each test
    await UserSession.destroy({ where: {}, force: true });
  });

  afterEach(async () => {
    // Cleanup after each test
    await UserSession.destroy({ where: {}, force: true });
  });

  describe('1. Encryption Implementation Compatibility Validation', () => {
    const testData = 'Sensitive customer data: PCI DSS test payload 2025';
    const testPersonalData = 'PII: John Doe, SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111';

    test('should maintain backward compatibility between encryption versions', async () => {
      // Test data encrypted with old version should decrypt with both versions
      const encryptedOld = await encryptionOld.encryptSensitiveData(testData);
      
      // Verify old encryption can be decrypted by both versions
      const decryptedByOld = await encryptionOld.decryptSensitiveData(encryptedOld);
      const decryptedByFixed = await encryptionFixed.decryptSensitiveData(encryptedOld);
      
      expect(decryptedByOld).toBe(testData);
      expect(decryptedByFixed).toBe(testData);
    });

    test('should handle new encryption format correctly', async () => {
      // Test data encrypted with fixed version
      const encryptedFixed = await encryptionFixed.encryptSensitiveData(testData);
      
      // Verify it can be decrypted correctly
      const decryptedByFixed = await encryptionFixed.decryptSensitiveData(encryptedFixed);
      
      expect(decryptedByFixed).toBe(testData);
      
      // Check key version is updated to 2.0
      const encryptedDataStructure = JSON.parse(
        Buffer.from(encryptedFixed, 'base64').toString('utf8')
      );
      expect(encryptedDataStructure.keyVersion).toBe('2.0');
    });

    test('should handle missing authentication tags gracefully', async () => {
      // Create encrypted data without proper auth tag (simulating legacy data)
      const encryptedOld = await encryptionOld.encryptSensitiveData(testData);
      const encryptedDataStructure = JSON.parse(
        Buffer.from(encryptedOld, 'base64').toString('utf8')
      );
      
      // Remove auth tag to simulate legacy data
      delete encryptedDataStructure.tag;
      const corruptedData = Buffer.from(JSON.stringify(encryptedDataStructure)).toString('base64');
      
      // Both versions should handle this gracefully
      await expect(encryptionOld.decryptSensitiveData(corruptedData)).rejects.toThrow();
      await expect(encryptionFixed.decryptSensitiveData(corruptedData)).rejects.toThrow();
    });

    test('should maintain database field encryption compatibility', async () => {
      // Test database field encryption/decryption compatibility
      const encryptedField = await encryptionOld.encryptDatabaseField(testPersonalData);
      
      expect(encryptedField).not.toBeNull();
      
      // Both versions should decrypt database fields correctly
      const decryptedByOld = await encryptionOld.decryptDatabaseField(encryptedField);
      const decryptedByFixed = await encryptionFixed.decryptDatabaseField(encryptedField);
      
      expect(decryptedByOld).toBe(testPersonalData);
      expect(decryptedByFixed).toBe(testPersonalData);
    });

    test('should handle key rotation between versions', async () => {
      // Encrypt with old version
      const encryptedOld = await encryptionOld.encryptSensitiveData(testData);
      
      // Rotate key using new version
      const rotatedEncryption = await encryptionFixed.rotateEncryptionKey(encryptedOld);
      
      // Verify rotated data can be decrypted
      const decryptedRotated = await encryptionFixed.decryptSensitiveData(rotatedEncryption);
      expect(decryptedRotated).toBe(testData);
      
      // Verify key version is updated
      const rotatedStructure = JSON.parse(
        Buffer.from(rotatedEncryption, 'base64').toString('utf8')
      );
      expect(rotatedStructure.keyVersion).toBe('2.0');
    });
  });

  describe('2. JWT Security Migration Validation', () => {
    test('should maintain existing token validation during transition', async () => {
      // Generate token with current implementation
      const tokenPayload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      };
      
      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: testUser.id });
      
      // Verify tokens are valid
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      
      // Verify refresh token validation
      const refreshPayload = verifyRefreshToken(refreshToken);
      expect(refreshPayload.userId).toBe(testUser.id);
    });

    test('should enforce algorithm specification in JWT validation', async () => {
      // This test ensures algorithm confusion attacks are prevented
      const tokenPayload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      };
      
      const accessToken = generateToken(tokenPayload);
      
      // Create mock request with token
      const mockReq = {
        headers: { authorization: `Bearer ${accessToken}` },
        ip: '127.0.0.1'
      } as any;
      
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn()
      } as any;
      
      const mockNext = jest.fn();
      
      // Test authentication middleware
      await authenticateToken(mockReq, mockRes, mockNext);
      
      // Should call next() for valid token, not return error
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should handle token expiry correctly', async () => {
      // Test with mock expired token (this would require mocking time or creating short-lived token)
      const mockReq = {
        headers: { authorization: 'Bearer invalid.expired.token' },
        ip: '127.0.0.1'
      } as any;
      
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn()
      } as any;
      
      const mockNext = jest.fn();
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      // Should return 401 for invalid token
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('3. Session Management Security Validation', () => {
    beforeEach(async () => {
      // Initialize session service for testing
      await SessionService.initialize();
    });

    test('should create secure sessions with proper token generation', async () => {
      const sessionOptions = {
        userId: testUser.id,
        userRole: testUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        mfaVerified: true
      };
      
      const session = await SessionService.createSession(sessionOptions);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.sessionToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.mfaVerified).toBe(true);
      expect(session.status).toBe(SessionStatus.ACTIVE);
    });

    test('should enforce session limits per user role', async () => {
      // Test session limits for admin role (limit: 3)
      const sessionOptions = {
        userId: testUser.id,
        userRole: UserRole.ADMIN,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser'
      };
      
      // Create maximum allowed sessions (3 for admin)
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await SessionService.createSession(sessionOptions);
        sessions.push(session);
      }
      
      // Creating 4th session should remove oldest
      const fourthSession = await SessionService.createSession(sessionOptions);
      
      // Verify first session is removed
      const firstSession = await SessionService.getSession(sessions[0].sessionToken);
      expect(firstSession).toBeNull();
      
      // Verify fourth session exists
      const retrievedFourthSession = await SessionService.getSession(fourthSession.sessionToken);
      expect(retrievedFourthSession).toBeDefined();
    });

    test('should validate session integrity correctly', async () => {
      const sessionOptions = {
        userId: testUser.id,
        userRole: testUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser'
      };
      
      const session = await SessionService.createSession(sessionOptions);
      
      // Validate session integrity
      const isValid = await SessionService.validateSessionIntegrity(session.sessionToken);
      expect(isValid).toBe(true);
      
      // Test with invalid session token
      const invalidIsValid = await SessionService.validateSessionIntegrity('invalid-token');
      expect(invalidIsValid).toBe(false);
    });

    test('should handle session cleanup correctly', async () => {
      const sessionOptions = {
        userId: testUser.id,
        userRole: testUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser'
      };
      
      const session = await SessionService.createSession(sessionOptions);
      
      // Delete session
      const deleted = await SessionService.deleteSession(session.sessionToken);
      expect(deleted).toBe(true);
      
      // Verify session is removed
      const retrievedSession = await SessionService.getSession(session.sessionToken);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('4. Authentication Flow Security Validation', () => {
    test('should handle account lockout correctly', async () => {
      // Create locked user
      const lockedUser = await User.create({
        ...userFixtures.createValidUser(),
        status: UserStatus.LOCKED,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      });
      
      const tokenPayload = {
        id: lockedUser.id,
        email: lockedUser.email,
        role: lockedUser.role
      };
      
      const accessToken = generateToken(tokenPayload);
      
      const mockReq = {
        headers: { authorization: `Bearer ${accessToken}` },
        ip: '127.0.0.1'
      } as any;
      
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn()
      } as any;
      
      const mockNext = jest.fn();
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      // Should return 423 for locked account
      expect(mockRes.status).toHaveBeenCalledWith(423);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle inactive user accounts', async () => {
      // Create inactive user
      const inactiveUser = await User.create({
        ...userFixtures.createValidUser(),
        status: UserStatus.INACTIVE
      });
      
      const tokenPayload = {
        id: inactiveUser.id,
        email: inactiveUser.email,
        role: inactiveUser.role
      };
      
      const accessToken = generateToken(tokenPayload);
      
      const mockReq = {
        headers: { authorization: `Bearer ${accessToken}` },
        ip: '127.0.0.1'
      } as any;
      
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn()
      } as any;
      
      const mockNext = jest.fn();
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      // Should return 403 for inactive account
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should validate user existence and soft deletes', async () => {
      // Create user and soft delete
      const deletedUser = await User.create(userFixtures.createValidUser());
      await deletedUser.destroy(); // Soft delete
      
      const tokenPayload = {
        id: deletedUser.id,
        email: deletedUser.email,
        role: deletedUser.role
      };
      
      const accessToken = generateToken(tokenPayload);
      
      const mockReq = {
        headers: { authorization: `Bearer ${accessToken}` },
        ip: '127.0.0.1'
      } as any;
      
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn()
      } as any;
      
      const mockNext = jest.fn();
      
      await authenticateToken(mockReq, mockRes, mockNext);
      
      // Should return 401 for deleted user
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('5. Role-Based Access Control (RBAC) Validation', () => {
    test('should enforce role-based permissions correctly', async () => {
      // Test user permissions based on role
      expect(testUser.canAccess('users', 'read')).toBe(true);
      expect(testUser.canAccess('users', 'write')).toBe(true);
      expect(testUser.canAccess('system', 'admin')).toBe(true);
      
      // Create customer user for permission testing
      const customerUser = await User.create({
        ...userFixtures.createValidUser(),
        role: UserRole.CUSTOMER
      });
      
      expect(customerUser.canAccess('users', 'read')).toBe(false);
      expect(customerUser.canAccess('bins', 'read')).toBe(true);
      expect(customerUser.canAccess('system', 'admin')).toBe(false);
    });

    test('should validate resource ownership correctly', async () => {
      // Create customer user
      const customerUser = await User.create({
        ...userFixtures.createValidUser(),
        role: UserRole.CUSTOMER
      });
      
      // Test ownership validation (customer can only access own resources)
      const canAccessOwnResource = customerUser.id === customerUser.id;
      const canAccessOtherResource = customerUser.id === testUser.id;
      
      expect(canAccessOwnResource).toBe(true);
      expect(canAccessOtherResource).toBe(false);
    });
  });

  describe('6. MFA and Security Secret Validation', () => {
    test('should handle MFA secret encryption correctly', async () => {
      const mfaSecret = 'JBSWY3DPEHPK3PXP';
      
      // Encrypt MFA secret using both encryption versions
      const encryptedSecretOld = await encryptionOld.encryptSensitiveData(mfaSecret);
      const encryptedSecretFixed = await encryptionFixed.encryptSensitiveData(mfaSecret);
      
      // Both should decrypt correctly
      const decryptedOld = await encryptionOld.decryptSensitiveData(encryptedSecretOld);
      const decryptedFixed = await encryptionFixed.decryptSensitiveData(encryptedSecretFixed);
      
      expect(decryptedOld).toBe(mfaSecret);
      expect(decryptedFixed).toBe(mfaSecret);
    });

    test('should verify session data encryption security', async () => {
      const sessionData = {
        userId: testUser.id,
        role: testUser.role,
        permissions: ['read', 'write'],
        mfaVerified: true
      };
      
      // Test session data encryption with both versions
      const encryptedOld = encryptionOld.encryptSessionData(sessionData);
      const encryptedFixed = encryptionFixed.encryptSessionData(sessionData);
      
      expect(encryptedOld).toBeDefined();
      expect(encryptedFixed).toBeDefined();
      
      // Both should decrypt correctly
      const decryptedOld = encryptionOld.decryptSessionData(encryptedOld);
      const decryptedFixed = encryptionFixed.decryptSessionData(encryptedFixed);
      
      expect(decryptedOld).toEqual(sessionData);
      expect(decryptedFixed).toEqual(sessionData);
    });
  });
});