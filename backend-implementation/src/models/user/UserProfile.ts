/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER PROFILE MODEL
 * ============================================================================
 *
 * Focused model for user profile information and personal data.
 * Extracted from User model to follow Single Responsibility Principle.
 *
 * Features:
 * - Personal information (name, contact details)
 * - Preferences and settings
 * - GDPR compliance tracking
 * - Profile photo and metadata
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
  Index,
} from "sequelize-typescript";
import { User } from "../User";

/**
 * User Profile Preferences Interface
 */
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    categories: {
      system: boolean;
      billing: boolean;
      route_updates: boolean;
      service_reminders: boolean;
    };
  };
  dashboard: {
    layout: "grid" | "list";
    widgets: string[];
    refresh_interval: number;
  };
  accessibility: {
    high_contrast: boolean;
    large_text: boolean;
    screen_reader: boolean;
  };
}

/**
 * User Profile Model
 */
@Table({
  tableName: "user_profiles",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ["user_id"],
      unique: true,
    },
    {
      fields: ["updated_at"],
    },
  ],
})
export class UserProfile extends Model<UserProfile> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  @Index
  declare userId: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  })
  declare firstName: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  })
  declare lastName: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare middleName?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    comment: "Encrypted phone number",
  })
  declare phone?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    comment: "Encrypted mobile number",
  })
  declare mobile?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: "Encrypted address information",
  })
  declare address?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare city?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare state?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  declare zipCode?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare country?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "Encrypted birth date",
  })
  declare birthDate?: Date;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    validate: {
      isIn: [["male", "female", "other", "prefer_not_to_say"]],
    },
  })
  declare gender?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: "Profile photo URL or encrypted file path",
  })
  declare profilePhoto?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  declare bio?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare jobTitle?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare department?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare manager?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      notifications: {
        email: true,
        sms: false,
        push: true,
        categories: {
          system: true,
          billing: true,
          route_updates: true,
          service_reminders: true,
        },
      },
      dashboard: {
        layout: "grid",
        widgets: ["overview", "recent_activity", "notifications"],
        refresh_interval: 30,
      },
      accessibility: {
        high_contrast: false,
        large_text: false,
        screen_reader: false,
      },
    },
  })
  declare preferences: UserPreferences;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: "Custom fields and metadata",
  })
  declare customFields?: Record<string, any>;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "GDPR consent status",
  })
  declare gdprConsentGiven: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When GDPR consent was given",
  })
  declare gdprConsentDate?: Date;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: "GDPR consent version",
  })
  declare gdprConsentVersion?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "Marketing consent status",
  })
  declare marketingConsent: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When marketing consent was given/revoked",
  })
  declare marketingConsentDate?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Data export requested",
  })
  declare dataExportRequested: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When data export was requested",
  })
  declare dataExportRequestedAt?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Data deletion requested",
  })
  declare dataDeletionRequested: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: "When data deletion was requested",
  })
  declare dataDeletionRequestedAt?: Date;

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
   * Get full name
   */
  getFullName(): string {
    const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    return parts.join(" ");
  }

  /**
   * Get display name (First Last)
   */
  getDisplayName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Get initials
   */
  getInitials(): string {
    const first = this.firstName ? this.firstName[0].toUpperCase() : "";
    const last = this.lastName ? this.lastName[0].toUpperCase() : "";
    return `${first}${last}`;
  }

  /**
   * Check if profile is complete
   */
  isComplete(): boolean {
    const requiredFields = [
      this.firstName,
      this.lastName,
      this.phone || this.mobile,
      this.gdprConsentGiven,
    ];

    return requiredFields.every(field => field !== null && field !== undefined);
  }

  /**
   * Get user's age (if birth date provided)
   */
  getAge(): number | null {
    if (!this.birthDate) return null;

    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Update preferences
   */
  async updatePreferences(newPreferences: Partial<UserPreferences>): Promise<void> {
    this.preferences = {
      ...this.preferences,
      ...newPreferences,
    };
    await this.save();
  }

  /**
   * Record GDPR consent
   */
  async recordGdprConsent(version?: string): Promise<void> {
    this.gdprConsentGiven = true;
    this.gdprConsentDate = new Date();
    this.gdprConsentVersion = version || "1.0";
    await this.save();
  }

  /**
   * Revoke GDPR consent
   */
  async revokeGdprConsent(): Promise<void> {
    this.gdprConsentGiven = false;
    this.gdprConsentDate = new Date();
    await this.save();
  }

  /**
   * Request data export
   */
  async requestDataExport(): Promise<void> {
    this.dataExportRequested = true;
    this.dataExportRequestedAt = new Date();
    await this.save();
  }

  /**
   * Request data deletion
   */
  async requestDataDeletion(): Promise<void> {
    this.dataDeletionRequested = true;
    this.dataDeletionRequestedAt = new Date();
    await this.save();
  }

  /**
   * Get safe profile data (for API responses)
   */
  toSafeJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.getDisplayName(),
      initials: this.getInitials(),
      jobTitle: this.jobTitle,
      department: this.department,
      profilePhoto: this.profilePhoto,
      bio: this.bio,
      preferences: this.preferences,
      isComplete: this.isComplete(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Static Methods
   */

  /**
   * Find profile by user ID
   */
  static async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.findOne({
      where: { userId },
    });
  }

  /**
   * Create profile for user
   */
  static async createForUser(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile> {
    return this.create({
      userId,
      ...profileData,
    });
  }

  /**
   * Find profiles with incomplete information
   */
  static async findIncompleteProfiles(): Promise<UserProfile[]> {
    return this.findAll({
      where: {
        [DataType.op]: {
          or: [
            { firstName: null },
            { lastName: null },
            { phone: null },
            { gdprConsentGiven: false },
          ],
        },
      },
    });
  }

  /**
   * Find profiles requiring GDPR action
   */
  static async findGdprActionRequired(): Promise<UserProfile[]> {
    return this.findAll({
      where: {
        [DataType.op]: {
          or: [
            { dataExportRequested: true },
            { dataDeletionRequested: true },
          ],
        },
      },
    });
  }
}

export default UserProfile;