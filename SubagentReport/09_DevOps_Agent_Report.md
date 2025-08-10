# DevOps Agent Report
## Waste Management System - Deployment and Infrastructure Analysis

### Executive Summary
The DevOps infrastructure shows basic foundations with Docker and GitHub Actions, but lacks production-ready deployment pipelines, monitoring systems, and scalable infrastructure necessary for enterprise operations.

### What's Working Well
- **Docker Foundation**: Dockerfile exists for containerization
- **CI/CD Setup**: GitHub Actions workflow configured for basic build and test
- **Environment Configuration**: Environment variable structure in place
- **Database Containerization**: Docker Compose includes PostgreSQL and Redis services
- **TypeScript Build Process**: Proper build configuration with Next.js
- **Testing Integration**: Cypress E2E tests integrated into CI pipeline

### Critical DevOps Issues Found
1. **Empty Docker Compose**: docker-compose.yml is nearly empty (1 line), blocking deployment
2. **Missing Production Configuration**: No production-ready Docker setup
3. **No Container Registry**: Missing Docker image publishing pipeline
4. **Insufficient Monitoring**: No application performance monitoring or logging aggregation
5. **No Infrastructure as Code**: Missing Terraform/CloudFormation for cloud resources
6. **Basic GitHub Actions**: CI/CD pipeline lacks deployment automation and environment promotion
7. **Missing Health Checks**: No container health checks or readiness probes
8. **No Security Scanning**: Missing vulnerability scanning in CI/CD pipeline

### What Needs Changes/Improvements
- Create comprehensive Docker Compose configuration for all environments
- Implement multi-stage Docker builds for production optimization
- Add container orchestration with Kubernetes or Docker Swarm
- Implement monitoring and observability stack (Prometheus, Grafana, ELK)
- Create infrastructure as code for cloud deployment
- Enhance CI/CD pipeline with deployment automation and rollback capabilities
- Add security scanning and compliance checks

### What Needs Removal/Replacement
- Replace empty docker-compose.yml with comprehensive configuration
- Remove development-only Docker settings for production builds
- Replace basic GitHub Actions with enterprise-grade CI/CD pipeline

### Missing Components
- Production Docker Compose configuration
- Kubernetes deployment manifests
- Infrastructure as Code (Terraform/CloudFormation)
- Container registry and image management
- Monitoring and observability stack
- Centralized logging system
- Backup and disaster recovery automation
- Load balancing and reverse proxy setup
- SSL/TLS certificate management
- Environment promotion pipelines
- Blue-green deployment strategy
- Database migration automation in deployment

## Step-by-Step DevOps Implementation Guide

### Phase 1: Container and Orchestration Setup (Priority: URGENT)

#### Step 1: Create Production Docker Configuration
```bash
# Navigate to project root
cd waste-management-system

# Backup existing docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Create comprehensive docker-compose.yml
nano docker-compose.yml
```

