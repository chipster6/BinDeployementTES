/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SECURITY CONFIGURATION
 * ============================================================================
 *
 * Security configuration including JWT authentication, encryption,
 * session management, MFA, and rate limiting.
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-15
 * Version: 2.0.0 - Refactored from monolithic config
 */

import * as Joi from "joi";

/**
 * Security environment variable validation schema
 */
export const securityEnvSchema = Joi.object({
  // JWT - RS256 requires public/private key pairs (SECURITY HARDENED)
  JWT_PRIVATE_KEY: Joi.string().required().description("RSA private key for JWT signing"),
  JWT_PUBLIC_KEY: Joi.string().required().description("RSA public key for JWT verification"),
  JWT_REFRESH_PRIVATE_KEY: Joi.string().required().description("RSA private key for refresh token signing"),
  JWT_REFRESH_PUBLIC_KEY: Joi.string().required().description("RSA public key for refresh token verification"),
  JWT_EXPIRES_IN: Joi.string().default("15m").description("JWT access token expiration"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d").description("JWT refresh token expiration"),
  JWT_ALGORITHM: Joi.string().valid("RS256").default("RS256").description("JWT algorithm (must be RS256 for production)"),
  JWT_ISSUER: Joi.string().default("waste-management-api"),
  JWT_AUDIENCE: Joi.string().default("waste-management-users"),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  HASH_ROUNDS: Joi.number().default(12),

  // Security
  SESSION_SECRET: Joi.string().min(32).required(),
  BCRYPT_ROUNDS: Joi.number().default(12),
  MFA_ISSUER: Joi.string().default("Waste Management System"),
  PASSWORD_RESET_TOKEN_EXPIRY: Joi.number().default(3600000),
  ACCOUNT_LOCKOUT_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_TIME: Joi.number().default(1800000),
  FORCE_HTTPS: Joi.boolean().default(false),
  TRUST_PROXY: Joi.boolean().default(false),
  SECURE_COOKIES: Joi.boolean().default(false),

  // TIERED RATE LIMITING (SECURITY HARDENED)
  RATE_LIMIT_ANONYMOUS_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_ANONYMOUS_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_AUTH_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_AUTH_MAX_REQUESTS: Joi.number().default(1000),
  RATE_LIMIT_ADMIN_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_ADMIN_MAX_REQUESTS: Joi.number().default(5000),
  RATE_LIMIT_CRITICAL_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_CRITICAL_MAX_REQUESTS: Joi.number().default(10),
  
  // Legacy rate limiting (deprecated)
  RATE_LIMIT_WINDOW_MS: Joi.number().default(3600000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(true),

  // REQUEST SIZE LIMITS (SECURITY HARDENED)
  REQUEST_SIZE_LIMIT_DEFAULT: Joi.string().default("1mb"),
  REQUEST_SIZE_LIMIT_FILE_UPLOAD: Joi.string().default("10mb"),
  REQUEST_SIZE_LIMIT_JSON: Joi.string().default("1mb"),
  REQUEST_SIZE_LIMIT_URL_ENCODED: Joi.string().default("1mb"),
  REQUEST_SIZE_LIMIT_AUTH: Joi.string().default("100kb"),
  REQUEST_SIZE_LIMIT_EMERGENCY: Joi.string().default("50mb"),
});

/**
 * Validate security environment variables
 */
export const validateSecurityEnv = () => {
  const { error, value } = securityEnvSchema.validate(process.env);
  if (error) {
    throw new Error(`Security configuration validation error: ${error instanceof Error ? error?.message : String(error)}`);
  }
  return value;
};

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  jwt: {
    privateKey: string;
    publicKey: string;
    refreshPrivateKey: string;
    refreshPublicKey: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
    issuer: string;
    audience: string;
  };
  security: {
    encryptionKey: string;
    hashRounds: number;
    sessionSecret: string;
    bcryptRounds: number;
    mfa: {
      issuer: string;
      window: number;
    };
    passwordReset: {
      tokenExpiry: number;
    };
    accountLockout: {
      attempts: number;
      time: number;
    };
    forceHttps: boolean;
    trustProxy: boolean;
    secureCookies: boolean;
    helmet: {
      hsts: {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
      };
      csp: {
        enabled: boolean;
      };
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    message: {
      error: string;
      message: string;
      retryAfter: number;
    };
  };
}

/**
 * Create security configuration from validated environment variables
 */
export const createSecurityConfig = (envVars: any): SecurityConfig => ({
  jwt: {
    privateKey: envVars.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
    publicKey: envVars.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    refreshPrivateKey: envVars.JWT_REFRESH_PRIVATE_KEY.replace(/\\n/g, '\n'),
    refreshPublicKey: envVars.JWT_REFRESH_PUBLIC_KEY.replace(/\\n/g, '\n'),
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    algorithm: envVars.JWT_ALGORITHM,
    issuer: "waste-management-api",
    audience: "waste-management-users",
  },

  security: {
    encryptionKey: envVars.ENCRYPTION_KEY,
    hashRounds: envVars.HASH_ROUNDS,
    sessionSecret: envVars.SESSION_SECRET,
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    mfa: {
      issuer: envVars.MFA_ISSUER,
      window: 2, // Allow 2 windows of 30 seconds each
    },
    passwordReset: {
      tokenExpiry: envVars.PASSWORD_RESET_TOKEN_EXPIRY,
    },
    accountLockout: {
      attempts: envVars.ACCOUNT_LOCKOUT_ATTEMPTS,
      time: envVars.ACCOUNT_LOCKOUT_TIME,
    },
    forceHttps: envVars.FORCE_HTTPS,
    trustProxy: envVars.TRUST_PROXY,
    secureCookies: envVars.SECURE_COOKIES,
    helmet: {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      csp: {
        enabled: true,
      },
    },
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
    message: {
      error: "rate_limit_exceeded",
      message: "Too many requests, please try again later.",
      retryAfter: Math.ceil(envVars.RATE_LIMIT_WINDOW_MS / 1000),
    },
  },
});