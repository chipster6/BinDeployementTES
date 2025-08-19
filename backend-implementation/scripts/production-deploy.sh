#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - PRODUCTION DEPLOYMENT AUTOMATION
# ============================================================================
#
# Comprehensive production deployment script with health checks,
# rollback capabilities, and monitoring integration
#
# Created by: Infrastructure Agent
# Date: 2025-08-12
# Version: 1.0.0
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="waste-management-system"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-waste-mgmt/backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ENABLED=true

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking production deployment prerequisites..."
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check environment files
    if [[ ! -f ".env.production" ]]; then
        log_error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    # Check SSL certificates for production
    if [[ "$DEPLOYMENT_ENV" == "production" ]] && [[ ! -f "docker/nginx/ssl/waste-mgmt.com.crt" ]]; then
        log_warning "SSL certificates not found. HTTPS will not work."
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate environment configuration
validate_environment() {
    log_step "Validating production environment configuration..."
    
    # Source production environment
    source .env.production
    
    # Check critical environment variables
    required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "ENCRYPTION_KEY"
        "SESSION_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
        
        # Check minimum length for secrets
        if [[ ${#!var} -lt 32 ]]; then
            log_error "Environment variable $var must be at least 32 characters long"
            exit 1
        fi
    done
    
    log_success "Environment configuration validated"
}

# Function to backup current deployment
backup_current_deployment() {
    log_step "Creating backup of current deployment..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U postgres waste_management > "$backup_dir/database_backup.sql"
    fi
    
    # Backup Redis data
    if docker-compose ps redis | grep -q "Up"; then
        log_info "Backing up Redis data..."
        docker-compose exec -T redis redis-cli BGSAVE
        docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$backup_dir/redis_backup.rdb"
    fi
    
    # Backup configuration
    cp -r docker/ "$backup_dir/"
    cp .env.production "$backup_dir/"
    
    echo "$backup_dir" > .last_backup
    log_success "Backup created: $backup_dir"
}

# Function to pull latest images
pull_images() {
    log_step "Pulling latest Docker images..."
    
    # Pull backend image
    log_info "Pulling backend image: $IMAGE_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    docker pull "$IMAGE_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    
    # Pull other images
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
    
    log_success "Images pulled successfully"
}

# Function to start services with health checks
deploy_services() {
    log_step "Deploying services to production..."
    
    # Copy production environment
    cp .env.production .env
    
    # Deploy with production overrides
    log_info "Starting core services (database and cache)..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis
    
    # Wait for core services
    wait_for_service "postgres" "PostgreSQL" 60
    wait_for_service "redis" "Redis" 30
    
    # Deploy application services
    log_info "Deploying application services..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend
    
    # Wait for application services
    wait_for_service "backend" "Backend API" 120
    wait_for_service "frontend" "Frontend" 60
    
    # Deploy infrastructure services
    log_info "Starting infrastructure services..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
    
    # Deploy monitoring services with enhanced configuration
    log_info "Deploying monitoring stack..."
    docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
    
    log_success "All services deployed successfully"
}

# Function to wait for service health
wait_for_service() {
    local service="$1"
    local name="$2"
    local timeout="$3"
    local counter=0
    
    log_info "Waiting for $name to be healthy..."
    
    while ! docker-compose exec -T "$service" true &> /dev/null; do
        if [[ $counter -ge $timeout ]]; then
            log_error "Timeout waiting for $name to start"
            return 1
        fi
        sleep 2
        counter=$((counter + 2))
        echo -n "."
    done
    echo ""
    
    log_success "$name is healthy"
}

# Function to run database migrations
run_migrations() {
    log_step "Running database migrations..."
    
    # Wait for backend to be fully ready
    sleep 10
    
    if docker-compose exec -T backend npm run db:migrate; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
}

# Function to run comprehensive health checks
run_health_checks() {
    log_step "Running comprehensive health checks..."
    
    local failed_checks=0
    
    # Database health
    if docker-compose exec -T postgres pg_isready -U postgres; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Unhealthy"
        ((failed_checks++))
    fi
    
    # Redis health
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Unhealthy"
        ((failed_checks++))
    fi
    
    # Backend API health
    if curl -sf "http://localhost:3001/health" &> /dev/null; then
        log_success "Backend API: Healthy"
    else
        log_error "Backend API: Unhealthy"
        ((failed_checks++))
    fi
    
    # Frontend health
    if curl -sf "http://localhost:3000/api/health" &> /dev/null; then
        log_success "Frontend: Healthy"
    else
        log_warning "Frontend: Not ready (this may be normal)"
    fi
    
    # Nginx health
    if docker-compose exec -T nginx nginx -t &> /dev/null; then
        log_success "Nginx: Configuration valid"
    else
        log_error "Nginx: Configuration invalid"
        ((failed_checks++))
    fi
    
    if [[ $failed_checks -gt 0 ]]; then
        log_error "$failed_checks health checks failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Function to run smoke tests
run_smoke_tests() {
    log_step "Running production smoke tests..."
    
    # Basic connectivity tests
    local base_url="http://localhost:3001"
    
    # Test health endpoint
    if ! curl -sf "$base_url/health" | jq -e '.status == "healthy"' &> /dev/null; then
        log_error "Health endpoint failed"
        return 1
    fi
    
    # Test API status
    if ! curl -sf "$base_url/api/v1/status" &> /dev/null; then
        log_error "API status endpoint failed"
        return 1
    fi
    
    # Test database connectivity
    if ! curl -sf "$base_url/health/database" | jq -e '.database.connected == true' &> /dev/null; then
        log_error "Database connectivity test failed"
        return 1
    fi
    
    # Test Redis connectivity
    if ! curl -sf "$base_url/health/redis" | jq -e '.redis.connected == true' &> /dev/null; then
        log_error "Redis connectivity test failed"
        return 1
    fi
    
    log_success "Smoke tests passed"
}

# Function to rollback deployment
rollback_deployment() {
    log_step "Initiating deployment rollback..."
    
    if [[ ! -f ".last_backup" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    local backup_dir=$(cat .last_backup)
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory not found: $backup_dir"
        exit 1
    fi
    
    log_warning "Rolling back to backup: $backup_dir"
    
    # Stop current services
    docker-compose down
    
    # Restore configuration
    cp "$backup_dir/.env.production" .env.production
    cp -r "$backup_dir/docker/" ./
    
    # Restore database
    if [[ -f "$backup_dir/database_backup.sql" ]]; then
        log_info "Restoring database..."
        docker-compose up -d postgres
        wait_for_service "postgres" "PostgreSQL" 60
        docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS waste_management;"
        docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE waste_management;"
        docker-compose exec -T postgres psql -U postgres waste_management < "$backup_dir/database_backup.sql"
    fi
    
    # Restart services
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    log_success "Rollback completed"
}

# Function to show deployment status
show_deployment_status() {
    log_step "Deployment Status Summary"
    
    echo ""
    log_info "Service Status:"
    docker-compose ps
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    echo ""
    log_info "Access URLs:"
    echo "  Production API:     https://api.waste-mgmt.com"
    echo "  Production App:     https://app.waste-mgmt.com"
    echo "  Health Check:       https://api.waste-mgmt.com/health"
    echo "  API Documentation:  https://api.waste-mgmt.com/api-docs"
    echo "  Monitoring:"
    echo "    Grafana:          http://localhost:3004"
    echo "    Prometheus:       http://localhost:9090"
    
    echo ""
    log_info "Monitoring Commands:"
    echo "  View logs:          docker-compose logs -f [service]"
    echo "  Monitor metrics:    curl http://localhost:9090/metrics"
    echo "  Check health:       curl https://api.waste-mgmt.com/health"
}

# Function to setup monitoring alerts
setup_monitoring() {
    log_step "Setting up production monitoring..."
    
    # Use enhanced monitoring deployment script if available
    if [[ -f "$PROJECT_ROOT/scripts/production-monitoring-deploy.sh" ]]; then
        log_info "Using enhanced monitoring deployment..."
        chmod +x "$PROJECT_ROOT/scripts/production-monitoring-deploy.sh"
        "$PROJECT_ROOT/scripts/production-monitoring-deploy.sh" deploy
    else
        # Fallback to basic monitoring setup
        log_info "Using basic monitoring setup..."
        docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
        
        # Wait for Prometheus
        wait_for_service "prometheus" "Prometheus" 60
        
        # Wait for Grafana
        wait_for_service "grafana" "Grafana" 60
    fi
    
    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log_info "Starting production deployment for $PROJECT_NAME"
            check_prerequisites
            validate_environment
            backup_current_deployment
            pull_images
            deploy_services
            run_migrations
            run_health_checks
            run_smoke_tests
            setup_monitoring
            show_deployment_status
            log_success "Production deployment completed successfully!"
            ;;
        "rollback")
            log_warning "Initiating emergency rollback"
            rollback_deployment
            run_health_checks
            show_deployment_status
            log_success "Rollback completed successfully!"
            ;;
        "health")
            run_health_checks
            ;;
        "status")
            show_deployment_status
            ;;
        "smoke-test")
            run_smoke_tests
            ;;
        "backup")
            backup_current_deployment
            ;;
        "monitoring")
            setup_monitoring
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|status|smoke-test|backup|monitoring}"
            echo ""
            echo "Commands:"
            echo "  deploy       - Full production deployment (default)"
            echo "  rollback     - Emergency rollback to last backup"
            echo "  health       - Run health checks"
            echo "  status       - Show deployment status"
            echo "  smoke-test   - Run production smoke tests"
            echo "  backup       - Create deployment backup"
            echo "  monitoring   - Setup monitoring stack"
            exit 1
            ;;
    esac
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Run main function with all arguments
main "$@"