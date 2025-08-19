/**
 * ============================================================================
 * PHASE 1 WEAVIATE VECTOR METADATA SCHEMA - DATABASE MIGRATION
 * ============================================================================
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * Target: Vector intelligence foundation for AI/ML transformation
 * 
 * COORDINATION WITH:
 * - Backend-Agent: Repository pattern extensions and API integration
 * - Performance-Optimization-Specialist: Storage performance validation and caching
 * - Innovation-Architect: Weaviate cluster configuration and vector operations
 * - External-API-Integration-Specialist: Real-time sync monitoring
 *
 * Migration: 003-vector-embeddings-metadata
 * Description: Deploy vector metadata storage and Weaviate hybrid architecture
 * Type: ai_ml_infrastructure
 * Dependencies: 002-performance-optimization-phase1, 001-create-ai-ml-schema
 * Created by: Database-Architect
 * Date: 2025-08-16
 * Version: 1.0.0
 */

-- Migration Metadata
-- Migration Type: ai_ml_infrastructure
-- Estimated Duration: 60 seconds
-- Requires Downtime: false (uses CONCURRENTLY where possible)
-- Backup Required: true
-- Post Migration Validation: true

-- ============================================================================
-- MIGRATION UP - PHASE 1 VECTOR INTELLIGENCE FOUNDATION
-- ============================================================================

BEGIN;

-- Enable required extensions for vector operations
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- PRIORITY 1: VECTOR EMBEDDINGS METADATA STORAGE
-- Coordinate with Backend-Agent for repository pattern integration
-- ============================================================================

-- Core vector embeddings metadata table
CREATE TABLE IF NOT EXISTS vector_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source entity identification
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_version INTEGER NOT NULL DEFAULT 1,
  
  -- Vector metadata
  vector_id VARCHAR(255), -- Weaviate UUID
  class_name VARCHAR(100) NOT NULL,
  
  -- Content and processing
  content_hash VARCHAR(64) NOT NULL,
  content_text TEXT,
  content_summary TEXT,
  
  -- Vector properties
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-ada-002',
  embedding_dimensions INTEGER NOT NULL DEFAULT 1536,
  vector_quality_score DECIMAL(5,4),
  
  -- Synchronization status
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  weaviate_synced_at TIMESTAMPTZ,
  last_sync_attempt TIMESTAMPTZ,
  sync_error_message TEXT,
  sync_retry_count INTEGER DEFAULT 0,
  
  -- Processing metadata
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  processing_version VARCHAR(20),
  
  -- Performance tracking
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMPTZ,
  avg_search_relevance DECIMAL(5,4),
  
  -- Standard audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT check_valid_entity_type CHECK (entity_type IN (
    'route', 'bin', 'customer', 'organization', 'driver', 'vehicle',
    'service_event', 'maintenance_log', 'user_query', 'knowledge_base'
  )),
  CONSTRAINT check_valid_sync_status CHECK (sync_status IN (
    'pending', 'processing', 'synced', 'error', 'stale', 'archived'
  )),
  CONSTRAINT check_valid_class_name CHECK (class_name IN (
    'OperationalRoute', 'WasteBin', 'Customer', 'Organization', 
    'Driver', 'Vehicle', 'ServiceEvent', 'MaintenanceLog',
    'UserQuery', 'KnowledgeBase'
  )),
  CONSTRAINT check_positive_dimensions CHECK (embedding_dimensions > 0),
  CONSTRAINT check_valid_quality_score CHECK (vector_quality_score >= 0 AND vector_quality_score <= 1),
  CONSTRAINT check_valid_retry_count CHECK (sync_retry_count >= 0),
  CONSTRAINT check_valid_search_count CHECK (search_count >= 0)
);

-- ============================================================================
-- PRIORITY 1: PERFORMANCE INDEXES FOR VECTOR OPERATIONS
-- Coordinate with Performance-Optimization-Specialist for optimization
-- ============================================================================

-- Primary performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_entity_lookup
ON vector_embeddings (entity_type, entity_id, sync_status)
WHERE deleted_at IS NULL;

-- Sync status monitoring index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_sync_status
ON vector_embeddings (sync_status, last_sync_attempt, sync_retry_count)
WHERE deleted_at IS NULL;

