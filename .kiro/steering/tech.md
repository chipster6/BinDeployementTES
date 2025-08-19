# Technology Stack & Build System

## Core Technologies

### Backend Implementation
- **Runtime**: Node.js 18+ with TypeScript 5.9+
- **Framework**: Express.js with Socket.IO for real-time features
- **Database**: PostgreSQL 16 + PostGIS for spatial data
- **Caching**: Redis 7 with connection pooling
- **Queue System**: Bull queues for background processing
- **Authentication**: JWT with RS256 asymmetric tokens
- **Encryption**: AES-256-GCM field-level encryption

### Frontend System  
- **Framework**: Next.js 15+ with React 18
- **Database ORM**: Prisma with PostgreSQL
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Built-in React state with real-time updates

### AI/ML Infrastructure
- **Vector Database**: Weaviate for semantic search
- **ML Models**: Integration with OpenAI, Gemini, local models
- **Route Optimization**: OR-Tools integration
- **Model Context Protocol**: Zen MCP server for AI collaboration

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Monitoring**: Prometheus + Grafana
- **Security**: SIEM integration, comprehensive logging

## Build System & Commands

### Backend Development
```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:ts           # TypeScript development with ts-node-dev
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests with Cypress
npm run test:security    # Security-focused tests

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:reset         # Reset and reseed database

# Docker
npm run docker:build     # Build Docker image
npm run docker:dev       # Start development environment
```

### Frontend Development
```bash
# Development
npm run dev              # Start Next.js development server
npm run build            # Production build
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
```

### Zen MCP Server
```bash
# Setup and run
./run-server.sh          # Auto-setup and configure
./run-server.sh -c       # Show configuration
python server.py         # Direct server start

# Testing
python -m pytest tests/ # Run test suite
```

## Code Style & Conventions

### TypeScript Configuration
- **Target**: ES2022 with strict mode enabled
- **Module System**: ESNext with bundler resolution
- **Path Mapping**: Absolute imports with `@/` prefix
- **Decorators**: Experimental decorators enabled for metadata

### Project Structure Patterns
- **Services**: Business logic with BaseService pattern
- **Controllers**: Request handling with validation
- **Repositories**: Data access layer abstraction  
- **Middleware**: Cross-cutting concerns (auth, logging, error handling)
- **Utils**: Shared utilities and helpers

### Database Conventions
- **Migrations**: Sequelize CLI for schema management
- **Models**: Sequelize ORM with TypeScript definitions
- **Spatial Data**: PostGIS integration for geographic queries
- **Performance**: Strategic indexing and query optimization

### Testing Strategy
- **Unit Tests**: Jest with comprehensive coverage
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Cypress for user workflows
- **Performance Tests**: Artillery and K6 load testing

## Development Environment

### Required Tools
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 16 with PostGIS extension
- Redis 7
- Python 3.10+ (for MCP server)

### Environment Variables
- Database connection strings
- API keys for external services (Stripe, Twilio, SendGrid)
- AI/ML service credentials (OpenAI, Gemini)
- Security keys for encryption and JWT signing