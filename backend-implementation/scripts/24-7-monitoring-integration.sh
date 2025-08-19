#!/bin/bash

# ============================================================================
# 24/7 AUTOMATED MONITORING INTEGRATION WITH INCIDENT RESPONSE
# ============================================================================
#
# DEVOPS AGENT 24/7 MONITORING IMPLEMENTATION
# Implements comprehensive automated monitoring with incident response escalation
# Coordinated with: System Architecture Lead + Security Agent
#
# Features:
# - Automated incident response escalation
# - Self-healing service recovery
# - Real-time alert management
# - Performance threshold monitoring
# - External notification integration (Slack, Email, PagerDuty)
# - Comprehensive health validation
#
# Created by: DevOps Infrastructure Orchestrator
# Coordination: System Architecture Lead + Security Agent
# Date: 2025-08-16
# Version: 1.0.0 - 24/7 Monitoring Implementation
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
MONITORING_CONFIG_DIR="$PROJECT_ROOT/docker/monitoring"
ALERT_CONFIG_DIR="$PROJECT_ROOT/docker/alertmanager"
MONITORING_LOG_FILE="$PROJECT_ROOT/logs/monitoring-automation.log"

# Monitoring thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000  # milliseconds
ERROR_RATE_THRESHOLD=5        # percentage

# Notification endpoints (configure as needed)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_SMTP_SERVER="${EMAIL_SMTP_SERVER:-}"
PAGERDUTY_API_KEY="${PAGERDUTY_API_KEY:-}"

