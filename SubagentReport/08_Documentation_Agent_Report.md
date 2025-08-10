# Documentation Agent Report
## Waste Management System - Code Documentation and Maintainability Assessment

### Executive Summary
The documentation shows comprehensive coverage of system architecture and API specifications, but lacks inline code documentation, developer onboarding guides, and automated documentation generation necessary for long-term maintainability.

### What's Working Well
- **Comprehensive Architecture Documentation**: ARCHITECTURE.md covers system design and component relationships
- **Detailed API Specifications**: API_SPECIFICATIONS.md provides thorough endpoint documentation
- **Database Design Documentation**: DATABASE_DESIGN.md includes schema descriptions and relationships
- **Integration Patterns**: INTEGRATION_PATTERNS.md covers external service integrations
- **Development Plans**: Multiple planning documents for implementation guidance
- **Markdown Structure**: Well-organized documentation using consistent markdown formatting

### Critical Documentation Issues Found
1. **Missing Inline Code Documentation**: Functions and classes lack JSDoc comments
2. **No Developer Setup Guide**: Missing step-by-step development environment setup
3. **Incomplete Deployment Documentation**: Missing production deployment procedures
4. **No Troubleshooting Guide**: Lack of common issues and solutions documentation
5. **Missing API Examples**: API docs lack request/response examples and code samples
6. **No Code Style Guide**: Missing coding standards and conventions documentation
7. **Outdated Documentation**: Some docs may not reflect current implementation
8. **No Documentation Generation**: Missing automated documentation from code comments

### What Needs Changes/Improvements
- Add comprehensive JSDoc comments to all functions and classes
- Create developer onboarding and setup guides
- Add interactive API documentation with examples
- Create troubleshooting and FAQ documentation
- Implement automated documentation generation from code
- Add code style and contribution guidelines
- Create operational runbooks and deployment guides

### What Needs Removal/Replacement
- Remove outdated or inconsistent documentation sections
- Replace generic placeholders with actual implementation details
- Remove duplicated information across documentation files

### Missing Components
- Inline code documentation (JSDoc)
- Developer onboarding guide
- Code style guide
- Troubleshooting documentation
- Deployment runbooks
- API interactive documentation
- Automated documentation generation
- Contributing guidelines
- Changelog management
- Security documentation
- Performance optimization guide
- Monitoring and alerting guide

## Step-by-Step Documentation Implementation Guide

### Phase 1: Inline Code Documentation (Priority: URGENT)

#### Step 1: Add JSDoc Comments to Core Services
```bash
# Start with customer service documentation
cd waste-management-system/src/services
nano customer.service.ts
```

