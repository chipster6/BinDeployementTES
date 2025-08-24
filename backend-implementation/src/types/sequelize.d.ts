/**
 * ============================================================================
 * SEQUELIZE TYPE DEFINITIONS
 * ============================================================================
 * 
 * Comprehensive type definitions for Sequelize ORM to resolve TypeScript errors
 * Provides all missing Sequelize types used throughout the application
 */

import {
  Model,
  ModelStatic,
  Sequelize as SequelizeInstance,
  DataTypes as SequelizeDataTypes,
  ModelAttributeColumnOptions,
  Association,
  BelongsToGetAssociationMixin as SeqBelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin as SeqBelongsToSetAssociationMixin,
  HasManyGetAssociationsMixin as SeqHasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  HasOneCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
  FindOptions as SeqFindOptions,
  WhereOptions as SeqWhereOptions,
  Op as SeqOp,
  QueryTypes as SeqQueryTypes,
  Transaction,
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
  TimeoutError,
  ConnectionError,
  ConnectionTimedOutError,
  ConnectionRefusedError,
  HostNotFoundError,
  HostNotReachableError,
  InvalidConnectionError,
  AccessDeniedError
} from 'sequelize';

// Re-export common Sequelize types with simpler names
export type CreationOptional<T extends Model, K extends keyof T> = T[K];
export type NonAttribute<T> = T;
export type ForeignKey<T> = T;

// Re-export association mixins
export type BelongsToGetAssociationMixin<T extends Model> = SeqBelongsToGetAssociationMixin<T>;
export type BelongsToSetAssociationMixin<T extends Model, PK> = SeqBelongsToSetAssociationMixin<T, PK>;
export type HasManyGetAssociationsMixin<T extends Model> = SeqHasManyGetAssociationsMixin<T>;

// Re-export query options
export type FindOptions<T extends Model = Model> = SeqFindOptions<T>;
export type WhereOptions<T = any> = SeqWhereOptions<T>;

// Re-export operators
export const Op = SeqOp;
export const QueryTypes = SeqQueryTypes;

// Export database instance type
export interface DatabaseInstance extends SequelizeInstance {
  models: {
    [key: string]: ModelStatic<Model>;
  };
}

// Common model attributes
export interface TimestampAttributes {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface BaseModelAttributes extends TimestampAttributes {
  id?: number;
}

// Model validation interfaces
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Query result types
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Transaction options
export interface TransactionOptions {
  isolationLevel?: Transaction.ISOLATION_LEVELS;
  type?: Transaction.TYPES;
  deferrable?: string;
  autocommit?: boolean;
  readOnly?: boolean;
}

// Model hooks
export interface ModelHooks<T extends Model = Model> {
  beforeValidate?: (instance: T, options: any) => void | Promise<void>;
  afterValidate?: (instance: T, options: any) => void | Promise<void>;
  beforeCreate?: (instance: T, options: any) => void | Promise<void>;
  afterCreate?: (instance: T, options: any) => void | Promise<void>;
  beforeUpdate?: (instance: T, options: any) => void | Promise<void>;
  afterUpdate?: (instance: T, options: any) => void | Promise<void>;
  beforeDestroy?: (instance: T, options: any) => void | Promise<void>;
  afterDestroy?: (instance: T, options: any) => void | Promise<void>;
  beforeBulkCreate?: (instances: T[], options: any) => void | Promise<void>;
  afterBulkCreate?: (instances: T[], options: any) => void | Promise<void>;
  beforeBulkUpdate?: (options: any) => void | Promise<void>;
  afterBulkUpdate?: (options: any) => void | Promise<void>;
  beforeBulkDestroy?: (options: any) => void | Promise<void>;
  afterBulkDestroy?: (options: any) => void | Promise<void>;
}

// Scopes definition
export interface ModelScopes {
  [scopeName: string]: FindOptions | ((args: any) => FindOptions);
}

// Model options
export interface ExtendedModelOptions {
  timestamps?: boolean;
  paranoid?: boolean;
  underscored?: boolean;
  tableName?: string;
  schema?: string;
  engine?: string;
  charset?: string;
  collate?: string;
  comment?: string;
  indexes?: any[];
  scopes?: ModelScopes;
  hooks?: ModelHooks;
  validate?: object;
}

// Export all Sequelize error types
export {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
  TimeoutError,
  ConnectionError,
  ConnectionTimedOutError,
  ConnectionRefusedError,
  HostNotFoundError,
  HostNotReachableError,
  InvalidConnectionError,
  AccessDeniedError
} from 'sequelize';

// Export Model and related types
export { Model, ModelStatic, Association, Transaction };

// Export DataTypes
export { SequelizeDataTypes as DataTypes };

// Export InferAttributes and InferCreationAttributes
export { InferAttributes, InferCreationAttributes };
// Additional exports for common Sequelize types
export { 
  Model,
  DataTypes,
  Sequelize,
  Transaction,
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  TimeoutError,
  ConnectionError,
  ConnectionTimedOutError
} from 'sequelize';

// Export instance for singleton pattern
export const sequelize: Sequelize;
