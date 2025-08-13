-- ============================================================================
-- WASTE MANAGEMENT SYSTEM - DATABASE INITIALIZATION
-- ============================================================================
--
-- Initial database setup with extensions and user permissions
-- Optimized for spatial data and enterprise security
--
-- Created by: Infrastructure Agent
-- Date: 2025-08-12
-- Version: 1.0.0
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";
CREATE EXTENSION IF NOT EXISTS "postgis_tiger_geocoder";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create application user with limited privileges
DO $do$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'waste_mgmt_app') THEN
        CREATE ROLE waste_mgmt_app WITH LOGIN PASSWORD 'app_user_password_change_in_production';
    END IF;
END
$do$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE waste_management TO waste_mgmt_app;
GRANT USAGE ON SCHEMA public TO waste_mgmt_app;
GRANT CREATE ON SCHEMA public TO waste_mgmt_app;

-- Create read-only user for reporting
DO $do$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'waste_mgmt_readonly') THEN
        CREATE ROLE waste_mgmt_readonly WITH LOGIN PASSWORD 'readonly_user_password_change_in_production';
    END IF;
END
$do$;

-- Grant read-only permissions
GRANT CONNECT ON DATABASE waste_management TO waste_mgmt_readonly;
GRANT USAGE ON SCHEMA public TO waste_mgmt_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO waste_mgmt_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO waste_mgmt_readonly;

-- Create monitoring/backup user
DO $do$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'waste_mgmt_monitor') THEN
        CREATE ROLE waste_mgmt_monitor WITH LOGIN PASSWORD 'monitor_user_password_change_in_production';
    END IF;
END
$do$;

-- Grant monitoring permissions
GRANT CONNECT ON DATABASE waste_management TO waste_mgmt_monitor;
GRANT pg_monitor TO waste_mgmt_monitor;

-- Set up database-level configurations
ALTER DATABASE waste_management SET timezone TO 'UTC';
ALTER DATABASE waste_management SET log_statement TO 'mod';
ALTER DATABASE waste_management SET log_min_duration_statement TO '1000ms';

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS spatial;
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS jobs;

-- Grant schema permissions
GRANT USAGE, CREATE ON SCHEMA audit TO waste_mgmt_app;
GRANT USAGE, CREATE ON SCHEMA spatial TO waste_mgmt_app;
GRANT USAGE, CREATE ON SCHEMA reporting TO waste_mgmt_app;
GRANT USAGE, CREATE ON SCHEMA jobs TO waste_mgmt_app;

GRANT USAGE ON SCHEMA audit TO waste_mgmt_readonly;
GRANT USAGE ON SCHEMA spatial TO waste_mgmt_readonly;
GRANT USAGE ON SCHEMA reporting TO waste_mgmt_readonly;
GRANT USAGE ON SCHEMA jobs TO waste_mgmt_readonly;

-- Performance optimization: Create common indexes
-- These will be recreated by Sequelize migrations, but provide initial performance

-- Log successful initialization
INSERT INTO pg_stat_statements_reset();

-- Output success message
\echo 'Database initialization completed successfully'
\echo 'Extensions enabled: uuid-ossp, postgis, postgis_topology, fuzzystrmatch, postgis_tiger_geocoder, pg_stat_statements, pg_trgm, btree_gin, btree_gist'
\echo 'Users created: waste_mgmt_app, waste_mgmt_readonly, waste_mgmt_monitor'
\echo 'Schemas created: audit, spatial, reporting, jobs'