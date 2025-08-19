#!/bin/bash

# ============================================================================
# PHASE 1 WEAVIATE DEPLOYMENT SCRIPT
# ============================================================================
#
# COORDINATION SESSION: phase-1-weaviate-execution-parallel
# 
# Automated deployment script for Phase 1 Weaviate vector intelligence
# foundation including database migration, Weaviate setup, and sync service.
#
# COORDINATION WITH:
# - Backend-Agent: Service integration and API connectivity
# - Performance-Optimization-Specialist: Performance validation and optimization
# - DevOps-Agent: Production deployment and monitoring
#
# Created by: Database-Architect
# Date: 2025-08-16
# Version: 1.0.0
# ============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/weaviate-deployment-$(date +%Y%m%d-%H%M%S).log"
MIGRATION_FILE="$PROJECT_ROOT/src/database/migrations/003-vector-embeddings-metadata.sql"
WEAVIATE_COMPOSE="$PROJECT_ROOT/docker-compose.weaviate.yml"

# Ensure logs directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Color output functions
print_header() {
    echo -e "${PURPLE}============================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}============================================================================${NC}"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
    log "INFO" "STEP: $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS" "$1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING" "$1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR" "$1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
    log "INFO" "$1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        print_error "Deployment failed with exit code $exit_code"
        print_info "Check log file: $LOG_FILE"
        print_info "To rollback, run: $SCRIPT_DIR/rollback-weaviate-phase1.sh"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites"
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if PostgreSQL is accessible
    if ! command -v psql &> /dev/null; then
        print_warning "psql not found. Assuming PostgreSQL connection will be handled by application."
    fi
    
    # Check required files
    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Vector migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    if [ ! -f "$WEAVIATE_COMPOSE" ]; then
        print_error "Weaviate compose file not found: $WEAVIATE_COMPOSE"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Load environment variables
load_environment() {
    print_step "Loading environment configuration"
    
    # Load .env file if it exists
    if [ -f "$PROJECT_ROOT/.env" ]; then
        print_info "Loading environment from $PROJECT_ROOT/.env"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        print_warning "No .env file found. Using default configuration."
    fi
    
    # Set default values if not provided
    export WEAVIATE_HOST=${WEAVIATE_HOST:-localhost}
    export WEAVIATE_PORT=${WEAVIATE_PORT:-8080}
    export WEAVIATE_SCHEME=${WEAVIATE_SCHEME:-http}
    export VECTOR_SYNC_ENABLED=${VECTOR_SYNC_ENABLED:-true}
    export VECTOR_SYNC_BATCH_SIZE=${VECTOR_SYNC_BATCH_SIZE:-50}
    export VECTOR_SYNC_INTERVAL_SECONDS=${VECTOR_SYNC_INTERVAL_SECONDS:-30}
    
    print_info "Weaviate configuration:"
    print_info "  Host: $WEAVIATE_HOST"
    print_info "  Port: $WEAVIATE_PORT"
    print_info "  Scheme: $WEAVIATE_SCHEME"
    print_info "  Sync Enabled: $VECTOR_SYNC_ENABLED"
    print_info "  Sync Batch Size: $VECTOR_SYNC_BATCH_SIZE"
    print_info "  Sync Interval: ${VECTOR_SYNC_INTERVAL_SECONDS}s"
    
    print_success "Environment configuration loaded"
}

# Create Docker network if needed
create_network() {
    print_step "Setting up Docker network"
    
    if ! docker network ls | grep -q "waste_mgmt_network"; then
        print_info "Creating waste_mgmt_network..."
        docker network create waste_mgmt_network
        print_success "Docker network created"
    else
        print_info "Docker network already exists"
    fi
}

# Deploy PostgreSQL vector migration
deploy_vector_migration() {
    print_step "Deploying PostgreSQL vector metadata schema"
    
    # Check if we can connect to the database
    if [ -n "${DB_HOST:-}" ] && [ -n "${DB_NAME:-}" ] && [ -n "${DB_USERNAME:-}" ]; then
        print_info "Running vector metadata migration..."
        
        # Set PostgreSQL connection parameters
        export PGHOST=${DB_HOST}
        export PGPORT=${DB_PORT:-5432}
        export PGDATABASE=${DB_NAME}
        export PGUSER=${DB_USERNAME}
        export PGPASSWORD=${DB_PASSWORD}
        
        # Run migration
        if psql -f "$MIGRATION_FILE" 2>&1 | tee -a "$LOG_FILE"; then
            print_success "Vector metadata migration completed successfully"
        else
            print_error "Vector metadata migration failed"
            exit 1
        fi
    else
        print_warning "Database connection parameters not provided."
        print_info "Please run the migration manually:"
        print_info "  psql -h \$DB_HOST -U \$DB_USERNAME -d \$DB_NAME -f $MIGRATION_FILE"
    fi
}

# Deploy Weaviate vector database
deploy_weaviate() {
    print_step "Deploying Weaviate vector database"
    
    cd "$PROJECT_ROOT"
    
    print_info "Starting Weaviate services..."
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.weaviate.yml up -d
    else
        docker compose -f docker-compose.weaviate.yml up -d
    fi
    
    print_info "Waiting for Weaviate to be ready..."
    
    # Wait for Weaviate health check
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/.well-known/ready" > /dev/null 2>&1; then
            print_success "Weaviate is ready and healthy"
            break
        fi
        
        print_info "Attempt $attempt/$max_attempts - Waiting for Weaviate..."
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Weaviate health check failed after $max_attempts attempts"
        print_info "Check Weaviate logs: docker-compose -f docker-compose.weaviate.yml logs weaviate"
        exit 1
    fi
    
    # Verify Weaviate cluster status
    print_info "Verifying Weaviate cluster status..."
    local weaviate_meta
    if weaviate_meta=$(curl -s "http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/meta" 2>/dev/null); then
        local version=$(echo "$weaviate_meta" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        local hostname=$(echo "$weaviate_meta" | grep -o '"hostname":"[^"]*"' | cut -d'"' -f4)
        
        print_success "Weaviate cluster operational"
        print_info "  Version: $version"
        print_info "  Hostname: $hostname"
        print_info "  URL: $WEAVIATE_SCHEME://$WEAVIATE_HOST:$WEAVIATE_PORT"
    else
        print_warning "Could not retrieve Weaviate metadata, but service appears to be running"
    fi
}

# Validate deployment
validate_deployment() {
    print_step "Validating Phase 1 Weaviate deployment"
    
    local validation_errors=0
    
    # Check Weaviate health
    print_info "Checking Weaviate health..."
    if curl -f -s "http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/.well-known/ready" > /dev/null; then
        print_success "✓ Weaviate health check passed"
    else
        print_error "✗ Weaviate health check failed"
        ((validation_errors++))
    fi
    
    # Check Weaviate GraphQL endpoint
    print_info "Checking Weaviate GraphQL endpoint..."
    if curl -f -s "http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/graphql" > /dev/null; then
        print_success "✓ Weaviate GraphQL endpoint accessible"
    else
        print_error "✗ Weaviate GraphQL endpoint not accessible"
        ((validation_errors++))
    fi
    
    # Check vector metadata tables (if database connection available)
    if [ -n "${DB_HOST:-}" ] && [ -n "${DB_NAME:-}" ] && [ -n "${DB_USERNAME:-}" ]; then
        print_info "Checking PostgreSQL vector metadata tables..."
        
        export PGHOST=${DB_HOST}
        export PGPORT=${DB_PORT:-5432}
        export PGDATABASE=${DB_NAME}
        export PGUSER=${DB_USERNAME}
        export PGPASSWORD=${DB_PASSWORD}
        
        if psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('vector_embeddings', 'vector_sync_status');" -t | grep -q "2"; then
            print_success "✓ Vector metadata tables exist"
        else
            print_error "✗ Vector metadata tables missing"
            ((validation_errors++))
        fi
        
        # Check vector functions
        if psql -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE 'trigger_vector_sync%' OR routine_name LIKE '%vector%';" -t | grep -q -E "[5-9]|[1-9][0-9]"; then
            print_success "✓ Vector functions deployed"
        else
            print_error "✗ Vector functions missing"
            ((validation_errors++))
        fi
    else
        print_warning "Cannot validate PostgreSQL vector metadata (connection parameters not provided)"
    fi
    
    # Check Docker containers
    print_info "Checking Docker container status..."
    if docker ps --filter "name=waste_mgmt_weaviate" --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        print_success "✓ Weaviate container running"
    else
        print_error "✗ Weaviate container not running"
        ((validation_errors++))
    fi
    
    # Summary
    if [ $validation_errors -eq 0 ]; then
        print_success "All validation checks passed!"
        return 0
    else
        print_error "$validation_errors validation checks failed"
        return 1
    fi
}

# Display deployment summary
show_deployment_summary() {
    print_header "PHASE 1 WEAVIATE DEPLOYMENT SUMMARY"
    
    echo -e "${GREEN}Deployment Status: SUCCESS${NC}"
    echo ""
    echo -e "${CYAN}Weaviate Vector Database:${NC}"
    echo -e "  URL: $WEAVIATE_SCHEME://$WEAVIATE_HOST:$WEAVIATE_PORT"
    echo -e "  GraphQL: $WEAVIATE_SCHEME://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/graphql"
    echo -e "  Health: $WEAVIATE_SCHEME://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/.well-known/ready"
    echo -e "  Metrics: http://$WEAVIATE_HOST:2112/metrics"
    echo ""
    echo -e "${CYAN}Vector Synchronization:${NC}"
    echo -e "  Enabled: $VECTOR_SYNC_ENABLED"
    echo -e "  Batch Size: $VECTOR_SYNC_BATCH_SIZE entities"
    echo -e "  Sync Interval: ${VECTOR_SYNC_INTERVAL_SECONDS} seconds"
    echo ""
    echo -e "${CYAN}Deployment Artifacts:${NC}"
    echo -e "  Migration: $MIGRATION_FILE"
    echo -e "  Docker Compose: $WEAVIATE_COMPOSE"
    echo -e "  Log File: $LOG_FILE"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  1. Verify backend application can connect to Weaviate"
    echo -e "  2. Test vector sync functionality: npm run test:vector-sync"
    echo -e "  3. Monitor Weaviate metrics and performance"
    echo -e "  4. Set up production security (API keys, SSL)"
    echo ""
    echo -e "${CYAN}Management Commands:${NC}"
    echo -e "  Start: docker-compose -f docker-compose.weaviate.yml up -d"
    echo -e "  Stop: docker-compose -f docker-compose.weaviate.yml down"
    echo -e "  Logs: docker-compose -f docker-compose.weaviate.yml logs -f weaviate"
    echo -e "  Health: curl http://$WEAVIATE_HOST:$WEAVIATE_PORT/v1/.well-known/ready"
    echo ""
    print_success "Phase 1 Weaviate deployment completed successfully!"
}

# Main deployment flow
main() {
    print_header "PHASE 1 WEAVIATE VECTOR INTELLIGENCE DEPLOYMENT"
    print_info "Coordination Session: phase-1-weaviate-execution-parallel"
    print_info "Database Architect executing complete deployment"
    print_info "Log file: $LOG_FILE"
    echo ""
    
    # Execute deployment steps
    check_prerequisites
    load_environment
    create_network
    deploy_vector_migration
    deploy_weaviate
    
    # Validate deployment
    if validate_deployment; then
        show_deployment_summary
        
        print_header "DEPLOYMENT SUCCESSFUL"
        print_success "Phase 1 Weaviate vector intelligence foundation is operational!"
        print_info "Vector metadata storage: PostgreSQL tables deployed"
        print_info "Vector database: Weaviate cluster running"
        print_info "Real-time sync: Triggers and functions active"
        print_info "API integration: Ready for backend service connection"
        
        exit 0
    else
        print_error "Deployment validation failed. Please check the issues above."
        exit 1
    fi
}

# Show usage if requested
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Phase 1 Weaviate Vector Intelligence Deployment Script"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  WEAVIATE_HOST             Weaviate host (default: localhost)"
    echo "  WEAVIATE_PORT             Weaviate port (default: 8080)"
    echo "  WEAVIATE_SCHEME           Weaviate scheme (default: http)"
    echo "  WEAVIATE_OPENAI_API_KEY   OpenAI API key for vectorization"
    echo "  VECTOR_SYNC_ENABLED       Enable vector sync (default: true)"
    echo "  VECTOR_SYNC_BATCH_SIZE    Sync batch size (default: 50)"
    echo "  VECTOR_SYNC_INTERVAL_SECONDS  Sync interval (default: 30)"
    echo "  DB_HOST                   PostgreSQL host"
    echo "  DB_NAME                   PostgreSQL database name"
    echo "  DB_USERNAME               PostgreSQL username"
    echo "  DB_PASSWORD               PostgreSQL password"
    echo ""
    echo "Examples:"
    echo "  $0                        # Deploy with default settings"
    echo "  WEAVIATE_PORT=8081 $0     # Deploy with custom Weaviate port"
    echo ""
    exit 0
fi

# Execute main deployment
main "$@"