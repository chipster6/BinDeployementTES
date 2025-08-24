/**
 * ============================================================================
 * USER PROFILE SERVICE
 * ============================================================================
 * 
 * Dedicated service for user profile operations extracted from AuthController.
 * Handles profile management, user sessions, and account information.
 * 
 * Features:
 * - User profile retrieval and updates
 * - Session management and monitoring
 * - Account information management
 * - User preferences and settings
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

import { User, UserStatus } from "@/models/User";
import { UserSession } from "@/models/UserSession";
import { SessionService } from "@/services/SessionService";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { logger } from "@/utils/logger";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "@/middleware/errorHandler";

/**
 * User profile data interface
 */
export interface UserProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile update request interface
 */
export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

/**
 * Session information interface
 */
export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  locationCountry?: string;
  locationCity?: string;
  createdAt: Date;
  lastActivity: Date;
  isCurrent: boolean;
}

/**
 * Profile Service class
 */
export class ProfileService {
  /**
   * Get user profile by ID
   */
  public async getUserProfile(userId: string): Promise<UserProfileData> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at,
        passwordChangedAt: user.password_changed_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error: unknown) {
      logger.error("Failed to get user profile", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new AuthenticationError("Failed to retrieve user profile");
    }
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(
    userId: string,
    profileData: ProfileUpdateRequest,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserProfileData> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Store original values for audit
      const originalData = {
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        email: user.email,
      };

      // Validate email uniqueness if changing
      if (profileData.email && profileData.email !== user.email) {
        const existingUser = await User.findOne({ 
          where: { email: profileData.email.toLowerCase() } 
        });
        
        if (existingUser) {
          throw new ValidationError("Email address is already in use");
        }
      }

      // Update user profile
      await user.update({
        first_name: profileData.firstName || user.first_name,
        last_name: profileData.lastName || user.last_name,
        phone: profileData.phone || user.phone,
        email: profileData.email?.toLowerCase() || user.email,
      });

      // Log profile update
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        sessionId,
        ipAddress,
        userAgent,
        undefined,
        {
          profileUpdated: true,
          changes: profileData,
          originalData,
        }
      );

      logger.info("User profile updated", {
        userId,
        changes: Object.keys(profileData),
        ipAddress,
      });

      return this.getUserProfile(userId);
    } catch (error: unknown) {
      logger.error("Failed to update user profile", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new AuthenticationError("Failed to update user profile");
    }
  }

  /**
   * Get user sessions
   */
  public async getUserSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<SessionInfo[]> {
    try {
      const sessions = await SessionService.getUserSessions(userId);

      return sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        locationCountry: session.locationCountry,
        locationCity: session.locationCity,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isCurrent: session.id === currentSessionId,
      }));
    } catch (error: unknown) {
      logger.error("Failed to get user sessions", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AuthenticationError("Failed to retrieve user sessions");
    }
  }

  /**
   * Revoke specific session
   */
  public async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Verify session belongs to user
      const session = await UserSession.findOne({
        where: {
          id: sessionId,
          userId: userId,
        },
      });

      if (!session) {
        throw new AuthorizationError("Session not found or access denied");
      }

      // Prevent user from revoking their current session through this method
      if (sessionId === currentSessionId) {
        throw new ValidationError("Cannot revoke current session");
      }

      // Delete session
      await SessionService.deleteSession(session.sessionToken);

      logger.info("Session revoked successfully", {
        userId,
        revokedSessionId: sessionId,
        ipAddress,
      });

      return true;
    } catch (error: unknown) {
      logger.error("Failed to revoke session", {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        throw error;
      }

      throw new AuthenticationError("Failed to revoke session");
    }
  }

  /**
   * Get account security summary
   */
  public async getSecuritySummary(userId: string): Promise<{
    mfaEnabled: boolean;
    activeSessions: number;
    lastPasswordChange?: Date;
    lastLogin?: Date;
    accountCreated: Date;
    accountStatus: UserStatus;
  }> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const activeSessions = await UserSession.count({
        where: { userId, isActive: true },
      });

      return {
        mfaEnabled: user.mfa_enabled,
        activeSessions,
        lastPasswordChange: user.password_changed_at,
        lastLogin: user.last_login_at,
        accountCreated: user.created_at,
        accountStatus: user.status,
      };
    } catch (error: unknown) {
      logger.error("Failed to get security summary", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new AuthenticationError("Failed to retrieve security summary");
    }
  }

  /**
   * Validate profile update data
   */
  private validateProfileData(profileData: ProfileUpdateRequest): string[] {
    const errors: string[] = [];

    if (profileData.firstName && profileData.firstName.trim().length === 0) {
      errors.push("First name cannot be empty");
    }

    if (profileData.lastName && profileData.lastName.trim().length === 0) {
      errors.push("Last name cannot be empty");
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push("Invalid email format");
    }

    if (profileData.phone && profileData.phone.length > 0) {
      if (!/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phone)) {
        errors.push("Invalid phone number format");
      }
    }

    return errors;
  }
}

// Singleton instance
export const profileService = new ProfileService();
export default ProfileService;