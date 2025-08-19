"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConfig = void 0;
require("reflect-metadata");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.test' });
process.env.NODE_ENV = 'test';
jest.setTimeout(30000);
beforeAll(async () => {
    if (process.env.TEST_VERBOSE !== 'true') {
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    }
});
afterAll(async () => {
    jest.clearAllTimers();
    if (process.env.TEST_VERBOSE !== 'true') {
        const logMock = console.log;
        const infoMock = console.info;
        const warnMock = console.warn;
        const errorMock = console.error;
        if (logMock.mockRestore)
            logMock.mockRestore();
        if (infoMock.mockRestore)
            infoMock.mockRestore();
        if (warnMock.mockRestore)
            warnMock.mockRestore();
        if (errorMock.mockRestore)
            errorMock.mockRestore();
    }
});
beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});
afterEach(() => {
    jest.restoreAllMocks();
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    throw reason;
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    throw error;
});
exports.testConfig = {
    database: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        database: process.env.TEST_DB_NAME || 'waste_management_test',
        username: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASS || 'postgres',
        dialect: 'postgres',
        logging: false,
        pool: {
            min: 0,
            max: 5,
            idle: 10000,
            acquire: 30000,
        },
    },
    redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379', 10),
        password: process.env.TEST_REDIS_PASS || '',
        db: parseInt(process.env.TEST_REDIS_DB || '1', 10),
    },
    jwt: {
        secret: process.env.TEST_JWT_SECRET || 'test-jwt-secret-key',
        expiresIn: '1h',
    },
    encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.TEST_ENCRYPTION_KEY || 'test-encryption-key-32-chars-long',
    },
};
global.testUtils = {
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    generateRandomString: (length = 10) => {
        return Math.random().toString(36).substring(2, 2 + length);
    },
    generateRandomEmail: () => {
        const randomString = Math.random().toString(36).substring(2, 10);
        return `test-${randomString}@example.com`;
    },
    generateRandomPhone: () => {
        return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    },
    createMockDate: (dateString) => {
        return dateString ? new Date(dateString) : new Date('2023-01-01T00:00:00Z');
    },
};
exports.default = exports.testConfig;
//# sourceMappingURL=setup.js.map