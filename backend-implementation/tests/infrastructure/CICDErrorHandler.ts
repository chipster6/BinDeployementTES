/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CI/CD PIPELINE ERROR HANDLER
 * ============================================================================
 *
 * Comprehensive CI/CD pipeline error handling and failure recovery system.
 * Ensures continuous testing and deployment pipeline resilience during the
 * 21-day Critical Testing Sprint with automated recovery and notification.
 *
 * Features:
 * - Pipeline stage error detection and categorization
 * - Automated retry mechanisms with intelligent backoff
 * - Build artifact recovery and cache management
 * - Environment-specific failure handling strategies
 * - Dependency resolution and package management recovery
 * - Test result aggregation and quality gate enforcement
 * - Notification system integration for immediate alerts
 * - Performance monitoring and optimization recommendations
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { execSync, spawn, ChildProcess } from 'child_process';
import { logger } from '@/utils/logger';
import { testErrorBoundary, TestErrorType } from './TestErrorBoundary';
import { testExecutionMonitor } from './TestExecutionMonitor';
import { errorMonitoring, ErrorSeverity } from '@/services/ErrorMonitoringService';

/**
 * CI/CD Pipeline stages
 */
export enum PipelineStage {
  SETUP = 'setup',
  INSTALL = 'install',
  LINT = 'lint',
  BUILD = 'build',
  TEST_UNIT = 'test_unit',
  TEST_INTEGRATION = 'test_integration',
  TEST_E2E = 'test_e2e',
  SECURITY_SCAN = 'security_scan',
  COVERAGE_ANALYSIS = 'coverage_analysis',
  QUALITY_GATES = 'quality_gates',
  PACKAGE = 'package',
  DEPLOY = 'deploy',
  CLEANUP = 'cleanup',
}

/**
 * Pipeline environment types
 */
export enum PipelineEnvironment {
  LOCAL = 'local',
  CI = 'ci',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Error types specific to CI/CD operations
 */
export enum CICDErrorType {
  DEPENDENCY_RESOLUTION = 'dependency_resolution',
  BUILD_COMPILATION = 'build_compilation',
  TEST_EXECUTION = 'test_execution',
  COVERAGE_COLLECTION = 'coverage_collection',
  QUALITY_GATE_FAILURE = 'quality_gate_failure',
  SECURITY_VULNERABILITY = 'security_vulnerability',
  DEPLOYMENT_FAILURE = 'deployment_failure',
  ENVIRONMENT_SETUP = 'environment_setup',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  NETWORK_CONNECTIVITY = 'network_connectivity',
  ARTIFACT_CORRUPTION = 'artifact_corruption',
  TIMEOUT_EXCEEDED = 'timeout_exceeded',
}

/**
 * Pipeline execution context
 */
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

/**
 * Pipeline error event
 */
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

/**
 * Recovery strategy for pipeline failures
 */
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

/**
 * Quality gate configuration for CI/CD
 */
export interface CICDQualityGate {
  name: string;
  stage: PipelineStage;
  type: 'coverage' | 'security' | 'performance' | 'quality';
  threshold: number;
  operator: 'gte' | 'lte' | 'eq';
  blocking: boolean;
  description: string;
}

/**
 * Pipeline health metrics
 */
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

/**
 * CI/CD Error Handler Class
 */
export class CICDErrorHandler extends EventEmitter {
  private pipelineExecutions: Map<string, PipelineExecutionContext> = new Map();
  private errorHistory: Map<string, PipelineErrorEvent> = new Map();
  private recoveryStrategies: PipelineRecoveryStrategy[] = [];
  private qualityGates: CICDQualityGate[] = [];
  private activeRecoveries: Map<string, Date> = new Map();
  private healthMetrics: PipelineHealthMetrics;
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.healthMetrics = this.initializeHealthMetrics();
    this.initializeRecoveryStrategies();
    this.initializeQualityGates();
    this.startHealthMonitoring();
  }

