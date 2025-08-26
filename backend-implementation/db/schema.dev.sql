-- Development baseline schema - idempotent and reset-friendly
-- Agent: db_architect
-- Scope: Single source of truth for dev environment

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function for deterministic ETags
CREATE OR REPLACE FUNCTION make_etag(anyelement) RETURNS TEXT 
LANGUAGE sql IMMUTABLE AS $$
SELECT encode(digest(row_to_json($1)::text, 'sha256'), 'hex')
$$;

-- Bins table
CREATE TABLE IF NOT EXISTS bins (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  serial_number VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  capacity_m3 DECIMAL(5,2) NOT NULL,
  customer_id UUID NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  etag VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bins_tenant_serial ON bins(tenant_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_bins_location ON bins USING GIST(location);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  bin_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  scheduled_for TIMESTAMPTZ NOT NULL,
  etag VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingestions table
CREATE TABLE IF NOT EXISTS ingestions (
  id UUID PRIMARY KEY,
  bin_id UUID NOT NULL,
  payload_ref TEXT NOT NULL,
  actions JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  idem_key VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingestions_idem ON ingestions(tenant_id, idem_key);

-- Outbox events table
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

ALTER TABLE outbox_events ADD CONSTRAINT IF NOT EXISTS uq_outbox_event_id UNIQUE (event_id);

-- ETag triggers for bins
CREATE OR REPLACE FUNCTION bins_set_etag() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.etag := make_etag(ROW(NEW.serial_number, NEW.type, NEW.capacity_m3, NEW.customer_id, NEW.location, NEW.status));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bins_etag ON bins;
CREATE TRIGGER trg_bins_etag BEFORE INSERT OR UPDATE ON bins FOR EACH ROW EXECUTE FUNCTION bins_set_etag();

-- ETag triggers for orders
CREATE OR REPLACE FUNCTION orders_set_etag() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.etag := make_etag(ROW(NEW.customer_id, NEW.bin_id, NEW.type, NEW.status, NEW.scheduled_for));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_etag ON orders;
CREATE TRIGGER trg_orders_etag BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION orders_set_etag();