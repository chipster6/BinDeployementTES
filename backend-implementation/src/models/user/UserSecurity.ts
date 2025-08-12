/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER SECURITY MODEL
 * ============================================================================
 *
 * Focused model for user security, authentication, and access control.
 * Extracted from User model to follow Single Responsibility Principle.
 *
 * Features:
 * - Password management and history
 * - Multi-factor authentication (MFA)
 * - Account lockout and security policies
 * - Login attempt tracking
 * - Security questions and recovery
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from "sequelize-typescript";
import { User } from "../User";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";

/**
 * MFA Methods Enum
 */
export enum MfaMethod {
  TOTP = "totp",
  SMS = "sms",
  EMAIL = "email",
  BACKUP_CODES = "backup_codes",
}

/**
 * Security Question Interface
 */
export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Login Attempt Interface
 */
export interface LoginAttempt {
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

/**
 * User Security Model
 */
@Table({
  tableName: "user_security",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ["user_id"],
      unique: true,
    },
    {
      fields: ["locked_until"],
    },
    {
      fields: ["password_changed_at"],
    },
    {
      fields: ["last_login_at"],
    },
  ],
})
export class UserSecurity extends Model<UserSecurity> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  @Index
  declare userId: string;

  // Password Management
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: "Bcrypt hashed password",
  })
  declare passwordHash: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    comment: "When password was last changed",
  })
  declare passwordChangedAt: Date;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "Hashed history of previous passwords",
  })
  declare passwordHistory: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "User must change password on next login",
  })
  declare requiresPasswordChange: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "Password expires on this date",
  })
  declare passwordExpiresAt?: Date;

  // Multi-Factor Authentication
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "MFA is enabled for this user",
  })
  declare mfaEnabled: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: "Encrypted MFA secret key",
  })
  declare mfaSecret?: string;

  @Column({
    type: DataType.ENUM(...Object.values(MfaMethod)),
    allowNull: true,
    comment: "Primary MFA method",
  })
  declare mfaMethod?: MfaMethod;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "Backup MFA methods",
  })
  declare mfaBackupMethods: MfaMethod[];

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "One-time backup codes for MFA",
  })
  declare mfaBackupCodes: string[];

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When MFA was last verified",
  })
  declare mfaLastVerifiedAt?: Date;

  // Account Lockout
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "Number of consecutive failed login attempts",
  })
  declare failedLoginAttempts: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "Account is locked until this time",
  })
  declare lockedUntil?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Account is permanently locked by admin",
  })
  declare permanentlyLocked: boolean;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: "Reason for account lock",
  })
  declare lockReason?: string;

  // Login Tracking
  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "Last successful login timestamp",
  })
  declare lastLoginAt?: Date;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
    comment: "IP address of last login",
  })
  declare lastLoginIp?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: "User agent of last login",
  })
  declare lastLoginUserAgent?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "Previous login timestamp",
  })
  declare previousLoginAt?: Date;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "Recent login attempts (last 50)",
  })
  declare loginAttempts: LoginAttempt[];

  // Security Questions
  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "Security questions and hashed answers",
  })
  declare securityQuestions: SecurityQuestion[];

  // Session Management
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: "Maximum concurrent sessions allowed",
  })
  declare maxSessions: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 3600,
    comment: "Session timeout in seconds",
  })
  declare sessionTimeout: number;

  // Security Preferences
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "Notify user of suspicious login activity",
  })
  declare notifyOnSuspiciousLogin: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Require MFA for sensitive operations",
  })
  declare requireMfaForSensitiveOps: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: "Trusted device fingerprints",
  })
  declare trustedDevices: string[];

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When security settings were last updated",
  })
  declare securityUpdatedAt?: Date;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  @DeletedAt
  @Column(DataType.DATE)
  declare deletedAt?: Date;

  // Associations
  @BelongsTo(() => User)
  declare user: User;

  /**
   * Instance Methods
   */

  /**
   * Verify password
   */
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /**
   * Set new password with history tracking
   */
  async setPassword(plainPassword: string): Promise<void> {
    const saltRounds = 12;
    const newHash = await bcrypt.hash(plainPassword, saltRounds);

    // Add current password to history
    if (this.passwordHash) {
      this.passwordHistory = [
        this.passwordHash,
        ...this.passwordHistory.slice(0, 4), // Keep last 5 passwords
      ];
    }

    this.passwordHash = newHash;
    this.passwordChangedAt = new Date();
    this.requiresPasswordChange = false;
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;

    await this.save();
  }

  /**
   * Check if password was used recently
   */
  async isPasswordRecentlyUsed(plainPassword: string): Promise<boolean> {
    for (const oldHash of this.passwordHistory) {
      if (await bcrypt.compare(plainPassword, oldHash)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if password has expired
   */
  isPasswordExpired(): boolean {
    if (!this.passwordExpiresAt) return false;
    return new Date() > this.passwordExpiresAt;
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(): boolean {
    if (this.permanentlyLocked) return true;
    if (this.lockedUntil && this.lockedUntil > new Date()) return true;
    return false;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ): Promise<void> {
    this.failedLoginAttempts += 1;

    // Add to login attempts history
    const attempt: LoginAttempt = {
      timestamp: new Date(),
      success: false,
      ipAddress,
      userAgent,
      failureReason: reason,
    };

    this.loginAttempts = [attempt, ...this.loginAttempts.slice(0, 49)]; // Keep last 50

    // Lock account if too many failures
    const maxAttempts = 5;
    if (this.failedLoginAttempts >= maxAttempts) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      this.lockReason = "Too many failed login attempts";
    }

    await this.save();
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    this.previousLoginAt = this.lastLoginAt;
    this.lastLoginAt = new Date();
    this.lastLoginIp = ipAddress;
    this.lastLoginUserAgent = userAgent;
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;

    // Add to login attempts history
    const attempt: LoginAttempt = {
      timestamp: new Date(),
      success: true,
      ipAddress,
      userAgent,
    };

    this.loginAttempts = [attempt, ...this.loginAttempts.slice(0, 49)]; // Keep last 50

    await this.save();
  }

  /**
   * Setup MFA with TOTP
   */
  async setupTotp(): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: this.user?.email || "Unknown User",
      issuer: "Waste Management System",
    });

    this.mfaSecret = secret.base32; // Should be encrypted in production
    this.mfaMethod = MfaMethod.TOTP;

    await this.save();

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || "",
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTotp(token: string): boolean {
    if (!this.mfaSecret) return false;

    return speakeasy.totp.verify({
      secret: this.mfaSecret,
      encoding: "base32",
      token,
      window: 1,
    });
  }

  /**
   * Generate backup codes
   */
  async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Hash the codes before storing
    const hashedCodes = await Promise.all(
      codes.map((code) => bcrypt.hash(code, 10)),
    );

    this.mfaBackupCodes = hashedCodes;
    await this.save();

    return codes; // Return plain codes to user once
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(code: string): Promise<boolean> {
    for (let i = 0; i < this.mfaBackupCodes.length; i++) {
      const hashedCode = this.mfaBackupCodes[i];
      if (await bcrypt.compare(code.toUpperCase(), hashedCode)) {
        // Remove used code
        this.mfaBackupCodes.splice(i, 1);
        await this.save();
        return true;
      }
    }
    return false;
  }

  /**
   * Enable MFA
   */
  async enableMfa(): Promise<void> {
    this.mfaEnabled = true;
    this.mfaLastVerifiedAt = new Date();
    await this.save();
  }

  /**
   * Disable MFA
   */
  async disableMfa(): Promise<void> {
    this.mfaEnabled = false;
    this.mfaSecret = null;
    this.mfaMethod = null;
    this.mfaBackupMethods = [];
    this.mfaBackupCodes = [];
    await this.save();
  }

  /**
   * Add security question
   */
  async addSecurityQuestion(question: string, answer: string): Promise<void> {
    const answerHash = await bcrypt.hash(answer.toLowerCase().trim(), 10);

    const securityQuestion: SecurityQuestion = {
      id: DataType.UUIDV4.toString(),
      question,
      answerHash,
      isActive: true,
      createdAt: new Date(),
    };

    this.securityQuestions = [...this.securityQuestions, securityQuestion];
    await this.save();
  }

  /**
   * Verify security question answer
   */
  async verifySecurityQuestion(
    questionId: string,
    answer: string,
  ): Promise<boolean> {
    const question = this.securityQuestions.find(
      (q) => q.id === questionId && q.isActive,
    );
    if (!question) return false;

    return bcrypt.compare(answer.toLowerCase().trim(), question.answerHash);
  }

  /**
   * Get security summary
   */
  getSecuritySummary(): Record<string, any> {
    return {
      mfaEnabled: this.mfaEnabled,
      mfaMethod: this.mfaMethod,
      hasBackupCodes: this.mfaBackupCodes.length > 0,
      passwordAge: this.passwordChangedAt
        ? Math.floor(
            (Date.now() - this.passwordChangedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
      isLocked: this.isAccountLocked(),
      lockReason: this.lockReason,
      lastLogin: this.lastLoginAt,
      failedAttempts: this.failedLoginAttempts,
      securityQuestionsCount: this.securityQuestions.filter((q) => q.isActive)
        .length,
      trustedDevicesCount: this.trustedDevices.length,
    };
  }

  /**
   * Static Methods
   */

  /**
   * Find by user ID
   */
  static async findByUserId(userId: string): Promise<UserSecurity | null> {
    return this.findOne({
      where: { userId },
    });
  }

  /**
   * Create security record for user
   */
  static async createForUser(
    userId: string,
    passwordHash: string,
    options?: Partial<UserSecurity>,
  ): Promise<UserSecurity> {
    return this.create({
      userId,
      passwordHash,
      passwordChangedAt: new Date(),
      ...options,
    });
  }

  /**
   * Find locked accounts
   */
  static async findLockedAccounts(): Promise<UserSecurity[]> {
    return this.findAll({
      where: {
        [DataType.op]: {
          or: [
            { permanentlyLocked: true },
            { lockedUntil: { [DataType.op.gt]: new Date() } },
          ],
        },
      },
    });
  }

  /**
   * Find accounts requiring password change
   */
  static async findPasswordChangeRequired(): Promise<UserSecurity[]> {
    return this.findAll({
      where: {
        [DataType.op]: {
          or: [
            { requiresPasswordChange: true },
            { passwordExpiresAt: { [DataType.op.lt]: new Date() } },
          ],
        },
      },
    });
  }

  /**
   * Get security statistics
   */
  static async getSecurityStats(): Promise<Record<string, number>> {
    const [total, mfaEnabled, locked, passwordExpired] = await Promise.all([
      this.count(),
      this.count({ where: { mfaEnabled: true } }),
      this.count({
        where: {
          [DataType.op]: {
            or: [
              { permanentlyLocked: true },
              { lockedUntil: { [DataType.op.gt]: new Date() } },
            ],
          },
        },
      }),
      this.count({
        where: {
          passwordExpiresAt: { [DataType.op.lt]: new Date() },
        },
      }),
    ]);

    return {
      total,
      mfaEnabled,
      locked,
      passwordExpired,
      mfaPercentage: total > 0 ? Math.round((mfaEnabled / total) * 100) : 0,
    };
  }
}

export default UserSecurity;
