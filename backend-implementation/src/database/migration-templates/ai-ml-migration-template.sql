/**
 * ============================================================================
 * AI/ML DATABASE ENHANCEMENT MIGRATION TEMPLATE
 * ============================================================================
 *
 * Template for creating AI/ML database migrations with vector storage,
 * machine learning model metadata, feature stores, and training pipelines.
 *
 * Migration: {MIGRATION_ID}
 * Description: {MIGRATION_DESCRIPTION}
 * Type: ai_ml
 * Dependencies: {DEPENDENCIES}
 * Created by: Database-Architect
 * Date: {DATE}
 * Version: 1.0.0
 */

-- Migration Metadata
-- Migration Type: ai_ml
-- Estimated Duration: {ESTIMATED_DURATION} seconds
-- Requires Downtime: {REQUIRES_DOWNTIME}
-- Backup Required: true
-- Post Migration Validation: true

-- ============================================================================
-- MIGRATION UP
-- ============================================================================

BEGIN;

-- Enable vector extension for AI/ML operations
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text similarity

-- Create AI/ML schema for organization
CREATE SCHEMA IF NOT EXISTS ml;

-- ML Models registry table
CREATE TABLE IF NOT EXISTS ml.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  version VARCHAR(50) NOT NULL,
  model_type VARCHAR(100) NOT NULL, -- 'classification', 'regression', 'clustering', 'embedding'
  algorithm VARCHAR(100) NOT NULL, -- 'xgboost', 'neural_network', 'linear_regression', etc.
  
  -- Model metadata
  description TEXT,
  training_dataset_info JSONB,
  hyperparameters JSONB,
  feature_columns TEXT[],
  target_column VARCHAR(255),
  
  -- Performance metrics
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  mae DECIMAL(10,4), -- Mean Absolute Error
  rmse DECIMAL(10,4), -- Root Mean Square Error
  training_loss DECIMAL(10,6),
  validation_loss DECIMAL(10,6),
  
  -- Model files and storage
  model_file_path TEXT,
  model_file_size BIGINT,
  model_checksum VARCHAR(64),
  
  -- Deployment information
  status VARCHAR(50) DEFAULT 'training', -- 'training', 'ready', 'deployed', 'deprecated'
  deployment_environment VARCHAR(50),
  api_endpoint TEXT,
  
  -- Training information
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  training_duration_seconds INTEGER,
  training_samples_count INTEGER,
  validation_samples_count INTEGER,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT unique_model_version UNIQUE (name, version)
);

-- Indexes for ML models
CREATE INDEX idx_ml_models_type_status ON ml.models (model_type, status);
CREATE INDEX idx_ml_models_name_version ON ml.models (name, version DESC);
CREATE INDEX idx_ml_models_status ON ml.models (status, updated_at DESC);

-- Vector embeddings table for semantic search and similarity
CREATE TABLE IF NOT EXISTS ml.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL, -- 'customer', 'route', 'bin', 'service_event'
  entity_id UUID NOT NULL,
  
  -- Vector data (using pgvector extension)
  embedding VECTOR(512) NOT NULL, -- 512-dimensional embedding vector
  embedding_model VARCHAR(100) NOT NULL, -- Model used to generate embedding
  embedding_version VARCHAR(50) NOT NULL,
  
  -- Metadata for embedding
  source_text TEXT,
  source_data JSONB,
  confidence_score DECIMAL(5,4),
  
  -- Temporal data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration for cache-like behavior
  
  CONSTRAINT unique_entity_embedding 
    UNIQUE (entity_type, entity_id, embedding_model, embedding_version)
);

-- Vector similarity indexes
CREATE INDEX idx_ml_embeddings_vector ON ml.embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_ml_embeddings_entity ON ml.embeddings (entity_type, entity_id);
CREATE INDEX idx_ml_embeddings_model ON ml.embeddings (embedding_model, embedding_version);

-- Feature store for ML training and inference
CREATE TABLE IF NOT EXISTS ml.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_group VARCHAR(100) NOT NULL, -- 'customer_behavior', 'route_efficiency', 'bin_utilization'
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Feature data
  features JSONB NOT NULL, -- Flexible JSON structure for feature values
  feature_names TEXT[] NOT NULL, -- Array of feature names for indexing
  feature_types TEXT[] NOT NULL, -- Array of feature types (numeric, categorical, etc.)
  
  -- Feature metadata
  feature_set_version VARCHAR(50) NOT NULL,
  computation_timestamp TIMESTAMPTZ NOT NULL,
  computation_latency_ms INTEGER,
  
  -- Data quality metrics
  missing_values_count INTEGER DEFAULT 0,
  outlier_flags BOOLEAN[] DEFAULT ARRAY[]::BOOLEAN[],
  quality_score DECIMAL(5,4),
  
  -- Temporal information
  observation_timestamp TIMESTAMPTZ NOT NULL, -- When the original data was observed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_feature_entity_version 
    UNIQUE (feature_group, entity_type, entity_id, feature_set_version, observation_timestamp)
);