  /**
   * Execute pipeline stage with comprehensive error handling
   */
  public async executePipelineStage(
    stage: PipelineStage,
    context: PipelineExecutionContext,
    stageFunction: () => Promise<any>
  ): Promise<any> {
    const stageId = this.generateStageId(context.pipelineId, stage);
    context.stage = stage;
    
    logger.info('Starting pipeline stage', {
      pipelineId: context.pipelineId,
      stage,
      environment: context.environment,
    });

    let lastError: Error | null = null;
    let attemptCount = 0;

    while (attemptCount <= context.maxRetries) {
      try {
        // Pre-stage validation
        await this.validateStagePrerequisites(stage, context);

        // Execute stage with monitoring
        const startTime = Date.now();
        const result = await this.executeStageWithMonitoring(stageFunction, context);
        const duration = Date.now() - startTime;

        // Post-stage validation
        await this.validateStageResults(stage, context, result);

        // Record success
        this.recordStageSuccess(stageId, stage, duration);
        
        logger.info('Pipeline stage completed successfully', {
          pipelineId: context.pipelineId,
          stage,
          duration,
          attempt: attemptCount + 1,
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        attemptCount++;

        const errorEvent = await this.handleStageError(
          error as Error,
          stage,
          context,
          attemptCount
        );

        // Attempt recovery if enabled and within retry limits
        if (attemptCount <= context.maxRetries) {
          const recovered = await this.attemptStageRecovery(errorEvent, context);
          
          if (recovered) {
            logger.info('Pipeline stage recovered successfully', {
              pipelineId: context.pipelineId,
              stage,
              attempt: attemptCount,
            });
            
            // Exponential backoff delay
            await this.delay(1000 * Math.pow(2, attemptCount - 1));
            continue;
          }
        }

        // If we've exhausted retries, break out of loop
        if (attemptCount > context.maxRetries) {
          break;
        }

        // Delay before retry
        await this.delay(2000 * attemptCount);
      }
    }

    // All attempts failed
    this.recordStageFailure(stageId, stage, lastError!);
    
    // Check if this is a blocking failure
    if (this.isBlockingStageFailure(stage, lastError!)) {
      await this.handleBlockingFailure(context, stage, lastError!);
    }

    throw lastError;
  }

  /**
   * Validate quality gates for pipeline
   */
  public async validateQualityGates(
    context: PipelineExecutionContext,
    results: Record<string, any>
  ): Promise<{
    passed: boolean;
    results: Array<{
      gate: string;
      passed: boolean;
      value: number;
      threshold: number;
      blocking: boolean;
    }>;
  }> {
    const gateResults = [];
    let allPassed = true;

    for (const gate of this.qualityGates) {
      const value = this.extractQualityGateValue(gate, results);
      const passed = this.evaluateQualityGate(gate, value);
      
      if (!passed) {
        allPassed = false;
        
        if (gate.blocking) {
          logger.error('Blocking quality gate failed', {
            pipelineId: context.pipelineId,
            gate: gate.name,
            value,
            threshold: gate.threshold,
          });

          // Create error event for quality gate failure
          await this.handleStageError(
            new Error(`Quality gate failed: ${gate.name} (${value} ${gate.operator} ${gate.threshold})`),
            PipelineStage.QUALITY_GATES,
            context,
            1
          );
        } else {
          logger.warn('Non-blocking quality gate failed', {
            pipelineId: context.pipelineId,
            gate: gate.name,
            value,
            threshold: gate.threshold,
          });
        }
      }

      gateResults.push({
        gate: gate.name,
        passed,
        value,
        threshold: gate.threshold,
        blocking: gate.blocking,
      });
    }

    return {
      passed: allPassed,
      results: gateResults,
    };
  }

  /**
   * Handle environment-specific configuration
   */
  public async setupEnvironmentConfiguration(
    environment: PipelineEnvironment,
    context: PipelineExecutionContext
  ): Promise<void> {
    try {
      switch (environment) {
        case PipelineEnvironment.LOCAL:
          await this.setupLocalEnvironment(context);
          break;
        case PipelineEnvironment.CI:
          await this.setupCIEnvironment(context);
          break;
        case PipelineEnvironment.STAGING:
          await this.setupStagingEnvironment(context);
          break;
        case PipelineEnvironment.PRODUCTION:
          await this.setupProductionEnvironment(context);
          break;
      }

      logger.info('Environment configuration completed', {
        pipelineId: context.pipelineId,
        environment,
      });

    } catch (error) {
      logger.error('Environment configuration failed', {
        pipelineId: context.pipelineId,
        environment,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get pipeline health metrics
   */
  public getHealthMetrics(): PipelineHealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Get detailed pipeline execution report
   */
  public getPipelineExecutionReport(
    pipelineId?: string,
    timeRangeMs: number = 3600000
  ): any {
    const cutoff = Date.now() - timeRangeMs;
    const recentErrors = Array.from(this.errorHistory.values())
      .filter(error => error.timestamp.getTime() >= cutoff);

    if (pipelineId) {
      recentErrors.filter(error => error.pipelineId === pipelineId);
    }

    return {
      summary: {
        totalExecutions: this.pipelineExecutions.size,
        totalErrors: recentErrors.length,
        recoveredErrors: recentErrors.filter(e => e.recovered).length,
        blockedExecutions: this.getBlockedExecutions().length,
        averageDuration: this.calculateAveragePipelineDuration(),
      },
      errorsByStage: this.groupBy(recentErrors, 'stage'),
      errorsByType: this.groupBy(recentErrors, 'errorType'),
      errorsBySeverity: this.groupBy(recentErrors, 'severity'),
      recoveryEffectiveness: this.calculateRecoveryEffectiveness(recentErrors),
      qualityGateStatus: this.getQualityGateStatus(),
      recommendations: this.generatePipelineRecommendations(recentErrors),
      healthMetrics: this.healthMetrics,
      timestamp: new Date(),
    };
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies = [
      {
        name: 'dependency_resolution_retry',
        applicableStages: [PipelineStage.INSTALL],
        applicableErrors: [CICDErrorType.DEPENDENCY_RESOLUTION],
        priority: 1,
        maxAttempts: 3,
        cooldownMs: 5000,
        action: this.recoverDependencyResolution.bind(this),
        description: 'Clear package cache and retry dependency installation',
      },
      {
        name: 'build_cache_clear',
        applicableStages: [PipelineStage.BUILD],
        applicableErrors: [CICDErrorType.BUILD_COMPILATION, CICDErrorType.ARTIFACT_CORRUPTION],
        priority: 1,
        maxAttempts: 2,
        cooldownMs: 3000,
        action: this.recoverBuildCache.bind(this),
        description: 'Clear build cache and rebuild from clean state',
      },
      {
        name: 'test_environment_reset',
        applicableStages: [PipelineStage.TEST_UNIT, PipelineStage.TEST_INTEGRATION, PipelineStage.TEST_E2E],
        applicableErrors: [CICDErrorType.TEST_EXECUTION, CICDErrorType.ENVIRONMENT_SETUP],
        priority: 2,
        maxAttempts: 2,
        cooldownMs: 10000,
        action: this.recoverTestEnvironment.bind(this),
        description: 'Reset test environment and retry test execution',
      },
      {
        name: 'resource_cleanup',
        applicableStages: Object.values(PipelineStage),
        applicableErrors: [CICDErrorType.RESOURCE_EXHAUSTION],
        priority: 1,
        maxAttempts: 1,
        cooldownMs: 5000,
        action: this.recoverResourceExhaustion.bind(this),
        description: 'Clean up resources and free memory/disk space',
      },
      {
        name: 'network_retry',
        applicableStages: Object.values(PipelineStage),
        applicableErrors: [CICDErrorType.NETWORK_CONNECTIVITY],
        priority: 2,
        maxAttempts: 3,
        cooldownMs: 2000,
        action: this.recoverNetworkConnectivity.bind(this),
        description: 'Retry network operations with exponential backoff',
      },
      {
        name: 'timeout_extension',
        applicableStages: Object.values(PipelineStage),
        applicableErrors: [CICDErrorType.TIMEOUT_EXCEEDED],
        priority: 3,
        maxAttempts: 1,
        cooldownMs: 1000,
        action: this.recoverTimeoutExtension.bind(this),
        description: 'Extend timeout and retry operation',
      },
    ];
  }

  /**
   * Initialize quality gates
   */
  private initializeQualityGates(): void {
    this.qualityGates = [
      {
        name: 'test_coverage',
        stage: PipelineStage.COVERAGE_ANALYSIS,
        type: 'coverage',
        threshold: 80,
        operator: 'gte',
        blocking: true,
        description: 'Test coverage must be at least 80%',
      },
      {
        name: 'build_time',
        stage: PipelineStage.BUILD,
        type: 'performance',
        threshold: 300000, // 5 minutes
        operator: 'lte',
        blocking: false,
        description: 'Build should complete within 5 minutes',
      },
      {
        name: 'test_execution_time',
        stage: PipelineStage.TEST_UNIT,
        type: 'performance',
        threshold: 600000, // 10 minutes
        operator: 'lte',
        blocking: false,
        description: 'Unit tests should complete within 10 minutes',
      },
      {
        name: 'security_vulnerabilities',
        stage: PipelineStage.SECURITY_SCAN,
        type: 'security',
        threshold: 0,
        operator: 'eq',
        blocking: true,
        description: 'No high or critical security vulnerabilities allowed',
      },
      {
        name: 'code_quality_score',
        stage: PipelineStage.LINT,
        type: 'quality',
        threshold: 8.0,
        operator: 'gte',
        blocking: false,
        description: 'Code quality score should be at least 8.0',
      },
    ];
  }

  /**
   * Handle pipeline stage error
   */
  private async handleStageError(
    error: Error,
    stage: PipelineStage,
    context: PipelineExecutionContext,
    attemptNumber: number
  ): Promise<PipelineErrorEvent> {
    const errorType = this.categorizeError(error, stage);
    const severity = this.determineSeverity(errorType, stage, attemptNumber);

    const errorEvent: PipelineErrorEvent = {
      id: this.generateErrorId(),
      pipelineId: context.pipelineId,
      stage,
      errorType,
      error,
      context,
      timestamp: new Date(),
      severity,
      recoverable: this.isRecoverable(errorType, stage),
      recovered: false,
      recoveryActions: [],
      metrics: {
        duration: Date.now() - context.startTime.getTime(),
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
      },
    };

    // Store error
    this.errorHistory.set(errorEvent.id, errorEvent);
    this.maintainHistorySize();

    // Track with test error boundary
    await testErrorBoundary.handlePipelineError(error, stage, context);

    // Track with error monitoring service
    await errorMonitoring.trackError(
      error as any,
      {
        pipelineId: context.pipelineId,
        stage,
        environment: context.environment,
        branch: context.branch,
      },
      {
        pipelineError: true,
        errorType,
        attemptNumber,
        context,
      }
    );

    this.emit('pipelineError', errorEvent);

    logger.error('Pipeline stage error', {
      errorId: errorEvent.id,
      pipelineId: context.pipelineId,
      stage,
      errorType,
      severity,
      recoverable: errorEvent.recoverable,
      attempt: attemptNumber,
    });

    return errorEvent;
  }

  /**
   * Attempt stage recovery
   */
  private async attemptStageRecovery(
    errorEvent: PipelineErrorEvent,
    context: PipelineExecutionContext
  ): Promise<boolean> {
    if (!errorEvent.recoverable) {
      return false;
    }

    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => 
        strategy.applicableStages.includes(errorEvent.stage) &&
        strategy.applicableErrors.includes(errorEvent.errorType)
      )
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of applicableStrategies) {
      const recoveryKey = `${strategy.name}_${errorEvent.pipelineId}`;
      const lastAttempt = this.activeRecoveries.get(recoveryKey);

      // Check cooldown
      if (lastAttempt && Date.now() - lastAttempt.getTime() < strategy.cooldownMs) {
        continue;
      }

      try {
        logger.info('Attempting pipeline recovery', {
          pipelineId: context.pipelineId,
          stage: errorEvent.stage,
          strategy: strategy.name,
          description: strategy.description,
        });

        this.activeRecoveries.set(recoveryKey, new Date());
        const recovered = await strategy.action(context, errorEvent.error);

        if (recovered) {
          errorEvent.recovered = true;
          errorEvent.recoveryActions.push(strategy.name);
          
          logger.info('Pipeline recovery successful', {
            pipelineId: context.pipelineId,
            stage: errorEvent.stage,
            strategy: strategy.name,
          });

          this.emit('pipelineRecovered', {
            errorEvent,
            strategy: strategy.name,
            timestamp: new Date(),
          });

          return true;
        }
      } catch (recoveryError) {
        logger.warn('Pipeline recovery strategy failed', {
          pipelineId: context.pipelineId,
          strategy: strategy.name,
          recoveryError: recoveryError.message,
        });
      }
    }

    return false;
  }

  /**
   * Recovery strategy implementations
   */
  private async recoverDependencyResolution(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    try {
      logger.info('Clearing package cache and retrying dependency installation');
      
      // Clear npm cache
      await this.executeCommand('npm cache clean --force', { timeout: 30000 });
      
      // Remove node_modules and package-lock.json
      await this.executeCommand('rm -rf node_modules package-lock.json', { timeout: 10000 });
      
      // Retry installation
      await this.executeCommand('npm ci', { timeout: 300000 });
      
      return true;
    } catch (recoveryError) {
      logger.error('Dependency resolution recovery failed', {
        error: recoveryError.message,
      });
      return false;
    }
  }

  private async recoverBuildCache(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    try {
      logger.info('Clearing build cache and rebuilding');
      
      // Clear build cache
      await this.executeCommand('rm -rf dist/ .cache/ .tmp/', { timeout: 10000 });
      
      // Clear TypeScript cache
      await this.executeCommand('npx tsc --build --clean', { timeout: 30000 });
      
      return true;
    } catch (recoveryError) {
      logger.error('Build cache recovery failed', {
        error: recoveryError.message,
      });
      return false;
    }
  }

  private async recoverTestEnvironment(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    try {
      logger.info('Resetting test environment');
      
      // Clear test cache
      await this.executeCommand('npx jest --clearCache', { timeout: 30000 });
      
      // Reset test database
      if (context.environment_variables.TEST_DB_NAME) {
        await this.executeCommand('npm run test:db:reset', { timeout: 60000 });
      }
      
      // Clear temporary files
      await this.executeCommand('rm -rf coverage/ test-results/ .jest-cache/', { timeout: 10000 });
      
      return true;
    } catch (recoveryError) {
      logger.error('Test environment recovery failed', {
        error: recoveryError.message,
      });
      return false;
    }
  }

  private async recoverResourceExhaustion(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    try {
      logger.info('Cleaning up resources');
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Clear temporary directories
      await this.executeCommand('find /tmp -name "tmp*" -type f -delete', { 
        timeout: 30000,
        ignoreErrors: true 
      });
      
      // Clear Docker resources if available
      await this.executeCommand('docker system prune -f', { 
        timeout: 60000,
        ignoreErrors: true 
      });
      
      return true;
    } catch (recoveryError) {
      logger.error('Resource cleanup recovery failed', {
        error: recoveryError.message,
      });
      return false;
    }
  }

  private async recoverNetworkConnectivity(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    try {
      logger.info('Testing network connectivity');
      
      // Test basic connectivity
      await this.executeCommand('ping -c 1 8.8.8.8', { timeout: 10000 });
      
      // Test npm registry connectivity
      await this.executeCommand('npm ping', { timeout: 10000 });
      
      return true;
    } catch (recoveryError) {
      logger.error('Network connectivity recovery failed', {
        error: recoveryError.message,
      });
      return false;
    }
  }

  private async recoverTimeoutExtension(
    context: PipelineExecutionContext,
    error: Error
  ): Promise<boolean> {
    // Extend timeout for next attempt
    context.timeout = Math.min(context.timeout * 1.5, 1800000); // Max 30 minutes
    
    logger.info('Extended operation timeout', {
      newTimeout: context.timeout,
    });
    
    return true;
  }

  /**
   * Environment setup methods
   */
  private async setupLocalEnvironment(context: PipelineExecutionContext): Promise<void> {
    // Load local environment variables
    const envFile = '.env.local';
    if (await this.fileExists(envFile)) {
      const envContent = await fs.readFile(envFile, 'utf8');
      this.parseEnvContent(envContent, context.environment_variables);
    }
  }

  private async setupCIEnvironment(context: PipelineExecutionContext): Promise<void> {
    // Set CI-specific environment variables
    context.environment_variables.CI = 'true';
    context.environment_variables.NODE_ENV = 'test';
    context.environment_variables.FORCE_COLOR = '0';
    
    // Increase memory limits for CI
    context.environment_variables.NODE_OPTIONS = '--max-old-space-size=4096';
  }

  private async setupStagingEnvironment(context: PipelineExecutionContext): Promise<void> {
    // Load staging environment variables
    const envFile = '.env.staging';
    if (await this.fileExists(envFile)) {
      const envContent = await fs.readFile(envFile, 'utf8');
      this.parseEnvContent(envContent, context.environment_variables);
    }
  }

  private async setupProductionEnvironment(context: PipelineExecutionContext): Promise<void> {
    // Load production environment variables
    const envFile = '.env.production';
    if (await this.fileExists(envFile)) {
      const envContent = await fs.readFile(envFile, 'utf8');
      this.parseEnvContent(envContent, context.environment_variables);
    }
    
    // Set production optimizations
    context.environment_variables.NODE_ENV = 'production';
    context.environment_variables.NODE_OPTIONS = '--max-old-space-size=2048';
  }

  /**
   * Helper methods
   */
  private categorizeError(error: Error, stage: PipelineStage): CICDErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Stage-specific categorization
    switch (stage) {
      case PipelineStage.INSTALL:
        if (message.includes('npm') || message.includes('package')) {
          return CICDErrorType.DEPENDENCY_RESOLUTION;
        }
        break;
      case PipelineStage.BUILD:
        if (message.includes('typescript') || message.includes('compilation')) {
          return CICDErrorType.BUILD_COMPILATION;
        }
        break;
      case PipelineStage.TEST_UNIT:
      case PipelineStage.TEST_INTEGRATION:
      case PipelineStage.TEST_E2E:
        return CICDErrorType.TEST_EXECUTION;
      case PipelineStage.SECURITY_SCAN:
        return CICDErrorType.SECURITY_VULNERABILITY;
      case PipelineStage.QUALITY_GATES:
        return CICDErrorType.QUALITY_GATE_FAILURE;
    }

    // General categorization
    if (message.includes('timeout')) {
      return CICDErrorType.TIMEOUT_EXCEEDED;
    }
    if (message.includes('network') || message.includes('connection')) {
      return CICDErrorType.NETWORK_CONNECTIVITY;
    }
    if (message.includes('memory') || message.includes('space')) {
      return CICDErrorType.RESOURCE_EXHAUSTION;
    }
    if (message.includes('corrupt') || message.includes('invalid')) {
      return CICDErrorType.ARTIFACT_CORRUPTION;
    }

    return CICDErrorType.ENVIRONMENT_SETUP;
  }

  private determineSeverity(
    errorType: CICDErrorType,
    stage: PipelineStage,
    attemptNumber: number
  ): ErrorSeverity {
    // Escalate severity based on attempt number
    if (attemptNumber > 2) {
      return ErrorSeverity.HIGH;
    }

    // Critical errors
    const criticalErrors = [
      CICDErrorType.SECURITY_VULNERABILITY,
      CICDErrorType.DEPLOYMENT_FAILURE,
    ];
    if (criticalErrors.includes(errorType)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    const highErrors = [
      CICDErrorType.BUILD_COMPILATION,
      CICDErrorType.QUALITY_GATE_FAILURE,
      CICDErrorType.ARTIFACT_CORRUPTION,
    ];
    if (highErrors.includes(errorType)) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.MEDIUM;
  }

  private isRecoverable(errorType: CICDErrorType, stage: PipelineStage): boolean {
    const nonRecoverableErrors = [
      CICDErrorType.SECURITY_VULNERABILITY,
      CICDErrorType.ARTIFACT_CORRUPTION,
    ];
    return !nonRecoverableErrors.includes(errorType);
  }

  private isBlockingStageFailure(stage: PipelineStage, error: Error): boolean {
    const blockingStages = [
      PipelineStage.BUILD,
      PipelineStage.SECURITY_SCAN,
      PipelineStage.QUALITY_GATES,
    ];
    return blockingStages.includes(stage);
  }

  private async handleBlockingFailure(
    context: PipelineExecutionContext,
    stage: PipelineStage,
    error: Error
  ): Promise<void> {
    logger.error('Blocking pipeline failure detected', {
      pipelineId: context.pipelineId,
      stage,
      error: error.message,
    });

    // Notify stakeholders
    this.emit('blockingFailure', {
      pipelineId: context.pipelineId,
      stage,
      error: error.message,
      timestamp: new Date(),
    });

    // Stop pipeline execution
    this.emit('pipelineAborted', {
      pipelineId: context.pipelineId,
      stage,
      reason: 'Blocking failure',
      timestamp: new Date(),
    });
  }

  private async validateStagePrerequisites(
    stage: PipelineStage,
    context: PipelineExecutionContext
  ): Promise<void> {
    // Stage-specific prerequisite validation
    switch (stage) {
      case PipelineStage.BUILD:
        await this.validateBuildPrerequisites(context);
        break;
      case PipelineStage.TEST_UNIT:
        await this.validateTestPrerequisites(context);
        break;
      case PipelineStage.DEPLOY:
        await this.validateDeployPrerequisites(context);
        break;
    }
  }

  private async validateStageResults(
    stage: PipelineStage,
    context: PipelineExecutionContext,
    result: any
  ): Promise<void> {
    // Stage-specific result validation
    switch (stage) {
      case PipelineStage.BUILD:
        await this.validateBuildResults(context, result);
        break;
      case PipelineStage.TEST_UNIT:
        await this.validateTestResults(context, result);
        break;
    }
  }

  private async validateBuildPrerequisites(context: PipelineExecutionContext): Promise<void> {
    // Check if source files exist
    if (!(await this.fileExists('src'))) {
      throw new Error('Source directory not found');
    }
    
    // Check if package.json exists
    if (!(await this.fileExists('package.json'))) {
      throw new Error('package.json not found');
    }
  }

  private async validateTestPrerequisites(context: PipelineExecutionContext): Promise<void> {
    // Check if test files exist
    if (!(await this.fileExists('tests'))) {
      throw new Error('Tests directory not found');
    }
  }

  private async validateDeployPrerequisites(context: PipelineExecutionContext): Promise<void> {
    // Check if build artifacts exist
    if (!(await this.fileExists('dist'))) {
      throw new Error('Build artifacts not found');
    }
  }

  private async validateBuildResults(context: PipelineExecutionContext, result: any): Promise<void> {
    // Check if build artifacts were created
    if (!(await this.fileExists('dist'))) {
      throw new Error('Build failed to produce artifacts');
    }
  }

  private async validateTestResults(context: PipelineExecutionContext, result: any): Promise<void> {
    // Check if test results are available
    if (!result || typeof result.success !== 'boolean') {
      throw new Error('Invalid test results');
    }
  }

  private async executeStageWithMonitoring<T>(
    stageFunction: () => Promise<T>,
    context: PipelineExecutionContext
  ): Promise<T> {
    // Setup monitoring
    const monitoringInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.emit('stageProgress', {
        pipelineId: context.pipelineId,
        stage: context.stage,
        memoryUsage,
        timestamp: new Date(),
      });
    }, 10000);

    try {
      return await stageFunction();
    } finally {
      clearInterval(monitoringInterval);
    }
  }

  private recordStageSuccess(stageId: string, stage: PipelineStage, duration: number): void {
    this.healthMetrics.successRate = Math.min(100, this.healthMetrics.successRate + 0.1);
    
    // Update average duration
    const currentAvg = this.healthMetrics.averageDuration;
    this.healthMetrics.averageDuration = currentAvg * 0.9 + duration * 0.1;

    // Update trends
    this.updateTrends(stage, duration);
  }

  private recordStageFailure(stageId: string, stage: PipelineStage, error: Error): void {
    this.healthMetrics.successRate = Math.max(0, this.healthMetrics.successRate - 1);
    this.healthMetrics.failuresByStage[stage] = (this.healthMetrics.failuresByStage[stage] || 0) + 1;
  }

  private updateTrends(stage: PipelineStage, duration: number): void {
    const trendsKey = this.getTrendsKey(stage);
    if (trendsKey) {
      this.healthMetrics.trends[trendsKey].push(duration);
      // Keep only last 10 measurements
      if (this.healthMetrics.trends[trendsKey].length > 10) {
        this.healthMetrics.trends[trendsKey].shift();
      }
    }
  }

  private getTrendsKey(stage: PipelineStage): keyof PipelineHealthMetrics['trends'] | null {
    switch (stage) {
      case PipelineStage.BUILD:
        return 'buildTimes';
      case PipelineStage.TEST_UNIT:
      case PipelineStage.TEST_INTEGRATION:
      case PipelineStage.TEST_E2E:
        return 'testTimes';
      default:
        return null;
    }
  }

  private extractQualityGateValue(gate: CICDQualityGate, results: Record<string, any>): number {
    switch (gate.type) {
      case 'coverage':
        return results.coverage?.overall || 0;
      case 'performance':
        return results.duration || 0;
      case 'security':
        return results.vulnerabilities?.high || 0;
      case 'quality':
        return results.quality?.score || 0;
      default:
        return 0;
    }
  }

  private evaluateQualityGate(gate: CICDQualityGate, value: number): boolean {
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

  private initializeHealthMetrics(): PipelineHealthMetrics {
    return {
      successRate: 100,
      averageDuration: 0,
      failuresByStage: {} as Record<PipelineStage, number>,
      failuresByErrorType: {} as Record<CICDErrorType, number>,
      recoveryRate: 0,
      qualityGatePassRate: 100,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        disk: 0,
      },
      trends: {
        buildTimes: [],
        testTimes: [],
        errorRates: [],
      },
    };
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.updateHealthMetrics();
      this.emit('healthUpdated', this.healthMetrics);
    }, 60000); // Every minute
  }

