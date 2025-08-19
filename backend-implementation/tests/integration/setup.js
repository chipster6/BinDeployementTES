"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@/config/database");
const DatabaseTestHelper_1 = require("@tests/helpers/DatabaseTestHelper");
const fixtures_1 = require("@tests/fixtures");
const logger_1 = require("@/utils/logger");
jest.setTimeout(60000);
beforeAll(async () => {
    try {
        await DatabaseTestHelper_1.DatabaseTestHelper.initialize();
        await database_1.sequelize.sync({ force: true });
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS core');
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS operations');
        await database_1.sequelize.query('CREATE SCHEMA IF NOT EXISTS analytics');
        logger_1.logger.info('Integration test setup completed');
    }
    catch (error) {
        logger_1.logger.error('Integration test setup failed:', error);
        throw error;
    }
});
afterAll(async () => {
    try {
        await fixtures_1.testFixtures.cleanupAll();
        await DatabaseTestHelper_1.DatabaseTestHelper.close();
        await database_1.sequelize.close();
        logger_1.logger.info('Integration test teardown completed');
    }
    catch (error) {
        logger_1.logger.error('Integration test teardown failed:', error);
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
    }
    catch (error) {
        logger_1.logger.error('Integration test beforeEach setup failed:', error);
        throw error;
    }
});
afterEach(async () => {
    try {
        await fixtures_1.testFixtures.cleanupAll();
    }
    catch (error) {
        logger_1.logger.error('Integration test afterEach cleanup failed:', error);
    }
});
exports.default = {};
//# sourceMappingURL=setup.js.map