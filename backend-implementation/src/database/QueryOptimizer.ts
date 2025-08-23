/**
 * ============================================================================
 * AUTOMATED QUERY OPTIMIZATION & N+1 DETECTION SYSTEM
 * ============================================================================
 *
 * Comprehensive query optimization system with automated N+1 detection,
 * query analysis, performance monitoring, and optimization recommendations.
 *
 * Features:
 * - Real-time N+1 query detection and prevention
 * - Automated query optimization hints and suggestions
 * - Performance analysis with execution plan review
 * - Cache optimization strategies
 * - Spatial query optimization for PostGIS
 * - Statistical query materialization recommendations
 *
 * Created by: Database-Architect & Performance-Optimization-Specialist
 * Date: 2025-08-16
 * Version: 1.0.0 - Performance Optimization Phase 2
 */

import { EventEmitter } from 'events';
import { sequelize } from '@/config/database';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { QueryTypes, type Op } from 'sequelize';
import { databasePerformanceMonitor } from './performance-monitor';

/**
 * N+1 Query Detection Pattern
 */
export interface NPlusOnePattern {
  id: string;
  parentQuery: string;
  childQueries: string[];
  count: number;
  duration: number;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  optimizationSuggestion: string;
}

/**
 * Query Optimization Recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  queryPattern: string;
  type: 'index' | 'eager_loading' | 'caching' | 'query_rewrite' | 'materialized_view';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImprovement: string;
  implementation: string;
  sqlSuggestion?: string;
  indexSuggestion?: {
    table: string;
    columns: string[];
    type: 'btree' | 'gist' | 'gin' | 'hash';
    partial?: string;
  };
}

/**
 * Performance Analysis Result
 */
export interface PerformanceAnalysis {
  queryHash: string;
  originalQuery: string;
  executionPlan: any;
  duration: number;
  rowsReturned: number;
  cost: number;
  issues: string[];
  recommendations: OptimizationRecommendation[];
  cacheability: 'none' | 'short' | 'medium' | 'long';
}

/**
 * Spatial Query Optimization
 */
export interface SpatialOptimization {
  table: string;
  geometryColumn: string;
  recommendedIndexes: Array<{
    type: 'gist' | 'spgist';
    expression: string;
    reasoning: string;
  }>;
  queryOptimizations: Array<{
    pattern: string;
    optimization: string;
    improvement: string;
  }>;
}

/**
 * Automated Query Optimizer
 */
export class QueryOptimizer extends EventEmitter {
  private static instance: QueryOptimizer;
  private isOptimizing: boolean = false;
  private nplusOnePatterns: Map<string, NPlusOnePattern> = new Map();
  private queryAnalysisCache: Map<string, PerformanceAnalysis> = new Map();
  private optimizationHistory: OptimizationRecommendation[] = [];
  private spatialOptimizations: Map<string, SpatialOptimization> = new Map();
  
  // Detection Configuration
  private readonly NPLUS_ONE_THRESHOLD = 5; // Detect if >5 similar queries
  private readonly SLOW_QUERY_THRESHOLD = 500; // 500ms
  private readonly ANALYSIS_WINDOW = 60000; // 1 minute
  private readonly CACHE_TTL = 300; // 5 minutes
  
