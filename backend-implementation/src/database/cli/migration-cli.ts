#!/usr/bin/env node
/**
 * ============================================================================
 * DATABASE MIGRATION CLI TOOL
 * ============================================================================
 *
 * Command-line interface for the automated database migration system.
 * Provides production-safe migration management with comprehensive validation,
 * backup/restore, and deployment pipeline integration.
 *
 * Features:
 * - Interactive migration management
 * - Production safety checks and dry-run capabilities
 * - Backup creation and restoration
 * - Migration status and history
 * - Docker deployment integration
 * - Zero-downtime deployment support
 *
 * Created by: Database-Architect
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { migrationManager } from '../MigrationManager';
import { migrationValidator } from '../MigrationValidator';
import { backupService } from '../BackupService';
import { logger } from '@/utils/logger';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

/**
 * Configure CLI program
 */
program
  .name('migration-cli')
  .description('Production-ready database migration management')
  .version('1.0.0');

/**
 * Migration Commands
 */

// Run pending migrations
program
  .command('migrate')
  .description('Execute pending database migrations')
  .option('-d, --dry-run', 'Perform a dry run without executing migrations')
  .option('-t, --target <version>', 'Migrate to specific version')
  .option('--skip-validation', 'Skip pre-migration validation')
  .option('--force-backup', 'Force backup creation even if not required')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🚀 Database Migration Tool\n'));
      
      const spinner = ora('Discovering pending migrations...').start();
      const pendingMigrations = await migrationManager.discoverMigrations();
      spinner.succeed(`Found ${pendingMigrations.length} migration files`);
      
      if (pendingMigrations.length === 0) {
        console.log(chalk.green('✅ No pending migrations found. Database is up to date.'));
        return;
      }
      
      // Display pending migrations
      console.log(chalk.yellow('\nPending Migrations:'));
      const migrationTable = new Table({
        head: ['ID', 'Type', 'Description', 'Estimated Duration', 'Requires Downtime'],
        colWidths: [25, 15, 40, 18, 18],
      });
      
      for (const migration of pendingMigrations) {
        migrationTable.push([
          migration.id,
          migration.type,
          migration.description || 'No description',
          `${migration.estimatedDuration}s`,
          migration.requiresDowntime ? chalk.red('Yes') : chalk.green('No'),
        ]);
      }
      console.log(migrationTable.toString());
      
      // Confirmation prompt
      if (!options.yes && !options.dryRun) {
        const { confirmMigration } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmMigration',
            message: 'Do you want to proceed with these migrations?',
            default: false,
          },
        ]);
        
        if (!confirmMigration) {
          console.log(chalk.yellow('Migration cancelled.'));
          return;
        }
      }
      
      // Execute migrations
      const executionSpinner = ora('Executing migrations...').start();
      
      try {
        const results = await migrationManager.executePendingMigrations({
          dryRun: options.dryRun,
          targetVersion: options.target,
          skipValidation: options.skipValidation,
          forceBackup: options.forceBackup,
        });
        
        executionSpinner.succeed('Migration execution completed');
        
        // Display results
        console.log(chalk.green('\n✅ Migration Results:'));
        const resultTable = new Table({
          head: ['Migration ID', 'Status', 'Duration', 'Backup Created'],
          colWidths: [25, 15, 12, 18],
        });
        
        for (const result of results) {
          const statusColor = result.status === 'completed' ? chalk.green : 
                            result.status === 'failed' ? chalk.red : chalk.yellow;
          
          resultTable.push([
            result.migrationId,
            statusColor(result.status),
            `${result.duration}s`,
            result.backupPath ? chalk.green('Yes') : chalk.gray('No'),
          ]);
        }
        console.log(resultTable.toString());
        
      } catch (error) {
        executionSpinner.fail('Migration execution failed');
        console.error(chalk.red('\n❌ Migration Error:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ CLI Error:'), error);
      process.exit(1);
    }
  });

