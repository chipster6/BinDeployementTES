/**
 * ============================================================================
 * PRODUCTION-SAFE MIGRATION VALIDATION FRAMEWORK
 * ============================================================================
 *
 * Comprehensive validation system for database migrations ensuring production
 * safety, data integrity, and performance compliance before execution.
 *
 * Features:
 * - Schema validation and compatibility checks
 * - Performance impact analysis and connection pool monitoring
 * - Data integrity validation and constraint verification
 * - PostGIS spatial data validation
 * - AI/ML database enhancement validation
 * - Rollback strategy validation
 * - Zero-downtime deployment compatibility
 *
 * Created by: Database-Architect
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { sequelize } from '@/config/database';
import { logger } from '@/utils/logger';
import type { QueryTypes, Transaction } from 'sequelize';
import { databasePerformanceMonitor } from './performance-monitor';
import fs from 'fs/promises';
import path from 'path';

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Validation category enumeration
 */
export enum ValidationCategory {
  SCHEMA = 'schema',
  PERFORMANCE = 'performance',
  DATA_INTEGRITY = 'data_integrity',
  SECURITY = 'security',
  SPATIAL = 'spatial',
  AI_ML = 'ai_ml',
  ROLLBACK = 'rollback',
  COMPATIBILITY = 'compatibility',
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  category: ValidationCategory;
  testName: string;
  severity: ValidationSeverity;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: any;
  recommendations?: string[];
  executionTime: number;
  timestamp: Date;
}

/**
 * Migration analysis result
 */
export interface MigrationAnalysis {
  migrationId: string;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  riskScore: number;
  requiresDowntime: boolean;
  impactedTables: string[];
  impactedIndexes: string[];
  connectionPoolImpact: number;
  dataVolumeImpact: number;
  rollbackComplexity: 'simple' | 'complex' | 'impossible';
  validationResults: ValidationResult[];
}

/**
 * Production-Safe Migration Validator
 */
export class MigrationValidator {
  private static instance: MigrationValidator;
  
  private constructor() {}

  public static getInstance(): MigrationValidator {
    if (!MigrationValidator.instance) {
      MigrationValidator.instance = new MigrationValidator();
    }
    return MigrationValidator.instance;
  }