# Logging functions
log_info() { 
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}
log_success() { 
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}
log_warning() { 
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}
log_error() { 
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}
log_step() { 
    echo -e "${PURPLE}[STEP]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}
log_monitor() { 
    echo -e "${CYAN}[MONITOR]${NC} $1" | tee -a "$MONITORING_LOG_FILE"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <action> [options]"
    echo ""
    echo "ACTIONS:"
    echo "  setup        - Setup 24/7 monitoring infrastructure"
    echo "  start        - Start automated monitoring"
    echo "  stop         - Stop automated monitoring"
    echo "  status       - Show monitoring status"
    echo "  health       - Run comprehensive health checks"
    echo "  test-alerts  - Test alert notification system"
    echo "  incident     - Manual incident response trigger"
    echo "  self-heal    - Run self-healing procedures"
    echo "  dashboard    - Open monitoring dashboard"
    echo ""
    echo "OPTIONS:"
    echo "  --service <name>     - Target specific service"
    echo "  --severity <level>   - Alert severity (low|medium|high|critical)"
    echo "  --notify <channel>   - Notification channel (slack|email|pagerduty|all)"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  SLACK_WEBHOOK_URL    - Slack webhook for notifications"
    echo "  EMAIL_SMTP_SERVER    - SMTP server for email notifications"
    echo "  PAGERDUTY_API_KEY    - PagerDuty API key for incident escalation"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 setup                         # Setup monitoring infrastructure"
    echo "  $0 start                         # Start 24/7 monitoring"
    echo "  $0 health                        # Run health checks"
    echo "  $0 incident --severity critical  # Trigger critical incident response"
    echo "  $0 self-heal --service backend   # Self-heal specific service"
}

# Function to setup monitoring infrastructure
setup_monitoring_infrastructure() {
    log_step "Setting up 24/7 monitoring infrastructure..."
    
    # Create monitoring directories
    mkdir -p "$MONITORING_CONFIG_DIR"
    mkdir -p "$ALERT_CONFIG_DIR"
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/docker/prometheus/rules"
    mkdir -p "$PROJECT_ROOT/docker/grafana/dashboards"
    
    # Create enhanced Prometheus configuration
    create_prometheus_config
    
    # Create AlertManager configuration with incident response
    create_alertmanager_config
    
    # Create monitoring alert rules
    create_alert_rules
    
    # Create Grafana dashboards
    create_monitoring_dashboards
    
    # Create incident response runbook
    create_incident_response_runbook
    
    # Create self-healing scripts
    create_self_healing_scripts
    
    log_success "24/7 monitoring infrastructure setup complete"
}

# Function to create enhanced Prometheus configuration
create_prometheus_config() {
    log_info "Creating enhanced Prometheus configuration..."
    
    cat > "$PROJECT_ROOT/docker/prometheus/prometheus.prod.yml" << 'EOF'
# ============================================================================
# ENHANCED PROMETHEUS CONFIGURATION - 24/7 MONITORING
# ============================================================================
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'waste-management'
    environment: 'production'

# AlertManager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Rule files for automated alerting
rule_files:
  - "/etc/prometheus/rules/*.yml"

# Scrape configurations for all services
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 30s

  # Node Exporter for system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  # Container metrics via cAdvisor
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 15s

  # PostgreSQL metrics
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  # Redis metrics
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  # Backend application metrics
  - job_name: 'backend-api'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Frontend application metrics
  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  # Nginx metrics
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  # AI/ML services metrics (if enabled)
  - job_name: 'ml-services'
    static_configs:
      - targets: ['ml-services:9090']
    scrape_interval: 60s

  # Weaviate metrics (if enabled)
  - job_name: 'weaviate'
    static_configs:
      - targets: ['weaviate:2112']
    scrape_interval: 60s

  # LLM service metrics (if enabled)
  - job_name: 'llm-service'
    static_configs:
      - targets: ['llm-service:8001']
    scrape_interval: 60s

# Remote write configuration for external monitoring systems
remote_write:
  - url: "${PROMETHEUS_REMOTE_WRITE_URL}"
    basic_auth:
      username: "${PROMETHEUS_REMOTE_WRITE_USERNAME}"
      password: "${PROMETHEUS_REMOTE_WRITE_PASSWORD}"
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'up|.*_error_.*|.*_response_time.*|.*_cpu_.*|.*_memory_.*'
        action: keep
EOF

    log_success "Enhanced Prometheus configuration created"
}

# Function to create AlertManager configuration
create_alertmanager_config() {
    log_info "Creating AlertManager configuration with incident response..."
    
    cat > "$ALERT_CONFIG_DIR/alertmanager.yml" << 'EOF'
# ============================================================================
# ALERTMANAGER CONFIGURATION - 24/7 INCIDENT RESPONSE
# ============================================================================
global:
  smtp_smarthost: '${EMAIL_SMTP_SERVER:-localhost:587}'
  smtp_from: 'alerts@waste-management.com'
  slack_api_url: '${SLACK_WEBHOOK_URL}'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# Templates for alert notifications
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# Routing configuration
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    # Critical alerts - immediate escalation
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 5m
      
    # High severity alerts - escalate after 15 minutes
    - match:
        severity: high
      receiver: 'high-severity-alerts'
      group_wait: 15s
      repeat_interval: 15m
      
    # Medium severity alerts - standard handling
    - match:
        severity: medium
      receiver: 'medium-severity-alerts'
      repeat_interval: 30m
      
    # Low severity alerts - batched notifications
    - match:
        severity: low
      receiver: 'low-severity-alerts'
      repeat_interval: 2h

# Inhibition rules to reduce alert noise
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']

# Alert receivers configuration
receivers:
  # Default webhook receiver
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:9093/api/v1/alerts'

  # Critical alerts - all channels + PagerDuty escalation
  - name: 'critical-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        title: 'CRITICAL ALERT - Immediate Action Required'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        color: 'danger'
        send_resolved: true
    email_configs:
      - to: 'oncall@waste-management.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_API_KEY}'
        description: '{{ .GroupLabels.alertname }}'
        severity: 'critical'

  # High severity alerts - Slack + Email
  - name: 'high-severity-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'High Severity Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        color: 'warning'
        send_resolved: true
    email_configs:
      - to: 'team@waste-management.com'
        subject: 'HIGH: {{ .GroupLabels.alertname }}'

  # Medium severity alerts - Slack only
  - name: 'medium-severity-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#monitoring'
        title: 'Medium Severity Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        color: 'warning'

  # Low severity alerts - Slack summary
  - name: 'low-severity-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#monitoring'
        title: 'Low Severity Alerts Summary'
        text: '{{ .Alerts | len }} low severity alerts'
        color: 'good'
EOF

    log_success "AlertManager configuration with incident response created"
}

# Function to create alert rules
create_alert_rules() {
    log_info "Creating monitoring alert rules..."
    
    cat > "$PROJECT_ROOT/docker/prometheus/rules/application-alerts.yml" << 'EOF'
# ============================================================================
# APPLICATION ALERT RULES - 24/7 MONITORING
# ============================================================================
groups:
  - name: application.rules
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: high
          service: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% which is above the 5% threshold"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000 > 5000
        for: 10m
        labels:
          severity: medium
          service: backend
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}ms"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} on {{ $labels.instance }} has been down for more than 2 minutes"

      # Database connection issues
      - alert: DatabaseConnectionHigh
        expr: postgresql_connections_active / postgresql_connections_max * 100 > 80
        for: 5m
        labels:
          severity: high
          service: database
        annotations:
          summary: "High database connection usage"
          description: "Database connection usage is {{ $value }}%"

      # Redis memory usage
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 85
        for: 10m
        labels:
          severity: medium
          service: redis
        annotations:
          summary: "High Redis memory usage"
          description: "Redis memory usage is {{ $value }}%"
EOF

    cat > "$PROJECT_ROOT/docker/prometheus/rules/infrastructure-alerts.yml" << 'EOF'
# ============================================================================
# INFRASTRUCTURE ALERT RULES - 24/7 MONITORING
# ============================================================================
groups:
  - name: infrastructure.rules
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"

      # High disk usage
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 90
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage is {{ $value }}% on mount {{ $labels.mountpoint }}"

      # Container resource limits
      - alert: ContainerHighCPU
        expr: (rate(container_cpu_usage_seconds_total[5m]) * 100) > 80
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "Container {{ $labels.name }} high CPU usage"
          description: "Container CPU usage is {{ $value }}%"

      # Container memory usage
      - alert: ContainerHighMemory
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100 > 85
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "Container {{ $labels.name }} high memory usage"
          description: "Container memory usage is {{ $value }}%"
EOF

    log_success "Monitoring alert rules created"
}