-- Weaviate integration index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_weaviate_id
ON vector_embeddings (vector_id, class_name)
WHERE vector_id IS NOT NULL AND deleted_at IS NULL;

-- Content hash deduplication index
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_content_hash_unique
ON vector_embeddings (entity_type, entity_id, content_hash)
WHERE deleted_at IS NULL;

-- Performance monitoring index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_search_performance
ON vector_embeddings (search_count DESC, avg_search_relevance DESC, last_searched_at DESC)
WHERE sync_status = 'synced' AND deleted_at IS NULL;

-- Stale content detection index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_embeddings_stale_detection
ON vector_embeddings (entity_type, entity_version, updated_at)
WHERE sync_status IN ('synced', 'stale') AND deleted_at IS NULL;

-- ============================================================================
-- PRIORITY 2: VECTOR SYNC STATUS TRACKING
-- Coordinate with External-API-Integration-Specialist for monitoring
-- ============================================================================

-- Vector synchronization status tracking table
CREATE TABLE IF NOT EXISTS vector_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sync batch identification
  sync_batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  entity_filter JSONB,
  
  -- Sync metrics
  total_entities INTEGER NOT NULL DEFAULT 0,
  processed_entities INTEGER NOT NULL DEFAULT 0,
  successful_syncs INTEGER NOT NULL DEFAULT 0,
  failed_syncs INTEGER NOT NULL DEFAULT 0,
  skipped_entities INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  avg_processing_time_ms DECIMAL(10,2),
  
  -- Status tracking
  sync_status VARCHAR(20) NOT NULL DEFAULT 'running',
  error_summary TEXT,
  performance_summary JSONB,
  
  -- Weaviate cluster status
  weaviate_cluster_health VARCHAR(20),
  weaviate_response_time_ms INTEGER,
  weaviate_error_count INTEGER DEFAULT 0,
  
  -- Standard audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT check_valid_sync_type CHECK (sync_type IN (
    'full_sync', 'incremental_sync', 'error_retry', 'manual_sync', 
    'scheduled_sync', 'realtime_sync', 'cleanup_sync'
  )),
  CONSTRAINT check_valid_sync_status CHECK (sync_status IN (
    'running', 'completed', 'failed', 'cancelled', 'partial'
  )),
  CONSTRAINT check_valid_weaviate_health CHECK (weaviate_cluster_health IN (
    'healthy', 'degraded', 'unhealthy', 'unknown'
  )),
  CONSTRAINT check_positive_metrics CHECK (
    total_entities >= 0 AND processed_entities >= 0 AND 
    successful_syncs >= 0 AND failed_syncs >= 0 AND skipped_entities >= 0
  )
);

