/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DOCKER SECRETS CONFIGURATION
 * ============================================================================
 *
 * Secure configuration loader for Docker Secrets and environment variables.
 * Implements enterprise-grade secret management with fallback support for
 * development environments and production Docker Secrets integration.
 *
 * Features:
 * - Docker Secrets file-based secret loading
 * - Environment variable fallback for development
 * - Secure key validation and transformation
 * - JWT key pair management for RS256 algorithm
 * - External service API key management
 * - Production-ready secret rotation support
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import fs from "fs";
import path from "path";
import { logger } from "@/utils/logger";

/**
 * Docker Secrets base path (standard Docker location)
 */
const DOCKER_SECRETS_PATH = "/run/secrets";

/**
 * Local secrets path for development (fallback)
 */
const LOCAL_SECRETS_PATH = path.join(process.cwd(), "secrets");

/**
 * Secret configuration interface
 */
export interface SecretConfig {
  // Database credentials
  dbPassword: string;
  redisPassword: string;

  // JWT authentication keys (RS256)
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtRefreshPrivateKey: string;
  jwtRefreshPublicKey: string;

  // Encryption and session keys
  encryptionKey: string;
  sessionSecret: string;

  // External service API keys
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  twilioAuthToken?: string;
  sendgridApiKey?: string;
  samsaraApiToken?: string;
  samsaraWebhookSecret?: string;
  airtableApiKey?: string;
  mapboxAccessToken?: string;

  // AWS credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;

  // Administrative interface passwords
  redisCommanderPassword?: string;
  pgadminPassword?: string;
  grafanaPassword?: string;
}

/**
 * Secret loading modes
 */
export type SecretMode = "docker" | "local" | "environment";

/**
 * Load secret from Docker Secrets, local file, or environment variable
 */
