/**
 * ============================================================================
 * MOCK UTILITIES FOR TESTING - HUB AUTHORITY COMPLIANCE
 * ============================================================================
 *
 * Mock implementations for utility modules to support comprehensive testing
 * 
 * Created by: Testing Validation Agent (Hub-Directed)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

// Mock logger implementation
export const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  level: 'error',
};

// Mock AppError implementation
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Mock Redis configuration
export const redisConfig = {
  host: 'localhost',
  port: 6379,
  password: '',
  db: 1,
};

// Export all mocks
export default {
  logger,
  AppError,
  redisConfig,
};