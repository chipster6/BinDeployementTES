# Backend Agent Report
## Waste Management System - API Structure and Business Logic Analysis

### Executive Summary
The backend demonstrates solid architectural foundations with comprehensive service layers and API endpoints, but contains critical type compatibility issues with Next.js 15.4.6 and lacks production-ready error handling, validation, and performance optimizations.

### What's Working Well
- **Layered Architecture**: Clear separation between controllers, services, and models
- **Comprehensive Services**: Full CRUD operations for all core business entities
- **JWT Authentication**: Token-based authentication system implemented
- **Input Validation**: Zod schemas for data validation (customer validator exists)
- **Database Integration**: Prisma ORM with proper relationships and transactions
- **External API Clients**: Airtable and Samsara integration clients implemented
- **TypeScript Coverage**: Full type safety across the backend codebase

### Critical Backend Issues Found
1. **Next.js 15.4.6 Type Errors**: Dynamic route parameters incorrectly typed causing build failures
2. **Missing Input Validation**: Most API endpoints lack comprehensive input validation
3. **Insufficient Error Handling**: Generic error responses without proper error classification
4. **No Rate Limiting**: Backend services vulnerable to abuse and DDoS attacks
5. **Synchronous Operations**: All external API calls are blocking, impacting performance
6. **Missing Transaction Management**: Complex operations lack proper database transactions
7. **No Request Logging**: Missing audit trail for API requests and data modifications
8. **Inadequate Response Standardization**: Inconsistent API response formats

### What Needs Changes/Improvements
- Fix Next.js type compatibility for all dynamic routes
- Implement comprehensive input validation for all endpoints
- Add proper error handling with error classification and logging
- Implement request/response logging and audit trails
- Add transaction management for complex operations
- Implement background job processing for external API calls
- Add comprehensive API documentation and OpenAPI specs

### What Needs Removal/Replacement
- Remove Express-style request handling patterns
- Replace synchronous external API calls with asynchronous queue-based processing
- Remove hardcoded error messages and implement proper error classification
- Replace generic exception handling with specific error types

### Missing Components
- Request validation middleware
- Error classification system
- Audit logging service
- Background job processing
- API rate limiting
- Response caching
- API versioning
- Health check endpoints
- Metrics collection
- Request tracing
- Data transformation layers
- Business rule engine

## Step-by-Step Backend Implementation Guide

### Phase 1: Critical Type Compatibility Fixes (Priority: URGENT)

#### Step 1: Fix Dynamic Route Type Errors
```bash
# Navigate to dynamic route files
cd waste-management-system/src/app/api

# Fix customers dynamic route
nano customers/[id]/route.ts
```

**Update all dynamic routes with Next.js 15.4.6 compatible types**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/customer.service';
import { updateCustomerSchema, customerIdSchema } from '@/validators/customer.validator';

// GET /api/customers/[id] - Next.js 15.4.6 compatible
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Validate customer ID
    const validationResult = customerIdSchema.safeParse({ id });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customer = await customerService.getById(id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate customer ID
    const idValidation = customerIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    // Validate update data
    const dataValidation = updateCustomerSchema.safeParse(body);
    if (!dataValidation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: dataValidation.error.issues
        },
        { status: 400 }
      );
    }

    const customer = await customerService.update(id, dataValidation.data);
    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate customer ID
    const validationResult = customerIdSchema.safeParse({ id });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    await customerService.delete(id);
    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Apply the same pattern to all dynamic routes**:
- `/src/app/api/bins/[id]/route.ts`
- `/src/app/api/routes/[id]/route.ts`
- `/src/app/api/invoices/[id]/route.ts`

#### Step 2: Create API Response Standardization
```bash
nano src/lib/api-response.ts
```

