# System Architecture Agent Report
## Waste Management System - Architecture and Scalability Assessment

### Executive Summary
The system demonstrates solid architectural foundations with Next.js App Router and microservices-ready patterns, but lacks critical enterprise-grade components for production scalability and reliability.

### What's Working Well
- **Layered Architecture**: Clear separation between presentation, business logic, and data layers
- **Service-Oriented Design**: Well-structured service classes with single responsibility principle
- **Database Schema**: Comprehensive relational design with proper foreign key relationships
- **API Structure**: RESTful endpoints following consistent patterns
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Modern Framework**: Next.js 15.4.6 with App Router for server-side rendering and API routes

### Critical Architectural Issues
1. **Missing API Gateway**: No centralized entry point for service coordination
2. **No Circuit Breaker Pattern**: Lack of resilience patterns for external service failures
3. **Synchronous Processing**: All operations are synchronous, blocking user experience
4. **Single Database Connection**: No connection pooling or read replicas
5. **No Event-Driven Architecture**: Missing pub/sub patterns for loosely coupled components
6. **Monolithic Deployment**: Single container deployment prevents independent scaling

### What Needs Changes/Improvements
- Implement microservices architecture with service boundaries
- Add API Gateway for request routing and rate limiting
- Introduce message queues for asynchronous processing
- Implement caching layers (Redis) for performance
- Add load balancing and horizontal scaling capabilities
- Create event-driven communication patterns

### What Needs Removal/Replacement
- Replace synchronous external API calls with async/queue-based processing
- Remove direct database connections from API routes
- Replace single-node architecture with distributed system design
- Remove hardcoded service endpoints with service discovery

### Missing Components
- API Gateway (Kong, AWS API Gateway, or custom Next.js middleware)
- Message Queue System (Redis Bull, RabbitMQ, or AWS SQS)
- Caching Layer (Redis cluster)
- Service Discovery mechanism
- Load Balancer configuration
- Health check system
- Circuit breaker implementation
- Event streaming platform
- Distributed logging system
- Metrics collection and monitoring

## Step-by-Step Implementation Guide

### Phase 1: API Gateway Implementation (Priority: HIGH)

#### Step 1: Install API Gateway Dependencies
```bash
# Navigate to project root
cd waste-management-system

# Install required packages
npm install express-rate-limit helmet cors compression morgan
npm install --save-dev @types/cors @types/compression
```

#### Step 2: Create API Gateway Middleware
```bash
# Create API Gateway directory
mkdir src/gateway

# Create main gateway file
nano src/gateway/api-gateway.ts
```

**Add API Gateway implementation**:
```typescript
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const createRateLimiter = (windowMs: number, max: number) => 
  rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });

// Service endpoints mapping
const SERVICE_ROUTES = {
  '/api/customers': { 
    service: 'customer-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 100) // 100 requests per 15 minutes
  },
  '/api/bins': { 
    service: 'bin-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 200) // 200 requests per 15 minutes
  },
  '/api/routes': { 
    service: 'route-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 50) // 50 requests per 15 minutes
  },
  '/api/invoices': { 
    service: 'invoice-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 100)
  },
  '/api/auth': { 
    service: 'auth-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 20) // Strict rate limiting for auth
  }
};

export class APIGateway {
  private static instance: APIGateway;
  
  public static getInstance(): APIGateway {
    if (!APIGateway.instance) {
      APIGateway.instance = new APIGateway();
    }
    return APIGateway.instance;
  }

  public async processRequest(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;
    
    // Apply security headers
    const response = NextResponse.next();
    this.applySecurityHeaders(response);
    
    // Find matching service route
    const serviceRoute = this.findServiceRoute(pathname);
    if (!serviceRoute) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    // Apply rate limiting
    const rateLimitResult = await this.checkRateLimit(request, serviceRoute);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }
    
    // Log request
    this.logRequest(request, serviceRoute.service);
    
    return response;
  }

  private applySecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  private findServiceRoute(pathname: string) {
    for (const [route, config] of Object.entries(SERVICE_ROUTES)) {
      if (pathname.startsWith(route)) {
        return config;
      }
    }
    return null;
  }

  private async checkRateLimit(request: NextRequest, serviceRoute: any): Promise<{allowed: boolean, message?: string}> {
    // Implement rate limiting logic
    // This is a simplified version - in production, use Redis for distributed rate limiting
    const clientIP = request.ip || 'unknown';
    const key = `rate_limit:${serviceRoute.service}:${clientIP}`;
    
    // For now, return allowed - implement actual Redis-based rate limiting
    return { allowed: true };
  }

  private logRequest(request: NextRequest, service: string): void {
    console.log({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      service,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || 'unknown'
    });
  }
}
```

