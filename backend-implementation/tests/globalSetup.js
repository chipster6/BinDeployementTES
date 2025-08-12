/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - GLOBAL TEST SETUP
 * ============================================================================
 *
 * Global setup executed once before all test suites.
 * Handles test database creation, migrations, and initial configuration.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

const { config } = require('dotenv');
const { execSync } = require('child_process');
const { Client } = require('pg');
const Redis = require('ioredis');

// Load test environment variables
config({ path: '.env.test' });

/**
 * Global test setup function
 */
async function globalSetup() {
  console.log('[TEST SETUP] Setting up test environment...');

  try {
    // Set up test database
    await setupTestDatabase();

    // Set up test Redis
    await setupTestRedis();

    // Run database migrations
    await runTestMigrations();

    // Set up mock services
    await setupMockServices();

    console.log('[TEST SETUP] Test environment setup complete');
  } catch (error) {
    console.error('[TEST SETUP] Test environment setup failed:', error);
    process.exit(1);
  }
}

/**
 * Set up test database
 */
async function setupTestDatabase() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASS || 'postgres';
  const testDbName = process.env.DB_NAME || 'waste_management_test';

  // Connect to PostgreSQL server (not specific database)
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await client.connect();

    // Drop test database if it exists
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);

    // Create test database
    await client.query(`CREATE DATABASE "${testDbName}"`);

    console.log(`[TEST SETUP] Test database "${testDbName}" created successfully`);
  } catch (error) {
    console.warn(`[TEST SETUP] Database setup warning:`, error);
    // Continue if database already exists or permission issues
  } finally {
    await client.end();
  }

  // Connect to the test database to set up extensions
  const testClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: testDbName,
  });

  try {
    await testClient.connect();

    // Create required extensions
    await testClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await testClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await testClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    console.log('[TEST SETUP] Database extensions created successfully');
  } catch (error) {
    console.warn('[TEST SETUP] Extension setup warning:', error);
  } finally {
    await testClient.end();
  }
}

/**
 * Set up test Redis
 */
async function setupTestRedis() {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisDb = parseInt(process.env.REDIS_DB || '1', 10);

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    db: redisDb,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    
    // Clear test Redis database
    await redis.flushdb();
    
    console.log('[TEST SETUP] Test Redis setup complete');
  } catch (error) {
    console.warn('[TEST SETUP] Redis setup warning:', error);
    // Continue without Redis if not available
  } finally {
    await redis.disconnect();
  }
}

/**
 * Run database migrations for testing
 */
async function runTestMigrations() {
  try {
    // Note: In a real implementation, you would run Sequelize migrations here
    // For this example, we'll use model sync in the test setup
    console.log('[TEST SETUP] Database migrations will be handled by Sequelize sync in tests');
  } catch (error) {
    console.error('[TEST SETUP] Migration setup failed:', error);
    throw error;
  }
}

/**
 * Set up mock services for testing
 */
async function setupMockServices() {
  try {
    // Create mock service configurations
    global.mockServices = {
      payment: {
        baseUrl: process.env.MOCK_PAYMENT_SERVICE_URL || 'http://localhost:3003',
        enabled: true,
      },
      sms: {
        baseUrl: process.env.MOCK_SMS_SERVICE_URL || 'http://localhost:3004',
        enabled: true,
      },
      email: {
        baseUrl: process.env.MOCK_EMAIL_SERVICE_URL || 'http://localhost:3005',
        enabled: true,
      },
      maps: {
        baseUrl: process.env.MOCK_MAPS_SERVICE_URL || 'http://localhost:3006',
        enabled: true,
      },
    };

    console.log('[TEST SETUP] Mock services configured');
  } catch (error) {
    console.error('[TEST SETUP] Mock services setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;