import { NextRequest, NextResponse } from 'next/server';

// Rate limiting in-memory store (in production, use Redis)
class InMemoryRateLimit {
  private store = new Map<string, { count: number; resetTime: number }>();

  check(key: string, windowMs: number, maxRequests: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window or expired window
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    this.store.set(key, entry);
    return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (request: NextRequest) => string;
}

const rateLimiter = new InMemoryRateLimit();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

const createRateLimiter = (windowMs: number, max: number): RateLimitConfig => ({
  windowMs,
  max,
  keyGenerator: (request: NextRequest) => {
    return request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  }
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
  },
  '/api/health': {
    service: 'health-service',
    rateLimit: createRateLimiter(5 * 60 * 1000, 60) // 60 requests per 5 minutes
  },
  '/api/admin': {
    service: 'admin-service',
    rateLimit: createRateLimiter(15 * 60 * 1000, 30) // 30 requests per 15 minutes
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
    const method = request.method;
    const startTime = Date.now();
    
    // Find matching service route
    const serviceRoute = this.findServiceRoute(pathname);
    if (!serviceRoute) {
      const response = NextResponse.json({ error: 'Service not found' }, { status: 404 });
      this.applySecurityHeaders(response);
      this.logRequest(request, null, 404, Date.now() - startTime);
      return response;
    }
    
    // Apply rate limiting
    const rateLimitResult = await this.checkRateLimit(request, serviceRoute);
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { 
          error: 'Too many requests', 
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }, 
        { status: 429 }
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', serviceRoute.rateLimit.max.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
      
      this.applySecurityHeaders(response);
      this.logRequest(request, serviceRoute.service, 429, Date.now() - startTime);
      return response;
    }

    // Create response that continues to the actual API route
    const response = NextResponse.next();
    
    // Apply security headers
    this.applySecurityHeaders(response);
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', serviceRoute.rateLimit.max.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    
    // Add request tracking headers
    response.headers.set('X-Request-ID', crypto.randomUUID());
    response.headers.set('X-Service', serviceRoute.service);
    
    // Log request
    this.logRequest(request, serviceRoute.service, 200, Date.now() - startTime);
    
    return response;
  }

  private applySecurityHeaders(response: NextResponse): void {
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-src 'none';");
    
    // CORS headers (if needed)
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  private findServiceRoute(pathname: string) {
    for (const [route, config] of Object.entries(SERVICE_ROUTES)) {
      if (pathname.startsWith(route)) {
        return config;
      }
    }
    return null;
  }

  private async checkRateLimit(
    request: NextRequest, 
    serviceRoute: any
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; message?: string }> {
    const { rateLimit } = serviceRoute;
    const clientIP = rateLimit.keyGenerator ? rateLimit.keyGenerator(request) : 'unknown';
    const key = `rate_limit:${serviceRoute.service}:${clientIP}`;
    
    const result = rateLimiter.check(key, rateLimit.windowMs, rateLimit.max);
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      message: result.allowed ? undefined : 'Rate limit exceeded'
    };
  }

  private logRequest(
    request: NextRequest, 
    service: string | null, 
    statusCode: number, 
    responseTime: number
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      pathname: request.nextUrl.pathname,
      service: service || 'unknown',
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      referer: request.headers.get('referer'),
      contentLength: request.headers.get('content-length'),
    };

    // In production, use structured logging (Winston, Pino, etc.)
    console.log('[API Gateway]', JSON.stringify(logData));
  }

  // Method to get gateway statistics
  public getStats() {
    return {
      services: Object.keys(SERVICE_ROUTES),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Method to update rate limits dynamically
  public updateRateLimit(service: string, windowMs: number, max: number) {
    for (const [route, config] of Object.entries(SERVICE_ROUTES)) {
      if (config.service === service) {
        config.rateLimit = createRateLimiter(windowMs, max);
        break;
      }
    }
  }
}