# Function to create monitoring dashboards
create_monitoring_dashboards() {
    log_info "Creating monitoring dashboards..."
    
    # Create comprehensive system dashboard
    cat > "$PROJECT_ROOT/docker/grafana/dashboards/24-7-monitoring-dashboard.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "24/7 Waste Management System Monitoring",
    "tags": ["24-7", "monitoring", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Service Status Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{ job }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 3,
        "title": "Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 4,
        "title": "System Resources",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          },
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "postgresql_connections_active",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "postgresql_connections_max",
            "legendFormat": "Max Connections"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24}
      },
      {
        "id": 6,
        "title": "Container Status",
        "type": "table",
        "targets": [
          {
            "expr": "container_last_seen",
            "format": "table",
            "instant": true
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "10s"
  }
}
EOF

    log_success "24/7 monitoring dashboard created"
}

# Function to create incident response runbook
create_incident_response_runbook() {
    log_info "Creating incident response runbook..."
    
    cat > "$PROJECT_ROOT/INCIDENT-RESPONSE-RUNBOOK.md" << 'EOF'
# INCIDENT RESPONSE RUNBOOK - 24/7 MONITORING

## ALERT SEVERITY LEVELS

### CRITICAL (Immediate Response Required)
- Service completely down
- Data loss or corruption
- Security breach
- System resource exhaustion (>95%)

**Response Time**: Immediate (< 5 minutes)
**Escalation**: PagerDuty + Slack + Email

### HIGH (Urgent Response)
- Significant performance degradation
- High error rates (>5%)
- Resource usage >80%
- External API failures

**Response Time**: 15 minutes
**Escalation**: Slack + Email

### MEDIUM (Standard Response)
- Moderate performance issues
- Non-critical service issues
- Warning thresholds reached

**Response Time**: 1 hour
**Escalation**: Slack

### LOW (Information)
- Info-level alerts
- Maintenance notifications
- Trend analysis

**Response Time**: 4 hours
**Escalation**: Slack (batched)

## AUTOMATED RESPONSE PROCEDURES

### Service Down
1. Check container status
2. Attempt automatic restart
3. Verify dependencies (database, redis)
4. Check resource availability
5. Escalate if restart fails

### High Error Rate
1. Check application logs
2. Verify database connectivity
3. Check external API status
4. Scale backend services if needed
5. Rollback if recent deployment

### Resource Exhaustion
1. Check top resource consumers
2. Clear temporary files/caches
3. Scale affected services
4. Notify for capacity planning

### Database Issues
1. Check connection pool status
2. Identify slow queries
3. Check disk space
4. Restart if connection issues persist

## MANUAL INTERVENTION PROCEDURES

### Service Restart
```bash
./scripts/24-7-monitoring-integration.sh self-heal --service <service_name>
```

### Scale Services
```bash
docker-compose up -d --scale backend=3
```

### Check Logs
```bash
./scripts/unified-infrastructure-deploy.sh production logs --service <service_name>
```

### Emergency Shutdown
```bash
./scripts/unified-infrastructure-deploy.sh production down
```

## CONTACT ESCALATION

1. **Level 1**: Slack #alerts channel
2. **Level 2**: Email team@waste-management.com
3. **Level 3**: PagerDuty escalation
4. **Level 4**: Emergency contact: +1-xxx-xxx-xxxx

## POST-INCIDENT PROCEDURES

1. Document incident in incident log
2. Perform root cause analysis
3. Update monitoring thresholds if needed
4. Improve automation based on lessons learned
5. Conduct team retrospective for critical incidents
EOF

    log_success "Incident response runbook created"
}