-- Indexes for feature store
CREATE INDEX idx_ml_features_group_entity ON ml.features (feature_group, entity_type, entity_id);
CREATE INDEX idx_ml_features_observation_time ON ml.features (observation_timestamp DESC);
CREATE INDEX idx_ml_features_computation_time ON ml.features (computation_timestamp DESC);
CREATE INDEX idx_ml_features_names ON ml.features USING GIN (feature_names);

-- ML training jobs table
CREATE TABLE IF NOT EXISTS ml.training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  
  -- Job configuration
  training_config JSONB NOT NULL,
  dataset_config JSONB NOT NULL,
  hyperparameters JSONB NOT NULL,
  
  -- Job status
  status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  progress_percentage INTEGER DEFAULT 0,
  
  -- Resource usage
  cpu_cores INTEGER,
  memory_gb INTEGER,
  gpu_count INTEGER DEFAULT 0,
  storage_gb INTEGER,
  
  -- Timing information
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration_seconds INTEGER,
  actual_duration_seconds INTEGER,
  
  -- Results
  final_metrics JSONB,
  model_output_path TEXT,
  logs_path TEXT,
  error_message TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for training jobs
CREATE INDEX idx_ml_training_jobs_status ON ml.training_jobs (status, queued_at);
CREATE INDEX idx_ml_training_jobs_model ON ml.training_jobs (model_name, model_version);
CREATE INDEX idx_ml_training_jobs_created ON ml.training_jobs (created_at DESC);

-- ML predictions and inference results
CREATE TABLE IF NOT EXISTS ml.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Prediction data
  input_features JSONB NOT NULL,
  prediction_value JSONB NOT NULL, -- Can be single value, array, or complex object
  prediction_confidence DECIMAL(5,4),
  prediction_probabilities DECIMAL(5,4)[], -- For classification models
  
  -- Model information
  model_version VARCHAR(50) NOT NULL,
  inference_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Performance metadata
  inference_latency_ms INTEGER,
  feature_extraction_latency_ms INTEGER,
  
  -- Prediction context
  request_id UUID, -- For tracking batch predictions
  prediction_type VARCHAR(50), -- 'real_time', 'batch', 'scheduled'
  api_version VARCHAR(20),
  
  -- Feedback and validation
  actual_value JSONB, -- Actual outcome for later evaluation
  feedback_received_at TIMESTAMPTZ,
  prediction_error DECIMAL(10,6),
  
  CONSTRAINT fk_ml_predictions_model 
    FOREIGN KEY (model_id) REFERENCES ml.models(id) ON DELETE CASCADE
);

-- Indexes for predictions
CREATE INDEX idx_ml_predictions_model ON ml.predictions (model_id, inference_timestamp DESC);
CREATE INDEX idx_ml_predictions_entity ON ml.predictions (entity_type, entity_id, inference_timestamp DESC);
CREATE INDEX idx_ml_predictions_timestamp ON ml.predictions (inference_timestamp DESC);
CREATE INDEX idx_ml_predictions_request ON ml.predictions (request_id) WHERE request_id IS NOT NULL;

-- Create partitioned table for high-volume prediction logs
CREATE TABLE IF NOT EXISTS ml.prediction_logs (
  id UUID NOT NULL,
  model_id UUID NOT NULL,
  prediction_id UUID NOT NULL,
  log_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Partitioning key
  log_date DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED
) PARTITION BY RANGE (log_date);

-- Create partitions for prediction logs (current month + next 2 months)
DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
  i INTEGER;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE);
  
  FOR i IN 0..2 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'prediction_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS ml.%I PARTITION OF ml.prediction_logs
      FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    start_date := end_date;
  END LOOP;
END
$$;

-- ML model performance monitoring
CREATE TABLE IF NOT EXISTS ml.model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,6) NOT NULL,
  
  -- Metric metadata
  metric_type VARCHAR(50) NOT NULL, -- 'accuracy', 'latency', 'throughput', 'drift'
  measurement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  measurement_window_start TIMESTAMPTZ,
  measurement_window_end TIMESTAMPTZ,
  
  -- Context
  environment VARCHAR(50),
  data_partition VARCHAR(100), -- 'train', 'validation', 'test', 'production'
  sample_size INTEGER,
  
  CONSTRAINT fk_ml_performance_model 
    FOREIGN KEY (model_id) REFERENCES ml.models(id) ON DELETE CASCADE
);

-- Indexes for performance metrics
CREATE INDEX idx_ml_performance_model_metric ON ml.model_performance_metrics 
  (model_id, metric_name, measurement_timestamp DESC);

