#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - DEVELOPMENT ENVIRONMENT SETUP
# ============================================================================
#
# This script sets up the complete development environment with Docker
# Fixes critical infrastructure issues for immediate development use
#
# Created by: DevOps Infrastructure Orchestrator
# Date: 2025-08-13
# Version: 1.0.0
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

log_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

# Check if Docker is running
check_docker() {
    log_info "Checking Docker daemon status..."
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running!"
        log_info "Please start Docker Desktop and try again."
        log_info "On macOS: Open Docker Desktop application"
        log_info "On Linux: sudo systemctl start docker"
        exit 1
    fi
    
    log_success "Docker daemon is running"
}

# Create required directories
setup_directories() {
    log_info "Creating required directories..."
    
    # Create Docker data directories
    mkdir -p docker/data/postgres
    mkdir -p docker/data/redis
    mkdir -p docker/data/uploads
    mkdir -p docker/data/logs
    
    # Set proper permissions
    chmod 755 docker/data/postgres
    chmod 755 docker/data/redis
    chmod 755 docker/data/uploads
    chmod 755 docker/data/logs
    
    log_success "Directories created successfully"
}

# Stop and clean existing containers
cleanup_containers() {
    log_info "Cleaning up existing containers..."
    
    # Stop containers if running
    docker-compose down -v 2>/dev/null || true
    
    # Remove specific containers if they exist
    docker rm -f waste-mgmt-postgres 2>/dev/null || true
    docker rm -f waste-mgmt-redis 2>/dev/null || true
    docker rm -f waste-mgmt-backend 2>/dev/null || true
    
    # Clean up volumes
    docker volume prune -f 2>/dev/null || true
    
    log_success "Container cleanup completed"
}

# Start PostgreSQL and Redis services
start_database_services() {
    log_info "Starting PostgreSQL and Redis services..."
    
    # Start only database services first
    docker-compose up -d postgres redis
    
    log_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    local postgres_ready=false
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ] && [ "$postgres_ready" = false ]; do
        if docker-compose exec -T postgres pg_isready -U postgres -d waste_management >/dev/null 2>&1; then
            postgres_ready=true
            log_success "PostgreSQL is ready"
        else
            log_info "Waiting for PostgreSQL... ($((attempts + 1))/$max_attempts)"
            sleep 2
            attempts=$((attempts + 1))
        fi
    done
    
    if [ "$postgres_ready" = false ]; then
        log_error "PostgreSQL failed to start within timeout"
        exit 1
    fi
    
    # Wait for Redis
    local redis_ready=false
    attempts=0
    
    while [ $attempts -lt $max_attempts ] && [ "$redis_ready" = false ]; do
        if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            redis_ready=true
            log_success "Redis is ready"
        else
            log_info "Waiting for Redis... ($((attempts + 1))/$max_attempts)"
            sleep 2
            attempts=$((attempts + 1))
        fi
    done
    
    if [ "$redis_ready" = false ]; then
        log_error "Redis failed to start within timeout"
        exit 1
    fi
}

# Initialize database
setup_database() {
    log_info "Setting up database schema..."
    
    # Create database if it doesn't exist
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE waste_management;" 2>/dev/null || true
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE waste_management_test;" 2>/dev/null || true
    
    # Enable PostGIS extension
    docker-compose exec -T postgres psql -U postgres -d waste_management -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
    docker-compose exec -T postgres psql -U postgres -d waste_management_test -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
    
    log_success "Database setup completed"
}

# Test connectivity
test_connectivity() {
    log_info "Testing database connectivity..."
    
    # Test PostgreSQL
    if docker-compose exec -T postgres psql -U postgres -d waste_management -c "SELECT version();" >/dev/null 2>&1; then
        log_success "PostgreSQL connection successful"
    else
        log_error "PostgreSQL connection failed"
        exit 1
    fi
    
    # Test Redis
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        log_success "Redis connection successful"
    else
        log_error "Redis connection failed"
        exit 1
    fi
}

# Install npm dependencies if needed
install_dependencies() {
    log_info "Checking npm dependencies..."
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_info "Installing npm dependencies..."
        npm ci
        log_success "Dependencies installed"
    else
        log_success "Dependencies already installed"
    fi
}

# Run tests to validate setup
validate_setup() {
    log_info "Validating setup with path mapping test..."
    
    # Run a specific test to check if Jest path mapping works
    if npm test -- --testNamePattern="path-alias-test" --testTimeout=10000 >/dev/null 2>&1; then
        log_success "Jest path mapping validation successful"
    else
        log_warning "Jest path mapping test failed, but infrastructure is ready"
        log_info "You may need to run 'npm run build' before testing"
    fi
}

# Main execution
main() {
    log_header "WASTE MANAGEMENT SYSTEM - DEVELOPMENT SETUP"
    
    # Pre-flight checks
    check_docker
    
    # Setup process
    setup_directories
    cleanup_containers
    start_database_services
    setup_database
    test_connectivity
    install_dependencies
    validate_setup
    
    log_header "SETUP COMPLETED SUCCESSFULLY"
    log_success "Development environment is ready!"
    echo ""
    log_info "Services running:"
    log_info "  - PostgreSQL: localhost:5432 (username: postgres, password: postgres123)"
    log_info "  - Redis: localhost:6379 (password: redis123)"
    echo ""
    log_info "Quick start commands:"
    log_info "  npm run dev:ts        # Start development server"
    log_info "  npm run test          # Run tests"
    log_info "  npm run build         # Build for production"
    echo ""
    log_info "Docker commands:"
    log_info "  docker-compose ps     # Check service status"
    log_info "  docker-compose logs   # View service logs"
    log_info "  docker-compose down   # Stop all services"
    echo ""
}

# Execute main function
main "$@"