# Function to create self-healing scripts
create_self_healing_scripts() {
    log_info "Creating self-healing automation scripts..."
    
    cat > "$PROJECT_ROOT/scripts/self-healing-automation.sh" << 'EOF'
#!/bin/bash
# Self-healing automation for 24/7 monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to restart unhealthy services
restart_unhealthy_services() {
    local service="$1"
    echo "$(date): Attempting to restart unhealthy service: $service" >> "$PROJECT_ROOT/logs/self-healing.log"
    
    cd "$PROJECT_ROOT"
    docker-compose restart "$service"
    
    # Wait and verify
    sleep 30
    if docker-compose ps "$service" | grep -q "Up"; then
        echo "$(date): Successfully restarted $service" >> "$PROJECT_ROOT/logs/self-healing.log"
        return 0
    else
        echo "$(date): Failed to restart $service" >> "$PROJECT_ROOT/logs/self-healing.log"
        return 1
    fi
}

# Function to clear caches when memory high
clear_system_caches() {
    echo "$(date): Clearing system caches due to high memory usage" >> "$PROJECT_ROOT/logs/self-healing.log"
    
    # Clear Redis cache (non-essential data)
    docker-compose exec redis redis-cli FLUSHDB
    
    # Clear application caches
    docker-compose exec backend npm run cache:clear 2>/dev/null || true
    
    echo "$(date): System caches cleared" >> "$PROJECT_ROOT/logs/self-healing.log"
}

# Function to scale services under load
scale_services_for_load() {
    local service="$1"
    local replicas="$2"
    
    echo "$(date): Scaling $service to $replicas replicas due to high load" >> "$PROJECT_ROOT/logs/self-healing.log"
    
    cd "$PROJECT_ROOT"
    docker-compose up -d --scale "$service=$replicas"
    
    echo "$(date): Scaled $service to $replicas replicas" >> "$PROJECT_ROOT/logs/self-healing.log"
}

# Main self-healing logic
case "$1" in
    "restart")
        restart_unhealthy_services "$2"
        ;;
    "clear-cache")
        clear_system_caches
        ;;
    "scale")
        scale_services_for_load "$2" "$3"
        ;;
    *)
        echo "Usage: $0 {restart|clear-cache|scale} [service] [replicas]"
        exit 1
        ;;
esac
EOF

    chmod +x "$PROJECT_ROOT/scripts/self-healing-automation.sh"
    log_success "Self-healing automation scripts created"
}

# Function to start 24/7 monitoring
start_monitoring() {
    log_step "Starting 24/7 automated monitoring..."
    
    cd "$PROJECT_ROOT"
    
    # Start monitoring stack with alerting profile
    "$PROJECT_ROOT/scripts/unified-infrastructure-deploy.sh" monitoring up
    
    # Wait for services to be ready
    sleep 30
    
    # Enable alerting profile
    docker-compose -f docker-compose.unified.yml --profile alerting up -d
    
    # Create monitoring automation cron job
    setup_monitoring_automation
    
    log_success "24/7 automated monitoring started"
}

# Function to setup monitoring automation
setup_monitoring_automation() {
    log_info "Setting up monitoring automation..."
    
    # Create monitoring check script
    cat > "$PROJECT_ROOT/scripts/monitoring-check.sh" << 'EOF'
#!/bin/bash
# Automated monitoring check for 24/7 system

PROJECT_ROOT="$(dirname "$(dirname "$(readlink -f "$0")")")"
cd "$PROJECT_ROOT"

# Check service health and auto-heal if needed
./scripts/24-7-monitoring-integration.sh health --auto-heal

# Check system resources
./scripts/24-7-monitoring-integration.sh check-resources --auto-scale

# Log monitoring status
echo "$(date): Automated monitoring check completed" >> logs/monitoring-automation.log
EOF

    chmod +x "$PROJECT_ROOT/scripts/monitoring-check.sh"
    
    # Create systemd service for continuous monitoring
    create_monitoring_service
    
    log_success "Monitoring automation setup complete"
}

# Function to create systemd service
create_monitoring_service() {
    if command -v systemctl &> /dev/null; then
        log_info "Creating systemd service for continuous monitoring..."
        
        cat > "/tmp/waste-mgmt-monitoring.service" << EOF
[Unit]
Description=Waste Management 24/7 Monitoring Service
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_ROOT
ExecStart=$PROJECT_ROOT/scripts/monitoring-check.sh
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
EOF

        log_info "Systemd service file created at /tmp/waste-mgmt-monitoring.service"
        log_info "To install: sudo cp /tmp/waste-mgmt-monitoring.service /etc/systemd/system/"
        log_info "To enable: sudo systemctl enable waste-mgmt-monitoring.service"
        log_info "To start: sudo systemctl start waste-mgmt-monitoring.service"
    fi
}

