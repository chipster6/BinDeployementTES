# Waste Management System - Technical Architecture Documentation
## Complete Implementation Reference Guide

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
├─────────────────────┬─────────────────────┬────────────────────────┤
│   Web Dashboard     │   Mobile Apps       │   Customer Portal      │
│   (React/Next.js)   │   (React Native)    │   (Next.js)           │
└─────────────────────┴─────────────────────┴────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                 │
│                    (Node.js/Express + JWT)                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Core Services│        │ AI Services  │        │ IoT Services │
│  (Node.js)   │        │  (Python)    │        │  (Node.js)   │
└──────────────┘        └──────────────┘        └──────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ PostgreSQL   │        │  Weaviate    │        │   Redis      │
│  (Primary)   │        │  (Vector)    │        │  (Cache)     │
└──────────────┘        └──────────────┘        └──────────────┘
```

---

## Detailed Technology Stack

### Backend Services

#### 1. Core API Service
**Technology**: Node.js 20 LTS + Express.js 4.x + TypeScript
**Purpose**: Primary business logic and API endpoints
**Key Dependencies**:
```json
{
  "express": "^4.18.2",
  "typescript": "^5.3.0",
  "pg": "^8.11.3",              // PostgreSQL client
  "redis": "^4.6.0",             // Caching
  "joi": "^17.11.0",             // Validation
  "winston": "^3.11.0",          // Logging
  "helmet": "^7.1.0",            // Security
  "cors": "^2.8.5",              // CORS handling
  "jsonwebtoken": "^9.0.2",      // JWT auth
  "bcrypt": "^5.1.1",            // Password hashing
  "node-cron": "^3.0.3",         // Scheduled tasks
  "bull": "^4.11.5"              // Job queues
}
```

**File Structure**:
```
/backend-core/
├── src/
│   ├── controllers/
│   │   ├── customer.controller.ts
│   │   ├── dispatch.controller.ts
│   │   ├── invoice.controller.ts
│   │   └── route.controller.ts
│   ├── services/
│   │   ├── customer.service.ts
│   │   ├── scheduling.service.ts
│   │   ├── billing.service.ts
│   │   └── notification.service.ts
│   ├── models/
│   │   ├── customer.model.ts
│   │   ├── contract.model.ts
│   │   ├── route.model.ts
│   │   └── invoice.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   └── utils/
│       ├── database.ts
│       ├── cache.ts
│       └── logger.ts
```

#### 2. AI Analytics Service
**Technology**: Python 3.11 + FastAPI + LangChain
**Purpose**: AI/ML operations, pattern detection, predictions
**Key Dependencies**:
```python
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
langchain==0.1.0
weaviate-client==4.4.0
transformers==4.35.0
torch==2.1.0
scikit-learn==1.3.2
pandas==2.1.3
numpy==1.25.2
pydantic==2.5.0
celery==5.3.4
redis==5.0.1
httpx==0.25.2
```

**Service Architecture**:
```python
# /ai-service/app/main.py
from fastapi import FastAPI
from langchain.llms import LlamaCpp
from weaviate import Client

app = FastAPI()

# AI Models Configuration
MODELS = {
    "route_optimizer": "models/route_opt_v2.gguf",
    "churn_predictor": "models/churn_detect.gguf",
    "pattern_analyzer": "models/pattern_llama.gguf"
}

# Endpoints
@app.post("/analyze/routes")
async def optimize_routes(date: str, constraints: dict):
    # Route optimization logic
    pass

@app.post("/predict/churn")
async def predict_churn(customer_id: str):
    # Churn prediction logic
    pass

@app.post("/detect/patterns")
async def detect_patterns(timeframe: str, pattern_type: str):
    # Pattern detection logic
    pass
```

#### 3. IoT & GPS Service
**Technology**: Node.js + Socket.io + MQTT
**Purpose**: Real-time tracking, sensor data processing
**Key Components**:
```javascript
// /iot-service/src/server.js
const express = require('express');
const mqtt = require('mqtt');
const socketIO = require('socket.io');
const Redis = require('ioredis');

// MQTT for IoT devices
const mqttClient = mqtt.connect('mqtt://localhost:1883');

