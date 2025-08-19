interface BusinessContinuityTestMetrics {
    testSuiteResults: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        skippedTests: number;
        executionTime: number;
    };
    businessContinuityMetrics: {
        revenueProtectionScore: number;
        customerRetentionScore: number;
        slaComplianceScore: number;
        recoveryTimeScore: number;
        dataIntegrityScore: number;
    };
    complianceValidation: {
        gdprCompliance: number;
        pciDssCompliance: number;
        soc2Compliance: number;
        auditTrailIntegrity: number;
    };
    stakeholderCommunication: {
        customerCommunicationScore: number;
        investorCommunicationScore: number;
        regulatoryCommunicationScore: number;
        vendorCommunicationScore: number;
        employeeCommunicationScore: number;
    };
    incidentResponseMetrics: {
        incidentDetectionTime: number;
        escalationEffectiveness: number;
        fallbackSuccessRate: number;
        businessHealthMonitoring: number;
    };
}
interface TestConfiguration {
    enableFullSuite: boolean;
    enableRevenueProtectionTests: boolean;
    enableCustomerContinuityTests: boolean;
    enableOperationalContinuityTests: boolean;
    enableComplianceTests: boolean;
    enableCommunicationTests: boolean;
    enableRecoveryScenarioTests: boolean;
    parallelExecution: boolean;
    timeoutMinutes: number;
    reportingEnabled: boolean;
    metricsCollection: boolean;
    complianceValidation: boolean;
}
export declare class BusinessContinuityTestRunner {
    private config;
    private metrics;
    private startTime;
    private reportDir;
    constructor(config?: Partial<TestConfiguration>);
    private initializeMetrics;
    runBusinessContinuityTests(): Promise<BusinessContinuityTestMetrics>;
    private runFullTestSuite;
    private runSelectiveTests;
    private runTestSuite;
    private runSpecificTestPattern;
    private parseTestResults;
    private aggregateMetrics;
    private calculateFinalMetrics;
    private generateComprehensiveReport;
    private calculateOverallScore;
    private validateSuccessCriteria;
    private generateRecommendations;
    private displayTestSummary;
}
export { BusinessContinuityTestRunner, BusinessContinuityTestMetrics, TestConfiguration };
//# sourceMappingURL=BusinessContinuityTestRunner.d.ts.map