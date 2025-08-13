/**
 * ============================================================================
 * INTEGRATION VALIDATION TEST SUITE
 * ============================================================================
 * 
 * Critical integration tests to validate that Security Agent and 
 * Performance-Optimization-Specialist deployments work together without conflicts.
 * Ensures production readiness for combined parallel deployments.
 * 
 * Real-time validation during parallel agent coordination
 * For $2M+ MRR waste management system production deployment.
 * 
 * Created by: Testing-Agent (Validation Mission)
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';

// Import security components
import * as encryptionFixed from '@/utils/encryption_fixed';
import { 
  authenticateToken, 
  generateToken, 
  generateRefreshToken 
} from '@/middleware/auth';
import { SessionService } from '@/services/SessionService';

// Import performance components
import { sequelize, getConnectionPoolStats } from '@/config/database';
import { redisClient } from '@/config/redis';
import { BinRepository } from '@/repositories/BinRepository';
import { UserRepository } from '@/repositories/UserRepository';

// Import models
import { User, UserRole, UserStatus } from '@/models/User';
import { Bin, BinType, BinStatus } from '@/models/Bin';
import { Organization } from '@/models/Organization';
import { UserSession, SessionStatus } from '@/models/UserSession';

// Test utilities
import { DatabaseTestHelper } from '@tests/helpers/DatabaseTestHelper';
import { userFixtures } from '@tests/fixtures/UserFixtures';
import { binFixtures } from '@tests/fixtures/BinFixtures';

describe('Integration Validation Suite - Security + Performance', () => {
  let testDbHelper: DatabaseTestHelper;
  let testOrganization: any;
  let testUser: any;
  let userRepository: UserRepository;
  let binRepository: BinRepository;

  beforeAll(async () => {
    // Initialize test environment
    testDbHelper = new DatabaseTestHelper();
    await testDbHelper.setup();
    
    userRepository = new UserRepository();
    binRepository = new BinRepository();
    
    // Create test organization
    testOrganization = await Organization.create({
      name: 'Integration Test Org',
      type: 'COMMERCIAL',
      email: 'integration@test.com',
      phone: '+1234567890',
      address: '123 Integration St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      isActive: true
    });
    
    // Create test user
    testUser = await User.create({
      ...userFixtures.createValidUser(),
      organizationId: testOrganization.id,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    });
  });

  afterAll(async () => {
    await testDbHelper.cleanup();
  });

  beforeEach(async () => {
    // Clear cache and sessions
    await redisClient.flushdb();
    await UserSession.destroy({ where: {}, force: true });
  });

  describe('1. Security + Database Performance Integration', () => {
    test('should maintain encryption performance under optimized connection pool', async () => {
      const testData = 'Sensitive financial data for performance testing';
      const iterations = 50;
      
      // Get baseline connection pool stats
      const initialPoolStats = await getConnectionPoolStats();
      console.log('Initial Pool Stats:', initialPoolStats.pool);
      
      const startTime = performance.now();
      
      // Perform concurrent encryption operations with database queries
      const operations = Array.from({ length: iterations }, async (_, index) => {
        // Encrypt sensitive data
        const encrypted = await encryptionFixed.encryptSensitiveData(`${testData} ${index}`);
        
        // Store in database with encryption
        const user = await User.create({
          ...userFixtures.createValidUser(),
          email: `integration-${index}@test.com`,
          organizationId: testOrganization.id,
          // Simulate encrypted field storage
          notes: encrypted
        });
        
        // Decrypt and verify
        const decrypted = await encryptionFixed.decryptSensitiveData(user.notes);
        
        return { encrypted, decrypted, userId: user.id };
      });
      
      const results = await Promise.all(operations);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(iterations);
      expect(results.every(result => result.decrypted.startsWith(testData))).toBe(true);
      
      // Performance threshold: should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      
      // Check connection pool health after operations
      const finalPoolStats = await getConnectionPoolStats();
      expect(finalPoolStats.status).not.toBe('critical');
      
      console.log(`Security + DB Integration: ${iterations} operations in ${duration.toFixed(2)}ms`);
      console.log('Final Pool Stats:', finalPoolStats.pool);
    });

    test('should handle authentication with cached user data efficiently', async () => {
      // Create user and cache through repository
      const cachedUser = await userRepository.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id,
        role: UserRole.CUSTOMER
      });
      
      // Generate token for user
      const token = generateToken({
        id: cachedUser.id,
        email: cachedUser.email,
        role: cachedUser.role
      });
      
      const startTime = performance.now();
      
      // Perform multiple authentication checks (should use cache)
      const authChecks = Array.from({ length: 20 }, async () => {
        const mockReq = {
          headers: { authorization: `Bearer ${token}` },
          ip: '127.0.0.1',
          cookies: {}
        } as any;
        
        const mockRes = {
          status: jest.fn(() => mockRes),
          json: jest.fn()
        } as any;
        
        const mockNext = jest.fn();
        
        await authenticateToken(mockReq, mockRes, mockNext);
        
        return mockNext.mock.calls.length > 0; // True if authentication succeeded
      });
      
      const authResults = await Promise.all(authChecks);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // All authentications should succeed
      expect(authResults.every(result => result === true)).toBe(true);
      
      // Should be fast due to caching
      expect(duration).toBeLessThan(1000);
      
      console.log(`Authentication with Cache: 20 auth checks in ${duration.toFixed(2)}ms`);
    });
  });

  describe('2. Session Management + Performance Integration', () => {
    test('should create and manage sessions efficiently under load', async () => {
      const sessionCount = 30;
      const startTime = performance.now();
      
      // Create multiple sessions concurrently
      const sessionOperations = Array.from({ length: sessionCount }, async (_, index) => {
        const sessionUser = await User.create({
          ...userFixtures.createValidUser(),
          email: `session-test-${index}@test.com`,
          organizationId: testOrganization.id,
          role: UserRole.CUSTOMER
        });
        
        // Create session with encryption
        const session = await SessionService.createSession({
          userId: sessionUser.id,
          userRole: sessionUser.role,
          ipAddress: '127.0.0.1',
          userAgent: 'Integration Test Browser',
          mfaVerified: true
        });
        
        // Validate session integrity
        const isValid = await SessionService.validateSessionIntegrity(session.sessionToken);
        
        return { session, isValid, userId: sessionUser.id };
      });
      
      const sessionResults = await Promise.all(sessionOperations);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // All sessions should be created and valid
      expect(sessionResults).toHaveLength(sessionCount);
      expect(sessionResults.every(result => result.isValid === true)).toBe(true);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000);
      
      // Check database and Redis performance
      const poolStats = await getConnectionPoolStats();
      expect(poolStats.status).not.toBe('critical');
      
      console.log(`Session Management Integration: ${sessionCount} sessions in ${duration.toFixed(2)}ms`);
    });

    test('should handle session refresh under performance optimization', async () => {
      // Create initial session
      const sessionData = await SessionService.createSession({
        userId: testUser.id,
        userRole: testUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'Refresh Test Browser',
        mfaVerified: true
      });
      
      const refreshCount = 25;
      const startTime = performance.now();
      
      // Perform multiple session refreshes
      const refreshOperations = Array.from({ length: refreshCount }, async () => {
        const refreshed = await SessionService.refreshSession(sessionData.sessionToken);
        return refreshed;
      });
      
      const refreshResults = await Promise.all(refreshOperations);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // All refreshes should succeed
      expect(refreshResults.every(result => result === true)).toBe(true);
      
      // Should be fast due to optimizations
      expect(duration).toBeLessThan(1000);
      
      console.log(`Session Refresh Integration: ${refreshCount} refreshes in ${duration.toFixed(2)}ms`);
    });
  });

  describe('3. Spatial Queries + Security Integration', () => {
    test('should handle encrypted spatial data efficiently', async () => {
      // Create bins with encrypted metadata
      const binCount = 40;
      const binsData = Array.from({ length: binCount }, (_, index) => ({
        ...binFixtures.createValidBin(),
        organizationId: testOrganization.id,
        serialNumber: `SPATIAL-${index}`,
        type: BinType.COMMERCIAL,
        status: BinStatus.ACTIVE,
        latitude: 40.7128 + (index % 10) * 0.01,
        longitude: -74.0060 + Math.floor(index / 10) * 0.01,
        location: sequelize.fn('ST_Point', -74.0060 + Math.floor(index / 10) * 0.01, 40.7128 + (index % 10) * 0.01)
      }));
      
      const startTime = performance.now();
      
      // Create bins with concurrent encryption of metadata
      const binOperations = binsData.map(async (binData) => {
        // Encrypt sensitive bin metadata
        const encryptedNotes = await encryptionFixed.encryptSensitiveData(
          `Sensitive bin data: Customer info, route details`
        );
        
        return await Bin.create({
          ...binData,
          notes: encryptedNotes
        });
      });
      
      const createdBins = await Promise.all(binOperations);
      
      // Perform spatial query with encrypted data
      const spatialQuery = await Bin.findAll({
        where: sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.col('location'),
            sequelize.fn('ST_Point', -74.0060, 40.7128),
            5000 // 5km radius
          ),
          true
        ),
        limit: 20
      });
      
      // Decrypt metadata for found bins
      const decryptedResults = await Promise.all(
        spatialQuery.map(async (bin) => {
          const decryptedNotes = await encryptionFixed.decryptSensitiveData(bin.notes);
          return { bin, decryptedNotes };
        })
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(createdBins).toHaveLength(binCount);
      expect(spatialQuery.length).toBeGreaterThan(0);
      expect(decryptedResults.every(result => result.decryptedNotes.includes('Sensitive bin data'))).toBe(true);
      
      // Should complete within reasonable time despite encryption overhead
      expect(duration).toBeLessThan(4000);
      
      console.log(`Spatial + Security Integration: ${binCount} bins with encryption in ${duration.toFixed(2)}ms`);
    });
  });

  describe('4. Repository Pattern + Security Integration', () => {
    test('should cache encrypted data efficiently', async () => {
      const testData = 'Highly sensitive customer information for caching test';
      
      // Create user with encrypted data using repository
      const encryptedData = await encryptionFixed.encryptSensitiveData(testData);
      
      const userData = {
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id,
        notes: encryptedData
      };
      
      const startTime = performance.now();
      
      // First call - should cache
      const user1 = await userRepository.create(userData);
      const foundUser1 = await userRepository.findById(user1.id);
      
      // Decrypt cached data
      const decrypted1 = await encryptionFixed.decryptSensitiveData(foundUser1.notes);
      
      // Second call - should use cache
      const foundUser2 = await userRepository.findById(user1.id);
      const decrypted2 = await encryptionFixed.decryptSensitiveData(foundUser2.notes);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
      expect(foundUser1.id).toBe(foundUser2.id);
      
      // Should be efficient with caching
      expect(duration).toBeLessThan(500);
      
      console.log(`Repository + Security Integration: Cached encrypted data in ${duration.toFixed(2)}ms`);
    });

    test('should handle cache invalidation with encrypted updates', async () => {
      // Create user with encrypted data
      const initialData = 'Initial encrypted customer data';
      const updatedData = 'Updated encrypted customer data';
      
      const encryptedInitial = await encryptionFixed.encryptSensitiveData(initialData);
      
      const user = await userRepository.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id,
        notes: encryptedInitial
      });
      
      // Cache user data
      await userRepository.findById(user.id);
      
      // Update with new encrypted data
      const encryptedUpdated = await encryptionFixed.encryptSensitiveData(updatedData);
      
      const startTime = performance.now();
      
      await userRepository.update(user.id, {
        notes: encryptedUpdated
      });
      
      // Retrieve updated data (should invalidate cache)
      const updatedUser = await userRepository.findById(user.id);
      const decryptedUpdated = await encryptionFixed.decryptSensitiveData(updatedUser.notes);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(decryptedUpdated).toBe(updatedData);
      expect(duration).toBeLessThan(300);
      
      console.log(`Cache Invalidation + Security: Update with encryption in ${duration.toFixed(2)}ms`);
    });
  });

  describe('5. End-to-End Integration Validation', () => {
    test('should handle complete user journey with all optimizations', async () => {
      const startTime = performance.now();
      
      // 1. User registration with encryption
      const sensitiveUserData = 'SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111';
      const encryptedUserData = await encryptionFixed.encryptSensitiveData(sensitiveUserData);
      
      const newUser = await userRepository.create({
        ...userFixtures.createValidUser(),
        organizationId: testOrganization.id,
        role: UserRole.CUSTOMER,
        notes: encryptedUserData
      });
      
      // 2. Authentication with JWT
      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      });
      
      // 3. Session creation
      const session = await SessionService.createSession({
        userId: newUser.id,
        userRole: newUser.role,
        ipAddress: '127.0.0.1',
        userAgent: 'E2E Test Browser',
        mfaVerified: true
      });
      
      // 4. Create bins with spatial data and encryption
      const userBins = await Promise.all(
        Array.from({ length: 5 }, async (_, index) => {
          const binMetadata = await encryptionFixed.encryptSensitiveData(
            `Bin ${index} private customer notes and service history`
          );
          
          return await binRepository.create({
            ...binFixtures.createValidBin(),
            organizationId: testOrganization.id,
            serialNumber: `E2E-${newUser.id}-${index}`,
            type: BinType.RESIDENTIAL,
            status: BinStatus.ACTIVE,
            latitude: 40.7128 + index * 0.001,
            longitude: -74.0060 + index * 0.001,
            notes: binMetadata
          });
        })
      );
      
      // 5. Spatial query for user's bins
      const nearbyBins = await Bin.findAll({
        where: {
          organizationId: testOrganization.id,
          [sequelize.Op.and]: [
            sequelize.where(
              sequelize.fn(
                'ST_DWithin',
                sequelize.col('location'),
                sequelize.fn('ST_Point', -74.0060, 40.7128),
                2000
              ),
              true
            )
          ]
        }
      });
      
      // 6. Decrypt bin metadata
      const decryptedBinData = await Promise.all(
        nearbyBins.map(async (bin) => {
          const decryptedNotes = await encryptionFixed.decryptSensitiveData(bin.notes);
          return { binId: bin.id, decryptedNotes };
        })
      );
      
      // 7. Session validation and refresh
      const sessionValid = await SessionService.validateSessionIntegrity(session.sessionToken);
      const sessionRefreshed = await SessionService.refreshSession(session.sessionToken);
      
      // 8. User data retrieval with cache
      const cachedUser = await userRepository.findById(newUser.id);
      const decryptedUserData = await encryptionFixed.decryptSensitiveData(cachedUser.notes);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Validate complete journey
      expect(newUser).toBeDefined();
      expect(token).toBeDefined();
      expect(session).toBeDefined();
      expect(userBins).toHaveLength(5);
      expect(nearbyBins.length).toBeGreaterThan(0);
      expect(decryptedBinData.every(item => item.decryptedNotes.includes('private customer notes'))).toBe(true);
      expect(sessionValid).toBe(true);
      expect(sessionRefreshed).toBe(true);
      expect(decryptedUserData).toBe(sensitiveUserData);
      
      // Performance should be acceptable for complete journey
      expect(duration).toBeLessThan(3000);
      
      // Check system health after complete integration
      const finalPoolStats = await getConnectionPoolStats();
      expect(finalPoolStats.status).not.toBe('critical');
      
      console.log(`Complete E2E Integration: Full user journey in ${duration.toFixed(2)}ms`);
      console.log('System Health After E2E:', {
        poolStatus: finalPoolStats.status,
        poolUtilization: finalPoolStats.pool.utilization,
        operations: 'User registration → Auth → Session → Spatial queries → Encryption/Decryption'
      });
    });
  });
});