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
import { UserSession } from "./UserSession";
import { AuditLog } from "./AuditLog";

// User role enumeration
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  DISPATCHER = "dispatcher",
  OFFICE_STAFF = "office_staff",
  DRIVER = "driver",
  CUSTOMER = "customer",
  CUSTOMER_STAFF = "customer_staff",
}

// User status enumeration
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  LOCKED = "locked",
}

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
    } catch (error) {
      console.error("Password validation error:", error);
      return false;
    }
  }

  public async setPassword(password: string): Promise<void> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const saltRounds = config.security.bcryptRounds || 12;
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
    this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;

    const maxAttempts = config.security.accountLockout.attempts || 5;
    if (this.failed_login_attempts >= maxAttempts) {
      const lockDuration = config.security.accountLockout.time || 1800000;
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

    const saltRounds = config.security.bcryptRounds || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // MFA Methods
  public generateMfaSecret(): string {
    const { generateSecret } = require('otplib/authenticator');
    this.mfa_secret = generateSecret();
    return this.mfa_secret;
  }

  public verifyMfaToken(token: string): boolean {
    if (!this.mfa_secret) {
      return false;
    }
    
    const { verify } = require('otplib/authenticator');
    return verify({ token, secret: this.mfa_secret });
  }

  public getMfaQrCodeUri(): string {
    if (!this.mfa_secret) {
      throw new Error('MFA secret not generated');
    }
    
    const { keyuri } = require('otplib/authenticator');
    return keyuri(this.email, config.security.mfa.issuer, this.mfa_secret);
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

  public canAccess(resource: string, action: string): boolean {
    if (this.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const permissions: Record<UserRole, Record<string, string[]>> = {
      [UserRole.SUPER_ADMIN]: {},
      [UserRole.ADMIN]: {
        users: ["read", "create", "update"],
        customers: ["read", "create", "update", "delete"],
        routes: ["read", "create", "update", "delete"],
        vehicles: ["read", "create", "update", "delete"],
        drivers: ["read", "create", "update"],
        invoices: ["read", "create", "update"],
        analytics: ["read"],
      },
      [UserRole.DISPATCHER]: {
        routes: ["read", "update"],
        vehicles: ["read"],
        drivers: ["read"],
        service_events: ["read", "create", "update"],
        customers: ["read"],
      },
      [UserRole.OFFICE_STAFF]: {
        customers: ["read", "create", "update"],
        invoices: ["read", "create", "update"],
        service_events: ["read", "update"],
      },
      [UserRole.DRIVER]: {
        routes: ["read"],
        service_events: ["read", "update"],
        vehicles: ["read"],
      },
      [UserRole.CUSTOMER]: {
        invoices: ["read"],
        service_events: ["read"],
      },
      [UserRole.CUSTOMER_STAFF]: {
        invoices: ["read"],
        service_events: ["read"],
      },
    };

    const rolePermissions = permissions[this.role] || {};
    const resourcePermissions = rolePermissions[resource] || [];

    return resourcePermissions.includes(action);
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
        user.version = (user.version || 1) + 1;

        // Update GDPR consent date if consent status changed
        if (user.changed("gdpr_consent_given") && user.gdpr_consent_given) {
          user.gdpr_consent_date = new Date();
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