/**
 * ============================================================================
 * BIN MODEL - CONTAINER AND BIN MANAGEMENT
 * ============================================================================
 *
 * Implements bins/containers management with IoT sensor data,
 * GPS tracking, fill level monitoring, and service scheduling.
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

// Define bin types enum
export enum BinType {
  DUMPSTER = "dumpster",
  ROLL_OFF = "roll_off",
  COMPACTOR = "compactor",
  RECYCLING = "recycling",
  ORGANIC = "organic",
}

// Define bin status enum
export enum BinStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  RETIRED = "retired",
  LOST = "lost",
}

// Define bin materials enum
export enum BinMaterial {
  STEEL = "steel",
  PLASTIC = "plastic",
  FIBERGLASS = "fiberglass",
}

/**
 * Bin model interface
 */
export interface BinAttributes {
  id: string;
  binNumber: string;
  customerId: ForeignKey<string>;
  binType: BinType;
  size: string;
  capacityCubicYards?: number;
  material?: BinMaterial;
  color?: string;
  status: BinStatus;
  location?: any; // PostGIS POINT geometry
  installationDate?: Date;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  gpsEnabled: boolean;
  sensorEnabled: boolean;
  fillLevelPercent?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: ForeignKey<string>;
}

export interface BinCreationAttributes
  extends Omit<
    BinAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "version"
    | "status"
    | "gpsEnabled"
    | "sensorEnabled"
  > {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  status?: CreationOptional<BinStatus>;
  gpsEnabled?: CreationOptional<boolean>;
  sensorEnabled?: CreationOptional<boolean>;
}

/**
 * Bin model class
 */
export class Bin extends Model<
  InferAttributes<Bin>,
  InferCreationAttributes<Bin>
> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare binNumber: string;
  declare customerId: ForeignKey<string>;
  declare binType: BinType;
  declare size: string;
  declare capacityCubicYards: number | null;
  declare material: BinMaterial | null;
  declare color: string | null;
  declare status: CreationOptional<BinStatus>;
  declare location: any; // PostGIS geometry
  declare installationDate: Date | null;
  declare lastServiceDate: Date | null;
  declare nextServiceDate: Date | null;
  declare gpsEnabled: CreationOptional<boolean>;
  declare sensorEnabled: CreationOptional<boolean>;
  declare fillLevelPercent: number | null;

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
  declare getCustomer: BelongsToGetAssociationMixin<any>; // Customer
  declare setCustomer: BelongsToSetAssociationMixin<any, string>; // Customer
  declare getCreatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setCreatedByUser: BelongsToSetAssociationMixin<any, string>; // User
  declare getUpdatedByUser: BelongsToGetAssociationMixin<any>; // User
  declare setUpdatedByUser: BelongsToSetAssociationMixin<any, string>; // User

  // Has many associations
  declare getServiceEvents: HasManyGetAssociationsMixin<any>; // ServiceEvent
  declare createServiceEvent: HasManyCreateAssociationMixin<any>; // ServiceEvent
  declare getSensorData: HasManyGetAssociationsMixin<any>; // SensorData

  // Associations - will be defined in associations file
  declare static associations: {
    customer: Association<Bin, any>;
    createdByUser: Association<Bin, any>;
    updatedByUser: Association<Bin, any>;
    serviceEvents: Association<Bin, any>;
    sensorData: Association<Bin, any>;
  };

  /**
   * Instance methods
   */

  // Check if bin is active
  public isActive(): boolean {
    return this.status === BinStatus.ACTIVE;
  }

  // Check if bin is in maintenance
  public isInMaintenance(): boolean {
    return this.status === BinStatus.MAINTENANCE;
  }

  // Check if bin is retired
  public isRetired(): boolean {
    return this.status === BinStatus.RETIRED;
  }

  // Check if bin is lost
  public isLost(): boolean {
    return this.status === BinStatus.LOST;
  }

  // Get bin type label
  public getBinTypeLabel(): string {
    switch (this.binType) {
      case BinType.DUMPSTER:
        return "Dumpster";
      case BinType.ROLL_OFF:
        return "Roll-off Container";
      case BinType.COMPACTOR:
        return "Compactor";
      case BinType.RECYCLING:
        return "Recycling Bin";
      case BinType.ORGANIC:
        return "Organic Waste Bin";
      default:
        return "Unknown";
    }
  }

  // Get status label
  public getStatusLabel(): string {
    switch (this.status) {
      case BinStatus.ACTIVE:
        return "Active";
      case BinStatus.MAINTENANCE:
        return "In Maintenance";
      case BinStatus.RETIRED:
        return "Retired";
      case BinStatus.LOST:
        return "Lost";
      default:
        return "Unknown";
    }
  }

  // Get material label
  public getMaterialLabel(): string {
    switch (this.material) {
      case BinMaterial.STEEL:
        return "Steel";
      case BinMaterial.PLASTIC:
        return "Plastic";
      case BinMaterial.FIBERGLASS:
        return "Fiberglass";
      default:
        return "Not specified";
    }
  }

  // Get capacity formatted
  public getCapacityFormatted(): string {
    if (!this.capacityCubicYards) {
      return "Not specified";
    }

    return `${this.capacityCubicYards} cubic yards`;
  }

  // Check if bin has GPS tracking
  public hasGpsTracking(): boolean {
    return this.gpsEnabled;
  }

  // Check if bin has sensor monitoring
  public hasSensorMonitoring(): boolean {
    return this.sensorEnabled;
  }

  // Check if bin is smart (has GPS or sensors)
  public isSmartBin(): boolean {
    return this?.gpsEnabled || this.sensorEnabled;
  }

  // Get fill level status
  public getFillLevelStatus(): string {
    if (this.fillLevelPercent === null || this.fillLevelPercent === undefined) {
      return "Unknown";
    }

    if (this.fillLevelPercent >= 90) {
      return "Critical - Needs immediate pickup";
    } else if (this.fillLevelPercent >= 75) {
      return "High - Schedule pickup soon";
    } else if (this.fillLevelPercent >= 50) {
      return "Medium - Monitor closely";
    } else if (this.fillLevelPercent >= 25) {
      return "Low - Adequate space";
    } else {
      return "Empty - Good condition";
    }
  }

  // Get fill level color code for UI
  public getFillLevelColorCode(): string {
    if (this.fillLevelPercent === null || this.fillLevelPercent === undefined) {
      return "gray";
    }

    if (this.fillLevelPercent >= 90) {
      return "red";
    } else if (this.fillLevelPercent >= 75) {
      return "orange";
    } else if (this.fillLevelPercent >= 50) {
      return "yellow";
    } else {
      return "green";
    }
  }

  // Check if bin needs service based on fill level
  public needsService(threshold: number = 80): boolean {
    if (this.fillLevelPercent === null || this.fillLevelPercent === undefined) {
      return false;
    }

    return this.fillLevelPercent >= threshold;
  }

  // Check if bin is overdue for service
  public isOverdueForService(): boolean {
    if (!this.nextServiceDate) {
      return false;
    }

    return this.nextServiceDate < new Date();
  }

  // Get days until next service
  public getDaysUntilNextService(): number | null {
    if (!this.nextServiceDate) {
      return null;
    }

    const today = new Date();
    const diffTime = this.nextServiceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  // Get days since last service
  public getDaysSinceLastService(): number | null {
    if (!this.lastServiceDate) {
      return null;
    }

    const today = new Date();
    const diffTime = today.getTime() - this.lastServiceDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  // Get bin identifier for display
  public getDisplayIdentifier(): string {
    const parts = [this.binNumber];

    if (this.size) {
      parts.push(`(${this.size})`);
    }

    if (this.binType) {
      parts.push(this.getBinTypeLabel());
    }

    return parts.join(" - ");
  }

  // Check if bin has location coordinates
  public hasLocationCoordinates(): boolean {
    return !!this.location;
  }

  // Get installation age in months
  public getInstallationAgeMonths(): number | null {
    if (!this.installationDate) {
      return null;
    }

    const today = new Date();
    const ageMs = today.getTime() - this.installationDate.getTime();
    const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month

    return ageMonths;
  }

  // Check if bin is due for replacement (example: 5+ years old)
  public isDueForReplacement(yearsThreshold: number = 5): boolean {
    const ageMonths = this.getInstallationAgeMonths();
    if (ageMonths === null) {
      return false;
    }

    return ageMonths >= yearsThreshold * 12;
  }

  /**
   * Static methods
   */

  // Find bin by bin number
  public static async findByBinNumber(binNumber: string): Promise<Bin | null> {
    return await Bin.findOne({
      where: {
        binNumber,
        deletedAt: null,
      },
    });
  }

  // Find bins by customer
  public static async findByCustomer(customerId: string): Promise<Bin[]> {
    return await Bin.findAll({
      where: {
        customerId,
        deletedAt: null,
      },
      order: [["binNumber", "ASC"]],
    });
  }

  // Find active bins by customer
  public static async findActiveByCustomer(customerId: string): Promise<Bin[]> {
    return await Bin.findAll({
      where: {
        customerId,
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["binNumber", "ASC"]],
    });
  }

  // Find bins by type
  public static async findByType(binType: BinType): Promise<Bin[]> {
    return await Bin.findAll({
      where: {
        binType,
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["binNumber", "ASC"]],
    });
  }

  // Find bins requiring service based on fill level
  public static async findRequiringService(
    fillThreshold: number = 80,
  ): Promise<Bin[]> {
    return await Bin.findAll({
      where: {
        fillLevelPercent: {
          [database.Sequelize.Op.gte]: fillThreshold,
        },
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["fillLevelPercent", "DESC"]],
    });
  }

  // Find overdue bins
  public static async findOverdue(): Promise<Bin[]> {
    const today = new Date();

    return await Bin.findAll({
      where: {
        nextServiceDate: {
          [database.Sequelize.Op.lt]: today,
        },
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["nextServiceDate", "ASC"]],
    });
  }

  // Find smart bins (with GPS or sensors)
  public static async findSmartBins(): Promise<Bin[]> {
    return await Bin.findAll({
      where: {
        [database.Sequelize.Op.or]: [
          { gpsEnabled: true },
          { sensorEnabled: true },
        ],
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["binNumber", "ASC"]],
    });
  }

  // Find bins within radius of a point (requires PostGIS)
  public static async findWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Bin[]> {
    return await Bin.findAll({
      where: database.where(
        database.fn(
          "ST_DWithin",
          database.col("location"),
          database.fn("ST_GeogFromText", `POINT(${longitude} ${latitude})`),
          radiusKm * 1000, // Convert km to meters
        ),
        true,
      ),
      attributes: [
        "*",
        [
          database.fn(
            "ST_Distance",
            database.col("location"),
            database.fn("ST_GeogFromText", `POINT(${longitude} ${latitude})`),
          ),
          "distance",
        ],
      ],
      order: database.literal('"distance" ASC'),
    });
  }

  // Generate next bin number
  public static async generateBinNumber(
    binType: BinType,
    customerId?: string,
  ): Promise<string> {
    let prefix: string;

    switch (binType) {
      case BinType.DUMPSTER:
        prefix = "DMP";
        break;
      case BinType.ROLL_OFF:
        prefix = "ROL";
        break;
      case BinType.COMPACTOR:
        prefix = "CMP";
        break;
      case BinType.RECYCLING:
        prefix = "REC";
        break;
      case BinType.ORGANIC:
        prefix = "ORG";
        break;
      default:
        prefix = "BIN";
    }

    // Find the highest existing bin number with this prefix
    const lastBin = await Bin.findOne({
      where: {
        binNumber: {
          [database.Sequelize.Op.like]: `${prefix}%`,
        },
      },
      order: [["binNumber", "DESC"]],
    });

    let nextNumber = 1;
    if (lastBin && lastBin.binNumber) {
      // Extract number from bin number (e.g., DMP-001234 -> 1234)
      const match = lastBin.binNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    // Format with leading zeros
    const paddedNumber = nextNumber.toString().padStart(6, "0");
    return `${prefix}-${paddedNumber}`;
  }

  // Check if bin number is already taken
  public static async isBinNumberTaken(
    binNumber: string,
    excludeBinId?: string,
  ): Promise<boolean> {
    const whereClause: any = {
      binNumber,
      deletedAt: null,
    };

    if (excludeBinId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeBinId };
    }

    const bin = await Bin.findOne({ where: whereClause });
    return !!bin;
  }

  // Get bin statistics
  public static async getBinStatistics(): Promise<any> {
    const [statusStats, typeStats, materialStats] = await Promise.all([
      // Status distribution
      Bin.findAll({
        attributes: [
          "status",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: { deletedAt: null },
        group: ["status"],
        raw: true,
      }),

      // Type distribution
      Bin.findAll({
        attributes: [
          "binType",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: { deletedAt: null },
        group: ["binType"],
        raw: true,
      }),

      // Material distribution
      Bin.findAll({
        attributes: [
          "material",
          [database.fn("COUNT", database.col("id")), "count"],
        ],
        where: {
          deletedAt: null,
          material: { [database.Sequelize.Op.ne]: null },
        },
        group: ["material"],
        raw: true,
      }),
    ]);

    // Get smart bin statistics
    const smartBinStats = await Bin.findAll({
      attributes: [
        [database.fn("COUNT", database.col("id")), "totalBins"],
        [
          database.fn(
            "COUNT",
            database.literal("CASE WHEN gps_enabled = true THEN 1 END"),
          ),
          "gpsEnabledBins",
        ],
        [
          database.fn(
            "COUNT",
            database.literal("CASE WHEN sensor_enabled = true THEN 1 END"),
          ),
          "sensorEnabledBins",
        ],
        [
          database.fn(
            "COUNT",
            database.literal(
              "CASE WHEN gps_enabled = true OR sensor_enabled = true THEN 1 END",
            ),
          ),
          "smartBins",
        ],
        [
          database.fn("AVG", database.col("fill_level_percent")),
          "avgFillLevel",
        ],
      ],
      where: { deletedAt: null },
      raw: true,
    });

    return {
      byStatus: statusStats,
      byType: typeStats,
      byMaterial: materialStats,
      smartBins: smartBinStats[0],
    };
  }

  // Get fill level distribution
  public static async getFillLevelDistribution(): Promise<any[]> {
    return await Bin.findAll({
      attributes: [
        [
          database.literal(`
            CASE 
              WHEN fill_level_percent >= 90 THEN 'Critical (90%+)'
              WHEN fill_level_percent >= 75 THEN 'High (75-89%)'
              WHEN fill_level_percent >= 50 THEN 'Medium (50-74%)'
              WHEN fill_level_percent >= 25 THEN 'Low (25-49%)'
              ELSE 'Empty (0-24%)'
            END
          `),
          "fillLevelRange",
        ],
        [database.fn("COUNT", database.col("id")), "count"],
      ],
      where: {
        fillLevelPercent: { [database.Sequelize.Op.ne]: null },
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      group: [database.literal("fillLevelRange")],
      order: [
        [
          database.literal(`
          CASE 
            WHEN fill_level_percent >= 90 THEN 1
            WHEN fill_level_percent >= 75 THEN 2
            WHEN fill_level_percent >= 50 THEN 3
            WHEN fill_level_percent >= 25 THEN 4
            ELSE 5
          END
        `),
          "ASC",
        ],
      ],
      raw: true,
    });
  }

  // Get bins due for replacement
  public static async getBinsDueForReplacement(
    yearsThreshold: number = 5,
  ): Promise<Bin[]> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsThreshold);

    return await Bin.findAll({
      where: {
        installationDate: {
          [database.Sequelize.Op.lt]: cutoffDate,
        },
        status: BinStatus.ACTIVE,
        deletedAt: null,
      },
      order: [["installationDate", "ASC"]],
    });
  }
}

/**
 * Model definition
 */
Bin.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    binNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "bins_bin_number_unique",
        msg: "Bin number is already in use",
      },
      field: "bin_number",
      validate: {
        len: {
          args: [3, 50],
          msg: "Bin number must be between 3 and 50 characters",
        },
        notEmpty: {
          msg: "Bin number is required",
        },
      },
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "customer_id",
      references: {
        model: "customers",
        key: "id",
      },
    },
    binType: {
      type: DataTypes.ENUM(...Object.values(BinType)),
      allowNull: false,
      field: "bin_type",
      validate: {
        isIn: {
          args: [Object.values(BinType)],
          msg: "Invalid bin type",
        },
      },
    },
    size: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        len: {
          args: [1, 20],
          msg: "Size must be between 1 and 20 characters",
        },
        notEmpty: {
          msg: "Size is required",
        },
      },
    },
    capacityCubicYards: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: "capacity_cubic_yards",
      validate: {
        min: {
          args: [0],
          msg: "Capacity cannot be negative",
        },
        isDecimal: {
          msg: "Capacity must be a valid decimal number",
        },
      },
    },
    material: {
      type: DataTypes.ENUM(...Object.values(BinMaterial)),
      allowNull: true,
      validate: {
        isIn: {
          args: [Object.values(BinMaterial)],
          msg: "Invalid bin material",
        },
      },
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [1, 20],
          msg: "Color must be between 1 and 20 characters",
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BinStatus)),
      allowNull: false,
      defaultValue: BinStatus.ACTIVE,
      validate: {
        isIn: {
          args: [Object.values(BinStatus)],
          msg: "Invalid bin status",
        },
      },
    },
    location: {
      type: DataTypes.GEOMETRY("POINT", 4326),
      allowNull: true,
    },
    installationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "installation_date",
      validate: {
        isDate: {
          msg: "Installation date must be a valid date",
        },
      },
    },
    lastServiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "last_service_date",
      validate: {
        isDate: {
          msg: "Last service date must be a valid date",
        },
      },
    },
    nextServiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "next_service_date",
      validate: {
        isDate: {
          msg: "Next service date must be a valid date",
        },
        isAfterLastService(value: Date | null) {
          if (value && this.lastServiceDate && value <= this.lastServiceDate) {
            throw new Error(
              "Next service date must be after last service date",
            );
          }
        },
      },
    },
    gpsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "gps_enabled",
    },
    sensorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "sensor_enabled",
    },
    fillLevelPercent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "fill_level_percent",
      validate: {
        min: {
          args: [0],
          msg: "Fill level percentage cannot be negative",
        },
        max: {
          args: [100],
          msg: "Fill level percentage cannot exceed 100",
        },
        isInt: {
          msg: "Fill level percentage must be an integer",
        },
      },
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
    tableName: "bins",
    schema: "core",
    timestamps: true,
    paranoid: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    deletedAt: "deletedAt",
    underscored: true,
    indexes: [
      {
        name: "idx_bins_bin_number",
        fields: ["bin_number"],
        unique: true,
        where: { deleted_at: null },
      },
      {
        name: "idx_bins_customer_id",
        fields: ["customer_id"],
        where: { deleted_at: null },
      },
      {
        name: "idx_bins_bin_type",
        fields: ["bin_type"],
      },
      {
        name: "idx_bins_status",
        fields: ["status"],
        where: { deleted_at: null },
      },
      {
        name: "idx_bins_location",
        fields: [database.fn("ST_GeogFromWKB", database.col("location"))],
        using: "GIST",
        where: { location: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_bins_fill_level",
        fields: ["fill_level_percent"],
        where: { fill_level_percent: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_bins_next_service_date",
        fields: ["next_service_date"],
        where: { next_service_date: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: "idx_bins_smart_features",
        fields: ["gps_enabled", "sensor_enabled"],
      },
      {
        name: "idx_bins_installation_date",
        fields: ["installation_date"],
        where: { installation_date: { [database.Sequelize.Op.ne]: null } },
      },
    ],
    hooks: {
      beforeValidate: async (bin: Bin) => {
        // Auto-generate bin number if not provided
        if (!bin.binNumber) {
          bin.binNumber = await Bin.generateBinNumber(
            bin.binType,
            bin.customerId,
          );
        }

        // Normalize size and color
        if (bin.size) {
          bin.size = bin.size.toUpperCase();
        }
        if (bin.color) {
          bin.color = bin.color.toLowerCase();
        }
      },
      beforeUpdate: (bin: Bin) => {
        // Increment version for optimistic locking
        bin.version = (bin?.version || 1) + 1;

        // Update next service date if last service date changed
        if (bin.changed("lastServiceDate") && bin.lastServiceDate) {
          const nextService = new Date(bin.lastServiceDate);
          // Default to 30 days interval
          nextService.setDate(nextService.getDate() + 30);
          bin.nextServiceDate = nextService;
        }
      },
    },
    scopes: {
      active: {
        where: {
          status: BinStatus.ACTIVE,
          deletedAt: null,
        },
      },
      inMaintenance: {
        where: {
          status: BinStatus.MAINTENANCE,
          deletedAt: null,
        },
      },
      retired: {
        where: {
          status: BinStatus.RETIRED,
          deletedAt: null,
        },
      },
      lost: {
        where: {
          status: BinStatus.LOST,
          deletedAt: null,
        },
      },
      byType: (binType: BinType) => ({
        where: {
          binType,
          deletedAt: null,
        },
      }),
      byCustomer: (customerId: string) => ({
        where: {
          customerId,
          deletedAt: null,
        },
      }),
      needingService: (threshold: number = 80) => ({
        where: {
          fillLevelPercent: {
            [database.Sequelize.Op.gte]: threshold,
          },
          status: BinStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      overdue: {
        where: {
          nextServiceDate: {
            [database.Sequelize.Op.lt]: new Date(),
          },
          status: BinStatus.ACTIVE,
          deletedAt: null,
        },
      },
      smartBins: {
        where: {
          [database.Sequelize.Op.or]: [
            { gpsEnabled: true },
            { sensorEnabled: true },
          ],
          deletedAt: null,
        },
      },
      withGps: {
        where: {
          gpsEnabled: true,
          deletedAt: null,
        },
      },
      withSensors: {
        where: {
          sensorEnabled: true,
          deletedAt: null,
        },
      },
      withLocation: {
        where: {
          location: { [database.Sequelize.Op.ne]: null },
          deletedAt: null,
        },
      },
      dueForReplacement: (years: number = 5) => ({
        where: {
          installationDate: {
            [database.Sequelize.Op.lt]: new Date(
              Date.now() - years * 365 * 24 * 60 * 60 * 1000,
            ),
          },
          status: BinStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    },
  },
);

export default Bin;
