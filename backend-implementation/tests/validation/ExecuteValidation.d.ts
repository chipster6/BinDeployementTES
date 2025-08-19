import { ProductionReadinessAssessment } from './ProductionReadinessValidation';
interface ValidationExecutionResults {
    executionId: string;
    timestamp: string;
    totalDuration: number;
    securityValidation: {
        executed: boolean;
        duration: number;
        testsRun: number;
        testsPassed: number;
        testsFailed: number;
        coverage: number;
    };
    performanceValidation: {
        executed: boolean;
        duration: number;
        testsRun: number;
        testsPassed: number;
        testsFailed: number;
        benchmarks: Record<string, number>;
    };
    integrationValidation: {
        executed: boolean;
        duration: number;
        testsRun: number;
        testsPassed: number;
        testsFailed: number;
        compatibilityScore: number;
    };
    productionReadiness: ProductionReadinessAssessment;
    reportPaths: {
        executiveSummary: string;
        technicalReport: string;
        testResults: string;
        performanceMetrics: string;
    };
}
export declare class ValidationOrchestrator {
    private executionId;
    private startTime;
    private results;
    constructor();
    executeFullValidation(): Promise<ValidationExecutionResults>;
    private executeSecurityValidation;
    private executePerformanceValidation;
    private executeIntegrationValidation;
    private executeProductionReadinessAssessment;
    private generateReports;
    private generateExecutiveSummaryReport;
    private generateTechnicalReport;
    private parseJestOutput;
    private extractPerformanceBenchmarks;
    private calculateCompatibilityScore;
}
export declare function executeValidation(): Promise<ValidationExecutionResults>;
export {};
//# sourceMappingURL=ExecuteValidation.d.ts.map