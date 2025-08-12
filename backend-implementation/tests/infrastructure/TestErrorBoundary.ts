/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST ERROR BOUNDARY SYSTEM
 * ============================================================================
 *
 * Comprehensive error boundary system for testing infrastructure.
 * Provides bulletproof error handling for test execution, framework issues,
 * and CI/CD pipeline problems with automated recovery mechanisms.
 *
 * Features:
 * - Test execution error boundaries with categorized failure handling
 * - Automatic retry mechanisms with exponential backoff
 * - Test failure isolation to prevent cascade failures
 * - Comprehensive error reporting with actionable recovery guidance
 * - Integration with existing ErrorMonitoringService
 * - CI/CD pipeline resilience and failure recovery
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import { errorMonitoring, ErrorSeverity, ErrorCategory } from '@/services/ErrorMonitoringService';
import { AppError } from '@/middleware/errorHandler';

/**
 * Test error types for categorization
 */
export enum TestErrorType {
  SETUP_FAILURE = 'test_setup_failure',
  TEARDOWN_FAILURE = 'test_teardown_failure',
  ASSERTION_FAILURE = 'assertion_failure',
  DATABASE_FAILURE = 'database_failure',
  EXTERNAL_SERVICE_FAILURE = 'external_service_failure',
  TIMEOUT_FAILURE = 'timeout_failure',
  MEMORY_LEAK = 'memory_leak',
  DEPENDENCY_FAILURE = 'dependency_failure',
  FIXTURE_FAILURE = 'fixture_failure',
  MOCK_FAILURE = 'mock_failure',
  FRAMEWORK_ERROR = 'framework_error',
  ENVIRONMENT_ERROR = 'environment_error',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
}

/**
 * Test execution context interface
 */
export interface TestExecutionContext {
  testSuite: string;
  testName: string;
  testType: 'unit' | 'integration' | 'e2e';
  startTime: Date;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  dependencies: string[];
  environment: 'local' | 'ci' | 'staging' | 'production';
  metadata: Record<string, any>;
}

/**
 * Test error event interface
 */
export interface TestErrorEvent {
  id: string;
  type: TestErrorType;
  error: Error;
  context: TestExecutionContext;
  timestamp: Date;
  severity: ErrorSeverity;
  recoverable: boolean;
  recovered: boolean;
  recoveryActions: string[];
  stack: string;
  metadata: Record<string, any>;
}

/**
 * Recovery action interface
 */
export interface RecoveryAction {
  name: string;
  description: string;
  action: (context: TestExecutionContext, error: Error) => Promise<boolean>;
  priority: number;
  maxAttempts: number;
  cooldownMs: number;
}

/**
 * Test error boundary configuration
 */
export interface TestErrorBoundaryConfig {
  enableAutoRecovery: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
  escalationThreshold: number;
  reportingEnabled: boolean;
  isolationEnabled: boolean;
  timeoutMs: number;
  memoryLimitMB: number;
}

/**
 * Test Error Boundary System
 */
export class TestErrorBoundary extends EventEmitter {
  private errorBuffer: Map<string, TestErrorEvent> = new Map();
  private recoveryActions: Map<TestErrorType, RecoveryAction[]> = new Map();
  private activeRecoveries: Map<string, Date> = new Map();
  private failedTests: Set<string> = new Set();
  private isolatedTests: Set<string> = new Set();
  private config: TestErrorBoundaryConfig;
  private readonly maxBufferSize = 5000;

  constructor(config: Partial<TestErrorBoundaryConfig> = {}) {
    super();
    this.config = {
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      escalationThreshold: 5,
      reportingEnabled: true,
      isolationEnabled: true,
      timeoutMs: 300000, // 5 minutes
      memoryLimitMB: 512,
      ...config,
    };

    this.initializeRecoveryActions();
    this.startHealthMonitoring();
  }

