# Project Structure & Organization

## Repository Layout

### Root Level Structure
```
├── backend-implementation/     # Main backend API service
├── waste-management-system/    # Frontend Next.js application  
├── zen-mcp-server/            # AI collaboration MCP server
├── .agent-coordination/       # Agent coordination protocols
├── .claude/                   # Claude AI agent configurations
└── .kiro/                     # Kiro IDE steering rules
```

## Backend Implementation (`backend-implementation/`)

### Core Architecture
```
src/
├── config/           # Application configuration
├── controllers/      # Request handlers and API endpoints
├── database/         # Database models, migrations, CLI tools
├── dto/             # Data Transfer Objects for validation
├── middleware/      # Express middleware (auth, logging, error handling)
├── models/          # Sequelize ORM models
├── repositories/    # Data access layer abstraction
├── routes/          # API route definitions
├── services/        # Business logic layer
├── utils/           # Shared utilities and helpers
└── types/           # TypeScript type definitions
```

### Key Service Patterns
- **BaseService**: Transaction management, caching, audit logging (560+ lines)
- **BaseExternalService**: Circuit breaker, rate limiting, retry logic (670+ lines)
- **SpatialQueryOptimizationService**: PostGIS integration with sub-50ms queries (655+ lines)

### Infrastructure
```
docker/              # Docker configurations and compose files
scripts/             # Deployment and automation scripts
tests/               # Comprehensive test suites
├── unit/           # Unit tests with Jest
├── integration/    # API integration tests
├── e2e/           # End-to-end Cypress tests
├── performance/   # Load testing with Artillery/K6
└── security/      # Security-focused test suites
```

## Frontend System (`waste-management-system/`)

### Next.js Structure
```
src/
├── app/             # Next.js 13+ app router
├── components/      # Reusable React components
├── services/        # API client services
├── utils/          # Frontend utilities
├── types/          # TypeScript definitions
└── gateway/        # API gateway integration
```

### Key Features
- **Prisma Integration**: Type-safe database client
- **Tailwind + Radix UI**: Modern component system
- **Real-time Updates**: WebSocket integration

## Zen MCP Server (`zen-mcp-server/`)

### AI Collaboration Architecture
```
providers/          # AI model providers (OpenAI, Gemini, etc.)
tools/             # MCP tools for code analysis
systemprompts/     # Specialized AI prompts
utils/             # Server utilities
tests/             # Comprehensive test coverage
```

### Core Tools
- **Code Analysis**: `analyze`, `codereview`, `debug`
- **Planning**: `planner`, `consensus`, `thinkdeep`
- **Quality**: `precommit`, `testgen`, `secaudit`

## Agent Coordination System

### Coordination Registry (`.agent-coordination/`)
```
├── COORDINATION-MATRIX.md           # Master coordination overview
├── COORDINATION-PROTOCOL.md         # Communication protocols
├── context-continuity-master-sync.md # Cross-agent state management
└── coordination-session-*.md        # Specific coordination sessions
```

### Critical Coordination Pairs
1. **Security ↔ External-API**: Payment security, API key management
2. **Database ↔ Performance**: Query optimization, spatial data performance  
3. **Frontend ↔ Backend**: API contracts, real-time features
4. **Testing ↔ Security**: Security testing, vulnerability validation
5. **DevOps ↔ Performance**: Infrastructure scaling, monitoring

## File Naming Conventions

### TypeScript Files
- **Services**: `PascalCase` with `Service` suffix (e.g., `UserManagementService.ts`)
- **Controllers**: `PascalCase` with `Controller` suffix (e.g., `RouteController.ts`)
- **Models**: `PascalCase` singular (e.g., `User.ts`, `Vehicle.ts`)
- **Utils**: `camelCase` descriptive (e.g., `spatialHelpers.ts`)

### Database
- **Migrations**: Timestamp prefix with descriptive name
- **Seeds**: Environment-specific with clear naming
- **Models**: Singular table names with strategic indexing

### Testing
- **Unit Tests**: `*.test.ts` alongside source files
- **Integration**: `*.integration.test.ts` in dedicated folders
- **E2E**: `*.cy.ts` for Cypress specifications

## Import Path Conventions

### Backend Absolute Imports
```typescript
import { config } from "@/config";
import { UserController } from "@/controllers/UserController";
import { BaseService } from "@/services/BaseService";
import { logger } from "@/utils/logger";
```

### Frontend Absolute Imports
```typescript
import { Button } from "@/components/ui/button";
import { userService } from "@/services/userService";
import { formatDate } from "@/utils/dateHelpers";
```

## Documentation Standards

### Code Documentation
- **JSDoc**: Comprehensive function and class documentation
- **README Files**: Component-specific documentation in each major directory
- **API Documentation**: Swagger/OpenAPI specifications
- **Architecture Docs**: High-level system design documentation

### Coordination Documentation
- **Agent Protocols**: Standardized coordination file formats
- **Status Tracking**: Real-time coordination status updates
- **Cross-Stream Communication**: Mandatory coordination triggers and workflows