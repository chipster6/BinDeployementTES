/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION SERVICE
 * ============================================================================
 *
 * Dedicated authentication service extracted from AuthController.
 * Handles all authentication business logic with proper separation of concerns.
 *
 * Responsibilities:
 * - User login and logout logic
 * - Token generation and validation
 * - MFA verification
 * - Session management coordination
 * - Authentication audit logging
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-18
 * Version: 1.0.0
 */

import { User, UserRole, UserStatus } from "@/models/User";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { SessionService } from "@/services/SessionService";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/middleware/auth";
import { maskSensitiveData } from "@/utils/encryption";
import { logger } from "@/utils/logger";
import {
  AuthenticationError,
  ValidationError,
  BadRequestError,
} from "@/middleware/errorHandler";

/**
 * Login request interface
 */
export interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

/**
 * Registration request interface
 */
export interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  organizationId?: string;
  gdprConsentGiven: boolean;
}

/**
 * Authentication result interface
 */
export interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    mfaEnabled: boolean;
    lastLoginAt: Date | null;
  };
  accessToken?: string;
  sessionId?: string;
  expiresIn?: string;
  requiresMFA?: boolean;
  error?: string;
}

/**
 * Password change request interface
 */
export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  sessionId?: string;
}

/**
 * Authentication context interface
 */
export interface AuthenticationContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

/**
 * Authentication Service
 */
export class AuthenticationService {
  /**
   * Authenticate user with email and password
   */
  public async authenticateUser(
    loginRequest: LoginRequest,
    context: AuthenticationContext = {}
  ): Promise<AuthenticationResult> {
    const { email, password, mfaToken, rememberMe = false, deviceFingerprint } = loginRequest;
    const { ipAddress, userAgent } = context;

    try {
      // Find user by email
      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        await this.logFailedAuthentication(null, "user_not_found", context);
        throw new AuthenticationError("Invalid credentials");
      }

      // Check account status
      if (user.status !== UserStatus.ACTIVE) {
        await this.logFailedAuthentication(user.id, "account_inactive", context);
        throw new AuthenticationError("Account is not active");
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        await this.logFailedAuthentication(user.id, "account_locked", context);
        throw new AuthenticationError(
          "Account is temporarily locked due to failed login attempts"
        );
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        await user.incrementFailedLoginAttempts();
        await this.logFailedAuthentication(user.id, "invalid_password", context);
        throw new AuthenticationError("Invalid credentials");
      }

      // Handle MFA if enabled
      if (user.mfa_enabled) {
        if (!mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            error: "MFA token required",
          };
        }

        const isValidMFA = user.verifyMfaToken(mfaToken);
        if (!isValidMFA) {
          await user.incrementFailedLoginAttempts();
          await this.logFailedAuthentication(user.id, "invalid_mfa", context);
          throw new AuthenticationError("Invalid MFA token");
        }
      }

      // Reset failed login attempts on successful authentication
      await user.resetFailedLoginAttempts();
      await user.updateLastLogin();

      // Create session
      const sessionData = await SessionService.createSession({
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        deviceFingerprint,
        rememberMe,
        mfaVerified: user.mfa_enabled ? true : false,
      });