// Validate migrations
program
  .command('validate')
  .description('Validate migration files without executing them')
  .option('-f, --file <path>', 'Validate specific migration file')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🔍 Migration Validation\n'));
      
      if (options.file) {
        // Validate single file
        const spinner = ora(`Validating migration: ${options.file}`).start();
        
        try {
          const content = await fs.readFile(options.file, 'utf-8');
          const migrationId = path.basename(options.file, path.extname(options.file));
          
          const analysis = await migrationValidator.validateMigration(migrationId, content, options.file);
          spinner.succeed('Validation completed');
          
          // Display results
          displayValidationResults(analysis);
          
        } catch (error) {
          spinner.fail('Validation failed');
          console.error(chalk.red(error instanceof Error ? error.message : String(error)));
          process.exit(1);
        }
        
      } else {
        // Validate all pending migrations
        const spinner = ora('Validating all pending migrations...').start();
        
        const migrations = await migrationManager.discoverMigrations();
        spinner.text = `Validating ${migrations.length} migrations...`;
        
        let allValid = true;
        
        for (const migration of migrations) {
          try {
            const content = await fs.readFile(migration.filePath, 'utf-8');
            const analysis = await migrationValidator.validateMigration(migration.id, content, migration.filePath);
            
            const hasErrors = analysis.validationResults.some(r => r.severity === 'error' || r.severity === 'critical');
            if (hasErrors) {
              allValid = false;
            }
            
            console.log(`\n${chalk.cyan('Migration:')} ${migration.id}`);
            displayValidationResults(analysis);
            
          } catch (error) {
            allValid = false;
            console.error(chalk.red(`\nValidation failed for ${migration.id}:`), error);
          }
        }
        
        if (allValid) {
          spinner.succeed('All migrations validated successfully');
        } else {
          spinner.fail('Some migrations have validation issues');
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Validation Error:'), error);
      process.exit(1);
    }
  });

// Create backup
program
  .command('backup')
  .description('Create database backup')
  .option('-t, --type <type>', 'Backup type (full|incremental)', 'full')
  .option('-d, --description <description>', 'Backup description')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n💾 Database Backup\n'));
      
      const spinner = ora('Creating database backup...').start();
      
      const backup = await backupService.createFullBackup({
        description: options.description,
        tags: options.tags ? options.tags.split(',') : [],
      });
      
      spinner.succeed('Backup created successfully');
      
      console.log(chalk.green('\n✅ Backup Details:'));
      console.log(`ID: ${backup.id}`);
      console.log(`File: ${backup.fileName}`);
      console.log(`Size: ${formatFileSize(backup.fileSize)}`);
      console.log(`Duration: ${backup.duration}s`);
      console.log(`Path: ${backup.filePath}`);
      
    } catch (error) {
      console.error(chalk.red('❌ Backup Error:'), error);
      process.exit(1);
    }
  });

// Restore from backup
program
  .command('restore <backupId>')
  .description('Restore database from backup')
  .option('--target-db <database>', 'Target database name')
  .option('--create-db', 'Create target database if it doesn\'t exist')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (backupId, options) => {
    try {
      console.log(chalk.blue.bold('\n🔄 Database Restore\n'));
      
      if (!options.yes) {
        const { confirmRestore } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmRestore',
            message: chalk.red('This will overwrite the target database. Are you sure?'),
            default: false,
          },
        ]);
        
        if (!confirmRestore) {
          console.log(chalk.yellow('Restore cancelled.'));
          return;
        }
      }
      
      const spinner = ora('Restoring database from backup...').start();
      
      const result = await backupService.restoreFromBackup(backupId, {
        targetDatabase: options.targetDb,
        createDatabase: options.createDb,
      });
      
      spinner.succeed('Database restored successfully');
      
      console.log(chalk.green('\n✅ Restore Results:'));
      console.log(`Duration: ${result.duration}s`);
      console.log(`Restored Tables: ${result.restoredTables.length}`);
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Restore Error:'), error);
      process.exit(1);
    }
  });

