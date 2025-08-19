#!/bin/bash
# ============================================================================
# WASTE MANAGEMENT SYSTEM - SECURE SECRET INITIALIZATION SCRIPT
# ============================================================================
#
# Production-ready script for initializing Docker Secrets and setting up
# secure credential management for the waste management platform.
#
# Features:
# - Generates cryptographically secure passwords and keys
# - Creates RSA key pairs for JWT authentication
# - Sets up Docker Secrets directory structure
# - Validates secret formats and security requirements
# - Provides backup and recovery procedures
# - Compatible with HashiCorp Vault migration
#
# Created by: Security & Compliance Specialist
# Date: 2025-08-15
# Version: 1.0.0
# ============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/secrets"
BACKUP_DIR="$PROJECT_ROOT/secrets-backup"
LOG_FILE="$PROJECT_ROOT/logs/secret-setup.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() {
    log "INFO" "${BLUE}$*${NC}"
}

warn() {
    log "WARN" "${YELLOW}$*${NC}"
}

error() {
    log "ERROR" "${RED}$*${NC}"
}

success() {
    log "SUCCESS" "${GREEN}$*${NC}"
}

# Create directories
create_directories() {
    info "Creating directory structure..."
    
    mkdir -p "$SECRETS_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Set secure permissions
    chmod 700 "$SECRETS_DIR"
    chmod 700 "$BACKUP_DIR"
    
    success "Directory structure created"
}

# Generate secure random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-${length}
}

# Generate secure random key
generate_key() {
    local length=${1:-64}
    openssl rand -hex $length
}

# Generate RSA key pair for JWT
generate_jwt_keypair() {
    local key_name=$1
    local private_key_file="$SECRETS_DIR/${key_name}_private_key.pem"
    local public_key_file="$SECRETS_DIR/${key_name}_public_key.pem"
    
    info "Generating RSA key pair for $key_name..."
    
    # Generate private key (2048-bit RSA)
    openssl genrsa -out "$private_key_file" 2048
    
    # Generate public key from private key
    openssl rsa -in "$private_key_file" -pubout -out "$public_key_file"
    
    # Set secure permissions
    chmod 600 "$private_key_file"
    chmod 644 "$public_key_file"
    
    success "RSA key pair generated for $key_name"
}

# Create secret file
create_secret_file() {
    local secret_name=$1
    local secret_value=$2
    local secret_file="$SECRETS_DIR/$secret_name.txt"
    
    echo -n "$secret_value" > "$secret_file"
    chmod 600 "$secret_file"
    
    info "Created secret file: $secret_name"
}

# Generate database credentials
generate_database_secrets() {
    info "Generating database credentials..."
    
    # PostgreSQL password
    local db_password=$(generate_password 32)
    create_secret_file "db_password" "$db_password"
    
    # Redis password
    local redis_password=$(generate_password 32)
    create_secret_file "redis_password" "$redis_password"
    
    success "Database credentials generated"
}

# Generate JWT authentication keys
generate_jwt_secrets() {
    info "Generating JWT authentication keys..."
    
    # Generate JWT key pair
    generate_jwt_keypair "jwt"
    
    # Generate JWT refresh key pair
    generate_jwt_keypair "jwt_refresh"
    
    # Copy key files to secrets directory with correct names
    cp "$SECRETS_DIR/jwt_private_key.pem" "$SECRETS_DIR/jwt_private_key"
    cp "$SECRETS_DIR/jwt_public_key.pem" "$SECRETS_DIR/jwt_public_key"
    cp "$SECRETS_DIR/jwt_refresh_private_key.pem" "$SECRETS_DIR/jwt_refresh_private_key"
    cp "$SECRETS_DIR/jwt_refresh_public_key.pem" "$SECRETS_DIR/jwt_refresh_public_key"
    
    success "JWT authentication keys generated"
}

# Generate encryption and session keys
generate_encryption_secrets() {
    info "Generating encryption and session keys..."
    
    # Encryption key (256-bit)
    local encryption_key=$(generate_key 32)
    create_secret_file "encryption_key" "$encryption_key"
    
    # Session secret (512-bit)
    local session_secret=$(generate_key 64)
    create_secret_file "session_secret" "$session_secret"
    
    success "Encryption and session keys generated"
}

# Generate administrative passwords
generate_admin_secrets() {
    info "Generating administrative interface passwords..."
    
    # Redis Commander password
    local redis_commander_password=$(generate_password 24)
    create_secret_file "redis_commander_password" "$redis_commander_password"
    
    # pgAdmin password
    local pgadmin_password=$(generate_password 24)
    create_secret_file "pgadmin_password" "$pgadmin_password"
    
    # Grafana password
    local grafana_password=$(generate_password 24)
    create_secret_file "grafana_password" "$grafana_password"
    
    success "Administrative passwords generated"
}