**Add comprehensive JSDoc documentation**:
```typescript
/**
 * Customer Service Module
 * 
 * Handles all business logic related to customer management including
 * CRUD operations, validation, and external service synchronization.
 * 
 * @module CustomerService
 * @version 1.0.0
 * @author Waste Management System Team
 * @since 2024-01-01
 */

import { Customer, Prisma } from '@prisma/client';
import { db } from '@/lib/database';
import { airtableClient } from '@/lib/airtable-client';
import logger from '@/utils/logger';

/**
 * Interface for customer search filters
 * 
 * @interface CustomerSearchFilters
 */
interface CustomerSearchFilters {
  /** Business name search term */
  businessName?: string;
  /** Contract status filter */
  contractStatus?: string;
  /** Service type filter */
  serviceType?: string;
  /** City filter */
  city?: string;
  /** State filter */
  state?: string;
  /** Zip code filter */
  zipCode?: string;
  /** Page number for pagination */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort order (asc/desc) */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Customer Service Class
 * 
 * Provides comprehensive customer management functionality including
 * database operations, external service integration, and business logic.
 * 
 * @class CustomerService
 */
export class CustomerService {
  /**
   * Retrieves all customers with optional filtering and pagination
   * 
   * This method supports advanced filtering by business name, contract status,
   * service type, and location. It also provides pagination support and 
   * configurable sorting options.
   * 
   * @async
   * @static
   * @method getAll
   * @param {CustomerSearchFilters} [filters={}] - Search and filter criteria
   * @returns {Promise<Customer[]>} Promise that resolves to an array of customers
   * @throws {Error} Throws error if database query fails
   * 
   * @example
   * ```typescript
   * // Get all active customers
   * const activeCustomers = await CustomerService.getAll({
   *   contractStatus: 'active',
   *   page: 1,
   *   limit: 20
   * });
   * 
   * // Search for customers by business name
   * const searchResults = await CustomerService.getAll({
   *   businessName: 'ABC Company',
   *   sortBy: 'businessName',
   *   sortOrder: 'asc'
   * });
   * ```
   */
  static async getAll(filters: CustomerSearchFilters = {}): Promise<Customer[]> {
    try {
      const {
        businessName,
        contractStatus,
        serviceType,
        city,
        state,
        zipCode,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build where clause dynamically based on provided filters
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

      // Add additional filter conditions...

      const customers = await db.customer.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bins: {
            select: {
              id: true,
              binType: true,
              status: true,
            },
          },
          _count: {
            select: {
              bins: true,
            },
          },
        },
      });

      logger.info('Retrieved customers', { count: customers.length, filters });
      return customers;
    } catch (error) {
      logger.error('Failed to retrieve customers', { error: error.message, filters });
      throw new Error('Failed to retrieve customers');
    }
  }

  /**
   * Retrieves a single customer by ID
   * 
   * Fetches customer details including associated bins and service statistics.
   * Returns null if customer is not found.
   * 
   * @async
   * @static
   * @method getById
   * @param {string} id - Unique customer identifier (UUID)
   * @returns {Promise<Customer | null>} Promise that resolves to customer or null
   * @throws {Error} Throws error if database query fails or ID is invalid
   * 
   * @example
   * ```typescript
   * const customer = await CustomerService.getById('123e4567-e89b-12d3-a456-426614174000');
   * if (customer) {
   *   console.log(`Found customer: ${customer.businessName}`);
   * } else {
   *   console.log('Customer not found');
   * }
   * ```
   */
  static async getById(id: string): Promise<Customer | null> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new Error('Invalid customer ID format');
      }

      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          bins: {
            include: {
              serviceEvents: {
                orderBy: {
                  actualTime: 'desc',
                },
                take: 5,
              },
            },
          },
        },
      });

      if (customer) {
        logger.info('Retrieved customer by ID', { customerId: id, businessName: customer.businessName });
      } else {
        logger.warn('Customer not found', { customerId: id });
      }

      return customer;
    } catch (error) {
      logger.error('Failed to retrieve customer by ID', { customerId: id, error: error.message });
      throw error;
    }
  }

  /**
   * Creates a new customer record
   * 
   * Validates customer data, creates database record, and initiates 
   * synchronization with external services (Airtable). Performs
   * duplicate business name checking.
   * 
   * @async
   * @static
   * @method create
   * @param {Prisma.CustomerCreateInput} data - Customer data to create
   * @returns {Promise<Customer>} Promise that resolves to created customer
   * @throws {Error} Throws error if validation fails or creation fails
   * 
   * @example
   * ```typescript
   * const newCustomer = await CustomerService.create({
   *   businessName: 'New Business LLC',
   *   contactInfo: {
   *     email: 'contact@newbusiness.com',
   *     phone: '555-123-4567'
   *   },
   *   addressInfo: {
   *     address: '123 Business St',
   *     city: 'Business City',
   *     state: 'BC',
   *     zipCode: '12345'
   *   },
   *   contractStatus: 'active',
   *   serviceType: 'commercial',
   *   billingCycle: 'monthly'
   * });
   * ```
   */
  static async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
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
        throw new Error(`Customer with business name "${data.businessName}" already exists`);
      }

      // Create customer in transaction for data consistency
      const customer = await db.$transaction(async (tx) => {
        const newCustomer = await tx.customer.create({
          data: {
            ...data,
            contractStatus: data.contractStatus || 'pending',
          },
        });

        // Log customer creation for audit trail
        logger.info('Customer created', {
          customerId: newCustomer.id,
          businessName: newCustomer.businessName,
        });

        return newCustomer;
      });

      // Sync with external services asynchronously
      try {
        await airtableClient.createCustomer(customer);
        logger.info('Customer synced to Airtable', { customerId: customer.id });
      } catch (syncError) {
        logger.error('Failed to sync customer to Airtable', {
          customerId: customer.id,
          error: syncError.message,
        });
        // Don't fail the main operation if sync fails
      }

      return customer;
    } catch (error) {
      logger.error('Failed to create customer', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Updates an existing customer record
   * 
   * Performs partial updates with optimistic concurrency control.
   * Validates updated data and synchronizes changes with external services.
   * 
   * @async
   * @static
   * @method update
   * @param {string} id - Customer ID to update
   * @param {Prisma.CustomerUpdateInput} data - Updated customer data
   * @returns {Promise<Customer>} Promise that resolves to updated customer
   * @throws {Error} Throws error if customer not found or update fails
   * 
   * @example
   * ```typescript
   * const updatedCustomer = await CustomerService.update(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   {
   *     contractStatus: 'inactive',
   *     contactInfo: {
   *       email: 'newemail@business.com'
   *     }
   *   }
   * );
   * ```
   */
  static async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    try {
      const updatedCustomer = await db.$transaction(async (tx) => {
        // Check if customer exists
        const existingCustomer = await tx.customer.findUnique({ where: { id } });
        if (!existingCustomer) {
          throw new Error(`Customer with ID ${id} not found`);
        }

        const updated = await tx.customer.update({
          where: { id },
          data,
        });

        logger.info('Customer updated', {
          customerId: id,
          changes: Object.keys(data),
        });

        return updated;
      });

      // Sync updates with external services
      try {
        await airtableClient.updateCustomer(id, updatedCustomer);
        logger.info('Customer update synced to Airtable', { customerId: id });
      } catch (syncError) {
        logger.error('Failed to sync customer update to Airtable', {
          customerId: id,
          error: syncError.message,
        });
      }

      return updatedCustomer;
    } catch (error) {
      logger.error('Failed to update customer', { customerId: id, error: error.message });
      throw error;
    }
  }

  /**
   * Deletes a customer and all associated data
   * 
   * Performs cascade delete of customer bins and service events.
   * Checks for business rules before deletion (e.g., active contracts).
   * 
   * @async
   * @static
   * @method delete
   * @param {string} id - Customer ID to delete
   * @returns {Promise<void>} Promise that resolves when deletion is complete
   * @throws {Error} Throws error if customer not found or deletion not allowed
   * 
   * @example
   * ```typescript
   * try {
   *   await CustomerService.delete('123e4567-e89b-12d3-a456-426614174000');
   *   console.log('Customer deleted successfully');
   * } catch (error) {
   *   console.error('Cannot delete customer:', error.message);
   * }
   * ```
   */
  static async delete(id: string): Promise<void> {
    try {
      await db.$transaction(async (tx) => {
        // Get customer with bins to check deletion eligibility
        const customer = await tx.customer.findUnique({
          where: { id },
          include: {
            bins: {
              where: {
                status: { not: 'retired' },
              },
            },
          },
        });

        if (!customer) {
          throw new Error(`Customer with ID ${id} not found`);
        }

        // Check if customer has active bins
        if (customer.bins.length > 0) {
          throw new Error(
            `Cannot delete customer with ${customer.bins.length} active bins. ` +
            'Please retire all bins before deleting the customer.'
          );
        }

        // Delete customer (bins will be cascade deleted)
        await tx.customer.delete({ where: { id } });

        logger.info('Customer deleted', {
          customerId: id,
          businessName: customer.businessName,
        });
      });

      // Clean up external services
      try {
        await airtableClient.deleteCustomer(id);
        logger.info('Customer deletion synced to Airtable', { customerId: id });
      } catch (syncError) {
        logger.error('Failed to sync customer deletion to Airtable', {
          customerId: id,
          error: syncError.message,
        });
      }
    } catch (error) {
      logger.error('Failed to delete customer', { customerId: id, error: error.message });
      throw error;
    }
  }
}
```

