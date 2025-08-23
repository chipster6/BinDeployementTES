/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BASE SERVICE CLASS
 * ============================================================================
 *
 * Abstract base service class providing common functionality for all services.
 * Implements consistent patterns for database operations, error handling,
 * caching, and business logic separation.
 *
 * Features:
 * - Database transaction management
 * - Error handling and validation
 * - Caching support
 * - Audit logging
 * - Performance monitoring
 * - Common CRUD operations
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Model, type ModelStatic, type Transaction, type FindOptions, type CreateOptions, type UpdateOptions, type DestroyOptions, type  } from "sequelize";
import { database } from "@/config/database";
import { redisClient } from "@/config/redis";
import { logger, Timer } from "@/utils/logger";
import {
  AppError,
  ValidationError,
  NotFoundError,
} from "@/middleware/errorHandler";

/**
 * Service result interface
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: Record<string, any>;
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
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Cache options
 */
export interface CacheOptions {
  key: string;
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

/**
 * Abstract base service class
 */
export abstract class BaseService<T extends Model = Model> {
  protected model: ModelStatic<T>;
  protected serviceName: string;
  protected cacheNamespace: string;
  protected defaultCacheTTL: number = 300; // 5 minutes

  constructor(model: ModelStatic<T>, serviceName?: string) {
    this.model = model;
    this.serviceName = serviceName || model.name + "Service";
    this.cacheNamespace =
      serviceName?.toLowerCase() || model.name.toLowerCase();
  }

