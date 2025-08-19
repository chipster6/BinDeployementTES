/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - VECTOR API INTEGRATION TESTS
 * ============================================================================
 *
 * PHASE 1 VALIDATION MISSION: Vector Intelligence API Integration Testing
 * 
 * VALIDATION SCOPE:
 * - All 5 Vector API endpoints (/search, /ingest, /insights, /health, /deploy)
 * - JWT authentication and RBAC authorization
 * - Request validation and rate limiting
 * - Error handling and response formatting
 * - Performance validation (<200ms response times)
 *
 * Created by: QA Engineer / Testing Agent
 * Date: 2025-08-18
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import request from 'supertest';
import express from 'express';
import { Express } from 'express';
import vectorRoutes from '@/routes/api/ml/vector';
import { authenticateJWT, authorize } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';
import { ResponseHelper } from '@/utils/ResponseHelper';
import VectorIntelligenceService from '@/services/VectorIntelligenceService';

// Mock dependencies
jest.mock('@/services/VectorIntelligenceService');
jest.mock('@/middleware/auth');
jest.mock('@/middleware/rateLimiter');
jest.mock('@/utils/ResponseHelper');

describe('Vector API Integration Tests', () => {
  let app: Express;
  let mockVectorService: jest.Mocked<VectorIntelligenceService>;

  // Mock user objects for authentication testing
  const mockAdminUser = {
    id: 'admin-001',
    email: 'admin@wastemanagement.com',
    role: 'admin',
    permissions: ['vector:read', 'vector:write', 'vector:deploy']
  };

  const mockOperationsUser = {
    id: 'ops-001',
    email: 'ops@wastemanagement.com',
    role: 'operations_manager',
    permissions: ['vector:read', 'vector:write']
  };

  const mockBasicUser = {
    id: 'user-001',
    email: 'user@wastemanagement.com',
    role: 'user',
    permissions: ['vector:read']
  };

  const mockOperationalData = [
    {
      id: 'test-bin-001',
      type: 'bin',
      title: 'Overflowing waste bin in downtown area',
      description: 'Large commercial waste bin showing signs of overflow during peak business hours',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St, New York, NY'
      },
      timestamp: new Date('2025-08-18T10:00:00Z'),
      metadata: {
        binType: 'commercial',
        capacity: '500L'
      },
      businessContext: {
        priority: 'high',
        category: 'waste_overflow',
        impact: 'customer'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
      req.user = mockAdminUser; // Default to admin user
      next();
    });

    // Mock authorization middleware
    (authorize as jest.Mock).mockImplementation((roles: string[]) => {
      return (req: any, res: any, next: any) => {
        if (roles.includes(req.user?.role)) {
          next();
        } else {
          res.status(403).json({ error: 'Insufficient permissions' });
        }
      };
    });

    // Mock rate limiter
    (rateLimiter as jest.Mock).mockImplementation(() => {
      return (req: any, res: any, next: any) => next();
    });

    // Mock ResponseHelper
    (ResponseHelper.success as jest.Mock).mockImplementation((res, data, message, meta) => {
      return res.status(200).json({
        success: true,
        data,
        message,
        meta
      });
    });

    (ResponseHelper.error as jest.Mock).mockImplementation((res, message, status, errors) => {
      return res.status(status).json({
        success: false,
        message,
        errors
      });
    });

    // Mock VectorIntelligenceService
    mockVectorService = {
      performSemanticSearch: jest.fn(),
      vectorizeOperationalData: jest.fn(),
      generateOperationalInsights: jest.fn(),
      getVectorIntelligenceHealth: jest.fn(),
      deployWeaviateConnection: jest.fn()
    } as any;

    (VectorIntelligenceService as jest.Mock).mockImplementation(() => mockVectorService);

    // Mount routes
    app.use('/api/ml/vector', vectorRoutes);
  });

  describe('POST /api/ml/vector/search', () => {
    const validSearchPayload = {
      query: 'overflowing bins in commercial areas',
      limit: 10,
      threshold: 0.7,
      includeMetadata: true
    };

    it('should perform semantic search successfully with valid payload', async () => {
      const mockSearchResults = [
        {
          id: 'test-bin-001',
          score: 0.85,
          data: mockOperationalData[0],
          insights: ['Critical priority item requiring immediate attention']
        }
      ];

      mockVectorService.performSemanticSearch.mockResolvedValue({
        success: true,
        data: mockSearchResults,
        message: 'Search completed successfully',
        meta: { resultCount: 1, cached: false }
      });

      const response = await request(app)
        .post('/api/ml/vector/search')
        .send(validSearchPayload)
        .expect(200);

      expect(mockVectorService.performSemanticSearch).toHaveBeenCalledWith(validSearchPayload);
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        mockSearchResults,
        'Search completed successfully',
        expect.objectContaining({
          resultCount: 1,
          query: validSearchPayload.query,
          cached: false,
          performance: expect.objectContaining({
            responseTime: expect.any(Number)
          })
        })
      );
    });

    it('should validate search query parameters', async () => {
      const invalidPayloads = [
        { query: '' }, // Empty query
        { query: 'ab' }, // Too short (minimum 3 characters)
        { query: 'a'.repeat(501) }, // Too long (maximum 500 characters)
        { limit: 0 }, // Invalid limit
        { limit: 101 }, // Limit too high
        { threshold: -0.1 }, // Invalid threshold
        { threshold: 1.1 } // Invalid threshold
      ];

      for (const payload of invalidPayloads) {
        await request(app)
          .post('/api/ml/vector/search')
          .send({ query: 'valid query', ...payload })
          .expect(400);
      }
    });

    it('should enforce authentication', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .post('/api/ml/vector/search')
        .send(validSearchPayload)
        .expect(401);
    });

    it('should enforce role-based authorization', async () => {
      // Test with different user roles
      const testCases = [
        { user: mockAdminUser, expectedStatus: 200 },
        { user: mockOperationsUser, expectedStatus: 200 },
        { user: mockBasicUser, expectedStatus: 200 },
        { user: { ...mockBasicUser, role: 'unauthorized_role' }, expectedStatus: 403 }
      ];

      for (const testCase of testCases) {
        (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
          req.user = testCase.user;
          next();
        });

        if (testCase.expectedStatus === 200) {
          mockVectorService.performSemanticSearch.mockResolvedValue({
            success: true,
            data: [],
            message: 'Success'
          });
        }

        await request(app)
          .post('/api/ml/vector/search')
          .send(validSearchPayload)
          .expect(testCase.expectedStatus);
      }
    });

    it('should handle service failures gracefully', async () => {
      mockVectorService.performSemanticSearch.mockResolvedValue({
        success: false,
        message: 'Search failed',
        errors: ['Weaviate connection error']
      });

      await request(app)
        .post('/api/ml/vector/search')
        .send(validSearchPayload)
        .expect(400);

      expect(ResponseHelper.error).toHaveBeenCalledWith(
        expect.anything(),
        'Search failed',
        400,
        ['Weaviate connection error']
      );
    });

    it('should include performance metrics in response', async () => {
      mockVectorService.performSemanticSearch.mockResolvedValue({
        success: true,
        data: [],
        message: 'Success',
        meta: { cached: true }
      });

      await request(app)
        .post('/api/ml/vector/search')
        .send(validSearchPayload);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          performance: expect.objectContaining({
            responseTime: expect.any(Number),
            threshold: validSearchPayload.threshold
          })
        })
      );
    });
  });

  describe('POST /api/ml/vector/ingest', () => {
    const validIngestPayload = {
      data: mockOperationalData
    };

    it('should ingest operational data successfully', async () => {
      mockVectorService.vectorizeOperationalData.mockResolvedValue({
        success: true,
        data: {
          totalProcessed: 1,
          batches: 1,
          results: [{ successful: 1, errors: 0 }]
        },
        message: 'Data vectorized successfully'
      });

      const response = await request(app)
        .post('/api/ml/vector/ingest')
        .send(validIngestPayload)
        .expect(200);

      expect(mockVectorService.vectorizeOperationalData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...mockOperationalData[0],
            timestamp: expect.any(Date)
          })
        ])
      );
    });

    it('should validate operational data structure', async () => {
      const invalidPayloads = [
        { data: [] }, // Empty array
        { data: Array(1001).fill(mockOperationalData[0]) }, // Too many items
        { 
          data: [{
            id: 'test',
            type: 'invalid_type', // Invalid type
            title: 'Valid title',
            description: 'Valid description',
            timestamp: new Date(),
            businessContext: {
              priority: 'high',
              category: 'test',
              impact: 'operational'
            }
          }]
        }
      ];

      for (const payload of invalidPayloads) {
        await request(app)
          .post('/api/ml/vector/ingest')
          .send(payload)
          .expect(400);
      }
    });

    it('should restrict access to admin and operations roles only', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        req.user = mockBasicUser; // Basic user should not have access
        next();
      });

      await request(app)
        .post('/api/ml/vector/ingest')
        .send(validIngestPayload)
        .expect(403);
    });

    it('should include performance metrics for ingestion', async () => {
      mockVectorService.vectorizeOperationalData.mockResolvedValue({
        success: true,
        data: { totalProcessed: 1 },
        message: 'Success'
      });

      await request(app)
        .post('/api/ml/vector/ingest')
        .send(validIngestPayload);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ingestionId: expect.stringMatching(/^ing_\d+$/),
          performance: expect.objectContaining({
            responseTime: expect.any(Number),
            itemsPerSecond: expect.any(Number)
          })
        })
      );
    });
  });

  describe('GET /api/ml/vector/insights', () => {
    it('should generate operational insights successfully', async () => {
      const mockInsights = {
        patterns: [
          {
            pattern: 'Recurring bin overflow issues',
            confidence: 0.85,
            occurrences: 23,
            businessImpact: 'Customer satisfaction risk'
          }
        ],
        recommendations: [
          {
            title: 'Optimize bin placement',
            description: 'Deploy additional bins in hotspots',
            priority: 'high',
            estimatedImpact: '15% reduction in overflow incidents'
          }
        ],
        trends: [
          {
            trend: 'Service requests increasing',
            direction: 'increasing',
            significance: 0.78
          }
        ]
      };

      mockVectorService.generateOperationalInsights.mockResolvedValue({
        success: true,
        data: mockInsights,
        message: 'Insights generated successfully',
        meta: { cached: false }
      });

      const response = await request(app)
        .get('/api/ml/vector/insights')
        .query({ timeframe: '7d' })
        .expect(200);

      expect(mockVectorService.generateOperationalInsights).toHaveBeenCalledWith('7d');
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        mockInsights,
        'Insights generated successfully',
        expect.objectContaining({
          timeframe: '7d',
          cached: false,
          generatedAt: expect.any(Date)
        })
      );
    });

    it('should validate timeframe parameter', async () => {
      const invalidTimeframes = ['1h', '365d', 'invalid'];

      for (const timeframe of invalidTimeframes) {
        await request(app)
          .get('/api/ml/vector/insights')
          .query({ timeframe })
          .expect(400);
      }
    });

    it('should restrict access to management roles', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        req.user = mockBasicUser; // Basic user should not have access to insights
        next();
      });

      await request(app)
        .get('/api/ml/vector/insights')
        .expect(403);
    });
  });

  describe('GET /api/ml/vector/health', () => {
    it('should return comprehensive health status', async () => {
      const mockHealthData = {
        weaviateReady: true,
        version: '1.0.0',
        deployment: {
          deployed: true,
          timestamp: new Date(),
          schemaVersion: '1.0.0'
        },
        featureFlags: {
          vectorSearch: true,
          routeOptimizationML: false
        },
        performance: {
          vectorCacheTTL: 3600,
          searchCacheTTL: 1800,
          monitoring: true
        }
      };

      mockVectorService.getVectorIntelligenceHealth.mockResolvedValue({
        success: true,
        data: mockHealthData,
        message: 'Health check completed'
      });

      const response = await request(app)
        .get('/api/ml/vector/health')
        .expect(200);

      expect(mockVectorService.getVectorIntelligenceHealth).toHaveBeenCalled();
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        mockHealthData,
        'Health check completed',
        expect.objectContaining({
          checkedAt: expect.any(Date),
          performance: expect.objectContaining({
            responseTime: expect.any(Number)
          })
        })
      );
    });

    it('should handle health check failures', async () => {
      mockVectorService.getVectorIntelligenceHealth.mockResolvedValue({
        success: false,
        message: 'Weaviate connection failed',
        errors: ['Connection timeout']
      });

      await request(app)
        .get('/api/ml/vector/health')
        .expect(503);

      expect(ResponseHelper.error).toHaveBeenCalledWith(
        expect.anything(),
        'Weaviate connection failed',
        503,
        ['Connection timeout']
      );
    });

    it('should restrict access to admin and operations roles', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        req.user = mockBasicUser;
        next();
      });

      await request(app)
        .get('/api/ml/vector/health')
        .expect(403);
    });
  });

  describe('POST /api/ml/vector/deploy', () => {
    it('should deploy Weaviate connection successfully', async () => {
      mockVectorService.deployWeaviateConnection.mockResolvedValue({
        success: true,
        data: {
          deployed: true,
          schemaExists: false,
          className: 'WasteManagementOperations',
          timestamp: new Date()
        },
        message: 'Deployment successful'
      });

      const response = await request(app)
        .post('/api/ml/vector/deploy')
        .expect(200);

      expect(mockVectorService.deployWeaviateConnection).toHaveBeenCalled();
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deployed: true,
          schemaExists: false,
          className: 'WasteManagementOperations'
        }),
        'Deployment successful',
        expect.objectContaining({
          deployedAt: expect.any(Date),
          deployedBy: mockAdminUser.id,
          performance: expect.objectContaining({
            responseTime: expect.any(Number)
          })
        })
      );
    });

    it('should handle deployment failures', async () => {
      mockVectorService.deployWeaviateConnection.mockResolvedValue({
        success: false,
        message: 'Deployment failed',
        errors: ['Weaviate not ready']
      });

      await request(app)
        .post('/api/ml/vector/deploy')
        .expect(500);

      expect(ResponseHelper.error).toHaveBeenCalledWith(
        expect.anything(),
        'Deployment failed',
        500,
        ['Weaviate not ready']
      );
    });

    it('should restrict access to admin users only', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        req.user = mockOperationsUser; // Operations user should not have deploy access
        next();
      });

      await request(app)
        .post('/api/ml/vector/deploy')
        .expect(403);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete all operations within 200ms', async () => {
      const endpoints = [
        { method: 'post', path: '/api/ml/vector/search', payload: { query: 'test' } },
        { method: 'post', path: '/api/ml/vector/ingest', payload: { data: mockOperationalData } },
        { method: 'get', path: '/api/ml/vector/insights' },
        { method: 'get', path: '/api/ml/vector/health' },
        { method: 'post', path: '/api/ml/vector/deploy' }
      ];

      for (const endpoint of endpoints) {
        // Mock successful responses for all services
        mockVectorService.performSemanticSearch.mockResolvedValue({ success: true, data: [] });
        mockVectorService.vectorizeOperationalData.mockResolvedValue({ success: true, data: {} });
        mockVectorService.generateOperationalInsights.mockResolvedValue({ success: true, data: {} });
        mockVectorService.getVectorIntelligenceHealth.mockResolvedValue({ success: true, data: {} });
        mockVectorService.deployWeaviateConnection.mockResolvedValue({ success: true, data: {} });

        const startTime = Date.now();
        
        let response;
        if (endpoint.method === 'post') {
          response = await request(app)
            .post(endpoint.path)
            .send(endpoint.payload);
        } else {
          response = await request(app)
            .get(endpoint.path);
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(200);
        expect(response.status).toBeLessThan(400);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits correctly', async () => {
      // Mock rate limiter to trigger on excessive requests
      let requestCount = 0;
      (rateLimiter as jest.Mock).mockImplementation(() => {
        return (req: any, res: any, next: any) => {
          requestCount++;
          if (requestCount > 100) { // Simulate search rate limit
            return res.status(429).json({
              error: 'Too many search requests, please try again later'
            });
          }
          next();
        };
      });

      mockVectorService.performSemanticSearch.mockResolvedValue({
        success: true,
        data: []
      });

      // Simulate 105 requests (should trigger rate limit)
      for (let i = 0; i < 105; i++) {
        const response = await request(app)
          .post('/api/ml/vector/search')
          .send({ query: 'test query' });

        if (i < 100) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      await request(app)
        .post('/api/ml/vector/search')
        .send('invalid json')
        .expect(400);
    });

    it('should handle service timeouts gracefully', async () => {
      mockVectorService.performSemanticSearch.mockRejectedValue(new Error('Timeout'));

      await request(app)
        .post('/api/ml/vector/search')
        .send({ query: 'test' })
        .expect(500);
    });

    it('should sanitize error messages for security', async () => {
      mockVectorService.performSemanticSearch.mockRejectedValue(
        new Error('Database password: secret123')
      );

      const response = await request(app)
        .post('/api/ml/vector/search')
        .send({ query: 'test' });

      // Should not expose sensitive information
      expect(response.body.message).not.toContain('secret123');
    });
  });
});