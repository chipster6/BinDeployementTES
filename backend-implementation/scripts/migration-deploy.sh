#!/bin/bash

# ============================================================================
# PRODUCTION DATABASE MIGRATION DEPLOYMENT SCRIPT
# ============================================================================
#
# Automated database migration deployment for production environments
# with comprehensive safety checks, backup creation, and rollback capabilities.
#
# Features:
# - Zero-downtime deployment support
# - Automatic backup creation and validation
# - Production safety checks and validation
# - Health monitoring and rollback automation
# - Docker container integration
# - Multi-environment support
#
# Created by: Database-Architect
# Date: 2025-08-15
# Version: 1.0.0
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
MIGRATION_LOG="$LOG_DIR/migration-deploy-$(date +%Y%m%d-%H%M%S).log"

# Environment variables with defaults
ENVIRONMENT="${ENVIRONMENT:-development}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"
VALIDATION_ENABLED="${VALIDATION_ENABLED:-true}"
ZERO_DOWNTIME="${ZERO_DOWNTIME:-false}"
DRY_RUN="${DRY_RUN:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
MAX_MIGRATION_TIME="${MAX_MIGRATION_TIME:-3600}"  # 1 hour timeout

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "[$timestamp] [$level] $message" | tee -a "$MIGRATION_LOG"
    
    case "$level" in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
    esac
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    send_notification "FAILED" "Migration deployment failed: $1"
    exit 1
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    # Remove any temporary files or processes
    if [[ -n "${MIGRATION_PID:-}" ]] && kill -0 "$MIGRATION_PID" 2>/dev/null; then
        kill "$MIGRATION_PID" 2>/dev/null || true
    fi
}

# Set up signal handlers
trap cleanup EXIT
trap 'error_exit "Script interrupted by user"' INT TERM

# Send notification (Slack, email, etc.)
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        if [[ "$status" == "FAILED" ]]; then
            color="danger"
        elif [[ "$status" == "WARNING" ]]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Migration Deployment - $ENVIRONMENT\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || log "WARN" "Failed to send Slack notification"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check required tools
    local required_tools=("node" "npm" "docker" "psql" "pg_dump")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    # Check database connectivity
    if [[ -n "$DATABASE_URL" ]]; then
        log "INFO" "Testing database connectivity..."
        if ! psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            error_exit "Cannot connect to database"
        fi
    fi
    
    # Check Docker if in containerized environment
    if [[ "$ENVIRONMENT" != "development" ]] && docker info &>/dev/null; then
        log "INFO" "Docker is available"
        DOCKER_AVAILABLE=true
    else
        DOCKER_AVAILABLE=false
    fi
    
    # Ensure directories exist
    mkdir -p "$BACKUP_DIR" "$LOG_DIR"
    
    log "SUCCESS" "Prerequisites check completed"
}

# Pre-deployment health check
pre_deployment_health_check() {
    log "INFO" "Performing pre-deployment health check..."
    
    # Check system resources
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ "$disk_usage" -gt 90 ]]; then
        error_exit "Disk usage too high: ${disk_usage}%"
    fi
    
    # Check database connections
    if [[ -n "$DATABASE_URL" ]]; then
        local active_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
        log "INFO" "Active database connections: $active_connections"
        
        # Warn if too many connections
        if [[ "$active_connections" -gt 100 ]]; then
            log "WARN" "High number of active connections detected"
            if [[ "$FORCE_DEPLOY" != "true" ]]; then
                error_exit "Too many active connections. Use FORCE_DEPLOY=true to override."
            fi
        fi
    fi
    
    # Check application health (if URL provided)
    if [[ -n "${APP_HEALTH_URL:-}" ]]; then
        if ! curl -sf "$APP_HEALTH_URL" &>/dev/null; then
            log "WARN" "Application health check failed"
        fi
    fi
    
    log "SUCCESS" "Pre-deployment health check completed"
}

