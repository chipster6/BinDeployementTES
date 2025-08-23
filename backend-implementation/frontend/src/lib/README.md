# Enhanced API Client Documentation

This document provides comprehensive guidance on using the enhanced API client for the Waste Management System frontend application.

## Overview

The enhanced API client provides complete integration with all backend endpoints, including:

- **Route Optimization**: OR-Tools based route optimization with real-time adaptation
- **Predictive Analytics**: Prophet and LightGBM forecasting models
- **Security & Compliance**: Threat analysis, SOC 2 compliance, and HSM integration
- **External Services**: Traffic optimization and cost monitoring
- **Real-time Communication**: WebSocket support for live updates
- **Queue Management**: Background job monitoring and control

## Quick Start

### Basic Usage

```typescript
import { apiClient } from '@/lib/api';

// Authentication
const authResponse = await apiClient.login({
  email: 'user@example.com',
  password: 'password'
});

// Get user profile
const profile = await apiClient.getProfile();

// Fetch customers
const customers = await apiClient.getCustomers();
```

### Route Optimization

```typescript
// Optimize routes with constraints
const optimizationRequest = {
  serviceDay: 'monday',
  territory: 'north',
  maxVehicles: 5,
  optimizationLevel: 'balanced',
  includeTrafficData: true,
  minimizeDistance: true,
  timeWindows: [
    {
      customerId: '123',
      startTime: '08:00',
      endTime: '17:00',
      preferred: true
    }
  ]
};

const optimizedRoutes = await apiClient.optimizeRoutes(optimizationRequest);

// Real-time route adaptation
const modifications = [
  {
    routeId: '456',
    modificationType: 'emergency_insert',
    newStop: {
      customerId: '789',
      binIds: ['bin-1', 'bin-2'],
      priority: 'emergency'
    }
  }
];

const updatedRoutes = await apiClient.adaptRoutes(modifications);

// Get optimization performance metrics
const metrics = await apiClient.getOptimizationPerformance('weekly');
```

### Predictive Analytics

```typescript
// Generate demand forecast
const forecastRequest = {
  target: 'demand',
  timeframe: '30d',
  granularity: 'daily',
  modelPreference: 'prophet'
};

const forecast = await apiClient.generateForecast(forecastRequest);

// Train Prophet model
const prophetData = {
  data: [
    { ds: '2025-01-01', y: 100 },
    { ds: '2025-01-02', y: 105 }
  ],
  config: {
    periods: 30,
    growth: 'linear'
  }
};

const prophetModel = await apiClient.trainProphetModel(prophetData);

// Make LightGBM predictions
const features = [[1, 2, 3], [4, 5, 6]];
const predictions = await apiClient.makeLightGBMPredictions('model-id', features);
```

### Security & Compliance

```typescript
// Analyze potential threat
const threatRequest = {
  ipAddress: '192.168.1.100',
  action: 'login_attempt',
  resource: '/api/admin',
  userId: '123',
  context: { suspicious: true }
};

const threatAnalysis = await apiClient.analyzeThreat(threatRequest);

// Check SOC 2 compliance status
const complianceStatus = await apiClient.getSOC2ComplianceStatus();

// Generate HSM key
const hsmKey = await apiClient.generateHSMKey(
  'payment-encryption-key',
  'AES-256',
  'encrypt_decrypt',
  'quarterly'
);

// Encrypt data with HSM
const encryptionResult = await apiClient.encryptWithHSM(
  'sensitive data',
  hsmKey.data.keyId
);
```

### External Services Coordination

```typescript
// Get external services status
const servicesStatus = await apiClient.getExternalServicesStatus();

// Optimize traffic routing
const trafficRequest = {
  routes: optimizedRoutes.data,
  includeRealTimeTraffic: true,
  priority: 'time',
  weatherConditions: {
    temperature: 25,
    conditions: 'clear',
    windSpeed: 10,
    visibility: 100
  }
};

const trafficOptimization = await apiClient.optimizeTraffic(trafficRequest);

// Monitor service costs
const costMetrics = await apiClient.getCostMonitoringMetrics();
```

### Real-time WebSocket Communication

