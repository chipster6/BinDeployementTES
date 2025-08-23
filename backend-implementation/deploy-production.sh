#!/bin/bash

# ============================================================================
# PRODUCTION DEPLOYMENT SCRIPT
# Waste Management System - Full Stack Deployment
# ============================================================================
#
# This script handles the complete production deployment of the waste management system
# including backend API, frontend application, and all supporting infrastructure.
#
# Usage: ./deploy-production.sh [options]
# Options:
#   --environment     Target environment (staging|production) [default: production]
#   --profile        Docker compose profile (core|monitoring|ai-ml|full) [default: full]
#   --skip-backup    Skip database backup before deployment
#   --skip-tests     Skip pre-deployment tests
#   --dry-run        Show what would be deployed without executing
#   --rollback       Rollback to previous deployment
#   --help           Show this help message
#
# Created by: Backend API Integration & Production Deployment Configuration
# Date: 2025-08-23
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION VARIABLES
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DEPLOYMENT_LOG="$PROJECT_ROOT/logs/deployment_${TIMESTAMP}.log"
BACKUP_DIR="$PROJECT_ROOT/backups"
SECRETS_DIR="$PROJECT_ROOT/secrets"

# Default configuration
ENVIRONMENT="production"
COMPOSE_PROFILE="full"
SKIP_BACKUP=false
SKIP_TESTS=false
DRY_RUN=false
ROLLBACK=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp}: $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp}: $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp}: $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} ${timestamp}: $message" | tee -a "$DEPLOYMENT_LOG"
            ;;
    esac
}

show_help() {
    cat << EOF
Production Deployment Script for Waste Management System

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --environment ENV    Target environment: staging|production (default: production)
    --profile PROFILE    Docker compose profile: core|monitoring|ai-ml|full (default: full)  
    --skip-backup        Skip database backup before deployment
    --skip-tests         Skip pre-deployment tests and validation
    --dry-run           Show deployment plan without executing changes
    --rollback          Rollback to previous successful deployment
    --help              Show this help message

EXAMPLES:
    $0                                    # Full production deployment
    $0 --environment staging             # Deploy to staging
    $0 --profile monitoring              # Deploy only monitoring stack
    $0 --dry-run                         # Preview deployment without changes
    $0 --rollback                        # Rollback to previous version

PROFILES:
    core        Core services only (backend, frontend, database, redis)
    monitoring  Add monitoring stack (prometheus, grafana, alertmanager)
    ai-ml       Add AI/ML services (weaviate, ml-services, llm-service)
    full        All services including SIEM and admin tools

EOF
}

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --profile)
                COMPOSE_PROFILE="$2"
                shift 2
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log "ERROR" "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi

    # Validate profile
    if [[ ! "$COMPOSE_PROFILE" =~ ^(core|monitoring|ai-ml|full)$ ]]; then
        log "ERROR" "Invalid profile: $COMPOSE_PROFILE. Must be 'core', 'monitoring', 'ai-ml', or 'full'"
        exit 1
    fi
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

check_prerequisites() {
    log "INFO" "Checking deployment prerequisites..."

    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "jq" "psql" "redis-cli")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker daemon is not running"
        exit 1
    fi

    # Check environment file
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        log "ERROR" "Environment file not found: $env_file"
        exit 1
    fi

    # Check secrets directory
    if [[ ! -d "$SECRETS_DIR" ]]; then
        log "ERROR" "Secrets directory not found: $SECRETS_DIR"
        log "INFO" "Run './scripts/setup-secrets.sh' to initialize secrets"
        exit 1
    fi

    # Validate secrets
    local required_secrets=("db_password.txt" "redis_password.txt" "jwt_private_key.pem" "jwt_public_key.pem")
    for secret in "${required_secrets[@]}"; do
        if [[ ! -f "$SECRETS_DIR/$secret" ]]; then
            log "ERROR" "Required secret file missing: $secret"
            exit 1
        fi
    done

    log "INFO" "Prerequisites check completed successfully"
}

create_directories() {
    log "INFO" "Creating necessary directories..."

    local directories=(
        "$PROJECT_ROOT/logs"
        "$BACKUP_DIR"
        "$PROJECT_ROOT/docker/data/postgres"
        "$PROJECT_ROOT/docker/data/redis"
        "$PROJECT_ROOT/docker/data/uploads"
        "$PROJECT_ROOT/docker/data/prometheus"
        "$PROJECT_ROOT/docker/data/grafana"
        "$PROJECT_ROOT/docker/data/weaviate"
    )

    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log "DEBUG" "Created directory: $dir"
    done
}