# Create database backup
create_backup() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        log "INFO" "Backup creation disabled, skipping..."
        return 0
    fi
    
    log "INFO" "Creating database backup..."
    
    local backup_id="deploy-$(date +%Y%m%d-%H%M%S)"
    local backup_file="$BACKUP_DIR/${backup_id}.sql"
    
    # Use the migration CLI to create backup
    if [[ "$DOCKER_AVAILABLE" == "true" ]]; then
        docker-compose exec -T backend npm run migration:backup -- \
            --description "Pre-deployment backup for $ENVIRONMENT" \
            --tags "deployment,automated,${ENVIRONMENT}" \
            > "$backup_file.log" 2>&1
    else
        cd "$PROJECT_DIR"
        npm run migration:backup -- \
            --description "Pre-deployment backup for $ENVIRONMENT" \
            --tags "deployment,automated,${ENVIRONMENT}" \
            > "$backup_file.log" 2>&1
    fi
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Backup created successfully: $backup_id"
        echo "$backup_id" > "$BACKUP_DIR/latest-backup.txt"
        export LATEST_BACKUP_ID="$backup_id"
    else
        log "ERROR" "Backup creation failed"
        cat "$backup_file.log"
        error_exit "Failed to create database backup"
    fi
}

# Validate migrations
validate_migrations() {
    if [[ "$VALIDATION_ENABLED" != "true" ]]; then
        log "INFO" "Migration validation disabled, skipping..."
        return 0
    fi
    
    log "INFO" "Validating pending migrations..."
    
    local validation_output
    if [[ "$DOCKER_AVAILABLE" == "true" ]]; then
        validation_output=$(docker-compose exec -T backend npm run migration:validate 2>&1)
    else
        cd "$PROJECT_DIR"
        validation_output=$(npm run migration:validate 2>&1)
    fi
    
    local validation_exit_code=$?
    
    echo "$validation_output" >> "$MIGRATION_LOG"
    
    if [[ $validation_exit_code -eq 0 ]]; then
        log "SUCCESS" "Migration validation passed"
    else
        log "ERROR" "Migration validation failed"
        echo "$validation_output"
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            error_exit "Migration validation failed. Use FORCE_DEPLOY=true to override."
        else
            log "WARN" "Continuing deployment despite validation failures (FORCE_DEPLOY=true)"
        fi
    fi
}

# Execute migrations
execute_migrations() {
    log "INFO" "Executing database migrations..."
    
    local migration_cmd_args=()
    
    if [[ "$DRY_RUN" == "true" ]]; then
        migration_cmd_args+=("--dry-run")
        log "INFO" "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    if [[ "$ZERO_DOWNTIME" == "true" ]]; then
        migration_cmd_args+=("--zero-downtime")
        log "INFO" "Zero-downtime mode enabled"
    fi
    
    # Add automatic confirmation in production
    migration_cmd_args+=("--yes")
    
    local migration_output
    local migration_exit_code
    
    # Execute migrations with timeout
    if [[ "$DOCKER_AVAILABLE" == "true" ]]; then
        timeout "$MAX_MIGRATION_TIME" docker-compose exec -T backend \
            npm run migration:migrate -- "${migration_cmd_args[@]}" \
            > >(tee -a "$MIGRATION_LOG") 2>&1 &
    else
        cd "$PROJECT_DIR"
        timeout "$MAX_MIGRATION_TIME" npm run migration:migrate -- "${migration_cmd_args[@]}" \
            > >(tee -a "$MIGRATION_LOG") 2>&1 &
    fi
    
    MIGRATION_PID=$!
    wait $MIGRATION_PID
    migration_exit_code=$?
    
    if [[ $migration_exit_code -eq 0 ]]; then
        log "SUCCESS" "Migrations executed successfully"
        return 0
    elif [[ $migration_exit_code -eq 124 ]]; then
        error_exit "Migration execution timed out after ${MAX_MIGRATION_TIME} seconds"
    else
        log "ERROR" "Migration execution failed with exit code: $migration_exit_code"
        return 1
    fi
}

