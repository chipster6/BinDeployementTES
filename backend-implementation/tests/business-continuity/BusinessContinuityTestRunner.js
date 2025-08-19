"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessContinuityTestRunner = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const DEFAULT_TEST_CONFIG = {
    enableFullSuite: true,
    enableRevenueProtectionTests: true,
    enableCustomerContinuityTests: true,
    enableOperationalContinuityTests: true,
    enableComplianceTests: true,
    enableCommunicationTests: true,
    enableRecoveryScenarioTests: true,
    parallelExecution: false,
    timeoutMinutes: 30,
    reportingEnabled: true,
    metricsCollection: true,
    complianceValidation: true
};
class BusinessContinuityTestRunner {
    constructor(config = {}) {
        this.config = { ...DEFAULT_TEST_CONFIG, ...config };
        this.metrics = this.initializeMetrics();
        this.startTime = Date.now();
        this.reportDir = (0, path_1.join)(process.cwd(), 'tests', 'business-continuity', 'reports');
        if (!(0, fs_1.existsSync)(this.reportDir)) {
            (0, fs_1.mkdirSync)(this.reportDir, { recursive: true });
        }
    }
    initializeMetrics() {
        return {
            testSuiteResults: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                executionTime: 0
            },
            businessContinuityMetrics: {
                revenueProtectionScore: 0,
                customerRetentionScore: 0,
                slaComplianceScore: 0,
                recoveryTimeScore: 0,
                dataIntegrityScore: 0
            },
            complianceValidation: {
                gdprCompliance: 0,
                pciDssCompliance: 0,
                soc2Compliance: 0,
                auditTrailIntegrity: 0
            },
            stakeholderCommunication: {
                customerCommunicationScore: 0,
                investorCommunicationScore: 0,
                regulatoryCommunicationScore: 0,
                vendorCommunicationScore: 0,
                employeeCommunicationScore: 0
            },
            incidentResponseMetrics: {
                incidentDetectionTime: 0,
                escalationEffectiveness: 0,
                fallbackSuccessRate: 0,
                businessHealthMonitoring: 0
            }
        };
    }
    async runBusinessContinuityTests() {
        console.log('🚀 Starting Comprehensive Business Continuity Validation Testing Suite');
        console.log('💰 Testing $2M+ MRR Protection Capabilities');
        console.log('🎯 Target: 99.9% Revenue Stream Continuity');
        console.log('');
        try {
            this.startTime = Date.now();
            if (this.config.enableFullSuite) {
                await this.runFullTestSuite();
            }
            else {
                await this.runSelectiveTests();
            }
            this.calculateFinalMetrics();
            await this.generateComprehensiveReport();
            this.displayTestSummary();
            return this.metrics;
        }
        catch (error) {
            console.error('❌ Business Continuity Test Suite Failed:', error);
            throw error;
        }
    }
    async runFullTestSuite() {
        console.log('📋 Executing Full Business Continuity Test Suite...');
        const testSuites = [
            {
                name: 'Business Continuity Validation',
                file: 'BusinessContinuityValidationTesting.test.ts',
                description: 'Core business processes protection and revenue continuity'
            },
            {
                name: 'Stakeholder Communication Continuity',
                file: 'StakeholderCommunicationContinuityTesting.test.ts',
                description: 'Communication protocols for all stakeholder groups'
            },
            {
                name: 'Regulatory Compliance Continuity',
                file: 'RegulatoryComplianceContinuityTesting.test.ts',
                description: 'GDPR, PCI DSS, SOC 2 compliance maintenance'
            }
        ];
        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name} Tests...`);
            console.log(`📄 Description: ${suite.description}`);
            try {
                const suiteMetrics = await this.runTestSuite(suite.file);
                this.aggregateMetrics(suite.name, suiteMetrics);
                console.log(`✅ ${suite.name} Tests Completed Successfully`);
            }
            catch (error) {
                console.error(`❌ ${suite.name} Tests Failed:`, error);
                throw error;
            }
        }
    }
    async runSelectiveTests() {
        console.log('📋 Executing Selective Business Continuity Tests...');
        if (this.config.enableRevenueProtectionTests) {
            console.log('\n💰 Running Revenue Protection Tests...');
            await this.runSpecificTestPattern('Revenue-Critical Process Protection');
        }
        if (this.config.enableCustomerContinuityTests) {
            console.log('\n👥 Running Customer Continuity Tests...');
            await this.runSpecificTestPattern('Customer-Facing Service Continuity');
        }
        if (this.config.enableOperationalContinuityTests) {
            console.log('\n⚙️  Running Operational Continuity Tests...');
            await this.runSpecificTestPattern('Operational Continuity Validation');
        }
        if (this.config.enableComplianceTests) {
            console.log('\n📋 Running Compliance Tests...');
            await this.runTestSuite('RegulatoryComplianceContinuityTesting.test.ts');
        }
        if (this.config.enableCommunicationTests) {
            console.log('\n📢 Running Communication Tests...');
            await this.runTestSuite('StakeholderCommunicationContinuityTesting.test.ts');
        }
        if (this.config.enableRecoveryScenarioTests) {
            console.log('\n🔄 Running Recovery Scenario Tests...');
            await this.runSpecificTestPattern('Business Recovery Scenarios');
        }
    }
    async runTestSuite(testFile) {
        const testPath = (0, path_1.join)('tests', 'business-continuity', testFile);
        const command = `npm test -- ${testPath} --verbose --json`;
        try {
            const result = (0, child_process_1.execSync)(command, {
                encoding: 'utf8',
                timeout: this.config.timeoutMinutes * 60 * 1000,
                maxBuffer: 1024 * 1024 * 10
            });
            return this.parseTestResults(result);
        }
        catch (error) {
            console.error(`Test execution failed for ${testFile}:`, error);
            throw error;
        }
    }
    async runSpecificTestPattern(pattern) {
        const command = `npm test -- --testNamePattern="${pattern}" --verbose`;
        try {
            (0, child_process_1.execSync)(command, {
                encoding: 'utf8',
                stdio: 'inherit',
                timeout: this.config.timeoutMinutes * 60 * 1000
            });
        }
        catch (error) {
            console.error(`Test pattern execution failed for ${pattern}:`, error);
            throw error;
        }
    }
    parseTestResults(jestOutput) {
        try {
            const jsonMatch = jestOutput.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            const passedMatch = jestOutput.match(/(\d+) passed/);
            const failedMatch = jestOutput.match(/(\d+) failed/);
            const totalMatch = jestOutput.match(/(\d+) total/);
            return {
                numPassedTests: passedMatch ? parseInt(passedMatch[1]) : 0,
                numFailedTests: failedMatch ? parseInt(failedMatch[1]) : 0,
                numTotalTests: totalMatch ? parseInt(totalMatch[1]) : 0
            };
        }
        catch (error) {
            console.warn('Failed to parse test results:', error);
            return { numPassedTests: 0, numFailedTests: 0, numTotalTests: 0 };
        }
    }
    aggregateMetrics(suiteName, suiteResults) {
        this.metrics.testSuiteResults.totalTests += suiteResults.numTotalTests || 0;
        this.metrics.testSuiteResults.passedTests += suiteResults.numPassedTests || 0;
        this.metrics.testSuiteResults.failedTests += suiteResults.numFailedTests || 0;
        const passRate = suiteResults.numTotalTests > 0 ?
            (suiteResults.numPassedTests / suiteResults.numTotalTests) * 100 : 0;
        switch (suiteName) {
            case 'Business Continuity Validation':
                this.metrics.businessContinuityMetrics.revenueProtectionScore = Math.min(passRate, 99.9);
                this.metrics.businessContinuityMetrics.customerRetentionScore = Math.min(passRate, 99.0);
                this.metrics.businessContinuityMetrics.slaComplianceScore = Math.min(passRate, 95.0);
                this.metrics.businessContinuityMetrics.recoveryTimeScore = passRate;
                this.metrics.businessContinuityMetrics.dataIntegrityScore = passRate;
                break;
            case 'Stakeholder Communication Continuity':
                this.metrics.stakeholderCommunication.customerCommunicationScore = passRate;
                this.metrics.stakeholderCommunication.investorCommunicationScore = passRate;
                this.metrics.stakeholderCommunication.regulatoryCommunicationScore = passRate;
                this.metrics.stakeholderCommunication.vendorCommunicationScore = passRate;
                this.metrics.stakeholderCommunication.employeeCommunicationScore = passRate;
                break;
            case 'Regulatory Compliance Continuity':
                this.metrics.complianceValidation.gdprCompliance = Math.min(passRate, 90.0);
                this.metrics.complianceValidation.pciDssCompliance = Math.min(passRate, 85.0);
                this.metrics.complianceValidation.soc2Compliance = Math.min(passRate, 85.0);
                this.metrics.complianceValidation.auditTrailIntegrity = passRate;
                break;
        }
    }
    calculateFinalMetrics() {
        this.metrics.testSuiteResults.executionTime = Date.now() - this.startTime;
        const businessMetrics = this.metrics.businessContinuityMetrics;
        this.metrics.incidentResponseMetrics.incidentDetectionTime =
            (businessMetrics.recoveryTimeScore / 100) * 60;
        this.metrics.incidentResponseMetrics.escalationEffectiveness =
            (businessMetrics.slaComplianceScore + businessMetrics.recoveryTimeScore) / 2;
        this.metrics.incidentResponseMetrics.fallbackSuccessRate =
            businessMetrics.revenueProtectionScore;
        this.metrics.incidentResponseMetrics.businessHealthMonitoring =
            (businessMetrics.customerRetentionScore + businessMetrics.dataIntegrityScore) / 2;
    }
    async generateComprehensiveReport() {
        if (!this.config.reportingEnabled)
            return;
        const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFileName = `business-continuity-report-${reportTimestamp}.json`;
        const reportPath = (0, path_1.join)(this.reportDir, reportFileName);
        const comprehensiveReport = {
            testExecution: {
                timestamp: new Date().toISOString(),
                executionTime: this.metrics.testSuiteResults.executionTime,
                configuration: this.config
            },
            businessContinuityValidation: {
                overallScore: this.calculateOverallScore(),
                successCriteriaValidation: this.validateSuccessCriteria(),
                metrics: this.metrics
            },
            complianceAssessment: {
                gdprCompliance: `${this.metrics.complianceValidation.gdprCompliance.toFixed(1)}%`,
                pciDssCompliance: `${this.metrics.complianceValidation.pciDssCompliance.toFixed(1)}%`,
                soc2Compliance: `${this.metrics.complianceValidation.soc2Compliance.toFixed(1)}%`,
                auditTrailIntegrity: `${this.metrics.complianceValidation.auditTrailIntegrity.toFixed(1)}%`
            },
            businessImpactAnalysis: {
                revenueProtection: `${this.metrics.businessContinuityMetrics.revenueProtectionScore.toFixed(1)}%`,
                customerRetention: `${this.metrics.businessContinuityMetrics.customerRetentionScore.toFixed(1)}%`,
                slaCompliance: `${this.metrics.businessContinuityMetrics.slaComplianceScore.toFixed(1)}%`,
                recoveryTime: `${this.metrics.businessContinuityMetrics.recoveryTimeScore.toFixed(1)}%`,
                dataIntegrity: `${this.metrics.businessContinuityMetrics.dataIntegrityScore.toFixed(1)}%`
            },
            recommendations: this.generateRecommendations()
        };
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(comprehensiveReport, null, 2));
        console.log(`\n📊 Comprehensive Report Generated: ${reportPath}`);
    }
    calculateOverallScore() {
        const weights = {
            revenueProtection: 0.30,
            customerRetention: 0.20,
            slaCompliance: 0.15,
            recoveryTime: 0.15,
            dataIntegrity: 0.10,
            complianceAverage: 0.10
        };
        const businessMetrics = this.metrics.businessContinuityMetrics;
        const complianceMetrics = this.metrics.complianceValidation;
        const complianceAverage = (complianceMetrics.gdprCompliance +
            complianceMetrics.pciDssCompliance +
            complianceMetrics.soc2Compliance +
            complianceMetrics.auditTrailIntegrity) / 4;
        return (businessMetrics.revenueProtectionScore * weights.revenueProtection +
            businessMetrics.customerRetentionScore * weights.customerRetention +
            businessMetrics.slaComplianceScore * weights.slaCompliance +
            businessMetrics.recoveryTimeScore * weights.recoveryTime +
            businessMetrics.dataIntegrityScore * weights.dataIntegrity +
            complianceAverage * weights.complianceAverage);
    }
    validateSuccessCriteria() {
        const businessMetrics = this.metrics.businessContinuityMetrics;
        return {
            revenueProtection: {
                target: 99.9,
                achieved: businessMetrics.revenueProtectionScore,
                status: businessMetrics.revenueProtectionScore >= 99.9 ? 'PASS' : 'FAIL'
            },
            customerRetention: {
                target: 99.0,
                achieved: businessMetrics.customerRetentionScore,
                status: businessMetrics.customerRetentionScore >= 99.0 ? 'PASS' : 'FAIL'
            },
            slaCompliance: {
                target: 95.0,
                achieved: businessMetrics.slaComplianceScore,
                status: businessMetrics.slaComplianceScore >= 95.0 ? 'PASS' : 'FAIL'
            },
            recoveryTime: {
                target: 95.0,
                achieved: businessMetrics.recoveryTimeScore,
                status: businessMetrics.recoveryTimeScore >= 95.0 ? 'PASS' : 'FAIL'
            },
            dataIntegrity: {
                target: 100.0,
                achieved: businessMetrics.dataIntegrityScore,
                status: businessMetrics.dataIntegrityScore >= 100.0 ? 'PASS' : 'FAIL'
            }
        };
    }
    generateRecommendations() {
        const recommendations = [];
        const businessMetrics = this.metrics.businessContinuityMetrics;
        const complianceMetrics = this.metrics.complianceValidation;
        if (businessMetrics.revenueProtectionScore < 99.9) {
            recommendations.push('Enhance revenue protection mechanisms to achieve 99.9% continuity target');
        }
        if (businessMetrics.customerRetentionScore < 99.0) {
            recommendations.push('Improve customer retention strategies during incidents to achieve <1% churn target');
        }
        if (businessMetrics.slaComplianceScore < 95.0) {
            recommendations.push('Strengthen SLA compliance measures to achieve 95% compliance during disruptions');
        }
        if (businessMetrics.recoveryTimeScore < 95.0) {
            recommendations.push('Optimize recovery time procedures to achieve <1 hour recovery for critical processes');
        }
        if (complianceMetrics.gdprCompliance < 90.0) {
            recommendations.push('Enhance GDPR compliance measures to achieve 90% compliance maintenance target');
        }
        if (complianceMetrics.pciDssCompliance < 85.0) {
            recommendations.push('Strengthen PCI DSS compliance controls to achieve 85% compliance preservation target');
        }
        if (complianceMetrics.auditTrailIntegrity < 100.0) {
            recommendations.push('Improve audit trail integrity to achieve 100% preservation with zero data loss');
        }
        if (recommendations.length === 0) {
            recommendations.push('All business continuity targets achieved - maintain current excellence');
        }
        return recommendations;
    }
    displayTestSummary() {
        const overallScore = this.calculateOverallScore();
        const executionTimeMinutes = Math.round(this.metrics.testSuiteResults.executionTime / 60000);
        console.log('\n' + '='.repeat(80));
        console.log('🎯 BUSINESS CONTINUITY VALIDATION TESTING SUMMARY');
        console.log('💰 $2M+ MRR PROTECTION VALIDATION RESULTS');
        console.log('='.repeat(80));
        console.log(`\n📊 Test Execution Results:`);
        console.log(`   Total Tests: ${this.metrics.testSuiteResults.totalTests}`);
        console.log(`   Passed: ${this.metrics.testSuiteResults.passedTests}`);
        console.log(`   Failed: ${this.metrics.testSuiteResults.failedTests}`);
        console.log(`   Execution Time: ${executionTimeMinutes} minutes`);
        console.log(`\n🎯 Business Continuity Metrics:`);
        console.log(`   Overall Score: ${overallScore.toFixed(1)}%`);
        console.log(`   Revenue Protection: ${this.metrics.businessContinuityMetrics.revenueProtectionScore.toFixed(1)}% (Target: 99.9%)`);
        console.log(`   Customer Retention: ${this.metrics.businessContinuityMetrics.customerRetentionScore.toFixed(1)}% (Target: 99.0%)`);
        console.log(`   SLA Compliance: ${this.metrics.businessContinuityMetrics.slaComplianceScore.toFixed(1)}% (Target: 95.0%)`);
        console.log(`   Recovery Time: ${this.metrics.businessContinuityMetrics.recoveryTimeScore.toFixed(1)}% (Target: 95.0%)`);
        console.log(`   Data Integrity: ${this.metrics.businessContinuityMetrics.dataIntegrityScore.toFixed(1)}% (Target: 100.0%)`);
        console.log(`\n📋 Compliance Validation:`);
        console.log(`   GDPR Compliance: ${this.metrics.complianceValidation.gdprCompliance.toFixed(1)}% (Target: 90.0%)`);
        console.log(`   PCI DSS Compliance: ${this.metrics.complianceValidation.pciDssCompliance.toFixed(1)}% (Target: 85.0%)`);
        console.log(`   SOC 2 Compliance: ${this.metrics.complianceValidation.soc2Compliance.toFixed(1)}% (Target: 85.0%)`);
        console.log(`   Audit Trail Integrity: ${this.metrics.complianceValidation.auditTrailIntegrity.toFixed(1)}% (Target: 100.0%)`);
        console.log(`\n📢 Stakeholder Communication:`);
        console.log(`   Customer Communication: ${this.metrics.stakeholderCommunication.customerCommunicationScore.toFixed(1)}%`);
        console.log(`   Investor Communication: ${this.metrics.stakeholderCommunication.investorCommunicationScore.toFixed(1)}%`);
        console.log(`   Regulatory Communication: ${this.metrics.stakeholderCommunication.regulatoryCommunicationScore.toFixed(1)}%`);
        const successCriteria = this.validateSuccessCriteria();
        const allCriteriaMet = Object.values(successCriteria).every((criteria) => criteria.status === 'PASS');
        console.log(`\n${allCriteriaMet ? '✅' : '❌'} Success Criteria: ${allCriteriaMet ? 'ALL TARGETS ACHIEVED' : 'TARGETS NOT MET'}`);
        if (overallScore >= 95.0) {
            console.log(`\n🏆 EXCELLENT: Business continuity validation achieved ${overallScore.toFixed(1)}% - System ready for $2M+ MRR protection`);
        }
        else if (overallScore >= 90.0) {
            console.log(`\n✅ GOOD: Business continuity validation achieved ${overallScore.toFixed(1)}% - Minor improvements recommended`);
        }
        else if (overallScore >= 80.0) {
            console.log(`\n⚠️  ADEQUATE: Business continuity validation achieved ${overallScore.toFixed(1)}% - Improvements required`);
        }
        else {
            console.log(`\n❌ INSUFFICIENT: Business continuity validation achieved ${overallScore.toFixed(1)}% - Significant improvements required`);
        }
        console.log('='.repeat(80));
    }
}
exports.BusinessContinuityTestRunner = BusinessContinuityTestRunner;
if (require.main === module) {
    const testRunner = new BusinessContinuityTestRunner();
    testRunner.runBusinessContinuityTests()
        .then((metrics) => {
        const overallScore = (metrics.businessContinuityMetrics.revenueProtectionScore +
            metrics.businessContinuityMetrics.customerRetentionScore +
            metrics.businessContinuityMetrics.slaComplianceScore +
            metrics.businessContinuityMetrics.recoveryTimeScore +
            metrics.businessContinuityMetrics.dataIntegrityScore) / 5;
        process.exit(overallScore >= 95.0 ? 0 : 1);
    })
        .catch((error) => {
        console.error('Business Continuity Testing Failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=BusinessContinuityTestRunner.js.map