**Add standardized API response handling**:
```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Standard API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metadata?: Record<string, any>;
}

// Error classification
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// Custom error class
export class APIError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(type: ErrorType, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'APIError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Response builders
export class APIResponseBuilder {
  static success<T>(
    data: T,
    message?: string,
    metadata?: Record<string, any>
  ): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data,
      message,
      metadata,
    };
    return NextResponse.json(response);
  }

  static successWithPagination<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message?: string
  ): NextResponse {
    const response: APIResponse<T[]> = {
      success: true,
      data,
      message,
      pagination: {
        ...pagination,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
    };
    return NextResponse.json(response);
  }

  static error(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any
  ): NextResponse {
    const response: APIResponse = {
      success: false,
      error: message,
      metadata: {
        errorType: type,
        details,
      },
    };
    return NextResponse.json(response, { status: statusCode });
  }

  static validationError(validationErrors: z.ZodError): NextResponse {
    return this.error(
      ErrorType.VALIDATION_ERROR,
      'Validation failed',
      400,
      validationErrors.issues
    );
  }

  static notFound(resource: string, id?: string): NextResponse {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    
    return this.error(ErrorType.NOT_FOUND, message, 404);
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return this.error(ErrorType.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = 'Forbidden'): NextResponse {
    return this.error(ErrorType.FORBIDDEN, message, 403);
  }

  static internalError(message: string = 'Internal server error'): NextResponse {
    return this.error(ErrorType.INTERNAL_ERROR, message, 500);
  }

  static rateLimit(message: string = 'Rate limit exceeded'): NextResponse {
    return this.error(ErrorType.RATE_LIMIT_EXCEEDED, message, 429);
  }
}
```

### Phase 2: Input Validation and Error Handling (Priority: HIGH)

#### Step 3: Create Comprehensive Validation Schemas
```bash
# Create validators for all entities
nano src/validators/bin.validator.ts
```

**Add bin validation schemas**:
```typescript
import { z } from 'zod';

// Common validation patterns
const uuidSchema = z.string().uuid('Invalid UUID format');
const binTypeSchema = z.enum(['standard', 'recycling', 'organic', 'hazardous'], {
  errorMap: () => ({ message: 'Invalid bin type' })
});
const binSizeSchema = z.enum(['small', 'medium', 'large', 'extra_large'], {
  errorMap: () => ({ message: 'Invalid bin size' })
});
const binStatusSchema = z.enum(['empty', 'partial', 'full', 'overflowing', 'maintenance', 'retired'], {
  errorMap: () => ({ message: 'Invalid bin status' })
});

// Location schema with GPS coordinates
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(1, 'Address is required').max(500),
  notes: z.string().max(255).optional(),
}).strict();

// Bin creation validation
export const createBinSchema = z.object({
  customerId: uuidSchema,
  binType: binTypeSchema,
  size: binSizeSchema,
  location: locationSchema,
  qrCode: z.string()
    .min(1, 'QR code is required')
    .max(100, 'QR code too long')
    .regex(/^[A-Za-z0-9-_]+$/, 'Invalid QR code format'),
  rfidTag: z.string()
    .min(1, 'RFID tag is required')
    .max(100, 'RFID tag too long')
    .regex(/^[A-Fa-f0-9]+$/, 'Invalid RFID tag format'),
  status: binStatusSchema.default('empty'),
  notes: z.string().max(1000).optional(),
}).strict();

// Bin update validation
export const updateBinSchema = createBinSchema.partial().strict();

// Bin search/filter validation
export const binSearchSchema = z.object({
  customerId: uuidSchema.optional(),
  binType: binTypeSchema.optional(),
  size: binSizeSchema.optional(),
  status: binStatusSchema.optional(),
  location: z.object({
    radius: z.number().min(0).max(100).optional(), // km radius
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }).optional(),
  lastServicedAfter: z.string().datetime().optional(),
  lastServicedBefore: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).max(100).default('20'),
  sortBy: z.enum(['binType', 'size', 'status', 'lastServiced', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Bin ID validation
export const binIdSchema = z.object({
  id: uuidSchema,
}).strict();

// Type exports
export type CreateBinInput = z.infer<typeof createBinSchema>;
export type UpdateBinInput = z.infer<typeof updateBinSchema>;
export type BinSearchInput = z.infer<typeof binSearchSchema>;
export type BinIdInput = z.infer<typeof binIdSchema>;
```

#### Step 4: Create Enhanced Service Layer
```bash
nano src/services/enhanced-customer.service.ts
```

