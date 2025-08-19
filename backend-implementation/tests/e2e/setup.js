"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestApp = getTestApp;
exports.getTestServer = getTestServer;
exports.waitForOperation = waitForOperation;
exports.simulateNetworkDelay = simulateNetworkDelay;
const database_1 = require("@/config/database");
const DatabaseTestHelper_1 = require("@tests/helpers/DatabaseTestHelper");
const fixtures_1 = require("@tests/fixtures");
const server_1 = require("@/server");
const logger_1 = require("@/utils/logger");
jest.setTimeout(120000);
let app;
let server;
beforeAll(async () => {
    try {
        logger_1.logger.info('Setting up E2E test environment...');
        await DatabaseTestHelper_1.DatabaseTestHelper.initialize();
        app = (0, server_1.createApp)();
        const port = process.env.TEST_PORT || 3002;
        server = app.listen(port, () => {
            logger_1.logger.info(`E2E test server running on port ${port}`);
        });
        await new Promise((resolve) => {
            server.on('listening', resolve);
        });
        await database_1.sequelize.sync({ force: true });
        await setupTestSchemas();
        await seedEssentialTestData();
        logger_1.logger.info('E2E test environment setup completed');
    }
    catch (error) {
        logger_1.logger.error('E2E test setup failed:', error);
        throw error;
    }
});
afterAll(async () => {
    try {
        logger_1.logger.info('Tearing down E2E test environment...');
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        await fixtures_1.testFixtures.cleanupAll();
        await DatabaseTestHelper_1.DatabaseTestHelper.close();
        await database_1.sequelize.close();
        logger_1.logger.info('E2E test environment teardown completed');
    }
    catch (error) {
        logger_1.logger.error('E2E test teardown failed:', error);
    }
});
beforeEach(async () => {
    try {
        await fixtures_1.testFixtures.cleanupAll();
        fixtures_1.testFixtures.users.resetCounter();
        fixtures_1.testFixtures.organizations.resetCounter();
        fixtures_1.testFixtures.customers.resetCounter();
        fixtures_1.testFixtures.bins.resetCounter();
        fixtures_1.testFixtures.vehicles.resetCounter();
        fixtures_1.testFixtures.drivers.resetCounter();
        fixtures_1.testFixtures.routes.resetCounter();
        fixtures_1.testFixtures.serviceEvents.resetCounter();
        fixtures_1.testFixtures.auditLogs.resetCounter();
        fixtures_1.testFixtures.userSessions.resetCounter();
        await seedTestDataForCurrentTest();
    }
    catch (error) {
        logger_1.logger.error('E2E test beforeEach setup failed:', error);
        throw error;
    }
});
afterEach(async () => {
    try {
        await fixtures_1.testFixtures.cleanupAll();
        await cleanupTestResources();
    }
    catch (error) {
        logger_1.logger.error('E2E test afterEach cleanup failed:', error);
    }
});
async function setupTestSchemas() {
    try {
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS core');
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS operations');
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS analytics');
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS audit');
        try {
            await database_1.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis');
            await database_1.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            await database_1.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        }
        catch (error) {
            logger_1.logger.warn('Could not create database extensions:', error);
        }
        logger_1.logger.info('Test database schemas created successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to create test database schemas:', error);
        throw error;
    }
}
async function seedEssentialTestData() {
    try {
        const defaultOrg = await fixtures_1.testFixtures.organizations.createOrganization({
            name: 'Default Test Organization',
            contactEmail: 'admin@testorg.com',
        });
        await fixtures_1.testFixtures.users.createUser({
            email: 'system@test.com',
            password: 'SystemPassword123!',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'super_admin',
            organizationId: defaultOrg.id,
        });
        global.testData = {
            defaultOrganization: defaultOrg,
        };
        logger_1.logger.info('Essential test data seeded successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to seed essential test data:', error);
        throw error;
    }
}
async function seedTestDataForCurrentTest() {
    try {
        const currentTestName = expect.getState().currentTestName;
        if (currentTestName?.includes('route optimization')) {
            await fixtures_1.testFixtures.createScenario('basic_route_optimization');
        }
        else if (currentTestName?.includes('customer management')) {
            await fixtures_1.testFixtures.createScenario('customer_management');
        }
        else {
            await fixtures_1.testFixtures.createFullTestDataset();
        }
        logger_1.logger.debug(`Test data seeded for: ${currentTestName}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to seed test data for current test:', error);
        throw error;
    }
}
async function cleanupTestResources() {
    try {
        if (global.mockServices) {
            Object.keys(global.mockServices).forEach(service => {
                global.mockServices[service].reset?.();
            });
        }
        logger_1.logger.debug('Test resources cleaned up');
    }
    catch (error) {
        logger_1.logger.error('Failed to clean up test resources:', error);
    }
}
function getTestApp() {
    if (!app) {
        throw new Error('Test app not initialized. Make sure E2E setup has run.');
    }
    return app;
}
function getTestServer() {
    if (!server) {
        throw new Error('Test server not initialized. Make sure E2E setup has run.');
    }
    return server;
}
async function waitForOperation(operation, timeout = 30000, interval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await operation()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Operation timed out after ${timeout}ms`);
}
async function simulateNetworkDelay(ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms));
}
exports.default = {
    getTestApp,
    getTestServer,
    waitForOperation,
    simulateNetworkDelay,
};
//# sourceMappingURL=setup.js.map