#!/bin/bash

# ============================================================================
# DEPENDENCY MANAGEMENT AUTOMATION SCRIPT
# ============================================================================
#
# Comprehensive dependency analysis, optimization, and security management
# for the waste management system architecture
#
# Created by: Dependency Resolution Engineer
# Date: 2025-08-15
# Version: 1.0.0
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/dependency-management.log"
BACKUP_DIR="$PROJECT_ROOT/backups/dependencies"
REPORT_DIR="$PROJECT_ROOT/reports/dependencies"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")" "$BACKUP_DIR" "$REPORT_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to create backup
create_backup() {
    log "INFO" "Creating dependency backup..."
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    cp "$PROJECT_ROOT/package.json" "$backup_path/"
    cp "$PROJECT_ROOT/package-lock.json" "$backup_path/" 2>/dev/null || true
    cp "$PROJECT_ROOT/frontend/package.json" "$backup_path/frontend-package.json" 2>/dev/null || true
    cp "$PROJECT_ROOT/package-ml.json" "$backup_path/" 2>/dev/null || true
    cp "$PROJECT_ROOT/requirements-ml.txt" "$backup_path/" 2>/dev/null || true
    cp "$PROJECT_ROOT/requirements-llm.txt" "$backup_path/" 2>/dev/null || true
    
    print_status "$GREEN" "✓ Backup created: $backup_path"
    echo "$backup_path" > "$PROJECT_ROOT/.last-dependency-backup"
}

# Function to restore backup
restore_backup() {
    if [[ ! -f "$PROJECT_ROOT/.last-dependency-backup" ]]; then
        print_status "$RED" "✗ No backup found to restore"
        exit 1
    fi
    
    local backup_path=$(cat "$PROJECT_ROOT/.last-dependency-backup")
    if [[ ! -d "$backup_path" ]]; then
        print_status "$RED" "✗ Backup directory not found: $backup_path"
        exit 1
    fi
    
    log "INFO" "Restoring dependencies from backup: $backup_path"
    
    cp "$backup_path/package.json" "$PROJECT_ROOT/"
    cp "$backup_path/package-lock.json" "$PROJECT_ROOT/" 2>/dev/null || true
    cp "$backup_path/frontend-package.json" "$PROJECT_ROOT/frontend/package.json" 2>/dev/null || true
    cp "$backup_path/package-ml.json" "$PROJECT_ROOT/" 2>/dev/null || true
    cp "$backup_path/requirements-ml.txt" "$PROJECT_ROOT/" 2>/dev/null || true
    cp "$backup_path/requirements-llm.txt" "$PROJECT_ROOT/" 2>/dev/null || true
    
    print_status "$GREEN" "✓ Dependencies restored from backup"
}

# Function to run security audit
security_audit() {
    log "INFO" "Running comprehensive security audit..."
    local report_file="$REPORT_DIR/security-audit-$(date '+%Y%m%d_%H%M%S').json"
    
    print_status "$BLUE" "🔍 Running npm audit..."
    
    # Run npm audit and capture results
    cd "$PROJECT_ROOT"
    npm audit --json > "$report_file" 2>/dev/null || true
    
    # Check for vulnerabilities
    local vulnerabilities=$(jq -r '.metadata.vulnerabilities // empty' "$report_file" 2>/dev/null || echo "{}")
    
    if [[ "$vulnerabilities" != "{}" ]] && [[ "$vulnerabilities" != "null" ]]; then
        local critical=$(echo "$vulnerabilities" | jq -r '.critical // 0' 2>/dev/null || echo "0")
        local high=$(echo "$vulnerabilities" | jq -r '.high // 0' 2>/dev/null || echo "0")
        local moderate=$(echo "$vulnerabilities" | jq -r '.moderate // 0' 2>/dev/null || echo "0")
        local low=$(echo "$vulnerabilities" | jq -r '.low // 0' 2>/dev/null || echo "0")
        
        if [[ "$critical" -gt 0 ]] || [[ "$high" -gt 0 ]]; then
            print_status "$RED" "🚨 CRITICAL/HIGH vulnerabilities found:"
            print_status "$RED" "  Critical: $critical, High: $high, Moderate: $moderate, Low: $low"
            log "ERROR" "Security vulnerabilities detected: Critical=$critical, High=$high"
            return 1
        else
            print_status "$YELLOW" "⚠️ Moderate/Low vulnerabilities found:"
            print_status "$YELLOW" "  Moderate: $moderate, Low: $low"
        fi
    else
        print_status "$GREEN" "✓ No vulnerabilities found"
    fi
    
    print_status "$BLUE" "📊 Security audit report: $report_file"
    return 0
}

