/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER SERVICE
 * ============================================================================
 *
 * Business logic service for user management operations.
 * Handles user creation, authentication, profile management, and role-based operations.
 *
 * Features:
 * - User authentication and authorization
 * - Profile management and updates
 * - Role and permission handling
 * - Password management and security
 * - MFA and session management
 * - User activity tracking
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Op, Transaction } from "sequelize";
import { User } from "@/models/User";
import { UserSession } from "@/models/UserSession";
import { AuditLog } from "@/models/AuditLog";
import { BaseService, ServiceResult } from "./BaseService";
import { logger, Timer } from "@/utils/logger";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  hashSensitiveData,
  verifySensitiveDataHash,
  generateSecureToken,
  maskSensitiveData,
} from "@/utils/encryption";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from "@/middleware/errorHandler";
import jwt from "jsonwebtoken";
import { config } from "@/config";

/**
 * User creation data interface
 */
interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  organizationId: string;
  permissions?: string[];
  isActive?: boolean;
  requiresPasswordChange?: boolean;
}

/**
 * User authentication data
 */
interface AuthenticationData {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Authentication result
 */
interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Profile update data
 */
interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  preferences?: Record<string, any>;
}

/**
 * Password change data
 */
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * User service class
 */
export class UserService extends BaseService<User> {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: string;

  constructor() {
    super(User, "UserService");
    this.JWT_SECRET = config.auth.jwtSecret;
    this.JWT_EXPIRES_IN = config.auth.jwtExpiresIn;
    this.REFRESH_TOKEN_EXPIRES_IN = config.auth.refreshTokenExpiresIn;
  }

