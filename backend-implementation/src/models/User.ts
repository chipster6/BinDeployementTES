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
  Association
} from 'sequelize';
import { database } from '@/config/database';
import bcrypt from 'bcrypt';
import { config } from '@/config';

// User role enumeration
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DISPATCHER = 'dispatcher',
  OFFICE_STAFF = 'office_staff',
  DRIVER = 'driver',
  CUSTOMER = 'customer',
  CUSTOMER_STAFF = 'customer_staff'
}

// User status enumeration
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked'
}

/**
 * User model interface
 */
interface UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  // Primary fields
  id: CreationOptional<string>;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  status: CreationOptional<UserStatus>;
  
  // Multi-factor authentication
  mfa_enabled: CreationOptional<boolean>;
  mfa_secret?: string;
  
  // Authentication tracking
  last_login_at?: Date;
  password_changed_at: CreationOptional<Date>;
  failed_login_attempts: CreationOptional<number>;
  locked_until?: Date;
  
  // Audit fields
  created_at: CreationOptional<Date>;
  updated_at: CreationOptional<Date>;
  created_by?: string;
  updated_by?: string;
  version: CreationOptional<number>;
  deleted_at?: Date;
  deleted_by?: string;
  
  // Compliance fields
  gdpr_consent_given: CreationOptional<boolean>;
  gdpr_consent_date?: Date;
  data_retention_until?: Date;
  
  // Instance methods
  validatePassword(password: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
  incrementFailedLogin(): Promise<void>;
  resetFailedLogin(): Promise<void>;
  lockAccount(duration?: number): Promise<void>;
  unlockAccount(): Promise<void>;
  isAccountLocked(): boolean;
  getFullName(): string;
  canAccess(resource: string, action: string): boolean;
  toSafeJSON(): object;
  
  // Password-related methods
  setPassword(password: string): Promise<void>;
  isPasswordExpired(): boolean;
  requiresPasswordReset(): boolean;
  
  // GDPR compliance methods
  giveGdprConsent(): Promise<void>;
  revokeGdprConsent(): Promise<void>;
  
  // Associations (to be defined later)
  // getUserSessions: HasManyGetAssociationsMixin<any>;
  // getAuditLogs: HasManyGetAssociationsMixin<any>;
  
  // Static associations
  static associations: {
    // sessions: Association<UserModel, any>;
    // auditLogs: Association<UserModel, any>;
  };
}

/**
 * User model definition
 */
