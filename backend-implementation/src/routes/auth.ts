/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION ROUTES
 * ============================================================================
 *
 * Authentication and authorization routes with comprehensive security
 * controls including rate limiting, input validation, and audit logging.
 *
 * Endpoints:
 * - POST /register - User registration
 * - POST /login - User authentication
 * - POST /logout - User logout (current session)
 * - POST /logout-all - Logout from all sessions
 * - POST /refresh - Token refresh
 * - POST /change-password - Change user password
 * - POST /setup-mfa - Setup multi-factor authentication
 * - POST /verify-mfa - Verify MFA setup
 * - GET /profile - Get current user profile
 * - GET /sessions - Get user sessions
 * - DELETE /sessions/:sessionId - Revoke specific session
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Router } from "express";
import {
  AuthController,
  authRateLimit,
  failedLoginRateLimit,
  validateRegistration,
  validateLogin,
  validatePasswordChange,
} from "@/controllers/AuthController";
import {
  authenticate,
  optionalAuth,
  authorize,
  UserRole,
  adminOnly,
  staffOnly,
} from "@/middleware/auth";
import { logger } from "@/utils/logger";

/**
 * Create authentication router
 */
const authRouter = Router();

/**
 * Apply rate limiting to all auth routes
 */
authRouter.use(authRateLimit);

/**
 * Public endpoints (no authentication required)
 */

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public (with validation)
 */
authRouter.post("/register", validateRegistration, AuthController.register);

/**
 * @route POST /auth/login
 * @desc Authenticate user and get tokens
 * @access Public
 */
authRouter.post(
  "/login",
  failedLoginRateLimit,
  validateLogin,
  AuthController.login,
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public (requires valid refresh token)
 */
authRouter.post("/refresh", AuthController.refreshToken);

/**
 * Protected endpoints (authentication required)
 */

/**
 * @route POST /auth/logout
 * @desc Logout user from current session
 * @access Private
 */
authRouter.post("/logout", authenticate, AuthController.logout);

/**
 * @route POST /auth/logout-all
 * @desc Logout user from all sessions
 * @access Private
 */
authRouter.post("/logout-all", authenticate, AuthController.logoutAll);

/**
 * @route POST /auth/change-password
 * @desc Change user password
 * @access Private
 */
authRouter.post(
  "/change-password",
  authenticate,
  validatePasswordChange,
  AuthController.changePassword,
);

/**
 * @route GET /auth/profile
 * @desc Get current user profile
 * @access Private
 */
authRouter.get("/profile", authenticate, AuthController.getProfile);

/**
 * @route GET /auth/sessions
 * @desc Get all user sessions
 * @access Private
 */
authRouter.get("/sessions", authenticate, AuthController.getSessions);

/**
 * @route DELETE /auth/sessions/:sessionId
 * @desc Revoke a specific session
 * @access Private
 */
authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  AuthController.revokeSession,
);

/**
 * Multi-Factor Authentication endpoints
 */

/**
 * @route POST /auth/setup-mfa
 * @desc Setup multi-factor authentication
 * @access Private
 */
authRouter.post("/setup-mfa", authenticate, AuthController.setupMFA);

/**
 * @route POST /auth/verify-mfa
 * @desc Verify and enable MFA
 * @access Private
 */
authRouter.post("/verify-mfa", authenticate, AuthController.verifyMFASetup);

/**
 * Administrative endpoints (admin only)
 */

/**
 * @route GET /auth/health
 * @desc Authentication system health check
 * @access Admin only
 */
authRouter.get("/health", authenticate, adminOnly, async (req, res, next) => {
  try {
    // Import here to avoid circular dependencies
    const { SessionService } = await import("@/services/SessionService");
    const { User } = await import("@/models/User");
    const { UserSession } = await import("@/models/UserSession");

    // Get system statistics
    const [sessionStats, userCount, activeUserCount] = await Promise.all([
      SessionService.getSessionStats(),
      User.count(),
      User.count({ where: { status: "active" } }),
    ]);

    res.status(200).json({
      success: true,
      message: "Authentication system health check",
      data: {
        systemStatus: "healthy",
        timestamp: new Date().toISOString(),
        statistics: {
          totalUsers: userCount,
          activeUsers: activeUserCount,
          sessions: sessionStats,
        },
        security: {
          rateLimiting: "enabled",
          mfaSupport: "enabled",
          auditLogging: "enabled",
          sessionManagement: "enabled",
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /auth/users
 * @desc Get all users (admin only)
 * @access Admin only
 */
authRouter.get("/users", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { User } = await import("@/models/User");

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const { rows: users, count: total } = await User.findAndCountAll({
      attributes: [
        "id",
        "email",
        "firstName",
        "lastName",
        "role",
        "status",
        "mfaEnabled",
        "lastLoginAt",
        "createdAt",
        "updatedAt",
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /auth/users/:userId/status
 * @desc Update user status (admin only)
 * @access Admin only
 */
authRouter.patch(
  "/users/:userId/status",
  authenticate,
  adminOnly,
  async (req, res, next) => {
    try {
      const { User, UserStatus } = await import("@/models/User");
      const { AuditLog, AuditAction } = await import("@/models/AuditLog");
      const { userId } = req.params;
      const { status } = req.body;

      if (!Object.values(UserStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status value",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const oldStatus = user.status;
      await user.update({ status });

      // Log status change
      await AuditLog.logDataAccess(
        "users",
        user.id,
        AuditAction.UPDATE,
        (req as any).user.id,
        (req as any).user.sessionId,
        req.ip,
        req.headers["user-agent"],
        { status: oldStatus },
        { status },
      );

      logger.info("User status updated", {
        adminUserId: (req as any).user.id,
        targetUserId: userId,
        oldStatus,
        newStatus: status,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "User status updated successfully",
        data: {
          userId: user.id,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Error handling for auth routes
 */
authRouter.use((error: any, req: any, res: any, next: any) => {
  // Log authentication errors
  logger.error("Authentication route error", {
    error: error.message,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  next(error);
});

/**
 * 404 handler for auth routes
 */
authRouter.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "authentication_route_not_found",
    message: `Authentication route ${req.originalUrl} not found`,
    availableEndpoints: [
      "POST /auth/register",
      "POST /auth/login",
      "POST /auth/logout",
      "POST /auth/logout-all",
      "POST /auth/refresh",
      "POST /auth/change-password",
      "POST /auth/setup-mfa",
      "POST /auth/verify-mfa",
      "GET /auth/profile",
      "GET /auth/sessions",
      "DELETE /auth/sessions/:sessionId",
      "GET /auth/health (admin)",
      "GET /auth/users (admin)",
      "PATCH /auth/users/:userId/status (admin)",
    ],
    timestamp: new Date().toISOString(),
  });
});

logger.info("✅ Authentication routes configured");

export { authRouter };
export default authRouter;