// Socket.io for real-time web updates
const io = socketIO(server, {
  cors: { origin: process.env.FRONTEND_URL }
});

// GPS tracking handler
mqttClient.on('message', (topic, message) => {
  const data = JSON.parse(message);
  
  if (topic.startsWith('gps/')) {
    // Process GPS data
    processGPSData(data);
    // Emit to web clients
    io.emit('location-update', data);
  }
  
  if (topic.startsWith('sensor/')) {
    // Process sensor data
    processSensorData(data);
  }
});
```

### Frontend Applications

#### 1. Web Dashboard (Staff Portal)
**Technology**: Next.js 14 + TypeScript + TailwindCSS
**Key Libraries**:
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "tailwindcss": "^3.3.0",
  "shadcn-ui": "latest",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.4.0",              // State management
  "react-hook-form": "^7.47.0",     // Form handling
  "zod": "^3.22.0",                 // Schema validation
  "recharts": "^2.9.0",             // Charts
  "mapbox-gl": "^3.0.0",            // Maps
  "socket.io-client": "^4.6.0",     // Real-time updates
  "axios": "^1.6.0"                 // API calls
}
```

**Component Structure**:
```
/dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── customers/page.tsx
│   │   ├── dispatch/page.tsx
│   │   ├── routes/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── layout.tsx
│   └── api/
│       └── [...route].ts
├── components/
│   ├── ui/                    // shadcn components
│   ├── dispatch/
│   │   ├── DispatchBoard.tsx
│   │   ├── RouteMap.tsx
│   │   └── DriverList.tsx
│   └── analytics/
│       ├── Dashboard.tsx
│       └── Charts.tsx
```

#### 2. Mobile Application (Drivers)
**Technology**: React Native + Expo + TypeScript
**Key Features**:
```typescript
// Driver app structure
/mobile-app/
├── app/
│   ├── (tabs)/
│   │   ├── routes.tsx       // Daily routes
│   │   ├── active.tsx       // Current pickup
│   │   └── history.tsx      // Completed
│   ├── pickup/[id].tsx      // Pickup details
│   └── _layout.tsx
├── components/
│   ├── RouteCard.tsx
│   ├── NavigationButton.tsx
│   ├── BinScanner.tsx       // QR/RFID scanning
│   └── PhotoCapture.tsx     // Service proof
├── services/
│   ├── location.service.ts  // GPS tracking
│   ├── api.service.ts
│   └── offline.service.ts   // Offline capability
```

### Database Layer

#### 1. PostgreSQL (Primary Database)
**Version**: PostgreSQL 16 with PostGIS extension
**Schema Design**:
```sql
-- Core Tables
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    contact_info JSONB NOT NULL,
    address_info JSONB NOT NULL,
    contract_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    bin_type VARCHAR(50),
    size VARCHAR(20),
    location GEOGRAPHY(POINT, 4326),
    qr_code VARCHAR(100) UNIQUE,
    rfid_tag VARCHAR(100) UNIQUE,
    status VARCHAR(50)
);

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_date DATE NOT NULL,
    driver_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    planned_stops JSONB,
    actual_stops JSONB,
    optimization_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES routes(id),
    bin_id UUID REFERENCES bins(id),
    scheduled_time TIMESTAMP,
    actual_time TIMESTAMP,
    event_type VARCHAR(50),
    gps_location GEOGRAPHY(POINT, 4326),
    photos TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_customers_status ON customers(contract_status);
CREATE INDEX idx_bins_customer ON bins(customer_id);
CREATE INDEX idx_routes_date ON routes(route_date);
CREATE INDEX idx_service_events_bin ON service_events(bin_id);
CREATE SPATIAL INDEX idx_bins_location ON bins USING GIST(location);
```

