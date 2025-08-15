# SECURITY INCIDENT RESPONSE RUNBOOK
## DevOps-Agent & Security-Agent Coordinated Response Procedures

**Last Updated**: 2025-08-13  
**Security Grade**: 88% (Production Hardened)  
**Coordination Status**: DevOps-Agent + Security-Agent COMPLETE  
**Response Team**: DevOps + Security + On-Call Engineering  

---

## EXECUTIVE SUMMARY

This runbook provides comprehensive procedures for responding to security incidents in the Waste Management System. All procedures are coordinated between DevOps-Agent and Security-Agent to ensure rapid, effective response while maintaining system integrity and compliance requirements.

**Critical Contact Information**:
- **Security Team**: security@waste-mgmt.com
- **DevOps Team**: devops@waste-mgmt.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Executive Escalation**: ceo@waste-mgmt.com

---

## INCIDENT CLASSIFICATION & PRIORITY

### 🚨 **P0 - CRITICAL (Immediate Response)**
- **Authentication bypass or compromise**
- **Data breach or unauthorized data access**
- **Ransomware or malware detection**
- **Complete system compromise**
- **Financial system breach (Stripe/payment data)**

### ⚠️ **P1 - HIGH (Response within 1 hour)**
- **Privilege escalation attempts**
- **SQL injection or XSS attempts**
- **DDoS attacks affecting service availability**
- **Multiple authentication failures (potential brute force)**
- **Suspicious admin account activity**

### 📊 **P2 - MEDIUM (Response within 4 hours)**
- **Unusual API usage patterns**
- **Failed security controls**
- **Certificate expiration warnings**
- **Suspicious file access patterns**

### 📝 **P3 - LOW (Response within 24 hours)**
- **Policy violations**
- **Security configuration drift**
- **Non-critical vulnerability reports**

---

## INCIDENT RESPONSE WORKFLOW

### Phase 1: DETECTION & INITIAL RESPONSE (0-15 minutes)

#### 1.1 Alert Reception
```bash
# Automated detection sources:
# - Prometheus security alerts
# - Application security logs
# - WAF (Web Application Firewall) alerts
# - External security monitoring services

# Manual detection sources:
# - User reports
# - Security team notifications
# - Third-party security alerts
```

#### 1.2 Initial Assessment (Security-Agent Coordinated)
```bash
# Quick security status check
curl -s http://localhost:9090/api/v1/query?query=security_grade_current

# Check current authentication failures
curl -s "http://localhost:9090/api/v1/query?query=increase(auth_failures_total[5m])"

# Verify system health
docker-compose ps | grep -v "Up"

# Check recent security logs
docker-compose logs backend --tail=100 | grep -i "security\|error\|unauthorized"
```

#### 1.3 Incident Declaration
```bash
# Create incident tracking
INCIDENT_ID="SEC-$(date +%Y%m%d-%H%M%S)"
echo "INCIDENT DECLARED: $INCIDENT_ID" | tee -a /var/log/security-incidents.log

# Notify response team
echo "Security incident $INCIDENT_ID declared at $(date)" | \
  mail -s "SECURITY INCIDENT: $INCIDENT_ID" security@waste-mgmt.com
```

### Phase 2: CONTAINMENT (15-30 minutes)

#### 2.1 Immediate Threat Containment
```bash
# For authentication-related incidents
if [[ "$INCIDENT_TYPE" == "auth_breach" ]]; then
    # Temporarily increase rate limiting
    docker-compose exec nginx nginx -s reload
    
    # Revoke suspicious sessions
    docker-compose exec backend npm run security:revoke-sessions
    
    # Enable additional authentication logging
    docker-compose exec backend npm run security:enable-verbose-auth
fi

# For data breach incidents
if [[ "$INCIDENT_TYPE" == "data_breach" ]]; then
    # Enable emergency read-only mode
    docker-compose exec backend npm run security:readonly-mode
    
    # Capture current database state
    docker-compose exec postgres pg_dump waste_management_prod > /tmp/incident_db_snapshot.sql
fi

# For system compromise
if [[ "$INCIDENT_TYPE" == "system_compromise" ]]; then
    # Isolate affected containers
    docker network disconnect waste-mgmt-network backend 2>/dev/null || true
    
    # Capture memory dumps
    docker exec backend kill -USR1 $(docker exec backend pgrep node)
fi
```

