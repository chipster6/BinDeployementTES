/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PERMISSION MODEL
 * ============================================================================
 *
 * Database-backed permission system for secure RBAC implementation.
 * Replaces hard-coded permissions to prevent privilege escalation.
 *
 * Features:
 * - Database-backed permission storage
 * - Role-to-permission mapping
 * - Resource-based access control
 * - Dynamic permission assignment
 * - Audit trail for permission changes
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-13
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
  Index,
  BelongsToMany,
} from "sequelize-typescript";
import { UserRole } from "@/domain/auth/types";

/**
 * Permission Actions Enum
 */
export enum PermissionAction {
  CREATE = "create",
  READ = "read", 
  UPDATE = "update",
  DELETE = "delete",
  EXECUTE = "execute",
  ADMIN = "admin",
}

/**
 * Permission Model
 */
@Table({
  tableName: "permissions",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ["resource", "action"],
      unique: true,
    },
    {
      fields: ["resource"],
    },
    {
      fields: ["is_active"],
    },
  ],
})
export class Permission extends Model<Permission> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: "Resource being protected (e.g., users, customers, routes)",
  })
  @Index
  declare resource: string;

  @Column({
    type: DataType.ENUM(...Object.values(PermissionAction)),
    allowNull: false,
    comment: "Action allowed on the resource",
  })
  declare action: PermissionAction;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: "Human-readable description of the permission",
  })
  declare description?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "Whether this permission is active",
  })
  @Index
  declare isActive: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  @DeletedAt
  @Column(DataType.DATE)
  declare deletedAt?: Date;

  /**
   * Static Methods
   */

  /**
   * Initialize default permissions for the system
   */
  static async initializeDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      // User management
      { resource: "users", action: PermissionAction.READ, description: "View user information" },
      { resource: "users", action: PermissionAction.CREATE, description: "Create new users" },
      { resource: "users", action: PermissionAction.UPDATE, description: "Update user information" },
      { resource: "users", action: PermissionAction.DELETE, description: "Delete users" },
      
      // Customer management
      { resource: "customers", action: PermissionAction.READ, description: "View customer information" },
      { resource: "customers", action: PermissionAction.CREATE, description: "Create new customers" },
      { resource: "customers", action: PermissionAction.UPDATE, description: "Update customer information" },
      { resource: "customers", action: PermissionAction.DELETE, description: "Delete customers" },
      
      // Route management
      { resource: "routes", action: PermissionAction.READ, description: "View route information" },
      { resource: "routes", action: PermissionAction.CREATE, description: "Create new routes" },
      { resource: "routes", action: PermissionAction.UPDATE, description: "Update route information" },
      { resource: "routes", action: PermissionAction.DELETE, description: "Delete routes" },
      
      // Vehicle management
      { resource: "vehicles", action: PermissionAction.READ, description: "View vehicle information" },
      { resource: "vehicles", action: PermissionAction.CREATE, description: "Create new vehicles" },
      { resource: "vehicles", action: PermissionAction.UPDATE, description: "Update vehicle information" },
      { resource: "vehicles", action: PermissionAction.DELETE, description: "Delete vehicles" },
      
      // Driver management
      { resource: "drivers", action: PermissionAction.READ, description: "View driver information" },
      { resource: "drivers", action: PermissionAction.CREATE, description: "Create new drivers" },
      { resource: "drivers", action: PermissionAction.UPDATE, description: "Update driver information" },
      { resource: "drivers", action: PermissionAction.DELETE, description: "Delete drivers" },
      
      // Service event management
      { resource: "service_events", action: PermissionAction.READ, description: "View service events" },
      { resource: "service_events", action: PermissionAction.CREATE, description: "Create service events" },
      { resource: "service_events", action: PermissionAction.UPDATE, description: "Update service events" },
      { resource: "service_events", action: PermissionAction.DELETE, description: "Delete service events" },
      
      // Invoice management
      { resource: "invoices", action: PermissionAction.READ, description: "View invoices" },
      { resource: "invoices", action: PermissionAction.CREATE, description: "Create invoices" },
      { resource: "invoices", action: PermissionAction.UPDATE, description: "Update invoices" },
      { resource: "invoices", action: PermissionAction.DELETE, description: "Delete invoices" },
      
      // Analytics
      { resource: "analytics", action: PermissionAction.READ, description: "View analytics and reports" },
      
      // System administration
      { resource: "system", action: PermissionAction.ADMIN, description: "System administration access" },
    ];

    for (const perm of defaultPermissions) {
      await Permission.findOrCreate({
        where: { resource: perm.resource, action: perm.action },
        defaults: perm,
      });
    }
  }

  /**
   * Get permissions for a specific resource
   */
  static async getResourcePermissions(resource: string): Promise<Permission[]> {
    return this.findAll({
      where: {
        resource,
        isActive: true,
      },
    });
  }

  /**
   * Check if a permission exists for a resource and action
   */
  static async permissionExists(resource: string, action: PermissionAction): Promise<boolean> {
    const permission = await this.findOne({
      where: {
        resource,
        action,
        isActive: true,
      },
    });
    return !!permission;
  }
}

export default Permission;