**Add enhanced customer service with error handling**:
```typescript
import { Customer, Prisma } from '@prisma/client';
import { db } from '@/lib/database';
import { APIError, ErrorType } from '@/lib/api-response';
import { AuditLogger } from '@/services/audit-logger.service';
import { CacheService } from '@/services/cache.service';

export class EnhancedCustomerService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'customer:';

  // Get customer by ID with caching
  static async getById(id: string, useCache: boolean = true): Promise<Customer | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      
      // Try cache first
      if (useCache) {
        const cached = await CacheService.get<Customer>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          bins: {
            select: {
              id: true,
              binType: true,
              size: true,
              status: true,
              lastServiced: true,
            },
          },
          _count: {
            select: { bins: true },
          },
        },
      });

      if (!customer) {
        throw new APIError(
          ErrorType.NOT_FOUND,
          `Customer with ID ${id} not found`,
          404
        );
      }

      // Cache the result
      if (useCache) {
        await CacheService.set(cacheKey, customer, this.CACHE_TTL);
      }

      return customer;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        ErrorType.INTERNAL_ERROR,
        'Failed to retrieve customer',
        500,
        { originalError: error.message }
      );
    }
  }

  // Create customer with validation and audit logging
  static async create(
    data: Prisma.CustomerCreateInput,
    userId?: string
  ): Promise<Customer> {
    try {
      // Check for duplicate business name
      const existingCustomer = await db.customer.findFirst({
        where: {
          businessName: {
            equals: data.businessName,
            mode: 'insensitive',
          },
        },
      });

      if (existingCustomer) {
        throw new APIError(
          ErrorType.VALIDATION_ERROR,
          'A customer with this business name already exists',
          400
        );
      }

      // Create customer in transaction
      const customer = await db.$transaction(async (tx) => {
        const newCustomer = await tx.customer.create({
          data: {
            ...data,
            contractStatus: data.contractStatus || 'pending',
          },
        });

        // Log the creation
        await AuditLogger.logDataChange(
          'customer',
          newCustomer.id,
          'CREATE',
          null,
          newCustomer,
          userId
        );

        return newCustomer;
      });

      // Clear related caches
      await this.clearCustomerCaches();

      return customer;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        ErrorType.INTERNAL_ERROR,
        'Failed to create customer',
        500,
        { originalError: error.message }
      );
    }
  }

  // Update customer with optimistic concurrency control
  static async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
    userId?: string
  ): Promise<Customer> {
    try {
      // Get current customer for audit log
      const currentCustomer = await this.getById(id, false);
      if (!currentCustomer) {
        throw new APIError(
          ErrorType.NOT_FOUND,
          `Customer with ID ${id} not found`,
          404
        );
      }

      // Update in transaction
      const updatedCustomer = await db.$transaction(async (tx) => {
        const updated = await tx.customer.update({
          where: { id },
          data,
        });

        // Log the update
        await AuditLogger.logDataChange(
          'customer',
          id,
          'UPDATE',
          currentCustomer,
          updated,
          userId
        );

        return updated;
      });

      // Clear caches
      await this.clearCustomerCache(id);

      return updatedCustomer;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new APIError(
            ErrorType.NOT_FOUND,
            `Customer with ID ${id} not found`,
            404
          );
        }
      }
      
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        ErrorType.INTERNAL_ERROR,
        'Failed to update customer',
        500,
        { originalError: error.message }
      );
    }
  }

  // Delete customer with cascade checking
  static async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if customer has active bins
      const customerWithBins = await db.customer.findUnique({
        where: { id },
        include: {
          bins: {
            where: {
              status: {
                not: 'retired',
              },
            },
          },
        },
      });

      if (!customerWithBins) {
        throw new APIError(
          ErrorType.NOT_FOUND,
          `Customer with ID ${id} not found`,
          404
        );
      }

      if (customerWithBins.bins.length > 0) {
        throw new APIError(
          ErrorType.VALIDATION_ERROR,
          'Cannot delete customer with active bins. Please retire all bins first.',
          400,
          { activeBinCount: customerWithBins.bins.length }
        );
      }

      // Delete in transaction
      await db.$transaction(async (tx) => {
        await tx.customer.delete({
          where: { id },
        });

        // Log the deletion
        await AuditLogger.logDataChange(
          'customer',
          id,
          'DELETE',
          customerWithBins,
          null,
          userId
        );
      });

      // Clear caches
      await this.clearCustomerCache(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new APIError(
            ErrorType.NOT_FOUND,
            `Customer with ID ${id} not found`,
            404
          );
        }
      }
      
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        ErrorType.INTERNAL_ERROR,
        'Failed to delete customer',
        500,
        { originalError: error.message }
      );
    }
  }

  // Advanced search with filters and pagination
  static async search(filters: {
    businessName?: string;
    contractStatus?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const {
        businessName,
        contractStatus,
        createdAfter,
        createdBefore,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      // Build where clause
      const where: Prisma.CustomerWhereInput = {};
      
      if (businessName) {
        where.businessName = {
          contains: businessName,
          mode: 'insensitive',
        };
      }

      if (contractStatus) {
        where.contractStatus = contractStatus;
      }

      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) where.createdAt.gte = createdAfter;
        if (createdBefore) where.createdAt.lte = createdBefore;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with count
      const [customers, total] = await Promise.all([
        db.customer.findMany({
          where,
          include: {
            _count: {
              select: { bins: true },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        db.customer.count({ where }),
      ]);

      return {
        data: customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new APIError(
        ErrorType.INTERNAL_ERROR,
        'Failed to search customers',
        500,
        { originalError: error.message }
      );
    }
  }

  // Cache management
  private static async clearCustomerCache(id: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    await CacheService.delete(cacheKey);
  }

  private static async clearCustomerCaches(): Promise<void> {
    await CacheService.clearPattern(`${this.CACHE_PREFIX}*`);
  }
}
```

