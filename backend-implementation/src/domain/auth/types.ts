/**
 * Shared authentication domain types to break circular dependencies
 */

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
  PENDING = "pending",
}

// User ID type
export type UserId = string;

// Role ID type
export type RoleId = string;

// Permission ID type
export type PermissionId = string;

// Session ID type
export type SessionId = string;