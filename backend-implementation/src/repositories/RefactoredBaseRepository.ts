/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REFACTORED BASE REPOSITORY
 * ============================================================================
 *
 * Refactored version of BaseRepository with extracted concerns and optimizations.
 * Uses OptimizedCacheManager and modern patterns for better performance and maintainability.
 *
 * Improvements:
 * - Separated caching concerns to OptimizedCacheManager
 * - Reduced method complexity and size
 * - Better error handling with Result pattern
 * - Improved performance monitoring
 * - Cleaner transaction management
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-18
 * Version: 2.0.0
 */

import {
  Model,
  ModelStatic,
  Transaction,
  FindOptions,
  CreateOptions,
  UpdateOptions,
  DestroyOptions,
  WhereOptions,
  Order,
  Op,
} from "sequelize";
import { database } from "@/config/database";
import { logger, Timer } from "@/utils/logger";
import { OptimizedCacheManager } from "@/services/cache/OptimizedCacheManager";
import { Result, AppErrors } from "@/types/Result";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "@/middleware/errorHandler";

/**
 * Repository filter options
 */
export interface RepositoryFilter {
  where?: WhereOptions;
  include?: any[];
  attributes?: string[] | { include?: string[]; exclude?: string[] };
  order?: Order;
  group?: string | string[];
  having?: WhereOptions;
  limit?: number;
  offset?: number;
  paranoid?: boolean;
  raw?: boolean;
  nest?: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    offset: number;
  };
}

/**
 * Repository operation context
 */
interface OperationContext {
  useCache?: boolean;
  cacheTTL?: number;
  skipValidation?: boolean;
  auditMetadata?: Record<string, any>;
}

/**
 * Repository metrics
 */
interface RepositoryMetrics {
  queryCount: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastResetTime: Date;
}

/**
 * Refactored Base Repository Class
 */
export abstract class RefactoredBaseRepository<T extends Model = Model> {
  protected model: ModelStatic<T>;
  protected modelName: string;
  protected cacheManager: OptimizedCacheManager;
  private metrics: RepositoryMetrics;

  constructor(model: ModelStatic<T>) {
    this.model = model;
    this.modelName = model.name;
    this.cacheManager = new OptimizedCacheManager({
      prefix: `repo:${this.modelName.toLowerCase()}`,
      ttl: 300, // 5 minutes default
      enabled: true,
    });
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize repository metrics
   */
  private initializeMetrics(): RepositoryMetrics {
    return {
      queryCount: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastResetTime: new Date(),
    };
  }

  /**
   * Execute operation within transaction
   */
  protected async withTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>,
    transaction?: Transaction,
  ): Promise<R> {
    if (transaction) {
      return operation(transaction);
    }

    const newTransaction = await database.transaction();
    try {
      const result = await operation(newTransaction);
      await newTransaction.commit();
      return result;
    } catch (error: unknown) {
      await newTransaction.rollback();
      throw error;
    }
  }

