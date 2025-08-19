import { EventEmitter } from 'events';
import { TestErrorEvent, TestExecutionContext } from './TestErrorBoundary';
import { ErrorSeverity } from '@/services/ErrorMonitoringService';
export declare enum TestExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    PASSED = "passed",
    FAILED = "failed",
    SKIPPED = "skipped",
    TIMEOUT = "timeout",
    ERROR = "error"
}
export declare enum TestSuiteType {
    UNIT = "unit",
    INTEGRATION = "integration",
    E2E = "e2e",
    SECURITY = "security",
    PERFORMANCE = "performance",
    API = "api"
}
export interface QualityGate {
    name: string;
    type: 'coverage' | 'performance' | 'security' | 'stability';
    threshold: number;
    operator: 'gte' | 'lte' | 'eq';
    enabled: boolean;
    severity: ErrorSeverity;
    description: string;
}
export interface TestExecutionMetrics {
    testId: string;
    suiteName: string;
    testName: string;
    status: TestExecutionStatus;
    type: TestSuiteType;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    memoryUsage: {
        before: NodeJS.MemoryUsage;
        after?: NodeJS.MemoryUsage;
        peak?: number;
    };
    coverage: {
        statements: number;
        branches: number;
        functions: number;
        lines: number;
    };
    performance: {
        averageResponseTime?: number;
        maxResponseTime?: number;
        throughput?: number;
        errorRate?: number;
    };
    retryCount: number;
    error?: TestErrorEvent;
    metadata: Record<string, any>;
}
export interface TestSuiteExecutionSummary {
    suiteName: string;
    type: TestSuiteType;
    startTime: Date;
    endTime?: Date;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    errorTests: number;
    coverage: {
        overall: number;
        statements: number;
        branches: number;
        functions: number;
        lines: number;
    };
    performance: {
        totalDuration: number;
        averageDuration: number;
        slowestTest: string;
        fastestTest: string;
    };
    qualityGatesStatus: Record<string, {
        passed: boolean;
        value: number;
        threshold: number;
    }>;
    errors: TestErrorEvent[];
}
export interface SprintProgress {
    currentDay: number;
    totalDays: 21;
    targetCoverage: number;
    currentCoverage: number;
    testsImplemented: number;
    testsTarget: number;
    criticalIssues: number;
    qualityGatesPassing: number;
    qualityGatesTotal: number;
    milestones: {
        name: string;
        targetDay: number;
        completed: boolean;
        completedOn?: Date;
    }[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    projectedCompletion: Date;
}
export interface MonitoringAlert {
    name: string;
    type: 'coverage' | 'quality_gate' | 'performance' | 'sprint_progress' | 'failure_rate';
    condition: (metrics: any) => boolean;
    severity: ErrorSeverity;
    cooldownMs: number;
    recipients: string[];
    enabled: boolean;
    message: string;
}
export declare class TestExecutionMonitor extends EventEmitter {
    private executionMetrics;
    private suiteExecutions;
    private qualityGates;
    private monitoringAlerts;
    private alertCooldowns;
    private sprintStartDate;
    private coverageHistory;
    private performanceBaselines;
    private readonly maxMetricsBuffer;
    private readonly coverageReportPath;
    private readonly sprintTargetCoverage;
    private readonly sprintTargetTests;
    constructor();
    startTestExecution(testId: string, context: TestExecutionContext): void;
    completeTestExecution(testId: string, status: TestExecutionStatus, error?: TestErrorEvent): void;
    startSuiteExecution(suiteName: string, totalTests: number): void;
    completeSuiteExecution(suiteName: string): void;
    getSprintProgress(): SprintProgress;
    getExecutionReport(timeRangeMs?: number): any;
    getMonitoringHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        metrics: any;
        issues: string[];
    };
    private initializeQualityGates;
    private initializeMonitoringAlerts;
    private setupErrorBoundaryIntegration;
    private startPeriodicMonitoring;
    private classifyTestSuite;
    private updateTestCoverage;
    private updateSuiteSummary;
    private checkQualityGates;
    private checkPerformanceRegression;
    private calculateSuitePerformanceMetrics;
    private evaluateSuiteQualityGates;
    private checkSuiteAlerts;
    private getCurrentOverallCoverage;
    private getTotalTestsImplemented;
    private getCriticalIssueCount;
    private getQualityGateStatus;
    private getSprintMilestones;
    private calculateSprintRisk;
    private projectSprintCompletion;
    private checkAllAlerts;
    private checkImmediateAlerts;
    private triggerAlert;
    private getAlertContext;
    private calculateAverageDuration;
    private calculateAverageMemoryUsage;
    private calculatePeakMemoryUsage;
    private getSlowestTests;
    private getFastestTests;
    private getPerformanceRegressions;
    private getCoverageTrend;
    private getCoverageByTestType;
    private getQualityGateFailures;
    private getQualityGateHistory;
    private getActiveAlerts;
    private generateRecommendations;
    private generatePeriodicReport;
    private cleanupOldMetrics;
    private getQualityGateValue;
    private getSuiteQualityGateValue;
    private getGlobalQualityGateValue;
    private evaluateQualityGate;
    private getTestDuration;
    private getPreviousCoverage;
}
export declare const testExecutionMonitor: TestExecutionMonitor;
export default TestExecutionMonitor;
//# sourceMappingURL=TestExecutionMonitor.d.ts.map