      // Generate tokens
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: sessionData.id,
      });

      // Log successful authentication
      await this.logSuccessfulAuthentication(user.id, sessionData.id, context);

      logger.info("User authentication successful", {
        userId: user.id,
        email: maskSensitiveData(email),
        role: user.role,
        sessionId: sessionData.id,
        ipAddress,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          mfaEnabled: user.mfa_enabled,
          lastLoginAt: user.last_login_at,
        },
        accessToken,
        sessionId: sessionData.id,
        expiresIn: "15m",
      };
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error("Authentication service error", {
        email: maskSensitiveData(email),
        error: error instanceof Error ? error?.message : String(error),
        ipAddress,
      });

      throw new AuthenticationError("Authentication failed");
    }
  }

  /**
   * Register new user
   */
  public async registerUser(
    registrationRequest: RegistrationRequest,
    context: AuthenticationContext = {}
  ): Promise<AuthenticationResult> {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      phone,
      role = UserRole.CUSTOMER,
      organizationId,
      gdprConsentGiven,
    } = registrationRequest;

    try {
      // Validate password confirmation
      if (password !== confirmPassword) {
        throw new ValidationError("Password confirmation does not match");
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { email: email.toLowerCase() } 
      });
      
      if (existingUser) {
        throw new BadRequestError("User with this email already exists");
      }

      // Hash password
      const passwordHash = await User.hashPassword(password);

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        status: UserStatus.ACTIVE,
        organization_id: organizationId,
        gdpr_consent_given: gdprConsentGiven,
        gdpr_consent_date: gdprConsentGiven ? new Date() : undefined,
      });

      // Log user registration
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.CREATE,
        user.id,
        undefined,
        context.ipAddress,
        context.userAgent,
        undefined,
        { userRegistered: true, role },
      );

      logger.info("User registered successfully", {
        userId: user.id,
        email: maskSensitiveData(email),
        role,
        ipAddress: context.ipAddress,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          mfaEnabled: user.mfa_enabled,
          lastLoginAt: user.last_login_at,
        },
      };
    } catch (error: unknown) {
      logger.error("User registration failed", {
        email: maskSensitiveData(email),
        error: error instanceof Error ? error?.message : String(error),
        ipAddress: context.ipAddress,
      });

      if (error instanceof ValidationError || error instanceof BadRequestError) {
        throw error;
      }

      throw new BadRequestError("Registration failed");
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshAuthenticationToken(
    refreshToken: string,
    context: AuthenticationContext = {}
  ): Promise<{ accessToken: string; expiresIn: string }> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Get session data
      const sessionData = await SessionService.getSession(payload.sessionId);
      if (!sessionData) {
        throw new AuthenticationError("Invalid session");
      }

      // Get user
      const user = await User.findByPk(payload.userId);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new AuthenticationError("Invalid user");
      }

      // Generate new access token
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: sessionData.id,
      });

      // Update session activity
      await SessionService.updateSession(sessionData.sessionToken, {
        lastActivity: new Date(),
      });

      logger.info("Token refreshed successfully", {
        userId: user.id,
        sessionId: sessionData.id,
        ipAddress: context.ipAddress,
      });

      return {
        accessToken,
        expiresIn: "15m",
      };
    } catch (error: unknown) {
      logger.error("Token refresh failed", {
        error: error instanceof Error ? error?.message : String(error),
        ipAddress: context.ipAddress,
      });

      throw new AuthenticationError("Token refresh failed");
    }
  }

  /**
   * Logout user
   */
  public async logoutUser(
    userId: string,
    sessionId: string,
    context: AuthenticationContext = {}
  ): Promise<boolean> {
    try {
      await SessionService.deleteSession(sessionId);

      logger.info("User logout successful", {
        userId,
        sessionId,
        ipAddress: context.ipAddress,
      });

      return true;
    } catch (error: unknown) {
      logger.error("Logout failed", {
        userId,
        sessionId,
        error: error instanceof Error ? error?.message : String(error),
        ipAddress: context.ipAddress,
      });

      return false;
    }
  }

  /**
   * Logout user from all devices
   */
  public async logoutUserFromAllDevices(
    userId: string,
    currentSessionId?: string,
    context: AuthenticationContext = {}
  ): Promise<number> {
    try {
      const deletedCount = await SessionService.deleteUserSessions(
        userId,
        currentSessionId
      );

      logger.info("User logout from all devices", {
        userId,
        deletedSessions: deletedCount,
        ipAddress: context.ipAddress,
      });

      return deletedCount;
    } catch (error: unknown) {
      logger.error("Logout from all devices failed", {
        userId,
        error: error instanceof Error ? error?.message : String(error),
        ipAddress: context.ipAddress,
      });

      return 0;
    }
  }

  /**
   * Change user password
   */
  public async changeUserPassword(
    passwordRequest: PasswordChangeRequest,
    context: AuthenticationContext = {}
  ): Promise<boolean> {
    const { userId, currentPassword, newPassword, sessionId } = passwordRequest;

    try {
      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      // Verify current password
      const isValidCurrentPassword = await user.verifyPassword(currentPassword);
      if (!isValidCurrentPassword) {
        throw new AuthenticationError("Current password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await User.hashPassword(newPassword);

      // Update user password
      await user.update({
        password_hash: newPasswordHash,
        password_changed_at: new Date(),
      });

      // Log password change
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        sessionId,
        context.ipAddress,
        context.userAgent,
        undefined,
        { passwordChanged: true },
      );

      // Logout from all other devices for security
      await this.logoutUserFromAllDevices(userId, sessionId, context);

      logger.info("Password changed successfully", {
        userId,
        ipAddress: context.ipAddress,
      });

      return true;
    } catch (error: unknown) {
      logger.error("Password change failed", {
        userId,
        error: error instanceof Error ? error?.message : String(error),
        ipAddress: context.ipAddress,
      });

      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError("Password change failed");
    }
  }

  /**
   * Validate authentication session
   */
  public async validateSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await SessionService.getSession(sessionId);
      return !!sessionData;
    } catch (error: unknown) {
      logger.debug("Session validation failed", {
        sessionId,
        error: error instanceof Error ? error?.message : String(error),
      });
      return false;
    }
  }

  /**
   * Log successful authentication
   */
  private async logSuccessfulAuthentication(
    userId: string,
    sessionId: string,
    context: AuthenticationContext
  ): Promise<void> {
    try {
      await AuditLog.logDataAccess(
        "users",
        userId,
        AuditAction.LOGIN,
        userId,
        sessionId,
        context.ipAddress,
        context.userAgent,
        undefined,
        { loginSuccess: true, sessionId },
      );
    } catch (error: unknown) {
      logger.warn("Failed to log successful authentication", {
        userId,
        sessionId,
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Log failed authentication attempt
   */
  private async logFailedAuthentication(
    userId: string | null,
    reason: string,
    context: AuthenticationContext
  ): Promise<void> {
    try {
      await AuditLog.logDataAccess(
        "users",
        userId || "unknown",
        AuditAction.LOGIN,
        userId || "unknown",
        undefined,
        context.ipAddress,
        context.userAgent,
        undefined,
        { loginFailed: true, reason },
      );
    } catch (error: unknown) {
      logger.warn("Failed to log authentication failure", {
        userId,
        reason,
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }
}

// Singleton instance
export const authenticationService = new AuthenticationService();
export default AuthenticationService;