# Function to analyze outdated packages
analyze_outdated() {
    log "INFO" "Analyzing outdated packages..."
    local report_file="$REPORT_DIR/outdated-analysis-$(date '+%Y%m%d_%H%M%S').json"
    
    print_status "$BLUE" "📈 Checking for outdated packages..."
    
    cd "$PROJECT_ROOT"
    npm outdated --json > "$report_file" 2>/dev/null || true
    
    if [[ -s "$report_file" ]]; then
        local outdated_count=$(jq -r 'keys | length' "$report_file" 2>/dev/null || echo "0")
        
        if [[ "$outdated_count" -gt 0 ]]; then
            print_status "$YELLOW" "📦 Found $outdated_count outdated packages"
            
            # Analyze critical updates
            print_status "$BLUE" "🔍 Analyzing critical updates..."
            
            # Check for major version differences
            local major_updates=$(jq -r 'to_entries[] | select(.value.current != .value.latest and (.value.latest | split(".")[0] | tonumber) > (.value.current | split(".")[0] | tonumber)) | .key' "$report_file" 2>/dev/null || echo "")
            
            if [[ -n "$major_updates" ]]; then
                print_status "$RED" "🚨 Major version updates available:"
                echo "$major_updates" | while IFS= read -r package; do
                    local current=$(jq -r ".\"$package\".current" "$report_file" 2>/dev/null || echo "unknown")
                    local latest=$(jq -r ".\"$package\".latest" "$report_file" 2>/dev/null || echo "unknown")
                    print_status "$RED" "  $package: $current → $latest"
                done
            fi
        else
            print_status "$GREEN" "✓ All packages are up to date"
        fi
    else
        print_status "$GREEN" "✓ No outdated packages detected"
    fi
    
    print_status "$BLUE" "📊 Outdated analysis report: $report_file"
}

# Function to optimize dependencies
optimize_dependencies() {
    log "INFO" "Starting dependency optimization..."
    
    print_status "$BLUE" "🔧 Analyzing dependency tree..."
    
    cd "$PROJECT_ROOT"
    
    # Count total packages
    local total_packages=$(find node_modules -name "package.json" 2>/dev/null | wc -l | tr -d ' ')
    print_status "$BLUE" "📊 Current total packages: $total_packages"
    
    # Identify duplicate packages
    print_status "$BLUE" "🔍 Checking for duplicate packages..."
    npm ls --depth=0 2>&1 | grep -E "(WARN|ERR)" > /tmp/npm_issues.txt || true
    
    if [[ -s /tmp/npm_issues.txt ]]; then
        print_status "$YELLOW" "⚠️ npm issues detected:"
        cat /tmp/npm_issues.txt
    fi
    
    # Check for unused dependencies
    print_status "$BLUE" "🧹 Checking for unused dependencies..."
    if command -v npx >/dev/null 2>&1; then
        npx depcheck --json > "$REPORT_DIR/depcheck-$(date '+%Y%m%d_%H%M%S').json" 2>/dev/null || true
    fi
    
    # Analyze bundle size potential
    print_status "$BLUE" "📦 Analyzing potential bundle optimizations..."
    
    # Check for heavy packages
    local heavy_packages=$(npm ls --depth=0 --parseable 2>/dev/null | xargs -I {} du -sh {} 2>/dev/null | sort -hr | head -10 || true)
    if [[ -n "$heavy_packages" ]]; then
        print_status "$BLUE" "📊 Top 10 heaviest packages:"
        echo "$heavy_packages"
    fi
    
    print_status "$GREEN" "✓ Dependency optimization analysis complete"
}

