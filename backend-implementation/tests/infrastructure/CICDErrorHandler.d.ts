import { EventEmitter } from 'events';
import { ErrorSeverity } from '@/services/ErrorMonitoringService';
export declare enum PipelineStage {
    SETUP = "setup",
    INSTALL = "install",
    LINT = "lint",
    BUILD = "build",
    TEST_UNIT = "test_unit",
    TEST_INTEGRATION = "test_integration",
    TEST_E2E = "test_e2e",
    SECURITY_SCAN = "security_scan",
    COVERAGE_ANALYSIS = "coverage_analysis",
    QUALITY_GATES = "quality_gates",
    PACKAGE = "package",
    DEPLOY = "deploy",
    CLEANUP = "cleanup"
}
export declare enum PipelineEnvironment {
    LOCAL = "local",
    CI = "ci",
    STAGING = "staging",
    PRODUCTION = "production"
}
export declare enum CICDErrorType {
    DEPENDENCY_RESOLUTION = "dependency_resolution",
    BUILD_COMPILATION = "build_compilation",
    TEST_EXECUTION = "test_execution",
    COVERAGE_COLLECTION = "coverage_collection",
    QUALITY_GATE_FAILURE = "quality_gate_failure",
    SECURITY_VULNERABILITY = "security_vulnerability",
    DEPLOYMENT_FAILURE = "deployment_failure",
    ENVIRONMENT_SETUP = "environment_setup",
    RESOURCE_EXHAUSTION = "resource_exhaustion",
    NETWORK_CONNECTIVITY = "network_connectivity",
    ARTIFACT_CORRUPTION = "artifact_corruption",
    TIMEOUT_EXCEEDED = "timeout_exceeded"
}
export interface PipelineExecutionContext {
    pipelineId: string;
    stage: PipelineStage;
    environment: PipelineEnvironment;
    branch: string;
    commit: string;
    triggeredBy: string;
    startTime: Date;
    timeout: number;
    retryCount: number;
    maxRetries: number;
    dependencies: string[];
    environment_variables: Record<string, string>;
    artifacts: string[];
    metadata: Record<string, any>;
}
export interface PipelineErrorEvent {
    id: string;
    pipelineId: string;
    stage: PipelineStage;
    errorType: CICDErrorType;
    error: Error;
    context: PipelineExecutionContext;
    timestamp: Date;
    severity: ErrorSeverity;
    recoverable: boolean;
    recovered: boolean;
    recoveryActions: string[];
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    artifacts?: string[];
    metrics: {
        duration: number;
        memoryUsage: number;
        cpuUsage: number;
    };
}
export interface PipelineRecoveryStrategy {
    name: string;
    applicableStages: PipelineStage[];
    applicableErrors: CICDErrorType[];
    priority: number;
    maxAttempts: number;
    cooldownMs: number;
    action: (context: PipelineExecutionContext, error: Error) => Promise<boolean>;
    description: string;
}
export interface CICDQualityGate {
    name: string;
    stage: PipelineStage;
    type: 'coverage' | 'security' | 'performance' | 'quality';
    threshold: number;
    operator: 'gte' | 'lte' | 'eq';
    blocking: boolean;
    description: string;
}
export interface PipelineHealthMetrics {
    successRate: number;
    averageDuration: number;
    failuresByStage: Record<PipelineStage, number>;
    failuresByErrorType: Record<CICDErrorType, number>;
    recoveryRate: number;
    qualityGatePassRate: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
        disk: number;
    };
    trends: {
        buildTimes: number[];
        testTimes: number[];
        errorRates: number[];
    };
}
export declare class CICDErrorHandler extends EventEmitter {
    private pipelineExecutions;
    private errorHistory;
    private recoveryStrategies;
    private qualityGates;
    private activeRecoveries;
    private healthMetrics;
    private readonly maxHistorySize;
    constructor();
    executePipelineStage(stage: PipelineStage, context: PipelineExecutionContext, stageFunction: () => Promise<any>): Promise<any>;
    validateQualityGates(context: PipelineExecutionContext, results: Record<string, any>): Promise<{
        passed: boolean;
        results: Array<{
            gate: string;
            passed: boolean;
            value: number;
            threshold: number;
            blocking: boolean;
        }>;
    }>;
    setupEnvironmentConfiguration(environment: PipelineEnvironment, context: PipelineExecutionContext): Promise<void>;
    getHealthMetrics(): PipelineHealthMetrics;
    getPipelineExecutionReport(pipelineId?: string, timeRangeMs?: number): any;
    private initializeRecoveryStrategies;
    private initializeQualityGates;
    private handleStageError;
    private attemptStageRecovery;
    private recoverDependencyResolution;
    private recoverBuildCache;
    private recoverTestEnvironment;
    private recoverResourceExhaustion;
    private recoverNetworkConnectivity;
    private recoverTimeoutExtension;
    private setupLocalEnvironment;
    private setupCIEnvironment;
    private setupStagingEnvironment;
    private setupProductionEnvironment;
    private categorizeError;
    private determineSeverity;
    private isRecoverable;
    private isBlockingStageFailure;
    private handleBlockingFailure;
    private validateStagePrerequisites;
    private validateStageResults;
    private validateBuildPrerequisites;
    private validateTestPrerequisites;
    private validateDeployPrerequisites;
    private validateBuildResults;
    private validateTestResults;
    private executeStageWithMonitoring;
    private recordStageSuccess;
    private recordStageFailure;
    private updateTrends;
    private getTrendsKey;
    private extractQualityGateValue;
    private evaluateQualityGate;
    private initializeHealthMetrics;
    private startHealthMonitoring;
    private updateHealthMetrics;
    private generateStageId;
    private generateErrorId;
    private maintainHistorySize;
    private getBlockedExecutions;
    private calculateAveragePipelineDuration;
    private calculateRecoveryEffectiveness;
    private getQualityGateStatus;
    private generatePipelineRecommendations;
    private groupBy;
    private executeCommand;
    private fileExists;
    private parseEnvContent;
    private delay;
}
export declare const cicdErrorHandler: CICDErrorHandler;
export default CICDErrorHandler;
//# sourceMappingURL=CICDErrorHandler.d.ts.map