```typescript
// Subscribe to real-time monitoring updates
apiClient.subscribeToMonitoring((event) => {
  console.log('Monitoring update:', event);
  if (event.type === 'alert_fired') {
    // Handle alert
  }
});

// Subscribe to route optimization updates
apiClient.subscribeToRouteUpdates((event) => {
  console.log('Route update:', event);
  if (event.type === 'optimization_completed') {
    // Update UI with new routes
  }
});

// Subscribe to security events
apiClient.subscribeToSecurity((event) => {
  console.log('Security event:', event);
  if (event.type === 'threat_detected') {
    // Show security alert
  }
});

// Access WebSocket client directly for advanced usage
const wsClient = apiClient.getWebSocketClient();
await wsClient.connect('monitoring');
```

### Queue & Job Management

```typescript
// Get queue status
const queueStatus = await apiClient.getQueueStatus();
const queueStats = await apiClient.getQueueStats();

// Monitor failed jobs
const failedJobs = await apiClient.getQueueJobs('failed');

// Retry a failed job
await apiClient.retryJob('job-123');

// Purge completed jobs
await apiClient.purgeCompletedJobs();
```

## API Client Configuration

The API client supports various configuration options:

```typescript
import { ApiClient } from '@/lib/api';

const customApiClient = new ApiClient();

// Configure request interceptors
customApiClient.addRequestInterceptor((config) => {
  // Add custom headers
  config.headers = {
    ...config.headers,
    'X-Custom-Header': 'value'
  };
  return config;
});

// Configure response interceptors
customApiClient.addResponseInterceptor({
  onFulfilled: (response) => {
    // Log successful responses
    console.log('API response:', response);
    return response;
  },
  onRejected: (error) => {
    // Handle errors globally
    console.error('API error:', error);
    throw error;
  }
});
```

## Error Handling

The API client provides comprehensive error handling:

```typescript
try {
  const result = await apiClient.optimizeRoutes(request);
  if (result.success) {
    // Handle success
    console.log('Routes optimized:', result.data);
  } else {
    // Handle API error
    console.error('Optimization failed:', result.message);
    if (result.errors) {
      result.errors.forEach(error => {
        console.error(`Field ${error.field}: ${error.message}`);
      });
    }
  }
} catch (error) {
  // Handle network or other errors
  console.error('Request failed:', error);
}
```

## TypeScript Support

All API methods are fully typed with TypeScript interfaces:

```typescript
import {
  OptimizationRequest,
  OptimizedRoute,
  ForecastRequest,
  ForecastResult,
  ThreatAnalysisRequest,
  SOC2ComplianceStatus
} from '@/lib/types';

// Type-safe API calls
const request: OptimizationRequest = {
  optimizationLevel: 'balanced', // Autocomplete available
  includeTrafficData: true
};

const response: ApiResponse<OptimizedRoute[]> = await apiClient.optimizeRoutes(request);
```

## Best Practices

### 1. Error Handling
Always check the `success` property of API responses:

```typescript
const response = await apiClient.generateForecast(request);
if (response.success) {
  // Use response.data
} else {
  // Handle error using response.message and response.errors
}
```

### 2. Authentication
Handle token expiration gracefully:

```typescript
// The API client automatically handles token refresh
// If refresh fails, the user will be redirected to login
```

### 3. Real-time Updates
Clean up WebSocket subscriptions when components unmount:

```typescript
useEffect(() => {
  const handleRouteUpdate = (event) => {
    // Handle update
  };
  
  apiClient.subscribeToRouteUpdates(handleRouteUpdate);
  
  return () => {
    // WebSocket connections are managed automatically
    // but you can disconnect manually if needed
    apiClient.disconnectFromRealTime();
  };
}, []);
```

### 4. Performance
Use appropriate caching and batching for frequent requests:

```typescript
// Use batch forecasting for multiple predictions
const batchRequest = [
  { target: 'demand', timeframe: '7d' },
  { target: 'revenue', timeframe: '7d' }
];

const batchResults = await apiClient.generateBatchForecast(batchRequest);
```

## Environment Configuration

Configure API endpoints using environment variables:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

The API client automatically uses these environment variables or falls back to defaults.

## Advanced Features

### Custom Request Configuration

```typescript
// Configure timeout and retry behavior
const response = await apiClient.request('/custom-endpoint', {
  timeout: 60000, // 60 seconds
  retry: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential'
  }
});
```

### Network Status Monitoring

```typescript
const networkStatus = apiClient.getNetworkStatus();
console.log('Online:', networkStatus.isOnline);
console.log('Connection type:', networkStatus.effectiveType);
```

This enhanced API client provides a complete interface to all backend services with type safety, error handling, and real-time capabilities for building robust frontend applications.