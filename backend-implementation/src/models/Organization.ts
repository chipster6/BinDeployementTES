/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ORGANIZATION MODEL
 * ============================================================================
 *
 * Sequelize model for organizations/companies with multi-tenant support,
 * spatial data capabilities, and comprehensive compliance features.
 *
 * Features:
 * - Multi-tenant architecture support
 * - PostGIS spatial data for service locations
 * - Encrypted sensitive fields (tax_id)
 * - GDPR compliance and data retention
 * - Comprehensive audit trail
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
  HasOneGetAssociationMixin,
  HasManyGetAssociationsMixin,
} from "sequelize";
import { sequelize } from "@/config/database";
import { User } from "./User";
import { encryptSensitiveData, decryptSensitiveData } from "@/utils/encryption";

/**
 * Organization type enumeration
 */
export enum OrganizationType {
  CUSTOMER = "customer",
  VENDOR = "vendor",
  PARTNER = "partner",
}

/**
 * Organization status enumeration
 */
export enum OrganizationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/**
 * Data retention policy enumeration
 */
export enum DataRetentionPolicy {
  SEVEN_YEARS = "7_years",
  FIVE_YEARS = "5_years",
  THREE_YEARS = "3_years",
  ONE_YEAR = "1_year",
}

/**
 * Organization attributes interface
 */
