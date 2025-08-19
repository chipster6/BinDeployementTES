/**
 * ============================================================================
 * POSTGIS SPATIAL MIGRATION TEMPLATE
 * ============================================================================
 *
 * Template for creating PostGIS spatial database migrations with proper
 * spatial indexing, coordinate system management, and performance optimization.
 *
 * Migration: {MIGRATION_ID}
 * Description: {MIGRATION_DESCRIPTION}
 * Type: spatial
 * Dependencies: {DEPENDENCIES}
 * Created by: Database-Architect
 * Date: {DATE}
 * Version: 1.0.0
 */

-- Migration Metadata
-- Migration Type: spatial
-- Estimated Duration: {ESTIMATED_DURATION} seconds
-- Requires Downtime: {REQUIRES_DOWNTIME}
-- Backup Required: true
-- Post Migration Validation: true

-- ============================================================================
-- MIGRATION UP
-- ============================================================================

BEGIN;

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Set search path to include PostGIS functions
SET search_path = public, topology;

-- Example: Create spatial table for route tracking
CREATE TABLE IF NOT EXISTS route_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  
  -- Spatial data with SRID 4326 (WGS84)
  current_location GEOMETRY(POINT, 4326) NOT NULL,
  planned_route GEOMETRY(LINESTRING, 4326),
  service_area GEOMETRY(POLYGON, 4326),
  
  -- Additional spatial metadata
  elevation DECIMAL(10,2),
  accuracy DECIMAL(5,2), -- GPS accuracy in meters
  heading DECIMAL(5,2), -- Direction in degrees (0-360)
  speed DECIMAL(5,2), -- Speed in km/h
  
  -- Temporal data
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Foreign key constraints
  CONSTRAINT fk_route_tracking_route 
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_tracking_vehicle 
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    
  -- Spatial constraints
  CONSTRAINT check_valid_elevation 
    CHECK (elevation BETWEEN -500 AND 10000),
  CONSTRAINT check_valid_accuracy 
    CHECK (accuracy >= 0 AND accuracy <= 1000),
  CONSTRAINT check_valid_heading 
    CHECK (heading >= 0 AND heading < 360),
  CONSTRAINT check_valid_speed 
    CHECK (speed >= 0 AND speed <= 200)
);

-- Create spatial indexes for optimal performance
-- GIST index for spatial queries
CREATE INDEX idx_route_tracking_current_location 
  ON route_tracking USING GIST (current_location);

-- GIST index for planned route
CREATE INDEX idx_route_tracking_planned_route 
  ON route_tracking USING GIST (planned_route) 
  WHERE planned_route IS NOT NULL;

-- GIST index for service area
CREATE INDEX idx_route_tracking_service_area 
  ON route_tracking USING GIST (service_area) 
  WHERE service_area IS NOT NULL;

-- Composite GIST index for spatial-temporal queries
CREATE INDEX idx_route_tracking_location_time 
  ON route_tracking USING GIST (current_location, recorded_at);

-- B-tree indexes for non-spatial queries
CREATE INDEX idx_route_tracking_route_id 
  ON route_tracking (route_id, recorded_at DESC);

CREATE INDEX idx_route_tracking_vehicle_id 
  ON route_tracking (vehicle_id, recorded_at DESC);

CREATE INDEX idx_route_tracking_recorded_at 
  ON route_tracking (recorded_at DESC);

-- Example: Create spatial functions for route optimization
CREATE OR REPLACE FUNCTION calculate_route_efficiency(
  p_route_id UUID,
  p_time_window INTERVAL DEFAULT '1 day'::INTERVAL
) RETURNS TABLE (
  total_distance_km DECIMAL(10,2),
  planned_distance_km DECIMAL(10,2),
  efficiency_ratio DECIMAL(5,2),
  avg_speed_kmh DECIMAL(5,2),
  stops_count INTEGER,
  off_route_distance_km DECIMAL(10,2)
) AS $$
DECLARE
  route_points GEOMETRY[];
  planned_route_geom GEOMETRY;
BEGIN
  -- Get route tracking points for the specified time window
  SELECT array_agg(current_location ORDER BY recorded_at)
  INTO route_points
  FROM route_tracking
  WHERE route_id = p_route_id
    AND recorded_at >= NOW() - p_time_window;
    
  -- Get planned route
  SELECT planned_route 
  INTO planned_route_geom
  FROM route_tracking
  WHERE route_id = p_route_id
    AND planned_route IS NOT NULL
  LIMIT 1;
  
  -- Calculate metrics (simplified example)
  RETURN QUERY
  SELECT 
    COALESCE(
      ST_Length(ST_MakeLine(route_points)::GEOGRAPHY) / 1000, 
      0
    )::DECIMAL(10,2) as total_distance_km,
    COALESCE(
      ST_Length(planned_route_geom::GEOGRAPHY) / 1000, 
      0
    )::DECIMAL(10,2) as planned_distance_km,
    CASE 
      WHEN ST_Length(planned_route_geom::GEOGRAPHY) > 0 THEN
        (ST_Length(ST_MakeLine(route_points)::GEOGRAPHY) / 
         ST_Length(planned_route_geom::GEOGRAPHY) * 100)::DECIMAL(5,2)
      ELSE 0
    END as efficiency_ratio,
    50.0::DECIMAL(5,2) as avg_speed_kmh, -- Placeholder calculation
    array_length(route_points, 1)::INTEGER as stops_count,
    0.0::DECIMAL(10,2) as off_route_distance_km; -- Placeholder calculation
