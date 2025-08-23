/**
 * ============================================================================
 * ENCRYPTED FIELDS SCHEMA OPTIMIZER
 * ============================================================================
 *
 * Advanced schema optimization specifically designed for encrypted database
 * fields performance and security. Optimizes indexes, storage, and queries.
 *
 * MESH COORDINATION SESSION: COORD-PROD-FIXES-MESH-20250820-001
 * 
 * COORDINATION WITH:
 * - Security Agent: Encrypted field security requirements and validation
 * - Performance-Optimization-Specialist: Query optimization and indexing strategies
 * - System-Architecture-Lead: Schema design patterns and storage optimization
 *
 * Created by: Database-Architect (Mesh Coordination)
 * Enhanced for: MFA Encryption + Performance Optimization
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import { QueryTypes, type Sequelize } from "sequelize";
import { database } from "@/config/database";
import { logger } from "@/utils/logger";
import { isEncrypted, decryptDatabaseField } from "@/utils/encryption";

/**
 * Encrypted field configuration interface
 */
export interface EncryptedFieldConfig {
  table: string;
  schema?: string;
  field: string;
  fieldType: 'TEXT' | 'JSONB' | 'BYTEA';
  indexType?: 'btree' | 'gin' | 'gist' | 'hash';
  searchable: boolean;
  partialIndex?: string; // WHERE clause for partial indexes
  compressionEnabled?: boolean;
  encryptionFormat: 'aes-gcm-json' | 'legacy';
}

/**
 * Encrypted fields registry for the waste management system
 */
export const ENCRYPTED_FIELDS_REGISTRY: EncryptedFieldConfig[] = [
  {
    table: 'users',
    schema: 'core',
    field: 'mfa_secret',
    fieldType: 'TEXT',
    indexType: 'btree',
    searchable: false, // MFA secrets should never be searched
    partialIndex: 'WHERE mfa_enabled = true AND mfa_secret IS NOT NULL',
    compressionEnabled: false, // Encryption already compresses
    encryptionFormat: 'aes-gcm-json'
  },
  // Future encrypted fields can be added here
  {
    table: 'user_security',
    schema: 'security', 
    field: 'backup_codes',
    fieldType: 'TEXT',
    indexType: 'gin',
    searchable: false,
    partialIndex: 'WHERE backup_codes IS NOT NULL',
    compressionEnabled: false,
    encryptionFormat: 'aes-gcm-json'
  }
];

/**
 * Schema optimization statistics interface
 */
export interface SchemaOptimizationStats {
  fieldName: string;
  tableName: string;
  totalRecords: number;
  encryptedRecords: number;
  encryptionPercentage: number;
  avgEncryptedSize: number;
  avgPlaintextSize?: number;
  indexUsageCount: number;
  queryPerformanceMs: number;
  storageEfficiency: number;
  securityScore: number;
}

/**
 * Encrypted Fields Schema Optimizer class
 */
export class EncryptedFieldsSchemaOptimizer {
  private sequelize: Sequelize;
  private optimizationResults: Map<string, SchemaOptimizationStats> = new Map();

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Run comprehensive schema optimization for all encrypted fields
   */
  async optimizeAllEncryptedFields(): Promise<SchemaOptimizationStats[]> {
    logger.info('Starting comprehensive encrypted fields schema optimization...');
    
    const results: SchemaOptimizationStats[] = [];
    
    for (const fieldConfig of ENCRYPTED_FIELDS_REGISTRY) {
      try {
        logger.info(`Optimizing encrypted field: ${fieldConfig.schema}.${fieldConfig.table}.${fieldConfig.field}`);
        
        const stats = await this.optimizeEncryptedField(fieldConfig);
        results.push(stats);
        this.optimizationResults.set(`${fieldConfig.table}.${fieldConfig.field}`, stats);
        
      } catch (error: unknown) {
        logger.error(`Failed to optimize encrypted field ${fieldConfig.table}.${fieldConfig.field}:`, error);
        
        // Create error stats record
        results.push({
          fieldName: fieldConfig.field,
          tableName: fieldConfig.table,
          totalRecords: 0,
          encryptedRecords: 0,
          encryptionPercentage: 0,
          avgEncryptedSize: 0,
          indexUsageCount: 0,
          queryPerformanceMs: 99999,
          storageEfficiency: 0,
          securityScore: 0
        });
      }
    }
    
    // Log optimization summary
    logger.info('Encrypted fields schema optimization completed', {
      totalFields: results.length,
      avgSecurityScore: results.reduce((sum, r) => sum + r.securityScore, 0) / results.length,
      totalEncryptedRecords: results.reduce((sum, r) => sum + r.encryptedRecords, 0)
    });
    
    return results;
  }

