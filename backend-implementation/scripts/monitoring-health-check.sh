#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - MONITORING HEALTH CHECK
# ============================================================================
#
# Comprehensive health check script for monitoring services with alerting
# and automated recovery capabilities
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
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Default ports
PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
GRAFANA_PORT="${GRAFANA_PORT:-3004}"
BACKEND_PORT="${BACKEND_PORT:-3001}"

# Health check configuration
HEALTH_CHECK_TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_health() { echo -e "${CYAN}[HEALTH]${NC} $1"; }

# Load environment configuration
load_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ -f "$env_file" ]]; then
        set -a
        source "$env_file"
        set +a
        log_info "Loaded configuration for environment: $ENVIRONMENT"
    fi
    
    local monitoring_env_file="$PROJECT_ROOT/.env.monitoring.$ENVIRONMENT"
    if [[ -f "$monitoring_env_file" ]]; then
        set -a
        source "$monitoring_env_file"
        set +a
        log_info "Loaded monitoring configuration"
    fi
}

# Function to check service health with retries
check_service_health() {
    local service_name="$1"
    local health_url="$2"
    local expected_response="$3"
    local timeout="${4:-$HEALTH_CHECK_TIMEOUT}"
    
    log_health "Checking $service_name health..."
    
    for ((i=1; i<=RETRY_COUNT; i++)); do
        if timeout "$timeout" curl -sf "$health_url" | grep -q "$expected_response" 2>/dev/null; then
            log_success "$service_name: Healthy (attempt $i/$RETRY_COUNT)"
            return 0
        else
            if [[ $i -lt $RETRY_COUNT ]]; then
                log_warning "$service_name: Health check failed (attempt $i/$RETRY_COUNT), retrying in ${RETRY_DELAY}s..."
                sleep "$RETRY_DELAY"
            else
                log_error "$service_name: Health check failed after $RETRY_COUNT attempts"
                return 1
            fi
        fi
    done
}

# Check container status
check_container_status() {
    local container_name="$1"
    
    log_health "Checking container status: $container_name"
    
    if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        log_success "Container $container_name: Running"
        
        # Check container health if health check is configured
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
        if [[ "$health_status" != "none" ]]; then
            if [[ "$health_status" == "healthy" ]]; then
                log_success "Container $container_name: Health check passed"
            else
                log_warning "Container $container_name: Health status is $health_status"
            fi
        fi
        return 0
    else
        log_error "Container $container_name: Not running"
        return 1
    fi
}

# Check Prometheus health and configuration
check_prometheus_health() {
    log_health "=== Prometheus Health Check ==="
    
    local prometheus_url="http://localhost:$PROMETHEUS_PORT"
    local failed_checks=0
    
    # Check container status
    if ! check_container_status "waste-mgmt-prometheus"; then
        ((failed_checks++))
    fi
    
    # Check API health
    if ! check_service_health "Prometheus API" "$prometheus_url/-/healthy" "Prometheus Server is Healthy"; then
        ((failed_checks++))
    fi
    
    # Check configuration
    if curl -sf "$prometheus_url/api/v1/status/config" >/dev/null 2>&1; then
        log_success "Prometheus: Configuration loaded successfully"
    else
        log_error "Prometheus: Configuration not loaded"
        ((failed_checks++))
    fi
    
    # Check targets
    local targets_response=$(curl -s "$prometheus_url/api/v1/targets" 2>/dev/null || echo '{}')
    if echo "$targets_response" | jq -e '.data.activeTargets | length > 0' >/dev/null 2>&1; then
        local up_targets=$(echo "$targets_response" | jq '.data.activeTargets | map(select(.health == "up")) | length' 2>/dev/null || echo 0)
        local total_targets=$(echo "$targets_response" | jq '.data.activeTargets | length' 2>/dev/null || echo 0)
        log_success "Prometheus: $up_targets/$total_targets targets are healthy"
        
        if [[ $up_targets -lt $total_targets ]]; then
            log_warning "Prometheus: Some targets are down"
            ((failed_checks++))
        fi
    else
        log_error "Prometheus: No targets configured or targets not responding"
        ((failed_checks++))
    fi
    
    # Check storage
    local storage_response=$(curl -s "$prometheus_url/api/v1/status/tsdb" 2>/dev/null || echo '{}')
    if echo "$storage_response" | jq -e '.status == "success"' >/dev/null 2>&1; then
        log_success "Prometheus: Storage is healthy"
    else
        log_warning "Prometheus: Storage status unknown"
    fi
    
    return $failed_checks
}

