#!/bin/bash

# ============================================================================
# UNIFIED INFRASTRUCTURE DEPLOYMENT ORCHESTRATOR
# ============================================================================
#
# DEVOPS AGENT INFRASTRUCTURE CONSOLIDATION
# Consolidates 8+ Docker Compose files into unified deployment architecture
# Coordinated with: Code Refactoring Analyst + System Architecture Lead
#
# This script replaces the fragmented Docker Compose deployment approach
# with a unified, profile-based deployment strategy
#
# Created by: DevOps Infrastructure Orchestrator
# Coordination: System Architecture Lead + Code Refactoring Analyst
# Date: 2025-08-16
# Version: 1.0.0 - Infrastructure Consolidation Implementation
# ============================================================================

set -e

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-development}"
UNIFIED_COMPOSE_FILE="docker-compose.unified.yml"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_deploy() { echo -e "${CYAN}[DEPLOY]${NC} $1"; }

# Function to show usage information
show_usage() {
    echo "Usage: $0 <deployment_profile> [action]"
    echo ""
    echo "DEPLOYMENT PROFILES:"
    echo "  development  - Core services for development (postgres, redis, backend, frontend)"
    echo "  production   - Production-ready infrastructure with load balancing"
    echo "  monitoring   - Monitoring stack (prometheus, grafana, alertmanager, exporters)"
    echo "  ai-ml        - AI/ML services (weaviate, ml-services, llm-service)"
    echo "  siem         - Security monitoring (elasticsearch, kibana, filebeat)"
    echo "  tools        - Administrative tools (pgadmin, redis-commander)"
    echo "  full         - Complete infrastructure stack (all services)"
    echo ""
    echo "ACTIONS:"
    echo "  up           - Start services (default)"
    echo "  down         - Stop services"
    echo "  restart      - Restart services"
    echo "  logs         - Show service logs"
    echo "  status       - Show service status"
    echo "  health       - Run health checks"
    echo "  pull         - Pull latest images"
    echo "  clean        - Clean volumes and networks"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  DEPLOYMENT_ENV  - deployment environment (development|staging|production)"
    echo "  DATA_PATH       - path for persistent data volumes"
    echo "  LOG_LEVEL       - application log level"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 development                    # Start development environment"
    echo "  $0 production up                  # Start production environment"
    echo "  $0 monitoring logs                # View monitoring logs"
    echo "  $0 full health                    # Full stack health check"
    echo "  DEPLOYMENT_ENV=production $0 full # Production deployment"
}

# Function to validate deployment profile
validate_profile() {
    local profile="$1"
    local valid_profiles=("development" "production" "monitoring" "ai-ml" "siem" "tools" "full")
    
    for valid_profile in "${valid_profiles[@]}"; do
        if [[ "$profile" == "$valid_profile" ]]; then
            return 0
        fi
    done
    
    log_error "Invalid deployment profile: $profile"
    show_usage
    exit 1
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking deployment prerequisites..."
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check unified compose file
    if [[ ! -f "$PROJECT_ROOT/$UNIFIED_COMPOSE_FILE" ]]; then
        log_error "Unified Docker Compose file not found: $UNIFIED_COMPOSE_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to prepare environment
prepare_environment() {
    local profile="$1"
    
    log_step "Preparing environment for profile: $profile"
    
    cd "$PROJECT_ROOT"
    
    # Create necessary data directories
    create_data_directories "$profile"
    
    # Load environment configuration
    load_environment_config "$profile"
    
    # Create Docker networks if they don't exist
    create_docker_networks
    
    log_success "Environment prepared for $profile profile"
}

# Function to create data directories
create_data_directories() {
    local profile="$1"
    
    log_info "Creating data directories..."
    
    # Base directories
    mkdir -p docker/data/{postgres,redis,logs,uploads}
    
    # Profile-specific directories
    case "$profile" in
        "monitoring"|"full")
            mkdir -p docker/data/{prometheus,grafana,alertmanager}
            ;;
        "ai-ml"|"full")
            mkdir -p docker/data/{weaviate,ml/{models,training,cache},llm/{models,cache}}
            mkdir -p docker/data/logs/{ml,llm}
            ;;
        "siem"|"full")
            mkdir -p docker/data/elasticsearch
            ;;
    esac
    
    # Set appropriate permissions
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        log_info "Setting production security permissions..."
        # Prometheus and AlertManager run as nobody (65534:65534)
        sudo chown -R 65534:65534 docker/data/prometheus docker/data/alertmanager 2>/dev/null || true
        # Grafana runs as grafana (472:472)
        sudo chown -R 472:472 docker/data/grafana 2>/dev/null || true
    else
        chmod -R 755 docker/data/ 2>/dev/null || true
    fi
}