-- Create ML utility functions
CREATE OR REPLACE FUNCTION ml.cosine_similarity(
  vector1 VECTOR,
  vector2 VECTOR
) RETURNS DECIMAL(5,4) AS $$
BEGIN
  RETURN (vector1 <=> vector2)::DECIMAL(5,4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find similar entities using vector embeddings
CREATE OR REPLACE FUNCTION ml.find_similar_entities(
  p_entity_type VARCHAR(100),
  p_entity_id UUID,
  p_embedding_model VARCHAR(100),
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  similar_entity_id UUID,
  similarity_score DECIMAL(5,4),
  confidence_score DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e2.entity_id,
    ml.cosine_similarity(e1.embedding, e2.embedding) as similarity_score,
    e2.confidence_score
  FROM ml.embeddings e1
  CROSS JOIN ml.embeddings e2
  WHERE e1.entity_type = p_entity_type 
    AND e1.entity_id = p_entity_id
    AND e1.embedding_model = p_embedding_model
    AND e2.entity_type = p_entity_type
    AND e2.entity_id != p_entity_id
    AND e2.embedding_model = p_embedding_model
  ORDER BY ml.cosine_similarity(e1.embedding, e2.embedding) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update model performance metrics
CREATE OR REPLACE FUNCTION ml.update_model_metrics(
  p_model_id UUID,
  p_metrics JSONB
) RETURNS VOID AS $$
DECLARE
  metric_key TEXT;
  metric_value DECIMAL(15,6);
BEGIN
  -- Iterate through metrics and insert/update
  FOR metric_key, metric_value IN 
    SELECT key, value::TEXT::DECIMAL(15,6) 
    FROM jsonb_each_text(p_metrics)
  LOOP
    INSERT INTO ml.model_performance_metrics (
      model_id, metric_name, metric_value, metric_type
    ) VALUES (
      p_model_id, metric_key, metric_value, 'custom'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for embedding updates
CREATE OR REPLACE FUNCTION ml.update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_embedding_timestamp ON ml.embeddings;
CREATE TRIGGER trigger_update_embedding_timestamp
  BEFORE UPDATE ON ml.embeddings
  FOR EACH ROW
  EXECUTE FUNCTION ml.update_embedding_timestamp();

-- Create view for model deployment status
CREATE OR REPLACE VIEW ml.model_deployment_status AS
SELECT 
  m.id,
  m.name,
  m.version,
  m.model_type,
  m.status,
  m.deployment_environment,
  m.created_at,
  
  -- Performance metrics
  m.accuracy,
  m.f1_score,
  
  -- Recent predictions count
  (SELECT COUNT(*) 
   FROM ml.predictions p 
   WHERE p.model_id = m.id 
     AND p.inference_timestamp >= NOW() - INTERVAL '24 hours'
  ) as predictions_last_24h,
  
  -- Average inference latency
  (SELECT AVG(inference_latency_ms)
   FROM ml.predictions p 
   WHERE p.model_id = m.id 
     AND p.inference_timestamp >= NOW() - INTERVAL '1 hour'
  ) as avg_latency_ms_last_hour
  
FROM ml.models m
WHERE m.status IN ('ready', 'deployed');

-- Grant permissions to application user
GRANT USAGE ON SCHEMA ml TO waste_mgmt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ml TO waste_mgmt_app;
GRANT SELECT ON ml.model_deployment_status TO waste_mgmt_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ml TO waste_mgmt_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA ml 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO waste_mgmt_app;

COMMIT;

-- ============================================================================
-- MIGRATION DOWN (ROLLBACK)
-- ============================================================================

/*
BEGIN;

-- Drop views
DROP VIEW IF EXISTS ml.model_deployment_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS ml.cosine_similarity(VECTOR, VECTOR) CASCADE;
DROP FUNCTION IF EXISTS ml.find_similar_entities(VARCHAR(100), UUID, VARCHAR(100), INTEGER) CASCADE;
DROP FUNCTION IF EXISTS ml.update_model_metrics(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS ml.update_embedding_timestamp() CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS ml.prediction_logs CASCADE;
DROP TABLE IF EXISTS ml.model_performance_metrics CASCADE;
DROP TABLE IF EXISTS ml.predictions CASCADE;
DROP TABLE IF EXISTS ml.training_jobs CASCADE;
DROP TABLE IF EXISTS ml.features CASCADE;
DROP TABLE IF EXISTS ml.embeddings CASCADE;
DROP TABLE IF EXISTS ml.models CASCADE;

-- Drop schema
DROP SCHEMA IF EXISTS ml CASCADE;

-- Note: We don't drop vector extension as other tables might depend on it
-- DROP EXTENSION IF EXISTS vector CASCADE;
-- DROP EXTENSION IF EXISTS pg_trgm CASCADE;

COMMIT;
*/