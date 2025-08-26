/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER MODEL
 * ============================================================================
 *
 * User model definition with role-based access control, security features,
 * and compliance tracking. Implements complete user management functionality.
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyCreateAssociationMixin,
  Association,
  Sequelize,
  Op,
} from "sequelize";
import { database } from "@/config/database";
import bcrypt from "bcrypt";
import { config } from "@/config";
import { encryptDatabaseField, decryptDatabaseField, isEncrypted } from "@/utils/encryption";
import { UserRole, UserStatus } from "@/domain/auth/types";

/**
 * User model class
 */
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  // Primary fields
  declare id: CreationOptional<string>;
  declare email: string;
  declare password_hash: string;
  declare first_name: string;
  declare last_name: string;
  declare phone?: string | null;
  declare role: UserRole;
  declare status: CreationOptional<UserStatus>;
  declare organizationId?: string | null;

  // Multi-factor authentication
  declare mfa_enabled: CreationOptional<boolean>;
  declare mfa_secret?: string | null;

  // Authentication tracking
  declare last_login_at?: Date | null;
  declare password_changed_at: CreationOptional<Date>;
  declare failed_login_attempts: CreationOptional<number>;
  declare locked_until?: Date | null;

  // Audit fields
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare created_by?: string | null;
  declare updated_by?: string | null;
  declare version: CreationOptional<number>;
  declare deleted_at?: Date | null;
  declare deleted_by?: string | null;

  // Compliance fields
  declare gdpr_consent_given: CreationOptional<boolean>;
  declare gdpr_consent_date?: Date | null;
  declare data_retention_until?: Date | null;

  // Associations
  declare getUserSessions: HasManyGetAssociationsMixin<UserSession>;
  declare getAuditLogs: HasManyGetAssociationsMixin<AuditLog>;

  // Static associations
  public static associations: {
    sessions: Association<User, UserSession>;
    auditLogs: Association<User, AuditLog>;
  };

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    if (!password || !this.password_hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error: unknown) {
      console.error("Password validation error:", error);
      return false;
    }
  }

  public async setPassword(password: string): Promise<void> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const saltRounds = config.security?.bcryptRounds || 12;
    this.password_hash = await bcrypt.hash(password, saltRounds);
    this.password_changed_at = new Date();

    this.failed_login_attempts = 0;
    this.locked_until = null;
  }

  public async updateLastLogin(): Promise<void> {
    this.last_login_at = new Date();
    await this.save({ fields: ["last_login_at"] });
  }

  public async incrementFailedLoginAttempts(): Promise<void> {
    this.failed_login_attempts = (this?.failed_login_attempts || 0) + 1;

    const maxAttempts = config.security.accountLockout?.attempts || 5;
    if (this.failed_login_attempts >= maxAttempts) {
      const lockDuration = config.security.accountLockout?.time || 1800000;
      this.locked_until = new Date(Date.now() + lockDuration);
      this.status = UserStatus.LOCKED;
    }

    await this.save({
      fields: ["failed_login_attempts", "locked_until", "status"],
    });
  }

  // Static methods
  public static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const saltRounds = config.security?.bcryptRounds || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // MFA Methods (Enhanced for Encryption Support)
  public async generateMfaSecret(): Promise<string> {
    const { generateSecret } = require("otplib/authenticator");
    const plaintextSecret = generateSecret();
    
    // Encrypt the secret before storing
    this.mfa_secret = await encryptDatabaseField(plaintextSecret);
    return plaintextSecret; // Return plaintext for QR code generation
  }

  public async verifyMfaToken(token: string): Promise<boolean> {
    if (!this.mfa_secret) {
      return false;
    }

    try {
      // Decrypt the MFA secret for verification
      const plaintextSecret = await this.getDecryptedMfaSecret();
      if (!plaintextSecret) {
        return false;
      }

      const { verify } = require("otplib/authenticator");
      return verify({ token, secret: plaintextSecret });
    } catch (error: unknown) {
      console.error("MFA token verification error:", error);
      return false;
    }
  }

  public async getMfaQrCodeUri(): Promise<string> {
    if (!this.mfa_secret) {
      throw new Error("MFA secret not generated");
    }

    try {
      const plaintextSecret = await this.getDecryptedMfaSecret();
      if (!plaintextSecret) {
        throw new Error("Failed to decrypt MFA secret");
      }

      const { keyuri } = require("otplib/authenticator");
      return keyuri(this.email, config.security.mfa.issuer, plaintextSecret);
    } catch (error: unknown) {
      console.error("MFA QR code generation error:", error);
      throw new Error("Failed to generate MFA QR code");
    }
  }

  /**
   * Helper method to decrypt MFA secret safely
   */
  private async getDecryptedMfaSecret(): Promise<string | null> {
    if (!this.mfa_secret) {
      return null;
    }

    try {
      // Check if secret is already encrypted
      if (isEncrypted(this.mfa_secret)) {
        return await decryptDatabaseField(this.mfa_secret);
      } else {
        // Legacy plaintext secret - encrypt it and save
        const encryptedSecret = await encryptDatabaseField(this.mfa_secret);
        await this.update({ mfa_secret: encryptedSecret });
        return this.mfa_secret; // Return original plaintext for this operation
      }
    } catch (error: unknown) {
      console.error("MFA secret decryption error:", error);
      return null;
    }
  }

  /**
   * Securely disable MFA and clear encrypted secret
   */
  public async disableMfa(): Promise<void> {
    this.mfa_enabled = false;
    this.mfa_secret = null;
    await this.save({ fields: ["mfa_enabled", "mfa_secret"] });
  }

  /**
   * Re-encrypt MFA secret with new encryption key (for key rotation)
   */
  public async rotateEncryptionKey(): Promise<void> {
    if (!this.mfa_secret || !this.mfa_enabled) {
      return;
    }

    try {
      const plaintextSecret = await this.getDecryptedMfaSecret();
      if (plaintextSecret) {
        // Re-encrypt with current encryption key
        this.mfa_secret = await encryptDatabaseField(plaintextSecret);
        await this.save({ fields: ["mfa_secret"] });
      }
    } catch (error: unknown) {
      console.error("MFA secret key rotation error:", error);
      throw new Error("Failed to rotate MFA secret encryption key");
    }
  }

  public async resetFailedLoginAttempts(): Promise<void> {
    this.failed_login_attempts = 0;
    this.locked_until = null;

    if (this.status === UserStatus.LOCKED) {
      this.status = UserStatus.ACTIVE;
    }

    await this.save({
      fields: ["failed_login_attempts", "locked_until", "status"],
    });
  }

  // Alias for backward compatibility
  public async resetFailedLogin(): Promise<void> {
    return this.resetFailedLoginAttempts();
  }

  // Alias for backward compatibility
  public async incrementFailedLogin(): Promise<void> {
    return this.incrementFailedLoginAttempts();
  }

  // Password verification alias
  public async verifyPassword(password: string): Promise<boolean> {
    return this.validatePassword(password);
  }

  public async lockAccount(duration: number = 1800000): Promise<void> {
    this.locked_until = new Date(Date.now() + duration);
    this.status = UserStatus.LOCKED;
    await this.save({ fields: ["locked_until", "status"] });
  }

  public async unlockAccount(): Promise<void> {
    this.locked_until = null;
    this.failed_login_attempts = 0;
    this.status = UserStatus.ACTIVE;
    await this.save({
      fields: ["locked_until", "failed_login_attempts", "status"],
    });
  }

  public isAccountLocked(): boolean {
    if (this.status === UserStatus.LOCKED) {
      if (this.locked_until && this.locked_until <= new Date()) {
        this.unlockAccount().catch(console.error);
        return false;
      }
      return true;
    }
    return false;
  }

  public getFullName(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  public async canAccess(resource: string, action: string): Promise<boolean> {
    // Use database-backed RBAC for security
    const { RolePermission } = await import('./RolePermission');
    const { PermissionAction } = await import('./Permission');
    
    // Convert string action to PermissionAction enum
    const permissionAction = Object.values(PermissionAction).find(
      (pa) => pa === action
    ) as PermissionAction;
    
    if (!permissionAction) {
      return false;
    }

    return await RolePermission.hasPermission(this.role, resource, permissionAction);
  }

  /**
   * AI/ML Intelligent Routing permission method
   * Provides synchronous permission checking for routing decisions
   */
  public hasPermission(permission: string, organizationId?: string): boolean {
    // Basic role-based permission mapping for intelligent routing
    const permissionMap: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'], // All permissions
      [UserRole.ADMIN]: [
        'routing:coordinate', 
        'routing:monitor', 
        'routing:manage', 
        'routing:analytics',
        'system:architecture'
      ],
      [UserRole.DISPATCHER]: [
        'routing:coordinate', 
        'routing:monitor', 
        'routing:analytics'
      ],
      [UserRole.OFFICE_STAFF]: [
        'routing:monitor'
      ],
      [UserRole.DRIVER]: [],
      [UserRole.CUSTOMER]: [],
      [UserRole.CUSTOMER_STAFF]: []
    };

    const userPermissions = permissionMap[this.role] || [];
    
    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check specific permission
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check wildcard permissions
    const permissionPrefix = permission.split(':')[0];
    if (userPermissions.includes(`${permissionPrefix}:*`)) {
      return true;
    }

    return false;
  }

  public isPasswordExpired(): boolean {
    if (!this.password_changed_at) return true;

    const maxAge = 90 * 24 * 60 * 60 * 1000;
    return Date.now() - this.password_changed_at.getTime() > maxAge;
  }

  public requiresPasswordReset(): boolean {
    return this.isPasswordExpired() || this.password_hash === null;
  }

  public async giveGdprConsent(): Promise<void> {
    this.gdpr_consent_given = true;
    this.gdpr_consent_date = new Date();
    await this.save({ fields: ["gdpr_consent_given", "gdpr_consent_date"] });
  }

  public async revokeGdprConsent(): Promise<void> {
    this.gdpr_consent_given = false;
    this.gdpr_consent_date = new Date();
    await this.save({ fields: ["gdpr_consent_given", "gdpr_consent_date"] });
  }

  public toSafeJSON(): object {
    const values = { ...this.get() };

    delete values.password_hash;
    delete values.mfa_secret;

    return {
      id: values.id,
      email: values.email,
      firstName: values.first_name,
      lastName: values.last_name,
      phone: values.phone,
      organizationId: values.organizationId,
      role: values.role,
      status: values.status,
      mfaEnabled: values.mfa_enabled,
      lastLoginAt: values.last_login_at,
      createdAt: values.created_at,
      updatedAt: values.updated_at,
      fullName: this.getFullName(),
      isLocked: this.isAccountLocked(),
      passwordExpired: this.isPasswordExpired(),
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [3, 255],
      },
    },

    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [60, 255],
      },
    },

    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },

    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [10, 20],
      },
    },

    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'organization_id',
      references: {
        model: 'organizations',
        key: 'id',
      },
    },

    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      validate: {
        isIn: [Object.values(UserRole)],
      },
    },

    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: false,
      defaultValue: UserStatus.ACTIVE,
    },

    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    mfa_secret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
    },

    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
    },

    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    deleted_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
    },

    gdpr_consent_given: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    gdpr_consent_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    data_retention_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    schema: "core",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    version: true,
    sequelize: database,

    // Indexes
    indexes: [
      {
        unique: true,
        fields: ["email"],
        where: { deleted_at: null },
      },
      {
        fields: ["role"],
        where: { deleted_at: null },
      },
      {
        fields: ["status"],
        where: { deleted_at: null },
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["last_login_at"],
      },
    ],

    // Hooks
    hooks: {
      beforeCreate: async (user: User) => {
        // Ensure email is lowercase
        user.email = user.email.toLowerCase();

        // Encrypt MFA secret before saving
        if (user.mfa_secret) {
          try {
            user.mfa_secret = await encryptDatabaseField(user.mfa_secret);
          } catch (error: unknown) {
            console.error("Failed to encrypt MFA secret:", error);
            throw new Error("MFA secret encryption failed");
          }
        }

        // Set GDPR consent date if consent is given
        if (user.gdpr_consent_given && !user.gdpr_consent_date) {
          user.gdpr_consent_date = new Date();
        }

        // Set data retention date (7 years from creation)
        if (!user.data_retention_until) {
          const retentionDate = new Date();
          retentionDate.setFullYear(retentionDate.getFullYear() + 7);
          user.data_retention_until = retentionDate;
        }
      },

      beforeUpdate: async (user: User) => {
        // Increment version
        user.version = (user?.version || 1) + 1;

        // Encrypt MFA secret if it was modified
        if (user.changed("mfa_secret") && user.mfa_secret) {
          try {
            user.mfa_secret = await encryptDatabaseField(user.mfa_secret);
          } catch (error: unknown) {
            console.error("Failed to encrypt MFA secret:", error);
            throw new Error("MFA secret encryption failed");
          }
        }

        // Update GDPR consent date if consent status changed
        if (user.changed("gdpr_consent_given") && user.gdpr_consent_given) {
          user.gdpr_consent_date = new Date();
        }
      },

      afterFind: async (instanceOrInstances: User | User[] | null) => {
        if (!instanceOrInstances) return;

        const instances = Array.isArray(instanceOrInstances) ? instanceOrInstances : [instanceOrInstances];
        
        for (const user of instances) {
          if (user && user.mfa_secret) {
            try {
              user.mfa_secret = await decryptDatabaseField(user.mfa_secret);
            } catch (error: unknown) {
              console.error("Failed to decrypt MFA secret for user:", user.id, error);
              // Set to null to prevent errors in TOTP verification
              user.mfa_secret = null;
            }
          }
        }
      },

      beforeBulkDestroy: async (options: any) => {
        // Ensure soft delete
        options.individualHooks = true;
      },
    },

    // Scopes
    scopes: {
      active: {
        where: {
          status: UserStatus.ACTIVE,
          deleted_at: null,
        },
      },

      withoutPassword: {
        attributes: {
          exclude: ["password_hash", "mfa_secret"],
        },
      },

      adminUsers: {
        where: {
          role: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
          status: UserStatus.ACTIVE,
          deleted_at: null,
        },
      },

      drivers: {
        where: {
          role: UserRole.DRIVER,
          status: UserStatus.ACTIVE,
          deleted_at: null,
        },
      },

      customers: {
        where: {
          role: [UserRole.CUSTOMER, UserRole.CUSTOMER_STAFF],
          status: UserStatus.ACTIVE,
          deleted_at: null,
        },
      },
    },
  },
);

/**
 * Static methods
 */

// Find user by email
User.findByEmail = async function (email: string): Promise<User | null> {
  return await this.findOne({
    where: {
      email: email.toLowerCase(),
      deleted_at: null,
    },
  });
};

// Find active users by role
User.findByRole = async function (role: UserRole): Promise<User[]> {
  return await this.scope("active").findAll({
    where: { role },
  });
};

// Create user with hashed password
User.createWithPassword = async function (userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  created_by?: string;
}): Promise<User> {
  const user = this.build({
    email: userData.email.toLowerCase(),
    password_hash: "", // Will be set by setPassword
    first_name: userData.first_name,
    last_name: userData.last_name,
    phone: userData.phone,
    role: userData.role,
    created_by: userData.created_by,
  });

  await user.setPassword(userData.password);
  return await user.save();
};

export { User as UserModel };
export default User;
