import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '@/utils/logger';

// Secure JWT configuration
export class AuthService {
  private static jwtSecret: string;
  private static jwtExpiresIn: string;
  
  static {
    // Validate JWT secret on module load
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long and cannot be empty');
    }
    
    // Additional security check for common weak secrets
    const weakSecrets = [
      'your-secret-key',
      'secret',
      'password',
      'jwt-secret',
      'your-jwt-secret',
      'change-me',
    ];
    
    if (weakSecrets.includes(secret.toLowerCase())) {
      throw new Error('JWT_SECRET cannot be a common/weak secret. Use a cryptographically secure random string.');
    }
    
    this.jwtSecret = secret;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    logger.info('AuthService initialized with secure configuration', {
      jwtSecretLength: secret.length,
      jwtExpiresIn: this.jwtExpiresIn,
    });
  }

  /**
   * Hash password using bcrypt with security best practices
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Input validation
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      if (password.length > 128) {
        throw new Error('Password too long (max 128 characters)');
      }
      
      // Use bcrypt with salt rounds 12 for security
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      logger.info('Password hashed successfully', {
        passwordLength: password.length,
        saltRounds,
      });
      
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed', {
        error: error.message,
        securityEvent: true,
      });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      if (!password || !hash) {
        return false;
      }
      
      const isMatch = await bcrypt.compare(password, hash);
      
      logger.info('Password comparison completed', {
        isMatch,
        hashLength: hash.length,
      });
      
      return isMatch;
    } catch (error) {
      logger.error('Password comparison failed', {
        error: error.message,
        securityEvent: true,
      });
      return false;
    }
  }

  /**
   * Generate JWT token with security claims
   */
  static generateToken(payload: {
    id: string;
    email: string;
    role: string;
  }): string {
    try {
      // Validate payload
      if (!payload.id || !payload.email || !payload.role) {
        throw new Error('Invalid token payload - missing required fields');
      }
      
      // Sanitize email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        throw new Error('Invalid email format in token payload');
      }
      
      // Add security claims
      const tokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(), // JWT ID for token tracking
        aud: 'waste-management-system', // Audience
        iss: 'waste-management-auth', // Issuer
      };
      
      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        algorithm: 'HS256',
      });
      
      logger.info('JWT token generated', {
        userId: payload.id,
        userEmail: payload.email,
        userRole: payload.role,
        expiresIn: this.jwtExpiresIn,
        securityEvent: true,
      });
      
      return token;
    } catch (error) {
      logger.error('JWT token generation failed', {
        error: error.message,
        userId: payload?.id,
        securityEvent: true,
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): any | null {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }
      
      // Verify token structure (should have 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        logger.warn('Invalid token format', {
          tokenParts: tokenParts.length,
          securityEvent: true,
        });
        return null;
      }
      
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: 'waste-management-system',
        issuer: 'waste-management-auth',
      });
      
      logger.info('JWT token verified successfully', {
        userId: (decoded as any).id,
        userRole: (decoded as any).role,
        securityEvent: true,
      });
      
      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid JWT token', {
          error: error.message,
          securityEvent: true,
        });
      } else if (error.name === 'TokenExpiredError') {
        logger.warn('JWT token expired', {
          error: error.message,
          securityEvent: true,
        });
      } else if (error.name === 'NotBeforeError') {
        logger.warn('JWT token not active', {
          error: error.message,
          securityEvent: true,
        });
      } else {
        logger.error('JWT token verification failed', {
          error: error.message,
          securityEvent: true,
        });
      }
      
      return null;
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456', '123456789',
      'qwerty', 'abc123', 'password1', 'admin', 'letmein',
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate cryptographically secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export default AuthService;