/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CUSTOMER MODEL
 * ============================================================================
 * 
 * Customer model for managing waste management service customers.
 * Extends organization functionality with service-specific features.
 * 
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { 
  DataTypes, 
  Model, 
  InferAttributes, 
  InferCreationAttributes, 
  CreationOptional,
  HasManyGetAssociationsMixin,
  BelongsToGetAssociationMixin,
  Association
} from 'sequelize';
import { database } from '@/config/database';

// Customer status enumeration
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  PROSPECT = 'prospect'
}

// Service frequency enumeration
export enum ServiceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly', 
  MONTHLY = 'monthly',
  ON_DEMAND = 'on_demand'
}

// Payment terms enumeration
export enum PaymentTerms {
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  IMMEDIATE = 'immediate'
}

/**
 * Customer service configuration interface
 */
export interface ServiceConfig {
  service_type: string[];
  container_types: string[];
  frequency: ServiceFrequency;
  preferred_day?: string;
  preferred_time?: string;
  special_instructions?: string;
}

/**
 * Customer model interface
 */
interface CustomerModel extends Model<InferAttributes<CustomerModel>, InferCreationAttributes<CustomerModel>> {
  // Primary fields
  id: CreationOptional<string>;
  customer_number: string;
  organization_id: string;
  status: CreationOptional<CustomerStatus>;
  
  // Service configuration
  service_types: string[];
  container_types: string[];
  service_frequency: ServiceFrequency;
  preferred_day_of_week?: number;
  preferred_time?: string;
  special_instructions?: string;
  
  // Billing information
  billing_method: CreationOptional<string>;
  payment_terms: CreationOptional<PaymentTerms>;
  billing_contact_id?: string;
  
  // Service dates
  service_start_date?: Date;
  service_end_date?: Date;
  next_service_date?: Date;
  
  // Pricing
  base_rate?: number;
  service_rate?: number;
  container_rate?: number;
  fuel_surcharge?: number;
  
  // Relationships
  account_manager_id?: string;
  primary_driver_id?: string;
  
  // Audit fields
  created_at: CreationOptional<Date>;
  updated_at: CreationOptional<Date>;
  created_by?: string;
  updated_by?: string;
  version: CreationOptional<number>;
  deleted_at?: Date;
  deleted_by?: string;
  
  // Instance methods
  isActive(): boolean;
  canReceiveService(): boolean;
  getServiceConfig(): ServiceConfig;
  setServiceConfig(config: ServiceConfig): void;
  calculateNextServiceDate(): Date | null;
  getTotalRate(): number;
  hasActiveServices(): Promise<boolean>;
  getServiceHistory(): Promise<any[]>;
  toSafeJSON(): object;
  
  // Associations
  getOrganization?: BelongsToGetAssociationMixin<any>;
  getAccountManager?: BelongsToGetAssociationMixin<any>;
  getPrimaryDriver?: BelongsToGetAssociationMixin<any>;
  getBillingContact?: BelongsToGetAssociationMixin<any>;
  getServiceEvents?: HasManyGetAssociationsMixin<any>;
  getInvoices?: HasManyGetAssociationsMixin<any>;
  
  // Static associations
  static associations: {
    organization: Association<CustomerModel, any>;
    accountManager: Association<CustomerModel, any>;
    primaryDriver: Association<CustomerModel, any>;
    billingContact: Association<CustomerModel, any>;
    serviceEvents: Association<CustomerModel, any>;
    invoices: Association<CustomerModel, any>;
  };
}

/**
 * Customer model definition
 */
