#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - DOCKER ENVIRONMENT SETUP
# ============================================================================
#
# Automated setup script for Docker development environment
# Handles data directories, permissions, and service initialization
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

# Configuration
PROJECT_NAME="waste-management-system"
DOCKER_DATA_DIR="./docker/data"
ENV_FILE=".env.docker"

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to create data directories
create_data_directories() {
    log_info "Creating data directories..."
    
    directories=(
        "${DOCKER_DATA_DIR}/postgres"
        "${DOCKER_DATA_DIR}/redis"
        "${DOCKER_DATA_DIR}/uploads"
        "${DOCKER_DATA_DIR}/logs"
        "${DOCKER_DATA_DIR}/nginx/logs"
        "${DOCKER_DATA_DIR}/grafana"
        "${DOCKER_DATA_DIR}/prometheus"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        else
            log_info "Directory already exists: $dir"
        fi
    done
    
    # Set appropriate permissions
    chmod 755 "${DOCKER_DATA_DIR}"
    chmod 700 "${DOCKER_DATA_DIR}/postgres"
    chmod 755 "${DOCKER_DATA_DIR}/redis"
    chmod 755 "${DOCKER_DATA_DIR}/uploads"
    chmod 755 "${DOCKER_DATA_DIR}/logs"
    
    log_success "Data directories created successfully"
}

# Function to setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Environment file $ENV_FILE not found. Using defaults."
        return 0
    fi
    
    # Copy environment file for Docker Compose
    cp "$ENV_FILE" ".env"
    log_success "Environment configuration set up"
}

# Function to build Docker images
build_images() {
    log_info "Building Docker images..."
    
    # Build backend image
    log_info "Building backend image..."
    docker-compose build backend
    
    # Build frontend image
    log_info "Building frontend image..."
    docker-compose build frontend
    
    log_success "Docker images built successfully"
}

# Function to start services
start_services() {
    log_info "Starting Docker services..."
    
    # Start core services first (database and cache)
    log_info "Starting PostgreSQL and Redis..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    timeout=60
    counter=0
    while ! docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; do
        if [[ $counter -ge $timeout ]]; then
            log_error "Timeout waiting for PostgreSQL to start"
            exit 1
        fi
        sleep 2
        counter=$((counter + 2))
        echo -n "."
    done
    echo ""
    log_success "PostgreSQL is ready"
    
    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    timeout=30
    counter=0
    while ! docker-compose exec -T redis redis-cli ping &> /dev/null; do
        if [[ $counter -ge $timeout ]]; then
            log_error "Timeout waiting for Redis to start"
            exit 1
        fi
        sleep 1
        counter=$((counter + 1))
        echo -n "."
    done
    echo ""
    log_success "Redis is ready"
    
    # Start application services
    log_info "Starting backend and frontend services..."
    docker-compose up -d backend frontend
    
    # Start admin tools (if enabled)
    log_info "Starting admin tools..."
    docker-compose up -d pgadmin redis-commander
    
    log_success "All services started successfully"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait a bit for backend to be fully ready
    sleep 10
    
    # Run migrations inside the backend container
    if docker-compose exec -T backend npm run db:migrate; then
        log_success "Database migrations completed"
    else
        log_warning "Database migrations failed or not configured yet"
    fi
}

# Function to show service status
show_status() {
    log_info "Service Status:"
    docker-compose ps
    
    echo ""
    log_info "Access URLs:"
    echo "  Backend API:        http://localhost:3001"
    echo "  Frontend:           http://localhost:3000"
    echo "  API Documentation:  http://localhost:3001/api-docs"
    echo "  pgAdmin:            http://localhost:8080"
    echo "  Redis Commander:    http://localhost:8081"
    echo "  Queue Dashboard:    http://localhost:3003"
    echo ""
    
    log_info "Database Connection:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: waste_management"
    echo "  Username: postgres"
    echo "  Password: postgres123"
    echo ""
    
    log_info "Redis Connection:"
    echo "  Host: localhost"
    echo "  Port: 6379"
    echo "  Password: redis123"
}

# Function to run health checks
health_check() {
    log_info "Running health checks..."
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Unhealthy"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Unhealthy"
    fi
    
    # Check Backend
    if curl -sf http://localhost:3001/health &> /dev/null; then
        log_success "Backend API: Healthy"
    else
        log_warning "Backend API: Not ready yet (this is normal during startup)"
    fi
}

# Function to clean up
cleanup() {
    log_info "Cleaning up Docker environment..."
    
    docker-compose down -v
    docker system prune -f
    
    log_success "Cleanup completed"
}

# Main function
main() {
    case "${1:-setup}" in
        "setup")
            log_info "Setting up Docker environment for $PROJECT_NAME"
            check_prerequisites
            create_data_directories
            setup_environment
            build_images
            start_services
            run_migrations
            show_status
            health_check
            log_success "Docker environment setup completed!"
            ;;
        "start")
            log_info "Starting Docker services..."
            docker-compose up -d
            show_status
            ;;
        "stop")
            log_info "Stopping Docker services..."
            docker-compose down
            ;;
        "restart")
            log_info "Restarting Docker services..."
            docker-compose down
            docker-compose up -d
            show_status
            ;;
        "status")
            show_status
            ;;
        "health")
            health_check
            ;;
        "logs")
            service="${2:-}"
            if [[ -n "$service" ]]; then
                docker-compose logs -f "$service"
            else
                docker-compose logs -f
            fi
            ;;
        "clean")
            cleanup
            ;;
        "rebuild")
            log_info "Rebuilding Docker images..."
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
            show_status
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|restart|status|health|logs [service]|clean|rebuild}"
            echo ""
            echo "Commands:"
            echo "  setup    - Initial setup (default)"
            echo "  start    - Start all services"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show service status and URLs"
            echo "  health   - Run health checks"
            echo "  logs     - Show logs (optionally for specific service)"
            echo "  clean    - Clean up containers and volumes"
            echo "  rebuild  - Rebuild images and restart"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"