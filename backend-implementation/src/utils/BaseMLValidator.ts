/**
 * ============================================================================
 * BASE ML VALIDATOR - PHASE 3 INTEGRATION ENHANCEMENT
 * ============================================================================
 *
 * Standardized validation utility for ML operations, ensuring consistent
 * validation patterns across all machine learning services and enhancing
 * BaseService pattern compliance.
 *
 * Features:
 * - Training data validation with quality checks
 * - Prediction input validation and sanitization
 * - Model output validation and confidence thresholds
 * - Business logic constraints validation
 * - Performance and resource usage validation
 * - Error handling with specific ML error types
 *
 * Phase 3 Integration Enhancement
 * Created by: Backend API Engine SPOKE AGENT
 * Hub Authority: Innovation-Architect
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import { logger } from '@/utils/logger';
import { ValidationError } from '@/middleware/errorHandler';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  metadata?: Record<string, any>;
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  completeness: number; // Percentage of non-null values
  uniqueness: number; // Percentage of unique values
  consistency: number; // Data format consistency score
  outliers: number; // Number of outliers detected
  duplicates: number; // Number of duplicate records
}

/**
 * ML validation error types
 */
export class MLValidationError extends Error {
  public readonly code: string;
  public readonly severity: 'warning' | 'error' | 'critical';
  public readonly metadata?: Record<string, any>;

  constructor(message: string, code: string, severity: 'warning' | 'error' | 'critical' = 'error', metadata?: Record<string, any>) {
    super(message);
    this.name = 'MLValidationError';
    this.code = code;
    this.severity = severity;
    this.metadata = metadata;
  }
}

/**
 * Base ML Validator Class
 */
export class BaseMLValidator {
  
