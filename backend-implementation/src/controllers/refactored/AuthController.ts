/**
 * ============================================================================
 * REFACTORED AUTHENTICATION CONTROLLER
 * ============================================================================
 *
 * Clean, focused authentication controller following Clean Architecture principles.
 * Thin controller that delegates business logic to dedicated services.
 *
 * Responsibilities:
 * - Request/response handling
 * - Input validation coordination
 * - Service orchestration
 * - Response formatting
 * - Error handling delegation
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 * Version: 2.0.0
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@/middleware/auth";
import { validateAndHandle } from "@/middleware/validation/validationHandler";
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateMfaToken,
} from "@/middleware/validation/authValidation";
import { generalRateLimiter, authRateLimiter } from "@/middleware/rateLimit";
import { authenticationService } from "@/services/auth/AuthenticationService";
import { mfaService } from "@/services/auth/MfaService";
import { profileService } from "@/services/auth/ProfileService";
import { ResponseFormatter } from "@/utils/responseFormatter";
import { logger } from "@/utils/logger";

/**
 * Refactored Authentication Controller
 */
export class AuthController {
  /**
   * User registration endpoint
   * @route POST /api/v1/auth/register
   */
  static register = [
    authRateLimiter,
    ...validateAndHandle(validateRegistration),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const registrationData = req.body;
        const context = {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        };

        const result = await authenticationService.registerUser(
          registrationData,
          context
        );

        ResponseFormatter.success(
          res,
          {
            user: result.user,
          },
          "User registered successfully",
          201
        );
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * User login endpoint
   * @route POST /api/v1/auth/login
   */
  static login = [
    authRateLimiter,
    ...validateAndHandle(validateLogin),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const loginData = req.body;
        const context = {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          deviceFingerprint: loginData.deviceFingerprint,
        };

        const result = await authenticationService.authenticateUser(
          loginData,
          context
        );

        if (!result.success && result.requiresMFA) {
          return ResponseFormatter.error(
            res,
            "MFA token required",
            200, // Not an error, just needs additional input
            undefined,
            { requiresMFA: true }
          );
        }

        if (!result.success) {
          res.locals.loginSuccess = false;
          return ResponseFormatter.error(res, result.error || "Login failed", 401);
        }

        // Set secure cookie for refresh token if remember me is enabled
        if (loginData.rememberMe && result.refreshToken) {
          const isProduction = process.env.NODE_ENV === "production";
          res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
          });
        }

        res.locals.loginSuccess = true;