export const Customer = database.define<CustomerModel>('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  
  customer_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true,
    },
  },
  
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
  
  status: {
    type: DataTypes.ENUM(...Object.values(CustomerStatus)),
    allowNull: false,
    defaultValue: CustomerStatus.PROSPECT,
  },
  
  service_types: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Types of waste management services (trash, recycling, composting, etc.)',
  },
  
  container_types: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Container types and sizes (dumpster_2yd, bin_64gal, etc.)',
  },
  
  service_frequency: {
    type: DataTypes.ENUM(...Object.values(ServiceFrequency)),
    allowNull: false,
    defaultValue: ServiceFrequency.WEEKLY,
  },
  
  preferred_day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1, // Monday
      max: 7, // Sunday
    },
    comment: '1=Monday, 2=Tuesday, ..., 7=Sunday',
  },
  
  preferred_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Preferred service time window',
  },
  
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Special pickup instructions and access notes',
  },
  
  billing_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'monthly_invoice',
    validate: {
      isIn: [['monthly_invoice', 'automatic_payment', 'prepaid', 'on_account']],
    },
  },
  
  payment_terms: {
    type: DataTypes.ENUM(...Object.values(PaymentTerms)),
    allowNull: false,
    defaultValue: PaymentTerms.NET_30,
  },
  
  billing_contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  
  service_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  
  service_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  
  next_service_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  
  base_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
    comment: 'Base monthly service rate in dollars',
  },
  
  service_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
    comment: 'Per-service rate in dollars',
  },
  
  container_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
    comment: 'Per-container rate in dollars',
  },
  
  fuel_surcharge: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    validate: {
      min: 0,
      max: 1,
    },
    comment: 'Fuel surcharge percentage (0.05 = 5%)',
  },
  
  account_manager_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  
  primary_driver_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  deleted_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'customers',
  schema: 'operations',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  version: true,
  
  // Indexes
  indexes: [
    {
      unique: true,
      fields: ['customer_number'],
      where: { deleted_at: null },
    },
    {
      fields: ['organization_id'],
      where: { deleted_at: null },
    },
    {
      fields: ['status'],
      where: { deleted_at: null },
    },
    {
      fields: ['service_frequency'],
      where: { deleted_at: null },
    },
    {
      fields: ['account_manager_id'],
      where: { deleted_at: null },
    },
    {
      fields: ['primary_driver_id'],
      where: { deleted_at: null },
    },
    {
      fields: ['next_service_date'],
      where: { deleted_at: null },
    },
    {
      fields: ['service_start_date', 'service_end_date'],
      where: { deleted_at: null },
    },
    {
      fields: ['created_at'],
    },
  ],
  
  // Hooks
  hooks: {
    beforeCreate: async (customer: CustomerModel) => {
      // Generate customer number if not provided
      if (!customer.customer_number) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        customer.customer_number = `CUST-${timestamp}-${random}`;
      }
      
      // Set next service date based on frequency and start date
      if (customer.service_start_date && customer.service_frequency) {
        customer.next_service_date = await customer.calculateNextServiceDate();
      }
    },
    
    beforeUpdate: async (customer: CustomerModel) => {
      // Increment version
      customer.version = (customer.version || 1) + 1;
      
      // Update next service date if frequency or start date changed
      if ((customer.changed('service_frequency') || customer.changed('service_start_date')) 
          && customer.service_start_date && customer.service_frequency) {
        customer.next_service_date = await customer.calculateNextServiceDate();
      }
    },
    
    beforeBulkDestroy: async (options: any) => {
      // Ensure soft delete with individual hooks
      options.individualHooks = true;
    },
  },
  
  // Scopes
  scopes: {
    active: {
      where: {
        status: [CustomerStatus.ACTIVE],
        deleted_at: null,
      },
    },
    
    activeServices: {
      where: {
        status: [CustomerStatus.ACTIVE],
        service_start_date: { [database.Op.lte]: new Date() },
        [database.Op.or]: [
          { service_end_date: null },
          { service_end_date: { [database.Op.gte]: new Date() } },
        ],
        deleted_at: null,
      },
    },
    
    prospects: {
      where: {
        status: CustomerStatus.PROSPECT,
        deleted_at: null,
      },
    },
    
    dueForService: {
      where: {
        status: CustomerStatus.ACTIVE,
        next_service_date: { [database.Op.lte]: new Date() },
        deleted_at: null,
      },
    },
    
    byFrequency: (frequency: ServiceFrequency) => ({
      where: {
        service_frequency: frequency,
        deleted_at: null,
      },
    }),
    
    withAccountManager: {
      where: {
        account_manager_id: { [database.Op.ne]: null },
        deleted_at: null,
      },
    },
  },
});

/**
 * Instance method implementations
 */

// Check if customer is active
Customer.prototype.isActive = function(): boolean {
  return this.status === CustomerStatus.ACTIVE && !this.deleted_at;
};

// Check if customer can receive service
Customer.prototype.canReceiveService = function(): boolean {
  const now = new Date();
  const startDateOk = !this.service_start_date || this.service_start_date <= now;
  const endDateOk = !this.service_end_date || this.service_end_date >= now;
  
  return this.isActive() && startDateOk && endDateOk;
};

// Get service configuration as structured object
Customer.prototype.getServiceConfig = function(): ServiceConfig {
  return {
    service_type: this.service_types || [],
    container_types: this.container_types || [],
    frequency: this.service_frequency,
    preferred_day: this.preferred_day_of_week ? 
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][this.preferred_day_of_week - 1] 
      : undefined,
    preferred_time: this.preferred_time,
    special_instructions: this.special_instructions || undefined,
  };
};

// Set service configuration from structured object
Customer.prototype.setServiceConfig = function(config: ServiceConfig): void {
  this.service_types = config.service_type;
  this.container_types = config.container_types;
  this.service_frequency = config.frequency;
  
  if (config.preferred_day) {
    const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      .indexOf(config.preferred_day.toLowerCase());
    this.preferred_day_of_week = dayIndex >= 0 ? dayIndex + 1 : null;
  }
  
  this.preferred_time = config.preferred_time || null;
  this.special_instructions = config.special_instructions || null;
};