  /**
   * Execute operation within a database transaction
   */
  protected async withTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>,
    transaction?: Transaction,
  ): Promise<R> {
    const timer = new Timer(`${this.serviceName}.withTransaction`);

    if (transaction) {
      // Use provided transaction
      const result = await operation(transaction);
      timer.end({ operation: "existing_transaction" });
      return result;
    }

    // Create new transaction
    const newTransaction = await database.transaction();
    try {
      const result = await operation(newTransaction);
      await newTransaction.commit();
      timer.end({ operation: "new_transaction", status: "committed" });
      return result;
    } catch (error: unknown) {
      await newTransaction.rollback();
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({
        operation: "new_transaction",
        status: "rolled_back",
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Cache get operation
   */
  protected async getFromCache<R>(
    key: string,
    namespace?: string,
  ): Promise<R | null> {
    try {
      const cacheKey = `${namespace || this.cacheNamespace}:${key}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Cache hit", { service: this.serviceName, key: cacheKey });
        return JSON.parse(cached);
      }

      logger.debug("Cache miss", { service: this.serviceName, key: cacheKey });
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.warn("Cache get failed", {
        service: this.serviceName,
        key,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Cache set operation
   */
  protected async setCache<R>(
    key: string,
    data: R,
    options: Partial<CacheOptions> = {},
  ): Promise<void> {
    try {
      const cacheKey = `${options?.namespace || this.cacheNamespace}:${key}`;
      const ttl = options?.ttl || this.defaultCacheTTL;

      await redisClient.setex(cacheKey, ttl, JSON.stringify(data));
      logger.debug("Cache set", {
        service: this.serviceName,
        key: cacheKey,
        ttl,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.warn("Cache set failed", {
        service: this.serviceName,
        key,
        error: errorMessage,
      });
    }
  }

  /**
   * Cache delete operation
   */
  protected async deleteFromCache(
    key: string,
    namespace?: string,
  ): Promise<void> {
    try {
      const cacheKey = `${namespace || this.cacheNamespace}:${key}`;
      await redisClient.del(cacheKey);
      logger.debug("Cache deleted", {
        service: this.serviceName,
        key: cacheKey,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.warn("Cache delete failed", {
        service: this.serviceName,
        key,
        error: errorMessage,
      });
    }
  }

  /**
   * Clear all cache for this service
   */
  protected async clearServiceCache(): Promise<void> {
    try {
      const pattern = `${this.cacheNamespace}:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Service cache cleared", {
          service: this.serviceName,
          keysCleared: keys.length,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.warn("Cache clear failed", {
        service: this.serviceName,
        error: errorMessage,
      });
    }
  }

  /**
   * Find by ID with caching
   */
  public async findById(
    id: string | number,
    options: FindOptions = {},
    useCache: boolean = true,
  ): Promise<T | null> {
    const timer = new Timer(`${this.serviceName}.findById`);

    try {
      // Check cache first
      if (useCache) {
        const cached = await this.getFromCache(`id:${id}`);
        if (cached) {
          timer.end({ cacheHit: true });
          return cached as T;
        }
      }

      // Query database
      const result = await this.model.findByPk(id, options);

      // Cache the result
      if (result && useCache) {
        await this.setCache(`id:${id}`, result);
      }

      timer.end({ found: !!result, cached: useCache });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.findById failed`, {
        id,
        error: errorMessage,
      });
      throw new AppError(`Failed to find ${this.model.name}`, 500);
    }
  }

  /**
   * Find one with options
   */
  public async findOne(options: FindOptions = {}): Promise<T | null> {
    const timer = new Timer(`${this.serviceName}.findOne`);

    try {
      const result = await this.model.findOne(options);
      timer.end({ found: !!result });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.findOne failed`, {
        error: errorMessage,
      });
      throw new AppError(`Failed to find ${this.model.name}`, 500);
    }
  }

  /**
   * Find all with pagination
   */
  public async findAll(
    options: FindOptions = {},
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<T> | T[]> {
    const timer = new Timer(`${this.serviceName}.findAll`);

    try {
      if (pagination) {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        const { count, rows } = await this.model.findAndCountAll({
          ...options,
          limit,
          offset,
        });

        const totalPages = Math.ceil(count / limit);

        timer.end({
          paginated: true,
          page,
          limit,
          total: count,
          returned: rows.length,
        });

        return {
          data: rows,
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      }

      const results = await this.model.findAll(options);
      timer.end({ paginated: false, returned: results.length });
      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.findAll failed`, {
        error: errorMessage,
      });
      throw new AppError(`Failed to find ${this.model.name} records`, 500);
    }
  }

  /**
   * Create new record
   */
  public async create(
    data: any,
    options: CreateOptions = {},
    useCache: boolean = true,
  ): Promise<T> {
    const timer = new Timer(`${this.serviceName}.create`);

    try {
      const result = await this.withTransaction(async (transaction) => {
        const created = await this.model.create(data, {
          ...options,
          transaction,
        });

        // Clear relevant cache
        if (useCache) {
          await this.clearServiceCache();
        }

        return created;
      }, options.transaction);

      timer.end({ created: true });
      logger.info(`${this.serviceName}.create successful`, {
        id: (result as any).id,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.create failed`, {
        data,
        error: errorMessage,
      });

      if (error instanceof Error && error.name === "SequelizeValidationError") {
        throw new ValidationError("Validation failed", (error as any).errors);
      }

      throw new AppError(`Failed to create ${this.model.name}`, 500);
    }
  }

  /**
   * Update record by ID
   */
  public async update(
    id: string | number,
    data: any,
    options: UpdateOptions = {},
    useCache: boolean = true,
  ): Promise<T> {
    const timer = new Timer(`${this.serviceName}.update`);

    try {
      const result = await this.withTransaction(async (transaction) => {
        // First, find the record
        const record = await this.model.findByPk(id, { transaction });
        if (!record) {
          throw new NotFoundError(`${this.model.name} not found`);
        }

        // Update the record
        const updated = await record.update(data, {
          ...options,
          transaction,
        });

        // Clear cache
        if (useCache) {
          await this.deleteFromCache(`id:${id}`);
          await this.clearServiceCache();
        }

        return updated;
      }, options.transaction);

      timer.end({ updated: true });
      logger.info(`${this.serviceName}.update successful`, { id });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.update failed`, {
        id,
        data,
        error: errorMessage,
      });

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "SequelizeValidationError") {
        throw new ValidationError("Validation failed", (error as any).errors);
      }

      throw new AppError(`Failed to update ${this.model.name}`, 500);
    }
  }

  /**
   * Delete record by ID
   */
  public async delete(
    id: string | number,
    options: DestroyOptions = {},
    useCache: boolean = true,
  ): Promise<boolean> {
    const timer = new Timer(`${this.serviceName}.delete`);

    try {
      const result = await this.withTransaction(async (transaction) => {
        const deleted = await this.model.destroy({
          where: { id },
          ...options,
          transaction,
        });

        if (deleted === 0) {
          throw new NotFoundError(`${this.model.name} not found`);
        }

        // Clear cache
        if (useCache) {
          await this.deleteFromCache(`id:${id}`);
          await this.clearServiceCache();
        }

        return deleted > 0;
      }, options.transaction);

      timer.end({ deleted: result });
      logger.info(`${this.serviceName}.delete successful`, { id });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.delete failed`, {
        id,
        error: errorMessage,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(`Failed to delete ${this.model.name}`, 500);
    }
  }

  /**
   * Check if record exists
   */
  public async exists(id: string | number): Promise<boolean> {
    const timer = new Timer(`${this.serviceName}.exists`);

    try {
      // Check cache first
      const cached = await this.getFromCache(`id:${id}`);
      if (cached) {
        timer.end({ cacheHit: true, exists: true });
        return true;
      }

      // Check database
      const count = await this.model.count({
        where: { id },
      });

      const exists = count > 0;
      timer.end({ exists });
      return exists;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      timer.end({ error: errorMessage });
      logger.error(`${this.serviceName}.exists failed`, {
        id,
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Get service statistics
   */
  public async getStats(): Promise<Record<string, any>> {
    try {
      const total = await this.model.count();
      return {
        service: this.serviceName,
        model: this.model.name,
        totalRecords: total,
        cacheNamespace: this.cacheNamespace,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error(`${this.serviceName}.getStats failed`, {
        error: errorMessage,
      });
      return {
        service: this.serviceName,
        model: this.model.name,
        totalRecords: 0,
        error: errorMessage,
      };
    }
  }
}

export default BaseService;
