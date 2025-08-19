/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ML MODEL METADATA
 * ============================================================================
 *
 * ML model metadata storage following enterprise patterns.
 * Integrates with existing database architecture and audit logging.
 *
 * Created by: System Architecture Lead
 * Coordination: Database Architect + Innovation Architect
 * Date: 2025-08-16
 * Version: 1.0.0 - MLOps Database Integration
 */

import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  NonAttribute,
  Association,
} from "sequelize";
import { database } from "@/config/database";
import { User } from "./User";

/**
 * ML Model metadata interface
 */
export interface MLModelAttributes {
  id: string;
  modelId: string;
  name: string;
  version: string;
  modelType: 'vector_search' | 'route_optimization' | 'forecasting' | 'llm_assistant' | 'churn_prediction' | 'maintenance_prediction';
  status: 'training' | 'ready' | 'deprecated' | 'failed' | 'pending_deployment';
  
  // Model configuration
  config: {
    hyperparameters: Record<string, any>;
    trainingConfig: Record<string, any>;
    deploymentConfig: Record<string, any>;
  };
  
  // Performance metrics
  metrics: {
    accuracy: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    latency: number;
    throughput: number;
    errorRate: number;
  };
  
  // Training metadata
  training: {
    datasetSize: number;
    trainingDuration: number;
    validationSplit: number;
    testSplit: number;
    trainingJobId?: string;
    trainingLogs?: string[];
  };
  
  // Deployment metadata
  deployment: {
    deployedAt?: Date;
    deploymentEnvironment: 'development' | 'staging' | 'production';
    infrastructureConfig: Record<string, any>;
    endpointUrl?: string;
    scalingConfig?: Record<string, any>;
  };
  
  // Feature tracking
  features: {
    inputFeatures: string[];
    outputSchema: Record<string, any>;
    featureImportance?: Record<string, number>;
    featureValidation: Record<string, any>;
  };
  
  // Model versioning
  versioning: {
    parentVersionId?: string;
    isProduction: boolean;
    promotedAt?: Date;
    rollbackVersion?: string;
    changeLog: string[];
  };
  
  // Monitoring and maintenance
  monitoring: {
    driftDetection: boolean;
    alertThresholds: Record<string, number>;
    lastHealthCheck: Date;
    maintenanceSchedule?: string;
  };
  
