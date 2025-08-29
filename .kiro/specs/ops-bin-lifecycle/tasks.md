# Implementation Plan

- [ ] 1. Set up database schema and migrations
  - Create migration files for bins, orders, ingestions, and outbox_events tables with tenant_id columns
  - Implement ETag generation functions and triggers for bins and orders tables
  - Add proper indexes including unique constraint on (tenant_id, serial_number) for bins
  - Create outbox_events table with event_id uniqueness constraint and topic column
  - _Requirements: 1.1, 1.2, 1.3, 6.5_

- [ ] 2. Implement core middleware and request handling
  - [ ] 2.1 Create tenant context middleware
    - Implement requireTenant() middleware to extract tenant_id from JWT claims or X-Tenant-Id header
    - Add tenant validation and propagation throughout request lifecycle
    - _Requirements: 5.3_

  - [ ] 2.2 Create idempotency middleware
    - Implement requireIdempotencyKey() middleware for POST operations
    - Create Redis-based idempotency store with ops:{tenant_id}:idem:{key} format
    - Handle 24-hour TTL and response replay for duplicate requests
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ] 2.3 Create concurrency control middleware
    - Implement requireIfMatch() middleware for PATCH operations
    - Add ETag validation and 412 Precondition Failed responses
    - Handle optimistic concurrency control for bin and order updates
    - _Requirements: 1.2, 1.3_

- [ ] 3. Implement standardized error handling
  - Create ErrorEnvelope response schema and ResponseHelper.error() method
  - Implement ConflictDetails schema for 409 responses with structured conflict information
  - Add uniform error handling across all endpoints with proper status codes
  - _Requirements: 1.6, 2.4, 3.5, 5.5_

- [ ] 4. Implement bin lifecycle endpoints
  - [ ] 4.1 Create bin CRUD operations
    - Implement POST /ops/bins with idempotency and bin.created event emission
    - Implement GET /ops/bins with cursor-based pagination and filtering
    - Implement GET /ops/bins/{id} with tenant isolation
    - Implement PATCH /ops/bins/{id} with ETag validation and optimistic concurrency
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ] 4.2 Create bin capacity update endpoint
    - Implement POST /ops/bins/{id}/capacity with ETag validation
    - Add capacity validation and bin.capacity.updated event emission
    - Handle concurrent capacity updates with proper conflict resolution
    - _Requirements: 1.3, 4.1_

- [ ] 5. Implement drop-bin ingestion endpoint
  - Create POST /ops/ingest/dropbin with idempotency and payload validation
  - Implement 256KB max body size enforcement and payloadRef validation
  - Add asynchronous processing with service.order.scheduled event emission
  - Handle ingestion queuing and status tracking with 202 responses
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 6. Implement service order endpoints
  - Create POST /ops/orders with idempotency and service.order.scheduled event emission
  - Add scheduling conflict detection and structured conflict responses
  - Implement order validation and customer/bin relationship verification
  - Handle pickup completion with pickup.completed event emission
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 7. Implement event-driven architecture
  - [ ] 7.1 Create outbox pattern implementation
    - Implement transactional outbox repository for reliable event storage
    - Create event envelope with integer event_version and proper schema validation
    - Add domain event creation for all five event types (customer.created, bin.created, etc.)
    - _Requirements: 4.1, 4.3_

  - [ ] 7.2 Create event dispatcher and delivery
    - Implement background event dispatcher with exponential backoff (100ms → 10s)
    - Add DLQ handling for failed events after max 10 retry attempts
    - Ensure at-least-once delivery with consumer idempotency using event_id
    - Create event topic routing (ops.customer.created, ops.bin.created, etc.)
    - _Requirements: 4.2, 4.4, 4.5_