#### Step 2: Create Comprehensive API Documentation
```bash
nano docs/API_DOCUMENTATION.md
```

**Add interactive API documentation**:
```markdown
# API Documentation

## Overview

The Waste Management System API provides RESTful endpoints for managing customers, bins, routes, and service events. All endpoints require authentication and return JSON responses.

## Base URL

```
Production: https://api.wastemanagement.com/v1
Development: http://localhost:3000/api
```

## Authentication

All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "metadata": {
    "errorType": "VALIDATION_ERROR",
    "details": [...],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Customers API

### List Customers

Retrieve a paginated list of customers with optional filtering.

**Endpoint:** `GET /api/customers`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number (1-based) | 1 |
| `limit` | number | Items per page (max 100) | 20 |
| `search` | string | Search term for business name | - |
| `serviceType` | string | Filter by service type | - |
| `contractStatus` | string | Filter by contract status | - |
| `sortBy` | string | Sort field (businessName, createdAt) | createdAt |
| `sortOrder` | string | Sort order (asc, desc) | desc |

**Example Request:**

```bash
curl -X GET "https://api.wastemanagement.com/v1/customers?page=1&limit=10&serviceType=commercial" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "businessName": "ABC Commercial Services",
      "contactInfo": {
        "email": "contact@abccommercial.com",
        "phone": "555-123-4567"
      },
      "addressInfo": {
        "address": "123 Business Blvd",
        "city": "Commerce City",
        "state": "CO",
        "zipCode": "80022"
      },
      "contractStatus": "active",
      "serviceType": "commercial",
      "billingCycle": "monthly",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z",
      "_count": {
        "bins": 12
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "message": "Customers retrieved successfully"
}
```

### Create Customer

Create a new customer record.

**Endpoint:** `POST /api/customers`

**Request Body:**

```json
{
  "name": "New Business LLC",
  "email": "contact@newbusiness.com",
  "phone": "555-987-6543",
  "address": "456 New Business Ave",
  "city": "Business Town",
  "state": "BT",
  "zipCode": "54321",
  "serviceType": "residential",
  "billingCycle": "monthly",
  "notes": "New customer onboarding"
}
```

**Field Validation:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 2-200 characters |
| `email` | string | Yes | Valid email format, max 254 chars |
| `phone` | string | No | Valid phone number format |
| `address` | string | Yes | 5-500 characters |
| `city` | string | Yes | 2-100 characters |
| `state` | string | Yes | 2-50 characters |
| `zipCode` | string | Yes | Valid zip code format |
| `serviceType` | enum | Yes | residential, commercial, industrial |
| `billingCycle` | enum | Yes | weekly, biweekly, monthly |
| `notes` | string | No | Max 1000 characters |

**Example Request:**

```bash
curl -X POST "https://api.wastemanagement.com/v1/customers" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Business LLC",
    "email": "contact@newbusiness.com",
    "address": "456 New Business Ave",
    "city": "Business Town",
    "state": "BT",
    "zipCode": "54321",
    "serviceType": "commercial",
    "billingCycle": "monthly"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "businessName": "New Business LLC",
    "contactInfo": {
      "email": "contact@newbusiness.com"
    },
    "addressInfo": {
      "address": "456 New Business Ave",
      "city": "Business Town",
      "state": "BT",
      "zipCode": "54321"
    },
    "contractStatus": "pending",
    "serviceType": "commercial",
    "billingCycle": "monthly",
    "createdAt": "2024-01-16T10:30:00Z",
    "updatedAt": "2024-01-16T10:30:00Z"
  },
  "message": "Customer created successfully"
}
```

### Get Customer Details

Retrieve detailed information for a specific customer.

**Endpoint:** `GET /api/customers/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Customer UUID |

