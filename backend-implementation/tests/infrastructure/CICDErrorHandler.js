"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cicdErrorHandler = exports.CICDErrorHandler = exports.CICDErrorType = exports.PipelineEnvironment = exports.PipelineStage = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const logger_1 = require("@/utils/logger");
const TestErrorBoundary_1 = require("./TestErrorBoundary");
const ErrorMonitoringService_1 = require("@/services/ErrorMonitoringService");
var PipelineStage;
(function (PipelineStage) {
    PipelineStage["SETUP"] = "setup";
    PipelineStage["INSTALL"] = "install";
    PipelineStage["LINT"] = "lint";
    PipelineStage["BUILD"] = "build";
    PipelineStage["TEST_UNIT"] = "test_unit";
    PipelineStage["TEST_INTEGRATION"] = "test_integration";
    PipelineStage["TEST_E2E"] = "test_e2e";
    PipelineStage["SECURITY_SCAN"] = "security_scan";
    PipelineStage["COVERAGE_ANALYSIS"] = "coverage_analysis";
    PipelineStage["QUALITY_GATES"] = "quality_gates";
    PipelineStage["PACKAGE"] = "package";
    PipelineStage["DEPLOY"] = "deploy";
    PipelineStage["CLEANUP"] = "cleanup";
})(PipelineStage || (exports.PipelineStage = PipelineStage = {}));
var PipelineEnvironment;
(function (PipelineEnvironment) {
    PipelineEnvironment["LOCAL"] = "local";
    PipelineEnvironment["CI"] = "ci";
    PipelineEnvironment["STAGING"] = "staging";
    PipelineEnvironment["PRODUCTION"] = "production";
})(PipelineEnvironment || (exports.PipelineEnvironment = PipelineEnvironment = {}));
var CICDErrorType;
(function (CICDErrorType) {
    CICDErrorType["DEPENDENCY_RESOLUTION"] = "dependency_resolution";
    CICDErrorType["BUILD_COMPILATION"] = "build_compilation";
    CICDErrorType["TEST_EXECUTION"] = "test_execution";
    CICDErrorType["COVERAGE_COLLECTION"] = "coverage_collection";
    CICDErrorType["QUALITY_GATE_FAILURE"] = "quality_gate_failure";
    CICDErrorType["SECURITY_VULNERABILITY"] = "security_vulnerability";
    CICDErrorType["DEPLOYMENT_FAILURE"] = "deployment_failure";
    CICDErrorType["ENVIRONMENT_SETUP"] = "environment_setup";
    CICDErrorType["RESOURCE_EXHAUSTION"] = "resource_exhaustion";
    CICDErrorType["NETWORK_CONNECTIVITY"] = "network_connectivity";
    CICDErrorType["ARTIFACT_CORRUPTION"] = "artifact_corruption";
    CICDErrorType["TIMEOUT_EXCEEDED"] = "timeout_exceeded";
})(CICDErrorType || (exports.CICDErrorType = CICDErrorType = {}));
class CICDErrorHandler extends events_1.EventEmitter {
    constructor() {
        super();
        this.pipelineExecutions = new Map();
        this.errorHistory = new Map();
        this.recoveryStrategies = [];
        this.qualityGates = [];
        this.activeRecoveries = new Map();
        this.maxHistorySize = 1000;
        this.healthMetrics = this.initializeHealthMetrics();
        this.initializeRecoveryStrategies();
        this.initializeQualityGates();
        this.startHealthMonitoring();
    }
    async executePipelineStage(stage, context, stageFunction) {
        const stageId = this.generateStageId(context.pipelineId, stage);
        context.stage = stage;
        logger_1.logger.info('Starting pipeline stage', {
            pipelineId: context.pipelineId,
            stage,
            environment: context.environment,
        });
        let lastError = null;
        let attemptCount = 0;
        while (attemptCount <= context.maxRetries) {
            try {
                await this.validateStagePrerequisites(stage, context);
                const startTime = Date.now();
                const result = await this.executeStageWithMonitoring(stageFunction, context);
                const duration = Date.now() - startTime;
                await this.validateStageResults(stage, context, result);
                this.recordStageSuccess(stageId, stage, duration);
                logger_1.logger.info('Pipeline stage completed successfully', {
                    pipelineId: context.pipelineId,
                    stage,
                    duration,
                    attempt: attemptCount + 1,
                });
                return result;
            }
            catch (error) {
                lastError = error;
                attemptCount++;
                const errorEvent = await this.handleStageError(error, stage, context, attemptCount);
                if (attemptCount <= context.maxRetries) {
                    const recovered = await this.attemptStageRecovery(errorEvent, context);
                    if (recovered) {
                        logger_1.logger.info('Pipeline stage recovered successfully', {
                            pipelineId: context.pipelineId,
                            stage,
                            attempt: attemptCount,
                        });
                        await this.delay(1000 * Math.pow(2, attemptCount - 1));
                        continue;
                    }
                }
                if (attemptCount > context.maxRetries) {
                    break;
                }
                await this.delay(2000 * attemptCount);
            }
        }
        this.recordStageFailure(stageId, stage, lastError);
        if (this.isBlockingStageFailure(stage, lastError)) {
            await this.handleBlockingFailure(context, stage, lastError);
        }
        throw lastError;
    }
    async validateQualityGates(context, results) {
        const gateResults = [];
        let allPassed = true;
        for (const gate of this.qualityGates) {
            const value = this.extractQualityGateValue(gate, results);
            const passed = this.evaluateQualityGate(gate, value);
            if (!passed) {
                allPassed = false;
                if (gate.blocking) {
                    logger_1.logger.error('Blocking quality gate failed', {
                        pipelineId: context.pipelineId,
                        gate: gate.name,
                        value,
                        threshold: gate.threshold,
                    });
                    await this.handleStageError(new Error(`Quality gate failed: ${gate.name} (${value} ${gate.operator} ${gate.threshold})`), PipelineStage.QUALITY_GATES, context, 1);
                }
                else {
                    logger_1.logger.warn('Non-blocking quality gate failed', {
                        pipelineId: context.pipelineId,
                        gate: gate.name,
                        value,
                        threshold: gate.threshold,
                    });
                }
            }
            gateResults.push({
                gate: gate.name,
                passed,
                value,
                threshold: gate.threshold,
                blocking: gate.blocking,
            });
        }
        return {
            passed: allPassed,
            results: gateResults,
        };
    }
    async setupEnvironmentConfiguration(environment, context) {
        try {
            switch (environment) {
                case PipelineEnvironment.LOCAL:
                    await this.setupLocalEnvironment(context);
                    break;
                case PipelineEnvironment.CI:
                    await this.setupCIEnvironment(context);
                    break;
                case PipelineEnvironment.STAGING:
                    await this.setupStagingEnvironment(context);
                    break;
                case PipelineEnvironment.PRODUCTION:
                    await this.setupProductionEnvironment(context);
                    break;
            }
            logger_1.logger.info('Environment configuration completed', {
                pipelineId: context.pipelineId,
                environment,
            });
        }
        catch (error) {
            logger_1.logger.error('Environment configuration failed', {
                pipelineId: context.pipelineId,
                environment,
                error: error.message,
            });
            throw error;
        }
    }
    getHealthMetrics() {
        return { ...this.healthMetrics };
    }
    getPipelineExecutionReport(pipelineId, timeRangeMs = 3600000) {
        const cutoff = Date.now() - timeRangeMs;
        const recentErrors = Array.from(this.errorHistory.values())
            .filter(error => error.timestamp.getTime() >= cutoff);
        if (pipelineId) {
            recentErrors.filter(error => error.pipelineId === pipelineId);
        }
        return {
            summary: {
                totalExecutions: this.pipelineExecutions.size,
                totalErrors: recentErrors.length,
                recoveredErrors: recentErrors.filter(e => e.recovered).length,
                blockedExecutions: this.getBlockedExecutions().length,
                averageDuration: this.calculateAveragePipelineDuration(),
            },
            errorsByStage: this.groupBy(recentErrors, 'stage'),
            errorsByType: this.groupBy(recentErrors, 'errorType'),
            errorsBySeverity: this.groupBy(recentErrors, 'severity'),
            recoveryEffectiveness: this.calculateRecoveryEffectiveness(recentErrors),
            qualityGateStatus: this.getQualityGateStatus(),
            recommendations: this.generatePipelineRecommendations(recentErrors),
            healthMetrics: this.healthMetrics,
            timestamp: new Date(),
        };
    }
    initializeRecoveryStrategies() {
        this.recoveryStrategies = [
            {
                name: 'dependency_resolution_retry',
                applicableStages: [PipelineStage.INSTALL],
                applicableErrors: [CICDErrorType.DEPENDENCY_RESOLUTION],
                priority: 1,
                maxAttempts: 3,
                cooldownMs: 5000,
                action: this.recoverDependencyResolution.bind(this),
                description: 'Clear package cache and retry dependency installation',
            },
            {
                name: 'build_cache_clear',
                applicableStages: [PipelineStage.BUILD],
                applicableErrors: [CICDErrorType.BUILD_COMPILATION, CICDErrorType.ARTIFACT_CORRUPTION],
                priority: 1,
                maxAttempts: 2,
                cooldownMs: 3000,
                action: this.recoverBuildCache.bind(this),
                description: 'Clear build cache and rebuild from clean state',
            },
            {
                name: 'test_environment_reset',
                applicableStages: [PipelineStage.TEST_UNIT, PipelineStage.TEST_INTEGRATION, PipelineStage.TEST_E2E],
                applicableErrors: [CICDErrorType.TEST_EXECUTION, CICDErrorType.ENVIRONMENT_SETUP],
                priority: 2,
                maxAttempts: 2,
                cooldownMs: 10000,
                action: this.recoverTestEnvironment.bind(this),
                description: 'Reset test environment and retry test execution',
            },
            {
                name: 'resource_cleanup',
                applicableStages: Object.values(PipelineStage),
                applicableErrors: [CICDErrorType.RESOURCE_EXHAUSTION],
                priority: 1,
                maxAttempts: 1,
                cooldownMs: 5000,
                action: this.recoverResourceExhaustion.bind(this),
                description: 'Clean up resources and free memory/disk space',
            },
            {
                name: 'network_retry',
                applicableStages: Object.values(PipelineStage),
                applicableErrors: [CICDErrorType.NETWORK_CONNECTIVITY],
                priority: 2,
                maxAttempts: 3,
                cooldownMs: 2000,
                action: this.recoverNetworkConnectivity.bind(this),
                description: 'Retry network operations with exponential backoff',
            },
            {
                name: 'timeout_extension',
                applicableStages: Object.values(PipelineStage),
                applicableErrors: [CICDErrorType.TIMEOUT_EXCEEDED],
                priority: 3,
                maxAttempts: 1,
                cooldownMs: 1000,
                action: this.recoverTimeoutExtension.bind(this),
                description: 'Extend timeout and retry operation',
            },
        ];
    }
    initializeQualityGates() {
        this.qualityGates = [
            {
                name: 'test_coverage',
                stage: PipelineStage.COVERAGE_ANALYSIS,
                type: 'coverage',
                threshold: 80,
                operator: 'gte',
                blocking: true,
                description: 'Test coverage must be at least 80%',
            },
            {
                name: 'build_time',
                stage: PipelineStage.BUILD,
                type: 'performance',
                threshold: 300000,
                operator: 'lte',
                blocking: false,
                description: 'Build should complete within 5 minutes',
            },
            {
                name: 'test_execution_time',
                stage: PipelineStage.TEST_UNIT,
                type: 'performance',
                threshold: 600000,
                operator: 'lte',
                blocking: false,
                description: 'Unit tests should complete within 10 minutes',
            },
            {
                name: 'security_vulnerabilities',
                stage: PipelineStage.SECURITY_SCAN,
                type: 'security',
                threshold: 0,
                operator: 'eq',
                blocking: true,
                description: 'No high or critical security vulnerabilities allowed',
            },
            {
                name: 'code_quality_score',
                stage: PipelineStage.LINT,
                type: 'quality',
                threshold: 8.0,
                operator: 'gte',
                blocking: false,
                description: 'Code quality score should be at least 8.0',
            },
        ];
    }
    async handleStageError(error, stage, context, attemptNumber) {
        const errorType = this.categorizeError(error, stage);
        const severity = this.determineSeverity(errorType, stage, attemptNumber);
        const errorEvent = {
            id: this.generateErrorId(),
            pipelineId: context.pipelineId,
            stage,
            errorType,
            error,
            context,
            timestamp: new Date(),
            severity,
            recoverable: this.isRecoverable(errorType, stage),
            recovered: false,
            recoveryActions: [],
            metrics: {
                duration: Date.now() - context.startTime.getTime(),
                memoryUsage: process.memoryUsage().heapUsed,
                cpuUsage: process.cpuUsage().user,
            },
        };
        this.errorHistory.set(errorEvent.id, errorEvent);
        this.maintainHistorySize();
        await TestErrorBoundary_1.testErrorBoundary.handlePipelineError(error, stage, context);
        await ErrorMonitoringService_1.errorMonitoring.trackError(error, {
            pipelineId: context.pipelineId,
            stage,
            environment: context.environment,
            branch: context.branch,
        }, {
            pipelineError: true,
            errorType,
            attemptNumber,
            context,
        });
        this.emit('pipelineError', errorEvent);
        logger_1.logger.error('Pipeline stage error', {
            errorId: errorEvent.id,
            pipelineId: context.pipelineId,
            stage,
            errorType,
            severity,
            recoverable: errorEvent.recoverable,
            attempt: attemptNumber,
        });
        return errorEvent;
    }
    async attemptStageRecovery(errorEvent, context) {
        if (!errorEvent.recoverable) {
            return false;
        }
        const applicableStrategies = this.recoveryStrategies
            .filter(strategy => strategy.applicableStages.includes(errorEvent.stage) &&
            strategy.applicableErrors.includes(errorEvent.errorType))
            .sort((a, b) => a.priority - b.priority);
        for (const strategy of applicableStrategies) {
            const recoveryKey = `${strategy.name}_${errorEvent.pipelineId}`;
            const lastAttempt = this.activeRecoveries.get(recoveryKey);
            if (lastAttempt && Date.now() - lastAttempt.getTime() < strategy.cooldownMs) {
                continue;
            }
            try {
                logger_1.logger.info('Attempting pipeline recovery', {
                    pipelineId: context.pipelineId,
                    stage: errorEvent.stage,
                    strategy: strategy.name,
                    description: strategy.description,
                });
                this.activeRecoveries.set(recoveryKey, new Date());
                const recovered = await strategy.action(context, errorEvent.error);
                if (recovered) {
                    errorEvent.recovered = true;
                    errorEvent.recoveryActions.push(strategy.name);
                    logger_1.logger.info('Pipeline recovery successful', {
                        pipelineId: context.pipelineId,
                        stage: errorEvent.stage,
                        strategy: strategy.name,
                    });
                    this.emit('pipelineRecovered', {
                        errorEvent,
                        strategy: strategy.name,
                        timestamp: new Date(),
                    });
                    return true;
                }
            }
            catch (recoveryError) {
                logger_1.logger.warn('Pipeline recovery strategy failed', {
                    pipelineId: context.pipelineId,
                    strategy: strategy.name,
                    recoveryError: recoveryError.message,
                });
            }
        }
        return false;
    }
    async recoverDependencyResolution(context, error) {
        try {
            logger_1.logger.info('Clearing package cache and retrying dependency installation');
            await this.executeCommand('npm cache clean --force', { timeout: 30000 });
            await this.executeCommand('rm -rf node_modules package-lock.json', { timeout: 10000 });
            await this.executeCommand('npm ci', { timeout: 300000 });
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error('Dependency resolution recovery failed', {
                error: recoveryError.message,
            });
            return false;
        }
    }
    async recoverBuildCache(context, error) {
        try {
            logger_1.logger.info('Clearing build cache and rebuilding');
            await this.executeCommand('rm -rf dist/ .cache/ .tmp/', { timeout: 10000 });
            await this.executeCommand('npx tsc --build --clean', { timeout: 30000 });
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error('Build cache recovery failed', {
                error: recoveryError.message,
            });
            return false;
        }
    }
    async recoverTestEnvironment(context, error) {
        try {
            logger_1.logger.info('Resetting test environment');
            await this.executeCommand('npx jest --clearCache', { timeout: 30000 });
            if (context.environment_variables.TEST_DB_NAME) {
                await this.executeCommand('npm run test:db:reset', { timeout: 60000 });
            }
            await this.executeCommand('rm -rf coverage/ test-results/ .jest-cache/', { timeout: 10000 });
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error('Test environment recovery failed', {
                error: recoveryError.message,
            });
            return false;
        }
    }
    async recoverResourceExhaustion(context, error) {
        try {
            logger_1.logger.info('Cleaning up resources');
            if (global.gc) {
                global.gc();
            }
            await this.executeCommand('find /tmp -name "tmp*" -type f -delete', {
                timeout: 30000,
                ignoreErrors: true
            });
            await this.executeCommand('docker system prune -f', {
                timeout: 60000,
                ignoreErrors: true
            });
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error('Resource cleanup recovery failed', {
                error: recoveryError.message,
            });
            return false;
        }
    }
    async recoverNetworkConnectivity(context, error) {
        try {
            logger_1.logger.info('Testing network connectivity');
            await this.executeCommand('ping -c 1 8.8.8.8', { timeout: 10000 });
            await this.executeCommand('npm ping', { timeout: 10000 });
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error('Network connectivity recovery failed', {
                error: recoveryError.message,
            });
            return false;
        }
    }
    async recoverTimeoutExtension(context, error) {
        context.timeout = Math.min(context.timeout * 1.5, 1800000);
        logger_1.logger.info('Extended operation timeout', {
            newTimeout: context.timeout,
        });
        return true;
    }
    async setupLocalEnvironment(context) {
        const envFile = '.env.local';
        if (await this.fileExists(envFile)) {
            const envContent = await fs_1.promises.readFile(envFile, 'utf8');
            this.parseEnvContent(envContent, context.environment_variables);
        }
    }
    async setupCIEnvironment(context) {
        context.environment_variables.CI = 'true';
        context.environment_variables.NODE_ENV = 'test';
        context.environment_variables.FORCE_COLOR = '0';
        context.environment_variables.NODE_OPTIONS = '--max-old-space-size=4096';
    }
    async setupStagingEnvironment(context) {
        const envFile = '.env.staging';
        if (await this.fileExists(envFile)) {
            const envContent = await fs_1.promises.readFile(envFile, 'utf8');
            this.parseEnvContent(envContent, context.environment_variables);
        }
    }
    async setupProductionEnvironment(context) {
        const envFile = '.env.production';
        if (await this.fileExists(envFile)) {
            const envContent = await fs_1.promises.readFile(envFile, 'utf8');
            this.parseEnvContent(envContent, context.environment_variables);
        }
        context.environment_variables.NODE_ENV = 'production';
        context.environment_variables.NODE_OPTIONS = '--max-old-space-size=2048';
    }
    categorizeError(error, stage) {
        const message = error.message.toLowerCase();
        const stack = error.stack?.toLowerCase() || '';
        switch (stage) {
            case PipelineStage.INSTALL:
                if (message.includes('npm') || message.includes('package')) {
                    return CICDErrorType.DEPENDENCY_RESOLUTION;
                }
                break;
            case PipelineStage.BUILD:
                if (message.includes('typescript') || message.includes('compilation')) {
                    return CICDErrorType.BUILD_COMPILATION;
                }
                break;
            case PipelineStage.TEST_UNIT:
            case PipelineStage.TEST_INTEGRATION:
            case PipelineStage.TEST_E2E:
                return CICDErrorType.TEST_EXECUTION;
            case PipelineStage.SECURITY_SCAN:
                return CICDErrorType.SECURITY_VULNERABILITY;
            case PipelineStage.QUALITY_GATES:
                return CICDErrorType.QUALITY_GATE_FAILURE;
        }
        if (message.includes('timeout')) {
            return CICDErrorType.TIMEOUT_EXCEEDED;
        }
        if (message.includes('network') || message.includes('connection')) {
            return CICDErrorType.NETWORK_CONNECTIVITY;
        }
        if (message.includes('memory') || message.includes('space')) {
            return CICDErrorType.RESOURCE_EXHAUSTION;
        }
        if (message.includes('corrupt') || message.includes('invalid')) {
            return CICDErrorType.ARTIFACT_CORRUPTION;
        }
        return CICDErrorType.ENVIRONMENT_SETUP;
    }
    determineSeverity(errorType, stage, attemptNumber) {
        if (attemptNumber > 2) {
            return ErrorMonitoringService_1.ErrorSeverity.HIGH;
        }
        const criticalErrors = [
            CICDErrorType.SECURITY_VULNERABILITY,
            CICDErrorType.DEPLOYMENT_FAILURE,
        ];
        if (criticalErrors.includes(errorType)) {
            return ErrorMonitoringService_1.ErrorSeverity.CRITICAL;
        }
        const highErrors = [
            CICDErrorType.BUILD_COMPILATION,
            CICDErrorType.QUALITY_GATE_FAILURE,
            CICDErrorType.ARTIFACT_CORRUPTION,
        ];
        if (highErrors.includes(errorType)) {
            return ErrorMonitoringService_1.ErrorSeverity.HIGH;
        }
        return ErrorMonitoringService_1.ErrorSeverity.MEDIUM;
    }
    isRecoverable(errorType, stage) {
        const nonRecoverableErrors = [
            CICDErrorType.SECURITY_VULNERABILITY,
            CICDErrorType.ARTIFACT_CORRUPTION,
        ];
        return !nonRecoverableErrors.includes(errorType);
    }
    isBlockingStageFailure(stage, error) {
        const blockingStages = [
            PipelineStage.BUILD,
            PipelineStage.SECURITY_SCAN,
            PipelineStage.QUALITY_GATES,
        ];
        return blockingStages.includes(stage);
    }
    async handleBlockingFailure(context, stage, error) {
        logger_1.logger.error('Blocking pipeline failure detected', {
            pipelineId: context.pipelineId,
            stage,
            error: error.message,
        });
        this.emit('blockingFailure', {
            pipelineId: context.pipelineId,
            stage,
            error: error.message,
            timestamp: new Date(),
        });
        this.emit('pipelineAborted', {
            pipelineId: context.pipelineId,
            stage,
            reason: 'Blocking failure',
            timestamp: new Date(),
        });
    }
    async validateStagePrerequisites(stage, context) {
        switch (stage) {
            case PipelineStage.BUILD:
                await this.validateBuildPrerequisites(context);
                break;
            case PipelineStage.TEST_UNIT:
                await this.validateTestPrerequisites(context);
                break;
            case PipelineStage.DEPLOY:
                await this.validateDeployPrerequisites(context);
                break;
        }
    }
    async validateStageResults(stage, context, result) {
        switch (stage) {
            case PipelineStage.BUILD:
                await this.validateBuildResults(context, result);
                break;
            case PipelineStage.TEST_UNIT:
                await this.validateTestResults(context, result);
                break;
        }
    }
    async validateBuildPrerequisites(context) {
        if (!(await this.fileExists('src'))) {
            throw new Error('Source directory not found');
        }
        if (!(await this.fileExists('package.json'))) {
            throw new Error('package.json not found');
        }
    }
    async validateTestPrerequisites(context) {
        if (!(await this.fileExists('tests'))) {
            throw new Error('Tests directory not found');
        }
    }
    async validateDeployPrerequisites(context) {
        if (!(await this.fileExists('dist'))) {
            throw new Error('Build artifacts not found');
        }
    }
    async validateBuildResults(context, result) {
        if (!(await this.fileExists('dist'))) {
            throw new Error('Build failed to produce artifacts');
        }
    }
    async validateTestResults(context, result) {
        if (!result || typeof result.success !== 'boolean') {
            throw new Error('Invalid test results');
        }
    }
    async executeStageWithMonitoring(stageFunction, context) {
        const monitoringInterval = setInterval(() => {
            const memoryUsage = process.memoryUsage();
            this.emit('stageProgress', {
                pipelineId: context.pipelineId,
                stage: context.stage,
                memoryUsage,
                timestamp: new Date(),
            });
        }, 10000);
        try {
            return await stageFunction();
        }
        finally {
            clearInterval(monitoringInterval);
        }
    }
    recordStageSuccess(stageId, stage, duration) {
        this.healthMetrics.successRate = Math.min(100, this.healthMetrics.successRate + 0.1);
        const currentAvg = this.healthMetrics.averageDuration;
        this.healthMetrics.averageDuration = currentAvg * 0.9 + duration * 0.1;
        this.updateTrends(stage, duration);
    }
    recordStageFailure(stageId, stage, error) {
        this.healthMetrics.successRate = Math.max(0, this.healthMetrics.successRate - 1);
        this.healthMetrics.failuresByStage[stage] = (this.healthMetrics.failuresByStage[stage] || 0) + 1;
    }
    updateTrends(stage, duration) {
        const trendsKey = this.getTrendsKey(stage);
        if (trendsKey) {
            this.healthMetrics.trends[trendsKey].push(duration);
            if (this.healthMetrics.trends[trendsKey].length > 10) {
                this.healthMetrics.trends[trendsKey].shift();
            }
        }
    }
    getTrendsKey(stage) {
        switch (stage) {
            case PipelineStage.BUILD:
                return 'buildTimes';
            case PipelineStage.TEST_UNIT:
            case PipelineStage.TEST_INTEGRATION:
            case PipelineStage.TEST_E2E:
                return 'testTimes';
            default:
                return null;
        }
    }
    extractQualityGateValue(gate, results) {
        switch (gate.type) {
            case 'coverage':
                return results.coverage?.overall || 0;
            case 'performance':
                return results.duration || 0;
            case 'security':
                return results.vulnerabilities?.high || 0;
            case 'quality':
                return results.quality?.score || 0;
            default:
                return 0;
        }
    }
    evaluateQualityGate(gate, value) {
        switch (gate.operator) {
            case 'gte':
                return value >= gate.threshold;
            case 'lte':
                return value <= gate.threshold;
            case 'eq':
                return value === gate.threshold;
            default:
                return false;
        }
    }
    initializeHealthMetrics() {
        return {
            successRate: 100,
            averageDuration: 0,
            failuresByStage: {},
            failuresByErrorType: {},
            recoveryRate: 0,
            qualityGatePassRate: 100,
            resourceUtilization: {
                cpu: 0,
                memory: 0,
                disk: 0,
            },
            trends: {
                buildTimes: [],
                testTimes: [],
                errorRates: [],
            },
        };
    }
    startHealthMonitoring() {
        setInterval(() => {
            this.updateHealthMetrics();
            this.emit('healthUpdated', this.healthMetrics);
        }, 60000);
    }
    updateHealthMetrics() {
        const memoryUsage = process.memoryUsage();
        this.healthMetrics.resourceUtilization.memory =
            (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        const recentErrors = Array.from(this.errorHistory.values())
            .filter(error => error.timestamp.getTime() >= Date.now() - 3600000);
        const errorRate = recentErrors.length;
        this.healthMetrics.trends.errorRates.push(errorRate);
        if (this.healthMetrics.trends.errorRates.length > 10) {
            this.healthMetrics.trends.errorRates.shift();
        }
        const recoverableErrors = recentErrors.filter(e => e.recoverable);
        const recoveredErrors = recoverableErrors.filter(e => e.recovered);
        this.healthMetrics.recoveryRate = recoverableErrors.length > 0
            ? (recoveredErrors.length / recoverableErrors.length) * 100
            : 100;
    }
    generateStageId(pipelineId, stage) {
        return `${pipelineId}_${stage}_${Date.now()}`;
    }
    generateErrorId() {
        return `cicd_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    maintainHistorySize() {
        if (this.errorHistory.size > this.maxHistorySize) {
            const sortedEntries = Array.from(this.errorHistory.entries())
                .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
            const toRemove = sortedEntries.slice(0, this.errorHistory.size - this.maxHistorySize);
            toRemove.forEach(([id]) => this.errorHistory.delete(id));
        }
    }
    getBlockedExecutions() {
        return Array.from(this.pipelineExecutions.values())
            .filter(execution => execution.stage === PipelineStage.QUALITY_GATES);
    }
    calculateAveragePipelineDuration() {
        const completedExecutions = Array.from(this.pipelineExecutions.values())
            .filter(execution => execution.stage === PipelineStage.CLEANUP);
        if (completedExecutions.length === 0)
            return 0;
        const totalDuration = completedExecutions.reduce((sum, execution) => sum + (Date.now() - execution.startTime.getTime()), 0);
        return totalDuration / completedExecutions.length;
    }
    calculateRecoveryEffectiveness(errors) {
        const recoverableErrors = errors.filter(e => e.recoverable);
        if (recoverableErrors.length === 0)
            return 100;
        const recoveredErrors = recoverableErrors.filter(e => e.recovered);
        return (recoveredErrors.length / recoverableErrors.length) * 100;
    }
    getQualityGateStatus() {
        const enabledGates = this.qualityGates.filter(g => g.blocking);
        return {
            total: enabledGates.length,
            passing: enabledGates.length,
            failing: 0,
        };
    }
    generatePipelineRecommendations(errors) {
        const recommendations = [];
        const errorCounts = this.groupBy(errors, 'errorType');
        if (errorCounts[CICDErrorType.DEPENDENCY_RESOLUTION] > 3) {
            recommendations.push('Consider using lock files and npm ci for consistent dependency installation');
        }
        if (errorCounts[CICDErrorType.BUILD_COMPILATION] > 2) {
            recommendations.push('Review TypeScript configuration and resolve compilation errors');
        }
        if (errorCounts[CICDErrorType.TEST_EXECUTION] > 5) {
            recommendations.push('Investigate test environment stability and consider test isolation');
        }
        if (errorCounts[CICDErrorType.TIMEOUT_EXCEEDED] > 2) {
            recommendations.push('Optimize build and test performance or increase timeout limits');
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
    async executeCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const { timeout = 30000, ignoreErrors = false, cwd = process.cwd() } = options;
            const child = (0, child_process_1.spawn)('sh', ['-c', command], {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
            }, timeout);
            child.on('close', (code) => {
                clearTimeout(timer);
                if (code !== 0 && !ignoreErrors) {
                    reject(new Error(`Command failed with exit code ${code}: ${command}\nStderr: ${stderr}`));
                }
                else {
                    resolve(stdout);
                }
            });
            child.on('error', (error) => {
                clearTimeout(timer);
                if (!ignoreErrors) {
                    reject(error);
                }
                else {
                    resolve('');
                }
            });
        });
    }
    async fileExists(path) {
        try {
            await fs_1.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    parseEnvContent(content, target) {
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    target[key.trim()] = valueParts.join('=').trim();
                }
            }
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.CICDErrorHandler = CICDErrorHandler;
exports.cicdErrorHandler = new CICDErrorHandler();
exports.default = CICDErrorHandler;
//# sourceMappingURL=CICDErrorHandler.js.map