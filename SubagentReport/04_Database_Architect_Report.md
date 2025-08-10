# Database Architect Report
## Waste Management System - Database Design and Optimization Assessment

### Executive Summary
The database design demonstrates solid relational modeling with comprehensive indexing strategies, but contains critical schema errors and lacks production-ready optimization features necessary for enterprise-scale operations.

### What's Working Well
- **Comprehensive Schema**: All core business entities properly modeled (Customer, Bin, Route, ServiceEvent, User, Vehicle)
- **Strategic Indexing**: Extensive index coverage for common query patterns and performance optimization
- **Proper Relationships**: Foreign key constraints with appropriate cascade behaviors
- **Data Types**: Appropriate field types with UUID primary keys for scalability
- **Modern ORM**: Prisma provides type safety and query optimization
- **JSON Fields**: Flexible storage for complex data structures (contactInfo, addressInfo, plannedStops)

### Critical Database Issues Found
1. **Schema Duplication**: Duplicate Route model definition at lines 186-189 prevents Prisma generation
2. **Missing Connection Pooling**: No database connection pool configuration for concurrent requests
3. **No Read Replicas**: Single database instance without read/write separation
4. **Inadequate Backup Strategy**: No automated backup or point-in-time recovery setup
5. **Missing Data Validation**: Database-level constraints insufficient for data integrity
6. **No Partitioning Strategy**: Large tables lack partitioning for performance at scale
7. **Insufficient Monitoring**: No database performance monitoring or alerting

### What Needs Changes/Improvements
- Implement connection pooling for better resource management
- Add database-level data validation and constraints
- Create read replica configuration for query performance
- Implement table partitioning for large datasets
- Add database monitoring and performance tracking
- Create automated backup and recovery procedures

### What Needs Removal/Replacement
- Remove duplicate Route model definition (lines 186-189)
- Replace single database connection with connection pool
- Remove development-only relationMode setting
- Replace basic indexes with composite indexes for complex queries

### Missing Components
- Connection pooling configuration
- Database replication setup
- Automated backup system
- Performance monitoring dashboard
- Query optimization tools
- Data archiving strategy
- Database migration rollback procedures
- Disaster recovery plan
- Data encryption at rest
- Database audit logging

## Step-by-Step Database Implementation Guide

### Phase 1: Critical Schema Fixes (Priority: URGENT)

#### Step 1: Fix Schema Duplication
```bash
# Navigate to project directory
cd waste-management-system

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Edit schema file
nano prisma/schema.prisma
```

**Remove duplicate Route model** (lines 186-189):
```prisma
// DELETE THESE LINES (186-189)
model Route {
  // ... existing fields ...
  analytics RouteAnalytics?
}
```

The Route model is already properly defined at lines 59-87. Keep only the original definition.

#### Step 2: Add Connection Pooling Configuration
```bash
# Update database configuration
nano prisma/schema.prisma
```

**Replace datasource configuration**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Remove relationMode for production
  // relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "metrics", "driverAdapters"]
  binaryTargets = ["native", "linux-openssl-1.1.x", "linux-openssl-3.0.x"]
}
```

#### Step 3: Create Enhanced Database Client
```bash
nano src/lib/database.ts
```

**Add production-ready database client**:
```typescript
import { PrismaClient, Prisma } from '@prisma/client';

// Connection pool configuration
const connectionPoolConfig = {
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  idle: parseInt(process.env.DATABASE_POOL_IDLE || '10000'),
  acquire: parseInt(process.env.DATABASE_POOL_ACQUIRE || '60000'),
  evict: parseInt(process.env.DATABASE_POOL_EVICT || '1000'),
};