  /**
   * Optimize a specific encrypted field
   */
  async optimizeEncryptedField(fieldConfig: EncryptedFieldConfig): Promise<SchemaOptimizationStats> {
    const fullTableName = fieldConfig.schema ? 
      `${fieldConfig.schema}.${fieldConfig.table}` : 
      fieldConfig.table;
    
    // 1. Analyze field usage and statistics
    const fieldStats = await this.analyzeEncryptedFieldUsage(fieldConfig);
    
    // 2. Optimize indexes for encrypted field
    await this.optimizeEncryptedFieldIndexes(fieldConfig);
    
    // 3. Analyze storage efficiency
    const storageEfficiency = await this.analyzeStorageEfficiency(fieldConfig);
    
    // 4. Measure query performance
    const queryPerformance = await this.measureQueryPerformance(fieldConfig);
    
    // 5. Calculate security score
    const securityScore = await this.calculateSecurityScore(fieldConfig);
    
    const stats: SchemaOptimizationStats = {
      fieldName: fieldConfig.field,
      tableName: fullTableName,
      totalRecords: fieldStats.totalRecords,
      encryptedRecords: fieldStats.encryptedRecords,
      encryptionPercentage: fieldStats.encryptionPercentage,
      avgEncryptedSize: fieldStats.avgEncryptedSize,
      avgPlaintextSize: fieldStats.avgPlaintextSize,
      indexUsageCount: fieldStats.indexUsageCount,
      queryPerformanceMs: queryPerformance,
      storageEfficiency,
      securityScore
    };
    
    logger.info(`Encrypted field optimization completed: ${fullTableName}.${fieldConfig.field}`, stats);
    
    return stats;
  }

