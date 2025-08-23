/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CRYPTO ERROR RESILIENCE SERVICE
 * ============================================================================
 *
 * Comprehensive error resilience system for MFA encryption/decryption operations.
 * Provides bulletproof error handling, graceful degradation, and recovery
 * strategies for cryptographic operations.
 *
 * Security Features:
 * - Comprehensive error classification for crypto operations
 * - Safe error handling without data leakage
 * - Automatic recovery strategies for recoverable errors
 * - Circuit breaker patterns for encryption services
 * - Fallback mechanisms for corrupted data scenarios
 * - Security event logging and monitoring
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-20
 * Version: 1.0.0 - Comprehensive Crypto Error Handling
 */

import { BaseService, ServiceResult } from "../BaseService";
import { logger, Timer, logSecurityEvent } from "@/utils/logger";
import { 
  AppError, 
  AuthenticationError,
  ConfigurationError,
  DatabaseOperationError 
} from "@/middleware/errorHandler";
import { 
  encryptSensitiveData, 
  decryptSensitiveData,
  encryptDatabaseField,
  decryptDatabaseField,
  rotateEncryptionKey,
  isEncrypted
} from "@/utils/encryption";
import { config } from "@/config";

/**
 * =============================================================================
 * CRYPTO ERROR CLASSIFICATION
 * =============================================================================
 */

/**
 * Crypto error types for comprehensive classification
 */
export enum CryptoErrorType {
  // Configuration errors
  MISSING_ENCRYPTION_KEY = 'MISSING_ENCRYPTION_KEY',
  INVALID_ENCRYPTION_KEY = 'INVALID_ENCRYPTION_KEY',
  KEY_ROTATION_FAILED = 'KEY_ROTATION_FAILED',
  
  // Data integrity errors
  CORRUPTED_ENCRYPTED_DATA = 'CORRUPTED_ENCRYPTED_DATA',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  AUTHENTICATION_TAG_MISMATCH = 'AUTHENTICATION_TAG_MISMATCH',
  
  // Operation errors
  ENCRYPTION_OPERATION_FAILED = 'ENCRYPTION_OPERATION_FAILED',
  DECRYPTION_OPERATION_FAILED = 'DECRYPTION_OPERATION_FAILED',
  MFA_SECRET_CORRUPTION = 'MFA_SECRET_CORRUPTION',
  
  // System errors
  CRYPTO_SERVICE_UNAVAILABLE = 'CRYPTO_SERVICE_UNAVAILABLE',
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  TIMEOUT_DURING_CRYPTO_OP = 'TIMEOUT_DURING_CRYPTO_OP',
  
  // Recovery errors
  FALLBACK_ENCRYPTION_FAILED = 'FALLBACK_ENCRYPTION_FAILED',
  BACKUP_KEY_UNAVAILABLE = 'BACKUP_KEY_UNAVAILABLE',
  RECOVERY_MECHANISM_FAILED = 'RECOVERY_MECHANISM_FAILED'
}

/**
 * Crypto error severity levels
 */
export enum CryptoErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Crypto error context for comprehensive logging
 */
export interface CryptoErrorContext {
  operation: string;
  dataType: 'mfa_secret' | 'user_data' | 'session_data' | 'database_field';
  errorType: CryptoErrorType;
  severity: CryptoErrorSeverity;
  recoverable: boolean;
  userId?: string;
  fieldName?: string;
  attemptCount?: number;
  timestamp: Date;
  additionalData?: any;
}

/**
 * Crypto recovery strategy interface
 */
export interface CryptoRecoveryStrategy {
  canRecover(error: CryptoErrorContext): boolean;
  recover(data: any, context: CryptoErrorContext): Promise<any>;
  estimatedRecoveryTime: number; // milliseconds
  maxAttempts: number;
}

/**
 * =============================================================================
 * CRYPTO ERROR RESILIENCE SERVICE
 * =============================================================================
 */

export class CryptoErrorResilienceService extends BaseService<any> {
  private recoveryStrategies: Map<CryptoErrorType, CryptoRecoveryStrategy> = new Map();
  private circuitBreaker: Map<string, { 
    failures: number; 
    lastFailure: Date; 
    isOpen: boolean;
    threshold: number;
    timeout: number;
  }> = new Map();
  
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RECOVERY_TIMEOUT = 5000; // 5 seconds

