/**
 * ============================================================================
 * DRIVER MODEL - DRIVER MANAGEMENT AND CREDENTIALS
 * ============================================================================
 *
 * Implements driver-specific details extending users with license information,
 * employment status, and emergency contacts with encryption.
 *
 * Created by: Database Architect Agent
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
  BelongsToSetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from "sequelize";
import { database } from "@/config/database";

// Define employment status enum
export enum EmploymentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  TERMINATED = "terminated",
}

// Define license classes enum
export enum LicenseClass {
  CLASS_A = "A",
  CLASS_B = "B",
  CLASS_C = "C",
  CDL_A = "CDL-A",
  CDL_B = "CDL-B",
  CDL_C = "CDL-C",
}

/**
 * Driver model interface
 */
export interface DriverAttributes {
  id: string;
  userId: ForeignKey<string>;
  driverNumber: string;
  licenseNumberEncrypted?: string;
  licenseClass?: LicenseClass;
  licenseExpiryDate?: Date;
  cdlEndorsements?: string;
  hireDate?: Date;
  employmentStatus: EmploymentStatus;
  emergencyContactEncrypted?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: ForeignKey<string>;
}

export interface DriverCreationAttributes
  extends Omit<
    DriverAttributes,
    "id" | "createdAt" | "updatedAt" | "version" | "employmentStatus"
  > {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  employmentStatus?: CreationOptional<EmploymentStatus>;
}

/**
 * Emergency contact interface
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Driver model class
 */
export class Driver extends Model<
  InferAttributes<Driver>,
  InferCreationAttributes<Driver>
> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string>;
  declare driverNumber: string;
  declare licenseNumberEncrypted: string | null;
  declare licenseClass: LicenseClass | null;
  declare licenseExpiryDate: Date | null;
  declare cdlEndorsements: string | null;
  declare hireDate: Date | null;
  declare employmentStatus: CreationOptional<EmploymentStatus>;
  declare emergencyContactEncrypted: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Foreign keys for audit trail
  declare createdBy: ForeignKey<string> | null;
  declare updatedBy: ForeignKey<string> | null;

  // Audit fields
  declare version: CreationOptional<number>;
  declare deletedAt: Date | null;
  declare deletedBy: ForeignKey<string> | null;

  // Association declarations - will be populated when associations are defined
  declare getUser: BelongsToGetAssociationMixin<any>; // User
  declare setUser: BelongsToSetAssociationMixin<any, string>; // User
  declare getCreatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setCreatedByUser: BelongsToSetAssociationMixin<any, string>; // User
  declare getUpdatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setUpdatedByUser: BelongsToSetAssociationMixin<any, string>; // User

  // Has many associations
  declare getRoutes: HasManyGetAssociationsMixin<any>; // Route
  declare createRoute: HasManyCreateAssociationMixin<any>; // Route
  declare getServiceEvents: HasManyGetAssociationsMixin<any>; // ServiceEvent
  declare createServiceEvent: HasManyCreateAssociationMixin<any>; // ServiceEvent
  declare getGpsTrackingRecords: HasManyGetAssociationsMixin<any>; // GpsTracking

  // Associations - will be defined in associations file
  declare static associations: {
    user: Association<Driver, any>;
    createdByUser: Association<Driver, any>;
    updatedByUser: Association<Driver, any>;
    routes: Association<Driver, any>;
    serviceEvents: Association<Driver, any>;
    gpsTrackingRecords: Association<Driver, any>;
  };

  /**
   * Instance methods
   */

  // Check if driver is currently employed
  public isActive(): boolean {
    return this.employmentStatus === EmploymentStatus.ACTIVE;
  }

  // Check if driver is inactive
  public isInactive(): boolean {
    return this.employmentStatus === EmploymentStatus.INACTIVE;
  }

  // Check if driver is terminated
  public isTerminated(): boolean {
    return this.employmentStatus === EmploymentStatus.TERMINATED;
  }

  // Get employment status label
  public getEmploymentStatusLabel(): string {
    switch (this.employmentStatus) {
      case EmploymentStatus.ACTIVE:
        return "Active";
      case EmploymentStatus.INACTIVE:
        return "Inactive";
      case EmploymentStatus.TERMINATED:
        return "Terminated";
      default:
        return "Unknown";
    }
  }

  // Get license class label
  public getLicenseClassLabel(): string {
    switch (this.licenseClass) {
      case LicenseClass.CLASS_A:
        return "Class A";
      case LicenseClass.CLASS_B:
        return "Class B";
      case LicenseClass.CLASS_C:
        return "Class C";
      case LicenseClass.CDL_A:
        return "CDL Class A";
      case LicenseClass.CDL_B:
        return "CDL Class B";
      case LicenseClass.CDL_C:
        return "CDL Class C";
      default:
        return "Not Specified";
    }
  }

  // Check if driver has CDL
  public hasCDL(): boolean {
    return !!(this.licenseClass && this.licenseClass.startsWith("CDL"));
  }

  // Check if license is expired
  public isLicenseExpired(): boolean {
    if (!this.licenseExpiryDate) {
      return false;
    }

    return this.licenseExpiryDate < new Date();
  }

  // Check if license is expiring soon (within 30 days)
  public isLicenseExpiringSoon(daysWarning: number = 30): boolean {
    if (!this.licenseExpiryDate) {
      return false;
    }

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysWarning);

    return (
      this.licenseExpiryDate <= warningDate &&
      this.licenseExpiryDate >= new Date()
    );
  }

  // Get days until license expiry
  public getDaysUntilLicenseExpiry(): number | null {
    if (!this.licenseExpiryDate) {
      return null;
    }

    const today = new Date();
    const diffTime = this.licenseExpiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  // Check if driver has CDL endorsements
  public hasEndorsements(): boolean {
    return !!(this.cdlEndorsements && this.cdlEndorsements.trim().length > 0);
  }

  // Get CDL endorsements as array
  public getEndorsementsArray(): string[] {
    if (!this.cdlEndorsements) {
      return [];
    }

    return this.cdlEndorsements
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  // Check if driver has emergency contact information
  public hasEmergencyContact(): boolean {
    return !!(
      this.emergencyContactEncrypted &&
      this.emergencyContactEncrypted.trim().length > 0
    );
  }

  // Get years of employment
  public getYearsOfEmployment(): number | null {
    if (!this.hireDate) {
      return null;
    }

    const today = new Date();
    const years =
      (today.getTime() - this.hireDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);

    return Math.floor(years);
  }

  // Check if driver is eligible for benefits (example: 1+ years)
  public isEligibleForBenefits(): boolean {
    const yearsEmployed = this.getYearsOfEmployment();
    return yearsEmployed !== null && yearsEmployed >= 1;
  }

  /**
   * Static methods
   */

  // Find driver by driver number
  public static async findByDriverNumber(
    driverNumber: string,
  ): Promise<Driver | null> {
    return await Driver.findOne({
      where: {
        driverNumber,
        deletedAt: null,
      },
    });
  }

  // Find driver by user ID
  public static async findByUserId(userId: string): Promise<Driver | null> {
    return await Driver.findOne({
      where: {
        userId,
        deletedAt: null,
      },
    });
  }

  // Find active drivers
  public static async findActive(): Promise<Driver[]> {
    return await Driver.findAll({
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["driverNumber", "ASC"]],
    });
  }

  // Find drivers with expiring licenses
  public static async findWithExpiringLicenses(
    daysWarning: number = 30,
  ): Promise<Driver[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysWarning);

    return await Driver.findAll({
      where: {
        licenseExpiryDate: {
          [database.Sequelize.Op.between]: [new Date(), warningDate],
        },
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["licenseExpiryDate", "ASC"]],
    });
  }

  // Find drivers with expired licenses
  public static async findWithExpiredLicenses(): Promise<Driver[]> {
    const today = new Date();

    return await Driver.findAll({
      where: {
        licenseExpiryDate: {
          [database.Sequelize.Op.lt]: today,
        },
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["licenseExpiryDate", "ASC"]],
    });
  }

  // Find drivers by license class
  public static async findByLicenseClass(
    licenseClass: LicenseClass,
  ): Promise<Driver[]> {
    return await Driver.findAll({
      where: {
        licenseClass,
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["driverNumber", "ASC"]],
    });
  }

  // Find drivers with CDL
  public static async findWithCDL(): Promise<Driver[]> {
    return await Driver.findAll({
      where: {
        licenseClass: {
          [database.Sequelize.Op.in]: [
            LicenseClass.CDL_A,
            LicenseClass.CDL_B,
            LicenseClass.CDL_C,
          ],
        },
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["driverNumber", "ASC"]],
    });
  }

  // Generate next driver number
  public static async generateDriverNumber(): Promise<string> {
    const prefix = "DRV";

    // Find the highest existing driver number
    const lastDriver = await Driver.findOne({
      where: {
        driverNumber: {
          [database.Sequelize.Op.like]: `${prefix}%`,
        },
      },
      order: [["driverNumber", "DESC"]],
    });

    let nextNumber = 1;
    if (lastDriver && lastDriver.driverNumber) {
      // Extract number from driver number (e.g., DRV-001234 -> 1234)
      const match = lastDriver.driverNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    // Format with leading zeros
    const paddedNumber = nextNumber.toString().padStart(6, "0");
    return `${prefix}-${paddedNumber}`;
  }

  // Check if driver number is already taken
  public static async isDriverNumberTaken(
    driverNumber: string,
    excludeDriverId?: string,
  ): Promise<boolean> {
    const whereClause: any = {
      driverNumber,
      deletedAt: null,
    };

    if (excludeDriverId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeDriverId };
    }

    const driver = await Driver.findOne({ where: whereClause });
    return !!driver;
  }

  // Get employment statistics
  public static async getEmploymentStatistics(): Promise<any> {
    const stats = await Driver.findAll({
      attributes: [
        "employmentStatus",
        [database.fn("COUNT", database.col("id")), "count"],
      ],
      where: { deletedAt: null },
      group: ["employmentStatus"],
      raw: true,
    });

    const licenseStats = await Driver.findAll({
      attributes: [
        "licenseClass",
        [database.fn("COUNT", database.col("id")), "count"],
      ],
      where: {
        deletedAt: null,
        licenseClass: { [database.Sequelize.Op.ne]: null },
      },
      group: ["licenseClass"],
      raw: true,
    });

    return {
      byEmploymentStatus: stats,
      byLicenseClass: licenseStats,
    };
  }

  // Get drivers hired in a date range
  public static async findHiredInDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Driver[]> {
    return await Driver.findAll({
      where: {
        hireDate: {
          [database.Sequelize.Op.between]: [startDate, endDate],
        },
        deletedAt: null,
      },
      order: [["hireDate", "ASC"]],
    });
  }

  // Find anniversary drivers (hired on this day in previous years)
  public static async findAnniversaryDrivers(
    date: Date = new Date(),
  ): Promise<Driver[]> {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return await Driver.findAll({
      where: database.where(
        database.fn("EXTRACT", database.literal("MONTH FROM hire_date")),
        month,
      ),
      where: database.where(
        database.fn("EXTRACT", database.literal("DAY FROM hire_date")),
        day,
      ),
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["hireDate", "ASC"]],
    });
  }
}

