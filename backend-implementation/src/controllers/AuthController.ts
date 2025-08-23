/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION CONTROLLER
 * ============================================================================
 *
 * Comprehensive authentication controller with JWT-based authentication,
 * MFA support, session management, and security monitoring.
 *
 * Security Features:
 * - Secure user registration and login
 * - JWT token generation and validation
 * - Multi-factor authentication (TOTP)
 * - Session management and tracking
 * - Brute force protection
 * - Account lockout mechanisms
 * - Comprehensive audit logging
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { User, UserRole, UserStatus } from "@/models/User";
import { UserSession } from "@/models/UserSession";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { SessionService } from "@/services/SessionService";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/middleware/auth";
import type { AuthenticatedRequest } from "@/middleware/auth";
import {
  encryptDatabaseField,
  generateSecureToken,
  maskSensitiveData,
} from "@/utils/encryption";
import { logger } from "@/utils/logger";
import {
  AuthenticationError,
  ValidationError,
  AuthorizationError,
  BadRequestError,
} from "@/middleware/errorHandler";
import { authenticator } from "otplib";

/**
 * Registration request interface
 */
interface RegisterRequest {
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
 * Login request interface
 */
interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

/**
 * Password change request interface
 */
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "rate_limit_exceeded",
    message: "Too many authentication attempts. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address and user email if provided
    const email = req.body?.email || "";
    return `${req.ip}:${email}`;
  },
});

/**
 * Stricter rate limiting for failed logins
 */
export const failedLoginRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // limit each IP to 5 failed attempts per windowMs
  message: {
    error: "login_attempts_exceeded",
    message: "Too many failed login attempts. Account temporarily locked.",
    retryAfter: "30 minutes",
  },
  skip: (req, res) => {
    // Only apply rate limiting to failed login attempts
    return res.locals.loginSuccess === true;
  },
});

/**
 * Registration validation middleware
 */
export const validateRegistration = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address required")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("password")
    .isLength({ min: 12 })
    .withMessage("Password must be at least 12 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match");
    }
    return true;
  }),

  body("firstName")
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("First name is required and must not exceed 100 characters"),

  body("lastName")
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("Last name is required and must not exceed 100 characters"),

  body("phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Invalid phone number format"),

  body("role")
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage("Invalid user role"),

  body("gdprConsentGiven")
    .isBoolean()
    .withMessage("GDPR consent status must be specified"),
];

/**
 * Login validation middleware
 */
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address required"),

  body("password").isLength({ min: 1 }).withMessage("Password is required"),

  body("mfaToken")
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("MFA token must be 6 digits"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be boolean"),
];

/**
 * Password change validation middleware
 */
export const validatePasswordChange = [
  body("currentPassword")
    .isLength({ min: 1 })
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 12 })
    .withMessage("New password must be at least 12 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match");
    }
    return true;
  }),
];

/**
 * Authentication Controller Class
 */