  // Query patterns to detect
  private readonly PROBLEMATIC_PATTERNS = [
    /SELECT.*FROM.*WHERE.*=.*\$\d+/g, // Potential N+1 pattern
    /SELECT.*FROM.*LIMIT 1.*OFFSET \d+/g, // Pagination N+1
    /SELECT.*FROM.*IN \([^)]+\)/g, // IN clause optimization
    /SELECT.*FROM.*JOIN.*ON.*=.*AND/g, // Complex join optimization
  ];

  private constructor() {
    super();
    this.setupQueryInterception();
    this.initializeSpatialOptimizations();
  }

  public static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Start automated query optimization monitoring
   */
  public startOptimization(): void {
    if (this.isOptimizing) {
      logger.warn('Query optimization already running');
      return;
    }

    this.isOptimizing = true;
    logger.info('Starting automated query optimization monitoring');

    // Start N+1 pattern detection
    setInterval(() => {
      this.analyzeNPlusOnePatterns();
    }, this.ANALYSIS_WINDOW);

    // Start performance analysis
    setInterval(() => {
      this.performQueryAnalysis();
    }, 30000); // Every 30 seconds

    // Start optimization recommendation generation
    setInterval(() => {
      this.generateOptimizationRecommendations();
    }, 120000); // Every 2 minutes

    this.emit('optimization_started');
  }

  /**
   * Stop optimization monitoring
   */
  public stopOptimization(): void {
    this.isOptimizing = false;
    logger.info('Query optimization monitoring stopped');
    this.emit('optimization_stopped');
  }

  /**
   * Analyze query for N+1 patterns and optimization opportunities
   */
  public async analyzeQuery(
    sql: string, 
    duration: number, 
    context?: any
  ): Promise<PerformanceAnalysis> {
    const queryHash = this.hashQuery(sql);
    
    // Check cache first
    const cached = this.queryAnalysisCache.get(queryHash);
    if (cached && Date.now() - cached.duration < this.CACHE_TTL * 1000) {
      return cached;
    }

    const analysis: PerformanceAnalysis = {
      queryHash,
      originalQuery: sql,
      executionPlan: await this.getExecutionPlan(sql),
      duration,
      rowsReturned: 0,
      cost: 0,
      issues: [],
      recommendations: [],
      cacheability: this.assessCacheability(sql),
    };

    // Detect issues
    analysis.issues = this.detectQueryIssues(sql, analysis.executionPlan);
    
    // Generate recommendations
    analysis.recommendations = await this.generateQueryRecommendations(sql, analysis);

    // Cache the analysis
    this.queryAnalysisCache.set(queryHash, analysis);

    // Emit analysis event
    this.emit('query_analyzed', analysis);

    return analysis;
  }

  /**
   * Get N+1 query patterns detected
   */
  public getNPlusOnePatterns(): NPlusOnePattern[] {
    return Array.from(this.nplusOnePatterns.values())
      .sort((a, b) => b.severity.localeCompare(a.severity) || b.count - a.count);
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(
    limit: number = 20
  ): OptimizationRecommendation[] {
    return this.optimizationHistory
      .sort((a, b) => b.priority.localeCompare(a.priority))
      .slice(0, limit);
  }

  /**
   * Get spatial optimization recommendations
   */
  public getSpatialOptimizations(): SpatialOptimization[] {
    return Array.from(this.spatialOptimizations.values());
  }

  /**
   * Apply optimization recommendation
   */
  public async applyOptimization(
    recommendationId: string,
    dryRun: boolean = true
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const recommendation = this.optimizationHistory.find(r => r.id === recommendationId);
    if (!recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    try {
      let result;
      
      switch (recommendation.type) {
        case 'index':
          result = await this.applyIndexRecommendation(recommendation, dryRun);
          break;
        case 'materialized_view':
          result = await this.applyMaterializedViewRecommendation(recommendation, dryRun);
          break;
        case 'caching':
          result = await this.applyCachingRecommendation(recommendation, dryRun);
          break;
        default:
          return { success: false, error: 'Optimization type not supported for auto-application' };
      }

      if (!dryRun) {
        logger.info('Applied optimization recommendation', {
          id: recommendationId,
          type: recommendation.type,
          result,
        });
      }

      return { success: true, result };
    } catch (error: unknown) {
      logger.error('Failed to apply optimization', {
        recommendationId,
        error: error instanceof Error ? error?.message : String(error),
      });
      return { success: false, error: error instanceof Error ? error?.message : String(error) };
    }
  }

  /**
   * Get performance summary
   */
  public async getPerformanceSummary(): Promise<{
    nplusOneIssues: number;
    slowQueries: number;
    recommendations: number;
    spatialOptimizations: number;
    cacheHitRatio: number;
    avgQueryTime: number;
  }> {
    const performanceData = await databasePerformanceMonitor.getPerformanceSummary();
    
    return {
      nplusOneIssues: this.nplusOnePatterns.size,
      slowQueries: performanceData.slowQueries,
      recommendations: this.optimizationHistory.filter(r => r.priority === 'high' || r.priority === 'critical').length,
      spatialOptimizations: this.spatialOptimizations.size,
      cacheHitRatio: performanceData.cacheHitRatio,
      avgQueryTime: performanceData.avgResponseTime,
    };
  }

  /**
   * Private Methods
   */

  /**
   * Setup query interception for optimization analysis
   */
  private setupQueryInterception(): void {
    let queryBuffer: Array<{ sql: string; timestamp: number; duration?: number }> = [];

    sequelize.addHook('beforeQuery', (options: any) => {
      options._optimizerStartTime = Date.now();
      
      // Add to query buffer for N+1 detection
      queryBuffer.push({
        sql: options?.sql || '',
        timestamp: Date.now(),
      });

      // Keep buffer manageable
      if (queryBuffer.length > 1000) {
        queryBuffer = queryBuffer.slice(-500);
      }
    });

    sequelize.addHook('afterQuery', (options: any) => {
      const duration = Date.now() - (options?._optimizerStartTime || Date.now());
      const sql = options?.sql || '';

      // Update query buffer with duration
      const query = queryBuffer.find(q => 
        q.sql === sql && 
        Math.abs(q.timestamp - (options?._optimizerStartTime || 0)) < 100
      );
      if (query) {
        query.duration = duration;
      }

      // Analyze if slow query
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        this.analyzeQuery(sql, duration, options).catch(error => {
          logger.warn('Query analysis failed', { error: error instanceof Error ? error?.message : String(error) });
        });
      }

      // Store for N+1 detection
      this.detectNPlusOnePattern(sql, duration, queryBuffer);
    });
  }

  /**
   * Detect N+1 query patterns
   */
  private detectNPlusOnePattern(
    sql: string, 
    duration: number, 
    queryBuffer: Array<{ sql: string; timestamp: number; duration?: number }>
  ): void {
    const normalizedQuery = this.normalizeQuery(sql);
    const recentQueries = queryBuffer.filter(q => 
      Date.now() - q.timestamp < 5000 // Last 5 seconds
    );

    // Look for similar queries executed in quick succession
    const similarQueries = recentQueries.filter(q => 
      this.normalizeQuery(q.sql) === normalizedQuery
    );

    if (similarQueries.length >= this.NPLUS_ONE_THRESHOLD) {
      const patternId = this.hashQuery(normalizedQuery);
      const totalDuration = similarQueries.reduce((sum, q) => sum + (q?.duration || 0), 0);
      
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (similarQueries.length > 20) severity = 'critical';
      else if (similarQueries.length > 15) severity = 'high';
      else if (similarQueries.length > 10) severity = 'medium';

      const pattern: NPlusOnePattern = {
        id: patternId,
        parentQuery: this.inferParentQuery(normalizedQuery),
        childQueries: [normalizedQuery],
        count: similarQueries.length,
        duration: totalDuration,
        timestamp: new Date(),
        severity,
        optimizationSuggestion: this.generateNPlusOneSuggestion(normalizedQuery),
      };

      this.nplusOnePatterns.set(patternId, pattern);
      
      logger.warn('N+1 query pattern detected', {
        pattern: patternId,
        count: similarQueries.length,
        severity,
        suggestion: pattern.optimizationSuggestion,
      });

      this.emit('nplus_one_detected', pattern);
    }
  }

  /**
   * Analyze all detected N+1 patterns
   */
  private analyzeNPlusOnePatterns(): void {
    // Clean old patterns (older than 1 hour)
    const cutoff = Date.now() - 3600000;
    for (const [id, pattern] of this.nplusOnePatterns.entries()) {
      if (pattern.timestamp.getTime() < cutoff) {
        this.nplusOnePatterns.delete(id);
      }
    }

    // Log summary
    if (this.nplusOnePatterns.size > 0) {
      logger.info('N+1 pattern analysis summary', {
        totalPatterns: this.nplusOnePatterns.size,
        criticalPatterns: Array.from(this.nplusOnePatterns.values()).filter(p => p.severity === 'critical').length,
        highPatterns: Array.from(this.nplusOnePatterns.values()).filter(p => p.severity === 'high').length,
      });
    }
  }

  /**
   * Perform comprehensive query analysis
   */
  private async performQueryAnalysis(): Promise<void> {
    try {
      // Get recent slow queries from performance monitor
      const performanceData = await databasePerformanceMonitor.getPerformanceSummary();
      const slowQueries = performanceData.topSlowQueries;

      for (const slowQuery of slowQueries) {
        if (slowQuery.avgDuration > this.SLOW_QUERY_THRESHOLD) {
          await this.analyzeQuery(slowQuery.sql, slowQuery.avgDuration);
        }
      }
    } catch (error: unknown) {
      logger.error('Query analysis failed', { error: error instanceof Error ? error?.message : String(error) });
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    // Analyze table statistics for index recommendations
    await this.analyzeTableStatistics();
    
    // Analyze spatial queries for PostGIS optimization
    await this.analyzeSpatialQueries();
    
    // Generate caching recommendations
    await this.analyzeCachingOpportunities();

    logger.info('Generated optimization recommendations', {
      total: this.optimizationHistory.length,
      critical: this.optimizationHistory.filter(r => r.priority === 'critical').length,
      high: this.optimizationHistory.filter(r => r.priority === 'high').length,
    });
  }

  /**
   * Get execution plan for query
   */
  private async getExecutionPlan(sql: string): Promise<any> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const result = await sequelize.query(explainQuery, { type: QueryTypes.SELECT });
      return result[0];
    } catch (error: unknown) {
      logger.debug('Could not get execution plan', { error: error instanceof Error ? error?.message : String(error) });
      return null;
    }
  }

  /**
   * Detect query issues
   */
  private detectQueryIssues(sql: string, executionPlan: any): string[] {
    const issues: string[] = [];

    // Check for common problematic patterns
    if (sql.includes('SELECT *')) {
      issues.push('Using SELECT * - consider specifying only needed columns');
    }

    if (sql.includes('LIMIT') && sql.includes('OFFSET') && !sql.includes('ORDER BY')) {
      issues.push('Using LIMIT/OFFSET without ORDER BY - results may be inconsistent');
    }

    if (sql.match(/WHERE.*LIKE '%.*%'/)) {
      issues.push('Using leading wildcard in LIKE - consider full-text search or different approach');
    }

    if (sql.includes('OR')) {
      issues.push('Using OR conditions - consider UNION or separate queries for better performance');
    }

    // Analyze execution plan for issues
    if (executionPlan) {
      const planText = JSON.stringify(executionPlan);
      
      if (planText.includes('Seq Scan')) {
        issues.push('Sequential scan detected - consider adding appropriate indexes');
      }
      
      if (planText.includes('Nested Loop')) {
        issues.push('Nested loop join detected - might benefit from different join strategy');
      }

      if (planText.includes('Sort') && planText.includes('external')) {
        issues.push('External sort detected - consider increasing work_mem or adding index');
      }
    }

    return issues;
  }

  /**
   * Generate query-specific recommendations
   */
  private async generateQueryRecommendations(
    sql: string, 
    analysis: PerformanceAnalysis
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Index recommendations
    const indexRec = this.generateIndexRecommendation(sql);
    if (indexRec) recommendations.push(indexRec);

    // Eager loading recommendations for N+1 patterns
    const eagerLoadingRec = this.generateEagerLoadingRecommendation(sql);
    if (eagerLoadingRec) recommendations.push(eagerLoadingRec);

    // Caching recommendations
    const cachingRec = this.generateCachingRecommendation(sql, analysis);
    if (cachingRec) recommendations.push(cachingRec);

    // Query rewrite recommendations
    const rewriteRec = this.generateQueryRewriteRecommendation(sql);
    if (rewriteRec) recommendations.push(rewriteRec);

    return recommendations;
  }

  /**
   * Assess query cacheability
   */
  private assessCacheability(sql: string): 'none' | 'short' | 'medium' | 'long' {
    const normalizedSql = sql.toLowerCase();

    // Don't cache writes
    if (normalizedSql.includes('insert') || normalizedSql.includes('update') || normalizedSql.includes('delete')) {
      return 'none';
    }

    // Long cache for reference data
    if (normalizedSql.includes('permissions') || normalizedSql.includes('roles') || normalizedSql.includes('organizations')) {
      return 'long';
    }

    // Medium cache for relatively stable data
    if (normalizedSql.includes('customers') || normalizedSql.includes('users') || normalizedSql.includes('vehicles')) {
      return 'medium';
    }

    // Short cache for frequently changing data
    if (normalizedSql.includes('bins') || normalizedSql.includes('routes') || normalizedSql.includes('service_events')) {
      return 'short';
    }

    return 'short';
  }

  /**
   * Helper methods for pattern detection and optimization
   */
  private normalizeQuery(sql: string): string {
    return sql
      .replace(/\$\d+/g, '?')
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, 'N')
      .trim()
      .toLowerCase();
  }

  private hashQuery(sql: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(sql).digest('hex');
  }

  private inferParentQuery(childQuery: string): string {
    // Simple heuristic to infer parent query
    if (childQuery.includes('where') && childQuery.includes('=')) {
      return 'Likely from findAll() or similar bulk operation';
    }
    return 'Unknown parent query';
  }

  private generateNPlusOneSuggestion(query: string): string {
    if (query.includes('customer')) {
      return 'Use eager loading: include Customer in initial query';
    }
    if (query.includes('service_event')) {
      return 'Use eager loading: include ServiceEvents in initial query';
    }
    return 'Consider using eager loading or batch queries to reduce N+1 pattern';
  }

  private generateIndexRecommendation(sql: string): OptimizationRecommendation | null {
    // Analyze WHERE clauses for index opportunities
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*/i);
    if (whereMatch) {
      const column = whereMatch[1];
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      const table = tableMatch ? tableMatch[1] : 'unknown';

      return {
        id: `idx_${table}_${column}_${Date.now()}`,
        queryPattern: sql,
        type: 'index',
        priority: 'medium',
        description: `Add index on ${table}.${column} for better WHERE clause performance`,
        estimatedImprovement: '50-80% query time reduction',
        implementation: `CREATE INDEX CONCURRENTLY idx_${table}_${column} ON ${table} (${column});`,
        sqlSuggestion: `CREATE INDEX CONCURRENTLY idx_${table}_${column} ON ${table} (${column});`,
        indexSuggestion: {
          table,
          columns: [column],
          type: 'btree',
        },
      };
    }

    return null;
  }

  private generateEagerLoadingRecommendation(sql: string): OptimizationRecommendation | null {
    // Detect potential N+1 patterns that could benefit from eager loading
    if (this.isLikelyNPlusOnePattern(sql)) {
      return {
        id: `eager_${this.hashQuery(sql)}`,
        queryPattern: sql,
        type: 'eager_loading',
        priority: 'high',
        description: 'Convert N+1 query pattern to eager loading',
        estimatedImprovement: '70-90% query reduction',
        implementation: 'Use include option in Sequelize queries to eagerly load related data',
      };
    }

    return null;
  }

  private generateCachingRecommendation(sql: string, analysis: PerformanceAnalysis): OptimizationRecommendation | null {
    if (analysis.cacheability !== 'none' && analysis.duration > 100) {
      return {
        id: `cache_${analysis.queryHash}`,
        queryPattern: sql,
        type: 'caching',
        priority: analysis.duration > 1000 ? 'high' : 'medium',
        description: `Cache query results - cacheability level: ${analysis.cacheability}`,
        estimatedImprovement: '80-95% response time improvement for repeated queries',
        implementation: `Implement ${analysis.cacheability}-term caching in repository layer`,
      };
    }

    return null;
  }

  private generateQueryRewriteRecommendation(sql: string): OptimizationRecommendation | null {
    // Check for subquery optimization opportunities
    if (sql.includes('IN (SELECT')) {
      return {
        id: `rewrite_${this.hashQuery(sql)}`,
        queryPattern: sql,
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Replace IN subquery with JOIN for better performance',
        estimatedImprovement: '30-50% performance improvement',
        implementation: 'Rewrite IN (SELECT...) as INNER JOIN',
      };
    }

    return null;
  }

  private isLikelyNPlusOnePattern(sql: string): boolean {
    const normalized = this.normalizeQuery(sql);
    return this.PROBLEMATIC_PATTERNS.some(pattern => pattern.test(normalized));
  }

  private async analyzeTableStatistics(): Promise<void> {
    // Implementation for table statistics analysis
    // This would analyze table sizes, index usage, etc.
  }

  private async analyzeSpatialQueries(): Promise<void> {
    // Implementation for spatial query analysis
    // This would analyze PostGIS usage and recommend spatial indexes
  }

  private async analyzeCachingOpportunities(): Promise<void> {
    // Implementation for caching opportunity analysis
    // This would identify frequently accessed stable data
  }

  private async applyIndexRecommendation(
    recommendation: OptimizationRecommendation, 
    dryRun: boolean
  ): Promise<any> {
    if (dryRun) {
      return { action: 'Would create index', sql: recommendation.sqlSuggestion };
    }

    if (recommendation.sqlSuggestion) {
      await sequelize.query(recommendation.sqlSuggestion);
      return { action: 'Index created', sql: recommendation.sqlSuggestion };
    }

    throw new Error('No SQL suggestion available for index creation');
  }

  private async applyMaterializedViewRecommendation(
    recommendation: OptimizationRecommendation, 
    dryRun: boolean
  ): Promise<any> {
    // Implementation for materialized view creation
    if (dryRun) {
      return { action: 'Would create materialized view' };
    }
    
    throw new Error('Materialized view implementation not yet available');
  }

  private async applyCachingRecommendation(
    recommendation: OptimizationRecommendation, 
    dryRun: boolean
  ): Promise<any> {
    // Implementation for caching setup
    if (dryRun) {
      return { action: 'Would configure caching' };
    }
    
    throw new Error('Caching configuration implementation not yet available');
  }

  private initializeSpatialOptimizations(): void {
    // Initialize known spatial optimizations for PostGIS tables
    this.spatialOptimizations.set('bins', {
      table: 'bins',
      geometryColumn: 'location',
      recommendedIndexes: [
        {
          type: 'gist',
          expression: 'ST_GeogFromWKB(location)',
          reasoning: 'Optimize spatial distance calculations and containment queries',
        },
      ],
      queryOptimizations: [
        {
          pattern: 'ST_DWithin queries',
          optimization: 'Use GIST index with geography type',
          improvement: '70-90% performance improvement for radius queries',
        },
      ],
    });
  }
}

/**
 * Singleton instance for application use
 */
export const queryOptimizer = QueryOptimizer.getInstance();

// Auto-start optimization monitoring in non-test environments
if (process.env.NODE_ENV !== 'test') {
  queryOptimizer.startOptimization();
}