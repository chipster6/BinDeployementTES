/**
 * ============================================================================
 * VECTOR SYNCHRONIZATION SERVICE
 * ============================================================================
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * 
 * Manages real-time synchronization between PostgreSQL vector metadata
 * and Weaviate vector database for Phase 1 vector intelligence foundation.
 *
 * COORDINATION WITH:
 * - Backend-Agent: Service layer integration and API endpoints
 * - Performance-Optimization-Specialist: Batch processing optimization
 * - Database-Architect: Vector metadata triggers and consistency
 *
 * Created by: Database-Architect (in coordination)
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { Sequelize } from 'sequelize';
import { WeaviateConnection } from '../database/WeaviateConnection';
import { DatabaseConfig } from '../config/database.config';
import { Logger } from '../utils/Logger';
import { BaseService } from './BaseService';

/**
 * Vector embedding metadata interface
 */
export interface VectorEmbeddingMetadata {
  id: string;
  entityType: string;
  entityId: string;
  entityVersion: number;
  vectorId?: string;
  className: string;
  contentHash: string;
  contentText?: string;
  contentSummary?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  vectorQualityScore?: number;
  syncStatus: 'pending' | 'processing' | 'synced' | 'error' | 'stale' | 'archived';
  weaviateSyncedAt?: Date;
  lastSyncAttempt?: Date;
  syncErrorMessage?: string;
  syncRetryCount: number;
  processedAt?: Date;
  processingDurationMs?: number;
  processingVersion?: string;
  searchCount: number;
  lastSearchedAt?: Date;
  avgSearchRelevance?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
}

/**
 * Vector sync batch status interface
 */
export interface VectorSyncBatchStatus {
  id: string;
  syncBatchId: string;
  syncType: 'full_sync' | 'incremental_sync' | 'error_retry' | 'manual_sync' | 'scheduled_sync' | 'realtime_sync' | 'cleanup_sync';
  entityFilter?: any;
  totalEntities: number;
  processedEntities: number;
  successfulSyncs: number;
  failedSyncs: number;
  skippedEntities: number;
  syncStartedAt: Date;
  syncCompletedAt?: Date;
  totalDurationMs?: number;
  avgProcessingTimeMs?: number;
  syncStatus: 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
  errorSummary?: string;
  performanceSummary?: any;
  weaviateClusterHealth?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  weaviateResponseTimeMs?: number;
  weaviateErrorCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Sync result interface
 */
export interface VectorSyncResult {
  batchId: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: Array<{
    entityId: string;
    entityType: string;
    error: string;
  }>;
}

/**
 * Vector synchronization service
 */
export class VectorSyncService extends BaseService {
  private weaviateConnection: WeaviateConnection;
  private vectorConfig: DatabaseConfig['vectorSync'];
  private syncInProgress: boolean = false;
  private currentBatchId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    database: Sequelize,
    weaviateConnection: WeaviateConnection,
    vectorConfig: DatabaseConfig['vectorSync'],
    logger: Logger = new Logger('VectorSyncService')
  ) {
    super(database, logger);
    this.weaviateConnection = weaviateConnection;
    this.vectorConfig = vectorConfig;
  }

  /**
   * Initialize vector sync service with optional scheduled sync
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing Vector Sync Service', {
      enabled: this.vectorConfig.enabled,
      batchSize: this.vectorConfig.batchSize,
      intervalSeconds: this.vectorConfig.intervalSeconds
    });

    if (this.vectorConfig.enabled) {
      // Start scheduled sync if enabled
      await this.startScheduledSync();
    }

    this.logger.info('Vector Sync Service initialized successfully');
  }

  /**
   * Start scheduled vector synchronization
   */
  private async startScheduledSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.vectorConfig.intervalSeconds * 1000;
    
    this.syncInterval = setInterval(async () => {
      try {
        if (!this.syncInProgress) {
          await this.syncPendingVectors('scheduled_sync');
        }
      } catch (error) {
        this.logger.error('Scheduled vector sync failed', { error: error.message });
      }
    }, intervalMs);