**Example Request:**

```bash
curl -X GET "https://api.wastemanagement.com/v1/customers/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "businessName": "ABC Commercial Services",
    "contactInfo": {
      "email": "contact@abccommercial.com",
      "phone": "555-123-4567"
    },
    "addressInfo": {
      "address": "123 Business Blvd",
      "city": "Commerce City",
      "state": "CO",
      "zipCode": "80022"
    },
    "contractStatus": "active",
    "serviceType": "commercial",
    "billingCycle": "monthly",
    "notes": "Established customer since 2023",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-15T14:30:00Z",
    "bins": [
      {
        "id": "bin-123",
        "binType": "standard",
        "size": "large",
        "status": "full",
        "lastServiced": "2024-01-14T08:00:00Z"
      }
    ]
  }
}
```

## Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authentication endpoints:** 20 requests per 15 minutes
- **Read operations:** 100 requests per 15 minutes  
- **Write operations:** 50 requests per 15 minutes

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { WasteManagementAPI } from '@waste-management/api-client';

const api = new WasteManagementAPI({
  baseURL: 'https://api.wastemanagement.com/v1',
  apiKey: 'your-api-key'
});

// Get customers
const customers = await api.customers.list({
  page: 1,
  limit: 10,
  serviceType: 'commercial'
});

// Create customer
const newCustomer = await api.customers.create({
  name: 'New Business',
  email: 'contact@newbusiness.com',
  serviceType: 'commercial'
});
```

### Python

```python
from waste_management_api import WasteManagementAPI

api = WasteManagementAPI(
    base_url="https://api.wastemanagement.com/v1",
    api_key="your-api-key"
)

# Get customers
customers = api.customers.list(
    page=1,
    limit=10,
    service_type="commercial"
)

# Create customer
new_customer = api.customers.create({
    "name": "New Business",
    "email": "contact@newbusiness.com", 
    "service_type": "commercial"
})
```

## Testing

Use our Postman collection for API testing:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/waste-management-api)

Or test with cURL:

```bash
# Health check
curl -X GET "https://api.wastemanagement.com/v1/health"

# Get API version
curl -X GET "https://api.wastemanagement.com/v1/version"
```
```

### Phase 2: Developer Setup and Onboarding (Priority: HIGH)

#### Step 3: Create Developer Setup Guide
```bash
nano docs/DEVELOPER_SETUP.md
```