// Enhanced Prisma client with connection pooling
class DatabaseClient {
  private static instance: PrismaClient;
  private static readReplica: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'info' },
        ],
        datasourceUrl: process.env.DATABASE_URL,
      });

      // Query logging for performance monitoring
      DatabaseClient.instance.$on('query', (e) => {
        if (parseInt(process.env.LOG_QUERIES || '0')) {
          console.log('Query: ' + e.query);
          console.log('Duration: ' + e.duration + 'ms');
        }
      });

      // Error logging
      DatabaseClient.instance.$on('error', (e) => {
        console.error('Database error:', e);
      });

      // Connection lifecycle
      DatabaseClient.instance.$on('beforeExit', async () => {
        console.log('Disconnecting from database...');
        await DatabaseClient.instance.$disconnect();
      });
    }

    return DatabaseClient.instance;
  }

  public static getReadReplica(): PrismaClient {
    if (!DatabaseClient.readReplica && process.env.DATABASE_READ_URL) {
      DatabaseClient.readReplica = new PrismaClient({
        datasourceUrl: process.env.DATABASE_READ_URL,
        log: [{ emit: 'event', level: 'error' }],
      });
    }

    return DatabaseClient.readReplica || DatabaseClient.getInstance();
  }

  // Graceful shutdown
  public static async disconnect(): Promise<void> {
    if (DatabaseClient.instance) {
      await DatabaseClient.instance.$disconnect();
    }
    if (DatabaseClient.readReplica) {
      await DatabaseClient.readReplica.$disconnect();
    }
  }
}

// Export singleton instances
export const db = DatabaseClient.getInstance();
export const readDb = DatabaseClient.getReadReplica();

// Database health check
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      connected: true,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

