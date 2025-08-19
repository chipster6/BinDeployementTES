/**
 * ============================================================================
 * ERROR PREDICTION ENGINE SERVICE INTERFACE
 * ============================================================================
 * 
 * Interface for the core error prediction engine responsible for generating
 * predictions with 85%+ accuracy using ensemble ML models.
 * 
 * Hub Authority Requirements:
 * - <100ms prediction response time
 * - 85%+ accuracy ensemble predictions
 * - Confidence scoring and trend analysis
 */

import { BusinessImpact, SystemLayer } from "../../services/ErrorOrchestrationService";

/**
 * Prediction context for ML models
 */
export interface PredictionContext {
  predictionWindow: {
    start: Date;
    end: Date;
  };
  systemLayer?: SystemLayer;
  features: Record<string, number>;
  historicalData: any[];
  businessContext?: {
    campaignActive?: boolean;
    maintenanceScheduled?: boolean;
    highTrafficExpected?: boolean;
    criticalPeriod?: boolean;
  };
}

/**
 * Error prediction result from ensemble models
 */
export interface ErrorPredictionResult {
  predictionId: string;
  timestamp: Date;
  predictionWindow: {
    start: Date;
    end: Date;
  };
  predictions: {
    errorCount: {
      predicted: number;
      confidence: string;
      confidenceScore: number;
      trend: "increasing" | "decreasing" | "stable";
    };
    errorRate: {
      predicted: number;
      confidence: string;
      confidenceScore: number;
      threshold: number;
    };
    businessImpact: {
      predicted: BusinessImpact;
      confidence: string;
      revenueAtRisk: number;
      customersAffected: number;
    };
    systemHealth: {
      overallHealth: "healthy" | "degraded" | "critical" | "emergency";
      systemPredictions: Record<SystemLayer, {
        health: "healthy" | "degraded" | "critical";
        errorProbability: number;
        confidence: number;
      }>;
    };
  };
  modelContributions: Record<string, number>;
  executionTime: number;
  dataQuality: number;
  featureImportance: Record<string, number>;
}

/**
 * Accuracy metrics for model validation
 */
export interface AccuracyMetrics {
  overall: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  byModel: Record<string, {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sampleSize: number;
  }>;
  trends: {
    accuracyTrend: "improving" | "stable" | "declining";
    confidenceTrend: "improving" | "stable" | "declining";
  };
}

/**
 * Test data for accuracy validation
 */
export interface TestData {
  features: any[];
  expectedOutcomes: any[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Error Prediction Engine Service Interface
 * Hub Authority Requirement: Core prediction engine with <100ms response time
 */
export interface IErrorPredictionEngine {
  /**
   * Generate error prediction using ensemble ML models
   * Hub Requirement: <100ms response time with 85%+ accuracy
   */
  generatePrediction(context: PredictionContext): Promise<ErrorPredictionResult>;

  /**
   * Update prediction model weights and configurations
   * Hub Requirement: Dynamic model weight adjustment for accuracy optimization
   */
  updatePredictionModel(modelData: any): Promise<void>;

  /**
   * Validate prediction accuracy against test data
   * Hub Requirement: Continuous accuracy monitoring and validation
   */
  validatePredictionAccuracy(testData: TestData): Promise<AccuracyMetrics>;

  /**
   * Get real-time prediction performance metrics
   * Hub Requirement: Performance monitoring for <100ms response time
   */
  getPredictionPerformance(): Promise<{
    averageResponseTime: number;
    accuracy: number;
    throughput: number;
    cacheHitRate: number;
  }>;

  /**
   * Batch prediction for multiple contexts
   * Hub Requirement: Batch processing for efficiency
   */
  generateBatchPredictions(contexts: PredictionContext[]): Promise<ErrorPredictionResult[]>;
}