**Add comprehensive setup guide**:
```markdown
# Developer Setup Guide

Welcome to the Waste Management System development team! This guide will help you set up your local development environment and get you ready to contribute.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

| Software | Version | Purpose | Installation Link |
|----------|---------|---------|-------------------|
| Node.js | 18.0.0+ | JavaScript runtime | [Download](https://nodejs.org/) |
| npm | 8.0.0+ | Package manager | Included with Node.js |
| PostgreSQL | 14.0+ | Database | [Download](https://postgresql.org/) |
| Redis | 6.0+ | Caching and queues | [Download](https://redis.io/) |
| Docker | 20.0+ | Containerization | [Download](https://docker.com/) |
| Git | 2.30+ | Version control | [Download](https://git-scm.com/) |

### Optional but Recommended

| Software | Purpose | Installation Link |
|----------|---------|-------------------|
| VS Code | Code editor | [Download](https://code.visualstudio.com/) |
| Postman | API testing | [Download](https://postman.com/) |
| pgAdmin | Database management | [Download](https://pgadmin.org/) |

### VS Code Extensions

If using VS Code, install these recommended extensions:

```bash
# Install via VS Code extension marketplace or command palette
- TypeScript and JavaScript Language Features
- Prisma (for database schema)
- ESLint (code linting)
- Prettier (code formatting)
- Thunder Client (API testing)
- GitLens (Git integration)
- Auto Rename Tag
- Bracket Pair Colorizer
```

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/your-org/waste-management-system.git
cd waste-management-system

# Set up upstream remote (for contributing)
git remote add upstream https://github.com/your-org/waste-management-system.git
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install global development tools
npm install -g @prisma/cli jest-cli cypress
```

### 3. Environment Configuration

Create environment files for different environments:

```bash
# Copy environment template
cp .env.example .env.local
cp .env.example .env.test
```

**Edit `.env.local` with your local development settings:**

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/waste_management_dev"
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/waste_management_test"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-minimum-32-characters-long"
JWT_EXPIRES_IN="24h"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# External API Keys (get from team lead)
AIRTABLE_API_KEY="your-airtable-key"
AIRTABLE_BASE_ID="your-airtable-base-id"
SAMSARA_API_KEY="your-samsara-key"
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
SENDGRID_API_KEY="your-sendgrid-key"
STRIPE_SECRET_KEY="sk_test_your-stripe-test-key"

# AI Service Configuration
AI_SERVICE_URL="http://localhost:8000"

# Development Settings
NODE_ENV="development"
LOG_LEVEL="debug"
ENABLE_LOGGING="true"
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start databases with Docker Compose
docker-compose up -d postgres redis

# Wait for databases to be ready (about 30 seconds)
docker-compose logs postgres
```

#### Option B: Manual Installation

**PostgreSQL Setup:**

```bash
# Create development database
createdb waste_management_dev

# Create test database  
createdb waste_management_test

# Create database user (optional)
psql -c "CREATE USER waste_mgmt WITH PASSWORD 'your-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE waste_management_dev TO waste_mgmt;"
psql -c "GRANT ALL PRIVILEGES ON DATABASE waste_management_test TO waste_mgmt;"
```

**Redis Setup:**

```bash
# Start Redis server (varies by OS)
# macOS with Homebrew:
brew services start redis

# Ubuntu/Debian:
sudo systemctl start redis-server

# Windows: Start Redis from installation directory
```

### 5. Database Migration and Seeding

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed development data
npm run db:seed

# Verify database setup
npx prisma studio
# This opens a web interface at http://localhost:5555
```

### 6. Start Development Services

**Terminal 1 - Main Application:**
```bash
npm run dev
```

**Terminal 2 - AI Service (if needed):**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Terminal 3 - Queue Worker (if needed):**
```bash
npm run worker
```

### 7. Verify Installation

Visit these URLs to verify everything is working:

- **Main Application:** http://localhost:3000
- **API Health Check:** http://localhost:3000/api/health
- **Database Admin:** http://localhost:5555 (Prisma Studio)
- **AI Service:** http://localhost:8000/docs (FastAPI docs)

## Development Workflow

### 1. Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... code changes ...

# Run tests
npm test
npm run test:e2e

# Check code style
npm run lint
npm run type-check

# Commit changes
git add .
git commit -m "feat: add customer search functionality"

# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### 2. Database Changes

```bash
# After modifying prisma/schema.prisma
npx prisma migrate dev --name describe-your-changes

# Generate updated Prisma client
npx prisma generate

# Update seed data if needed
npm run db:seed
```

