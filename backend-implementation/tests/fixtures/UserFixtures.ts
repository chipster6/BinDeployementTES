/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER TEST FIXTURES
 * ============================================================================
 *
 * Test fixtures and factory functions for User model testing.
 * Provides realistic mock data and helper functions.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Transaction } from 'sequelize';
import { User, UserRole, UserStatus } from '@/models/User';
import bcrypt from 'bcrypt';

export interface UserTestData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  organizationId?: string;
  mfaEnabled?: boolean;
  isActive?: boolean;
  requiresPasswordChange?: boolean;
}

export class UserFixtures {
  private counter = 1;

  /**
   * Generate user test data with optional overrides
   */
  public getUserData(overrides: UserTestData = {}): any {
    const index = this.counter++;
    
    return {
      email: overrides.email || `test.user${index}@example.com`,
      password: overrides.password || 'TestPassword123!',
      firstName: overrides.firstName || `TestUser${index}`,
      lastName: overrides.lastName || `LastName${index}`,
      phone: overrides.phone || `+1555123${String(index).padStart(4, '0')}`,
      role: overrides.role || UserRole.CUSTOMER,
      status: overrides.status || UserStatus.ACTIVE,
      organizationId: overrides.organizationId || this.generateUUID(),
      mfaEnabled: overrides.mfaEnabled || false,
      isActive: overrides.isActive ?? true,
      requiresPasswordChange: overrides.requiresPasswordChange || false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      gdprConsentGiven: true,
      gdprConsentDate: new Date(),
      dataRetentionUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
    };
  }

  /**
   * Create a user with hashed password
   */
  public async createUser(userData: UserTestData = {}, transaction?: Transaction): Promise<User> {
    const data = this.getUserData(userData);
    
    // Hash the password
    const saltRounds = 4; // Lower for faster tests
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await User.create({
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      role: data.role,
      status: data.status,
      mfa_enabled: data.mfaEnabled,
      password_changed_at: data.passwordChangedAt,
      failed_login_attempts: data.failedLoginAttempts,
      locked_until: data.lockedUntil,
      last_login_at: data.lastLoginAt,
      gdpr_consent_given: data.gdprConsentGiven,
      gdpr_consent_date: data.gdprConsentDate,
      data_retention_until: data.dataRetentionUntil,
    }, { transaction });

    // Store the original password for testing
    (user as any).originalPassword = data.password;
    
    return user;
  }

  /**
   * Create multiple users
   */
  public async createUsers(
    count: number,
    baseData: UserTestData = {},
    transaction?: Transaction
  ): Promise<User[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser(baseData, transaction);
      users.push(user);
    }
    return users;
  }

  /**
   * Create a user with specific role
   */
  public async createUserWithRole(
    role: UserRole,
    organizationId?: string,
    transaction?: Transaction
  ): Promise<User> {
    return this.createUser({ role, organizationId }, transaction);
  }

  /**
   * Create an admin user
   */
  public async createAdminUser(
    organizationId?: string,
    transaction?: Transaction
  ): Promise<User> {
    return this.createUser({
      role: UserRole.ADMIN,
      email: 'admin@test.com',
      organizationId,
    }, transaction);
  }

  /**
   * Create a driver user
   */
  public async createDriverUser(
    organizationId?: string,
    transaction?: Transaction
  ): Promise<User> {
    return this.createUser({
      role: UserRole.DRIVER,
      email: `driver${this.counter}@test.com`,
      organizationId,
    }, transaction);
  }

  /**
   * Create a customer user
   */
  public async createCustomerUser(
    organizationId?: string,
    transaction?: Transaction
  ): Promise<User> {
    return this.createUser({
      role: UserRole.CUSTOMER,
      email: `customer${this.counter}@test.com`,
      organizationId,
    }, transaction);
  }

  /**
   * Create a locked user
   */
  public async createLockedUser(transaction?: Transaction): Promise<User> {
    return this.createUser({
      status: UserStatus.LOCKED,
      lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      failedLoginAttempts: 5,
    }, transaction);
  }

  /**
   * Create a user with MFA enabled
   */
  public async createMfaUser(transaction?: Transaction): Promise<User> {
    const user = await this.createUser({
      mfaEnabled: true,
    }, transaction);

    // Generate MFA secret
    user.generateMfaSecret();
    await user.save({ transaction });

    return user;
  }

  /**
   * Create test data for authentication scenarios
   */
  public getAuthTestScenarios(): {
    validUser: UserTestData;
    invalidEmail: UserTestData;
    invalidPassword: UserTestData;
    lockedUser: UserTestData;
    inactiveUser: UserTestData;
  } {
    return {
      validUser: {
        email: 'valid@test.com',
        password: 'ValidPassword123!',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      invalidEmail: {
        email: 'invalid-email',
        password: 'ValidPassword123!',
      },
      invalidPassword: {
        email: 'valid@test.com',
        password: 'short',
      },
      lockedUser: {
        email: 'locked@test.com',
        password: 'ValidPassword123!',
        status: UserStatus.LOCKED,
      },
      inactiveUser: {
        email: 'inactive@test.com',
        password: 'ValidPassword123!',
        status: UserStatus.INACTIVE,
      },
    };
  }

  /**
   * Get password validation test cases
   */
  public getPasswordTestCases(): Array<{ password: string; valid: boolean; description: string }> {
    return [
      { password: 'ValidPass123!', valid: true, description: 'Valid password' },
      { password: 'short', valid: false, description: 'Too short' },
      { password: '', valid: false, description: 'Empty password' },
      { password: 'nouppercase123!', valid: true, description: 'No uppercase (but still valid)' },
      { password: 'NOLOWERCASE123!', valid: true, description: 'No lowercase (but still valid)' },
      { password: 'NoNumbers!', valid: true, description: 'No numbers (but still valid)' },
      { password: 'NoSpecialChars123', valid: true, description: 'No special chars (but still valid)' },
      { password: 'VeryLongPasswordThatExceedsReasonableLimits123!@#$%^&*()_+-=[]{}|;:,.<>?', valid: true, description: 'Very long password' },
    ];
  }

  /**
   * Get role permission test data
   */
  public getRoleTestData(): Array<{
    role: UserRole;
    resource: string;
    action: string;
    allowed: boolean;
  }> {
    return [
      { role: UserRole.SUPER_ADMIN, resource: 'users', action: 'delete', allowed: true },
      { role: UserRole.ADMIN, resource: 'users', action: 'create', allowed: true },
      { role: UserRole.ADMIN, resource: 'users', action: 'delete', allowed: false },
      { role: UserRole.DISPATCHER, resource: 'routes', action: 'update', allowed: true },
      { role: UserRole.DISPATCHER, resource: 'users', action: 'create', allowed: false },
      { role: UserRole.DRIVER, resource: 'routes', action: 'read', allowed: true },
      { role: UserRole.DRIVER, resource: 'customers', action: 'create', allowed: false },
      { role: UserRole.CUSTOMER, resource: 'invoices', action: 'read', allowed: true },
      { role: UserRole.CUSTOMER, resource: 'users', action: 'create', allowed: false },
    ];
  }

  /**
   * Cleanup all test users
   */
  public async cleanup(transaction?: Transaction): Promise<void> {
    await User.destroy({
      where: {},
      force: true, // Hard delete for tests
      transaction,
    });
  }

  /**
   * Reset counter for consistent test data
   */
  public resetCounter(): void {
    this.counter = 1;
  }

  /**
   * Generate a mock UUID for testing
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default UserFixtures;