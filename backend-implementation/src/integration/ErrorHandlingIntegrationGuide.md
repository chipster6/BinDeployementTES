# Advanced Error Handling System Integration Guide

## Overview

This guide provides comprehensive integration instructions for the advanced error handling system optimized for the waste management system's parallel development streams.

## System Architecture

The error handling system consists of multiple coordinated layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Real-Time Monitoring Layer                │
├─────────────────────────────────────────────────────────────┤
│    Cross-Stream Coordinator    │    Production Monitoring    │
├─────────────────────────────────────────────────────────────┤
│  User Experience Handler  │  Security Coordinator  │  API Mgr │
├─────────────────────────────────────────────────────────────┤
│              Base Error Handling Infrastructure              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cross-Stream Error Coordinator (`/src/services/CrossStreamErrorCoordinator.ts`)

Central coordination service for all error handling across development streams.

**Key Features:**
- Cross-stream error correlation
- User-friendly error transformation
- Recovery strategy orchestration
- Real-time error broadcasting

**Integration:**
```typescript
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';

// Report error from any stream
const errorId = await crossStreamErrorCoordinator.reportError(
  error,
  {
    stream: 'frontend', // or 'backend', 'external-api', 'security', 'testing', 'database'
    component: 'BinTracker',
    operation: 'loadBins',
    userId: 'user123',
    sessionId: 'session456',
  },
  {
    businessImpact: 'medium',
    customerFacing: true,
  }
);
```

### 2. User Experience Error Handler (`/src/services/UserExperienceErrorHandler.ts`)

Transforms technical errors into user-friendly experiences with graceful degradation.

**Integration:**
```typescript
import { userExperienceErrorHandler } from '@/services/UserExperienceErrorHandler';

// Create user-friendly error
const userFriendlyError = userExperienceErrorHandler.createUserFriendlyError(
  systemError,
  context,
  userContext
);

// Apply graceful degradation
const degradationConfig = await userExperienceErrorHandler.applyGracefulDegradation(
  error,
  context,
  userContext
);
```

### 3. External Service Error Manager (`/src/services/external/ExternalServiceErrorManager.ts`)

Specialized handling for external API integrations.

**Service Configurations:**
- **Stripe**: Critical payment operations with queue fallback
- **Twilio**: SMS notifications with email fallback
- **SendGrid**: Email delivery with SMS fallback
- **Samsara**: Fleet tracking with cached data fallback
- **Airtable**: Data sync with cache fallback
- **Mapbox**: Mapping services with offline tiles fallback

**Integration:**
```typescript
import { externalServiceErrorManager } from '@/services/external/ExternalServiceErrorManager';

// Handle service error
const result = await externalServiceErrorManager.handleServiceError(
  error,
  'stripe',
  'process_payment',
  paymentData
);

if (result.fallbackResult) {
  // Use fallback data
} else if (result.queuedForRetry) {
  // Operation queued for retry
}
```

### 4. Production Error Monitoring (`/src/services/ProductionErrorMonitoring.ts`)

Advanced production monitoring with real-time alerting and business impact analysis.

**Features:**
- Multi-stream error correlation
- Real-time alerting and incident management
- Performance impact monitoring
- Business continuity tracking
- SLA monitoring and reporting

**Integration:**
```typescript
import { productionErrorMonitoring } from '@/services/ProductionErrorMonitoring';

// Start monitoring
await productionErrorMonitoring.startMonitoring();

// Get dashboard data
const dashboard = await productionErrorMonitoring.getDashboardData();

// Create incident
const incidentId = await productionErrorMonitoring.createIncident(
  'Database Connection Issues',
  'Multiple database connection failures detected',
  'high',
  ['backend', 'database']
);
```

### 5. Security Error Coordinator (`/src/services/SecurityErrorCoordinator.ts`)

Security-specific error handling with threat detection and response.

