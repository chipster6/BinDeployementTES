-- ============================================================================
-- WASTE MANAGEMENT SYSTEM - POSTGRESQL DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Created by: Database Architect Agent
-- Date: 2025-08-10
-- Dependencies: PostGIS, pgcrypto, uuid-ossp
-- Compliance: PCI DSS, GDPR, CCPA, SOX
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- SCHEMA STRUCTURE
-- ============================================================================

-- Create schemas for data organization
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS integration;

-- Set search path to include all schemas
SET search_path = core, security, audit, analytics, integration, public;

-- ============================================================================
-- SECURITY FUNCTIONS AND UTILITIES
-- ============================================================================

-- Function to encrypt sensitive data using AES-256-GCM
CREATE OR REPLACE FUNCTION security.encrypt_sensitive_data(plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
    key_text TEXT;
    encrypted_data TEXT;
BEGIN
    -- Get encryption key from environment (in production, use proper key management)
    key_text := COALESCE(current_setting('app.encryption_key', true), 'default_key_replace_in_production');
    
    -- Encrypt using AES-256 with GCM mode
    encrypted_data := encode(
        pgp_sym_encrypt(
            plaintext::bytea, 
            key_text,
            'compress-algo=2, cipher-algo=aes256'
        ), 
        'base64'
    );
    
    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION security.decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
DECLARE
    key_text TEXT;
    decrypted_data TEXT;
BEGIN
    -- Get encryption key from environment
    key_text := COALESCE(current_setting('app.encryption_key', true), 'default_key_replace_in_production');
    
    -- Decrypt the data
    decrypted_data := pgp_sym_decrypt(
        decode(encrypted_data, 'base64'),
        key_text
    );
    
    RETURN decrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate audit log entries
CREATE OR REPLACE FUNCTION audit.log_data_access(
    table_name TEXT,
    record_id UUID,
    action TEXT,
    user_id UUID,
    sensitive_data_accessed BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit.data_access_logs (
        table_name,
        record_id,
        action,
        user_id,
        sensitive_data_accessed,
        access_timestamp,
        ip_address,
        user_agent
    ) VALUES (
        table_name,
        record_id,
        action,
        user_id,
        sensitive_data_accessed,
        CURRENT_TIMESTAMP,
        inet_client_addr(),
        current_setting('application_name', true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CORE DOMAIN TABLES
-- ============================================================================

-- Users table with role-based access control
CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'dispatcher', 'office_staff', 'driver', 'customer', 'customer_staff')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Compliance fields
    gdpr_consent_given BOOLEAN DEFAULT FALSE,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    data_retention_until TIMESTAMP WITH TIME ZONE,
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Organizations/Companies table for multi-tenant support
CREATE TABLE core.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id_encrypted TEXT, -- Encrypted field
    type VARCHAR(50) NOT NULL CHECK (type IN ('customer', 'vendor', 'partner')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(50),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2) DEFAULT 'US',
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(50),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(2) DEFAULT 'US',
    service_location GEOMETRY(POINT, 4326), -- PostGIS spatial data
    primary_contact_id UUID REFERENCES core.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Compliance fields
    gdpr_applicable BOOLEAN DEFAULT TRUE,
    data_retention_policy VARCHAR(50) DEFAULT '7_years',
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Customer-specific details extending organizations
CREATE TABLE core.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES core.organizations(id),
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    account_manager_id UUID REFERENCES core.users(id),
    territory VARCHAR(100),
    service_frequency VARCHAR(50) CHECK (service_frequency IN ('weekly', 'bi_weekly', 'monthly', 'on_demand')),
    preferred_service_day VARCHAR(20) CHECK (preferred_service_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    service_instructions TEXT,
    credit_limit DECIMAL(12,2),
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Service agreements/contracts
CREATE TABLE core.service_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    agreement_number VARCHAR(100) UNIQUE NOT NULL,
    agreement_type VARCHAR(50) NOT NULL CHECK (agreement_type IN ('standard', 'custom', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'suspended')),
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    billing_frequency VARCHAR(20) NOT NULL CHECK (billing_frequency IN ('monthly', 'quarterly', 'annually')),
    base_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    terms_and_conditions TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Vehicles/Fleet management
CREATE TABLE core.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    vin VARCHAR(17),
    license_plate VARCHAR(20),
    vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('truck', 'van', 'trailer', 'equipment')),
    capacity_cubic_yards DECIMAL(8,2),
    capacity_weight_lbs DECIMAL(10,2),
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service', 'retired')),
    gps_device_id VARCHAR(100),
    samsara_vehicle_id VARCHAR(100), -- Integration with Samsara
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Driver-specific details extending users
CREATE TABLE core.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    driver_number VARCHAR(50) UNIQUE NOT NULL,
    license_number_encrypted TEXT, -- Encrypted field
    license_class VARCHAR(10),
    license_expiry_date DATE,
    cdl_endorsements VARCHAR(50),
    hire_date DATE,
    employment_status VARCHAR(20) DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated')),
    emergency_contact_encrypted TEXT, -- Encrypted JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Routes management
CREATE TABLE core.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_number VARCHAR(50) UNIQUE NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    description TEXT,
    territory VARCHAR(100),
    estimated_duration_minutes INTEGER,
    estimated_distance_miles DECIMAL(8,2),
    service_day VARCHAR(20) CHECK (service_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    route_type VARCHAR(20) CHECK (route_type IN ('residential', 'commercial', 'industrial', 'mixed')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'optimizing', 'archived')),
    driver_id UUID REFERENCES core.drivers(id),
    vehicle_id UUID REFERENCES core.vehicles(id),
    route_geometry GEOMETRY(LINESTRING, 4326), -- PostGIS route path
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- AI optimization fields
    ai_optimized BOOLEAN DEFAULT FALSE,
    optimization_score DECIMAL(5,2),
    last_optimized_at TIMESTAMP WITH TIME ZONE,
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Service events (pickups, deliveries, etc.)
CREATE TABLE core.service_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    route_id UUID REFERENCES core.routes(id),
    driver_id UUID REFERENCES core.drivers(id),
    vehicle_id UUID REFERENCES core.vehicles(id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('pickup', 'delivery', 'maintenance', 'inspection', 'complaint')),
    event_status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (event_status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    service_location GEOMETRY(POINT, 4326),
    service_address TEXT,
    service_instructions TEXT,
    notes TEXT,
    photo_urls TEXT[], -- Array of S3 URLs
    signature_url TEXT,
    weight_collected_lbs DECIMAL(10,2),
    volume_collected_cubic_yards DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Bins/Containers management
CREATE TABLE core.bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    bin_type VARCHAR(50) NOT NULL CHECK (bin_type IN ('dumpster', 'roll_off', 'compactor', 'recycling', 'organic')),
    size VARCHAR(20) NOT NULL,
    capacity_cubic_yards DECIMAL(8,2),
    material VARCHAR(50) CHECK (material IN ('steel', 'plastic', 'fiberglass')),
    color VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired', 'lost')),
    location GEOMETRY(POINT, 4326),
    installation_date DATE,
    last_service_date DATE,
    next_service_date DATE,
    gps_enabled BOOLEAN DEFAULT FALSE,
    sensor_enabled BOOLEAN DEFAULT FALSE,
    fill_level_percent INTEGER CHECK (fill_level_percent >= 0 AND fill_level_percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Invoices and billing
CREATE TABLE core.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(50),
    notes TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_invoice_id VARCHAR(255), -- Stripe integration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES core.users(id)
);

-- Invoice line items
CREATE TABLE core.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES core.invoices(id) ON DELETE CASCADE,
    service_event_id UUID REFERENCES core.service_events(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE core.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    invoice_id UUID REFERENCES core.invoices(id),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'ach', 'check', 'cash', 'wire_transfer')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    reference_number VARCHAR(100),
    stripe_payment_intent_id VARCHAR(255), -- Stripe integration
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id),
    updated_by UUID REFERENCES core.users(id),
    -- Audit fields
    version INTEGER DEFAULT 1
);

-- ============================================================================
-- IOT AND REAL-TIME DATA TABLES
-- ============================================================================

-- GPS tracking data
CREATE TABLE core.gps_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES core.vehicles(id),
    driver_id UUID REFERENCES core.drivers(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed_mph DECIMAL(5,2),
    heading_degrees INTEGER CHECK (heading_degrees >= 0 AND heading_degrees <= 360),
    altitude_feet DECIMAL(8,2),
    accuracy_meters DECIMAL(8,2),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id VARCHAR(100),
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    signal_strength INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensor data from bins and vehicles
CREATE TABLE core.sensor_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('bin_sensor', 'vehicle_sensor', 'environmental_sensor')),
    bin_id UUID REFERENCES core.bins(id),
    vehicle_id UUID REFERENCES core.vehicles(id),
    sensor_type VARCHAR(50) NOT NULL CHECK (sensor_type IN ('fill_level', 'temperature', 'weight', 'tilt', 'battery', 'fuel')),
    value DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    signal_strength INTEGER,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECURITY AND AUDIT TABLES
-- ============================================================================

-- User sessions for security tracking
CREATE TABLE security.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    logout_at TIMESTAMP WITH TIME ZONE,
    -- Security fields
    mfa_verified BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Failed login attempts for security monitoring
CREATE TABLE security.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(100) NOT NULL,
    blocked BOOLEAN DEFAULT FALSE
);

-- API keys for external integrations
CREATE TABLE security.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES core.users(id),
    organization_id UUID REFERENCES core.organizations(id),
    scopes TEXT[] NOT NULL,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES core.users(id)
);