**Replace with comprehensive Docker Compose configuration**:
```yaml
version: '3.8'

services:
  # Next.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: waste-management-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - app-network
    volumes:
      - app-logs:/app/logs
      - app-uploads:/app/uploads

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: waste-management-db
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis Cache and Queue
  redis:
    image: redis:7-alpine
    container_name: waste-management-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./config/redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: waste-management-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/sites-enabled:/etc/nginx/conf.d:ro
      - ssl_certificates:/etc/nginx/ssl:ro
      - static_files:/var/www/static:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network
      - web-network

  # Queue Worker
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: worker
    container_name: waste-management-worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network
    volumes:
      - app-logs:/app/logs

  # AI Service (FastAPI)
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: waste-management-ai
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - AI_MODEL_PATH=/app/models
    volumes:
      - ai_models:/app/models
      - ai_logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network

  # Monitoring and Observability
  prometheus:
    image: prom/prometheus:latest
    container_name: waste-management-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring-network
      - app-network

  grafana:
    image: grafana/grafana:latest
    container_name: waste-management-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources:ro
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    restart: unless-stopped
    networks:
      - monitoring-network
      - app-network

  # Centralized Logging
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: waste-management-elasticsearch
    environment:
      - node.name=elasticsearch
      - cluster.name=waste-management-cluster
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    restart: unless-stopped
    networks:
      - logging-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: waste-management-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    restart: unless-stopped
    networks:
      - logging-network
      - app-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    container_name: waste-management-logstash
    volumes:
      - ./config/logstash/pipeline:/usr/share/logstash/pipeline:ro
      - ./config/logstash/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - app-logs:/var/log/app:ro
    depends_on:
      - elasticsearch
    restart: unless-stopped
    networks:
      - logging-network
      - app-network

# Networks
networks:
  app-network:
    driver: bridge
  web-network:
    driver: bridge
  monitoring-network:
    driver: bridge
  logging-network:
    driver: bridge

# Persistent Volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  app-logs:
    driver: local
  app-uploads:
    driver: local
  ssl_certificates:
    driver: local
  static_files:
    driver: local
  ai_models:
    driver: local
  ai_logs:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  elasticsearch_data:
    driver: local
```

#### Step 2: Create Multi-Stage Dockerfile
```bash
nano Dockerfile
```

**Replace with optimized production Dockerfile**:
```dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]

# Worker stage
FROM production AS worker

# Switch to root temporarily for installations
USER root

# Install additional worker dependencies
RUN apk add --no-cache python3 py3-pip

# Switch back to non-root user
USER nextjs

# Override entrypoint for worker
CMD ["node", "worker.js"]

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

#### Step 3: Create Environment Configuration
```bash
# Create environment files for different stages
nano .env.production
```

**Add production environment configuration**:
```env
# Production Environment Configuration

# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
POSTGRES_DB=waste_management_prod
POSTGRES_USER=waste_mgmt_user
POSTGRES_PASSWORD=your-super-secure-production-password
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-at-least-64-characters-long
NEXTAUTH_SECRET=your-nextauth-secret-32-characters-minimum
NEXTAUTH_URL=https://your-domain.com

# External APIs
AIRTABLE_API_KEY=your-production-airtable-key
AIRTABLE_BASE_ID=your-production-base-id
SAMSARA_API_KEY=your-production-samsara-key
TWILIO_ACCOUNT_SID=your-production-twilio-sid
TWILIO_AUTH_TOKEN=your-production-twilio-token
SENDGRID_API_KEY=your-production-sendgrid-key
STRIPE_SECRET_KEY=sk_live_your-production-stripe-key

# AI Service
AI_SERVICE_URL=http://ai-service:8000

# Monitoring
GRAFANA_PASSWORD=your-secure-grafana-password

