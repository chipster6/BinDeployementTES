import { EventEmitter } from 'events';
import { testErrorBoundary, TestExecutionContext } from './TestErrorBoundary';
import { testExecutionMonitor } from './TestExecutionMonitor';
import { databaseTestRecoveryService } from './DatabaseTestRecoveryService';
import { cicdErrorHandler, PipelineStage, PipelineEnvironment } from './CICDErrorHandler';
import { testEnvironmentResilience } from './TestEnvironmentResilience';
import { testFailureReportingSystem, ReportFormat } from './TestFailureReportingSystem';
import { ErrorSeverity } from '@/services/ErrorMonitoringService';
export interface TestingInfrastructureHealth {
    overall: 'healthy' | 'degraded' | 'critical' | 'offline';
    components: {
        errorBoundary: 'healthy' | 'degraded' | 'critical';
        executionMonitor: 'healthy' | 'degraded' | 'critical';
        databaseRecovery: 'healthy' | 'degraded' | 'critical';
        cicdPipeline: 'healthy' | 'degraded' | 'critical';
        environmentResilience: 'healthy' | 'degraded' | 'critical';
        reportingSystem: 'healthy' | 'degraded' | 'critical';
    };
    metrics: {
        totalTests: number;
        passRate: number;
        errorRate: number;
        recoveryRate: number;
        environmentUptime: number;
        lastHealthCheck: Date;
    };
    recommendations: string[];
}
export interface SprintConfiguration {
    sprintName: string;
    totalDays: 21;
    startDate: Date;
    targetCoverage: number;
    targetTests: number;
    qualityGates: any[];
    alerting: {
        channels: string[];
        severityThresholds: Record<ErrorSeverity, boolean>;
    };
    reporting: {
        frequency: 'real-time' | 'hourly' | 'daily';
        formats: ReportFormat[];
        recipients: string[];
    };
    recovery: {
        autoRecoveryEnabled: boolean;
        maxRetryAttempts: number;
        escalationThresholds: Record<string, number>;
    };
}
export declare class TestingInfrastructureManager extends EventEmitter {
    private sprintConfig;
    private healthStatus;
    private isInitialized;
    private monitoringInterval;
    private reportingInterval;
    constructor();
    initializeSprintInfrastructure(config: SprintConfiguration): Promise<void>;
    executeTestWithFullSupport<T>(testContext: TestExecutionContext, testFunction: () => Promise<T>, options?: {
        enableErrorRecovery?: boolean;
        enablePerformanceMonitoring?: boolean;
        enableDatabaseRecovery?: boolean;
        reportFailures?: boolean;
    }): Promise<T>;
    executePipelineStageWithSupport(stage: PipelineStage, environment: PipelineEnvironment, stageFunction: () => Promise<any>, options?: {
        timeout?: number;
        retryAttempts?: number;
        enableRecovery?: boolean;
    }): Promise<any>;
    getInfrastructureHealth(): Promise<TestingInfrastructureHealth>;
    generateSprintProgressReport(format?: ReportFormat): Promise<string>;
    handleInfrastructureEmergency(emergencyType: 'critical_failure' | 'environment_down' | 'data_loss' | 'security_breach', details: {
        description: string;
        affectedComponents: string[];
        severity: ErrorSeverity;
        metadata?: Record<string, any>;
    }): Promise<void>;
    shutdownInfrastructure(): Promise<void>;
    private initializeAllComponents;
    private setupComponentIntegrations;
    private setupIntegrationEventHandlers;
    private handleCrossComponentTestError;
    private handleCrossComponentPipelineError;
    private handleCrossComponentEnvironmentIssue;
    private handleTestFailure;
    private startInfrastructureMonitoring;
    private startPeriodicReporting;
    private performInfrastructureHealthCheck;
    private updateComponentHealthStatuses;
    private calculateOverallHealth;
    private updateHealthMetrics;
    private generateHealthRecommendations;
    private initializeHealthStatus;
    private generateTestId;
    private generatePipelineId;
    private isDatabaseRelatedError;
    private isCriticalPipelineFailure;
    private verifyInfrastructureReadiness;
    private generateImmediateFailureReport;
    private handleCriticalFailure;
    private handleEnvironmentDown;
    private handleDataLoss;
    private handleSecurityBreach;
    private generateEmergencyReport;
    private sendEmergencyNotifications;
    private generatePeriodicReport;
    private generateFinalSprintReport;
    private shutdownAllComponents;
}
export declare const testingInfrastructureManager: TestingInfrastructureManager;
export { testErrorBoundary, testExecutionMonitor, databaseTestRecoveryService, cicdErrorHandler, testEnvironmentResilience, testFailureReportingSystem, };
export type { TestExecutionContext, TestingInfrastructureHealth, SprintConfiguration, };
export default testingInfrastructureManager;
//# sourceMappingURL=index.d.ts.map