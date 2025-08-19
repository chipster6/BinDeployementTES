#!/bin/bash

# ============================================================================
# E2E DASHBOARD TESTING SETUP VALIDATION SCRIPT
# ============================================================================
# 
# Validates the complete E2E testing environment setup including Cypress
# configuration, test files, fixtures, and CI/CD pipeline integration.
#
# Created by: Testing Agent
# Date: 2025-08-16
# Version: 1.0.0

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CYPRESS_DIR="$PROJECT_ROOT/cypress"

# Validation counters
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate check result
validate_check() {
    local check_name="$1"
    local result="$2"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    if [ "$result" -eq 0 ]; then
        print_success "✅ $check_name"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        print_error "❌ $check_name"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
}

# Check Cypress installation
check_cypress_installation() {
    print_status "Checking Cypress installation..."
    
    # Check if Cypress is installed
    if [ -d "$PROJECT_ROOT/node_modules/cypress" ]; then
        validate_check "Cypress installed" 0
    else
        validate_check "Cypress installed" 1
        return 1
    fi
    
    # Check Cypress version
    local cypress_version=$(npx cypress version --component package 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
    if [ "$cypress_version" != "unknown" ]; then
        validate_check "Cypress version: $cypress_version" 0
    else
        validate_check "Cypress version detection" 1
    fi
    
    # Check additional Cypress packages
    local packages=("cypress-axe" "cypress-real-events" "@testing-library/cypress")
    for package in "${packages[@]}"; do
        if [ -d "$PROJECT_ROOT/node_modules/$package" ]; then
            validate_check "$package installed" 0
        else
            validate_check "$package installed" 1
        fi
    done
}

# Check Cypress configuration
check_cypress_configuration() {
    print_status "Checking Cypress configuration..."
    
    # Check main config file
    if [ -f "$PROJECT_ROOT/cypress.config.ts" ]; then
        validate_check "cypress.config.ts exists" 0
        
        # Validate configuration content
        if grep -q "e2e:" "$PROJECT_ROOT/cypress.config.ts"; then
            validate_check "E2E configuration present" 0
        else
            validate_check "E2E configuration present" 1
        fi
        
        if grep -q "baseUrl" "$PROJECT_ROOT/cypress.config.ts"; then
            validate_check "Base URL configured" 0
        else
            validate_check "Base URL configured" 1
        fi
    else
        validate_check "cypress.config.ts exists" 1
    fi
    
    # Check support files
    if [ -f "$CYPRESS_DIR/support/e2e.ts" ]; then
        validate_check "Main support file exists" 0
    else
        validate_check "Main support file exists" 1
    fi
    
    # Check command files
    local command_files=(
        "auth-commands.ts"
        "dashboard-commands.ts" 
        "performance-commands.ts"
        "accessibility-commands.ts"
        "mobile-commands.ts"
    )
    
    for cmd_file in "${command_files[@]}"; do
        if [ -f "$CYPRESS_DIR/support/$cmd_file" ]; then
            validate_check "Command file: $cmd_file" 0
        else
            validate_check "Command file: $cmd_file" 1
        fi
    done
}

# Check test files structure
check_test_files() {
    print_status "Checking test files structure..."
    
    # Check test directories
    local test_dirs=(
        "dashboards"
        "authentication"
        "workflows"
        "realtime"
        "performance"
        "accessibility"
    )
    
    for test_dir in "${test_dirs[@]}"; do
        if [ -d "$CYPRESS_DIR/e2e/$test_dir" ]; then
            validate_check "Test directory: $test_dir" 0
            
            # Count test files in directory
            local test_count=$(find "$CYPRESS_DIR/e2e/$test_dir" -name "*.cy.ts" | wc -l)
            if [ "$test_count" -gt 0 ]; then
                validate_check "$test_dir has test files ($test_count)" 0
            else
                validate_check "$test_dir has test files" 1
            fi
        else
            validate_check "Test directory: $test_dir" 1
        fi
    done
    
    # Check specific critical test files
    local critical_tests=(
        "dashboards/role-based-dashboards.cy.ts"
        "authentication/auth-workflows.cy.ts"
        "workflows/business-processes.cy.ts"
        "realtime/websocket-features.cy.ts"
        "performance/dashboard-performance.cy.ts"
        "accessibility/wcag-compliance.cy.ts"
    )
    
    for test_file in "${critical_tests[@]}"; do
        if [ -f "$CYPRESS_DIR/e2e/$test_file" ]; then
            validate_check "Critical test: $test_file" 0
        else
            validate_check "Critical test: $test_file" 1
        fi
    done
}

# Check fixtures and test data
check_fixtures() {
    print_status "Checking fixtures and test data..."
    
    # Check fixtures directory
    if [ -d "$CYPRESS_DIR/fixtures" ]; then
        validate_check "Fixtures directory exists" 0
    else
        validate_check "Fixtures directory exists" 1
        return 1
    fi
    
    # Check critical fixture files
    local fixture_files=(
        "test-users.json"
        "external-service-responses.json"
    )
    
    for fixture_file in "${fixture_files[@]}"; do
        if [ -f "$CYPRESS_DIR/fixtures/$fixture_file" ]; then
            validate_check "Fixture file: $fixture_file" 0
            
            # Validate JSON format
            if node -e "JSON.parse(require('fs').readFileSync('$CYPRESS_DIR/fixtures/$fixture_file', 'utf8'))" 2>/dev/null; then
                validate_check "$fixture_file is valid JSON" 0
            else
                validate_check "$fixture_file is valid JSON" 1
            fi
        else
            validate_check "Fixture file: $fixture_file" 1
        fi
    done
    
    # Check test users data structure
    if [ -f "$CYPRESS_DIR/fixtures/test-users.json" ]; then
        local user_roles=("super_admin" "admin" "fleet_manager" "driver" "customer" "billing_admin" "support")
        for role in "${user_roles[@]}"; do
            if node -e "const data = JSON.parse(require('fs').readFileSync('$CYPRESS_DIR/fixtures/test-users.json', 'utf8')); if (!data.users.$role) process.exit(1);" 2>/dev/null; then
                validate_check "Test user role: $role" 0
            else
                validate_check "Test user role: $role" 1
            fi
        done
    fi
}

# Check package.json scripts
check_package_scripts() {
    print_status "Checking package.json scripts..."
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        validate_check "package.json exists" 0
        
        # Check Cypress scripts
        local cypress_scripts=(
            "cypress:open"
            "cypress:run"
            "cypress:dashboard"
            "cypress:auth"
            "cypress:workflows"
            "cypress:realtime" 
            "cypress:performance"
            "cypress:accessibility"
            "e2e:dashboard:full"
        )
        
        for script in "${cypress_scripts[@]}"; do
            if node -e "const pkg = JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/package.json', 'utf8')); if (!pkg.scripts['$script']) process.exit(1);" 2>/dev/null; then
                validate_check "Script: $script" 0
            else
                validate_check "Script: $script" 1
            fi
        done
    else
        validate_check "package.json exists" 1
    fi
}

# Check CI/CD configuration
check_cicd_configuration() {
    print_status "Checking CI/CD configuration..."
    
    # Check GitHub Actions workflow
    local workflow_file="$PROJECT_ROOT/.github/workflows/e2e-dashboard-testing.yml"
    if [ -f "$workflow_file" ]; then
        validate_check "GitHub Actions workflow exists" 0
        
        # Check workflow content
        if grep -q "cypress-io/github-action" "$workflow_file"; then
            validate_check "Cypress GitHub Action configured" 0
        else
            validate_check "Cypress GitHub Action configured" 1
        fi
        
        if grep -q "matrix:" "$workflow_file"; then
            validate_check "Matrix testing configured" 0
        else
            validate_check "Matrix testing configured" 1
        fi
        
        # Check for all test job types
        local job_types=("dashboard-testing" "authentication-testing" "workflow-testing" "performance-testing" "accessibility-testing" "realtime-testing")
        for job in "${job_types[@]}"; do
            if grep -q "$job:" "$workflow_file"; then
                validate_check "CI job: $job" 0
            else
                validate_check "CI job: $job" 1
            fi
        done
    else
        validate_check "GitHub Actions workflow exists" 1
    fi
}

# Check TypeScript configuration
check_typescript_config() {
    print_status "Checking TypeScript configuration..."
    
    # Check main TypeScript config
    if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
        validate_check "TypeScript config exists" 0
    else
        validate_check "TypeScript config exists" 1
    fi
    
    # Check Cypress types in support file
    if [ -f "$CYPRESS_DIR/support/e2e.ts" ]; then
        if grep -q "cypress" "$CYPRESS_DIR/support/e2e.ts"; then
            validate_check "Cypress types imported" 0
        else
            validate_check "Cypress types imported" 1
        fi
    fi
}

# Check environment setup
check_environment_setup() {
    print_status "Checking environment setup..."
    
    # Check for environment variable documentation
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        validate_check ".env.example exists" 0
    else
        validate_check ".env.example exists" 1
    fi
    
    # Check if test environment variables are mentioned in workflow
    local workflow_file="$PROJECT_ROOT/.github/workflows/e2e-dashboard-testing.yml"
    if [ -f "$workflow_file" ]; then
        local env_vars=("DATABASE_URL" "REDIS_URL" "CYPRESS_baseUrl" "CYPRESS_apiUrl")
        for var in "${env_vars[@]}"; do
            if grep -q "$var" "$workflow_file"; then
                validate_check "Environment variable: $var" 0
            else
                validate_check "Environment variable: $var" 1
            fi
        done
    fi
}

# Run comprehensive validation
run_comprehensive_validation() {
    print_status "Running comprehensive E2E setup validation..."
    
    # Execute all validation checks
    check_cypress_installation
    check_cypress_configuration
    check_test_files
    check_fixtures
    check_package_scripts
    check_cicd_configuration
    check_typescript_config
    check_environment_setup
}

# Generate validation report
generate_validation_report() {
    local success_rate=$((CHECKS_PASSED * 100 / CHECKS_TOTAL))
    
    echo ""
    echo "============================================================================"
    echo "E2E DASHBOARD TESTING SETUP VALIDATION REPORT"
    echo "============================================================================"
    echo ""
    echo "Total Checks: $CHECKS_TOTAL"
    echo "Passed: $CHECKS_PASSED"
    echo "Failed: $CHECKS_FAILED"
    echo "Success Rate: $success_rate%"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        print_success "✅ E2E Dashboard Testing Setup: FULLY VALIDATED"
        print_success "✅ Ready for comprehensive dashboard testing execution"
        echo ""
        echo "Next Steps:"
        echo "1. Run: npm run cypress:open (for interactive testing)"
        echo "2. Run: ./scripts/run-e2e-tests.sh (for full automation)"
        echo "3. Run: npm run e2e:dashboard:full (for quick validation)"
        return 0
    else
        print_error "❌ E2E Dashboard Testing Setup: VALIDATION FAILED"
        print_error "❌ $CHECKS_FAILED issues need to be resolved"
        echo ""
        echo "Recommended Actions:"
        echo "1. Install missing Cypress packages: npm install"
        echo "2. Verify test file structure and content"
        echo "3. Check fixture data integrity"
        echo "4. Validate CI/CD configuration"
        return 1
    fi
}

# Main execution
main() {
    echo "============================================================================"
    echo "WASTE MANAGEMENT SYSTEM - E2E DASHBOARD TESTING VALIDATION"
    echo "============================================================================"
    echo "Validating comprehensive E2E testing setup for all user roles and workflows"
    echo ""
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run validation
    run_comprehensive_validation
    
    # Generate report
    generate_validation_report
    
    # Exit with appropriate code
    if [ $CHECKS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Execute main function
main "$@"