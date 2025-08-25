/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER SESSION MODEL
 * ============================================================================
 *
 * Sequelize model for user sessions with comprehensive security tracking.
 * Supports multiple concurrent sessions with device fingerprinting and
 * geographic location tracking for security monitoring.
 *
 * Security Features:
 * - Session token management
 * - Device fingerprinting
 * - IP address tracking
 * - Geographic location detection
 * - Session expiry and cleanup
 * - Risk scoring for anomaly detection
 * - MFA verification tracking
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  Association,
  BelongsToGetAssociationMixin,
} from "sequelize";
import { sequelize } from "@/config/database";
import { User } from "./User";
import { logger } from "@/utils/logger";
import crypto from "crypto";

/**
 * Session status enumeration
 */
export enum SessionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  SUSPICIOUS = "suspicious",
}

/**
 * User session attributes interface
 */
export interface UserSessionAttributes {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  locationCountry?: string;
  locationCity?: string;
  status: SessionStatus;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  logoutAt?: Date;
  mfaVerified: boolean;
  riskScore: number;
}

/**
 * User session creation attributes
 */
export interface UserSessionCreationAttributes
  extends Omit<
    UserSessionAttributes,
    "id" | "createdAt" | "lastActivity" | "status" | "mfaVerified" | "riskScore"
  > {
  id?: string;
  status?: SessionStatus;
  lastActivity?: Date;
  mfaVerified?: boolean;
  riskScore?: number;
}

/**
 * User session model class
 */
export class UserSession extends Model<
  InferAttributes<UserSession>,
  InferCreationAttributes<UserSession>
