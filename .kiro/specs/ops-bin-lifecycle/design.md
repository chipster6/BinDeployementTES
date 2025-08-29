# Design Document

## Overview

The Operations Service — Bin Lifecycle & Drop-Bin Ingestion implements a contract-first API boundary for waste management operations. The design follows event-driven architecture patterns with comprehensive idempotency, concurrency control, and observability features. The service operates within the existing monolith initially, with clear extraction boundaries for future service decomposition.

## Architecture

### Service Boundaries

The operations service manages three core domains:
- **Bin Lifecycle**: CRUD operations for bin entities with spatial data
- **Drop-Bin Ingestion**: Idempotent processing of external bin data
- **Service Orders**: Scheduling and dispatch coordination

### API Design Patterns

- **Contract-First**: OpenAPI 3.0 specification drives implementation
- **Idempotency**: Required for all state-changing operations using Idempotency-Key header
- **Optimistic Concurrency**: ETag/If-Match headers for update operations
- **Uniform Error Handling**: Standardized ErrorEnvelope schema across all endpoints
- **Event-Driven**: Outbox pattern for reliable event publishing

### Data Flow

```
Client Request → Gateway → Operations API → Business Logic → Database + Outbox → Event Publisher → Downstream Services
```

## Components and Interfaces

### REST API Endpoints

#### Bin Management
- `GET /ops/bins` - List bins with pagination and filtering
- `POST /ops/bins` - Create new bin (idempotent)
- `GET /ops/bins/{id}` - Retrieve bin details
- `PATCH /ops/bins/{id}` - Update bin metadata (with ETag)
- `POST /ops/bins/{id}/capacity` - Update capacity (with ETag)

#### Drop-Bin Ingestion
- `POST /ops/ingest/dropbin` - Ingest external bin data (idempotent)

#### Service Orders
- `POST /ops/orders` - Create service order (idempotent)

### Request/Response Schemas

#### Common Components
```yaml
ErrorEnvelope:
  type: object
  required: [error, message]
  properties:
    error: string
    message: string
    meta: object

ConflictDetails:
  allOf:
    - $ref: '#/components/schemas/ErrorEnvelope'
    - properties:
        conflictType: string
        conflictingResourceId: string
        window: object
        suggestions: array
```

#### Headers
- `Idempotency-Key`: UUID for deduplication (24h TTL)
- `If-Match`: ETag for optimistic concurrency
- `X-Tenant-Id`: Tenant context propagation
- `X-API-Version`: Optional version selection

### Event Schemas

#### Event Envelope
```json
{
  "event_id": "3c7e9e3e-8c3c-4c2f-9c4f-2adc1a7f4b42",
  "event_version": 1,
  "occurred_at": "2025-01-01T00:00:00Z",
  "producer": "operations-service",
  "data": {
    "bin_id": "B-1",
    "serial_number": "SN-123",
    "type": "ROLL_OFF",
    "capacity_m3": 10.0,
    "customer_id": "C-1",
    "geo": { "lat": 45.5, "lon": -73.6 }
  }
}
```

#### Domain Events
- `ops.customer.created`
- `ops.bin.created`
- `ops.bin.capacity.updated`
- `ops.service.order.scheduled`
- `ops.pickup.completed`

## Data Models

### Database Schema

