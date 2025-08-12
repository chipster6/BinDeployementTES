/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST SETUP (JavaScript version)
 * ============================================================================
 *
 * Global test setup and configuration. Provides common test utilities,
 * database setup, mocking, and environment configuration.
 */

require('dotenv').config({ path: '.env.test' });

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
});

// Global test teardown
afterAll(async () => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Restore console methods
  if (process.env.TEST_VERBOSE !== 'true') {
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.info.mockRestore) console.info.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
  }
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
});