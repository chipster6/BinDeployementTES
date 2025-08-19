"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = require("fs");
const path_1 = require("path");
(0, dotenv_1.config)({ path: '.env.test' });
exports.default = async () => {
    console.log('🧹 Cleaning up test environment...');
    try {
        await cleanupTestDatabase();
        await cleanupTestRedis();
        await cleanupTestFiles();
        await cleanupMockServices();
        console.log('✅ Test environment cleanup complete');
    }
    catch (error) {
        console.error('❌ Test environment cleanup failed:', error);
    }
};
async function cleanupTestDatabase() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASS || 'postgres';
    const testDbName = process.env.DB_NAME || 'waste_management_test';
    if (process.env.TEST_CLEANUP_ON_EXIT !== 'true') {
        console.log('⏭️  Skipping database cleanup (TEST_CLEANUP_ON_EXIT not set)');
        return;
    }
    const client = new pg_1.Client({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPass,
        database: 'postgres',
    });
    try {
        await client.connect();
        await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1 
        AND pid <> pg_backend_pid()
    `, [testDbName]);
        await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
        console.log(`✅ Test database "${testDbName}" cleaned up successfully`);
    }
    catch (error) {
        console.warn(`⚠️  Database cleanup warning:`, error);
    }
    finally {
        await client.end();
    }
}
async function cleanupTestRedis() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisDb = parseInt(process.env.REDIS_DB || '1', 10);
    const redis = new ioredis_1.default({
        host: redisHost,
        port: redisPort,
        db: redisDb,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
    });
    try {
        await redis.connect();
        await redis.flushdb();
        console.log('✅ Test Redis cleaned up successfully');
    }
    catch (error) {
        console.warn('⚠️  Redis cleanup warning:', error);
    }
    finally {
        try {
            await redis.disconnect();
        }
        catch (error) {
        }
    }
}
async function cleanupTestFiles() {
    try {
        const testUploadsDir = (0, path_1.join)(__dirname, '..', 'uploads');
        const testTempDir = (0, path_1.join)(__dirname, '..', 'temp');
        const testLogsDir = (0, path_1.join)(__dirname, '..', 'logs');
        try {
            const uploadFiles = await fs_1.promises.readdir(testUploadsDir);
            await Promise.all(uploadFiles.map(file => fs_1.promises.unlink((0, path_1.join)(testUploadsDir, file))));
            console.log('✅ Test upload files cleaned up');
        }
        catch (error) {
        }
        try {
            const tempFiles = await fs_1.promises.readdir(testTempDir);
            await Promise.all(tempFiles.map(file => fs_1.promises.unlink((0, path_1.join)(testTempDir, file))));
            console.log('✅ Test temporary files cleaned up');
        }
        catch (error) {
        }
        try {
            const logFiles = await fs_1.promises.readdir(testLogsDir);
            const testLogFiles = logFiles.filter(file => file.includes('test'));
            await Promise.all(testLogFiles.map(file => fs_1.promises.unlink((0, path_1.join)(testLogsDir, file))));
            console.log('✅ Test log files cleaned up');
        }
        catch (error) {
        }
    }
    catch (error) {
        console.warn('⚠️  File cleanup warning:', error);
    }
}
async function cleanupMockServices() {
    try {
        if (global.mockServices) {
            global.mockServices = {
                payment: { baseUrl: '', enabled: false },
                sms: { baseUrl: '', enabled: false },
                email: { baseUrl: '', enabled: false },
                maps: { baseUrl: '', enabled: false },
            };
        }
        console.log('✅ Mock services cleaned up');
    }
    catch (error) {
        console.warn('⚠️  Mock services cleanup warning:', error);
    }
}
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
//# sourceMappingURL=globalTeardown.js.map