### 3. Adding New Dependencies

```bash
# Install runtime dependency
npm install package-name

# Install development dependency
npm install --save-dev package-name

# Update package.json and commit the changes
git add package.json package-lock.json
git commit -m "deps: add package-name for feature X"
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Module not found" errors

**Solution:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Database connection failed

**Solutions:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify connection string in `.env.local`
3. Check database exists: `psql -l | grep waste_management`
4. Reset database: `npm run db:reset`

#### Issue: Prisma client out of sync

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# If schema changed, create migration
npx prisma migrate dev
```

#### Issue: Redis connection failed

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Verify Redis URL in `.env.local`
3. Restart Redis service

#### Issue: Tests failing

**Solutions:**
1. Run tests with verbose output: `npm test -- --verbose`
2. Check test database is set up: `npm run test:db:setup`
3. Clear test cache: `npm test -- --clearCache`

#### Issue: TypeScript errors

**Solutions:**
1. Check TypeScript version: `npx tsc --version`
2. Restart TypeScript server in VS Code: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
3. Check tsconfig.json paths are correct

#### Issue: Port already in use

**Solutions:**
1. Find process using port: `lsof -i :3000`
2. Kill process: `kill -9 <PID>`
3. Or use different port: `PORT=3001 npm run dev`

### Getting Help

1. **Check existing documentation:** Look in the `docs/` folder first
2. **Search existing issues:** Check GitHub issues for similar problems
3. **Ask team members:** Use Slack channel #development-help
4. **Create detailed issue:** If problem persists, create GitHub issue with:
   - Steps to reproduce
   - Error messages
   - Environment details
   - Screenshots if applicable

## Code Style and Standards

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

We use Husky for pre-commit hooks:

```bash
# Install pre-commit hooks (run once)
npm run prepare

# Hooks will automatically run on commit:
# - Lint staged files
# - Run type checking
# - Format code
# - Run related tests
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `customer-service.ts` |
| Components | PascalCase | `CustomerForm.tsx` |
| Functions | camelCase | `createCustomer()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_CUSTOMERS_PER_PAGE` |
| Types/Interfaces | PascalCase | `CustomerCreateInput` |
| Database tables | snake_case | `customer_bins` |

## Next Steps

Once you have everything set up:

1. **Read the Architecture Guide:** `docs/ARCHITECTURE.md`
2. **Explore the API:** `docs/API_DOCUMENTATION.md`
3. **Understand the Database:** `docs/DATABASE_DESIGN.md`
4. **Review Code Style:** `docs/CODE_STYLE_GUIDE.md`
5. **Pick your first issue:** Look for "good first issue" labels on GitHub

Welcome to the team! 🎉
```

### Phase 3: Troubleshooting and FAQ Documentation (Priority: MEDIUM)

#### Step 4: Create Comprehensive Troubleshooting Guide
```bash
nano docs/TROUBLESHOOTING.md
```

**Add troubleshooting documentation**:
```markdown
# Troubleshooting Guide

This guide covers common issues you might encounter while developing or deploying the Waste Management System, along with their solutions.

## Table of Contents

1. [Development Environment Issues](#development-environment-issues)
2. [Database Problems](#database-problems)
3. [API and Backend Issues](#api-and-backend-issues)
4. [Frontend and UI Problems](#frontend-and-ui-problems)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [External Service Integration](#external-service-integration)
7. [Performance Issues](#performance-issues)
8. [Deployment Problems](#deployment-problems)
9. [Testing Issues](#testing-issues)
10. [Getting More Help](#getting-more-help)

## Development Environment Issues

### Node.js Version Conflicts

**Problem:** Application won't start due to Node.js version mismatch

**Symptoms:**
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check current Node.js version
node --version

# Install correct version (18.0.0+)
nvm install 18
nvm use 18

# Alternatively, with n:
n 18

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Compilation Errors

**Problem:** TypeScript build fails with module resolution errors

**Symptoms:**
```
Cannot find module '@/components/CustomerForm' or its corresponding type declarations
```

**Solutions:**

1. **Check tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. **Restart TypeScript server:**
- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
- Or restart your IDE

3. **Clear TypeScript cache:**
```bash
npx tsc --build --clean
rm -rf .next
```

### Package Installation Issues

**Problem:** npm install fails with permission errors

**Solutions:**

1. **Fix npm permissions:**
```bash
# Check npm configuration
npm config list

# Fix global npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

2. **Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Database Problems

### Connection Issues

**Problem:** Cannot connect to PostgreSQL database

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis Steps:**
```bash
# Check if PostgreSQL is running
pg_isready
# or
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Test connection directly
psql -h localhost -U your_username -d waste_management_dev
```