# Check Grafana health and configuration
check_grafana_health() {
    log_health "=== Grafana Health Check ==="
    
    local grafana_url="http://localhost:$GRAFANA_PORT"
    local failed_checks=0
    
    # Check container status
    if ! check_container_status "waste-mgmt-grafana"; then
        ((failed_checks++))
    fi
    
    # Check API health
    if ! check_service_health "Grafana API" "$grafana_url/api/health" "ok"; then
        ((failed_checks++))
    fi
    
    # Check data sources
    local grafana_user="${GRAFANA_USER:-admin}"
    local grafana_password="${GRAFANA_PASSWORD:-admin123}"
    
    local datasources_response=$(curl -s -u "$grafana_user:$grafana_password" "$grafana_url/api/datasources" 2>/dev/null || echo '[]')
    if echo "$datasources_response" | jq -e '. | length > 0' >/dev/null 2>&1; then
        local datasource_count=$(echo "$datasources_response" | jq '. | length' 2>/dev/null || echo 0)
        log_success "Grafana: $datasource_count data source(s) configured"
        
        # Test data source connectivity
        for datasource_id in $(echo "$datasources_response" | jq -r '.[].id' 2>/dev/null || echo ""); do
            if curl -sf -u "$grafana_user:$grafana_password" "$grafana_url/api/datasources/$datasource_id/proxy/api/v1/label/__name__/values" >/dev/null 2>&1; then
                log_success "Grafana: Data source ID $datasource_id is responding"
            else
                log_warning "Grafana: Data source ID $datasource_id is not responding"
            fi
        done
    else
        log_warning "Grafana: No data sources configured"
    fi
    
    # Check database connectivity
    if curl -sf -u "$grafana_user:$grafana_password" "$grafana_url/api/admin/stats" >/dev/null 2>&1; then
        log_success "Grafana: Database connectivity healthy"
    else
        log_warning "Grafana: Database connectivity issues"
    fi
    
    return $failed_checks
}

# Check application metrics endpoints
check_application_metrics() {
    log_health "=== Application Metrics Health Check ==="
    
    local failed_checks=0
    
    # Check backend metrics endpoint
    if check_service_health "Backend Metrics" "http://localhost:$BACKEND_PORT/metrics" ""; then
        # Validate metrics format
        local metrics_response=$(curl -s "http://localhost:$BACKEND_PORT/metrics" 2>/dev/null || echo "")
        if echo "$metrics_response" | grep -q "# HELP\|# TYPE"; then
            log_success "Backend: Metrics endpoint returns valid Prometheus format"
        else
            log_warning "Backend: Metrics endpoint format may be invalid"
        fi
    else
        log_warning "Backend: Metrics endpoint not accessible (backend may not be running)"
        ((failed_checks++))
    fi
    
    # Check backend health endpoint
    if check_service_health "Backend Health" "http://localhost:$BACKEND_PORT/health" ""; then
        local health_response=$(curl -s "http://localhost:$BACKEND_PORT/health" 2>/dev/null || echo '{}')
        if echo "$health_response" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
            log_success "Backend: Health endpoint reports healthy status"
        else
            log_warning "Backend: Health endpoint reports non-healthy status"
        fi
    else
        log_warning "Backend: Health endpoint not accessible"
    fi
    
    return $failed_checks
}

