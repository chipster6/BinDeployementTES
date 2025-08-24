/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUDIT LOG MODEL
 * ============================================================================
 *
 * Sequelize model for comprehensive audit logging to meet compliance
 * requirements including GDPR, PCI DSS, SOX, and HIPAA where applicable.
 *
 * Features:
 * - Complete CRUD operation tracking
 * - Sensitive data access logging
 * - IP address and user agent tracking
 * - Before/after value comparison
 * - Compliance-focused data retention
 * - Tamper-proof audit trail
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  Association,
  BelongsToGetAssociationMixin,
} from "sequelize";
import { sequelize } from "@/config/database";
import { User } from "./User";
import { UserSession } from "./UserSession";
import crypto from "crypto";

/**
 * Audit action enumeration
 */
export enum AuditAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  DOWNLOAD = "DOWNLOAD",
  ACCESS = "ACCESS",
}

/**
 * Data sensitivity level enumeration
 */
export enum SensitivityLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted",
}

/**
 * Audit log attributes interface
 */
export interface AuditLogAttributes {
  id: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  sensitiveDataAccessed: boolean;
  sensitivityLevel: SensitivityLevel;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  accessTimestamp: Date;
  dataRetentionUntil: Date;
  checksum: string;
  context?: Record<string, any>;
}

/**
 * Audit log creation attributes
 */
export interface AuditLogCreationAttributes
  extends Omit<
    AuditLogAttributes,
    "id" | "accessTimestamp" | "checksum" | "dataRetentionUntil"
  > {
  id?: string;
  accessTimestamp?: Date;
  dataRetentionUntil?: Date;
  checksum?: string;
}

/**
 * Audit log model class
 */
export class AuditLog extends Model<
  InferAttributes<AuditLog>,
  InferCreationAttributes<AuditLog>
