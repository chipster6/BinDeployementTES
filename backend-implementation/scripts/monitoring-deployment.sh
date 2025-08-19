#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - MONITORING DEPLOYMENT AUTOMATION
# ============================================================================
#
# Production-ready monitoring deployment with environment-specific configuration
# Supports development, staging, and production deployments
#
# Created by: DevOps Infrastructure Orchestrator
# Date: 2025-08-15
# Version: 2.0.0
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Load environment-specific configuration
load_environment_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        echo -e "${GREEN}[INFO]${NC} Loaded environment configuration: $ENVIRONMENT"
    else
        echo -e "${YELLOW}[WARNING]${NC} Environment file not found: $env_file"
    fi
}

# Create environment-specific monitoring configuration
create_monitoring_environment() {
    echo -e "${BLUE}[STEP]${NC} Creating monitoring environment for: $ENVIRONMENT"
    
    local monitoring_env_file="$PROJECT_ROOT/.env.monitoring.$ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        "production")
            cat > "$monitoring_env_file" << EOF
# Production Monitoring Configuration
PROMETHEUS_PORT=9090
GRAFANA_PORT=3004
ALERTMANAGER_PORT=9093
GRAFANA_USER=admin
GRAFANA_PASSWORD=\${GRAFANA_PROD_PASSWORD:-$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)}
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=10GB
MONITORING_SECURITY_ENABLED=true
ALERTING_ENABLED=true
EOF
            ;;
        "staging")
            cat > "$monitoring_env_file" << EOF
# Staging Monitoring Configuration
PROMETHEUS_PORT=9091
GRAFANA_PORT=3005
GRAFANA_USER=admin
GRAFANA_PASSWORD=\${GRAFANA_STAGING_PASSWORD:-staging123}
PROMETHEUS_RETENTION_TIME=7d
PROMETHEUS_RETENTION_SIZE=2GB
MONITORING_SECURITY_ENABLED=false
ALERTING_ENABLED=false
EOF
            ;;
        "development")
            cat > "$monitoring_env_file" << EOF
# Development Monitoring Configuration
PROMETHEUS_PORT=9092
GRAFANA_PORT=3006
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123
PROMETHEUS_RETENTION_TIME=1d
PROMETHEUS_RETENTION_SIZE=500MB
MONITORING_SECURITY_ENABLED=false
ALERTING_ENABLED=false
EOF
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Unsupported environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    chmod 600 "$monitoring_env_file"
    echo -e "${GREEN}[SUCCESS]${NC} Created monitoring environment: $monitoring_env_file"
}

# Deploy monitoring stack with environment configuration
deploy_monitoring_stack() {
    echo -e "${BLUE}[STEP]${NC} Deploying monitoring stack for $ENVIRONMENT"
    
    cd "$PROJECT_ROOT"
    
    # Load monitoring environment
    if [[ -f ".env.monitoring.$ENVIRONMENT" ]]; then
        set -a
        source ".env.monitoring.$ENVIRONMENT"
        set +a
    fi
    
    # Create data directories with proper permissions
    mkdir -p "docker/data/prometheus-$ENVIRONMENT"
    mkdir -p "docker/data/grafana-$ENVIRONMENT"
    
    # Start monitoring services with profile
    echo -e "${BLUE}[INFO]${NC} Starting monitoring services..."
    
    # Use environment-specific compose override if it exists
    local compose_files="-f docker-compose.yml"
    if [[ -f "docker-compose.$ENVIRONMENT.yml" ]]; then
        compose_files="$compose_files -f docker-compose.$ENVIRONMENT.yml"
    fi
    
    # Deploy with monitoring profile
    docker-compose $compose_files --profile monitoring up -d
    
    echo -e "${GREEN}[SUCCESS]${NC} Monitoring stack deployed"
}

