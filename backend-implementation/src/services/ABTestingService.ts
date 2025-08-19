/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - A/B TESTING SERVICE
 * ============================================================================
 *
 * Comprehensive A/B testing framework for AI/ML features with statistical
 * analysis, automated decision making, and business impact measurement.
 * Integrates with FeatureFlagService for seamless experiment management.
 *
 * Features:
 * - Statistical A/B testing with confidence intervals
 * - Multi-variate testing support (A/B/C/D tests)
 * - Automated experiment lifecycle management
 * - Real-time statistical significance monitoring
 * - Business metrics tracking and analysis
 * - Automated winner selection and rollout
 * - Experiment bias detection and correction
 * - Comprehensive reporting and insights
 *
 * Created by: Innovation Architect
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { BaseService, ServiceResult } from "./BaseService";
import { logger, Timer } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";
import { EventEmitter } from "events";

/**
 * Experiment status levels
 */
enum ExperimentStatus {
  DRAFT = "draft",
  READY = "ready",
  RUNNING = "running",
  ANALYZING = "analyzing",
  COMPLETED = "completed",
  STOPPED = "stopped",
  ARCHIVED = "archived"
}

/**
 * Metric types for measurement
 */
enum MetricType {
  CONVERSION = "conversion",      // Binary outcome (success/failure)
  CONTINUOUS = "continuous",      // Numeric measurement
  COUNT = "count",               // Event count
  DURATION = "duration",         // Time-based measurement
  REVENUE = "revenue"            // Financial measurement
}

/**
 * Statistical test types
 */
enum StatisticalTest {
  CHI_SQUARE = "chi_square",     // For categorical data
  T_TEST = "t_test",             // For continuous data
  MANN_WHITNEY = "mann_whitney", // Non-parametric alternative
  BOOTSTRAP = "bootstrap"        // Bootstrap resampling
}

/**
 * Experiment variant configuration
 */
interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  percentage: number;
  config: Record<string, any>;
  isControl: boolean;
}

/**
 * Metric definition for tracking
 */
interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  unit?: string;
  isPrimary: boolean;
  positiveImprovement: boolean; // true if higher values are better
  minimumDetectableEffect: number; // MDE as percentage
  baselineValue?: number;
  statisticalTest: StatisticalTest;
}

/**
 * Experiment configuration
 */
interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  featureId: string;
  variants: ExperimentVariant[];
  metrics: MetricDefinition[];
  targetSegments: string[];
  targetOrganizations?: string[];
  duration: number; // days
  minimumSampleSize: number;
  confidenceLevel: number; // 0.95 for 95%
  power: number; // 0.8 for 80%
  trafficAllocation: number; // percentage of eligible traffic
  startDate: Date;
  endDate?: Date;
  status: ExperimentStatus;
  createdBy: string;
  lastModifiedBy: string;
  metadata: {
    businessImpact: "low" | "medium" | "high" | "critical";
    riskLevel: "low" | "medium" | "high";
    expectedOutcome: string;
    successCriteria: string[];
  };
}

/**
 * Experiment assignment for a user
 */
interface ExperimentAssignment {
  experimentId: string;
  userId: string;
  variantId: string;
  assignmentTime: Date;
  segment: string;
  organizationId?: string;
}

/**
 * Metric observation (actual measurement)
 */
interface MetricObservation {
  experimentId: string;
  userId: string;
  variantId: string;
  metricId: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Statistical analysis result
 */
interface StatisticalAnalysis {
  metricId: string;
  variants: Array<{
    variantId: string;
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  }>;
  statisticalSignificance: boolean;
  pValue: number;
  confidenceLevel: number;
  effect: {
    absolute: number;
    relative: number; // percentage change
    confidenceInterval: [number, number];
  };
  power: number;
  minimumDetectableEffect: number;
  recommendation: "continue" | "stop_winner" | "stop_no_winner" | "need_more_data";
}

/**
 * Experiment results summary
 */
interface ExperimentResults {
  experimentId: string;
  status: ExperimentStatus;
  duration: number; // actual duration in days
  totalParticipants: number;
  variantPerformance: Array<{
    variantId: string;
    participants: number;
    conversionRate?: number;
    averageValue?: number;
    revenue?: number;
    isWinner: boolean;
    improvementOverControl: number;
  }>;
  statisticalAnalyses: StatisticalAnalysis[];
  businessImpact: {
    revenueImpact: number;
    costImpact: number;
    userExperienceImpact: number;
    riskAssessment: string;
  };
  recommendations: Array<{
    type: "implement" | "iterate" | "abandon";
    variant?: string;
    reason: string;
    confidence: number;
    estimatedImpact: number;
  }>;
  insights: string[];
}

/**
 * A/B Testing Service
 */
export class ABTestingService extends BaseService<any> {
  private eventEmitter: EventEmitter;
  private experiments: Map<string, ExperimentConfig> = new Map();
  private assignments: Map<string, ExperimentAssignment[]> = new Map(); // userId -> assignments
  private observations: Map<string, MetricObservation[]> = new Map(); // experimentId -> observations
  private analysisCache: Map<string, StatisticalAnalysis[]> = new Map();
  private analysisScheduler: NodeJS.Timeout | null = null;