> {
  // Model attributes
  declare id: CreationOptional<string>;
  declare tableName: string;
  declare recordId: string;
  declare action: AuditAction;
  declare userId: ForeignKey<User["id"]> | null;
  declare sessionId: ForeignKey<UserSession["id"]> | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare sensitiveDataAccessed: boolean;
  declare sensitivityLevel: SensitivityLevel;
  declare oldValues: Record<string, any> | null;
  declare newValues: Record<string, any> | null;
  declare changedFields: string[] | null;
  declare accessTimestamp: CreationOptional<Date>;
  declare dataRetentionUntil: CreationOptional<Date>;
  declare checksum: CreationOptional<string>;
  declare context: Record<string, any> | null;

  // Associations
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare user?: User;
  declare getSession: BelongsToGetAssociationMixin<UserSession>;
  declare session?: UserSession;

  // Association declarations
  declare static associations: {
    user: Association<AuditLog, User>;
    session: Association<AuditLog, UserSession>;
  };

  /**
   * Create audit log entry for data access
   */
  static async logDataAccess(
    tableName: string,
    recordId: string,
    action: AuditAction,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<AuditLog> {
    // Determine if sensitive data was accessed
    const sensitiveDataAccessed = AuditLog.containsSensitiveData(
      tableName,
      oldValues,
      newValues,
    );

    // Determine sensitivity level
    const sensitivityLevel = AuditLog.getSensitivityLevel(tableName);

    // Calculate changed fields for UPDATE operations
    let changedFields: string[] | null = null;
    if (action === AuditAction.UPDATE && oldValues && newValues) {
      changedFields = Object.keys(newValues).filter(
        (key) =>
          JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]),
      );
    }

    const auditLog = await AuditLog.create({
      tableName,
      recordId,
      action,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      sensitiveDataAccessed,
      sensitivityLevel,
      oldValues,
      newValues,
      changedFields,
      context,
    });

    return auditLog;
  }

  /**
   * Determine if the operation involves sensitive data
   */
  private static containsSensitiveData(
    tableName: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): boolean {
    const sensitiveFields = {
      users: ["password_hash", "mfa_secret", "phone"],
      customers: [
        "tax_id_encrypted",
        "bank_account_info_encrypted",
        "credit_card_info_encrypted",
      ],
      drivers: [
        "ssn_encrypted",
        "license_number_encrypted",
        "emergency_contact_encrypted",
      ],
      payments: [
        "payment_token_encrypted",
        "account_details_encrypted",
        "routing_number_encrypted",
      ],
      organizations: ["tax_id_encrypted"],
    };

    const tableSensitiveFields =
      sensitiveFields[tableName as keyof typeof sensitiveFields] || [];

    const allValues = { ...oldValues, ...newValues };
    return tableSensitiveFields.some((field) => field in allValues);
  }

  /**
   * Get sensitivity level for a table
   */
  private static getSensitivityLevel(tableName: string): SensitivityLevel {
    const sensitivityMapping = {
      // Restricted (highest sensitivity)
      payments: SensitivityLevel.RESTRICTED,
      audit_logs: SensitivityLevel.RESTRICTED,

      // Confidential
      users: SensitivityLevel.CONFIDENTIAL,
      customers: SensitivityLevel.CONFIDENTIAL,
      drivers: SensitivityLevel.CONFIDENTIAL,
      organizations: SensitivityLevel.CONFIDENTIAL,
      invoices: SensitivityLevel.CONFIDENTIAL,
      user_sessions: SensitivityLevel.CONFIDENTIAL,

      // Internal
      vehicles: SensitivityLevel.INTERNAL,
      routes: SensitivityLevel.INTERNAL,
      service_events: SensitivityLevel.INTERNAL,
      bins: SensitivityLevel.INTERNAL,
      gps_tracking: SensitivityLevel.INTERNAL,
      sensor_data: SensitivityLevel.INTERNAL,

      // Public (lowest sensitivity)
      system_config: SensitivityLevel.PUBLIC,
    };

    return (
      sensitivityMapping[tableName as keyof typeof sensitivityMapping] ||
      SensitivityLevel.INTERNAL
    );
  }

  /**
   * Generate integrity checksum for tamper detection
   */
  private generateChecksum(): string {
    const data = {
      tableName: this.tableName,
      recordId: this.recordId,
      action: this.action,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      sensitiveDataAccessed: this.sensitiveDataAccessed,
      oldValues: this.oldValues,
      newValues: this.newValues,
      accessTimestamp: this.accessTimestamp?.toISOString(),
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  /**
   * Verify integrity checksum
   */
  verifyIntegrity(): boolean {
    const currentChecksum = this.generateChecksum();
    return currentChecksum === this.checksum;
  }

  /**
   * Check if audit log is within retention period
   */
  isWithinRetentionPeriod(): boolean {
    return new Date() <= this.dataRetentionUntil;
  }

  /**
   * Get formatted change summary for reporting
   */
  getChangeSummary(): string {
    if (
      this.action !== AuditAction.UPDATE ||
      !this.changedFields ||
      this.changedFields.length === 0
    ) {
      return `${this.action} operation on ${this.tableName}`;
    }

    return `Updated ${this.changedFields.join(", ")} on ${this.tableName}`;
  }

  /**
   * Get compliance report data
   */
  getComplianceData(): {
    recordId: string;
    action: string;
    timestamp: Date;
    user: string;
    sensitiveData: boolean;
    changes: string;
  } {
    return {
      recordId: this.recordId,
      action: this.action,
      timestamp: this.accessTimestamp,
      user: this?.userId || "system",
      sensitiveData: this.sensitiveDataAccessed,
      changes: this.getChangeSummary(),
    };
  }

  /**
   * Redact sensitive information from audit log for reporting
   */
  getRedactedValues(): {
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  } {
    const redactValue = (value: any, fieldName: string): any => {
      // List of fields to redact
      const redactedFields = [
        "password",
        "password_hash",
        "token",
        "secret",
        "key",
        "ssn",
        "tax_id",
        "credit_card",
        "bank_account",
        "routing_number",
      ];

      if (
        redactedFields.some((field) => fieldName.toLowerCase().includes(field))
      ) {
        return "[REDACTED]";
      }

      return value;
    };

    const redactObject = (
      obj?: Record<string, any>,
    ): Record<string, any> | undefined => {
      if (!obj) return undefined;

      return Object.keys(obj).reduce(
        (redacted, key) => {
          redacted[key] = redactValue(obj[key], key);
          return redacted;
        },
        {} as Record<string, any>,
      );
    };

    return {
      oldValues: redactObject(this.oldValues),
      newValues: redactObject(this.newValues),
    };
  }

  /**
   * JSON serialization with security considerations
   */
  toJSON(): Partial<AuditLogAttributes> {
    const attributes = { ...this.get() };

    // For non-admin users, redact sensitive values
    const { oldValues, newValues } = this.getRedactedValues();
    attributes.oldValues = oldValues;
    attributes.newValues = newValues;

    return attributes;
  }
}

/**
 * Initialize AuditLog model with Sequelize
 */
AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tableName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "table_name",
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "record_id",
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AuditAction)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(AuditAction)],
          msg: "Action must be a valid audit action",
        },
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "session_id",
      references: {
        model: "user_sessions",
        key: "id",
      },
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },
    sensitiveDataAccessed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "sensitive_data_accessed",
    },
    sensitivityLevel: {
      type: DataTypes.ENUM(...Object.values(SensitivityLevel)),
      allowNull: false,
      defaultValue: SensitivityLevel.INTERNAL,
      field: "sensitivity_level",
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "old_values",
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "new_values",
    },
    changedFields: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      field: "changed_fields",
    },
    accessTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "access_timestamp",
    },
    dataRetentionUntil: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      field: "data_retention_until",
    },
    checksum: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Additional context information about the operation",
    },
  },
  {
    sequelize,
    modelName: "AuditLog",
    tableName: "data_access_logs",
    schema: "audit",
    timestamps: false, // We handle timestamps manually

    // Indexes for performance and compliance reporting
    indexes: [
      {
        fields: ["table_name", "record_id"],
      },
      {
        fields: ["user_id", "access_timestamp"],
      },
      {
        fields: ["sensitive_data_accessed", "access_timestamp"],
        where: { sensitive_data_accessed: true },
      },
      {
        fields: ["action", "access_timestamp"],
      },
      {
        fields: ["sensitivity_level", "access_timestamp"],
      },
      {
        fields: ["data_retention_until"],
      },
      {
        fields: ["ip_address", "access_timestamp"],
      },
      {
        // Compound index for compliance reporting
        fields: ["table_name", "action", "access_timestamp"],
      },
    ],

    // Hooks for integrity and automation
    hooks: {
      beforeCreate: (auditLog: AuditLog) => {
        // Generate integrity checksum
        auditLog.checksum = auditLog.generateChecksum();

        // Set retention period based on sensitivity level
        if (!auditLog.dataRetentionUntil) {
          let retentionMonths = 12; // Default 1 year

          switch (auditLog.sensitivityLevel) {
            case SensitivityLevel.RESTRICTED:
              retentionMonths = 84; // 7 years for financial/PCI data
              break;
            case SensitivityLevel.CONFIDENTIAL:
              retentionMonths = 36; // 3 years for personal data
              break;
            case SensitivityLevel.INTERNAL:
              retentionMonths = 24; // 2 years for operational data
              break;
            case SensitivityLevel.PUBLIC:
              retentionMonths = 12; // 1 year for public data
              break;
          }

          auditLog.dataRetentionUntil = new Date(
            Date.now() + retentionMonths * 30 * 24 * 60 * 60 * 1000,
          );
        }
      },

      afterCreate: (auditLog: AuditLog) => {
        // Log high-risk audit events
        if (auditLog.sensitiveDataAccessed) {
          console.warn(
            `Sensitive data access logged: ${auditLog.tableName}:${auditLog.recordId} ` +
              `by user ${auditLog?.userId || "system"}`,
          );
        }
      },

      beforeUpdate: () => {
        // Prevent modification of audit logs (immutable)
        throw new Error("Audit logs are immutable and cannot be modified");
      },

      beforeDestroy: () => {
        // Prevent deletion of audit logs (immutable)
        throw new Error("Audit logs are immutable and cannot be deleted");
      },
    },

    // Scopes for different types of audit queries
    scopes: {
      sensitiveData: {
        where: {
          sensitiveDataAccessed: true,
        },
      },
      byUser: (userId: string) => ({
        where: {
          userId,
        },
      }),
      byTable: (tableName: string) => ({
        where: {
          tableName,
        },
      }),
      byAction: (action: AuditAction) => ({
        where: {
          action,
        },
      }),
      recentActivity: (hours: number = 24) => ({
        where: {
          accessTimestamp: {
            [sequelize.Op.gte]: new Date(
              Date.now() - hours * 60 * 60 * 1000,
            ),
          },
        },
      }),
      withinRetention: {
        where: {
          dataRetentionUntil: {
            [sequelize.Op.gt]: new Date(),
          },
        },
      },
      expiredRetention: {
        where: {
          dataRetentionUntil: {
            [sequelize.Op.lte]: new Date(),
          },
        },
      },
      highSensitivity: {
        where: {
          sensitivityLevel: [
            SensitivityLevel.RESTRICTED,
            SensitivityLevel.CONFIDENTIAL,
          ],
        },
      },
    },
  },
);

// Define associations
AuditLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

AuditLog.belongsTo(UserSession, {
  foreignKey: "sessionId",
  as: "session",
});

User.hasMany(AuditLog, {
  foreignKey: "userId",
  as: "auditLogs",
});

export default AuditLog;