**Solutions:**

1. **Start PostgreSQL service:**
```bash
# macOS with Homebrew
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Docker
docker-compose up -d postgres
```

2. **Check connection string:**
```env
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/waste_management_dev"
```

3. **Create missing database:**
```bash
createdb waste_management_dev
createdb waste_management_test
```

### Migration Failures

**Problem:** Prisma migrations fail to apply

**Symptoms:**
```
Migration failed to apply cleanly to the shadow database
```

**Solutions:**

1. **Reset database state:**
```bash
# WARNING: This will delete all data
npx prisma migrate reset --force

# Reapply migrations
npx prisma migrate dev
```

2. **Fix migration conflicts:**
```bash
# Check migration status
npx prisma migrate status

# Manually resolve conflicts in migration files
# Then mark as applied
npx prisma migrate resolve --applied "migration_name"
```

3. **Generate new migration:**
```bash
npx prisma migrate dev --name fix-migration-conflict
```

### Schema Sync Issues

**Problem:** Database schema out of sync with Prisma schema

**Solutions:**
```bash
# Push schema changes without migration
npx prisma db push

# Generate updated client
npx prisma generate

# Verify in Prisma Studio
npx prisma studio
```

## API and Backend Issues

### Next.js API Route Errors

**Problem:** API routes return 404 or 500 errors

**Common Causes and Solutions:**

1. **File naming issues:**
```
❌ /api/customer/route.ts     (missing 's')
✅ /api/customers/route.ts

❌ /api/customers/[id].ts     (missing route.ts)
✅ /api/customers/[id]/route.ts
```

2. **Export naming:**
```typescript
// ❌ Wrong export
export default function handler() {}

// ✅ Correct exports for App Router
export async function GET() {}
export async function POST() {}
```

3. **Type errors in dynamic routes:**
```typescript
// ❌ Next.js 13 style
export async function GET(req: Request, { params }: { params: { id: string } }) {}

// ✅ Next.js 15.4.6+ style  
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
}
```

### Authentication Issues

**Problem:** JWT token validation fails

**Symptoms:**
```
Error: JsonWebTokenError: invalid token
```

**Debugging Steps:**
```bash
# Check JWT_SECRET in environment
echo $JWT_SECRET

# Verify token format
node -e "console.log(process.env.JWT_SECRET?.length)"
# Should be 32+ characters
```

**Solutions:**

1. **Fix JWT secret:**
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env.local
JWT_SECRET="your-new-64-character-secret"
```

2. **Clear existing tokens:**
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

### Rate Limiting Issues

**Problem:** API requests being rate limited unexpectedly

**Debugging:**
```bash
# Check rate limit headers
curl -I http://localhost:3000/api/customers \
  -H "Authorization: Bearer token"

# Look for:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1640995200
```

**Solutions:**

1. **Increase rate limits for development:**
```typescript
// src/middleware/rate-limit.ts
const limits = {
  development: 1000, // Higher limit for dev
  production: 100
};
```

2. **Reset rate limit store:**
```bash
# If using Redis
redis-cli FLUSHDB
```

## Frontend and UI Problems

### React Hydration Errors

**Problem:** Hydration mismatch between server and client

**Symptoms:**
```
Warning: Text content did not match. Server: "Loading..." Client: "0 customers"
```

**Solutions:**

1. **Use proper loading states:**
```tsx
// ❌ Causes hydration mismatch
const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  
  return (
    <div>
      {customers.length === 0 ? 'Loading...' : `${customers.length} customers`}
    </div>
  );
};

// ✅ Proper loading state
const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  return (
    <div>
      {loading ? 'Loading...' : `${customers.length} customers`}
    </div>
  );
};
```

2. **Use dynamic imports for client-only components:**
```tsx
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('@/components/ClientOnlyComponent'),
  { ssr: false }
);
```

### Form Validation Issues

**Problem:** Form validation not working correctly

**Common Issues:**

1. **Zod schema mismatches:**
```typescript
// ❌ Schema doesn't match form data
const schema = z.object({
  name: z.string(),
  businessName: z.string(), // Form sends 'name' not 'businessName'
});

// ✅ Correct schema
const schema = z.object({
  name: z.string(),
});
```

2. **React Hook Form integration:**
```tsx
// ✅ Proper setup
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: '',
    email: '',
  }
});
```

### State Management Issues

**Problem:** Zustand store not updating components

**Solutions:**

1. **Check selector specificity:**
```tsx
// ❌ Too generic - causes unnecessary re-renders
const state = useStore();