# Post-deployment health check
post_deployment_health_check() {
    log "INFO" "Performing post-deployment health check..."
    
    # Wait for application to stabilize
    sleep 10
    
    # Check database connectivity
    if [[ -n "$DATABASE_URL" ]]; then
        if ! psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            log "ERROR" "Database connectivity check failed"
            return 1
        fi
    fi
    
    # Check application health
    if [[ -n "${APP_HEALTH_URL:-}" ]]; then
        local retries=5
        local retry_delay=10
        
        for ((i=1; i<=retries; i++)); do
            if curl -sf "$APP_HEALTH_URL" &>/dev/null; then
                log "SUCCESS" "Application health check passed"
                return 0
            else
                log "WARN" "Application health check failed (attempt $i/$retries)"
                if [[ $i -lt $retries ]]; then
                    sleep $retry_delay
                fi
            fi
        done
        
        log "ERROR" "Application health check failed after $retries attempts"
        return 1
    fi
    
    log "SUCCESS" "Post-deployment health check completed"
    return 0
}

# Rollback migrations
rollback_deployment() {
    log "WARN" "Initiating deployment rollback..."
    
    if [[ -n "${LATEST_BACKUP_ID:-}" ]]; then
        log "INFO" "Restoring from backup: $LATEST_BACKUP_ID"
        
        if [[ "$DOCKER_AVAILABLE" == "true" ]]; then
            docker-compose exec -T backend npm run migration:restore "$LATEST_BACKUP_ID" --yes
        else
            cd "$PROJECT_DIR"
            npm run migration:restore "$LATEST_BACKUP_ID" --yes
        fi
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "Database restored from backup"
        else
            log "ERROR" "Failed to restore from backup"
        fi
    else
        log "WARN" "No backup available for rollback"
    fi
    
    send_notification "WARNING" "Deployment rolled back for environment: $ENVIRONMENT"
}

# Main deployment workflow
main() {
    log "INFO" "Starting migration deployment for environment: $ENVIRONMENT"
    send_notification "INFO" "Migration deployment started for environment: $ENVIRONMENT"
    
    local start_time=$(date +%s)
    
    # Deployment steps
    check_prerequisites
    pre_deployment_health_check
    create_backup
    validate_migrations
    
    # Execute migrations
    if execute_migrations; then
        # Post-deployment verification
        if post_deployment_health_check; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log "SUCCESS" "Migration deployment completed successfully in ${duration} seconds"
            send_notification "SUCCESS" "Migration deployment completed successfully for $ENVIRONMENT in ${duration}s"
        else
            log "ERROR" "Post-deployment health check failed"
            rollback_deployment
            error_exit "Deployment failed post-deployment health check"
        fi
    else
        log "ERROR" "Migration execution failed"
        rollback_deployment
        error_exit "Migration execution failed"
    fi
}

# Command line argument parsing
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --force)
            FORCE_DEPLOY="true"
            shift
            ;;
        --zero-downtime)
            ZERO_DOWNTIME="true"
            shift
            ;;
        --no-backup)
            BACKUP_ENABLED="false"
            shift
            ;;
        --no-validation)
            VALIDATION_ENABLED="false"
            shift
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV     Target environment (default: development)"
            echo "  --dry-run            Perform dry run without executing migrations"
            echo "  --force              Force deployment despite warnings"
            echo "  --zero-downtime      Enable zero-downtime deployment mode"
            echo "  --no-backup          Skip backup creation"
            echo "  --no-validation      Skip migration validation"
            echo "  --slack-webhook URL  Slack webhook for notifications"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DATABASE_URL         Database connection URL"
            echo "  APP_HEALTH_URL       Application health check URL"
            echo "  MAX_MIGRATION_TIME   Maximum migration time in seconds (default: 3600)"
            exit 0
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Run main function
main "$@"