  // Audit fields
  createdBy: ForeignKey<User['id']>;
  updatedBy?: ForeignKey<User['id']>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * ML Model metadata model
 */
export class MLModel extends Model<
  InferAttributes<MLModel>,
  InferCreationAttributes<MLModel>
> {
  // Primary key
  declare id: CreationOptional<string>;
  
  // Model identification
  declare modelId: string;
  declare name: string;
  declare version: string;
  declare modelType: 'vector_search' | 'route_optimization' | 'forecasting' | 'llm_assistant' | 'churn_prediction' | 'maintenance_prediction';
  declare status: 'training' | 'ready' | 'deprecated' | 'failed' | 'pending_deployment';
  
  // Model configuration (JSON field)
  declare config: {
    hyperparameters: Record<string, any>;
    trainingConfig: Record<string, any>;
    deploymentConfig: Record<string, any>;
  };
  
  // Performance metrics (JSON field)
  declare metrics: {
    accuracy: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    latency: number;
    throughput: number;
    errorRate: number;
  };
  
  // Training metadata (JSON field)
  declare training: {
    datasetSize: number;
    trainingDuration: number;
    validationSplit: number;
    testSplit: number;
    trainingJobId?: string;
    trainingLogs?: string[];
  };
  
  // Deployment metadata (JSON field)
  declare deployment: {
    deployedAt?: Date;
    deploymentEnvironment: 'development' | 'staging' | 'production';
    infrastructureConfig: Record<string, any>;
    endpointUrl?: string;
    scalingConfig?: Record<string, any>;
  };
  
  // Feature tracking (JSON field)
  declare features: {
    inputFeatures: string[];
    outputSchema: Record<string, any>;
    featureImportance?: Record<string, number>;
    featureValidation: Record<string, any>;
  };
  
  // Model versioning (JSON field)
  declare versioning: {
    parentVersionId?: string;
    isProduction: boolean;
    promotedAt?: Date;
    rollbackVersion?: string;
    changeLog: string[];
  };
  
  // Monitoring and maintenance (JSON field)
  declare monitoring: {
    driftDetection: boolean;
    alertThresholds: Record<string, number>;
    lastHealthCheck: Date;
    maintenanceSchedule?: string;
  };
  
  // Foreign keys
  declare createdBy: ForeignKey<User['id']>;
  declare updatedBy: CreationOptional<ForeignKey<User['id']>>;
  
  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
  
  // Associations
  declare creator?: NonAttribute<User>;
  declare updater?: NonAttribute<User>;
  declare predictions?: NonAttribute<MLPrediction[]>;
  declare trainingJobs?: NonAttribute<MLTrainingJob[]>;
  
  // Association declarations
  declare static associations: {
    creator: Association<MLModel, User>;
    updater: Association<MLModel, User>;
    predictions: Association<MLModel, MLPrediction>;
    trainingJobs: Association<MLModel, MLTrainingJob>;
  };
  
  // Instance methods
  
  /**
   * Check if model is ready for production deployment
   */
  isReadyForProduction(): boolean {
    return (
      this.status === 'ready' &&
      this.metrics.accuracy >= 0.85 &&
      this.metrics.errorRate <= 0.05 &&
      this.deployment.deploymentEnvironment !== 'development'
    );
  }
  
  /**
   * Get model performance summary
   */
  getPerformanceSummary(): Record<string, any> {
    return {
      modelId: this.modelId,
      version: this.version,
      accuracy: this.metrics.accuracy,
      latency: this.metrics.latency,
      throughput: this.metrics.throughput,
      errorRate: this.metrics.errorRate,
      status: this.status,
      lastHealthCheck: this.monitoring.lastHealthCheck,
      isProduction: this.versioning.isProduction
    };
  }
  
  /**
   * Update model metrics
   */
  async updateMetrics(newMetrics: Partial<MLModelAttributes['metrics']>): Promise<void> {
    this.metrics = {
      ...this.metrics,
      ...newMetrics
    };
    
    // Update health check timestamp
    this.monitoring = {
      ...this.monitoring,
      lastHealthCheck: new Date()
    };
    
    await this.save();
  }
  
  /**
   * Promote model to production
   */
  async promoteToProduction(userId: string): Promise<void> {
    if (!this.isReadyForProduction()) {
      throw new Error('Model is not ready for production deployment');
    }
    
    this.versioning = {
      ...this.versioning,
      isProduction: true,
      promotedAt: new Date()
    };
    
    this.updatedBy = userId;
    await this.save();
  }
  
  /**
   * Create model rollback point
   */
  async createRollbackPoint(): Promise<void> {
    this.versioning = {
      ...this.versioning,
      rollbackVersion: this.version,
      changeLog: [
        ...this.versioning.changeLog,
        `Rollback point created at ${new Date().toISOString()}`
      ]
    };
    
    await this.save();
  }
}

/**
 * ML Prediction log model for tracking inference requests
 */
export class MLPrediction extends Model<
  InferAttributes<MLPrediction>,
  InferCreationAttributes<MLPrediction>
> {
  declare id: CreationOptional<string>;
  declare modelId: ForeignKey<MLModel['id']>;
  declare requestId: string;
  
  // Request data
  declare inputFeatures: Record<string, any>;
  declare prediction: Record<string, any>;
  declare confidence: number;
  
  // Performance metrics
  declare latency: number;
  declare fromCache: boolean;
  declare fallbackUsed: boolean;
  
  // Context
  declare userId?: ForeignKey<User['id']>;
  declare sessionId?: string;
  declare clientIP?: string;
  declare userAgent?: string;
  
  // Feedback (for model improvement)
  declare actualOutcome?: Record<string, any>;
  declare feedbackScore?: number;
  declare feedbackComments?: string;
  
  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare model?: NonAttribute<MLModel>;
  declare user?: NonAttribute<User>;
}

/**
 * ML Training Job model for tracking training processes
 */
export class MLTrainingJob extends Model<
  InferAttributes<MLTrainingJob>,
  InferCreationAttributes<MLTrainingJob>
> {
  declare id: CreationOptional<string>;
  declare modelId: ForeignKey<MLModel['id']>;
  declare jobId: string;
  
  // Job configuration
  declare config: {
    datasetPath: string;
    hyperparameters: Record<string, any>;
    trainingConfig: Record<string, any>;
    resourceConfig: Record<string, any>;
  };
  
  // Job status
  declare status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  declare progress: number; // 0-100
  
  // Results
  declare metrics?: {
    trainingAccuracy: number;
    validationAccuracy: number;
    trainingLoss: number;
    validationLoss: number;
    epochs: number;
    duration: number;
  };
  
  // Infrastructure
  declare infrastructure: {
    gpuInstances: number;
    cpuCores: number;
    memoryGB: number;
    cost: number;
  };
  
  // Logs and artifacts
  declare logs?: string[];
  declare artifacts?: {
    modelPath: string;
    checkpointPath?: string;
    metricsPath?: string;
    logPath?: string;
  };
  
  // Error information
  declare errorMessage?: string;
  declare errorDetails?: Record<string, any>;
  
  // Timestamps
  declare startedAt?: Date;
  declare completedAt?: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  
  // Associations
  declare model?: NonAttribute<MLModel>;
}

/**
 * Initialize ML Model metadata table
 */
MLModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: false, // Allow multiple versions of same model
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    modelType: {
      type: DataTypes.ENUM(
        'vector_search',
        'route_optimization', 
        'forecasting',
        'llm_assistant',
        'churn_prediction',
        'maintenance_prediction'
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'training',
        'ready',
        'deprecated',
        'failed',
        'pending_deployment'
      ),
      allowNull: false,
      defaultValue: 'training',
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        hyperparameters: {},
        trainingConfig: {},
        deploymentConfig: {}
      },
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        accuracy: 0,
        latency: 0,
        throughput: 0,
        errorRate: 0
      },
    },
    training: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        datasetSize: 0,
        trainingDuration: 0,
        validationSplit: 0.2,
        testSplit: 0.1
      },
    },
    deployment: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        deploymentEnvironment: 'development',
        infrastructureConfig: {}
      },
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        inputFeatures: [],
        outputSchema: {},
        featureValidation: {}
      },
    },
    versioning: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        isProduction: false,
        changeLog: []
      },
    },
    monitoring: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        driftDetection: true,
        alertThresholds: {},
        lastHealthCheck: new Date()
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: database,
    modelName: "MLModel",
    tableName: "ml_models",
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['modelId', 'version'],
        unique: true,
        name: 'ml_models_model_version_unique'
      },
      {
        fields: ['modelType', 'status'],
        name: 'ml_models_type_status_idx'
      },
      {
        fields: ['versioning'],
        using: 'gin',
        name: 'ml_models_versioning_gin_idx'
      },
      {
        fields: ['metrics'],
        using: 'gin',
        name: 'ml_models_metrics_gin_idx'
      },
      {
        fields: ['createdAt'],
        name: 'ml_models_created_at_idx'
      }
    ],
    hooks: {
      beforeSave: async (model: MLModel) => {
        // Update monitoring health check on save
        if (model.changed('metrics') || model.changed('status')) {
          model.monitoring = {
            ...model.monitoring,
            lastHealthCheck: new Date()
          };
        }
      }
    }
  }
);

