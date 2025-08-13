/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - JEST CONFIGURATION
 * ============================================================================
 *
 * Comprehensive Jest configuration for unit, integration, and E2E testing.
 * Supports TypeScript, database testing, and coverage reporting.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

// Jest configuration using ts-jest preset

module.exports = {
  // Basic configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,

  // Root directories
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/?(*.)+(spec|test).ts',
  ],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }],
  },

  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
      useESM: false,
    },
  },

  // Module name mapping (for path aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@dto/(.*)$': '<rootDir>/src/dto/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover',
  ],

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/server.ts',
    '!src/config/**',
    '!src/types/**',
    '!coverage/**',
    '!dist/**',
    '!node_modules/**',
  ],

  // Coverage thresholds (enterprise standards)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/models/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/controllers/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: process.env.NODE_ENV === 'development',

  // Detect open handles for debugging
  detectOpenHandles: true,
  detectLeaks: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Test projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/unit/**/*.spec.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.spec.ts',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/integration/setup.ts',
      ],
    },
    {
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/tests/e2e/**/*.test.ts',
        '<rootDir>/tests/e2e/**/*.spec.ts',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/e2e/setup.ts',
      ],
    },
  ],

  // Performance and memory optimization
  maxWorkers: process.env.CI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB',

  // Error handling
  bail: process.env.CI ? 1 : 0,
  errorOnDeprecated: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],

  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',

  // Reporter configuration for CI/CD
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        suiteName: 'Waste Management System Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Waste Management System Test Report',
      },
    ],
  ],
};