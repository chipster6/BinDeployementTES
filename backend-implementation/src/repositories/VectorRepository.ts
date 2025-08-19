/**
 * ============================================================================
 * VECTOR REPOSITORY - WEAVIATE INTEGRATION
 * ============================================================================
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * 
 * Extends the repository pattern to support vector operations with
 * PostgreSQL + Weaviate hybrid architecture for semantic search.
 *
 * COORDINATION WITH:
 * - Backend-Agent: Service layer integration and API endpoints
 * - Database-Architect: Vector metadata management and consistency
 * - Performance-Optimization-Specialist: Search optimization and caching
 *
 * Created by: Database-Architect (in coordination with Backend-Agent)
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { Sequelize, Op } from 'sequelize';
import { BaseRepository } from './BaseRepository';
import { WeaviateConnection, VectorSearchQuery, VectorEmbeddingResult } from '../database/WeaviateConnection';
import { Logger } from '../utils/Logger';

/**
 * Vector search options interface
 */
export interface VectorSearchOptions {
  query?: string;
  vector?: number[];
  entityTypes?: string[];
  limit?: number;
  offset?: number;
  threshold?: number;
  includeMetadata?: boolean;
  filters?: Record<string, any>;
}

/**
 * Vector search result with enhanced metadata
 */
export interface EnhancedVectorResult extends VectorEmbeddingResult {
  entityType: string;
  entityId: string;
  entityData?: any;
  relevanceScore: number;
  syncedAt?: Date;
  lastSearched?: Date;
}

/**
 * Vector analytics interface
 */
export interface VectorAnalytics {
  totalVectors: number;
  syncedVectors: number;
  pendingVectors: number;
  errorVectors: number;
  avgQualityScore: number;
  entityTypeDistribution: Record<string, number>;
  searchPopularity: Array<{
    entityType: string;
    searchCount: number;
    avgRelevance: number;
  }>;
  syncPerformance: {
    avgSyncTime: number;
    successRate: number;
    lastSyncDate: Date;
  };
}

/**
 * Vector Repository for hybrid PostgreSQL + Weaviate operations
 */
export class VectorRepository extends BaseRepository<any> {
  private weaviateConnection: WeaviateConnection;

  constructor(
    database: Sequelize,
    weaviateConnection: WeaviateConnection,
    logger: Logger = new Logger('VectorRepository')
  ) {
    super(database, 'vector_embeddings', logger);
    this.weaviateConnection = weaviateConnection;
  }

