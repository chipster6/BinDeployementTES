/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * JWT-based authentication middleware with session management
 * Based on: artifacts/security-requirements.yml
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { redis } from '../config/redis';
import { database } from '../config/database';
import { logger } from '../utils/logger';
import { createApiError } from '../utils/errors';

// Extend Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
        sessionId: string;
        mfaVerified: boolean;
      };
      sessionId?: string;
    }
  }
}

interface JwtPayload {
  sub: string; // user_id
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
  clientType: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Authentication middleware that validates JWT tokens and session state
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createApiError(401, 'MISSING_TOKEN', 'Authorization token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.secret,
        audience: config.jwt.secret
      }) as JwtPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw createApiError(401, 'TOKEN_EXPIRED', 'Access token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw createApiError(401, 'INVALID_TOKEN', 'Invalid access token');
      } else {
        throw createApiError(401, 'TOKEN_VERIFICATION_FAILED', 'Token verification failed');
      }
    }

    // Check if session exists and is active
    const sessionKey = `${config.redis.prefix}session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);
    
    if (!sessionData) {
      throw createApiError(401, 'SESSION_EXPIRED', 'Session has expired or is invalid');
    }

    let session;
    try {
      session = JSON.parse(sessionData);
    } catch {
      throw createApiError(401, 'INVALID_SESSION', 'Session data is corrupted');
    }

    // Verify session belongs to the user
    if (session.userId !== payload.sub) {
      throw createApiError(401, 'SESSION_MISMATCH', 'Session does not match token user');
    }

    // Check if user account is still active
    const user = await database('users')
      .select('id', 'email', 'role', 'status', 'mfa_enabled', 'deleted_at')
      .where('id', payload.sub)
      .andWhere('deleted_at', null)
      .first();

    if (!user) {
      throw createApiError(401, 'USER_NOT_FOUND', 'User account not found or deactivated');
    }

    if (user.status !== 'active') {
      throw createApiError(401, 'ACCOUNT_INACTIVE', `Account is ${user.status}`);
    }

    // Update session last activity
    await redis.setex(sessionKey, 86400 * 7, JSON.stringify({
      ...session,
      lastActivity: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }));

    // Get user permissions (this would be expanded based on role-based permissions)
    const permissions = await getUserPermissions(user.role);

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions,
      sessionId: payload.sessionId,
      mfaVerified: session.mfaVerified || false
    };
    req.sessionId = payload.sessionId;

    // Log successful authentication for audit
    logger.info('User authenticated successfully', {
      component: 'auth',
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      duration: Date.now() - startTime
    });

    next();

  } catch (error: any) {
    // Log authentication failure for security monitoring
    logger.warn('Authentication failed', {
      component: 'auth',
      error: error.message,
      errorCode: error.code,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    // Record failed authentication attempt in security table
    try {
      await database('security.failed_login_attempts').insert({
        email: null, // We don't have email at this point
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        failure_reason: error.message,
        attempt_timestamp: new Date()
      });
    } catch (dbError) {
      logger.error('Failed to record security event', { error: dbError });
    }

    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await authMiddleware(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

/**
 * API Key authentication middleware for external integrations
 */
export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw createApiError(401, 'MISSING_API_KEY', 'API key is required');
    }

    // Look up API key in database
    const keyRecord = await database('security.api_keys')
      .select('id', 'key_name', 'user_id', 'organization_id', 'scopes', 'rate_limit_per_hour', 'status', 'expires_at')
      .where('key_hash', apiKey) // In production, this would be hashed
      .andWhere('status', 'active')
      .first();

    if (!keyRecord) {
      throw createApiError(401, 'INVALID_API_KEY', 'Invalid or inactive API key');
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      throw createApiError(401, 'API_KEY_EXPIRED', 'API key has expired');
    }

    // Update last used timestamp
    await database('security.api_keys')
      .where('id', keyRecord.id)
      .update({ last_used_at: new Date() });

    // Attach API key information to request
    req.user = {
      id: keyRecord.user_id || 'api-key-user',
      email: `api-key@${keyRecord.key_name}`,
      role: 'api_client',
      permissions: keyRecord.scopes || [],
      sessionId: `api-key-${keyRecord.id}`,
      mfaVerified: true // API keys bypass MFA
    };

    next();

  } catch (error) {
    logger.warn('API key authentication failed', {
      component: 'auth',
      error: (error as Error).message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    next(error);
  }
};

/**
 * MFA verification middleware for sensitive operations
 */
export const mfaRequiredMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
  }

  if (!req.user.mfaVerified) {
    throw createApiError(403, 'MFA_REQUIRED', 'Multi-factor authentication verification required');
  }

  next();
};

/**
 * Get user permissions based on role
 * This would typically come from a more sophisticated RBAC system
 */
async function getUserPermissions(role: string): Promise<string[]> {
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    admin: [
      'customers:create', 'customers:read', 'customers:update', 'customers:delete',
      'routes:create', 'routes:read', 'routes:update', 'routes:delete',
      'invoices:create', 'invoices:read', 'invoices:update',
      'payments:read',
      'reports:read',
      'users:create', 'users:read', 'users:update',
      'notifications:send',
      'analytics:read'
    ],
    dispatcher: [
      'routes:read', 'routes:update',
      'drivers:read',
      'customers:read',
      'pickups:create', 'pickups:read', 'pickups:update',
      'notifications:send',
      'tracking:read',
      'service-events:create', 'service-events:read', 'service-events:update'
    ],
    office_staff: [
      'customers:read', 'customers:update',
      'invoices:read',
      'service-events:read',
      'reports:read',
      'notifications:send'
    ],
    driver: [
      'routes:read:own',
      'pickups:update:own',
      'location:share',
      'service-events:create:own', 'service-events:read:own', 'service-events:update:own',
      'photos:upload',
      'issues:report',
      'communication:receive'
    ],
    customer: [
      'account:read:own', 'account:update:own',
      'invoices:read:own', 'invoices:download:own',
      'service-history:read:own',
      'service-requests:create', 'service-requests:read:own',
      'schedule:read:own', 'schedule:modify:own',
      'payments:read:own',
      'support:create'
    ],
    customer_staff: [
      'account:read:organization',
      'invoices:read:organization', 'invoices:download:organization',
      'service-history:read:organization',
      'service-requests:create:organization', 'service-requests:read:organization',
      'reports:read:organization'
    ]
  };

  return rolePermissions[role] || [];
}

/**
 * Validate session integrity
 */
export const validateSession = async (sessionId: string): Promise<boolean> => {
  try {
    const sessionKey = `${config.redis.prefix}session:${sessionId}`;
    const sessionData = await redis.get(sessionKey);
    return sessionData !== null;
  } catch (error) {
    logger.error('Session validation failed', { error, sessionId });
    return false;
  }
};

/**
 * Invalidate user session
 */
export const invalidateSession = async (sessionId: string): Promise<void> => {
  try {
    const sessionKey = `${config.redis.prefix}session:${sessionId}`;
    await redis.del(sessionKey);
    logger.info('Session invalidated', { sessionId });
  } catch (error) {
    logger.error('Failed to invalidate session', { error, sessionId });
    throw error;
  }
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  apiKeyMiddleware,
  mfaRequiredMiddleware,
  validateSession,
  invalidateSession
};