export const User = database.define<UserModel>('User', {
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
      len: [60, 255], // bcrypt hash length
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
      model: 'User',
      key: 'id',
    },
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'User',
      key: 'id',
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
      model: 'User',
      key: 'id',
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
}, {
  tableName: 'users',
  schema: 'core',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  version: true,
  
  // Indexes
  indexes: [
    {
      unique: true,
      fields: ['email'],
      where: { deleted_at: null },
    },
    {
      fields: ['role'],
      where: { deleted_at: null },
    },
    {
      fields: ['status'],
      where: { deleted_at: null },
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['last_login_at'],
    },
  ],
  
  // Hooks
  hooks: {
    beforeCreate: async (user: UserModel) => {
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
    
    beforeUpdate: async (user: UserModel) => {
      // Increment version
      user.version = (user.version || 1) + 1;
      
      // Update GDPR consent date if consent status changed
      if (user.changed('gdpr_consent_given') && user.gdpr_consent_given) {
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
        exclude: ['password_hash', 'mfa_secret'],
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
});

/**
 * Instance method implementations
 */

// Password validation
User.prototype.validatePassword = async function(password: string): Promise<boolean> {
  if (!password || !this.password_hash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, this.password_hash);
  } catch (error) {
    console.error('Password validation error:', error);
    return false;
  }
};

// Set password with hashing
User.prototype.setPassword = async function(password: string): Promise<void> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  const saltRounds = config.security.bcryptRounds || 12;
  this.password_hash = await bcrypt.hash(password, saltRounds);
  this.password_changed_at = new Date();
  
  // Reset failed login attempts when password is changed
  this.failed_login_attempts = 0;
  this.locked_until = null;
};

// Update last login timestamp
User.prototype.updateLastLogin = async function(): Promise<void> {
  this.last_login_at = new Date();
  await this.save({ fields: ['last_login_at'] });
};

// Increment failed login attempts
User.prototype.incrementFailedLogin = async function(): Promise<void> {
  this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;
  
  // Lock account if too many failed attempts
  const maxAttempts = config.security.accountLockout.attempts || 5;
  if (this.failed_login_attempts >= maxAttempts) {
    const lockDuration = config.security.accountLockout.time || 1800000; // 30 minutes
    this.locked_until = new Date(Date.now() + lockDuration);
    this.status = UserStatus.LOCKED;
  }
  
  await this.save({ fields: ['failed_login_attempts', 'locked_until', 'status'] });
};

// Reset failed login attempts
User.prototype.resetFailedLogin = async function(): Promise<void> {
  this.failed_login_attempts = 0;
  this.locked_until = null;
  
  if (this.status === UserStatus.LOCKED) {
    this.status = UserStatus.ACTIVE;
  }
  
  await this.save({ fields: ['failed_login_attempts', 'locked_until', 'status'] });
};

// Lock account manually
User.prototype.lockAccount = async function(duration: number = 1800000): Promise<void> {
  this.locked_until = new Date(Date.now() + duration);
  this.status = UserStatus.LOCKED;
  await this.save({ fields: ['locked_until', 'status'] });
};

// Unlock account manually
User.prototype.unlockAccount = async function(): Promise<void> {
  this.locked_until = null;
  this.failed_login_attempts = 0;
  this.status = UserStatus.ACTIVE;
  await this.save({ fields: ['locked_until', 'failed_login_attempts', 'status'] });
};

// Check if account is locked
User.prototype.isAccountLocked = function(): boolean {
  if (this.status === UserStatus.LOCKED) {
    // Check if temporary lock has expired
    if (this.locked_until && this.locked_until <= new Date()) {
      // Lock has expired, unlock the account
      this.unlockAccount().catch(console.error);
      return false;
    }
    return true;
  }
  return false;
};

// Get full name
User.prototype.getFullName = function(): string {
  return `${this.first_name} ${this.last_name}`.trim();
};

// Basic role-based access control check
User.prototype.canAccess = function(resource: string, action: string): boolean {
  // Super admin can do everything
  if (this.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // Basic role-based permissions (expand as needed)
  const permissions: Record<UserRole, Record<string, string[]>> = {
    [UserRole.SUPER_ADMIN]: {}, // All permissions
    [UserRole.ADMIN]: {
      users: ['read', 'create', 'update'],
      customers: ['read', 'create', 'update', 'delete'],
      routes: ['read', 'create', 'update', 'delete'],
      vehicles: ['read', 'create', 'update', 'delete'],
      drivers: ['read', 'create', 'update'],
      invoices: ['read', 'create', 'update'],
      analytics: ['read'],
    },
    [UserRole.DISPATCHER]: {
      routes: ['read', 'update'],
      vehicles: ['read'],
      drivers: ['read'],
      service_events: ['read', 'create', 'update'],
      customers: ['read'],
    },
    [UserRole.OFFICE_STAFF]: {
      customers: ['read', 'create', 'update'],
      invoices: ['read', 'create', 'update'],
      service_events: ['read', 'update'],
    },
    [UserRole.DRIVER]: {
      routes: ['read'],
      service_events: ['read', 'update'],
      vehicles: ['read'],
    },
    [UserRole.CUSTOMER]: {
      invoices: ['read'],
      service_events: ['read'],
    },
    [UserRole.CUSTOMER_STAFF]: {
      invoices: ['read'],
      service_events: ['read'],
    },
  };
  
  const rolePermissions = permissions[this.role] || {};
  const resourcePermissions = rolePermissions[resource] || [];
  
  return resourcePermissions.includes(action);
};

// Check if password is expired
User.prototype.isPasswordExpired = function(): boolean {
  if (!this.password_changed_at) return true;
  
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  return Date.now() - this.password_changed_at.getTime() > maxAge;
};

// Check if password reset is required
User.prototype.requiresPasswordReset = function(): boolean {
  return this.isPasswordExpired() || this.password_hash === null;
};

// GDPR consent management
User.prototype.giveGdprConsent = async function(): Promise<void> {
  this.gdpr_consent_given = true;
  this.gdpr_consent_date = new Date();
  await this.save({ fields: ['gdpr_consent_given', 'gdpr_consent_date'] });
};

User.prototype.revokeGdprConsent = async function(): Promise<void> {
  this.gdpr_consent_given = false;
  this.gdpr_consent_date = new Date(); // Track when consent was revoked
  await this.save({ fields: ['gdpr_consent_given', 'gdpr_consent_date'] });
};

// Safe JSON representation (excludes sensitive data)
User.prototype.toSafeJSON = function(): object {
  const values = { ...this.get() };
  
  // Remove sensitive fields
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
};

/**
 * Static methods
 */

// Find user by email
User.findByEmail = async function(email: string): Promise<UserModel | null> {
  return await this.findOne({
    where: { 
      email: email.toLowerCase(),
      deleted_at: null,
    },
  });
};

// Find active users by role
User.findByRole = async function(role: UserRole): Promise<UserModel[]> {
  return await this.scope('active').findAll({
    where: { role },
  });
};

// Create user with hashed password
User.createWithPassword = async function(userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  created_by?: string;
}): Promise<UserModel> {
  const user = this.build({
    email: userData.email.toLowerCase(),
    password_hash: '', // Will be set by setPassword
    first_name: userData.first_name,
    last_name: userData.last_name,
    phone: userData.phone,
    role: userData.role,
    created_by: userData.created_by,
  });
  
  await user.setPassword(userData.password);
  return await user.save();
};

export { UserModel };
export default User;