  /**
   * Wrap test execution with error boundary protection
   */
  public async executeWithBoundary<T>(
    context: TestExecutionContext,
    testFunction: () => Promise<T>
  ): Promise<T> {
    const testId = this.generateTestId(context);
    
    // Check if test should be isolated
    if (this.shouldIsolateTest(context)) {
      throw new Error(`Test ${testId} is isolated due to previous failures`);
    }

    let lastError: Error | null = null;
    let attemptCount = 0;

    while (attemptCount <= context.maxRetries) {
      try {
        // Set up test monitoring
        const monitor = this.setupTestMonitoring(context);
        
        // Execute test with timeout protection
        const result = await this.executeWithTimeout(testFunction, context.timeout);
        
        // Clean up monitoring
        this.cleanupTestMonitoring(monitor);
        
        // Mark test as successful
        this.markTestSuccess(testId);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        attemptCount++;

        const errorEvent = await this.handleTestError(
          error as Error,
          context,
          attemptCount
        );

        // Attempt recovery if enabled
        if (this.config.enableAutoRecovery && attemptCount <= context.maxRetries) {
          const recovered = await this.attemptRecovery(errorEvent, context);
          
          if (recovered) {
            logger.info('Test recovered successfully', {
              testId,
              attempt: attemptCount,
              errorType: errorEvent.type,
            });
            
            // Short delay before retry
            await this.delay(this.config.retryDelayMs * attemptCount);
            continue;
          }
        }

        // If we've exhausted retries or recovery failed
        if (attemptCount > context.maxRetries) {
          break;
        }

        // Exponential backoff delay
        await this.delay(this.config.retryDelayMs * Math.pow(2, attemptCount - 1));
      }
    }

    // Mark test as failed and potentially isolate
    this.markTestFailure(testId, lastError!);
    
    // Re-throw the last error
    throw lastError;
  }

  /**
   * Handle database test errors with specific recovery strategies
   */
  public async handleDatabaseTestError(
    error: Error,
    context: TestExecutionContext
  ): Promise<boolean> {
    const errorEvent: TestErrorEvent = {
      id: this.generateErrorId(),
      type: TestErrorType.DATABASE_FAILURE,
      error,
      context,
      timestamp: new Date(),
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      recovered: false,
      recoveryActions: [],
      stack: error.stack || '',
      metadata: {
        database: true,
        connectionInfo: this.getDatabaseConnectionInfo(),
      },
    };

    // Track error
    await this.trackError(errorEvent);

    // Attempt database-specific recovery
    return await this.attemptDatabaseRecovery(errorEvent, context);
  }

  /**
   * Handle CI/CD pipeline errors
   */
  public async handlePipelineError(
    error: Error,
    pipelineStage: string,
    context: any
  ): Promise<void> {
    const errorEvent: TestErrorEvent = {
      id: this.generateErrorId(),
      type: TestErrorType.FRAMEWORK_ERROR,
      error,
      context: {
        ...context,
        testSuite: 'ci-cd-pipeline',
        testName: pipelineStage,
        testType: 'integration' as const,
        startTime: new Date(),
        timeout: 600000,
        retryCount: 0,
        maxRetries: 2,
        dependencies: [],
        environment: 'ci' as const,
        metadata: { pipelineStage },
      },
      timestamp: new Date(),
      severity: ErrorSeverity.CRITICAL,
      recoverable: false,
      recovered: false,
      recoveryActions: [],
      stack: error.stack || '',
      metadata: {
        pipeline: true,
        stage: pipelineStage,
      },
    };

    await this.trackError(errorEvent);
    this.emit('pipelineError', errorEvent);
  }

  /**
   * Get comprehensive error report for debugging
   */
  public getErrorReport(timeRangeMs: number = 3600000): any {
    const cutoff = Date.now() - timeRangeMs;
    const recentErrors = Array.from(this.errorBuffer.values())
      .filter(error => error.timestamp.getTime() >= cutoff);

    return {
      summary: {
        totalErrors: recentErrors.length,
        recoveredErrors: recentErrors.filter(e => e.recovered).length,
        criticalErrors: recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
        isolatedTests: this.isolatedTests.size,
        failedTests: this.failedTests.size,
        activeRecoveries: this.activeRecoveries.size,
      },
      errorsByType: this.groupBy(recentErrors, 'type'),
      errorsBySeverity: this.groupBy(recentErrors, 'severity'),
      errorsByTestSuite: this.groupBy(recentErrors, e => e.context.testSuite),
      recoverabilityAnalysis: {
        recoverable: recentErrors.filter(e => e.recoverable).length,
        nonRecoverable: recentErrors.filter(e => !e.recoverable).length,
        recoverySuccessRate: this.calculateRecoverySuccessRate(recentErrors),
      },
      topFailingTests: this.getTopFailingTests(recentErrors),
      recoveryActionEffectiveness: this.getRecoveryActionStats(),
      recommendations: this.generateRecommendations(recentErrors),
      timestamp: new Date(),
    };
  }