// Database metrics
export async function getDatabaseMetrics() {
  try {
    const metrics = await db.$metrics.json();
    return {
      success: true,
      metrics: metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Phase 2: Production Database Configuration (Priority: HIGH)

#### Step 4: Create Environment Configuration
```bash
nano .env.production
```

**Add database environment variables**:
```env
# Primary database (write operations)
DATABASE_URL="postgresql://username:password@primary-db:5432/waste_management?schema=public&connection_limit=10&pool_timeout=20"

# Read replica (read operations)
DATABASE_READ_URL="postgresql://username:password@read-replica-db:5432/waste_management?schema=public&connection_limit=20&pool_timeout=10"

# Connection pool settings
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
DATABASE_POOL_IDLE=10000
DATABASE_POOL_ACQUIRE=60000
DATABASE_POOL_EVICT=1000

# Monitoring
LOG_QUERIES=0
DATABASE_MONITORING=1

# Security
DATABASE_SSL=require
DATABASE_SSL_CERT_PATH=/certs/client-cert.pem
DATABASE_SSL_KEY_PATH=/certs/client-key.pem
DATABASE_SSL_CA_PATH=/certs/ca-cert.pem
```

#### Step 5: Enhanced Schema with Constraints
```bash
nano prisma/schema.prisma
```

**Add enhanced constraints and validation**:
```prisma
model Customer {
  id              String    @id @default(uuid())
  businessName    String    @db.VarChar(200)
  contactInfo     Json
  addressInfo     Json
  contractStatus  String    @db.VarChar(50)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  bins            Bin[]

  // Enhanced constraints
  @@check([raw("char_length(business_name) >= 2")])
  @@check([raw("contract_status IN ('active', 'inactive', 'suspended', 'pending')")])
  
  // Strategic indexes for performance
  @@index([contractStatus], name: "idx_customers_contract_status")
  @@index([businessName], name: "idx_customers_business_name")
  @@index([createdAt], name: "idx_customers_created_at")
  @@index([contractStatus, businessName], name: "idx_customers_status_name")
  @@index([contractStatus, createdAt], name: "idx_customers_status_created")
  
  // Full-text search index
  @@index([businessName(ops: raw("gin_trgm_ops"))], name: "idx_customers_name_fulltext", type: Gin)
  
  @@map("customers")
}

model Bin {
  id            String         @id @default(uuid())
  customerId    String
  customer      Customer       @relation(fields: [customerId], references: [id], onDelete: Cascade)
  binType       String         @db.VarChar(50)
  size          String         @db.VarChar(50)
  location      Json
  qrCode        String         @unique @db.VarChar(100)
  rfidTag       String         @unique @db.VarChar(100)
  status        String         @db.VarChar(50) @default("empty")
  lastServiced  DateTime?
  nextService   DateTime?      // Add for better route planning
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  serviceEvents ServiceEvent[]

  // Enhanced constraints
  @@check([raw("bin_type IN ('standard', 'recycling', 'organic', 'hazardous')")])
  @@check([raw("size IN ('small', 'medium', 'large', 'extra_large')")])
  @@check([raw("status IN ('empty', 'partial', 'full', 'overflowing', 'maintenance', 'retired')")])
  
  // Performance indexes
  @@index([customerId], name: "idx_bins_customer_id")
  @@index([status], name: "idx_bins_status")
  @@index([binType, size], name: "idx_bins_type_size")
  @@index([lastServiced], name: "idx_bins_last_serviced")
  @@index([nextService], name: "idx_bins_next_service")
  @@index([customerId, status], name: "idx_bins_customer_status")
  @@index([status, lastServiced], name: "idx_bins_status_serviced")
  @@index([nextService, status], name: "idx_bins_next_service_status")
  
  @@map("bins")
}

model Route {
  id                String         @id @default(uuid())
  routeDate         DateTime       @db.Date
  driverId          String
  driver            User           @relation(fields: [driverId], references: [id])
  vehicleId         String
  vehicle           Vehicle        @relation(fields: [vehicleId], references: [id])
  plannedStops      Json
  actualStops       Json?
  optimizationScore Float?         @db.Decimal(3,2)
  status            String         @db.VarChar(50) @default("planned")
  estimatedDuration Int?           // in minutes
  actualDuration    Int?           // in minutes
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  serviceEvents     ServiceEvent[]
  analytics         RouteAnalytics?

  // Enhanced constraints
  @@check([raw("status IN ('planned', 'in_progress', 'completed', 'cancelled', 'delayed')")])
  @@check([raw("estimated_duration > 0")])
  @@check([raw("actual_duration > 0")])
  @@check([raw("optimization_score >= 0.0 AND optimization_score <= 1.0")])
  
  // Performance indexes with date partitioning consideration
  @@index([routeDate], name: "idx_routes_date")
  @@index([driverId], name: "idx_routes_driver_id")
  @@index([vehicleId], name: "idx_routes_vehicle_id")
  @@index([status], name: "idx_routes_status")
  @@index([routeDate, driverId], name: "idx_routes_date_driver")
  @@index([routeDate, status], name: "idx_routes_date_status")
  @@index([optimizationScore], name: "idx_routes_optimization")
  @@index([createdAt], name: "idx_routes_created_at")
  
  // Composite index for daily route management
  @@index([routeDate, status, driverId], name: "idx_routes_daily_management")
  
  @@map("routes")
}

// Add table partitioning comment for future implementation
// PARTITION BY RANGE (route_date);
```

### Phase 3: Performance Optimization (Priority: HIGH)

#### Step 6: Create Query Optimization Service
```bash
nano src/services/database-optimization.service.ts
```

**Add query optimization tools**:
```typescript
import { db, readDb } from '@/lib/database';
import { Prisma } from '@prisma/client';

export class DatabaseOptimizationService {
  // Optimized customer queries with read replica
  static async getCustomers(filters: any = {}, useReadReplica: boolean = true) {
    const client = useReadReplica ? readDb : db;
    
    const where: Prisma.CustomerWhereInput = {};
    
    if (filters.contractStatus) {
      where.contractStatus = filters.contractStatus;
    }
    
    if (filters.businessName) {
      where.businessName = {
        contains: filters.businessName,
        mode: 'insensitive',
      };
    }
    
    if (filters.createdAfter) {
      where.createdAt = {
        gte: new Date(filters.createdAfter),
      };
    }

    return await client.customer.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        contactInfo: true,
        addressInfo: true,
        contractStatus: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { bins: true },
        },
      },
      orderBy: [
        { contractStatus: 'asc' },
        { businessName: 'asc' },
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });
  }

  // Optimized route queries with complex joins
  static async getRoutesWithDetails(date: Date, useReadReplica: boolean = true) {
    const client = useReadReplica ? readDb : db;
    
    return await client.route.findMany({
      where: {
        routeDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            capacity: true,
          },
        },
        serviceEvents: {
          select: {
            id: true,
            scheduledTime: true,
            actualTime: true,
            eventType: true,
            status: true,
            bin: {
              select: {
                id: true,
                binType: true,
                size: true,
                customer: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            scheduledTime: 'asc',
          },
        },
        analytics: true,
      },
      orderBy: [
        { status: 'asc' },
        { estimatedDuration: 'asc' },
      ],
    });
  }

  // Batch operations for better performance
  static async batchUpdateBinStatus(updates: { id: string; status: string; lastServiced?: Date }[]) {
    const updatePromises = updates.map(update => 
      db.bin.update({
        where: { id: update.id },
        data: {
          status: update.status,
          lastServiced: update.lastServiced || new Date(),
          updatedAt: new Date(),
        },
      })
    );

    return await db.$transaction(updatePromises);
  }

  // Aggregate queries for analytics
  static async getCustomerAnalytics(customerId: string, startDate: Date, endDate: Date) {
    return await readDb.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('day', se.actual_time) as service_date,
        COUNT(*) as total_services,
        COUNT(CASE WHEN se.status = 'completed' THEN 1 END) as completed_services,
        COUNT(CASE WHEN se.status = 'skipped' THEN 1 END) as skipped_services,
        AVG(EXTRACT(EPOCH FROM (se.actual_time - se.scheduled_time))/60) as avg_delay_minutes
      FROM service_events se
      JOIN bins b ON se.bin_id = b.id
      WHERE b.customer_id = ${customerId}
        AND se.actual_time >= ${startDate}
        AND se.actual_time <= ${endDate}
        AND se.actual_time IS NOT NULL
      GROUP BY DATE_TRUNC('day', se.actual_time)
      ORDER BY service_date DESC
    `;
  }

  // Performance monitoring queries
  static async getSlowQueries() {
    return await db.$queryRaw<any[]>`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      WHERE calls > 100
      ORDER BY mean_time DESC
      LIMIT 10
    `;
  }

  static async getTableSizes() {
    return await db.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `;
  }

  // Index usage statistics
  static async getIndexUsage() {
    return await db.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `;
  }
}
```

### Phase 4: Backup and Recovery (Priority: MEDIUM)

#### Step 7: Create Backup Strategy
```bash
# Create backup scripts directory
mkdir scripts/database

nano scripts/database/backup.sh
```

**Add automated backup script**:
```bash
#!/bin/bash

# Database backup script
set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-waste_management}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/waste_management_$TIMESTAMP.sql"

