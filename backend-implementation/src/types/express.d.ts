import { User as UserModel, UserRole, UserStatus } from '@/models/User';

declare global {
  namespace Express {
    interface User {
      // Primary fields
      id: string;
      email: string;
      password_hash: string;
      passwordHash?: string; // Alias for camelCase access
      first_name: string;
      firstName?: string; // Alias for camelCase access
      last_name: string;
      lastName?: string; // Alias for camelCase access
      phone?: string | null;
      role: UserRole | string;
      status: UserStatus;
      organizationId?: string | null;
      
      // Multi-factor authentication
      mfa_enabled: boolean;
      mfaEnabled?: boolean; // Alias for camelCase access
      mfa_secret?: string | null;
      mfaSecret?: string | null; // Alias for camelCase access
      
      // Authentication tracking
      last_login_at?: Date | null;
      lastLoginAt?: Date | null; // Alias for camelCase access
      password_changed_at: Date;
      passwordChangedAt?: Date; // Alias for camelCase access
      failed_login_attempts: number;
      failedLoginAttempts?: number; // Alias for camelCase access
      locked_until?: Date | null;
      lockedUntil?: Date | null; // Alias for camelCase access
      
      // Audit fields
      created_at: Date;
      createdAt?: Date; // Alias for camelCase access
      updated_at: Date;
      updatedAt?: Date; // Alias for camelCase access
      created_by?: string | null;
      createdBy?: string | null; // Alias for camelCase access
      updated_by?: string | null;
      updatedBy?: string | null; // Alias for camelCase access
      version: number;
      deleted_at?: Date | null;
      deletedAt?: Date | null; // Alias for camelCase access
      deleted_by?: string | null;
      deletedBy?: string | null; // Alias for camelCase access
      
      // Compliance fields
      gdpr_consent_given: boolean;
      gdprConsentGiven?: boolean; // Alias for camelCase access
      gdpr_consent_date?: Date | null;
      gdprConsentDate?: Date | null; // Alias for camelCase access
      data_retention_until?: Date | null;
      dataRetentionUntil?: Date | null; // Alias for camelCase access
      
      // Additional properties commonly accessed
      isActive?: boolean;
      preferences?: any;
      security?: any;
      profile?: any;
      
      // Sequelize methods that might be accessed
      save?: () => Promise<this>;
      update?: (values: any) => Promise<this>;
      reload?: () => Promise<this>;
      destroy?: () => Promise<void>;
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};