  constructor() {
    super(null as any, "CryptoErrorResilienceService");
    this.initializeRecoveryStrategies();
    this.initializeCircuitBreakers();
  }

  /**
   * =============================================================================
   * PRIMARY RESILIENCE METHODS
   * =============================================================================
   */

  /**
   * Resilient MFA secret encryption with comprehensive error handling
   */
  public async encryptMFASecretSafely(
    secret: string,
    userId: string
  ): Promise<ServiceResult<string>> {
    const timer = new Timer('CryptoErrorResilienceService.encryptMFASecretSafely');
    
    try {
      // Validate input
      if (!secret || !userId) {
        throw new AppError("Secret and user ID are required", 400);
      }

      // Check circuit breaker
      if (this.isCircuitBreakerOpen('mfa_encryption')) {
        throw new AppError(
          "MFA encryption service temporarily unavailable",
          503,
          CryptoErrorType.CRYPTO_SERVICE_UNAVAILABLE
        );
      }

      // Attempt encryption with retry logic
      let lastError: any = null;
      for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const encrypted = await this.executeWithTimeout(
            () => encryptSensitiveData(secret, true),
            this.RECOVERY_TIMEOUT,
            'MFA Secret Encryption'
          );

          // Verify encryption was successful
          await this.verifyEncryptionIntegrity(encrypted);

          // Reset circuit breaker on success
          this.resetCircuitBreaker('mfa_encryption');

          const executionTime = timer.end({ 
            success: true, 
            attempt,
            userId: this.maskUserId(userId)
          });

          logger.info("MFA secret encrypted successfully", {
            userId: this.maskUserId(userId),
            attempt,
            executionTime
          });

          return {
            success: true,
            data: encrypted,
            message: "MFA secret encrypted successfully"
          };

        } catch (error: unknown) {
          lastError = error;
          const errorContext = this.createErrorContext(
            'encrypt_mfa_secret',
            'mfa_secret',
            error,
            userId,
            attempt
          );

          // Log attempt failure
          logger.warn("MFA encryption attempt failed", {
            userId: this.maskUserId(userId),
            attempt,
            maxAttempts: this.MAX_RETRY_ATTEMPTS,
            error: error instanceof Error ? error?.message : String(error),
            errorType: errorContext.errorType
          });

          // Try recovery if possible
          const recoveryResult = await this.attemptRecovery(secret, errorContext);
          if (recoveryResult.success) {
            timer.end({ success: true, recovered: true, attempt });
            return recoveryResult;
          }

          // Wait before retry (exponential backoff)
          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            await this.waitWithBackoff(attempt);
          }
        }
      }

      // All attempts failed
      this.recordCircuitBreakerFailure('mfa_encryption');
      timer.end({ error: lastError?.message, maxAttemptsReached: true });

      // Log security event for failed encryption
      logSecurityEvent(
        'mfa_encryption_failed',
        {
          userId: this.maskUserId(userId),
          attempts: this.MAX_RETRY_ATTEMPTS,
          error: lastError?.message
        },
        userId,
        undefined,
        'high'
      );

      return {
        success: false,
        message: "MFA secret encryption failed after multiple attempts",
        errors: [{
          code: CryptoErrorType.ENCRYPTION_OPERATION_FAILED,
          message: "Unable to encrypt MFA secret securely"
        }]
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return this.handleCriticalError(error, 'encrypt_mfa_secret', userId);
    }
  }

  /**
   * Resilient MFA secret decryption with comprehensive error handling
   */
  public async decryptMFASecretSafely(
    encryptedSecret: string,
    userId: string
  ): Promise<ServiceResult<string>> {
    const timer = new Timer('CryptoErrorResilienceService.decryptMFASecretSafely');
    
    try {
      // Validate input
      if (!encryptedSecret || !userId) {
        throw new AppError("Encrypted secret and user ID are required", 400);
      }

      // Check circuit breaker
      if (this.isCircuitBreakerOpen('mfa_decryption')) {
        throw new AppError(
          "MFA decryption service temporarily unavailable",
          503,
          CryptoErrorType.CRYPTO_SERVICE_UNAVAILABLE
        );
      }

      // Validate encrypted data format
      if (!isEncrypted(encryptedSecret)) {
        const errorContext = this.createErrorContext(
          'decrypt_mfa_secret',
          'mfa_secret',
          new Error("Invalid encrypted data format"),
          userId
        );
        
        return await this.handleDataCorruption(encryptedSecret, errorContext);
      }

      // Attempt decryption with retry logic
      let lastError: any = null;
      for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const decrypted = await this.executeWithTimeout(
            () => decryptSensitiveData(encryptedSecret),
            this.RECOVERY_TIMEOUT,
            'MFA Secret Decryption'
          );

          // Validate decrypted data
          if (!decrypted || typeof decrypted !== 'string') {
            throw new Error("Decrypted data validation failed");
          }

          // Reset circuit breaker on success
          this.resetCircuitBreaker('mfa_decryption');

          const executionTime = timer.end({ 
            success: true, 
            attempt,
            userId: this.maskUserId(userId)
          });

          logger.info("MFA secret decrypted successfully", {
            userId: this.maskUserId(userId),
            attempt,
            executionTime
          });

          return {
            success: true,
            data: decrypted,
            message: "MFA secret decrypted successfully"
          };

        } catch (error: unknown) {
          lastError = error;
          const errorContext = this.createErrorContext(
            'decrypt_mfa_secret',
            'mfa_secret',
            error,
            userId,
            attempt
          );

          // Check for data corruption
          if (this.isDataCorruptionError(error)) {
            return await this.handleDataCorruption(encryptedSecret, errorContext);
          }

          // Log attempt failure
          logger.warn("MFA decryption attempt failed", {
            userId: this.maskUserId(userId),
            attempt,
            maxAttempts: this.MAX_RETRY_ATTEMPTS,
            error: error instanceof Error ? error?.message : String(error),
            errorType: errorContext.errorType
          });

          // Wait before retry (exponential backoff)
          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            await this.waitWithBackoff(attempt);
          }
        }
      }

      // All attempts failed
      this.recordCircuitBreakerFailure('mfa_decryption');
      timer.end({ error: lastError?.message, maxAttemptsReached: true });

      // Log security event for failed decryption
      logSecurityEvent(
        'mfa_decryption_failed',
        {
          userId: this.maskUserId(userId),
          attempts: this.MAX_RETRY_ATTEMPTS,
          error: lastError?.message,
          dataCorrupted: this.isDataCorruptionError(lastError)
        },
        userId,
        undefined,
        'high'
      );

      return {
        success: false,
        message: "MFA secret decryption failed after multiple attempts",
        errors: [{
          code: CryptoErrorType.DECRYPTION_OPERATION_FAILED,
          message: "Unable to decrypt MFA secret securely"
        }]
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return this.handleCriticalError(error, 'decrypt_mfa_secret', userId);
    }
  }

  /**
   * Resilient database field encryption with error boundaries
   */
  public async encryptDatabaseFieldSafely(
    value: string,
    fieldName: string,
    context?: any
  ): Promise<ServiceResult<string | null>> {
    const timer = new Timer('CryptoErrorResilienceService.encryptDatabaseFieldSafely');
    
    try {
      if (!value || value.trim() === "") {
        return {
          success: true,
          data: null,
          message: "Empty value, no encryption needed"
        };
      }

      // Check circuit breaker
      const circuitKey = `field_encryption_${fieldName}`;
      if (this.isCircuitBreakerOpen(circuitKey)) {
        return {
          success: false,
          message: "Field encryption service temporarily unavailable",
          errors: [{
            code: CryptoErrorType.CRYPTO_SERVICE_UNAVAILABLE,
            message: "Service circuit breaker is open"
          }]
        };
      }

      // Attempt encryption
      try {
        const encrypted = await encryptDatabaseField(value.trim());
        this.resetCircuitBreaker(circuitKey);
        
        timer.end({ success: true, fieldName });
        return {
          success: true,
          data: encrypted,
          message: "Database field encrypted successfully"
        };

      } catch (error: unknown) {
        this.recordCircuitBreakerFailure(circuitKey);
        
        logger.error("Database field encryption failed", {
          fieldName,
          error: error instanceof Error ? error?.message : String(error),
          context
        });

        return {
          success: false,
          message: "Database field encryption failed",
          errors: [{
            code: CryptoErrorType.ENCRYPTION_OPERATION_FAILED,
            message: error instanceof Error ? error?.message : String(error)
          }]
        };
      }

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return {
        success: false,
        message: "Critical error in database field encryption",
        errors: [{ code: CryptoErrorType.ENCRYPTION_OPERATION_FAILED, message: error instanceof Error ? error?.message : String(error) }]
      };
    }
  }

  /**
   * Resilient database field decryption with error boundaries
   */
  public async decryptDatabaseFieldSafely(
    encryptedValue: string | null,
    fieldName: string,
    context?: any
  ): Promise<ServiceResult<string | null>> {
    const timer = new Timer('CryptoErrorResilienceService.decryptDatabaseFieldSafely');
    
    try {
      if (!encryptedValue) {
        return {
          success: true,
          data: null,
          message: "No encrypted value provided"
        };
      }

      // Check circuit breaker
      const circuitKey = `field_decryption_${fieldName}`;
      if (this.isCircuitBreakerOpen(circuitKey)) {
        return {
          success: false,
          message: "Field decryption service temporarily unavailable",
          errors: [{
            code: CryptoErrorType.CRYPTO_SERVICE_UNAVAILABLE,
            message: "Service circuit breaker is open"
          }],
          fallback: true
        };
      }

      // Attempt decryption
      try {
        const decrypted = await decryptDatabaseField(encryptedValue);
        this.resetCircuitBreaker(circuitKey);
        
        timer.end({ success: true, fieldName });
        return {
          success: true,
          data: decrypted,
          message: "Database field decrypted successfully"
        };

      } catch (error: unknown) {
        this.recordCircuitBreakerFailure(circuitKey);
        
        logger.error("Database field decryption failed", {
          fieldName,
          error: error instanceof Error ? error?.message : String(error),
          context,
          dataCorrupted: this.isDataCorruptionError(error)
        });

        // Return null for corrupted data to prevent application crashes
        return {
          success: true, // Don't fail the request
          data: null,
          message: "Database field decryption failed, returning null",
          errors: [{
            code: CryptoErrorType.CORRUPTED_ENCRYPTED_DATA,
            message: "Field data may be corrupted"
          }],
          fallback: true
        };
      }

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return {
        success: true, // Don't fail the request
        data: null,
        message: "Critical error in database field decryption, returning null",
        fallback: true
      };
    }
  }

  /**
   * =============================================================================
   * ERROR RECOVERY AND CIRCUIT BREAKER METHODS
   * =============================================================================
   */

  /**
   * Initialize recovery strategies for different error types
   */
  private initializeRecoveryStrategies(): void {
    // Key rotation recovery strategy
    this.recoveryStrategies.set(CryptoErrorType.KEY_ROTATION_FAILED, {
      canRecover: (context) => context.recoverable && context.attemptCount! < 3,
      recover: async (data, context) => {
        return await rotateEncryptionKey(data);
      },
      estimatedRecoveryTime: 3000,
      maxAttempts: 3
    });

    // Corrupted data recovery strategy
    this.recoveryStrategies.set(CryptoErrorType.CORRUPTED_ENCRYPTED_DATA, {
      canRecover: (context) => context.dataType === 'database_field',
      recover: async (data, context) => {
        // For database fields, return null to prevent crashes
        return null;
      },
      estimatedRecoveryTime: 100,
      maxAttempts: 1
    });

    // Configuration error recovery strategy
    this.recoveryStrategies.set(CryptoErrorType.MISSING_ENCRYPTION_KEY, {
      canRecover: (context) => false, // Cannot recover without key
      recover: async (data, context) => {
        throw new ConfigurationError("Encryption key must be configured");
      },
      estimatedRecoveryTime: 0,
      maxAttempts: 0
    });
  }

  /**
   * Initialize circuit breakers for crypto operations
   */
  private initializeCircuitBreakers(): void {
    const operations = [
      'mfa_encryption',
      'mfa_decryption',
      'field_encryption',
      'field_decryption'
    ];

    operations.forEach(operation => {
      this.circuitBreaker.set(operation, {
        failures: 0,
        lastFailure: new Date(0),
        isOpen: false,
        threshold: this.CIRCUIT_BREAKER_THRESHOLD,
        timeout: this.CIRCUIT_BREAKER_TIMEOUT
      });
    });
  }

  /**
   * Check if circuit breaker is open for an operation
   */
  private isCircuitBreakerOpen(operation: string): boolean {
    const breaker = this.circuitBreaker.get(operation);
    if (!breaker) return false;

    if (breaker.isOpen) {
      // Check if timeout has elapsed
      if (Date.now() - breaker.lastFailure.getTime() > breaker.timeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(operation: string): void {
    const breaker = this.circuitBreaker.get(operation);
    if (!breaker) return;

    breaker.failures += 1;
    breaker.lastFailure = new Date();

    if (breaker.failures >= breaker.threshold) {
      breaker.isOpen = true;
      logger.warn("Circuit breaker opened", {
        operation,
        failures: breaker.failures,
        threshold: breaker.threshold
      });
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(operation: string): void {
    const breaker = this.circuitBreaker.get(operation);
    if (!breaker) return;

    breaker.failures = 0;
    breaker.isOpen = false;
  }

  /**
   * =============================================================================
   * HELPER METHODS
   * =============================================================================
   */

  /**
   * Create error context for comprehensive logging
   */
  private createErrorContext(
    operation: string,
    dataType: 'mfa_secret' | 'user_data' | 'session_data' | 'database_field',
    error: any,
    userId?: string,
    attemptCount = 1
  ): CryptoErrorContext {
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, dataType);
    
    return {
      operation,
      dataType,
      errorType,
      severity,
      recoverable: this.isRecoverable(errorType),
      userId,
      attemptCount,
      timestamp: new Date(),
      additionalData: {
        errorMessage: error instanceof Error ? error?.message : String(error),
        errorCode: error.code,
        errorName: error.name
      }
    };
  }

  /**
   * Classify error type based on error characteristics
   */
  private classifyError(error: any): CryptoErrorType {
    if (error instanceof Error ? error?.message : String(error)?.includes('master key not configured')) {
      return CryptoErrorType.MISSING_ENCRYPTION_KEY;
    }
    if (error instanceof Error ? error?.message : String(error)?.includes('authentication tag')) {
      return CryptoErrorType.AUTHENTICATION_TAG_MISMATCH;
    }
    if (error instanceof Error ? error?.message : String(error)?.includes('Invalid encrypted data')) {
      return CryptoErrorType.INVALID_DATA_FORMAT;
    }
    if (error instanceof Error ? error?.message : String(error)?.includes('decryption failed')) {
      return CryptoErrorType.DECRYPTION_OPERATION_FAILED;
    }
    if (error instanceof Error ? error?.message : String(error)?.includes('encryption failed')) {
      return CryptoErrorType.ENCRYPTION_OPERATION_FAILED;
    }
    if (error.name === 'TimeoutError') {
      return CryptoErrorType.TIMEOUT_DURING_CRYPTO_OP;
    }
    
    return CryptoErrorType.ENCRYPTION_OPERATION_FAILED;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    errorType: CryptoErrorType, 
    dataType: string
  ): CryptoErrorSeverity {
    if (dataType === 'mfa_secret') {
      return CryptoErrorSeverity.HIGH;
    }
    
    switch (errorType) {
      case CryptoErrorType.MISSING_ENCRYPTION_KEY:
      case CryptoErrorType.AUTHENTICATION_TAG_MISMATCH:
        return CryptoErrorSeverity.CRITICAL;
      case CryptoErrorType.CORRUPTED_ENCRYPTED_DATA:
      case CryptoErrorType.MFA_SECRET_CORRUPTION:
        return CryptoErrorSeverity.HIGH;
      case CryptoErrorType.TIMEOUT_DURING_CRYPTO_OP:
        return CryptoErrorSeverity.MEDIUM;
      default:
        return CryptoErrorSeverity.LOW;
    }
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(errorType: CryptoErrorType): boolean {
    const nonRecoverableErrors = [
      CryptoErrorType.MISSING_ENCRYPTION_KEY,
      CryptoErrorType.INVALID_ENCRYPTION_KEY,
      CryptoErrorType.AUTHENTICATION_TAG_MISMATCH
    ];
    
    return !nonRecoverableErrors.includes(errorType);
  }

  /**
   * Check if error indicates data corruption
   */
  private isDataCorruptionError(error: any): boolean {
    const corruptionIndicators = [
      'authentication tag',
      'Invalid encrypted data',
      'data may be corrupted',
      'JSON parse',
      'invalid base64'
    ];
    
    return corruptionIndicators.some(indicator => 
      error instanceof Error ? error?.message : String(error)?.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Attempt recovery using registered strategies
   */
  private async attemptRecovery(
    data: any,
    context: CryptoErrorContext
  ): Promise<ServiceResult<any>> {
    const strategy = this.recoveryStrategies.get(context.errorType);
    if (!strategy || !strategy.canRecover(context)) {
      return { success: false, message: "No recovery strategy available" };
    }

    try {
      const recovered = await strategy.recover(data, context);
      return { success: true, data: recovered, message: "Recovery successful" };
    } catch (error: unknown) {
      logger.error("Recovery strategy failed", {
        errorType: context.errorType,
        recoveryError: error instanceof Error ? error?.message : String(error)
      });
      return { success: false, message: "Recovery strategy failed" };
    }
  }

  /**
   * Handle data corruption scenarios
   */
  private async handleDataCorruption(
    data: any,
    context: CryptoErrorContext
  ): Promise<ServiceResult<any>> {
    logger.error("Data corruption detected", {
      operation: context.operation,
      dataType: context.dataType,
      userId: context.userId ? this.maskUserId(context.userId) : undefined,
      timestamp: context.timestamp
    });

    // For MFA secrets, this is critical
    if (context.dataType === 'mfa_secret') {
      logSecurityEvent(
        'mfa_data_corruption',
        {
          userId: context.userId ? this.maskUserId(context.userId) : undefined,
          operation: context.operation,
          severity: 'critical'
        },
        context.userId,
        undefined,
        'critical'
      );

      return {
        success: false,
        message: "MFA secret is corrupted and cannot be recovered",
        errors: [{
          code: CryptoErrorType.MFA_SECRET_CORRUPTION,
          message: "MFA secret must be reset by user"
        }]
      };
    }

    // For database fields, return null gracefully
    return {
      success: true,
      data: null,
      message: "Corrupted data handled gracefully",
      fallback: true
    };
  }

  /**
   * Handle critical errors
   */
  private async handleCriticalError(
    error: any,
    operation: string,
    userId?: string
  ): Promise<ServiceResult<any>> {
    logger.error("Critical crypto error", {
      operation,
      userId: userId ? this.maskUserId(userId) : undefined,
      error: error instanceof Error ? error?.message : String(error),
      stack: error instanceof Error ? error?.stack : undefined
    });

    logSecurityEvent(
      'critical_crypto_error',
      {
        operation,
        userId: userId ? this.maskUserId(userId) : undefined,
        error: error instanceof Error ? error?.message : String(error)
      },
      userId,
      undefined,
      'critical'
    );

    return {
      success: false,
      message: "Critical cryptographic error occurred",
      errors: [{
        code: CryptoErrorType.CRYPTO_SERVICE_UNAVAILABLE,
        message: "Cryptographic service is temporarily unavailable"
      }]
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Wait with exponential backoff
   */
  private async waitWithBackoff(attempt: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Verify encryption integrity
   */
  private async verifyEncryptionIntegrity(encrypted: string): Promise<void> {
    try {
      // Verify the encrypted data can be parsed
      const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      if (!parsed.data || !parsed.iv || !parsed.tag) {
        throw new Error("Invalid encrypted data structure");
      }
    } catch (error: unknown) {
      throw new Error(`Encryption integrity check failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Mask user ID for logging
   */
  private maskUserId(userId: string): string {
    if (userId.length <= 8) {
      return '*'.repeat(userId.length);
    }
    return userId.substring(0, 4) + '*'.repeat(userId.length - 8) + userId.substring(userId.length - 4);
  }
}

export default CryptoErrorResilienceService;