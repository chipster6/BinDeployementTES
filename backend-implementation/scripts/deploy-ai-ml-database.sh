#!/bin/bash

# ============================================================================
# AI/ML DATABASE DEPLOYMENT SCRIPT
# ============================================================================
#
# Production-ready deployment script for AI/ML database architecture
# Coordinates database schema migration, connection pool optimization,
# and AI/ML infrastructure setup with comprehensive validation
#
# Created by: Database-Architect
# Coordination: AI/ML MESH Session coord-ai-ml-mesh-001
# Date: 2025-08-13
# Version: 1.0.0 - Production Ready
# ============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/tmp/ai-ml-database-deployment-$(date +%Y%m%d-%H%M%S).log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC}  ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        *)       echo -e "${CYAN}[LOG]${NC}   ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Progress indicator
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    local percent=$(( current * 100 / total ))
    local filled=$(( percent / 2 ))
    local empty=$(( 50 - filled ))
    
    printf "\r${BLUE}[%s%s] %d%% - %s${NC}" \
        "$(printf "%*s" $filled | tr ' ' '#')" \
        "$(printf "%*s" $empty | tr ' ' '.')" \
        $percent \
        "$description"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "🔍 Checking deployment prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in psql docker docker-compose curl jq; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        log "ERROR" "Please install missing tools before proceeding"
        exit 1
    fi
    
    # Check environment variables
    local required_vars=(
        "DATABASE_URL"
        "POSTGRES_HOST"
        "POSTGRES_PORT"
        "POSTGRES_DB"
        "POSTGRES_USER"
        "POSTGRES_PASSWORD"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log "ERROR" "Missing required environment variables: ${missing_vars[*]}"
        log "ERROR" "Please set all required environment variables"
        exit 1
    fi
    
    log "SUCCESS" "✅ All prerequisites satisfied"
}

# Test database connectivity
test_database_connection() {
    log "INFO" "🔌 Testing database connectivity..."
    
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            log "SUCCESS" "✅ Database connection successful"
            return 0
        fi
        
        log "WARN" "Database connection attempt $attempt/$max_attempts failed"
        attempt=$((attempt + 1))
        sleep 5
    done
    
    log "ERROR" "❌ Failed to connect to database after $max_attempts attempts"
    exit 1
}

# Backup existing database
backup_database() {
    log "INFO" "💾 Creating database backup before AI/ML migration..."
    
    local backup_file="/tmp/pre-ai-ml-backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if pg_dump "$DATABASE_URL" > "$backup_file"; then
        log "SUCCESS" "✅ Database backup created: $backup_file"
        echo "BACKUP_FILE=$backup_file" >> "$LOG_FILE"
    else
        log "ERROR" "❌ Failed to create database backup"
        read -p "Continue without backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check database current state
check_database_state() {
    log "INFO" "🔍 Analyzing current database state..."
    
    # Check if this is a fresh installation or upgrade
    local existing_tables=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'organizations', 'customers');
    " | tr -d ' ')
    
    if [ "$existing_tables" -eq 3 ]; then
        log "INFO" "📊 Existing production database detected - performing upgrade migration"
        export MIGRATION_TYPE="upgrade"
    else
        log "INFO" "🆕 Fresh database detected - performing full installation"
        export MIGRATION_TYPE="fresh"
    fi
    
    # Check existing connection pool configuration
    local current_connections=$(psql "$DATABASE_URL" -t -c "SHOW max_connections;" | tr -d ' ')
    log "INFO" "📊 Current max_connections: $current_connections"
    
    if [ "$current_connections" -lt 180 ]; then
        log "WARN" "⚠️  Database max_connections ($current_connections) may be insufficient for AI/ML workloads"
        log "INFO" "💡 Recommended: max_connections = 200+ for production AI/ML integration"
    fi
}

# Deploy AI/ML database schema
deploy_ai_ml_schema() {
    log "INFO" "🚀 Deploying AI/ML database schema..."
    
    local migration_file="$PROJECT_ROOT/src/database/migrations/001-create-ai-ml-schema.sql"
    
    if [ ! -f "$migration_file" ]; then
        log "ERROR" "❌ Migration file not found: $migration_file"
        exit 1
    fi
    
    # Start transaction and deploy schema
    log "INFO" "📝 Executing AI/ML schema migration..."
    
    if psql "$DATABASE_URL" -f "$migration_file"; then
        log "SUCCESS" "✅ AI/ML schema migration completed successfully"
    else
        log "ERROR" "❌ AI/ML schema migration failed"
        log "ERROR" "Check the log file for details: $LOG_FILE"
        exit 1
    fi
    
    # Verify schema deployment
    verify_schema_deployment
}

