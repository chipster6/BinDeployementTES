/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - INTEGRATION TEST SETUP
 * ============================================================================
 *
 * Setup and teardown for integration tests. Manages database connections,
 * model synchronization, and test data lifecycle.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { sequelize } from '@/config/database';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { testFixtures } from '@tests/fixtures';
import { logger } from '@/utils/logger';

// Extend timeout for integration tests
jest.setTimeout(60000);

/**
 * Global setup for integration tests
 */
beforeAll(async () => {
  try {
    // Initialize test database
    await DatabaseTestHelper.initialize();

    // Ensure all models are synchronized
    await sequelize.sync({ force: true });

    // Create database schemas if they don't exist
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS core');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS operations');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS analytics');

    logger.info('Integration test setup completed');
  } catch (error) {
    logger.error('Integration test setup failed:', error);
    throw error;
  }
});

/**
 * Global teardown for integration tests
 */
afterAll(async () => {
  try {
    // Clean up all test data
    await testFixtures.cleanupAll();

    // Close database connections
    await DatabaseTestHelper.close();
    await sequelize.close();

    logger.info('Integration test teardown completed');
  } catch (error) {
    logger.error('Integration test teardown failed:', error);
  }
});

/**
 * Setup before each integration test
 */
beforeEach(async () => {
  try {
    // Clean up any leftover test data
    await testFixtures.cleanupAll();
    
    // Reset fixture counters
    testFixtures.users.resetCounter();
    testFixtures.organizations.resetCounter();
    testFixtures.customers.resetCounter();
    testFixtures.bins.resetCounter();
    testFixtures.vehicles.resetCounter();
    testFixtures.drivers.resetCounter();
    testFixtures.routes.resetCounter();
    testFixtures.serviceEvents.resetCounter();
    testFixtures.auditLogs.resetCounter();
    testFixtures.userSessions.resetCounter();

  } catch (error) {
    logger.error('Integration test beforeEach setup failed:', error);
    throw error;
  }
});

/**
 * Cleanup after each integration test
 */
afterEach(async () => {
  try {
    // Clean up test data created during the test
    await testFixtures.cleanupAll();
  } catch (error) {
    logger.error('Integration test afterEach cleanup failed:', error);
    // Don't throw to avoid masking test failures
  }
});

export default {};