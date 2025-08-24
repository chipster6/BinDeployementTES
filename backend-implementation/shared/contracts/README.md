# Service API Contracts

This directory contains API contracts for inter-service communication during the microservices extraction process.

## 6-Service Architecture Contracts

### Service Boundaries
1. **auth-service** - Authentication, authorization, user management
2. **operations-service** - Core business logic (customers, bins, service events)
3. **spatial-routing-service** - Route optimization, GPS tracking, spatial queries
4. **integration-service** - External API integrations, webhooks, notifications
5. **ai-intelligence-service** - ML/AI features, vector search, predictions
6. **analytics-service** - Business intelligence, reporting, dashboards

### Contract Definition Structure
- **REST API Contracts** - HTTP endpoint definitions
- **Event Contracts** - Domain event schemas  
- **GraphQL Contracts** - Federated GraphQL schemas
- **Message Queue Contracts** - Async message formats

### Usage During Extraction
1. **Phase 1** - All services call monolith through API gateway
2. **Phase 2** - Gradual service extraction with contract validation
3. **Phase 3** - Direct inter-service communication via contracts