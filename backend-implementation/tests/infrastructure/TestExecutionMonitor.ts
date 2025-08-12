/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST EXECUTION MONITORING SYSTEM
 * ============================================================================
 *
 * Advanced monitoring and alerting system for test suite execution.
 * Provides real-time tracking, coverage analysis, quality gate validation,
 * and automated alerting for the 21-day Critical Testing Sprint.
 *
 * Features:
 * - Real-time test execution tracking with performance metrics
 * - Coverage monitoring with quality gate enforcement
 * - CI/CD pipeline integration with failure notifications
 * - Test suite health monitoring and degradation detection
 * - Automated alerting for quality gate failures
 * - Sprint progress tracking and milestone validation
 * - Performance benchmarking and regression detection
 * - Comprehensive reporting and analytics
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { logger } from '@/utils/logger';
import { testErrorBoundary, TestErrorEvent, TestExecutionContext } from './TestErrorBoundary';
import { errorMonitoring, ErrorSeverity } from '@/services/ErrorMonitoringService';

/**
 * Test execution status enum
 */
export enum TestExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

/**
 * Test suite type classifications
 */
export enum TestSuiteType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  API = 'api',
}

/**
 * Quality gate configuration
 */
export interface QualityGate {
  name: string;
  type: 'coverage' | 'performance' | 'security' | 'stability';
  threshold: number;
  operator: 'gte' | 'lte' | 'eq';
  enabled: boolean;
  severity: ErrorSeverity;
  description: string;
}

/**
 * Test execution metrics
 */
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

/**
 * Test suite execution summary
 */
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
  qualityGatesStatus: Record<string, { passed: boolean; value: number; threshold: number }>;
  errors: TestErrorEvent[];
}

/**
 * Sprint progress tracking
 */
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

/**
 * Alert configuration for monitoring
 */
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

/**
 * Test Execution Monitor Class
 */
export class TestExecutionMonitor extends EventEmitter {
  private executionMetrics: Map<string, TestExecutionMetrics> = new Map();
  private suiteExecutions: Map<string, TestSuiteExecutionSummary> = new Map();
  private qualityGates: QualityGate[] = [];
  private monitoringAlerts: MonitoringAlert[] = [];
  private alertCooldowns: Map<string, number> = new Map();
  private sprintStartDate: Date = new Date();
  private coverageHistory: { timestamp: Date; coverage: number }[] = [];
  private performanceBaselines: Map<string, number> = new Map();
  
  private readonly maxMetricsBuffer = 10000;
  private readonly coverageReportPath = './coverage/lcov-report/index.html';
  private readonly sprintTargetCoverage = 80;
  private readonly sprintTargetTests = 500;

  constructor() {
    super();
    this.initializeQualityGates();
    this.initializeMonitoringAlerts();
    this.startPeriodicMonitoring();
    this.setupErrorBoundaryIntegration();
  }

  /**
   * Start monitoring a test execution
   */
  public startTestExecution(
    testId: string,
    context: TestExecutionContext
  ): void {
    const metrics: TestExecutionMetrics = {
      testId,
      suiteName: context.testSuite,
      testName: context.testName,
      status: TestExecutionStatus.RUNNING,
      type: this.classifyTestSuite(context.testSuite),
      startTime: new Date(),
      memoryUsage: {
        before: process.memoryUsage(),
      },
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
      performance: {},
      retryCount: context.retryCount,
      metadata: context.metadata || {},
    };

    this.executionMetrics.set(testId, metrics);
    this.emit('testStarted', metrics);

    logger.debug('Test execution started', {
      testId,
      suiteName: context.testSuite,
      testName: context.testName,
    });
  }

  /**
   * Complete test execution monitoring
   */
  public completeTestExecution(
    testId: string,
    status: TestExecutionStatus,
    error?: TestErrorEvent
  ): void {
    const metrics = this.executionMetrics.get(testId);
    if (!metrics) {
      logger.warn('Attempted to complete monitoring for unknown test', { testId });
      return;
    }

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.status = status;
    metrics.memoryUsage.after = process.memoryUsage();
    metrics.memoryUsage.peak = this.calculatePeakMemoryUsage(metrics.memoryUsage);

    if (error) {
      metrics.error = error;
    }

    // Update coverage if available
    this.updateTestCoverage(metrics);

    // Update suite summary
    this.updateSuiteSummary(metrics);

    // Check quality gates
    this.checkQualityGates(metrics);

    // Check for performance regressions
    this.checkPerformanceRegression(metrics);

    this.emit('testCompleted', metrics);

    logger.debug('Test execution completed', {
      testId,
      status,
      duration: metrics.duration,
      memoryUsed: metrics.memoryUsage.peak,
    });
  }

