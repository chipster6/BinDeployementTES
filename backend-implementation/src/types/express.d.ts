import { UserRole, UserStatus } from '@/models/User';

declare global {
  namespace Express {
    interface User {
      // Core identity
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
      
      // Role and permissions
      role: UserRole;
      status: UserStatus;
      organizationId?: string | null;
      
      // Authentication state
      sessionId?: string;
      mfa_enabled: boolean;
      
      // Account security
      last_login_at?: Date | null;
      failed_login_attempts: number;
      locked_until?: Date | null;
      
      // Audit fields
      created_at: Date;
      updated_at: Date;
      version: number;
      deleted_at?: Date | null;
      
      // Methods (for type checking)
      isAccountLocked(): boolean;
      canAccess(resource: string, action: string): Promise<boolean>;
      getFullName(): string;
      hasPermission(permission: string, organizationId?: string): boolean;
      
      // Backwards compatibility
      roles?: string[];
      tenantId?: string;
    }
    
    interface Request {
      user?: User;
      validated?: any;
    }
  }
}

export {};