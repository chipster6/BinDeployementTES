/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COMPREHENSIVE BASESERVICE TESTING
 * ============================================================================
 *
 * Comprehensive unit tests for BaseService abstract class covering:
 * - Transaction management and rollback scenarios
 * - Cache operations with Redis integration
 * - Error handling and recovery mechanisms
 * - CRUD operations with edge cases
 * - Performance monitoring and metrics
 *
 * Created by: QA Engineer / Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { BaseService, ServiceResult, PaginationOptions, CacheOptions } from '@/services/BaseService';
import { database } from '@/config/database';
import { redisClient } from '@/config/redis';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';
import { 
  AppError, 
  ValidationError, 
  NotFoundError 
} from '@/middleware/errorHandler';
import { Transaction, Model, ModelStatic } from 'sequelize';

// Mock dependencies
jest.mock('@/config/database');
jest.mock('@/config/redis');
jest.mock('@/utils/logger');

// Test implementation of BaseService
class TestService extends BaseService<User> {
  constructor() {
    super(User as ModelStatic<User>, 'TestService');
  }

  // Expose protected methods for testing
  public async testWithTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>,
    transaction?: Transaction
  ): Promise<R> {
    return this.withTransaction(operation, transaction);
  }

  public async testGetFromCache<R>(key: string, namespace?: string): Promise<R | null> {
    return this.getFromCache(key, namespace);
  }

  public async testSetCache<R>(key: string, data: R, options?: Partial<CacheOptions>): Promise<void> {
    return this.setCache(key, data, options);
  }

  public async testDeleteFromCache(key: string, namespace?: string): Promise<void> {
    return this.deleteFromCache(key, namespace);
  }

  public async testClearServiceCache(): Promise<void> {
    return this.clearServiceCache();
  }
}