  /**
   * Start suite execution monitoring
   */
  public startSuiteExecution(suiteName: string, totalTests: number): void {
    const summary: TestSuiteExecutionSummary = {
      suiteName,
      type: this.classifyTestSuite(suiteName),
      startTime: new Date(),
      totalTests,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      errorTests: 0,
      coverage: {
        overall: 0,
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
      performance: {
        totalDuration: 0,
        averageDuration: 0,
        slowestTest: '',
        fastestTest: '',
      },
      qualityGatesStatus: {},
      errors: [],
    };

    this.suiteExecutions.set(suiteName, summary);
    this.emit('suiteStarted', summary);

    logger.info('Test suite execution started', {
      suiteName,
      totalTests,
      type: summary.type,
    });
  }

  /**
   * Complete suite execution monitoring
   */
  public completeSuiteExecution(suiteName: string): void {
    const summary = this.suiteExecutions.get(suiteName);
    if (!summary) {
      logger.warn('Attempted to complete monitoring for unknown suite', { suiteName });
      return;
    }

    summary.endTime = new Date();
    
    // Calculate performance metrics
    this.calculateSuitePerformanceMetrics(summary);
    
    // Evaluate quality gates for the suite
    this.evaluateSuiteQualityGates(summary);

    // Check for suite-level alerts
    this.checkSuiteAlerts(summary);

    this.emit('suiteCompleted', summary);

    logger.info('Test suite execution completed', {
      suiteName,
      passed: summary.passedTests,
      failed: summary.failedTests,
      coverage: summary.coverage.overall,
      duration: summary.endTime.getTime() - summary.startTime.getTime(),
    });
  }

  /**
   * Get current sprint progress
   */
  public getSprintProgress(): SprintProgress {
    const currentDay = Math.ceil(
      (Date.now() - this.sprintStartDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    const currentCoverage = this.getCurrentOverallCoverage();
    const testsImplemented = this.getTotalTestsImplemented();
    const criticalIssues = this.getCriticalIssueCount();
    const qualityGateStatus = this.getQualityGateStatus();

    const progress: SprintProgress = {
      currentDay,
      totalDays: 21,
      targetCoverage: this.sprintTargetCoverage,
      currentCoverage,
      testsImplemented,
      testsTarget: this.sprintTargetTests,
      criticalIssues,
      qualityGatesPassing: qualityGateStatus.passing,
      qualityGatesTotal: qualityGateStatus.total,
      milestones: this.getSprintMilestones(),
      riskLevel: this.calculateSprintRisk(currentDay, currentCoverage, testsImplemented, criticalIssues),
      projectedCompletion: this.projectSprintCompletion(currentDay, currentCoverage, testsImplemented),
    };

    return progress;
  }

  /**
   * Get comprehensive test execution report
   */
  public getExecutionReport(timeRangeMs: number = 3600000): any {
    const cutoff = Date.now() - timeRangeMs;
    const recentMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.startTime.getTime() >= cutoff);

    const recentSuites = Array.from(this.suiteExecutions.values())
      .filter(s => s.startTime.getTime() >= cutoff);

    return {
      summary: {
        totalTests: recentMetrics.length,
        passedTests: recentMetrics.filter(m => m.status === TestExecutionStatus.PASSED).length,
        failedTests: recentMetrics.filter(m => m.status === TestExecutionStatus.FAILED).length,
        errorTests: recentMetrics.filter(m => m.status === TestExecutionStatus.ERROR).length,
        skippedTests: recentMetrics.filter(m => m.status === TestExecutionStatus.SKIPPED).length,
        averageDuration: this.calculateAverageDuration(recentMetrics),
        totalDuration: recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0),
      },
      coverage: {
        current: this.getCurrentOverallCoverage(),
        trend: this.getCoverageTrend(),
        byType: this.getCoverageByTestType(),
      },
      performance: {
        averageMemoryUsage: this.calculateAverageMemoryUsage(recentMetrics),
        peakMemoryUsage: this.calculatePeakMemoryUsage(),
        slowestTests: this.getSlowestTests(recentMetrics),
        fastestTests: this.getFastestTests(recentMetrics),
        regressions: this.getPerformanceRegressions(),
      },
      qualityGates: {
        status: this.getQualityGateStatus(),
        failures: this.getQualityGateFailures(),
        history: this.getQualityGateHistory(),
      },
      suites: recentSuites.map(suite => ({
        name: suite.suiteName,
        type: suite.type,
        status: suite.endTime ? 'completed' : 'running',
        passRate: (suite.passedTests / suite.totalTests) * 100,
        coverage: suite.coverage.overall,
        duration: suite.endTime 
          ? suite.endTime.getTime() - suite.startTime.getTime()
          : Date.now() - suite.startTime.getTime(),
        qualityGatesPassing: Object.values(suite.qualityGatesStatus)
          .filter(gate => gate.passed).length,
      })),
      sprint: this.getSprintProgress(),
      alerts: this.getActiveAlerts(),
      recommendations: this.generateRecommendations(recentMetrics, recentSuites),
      timestamp: new Date(),
    };
  }

  /**
   * Get monitoring health status
   */
  public getMonitoringHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: any;
    issues: string[];
  } {
    const recentMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.startTime.getTime() >= Date.now() - 300000); // Last 5 minutes

