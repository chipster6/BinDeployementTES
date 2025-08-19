/**
 * ============================================================================
 * ML MODEL MANAGEMENT SERVICE INTERFACE
 * ============================================================================
 * 
 * Interface for ML model lifecycle management including deployment, training,
 * versioning, and performance monitoring.
 * 
 * Hub Authority Requirements:
 * - <30 second model deployment time
 * - Model versioning and rollback capabilities
 * - Training job management and monitoring
 */

/**
 * ML Model configuration and metadata
 */
export interface MLModel {
  modelId: string;
  name: string;
  type: string;
  version: string;
  description: string;
  targetVariable: string;
  features: string[];
  hyperparameters: Record<string, any>;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    mse?: number;
    mae?: number;
  };
  trainingConfig: {
    windowSize: number;
    retrainInterval: number;
    validationSplit: number;
    crossValidationFolds: number;
  };
  deploymentInfo: {
    deployedAt: Date;
    deploymentTime: number; // seconds
    status: "active" | "inactive" | "deprecated";
    endpoint?: string;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
  lastTrained: Date;
  nextRetraining: Date;
  isActive: boolean;
}

/**
 * Model deployment result
 */
export interface DeploymentResult {
  success: boolean;
  modelId: string;
  version: string;
  deploymentTime: number; // seconds
  endpoint?: string;
  message: string;
  rollbackInfo?: {
    previousVersion: string;
    rollbackAvailable: boolean;
  };
}

/**
 * Training job configuration
 */
export interface TrainingJobConfig {
  modelId: string;
  dataSource: {
    type: "historical" | "stream" | "file";
    params: Record<string, any>;
  };
  hyperparameterTuning: boolean;
  validationStrategy: "holdout" | "cross_validation" | "time_series_split";
  resourceLimits: {
    maxMemory: number;
    maxCpu: number;
    maxDuration: number; // seconds
  };
}

/**
 * Training job status and metrics
 */
export interface TrainingJob {
  jobId: string;
  modelId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  currentEpoch?: number;
  totalEpochs?: number;
  metrics: {
    samplesProcessed: number;
    totalSamples: number;
    currentAccuracy?: number;
    validationAccuracy?: number;
    loss?: number;
    estimatedCompletion: Date;
  };
  resourceUsage: {
    memory: number;
    cpu: number;
    gpu?: number;
  };
  error?: string;
  logs?: string[];
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  modelId: string;
  version: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  predictionCount: number;
  driftMetrics: {
    dataDrift: number;
    conceptDrift: number;
    performanceDrift: number;
  };
}

/**
 * ML Model Management Service Interface
 * Hub Authority Requirement: Model lifecycle management with <30s deployment
 */
export interface IMLModelManager {
  /**
   * Deploy ML model to production environment
   * Hub Requirement: <30 second deployment time
   */
  deployModel(model: MLModel): Promise<DeploymentResult>;

  /**
   * Rollback to previous model version
   * Hub Requirement: Fast rollback capability for production issues
   */
  rollbackModel(modelId: string, targetVersion?: string): Promise<DeploymentResult>;

  /**
   * Start model training job
   * Hub Requirement: Asynchronous training with progress monitoring
   */
  startTrainingJob(config: TrainingJobConfig): Promise<string>; // Returns jobId

  /**
   * Get training job status and progress
   * Hub Requirement: Real-time training progress monitoring
   */
  getTrainingJobStatus(jobId: string): Promise<TrainingJob>;

  /**
   * Cancel running training job
   * Hub Requirement: Training job cancellation capability
   */
  cancelTrainingJob(jobId: string): Promise<boolean>;

  /**
   * Get model performance metrics
   * Hub Requirement: Model performance monitoring and drift detection
   */
  getModelPerformance(modelId: string, period?: { start: Date; end: Date }): Promise<ModelPerformance>;

  /**
   * List all models with filtering
   * Hub Requirement: Model inventory management
   */
  listModels(filters?: {
    status?: "active" | "inactive" | "deprecated";
    type?: string;
    performance?: { minAccuracy: number };
  }): Promise<MLModel[]>;

  /**
   * Update model configuration
   * Hub Requirement: Model configuration management
   */
  updateModelConfig(modelId: string, config: Partial<MLModel>): Promise<MLModel>;

  /**
   * Delete model and cleanup resources
   * Hub Requirement: Model lifecycle cleanup
   */
  deleteModel(modelId: string, force?: boolean): Promise<boolean>;

  /**
   * Get model deployment health status
   * Hub Requirement: Health monitoring for deployed models
   */
  getModelHealth(modelId: string): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    errorRate: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
    lastCheck: Date;
  }>;
}