# Function to load environment configuration
load_environment_config() {
    local profile="$1"
    
    log_info "Loading environment configuration..."
    
    # Load base environment if exists
    if [[ -f ".env" ]]; then
        set -a
        source ".env"
        set +a
    fi
    
    # Load profile-specific environment if exists
    local profile_env_file=".env.$profile"
    if [[ -f "$profile_env_file" ]]; then
        set -a
        source "$profile_env_file"
        set +a
        log_info "Loaded profile-specific configuration: $profile_env_file"
    fi
    
    # Load deployment environment configuration
    local deployment_env_file=".env.$DEPLOYMENT_ENV"
    if [[ -f "$deployment_env_file" ]]; then
        set -a
        source "$deployment_env_file"
        set +a
        log_info "Loaded deployment environment configuration: $deployment_env_file"
    fi
    
    # Export common environment variables
    export NODE_ENV="$DEPLOYMENT_ENV"
    export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-waste-mgmt}"
}

# Function to create Docker networks
create_docker_networks() {
    log_info "Creating Docker networks..."
    
    local networks=("backend_network" "ai_ml_network" "monitoring_network" "siem_network")
    
    for network in "${networks[@]}"; do
        if ! docker network ls | grep -q "$network"; then
            log_info "Creating network: $network"
            docker network create "$network" 2>/dev/null || log_warning "Network $network may already exist"
        fi
    done
}

# Function to execute Docker Compose command
execute_compose_command() {
    local profile="$1"
    local action="$2"
    local additional_args="${3:-}"
    
    cd "$PROJECT_ROOT"
    
    local compose_cmd="docker-compose -f $UNIFIED_COMPOSE_FILE --profile $profile"
    
    case "$action" in
        "up")
            log_deploy "Starting $profile services..."
            $compose_cmd up -d $additional_args
            ;;
        "down")
            log_deploy "Stopping $profile services..."
            $compose_cmd down $additional_args
            ;;
        "restart")
            log_deploy "Restarting $profile services..."
            $compose_cmd restart $additional_args
            ;;
        "logs")
            log_info "Showing $profile service logs..."
            $compose_cmd logs -f $additional_args
            ;;
        "status"|"ps")
            log_info "Service status for $profile profile:"
            $compose_cmd ps
            ;;
        "pull")
            log_info "Pulling latest images for $profile profile..."
            $compose_cmd pull $additional_args
            ;;
        "exec")
            $compose_cmd exec $additional_args
            ;;
        *)
            log_error "Unknown action: $action"
            return 1
            ;;
    esac
}

# Function to run health checks
run_health_checks() {
    local profile="$1"
    
    log_step "Running health checks for $profile profile..."
    
    cd "$PROJECT_ROOT"
    
    # Get running services for the profile
    local services=$(docker-compose -f "$UNIFIED_COMPOSE_FILE" --profile "$profile" ps --services)
    local failed_checks=0
    
    for service in $services; do
        local container_name=$(docker-compose -f "$UNIFIED_COMPOSE_FILE" --profile "$profile" ps -q "$service" 2>/dev/null)
        
        if [[ -n "$container_name" ]]; then
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
            
            case "$health_status" in
                "healthy")
                    log_success "$service: Healthy"
                    ;;
                "unhealthy")
                    log_error "$service: Unhealthy"
                    ((failed_checks++))
                    ;;
                "starting")
                    log_warning "$service: Still starting..."
                    ;;
                "no-health-check")
                    # Check if container is running
                    local running=$(docker inspect --format='{{.State.Running}}' "$container_name" 2>/dev/null || echo "false")
                    if [[ "$running" == "true" ]]; then
                        log_success "$service: Running (no health check)"
                    else
                        log_error "$service: Not running"
                        ((failed_checks++))
                    fi
                    ;;
                *)
                    log_warning "$service: Unknown health status: $health_status"
                    ;;
            esac
        else
            log_warning "$service: Container not found (service may not be running)"
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        log_success "All health checks passed for $profile profile"
    else
        log_warning "$failed_checks health check(s) failed for $profile profile"
    fi
    
    return $failed_checks
}

