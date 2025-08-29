# Requirements Document

## Introduction

The Operations Service — Bin Lifecycle & Drop-Bin Ingestion feature establishes a stable, contract-first boundary for bin CRUD operations, drop-bin ingestion, and dispatch hand-offs while the monolith is refactored and services are extracted. This feature enables idempotent ingestion with full auditability and decouples TES and future partners via adapters and events.

## Requirements

### Requirement 1

**User Story:** As a waste management operator, I want to manage bin lifecycle operations through a standardized API, so that I can create, update, and track bins consistently across the system.

#### Acceptance Criteria

1. WHEN a bin creation request is submitted with Idempotency-Key THEN the system SHALL create a new bin with unique ID, emit a bin.created event, and deduplicate on (tenant, key)
2. WHEN a bin update request is submitted with If-Match ETag THEN the system SHALL update the bin metadata/status with optimistic concurrency control
3. WHEN a bin capacity update is requested with If-Match ETag THEN the system SHALL update capacity, emit bin.capacity.updated event, and handle 409/412 conflicts
4. WHEN bin information is requested THEN the system SHALL return current bin state within 150ms p95 latency
5. WHEN bins are listed THEN the system SHALL support cursor-based pagination with customerId, status, updatedSince filters
6. WHEN any operation fails THEN the system SHALL return uniform ErrorEnvelope schema with error, message, and optional meta fields

### Requirement 2

**User Story:** As a TES integration partner, I want to ingest drop-bin items idempotently, so that duplicate submissions don't create inconsistent system state.

#### Acceptance Criteria

1. WHEN a drop-bin ingestion request includes an Idempotency-Key THEN the system SHALL deduplicate on (tenant, key) with 24-hour TTL and return same response on retry
2. WHEN ingestion is accepted THEN the system SHALL return 202 status with ingestion ID within 150ms p95 latency
3. WHEN ingestion processing completes THEN the system SHALL emit service.order.scheduled event if routing to service
4. IF ingestion fails THEN the system SHALL maintain idempotency guarantees and provide error visibility through uniform ErrorEnvelope
5. WHEN payloadRef is provided THEN the system SHALL validate size/format constraints and reject oversized payloads

### Requirement 3

**User Story:** As a service dispatcher, I want to create service orders through the operations API, so that I can schedule pickups and deliveries systematically.

#### Acceptance Criteria

1. WHEN a service order creation request is submitted with Idempotency-Key THEN the system SHALL create order with scheduled time, emit service.order.scheduled event, and deduplicate on (tenant, key)
2. WHEN order scheduling completes THEN the system SHALL respond within 300ms p95 latency
3. WHEN pickup is completed THEN the system SHALL emit pickup.completed event
4. IF order conflicts with existing schedules THEN the system SHALL return 409 status with structured conflict object
5. WHEN scheduling conflicts occur THEN the system SHALL provide clear conflict resolution through ErrorEnvelope with conflict details

### Requirement 4

**User Story:** As a system administrator, I want all operations to follow event-driven patterns, so that services can be decoupled and system state remains consistent.

#### Acceptance Criteria

1. WHEN any domain operation completes THEN the system SHALL emit corresponding domain events via outbox pattern with retry backoff and max attempts
2. WHEN events are published THEN the system SHALL ensure at-least-once delivery with consumer idempotency using event_id as key
3. WHEN events are created THEN the system SHALL reference shared envelope schema and include valid example JSON for contract tests
4. WHEN event processing fails THEN the system SHALL route to DLQ topic after max retry attempts
5. WHEN events are structured THEN the system SHALL specify topic names and ensure each event schema $refs the common envelope

### Requirement 5

**User Story:** As a security administrator, I want all operations to be properly authenticated and authorized, so that only authorized users can perform bin and order operations.

#### Acceptance Criteria

1. WHEN API requests are made THEN the system SHALL require Bearer JWT with aud=operations and appropriate scopes (ops:bins.write, ops:orders.write)
2. WHEN authorization is checked THEN the system SHALL apply ABAC policy checks using documented attributes per endpoint
3. WHEN tenant context is needed THEN the system SHALL propagate tenantId via header or JWT claim
4. WHEN events contain data THEN the system SHALL exclude PII and reference entities by IDs only
5. IF authentication fails THEN the system SHALL return appropriate 401/403 responses with uniform ErrorEnvelope

### Requirement 6

**User Story:** As a system operator, I want comprehensive observability and performance monitoring, so that I can ensure SLO compliance and troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN operations are performed THEN the system SHALL provide OpenTelemetry tracing across gateway → operations → queue
2. WHEN metrics are collected THEN the system SHALL track ops_ingest_accept_total, ops_ingest_duration_ms, ops_order_schedule_total with required labels
3. WHEN audit events occur THEN the system SHALL append events with signed daily checkpoints using documented algorithm
4. WHEN performance is measured THEN the system SHALL maintain p95 latencies under specified concurrency and dataset scale conditions
5. WHEN database queries are executed THEN the system SHALL use PostGIS GEOGRAPHY(Point) with GIST index for spatial data and optimize with (tenant_id, idem_key) and bins.serial_number indices

### Requirement 7

**User Story:** As an API consumer, I want consistent API behavior and contract compliance, so that I can reliably integrate with the operations service.

#### Acceptance Criteria

1. WHEN API versioning is needed THEN the system SHALL support x-api-version header or path-based versioning
2. WHEN rate limits are exceeded THEN the system SHALL return 429 status with Retry-After header and per-route defaults
3. WHEN request size limits are exceeded THEN the system SHALL enforce max body size for ingestion and validate payloadRef constraints
4. WHEN OpenAPI contracts are validated THEN the system SHALL include example requests/responses for every operation
5. WHEN event versioning occurs THEN the system SHALL follow documented event_version bump rules for additive changes