**Integration:**
```typescript
import { securityErrorCoordinator } from '@/services/SecurityErrorCoordinator';

// Process security error
const result = await securityErrorCoordinator.processSecurityError(
  error,
  {
    userId: 'user123',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    requestPath: '/admin/users',
    requestMethod: 'GET',
    headers: requestHeaders,
    timestamp: new Date(),
    riskScore: 0.7,
  },
  streamContext
);

if (result.blocked) {
  // User/IP was blocked
}

if (result.incident) {
  // Security incident created
}
```

### 6. Real-Time Error Monitoring (`/src/services/RealTimeErrorMonitoring.ts`)

WebSocket-based real-time monitoring and alerting.

**Integration:**
```typescript
import { realTimeErrorMonitoring } from '@/services/RealTimeErrorMonitoring';

// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:8081');

ws.onopen = () => {
  // Subscribe to error streams
  ws.send(JSON.stringify({
    type: 'subscription',
    subscription: {
      streams: ['frontend', 'backend'],
      errorTypes: ['high', 'critical'],
      realTimeUpdates: true,
      alertsEnabled: true,
      metricsEnabled: true,
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'error_reported':
      handleNewError(message.data);
      break;
    case 'metrics_update':
      updateDashboard(message.data);
      break;
    case 'alert_triggered':
      showAlert(message.data);
      break;
  }
};
```

### 7. Frontend Error Boundary Patterns (`/src/patterns/FrontendErrorBoundaryPatterns.ts`)

React error boundary components and patterns for the frontend team.

**Usage:**
```jsx
// Page-level error boundary
<WasteManagementErrorBoundary level="page" retryEnabled maxRetries={3}>
  <DashboardPage />
</WasteManagementErrorBoundary>

// Component-level with custom fallback
<WasteManagementErrorBoundary 
  level="component"
  fallback={<BinTrackerFallback />}
  onError={(error, errorInfo) => {
    analytics.track('bin_tracker_error', { error: error.message });
  }}
>
  <BinTrackerComponent />
</WasteManagementErrorBoundary>

// Using the error handler hook
const { hasError, error, reportError, retry, wrapAsync } = useErrorHandler({
  component: 'BinList',
  reportToBackend: true,
  retryEnabled: true,
});
```

## Integration Steps by Development Stream

### Frontend Integration

1. **Install Error Boundary Components:**
```bash
# Copy patterns to your components directory
cp src/patterns/FrontendErrorBoundaryPatterns.ts frontend/src/components/
```

2. **Wrap Components with Error Boundaries:**
```jsx
// App.js
import { WasteManagementErrorBoundary } from './components/FrontendErrorBoundaryPatterns';

function App() {
  return (
    <WasteManagementErrorBoundary level="page">
      <Router>
        <Routes>
          <Route path="/dashboard" element={
            <WasteManagementErrorBoundary level="section">
              <Dashboard />
            </WasteManagementErrorBoundary>
          } />
        </Routes>
      </Router>
    </WasteManagementErrorBoundary>
  );
}
```

3. **Connect to Real-Time Monitoring:**
```jsx
// hooks/useRealTimeErrors.js
export const useRealTimeErrors = () => {
  const [ws, setWs] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8081');
    
    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: 'subscription',
        subscription: {
          streams: ['frontend'],
          realTimeUpdates: true,
          alertsEnabled: true,
        }
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'error_reported') {
        setErrors(prev => [...prev, message.data.event]);
      }
    };

    setWs(websocket);
    return () => websocket.close();
  }, []);

  return { errors };
};
```

### Backend Integration

1. **Update Middleware Stack:**
```typescript
// server.ts
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';
import { productionErrorMonitoring } from '@/services/ProductionErrorMonitoring';
import { realTimeErrorMonitoring } from '@/services/RealTimeErrorMonitoring';

// Initialize monitoring services
await productionErrorMonitoring.startMonitoring();

// Add error reporting middleware
app.use(async (error, req, res, next) => {
  await crossStreamErrorCoordinator.reportError(
    error,
    {
      stream: 'backend',
      component: req.route?.path || 'unknown',
      operation: req.method,
      userId: req.user?.id,
      sessionId: req.sessionID,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
    }
  );
  
  next(error);
});
```