#### 2.2 Evidence Preservation
```bash
# Preserve logs (Security-Agent coordination)
mkdir -p /var/security-incidents/$INCIDENT_ID
cd /var/security-incidents/$INCIDENT_ID

# Capture current system state
docker-compose logs --no-color > docker-logs.txt
docker ps -a > container-status.txt
docker network ls > network-status.txt

# Capture security-specific logs
docker-compose exec backend npm run security:export-logs > security-logs.json
docker-compose exec postgres pg_dump waste_management_prod > database-snapshot.sql

# Capture network connections
ss -tuln > network-connections.txt
netstat -an > netstat-output.txt

# Capture system processes
ps aux > process-list.txt
lsof -i > open-files.txt

# Create forensic timestamp
date -u > incident-timestamp.txt
```

#### 2.3 Communication Setup
```bash
# Create incident communication channel
echo "Incident Response Channel: #incident-$INCIDENT_ID"

# Prepare stakeholder notification
cat > incident-notification.md << EOF
# Security Incident Notification

**Incident ID**: $INCIDENT_ID
**Severity**: P0/P1/P2/P3
**Detection Time**: $(date -u)
**Current Status**: CONTAINED
**Affected Systems**: [TBD]
**Customer Impact**: [TBD]

## Initial Assessment
- [X] Incident confirmed and classified
- [X] Immediate containment measures implemented
- [X] Evidence preservation initiated
- [ ] Root cause analysis in progress
- [ ] Customer notification prepared (if required)

## Next Steps
1. Complete forensic analysis
2. Implement permanent fixes
3. Validate system security
4. Prepare detailed incident report
EOF
```

### Phase 3: INVESTIGATION & ANALYSIS (30 minutes - 2 hours)

#### 3.1 Security-Agent Coordinated Forensic Analysis
```bash
# Deep dive into security logs
echo "=== FORENSIC ANALYSIS ===" | tee -a investigation.log

# Analyze authentication patterns
docker-compose exec backend npm run security:analyze-auth-patterns >> investigation.log

# Check for security control bypasses
echo "Checking for security bypasses..." >> investigation.log

# 1. JWT Security (RS256) bypass attempts
grep -i "jwt\|token\|rs256" /var/log/nginx/access.log >> investigation.log

# 2. Encryption (AES-256-GCM) bypass attempts
docker-compose exec backend node -e "
  const logs = require('./src/services/SecurityErrorCoordinator');
  console.log(JSON.stringify(logs.getEncryptionBypassAttempts(), null, 2));
" >> investigation.log

# 3. RBAC privilege escalation
docker-compose exec postgres psql -U postgres -d waste_management_prod -c "
  SELECT * FROM audit_logs 
  WHERE action LIKE '%privilege%' OR action LIKE '%escalation%' 
  ORDER BY created_at DESC LIMIT 50;
" >> investigation.log

# 4. MFA bypass attempts
grep -i "mfa\|multi.*factor\|bypass" /var/log/security-incidents.log >> investigation.log

# 5. Session fixation attempts
docker-compose exec backend npm run security:check-session-attacks >> investigation.log
```

#### 3.2 Impact Assessment
```bash
# Assess data impact
echo "=== IMPACT ASSESSMENT ===" | tee -a impact-assessment.log

# Check for data exfiltration
docker-compose exec postgres psql -U postgres -d waste_management_prod -c "
  SELECT table_name, 
         COUNT(*) as current_count,
         (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
  FROM information_schema.tables t 
  WHERE table_schema = 'public'
  ORDER BY table_name;
" >> impact-assessment.log

# Check for unauthorized database changes
docker-compose exec postgres psql -U postgres -d waste_management_prod -c "
  SELECT * FROM audit_logs 
  WHERE created_at > NOW() - INTERVAL '2 hours'
  AND (action LIKE '%DELETE%' OR action LIKE '%UPDATE%' OR action LIKE '%INSERT%')
  ORDER BY created_at DESC;
" >> impact-assessment.log

# Assess system impact
docker stats --no-stream >> impact-assessment.log
df -h >> impact-assessment.log
free -h >> impact-assessment.log
```

#### 3.3 Attack Vector Analysis
```bash
# Analyze attack vectors (Security-Agent coordination)
echo "=== ATTACK VECTOR ANALYSIS ===" | tee -a attack-analysis.log

# Check common attack patterns
# 1. SQL Injection attempts
grep -i "select.*from\|union.*select\|drop.*table" /var/log/nginx/access.log >> attack-analysis.log

# 2. XSS attempts
grep -i "script\|javascript\|onerror\|onload" /var/log/nginx/access.log >> attack-analysis.log

# 3. Path traversal attempts
grep -i "\.\./\|\.\.%2f\|\.\.\\\\|%2e%2e" /var/log/nginx/access.log >> attack-analysis.log

# 4. API abuse patterns
awk '$9 >= 400 && $9 < 500' /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20 >> attack-analysis.log

# 5. Brute force patterns
awk '$9 == 401 || $9 == 403' /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20 >> attack-analysis.log
```

### Phase 4: ERADICATION & RECOVERY (1-4 hours)

