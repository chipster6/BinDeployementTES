# WASTE MANAGEMENT SYSTEM - OPERATIONAL RUNBOOK

## TIER 1 CRITICAL INFRASTRUCTURE - OPERATIONAL PROCEDURES

### EXECUTIVE SUMMARY
This runbook provides operational procedures for the $2M+ MRR waste management system infrastructure. All procedures are designed for 99.9% uptime requirements and emergency response.

---

## EMERGENCY RESPONSE PROCEDURES

### 🚨 CRITICAL SERVICE DOWN

#### PostgreSQL Database Down
```bash
# Immediate Response (< 2 minutes)
1. Check service status:
   docker-compose ps postgres
   docker-compose logs postgres

2. Restart database:
   docker-compose restart postgres

3. Verify connectivity:
   docker-compose exec postgres pg_isready -U postgres

4. If restart fails:
   ./scripts/production-deploy.sh rollback
```

#### Backend API Down
```bash
# Immediate Response (< 1 minute)
1. Check service health:
   curl -f http://localhost:3001/health

2. Check container status:
   docker-compose ps backend
   docker-compose logs --tail=50 backend

3. Restart backend:
   docker-compose restart backend

4. Monitor recovery:
   watch curl -f http://localhost:3001/health
```

#### Redis Cache Down
```bash
# Immediate Response (< 1 minute)
1. Check Redis connectivity:
   docker-compose exec redis redis-cli ping

2. Restart Redis:
   docker-compose restart redis

3. Verify sessions restored:
   curl -f http://localhost:3001/health/redis
```

### 🔥 BUSINESS CRITICAL ALERTS

#### Payment Processing Failures
**Impact**: Direct revenue loss - $2M+ MRR at risk

```bash
# Immediate Actions (< 30 seconds)
1. Check Stripe service status:
   curl -f http://localhost:3001/health/external-services

2. Review payment logs:
   docker-compose logs backend | grep -i payment | tail -20

3. Notify Finance Team:
   Slack #critical-incidents
   
4. Activate manual payment processing:
   Access admin panel → Payments → Manual Mode
```

#### High Customer Churn Detection
**Impact**: Customer retention crisis

```bash
# Response (< 5 minutes)
1. Check churn metrics:
   curl http://localhost:9090/api/v1/query?query=customer_churn_rate

2. Review customer complaints:
   docker-compose logs backend | grep -i "customer.*error"

3. Notify Customer Success:
   Slack #customer-success
   
4. Generate emergency customer report:
   ./scripts/generate-customer-report.sh --urgent
```

---

## MONITORING & ALERTING

### Health Check Endpoints

| Service | Endpoint | Expected Response | Timeout |
|---------|----------|-------------------|---------|
| Backend API | `http://localhost:3001/health` | `{"status":"healthy"}` | 5s |
| Database | `http://localhost:3001/health/database` | `{"database":{"connected":true}}` | 10s |
| Redis | `http://localhost:3001/health/redis` | `{"redis":{"connected":true}}` | 5s |
| Frontend | `http://localhost:3000/api/health` | `200 OK` | 10s |

### Key Metrics to Monitor

#### System Metrics
```bash
# CPU Usage (Alert if > 80%)
curl -s http://localhost:9090/api/v1/query?query=cpu_usage_percent

# Memory Usage (Alert if > 85%)
curl -s http://localhost:9090/api/v1/query?query=memory_usage_percent

# Disk Space (Alert if < 10% free)
curl -s http://localhost:9090/api/v1/query?query=disk_free_percent
```

#### Business Metrics
```bash
# Active Users (Monitor for drops > 20%)
curl -s http://localhost:9090/api/v1/query?query=active_users_count

# Revenue Processing (Alert on failures)
curl -s http://localhost:9090/api/v1/query?query=payment_success_rate

# API Response Time (Alert if 95th percentile > 2s)
curl -s http://localhost:9090/api/v1/query?query=api_response_time_95th
```

### Grafana Dashboards

#### Production Overview Dashboard
- **URL**: http://localhost:3004/d/production-overview
- **Panels**: System health, API performance, business metrics
- **Refresh**: 30s

#### Database Performance Dashboard
- **URL**: http://localhost:3004/d/database-performance
- **Panels**: Connection pool, query performance, spatial operations
- **Refresh**: 15s

---

## BACKUP & RECOVERY PROCEDURES

### Automated Backup Schedule
```bash
# Daily full backup (2 AM UTC)
0 2 * * * /opt/waste-mgmt/scripts/backup-database.sh

# Hourly incremental backup
0 * * * * /opt/waste-mgmt/scripts/backup-incremental.sh

# Weekly system backup
0 3 * * 0 /opt/waste-mgmt/scripts/backup-full-system.sh
```

### Manual Backup Creation
```bash
# Create immediate backup
./scripts/production-deploy.sh backup

# Backup specific components
docker-compose exec postgres pg_dump -U postgres waste_management > backup_$(date +%Y%m%d_%H%M%S).sql
docker-compose exec redis redis-cli SAVE
```

### Disaster Recovery
```bash
# Complete system recovery
1. Stop all services:
   docker-compose down

2. Restore from backup:
   ./scripts/production-deploy.sh rollback

3. Verify data integrity:
   ./scripts/verify-data-integrity.sh

4. Resume operations:
   ./scripts/production-deploy.sh deploy
```