// Show migration status
program
  .command('status')
  .description('Show migration status and history')
  .action(async () => {
    try {
      console.log(chalk.blue.bold('\n📊 Migration Status\n'));
      
      const status = await migrationManager.getStatus();
      const history = await migrationManager.getMigrationHistory(10);
      const backupStats = await backupService.getBackupStats();
      
      // System status
      console.log(chalk.cyan('System Status:'));
      console.log(`Pending Migrations: ${status.pendingMigrations}`);
      console.log(`Running Migrations: ${status.runningMigrations}`);
      console.log(`Last Migration: ${status.lastMigration || 'None'}`);
      console.log(`System Health: ${getHealthStatusColor(status.systemHealth)}`);
      
      // Recent migration history
      if (history.length > 0) {
        console.log(chalk.cyan('\nRecent Migration History:'));
        const historyTable = new Table({
          head: ['Migration ID', 'Status', 'Duration', 'Started At'],
          colWidths: [25, 15, 12, 20],
        });
        
        for (const migration of history) {
          const statusColor = migration.status === 'completed' ? chalk.green : 
                            migration.status === 'failed' ? chalk.red : chalk.yellow;
          
          historyTable.push([
            migration.migrationId,
            statusColor(migration.status),
            `${migration.duration || 0}s`,
            migration.startTime.toLocaleString(),
          ]);
        }
        console.log(historyTable.toString());
      }
      
      // Backup statistics
      console.log(chalk.cyan('\nBackup Statistics:'));
      console.log(`Total Backups: ${backupStats.totalBackups}`);
      console.log(`Total Size: ${formatFileSize(backupStats.totalSize)}`);
      console.log(`Success Rate: ${backupStats.successRate.toFixed(1)}%`);
      console.log(`Last Backup: ${backupStats.lastBackupTime?.toLocaleString() || 'None'}`);
      
    } catch (error) {
      console.error(chalk.red('❌ Status Error:'), error);
      process.exit(1);
    }
  });

// Rollback migration
program
  .command('rollback <migrationId>')
  .description('Rollback a specific migration')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (migrationId, options) => {
    try {
      console.log(chalk.blue.bold('\n⏪ Migration Rollback\n'));
      
      if (!options.yes) {
        const { confirmRollback } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmRollback',
            message: chalk.red(`Are you sure you want to rollback migration: ${migrationId}?`),
            default: false,
          },
        ]);
        
        if (!confirmRollback) {
          console.log(chalk.yellow('Rollback cancelled.'));
          return;
        }
      }
      
      const spinner = ora('Rolling back migration...').start();
      
      const result = await migrationManager.rollbackMigration(migrationId);
      
      spinner.succeed('Migration rolled back successfully');
      
      console.log(chalk.green('\n✅ Rollback Results:'));
      console.log(`Migration ID: ${result.migrationId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Rollback Executed: ${result.rollbackExecuted ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error(chalk.red('❌ Rollback Error:'), error);
      process.exit(1);
    }
  });

/**
 * Helper Functions
 */

function displayValidationResults(analysis: any): void {
  console.log(`Risk Score: ${getRiskScoreColor(analysis.riskScore)} (${analysis.riskScore}/100)`);
  console.log(`Complexity: ${getComplexityColor(analysis.complexity)}`);
  console.log(`Estimated Duration: ${analysis.estimatedDuration}s`);
  console.log(`Requires Downtime: ${analysis.requiresDowntime ? chalk.red('Yes') : chalk.green('No')}`);
  
  if (analysis.validationResults.length > 0) {
    console.log('\nValidation Results:');
    
    const validationTable = new Table({
      head: ['Category', 'Test', 'Status', 'Message'],
      colWidths: [15, 25, 10, 40],
    });
    
    for (const result of analysis.validationResults) {
      const statusColor = result.status === 'passed' ? chalk.green : 
                         result.status === 'failed' ? chalk.red : chalk.yellow;
      
      validationTable.push([
        result.category,
        result.testName,
        statusColor(result.status),
        result.message,
      ]);
    }
    
    console.log(validationTable.toString());
  }
}

function getRiskScoreColor(score: number): string {
  if (score >= 75) return chalk.red.bold(score);
  if (score >= 50) return chalk.yellow.bold(score);
  if (score >= 25) return chalk.blue.bold(score);
  return chalk.green.bold(score);
}

function getComplexityColor(complexity: string): string {
  switch (complexity) {
    case 'critical': return chalk.red.bold(complexity);
    case 'high': return chalk.yellow.bold(complexity);
    case 'medium': return chalk.blue.bold(complexity);
    default: return chalk.green.bold(complexity);
  }
}

function getHealthStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return chalk.green(status);
    case 'warning': return chalk.yellow(status);
    case 'critical': return chalk.red(status);
    default: return chalk.gray(status);
  }
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Error handling
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}