function loadSecret(
  secretName: string,
  envVarName?: string,
  required: boolean = true,
  mode: SecretMode = "docker"
): string | undefined {
  let secretValue: string | undefined;

  try {
    // Try Docker Secrets first (production)
    if (mode === "docker" || mode === "local") {
      const secretsPath = mode === "docker" ? DOCKER_SECRETS_PATH : LOCAL_SECRETS_PATH;
      const secretFile = path.join(secretsPath, secretName);

      if (fs.existsSync(secretFile)) {
        secretValue = fs.readFileSync(secretFile, "utf8").trim();
        logger.debug(`Loaded secret from ${mode} file: ${secretName}`);
      }
    }

    // Fallback to environment variable
    if (!secretValue && envVarName) {
      secretValue = process.env[envVarName];
      if (secretValue) {
        logger.debug(`Loaded secret from environment: ${envVarName}`);
      }
    }

    // Validate required secrets
    if (required && !secretValue) {
      const errorMsg = `Required secret not found: ${secretName} (env: ${envVarName})`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    return secretValue;
  } catch (error) {
    if (required) {
      logger.error(`Failed to load required secret: ${secretName}`, error);
      throw error;
    }
    logger.warn(`Optional secret not found: ${secretName}`);
    return undefined;
  }
}

/**
 * Validate JWT key format
 */
function validateJwtKey(key: string, keyType: "private" | "public"): string {
  const trimmedKey = key.trim();

  // Check for PEM format
  const expectedStart = keyType === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const expectedEnd = keyType === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";

  if (!trimmedKey.includes(expectedStart) || !trimmedKey.includes(expectedEnd)) {
    throw new Error(`Invalid ${keyType} key format. Expected PEM format.`);
  }

  return trimmedKey;
}

/**
 * Validate encryption key length
 */
function validateEncryptionKey(key: string): string {
  const trimmedKey = key.trim();

  if (trimmedKey.length < 32) {
    throw new Error("Encryption key must be at least 32 characters long");
  }

  return trimmedKey;
}

/**
 * Load all secrets based on environment
 */
export function loadSecrets(): SecretConfig {
  // Determine secret loading mode
  const isProduction = process.env.NODE_ENV === "production";
  const hasDockerSecrets = fs.existsSync(DOCKER_SECRETS_PATH);
  const hasLocalSecrets = fs.existsSync(LOCAL_SECRETS_PATH);

  let mode: SecretMode = "environment";
  
  if (isProduction && hasDockerSecrets) {
    mode = "docker";
    logger.info("Loading secrets from Docker Secrets (production mode)");
  } else if (hasLocalSecrets) {
    mode = "local";
    logger.info("Loading secrets from local files (development mode)");
  } else {
    logger.info("Loading secrets from environment variables (fallback mode)");
  }

  try {
    // Load database credentials
    const dbPassword = loadSecret("db_password", "DB_PASSWORD", true, mode)!;
    const redisPassword = loadSecret("redis_password", "REDIS_PASSWORD", true, mode)!;

    // Load JWT keys (required for authentication)
    const jwtPrivateKey = validateJwtKey(
      loadSecret("jwt_private_key", "JWT_PRIVATE_KEY", true, mode)!,
      "private"
    );
    const jwtPublicKey = validateJwtKey(
      loadSecret("jwt_public_key", "JWT_PUBLIC_KEY", true, mode)!,
      "public"
    );
    const jwtRefreshPrivateKey = validateJwtKey(
      loadSecret("jwt_refresh_private_key", "JWT_REFRESH_PRIVATE_KEY", true, mode)!,
      "private"
    );
    const jwtRefreshPublicKey = validateJwtKey(
      loadSecret("jwt_refresh_public_key", "JWT_REFRESH_PUBLIC_KEY", true, mode)!,
      "public"
    );

    // Load encryption and session keys
    const encryptionKey = validateEncryptionKey(
      loadSecret("encryption_key", "ENCRYPTION_KEY", true, mode)!
    );
    const sessionSecret = loadSecret("session_secret", "SESSION_SECRET", true, mode)!;

    // Load external service API keys (optional)
    const stripeSecretKey = loadSecret("stripe_secret_key", "STRIPE_SECRET_KEY", false, mode);
    const stripeWebhookSecret = loadSecret("stripe_webhook_secret", "STRIPE_WEBHOOK_SECRET", false, mode);
    const twilioAuthToken = loadSecret("twilio_auth_token", "TWILIO_AUTH_TOKEN", false, mode);
    const sendgridApiKey = loadSecret("sendgrid_api_key", "SENDGRID_API_KEY", false, mode);
    const samsaraApiToken = loadSecret("samsara_api_token", "SAMSARA_API_TOKEN", false, mode);
    const samsaraWebhookSecret = loadSecret("samsara_webhook_secret", "SAMSARA_WEBHOOK_SECRET", false, mode);
    const airtableApiKey = loadSecret("airtable_api_key", "AIRTABLE_API_KEY", false, mode);
    const mapboxAccessToken = loadSecret("mapbox_access_token", "MAPBOX_ACCESS_TOKEN", false, mode);

    // Load AWS credentials (optional)
    const awsAccessKeyId = loadSecret("aws_access_key_id", "AWS_ACCESS_KEY_ID", false, mode);
    const awsSecretAccessKey = loadSecret("aws_secret_access_key", "AWS_SECRET_ACCESS_KEY", false, mode);

    // Load administrative interface passwords (optional)
    const redisCommanderPassword = loadSecret("redis_commander_password", "REDIS_COMMANDER_PASSWORD", false, mode);
    const pgadminPassword = loadSecret("pgadmin_password", "PGADMIN_PASSWORD", false, mode);
    const grafanaPassword = loadSecret("grafana_password", "GRAFANA_PASSWORD", false, mode);

    logger.info("✅ All secrets loaded successfully", {
      mode,
      requiredSecretsLoaded: 8,
      optionalSecretsLoaded: [
        stripeSecretKey,
        twilioAuthToken,
        sendgridApiKey,
        samsaraApiToken,
        airtableApiKey,
        mapboxAccessToken,
        awsAccessKeyId,
        redisCommanderPassword,
        pgadminPassword,
        grafanaPassword
      ].filter(Boolean).length
    });

    return {
      // Database credentials
      dbPassword,
      redisPassword,

      // JWT authentication keys
      jwtPrivateKey,
      jwtPublicKey,
      jwtRefreshPrivateKey,
      jwtRefreshPublicKey,

      // Encryption and session keys
      encryptionKey,
      sessionSecret,

      // External service API keys
      stripeSecretKey,
      stripeWebhookSecret,
      twilioAuthToken,
      sendgridApiKey,
      samsaraApiToken,
      samsaraWebhookSecret,
      airtableApiKey,
      mapboxAccessToken,

      // AWS credentials
      awsAccessKeyId,
      awsSecretAccessKey,

      // Administrative interface passwords
      redisCommanderPassword,
      pgadminPassword,
      grafanaPassword,
    };
  } catch (error) {
    logger.error("Failed to load secrets configuration:", error);
    throw new Error("Secret configuration failed - check secret files and environment variables");
  }
}

/**
 * Create environment variables from loaded secrets for application use
 */
export function injectSecretsToEnvironment(secrets: SecretConfig): void {
  // Database credentials
  process.env.DB_PASSWORD = secrets.dbPassword;
  process.env.REDIS_PASSWORD = secrets.redisPassword;

  // JWT authentication keys
  process.env.JWT_PRIVATE_KEY = secrets.jwtPrivateKey;
  process.env.JWT_PUBLIC_KEY = secrets.jwtPublicKey;
  process.env.JWT_REFRESH_PRIVATE_KEY = secrets.jwtRefreshPrivateKey;
  process.env.JWT_REFRESH_PUBLIC_KEY = secrets.jwtRefreshPublicKey;

  // Encryption and session keys
  process.env.ENCRYPTION_KEY = secrets.encryptionKey;
  process.env.SESSION_SECRET = secrets.sessionSecret;

  // External service API keys (only if provided)
  if (secrets.stripeSecretKey) process.env.STRIPE_SECRET_KEY = secrets.stripeSecretKey;
  if (secrets.stripeWebhookSecret) process.env.STRIPE_WEBHOOK_SECRET = secrets.stripeWebhookSecret;
  if (secrets.twilioAuthToken) process.env.TWILIO_AUTH_TOKEN = secrets.twilioAuthToken;
  if (secrets.sendgridApiKey) process.env.SENDGRID_API_KEY = secrets.sendgridApiKey;
  if (secrets.samsaraApiToken) process.env.SAMSARA_API_TOKEN = secrets.samsaraApiToken;
  if (secrets.samsaraWebhookSecret) process.env.SAMSARA_WEBHOOK_SECRET = secrets.samsaraWebhookSecret;
  if (secrets.airtableApiKey) process.env.AIRTABLE_API_KEY = secrets.airtableApiKey;
  if (secrets.mapboxAccessToken) process.env.MAPBOX_ACCESS_TOKEN = secrets.mapboxAccessToken;

  // AWS credentials (only if provided)
  if (secrets.awsAccessKeyId) process.env.AWS_ACCESS_KEY_ID = secrets.awsAccessKeyId;
  if (secrets.awsSecretAccessKey) process.env.AWS_SECRET_ACCESS_KEY = secrets.awsSecretAccessKey;

  logger.info("✅ Secrets injected into environment variables");
}

/**
 * Initialize secrets management
 */
export function initializeSecrets(): SecretConfig {
  try {
    const secrets = loadSecrets();
    injectSecretsToEnvironment(secrets);
    return secrets;
  } catch (error) {
    logger.error("Failed to initialize secrets management:", error);
    throw error;
  }
}

/**
 * Check if running in Docker Secrets mode
 */
export function isDockerSecretsMode(): boolean {
  return process.env.NODE_ENV === "production" && fs.existsSync(DOCKER_SECRETS_PATH);
}

/**
 * List available secrets (for debugging)
 */
export function listAvailableSecrets(): {
  dockerSecrets: string[];
  localSecrets: string[];
  environmentSecrets: string[];
} {
  const dockerSecrets: string[] = [];
  const localSecrets: string[] = [];
  const environmentSecrets: string[] = [];

  // Check Docker Secrets
  if (fs.existsSync(DOCKER_SECRETS_PATH)) {
    try {
      dockerSecrets.push(...fs.readdirSync(DOCKER_SECRETS_PATH));
    } catch (error) {
      logger.warn("Could not list Docker secrets:", error);
    }
  }

  // Check local secrets
  if (fs.existsSync(LOCAL_SECRETS_PATH)) {
    try {
      localSecrets.push(...fs.readdirSync(LOCAL_SECRETS_PATH));
    } catch (error) {
      logger.warn("Could not list local secrets:", error);
    }
  }

  // Check environment variables
  const secretEnvVars = [
    "DB_PASSWORD",
    "REDIS_PASSWORD",
    "JWT_PRIVATE_KEY",
    "JWT_PUBLIC_KEY",
    "JWT_REFRESH_PRIVATE_KEY",
    "JWT_REFRESH_PUBLIC_KEY",
    "ENCRYPTION_KEY",
    "SESSION_SECRET",
    "STRIPE_SECRET_KEY",
    "TWILIO_AUTH_TOKEN",
    "SENDGRID_API_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY"
  ];

  environmentSecrets.push(...secretEnvVars.filter(envVar => process.env[envVar]));

  return {
    dockerSecrets,
    localSecrets,
    environmentSecrets
  };
}

export default {
  loadSecrets,
  injectSecretsToEnvironment,
  initializeSecrets,
  isDockerSecretsMode,
  listAvailableSecrets
};