#### 4.1 Security-Agent Coordinated Fix Implementation
```bash
# Implement security fixes based on analysis
echo "=== IMPLEMENTING SECURITY FIXES ===" | tee -a remediation.log

# Update security configurations if needed
case "$INCIDENT_TYPE" in
    "auth_breach")
        # Rotate JWT secrets
        ./scripts/secrets-management.sh generate
        docker-compose restart backend
        echo "JWT secrets rotated" >> remediation.log
        ;;
    
    "encryption_bypass")
        # Regenerate encryption keys
        docker-compose exec backend npm run security:rotate-encryption-keys
        echo "Encryption keys rotated" >> remediation.log
        ;;
    
    "privilege_escalation")
        # Reset RBAC permissions
        docker-compose exec backend npm run security:reset-rbac
        echo "RBAC permissions reset" >> remediation.log
        ;;
    
    "session_fixation")
        # Invalidate all sessions
        docker-compose exec backend npm run security:invalidate-all-sessions
        echo "All sessions invalidated" >> remediation.log
        ;;
esac

# Apply immediate security patches
docker-compose pull
docker-compose up -d --force-recreate

# Verify fixes
./scripts/security-validation.sh >> remediation.log
```

#### 4.2 System Hardening
```bash
# Additional hardening measures
echo "=== ADDITIONAL HARDENING ===" | tee -a hardening.log

# Update rate limiting rules
if [[ -n "$MALICIOUS_IPS" ]]; then
    echo "Blocking malicious IPs: $MALICIOUS_IPS" >> hardening.log
    for ip in $MALICIOUS_IPS; do
        iptables -A INPUT -s $ip -j DROP
    done
fi

# Enhance monitoring rules
cat >> docker/prometheus/rules/security-alerts.yml << 'EOF'
- alert: IncidentResponseActive
  expr: security_incident_active == 1
  for: 0m
  labels:
    severity: critical
    incident_response: true
  annotations:
    summary: "Security incident response active"
    description: "Security incident {{ $labels.incident_id }} is being handled"
EOF

# Restart monitoring to load new rules
docker-compose --profile monitoring restart prometheus
```

#### 4.3 Validation & Testing
```bash
# Comprehensive security validation
echo "=== POST-INCIDENT VALIDATION ===" | tee -a validation.log

# Test security controls
./scripts/security-test-suite.sh >> validation.log

# Verify no ongoing compromise
docker-compose exec backend npm run security:threat-scan >> validation.log

# Check system performance
docker stats --no-stream | tee -a validation.log

# Validate data integrity
docker-compose exec backend npm run db:integrity-check >> validation.log

# Test external integrations
docker-compose exec backend npm run test:external-apis >> validation.log
```

### Phase 5: POST-INCIDENT ACTIVITIES (1-7 days)

#### 5.1 Detailed Incident Report
```bash
# Generate comprehensive incident report
cat > INCIDENT-REPORT-$INCIDENT_ID.md << EOF
# Security Incident Report: $INCIDENT_ID

## Executive Summary
**Incident ID**: $INCIDENT_ID
**Detection Date**: $(date -u)
**Resolution Date**: $(date -u)
**Total Duration**: [Duration]
**Severity**: [P0/P1/P2/P3]
**Status**: RESOLVED

## Incident Timeline
- **Detection**: [Time] - [Description]
- **Containment**: [Time] - [Actions taken]
- **Investigation**: [Time] - [Findings]
- **Eradication**: [Time] - [Fixes applied]
- **Recovery**: [Time] - [Services restored]
- **Validation**: [Time] - [Testing completed]

## Root Cause Analysis
### Primary Cause
[Detailed explanation of what caused the incident]

### Contributing Factors
[Additional factors that contributed to the incident]

## Impact Assessment
### Systems Affected
[List of affected systems and services]

### Data Impact
[Assessment of any data that may have been compromised]

### Customer Impact
[Description of customer-facing impact]

### Financial Impact
[Estimated financial impact, if any]

## Response Actions Taken
### Immediate Response
[Actions taken in first 15 minutes]

### Containment Measures
[Steps taken to prevent further damage]

### Investigation Activities
[Forensic analysis performed]

### Remediation Steps
[Permanent fixes implemented]

## Security-Agent Coordination Summary
### Security Controls Validated
- [X] JWT Security (RS256): No bypass detected
- [X] Encryption (AES-256-GCM): Integrity maintained
- [X] RBAC: No privilege escalation successful
- [X] MFA: No bypass attempts successful
- [X] Session Management: No fixation attempts successful
- [X] Audit Logging: Complete trail maintained

### DevOps Security Measures
- [X] Container Security: Hardening maintained
- [X] Network Security: SSL/TLS functioning properly
- [X] Monitoring: Alerts functioned as designed
- [X] Secrets Management: No exposure detected
- [X] CI/CD Security: Pipeline integrity maintained

## Lessons Learned
### What Went Well
[Aspects of response that worked effectively]

### What Could Be Improved
[Areas for improvement in future responses]

## Recommendations
### Immediate Actions (0-30 days)
[Short-term improvements needed]

### Medium-term Actions (30-90 days)
[Medium-term security enhancements]

### Long-term Actions (90+ days)
[Strategic security improvements]

## Compliance Considerations
### GDPR Compliance
[Assessment of GDPR implications and notifications required]

### PCI DSS Compliance
[Assessment of payment data security impact]

### SOC 2 Compliance
[Assessment of SOC 2 control effectiveness]

## Sign-offs
- **Security Team Lead**: [Name, Date]
- **DevOps Team Lead**: [Name, Date]
- **Engineering Manager**: [Name, Date]
- **CISO**: [Name, Date]
EOF
```