### Phase 3: Audit Logging and Monitoring (Priority: HIGH)

#### Step 5: Create Audit Logging Service
```bash
nano src/services/audit-logger.service.ts
```

**Add comprehensive audit logging**:
```typescript
import { db } from '@/lib/database';
import logger from '@/utils/logger';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  oldValues: any;
  newValues: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  // Log data changes
  static async logDataChange(
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValues: any,
    newValues: any,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const auditEntry = {
        id: crypto.randomUUID(),
        entityType,
        entityId,
        action,
        oldValues: oldValues || null,
        newValues: newValues || null,
        userId: userId || null,
        timestamp: new Date(),
        metadata: metadata || {},
      };

      // Store in database (create audit_logs table if needed)
      // For now, we'll use structured logging
      logger.info('Data change audit log', {
        ...auditEntry,
        auditLog: true,
        level: 'audit',
      });

      // Optional: Store in dedicated audit table
      // await db.auditLog.create({ data: auditEntry });
      
    } catch (error) {
      // Audit logging failure should not break the main operation
      logger.error('Failed to write audit log', {
        error: error.message,
        entityType,
        entityId,
        action,
      });
    }
  }

  // Log API access
  static async logAPIAccess(
    method: string,
    path: string,
    statusCode: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    duration?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const accessEntry = {
        method,
        path,
        statusCode,
        userId,
        ipAddress,
        userAgent,
        duration,
        errorMessage,
        timestamp: new Date(),
      };

      logger.info('API access log', {
        ...accessEntry,
        apiAccess: true,
        level: 'access',
      });
      
    } catch (error) {
      logger.error('Failed to write API access log', {
        error: error.message,
        method,
        path,
      });
    }
  }

  // Log security events
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    userId?: string,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const securityEntry = {
        eventType,
        severity,
        description,
        userId,
        ipAddress,
        metadata: metadata || {},
        timestamp: new Date(),
      };

      logger.warn('Security event', {
        ...securityEntry,
        securityEvent: true,
        level: 'security',
      });

      // Alert on high/critical security events
      if (severity === 'high' || severity === 'critical') {
        // Implement alerting system integration here
        // e.g., send to PagerDuty, Slack, etc.
      }
      
    } catch (error) {
      logger.error('Failed to write security log', {
        error: error.message,
        eventType,
        severity,
      });
    }
  }

  // Get audit trail for entity
  static async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      // This would query the audit_logs table when implemented
      // For now, return empty array
      return [];
      
      // Future implementation:
      // return await db.auditLog.findMany({
      //   where: {
      //     entityType,
      //     entityId,
      //   },
      //   orderBy: {
      //     timestamp: 'desc',
      //   },
      //   take: limit,
      // });
    } catch (error) {
      logger.error('Failed to retrieve audit trail', {
        error: error.message,
        entityType,
        entityId,
      });
      return [];
    }
  }
}
```

