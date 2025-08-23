/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BASE DTO CLASS
 * ============================================================================
 *
 * Base Data Transfer Object class providing common functionality for all DTOs.
 * Implements consistent patterns for data transformation, validation,
 * and serialization across API endpoints.
 *
 * Features:
 * - Data validation and transformation
 * - Serialization and deserialization
 * - Type safety and consistency
 * - Field mapping and filtering
 * - Nested object support
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Model } from "sequelize";
import Joi from "joi";

/**
 * DTO transformation options
 */
export interface DTOTransformOptions {
  includeFields?: string[];
  excludeFields?: string[];
  includeRelations?: string[];
  maskSensitiveFields?: boolean;
  timezone?: string;
}

/**
 * DTO validation result
 */
export interface DTOValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  data?: any;
}

/**
 * Abstract base DTO class
 */
export abstract class BaseDTO<T = any> {
  protected data: T;
  protected originalData?: any;
  protected transformOptions?: DTOTransformOptions;

  constructor(data?: T | Model, options?: DTOTransformOptions) {
    this.transformOptions = options || {};

    if (data) {
      if (data instanceof Model) {
        this.originalData = data;
        this.data = this.fromModel(data);
      } else {
        this.data = data as T;
      }
    } else {
      this.data = {} as T;
    }
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract getValidationSchema(): Joi.ObjectSchema;
  protected abstract getFieldMappings(): Record<string, string>;
  protected abstract getSensitiveFields(): string[];

  /**
   * Transform model instance to DTO data
   */
  protected fromModel(model: Model): T {
    const mappings = this.getFieldMappings();
    const modelData = model.toJSON();
    const dtoData: any = {};

    // Apply field mappings
    Object.keys(modelData).forEach((key) => {
      const mappedKey = mappings[key] || key;
      dtoData[mappedKey] = modelData[key];
    });

    // Include/exclude fields based on options
    if (this.transformOptions?.includeFields) {
      const filtered: any = {};
      this.transformOptions.includeFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(dtoData, field)) {
          filtered[field] = dtoData[field];
        }
      });
      return filtered as T;
    }

    if (this.transformOptions?.excludeFields) {
      this.transformOptions.excludeFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(dtoData, field)) {
          delete dtoData[field];
        }
      });
    }

    // Mask sensitive fields
    if (this.transformOptions?.maskSensitiveFields !== false) {
      this.getSensitiveFields().forEach((field) => {
        if (dtoData[field]) {
          dtoData[field] = this.maskSensitiveField(dtoData[field]);
        }
      });
    }

    return dtoData as T;
  }

  /**
   * Transform DTO data to create/update data for models
   */
  protected toModelData(): any {
    const mappings = this.getFieldMappings();
    const reverseMappings = Object.keys(mappings).reduce(
      (acc, key) => {
        const mappingKey = mappings[key];
        if (mappingKey) {
          acc[mappingKey] = key;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const modelData: any = {};
    if (this.data) {
      Object.keys(this.data as any).forEach((key) => {
        const mappedKey = reverseMappings[key] || key;
        const value = (this.data as any)[key];
        if (value !== undefined) {
          modelData[mappedKey] = value;
        }
      });
    }

    return modelData;
  }

  /**
   * Validate DTO data
   */
  public validate(): DTOValidationResult {
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(this.data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail?.message,
        value: detail.context?.value,
      }));

      return {
        isValid: false,
        errors,
      };
    }

    return {
      isValid: true,
      errors: [],
      data: value,
    };
  }

  /**
   * Get DTO data
   */
  public getData(): T {
    return this.data;
  }

  /**
   * Set DTO data
   */
  public setData(data: Partial<T>): void {
    this.data = { ...this.data, ...data };
  }

  /**
   * Get specific field value
   */
  public getField<K extends keyof T>(field: K): T[K] {
    return this.data[field];
  }

  /**
   * Set specific field value
   */
  public setField<K extends keyof T>(field: K, value: T[K]): void {
    this.data[field] = value;
  }

  /**
   * Check if field exists and has value
   */
  public hasField(field: keyof T): boolean {
    const value = this.data[field];
    return value !== undefined && value !== null && value !== "";
  }

  /**
   * Get safe data for API response (excludes sensitive fields)
   */
  public toSafeJSON(): any {
    const safeData = { ...this.data };
    const sensitiveFields = this.getSensitiveFields();

    sensitiveFields.forEach((field) => {
      if ((safeData as any)[field]) {
        (safeData as any)[field] = this.maskSensitiveField(
          (safeData as any)[field],
        );
      }
    });

    return safeData;
  }

  /**
   * Get complete data for internal use
   */
  public toJSON(): T {
    return this.data;
  }

  /**
   * Convert to model creation data
   */
  public toCreateData(): any {
    const modelData = this.toModelData();

    // Remove fields that shouldn't be included in create
    const excludeFromCreate = ["id", "createdAt", "updatedAt", "deletedAt"];
    excludeFromCreate.forEach((field) => {
      delete modelData[field];
    });

    return modelData;
  }

  /**
   * Convert to model update data
   */
  public toUpdateData(): any {
    const modelData = this.toModelData();

    // Remove fields that shouldn't be included in update
    const excludeFromUpdate = ["id", "createdAt", "updatedAt", "deletedAt"];
    excludeFromUpdate.forEach((field) => {
      delete modelData[field];
    });

    return modelData;
  }

  /**
   * Create a copy of the DTO
   */
  public clone(): BaseDTO<T> {
    const ClonedClass = this.constructor as new (data?: T) => BaseDTO<T>;
    return new ClonedClass(JSON.parse(JSON.stringify(this.data)));
  }

  /**
   * Merge with another DTO or data object
   */
  public merge(other: BaseDTO<T> | Partial<T>): void {
    if (other instanceof BaseDTO) {
      this.data = { ...this.data, ...other.getData() };
    } else {
      this.data = { ...this.data, ...other };
    }
  }

  /**
   * Check if DTO has changes from original model
   */
  public hasChanges(): boolean {
    if (!this.originalData) return true;

    const currentData = JSON.stringify(this.toModelData());
    const originalData = JSON.stringify(this.originalData.toJSON());

    return currentData !== originalData;
  }

  /**
   * Get list of changed fields
   */
  public getChangedFields(): string[] {
    if (!this.originalData) return Object.keys(this.data as any);

    const changedFields: string[] = [];
    const currentData = this.toModelData();
    const originalData = this.originalData.toJSON();

    Object.keys(currentData).forEach((key) => {
      if (
        JSON.stringify(currentData[key]) !== JSON.stringify(originalData[key])
      ) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  /**
   * Convert dates to specified timezone
   */
  protected convertDateToTimezone(
    date: Date | string,
    timezone?: string,
  ): string {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (timezone) {
      return dateObj.toLocaleString("en-US", { timeZone: timezone });
    }

    return dateObj.toISOString();
  }

  /**
   * Mask sensitive field value
   */
  protected maskSensitiveField(value: any): string {
    if (!value) return "";

    const strValue = String(value);
    if (strValue.length <= 4) {
      return "*".repeat(strValue.length);
    }

    return `${strValue.substring(0, 2)}${"*".repeat(strValue.length - 4)}${strValue.substring(strValue.length - 2)}`;
  }

  /**
   * Format currency value
   */
  protected formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  /**
   * Format percentage value
   */
  protected formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Sanitize string input
   */
  protected sanitizeString(input: string): string {
    if (!input) return "";

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  protected isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }

  /**
   * Static method to create DTO from model
   */
  public static fromModel<T extends BaseDTO>(
    this: new (data?: any, options?: DTOTransformOptions) => T,
    model: Model,
    options?: DTOTransformOptions,
  ): T {
    return new this(model, options);
  }

  /**
   * Static method to create DTO from array of models
   */
  public static fromModels<T extends BaseDTO>(
    this: new (data?: any, options?: DTOTransformOptions) => T,
    models: Model[],
    options?: DTOTransformOptions,
  ): T[] {
    return models.map((model) => new this(model, options));
  }

  /**
   * Static method to validate array of DTOs
   */
  public static validateAll<T extends BaseDTO>(dtos: T[]): DTOValidationResult {
    const allErrors: any[] = [];
    let isValid = true;

    dtos.forEach((dto, index) => {
      const result = dto.validate();
      if (!result.isValid) {
        isValid = false;
        result.errors.forEach((error) => {
          allErrors.push({
            ...error,
            index,
            field: `[${index}].${error.field}`,
          });
        });
      }
    });

    return {
      isValid,
      errors: allErrors,
    };
  }
}

export default BaseDTO;