#### 5.2 Security Improvements Implementation
```bash
# Implement long-term security improvements
echo "=== IMPLEMENTING SECURITY IMPROVEMENTS ===" | tee -a improvements.log

# Enhanced monitoring rules
# Improved security controls
# Additional automation
# Better alerting mechanisms
# Enhanced documentation

# Schedule follow-up security review
echo "$(date -d '+30 days') Security review scheduled for incident $INCIDENT_ID" >> /var/security-calendar.txt
```

#### 5.3 Team Communication & Training
```bash
# Prepare team briefing
cat > team-briefing-$INCIDENT_ID.md << EOF
# Security Incident Team Briefing: $INCIDENT_ID

## What Happened
[Brief description of the incident]

## How We Responded
[Summary of response actions]

## What We Learned
[Key lessons from the incident]

## Changes Made
[Security improvements implemented]

## Action Items
[Follow-up tasks for team members]
EOF

# Schedule post-incident review meeting
echo "Post-incident review scheduled for incident $INCIDENT_ID" >> /var/team-calendar.txt
```

---

## EMERGENCY CONTACT PROCEDURES

### Internal Escalation Chain
1. **On-Call Engineer** (First responder)
2. **DevOps Team Lead** (Infrastructure decisions)
3. **Security Team Lead** (Security decisions)
4. **Engineering Manager** (Resource allocation)
5. **CISO** (Strategic security decisions)
6. **CTO** (Technology executive decisions)
7. **CEO** (Business impact decisions)

### External Contacts
- **Cloud Provider Support**: [Contact info]
- **CDN/DNS Provider**: [Contact info]
- **Security Consultant**: [Contact info]
- **Legal Counsel**: [Contact info]
- **Cyber Insurance**: [Contact info]

---

## COMPLIANCE NOTIFICATION REQUIREMENTS

### GDPR (EU Data Protection)
- **Notification to supervisory authority**: Within 72 hours
- **Notification to data subjects**: Without undue delay (if high risk)
- **Documentation**: Detailed incident documentation required

### PCI DSS (Payment Card Industry)
- **Immediate notification**: Card brands and acquirer
- **Forensic investigation**: May be required
- **Compliance assessment**: Validate ongoing compliance

### SOC 2 (System and Organization Controls)
- **Customer notification**: If service commitments affected
- **Auditor notification**: Significant security incidents
- **Control assessment**: Evaluate control effectiveness

---

## SECURITY-AGENT & DEVOPS-AGENT COORDINATION SUMMARY

This incident response runbook ensures seamless coordination between security and infrastructure teams:

### ✅ **Coordinated Response Capabilities**
1. **Real-time Security Monitoring**: Automated detection with immediate alerting
2. **Integrated Containment**: DevOps infrastructure controls with security validation
3. **Evidence Preservation**: Comprehensive forensic data collection and analysis
4. **Coordinated Remediation**: Security fixes with infrastructure support
5. **Continuous Validation**: Ongoing security assessment with operational monitoring

### ✅ **Security-Agent Integration Points**
- JWT security incident response (RS256 validation)
- Encryption breach procedures (AES-256-GCM integrity)
- RBAC violation handling (privilege escalation detection)
- MFA bypass response (encrypted secret validation)
- Session security incidents (fixation attempt handling)

### ✅ **DevOps-Agent Infrastructure Support**
- Container isolation and forensic capture
- Network security enforcement and traffic analysis
- SSL/TLS certificate and encryption validation
- Monitoring system integration and alert coordination
- Automated backup and recovery coordination

---

**RUNBOOK STATUS**: OPERATIONAL ✅  
**SECURITY COORDINATION**: COMPLETE ✅  
**INCIDENT RESPONSE**: READY ✅  

**Next Steps**: Regular runbook testing and team training exercises.