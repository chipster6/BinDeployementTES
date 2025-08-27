module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: ['default'],
  testMatch: ['<rootDir>/src/test/unit/**/*.test.ts'],
  transform: { '^.+\\.tsx?': ['ts-jest', { diagnostics: false }] }
};