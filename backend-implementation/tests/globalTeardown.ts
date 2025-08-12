/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - GLOBAL TEST TEARDOWN
 * ============================================================================
 *
 * Global teardown executed once after all test suites.
 * Handles cleanup of test database, Redis, and other resources.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import Redis from 'ioredis';
import { promises as fs } from 'fs';
import { join } from 'path';

// Load test environment variables
config({ path: '.env.test' });

/**
 * Global test teardown function
 */
export default async (): Promise<void> => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clean up test database
    await cleanupTestDatabase();

    // Clean up test Redis
    await cleanupTestRedis();

    // Clean up test files
    await cleanupTestFiles();

    // Clean up mock services
    await cleanupMockServices();

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
    // Don't exit with error code for cleanup failures
  }
};

/**
 * Clean up test database
 */
async function cleanupTestDatabase(): Promise<void> {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASS || 'postgres';
  const testDbName = process.env.DB_NAME || 'waste_management_test';

  // Only cleanup if explicitly configured
  if (process.env.TEST_CLEANUP_ON_EXIT !== 'true') {
    console.log('⏭️  Skipping database cleanup (TEST_CLEANUP_ON_EXIT not set)');
    return;
  }

  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Terminate existing connections to the test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1 
        AND pid <> pg_backend_pid()
    `, [testDbName]);

    // Drop test database
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);

    console.log(`✅ Test database "${testDbName}" cleaned up successfully`);
  } catch (error) {
    console.warn(`⚠️  Database cleanup warning:`, error);
  } finally {
    await client.end();
  }
}

/**
 * Clean up test Redis
 */
async function cleanupTestRedis(): Promise<void> {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisDb = parseInt(process.env.REDIS_DB || '1', 10);

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    db: redisDb,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    
    // Clear test Redis database
    await redis.flushdb();
    
    console.log('✅ Test Redis cleaned up successfully');
  } catch (error) {
    console.warn('⚠️  Redis cleanup warning:', error);
  } finally {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  }
}

/**
 * Clean up test files
 */
async function cleanupTestFiles(): Promise<void> {
  try {
    const testUploadsDir = join(__dirname, '..', 'uploads');
    const testTempDir = join(__dirname, '..', 'temp');
    const testLogsDir = join(__dirname, '..', 'logs');

    // Clean up test upload files
    try {
      const uploadFiles = await fs.readdir(testUploadsDir);
      await Promise.all(
        uploadFiles.map(file => fs.unlink(join(testUploadsDir, file)))
      );
      console.log('✅ Test upload files cleaned up');
    } catch (error) {
      // Directory might not exist
    }

    // Clean up temporary files
    try {
      const tempFiles = await fs.readdir(testTempDir);
      await Promise.all(
        tempFiles.map(file => fs.unlink(join(testTempDir, file)))
      );
      console.log('✅ Test temporary files cleaned up');
    } catch (error) {
      // Directory might not exist
    }

    // Clean up test logs
    try {
      const logFiles = await fs.readdir(testLogsDir);
      const testLogFiles = logFiles.filter(file => file.includes('test'));
      await Promise.all(
        testLogFiles.map(file => fs.unlink(join(testLogsDir, file)))
      );
      console.log('✅ Test log files cleaned up');
    } catch (error) {
      // Directory might not exist
    }
  } catch (error) {
    console.warn('⚠️  File cleanup warning:', error);
  }
}

/**
 * Clean up mock services
 */
async function cleanupMockServices(): Promise<void> {
  try {
    // Reset global mock services
    if (global.mockServices) {
      global.mockServices = {
        payment: { baseUrl: '', enabled: false },
        sms: { baseUrl: '', enabled: false },
        email: { baseUrl: '', enabled: false },
        maps: { baseUrl: '', enabled: false },
      };
    }

    console.log('✅ Mock services cleaned up');
  } catch (error) {
    console.warn('⚠️  Mock services cleanup warning:', error);
  }
}

/**
 * Handle process cleanup
 */
process.on('exit', () => {
  console.log('🏁 Test process exiting...');
});

process.on('SIGINT', () => {
  console.log('⚡ Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚡ Received SIGTERM, cleaning up...');
  process.exit(0);
});