# Check monitoring data integrity
check_data_integrity() {
    log_health "=== Monitoring Data Integrity Check ==="
    
    local failed_checks=0
    
    # Check Prometheus data directory
    local prometheus_data_dir="$PROJECT_ROOT/docker/data/prometheus"
    if [[ -d "$prometheus_data_dir" ]]; then
        local data_size=$(du -sh "$prometheus_data_dir" 2>/dev/null | cut -f1 || echo "0")
        log_success "Prometheus data directory exists: $data_size"
        
        # Check if data is being written
        local latest_file=$(find "$prometheus_data_dir" -name "*.db" -type f -newer "$prometheus_data_dir" 2>/dev/null | head -1)
        if [[ -n "$latest_file" ]]; then
            log_success "Prometheus: Recent data files found"
        else
            log_warning "Prometheus: No recent data files found"
        fi
    else
        log_error "Prometheus: Data directory not found"
        ((failed_checks++))
    fi
    
    # Check Grafana data directory
    local grafana_data_dir="$PROJECT_ROOT/docker/data/grafana"
    if [[ -d "$grafana_data_dir" ]]; then
        log_success "Grafana data directory exists"
    else
        log_error "Grafana: Data directory not found"
        ((failed_checks++))
    fi
    
    return $failed_checks
}

# Check monitoring alerting
check_alerting() {
    log_health "=== Alerting Health Check ==="
    
    local prometheus_url="http://localhost:$PROMETHEUS_PORT"
    local failed_checks=0
    
    # Check alert rules
    local rules_response=$(curl -s "$prometheus_url/api/v1/rules" 2>/dev/null || echo '{}')
    if echo "$rules_response" | jq -e '.data.groups | length > 0' >/dev/null 2>&1; then
        local rule_groups=$(echo "$rules_response" | jq '.data.groups | length' 2>/dev/null || echo 0)
        local total_rules=$(echo "$rules_response" | jq '[.data.groups[].rules | length] | add' 2>/dev/null || echo 0)
        log_success "Prometheus: $rule_groups rule group(s) with $total_rules total rules loaded"
        
        # Check for firing alerts
        local alerts_response=$(curl -s "$prometheus_url/api/v1/alerts" 2>/dev/null || echo '{}')
        if echo "$alerts_response" | jq -e '.data | length > 0' >/dev/null 2>&1; then
            local firing_alerts=$(echo "$alerts_response" | jq '[.data[] | select(.state == "firing")] | length' 2>/dev/null || echo 0)
            if [[ $firing_alerts -gt 0 ]]; then
                log_warning "Prometheus: $firing_alerts alert(s) currently firing"
            else
                log_success "Prometheus: No alerts currently firing"
            fi
        fi
    else
        log_warning "Prometheus: No alert rules configured"
    fi
    
    # Check Alertmanager if available
    if check_container_status "waste-mgmt-alertmanager" 2>/dev/null; then
        log_success "Alertmanager: Container is running"
    else
        log_info "Alertmanager: Not configured (optional)"
    fi
    
    return $failed_checks
}

# Generate health report
generate_health_report() {
    local total_failed_checks="$1"
    
    log_health "=== Health Check Summary ==="
    
    if [[ $total_failed_checks -eq 0 ]]; then
        log_success "All monitoring health checks passed!"
        echo -e "${GREEN}Status: HEALTHY${NC}"
    elif [[ $total_failed_checks -le 3 ]]; then
        log_warning "$total_failed_checks health check(s) failed - monitoring is partially healthy"
        echo -e "${YELLOW}Status: DEGRADED${NC}"
    else
        log_error "$total_failed_checks health check(s) failed - monitoring needs attention"
        echo -e "${RED}Status: UNHEALTHY${NC}"
    fi
    
    echo ""
    log_info "Health Check Report Generated: $(date)"
    log_info "Environment: $ENVIRONMENT"
    log_info "Failed Checks: $total_failed_checks"
    
    # Save report to file
    local report_file="$PROJECT_ROOT/logs/monitoring-health-$(date +%Y%m%d_%H%M%S).log"
    mkdir -p "$(dirname "$report_file")"
    {
        echo "Monitoring Health Check Report"
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Failed Checks: $total_failed_checks"
        echo "Prometheus Port: $PROMETHEUS_PORT"
        echo "Grafana Port: $GRAFANA_PORT"
    } > "$report_file"
    
    log_info "Report saved to: $report_file"
}

