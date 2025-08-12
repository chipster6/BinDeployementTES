/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - E2E TEST SETUP
 * ============================================================================
 *
 * End-to-end test setup with full application lifecycle testing.
 * Includes database seeding, external service mocking, and complete workflows.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Express } from 'express';
import { Server } from 'http';
import { sequelize } from '@/config/database';
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { testFixtures } from '@tests/fixtures';
import { createApp } from '@/server';
import { logger } from '@/utils/logger';

// Extend timeout for E2E tests
jest.setTimeout(120000);

let app: Express;
let server: Server;

/**
 * Global setup for E2E tests
 */
beforeAll(async () => {
  try {
    logger.info('Setting up E2E test environment...');

    // Initialize test database
    await DatabaseTestHelper.initialize();

    // Create Express app
    app = createApp();

    // Start test server
    const port = process.env.TEST_PORT || 3002;
    server = app.listen(port, () => {
      logger.info(`E2E test server running on port ${port}`);
    });

    // Wait for server to start
    await new Promise<void>((resolve) => {
      server.on('listening', resolve);
    });

    // Ensure all models are synchronized
    await sequelize.sync({ force: true });

    // Create test database schemas
    await setupTestSchemas();

    // Seed essential test data
    await seedEssentialTestData();

    logger.info('E2E test environment setup completed');
  } catch (error) {
    logger.error('E2E test setup failed:', error);
    throw error;
  }
});

/**
 * Global teardown for E2E tests
 */
afterAll(async () => {
  try {
    logger.info('Tearing down E2E test environment...');

    // Close test server
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Clean up test data
    await testFixtures.cleanupAll();

    // Close database connections
    await DatabaseTestHelper.close();
    await sequelize.close();

    logger.info('E2E test environment teardown completed');
  } catch (error) {
    logger.error('E2E test teardown failed:', error);
  }
});

/**
 * Setup before each E2E test
 */
beforeEach(async () => {
  try {
    // Clean up any leftover test data from previous tests
    await testFixtures.cleanupAll();
    
    // Reset fixture counters for consistent test data
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

    // Seed fresh test data for each test
    await seedTestDataForCurrentTest();

  } catch (error) {
    logger.error('E2E test beforeEach setup failed:', error);
    throw error;
  }
});

/**
 * Cleanup after each E2E test
 */
afterEach(async () => {
  try {
    // Clean up test data created during the test
    await testFixtures.cleanupAll();

    // Clean up any test files or external resources
    await cleanupTestResources();

  } catch (error) {
    logger.error('E2E test afterEach cleanup failed:', error);
    // Don't throw to avoid masking test failures
  }
});

/**
 * Create test database schemas
 */
async function setupTestSchemas(): Promise<void> {
  try {
    // Create schemas if they don't exist
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS core');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS operations');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS analytics');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS audit');

    // Create PostGIS extensions if needed
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis');
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    } catch (error) {
      logger.warn('Could not create database extensions:', error);
    }

    logger.info('Test database schemas created successfully');
  } catch (error) {
    logger.error('Failed to create test database schemas:', error);
    throw error;
  }
}

/**
 * Seed essential test data that should exist for all tests
 */
async function seedEssentialTestData(): Promise<void> {
  try {
    // Create a default test organization
    const defaultOrg = await testFixtures.organizations.createOrganization({
      name: 'Default Test Organization',
      contactEmail: 'admin@testorg.com',
    });

    // Create essential user roles
    await testFixtures.users.createUser({
      email: 'system@test.com',
      password: 'SystemPassword123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'super_admin',
      organizationId: defaultOrg.id,
    });

    // Store for access in tests
    (global as any).testData = {
      defaultOrganization: defaultOrg,
    };

    logger.info('Essential test data seeded successfully');
  } catch (error) {
    logger.error('Failed to seed essential test data:', error);
    throw error;
  }
}

/**
 * Seed test data specific to current test context
 */
async function seedTestDataForCurrentTest(): Promise<void> {
  try {
    // This can be customized based on test context
    // For now, we'll create a basic dataset
    
    const currentTestName = expect.getState().currentTestName;
    
    if (currentTestName?.includes('route optimization')) {
      await testFixtures.createScenario('basic_route_optimization');
    } else if (currentTestName?.includes('customer management')) {
      await testFixtures.createScenario('customer_management');
    } else {
      // Create minimal test data
      await testFixtures.createFullTestDataset();
    }

    logger.debug(`Test data seeded for: ${currentTestName}`);
  } catch (error) {
    logger.error('Failed to seed test data for current test:', error);
    throw error;
  }
}

/**
 * Clean up test resources (files, external services, etc.)
 */
async function cleanupTestResources(): Promise<void> {
  try {
    // Clean up any temporary files created during tests
    // This would include uploaded files, generated reports, etc.
    
    // Reset any external service mocks
    if ((global as any).mockServices) {
      // Reset mock services to initial state
      Object.keys((global as any).mockServices).forEach(service => {
        (global as any).mockServices[service].reset?.();
      });
    }

    // Clear any cached data
    // This would clear Redis cache, file cache, etc.

    logger.debug('Test resources cleaned up');
  } catch (error) {
    logger.error('Failed to clean up test resources:', error);
  }
}

/**
 * Get test app instance for E2E tests
 */
export function getTestApp(): Express {
  if (!app) {
    throw new Error('Test app not initialized. Make sure E2E setup has run.');
  }
  return app;
}

/**
 * Get test server instance
 */
export function getTestServer(): Server {
  if (!server) {
    throw new Error('Test server not initialized. Make sure E2E setup has run.');
  }
  return server;
}

/**
 * Helper to wait for async operations in E2E tests
 */
export async function waitForOperation(
  operation: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await operation()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Operation timed out after ${timeout}ms`);
}

/**
 * Helper to simulate external service delays
 */
export async function simulateNetworkDelay(ms: number = 100): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  getTestApp,
  getTestServer,
  waitForOperation,
  simulateNetworkDelay,
};