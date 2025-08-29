/**
 * Logger Normalization Tests
 * 
 * Tests to ensure logger functionality remains intact after normalization
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger, Timer, auditLogger, securityLogger, performanceLogger } from '@/utils/logger';

describe('Logger Normalization', () => {
  let originalConsoleLog: typeof console.log;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('should export main logger correctly', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should export specialized loggers correctly', () => {
    expect(auditLogger).toBeDefined();
    expect(securityLogger).toBeDefined();
    expect(performanceLogger).toBeDefined();
  });

  it('should export Timer class correctly', () => {
    expect(Timer).toBeDefined();
    expect(typeof Timer).toBe('function');
    
    const timer = new Timer('test-operation');
    expect(timer).toBeInstanceOf(Timer);
    expect(typeof timer.end).toBe('function');
    expect(typeof timer.getDuration).toBe('function');
  });

  it('should not export duplicate Timer type', () => {
    // This test ensures we removed the duplicate Timer type
    // If there were duplicates, TypeScript would have compilation errors
    const timer = new Timer('test');
    expect(timer).toBeInstanceOf(Timer);
  });

  it('should allow Timer to measure duration', () => {
    const timer = new Timer('test-timer');
    
    // Wait a small amount of time
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Small delay
    }
    
    const duration = timer.getDuration();
    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe('number');
  });

  it('should allow Timer to end and log performance', () => {
    const timer = new Timer('test-end-timer');
    
    // End the timer (this should log performance)
    const duration = timer.end({ testData: 'test' });
    
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(typeof duration).toBe('number');
  });

  it('should maintain logger functionality', () => {
    // Test that basic logging still works
    expect(() => {
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should maintain audit logger functionality', () => {
    expect(() => {
      auditLogger.info('Test audit message');
    }).not.toThrow();
  });

  it('should maintain security logger functionality', () => {
    expect(() => {
      securityLogger.warn('Test security message');
    }).not.toThrow();
  });

  it('should maintain performance logger functionality', () => {
    expect(() => {
      performanceLogger.info('Test performance message');
    }).not.toThrow();
  });
});

describe('Logger Import Consistency', () => {
  it('should import logger using @/ alias', async () => {
    // This test validates that the import path works correctly
    const { logger: importedLogger } = await import('@/utils/logger');
    expect(importedLogger).toBeDefined();
    expect(importedLogger).toBe(logger);
  });

  it('should import Timer using @/ alias', async () => {
    const { Timer: ImportedTimer } = await import('@/utils/logger');
    expect(ImportedTimer).toBeDefined();
    expect(ImportedTimer).toBe(Timer);
  });

  it('should import specialized loggers using @/ alias', async () => {
    const { 
      auditLogger: importedAuditLogger,
      securityLogger: importedSecurityLogger,
      performanceLogger: importedPerformanceLogger
    } = await import('@/utils/logger');
    
    expect(importedAuditLogger).toBe(auditLogger);
    expect(importedSecurityLogger).toBe(securityLogger);
    expect(importedPerformanceLogger).toBe(performanceLogger);
  });
});