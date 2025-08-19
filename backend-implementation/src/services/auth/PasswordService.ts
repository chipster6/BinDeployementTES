/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PASSWORD SERVICE
 * ============================================================================
 *
 * Dedicated service for password-related operations.
 * Extracted from UserService and AuthController for better separation of concerns.
 *
 * Responsibilities:
 * - Password validation and strength checking
 * - Password hashing and verification
 * - Password change operations
 * - Password reset functionality
 * - Password policy enforcement
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-18
 * Version: 1.0.0
 */

import bcrypt from "bcrypt";
import { User } from "@/models/User";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { logger } from "@/utils/logger";
import { Result, AppErrors } from "@/types/Result";
import { ValidationError, AuthenticationError } from "@/middleware/errorHandler";

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
  newPassword: string;
  resetToken: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Common weak passwords (subset for demonstration)
 */
const COMMON_WEAK_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'shadow', 'football', 'baseball',
  'superman', 'batman', 'trustno1', 'iloveyou', 'princess'
]);

/**
 * Default password requirements
 */
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
};

/**
 * Password Service
 */
export class PasswordService {
  private requirements: PasswordRequirements;
  private saltRounds: number;

  constructor(requirements: PasswordRequirements = DEFAULT_REQUIREMENTS) {
    this.requirements = requirements;
    this.saltRounds = 12; // bcrypt salt rounds
  }

  /**
   * Validate password strength and requirements
   */
  public validatePassword(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
  ): PasswordValidation {
    const feedback: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < this.requirements.minLength) {
      feedback.push(`Password must be at least ${this.requirements.minLength} characters long`);
    } else if (password.length >= this.requirements.minLength) {
      score += 20;
    }

    if (password.length > this.requirements.maxLength) {
      feedback.push(`Password must not exceed ${this.requirements.maxLength} characters`);
    }

