/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BASE REPOSITORY CLASS
 * ============================================================================
 *
 * Abstract base repository class implementing the Repository pattern.
 * Provides consistent data access layer with caching, transactions,
 * and query optimization across all models.
 *
 * Features:
 * - Database abstraction layer
 * - Query optimization and caching
 * - Transaction management
 * - Soft delete support
 * - Pagination and filtering
 * - Performance monitoring
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
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
import { redisClient } from "@/config/redis";
import { logger, Timer } from "@/utils/logger";
import { AppError, NotFoundError, ValidationError } from "@/middleware/errorHandler";

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
 * Cache configuration
 */
export interface CacheConfig {
  ttl?: number;
  prefix?: string;
  enabled?: boolean;
}

/**
 * Query statistics
 */
export interface QueryStats {
  queryType: string;
  duration: number;
  cacheHit?: boolean;
  recordCount?: number;
  sqlQuery?: string;
}

/**
 * Abstract base repository class
 */
export abstract class BaseRepository<T extends Model = Model> {
  protected model: ModelStatic<T>;
  protected modelName: string;
  protected cachePrefix: string;
  protected defaultCacheTTL: number = 300; // 5 minutes
  protected cacheEnabled: boolean = true;

  constructor(model: ModelStatic<T>) {
    this.model = model;
    this.modelName = model.name;
    this.cachePrefix = `repo:${this.modelName.toLowerCase()}`;
  }

