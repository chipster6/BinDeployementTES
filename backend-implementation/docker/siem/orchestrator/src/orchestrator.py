#!/usr/bin/env python3
"""
============================================================================
SECURITY ORCHESTRATION PLATFORM
============================================================================

Automated security response and incident management system
Real-time processing of security events and orchestrated responses

Created by: DEVOPS-AGENT - TIER 1 Advanced Threat Protection
Date: 2025-08-14
Version: 1.0.0
============================================================================
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import structlog
from elasticsearch import AsyncElasticsearch
import yaml

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Configuration
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
ELASTICSEARCH_USER = os.getenv("ELASTICSEARCH_USER", "elastic")
ELASTICSEARCH_PASSWORD = os.getenv("ELASTICSEARCH_PASSWORD", "")
WAZUH_API_URL = os.getenv("WAZUH_API_URL", "https://wazuh-manager:55000")
WAZUH_API_USER = os.getenv("WAZUH_API_USER", "wazuh")
WAZUH_API_PASSWORD = os.getenv("WAZUH_API_PASSWORD", "")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "security@waste-mgmt.com")

# FastAPI Application
app = FastAPI(
    title="Security Orchestration Platform",
    description="Automated security response and incident management",
    version="1.0.0"
)

# Pydantic Models
class SecurityEvent(BaseModel):
    """Security event model"""
    timestamp: datetime
    event_type: str
    severity: str
    source: str
    source_ip: Optional[str] = None
    user: Optional[str] = None
    description: str
    raw_data: Dict[str, Any]
    tags: List[str] = Field(default_factory=list)

class IncidentResponse(BaseModel):
    """Incident response model"""
    incident_id: str
    severity: str
    status: str
    actions_taken: List[str]
    timestamp: datetime
    resolved: bool = False

class PlaybookConfig(BaseModel):
    """Security playbook configuration"""
    name: str
    triggers: List[str]
    severity_threshold: str
    actions: List[Dict[str, Any]]
    enabled: bool = True

# Global Variables
elasticsearch_client = None
security_playbooks: List[PlaybookConfig] = []
active_incidents: Dict[str, IncidentResponse] = {}

class SecurityOrchestrator:
    """Main security orchestration class"""
    
    def __init__(self):
        self.es_client = None
        self.playbooks = []
        self.incidents = {}
        
    async def initialize(self):
        """Initialize the orchestrator"""
        try:
            # Initialize Elasticsearch client
            self.es_client = AsyncElasticsearch(
                [ELASTICSEARCH_URL],
                basic_auth=(ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD),
                verify_certs=False
            )
            
            # Load security playbooks
            await self.load_playbooks()
            
            # Start event monitoring
            asyncio.create_task(self.monitor_security_events())
            
            logger.info("Security orchestrator initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize security orchestrator: {e}")
            raise
    
    async def load_playbooks(self):
        """Load security response playbooks"""
        try:
            playbooks_dir = "/app/playbooks"
            if os.path.exists(playbooks_dir):
                for filename in os.listdir(playbooks_dir):
                    if filename.endswith('.yaml') or filename.endswith('.yml'):
                        filepath = os.path.join(playbooks_dir, filename)
                        with open(filepath, 'r') as f:
                            playbook_data = yaml.safe_load(f)
                            playbook = PlaybookConfig(**playbook_data)
                            self.playbooks.append(playbook)
                            
            logger.info(f"Loaded {len(self.playbooks)} security playbooks")
            
        except Exception as e:
            logger.error(f"Failed to load playbooks: {e}")
    
    async def monitor_security_events(self):
        """Monitor security events from Elasticsearch"""
        while True:
            try:
                # Query for recent security events
                query = {
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "range": {
                                        "@timestamp": {
                                            "gte": "now-1m"
                                        }
                                    }
                                }
                            ],
                            "should": [
                                {"match": {"security_severity": "critical"}},
                                {"match": {"security_severity": "high"}},
                                {"match": {"tags": "sql_injection"}},
                                {"match": {"tags": "authentication_failure"}},
                                {"match": {"tags": "web_attack"}}
                            ],
                            "minimum_should_match": 1
                        }
                    },
                    "sort": [
                        {"@timestamp": {"order": "desc"}}
                    ],
                    "size": 100
                }
                
                response = await self.es_client.search(
                    index="siem-events-*,security-alerts-*",
                    body=query
                )
                
                for hit in response['hits']['hits']:
                    await self.process_security_event(hit['_source'])
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring security events: {e}")
                await asyncio.sleep(30)
    
    async def process_security_event(self, event_data: Dict[str, Any]):
        """Process a security event and trigger appropriate responses"""
        try:
            # Create security event object
            event = SecurityEvent(
                timestamp=datetime.fromisoformat(event_data.get('@timestamp', datetime.now(timezone.utc).isoformat())),
                event_type=event_data.get('event_type', 'unknown'),
                severity=event_data.get('security_severity', 'info'),
                source=event_data.get('source', 'unknown'),
                source_ip=event_data.get('source_ip'),
                user=event_data.get('username'),
                description=event_data.get('message', ''),
                raw_data=event_data,
                tags=event_data.get('tags', [])
            )
            
            # Check if event matches any playbook triggers
            for playbook in self.playbooks:
                if await self.event_matches_playbook(event, playbook):
                    await self.execute_playbook(event, playbook)
            
        except Exception as e:
            logger.error(f"Error processing security event: {e}")
    
    async def event_matches_playbook(self, event: SecurityEvent, playbook: PlaybookConfig) -> bool:
        """Check if an event matches playbook triggers"""
        if not playbook.enabled:
            return False
            
        # Check severity threshold
        severity_levels = {"info": 1, "low": 2, "medium": 3, "high": 4, "critical": 5}
        event_severity = severity_levels.get(event.severity, 0)
        threshold_severity = severity_levels.get(playbook.severity_threshold, 5)
        
        if event_severity < threshold_severity:
            return False
        
        # Check trigger conditions
        for trigger in playbook.triggers:
            if (trigger in event.event_type or 
                trigger in event.description.lower() or
                any(trigger in tag for tag in event.tags)):
                return True
        
        return False
    
    async def execute_playbook(self, event: SecurityEvent, playbook: PlaybookConfig):
        """Execute a security response playbook"""
        try:
            incident_id = f"incident-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{event.event_type}"
            
            logger.info(f"Executing playbook '{playbook.name}' for incident {incident_id}")
            
            actions_taken = []
            
            for action in playbook.actions:
                action_type = action.get('type')
                action_params = action.get('params', {})
                
                if action_type == 'block_ip':
                    await self.block_ip_address(event.source_ip, action_params)
                    actions_taken.append(f"Blocked IP: {event.source_ip}")
                
                elif action_type == 'disable_user':
                    await self.disable_user_account(event.user, action_params)
                    actions_taken.append(f"Disabled user: {event.user}")
                
                elif action_type == 'send_alert':
                    await self.send_security_alert(event, action_params)
                    actions_taken.append("Sent security alert")
                
                elif action_type == 'isolate_host':
                    await self.isolate_host(event.source_ip, action_params)
                    actions_taken.append(f"Isolated host: {event.source_ip}")
                
                elif action_type == 'create_ticket':
                    await self.create_incident_ticket(event, action_params)
                    actions_taken.append("Created incident ticket")
            
            # Create incident response record
            incident = IncidentResponse(
                incident_id=incident_id,
                severity=event.severity,
                status="active",
                actions_taken=actions_taken,
                timestamp=datetime.now(timezone.utc)
            )
            
            self.incidents[incident_id] = incident
            
            # Store incident in Elasticsearch
            await self.store_incident(incident)
            
            logger.info(f"Playbook execution completed for incident {incident_id}")
            
        except Exception as e:
            logger.error(f"Error executing playbook: {e}")
    
    async def block_ip_address(self, ip_address: str, params: Dict[str, Any]):
        """Block an IP address using firewall rules"""
        if not ip_address:
            return
            
        try:
            # In a real implementation, this would integrate with firewall APIs
            # For now, we'll log the action and could integrate with iptables, pfSense, etc.
            logger.warning(f"SECURITY ACTION: Blocking IP address {ip_address}")
            
            # Example: Add to blocklist in Elasticsearch
            await self.es_client.index(
                index="security-blocklist",
                body={
                    "ip_address": ip_address,
                    "action": "block",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reason": "Automated security response",
                    "duration": params.get('duration', '1h')
                }
            )
            
        except Exception as e:
            logger.error(f"Error blocking IP address {ip_address}: {e}")
    
    async def disable_user_account(self, username: str, params: Dict[str, Any]):
        """Disable a user account"""
        if not username:
            return
            
        try:
            logger.warning(f"SECURITY ACTION: Disabling user account {username}")
            
            # Store action in Elasticsearch
            await self.es_client.index(
                index="security-actions",
                body={
                    "action": "disable_user",
                    "username": username,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reason": "Automated security response",
                    "duration": params.get('duration', 'permanent')
                }
            )
            
        except Exception as e:
            logger.error(f"Error disabling user account {username}: {e}")
    
    async def send_security_alert(self, event: SecurityEvent, params: Dict[str, Any]):
        """Send security alert via multiple channels"""
        try:
            alert_message = f"""