  /**
   * Validate training data for ML models
   */
  public static validateTrainingData(data: any[], config?: {
    minRecords?: number;
    maxRecords?: number;
    requiredFields?: string[];
    dateField?: string;
    targetField?: string;
    allowNulls?: boolean;
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      // Basic structure validation
      if (!Array.isArray(data)) {
        errors.push(new MLValidationError('Training data must be an array', 'INVALID_DATA_STRUCTURE', 'critical'));
        return { isValid: false, errors, warnings, metadata };
      }

      if (data.length === 0) {
        errors.push(new MLValidationError('Training data cannot be empty', 'EMPTY_DATASET', 'critical'));
        return { isValid: false, errors, warnings, metadata };
      }

      // Size validation
      const minRecords = config?.minRecords || 10;
      const maxRecords = config?.maxRecords || 100000;

      if (data.length < minRecords) {
        errors.push(new MLValidationError(
          `Insufficient training data. Minimum ${minRecords} records required, got ${data.length}`,
          'INSUFFICIENT_DATA',
          'error',
          { required: minRecords, actual: data.length }
        ));
      }

      if (data.length > maxRecords) {
        warnings.push(`Large dataset detected (${data.length} records). Consider sampling for better performance.`);
      }

      // Field validation
      if (config?.requiredFields) {
        const firstRecord = data[0];
        const missingFields = config.requiredFields.filter(field => !(field in firstRecord));
        
        if (missingFields.length > 0) {
          errors.push(new MLValidationError(
            `Missing required fields: ${missingFields.join(', ')}`,
            'MISSING_REQUIRED_FIELDS',
            'critical',
            { missingFields }
          ));
        }
      }

      // Data quality assessment
      const qualityMetrics = this.assessDataQuality(data, config);
      metadata.dataQuality = qualityMetrics;

      // Quality thresholds
      if (qualityMetrics.completeness < 0.8) {
        warnings.push(`Low data completeness: ${(qualityMetrics.completeness * 100).toFixed(1)}%. Consider data cleaning.`);
      }

      if (qualityMetrics.outliers > data.length * 0.1) {
        warnings.push(`High number of outliers detected: ${qualityMetrics.outliers}. Consider outlier treatment.`);
      }

      // Date field validation (for time series)
      if (config?.dateField) {
        const dateErrors = this.validateDateField(data, config.dateField);
        errors.push(...dateErrors);
      }

      // Target field validation
      if (config?.targetField) {
        const targetErrors = this.validateTargetField(data, config.targetField);
        errors.push(...targetErrors);
      }

      metadata.recordCount = data.length;
      metadata.validationTimestamp = new Date().toISOString();

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata
      };

    } catch (error: unknown) {
      logger.error('Training data validation failed', { error: error instanceof Error ? error?.message : String(error) });
      errors.push(new MLValidationError(
        'Validation process failed: ' + error instanceof Error ? error?.message : String(error),
        'VALIDATION_PROCESS_ERROR',
        'critical'
      ));
      
      return { isValid: false, errors, warnings, metadata };
    }
  }

  /**
   * Validate prediction input data
   */
  public static validatePredictionInput(input: any, config?: {
    requiredFields?: string[];
    allowedTypes?: Record<string, string>;
    valueRanges?: Record<string, { min?: number; max?: number }>;
    maxBatchSize?: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      // Handle batch vs single predictions
      const isBatch = Array.isArray(input);
      const inputs = isBatch ? input : [input];
      const maxBatchSize = config?.maxBatchSize || 1000;

      if (isBatch && inputs.length > maxBatchSize) {
        errors.push(new MLValidationError(
          `Batch size exceeds maximum limit: ${inputs.length} > ${maxBatchSize}`,
          'BATCH_SIZE_EXCEEDED',
          'error',
          { batchSize: inputs.length, maxAllowed: maxBatchSize }
        ));
      }

      // Validate each input
      inputs.forEach((inputItem, index) => {
        // Required fields check
        if (config?.requiredFields) {
          const missingFields = config.requiredFields.filter(field => !(field in inputItem));
          if (missingFields.length > 0) {
            errors.push(new MLValidationError(
              `Missing required fields in input ${index}: ${missingFields.join(', ')}`,
              'MISSING_INPUT_FIELDS',
              'error',
              { index, missingFields }
            ));
          }
        }

        // Type validation
        if (config?.allowedTypes) {
          Object.entries(config.allowedTypes).forEach(([field, expectedType]) => {
            if (field in inputItem) {
              const actualType = typeof inputItem[field];
              if (actualType !== expectedType) {
                errors.push(new MLValidationError(
                  `Invalid type for field '${field}' in input ${index}: expected ${expectedType}, got ${actualType}`,
                  'INVALID_FIELD_TYPE',
                  'error',
                  { index, field, expected: expectedType, actual: actualType }
                ));
              }
            }
          });
        }

        // Value range validation
        if (config?.valueRanges) {
          Object.entries(config.valueRanges).forEach(([field, range]) => {
            if (field in inputItem && typeof inputItem[field] === 'number') {
              const value = inputItem[field];
              if (range.min !== undefined && value < range.min) {
                errors.push(new MLValidationError(
                  `Value for field '${field}' in input ${index} below minimum: ${value} < ${range.min}`,
                  'VALUE_BELOW_MINIMUM',
                  'error',
                  { index, field, value, minimum: range.min }
                ));
              }
              if (range.max !== undefined && value > range.max) {
                errors.push(new MLValidationError(
                  `Value for field '${field}' in input ${index} above maximum: ${value} > ${range.max}`,
                  'VALUE_ABOVE_MAXIMUM',
                  'error',
                  { index, field, value, maximum: range.max }
                ));
              }
            }
          });
        }
      });

      metadata.inputCount = inputs.length;
      metadata.isBatch = isBatch;
      metadata.validationTimestamp = new Date().toISOString();

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata
      };

    } catch (error: unknown) {
      logger.error('Prediction input validation failed', { error: error instanceof Error ? error?.message : String(error) });
      errors.push(new MLValidationError(
        'Input validation process failed: ' + error instanceof Error ? error?.message : String(error),
        'INPUT_VALIDATION_ERROR',
        'critical'
      ));
      
      return { isValid: false, errors, warnings, metadata };
    }
  }

  /**
   * Validate model output/predictions
   */
  public static validateModelOutput(output: any, config?: {
    requiredFields?: string[];
    confidenceThreshold?: number;
    outputType?: 'classification' | 'regression' | 'forecast';
    allowedClasses?: string[];
    valueRanges?: Record<string, { min?: number; max?: number }>;
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      if (!output) {
        errors.push(new MLValidationError('Model output is null or undefined', 'NULL_OUTPUT', 'critical'));
        return { isValid: false, errors, warnings, metadata };
      }

      // Handle array outputs (batch predictions)
      const outputs = Array.isArray(output) ? output : [output];

      outputs.forEach((outputItem, index) => {
        // Required fields validation
        if (config?.requiredFields) {
          const missingFields = config.requiredFields.filter(field => !(field in outputItem));
          if (missingFields.length > 0) {
            errors.push(new MLValidationError(
              `Missing required fields in output ${index}: ${missingFields.join(', ')}`,
              'MISSING_OUTPUT_FIELDS',
              'error',
              { index, missingFields }
            ));
          }
        }

        // Confidence threshold validation
        if (config?.confidenceThreshold && 'confidence' in outputItem) {
          const confidence = outputItem.confidence;
          if (typeof confidence === 'number' && confidence < config.confidenceThreshold) {
            warnings.push(`Low confidence prediction at index ${index}: ${confidence} < ${config.confidenceThreshold}`);
          }
        }

        // Output type specific validation
        if (config?.outputType === 'classification' && config.allowedClasses) {
          const prediction = outputItem?.prediction || outputItem.class;
          if (prediction && !config.allowedClasses.includes(prediction)) {
            errors.push(new MLValidationError(
              `Invalid class prediction at index ${index}: ${prediction}`,
              'INVALID_CLASS_PREDICTION',
              'error',
              { index, prediction, allowedClasses: config.allowedClasses }
            ));
          }
        }

        // Value range validation for regression/forecast
        if (config?.valueRanges) {
          Object.entries(config.valueRanges).forEach(([field, range]) => {
            if (field in outputItem && typeof outputItem[field] === 'number') {
              const value = outputItem[field];
              if (range.min !== undefined && value < range.min) {
                warnings.push(`Output value for '${field}' at index ${index} below expected minimum: ${value} < ${range.min}`);
              }
              if (range.max !== undefined && value > range.max) {
                warnings.push(`Output value for '${field}' at index ${index} above expected maximum: ${value} > ${range.max}`);
              }
            }
          });
        }
      });

      metadata.outputCount = outputs.length;
      metadata.validationTimestamp = new Date().toISOString();

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : String(error);
      logger.error('Model output validation failed', { error: errorMessage });
      errors.push(new MLValidationError(
        'Output validation process failed: ' + errorMessage,
        'OUTPUT_VALIDATION_ERROR',
        'critical'
      ));
      
      return { isValid: false, errors, warnings, metadata };
    }
  }

  /**
   * Assess data quality metrics
   */
  private static assessDataQuality(data: any[], config?: any): DataQualityMetrics {
    const totalRecords = data.length;
    let totalFields = 0;
    let nullFields = 0;
    let outliers = 0;
    
    // Get all unique field names
    const allFields = new Set<string>();
    data.forEach(record => {
      Object.keys(record).forEach(key => allFields.add(key));
    });

    // Count nulls and assess completeness
    data.forEach(record => {
      allFields.forEach(field => {
        totalFields++;
        if (record[field] === null || record[field] === undefined || record[field] === '') {
          nullFields++;
        }
      });
    });

    const completeness = totalFields > 0 ? (totalFields - nullFields) / totalFields : 0;

    // Simple outlier detection for numeric fields (using IQR method)
    allFields.forEach(field => {
      const numericValues = data
        .map(record => record[field])
        .filter(value => typeof value === 'number' && !isNaN(value))
        .sort((a, b) => a - b);

      if (numericValues.length > 4) {
        const q1Index = Math.floor(numericValues.length * 0.25);
        const q3Index = Math.floor(numericValues.length * 0.75);
        const q1 = numericValues[q1Index];
        const q3 = numericValues[q3Index];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        numericValues.forEach(value => {
          if (value < lowerBound || value > upperBound) {
            outliers++;
          }
        });
      }
    });

    // Simple duplicate detection (exact matches)
    const uniqueRecords = new Set(data.map(record => JSON.stringify(record)));
    const duplicates = totalRecords - uniqueRecords.size;

    // Calculate uniqueness and consistency scores
    const uniqueness = totalRecords > 0 ? uniqueRecords.size / totalRecords : 0;
    const consistency = 0.9; // Simplified consistency score

    return {
      completeness,
      uniqueness,
      consistency,
      outliers,
      duplicates
    };
  }

  /**
   * Validate date field for time series data
   */
  private static validateDateField(data: any[], dateField: string): MLValidationError[] {
    const errors: MLValidationError[] = [];
    
    try {
      const dates = data.map(record => record[dateField]).filter(date => date);
      
      if (dates.length !== data.length) {
        errors.push(new MLValidationError(
          `Missing date values in field '${dateField}'`,
          'MISSING_DATE_VALUES',
          'error'
        ));
      }

      // Check date format consistency
      const invalidDates = dates.filter(date => isNaN(new Date(date).getTime()));
      if (invalidDates.length > 0) {
        errors.push(new MLValidationError(
          `Invalid date format detected in field '${dateField}': ${invalidDates.length} invalid dates`,
          'INVALID_DATE_FORMAT',
          'error',
          { invalidCount: invalidDates.length }
        ));
      }

      // Check for chronological order (time series requirement)
      const sortedDates = [...dates].sort();
      const isChronological = dates.every((date, index) => index === 0 || new Date(date) >= new Date(dates[index - 1]));
      
      if (!isChronological) {
        errors.push(new MLValidationError(
          `Date field '${dateField}' is not in chronological order`,
          'NON_CHRONOLOGICAL_DATES',
          'warning'
        ));
      }

    } catch (error: unknown) {
      errors.push(new MLValidationError(
        `Date field validation failed: ${error instanceof Error ? error?.message : String(error)}`,
        'DATE_VALIDATION_ERROR',
        'error'
      ));
    }

    return errors;
  }

  /**
   * Validate target field for supervised learning
   */
  private static validateTargetField(data: any[], targetField: string): MLValidationError[] {
    const errors: MLValidationError[] = [];
    
    try {
      const targets = data.map(record => record[targetField]).filter(target => target !== undefined && target !== null);
      
      if (targets.length !== data.length) {
        errors.push(new MLValidationError(
          `Missing target values in field '${targetField}'`,
          'MISSING_TARGET_VALUES',
          'error',
          { missingCount: data.length - targets.length }
        ));
      }

      // Check target data type consistency
      const targetTypes = [...new Set(targets.map(target => typeof target))];
      if (targetTypes.length > 1) {
        errors.push(new MLValidationError(
          `Inconsistent target data types in field '${targetField}': ${targetTypes.join(', ')}`,
          'INCONSISTENT_TARGET_TYPES',
          'error',
          { types: targetTypes }
        ));
      }

      // For numeric targets, check for reasonable distribution
      if (targetTypes.includes('number')) {
        const numericTargets = targets.filter(target => typeof target === 'number');
        const uniqueValues = new Set(numericTargets);
        
        if (uniqueValues.size === 1) {
          errors.push(new MLValidationError(
            `Target field '${targetField}' has no variance (all values are the same)`,
            'NO_TARGET_VARIANCE',
            'error'
          ));
        }
      }

    } catch (error: unknown) {
      errors.push(new MLValidationError(
        `Target field validation failed: ${error instanceof Error ? error?.message : String(error)}`,
        'TARGET_VALIDATION_ERROR',
        'error'
      ));
    }

    return errors;
  }
}

export default BaseMLValidator;