# Function to update critical security packages
update_critical_packages() {
    log "INFO" "Updating critical security packages..."
    
    create_backup
    
    cd "$PROJECT_ROOT"
    
    # Define critical packages with their target versions
    declare -A critical_packages=(
        ["express"]="^5.1.0"
        ["stripe"]="^18.4.0"
        ["bcrypt"]="^6.0.0"
        ["helmet"]="^8.1.0"
        ["jsonwebtoken"]="^9.0.2"
        ["redis"]="^5.8.1"
    )
    
    print_status "$BLUE" "🚀 Updating critical security packages..."
    
    for package in "${!critical_packages[@]}"; do
        local target_version="${critical_packages[$package]}"
        print_status "$BLUE" "📦 Updating $package to $target_version..."
        
        if npm install "$package@$target_version" --save; then
            print_status "$GREEN" "✓ Successfully updated $package"
        else
            print_status "$RED" "✗ Failed to update $package"
            log "ERROR" "Failed to update $package to $target_version"
        fi
    done
    
    # Run tests after updates
    print_status "$BLUE" "🧪 Running tests after updates..."
    if npm test; then
        print_status "$GREEN" "✓ All tests passed after updates"
    else
        print_status "$RED" "✗ Tests failed after updates - consider rollback"
        log "ERROR" "Tests failed after critical package updates"
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    log "INFO" "Generating comprehensive dependency report..."
    local report_file="$REPORT_DIR/dependency-report-$(date '+%Y%m%d_%H%M%S').md"
    
    cat > "$report_file" << EOF
# Dependency Management Report

**Generated**: $(date)
**System**: Waste Management Backend

## Summary

EOF
    
    cd "$PROJECT_ROOT"
    
    # Add package counts
    local total_packages=$(find node_modules -name "package.json" 2>/dev/null | wc -l | tr -d ' ')
    local direct_prod=$(jq -r '.dependencies // {} | keys | length' package.json 2>/dev/null || echo "0")
    local direct_dev=$(jq -r '.devDependencies // {} | keys | length' package.json 2>/dev/null || echo "0")
    
    cat >> "$report_file" << EOF
- **Total Packages**: $total_packages
- **Direct Production**: $direct_prod
- **Direct Development**: $direct_dev
- **Transitive Ratio**: $((total_packages - direct_prod - direct_dev)):1

## Security Status

EOF
    
    # Add security audit results
    local latest_audit=$(ls -t "$REPORT_DIR"/security-audit-*.json 2>/dev/null | head -1 || echo "")
    if [[ -n "$latest_audit" ]]; then
        local vulnerabilities=$(jq -r '.metadata.vulnerabilities // {}' "$latest_audit" 2>/dev/null || echo "{}")
        if [[ "$vulnerabilities" != "{}" ]]; then
            local critical=$(echo "$vulnerabilities" | jq -r '.critical // 0' 2>/dev/null || echo "0")
            local high=$(echo "$vulnerabilities" | jq -r '.high // 0' 2>/dev/null || echo "0")
            cat >> "$report_file" << EOF
- **Critical**: $critical
- **High**: $high
- **Status**: $([ "$critical" -eq 0 ] && [ "$high" -eq 0 ] && echo "✅ SECURE" || echo "🚨 ATTENTION REQUIRED")

EOF
        else
            cat >> "$report_file" << EOF
- **Status**: ✅ No vulnerabilities detected

EOF
        fi
    fi
    
    # Add outdated packages summary
    local latest_outdated=$(ls -t "$REPORT_DIR"/outdated-analysis-*.json 2>/dev/null | head -1 || echo "")
    if [[ -n "$latest_outdated" && -s "$latest_outdated" ]]; then
        local outdated_count=$(jq -r 'keys | length' "$latest_outdated" 2>/dev/null || echo "0")
        cat >> "$report_file" << EOF
## Outdated Packages

- **Count**: $outdated_count packages need updates
- **Recommendation**: Review and plan updates

EOF
    fi
    
    cat >> "$report_file" << EOF
## Recommendations

1. **Security**: Address any critical/high vulnerabilities immediately
2. **Performance**: Consider dependency tree optimization
3. **Maintenance**: Setup automated dependency monitoring
4. **Testing**: Ensure comprehensive test coverage before major updates

---
*Generated by Dependency Management Automation*
EOF
    
    print_status "$GREEN" "📊 Comprehensive report generated: $report_file"
}