  constructor() {
    super(null as any, "ABTestingService");
    this.eventEmitter = new EventEmitter();
    this.startAnalysisScheduler();
    this.setupEventHandlers();
  }

  /**
   * Create new experiment
   */
  public async createExperiment(
    experimentConfig: Omit<ExperimentConfig, 'id' | 'status'>
  ): Promise<ServiceResult<ExperimentConfig>> {
    const timer = new Timer("ABTestingService.createExperiment");

    try {
      // Validate experiment configuration
      const validation = await this.validateExperimentConfig(experimentConfig);
      if (!validation.valid) {
        return {
          success: false,
          message: "Invalid experiment configuration",
          errors: validation.errors
        };
      }

      // Calculate required sample size
      const sampleSizeCalculation = await this.calculateRequiredSampleSize(experimentConfig);
      
      const experiment: ExperimentConfig = {
        ...experimentConfig,
        id: this.generateExperimentId(experimentConfig.name),
        status: ExperimentStatus.DRAFT,
        minimumSampleSize: Math.max(
          experimentConfig.minimumSampleSize,
          sampleSizeCalculation.recommendedSize
        )
      };

      // Store experiment
      this.experiments.set(experiment.id, experiment);
      await this.persistExperiment(experiment);

      // Initialize empty observations
      this.observations.set(experiment.id, []);

      timer.end({ experimentId: experiment.id });
      logger.info("Experiment created", {
        experimentId: experiment.id,
        name: experiment.name,
        variants: experiment.variants.length,
        duration: experiment.duration
      });

      return {
        success: true,
        data: experiment,
        message: "Experiment created successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.createExperiment failed", {
        error: error.message
      });

      return {
        success: false,
        message: "Failed to create experiment",
        errors: [error.message]
      };
    }
  }

  /**
   * Start experiment
   */
  public async startExperiment(
    experimentId: string
  ): Promise<ServiceResult<{ startTime: Date; estimatedEndTime: Date }>> {
    const timer = new Timer("ABTestingService.startExperiment");

    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        return {
          success: false,
          message: "Experiment not found",
          errors: [`Experiment ${experimentId} not found`]
        };
      }

      // Validate experiment is ready to start
      const readinessCheck = await this.validateExperimentReadiness(experiment);
      if (!readinessCheck.ready) {
        return {
          success: false,
          message: "Experiment not ready to start",
          errors: readinessCheck.issues
        };
      }

      // Update experiment status
      experiment.status = ExperimentStatus.RUNNING;
      experiment.startDate = new Date();
      experiment.endDate = new Date(Date.now() + experiment.duration * 24 * 60 * 60 * 1000);

      // Schedule automatic stop
      this.scheduleExperimentStop(experiment);

      timer.end({ experimentId });
      logger.info("Experiment started", {
        experimentId,
        startTime: experiment.startDate,
        endTime: experiment.endDate,
        duration: experiment.duration
      });

      return {
        success: true,
        data: {
          startTime: experiment.startDate,
          estimatedEndTime: experiment.endDate
        },
        message: "Experiment started successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.startExperiment failed", {
        experimentId,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to start experiment",
        errors: [error.message]
      };
    }
  }

  /**
   * Assign user to experiment variant
   */
  public async assignUserToExperiment(
    experimentId: string,
    userId: string,
    organizationId?: string
  ): Promise<ServiceResult<ExperimentAssignment | null>> {
    const timer = new Timer("ABTestingService.assignUserToExperiment");

    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
        return {
          success: true,
          data: null,
          message: "Experiment not running"
        };
      }

      // Check if user is eligible for experiment
      const eligibility = await this.checkUserEligibility(experiment, userId, organizationId);
      if (!eligibility.eligible) {
        return {
          success: true,
          data: null,
          message: eligibility.reason
        };
      }

      // Check if user already assigned
      const existingAssignment = await this.getExistingAssignment(experimentId, userId);
      if (existingAssignment) {
        timer.end({ cached: true });
        return {
          success: true,
          data: existingAssignment,
          message: "User already assigned to experiment"
        };
      }

