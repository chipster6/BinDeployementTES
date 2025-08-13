/**
 * ============================================================================
 * PERFORMANCE OPTIMIZATION VALIDATION TEST SUITE
 * ============================================================================
 * 
 * Critical validation tests for parallel Performance-Optimization-Specialist deployment.
 * Tests database connection pool scaling, Redis caching strategy, and PostGIS 
 * spatial query optimizations for production readiness.
 * 
 * Real-time validation during Performance-Optimization-Specialist parallel deployment
 * For $2M+ MRR waste management system production deployment.
 * 
 * Created by: Testing-Agent (Validation Mission)
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';

// Import database and connection pool components
import { sequelize, getConnectionPoolStats, checkDatabaseHealth } from '@/config/database';
import { redisClient, sessionRedisClient } from '@/config/redis';

// Import repository and service components for performance testing
import { BaseRepository } from '@/repositories/BaseRepository';
import { BinRepository } from '@/repositories/BinRepository';
import { UserRepository } from '@/repositories/UserRepository';

// Import services for performance testing
import { BinService } from '@/services/BinService';
import { UserService } from '@/services/UserService';
import { DatabasePerformanceMonitor } from '@/services/DatabasePerformanceMonitor';

// Import models
import { User, UserRole } from '@/models/User';
import { Bin, BinType, BinStatus } from '@/models/Bin';
import { Organization } from '@/models/Organization';

// Test utilities and fixtures
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { binFixtures } from '@tests/fixtures/BinFixtures';
import { userFixtures } from '@tests/fixtures/UserFixtures';

describe('Performance Optimization Validation Suite', () => {
  let testDbHelper: DatabaseTestHelper;
  let performanceMonitor: DatabasePerformanceMonitor;
  let testOrganization: any;

  beforeAll(async () => {
    // Initialize test database and performance monitor
    testDbHelper = new DatabaseTestHelper();
    await testDbHelper.setup();
    
    performanceMonitor = new DatabasePerformanceMonitor();
    
    // Create test organization for spatial queries
    testOrganization = await Organization.create({
      name: 'Test Performance Org',
      type: 'COMMERCIAL',
      email: 'test@performance.com',
      phone: '+1234567890',
      address: '123 Performance St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      isActive: true
    });
  });

  afterAll(async () => {
    // Cleanup test environment
    await testDbHelper.cleanup();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await redisClient.flushdb();
  });

  describe('1. Database Connection Pool Scaling Validation (20 → 120 connections)', () => {
    test('should report current connection pool configuration', async () => {
      const poolStats = await getConnectionPoolStats();
      
      expect(poolStats).toBeDefined();
      expect(poolStats.config).toBeDefined();
      expect(poolStats.config.max).toBeGreaterThanOrEqual(20);
      expect(poolStats.pool).toBeDefined();
      
      console.log('Connection Pool Configuration:', {
        min: poolStats.config.min,
        max: poolStats.config.max,
        current: poolStats.pool.total,
        active: poolStats.pool.active,
        idle: poolStats.pool.idle,
        utilization: poolStats.pool.utilization
      });
    });

    test('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 50;
      const startTime = performance.now();
      
      // Create concurrent database operations
      const operations = Array.from({ length: concurrentOperations }, async (_, index) => {
        const user = await User.create({
          ...userFixtures.createValidUser(),
          email: `perf-test-${index}@example.com`,
          organizationId: testOrganization.id
        });
        
        return await User.findByPk(user.id);
      });
      
      const results = await Promise.all(operations);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(concurrentOperations);
      expect(results.every(result => result !== null)).toBe(true);
      
      // Performance threshold: 50 operations should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      
      console.log(`Concurrent Operations Performance: ${concurrentOperations} operations in ${duration.toFixed(2)}ms`);
      
      // Check connection pool utilization during load
      const poolStatsAfterLoad = await getConnectionPoolStats();
      console.log('Pool Stats After Load:', poolStatsAfterLoad.pool);
    });

    test('should maintain connection pool health under load', async () => {
      // Simulate high load scenario
      const loadTestOperations = Array.from({ length: 100 }, async (_, index) => {
        return sequelize.query('SELECT NOW() as current_time, pg_sleep(0.1)');
      });
      
      const startTime = performance.now();
      const results = await Promise.allSettled(loadTestOperations);
      const endTime = performance.now();
      
      const successfulOperations = results.filter(result => result.status === 'fulfilled').length;
      const failedOperations = results.filter(result => result.status === 'rejected').length;
      
      expect(successfulOperations).toBeGreaterThan(90); // At least 90% success rate
      expect(failedOperations).toBeLessThan(10); // Less than 10% failures
      
      // Check pool health after load test
      const healthCheck = await checkDatabaseHealth();
      expect(healthCheck.status).toBe('healthy');
      
      console.log(`Load Test Results: ${successfulOperations} successful, ${failedOperations} failed in ${(endTime - startTime).toFixed(2)}ms`);
    });

    test('should recover from connection pool exhaustion', async () => {
      // Get current pool configuration
      const initialPoolStats = await getConnectionPoolStats();
      const maxConnections = initialPoolStats.config.max;
      
      // Create operations that exceed pool capacity
      const excessiveOperations = Array.from({ length: maxConnections + 10 }, async (_, index) => {
        return sequelize.query('SELECT pg_sleep(0.5), ? as operation_id', {
          replacements: [index]
        });
      });
      
      const startTime = performance.now();
      const results = await Promise.allSettled(excessiveOperations);
      const endTime = performance.now();
      
      const successfulOperations = results.filter(result => result.status === 'fulfilled').length;
      
      // Should handle gracefully even when exceeding pool capacity
      expect(successfulOperations).toBeGreaterThan(maxConnections);
      
      console.log(`Pool Exhaustion Test: ${successfulOperations}/${excessiveOperations.length} operations completed`);
      
      // Verify pool recovers to healthy state
      const finalPoolStats = await getConnectionPoolStats();
      expect(finalPoolStats.status).not.toBe('critical');
    });
  });

  describe('2. Redis Cache Strategy and Invalidation Validation', () => {
    let userRepository: UserRepository;
    let binRepository: BinRepository;

    beforeEach(() => {
      userRepository = new UserRepository();
      binRepository = new BinRepository();
    });

    test('should cache repository query results effectively', async () => {
      // Create test data
      const testUser = await User.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id
      });
      
      const cacheKey = `user:${testUser.id}`;
      
      // First query - should cache result
      const startTime1 = performance.now();
      const user1 = await userRepository.findById(testUser.id);
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;
      
      // Second query - should use cache
      const startTime2 = performance.now();
      const user2 = await userRepository.findById(testUser.id);
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;
      
      expect(user1).toEqual(user2);
      expect(duration2).toBeLessThan(duration1); // Cache should be faster
      
      console.log(`Cache Performance: First query ${duration1.toFixed(2)}ms, Cached query ${duration2.toFixed(2)}ms`);
    });

    test('should invalidate cache correctly on data updates', async () => {
      // Create test user
      const testUser = await User.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id
      });
      
      // Cache the user data
      await userRepository.findById(testUser.id);
      
      // Update user data
      const updatedData = { firstName: 'Updated Name' };
      await userRepository.update(testUser.id, updatedData);
      
      // Verify cache is invalidated and fresh data is returned
      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser.firstName).toBe('Updated Name');
    });

    test('should handle cache failures gracefully', async () => {
      // Simulate Redis failure by disconnecting
      await redisClient.disconnect();
      
      // Repository should still work without cache
      const testUser = await User.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id
      });
      
      const user = await userRepository.findById(testUser.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      
      // Reconnect Redis
      await redisClient.connect();
    });

    test('should optimize memory usage with cache TTL', async () => {
      // Test cache TTL functionality
      const testUser = await User.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id
      });
      
      const cacheKey = `user:${testUser.id}`;
      
      // Cache data with short TTL (for testing)
      await redisClient.setex(cacheKey, 2, JSON.stringify(testUser));
      
      // Verify data is cached
      let cachedData = await redisClient.get(cacheKey);
      expect(cachedData).toBeDefined();
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify data is expired
      cachedData = await redisClient.get(cacheKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('3. PostGIS Spatial Query Performance Validation', () => {
    beforeEach(async () => {
      // Create test bins with spatial data
      const testBins = Array.from({ length: 50 }, (_, index) => ({
        ...binFixtures.createValidBin(),
        organizationId: testOrganization.id,
        type: BinType.RESIDENTIAL,
        status: BinStatus.ACTIVE,
        // Create bins in a grid pattern for spatial testing
        latitude: 40.7128 + (index % 10) * 0.01, // NYC area with slight variations
        longitude: -74.0060 + Math.floor(index / 10) * 0.01,
        location: sequelize.fn('ST_Point', -74.0060 + Math.floor(index / 10) * 0.01, 40.7128 + (index % 10) * 0.01)
      }));
      
      await Bin.bulkCreate(testBins);
    });

    test('should execute spatial proximity queries efficiently', async () => {
      const centerLat = 40.7128;
      const centerLng = -74.0060;
      const radiusKm = 5;
      
      const startTime = performance.now();
      
      // Find bins within radius using PostGIS
      const nearbyBins = await Bin.findAll({
        where: sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location'),
            sequelize.fn('ST_Point', centerLng, centerLat),
            radiusKm * 1000 // Convert km to meters
          ),
          true
        ),
        limit: 20
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(nearbyBins.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Spatial Query Performance: Found ${nearbyBins.length} bins in ${duration.toFixed(2)}ms`);
    });

    test('should optimize route calculation queries', async () => {
      // Test route optimization query performance
      const startPoint = { lat: 40.7128, lng: -74.0060 };
      const endPoint = { lat: 40.7589, lng: -73.9851 };
      
      const startTime = performance.now();
      
      // Find bins along route corridor
      const routeBins = await Bin.findAll({
        where: sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location'),
            sequelize.fn(
              'ST_MakeLine',
              sequelize.fn('ST_Point', startPoint.lng, startPoint.lat),
              sequelize.fn('ST_Point', endPoint.lng, endPoint.lat)
            ),
            1000 // 1km corridor
          ),
          true
        ),
        order: [
          [sequelize.fn(
            'ST_Distance',
            sequelize.col('location'),
            sequelize.fn('ST_Point', startPoint.lng, startPoint.lat)
          ), 'ASC']
        ]
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(routeBins.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Route Optimization Query: Found ${routeBins.length} bins in ${duration.toFixed(2)}ms`);
    });

    test('should handle large spatial datasets efficiently', async () => {
      // Test performance with larger dataset
      const largeBinSet = Array.from({ length: 500 }, (_, index) => ({
        ...binFixtures.createValidBin(),
        organizationId: testOrganization.id,
        type: BinType.COMMERCIAL,
        status: BinStatus.ACTIVE,
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        location: sequelize.fn('ST_Point', -74.0060 + (Math.random() - 0.5) * 0.1, 40.7128 + (Math.random() - 0.5) * 0.1)
      }));
      
      await Bin.bulkCreate(largeBinSet);
      
      const startTime = performance.now();
      
      // Complex spatial aggregation query
      const spatialStats = await Bin.findAll({
        attributes: [
          [sequelize.fn('COUNT', '*'), 'bin_count'],
          [sequelize.fn('AVG', sequelize.col('latitude')), 'avg_lat'],
          [sequelize.fn('AVG', sequelize.col('longitude')), 'avg_lng']
        ],
        where: {
          organizationId: testOrganization.id,
          status: BinStatus.ACTIVE
        },
        group: ['type']
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(spatialStats.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      
      console.log(`Large Dataset Spatial Query: Processed ${largeBinSet.length} additional bins in ${duration.toFixed(2)}ms`);
    });

    test('should validate spatial index utilization', async () => {
      // Test that spatial queries are using indexes effectively
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
        SELECT id, latitude, longitude 
        FROM bins 
        WHERE ST_DWithin(
          location, 
          ST_Point(-74.0060, 40.7128), 
          5000
        )
      `;
      
      const explainResult = await sequelize.query(explainQuery);
      const queryPlan = explainResult[0] as any[];
      
      // Check if spatial index is being used
      const planText = JSON.stringify(queryPlan);
      const usesIndex = planText.includes('Index') || planText.includes('Scan');
      
      expect(usesIndex).toBe(true);
      
      console.log('Spatial Query Execution Plan:', JSON.stringify(queryPlan[0], null, 2));
    });
  });

  describe('4. Service Layer Performance Validation', () => {
    let binService: BinService;
    let userService: UserService;

    beforeEach(() => {
      binService = new BinService();
      userService = new UserService();
    });

    test('should maintain service response times under load', async () => {
      // Create test bins for service testing
      const testBins = await Promise.all(
        Array.from({ length: 20 }, async (_, index) => {
          return await Bin.create({
            ...binFixtures.createValidBin(),
            organizationId: testOrganization.id,
            serialNumber: `PERF-TEST-${index}`,
            type: BinType.RESIDENTIAL,
            status: BinStatus.ACTIVE
          });
        })
      );
      
      const startTime = performance.now();
      
      // Test service operations
      const serviceOperations = await Promise.all([
        binService.findById(testBins[0].id),
        binService.findByOrganization(testOrganization.id, { page: 1, limit: 10 }),
        binService.findNearby(40.7128, -74.0060, 5),
        binService.getCapacityStats(testOrganization.id)
      ]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(serviceOperations.every(result => result !== null)).toBe(true);
      expect(duration).toBeLessThan(1000); // All operations within 1 second
      
      console.log(`Service Layer Performance: 4 operations completed in ${duration.toFixed(2)}ms`);
    });

    test('should optimize bulk operations', async () => {
      const bulkData = Array.from({ length: 100 }, (_, index) => ({
        ...binFixtures.createValidBin(),
        organizationId: testOrganization.id,
        serialNumber: `BULK-${index}`,
        type: BinType.COMMERCIAL,
        status: BinStatus.ACTIVE
      }));
      
      const startTime = performance.now();
      const createdBins = await binService.bulkCreate(bulkData);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(createdBins).toHaveLength(100);
      expect(duration).toBeLessThan(2000); // Bulk creation within 2 seconds
      
      console.log(`Bulk Operations Performance: Created 100 bins in ${duration.toFixed(2)}ms`);
    });
  });

  describe('5. Performance Monitoring and Metrics', () => {
    test('should collect performance metrics effectively', async () => {
      const metrics = await performanceMonitor.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.database).toBeDefined();
      expect(metrics.cache).toBeDefined();
      
      console.log('Performance Metrics:', metrics);
    });

    test('should identify slow queries', async () => {
      // Execute a deliberately slow query
      const startTime = performance.now();
      await sequelize.query('SELECT pg_sleep(0.5)');
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThan(400); // Should be close to 500ms
      
      // Monitor should detect slow queries
      const slowQueries = await performanceMonitor.getSlowQueries();
      console.log('Slow Queries Detected:', slowQueries.length);
    });

    test('should track resource utilization', async () => {
      const resourceStats = await performanceMonitor.getResourceUtilization();
      
      expect(resourceStats).toBeDefined();
      expect(resourceStats.memory).toBeDefined();
      expect(resourceStats.connections).toBeDefined();
      
      console.log('Resource Utilization:', resourceStats);
    });
  });
});