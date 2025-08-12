/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE TEST HELPER
 * ============================================================================
 *
 * Database testing utilities for setup, teardown, and transaction management.
 * Provides isolated test database operations and cleanup.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Sequelize, Transaction } from 'sequelize';
import { database } from '@/config/database';
import { testConfig } from '@tests/setup';
import { logger } from '@/utils/logger';

export class DatabaseTestHelper {
  private static testSequelize: Sequelize;
  private static isInitialized = false;

  /**
   * Initialize test database connection
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create test-specific Sequelize instance
      this.testSequelize = new Sequelize({
        ...testConfig.database,
        logging: false, // Disable SQL logging for tests
        sync: { force: true }, // Always reset tables for tests
      });

      // Test connection
      await this.testSequelize.authenticate();

      // Sync all models
      await this.testSequelize.sync({ force: true });

      this.isInitialized = true;
      logger.info('Test database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize test database:', error);
      throw error;
    }
  }

  /**
   * Get test database instance
   */
  public static getDatabase(): Sequelize {
    if (!this.isInitialized) {
      throw new Error('Test database not initialized. Call initialize() first.');
    }
    return this.testSequelize;
  }

  /**
   * Create a test transaction
   */
  public static async createTransaction(): Promise<Transaction> {
    return await this.testSequelize.transaction();
  }

  /**
   * Clean up test database
   */
  public static async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Truncate all tables in reverse dependency order
      const models = this.testSequelize.models;
      const tableNames = Object.keys(models);
      
      // Disable foreign key constraints temporarily
      await this.testSequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Truncate all tables
      for (const tableName of tableNames) {
        await this.testSequelize.query(`TRUNCATE TABLE ${tableName}`);
      }
      
      // Re-enable foreign key constraints
      await this.testSequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      
      logger.debug('Test database cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup test database:', error);
      throw error;
    }
  }

  /**
   * Reset database to initial state
   */
  public static async reset(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.testSequelize.sync({ force: true });
      logger.debug('Test database reset');
    } catch (error) {
      logger.error('Failed to reset test database:', error);
      throw error;
    }
  }

  /**
   * Close test database connection
   */
  public static async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.testSequelize.close();
      this.isInitialized = false;
      logger.info('Test database connection closed');
    } catch (error) {
      logger.error('Failed to close test database connection:', error);
    }
  }

  /**
   * Execute a function within a transaction that will be rolled back
   */
  public static async withRollbackTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await this.createTransaction();
    
    try {
      const result = await callback(transaction);
      await transaction.rollback();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get table row count for testing
   */
  public static async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.testSequelize.query(
      `SELECT COUNT(*) as count FROM ${tableName}`,
      { type: 'SELECT' }
    );
    return (result[0] as any).count;
  }

  /**
   * Check if table exists
   */
  public static async tableExists(tableName: string): Promise<boolean> {
    try {
      await this.testSequelize.query(
        `SELECT 1 FROM ${tableName} LIMIT 1`,
        { type: 'SELECT' }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all table names
   */
  public static async getTableNames(): Promise<string[]> {
    const result = await this.testSequelize.query(
      'SHOW TABLES',
      { type: 'SELECT' }
    );
    return result.map((row: any) => Object.values(row)[0] as string);
  }

  /**
   * Execute raw SQL query for testing
   */
  public static async query(sql: string, replacements?: any): Promise<any> {
    return await this.testSequelize.query(sql, {
      replacements,
      type: 'SELECT',
    });
  }

  /**
   * Seed test data from fixtures
   */
  public static async seedTestData(): Promise<void> {
    // This would typically load fixtures or seed data
    // For now, just ensure tables are ready
    await this.testSequelize.sync({ alter: true });
  }

  /**
   * Get database statistics for debugging
   */
  public static async getDatabaseStats(): Promise<any> {
    const tables = await this.getTableNames();
    const stats: any = {};

    for (const table of tables) {
      stats[table] = await this.getTableRowCount(table);
    }

    return stats;
  }
}

/**
 * Database test utilities for common operations
 */
export class DatabaseTestUtils {
  /**
   * Wait for database operation to complete
   */
  public static async waitForDatabase(
    operation: () => Promise<any>,
    maxAttempts: number = 10,
    delayMs: number = 100
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`Database operation failed after ${maxAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Assert table has specific row count
   */
  public static async assertTableRowCount(
    tableName: string,
    expectedCount: number
  ): Promise<void> {
    const actualCount = await DatabaseTestHelper.getTableRowCount(tableName);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${tableName} to have ${expectedCount} rows, but found ${actualCount}`
      );
    }
  }

  /**
   * Assert database is empty
   */
  public static async assertDatabaseEmpty(): Promise<void> {
    const stats = await DatabaseTestHelper.getDatabaseStats();
    const nonEmptyTables = Object.entries(stats)
      .filter(([, count]) => count > 0)
      .map(([table]) => table);

    if (nonEmptyTables.length > 0) {
      throw new Error(
        `Expected database to be empty, but found data in: ${nonEmptyTables.join(', ')}`
      );
    }
  }
}

export default DatabaseTestHelper;