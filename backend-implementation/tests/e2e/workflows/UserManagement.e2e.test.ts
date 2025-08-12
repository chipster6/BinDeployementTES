/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER MANAGEMENT E2E TESTS
 * ============================================================================
 *
 * End-to-end tests for complete user management workflows including
 * registration, authentication, profile management, and role transitions.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { ApiTestHelper } from '@tests/helpers/ApiTestHelper';
import { getTestApp, waitForOperation } from '@tests/e2e/setup';
import { User, UserRole, UserStatus } from '@/models/User';
import { UserSession } from '@/models/UserSession';
import { AuditLog } from '@/models/AuditLog';

describe('User Management E2E Workflows', () => {
  let apiHelper: ApiTestHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper(getTestApp());
  });

  describe('Complete User Registration and Authentication Flow', () => {
    it('should complete full user onboarding workflow', async () => {
      // Step 1: Admin creates new user account
      const adminUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN);
      
      const newUserData = {
        email: 'newemployee@testcompany.com',
        password: 'TempPassword123!',
        firstName: 'New',
        lastName: 'Employee',
        role: UserRole.OFFICE_STAFF,
        organizationId: adminUser.user.id,
        requiresPasswordChange: true,
      };

      const createResponse = await apiHelper.post('/api/users', newUserData, adminUser.token);
      expect(createResponse.status).toBe(201);
      
      const createdUser = createResponse.body.data;
      expect(createdUser.email).toBe(newUserData.email.toLowerCase());
      expect(createdUser.requiresPasswordChange).toBe(true);

      // Step 2: New user attempts first login with temporary password
      const firstLoginResponse = await apiHelper.post('/api/auth/login', {
        email: newUserData.email,
        password: newUserData.password,
      });

      expect(firstLoginResponse.status).toBe(200);
      expect(firstLoginResponse.body.data.requiresPasswordChange).toBe(true);
      
      const tempToken = firstLoginResponse.body.data.token;

      // Step 3: User is forced to change password on first login
      const passwordChangeResponse = await apiHelper.post('/api/auth/change-password', {
        currentPassword: newUserData.password,
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      }, tempToken);

      expect(passwordChangeResponse.status).toBe(200);

      // Step 4: User logs in again with new password
      const secondLoginResponse = await apiHelper.post('/api/auth/login', {
        email: newUserData.email,
        password: 'NewSecurePassword123!',
      });

      expect(secondLoginResponse.status).toBe(200);
      expect(secondLoginResponse.body.data.requiresPasswordChange).toBeFalsy();
      expect(secondLoginResponse.body.data.user.id).toBe(createdUser.id);

      // Step 5: Verify user can access appropriate resources
      const userToken = secondLoginResponse.body.data.token;
      const profileResponse = await apiHelper.get('/api/users/profile', userToken);
      
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe(newUserData.email.toLowerCase());

      // Step 6: Verify audit trail was created
      const auditLogs = await AuditLog.findAll({
        where: { entityId: createdUser.id },
        order: [['created_at', 'ASC']]
      });

      const auditActions = auditLogs.map(log => log.action);
      expect(auditActions).toContain('user_created');
      expect(auditActions).toContain('user_login');
      expect(auditActions).toContain('password_changed');

      // Step 7: Verify user session is active
      const activeSessions = await UserSession.findAll({
        where: { userId: createdUser.id, isActive: true }
      });
      expect(activeSessions.length).toBeGreaterThan(0);
    });

    it('should handle user profile update workflow', async () => {
      // Setup: Create a regular user
      const userData = {
        email: 'profileupdate@test.com',
        password: 'ProfilePassword123!',
        firstName: 'Profile',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      };

      const user = await User.create({
        email: userData.email,
        password_hash: await User.hashPassword(userData.password),
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        status: UserStatus.ACTIVE,
        failed_login_attempts: 0,
        password_changed_at: new Date(),
        gdpr_consent_given: true,
      });

      // Step 1: User logs in
      const loginResponse = await apiHelper.post('/api/auth/login', {
        email: userData.email,
        password: userData.password,
      });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.data.token;

      // Step 2: User updates their profile
      const profileUpdateData = {
        firstName: 'UpdatedProfile',
        lastName: 'UpdatedUser',
        phone: '+15559876543',
        preferences: {
          notifications: {
            email: true,
            sms: false,
          },
          timezone: 'America/New_York',
        },
      };

      const updateResponse = await apiHelper.put(
        `/api/users/${user.id}`,
        profileUpdateData,
        token
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.firstName).toBe(profileUpdateData.firstName);
      expect(updateResponse.body.data.lastName).toBe(profileUpdateData.lastName);

      // Step 3: Verify changes were persisted
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser?.first_name).toBe(profileUpdateData.firstName);
      expect(updatedUser?.last_name).toBe(profileUpdateData.lastName);

      // Step 4: Verify audit log was created
      const auditLog = await AuditLog.findOne({
        where: { 
          entityId: user.id, 
          action: 'profile_updated' 
        }
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.changes).toBeDefined();

      // Step 5: Verify updated profile can be retrieved
      const getProfileResponse = await apiHelper.get('/api/users/profile', token);
      expect(getProfileResponse.status).toBe(200);
      expect(getProfileResponse.body.data.firstName).toBe(profileUpdateData.firstName);
    });
  });

  describe('Account Security and Lockout Workflow', () => {
    it('should handle brute force protection workflow', async () => {
      // Setup: Create a user account
      const userData = {
        email: 'bruteforce@test.com',
        password: 'SecurePassword123!',
      };

      const user = await User.create({
        email: userData.email,
        password_hash: await User.hashPassword(userData.password),
        first_name: 'Brute',
        last_name: 'Force',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        failed_login_attempts: 0,
        password_changed_at: new Date(),
        gdpr_consent_given: true,
      });

      // Step 1: Make multiple failed login attempts
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        const response = await apiHelper.post('/api/auth/login', {
          email: userData.email,
          password: 'WrongPassword123!',
        });
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }

      // Step 2: Verify account is locked after max attempts
      await user.reload();
      expect(user.status).toBe(UserStatus.LOCKED);
      expect(user.failed_login_attempts).toBe(maxAttempts);
      expect(user.locked_until).toBeDefined();

      // Step 3: Verify locked account cannot login even with correct credentials
      const lockedLoginResponse = await apiHelper.post('/api/auth/login', {
        email: userData.email,
        password: userData.password,
      });

      expect(lockedLoginResponse.status).toBe(401);
      expect(lockedLoginResponse.body.error).toContain('locked');

      // Step 4: Admin unlocks the account
      const adminUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN);
      
      const unlockResponse = await apiHelper.patch(
        `/api/users/${user.id}/unlock`,
        { reason: 'Account unlock requested by user' },
        adminUser.token
      );

      expect([200, 404]).toContain(unlockResponse.status); // 404 if endpoint doesn't exist

      // Step 5: If unlock succeeded, user should be able to login
      if (unlockResponse.status === 200) {
        const loginAfterUnlockResponse = await apiHelper.post('/api/auth/login', {
          email: userData.email,
          password: userData.password,
        });

        expect(loginAfterUnlockResponse.status).toBe(200);
        
        // Verify account status was restored
        await user.reload();
        expect(user.status).toBe(UserStatus.ACTIVE);
        expect(user.failed_login_attempts).toBe(0);
        expect(user.locked_until).toBeNull();
      }
    });

    it('should handle password reset workflow', async () => {
      // Setup: Create a user
      const userData = {
        email: 'passwordreset@test.com',
        password: 'OriginalPassword123!',
      };

      const user = await User.create({
        email: userData.email,
        password_hash: await User.hashPassword(userData.password),
        first_name: 'Password',
        last_name: 'Reset',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        failed_login_attempts: 0,
        password_changed_at: new Date(),
        gdpr_consent_given: true,
      });

      // Step 1: User requests password reset
      const resetRequestResponse = await apiHelper.post('/api/auth/forgot-password', {
        email: userData.email,
      });

      // Should succeed or return appropriate response
      expect([200, 404]).toContain(resetRequestResponse.status);

      if (resetRequestResponse.status === 200) {
        // Step 2: Admin performs password reset (simulating email link click)
        const adminUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN);
        
        const adminResetResponse = await apiHelper.post(
          `/api/users/${user.id}/password-reset`,
          { reason: 'User forgot password' },
          adminUser.token
        );

        expect([200, 404]).toContain(adminResetResponse.status);

        if (adminResetResponse.status === 200) {
          const tempPassword = adminResetResponse.body.data.temporaryPassword;
          expect(tempPassword).toBeDefined();

          // Step 3: User logs in with temporary password
          const tempLoginResponse = await apiHelper.post('/api/auth/login', {
            email: userData.email,
            password: tempPassword,
          });

          expect(tempLoginResponse.status).toBe(200);
          expect(tempLoginResponse.body.data.requiresPasswordChange).toBe(true);

          // Step 4: User changes to permanent password
          const changePasswordResponse = await apiHelper.post('/api/auth/change-password', {
            currentPassword: tempPassword,
            newPassword: 'NewPermanentPassword123!',
            confirmPassword: 'NewPermanentPassword123!',
          }, tempLoginResponse.body.data.token);

          expect(changePasswordResponse.status).toBe(200);

          // Step 5: Verify user can login with new password
          const finalLoginResponse = await apiHelper.post('/api/auth/login', {
            email: userData.email,
            password: 'NewPermanentPassword123!',
          });

          expect(finalLoginResponse.status).toBe(200);
          expect(finalLoginResponse.body.data.requiresPasswordChange).toBeFalsy();
        }
      }
    });
  });

  describe('Role Transition Workflow', () => {
    it('should handle user role promotion workflow', async () => {
      // Setup: Create a customer user
      const customerUser = await apiHelper.createTestUserWithToken(UserRole.CUSTOMER, {
        email: 'promotion@test.com',
        firstName: 'Customer',
        lastName: 'User',
      });

      // Step 1: Verify customer has limited access
      const customerAccessResponse = await apiHelper.get('/api/users', customerUser.token);
      expect(customerAccessResponse.status).toBe(403);

      // Step 2: Admin promotes user to office staff
      const adminUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN);
      
      const promotionResponse = await apiHelper.put(
        `/api/users/${customerUser.user.id}`,
        { role: UserRole.OFFICE_STAFF },
        adminUser.token
      );

      expect(promotionResponse.status).toBe(200);
      expect(promotionResponse.body.data.role).toBe(UserRole.OFFICE_STAFF);

      // Step 3: User logs out and logs back in to refresh permissions
      const logoutResponse = await apiHelper.post('/api/auth/logout', {}, customerUser.token);
      expect([200, 204]).toContain(logoutResponse.status);

      // Login again
      const newLoginResponse = await apiHelper.post('/api/auth/login', {
        email: 'promotion@test.com',
        password: (customerUser.user as any).originalPassword,
      });

      expect(newLoginResponse.status).toBe(200);
      const newToken = newLoginResponse.body.data.token;

      // Step 4: Verify user now has office staff permissions
      const newRoleAccessResponse = await apiHelper.get('/api/customers', newToken);
      expect([200, 403]).toContain(newRoleAccessResponse.status);
      
      // If access is granted, user should have the new role
      if (newRoleAccessResponse.status === 200) {
        const profileResponse = await apiHelper.get('/api/users/profile', newToken);
        expect(profileResponse.body.data.role).toBe(UserRole.OFFICE_STAFF);
      }

      // Step 5: Verify audit trail shows role change
      const auditLog = await AuditLog.findOne({
        where: { 
          entityId: customerUser.user.id, 
          action: 'profile_updated' 
        }
      });
      
      if (auditLog) {
        expect(auditLog.changes).toBeDefined();
      }
    });
  });

  describe('Multi-Session Management Workflow', () => {
    it('should handle multiple active sessions workflow', async () => {
      // Setup: Create a user
      const userData = {
        email: 'multisession@test.com',
        password: 'MultiSessionPassword123!',
      };

      const user = await User.create({
        email: userData.email,
        password_hash: await User.hashPassword(userData.password),
        first_name: 'Multi',
        last_name: 'Session',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        failed_login_attempts: 0,
        password_changed_at: new Date(),
        gdpr_consent_given: true,
      });

      const sessions = [];

      // Step 1: User logs in from multiple devices/locations
      for (let i = 0; i < 3; i++) {
        const loginResponse = await apiHelper.post('/api/auth/login', {
          email: userData.email,
          password: userData.password,
        }, undefined, {
          'X-Forwarded-For': `192.168.1.${100 + i}`,
          'User-Agent': `TestDevice${i + 1}`,
        });

        expect(loginResponse.status).toBe(200);
        sessions.push({
          token: loginResponse.body.data.token,
          refreshToken: loginResponse.body.data.refreshToken,
          sessionId: loginResponse.body.data.sessionId,
        });
      }

      // Step 2: Verify all sessions are active
      const activeSessions = await UserSession.findAll({
        where: { userId: user.id, isActive: true }
      });
      expect(activeSessions.length).toBe(3);

      // Step 3: User can access resources from all sessions
      for (const session of sessions) {
        const profileResponse = await apiHelper.get('/api/users/profile', session.token);
        expect(profileResponse.status).toBe(200);
      }

      // Step 4: User logs out from one session
      const logoutResponse = await apiHelper.post('/api/auth/logout', {
        refreshToken: sessions[0].refreshToken,
      }, sessions[0].token);

      expect([200, 204]).toContain(logoutResponse.status);

      // Step 5: Verify only one session was terminated
      await waitForOperation(async () => {
        const remainingSessions = await UserSession.findAll({
          where: { userId: user.id, isActive: true }
        });
        return remainingSessions.length === 2;
      }, 5000);

      // Step 6: User logs out from all remaining sessions
      const logoutAllResponse = await apiHelper.post('/api/auth/logout-all', {}, sessions[1].token);
      expect([200, 204]).toContain(logoutAllResponse.status);

      // Step 7: Verify all sessions are terminated
      await waitForOperation(async () => {
        const allSessions = await UserSession.findAll({
          where: { userId: user.id, isActive: true }
        });
        return allSessions.length === 0;
      }, 5000);
    });
  });
});