# SSL/TLS
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Backup Configuration
BACKUP_S3_BUCKET=waste-management-backups
BACKUP_S3_REGION=us-west-2
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ELASTICSEARCH_URL=http://elasticsearch:9200
```

### Phase 2: CI/CD Pipeline Enhancement (Priority: HIGH)

#### Step 4: Create Comprehensive GitHub Actions Workflow
```bash
nano .github/workflows/ci-cd.yml
```

**Replace with enhanced CI/CD pipeline**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main, develop ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: '18'
  POSTGRES_VERSION: '15'
  REDIS_VERSION: '7'

jobs:
  # Code Quality and Testing
  test:
    name: Test and Quality Checks
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: waste_management_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup test environment
      run: |
        cp .env.example .env.test
        echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/waste_management_test" >> .env.test
        echo "REDIS_URL=redis://localhost:6379" >> .env.test

    - name: Generate Prisma client
      run: npx prisma generate

    - name: Run database migrations
      run: npx prisma migrate deploy
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/waste_management_test

    - name: Lint code
      run: npm run lint

    - name: Type check
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/waste_management_test
        REDIS_URL: redis://localhost:6379

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/waste_management_test
        REDIS_URL: redis://localhost:6379

    - name: Upload test coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests

  # Security Scanning
  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

    - name: Run npm audit
      run: npm audit --audit-level=high

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  # Build and Push Docker Images
  build:
    name: Build and Push Images
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log into registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}

    - name: Build and push Docker image
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        target: production
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

    - name: Generate SBOM
      uses: anchore/sbom-action@v0
      with:
        image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  # End-to-End Testing
  e2e:
    name: E2E Testing
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Start application stack
      run: |
        echo "Starting application with Docker Compose..."
        docker-compose -f docker-compose.test.yml up -d
        
        # Wait for application to be ready
        timeout 120s bash -c 'until curl -f http://localhost:3000/api/health; do sleep 5; done'

    - name: Run Cypress E2E tests
      uses: cypress-io/github-action@v6
      with:
        wait-on: 'http://localhost:3000'
        wait-on-timeout: 120
        browser: chrome
        record: true
        parallel: true
      env:
        CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    - name: Upload E2E test artifacts
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: cypress-screenshots
        path: cypress/screenshots

    - name: Cleanup
      if: always()
      run: docker-compose -f docker-compose.test.yml down -v

  # Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, e2e]
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment: staging

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2

    - name: Update kubeconfig
      run: aws eks update-kubeconfig --region us-west-2 --name waste-management-staging

    - name: Deploy to staging
      run: |
        # Update image tag in deployment manifests
        sed -i "s|IMAGE_TAG|${{ needs.build.outputs.image-tag }}|g" k8s/staging/deployment.yaml
        
        # Apply Kubernetes manifests
        kubectl apply -f k8s/staging/
        
        # Wait for rollout to complete
        kubectl rollout status deployment/waste-management-app -n staging --timeout=300s

    - name: Run health checks
      run: |
        # Wait for pods to be ready
        kubectl wait --for=condition=ready pod -l app=waste-management-app -n staging --timeout=300s
        
        # Verify application health
        kubectl run --rm -i --tty health-check --image=curlimages/curl --restart=Never -- \
          curl -f http://waste-management-app.staging.svc.cluster.local:3000/api/health

    - name: Run smoke tests
      run: |
        npm run test:smoke -- --env staging

  # Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2

    - name: Update kubeconfig
      run: aws eks update-kubeconfig --region us-west-2 --name waste-management-production

    - name: Create deployment backup
      run: |
        kubectl get deployment waste-management-app -n production -o yaml > backup-$(date +%Y%m%d-%H%M%S).yaml
        
    - name: Deploy to production with blue-green strategy
      run: |
        # Update image tag
        sed -i "s|IMAGE_TAG|${{ needs.build.outputs.image-tag }}|g" k8s/production/deployment.yaml
        
        # Apply blue-green deployment
        ./scripts/blue-green-deploy.sh production ${{ needs.build.outputs.image-tag }}

    - name: Verify production deployment
      run: |
        # Health checks
        kubectl wait --for=condition=ready pod -l app=waste-management-app,version=green -n production --timeout=600s
        
        # Run production smoke tests
        npm run test:smoke -- --env production

    - name: Complete blue-green switch
      run: |
        # Switch traffic to green deployment
        kubectl patch service waste-management-app -n production -p '{"spec":{"selector":{"version":"green"}}}'
        
        # Wait and verify
        sleep 30
        kubectl run --rm -i --tty prod-health-check --image=curlimages/curl --restart=Never -- \
          curl -f https://api.wastemanagement.com/health

    - name: Cleanup old deployment
      run: |
        # Remove blue deployment after successful green deployment
        kubectl delete deployment waste-management-app-blue -n production --ignore-not-found=true

  # Notification
  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: always()

    steps:
    - name: Send Slack notification
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployment'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        fields: repo,message,commit,author,action,eventName,ref,workflow
```

### Phase 3: Infrastructure as Code (Priority: MEDIUM)