describe('BaseService Comprehensive Tests', () => {
  let testService: TestService;
  let mockTransaction: jest.Mocked<Transaction>;
  let mockModel: jest.Mocked<ModelStatic<User>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testService = new TestService();
    
    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    } as any;
    
    // Mock database.transaction
    (database.transaction as jest.Mock) = jest.fn().mockResolvedValue(mockTransaction);
    
    // Mock User model
    mockModel = User as jest.Mocked<ModelStatic<User>>;
    mockModel.findByPk = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.findAll = jest.fn();
    mockModel.findAndCountAll = jest.fn();
    mockModel.create = jest.fn();
    mockModel.destroy = jest.fn();
    mockModel.count = jest.fn();
    mockModel.name = 'User';

    // Mock Redis client
    (redisClient.get as jest.Mock) = jest.fn();
    (redisClient.setex as jest.Mock) = jest.fn();
    (redisClient.del as jest.Mock) = jest.fn();
    (redisClient.keys as jest.Mock) = jest.fn();
  });

  describe('Transaction Management', () => {
    it('should execute operation within new transaction successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      
      const result = await testService.testWithTransaction(mockOperation);
      
      expect(database.transaction).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(result).toBe('test-result');
    });

    it('should rollback transaction on operation failure', async () => {
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      await expect(testService.testWithTransaction(mockOperation))
        .rejects.toThrow('Operation failed');
      
      expect(database.transaction).toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should use existing transaction when provided', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const existingTransaction = { id: 'existing' } as Transaction;
      
      const result = await testService.testWithTransaction(mockOperation, existingTransaction);
      
      expect(database.transaction).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(existingTransaction);
      expect(result).toBe('test-result');
    });

    it('should handle transaction commit failure', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      mockTransaction.commit.mockRejectedValue(new Error('Commit failed'));
      
      await expect(testService.testWithTransaction(mockOperation))
        .rejects.toThrow('Commit failed');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Cache Operations', () => {
    describe('getFromCache', () => {
      it('should return cached data when available', async () => {
        const testData = { id: 1, name: 'test' };
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(testData));
        
        const result = await testService.testGetFromCache('test-key');
        
        expect(redisClient.get).toHaveBeenCalledWith('testservice:test-key');
        expect(result).toEqual(testData);
      });

      it('should return null when cache miss', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        
        const result = await testService.testGetFromCache('test-key');
        
        expect(result).toBeNull();
      });

      it('should handle cache get failure gracefully', async () => {
        (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
        
        const result = await testService.testGetFromCache('test-key');
        
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          'Cache get failed',
          expect.objectContaining({
            service: 'TestService',
            key: 'test-key',
            error: 'Redis error'
          })
        );
      });

      it('should use custom namespace when provided', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        
        await testService.testGetFromCache('test-key', 'custom');
        
        expect(redisClient.get).toHaveBeenCalledWith('custom:test-key');
      });
    });

    describe('setCache', () => {
      it('should set cache with default TTL', async () => {
        const testData = { id: 1, name: 'test' };
        
        await testService.testSetCache('test-key', testData);
        
        expect(redisClient.setex).toHaveBeenCalledWith(
          'testservice:test-key',
          300, // Default TTL
          JSON.stringify(testData)
        );
      });

      it('should set cache with custom TTL', async () => {
        const testData = { id: 1, name: 'test' };
        const options = { ttl: 600 };
        
        await testService.testSetCache('test-key', testData, options);
        
        expect(redisClient.setex).toHaveBeenCalledWith(
          'testservice:test-key',
          600,
          JSON.stringify(testData)
        );
      });

      it('should handle cache set failure gracefully', async () => {
        (redisClient.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));
        
        await expect(testService.testSetCache('test-key', { data: 'test' }))
          .resolves.not.toThrow();
        
        expect(logger.warn).toHaveBeenCalledWith(
          'Cache set failed',
          expect.objectContaining({
            service: 'TestService',
            error: 'Redis error'
          })
        );
      });
    });

    describe('deleteFromCache', () => {
      it('should delete cache key', async () => {
        await testService.testDeleteFromCache('test-key');
        
        expect(redisClient.del).toHaveBeenCalledWith('testservice:test-key');
      });

      it('should handle cache delete failure gracefully', async () => {
        (redisClient.del as jest.Mock).mockRejectedValue(new Error('Redis error'));
        
        await expect(testService.testDeleteFromCache('test-key'))
          .resolves.not.toThrow();
      });
    });

    describe('clearServiceCache', () => {
      it('should clear all cache keys for service', async () => {
        const keys = ['testservice:key1', 'testservice:key2'];
        (redisClient.keys as jest.Mock).mockResolvedValue(keys);
        
        await testService.testClearServiceCache();
        
        expect(redisClient.keys).toHaveBeenCalledWith('testservice:*');
        expect(redisClient.del).toHaveBeenCalledWith(...keys);
      });

      it('should handle no keys to clear', async () => {
        (redisClient.keys as jest.Mock).mockResolvedValue([]);
        
        await testService.testClearServiceCache();
        
        expect(redisClient.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('CRUD Operations', () => {
    describe('findById', () => {
      it('should find record by ID from cache', async () => {
        const testUser = { id: 1, email: 'test@example.com' };
        (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(testUser));
        
        const result = await testService.findById(1);
        
        expect(redisClient.get).toHaveBeenCalledWith('testservice:id:1');
        expect(mockModel.findByPk).not.toHaveBeenCalled();
        expect(result).toEqual(testUser);
      });

      it('should find record by ID from database when cache miss', async () => {
        const testUser = { id: 1, email: 'test@example.com' } as User;
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.findByPk.mockResolvedValue(testUser);
        
        const result = await testService.findById(1);
        
        expect(mockModel.findByPk).toHaveBeenCalledWith(1, {});
        expect(redisClient.setex).toHaveBeenCalledWith(
          'testservice:id:1',
          300,
          JSON.stringify(testUser)
        );
        expect(result).toBe(testUser);
      });

      it('should return null when record not found', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.findByPk.mockResolvedValue(null);
        
        const result = await testService.findById(999);
        
        expect(result).toBeNull();
        expect(redisClient.setex).not.toHaveBeenCalled();
      });

      it('should skip cache when useCache is false', async () => {
        const testUser = { id: 1, email: 'test@example.com' } as User;
        mockModel.findByPk.mockResolvedValue(testUser);
        
        const result = await testService.findById(1, {}, false);
        
        expect(redisClient.get).not.toHaveBeenCalled();
        expect(redisClient.setex).not.toHaveBeenCalled();
        expect(result).toBe(testUser);
      });

      it('should handle database error', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.findByPk.mockRejectedValue(new Error('Database error'));
        
        await expect(testService.findById(1)).rejects.toThrow(AppError);
      });
    });

    describe('findAll with pagination', () => {
      it('should return paginated results', async () => {
        const mockRows = [
          { id: 1, email: 'user1@example.com' },
          { id: 2, email: 'user2@example.com' }
        ];
        const mockCount = 10;
        
        mockModel.findAndCountAll.mockResolvedValue({
          count: mockCount,
          rows: mockRows as User[]
        });
        
        const pagination: PaginationOptions = { page: 1, limit: 2 };
        const result = await testService.findAll({}, pagination);
        
        expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
          limit: 2,
          offset: 0
        });
        
        expect(result).toEqual({
          data: mockRows,
          pagination: {
            page: 1,
            limit: 2,
            total: 10,
            totalPages: 5,
            hasNextPage: true,
            hasPrevPage: false
          }
        });
      });

      it('should return all results when no pagination', async () => {
        const mockUsers = [
          { id: 1, email: 'user1@example.com' },
          { id: 2, email: 'user2@example.com' }
        ];
        
        mockModel.findAll.mockResolvedValue(mockUsers as User[]);
        
        const result = await testService.findAll();
        
        expect(mockModel.findAll).toHaveBeenCalledWith({});
        expect(result).toBe(mockUsers);
      });

      it('should handle pagination edge cases', async () => {
        mockModel.findAndCountAll.mockResolvedValue({
          count: 0,
          rows: []
        });
        
        const pagination: PaginationOptions = { page: 1, limit: 10 };
        const result = await testService.findAll({}, pagination);
        
        expect(result).toEqual({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        });
      });
    });

    describe('create', () => {
      it('should create record with transaction', async () => {
        const userData = { email: 'test@example.com', password: 'password123' };
        const createdUser = { id: 1, ...userData } as User;
        
        mockModel.create.mockResolvedValue(createdUser);
        
        const result = await testService.create(userData);
        
        expect(database.transaction).toHaveBeenCalled();
        expect(mockModel.create).toHaveBeenCalledWith(
          userData,
          expect.objectContaining({ transaction: mockTransaction })
        );
        expect(redisClient.keys).toHaveBeenCalledWith('testservice:*');
        expect(result).toBe(createdUser);
      });

      it('should handle validation errors', async () => {
        const validationError = new Error('Validation failed');
        validationError.name = 'SequelizeValidationError';
        (validationError as any).errors = ['Email is required'];
        
        mockModel.create.mockRejectedValue(validationError);
        
        await expect(testService.create({})).rejects.toThrow(ValidationError);
      });

      it('should handle generic creation errors', async () => {
        mockModel.create.mockRejectedValue(new Error('Database error'));
        
        await expect(testService.create({})).rejects.toThrow(AppError);
      });
    });

    describe('update', () => {
      it('should update record successfully', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          update: jest.fn().mockResolvedValue({ id: 1, email: 'updated@example.com' })
        } as any;
        
        mockModel.findByPk.mockResolvedValue(mockUser);
        
        const updateData = { email: 'updated@example.com' };
        const result = await testService.update(1, updateData);
        
        expect(mockModel.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
        expect(mockUser.update).toHaveBeenCalledWith(
          updateData,
          expect.objectContaining({ transaction: mockTransaction })
        );
        expect(redisClient.del).toHaveBeenCalledWith('testservice:id:1');
      });

      it('should throw NotFoundError when record does not exist', async () => {
        mockModel.findByPk.mockResolvedValue(null);
        
        await expect(testService.update(999, {})).rejects.toThrow(NotFoundError);
      });

      it('should handle validation errors on update', async () => {
        const mockUser = {
          id: 1,
          update: jest.fn().mockRejectedValue({
            name: 'SequelizeValidationError',
            errors: ['Invalid email format']
          })
        } as any;
        
        mockModel.findByPk.mockResolvedValue(mockUser);
        
        await expect(testService.update(1, { email: 'invalid' }))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('delete', () => {
      it('should delete record successfully', async () => {
        mockModel.destroy.mockResolvedValue(1);
        
        const result = await testService.delete(1);
        
        expect(mockModel.destroy).toHaveBeenCalledWith({
          where: { id: 1 },
          transaction: mockTransaction
        });
        expect(redisClient.del).toHaveBeenCalledWith('testservice:id:1');
        expect(result).toBe(true);
      });

      it('should throw NotFoundError when record does not exist', async () => {
        mockModel.destroy.mockResolvedValue(0);
        
        await expect(testService.delete(999)).rejects.toThrow(NotFoundError);
      });
    });

    describe('exists', () => {
      it('should return true when record exists in cache', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue('{"id":1}');
        
        const result = await testService.exists(1);
        
        expect(result).toBe(true);
        expect(mockModel.count).not.toHaveBeenCalled();
      });

      it('should check database when not in cache', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.count.mockResolvedValue(1);
        
        const result = await testService.exists(1);
        
        expect(mockModel.count).toHaveBeenCalledWith({ where: { id: 1 } });
        expect(result).toBe(true);
      });

      it('should return false when record does not exist', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.count.mockResolvedValue(0);
        
        const result = await testService.exists(999);
        
        expect(result).toBe(false);
      });

      it('should handle database errors gracefully', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        mockModel.count.mockRejectedValue(new Error('Database error'));
        
        const result = await testService.exists(1);
        
        expect(result).toBe(false);
      });
    });
  });

  describe('getStats', () => {
    it('should return service statistics', async () => {
      mockModel.count.mockResolvedValue(42);
      
      const stats = await testService.getStats();
      
      expect(stats).toEqual({
        service: 'TestService',
        model: 'User',
        totalRecords: 42,
        cacheNamespace: 'testservice'
      });
    });

    it('should handle database error in stats', async () => {
      mockModel.count.mockRejectedValue(new Error('Database error'));
      
      const stats = await testService.getStats();
      
      expect(stats).toEqual({
        service: 'TestService',
        model: 'User',
        totalRecords: 0,
        error: 'Database error'
      });
    });
  });
});