// ✅ Specific selector
const customers = useStore(state => state.customers);
const loading = useStore(state => state.loading);
```

2. **Verify store updates:**
```typescript
// Add logging to store actions
set(state => {
  console.log('Store update:', state);
  return { ...state, customers: newCustomers };
});
```

## Authentication and Authorization

### Login Issues

**Problem:** Users cannot log in with valid credentials

**Debugging Steps:**

1. **Check password hashing:**
```javascript
// In development console
const bcrypt = require('bcryptjs');
const isValid = await bcrypt.compare('plaintext', 'hashedPassword');
console.log('Password valid:', isValid);
```

2. **Verify user exists:**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

3. **Check JWT generation:**
```javascript
// Test token generation
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET);
console.log('Generated token:', token);
```

### Permission Errors

**Problem:** Users getting 403 Forbidden errors

**Solutions:**

1. **Check user roles:**
```sql
SELECT email, role, is_active FROM users WHERE email = 'user@example.com';
```

2. **Verify role-based access:**
```typescript
// Check middleware configuration
const allowedRoles = ['admin', 'dispatcher'];
const userRole = decoded.role;
const hasAccess = allowedRoles.includes(userRole);
```

## External Service Integration

### Airtable Connection Issues

**Problem:** Airtable API calls failing

**Debugging:**
```bash
# Test API key
curl -X GET "https://api.airtable.com/v0/meta/bases" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Solutions:**

1. **Check API key permissions:**
   - Verify key has read/write access
   - Check base ID is correct
   - Ensure table names match exactly

2. **Handle rate limits:**
```typescript
// Add exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
};
```

### Email/SMS Delivery Issues

**Problem:** Notifications not being sent

**Debugging Steps:**

1. **Check queue status:**
```bash
# If using Redis for queues
redis-cli
> LLEN email_queue
> LLEN sms_queue
```

2. **Verify API keys:**
```bash
# Test SendGrid
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_SENDGRID_KEY" \
  -H "Content-Type: application/json"

# Test Twilio
curl -X GET "https://api.twilio.com/2010-04-01/Accounts.json" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
```

## Performance Issues

### Slow Database Queries

**Problem:** API responses are slow

**Diagnosis:**
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;

-- Check slow queries
SELECT query, total_time, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Solutions:**

1. **Add database indexes:**
```sql
-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
  AND n_distinct > 100;

-- Add index
CREATE INDEX idx_customers_business_name ON customers(business_name);
```

2. **Optimize Prisma queries:**
```typescript
// ❌ N+1 query problem
const customers = await db.customer.findMany();
for (const customer of customers) {
  const bins = await db.bin.findMany({ where: { customerId: customer.id } });
}

// ✅ Use include
const customers = await db.customer.findMany({
  include: { bins: true }
});
```

### Frontend Performance

**Problem:** Slow page loads and interactions

**Solutions:**

1. **Code splitting:**
```tsx
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Use Suspense
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

2. **Optimize bundle:**
```bash
# Analyze bundle size
npm run build
npm run analyze
```

## Getting More Help

If you can't find a solution in this guide:

### 1. Check Logs

**Backend logs:**
```bash
# Development
tail -f logs/app.log

# Production
docker logs waste-management-app
```

**Database logs:**
```bash
# PostgreSQL logs (location varies)
tail -f /var/log/postgresql/postgresql-14-main.log
```

### 2. Enable Debug Mode

```env
# .env.local
LOG_LEVEL=debug
DEBUG=prisma:query,prisma:info
```

### 3. Use Monitoring Tools

- **Database:** pgAdmin, Prisma Studio
- **API:** Thunder Client, Postman
- **Frontend:** React DevTools, Redux DevTools
- **Performance:** Chrome DevTools, Lighthouse

### 4. Contact Support

1. **GitHub Issues:** Create detailed issue with reproduction steps
2. **Team Chat:** #development-help Slack channel
3. **Documentation:** Check other docs in `/docs` folder
4. **Stack Overflow:** Tag questions with `waste-management-system`

### 5. Create Bug Report Template

When reporting issues, include:

```markdown
**Environment:**
- Node.js version: 
- npm version:
- Operating System:
- Browser (if applicable):

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What you expected to happen

**Actual Behavior:**
What actually happened

**Error Messages:**
```
Paste error messages here
```

**Additional Context:**
Any other relevant information
```

Remember: The more details you provide, the faster we can help you resolve the issue!
```

This comprehensive documentation system provides the foundation for long-term maintainability and developer productivity, with proper code documentation, setup guides, and troubleshooting resources.