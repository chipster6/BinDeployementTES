/**
 * ============================================================================
 * PHASE 1 PERFORMANCE OPTIMIZATION - DATABASE MIGRATION
 * ============================================================================
 *
 * STREAM B COORDINATION: Database Architect implementing immediate performance wins
 * Target: 50% performance improvement in critical endpoints
 * 
 * COORDINATION WITH:
 * - Performance-Optimization-Specialist: Cache integration patterns
 * - Innovation-Architect: AI/ML query optimization preparation
 * - Frontend-Agent: Dashboard query optimization
 * - External-API-Integration-Specialist: Real-time query performance
 *
 * Migration: 002-performance-optimization-phase1
 * Description: Implement composite indexes, materialized views, and query optimization
 * Type: performance
 * Dependencies: 001-security-hardening, 001-create-ai-ml-schema
 * Created by: Database-Architect
 * Date: 2025-08-16
 * Version: 1.0.0
 */

-- Migration Metadata
-- Migration Type: performance
-- Estimated Duration: 45 seconds
-- Requires Downtime: false (uses CONCURRENTLY where possible)
-- Backup Required: true
-- Post Migration Validation: true

-- ============================================================================
-- MIGRATION UP - PHASE 1 PERFORMANCE OPTIMIZATION
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================================================
-- PRIORITY 1: STATISTICAL QUERY OPTIMIZATION
-- Coordinate with Performance-Optimization-Specialist for cache integration
-- ============================================================================