        ResponseFormatter.success(
          res,
          {
            user: result.user,
            accessToken: result.accessToken,
            expiresIn: result.expiresIn,
            sessionId: result.sessionId,
          },
          "Login successful"
        );
      } catch (error: unknown) {
        res.locals.loginSuccess = false;
        next(error);
      }
    },
  ];

  /**
   * Token refresh endpoint
   * @route POST /api/v1/auth/refresh
   */
  static refreshToken = [
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        const context = {
          ipAddress: req.ip,
        };

        const result = await authenticationService.refreshAuthenticationToken(
          refreshToken,
          context
        );

        ResponseFormatter.success(
          res,
          {
            accessToken: result.accessToken,
            expiresIn: result.expiresIn,
          },
          "Token refreshed successfully"
        );
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * User logout endpoint
   * @route POST /api/v1/auth/logout
   */
  static logout = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (req.user?.id && req.user?.sessionId) {
          const context = {
            ipAddress: req.ip,
          };

          await authenticationService.logoutUser(
            req.user.id,
            req.user.sessionId,
            context
          );

          // Clear refresh token cookie
          res.clearCookie("refreshToken");
        }

        ResponseFormatter.success(res, undefined, "Logout successful");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Logout from all devices endpoint
   * @route POST /api/v1/auth/logout-all
   */
  static logoutAll = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const context = {
          ipAddress: req.ip,
        };

        const deletedCount = await authenticationService.logoutUserFromAllDevices(
          req.user.id,
          req.user.sessionId,
          context
        );

        ResponseFormatter.success(
          res,
          { deletedSessions: deletedCount },
          `Logged out from ${req.body.includeCurrent ? "all" : "other"} devices successfully`
        );
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Change password endpoint
   * @route PUT /api/v1/auth/password
   */
  static changePassword = [
    ...validateAndHandle(validatePasswordChange),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const passwordRequest = {
          userId: req.user.id,
          currentPassword: req.body.currentPassword,
          newPassword: req.body.newPassword,
          sessionId: req.user.sessionId,
        };

        const context = {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        };

        await authenticationService.changeUserPassword(passwordRequest, context);

        ResponseFormatter.success(res, undefined, "Password changed successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];
}

/**
 * MFA Controller - Separate concern for Multi-Factor Authentication
 */
export class MfaController {
  /**
   * Setup MFA endpoint
   * @route POST /api/v1/auth/mfa/setup
   */
  static setupMFA = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const result = await mfaService.setupMfa(req.user.id, req.ip);

        if (!result.success) {
          return ResponseFormatter.error(res, result.error || "MFA setup failed", 400);
        }

        ResponseFormatter.success(
          res,
          {
            secret: result.secret,
            qrCodeUri: result.qrCodeUri,
            backupCodes: result.backupCodes,
          },
          "MFA setup initiated"
        );
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Verify MFA setup endpoint
   * @route POST /api/v1/auth/mfa/verify
   */
  static verifyMFASetup = [
    ...validateAndHandle(validateMfaToken),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const result = await mfaService.verifyMfaSetup(
          req.user.id,
          req.body.token,
          req.user.sessionId,
          req.ip,
          req.get("user-agent")
        );

        if (!result.success) {
          return ResponseFormatter.error(res, result.error || "MFA verification failed", 400);
        }

        ResponseFormatter.success(res, undefined, "MFA enabled successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Disable MFA endpoint
   * @route DELETE /api/v1/auth/mfa
   */
  static disableMFA = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        await mfaService.disableMfa(
          req.user.id,
          req.body.currentPassword,
          req.user.sessionId,
          req.ip,
          req.get("user-agent")
        );

        ResponseFormatter.success(res, undefined, "MFA disabled successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];
}

/**
 * Profile Controller - Separate concern for User Profile Management
 */
export class ProfileController {
  /**
   * Get current user profile endpoint
   * @route GET /api/v1/auth/profile
   */
  static getProfile = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const profile = await profileService.getUserProfile(req.user.id);

        ResponseFormatter.success(res, profile, "Profile retrieved successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Update user profile endpoint
   * @route PUT /api/v1/auth/profile
   */
  static updateProfile = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const updatedProfile = await profileService.updateUserProfile(
          req.user.id,
          req.body,
          req.user.sessionId,
          req.ip,
          req.get("user-agent")
        );

        ResponseFormatter.success(res, updatedProfile, "Profile updated successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Get user sessions endpoint
   * @route GET /api/v1/auth/sessions
   */
  static getSessions = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const sessions = await profileService.getUserSessions(
          req.user.id,
          req.user.sessionId
        );

        ResponseFormatter.success(
          res,
          {
            sessions,
            total: sessions.length,
          },
          "Sessions retrieved successfully"
        );
      } catch (error: unknown) {
        next(error);
      }
    },
  ];

  /**
   * Revoke specific session endpoint
   * @route DELETE /api/v1/auth/sessions/:sessionId
   */
  static revokeSession = [
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.id) {
          return ResponseFormatter.unauthorized(res);
        }

        const { sessionId } = req.params;

        await profileService.revokeSession(
          req.user.id,
          sessionId,
          req.user.sessionId,
          req.ip
        );

        ResponseFormatter.success(res, undefined, "Session revoked successfully");
      } catch (error: unknown) {
        next(error);
      }
    },
  ];
}

export default AuthController;