- [ ] 8. Implement security and authorization
  - Add Bearer JWT validation with aud=operations requirement
  - Implement ABAC policy checks with required scopes (ops:bins.write, ops:orders.write)
  - Add PII exclusion validation in event payloads (ID references only)
  - Create comprehensive audit logging for all operations
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 9. Add observability and monitoring
  - [ ] 9.1 Implement OpenTelemetry tracing
    - Add distributed tracing across gateway → operations → queue
    - Create correlation IDs for request tracking and performance bottleneck identification
    - Implement span instrumentation for all critical operations
    - _Requirements: 6.1_

  - [ ] 9.2 Create metrics collection
    - Implement ops_ingest_accept_total, ops_ingest_duration_ms, ops_order_schedule_total metrics
    - Add ops_error_rate and ops_concurrent_requests tracking with required labels
    - Create performance monitoring for p95 latency targets
    - _Requirements: 6.2, 6.4_

  - [ ] 9.3 Add audit logging and checkpoints
    - Implement structured JSON logging with request/response correlation
    - Create signed daily checkpoint system for audit events
    - Add comprehensive error context preservation and alerting
    - _Requirements: 6.3_

- [ ] 10. Implement rate limiting and performance optimization
  - Add per-tenant rate limiting (200 rpm for ingestion, 120 rpm for orders)
  - Implement 429 responses with Retry-After headers
  - Optimize database queries with PostGIS spatial indexing and connection pooling
  - Add Redis caching for frequently accessed data
  - _Requirements: 6.5, 7.2, 7.3, 7.4_

- [ ] 11. Create comprehensive test suite
  - [ ] 11.1 Implement contract tests
    - Create OpenAPI specification validation tests
    - Add JSON Schema validation for all five event types with example payloads
    - Implement response format compliance testing
    - _Requirements: All requirements validation_

  - [ ] 11.2 Create integration tests
    - Implement end-to-end API workflow tests (create bin → capacity update → order schedule)
    - Add database transaction integrity validation
    - Create event publishing verification and idempotency behavior testing
    - Test ETag-based optimistic concurrency control scenarios
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 4.2_

  - [ ] 11.3 Add performance and security tests
    - Create load testing at specified concurrency levels (50 RPS steady, 200 RPS burst)
    - Implement SLO compliance verification (p95 latencies within targets)
    - Add authentication/authorization validation and input sanitization testing
    - Test rate limiting effectiveness and PII exclusion in events
    - _Requirements: 5.1, 5.2, 5.4, 6.4, 7.1_

- [ ] 12. Create OpenAPI contracts and documentation
  - Generate complete OpenAPI 3.0 specification with all endpoints, schemas, and examples
  - Add ErrorEnvelope and ConflictDetails components with proper referencing
  - Include all required headers (Idempotency-Key, If-Match, X-Tenant-Id, X-API-Version)
  - Add vendor rate limit fields and 429 responses with Retry-After headers
  - Create comprehensive request/response examples for every operation
  - _Requirements: 1.6, 2.4, 3.5, 7.2, 7.5_

- [ ] 13. Implement health and readiness endpoints
  - Create GET /health (liveness) endpoint for basic service availability
  - Create GET /ready (readiness) endpoint checking DB, Redis, and JWKS cache connectivity
  - Wire health checks to deployment and orchestration systems
  - Add health check monitoring and alerting integration
  - _Requirements: 6.1, 6.3_

- [ ] 14. Implement JWT/JWKS verification and caching
  - Create JWKS fetcher with remote key rotation support
  - Implement JWKS cache with TTL and exponential backoff on fetch failures
  - Add JWT signature verification with aud=operations and scope validation
  - Handle kid (key ID) misses with automatic key refresh
  - Implement fail-closed security on signature/audience/scope mismatches
  - _Requirements: 5.1, 5.2_

- [ ] 15. Implement tenant enforcement at database layer
  - Enable Row-Level Security (RLS) on bins, orders, and ingestions tables
  - Create RLS policies enforcing tenant_id = current_setting('app.current_tenant')::uuid
  - Add connection middleware to set session variable per request
  - Implement tenant isolation validation and cross-tenant access prevention
  - Add comprehensive tenant boundary testing and validation
  - _Requirements: 5.3, 5.5_