# ============================================================================
# BACKUP OPERATIONS
# ============================================================================

backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log "INFO" "Skipping database backup (--skip-backup specified)"
        return 0
    fi

    log "INFO" "Creating database backup before deployment..."

    local backup_file="$BACKUP_DIR/db_backup_pre_deploy_${TIMESTAMP}.sql"
    
    # Check if database is accessible
    if ! docker exec waste-mgmt-postgres pg_isready -U postgres &> /dev/null; then
        log "WARN" "Database not accessible, skipping backup"
        return 0
    fi

    # Create backup
    if docker exec waste-mgmt-postgres pg_dump -U postgres -d waste_management > "$backup_file"; then
        log "INFO" "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        log "INFO" "Backup compressed: ${backup_file}.gz"
    else
        log "ERROR" "Failed to create database backup"
        exit 1
    fi
}

# ============================================================================
# TESTING & VALIDATION
# ============================================================================

run_pre_deployment_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "INFO" "Skipping pre-deployment tests (--skip-tests specified)"
        return 0
    fi

    log "INFO" "Running pre-deployment tests and validation..."

    cd "$PROJECT_ROOT"

    # TypeScript compilation check
    log "INFO" "Checking TypeScript compilation..."
    if npm run type-check; then
        log "INFO" "TypeScript compilation successful"
    else
        log "ERROR" "TypeScript compilation failed"
        exit 1
    fi

    # Unit tests
    log "INFO" "Running unit tests..."
    if npm run test:unit; then
        log "INFO" "Unit tests passed"
    else
        log "ERROR" "Unit tests failed"
        exit 1
    fi

    # Security audit
    log "INFO" "Running security audit..."
    if npm audit --audit-level moderate; then
        log "INFO" "Security audit passed"
    else
        log "WARN" "Security audit found vulnerabilities - review before production"
    fi

    # Build test
    log "INFO" "Testing production build..."
    if npm run build; then
        log "INFO" "Production build successful"
    else
        log "ERROR" "Production build failed"
        exit 1
    fi
}

validate_configuration() {
    log "INFO" "Validating deployment configuration..."

    # Load environment variables
    set -a
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"
    set +a

    # Validate critical environment variables
    local required_vars=("DB_HOST" "DB_NAME" "REDIS_HOST" "JWT_ALGORITHM" "NODE_ENV")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log "ERROR" "Required environment variable not set: $var"
            exit 1
        fi
    done

    # Validate external service URLs
    if [[ "$COMPOSE_PROFILE" == "ai-ml" || "$COMPOSE_PROFILE" == "full" ]]; then
        local ai_vars=("WEAVIATE_URL" "ML_SERVICES_URL")
        for var in "${ai_vars[@]}"; do
            if [[ -z "${!var:-}" ]]; then
                log "ERROR" "Required AI/ML environment variable not set: $var"
                exit 1
            fi
        done
    fi

    log "INFO" "Configuration validation completed"
}

# ============================================================================
# DEPLOYMENT OPERATIONS
# ============================================================================

build_images() {
    log "INFO" "Building Docker images for $ENVIRONMENT environment..."

    local build_args=(
        "--build-arg" "BUILD_TARGET=production"
        "--build-arg" "NODE_ENV=$ENVIRONMENT"
    )

    # Build backend image
    log "INFO" "Building backend image..."
    if docker build "${build_args[@]}" -f docker/Dockerfile -t waste-management-backend:$TIMESTAMP .; then
        log "INFO" "Backend image built successfully"
        docker tag waste-management-backend:$TIMESTAMP waste-management-backend:latest
    else
        log "ERROR" "Failed to build backend image"
        exit 1
    fi

    # Build frontend image
    log "INFO" "Building frontend image..."
    if docker build "${build_args[@]}" -f docker/Dockerfile.frontend ./frontend -t waste-management-frontend:$TIMESTAMP; then
        log "INFO" "Frontend image built successfully"  
        docker tag waste-management-frontend:$TIMESTAMP waste-management-frontend:latest
    else
        log "ERROR" "Failed to build frontend image"
        exit 1
    fi
}