  /**
   * Perform semantic search across all entity types
   */
  public async semanticSearch(
    options: VectorSearchOptions
  ): Promise<EnhancedVectorResult[]> {
    try {
      this.logger.debug('Performing semantic search', {
        query: options.query,
        hasVector: !!options.vector,
        entityTypes: options.entityTypes,
        limit: options.limit
      });

      // Validate input
      if (!options.query && !options.vector) {
        throw new Error('Either text query or vector must be provided');
      }

      // Get entity types to search
      const entityTypes = options.entityTypes || await this.getActiveEntityTypes();
      const results: EnhancedVectorResult[] = [];

      // Search across each entity type
      for (const entityType of entityTypes) {
        const className = this.getWeaviateClassName(entityType);
        
        try {
          const searchQuery: VectorSearchQuery = {
            className,
            query: options.query,
            vector: options.vector,
            limit: options.limit || 10,
            offset: options.offset || 0,
            additional: ['certainty', 'distance', 'id']
          };

          // Add filters if provided
          if (options.filters) {
            searchQuery.where = this.buildWeaviateWhereClause(options.filters);
          }

          // Perform search in Weaviate
          const weaviateResults = options.query 
            ? await this.weaviateConnection.searchByText(searchQuery)
            : await this.weaviateConnection.searchByVector(searchQuery);

          // Enhance results with PostgreSQL metadata
          for (const result of weaviateResults) {
            try {
              const enhanced = await this.enhanceVectorResult(result, entityType);
              
              if (enhanced && enhanced.relevanceScore >= (options.threshold || 0.5)) {
                results.push(enhanced);
                
                // Update search statistics
                await this.updateSearchStatistics(enhanced.entityId, enhanced.relevanceScore);
              }
            } catch (error) {
              this.logger.warn('Failed to enhance vector result', {
                resultId: result.id,
                entityType,
                error: error.message
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Search failed for entity type: ${entityType}`, {
            error: error.message
          });
        }
      }

      // Sort by relevance and apply final limit
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      const finalResults = results.slice(0, options.limit || 10);

      this.logger.debug(`Semantic search completed`, {
        totalResults: finalResults.length,
        entityTypes: [...new Set(finalResults.map(r => r.entityType))]
      });

      return finalResults;

    } catch (error) {
      this.logger.error('Semantic search failed', {
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search within specific entity type
   */
  public async searchEntityType(
    entityType: string,
    query: string,
    limit: number = 10
  ): Promise<EnhancedVectorResult[]> {
    return this.semanticSearch({
      query,
      entityTypes: [entityType],
      limit
    });
  }

  /**
   * Find similar entities by vector similarity
   */
  public async findSimilarEntities(
    entityType: string,
    entityId: string,
    limit: number = 5
  ): Promise<EnhancedVectorResult[]> {
    try {
      this.logger.debug('Finding similar entities', {
        entityType,
        entityId,
        limit
      });

      // Get the vector for the source entity
      const sourceVector = await this.getEntityVector(entityType, entityId);
      
      if (!sourceVector || !sourceVector.vector) {
        throw new Error('Source entity vector not found');
      }

      // Search for similar vectors
      const results = await this.semanticSearch({
        vector: sourceVector.vector,
        entityTypes: [entityType],
        limit: limit + 1 // +1 to account for the source entity
      });

      // Filter out the source entity
      return results.filter(result => result.entityId !== entityId);

    } catch (error) {
      this.logger.error('Failed to find similar entities', {
        entityType,
        entityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recommendations based on user interaction history
   */
  public async getRecommendations(
    userId: string,
    entityType: string,
    limit: number = 10
  ): Promise<EnhancedVectorResult[]> {
    try {
      this.logger.debug('Getting recommendations', {
        userId,
        entityType,
        limit
      });

      // Get user's interaction history for building preference vector
      const interactionHistory = await this.getUserInteractionHistory(userId, entityType);
      
      if (interactionHistory.length === 0) {
        // No history, return popular entities
        return this.getPopularEntities(entityType, limit);
      }

      // Build user preference vector from interaction history
      const preferenceVector = await this.buildUserPreferenceVector(interactionHistory);
      
      if (!preferenceVector) {
        return this.getPopularEntities(entityType, limit);
      }

      // Search for similar entities
      return this.semanticSearch({
        vector: preferenceVector,
        entityTypes: [entityType],
        limit
      });

    } catch (error) {
      this.logger.error('Failed to get recommendations', {
        userId,
        entityType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get vector analytics and statistics
   */
  public async getVectorAnalytics(): Promise<VectorAnalytics> {
    try {
      this.logger.debug('Getting vector analytics');

      const analyticsQuery = `
        WITH vector_stats AS (
          SELECT 
            COUNT(*) as total_vectors,
            COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_vectors,
            COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_vectors,
            COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as error_vectors,
            AVG(vector_quality_score) as avg_quality_score
          FROM vector_embeddings
          WHERE deleted_at IS NULL
        ),
        entity_distribution AS (
          SELECT 
            entity_type,
            COUNT(*) as count
          FROM vector_embeddings
          WHERE deleted_at IS NULL AND sync_status = 'synced'
          GROUP BY entity_type
        ),
        search_popularity AS (
          SELECT 
            entity_type,
            SUM(search_count) as total_searches,
            AVG(avg_search_relevance) as avg_relevance
          FROM vector_embeddings
          WHERE deleted_at IS NULL AND search_count > 0
          GROUP BY entity_type
          ORDER BY total_searches DESC
        ),
        sync_performance AS (
          SELECT 
            AVG(processing_duration_ms) as avg_sync_time,
            (COUNT(CASE WHEN sync_status = 'synced' THEN 1 END)::decimal / 
             COUNT(*)::decimal * 100) as success_rate,
            MAX(weaviate_synced_at) as last_sync_date
          FROM vector_embeddings
          WHERE deleted_at IS NULL
        )
        SELECT 
          vs.total_vectors,
          vs.synced_vectors,
          vs.pending_vectors,
          vs.error_vectors,
          vs.avg_quality_score,
          json_object_agg(ed.entity_type, ed.count) as entity_distribution,
          json_agg(
            json_build_object(
              'entityType', sp.entity_type,
              'searchCount', sp.total_searches,
              'avgRelevance', sp.avg_relevance
            )
          ) as search_popularity,
          json_build_object(
            'avgSyncTime', spe.avg_sync_time,
            'successRate', spe.success_rate,
            'lastSyncDate', spe.last_sync_date
          ) as sync_performance
        FROM vector_stats vs
        CROSS JOIN entity_distribution ed
        CROSS JOIN search_popularity sp
        CROSS JOIN sync_performance spe
        GROUP BY vs.total_vectors, vs.synced_vectors, vs.pending_vectors, 
                 vs.error_vectors, vs.avg_quality_score, spe.avg_sync_time,
                 spe.success_rate, spe.last_sync_date
      `;

      const [results] = await this.database.query(analyticsQuery, { type: 'SELECT' });
      
      if (results.length === 0) {
        return {
          totalVectors: 0,
          syncedVectors: 0,
          pendingVectors: 0,
          errorVectors: 0,
          avgQualityScore: 0,
          entityTypeDistribution: {},
          searchPopularity: [],
          syncPerformance: {
            avgSyncTime: 0,
            successRate: 0,
            lastSyncDate: new Date()
          }
        };
      }

      const row = results[0] as any;
      
      return {
        totalVectors: row.total_vectors || 0,
        syncedVectors: row.synced_vectors || 0,
        pendingVectors: row.pending_vectors || 0,
        errorVectors: row.error_vectors || 0,
        avgQualityScore: row.avg_quality_score || 0,
        entityTypeDistribution: row.entity_distribution || {},
        searchPopularity: row.search_popularity || [],
        syncPerformance: row.sync_performance || {
          avgSyncTime: 0,
          successRate: 0,
          lastSyncDate: new Date()
        }
      };

    } catch (error) {
      this.logger.error('Failed to get vector analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear vector for entity (mark as stale for re-sync)
   */
  public async invalidateEntityVector(
    entityType: string,
    entityId: string
  ): Promise<void> {
    try {
      this.logger.debug('Invalidating entity vector', { entityType, entityId });

      const updateQuery = `
        UPDATE vector_embeddings
        SET sync_status = 'stale',
            updated_at = NOW()
        WHERE entity_type = :entityType
          AND entity_id = :entityId
          AND deleted_at IS NULL
      `;

      await this.database.query(updateQuery, {
        replacements: { entityType, entityId },
        type: 'UPDATE'
      });

      this.logger.debug('Entity vector invalidated successfully', { entityType, entityId });

    } catch (error) {
      this.logger.error('Failed to invalidate entity vector', {
        entityType,
        entityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk invalidate vectors by entity type
   */
  public async bulkInvalidateVectors(entityType: string): Promise<number> {
    try {
      this.logger.debug('Bulk invalidating vectors', { entityType });

      const updateQuery = `
        UPDATE vector_embeddings
        SET sync_status = 'stale',
            updated_at = NOW()
        WHERE entity_type = :entityType
          AND sync_status = 'synced'
          AND deleted_at IS NULL
      `;

      const [result] = await this.database.query(updateQuery, {
        replacements: { entityType },
        type: 'UPDATE'
      });

      const updatedCount = (result as any).rowCount || 0;

      this.logger.debug('Bulk vector invalidation completed', {
        entityType,
        updatedCount
      });

      return updatedCount;

    } catch (error) {
      this.logger.error('Failed to bulk invalidate vectors', {
        entityType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get vectors requiring sync
   */
  public async getVectorsRequiringSync(
    entityType?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const whereClause = entityType 
        ? 'AND entity_type = :entityType'
        : '';

      const query = `
        SELECT entity_type, entity_id, sync_status, sync_retry_count,
               last_sync_attempt, sync_error_message, updated_at
        FROM vector_embeddings
        WHERE sync_status IN ('pending', 'stale', 'error')
          AND sync_retry_count < 5
          AND deleted_at IS NULL
          ${whereClause}
        ORDER BY 
          CASE sync_status 
            WHEN 'error' THEN 1
            WHEN 'stale' THEN 2
            WHEN 'pending' THEN 3
          END,
          updated_at ASC
        LIMIT :limit
      `;

      const replacements: any = { limit };
      if (entityType) {
        replacements.entityType = entityType;
      }

      const [results] = await this.database.query(query, {
        replacements,
        type: 'SELECT'
      });

      return results;

    } catch (error) {
      this.logger.error('Failed to get vectors requiring sync', {
        entityType,
        error: error.message
      });
      throw error;
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Get active entity types with vectors
   */
  private async getActiveEntityTypes(): Promise<string[]> {
    const query = `
      SELECT DISTINCT entity_type
      FROM vector_embeddings
      WHERE sync_status = 'synced' AND deleted_at IS NULL
      ORDER BY entity_type
    `;

    const [results] = await this.database.query(query, { type: 'SELECT' });
    return results.map((row: any) => row.entity_type);
  }

  /**
   * Get Weaviate class name for entity type
   */
  private getWeaviateClassName(entityType: string): string {
    const classMap: Record<string, string> = {
      route: 'OperationalRoute',
      bin: 'WasteBin',
      customer: 'Customer',
      organization: 'Organization',
      driver: 'Driver',
      vehicle: 'Vehicle',
      service_event: 'ServiceEvent'
    };

    return classMap[entityType] || 'KnowledgeBase';
  }

  /**
   * Build Weaviate where clause from filters
   */
  private buildWeaviateWhereClause(filters: Record<string, any>): any {
    const conditions = [];

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        conditions.push({
          path: [key],
          operator: 'ContainsAny',
          valueText: value
        });
      } else if (typeof value === 'string') {
        conditions.push({
          path: [key],
          operator: 'Equal',
          valueText: value
        });
      } else if (typeof value === 'number') {
        conditions.push({
          path: [key],
          operator: 'Equal',
          valueNumber: value
        });
      }
    }

    return conditions.length === 1 
      ? conditions[0]
      : { operator: 'And', operands: conditions };
  }

  /**
   * Enhance vector result with PostgreSQL metadata
   */
  private async enhanceVectorResult(
    result: VectorEmbeddingResult,
    entityType: string
  ): Promise<EnhancedVectorResult | null> {
    try {
      // Get vector metadata from PostgreSQL
      const metadataQuery = `
        SELECT entity_id, weaviate_synced_at, last_searched_at,
               avg_search_relevance, vector_quality_score
        FROM vector_embeddings
        WHERE vector_id = :vectorId AND entity_type = :entityType
          AND deleted_at IS NULL
        LIMIT 1
      `;

      const [metadataResults] = await this.database.query(metadataQuery, {
        replacements: {
          vectorId: result.id,
          entityType
        },
        type: 'SELECT'
      });

      if (metadataResults.length === 0) {
        return null;
      }

      const metadata = metadataResults[0] as any;

      // Get entity data if requested
      let entityData = null;
      try {
        entityData = await this.getEntityData(entityType, metadata.entity_id);
      } catch (error) {
        this.logger.warn('Failed to get entity data', {
          entityType,
          entityId: metadata.entity_id
        });
      }

      return {
        ...result,
        entityType,
        entityId: metadata.entity_id,
        entityData,
        relevanceScore: result.certainty || result.score || 0,
        syncedAt: metadata.weaviate_synced_at,
        lastSearched: metadata.last_searched_at
      };

    } catch (error) {
      this.logger.error('Failed to enhance vector result', {
        resultId: result.id,
        entityType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get entity data by type and ID
   */
  private async getEntityData(entityType: string, entityId: string): Promise<any> {
    const tableMap: Record<string, string> = {
      route: 'routes',
      bin: 'bins',
      customer: 'customers',
      organization: 'organizations',
      driver: 'drivers',
      vehicle: 'vehicles',
      service_event: 'service_events'
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      return null;
    }

    const query = `
      SELECT * FROM ${tableName}
      WHERE id = :entityId AND deleted_at IS NULL
      LIMIT 1
    `;

    const [results] = await this.database.query(query, {
      replacements: { entityId },
      type: 'SELECT'
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get entity vector from Weaviate
   */
  private async getEntityVector(entityType: string, entityId: string): Promise<any> {
    const query = `
      SELECT vector_id FROM vector_embeddings
      WHERE entity_type = :entityType AND entity_id = :entityId
        AND sync_status = 'synced' AND deleted_at IS NULL
      LIMIT 1
    `;

    const [results] = await this.database.query(query, {
      replacements: { entityType, entityId },
      type: 'SELECT'
    });

    if (results.length === 0) {
      return null;
    }

    const vectorId = (results[0] as any).vector_id;
    const className = this.getWeaviateClassName(entityType);

    // Get vector from Weaviate
    const weaviateResults = await this.weaviateConnection.searchByVector({
      className,
      vector: [], // This will be ignored since we're getting by ID
      limit: 1,
      where: {
        path: ['id'],
        operator: 'Equal',
        valueText: vectorId
      },
      additional: ['vector']
    });

    return weaviateResults.length > 0 ? weaviateResults[0] : null;
  }

  /**
   * Update search statistics
   */
  private async updateSearchStatistics(entityId: string, relevanceScore: number): Promise<void> {
    try {
      const updateQuery = `
        UPDATE vector_embeddings
        SET search_count = search_count + 1,
            last_searched_at = NOW(),
            avg_search_relevance = CASE 
              WHEN avg_search_relevance IS NULL THEN :relevanceScore
              ELSE (avg_search_relevance + :relevanceScore) / 2
            END,
            updated_at = NOW()
        WHERE entity_id = :entityId AND deleted_at IS NULL
      `;

      await this.database.query(updateQuery, {
        replacements: { entityId, relevanceScore },
        type: 'UPDATE'
      });

    } catch (error) {
      this.logger.warn('Failed to update search statistics', {
        entityId,
        error: error.message
      });
    }
  }

  /**
   * Get user interaction history (placeholder - implement based on actual schema)
   */
  private async getUserInteractionHistory(userId: string, entityType: string): Promise<any[]> {
    // This would be implemented based on your actual user interaction tracking
    // For now, return empty array
    return [];
  }

  /**
   * Build user preference vector from interaction history
   */
  private async buildUserPreferenceVector(interactionHistory: any[]): Promise<number[] | null> {
    // This would implement logic to build a preference vector
    // from user interaction history (views, likes, searches, etc.)
    // For now, return null
    return null;
  }

  /**
   * Get popular entities
   */
  private async getPopularEntities(entityType: string, limit: number): Promise<EnhancedVectorResult[]> {
    const query = `
      SELECT entity_id, search_count, avg_search_relevance
      FROM vector_embeddings
      WHERE entity_type = :entityType
        AND sync_status = 'synced'
        AND deleted_at IS NULL
        AND search_count > 0
      ORDER BY search_count DESC, avg_search_relevance DESC
      LIMIT :limit
    `;

    const [results] = await this.database.query(query, {
      replacements: { entityType, limit },
      type: 'SELECT'
    });

    // Convert to enhanced results
    const enhancedResults: EnhancedVectorResult[] = [];
    
    for (const row of results as any[]) {
      try {
        const entityData = await this.getEntityData(entityType, row.entity_id);
        
        enhancedResults.push({
          id: row.entity_id,
          properties: entityData || {},
          entityType,
          entityId: row.entity_id,
          entityData,
          relevanceScore: row.avg_search_relevance || 0.5
        });
      } catch (error) {
        this.logger.warn('Failed to get popular entity data', {
          entityType,
          entityId: row.entity_id
        });
      }
    }

    return enhancedResults;
  }
}