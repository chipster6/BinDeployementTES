/**
 * ============================================================================
 * MODELS INDEX - SEQUELIZE MODELS EXPORT
 * ============================================================================
 * 
 * Central export point for all Sequelize models with proper initialization
 * order to handle dependencies and associations.
 * 
 * Created by: Database Architect Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { database } from '@/config/database';

// Import all models
import User, { UserRole, UserStatus } from './User';
import Organization, { OrganizationType, OrganizationStatus, DataRetentionPolicy } from './Organization';
import Customer, { ServiceFrequency, PreferredServiceDay, PaymentTerms } from './Customer';
import Vehicle, { VehicleType, FuelType, VehicleStatus } from './Vehicle';
import Driver, { EmploymentStatus, LicenseClass } from './Driver';
import Route, { RouteType, RouteStatus, ServiceDay } from './Route';
import Bin, { BinType, BinStatus, BinMaterial } from './Bin';

// Import additional models (will be created)
// import ServiceEvent from './ServiceEvent';
// import Invoice from './Invoice';
// import Payment from './Payment';
// import ServiceAgreement from './ServiceAgreement';

// Security models
// import UserSession from './security/UserSession';
// import FailedLoginAttempt from './security/FailedLoginAttempt';
// import ApiKey from './security/ApiKey';
// import SecurityEvent from './security/SecurityEvent';

// Audit models
// import DataAccessLog from './audit/DataAccessLog';

// Analytics and IoT models
// import GpsTracking from './analytics/GpsTracking';
// import SensorData from './analytics/SensorData';
// import DailyMetrics from './analytics/DailyMetrics';
// import CustomerMetrics from './analytics/CustomerMetrics';
// import RouteOptimization from './analytics/RouteOptimization';

// Integration models
// import AirtableSync from './integration/AirtableSync';
// import SamsaraSync from './integration/SamsaraSync';
// import WebhookEvent from './integration/WebhookEvent';

/**
 * Define model associations
 */
function defineAssociations() {
  // User associations (self-referencing for audit trail)
  User.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  User.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // Organization associations
  Organization.belongsTo(User, {
    as: 'primaryContact',
    foreignKey: 'primaryContactId',
    constraints: false,
  });
  
  Organization.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Organization.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // User has one primary contact organization (reverse)
  User.hasOne(Organization, {
    as: 'primaryContactOrganization',
    foreignKey: 'primaryContactId',
    constraints: false,
  });

  // Customer associations
  Customer.belongsTo(Organization, {
    as: 'organization',
    foreignKey: 'organizationId',
    constraints: true,
  });
  
  Customer.belongsTo(User, {
    as: 'accountManager',
    foreignKey: 'accountManagerId',
    constraints: false,
  });
  
  Customer.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Customer.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // Organization has many customers (reverse)
  Organization.hasMany(Customer, {
    as: 'customers',
    foreignKey: 'organizationId',
    constraints: true,
  });

  // User has many customers as account manager (reverse)
  User.hasMany(Customer, {
    as: 'managedCustomers',
    foreignKey: 'accountManagerId',
    constraints: false,
  });

  // Vehicle associations
  Vehicle.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Vehicle.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // Driver associations
  Driver.belongsTo(User, {
    as: 'user',
    foreignKey: 'userId',
    constraints: true,
  });
  
  Driver.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Driver.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // User has one driver profile (reverse)
  User.hasOne(Driver, {
    as: 'driverProfile',
    foreignKey: 'userId',
    constraints: true,
  });

  // Route associations
  Route.belongsTo(Driver, {
    as: 'driver',
    foreignKey: 'driverId',
    constraints: false,
  });
  
  Route.belongsTo(Vehicle, {
    as: 'vehicle',
    foreignKey: 'vehicleId',
    constraints: false,
  });
  
  Route.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Route.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  // Driver has many routes (reverse)
  Driver.hasMany(Route, {
    as: 'routes',
    foreignKey: 'driverId',
    constraints: false,
  });

  // Vehicle has many routes (reverse)
  Vehicle.hasMany(Route, {
    as: 'routes',
    foreignKey: 'vehicleId',
    constraints: false,
  });

  // Bin associations
  Bin.belongsTo(Customer, {
    as: 'customer',
    foreignKey: 'customerId',
    constraints: true,
  });
  
  Bin.belongsTo(User, {
    as: 'createdByUser',
    foreignKey: 'createdBy',
    constraints: false,
  });
  
  Bin.belongsTo(User, {
    as: 'updatedByUser',
    foreignKey: 'updatedBy',
    constraints: false,
  });

  Bin.belongsTo(User, {
    as: 'deletedByUser',
    foreignKey: 'deletedBy',
    constraints: false,
  });

  // Customer has many bins (reverse)
  Customer.hasMany(Bin, {
    as: 'bins',
    foreignKey: 'customerId',
    constraints: true,
  });

  // TODO: Add more associations as models are created
  // ServiceEvent, Invoice, Payment, etc.
}

/**
 * Initialize all models and associations
 */
export async function initializeModels(): Promise<void> {
  try {
    console.log('🔧 Initializing Sequelize models...');
    
    // Define all model associations
    defineAssociations();
    
    // Sync models in development (be careful in production)
    if (process.env.NODE_ENV === 'development') {
      // Use alter: true to update existing tables without dropping them
      await database.sync({ alter: true });
      console.log('✅ Database models synchronized successfully');
    }
    
    console.log('✅ All models initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing models:', error);
    throw error;
  }
}

// Export all models and enums
export {
  // Core models
  User,
  Organization,
  Customer,
  Vehicle,
  Driver,
  Route,
  Bin,
  
  // User enums
  UserRole,
  UserStatus,
  
  // Organization enums
  OrganizationType,
  OrganizationStatus,
  DataRetentionPolicy,
  
  // Customer enums
  ServiceFrequency,
  PreferredServiceDay,
  PaymentTerms,
  
  // Vehicle enums
  VehicleType,
  FuelType,
  VehicleStatus,
  
  // Driver enums
  EmploymentStatus,
  LicenseClass,
  
  // Route enums
  RouteType,
  RouteStatus,
  ServiceDay,
  
  // Bin enums
  BinType,
  BinStatus,
  BinMaterial,
  
  // Database instance
  database,
};

// Export default models object for convenience
export default {
  User,
  Organization,
  Customer,
  Vehicle,
  Driver,
  Route,
  Bin,
  database,
  initializeModels,
};