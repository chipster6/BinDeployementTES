# Waste Management System - Secrets Management Guide

## Overview

This document provides comprehensive guidance for implementing enterprise-grade secrets management in the Waste Management System using Docker Secrets and HashiCorp Vault integration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Secrets Implementation](#docker-secrets-implementation)
3. [HashiCorp Vault Integration](#hashicorp-vault-integration)
4. [Production Deployment](#production-deployment)
5. [Secret Rotation Policies](#secret-rotation-policies)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Security Levels

The Waste Management System implements a multi-tier secrets management strategy:

1. **Development Environment**: Environment variables with secure fallbacks
2. **Production Environment**: Docker Secrets for secure file-based secret delivery
3. **Enterprise Environment**: HashiCorp Vault for dynamic secrets and automated rotation

### Security Components

- **Database Credentials**: PostgreSQL and Redis passwords
- **JWT Authentication**: RS256 private/public key pairs for access and refresh tokens
- **Encryption Keys**: AES-256 encryption key and session secrets
- **External Service APIs**: Stripe, Twilio, SendGrid, Samsara, Airtable, Mapbox, AWS
- **Administrative Interfaces**: Redis Commander, pgAdmin, Grafana passwords

## Docker Secrets Implementation

### Quick Start

1. **Generate Secrets**:
   ```bash
   # Run the secure secret initialization script
   ./scripts/setup-secrets.sh
   ```

2. **Deploy with Docker Secrets**:
   ```bash
   # Use the production configuration with secrets
   docker-compose -f docker-compose.secrets.yml up -d
   ```

### Secret Files Structure

```
secrets/
├── db_password.txt                 # PostgreSQL password
├── redis_password.txt              # Redis password
├── jwt_private_key                 # JWT private key (RS256)
├── jwt_public_key                  # JWT public key (RS256)
├── jwt_refresh_private_key         # JWT refresh private key
├── jwt_refresh_public_key          # JWT refresh public key
├── encryption_key.txt              # AES-256 encryption key
├── session_secret.txt              # Session secret key
├── stripe_secret_key.txt           # Stripe API secret key
├── stripe_webhook_secret.txt       # Stripe webhook secret
├── twilio_auth_token.txt           # Twilio authentication token
├── sendgrid_api_key.txt           # SendGrid API key
├── samsara_api_token.txt          # Samsara API token
├── samsara_webhook_secret.txt     # Samsara webhook secret
├── airtable_api_key.txt           # Airtable API key
├── mapbox_access_token.txt        # Mapbox access token
├── aws_access_key_id.txt          # AWS access key ID
├── aws_secret_access_key.txt      # AWS secret access key
├── redis_commander_password.txt   # Redis Commander password
├── pgadmin_password.txt           # pgAdmin password
└── grafana_password.txt           # Grafana password
```

### Configuration Loading

The system uses a cascading configuration approach:

1. **Docker Secrets** (Production): `/run/secrets/secret_name`
2. **Local Files** (Development): `./secrets/secret_name.txt`
3. **Environment Variables** (Fallback): `$SECRET_NAME`

## HashiCorp Vault Integration

### Vault Configuration

#### Prerequisites

```bash
# Install HashiCorp Vault
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault

# Install Node.js Vault client
npm install node-vault
```

#### Environment Variables

```bash
export VAULT_ADDR="https://vault.waste-mgmt.local:8200"
export VAULT_TOKEN="your-vault-token"
export VAULT_ROLE_ID="your-approle-role-id"
export VAULT_SECRET_ID="your-approle-secret-id"
export VAULT_NAMESPACE="waste-mgmt"  # For Vault Enterprise
```

### Vault Secrets Engines

#### 1. Key-Value Secrets Engine (KV v2)

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Configure versioning
vault write secret/config max_versions=10 delete_version_after="30d"
```

#### 2. Database Secrets Engine

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL
vault write database/config/waste-mgmt-postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/waste_management" \
    allowed_roles="waste-mgmt-db" \
    username="vault_admin" \
    password="vault_admin_password"

# Create database role
vault write database/roles/waste-mgmt-db \
    db_name=waste-mgmt-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="24h" \
    max_ttl="72h"
```

#### 3. AWS Secrets Engine

```bash
# Enable AWS secrets engine
vault secrets enable aws

# Configure AWS credentials
vault write aws/config/root \
    access_key="YOUR_AWS_ACCESS_KEY" \
    secret_key="YOUR_AWS_SECRET_KEY" \
    region="us-east-1"

# Create AWS role
vault write aws/roles/waste-mgmt-role \
    credential_type=iam_user \
    policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::waste-mgmt-*/*"
    }
  ]
}
EOF
```

### Authentication Methods

#### AppRole Authentication

```bash
# Enable AppRole auth method
vault auth enable approle

# Create AppRole
vault write auth/approle/role/waste-mgmt-app \
    token_policies="waste-mgmt-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    bind_secret_id=true

# Get role ID and secret ID
ROLE_ID=$(vault read -field=role_id auth/approle/role/waste-mgmt-app/role-id)
SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/waste-mgmt-app/secret-id)
```

## Production Deployment

### 1. Generate Secrets

```bash
# Generate all required secrets
./scripts/setup-secrets.sh

# Validate generated secrets
./scripts/setup-secrets.sh --validate
```

### 2. Configure External Services

Replace placeholder values with actual API keys:

```bash
# Stripe
echo "sk_live_51HyL..." > secrets/stripe_secret_key.txt
echo "whsec_1M5B..." > secrets/stripe_webhook_secret.txt

# Twilio
echo "a1b2c3d4e5f6..." > secrets/twilio_auth_token.txt

# SendGrid
echo "SG.a1b2c3..." > secrets/sendgrid_api_key.txt

# AWS
echo "AKIAIOSFODNN7EXAMPLE" > secrets/aws_access_key_id.txt
echo "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" > secrets/aws_secret_access_key.txt
```

### 3. Deploy Application

```bash
# Production deployment with Docker Secrets
docker-compose -f docker-compose.secrets.yml up -d --profile production

# Or with monitoring
docker-compose -f docker-compose.secrets.yml up -d --profile production --profile monitoring
```

### 4. Verify Deployment

```bash
# Check service health
curl -f http://localhost:3001/health

# Check authentication
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@waste-mgmt.com","password":"admin123"}'
```

## Secret Rotation Policies

### Automated Rotation Schedule

| Secret Type | Rotation Interval | Method |
|-------------|-------------------|--------|
| Database Credentials | 30 days | Vault Dynamic Secrets |
| JWT Keys | 90 days | Automated Key Generation |
| Encryption Keys | 365 days | Manual (with data re-encryption) |
| External API Keys | As required by service | Manual coordination |
| Admin Passwords | 90 days | Automated generation |

### Vault Rotation Commands

```bash
# Automated rotation based on schedule
./scripts/vault-rotation.sh auto

# Force database credential rotation
./scripts/vault-rotation.sh database --force

# Rotate JWT keys
./scripts/vault-rotation.sh jwt

# Emergency rotation (all secrets)
./scripts/vault-rotation.sh emergency

# Rollback to previous version
./scripts/vault-rotation.sh rollback jwt 1
```

### Database Credential Rotation

Vault can automatically generate and rotate database credentials:

```bash
# Generate new credentials
vault read database/creds/waste-mgmt-db

# Example output:
# Key                Value
# lease_id           database/creds/waste-mgmt-db/2f87b5d3-...
# lease_duration     24h
# lease_renewable    true
# password           A1a-4eP9t8M7s2D6
# username           v-approle-waste-mgmt-db-2Kj7s9D4Fh
```

### JWT Key Rotation

Zero-downtime JWT key rotation:

1. Generate new key pair
2. Update Vault with new keys
3. Application loads new keys on restart
4. Old tokens remain valid until expiry
5. New tokens signed with new keys

## Security Best Practices

### File Permissions

```bash
# Secrets directory
chmod 700 secrets/

# Secret files
chmod 600 secrets/*.txt
chmod 600 secrets/jwt_*

# Scripts
chmod +x scripts/*.sh
```

### Network Security

- Use TLS 1.2+ for all Vault communication
- Implement network segmentation for Vault access
- Use mutual TLS (mTLS) for service-to-service communication
- Enable audit logging for all secret access

### Access Control

- Implement least privilege access
- Use time-bounded tokens
- Regular access reviews
- Multi-factor authentication for human access

### Monitoring and Alerting

```bash
# Set up alerts for:
# - Failed secret rotations
# - Vault authentication failures
# - Unusual secret access patterns
# - Secret expiration warnings
```

## HashiCorp Vault Deployment

### Docker Deployment

```yaml
version: '3.8'
services:
  vault:
    image: vault:latest
    container_name: vault
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: "dev-only-token"
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    cap_add:
      - IPC_LOCK
    volumes:
      - vault-data:/vault/data
      - ./vault/config:/vault/config
    command: ["vault", "server", "-config=/vault/config/vault.hcl"]

volumes:
  vault-data:
```

### Production Vault Configuration

```hcl
# vault.hcl
storage "postgresql" {
  connection_url = "postgres://vault:vault_password@postgres:5432/vault?sslmode=require"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
}

ui = true
api_addr = "https://vault.waste-mgmt.local:8200"
cluster_addr = "https://vault.waste-mgmt.local:8201"
```

## Troubleshooting

### Common Issues

#### 1. Secret File Not Found

```bash
# Check secret file exists and has correct permissions
ls -la secrets/
cat secrets/db_password.txt

# Regenerate if missing
./scripts/setup-secrets.sh
```

#### 2. Docker Secrets Access Denied

```bash
# Check container has access to secrets
docker exec waste-mgmt-backend ls -la /run/secrets/

# Verify secret is mounted
docker inspect waste-mgmt-backend | grep -A 5 "Secrets"
```

#### 3. Vault Authentication Failure

```bash
# Check Vault status
vault status

# Verify authentication
vault auth -method=approle role_id="$ROLE_ID" secret_id="$SECRET_ID"

# Check token
vault token lookup
```

#### 4. JWT Key Format Error

```bash
# Validate JWT key format
openssl rsa -in secrets/jwt_private_key -check -noout
openssl rsa -in secrets/jwt_public_key -pubin -check -noout

# Regenerate if invalid
./scripts/setup-secrets.sh
```

### Debugging Commands

```bash
# Check application secret loading
docker-compose logs backend | grep -i secret

# Validate Docker Secrets configuration
docker-compose config

# Test Vault connectivity
vault status
vault kv list secret/

# Check secret rotation logs
tail -f logs/vault-rotation.log
```

### Emergency Procedures

#### 1. Compromise Response

```bash
# Emergency secret rotation
./scripts/vault-rotation.sh emergency

# Revoke all active sessions
# (Implementation depends on session management)

# Update external service keys
# (Manual process with each provider)
```

#### 2. Vault Outage

```bash
# Fallback to Docker Secrets
export VAULT_ADDR=""

# Restart application to use fallback
docker-compose restart backend

# Monitor application logs
docker-compose logs -f backend
```

## Integration Examples

### Application Code Integration

```typescript
// src/config/index.ts
import { initializeSecrets } from './secrets.config';
import { initializeVaultService } from './vault.config';

export async function initializeConfiguration() {
  // Load secrets from Docker Secrets or environment
  const secrets = initializeSecrets();
  
  // Initialize Vault if available
  if (process.env.VAULT_ADDR) {
    const vaultService = await initializeVaultService();
    // Use Vault for dynamic secrets
  }
  
  return { secrets };
}
```

### Middleware Integration

```typescript
// src/middleware/vault-auth.ts
import { HashiCorpVaultService } from '@/config/vault.config';

export const vaultAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Refresh database credentials if near expiry
  const dbCredentials = await vaultService.generateDatabaseCredentials('waste-mgmt-db');
  
  // Update database connection with fresh credentials
  updateDatabaseConnection(dbCredentials);
  
  next();
};
```

## Compliance and Audit

### Audit Requirements

- All secret access must be logged
- Regular access reviews (quarterly)
- Secret rotation compliance (monthly reports)
- Incident response procedures
- Backup and recovery testing

### Compliance Standards

- **SOC 2 Type II**: Secure secret management and access controls
- **PCI DSS**: Encryption key management for payment data
- **GDPR**: Data protection key management
- **HIPAA**: Secure PHI encryption key handling (if applicable)

## Support and Resources

### Documentation

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Node.js Vault Client](https://github.com/kr1sp1n/node-vault)

### Monitoring

- Vault audit logs: `/vault/logs/audit.log`
- Application logs: `logs/secret-setup.log`, `logs/vault-rotation.log`
- System metrics: Prometheus metrics for secret access patterns

### Emergency Contacts

- **Security Team**: security@waste-mgmt.com
- **DevOps Team**: devops@waste-mgmt.com
- **On-call Engineer**: +1-555-ONCALL (555-662-255)

---

**Last Updated**: 2025-08-15  
**Version**: 1.0.0  
**Reviewed By**: Security & Compliance Specialist