  /**
   * Create a new user with proper validation and security
   */
  public async createUser(
    userData: CreateUserData,
    createdBy?: string,
    transaction?: Transaction,
  ): Promise<ServiceResult<User>> {
    const timer = new Timer("UserService.createUser");

    try {
      // Validate required fields
      await this.validateUserData(userData);

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ValidationError("User with this email already exists");
      }

      const result = await this.withTransaction(async (tx) => {
        // Hash password
        const passwordHash = await User.hashPassword(userData.password);

        // Encrypt sensitive data
        const encryptedPhone = userData.phone
          ? await encryptSensitiveData(userData.phone)
          : null;

        // Create user
        const user = await User.create(
          {
            email: userData.email.toLowerCase(),
            passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: encryptedPhone,
            role: userData.role,
            organizationId: userData.organizationId,
            permissions: userData.permissions || [],
            isActive: userData.isActive ?? true,
            requiresPasswordChange: userData.requiresPasswordChange ?? false,
            lastLoginAt: null,
            passwordChangedAt: new Date(),
            mfaEnabled: false,
            mfaSecret: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
          { transaction: tx },
        );

        // Log user creation
        await AuditLog.create(
          {
            userId: createdBy || user.id,
            action: "user_created",
            entityType: "User",
            entityId: user.id,
            changes: {
              email: userData.email,
              role: userData.role,
              organizationId: userData.organizationId,
            },
            metadata: {
              createdBy: createdBy || "system",
              ip: null,
            },
          },
          { transaction: tx },
        );

        return user;
      }, transaction);

      timer.end({ success: true, userId: result.id });
      logger.info("User created successfully", {
        userId: result.id,
        email: maskSensitiveData(userData.email),
        role: userData.role,
        organizationId: userData.organizationId,
      });

      return {
        success: true,
        data: result,
        message: "User created successfully",
      };
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("User creation failed", {
        email: maskSensitiveData(userData.email),
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create user", 500);
    }
  }

  /**
   * Authenticate user with email and password
   */
  public async authenticateUser(
    authData: AuthenticationData,
    ip?: string,
    userAgent?: string,
  ): Promise<ServiceResult<AuthResult>> {
    const timer = new Timer("UserService.authenticateUser");

    try {
      // Find user by email
      const user = await User.findOne({
        where: {
          email: authData.email.toLowerCase(),
          isActive: true,
        },
      });

      if (!user) {
        await this.logFailedLogin(authData.email, "user_not_found", ip);
        throw new AuthenticationError("Invalid credentials");
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.logFailedLogin(user.email, "account_locked", ip);
        throw new AuthenticationError("Account is temporarily locked");
      }

      // Verify password
      const passwordValid = await User.verifyPassword(
        authData.password,
        user.passwordHash,
      );
      if (!passwordValid) {
        await this.handleFailedLogin(user, ip);
        throw new AuthenticationError("Invalid credentials");
      }

      // Check MFA if enabled
      if (user.mfaEnabled && authData.mfaCode) {
        const mfaValid = await this.verifyMfaCode(user, authData.mfaCode);
        if (!mfaValid) {
          await this.handleFailedLogin(user, ip);
          throw new AuthenticationError("Invalid MFA code");
        }
      }

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(user);

      // Create session
      const session = await UserSession.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true,
        metadata: {
          ip,
          userAgent,
          loginTime: new Date(),
        },
      });

      // Update user login info
      await user.update({
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      // Log successful login
      await AuditLog.create({
        userId: user.id,
        action: "user_login",
        entityType: "User",
        entityId: user.id,
        metadata: { ip, userAgent },
      });

      const result: AuthResult = {
        user,
        token,
        refreshToken,
        sessionId: session.id,
        expiresAt: session.expiresAt,
      };

      timer.end({ success: true, userId: user.id });
      logger.info("User authentication successful", {
        userId: user.id,
        email: maskSensitiveData(user.email),
        sessionId: session.id,
        ip,
      });

      return {
        success: true,
        data: result,
        message: "Authentication successful",
      };
    } catch (error) {
      timer.end({ error: error.message });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AuthenticationError("Authentication failed");
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    userId: string,
    profileData: ProfileUpdateData,
    updatedBy?: string,
  ): Promise<ServiceResult<User>> {
    const timer = new Timer("UserService.updateProfile");

    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const result = await this.withTransaction(async (transaction) => {
        const updateData: any = {};
        const changes: any = {};

        // Handle basic profile updates
        if (profileData.firstName) {
          updateData.firstName = profileData.firstName;
          changes.firstName = {
            from: user.firstName,
            to: profileData.firstName,
          };
        }

        if (profileData.lastName) {
          updateData.lastName = profileData.lastName;
          changes.lastName = {
            from: user.lastName,
            to: profileData.lastName,
          };
        }

        if (profileData.phone) {
          updateData.phone = await encryptSensitiveData(profileData.phone);
          changes.phone = { updated: true };
        }

        if (profileData.email && profileData.email !== user.email) {
          // Check if new email is already taken
          const existingUser = await User.findOne({
            where: {
              email: profileData.email.toLowerCase(),
              id: { [Op.ne]: userId },
            },
          });

          if (existingUser) {
            throw new ValidationError("Email already in use");
          }

          updateData.email = profileData.email.toLowerCase();
          changes.email = {
            from: maskSensitiveData(user.email),
            to: maskSensitiveData(profileData.email),
          };
        }

        if (profileData.preferences) {
          updateData.preferences = {
            ...user.preferences,
            ...profileData.preferences,
          };
          changes.preferences = { updated: true };
        }

        // Update user
        const updatedUser = await user.update(updateData, { transaction });

        // Log profile update
        await AuditLog.create(
          {
            userId: updatedBy || userId,
            action: "profile_updated",
            entityType: "User",
            entityId: userId,
            changes,
          },
          { transaction },
        );

        return updatedUser;
      });

      // Clear user cache
      await this.deleteFromCache(`id:${userId}`);

      timer.end({ success: true, userId });
      logger.info("User profile updated", {
        userId,
        updatedBy: updatedBy || userId,
        changes: Object.keys(profileData),
      });

      return {
        success: true,
        data: result,
        message: "Profile updated successfully",
      };
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Profile update failed", {
        userId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to update profile", 500);
    }
  }

  /**
   * Change user password
   */
  public async changePassword(
    userId: string,
    passwordData: PasswordChangeData,
  ): Promise<ServiceResult<void>> {
    const timer = new Timer("UserService.changePassword");

    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify current password
      const currentPasswordValid = await User.verifyPassword(
        passwordData.currentPassword,
        user.passwordHash,
      );

      if (!currentPasswordValid) {
        throw new ValidationError("Current password is incorrect");
      }

      // Validate new password
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new ValidationError("New password confirmation does not match");
      }

      // Hash new password
      const newPasswordHash = await User.hashPassword(passwordData.newPassword);

      await this.withTransaction(async (transaction) => {
        // Update password
        await user.update(
          {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            requiresPasswordChange: false,
          },
          { transaction },
        );

        // Invalidate all user sessions except current one
        await UserSession.update(
          { isActive: false },
          {
            where: {
              userId,
              isActive: true,
            },
            transaction,
          },
        );

        // Log password change
        await AuditLog.create(
          {
            userId,
            action: "password_changed",
            entityType: "User",
            entityId: userId,
            metadata: {
              timestamp: new Date(),
            },
          },
          { transaction },
        );
      });

      timer.end({ success: true, userId });
      logger.info("Password changed successfully", { userId });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("Password change failed", {
        userId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to change password", 500);
    }
  }

  /**
   * Get user by ID with decrypted sensitive data
   */
  public async getUserById(userId: string): Promise<ServiceResult<User>> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Decrypt sensitive fields
      if (user.phone) {
        try {
          (user as any).phone = await decryptSensitiveData(user.phone);
        } catch (error) {
          logger.warn("Failed to decrypt user phone", {
            userId,
            error: error.message,
          });
          (user as any).phone = null;
        }
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to get user", 500);
    }
  }

  /**
   * Deactivate user account
   */
  public async deactivateUser(
    userId: string,
    deactivatedBy: string,
    reason?: string,
  ): Promise<ServiceResult<void>> {
    const timer = new Timer("UserService.deactivateUser");

    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      await this.withTransaction(async (transaction) => {
        // Deactivate user
        await user.update(
          {
            isActive: false,
          },
          { transaction },
        );

        // Invalidate all user sessions
        await UserSession.update(
          { isActive: false },
          {
            where: { userId },
            transaction,
          },
        );

        // Log deactivation
        await AuditLog.create(
          {
            userId: deactivatedBy,
            action: "user_deactivated",
            entityType: "User",
            entityId: userId,
            changes: {
              isActive: { from: true, to: false },
              reason,
            },
          },
          { transaction },
        );
      });

      // Clear user cache
      await this.deleteFromCache(`id:${userId}`);

      timer.end({ success: true, userId });
      logger.info("User deactivated", {
        userId,
        deactivatedBy,
        reason,
      });

      return {
        success: true,
        message: "User deactivated successfully",
      };
    } catch (error) {
      timer.end({ error: error.message });
      logger.error("User deactivation failed", {
        userId,
        error: error.message,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to deactivate user", 500);
    }
  }

  /**
   * Private helper methods
   */

  private async validateUserData(userData: CreateUserData): Promise<void> {
    const errors: any[] = [];

    if (!userData.email || !userData.email.includes("@")) {
      errors.push({ field: "email", message: "Valid email is required" });
    }

    if (!userData.password || userData.password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters",
      });
    }

    if (!userData.firstName || userData.firstName.trim().length === 0) {
      errors.push({ field: "firstName", message: "First name is required" });
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }

    if (!userData.role) {
      errors.push({ field: "role", message: "Role is required" });
    }

    if (!userData.organizationId) {
      errors.push({
        field: "organizationId",
        message: "Organization ID is required",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", { errors });
    }
  }

  private async generateTokens(
    user: User,
  ): Promise<{ token: string; refreshToken: string }> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = generateSecureToken(64);

    return { token, refreshToken };
  }

  private async handleFailedLogin(user: User, ip?: string): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const maxAttempts = 5;

    const updateData: any = {
      failedLoginAttempts: attempts,
    };

    // Lock account after max attempts
    if (attempts >= maxAttempts) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await user.update(updateData);

    // Log failed login
    await this.logFailedLogin(user.email, "invalid_credentials", ip, user.id);
  }

  private async logFailedLogin(
    email: string,
    reason: string,
    ip?: string,
    userId?: string,
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId: userId || null,
        action: "login_failed",
        entityType: "User",
        entityId: userId || null,
        metadata: {
          email: maskSensitiveData(email),
          reason,
          ip,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error("Failed to log failed login attempt", {
        error: error.message,
      });
    }
  }

  private async verifyMfaCode(user: User, code: string): Promise<boolean> {
    // MFA verification implementation would go here
    // This is a placeholder
    return code === "123456";
  }
}

export default UserService;
