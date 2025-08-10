/**
 * ============================================================================
 * VEHICLE MODEL - FLEET MANAGEMENT
 * ============================================================================
 * 
 * Implements vehicles/fleet management with capacity tracking,
 * maintenance scheduling, and GPS device integration.
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
} from 'sequelize';
import { database } from '@/config/database';

// Define vehicle types enum
export enum VehicleType {
  TRUCK = 'truck',
  VAN = 'van',
  TRAILER = 'trailer',
  EQUIPMENT = 'equipment',
}

// Define fuel types enum
export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
}

// Define vehicle status enum
export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
  RETIRED = 'retired',
}

/**
 * Vehicle model interface
 */
export interface VehicleAttributes {
  id: string;
  vehicleNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  vehicleType: VehicleType;
  capacityCubicYards?: number;
  capacityWeightLbs?: number;
  fuelType?: FuelType;
  status: VehicleStatus;
  gpsDeviceId?: string;
  samsaraVehicleId?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ForeignKey<string>;
  updatedBy?: ForeignKey<string>;
  // Audit fields
  version: number;
  deletedAt?: Date;
  deletedBy?: ForeignKey<string>;
}

export interface VehicleCreationAttributes
  extends Omit<VehicleAttributes, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status'> {
  id?: CreationOptional<string>;
  createdAt?: CreationOptional<Date>;
  updatedAt?: CreationOptional<Date>;
  version?: CreationOptional<number>;
  status?: CreationOptional<VehicleStatus>;
}

/**
 * Vehicle model class
 */
export class Vehicle extends Model<InferAttributes<Vehicle>, InferCreationAttributes<Vehicle>> {
  // Primary attributes
  declare id: CreationOptional<string>;
  declare vehicleNumber: string;
  declare make: string | null;
  declare model: string | null;
  declare year: number | null;
  declare vin: string | null;
  declare licensePlate: string | null;
  declare vehicleType: VehicleType;
  declare capacityCubicYards: number | null;
  declare capacityWeightLbs: number | null;
  declare fuelType: FuelType | null;
  declare status: CreationOptional<VehicleStatus>;
  declare gpsDeviceId: string | null;
  declare samsaraVehicleId: string | null;
  declare lastMaintenanceDate: Date | null;
  declare nextMaintenanceDate: Date | null;
  
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
  declare getSensorData: HasManyGetAssociationsMixin<any>; // SensorData

  // Associations - will be defined in associations file
  declare static associations: {
    createdByUser: Association<Vehicle, any>;
    updatedByUser: Association<Vehicle, any>;
    routes: Association<Vehicle, any>;
    serviceEvents: Association<Vehicle, any>;
    gpsTrackingRecords: Association<Vehicle, any>;
    sensorData: Association<Vehicle, any>;
  };

  /**
   * Instance methods
   */

  // Check if vehicle is active and available
  public isActive(): boolean {
    return this.status === VehicleStatus.ACTIVE;
  }

  // Check if vehicle is in maintenance
  public isInMaintenance(): boolean {
    return this.status === VehicleStatus.MAINTENANCE;
  }

  // Check if vehicle is out of service
  public isOutOfService(): boolean {
    return this.status === VehicleStatus.OUT_OF_SERVICE;
  }

  // Check if vehicle is retired
  public isRetired(): boolean {
    return this.status === VehicleStatus.RETIRED;
  }

  // Get full vehicle display name
  public getDisplayName(): string {
    const parts = [this.vehicleNumber];
    
    if (this.make && this.model) {
      parts.push(`${this.make} ${this.model}`);
    }
    
    if (this.year) {
      parts.push(`(${this.year})`);
    }
    
    return parts.join(' - ');
  }

  // Get vehicle type label
  public getVehicleTypeLabel(): string {
    switch (this.vehicleType) {
      case VehicleType.TRUCK:
        return 'Truck';
      case VehicleType.VAN:
        return 'Van';
      case VehicleType.TRAILER:
        return 'Trailer';
      case VehicleType.EQUIPMENT:
        return 'Equipment';
      default:
        return 'Unknown';
    }
  }