# Validate monitoring deployment
validate_deployment() {
    echo -e "${BLUE}[STEP]${NC} Validating monitoring deployment"
    
    local prometheus_port="${PROMETHEUS_PORT:-9090}"
    local grafana_port="${GRAFANA_PORT:-3004}"
    
    # Wait for services to be ready
    local max_wait=120
    local counter=0
    
    echo -e "${BLUE}[INFO]${NC} Waiting for Prometheus on port $prometheus_port..."
    while ! curl -sf "http://localhost:$prometheus_port/-/healthy" &>/dev/null; do
        if [[ $counter -ge $max_wait ]]; then
            echo -e "${RED}[ERROR]${NC} Prometheus failed to start within $max_wait seconds"
            return 1
        fi
        sleep 5
        counter=$((counter + 5))
    done
    
    echo -e "${BLUE}[INFO]${NC} Waiting for Grafana on port $grafana_port..."
    counter=0
    while ! curl -sf "http://localhost:$grafana_port/api/health" &>/dev/null; do
        if [[ $counter -ge $max_wait ]]; then
            echo -e "${RED}[ERROR]${NC} Grafana failed to start within $max_wait seconds"
            return 1
        fi
        sleep 5
        counter=$((counter + 5))
    done
    
    echo -e "${GREEN}[SUCCESS]${NC} All monitoring services are healthy"
}

# Configure monitoring for environment
configure_monitoring() {
    echo -e "${BLUE}[STEP]${NC} Configuring monitoring for $ENVIRONMENT"
    
    local grafana_port="${GRAFANA_PORT:-3004}"
    local grafana_user="${GRAFANA_USER:-admin}"
    local grafana_password="${GRAFANA_PASSWORD:-admin123}"
    
    # Wait for Grafana to be fully ready
    sleep 15
    
    # Configure Prometheus data source
    local datasource_config='{
        "name": "Prometheus-'$ENVIRONMENT'",
        "type": "prometheus",
        "url": "http://prometheus:'${PROMETHEUS_PORT:-9090}'",
        "access": "proxy",
        "isDefault": true,
        "jsonData": {
            "httpMethod": "POST",
            "manageAlerts": true
        }
    }'
    
    if curl -sf -X POST \
        -H "Content-Type: application/json" \
        -u "$grafana_user:$grafana_password" \
        -d "$datasource_config" \
        "http://localhost:$grafana_port/api/datasources" &>/dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} Prometheus data source configured"
    else
        echo -e "${YELLOW}[WARNING]${NC} Data source may already exist"
    fi
}

# Show deployment status
show_deployment_status() {
    echo -e "${PURPLE}[STATUS]${NC} Monitoring Deployment Status"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
    echo -e "${BLUE}Services:${NC}"
    docker-compose --profile monitoring ps
    
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}"
    echo "  Grafana:    http://localhost:${GRAFANA_PORT:-3004}"
    echo "              Username: ${GRAFANA_USER:-admin}"
    echo "              Password: ${GRAFANA_PASSWORD:-admin123}"
    
    echo ""
    echo -e "${BLUE}Health Checks:${NC}"
    if curl -sf "http://localhost:${PROMETHEUS_PORT:-9090}/-/healthy" &>/dev/null; then
        echo -e "  Prometheus: ${GREEN}Healthy${NC}"
    else
        echo -e "  Prometheus: ${RED}Unhealthy${NC}"
    fi
    
    if curl -sf "http://localhost:${GRAFANA_PORT:-3004}/api/health" &>/dev/null; then
        echo -e "  Grafana:    ${GREEN}Healthy${NC}"
    else
        echo -e "  Grafana:    ${RED}Unhealthy${NC}"
    fi
}

# Main function
main() {
    case "${1:-deploy}" in
        "deploy")
            echo -e "${BLUE}[INFO]${NC} Starting monitoring deployment for environment: $ENVIRONMENT"
            load_environment_config
            create_monitoring_environment
            deploy_monitoring_stack
            validate_deployment
            configure_monitoring
            show_deployment_status
            echo -e "${GREEN}[SUCCESS]${NC} Monitoring deployment completed!"
            ;;
        "validate")
            validate_deployment
            show_deployment_status
            ;;
        "configure")
            configure_monitoring
            ;;
        "status")
            show_deployment_status
            ;;
        "clean")
            echo -e "${YELLOW}[WARNING]${NC} Cleaning monitoring deployment for $ENVIRONMENT"
            cd "$PROJECT_ROOT"
            docker-compose --profile monitoring down -v
            echo -e "${GREEN}[SUCCESS]${NC} Monitoring deployment cleaned"
            ;;
        *)
            echo "Usage: $0 {deploy|validate|configure|status|clean}"
            echo ""
            echo "Environment Variables:"
            echo "  ENVIRONMENT  - Target environment (production|staging|development)"
            echo ""
            echo "Commands:"
            echo "  deploy     - Deploy monitoring stack (default)"
            echo "  validate   - Validate deployment health"
            echo "  configure  - Configure monitoring services"
            echo "  status     - Show deployment status"
            echo "  clean      - Clean monitoring deployment"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"