# Function to clean deployment
clean_deployment() {
    local profile="$1"
    
    log_warning "Cleaning $profile deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop and remove containers, networks, and volumes
    docker-compose -f "$UNIFIED_COMPOSE_FILE" --profile "$profile" down -v --remove-orphans
    
    # Remove unused networks
    docker network prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "$profile deployment cleaned"
}

# Function to show deployment summary
show_deployment_summary() {
    local profile="$1"
    local action="$2"
    
    log_step "Deployment Summary"
    
    echo ""
    log_deploy "Profile: $profile"
    log_deploy "Action: $action"
    log_deploy "Environment: $DEPLOYMENT_ENV"
    log_deploy "Timestamp: $(date)"
    
    echo ""
    log_info "Service Status:"
    execute_compose_command "$profile" "status"
    
    # Show relevant URLs based on profile
    show_service_urls "$profile"
    
    echo ""
    log_info "Management Commands:"
    echo "  Health Check:   $0 $profile health"
    echo "  View Logs:      $0 $profile logs"
    echo "  Restart:        $0 $profile restart"
    echo "  Stop:           $0 $profile down"
    echo "  Clean:          $0 $profile clean"
}

# Function to show service URLs
show_service_urls() {
    local profile="$1"
    
    echo ""
    log_info "Access URLs:"
    
    case "$profile" in
        "development"|"production"|"full")
            echo "  Backend API:    http://localhost:${PORT:-3001}"
            echo "  Frontend:       http://localhost:${FRONTEND_PORT:-3000}"
            ;;
    esac
    
    case "$profile" in
        "monitoring"|"full")
            echo "  Prometheus:     http://localhost:${PROMETHEUS_PORT:-9090}"
            echo "  Grafana:        http://localhost:${GRAFANA_PORT:-3004}"
            echo "  AlertManager:   http://localhost:${ALERTMANAGER_PORT:-9093}"
            echo "  Node Exporter:  http://localhost:9100/metrics"
            echo "  cAdvisor:       http://localhost:8082"
            ;;
    esac
    
    case "$profile" in
        "ai-ml"|"full")
            echo "  Weaviate:       http://localhost:8080"
            echo "  ML Services:    http://localhost:3010"
            echo "  LLM Service:    http://localhost:8001"
            ;;
    esac
    
    case "$profile" in
        "siem"|"full")
            echo "  Elasticsearch:  http://localhost:9200"
            echo "  Kibana:         http://localhost:5601"
            ;;
    esac
    
    case "$profile" in
        "tools"|"full")
            echo "  pgAdmin:        http://localhost:${PGADMIN_PORT:-8080}"
            echo "  Redis Commander: http://localhost:${REDIS_COMMANDER_PORT:-8081}"
            ;;
    esac
}

# Main function
main() {
    local profile="${1:-}"
    local action="${2:-up}"
    
    # Show usage if no profile provided
    if [[ -z "$profile" ]]; then
        show_usage
        exit 1
    fi
    
    # Handle special actions
    case "$profile" in
        "--help"|"-h"|"help")
            show_usage
            exit 0
            ;;
    esac
    
    # Validate profile
    validate_profile "$profile"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute based on action
    case "$action" in
        "up")
            prepare_environment "$profile"
            execute_compose_command "$profile" "$action"
            sleep 10  # Allow services to start
            run_health_checks "$profile"
            show_deployment_summary "$profile" "$action"
            ;;
        "down")
            execute_compose_command "$profile" "$action"
            log_success "$profile services stopped"
            ;;
        "restart")
            execute_compose_command "$profile" "$action"
            sleep 10
            run_health_checks "$profile"
            log_success "$profile services restarted"
            ;;
        "logs")
            execute_compose_command "$profile" "$action" "${3:-}"
            ;;
        "status"|"ps")
            execute_compose_command "$profile" "$action"
            ;;
        "health")
            run_health_checks "$profile"
            ;;
        "pull")
            execute_compose_command "$profile" "$action"
            ;;
        "clean")
            clean_deployment "$profile"
            ;;
        "exec")
            shift 2  # Remove profile and action from arguments
            execute_compose_command "$profile" "exec" "$*"
            ;;
        *)
            log_error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Error handling
trap 'log_error "Unified infrastructure deployment failed at line $LINENO"' ERR

# Run main function
main "$@"