/**
 * Model definition
 */
Driver.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: {
        name: "drivers_user_id_unique",
        msg: "User is already associated with a driver record",
      },
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    driverNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "drivers_driver_number_unique",
        msg: "Driver number is already in use",
      },
      field: "driver_number",
      validate: {
        len: {
          args: [3, 50],
          msg: "Driver number must be between 3 and 50 characters",
        },
        notEmpty: {
          msg: "Driver number is required",
        },
      },
    },
    licenseNumberEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "license_number_encrypted",
    },
    licenseClass: {
      type: DataTypes.ENUM(...Object.values(LicenseClass)),
      allowNull: true,
      field: "license_class",
      validate: {
        isIn: {
          args: [Object.values(LicenseClass)],
          msg: "Invalid license class",
        },
      },
    },
    licenseExpiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "license_expiry_date",
      validate: {
        isDate: {
          msg: "License expiry date must be a valid date",
        },
        isAfter: {
          args: "1900-01-01",
          msg: "License expiry date must be after 1900",
        },
      },
    },
    cdlEndorsements: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "cdl_endorsements",
      validate: {
        len: {
          args: [0, 50],
          msg: "CDL endorsements must be less than 50 characters",
        },
      },
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "hire_date",
      validate: {
        isDate: {
          msg: "Hire date must be a valid date",
        },
        isAfter: {
          args: "1900-01-01",
          msg: "Hire date must be after 1900",
        },
      },
    },
    employmentStatus: {
      type: DataTypes.ENUM(...Object.values(EmploymentStatus)),
      allowNull: false,
      defaultValue: EmploymentStatus.ACTIVE,
      field: "employment_status",
      validate: {
        isIn: {
          args: [Object.values(EmploymentStatus)],
          msg: "Invalid employment status",
        },
      },
    },
    emergencyContactEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "emergency_contact_encrypted",
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
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: "Version must be at least 1",
        },
      },
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
    sequelize: database,
    tableName: "drivers",
    schema: "core",
    timestamps: true,
    paranoid: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    deletedAt: "deletedAt",
    underscored: true,
    indexes: [
      {
        name: "idx_drivers_driver_number",
        fields: ["driver_number"],
        unique: true,
        where: { deleted_at: null },
      },
      {
        name: "idx_drivers_user_id",
        fields: ["user_id"],
        unique: true,
        where: { deleted_at: null },
      },
      {
        name: "idx_drivers_employment_status",
        fields: ["employment_status"],
        where: { deleted_at: null },
      },
      {
        name: "idx_drivers_license_class",
        fields: ["license_class"],
      },
      {
        name: "idx_drivers_license_expiry_date",
        fields: ["license_expiry_date"],
        where: { license_expiry_date: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_drivers_hire_date",
        fields: ["hire_date"],
        where: { hire_date: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_drivers_cdl_endorsements",
        fields: ["cdl_endorsements"],
        where: { cdl_endorsements: { [database.Sequelize.Op.ne]: null } },
      },
    ],
    hooks: {
      beforeValidate: async (driver: Driver) => {
        // Auto-generate driver number if not provided
        if (!driver.driverNumber) {
          driver.driverNumber = await Driver.generateDriverNumber();
        }

        // Normalize CDL endorsements
        if (driver.cdlEndorsements) {
          driver.cdlEndorsements = driver.cdlEndorsements.toUpperCase();
        }
      },
      beforeUpdate: (driver: Driver) => {
        // Increment version for optimistic locking
        driver.version = (driver?.version || 1) + 1;
      },
    },
    scopes: {
      active: {
        where: {
          employmentStatus: EmploymentStatus.ACTIVE,
          deletedAt: null,
        },
      },
      inactive: {
        where: {
          employmentStatus: EmploymentStatus.INACTIVE,
          deletedAt: null,
        },
      },
      terminated: {
        where: {
          employmentStatus: EmploymentStatus.TERMINATED,
          deletedAt: null,
        },
      },
      withCDL: {
        where: {
          licenseClass: {
            [database.Sequelize.Op.in]: [
              LicenseClass.CDL_A,
              LicenseClass.CDL_B,
              LicenseClass.CDL_C,
            ],
          },
          deletedAt: null,
        },
      },
      expiringLicenses: (days: number = 30) => ({
        where: {
          licenseExpiryDate: {
            [database.Sequelize.Op.between]: [
              new Date(),
              new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            ],
          },
          employmentStatus: EmploymentStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      expiredLicenses: {
        where: {
          licenseExpiryDate: {
            [database.Sequelize.Op.lt]: new Date(),
          },
          employmentStatus: EmploymentStatus.ACTIVE,
          deletedAt: null,
        },
      },
      withUser: {
        include: [
          {
            association: "user",
            required: true,
          },
        ],
      },
      recentHires: (days: number = 90) => ({
        where: {
          hireDate: {
            [database.Sequelize.Op.gte]: new Date(
              Date.now() - days * 24 * 60 * 60 * 1000,
            ),
          },
          deletedAt: null,
        },
      }),
    },
  },
);

export default Driver;