2. **Service Layer Integration:**
```typescript
// services/BinService.ts
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';

export class BinService {
  async getBins(userId: string) {
    try {
      return await this.binRepository.findByUser(userId);
    } catch (error) {
      await crossStreamErrorCoordinator.reportError(
        error,
        {
          stream: 'backend',
          component: 'BinService',
          operation: 'getBins',
          userId,
        },
        {
          businessImpact: 'medium',
          customerFacing: true,
        }
      );
      throw error;
    }
  }
}
```

### External API Integration

1. **Update API Service Classes:**
```typescript
// services/StripeService.ts
import { externalServiceErrorManager } from '@/services/external/ExternalServiceErrorManager';

export class StripeService {
  async processPayment(paymentData: any) {
    try {
      return await this.stripe.paymentIntents.create(paymentData);
    } catch (error) {
      const result = await externalServiceErrorManager.handleServiceError(
        error,
        'stripe',
        'process_payment',
        paymentData
      );

      if (result.fallbackResult) {
        return result.fallbackResult;
      }

      if (result.queuedForRetry) {
        return { status: 'queued', message: 'Payment queued for processing' };
      }

      throw error;
    }
  }
}
```

### Security Integration

1. **Authentication Middleware:**
```typescript
// middleware/auth.ts
import { securityErrorCoordinator } from '@/services/SecurityErrorCoordinator';

export const authMiddleware = async (req, res, next) => {
  try {
    // Authentication logic
    const user = await authenticateUser(req);
    req.user = user;
    next();
  } catch (error) {
    const result = await securityErrorCoordinator.processSecurityError(
      error,
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        requestMethod: req.method,
        headers: req.headers,
        timestamp: new Date(),
        riskScore: calculateRiskScore(req),
      },
      {
        stream: 'security',
        component: 'authentication',
        operation: 'authenticate',
      }
    );

    if (result.blocked) {
      return res.status(403).json({ error: 'Access blocked' });
    }

    throw error;
  }
};
```

## Configuration

### Environment Variables

```bash
# Real-time monitoring
REALTIME_MONITORING_PORT=8081
REALTIME_MONITORING_ENABLED=true

# Production monitoring
PRODUCTION_MONITORING_ENABLED=true
MONITORING_WEBSOCKET_PORT=8080

# External service timeouts
STRIPE_TIMEOUT=10000
TWILIO_TIMEOUT=5000
SENDGRID_TIMEOUT=5000
SAMSARA_TIMEOUT=15000
MAPBOX_TIMEOUT=8000

# Security settings
SECURITY_MONITORING_ENABLED=true
AUTO_BLOCK_SUSPICIOUS_IPS=true
MAX_LOGIN_ATTEMPTS=5

# Error reporting
ERROR_REPORTING_ENABLED=true
ERROR_RETENTION_DAYS=30
```

### Redis Configuration

```typescript
// config/redis.ts
export const redisConfig = {
  // Error caching
  errorCacheTTL: 86400, // 24 hours
  
  // Metrics caching
  metricsCacheTTL: 300, // 5 minutes
  
  // Security data
  blockedIPTTL: 86400, // 24 hours
  suspendedUserTTL: 86400, // 24 hours
  
  // Circuit breaker data
  circuitBreakerTTL: 300, // 5 minutes
};
```

## Monitoring and Alerting

### Alert Channels

Configure alert channels in your deployment:

```yaml
# docker-compose.yml or Kubernetes config
alerting:
  slack:
    webhook_url: ${SLACK_WEBHOOK_URL}
    channels:
      - "#ops-alerts"
      - "#security-alerts"
  
  email:
    smtp_server: ${SMTP_SERVER}
    recipients:
      - "ops-team@company.com"
      - "security-team@company.com"
  
  pagerduty:
    integration_key: ${PAGERDUTY_INTEGRATION_KEY}
    service_id: ${PAGERDUTY_SERVICE_ID}
```

