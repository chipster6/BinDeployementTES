#!/bin/bash

# ============================================================================
# WASTE MANAGEMENT SYSTEM - MONITORING SETUP VALIDATION
# ============================================================================
#
# Quick validation script to verify monitoring setup and activation
#
# Created by: DevOps Infrastructure Orchestrator
# Date: 2025-08-15
# Version: 1.0.0
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================================================"
echo "WASTE MANAGEMENT SYSTEM - MONITORING SETUP VALIDATION"
echo "============================================================================"
echo ""

# Check 1: Required files exist
log_info "Checking required monitoring files..."
required_files=(
    "docker-compose.yml"
    "docker-compose.monitoring.yml"
    "docker/prometheus/prometheus.prod.yml"
    "docker/alertmanager/alertmanager.yml"
    "scripts/production-monitoring-deploy.sh"
    "scripts/monitoring-health-check.sh"
    "scripts/monitoring-deployment.sh"
    "scripts/activate-monitoring.sh"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (missing)"
        ((missing_files++))
    fi
done

# Check 2: Docker Compose configuration validation
log_info "Validating Docker Compose monitoring configuration..."
cd "$PROJECT_ROOT"

if docker-compose --profile monitoring config >/dev/null 2>&1; then
    log_success "✓ Docker Compose monitoring configuration is valid"
else
    log_error "✗ Docker Compose monitoring configuration is invalid"
    ((missing_files++))
fi

# Check 3: Monitoring services defined
log_info "Checking monitoring services definition..."
monitoring_services=("prometheus" "grafana" "node-exporter" "cadvisor")

for service in "${monitoring_services[@]}"; do
    if docker-compose --profile monitoring config --services | grep -q "^$service$"; then
        log_success "✓ $service service defined"
    else
        log_warning "⚠ $service service not found"
    fi
done

# Check 4: Scripts are executable
log_info "Checking script permissions..."
monitoring_scripts=(
    "scripts/production-monitoring-deploy.sh"
    "scripts/monitoring-health-check.sh"
    "scripts/monitoring-deployment.sh"
    "scripts/activate-monitoring.sh"
)

for script in "${monitoring_scripts[@]}"; do
    if [[ -x "$PROJECT_ROOT/$script" ]]; then
        log_success "✓ $script is executable"
    else
        log_warning "⚠ $script is not executable (fixing...)"
        chmod +x "$PROJECT_ROOT/$script" 2>/dev/null || true
    fi
done

# Check 5: Docker and Docker Compose availability
log_info "Checking Docker availability..."
if command -v docker >/dev/null 2>&1; then
    log_success "✓ Docker is installed"
    
    if docker info >/dev/null 2>&1; then
        log_success "✓ Docker daemon is running"
    else
        log_error "✗ Docker daemon is not running"
        ((missing_files++))
    fi
else
    log_error "✗ Docker is not installed"
    ((missing_files++))
fi

if command -v docker-compose >/dev/null 2>&1; then
    log_success "✓ Docker Compose is installed"
else
    log_error "✗ Docker Compose is not installed"
    ((missing_files++))
fi

# Check 6: Data directories
log_info "Checking monitoring data directories..."
data_dirs=(
    "docker/data/prometheus"
    "docker/data/grafana"
    "docker/data/alertmanager"
)

for dir in "${data_dirs[@]}"; do
    mkdir -p "$PROJECT_ROOT/$dir" 2>/dev/null || true
    if [[ -d "$PROJECT_ROOT/$dir" ]]; then
        log_success "✓ $dir directory exists"
    else
        log_error "✗ Failed to create $dir directory"
        ((missing_files++))
    fi
done

# Check 7: Network availability
log_info "Checking Docker network..."
if docker network ls | grep -q "waste-mgmt-network"; then
    log_success "✓ waste-mgmt-network exists"
else
    log_warning "⚠ waste-mgmt-network does not exist (will be created during deployment)"
fi

# Summary
echo ""
echo "============================================================================"
echo "VALIDATION SUMMARY"
echo "============================================================================"

if [[ $missing_files -eq 0 ]]; then
    log_success "✓ ALL VALIDATION CHECKS PASSED"
    echo ""
    log_info "Monitoring setup is ready for activation!"
    echo ""
    echo "Next steps:"
    echo "  1. Activate monitoring: ./scripts/production-monitoring-deploy.sh deploy"
    echo "  2. Check health:       ./scripts/monitoring-health-check.sh check"
    echo "  3. View dashboard:     http://localhost:3004"
    echo ""
    exit 0
else
    log_error "✗ $missing_files VALIDATION CHECKS FAILED"
    echo ""
    log_warning "Please resolve the above issues before activating monitoring."
    echo ""
    exit 1
fi