#### Step 5: Create Terraform Configuration
```bash
mkdir -p infrastructure/terraform
nano infrastructure/terraform/main.tf
```

**Add comprehensive Terraform configuration**:
```hcl
# Terraform configuration for AWS infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket = "waste-management-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "waste-management-system"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "waste-management"
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${var.cluster_name}-${var.environment}"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "${var.cluster_name}-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  
  # EKS Managed Node Groups
  eks_managed_node_groups = {
    main = {
      name = "main"
      
      instance_types = ["t3.medium"]
      
      min_size     = 1
      max_size     = 10
      desired_size = 3
      
      disk_size = 50
      
      labels = {
        role = "main"
      }
      
      taints = {}
    }
    
    spot = {
      name = "spot"
      
      instance_types = ["t3.medium", "t3a.medium"]
      capacity_type  = "SPOT"
      
      min_size     = 0
      max_size     = 5
      desired_size = 2
      
      disk_size = 50
      
      labels = {
        role = "spot"
      }
      
      taints = {
        spot = {
          key    = "spot"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }
  
  # Cluster access entry
  access_entries = {
    admin = {
      kubernetes_groups = []
      principal_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }
}

# RDS PostgreSQL Database
resource "aws_db_subnet_group" "main" {
  name       = "${var.cluster_name}-${var.environment}"
  subnet_ids = module.vpc.private_subnets
  
  tags = {
    Name = "${var.cluster_name}-${var.environment} DB subnet group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.cluster_name}-${var.environment}-rds-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    protocol    = "tcp"
    from_port   = 5432
    to_port     = 5432
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.cluster_name}-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"
  
  allocated_storage     = var.environment == "production" ? 100 : 20
  max_allocated_storage = var.environment == "production" ? 1000 : 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "waste_management"
  username = "postgres"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = var.environment != "production"
  deletion_protection = var.environment == "production"
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_enhanced_monitoring.arn
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# ElastiCache Redis Cluster
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.cluster_name}-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_name}-${var.environment}-redis-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    protocol    = "tcp"
    from_port   = 6379
    to_port     = 6379
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.cluster_name}-${var.environment}"
  description                = "Redis cluster for ${var.cluster_name} ${var.environment}"
  
  node_type                  = var.environment == "production" ? "cache.t3.medium" : "cache.t3.micro"
  port                      = 6379
  parameter_group_name      = "default.redis7"
  
  num_cache_clusters        = var.environment == "production" ? 3 : 1
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# S3 Buckets
resource "aws_s3_bucket" "app_storage" {
  bucket = "${var.cluster_name}-${var.environment}-storage"
}

resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/eks/${var.cluster_name}-${var.environment}/app"
  retention_in_days = var.environment == "production" ? 30 : 14
}

# IAM Roles
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.cluster_name}-${var.environment}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Data sources
data "aws_caller_identity" "current" {}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "s3_bucket" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.app_storage.id
}
```

### Testing and Validation

#### Step 6: Test Complete DevOps Pipeline
```bash
# Test Docker build locally
docker build -t waste-management-app .

# Test Docker Compose stack
docker-compose up -d

# Verify all services are healthy
docker-compose ps
docker-compose logs app

# Test health checks
curl http://localhost:3000/api/health

# Test monitoring endpoints
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana
curl http://localhost:5601  # Kibana

# Test infrastructure with Terraform
cd infrastructure/terraform
terraform init
terraform plan -var="environment=staging"
terraform apply -var="environment=staging"

# Verify Kubernetes deployment
kubectl get pods -n staging
kubectl get services -n staging

# Test CI/CD pipeline
git commit -m "test: trigger CI/CD pipeline"
git push origin develop

# Monitor deployment
kubectl logs -f deployment/waste-management-app -n staging
```

This comprehensive DevOps implementation provides enterprise-grade deployment automation, monitoring, and infrastructure management suitable for production scalability and reliability.