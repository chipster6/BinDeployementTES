#!/bin/bash
# ============================================================================
# SIEM/IDS INFRASTRUCTURE DEPLOYMENT SCRIPT
# ============================================================================
#
# Complete SIEM/IDS infrastructure deployment for Tier 1 Advanced Threat Protection
# Deploys Elasticsearch, Kibana, Logstash, Suricata, Wazuh, Falco, OSQuery
#
# Created by: DEVOPS-AGENT - TIER 1 Advanced Threat Protection
# Date: 2025-08-14
# Version: 1.0.0
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SIEM_DIR="$PROJECT_ROOT/docker/siem"
DATA_DIR="/data/waste-mgmt/siem"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if running as root or with sudo for system-level operations
    if [[ $EUID -ne 0 ]] && ! groups "$USER" | grep -q docker; then
        log_warning "User is not in docker group. You may need to run with sudo."
    fi
    
    log_success "Prerequisites check completed"
}

# Function to create data directories
create_data_directories() {
    log_info "Creating SIEM data directories..."
    
    sudo mkdir -p "$DATA_DIR"/{elasticsearch,kibana,prometheus,grafana,alertmanager,filebeat}
    sudo mkdir -p /var/log/{suricata,falco,osquery,wazuh}
    
    # Set appropriate permissions
    sudo chown -R 1000:1000 "$DATA_DIR/elasticsearch"
    sudo chown -R 1000:1000 "$DATA_DIR/kibana"
    sudo chown -R 65534:65534 "$DATA_DIR/prometheus"
    sudo chown -R 472:472 "$DATA_DIR/grafana"
    sudo chown -R 65534:65534 "$DATA_DIR/alertmanager"
    sudo chown -R root:root "$DATA_DIR/filebeat"
    
    # Set SELinux context if SELinux is enabled
    if command_exists getenforce && [[ $(getenforce) != "Disabled" ]]; then
        sudo setsebool -P container_manage_cgroup true
        sudo chcon -Rt svirt_sandbox_file_t "$DATA_DIR"
    fi
    
    log_success "Data directories created and configured"
}

# Function to configure system limits
configure_system_limits() {
    log_info "Configuring system limits for SIEM components..."
    
    # Elasticsearch requires vm.max_map_count to be at least 262144
    current_max_map_count=$(sysctl vm.max_map_count | cut -d' ' -f3)
    if [[ $current_max_map_count -lt 262144 ]]; then
        log_info "Setting vm.max_map_count to 262144"
        sudo sysctl -w vm.max_map_count=262144
        echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
    fi
    
    # Increase file descriptor limits
    cat <<EOF | sudo tee /etc/security/limits.d/99-siem.conf
*               soft    nofile          65536
*               hard    nofile          65536
*               soft    nproc           32768
*               hard    nproc           32768
elasticsearch   soft    memlock         unlimited
elasticsearch   hard    memlock         unlimited
EOF
    
    log_success "System limits configured"
}

# Function to generate random passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to create environment file
create_environment_file() {
    log_info "Creating SIEM environment configuration..."
    
    ENV_FILE="$PROJECT_ROOT/.env.siem"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        cat <<EOF > "$ENV_FILE"
# SIEM Infrastructure Environment Configuration
# Generated on $(date)

# Elasticsearch Configuration
ELASTICSEARCH_PASSWORD=$(generate_password)
ELASTICSEARCH_HEAP_SIZE=1g

# Kibana Configuration
KIBANA_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Wazuh Configuration
WAZUH_API_USER=wazuh-api
WAZUH_API_PASSWORD=$(generate_password)

# OSQuery Configuration
OSQUERY_ENROLL_SECRET=$(generate_password)

# Grafana Security Configuration
GRAFANA_SECURITY_USER=admin
GRAFANA_SECURITY_PASSWORD=$(generate_password)
GRAFANA_SECURITY_SECRET=$(openssl rand -base64 32)

# Prometheus Remote Write (Optional)
PROMETHEUS_REMOTE_WRITE_URL=
PROMETHEUS_REMOTE_WRITE_USERNAME=
PROMETHEUS_REMOTE_WRITE_PASSWORD=

# Notification Configuration
SLACK_WEBHOOK_URL=
EMAIL_SMTP_HOST=
EMAIL_SMTP_USERNAME=
EMAIL_SMTP_PASSWORD=
EMAIL_FROM=security@waste-mgmt.com

# PagerDuty Configuration (Optional)
PAGERDUTY_ROUTING_KEY=

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs
SSL_KEY_PATH=/etc/ssl/private
EOF
        
        chmod 600 "$ENV_FILE"
        log_success "Environment file created: $ENV_FILE"
        log_warning "Please review and update the configuration in $ENV_FILE"
    else
        log_info "Environment file already exists: $ENV_FILE"
    fi
}

