"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseTestRecoveryService = exports.DatabaseTestRecoveryService = exports.DatabaseHealthStatus = exports.DatabaseRecoveryStrategy = void 0;
const sequelize_1 = require("sequelize");
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
const TestErrorBoundary_1 = require("./TestErrorBoundary");
const DatabaseTestHelper_1 = require("@tests/helpers/DatabaseTestHelper");
var DatabaseRecoveryStrategy;
(function (DatabaseRecoveryStrategy) {
    DatabaseRecoveryStrategy["RECONNECT"] = "reconnect";
    DatabaseRecoveryStrategy["RESET_POOL"] = "reset_pool";
    DatabaseRecoveryStrategy["FULL_RESET"] = "full_reset";
    DatabaseRecoveryStrategy["MIGRATE_REPAIR"] = "migrate_repair";
    DatabaseRecoveryStrategy["BACKUP_RESTORE"] = "backup_restore";
    DatabaseRecoveryStrategy["DEADLOCK_RESOLVE"] = "deadlock_resolve";
    DatabaseRecoveryStrategy["CONSTRAINT_REPAIR"] = "constraint_repair";
})(DatabaseRecoveryStrategy || (exports.DatabaseRecoveryStrategy = DatabaseRecoveryStrategy = {}));
var DatabaseHealthStatus;
(function (DatabaseHealthStatus) {
    DatabaseHealthStatus["HEALTHY"] = "healthy";
    DatabaseHealthStatus["DEGRADED"] = "degraded";
    DatabaseHealthStatus["FAILING"] = "failing";
    DatabaseHealthStatus["CRITICAL"] = "critical";
    DatabaseHealthStatus["OFFLINE"] = "offline";
})(DatabaseHealthStatus || (exports.DatabaseHealthStatus = DatabaseHealthStatus = {}));
class DatabaseTestRecoveryService extends events_1.EventEmitter {
    constructor() {
        super();
        this.sequelize = null;
        this.activeTransactions = new Map();
        this.connectionPool = null;
        this.recoveryAttempts = new Map();
        this.circuitBreakerState = 'closed';
        this.circuitBreakerFailures = 0;
        this.circuitBreakerLastFailure = 0;
        this.circuitBreakerThreshold = 5;
        this.circuitBreakerTimeout = 30000;
        this.performanceBaselines = new Map();
        this.healthMetrics = this.initializeHealthMetrics();
        this.startHealthMonitoring();
        this.setupRecoveryStrategies();
    }
    async executeWithRecovery(context, operation) {
        if (this.circuitBreakerState === 'open') {
            if (Date.now() - this.circuitBreakerLastFailure < this.circuitBreakerTimeout) {
                throw new Error('Database circuit breaker is open - operations temporarily disabled');
            }
            else {
                this.circuitBreakerState = 'half-open';
            }
        }
        let lastError = null;
        let attemptCount = 0;
        const maxRetries = 3;
        while (attemptCount < maxRetries) {
            try {
                const startTime = Date.now();
                this.trackOperationStart(context);
                const result = await this.executeWithTimeout(operation, context.timeout);
                const duration = Date.now() - startTime;
                this.recordOperationSuccess(context, duration);
                this.updateCircuitBreakerOnSuccess();
                return result;
            }
            catch (error) {
                lastError = error;
                attemptCount++;
                const recoveryStrategy = this.analyzeErrorAndSelectStrategy(error, context);
                logger_1.logger.warn('Database operation failed, attempting recovery', {
                    testId: context.testId,
                    operation: context.operation,
                    attempt: attemptCount,
                    error: error.message,
                    strategy: recoveryStrategy,
                });
                await TestErrorBoundary_1.testErrorBoundary.handleDatabaseTestError(error, {
                    testSuite: 'database-recovery',
                    testName: context.operation,
                    testType: 'integration',
                    startTime: new Date(),
                    timeout: context.timeout,
                    retryCount: attemptCount,
                    maxRetries: maxRetries,
                    dependencies: ['database'],
                    environment: process.env.NODE_ENV || 'test',
                    metadata: context.metadata,
                });
                if (attemptCount < maxRetries) {
                    const recoveryResult = await this.attemptRecovery(recoveryStrategy, context, error);
                    if (recoveryResult.success) {
                        logger_1.logger.info('Database recovery successful', {
                            testId: context.testId,
                            strategy: recoveryStrategy,
                            duration: recoveryResult.duration,
                        });
                        await this.delay(1000 * attemptCount);
                        continue;
                    }
                    else {
                        logger_1.logger.error('Database recovery failed', {
                            testId: context.testId,
                            strategy: recoveryStrategy,
                            error: recoveryResult.error?.message,
                        });
                    }
                }
                this.updateCircuitBreakerOnFailure();
            }
        }
        this.recordOperationFailure(context, lastError);
        throw lastError;
    }
    async createResilientTransaction(context, isolationLevel) {
        return await this.executeWithRecovery(context, async () => {
            if (!this.sequelize) {
                await this.initializeConnection();
            }
            const transaction = await this.sequelize.transaction({
                isolationLevel: isolationLevel,
                type: sequelize_1.Transaction.TYPES.DEFERRED,
            });
            const transactionId = this.generateTransactionId();
            this.activeTransactions.set(transactionId, transaction);
            context.transactionId = transactionId;
            setTimeout(async () => {
                if (this.activeTransactions.has(transactionId)) {
                    logger_1.logger.warn('Transaction timeout detected, rolling back', {
                        transactionId,
                        testId: context.testId,
                    });
                    await this.safeRollback(transactionId);
                }
            }, context.timeout);
            return transaction;
        });
    }
    async safeRollback(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            return true;
        }
        try {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            this.activeTransactions.delete(transactionId);
            logger_1.logger.debug('Transaction rolled back successfully', { transactionId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to rollback transaction', {
                transactionId,
                error: error.message,
            });
            this.activeTransactions.delete(transactionId);
            return false;
        }
    }
    async safeCommit(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            logger_1.logger.warn('Attempted to commit unknown transaction', { transactionId });
            return false;
        }
        try {
            if (transaction.finished) {
                logger_1.logger.warn('Attempted to commit finished transaction', { transactionId });
                this.activeTransactions.delete(transactionId);
                return false;
            }
            await transaction.commit();
            this.activeTransactions.delete(transactionId);
            logger_1.logger.debug('Transaction committed successfully', { transactionId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to commit transaction, rolling back', {
                transactionId,
                error: error.message,
            });
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                logger_1.logger.error('Failed to rollback after commit failure', {
                    transactionId,
                    rollbackError: rollbackError.message,
                });
            }
            this.activeTransactions.delete(transactionId);
            return false;
        }
    }
    async performComprehensiveCleanup(testId) {
        logger_1.logger.info('Starting comprehensive database cleanup', { testId });
        try {
            await this.rollbackActiveTransactions();
            await this.clearTestDataWithConflictResolution();
            await this.resetSequences();
            await this.validateDatabaseIntegrity();
            await this.resetConnectionPool();
            logger_1.logger.info('Comprehensive database cleanup completed', { testId });
        }
        catch (error) {
            logger_1.logger.error('Comprehensive database cleanup failed', {
                testId,
                error: error.message,
            });
            await this.performEmergencyCleanup();
        }
    }
    getHealthStatus() {
        return { ...this.healthMetrics };
    }
    async validateSchemaIntegrity() {
        const issues = [];
        const recommendations = [];
        try {
            if (!this.sequelize) {
                await this.initializeConnection();
            }
            const models = this.sequelize.models;
            for (const modelName of Object.keys(models)) {
                const model = models[modelName];
                try {
                    await model.describe();
                }
                catch (error) {
                    issues.push(`Table for model ${modelName} is missing or corrupted`);
                    recommendations.push(`Run migration to create ${modelName} table`);
                }
            }
            const constraints = await this.validateForeignKeyConstraints();
            issues.push(...constraints.issues);
            recommendations.push(...constraints.recommendations);
            const indexes = await this.validateIndexes();
            issues.push(...indexes.issues);
            recommendations.push(...indexes.recommendations);
            return {
                valid: issues.length === 0,
                issues,
                recommendations,
            };
        }
        catch (error) {
            issues.push(`Schema validation failed: ${error.message}`);
            recommendations.push('Perform database reset and re-run migrations');
            return { valid: false, issues, recommendations };
        }
    }
    async initializeConnection() {
        if (this.sequelize) {
            return;
        }
        const maxAttempts = 3;
        let attempt = 0;
        while (attempt < maxAttempts) {
            try {
                this.sequelize = await DatabaseTestHelper_1.DatabaseTestHelper.getDatabase();
                await this.sequelize.authenticate();
                logger_1.logger.info('Database connection initialized successfully', {
                    attempt: attempt + 1,
                });
                break;
            }
            catch (error) {
                attempt++;
                logger_1.logger.warn('Failed to initialize database connection', {
                    attempt,
                    error: error.message,
                });
                if (attempt < maxAttempts) {
                    await this.delay(2000 * attempt);
                }
                else {
                    throw new Error(`Failed to initialize database connection after ${maxAttempts} attempts`);
                }
            }
        }
    }
    analyzeErrorAndSelectStrategy(error, context) {
        const message = error.message.toLowerCase();
        const errorName = error.constructor.name;
        if (error instanceof sequelize_1.ConnectionError || message.includes('connection')) {
            if (message.includes('pool')) {
                return DatabaseRecoveryStrategy.RESET_POOL;
            }
            return DatabaseRecoveryStrategy.RECONNECT;
        }
        if (message.includes('deadlock') || message.includes('lock timeout')) {
            return DatabaseRecoveryStrategy.DEADLOCK_RESOLVE;
        }
        if (message.includes('constraint') || message.includes('foreign key')) {
            return DatabaseRecoveryStrategy.CONSTRAINT_REPAIR;
        }
        if (message.includes('relation') && message.includes('does not exist')) {
            return DatabaseRecoveryStrategy.MIGRATE_REPAIR;
        }
        if (error instanceof sequelize_1.DatabaseError) {
            return DatabaseRecoveryStrategy.FULL_RESET;
        }
        return DatabaseRecoveryStrategy.RECONNECT;
    }
    async attemptRecovery(strategy, context, error) {
        const startTime = Date.now();
        let success = false;
        let recoveryError;
        const recommendations = [];
        try {
            switch (strategy) {
                case DatabaseRecoveryStrategy.RECONNECT:
                    await this.executeReconnectRecovery();
                    success = true;
                    recommendations.push('Monitor connection stability');
                    break;
                case DatabaseRecoveryStrategy.RESET_POOL:
                    await this.executeResetPoolRecovery();
                    success = true;
                    recommendations.push('Review connection pool configuration');
                    break;
                case DatabaseRecoveryStrategy.FULL_RESET:
                    await this.executeFullResetRecovery();
                    success = true;
                    recommendations.push('Investigate root cause of database corruption');
                    break;
                case DatabaseRecoveryStrategy.MIGRATE_REPAIR:
                    await this.executeMigrateRepairRecovery();
                    success = true;
                    recommendations.push('Ensure migration scripts are up to date');
                    break;
                case DatabaseRecoveryStrategy.DEADLOCK_RESOLVE:
                    await this.executeDeadlockResolveRecovery();
                    success = true;
                    recommendations.push('Review transaction isolation levels and query order');
                    break;
                case DatabaseRecoveryStrategy.CONSTRAINT_REPAIR:
                    await this.executeConstraintRepairRecovery(context);
                    success = true;
                    recommendations.push('Review data integrity constraints');
                    break;
                default:
                    throw new Error(`Unknown recovery strategy: ${strategy}`);
            }
        }
        catch (err) {
            recoveryError = err;
            success = false;
        }
        const duration = Date.now() - startTime;
        return {
            strategy,
            success,
            duration,
            error: recoveryError,
            metrics: {
                connectionTime: duration,
            },
            recommendations,
        };
    }
    async executeReconnectRecovery() {
        if (this.sequelize) {
            await this.sequelize.close();
            this.sequelize = null;
        }
        await this.initializeConnection();
    }
    async executeResetPoolRecovery() {
        if (this.sequelize) {
            const pool = this.sequelize.connectionManager?.pool;
            if (pool) {
                await pool.destroyAllNow();
            }
            await this.sequelize.close();
            this.sequelize = null;
        }
        await this.initializeConnection();
    }
    async executeFullResetRecovery() {
        await DatabaseTestHelper_1.DatabaseTestHelper.reset();
        this.sequelize = null;
        await this.initializeConnection();
    }
    async executeMigrateRepairRecovery() {
        try {
            await DatabaseTestHelper_1.DatabaseTestHelper.reset();
            this.sequelize = null;
            await this.initializeConnection();
        }
        catch (error) {
            logger_1.logger.error('Migration repair failed', { error: error.message });
            throw error;
        }
    }
    async executeDeadlockResolveRecovery() {
        await this.rollbackActiveTransactions();
        await this.delay(1000);
    }
    async executeConstraintRepairRecovery(context) {
        await this.clearTestDataWithConflictResolution();
        await this.resetSequences();
    }
    async rollbackActiveTransactions() {
        const transactionIds = Array.from(this.activeTransactions.keys());
        for (const id of transactionIds) {
            try {
                await this.safeRollback(id);
            }
            catch (error) {
                logger_1.logger.warn('Failed to rollback transaction during cleanup', {
                    transactionId: id,
                    error: error.message,
                });
            }
        }
    }
    async clearTestDataWithConflictResolution() {
        if (!this.sequelize)
            return;
        try {
            await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
            const models = Object.values(this.sequelize.models);
            for (const model of models.reverse()) {
                try {
                    await model.truncate({ cascade: true, restartIdentity: true });
                }
                catch (error) {
                    logger_1.logger.warn('Failed to truncate table', {
                        table: model.tableName,
                        error: error.message,
                    });
                }
            }
            await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear test data', { error: error.message });
            try {
                await DatabaseTestHelper_1.DatabaseTestHelper.cleanup();
            }
            catch (fallbackError) {
                logger_1.logger.error('Fallback cleanup also failed', {
                    error: fallbackError.message,
                });
            }
        }
    }
    async resetSequences() {
        if (!this.sequelize)
            return;
        try {
            const sequences = await this.sequelize.query("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'", { type: 'SELECT' });
            for (const seq of sequences) {
                await this.sequelize.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
            }
        }
        catch (error) {
            logger_1.logger.debug('Sequence reset not supported or failed', {
                error: error.message,
            });
        }
    }
    async validateDatabaseIntegrity() {
        if (!this.sequelize)
            return;
        try {
            await this.sequelize.query('SELECT 1 as test', { type: 'SELECT' });
            for (const model of Object.values(this.sequelize.models)) {
                await model.describe();
            }
        }
        catch (error) {
            throw new Error(`Database integrity validation failed: ${error.message}`);
        }
    }
    async resetConnectionPool() {
        if (this.sequelize) {
            const connectionManager = this.sequelize.connectionManager;
            if (connectionManager && connectionManager.pool) {
                try {
                    await connectionManager.pool.clear();
                }
                catch (error) {
                    logger_1.logger.debug('Connection pool clear failed', { error: error.message });
                }
            }
        }
    }
    async performEmergencyCleanup() {
        logger_1.logger.warn('Performing emergency database cleanup');
        try {
            if (this.sequelize) {
                await this.sequelize.close();
                this.sequelize = null;
            }
            this.activeTransactions.clear();
            this.healthMetrics = this.initializeHealthMetrics();
            await this.initializeConnection();
        }
        catch (error) {
            logger_1.logger.error('Emergency cleanup failed', { error: error.message });
        }
    }
    async validateForeignKeyConstraints() {
        const issues = [];
        const recommendations = [];
        try {
        }
        catch (error) {
            issues.push(`Foreign key validation failed: ${error.message}`);
            recommendations.push('Review foreign key constraints and referential integrity');
        }
        return { issues, recommendations };
    }
    async validateIndexes() {
        const issues = [];
        const recommendations = [];
        try {
        }
        catch (error) {
            issues.push(`Index validation failed: ${error.message}`);
            recommendations.push('Review database indexes and query performance');
        }
        return { issues, recommendations };
    }
    initializeHealthMetrics() {
        return {
            status: DatabaseHealthStatus.HEALTHY,
            connectionCount: 0,
            activeTransactions: 0,
            averageResponseTime: 0,
            errorRate: 0,
            deadlockCount: 0,
            connectionPoolUtilization: 0,
            lastSuccessfulOperation: new Date(),
            consecutiveFailures: 0,
            recommendations: [],
        };
    }
    startHealthMonitoring() {
        setInterval(() => {
            this.updateHealthMetrics();
        }, 30000);
    }
    setupRecoveryStrategies() {
        this.performanceBaselines.set('connection', 1000);
        this.performanceBaselines.set('query', 5000);
        this.performanceBaselines.set('transaction', 10000);
    }
    updateHealthMetrics() {
        const now = Date.now();
        this.healthMetrics.connectionCount = this.sequelize ? 1 : 0;
        this.healthMetrics.activeTransactions = this.activeTransactions.size;
        if (this.circuitBreakerState === 'open') {
            this.healthMetrics.status = DatabaseHealthStatus.OFFLINE;
        }
        else if (this.circuitBreakerFailures > 2) {
            this.healthMetrics.status = DatabaseHealthStatus.FAILING;
        }
        else if (this.circuitBreakerFailures > 0) {
            this.healthMetrics.status = DatabaseHealthStatus.DEGRADED;
        }
        else {
            this.healthMetrics.status = DatabaseHealthStatus.HEALTHY;
        }
        this.generateHealthRecommendations();
        this.emit('healthUpdated', this.healthMetrics);
    }
    generateHealthRecommendations() {
        const recommendations = [];
        if (this.healthMetrics.activeTransactions > 10) {
            recommendations.push('High number of active transactions - review transaction cleanup');
        }
        if (this.healthMetrics.averageResponseTime > 5000) {
            recommendations.push('High database response time - consider query optimization');
        }
        if (this.healthMetrics.errorRate > 10) {
            recommendations.push('High error rate - investigate database connectivity issues');
        }
        if (this.healthMetrics.consecutiveFailures > 3) {
            recommendations.push('Multiple consecutive failures - consider database maintenance');
        }
        this.healthMetrics.recommendations = recommendations;
    }
    trackOperationStart(context) {
        this.emit('operationStarted', {
            testId: context.testId,
            operation: context.operation,
            timestamp: new Date(),
        });
    }
    recordOperationSuccess(context, duration) {
        this.healthMetrics.lastSuccessfulOperation = new Date();
        this.healthMetrics.consecutiveFailures = 0;
        const currentAvg = this.healthMetrics.averageResponseTime;
        this.healthMetrics.averageResponseTime = currentAvg * 0.9 + duration * 0.1;
        this.emit('operationSucceeded', {
            testId: context.testId,
            operation: context.operation,
            duration,
            timestamp: new Date(),
        });
    }
    recordOperationFailure(context, error) {
        this.healthMetrics.consecutiveFailures++;
        this.healthMetrics.errorRate = Math.min(100, this.healthMetrics.errorRate + 1);
        this.emit('operationFailed', {
            testId: context.testId,
            operation: context.operation,
            error: error.message,
            timestamp: new Date(),
        });
    }
    updateCircuitBreakerOnSuccess() {
        this.circuitBreakerFailures = 0;
        this.circuitBreakerState = 'closed';
    }
    updateCircuitBreakerOnFailure() {
        this.circuitBreakerFailures++;
        this.circuitBreakerLastFailure = Date.now();
        if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
            this.circuitBreakerState = 'open';
            logger_1.logger.warn('Database circuit breaker opened', {
                failures: this.circuitBreakerFailures,
                threshold: this.circuitBreakerThreshold,
            });
        }
    }
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async executeWithTimeout(operation, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Database operation timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            operation()
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.DatabaseTestRecoveryService = DatabaseTestRecoveryService;
exports.databaseTestRecoveryService = new DatabaseTestRecoveryService();
exports.default = DatabaseTestRecoveryService;
//# sourceMappingURL=DatabaseTestRecoveryService.js.map