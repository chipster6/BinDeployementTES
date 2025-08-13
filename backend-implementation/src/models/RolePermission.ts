/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ROLE PERMISSION MODEL
 * ============================================================================
 *
 * Junction table for mapping user roles to permissions.
 * Enables database-backed RBAC with proper security controls.
 *
 * Features:
 * - Role-to-permission mapping
 * - Database-backed access control
 * - Audit trail for permission changes
 * - Dynamic permission assignment
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
  ForeignKey,
  BelongsTo,
  Index,
} from "sequelize-typescript";
import { UserRole } from "./User";
import { Permission, PermissionAction } from "./Permission";

/**
 * Role Permission Model
 */
@Table({
  tableName: "role_permissions",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ["role", "permission_id"],
      unique: true,
    },
    {
      fields: ["role"],
    },
    {
      fields: ["permission_id"],
    },
  ],
})
export class RolePermission extends Model<RolePermission> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    comment: "User role that has this permission",
  })
  @Index
  declare role: UserRole;

  @ForeignKey(() => Permission)
  @Column(DataType.UUID)
  @Index
  declare permissionId: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "Whether this role-permission mapping is active",
  })
  declare isActive: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: "Additional constraints or conditions for this permission",
  })
  declare constraints?: string;

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
  @BelongsTo(() => Permission)
  declare permission: Permission;

  /**
   * Static Methods
   */

  /**
   * Initialize default role permissions
   */
  static async initializeDefaultRolePermissions(): Promise<void> {
    // First ensure permissions exist
    await Permission.initializeDefaultPermissions();

    const rolePermissions = [
      // SUPER_ADMIN: Full access to everything
      { role: UserRole.SUPER_ADMIN, resource: "system", action: PermissionAction.ADMIN },
      { role: UserRole.SUPER_ADMIN, resource: "users", action: PermissionAction.CREATE },
      { role: UserRole.SUPER_ADMIN, resource: "users", action: PermissionAction.READ },
      { role: UserRole.SUPER_ADMIN, resource: "users", action: PermissionAction.UPDATE },
      { role: UserRole.SUPER_ADMIN, resource: "users", action: PermissionAction.DELETE },
      
      // ADMIN: Comprehensive management access
      { role: UserRole.ADMIN, resource: "users", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "users", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "users", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "customers", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "customers", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "customers", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "customers", action: PermissionAction.DELETE },
      { role: UserRole.ADMIN, resource: "routes", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "routes", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "routes", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "routes", action: PermissionAction.DELETE },
      { role: UserRole.ADMIN, resource: "vehicles", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "vehicles", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "vehicles", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "vehicles", action: PermissionAction.DELETE },
      { role: UserRole.ADMIN, resource: "drivers", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "drivers", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "drivers", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "invoices", action: PermissionAction.READ },
      { role: UserRole.ADMIN, resource: "invoices", action: PermissionAction.CREATE },
      { role: UserRole.ADMIN, resource: "invoices", action: PermissionAction.UPDATE },
      { role: UserRole.ADMIN, resource: "analytics", action: PermissionAction.READ },
      
      // DISPATCHER: Route and service management
      { role: UserRole.DISPATCHER, resource: "routes", action: PermissionAction.READ },
      { role: UserRole.DISPATCHER, resource: "routes", action: PermissionAction.UPDATE },
      { role: UserRole.DISPATCHER, resource: "vehicles", action: PermissionAction.READ },
      { role: UserRole.DISPATCHER, resource: "drivers", action: PermissionAction.READ },
      { role: UserRole.DISPATCHER, resource: "service_events", action: PermissionAction.READ },
      { role: UserRole.DISPATCHER, resource: "service_events", action: PermissionAction.CREATE },
      { role: UserRole.DISPATCHER, resource: "service_events", action: PermissionAction.UPDATE },
      { role: UserRole.DISPATCHER, resource: "customers", action: PermissionAction.READ },
      
      // OFFICE_STAFF: Customer and invoice management
      { role: UserRole.OFFICE_STAFF, resource: "customers", action: PermissionAction.READ },
      { role: UserRole.OFFICE_STAFF, resource: "customers", action: PermissionAction.CREATE },
      { role: UserRole.OFFICE_STAFF, resource: "customers", action: PermissionAction.UPDATE },
      { role: UserRole.OFFICE_STAFF, resource: "invoices", action: PermissionAction.READ },
      { role: UserRole.OFFICE_STAFF, resource: "invoices", action: PermissionAction.CREATE },
      { role: UserRole.OFFICE_STAFF, resource: "invoices", action: PermissionAction.UPDATE },
      { role: UserRole.OFFICE_STAFF, resource: "service_events", action: PermissionAction.READ },
      { role: UserRole.OFFICE_STAFF, resource: "service_events", action: PermissionAction.UPDATE },
      
      // DRIVER: Limited route and service access
      { role: UserRole.DRIVER, resource: "routes", action: PermissionAction.READ },
      { role: UserRole.DRIVER, resource: "service_events", action: PermissionAction.READ },
      { role: UserRole.DRIVER, resource: "service_events", action: PermissionAction.UPDATE },
      { role: UserRole.DRIVER, resource: "vehicles", action: PermissionAction.READ },
      
      // CUSTOMER: Own data access only
      { role: UserRole.CUSTOMER, resource: "invoices", action: PermissionAction.READ },
      { role: UserRole.CUSTOMER, resource: "service_events", action: PermissionAction.READ },
      
      // CUSTOMER_STAFF: Same as customer
      { role: UserRole.CUSTOMER_STAFF, resource: "invoices", action: PermissionAction.READ },
      { role: UserRole.CUSTOMER_STAFF, resource: "service_events", action: PermissionAction.READ },
    ];

    for (const rolePerm of rolePermissions) {
      // Find the permission by resource and action
      const permission = await Permission.findOne({
        where: {
          resource: rolePerm.resource,
          action: rolePerm.action,
          isActive: true,
        },
      });

      if (permission) {
        await RolePermission.findOrCreate({
          where: {
            role: rolePerm.role,
            permissionId: permission.id,
          },
          defaults: {
            role: rolePerm.role,
            permissionId: permission.id,
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * Check if a role has a specific permission
   */
  static async hasPermission(
    role: UserRole,
    resource: string,
    action: PermissionAction
  ): Promise<boolean> {
    // SUPER_ADMIN has all permissions
    if (role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const rolePermission = await this.findOne({
      include: [
        {
          model: Permission,
          where: {
            resource,
            action,
            isActive: true,
          },
        },
      ],
      where: {
        role,
        isActive: true,
      },
    });

    return !!rolePermission;
  }

  /**
   * Get all permissions for a role
   */
  static async getRolePermissions(role: UserRole): Promise<Permission[]> {
    const rolePermissions = await this.findAll({
      include: [Permission],
      where: {
        role,
        isActive: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Grant permission to a role
   */
  static async grantPermission(
    role: UserRole,
    resource: string,
    action: PermissionAction
  ): Promise<RolePermission | null> {
    const permission = await Permission.findOne({
      where: { resource, action, isActive: true },
    });

    if (!permission) {
      return null;
    }

    const [rolePermission] = await this.findOrCreate({
      where: {
        role,
        permissionId: permission.id,
      },
      defaults: {
        role,
        permissionId: permission.id,
        isActive: true,
      },
    });

    return rolePermission;
  }

  /**
   * Revoke permission from a role
   */
  static async revokePermission(
    role: UserRole,
    resource: string,
    action: PermissionAction
  ): Promise<boolean> {
    const permission = await Permission.findOne({
      where: { resource, action },
    });

    if (!permission) {
      return false;
    }

    const deleted = await this.destroy({
      where: {
        role,
        permissionId: permission.id,
      },
    });

    return deleted > 0;
  }
}

export default RolePermission;