#### 2. Weaviate (Vector Database)
**Version**: Weaviate 1.22+
**Configuration**:
```yaml
# docker-compose.yml
weaviate:
  image: semitechnologies/weaviate:1.22.0
  environment:
    PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
    DEFAULT_VECTORIZER_MODULE: 'text2vec-transformers'
    ENABLE_MODULES: 'text2vec-transformers,qna-transformers'
    CLUSTER_HOSTNAME: 'weaviate-node1'
    AUTHENTICATION_APIKEY_ENABLED: 'true'
    AUTHENTICATION_APIKEY_ALLOWED_KEYS: '${WEAVIATE_API_KEY}'
    AUTHORIZATION_ADMINLIST_ENABLED: 'true'
  volumes:
    - weaviate_data:/var/lib/weaviate
```

**Schema Classes**:
```python
# Weaviate schema definition
schema = {
    "classes": [
        {
            "class": "CustomerInteraction",
            "vectorizer": "text2vec-transformers",
            "properties": [
                {"name": "customerId", "dataType": ["string"]},
                {"name": "content", "dataType": ["text"]},
                {"name": "interactionType", "dataType": ["string"]},
                {"name": "sentiment", "dataType": ["number"]},
                {"name": "timestamp", "dataType": ["date"]},
                {"name": "outcome", "dataType": ["string"]}
            ]
        },
        {
            "class": "OperationalPattern",
            "vectorizer": "text2vec-transformers",
            "properties": [
                {"name": "patternType", "dataType": ["string"]},
                {"name": "description", "dataType": ["text"]},
                {"name": "impact", "dataType": ["string"]},
                {"name": "frequency", "dataType": ["number"]},
                {"name": "recommendations", "dataType": ["text"]}
            ]
        }
    ]
}
```

### Message Queue & Caching

#### Redis Configuration
```javascript
// Cache configuration
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

// Cache patterns
const cachePatterns = {
  routes: 'route:date:{date}:driver:{driverId}',
  customer: 'customer:{customerId}',
  analytics: 'analytics:{type}:{date}',
  session: 'session:{userId}'
};

// Cache middleware
const cacheMiddleware = (pattern, ttl = 300) => {
  return async (req, res, next) => {
    const key = pattern.replace(/{(\w+)}/g, (_, p) => req.params[p]);
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, ttl, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

### External Integrations

#### 1. Communication Services
```typescript
// Twilio for SMS
import twilio from 'twilio';
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SendGrid for Email
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// WhatsApp Business API
import { Client } from 'whatsapp-web.js';
const whatsappClient = new Client({
  authStrategy: new LocalAuth()
});
```

#### 2. Payment Processing
```typescript
// Stripe integration
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Payment processing service
export class PaymentService {
  async createInvoice(customerId: string, amount: number) {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      collection_method: 'send_invoice',
      days_until_due: 30
    });
    
    return invoice;
  }
  
  async processPayment(invoiceId: string, paymentMethodId: string) {
    const payment = await stripe.invoices.pay(invoiceId, {
      payment_method: paymentMethodId
    });
    
    return payment;
  }
}
```

---

## Hardware Stack Requirements

### Server Infrastructure

#### Production Environment
```yaml
# Minimum Production Requirements
app_servers:
  count: 2  # For high availability
  specs:
    cpu: "8 cores (Intel Xeon or AMD EPYC)"
    ram: "32GB DDR4"
    storage: "500GB NVMe SSD"
    network: "1Gbps"

database_server:
  specs:
    cpu: "16 cores"
    ram: "64GB DDR4 ECC"
    storage: "2TB NVMe SSD (RAID 10)"
    network: "10Gbps"

ai_server:
  specs:
    cpu: "12 cores"
    ram: "64GB DDR4"
    gpu: "NVIDIA RTX 4090 or A6000"  # For local LLM
    storage: "1TB NVMe SSD"
```

### IoT Hardware

#### Vehicle Tracking Kit
```yaml
gps_tracker:
  model: "Teltonika FMB920"
  features:
    - "4G LTE connectivity"
    - "Internal GPS/GLONASS antenna"
    - "Backup battery"
    - "CAN bus interface"
    - "Digital I/O for sensors"

dash_camera:
  model: "Hikvision DS-MP5604N"
  features:
    - "4-channel recording"
    - "1080p resolution"
    - "AI object detection"
    - "4G upload capability"