export interface OrganizationAttributes {
  id: string;
  name: string;
  legalName?: string;
  taxIdEncrypted?: string;
  type: OrganizationType;
  status: OrganizationStatus;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry: string;
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry: string;
  serviceLocation?: any; // PostGIS POINT
  primaryContactId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  // GDPR compliance fields
  gdprApplicable: boolean;
  dataRetentionPolicy: DataRetentionPolicy;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * Organization creation attributes
 */
export interface OrganizationCreationAttributes
  extends Omit<
    OrganizationAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "version"
    | "billingCountry"
    | "serviceCountry"
    | "gdprApplicable"
    | "dataRetentionPolicy"
  > {
  id?: string;
  billingCountry?: string;
  serviceCountry?: string;
  gdprApplicable?: boolean;
  dataRetentionPolicy?: DataRetentionPolicy;
  version?: number;
}

/**
 * Organization model class
 */
export class Organization extends Model<
  InferAttributes<Organization>,
  InferCreationAttributes<Organization>
> {
  // Model attributes
  declare id: CreationOptional<string>;
  declare name: string;
  declare legalName: string | null;
  declare taxIdEncrypted: string | null;
  declare type: OrganizationType;
  declare status: CreationOptional<OrganizationStatus>;
  declare billingAddressLine1: string | null;
  declare billingAddressLine2: string | null;
  declare billingCity: string | null;
  declare billingState: string | null;
  declare billingPostalCode: string | null;
  declare billingCountry: CreationOptional<string>;
  declare serviceAddressLine1: string | null;
  declare serviceAddressLine2: string | null;
  declare serviceCity: string | null;
  declare serviceState: string | null;
  declare servicePostalCode: string | null;
  declare serviceCountry: CreationOptional<string>;
  declare serviceLocation: any; // PostGIS POINT type
  declare primaryContactId: ForeignKey<User["id"]> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare createdBy: ForeignKey<User["id"]> | null;
  declare updatedBy: ForeignKey<User["id"]> | null;

  // GDPR compliance fields
  declare gdprApplicable: CreationOptional<boolean>;
  declare dataRetentionPolicy: CreationOptional<DataRetentionPolicy>;

  // Audit fields
  declare version: CreationOptional<number>;
  declare deletedAt: Date | null;
  declare deletedBy: ForeignKey<User["id"]> | null;

  // Associations
  declare getPrimaryContact: BelongsToGetAssociationMixin<User>;
  declare primaryContact?: User;
  declare getCreatedByUser: BelongsToGetAssociationMixin<User>;
  declare createdByUser?: User;
  declare getUpdatedByUser: BelongsToGetAssociationMixin<User>;
  declare updatedByUser?: User;

  // Association declarations
  declare static associations: {
    primaryContact: Association<Organization, User>;
    createdByUser: Association<Organization, User>;
    updatedByUser: Association<Organization, User>;
  };

  /**
   * Set tax ID with encryption
   */
  async setTaxId(taxId: string): Promise<void> {
    if (taxId) {
      this.taxIdEncrypted = await encryptSensitiveData(taxId);
    } else {
      this.taxIdEncrypted = null;
    }
  }

  /**
   * Get decrypted tax ID
   */
  async getTaxId(): Promise<string | null> {
    if (!this.taxIdEncrypted) {
      return null;
    }

    try {
      return await decryptSensitiveData(this.taxIdEncrypted);
    } catch (error: unknown) {
      console.error("Failed to decrypt tax ID:", error);
      return null;
    }
  }

  /**
   * Get full billing address
   */
  get billingAddress(): string {
    const parts = [
      this.billingAddressLine1,
      this.billingAddressLine2,
      this.billingCity,
      this.billingState,
      this.billingPostalCode,
      this.billingCountry,
    ].filter(Boolean);

    return parts.join(", ");
  }

  /**
   * Get full service address
   */
  get serviceAddress(): string {
    const parts = [
      this.serviceAddressLine1,
      this.serviceAddressLine2,
      this.serviceCity,
      this.serviceState,
      this.servicePostalCode,
      this.serviceCountry,
    ].filter(Boolean);

    return parts.join(", ");
  }

  /**
   * Check if organization is in EU (for GDPR applicability)
   */
  isInEU(): boolean {
    const euCountries = [
      "AT",
      "BE",
      "BG",
      "HR",
      "CY",
      "CZ",
      "DK",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "HU",
      "IE",
      "IT",
      "LV",
      "LT",
      "LU",
      "MT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SK",
      "SI",
      "ES",
      "SE",
    ];

    return (
      euCountries.includes(this.billingCountry) ||
      euCountries.includes(this.serviceCountry)
    );
  }

  /**
   * Set service location from coordinates
   */
  setServiceLocationFromCoords(latitude: number, longitude: number): void {
    // PostGIS POINT format: POINT(longitude latitude)
    this.serviceLocation = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
  }

  /**
   * Get service location coordinates
   */
  getServiceLocationCoords(): { latitude: number; longitude: number } | null {
    if (!this.serviceLocation || !this.serviceLocation.coordinates) {
      return null;
    }

    const [longitude, latitude] = this.serviceLocation.coordinates;
    return { latitude, longitude };
  }

  /**
   * Calculate distance to another organization (in kilometers)
   */
  async distanceTo(other: Organization): Promise<number | null> {
    if (!this.serviceLocation || !other.serviceLocation) {
      return null;
    }

    // Use PostGIS ST_Distance function for accurate geographic distance
    const result = await sequelize.query(
      `SELECT ST_Distance(
        ST_GeogFromText(:location1),
        ST_GeogFromText(:location2)
      ) / 1000 as distance`,
      {
        replacements: {
          location1: `POINT(${this.serviceLocation.coordinates[0]} ${this.serviceLocation.coordinates[1]})`,
          location2: `POINT(${other.serviceLocation.coordinates[0]} ${other.serviceLocation.coordinates[1]})`,
        },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0]?.distance || null;
  }

  /**
   * Get data retention date based on policy
   */
  getDataRetentionDate(): Date {
    const now = new Date();
    let years = 7; // Default

    switch (this.dataRetentionPolicy) {
      case DataRetentionPolicy.ONE_YEAR:
        years = 1;
        break;
      case DataRetentionPolicy.THREE_YEARS:
        years = 3;
        break;
      case DataRetentionPolicy.FIVE_YEARS:
        years = 5;
        break;
      case DataRetentionPolicy.SEVEN_YEARS:
        years = 7;
        break;
    }

    return new Date(now.getFullYear() + years, now.getMonth(), now.getDate());
  }

  /**
   * Check if organization is a customer
   */
  get isCustomer(): boolean {
    return this.type === OrganizationType.CUSTOMER;
  }

  /**
   * Check if organization is active
   */
  get isActive(): boolean {
    return this.status === OrganizationStatus.ACTIVE;
  }

  /**
   * Anonymize organization data for GDPR compliance
   */
  async anonymize(): Promise<void> {
    this.name = `Anonymous Organization ${this.id}`;
    this.legalName = null;
    this.taxIdEncrypted = null;
    this.billingAddressLine1 = null;
    this.billingAddressLine2 = null;
    this.billingCity = null;
    this.billingState = null;
    this.billingPostalCode = null;
    this.serviceAddressLine1 = null;
    this.serviceAddressLine2 = null;
    this.serviceCity = null;
    this.serviceState = null;
    this.servicePostalCode = null;
    this.serviceLocation = null;
    this.deletedAt = new Date();

    await this.save();
  }

  /**
   * JSON serialization (exclude sensitive fields)
   */
  toJSON(): Partial<OrganizationAttributes> {
    const attributes = { ...this.get() };

    // Remove sensitive fields from JSON output
    delete attributes.taxIdEncrypted;
    delete attributes.deletedBy;

    return attributes;
  }
}

/**
 * Initialize Organization model with Sequelize
 */
Organization.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [1, 255],
          msg: "Organization name must be between 1 and 255 characters",
        },
      },
    },
    legalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "legal_name",
      validate: {
        len: {
          args: [1, 255],
          msg: "Legal name must be between 1 and 255 characters",
        },
      },
    },
    taxIdEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "tax_id_encrypted",
    },
    type: {
      type: DataTypes.ENUM(...Object.values(OrganizationType)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(OrganizationType)],
          msg: "Type must be one of the defined organization types",
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OrganizationStatus)),
      allowNull: false,
      defaultValue: OrganizationStatus.ACTIVE,
    },
    billingAddressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "billing_address_line1",
    },
    billingAddressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "billing_address_line2",
    },
    billingCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "billing_city",
    },
    billingState: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "billing_state",
    },
    billingPostalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "billing_postal_code",
    },
    billingCountry: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "US",
      field: "billing_country",
      validate: {
        len: [2, 2],
        isUppercase: true,
      },
    },
    serviceAddressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "service_address_line1",
    },
    serviceAddressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "service_address_line2",
    },
    serviceCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "service_city",
    },
    serviceState: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "service_state",
    },
    servicePostalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "service_postal_code",
    },
    serviceCountry: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "US",
      field: "service_country",
      validate: {
        len: [2, 2],
        isUppercase: true,
      },
    },
    serviceLocation: {
      type: DataTypes.GEOMETRY("POINT", 4326), // PostGIS POINT with WGS84
      allowNull: true,
      field: "service_location",
    },
    primaryContactId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "primary_contact_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    // GDPR compliance fields
    gdprApplicable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "gdpr_applicable",
    },
    dataRetentionPolicy: {
      type: DataTypes.ENUM(...Object.values(DataRetentionPolicy)),
      allowNull: false,
      defaultValue: DataRetentionPolicy.SEVEN_YEARS,
      field: "data_retention_policy",
    },
    // Audit fields
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "deleted_by",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Organization",
    tableName: "organizations",
    schema: "core",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    paranoid: false, // We handle soft deletes manually

    // Indexes for performance
    indexes: [
      {
        fields: ["type"],
        where: { deleted_at: null },
      },
      {
        fields: ["status"],
        where: { deleted_at: null },
      },
      {
        fields: ["name"],
        where: { deleted_at: null },
      },
      {
        fields: ["billing_country"],
      },
      {
        fields: ["service_country"],
      },
      {
        fields: ["primary_contact_id"],
      },
      {
        fields: ["created_at"],
      },
      {
        // PostGIS spatial index
        fields: ["service_location"],
        using: "gist",
        where: { service_location: { [sequelize.Sequelize.Op.ne]: null } },
      },
    ],

    // Hooks for security and compliance
    hooks: {
      beforeValidate: (org: Organization) => {
        // Ensure country codes are uppercase
        if (org.billingCountry) {
          org.billingCountry = org.billingCountry.toUpperCase();
        }
        if (org.serviceCountry) {
          org.serviceCountry = org.serviceCountry.toUpperCase();
        }

        // Trim string fields
        if (org.name) org.name = org.name.trim();
        if (org.legalName) org.legalName = org.legalName.trim();
      },

      beforeUpdate: (org: Organization) => {
        org.version += 1;
      },

      afterCreate: async (org: Organization) => {
        // Auto-determine GDPR applicability
        if (org.isInEU()) {
          org.gdprApplicable = true;
          await org.save();
        }

        console.log(`Organization created: ${org.name} (${org.type})`);
      },

      afterUpdate: async (org: Organization) => {
        // Log significant changes
        if (org.changed("status")) {
          console.log(
            `Organization status changed: ${org.name} to ${org.status}`,
          );
        }
        if (org.changed("type")) {
          console.log(`Organization type changed: ${org.name} to ${org.type}`);
        }
      },
    },

    // Default scope excludes deleted organizations
    defaultScope: {
      where: {
        deletedAt: null,
      },
    },

    // Additional scopes
    scopes: {
      withDeleted: {
        where: {},
      },
      active: {
        where: {
          status: OrganizationStatus.ACTIVE,
          deletedAt: null,
        },
      },
      customers: {
        where: {
          type: OrganizationType.CUSTOMER,
          deletedAt: null,
        },
      },
      vendors: {
        where: {
          type: OrganizationType.VENDOR,
          deletedAt: null,
        },
      },
      partners: {
        where: {
          type: OrganizationType.PARTNER,
          deletedAt: null,
        },
      },
      gdprApplicable: {
        where: {
          gdprApplicable: true,
          deletedAt: null,
        },
      },
      withLocation: {
        where: {
          serviceLocation: {
            [sequelize.Sequelize.Op.ne]: null,
          },
          deletedAt: null,
        },
      },
    },
  },
);

// Define associations
Organization.belongsTo(User, {
  foreignKey: "primaryContactId",
  as: "primaryContact",
});

Organization.belongsTo(User, {
  foreignKey: "createdBy",
  as: "createdByUser",
});

Organization.belongsTo(User, {
  foreignKey: "updatedBy",
  as: "updatedByUser",
});

export default Organization;