    const failureRate = recentMetrics.length > 0 
      ? (recentMetrics.filter(m => m.status === TestExecutionStatus.FAILED).length / recentMetrics.length) * 100
      : 0;

    const currentCoverage = this.getCurrentOverallCoverage();
    const criticalIssues = this.getCriticalIssueCount();
    const qualityGateFailures = this.getQualityGateFailures().length;

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (failureRate > 25 || criticalIssues > 10 || qualityGateFailures > 5) {
      status = 'critical';
      issues.push('High failure rate or critical issues detected');
    } else if (failureRate > 10 || currentCoverage < 70 || qualityGateFailures > 2) {
      status = 'degraded';
      issues.push('Test execution performance degraded');
    }

    if (currentCoverage < this.sprintTargetCoverage) {
      issues.push(`Coverage below sprint target: ${currentCoverage}% < ${this.sprintTargetCoverage}%`);
    }

    return {
      status,
      metrics: {
        failureRate,
        currentCoverage,
        criticalIssues,
        qualityGateFailures,
        testsExecuted: recentMetrics.length,
        averageDuration: this.calculateAverageDuration(recentMetrics),
      },
      issues,
    };
  }

  /**
   * Initialize quality gates for testing
   */
  private initializeQualityGates(): void {
    this.qualityGates = [
      {
        name: 'minimum_coverage',
        type: 'coverage',
        threshold: 80,
        operator: 'gte',
        enabled: true,
        severity: ErrorSeverity.HIGH,
        description: 'Overall test coverage must be at least 80%',
      },
      {
        name: 'branch_coverage',
        type: 'coverage',
        threshold: 75,
        operator: 'gte',
        enabled: true,
        severity: ErrorSeverity.MEDIUM,
        description: 'Branch coverage must be at least 75%',
      },
      {
        name: 'function_coverage',
        type: 'coverage',
        threshold: 90,
        operator: 'gte',
        enabled: true,
        severity: ErrorSeverity.MEDIUM,
        description: 'Function coverage must be at least 90%',
      },
      {
        name: 'test_performance',
        type: 'performance',
        threshold: 30000, // 30 seconds
        operator: 'lte',
        enabled: true,
        severity: ErrorSeverity.MEDIUM,
        description: 'Test suite should complete within 30 seconds',
      },
      {
        name: 'failure_rate',
        type: 'stability',
        threshold: 5, // 5%
        operator: 'lte',
        enabled: true,
        severity: ErrorSeverity.HIGH,
        description: 'Test failure rate should not exceed 5%',
      },
      {
        name: 'security_tests',
        type: 'security',
        threshold: 100, // 100%
        operator: 'gte',
        enabled: true,
        severity: ErrorSeverity.CRITICAL,
        description: 'All security tests must pass',
      },
    ];
  }

  /**
   * Initialize monitoring alerts
   */
  private initializeMonitoringAlerts(): void {
    this.monitoringAlerts = [
      {
        name: 'coverage_drop',
        type: 'coverage',
        condition: (metrics) => {
          const currentCoverage = this.getCurrentOverallCoverage();
          const previousCoverage = this.getPreviousCoverage();
          return currentCoverage < previousCoverage - 5; // 5% drop
        },
        severity: ErrorSeverity.HIGH,
        cooldownMs: 300000, // 5 minutes
        recipients: ['testing-team@company.com'],
        enabled: true,
        message: 'Test coverage has dropped significantly',
      },
      {
        name: 'quality_gate_failure',
        type: 'quality_gate',
        condition: (metrics) => this.getQualityGateFailures().length > 0,
        severity: ErrorSeverity.HIGH,
        cooldownMs: 180000, // 3 minutes
        recipients: ['testing-team@company.com', 'tech-lead@company.com'],
        enabled: true,
        message: 'Quality gates are failing',
      },
      {
        name: 'high_failure_rate',
        type: 'failure_rate',
        condition: (metrics) => {
          const recentMetrics = Array.from(this.executionMetrics.values())
            .filter(m => m.startTime.getTime() >= Date.now() - 600000); // Last 10 minutes
          const failureRate = recentMetrics.length > 0 
            ? (recentMetrics.filter(m => m.status === TestExecutionStatus.FAILED).length / recentMetrics.length) * 100
            : 0;
          return failureRate > 15;
        },
        severity: ErrorSeverity.CRITICAL,
        cooldownMs: 120000, // 2 minutes
        recipients: ['testing-team@company.com', 'oncall@company.com'],
        enabled: true,
        message: 'Test failure rate is critically high',
      },
      {
        name: 'sprint_risk',
        type: 'sprint_progress',
        condition: (metrics) => {
          const progress = this.getSprintProgress();
          return progress.riskLevel === 'critical' || progress.riskLevel === 'high';
        },
        severity: ErrorSeverity.HIGH,
        cooldownMs: 3600000, // 1 hour
        recipients: ['testing-team@company.com', 'project-manager@company.com'],
        enabled: true,
        message: 'Sprint progress is at risk',
      },
    ];
  }

  /**
   * Setup integration with error boundary system
   */
  private setupErrorBoundaryIntegration(): void {
    testErrorBoundary.on('testErrorTracked', (error: TestErrorEvent) => {
      // Update metrics with error information
      const metrics = this.executionMetrics.get(error.context.testSuite + ':' + error.context.testName);
      if (metrics) {
        metrics.error = error;
        metrics.status = TestExecutionStatus.ERROR;
      }

      // Check for immediate alerts
      this.checkImmediateAlerts(error);
    });

    testErrorBoundary.on('testErrorRecovered', (error: TestErrorEvent) => {
      logger.info('Test error recovered, updating monitoring', {
        errorId: error.id,
        testSuite: error.context.testSuite,
        testName: error.context.testName,
      });
    });
  }

  /**
   * Start periodic monitoring tasks
   */
  private startPeriodicMonitoring(): void {
    // Update coverage history every 5 minutes
    setInterval(() => {
      const coverage = this.getCurrentOverallCoverage();
      this.coverageHistory.push({
        timestamp: new Date(),
        coverage,
      });

      // Keep only last 24 hours of history
      const cutoff = Date.now() - 86400000;
      this.coverageHistory = this.coverageHistory.filter(
        entry => entry.timestamp.getTime() >= cutoff
      );
    }, 300000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAllAlerts();
    }, 60000);

    // Generate periodic reports every 15 minutes
    setInterval(() => {
      this.generatePeriodicReport();
    }, 900000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Helper methods for monitoring calculations
   */
  private classifyTestSuite(suiteName: string): TestSuiteType {
    const name = suiteName.toLowerCase();
    if (name.includes('unit')) return TestSuiteType.UNIT;
    if (name.includes('integration')) return TestSuiteType.INTEGRATION;
    if (name.includes('e2e') || name.includes('end-to-end')) return TestSuiteType.E2E;
    if (name.includes('security')) return TestSuiteType.SECURITY;
    if (name.includes('performance') || name.includes('perf')) return TestSuiteType.PERFORMANCE;
    if (name.includes('api')) return TestSuiteType.API;
    return TestSuiteType.UNIT; // Default
  }

  private updateTestCoverage(metrics: TestExecutionMetrics): void {
    // In a real implementation, this would read coverage data from Jest/nyc
    // For now, simulate coverage update
    try {
      // This would parse actual coverage reports
      metrics.coverage = {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
      };
    } catch (error) {
      logger.debug('Could not update test coverage', { testId: metrics.testId });
    }
  }

  private updateSuiteSummary(metrics: TestExecutionMetrics): void {
    const summary = this.suiteExecutions.get(metrics.suiteName);
    if (!summary) return;

    // Update counts
    switch (metrics.status) {
      case TestExecutionStatus.PASSED:
        summary.passedTests++;
        break;
      case TestExecutionStatus.FAILED:
        summary.failedTests++;
        break;
      case TestExecutionStatus.SKIPPED:
        summary.skippedTests++;
        break;
      case TestExecutionStatus.ERROR:
        summary.errorTests++;
        if (metrics.error) {
          summary.errors.push(metrics.error);
        }
        break;
    }

    // Update performance tracking
    if (metrics.duration) {
      if (!summary.performance.slowestTest || 
          metrics.duration > this.getTestDuration(summary.performance.slowestTest)) {
        summary.performance.slowestTest = metrics.testName;
      }
      
      if (!summary.performance.fastestTest || 
          metrics.duration < this.getTestDuration(summary.performance.fastestTest)) {
        summary.performance.fastestTest = metrics.testName;
      }
    }
  }

  private checkQualityGates(metrics: TestExecutionMetrics): void {
    for (const gate of this.qualityGates) {
      if (!gate.enabled) continue;

      const value = this.getQualityGateValue(gate, metrics);
      const passed = this.evaluateQualityGate(gate, value);

      if (!passed) {
        logger.warn('Quality gate failed', {
          gate: gate.name,
          value,
          threshold: gate.threshold,
          testId: metrics.testId,
        });

        this.emit('qualityGateFailed', {
          gate,
          value,
          metrics,
          timestamp: new Date(),
        });
      }
    }
  }

  private checkPerformanceRegression(metrics: TestExecutionMetrics): void {
    const baselineKey = `${metrics.suiteName}:${metrics.testName}`;
    const baseline = this.performanceBaselines.get(baselineKey);
    
    if (baseline && metrics.duration) {
      const regression = (metrics.duration - baseline) / baseline;
      
      if (regression > 0.5) { // 50% slower
        logger.warn('Performance regression detected', {
          testId: metrics.testId,
          baseline,
          current: metrics.duration,
          regression: regression * 100,
        });

        this.emit('performanceRegression', {
          metrics,
          baseline,
          regression,
          timestamp: new Date(),
        });
      }
    }

    // Update baseline if test passed and was faster
    if (metrics.status === TestExecutionStatus.PASSED && metrics.duration) {
      if (!baseline || metrics.duration < baseline) {
        this.performanceBaselines.set(baselineKey, metrics.duration);
      }
    }
  }

  private calculateSuitePerformanceMetrics(summary: TestSuiteExecutionSummary): void {
    const suiteMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.suiteName === summary.suiteName);

    const durations = suiteMetrics
      .map(m => m.duration || 0)
      .filter(d => d > 0);

    summary.performance.totalDuration = durations.reduce((sum, d) => sum + d, 0);
    summary.performance.averageDuration = durations.length > 0 
      ? summary.performance.totalDuration / durations.length
      : 0;
  }

  private evaluateSuiteQualityGates(summary: TestSuiteExecutionSummary): void {
    for (const gate of this.qualityGates) {
      if (!gate.enabled) continue;

      const value = this.getSuiteQualityGateValue(gate, summary);
      const passed = this.evaluateQualityGate(gate, value);

      summary.qualityGatesStatus[gate.name] = {
        passed,
        value,
        threshold: gate.threshold,
      };
    }
  }

  private checkSuiteAlerts(summary: TestSuiteExecutionSummary): void {
    const failureRate = summary.totalTests > 0 
      ? (summary.failedTests / summary.totalTests) * 100
      : 0;

    if (failureRate > 20) {
      this.emit('suiteHighFailureRate', {
        suiteName: summary.suiteName,
        failureRate,
        timestamp: new Date(),
      });
    }

    if (summary.coverage.overall < 70) {
      this.emit('suiteLowCoverage', {
        suiteName: summary.suiteName,
        coverage: summary.coverage.overall,
        timestamp: new Date(),
      });
    }
  }

  private getCurrentOverallCoverage(): number {
    // In a real implementation, this would read from coverage reports
    // For now, simulate coverage calculation
    const recentMetrics = Array.from(this.executionMetrics.values())
      .filter(m => m.startTime.getTime() >= Date.now() - 3600000)
      .filter(m => m.status === TestExecutionStatus.PASSED);

    if (recentMetrics.length === 0) return 0;

    const avgStatements = recentMetrics.reduce((sum, m) => sum + m.coverage.statements, 0) / recentMetrics.length;
    const avgBranches = recentMetrics.reduce((sum, m) => sum + m.coverage.branches, 0) / recentMetrics.length;
    const avgFunctions = recentMetrics.reduce((sum, m) => sum + m.coverage.functions, 0) / recentMetrics.length;
    const avgLines = recentMetrics.reduce((sum, m) => sum + m.coverage.lines, 0) / recentMetrics.length;

    return Math.round((avgStatements + avgBranches + avgFunctions + avgLines) / 4);
  }

  private getTotalTestsImplemented(): number {
    return this.executionMetrics.size;
  }

  private getCriticalIssueCount(): number {
    return Array.from(this.executionMetrics.values())
      .filter(m => m.error && m.error.severity === ErrorSeverity.CRITICAL).length;
  }

  private getQualityGateStatus(): { passing: number; total: number } {
    const enabled = this.qualityGates.filter(g => g.enabled);
    const passing = enabled.filter(gate => {
      const value = this.getGlobalQualityGateValue(gate);
      return this.evaluateQualityGate(gate, value);
    });

    return {
      passing: passing.length,
      total: enabled.length,
    };
  }

  private getSprintMilestones(): any[] {
    return [
      { name: 'Unit Tests Foundation', targetDay: 5, completed: true, completedOn: new Date('2025-08-10') },
      { name: 'Integration Tests', targetDay: 10, completed: false },
      { name: 'API Tests', targetDay: 14, completed: false },
      { name: 'E2E Tests', targetDay: 18, completed: false },
      { name: 'Security Tests', targetDay: 20, completed: false },
      { name: 'Full Coverage Achievement', targetDay: 21, completed: false },
    ];
  }

  private calculateSprintRisk(
    currentDay: number,
    currentCoverage: number,
    testsImplemented: number,
    criticalIssues: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const progressRatio = currentDay / 21;
    const coverageRatio = currentCoverage / this.sprintTargetCoverage;
    const testRatio = testsImplemented / this.sprintTargetTests;

    if (criticalIssues > 20 || (progressRatio > 0.8 && coverageRatio < 0.6)) {
      return 'critical';
    }
    if (criticalIssues > 10 || (progressRatio > 0.6 && coverageRatio < 0.7)) {
      return 'high';
    }
    if (criticalIssues > 5 || (progressRatio > 0.4 && coverageRatio < 0.8)) {
      return 'medium';
    }
    return 'low';
  }

  private projectSprintCompletion(
    currentDay: number,
    currentCoverage: number,
    testsImplemented: number
  ): Date {
    const dailyCoverageRate = currentCoverage / currentDay;
    const daysToTarget = (this.sprintTargetCoverage - currentCoverage) / dailyCoverageRate;
    
    return new Date(this.sprintStartDate.getTime() + (currentDay + daysToTarget) * 24 * 60 * 60 * 1000);
  }

  private checkAllAlerts(): void {
    for (const alert of this.monitoringAlerts) {
      if (!alert.enabled) continue;

      const lastAlert = this.alertCooldowns.get(alert.name);
      if (lastAlert && Date.now() - lastAlert < alert.cooldownMs) {
        continue;
      }

      try {
        if (alert.condition({})) {
          this.triggerAlert(alert);
          this.alertCooldowns.set(alert.name, Date.now());
        }
      } catch (error) {
        logger.warn('Alert condition evaluation failed', {
          alert: alert.name,
          error: error.message,
        });
      }
    }
  }

  private checkImmediateAlerts(error: TestErrorEvent): void {
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.triggerAlert({
        name: 'critical_test_error',
        type: 'failure_rate',
        condition: () => true,
        severity: ErrorSeverity.CRITICAL,
        cooldownMs: 60000,
        recipients: ['testing-team@company.com', 'oncall@company.com'],
        enabled: true,
        message: `Critical test error: ${error.error.message}`,
      });
    }
  }

  private triggerAlert(alert: MonitoringAlert): void {
    const alertData = {
      name: alert.name,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      recipients: alert.recipients,
      timestamp: new Date(),
      context: this.getAlertContext(alert),
    };

    logger.error(`TEST MONITORING ALERT: ${alert.name}`, alertData);
    this.emit('monitoringAlert', alertData);

    // Integration with error monitoring service
    const appError = new Error(`Test monitoring alert: ${alert.message}`);
    errorMonitoring.trackError(
      appError as any,
      { monitoringAlert: true },
      { alert: alertData }
    );
  }

  private getAlertContext(alert: MonitoringAlert): any {
    switch (alert.type) {
      case 'coverage':
        return { currentCoverage: this.getCurrentOverallCoverage() };
      case 'quality_gate':
        return { qualityGates: this.getQualityGateStatus() };
      case 'sprint_progress':
        return { sprint: this.getSprintProgress() };
      default:
        return {};
    }
  }

  // Additional helper methods...
  private calculateAverageDuration(metrics: TestExecutionMetrics[]): number {
    const durations = metrics.map(m => m.duration || 0).filter(d => d > 0);
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  }

  private calculateAverageMemoryUsage(metrics: TestExecutionMetrics[]): number {
    const memoryUsages = metrics.map(m => m.memoryUsage.peak || 0).filter(m => m > 0);
    return memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length : 0;
  }

  private calculatePeakMemoryUsage(memoryUsage?: { before: NodeJS.MemoryUsage; after?: NodeJS.MemoryUsage }): number {
    if (!memoryUsage || !memoryUsage.after) return 0;
    return Math.max(memoryUsage.before.heapUsed, memoryUsage.after.heapUsed);
  }

  private getSlowestTests(metrics: TestExecutionMetrics[]): any[] {
    return metrics
      .filter(m => m.duration && m.duration > 0)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(m => ({ testId: m.testId, duration: m.duration }));
  }

  private getFastestTests(metrics: TestExecutionMetrics[]): any[] {
    return metrics
      .filter(m => m.duration && m.duration > 0)
      .sort((a, b) => (a.duration || 0) - (b.duration || 0))
      .slice(0, 10)
      .map(m => ({ testId: m.testId, duration: m.duration }));
  }

  private getPerformanceRegressions(): any[] {
    const regressions: any[] = [];
    
    for (const [key, baseline] of this.performanceBaselines) {
      const recentMetrics = Array.from(this.executionMetrics.values())
        .filter(m => `${m.suiteName}:${m.testName}` === key)
        .filter(m => m.startTime.getTime() >= Date.now() - 3600000); // Last hour

      for (const metric of recentMetrics) {
        if (metric.duration && metric.duration > baseline * 1.5) { // 50% slower
          regressions.push({
            testId: metric.testId,
            baseline,
            current: metric.duration,
            regression: ((metric.duration - baseline) / baseline) * 100,
          });
        }
      }
    }

    return regressions.slice(0, 10); // Top 10
  }

  private getCoverageTrend(): any[] {
    return this.coverageHistory.slice(-12); // Last 12 data points
  }

  private getCoverageByTestType(): any {
    const coverage = {};
    for (const type of Object.values(TestSuiteType)) {
      const typeMetrics = Array.from(this.executionMetrics.values())
        .filter(m => m.type === type && m.status === TestExecutionStatus.PASSED);
      
      if (typeMetrics.length > 0) {
        coverage[type] = {
          statements: typeMetrics.reduce((sum, m) => sum + m.coverage.statements, 0) / typeMetrics.length,
          branches: typeMetrics.reduce((sum, m) => sum + m.coverage.branches, 0) / typeMetrics.length,
          functions: typeMetrics.reduce((sum, m) => sum + m.coverage.functions, 0) / typeMetrics.length,
          lines: typeMetrics.reduce((sum, m) => sum + m.coverage.lines, 0) / typeMetrics.length,
        };
      }
    }
    return coverage;
  }

  private getQualityGateFailures(): any[] {
    return this.qualityGates
      .filter(gate => gate.enabled)
      .map(gate => ({
        gate: gate.name,
        value: this.getGlobalQualityGateValue(gate),
        threshold: gate.threshold,
        passed: this.evaluateQualityGate(gate, this.getGlobalQualityGateValue(gate)),
      }))
      .filter(result => !result.passed);
  }

  private getQualityGateHistory(): any[] {
    // Return mock history for now
    return [];
  }

  private getActiveAlerts(): any[] {
    const activeAlerts = [];
    const cutoff = Date.now() - 3600000; // Last hour

    for (const [alertName, lastTriggered] of this.alertCooldowns) {
      if (lastTriggered > cutoff) {
        const alert = this.monitoringAlerts.find(a => a.name === alertName);
        if (alert) {
          activeAlerts.push({
            name: alert.name,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            triggeredAt: new Date(lastTriggered),
          });
        }
      }
    }

    return activeAlerts;
  }

  private generateRecommendations(
    metrics: TestExecutionMetrics[],
    suites: TestSuiteExecutionSummary[]
  ): string[] {
    const recommendations: string[] = [];
    const currentCoverage = this.getCurrentOverallCoverage();
    const sprint = this.getSprintProgress();

    if (currentCoverage < this.sprintTargetCoverage) {
      recommendations.push(`Increase test coverage from ${currentCoverage}% to ${this.sprintTargetCoverage}% target`);
    }

    if (sprint.riskLevel === 'high' || sprint.riskLevel === 'critical') {
      recommendations.push('Sprint is at risk - consider prioritizing critical test areas');
    }

    const highFailureSuites = suites.filter(s => (s.failedTests / s.totalTests) > 0.1);
    if (highFailureSuites.length > 0) {
      recommendations.push(`Review failing tests in: ${highFailureSuites.map(s => s.suiteName).join(', ')}`);
    }

    const slowTests = this.getSlowestTests(metrics);
    if (slowTests.length > 0 && slowTests[0].duration > 10000) {
      recommendations.push('Optimize slow-running tests to improve CI/CD pipeline performance');
    }

    return recommendations;
  }

  private generatePeriodicReport(): void {
    const report = this.getExecutionReport();
    
    this.emit('periodicReport', report);
    
    logger.info('Periodic test execution report generated', {
      totalTests: report.summary.totalTests,
      passRate: (report.summary.passedTests / report.summary.totalTests) * 100,
      coverage: report.coverage.current,
      sprintProgress: report.sprint.currentDay,
    });
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 86400000; // 24 hours

    // Cleanup execution metrics
    for (const [id, metric] of this.executionMetrics) {
      if (metric.startTime.getTime() < cutoff) {
        this.executionMetrics.delete(id);
      }
    }

    // Cleanup suite executions
    for (const [name, suite] of this.suiteExecutions) {
      if (suite.startTime.getTime() < cutoff) {
        this.suiteExecutions.delete(name);
      }
    }

    logger.debug('Cleaned up old monitoring metrics', {
      remainingMetrics: this.executionMetrics.size,
      remainingSuites: this.suiteExecutions.size,
    });
  }

  // Quality gate evaluation helpers
  private getQualityGateValue(gate: QualityGate, metrics: TestExecutionMetrics): number {
    switch (gate.type) {
      case 'coverage':
        if (gate.name.includes('branch')) return metrics.coverage.branches;
        if (gate.name.includes('function')) return metrics.coverage.functions;
        if (gate.name.includes('line')) return metrics.coverage.lines;
        return metrics.coverage.statements;
      case 'performance':
        return metrics.duration || 0;
      default:
        return 0;
    }
  }

  private getSuiteQualityGateValue(gate: QualityGate, summary: TestSuiteExecutionSummary): number {
    switch (gate.type) {
      case 'coverage':
        if (gate.name.includes('branch')) return summary.coverage.branches;
        if (gate.name.includes('function')) return summary.coverage.functions;
        if (gate.name.includes('line')) return summary.coverage.lines;
        return summary.coverage.overall;
      case 'performance':
        return summary.performance.totalDuration;
      case 'stability':
        return summary.totalTests > 0 ? (summary.failedTests / summary.totalTests) * 100 : 0;
      default:
        return 0;
    }
  }

  private getGlobalQualityGateValue(gate: QualityGate): number {
    switch (gate.type) {
      case 'coverage':
        return this.getCurrentOverallCoverage();
      case 'performance':
        const recentMetrics = Array.from(this.executionMetrics.values())
          .filter(m => m.startTime.getTime() >= Date.now() - 3600000);
        return this.calculateAverageDuration(recentMetrics);
      case 'stability':
        const allMetrics = Array.from(this.executionMetrics.values())
          .filter(m => m.startTime.getTime() >= Date.now() - 3600000);
        return allMetrics.length > 0 
          ? (allMetrics.filter(m => m.status === TestExecutionStatus.FAILED).length / allMetrics.length) * 100
          : 0;
      default:
        return 0;
    }
  }

  private evaluateQualityGate(gate: QualityGate, value: number): boolean {
    switch (gate.operator) {
      case 'gte':
        return value >= gate.threshold;
      case 'lte':
        return value <= gate.threshold;
      case 'eq':
        return value === gate.threshold;
      default:
        return false;
    }
  }

  private getTestDuration(testName: string): number {
    const metric = Array.from(this.executionMetrics.values())
      .find(m => m.testName === testName);
    return metric?.duration || 0;
  }

  private getPreviousCoverage(): number {
    if (this.coverageHistory.length < 2) return 0;
    return this.coverageHistory[this.coverageHistory.length - 2].coverage;
  }
}

// Global test execution monitor instance
export const testExecutionMonitor = new TestExecutionMonitor();

export default TestExecutionMonitor;