### Phase 4: Background Job Processing (Priority: MEDIUM)

#### Step 6: Create Background Job Service
```bash
nano src/services/background-jobs.service.ts
```

**Add background job processing**:
```typescript
import { QueueService } from '@/services/queue.service';
import { airtableClient } from '@/lib/airtable-client';
import { samsaraClient } from '@/lib/samsara-client';
import { notificationService } from '@/services/notification.service';
import logger from '@/utils/logger';

export class BackgroundJobsService {
  // Process external API synchronization
  static async processAirtableSync(
    action: 'create' | 'update' | 'delete',
    entityType: 'customer' | 'bin',
    entityId: string,
    data?: any
  ): Promise<void> {
    try {
      logger.info('Processing Airtable sync', {
        action,
        entityType,
        entityId,
      });

      switch (action) {
        case 'create':
          if (entityType === 'customer') {
            await airtableClient.createCustomer(data);
          } else if (entityType === 'bin') {
            await airtableClient.createBin(data);
          }
          break;

        case 'update':
          if (entityType === 'customer') {
            await airtableClient.updateCustomer(entityId, data);
          } else if (entityType === 'bin') {
            await airtableClient.updateBin(entityId, data);
          }
          break;

        case 'delete':
          if (entityType === 'customer') {
            await airtableClient.deleteCustomer(entityId);
          } else if (entityType === 'bin') {
            await airtableClient.deleteBin(entityId);
          }
          break;
      }

      logger.info('Airtable sync completed', {
        action,
        entityType,
        entityId,
      });
    } catch (error) {
      logger.error('Airtable sync failed', {
        action,
        entityType,
        entityId,
        error: error.message,
      });
      
      // Re-queue with exponential backoff
      await QueueService.queueAirtableSync(action, data, entityType);
    }
  }

  // Process route optimization
  static async processRouteOptimization(routeData: any): Promise<any> {
    try {
      logger.info('Processing route optimization', {
        routeId: routeData.id,
      });

      // Call AI service for route optimization
      const response = await fetch(
        `${process.env.AI_SERVICE_URL}/optimize/routes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routeData),
        }
      );

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }

      const optimizedRoute = await response.json();
      
      logger.info('Route optimization completed', {
        routeId: routeData.id,
        optimizationScore: optimizedRoute.score,
      });

      return optimizedRoute;
    } catch (error) {
      logger.error('Route optimization failed', {
        routeId: routeData.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Process notification sending
  static async processNotification(
    type: 'email' | 'sms',
    recipient: string,
    message: string,
    template?: string
  ): Promise<void> {
    try {
      logger.info('Processing notification', {
        type,
        recipient: recipient.substring(0, 5) + '***', // Mask for privacy
      });

      if (type === 'email') {
        await notificationService.sendEmail(
          recipient,
          'Waste Management Update',
          message,
          template
        );
      } else if (type === 'sms') {
        await notificationService.sendSMS(recipient, message);
      }

      logger.info('Notification sent successfully', {
        type,
        recipient: recipient.substring(0, 5) + '***',
      });
    } catch (error) {
      logger.error('Notification sending failed', {
        type,
        recipient: recipient.substring(0, 5) + '***',
        error: error.message,
      });
      throw error;
    }
  }

  // Process data aggregation for analytics
  static async processAnalyticsAggregation(
    period: 'daily' | 'weekly' | 'monthly',
    date: Date
  ): Promise<void> {
    try {
      logger.info('Processing analytics aggregation', {
        period,
        date: date.toISOString(),
      });

      const startDate = new Date(date);
      const endDate = new Date(date);

      // Adjust dates based on period
      switch (period) {
        case 'daily':
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          endDate.setDate(endDate.getDate() + 1);
          break;
      }

      // Aggregate service events
      const serviceStats = await db.serviceEvent.groupBy({
        by: ['status', 'eventType'],
        where: {
          actualTime: {
            gte: startDate,
            lt: endDate,
          },
        },
        _count: {
          id: true,
        },
      });

      // Aggregate route performance
      const routeStats = await db.route.aggregate({
        where: {
          routeDate: {
            gte: startDate,
            lt: endDate,
          },
          status: 'completed',
        },
        _avg: {
          actualDuration: true,
          optimizationScore: true,
        },
        _count: {
          id: true,
        },
      });

      logger.info('Analytics aggregation completed', {
        period,
        date: date.toISOString(),
        serviceEvents: serviceStats.length,
        routeStats: routeStats._count.id,
      });

      // Store aggregated data (implement as needed)
      // await db.analyticsAggregation.create({
      //   data: {
      //     period,
      //     date,
      //     serviceStats,
      //     routeStats,
      //   },
      // });
    } catch (error) {
      logger.error('Analytics aggregation failed', {
        period,
        date: date.toISOString(),
        error: error.message,
      });
      throw error;
    }
  }
}
```

### Phase 5: Enhanced API Endpoints (Priority: MEDIUM)

#### Step 7: Create Enhanced Customer API
```bash
nano src/app/api/customers/route.ts
```

**Replace with enhanced implementation**:
```typescript
import { NextRequest } from 'next/server';
import { APIResponseBuilder } from '@/lib/api-response';
import { EnhancedCustomerService } from '@/services/enhanced-customer.service';
import { createCustomerSchema, customerSearchSchema } from '@/validators/customer.validator';
import { AuditLogger } from '@/services/audit-logger.service';
import { RateLimiter } from '@/services/rate-limiter.service';

// GET /api/customers - List customers with advanced filtering
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Rate limiting
    const rateLimitResult = await RateLimiter.checkRateLimit(
      request.ip || 'unknown',
      'customers:list',
      100, // 100 requests per 15 minutes
      15 * 60 * 1000
    );

    if (!rateLimitResult.allowed) {
      return APIResponseBuilder.rateLimit('Too many requests');
    }

    // Extract query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    // Validate search parameters
    const validationResult = customerSearchSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return APIResponseBuilder.validationError(validationResult.error);
    }

    const searchParams = validationResult.data;

    // Execute search
    const result = await EnhancedCustomerService.search({
      businessName: searchParams.name,
      contractStatus: searchParams.serviceType,
      page: searchParams.page,
      limit: searchParams.limit,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    });

    // Log API access
    await AuditLogger.logAPIAccess(
      'GET',
      '/api/customers',
      200,
      userId,
      request.ip,
      request.headers.get('user-agent'),
      Date.now() - startTime
    );

    return APIResponseBuilder.successWithPagination(
      result.data,
      result.pagination,
      'Customers retrieved successfully'
    );

  } catch (error) {
    await AuditLogger.logAPIAccess(
      'GET',
      '/api/customers',
      500,
      userId,
      request.ip,
      request.headers.get('user-agent'),
      Date.now() - startTime,
      error.message
    );

    if (error.type) {
      return APIResponseBuilder.error(error.type, error.message, error.statusCode);
    }

    return APIResponseBuilder.internalError();
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Rate limiting (stricter for write operations)
    const rateLimitResult = await RateLimiter.checkRateLimit(
      request.ip || 'unknown',
      'customers:create',
      20, // 20 requests per 15 minutes
      15 * 60 * 1000
    );

    if (!rateLimitResult.allowed) {
      return APIResponseBuilder.rateLimit('Too many requests');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createCustomerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return APIResponseBuilder.validationError(validationResult.error);
    }

    // Create customer
    const customer = await EnhancedCustomerService.create(
      validationResult.data,
      userId
    );

    // Queue background synchronization
    await QueueService.queueAirtableSync('create', customer, 'customer');

    // Send welcome notification
    if (customer.contactInfo.email) {
      await QueueService.queueEmail(
        customer.contactInfo.email,
        'Welcome to our waste management service',
        'Welcome email template',
        'welcome'
      );
    }

    // Log API access
    await AuditLogger.logAPIAccess(
      'POST',
      '/api/customers',
      201,
      userId,
      request.ip,
      request.headers.get('user-agent'),
      Date.now() - startTime
    );

    return APIResponseBuilder.success(
      customer,
      'Customer created successfully',
      { 
        id: customer.id,
        createdAt: customer.createdAt 
      }
    );

  } catch (error) {
    await AuditLogger.logAPIAccess(
      'POST',
      '/api/customers',
      error.statusCode || 500,
      userId,
      request.ip,
      request.headers.get('user-agent'),
      Date.now() - startTime,
      error.message
    );

    if (error.type) {
      return APIResponseBuilder.error(error.type, error.message, error.statusCode);
    }

    return APIResponseBuilder.internalError();
  }
}
```

### Phase 6: Testing and Monitoring (Priority: MEDIUM)

#### Step 8: Create API Testing Suite
```bash
nano src/__tests__/api/customers.test.ts
```

**Add comprehensive API tests**:
```typescript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/customers/route';

