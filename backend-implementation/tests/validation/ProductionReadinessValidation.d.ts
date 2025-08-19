export interface ProductionReadinessAssessment {
    deploymentRecommendation: 'GO' | 'NO_GO' | 'GO_WITH_CONDITIONS';
    overallScore: number;
    confidence: number;
    securityValidation: {
        score: number;
        status: 'PASS' | 'FAIL' | 'WARNING';
        fixes: SecurityFixValidation[];
        criticalIssues: string[];
        recommendations: string[];
    };
    performanceValidation: {
        score: number;
        status: 'PASS' | 'FAIL' | 'WARNING';
        optimizations: PerformanceOptimizationValidation[];
        bottlenecks: string[];
        recommendations: string[];
    };
    integrationValidation: {
        score: number;
        status: 'PASS' | 'FAIL' | 'WARNING';
        conflicts: string[];
        compatibility: number;
        recommendations: string[];
    };
    systemHealth: {
        database: SystemHealthCheck;
        redis: SystemHealthCheck;
        connections: SystemHealthCheck;
        performance: SystemHealthCheck;
    };
    riskAssessment: {
        criticalRisks: RiskItem[];
        mediumRisks: RiskItem[];
        lowRisks: RiskItem[];
        mitigationStrategies: string[];
    };
    timeline: {
        estimatedDeploymentTime: string;
        rollbackTime: string;
        validationWindow: string;
    };
    executiveSummary: string;
    technicalSummary: string;
    deploymentChecklist: string[];
}
interface SecurityFixValidation {
    fix: string;
    status: 'VALIDATED' | 'FAILED' | 'PARTIAL';
    testResults: TestResult[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
interface PerformanceOptimizationValidation {
    optimization: string;
    status: 'VALIDATED' | 'FAILED' | 'PARTIAL';
    improvementPercentage: number;
    testResults: TestResult[];
}
interface TestResult {
    testName: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    duration: number;
    details: string;
    metrics: Record<string, any>;
}
interface SystemHealthCheck {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    score: number;
    metrics: Record<string, any>;
    issues: string[];
}
interface RiskItem {
    description: string;
    probability: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mitigation: string;
}
export declare class ProductionReadinessValidator {
    private testResults;
    private startTime;
    validateProductionReadiness(): Promise<ProductionReadinessAssessment>;
    private validateSecurityFixes;
    private validatePerformanceOptimizations;
    private validateIntegration;
    private checkSystemHealth;
    private validateEncryptionCompatibility;
    private validateJWTSecurity;
    private validateMFAImplementation;
    private validateAuthenticationFlow;
    private validateRBACSystem;
    private validateSessionSecurity;
    private validateConnectionPoolScaling;
    private validateCacheStrategy;
    private validateSpatialQueryOptimization;
    private testSecurityPerformanceIntegration;
    private testSessionManagementIntegration;
    private testSpatialSecurityIntegration;
    private testEndToEndIntegration;
    private checkDatabaseHealth;
    private checkRedisHealth;
    private checkConnectionHealth;
    private checkPerformanceHealth;
    private assessRisks;
    private calculateOverallScore;
    private calculateConfidenceLevel;
    private makeDeploymentRecommendation;
    private generateExecutiveSummary;
    private generateTechnicalSummary;
    private generateDeploymentChecklist;
    private generateSecurityRecommendations;
    private generatePerformanceRecommendations;
    private generateIntegrationRecommendations;
    private calculateTimeline;
}
export declare function executeProductionReadinessValidation(): Promise<ProductionReadinessAssessment>;
export {};
//# sourceMappingURL=ProductionReadinessValidation.d.ts.map