  /**
   * Analyze encrypted field usage statistics
   */
  private async analyzeEncryptedFieldUsage(fieldConfig: EncryptedFieldConfig): Promise<{
    totalRecords: number;
    encryptedRecords: number;
    encryptionPercentage: number;
    avgEncryptedSize: number;
    avgPlaintextSize?: number;
    indexUsageCount: number;
  }> {
    const fullTableName = fieldConfig.schema ? 
      `${fieldConfig.schema}.${fieldConfig.table}` : 
      fieldConfig.table;
    
    // Get basic field statistics
    const fieldStatsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(${fieldConfig.field}) as encrypted_records,
        CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(${fieldConfig.field})::DECIMAL / COUNT(*)::DECIMAL * 100)
          ELSE 0
        END as encryption_percentage,
        CASE 
          WHEN COUNT(${fieldConfig.field}) > 0 THEN AVG(LENGTH(${fieldConfig.field}))::INTEGER
          ELSE 0
        END as avg_encrypted_size
      FROM ${fullTableName}
      WHERE deleted_at IS NULL
    `;
    
    const [fieldStatsResult] = await this.sequelize.query(fieldStatsQuery, {
      type: QueryTypes.SELECT
    }) as any[];
    
    // Get index usage statistics
    const indexUsageQuery = `
      SELECT COALESCE(SUM(idx_scan), 0) as index_usage_count
      FROM pg_stat_user_indexes 
      WHERE schemaname = $1 
        AND tablename = $2
        AND indexrelname LIKE '%${fieldConfig.field}%'
    `;
    
    const [indexUsageResult] = await this.sequelize.query(indexUsageQuery, {
      bind: [fieldConfig?.schema || 'public', fieldConfig.table],
      type: QueryTypes.SELECT
    }) as any[];
    
    return {
      totalRecords: parseInt(fieldStatsResult.total_records),
      encryptedRecords: parseInt(fieldStatsResult.encrypted_records),
      encryptionPercentage: parseFloat(fieldStatsResult.encryption_percentage),
      avgEncryptedSize: parseInt(fieldStatsResult.avg_encrypted_size),
      indexUsageCount: parseInt(indexUsageResult?.index_usage_count || 0)
    };
  }

  /**
   * Optimize indexes for encrypted fields
   */
  private async optimizeEncryptedFieldIndexes(fieldConfig: EncryptedFieldConfig): Promise<void> {
    const fullTableName = fieldConfig.schema ? 
      `${fieldConfig.schema}.${fieldConfig.table}` : 
      fieldConfig.table;
    
    const indexName = `idx_${fieldConfig.table}_${fieldConfig.field}_encrypted`;
    
    // Create optimized index for encrypted field
    let indexQuery = '';
    
    if (fieldConfig.searchable && fieldConfig.fieldType === 'JSONB') {
      // GIN index for JSONB searchable encrypted data
      indexQuery = `
        CREATE INDEX IF NOT EXISTS ${indexName}_gin
        ON ${fullTableName} USING GIN ((${fieldConfig.field}::jsonb))
        ${fieldConfig?.partialIndex || ''}
      `;
    } else if (fieldConfig.fieldType === 'TEXT' && !fieldConfig.searchable) {
      // Simple B-tree index for existence checks (most encrypted fields)
      indexQuery = `
        CREATE INDEX IF NOT EXISTS ${indexName}_btree
        ON ${fullTableName} (${fieldConfig.field} IS NOT NULL)
        ${fieldConfig?.partialIndex || ''}
      `;
    } else {
      // Default B-tree index
      indexQuery = `
        CREATE INDEX IF NOT EXISTS ${indexName}_default
        ON ${fullTableName} (${fieldConfig.field})
        ${fieldConfig?.partialIndex || ''}
      `;
    }
    
    if (indexQuery) {
      await this.sequelize.query(indexQuery);
      logger.info(`Created optimized index for encrypted field: ${fullTableName}.${fieldConfig.field}`);
    }

    // Create composite indexes for common query patterns
    if (fieldConfig.field === 'mfa_secret') {
      const compositeIndexQuery = `
        CREATE INDEX IF NOT EXISTS idx_${fieldConfig.table}_mfa_auth_composite
        ON ${fullTableName} (email, mfa_enabled, ${fieldConfig.field} IS NOT NULL)
        WHERE mfa_enabled = true AND deleted_at IS NULL
      `;
      await this.sequelize.query(compositeIndexQuery);
    }
  }

  /**
   * Analyze storage efficiency of encrypted fields
   */
  private async analyzeStorageEfficiency(fieldConfig: EncryptedFieldConfig): Promise<number> {
    const fullTableName = fieldConfig.schema ? 
      `${fieldConfig.schema}.${fieldConfig.table}` : 
      fieldConfig.table;
    
    try {
      // Calculate table size and encrypted field contribution
      const tableSizeQuery = `
        SELECT 
          pg_size_pretty(pg_total_relation_size('${fullTableName}'::regclass)) as table_size,
          pg_total_relation_size('${fullTableName}'::regclass) as table_size_bytes
      `;
      
      const [tableSizeResult] = await this.sequelize.query(tableSizeQuery, {
        type: QueryTypes.SELECT
      }) as any[];
      
      // Estimate encrypted field size contribution
      const fieldSizeQuery = `
        SELECT 
          COUNT(${fieldConfig.field}) as encrypted_count,
          SUM(LENGTH(${fieldConfig.field})) as total_encrypted_size,
          AVG(LENGTH(${fieldConfig.field})) as avg_encrypted_size
        FROM ${fullTableName}
        WHERE ${fieldConfig.field} IS NOT NULL AND deleted_at IS NULL
      `;
      
      const [fieldSizeResult] = await this.sequelize.query(fieldSizeQuery, {
        type: QueryTypes.SELECT
      }) as any[];
      
      const totalTableSize = parseInt(tableSizeResult.table_size_bytes);
      const totalEncryptedSize = parseInt(fieldSizeResult?.total_encrypted_size || 0);
      
      // Calculate efficiency score (lower is better, 0-100)
      const sizeRatio = totalTableSize > 0 ? (totalEncryptedSize / totalTableSize) : 0;
      const efficiency = Math.max(0, Math.min(100, 100 - (sizeRatio * 100)));
      
      return Math.round(efficiency);
      
    } catch (error: unknown) {
      logger.warn(`Failed to analyze storage efficiency for ${fullTableName}.${fieldConfig.field}:`, error);
      return 50; // Default moderate efficiency
    }
  }

  /**
   * Measure query performance for encrypted field operations
   */
  private async measureQueryPerformance(fieldConfig: EncryptedFieldConfig): Promise<number> {
    const fullTableName = fieldConfig.schema ? 
      `${fieldConfig.schema}.${fieldConfig.table}` : 
      fieldConfig.table;
    
    try {
      const startTime = Date.now();
      
      // Test common query patterns for encrypted fields
      const testQuery = `
        SELECT ${fieldConfig.field} IS NOT NULL as has_encrypted_field
        FROM ${fullTableName}
        WHERE ${fieldConfig.field} IS NOT NULL
        AND deleted_at IS NULL
        LIMIT 100
      `;
      
      await this.sequelize.query(testQuery, { type: QueryTypes.SELECT });
      
      const queryTime = Date.now() - startTime;
      
      logger.debug(`Query performance test for ${fullTableName}.${fieldConfig.field}: ${queryTime}ms`);
      
      return queryTime;
      
    } catch (error: unknown) {
      logger.warn(`Failed to measure query performance for ${fullTableName}.${fieldConfig.field}:`, error);
      return 1000; // Default high response time for failed queries
    }
  }

  /**
   * Calculate security score for encrypted field
   */
  private async calculateSecurityScore(fieldConfig: EncryptedFieldConfig): Promise<number> {
    let score = 0;
    
    // Base score for encryption enabled
    score += 30;
    
    // Encryption format quality
    if (fieldConfig.encryptionFormat === 'aes-gcm-json') {
      score += 25; // Modern authenticated encryption
    } else {
      score += 10; // Legacy encryption
    }
    
    // Non-searchable fields are more secure
    if (!fieldConfig.searchable) {
      score += 20;
    } else {
      score += 5; // Searchable but necessary
    }
    
    // Index optimization
    if (fieldConfig.partialIndex) {
      score += 10; // Partial indexes reduce attack surface
    } else {
      score += 5;
    }
    
    // Field type security
    if (fieldConfig.fieldType === 'TEXT') {
      score += 10; // Simple and secure
    } else if (fieldConfig.fieldType === 'JSONB') {
      score += 5; // More complex but structured
    }
    
    // Maximum score is 100
    return Math.min(100, score);
  }

  /**
   * Get comprehensive optimization report
   */
  async getOptimizationReport(): Promise<{
    summary: {
      totalFields: number;
      totalEncryptedRecords: number;
      avgSecurityScore: number;
      avgQueryPerformance: number;
      overallHealthScore: number;
    };
    fieldDetails: SchemaOptimizationStats[];
    recommendations: string[];
  }> {
    const results = Array.from(this.optimizationResults.values());
    
    if (results.length === 0) {
      throw new Error('No optimization results available. Run optimizeAllEncryptedFields() first.');
    }
    
    const summary = {
      totalFields: results.length,
      totalEncryptedRecords: results.reduce((sum, r) => sum + r.encryptedRecords, 0),
      avgSecurityScore: Math.round(results.reduce((sum, r) => sum + r.securityScore, 0) / results.length),
      avgQueryPerformance: Math.round(results.reduce((sum, r) => sum + r.queryPerformanceMs, 0) / results.length),
      overallHealthScore: 0
    };
    
    // Calculate overall health score
    const securityWeight = 0.4;
    const performanceWeight = 0.3;
    const efficiencyWeight = 0.3;
    
    const avgEfficiency = results.reduce((sum, r) => sum + r.storageEfficiency, 0) / results.length;
    const performanceScore = Math.max(0, 100 - (summary.avgQueryPerformance / 10)); // Lower ms = higher score
    
    summary.overallHealthScore = Math.round(
      (summary.avgSecurityScore * securityWeight) +
      (performanceScore * performanceWeight) +
      (avgEfficiency * efficiencyWeight)
    );
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (summary.avgSecurityScore < 80) {
      recommendations.push('Consider upgrading encryption format to AES-256-GCM for better security');
    }
    
    if (summary.avgQueryPerformance > 500) {
      recommendations.push('Query performance needs optimization - consider index tuning');
    }
    
    if (avgEfficiency < 70) {
      recommendations.push('Storage efficiency could be improved - consider field compression or archiving');
    }
    
    results.forEach(result => {
      if (result.encryptionPercentage < 95 && result.encryptionPercentage > 0) {
        recommendations.push(`${result.tableName}.${result.fieldName}: Complete encryption migration (${result.encryptionPercentage}% encrypted)`);
      }
    });
    
    return {
      summary,
      fieldDetails: results,
      recommendations
    };
  }

  /**
   * Validate encryption integrity across all fields
   */
  async validateEncryptionIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    summary: Record<string, any>;
  }> {
    const issues: string[] = [];
    const summary: Record<string, any> = {};
    
    for (const fieldConfig of ENCRYPTED_FIELDS_REGISTRY) {
      const fullTableName = fieldConfig.schema ? 
        `${fieldConfig.schema}.${fieldConfig.table}` : 
        fieldConfig.table;
      
      try {
        // Check for unencrypted data that should be encrypted
        const unencryptedQuery = `
          SELECT COUNT(*) as unencrypted_count
          FROM ${fullTableName}
          WHERE ${fieldConfig.field} IS NOT NULL
            AND ${fieldConfig.field} != ''
            AND LENGTH(${fieldConfig.field}) < 100
            AND deleted_at IS NULL
        `;
        
        const [unencryptedResult] = await this.sequelize.query(unencryptedQuery, {
          type: QueryTypes.SELECT
        }) as any[];
        
        const unencryptedCount = parseInt(unencryptedResult.unencrypted_count);
        
        if (unencryptedCount > 0) {
          issues.push(`${fullTableName}.${fieldConfig.field}: ${unencryptedCount} potentially unencrypted records found`);
        }
        
        summary[`${fullTableName}.${fieldConfig.field}`] = {
          potentiallyUnencrypted: unencryptedCount,
          validated: true
        };
        
      } catch (error: unknown) {
        issues.push(`${fullTableName}.${fieldConfig.field}: Validation failed - ${error instanceof Error ? error?.message : String(error)}`);
        summary[`${fullTableName}.${fieldConfig.field}`] = {
          validated: false,
          error: error instanceof Error ? error?.message : String(error)
        };
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      summary
    };
  }
}

/**
 * Export utility functions
 */

/**
 * Create and run encrypted fields optimizer
 */
export async function optimizeEncryptedFieldsSchema(): Promise<SchemaOptimizationStats[]> {
  const optimizer = new EncryptedFieldsSchemaOptimizer(database);
  return await optimizer.optimizeAllEncryptedFields();
}

/**
 * Validate all encrypted fields integrity
 */
export async function validateAllEncryptedFields(): Promise<{
  valid: boolean;
  issues: string[];
  summary: Record<string, any>;
}> {
  const optimizer = new EncryptedFieldsSchemaOptimizer(database);
  return await optimizer.validateEncryptionIntegrity();
}

/**
 * Get comprehensive encrypted fields report
 */
export async function getEncryptedFieldsReport(): Promise<any> {
  const optimizer = new EncryptedFieldsSchemaOptimizer(database);
  await optimizer.optimizeAllEncryptedFields();
  return await optimizer.getOptimizationReport();
}

export default {
  EncryptedFieldsSchemaOptimizer,
  ENCRYPTED_FIELDS_REGISTRY,
  optimizeEncryptedFieldsSchema,
  validateAllEncryptedFields,
  getEncryptedFieldsReport
};