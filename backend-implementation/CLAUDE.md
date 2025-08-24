# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context
Enterprise waste management system backend for a company with 2 trucks, 75 contracts, and $2M+ MRR. Built as a modular monolith (originally designed as microservices) using TypeScript, Node.js, Express 5, PostgreSQL with PostGIS, and Redis.

## Essential Commands

### Development
```bash
# Start development server with hot reload
npm run dev:ts

# Run TypeScript compilation (currently ~4500 errors)
npx tsc --noEmit

# Type checking
npm run type-check          # Check for TypeScript errors
npm run type-check:watch    # Watch mode for type checking
```

### Testing
```bash
# Unit tests
npm test                     # Run all tests
npm run test:unit           # Unit tests only
npm run test:coverage       # With coverage report

# Integration tests  
npm run test:integration    # All integration tests
npm run test:integration:workflow  # Workflow integration tests
npm run test:integration:external  # External service coordination tests

# E2E tests
npm run e2e:validate        # Validate E2E setup
npm run e2e:run            # Run E2E tests
npm run cypress:open       # Open Cypress UI

# Performance tests
npm run test:performance    # Performance test suite
npm run performance:validate # Validate 45-65% improvement targets
```

### Database Operations
```bash
# Migrations
npm run db:migrate         # Run migrations
npm run db:reset          # Reset database
npm run migration:status  # Check migration status
npm run migration:deploy  # Deploy migrations (production-ready)

# Test database
npm run db:test:setup     # Setup test database
npm run db:test:reset     # Reset test database
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format with Prettier
npm run quality:check    # Type-check + lint + format check
npm run quality:fix      # Auto-fix lint and format issues
```

### Security & Monitoring
```bash
npm run audit:security    # Security audit
npm run monitor:integration # Monitor integration health
npm run deps:check       # Check for outdated dependencies
```

## High-Level Architecture

### Service Layer Pattern
All services extend `BaseService` providing standardized:
- Error handling with Result<T, E> pattern
- Caching with Redis integration
- Logging and monitoring
- Repository pattern integration
- Transaction support

Key services:
- **BaseService**: Foundation for all services (src/services/BaseService.ts)
- **UserService**, **BinService**, **CustomerService**: Core business services
- **WeaviateIntelligenceService**: AI/ML vector intelligence
- **RouteOptimizationService**: OR-Tools + GraphHopper integration
- **ExternalAPIResilienceManager**: Multi-provider fallback system

### Repository Pattern
Repositories handle data access with:
- BaseRepository providing CRUD operations
- Caching layer with granular invalidation
- Connection pool optimization (120 connections)
- PostGIS spatial query support

### Authentication & Security
- JWT with RS256 asymmetric algorithm
- MFA with encrypted secrets (AES-256-GCM)
- RBAC with database-backed permissions
- Session management via Redis
- SOC 2 Type II compliance framework (implemented, not deployed)
- HSM integration for FIPS 140-2 Level 3 security

### External Integrations
Complete integration suite with fallback mechanisms:
- **Stripe**: Payment processing with PCI compliance
- **Twilio**: SMS notifications
- **SendGrid**: Email services
- **Samsara**: Fleet management
- **Airtable**: Data synchronization
- **Mapbox/Google Maps**: Route optimization

### TypeScript Configuration
Strict mode enabled with:
- `exactOptionalPropertyTypes: true` (causing many current errors)
- `verbatimModuleSyntax: true` (requires explicit type imports)
- Path aliases configured (@services/, @models/, etc.)

### Current TypeScript Issues (~4500 errors)
Main error patterns:
1. **Property access issues** (TS2339): Missing User interface properties
2. **Missing type definitions** (TS2304): Undefined types/names
3. **Type mismatches** (TS2345): exactOptionalPropertyTypes conflicts
4. **Validation middleware**: express-validator vs Joi inconsistencies
5. **ResponseHelper API**: Signature mismatches across controllers

To fix TypeScript errors systematically:
1. Fix User interface definition (add id, email, role properties)
2. Fix Sequelize Op imports (`import { Op } from 'sequelize'`)
3. Fix UserRole middleware usage (use enums not arrays)
4. Add type-only imports where needed
5. Standardize validation to Joi across all controllers

### Error Handling System
Comprehensive 8-component error orchestration:
- Circuit breaker patterns with automatic recovery
- Database error recovery with connection pool management
- Real-time WebSocket monitoring
- Cost impact analysis for external service failures
- Business continuity fallback mechanisms

### Performance Optimizations
- Database connection pool: 500% increase (20 → 120 connections)
- Caching strategy: Granular invalidation with Redis
- Query optimization: PostGIS spatial indexes with GIST
- Response time: 45-65% improvement validated
- Real-time monitoring: Prometheus/Grafana stack

### AI/ML Infrastructure
Four-phase implementation (Phase 1-2 complete):
1. **Weaviate Vector DB**: Semantic search and operational intelligence
2. **Route Optimization**: OR-Tools + GraphHopper with traffic awareness
3. **Predictive Analytics**: Prophet + LightGBM (85% accuracy)
4. **Local LLM**: Llama 3.1 8B architecture (awaiting hardware)

### Testing Strategy
- **Unit Tests**: Jest with 90%+ coverage target
- **Integration Tests**: Cross-system workflow validation
- **E2E Tests**: Cypress with role-based dashboard testing
- **Performance Tests**: Artillery + k6 for load testing
- **Security Tests**: Penetration testing and vulnerability scanning

### Deployment Scripts
Key automation scripts in `/scripts/`:
- `docker-dev-setup.sh`: Development environment setup
- `migration-deploy.sh`: Production migration deployment
- `devops-infrastructure-validation.sh`: Infrastructure validation
- `run-integration-tests.sh`: Comprehensive integration testing
- `monitor-integration-health.js`: Real-time health monitoring

### Environment Configuration
- Development: `.env.development` with local PostgreSQL/Redis
- Test: Isolated test database with fixtures
- Production: Environment variables via secrets management
- 70+ configuration variables organized by domain

### Frontend Integration
- Complete API client with 250+ endpoint mappings
- WebSocket real-time communication channels
- Type-safe integration with shared TypeScript types
- Authentication flow with automatic token refresh
- Integration dashboard for monitoring connectivity

## Important Notes
- Current TypeScript errors (4500+) don't block runtime but need resolution for production build
- BaseService pattern is mandatory for new services
- All external API calls must go through ExternalAPIResilienceManager
- Database migrations require validation before production deployment
- Security frameworks (SOC 2, HSM) are implemented but await initialization