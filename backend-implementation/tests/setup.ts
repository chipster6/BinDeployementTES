/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST SETUP
 * ============================================================================
 *
 * Global test setup and configuration. Provides common test utilities,
 * database setup, mocking, and environment configuration.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import 'reflect-metadata';
import { config } from 'dotenv';
// import { logger } from '../src/utils/logger'; // Temporarily disabled for path mapping fix

// Load test environment variables
config({ path: '.env.test' });

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test';

// Increase test timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Suppress console logs during tests unless explicitly needed
  if (process.env.TEST_VERBOSE !== 'true') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }

  // Configure logger for test environment (temporarily disabled)
  // logger.level = process.env.TEST_LOG_LEVEL || 'error';
});

// Global test teardown
afterAll(async () => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Restore console methods
  if (process.env.TEST_VERBOSE !== 'true') {
    const logMock = console.log as any;
    const infoMock = console.info as any;
    const warnMock = console.warn as any;
    const errorMock = console.error as any;
    
    if (logMock.mockRestore) logMock.mockRestore();
    if (infoMock.mockRestore) infoMock.mockRestore();
    if (warnMock.mockRestore) warnMock.mockRestore();
    if (errorMock.mockRestore) errorMock.mockRestore();
  }
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset timers before each test
  jest.clearAllTimers();
});

afterEach(() => {
  // Clean up any test-specific resources
  jest.restoreAllMocks();
});

// Handle unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  throw reason;
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  throw error;
});

// Export test configuration
export const testConfig = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: process.env.TEST_DB_NAME || 'waste_management_test',
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASS || 'postgres',
    dialect: 'postgres' as const,
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

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  generateRandomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },
  generateRandomEmail: () => {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `test-${randomString}@example.com`;
  },
  generateRandomPhone: () => {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  },
  createMockDate: (dateString?: string) => {
    return dateString ? new Date(dateString) : new Date('2023-01-01T00:00:00Z');
  },
};

// Extend global interface for TypeScript
declare global {
  namespace globalThis {
    var testUtils: {
      delay: (ms: number) => Promise<void>;
      generateRandomString: (length?: number) => string;
      generateRandomEmail: () => string;
      generateRandomPhone: () => string;
      createMockDate: (dateString?: string) => Date;
    };
  }
}

export default testConfig;