// Calculate next service date based on frequency
Customer.prototype.calculateNextServiceDate = function(): Date | null {
  if (!this.service_start_date || !this.service_frequency) {
    return null;
  }
  
  const startDate = new Date(this.service_start_date);
  const today = new Date();
  
  // If service hasn't started yet, use start date
  if (startDate > today) {
    return startDate;
  }
  
  let nextDate = new Date(today);
  
  switch (this.service_frequency) {
    case ServiceFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
      
    case ServiceFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      if (this.preferred_day_of_week) {
        // Adjust to preferred day of week
        const currentDay = nextDate.getDay() || 7; // Sunday = 7
        const preferredDay = this.preferred_day_of_week;
        const daysToAdd = (preferredDay - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      break;
      
    case ServiceFrequency.BIWEEKLY:
      nextDate.setDate(nextDate.getDate() + 14);
      if (this.preferred_day_of_week) {
        const currentDay = nextDate.getDay() || 7;
        const preferredDay = this.preferred_day_of_week;
        const daysToAdd = (preferredDay - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      break;
      
    case ServiceFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
      
    case ServiceFrequency.ON_DEMAND:
    default:
      return null; // No automatic scheduling for on-demand
  }
  
  // If service has an end date, don't schedule beyond it
  if (this.service_end_date && nextDate > this.service_end_date) {
    return null;
  }
  
  return nextDate;
};

// Calculate total service rate
Customer.prototype.getTotalRate = function(): number {
  let total = 0;
  
  if (this.base_rate) total += parseFloat(this.base_rate.toString());
  if (this.service_rate) total += parseFloat(this.service_rate.toString());
  if (this.container_rate) total += parseFloat(this.container_rate.toString());
  
  // Apply fuel surcharge if present
  if (this.fuel_surcharge) {
    total *= (1 + parseFloat(this.fuel_surcharge.toString()));
  }
  
  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

// Check if customer has active service events
Customer.prototype.hasActiveServices = async function(): Promise<boolean> {
  // This would require the ServiceEvent model to be implemented
  // For now, return a placeholder
  return this.canReceiveService();
};

// Get service history (placeholder implementation)
Customer.prototype.getServiceHistory = async function(): Promise<any[]> {
  // This would require the ServiceEvent model to be implemented
  // For now, return empty array
  return [];
};

// Safe JSON representation
Customer.prototype.toSafeJSON = function(): object {
  const values = { ...this.get() };
  
  return {
    id: values.id,
    customerNumber: values.customer_number,
    organizationId: values.organization_id,
    status: values.status,
    serviceConfig: this.getServiceConfig(),
    billingMethod: values.billing_method,
    paymentTerms: values.payment_terms,
    billingContactId: values.billing_contact_id,
    serviceStartDate: values.service_start_date,
    serviceEndDate: values.service_end_date,
    nextServiceDate: values.next_service_date,
    rates: {
      base: values.base_rate,
      service: values.service_rate,
      container: values.container_rate,
      fuelSurcharge: values.fuel_surcharge,
      total: this.getTotalRate(),
    },
    accountManagerId: values.account_manager_id,
    primaryDriverId: values.primary_driver_id,
    createdAt: values.created_at,
    updatedAt: values.updated_at,
    isActive: this.isActive(),
    canReceiveService: this.canReceiveService(),
  };
};

/**
 * Static methods
 */

// Find customers by status
Customer.findByStatus = async function(status: CustomerStatus): Promise<CustomerModel[]> {
  return await this.findAll({
    where: { 
      status,
      deleted_at: null,
    },
    order: [['customer_number', 'ASC']],
  });
};

// Find customers due for service
Customer.findDueForService = async function(date?: Date): Promise<CustomerModel[]> {
  const targetDate = date || new Date();
  
  return await this.scope('dueForService').findAll({
    where: {
      next_service_date: { [database.Op.lte]: targetDate },
    },
    order: [['next_service_date', 'ASC'], ['customer_number', 'ASC']],
  });
};

// Find customers by service frequency
Customer.findByFrequency = async function(frequency: ServiceFrequency): Promise<CustomerModel[]> {
  return await this.scope(['active', { method: ['byFrequency', frequency] }]).findAll({
    order: [['customer_number', 'ASC']],
  });
};

// Find customers by account manager
Customer.findByAccountManager = async function(managerId: string): Promise<CustomerModel[]> {
  return await this.scope('active').findAll({
    where: { account_manager_id: managerId },
    order: [['customer_number', 'ASC']],
  });
};

// Create customer with service configuration
Customer.createWithConfig = async function(customerData: {
  organization_id: string;
  service_config: ServiceConfig;
  billing_method?: string;
  payment_terms?: PaymentTerms;
  service_start_date?: Date;
  rates?: {
    base?: number;
    service?: number;
    container?: number;
    fuel_surcharge?: number;
  };
  account_manager_id?: string;
  created_by?: string;
}): Promise<CustomerModel> {
  const customer = this.build({
    organization_id: customerData.organization_id,
    billing_method: customerData.billing_method,
    payment_terms: customerData.payment_terms,
    service_start_date: customerData.service_start_date,
    base_rate: customerData.rates?.base,
    service_rate: customerData.rates?.service,
    container_rate: customerData.rates?.container,
    fuel_surcharge: customerData.rates?.fuel_surcharge,
    account_manager_id: customerData.account_manager_id,
    created_by: customerData.created_by,
  });
  
  // Set service configuration
  customer.setServiceConfig(customerData.service_config);
  
  return await customer.save();
};

export { CustomerModel, ServiceConfig };
export default Customer;