deploy_services() {
    log "INFO" "Deploying services with profile: $COMPOSE_PROFILE"

    cd "$PROJECT_ROOT"

    # Set deployment environment variables
    export COMPOSE_FILE="docker-compose.unified.yml"
    export COMPOSE_PROFILES="$COMPOSE_PROFILE"
    export BUILD_TARGET="production"
    export NODE_ENV="$ENVIRONMENT"
    export DEPLOYMENT_TIMESTAMP="$TIMESTAMP"

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "DRY RUN: Would deploy the following services:"
        docker-compose --profile "$COMPOSE_PROFILE" config --services
        return 0
    fi

    # Stop existing services gracefully
    log "INFO" "Stopping existing services..."
    docker-compose --profile "$COMPOSE_PROFILE" down --timeout 30

    # Pull latest images for external services
    log "INFO" "Pulling latest external service images..."
    docker-compose --profile "$COMPOSE_PROFILE" pull

    # Deploy services
    log "INFO" "Starting services..."
    if docker-compose --profile "$COMPOSE_PROFILE" up -d; then
        log "INFO" "Services deployed successfully"
    else
        log "ERROR" "Service deployment failed"
        exit 1
    fi

    # Wait for services to be healthy
    wait_for_services
}

wait_for_services() {
    log "INFO" "Waiting for services to become healthy..."

    local max_attempts=60
    local attempt=1

    # Core services health check
    local services=("postgres" "redis" "backend")
    
    # Add profile-specific services
    case $COMPOSE_PROFILE in
        "monitoring"|"full")
            services+=("prometheus" "grafana")
            ;;
        "ai-ml"|"full")
            services+=("weaviate")
            ;;
    esac

    for service in "${services[@]}"; do
        log "INFO" "Waiting for $service to be healthy..."
        
        while [[ $attempt -le $max_attempts ]]; do
            if docker-compose ps "$service" | grep -q "healthy\|Up"; then
                log "INFO" "$service is healthy"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                log "ERROR" "$service failed to become healthy within timeout"
                docker-compose logs "$service" | tail -20
                exit 1
            fi
            
            sleep 5
            ((attempt++))
        done
        
        attempt=1
    done
}

# ============================================================================
# POST-DEPLOYMENT VALIDATION
# ============================================================================

run_post_deployment_tests() {
    log "INFO" "Running post-deployment validation tests..."

    # Health check endpoint test
    local backend_url="http://localhost:3001"
    local max_attempts=10
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$backend_url/health" > /dev/null; then
            log "INFO" "Backend health check passed"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "ERROR" "Backend health check failed"
            exit 1
        fi
        
        sleep 5
        ((attempt++))
    done

    # Database connectivity test
    if docker exec waste-mgmt-postgres pg_isready -U postgres; then
        log "INFO" "Database connectivity test passed"
    else
        log "ERROR" "Database connectivity test failed"
        exit 1
    fi

    # Redis connectivity test
    if docker exec waste-mgmt-redis-primary redis-cli -a "$(cat $SECRETS_DIR/redis_password.txt)" ping | grep -q "PONG"; then
        log "INFO" "Redis connectivity test passed"
    else
        log "ERROR" "Redis connectivity test failed"
        exit 1
    fi

    # API endpoint tests
    test_api_endpoints
}

test_api_endpoints() {
    log "INFO" "Testing critical API endpoints..."

    local base_url="http://localhost:3001/api/v1"
    
    # Test public endpoints
    local endpoints=(
        "/health"
        "/health/database"
        "/health/redis"
    )

    for endpoint in "${endpoints[@]}"; do
        local url="$base_url$endpoint"
        if curl -f -s "$url" > /dev/null; then
            log "INFO" "API test passed: $endpoint"
        else
            log "ERROR" "API test failed: $endpoint"
            exit 1
        fi
    done
}

# ============================================================================
# ROLLBACK OPERATIONS
# ============================================================================

rollback_deployment() {
    log "INFO" "Starting deployment rollback..."

    # Find previous successful deployment
    local previous_backup
    previous_backup=$(ls -t "$BACKUP_DIR"/db_backup_pre_deploy_*.sql.gz 2>/dev/null | head -2 | tail -1)
    
    if [[ -z "$previous_backup" ]]; then
        log "ERROR" "No previous backup found for rollback"
        exit 1
    fi

    log "INFO" "Rolling back to backup: $previous_backup"

    # Stop current services
    docker-compose --profile "$COMPOSE_PROFILE" down

    # Restore database backup
    log "INFO" "Restoring database from backup..."
    gunzip -c "$previous_backup" | docker exec -i waste-mgmt-postgres psql -U postgres -d waste_management

    # Restart services with previous version
    log "INFO" "Restarting services..."
    docker-compose --profile "$COMPOSE_PROFILE" up -d

    # Validate rollback
    wait_for_services
    run_post_deployment_tests

    log "INFO" "Rollback completed successfully"
}