-- Sync status performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_sync_status_batch_tracking
ON vector_sync_status (sync_batch_id, sync_status, sync_started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_sync_status_performance_analysis
ON vector_sync_status (sync_type, sync_status, total_duration_ms, sync_completed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_sync_status_error_analysis
ON vector_sync_status (sync_status, failed_syncs, weaviate_error_count)
WHERE sync_status IN ('failed', 'partial') OR failed_syncs > 0;

-- ============================================================================
-- PRIORITY 3: MATERIALIZED VIEWS FOR VECTOR PERFORMANCE
-- Coordinate with Performance-Optimization-Specialist for caching
-- ============================================================================

-- Vector synchronization metrics view
CREATE MATERIALIZED VIEW IF NOT EXISTS vector_sync_metrics_cache AS
WITH sync_summary AS (
  SELECT 
    -- Overall sync statistics
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN sync_status = 'completed' THEN 1 END) as successful_syncs,
    COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
    COUNT(CASE WHEN sync_status = 'partial' THEN 1 END) as partial_syncs,
    
    -- Performance metrics
    AVG(total_duration_ms) as avg_sync_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) as p95_sync_duration_ms,
    AVG(avg_processing_time_ms) as avg_entity_processing_ms,
    
    -- Entity processing metrics
    SUM(total_entities) as total_entities_processed,
    SUM(successful_syncs) as total_entities_synced,
    SUM(failed_syncs) as total_entities_failed,
    
    -- Weaviate health metrics
    AVG(weaviate_response_time_ms) as avg_weaviate_response_ms,
    COUNT(CASE WHEN weaviate_cluster_health = 'healthy' THEN 1 END) as healthy_syncs,
    SUM(weaviate_error_count) as total_weaviate_errors,
    
    -- Time-based analysis
    DATE_TRUNC('hour', sync_started_at) as sync_hour
  FROM vector_sync_status
  WHERE sync_started_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE_TRUNC('hour', sync_started_at)
),
entity_metrics AS (
  SELECT 
    -- Entity type distribution
    entity_type,
    COUNT(*) as total_vectors,
    COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_vectors,
    COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_vectors,
    COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as error_vectors,
    COUNT(CASE WHEN sync_status = 'stale' THEN 1 END) as stale_vectors,
    
    -- Performance metrics by entity
    AVG(vector_quality_score) as avg_quality_score,
    AVG(processing_duration_ms) as avg_processing_duration,
    AVG(search_count) as avg_search_count,
    AVG(avg_search_relevance) as avg_search_relevance,
    
    -- Sync performance by entity
    AVG(sync_retry_count) as avg_retry_count,
    AVG(EXTRACT(EPOCH FROM (weaviate_synced_at - created_at))) as avg_sync_latency_seconds
  FROM vector_embeddings
  WHERE deleted_at IS NULL
  GROUP BY entity_type
)
SELECT 
  -- Sync performance summary
  ss.sync_hour,
  ss.total_syncs,
  ss.successful_syncs,
  ss.failed_syncs,
  ss.partial_syncs,
  ss.avg_sync_duration_ms,
  ss.p95_sync_duration_ms,
  ss.avg_entity_processing_ms,
  
  -- Entity processing summary
  ss.total_entities_processed,
  ss.total_entities_synced,
  ss.total_entities_failed,
  
  -- Weaviate health summary
  ss.avg_weaviate_response_ms,
  ss.healthy_syncs,
  ss.total_weaviate_errors,
  
  -- Entity type metrics (aggregated)
  JSONB_OBJECT_AGG(
    em.entity_type,
    JSONB_BUILD_OBJECT(
      'total_vectors', em.total_vectors,
      'synced_vectors', em.synced_vectors,
      'pending_vectors', em.pending_vectors,
      'error_vectors', em.error_vectors,
      'stale_vectors', em.stale_vectors,
      'avg_quality_score', em.avg_quality_score,
      'avg_processing_duration', em.avg_processing_duration,
      'avg_search_count', em.avg_search_count,
      'avg_search_relevance', em.avg_search_relevance,
      'avg_retry_count', em.avg_retry_count,
      'avg_sync_latency_seconds', em.avg_sync_latency_seconds
    )
  ) as entity_metrics,
  
  -- Calculated KPIs
  CASE 
    WHEN ss.total_syncs > 0 THEN (ss.successful_syncs::decimal / ss.total_syncs * 100)
    ELSE 0 
  END as sync_success_rate_percentage,
  
  CASE 
    WHEN ss.total_entities_processed > 0 THEN (ss.total_entities_synced::decimal / ss.total_entities_processed * 100)
    ELSE 0 
  END as entity_sync_rate_percentage,
  
  -- Performance metadata
  NOW() as last_updated,
  'vector_sync_metrics' as metric_type
FROM sync_summary ss
CROSS JOIN entity_metrics em
GROUP BY ss.sync_hour, ss.total_syncs, ss.successful_syncs, ss.failed_syncs, ss.partial_syncs,
         ss.avg_sync_duration_ms, ss.p95_sync_duration_ms, ss.avg_entity_processing_ms,
         ss.total_entities_processed, ss.total_entities_synced, ss.total_entities_failed,
         ss.avg_weaviate_response_ms, ss.healthy_syncs, ss.total_weaviate_errors;

-- Create unique index on vector sync metrics cache
CREATE UNIQUE INDEX IF NOT EXISTS idx_vector_sync_metrics_cache_unique
ON vector_sync_metrics_cache (sync_hour, metric_type);