# Auto-recovery for common issues
attempt_auto_recovery() {
    log_health "=== Attempting Auto-Recovery ==="
    
    local recovery_actions=0
    
    # Restart unhealthy containers
    for container in "waste-mgmt-prometheus" "waste-mgmt-grafana"; do
        if ! docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            log_warning "Attempting to restart container: $container"
            cd "$PROJECT_ROOT"
            docker-compose --profile monitoring restart "$container" 2>/dev/null || true
            ((recovery_actions++))
            sleep 10
        fi
    done
    
    if [[ $recovery_actions -gt 0 ]]; then
        log_info "$recovery_actions recovery action(s) attempted"
        log_info "Waiting 30 seconds for services to stabilize..."
        sleep 30
    else
        log_info "No auto-recovery actions needed"
    fi
}

# Main health check function
main() {
    case "${1:-check}" in
        "check")
            log_info "Starting comprehensive monitoring health check for environment: $ENVIRONMENT"
            load_config
            
            local total_failed_checks=0
            
            check_prometheus_health
            total_failed_checks=$((total_failed_checks + $?))
            
            check_grafana_health
            total_failed_checks=$((total_failed_checks + $?))
            
            check_application_metrics
            total_failed_checks=$((total_failed_checks + $?))
            
            check_data_integrity
            total_failed_checks=$((total_failed_checks + $?))
            
            check_alerting
            total_failed_checks=$((total_failed_checks + $?))
            
            generate_health_report "$total_failed_checks"
            
            # Exit with appropriate code
            if [[ $total_failed_checks -eq 0 ]]; then
                exit 0
            elif [[ $total_failed_checks -le 3 ]]; then
                exit 1
            else
                exit 2
            fi
            ;;
        "recover")
            log_info "Starting auto-recovery for monitoring services"
            load_config
            attempt_auto_recovery
            
            # Run health check after recovery
            log_info "Running health check after recovery..."
            sleep 5
            "$0" check
            ;;
        "quick")
            log_info "Running quick health check"
            load_config
            
            local quick_failed=0
            
            if ! check_service_health "Prometheus" "http://localhost:$PROMETHEUS_PORT/-/healthy" "Prometheus Server is Healthy"; then
                ((quick_failed++))
            fi
            
            if ! check_service_health "Grafana" "http://localhost:$GRAFANA_PORT/api/health" "ok"; then
                ((quick_failed++))
            fi
            
            if [[ $quick_failed -eq 0 ]]; then
                log_success "Quick health check passed"
                exit 0
            else
                log_error "Quick health check failed"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 {check|recover|quick}"
            echo ""
            echo "Environment Variables:"
            echo "  ENVIRONMENT        - Target environment (default: production)"
            echo "  PROMETHEUS_PORT    - Prometheus port (default: 9090)"
            echo "  GRAFANA_PORT       - Grafana port (default: 3004)"
            echo ""
            echo "Commands:"
            echo "  check     - Run comprehensive health check (default)"
            echo "  recover   - Attempt auto-recovery and health check"
            echo "  quick     - Run quick health check"
            echo ""
            echo "Exit Codes:"
            echo "  0 - All checks passed"
            echo "  1 - Some checks failed (degraded)"
            echo "  2 - Many checks failed (unhealthy)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"