  // Get fuel type label
  public getFuelTypeLabel(): string {
    switch (this.fuelType) {
      case FuelType.GASOLINE:
        return 'Gasoline';
      case FuelType.DIESEL:
        return 'Diesel';
      case FuelType.ELECTRIC:
        return 'Electric';
      case FuelType.HYBRID:
        return 'Hybrid';
      default:
        return 'Unknown';
    }
  }

  // Get status label
  public getStatusLabel(): string {
    switch (this.status) {
      case VehicleStatus.ACTIVE:
        return 'Active';
      case VehicleStatus.MAINTENANCE:
        return 'In Maintenance';
      case VehicleStatus.OUT_OF_SERVICE:
        return 'Out of Service';
      case VehicleStatus.RETIRED:
        return 'Retired';
      default:
        return 'Unknown';
    }
  }

  // Check if vehicle needs maintenance
  public needsMaintenance(): boolean {
    if (!this.nextMaintenanceDate) {
      return false;
    }
    
    const today = new Date();
    const warningThreshold = new Date(today);
    warningThreshold.setDate(today.getDate() + 7); // 7 days warning
    
    return this.nextMaintenanceDate <= warningThreshold;
  }

  // Check if vehicle maintenance is overdue
  public isMaintenanceOverdue(): boolean {
    if (!this.nextMaintenanceDate) {
      return false;
    }
    
    return this.nextMaintenanceDate < new Date();
  }

  // Get days until next maintenance
  public getDaysUntilMaintenance(): number | null {
    if (!this.nextMaintenanceDate) {
      return null;
    }
    
    const today = new Date();
    const diffTime = this.nextMaintenanceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Has GPS tracking enabled
  public hasGpsTracking(): boolean {
    return !!(this.gpsDeviceId && this.gpsDeviceId.trim().length > 0);
  }

  // Is integrated with Samsara
  public hasSamsaraIntegration(): boolean {
    return !!(this.samsaraVehicleId && this.samsaraVehicleId.trim().length > 0);
  }

  // Get vehicle capacity summary
  public getCapacitySummary(): string {
    const capacityParts = [];
    
    if (this.capacityCubicYards) {
      capacityParts.push(`${this.capacityCubicYards} cu. yd.`);
    }
    
    if (this.capacityWeightLbs) {
      capacityParts.push(`${this.capacityWeightLbs.toLocaleString()} lbs`);
    }
    
    return capacityParts.length > 0 ? capacityParts.join(', ') : 'Not specified';
  }

  // Check if vehicle has capacity information
  public hasCapacityInfo(): boolean {
    return !!(this.capacityCubicYards || this.capacityWeightLbs);
  }

  /**
   * Static methods
   */

  // Find vehicle by vehicle number
  public static async findByVehicleNumber(vehicleNumber: string): Promise<Vehicle | null> {
    return await Vehicle.findOne({
      where: {
        vehicleNumber,
        deletedAt: null,
      },
    });
  }

  // Find vehicle by license plate
  public static async findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    return await Vehicle.findOne({
      where: {
        licensePlate: licensePlate.toUpperCase(),
        deletedAt: null,
      },
    });
  }

  // Find vehicle by VIN
  public static async findByVin(vin: string): Promise<Vehicle | null> {
    return await Vehicle.findOne({
      where: {
        vin: vin.toUpperCase(),
        deletedAt: null,
      },
    });
  }

  // Find active vehicles by type
  public static async findActiveByType(vehicleType: VehicleType): Promise<Vehicle[]> {
    return await Vehicle.findAll({
      where: {
        vehicleType,
        status: VehicleStatus.ACTIVE,
        deletedAt: null,
      },
      order: [['vehicleNumber', 'ASC']],
    });
  }

  // Find vehicles needing maintenance
  public static async findNeedingMaintenance(): Promise<Vehicle[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 7); // 7 days warning