  /**
   * Find by primary key with optimized caching
   */
  public async findById(
    id: string | number,
    options: FindOptions = {},
    context: OperationContext = {}
  ): Promise<Result<T | null, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.findById`);
    const { useCache = true, cacheTTL } = context;

    try {
      this.metrics.queryCount++;
      
      const cacheKey = this.cacheManager.generateKey("findById", { id, options });

      // Check cache first
      if (useCache) {
        const cacheResult = await this.cacheManager.get<T>(cacheKey);
        if (cacheResult.hit) {
          timer.end({ cacheHit: true });
          this.updateMetrics(timer.getDuration(), true);
          return Result.success(cacheResult?.data || null);
        }
      }

      // Query database
      const result = await this.model.findByPk(id, options);

      // Cache the result
      if (result && useCache) {
        await this.cacheManager.set(cacheKey, result, cacheTTL);
      }

      timer.end({ found: !!result });
      this.updateMetrics(timer.getDuration(), false);

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository findById failed`, {
        id,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return Result.failure(AppErrors.database(`Failed to find ${this.modelName}`, error));
    }
  }

  /**
   * Find one record with improved error handling
   */
  public async findOne(
    filter: RepositoryFilter = {},
    context: OperationContext = {}
  ): Promise<Result<T | null, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.findOne`);
    const { useCache = true, cacheTTL } = context;

    try {
      this.metrics.queryCount++;
      
      const cacheKey = this.cacheManager.generateKey("findOne", filter);

      // Check cache
      if (useCache) {
        const cacheResult = await this.cacheManager.get<T>(cacheKey);
        if (cacheResult.hit) {
          timer.end({ cacheHit: true });
          this.updateMetrics(timer.getDuration(), true);
          return Result.success(cacheResult?.data || null);
        }
      }

      // Query database
      const result = await this.model.findOne(filter as FindOptions);

      // Cache the result
      if (result && useCache) {
        await this.cacheManager.set(cacheKey, result, cacheTTL);
      }

      timer.end({ found: !!result });
      this.updateMetrics(timer.getDuration(), false);

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository findOne failed`, {
        filter,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return Result.failure(AppErrors.database(`Failed to find ${this.modelName}`, error));
    }
  }

  /**
   * Find all records with batch optimization
   */
  public async findAll(
    filter: RepositoryFilter = {},
    context: OperationContext = {}
  ): Promise<Result<T[], AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.findAll`);
    const { useCache = true, cacheTTL } = context;

    try {
      this.metrics.queryCount++;
      
      const cacheKey = this.cacheManager.generateKey("findAll", filter);

      // Check cache
      if (useCache) {
        const cacheResult = await this.cacheManager.get<T[]>(cacheKey);
        if (cacheResult.hit) {
          timer.end({ cacheHit: true });
          this.updateMetrics(timer.getDuration(), true);
          return Result.success(cacheResult?.data || []);
        }
      }

      // Query database
      const results = await this.model.findAll(filter as FindOptions);

      // Cache the results
      if (useCache) {
        await this.cacheManager.set(cacheKey, results, cacheTTL);
      }

      timer.end({ recordCount: results.length });
      this.updateMetrics(timer.getDuration(), false);

      return Result.success(results);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository findAll failed`, {
        filter,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return Result.failure(AppErrors.database(`Failed to find ${this.modelName} records`, error));
    }
  }

  /**
   * Find with pagination using optimized queries
   */
  public async findAndCountAll(
    filter: RepositoryFilter = {},
    pagination: PaginationOptions,
    context: OperationContext = {}
  ): Promise<Result<PaginationResult<T>, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.findAndCountAll`);
    const { useCache = true, cacheTTL } = context;

    try {
      this.metrics.queryCount++;
      
      const { page, limit } = pagination;
      const offset = pagination.offset || (page - 1) * limit;

      const queryOptions = {
        ...filter,
        limit,
        offset,
      } as FindOptions;

      const cacheKey = this.cacheManager.generateKey("findAndCountAll", {
        filter,
        pagination,
      });

      // Check cache
      if (useCache) {
        const cacheResult = await this.cacheManager.get<PaginationResult<T>>(cacheKey);
        if (cacheResult.hit) {
          timer.end({ cacheHit: true });
          this.updateMetrics(timer.getDuration(), true);
          return Result.success(cacheResult.data!);
        }
      }

      // Query database
      const { count, rows } = await this.model.findAndCountAll(queryOptions);

      const totalPages = Math.ceil(count / limit);
      const result: PaginationResult<T> = {
        data: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          offset,
        },
      };

      // Cache the result
      if (useCache) {
        await this.cacheManager.set(cacheKey, result, cacheTTL);
      }

      timer.end({ recordCount: rows.length, total: count });
      this.updateMetrics(timer.getDuration(), false);

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository findAndCountAll failed`, {
        filter,
        pagination,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return Result.failure(AppErrors.database(`Failed to find ${this.modelName} records`, error));
    }
  }

  /**
   * Create new record with improved validation
   */
  public async create(
    data: any,
    options: CreateOptions = {},
    context: OperationContext = {}
  ): Promise<Result<T, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.create`);

    try {
      this.metrics.queryCount++;

      const result = await this.withTransaction(async (transaction) => {
        const created = await this.model.create(data, {
          ...options,
          transaction,
        });

        // Invalidate related caches
        await this.invalidateListCaches();

        return created;
      }, options.transaction);

      timer.end({ created: true });
      this.updateMetrics(timer.getDuration(), false);

      logger.info(`${this.modelName} repository create successful`, {
        id: (result as any).id,
      });

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository create failed`, {
        data,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error.name === "SequelizeValidationError") {
        return Result.failure(AppErrors.validation("Validation failed", {
          errors: error.errors
        }));
      }

      return Result.failure(AppErrors.database(`Failed to create ${this.modelName}`, error));
    }
  }

  /**
   * Update record by ID with optimized cache invalidation
   */
  public async updateById(
    id: string | number,
    data: any,
    options: UpdateOptions = {},
    context: OperationContext = {}
  ): Promise<Result<T, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.updateById`);

    try {
      this.metrics.queryCount++;

      const result = await this.withTransaction(async (transaction) => {
        // Find the record first
        const record = await this.model.findByPk(id, { transaction });
        if (!record) {
          throw new NotFoundError(`${this.modelName} not found`);
        }

        // Update the record
        const updated = await record.update(data, {
          ...options,
          transaction,
        });

        // Invalidate specific caches
        await this.invalidateCacheForId(id);

        return updated;
      }, options.transaction);

      timer.end({ updated: true });
      this.updateMetrics(timer.getDuration(), false);

      logger.info(`${this.modelName} repository update successful`, { id });

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository updateById failed`, {
        id,
        data,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof NotFoundError) {
        return Result.failure(AppErrors.notFound(this.modelName));
      }

      if (error.name === "SequelizeValidationError") {
        return Result.failure(AppErrors.validation("Validation failed", {
          errors: error.errors
        }));
      }

      return Result.failure(AppErrors.database(`Failed to update ${this.modelName}`, error));
    }
  }

  /**
   * Delete record by ID with proper cleanup
   */
  public async deleteById(
    id: string | number,
    options: DestroyOptions = {},
    context: OperationContext = {}
  ): Promise<Result<boolean, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.deleteById`);

    try {
      this.metrics.queryCount++;

      const result = await this.withTransaction(async (transaction) => {
        const deleted = await this.model.destroy({
          where: { id } as WhereOptions,
          ...options,
          transaction,
        });

        if (deleted === 0) {
          throw new NotFoundError(`${this.modelName} not found`);
        }

        // Invalidate specific caches
        await this.invalidateCacheForId(id);

        return deleted > 0;
      }, options.transaction);

      timer.end({ deleted: result });
      this.updateMetrics(timer.getDuration(), false);

      logger.info(`${this.modelName} repository delete successful`, { id });

      return Result.success(result);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository deleteById failed`, {
        id,
        error: error instanceof Error ? error?.message : String(error),
      });

      if (error instanceof NotFoundError) {
        return Result.failure(AppErrors.notFound(this.modelName));
      }

      return Result.failure(AppErrors.database(`Failed to delete ${this.modelName}`, error));
    }
  }

  /**
   * Count records with caching
   */
  public async count(
    where: WhereOptions = {},
    context: OperationContext = {}
  ): Promise<Result<number, AppError>> {
    const timer = new Timer(`${this.modelName}.Repository.count`);
    const { useCache = true, cacheTTL } = context;

    try {
      this.metrics.queryCount++;
      
      const cacheKey = this.cacheManager.generateKey("count", { where });

      // Check cache
      if (useCache) {
        const cacheResult = await this.cacheManager.get<number>(cacheKey);
        if (cacheResult.hit) {
          timer.end({ cacheHit: true });
          this.updateMetrics(timer.getDuration(), true);
          return Result.success(cacheResult.data!);
        }
      }

      // Query database
      const count = await this.model.count({ where });

      // Cache the result
      if (useCache) {
        await this.cacheManager.set(cacheKey, count, cacheTTL);
      }

      timer.end({ count });
      this.updateMetrics(timer.getDuration(), false);

      return Result.success(count);
    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      this.updateErrorMetrics();
      
      logger.error(`${this.modelName} repository count failed`, {
        where,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return Result.failure(AppErrors.database(`Failed to count ${this.modelName} records`, error));
    }
  }

  /**
   * Invalidate cache for specific ID
   */
  private async invalidateCacheForId(id: string | number): Promise<void> {
    const patterns = [
      `*:findById:*${id}*`,
      `*:findOne:*${id}*`,
    ];

    for (const pattern of patterns) {
      await this.cacheManager.clearPattern(pattern);
    }
  }

  /**
   * Invalidate list-type caches
   */
  private async invalidateListCaches(): Promise<void> {
    const patterns = [
      `*:findAll:*`,
      `*:findAndCountAll:*`,
      `*:count:*`,
    ];

    for (const pattern of patterns) {
      await this.cacheManager.clearPattern(pattern);
    }
  }

  /**
   * Update repository metrics
   */
  private updateMetrics(duration: number, cacheHit: boolean): void {
    if (cacheHit) {
      // Update cache hit rate
      const cacheStats = this.cacheManager.getStats();
      this.metrics.cacheHitRate = cacheStats.hitRate;
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / Math.min(this.metrics.queryCount, 100);
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(): void {
    const totalOperations = this.metrics.queryCount;
    this.metrics.errorRate = totalOperations > 0 ? 
      (this.metrics.errorRate * (totalOperations - 1) + 1) / totalOperations : 1;
  }

  /**
   * Get repository metrics
   */
  public getMetrics(): RepositoryMetrics {
    return {
      ...this.metrics,
      cacheHitRate: this.cacheManager.getStats().hitRate,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.cacheManager.resetStats();
  }

  /**
   * Get cache manager for advanced operations
   */
  protected getCacheManager(): OptimizedCacheManager {
    return this.cacheManager;
  }

  /**
   * Configure cache settings
   */
  public configureCaching(enabled: boolean, ttl?: number): void {
    this.cacheManager.setEnabled(enabled);
    if (ttl) {
      this.cacheManager.updateConfig({ ttl });
    }
  }
}

export default RefactoredBaseRepository;