---

## DEPLOYMENT PROCEDURES

### Production Deployment Checklist

#### Pre-Deployment (30 minutes before)
- [ ] Notify team via Slack #deployments
- [ ] Verify backup completion
- [ ] Check system health dashboard
- [ ] Confirm no critical alerts
- [ ] Review deployment plan

#### Deployment Process
```bash
# Standard deployment
./scripts/production-deploy.sh deploy

# Emergency deployment (skip tests)
SKIP_TESTS=true ./scripts/production-deploy.sh deploy

# Rollback if issues
./scripts/production-deploy.sh rollback
```

#### Post-Deployment (15 minutes after)
- [ ] Verify all health checks pass
- [ ] Check error rates in logs
- [ ] Monitor business metrics
- [ ] Confirm customer functionality
- [ ] Update deployment log

### Rollback Procedures
```bash
# Immediate rollback (< 2 minutes)
./scripts/production-deploy.sh rollback

# Verify rollback success
./scripts/production-deploy.sh health
./scripts/production-deploy.sh smoke-test
```

---

## PERFORMANCE OPTIMIZATION

### Database Performance Tuning
```bash
# Check slow queries
docker-compose exec postgres psql -U postgres -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Analyze table statistics
docker-compose exec postgres psql -U postgres -c "
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;"

# Rebuild indexes if needed
docker-compose exec postgres psql -U postgres -c "REINDEX DATABASE waste_management;"
```

### Redis Performance Monitoring
```bash
# Check memory usage
docker-compose exec redis redis-cli info memory

# Monitor key distribution
docker-compose exec redis redis-cli --scan --pattern "waste_mgmt:*" | head -20

# Check slow operations
docker-compose exec redis redis-cli slowlog get 10
```

### Application Performance
```bash
# Monitor API response times
curl -s http://localhost:9090/api/v1/query?query=api_response_time_histogram

# Check memory leaks
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Review error logs
docker-compose logs backend | grep -i error | tail -20
```

---

## SECURITY PROCEDURES

### Security Monitoring
```bash
# Check authentication failures
docker-compose logs backend | grep -i "authentication failed" | wc -l

# Monitor suspicious activity
docker-compose logs nginx | grep -E "40[1-4]|50[0-5]" | tail -20

# Review access patterns
tail -f docker/data/logs/nginx/access.log | grep -v "200\|301\|302"
```

### Security Incident Response
```bash
# Immediate containment
1. Block suspicious IPs:
   # Add to nginx configuration
   deny $SUSPICIOUS_IP;
   docker-compose restart nginx

2. Review security logs:
   ./scripts/security-audit.sh

3. Check for data breaches:
   ./scripts/check-data-integrity.sh

4. Notify security team:
   Slack #security-incidents
```

---

## MAINTENANCE PROCEDURES

### Weekly Maintenance (Sunday 2 AM UTC)
```bash
#!/bin/bash
# Weekly maintenance script

# 1. Update system packages
docker-compose pull

# 2. Clean unused Docker resources
docker system prune -f

# 3. Analyze database performance
./scripts/database-maintenance.sh

# 4. Rotate logs
./scripts/rotate-logs.sh

# 5. Verify backups
./scripts/verify-backups.sh
```

### Monthly Maintenance
```bash
# Security updates
./scripts/security-updates.sh

# Performance analysis
./scripts/performance-report.sh

# Capacity planning review
./scripts/capacity-analysis.sh

# Disaster recovery test
./scripts/dr-test.sh
```

---

## TROUBLESHOOTING GUIDE

### Common Issues

#### High Memory Usage
```bash
# Identify memory-consuming processes
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | sort -k3 -nr

# Check application memory leaks
docker-compose exec backend npm run memory-analysis

# Restart services if needed
docker-compose restart backend
```

#### Database Connection Pool Exhausted
```bash
# Check active connections
docker-compose exec postgres psql -U postgres -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';"

# Increase pool size temporarily
# Edit docker-compose.yml: DB_POOL_MAX=100
docker-compose up -d backend
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in docker/nginx/ssl/waste-mgmt.com.crt -text -noout | grep "Not After"

# Renew certificates
./scripts/renew-ssl-certificates.sh

# Update nginx configuration
docker-compose restart nginx
```

---

## CONTACT INFORMATION

### Escalation Matrix

| Level | Contact | Responsibility | Response Time |
|-------|---------|----------------|---------------|
| L1 | Infrastructure Agent | Automated recovery | < 1 minute |
| L2 | DevOps Team | Manual intervention | < 5 minutes |
| L3 | Engineering Lead | Architecture issues | < 15 minutes |
| L4 | CTO | Business critical | < 30 minutes |

### Emergency Contacts
- **Slack**: #critical-incidents
- **PagerDuty**: waste-mgmt-production
- **Phone**: +1-555-WASTE-911

### External Services
- **Hosting Provider**: AWS Support (Enterprise)
- **Database**: PostgreSQL Support
- **CDN**: Cloudflare Enterprise Support
- **Monitoring**: Grafana Cloud Support

---

**Last Updated**: 2025-08-12
**Version**: 1.0.0
**Next Review**: 2025-09-12

**CRITICAL**: This runbook must be updated after any infrastructure changes