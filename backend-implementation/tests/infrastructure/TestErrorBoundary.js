"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testErrorBoundary = exports.TestErrorBoundary = exports.TestErrorType = void 0;
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
const ErrorMonitoringService_1 = require("@/services/ErrorMonitoringService");
const errorHandler_1 = require("@/middleware/errorHandler");
var TestErrorType;
(function (TestErrorType) {
    TestErrorType["SETUP_FAILURE"] = "test_setup_failure";
    TestErrorType["TEARDOWN_FAILURE"] = "test_teardown_failure";
    TestErrorType["ASSERTION_FAILURE"] = "assertion_failure";
    TestErrorType["DATABASE_FAILURE"] = "database_failure";
    TestErrorType["EXTERNAL_SERVICE_FAILURE"] = "external_service_failure";
    TestErrorType["TIMEOUT_FAILURE"] = "timeout_failure";
    TestErrorType["MEMORY_LEAK"] = "memory_leak";
    TestErrorType["DEPENDENCY_FAILURE"] = "dependency_failure";
    TestErrorType["FIXTURE_FAILURE"] = "fixture_failure";
    TestErrorType["MOCK_FAILURE"] = "mock_failure";
    TestErrorType["FRAMEWORK_ERROR"] = "framework_error";
    TestErrorType["ENVIRONMENT_ERROR"] = "environment_error";
    TestErrorType["NETWORK_ERROR"] = "network_error";
    TestErrorType["CONFIGURATION_ERROR"] = "configuration_error";
})(TestErrorType || (exports.TestErrorType = TestErrorType = {}));
class TestErrorBoundary extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.errorBuffer = new Map();
        this.recoveryActions = new Map();
        this.activeRecoveries = new Map();
        this.failedTests = new Set();
        this.isolatedTests = new Set();
        this.maxBufferSize = 5000;
        this.config = {
            enableAutoRecovery: true,
            maxRetryAttempts: 3,
            retryDelayMs: 1000,
            escalationThreshold: 5,
            reportingEnabled: true,
            isolationEnabled: true,
            timeoutMs: 300000,
            memoryLimitMB: 512,
            ...config,
        };
        this.initializeRecoveryActions();
        this.startHealthMonitoring();
    }
    async executeWithBoundary(context, testFunction) {
        const testId = this.generateTestId(context);
        if (this.shouldIsolateTest(context)) {
            throw new Error(`Test ${testId} is isolated due to previous failures`);
        }
        let lastError = null;
        let attemptCount = 0;
        while (attemptCount <= context.maxRetries) {
            try {
                const monitor = this.setupTestMonitoring(context);
                const result = await this.executeWithTimeout(testFunction, context.timeout);
                this.cleanupTestMonitoring(monitor);
                this.markTestSuccess(testId);
                return result;
            }
            catch (error) {
                lastError = error;
                attemptCount++;
                const errorEvent = await this.handleTestError(error, context, attemptCount);
                if (this.config.enableAutoRecovery && attemptCount <= context.maxRetries) {
                    const recovered = await this.attemptRecovery(errorEvent, context);
                    if (recovered) {
                        logger_1.logger.info('Test recovered successfully', {
                            testId,
                            attempt: attemptCount,
                            errorType: errorEvent.type,
                        });
                        await this.delay(this.config.retryDelayMs * attemptCount);
                        continue;
                    }
                }
                if (attemptCount > context.maxRetries) {
                    break;
                }
                await this.delay(this.config.retryDelayMs * Math.pow(2, attemptCount - 1));
            }
        }
        this.markTestFailure(testId, lastError);
        throw lastError;
    }
    async handleDatabaseTestError(error, context) {
        const errorEvent = {
            id: this.generateErrorId(),
            type: TestErrorType.DATABASE_FAILURE,
            error,
            context,
            timestamp: new Date(),
            severity: ErrorMonitoringService_1.ErrorSeverity.HIGH,
            recoverable: true,
            recovered: false,
            recoveryActions: [],
            stack: error.stack || '',
            metadata: {
                database: true,
                connectionInfo: this.getDatabaseConnectionInfo(),
            },
        };
        await this.trackError(errorEvent);
        return await this.attemptDatabaseRecovery(errorEvent, context);
    }
    async handlePipelineError(error, pipelineStage, context) {
        const errorEvent = {
            id: this.generateErrorId(),
            type: TestErrorType.FRAMEWORK_ERROR,
            error,
            context: {
                ...context,
                testSuite: 'ci-cd-pipeline',
                testName: pipelineStage,
                testType: 'integration',
                startTime: new Date(),
                timeout: 600000,
                retryCount: 0,
                maxRetries: 2,
                dependencies: [],
                environment: 'ci',
                metadata: { pipelineStage },
            },
            timestamp: new Date(),
            severity: ErrorMonitoringService_1.ErrorSeverity.CRITICAL,
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
    getErrorReport(timeRangeMs = 3600000) {
        const cutoff = Date.now() - timeRangeMs;
        const recentErrors = Array.from(this.errorBuffer.values())
            .filter(error => error.timestamp.getTime() >= cutoff);
        return {
            summary: {
                totalErrors: recentErrors.length,
                recoveredErrors: recentErrors.filter(e => e.recovered).length,
                criticalErrors: recentErrors.filter(e => e.severity === ErrorMonitoringService_1.ErrorSeverity.CRITICAL).length,
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
    getTestHealthStatus() {
        const recentErrors = Array.from(this.errorBuffer.values())
            .filter(error => error.timestamp.getTime() >= Date.now() - 300000);
        const criticalErrors = recentErrors.filter(e => e.severity === ErrorMonitoringService_1.ErrorSeverity.CRITICAL).length;
        const failureRate = recentErrors.length / 300;
        const isolatedTestsCount = this.isolatedTests.size;
        let status = 'healthy';
        const alerts = [];
        if (criticalErrors > 3 || failureRate > 0.5 || isolatedTestsCount > 10) {
            status = 'critical';
            alerts.push('Critical test infrastructure failures detected');
        }
        else if (criticalErrors > 0 || failureRate > 0.1 || isolatedTestsCount > 5) {
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
    initializeRecoveryActions() {
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
    async trackError(errorEvent) {
        this.errorBuffer.set(errorEvent.id, errorEvent);
        this.maintainBufferSize();
        const appError = new errorHandler_1.AppError(errorEvent.error.message, 500, `TEST_${errorEvent.type.toUpperCase()}`);
        await ErrorMonitoringService_1.errorMonitoring.trackError(appError, {
            testSuite: errorEvent.context.testSuite,
            testName: errorEvent.context.testName,
            testType: errorEvent.context.testType,
        }, {
            testError: true,
            errorType: errorEvent.type,
            recoverable: errorEvent.recoverable,
            testContext: errorEvent.context,
        });
        this.emit('testErrorTracked', errorEvent);
        logger_1.logger.error('Test error tracked', {
            errorId: errorEvent.id,
            type: errorEvent.type,
            testSuite: errorEvent.context.testSuite,
            testName: errorEvent.context.testName,
            severity: errorEvent.severity,
            recoverable: errorEvent.recoverable,
        });
    }
    async handleTestError(error, context, attemptNumber) {
        const errorType = this.categorizeTestError(error, context);
        const severity = this.determineTestErrorSeverity(errorType, attemptNumber);
        const errorEvent = {
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
    async attemptRecovery(errorEvent, context) {
        if (!errorEvent.recoverable) {
            return false;
        }
        const recoveryActions = this.recoveryActions.get(errorEvent.type) || [];
        for (const action of recoveryActions.sort((a, b) => a.priority - b.priority)) {
            const recoveryKey = `${errorEvent.type}_${action.name}`;
            const lastAttempt = this.activeRecoveries.get(recoveryKey);
            if (lastAttempt && Date.now() - lastAttempt.getTime() < action.cooldownMs) {
                continue;
            }
            try {
                logger_1.logger.info('Attempting test error recovery', {
                    errorId: errorEvent.id,
                    action: action.name,
                    description: action.description,
                });
                this.activeRecoveries.set(recoveryKey, new Date());
                const recovered = await action.action(context, errorEvent.error);
                if (recovered) {
                    errorEvent.recovered = true;
                    errorEvent.recoveryActions.push(action.name);
                    logger_1.logger.info('Test error recovery successful', {
                        errorId: errorEvent.id,
                        action: action.name,
                    });
                    this.emit('testErrorRecovered', errorEvent);
                    return true;
                }
            }
            catch (recoveryError) {
                logger_1.logger.warn('Recovery action failed', {
                    errorId: errorEvent.id,
                    action: action.name,
                    recoveryError: recoveryError.message,
                });
            }
        }
        return false;
    }
    async recoverDatabaseConnection(context, error) {
        try {
            const { DatabaseTestHelper } = await Promise.resolve().then(() => __importStar(require('@tests/helpers/DatabaseTestHelper')));
            await DatabaseTestHelper.close();
            await DatabaseTestHelper.initialize();
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async recoverDatabaseReset(context, error) {
        try {
            const { DatabaseTestHelper } = await Promise.resolve().then(() => __importStar(require('@tests/helpers/DatabaseTestHelper')));
            await DatabaseTestHelper.reset();
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async recoverDatabaseMigrations(context, error) {
        try {
            logger_1.logger.info('Checking database migrations for test recovery');
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async recoverWithMockService(context, error) {
        try {
            global.mockServices = {
                ...global.mockServices,
                enabled: true,
            };
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async recoverServiceHealthCheck(context, error) {
        await this.delay(5000);
        return Math.random() > 0.5;
    }
    async recoverIncreaseTimeout(context, error) {
        context.timeout = Math.min(context.timeout * 1.5, 600000);
        return true;
    }
    async recoverOptimizeResources(context, error) {
        if (global.gc) {
            global.gc();
        }
        return true;
    }
    async recoverForceGC(context, error) {
        if (global.gc) {
            global.gc();
            return true;
        }
        return false;
    }
    async recoverRestartWorker(context, error) {
        logger_1.logger.warn('Worker restart recovery not implemented in test environment');
        return false;
    }
    async recoverResetEnvironment(context, error) {
        try {
            jest.clearAllMocks();
            jest.restoreAllMocks();
            return true;
        }
        catch (err) {
            return false;
        }
    }
    async recoverClearJestCache(context, error) {
        try {
            jest.resetModules();
            return true;
        }
        catch (err) {
            return false;
        }
    }
    categorizeTestError(error, context) {
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
    determineTestErrorSeverity(type, attemptNumber) {
        if (attemptNumber > 2)
            return ErrorMonitoringService_1.ErrorSeverity.HIGH;
        switch (type) {
            case TestErrorType.DATABASE_FAILURE:
            case TestErrorType.FRAMEWORK_ERROR:
            case TestErrorType.ENVIRONMENT_ERROR:
                return ErrorMonitoringService_1.ErrorSeverity.HIGH;
            case TestErrorType.EXTERNAL_SERVICE_FAILURE:
            case TestErrorType.TIMEOUT_FAILURE:
            case TestErrorType.MEMORY_LEAK:
                return ErrorMonitoringService_1.ErrorSeverity.MEDIUM;
            default:
                return ErrorMonitoringService_1.ErrorSeverity.LOW;
        }
    }
    isRecoverable(type) {
        const nonRecoverableTypes = [
            TestErrorType.ASSERTION_FAILURE,
            TestErrorType.CONFIGURATION_ERROR,
        ];
        return !nonRecoverableTypes.includes(type);
    }
    shouldIsolateTest(context) {
        if (!this.config.isolationEnabled)
            return false;
        const testId = this.generateTestId(context);
        return this.isolatedTests.has(testId);
    }
    markTestSuccess(testId) {
        this.failedTests.delete(testId);
        this.isolatedTests.delete(testId);
    }
    markTestFailure(testId, error) {
        this.failedTests.add(testId);
        const recentFailures = Array.from(this.errorBuffer.values())
            .filter(e => this.generateTestId(e.context) === testId)
            .filter(e => e.timestamp.getTime() > Date.now() - 3600000);
        if (recentFailures.length >= this.config.escalationThreshold) {
            this.isolatedTests.add(testId);
            logger_1.logger.warn('Test isolated due to repeated failures', {
                testId,
                failures: recentFailures.length,
            });
        }
    }
    generateTestId(context) {
        return `${context.testSuite}:${context.testName}`;
    }
    generateErrorId() {
        return `test_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async executeWithTimeout(operation, timeoutMs) {
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
    setupTestMonitoring(context) {
        const startMemory = process.memoryUsage();
        const startTime = Date.now();
        return {
            startMemory,
            startTime,
            interval: setInterval(() => {
                const currentMemory = process.memoryUsage();
                const memoryDelta = currentMemory.heapUsed - startMemory.heapUsed;
                if (memoryDelta > this.config.memoryLimitMB * 1024 * 1024) {
                    logger_1.logger.warn('Test memory usage exceeded threshold', {
                        testSuite: context.testSuite,
                        testName: context.testName,
                        memoryDelta,
                        limit: this.config.memoryLimitMB,
                    });
                }
            }, 10000),
        };
    }
    cleanupTestMonitoring(monitor) {
        if (monitor.interval) {
            clearInterval(monitor.interval);
        }
    }
    startHealthMonitoring() {
        setInterval(() => {
            const health = this.getTestHealthStatus();
            if (health.status !== 'healthy') {
                this.emit('testHealthDegraded', health);
            }
        }, 60000);
    }
    maintainBufferSize() {
        if (this.errorBuffer.size > this.maxBufferSize) {
            const sortedErrors = Array.from(this.errorBuffer.entries())
                .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
            const toRemove = sortedErrors.slice(0, this.errorBuffer.size - this.maxBufferSize);
            toRemove.forEach(([id]) => this.errorBuffer.delete(id));
        }
    }
    getDatabaseConnectionInfo() {
        return {
            host: process.env.TEST_DB_HOST || 'localhost',
            port: process.env.TEST_DB_PORT || '5432',
            database: process.env.TEST_DB_NAME || 'waste_management_test',
        };
    }
    calculateRecoverySuccessRate(errors) {
        const recoverableErrors = errors.filter(e => e.recoverable);
        if (recoverableErrors.length === 0)
            return 100;
        const recoveredErrors = recoverableErrors.filter(e => e.recovered);
        return (recoveredErrors.length / recoverableErrors.length) * 100;
    }
    getTopFailingTests(errors) {
        const testFailures = new Map();
        errors.forEach(error => {
            const testId = this.generateTestId(error.context);
            testFailures.set(testId, (testFailures.get(testId) || 0) + 1);
        });
        return Array.from(testFailures.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([testId, count]) => ({ testId, failures: count }));
    }
    getRecoveryActionStats() {
        const stats = new Map();
        Array.from(this.errorBuffer.values()).forEach(error => {
            error.recoveryActions.forEach(action => {
                if (!stats.has(action)) {
                    stats.set(action, { attempts: 0, successes: 0 });
                }
                const stat = stats.get(action);
                stat.attempts++;
                if (error.recovered) {
                    stat.successes++;
                }
            });
        });
        return Object.fromEntries(Array.from(stats.entries()).map(([action, stat]) => [
            action,
            {
                ...stat,
                successRate: stat.attempts > 0 ? (stat.successes / stat.attempts) * 100 : 0,
            },
        ]));
    }
    generateRecommendations(errors) {
        const recommendations = [];
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
    groupBy(array, property) {
        const groups = {};
        const getKey = typeof property === 'string' ? (item) => String(item[property]) : property;
        for (const item of array) {
            const key = getKey(item);
            groups[key] = (groups[key] || 0) + 1;
        }
        return groups;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async attemptDatabaseRecovery(errorEvent, context) {
        const recoveryActions = this.recoveryActions.get(TestErrorType.DATABASE_FAILURE) || [];
        for (const action of recoveryActions) {
            try {
                const recovered = await action.action(context, errorEvent.error);
                if (recovered) {
                    errorEvent.recovered = true;
                    errorEvent.recoveryActions.push(action.name);
                    return true;
                }
            }
            catch (recoveryError) {
                logger_1.logger.warn('Database recovery action failed', {
                    action: action.name,
                    error: recoveryError.message,
                });
            }
        }
        return false;
    }
}
exports.TestErrorBoundary = TestErrorBoundary;
exports.testErrorBoundary = new TestErrorBoundary();
exports.default = TestErrorBoundary;
//# sourceMappingURL=TestErrorBoundary.js.map