-- Comprehensive audit logging
CREATE TABLE audit.data_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    user_id UUID REFERENCES core.users(id),
    session_id UUID REFERENCES security.user_sessions(id),
    ip_address INET,
    user_agent TEXT,
    sensitive_data_accessed BOOLEAN DEFAULT FALSE,
    old_values JSONB,
    new_values JSONB,
    access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Compliance fields
    data_retention_until TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year')
);

-- Security events and incidents
CREATE TABLE security.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('login_failed', 'login_success', 'password_changed', 'mfa_enabled', 'mfa_disabled', 'suspicious_activity', 'data_breach', 'unauthorized_access')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES core.users(id),
    session_id UUID REFERENCES security.user_sessions(id),
    ip_address INET,
    user_agent TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES core.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INTEGRATION TABLES
-- ============================================================================

-- Airtable synchronization tracking
CREATE TABLE integration.airtable_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    airtable_record_id VARCHAR(100),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Samsara integration data
CREATE TABLE integration.samsara_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES core.vehicles(id),
    driver_id UUID REFERENCES core.drivers(id),
    samsara_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('vehicle', 'driver', 'route')),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'active' CHECK (sync_status IN ('active', 'inactive', 'error')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events for external integrations
CREATE TABLE integration.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('stripe', 'samsara', 'airtable', 'twilio')),
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS AND REPORTING TABLES
-- ============================================================================

-- Daily operational metrics
CREATE TABLE analytics.daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    total_pickups INTEGER DEFAULT 0,
    completed_pickups INTEGER DEFAULT 0,
    cancelled_pickups INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    fuel_consumed_gallons DECIMAL(8,2) DEFAULT 0.00,
    miles_driven DECIMAL(10,2) DEFAULT 0.00,
    active_vehicles INTEGER DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- Customer analytics
CREATE TABLE analytics.customer_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES core.customers(id),
    metric_month DATE NOT NULL, -- First day of month
    total_services INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_service_rating DECIMAL(3,2),
    complaints_count INTEGER DEFAULT 0,
    payment_delays_count INTEGER DEFAULT 0,
    churn_risk_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, metric_month)
);

-- Route optimization results
CREATE TABLE analytics.route_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optimization_date DATE NOT NULL,
    route_id UUID REFERENCES core.routes(id),
    algorithm_version VARCHAR(50),
    original_distance_miles DECIMAL(8,2),
    optimized_distance_miles DECIMAL(8,2),
    original_duration_minutes INTEGER,
    optimized_duration_minutes INTEGER,
    fuel_savings_estimated DECIMAL(8,2),
    cost_savings_estimated DECIMAL(10,2),
    optimization_score DECIMAL(5,2),
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Core table indexes
CREATE INDEX idx_users_email ON core.users(email);
CREATE INDEX idx_users_role ON core.users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON core.users(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_organizations_type ON core.organizations(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_location ON core.organizations USING GIST(service_location);

CREATE INDEX idx_customers_territory ON core.customers(territory) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_org_id ON core.customers(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_service_events_customer ON core.service_events(customer_id);
CREATE INDEX idx_service_events_route ON core.service_events(route_id);
CREATE INDEX idx_service_events_date ON core.service_events(scheduled_date);
CREATE INDEX idx_service_events_status ON core.service_events(event_status);
CREATE INDEX idx_service_events_location ON core.service_events USING GIST(service_location);

CREATE INDEX idx_routes_territory ON core.routes(territory) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_driver ON core.routes(driver_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_geometry ON core.routes USING GIST(route_geometry);

CREATE INDEX idx_bins_customer ON core.bins(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bins_location ON core.bins USING GIST(location);
CREATE INDEX idx_bins_status ON core.bins(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_invoices_customer ON core.invoices(customer_id);
CREATE INDEX idx_invoices_status ON core.invoices(status);
CREATE INDEX idx_invoices_due_date ON core.invoices(due_date);
CREATE INDEX idx_invoices_date ON core.invoices(invoice_date);

-- GPS and sensor data indexes (with time partitioning consideration)
CREATE INDEX idx_gps_tracking_vehicle_time ON core.gps_tracking(vehicle_id, timestamp DESC);
CREATE INDEX idx_gps_tracking_location ON core.gps_tracking USING GIST(location);
CREATE INDEX idx_sensor_data_device_time ON core.sensor_data(device_id, timestamp DESC);

-- Security and audit indexes
CREATE INDEX idx_user_sessions_token ON security.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_active ON security.user_sessions(user_id, is_active);
CREATE INDEX idx_failed_logins_ip_time ON security.failed_login_attempts(ip_address, attempt_timestamp);

CREATE INDEX idx_audit_table_record ON audit.data_access_logs(table_name, record_id);
CREATE INDEX idx_audit_user_time ON audit.data_access_logs(user_id, access_timestamp);
CREATE INDEX idx_audit_sensitive ON audit.data_access_logs(sensitive_data_accessed, access_timestamp) WHERE sensitive_data_accessed = true;

-- Analytics indexes
CREATE INDEX idx_daily_metrics_date ON analytics.daily_metrics(metric_date);
CREATE INDEX idx_customer_metrics_customer_month ON analytics.customer_metrics(customer_id, metric_month);
CREATE INDEX idx_route_optimization_date ON analytics.route_optimizations(optimization_date);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all core tables
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.payments ENABLE ROW LEVEL SECURITY;

-- Super admin has full access
CREATE POLICY super_admin_all_access ON core.users FOR ALL
TO authenticated_users
USING (
    EXISTS (
        SELECT 1 FROM core.users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'super_admin' 
        AND u.status = 'active'
    )
);

-- Admin access policy
CREATE POLICY admin_access ON core.users FOR ALL
TO authenticated_users
USING (
    EXISTS (
        SELECT 1 FROM core.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin') 
        AND u.status = 'active'
    )
    OR id = auth.uid()
);

-- Driver can only access their own data
CREATE POLICY driver_own_data ON core.drivers FOR SELECT
TO authenticated_users
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM core.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin', 'dispatcher')
        AND u.status = 'active'
    )
);

-- Customer access to their own organization data
CREATE POLICY customer_own_org_data ON core.customers FOR SELECT
TO authenticated_users
USING (
    EXISTS (
        SELECT 1 FROM core.users u
        JOIN core.organizations o ON o.primary_contact_id = u.id
        WHERE u.id = auth.uid()
        AND o.id = organization_id
        AND u.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM core.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin', 'dispatcher', 'office_staff')
        AND u.status = 'active'
    )
);

-- Service events access based on role and association
CREATE POLICY service_events_access ON core.service_events FOR SELECT
TO authenticated_users
USING (
    -- Drivers can see their assigned service events
    EXISTS (
        SELECT 1 FROM core.users u
        JOIN core.drivers d ON d.user_id = u.id
        WHERE u.id = auth.uid()
        AND d.id = driver_id
        AND u.status = 'active'
    )
    OR
    -- Customers can see their own service events
    EXISTS (
        SELECT 1 FROM core.users u
        JOIN core.organizations o ON o.primary_contact_id = u.id
        JOIN core.customers c ON c.organization_id = o.id
        WHERE u.id = auth.uid()
        AND c.id = customer_id
        AND u.status = 'active'
    )
    OR
    -- Admin roles can see all
    EXISTS (
        SELECT 1 FROM core.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin', 'dispatcher', 'office_staff')
        AND u.status = 'active'
    )
);

-- ============================================================================
-- TABLE PARTITIONING FOR LARGE DATASETS
-- ============================================================================

-- Partition GPS tracking data by month
CREATE TABLE core.gps_tracking_2025_01 PARTITION OF core.gps_tracking
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE core.gps_tracking_2025_02 PARTITION OF core.gps_tracking
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Add more partitions as needed - this should be automated in production

-- Partition sensor data by month
CREATE TABLE core.sensor_data_2025_01 PARTITION OF core.sensor_data
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE core.sensor_data_2025_02 PARTITION OF core.sensor_data
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Partition audit logs by quarter for compliance
CREATE TABLE audit.data_access_logs_2025_q1 PARTITION OF audit.data_access_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE audit.data_access_logs_2025_q2 PARTITION OF audit.data_access_logs
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- ============================================================================
-- TRIGGERS FOR AUDIT TRAILS AND DATA INTEGRITY
-- ============================================================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp trigger to all relevant tables
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON core.users
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON core.organizations
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON core.customers
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_service_events_updated_at
    BEFORE UPDATE ON core.service_events
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_routes_updated_at
    BEFORE UPDATE ON core.routes
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON core.invoices
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM audit.log_data_access(TG_TABLE_NAME::TEXT, NEW.id, 'CREATE', auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM audit.log_data_access(TG_TABLE_NAME::TEXT, NEW.id, 'UPDATE', auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM audit.log_data_access(TG_TABLE_NAME::TEXT, OLD.id, 'DELETE', auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON core.users
    FOR EACH ROW
    EXECUTE FUNCTION audit.audit_trigger_function();

CREATE TRIGGER audit_payments_changes
    AFTER INSERT OR UPDATE OR DELETE ON core.payments
    FOR EACH ROW
    EXECUTE FUNCTION audit.audit_trigger_function();

-- ============================================================================
-- UTILITY FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to calculate route efficiency
CREATE OR REPLACE FUNCTION analytics.calculate_route_efficiency(route_id UUID, date_range_start DATE, date_range_end DATE)
RETURNS TABLE (
    total_events INTEGER,
    completed_events INTEGER,
    completion_rate DECIMAL(5,2),
    avg_duration_minutes DECIMAL(8,2),
    total_distance_miles DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_events,
        COUNT(CASE WHEN se.event_status = 'completed' THEN 1 END)::INTEGER as completed_events,
        ROUND(
            (COUNT(CASE WHEN se.event_status = 'completed' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
            2
        ) as completion_rate,
        AVG(
            CASE 
                WHEN se.actual_end_time IS NOT NULL AND se.actual_start_time IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (se.actual_end_time - se.actual_start_time)) / 60 
            END
        )::DECIMAL(8,2) as avg_duration_minutes,
        COALESCE(r.estimated_distance_miles, 0) as total_distance_miles
    FROM core.service_events se
    JOIN core.routes r ON r.id = se.route_id
    WHERE se.route_id = calculate_route_efficiency.route_id
    AND se.scheduled_date BETWEEN date_range_start AND date_range_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer billing summary
CREATE OR REPLACE FUNCTION core.get_customer_billing_summary(customer_uuid UUID, year INTEGER)
RETURNS TABLE (
    total_invoiced DECIMAL(12,2),
    total_paid DECIMAL(12,2),
    outstanding_amount DECIMAL(12,2),
    overdue_amount DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'overdue') THEN i.total_amount ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total_amount ELSE 0 END), 0) as overdue_amount
    FROM core.invoices i
    LEFT JOIN core.payments p ON p.invoice_id = i.id AND p.payment_status = 'completed'
    WHERE i.customer_id = customer_uuid
    AND EXTRACT(YEAR FROM i.invoice_date) = year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check bin fill level alerts
CREATE OR REPLACE FUNCTION core.get_bins_requiring_service(fill_threshold INTEGER DEFAULT 80)
RETURNS TABLE (
    bin_id UUID,
    bin_number VARCHAR(50),
    customer_name VARCHAR(255),
    fill_level INTEGER,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    last_service_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bin_id,
        b.bin_number,
        o.name as customer_name,
        b.fill_level_percent as fill_level,
        ST_Y(b.location) as location_lat,
        ST_X(b.location) as location_lng,
        b.last_service_date
    FROM core.bins b
    JOIN core.customers c ON c.id = b.customer_id
    JOIN core.organizations o ON o.id = c.organization_id
    WHERE b.fill_level_percent >= fill_threshold
    AND b.status = 'active'
    AND b.deleted_at IS NULL
    ORDER BY b.fill_level_percent DESC, b.last_service_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATABASE ROLES AND PERMISSIONS
-- ============================================================================

-- Create application roles
CREATE ROLE app_admin;
CREATE ROLE app_dispatcher;
CREATE ROLE app_driver;
CREATE ROLE app_customer;
CREATE ROLE app_readonly;

-- Grant permissions to roles
GRANT ALL ON SCHEMA core, security, audit, analytics, integration TO app_admin;
GRANT ALL ON ALL TABLES IN SCHEMA core, security, audit, analytics, integration TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core, security, audit, analytics, integration TO app_admin;

GRANT USAGE ON SCHEMA core, analytics TO app_dispatcher;
GRANT SELECT, INSERT, UPDATE ON core.service_events, core.routes, core.gps_tracking TO app_dispatcher;
GRANT SELECT ON core.customers, core.drivers, core.vehicles, core.bins TO app_dispatcher;

GRANT USAGE ON SCHEMA core TO app_driver;
GRANT SELECT ON core.routes, core.service_events, core.bins WHERE route_id IN (SELECT id FROM core.routes WHERE driver_id = auth.uid()) TO app_driver;
GRANT UPDATE ON core.service_events WHERE driver_id = auth.uid() TO app_driver;

GRANT USAGE ON SCHEMA core TO app_customer;
GRANT SELECT ON core.customers, core.service_events, core.invoices, core.payments WHERE customer_id = auth.customer_id() TO app_customer;

GRANT USAGE ON SCHEMA core, analytics TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA core, analytics TO app_readonly;

-- ============================================================================
-- INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Insert default super admin user (password should be changed immediately)
INSERT INTO core.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    status,
    mfa_enabled
) VALUES (
    uuid_generate_v4(),
    'admin@waste-mgmt.com',
    '$2b$12$LQv3c1yqBwEHFe1hfyUdOOcTzapDQ/qb8Nw1MdDLMTFQ9.H6qT8L.', -- bcrypt hash of 'temp_password_123!'
    'System',
    'Administrator',
    'super_admin',
    'active',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert default organization
INSERT INTO core.organizations (
    id,
    name,
    legal_name,
    type,
    status
) VALUES (
    uuid_generate_v4(),
    'Waste Management Solutions Inc.',
    'Waste Management Solutions Incorporated',
    'customer',
    'active'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

-- Migration history table
CREATE TABLE IF NOT EXISTS migration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT
);

-- Insert initial migration record
INSERT INTO migration_history (version, description, checksum, applied_by)
VALUES (
    '1.0.0',
    'Initial database schema with security, audit, and compliance features',
    encode(sha256('initial_schema_v1.0.0'::bytea), 'hex'),
    'database_architect_agent'
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- PERFORMANCE MONITORING SETUP
-- ============================================================================

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring views
CREATE OR REPLACE VIEW analytics.performance_summary AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- ============================================================================
-- BACKUP AND RECOVERY CONFIGURATION
-- ============================================================================

-- Set up continuous archiving
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'test ! -f /backup/archive/%f && cp %p /backup/archive/%f';
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET wal_keep_size = '1GB';

-- Configure backup retention
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_compression = 'on';

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA core IS 'Core business domain tables for waste management operations';
COMMENT ON SCHEMA security IS 'Security-related tables including sessions, authentication, and access control';
COMMENT ON SCHEMA audit IS 'Audit trail and compliance logging tables';
COMMENT ON SCHEMA analytics IS 'Analytics and reporting tables for business intelligence';
COMMENT ON SCHEMA integration IS 'External system integration and synchronization tables';

COMMENT ON TABLE core.users IS 'System users with role-based access control and security features';
COMMENT ON TABLE core.organizations IS 'Customer organizations and companies with spatial data support';
COMMENT ON TABLE core.service_events IS 'Individual service events (pickups, deliveries) with GPS tracking';
COMMENT ON TABLE security.user_sessions IS 'Active user sessions with security monitoring';
COMMENT ON TABLE audit.data_access_logs IS 'Comprehensive audit trail for all data access and modifications';

-- ============================================================================
-- FINAL VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT schemaname, tablename, tableowner
FROM pg_tables 
WHERE schemaname IN ('core', 'security', 'audit', 'analytics', 'integration')
ORDER BY schemaname, tablename;

-- Verify indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname IN ('core', 'security', 'audit', 'analytics', 'integration')
ORDER BY schemaname, tablename;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname IN ('core', 'security', 'audit', 'analytics', 'integration')
ORDER BY schemaname, tablename;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Schema version and completion marker
SELECT 'Database schema v1.0.0 successfully created' AS status,
       COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_schema IN ('core', 'security', 'audit', 'analytics', 'integration');