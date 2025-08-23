/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER DTO
 * ============================================================================
 *
 * Data Transfer Object for User entity operations.
 * Handles user data transformation, validation, and serialization.
 *
 * Features:
 * - User profile data transformation
 * - Password and security field masking
 * - Role and permission validation
 * - Organization context handling
 * - API response formatting
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Model } from "sequelize";
import Joi from "joi";
import { BaseDTO, DTOTransformOptions } from "./BaseDTO";
import { User, UserStatus, UserRole } from "@/models/User";
import { UserProfile } from "@/models/user/UserProfile";
import { UserSecurity } from "@/models/user/UserSecurity";

/**
 * User DTO data interface
 */
export interface UserDTOData {
  id?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  emailVerified: boolean;
  organizationId: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Profile data (flattened)
  firstName?: string;
  lastName?: string;
  title?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  timezone?: string;
  locale?: string;

  // Security data (limited)
  mfaEnabled?: boolean;
  passwordAge?: number;
  isLocked?: boolean;

  // Organization data
  organizationName?: string;
  organizationType?: string;
}

/**
 * User creation DTO
 */
export interface CreateUserDTOData {
  email: string;
  password: string;
  role: UserRole;
  organizationId: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
}

/**
 * User update DTO
 */
export interface UpdateUserDTOData {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  title?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
}

/**
 * User DTO class
 */
export class UserDTO extends BaseDTO<UserDTOData> {
  constructor(
    data?: UserDTOData | User | Model,
    options?: DTOTransformOptions,
  ) {
    super(data, options);
  }