🚨 SECURITY ALERT 🚨

Severity: {event.severity.upper()}
Event Type: {event.event_type}
Source: {event.source_ip or 'Unknown'}
User: {event.user or 'Unknown'}
Time: {event.timestamp.isoformat()}

Description: {event.description}

Automated Response: Security orchestrator has been activated.
"""
            
            # Send to Slack if configured
            if SLACK_WEBHOOK_URL:
                await self.send_slack_alert(alert_message)
            
            # Send email if configured
            if EMAIL_SMTP_HOST:
                await self.send_email_alert(alert_message)
            
            logger.info("Security alert sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending security alert: {e}")
    
    async def send_slack_alert(self, message: str):
        """Send alert to Slack"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    SLACK_WEBHOOK_URL,
                    json={"text": message}
                )
                response.raise_for_status()
                
        except Exception as e:
            logger.error(f"Error sending Slack alert: {e}")
    
    async def send_email_alert(self, message: str):
        """Send email alert"""
        try:
            # Implementation would use aiosmtplib for sending emails
            logger.info("Email alert would be sent here")
            
        except Exception as e:
            logger.error(f"Error sending email alert: {e}")
    
    async def isolate_host(self, ip_address: str, params: Dict[str, Any]):
        """Isolate a host from the network"""
        if not ip_address:
            return
            
        try:
            logger.warning(f"SECURITY ACTION: Isolating host {ip_address}")
            
            # Store action in Elasticsearch
            await self.es_client.index(
                index="security-actions",
                body={
                    "action": "isolate_host",
                    "ip_address": ip_address,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reason": "Automated security response",
                    "isolation_type": params.get('type', 'network')
                }
            )
            
        except Exception as e:
            logger.error(f"Error isolating host {ip_address}: {e}")
    
    async def create_incident_ticket(self, event: SecurityEvent, params: Dict[str, Any]):
        """Create an incident ticket"""
        try:
            ticket_data = {
                "title": f"Security Incident: {event.event_type}",
                "description": event.description,
                "severity": event.severity,
                "source_ip": event.source_ip,
                "user": event.user,
                "timestamp": event.timestamp.isoformat(),
                "status": "open",
                "assigned_to": params.get('assigned_to', 'security-team')
            }
            
            # Store ticket in Elasticsearch
            await self.es_client.index(
                index="security-tickets",
                body=ticket_data
            )
            
            logger.info("Security incident ticket created")
            
        except Exception as e:
            logger.error(f"Error creating incident ticket: {e}")
    
    async def store_incident(self, incident: IncidentResponse):
        """Store incident response in Elasticsearch"""
        try:
            await self.es_client.index(
                index="security-incidents",
                body=incident.dict()
            )
            
        except Exception as e:
            logger.error(f"Error storing incident: {e}")

# Global orchestrator instance
orchestrator = SecurityOrchestrator()

# FastAPI Routes
@app.on_event("startup")
async def startup_event():
    """Initialize the security orchestrator on startup"""
    await orchestrator.initialize()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/incidents")
async def get_incidents():
    """Get active incidents"""
    return {"incidents": list(orchestrator.incidents.values())}

@app.get("/playbooks")
async def get_playbooks():
    """Get loaded playbooks"""
    return {"playbooks": [p.dict() for p in orchestrator.playbooks]}

@app.post("/manual-response")
async def manual_response(event: SecurityEvent, background_tasks: BackgroundTasks):
    """Manually trigger security response"""
    background_tasks.add_task(orchestrator.process_security_event, event.dict())
    return {"status": "response initiated", "event_type": event.event_type}

@app.get("/stats")
async def get_stats():
    """Get orchestrator statistics"""
    return {
        "active_incidents": len(orchestrator.incidents),
        "loaded_playbooks": len(orchestrator.playbooks),
        "status": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")