### Dashboard URLs

Once deployed, access monitoring dashboards at:

- **Real-time Monitoring**: `http://localhost:3000/monitoring/realtime`
- **Error Dashboard**: `http://localhost:3000/monitoring/errors`
- **Security Dashboard**: `http://localhost:3000/monitoring/security`
- **Service Health**: `http://localhost:3000/monitoring/services`

## Testing

### Unit Tests

```typescript
// tests/errorHandling/CrossStreamErrorCoordinator.test.ts
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';

describe('CrossStreamErrorCoordinator', () => {
  it('should report and coordinate errors across streams', async () => {
    const error = new Error('Test error');
    const eventId = await crossStreamErrorCoordinator.reportError(
      error,
      {
        stream: 'frontend',
        component: 'TestComponent',
        operation: 'testOperation',
      }
    );
    
    expect(eventId).toBeDefined();
    
    const dashboard = await crossStreamErrorCoordinator.getErrorDashboard();
    expect(dashboard.overview.totalErrors).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// tests/integration/ErrorHandlingFlow.test.ts
describe('Error Handling Integration Flow', () => {
  it('should handle full error lifecycle', async () => {
    // Simulate error in frontend
    const errorId = await simulateFrontendError();
    
    // Verify cross-stream coordination
    const errorEvent = await waitForErrorEvent(errorId);
    expect(errorEvent).toBeDefined();
    
    // Verify user-friendly transformation
    const userError = await getUserFriendlyError(errorId);
    expect(userError.message).toContain('user-friendly');
    
    // Verify real-time notification
    const notification = await waitForWebSocketMessage();
    expect(notification.type).toBe('error_reported');
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile additions for monitoring
EXPOSE 8080 8081

# Install monitoring dependencies
RUN npm install ws

# Copy monitoring configurations
COPY src/services/ /app/src/services/
COPY src/patterns/ /app/src/patterns/
```

### Health Checks

```typescript
// health/errorHandlingHealth.ts
export const errorHandlingHealthCheck = async () => {
  const checks = {
    crossStreamCoordinator: await testCrossStreamCoordinator(),
    realTimeMonitoring: await testRealTimeMonitoring(),
    securityCoordinator: await testSecurityCoordinator(),
    externalServices: await testExternalServiceManager(),
  };

  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date(),
  };
};
```

## Performance Considerations

### Memory Management

- **Error Buffer**: Limited to 1000 recent errors per stream
- **Metrics Cache**: 5-minute TTL with Redis persistence  
- **WebSocket Connections**: Connection pooling with cleanup
- **Alert Queue**: Auto-cleanup of resolved alerts

### Performance Monitoring

```typescript
// Monitor error handling performance
const performanceMetrics = {
  errorProcessingTime: 'avg <50ms',
  memoryUsage: 'max 100MB for error buffers',
  websocketLatency: 'avg <10ms',
  alertProcessingTime: 'avg <100ms',
};
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check port availability (8080, 8081)
   - Verify firewall settings
   - Check Redis connectivity

2. **High Memory Usage**
   - Monitor error buffer sizes
   - Check alert queue cleanup
   - Verify TTL settings in Redis

3. **Missing Error Reports**
   - Verify middleware integration
   - Check error boundary placement
   - Test cross-stream coordinator initialization

### Debug Mode

Enable debug logging:

```bash
DEBUG=error-handling:* npm start
```

## Support

For questions or issues with the error handling system:

1. Check the troubleshooting section above
2. Review error logs in the monitoring dashboard  
3. Test individual components using provided test utilities
4. Contact the development team for complex integration issues

## Version History

- **v1.0.0**: Initial advanced error handling system with cross-stream coordination
  - Cross-stream error coordination
  - User experience error handling
  - External API error management
  - Production monitoring
  - Security error coordination
  - Frontend error boundary patterns
  - Real-time monitoring and alerting