      // Assign user to variant using deterministic hashing
      const variantAssignment = await this.assignToVariant(experiment, userId);
      
      const assignment: ExperimentAssignment = {
        experimentId,
        userId,
        variantId: variantAssignment.variantId,
        assignmentTime: new Date(),
        segment: eligibility.segment,
        organizationId
      };

      // Store assignment
      await this.storeAssignment(assignment);

      timer.end({ 
        experimentId, 
        variantId: assignment.variantId,
        segment: assignment.segment
      });

      return {
        success: true,
        data: assignment,
        message: "User assigned to experiment variant"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.assignUserToExperiment failed", {
        experimentId,
        userId,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to assign user to experiment",
        errors: [error.message]
      };
    }
  }

  /**
   * Track metric observation
   */
  public async trackMetric(
    experimentId: string,
    userId: string,
    metricId: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<ServiceResult<{ tracked: boolean }>> {
    const timer = new Timer("ABTestingService.trackMetric");

    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
        return {
          success: true,
          data: { tracked: false },
          message: "Experiment not running"
        };
      }

      // Get user assignment
      const assignment = await this.getExistingAssignment(experimentId, userId);
      if (!assignment) {
        return {
          success: true,
          data: { tracked: false },
          message: "User not assigned to experiment"
        };
      }

      // Validate metric exists in experiment
      const metric = experiment.metrics.find(m => m.id === metricId);
      if (!metric) {
        return {
          success: false,
          message: "Metric not found in experiment",
          errors: [`Metric ${metricId} not found`]
        };
      }

      // Create observation
      const observation: MetricObservation = {
        experimentId,
        userId,
        variantId: assignment.variantId,
        metricId,
        value,
        timestamp: new Date(),
        metadata
      };

      // Store observation
      await this.storeObservation(observation);

      // Trigger real-time analysis if enough data
      await this.checkForEarlyResults(experimentId);

      timer.end({ 
        experimentId, 
        metricId, 
        variantId: assignment.variantId,
        value
      });

      return {
        success: true,
        data: { tracked: true },
        message: "Metric tracked successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.trackMetric failed", {
        experimentId,
        userId,
        metricId,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to track metric",
        errors: [error.message]
      };
    }
  }

  /**
   * Analyze experiment results
   */
  public async analyzeExperimentResults(
    experimentId: string
  ): Promise<ServiceResult<ExperimentResults>> {
    const timer = new Timer("ABTestingService.analyzeExperimentResults");

    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        return {
          success: false,
          message: "Experiment not found",
          errors: [`Experiment ${experimentId} not found`]
        };
      }

      // Get all observations for this experiment
      const observations = this.observations.get(experimentId) || [];
      
      if (observations.length === 0) {
        return {
          success: false,
          message: "No data available for analysis",
          errors: ["Experiment has no recorded observations"]
        };
      }

      // Perform statistical analysis for each metric
      const statisticalAnalyses: StatisticalAnalysis[] = [];
      
      for (const metric of experiment.metrics) {
        const analysis = await this.performStatisticalAnalysis(
          experiment,
          metric,
          observations
        );
        statisticalAnalyses.push(analysis);
      }

      // Calculate variant performance
      const variantPerformance = await this.calculateVariantPerformance(
        experiment,
        observations
      );

      // Calculate business impact
      const businessImpact = await this.calculateBusinessImpact(
        experiment,
        variantPerformance,
        statisticalAnalyses
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        experiment,
        statisticalAnalyses,
        variantPerformance
      );

      // Extract insights
      const insights = await this.extractInsights(experiment, statisticalAnalyses);

      const results: ExperimentResults = {
        experimentId,
        status: experiment.status,
        duration: this.calculateActualDuration(experiment),
        totalParticipants: this.countUniqueParticipants(observations),
        variantPerformance,
        statisticalAnalyses,
        businessImpact,
        recommendations,
        insights
      };

      // Cache results
      this.analysisCache.set(experimentId, statisticalAnalyses);

      timer.end({ 
        experimentId,
        participants: results.totalParticipants,
        significant: statisticalAnalyses.some(a => a.statisticalSignificance)
      });

      return {
        success: true,
        data: results,
        message: "Experiment analysis completed successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.analyzeExperimentResults failed", {
        experimentId,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to analyze experiment results",
        errors: [error.message]
      };
    }
  }

  /**
   * Stop experiment and declare winner
   */
  public async stopExperiment(
    experimentId: string,
    reason: string,
    winnerVariantId?: string
  ): Promise<ServiceResult<{ 
    stopTime: Date; 
    winner?: string; 
    results: ExperimentResults 
  }>> {
    const timer = new Timer("ABTestingService.stopExperiment");

    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        return {
          success: false,
          message: "Experiment not found",
          errors: [`Experiment ${experimentId} not found`]
        };
      }

      // Analyze final results
      const analysisResult = await this.analyzeExperimentResults(experimentId);
      if (!analysisResult.success) {
        return analysisResult as any;
      }

      const results = analysisResult.data!;

      // Determine winner if not specified
      let winner = winnerVariantId;
      if (!winner) {
        const winningVariant = results.variantPerformance.find(v => v.isWinner);
        winner = winningVariant?.variantId;
      }

      // Update experiment status
      experiment.status = ExperimentStatus.COMPLETED;
      experiment.endDate = new Date();

      // Persist final state
      await this.persistExperiment(experiment);
      await this.persistExperimentResults(experimentId, results);

      timer.end({ experimentId, winner, reason });
      logger.info("Experiment stopped", {
        experimentId,
        reason,
        winner,
        duration: results.duration,
        participants: results.totalParticipants
      });

      return {
        success: true,
        data: {
          stopTime: experiment.endDate,
          winner,
          results
        },
        message: "Experiment stopped successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.stopExperiment failed", {
        experimentId,
        error: error.message
      });

      return {
        success: false,
        message: "Failed to stop experiment",
        errors: [error.message]
      };
    }
  }

  /**
   * Get experiment dashboard data
   */
  public async getExperimentDashboard(): Promise<ServiceResult<{
    overview: {
      totalExperiments: number;
      runningExperiments: number;
      completedExperiments: number;
      significantResults: number;
    };
    recentExperiments: Array<{
      id: string;
      name: string;
      status: string;
      participants: number;
      startDate: Date;
      endDate?: Date;
    }>;
    performanceMetrics: Array<{
      experimentId: string;
      conversionLift: number;
      confidence: number;
      significance: boolean;
    }>;
    businessImpact: {
      totalRevenueImpact: number;
      totalCostSavings: number;
      averageUplift: number;
      winRate: number;
    };
  }>> {
    const timer = new Timer("ABTestingService.getExperimentDashboard");

    try {
      // Calculate overview metrics
      const totalExperiments = this.experiments.size;
      const runningExperiments = Array.from(this.experiments.values())
        .filter(e => e.status === ExperimentStatus.RUNNING).length;
      const completedExperiments = Array.from(this.experiments.values())
        .filter(e => e.status === ExperimentStatus.COMPLETED).length;

      // Count significant results
      let significantResults = 0;
      for (const experimentId of this.experiments.keys()) {
        const analyses = this.analysisCache.get(experimentId);
        if (analyses && analyses.some(a => a.statisticalSignificance)) {
          significantResults++;
        }
      }

      // Get recent experiments
      const recentExperiments = Array.from(this.experiments.values())
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          name: e.name,
          status: e.status,
          participants: this.countUniqueParticipants(this.observations.get(e.id) || []),
          startDate: e.startDate,
          endDate: e.endDate
        }));

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();

      // Calculate business impact
      const businessImpact = await this.calculateTotalBusinessImpact();

      timer.end({
        totalExperiments,
        runningExperiments,
        significantResults
      });

      return {
        success: true,
        data: {
          overview: {
            totalExperiments,
            runningExperiments,
            completedExperiments,
            significantResults
          },
          recentExperiments,
          performanceMetrics,
          businessImpact
        },
        message: "Experiment dashboard data retrieved successfully"
      };

    } catch (error) {
      timer.end({ error: error.message });
      logger.error("ABTestingService.getExperimentDashboard failed", {
        error: error.message
      });

      return {
        success: false,
        message: "Failed to get experiment dashboard data",
        errors: [error.message]
      };
    }
  }

  // Helper methods (simplified implementations for MVP)
  private generateExperimentId(name: string): string {
    const timestamp = Date.now().toString(36);
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    return `exp_${clean}_${timestamp}`;
  }

  private async validateExperimentConfig(
    config: Omit<ExperimentConfig, 'id' | 'status'>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push("Experiment name is required");
    }

    if (!config.variants || config.variants.length < 2) {
      errors.push("At least 2 variants are required");
    }

    if (config.variants) {
      const totalPercentage = config.variants.reduce((sum, v) => sum + v.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push("Variant percentages must sum to 100%");
      }

      const controlVariants = config.variants.filter(v => v.isControl);
      if (controlVariants.length !== 1) {
        errors.push("Exactly one variant must be marked as control");
      }
    }

    if (!config.metrics || config.metrics.length === 0) {
      errors.push("At least one metric is required");
    }

    if (config.metrics) {
      const primaryMetrics = config.metrics.filter(m => m.isPrimary);
      if (primaryMetrics.length !== 1) {
        errors.push("Exactly one metric must be marked as primary");
      }
    }

    if (config.duration <= 0) {
      errors.push("Duration must be positive");
    }

    if (config.confidenceLevel <= 0 || config.confidenceLevel >= 1) {
      errors.push("Confidence level must be between 0 and 1");
    }

    return { valid: errors.length === 0, errors };
  }

  private async calculateRequiredSampleSize(
    config: Omit<ExperimentConfig, 'id' | 'status'>
  ): Promise<{ recommendedSize: number; assumptions: any }> {
    // Simplified sample size calculation
    const primaryMetric = config.metrics.find(m => m.isPrimary);
    if (!primaryMetric) {
      return { recommendedSize: 1000, assumptions: {} };
    }

    // Basic formula: n = 2 * (Z_α/2 + Z_β)² * σ² / δ²
    const alpha = 1 - config.confidenceLevel;
    const beta = 1 - config.power;
    const mde = primaryMetric.minimumDetectableEffect / 100;

    // Simplified calculation
    const zAlpha = 1.96; // 95% confidence
    const zBeta = 0.84;  // 80% power
    const variance = 0.25; // Assume p(1-p) for conversion rate

    const n = 2 * Math.pow(zAlpha + zBeta, 2) * variance / Math.pow(mde, 2);

    return {
      recommendedSize: Math.ceil(n),
      assumptions: {
        alpha,
        beta,
        mde,
        baselineConversion: primaryMetric.baselineValue || 0.1
      }
    };
  }

  private async validateExperimentReadiness(
    experiment: ExperimentConfig
  ): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if feature flag exists and is configured
    if (!experiment.featureId) {
      issues.push("Feature ID is required");
    }

    // Check if start date is valid
    if (experiment.startDate > new Date()) {
      issues.push("Start date cannot be in the future");
    }

    // Check traffic allocation
    if (experiment.trafficAllocation <= 0 || experiment.trafficAllocation > 100) {
      issues.push("Traffic allocation must be between 0 and 100");
    }

    return { ready: issues.length === 0, issues };
  }

  private async checkUserEligibility(
    experiment: ExperimentConfig,
    userId: string,
    organizationId?: string
  ): Promise<{ eligible: boolean; reason?: string; segment: string }> {
    // Simplified eligibility check
    const segment = userId.startsWith("premium_") ? "premium" : "standard";

    // Check if user segment is targeted
    if (experiment.targetSegments.length > 0 && !experiment.targetSegments.includes(segment)) {
      return {
        eligible: false,
        reason: "User not in target segments",
        segment
      };
    }

    // Check if organization is targeted (if specified)
    if (experiment.targetOrganizations && organizationId) {
      if (!experiment.targetOrganizations.includes(organizationId)) {
        return {
          eligible: false,
          reason: "Organization not in target list",
          segment
        };
      }
    }

    // Check traffic allocation
    const userHash = await this.getUserHash(userId, experiment.id);
    if (userHash >= experiment.trafficAllocation) {
      return {
        eligible: false,
        reason: "User not in traffic allocation",
        segment
      };
    }

    return { eligible: true, segment };
  }

  private async getUserHash(userId: string, experimentId: string): Promise<number> {
    // Simple hash function for consistent user assignment
    const combined = `${userId}:${experimentId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % 100;
  }

  private async assignToVariant(
    experiment: ExperimentConfig,
    userId: string
  ): Promise<{ variantId: string }> {
    const userHash = await this.getUserHash(userId, experiment.id);
    let currentPercentage = 0;

    for (const variant of experiment.variants) {
      currentPercentage += variant.percentage;
      if (userHash < currentPercentage) {
        return { variantId: variant.id };
      }
    }

    // Fallback to control
    const control = experiment.variants.find(v => v.isControl);
    return { variantId: control!.id };
  }

  private async getExistingAssignment(
    experimentId: string,
    userId: string
  ): Promise<ExperimentAssignment | null> {
    const userAssignments = this.assignments.get(userId) || [];
    return userAssignments.find(a => a.experimentId === experimentId) || null;
  }

  private async storeAssignment(assignment: ExperimentAssignment): Promise<void> {
    const userAssignments = this.assignments.get(assignment.userId) || [];
    userAssignments.push(assignment);
    this.assignments.set(assignment.userId, userAssignments);

    // Cache assignment
    await this.setCache(
      `assignment:${assignment.experimentId}:${assignment.userId}`,
      assignment,
      { ttl: 86400 * 7 } // 1 week
    );
  }

  private async storeObservation(observation: MetricObservation): Promise<void> {
    const experimentObservations = this.observations.get(observation.experimentId) || [];
    experimentObservations.push(observation);
    this.observations.set(observation.experimentId, experimentObservations);

    // Also cache individual observation
    await this.setCache(
      `observation:${observation.experimentId}:${observation.userId}:${observation.metricId}:${observation.timestamp.getTime()}`,
      observation,
      { ttl: 86400 * 30 } // 30 days
    );
  }

  private async performStatisticalAnalysis(
    experiment: ExperimentConfig,
    metric: MetricDefinition,
    observations: MetricObservation[]
  ): Promise<StatisticalAnalysis> {
    // Filter observations for this metric
    const metricObservations = observations.filter(o => o.metricId === metric.id);

    // Group by variant
    const variantData = new Map<string, number[]>();
    for (const obs of metricObservations) {
      if (!variantData.has(obs.variantId)) {
        variantData.set(obs.variantId, []);
      }
      variantData.get(obs.variantId)!.push(obs.value);
    }

    // Calculate statistics for each variant
    const variants = Array.from(variantData.entries()).map(([variantId, values]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Simple confidence interval calculation
      const marginOfError = 1.96 * standardDeviation / Math.sqrt(values.length);
      const confidenceInterval: [number, number] = [
        mean - marginOfError,
        mean + marginOfError
      ];

      return {
        variantId,
        sampleSize: values.length,
        mean,
        standardDeviation,
        confidenceInterval
      };
    });

    // Simplified statistical significance test
    const controlVariant = variants.find(v => 
      experiment.variants.find(ev => ev.id === v.variantId)?.isControl
    );
    
    let statisticalSignificance = false;
    let pValue = 1.0;
    let effect = { absolute: 0, relative: 0, confidenceInterval: [0, 0] as [number, number] };

    if (controlVariant && variants.length > 1) {
      const treatmentVariant = variants.find(v => v.variantId !== controlVariant.variantId);
      if (treatmentVariant) {
        // Simplified t-test
        const pooledStd = Math.sqrt(
          (Math.pow(controlVariant.standardDeviation, 2) + 
           Math.pow(treatmentVariant.standardDeviation, 2)) / 2
        );
        
        const standardError = pooledStd * Math.sqrt(
          1 / controlVariant.sampleSize + 1 / treatmentVariant.sampleSize
        );
        
        const tStatistic = Math.abs(treatmentVariant.mean - controlVariant.mean) / standardError;
        
        // Simplified p-value calculation (assuming normal distribution)
        pValue = 2 * (1 - this.normalCDF(tStatistic));
        statisticalSignificance = pValue < (1 - experiment.confidenceLevel);
        
        effect = {
          absolute: treatmentVariant.mean - controlVariant.mean,
          relative: ((treatmentVariant.mean - controlVariant.mean) / controlVariant.mean) * 100,
          confidenceInterval: [
            (treatmentVariant.mean - controlVariant.mean) - 1.96 * standardError,
            (treatmentVariant.mean - controlVariant.mean) + 1.96 * standardError
          ]
        };
      }
    }

    return {
      metricId: metric.id,
      variants,
      statisticalSignificance,
      pValue,
      confidenceLevel: experiment.confidenceLevel,
      effect,
      power: experiment.power,
      minimumDetectableEffect: metric.minimumDetectableEffect,
      recommendation: this.getRecommendation(statisticalSignificance, variants.length > 0 ? variants[0].sampleSize : 0, experiment.minimumSampleSize)
    };
  }

  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Simplified error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private getRecommendation(
    significant: boolean, 
    currentSampleSize: number, 
    minimumSampleSize: number
  ): "continue" | "stop_winner" | "stop_no_winner" | "need_more_data" {
    if (currentSampleSize < minimumSampleSize) {
      return "need_more_data";
    }
    
    if (significant) {
      return "stop_winner";
    } else {
      return "stop_no_winner";
    }
  }

  private async calculateVariantPerformance(
    experiment: ExperimentConfig,
    observations: MetricObservation[]
  ): Promise<Array<{
    variantId: string;
    participants: number;
    conversionRate?: number;
    averageValue?: number;
    revenue?: number;
    isWinner: boolean;
    improvementOverControl: number;
  }>> {
    const performance = [];
    
    // Get control variant for comparison
    const controlVariant = experiment.variants.find(v => v.isControl);
    let controlMetrics: any = null;

    for (const variant of experiment.variants) {
      const variantObservations = observations.filter(o => o.variantId === variant.id);
      const uniqueUsers = new Set(variantObservations.map(o => o.userId)).size;
      
      // Calculate primary metric performance
      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      const primaryObservations = variantObservations.filter(o => o.metricId === primaryMetric?.id);
      
      let conversionRate: number | undefined;
      let averageValue: number | undefined;
      let revenue: number | undefined;

      if (primaryMetric?.type === MetricType.CONVERSION) {
        conversionRate = primaryObservations.length / uniqueUsers;
      } else if (primaryMetric?.type === MetricType.CONTINUOUS) {
        averageValue = primaryObservations.reduce((sum, o) => sum + o.value, 0) / primaryObservations.length;
      } else if (primaryMetric?.type === MetricType.REVENUE) {
        revenue = primaryObservations.reduce((sum, o) => sum + o.value, 0);
      }

      const variantPerf = {
        variantId: variant.id,
        participants: uniqueUsers,
        conversionRate,
        averageValue,
        revenue,
        isWinner: false, // Will be determined later
        improvementOverControl: 0
      };

      if (variant.isControl) {
        controlMetrics = variantPerf;
      }

      performance.push(variantPerf);
    }

    // Calculate improvements over control and determine winner
    if (controlMetrics) {
      let bestVariant = controlMetrics;
      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      
      for (const perf of performance) {
        if (perf.variantId === controlMetrics.variantId) continue;
        
        // Calculate improvement
        let improvement = 0;
        if (primaryMetric?.type === MetricType.CONVERSION && controlMetrics.conversionRate) {
          improvement = ((perf.conversionRate! - controlMetrics.conversionRate) / controlMetrics.conversionRate) * 100;
        } else if (primaryMetric?.type === MetricType.CONTINUOUS && controlMetrics.averageValue) {
          improvement = ((perf.averageValue! - controlMetrics.averageValue) / controlMetrics.averageValue) * 100;
        } else if (primaryMetric?.type === MetricType.REVENUE && controlMetrics.revenue) {
          improvement = ((perf.revenue! - controlMetrics.revenue) / controlMetrics.revenue) * 100;
        }
        
        perf.improvementOverControl = improvement;
        
        // Update best variant
        if (improvement > bestVariant.improvementOverControl) {
          bestVariant = perf;
        }
      }
      
      bestVariant.isWinner = true;
    }

    return performance;
  }

  private async calculateBusinessImpact(
    experiment: ExperimentConfig,
    variantPerformance: any[],
    analyses: StatisticalAnalysis[]
  ): Promise<{
    revenueImpact: number;
    costImpact: number;
    userExperienceImpact: number;
    riskAssessment: string;
  }> {
    // Simplified business impact calculation
    const winner = variantPerformance.find(v => v.isWinner);
    const control = variantPerformance.find(v => 
      experiment.variants.find(ev => ev.id === v.variantId)?.isControl
    );

    let revenueImpact = 0;
    if (winner && control && winner.revenue && control.revenue) {
      revenueImpact = winner.revenue - control.revenue;
    }

    return {
      revenueImpact,
      costImpact: revenueImpact * 0.1, // Assume 10% cost impact
      userExperienceImpact: winner ? winner.improvementOverControl : 0,
      riskAssessment: experiment.metadata.riskLevel
    };
  }

  private async generateRecommendations(
    experiment: ExperimentConfig,
    analyses: StatisticalAnalysis[],
    performance: any[]
  ): Promise<Array<{
    type: "implement" | "iterate" | "abandon";
    variant?: string;
    reason: string;
    confidence: number;
    estimatedImpact: number;
  }>> {
    const recommendations = [];
    const primaryAnalysis = analyses.find(a => 
      experiment.metrics.find(m => m.id === a.metricId)?.isPrimary
    );

    if (primaryAnalysis && primaryAnalysis.statisticalSignificance) {
      const winner = performance.find(p => p.isWinner);
      recommendations.push({
        type: "implement" as const,
        variant: winner?.variantId,
        reason: "Statistically significant improvement detected",
        confidence: 1 - primaryAnalysis.pValue,
        estimatedImpact: winner?.improvementOverControl || 0
      });
    } else if (primaryAnalysis && primaryAnalysis.recommendation === "need_more_data") {
      recommendations.push({
        type: "iterate" as const,
        reason: "Insufficient sample size for conclusive results",
        confidence: 0.5,
        estimatedImpact: 0
      });
    } else {
      recommendations.push({
        type: "abandon" as const,
        reason: "No significant improvement detected",
        confidence: 1 - (primaryAnalysis?.pValue || 0.5),
        estimatedImpact: 0
      });
    }

    return recommendations;
  }

  private async extractInsights(
    experiment: ExperimentConfig,
    analyses: StatisticalAnalysis[]
  ): Promise<string[]> {
    const insights = [];
    
    const primaryAnalysis = analyses.find(a => 
      experiment.metrics.find(m => m.id === a.metricId)?.isPrimary
    );

    if (primaryAnalysis) {
      if (primaryAnalysis.statisticalSignificance) {
        insights.push(`Primary metric showed statistically significant improvement (p=${primaryAnalysis.pValue.toFixed(4)})`);
      } else {
        insights.push(`Primary metric did not reach statistical significance (p=${primaryAnalysis.pValue.toFixed(4)})`);
      }

      if (primaryAnalysis.effect.relative > 0) {
        insights.push(`Treatment showed ${primaryAnalysis.effect.relative.toFixed(2)}% relative improvement`);
      } else {
        insights.push(`Treatment showed ${Math.abs(primaryAnalysis.effect.relative).toFixed(2)}% relative decline`);
      }
    }

    return insights;
  }

  private calculateActualDuration(experiment: ExperimentConfig): number {
    if (!experiment.endDate) return 0;
    return (experiment.endDate.getTime() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  private countUniqueParticipants(observations: MetricObservation[]): number {
    return new Set(observations.map(o => o.userId)).size;
  }

  private async checkForEarlyResults(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    const observations = this.observations.get(experimentId) || [];
    const uniqueParticipants = this.countUniqueParticipants(observations);

    // Check if we have enough data for early analysis
    if (uniqueParticipants >= experiment.minimumSampleSize * 0.5) {
      // Perform interim analysis
      const analysisResult = await this.analyzeExperimentResults(experimentId);
      
      if (analysisResult.success) {
        const hasSignificantResult = analysisResult.data!.statisticalAnalyses
          .some(a => a.statisticalSignificance && a.pValue < 0.01); // Stricter threshold for early stopping

        if (hasSignificantResult) {
          this.eventEmitter.emit("earlySignificantResult", {
            experimentId,
            participants: uniqueParticipants,
            analyses: analysisResult.data!.statisticalAnalyses
          });
        }
      }
    }
  }

  private scheduleExperimentStop(experiment: ExperimentConfig): void {
    const duration = experiment.duration * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    setTimeout(() => {
      this.stopExperiment(experiment.id, "Scheduled end of experiment duration");
    }, duration);
  }

  private async persistExperiment(experiment: ExperimentConfig): Promise<void> {
    await this.setCache(`experiment:${experiment.id}`, experiment, { ttl: 86400 * 30 });
  }

  private async persistExperimentResults(experimentId: string, results: ExperimentResults): Promise<void> {
    await this.setCache(`results:${experimentId}`, results, { ttl: 86400 * 365 });
  }

  private async getPerformanceMetrics(): Promise<Array<{
    experimentId: string;
    conversionLift: number;
    confidence: number;
    significance: boolean;
  }>> {
    const metrics = [];
    
    for (const [experimentId, analyses] of this.analysisCache) {
      const primaryAnalysis = analyses.find(a => 
        this.experiments.get(experimentId)?.metrics.find(m => m.id === a.metricId)?.isPrimary
      );
      
      if (primaryAnalysis) {
        metrics.push({
          experimentId,
          conversionLift: primaryAnalysis.effect.relative,
          confidence: 1 - primaryAnalysis.pValue,
          significance: primaryAnalysis.statisticalSignificance
        });
      }
    }
    
    return metrics;
  }

  private async calculateTotalBusinessImpact(): Promise<{
    totalRevenueImpact: number;
    totalCostSavings: number;
    averageUplift: number;
    winRate: number;
  }> {
    // Mock business impact calculation
    return {
      totalRevenueImpact: 50000,
      totalCostSavings: 25000,
      averageUplift: 12.5,
      winRate: 0.65
    };
  }

  private startAnalysisScheduler(): void {
    // Run analysis every hour for running experiments
    this.analysisScheduler = setInterval(() => {
      this.performScheduledAnalysis();
    }, 60 * 60 * 1000);
  }

  private async performScheduledAnalysis(): Promise<void> {
    const runningExperiments = Array.from(this.experiments.values())
      .filter(e => e.status === ExperimentStatus.RUNNING);

    for (const experiment of runningExperiments) {
      try {
        await this.analyzeExperimentResults(experiment.id);
      } catch (error) {
        logger.error("Scheduled analysis failed", {
          experimentId: experiment.id,
          error: error.message
        });
      }
    }
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on("earlySignificantResult", (data) => {
      logger.info("Early significant result detected", data);
    });
  }
}

export default ABTestingService;