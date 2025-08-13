# Waste Management System - Infrastructure Setup Guide

## Overview

This guide provides complete instructions for setting up the development environment and production infrastructure for the Waste Management System.

## 🚨 CRITICAL FIXES IMPLEMENTED

### Issues Resolved:
1. **Docker Environment Setup** - Complete containerization with PostgreSQL 16 + PostGIS + Redis 7
2. **Jest Path Mapping** - Fixed module resolution for `@/config` and other TypeScript path aliases
3. **Database Connectivity** - Production-ready connection pooling and configuration
4. **CI/CD Pipeline** - Complete GitHub Actions workflow for automated deployment

---

## Quick Start (Development Environment)

### Prerequisites
- Docker Desktop (for macOS/Windows) or Docker Engine (for Linux)
- Node.js 20.x or higher
- npm 9.x or higher

### 1. Start Development Environment

```bash
# Make setup script executable
chmod +x scripts/docker-dev-setup.sh

# Run the automated setup
./scripts/docker-dev-setup.sh
```

This script will:
- ✅ Check Docker daemon status
- ✅ Create required directories
- ✅ Start PostgreSQL 16 + PostGIS containers
- ✅ Start Redis 7 container
- ✅ Initialize database schema
- ✅ Test connectivity
- ✅ Validate Jest path mapping

### 2. Start Development Server

```bash
# Start the backend in development mode
npm run dev:ts

# In another terminal, start the frontend
cd frontend && npm run dev
```

### 3. Run Tests

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

---

## Services & Ports

| Service | Port | Description | Credentials |
|---------|------|-------------|-------------|
| Backend API | 3001 | Main application server | - |
| Frontend | 3000 | Next.js development server | - |
| PostgreSQL | 5432 | Database server | postgres/postgres123 |
| Redis | 6379 | Cache and session store | redis123 |
| Queue Dashboard | 3003 | Background jobs monitoring | - |
| WebSocket | 3002 | Real-time communications | - |

---

## Docker Commands Reference

### Development Environment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset environment (clean slate)
docker-compose down -v && ./scripts/docker-dev-setup.sh
```

### Production Environment
```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# View production metrics
docker-compose -f docker-compose.prod.yml logs prometheus grafana
```

---

## Configuration Management

### Environment Variables

Create `.env` file from template:
```bash
cp .env.example .env
```

Key configurations:
- **Database**: Connection pooling optimized for production (50-120 connections)
- **Redis**: Session management and background job queues
- **JWT**: Secure token configuration with rotation
- **External APIs**: Stripe, Twilio, SendGrid integration

### Production Secrets

For production deployment, ensure these secrets are configured:
```bash
# Database
DB_PASSWORD=<secure-random-password>

# JWT & Security
JWT_SECRET=<32-character-random-key>
ENCRYPTION_KEY=<32-character-encryption-key>

# External Services
STRIPE_SECRET_KEY=<production-stripe-key>
SENDGRID_API_KEY=<production-sendgrid-key>
```

---

## Database Management

### Local Development
```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset database
npm run db:reset
```

### Production
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres waste_management > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres waste_management < backup.sql
```

---

## Monitoring & Logging

### Development Monitoring
- **Logs**: Available in `./docker/data/logs/`
- **Database**: pgAdmin at http://localhost:8080
- **Redis**: Redis Commander at http://localhost:8081

### Production Monitoring
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards and alerts (port 3004)
- **Application Metrics**: Health checks at `/health`

---

## CI/CD Pipeline

### GitHub Actions Workflow
Located at `.github/workflows/ci-cd-pipeline.yml`

**Stages:**
1. **Code Quality** - Linting, formatting, type checking
2. **Testing** - Unit, integration, and E2E tests
3. **Security Scanning** - Vulnerability assessment
4. **Build & Containerize** - Multi-platform Docker images
5. **Deploy Staging** - Automated staging deployment
6. **Deploy Production** - Blue-green production deployment
7. **Monitoring** - Post-deployment health checks

### Manual Deployment
```bash
# Build production images
docker build -t waste-mgmt-backend:latest -f docker/Dockerfile .
docker build -t waste-mgmt-frontend:latest -f docker/Dockerfile.frontend ./frontend

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

---

## Security Configuration

### SSL/TLS Setup
Production deployment includes:
- Nginx reverse proxy with SSL termination
- HTTPS enforcement
- Security headers (Helmet.js)
- Rate limiting and DDoS protection

### Database Security
- Encrypted connections (SSL)
- Field-level encryption for sensitive data
- Audit logging for all operations
- Connection pooling with authentication

---

## Performance Optimization

### Database Optimization
- **Connection Pool**: 10-120 connections based on load
- **PostGIS Indexing**: Spatial queries optimized
- **Query Caching**: Redis-based query result caching

### Application Performance
- **Compression**: Gzip compression enabled
- **Caching**: Multi-layer caching strategy
- **Load Balancing**: Multiple backend instances
- **CDN Integration**: Static asset optimization

---

## Troubleshooting

### Common Issues

#### Docker not starting
```bash
# Check Docker daemon
docker info

# On macOS: Restart Docker Desktop
# On Linux: sudo systemctl restart docker
```

#### Jest path mapping errors
```bash
# Rebuild TypeScript
npm run build

# Clear Jest cache
npx jest --clearCache

# Run specific test
npm test -- --testNamePattern="path-alias-test"
```

#### Database connection issues
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U postgres

# View database logs
docker-compose logs postgres

# Reset database connection
docker-compose restart postgres
```

#### Redis connection issues
```bash
# Test Redis connectivity
docker-compose exec redis redis-cli ping

# View Redis logs
docker-compose logs redis

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

---

## Support & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Database maintenance and optimization
- **Monthly**: Security updates and dependency audits
- **Quarterly**: Performance review and scaling assessment

### Backup Strategy
- **Database**: Daily automated backups
- **Application Data**: Real-time S3 synchronization
- **Configuration**: Version-controlled infrastructure as code

### Monitoring Alerts
- API response time > 500ms
- Database connection pool > 80% utilization
- Error rate > 1% over 5 minutes
- Disk usage > 80%

---

## Production Readiness Checklist

- ✅ Docker environment configured
- ✅ Database connection pooling optimized
- ✅ Jest path mapping fixed
- ✅ CI/CD pipeline established
- ✅ Security configurations implemented
- ✅ Monitoring and alerting setup
- ✅ Backup and recovery procedures
- ✅ Load balancing and scaling ready
- ✅ SSL/TLS certificates configured
- ✅ Environment-specific configurations

---

## Next Steps

1. **Test the development environment**: Run `./scripts/docker-dev-setup.sh`
2. **Validate testing infrastructure**: Execute `npm run test:all`
3. **Review production configuration**: Update `.env` with production secrets
4. **Deploy to staging**: Push to `develop` branch to trigger pipeline
5. **Production deployment**: Merge to `main` branch for production release

**Status**: ✅ Infrastructure Ready for Production Deployment