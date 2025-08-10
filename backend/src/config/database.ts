/**
 * Database Configuration and Connection
 * PostgreSQL database setup with connection pooling, logging, and health checks
 */

import knex, { Knex } from 'knex';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Database configuration object
 */
const databaseConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    connectionString: config.database.url,
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false,
  },
  acquireConnectionTimeout: 30000,
  migrations: {
    directory: './migrations',
    tableName: 'migration_history',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
  },
  debug: config.env === 'development',
  log: {
    warn(message: string) {
      logger.warn('Database warning', { message, component: 'database' });
    },
    error(message: string) {
      logger.error('Database error', { message, component: 'database' });
    },
    deprecate(message: string) {
      logger.warn('Database deprecation', { message, component: 'database' });
    },
    debug(message: string) {
      if (config.env === 'development') {
        logger.debug('Database debug', { message, component: 'database' });
      }
    },
  },
};

/**
 * Create database connection instance
 */
export const database = knex(databaseConfig);

/**
 * Database utility functions
 */
export class DatabaseUtils {
  /**
   * Test database connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      await database.raw('SELECT 1 as test');
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error, { component: 'database' });
      return false;
    }
  }

  /**
   * Get database health information
   */
  static async getHealthInfo(): Promise<{
    status: 'healthy' | 'unhealthy';
    connections: number;
    version: string;
    uptime: number;
  }> {
    try {
      // Check basic connectivity
      const [connectivityResult, versionResult, statsResult] = await Promise.all([
        database.raw('SELECT 1 as test'),
        database.raw('SELECT version() as version'),
        database.raw(`
          SELECT 
            extract(epoch from now() - pg_postmaster_start_time()) as uptime_seconds
        `)
      ]);

      // Get current connection count
      const poolStats = (database as any).client.pool;
      const connections = poolStats ? poolStats.numUsed() : 0;

      return {
        status: 'healthy',
        connections,
        version: versionResult.rows[0]?.version || 'unknown',
        uptime: Math.floor(statsResult.rows[0]?.uptime_seconds || 0),
      };
    } catch (error) {
      logger.error('Failed to get database health info:', error, { component: 'database' });
      return {
        status: 'unhealthy',
        connections: 0,
        version: 'unknown',
        uptime: 0,
      };
    }
  }

  /**
   * Run database migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...', { component: 'database' });
      const [batchNo, migrations] = await database.migrate.latest();
      
      if (migrations.length === 0) {
        logger.info('No pending migrations', { component: 'database' });
      } else {
        logger.info('Migrations completed', {
          component: 'database',
          batch: batchNo,
          migrations: migrations.length,
          files: migrations
        });
      }
    } catch (error) {
      logger.error('Migration failed:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Rollback database migrations
   */
  static async rollbackMigrations(steps: number = 1): Promise<void> {
    try {
      logger.info(`Rolling back ${steps} migration(s)...`, { component: 'database' });
      const [batchNo, migrations] = await database.migrate.rollback(undefined, false);
      
      logger.info('Migrations rolled back', {
        component: 'database',
        batch: batchNo,
        migrations: migrations.length,
        files: migrations
      });
    } catch (error) {
      logger.error('Migration rollback failed:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  static async runSeeds(): Promise<void> {
    try {
      logger.info('Running database seeds...', { component: 'database' });
      const seeds = await database.seed.run();
      
      logger.info('Seeds completed', {
        component: 'database',
        files: seeds[0]
      });
    } catch (error) {
      logger.error('Seeding failed:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static async closeConnection(): Promise<void> {
    try {
      await database.destroy();
      logger.info('Database connection closed', { component: 'database' });
    } catch (error) {
      logger.error('Error closing database connection:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Execute raw SQL with logging
   */
  static async executeRaw(sql: string, bindings?: any[]): Promise<any> {
    try {
      logger.debug('Executing raw SQL', { sql, bindings, component: 'database' });
      return await database.raw(sql, bindings);
    } catch (error) {
      logger.error('Raw SQL execution failed:', error, { sql, bindings, component: 'database' });
      throw error;
    }
  }

  /**
   * Get current database statistics
   */
  static async getStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    databaseSize: string;
    tableStats: Array<{
      table: string;
      rows: number;
      size: string;
    }>;
  }> {
    try {
      // Connection statistics
      const connectionStats = await database.raw(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Database size
      const sizeResult = await database.raw(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
      `);

      // Table statistics for core tables
      const tableStats = await database.raw(`
        SELECT 
          schemaname || '.' || tablename as table_name,
          n_live_tup as estimated_rows,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables
        WHERE schemaname IN ('core', 'security', 'audit', 'analytics', 'integration')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      return {
        totalConnections: parseInt(connectionStats.rows[0]?.total_connections || '0'),
        activeConnections: parseInt(connectionStats.rows[0]?.active_connections || '0'),
        idleConnections: parseInt(connectionStats.rows[0]?.idle_connections || '0'),
        databaseSize: sizeResult.rows[0]?.database_size || 'unknown',
        tableStats: tableStats.rows.map((row: any) => ({
          table: row.table_name,
          rows: parseInt(row.estimated_rows || '0'),
          size: row.size || 'unknown',
        })),
      };
    } catch (error) {
      logger.error('Failed to get database statistics:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Encrypt sensitive data using database function
   */
  static async encryptData(plaintext: string): Promise<string> {
    try {
      const result = await database.raw(
        'SELECT security.encrypt_sensitive_data(?) as encrypted_data',
        [plaintext]
      );
      return result.rows[0]?.encrypted_data;
    } catch (error) {
      logger.error('Data encryption failed:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Decrypt sensitive data using database function
   */
  static async decryptData(encryptedData: string): Promise<string> {
    try {
      const result = await database.raw(
        'SELECT security.decrypt_sensitive_data(?) as decrypted_data',
        [encryptedData]
      );
      return result.rows[0]?.decrypted_data;
    } catch (error) {
      logger.error('Data decryption failed:', error, { component: 'database' });
      throw error;
    }
  }

  /**
   * Log data access for audit trail
   */
  static async logDataAccess(
    tableName: string,
    recordId: string,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    userId: string,
    sensitiveDataAccessed: boolean = false
  ): Promise<void> {
    try {
      await database.raw(
        'SELECT audit.log_data_access(?, ?, ?, ?, ?)',
        [tableName, recordId, action, userId, sensitiveDataAccessed]
      );
    } catch (error) {
      logger.error('Failed to log data access:', error, { 
        component: 'database',
        tableName,
        recordId,
        action,
        userId 
      });
      // Don't throw here to avoid breaking the main operation
    }
  }
}

// Set up connection event listeners
database.on('query', (queryData) => {
  if (config.env === 'development') {
    logger.debug('Database query', {
      component: 'database',
      sql: queryData.sql,
      bindings: queryData.bindings,
      duration: queryData.__knexQueryUid
    });
  }
});

database.on('query-error', (error, queryData) => {
  logger.error('Database query error', {
    component: 'database',
    error: error.message,
    sql: queryData.sql,
    bindings: queryData.bindings
  });
});

// Test connection on startup
DatabaseUtils.testConnection().then(isConnected => {
  if (isConnected) {
    logger.info('Database connection established successfully', { component: 'database' });
  } else {
    logger.error('Failed to establish database connection', { component: 'database' });
  }
}).catch(error => {
  logger.error('Database connection test failed:', error, { component: 'database' });
});

export default database;