/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER SERVICE UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for UserService class.
 * Tests business logic, validation, error handling, and security features.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { UserService } from '@/services/UserService';
import { User, UserRole, UserStatus } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { UserSession } from '@/models/UserSession';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { UserFixtures } from '@tests/fixtures/UserFixtures';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} from '@/middleware/errorHandler';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/utils/encryption');
jest.mock('@/config', () => ({
  config: {
    auth: {
      jwtSecret: 'test-jwt-secret',
      jwtExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
    },
    security: {
      bcryptRounds: 4,
      accountLockout: {
        attempts: 5,
        time: 1800000,
      },
    },
  },
}));

describe('UserService', () => {
  let userService: UserService;
  let userFixtures: UserFixtures;

  beforeAll(async () => {
    await DatabaseTestHelper.initialize();
  });

  afterAll(async () => {
    await DatabaseTestHelper.close();
  });

  beforeEach(async () => {
    await DatabaseTestHelper.reset();
    userService = new UserService();
    userFixtures = new UserFixtures();
    userFixtures.resetCounter();
  });

  afterEach(async () => {
    await DatabaseTestHelper.cleanup();
  });

  describe('createUser', () => {
    it('should create a user successfully with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+15551234567',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.email).toBe(userData.email.toLowerCase());
      expect(result.data.first_name).toBe(userData.firstName);
      expect(result.data.last_name).toBe(userData.lastName);
      expect(result.data.role).toBe(userData.role);

      // Verify password was hashed
      expect(result.data.password_hash).toBeDefined();
      expect(result.data.password_hash).not.toBe(userData.password);
      
      // Verify password can be validated
      const isValidPassword = await result.data.validatePassword(userData.password);
      expect(isValidPassword).toBe(true);
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for short password', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        // Missing firstName, lastName, role, organizationId
      };

      // Act & Assert
      await expect(userService.createUser(userData as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when user already exists', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      await userService.createUser(userData);

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(ValidationError);
    });

    it('should create audit log entry for user creation', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const result = await userService.createUser(userData, 'admin-123');

      // Assert
      const auditLogs = await AuditLog.findAll({
        where: { entityId: result.data.id, action: 'user_created' }
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].userId).toBe('admin-123');
    });
  });

  describe('authenticateUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFixtures.createUser({
        email: 'auth@test.com',
        password: 'TestPassword123!',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      });
    });

    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const authData = {
        email: 'auth@test.com',
        password: 'TestPassword123!',
      };

      // Act
      const result = await userService.authenticateUser(authData, '192.168.1.1', 'Test-Agent');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe(testUser.id);
      expect(result.data.token).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(result.data.sessionId).toBeDefined();

      // Verify JWT token
      const decoded = jwt.verify(result.data.token, 'test-jwt-secret') as any;
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
    });

    it('should throw AuthenticationError for invalid email', async () => {
      // Arrange
      const authData = {
        email: 'nonexistent@test.com',
        password: 'TestPassword123!',
      };

      // Act & Assert
      await expect(
        userService.authenticateUser(authData)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      // Arrange
      const authData = {
        email: 'auth@test.com',
        password: 'WrongPassword123!',
      };

      // Act & Assert
      await expect(
        userService.authenticateUser(authData)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for locked account', async () => {
      // Arrange
      await testUser.update({
        status: UserStatus.LOCKED,
        locked_until: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });

      const authData = {
        email: 'auth@test.com',
        password: 'TestPassword123!',
      };

      // Act & Assert
      await expect(
        userService.authenticateUser(authData)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should increment failed login attempts on wrong password', async () => {
      // Arrange
      const authData = {
        email: 'auth@test.com',
        password: 'WrongPassword123!',
      };

      // Act
      try {
        await userService.authenticateUser(authData);
      } catch (error) {
        // Expected to fail
      }

      // Assert
      await testUser.reload();
      expect(testUser.failed_login_attempts).toBe(1);
    });

    it('should lock account after max failed attempts', async () => {
      // Arrange
      await testUser.update({ failed_login_attempts: 4 }); // One less than max

      const authData = {
        email: 'auth@test.com',
        password: 'WrongPassword123!',
      };

      // Act
      try {
        await userService.authenticateUser(authData);
      } catch (error) {
        // Expected to fail
      }

      // Assert
      await testUser.reload();
      expect(testUser.failed_login_attempts).toBe(5);
      expect(testUser.locked_until).toBeDefined();
      expect(testUser.status).toBe(UserStatus.LOCKED);
    });

    it('should reset failed attempts on successful login', async () => {
      // Arrange
      await testUser.update({ failed_login_attempts: 3 });

      const authData = {
        email: 'auth@test.com',
        password: 'TestPassword123!',
      };

      // Act
      await userService.authenticateUser(authData);

      // Assert
      await testUser.reload();
      expect(testUser.failed_login_attempts).toBe(0);
      expect(testUser.last_login_at).toBeDefined();
    });

    it('should create user session on successful authentication', async () => {
      // Arrange
      const authData = {
        email: 'auth@test.com',
        password: 'TestPassword123!',
      };

      // Act
      const result = await userService.authenticateUser(authData, '192.168.1.1', 'Test-Agent');

      // Assert
      const session = await UserSession.findByPk(result.data.sessionId);
      expect(session).toBeDefined();
      expect(session!.userId).toBe(testUser.id);
      expect(session!.isActive).toBe(true);
    });

    it('should create audit log for successful login', async () => {
      // Arrange
      const authData = {
        email: 'auth@test.com',
        password: 'TestPassword123!',
      };

      // Act
      await userService.authenticateUser(authData, '192.168.1.1', 'Test-Agent');

      // Assert
      const auditLogs = await AuditLog.findAll({
        where: { userId: testUser.id, action: 'user_login' }
      });
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('updateProfile', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFixtures.createUser({
        email: 'profile@test.com',
        firstName: 'Original',
        lastName: 'Name',
      });
    });

    it('should update user profile successfully', async () => {
      // Arrange
      const updateData = {
        firstName: 'Updated',
        lastName: 'NewName',
        phone: '+15559876543',
      };

      // Act
      const result = await userService.updateProfile(testUser.id, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.first_name).toBe('Updated');
      expect(result.data.last_name).toBe('NewName');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';
      const updateData = { firstName: 'Updated' };

      // Act & Assert
      await expect(
        userService.updateProfile(nonExistentId, updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate email uniqueness when updating email', async () => {
      // Arrange
      const anotherUser = await userFixtures.createUser({
        email: 'another@test.com',
      });

      const updateData = { email: 'another@test.com' };

      // Act & Assert
      await expect(
        userService.updateProfile(testUser.id, updateData)
      ).rejects.toThrow(ValidationError);
    });

    it('should create audit log for profile update', async () => {
      // Arrange
      const updateData = { firstName: 'Updated' };

      // Act
      await userService.updateProfile(testUser.id, updateData, 'admin-123');

      // Assert
      const auditLogs = await AuditLog.findAll({
        where: { entityId: testUser.id, action: 'profile_updated' }
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].userId).toBe('admin-123');
    });
  });

  describe('changePassword', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFixtures.createUser({
        email: 'password@test.com',
        password: 'OldPassword123!',
      });
    });

    it('should change password successfully with valid data', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      // Act
      const result = await userService.changePassword(testUser.id, passwordData);

      // Assert
      expect(result.success).toBe(true);

      // Verify old password no longer works
      await testUser.reload();
      const oldPasswordValid = await testUser.validatePassword('OldPassword123!');
      expect(oldPasswordValid).toBe(false);

      // Verify new password works
      const newPasswordValid = await testUser.validatePassword('NewPassword123!');
      expect(newPasswordValid).toBe(true);
    });

    it('should throw ValidationError for incorrect current password', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      // Act & Assert
      await expect(
        userService.changePassword(testUser.id, passwordData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when passwords do not match', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };

      // Act & Assert
      await expect(
        userService.changePassword(testUser.id, passwordData)
      ).rejects.toThrow(ValidationError);
    });

    it('should invalidate all user sessions after password change', async () => {
      // Arrange
      // Create some active sessions
      await UserSession.create({
        userId: testUser.id,
        token: 'token-1',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        metadata: { ip: '127.0.0.1' },
      });

      await UserSession.create({
        userId: testUser.id,
        token: 'token-2',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        metadata: { ip: '127.0.0.1' },
      });

      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      // Act
      await userService.changePassword(testUser.id, passwordData);

      // Assert
      const activeSessions = await UserSession.findAll({
        where: { userId: testUser.id, isActive: true }
      });
      expect(activeSessions).toHaveLength(0);
    });

    it('should create audit log for password change', async () => {
      // Arrange
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      // Act
      await userService.changePassword(testUser.id, passwordData);

      // Assert
      const auditLogs = await AuditLog.findAll({
        where: { entityId: testUser.id, action: 'password_changed' }
      });
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('getUserById', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFixtures.createUser({
        email: 'getuser@test.com',
        phone: '+15551234567',
      });
    });

    it('should get user by ID successfully', async () => {
      // Act
      const result = await userService.getUserById(testUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(testUser.id);
      expect(result.data.email).toBe(testUser.email);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';

      // Act & Assert
      await expect(
        userService.getUserById(nonExistentId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivateUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFixtures.createUser({
        email: 'deactivate@test.com',
      });
    });

    it('should deactivate user successfully', async () => {
      // Act
      const result = await userService.deactivateUser(
        testUser.id,
        'admin-123',
        'Test deactivation'
      );

      // Assert
      expect(result.success).toBe(true);

      await testUser.reload();
      expect(testUser.status).toBe(UserStatus.INACTIVE);
    });

    it('should invalidate all user sessions when deactivating', async () => {
      // Arrange
      await UserSession.create({
        userId: testUser.id,
        token: 'active-token',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        metadata: { ip: '127.0.0.1' },
      });

      // Act
      await userService.deactivateUser(testUser.id, 'admin-123');

      // Assert
      const activeSessions = await UserSession.findAll({
        where: { userId: testUser.id, isActive: true }
      });
      expect(activeSessions).toHaveLength(0);
    });

    it('should create audit log for user deactivation', async () => {
      // Act
      await userService.deactivateUser(
        testUser.id,
        'admin-123',
        'Test deactivation'
      );

      // Assert
      const auditLogs = await AuditLog.findAll({
        where: { entityId: testUser.id, action: 'user_deactivated' }
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].userId).toBe('admin-123');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const nonExistentId = 'non-existent-id';

      // Act & Assert
      await expect(
        userService.deactivateUser(nonExistentId, 'admin-123')
      ).rejects.toThrow(NotFoundError);
    });
  });
});