  /**
   * Execute query within transaction
   */
  protected async withTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>,
    transaction?: Transaction
  ): Promise<R> {
    if (transaction) {
      return operation(transaction);
    }

    const newTransaction = await database.transaction();
    try {
      const result = await operation(newTransaction);
      await newTransaction.commit();
      return result;
    } catch (error) {
      await newTransaction.rollback();
      throw error;
    }
  }

  /**
   * Generate cache key
   */
  protected generateCacheKey(method: string, params: any = {}): string {
    const paramStr = JSON.stringify(params);
    const hash = require('crypto').createHash('md5').update(paramStr).digest('hex');
    return `${this.cachePrefix}:${method}:${hash}`;
  }

  /**
   * Get from cache
   */
  protected async getFromCache<R>(key: string): Promise<R | null> {
    if (!this.cacheEnabled) return null;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug("Repository cache hit", { 
          repository: this.modelName, 
          key 
        });
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn("Cache get failed", { 
        repository: this.modelName, 
        key, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Set cache
   */
  protected async setCache<R>(key: string, data: R, ttl?: number): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      const cacheTTL = ttl || this.defaultCacheTTL;
      await redisClient.setex(key, cacheTTL, JSON.stringify(data));
      logger.debug("Repository cache set", { 
        repository: this.modelName, 
        key, 
        ttl: cacheTTL 
      });
    } catch (error) {
      logger.warn("Cache set failed", { 
        repository: this.modelName, 
        key, 
        error: error.message 
      });
    }
  }

  /**
   * Delete from cache
   */
  protected async deleteFromCache(key: string): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      await redisClient.del(key);
      logger.debug("Repository cache deleted", { 
        repository: this.modelName, 
        key 
      });
    } catch (error) {
      logger.warn("Cache delete failed", { 
        repository: this.modelName, 
        key, 
        error: error.message 
      });
    }
  }

  /**
   * Clear all cache for this repository
   */
  protected async clearCache(): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      const pattern = `${this.cachePrefix}:*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Repository cache cleared", { 
          repository: this.modelName, 
          keysCleared: keys.length 
        });
      }
    } catch (error) {
      logger.warn("Cache clear failed", { 
        repository: this.modelName, 
        error: error.message 
      });
    }
  }

  /**
   * Log query statistics
   */
  protected logQueryStats(stats: QueryStats): void {
    logger.debug("Repository query stats", {
      repository: this.modelName,
      ...stats,
    });
  }

  /**
   * Find by primary key
   */
  public async findById(
    id: string | number,
    options: FindOptions = {},
    useCache: boolean = true
  ): Promise<T | null> {
    const timer = new Timer(`${this.modelName}.Repository.findById`);
    
    try {
      const cacheKey = this.generateCacheKey("findById", { id, options });
      
      // Check cache first
      if (useCache) {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached) {
          this.logQueryStats({
            queryType: "findById",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
          });
          return cached;
        }
      }

      // Query database
      const result = await this.model.findByPk(id, options);
      
      // Cache the result
      if (result && useCache) {
        await this.setCache(cacheKey, result);
      }

      this.logQueryStats({
        queryType: "findById",
        duration: timer.end({ found: !!result }),
        cacheHit: false,
        recordCount: result ? 1 : 0,
      });

      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository findById failed`, { 
        id, 
        error: error.message 
      });
      throw new AppError(`Failed to find ${this.modelName}`, 500);
    }
  }

  /**
   * Find one record
   */
  public async findOne(
    filter: RepositoryFilter = {},
    useCache: boolean = true
  ): Promise<T | null> {
    const timer = new Timer(`${this.modelName}.Repository.findOne`);
    
    try {
      const cacheKey = this.generateCacheKey("findOne", filter);
      
      // Check cache
      if (useCache) {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached) {
          this.logQueryStats({
            queryType: "findOne",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
          });
          return cached;
        }
      }

      // Query database
      const result = await this.model.findOne(filter as FindOptions);
      
      // Cache the result
      if (result && useCache) {
        await this.setCache(cacheKey, result);
      }

      this.logQueryStats({
        queryType: "findOne",
        duration: timer.end({ found: !!result }),
        cacheHit: false,
        recordCount: result ? 1 : 0,
      });

      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository findOne failed`, { 
        filter, 
        error: error.message 
      });
      throw new AppError(`Failed to find ${this.modelName}`, 500);
    }
  }

  /**
   * Find all records
   */
  public async findAll(
    filter: RepositoryFilter = {},
    useCache: boolean = true
  ): Promise<T[]> {
    const timer = new Timer(`${this.modelName}.Repository.findAll`);
    
    try {
      const cacheKey = this.generateCacheKey("findAll", filter);
      
      // Check cache
      if (useCache) {
        const cached = await this.getFromCache<T[]>(cacheKey);
        if (cached) {
          this.logQueryStats({
            queryType: "findAll",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
            recordCount: cached.length,
          });
          return cached;
        }
      }

      // Query database
      const results = await this.model.findAll(filter as FindOptions);
      
      // Cache the results
      if (useCache) {
        await this.setCache(cacheKey, results);
      }

      this.logQueryStats({
        queryType: "findAll",
        duration: timer.end({ recordCount: results.length }),
        cacheHit: false,
        recordCount: results.length,
      });

      return results;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository findAll failed`, { 
        filter, 
        error: error.message 
      });
      throw new AppError(`Failed to find ${this.modelName} records`, 500);
    }
  }

  /**
   * Find with pagination
   */
  public async findAndCountAll(
    filter: RepositoryFilter = {},
    pagination: PaginationOptions,
    useCache: boolean = true
  ): Promise<PaginationResult<T>> {
    const timer = new Timer(`${this.modelName}.Repository.findAndCountAll`);
    
    try {
      const { page, limit } = pagination;
      const offset = pagination.offset || (page - 1) * limit;
      
      const queryOptions = {
        ...filter,
        limit,
        offset,
      } as FindOptions;

      const cacheKey = this.generateCacheKey("findAndCountAll", { filter, pagination });
      
      // Check cache
      if (useCache) {
        const cached = await this.getFromCache<PaginationResult<T>>(cacheKey);
        if (cached) {
          this.logQueryStats({
            queryType: "findAndCountAll",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
            recordCount: cached.data.length,
          });
          return cached;
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
        await this.setCache(cacheKey, result);
      }

      this.logQueryStats({
        queryType: "findAndCountAll",
        duration: timer.end({ recordCount: rows.length, total: count }),
        cacheHit: false,
        recordCount: rows.length,
      });

      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository findAndCountAll failed`, { 
        filter, 
        pagination, 
        error: error.message 
      });
      throw new AppError(`Failed to find ${this.modelName} records`, 500);
    }
  }

  /**
   * Create new record
   */
  public async create(
    data: any,
    options: CreateOptions = {},
    clearCache: boolean = true
  ): Promise<T> {
    const timer = new Timer(`${this.modelName}.Repository.create`);
    
    try {
      const result = await this.withTransaction(async (transaction) => {
        const created = await this.model.create(data, {
          ...options,
          transaction,
        });

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return created;
      }, options.transaction);

      this.logQueryStats({
        queryType: "create",
        duration: timer.end({ created: true }),
        recordCount: 1,
      });

      logger.info(`${this.modelName} repository create successful`, { 
        id: (result as any).id 
      });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository create failed`, { 
        data, 
        error: error.message 
      });
      
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError("Validation failed", error.errors);
      }
      
      throw new AppError(`Failed to create ${this.modelName}`, 500);
    }
  }

  /**
   * Update record by ID
   */
  public async updateById(
    id: string | number,
    data: any,
    options: UpdateOptions = {},
    clearCache: boolean = true
  ): Promise<T> {
    const timer = new Timer(`${this.modelName}.Repository.updateById`);
    
    try {
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

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return updated;
      }, options.transaction);

      this.logQueryStats({
        queryType: "updateById",
        duration: timer.end({ updated: true }),
        recordCount: 1,
      });

      logger.info(`${this.modelName} repository update successful`, { id });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository updateById failed`, { 
        id, 
        data, 
        error: error.message 
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError("Validation failed", error.errors);
      }
      
      throw new AppError(`Failed to update ${this.modelName}`, 500);
    }
  }

  /**
   * Update multiple records
   */
  public async updateWhere(
    where: WhereOptions,
    data: any,
    options: UpdateOptions = {},
    clearCache: boolean = true
  ): Promise<number> {
    const timer = new Timer(`${this.modelName}.Repository.updateWhere`);
    
    try {
      const result = await this.withTransaction(async (transaction) => {
        const [affectedCount] = await this.model.update(data, {
          where,
          ...options,
          transaction,
        });

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return affectedCount;
      }, options.transaction);

      this.logQueryStats({
        queryType: "updateWhere",
        duration: timer.end({ updated: result }),
        recordCount: result,
      });

      logger.info(`${this.modelName} repository updateWhere successful`, { 
        affectedCount: result 
      });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository updateWhere failed`, { 
        where, 
        data, 
        error: error.message 
      });
      
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError("Validation failed", error.errors);
      }
      
      throw new AppError(`Failed to update ${this.modelName} records`, 500);
    }
  }

  /**
   * Delete record by ID
   */
  public async deleteById(
    id: string | number,
    options: DestroyOptions = {},
    clearCache: boolean = true
  ): Promise<boolean> {
    const timer = new Timer(`${this.modelName}.Repository.deleteById`);
    
    try {
      const result = await this.withTransaction(async (transaction) => {
        const deleted = await this.model.destroy({
          where: { id } as WhereOptions,
          ...options,
          transaction,
        });

        if (deleted === 0) {
          throw new NotFoundError(`${this.modelName} not found`);
        }

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return deleted > 0;
      }, options.transaction);

      this.logQueryStats({
        queryType: "deleteById",
        duration: timer.end({ deleted: result }),
        recordCount: result ? 1 : 0,
      });

      logger.info(`${this.modelName} repository delete successful`, { id });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository deleteById failed`, { 
        id, 
        error: error.message 
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(`Failed to delete ${this.modelName}`, 500);
    }
  }

  /**
   * Delete multiple records
   */
  public async deleteWhere(
    where: WhereOptions,
    options: DestroyOptions = {},
    clearCache: boolean = true
  ): Promise<number> {
    const timer = new Timer(`${this.modelName}.Repository.deleteWhere`);
    
    try {
      const result = await this.withTransaction(async (transaction) => {
        const deleted = await this.model.destroy({
          where,
          ...options,
          transaction,
        });

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return deleted;
      }, options.transaction);

      this.logQueryStats({
        queryType: "deleteWhere",
        duration: timer.end({ deleted: result }),
        recordCount: result,
      });

      logger.info(`${this.modelName} repository deleteWhere successful`, { 
        deletedCount: result 
      });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository deleteWhere failed`, { 
        where, 
        error: error.message 
      });
      
      throw new AppError(`Failed to delete ${this.modelName} records`, 500);
    }
  }

  /**
   * Count records
   */
  public async count(
    where: WhereOptions = {},
    useCache: boolean = true
  ): Promise<number> {
    const timer = new Timer(`${this.modelName}.Repository.count`);
    
    try {
      const cacheKey = this.generateCacheKey("count", { where });
      
      // Check cache
      if (useCache) {
        const cached = await this.getFromCache<number>(cacheKey);
        if (cached !== null) {
          this.logQueryStats({
            queryType: "count",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
            recordCount: cached,
          });
          return cached;
        }
      }

      // Query database
      const count = await this.model.count({ where });
      
      // Cache the result
      if (useCache) {
        await this.setCache(cacheKey, count);
      }

      this.logQueryStats({
        queryType: "count",
        duration: timer.end({ count }),
        cacheHit: false,
        recordCount: count,
      });

      return count;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository count failed`, { 
        where, 
        error: error.message 
      });
      throw new AppError(`Failed to count ${this.modelName} records`, 500);
    }
  }

  /**
   * Check if record exists
   */
  public async exists(
    where: WhereOptions,
    useCache: boolean = true
  ): Promise<boolean> {
    const count = await this.count(where, useCache);
    return count > 0;
  }

  /**
   * Bulk create records
   */
  public async bulkCreate(
    data: any[],
    options: any = {},
    clearCache: boolean = true
  ): Promise<T[]> {
    const timer = new Timer(`${this.modelName}.Repository.bulkCreate`);
    
    try {
      const result = await this.withTransaction(async (transaction) => {
        const created = await this.model.bulkCreate(data, {
          ...options,
          transaction,
        });

        // Clear cache
        if (clearCache) {
          await this.clearCache();
        }

        return created;
      }, options.transaction);

      this.logQueryStats({
        queryType: "bulkCreate",
        duration: timer.end({ created: result.length }),
        recordCount: result.length,
      });

      logger.info(`${this.modelName} repository bulkCreate successful`, { 
        count: result.length 
      });
      
      return result;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository bulkCreate failed`, { 
        count: data.length, 
        error: error.message 
      });
      
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError("Validation failed", error.errors);
      }
      
      throw new AppError(`Failed to bulk create ${this.modelName} records`, 500);
    }
  }

  /**
   * Execute raw query
   */
  public async rawQuery(
    sql: string,
    replacements?: any,
    useCache: boolean = false
  ): Promise<any> {
    const timer = new Timer(`${this.modelName}.Repository.rawQuery`);
    
    try {
      const cacheKey = this.generateCacheKey("rawQuery", { sql, replacements });
      
      // Check cache
      if (useCache) {
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) {
          this.logQueryStats({
            queryType: "rawQuery",
            duration: timer.end({ cacheHit: true }),
            cacheHit: true,
            sqlQuery: sql,
          });
          return cached;
        }
      }

      // Execute query
      const [results, metadata] = await database.query(sql, {
        replacements,
        model: this.model,
        mapToModel: true,
      });

      // Cache the results
      if (useCache) {
        await this.setCache(cacheKey, results);
      }

      this.logQueryStats({
        queryType: "rawQuery",
        duration: timer.end({ recordCount: results.length }),
        cacheHit: false,
        recordCount: results.length,
        sqlQuery: sql,
      });

      return results;
    } catch (error) {
      timer.end({ error: error.message });
      logger.error(`${this.modelName} repository rawQuery failed`, { 
        sql, 
        error: error.message 
      });
      throw new AppError(`Failed to execute raw query for ${this.modelName}`, 500);
    }
  }

  /**
   * Get repository statistics
   */
  public async getRepositoryStats(): Promise<Record<string, any>> {
    try {
      const [total, active, deleted] = await Promise.all([
        this.count(),
        this.count({ deletedAt: null }),
        this.count({ deletedAt: { [Op.ne]: null } }),
      ]);

      return {
        repository: this.modelName,
        totalRecords: total,
        activeRecords: active,
        deletedRecords: deleted,
        cachePrefix: this.cachePrefix,
        cacheEnabled: this.cacheEnabled,
        defaultCacheTTL: this.defaultCacheTTL,
      };
    } catch (error) {
      logger.error(`${this.modelName} repository stats failed`, { 
        error: error.message 
      });
      return {
        repository: this.modelName,
        error: error.message,
      };
    }
  }

  /**
   * Configure cache settings
   */
  public configureCaching(config: CacheConfig): void {
    if (config.ttl !== undefined) {
      this.defaultCacheTTL = config.ttl;
    }
    if (config.prefix !== undefined) {
      this.cachePrefix = config.prefix;
    }
    if (config.enabled !== undefined) {
      this.cacheEnabled = config.enabled;
    }
  }
}

export default BaseRepository;