/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION MIDDLEWARE
 * ============================================================================
 *
 * JWT authentication and role-based authorization middleware.
 * Simplified implementation for immediate deployment readiness.
 *
 * Updated by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.1.0
 */

import { Request, Response, NextFunction } from "express";
import jwt, { Algorithm } from "jsonwebtoken";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import { User, UserModel, UserRole, UserStatus } from "@/models/User";

/**
 * JWT payload interface
 */
interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user: UserModel & {
    sessionId?: string;
  };
}

/**
 * Authentication Error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization Error class
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Extract JWT token from request
 */
const extractToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
};

/**
 * Verify JWT token and extract payload with explicit algorithm validation
 */
const verifyToken = (token: string): JWTPayload => {
  try {
    // Explicitly specify algorithm to prevent algorithm confusion attacks
    const payload = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm as Algorithm], // Explicit algorithm validation
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JWTPayload;

    return payload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid token");
    } else if (error.name === "NotBeforeError") {
      throw new AuthenticationError("Token not yet valid");
    } else {
      throw new AuthenticationError("Token verification failed");
    }
  }
};

/**
 * Main authentication middleware
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract token from request
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
      return;
    }

    // Verify JWT token
    const payload = verifyToken(token);

    // Find user in database
    const user = await User.findByPk(payload.id);
    if (!user || user.deleted_at) {
      res.status(401).json({
        success: false,
        message: "Access denied. User not found.",
      });
      return;
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: "Access denied. Account is not active.",
      });
      return;
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      res.status(423).json({
        success: false,
        message: "Access denied. Account is locked.",
      });
      return;
    }

    // Add user information to request
    const userWithSession = Object.assign(user, {} as { sessionId?: string });
    if (payload.sessionId) {
      userWithSession.sessionId = payload.sessionId;
    }
    (req as AuthenticatedRequest).user = userWithSession;

    // Log successful authentication (debug level to avoid spam)
    logger.debug("User authenticated successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    next();
  } catch (error: any) {
    logger.warn("Authentication failed", {
      error: error.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      url: req.originalUrl,
    });

    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    const user = await User.findByPk(payload.id);

    if (user && user.status === UserStatus.ACTIVE && !user.isAccountLocked()) {
      (req as AuthenticatedRequest).user = user;
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    logger.debug("Optional authentication failed:", error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn("Authorization failed", {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.originalUrl,
        });

        res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Authorization middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during authorization",
      });
    }
  };
};

/**
 * Resource ownership validation middleware
 */
export const requireOwnership = (resourceIdParam: string = "id") => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Super admins can access any resource
      if (req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      const resourceId =
        req.params[resourceIdParam] || req.body[resourceIdParam];

      // For user resources, check if user owns the resource
      if (!resourceId || resourceId !== req.user.id) {
        logger.warn("Unauthorized resource access attempt", {
          userId: req.user.id,
          resourceId,
          url: req.originalUrl,
        });

        res.status(403).json({
          success: false,
          message: "Access denied. You can only access your own resources.",
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Ownership validation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during ownership validation",
      });
    }
  };
};

/**
 * Permission-based authorization using the User model's canAccess method
 */
export const requirePermission = (resource: string, action: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Check if user has the required permission
      if (!req.user.canAccess(resource, action)) {
        logger.warn("Permission denied", {
          userId: req.user.id,
          userRole: req.user.role,
          resource,
          action,
          url: req.originalUrl,
        });

        res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${resource}:${action}`,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Permission validation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during permission validation",
      });
    }
  };
};

/**
 * Admin-only middleware (shorthand)
 */
export const adminOnly = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

/**
 * Staff-only middleware (admin, dispatcher, office staff)
 */
export const staffOnly = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.DISPATCHER,
  UserRole.OFFICE_STAFF,
);

/**
 * Driver-only middleware
 */
export const driverOnly = requireRole(UserRole.DRIVER);

/**
 * Customer-only middleware
 */
export const customerOnly = requireRole(
  UserRole.CUSTOMER,
  UserRole.CUSTOMER_STAFF,
);

/**
 * Generate JWT access token with explicit algorithm specification
 */
export function generateToken(payload: {
  id: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}): string {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    },
    config.jwt.secret,
    {
      algorithm: config.jwt.algorithm as Algorithm, // Explicit algorithm specification
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    },
  );
}

/**
 * Generate JWT refresh token with explicit algorithm specification
 */
export function generateRefreshToken(payload: {
  id: string;
  sessionId?: string;
}): string {
  return jwt.sign(
    {
      userId: payload.id,
      sessionId: payload.sessionId,
    },
    config.jwt.refreshSecret,
    {
      algorithm: config.jwt.algorithm as Algorithm, // Explicit algorithm specification
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    },
  );
}

/**
 * Verify refresh token and extract payload with explicit algorithm validation
 */
export function verifyRefreshToken(token: string): {
  userId: string;
  sessionId?: string;
} {
  try {
    // Explicitly specify algorithm to prevent algorithm confusion attacks
    const payload = jwt.verify(token, config.jwt.refreshSecret, {
      algorithms: [config.jwt.algorithm as Algorithm], // Explicit algorithm validation
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as any;

    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    throw new AuthenticationError("Invalid refresh token");
  }
}

// Re-export types and enums
export { UserRole, UserStatus };
export type { UserModel };

// Export main auth middleware as default
export { authenticateToken as authenticate };
export default authenticateToken;
