"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseTestUtils = exports.DatabaseTestHelper = void 0;
const sequelize_1 = require("sequelize");
const setup_1 = require("@tests/setup");
const logger_1 = require("@/utils/logger");
class DatabaseTestHelper {
    static async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            this.testSequelize = new sequelize_1.Sequelize({
                ...setup_1.testConfig.database,
                logging: false,
                sync: { force: true },
            });
            await this.testSequelize.authenticate();
            await this.testSequelize.sync({ force: true });
            this.isInitialized = true;
            logger_1.logger.info('Test database initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize test database:', error);
            throw error;
        }
    }
    static getDatabase() {
        if (!this.isInitialized) {
            throw new Error('Test database not initialized. Call initialize() first.');
        }
        return this.testSequelize;
    }
    static async createTransaction() {
        return await this.testSequelize.transaction();
    }
    static async cleanup() {
        if (!this.isInitialized) {
            return;
        }
        try {
            const models = this.testSequelize.models;
            const tableNames = Object.keys(models);
            await this.testSequelize.query('SET FOREIGN_KEY_CHECKS = 0');
            for (const tableName of tableNames) {
                await this.testSequelize.query(`TRUNCATE TABLE ${tableName}`);
            }
            await this.testSequelize.query('SET FOREIGN_KEY_CHECKS = 1');
            logger_1.logger.debug('Test database cleaned up');
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup test database:', error);
            throw error;
        }
    }
    static async reset() {
        if (!this.isInitialized) {
            return;
        }
        try {
            await this.testSequelize.sync({ force: true });
            logger_1.logger.debug('Test database reset');
        }
        catch (error) {
            logger_1.logger.error('Failed to reset test database:', error);
            throw error;
        }
    }
    static async close() {
        if (!this.isInitialized) {
            return;
        }
        try {
            await this.testSequelize.close();
            this.isInitialized = false;
            logger_1.logger.info('Test database connection closed');
        }
        catch (error) {
            logger_1.logger.error('Failed to close test database connection:', error);
        }
    }
    static async withRollbackTransaction(callback) {
        const transaction = await this.createTransaction();
        try {
            const result = await callback(transaction);
            await transaction.rollback();
            return result;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    static async getTableRowCount(tableName) {
        const result = await this.testSequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`, { type: 'SELECT' });
        return result[0].count;
    }
    static async tableExists(tableName) {
        try {
            await this.testSequelize.query(`SELECT 1 FROM ${tableName} LIMIT 1`, { type: 'SELECT' });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async getTableNames() {
        const result = await this.testSequelize.query('SHOW TABLES', { type: 'SELECT' });
        return result.map((row) => Object.values(row)[0]);
    }
    static async query(sql, replacements) {
        return await this.testSequelize.query(sql, {
            replacements,
            type: 'SELECT',
        });
    }
    static async seedTestData() {
        await this.testSequelize.sync({ alter: true });
    }
    static async getDatabaseStats() {
        const tables = await this.getTableNames();
        const stats = {};
        for (const table of tables) {
            stats[table] = await this.getTableRowCount(table);
        }
        return stats;
    }
}
exports.DatabaseTestHelper = DatabaseTestHelper;
DatabaseTestHelper.isInitialized = false;
class DatabaseTestUtils {
    static async waitForDatabase(operation, maxAttempts = 10, delayMs = 100) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw new Error(`Database operation failed after ${maxAttempts} attempts: ${lastError?.message}`);
    }
    static async assertTableRowCount(tableName, expectedCount) {
        const actualCount = await DatabaseTestHelper.getTableRowCount(tableName);
        if (actualCount !== expectedCount) {
            throw new Error(`Expected ${tableName} to have ${expectedCount} rows, but found ${actualCount}`);
        }
    }
    static async assertDatabaseEmpty() {
        const stats = await DatabaseTestHelper.getDatabaseStats();
        const nonEmptyTables = Object.entries(stats)
            .filter(([, count]) => count > 0)
            .map(([table]) => table);
        if (nonEmptyTables.length > 0) {
            throw new Error(`Expected database to be empty, but found data in: ${nonEmptyTables.join(', ')}`);
        }
    }
}
exports.DatabaseTestUtils = DatabaseTestUtils;
exports.default = DatabaseTestHelper;
//# sourceMappingURL=DatabaseTestHelper.js.map