-- Create composite indexes for statistical aggregations (Routes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_status_active_stats
ON routes (status, route_type, service_day, deleted_at)
WHERE status = 'active' AND deleted_at IS NULL;

-- Optimize GROUP BY operations for route statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_stats_grouping
ON routes (status, route_type, service_day, territory)
WHERE deleted_at IS NULL;

-- Create materialized view for route statistics (cacheable)
CREATE MATERIALIZED VIEW IF NOT EXISTS route_statistics_cache AS
SELECT 
  -- Status distribution
  status,
  COUNT(*) as status_count,
  
  -- Type distribution  
  route_type,
  COUNT(CASE WHEN route_type IS NOT NULL THEN 1 END) as type_count,
  
  -- Service day distribution
  service_day,
  COUNT(CASE WHEN service_day IS NOT NULL THEN 1 END) as day_count,
  
  -- Territory distribution
  territory,
  COUNT(CASE WHEN territory IS NOT NULL THEN 1 END) as territory_count,
  
  -- Optimization metrics
  COUNT(CASE WHEN ai_optimized = true THEN 1 END) as optimized_count,
  AVG(optimization_score) as avg_optimization_score,
  AVG(estimated_distance_miles) as avg_distance,
  AVG(estimated_duration_minutes) as avg_duration,
  
  -- Performance metadata
  NOW() as last_updated,
  'routes' as entity_type
FROM routes
WHERE deleted_at IS NULL
GROUP BY status, route_type, service_day, territory;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_statistics_cache_unique
ON route_statistics_cache (status, COALESCE(route_type, 'null'), COALESCE(service_day, 'null'), COALESCE(territory, 'null'));

-- ============================================================================
-- PRIORITY 1: BIN STATISTICS OPTIMIZATION  
-- Coordinate with Frontend-Agent for dashboard performance
-- ============================================================================

-- Create composite indexes for bin statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_status_customer_stats
ON bins (status, customer_id, bin_type, deleted_at)
WHERE deleted_at IS NULL;

-- Optimize bin-customer-organization joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_customer_organization_join
ON bins (customer_id, status)
WHERE status = 'active' AND deleted_at IS NULL;

-- Create materialized view for bin statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS bin_statistics_cache AS
SELECT 
  -- Status distribution
  b.status,
  COUNT(*) as status_count,
  
  -- Type distribution
  b.bin_type,
  COUNT(CASE WHEN b.bin_type IS NOT NULL THEN 1 END) as type_count,
  
  -- Capacity metrics
  AVG(b.capacity_gallons) as avg_capacity,
  SUM(b.capacity_gallons) as total_capacity,
  
  -- Customer distribution
  COUNT(DISTINCT b.customer_id) as unique_customers,
  
  -- Location metrics (using spatial functions)
  COUNT(CASE WHEN b.location IS NOT NULL THEN 1 END) as geo_located_count,
  
  -- Service frequency
  AVG(
    CASE b.service_frequency_days 
      WHEN 0 THEN NULL 
      ELSE b.service_frequency_days 
    END
  ) as avg_service_frequency,
  
  -- Performance metadata
  NOW() as last_updated,
  'bins' as entity_type
FROM bins b
WHERE b.deleted_at IS NULL
GROUP BY b.status, b.bin_type;

-- Create unique index on bin statistics cache
CREATE UNIQUE INDEX IF NOT EXISTS idx_bin_statistics_cache_unique
ON bin_statistics_cache (status, COALESCE(bin_type, 'null'));

-- ============================================================================
-- PRIORITY 2: SPATIAL QUERY OPTIMIZATION
-- Coordinate with Innovation-Architect for AI/ML spatial operations
-- ============================================================================

-- Create composite GIST indexes with WHERE clauses for active routes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_geometry_status_active
ON routes USING GIST(route_geometry) 
WHERE status = 'active' AND deleted_at IS NULL AND route_geometry IS NOT NULL;

-- Create composite GIST indexes for active bins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_location_status_active
ON bins USING GIST(location) 
WHERE status = 'active' AND deleted_at IS NULL AND location IS NOT NULL;

-- Create spatial-territory composite index for route optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_spatial_territory_composite
ON routes USING GIST(route_geometry, territory) 
WHERE deleted_at IS NULL AND route_geometry IS NOT NULL;

-- Optimize bin-location radius queries with distance pre-calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_location_service_area
ON bins USING GIST(location, service_area) 
WHERE deleted_at IS NULL AND location IS NOT NULL;

-- ============================================================================
-- PRIORITY 3: N+1 QUERY ELIMINATION INDEXES
-- Coordinate with External-API-Integration-Specialist for real-time performance
-- ============================================================================

-- Optimize bin->customer->organization association chains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_customer_org_chain
ON bins (customer_id, status, deleted_at)
WHERE deleted_at IS NULL;

-- Optimize customer->organization chain
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_organization_chain
ON customers (organization_id, status, deleted_at)
WHERE deleted_at IS NULL;

-- Optimize audit trail associations (selective loading)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_audit_selective
ON bins (created_by, updated_by, deleted_at)
WHERE deleted_at IS NULL;

-- Optimize service event associations for route performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_events_route_bin_chain
ON service_events (route_id, bin_id, completed_at, deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================================
-- PRIORITY 4: DASHBOARD QUERY OPTIMIZATION
-- Coordinate with Frontend-Agent for real-time dashboard performance
-- ============================================================================

-- Create materialized view for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_cache AS
WITH route_metrics AS (
  SELECT 
    COUNT(*) as total_routes,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_routes,
    COUNT(CASE WHEN ai_optimized = true THEN 1 END) as optimized_routes,
    AVG(optimization_score) as avg_optimization_score,
    SUM(estimated_distance_miles) as total_distance_miles,
    AVG(estimated_duration_minutes) as avg_duration_minutes
  FROM routes 
  WHERE deleted_at IS NULL
),
bin_metrics AS (
  SELECT 
    COUNT(*) as total_bins,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bins,
    AVG(capacity_gallons) as avg_capacity,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as geo_located_bins
  FROM bins 
  WHERE deleted_at IS NULL
),
customer_metrics AS (
  SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
    COUNT(DISTINCT organization_id) as unique_organizations
  FROM customers 
  WHERE deleted_at IS NULL
),
service_metrics AS (
  SELECT 
    COUNT(*) as total_services,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_services,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_service_duration_minutes
  FROM service_events 
  WHERE deleted_at IS NULL 
    AND started_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  -- Route metrics
  rm.total_routes,
  rm.active_routes,
  rm.optimized_routes,
  rm.avg_optimization_score,
  rm.total_distance_miles,
  rm.avg_duration_minutes,
  
  -- Bin metrics
  bm.total_bins,
  bm.active_bins,
  bm.avg_capacity,
  bm.unique_customers as bin_customers,
  bm.geo_located_bins,
  
  -- Customer metrics
  cm.total_customers,
  cm.active_customers,
  cm.unique_organizations,
  
  -- Service metrics
  sm.total_services,
  sm.completed_services,
  sm.avg_service_duration_minutes,
  
  -- Calculated KPIs
  CASE 
    WHEN rm.total_routes > 0 THEN (rm.optimized_routes::decimal / rm.total_routes * 100)
    ELSE 0 
  END as optimization_percentage,
  
  CASE 
    WHEN bm.total_bins > 0 THEN (bm.geo_located_bins::decimal / bm.total_bins * 100)
    ELSE 0 
  END as geo_coverage_percentage,
  
  CASE 
    WHEN sm.total_services > 0 THEN (sm.completed_services::decimal / sm.total_services * 100)
    ELSE 0 
  END as service_completion_rate,
  
  -- Performance metadata
  NOW() as last_updated,
  'dashboard' as metric_type
FROM route_metrics rm
CROSS JOIN bin_metrics bm
CROSS JOIN customer_metrics cm
CROSS JOIN service_metrics sm;

-- Create index on dashboard metrics cache
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_cache_type
ON dashboard_metrics_cache (metric_type, last_updated);

-- ============================================================================
-- PERFORMANCE MONITORING ENHANCEMENTS
-- ============================================================================

-- Create performance tracking table for query optimization
CREATE TABLE IF NOT EXISTS query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type VARCHAR(100) NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  optimization_applied BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for performance analysis
  CONSTRAINT check_positive_execution_time CHECK (execution_time_ms >= 0),
  CONSTRAINT check_valid_query_type CHECK (query_type IN (
    'route_statistics', 'bin_statistics', 'dashboard_metrics', 
    'spatial_query', 'association_chain', 'optimization_query'
  ))
);

-- Create index for performance monitoring
CREATE INDEX idx_query_performance_log_type_time
ON query_performance_log (query_type, recorded_at DESC);

CREATE INDEX idx_query_performance_log_slow_queries
ON query_performance_log (execution_time_ms DESC, recorded_at DESC)
WHERE execution_time_ms > 1000; -- Track queries slower than 1 second

-- ============================================================================
-- CACHE INVALIDATION TRIGGERS
-- Coordinate with Performance-Optimization-Specialist for Redis integration
-- ============================================================================

-- Function to refresh materialized views when underlying data changes
CREATE OR REPLACE FUNCTION refresh_performance_caches()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh route statistics cache
  IF TG_TABLE_NAME = 'routes' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY route_statistics_cache;
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_cache;
  END IF;
  
  -- Refresh bin statistics cache
  IF TG_TABLE_NAME = 'bins' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bin_statistics_cache;
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_cache;
  END IF;
  
  -- Refresh dashboard cache for customers
  IF TG_TABLE_NAME = 'customers' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_cache;
  END IF;
  
  -- Refresh dashboard cache for service events
  IF TG_TABLE_NAME = 'service_events' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_cache;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS trigger_refresh_route_cache ON routes;
CREATE TRIGGER trigger_refresh_route_cache
  AFTER INSERT OR UPDATE OR DELETE ON routes
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_performance_caches();

DROP TRIGGER IF EXISTS trigger_refresh_bin_cache ON bins;
CREATE TRIGGER trigger_refresh_bin_cache
  AFTER INSERT OR UPDATE OR DELETE ON bins
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_performance_caches();

DROP TRIGGER IF EXISTS trigger_refresh_customer_cache ON customers;
CREATE TRIGGER trigger_refresh_customer_cache
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_performance_caches();

DROP TRIGGER IF EXISTS trigger_refresh_service_cache ON service_events;
CREATE TRIGGER trigger_refresh_service_cache
  AFTER INSERT OR UPDATE OR DELETE ON service_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_performance_caches();

-- ============================================================================
-- INITIAL DATA POPULATION
-- ============================================================================

-- Refresh all materialized views with initial data
REFRESH MATERIALIZED VIEW route_statistics_cache;
REFRESH MATERIALIZED VIEW bin_statistics_cache;
REFRESH MATERIALIZED VIEW dashboard_metrics_cache;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(
  p_query_type VARCHAR(100) DEFAULT NULL,
  p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE (
  query_type VARCHAR(100),
  total_queries BIGINT,
  avg_execution_time_ms DECIMAL(10,2),
  p95_execution_time_ms INTEGER,
  p99_execution_time_ms INTEGER,
  max_execution_time_ms INTEGER,
  cache_hit_ratio DECIMAL(5,2),
  optimization_ratio DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qpl.query_type,
    COUNT(*) as total_queries,
    AVG(qpl.execution_time_ms)::DECIMAL(10,2) as avg_execution_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY qpl.execution_time_ms)::INTEGER as p95_execution_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY qpl.execution_time_ms)::INTEGER as p99_execution_time_ms,
    MAX(qpl.execution_time_ms) as max_execution_time_ms,
    (COUNT(CASE WHEN qpl.cache_hit THEN 1 END)::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2) as cache_hit_ratio,
    (COUNT(CASE WHEN qpl.optimization_applied THEN 1 END)::DECIMAL / COUNT(*) * 100)::DECIMAL(5,2) as optimization_ratio
  FROM query_performance_log qpl
  WHERE qpl.recorded_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_query_type IS NULL OR qpl.query_type = p_query_type)
  GROUP BY qpl.query_type
  ORDER BY avg_execution_time_ms DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for application user
GRANT SELECT ON route_statistics_cache TO waste_mgmt_app;
GRANT SELECT ON bin_statistics_cache TO waste_mgmt_app;
GRANT SELECT ON dashboard_metrics_cache TO waste_mgmt_app;
GRANT SELECT, INSERT ON query_performance_log TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION analyze_query_performance TO waste_mgmt_app;
GRANT EXECUTE ON FUNCTION refresh_performance_caches TO waste_mgmt_app;

COMMIT;

-- ============================================================================
-- POST MIGRATION VALIDATION
-- ============================================================================

-- Validate materialized views exist and have data
DO $$
DECLARE
  route_stats_count INTEGER;
  bin_stats_count INTEGER;
  dashboard_stats_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO route_stats_count FROM route_statistics_cache;
  SELECT COUNT(*) INTO bin_stats_count FROM bin_statistics_cache;
  SELECT COUNT(*) INTO dashboard_stats_count FROM dashboard_metrics_cache;
  
  IF route_stats_count = 0 THEN
    RAISE WARNING 'Route statistics cache is empty - this may be expected for new installations';
  END IF;
  
  IF bin_stats_count = 0 THEN
    RAISE WARNING 'Bin statistics cache is empty - this may be expected for new installations';
  END IF;
  
  IF dashboard_stats_count = 0 THEN
    RAISE WARNING 'Dashboard metrics cache is empty - this may be expected for new installations';
  END IF;
  
  RAISE NOTICE 'Phase 1 performance optimization migration completed successfully';
  RAISE NOTICE 'Route statistics cache: % rows', route_stats_count;
  RAISE NOTICE 'Bin statistics cache: % rows', bin_stats_count;
  RAISE NOTICE 'Dashboard metrics cache: % rows', dashboard_stats_count;
END $$;