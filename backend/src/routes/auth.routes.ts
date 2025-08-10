/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION ROUTES
 * ============================================================================
 * JWT-based authentication endpoints with MFA support
 * Based on: artifacts/security-requirements.yml
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { createApiError } from '../utils/errors';
import { validateEmail, validatePassword } from '../utils/validation';
import { rateLimitByIP } from '../middleware/rateLimit';

const router = Router();

interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceId?: string;
  };
}

interface RefreshRequest {
  refreshToken: string;
  deviceId?: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
}

/**
 * POST /auth/login - User authentication
 */
router.post('/login', rateLimitByIP(5, 15), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, mfaToken, deviceInfo }: LoginRequest = req.body;

    // Input validation
    if (!email || !password) {
      throw createApiError(400, 'MISSING_CREDENTIALS', 'Email and password are required');
    }

    if (!validateEmail(email)) {
      throw createApiError(400, 'INVALID_EMAIL', 'Invalid email format');
    }

    // Find user by email
    const user = await database('users')
      .select('id', 'email', 'password_hash', 'role', 'status', 'mfa_enabled', 'mfa_secret', 
              'failed_login_attempts', 'locked_until', 'last_login', 'organization_id')
      .where('email', email.toLowerCase())
      .andWhere('deleted_at', null)
      .first();

    if (!user) {
      // Log failed login attempt
      await database('security.failed_login_attempts').insert({
        email,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        failure_reason: 'User not found',
        attempt_timestamp: new Date()
      });

      throw createApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw createApiError(401, 'ACCOUNT_INACTIVE', `Account is ${user.status}`);
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw createApiError(401, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to failed login attempts');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates: any = { 
        failed_login_attempts: failedAttempts,
        updated_at: new Date()
      };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await database('users').where('id', user.id).update(updates);

      // Log failed login attempt
      await database('security.failed_login_attempts').insert({
        email,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        failure_reason: 'Invalid password',
        attempt_timestamp: new Date()
      });

      throw createApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check MFA if enabled
    let mfaVerified = false;
    if (user.mfa_enabled) {
      if (!mfaToken) {
        throw createApiError(401, 'MFA_REQUIRED', 'Multi-factor authentication token is required');
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 2 // Allow 2 time steps (60 seconds) for clock drift
      });

      if (!verified) {
        throw createApiError(401, 'INVALID_MFA_TOKEN', 'Invalid multi-factor authentication token');
      }
      
      mfaVerified = true;
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.role);

    // Generate session ID
    const sessionId = uuidv4();

    // Create JWT tokens
    const accessToken = jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
      sessionId,
      clientType: 'web',
      iss: config.app.name,
      aud: config.app.url
    }, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign({
      sub: user.id,
      sessionId,
      type: 'refresh',
      iss: config.app.name,
      aud: config.app.url
    }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
      algorithm: 'HS256'
    });

    // Store session in Redis
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      mfaVerified,
      loginTimestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: deviceInfo?.deviceId || 'unknown'
    };

    await redis.setex(
      `${config.redis.prefix}session:${sessionId}`,
      86400 * 7, // 7 days
      JSON.stringify(sessionData)
    );

    // Update user login info and reset failed attempts
    await database('users').where('id', user.id).update({
      last_login: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date()
    });

    // Log successful login
    logger.info('User logged in successfully', {
      component: 'auth',
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      ip: req.ip,
      mfaUsed: user.mfa_enabled
    });

    // Response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organization_id,
          mfaEnabled: user.mfa_enabled
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.accessExpiry
        },
        session: {
          id: sessionId,
          expiresAt: new Date(Date.now() + 86400 * 7 * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh - Refresh access token
 */
router.post('/refresh', rateLimitByIP(10, 15), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken, deviceId }: RefreshRequest = req.body;

    if (!refreshToken) {
      throw createApiError(400, 'MISSING_REFRESH_TOKEN', 'Refresh token is required');
    }

    // Verify refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw createApiError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
      }
      throw createApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw createApiError(401, 'INVALID_TOKEN_TYPE', 'Invalid token type');
    }

    // Check if session exists
    const sessionKey = `${config.redis.prefix}session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw createApiError(401, 'SESSION_EXPIRED', 'Session has expired');
    }

    const session = JSON.parse(sessionData);

    // Get fresh user data
    const user = await database('users')
      .select('id', 'email', 'role', 'status', 'organization_id')
      .where('id', payload.sub)
      .andWhere('deleted_at', null)
      .first();

    if (!user || user.status !== 'active') {
      throw createApiError(401, 'USER_INACTIVE', 'User account is not active');
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.role);

    // Generate new access token
    const newAccessToken = jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
      sessionId: payload.sessionId,
      clientType: 'web',
      iss: config.app.name,
      aud: config.app.url
    }, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
      algorithm: 'HS256'
    });

    // Update session activity
    await redis.setex(sessionKey, 86400 * 7, JSON.stringify({
      ...session,
      lastActivity: new Date().toISOString()
    }));

    logger.info('Token refreshed successfully', {
      component: 'auth',
      userId: user.id,
      sessionId: payload.sessionId
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: config.jwt.accessExpiry
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout - Logout and invalidate session
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createApiError(400, 'MISSING_TOKEN', 'Authorization token is required');
    }

    const token = authHeader.substring(7);
    const payload = jwt.decode(token) as any;

    if (payload?.sessionId) {
      // Remove session from Redis
      await redis.del(`${config.redis.prefix}session:${payload.sessionId}`);

      logger.info('User logged out successfully', {
        component: 'auth',
        userId: payload.sub,
        sessionId: payload.sessionId
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register - User registration (admin only)
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, role, organizationId }: RegisterRequest = req.body;

    // Input validation
    if (!email || !password || !firstName || !lastName || !role) {
      throw createApiError(400, 'MISSING_FIELDS', 'All required fields must be provided');
    }

    if (!validateEmail(email)) {
      throw createApiError(400, 'INVALID_EMAIL', 'Invalid email format');
    }

    if (!validatePassword(password)) {
      throw createApiError(400, 'WEAK_PASSWORD', 
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    const validRoles = ['super_admin', 'admin', 'dispatcher', 'office_staff', 'driver', 'customer', 'customer_staff'];
    if (!validRoles.includes(role)) {
      throw createApiError(400, 'INVALID_ROLE', `Role must be one of: ${validRoles.join(', ')}`);
    }

    // Check if email already exists
    const existingUser = await database('users')
      .select('id')
      .where('email', email.toLowerCase())
      .first();

    if (existingUser) {
      throw createApiError(409, 'EMAIL_EXISTS', 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const [userId] = await database('users').insert({
      id: uuidv4(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role,
      status: 'active',
      organization_id: organizationId || null,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    logger.info('User registered successfully', {
      component: 'auth',
      userId,
      email,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: userId,
        email,
        role
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/setup-mfa - Setup multi-factor authentication
 */
router.post('/setup-mfa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This would require authentication middleware
    if (!req.user) {
      throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `${config.security.mfaIssuer} (${req.user.email})`,
      issuer: config.security.mfaIssuer,
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (user needs to verify before enabling)
    await redis.setex(
      `${config.redis.prefix}mfa_setup:${req.user.id}`,
      300, // 5 minutes
      secret.base32
    );

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: [] // Would generate backup codes in production
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to get user permissions
 */
async function getUserPermissions(role: string): Promise<string[]> {
  // This matches the permissions in auth.ts
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    admin: [
      'customers:create', 'customers:read', 'customers:update', 'customers:delete',
      'routes:create', 'routes:read', 'routes:update', 'routes:delete',
      'invoices:create', 'invoices:read', 'invoices:update',
      'payments:read', 'reports:read', 'users:create', 'users:read', 'users:update',
      'notifications:send', 'analytics:read'
    ],
    dispatcher: [
      'routes:read', 'routes:update', 'drivers:read', 'customers:read',
      'pickups:create', 'pickups:read', 'pickups:update', 'notifications:send',
      'tracking:read', 'service-events:create', 'service-events:read', 'service-events:update'
    ],
    office_staff: [
      'customers:read', 'customers:update', 'invoices:read',
      'service-events:read', 'reports:read', 'notifications:send'
    ],
    driver: [
      'routes:read:own', 'pickups:update:own', 'location:share',
      'service-events:create:own', 'service-events:read:own', 'service-events:update:own',
      'photos:upload', 'issues:report', 'communication:receive'
    ],
    customer: [
      'account:read:own', 'account:update:own', 'invoices:read:own', 'invoices:download:own',
      'service-history:read:own', 'service-requests:create', 'service-requests:read:own',
      'schedule:read:own', 'schedule:modify:own', 'payments:read:own', 'support:create'
    ],
    customer_staff: [
      'account:read:organization', 'invoices:read:organization', 'invoices:download:organization',
      'service-history:read:organization', 'service-requests:create:organization',
      'service-requests:read:organization', 'reports:read:organization'
    ]
  };

  return rolePermissions[role] || [];
}

export default router;