  private updateHealthMetrics(): void {
    // Update resource utilization
    const memoryUsage = process.memoryUsage();
    this.healthMetrics.resourceUtilization.memory = 
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Update error rates
    const recentErrors = Array.from(this.errorHistory.values())
      .filter(error => error.timestamp.getTime() >= Date.now() - 3600000); // Last hour

    const errorRate = recentErrors.length;
    this.healthMetrics.trends.errorRates.push(errorRate);
    if (this.healthMetrics.trends.errorRates.length > 10) {
      this.healthMetrics.trends.errorRates.shift();
    }

    // Update recovery rate
    const recoverableErrors = recentErrors.filter(e => e.recoverable);
    const recoveredErrors = recoverableErrors.filter(e => e.recovered);
    this.healthMetrics.recoveryRate = recoverableErrors.length > 0 
      ? (recoveredErrors.length / recoverableErrors.length) * 100
      : 100;
  }

  private generateStageId(pipelineId: string, stage: PipelineStage): string {
    return `${pipelineId}_${stage}_${Date.now()}`;
  }

  private generateErrorId(): string {
    return `cicd_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maintainHistorySize(): void {
    if (this.errorHistory.size > this.maxHistorySize) {
      const sortedEntries = Array.from(this.errorHistory.entries())
        .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toRemove = sortedEntries.slice(0, this.errorHistory.size - this.maxHistorySize);
      toRemove.forEach(([id]) => this.errorHistory.delete(id));
    }
  }

  private getBlockedExecutions(): any[] {
    return Array.from(this.pipelineExecutions.values())
      .filter(execution => execution.stage === PipelineStage.QUALITY_GATES);
  }

  private calculateAveragePipelineDuration(): number {
    const completedExecutions = Array.from(this.pipelineExecutions.values())
      .filter(execution => execution.stage === PipelineStage.CLEANUP);
    
    if (completedExecutions.length === 0) return 0;
    
    const totalDuration = completedExecutions.reduce((sum, execution) => 
      sum + (Date.now() - execution.startTime.getTime()), 0);
    
    return totalDuration / completedExecutions.length;
  }

  private calculateRecoveryEffectiveness(errors: PipelineErrorEvent[]): number {
    const recoverableErrors = errors.filter(e => e.recoverable);
    if (recoverableErrors.length === 0) return 100;
    
    const recoveredErrors = recoverableErrors.filter(e => e.recovered);
    return (recoveredErrors.length / recoverableErrors.length) * 100;
  }

  private getQualityGateStatus(): any {
    const enabledGates = this.qualityGates.filter(g => g.blocking);
    return {
      total: enabledGates.length,
      passing: enabledGates.length, // Simplified for example
      failing: 0,
    };
  }

  private generatePipelineRecommendations(errors: PipelineErrorEvent[]): string[] {
    const recommendations: string[] = [];
    const errorCounts = this.groupBy(errors, 'errorType');

    if (errorCounts[CICDErrorType.DEPENDENCY_RESOLUTION] > 3) {
      recommendations.push('Consider using lock files and npm ci for consistent dependency installation');
    }
    if (errorCounts[CICDErrorType.BUILD_COMPILATION] > 2) {
      recommendations.push('Review TypeScript configuration and resolve compilation errors');
    }
    if (errorCounts[CICDErrorType.TEST_EXECUTION] > 5) {
      recommendations.push('Investigate test environment stability and consider test isolation');
    }
    if (errorCounts[CICDErrorType.TIMEOUT_EXCEEDED] > 2) {
      recommendations.push('Optimize build and test performance or increase timeout limits');
    }

    return recommendations;
  }

  private groupBy<T>(array: T[], property: keyof T | ((item: T) => string)): Record<string, number> {
    const groups: Record<string, number> = {};
    const getKey = typeof property === 'string' ? (item: T) => String(item[property]) : property;

    for (const item of array) {
      const key = getKey(item);
      groups[key] = (groups[key] || 0) + 1;
    }

    return groups;
  }

  private async executeCommand(
    command: string, 
    options: { 
      timeout?: number; 
      ignoreErrors?: boolean; 
      cwd?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const { timeout = 30000, ignoreErrors = false, cwd = process.cwd() } = options;
      
      const child = spawn('sh', ['-c', command], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (code !== 0 && !ignoreErrors) {
          reject(new Error(`Command failed with exit code ${code}: ${command}\nStderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        if (!ignoreErrors) {
          reject(error);
        } else {
          resolve('');
        }
      });
    });
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private parseEnvContent(content: string, target: Record<string, string>): void {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          target[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global CI/CD error handler instance
export const cicdErrorHandler = new CICDErrorHandler();

export default CICDErrorHandler;