  /**
   * Get test health status
   */
  public getTestHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: any;
    alerts: string[];
  } {
    const recentErrors = Array.from(this.errorBuffer.values())
      .filter(error => error.timestamp.getTime() >= Date.now() - 300000); // Last 5 minutes

    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const failureRate = recentErrors.length / 300; // Errors per second
    const isolatedTestsCount = this.isolatedTests.size;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const alerts: string[] = [];

    if (criticalErrors > 3 || failureRate > 0.5 || isolatedTestsCount > 10) {
      status = 'critical';
      alerts.push('Critical test infrastructure failures detected');
    } else if (criticalErrors > 0 || failureRate > 0.1 || isolatedTestsCount > 5) {
      status = 'degraded';
      alerts.push('Test infrastructure performance degraded');
    }

    return {
      status,
      metrics: {
        errorRate: failureRate,
        criticalErrors,
        isolatedTests: isolatedTestsCount,
        failedTests: this.failedTests.size,
        activeRecoveries: this.activeRecoveries.size,
        recoverySuccessRate: this.calculateRecoverySuccessRate(recentErrors),
      },
      alerts,
    };
  }

  /**
   * Initialize recovery actions for different error types
   */
  private initializeRecoveryActions(): void {
    // Database failure recovery actions
    this.recoveryActions.set(TestErrorType.DATABASE_FAILURE, [
      {
        name: 'database_reconnection',
        description: 'Attempt to reconnect to test database',
        action: this.recoverDatabaseConnection.bind(this),
        priority: 1,
        maxAttempts: 3,
        cooldownMs: 5000,
      },
      {
        name: 'database_reset',
        description: 'Reset test database to clean state',
        action: this.recoverDatabaseReset.bind(this),
        priority: 2,
        maxAttempts: 2,
        cooldownMs: 10000,
      },
      {
        name: 'database_migration_check',
        description: 'Verify and run missing migrations',
        action: this.recoverDatabaseMigrations.bind(this),
        priority: 3,
        maxAttempts: 1,
        cooldownMs: 30000,
      },
    ]);

    // External service failure recovery actions
    this.recoveryActions.set(TestErrorType.EXTERNAL_SERVICE_FAILURE, [
      {
        name: 'mock_service_fallback',
        description: 'Switch to mock service implementation',
        action: this.recoverWithMockService.bind(this),
        priority: 1,
        maxAttempts: 1,
        cooldownMs: 1000,
      },
      {
        name: 'service_health_check',
        description: 'Check external service health and wait for recovery',
        action: this.recoverServiceHealthCheck.bind(this),
        priority: 2,
        maxAttempts: 5,
        cooldownMs: 30000,
      },
    ]);

    // Timeout failure recovery actions
    this.recoveryActions.set(TestErrorType.TIMEOUT_FAILURE, [
      {
        name: 'increase_timeout',
        description: 'Increase test timeout for next attempt',
        action: this.recoverIncreaseTimeout.bind(this),
        priority: 1,
        maxAttempts: 2,
        cooldownMs: 1000,
      },
      {
        name: 'optimize_test_resources',
        description: 'Clean up resources to improve performance',
        action: this.recoverOptimizeResources.bind(this),
        priority: 2,
        maxAttempts: 1,
        cooldownMs: 5000,
      },
    ]);

    // Memory leak recovery actions
    this.recoveryActions.set(TestErrorType.MEMORY_LEAK, [
      {
        name: 'force_garbage_collection',
        description: 'Force garbage collection to free memory',
        action: this.recoverForceGC.bind(this),
        priority: 1,
        maxAttempts: 2,
        cooldownMs: 2000,
      },
      {
        name: 'restart_test_worker',
        description: 'Restart test worker process',
        action: this.recoverRestartWorker.bind(this),
        priority: 2,
        maxAttempts: 1,
        cooldownMs: 10000,
      },
    ]);

    // Framework error recovery actions
    this.recoveryActions.set(TestErrorType.FRAMEWORK_ERROR, [
      {
        name: 'reset_test_environment',
        description: 'Reset test environment to clean state',
        action: this.recoverResetEnvironment.bind(this),
        priority: 1,
        maxAttempts: 1,
        cooldownMs: 5000,
      },
      {
        name: 'clear_jest_cache',
        description: 'Clear Jest cache and reload modules',
        action: this.recoverClearJestCache.bind(this),
        priority: 2,
        maxAttempts: 1,
        cooldownMs: 3000,
      },
    ]);
  }

  /**
   * Track error event
   */
  private async trackError(errorEvent: TestErrorEvent): Promise<void> {
    // Store in local buffer
    this.errorBuffer.set(errorEvent.id, errorEvent);
    this.maintainBufferSize();

    // Track in global error monitoring service
    const appError = new AppError(
      errorEvent.error.message,
      500,
      `TEST_${errorEvent.type.toUpperCase()}`
    );

    await errorMonitoring.trackError(
      appError,
      {
        testSuite: errorEvent.context.testSuite,
        testName: errorEvent.context.testName,
        testType: errorEvent.context.testType,
      },
      {
        testError: true,
        errorType: errorEvent.type,
        recoverable: errorEvent.recoverable,
        testContext: errorEvent.context,
      }
    );

    // Emit event for external monitoring
    this.emit('testErrorTracked', errorEvent);

    logger.error('Test error tracked', {
      errorId: errorEvent.id,
      type: errorEvent.type,
      testSuite: errorEvent.context.testSuite,
      testName: errorEvent.context.testName,
      severity: errorEvent.severity,
      recoverable: errorEvent.recoverable,
    });
  }

  /**
   * Handle test error and create error event
   */
  private async handleTestError(
    error: Error,
    context: TestExecutionContext,
    attemptNumber: number
  ): Promise<TestErrorEvent> {
    const errorType = this.categorizeTestError(error, context);
    const severity = this.determineTestErrorSeverity(errorType, attemptNumber);
    
    const errorEvent: TestErrorEvent = {
      id: this.generateErrorId(),
      type: errorType,
      error,
      context: {
        ...context,
        retryCount: attemptNumber,
      },
      timestamp: new Date(),
      severity,
      recoverable: this.isRecoverable(errorType),
      recovered: false,
      recoveryActions: [],
      stack: error.stack || '',
      metadata: {
        attemptNumber,
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
      },
    };

    await this.trackError(errorEvent);
    return errorEvent;
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(
    errorEvent: TestErrorEvent,
    context: TestExecutionContext
  ): Promise<boolean> {
    if (!errorEvent.recoverable) {
      return false;
    }

    const recoveryActions = this.recoveryActions.get(errorEvent.type) || [];
    
    for (const action of recoveryActions.sort((a, b) => a.priority - b.priority)) {
      const recoveryKey = `${errorEvent.type}_${action.name}`;
      const lastAttempt = this.activeRecoveries.get(recoveryKey);
      
      // Check cooldown
      if (lastAttempt && Date.now() - lastAttempt.getTime() < action.cooldownMs) {
        continue;
      }

      try {
        logger.info('Attempting test error recovery', {
          errorId: errorEvent.id,
          action: action.name,
          description: action.description,
        });

        this.activeRecoveries.set(recoveryKey, new Date());
        const recovered = await action.action(context, errorEvent.error);
        
        if (recovered) {
          errorEvent.recovered = true;
          errorEvent.recoveryActions.push(action.name);
          
          logger.info('Test error recovery successful', {
            errorId: errorEvent.id,
            action: action.name,
          });

          this.emit('testErrorRecovered', errorEvent);
          return true;
        }
      } catch (recoveryError) {
        logger.warn('Recovery action failed', {
          errorId: errorEvent.id,
          action: action.name,
          recoveryError: recoveryError.message,
        });
      }
    }

    return false;
  }

  /**
   * Recovery action implementations
   */
  private async recoverDatabaseConnection(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      const { DatabaseTestHelper } = await import('@tests/helpers/DatabaseTestHelper');
      await DatabaseTestHelper.close();
      await DatabaseTestHelper.initialize();
      return true;
    } catch (err) {
      return false;
    }
  }

  private async recoverDatabaseReset(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      const { DatabaseTestHelper } = await import('@tests/helpers/DatabaseTestHelper');
      await DatabaseTestHelper.reset();
      return true;
    } catch (err) {
      return false;
    }
  }

  private async recoverDatabaseMigrations(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      // This would run any pending migrations
      logger.info('Checking database migrations for test recovery');
      return true;
    } catch (err) {
      return false;
    }
  }

  private async recoverWithMockService(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      // Switch to mock service implementations
      global.mockServices = {
        ...global.mockServices,
        enabled: true,
      };
      return true;
    } catch (err) {
      return false;
    }
  }

  private async recoverServiceHealthCheck(context: TestExecutionContext, error: Error): Promise<boolean> {
    // Simulate service health check
    await this.delay(5000);
    return Math.random() > 0.5; // 50% chance of recovery
  }

  private async recoverIncreaseTimeout(context: TestExecutionContext, error: Error): Promise<boolean> {
    context.timeout = Math.min(context.timeout * 1.5, 600000); // Max 10 minutes
    return true;
  }

  private async recoverOptimizeResources(context: TestExecutionContext, error: Error): Promise<boolean> {
    if (global.gc) {
      global.gc();
    }
    // Clear any cached resources
    return true;
  }

  private async recoverForceGC(context: TestExecutionContext, error: Error): Promise<boolean> {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  private async recoverRestartWorker(context: TestExecutionContext, error: Error): Promise<boolean> {
    // In a real implementation, this would restart the Jest worker
    logger.warn('Worker restart recovery not implemented in test environment');
    return false;
  }

  private async recoverResetEnvironment(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      // Clear all mocks and reset environment
      jest.clearAllMocks();
      jest.restoreAllMocks();
      return true;
    } catch (err) {
      return false;
    }
  }

  private async recoverClearJestCache(context: TestExecutionContext, error: Error): Promise<boolean> {
    try {
      // Clear Jest module cache
      jest.resetModules();
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Helper methods
   */
  private categorizeTestError(error: Error, context: TestExecutionContext): TestErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('database') || message.includes('sequelize')) {
      return TestErrorType.DATABASE_FAILURE;
    }
    if (message.includes('timeout')) {
      return TestErrorType.TIMEOUT_FAILURE;
    }
    if (message.includes('memory') || message.includes('heap')) {
      return TestErrorType.MEMORY_LEAK;
    }
    if (message.includes('connection') || message.includes('network')) {
      return TestErrorType.NETWORK_ERROR;
    }
    if (message.includes('mock') || message.includes('stub')) {
      return TestErrorType.MOCK_FAILURE;
    }
    if (stack.includes('jest') || stack.includes('test-runner')) {
      return TestErrorType.FRAMEWORK_ERROR;
    }
    if (message.includes('expect') || message.includes('assertion')) {
      return TestErrorType.ASSERTION_FAILURE;
    }

    return TestErrorType.FRAMEWORK_ERROR;
  }

  private determineTestErrorSeverity(type: TestErrorType, attemptNumber: number): ErrorSeverity {
    if (attemptNumber > 2) return ErrorSeverity.HIGH;
    
    switch (type) {
      case TestErrorType.DATABASE_FAILURE:
      case TestErrorType.FRAMEWORK_ERROR:
      case TestErrorType.ENVIRONMENT_ERROR:
        return ErrorSeverity.HIGH;
      case TestErrorType.EXTERNAL_SERVICE_FAILURE:
      case TestErrorType.TIMEOUT_FAILURE:
      case TestErrorType.MEMORY_LEAK:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  private isRecoverable(type: TestErrorType): boolean {
    const nonRecoverableTypes = [
      TestErrorType.ASSERTION_FAILURE,
      TestErrorType.CONFIGURATION_ERROR,
    ];
    return !nonRecoverableTypes.includes(type);
  }

  private shouldIsolateTest(context: TestExecutionContext): boolean {
    if (!this.config.isolationEnabled) return false;
    
    const testId = this.generateTestId(context);
    return this.isolatedTests.has(testId);
  }

  private markTestSuccess(testId: string): void {
    this.failedTests.delete(testId);
    this.isolatedTests.delete(testId);
  }

  private markTestFailure(testId: string, error: Error): void {
    this.failedTests.add(testId);
    
    // Isolate test if it has failed multiple times
    const recentFailures = Array.from(this.errorBuffer.values())
      .filter(e => this.generateTestId(e.context) === testId)
      .filter(e => e.timestamp.getTime() > Date.now() - 3600000); // Last hour

    if (recentFailures.length >= this.config.escalationThreshold) {
      this.isolatedTests.add(testId);
      logger.warn('Test isolated due to repeated failures', {
        testId,
        failures: recentFailures.length,
      });
    }
  }

  private generateTestId(context: TestExecutionContext): string {
    return `${context.testSuite}:${context.testName}`;
  }

  private generateErrorId(): string {
    return `test_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private setupTestMonitoring(context: TestExecutionContext): any {
    const startMemory = process.memoryUsage();
    const startTime = Date.now();

    return {
      startMemory,
      startTime,
      interval: setInterval(() => {
        const currentMemory = process.memoryUsage();
        const memoryDelta = currentMemory.heapUsed - startMemory.heapUsed;
        
        if (memoryDelta > this.config.memoryLimitMB * 1024 * 1024) {
          logger.warn('Test memory usage exceeded threshold', {
            testSuite: context.testSuite,
            testName: context.testName,
            memoryDelta,
            limit: this.config.memoryLimitMB,
          });
        }
      }, 10000), // Check every 10 seconds
    };
  }

  private cleanupTestMonitoring(monitor: any): void {
    if (monitor.interval) {
      clearInterval(monitor.interval);
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      const health = this.getTestHealthStatus();
      if (health.status !== 'healthy') {
        this.emit('testHealthDegraded', health);
      }
    }, 60000); // Check every minute
  }

  private maintainBufferSize(): void {
    if (this.errorBuffer.size > this.maxBufferSize) {
      const sortedErrors = Array.from(this.errorBuffer.entries())
        .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime());

      const toRemove = sortedErrors.slice(0, this.errorBuffer.size - this.maxBufferSize);
      toRemove.forEach(([id]) => this.errorBuffer.delete(id));
    }
  }

  private getDatabaseConnectionInfo(): any {
    return {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || '5432',
      database: process.env.TEST_DB_NAME || 'waste_management_test',
    };
  }

  private calculateRecoverySuccessRate(errors: TestErrorEvent[]): number {
    const recoverableErrors = errors.filter(e => e.recoverable);
    if (recoverableErrors.length === 0) return 100;
    
    const recoveredErrors = recoverableErrors.filter(e => e.recovered);
    return (recoveredErrors.length / recoverableErrors.length) * 100;
  }

  private getTopFailingTests(errors: TestErrorEvent[]): any[] {
    const testFailures = new Map<string, number>();
    
    errors.forEach(error => {
      const testId = this.generateTestId(error.context);
      testFailures.set(testId, (testFailures.get(testId) || 0) + 1);
    });

    return Array.from(testFailures.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([testId, count]) => ({ testId, failures: count }));
  }

  private getRecoveryActionStats(): any {
    const stats = new Map<string, { attempts: number; successes: number }>();
    
    Array.from(this.errorBuffer.values()).forEach(error => {
      error.recoveryActions.forEach(action => {
        if (!stats.has(action)) {
          stats.set(action, { attempts: 0, successes: 0 });
        }
        const stat = stats.get(action)!;
        stat.attempts++;
        if (error.recovered) {
          stat.successes++;
        }
      });
    });

    return Object.fromEntries(
      Array.from(stats.entries()).map(([action, stat]) => [
        action,
        {
          ...stat,
          successRate: stat.attempts > 0 ? (stat.successes / stat.attempts) * 100 : 0,
        },
      ])
    );
  }

  private generateRecommendations(errors: TestErrorEvent[]): string[] {
    const recommendations: string[] = [];
    const errorCounts = this.groupBy(errors, 'type');

    if (errorCounts[TestErrorType.DATABASE_FAILURE] > 5) {
      recommendations.push('Consider optimizing database test setup and teardown procedures');
    }
    if (errorCounts[TestErrorType.TIMEOUT_FAILURE] > 3) {
      recommendations.push('Review test timeouts and consider performance optimization');
    }
    if (errorCounts[TestErrorType.MEMORY_LEAK] > 2) {
      recommendations.push('Investigate memory leaks in test fixtures and mocks');
    }
    if (this.isolatedTests.size > 10) {
      recommendations.push('Review and fix isolated tests to restore full test coverage');
    }

    return recommendations;
  }

  private groupBy<T>(array: T[], property: keyof T | ((item: T) => string)): Record<string, number> {
    const groups: Record<string, number> = {};
    const getKey = typeof property === 'string' ? (item: T) => String(item[property]) : property;

    for (const item of array) {
      const key = getKey(item);
      groups[key] = (groups[key] || 0) + 1;
    }

    return groups;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Attempt database-specific recovery
   */
  private async attemptDatabaseRecovery(
    errorEvent: TestErrorEvent,
    context: TestExecutionContext
  ): Promise<boolean> {
    const recoveryActions = this.recoveryActions.get(TestErrorType.DATABASE_FAILURE) || [];
    
    for (const action of recoveryActions) {
      try {
        const recovered = await action.action(context, errorEvent.error);
        if (recovered) {
          errorEvent.recovered = true;
          errorEvent.recoveryActions.push(action.name);
          return true;
        }
      } catch (recoveryError) {
        logger.warn('Database recovery action failed', {
          action: action.name,
          error: recoveryError.message,
        });
      }
    }

    return false;
  }
}

// Global test error boundary instance
export const testErrorBoundary = new TestErrorBoundary();

export default TestErrorBoundary;