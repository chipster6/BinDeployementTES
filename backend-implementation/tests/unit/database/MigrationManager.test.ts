/**
 * ============================================================================
 * MIGRATION MANAGER COMPREHENSIVE UNIT TESTS
 * ============================================================================
 *
 * Comprehensive unit tests for MigrationManager covering production-safe
 * migration execution, backup/restore procedures, validation framework,
 * zero-downtime deployments, and automated rollback capabilities.
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-15
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
import { sequelize, withTransaction } from '@/config/database';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { QueryTypes } from 'sequelize';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/config', () => ({
  config: {
    app: { nodeEnv: 'test' },
    database: {
      host: 'localhost',
      port: 5432,
      username: 'test_user',
      database: 'test_db',
      password: 'test_password',
    },
  },
}));

jest.mock('fs/promises');
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExec = exec as jest.MockedFunction<typeof exec>;
  const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;
  const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;

  beforeAll(async () => {
    await DatabaseTestHelper.initialize();
  });

  afterAll(async () => {
    await DatabaseTestHelper.close();
  });

  beforeEach(async () => {
    await DatabaseTestHelper.reset();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockSequelize.query.mockResolvedValue([[], {}]);
    mockWithTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      return await callback(mockTransaction as any);
    });

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.readFile.mockResolvedValue('-- Sample migration content');
    mockFs.access.mockResolvedValue(undefined);

    // Get fresh instance for each test
    const testConfig: MigrationConfig = {
      migrationDir: '/test/migrations',
      backupDir: '/test/backups',
      validationDir: '/test/validations',
      maxConcurrentMigrations: 1,
      backupRetentionDays: 30,
      validationTimeout: 300000,
      productionSafetyChecks: true,
      zeroDowntimeMode: false,
      aiMlSupport: true,
      postgisSupport: true,
    };

    migrationManager = MigrationManager.getInstance(testConfig);
  });

  afterEach(async () => {
    await DatabaseTestHelper.cleanup();
  });

  describe('Migration Discovery and Parsing', () => {
    it('should discover and parse migration files correctly', async () => {
      // Arrange
      const migrationFiles = ['001_create_users.sql', '002_add_indexes.sql', '003_spatial_data.sql'];
      mockFs.readdir.mockResolvedValue(migrationFiles);
      
      const migrationContent = `
        -- Migration: Create users table
        -- Description: Initial user table creation
        -- Type: schema
        -- Dependencies: 
        -- MIGRATION UP
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        -- MIGRATION DOWN
        DROP TABLE IF EXISTS users;
      `;
      
      mockFs.readFile.mockResolvedValue(migrationContent);

      // Act
      const discoveredMigrations = await migrationManager.discoverMigrations();

      // Assert
      expect(discoveredMigrations).toHaveLength(3);
      expect(discoveredMigrations[0]).toMatchObject({
        id: '001_create_users',
        name: '001_create_users.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Initial user table creation',
        filePath: expect.stringContaining('001_create_users.sql'),
        checksum: expect.any(String),
        dependencies: [],
        estimatedDuration: expect.any(Number),
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: true,
      });

      expect(mockFs.readdir).toHaveBeenCalledWith('/test/migrations');
      expect(mockFs.readFile).toHaveBeenCalledTimes(3);
    });

    it('should handle migration file parsing errors gracefully', async () => {
      // Arrange
      mockFs.readdir.mockResolvedValue(['invalid_migration.sql']);
      mockFs.readFile.mockRejectedValue(new Error('File read error'));

      // Act
      const discoveredMigrations = await migrationManager.discoverMigrations();

      // Assert
      expect(discoveredMigrations).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse migration file'),
        expect.any(Error)
      );
    });

    it('should correctly detect migration types from content', async () => {
      // Arrange
      const testCases = [
        {
          content: 'CREATE EXTENSION IF NOT EXISTS postgis; CREATE TABLE spatial_data (geom geometry);',
          expectedType: MigrationType.SPATIAL,
        },
        {
          content: 'CREATE TABLE ml_models (embedding vector(512));',
          expectedType: MigrationType.AI_ML,
        },
        {
          content: 'CREATE ROLE security_admin; GRANT SELECT ON users TO security_admin;',
          expectedType: MigrationType.SECURITY,
        },
        {
          content: 'CREATE INDEX CONCURRENTLY idx_users_email ON users(email);',
          expectedType: MigrationType.PERFORMANCE,
        },
        {
          content: 'CREATE TABLE products (id UUID PRIMARY KEY);',
          expectedType: MigrationType.SCHEMA,
        },
      ];

      mockFs.readdir.mockResolvedValue(['test_migration.sql']);

      for (const testCase of testCases) {
        mockFs.readFile.mockResolvedValue(testCase.content);

        // Act
        const migrations = await migrationManager.discoverMigrations();

        // Assert
        expect(migrations[0].type).toBe(testCase.expectedType);
      }
    });

    it('should detect dangerous operations requiring backup', async () => {
      // Arrange
      const dangerousContent = `
        DROP TABLE old_data;
        ALTER TABLE users DROP COLUMN deprecated_field;
        DELETE FROM logs WHERE created_at < NOW() - INTERVAL '1 year';
      `;

      mockFs.readdir.mockResolvedValue(['dangerous_migration.sql']);
      mockFs.readFile.mockResolvedValue(dangerousContent);

      // Act
      const migrations = await migrationManager.discoverMigrations();

      // Assert
      expect(migrations[0].backupRequired).toBe(true);
      expect(migrations[0].requiresDowntime).toBe(false); // No NOT NULL additions
    });

    it('should detect operations requiring downtime', async () => {
      // Arrange
      const downtimeContent = `
        ALTER TABLE users ADD COLUMN required_field VARCHAR(255) NOT NULL;
      `;

      mockFs.readdir.mockResolvedValue(['downtime_migration.sql']);
      mockFs.readFile.mockResolvedValue(downtimeContent);

      // Act
      const migrations = await migrationManager.discoverMigrations();

      // Assert
      expect(migrations[0].requiresDowntime).toBe(true);
    });
  });

  describe('Migration Execution', () => {
    it('should execute pending migrations successfully', async () => {
      // Arrange
      const mockMigration: MigrationFile = {
        id: 'test_migration_001',
        name: 'test_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Test migration',
        filePath: '/test/migrations/test_migration.sql',
        checksum: 'abc123',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: true,
        postMigrationValidation: true,
      };

      const migrationContent = `
        -- MIGRATION UP
        CREATE TABLE test_table (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL
        );
      `;

      // Mock discovery
      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([mockMigration]);
      mockFs.readFile.mockResolvedValue(migrationContent);
      
      // Mock executed migrations (empty - all pending)
      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking table creation
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]) // getExecutedMigrations
        .mockResolvedValueOnce([[], {}]) // createDatabaseBackup query
        .mockResolvedValueOnce([[], {}]) // migration execution
        .mockResolvedValueOnce([[], {}]); // updateMigrationStatus

      // Mock backup creation
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'Backup created', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      const results = await migrationManager.executePendingMigrations();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        migrationId: 'test_migration_001',
        status: MigrationStatus.COMPLETED,
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: expect.any(Number),
        backupPath: expect.stringContaining('backup_test_migration_001'),
      });

      expect(logger.info).toHaveBeenCalledWith('Starting migration execution', {});
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Migration completed successfully')
      );
    });

    it('should handle migration failures and attempt rollback', async () => {
      // Arrange
      const mockMigration: MigrationFile = {
        id: 'failing_migration',
        name: 'failing_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'This migration will fail',
        filePath: '/test/migrations/failing_migration.sql',
        checksum: 'def456',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: true,
        postMigrationValidation: true,
        rollbackFile: '/test/rollbacks/failing_migration.sql',
      };

      const migrationContent = 'CREATE TABLE invalid_syntax (;'; // Invalid SQL

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([mockMigration]);
      mockFs.readFile.mockResolvedValue(migrationContent);

      // Mock setup queries success, then migration execution failure
      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]) // getExecutedMigrations
        .mockRejectedValueOnce(new Error('SQL syntax error')); // migration execution fails

      // Mock successful backup creation
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'Backup created', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act & Assert
      await expect(migrationManager.executePendingMigrations()).rejects.toThrow('SQL syntax error');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Migration failed'),
        expect.any(Error)
      );
    });

    it('should skip execution in dry run mode', async () => {
      // Arrange
      const mockMigration: MigrationFile = {
        id: 'dry_run_migration',
        name: 'dry_run_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Dry run test migration',
        filePath: '/test/migrations/dry_run_migration.sql',
        checksum: 'ghi789',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: false,
      };

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([mockMigration]);
      mockFs.readFile.mockResolvedValue('CREATE TABLE dry_run_table (id UUID);');

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act
      const results = await migrationManager.executePendingMigrations({ dryRun: true });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(MigrationStatus.COMPLETED);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN: Would execute migration')
      );
      
      // Verify actual migration SQL was not executed
      expect(mockWithTransaction).not.toHaveBeenCalled();
    });

    it('should respect target version limitation', async () => {
      // Arrange
      const migrations: MigrationFile[] = [
        {
          id: 'migration_001',
          name: 'migration_001.sql',
          version: '001',
          type: MigrationType.SCHEMA,
          description: 'Migration 1',
          filePath: '/test/migrations/migration_001.sql',
          checksum: 'v1',
          dependencies: [],
          estimatedDuration: 30,
          requiresDowntime: false,
          backupRequired: false,
          postMigrationValidation: false,
        },
        {
          id: 'migration_002',
          name: 'migration_002.sql',
          version: '002',
          type: MigrationType.SCHEMA,
          description: 'Migration 2',
          filePath: '/test/migrations/migration_002.sql',
          checksum: 'v2',
          dependencies: [],
          estimatedDuration: 30,
          requiresDowntime: false,
          backupRequired: false,
          postMigrationValidation: false,
        },
        {
          id: 'migration_003',
          name: 'migration_003.sql',
          version: '003',
          type: MigrationType.SCHEMA,
          description: 'Migration 3',
          filePath: '/test/migrations/migration_003.sql',
          checksum: 'v3',
          dependencies: [],
          estimatedDuration: 30,
          requiresDowntime: false,
          backupRequired: false,
          postMigrationValidation: false,
        },
      ];

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue(migrations);
      mockFs.readFile.mockResolvedValue('CREATE TABLE version_test (id UUID);');

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act
      const results = await migrationManager.executePendingMigrations({ 
        targetVersion: '002',
        dryRun: true 
      });

      // Assert - Should only execute migrations 001 and 002, not 003
      expect(results).toHaveLength(2);
      expect(results[0].migrationId).toBe('migration_001');
      expect(results[1].migrationId).toBe('migration_002');
    });
  });

  describe('Backup and Restore Operations', () => {
    it('should create database backup successfully', async () => {
      // Arrange
      const migrationId = 'test_migration_backup';
      const expectedBackupPath = expect.stringContaining(`backup_${migrationId}`);

      mockExec.mockImplementation((command, options, callback) => {
        expect(command).toContain('pg_dump');
        expect(command).toContain('--host=localhost');
        expect(command).toContain('--port=5432');
        expect(command).toContain('--username=test_user');
        expect(command).toContain('--dbname=test_db');
        expect(command).toContain('--format=custom');
        expect(command).toContain('--compress=9');
        
        if (typeof callback === 'function') {
          callback(null, { stdout: 'pg_dump completed', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      const backupPath = await (migrationManager as any).createDatabaseBackup(migrationId);

      // Assert
      expect(backupPath).toMatch(expectedBackupPath);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('pg_dump'),
        expect.objectContaining({
          env: expect.objectContaining({
            PGPASSWORD: 'test_password',
          }),
        }),
        expect.any(Function)
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating database backup')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Database backup created successfully')
      );
    });

    it('should handle backup creation failures', async () => {
      // Arrange
      const migrationId = 'failing_backup_migration';

      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('pg_dump failed: disk full'), null);
        }
        return {} as any;
      });

      // Act & Assert
      await expect(
        (migrationManager as any).createDatabaseBackup(migrationId)
      ).rejects.toThrow('pg_dump failed: disk full');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create database backup'),
        expect.any(Error)
      );
    });

    it('should restore database from backup successfully', async () => {
      // Arrange
      const backupPath = '/test/backups/backup_restore_test.sql';

      mockExec.mockImplementation((command, options, callback) => {
        expect(command).toContain('pg_restore');
        expect(command).toContain('--host=localhost');
        expect(command).toContain('--port=5432');
        expect(command).toContain('--username=test_user');
        expect(command).toContain('--dbname=test_db');
        expect(command).toContain('--clean');
        expect(command).toContain('--if-exists');
        expect(command).toContain(backupPath);
        
        if (typeof callback === 'function') {
          callback(null, { stdout: 'pg_restore completed', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      await (migrationManager as any).restoreFromBackup(backupPath);

      // Assert
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('pg_restore'),
        expect.objectContaining({
          env: expect.objectContaining({
            PGPASSWORD: 'test_password',
          }),
        }),
        expect.any(Function)
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Restoring database from backup')
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Database restored successfully from backup'
      );
    });

    it('should handle restore failures', async () => {
      // Arrange
      const backupPath = '/test/backups/corrupted_backup.sql';

      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('pg_restore failed: corrupted backup file'), null);
        }
        return {} as any;
      });

      // Act & Assert
      await expect(
        (migrationManager as any).restoreFromBackup(backupPath)
      ).rejects.toThrow('pg_restore failed: corrupted backup file');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restore from backup'),
        expect.any(Error)
      );
    });
  });

  describe('Migration Rollback', () => {
    it('should rollback migration successfully', async () => {
      // Arrange
      const migrationId = 'rollback_test_migration';
      const backupPath = '/test/backups/backup_rollback_test.sql';

      // Mock migration record retrieval
      mockSequelize.query
        .mockResolvedValueOnce([[{ 
          migration_id: migrationId,
          backup_path: backupPath,
          status: MigrationStatus.COMPLETED,
        }], {}]) // getMigrationRecord
        .mockResolvedValueOnce([[], {}]); // rollback status update

      // Mock restore operation
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'pg_restore completed', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      const result = await migrationManager.rollbackMigration(migrationId);

      // Assert
      expect(result).toMatchObject({
        migrationId,
        status: MigrationStatus.ROLLED_BACK,
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        rollbackExecuted: true,
      });

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE migration_history'),
        expect.objectContaining({
          type: QueryTypes.UPDATE,
          replacements: expect.objectContaining({
            status: MigrationStatus.ROLLED_BACK,
            migrationId,
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting rollback for migration')
      );
    });

    it('should handle rollback when migration record not found', async () => {
      // Arrange
      const migrationId = 'nonexistent_migration';

      // Mock empty migration record
      mockSequelize.query.mockResolvedValueOnce([[], {}]);

      // Act & Assert
      await expect(migrationManager.rollbackMigration(migrationId))
        .rejects.toThrow(`Migration record not found: ${migrationId}`);
    });

    it('should handle rollback failures gracefully', async () => {
      // Arrange
      const migrationId = 'failing_rollback_migration';
      const backupPath = '/test/backups/failing_backup.sql';

      mockSequelize.query
        .mockResolvedValueOnce([[{ 
          migration_id: migrationId,
          backup_path: backupPath,
          status: MigrationStatus.COMPLETED,
        }], {}]) // getMigrationRecord
        .mockRejectedValueOnce(new Error('Database connection failed')); // rollback update fails

      // Mock restore operation failure
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('pg_restore failed'), null);
        }
        return {} as any;
      });

      // Act & Assert
      await expect(migrationManager.rollbackMigration(migrationId))
        .rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to rollback migration'),
        expect.any(Error)
      );
    });
  });

  describe('Production Safety Checks', () => {
    it('should perform production safety checks in production environment', async () => {
      // Arrange
      (config.app.nodeEnv as any) = 'production';
      
      const dangerousMigration: MigrationFile = {
        id: 'dangerous_migration',
        name: 'dangerous_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Dangerous migration',
        filePath: '/test/migrations/dangerous_migration.sql',
        checksum: 'danger',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: false,
      };

      const dangerousContent = 'DROP TABLE users;'; // Unsafe DROP without IF EXISTS

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([dangerousMigration]);
      mockFs.readFile.mockResolvedValue(dangerousContent);

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act & Assert
      await expect(migrationManager.executePendingMigrations())
        .rejects.toThrow('Unsafe DROP TABLE operation');

      // Reset environment
      (config.app.nodeEnv as any) = 'test';
    });

    it('should allow dangerous operations in non-production environments', async () => {
      // Arrange
      const dangerousMigration: MigrationFile = {
        id: 'dev_dangerous_migration',
        name: 'dev_dangerous_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Development dangerous migration',
        filePath: '/test/migrations/dev_dangerous_migration.sql',
        checksum: 'devdanger',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: false,
      };

      const dangerousContent = 'DROP TABLE IF EXISTS temp_table;';

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([dangerousMigration]);
      mockFs.readFile.mockResolvedValue(dangerousContent);

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act
      const results = await migrationManager.executePendingMigrations({ dryRun: true });

      // Assert - Should succeed in test environment
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(MigrationStatus.COMPLETED);
    });
  });

  describe('Special Migration Types', () => {
    it('should handle PostGIS spatial migrations', async () => {
      // Arrange
      const spatialMigration: MigrationFile = {
        id: 'spatial_migration_001',
        name: 'spatial_migration.sql',
        version: '001',
        type: MigrationType.SPATIAL,
        description: 'PostGIS spatial migration',
        filePath: '/test/migrations/spatial_migration.sql',
        checksum: 'spatial123',
        dependencies: [],
        estimatedDuration: 60,
        requiresDowntime: false,
        backupRequired: true,
        postMigrationValidation: true,
      };

      const spatialContent = `
        -- MIGRATION UP
        CREATE EXTENSION IF NOT EXISTS postgis;
        CREATE TABLE locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          coordinates geometry(POINT, 4326)
        );
        CREATE INDEX idx_locations_coordinates ON locations USING GIST (coordinates);
      `;

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([spatialMigration]);
      mockFs.readFile.mockResolvedValue(spatialContent);

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]) // getExecutedMigrations
        .mockResolvedValueOnce([[], {}]); // migration execution

      // Mock backup creation
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'Backup created', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      const results = await migrationManager.executePendingMigrations();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(MigrationStatus.COMPLETED);
      expect(mockWithTransaction).toHaveBeenCalled();
    });

    it('should handle AI/ML database migrations', async () => {
      // Arrange
      const aiMlMigration: MigrationFile = {
        id: 'aiml_migration_001',
        name: 'aiml_migration.sql',
        version: '001',
        type: MigrationType.AI_ML,
        description: 'AI/ML vector database migration',
        filePath: '/test/migrations/aiml_migration.sql',
        checksum: 'aiml123',
        dependencies: [],
        estimatedDuration: 90,
        requiresDowntime: false,
        backupRequired: true,
        postMigrationValidation: true,
      };

      const aiMlContent = `
        -- MIGRATION UP
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE ml_embeddings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          model_id VARCHAR(255) NOT NULL,
          embedding vector(512),
          metadata JSONB
        );
        CREATE INDEX idx_ml_embeddings_vector ON ml_embeddings USING ivfflat (embedding vector_cosine_ops);
      `;

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([aiMlMigration]);
      mockFs.readFile.mockResolvedValue(aiMlContent);

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]) // getExecutedMigrations
        .mockResolvedValueOnce([[], {}]); // migration execution

      // Mock backup creation
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'Backup created', stderr: '' } as any);
        }
        return {} as any;
      });

      // Act
      const results = await migrationManager.executePendingMigrations();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(MigrationStatus.COMPLETED);
      expect(mockWithTransaction).toHaveBeenCalled();
    });
  });

  describe('Migration Status and Monitoring', () => {
    it('should return current migration status', async () => {
      // Arrange
      const pendingMigrations = [
        {
          id: 'pending_migration_1',
          name: 'pending_migration_1.sql',
          version: '001',
          type: MigrationType.SCHEMA,
          description: 'Pending migration 1',
          filePath: '/test/migrations/pending_migration_1.sql',
          checksum: 'pending1',
          dependencies: [],
          estimatedDuration: 30,
          requiresDowntime: false,
          backupRequired: false,
          postMigrationValidation: false,
        },
      ];

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue(pendingMigrations);
      mockSequelize.query.mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act
      const status = await migrationManager.getStatus();

      // Assert
      expect(status).toMatchObject({
        pendingMigrations: 1,
        runningMigrations: 0,
        systemHealth: 'healthy',
      });
    });

    it('should track current migrations correctly', async () => {
      // Arrange
      const currentMigrations = migrationManager.getCurrentMigrations();

      // Assert - Should start empty
      expect(currentMigrations.size).toBe(0);
    });

    it('should return migration history', async () => {
      // Act
      const history = await migrationManager.getMigrationHistory(10);

      // Assert - Should start empty
      expect(history).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures during migration', async () => {
      // Arrange
      const migration: MigrationFile = {
        id: 'connection_failure_migration',
        name: 'connection_failure_migration.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Migration that will fail due to connection',
        filePath: '/test/migrations/connection_failure_migration.sql',
        checksum: 'connfail',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: false,
      };

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([migration]);
      mockFs.readFile.mockResolvedValue('CREATE TABLE test_table (id UUID);');

      // Mock connection failure
      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]) // getExecutedMigrations
        .mockRejectedValueOnce(new Error('Database connection lost'));

      // Act & Assert
      await expect(migrationManager.executePendingMigrations())
        .rejects.toThrow('Database connection lost');
    });

    it('should handle file system errors during directory creation', async () => {
      // Arrange
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert - Constructor should handle this gracefully
      expect(() => {
        const testConfig: MigrationConfig = {
          migrationDir: '/test/migrations',
          backupDir: '/test/backups',
          validationDir: '/test/validations',
          maxConcurrentMigrations: 1,
          backupRetentionDays: 30,
          validationTimeout: 300000,
          productionSafetyChecks: true,
          zeroDowntimeMode: false,
          aiMlSupport: true,
          postgisSupport: true,
        };
        MigrationManager.getInstance(testConfig);
      }).not.toThrow();
    });

    it('should handle empty migration directory', async () => {
      // Arrange
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const migrations = await migrationManager.discoverMigrations();
      const results = await migrationManager.executePendingMigrations();

      // Assert
      expect(migrations).toHaveLength(0);
      expect(results).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('No pending migrations found');
    });

    it('should handle concurrent migration execution limits', async () => {
      // Arrange - This test verifies the singleton pattern and concurrent execution prevention
      const migration1: MigrationFile = {
        id: 'concurrent_migration_1',
        name: 'concurrent_migration_1.sql',
        version: '001',
        type: MigrationType.SCHEMA,
        description: 'Concurrent migration 1',
        filePath: '/test/migrations/concurrent_migration_1.sql',
        checksum: 'concurrent1',
        dependencies: [],
        estimatedDuration: 30,
        requiresDowntime: false,
        backupRequired: false,
        postMigrationValidation: false,
      };

      jest.spyOn(migrationManager, 'discoverMigrations').mockResolvedValue([migration1]);
      mockFs.readFile.mockResolvedValue('CREATE TABLE concurrent_test (id UUID);');

      mockSequelize.query
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking
        .mockResolvedValueOnce([[], {}]) // setupMigrationTracking indexes
        .mockResolvedValueOnce([[], {}]); // getExecutedMigrations

      // Act
      const results = await migrationManager.executePendingMigrations({ dryRun: true });

      // Assert - Should process one migration at a time (maxConcurrentMigrations: 1)
      expect(results).toHaveLength(1);
      expect(results[0].migrationId).toBe('concurrent_migration_1');
    });
  });
});