# Function to setup automated monitoring
setup_monitoring() {
    log "INFO" "Setting up automated dependency monitoring..."
    
    # Create GitHub Actions workflow
    local workflow_dir="$PROJECT_ROOT/.github/workflows"
    mkdir -p "$workflow_dir"
    
    cat > "$workflow_dir/dependency-check.yml" << 'EOF'
name: Dependency Security & Update Check

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday 2AM UTC
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Check for outdated packages
        run: npm outdated || true
      
      - name: Run dependency check script
        run: ./scripts/dependency-management.sh audit
      
      - name: Upload audit results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: dependency-audit-results
          path: reports/dependencies/
EOF
    
    # Create Renovate configuration
    cat > "$PROJECT_ROOT/renovate.json" << 'EOF'
{
  "extends": ["config:base"],
  "schedule": ["before 4am on Monday"],
  "timezone": "UTC",
  "labels": ["dependencies"],
  "reviewersFromCodeOwners": true,
  "packageRules": [
    {
      "matchDepTypes": ["dependencies"],
      "matchUpdateTypes": ["major"],
      "enabled": false,
      "description": "Disable automatic major updates for production dependencies"
    },
    {
      "matchPackageNames": ["express", "stripe", "bcrypt", "helmet", "jsonwebtoken"],
      "labels": ["security-update", "critical"],
      "reviewersFromCodeOwners": true,
      "description": "Critical security packages require manual review"
    },
    {
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true,
      "description": "Auto-merge dev dependency minor/patch updates"
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security", "vulnerability"]
  }
}
EOF
    
    print_status "$GREEN" "✓ Monitoring setup complete"
    print_status "$BLUE" "📝 Created GitHub Actions workflow: .github/workflows/dependency-check.yml"
    print_status "$BLUE" "📝 Created Renovate config: renovate.json"
}

# Main function
main() {
    local command=${1:-"help"}
    
    case $command in
        "audit")
            print_status "$BLUE" "🔍 Running security audit..."
            security_audit
            ;;
        "outdated")
            print_status "$BLUE" "📈 Analyzing outdated packages..."
            analyze_outdated
            ;;
        "optimize")
            print_status "$BLUE" "🔧 Optimizing dependencies..."
            optimize_dependencies
            ;;
        "update")
            print_status "$BLUE" "🚀 Updating critical packages..."
            update_critical_packages
            ;;
        "report")
            print_status "$BLUE" "📊 Generating comprehensive report..."
            generate_report
            ;;
        "backup")
            print_status "$BLUE" "💾 Creating backup..."
            create_backup
            ;;
        "restore")
            print_status "$BLUE" "🔄 Restoring from backup..."
            restore_backup
            ;;
        "monitor")
            print_status "$BLUE" "👁️ Setting up monitoring..."
            setup_monitoring
            ;;
        "full")
            print_status "$BLUE" "🚀 Running full dependency analysis and optimization..."
            create_backup
            security_audit
            analyze_outdated
            optimize_dependencies
            generate_report
            ;;
        "help"|*)
            cat << EOF
Dependency Management Automation Script

Usage: $0 [command]

Commands:
  audit      - Run security audit for vulnerabilities
  outdated   - Analyze outdated packages
  optimize   - Analyze and optimize dependency tree
  update     - Update critical security packages
  report     - Generate comprehensive dependency report
  backup     - Create dependency backup
  restore    - Restore from last backup
  monitor    - Setup automated monitoring (GitHub Actions + Renovate)
  full       - Run complete analysis (backup + audit + outdated + optimize + report)
  help       - Show this help message

Examples:
  $0 audit                    # Quick security check
  $0 full                     # Complete analysis
  $0 update                   # Update critical packages
  $0 monitor                  # Setup automation

Logs: $LOG_FILE
Reports: $REPORT_DIR
Backups: $BACKUP_DIR
EOF
            ;;
    esac
}

# Run main function with all arguments
main "$@"