#### Database Prerequisites
```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

#### Bins Table
```sql
CREATE TABLE bins (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  serial_number VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  capacity_m3 DECIMAL(5,2) NOT NULL,
  customer_id UUID NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  etag VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bins_tenant_serial ON bins(tenant_id, serial_number);
CREATE UNIQUE INDEX ux_bins_id_tenant ON bins(id, tenant_id);
CREATE INDEX idx_bins_tenant ON bins(tenant_id);
CREATE INDEX idx_bins_customer ON bins(customer_id);
CREATE INDEX idx_bins_location ON bins USING GIST(location);

-- ETag generation triggers
CREATE OR REPLACE FUNCTION make_etag(anyelement) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(row_to_json($1)::text, 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION bins_set_etag() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.etag := make_etag(ROW(NEW.serial_number, NEW.type, NEW.capacity_m3, NEW.customer_id, NEW.location, NEW.status));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bins_etag BEFORE INSERT OR UPDATE ON bins 
FOR EACH ROW EXECUTE FUNCTION bins_set_etag();
```

#### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  bin_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  scheduled_for TIMESTAMPTZ NOT NULL,
  etag VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_scheduled ON orders(scheduled_for);
CREATE INDEX idx_orders_bin ON orders(bin_id);

-- ETag generation triggers
CREATE OR REPLACE FUNCTION orders_set_etag() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.etag := make_etag(ROW(NEW.customer_id, NEW.bin_id, NEW.type, NEW.status, NEW.scheduled_for));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_etag BEFORE INSERT OR UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION orders_set_etag();

-- Foreign key constraints and tenant isolation
ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_bins_tenant 
  FOREIGN KEY (bin_id, tenant_id) REFERENCES bins(id, tenant_id);
```

#### Ingestions Table
```sql
CREATE TABLE ingestions (
  id UUID PRIMARY KEY,
  bin_id UUID NOT NULL,
  payload_ref TEXT NOT NULL,
  actions JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'QUEUED',
  idem_key VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ingestions_idem ON ingestions(tenant_id, idem_key);

-- Validation constraints
ALTER TABLE ingestions 
  ADD CONSTRAINT ck_ing_actions_array CHECK (jsonb_typeof(actions) = 'array'),
  ADD CONSTRAINT ck_ing_payload_ref CHECK (payload_ref ~ '^cas://sha256/[0-9a-f]{64}$');
```

#### Outbox Table
```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

ALTER TABLE outbox_events ADD CONSTRAINT uq_outbox_event_id UNIQUE (event_id);
CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at);
```

### Idempotency Management

#### Deduplication Strategy
- Key: `(tenant_id, idempotency_key)`
- TTL: 24 hours
- Storage: Redis with automatic expiration
- Response: Return cached response for duplicate requests

#### Implementation
```typescript
interface IdempotencyRecord {
  status: number;
  http: any;
  body: any;
  created_at: Date;
}

// Redis key format: ops:{tenant_id}:idem:{Idempotency-Key}
// TTL: 24 hours
// On replay: return cached http/body
```

## Error Handling

### Error Categories

#### Client Errors (4xx)
- `400 Bad Request`: Validation failures
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Resource conflicts or scheduling overlaps
- `412 Precondition Failed`: ETag mismatch
- `413 Payload Too Large`: Request size exceeds limits
- `422 Unprocessable Entity`: Business logic violations
- `429 Too Many Requests`: Rate limit exceeded

#### Server Errors (5xx)
- `500 Internal Server Error`: Unexpected system failures
- `503 Service Unavailable`: Temporary service degradation

### Error Response Format
```json
{
  "error": "CONFLICT",
  "message": "Scheduling conflict detected",
  "meta": {
    "conflictType": "SCHEDULE_OVERLAP",
    "conflictingResourceId": "O-123",
    "window": {
      "start": "2025-01-01T10:00:00Z",
      "end": "2025-01-01T12:00:00Z"
    },
    "suggestions": ["2025-01-01T14:00:00Z", "2025-01-02T10:00:00Z"]
  }
}
```

## Testing Strategy

### Contract Testing
- OpenAPI specification validation
- JSON Schema validation for events
- Example payload verification
- Response format compliance

### Integration Testing
- End-to-end API workflows
- Database transaction integrity
- Event publishing verification
- Idempotency behavior validation

### Performance Testing
- Load testing at specified concurrency levels
- SLO compliance verification
- Database query optimization validation
- Memory and CPU usage profiling

### Security Testing
- Authentication and authorization validation
- Input sanitization verification
- PII exclusion in events
- Rate limiting effectiveness

## Security Architecture

### Authentication
- Bearer JWT tokens with `aud=operations`
- Required scopes: `ops:bins.write`, `ops:orders.write`, `ops:bins.read`
- Token validation at API gateway level

### Authorization
- ABAC (Attribute-Based Access Control) policies
- Tenant isolation enforcement
- Resource-level permission checks
- Audit logging for all operations

### Data Protection
- PII exclusion from events (ID references only)
- Field-level encryption for sensitive data
- Secure payload reference handling
- Comprehensive audit trails

## Performance and Scalability

### SLO Targets
- CRUD operations: p95 < 150ms
- Ingestion accept: p95 < 150ms
- Order scheduling: p95 < 300ms
- Throughput: 100 RPS steady, 500 RPS burst

### Optimization Strategies
- PostGIS spatial indexing for location queries
- Connection pooling for database access
- Redis caching for idempotency records
- Asynchronous event processing
- Query optimization with strategic indexes

### Rate Limiting
- `/ingest/dropbin`: 200 rpm per tenant (burst 400, 60s window)
- `/orders`: 120 rpm per tenant
- Global rate limiting at API gateway
- 429 responses with Retry-After headers

### Event Delivery Policy
- Backoff: 100ms → 10s (exponential), max 10 attempts
- DLQ topic: `ops.dlq` for failed events
- Consumer idempotency key: `event_id`
- At-least-once delivery guarantee

## Observability

### Metrics
- `ops_ingest_accept_total`: Total ingestion requests (labels: tenant_id, route, status_code)
- `ops_ingest_duration_ms`: Ingestion processing time (labels: tenant_id, route)
- `ops_order_schedule_total`: Total order scheduling requests (labels: tenant_id, route, status_code)
- `ops_error_rate`: Error rate by endpoint and status code (labels: tenant_id, route, status_code)
- `ops_concurrent_requests`: Active request count (labels: tenant_id, route)

### Tracing
- OpenTelemetry instrumentation
- Distributed tracing across gateway → operations → queue
- Correlation IDs for request tracking
- Performance bottleneck identification

### Logging
- Structured JSON logging
- Request/response correlation
- Error context preservation
- Audit event logging with signed daily checkpoints

### Alerting
- SLO breach notifications
- Error rate threshold alerts
- Queue depth monitoring
- Database performance degradation alerts

### Contract Validation
- OpenAPI specification compliance with vendor rate limit fields
- JSON Schema validation for all event types with example payloads
- Event examples stored in `contracts/events/examples/*.json`
- AJV validation in CI pipeline

### Error Response Semantics
- `If-Match` header mismatch → 412 Precondition Failed
- Scheduling conflicts → 409 Conflict with ConflictDetails
- Rate limit exceeded → 429 Too Many Requests with Retry-After header