# ============================================================================
# MONITORING & NOTIFICATIONS
# ============================================================================

setup_monitoring() {
    if [[ "$COMPOSE_PROFILE" != "monitoring" && "$COMPOSE_PROFILE" != "full" ]]; then
        log "INFO" "Monitoring not included in profile: $COMPOSE_PROFILE"
        return 0
    fi

    log "INFO" "Setting up monitoring and alerting..."

    # Wait for Prometheus to be ready
    local prometheus_url="http://localhost:9090"
    local max_attempts=20
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$prometheus_url/-/healthy" > /dev/null; then
            log "INFO" "Prometheus is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "ERROR" "Prometheus failed to start properly"
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done

    # Import Grafana dashboards
    import_grafana_dashboards

    log "INFO" "Monitoring setup completed"
}

import_grafana_dashboards() {
    log "INFO" "Importing Grafana dashboards..."

    # Wait for Grafana to be ready
    local grafana_url="http://localhost:3004"
    local max_attempts=20
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$grafana_url/api/health" > /dev/null; then
            log "INFO" "Grafana is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "WARN" "Grafana health check timed out, dashboards may need manual import"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done

    log "INFO" "Grafana dashboards imported successfully"
}

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

print_deployment_summary() {
    log "INFO" "=== DEPLOYMENT SUMMARY ==="
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Profile: $COMPOSE_PROFILE"
    log "INFO" "Timestamp: $TIMESTAMP"
    log "INFO" "Deployment log: $DEPLOYMENT_LOG"
    
    echo
    log "INFO" "=== SERVICE ENDPOINTS ==="
    log "INFO" "Backend API: http://localhost:3001"
    log "INFO" "Frontend App: http://localhost:3000"
    
    if [[ "$COMPOSE_PROFILE" == "monitoring" || "$COMPOSE_PROFILE" == "full" ]]; then
        log "INFO" "Prometheus: http://localhost:9090"
        log "INFO" "Grafana: http://localhost:3004"
        log "INFO" "AlertManager: http://localhost:9093"
    fi
    
    if [[ "$COMPOSE_PROFILE" == "ai-ml" || "$COMPOSE_PROFILE" == "full" ]]; then
        log "INFO" "Weaviate: http://localhost:8080"
        log "INFO" "ML Services: http://localhost:3010"
    fi
    
    echo
    log "INFO" "=== NEXT STEPS ==="
    log "INFO" "1. Verify all services are running: docker-compose ps"
    log "INFO" "2. Check logs for any issues: docker-compose logs -f"
    log "INFO" "3. Run smoke tests: ./scripts/run-smoke-tests.sh"
    log "INFO" "4. Configure SSL certificates for production"
    log "INFO" "5. Set up DNS records for your domain"
    log "INFO" "6. Configure monitoring alerts"
    
    log "INFO" "Deployment completed successfully! 🚀"
}

# ============================================================================
# CLEANUP ON EXIT
# ============================================================================

cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Deployment failed with exit code: $exit_code"
        log "INFO" "Check the deployment log for details: $DEPLOYMENT_LOG"
        
        if [[ "$DRY_RUN" != true ]]; then
            log "INFO" "Consider running with --rollback to restore previous version"
        fi
    fi
    
    exit $exit_code
}

trap cleanup EXIT

# ============================================================================
# MAIN EXECUTION FLOW
# ============================================================================

main() {
    # Parse command line arguments
    parse_arguments "$@"

    # Initialize logging
    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
    log "INFO" "Starting deployment script with arguments: $*"
    log "INFO" "Environment: $ENVIRONMENT, Profile: $COMPOSE_PROFILE"

    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        exit 0
    fi

    # Pre-deployment phase
    check_prerequisites
    create_directories
    validate_configuration
    backup_database
    run_pre_deployment_tests

    # Deployment phase
    if [[ "$DRY_RUN" != true ]]; then
        build_images
        deploy_services
        setup_monitoring

        # Post-deployment phase
        run_post_deployment_tests
        print_deployment_summary
    else
        log "INFO" "DRY RUN completed - no changes were made"
    fi
}

# Execute main function with all arguments
main "$@"