  /**
   * Get validation schema for user data
   */
  protected getValidationSchema(): Joi.ObjectSchema {
    return Joi.object({
      id: Joi.string().uuid().optional(),
      email: Joi.string().email().required(),
      role: Joi.string()
        .valid(...Object.values(UserRole))
        .required(),
      status: Joi.string()
        .valid(...Object.values(UserStatus))
        .optional(),
      isActive: Joi.boolean().optional(),
      emailVerified: Joi.boolean().optional(),
      organizationId: Joi.string().uuid().required(),
      lastLoginAt: Joi.date().optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),

      // Profile fields
      firstName: Joi.string().min(1).max(100).optional(),
      lastName: Joi.string().min(1).max(100).optional(),
      title: Joi.string().max(200).optional(),
      department: Joi.string().max(100).optional(),
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .optional(),
      avatar: Joi.string().uri().optional(),
      timezone: Joi.string().max(50).optional(),
      locale: Joi.string().max(10).optional(),

      // Security fields (limited)
      mfaEnabled: Joi.boolean().optional(),
      passwordAge: Joi.number().integer().min(0).optional(),
      isLocked: Joi.boolean().optional(),

      // Organization fields
      organizationName: Joi.string().optional(),
      organizationType: Joi.string().optional(),
    });
  }

  /**
   * Get field mappings between model and DTO
   */
  protected getFieldMappings(): Record<string, string> {
    return {
      // User model fields
      id: "id",
      email: "email",
      role: "role",
      status: "status",
      isActive: "isActive",
      emailVerified: "emailVerified",
      organizationId: "organizationId",
      lastLoginAt: "lastLoginAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",

      // Profile model fields (flattened)
      "profile.firstName": "firstName",
      "profile.lastName": "lastName",
      "profile.title": "title",
      "profile.department": "department",
      "profile.phone": "phone",
      "profile.avatar": "avatar",
      "profile.timezone": "timezone",
      "profile.locale": "locale",

      // Security model fields (limited)
      "security.mfaEnabled": "mfaEnabled",
      "security.isLocked": "isLocked",

      // Organization fields
      "organization.name": "organizationName",
      "organization.type": "organizationType",
    };
  }

  /**
   * Get sensitive fields that should be masked
   */
  protected getSensitiveFields(): string[] {
    return [
      "email", // Partially mask email
      "phone", // Mask phone number
    ];
  }

  /**
   * Transform User model to DTO data
   */
  protected fromModel(model: Model): UserDTOData {
    const userData = model.toJSON() as any;

    const dtoData: UserDTOData = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      isActive: userData.isActive,
      emailVerified: userData.emailVerified,
      organizationId: userData.organizationId,
      lastLoginAt: userData.lastLoginAt,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    // Handle profile data if included
    if (userData.profile) {
      const profile = userData.profile as any;
      dtoData.firstName = profile.firstName;
      dtoData.lastName = profile.lastName;
      dtoData.title = profile.jobTitle; // Use jobTitle instead of title
      dtoData.department = profile.department;
      dtoData.phone = profile.phone;
      dtoData.avatar = profile.profilePhoto; // Use profilePhoto instead of avatar
      // Get timezone and locale from preferences if available
      if (profile.preferences) {
        dtoData.timezone = profile.preferences.system?.timezone || "UTC";
        dtoData.locale = profile.preferences.system?.language || "en";
      }
    }

    // Handle security data if included (limited fields only)
    if (userData.security) {
      const security = userData.security as UserSecurity;
      dtoData.mfaEnabled = security.mfaEnabled;
      dtoData.isLocked = security.isAccountLocked();

      // Calculate password age in days
      if (security.passwordChangedAt) {
        dtoData.passwordAge = Math.floor(
          (Date.now() - security.passwordChangedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }
    }

    // Handle organization data if included
    if (userData.organization) {
      dtoData.organizationName = userData.organization.name;
      dtoData.organizationType = userData.organization.type;
    }

    return dtoData;
  }

  /**
   * Get full name of user
   */
  public getFullName(): string {
    const firstName = this.getField("firstName") || "";
    const lastName = this.getField("lastName") || "";
    return (
      [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown User"
    );
  }

  /**
   * Get display name (full name or email if no name)
   */
  public getDisplayName(): string {
    const fullName = this.getFullName();
    return fullName !== "Unknown User"
      ? fullName
      : this.getField("email") || "Unknown";
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: UserRole): boolean {
    return this.getField("role") === role;
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_ADMIN);
  }

  /**
   * Check if user is active and verified
   */
  public isActiveAndVerified(): boolean {
    return this.getField("isActive") && this.getField("emailVerified");
  }

  /**
   * Get user's role permissions (simplified)
   */
  public getRolePermissions(): string[] {
    const role = this.getField("role");

    switch (role) {
      case UserRole.SUPER_ADMIN:
        return ["*"]; // All permissions
      case UserRole.ADMIN:
        return [
          "users.read",
          "users.create",
          "users.update",
          "customers.read",
          "customers.create",
          "customers.update",
          "bins.read",
          "bins.create",
          "bins.update",
          "routes.read",
          "routes.create",
          "routes.update",
          "reports.read",
        ];
      case UserRole.OFFICE_STAFF:
        return [
          "users.read",
          "customers.read",
          "customers.update",
          "bins.read",
          "bins.update",
          "routes.read",
          "routes.update",
          "reports.read",
        ];
      case UserRole.DISPATCHER:
        return [
          "routes.read",
          "routes.update",
          "bins.read",
          "bins.update",
          "customers.read",
        ];
      case UserRole.DRIVER:
        return ["routes.read", "bins.read", "bins.update", "customers.read"];
      case UserRole.CUSTOMER:
        return [
          "customer.bins.read",
          "customer.bins.update",
          "customer.reports.read",
          "customer.profile.update",
        ];
      case UserRole.CUSTOMER_STAFF:
        return ["customer.bins.read", "customer.reports.read"];
      default:
        return [];
    }
  }

  /**
   * Get safe data for public API response
   */
  public toPublicJSON(): Partial<UserDTOData> {
    const safeData = this.toSafeJSON();

    // Remove sensitive fields for public responses
    const { passwordAge, mfaEnabled, isLocked, organizationId, ...publicData } =
      safeData;

    return publicData;
  }

  /**
   * Get summary data for lists/tables
   */
  public toSummaryJSON(): any {
    const result: any = {
      email: this.maskSensitiveField(this.getField("email")),
      role: this.getField("role"),
      status: this.getField("status"),
      isActive: this.getField("isActive"),
    };

    // Only include properties that have values to avoid undefined issues
    const id = this.getField("id");
    if (id !== undefined) result.id = id;

    const firstName = this.getField("firstName");
    if (firstName !== undefined) result.firstName = firstName;

    const lastName = this.getField("lastName");
    if (lastName !== undefined) result.lastName = lastName;

    const title = this.getField("title");
    if (title !== undefined) result.title = title;

    const organizationName = this.getField("organizationName");
    if (organizationName !== undefined)
      result.organizationName = organizationName;

    const lastLoginAt = this.getField("lastLoginAt");
    if (lastLoginAt !== undefined) result.lastLoginAt = lastLoginAt;

    return result;
  }

  /**
   * Static factory methods
   */

  /**
   * Create DTO from User model with associations
   */
  public static fromUserModel(
    user: User,
    options?: DTOTransformOptions,
  ): UserDTO {
    return new UserDTO(user, options);
  }

  /**
   * Create DTO from creation data
   */
  public static fromCreateData(data: CreateUserDTOData): UserDTO {
    const dtoData: UserDTOData = {
      email: data.email.toLowerCase(),
      role: data.role,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: false,
      organizationId: data.organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      timezone: data?.timezone || "UTC",
      locale: data?.locale || "en",
    };

    // Only add optional properties if they have values
    if (data.title !== undefined) dtoData.title = data.title;
    if (data.department !== undefined) dtoData.department = data.department;
    if (data.phone !== undefined) dtoData.phone = data.phone;

    return new UserDTO(dtoData);
  }

  /**
   * Create DTO for update operations
   */
  public static fromUpdateData(data: UpdateUserDTOData): UserDTO {
    const dtoData: Partial<UserDTOData> = {};

    // Only include provided fields
    Object.keys(data).forEach((key) => {
      if ((data as any)[key] !== undefined) {
        (dtoData as any)[key] = (data as any)[key];
      }
    });

    // Normalize email
    if (data.email) {
      dtoData.email = data.email.toLowerCase();
    }

    return new UserDTO(dtoData as UserDTOData);
  }
}

export default UserDTO;
