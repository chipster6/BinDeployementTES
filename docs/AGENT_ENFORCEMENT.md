# Agent Enforcement Layer

## Overview
This document describes the hard enforcement mechanisms that turn the agent steering charter into enforceable gates.

## Enforcement Components

### 1. Policy Enforcement Script (`scripts/policy-enforce.sh`)
- **LOC Cap**: Blocks commits exceeding 300 lines of changes
- **Scope Enforcement**: Validates agent changes stay within allowed paths
- **Agent-Specific Rules**: Different scope restrictions per agent type

### 2. Git Hooks (`.husky/pre-commit`)
- Runs policy enforcement before every commit
- Prevents commits that violate agent boundaries
- Must pass before any other hooks run

### 3. GitHub Protection (`.github/CODEOWNERS`)
- Requires architecture review for contract changes
- Protects critical system boundaries
- Prevents unauthorized OpenAPI/schema drift

### 4. CI Contract Guard (`.github/workflows/contract-guard.yml`)
- Validates contract version bumps
- Fails PR if contracts change without version update
- Enforces semantic versioning for API changes

### 5. Kiro Integration (`.kiro/steering.yaml`)
- Canonical agent scope definitions
- Pre-commit and pre-push hook specifications
- Policy configuration for IDE integration

### 6. PR Template (`.github/pull_request_template.md`)
- Enforces checklist compliance
- Validates hook execution
- Confirms scope adherence

## Agent Setup

Set the agent type in your terminal before working:

```bash
# Architecture Agent
export AGENT=architecture

# DB Architect Agent  
export AGENT=db_architect

# External API Agent
export AGENT=external_api

# Ingestion Agent
export AGENT=ingestion

# Orders Agent
export AGENT=orders

# Eventing/Observability Agent
export AGENT=eventing_obs
```

## Enforcement Flow

1. **Pre-Commit**: Policy script validates scope and LOC limits
2. **Commit**: Only proceeds if policy passes
3. **Push**: Additional hooks run based on agent type
4. **PR**: Template checklist ensures compliance
5. **CI**: Contract guard validates schema changes
6. **Review**: CODEOWNERS enforces architecture review

## Bypassing (Emergency Only)

To bypass enforcement in emergencies:
```bash
# Temporary bypass (single commit)
AGENT=human git commit -m "emergency: bypass enforcement"

# Skip hooks entirely (use sparingly)
git commit --no-verify -m "emergency: skip all hooks"
```

## Troubleshooting

### Policy Script Fails
- Check `AGENT` environment variable is set correctly
- Verify file paths match agent scope patterns
- Ensure LOC count is under 300 lines

### Hook Execution Issues
- Verify script permissions: `chmod +x scripts/policy-enforce.sh`
- Check husky installation: `npx husky install`
- Validate git hooks are executable

### Scope Violations
- Review agent scope definitions in `.kiro/steering.yaml`
- Ensure changes align with agent responsibilities
- Consider splitting changes across multiple agents

## Monitoring

The enforcement layer provides several monitoring points:
- Pre-commit output shows policy validation results
- CI logs show contract guard execution
- PR templates track compliance status
- Git history shows agent attribution via commit messages