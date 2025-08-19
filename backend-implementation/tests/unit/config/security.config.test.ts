/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SECURITY CONFIGURATION UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for security configuration validation, JWT key
 * processing, encryption settings, and security policy enforcement.
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { 
  securityEnvSchema, 
  validateSecurityEnv, 
  createSecurityConfig, 
  SecurityConfig 
} from '@/config/security.config';
import { ValidationError } from '@/middleware/errorHandler';

describe('Security Configuration', () => {
  const originalEnv = process.env;
  
  // Mock valid RSA key pairs for testing
  const mockPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAyLW8wJJ7R9E8VLkH7H1cQQ7mE9I2xM3NKb4kL1b2wCcqW8Y9
tKk3jM2n1vOp6sQ8wEr4F9mP7jA5q6rZkT3nL8mP1vQ7cH9kR2wE5tF7gH3jA6n
8mL1cR7wF9kP2tQ8vE4nH8mP1fQ7wH9kR2wE5tF7gH3jA6n8mL1cR7wF9kP2tQ8
-----END RSA PRIVATE KEY-----`;

  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyLW8wJJ7R9E8VLkH7H1c
QQ7mE9I2xM3NKb4kL1b2wCcqW8Y9tKk3jM2n1vOp6sQ8wEr4F9mP7jA5q6rZkT3n
L8mP1vQ7cH9kR2wE5tF7gH3jA6n8mL1cR7wF9kP2tQ8vE4nH8mP1fQ7wH9kR2wE
5tF7gH3jA6n8mL1cR7wF9kP2tQ8QIDAQAB
-----END PUBLIC KEY-----`;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('securityEnvSchema validation', () => {
    it('should require essential security variables', () => {
      const { error } = securityEnvSchema.validate({});
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_PRIVATE_KEY');
      expect(error?.message).toContain('required');
    });

    it('should validate with all required security variables', () => {
      const validEnv = {
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: '12345678901234567890123456789012', // 32 chars
        SESSION_SECRET: '1234567890123456789012345678901234567890', // > 32 chars
      };

      const { error, value } = securityEnvSchema.validate(validEnv);
      
      expect(error).toBeUndefined();
      expect(value.JWT_PRIVATE_KEY).toBe(mockPrivateKey);
      expect(value.JWT_PUBLIC_KEY).toBe(mockPublicKey);
      expect(value.ENCRYPTION_KEY).toBe('12345678901234567890123456789012');
      expect(value.SESSION_SECRET).toBe('1234567890123456789012345678901234567890');
    });

    it('should use secure defaults for optional values', () => {
      const validEnv = {
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: '12345678901234567890123456789012',
        SESSION_SECRET: '1234567890123456789012345678901234567890',
      };

      const { error, value } = securityEnvSchema.validate(validEnv);
      
      expect(error).toBeUndefined();
      expect(value.JWT_EXPIRES_IN).toBe('15m');
      expect(value.JWT_REFRESH_EXPIRES_IN).toBe('7d');
      expect(value.JWT_ALGORITHM).toBe('RS256');
      expect(value.HASH_ROUNDS).toBe(12);
      expect(value.BCRYPT_ROUNDS).toBe(12);
      expect(value.ACCOUNT_LOCKOUT_ATTEMPTS).toBe(5);
      expect(value.ACCOUNT_LOCKOUT_TIME).toBe(1800000); // 30 minutes
      expect(value.FORCE_HTTPS).toBe(false);
      expect(value.SECURE_COOKIES).toBe(false);
    });

    describe('Validation edge cases and security requirements', () => {
      it('should reject encryption key with incorrect length', () => {
        const invalidEnv = {
          JWT_PRIVATE_KEY: mockPrivateKey,
          JWT_PUBLIC_KEY: mockPublicKey,
          JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
          JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
          ENCRYPTION_KEY: 'short-key', // Too short
          SESSION_SECRET: '1234567890123456789012345678901234567890',
        };

        const { error } = securityEnvSchema.validate(invalidEnv);
        
        expect(error).toBeDefined();
        expect(error?.message).toContain('ENCRYPTION_KEY');
        expect(error?.message).toContain('length must be 32');
      });

      it('should reject session secret that is too short', () => {
        const invalidEnv = {
          JWT_PRIVATE_KEY: mockPrivateKey,
          JWT_PUBLIC_KEY: mockPublicKey,
          JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
          JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
          ENCRYPTION_KEY: '12345678901234567890123456789012',
          SESSION_SECRET: 'short', // Too short
        };

        const { error } = securityEnvSchema.validate(invalidEnv);
        
        expect(error).toBeDefined();
        expect(error?.message).toContain('SESSION_SECRET');
        expect(error?.message).toContain('length must be at least 32');
      });

      it('should validate reasonable hash rounds range', () => {
        const validEnv = {
          JWT_PRIVATE_KEY: mockPrivateKey,
          JWT_PUBLIC_KEY: mockPublicKey,
          JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
          JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
          ENCRYPTION_KEY: '12345678901234567890123456789012',
          SESSION_SECRET: '1234567890123456789012345678901234567890',
          HASH_ROUNDS: 15,
          BCRYPT_ROUNDS: 14,
        };

        const { error, value } = securityEnvSchema.validate(validEnv);
        
        expect(error).toBeUndefined();
        expect(value.HASH_ROUNDS).toBe(15);
        expect(value.BCRYPT_ROUNDS).toBe(14);
      });

      it('should validate reasonable account lockout settings', () => {
        const validEnv = {
          JWT_PRIVATE_KEY: mockPrivateKey,
          JWT_PUBLIC_KEY: mockPublicKey,
          JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
          JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
          ENCRYPTION_KEY: '12345678901234567890123456789012',
          SESSION_SECRET: '1234567890123456789012345678901234567890',
          ACCOUNT_LOCKOUT_ATTEMPTS: 3,
          ACCOUNT_LOCKOUT_TIME: 3600000, // 1 hour
        };

        const { error, value } = securityEnvSchema.validate(validEnv);
        
        expect(error).toBeUndefined();
        expect(value.ACCOUNT_LOCKOUT_ATTEMPTS).toBe(3);
        expect(value.ACCOUNT_LOCKOUT_TIME).toBe(3600000);
      });

      it('should validate rate limiting configuration', () => {
        const validEnv = {
          JWT_PRIVATE_KEY: mockPrivateKey,
          JWT_PUBLIC_KEY: mockPublicKey,
          JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
          JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
          ENCRYPTION_KEY: '12345678901234567890123456789012',
          SESSION_SECRET: '1234567890123456789012345678901234567890',
          RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
          RATE_LIMIT_MAX_REQUESTS: 500,
          RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: false,
        };

        const { error, value } = securityEnvSchema.validate(validEnv);
        
        expect(error).toBeUndefined();
        expect(value.RATE_LIMIT_WINDOW_MS).toBe(900000);
        expect(value.RATE_LIMIT_MAX_REQUESTS).toBe(500);
        expect(value.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS).toBe(false);
      });
    });
  });

  describe('validateSecurityEnv function', () => {
    it('should successfully validate complete security environment', () => {
      process.env = {
        ...process.env,
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'abcd1234efgh5678ijkl9012mnop3456',
        SESSION_SECRET: 'super-secret-session-key-with-sufficient-length',
      };

      expect(() => validateSecurityEnv()).not.toThrow();
      const result = validateSecurityEnv();
      expect(result).toBeDefined();
      expect(result.JWT_PRIVATE_KEY).toBe(mockPrivateKey);
      expect(result.ENCRYPTION_KEY).toBe('abcd1234efgh5678ijkl9012mnop3456');
    });

    it('should throw detailed error for missing required keys', () => {
      process.env = {
        ...process.env,
        // Missing JWT_PRIVATE_KEY
        JWT_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'abcd1234efgh5678ijkl9012mnop3456',
        SESSION_SECRET: 'super-secret-session-key-with-sufficient-length',
      };

      expect(() => validateSecurityEnv()).toThrow('Security configuration validation error');
    });

    it('should throw error for weak encryption key', () => {
      process.env = {
        ...process.env,
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'weak-key', // Too short
        SESSION_SECRET: 'super-secret-session-key-with-sufficient-length',
      };

      expect(() => validateSecurityEnv()).toThrow('Security configuration validation error');
    });
  });

  describe('createSecurityConfig function', () => {
    it('should create comprehensive security configuration', () => {
      const envVars = {
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        JWT_EXPIRES_IN: '30m',
        JWT_REFRESH_EXPIRES_IN: '14d',
        JWT_ALGORITHM: 'RS256',
        ENCRYPTION_KEY: 'production-encryption-key-32-chars',
        HASH_ROUNDS: 14,
        SESSION_SECRET: 'production-session-secret-with-very-high-entropy',
        BCRYPT_ROUNDS: 15,
        MFA_ISSUER: 'Waste Management Production',
        PASSWORD_RESET_TOKEN_EXPIRY: 7200000, // 2 hours
        ACCOUNT_LOCKOUT_ATTEMPTS: 3,
        ACCOUNT_LOCKOUT_TIME: 3600000, // 1 hour
        FORCE_HTTPS: true,
        TRUST_PROXY: true,
        SECURE_COOKIES: true,
        RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: 500,
        RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: false,
      };

      const config: SecurityConfig = createSecurityConfig(envVars);

      // Validate JWT configuration
      expect(config.jwt.privateKey).toBe(mockPrivateKey);
      expect(config.jwt.publicKey).toBe(mockPublicKey);
      expect(config.jwt.refreshPrivateKey).toBe(mockPrivateKey);
      expect(config.jwt.refreshPublicKey).toBe(mockPublicKey);
      expect(config.jwt.expiresIn).toBe('30m');
      expect(config.jwt.refreshExpiresIn).toBe('14d');
      expect(config.jwt.algorithm).toBe('RS256');
      expect(config.jwt.issuer).toBe('waste-management-api');
      expect(config.jwt.audience).toBe('waste-management-users');

      // Validate security configuration
      expect(config.security.encryptionKey).toBe('production-encryption-key-32-chars');
      expect(config.security.hashRounds).toBe(14);
      expect(config.security.sessionSecret).toBe('production-session-secret-with-very-high-entropy');
      expect(config.security.bcryptRounds).toBe(15);
      expect(config.security.mfa.issuer).toBe('Waste Management Production');
      expect(config.security.mfa.window).toBe(2);
      expect(config.security.passwordReset.tokenExpiry).toBe(7200000);
      expect(config.security.accountLockout.attempts).toBe(3);
      expect(config.security.accountLockout.time).toBe(3600000);
      expect(config.security.forceHttps).toBe(true);
      expect(config.security.trustProxy).toBe(true);
      expect(config.security.secureCookies).toBe(true);

      // Validate helmet configuration
      expect(config.security.helmet.hsts.maxAge).toBe(31536000); // 1 year
      expect(config.security.helmet.hsts.includeSubDomains).toBe(true);
      expect(config.security.helmet.hsts.preload).toBe(true);
      expect(config.security.helmet.csp.enabled).toBe(true);

      // Validate rate limiting configuration
      expect(config.rateLimit.windowMs).toBe(900000);
      expect(config.rateLimit.maxRequests).toBe(500);
      expect(config.rateLimit.skipSuccessfulRequests).toBe(false);
      expect(config.rateLimit.message.error).toBe('rate_limit_exceeded');
      expect(config.rateLimit.message.message).toBe('Too many requests, please try again later.');
      expect(config.rateLimit.message.retryAfter).toBe(900); // 15 minutes in seconds
    });

    it('should handle escaped newlines in RSA keys', () => {
      const envVars = {
        JWT_PRIVATE_KEY: mockPrivateKey.replace(/\n/g, '\\n'),
        JWT_PUBLIC_KEY: mockPublicKey.replace(/\n/g, '\\n'),
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey.replace(/\n/g, '\\n'),
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey.replace(/\n/g, '\\n'),
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        SESSION_SECRET: 'test-session-secret-with-sufficient-length',
      };

      const config: SecurityConfig = createSecurityConfig(envVars);

      // Keys should be properly unescaped
      expect(config.jwt.privateKey).toBe(mockPrivateKey);
      expect(config.jwt.publicKey).toBe(mockPublicKey);
      expect(config.jwt.refreshPrivateKey).toBe(mockPrivateKey);
      expect(config.jwt.refreshPublicKey).toBe(mockPublicKey);
    });

    it('should calculate retry-after correctly for rate limiting', () => {
      const envVars = {
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        SESSION_SECRET: 'test-session-secret-with-sufficient-length',
        RATE_LIMIT_WINDOW_MS: 3600000, // 1 hour
      };

      const config: SecurityConfig = createSecurityConfig(envVars);

      expect(config.rateLimit.message.retryAfter).toBe(3600); // 1 hour in seconds
    });

    it('should maintain configuration object structure', () => {
      const envVars = {
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        SESSION_SECRET: 'test-session-secret-with-sufficient-length',
      };

      const config: SecurityConfig = createSecurityConfig(envVars);

      // Verify top-level structure
      expect(config).toHaveProperty('jwt');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('rateLimit');

      // Verify JWT structure
      expect(config.jwt).toHaveProperty('privateKey');
      expect(config.jwt).toHaveProperty('publicKey');
      expect(config.jwt).toHaveProperty('refreshPrivateKey');
      expect(config.jwt).toHaveProperty('refreshPublicKey');
      expect(config.jwt).toHaveProperty('expiresIn');
      expect(config.jwt).toHaveProperty('refreshExpiresIn');
      expect(config.jwt).toHaveProperty('algorithm');
      expect(config.jwt).toHaveProperty('issuer');
      expect(config.jwt).toHaveProperty('audience');

      // Verify security structure
      expect(config.security).toHaveProperty('encryptionKey');
      expect(config.security).toHaveProperty('sessionSecret');
      expect(config.security).toHaveProperty('mfa');
      expect(config.security).toHaveProperty('passwordReset');
      expect(config.security).toHaveProperty('accountLockout');
      expect(config.security).toHaveProperty('helmet');

      // Verify nested structures
      expect(config.security.mfa).toHaveProperty('issuer');
      expect(config.security.mfa).toHaveProperty('window');
      expect(config.security.passwordReset).toHaveProperty('tokenExpiry');
      expect(config.security.accountLockout).toHaveProperty('attempts');
      expect(config.security.accountLockout).toHaveProperty('time');
      expect(config.security.helmet.hsts).toHaveProperty('maxAge');
      expect(config.security.helmet.hsts).toHaveProperty('includeSubDomains');
      expect(config.security.helmet.hsts).toHaveProperty('preload');

      // Verify rate limit structure
      expect(config.rateLimit).toHaveProperty('windowMs');
      expect(config.rateLimit).toHaveProperty('maxRequests');
      expect(config.rateLimit).toHaveProperty('skipSuccessfulRequests');
      expect(config.rateLimit).toHaveProperty('message');
      expect(config.rateLimit.message).toHaveProperty('error');
      expect(config.rateLimit.message).toHaveProperty('message');
      expect(config.rateLimit.message).toHaveProperty('retryAfter');
    });
  });

  describe('Production security requirements', () => {
    it('should validate production-strength encryption requirements', () => {
      const productionEnv = {
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'prod-encryption-key-with-32-chars',
        SESSION_SECRET: 'production-session-secret-with-high-entropy-and-sufficient-length',
        HASH_ROUNDS: 15, // Higher for production
        BCRYPT_ROUNDS: 16, // Higher for production
        FORCE_HTTPS: true,
        SECURE_COOKIES: true,
        TRUST_PROXY: true,
      };

      const config: SecurityConfig = createSecurityConfig(productionEnv);

      expect(config.security.hashRounds).toBe(15);
      expect(config.security.bcryptRounds).toBe(16);
      expect(config.security.forceHttps).toBe(true);
      expect(config.security.secureCookies).toBe(true);
      expect(config.security.trustProxy).toBe(true);
    });

    it('should validate security headers configuration', () => {
      const config: SecurityConfig = createSecurityConfig({
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        SESSION_SECRET: 'test-session-secret-with-sufficient-length',
      });

      // HSTS should be properly configured
      expect(config.security.helmet.hsts.maxAge).toBe(31536000); // 1 year
      expect(config.security.helmet.hsts.includeSubDomains).toBe(true);
      expect(config.security.helmet.hsts.preload).toBe(true);

      // CSP should be enabled
      expect(config.security.helmet.csp.enabled).toBe(true);
    });

    it('should enforce reasonable rate limiting for production', () => {
      const config: SecurityConfig = createSecurityConfig({
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
        JWT_REFRESH_PRIVATE_KEY: mockPrivateKey,
        JWT_REFRESH_PUBLIC_KEY: mockPublicKey,
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        SESSION_SECRET: 'test-session-secret-with-sufficient-length',
        RATE_LIMIT_WINDOW_MS: 3600000, // 1 hour
        RATE_LIMIT_MAX_REQUESTS: 1000,
      });

      expect(config.rateLimit.windowMs).toBe(3600000);
      expect(config.rateLimit.maxRequests).toBe(1000);
      expect(config.rateLimit.message.retryAfter).toBe(3600);
    });
  });
});