```

#### Bin Monitoring Kit
```yaml
rfid_tags:
  type: "UHF RFID Tags"
  frequency: "860-960 MHz"
  read_range: "Up to 10 meters"
  durability: "IP68 rated"

fill_sensors:
  ultrasonic:
    model: "MaxBotix MB7389"
    range: "0.3m to 5m"
    accuracy: "±1cm"
  
  weight_sensor:
    model: "Load Cell HX711"
    capacity: "5000kg"
    accuracy: "±0.1%"
```

### Network Infrastructure
```yaml
primary_internet:
  type: "Business Fiber"
  speed: "1Gbps symmetric"
  sla: "99.9% uptime"

backup_internet:
  type: "4G/5G Failover"
  provider: "Different from primary"
  
firewall:
  model: "pfSense or Fortinet"
  features:
    - "IPS/IDS"
    - "VPN support"
    - "Traffic shaping"
```

---

## Claude Code Subagent Orchestration

### `/agents` Command Configuration

```yaml
# .claude/agents.yml
project_name: "waste_management_system"
version: "1.0.0"

agents:
  architect:
    role: "System Architecture & Design"
    responsibilities:
      - "Database schema design"
      - "API contract definition"
      - "Service boundaries"
      - "Security architecture"
    files:
      - "docs/architecture/*"
      - "src/models/*"
      - "src/interfaces/*"

  backend_developer:
    role: "Backend Services Implementation"
    focus: "Node.js/TypeScript"
    responsibilities:
      - "API endpoint implementation"
      - "Business logic"
      - "Database queries"
      - "Integration services"
    files:
      - "backend-core/src/*"
      - "backend-core/tests/*"
    
  ai_engineer:
    role: "AI/ML Services"
    focus: "Python/FastAPI"
    responsibilities:
      - "Pattern detection algorithms"
      - "Route optimization"
      - "Predictive models"
      - "Weaviate integration"
    files:
      - "ai-service/*"
      - "models/*"
    
  frontend_developer:
    role: "UI/UX Implementation"
    focus: "React/Next.js"
    responsibilities:
      - "Dashboard components"
      - "State management"
      - "API integration"
      - "Real-time updates"
    files:
      - "dashboard/*"
      - "mobile-app/*"
    
  devops_engineer:
    role: "Infrastructure & Deployment"
    responsibilities:
      - "Docker configurations"
      - "CI/CD pipelines"
      - "Monitoring setup"
      - "Security hardening"
    files:
      - "docker/*"
      - ".github/workflows/*"
      - "infrastructure/*"
    
  qa_engineer:
    role: "Testing & Quality Assurance"
    responsibilities:
      - "Test strategy"
      - "E2E testing"
      - "Performance testing"
      - "Security testing"
    files:
      - "tests/*"
      - "cypress/*"
      - ".github/workflows/test.yml"

orchestration:
  workflow:
    - step: "architecture_review"
      agent: "architect"
      triggers: ["src/models/**", "docs/architecture/**"]
      
    - step: "backend_implementation"
      agent: "backend_developer"
      depends_on: ["architecture_review"]
      parallel: true
      
    - step: "ai_implementation"
      agent: "ai_engineer"
      depends_on: ["architecture_review"]
      parallel: true
      
    - step: "frontend_implementation"
      agent: "frontend_developer"
      depends_on: ["backend_implementation"]
      
    - step: "integration_testing"
      agent: "qa_engineer"
      depends_on: ["frontend_implementation", "ai_implementation"]
      
    - step: "deployment"
      agent: "devops_engineer"
      depends_on: ["integration_testing"]

code_review:
  required_approvals: 2
  auto_assign: true
  check_list:
    - "Type safety"
    - "Error handling"
    - "Security best practices"
    - "Performance optimization"
    - "Documentation"

security_checks:
  - "dependency_scan"
  - "secret_detection"
  - "sql_injection"
  - "xss_prevention"
  
performance_targets:
  api_response_time: "< 200ms"
  page_load_time: "< 2s"
  route_optimization: "< 5s for 100 stops"
```

### Claude Code Commands for Rapid Development

```bash
# Initialize project with all subagents
claude-code init --template=waste-management --agents=all