END;
$$ LANGUAGE plpgsql;

-- Example: Create spatial triggers for data validation
CREATE OR REPLACE FUNCTION validate_spatial_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate geometry is not empty
  IF ST_IsEmpty(NEW.current_location) THEN
    RAISE EXCEPTION 'Current location cannot be empty';
  END IF;
  
  -- Validate geometry is valid
  IF NOT ST_IsValid(NEW.current_location) THEN
    RAISE EXCEPTION 'Current location geometry is invalid: %', 
      ST_IsValidReason(NEW.current_location);
  END IF;
  
  -- Validate SRID
  IF ST_SRID(NEW.current_location) != 4326 THEN
    RAISE EXCEPTION 'Current location must use SRID 4326 (WGS84)';
  END IF;
  
  -- Validate coordinates are within reasonable bounds (roughly Earth bounds)
  IF ST_X(NEW.current_location) < -180 OR ST_X(NEW.current_location) > 180 OR
     ST_Y(NEW.current_location) < -90 OR ST_Y(NEW.current_location) > 90 THEN
    RAISE EXCEPTION 'Current location coordinates are out of valid range';
  END IF;
  
  -- Update spatial metadata
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_spatial_data ON route_tracking;
CREATE TRIGGER trigger_validate_spatial_data
  BEFORE INSERT OR UPDATE ON route_tracking
  FOR EACH ROW
  EXECUTE FUNCTION validate_spatial_data();

-- Create materialized view for spatial analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS route_efficiency_summary AS
SELECT 
  r.id as route_id,
  r.name as route_name,
  COUNT(rt.id) as tracking_points,
  MIN(rt.recorded_at) as first_tracking,
  MAX(rt.recorded_at) as last_tracking,
  
  -- Spatial calculations
  ST_Length(ST_MakeLine(rt.current_location ORDER BY rt.recorded_at)::GEOGRAPHY) / 1000 as total_distance_km,
  ST_Area(ST_ConvexHull(ST_Collect(rt.current_location))::GEOGRAPHY) / 1000000 as coverage_area_km2,
  
  -- Performance metrics
  EXTRACT(EPOCH FROM (MAX(rt.recorded_at) - MIN(rt.recorded_at))) / 3600 as duration_hours,
  AVG(rt.speed) as avg_speed_kmh,
  MAX(rt.speed) as max_speed_kmh,
  
  -- Quality metrics
  AVG(rt.accuracy) as avg_gps_accuracy,
  COUNT(CASE WHEN rt.accuracy > 50 THEN 1 END) as poor_accuracy_points
  
FROM routes r
INNER JOIN route_tracking rt ON r.id = rt.route_id
WHERE rt.recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY r.id, r.name
HAVING COUNT(rt.id) >= 10; -- Only routes with sufficient tracking data

-- Create index on materialized view
CREATE UNIQUE INDEX idx_route_efficiency_summary_route_id 
  ON route_efficiency_summary (route_id);

-- Refresh materialized view (initial load)
REFRESH MATERIALIZED VIEW route_efficiency_summary;

-- Example: Spatial optimization table for AI/ML integration
CREATE TABLE IF NOT EXISTS spatial_optimization_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_type VARCHAR(50) NOT NULL, -- 'route', 'pickup', 'delivery'
  input_geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
  output_geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
  
  -- Optimization parameters
  parameters JSONB NOT NULL,
  algorithm_version VARCHAR(20) NOT NULL,
  
  -- Results
  optimization_score DECIMAL(5,2),
  distance_saved_km DECIMAL(10,2),
  time_saved_minutes INTEGER,
  fuel_saved_liters DECIMAL(8,2),
  
  -- Cache management
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  cache_hit_count INTEGER DEFAULT 0,
  
  -- Indexes for cache lookup
  CONSTRAINT unique_optimization_cache 
    UNIQUE (optimization_type, input_geometry, parameters)
);

-- Spatial index for optimization cache
CREATE INDEX idx_spatial_optimization_cache_input 
  ON spatial_optimization_cache USING GIST (input_geometry);

CREATE INDEX idx_spatial_optimization_cache_output 
  ON spatial_optimization_cache USING GIST (output_geometry);

-- Index for cache expiration cleanup
CREATE INDEX idx_spatial_optimization_cache_expires 
  ON spatial_optimization_cache (expires_at) 
  WHERE expires_at < NOW();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON route_tracking TO waste_mgmt_app;
GRANT SELECT ON route_efficiency_summary TO waste_mgmt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON spatial_optimization_cache TO waste_mgmt_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO waste_mgmt_app;

COMMIT;

-- ============================================================================
-- MIGRATION DOWN (ROLLBACK)
-- ============================================================================

/*
BEGIN;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS route_efficiency_summary CASCADE;

-- Drop tables
DROP TABLE IF EXISTS spatial_optimization_cache CASCADE;
DROP TABLE IF EXISTS route_tracking CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_route_efficiency(UUID, INTERVAL) CASCADE;
DROP FUNCTION IF EXISTS validate_spatial_data() CASCADE;

-- Note: We don't drop PostGIS extension as other tables might depend on it
-- DROP EXTENSION IF EXISTS postgis CASCADE;
-- DROP EXTENSION IF EXISTS postgis_topology CASCADE;

COMMIT;
*/