> {
  // Model attributes
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare sessionToken: string;
  declare refreshToken: string | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare deviceFingerprint: string | null;
  declare locationCountry: string | null;
  declare locationCity: string | null;
  declare status: CreationOptional<SessionStatus>;
  declare createdAt: CreationOptional<Date>;
  declare lastActivity: CreationOptional<Date>;
  declare expiresAt: Date;
  declare logoutAt: Date | null;
  declare mfaVerified: CreationOptional<boolean>;
  declare riskScore: CreationOptional<number>;

  // Associations
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare user?: User;

  // Association declarations
  declare static associations: {
    user: Association<UserSession, User>;
  };

  /**
   * Generate a secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate a secure refresh token
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  /**
   * Create device fingerprint from user agent and other factors
   */
  static createDeviceFingerprint(
    userAgent?: string,
    acceptLanguage?: string,
    acceptEncoding?: string,
  ): string {
    const factors = [
      userAgent || "",
      acceptLanguage || "",
      acceptEncoding || "",
    ].join("|");

    return crypto.createHash("sha256").update(factors).digest("hex");
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this?.expiresAt || this.status !== SessionStatus.ACTIVE;
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isNearExpiry(): boolean {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Extend session expiry
   */
  async extendSession(additionalMinutes: number = 30): Promise<void> {
    this.expiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
    this.lastActivity = new Date();
    await this.save();
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(): Promise<void> {
    this.lastActivity = new Date();
    await this.save();
  }

  /**
   * Revoke session (logout)
   */
  async revoke(): Promise<void> {
    this.status = SessionStatus.REVOKED;
    this.logoutAt = new Date();
    await this.save();
  }

  /**
   * Mark session as suspicious
   */
  async markSuspicious(reason: string): Promise<void> {
    this.status = SessionStatus.SUSPICIOUS;
    this.riskScore = Math.min(this.riskScore + 25, 100);
    await this.save();

    // Log security event with comprehensive audit trail
    logger.warn('Session marked suspicious', {
      sessionId: this.id,
      userId: this.userId,
      reason,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceFingerprint: this.deviceFingerprint,
      location: { country: this.locationCountry, city: this.locationCity },
      riskScore: this.riskScore,
      timestamp: new Date(),
      actionRequired: this.riskScore > 75 ? 'immediate_review' : 'monitoring',
    });
  }

  /**
   * Calculate risk score based on various factors
   */
  async calculateRiskScore(): Promise<number> {
    let riskScore = 0;

    // Geographic risk (different country/city from usual)
    const userSessions = await UserSession.findAll({
      where: {
        userId: this.userId,
        status: SessionStatus.ACTIVE,
        id: { [sequelize.Op.ne]: this.id },
      },
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    const usualCountries = new Set(userSessions
      .map(s => s.locationCountry)
      .filter(Boolean));
    
    if (this.locationCountry && usualCountries.size > 0 && !usualCountries.has(this.locationCountry)) {
      riskScore += 20; // Different country
    }

    // Time-based risk (unusual login hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 10;
    }

    // Multiple concurrent sessions risk
    const activeSessions = await UserSession.count({
      where: {
        userId: this.userId,
        status: SessionStatus.ACTIVE,
        id: { [sequelize.Op.ne]: this.id },
      },
    });

    if (activeSessions > 3) {
      riskScore += 15;
    }

    // Failed login attempts risk
    try {
      const { UserSecurity } = require('@/models/user/UserSecurity');
      const userSecurity = await UserSecurity.findOne({ where: { userId: this.userId } });
      if (userSecurity && userSecurity.failedLoginAttempts > 0) {
        riskScore += Math.min(userSecurity.failedLoginAttempts * 5, 25);
      }
    } catch (error: unknown) {
      // Silently handle if UserSecurity is not available
    }

    // Device fingerprint change risk
    const usualFingerprints = new Set(userSessions
      .map(s => s.deviceFingerprint)
      .filter(Boolean));
    
    if (this.deviceFingerprint && usualFingerprints.size > 0 && !usualFingerprints.has(this.deviceFingerprint)) {
      riskScore += 15; // New device
    }

    this.riskScore = Math.min(riskScore, 100);
    await this.save();

    return this.riskScore;
  }

  /**
   * Get session duration in minutes
   */
  getSessionDuration(): number {
    return Math.floor(
      (this.lastActivity.getTime() - this.createdAt.getTime()) / (1000 * 60),
    );
  }

  /**
   * Check if session requires MFA verification
   */
  requiresMfaVerification(): boolean {
    // High-risk sessions or admin users require MFA
    return this.riskScore > 50 || !this.mfaVerified;
  }

  /**
   * Mark MFA as verified for this session
   */
  async verifyMfa(): Promise<void> {
    this.mfaVerified = true;
    await this.save();
  }

  /**
   * Get user agent information
   */
  getUserAgentInfo(): {
    browser?: string;
    os?: string;
    device?: string;
  } {
    if (!this.userAgent) {
      return {};
    }

    // Basic user agent parsing (in production, use a proper library)
    const ua = this.userAgent.toLowerCase();

    let browser = "unknown";
    if (ua.includes("chrome")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari")) browser = "Safari";
    else if (ua.includes("edge")) browser = "Edge";

    let os = "unknown";
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("macintosh")) os = "macOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("ios")) os = "iOS";

    let device = "desktop";
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("ios")) {
      device = "mobile";
    } else if (ua.includes("tablet")) {
      device = "tablet";
    }

    return { browser, os, device };
  }

  /**
   * JSON serialization
   */
  toJSON(): Partial<UserSessionAttributes> {
    const attributes = { ...this.get() };

    // Remove sensitive fields
    delete attributes.sessionToken;
    delete attributes.refreshToken;

    return attributes;
  }
}

/**
 * Initialize UserSession model with Sequelize
 */
UserSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    sessionToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "session_token",
    },
    refreshToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: "refresh_token",
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },
    deviceFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "device_fingerprint",
    },
    locationCountry: {
      type: DataTypes.STRING(2),
      allowNull: true,
      field: "location_country",
      validate: {
        len: [2, 2],
      },
    },
    locationCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "location_city",
      validate: {
        len: [1, 100],
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SessionStatus)),
      allowNull: false,
      defaultValue: SessionStatus.ACTIVE,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "last_activity",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    logoutAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "logout_at",
    },
    mfaVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "mfa_verified",
    },
    riskScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "risk_score",
      validate: {
        min: 0,
        max: 100,
      },
    },
  },
  {
    sequelize,
    modelName: "UserSession",
    tableName: "user_sessions",
    schema: "security",
    timestamps: false, // We handle timestamps manually

    // Indexes for performance
    indexes: [
      {
        fields: ["session_token"],
        unique: true,
      },
      {
        fields: ["refresh_token"],
        unique: true,
        where: { refresh_token: { [sequelize.Op.ne]: null } },
      },
      {
        fields: ["user_id", "status"],
      },
      {
        fields: ["expires_at"],
      },
      {
        fields: ["last_activity"],
      },
      {
        fields: ["ip_address", "created_at"],
      },
      {
        fields: ["risk_score"],
        where: { risk_score: { [sequelize.Op.gt]: 0 } },
      },
    ],

    // Hooks for session management
    hooks: {
      beforeCreate: (session: UserSession) => {
        // Generate tokens if not provided
        if (!session.sessionToken) {
          session.sessionToken = UserSession.generateSessionToken();
        }

        // Set default expiry (8 hours as per security requirements)
        if (!session.expiresAt) {
          session.expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
        }
      },

      afterCreate: async (session: UserSession) => {
        // Calculate initial risk score
        await session.calculateRiskScore();

        // Log session creation
        console.log(
          `Session created for user ${session.userId}: ${session.id}`,
        );
      },

      beforeUpdate: async (session: UserSession) => {
        // Auto-expire sessions that are past expiry
        if (
          session.expiresAt <= new Date() &&
          session.status === SessionStatus.ACTIVE
        ) {
          session.status = SessionStatus.EXPIRED;
        }
      },
    },

    // Default scope excludes expired/revoked sessions
    defaultScope: {
      where: {
        status: SessionStatus.ACTIVE,
      },
    },

    // Additional scopes
    scopes: {
      withInactive: {
        where: {},
      },
      active: {
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: {
            [sequelize.Op.gt]: new Date(),
          },
        },
      },
      expired: {
        where: {
          [sequelize.Op.or]: [
            { status: SessionStatus.EXPIRED },
            {
              status: SessionStatus.ACTIVE,
              expiresAt: {
                [sequelize.Op.lte]: new Date(),
              },
            },
          ],
        },
      },
      suspicious: {
        where: {
          [sequelize.Op.or]: [
            { status: SessionStatus.SUSPICIOUS },
            { riskScore: { [sequelize.Op.gte]: 75 } },
          ],
        },
      },
      highRisk: {
        where: {
          riskScore: {
            [sequelize.Op.gte]: 50,
          },
        },
      },
    },
  },
);

// Define associations
UserSession.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

User.hasMany(UserSession, {
  foreignKey: "userId",
  as: "sessions",
});

export default UserSession;