# Start specific agent for focused work
claude-code agent start backend_developer --context="implement customer CRUD"

# Run orchestrated workflow
claude-code orchestrate --step=backend_implementation --parallel

# Generate tests automatically
claude-code generate tests --coverage=90 --focus=services

# Security audit
claude-code audit security --fix --commit

# Performance optimization
claude-code optimize --target=api_response_time --threshold=200ms

# Deploy with validation
claude-code deploy --env=production --pre-check --rollback-on-error
```

---

## Security Implementation

### Authentication & Authorization
```typescript
// JWT-based auth with refresh tokens
interface AuthTokens {
  access: {
    token: string;
    expiresIn: '15m';
  };
  refresh: {
    token: string;
    expiresIn: '7d';
  };
}

// Role-based access control
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  CUSTOMER = 'customer'
}

// Permission matrix
const permissions = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'customers:*',
    'routes:*',
    'invoices:*',
    'reports:view'
  ],
  [UserRole.DISPATCHER]: [
    'routes:*',
    'drivers:view',
    'customers:view'
  ],
  [UserRole.DRIVER]: [
    'routes:view:own',
    'pickups:update',
    'issues:report'
  ]
};
```

### Data Encryption
```typescript
// Field-level encryption for sensitive data
import { createCipheriv, createDecipheriv } from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }
}
```

---

## Monitoring & Observability

### Logging Stack
```yaml
logging:
  aggregator: "ELK Stack or Grafana Loki"
  
  structure:
    - service: "API Gateway"
      level: "INFO"
      format: "JSON"
      retention: "30 days"
      
    - service: "Core Services"
      level: "DEBUG"
      format: "JSON"
      retention: "7 days"
      
    - service: "AI Services"
      level: "INFO"
      format: "JSON"
      retention: "90 days"
```

### Metrics & Alerts
```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Business metrics
const pickupsCompleted = new Counter({
  name: 'pickups_completed_total',
  help: 'Total number of completed pickups',
  labelNames: ['route', 'driver']
});

const routeOptimizationTime = new Histogram({
  name: 'route_optimization_duration_seconds',
  help: 'Time taken to optimize routes',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeCustomers = new Gauge({
  name: 'active_customers_total',
  help: 'Total number of active customers'
});

// Alert rules
const alerts = {
  missedPickup: {
    condition: 'pickup_delay > 2 hours',
    severity: 'high',
    notification: ['sms', 'email', 'dashboard']
  },
  systemHealth: {
    condition: 'api_error_rate > 5%',
    severity: 'critical',
    notification: ['pagerduty', 'slack']
  }
};
```

---

## Development & Deployment Pipeline

### CI/CD Configuration
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [backend-core, ai-service, dashboard]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests
        run: |
          cd ${{ matrix.service }}
          npm test -- --coverage
          
      - name: Security Scan
        run: |
          npm audit
          trivy fs .
          
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Production
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/api-server
```

### Environment Configuration
```bash
# .env.production
NODE_ENV=production
API_PORT=3000

# Database
DB_HOST=postgres.internal
DB_PORT=5432
DB_NAME=waste_management
DB_USER=app_user
DB_PASSWORD_SECRET=aws:secretsmanager:db-password

# Weaviate
WEAVIATE_URL=http://weaviate.internal:8080
WEAVIATE_API_KEY_SECRET=aws:secretsmanager:weaviate-key

# Redis
REDIS_URL=redis://redis.internal:6379

# External Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN_SECRET=aws:secretsmanager:twilio-token
SENDGRID_API_KEY_SECRET=aws:secretsmanager:sendgrid-key
STRIPE_SECRET_KEY_SECRET=aws:secretsmanager:stripe-key

# AI Models
LOCAL_LLM_PATH=/models/llama-2-13b-chat.gguf
MODEL_THREADS=8

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEW_RELIC_LICENSE_KEY_SECRET=aws:secretsmanager:newrelic-key
```

---

This technical documentation provides a complete blueprint for implementing the waste management system. Each component is specified with exact technologies, code examples, and integration points. Use this as your primary reference when building with Claude Code, and the subagent orchestration will help maintain consistency across all development efforts.