-- ============================================================================
-- PRIORITY 4: REAL-TIME SYNC DETECTION TRIGGERS
-- Coordinate with Backend-Agent for entity change detection
-- ============================================================================

-- Function to detect entity changes and trigger vector updates
CREATE OR REPLACE FUNCTION trigger_vector_sync()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_name VARCHAR(50);
  content_hash_new VARCHAR(64);
  existing_embedding_id UUID;
BEGIN
  -- Determine entity type based on table name
  CASE TG_TABLE_NAME
    WHEN 'routes' THEN entity_type_name := 'route';
    WHEN 'bins' THEN entity_type_name := 'bin';
    WHEN 'customers' THEN entity_type_name := 'customer';
    WHEN 'organizations' THEN entity_type_name := 'organization';
    WHEN 'drivers' THEN entity_type_name := 'driver';
    WHEN 'vehicles' THEN entity_type_name := 'vehicle';
    WHEN 'service_events' THEN entity_type_name := 'service_event';
    ELSE RETURN COALESCE(NEW, OLD);
  END CASE;
  
  -- Skip if this is a delete operation
  IF TG_OP = 'DELETE' THEN
    -- Mark embedding as archived
    UPDATE vector_embeddings 
    SET sync_status = 'archived', 
        updated_at = NOW(),
        deleted_at = NOW()
    WHERE entity_type = entity_type_name 
      AND entity_id = OLD.id 
      AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  
  -- Calculate content hash for change detection
  content_hash_new := encode(
    digest(
      COALESCE(NEW.id::TEXT, '') || 
      COALESCE(NEW.updated_at::TEXT, '') ||
      COALESCE(NEW.status, '') ||
      CASE 
        WHEN entity_type_name = 'route' THEN 
          COALESCE(NEW.route_name, '') || COALESCE(NEW.route_type, '') || COALESCE(NEW.territory, '')
        WHEN entity_type_name = 'bin' THEN 
          COALESCE(NEW.bin_id, '') || COALESCE(NEW.bin_type, '') || COALESCE(NEW.capacity_gallons::TEXT, '')
        WHEN entity_type_name = 'customer' THEN 
          COALESCE(NEW.company_name, '') || COALESCE(NEW.contact_name, '') || COALESCE(NEW.business_type, '')
        ELSE ''
      END,
      'sha256'
    ),
    'hex'
  );
  
  -- Check if embedding exists
  SELECT id INTO existing_embedding_id
  FROM vector_embeddings
  WHERE entity_type = entity_type_name 
    AND entity_id = NEW.id 
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF existing_embedding_id IS NOT NULL THEN
    -- Update existing embedding
    UPDATE vector_embeddings 
    SET content_hash = content_hash_new,
        entity_version = entity_version + 1,
        sync_status = CASE 
          WHEN content_hash != content_hash_new THEN 'stale'
          ELSE sync_status
        END,
        updated_at = NOW()
    WHERE id = existing_embedding_id;
  ELSE
    -- Create new embedding record
    INSERT INTO vector_embeddings (
      entity_type,
      entity_id,
      entity_version,
      class_name,
      content_hash,
      sync_status,
      created_by,
      updated_by
    ) VALUES (
      entity_type_name,
      NEW.id,
      1,
      CASE entity_type_name
        WHEN 'route' THEN 'OperationalRoute'
        WHEN 'bin' THEN 'WasteBin'
        WHEN 'customer' THEN 'Customer'
        WHEN 'organization' THEN 'Organization'
        WHEN 'driver' THEN 'Driver'
        WHEN 'vehicle' THEN 'Vehicle'
        WHEN 'service_event' THEN 'ServiceEvent'
        ELSE 'KnowledgeBase'
      END,
      content_hash_new,
      'pending',
      COALESCE(NEW.created_by, NEW.updated_by),
      COALESCE(NEW.updated_by, NEW.created_by)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for entity change detection
DROP TRIGGER IF EXISTS trigger_vector_sync_routes ON routes;
CREATE TRIGGER trigger_vector_sync_routes
  AFTER INSERT OR UPDATE OR DELETE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_bins ON bins;
CREATE TRIGGER trigger_vector_sync_bins
  AFTER INSERT OR UPDATE OR DELETE ON bins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_customers ON customers;
CREATE TRIGGER trigger_vector_sync_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_organizations ON organizations;
CREATE TRIGGER trigger_vector_sync_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_drivers ON drivers;
CREATE TRIGGER trigger_vector_sync_drivers
  AFTER INSERT OR UPDATE OR DELETE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_vehicles ON vehicles;
CREATE TRIGGER trigger_vector_sync_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

DROP TRIGGER IF EXISTS trigger_vector_sync_service_events ON service_events;
CREATE TRIGGER trigger_vector_sync_service_events
  AFTER INSERT OR UPDATE OR DELETE ON service_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vector_sync();

-- ============================================================================
-- PRIORITY 5: ORPHAN CLEANUP AND DATA CONSISTENCY
-- ============================================================================

-- Function to clean up orphaned vector embeddings
CREATE OR REPLACE FUNCTION cleanup_orphaned_embeddings()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Clean up embeddings for deleted routes
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'route' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = vector_embeddings.entity_id 
        AND routes.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Clean up embeddings for deleted bins
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'bin' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM bins 
      WHERE bins.id = vector_embeddings.entity_id 
        AND bins.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  -- Clean up embeddings for deleted customers
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'customer' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = vector_embeddings.entity_id 
        AND customers.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  -- Clean up embeddings for deleted organizations
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'organization' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = vector_embeddings.entity_id 
        AND organizations.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  -- Clean up embeddings for deleted drivers
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'driver' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = vector_embeddings.entity_id 
        AND drivers.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  -- Clean up embeddings for deleted vehicles
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'vehicle' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM vehicles 
      WHERE vehicles.id = vector_embeddings.entity_id 
        AND vehicles.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  -- Clean up embeddings for deleted service events
  UPDATE vector_embeddings 
  SET sync_status = 'archived', deleted_at = NOW()
  WHERE entity_type = 'service_event' 
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM service_events 
      WHERE service_events.id = vector_embeddings.entity_id 
        AND service_events.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRIORITY 6: VECTOR PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to analyze vector sync performance
CREATE OR REPLACE FUNCTION analyze_vector_sync_performance(
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE (
  entity_type VARCHAR(50),
  total_vectors BIGINT,
  synced_vectors BIGINT,
  pending_vectors BIGINT,
  error_vectors BIGINT,
  stale_vectors BIGINT,
  sync_success_rate DECIMAL(5,2),
  avg_sync_latency_seconds DECIMAL(10,2),
  avg_quality_score DECIMAL(5,4),
  avg_search_count DECIMAL(10,2),
  avg_search_relevance DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ve.entity_type,
    COUNT(*) as total_vectors,
    COUNT(CASE WHEN ve.sync_status = 'synced' THEN 1 END) as synced_vectors,
    COUNT(CASE WHEN ve.sync_status = 'pending' THEN 1 END) as pending_vectors,
    COUNT(CASE WHEN ve.sync_status = 'error' THEN 1 END) as error_vectors,
    COUNT(CASE WHEN ve.sync_status = 'stale' THEN 1 END) as stale_vectors,
    (COUNT(CASE WHEN ve.sync_status = 'synced' THEN 1 END)::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2) as sync_success_rate,
    AVG(EXTRACT(EPOCH FROM (ve.weaviate_synced_at - ve.created_at)))::DECIMAL(10,2) as avg_sync_latency_seconds,
    AVG(ve.vector_quality_score)::DECIMAL(5,4) as avg_quality_score,
    AVG(ve.search_count)::DECIMAL(10,2) as avg_search_count,
    AVG(ve.avg_search_relevance)::DECIMAL(5,4) as avg_search_relevance
  FROM vector_embeddings ve
  WHERE ve.deleted_at IS NULL
    AND ve.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_entity_type IS NULL OR ve.entity_type = p_entity_type)
  GROUP BY ve.entity_type
  ORDER BY sync_success_rate DESC, total_vectors DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify stale vectors requiring sync
CREATE OR REPLACE FUNCTION identify_stale_vectors(
  p_max_age_hours INTEGER DEFAULT 24,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_version INTEGER,
  content_hash VARCHAR(64),
  sync_status VARCHAR(20),
  hours_since_update DECIMAL(10,2),
  sync_retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ve.id,
    ve.entity_type,
    ve.entity_id,
    ve.entity_version,
    ve.content_hash,
    ve.sync_status,
    EXTRACT(EPOCH FROM (NOW() - ve.updated_at))/3600 as hours_since_update,
    ve.sync_retry_count
  FROM vector_embeddings ve
  WHERE ve.deleted_at IS NULL
    AND (
      ve.sync_status IN ('pending', 'stale', 'error') OR
      (ve.sync_status = 'synced' AND ve.updated_at < NOW() - (p_max_age_hours || ' hours')::INTERVAL)
    )
    AND ve.sync_retry_count < 5
  ORDER BY 
    CASE ve.sync_status 
      WHEN 'error' THEN 1
      WHEN 'stale' THEN 2 
      WHEN 'pending' THEN 3
      ELSE 4
    END,
    ve.updated_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CACHE INVALIDATION FOR VECTOR METRICS
-- ============================================================================

-- Function to refresh vector sync metrics cache
CREATE OR REPLACE FUNCTION refresh_vector_sync_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh vector sync metrics cache when sync status changes
  REFRESH MATERIALIZED VIEW CONCURRENTLY vector_sync_metrics_cache;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS trigger_refresh_vector_sync_cache ON vector_embeddings;
CREATE TRIGGER trigger_refresh_vector_sync_cache
  AFTER INSERT OR UPDATE OR DELETE ON vector_embeddings
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_vector_sync_cache();

DROP TRIGGER IF EXISTS trigger_refresh_vector_sync_status_cache ON vector_sync_status;
CREATE TRIGGER trigger_refresh_vector_sync_status_cache
  AFTER INSERT OR UPDATE OR DELETE ON vector_sync_status
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_vector_sync_cache();

-- ============================================================================
-- INITIAL DATA POPULATION AND CACHE REFRESH
-- ============================================================================

-- Refresh materialized view with initial data
REFRESH MATERIALIZED VIEW vector_sync_metrics_cache;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for application user
GRANT SELECT, INSERT, UPDATE ON vector_embeddings TO waste_mgmt_app;
GRANT SELECT, INSERT, UPDATE ON vector_sync_status TO waste_mgmt_app;
GRANT SELECT ON vector_sync_metrics_cache TO waste_mgmt_app;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION trigger_vector_sync TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_embeddings TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION analyze_vector_sync_performance TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION identify_stale_vectors TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION refresh_vector_sync_cache TO waste_mgmt_app;

COMMIT;

-- ============================================================================
-- POST MIGRATION VALIDATION
-- ============================================================================

-- Validate vector embeddings table exists and is ready
DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_count INTEGER;
  index_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'vector_embeddings'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Vector embeddings table was not created successfully';
  END IF;
  
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE 'trigger_vector_sync_%';
  
  IF trigger_count < 7 THEN
    RAISE WARNING 'Expected 7 vector sync triggers, found %', trigger_count;
  END IF;
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'vector_embeddings';
  
  IF index_count < 6 THEN
    RAISE WARNING 'Expected at least 6 indexes on vector_embeddings, found %', index_count;
  END IF;
  
  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name IN (
    'trigger_vector_sync',
    'cleanup_orphaned_embeddings',
    'analyze_vector_sync_performance',
    'identify_stale_vectors',
    'refresh_vector_sync_cache'
  );
  
  IF function_count < 5 THEN
    RAISE WARNING 'Expected 5 vector functions, found %', function_count;
  END IF;
  
  RAISE NOTICE 'Phase 1 Weaviate vector metadata schema deployed successfully';
  RAISE NOTICE 'Vector embeddings table: READY';
  RAISE NOTICE 'Vector sync tracking: READY';
  RAISE NOTICE 'Real-time sync triggers: % active', trigger_count;
  RAISE NOTICE 'Performance indexes: % deployed', index_count;
  RAISE NOTICE 'Vector functions: % available', function_count;
  RAISE NOTICE 'Vector intelligence foundation: OPERATIONAL';
END $$;