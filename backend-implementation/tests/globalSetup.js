"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
(0, dotenv_1.config)({ path: '.env.test' });
async function globalSetup() {
    console.log('[TEST SETUP] Setting up test environment...');
    try {
        await setupTestDatabase();
        await setupTestRedis();
        await runTestMigrations();
        await setupMockServices();
        console.log('[TEST SETUP] Test environment setup complete');
    }
    catch (error) {
        console.error('[TEST SETUP] Test environment setup failed:', error);
        process.exit(1);
    }
}
exports.default = globalSetup;
async function setupTestDatabase() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASS || 'postgres';
    const testDbName = process.env.DB_NAME || 'waste_management_test';
    const client = new pg_1.Client({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPass,
        database: 'postgres',
    });
    try {
        await client.connect();
        await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
        await client.query(`CREATE DATABASE "${testDbName}"`);
        console.log(`[TEST SETUP] Test database "${testDbName}" created successfully`);
    }
    catch (error) {
        console.warn(`[TEST SETUP] Database setup warning:`, error);
    }
    finally {
        await client.end();
    }
    const testClient = new pg_1.Client({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPass,
        database: testDbName,
    });
    try {
        await testClient.connect();
        await testClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await testClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
        await testClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        console.log('[TEST SETUP] Database extensions created successfully');
    }
    catch (error) {
        console.warn('[TEST SETUP] Extension setup warning:', error);
    }
    finally {
        await testClient.end();
    }
}
async function setupTestRedis() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisDb = parseInt(process.env.REDIS_DB || '1', 10);
    const redis = new ioredis_1.default({
        host: redisHost,
        port: redisPort,
        db: redisDb,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    try {
        await redis.connect();
        await redis.flushdb();
        console.log('[TEST SETUP] Test Redis setup complete');
    }
    catch (error) {
        console.warn('[TEST SETUP] Redis setup warning:', error);
    }
    finally {
        await redis.disconnect();
    }
}
async function runTestMigrations() {
    try {
        console.log('[TEST SETUP] Database migrations will be handled by Sequelize sync in tests');
    }
    catch (error) {
        console.error('[TEST SETUP] Migration setup failed:', error);
        throw error;
    }
}
async function setupMockServices() {
    try {
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
    }
    catch (error) {
        console.error('[TEST SETUP] Mock services setup failed:', error);
        throw error;
    }
}
//# sourceMappingURL=globalSetup.js.map