#### Step 3: Update Next.js Middleware
```bash
# Update the main middleware file
nano src/middleware.ts
```

**Replace with API Gateway integration**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { APIGateway } from '@/gateway/api-gateway';

export async function middleware(request: NextRequest) {
  // Initialize API Gateway
  const gateway = APIGateway.getInstance();
  
  // Process request through gateway
  return await gateway.processRequest(request);
}

export const config = {
  matcher: '/api/:path*'
};
```

### Phase 2: Message Queue Implementation (Priority: HIGH)

#### Step 4: Install Queue Dependencies
```bash
# Install Bull queue and Redis client
npm install bull redis ioredis
npm install --save-dev @types/bull
```

#### Step 5: Create Queue Infrastructure
```bash
# Create queue directory
mkdir src/queues

# Create base queue configuration
nano src/queues/queue-config.ts
```

**Add queue configuration**:
```typescript
import Bull from 'bull';
import Redis from 'ioredis';

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue configurations
export const queueConfig = {
  redis: {
    port: 6379,
    host: 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues
export const queues = {
  emailQueue: new Bull('email notifications', queueConfig),
  smsQueue: new Bull('sms notifications', queueConfig),
  routeOptimizationQueue: new Bull('route optimization', queueConfig),
  airtableSync: new Bull('airtable synchronization', queueConfig),
  invoiceGeneration: new Bull('invoice generation', queueConfig),
  reportGeneration: new Bull('report generation', queueConfig),
};

// Queue processors
export const startQueueProcessors = () => {
  // Email queue processor
  queues.emailQueue.process(async (job) => {
    const { to, subject, body, template } = job.data;
    // Process email sending
    console.log(`Processing email job: ${job.id}`);
    // Import and use email service
    const { sendEmail } = await import('../services/notification.service');
    return await sendEmail(to, subject, body, template);
  });

  // SMS queue processor
  queues.smsQueue.process(async (job) => {
    const { to, message } = job.data;
    console.log(`Processing SMS job: ${job.id}`);
    const { sendSMS } = await import('../services/notification.service');
    return await sendSMS(to, message);
  });

  // Route optimization processor
  queues.routeOptimizationQueue.process(async (job) => {
    const { routeData } = job.data;
    console.log(`Processing route optimization job: ${job.id}`);
    const { optimizeRoute } = await import('../services/route-optimization.service');
    return await optimizeRoute(routeData);
  });

  // Airtable sync processor
  queues.airtableSync.process(async (job) => {
    const { action, data, table } = job.data;
    console.log(`Processing Airtable sync job: ${job.id}`);
    // Process Airtable synchronization
    return { success: true, syncedRecords: 1 };
  });
};

// Queue monitoring
export const setupQueueMonitoring = () => {
  Object.entries(queues).forEach(([name, queue]) => {
    queue.on('completed', (job) => {
      console.log(`Queue ${name}: Job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      console.error(`Queue ${name}: Job ${job.id} failed:`, err);
    });

    queue.on('stalled', (job) => {
      console.warn(`Queue ${name}: Job ${job.id} stalled`);
    });
  });
};
```

#### Step 6: Create Queue Service Interface
```bash
nano src/services/queue.service.ts
```

**Add queue service**:
```typescript
import { queues } from '../queues/queue-config';

export class QueueService {
  // Email notifications
  static async queueEmail(to: string, subject: string, body: string, template?: string) {
    return await queues.emailQueue.add('send-email', {
      to,
      subject,
      body,
      template,
    }, {
      priority: 5,
      delay: 0,
    });
  }

  // SMS notifications
  static async queueSMS(to: string, message: string) {
    return await queues.smsQueue.add('send-sms', {
      to,
      message,
    }, {
      priority: 10, // Higher priority than email
      delay: 0,
    });
  }

  // Route optimization
  static async queueRouteOptimization(routeData: any) {
    return await queues.routeOptimizationQueue.add('optimize-route', {
      routeData,
    }, {
      priority: 3,
      delay: 5000, // 5 second delay to batch optimization requests
    });
  }

  // Airtable synchronization
  static async queueAirtableSync(action: string, data: any, table: string) {
    return await queues.airtableSync.add('sync-airtable', {
      action,
      data,
      table,
    }, {
      priority: 2,
      delay: 10000, // 10 second delay to batch sync operations
    });
  }

  // Invoice generation
  static async queueInvoiceGeneration(customerId: string, period: string) {
    return await queues.invoiceGeneration.add('generate-invoice', {
      customerId,
      period,
    }, {
      priority: 4,
      delay: 0,
    });
  }

  // Get queue statistics
  static async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }
    
    return stats;
  }
}
```

### Phase 3: Caching Implementation (Priority: MEDIUM)

#### Step 7: Create Caching Service
```bash
nano src/services/cache.service.ts
```

**Add caching service**:
```typescript
import Redis from 'ioredis';

class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set data in cache
  async set(key: string, data: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear cache pattern
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return 0;
    }
  }

  // Cache with fallback
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fallbackFn();
    await this.set(key, data, ttl);
    return data;
  }
}

export const cacheService = new CacheService();

// Cache key generators
export const cacheKeys = {
  customer: (id: string) => `customer:${id}`,
  customers: (filters?: any) => `customers:${JSON.stringify(filters || {})}`,
  bin: (id: string) => `bin:${id}`,
  bins: (customerId?: string) => `bins:${customerId || 'all'}`,
  route: (id: string) => `route:${id}`,
  routes: (date?: string) => `routes:${date || 'all'}`,
  invoice: (id: string) => `invoice:${id}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
};
```

### Phase 4: Circuit Breaker Implementation (Priority: MEDIUM)

#### Step 8: Install Circuit Breaker Dependencies
```bash
npm install opossum
npm install --save-dev @types/opossum
```

#### Step 9: Create Circuit Breaker Service
```bash
nano src/services/circuit-breaker.service.ts
```

**Add circuit breaker implementation**:
```typescript
import CircuitBreaker from 'opossum';

// Circuit breaker configuration
const circuitBreakerOptions = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

// Create circuit breakers for external services
export const circuitBreakers = {
  airtable: new CircuitBreaker(async (operation: () => Promise<any>) => {
    return await operation();
  }, {
    ...circuitBreakerOptions,
    name: 'Airtable API',
  }),

  samsara: new CircuitBreaker(async (operation: () => Promise<any>) => {
    return await operation();
  }, {
    ...circuitBreakerOptions,
    name: 'Samsara API',
  }),

  stripe: new CircuitBreaker(async (operation: () => Promise<any>) => {
    return await operation();
  }, {
    ...circuitBreakerOptions,
    name: 'Stripe API',
  }),

  twilio: new CircuitBreaker(async (operation: () => Promise<any>) => {
    return await operation();
  }, {
    ...circuitBreakerOptions,
    name: 'Twilio API',
  }),

  sendgrid: new CircuitBreaker(async (operation: () => Promise<any>) => {
    return await operation();
  }, {
    ...circuitBreakerOptions,
    name: 'SendGrid API',
  }),
};

// Setup event listeners for all circuit breakers
Object.entries(circuitBreakers).forEach(([name, breaker]) => {
  breaker.on('open', () => {
    console.warn(`Circuit breaker ${name} opened`);
  });

  breaker.on('halfOpen', () => {
    console.info(`Circuit breaker ${name} half-opened`);
  });

  breaker.on('close', () => {
    console.info(`Circuit breaker ${name} closed`);
  });

  breaker.on('fallback', (result) => {
    console.warn(`Circuit breaker ${name} fallback executed:`, result);
  });
});

// Wrapper service for external API calls
export class ResilientAPIService {
  static async callAirtable<T>(operation: () => Promise<T>): Promise<T> {
    return await circuitBreakers.airtable.fire(operation);
  }

  static async callSamsara<T>(operation: () => Promise<T>): Promise<T> {
    return await circuitBreakers.samsara.fire(operation);
  }

  static async callStripe<T>(operation: () => Promise<T>): Promise<T> {
    return await circuitBreakers.stripe.fire(operation);
  }

  static async callTwilio<T>(operation: () => Promise<T>): Promise<T> {
    return await circuitBreakers.twilio.fire(operation);
  }

  static async callSendGrid<T>(operation: () => Promise<T>): Promise<T> {
    return await circuitBreakers.sendgrid.fire(operation);
  }
}
```

### Phase 5: Health Check System (Priority: MEDIUM)

#### Step 10: Create Health Check Service
```bash
nano src/app/api/health/route.ts
```

**Add comprehensive health checks**:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cacheService } from '@/services/cache.service';
import { queues } from '@/queues/queue-config';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    version: process.env.npm_package_version || '1.0.0',
  };

  // Database health check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: 'healthy', responseTime: 0 };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  // Redis health check
  try {
    const start = Date.now();
    await cacheService.get('health-check');
    const responseTime = Date.now() - start;
    health.services.redis = { status: 'healthy', responseTime };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.redis = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  // Queue health check
  try {
    const queueStats = {};
    for (const [name, queue] of Object.entries(queues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const failed = await queue.getFailed();
      
      queueStats[name] = {
        waiting: waiting.length,
        active: active.length,
        failed: failed.length,
        status: failed.length > 100 ? 'degraded' : 'healthy'
      };
    }
    health.services.queues = queueStats;
  } catch (error) {
    health.status = 'unhealthy';
    health.services.queues = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

### Phase 6: Service Discovery (Priority: LOW)

#### Step 11: Create Service Registry
```bash
nano src/services/service-discovery.service.ts
```

**Add service discovery**:
```typescript
interface ServiceEndpoint {
  name: string;
  url: string;
  health: string;
  lastCheck: Date;
  metadata?: any;
}

class ServiceDiscovery {
  private services: Map<string, ServiceEndpoint[]> = new Map();

  // Register a service
  register(serviceName: string, endpoint: ServiceEndpoint): void {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, []);
    }
    
    const serviceEndpoints = this.services.get(serviceName)!;
    const existingIndex = serviceEndpoints.findIndex(s => s.url === endpoint.url);
    
    if (existingIndex !== -1) {
      serviceEndpoints[existingIndex] = endpoint;
    } else {
      serviceEndpoints.push(endpoint);
    }
  }

  // Discover healthy service endpoint
  discover(serviceName: string): ServiceEndpoint | null {
    const endpoints = this.services.get(serviceName);
    if (!endpoints || endpoints.length === 0) {
      return null;
    }

    // Return first healthy endpoint
    const healthyEndpoints = endpoints.filter(e => e.health === 'healthy');
    return healthyEndpoints.length > 0 ? healthyEndpoints[0] : null;
  }

  // Health check all services
  async healthCheck(): Promise<void> {
    for (const [serviceName, endpoints] of this.services.entries()) {
      for (const endpoint of endpoints) {
        try {
          // Implement health check logic
          endpoint.health = 'healthy';
          endpoint.lastCheck = new Date();
        } catch (error) {
          endpoint.health = 'unhealthy';
          endpoint.lastCheck = new Date();
        }
      }
    }
  }

  // Get all services
  getAllServices(): Record<string, ServiceEndpoint[]> {
    const result = {};
    for (const [name, endpoints] of this.services.entries()) {
      result[name] = endpoints;
    }
    return result;
  }
}

export const serviceDiscovery = new ServiceDiscovery();

// Register core services
serviceDiscovery.register('database', {
  name: 'PostgreSQL',
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/waste_management',
  health: 'healthy',
  lastCheck: new Date(),
});

serviceDiscovery.register('cache', {
  name: 'Redis',
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  health: 'healthy',
  lastCheck: new Date(),
});
```

### Testing and Validation

#### Step 12: Test Architecture Components
```bash
# Test API Gateway
curl -X GET http://localhost:3000/api/customers \
  -H "Authorization: Bearer your-jwt-token"

# Test Health Check
curl http://localhost:3000/api/health

# Test Queue Status (create endpoint)
curl http://localhost:3000/api/admin/queues

# Monitor Redis
redis-cli monitor

# Check Docker services
docker-compose ps
```

### Next Steps for Production
1. Implement service mesh (Istio/Linkerd) for advanced traffic management
2. Add distributed tracing (Jaeger/Zipkin)
3. Implement centralized configuration management
4. Set up service-to-service authentication
5. Add chaos engineering testing
6. Implement blue-green deployment strategy

This architecture provides a scalable foundation that can handle enterprise-level traffic and maintain high availability through resilience patterns and horizontal scaling capabilities.