# Create placeholder files for external service secrets
create_external_placeholders() {
    info "Creating placeholder files for external service secrets..."
    
    # External service secrets that need to be manually configured
    local external_secrets=(
        "stripe_secret_key"
        "stripe_webhook_secret"
        "twilio_auth_token"
        "sendgrid_api_key"
        "samsara_api_token"
        "samsara_webhook_secret"
        "airtable_api_key"
        "mapbox_access_token"
        "aws_access_key_id"
        "aws_secret_access_key"
    )
    
    for secret in "${external_secrets[@]}"; do
        local placeholder_file="$SECRETS_DIR/$secret.txt"
        if [[ ! -f "$placeholder_file" ]]; then
            echo "REPLACE_WITH_ACTUAL_${secret^^}" > "$placeholder_file"
            chmod 600 "$placeholder_file"
        fi
    done
    
    warn "External service secret placeholders created - MUST be replaced with actual values before production deployment"
}

# Validate secret files
validate_secrets() {
    info "Validating generated secrets..."
    
    local validation_errors=0
    
    # Check required secret files exist
    local required_secrets=(
        "db_password.txt"
        "redis_password.txt"
        "jwt_private_key"
        "jwt_public_key"
        "jwt_refresh_private_key"
        "jwt_refresh_public_key"
        "encryption_key.txt"
        "session_secret.txt"
        "redis_commander_password.txt"
        "pgadmin_password.txt"
        "grafana_password.txt"
    )
    
    for secret in "${required_secrets[@]}"; do
        local secret_file="$SECRETS_DIR/$secret"
        if [[ ! -f "$secret_file" ]]; then
            error "Missing required secret file: $secret"
            ((validation_errors++))
        else
            # Check file permissions
            local perms=$(stat -c %a "$secret_file" 2>/dev/null || stat -f %A "$secret_file")
            if [[ "$perms" != "600" ]]; then
                error "Incorrect permissions for $secret: $perms (should be 600)"
                ((validation_errors++))
            fi
            
            # Check file is not empty
            if [[ ! -s "$secret_file" ]]; then
                error "Empty secret file: $secret"
                ((validation_errors++))
            fi
        fi
    done
    
    # Validate JWT keys
    if [[ -f "$SECRETS_DIR/jwt_private_key" ]]; then
        if ! openssl rsa -in "$SECRETS_DIR/jwt_private_key" -check -noout >/dev/null 2>&1; then
            error "Invalid JWT private key format"
            ((validation_errors++))
        fi
    fi
    
    if [[ -f "$SECRETS_DIR/jwt_public_key" ]]; then
        if ! openssl rsa -in "$SECRETS_DIR/jwt_public_key" -pubin -check -noout >/dev/null 2>&1; then
            error "Invalid JWT public key format"
            ((validation_errors++))
        fi
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        success "All secrets validated successfully"
        return 0
    else
        error "Validation failed with $validation_errors errors"
        return 1
    fi
}