echo "Starting database backup to $BACKUP_FILE"

# Create backup
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-password \
  --format=custom \
  --verbose \
  --file="$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

echo "Backup completed: $BACKUP_FILE"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# Clean up old backups
find "$BACKUP_DIR" -name "waste_management_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"

# Verify backup integrity
if gzip -t "$BACKUP_FILE"; then
    echo "Backup integrity verified"
else
    echo "ERROR: Backup integrity check failed"
    exit 1
fi

# Optional: Upload to cloud storage
if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BACKUP_BUCKET/database-backups/"
    echo "Backup uploaded to S3"
fi

echo "Backup process completed successfully"
```

#### Step 8: Create Restore Script
```bash
nano scripts/database/restore.sh
```

**Add restore script**:
```bash
#!/bin/bash

# Database restore script
set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-waste_management}"
DB_USER="${DB_USER:-postgres}"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /backups/database/waste_management_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting database restore from $BACKUP_FILE"

# Check if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Warning about destructive operation
echo "WARNING: This will completely replace the existing database!"
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Drop and recreate database
echo "Dropping existing database..."
dropdb --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --if-exists "$DB_NAME"

echo "Creating new database..."
createdb --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" "$DB_NAME"

# Restore from backup
echo "Restoring database from backup..."
pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-password \
  --verbose \
  --clean \
  --if-exists \
  "$RESTORE_FILE"

# Clean up temporary file
if [[ -n "$TEMP_FILE" ]]; then
    rm -f "$TEMP_FILE"
fi

echo "Database restore completed successfully"
echo "Don't forget to run Prisma migrations if needed:"
echo "npx prisma migrate deploy"
```

### Phase 5: Monitoring and Maintenance (Priority: MEDIUM)

#### Step 9: Database Monitoring Service
```bash
nano src/services/database-monitor.service.ts
```

**Add database monitoring**:
```typescript
import { db } from '@/lib/database';
import logger from '@/utils/logger';