# Verify schema deployment
verify_schema_deployment() {
    log "INFO" "🔍 Verifying AI/ML schema deployment..."
    
    local expected_tables=(
        "ml_vector_metadata"
        "ml_feature_store"
        "ml_models"
        "ml_predictions"
        "db_connection_pool_metrics"
        "ml_encryption_keys"
        "ml_audit_logs"
    )
    
    local verification_failed=false
    
    for table in "${expected_tables[@]}"; do
        show_progress $((${#expected_tables[@]} - ${#expected_tables[@]} + 1)) ${#expected_tables[@]} "Verifying table: $table"
        
        local table_exists=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '$table';
        " | tr -d ' ')
        
        if [ "$table_exists" -eq 1 ]; then
            log "DEBUG" "✅ Table verified: $table"
        else
            log "ERROR" "❌ Table missing: $table"
            verification_failed=true
        fi
    done
    
    echo  # New line after progress indicator
    
    if [ "$verification_failed" = true ]; then
        log "ERROR" "❌ Schema verification failed - some tables are missing"
        exit 1
    fi
    
    # Verify functions
    local expected_functions=(
        "get_ml_training_dataset"
        "route_ml_query"
        "encrypt_ml_data"
    )
    
    for func in "${expected_functions[@]}"; do
        local func_exists=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*) 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = '$func';
        " | tr -d ' ')
        
        if [ "$func_exists" -eq 1 ]; then
            log "DEBUG" "✅ Function verified: $func"
        else
            log "ERROR" "❌ Function missing: $func"
            verification_failed=true
        fi
    done
    
    if [ "$verification_failed" = true ]; then
        log "ERROR" "❌ Function verification failed"
        exit 1
    fi
    
    log "SUCCESS" "✅ All AI/ML schema components verified successfully"
}

# Initialize ML encryption keys
initialize_encryption_keys() {
    log "INFO" "🔐 Initializing ML encryption keys..."
    
    # Check if keys already exist
    local existing_keys=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM ml_encryption_keys WHERE key_status = 'active';
    " | tr -d ' ')
    
    if [ "$existing_keys" -gt 0 ]; then
        log "INFO" "🔑 Encryption keys already initialized ($existing_keys active keys)"
        return 0
    fi
    
    # Keys are initialized by the migration script, verify they exist
    local initialized_keys=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM ml_encryption_keys;
    " | tr -d ' ')
    
    if [ "$initialized_keys" -eq 3 ]; then
        log "SUCCESS" "✅ ML encryption keys initialized successfully"
    else
        log "ERROR" "❌ Failed to initialize ML encryption keys"
        exit 1
    fi
}

# Optimize database for AI/ML workloads
optimize_database_for_ml() {
    log "INFO" "⚡ Optimizing database configuration for AI/ML workloads..."
    
    # Check current PostgreSQL configuration
    local shared_buffers=$(psql "$DATABASE_URL" -t -c "SHOW shared_buffers;" | tr -d ' ')
    local work_mem=$(psql "$DATABASE_URL" -t -c "SHOW work_mem;" | tr -d ' ')
    local random_page_cost=$(psql "$DATABASE_URL" -t -c "SHOW random_page_cost;" | tr -d ' ')
    
    log "INFO" "📊 Current configuration:"
    log "INFO" "   shared_buffers: $shared_buffers"
    log "INFO" "   work_mem: $work_mem"
    log "INFO" "   random_page_cost: $random_page_cost"
    
    # Apply ML-optimized settings (if we have ALTER SYSTEM privileges)
    local optimization_queries=(
        "ALTER SYSTEM SET shared_buffers = '512MB';"
        "ALTER SYSTEM SET work_mem = '32MB';"
        "ALTER SYSTEM SET random_page_cost = 1.1;"
        "ALTER SYSTEM SET effective_cache_size = '2GB';"
        "ALTER SYSTEM SET checkpoint_completion_target = 0.9;"
        "ALTER SYSTEM SET wal_buffers = '16MB';"
        "ALTER SYSTEM SET default_statistics_target = 500;"
    )
    
    local optimization_applied=false
    
    for query in "${optimization_queries[@]}"; do
        if psql "$DATABASE_URL" -c "$query" &> /dev/null; then
            optimization_applied=true
        else
            log "WARN" "⚠️  Could not apply optimization: $query"
            log "WARN" "   This may require superuser privileges"
        fi
    done
    
    if [ "$optimization_applied" = true ]; then
        log "INFO" "💡 Database optimizations applied - restart PostgreSQL to take effect"
        log "INFO" "   sudo systemctl restart postgresql"
    else
        log "WARN" "⚠️  Could not apply database optimizations"
        log "INFO" "💡 Consider manually applying ML-optimized PostgreSQL settings"
    fi
}

# Test AI/ML functionality
test_ai_ml_functionality() {
    log "INFO" "🧪 Testing AI/ML functionality..."
    
    # Test vector metadata operations
    log "DEBUG" "Testing vector metadata operations..."
    psql "$DATABASE_URL" -c "
        INSERT INTO ml_vector_metadata (entity_type, entity_id, vector_id, embedding_model)
        VALUES ('test_entity', uuid_generate_v4(), 'test_vector_001', 'text2vec-openai');
    " &> /dev/null
    
    local test_vector_count=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM ml_vector_metadata WHERE vector_id = 'test_vector_001';
    " | tr -d ' ')
    
    if [ "$test_vector_count" -eq 1 ]; then
        log "DEBUG" "✅ Vector metadata operations working"
        # Cleanup test data
        psql "$DATABASE_URL" -c "DELETE FROM ml_vector_metadata WHERE vector_id = 'test_vector_001';" &> /dev/null
    else
        log "ERROR" "❌ Vector metadata operations failed"
        exit 1
    fi
    
    # Test ML query routing function
    log "DEBUG" "Testing ML query routing function..."
    local routing_result=$(psql "$DATABASE_URL" -t -c "
        SELECT route_ml_query('vector_search', uuid_generate_v4(), 8);
    " 2>/dev/null)
    
    if [ -n "$routing_result" ]; then
        log "DEBUG" "✅ ML query routing function working"
    else
        log "ERROR" "❌ ML query routing function failed"
        exit 1
    fi
    
    # Test encryption function
    log "DEBUG" "Testing ML encryption function..."
    local encryption_result=$(psql "$DATABASE_URL" -t -c "
        SELECT encrypt_ml_data('{\"test\": \"data\"}', 'vector_data');
    " 2>/dev/null)
    
    if [ -n "$encryption_result" ]; then
        log "DEBUG" "✅ ML encryption function working"
    else
        log "ERROR" "❌ ML encryption function failed"
        exit 1
    fi
    
    log "SUCCESS" "✅ All AI/ML functionality tests passed"
}

# Setup monitoring
setup_monitoring() {
    log "INFO" "📊 Setting up AI/ML database monitoring..."
    
    # Refresh materialized view
    psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW ml_performance_dashboard;" &> /dev/null
    
    # Create monitoring cron job (if crontab is available)
    if command -v crontab &> /dev/null; then
        local cron_job="*/15 * * * * psql \"$DATABASE_URL\" -c \"REFRESH MATERIALIZED VIEW ml_performance_dashboard;\" >> /var/log/ml-monitoring.log 2>&1"
        
        # Add to crontab if not already present
        if ! crontab -l 2>/dev/null | grep -q "ml_performance_dashboard"; then
            (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
            log "INFO" "📅 Monitoring cron job added (refreshes every 15 minutes)"
        else
            log "INFO" "📅 Monitoring cron job already exists"
        fi
    else
        log "WARN" "⚠️  crontab not available - manual monitoring refresh required"
    fi
    
    log "SUCCESS" "✅ Monitoring setup completed"
}

# Generate deployment report
generate_deployment_report() {
    log "INFO" "📋 Generating deployment report..."
    
    local report_file="/tmp/ai-ml-database-deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
============================================================================
AI/ML DATABASE DEPLOYMENT REPORT
============================================================================

Deployment Date: $(date)
Migration Type: ${MIGRATION_TYPE:-unknown}
Database: $POSTGRES_DB
Host: $POSTGRES_HOST:$POSTGRES_PORT

SCHEMA COMPONENTS DEPLOYED:
---------------------------
✅ Vector Storage Metadata System
   - ml_vector_metadata table
   - Performance tracking and analytics
   - Weaviate integration support

✅ ML Feature Store System
   - ml_feature_store table
   - Feature versioning and lineage
   - Data quality scoring

✅ ML Model Registry System
   - ml_models table
   - Model lifecycle management
   - Performance benchmarking

✅ ML Prediction Audit System
   - ml_predictions table
   - Prediction tracking and accuracy
   - Business impact measurement

✅ Enhanced Connection Pool Monitoring
   - db_connection_pool_metrics table
   - ML-specific connection tracking
   - Performance optimization

✅ ML Security Infrastructure
   - ml_encryption_keys table
   - ml_audit_logs table
   - Comprehensive compliance tracking

✅ Performance Optimizations
   - ML-optimized indexes created
   - Query routing functions deployed
   - Spatial-ML hybrid query support

✅ Utility Functions
   - get_ml_training_dataset()
   - route_ml_query()
   - encrypt_ml_data()

✅ Monitoring Infrastructure
   - ml_performance_dashboard materialized view
   - Real-time metrics aggregation
   - Automated refresh scheduling

DATABASE STATISTICS:
-------------------
EOF
    
    # Add database statistics to report
    psql "$DATABASE_URL" -c "
        SELECT 
            'Total Tables: ' || COUNT(*) as statistic
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    " -t >> "$report_file"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            'ML Tables: ' || COUNT(*) as statistic
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'ml_%';
    " -t >> "$report_file"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            'ML Indexes: ' || COUNT(*) as statistic
        FROM pg_indexes 
        WHERE indexname LIKE '%ml_%';
    " -t >> "$report_file"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            'ML Functions: ' || COUNT(*) as statistic
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%ml_%';
    " -t >> "$report_file"
    
    cat >> "$report_file" << EOF

NEXT STEPS:
-----------
1. Deploy Weaviate vector database using docker-compose.ai-ml.yml
2. Deploy ML services containers
3. Configure AI/ML feature flags in application
4. Test vector search and ML prediction endpoints
5. Monitor performance through ml_performance_dashboard
6. Set up automated model training pipelines

CONFIGURATION RECOMMENDATIONS:
------------------------------
1. PostgreSQL max_connections: 200+ for production
2. shared_buffers: 512MB+ for ML workloads
3. work_mem: 32MB+ for complex ML queries
4. Enable connection pool monitoring
5. Configure automated backup for ML models and vectors

LOG FILE: $LOG_FILE
BACKUP FILE: $(grep "BACKUP_FILE=" "$LOG_FILE" | cut -d'=' -f2 || echo "No backup created")

============================================================================
EOF
    
    log "SUCCESS" "✅ Deployment report generated: $report_file"
    echo ""
    cat "$report_file"
}

# Main deployment function
main() {
    echo ""
    echo -e "${PURPLE}============================================================================${NC}"
    echo -e "${PURPLE}🚀 AI/ML DATABASE ARCHITECTURE DEPLOYMENT${NC}"
    echo -e "${PURPLE}Database-Architect | MESH Coordination Session coord-ai-ml-mesh-001${NC}"
    echo -e "${PURPLE}============================================================================${NC}"
    echo ""
    
    log "INFO" "🚀 Starting AI/ML database deployment process..."
    log "INFO" "📝 Log file: $LOG_FILE"
    
    # Deployment steps
    local steps=(
        "check_prerequisites"
        "test_database_connection"
        "backup_database"
        "check_database_state"
        "deploy_ai_ml_schema"
        "initialize_encryption_keys"
        "optimize_database_for_ml"
        "test_ai_ml_functionality"
        "setup_monitoring"
        "generate_deployment_report"
    )
    
    local total_steps=${#steps[@]}
    local current_step=1
    
    for step in "${steps[@]}"; do
        echo ""
        show_progress $current_step $total_steps "Executing: $step"
        echo ""
        
        $step
        
        current_step=$((current_step + 1))
    done
    
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}🎉 AI/ML DATABASE DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    log "SUCCESS" "🎉 AI/ML database architecture deployed successfully!"
    log "INFO" "💡 Ready for AI/ML services integration and vector operations"
    log "INFO" "📊 Monitor performance through ml_performance_dashboard materialized view"
    echo ""
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi