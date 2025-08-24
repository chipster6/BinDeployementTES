/**
 * ============================================================================
 * MULTI-FACTOR AUTHENTICATION SERVICE
 * ============================================================================
 * 
 * Dedicated service for MFA operations extracted from AuthController.
 * Handles MFA setup, verification, backup codes, and security.
 * 
 * Features:
 * - MFA secret generation and storage
 * - QR code URI generation
 * - Token verification
 * - Backup code management
 * - MFA status management
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

import { User } from "@/models/User";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { authenticator } from "otplib";
import { logger } from "@/utils/logger";
import {
  AuthenticationError,
  ValidationError,
  BadRequestError,
  NotFoundError,
} from "@/middleware/errorHandler";

/**
 * MFA setup result interface
 */
export interface MfaSetupResult {
  success: boolean;
  secret?: string;
  qrCodeUri?: string;
  backupCodes?: string[];
  error?: string;
}

/**
 * MFA verification result interface
 */
export interface MfaVerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
}

/**
 * MFA status interface
 */
export interface MfaStatus {
  enabled: boolean;
  secretConfigured: boolean;
  backupCodesGenerated: boolean;
  lastUsed?: Date;
}

/**
 * MFA Service class
 */
export class MfaService {
  /**
   * Initiate MFA setup for user
   */
  public async setupMfa(
    userId: string,
    ipAddress?: string
  ): Promise<MfaSetupResult> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.mfa_enabled) {
        throw new BadRequestError("MFA is already enabled for this account");
      }

      // Generate MFA secret
      const secret = user.generateMfaSecret();
      await user.save();

      // Generate QR code URI
      const qrCodeUri = user.getMfaQrCodeUri();

      // TODO: Generate backup codes
      const backupCodes = this.generateBackupCodes();

      logger.info("MFA setup initiated", {
        userId,
        ipAddress,
      });

      return {
        success: true,
        secret,
        qrCodeUri,
        backupCodes,
      };
    } catch (error: unknown) {
      logger.error("MFA setup failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      return {
        success: false,
        error: "MFA setup failed",
      };
    }
  }

  /**
   * Verify MFA setup with token
   */
  public async verifyMfaSetup(
    userId: string,
    token: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<MfaVerificationResult> {
    try {
      if (!token || token.length !== 6) {
        throw new ValidationError("Valid 6-digit MFA token required");
      }

      const user = await User.findByPk(userId);
      if (!user || !user.mfa_secret) {
        throw new AuthenticationError("MFA setup not initiated");
      }

      // Verify token
      const isValid = user.verifyMfaToken(token);
      if (!isValid) {
        throw new AuthenticationError("Invalid MFA token");
      }

      // Enable MFA
      await user.update({ 
        mfa_enabled: true,
        mfa_backup_codes: this.generateBackupCodes(),
      });

      // Log MFA enablement
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        sessionId,
        ipAddress,
        userAgent,
        undefined,
        { mfa_enabled: true }
      );

      logger.info("MFA enabled successfully", {
        userId,
        ipAddress,
      });

      return {
        success: true,
        verified: true,
      };
    } catch (error: unknown) {
      logger.error("MFA verification failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }

      return {
        success: false,
        verified: false,
        error: "MFA verification failed",
      };
    }
  }

  /**
   * Disable MFA for user
   */
  public async disableMfa(
    userId: string,
    currentPassword: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (!user.mfa_enabled) {
        throw new BadRequestError("MFA is not enabled for this account");
      }

      // Verify current password before disabling MFA
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        throw new AuthenticationError("Current password is incorrect");
      }

      // Disable MFA
      await user.update({
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: null,
      });

      // Log MFA disabling
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        sessionId,
        ipAddress,
        userAgent,
        undefined,
        { mfa_disabled: true }
      );

      logger.info("MFA disabled successfully", {
        userId,
        ipAddress,
      });

      return true;
    } catch (error: unknown) {
      logger.error("MFA disable failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof NotFoundError || 
          error instanceof BadRequestError || 
          error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError("Failed to disable MFA");
    }
  }

  /**
   * Verify MFA token for authentication
   */
  public async verifyMfaToken(
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.mfa_enabled || !user.mfa_secret) {
        return false;
      }

      return user.verifyMfaToken(token);
    } catch (error: unknown) {
      logger.error("MFA token verification failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get MFA status for user
   */
  public async getMfaStatus(userId: string): Promise<MfaStatus> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return {
        enabled: user.mfa_enabled,
        secretConfigured: !!user.mfa_secret,
        backupCodesGenerated: !!(user.mfa_backup_codes && user.mfa_backup_codes.length > 0),
        lastUsed: user.last_login_at,
      };
    } catch (error: unknown) {
      logger.error("Failed to get MFA status", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new AuthenticationError("Failed to get MFA status");
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  public async verifyBackupCode(
    userId: string,
    backupCode: string
  ): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.mfa_enabled || !user.mfa_backup_codes) {
        return false;
      }

      const backupCodes = user.mfa_backup_codes;
      const codeIndex = backupCodes.indexOf(backupCode.toUpperCase());
      
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await user.update({ mfa_backup_codes: backupCodes });

      logger.info("Backup code used", {
        userId,
        remainingCodes: backupCodes.length,
      });

      return true;
    } catch (error: unknown) {
      logger.error("Backup code verification failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Regenerate backup codes
   */
  public async regenerateBackupCodes(
    userId: string,
    sessionId?: string,
    ipAddress?: string
  ): Promise<string[]> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (!user.mfa_enabled) {
        throw new BadRequestError("MFA is not enabled for this account");
      }

      const newBackupCodes = this.generateBackupCodes();
      await user.update({ mfa_backup_codes: newBackupCodes });

      // Log backup code regeneration
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        sessionId,
        ipAddress,
        undefined,
        undefined,
        { backup_codes_regenerated: true }
      );

      logger.info("MFA backup codes regenerated", {
        userId,
        ipAddress,
      });

      return newBackupCodes;
    } catch (error: unknown) {
      logger.error("Backup code regeneration failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress,
      });

      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      throw new AuthenticationError("Failed to regenerate backup codes");
    }
  }
}

// Singleton instance
export const mfaService = new MfaService();
export default MfaService;