# Function to run health checks with auto-healing
run_health_checks() {
    local auto_heal="${1:-false}"
    
    log_step "Running comprehensive health checks..."
    
    local failed_services=()
    
    # Check all services
    cd "$PROJECT_ROOT"
    local services=$(docker-compose -f docker-compose.unified.yml --profile monitoring ps --services)
    
    for service in $services; do
        if ! docker-compose -f docker-compose.unified.yml ps "$service" | grep -q "Up"; then
            log_error "Service $service is not running"
            failed_services+=("$service")
            
            if [[ "$auto_heal" == "true" ]]; then
                log_info "Attempting to self-heal $service..."
                "$PROJECT_ROOT/scripts/self-healing-automation.sh" restart "$service"
            fi
        else
            log_success "Service $service is healthy"
        fi
    done
    
    # Check system resources
    check_system_resources "$auto_heal"
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "All health checks passed"
        return 0
    else
        log_warning "${#failed_services[@]} service(s) failed health checks"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    local auto_heal="${1:-false}"
    
    log_info "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        log_warning "High CPU usage: $cpu_usage%"
        if [[ "$auto_heal" == "true" ]]; then
            # Scale backend services
            "$PROJECT_ROOT/scripts/self-healing-automation.sh" scale backend 3
        fi
    fi
    
    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
    if (( $(echo "$mem_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        log_warning "High memory usage: $mem_usage%"
        if [[ "$auto_heal" == "true" ]]; then
            "$PROJECT_ROOT/scripts/self-healing-automation.sh" clear-cache
        fi
    fi
    
    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        log_warning "High disk usage: $disk_usage%"
        if [[ "$auto_heal" == "true" ]]; then
            # Clean up logs and temporary files
            find "$PROJECT_ROOT/logs" -name "*.log" -mtime +7 -delete
            docker system prune -f
        fi
    fi
}

# Function to test alert notifications
test_alert_notifications() {
    log_step "Testing alert notification system..."
    
    # Test Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        log_info "Testing Slack notification..."
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"24/7 Monitoring Test Alert - System is operational"}' \
            "$SLACK_WEBHOOK_URL" && log_success "Slack notification test passed" || log_error "Slack notification test failed"
    fi
    
    # Test email notification (if configured)
    if [[ -n "$EMAIL_SMTP_SERVER" ]]; then
        log_info "Testing email notification..."
        # Email test implementation would go here
        log_info "Email notification test configured"
    fi
    
    # Test PagerDuty notification (if configured)
    if [[ -n "$PAGERDUTY_API_KEY" ]]; then
        log_info "Testing PagerDuty notification..."
        # PagerDuty test implementation would go here
        log_info "PagerDuty notification test configured"
    fi
}

# Function to show monitoring status
show_monitoring_status() {
    log_step "24/7 Monitoring System Status"
    
    echo ""
    log_monitor "Environment: $DEPLOYMENT_ENV"
    log_monitor "Timestamp: $(date)"
    
    echo ""
    log_info "Service Status:"
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.unified.yml --profile monitoring ps
    
    echo ""
    log_info "Recent Alerts (last 24 hours):"
    if [[ -f "$MONITORING_LOG_FILE" ]]; then
        tail -20 "$MONITORING_LOG_FILE" | grep -E "(ERROR|WARNING|CRITICAL)" || echo "No recent alerts"
    fi
    
    echo ""
    log_info "System Resources:"
    echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')"
    echo "  Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
    echo "  Disk Usage: $(df / | tail -1 | awk '{print $5}')"
    
    echo ""
    log_info "Access URLs:"
    echo "  Prometheus:     http://localhost:9090"
    echo "  Grafana:        http://localhost:3004"
    echo "  AlertManager:   http://localhost:9093"
    
    echo ""
    log_info "Monitoring Commands:"
    echo "  Health Check:   $0 health"
    echo "  Test Alerts:    $0 test-alerts"
    echo "  Self Heal:      $0 self-heal"
    echo "  View Logs:      tail -f $MONITORING_LOG_FILE"
}

# Main function
main() {
    local action="${1:-status}"
    shift || true
    
    # Parse command line options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                SERVICE="$2"
                shift 2
                ;;
            --severity)
                SEVERITY="$2"
                shift 2
                ;;
            --notify)
                NOTIFY_CHANNEL="$2"
                shift 2
                ;;
            --auto-heal)
                AUTO_HEAL="true"
                shift
                ;;
            --auto-scale)
                AUTO_SCALE="true"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$MONITORING_LOG_FILE")"
    
    case "$action" in
        "setup")
            setup_monitoring_infrastructure
            ;;
        "start")
            start_monitoring
            ;;
        "stop")
            log_info "Stopping 24/7 monitoring..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.unified.yml --profile monitoring down
            docker-compose -f docker-compose.unified.yml --profile alerting down
            log_success "24/7 monitoring stopped"
            ;;
        "status")
            show_monitoring_status
            ;;
        "health")
            run_health_checks "$AUTO_HEAL"
            ;;
        "check-resources")
            check_system_resources "$AUTO_SCALE"
            ;;
        "test-alerts")
            test_alert_notifications
            ;;
        "self-heal")
            if [[ -n "$SERVICE" ]]; then
                "$PROJECT_ROOT/scripts/self-healing-automation.sh" restart "$SERVICE"
            else
                run_health_checks "true"
            fi
            ;;
        "dashboard")
            log_info "Opening monitoring dashboard..."
            open "http://localhost:3004" 2>/dev/null || log_info "Please visit http://localhost:3004"
            ;;
        *)
            log_error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Error handling
trap 'log_error "24/7 monitoring integration failed at line $LINENO"' ERR

# Initialize log file
echo "$(date): 24/7 Monitoring Integration Started" >> "$MONITORING_LOG_FILE"

# Run main function
main "$@"