  /**
   * Validate migration file comprehensively
   */
  public async validateMigration(
    migrationId: string,
    migrationContent: string,
    migrationPath: string
  ): Promise<MigrationAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting comprehensive validation for migration: ${migrationId}`);
      
      const validationResults: ValidationResult[] = [];
      
      // Schema validation
      validationResults.push(...await this.validateSchema(migrationContent));
      
      // Performance validation
      validationResults.push(...await this.validatePerformance(migrationContent));
      
      // Data integrity validation
      validationResults.push(...await this.validateDataIntegrity(migrationContent));
      
      // Security validation
      validationResults.push(...await this.validateSecurity(migrationContent));
      
      // Spatial data validation (if PostGIS operations detected)
      if (this.containsSpatialOperations(migrationContent)) {
        validationResults.push(...await this.validateSpatialOperations(migrationContent));
      }
      
      // AI/ML validation (if AI/ML operations detected)
      if (this.containsAIMLOperations(migrationContent)) {
        validationResults.push(...await this.validateAIMLOperations(migrationContent));
      }
      
      // Rollback validation
      validationResults.push(...await this.validateRollbackStrategy(migrationPath));
      
      // Compatibility validation
      validationResults.push(...await this.validateCompatibility(migrationContent));
      
      // Analyze migration complexity and risk
      const analysis = await this.analyzeMigrationComplexity(migrationId, migrationContent, validationResults);
      
      const executionTime = Date.now() - startTime;
      logger.info(`Migration validation completed in ${executionTime}ms. Risk score: ${analysis.riskScore}`);
      
      return analysis;
      
    } catch (error: unknown) {
      logger.error(`Migration validation failed for ${migrationId}:`, error);
      throw error;
    }
  }

  /**
   * Schema validation - verify schema changes are safe
   */
  private async validateSchema(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for dangerous operations
      const dangerousOperations = [
        { pattern: /DROP\s+TABLE\s+(?!IF\s+EXISTS)/i, message: 'DROP TABLE without IF EXISTS is dangerous' },
        { pattern: /DROP\s+COLUMN\s+/i, message: 'DROP COLUMN operations can cause data loss' },
        { pattern: /ALTER\s+COLUMN\s+.*NOT\s+NULL/i, message: 'Adding NOT NULL constraint requires careful handling' },
        { pattern: /TRUNCATE\s+TABLE/i, message: 'TRUNCATE operations cause irreversible data loss' },
        { pattern: /DELETE\s+FROM\s+.*WHERE\s+1\s*=\s*1/i, message: 'Mass DELETE operations are dangerous' },
      ];
      
      for (const op of dangerousOperations) {
        if (op.pattern.test(migrationContent)) {
          results.push({
            category: ValidationCategory.SCHEMA,
            testName: 'dangerous_operation_check',
            severity: ValidationSeverity.ERROR,
            status: 'failed',
            message: op?.message,
            recommendations: ['Add proper WHERE clauses', 'Use IF EXISTS for DROP operations', 'Consider safer alternatives'],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }
      }
      
      // Check for missing indexes on foreign keys
      const foreignKeyPattern = /FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)/gi;
      let match;
      while ((match = foreignKeyPattern.exec(migrationContent)) !== null) {
        const columnName = match[1];
        if (!migrationContent.includes(`INDEX`) || !migrationContent.includes(columnName)) {
          results.push({
            category: ValidationCategory.SCHEMA,
            testName: 'foreign_key_index_check',
            severity: ValidationSeverity.WARNING,
            status: 'warning',
            message: `Foreign key column '${columnName}' may need an index for performance`,
            recommendations: [`Add index on column '${columnName}'`],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }
      }
      
      // Validate table naming conventions
      const tableNamePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
      while ((match = tableNamePattern.exec(migrationContent)) !== null) {
        const tableName = match[1];
        if (!tableName.match(/^[a-z][a-z0-9_]*$/)) {
          results.push({
            category: ValidationCategory.SCHEMA,
            testName: 'naming_convention_check',
            severity: ValidationSeverity.WARNING,
            status: 'warning',
            message: `Table name '${tableName}' doesn't follow naming conventions`,
            recommendations: ['Use lowercase with underscores', 'Start with letter', 'Use descriptive names'],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }
      }
      
      // Check for proper primary keys
      if (migrationContent.includes('CREATE TABLE') && !migrationContent.includes('PRIMARY KEY')) {
        results.push({
          category: ValidationCategory.SCHEMA,
          testName: 'primary_key_check',
          severity: ValidationSeverity.ERROR,
          status: 'failed',
          message: 'Tables should have primary keys',
          recommendations: ['Add UUID or auto-incrementing primary key', 'Ensure proper indexing'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // If no issues found, add success result
      if (results.length === 0) {
        results.push({
          category: ValidationCategory.SCHEMA,
          testName: 'schema_validation',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Schema validation passed - no issues detected',
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.SCHEMA,
        testName: 'schema_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Schema validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Performance validation - analyze performance impact
   */
  private async validatePerformance(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for operations that lock tables
      const lockingOperations = [
        { pattern: /ALTER\s+TABLE\s+.*ADD\s+COLUMN.*NOT\s+NULL/i, impact: 'high', message: 'Adding NOT NULL column requires table lock' },
        { pattern: /CREATE\s+INDEX\s+(?!CONCURRENTLY)/i, impact: 'medium', message: 'Creating index without CONCURRENTLY may lock table' },
        { pattern: /ALTER\s+TABLE\s+.*ADD\s+CONSTRAINT/i, impact: 'medium', message: 'Adding constraints may require table lock' },
        { pattern: /VACUUM\s+FULL/i, impact: 'high', message: 'VACUUM FULL requires exclusive lock' },
      ];
      
      for (const op of lockingOperations) {
        if (op.pattern.test(migrationContent)) {
          results.push({
            category: ValidationCategory.PERFORMANCE,
            testName: 'table_locking_check',
            severity: op.impact === 'high' ? ValidationSeverity.ERROR : ValidationSeverity.WARNING,
            status: op.impact === 'high' ? 'failed' : 'warning',
            message: op?.message,
            recommendations: ['Consider using CONCURRENTLY for index creation', 'Plan maintenance window for locking operations'],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }
      }
      
      // Check for missing WHERE clauses in UPDATE/DELETE
      const massOperationPattern = /(UPDATE|DELETE)\s+.*(?!WHERE)/i;
      if (massOperationPattern.test(migrationContent) && !migrationContent.includes('WHERE')) {
        results.push({
          category: ValidationCategory.PERFORMANCE,
          testName: 'mass_operation_check',
          severity: ValidationSeverity.ERROR,
          status: 'failed',
          message: 'Mass UPDATE/DELETE operations without WHERE clause detected',
          recommendations: ['Add appropriate WHERE clauses', 'Consider batch processing for large datasets'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Get current connection pool status
      const poolStats = await databasePerformanceMonitor.getConnectionPoolStats();
      if (poolStats.utilization > 80) {
        results.push({
          category: ValidationCategory.PERFORMANCE,
          testName: 'connection_pool_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: `High connection pool utilization: ${poolStats.utilization}%`,
          details: { poolStats },
          recommendations: ['Consider running migration during low traffic', 'Monitor connection pool during migration'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Success case
      if (results.length === 0) {
        results.push({
          category: ValidationCategory.PERFORMANCE,
          testName: 'performance_validation',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Performance validation passed - no blocking issues detected',
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.PERFORMANCE,
        testName: 'performance_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Performance validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Data integrity validation
   */
  private async validateDataIntegrity(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for foreign key constraints
      if (migrationContent.includes('FOREIGN KEY')) {
        results.push({
          category: ValidationCategory.DATA_INTEGRITY,
          testName: 'foreign_key_validation',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Foreign key constraints detected - good for data integrity',
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Check for check constraints
      if (migrationContent.includes('CHECK (')) {
        results.push({
          category: ValidationCategory.DATA_INTEGRITY,
          testName: 'check_constraint_validation',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Check constraints detected - good for data validation',
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Check for potential data loss operations
      const dataLossPatterns = [
        /DROP\s+COLUMN/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM/i,
        /ALTER\s+COLUMN\s+.*TYPE/i,
      ];
      
      for (const pattern of dataLossPatterns) {
        if (pattern.test(migrationContent)) {
          results.push({
            category: ValidationCategory.DATA_INTEGRITY,
            testName: 'data_loss_check',
            severity: ValidationSeverity.WARNING,
            status: 'warning',
            message: 'Operation may cause data loss - ensure backup is created',
            recommendations: ['Verify backup exists', 'Test rollback procedure', 'Consider data migration strategy'],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
          break;
        }
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.DATA_INTEGRITY,
        testName: 'data_integrity_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Data integrity validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Security validation
   */
  private async validateSecurity(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for SQL injection vulnerabilities in dynamic SQL
      if (migrationContent.includes('EXECUTE') && migrationContent.includes('||')) {
        results.push({
          category: ValidationCategory.SECURITY,
          testName: 'sql_injection_check',
          severity: ValidationSeverity.ERROR,
          status: 'failed',
          message: 'Potential SQL injection vulnerability in dynamic SQL',
          recommendations: ['Use parameterized queries', 'Validate all inputs', 'Use format() function with proper escaping'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Check for hardcoded passwords or secrets
      const secretPatterns = [
        /password\s*=\s*['"][^'"]*['"]/i,
        /secret\s*=\s*['"][^'"]*['"]/i,
        /api_key\s*=\s*['"][^'"]*['"]/i,
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(migrationContent)) {
          results.push({
            category: ValidationCategory.SECURITY,
            testName: 'hardcoded_secrets_check',
            severity: ValidationSeverity.CRITICAL,
            status: 'failed',
            message: 'Hardcoded secrets detected in migration',
            recommendations: ['Use environment variables', 'Use secure configuration management', 'Remove sensitive data'],
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }
      }
      
      // Check for proper permissions and RBAC
      if (migrationContent.includes('GRANT') || migrationContent.includes('REVOKE')) {
        results.push({
          category: ValidationCategory.SECURITY,
          testName: 'permission_management',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Permission management detected - ensure proper RBAC',
          recommendations: ['Verify permission assignments', 'Follow principle of least privilege'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.SECURITY,
        testName: 'security_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Security validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Spatial operations validation (PostGIS)
   */
  private async validateSpatialOperations(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for PostGIS extension
      if (!migrationContent.includes('CREATE EXTENSION IF NOT EXISTS postgis')) {
        results.push({
          category: ValidationCategory.SPATIAL,
          testName: 'postgis_extension_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: 'PostGIS operations detected but extension creation not found',
          recommendations: ['Add CREATE EXTENSION IF NOT EXISTS postgis', 'Verify PostGIS is available'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Check for spatial indexes
      if (migrationContent.includes('geometry') && !migrationContent.includes('GIST')) {
        results.push({
          category: ValidationCategory.SPATIAL,
          testName: 'spatial_index_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: 'Geometry columns detected without GIST indexes',
          recommendations: ['Add GIST indexes for geometry columns', 'Consider spatial query performance'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Validate SRID consistency
      const sridPattern = /SRID=(\d+)/g;
      const srids = [...migrationContent.matchAll(sridPattern)].map(match => match[1]);
      const uniqueSrids = [...new Set(srids)];
      
      if (uniqueSrids.length > 1) {
        results.push({
          category: ValidationCategory.SPATIAL,
          testName: 'srid_consistency_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: `Multiple SRIDs detected: ${uniqueSrids.join(', ')}`,
          recommendations: ['Ensure SRID consistency across spatial columns', 'Document spatial reference system usage'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.SPATIAL,
        testName: 'spatial_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Spatial validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * AI/ML operations validation
   */
  private async validateAIMLOperations(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check for vector extensions
      if (migrationContent.includes('vector') && !migrationContent.includes('CREATE EXTENSION')) {
        results.push({
          category: ValidationCategory.AI_ML,
          testName: 'vector_extension_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: 'Vector operations detected but extension not created',
          recommendations: ['Add required vector extensions', 'Verify pgvector availability'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      // Check for proper vector indexing
      if (migrationContent.includes('vector') && !migrationContent.includes('ivfflat')) {
        results.push({
          category: ValidationCategory.AI_ML,
          testName: 'vector_index_check',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: 'Vector columns without proper indexing detected',
          recommendations: ['Add ivfflat or hnsw indexes for vector columns', 'Consider vector search performance'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.AI_ML,
        testName: 'ai_ml_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `AI/ML validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Rollback strategy validation
   */
  private async validateRollbackStrategy(migrationPath: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      const rollbackPath = migrationPath.replace('/migrations/', '/rollbacks/');
      
      try {
        await fs.access(rollbackPath);
        results.push({
          category: ValidationCategory.ROLLBACK,
          testName: 'rollback_file_exists',
          severity: ValidationSeverity.INFO,
          status: 'passed',
          message: 'Rollback file exists',
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      } catch {
        results.push({
          category: ValidationCategory.ROLLBACK,
          testName: 'rollback_file_missing',
          severity: ValidationSeverity.WARNING,
          status: 'warning',
          message: 'Rollback file not found',
          recommendations: ['Create corresponding rollback migration', 'Document rollback procedure'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.ROLLBACK,
        testName: 'rollback_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Rollback validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Compatibility validation
   */
  private async validateCompatibility(migrationContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check PostgreSQL version compatibility
      const postgresVersion = await this.getPostgreSQLVersion();
      
      // Check for version-specific features
      if (migrationContent.includes('GENERATED ALWAYS AS') && postgresVersion < 12) {
        results.push({
          category: ValidationCategory.COMPATIBILITY,
          testName: 'postgres_version_compatibility',
          severity: ValidationSeverity.ERROR,
          status: 'failed',
          message: 'GENERATED columns require PostgreSQL 12 or higher',
          details: { currentVersion: postgresVersion },
          recommendations: ['Upgrade PostgreSQL version', 'Use alternative approach for older versions'],
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
      
      results.push({
        category: ValidationCategory.COMPATIBILITY,
        testName: 'compatibility_validation',
        severity: ValidationSeverity.INFO,
        status: 'passed',
        message: 'Compatibility validation passed',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
      
    } catch (error: unknown) {
      results.push({
        category: ValidationCategory.COMPATIBILITY,
        testName: 'compatibility_validation_error',
        severity: ValidationSeverity.CRITICAL,
        status: 'failed',
        message: `Compatibility validation error: ${error instanceof Error ? error?.message : String(error)}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      });
    }
    
    return results;
  }

  /**
   * Analyze migration complexity and generate risk score
   */
  private async analyzeMigrationComplexity(
    migrationId: string,
    migrationContent: string,
    validationResults: ValidationResult[]
  ): Promise<MigrationAnalysis> {
    // Calculate risk score based on validation results
    let riskScore = 0;
    validationResults.forEach(result => {
      switch (result.severity) {
        case ValidationSeverity.CRITICAL:
          riskScore += 25;
          break;
        case ValidationSeverity.ERROR:
          riskScore += 15;
          break;
        case ValidationSeverity.WARNING:
          riskScore += 5;
          break;
      }
    });
    
    // Analyze complexity factors
    const complexityFactors = {
      tableOperations: (migrationContent.match(/CREATE TABLE|ALTER TABLE|DROP TABLE/gi) || []).length,
      indexOperations: (migrationContent.match(/CREATE INDEX|DROP INDEX/gi) || []).length,
      dataOperations: (migrationContent.match(/INSERT|UPDATE|DELETE/gi) || []).length,
      constraintOperations: (migrationContent.match(/ADD CONSTRAINT|DROP CONSTRAINT/gi) || []).length,
    };
    
    const totalOperations = Object.values(complexityFactors).reduce((sum, count) => sum + count, 0);
    
    let complexity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalOperations > 20) complexity = 'critical';
    else if (totalOperations > 10) complexity = 'high';
    else if (totalOperations > 5) complexity = 'medium';
    
    // Estimate duration (rough calculation)
    const estimatedDuration = Math.max(30, totalOperations * 10);
    
    // Check if downtime is required
    const requiresDowntime = /ALTER TABLE.*ADD COLUMN.*NOT NULL|DROP TABLE|VACUUM FULL/i.test(migrationContent);
    
    // Extract impacted tables
    const tableMatches = migrationContent.match(/(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/gi) || [];
    const impactedTables = [...new Set(tableMatches.map(match => match.split(/\s+/).pop() || ''))];
    
    // Extract impacted indexes
    const indexMatches = migrationContent.match(/(?:CREATE|DROP)\s+INDEX\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/gi) || [];
    const impactedIndexes = [...new Set(indexMatches.map(match => match.split(/\s+/).pop() || ''))];
    
    // Calculate connection pool impact
    const connectionPoolImpact = requiresDowntime ? 90 : Math.min(50, totalOperations * 2);
    
    // Determine rollback complexity
    let rollbackComplexity: 'simple' | 'complex' | 'impossible' = 'simple';
    if (migrationContent.includes('DROP') || migrationContent.includes('TRUNCATE')) {
      rollbackComplexity = 'impossible';
    } else if (totalOperations > 10) {
      rollbackComplexity = 'complex';
    }
    
    return {
      migrationId,
      complexity,
      estimatedDuration,
      riskScore: Math.min(100, riskScore),
      requiresDowntime,
      impactedTables,
      impactedIndexes,
      connectionPoolImpact,
      dataVolumeImpact: totalOperations * 10,
      rollbackComplexity,
      validationResults,
    };
  }

  /**
   * Helper methods
   */
  private containsSpatialOperations(content: string): boolean {
    return /geometry|geography|PostGIS|ST_|GIST/i.test(content);
  }

  private containsAIMLOperations(content: string): boolean {
    return /vector|ml_|ai_|embedding|pgvector/i.test(content);
  }

  private async getPostgreSQLVersion(): Promise<number> {
    try {
      const [result] = await sequelize.query('SELECT version()') as [any[], any];
      const versionString = result[0].version;
      const versionMatch = versionString.match(/PostgreSQL (\d+)/);
      return versionMatch ? parseInt(versionMatch[1]) : 12; // Default to 12 if can't parse
    } catch {
      return 12; // Default version
    }
  }
}

// Export singleton instance
export const migrationValidator = MigrationValidator.getInstance();