    return await Vehicle.findAll({
      where: {
        nextMaintenanceDate: {
          [database.Sequelize.Op.lte]: warningDate,
        },
        status: {
          [database.Sequelize.Op.in]: [VehicleStatus.ACTIVE, VehicleStatus.MAINTENANCE],
        },
        deletedAt: null,
      },
      order: [['nextMaintenanceDate', 'ASC']],
    });
  }

  // Find overdue maintenance vehicles
  public static async findOverdueMaintenance(): Promise<Vehicle[]> {
    const today = new Date();

    return await Vehicle.findAll({
      where: {
        nextMaintenanceDate: {
          [database.Sequelize.Op.lt]: today,
        },
        status: {
          [database.Sequelize.Op.ne]: VehicleStatus.RETIRED,
        },
        deletedAt: null,
      },
      order: [['nextMaintenanceDate', 'ASC']],
    });
  }

  // Find vehicles with GPS tracking
  public static async findWithGpsTracking(): Promise<Vehicle[]> {
    return await Vehicle.findAll({
      where: {
        gpsDeviceId: {
          [database.Sequelize.Op.ne]: null,
        },
        status: VehicleStatus.ACTIVE,
        deletedAt: null,
      },
      order: [['vehicleNumber', 'ASC']],
    });
  }

  // Generate next vehicle number
  public static async generateVehicleNumber(vehicleType: VehicleType): Promise<string> {
    let prefix: string;
    
    switch (vehicleType) {
      case VehicleType.TRUCK:
        prefix = 'TRK';
        break;
      case VehicleType.VAN:
        prefix = 'VAN';
        break;
      case VehicleType.TRAILER:
        prefix = 'TRL';
        break;
      case VehicleType.EQUIPMENT:
        prefix = 'EQP';
        break;
      default:
        prefix = 'VEH';
    }

    // Find the highest existing vehicle number with this prefix
    const lastVehicle = await Vehicle.findOne({
      where: {
        vehicleNumber: {
          [database.Sequelize.Op.like]: `${prefix}%`,
        },
      },
      order: [['vehicleNumber', 'DESC']],
    });

    let nextNumber = 1;
    if (lastVehicle && lastVehicle.vehicleNumber) {
      // Extract number from vehicle number (e.g., TRK-001234 -> 1234)
      const match = lastVehicle.vehicleNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    // Format with leading zeros
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}-${paddedNumber}`;
  }

  // Check if vehicle number is already taken
  public static async isVehicleNumberTaken(vehicleNumber: string, excludeVehicleId?: string): Promise<boolean> {
    const whereClause: any = {
      vehicleNumber,
      deletedAt: null,
    };

    if (excludeVehicleId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeVehicleId };
    }

    const vehicle = await Vehicle.findOne({ where: whereClause });
    return !!vehicle;
  }

  // Check if license plate is already taken
  public static async isLicensePlateTaken(licensePlate: string, excludeVehicleId?: string): Promise<boolean> {
    const whereClause: any = {
      licensePlate: licensePlate.toUpperCase(),
      deletedAt: null,
    };

    if (excludeVehicleId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeVehicleId };
    }

    const vehicle = await Vehicle.findOne({ where: whereClause });
    return !!vehicle;
  }

  // Check if VIN is already taken
  public static async isVinTaken(vin: string, excludeVehicleId?: string): Promise<boolean> {
    const whereClause: any = {
      vin: vin.toUpperCase(),
      deletedAt: null,
    };

    if (excludeVehicleId) {
      whereClause.id = { [database.Sequelize.Op.ne]: excludeVehicleId };
    }

    const vehicle = await Vehicle.findOne({ where: whereClause });
    return !!vehicle;
  }

  // Get fleet statistics
  public static async getFleetStatistics(): Promise<any> {
    const [statusStats, typeStats, fuelStats] = await Promise.all([
      // Status distribution
      Vehicle.findAll({
        attributes: [
          'status',
          [database.fn('COUNT', database.col('id')), 'count'],
        ],
        where: { deletedAt: null },
        group: ['status'],
        raw: true,
      }),
      
      // Type distribution
      Vehicle.findAll({
        attributes: [
          'vehicleType',
          [database.fn('COUNT', database.col('id')), 'count'],
        ],
        where: { deletedAt: null },
        group: ['vehicleType'],
        raw: true,
      }),

      // Fuel type distribution
      Vehicle.findAll({
        attributes: [
          'fuelType',
          [database.fn('COUNT', database.col('id')), 'count'],
        ],
        where: { 
          deletedAt: null,
          fuelType: { [database.Sequelize.Op.ne]: null }
        },
        group: ['fuelType'],
        raw: true,
      }),
    ]);

    return {
      byStatus: statusStats,
      byType: typeStats,
      byFuelType: fuelStats,
    };
  }
}

/**
 * Model definition
 */
Vehicle.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'vehicles_vehicle_number_unique',
        msg: 'Vehicle number is already in use',
      },
      field: 'vehicle_number',
      validate: {
        len: {
          args: [3, 50],
          msg: 'Vehicle number must be between 3 and 50 characters',
        },
        notEmpty: {
          msg: 'Vehicle number is required',
        },
      },
    },
    make: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [1, 100],
          msg: 'Make must be between 1 and 100 characters',
        },
      },
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [1, 100],
          msg: 'Model must be between 1 and 100 characters',
        },
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [1900],
          msg: 'Year must be 1900 or later',
        },
        max: {
          args: [new Date().getFullYear() + 2],
          msg: 'Year cannot be more than 2 years in the future',
        },
      },
    },
    vin: {
      type: DataTypes.STRING(17),
      allowNull: true,
      unique: {
        name: 'vehicles_vin_unique',
        msg: 'VIN is already registered',
      },
      validate: {
        len: {
          args: [17, 17],
          msg: 'VIN must be exactly 17 characters',
        },
      },
      set(value: string | null) {
        // Store VIN in uppercase if provided
        if (value) {
          this.setDataValue('vin', value.toUpperCase());
        } else {
          this.setDataValue('vin', null);
        }
      },
    },
    licensePlate: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: {
        name: 'vehicles_license_plate_unique',
        msg: 'License plate is already registered',
      },
      field: 'license_plate',
      validate: {
        len: {
          args: [1, 20],
          msg: 'License plate must be between 1 and 20 characters',
        },
      },
      set(value: string | null) {
        // Store license plate in uppercase if provided
        if (value) {
          this.setDataValue('licensePlate', value.toUpperCase());
        } else {
          this.setDataValue('licensePlate', null);
        }
      },
    },
    vehicleType: {
      type: DataTypes.ENUM(...Object.values(VehicleType)),
      allowNull: false,
      field: 'vehicle_type',
      validate: {
        isIn: {
          args: [Object.values(VehicleType)],
          msg: 'Invalid vehicle type',
        },
      },
    },
    capacityCubicYards: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: 'capacity_cubic_yards',
      validate: {
        min: {
          args: [0],
          msg: 'Capacity in cubic yards cannot be negative',
        },
        isDecimal: {
          msg: 'Capacity must be a valid decimal number',
        },
      },
    },
    capacityWeightLbs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'capacity_weight_lbs',
      validate: {
        min: {
          args: [0],
          msg: 'Capacity in pounds cannot be negative',
        },
        isDecimal: {
          msg: 'Capacity must be a valid decimal number',
        },
      },
    },
    fuelType: {
      type: DataTypes.ENUM(...Object.values(FuelType)),
      allowNull: true,
      field: 'fuel_type',
      validate: {
        isIn: {
          args: [Object.values(FuelType)],
          msg: 'Invalid fuel type',
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(VehicleStatus)),
      allowNull: false,
      defaultValue: VehicleStatus.ACTIVE,
      validate: {
        isIn: {
          args: [Object.values(VehicleStatus)],
          msg: 'Invalid vehicle status',
        },
      },
    },
    gpsDeviceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'gps_device_id',
      validate: {
        len: {
          args: [1, 100],
          msg: 'GPS device ID must be between 1 and 100 characters',
        },
      },
    },
    samsaraVehicleId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'samsara_vehicle_id',
      validate: {
        len: {
          args: [1, 100],
          msg: 'Samsara vehicle ID must be between 1 and 100 characters',
        },
      },
    },
    lastMaintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_maintenance_date',
    },
    nextMaintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'next_maintenance_date',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: 'Version must be at least 1',
        },
      },
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'deleted_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize: database,
    tableName: 'vehicles',
    schema: 'core',
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    underscored: true,
    indexes: [
      {
        name: 'idx_vehicles_vehicle_number',
        fields: ['vehicle_number'],
        unique: true,
        where: { deleted_at: null },
      },
      {
        name: 'idx_vehicles_vin',
        fields: ['vin'],
        unique: true,
        where: { vin: { [database.Sequelize.Op.ne]: null }, deleted_at: null },
      },
      {
        name: 'idx_vehicles_license_plate',
        fields: ['license_plate'],
        unique: true,
        where: { license_plate: { [database.Sequelize.Op.ne]: null }, deleted_at: null },
      },
      {
        name: 'idx_vehicles_type',
        fields: ['vehicle_type'],
        where: { deleted_at: null },
      },
      {
        name: 'idx_vehicles_status',
        fields: ['status'],
        where: { deleted_at: null },
      },
      {
        name: 'idx_vehicles_fuel_type',
        fields: ['fuel_type'],
      },
      {
        name: 'idx_vehicles_gps_device_id',
        fields: ['gps_device_id'],
        where: { gps_device_id: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: 'idx_vehicles_samsara_vehicle_id',
        fields: ['samsara_vehicle_id'],
        where: { samsara_vehicle_id: { [database.Sequelize.Op.ne]: null } },
      },
      {
        name: 'idx_vehicles_next_maintenance_date',
        fields: ['next_maintenance_date'],
        where: { next_maintenance_date: { [database.Sequelize.Op.ne]: null } },
      },
    ],
    hooks: {
      beforeValidate: async (vehicle: Vehicle) => {
        // Auto-generate vehicle number if not provided
        if (!vehicle.vehicleNumber) {
          vehicle.vehicleNumber = await Vehicle.generateVehicleNumber(vehicle.vehicleType);
        }

        // Normalize VIN and license plate to uppercase
        if (vehicle.vin) {
          vehicle.vin = vehicle.vin.toUpperCase();
        }
        if (vehicle.licensePlate) {
          vehicle.licensePlate = vehicle.licensePlate.toUpperCase();
        }
      },
      beforeUpdate: (vehicle: Vehicle) => {
        // Increment version for optimistic locking
        vehicle.version = (vehicle.version || 1) + 1;
        
        // Update maintenance dates if last maintenance date is updated
        if (vehicle.changed('lastMaintenanceDate') && vehicle.lastMaintenanceDate) {
          const nextMaintenance = new Date(vehicle.lastMaintenanceDate);
          nextMaintenance.setMonth(nextMaintenance.getMonth() + 6); // 6 months default interval
          vehicle.nextMaintenanceDate = nextMaintenance;
        }
      },
    },
    scopes: {
      active: {
        where: {
          status: VehicleStatus.ACTIVE,
          deletedAt: null,
        },
      },
      available: {
        where: {
          status: VehicleStatus.ACTIVE,
          deletedAt: null,
        },
      },
      inMaintenance: {
        where: {
          status: VehicleStatus.MAINTENANCE,
          deletedAt: null,
        },
      },
      needingMaintenance: {
        where: {
          nextMaintenanceDate: {
            [database.Sequelize.Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
          status: {
            [database.Sequelize.Op.in]: [VehicleStatus.ACTIVE, VehicleStatus.MAINTENANCE],
          },
          deletedAt: null,
        },
      },
      byType: (vehicleType: VehicleType) => ({
        where: {
          vehicleType,
          deletedAt: null,
        },
      }),
      withGpsTracking: {
        where: {
          gpsDeviceId: {
            [database.Sequelize.Op.ne]: null,
          },
          deletedAt: null,
        },
      },
      withSamsaraIntegration: {
        where: {
          samsaraVehicleId: {
            [database.Sequelize.Op.ne]: null,
          },
          deletedAt: null,
        },
      },
    },
  }
);

export default Vehicle;