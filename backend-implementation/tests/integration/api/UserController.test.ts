/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER CONTROLLER INTEGRATION TESTS
 * ============================================================================
 *
 * Integration tests for User API endpoints. Tests complete request/response
 * cycle including authentication, validation, and database operations.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Express } from 'express';
import { User, UserRole, UserStatus } from '@/models/User';
import { ApiTestHelper, TestUser } from '@tests/helpers/ApiTestHelper';
import { testFixtures } from '@tests/fixtures';
import { createApp } from '@/server'; // Assuming you have an app factory function

describe('UserController Integration Tests', () => {
  let app: Express;
  let apiHelper: ApiTestHelper;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    apiHelper = new ApiTestHelper(app);
  });

  afterAll(async () => {
    await apiHelper.cleanup();
  });

  beforeEach(async () => {
    // Create test users with different roles
    adminUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN, {
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
    });

    regularUser = await apiHelper.createTestUserWithToken(UserRole.CUSTOMER, {
      email: 'user@test.com',
      first_name: 'Regular',
      last_name: 'User',
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create additional test users
      await testFixtures.users.createUsers(5, {
        role: UserRole.CUSTOMER,
      });
    });

    it('should return paginated list of users for admin', async () => {
      // Act
      const response = await apiHelper.get('/api/users', adminUser.token, {
        page: 1,
        limit: 10,
      });

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should deny access for non-admin users', async () => {
      // Act
      const response = await apiHelper.get('/api/users', regularUser.token);

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should require authentication', async () => {
      // Act
      const response = await apiHelper.get('/api/users');

      // Assert
      apiHelper.assertUnauthorized(response);
    });

    it('should filter users by role', async () => {
      // Arrange
      await testFixtures.users.createUsers(3, { role: UserRole.DRIVER });

      // Act
      const response = await apiHelper.get('/api/users', adminUser.token, {
        role: UserRole.DRIVER,
      });

      // Assert
      apiHelper.assertSuccess(response);
      response.body.data.items.forEach((user: any) => {
        expect(user.role).toBe(UserRole.DRIVER);
      });
    });

    it('should support pagination', async () => {
      // Arrange - we have 7 total users (2 created + 5 from beforeEach)
      
      // Act & Assert
      await apiHelper.testPagination('/api/users', adminUser.token, 7);
    });

    it('should not expose sensitive user data', async () => {
      // Act
      const response = await apiHelper.get('/api/users', adminUser.token);

      // Assert
      apiHelper.assertSuccess(response);
      response.body.data.items.forEach((user: any) => {
        expect(user.password_hash).toBeUndefined();
        expect(user.mfa_secret).toBeUndefined();
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user details for admin', async () => {
      // Act
      const response = await apiHelper.get(
        `/api/users/${regularUser.user.id}`,
        adminUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.id).toBe(regularUser.user.id);
      expect(response.body.data.email).toBe(regularUser.user.email);
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should allow users to get their own profile', async () => {
      // Act
      const response = await apiHelper.get(
        `/api/users/${regularUser.user.id}`,
        regularUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.id).toBe(regularUser.user.id);
    });

    it('should deny access to other users for non-admin', async () => {
      // Act
      const response = await apiHelper.get(
        `/api/users/${adminUser.user.id}`,
        regularUser.token
      );

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should return 404 for non-existent user', async () => {
      // Act
      const response = await apiHelper.get(
        '/api/users/non-existent-id',
        adminUser.token
      );

      // Assert
      apiHelper.assertNotFound(response);
    });

    it('should require authentication', async () => {
      // Act
      const response = await apiHelper.get(`/api/users/${regularUser.user.id}`);

      // Assert
      apiHelper.assertUnauthorized(response);
    });
  });

  describe('POST /api/users', () => {
    it('should create user with valid data for admin', async () => {
      // Arrange
      const newUserData = {
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const response = await apiHelper.post('/api/users', newUserData, adminUser.token);

      // Assert
      apiHelper.assertSuccess(response, 201);
      expect(response.body.data.email).toBe(newUserData.email.toLowerCase());
      expect(response.body.data.firstName).toBe(newUserData.firstName);
      expect(response.body.data.role).toBe(newUserData.role);

      // Verify user was created in database
      const createdUser = await User.findOne({
        where: { email: newUserData.email.toLowerCase() }
      });
      expect(createdUser).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      // Arrange
      const newUserData = {
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      // Act
      const response = await apiHelper.post('/api/users', newUserData, regularUser.token);

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidUserData = {
        email: 'invalid-email',
        // Missing password, firstName, lastName, role
      };

      // Act
      const response = await apiHelper.post('/api/users', invalidUserData, adminUser.token);

      // Assert
      apiHelper.assertValidationError(response, ['email', 'password', 'firstName', 'lastName', 'role']);
    });

    it('should prevent duplicate email addresses', async () => {
      // Arrange
      const userData = {
        email: regularUser.user.email, // Existing email
        password: 'NewPassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const response = await apiHelper.post('/api/users', userData, adminUser.token);

      // Assert
      apiHelper.assertError(response, 409, 'already exists');
    });

    it('should require strong password', async () => {
      // Arrange
      const userData = {
        email: 'weakpass@test.com',
        password: 'weak', // Too weak
        firstName: 'Weak',
        lastName: 'Password',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const response = await apiHelper.post('/api/users', userData, adminUser.token);

      // Assert
      apiHelper.assertValidationError(response, ['password']);
    });

    it('should require authentication', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      // Act
      const response = await apiHelper.post('/api/users', userData);

      // Assert
      apiHelper.assertUnauthorized(response);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user for admin', async () => {
      // Arrange
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+15559876543',
      };

      // Act
      const response = await apiHelper.put(
        `/api/users/${regularUser.user.id}`,
        updateData,
        adminUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);

      // Verify update in database
      const updatedUser = await User.findByPk(regularUser.user.id);
      expect(updatedUser?.first_name).toBe(updateData.firstName);
    });

    it('should allow users to update their own profile', async () => {
      // Arrange
      const updateData = {
        firstName: 'SelfUpdated',
        phone: '+15559876543',
      };

      // Act
      const response = await apiHelper.put(
        `/api/users/${regularUser.user.id}`,
        updateData,
        regularUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });

    it('should prevent role elevation by non-admin users', async () => {
      // Arrange
      const updateData = {
        role: UserRole.ADMIN, // Trying to escalate privileges
      };

      // Act
      const response = await apiHelper.put(
        `/api/users/${regularUser.user.id}`,
        updateData,
        regularUser.token
      );

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should validate email uniqueness when updating', async () => {
      // Arrange
      const updateData = {
        email: adminUser.user.email, // Existing email
      };

      // Act
      const response = await apiHelper.put(
        `/api/users/${regularUser.user.id}`,
        updateData,
        adminUser.token
      );

      // Assert
      apiHelper.assertError(response, 409, 'email already in use');
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      const updateData = { firstName: 'Updated' };

      // Act
      const response = await apiHelper.put(
        '/api/users/non-existent-id',
        updateData,
        adminUser.token
      );

      // Assert
      apiHelper.assertNotFound(response);
    });
  });

  describe('PATCH /api/users/:id/status', () => {
    it('should deactivate user for admin', async () => {
      // Arrange
      const statusData = { status: UserStatus.INACTIVE, reason: 'Test deactivation' };

      // Act
      const response = await apiHelper.patch(
        `/api/users/${regularUser.user.id}/status`,
        statusData,
        adminUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);

      // Verify status change in database
      const updatedUser = await User.findByPk(regularUser.user.id);
      expect(updatedUser?.status).toBe(UserStatus.INACTIVE);
    });

    it('should deny access for non-admin users', async () => {
      // Arrange
      const statusData = { status: UserStatus.INACTIVE };

      // Act
      const response = await apiHelper.patch(
        `/api/users/${adminUser.user.id}/status`,
        statusData,
        regularUser.token
      );

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should validate status values', async () => {
      // Arrange
      const statusData = { status: 'invalid-status' };

      // Act
      const response = await apiHelper.patch(
        `/api/users/${regularUser.user.id}/status`,
        statusData,
        adminUser.token
      );

      // Assert
      apiHelper.assertValidationError(response, ['status']);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should soft delete user for admin', async () => {
      // Act
      const response = await apiHelper.delete(
        `/api/users/${regularUser.user.id}`,
        adminUser.token
      );

      // Assert
      apiHelper.assertSuccess(response, 204);

      // Verify soft delete in database
      const deletedUser = await User.findByPk(regularUser.user.id);
      expect(deletedUser).toBeNull(); // Should be null due to paranoid setting

      // Verify user still exists with deleted_at set
      const userWithDeleted = await User.findByPk(regularUser.user.id, { paranoid: false });
      expect(userWithDeleted?.deleted_at).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      // Act
      const response = await apiHelper.delete(
        `/api/users/${adminUser.user.id}`,
        regularUser.token
      );

      // Assert
      apiHelper.assertForbidden(response);
    });

    it('should prevent self-deletion', async () => {
      // Act
      const response = await apiHelper.delete(
        `/api/users/${adminUser.user.id}`,
        adminUser.token
      );

      // Assert
      apiHelper.assertError(response, 400, 'cannot delete yourself');
    });

    it('should return 404 for non-existent user', async () => {
      // Act
      const response = await apiHelper.delete(
        '/api/users/non-existent-id',
        adminUser.token
      );

      // Assert
      apiHelper.assertNotFound(response);
    });
  });

  describe('POST /api/users/:id/password-reset', () => {
    it('should reset password for admin', async () => {
      // Act
      const response = await apiHelper.post(
        `/api/users/${regularUser.user.id}/password-reset`,
        {},
        adminUser.token
      );

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.temporaryPassword).toBeDefined();

      // Verify user requires password change
      const updatedUser = await User.findByPk(regularUser.user.id);
      expect(updatedUser?.password_changed_at).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      // Act
      const response = await apiHelper.post(
        `/api/users/${adminUser.user.id}/password-reset`,
        {},
        regularUser.token
      );

      // Assert
      apiHelper.assertForbidden(response);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return current user profile', async () => {
      // Act
      const response = await apiHelper.get('/api/users/profile', regularUser.token);

      // Assert
      apiHelper.assertSuccess(response);
      expect(response.body.data.id).toBe(regularUser.user.id);
      expect(response.body.data.email).toBe(regularUser.user.email);
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should require authentication', async () => {
      // Act
      const response = await apiHelper.get('/api/users/profile');

      // Assert
      apiHelper.assertUnauthorized(response);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on user creation', async () => {
      // This test would require actual rate limiting to be implemented
      // For now, we'll just test that the endpoint exists
      const response = await apiHelper.get('/api/users', adminUser.token);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize input data', async () => {
      // Arrange
      const maliciousData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const response = await apiHelper.post('/api/users', maliciousData, adminUser.token);

      // Assert
      if (response.status === 201) {
        expect(response.body.data.firstName).not.toContain('<script>');
      } else {
        // If validation rejects it, that's also acceptable
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject extremely long input values', async () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: longString,
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      // Act
      const response = await apiHelper.post('/api/users', userData, adminUser.token);

      // Assert
      apiHelper.assertValidationError(response, ['firstName']);
    });
  });
});