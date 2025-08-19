import { EventEmitter } from 'events';
import { ErrorSeverity } from '@/services/ErrorMonitoringService';
export declare enum TestErrorType {
    SETUP_FAILURE = "test_setup_failure",
    TEARDOWN_FAILURE = "test_teardown_failure",
    ASSERTION_FAILURE = "assertion_failure",
    DATABASE_FAILURE = "database_failure",
    EXTERNAL_SERVICE_FAILURE = "external_service_failure",
    TIMEOUT_FAILURE = "timeout_failure",
    MEMORY_LEAK = "memory_leak",
    DEPENDENCY_FAILURE = "dependency_failure",
    FIXTURE_FAILURE = "fixture_failure",
    MOCK_FAILURE = "mock_failure",
    FRAMEWORK_ERROR = "framework_error",
    ENVIRONMENT_ERROR = "environment_error",
    NETWORK_ERROR = "network_error",
    CONFIGURATION_ERROR = "configuration_error"
}
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
export interface RecoveryAction {
    name: string;
    description: string;
    action: (context: TestExecutionContext, error: Error) => Promise<boolean>;
    priority: number;
    maxAttempts: number;
    cooldownMs: number;
}
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
export declare class TestErrorBoundary extends EventEmitter {
    private errorBuffer;
    private recoveryActions;
    private activeRecoveries;
    private failedTests;
    private isolatedTests;
    private config;
    private readonly maxBufferSize;
    constructor(config?: Partial<TestErrorBoundaryConfig>);
    executeWithBoundary<T>(context: TestExecutionContext, testFunction: () => Promise<T>): Promise<T>;
    handleDatabaseTestError(error: Error, context: TestExecutionContext): Promise<boolean>;
    handlePipelineError(error: Error, pipelineStage: string, context: any): Promise<void>;
    getErrorReport(timeRangeMs?: number): any;
    getTestHealthStatus(): {
        status: 'healthy' | 'degraded' | 'critical';
        metrics: any;
        alerts: string[];
    };
    private initializeRecoveryActions;
    private trackError;
    private handleTestError;
    private attemptRecovery;
    private recoverDatabaseConnection;
    private recoverDatabaseReset;
    private recoverDatabaseMigrations;
    private recoverWithMockService;
    private recoverServiceHealthCheck;
    private recoverIncreaseTimeout;
    private recoverOptimizeResources;
    private recoverForceGC;
    private recoverRestartWorker;
    private recoverResetEnvironment;
    private recoverClearJestCache;
    private categorizeTestError;
    private determineTestErrorSeverity;
    private isRecoverable;
    private shouldIsolateTest;
    private markTestSuccess;
    private markTestFailure;
    private generateTestId;
    private generateErrorId;
    private executeWithTimeout;
    private setupTestMonitoring;
    private cleanupTestMonitoring;
    private startHealthMonitoring;
    private maintainBufferSize;
    private getDatabaseConnectionInfo;
    private calculateRecoverySuccessRate;
    private getTopFailingTests;
    private getRecoveryActionStats;
    private generateRecommendations;
    private groupBy;
    private delay;
    private attemptDatabaseRecovery;
}
export declare const testErrorBoundary: TestErrorBoundary;
export default TestErrorBoundary;
//# sourceMappingURL=TestErrorBoundary.d.ts.map