    // Character type requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    if (this.requirements.requireUppercase && !hasUppercase) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      score += 15;
    }

    if (this.requirements.requireLowercase && !hasLowercase) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      score += 15;
    }

    if (this.requirements.requireNumbers && !hasNumbers) {
      feedback.push('Password must contain at least one number');
    } else if (hasNumbers) {
      score += 15;
    }

    if (this.requirements.requireSpecialChars && !hasSpecialChars) {
      feedback.push('Password must contain at least one special character');
    } else if (hasSpecialChars) {
      score += 15;
    }

    // Check for common weak passwords
    if (this.requirements.preventCommonPasswords) {
      if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
        feedback.push('Password is too common and easily guessable');
        score = Math.max(0, score - 30);
      }
    }

    // Check for user information in password
    if (this.requirements.preventUserInfoInPassword && userInfo) {
      const lowercasePassword = password.toLowerCase();
      
      if (userInfo.email && lowercasePassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
        feedback.push('Password should not contain your email address');
        score = Math.max(0, score - 20);
      }
      
      if (userInfo.firstName && lowercasePassword.includes(userInfo.firstName.toLowerCase())) {
        feedback.push('Password should not contain your first name');
        score = Math.max(0, score - 15);
      }
      
      if (userInfo.lastName && lowercasePassword.includes(userInfo.lastName.toLowerCase())) {
        feedback.push('Password should not contain your last name');
        score = Math.max(0, score - 15);
      }
    }

    // Additional complexity scoring
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
    
    // Character diversity bonus
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 10;

    // Sequential character penalty
    if (this.hasSequentialChars(password)) {
      feedback.push('Avoid using sequential characters (e.g., abc, 123)');
      score = Math.max(0, score - 10);
    }

    // Repeated character penalty
    if (this.hasRepeatedChars(password)) {
      feedback.push('Avoid using repeated characters (e.g., aaa, 111)');
      score = Math.max(0, score - 10);
    }

    // Determine strength
    let strength: PasswordValidation['strength'];
    if (score >= 90) strength = 'very_strong';
    else if (score >= 75) strength = 'strong';
    else if (score >= 60) strength = 'good';
    else if (score >= 40) strength = 'fair';
    else strength = 'weak';

    return {
      isValid: feedback.length === 0 && score >= 60,
      score: Math.min(100, Math.max(0, score)),
      feedback,
      strength,
    };
  }

  /**
   * Hash password using bcrypt
   */
  public async hashPassword(password: string): Promise<Result<string, Error>> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return Result.success(hash);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      return Result.failure(new Error('Password hashing failed'));
    }
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<Result<boolean, Error>> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return Result.success(isValid);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      return Result.failure(new Error('Password verification failed'));
    }
  }

  /**
   * Change user password with full validation
   */
  public async changePassword(request: PasswordChangeRequest): Promise<Result<boolean, any>> {
    const { userId, currentPassword, newPassword, confirmPassword, sessionId, ipAddress, userAgent } = request;

    try {
      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure(AppErrors.notFound('User'));
      }

      // Verify current password
      const currentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (Result.isFailure(currentPasswordValid)) {
        return Result.failure(currentPasswordValid.error);
      }

      if (!currentPasswordValid.data) {
        await this.logPasswordChangeAttempt(userId, false, 'invalid_current_password', { ipAddress, userAgent });
        return Result.failure(AppErrors.authentication('Current password is incorrect'));
      }

      // Validate confirmation if provided
      if (confirmPassword && newPassword !== confirmPassword) {
        return Result.failure(AppErrors.validation('Password confirmation does not match'));
      }

      // Validate new password
      const validation = this.validatePassword(newPassword, {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      });

      if (!validation.isValid) {
        return Result.failure(AppErrors.validation('Password validation failed', {
          feedback: validation.feedback,
          score: validation.score,
          strength: validation.strength,
        }));
      }

      // Check if new password is different from current
      const sameAsCurrentResult = await this.verifyPassword(newPassword, user.password_hash);
      if (Result.isSuccess(sameAsCurrentResult) && sameAsCurrentResult.data) {
        return Result.failure(AppErrors.validation('New password must be different from current password'));
      }

      // Hash new password
      const newHashResult = await this.hashPassword(newPassword);
      if (Result.isFailure(newHashResult)) {
        return Result.failure(newHashResult.error);
      }

      // Update password
      await user.update({
        password_hash: newHashResult.data,
        password_changed_at: new Date(),
      });

      // Log successful password change
      await this.logPasswordChangeAttempt(userId, true, 'password_changed', {
        sessionId,
        ipAddress,
        userAgent,
        strength: validation.strength,
      });

      logger.info('Password changed successfully', {
        userId,
        strength: validation.strength,
        ipAddress,
      });

      return Result.success(true);
    } catch (error) {
      logger.error('Password change failed', {
        userId,
        error: error.message,
        ipAddress,
      });

      return Result.failure(AppErrors.internal('Password change failed', error));
    }
  }

  /**
   * Generate secure temporary password
   */
  public generateTemporaryPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + specialChars;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password has sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = ['abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz'];
    const numberSequences = ['123', '234', '345', '456', '567', '678', '789'];
    
    const lowerPassword = password.toLowerCase();
    
    return sequences.some(seq => lowerPassword.includes(seq)) ||
           numberSequences.some(seq => password.includes(seq));
  }

  /**
   * Check if password has repeated characters
   */
  private hasRepeatedChars(password: string): boolean {
    const repeatedPattern = /(.)\1{2,}/; // 3 or more repeated characters
    return repeatedPattern.test(password);
  }

  /**
   * Log password change attempt
   */
  private async logPasswordChangeAttempt(
    userId: string,
    success: boolean,
    reason: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await AuditLog.logDataAccess(
        'users',
        userId,
        AuditAction.UPDATE,
        userId,
        metadata.sessionId,
        metadata.ipAddress,
        metadata.userAgent,
        undefined,
        {
          passwordChangeAttempt: true,
          success,
          reason,
          ...metadata,
        }
      );
    } catch (error) {
      logger.warn('Failed to log password change attempt', {
        userId,
        success,
        reason,
        error: error.message,
      });
    }
  }

  /**
   * Get password requirements
   */
  public getRequirements(): PasswordRequirements {
    return { ...this.requirements };
  }

  /**
   * Update password requirements
   */
  public updateRequirements(requirements: Partial<PasswordRequirements>): void {
    this.requirements = { ...this.requirements, ...requirements };
    logger.info('Password requirements updated', requirements);
  }

  /**
   * Check if password meets minimum requirements (fast check)
   */
  public quickPasswordCheck(password: string): boolean {
    return password.length >= this.requirements.minLength &&
           password.length <= this.requirements.maxLength &&
           (!this.requirements.requireUppercase || /[A-Z]/.test(password)) &&
           (!this.requirements.requireLowercase || /[a-z]/.test(password)) &&
           (!this.requirements.requireNumbers || /\d/.test(password)) &&
           (!this.requirements.requireSpecialChars || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password));
  }
}

// Singleton instance
export const passwordService = new PasswordService();
export default PasswordService;