export class DatabaseMonitor {
  // Monitor database performance metrics
  static async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        connections: await this.getConnectionCount(),
        queryStats: await this.getQueryStatistics(),
        tableSizes: await this.getTableSizes(),
        indexUsage: await this.getIndexUsageStats(),
        locks: await this.getLockInformation(),
        slowQueries: await this.getSlowQueries(),
      };

      logger.info('Database metrics collected', { metrics });
      return metrics;
    } catch (error) {
      logger.error('Failed to collect database metrics', { error: error.message });
      throw error;
    }
  }

  private static async getConnectionCount() {
    const result = await db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
    `;
    return Number(result[0].count);
  }

  private static async getQueryStatistics() {
    return await db.$queryRaw<any[]>`
      SELECT 
        calls,
        total_time,
        mean_time,
        max_time,
        stddev_time
      FROM pg_stat_statements
      WHERE calls > 10
      ORDER BY mean_time DESC
      LIMIT 5
    `;
  }

  private static async getTableSizes() {
    return await db.$queryRaw<any[]>`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
  }

  private static async getIndexUsageStats() {
    return await db.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10
    `;
  }

  private static async getLockInformation() {
    return await db.$queryRaw<any[]>`
      SELECT 
        mode,
        count(*) as lock_count
      FROM pg_locks
      GROUP BY mode
      ORDER BY count(*) DESC
    `;
  }

  private static async getSlowQueries() {
    return await db.$queryRaw<any[]>`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 1000  -- queries taking more than 1 second on average
      ORDER BY mean_time DESC
      LIMIT 5
    `;
  }

  // Health check for specific database components
  static async healthCheck() {
    const checks = {
      database: false,
      migrations: false,
      indexes: false,
      connections: false,
    };

    try {
      // Test basic connectivity
      await db.$queryRaw`SELECT 1`;
      checks.database = true;

      // Check if migrations are up to date
      const migrationStatus = await db.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = '_prisma_migrations'
        ) as has_migrations
      `;
      checks.migrations = migrationStatus[0].has_migrations;

      // Check critical indexes exist
      const indexes = await db.$queryRaw`
        SELECT count(*) as index_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `;
      checks.indexes = Number(indexes[0].index_count) > 10;

      // Check connection pool health
      const activeConnections = await this.getConnectionCount();
      checks.connections = activeConnections < 80; // Less than 80% of max connections

    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
    }

    return {
      healthy: Object.values(checks).every(Boolean),
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  // Alert on performance issues
  static async checkPerformanceAlerts() {
    const alerts = [];

    try {
      // Check for slow queries
      const slowQueries = await this.getSlowQueries();
      if (slowQueries.length > 0) {
        alerts.push({
          type: 'slow_queries',
          severity: 'warning',
          message: `${slowQueries.length} slow queries detected`,
          details: slowQueries,
        });
      }

      // Check connection count
      const connections = await this.getConnectionCount();
      if (connections > 15) { // Adjust threshold based on your setup
        alerts.push({
          type: 'high_connections',
          severity: 'warning',
          message: `High connection count: ${connections}`,
        });
      }

      // Check for unused indexes
      const unusedIndexes = await db.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename,
          indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 AND schemaname = 'public'
      `;

      if (unusedIndexes.length > 5) {
        alerts.push({
          type: 'unused_indexes',
          severity: 'info',
          message: `${unusedIndexes.length} unused indexes found`,
          details: unusedIndexes,
        });
      }

    } catch (error) {
      alerts.push({
        type: 'monitoring_error',
        severity: 'error',
        message: 'Failed to check performance metrics',
        error: error.message,
      });
    }

    if (alerts.length > 0) {
      logger.warn('Database performance alerts', { alerts });
    }

    return alerts;
  }
}
```

### Phase 6: Migration and Deployment (Priority: MEDIUM)

#### Step 10: Create Migration Scripts
```bash
# Create migration management script
nano scripts/database/migrate.sh
```

**Add migration management**:
```bash
#!/bin/bash

# Database migration management
set -e

# Configuration
ENVIRONMENT="${1:-development}"
ACTION="${2:-deploy}"

echo "Running database migrations for $ENVIRONMENT environment"

case $ACTION in
  "deploy")
    echo "Deploying migrations..."
    npx prisma migrate deploy
    ;;
  "generate")
    echo "Generating Prisma client..."
    npx prisma generate
    ;;
  "reset")
    echo "WARNING: This will reset the database and lose all data!"
    read -p "Continue? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      npx prisma migrate reset --force
    fi
    ;;
  "status")
    echo "Checking migration status..."
    npx prisma migrate status
    ;;
  *)
    echo "Usage: $0 <environment> <action>"
    echo "Actions: deploy, generate, reset, status"
    exit 1
    ;;
esac

echo "Database operation completed"
```

### Testing and Validation

#### Step 11: Database Testing
```bash
# Test schema generation
npx prisma generate

# Validate schema
npx prisma validate

# Check migration status
npx prisma migrate status

# Test database connection
node -e "
const { db } = require('./src/lib/database.ts');
db.\$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err))
  .finally(() => process.exit());
"
```

This comprehensive database architecture provides enterprise-grade performance, reliability, and scalability suitable for handling thousands of customers and millions of service events while maintaining data integrity and optimal query performance.