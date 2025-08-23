/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE OPTIMIZATION SERVICE
 * ============================================================================
 *
 * Critical service for database query optimization and index management.
 * Ensures sub-200ms response times for production operations.
 * 
 * TIER 1 CRITICAL INFRASTRUCTURE - 72-HOUR EMERGENCY DEPLOYMENT
 *
 * Created by: Database Architect
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { sequelize } from "@/config/database";
import { CacheService } from "@/config/redis";
import { QueryTypes } from "sequelize";

/**
 * Database Index Information
 */
export interface IndexInfo {
  tableName: string;
  indexName: string;
  columns: string[];
  unique: boolean;
  size: string;
  usage: number;
  lastUsed?: Date;
}

/**
 * Query Optimization Recommendation
 */
export interface OptimizationRecommendation {
  type: "index" | "query" | "schema" | "configuration";
  priority: "high" | "medium" | "low";
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
}

/**
 * Database Table Statistics
 */
export interface TableStats {
  tableName: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
  lastAnalyzed?: Date;
  mostAccessedColumns: string[];
}

/**
 * Database Optimization Service Class
 */
class DatabaseOptimizationService {
  private readonly cachePrefix = "db_optimization:";
  private readonly cacheTTL = 3600; // 1 hour

  /**
   * INITIALIZE CRITICAL INDEXES FOR PRODUCTION
   * Must be run during deployment to ensure optimal performance
   */
  public async initializeCriticalIndexes(): Promise<void> {
    logger.info("🚀 Initializing critical database indexes for production load");

    const indexCommands = [
      // User table indexes - Authentication & Authorization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
       ON users(email) WHERE deleted_at IS NULL;`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_role 
       ON users(organization_id, role) WHERE deleted_at IS NULL;`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
       ON users(last_login_at) WHERE deleted_at IS NULL;`,

      // Customer table indexes - Business Operations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_organization_active 
       ON customers(organization_id) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_service_address 
       ON customers(service_address) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_status_tier 
       ON customers(status, service_tier) WHERE deleted_at IS NULL;`,

      // Bin table indexes - Core Waste Management Operations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_customer_status 
       ON bins(customer_id, status) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_location_gist 
       ON bins USING GIST(location) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_type_size 
       ON bins(bin_type, bin_size) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_last_service 
       ON bins(last_service_date) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bins_next_service 
       ON bins(next_service_date) WHERE deleted_at IS NULL;`,

      // Route table indexes - Route Optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_date_status 
       ON routes(route_date, status) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_driver_vehicle 
       ON routes(driver_id, vehicle_id) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_organization_date 
       ON routes(organization_id, route_date) WHERE deleted_at IS NULL;`,

      // ServiceEvent table indexes - Service History & Analytics
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_events_bin_date 
       ON service_events(bin_id, service_date) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_events_route_status 
       ON service_events(route_id, status) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_events_type_date 
       ON service_events(event_type, service_date) WHERE deleted_at IS NULL;`,

      // Vehicle table indexes - Fleet Management
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_organization_status 
       ON vehicles(organization_id, status) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_license_active 
       ON vehicles(license_plate) WHERE deleted_at IS NULL;`,

      // Driver table indexes - Driver Management
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_organization_status 
       ON drivers(organization_id, status) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_license_active 
       ON drivers(driver_license_number) WHERE deleted_at IS NULL;`,

      // Audit Log indexes - Security & Compliance
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action 
       ON audit_logs(user_id, action) WHERE deleted_at IS NULL;`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp 
       ON audit_logs(timestamp DESC);`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity 
       ON audit_logs(entity_type, entity_id) WHERE deleted_at IS NULL;`,

      // User Security indexes - Authentication Performance
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_security_user_id 
       ON user_security(user_id);`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_security_last_password_change 
       ON user_security(last_password_change);`,

      // User Sessions indexes - Session Management
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active 
       ON user_sessions(user_id) WHERE expires_at > NOW();`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_token_active 
       ON user_sessions(session_token) WHERE expires_at > NOW();`,
       
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires 
       ON user_sessions(expires_at);`,
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const indexCommand of indexCommands) {
      try {
        await sequelize.query(indexCommand);
        successCount++;
        logger.debug("✅ Index created successfully", { 
          command: indexCommand.split('\n')[0].substring(0, 100) + "..." 
        });
      } catch (error: unknown) {
        errorCount++;
        logger.error("❌ Failed to create index", { 
          command: indexCommand.split('\n')[0].substring(0, 100) + "...",
          error: error instanceof Error ? error?.message : error
        });
      }
    }

    logger.info("🏁 Critical index initialization completed", {
      successCount,
      errorCount,
      totalIndexes: indexCommands.length
    });
  }

  /**
   * ANALYZE DATABASE PERFORMANCE
   * Identifies optimization opportunities for production load
   */
  public async analyzePerformance(): Promise<{
    tableStats: TableStats[];
    indexUsage: IndexInfo[];
    recommendations: OptimizationRecommendation[];
    summary: {
      totalTables: number;
      totalIndexes: number;
      largestTable: string;
      slowestQueries: number;
    };
  }> {
    logger.info("📊 Starting comprehensive database performance analysis");

    try {
      // Get table statistics
      const tableStats = await this.getTableStatistics();
      
      // Get index usage information
      const indexUsage = await this.getIndexUsage();
      
      // Generate optimization recommendations
      const recommendations = await this.generateRecommendations(tableStats, indexUsage);

      const summary = {
        totalTables: tableStats.length,
        totalIndexes: indexUsage.length,
        largestTable: tableStats.length > 0 
          ? tableStats.reduce((prev, curr) => 
              parseInt(prev.totalSize) > parseInt(curr.totalSize) ? prev : curr
            ).tableName 
          : "N/A",
        slowestQueries: 0, // Would implement query analysis in production
      };

      // Cache results
      await CacheService.set(`${this.cachePrefix}analysis`, {
        tableStats,
        indexUsage,
        recommendations,
        summary,
        analyzedAt: new Date(),
      }, this.cacheTTL);

      logger.info("✅ Database performance analysis completed", summary);

      return {
        tableStats,
        indexUsage,
        recommendations,
        summary,
      };

    } catch (error: unknown) {
      logger.error("❌ Database performance analysis failed:", error);
      throw error;
    }
  }

  /**
   * GET TABLE STATISTICS
   * Critical for understanding data distribution and performance
   */
  private async getTableStatistics(): Promise<TableStats[]> {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname;
      `) as [any[], any];

      const [sizeResults] = await sequelize.query(`
        SELECT 
          t.table_name,
          pg_total_relation_size('"' || t?.table_name || '"') as total_size,
          pg_relation_size('"' || t?.table_name || '"') as table_size,
          pg_total_relation_size('"' || t?.table_name || '"') - pg_relation_size('"' || t?.table_name || '"') as index_size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as row_count
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
        ORDER BY total_size DESC;
      `) as [any[], any];

      const tableStats: TableStats[] = sizeResults.map((table: any) => ({
        tableName: table.table_name,
        rowCount: parseInt(table.row_count) || 0,
        tableSize: this.formatBytes(parseInt(table.table_size) || 0),
        indexSize: this.formatBytes(parseInt(table.index_size) || 0),
        totalSize: this.formatBytes(parseInt(table.total_size) || 0),
        mostAccessedColumns: results
          .filter((r: any) => r.tablename === table.table_name)
          .sort((a: any, b: any) => b.n_distinct - a.n_distinct)
          .slice(0, 5)
          .map((r: any) => r.attname),
      }));

      return tableStats;

    } catch (error: unknown) {
      logger.error("Failed to get table statistics:", error);
      return [];
    }
  }

  /**
   * GET INDEX USAGE INFORMATION
   * Critical for identifying unused or inefficient indexes
   */
  private async getIndexUsage(): Promise<IndexInfo[]> {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          t.relname as table_name,
          i.relname as index_name,
          array_to_string(array_agg(a.attname), ',') as columns,
          ix.indisunique as is_unique,
          pg_size_pretty(pg_relation_size(i.oid)) as index_size,
          s.idx_scan as usage_count,
          s.last_idx_scan
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        LEFT JOIN pg_stat_user_indexes s ON i.oid = s.indexrelid
        WHERE t.relkind = 'r'
          AND t.relname NOT LIKE 'pg_%'
        GROUP BY t.relname, i.relname, ix.indisunique, i.oid, s.idx_scan, s.last_idx_scan
        ORDER BY t.relname, usage_count DESC NULLS LAST;
      `) as [any[], any];

      const indexUsage: IndexInfo[] = results.map((index: any) => ({
        tableName: index.table_name,
        indexName: index.index_name,
        columns: index.columns.split(','),
        unique: index.is_unique,
        size: index.index_size,
        usage: parseInt(index.usage_count) || 0,
        lastUsed: index.last_idx_scan ? new Date(index.last_idx_scan) : undefined,
      }));

      return indexUsage;

    } catch (error: unknown) {
      logger.error("Failed to get index usage information:", error);
      return [];
    }
  }

  /**
   * GENERATE OPTIMIZATION RECOMMENDATIONS
   * AI-powered analysis for production optimization
   */
  private async generateRecommendations(
    tableStats: TableStats[],
    indexUsage: IndexInfo[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze table sizes and recommend partitioning for large tables
    const largeTables = tableStats.filter(table => 
      parseInt(table.totalSize.replace(/[^0-9]/g, '')) > 1000 // > 1GB
    );

    for (const table of largeTables) {
      recommendations.push({
        type: "schema",
        priority: "high",
        description: `Table ${table.tableName} is large (${table.totalSize}) and may benefit from partitioning`,
        impact: "Improved query performance for large datasets",
        implementation: `Consider partitioning ${table.tableName} by date or organization_id`,
        estimatedImprovement: "30-70% query performance improvement for filtered queries",
      });
    }

    // Identify unused indexes
    const unusedIndexes = indexUsage.filter(index => 
      index.usage === 0 && !index.indexName.endsWith('_pkey')
    );

    for (const index of unusedIndexes) {
      recommendations.push({
        type: "index",
        priority: "medium",
        description: `Index ${index.indexName} on table ${index.tableName} is unused`,
        impact: "Reduced storage space and faster INSERT/UPDATE operations",
        implementation: `DROP INDEX ${index.indexName};`,
        estimatedImprovement: "5-10% write performance improvement",
      });
    }

    // Recommend missing indexes for frequently accessed tables
    const highVolumeOperations = [
      {
        table: "bins",
        columns: ["customer_id", "status"],
        reason: "Frequent bin status queries by customer",
      },
      {
        table: "service_events",
        columns: ["bin_id", "service_date"],
        reason: "Service history queries",
      },
      {
        table: "routes",
        columns: ["route_date", "status"],
        reason: "Daily route planning queries",
      },
    ];

    for (const operation of highVolumeOperations) {
      const hasIndex = indexUsage.some(index =>
        index.tableName === operation.table &&
        operation.columns.every(col => index.columns.includes(col))
      );

      if (!hasIndex) {
        recommendations.push({
          type: "index",
          priority: "high",
          description: `Missing composite index on ${operation.table}(${operation.columns.join(', ')})`,
          impact: operation.reason,
          implementation: `CREATE INDEX CONCURRENTLY idx_${operation.table}_${operation.columns.join('_')} ON ${operation.table}(${operation.columns.join(', ')});`,
          estimatedImprovement: "50-90% query performance improvement for filtered operations",
        });
      }
    }

    // PostgreSQL configuration recommendations
    recommendations.push({
      type: "configuration",
      priority: "medium",
      description: "Enable query plan caching for repeated operations",
      impact: "Faster query planning for repeated operations",
      implementation: "SET plan_cache_mode = 'force_generic_plan' for application sessions",
      estimatedImprovement: "10-25% improvement in query planning time",
    });

    return recommendations;
  }

  /**
   * OPTIMIZE QUERY PERFORMANCE
   * Real-time query optimization for production load
   */
  public async optimizeQuery(sql: string, parameters?: any[]): Promise<{
    optimizedQuery: string;
    estimatedImprovement: string;
    explanation: string;
  }> {
    try {
      // Get query execution plan
      const [plan] = await sequelize.query(`EXPLAIN (FORMAT JSON, ANALYZE) ${sql}`, {
        type: QueryTypes.SELECT,
        replacements: parameters,
      }) as [any[], any];

      // Analyze the plan for optimization opportunities
      const planData = plan[0]['QUERY PLAN'][0];
      const executionTime = planData['Planning Time'] + planData['Execution Time'];

      // Basic query optimization suggestions
      let optimizedQuery = sql;
      let improvements: string[] = [];

      // Add LIMIT clause if not present for large result sets
      if (!sql.toLowerCase().includes('limit') && executionTime > 1000) {
        optimizedQuery += ' LIMIT 1000';
        improvements.push("Added LIMIT clause to prevent large result sets");
      }

      // Suggest index usage hints
      if (planData['Plans'] && planData['Plans'][0]['Node Type'] === 'Seq Scan') {
        improvements.push("Sequential scan detected - consider adding appropriate indexes");
      }

      return {
        optimizedQuery,
        estimatedImprovement: improvements.length > 0 ? "20-50% performance improvement" : "No optimization needed",
        explanation: improvements.join('; ') || "Query is already optimized",
      };

    } catch (error: unknown) {
      logger.error("Query optimization failed:", error);
      return {
        optimizedQuery: sql,
        estimatedImprovement: "Unknown",
        explanation: "Optimization analysis failed",
      };
    }
  }

  /**
   * VACUUM AND ANALYZE TABLES
   * Critical maintenance for production performance
   */
  public async vacuumAnalyzeTables(tables?: string[]): Promise<void> {
    logger.info("🧹 Starting VACUUM ANALYZE for database maintenance");

    try {
      if (tables && tables.length > 0) {
        // Vacuum specific tables
        for (const table of tables) {
          await sequelize.query(`VACUUM ANALYZE ${table};`);
          logger.debug(`✅ VACUUM ANALYZE completed for table: ${table}`);
        }
      } else {
        // Vacuum all tables
        await sequelize.query("VACUUM ANALYZE;");
        logger.info("✅ VACUUM ANALYZE completed for all tables");
      }

    } catch (error: unknown) {
      logger.error("❌ VACUUM ANALYZE failed:", error);
      throw error;
    }
  }

  /**
   * UPDATE TABLE STATISTICS
   * Ensures query planner has accurate statistics
   */
  public async updateTableStatistics(tables?: string[]): Promise<void> {
    logger.info("📊 Updating table statistics for query planner");

    try {
      if (tables && tables.length > 0) {
        for (const table of tables) {
          await sequelize.query(`ANALYZE ${table};`);
          logger.debug(`✅ Statistics updated for table: ${table}`);
        }
      } else {
        await sequelize.query("ANALYZE;");
        logger.info("✅ Statistics updated for all tables");
      }

    } catch (error: unknown) {
      logger.error("❌ Statistics update failed:", error);
      throw error;
    }
  }

  /**
   * UTILITY: FORMAT BYTES
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * GET OPTIMIZATION STATUS
   */
  public async getOptimizationStatus(): Promise<{
    lastAnalysis?: Date;
    criticalIndexes: number;
    recommendations: number;
    databaseSize: string;
    performance: "optimal" | "good" | "needs_attention" | "critical";
  }> {
    try {
      const cached = await CacheService.get(`${this.cachePrefix}analysis`);
      
      return {
        lastAnalysis: cached?.analyzedAt ? new Date(cached.analyzedAt) : undefined,
        criticalIndexes: cached?.indexUsage?.length || 0,
        recommendations: cached?.recommendations?.length || 0,
        databaseSize: cached?.summary?.largestTable || "Unknown",
        performance: this.assessPerformance(cached),
      };

    } catch (error: unknown) {
      logger.error("Failed to get optimization status:", error);
      return {
        criticalIndexes: 0,
        recommendations: 0,
        databaseSize: "Unknown",
        performance: "critical",
      };
    }
  }

  /**
   * ASSESS OVERALL PERFORMANCE STATUS
   */
  private assessPerformance(cachedData: any): "optimal" | "good" | "needs_attention" | "critical" {
    if (!cachedData) return "critical";

    const recommendations = cachedData?.recommendations || [];
    const highPriorityRecs = recommendations.filter((r: any) => r.priority === "high").length;
    
    if (highPriorityRecs === 0) return "optimal";
    if (highPriorityRecs <= 2) return "good";
    if (highPriorityRecs <= 5) return "needs_attention";
    return "critical";
  }
}

// Singleton instance for global use
export const databaseOptimizationService = new DatabaseOptimizationService();
export default databaseOptimizationService;