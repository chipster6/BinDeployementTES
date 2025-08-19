"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFailureReportingSystem = exports.testEnvironmentResilience = exports.cicdErrorHandler = exports.databaseTestRecoveryService = exports.testExecutionMonitor = exports.testErrorBoundary = exports.testingInfrastructureManager = exports.TestingInfrastructureManager = void 0;
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
const TestErrorBoundary_1 = require("./TestErrorBoundary");
Object.defineProperty(exports, "testErrorBoundary", { enumerable: true, get: function () { return TestErrorBoundary_1.testErrorBoundary; } });
const TestExecutionMonitor_1 = require("./TestExecutionMonitor");
Object.defineProperty(exports, "testExecutionMonitor", { enumerable: true, get: function () { return TestExecutionMonitor_1.testExecutionMonitor; } });
const DatabaseTestRecoveryService_1 = require("./DatabaseTestRecoveryService");
Object.defineProperty(exports, "databaseTestRecoveryService", { enumerable: true, get: function () { return DatabaseTestRecoveryService_1.databaseTestRecoveryService; } });
const CICDErrorHandler_1 = require("./CICDErrorHandler");
Object.defineProperty(exports, "cicdErrorHandler", { enumerable: true, get: function () { return CICDErrorHandler_1.cicdErrorHandler; } });
const TestEnvironmentResilience_1 = require("./TestEnvironmentResilience");
Object.defineProperty(exports, "testEnvironmentResilience", { enumerable: true, get: function () { return TestEnvironmentResilience_1.testEnvironmentResilience; } });
const TestFailureReportingSystem_1 = require("./TestFailureReportingSystem");
Object.defineProperty(exports, "testFailureReportingSystem", { enumerable: true, get: function () { return TestFailureReportingSystem_1.testFailureReportingSystem; } });
const ErrorMonitoringService_1 = require("@/services/ErrorMonitoringService");
class TestingInfrastructureManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.sprintConfig = null;
        this.isInitialized = false;
        this.monitoringInterval = null;
        this.reportingInterval = null;
        this.healthStatus = this.initializeHealthStatus();
        this.setupIntegrationEventHandlers();
    }
    async initializeSprintInfrastructure(config) {
        logger_1.logger.info('Initializing comprehensive testing infrastructure for sprint', {
            sprint: config.sprintName,
            targetCoverage: config.targetCoverage,
            targetTests: config.targetTests,
        });
        try {
            this.sprintConfig = config;
            await this.initializeAllComponents();
            this.setupComponentIntegrations();
            this.startInfrastructureMonitoring();
            this.startPeriodicReporting();
            await this.verifyInfrastructureReadiness();
            this.isInitialized = true;
            this.emit('infrastructureInitialized', {
                config,
                timestamp: new Date(),
            });
            logger_1.logger.info('Testing infrastructure initialized successfully', {
                sprint: config.sprintName,
                components: Object.keys(this.healthStatus.components).length,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize testing infrastructure', {
                sprint: config.sprintName,
                error: error.message,
            });
            throw error;
        }
    }
    async executeTestWithFullSupport(testContext, testFunction, options = {}) {
        const { enableErrorRecovery = true, enablePerformanceMonitoring = true, enableDatabaseRecovery = true, reportFailures = true, } = options;
        if (!this.isInitialized) {
            throw new Error('Testing infrastructure not initialized. Call initializeSprintInfrastructure() first.');
        }
        const testId = this.generateTestId(testContext);
        try {
            if (enablePerformanceMonitoring) {
                TestExecutionMonitor_1.testExecutionMonitor.startTestExecution(testId, testContext);
            }
            let result;
            if (enableErrorRecovery) {
                result = await TestErrorBoundary_1.testErrorBoundary.executeWithBoundary(testContext, testFunction);
            }
            else {
                result = await testFunction();
            }
            if (enablePerformanceMonitoring) {
                TestExecutionMonitor_1.testExecutionMonitor.completeTestExecution(testId, TestExecutionMonitor_1.TestExecutionStatus.PASSED);
            }
            return result;
        }
        catch (error) {
            await this.handleTestFailure(testId, testContext, error, {
                enableDatabaseRecovery,
                reportFailures,
            });
            if (enablePerformanceMonitoring) {
                TestExecutionMonitor_1.testExecutionMonitor.completeTestExecution(testId, TestExecutionMonitor_1.TestExecutionStatus.FAILED);
            }
            throw error;
        }
    }
    async executePipelineStageWithSupport(stage, environment, stageFunction, options = {}) {
        const { timeout = 600000, retryAttempts = 3, enableRecovery = true, } = options;
        const pipelineContext = {
            pipelineId: this.generatePipelineId(),
            stage,
            environment,
            branch: process.env.GIT_BRANCH || 'main',
            commit: process.env.GIT_COMMIT || 'unknown',
            triggeredBy: process.env.BUILD_USER || 'system',
            startTime: new Date(),
            timeout,
            retryCount: 0,
            maxRetries: retryAttempts,
            dependencies: [],
            environment_variables: process.env,
            artifacts: [],
            metadata: {},
        };
        try {
            return await CICDErrorHandler_1.cicdErrorHandler.executePipelineStage(stage, pipelineContext, stageFunction);
        }
        catch (error) {
            if (this.isCriticalPipelineFailure(stage, error)) {
                await this.generateImmediateFailureReport(`Critical Pipeline Failure: ${stage}`, error, { pipelineContext });
            }
            throw error;
        }
    }
    async getInfrastructureHealth() {
        try {
            await this.updateComponentHealthStatuses();
            this.calculateOverallHealth();
            this.generateHealthRecommendations();
            return { ...this.healthStatus };
        }
        catch (error) {
            logger_1.logger.error('Failed to get infrastructure health', {
                error: error.message,
            });
            throw error;
        }
    }
    async generateSprintProgressReport(format = TestFailureReportingSystem_1.ReportFormat.HTML) {
        if (!this.sprintConfig) {
            throw new Error('Sprint not configured');
        }
        try {
            const report = await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.SPRINT_PROGRESS, {
                timeRangeMs: 86400000,
                includeRecoveryGuide: true,
                includeTrendAnalysis: true,
                format,
            });
            return report.id;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate sprint progress report', {
                error: error.message,
            });
            throw error;
        }
    }
    async handleInfrastructureEmergency(emergencyType, details) {
        logger_1.logger.error('Infrastructure emergency detected', {
            type: emergencyType,
            severity: details.severity,
            components: details.affectedComponents,
        });
        try {
            switch (emergencyType) {
                case 'critical_failure':
                    await this.handleCriticalFailure(details);
                    break;
                case 'environment_down':
                    await this.handleEnvironmentDown(details);
                    break;
                case 'data_loss':
                    await this.handleDataLoss(details);
                    break;
                case 'security_breach':
                    await this.handleSecurityBreach(details);
                    break;
            }
            await this.generateEmergencyReport(emergencyType, details);
            await this.sendEmergencyNotifications(emergencyType, details);
        }
        catch (error) {
            logger_1.logger.fatal('Failed to handle infrastructure emergency', {
                emergencyType,
                error: error.message,
            });
        }
    }
    async shutdownInfrastructure() {
        logger_1.logger.info('Shutting down testing infrastructure');
        try {
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            if (this.reportingInterval) {
                clearInterval(this.reportingInterval);
                this.reportingInterval = null;
            }
            if (this.sprintConfig) {
                await this.generateFinalSprintReport();
            }
            await this.shutdownAllComponents();
            this.isInitialized = false;
            this.emit('infrastructureShutdown', {
                timestamp: new Date(),
            });
            logger_1.logger.info('Testing infrastructure shutdown completed');
        }
        catch (error) {
            logger_1.logger.error('Error during infrastructure shutdown', {
                error: error.message,
            });
        }
    }
    async initializeAllComponents() {
        logger_1.logger.debug('Initializing all infrastructure components');
        await TestEnvironmentResilience_1.testEnvironmentResilience.initializeEnvironment('test');
        logger_1.logger.debug('All infrastructure components initialized');
    }
    setupComponentIntegrations() {
        logger_1.logger.debug('Setting up component integrations');
        TestErrorBoundary_1.testErrorBoundary.on('testErrorTracked', (error) => {
            this.emit('testError', error);
        });
        TestExecutionMonitor_1.testExecutionMonitor.on('testCompleted', (metrics) => {
            this.emit('testCompleted', metrics);
        });
        CICDErrorHandler_1.cicdErrorHandler.on('pipelineError', (error) => {
            this.emit('pipelineError', error);
        });
        TestEnvironmentResilience_1.testEnvironmentResilience.on('environmentSwitched', (event) => {
            this.emit('environmentSwitched', event);
        });
        logger_1.logger.debug('Component integrations established');
    }
    setupIntegrationEventHandlers() {
        this.on('testError', this.handleCrossComponentTestError.bind(this));
        this.on('pipelineError', this.handleCrossComponentPipelineError.bind(this));
        this.on('environmentIssue', this.handleCrossComponentEnvironmentIssue.bind(this));
    }
    async handleCrossComponentTestError(error) {
        if (error.severity === ErrorMonitoringService_1.ErrorSeverity.CRITICAL) {
            await TestFailureReportingSystem_1.testFailureReportingSystem.sendNotification(`Critical test error: ${error.error.message}`, ErrorMonitoringService_1.ErrorSeverity.CRITICAL);
        }
    }
    async handleCrossComponentPipelineError(error) {
        logger_1.logger.debug('Handling cross-component pipeline error', {
            errorId: error.id,
            stage: error.stage,
        });
    }
    async handleCrossComponentEnvironmentIssue(issue) {
        logger_1.logger.debug('Handling cross-component environment issue', {
            service: issue.service,
        });
    }
    async handleTestFailure(testId, context, error, options) {
        logger_1.logger.warn('Handling test failure with full infrastructure support', {
            testId,
            testSuite: context.testSuite,
            testName: context.testName,
        });
        if (options.enableDatabaseRecovery && this.isDatabaseRelatedError(error)) {
            try {
                await DatabaseTestRecoveryService_1.databaseTestRecoveryService.performComprehensiveCleanup(testId);
            }
            catch (recoveryError) {
                logger_1.logger.error('Database recovery failed', {
                    testId,
                    error: recoveryError.message,
                });
            }
        }
        if (options.reportFailures) {
            try {
                await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.FAILURE_ANALYSIS, {
                    timeRangeMs: 300000,
                    includeRecoveryGuide: true,
                    format: TestFailureReportingSystem_1.ReportFormat.JSON,
                });
            }
            catch (reportError) {
                logger_1.logger.error('Failed to generate failure report', {
                    testId,
                    error: reportError.message,
                });
            }
        }
    }
    startInfrastructureMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performInfrastructureHealthCheck();
            }
            catch (error) {
                logger_1.logger.error('Infrastructure health check failed', {
                    error: error.message,
                });
            }
        }, 60000);
    }
    startPeriodicReporting() {
        if (!this.sprintConfig)
            return;
        const interval = this.sprintConfig.reporting.frequency === 'hourly' ? 3600000 :
            this.sprintConfig.reporting.frequency === 'daily' ? 86400000 :
                300000;
        this.reportingInterval = setInterval(async () => {
            try {
                await this.generatePeriodicReport();
            }
            catch (error) {
                logger_1.logger.error('Periodic reporting failed', {
                    error: error.message,
                });
            }
        }, interval);
    }
    async performInfrastructureHealthCheck() {
        await this.updateComponentHealthStatuses();
        this.calculateOverallHealth();
        if (this.healthStatus.overall === 'critical') {
            await this.handleInfrastructureEmergency('critical_failure', {
                description: 'Infrastructure health is critical',
                affectedComponents: Object.entries(this.healthStatus.components)
                    .filter(([, status]) => status === 'critical')
                    .map(([component]) => component),
                severity: ErrorMonitoringService_1.ErrorSeverity.CRITICAL,
            });
        }
    }
    async updateComponentHealthStatuses() {
        try {
            const errorBoundaryHealth = TestErrorBoundary_1.testErrorBoundary.getTestHealthStatus();
            this.healthStatus.components.errorBoundary = errorBoundaryHealth.status === 'healthy' ? 'healthy' :
                errorBoundaryHealth.status === 'degraded' ? 'degraded' : 'critical';
            const monitorHealth = TestExecutionMonitor_1.testExecutionMonitor.getMonitoringHealth();
            this.healthStatus.components.executionMonitor = monitorHealth.status === 'healthy' ? 'healthy' :
                monitorHealth.status === 'degraded' ? 'degraded' : 'critical';
            const databaseHealth = DatabaseTestRecoveryService_1.databaseTestRecoveryService.getHealthStatus();
            this.healthStatus.components.databaseRecovery = databaseHealth.status === 'healthy' ? 'healthy' :
                databaseHealth.status === 'degraded' ? 'degraded' : 'critical';
            const cicdHealth = CICDErrorHandler_1.cicdErrorHandler.getHealthMetrics();
            this.healthStatus.components.cicdPipeline = cicdHealth.successRate > 80 ? 'healthy' :
                cicdHealth.successRate > 60 ? 'degraded' : 'critical';
            const envHealth = TestEnvironmentResilience_1.testEnvironmentResilience.getResilienceStatus();
            this.healthStatus.components.environmentResilience = envHealth.status === 'healthy' ? 'healthy' :
                envHealth.status === 'degraded' ? 'degraded' : 'critical';
            this.healthStatus.components.reportingSystem = 'healthy';
            this.updateHealthMetrics();
        }
        catch (error) {
            logger_1.logger.error('Failed to update component health statuses', {
                error: error.message,
            });
        }
    }
    calculateOverallHealth() {
        const componentStatuses = Object.values(this.healthStatus.components);
        const criticalCount = componentStatuses.filter(status => status === 'critical').length;
        const degradedCount = componentStatuses.filter(status => status === 'degraded').length;
        if (criticalCount > 0) {
            this.healthStatus.overall = 'critical';
        }
        else if (degradedCount > 2) {
            this.healthStatus.overall = 'degraded';
        }
        else if (degradedCount > 0) {
            this.healthStatus.overall = 'degraded';
        }
        else {
            this.healthStatus.overall = 'healthy';
        }
    }
    updateHealthMetrics() {
        const executionReport = TestExecutionMonitor_1.testExecutionMonitor.getExecutionReport(3600000);
        this.healthStatus.metrics = {
            totalTests: executionReport.summary.totalTests,
            passRate: executionReport.summary.totalTests > 0
                ? (executionReport.summary.passedTests / executionReport.summary.totalTests) * 100
                : 100,
            errorRate: executionReport.summary.totalTests > 0
                ? (executionReport.summary.errorTests / executionReport.summary.totalTests) * 100
                : 0,
            recoveryRate: 85,
            environmentUptime: 99.5,
            lastHealthCheck: new Date(),
        };
    }
    generateHealthRecommendations() {
        const recommendations = [];
        if (this.healthStatus.overall === 'critical') {
            recommendations.push('URGENT: Infrastructure is in critical state - immediate action required');
        }
        if (this.healthStatus.metrics.passRate < 80) {
            recommendations.push('Test pass rate is below threshold - investigate failing tests');
        }
        if (this.healthStatus.metrics.errorRate > 10) {
            recommendations.push('High error rate detected - review error patterns and recovery mechanisms');
        }
        Object.entries(this.healthStatus.components).forEach(([component, status]) => {
            if (status === 'critical') {
                recommendations.push(`Critical issue with ${component} - requires immediate attention`);
            }
            else if (status === 'degraded') {
                recommendations.push(`${component} performance is degraded - monitor closely`);
            }
        });
        this.healthStatus.recommendations = recommendations;
    }
    initializeHealthStatus() {
        return {
            overall: 'healthy',
            components: {
                errorBoundary: 'healthy',
                executionMonitor: 'healthy',
                databaseRecovery: 'healthy',
                cicdPipeline: 'healthy',
                environmentResilience: 'healthy',
                reportingSystem: 'healthy',
            },
            metrics: {
                totalTests: 0,
                passRate: 100,
                errorRate: 0,
                recoveryRate: 100,
                environmentUptime: 100,
                lastHealthCheck: new Date(),
            },
            recommendations: [],
        };
    }
    generateTestId(context) {
        return `${context.testSuite}:${context.testName}:${Date.now()}`;
    }
    generatePipelineId() {
        return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    isDatabaseRelatedError(error) {
        const message = error.message.toLowerCase();
        return message.includes('database') ||
            message.includes('sequelize') ||
            message.includes('connection') ||
            message.includes('sql');
    }
    isCriticalPipelineFailure(stage, error) {
        const criticalStages = [CICDErrorHandler_1.PipelineStage.BUILD, CICDErrorHandler_1.PipelineStage.SECURITY_SCAN, CICDErrorHandler_1.PipelineStage.QUALITY_GATES];
        return criticalStages.includes(stage);
    }
    async verifyInfrastructureReadiness() {
        const health = await this.getInfrastructureHealth();
        if (health.overall === 'critical') {
            throw new Error('Infrastructure is not ready - critical components are failing');
        }
        logger_1.logger.debug('Infrastructure readiness verified');
    }
    async generateImmediateFailureReport(title, error, context) {
        try {
            await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.FAILURE_ANALYSIS, {
                timeRangeMs: 60000,
                includeRecoveryGuide: true,
                format: TestFailureReportingSystem_1.ReportFormat.SLACK,
            });
        }
        catch (reportError) {
            logger_1.logger.error('Failed to generate immediate failure report', {
                title,
                error: reportError.message,
            });
        }
    }
    async handleCriticalFailure(details) {
        logger_1.logger.error('Handling critical infrastructure failure', details);
    }
    async handleEnvironmentDown(details) {
        logger_1.logger.error('Handling environment down emergency', details);
        await TestEnvironmentResilience_1.testEnvironmentResilience.switchToFallbackEnvironment('backup', details.description);
    }
    async handleDataLoss(details) {
        logger_1.logger.error('Handling data loss emergency', details);
    }
    async handleSecurityBreach(details) {
        logger_1.logger.error('Handling security breach emergency', details);
    }
    async generateEmergencyReport(type, details) {
        await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.TECHNICAL_DETAILED, {
            timeRangeMs: 3600000,
            includeRecoveryGuide: true,
            format: TestFailureReportingSystem_1.ReportFormat.EMAIL,
        });
    }
    async sendEmergencyNotifications(type, details) {
        await TestFailureReportingSystem_1.testFailureReportingSystem.sendNotification(`EMERGENCY: ${type} - ${details.description}`, details.severity, ['slack', 'email']);
    }
    async generatePeriodicReport() {
        if (!this.sprintConfig)
            return;
        for (const format of this.sprintConfig.reporting.formats) {
            await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.SPRINT_PROGRESS, {
                timeRangeMs: 3600000,
                includeRecoveryGuide: true,
                includeTrendAnalysis: true,
                format,
            });
        }
    }
    async generateFinalSprintReport() {
        if (!this.sprintConfig)
            return;
        logger_1.logger.info('Generating final sprint report');
        await TestFailureReportingSystem_1.testFailureReportingSystem.generateFailureReport(TestFailureReportingSystem_1.ReportType.EXECUTIVE_SUMMARY, {
            timeRangeMs: 21 * 24 * 60 * 60 * 1000,
            includeRecoveryGuide: true,
            includeTrendAnalysis: true,
            format: TestFailureReportingSystem_1.ReportFormat.PDF,
        });
    }
    async shutdownAllComponents() {
        try {
            await TestEnvironmentResilience_1.testEnvironmentResilience.teardownEnvironment();
        }
        catch (error) {
            logger_1.logger.error('Error shutting down components', {
                error: error.message,
            });
        }
    }
}
exports.TestingInfrastructureManager = TestingInfrastructureManager;
exports.testingInfrastructureManager = new TestingInfrastructureManager();
exports.default = exports.testingInfrastructureManager;
//# sourceMappingURL=index.js.map