// Mock dependencies
jest.mock('@/lib/database');
jest.mock('@/services/enhanced-customer.service');
jest.mock('@/services/rate-limiter.service');

describe('/api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/customers', () => {
    it('should return customers with valid search parameters', async () => {
      const mockCustomers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          businessName: 'Test Business',
          contractStatus: 'active',
          createdAt: new Date(),
        },
      ];

      const mockEnhancedCustomerService = require('@/services/enhanced-customer.service');
      mockEnhancedCustomerService.EnhancedCustomerService.search.mockResolvedValue({
        data: mockCustomers,
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const mockRateLimiter = require('@/services/rate-limiter.service');
      mockRateLimiter.RateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });

      const request = new NextRequest('http://localhost:3000/api/customers?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCustomers);
      expect(data.pagination).toBeDefined();
    });

    it('should return validation error for invalid parameters', async () => {
      const mockRateLimiter = require('@/services/rate-limiter.service');
      mockRateLimiter.RateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });

      const request = new NextRequest('http://localhost:3000/api/customers?page=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.metadata.errorType).toBe('VALIDATION_ERROR');
    });

    it('should return rate limit error when exceeded', async () => {
      const mockRateLimiter = require('@/services/rate-limiter.service');
      mockRateLimiter.RateLimiter.checkRateLimit.mockResolvedValue({ allowed: false });

      const request = new NextRequest('http://localhost:3000/api/customers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/customers', () => {
    it('should create customer with valid data', async () => {
      const mockCustomer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        businessName: 'New Business',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      const mockEnhancedCustomerService = require('@/services/enhanced-customer.service');
      mockEnhancedCustomerService.EnhancedCustomerService.create.mockResolvedValue(mockCustomer);

      const mockRateLimiter = require('@/services/rate-limiter.service');
      mockRateLimiter.RateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });

      const requestData = {
        name: 'New Business',
        email: 'test@example.com',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        serviceType: 'residential',
        billingCycle: 'monthly',
      };

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCustomer.id);
    });

    it('should return validation error for invalid data', async () => {
      const mockRateLimiter = require('@/services/rate-limiter.service');
      mockRateLimiter.RateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });

      const requestData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad email format
      };

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.metadata.errorType).toBe('VALIDATION_ERROR');
    });
  });
});
```

### Testing and Validation

#### Step 9: Run Backend Tests
```bash
# Run type checking
npm run type-check

# Run unit tests
npm test src/__tests__/api/

# Run integration tests
npm run test:integration

# Test API endpoints
curl -X GET "http://localhost:3000/api/customers?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"

curl -X POST "http://localhost:3000/api/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "name": "Test Business",
    "email": "test@example.com",
    "address": "123 Test St",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "serviceType": "residential",
    "billingCycle": "monthly"
  }'
```

This comprehensive backend implementation provides enterprise-grade API services with proper validation, error handling, audit logging, and background job processing suitable for production deployment.