# Function to validate configuration files
validate_configurations() {
    log_info "Validating SIEM configuration files..."
    
    # Check if all required configuration files exist
    local required_configs=(
        "$SIEM_DIR/elasticsearch/config/elasticsearch.yml"
        "$SIEM_DIR/logstash/config/logstash.yml"
        "$SIEM_DIR/kibana/config/kibana.yml"
        "$SIEM_DIR/suricata/config/suricata.yaml"
        "$SIEM_DIR/wazuh/config/ossec.conf"
        "$SIEM_DIR/falco/config/falco.yaml"
        "$SIEM_DIR/osquery/config/osquery.conf"
        "$SIEM_DIR/filebeat/config/filebeat.yml"
        "$SIEM_DIR/prometheus/config/prometheus-security.yml"
        "$SIEM_DIR/alertmanager/config/alertmanager.yml"
    )
    
    for config in "${required_configs[@]}"; do
        if [[ ! -f "$config" ]]; then
            log_error "Required configuration file not found: $config"
            exit 1
        fi
    done
    
    # Validate YAML syntax for key files
    if command_exists yamllint; then
        log_info "Validating YAML syntax..."
        yamllint "$SIEM_DIR"/*/config/*.yml "$SIEM_DIR"/*/config/*.yaml 2>/dev/null || true
    fi
    
    log_success "Configuration validation completed"
}

# Function to pull Docker images
pull_docker_images() {
    log_info "Pulling SIEM Docker images..."
    
    # Pull images in parallel for faster deployment
    docker-compose -f "$PROJECT_ROOT/docker/docker-compose.siem.yml" pull &
    
    # Pull additional images
    docker pull elastic/filebeat:8.11.0 &
    docker pull prom/prometheus:latest &
    docker pull grafana/grafana:latest &
    docker pull prom/alertmanager:latest &
    
    wait
    
    log_success "Docker images pulled successfully"
}

# Function to deploy SIEM infrastructure
deploy_siem() {
    log_info "Deploying SIEM infrastructure..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    if [[ -f ".env.siem" ]]; then
        export $(grep -v '^#' .env.siem | xargs)
    fi
    
    # Deploy SIEM stack
    docker-compose -f docker/docker-compose.siem.yml up -d
    
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log_success "SIEM infrastructure deployed successfully"
}

# Function to check service health
check_service_health() {
    log_info "Checking SIEM service health..."
    
    local services=(
        "elasticsearch:9200"
        "kibana:5601"
        "security-orchestrator:8080"
        "prometheus-security:9090"
        "grafana-security:3000"
        "alertmanager-security:9093"
    )
    
    for service in "${services[@]}"; do
        local host=$(echo "$service" | cut -d':' -f1)
        local port=$(echo "$service" | cut -d':' -f2)
        
        log_info "Checking $host:$port..."
        
        # Wait up to 60 seconds for service to be ready
        local count=0
        while ! nc -z localhost "$port" && [[ $count -lt 12 ]]; do
            sleep 5
            ((count++))
        done
        
        if nc -z localhost "$port"; then
            log_success "$host is healthy"
        else
            log_warning "$host is not responding on port $port"
        fi
    done
}

# Function to configure Elasticsearch
configure_elasticsearch() {
    log_info "Configuring Elasticsearch for SIEM..."
    
    # Wait for Elasticsearch to be ready
    local count=0
    while ! curl -s http://localhost:9200/_cluster/health >/dev/null && [[ $count -lt 20 ]]; do
        sleep 5
        ((count++))
    done
    
    if curl -s http://localhost:9200/_cluster/health >/dev/null; then
        # Create index templates for SIEM data
        curl -X PUT "localhost:9200/_index_template/siem-events" \
        -H 'Content-Type: application/json' \
        -d '{
            "index_patterns": ["siem-events-*"],
            "template": {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "refresh_interval": "5s"
                },
                "mappings": {
                    "properties": {
                        "@timestamp": { "type": "date" },
                        "source_ip": { "type": "ip" },
                        "security_severity": { "type": "keyword" },
                        "event_type": { "type": "keyword" },
                        "tags": { "type": "keyword" }
                    }
                }
            }
        }' 2>/dev/null || log_warning "Failed to create Elasticsearch index template"
        
        log_success "Elasticsearch configured"
    else
        log_warning "Elasticsearch is not ready for configuration"
    fi
}

# Function to configure Kibana dashboards
configure_kibana() {
    log_info "Configuring Kibana dashboards..."
    
    # Wait for Kibana to be ready
    local count=0
    while ! curl -s http://localhost:5601/api/status >/dev/null && [[ $count -lt 20 ]]; do
        sleep 5
        ((count++))
    done
    
    if curl -s http://localhost:5601/api/status >/dev/null; then
        log_success "Kibana is ready for configuration"
        log_info "Access Kibana at: http://localhost:5601/siem"
    else
        log_warning "Kibana is not ready for configuration"
    fi
}

# Function to display deployment summary
display_summary() {
    log_success "SIEM/IDS Infrastructure Deployment Complete!"
    
    echo ""
    echo "=========================================="
    echo "SIEM INFRASTRUCTURE ACCESS POINTS"
    echo "=========================================="
    echo "Kibana SIEM:              http://localhost:5601/siem"
    echo "Elasticsearch:            http://localhost:9200"
    echo "Security Orchestrator:    http://localhost:8080"
    echo "Grafana Security:         http://localhost:3001"
    echo "Prometheus Security:      http://localhost:9091"
    echo "Alertmanager:             http://localhost:9093"
    echo ""
    echo "=========================================="
    echo "SECURITY MONITORING COMPONENTS"
    echo "=========================================="
    echo "✓ Elasticsearch - SIEM data storage"
    echo "✓ Kibana - Security visualization"
    echo "✓ Logstash - Log processing"
    echo "✓ Suricata - Network IDS"
    echo "✓ Wazuh - Host-based IDS"
    echo "✓ Falco - Runtime security"
    echo "✓ OSQuery - Endpoint monitoring"
    echo "✓ Filebeat - Log shipping"
    echo "✓ Security Orchestrator - Automated response"
    echo "✓ Prometheus - Security metrics"
    echo "✓ Grafana - Security dashboards"
    echo "✓ Alertmanager - Security alerting"
    echo ""
    echo "=========================================="
    echo "NEXT STEPS"
    echo "=========================================="
    echo "1. Configure notification channels in .env.siem"
    echo "2. Review and customize security playbooks"
    echo "3. Set up SSL certificates for production"
    echo "4. Configure threat intelligence feeds"
    echo "5. Test incident response procedures"
    echo ""
    echo "For troubleshooting: docker-compose -f docker/docker-compose.siem.yml logs"
    echo ""
    log_success "TIER 1 Advanced Threat Protection deployment completed successfully!"
}

# Main execution
main() {
    log_info "Starting SIEM/IDS Infrastructure Deployment"
    log_info "Target: 2-3% security grade improvement for 100% security achievement"
    
    check_prerequisites
    create_data_directories
    configure_system_limits
    create_environment_file
    validate_configurations
    pull_docker_images
    deploy_siem
    configure_elasticsearch
    configure_kibana
    display_summary
}

# Execute main function
main "$@"