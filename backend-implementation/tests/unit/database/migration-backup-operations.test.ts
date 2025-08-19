/**
 * ============================================================================
 * TASK 18: DATABASE OPERATIONS TESTING (Migrations + Backup/Restore)
 * ============================================================================
 *
 * Comprehensive testing framework for database migration and backup operations
 * with zero-downtime deployment support, PostGIS spatial migrations, and
 * AI/ML schema enhancements.
 *
 * Test Coverage:
 * - Migration execution pipeline (validation -> backup -> migration -> validation)
 * - Zero-downtime migration procedures with connection pool management
 * - Backup creation and restoration with validation
 * - PostGIS spatial migration support
 * - AI/ML schema migration capabilities
 * - Migration rollback and error recovery
 * - Performance monitoring during migrations
 * - Migration dependency resolution
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import {
  MigrationManager,
  MigrationStatus,
  MigrationType,
  MigrationFile,
  MigrationResult,
  ValidationResult,
  MigrationConfig,
} from '@/database/MigrationManager';
import { BackupService } from '@/database/BackupService';
import { sequelize } from '@/config/database';
import { logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('@/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: jest.fn(),
  },
  withTransaction: jest.fn(),
}));

jest.mock('@/database/BackupService', () => ({
  BackupService: {
    getInstance: jest.fn(() => ({
      createBackup: jest.fn(),
      restoreBackup: jest.fn(),
      validateBackup: jest.fn(),
      listBackups: jest.fn(),
      deleteBackup: jest.fn(),
    })),
  },
}));

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Task 18: Database Operations Testing (Migrations + Backup/Restore)', () => {
  let migrationManager: MigrationManager;
  let mockSequelize: jest.Mocked<typeof sequelize>;
  let mockBackupService: jest.Mocked<ReturnType<typeof BackupService.getInstance>>;
  let mockFs: jest.Mocked<typeof fs>;

  const mockConfig: MigrationConfig = {
    migrationDir: '/test/migrations',
    backupDir: '/test/backups',
    validationDir: '/test/validations',
    maxConcurrentMigrations: 1,
    backupRetentionDays: 30,
    validationTimeout: 300000,
    productionSafetyChecks: true,
    zeroDowntimeMode: true,
    aiMlSupport: true,
    postgisSupport: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSequelize = sequelize as jest.Mocked<typeof sequelize>;
    mockBackupService = BackupService.getInstance() as jest.Mocked<ReturnType<typeof BackupService.getInstance>>;
    mockFs = fs as jest.Mocked<typeof fs>;

    // Default mock implementations
    mockSequelize.query.mockResolvedValue([[], {}]);
    mockSequelize.authenticate.mockResolvedValue();
    mockSequelize.transaction.mockImplementation((callback) => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      return callback(mockTransaction);
    });

    mockBackupService.createBackup.mockResolvedValue({
      success: true,
      backupPath: '/test/backups/backup_20250816_120000.sql',
      metadata: {
        timestamp: new Date(),
        size: 1024000,
        checksum: 'abc123',
      },
    });

    mockBackupService.validateBackup.mockResolvedValue({
      valid: true,
      checksum: 'abc123',
      size: 1024000,
    });

    mockFs.readdir.mockResolvedValue([]);
    mockFs.readFile.mockResolvedValue('-- Migration SQL content');
    mockFs.mkdir.mockResolvedValue(undefined);

    migrationManager = MigrationManager.getInstance(mockConfig);
  });

  describe('Migration Pipeline Execution', () => {
    describe('Migration Discovery and Validation', () => {
      it('should discover and validate migration files', async () => {
        const mockMigrationFiles = [
          '001-create-users-table.sql',
          '002-add-spatial-indexes.sql',
          '003-ai-ml-schema-setup.sql',
        ];

        mockFs.readdir.mockResolvedValue(mockMigrationFiles as any);
        
        mockFs.readFile
          .mockResolvedValueOnce(`
            -- Migration: Create Users Table
            -- Version: 1.0.0
            -- Type: schema
            -- Description: Initial user table creation
            -- Dependencies: []
            -- Estimated Duration: 30
            -- Requires Downtime: false
            -- Backup Required: true
            CREATE TABLE users (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email VARCHAR(255) NOT NULL UNIQUE,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
          `)
          .mockResolvedValueOnce(`
            -- Migration: Add Spatial Indexes
            -- Version: 1.1.0
            -- Type: spatial
            -- Description: PostGIS spatial index creation
            -- Dependencies: [001-create-users-table]
            -- Estimated Duration: 120
            -- Requires Downtime: false
            -- Backup Required: true
            CREATE EXTENSION IF NOT EXISTS postgis;
            ALTER TABLE bins ADD COLUMN location GEOMETRY(POINT, 4326);
            CREATE INDEX CONCURRENTLY idx_bins_location ON bins USING GIST(location);
          `)
          .mockResolvedValueOnce(`
            -- Migration: AI/ML Schema Setup
            -- Version: 2.0.0
            -- Type: ai_ml
            -- Description: Vector database and ML model tables
            -- Dependencies: [001-create-users-table, 002-add-spatial-indexes]
            -- Estimated Duration: 300
            -- Requires Downtime: false
            -- Backup Required: true
            CREATE TABLE ml_models (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name VARCHAR(255) NOT NULL,
              model_data BYTEA,
              vector_embeddings vector(768)
            );
          `);

        const migrations = await migrationManager.discoverMigrations();

        expect(migrations).toHaveLength(3);
        
        const [migration1, migration2, migration3] = migrations;

        expect(migration1.name).toBe('Create Users Table');
        expect(migration1.type).toBe(MigrationType.SCHEMA);
        expect(migration1.estimatedDuration).toBe(30);
        expect(migration1.requiresDowntime).toBe(false);
        expect(migration1.dependencies).toEqual([]);

        expect(migration2.name).toBe('Add Spatial Indexes');
        expect(migration2.type).toBe(MigrationType.SPATIAL);
        expect(migration2.estimatedDuration).toBe(120);
        expect(migration2.dependencies).toEqual(['001-create-users-table']);

        expect(migration3.name).toBe('AI/ML Schema Setup');
        expect(migration3.type).toBe(MigrationType.AI_ML);
        expect(migration3.estimatedDuration).toBe(300);
        expect(migration3.dependencies).toEqual(['001-create-users-table', '002-add-spatial-indexes']);
      });

      it('should validate migration dependencies', async () => {
        const migrations: MigrationFile[] = [
          {
            id: '002',
            name: 'Dependent Migration',
            version: '1.1.0',
            type: MigrationType.SCHEMA,
            description: 'Migration with dependency',
            filePath: '/test/migrations/002-dependent.sql',
            checksum: 'checksum2',
            dependencies: ['001'],
            estimatedDuration: 60,
            requiresDowntime: false,
            backupRequired: true,
            postMigrationValidation: true,
          },
          {
            id: '001',
            name: 'Base Migration',
            version: '1.0.0',
            type: MigrationType.SCHEMA,
            description: 'Base migration',
            filePath: '/test/migrations/001-base.sql',
            checksum: 'checksum1',
            dependencies: [],
            estimatedDuration: 30,
            requiresDowntime: false,
            backupRequired: true,
            postMigrationValidation: true,
          },
        ];

        const executionOrder = await migrationManager.resolveDependencies(migrations);

        expect(executionOrder).toHaveLength(2);
        expect(executionOrder[0].id).toBe('001'); // Base migration first
        expect(executionOrder[1].id).toBe('002'); // Dependent migration second
      });

      it('should detect circular dependencies', async () => {
        const migrationsWithCircularDep: MigrationFile[] = [
          {
            id: '001',
            name: 'Migration A',
            version: '1.0.0',
            type: MigrationType.SCHEMA,
            description: 'Migration A',
            filePath: '/test/001.sql',
            checksum: 'checksum1',
            dependencies: ['002'], // Depends on 002
            estimatedDuration: 30,
            requiresDowntime: false,
            backupRequired: true,
            postMigrationValidation: true,
          },
          {
            id: '002',
            name: 'Migration B',
            version: '1.0.0',
            type: MigrationType.SCHEMA,
            description: 'Migration B',
            filePath: '/test/002.sql',
            checksum: 'checksum2',
            dependencies: ['001'], // Depends on 001 - circular!
            estimatedDuration: 30,
            requiresDowntime: false,
            backupRequired: true,
            postMigrationValidation: true,
          },
        ];

        await expect(
          migrationManager.resolveDependencies(migrationsWithCircularDep)
        ).rejects.toThrow('Circular dependency detected');
      });
    });

    describe('Complete Migration Execution Pipeline', () => {
      it('should execute complete migration pipeline with backup', async () => {
        const migration: MigrationFile = {
          id: '001',
          name: 'Test Migration',
          version: '1.0.0',
          type: MigrationType.SCHEMA,
          description: 'Test schema migration',
          filePath: '/test/migrations/001-test.sql',
          checksum: 'test-checksum',
          dependencies: [],
          estimatedDuration: 60,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        const migrationSql = `
          CREATE TABLE test_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL
          );
        `;

        mockFs.readFile.mockResolvedValue(migrationSql);

        // Mock successful validation
        const mockValidationResults: ValidationResult[] = [
          {
            testName: 'schema_integrity',
            status: 'passed',
            message: 'Schema integrity validated',
            executionTime: 100,
          },
          {
            testName: 'data_consistency',
            status: 'passed',
            message: 'Data consistency verified',
            executionTime: 200,
          },
        ];

        jest.spyOn(migrationManager, 'validateMigration').mockResolvedValue(mockValidationResults);

        const result = await migrationManager.executeMigration(migration);

        expect(result.status).toBe(MigrationStatus.COMPLETED);
        expect(result.migrationId).toBe('001');
        expect(result.backupPath).toBe('/test/backups/backup_20250816_120000.sql');
        expect(result.validationResults).toEqual(mockValidationResults);

        // Verify backup was created
        expect(mockBackupService.createBackup).toHaveBeenCalledWith({
          reason: 'Pre-migration backup for: Test Migration',
          metadata: {
            migrationId: '001',
            migrationName: 'Test Migration',
            version: '1.0.0',
          },
        });

        // Verify migration was executed
        expect(mockSequelize.query).toHaveBeenCalledWith(migrationSql, expect.any(Object));

        // Verify migration was recorded in history
        expect(mockSequelize.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO migration_history'),
          expect.any(Object)
        );
      });

      it('should handle migration execution failure with rollback', async () => {
        const migration: MigrationFile = {
          id: '002',
          name: 'Failing Migration',
          version: '1.0.0',
          type: MigrationType.SCHEMA,
          description: 'Migration that will fail',
          filePath: '/test/migrations/002-failing.sql',
          checksum: 'failing-checksum',
          dependencies: [],
          estimatedDuration: 60,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
          rollbackFile: '/test/migrations/rollback/002-rollback.sql',
        };

        const migrationSql = `CREATE TABLE invalid_table;`; // Invalid SQL
        const rollbackSql = `DROP TABLE IF EXISTS invalid_table;`;

        mockFs.readFile
          .mockResolvedValueOnce(migrationSql)
          .mockResolvedValueOnce(rollbackSql);

        // Mock migration execution failure
        mockSequelize.query
          .mockResolvedValueOnce([[], {}]) // Setup queries succeed
          .mockRejectedValueOnce(new Error('SQL syntax error')); // Migration fails

        const result = await migrationManager.executeMigration(migration);

        expect(result.status).toBe(MigrationStatus.ROLLED_BACK);
        expect(result.error).toContain('SQL syntax error');
        expect(result.rollbackExecuted).toBe(true);

        // Verify rollback was executed
        expect(mockSequelize.query).toHaveBeenCalledWith(rollbackSql, expect.any(Object));
      });

      it('should execute zero-downtime migration with connection pool management', async () => {
        const migration: MigrationFile = {
          id: '003',
          name: 'Zero Downtime Migration',
          version: '1.0.0',
          type: MigrationType.PERFORMANCE,
          description: 'Zero downtime index creation',
          filePath: '/test/migrations/003-zero-downtime.sql',
          checksum: 'zero-downtime-checksum',
          dependencies: [],
          estimatedDuration: 300,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        const migrationSql = `
          CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
          CREATE INDEX CONCURRENTLY idx_bins_status ON bins(status);
        `;

        mockFs.readFile.mockResolvedValue(migrationSql);

        // Mock connection pool monitoring
        jest.spyOn(migrationManager, 'monitorConnectionPool').mockResolvedValue({
          activeConnections: 15,
          idleConnections: 5,
          totalConnections: 20,
          utilizationPercentage: 75,
        });

        const result = await migrationManager.executeMigration(migration);

        expect(result.status).toBe(MigrationStatus.COMPLETED);
        expect(result.performanceMetrics).toBeDefined();
        expect(result.performanceMetrics!.connectionPoolUtilization).toBe(75);

        // Verify zero-downtime execution
        expect(mockSequelize.query).toHaveBeenCalledWith(
          migrationSql,
          expect.objectContaining({
            // Zero-downtime options
            transaction: expect.any(Object),
          })
        );
      });
    });

    describe('PostGIS Spatial Migration Support', () => {
      it('should execute PostGIS spatial migrations', async () => {
        const spatialMigration: MigrationFile = {
          id: '004',
          name: 'PostGIS Spatial Setup',
          version: '1.0.0',
          type: MigrationType.SPATIAL,
          description: 'PostGIS extension and spatial columns',
          filePath: '/test/migrations/004-spatial.sql',
          checksum: 'spatial-checksum',
          dependencies: [],
          estimatedDuration: 180,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        const spatialSql = `
          -- Enable PostGIS extension
          CREATE EXTENSION IF NOT EXISTS postgis;
          CREATE EXTENSION IF NOT EXISTS postgis_topology;
          
          -- Add spatial columns
          ALTER TABLE bins ADD COLUMN IF NOT EXISTS location GEOMETRY(POINT, 4326);
          ALTER TABLE routes ADD COLUMN IF NOT EXISTS path GEOMETRY(LINESTRING, 4326);
          
          -- Create spatial indexes
          CREATE INDEX CONCURRENTLY idx_bins_location_gist ON bins USING GIST(location);
          CREATE INDEX CONCURRENTLY idx_routes_path_gist ON routes USING GIST(path);
          
          -- Add spatial constraints
          ALTER TABLE bins ADD CONSTRAINT check_valid_location 
            CHECK (ST_IsValid(location) OR location IS NULL);
        `;

        mockFs.readFile.mockResolvedValue(spatialSql);

        // Mock PostGIS validation
        jest.spyOn(migrationManager, 'validateSpatialMigration').mockResolvedValue([
          {
            testName: 'postgis_extension',
            status: 'passed',
            message: 'PostGIS extension successfully enabled',
            executionTime: 50,
          },
          {
            testName: 'spatial_indexes',
            status: 'passed',
            message: 'Spatial indexes created successfully',
            executionTime: 120,
          },
          {
            testName: 'spatial_constraints',
            status: 'passed',
            message: 'Spatial constraints validated',
            executionTime: 30,
          },
        ]);

        const result = await migrationManager.executeMigration(spatialMigration);

        expect(result.status).toBe(MigrationStatus.COMPLETED);
        expect(result.validationResults).toHaveLength(3);
        
        // Verify PostGIS-specific validations passed
        const postgisValidation = result.validationResults!.find(v => v.testName === 'postgis_extension');
        expect(postgisValidation!.status).toBe('passed');
        
        const spatialIndexValidation = result.validationResults!.find(v => v.testName === 'spatial_indexes');
        expect(spatialIndexValidation!.status).toBe('passed');
      });

      it('should validate spatial data integrity', async () => {
        const spatialValidationSql = `
          -- Check PostGIS version
          SELECT PostGIS_Version();
          
          -- Validate spatial columns
          SELECT f_table_name, f_geometry_column, coord_dimension, srid, type
          FROM geometry_columns
          WHERE f_table_name IN ('bins', 'routes');
          
          -- Check spatial indexes
          SELECT schemaname, tablename, indexname, indexdef
          FROM pg_indexes
          WHERE indexdef LIKE '%GIST%'
          AND tablename IN ('bins', 'routes');
        `;

        const mockSpatialResults = [
          [{ postgis_version: '3.3.2' }],
          [
            { f_table_name: 'bins', f_geometry_column: 'location', type: 'POINT', srid: 4326 },
            { f_table_name: 'routes', f_geometry_column: 'path', type: 'LINESTRING', srid: 4326 },
          ],
          [
            { tablename: 'bins', indexname: 'idx_bins_location_gist' },
            { tablename: 'routes', indexname: 'idx_routes_path_gist' },
          ],
        ];

        mockSequelize.query
          .mockResolvedValueOnce([mockSpatialResults[0], {}])
          .mockResolvedValueOnce([mockSpatialResults[1], {}])
          .mockResolvedValueOnce([mockSpatialResults[2], {}]);

        const validationResults = await migrationManager.validateSpatialMigration('004');

        expect(validationResults).toHaveLength(3);
        expect(validationResults[0].status).toBe('passed');
        expect(validationResults[1].status).toBe('passed');
        expect(validationResults[2].status).toBe('passed');
      });
    });

    describe('AI/ML Schema Migration Support', () => {
      it('should execute AI/ML schema migrations', async () => {
        const aiMlMigration: MigrationFile = {
          id: '005',
          name: 'AI/ML Schema Setup',
          version: '2.0.0',
          type: MigrationType.AI_ML,
          description: 'Vector database and ML model schema',
          filePath: '/test/migrations/005-ai-ml.sql',
          checksum: 'ai-ml-checksum',
          dependencies: [],
          estimatedDuration: 240,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        const aiMlSql = `
          -- Vector extension for embeddings
          CREATE EXTENSION IF NOT EXISTS vector;
          
          -- ML models table
          CREATE TABLE ml_models (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            type VARCHAR(100) NOT NULL, -- 'route_optimization', 'demand_prediction', etc.
            version VARCHAR(50) NOT NULL,
            model_data BYTEA,
            config JSONB,
            training_metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Vector embeddings table
          CREATE TABLE vector_embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            entity_type VARCHAR(100) NOT NULL, -- 'customer', 'route', 'bin', etc.
            entity_id UUID NOT NULL,
            embedding vector(768), -- OpenAI embedding dimension
            model_version VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            
            UNIQUE(entity_type, entity_id, model_version)
          );
          
          -- Create vector similarity index
          CREATE INDEX CONCURRENTLY idx_vector_embeddings_similarity 
            ON vector_embeddings USING ivfflat (embedding vector_cosine_ops);
          
          -- ML predictions table
          CREATE TABLE ml_predictions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            model_id UUID REFERENCES ml_models(id),
            input_data JSONB NOT NULL,
            prediction JSONB NOT NULL,
            confidence_score DECIMAL(5,4),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Performance optimization indexes
          CREATE INDEX CONCURRENTLY idx_ml_models_type ON ml_models(type);
          CREATE INDEX CONCURRENTLY idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
          CREATE INDEX CONCURRENTLY idx_ml_predictions_model_created ON ml_predictions(model_id, created_at);
        `;

        mockFs.readFile.mockResolvedValue(aiMlSql);

        // Mock AI/ML validation
        jest.spyOn(migrationManager, 'validateAiMlMigration').mockResolvedValue([
          {
            testName: 'vector_extension',
            status: 'passed',
            message: 'Vector extension successfully enabled',
            executionTime: 30,
          },
          {
            testName: 'ml_tables_created',
            status: 'passed',
            message: 'ML schema tables created successfully',
            executionTime: 80,
          },
          {
            testName: 'vector_indexes',
            status: 'passed',
            message: 'Vector similarity indexes created',
            executionTime: 100,
          },
        ]);

        const result = await migrationManager.executeMigration(aiMlMigration);

        expect(result.status).toBe(MigrationStatus.COMPLETED);
        expect(result.validationResults).toHaveLength(3);
        
        // Verify AI/ML-specific validations
        const vectorValidation = result.validationResults!.find(v => v.testName === 'vector_extension');
        expect(vectorValidation!.status).toBe('passed');
        
        const tablesValidation = result.validationResults!.find(v => v.testName === 'ml_tables_created');
        expect(tablesValidation!.status).toBe('passed');
      });

      it('should validate AI/ML schema components', async () => {
        const aiMlValidationResults = await migrationManager.validateAiMlMigration('005');

        // Mock vector extension check
        mockSequelize.query.mockResolvedValueOnce([
          [{ extname: 'vector', extversion: '0.5.1' }],
          {},
        ]);

        // Mock ML tables check
        mockSequelize.query.mockResolvedValueOnce([
          [
            { table_name: 'ml_models' },
            { table_name: 'vector_embeddings' },
            { table_name: 'ml_predictions' },
          ],
          {},
        ]);

        // Mock vector index check
        mockSequelize.query.mockResolvedValueOnce([
          [{ indexname: 'idx_vector_embeddings_similarity', indexdef: 'USING ivfflat' }],
          {},
        ]);

        expect(aiMlValidationResults).toHaveLength(3);
        expect(aiMlValidationResults[0].testName).toBe('vector_extension');
        expect(aiMlValidationResults[1].testName).toBe('ml_tables_created');
        expect(aiMlValidationResults[2].testName).toBe('vector_indexes');
      });
    });
  });

  describe('Backup and Restore Operations', () => {
    describe('Backup Creation and Validation', () => {
      it('should create pre-migration backup with metadata', async () => {
        const backupOptions = {
          reason: 'Pre-migration backup for schema update',
          metadata: {
            migrationId: '001',
            migrationName: 'Schema Update',
            version: '1.0.0',
            estimatedSize: '50MB',
          },
        };

        mockBackupService.createBackup.mockResolvedValue({
          success: true,
          backupPath: '/test/backups/pre_migration_001_20250816_120000.sql',
          metadata: {
            timestamp: new Date('2025-08-16T12:00:00Z'),
            size: 52428800, // 50MB
            checksum: 'sha256:abc123def456',
            compressionRatio: 0.75,
            tablesIncluded: ['users', 'bins', 'routes', 'customers'],
          },
        });

        const backupResult = await migrationManager.createPreMigrationBackup('001', backupOptions);

        expect(backupResult.success).toBe(true);
        expect(backupResult.backupPath).toContain('pre_migration_001');
        expect(backupResult.metadata.size).toBe(52428800);
        expect(backupResult.metadata.tablesIncluded).toHaveLength(4);

        expect(mockBackupService.createBackup).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: 'Pre-migration backup for schema update',
            metadata: expect.objectContaining({
              migrationId: '001',
              migrationName: 'Schema Update',
            }),
          })
        );
      });

      it('should validate backup integrity', async () => {
        const backupPath = '/test/backups/backup_20250816_120000.sql';

        mockBackupService.validateBackup.mockResolvedValue({
          valid: true,
          checksum: 'sha256:valid_checksum',
          size: 1024000,
          metadata: {
            tables: ['users', 'bins'],
            recordCount: 10000,
            schemaVersion: '1.0.0',
          },
        });

        const validationResult = await migrationManager.validateBackup(backupPath);

        expect(validationResult.valid).toBe(true);
        expect(validationResult.checksum).toBe('sha256:valid_checksum');
        expect(validationResult.metadata.tables).toEqual(['users', 'bins']);
        expect(validationResult.metadata.recordCount).toBe(10000);
      });

      it('should handle backup creation failures', async () => {
        mockBackupService.createBackup.mockResolvedValue({
          success: false,
          error: 'Insufficient disk space',
        });

        const backupOptions = {
          reason: 'Test backup',
          metadata: { test: true },
        };

        const backupResult = await migrationManager.createPreMigrationBackup('test', backupOptions);

        expect(backupResult.success).toBe(false);
        expect(backupResult.error).toBe('Insufficient disk space');
      });
    });

    describe('Restore Operations', () => {
      it('should restore from backup after migration failure', async () => {
        const backupPath = '/test/backups/pre_migration_backup.sql';
        const migrationId = '002';

        mockBackupService.restoreBackup.mockResolvedValue({
          success: true,
          restoredTables: ['users', 'bins', 'routes'],
          recordsRestored: 15000,
          duration: 120000, // 2 minutes
        });

        const restoreResult = await migrationManager.restoreFromBackup(migrationId, backupPath);

        expect(restoreResult.success).toBe(true);
        expect(restoreResult.restoredTables).toEqual(['users', 'bins', 'routes']);
        expect(restoreResult.recordsRestored).toBe(15000);
        expect(restoreResult.duration).toBe(120000);

        expect(mockBackupService.restoreBackup).toHaveBeenCalledWith(
          backupPath,
          expect.objectContaining({
            migrationId,
            validateAfterRestore: true,
          })
        );
      });

      it('should validate database state after restore', async () => {
        const postRestoreValidationSql = `
          -- Check table counts
          SELECT 'users' as table_name, COUNT(*) as count FROM users
          UNION ALL
          SELECT 'bins' as table_name, COUNT(*) as count FROM bins
          UNION ALL
          SELECT 'routes' as table_name, COUNT(*) as count FROM routes;
          
          -- Check schema integrity
          SELECT COUNT(*) as constraint_count FROM information_schema.table_constraints;
          
          -- Check index integrity
          SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
        `;

        const mockValidationResults = [
          [
            { table_name: 'users', count: 5000 },
            { table_name: 'bins', count: 8000 },
            { table_name: 'routes', count: 2000 },
          ],
          [{ constraint_count: 25 }],
          [{ index_count: 15 }],
        ];

        mockSequelize.query
          .mockResolvedValueOnce([mockValidationResults[0], {}])
          .mockResolvedValueOnce([mockValidationResults[1], {}])
          .mockResolvedValueOnce([mockValidationResults[2], {}]);

        const validationResults = await migrationManager.validatePostRestore('002');

        expect(validationResults).toHaveLength(3);
        expect(validationResults[0].status).toBe('passed');
        expect(validationResults[0].details.recordCounts).toEqual({
          users: 5000,
          bins: 8000,
          routes: 2000,
        });
      });

      it('should handle restore failures gracefully', async () => {
        const backupPath = '/test/backups/corrupted_backup.sql';

        mockBackupService.restoreBackup.mockResolvedValue({
          success: false,
          error: 'Backup file corrupted or incomplete',
        });

        const restoreResult = await migrationManager.restoreFromBackup('failed_migration', backupPath);

        expect(restoreResult.success).toBe(false);
        expect(restoreResult.error).toBe('Backup file corrupted or incomplete');
      });
    });

    describe('Backup Lifecycle Management', () => {
      it('should manage backup retention policy', async () => {
        const mockBackups = [
          {
            path: '/test/backups/backup_20250801_120000.sql',
            timestamp: new Date('2025-08-01T12:00:00Z'),
            size: 1000000,
          },
          {
            path: '/test/backups/backup_20250815_120000.sql',
            timestamp: new Date('2025-08-15T12:00:00Z'),
            size: 1200000,
          },
          {
            path: '/test/backups/backup_20250816_120000.sql',
            timestamp: new Date('2025-08-16T12:00:00Z'),
            size: 1100000,
          },
        ];

        mockBackupService.listBackups.mockResolvedValue(mockBackups);
        mockBackupService.deleteBackup.mockResolvedValue({ success: true });

        // Mock current date as 2025-08-16, retention is 30 days
        // Backup from 2025-08-01 is 15 days old, should be kept
        const cleanupResult = await migrationManager.cleanupOldBackups();

        expect(cleanupResult.deletedBackups).toHaveLength(0); // No backups older than 30 days
        expect(cleanupResult.retainedBackups).toHaveLength(3);

        // Test with backup older than retention
        const oldBackup = {
          path: '/test/backups/backup_20250701_120000.sql',
          timestamp: new Date('2025-07-01T12:00:00Z'),
          size: 800000,
        };

        mockBackupService.listBackups.mockResolvedValue([...mockBackups, oldBackup]);

        const cleanupResultWithOld = await migrationManager.cleanupOldBackups();

        expect(cleanupResultWithOld.deletedBackups).toHaveLength(1);
        expect(cleanupResultWithOld.deletedBackups[0].path).toContain('backup_20250701');
      });

      it('should compress old backups to save space', async () => {
        const backupPath = '/test/backups/backup_20250810_120000.sql';

        mockBackupService.compressBackup = jest.fn().mockResolvedValue({
          success: true,
          originalSize: 1000000,
          compressedSize: 250000,
          compressionRatio: 0.75,
          compressedPath: '/test/backups/backup_20250810_120000.sql.gz',
        });

        const compressionResult = await migrationManager.compressBackup(backupPath);

        expect(compressionResult.success).toBe(true);
        expect(compressionResult.compressionRatio).toBe(0.75);
        expect(compressionResult.compressedPath).toContain('.sql.gz');
      });
    });
  });

  describe('Performance Monitoring and Optimization', () => {
    describe('Connection Pool Management', () => {
      it('should monitor connection pool during migrations', async () => {
        const mockConnectionPoolStats = {
          activeConnections: 25,
          idleConnections: 15,
          totalConnections: 40,
          maxConnections: 120,
          utilizationPercentage: 33.3,
          averageWaitTime: 50, // milliseconds
          peakConnections: 45,
        };

        jest.spyOn(migrationManager, 'getConnectionPoolStats').mockResolvedValue(mockConnectionPoolStats);

        const poolStats = await migrationManager.monitorConnectionPool();

        expect(poolStats.activeConnections).toBe(25);
        expect(poolStats.utilizationPercentage).toBeCloseTo(33.3, 1);
        expect(poolStats.averageWaitTime).toBe(50);

        // Verify it doesn't exceed safe thresholds
        expect(poolStats.utilizationPercentage).toBeLessThan(80); // Safe threshold
      });

      it('should scale connection pool for heavy migrations', async () => {
        const heavyMigration: MigrationFile = {
          id: '006',
          name: 'Heavy Data Migration',
          version: '1.0.0',
          type: MigrationType.DATA,
          description: 'Large data transformation',
          filePath: '/test/migrations/006-heavy.sql',
          checksum: 'heavy-checksum',
          dependencies: [],
          estimatedDuration: 1800, // 30 minutes
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        jest.spyOn(migrationManager, 'scaleConnectionPool').mockResolvedValue({
          previousMax: 120,
          newMax: 200,
          scalingReason: 'Heavy migration detected',
        });

        const scalingResult = await migrationManager.optimizeForMigration(heavyMigration);

        expect(scalingResult.newMax).toBe(200);
        expect(scalingResult.scalingReason).toBe('Heavy migration detected');
      });

      it('should handle connection pool exhaustion', async () => {
        // Mock connection pool exhaustion
        jest.spyOn(migrationManager, 'getConnectionPoolStats').mockResolvedValue({
          activeConnections: 115,
          idleConnections: 5,
          totalConnections: 120,
          maxConnections: 120,
          utilizationPercentage: 95.8,
          averageWaitTime: 5000, // High wait time
          peakConnections: 120,
        });

        const poolStatus = await migrationManager.checkConnectionPoolHealth();

        expect(poolStatus.healthy).toBe(false);
        expect(poolStatus.warnings).toContain('High connection pool utilization');
        expect(poolStatus.recommendedActions).toContain('Consider scaling connection pool');
      });
    });

    describe('Migration Performance Metrics', () => {
      it('should collect comprehensive performance metrics', async () => {
        const migration: MigrationFile = {
          id: '007',
          name: 'Performance Test Migration',
          version: '1.0.0',
          type: MigrationType.PERFORMANCE,
          description: 'Migration with performance monitoring',
          filePath: '/test/migrations/007-perf.sql',
          checksum: 'perf-checksum',
          dependencies: [],
          estimatedDuration: 300,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        // Mock performance metrics collection
        jest.spyOn(migrationManager, 'collectPerformanceMetrics').mockResolvedValue({
          connectionPoolUtilization: 45.5,
          averageQueryTime: 120, // milliseconds
          memoryUsage: 65.2, // percentage
          diskSpace: 78.9, // percentage
          cpuUtilization: 40.1, // percentage
          ioWaitTime: 15.3, // percentage
          lockWaitTime: 5.2, // milliseconds average
          slowQueries: 2,
          deadlocks: 0,
        });

        const result = await migrationManager.executeMigration(migration);

        expect(result.performanceMetrics).toBeDefined();
        expect(result.performanceMetrics!.connectionPoolUtilization).toBe(45.5);
        expect(result.performanceMetrics!.averageQueryTime).toBe(120);
        expect(result.performanceMetrics!.deadlocks).toBe(0);
      });

      it('should detect performance degradation during migration', async () => {
        // Mock performance degradation
        jest.spyOn(migrationManager, 'monitorPerformanceDuringMigration').mockResolvedValue({
          performanceDegraded: true,
          degradationFactor: 2.5, // 150% slower than baseline
          affectedQueries: ['SELECT * FROM bins', 'UPDATE routes SET status = ?'],
          recommendedActions: [
            'Consider running migration during off-peak hours',
            'Add temporary indexes for affected queries',
          ],
        });

        const performanceReport = await migrationManager.analyzePerformanceImpact('008');

        expect(performanceReport.performanceDegraded).toBe(true);
        expect(performanceReport.degradationFactor).toBe(2.5);
        expect(performanceReport.affectedQueries).toHaveLength(2);
        expect(performanceReport.recommendedActions).toHaveLength(2);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    describe('Migration Failure Recovery', () => {
      it('should handle database connection failures during migration', async () => {
        const migration: MigrationFile = {
          id: '009',
          name: 'Connection Failure Test',
          version: '1.0.0',
          type: MigrationType.SCHEMA,
          description: 'Test connection failure handling',
          filePath: '/test/migrations/009-connection-fail.sql',
          checksum: 'connection-fail-checksum',
          dependencies: [],
          estimatedDuration: 60,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        // Mock connection failure
        mockSequelize.authenticate.mockRejectedValue(new Error('Connection terminated'));

        const result = await migrationManager.executeMigration(migration);

        expect(result.status).toBe(MigrationStatus.FAILED);
        expect(result.error).toContain('Connection terminated');
        expect(result.rollbackExecuted).toBe(false); // Cannot rollback if connection failed
      });

      it('should implement migration timeout handling', async () => {
        const longRunningMigration: MigrationFile = {
          id: '010',
          name: 'Long Running Migration',
          version: '1.0.0',
          type: MigrationType.DATA,
          description: 'Migration that runs too long',
          filePath: '/test/migrations/010-long.sql',
          checksum: 'long-checksum',
          dependencies: [],
          estimatedDuration: 600, // 10 minutes
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        // Mock timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Migration timeout after 10 minutes')), 100);
        });

        mockSequelize.query.mockReturnValue(timeoutPromise as any);

        const result = await migrationManager.executeMigration(longRunningMigration);

        expect(result.status).toBe(MigrationStatus.FAILED);
        expect(result.error).toContain('Migration timeout');
      });
    });

    describe('Concurrent Migration Prevention', () => {
      it('should prevent concurrent migration execution', async () => {
        const migration1: MigrationFile = {
          id: '011',
          name: 'First Migration',
          version: '1.0.0',
          type: MigrationType.SCHEMA,
          description: 'First migration',
          filePath: '/test/migrations/011-first.sql',
          checksum: 'first-checksum',
          dependencies: [],
          estimatedDuration: 120,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        const migration2: MigrationFile = {
          id: '012',
          name: 'Second Migration',
          version: '1.0.0',
          type: MigrationType.SCHEMA,
          description: 'Second migration',
          filePath: '/test/migrations/012-second.sql',
          checksum: 'second-checksum',
          dependencies: [],
          estimatedDuration: 90,
          requiresDowntime: false,
          backupRequired: true,
          postMigrationValidation: true,
        };

        // Start first migration (mock it to be slow)
        mockSequelize.query.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        const promise1 = migrationManager.executeMigration(migration1);

        // Try to start second migration immediately
        const result2 = await migrationManager.executeMigration(migration2);

        expect(result2.status).toBe(MigrationStatus.FAILED);
        expect(result2.error).toContain('Another migration is currently running');

        // Wait for first migration to complete
        const result1 = await promise1;
        expect(result1.status).toBe(MigrationStatus.COMPLETED);
      });

      it('should handle migration lock cleanup on process termination', async () => {
        // Mock process termination scenario
        jest.spyOn(migrationManager, 'cleanupMigrationLocks').mockResolvedValue({
          locksFound: 1,
          locksRemoved: 1,
          staleThreshold: 3600000, // 1 hour
        });

        const cleanupResult = await migrationManager.handleProcessTermination();

        expect(cleanupResult.locksRemoved).toBe(1);
        expect(cleanupResult.staleThreshold).toBe(3600000);
      });
    });
  });
});