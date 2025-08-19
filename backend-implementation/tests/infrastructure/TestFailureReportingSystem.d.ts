import { EventEmitter } from 'events';
import { ErrorSeverity } from '@/services/ErrorMonitoringService';
export declare enum ReportType {
    EXECUTIVE_SUMMARY = "executive_summary",
    TECHNICAL_DETAILED = "technical_detailed",
    SPRINT_PROGRESS = "sprint_progress",
    FAILURE_ANALYSIS = "failure_analysis",
    RECOVERY_GUIDE = "recovery_guide",
    TREND_ANALYSIS = "trend_analysis",
    REAL_TIME_DASHBOARD = "real_time_dashboard"
}
export declare enum ReportFormat {
    JSON = "json",
    HTML = "html",
    PDF = "pdf",
    MARKDOWN = "markdown",
    CSV = "csv",
    SLACK = "slack",
    EMAIL = "email",
    CONSOLE = "console"
}
export declare enum FailureCategory {
    CRITICAL_BLOCKER = "critical_blocker",
    HIGH_IMPACT = "high_impact",
    MEDIUM_IMPACT = "medium_impact",
    LOW_IMPACT = "low_impact",
    ENVIRONMENT_ISSUE = "environment_issue",
    CONFIGURATION_ISSUE = "configuration_issue",
    DEPENDENCY_ISSUE = "dependency_issue",
    PERFORMANCE_DEGRADATION = "performance_degradation"
}
export interface RecoveryRecommendation {
    id: string;
    title: string;
    description: string;
    category: FailureCategory;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    estimatedEffort: 'minutes' | 'hours' | 'days';
    difficulty: 'easy' | 'medium' | 'hard';
    prerequisites: string[];
    steps: RecoveryStep[];
    automatable: boolean;
    successCriteria: string[];
    risks: string[];
    alternativeApproaches: string[];
}
export interface RecoveryStep {
    stepNumber: number;
    title: string;
    description: string;
    command?: string;
    expectedOutput?: string;
    troubleshooting: string[];
    verificationCommand?: string;
    rollbackCommand?: string;
}
export interface FailureReport {
    id: string;
    timestamp: Date;
    reportType: ReportType;
    title: string;
    summary: string;
    sprintContext: {
        currentDay: number;
        totalDays: number;
        progressPercentage: number;
        milestonesAffected: string[];
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
    };
    failures: FailureAnalysis[];
    environmentStatus: any;
    recoveryRecommendations: RecoveryRecommendation[];
    trendAnalysis: TrendAnalysis;
    impact: ImpactAssessment;
    nextActions: NextAction[];
    appendices: ReportAppendix[];
}
export interface FailureAnalysis {
    id: string;
    category: FailureCategory;
    severity: ErrorSeverity;
    title: string;
    description: string;
    occurredAt: Date;
    frequency: number;
    affectedComponents: string[];
    rootCause: RootCauseAnalysis;
    symptoms: string[];
    errorDetails: {
        message: string;
        stack?: string;
        code?: string;
        metadata: Record<string, any>;
    };
    context: {
        testSuite?: string;
        testName?: string;
        environment: string;
        configuration: Record<string, any>;
    };
    relatedFailures: string[];
    timeToDetection: number;
    timeToResolution?: number;
}
export interface RootCauseAnalysis {
    primaryCause: string;
    contributingFactors: string[];
    evidencePoints: string[];
    confidence: 'low' | 'medium' | 'high';
    investigationNotes: string[];
    hypothesis: string;
    verification: string[];
}
export interface TrendAnalysis {
    failureRateOverTime: Array<{
        date: Date;
        count: number;
    }>;
    topFailingComponents: Array<{
        component: string;
        failures: number;
    }>;
    recoveryTimeImprovement: Array<{
        date: Date;
        averageTime: number;
    }>;
    categoryDistribution: Record<FailureCategory, number>;
    sprintProgressTrend: Array<{
        day: number;
        coverage: number;
        tests: number;
    }>;
    predictions: {
        likelyCompletionDate: Date;
        riskOfMissingDeadline: number;
        recommendedActions: string[];
    };
}
export interface ImpactAssessment {
    sprintProgress: {
        testsAffected: number;
        coverageImpact: number;
        milestonesAtRisk: string[];
        timeDelayEstimate: number;
    };
    businessImpact: {
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        stakeholdersAffected: string[];
        financialImpact: string;
    };
    technicalImpact: {
        componentsAffected: string[];
        testingScopeReduction: number;
        qualityRisk: string;
        technicalDebtIncrease: string;
    };
}
export interface NextAction {
    id: string;
    title: string;
    description: string;
    priority: 'p0' | 'p1' | 'p2' | 'p3';
    owner: string;
    dueDate: Date;
    dependencies: string[];
    successMetrics: string[];
    status: 'open' | 'in_progress' | 'completed' | 'blocked';
}
export interface ReportAppendix {
    title: string;
    content: string;
    type: 'logs' | 'config' | 'metrics' | 'screenshots' | 'other';
}
export interface NotificationConfig {
    channels: string[];
    severity: ErrorSeverity[];
    recipients: string[];
    template: string;
    throttling: {
        enabled: boolean;
        windowMs: number;
        maxNotifications: number;
    };
}
export declare class TestFailureReportingSystem extends EventEmitter {
    private failureReports;
    private failureAnalyses;
    private recoveryRecommendations;
    private notificationConfigs;
    private reportGenerationQueue;
    private trendData;
    private sprintStartDate;
    private readonly reportsDirectory;
    private readonly maxReportsHistory;
    constructor();
    generateFailureReport(reportType: ReportType, options?: {
        timeRangeMs?: number;
        includeRecoveryGuide?: boolean;
        includeTrendAnalysis?: boolean;
        format?: ReportFormat;
        outputPath?: string;
    }): Promise<FailureReport>;
    generateDashboardData(): Promise<any>;
    generateRecoveryScript(failureId: string, scriptType?: 'bash' | 'powershell' | 'node'): Promise<string>;
    sendNotification(message: string, severity: ErrorSeverity, channels?: string[]): Promise<void>;
    getFailureStatistics(timeRangeMs?: number): any;
    private initializeReportingSystem;
    private setupEventListeners;
    private startPeriodicReporting;
    private collectFailureData;
    private analyzeFailures;
    private analyzeIndividualFailure;
    private generateRecoveryRecommendations;
    private generateCategoryRecommendations;
    private getCriticalBlockerRecommendations;
    private getEnvironmentIssueRecommendations;
    private getDependencyIssueRecommendations;
    private getPerformanceRecommendations;
    private getGenericRecommendations;
    private generateTrendAnalysis;
    private assessImpact;
    private generateNextActions;
    private generateAppendices;
    private outputReport;
    private outputJSONReport;
    private outputHTMLReport;
    private outputMarkdownReport;
    private generateHTMLReport;
    private generateMarkdownReport;
    private processTestError;
    private processPipelineError;
    private processEnvironmentIssue;
    private processTestCompletion;
    private generateReportId;
    private generateAnalysisId;
    private generateRecommendationId;
    private generateActionId;
    private categorizeFailure;
    private determineSeverity;
    private performRootCauseAnalysis;
    private getSprintContext;
    private getCurrentSprintDay;
    private getEnvironmentStatus;
    private initializeNotificationConfigs;
    private initializeTrendDataCollection;
    private generatePeriodicReports;
    private updateTrendData;
    private cleanupOldData;
    private maintainReportsHistory;
    private sendNotificationsIfNeeded;
    private sendNotificationToChannel;
    private groupBy;
    private generateReportTitle;
    private generateReportSummary;
    private getEmptyTrendAnalysis;
    private generateReportFilename;
    private generateScriptHeader;
    private generateScriptSection;
    private generateScriptFooter;
    private calculateFailureFrequency;
    private identifyAffectedComponents;
    private identifySymptoms;
    private findRelatedFailures;
    private calculateTimeToDetection;
    private calculateTimeToResolution;
    private calculateFailureRateOverTime;
    private getTopFailingComponents;
    private calculateRecoveryTimeImprovement;
    private calculateCategoryDistribution;
    private getSprintProgressTrend;
    private predictCompletionDate;
    private calculateDeadlineRisk;
    private generatePredictiveRecommendations;
    private calculateCoverageImpact;
    private identifyMilestonesAtRisk;
    private estimateTimeDelay;
    private generateBusinessImpactDescription;
    private estimateFinancialImpact;
    private getUniqueAffectedComponents;
    private calculateTestingScopeReduction;
    private assessQualityRisk;
    private assessTechnicalDebtIncrease;
    private assignOwnerByCategory;
    private calculateDueDate;
    private formatErrorLogs;
    private getEnvironmentConfiguration;
    private getPerformanceMetrics;
    private displayConsoleReport;
    private sendSlackReport;
    private sendEmailReport;
    private getSprintProgress;
    private getMilestonesStatus;
    private getRecentFailures;
    private getFailuresByCategory;
    private getFailuresBySeverity;
    private getFailureTrends;
    private getServiceHealthSummary;
    private getCoverageStatus;
    private getActiveAlerts;
    private getRecentAlerts;
    private getEscalatedAlerts;
    private getImmediateRecommendations;
    private getPlannedRecommendations;
    private getCompletedRecommendations;
    private calculateAverageResolutionTime;
    private calculateTrendDirection;
    private calculateImpactScore;
}
export declare const testFailureReportingSystem: TestFailureReportingSystem;
export default TestFailureReportingSystem;
//# sourceMappingURL=TestFailureReportingSystem.d.ts.map