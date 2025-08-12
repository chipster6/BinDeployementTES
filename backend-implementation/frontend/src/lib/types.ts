// User role enumeration matching backend
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin", 
  DISPATCHER = "dispatcher",
  OFFICE_STAFF = "office_staff",
  DRIVER = "driver",
  CUSTOMER = "customer",
  CUSTOMER_STAFF = "customer_staff",
}

// User status enumeration matching backend
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", 
  SUSPENDED = "suspended",
  LOCKED = "locked",
}

// User interface
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  mfa_enabled: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Authentication response
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refreshToken?: string;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

// Register data
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

// Bin interface
export interface Bin {
  id: string;
  bin_id: string;
  customer_id?: string;
  location?: string;
  type: string;
  size: number;
  fill_level: number;
  status: string;
  last_collection?: string;
  next_collection?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  updated_at: string;
}

// Customer interface
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  service_type: string;
  billing_cycle: string;
  status: string;
  created_at: string;
  updated_at: string;
}