    this.logger.info(`Scheduled vector sync started with ${this.vectorConfig.intervalSeconds}s interval`);
  }

  /**
   * Stop scheduled vector synchronization
   */
  public async stopScheduledSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.info('Scheduled vector sync stopped');
    }
  }

  /**
   * Perform full vector synchronization
   */
  public async performFullSync(): Promise<VectorSyncResult> {
    return this.syncPendingVectors('full_sync', null, true);
  }

  /**
   * Perform incremental vector synchronization for pending/stale vectors
   */
  public async performIncrementalSync(): Promise<VectorSyncResult> {
    return this.syncPendingVectors('incremental_sync');
  }

  /**
   * Retry failed vector synchronizations
   */
  public async retryFailedSync(): Promise<VectorSyncResult> {
    return this.syncPendingVectors('error_retry', {
      syncStatus: ['error', 'stale']
    });
  }

  /**
   * Sync vectors for specific entity type
   */
  public async syncEntityType(entityType: string): Promise<VectorSyncResult> {
    return this.syncPendingVectors('manual_sync', {
      entityType
    });
  }

  /**
   * Main vector synchronization logic
   */
  private async syncPendingVectors(
    syncType: VectorSyncBatchStatus['syncType'],
    entityFilter?: any,
    includeAll: boolean = false
  ): Promise<VectorSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Vector sync already in progress');
    }

    this.syncInProgress = true;
    const batchId = this.generateUUID();
    this.currentBatchId = batchId;

    const startTime = Date.now();
    let syncBatch: VectorSyncBatchStatus | null = null;
    
    try {
      this.logger.info(`Starting vector sync batch: ${syncType}`, {
        batchId,
        entityFilter,
        includeAll
      });

      // Create sync batch record
      syncBatch = await this.createSyncBatch(batchId, syncType, entityFilter);

      // Get Weaviate health status
      const weaviateHealth = await this.weaviateConnection.getHealthStatus();
      
      if (!weaviateHealth.healthy) {
        throw new Error(`Weaviate cluster is unhealthy: response time ${weaviateHealth.responseTime}ms`);
      }

      // Get pending vectors to sync
      const pendingVectors = await this.getPendingVectors(entityFilter, includeAll);
      
      if (pendingVectors.length === 0) {
        this.logger.info('No pending vectors to sync');
        
        await this.updateSyncBatch(syncBatch.id, {
          totalEntities: 0,
          processedEntities: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          skippedEntities: 0,
          syncStatus: 'completed',
          syncCompletedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
          weaviateClusterHealth: 'healthy',
          weaviateResponseTimeMs: weaviateHealth.responseTime
        });

        return {
          batchId,
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          duration: Date.now() - startTime,
          errors: []
        };
      }

      // Update batch with total entities
      await this.updateSyncBatch(syncBatch.id, {
        totalEntities: pendingVectors.length,
        weaviateClusterHealth: 'healthy',
        weaviateResponseTimeMs: weaviateHealth.responseTime
      });

      // Process vectors in batches
      const result = await this.processPendingVectors(
        syncBatch.id,
        pendingVectors,
        weaviateHealth
      );

      // Update final sync batch status
      await this.updateSyncBatch(syncBatch.id, {
        processedEntities: result.totalProcessed,
        successfulSyncs: result.successful,
        failedSyncs: result.failed,
        skippedEntities: result.skipped,
        syncStatus: result.failed > 0 ? 'partial' : 'completed',
        syncCompletedAt: new Date(),
        totalDurationMs: result.duration,
        avgProcessingTimeMs: result.totalProcessed > 0 ? result.duration / result.totalProcessed : 0,
        errorSummary: result.errors.length > 0 ? `${result.errors.length} errors occurred` : null,
        performanceSummary: {
          successRate: result.totalProcessed > 0 ? (result.successful / result.totalProcessed) * 100 : 0,
          avgProcessingTime: result.totalProcessed > 0 ? result.duration / result.totalProcessed : 0,
          throughput: result.totalProcessed / (result.duration / 1000) // entities per second
        }
      });

      this.logger.info(`Vector sync batch completed: ${syncType}`, {
        batchId,
        result
      });

      return result;

    } catch (error) {
      this.logger.error(`Vector sync batch failed: ${syncType}`, {
        batchId,
        error: error.message
      });

      if (syncBatch) {
        await this.updateSyncBatch(syncBatch.id, {
          syncStatus: 'failed',
          syncCompletedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
          errorSummary: error.message,
          weaviateErrorCount: 1
        });
      }

      throw error;
    } finally {
      this.syncInProgress = false;
      this.currentBatchId = null;
    }
  }

  /**
   * Process pending vectors in batches
   */
  private async processPendingVectors(
    syncBatchId: string,
    pendingVectors: VectorEmbeddingMetadata[],
    weaviateHealth: any
  ): Promise<VectorSyncResult> {
    const batchSize = this.vectorConfig.batchSize;
    const startTime = Date.now();
    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ entityId: string; entityType: string; error: string }> = [];

    this.logger.info(`Processing ${pendingVectors.length} vectors in batches of ${batchSize}`);

    // Process in batches
    for (let i = 0; i < pendingVectors.length; i += batchSize) {
      const batch = pendingVectors.slice(i, i + batchSize);
      
      try {
        const batchResult = await this.processBatch(batch);
        
        totalProcessed += batchResult.processed;
        successful += batchResult.successful;
        failed += batchResult.failed;
        skipped += batchResult.skipped;
        errors.push(...batchResult.errors);

        // Update sync batch progress
        await this.updateSyncBatch(syncBatchId, {
          processedEntities: totalProcessed,
          successfulSyncs: successful,
          failedSyncs: failed,
          skippedEntities: skipped
        });

        this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingVectors.length / batchSize)}`, {
          processed: batchResult.processed,
          successful: batchResult.successful,
          failed: batchResult.failed
        });

      } catch (error) {
        this.logger.error(`Batch processing failed`, {
          batchStart: i,
          batchSize: batch.length,
          error: error.message
        });

        // Mark entire batch as failed
        failed += batch.length;
        batch.forEach(vector => {
          errors.push({
            entityId: vector.entityId,
            entityType: vector.entityType,
            error: error.message
          });
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      batchId: syncBatchId,
      totalProcessed,
      successful,
      failed,
      skipped,
      duration,
      errors
    };
  }

  /**
   * Process a single batch of vectors
   */
  private async processBatch(vectors: VectorEmbeddingMetadata[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ entityId: string; entityType: string; error: string }>;
  }> {
    const errors: Array<{ entityId: string; entityType: string; error: string }> = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Prepare batch data for Weaviate
    const weaviateObjects = [];
    const vectorUpdates = [];

    for (const vector of vectors) {
      try {
        // Get entity data for vectorization
        const entityData = await this.getEntityData(vector.entityType, vector.entityId);
        
        if (!entityData) {
          this.logger.warn(`Entity not found for vector`, {
            entityType: vector.entityType,
            entityId: vector.entityId
          });
          skipped++;
          continue;
        }

        // Prepare content for vectorization
        const content = this.prepareEntityContent(vector.entityType, entityData);
        
        if (!content || content.trim().length === 0) {
          this.logger.warn(`No content available for vectorization`, {
            entityType: vector.entityType,
            entityId: vector.entityId
          });
          skipped++;
          continue;
        }

        // Prepare Weaviate object
        const weaviateProperties = this.prepareWeaviateProperties(vector.entityType, entityData);
        
        weaviateObjects.push({
          id: vector.vectorId || vector.id,
          properties: weaviateProperties
        });

        // Prepare vector metadata update
        vectorUpdates.push({
          id: vector.id,
          vectorId: vector.vectorId || vector.id,
          contentText: content,
          contentSummary: content.length > 500 ? content.substring(0, 500) + '...' : content,
          syncStatus: 'processing' as const,
          lastSyncAttempt: new Date(),
          processingVersion: '1.0.0'
        });

      } catch (error) {
        this.logger.error(`Failed to prepare vector for sync`, {
          entityType: vector.entityType,
          entityId: vector.entityId,
          error: error.message
        });
        
        errors.push({
          entityId: vector.entityId,
          entityType: vector.entityType,
          error: error.message
        });
        failed++;
      }
    }

    if (weaviateObjects.length === 0) {
      return {
        processed: vectors.length,
        successful: 0,
        failed,
        skipped,
        errors
      };
    }

    try {
      // Batch upsert to Weaviate
      const weaviateIds = await this.weaviateConnection.batchUpsertVectors(
        weaviateObjects[0].properties.className || 'KnowledgeBase',
        weaviateObjects
      );

      // Update vector metadata in PostgreSQL
      for (let i = 0; i < vectorUpdates.length; i++) {
        const update = vectorUpdates[i];
        const weaviateSuccess = weaviateIds.includes(update.vectorId);

        try {
          await this.updateVectorMetadata(update.id, {
            ...update,
            syncStatus: weaviateSuccess ? 'synced' : 'error',
            weaviateSyncedAt: weaviateSuccess ? new Date() : undefined,
            syncErrorMessage: weaviateSuccess ? null : 'Failed to sync to Weaviate',
            syncRetryCount: weaviateSuccess ? 0 : update.syncRetryCount + 1,
            vectorQualityScore: weaviateSuccess ? this.calculateQualityScore(update) : undefined,
            processedAt: new Date(),
            processingDurationMs: Date.now() - vectors[i].lastSyncAttempt?.getTime() || 0
          });

          if (weaviateSuccess) {
            successful++;
          } else {
            failed++;
            errors.push({
              entityId: vectors[i].entityId,
              entityType: vectors[i].entityType,
              error: 'Failed to sync to Weaviate'
            });
          }
        } catch (error) {
          this.logger.error(`Failed to update vector metadata`, {
            vectorId: update.id,
            error: error.message
          });
          
          failed++;
          errors.push({
            entityId: vectors[i].entityId,
            entityType: vectors[i].entityType,
            error: `Metadata update failed: ${error.message}`
          });
        }
      }

    } catch (error) {
      this.logger.error(`Batch Weaviate sync failed`, { error: error.message });
      
      // Mark all as failed
      for (const vector of vectors) {
        failed++;
        errors.push({
          entityId: vector.entityId,
          entityType: vector.entityType,
          error: `Weaviate batch sync failed: ${error.message}`
        });
      }
    }

    return {
      processed: vectors.length,
      successful,
      failed,
      skipped,
      errors
    };
  }

  /**
   * Get pending vectors from PostgreSQL
   */
  private async getPendingVectors(
    entityFilter?: any,
    includeAll: boolean = false
  ): Promise<VectorEmbeddingMetadata[]> {
    const query = `
      SELECT id, entity_type, entity_id, entity_version, vector_id, class_name,
             content_hash, content_text, content_summary, embedding_model,
             embedding_dimensions, vector_quality_score, sync_status,
             weaviate_synced_at, last_sync_attempt, sync_error_message,
             sync_retry_count, processed_at, processing_duration_ms,
             processing_version, search_count, last_searched_at,
             avg_search_relevance, created_at, updated_at, created_by,
             updated_by, deleted_at
      FROM vector_embeddings
      WHERE deleted_at IS NULL
        AND sync_retry_count < :maxRetries
        ${includeAll ? '' : 'AND sync_status IN (:syncStatuses)'}
        ${entityFilter?.entityType ? 'AND entity_type = :entityType' : ''}
        ${entityFilter?.syncStatus ? 'AND sync_status IN (:filterSyncStatuses)' : ''}
      ORDER BY 
        CASE sync_status 
          WHEN 'error' THEN 1
          WHEN 'stale' THEN 2
          WHEN 'pending' THEN 3
          ELSE 4
        END,
        updated_at ASC
      LIMIT :batchSize
    `;

    const replacements: any = {
      maxRetries: this.vectorConfig.retryMax,
      batchSize: this.vectorConfig.batchSize * 5 // Get more for processing
    };

    if (!includeAll) {
      replacements.syncStatuses = ['pending', 'stale', 'error'];
    }

    if (entityFilter?.entityType) {
      replacements.entityType = entityFilter.entityType;
    }

    if (entityFilter?.syncStatus) {
      replacements.filterSyncStatuses = Array.isArray(entityFilter.syncStatus) 
        ? entityFilter.syncStatus 
        : [entityFilter.syncStatus];
    }

    const [results] = await this.database.query(query, {
      replacements,
      type: 'SELECT'
    });

    return (results as any[]).map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityVersion: row.entity_version,
      vectorId: row.vector_id,
      className: row.class_name,
      contentHash: row.content_hash,
      contentText: row.content_text,
      contentSummary: row.content_summary,
      embeddingModel: row.embedding_model,
      embeddingDimensions: row.embedding_dimensions,
      vectorQualityScore: row.vector_quality_score,
      syncStatus: row.sync_status,
      weaviateSyncedAt: row.weaviate_synced_at,
      lastSyncAttempt: row.last_sync_attempt,
      syncErrorMessage: row.sync_error_message,
      syncRetryCount: row.sync_retry_count,
      processedAt: row.processed_at,
      processingDurationMs: row.processing_duration_ms,
      processingVersion: row.processing_version,
      searchCount: row.search_count,
      lastSearchedAt: row.last_searched_at,
      avgSearchRelevance: row.avg_search_relevance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    }));
  }

  /**
   * Get entity data for vectorization
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
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const query = `
      SELECT * FROM ${tableName} 
      WHERE id = :entityId AND deleted_at IS NULL
    `;

    const [results] = await this.database.query(query, {
      replacements: { entityId },
      type: 'SELECT'
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Prepare entity content for vectorization
   */
  private prepareEntityContent(entityType: string, entityData: any): string {
    switch (entityType) {
      case 'route':
        return [
          entityData.route_name,
          entityData.route_type,
          entityData.territory,
          entityData.status,
          entityData.description,
          `Distance: ${entityData.estimated_distance_miles} miles`,
          `Duration: ${entityData.estimated_duration_minutes} minutes`,
          `Optimization score: ${entityData.optimization_score || 'N/A'}`
        ].filter(Boolean).join('. ');

      case 'bin':
        return [
          `Bin ID: ${entityData.bin_id}`,
          `Type: ${entityData.bin_type}`,
          `Status: ${entityData.status}`,
          `Capacity: ${entityData.capacity_gallons} gallons`,
          `Current level: ${entityData.current_level || 'N/A'}%`,
          `Service frequency: ${entityData.service_frequency_days} days`,
          entityData.notes,
          entityData.special_instructions
        ].filter(Boolean).join('. ');

      case 'customer':
        return [
          entityData.company_name,
          entityData.contact_name,
          entityData.business_type,
          entityData.status,
          entityData.service_level,
          entityData.address,
          entityData.description
        ].filter(Boolean).join('. ');

      case 'service_event':
        return [
          `Event type: ${entityData.event_type}`,
          `Status: ${entityData.status}`,
          entityData.description,
          entityData.notes,
          `Duration: ${entityData.duration_minutes || 'N/A'} minutes`,
          `Driver: ${entityData.driver_name || 'N/A'}`,
          `Vehicle: ${entityData.vehicle_license_plate || 'N/A'}`
        ].filter(Boolean).join('. ');

      default:
        return JSON.stringify(entityData);
    }
  }

  /**
   * Prepare Weaviate properties from entity data
   */
  private prepareWeaviateProperties(entityType: string, entityData: any): Record<string, any> {
    const baseProperties = {
      className: this.getWeaviateClassName(entityType),
      lastUpdated: new Date().toISOString()
    };

    switch (entityType) {
      case 'route':
        return {
          ...baseProperties,
          routeId: entityData.id,
          routeName: entityData.route_name,
          routeType: entityData.route_type,
          territory: entityData.territory,
          status: entityData.status,
          description: entityData.description || '',
          estimatedDistance: entityData.estimated_distance_miles || 0,
          estimatedDuration: entityData.estimated_duration_minutes || 0,
          optimizationScore: entityData.optimization_score || 0,
          binCount: 0, // Will be calculated separately
          customerCount: 0 // Will be calculated separately
        };

      case 'bin':
        return {
          ...baseProperties,
          binId: entityData.id,
          binIdExternal: entityData.bin_id,
          binType: entityData.bin_type,
          status: entityData.status,
          capacity: entityData.capacity_gallons || 0,
          currentLevel: entityData.current_level || 0,
          serviceFrequency: entityData.service_frequency_days || 7,
          lastServiceDate: entityData.last_service_date?.toISOString(),
          nextServiceDate: entityData.next_service_date?.toISOString(),
          customerName: '', // Will be populated from customer lookup
          address: entityData.address || '',
          notes: entityData.notes || '',
          coordinates: entityData.location ? {
            latitude: entityData.location.coordinates[1],
            longitude: entityData.location.coordinates[0]
          } : null
        };

      case 'customer':
        return {
          ...baseProperties,
          customerId: entityData.id,
          companyName: entityData.company_name,
          contactName: entityData.contact_name,
          businessType: entityData.business_type,
          status: entityData.status,
          serviceLevel: entityData.service_level,
          address: entityData.address || '',
          description: entityData.description || '',
          binCount: 0, // Will be calculated separately
          monthlyRevenue: entityData.monthly_revenue || 0,
          signupDate: entityData.created_at?.toISOString(),
          lastServiceDate: entityData.last_service_date?.toISOString()
        };

      case 'service_event':
        return {
          ...baseProperties,
          eventId: entityData.id,
          eventType: entityData.event_type,
          status: entityData.status,
          binId: entityData.bin_id,
          routeId: entityData.route_id,
          driverName: entityData.driver_name || '',
          vehicleId: entityData.vehicle_id || '',
          description: entityData.description || '',
          notes: entityData.notes || '',
          duration: entityData.duration_minutes || 0,
          scheduledTime: entityData.scheduled_time?.toISOString(),
          startedTime: entityData.started_at?.toISOString(),
          completedTime: entityData.completed_at?.toISOString()
        };

      default:
        return baseProperties;
    }
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
   * Calculate vector quality score
   */
  private calculateQualityScore(vectorUpdate: any): number {
    let score = 0.7; // Base score

    // Content length bonus
    if (vectorUpdate.contentText && vectorUpdate.contentText.length > 100) {
      score += 0.1;
    }

    // Processing success bonus
    if (vectorUpdate.syncStatus === 'synced') {
      score += 0.1;
    }

    // Retry penalty
    score -= vectorUpdate.syncRetryCount * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Create sync batch record
   */
  private async createSyncBatch(
    batchId: string,
    syncType: VectorSyncBatchStatus['syncType'],
    entityFilter?: any
  ): Promise<VectorSyncBatchStatus> {
    const query = `
      INSERT INTO vector_sync_status (
        id, sync_batch_id, sync_type, entity_filter, sync_status,
        sync_started_at, created_at, updated_at
      ) VALUES (
        :id, :batchId, :syncType, :entityFilter, 'running',
        NOW(), NOW(), NOW()
      )
      RETURNING *
    `;

    const [results] = await this.database.query(query, {
      replacements: {
        id: this.generateUUID(),
        batchId,
        syncType,
        entityFilter: entityFilter ? JSON.stringify(entityFilter) : null
      },
      type: 'INSERT'
    });

    return results[0] as VectorSyncBatchStatus;
  }

  /**
   * Update sync batch status
   */
  private async updateSyncBatch(
    syncBatchId: string,
    updates: Partial<VectorSyncBatchStatus>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .map(key => {
        const sqlKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${sqlKey} = :${key}`;
      })
      .join(', ');

    const query = `
      UPDATE vector_sync_status
      SET ${setClause}, updated_at = NOW()
      WHERE id = :syncBatchId
    `;

    await this.database.query(query, {
      replacements: {
        syncBatchId,
        ...updates
      },
      type: 'UPDATE'
    });
  }

  /**
   * Update vector metadata
   */
  private async updateVectorMetadata(
    vectorId: string,
    updates: Partial<VectorEmbeddingMetadata>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => {
        const sqlKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${sqlKey} = :${key}`;
      })
      .join(', ');

    const query = `
      UPDATE vector_embeddings
      SET ${setClause}, updated_at = NOW()
      WHERE id = :vectorId
    `;

    await this.database.query(query, {
      replacements: {
        vectorId,
        ...updates
      },
      type: 'UPDATE'
    });
  }

  /**
   * Get sync status metrics
   */
  public async getSyncMetrics(): Promise<any> {
    const query = `
      SELECT 
        sync_type,
        COUNT(*) as total_batches,
        COUNT(CASE WHEN sync_status = 'completed' THEN 1 END) as completed_batches,
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_batches,
        AVG(total_duration_ms) as avg_duration_ms,
        SUM(successful_syncs) as total_successful,
        SUM(failed_syncs) as total_failed,
        AVG(avg_processing_time_ms) as avg_processing_time_ms
      FROM vector_sync_status
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY sync_type
      ORDER BY total_batches DESC
    `;

    const [results] = await this.database.query(query, { type: 'SELECT' });
    return results;
  }

  /**
   * Clean up old sync records
   */
  public async cleanupOldSyncRecords(retentionDays: number = 7): Promise<number> {
    const query = `
      DELETE FROM vector_sync_status 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
        AND sync_status IN ('completed', 'failed')
    `;

    const [result] = await this.database.query(query, { type: 'DELETE' });
    return (result as any).rowCount || 0;
  }

  /**
   * Shutdown service gracefully
   */
  public async shutdown(): Promise<void> {
    await this.stopScheduledSync();
    
    if (this.syncInProgress) {
      this.logger.info('Waiting for current sync to complete...');
      
      // Wait for current sync to complete (max 60 seconds)
      let waitTime = 0;
      while (this.syncInProgress && waitTime < 60000) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
    }

    this.logger.info('Vector Sync Service shutdown complete');
  }
}