/**
 * Initialize ML Prediction log table
 */
MLPrediction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: MLModel,
        key: 'id',
      },
    },
    requestId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    inputFeatures: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    prediction: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
    },
    latency: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fromCache: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fallbackUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    clientIP: {
      type: DataTypes.INET,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    actualOutcome: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    feedbackScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    feedbackComments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    modelName: "MLPrediction",
    tableName: "ml_predictions",
    timestamps: true,
    indexes: [
      {
        fields: ['modelId', 'createdAt'],
        name: 'ml_predictions_model_created_idx'
      },
      {
        fields: ['userId', 'createdAt'],
        name: 'ml_predictions_user_created_idx'
      },
      {
        fields: ['inputFeatures'],
        using: 'gin',
        name: 'ml_predictions_input_gin_idx'
      },
      {
        fields: ['prediction'],
        using: 'gin',
        name: 'ml_predictions_output_gin_idx'
      }
    ]
  }
);

/**
 * Initialize ML Training Job table
 */
MLTrainingJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: MLModel,
        key: 'id',
      },
    },
    jobId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    infrastructure: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    logs: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    artifacts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    modelName: "MLTrainingJob",
    tableName: "ml_training_jobs",
    timestamps: true,
    indexes: [
      {
        fields: ['modelId', 'status'],
        name: 'ml_training_jobs_model_status_idx'
      },
      {
        fields: ['jobId'],
        unique: true,
        name: 'ml_training_jobs_job_id_unique'
      },
      {
        fields: ['status', 'createdAt'],
        name: 'ml_training_jobs_status_created_idx'
      }
    ]
  }
);

// Define associations
MLModel.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
MLModel.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });
MLModel.hasMany(MLPrediction, { as: 'predictions', foreignKey: 'modelId' });
MLModel.hasMany(MLTrainingJob, { as: 'trainingJobs', foreignKey: 'modelId' });

MLPrediction.belongsTo(MLModel, { as: 'model', foreignKey: 'modelId' });
MLPrediction.belongsTo(User, { as: 'user', foreignKey: 'userId' });

MLTrainingJob.belongsTo(MLModel, { as: 'model', foreignKey: 'modelId' });

export { MLModel, MLPrediction, MLTrainingJob };