export class AuthController {
  /**
   * User registration endpoint
   */
  static async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(
          "Registration validation failed",
          errors.array(),
        );
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role = UserRole.CUSTOMER,
        organizationId,
        gdprConsentGiven,
      }: RegisterRequest = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new BadRequestError("User with this email already exists");
      }

      // Hash password
      const passwordHash = await User.hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role,
        status: UserStatus.ACTIVE,
        gdpr_consent_given: gdprConsentGiven,
        gdpr_consent_date: gdprConsentGiven ? new Date() : null,
      });

      // Log user registration
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.CREATE,
        user.id,
        undefined,
        req.ip,
        req.headers["user-agent"],
        undefined,
        { userRegistered: true, role },
      );

      logger.info("User registered successfully", {
        userId: user.id,
        email: maskSensitiveData(email),
        role,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          mfaEnabled: user.mfa_enabled,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * User login endpoint
   */
  static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError("Login validation failed", errors.array());
      }

      const {
        email,
        password,
        mfaToken,
        rememberMe = false,
        deviceFingerprint,
      }: LoginRequest = req.body;

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new AuthenticationError("Invalid credentials");
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw new AuthenticationError(
          "Account is temporarily locked due to failed login attempts",
        );
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        await user.incrementFailedLoginAttempts();

        // Log failed login attempt
        await AuditLog.logDataAccess(
          "users",
          user.id,
          AuditAction.LOGIN,
          user.id,
          undefined,
          req.ip,
          req.headers["user-agent"],
          undefined,
          { loginFailed: true, reason: "invalid_password" },
        );

        res.locals.loginSuccess = false;
        throw new AuthenticationError("Invalid credentials");
      }

      // Enforce MFA validation for MFA-enabled accounts
      if (user.mfa_enabled) {
        if (!mfaToken) {
          throw new AuthenticationError("MFA token required", {
            requiresMFA: true,
          });
        }

        const isValidMFA = user.verifyMfaToken(mfaToken);
        if (!isValidMFA) {
          await user.incrementFailedLoginAttempts();

          // Log failed MFA attempt
          await AuditLog.logDataAccess(
            "users",
            user.id,
            AuditAction.LOGIN,
            user.id,
            undefined,
            req.ip,
            req.headers["user-agent"],
            undefined,
            { loginFailed: true, reason: "invalid_mfa" },
          );

          res.locals.loginSuccess = false;
          throw new AuthenticationError("Invalid MFA token");
        }
      }

      // Reset failed login attempts on successful login
      await user.resetFailedLoginAttempts();
      await user.updateLastLogin();

      // Create session
      const sessionData = await SessionService.createSession({
        userId: user.id,
        userRole: user.role,
        ipAddress: req?.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
        deviceFingerprint: deviceFingerprint || "unknown",
        rememberMe,
        mfaVerified: user.mfa_enabled ? true : false,
      });

      // Generate JWT tokens
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: sessionData.id,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        sessionId: sessionData.id,
      });

      // Set secure cookie for refresh token
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      });

      // Log successful login
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.LOGIN,
        user.id,
        sessionData.id,
        req.ip,
        req.headers["user-agent"],
        undefined,
        { loginSuccess: true, sessionId: sessionData.id },
      );

      res.locals.loginSuccess = true;

      logger.info("User login successful", {
        userId: user.id,
        email: maskSensitiveData(email),
        role: user.role,
        sessionId: sessionData.id,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
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
          expiresIn: "15m",
          sessionId: sessionData.id,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Token refresh endpoint
   */
  static async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new AuthenticationError("Refresh token required");
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      
      if (!payload || !payload.sessionId) {
        throw new AuthenticationError("Invalid refresh token payload");
      }

      // Get session data
      const sessionData = await SessionService.getSession(payload.sessionId);
      if (!sessionData) {
        throw new AuthenticationError("Invalid session");
      }

      // Get user
      const user = await User.findByPk(payload.userId);
      
      if (!payload.userId) {
        throw new AuthenticationError("Invalid user ID in token payload");
      }
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
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken,
          expiresIn: "15m",
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * User logout endpoint
   */
  static async logout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (req.user?.sessionId) {
        await SessionService.deleteSession(req.user.sessionId);

        // Clear refresh token cookie
        res.clearCookie("refreshToken");

        logger.info("User logout successful", {
          userId: req.user.id,
          sessionId: req.user.sessionId,
          ip: req.ip,
        });
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Logout from all devices endpoint
   */
  static async logoutAll(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (req.user?.id) {
        const deletedCount = await SessionService.deleteUserSessions(
          req.user.id,
          req.user.sessionId, // Exclude current session if we want to keep it
        );

        logger.info("User logout from all devices", {
          userId: req.user.id,
          deletedSessions: deletedCount,
          ip: req.ip,
        });
      }

      res.status(200).json({
        success: true,
        message: `Logged out from ${req.body.includeCurrent ? "all" : "other"} devices successfully`,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Change password endpoint
   */
  static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(
          "Password change validation failed",
          errors.array(),
        );
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      // Get user
      const user = await User.findByPk(req.user!.id);
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
        req.user?.sessionId,
        req.ip,
        req.headers["user-agent"],
        undefined,
        { passwordChanged: true },
      );

      // Optionally logout from all other devices for security
      await SessionService.deleteUserSessions(user.id, req.user?.sessionId);

      logger.info("Password changed successfully", {
        userId: user.id,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Setup MFA endpoint
   */
  static async setupMFA(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await User.findByPk(req.user!.id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      if (user.mfa_enabled) {
        throw new BadRequestError("MFA is already enabled for this account");
      }

      // Generate MFA secret
      const secret = user.generateMfaSecret();
      await user.save();

      // Generate QR code URI
      const qrCodeUri = user.getMfaQrCodeUri();

      logger.info("MFA setup initiated", {
        userId: user.id,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "MFA setup initiated",
        data: {
          secret,
          qrCodeUri,
          backupCodes: [], // TODO: Generate backup codes
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Verify MFA setup endpoint
   */
  static async verifyMFASetup(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token } = req.body;

      if (!token || token.length !== 6) {
        throw new ValidationError("Valid 6-digit MFA token required");
      }

      const user = await User.findByPk(req.user!.id);
      if (!user || !user.mfa_secret) {
        throw new AuthenticationError("MFA setup not initiated");
      }

      // Verify token
      const isValid = user.verifyMfaToken(token);
      if (!isValid) {
        throw new AuthenticationError("Invalid MFA token");
      }

      // Enable MFA
      await user.update({ mfa_enabled: true });

      // Log MFA enablement
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        user.id,
        req.user?.sessionId,
        req.ip,
        req.headers["user-agent"],
        undefined,
        { mfa_enabled: true },
      );

      logger.info("MFA enabled successfully", {
        userId: user.id,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "MFA enabled successfully",
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get current user profile endpoint
   */
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await User.findByPk(req.user!.id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      res.status(200).json({
        success: true,
        data: {
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
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get user sessions endpoint
   */
  static async getSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sessions = await SessionService.getUserSessions(req.user!.id);

      const sessionData = sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        locationCountry: session.locationCountry,
        locationCity: session.locationCity,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isCurrent: session.id === req.user?.sessionId,
      }));

      res.status(200).json({
        success: true,
        data: {
          sessions: sessionData,
          total: sessionData.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Revoke specific session endpoint
   */
  static async revokeSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Verify session belongs to user
      const session = await UserSession.findOne({
        where: {
          id: sessionId,
          userId: req.user!.id,
        },
      });

      if (!session) {
        throw new AuthorizationError("Session not found or access denied");
      }

      // Delete session
      await SessionService.deleteSession(session.sessionToken);

      logger.info("Session revoked successfully", {
        userId: req.user!.id,
        revokedSessionId: sessionId,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Session revoked successfully",
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}

export default AuthController;