# Create backup
create_backup() {
    if [[ -d "$SECRETS_DIR" ]] && [[ -n "$(ls -A "$SECRETS_DIR" 2>/dev/null)" ]]; then
        info "Creating backup of existing secrets..."
        
        local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
        local backup_path="$BACKUP_DIR/secrets_backup_$backup_timestamp"
        
        cp -r "$SECRETS_DIR" "$backup_path"
        chmod -R 600 "$backup_path"/*
        
        success "Backup created at: $backup_path"
    fi
}

# Display summary
display_summary() {
    echo
    success "🔐 SECRET INITIALIZATION COMPLETE 🔐"
    echo
    info "Generated secrets:"
    echo "  📁 Secrets directory: $SECRETS_DIR"
    echo "  🔑 Database credentials: ✅"
    echo "  🎫 JWT key pairs: ✅"
    echo "  🔒 Encryption keys: ✅"
    echo "  👨‍💼 Admin passwords: ✅"
    echo "  🌐 External service placeholders: ✅"
    echo
    warn "IMPORTANT NEXT STEPS:"
    echo "  1. Replace external service placeholders with actual API keys"
    echo "  2. Review and test all generated secrets"
    echo "  3. Deploy using: docker-compose -f docker-compose.secrets.yml up"
    echo "  4. Set up HashiCorp Vault for automated rotation (optional)"
    echo
    info "Security recommendations:"
    echo "  • Keep secrets directory secure (permissions: 700)"
    echo "  • Regularly rotate all secrets"
    echo "  • Monitor secret access and usage"
    echo "  • Use HashiCorp Vault for enterprise deployments"
    echo
}

# Display external secrets instructions
display_external_secrets_guide() {
    echo
    warn "📋 EXTERNAL SECRETS CONFIGURATION GUIDE"
    echo
    info "The following secret files contain placeholders that MUST be replaced:"
    echo
    
    cat << 'EOF'
1. STRIPE SECRETS (Payment Processing):
   • stripe_secret_key.txt -> Your Stripe secret key (sk_live_... or sk_test_...)
   • stripe_webhook_secret.txt -> Your Stripe webhook endpoint secret

2. COMMUNICATION SERVICES:
   • twilio_auth_token.txt -> Your Twilio Auth Token
   • sendgrid_api_key.txt -> Your SendGrid API key

3. FLEET MANAGEMENT:
   • samsara_api_token.txt -> Your Samsara API token
   • samsara_webhook_secret.txt -> Your Samsara webhook secret

4. DATA INTEGRATION:
   • airtable_api_key.txt -> Your Airtable API key
   • mapbox_access_token.txt -> Your Mapbox access token

5. AWS SERVICES (if used):
   • aws_access_key_id.txt -> Your AWS Access Key ID
   • aws_secret_access_key.txt -> Your AWS Secret Access Key

EXAMPLE: Replace placeholder in stripe_secret_key.txt
  echo "sk_live_51HyL..." > secrets/stripe_secret_key.txt
EOF
    
    echo
    warn "⚠️  DO NOT commit actual secrets to version control!"
    echo
}

# Main execution
main() {
    info "Starting secure secret initialization..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create backup if secrets already exist
    create_backup
    
    # Create directory structure
    create_directories
    
    # Generate all secrets
    generate_database_secrets
    generate_jwt_secrets
    generate_encryption_secrets
    generate_admin_secrets
    create_external_placeholders
    
    # Validate everything
    if validate_secrets; then
        display_summary
        display_external_secrets_guide
        
        info "🎉 Secret initialization completed successfully!"
        info "📄 Full log available at: $LOG_FILE"
        
        exit 0
    else
        error "❌ Secret initialization failed - check validation errors above"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    # Check for required tools
    if ! command -v openssl >/dev/null 2>&1; then
        missing_tools+=("openssl")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
Waste Management System - Secure Secret Initialization

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help      Show this help message
    -v, --validate  Only validate existing secrets (don't generate new ones)
    -b, --backup    Create backup of existing secrets only

EXAMPLES:
    # Generate all secrets for production deployment
    $0

    # Validate existing secrets
    $0 --validate

    # Create backup only
    $0 --backup

DESCRIPTION:
    This script generates cryptographically secure secrets for the waste management
    platform, including database credentials, JWT key pairs, encryption keys, and
    administrative passwords.

    Generated secrets are stored in the 'secrets/' directory with secure permissions
    (600) and can be used with Docker Secrets or HashiCorp Vault.

FILES CREATED:
    secrets/db_password.txt              - PostgreSQL password
    secrets/redis_password.txt           - Redis password
    secrets/jwt_private_key              - JWT private key (RS256)
    secrets/jwt_public_key               - JWT public key (RS256)
    secrets/jwt_refresh_private_key      - JWT refresh private key
    secrets/jwt_refresh_public_key       - JWT refresh public key
    secrets/encryption_key.txt           - AES-256 encryption key
    secrets/session_secret.txt           - Session secret key
    secrets/redis_commander_password.txt - Redis Commander password
    secrets/pgadmin_password.txt         - pgAdmin password
    secrets/grafana_password.txt         - Grafana password
    secrets/*_secret_key.txt             - External service placeholders

SECURITY:
    • All secret files are created with 600 permissions (owner read/write only)
    • Secrets directory has 700 permissions (owner access only)
    • RSA keys use 2048-bit encryption
    • Passwords use cryptographically secure random generation
    • Full audit log maintained in logs/secret-setup.log

EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -v|--validate)
        info "Validating existing secrets only..."
        if validate_secrets; then
            success "All secrets are valid"
            exit 0
        else
            error "Secret validation failed"
            exit 1
        fi
        ;;
    -b|--backup)
        create_backup
        exit 0
        ;;
    "")
        # No arguments - proceed with main execution
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Check prerequisites and run main function
check_prerequisites
main