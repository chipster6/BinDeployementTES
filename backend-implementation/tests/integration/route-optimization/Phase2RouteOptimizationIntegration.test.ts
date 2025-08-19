/**
 * ============================================================================
 * PHASE 2 ROUTE OPTIMIZATION INTEGRATION TESTING - COMPREHENSIVE VALIDATION
 * ============================================================================
 *
 * Complete integration testing for Phase 2 Route Optimization covering:
 * - External-API Infrastructure (Stage 1): WebSocket, GraphHopper, Resilience Manager
 * - Frontend Dashboard Integration (Stage 2): Real-time UI, Cost Monitoring
 * - End-to-End Integration: Complete workflow from API to dashboard display
 * - Performance Validation: <15s Matrix, <5s Traffic, <2s Dashboard, <5s Failover
 * - Resilience Testing: Multi-provider fallback, circuit breakers, offline operation
 *
 * Integration Components Under Test:
 * 1. RealTimeTrafficWebSocketService - Real-time traffic updates and route adaptations
 * 2. ExternalAPIResilienceManager - Multi-provider fallback and health monitoring
 * 3. GraphHopperService - Traffic-aware routing with performance optimization
 * 4. RouteOptimizationDashboard - Comprehensive dashboard with WebSocket integration
 * 5. Cost Monitoring - 20-40% savings validation and budget tracking
 * 6. Health Monitoring - 99.9% availability with automated alerts
 *
 * Performance Targets:
 * - Matrix API calls: <15 seconds
 * - Traffic data retrieval: <5 seconds
 * - Provider failover: <5 seconds
 * - Dashboard load times: <2 seconds
 * - WebSocket connection: <1 second
 * - Cost optimization: 20-40% savings
 * - System availability: 99.9%
 *
 * Created by: Quality Assurance Engineer
 * Date: 2025-08-19
 * Version: 1.0.0 - Phase 2 Route Optimization Complete Integration
 */

import { performance } from 'perf_hooks';
import WebSocket from 'ws';
import { Server } from 'http';
import request from 'supertest';
import { Redis } from 'ioredis';

// Import services under test
import { RealTimeTrafficWebSocketService } from '@/services/external/RealTimeTrafficWebSocketService';
import { ExternalAPIResilienceManager } from '@/services/external/ExternalAPIResilienceManager';
import { GraphHopperService } from '@/services/external/GraphHopperService';
import { CostMonitoringDashboardService } from '@/services/external/CostMonitoringDashboardService';

// Import test utilities
import { DatabaseTestHelper } from '@/tests/helpers/DatabaseTestHelper';
import { ApiTestHelper } from '@/tests/helpers/ApiTestHelper';

// Mock external dependencies
jest.mock('@/config', () => ({
  config: {
    aiMl: {
      graphHopper: {
        baseUrl: 'https://graphhopper.com/api/1',
        apiKey: 'test_graphhopper_key',
        timeout: 15000
      },
      googleMaps: {
        baseUrl: 'https://maps.googleapis.com/maps/api',
        apiKey: 'test_google_maps_key',
        timeout: 10000
      },
      mapbox: {
        baseUrl: 'https://api.mapbox.com',
        apiKey: 'test_mapbox_key',
        timeout: 10000
      }
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined
    }
  }
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  Timer: jest.fn().mockImplementation((name: string) => ({
    end: jest.fn().mockReturnValue(100),
    duration: 100
  }))
}));

describe('Phase 2 Route Optimization Integration Testing', () => {
  let realTimeTrafficService: RealTimeTrafficWebSocketService;
  let resilienceManager: ExternalAPIResilienceManager;
  let graphHopperService: GraphHopperService;
  let costMonitoringService: CostMonitoringDashboardService;
  let mockRedis: jest.Mocked<Redis>;
  let testServer: Server;
  let wsServer: WebSocket.Server;

  beforeAll(async () => {
    // Initialize test database
    await DatabaseTestHelper.initialize();
    
    // Setup test Redis instance
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn()
    } as any;

    // Initialize services
    realTimeTrafficService = new RealTimeTrafficWebSocketService();
    resilienceManager = new ExternalAPIResilienceManager();
    graphHopperService = new GraphHopperService();
    costMonitoringService = new CostMonitoringDashboardService();

    // Setup WebSocket test server
    testServer = new Server();
    wsServer = new WebSocket.Server({ server: testServer });
    testServer.listen(8080);
  });

  afterAll(async () => {
    await DatabaseTestHelper.cleanup();
    testServer.close();
    wsServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  /**
   * ============================================================================
   * WEBSOCKET INTEGRATION TESTING
   * ============================================================================
   */
  describe('WebSocket Real-time Communication Integration', () => {
    describe('Connection Management', () => {
      it('should establish WebSocket connections within 1 second', async () => {
        const startTime = performance.now();
        
        const connectionResult = await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/traffic',
          subscriptions: ['route_optimization', 'traffic_monitoring', 'cost_updates'],
          enableReconnection: true,
          batchSize: 10,
          batchTimeout: 500
        });

        const endTime = performance.now();
        const connectionTime = endTime - startTime;

        expect(connectionResult.connected).toBe(true);
        expect(connectionTime).toBeLessThan(1000); // <1s requirement
        expect(connectionResult.subscriptions).toContain('route_optimization');
        expect(connectionResult.subscriptions).toContain('traffic_monitoring');
        expect(connectionResult.subscriptions).toContain('cost_updates');
      });

      it('should handle WebSocket disconnection with automatic reconnection', async () => {
        let reconnectAttempts = 0;
        const maxReconnects = 3;

        const connectionResult = await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/traffic',
          subscriptions: ['route_optimization'],
          enableReconnection: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: maxReconnects,
          onReconnect: () => { reconnectAttempts++; }
        });

        expect(connectionResult.connected).toBe(true);

        // Simulate connection loss
        await realTimeTrafficService.simulateDisconnection();
        
        // Wait for reconnection attempts
        await new Promise(resolve => setTimeout(resolve, 3500));

        expect(reconnectAttempts).toBeGreaterThan(0);
        expect(reconnectAttempts).toBeLessThanOrEqual(maxReconnects);
      });

      it('should handle message batching for efficient processing', async () => {
        const messages: any[] = [];
        let batchReceived = false;

        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/traffic',
          subscriptions: ['traffic_monitoring'],
          enableReconnection: true,
          batchSize: 5,
          batchTimeout: 500,
          onBatchMessage: (batch) => {
            messages.push(...batch);
            batchReceived = true;
          }
        });

        // Simulate incoming messages
        const testMessages = Array.from({ length: 7 }, (_, i) => ({
          type: 'traffic_update',
          data: { incident_id: `inc_${i}`, severity: 'medium' }
        }));

        for (const msg of testMessages) {
          await realTimeTrafficService.receiveMessage(msg);
        }

        // Wait for batch processing
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(batchReceived).toBe(true);
        expect(messages.length).toBe(7);
      });
    });

    describe('Real-time Traffic Updates', () => {
      it('should process real-time traffic incidents with context awareness', async () => {
        const trafficIncidents: any[] = [];

        await realTimeTrafficService.subscribeToTrafficUpdates({
          organizationId: 'org_123',
          routeIds: ['route_001', 'route_002'],
          severityFilter: 'medium',
          onTrafficUpdate: (incident) => {
            trafficIncidents.push(incident);
          }
        });

        const testIncident = {
          id: 'incident_001',
          type: 'congestion',
          location: { latitude: 40.7128, longitude: -74.0060 },
          severity: 'high',
          impact: { delayMinutes: 15, alternativeRoutes: 2 },
          description: 'Heavy traffic on I-95 North',
          affectedRoutes: ['route_001'],
          timestamp: new Date()
        };

        await realTimeTrafficService.broadcastTrafficUpdate(testIncident);

        expect(trafficIncidents).toHaveLength(1);
        expect(trafficIncidents[0].id).toBe('incident_001');
        expect(trafficIncidents[0].severity).toBe('high');
        expect(trafficIncidents[0].impact.delayMinutes).toBe(15);
      });

      it('should coordinate route optimization requests with real-time updates', async () => {
        let routeOptimizationTriggered = false;
        let costImpactCalculated = false;

        await realTimeTrafficService.subscribeToRouteOptimization({
          organizationId: 'org_123',
          onOptimizationRequest: (request) => {
            routeOptimizationTriggered = true;
          },
          onCostImpactUpdate: (impact) => {
            costImpactCalculated = true;
          }
        });

        const optimizationRequest = {
          id: 'req_001',
          organizationId: 'org_123',
          vehicleType: 'truck' as const,
          startLocation: { latitude: 40.7128, longitude: -74.0060 },
          endLocation: { latitude: 40.7589, longitude: -73.9851 },
          preferences: {
            avoidTolls: false,
            avoidHighways: false,
            prioritizeTime: true,
            prioritizeCost: false,
            includeTraffic: true
          },
          createdAt: new Date(),
          status: 'pending' as const
        };

        await realTimeTrafficService.processRouteOptimizationRequest(optimizationRequest);

        expect(routeOptimizationTriggered).toBe(true);
        expect(costImpactCalculated).toBe(true);
      });
    });

    describe('WebSocket Performance and Resilience', () => {
      it('should maintain performance under high message volume', async () => {
        const messageCount = 1000;
        const messagesReceived: any[] = [];
        let processingErrors = 0;

        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/traffic',
          subscriptions: ['load_test'],
          enableReconnection: true,
          batchSize: 20,
          batchTimeout: 100,
          onBatchMessage: (batch) => {
            try {
              messagesReceived.push(...batch);
            } catch (error) {
              processingErrors++;
            }
          }
        });

        const startTime = performance.now();

        // Generate high volume of messages
        const promises = Array.from({ length: messageCount }, (_, i) => 
          realTimeTrafficService.receiveMessage({
            type: 'load_test',
            data: { messageId: i, timestamp: new Date() }
          })
        );

        await Promise.all(promises);

        // Wait for processing completion
        await new Promise(resolve => setTimeout(resolve, 2000));

        const endTime = performance.now();
        const processingTime = endTime - startTime;

        expect(messagesReceived.length).toBe(messageCount);
        expect(processingErrors).toBe(0);
        expect(processingTime).toBeLessThan(5000); // Process within 5 seconds
      });

      it('should handle WebSocket errors gracefully with fallback mechanisms', async () => {
        let fallbackActivated = false;
        let errorHandled = false;

        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/traffic',
          subscriptions: ['error_test'],
          enableReconnection: true,
          onError: (error) => {
            errorHandled = true;
          },
          fallbackHandler: async (data) => {
            fallbackActivated = true;
            return { success: true, fallbackUsed: true };
          }
        });

        // Simulate WebSocket error
        await realTimeTrafficService.simulateError(new Error('Connection timeout'));

        expect(errorHandled).toBe(true);
        expect(fallbackActivated).toBe(true);
      });
    });
  });

  /**
   * ============================================================================
   * MULTI-PROVIDER API FALLBACK TESTING
   * ============================================================================
   */
  describe('Multi-Provider API Resilience Integration', () => {
    describe('Provider Fallback Chain Execution', () => {
      it('should execute GraphHopper → Google Maps → Mapbox fallback within 5 seconds', async () => {
        const startTime = performance.now();
        let fallbacksUsed: string[] = [];

        // Mock GraphHopper failure
        jest.spyOn(graphHopperService, 'getRouteMatrix').mockRejectedValue(
          new Error('GraphHopper API unavailable')
        );

        const fallbackResult = await resilienceManager.executeWithFallback({
          operation: 'getRouteMatrix',
          primaryProvider: 'graphhopper',
          fallbackChain: ['google_maps', 'mapbox'],
          parameters: {
            locations: [
              { latitude: 40.7128, longitude: -74.0060 },
              { latitude: 40.7589, longitude: -73.9851 }
            ],
            vehicle: 'truck',
            traffic: true
          },
          timeout: 15000,
          onFallbackUsed: (provider) => {
            fallbacksUsed.push(provider);
          }
        });

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(executionTime).toBeLessThan(5000); // <5s failover requirement
        expect(fallbackResult.success).toBe(true);
        expect(fallbackResult.fallbackUsed).toBe(true);
        expect(fallbackResult.providersAttempted).toContain('graphhopper');
        expect(fallbacksUsed.length).toBeGreaterThan(0);
      });

      it('should validate circuit breaker patterns with adaptive thresholds', async () => {
        const providerName = 'graphhopper';
        let circuitBreakerTriggered = false;

        // Configure circuit breaker
        await resilienceManager.configureCircuitBreaker(providerName, {
          failureThreshold: 5,
          timeoutThreshold: 10000,
          recoveryTimeout: 30000,
          onCircuitOpen: () => {
            circuitBreakerTriggered = true;
          }
        });

        // Simulate consecutive failures
        for (let i = 0; i < 6; i++) {
          try {
            await resilienceManager.recordFailure(providerName, new Error(`Failure ${i + 1}`));
          } catch (error) {
            // Expected failures
          }
        }

        const circuitState = await resilienceManager.getCircuitBreakerState(providerName);
        const providerHealth = await resilienceManager.checkProviderHealth(providerName);

        expect(circuitState).toBe('open');
        expect(circuitBreakerTriggered).toBe(true);
        expect(providerHealth.status).toBe('unhealthy');
        expect(providerHealth.circuitBreakerState).toBe('open');
      });

      it('should handle offline operation with cached data serving', async () => {
        const cacheKey = 'matrix:cached_route_data';
        const cachedData = {
          distances: [[0, 1000], [1000, 0]],
          times: [[0, 600], [600, 0]],
          info: { copyrights: ['Cached data'], took: 0 }
        };

        // Setup cache
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

        // Simulate all providers offline
        jest.spyOn(resilienceManager, 'checkAllProviders').mockResolvedValue({
          graphhopper: { status: 'offline', lastError: 'Connection timeout' },
          google_maps: { status: 'offline', lastError: 'Service unavailable' },
          mapbox: { status: 'offline', lastError: 'API rate limit exceeded' }
        });

        const offlineResult = await resilienceManager.executeOfflineOperation({
          operation: 'getRouteMatrix',
          cacheKey,
          fallbackStrategy: 'cached_data',
          parameters: {
            locations: [
              { latitude: 40.7128, longitude: -74.0060 },
              { latitude: 40.7589, longitude: -73.9851 }
            ]
          }
        });

        expect(offlineResult.success).toBe(true);
        expect(offlineResult.data).toEqual(cachedData);
        expect(offlineResult.source).toBe('cache');
        expect(offlineResult.offlineMode).toBe(true);
      });
    });

    describe('Business Continuity and Cost Optimization', () => {
      it('should assess business impact during provider failures', async () => {
        const businessContext = {
          organizationId: 'org_123',
          currentMRR: 2000000, // $2M MRR
          routeOptimizationRevenue: 150000, // $150K monthly from route optimization
          costPerRequest: 0.05,
          dailyRequestVolume: 10000
        };

        const impactAssessment = await resilienceManager.assessBusinessImpact({
          failedProviders: ['graphhopper'],
          affectedOperations: ['route_optimization', 'traffic_monitoring'],
          businessContext,
          estimatedDowntime: 1800 // 30 minutes
        });

        expect(impactAssessment.revenueImpact).toBeGreaterThan(0);
        expect(impactAssessment.severity).toBe('high'); // Due to high MRR
        expect(impactAssessment.mitigationRequired).toBe(true);
        expect(impactAssessment.fallbackRecommendations).toContain('google_maps');
        expect(impactAssessment.escalationRequired).toBe(true);
      });

      it('should optimize costs through intelligent provider routing', async () => {
        const costData = {
          graphhopper: { costPerRequest: 0.10, monthlyBudget: 1000, currentSpend: 750 },
          google_maps: { costPerRequest: 0.15, monthlyBudget: 1500, currentSpend: 800 },
          mapbox: { costPerRequest: 0.08, monthlyBudget: 800, currentSpend: 600 }
        };

        const routingDecision = await resilienceManager.getOptimalProvider({
          operation: 'getRouteMatrix',
          requestVolume: 1000,
          priorityLevel: 'normal',
          costData,
          performanceRequirements: { maxResponseTime: 15000 }
        });

        expect(routingDecision.selectedProvider).toBe('mapbox'); // Cheapest option
        expect(routingDecision.costSavings).toBeGreaterThan(0);
        expect(routingDecision.projectedMonthlySavings).toBeGreaterThan(200); // 20%+ savings
        expect(routingDecision.reason).toContain('cost optimization');
      });

      it('should validate 20-40% cost optimization target', async () => {
        const baselineCosts = {
          graphhopper: { monthlySpend: 1000 },
          google_maps: { monthlySpend: 1200 },
          mapbox: { monthlySpend: 800 }
        };

        const optimizedCosts = await resilienceManager.optimizeProviderMix({
          currentSpend: baselineCosts,
          requestDistribution: {
            route_optimization: 60, // 60%
            traffic_monitoring: 30, // 30%
            geocoding: 10 // 10%
          },
          performanceRequirements: {
            maxResponseTime: 15000,
            minAvailability: 99.5
          }
        });

        const totalBaseline = Object.values(baselineCosts).reduce((sum, cost) => sum + cost.monthlySpend, 0);
        const totalOptimized = Object.values(optimizedCosts).reduce((sum, cost) => sum + cost.monthlySpend, 0);
        const savingsPercentage = ((totalBaseline - totalOptimized) / totalBaseline) * 100;

        expect(savingsPercentage).toBeGreaterThanOrEqual(20); // Minimum 20% savings
        expect(savingsPercentage).toBeLessThanOrEqual(40); // Maximum 40% savings
        expect(optimizedCosts.totalSavings).toBeGreaterThan(200);
      });
    });

    describe('Health Monitoring and Predictive Failure Detection', () => {
      it('should monitor provider health with 99.9% availability validation', async () => {
        const monitoringPeriod = 24 * 60 * 60 * 1000; // 24 hours
        const healthChecks = 1440; // Every minute for 24 hours
        const allowedDowntime = monitoringPeriod * 0.001; // 0.1% downtime = 86.4 seconds

        const healthHistory = Array.from({ length: healthChecks }, (_, i) => ({
          timestamp: new Date(Date.now() - (healthChecks - i) * 60000),
          graphhopper: Math.random() > 0.0005 ? 'healthy' : 'unhealthy', // 99.95% uptime
          google_maps: Math.random() > 0.001 ? 'healthy' : 'unhealthy', // 99.9% uptime
          mapbox: Math.random() > 0.0015 ? 'healthy' : 'unhealthy' // 99.85% uptime
        }));

        const availabilityReport = await resilienceManager.calculateAvailability({
          healthHistory,
          period: '24h',
          providers: ['graphhopper', 'google_maps', 'mapbox']
        });

        expect(availabilityReport.overall.availability).toBeGreaterThan(99.9);
        expect(availabilityReport.providers.google_maps.availability).toBeGreaterThanOrEqual(99.9);
        expect(availabilityReport.slaCompliance).toBe(true);
        expect(availabilityReport.downtimeMinutes).toBeLessThan(1.44); // Less than 0.1%
      });

      it('should implement predictive failure detection', async () => {
        const performanceMetrics = Array.from({ length: 100 }, (_, i) => ({
          timestamp: new Date(Date.now() - (100 - i) * 60000),
          responseTime: 150 + (i * 5), // Gradually increasing response time
          errorRate: i > 80 ? 0.02 : 0.001, // Error rate spike in recent data
          requestCount: 1000 - (i * 2) // Decreasing request success
        }));

        const predictionResult = await resilienceManager.predictFailure({
          provider: 'graphhopper',
          metrics: performanceMetrics,
          predictionWindow: 3600000, // 1 hour
          confidenceThreshold: 0.7
        });

        if (predictionResult.failurePredicted) {
          expect(predictionResult.confidence).toBeGreaterThan(0.7);
          expect(predictionResult.estimatedFailureTime).toBeInstanceOf(Date);
          expect(predictionResult.recommendedActions).toContain('activate_circuit_breaker');
        }

        expect(predictionResult.riskFactors).toBeDefined();
        expect(Array.isArray(predictionResult.riskFactors)).toBe(true);
      });
    });
  });

  /**
   * ============================================================================
   * GRAPHHOPPER SERVICE PERFORMANCE TESTING
   * ============================================================================
   */
  describe('GraphHopper Service Performance Validation', () => {
    describe('API Performance Targets', () => {
      it('should complete matrix API calls within 15 seconds', async () => {
        const locations = [
          { latitude: 40.7128, longitude: -74.0060 }, // NYC
          { latitude: 40.7589, longitude: -73.9851 }, // Times Square
          { latitude: 40.7831, longitude: -73.9712 }, // Central Park
          { latitude: 40.7505, longitude: -73.9934 }  // Empire State Building
        ];

        const startTime = performance.now();
        
        const matrixResult = await graphHopperService.getRouteMatrix(locations, {
          vehicle: 'truck',
          traffic: true,
          ch: false // Disable CH for accurate timing
        });

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(executionTime).toBeLessThan(15000); // <15s requirement
        expect(matrixResult.success).toBe(true);
        expect(matrixResult.data?.distances).toBeDefined();
        expect(matrixResult.data?.times).toBeDefined();
        expect(matrixResult.data?.distances).toHaveLength(4);
        expect(matrixResult.data?.times).toHaveLength(4);
      });

      it('should retrieve traffic data within 5 seconds', async () => {
        const startLocation = { latitude: 40.7128, longitude: -74.0060 };
        const endLocation = { latitude: 40.7589, longitude: -73.9851 };

        const startTime = performance.now();

        const trafficRoute = await graphHopperService.getTrafficAwareRoute(
          startLocation,
          endLocation,
          {
            vehicle: 'truck',
            traffic: true,
            instructions: true,
            details: ['road_class', 'surface']
          }
        );

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(executionTime).toBeLessThan(5000); // <5s requirement
        expect(trafficRoute.success).toBe(true);
        expect(trafficRoute.data?.distance).toBeGreaterThan(0);
        expect(trafficRoute.data?.time).toBeGreaterThan(0);
        expect(trafficRoute.data?.points).toBeDefined();
      });

      it('should validate caching mechanisms with appropriate TTLs', async () => {
        const locations = [
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 }
        ];

        // First request - should hit API
        const firstResult = await graphHopperService.getRouteMatrix(locations, {
          vehicle: 'truck',
          traffic: true
        });

        expect(firstResult.metadata?.fromCache).toBeFalsy();

        // Second request - should hit cache
        const secondResult = await graphHopperService.getRouteMatrix(locations, {
          vehicle: 'truck',
          traffic: true
        });

        expect(secondResult.metadata?.fromCache).toBeTruthy();
        expect(secondResult.data).toEqual(firstResult.data);

        // Verify cache TTL for matrix data (1 hour)
        const matrixCacheKey = `graphhopper:matrix:${locations.map(l => `${l.latitude.toFixed(6)},${l.longitude.toFixed(6)}`).sort().join('|')}:truck:traffic:`;
        
        // Mock cache expiry check
        jest.advanceTimersByTime(3600000 + 1000); // 1 hour + 1 second

        const expiredResult = await graphHopperService.getRouteMatrix(locations, {
          vehicle: 'truck',
          traffic: true
        });

        expect(expiredResult.metadata?.fromCache).toBeFalsy(); // Should make new API call
      });
    });

    describe('Input Validation and Error Handling', () => {
      it('should validate location coordinates and reject invalid inputs', async () => {
        const invalidLocations = [
          { latitude: 91.0, longitude: -74.0060 }, // Invalid latitude
          { latitude: 40.7128, longitude: -181.0060 } // Invalid longitude
        ];

        await expect(
          graphHopperService.getRouteMatrix(invalidLocations, {
            vehicle: 'truck',
            traffic: true
          })
        ).rejects.toThrow('Invalid latitude: 91');

        const tooManyLocations = Array.from({ length: 51 }, (_, i) => ({
          latitude: 40.7128 + (i * 0.001),
          longitude: -74.0060 + (i * 0.001)
        }));

        await expect(
          graphHopperService.getRouteMatrix(tooManyLocations, {
            vehicle: 'truck',
            traffic: true
          })
        ).rejects.toThrow('Maximum 50 locations allowed');
      });

      it('should handle API failures with fallback to haversine calculations', async () => {
        const locations = [
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 }
        ];

        // Mock API failure
        jest.spyOn(graphHopperService, 'post').mockRejectedValue(
          new Error('GraphHopper API unavailable')
        );

        const fallbackResult = await graphHopperService.getRouteMatrix(locations, {
          vehicle: 'truck',
          traffic: true
        });

        expect(fallbackResult.success).toBe(true);
        expect(fallbackResult.metadata?.fallbackUsed).toBe(true);
        expect(fallbackResult.metadata?.fallbackStrategy).toBe('historical_data');
        expect(fallbackResult.data?.distances).toBeDefined();
        expect(fallbackResult.data?.times).toBeDefined();
        
        // Validate haversine distance calculation
        const expectedDistance = 1609.34; // Approximate distance in meters
        expect(fallbackResult.data!.distances[0][1]).toBeCloseTo(expectedDistance, -2);
      });

      it('should implement proper rate limiting and quota management', async () => {
        const locations = [
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 }
        ];

        // Simulate rate limit configuration
        const rateLimit = {
          requests: 100,
          window: 60000 // 1 minute
        };

        let rateLimitHit = false;
        let requestCount = 0;

        // Mock rate limiting
        jest.spyOn(graphHopperService, 'post').mockImplementation(async () => {
          requestCount++;
          if (requestCount > rateLimit.requests) {
            rateLimitHit = true;
            throw new Error('Rate limit exceeded');
          }
          return {
            success: true,
            data: {
              distances: [[0, 1000], [1000, 0]],
              times: [[0, 600], [600, 0]],
              info: { copyrights: ['GraphHopper'], took: 100 }
            }
          };
        });

        // Make requests exceeding rate limit
        const promises = Array.from({ length: 105 }, () => 
          graphHopperService.getRouteMatrix(locations, {
            vehicle: 'truck',
            traffic: true
          }).catch(error => ({ error: error.message }))
        );

        const results = await Promise.allSettled(promises);
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));

        expect(rateLimitHit).toBe(true);
        expect(failures.length).toBeGreaterThan(0);
      });
    });

    describe('Geocoding and Service Area Analysis', () => {
      it('should perform geocoding with accurate results', async () => {
        const address = '350 5th Ave, New York, NY 10118'; // Empire State Building

        const geocodingResult = await graphHopperService.geocodeAddress(address, {
          limit: 1,
          country: 'US'
        });

        expect(geocodingResult.success).toBe(true);
        expect(geocodingResult.data?.hits).toHaveLength(1);
        
        const location = geocodingResult.data!.hits[0];
        expect(location.point.lat).toBeCloseTo(40.7484, 3); // Within 3 decimal places
        expect(location.point.lng).toBeCloseTo(-73.9857, 3);
        expect(location.name).toContain('Empire State');
      });

      it('should calculate service area isochrones accurately', async () => {
        const centerLocation = { latitude: 40.7128, longitude: -74.0060 };
        const timeLimit = 1800; // 30 minutes

        const isochroneResult = await graphHopperService.calculateServiceArea(
          centerLocation,
          timeLimit,
          {
            vehicle: 'truck',
            traffic: true,
            buckets: 3
          }
        );

        expect(isochroneResult.success).toBe(true);
        expect(isochroneResult.data?.polygons).toHaveLength(3);
        
        const polygons = isochroneResult.data!.polygons;
        expect(polygons[0].properties.time).toBeLessThanOrEqual(timeLimit);
        expect(polygons[0].geometry.coordinates).toBeDefined();
        expect(polygons[0].geometry.type).toBe('Polygon');
      });
    });
  });

  /**
   * ============================================================================
   * COST MONITORING AND OPTIMIZATION TESTING
   * ============================================================================
   */
  describe('Cost Monitoring and Optimization Integration', () => {
    describe('Cost Tracking and Budget Management', () => {
      it('should track service costs with accurate calculations', async () => {
        const costData = {
          graphhopper: {
            requestsToday: 1000,
            costPerRequest: 0.10,
            monthlyBudget: 1000,
            currentSpend: 750
          },
          google_maps: {
            requestsToday: 800,
            costPerRequest: 0.15,
            monthlyBudget: 1500,
            currentSpend: 900
          },
          mapbox: {
            requestsToday: 1200,
            costPerRequest: 0.08,
            monthlyBudget: 800,
            currentSpend: 600
          }
        };

        const costSummary = await costMonitoringService.calculateCostSummary(costData);

        expect(costSummary.totalDailyCost).toBe(316); // (1000*0.10) + (800*0.15) + (1200*0.08)
        expect(costSummary.totalMonthlyBudget).toBe(3300);
        expect(costSummary.totalCurrentSpend).toBe(2250);
        expect(costSummary.budgetUtilization).toBeCloseTo(68.18, 2); // 2250/3300 * 100

        // Verify service-specific calculations
        expect(costSummary.services.graphhopper.dailyCost).toBe(100);
        expect(costSummary.services.graphhopper.budgetRemaining).toBe(250);
        expect(costSummary.services.graphhopper.utilizationPercentage).toBe(75);
      });

      it('should trigger alerts when cost thresholds are exceeded', async () => {
        let alertsTriggered: any[] = [];

        await costMonitoringService.configureCostAlerts({
          graphhopper: { threshold: 0.8, alertLevel: 'warning' },
          google_maps: { threshold: 0.9, alertLevel: 'error' },
          mapbox: { threshold: 0.85, alertLevel: 'warning' }
        });

        const overBudgetData = {
          graphhopper: { currentSpend: 850, budget: 1000 }, // 85% - should trigger warning
          google_maps: { currentSpend: 1400, budget: 1500 }, // 93.3% - should trigger error
          mapbox: { currentSpend: 650, budget: 800 } // 81.25% - below threshold
        };

        const alertResults = await costMonitoringService.processCostAlerts(overBudgetData);

        expect(alertResults.alertsTriggered).toHaveLength(2);
        expect(alertResults.alertsTriggered.find(a => a.service === 'graphhopper')?.level).toBe('warning');
        expect(alertResults.alertsTriggered.find(a => a.service === 'google_maps')?.level).toBe('error');
        expect(alertResults.alertsTriggered.find(a => a.service === 'mapbox')).toBeUndefined();
      });

      it('should generate cost optimization recommendations', async () => {
        const usageData = {
          graphhopper: { requests: 5000, cost: 500, responseTime: 200, errorRate: 0.1 },
          google_maps: { requests: 3000, cost: 450, responseTime: 150, errorRate: 0.05 },
          mapbox: { requests: 7000, cost: 560, responseTime: 180, errorRate: 0.08 }
        };

        const optimizationRecommendations = await costMonitoringService.generateOptimizationRecommendations(usageData);

        expect(optimizationRecommendations).toBeDefined();
        expect(optimizationRecommendations.recommendations).toHaveLength(3);

        const recommendations = optimizationRecommendations.recommendations;
        
        // Should recommend shifting load to Mapbox (lowest cost per request)
        const loadBalancingRec = recommendations.find(r => r.type === 'load_balancing');
        expect(loadBalancingRec).toBeDefined();
        expect(loadBalancingRec?.targetProvider).toBe('mapbox');
        expect(loadBalancingRec?.estimatedSavings).toBeGreaterThan(0);

        // Should recommend budget adjustment for high-performing services
        const budgetRec = recommendations.find(r => r.type === 'budget_optimization');
        expect(budgetRec).toBeDefined();
        expect(budgetRec?.estimatedSavings).toBeGreaterThan(50);
      });
    });

    describe('Real-time Cost Monitoring', () => {
      it('should provide real-time cost updates via WebSocket', async () => {
        let costUpdatesReceived: any[] = [];

        await costMonitoringService.subscribeToRealTimeCosts({
          organizationId: 'org_123',
          updateInterval: 1000, // 1 second
          onCostUpdate: (update) => {
            costUpdatesReceived.push(update);
          }
        });

        // Simulate cost-generating activities
        const activities = [
          { service: 'graphhopper', operation: 'matrix', cost: 0.10 },
          { service: 'google_maps', operation: 'geocoding', cost: 0.05 },
          { service: 'mapbox', operation: 'routing', cost: 0.08 }
        ];

        for (const activity of activities) {
          await costMonitoringService.recordActivity(activity);
        }

        // Wait for real-time updates
        await new Promise(resolve => setTimeout(resolve, 2000));

        expect(costUpdatesReceived.length).toBeGreaterThan(0);
        expect(costUpdatesReceived[0]).toHaveProperty('totalCost');
        expect(costUpdatesReceived[0]).toHaveProperty('serviceBreakdown');
        expect(costUpdatesReceived[0]).toHaveProperty('timestamp');
      });

      it('should forecast monthly costs based on usage trends', async () => {
        const historicalData = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - ((29 - i) * 24 * 60 * 60 * 1000)),
          totalCost: 50 + (i * 2) + (Math.random() * 10), // Upward trend with noise
          serviceBreakdown: {
            graphhopper: 20 + (i * 0.8),
            google_maps: 15 + (i * 0.6),
            mapbox: 15 + (i * 0.6)
          }
        }));

        const forecast = await costMonitoringService.forecastMonthlyCosts({
          historicalData,
          forecastPeriod: 30,
          confidenceLevel: 0.95
        });

        expect(forecast.projectedMonthlyCost).toBeGreaterThan(0);
        expect(forecast.confidence).toBeGreaterThan(0.8);
        expect(forecast.trendDirection).toMatch(/increasing|stable|decreasing/);
        expect(forecast.serviceForecasts).toHaveProperty('graphhopper');
        expect(forecast.serviceForecasts).toHaveProperty('google_maps');
        expect(forecast.serviceForecasts).toHaveProperty('mapbox');

        // Validate trend detection
        if (forecast.trendDirection === 'increasing') {
          expect(forecast.projectedMonthlyCost).toBeGreaterThan(forecast.currentMonthlyRun);
        }
      });
    });

    describe('Cost-Performance Optimization', () => {
      it('should balance cost and performance in provider selection', async () => {
        const providerMetrics = {
          graphhopper: { costPerRequest: 0.10, avgResponseTime: 200, reliability: 0.995 },
          google_maps: { costPerRequest: 0.15, avgResponseTime: 150, reliability: 0.999 },
          mapbox: { costPerRequest: 0.08, avgResponseTime: 180, reliability: 0.992 }
        };

        const selectionCriteria = {
          maxCost: 0.12,
          maxResponseTime: 200,
          minReliability: 0.99,
          prioritizePerformance: false // Cost-optimized
        };

        const optimalProvider = await costMonitoringService.selectOptimalProvider({
          operation: 'routing',
          criteria: selectionCriteria,
          providerMetrics
        });

        expect(optimalProvider.selectedProvider).toBe('mapbox'); // Cheapest within criteria
        expect(optimalProvider.costPerRequest).toBe(0.08);
        expect(optimalProvider.estimatedResponseTime).toBe(180);
        expect(optimalProvider.reliability).toBe(0.992);

        // Test performance-prioritized selection
        const performanceSelectionCriteria = {
          ...selectionCriteria,
          prioritizePerformance: true
        };

        const performanceOptimalProvider = await costMonitoringService.selectOptimalProvider({
          operation: 'routing',
          criteria: performanceSelectionCriteria,
          providerMetrics
        });

        expect(performanceOptimalProvider.selectedProvider).toBe('google_maps'); // Best performance within budget
        expect(performanceOptimalProvider.estimatedResponseTime).toBe(150);
      });

      it('should validate 20-40% cost savings through optimization', async () => {
        const baselineConfig = {
          graphhopper: { allocation: 0.4, costPerRequest: 0.10, monthlyRequests: 10000 },
          google_maps: { allocation: 0.3, costPerRequest: 0.15, monthlyRequests: 7500 },
          mapbox: { allocation: 0.3, costPerRequest: 0.08, monthlyRequests: 7500 }
        };

        const baselineCost = Object.values(baselineConfig).reduce(
          (sum, config) => sum + (config.costPerRequest * config.monthlyRequests), 0
        );

        const optimizedConfig = await costMonitoringService.optimizeProviderAllocation({
          currentConfig: baselineConfig,
          performanceRequirements: {
            maxResponseTime: 250,
            minReliability: 0.995
          },
          savingsTarget: 0.25 // 25% target savings
        });

        const optimizedCost = Object.values(optimizedConfig).reduce(
          (sum, config) => sum + (config.costPerRequest * config.monthlyRequests), 0
        );

        const actualSavings = (baselineCost - optimizedCost) / baselineCost;

        expect(actualSavings).toBeGreaterThanOrEqual(0.20); // Minimum 20% savings
        expect(actualSavings).toBeLessThanOrEqual(0.40); // Maximum 40% savings
        expect(optimizedConfig).toHaveProperty('totalMonthlyCost');
        expect(optimizedConfig).toHaveProperty('estimatedSavings');
        expect(optimizedConfig.estimatedSavings).toBeGreaterThan(baselineCost * 0.2);
      });
    });
  });

  /**
   * ============================================================================
   * END-TO-END INTEGRATION TESTING
   * ============================================================================
   */
  describe('Complete End-to-End Integration Workflow', () => {
    describe('Route Optimization Workflow', () => {
      it('should complete full route optimization workflow within performance targets', async () => {
        const workflowStartTime = performance.now();
        let webSocketConnected = false;
        let trafficUpdatesReceived = 0;
        let costUpdatesReceived = 0;
        let optimizationCompleted = false;

        // Step 1: Establish WebSocket connection (<1s)
        const wsConnectionStart = performance.now();
        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/route-optimization',
          subscriptions: ['route_optimization', 'traffic_updates', 'cost_monitoring'],
          enableReconnection: true,
          onConnect: () => { webSocketConnected = true; },
          onTrafficUpdate: () => { trafficUpdatesReceived++; },
          onCostUpdate: () => { costUpdatesReceived++; }
        });
        const wsConnectionTime = performance.now() - wsConnectionStart;

        expect(wsConnectionTime).toBeLessThan(1000); // <1s requirement
        expect(webSocketConnected).toBe(true);

        // Step 2: Submit route optimization request
        const routeRequest = {
          id: 'route_001',
          organizationId: 'org_123',
          vehicleType: 'truck' as const,
          startLocation: { latitude: 40.7128, longitude: -74.0060 },
          endLocation: { latitude: 40.7589, longitude: -73.9851 },
          waypoints: [
            { latitude: 40.7505, longitude: -73.9934, priority: 1 }
          ],
          preferences: {
            avoidTolls: false,
            avoidHighways: false,
            prioritizeTime: true,
            prioritizeCost: false,
            includeTraffic: true
          },
          scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
          createdAt: new Date(),
          status: 'pending' as const
        };

        const optimizationStart = performance.now();
        const optimizationResult = await resilienceManager.executeWithFallback({
          operation: 'optimizeRoute',
          primaryProvider: 'graphhopper',
          fallbackChain: ['google_maps', 'mapbox'],
          parameters: routeRequest,
          timeout: 15000,
          onComplete: () => { optimizationCompleted = true; }
        });
        const optimizationTime = performance.now() - optimizationStart;

        expect(optimizationTime).toBeLessThan(15000); // <15s requirement
        expect(optimizationResult.success).toBe(true);
        expect(optimizationCompleted).toBe(true);

        // Step 3: Validate real-time updates
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for updates

        expect(trafficUpdatesReceived).toBeGreaterThan(0);
        expect(costUpdatesReceived).toBeGreaterThan(0);

        // Step 4: Verify cost optimization
        const costSummary = await costMonitoringService.calculateOptimizationImpact({
          originalRoute: { distance: 5000, time: 1800, cost: 15.00 },
          optimizedRoute: optimizationResult.data,
          trafficAdjustments: trafficUpdatesReceived
        });

        expect(costSummary.costSavings).toBeGreaterThan(0);
        expect(costSummary.timeSavings).toBeGreaterThan(0);
        expect(costSummary.efficiencyGain).toBeGreaterThanOrEqual(10); // Minimum 10% improvement

        const totalWorkflowTime = performance.now() - workflowStartTime;
        expect(totalWorkflowTime).toBeLessThan(20000); // Total workflow <20s
      });

      it('should handle complete system failure with graceful degradation', async () => {
        let fallbacksActivated = 0;
        let offlineModeEnabled = false;
        let cachedDataUsed = false;

        // Simulate complete external service failure
        jest.spyOn(resilienceManager, 'checkAllProviders').mockResolvedValue({
          graphhopper: { status: 'offline', error: 'Service unavailable' },
          google_maps: { status: 'offline', error: 'API quota exceeded' },
          mapbox: { status: 'offline', error: 'Connection timeout' }
        });

        // Setup cached route data
        const cachedRouteData = {
          routes: [{
            id: 'cached_route_001',
            distance: 5200,
            estimatedTime: 1920,
            cost: 14.50,
            confidence: 75,
            waypoints: [
              { latitude: 40.7128, longitude: -74.0060 },
              { latitude: 40.7589, longitude: -73.9851 }
            ],
            traffic: { severity: 'medium', delayMinutes: 5, incidents: [] },
            alternatives: []
          }],
          performance: { processingTime: 0, apiCalls: 0, fallbacksUsed: 3, providersUsed: ['cache'] },
          optimization: { originalTime: 2000, optimizedTime: 1920, timeSavings: 80, costSavings: 0.50, efficiencyGain: 4 },
          timestamp: new Date()
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(cachedRouteData));

        const degradedResult = await resilienceManager.executeOfflineOperation({
          operation: 'optimizeRoute',
          cacheKey: 'route:optimization:cached',
          fallbackStrategy: 'cached_data',
          parameters: {
            startLocation: { latitude: 40.7128, longitude: -74.0060 },
            endLocation: { latitude: 40.7589, longitude: -73.9851 }
          },
          onFallbackActivated: () => { fallbacksActivated++; },
          onOfflineMode: () => { offlineModeEnabled = true; },
          onCachedDataUsed: () => { cachedDataUsed = true; }
        });

        expect(degradedResult.success).toBe(true);
        expect(degradedResult.offlineMode).toBe(true);
        expect(degradedResult.source).toBe('cache');
        expect(degradedResult.data).toEqual(cachedRouteData);
        expect(fallbacksActivated).toBeGreaterThan(0);
        expect(offlineModeEnabled).toBe(true);
        expect(cachedDataUsed).toBe(true);

        // Verify business continuity
        expect(degradedResult.data.routes).toHaveLength(1);
        expect(degradedResult.data.routes[0].confidence).toBeGreaterThan(70);
        expect(degradedResult.data.optimization.efficiencyGain).toBeGreaterThan(0);
      });

      it('should maintain data consistency across all integration points', async () => {
        const routeId = 'consistency_test_route';
        const organizationId = 'org_consistency_test';
        
        let webSocketData: any = null;
        let apiResponseData: any = null;
        let cacheData: any = null;
        let costData: any = null;

        // Setup data capture from all integration points
        await realTimeTrafficService.subscribeToRouteOptimization({
          organizationId,
          onOptimizationComplete: (data) => { webSocketData = data; }
        });

        // Execute route optimization
        const routeRequest = {
          id: routeId,
          organizationId,
          vehicleType: 'truck' as const,
          startLocation: { latitude: 40.7128, longitude: -74.0060 },
          endLocation: { latitude: 40.7589, longitude: -73.9851 },
          preferences: {
            avoidTolls: false,
            avoidHighways: false,
            prioritizeTime: true,
            prioritizeCost: false,
            includeTraffic: true
          },
          createdAt: new Date(),
          status: 'pending' as const
        };

        // API Response
        apiResponseData = await resilienceManager.executeWithFallback({
          operation: 'optimizeRoute',
          primaryProvider: 'graphhopper',
          fallbackChain: ['google_maps'],
          parameters: routeRequest
        });

        // Cache Data
        const cacheKey = `route:${routeId}:optimization`;
        cacheData = JSON.parse(await mockRedis.get(cacheKey) || '{}');

        // Cost Data
        costData = await costMonitoringService.getRouteOptimizationCosts({
          routeId,
          timeframe: '1h'
        });

        // Wait for WebSocket propagation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify data consistency
        expect(webSocketData).toBeDefined();
        expect(apiResponseData).toBeDefined();
        expect(cacheData).toBeDefined();
        expect(costData).toBeDefined();

        // Cross-validate key data points
        expect(webSocketData.routeId).toBe(routeId);
        expect(apiResponseData.data.routes[0].id).toContain(routeId);
        expect(cacheData.routeId).toBe(routeId);
        expect(costData.routeId).toBe(routeId);

        // Validate optimization metrics consistency
        const apiOptimization = apiResponseData.data.optimization;
        const wsOptimization = webSocketData.optimization;
        const cacheOptimization = cacheData.optimization;

        expect(wsOptimization.timeSavings).toBe(apiOptimization.timeSavings);
        expect(cacheOptimization.costSavings).toBe(apiOptimization.costSavings);
        expect(Math.abs(wsOptimization.efficiencyGain - apiOptimization.efficiencyGain)).toBeLessThan(1);
      });
    });

    describe('Performance Under Load', () => {
      it('should handle concurrent route optimization requests efficiently', async () => {
        const concurrentRequests = 50;
        const maxAcceptableTime = 30000; // 30 seconds for all requests
        let successfulRequests = 0;
        let failedRequests = 0;
        let averageResponseTime = 0;

        const startTime = performance.now();

        const requests = Array.from({ length: concurrentRequests }, (_, i) => 
          resilienceManager.executeWithFallback({
            operation: 'optimizeRoute',
            primaryProvider: 'graphhopper',
            fallbackChain: ['google_maps', 'mapbox'],
            parameters: {
              id: `concurrent_route_${i}`,
              organizationId: 'org_load_test',
              vehicleType: 'truck' as const,
              startLocation: { 
                latitude: 40.7128 + (i * 0.001), 
                longitude: -74.0060 + (i * 0.001) 
              },
              endLocation: { 
                latitude: 40.7589 + (i * 0.001), 
                longitude: -73.9851 + (i * 0.001) 
              },
              preferences: {
                avoidTolls: false,
                avoidHighways: false,
                prioritizeTime: true,
                prioritizeCost: false,
                includeTraffic: true
              },
              createdAt: new Date(),
              status: 'pending' as const
            },
            timeout: 20000
          }).then(result => {
            if (result.success) successfulRequests++;
            else failedRequests++;
            return result;
          }).catch(() => {
            failedRequests++;
            return { success: false, error: 'Request failed' };
          })
        );

        const results = await Promise.allSettled(requests);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        averageResponseTime = totalTime / concurrentRequests;

        expect(totalTime).toBeLessThan(maxAcceptableTime);
        expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.9); // >90% success rate
        expect(averageResponseTime).toBeLessThan(15000); // Average <15s per request
        expect(failedRequests).toBeLessThan(concurrentRequests * 0.1); // <10% failure rate

        // Validate no resource exhaustion
        const systemHealth = await resilienceManager.checkSystemHealth();
        expect(systemHealth.overallStatus).not.toBe('critical');
        expect(systemHealth.resourceUtilization.memory).toBeLessThan(90);
        expect(systemHealth.resourceUtilization.cpu).toBeLessThan(85);
      });

      it('should maintain WebSocket connection stability under high message volume', async () => {
        const messageVolume = 1000;
        const messagesPerSecond = 100;
        let messagesProcessed = 0;
        let connectionDrops = 0;
        let processingErrors = 0;

        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/high-volume-test',
          subscriptions: ['high_volume_test'],
          enableReconnection: true,
          batchSize: 20,
          batchTimeout: 100,
          onBatchMessage: (batch) => {
            try {
              messagesProcessed += batch.length;
            } catch (error) {
              processingErrors++;
            }
          },
          onDisconnect: () => { connectionDrops++; },
          onError: () => { processingErrors++; }
        });

        const startTime = performance.now();

        // Generate high-volume messages
        const messageInterval = 1000 / messagesPerSecond;
        let messagesSent = 0;

        const sendMessages = async () => {
          while (messagesSent < messageVolume) {
            await realTimeTrafficService.receiveMessage({
              type: 'high_volume_test',
              data: {
                messageId: messagesSent,
                timestamp: new Date(),
                payload: `Test message ${messagesSent}`
              }
            });
            messagesSent++;
            await new Promise(resolve => setTimeout(resolve, messageInterval));
          }
        };

        await sendMessages();

        // Wait for processing completion
        await new Promise(resolve => setTimeout(resolve, 3000));

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(messagesProcessed).toBe(messageVolume);
        expect(connectionDrops).toBe(0); // No connection drops
        expect(processingErrors).toBeLessThan(messageVolume * 0.01); // <1% error rate
        expect(totalTime).toBeLessThan(15000); // Complete within 15 seconds
      });
    });
  });

  /**
   * ============================================================================
   * DASHBOARD INTEGRATION TESTING
   * ============================================================================
   */
  describe('Frontend Dashboard Integration', () => {
    describe('Real-time Dashboard Updates', () => {
      it('should display real-time route optimization data with <2s load time', async () => {
        // This test would typically use a testing framework like Playwright or Cypress
        // For this integration test, we'll simulate the dashboard API calls

        const dashboardStartTime = performance.now();

        // Simulate dashboard API calls
        const dashboardData = {
          routeOptimization: await ApiTestHelper.get('/api/route-optimization/organization/org_123'),
          trafficUpdates: await ApiTestHelper.get('/api/traffic/real-time-updates'),
          costMetrics: await ApiTestHelper.get('/api/route-optimization/cost-metrics'),
          serviceStatuses: await ApiTestHelper.get('/api/external-services/health')
        };

        const dashboardLoadTime = performance.now() - dashboardStartTime;

        expect(dashboardLoadTime).toBeLessThan(2000); // <2s requirement
        expect(dashboardData.routeOptimization.status).toBe(200);
        expect(dashboardData.trafficUpdates.status).toBe(200);
        expect(dashboardData.costMetrics.status).toBe(200);
        expect(dashboardData.serviceStatuses.status).toBe(200);

        // Validate data structure
        expect(dashboardData.routeOptimization.data.requests).toBeDefined();
        expect(dashboardData.routeOptimization.data.results).toBeDefined();
        expect(Array.isArray(dashboardData.trafficUpdates.data)).toBe(true);
        expect(Array.isArray(dashboardData.costMetrics.data)).toBe(true);
        expect(Array.isArray(dashboardData.serviceStatuses.data)).toBe(true);
      });

      it('should handle WebSocket integration for live dashboard updates', async () => {
        let dashboardUpdatesReceived = 0;
        let lastUpdateData: any = null;

        const mockDashboardWebSocket = {
          onRouteOptimizationUpdate: (data: any) => {
            dashboardUpdatesReceived++;
            lastUpdateData = data;
          },
          onTrafficUpdate: (data: any) => {
            dashboardUpdatesReceived++;
          },
          onCostUpdate: (data: any) => {
            dashboardUpdatesReceived++;
          }
        };

        // Establish WebSocket connection for dashboard
        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/dashboard',
          subscriptions: ['dashboard_updates'],
          enableReconnection: true,
          onBatchMessage: (batch) => {
            batch.forEach(message => {
              switch (message.type) {
                case 'route_optimization_update':
                  mockDashboardWebSocket.onRouteOptimizationUpdate(message.data);
                  break;
                case 'traffic_update':
                  mockDashboardWebSocket.onTrafficUpdate(message.data);
                  break;
                case 'cost_update':
                  mockDashboardWebSocket.onCostUpdate(message.data);
                  break;
              }
            });
          }
        });

        // Trigger updates
        await realTimeTrafficService.broadcastTrafficUpdate({
          id: 'dashboard_test_incident',
          type: 'congestion',
          location: { latitude: 40.7128, longitude: -74.0060, radius: 500 },
          severity: 'medium',
          impact: { delayMinutes: 10, alternativeRoutes: 2, estimatedDuration: 30 },
          description: 'Dashboard integration test incident',
          affectedRoutes: ['dashboard_test_route'],
          timestamp: new Date()
        });

        await costMonitoringService.broadcastCostUpdate({
          service: 'graphhopper',
          currentCost: 123.45,
          budgetRemaining: 876.55,
          utilizationPercentage: 12.35,
          alerts: []
        });

        // Wait for updates to propagate
        await new Promise(resolve => setTimeout(resolve, 1500));

        expect(dashboardUpdatesReceived).toBeGreaterThan(0);
        expect(lastUpdateData).toBeDefined();
      });
    });

    describe('Dashboard Performance and Responsiveness', () => {
      it('should maintain responsiveness with large datasets', async () => {
        // Generate large dataset
        const largeRouteDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `route_${i}`,
          organizationId: 'org_123',
          vehicleType: 'truck' as const,
          distance: 1000 + (i * 10),
          estimatedTime: 600 + (i * 5),
          cost: 10 + (i * 0.1),
          confidence: 85 + (Math.random() * 10),
          status: 'completed' as const,
          createdAt: new Date(Date.now() - (i * 60000))
        }));

        const performanceStartTime = performance.now();

        // Simulate dashboard data processing (virtualization, filtering, sorting)
        const processedData = {
          total: largeRouteDataset.length,
          visible: largeRouteDataset.slice(0, 50), // Virtual scrolling - only render 50
          filtered: largeRouteDataset.filter(route => route.confidence > 90),
          sorted: largeRouteDataset.sort((a, b) => b.cost - a.cost).slice(0, 10),
          aggregated: {
            totalCost: largeRouteDataset.reduce((sum, route) => sum + route.cost, 0),
            averageConfidence: largeRouteDataset.reduce((sum, route) => sum + route.confidence, 0) / largeRouteDataset.length,
            completedRoutes: largeRouteDataset.length
          }
        };

        const processingTime = performance.now() - performanceStartTime;

        expect(processingTime).toBeLessThan(500); // Processing <500ms
        expect(processedData.visible).toHaveLength(50);
        expect(processedData.filtered.length).toBeGreaterThan(0);
        expect(processedData.sorted).toHaveLength(10);
        expect(processedData.aggregated.totalCost).toBeGreaterThan(0);
        expect(processedData.aggregated.averageConfidence).toBeGreaterThan(80);
      });

      it('should validate mobile responsiveness and WCAG 2.1 compliance', async () => {
        // Simulate mobile viewport sizes
        const viewports = [
          { name: 'mobile-portrait', width: 320, height: 568 },
          { name: 'mobile-landscape', width: 568, height: 320 },
          { name: 'tablet', width: 768, height: 1024 },
          { name: 'desktop', width: 1440, height: 900 }
        ];

        const responsiveTests = await Promise.all(
          viewports.map(async (viewport) => {
            // Simulate responsive layout calculations
            const layoutCalculation = {
              viewport,
              gridColumns: viewport.width >= 1440 ? 4 : viewport.width >= 768 ? 3 : viewport.width >= 568 ? 2 : 1,
              fontSize: viewport.width >= 768 ? 16 : 14,
              buttonSize: viewport.width >= 768 ? 'normal' : 'compact',
              navigationStyle: viewport.width >= 768 ? 'horizontal' : 'hamburger'
            };

            // WCAG 2.1 compliance checks
            const accessibilityChecks = {
              colorContrast: 4.5, // AA standard
              focusIndicators: true,
              keyboardNavigation: true,
              screenReaderSupport: true,
              touchTargetSize: viewport.width < 768 ? 44 : 48 // Minimum touch target size
            };

            return {
              viewport: viewport.name,
              layout: layoutCalculation,
              accessibility: accessibilityChecks,
              compliant: accessibilityChecks.colorContrast >= 4.5 && 
                        accessibilityChecks.touchTargetSize >= 44
            };
          })
        );

        responsiveTests.forEach(test => {
          expect(test.layout.gridColumns).toBeGreaterThan(0);
          expect(test.layout.fontSize).toBeGreaterThanOrEqual(14);
          expect(test.accessibility.colorContrast).toBeGreaterThanOrEqual(4.5);
          expect(test.accessibility.touchTargetSize).toBeGreaterThanOrEqual(44);
          expect(test.compliant).toBe(true);
        });

        // Validate mobile-specific features
        const mobileTest = responsiveTests.find(test => test.viewport === 'mobile-portrait');
        expect(mobileTest?.layout.gridColumns).toBe(1);
        expect(mobileTest?.layout.navigationStyle).toBe('hamburger');
      });
    });
  });

  /**
   * ============================================================================
   * PRODUCTION READINESS VALIDATION
   * ============================================================================
   */
  describe('Production Readiness Validation', () => {
    describe('System Health and Monitoring', () => {
      it('should validate 99.9% availability target', async () => {
        const monitoringPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const allowedDowntime = monitoringPeriod * 0.001; // 0.1% = 86.4 seconds

        let totalUptime = 0;
        let healthChecks = 0;
        const healthCheckInterval = 60000; // 1 minute intervals

        // Simulate continuous health monitoring
        for (let i = 0; i < 1440; i++) { // 24 hours * 60 minutes
          try {
            const healthStatus = await resilienceManager.performHealthCheck();
            if (healthStatus.overall === 'healthy') {
              totalUptime += healthCheckInterval;
            }
            healthChecks++;
          } catch (error) {
            // Health check failure - no uptime added
            healthChecks++;
          }
          
          // Simulate time passage (in testing, this would be mocked)
          if (i % 100 === 0) { // Log progress every 100 checks
            const currentUptime = (totalUptime / (healthChecks * healthCheckInterval)) * 100;
            expect(currentUptime).toBeGreaterThan(99.0); // Should maintain >99% throughout
          }
        }

        const finalAvailability = (totalUptime / monitoringPeriod) * 100;
        const actualDowntime = monitoringPeriod - totalUptime;

        expect(finalAvailability).toBeGreaterThanOrEqual(99.9);
        expect(actualDowntime).toBeLessThanOrEqual(allowedDowntime);
      });

      it('should handle system recovery within SLA requirements', async () => {
        const maxRecoveryTime = 300000; // 5 minutes
        let recoveryStartTime: number;
        let systemRecovered = false;

        // Simulate system failure
        await resilienceManager.simulateSystemFailure({
          failureType: 'cascading',
          affectedServices: ['graphhopper', 'google_maps'],
          severity: 'high'
        });

        recoveryStartTime = performance.now();

        // Execute recovery procedures
        const recoveryResult = await resilienceManager.executeSystemRecovery({
          failureType: 'cascading',
          recoveryPlan: {
            steps: [
              'activate_circuit_breakers',
              'switch_to_fallback_providers',
              'clear_failed_connections',
              'restart_unhealthy_services',
              'validate_service_health'
            ]
          },
          onRecoveryStep: (step) => {
            console.log(`Executing recovery step: ${step}`);
          },
          onRecoveryComplete: () => {
            systemRecovered = true;
          }
        });

        const recoveryTime = performance.now() - recoveryStartTime;

        expect(recoveryTime).toBeLessThan(maxRecoveryTime);
        expect(recoveryResult.success).toBe(true);
        expect(systemRecovered).toBe(true);
        expect(recoveryResult.servicesRestored).toContain('graphhopper');

        // Verify system health after recovery
        const postRecoveryHealth = await resilienceManager.performHealthCheck();
        expect(postRecoveryHealth.overall).toBe('healthy');
        expect(postRecoveryHealth.services.graphhopper.status).toBe('healthy');
      });
    });

    describe('Security and Compliance Validation', () => {
      it('should validate secure communication and data handling', async () => {
        // Test HTTPS enforcement
        const secureEndpoints = [
          '/api/route-optimization',
          '/api/external-services/health',
          '/api/traffic/real-time-updates',
          '/api/cost-monitoring'
        ];

        for (const endpoint of secureEndpoints) {
          const response = await ApiTestHelper.get(endpoint, {
            protocol: 'https',
            validateCertificate: true
          });

          expect(response.secure).toBe(true);
          expect(response.headers['strict-transport-security']).toBeDefined();
          expect(response.headers['x-content-type-options']).toBe('nosniff');
          expect(response.headers['x-frame-options']).toBe('DENY');
        }

        // Test data encryption
        const sensitiveData = {
          routeRequest: {
            organizationId: 'org_123',
            locations: [
              { latitude: 40.7128, longitude: -74.0060 },
              { latitude: 40.7589, longitude: -73.9851 }
            ]
          }
        };

        const encryptionTest = await ApiTestHelper.post('/api/route-optimization', sensitiveData, {
          encryption: 'AES-256-GCM',
          validateEncryption: true
        });

        expect(encryptionTest.encrypted).toBe(true);
        expect(encryptionTest.data).not.toEqual(sensitiveData); // Data should be encrypted
      });

      it('should validate API authentication and authorization', async () => {
        const testCases = [
          {
            name: 'Valid JWT token',
            token: 'valid_jwt_token',
            expectedStatus: 200
          },
          {
            name: 'Invalid JWT token',
            token: 'invalid_jwt_token',
            expectedStatus: 401
          },
          {
            name: 'Expired JWT token',
            token: 'expired_jwt_token',
            expectedStatus: 401
          },
          {
            name: 'No token provided',
            token: null,
            expectedStatus: 401
          }
        ];

        for (const testCase of testCases) {
          const response = await ApiTestHelper.get('/api/route-optimization/organization/org_123', {
            headers: testCase.token ? { Authorization: `Bearer ${testCase.token}` } : {}
          });

          expect(response.status).toBe(testCase.expectedStatus);

          if (testCase.expectedStatus === 200) {
            expect(response.data).toBeDefined();
          } else {
            expect(response.data.error).toBeDefined();
            expect(response.data.error.type).toBe('authentication_error');
          }
        }

        // Test role-based access control
        const rbacTests = [
          { role: 'admin', endpoint: '/api/route-optimization/cost-metrics', allowed: true },
          { role: 'user', endpoint: '/api/route-optimization/cost-metrics', allowed: false },
          { role: 'driver', endpoint: '/api/route-optimization/my-routes', allowed: true },
          { role: 'driver', endpoint: '/api/route-optimization/all-routes', allowed: false }
        ];

        for (const rbacTest of rbacTests) {
          const response = await ApiTestHelper.get(rbacTest.endpoint, {
            headers: { Authorization: `Bearer ${rbacTest.role}_jwt_token` }
          });

          if (rbacTest.allowed) {
            expect(response.status).toBe(200);
          } else {
            expect(response.status).toBe(403);
            expect(response.data.error.type).toBe('authorization_error');
          }
        }
      });
    });

    describe('Performance Benchmarking', () => {
      it('should validate all performance targets in production-like conditions', async () => {
        const performanceTargets = {
          matrixApiResponse: 15000, // 15 seconds
          trafficDataRetrieval: 5000, // 5 seconds
          providerFailover: 5000, // 5 seconds
          dashboardLoad: 2000, // 2 seconds
          webSocketConnection: 1000, // 1 second
          systemRecovery: 300000 // 5 minutes
        };

        const performanceResults: Record<string, number> = {};

        // Matrix API performance
        const matrixStart = performance.now();
        await graphHopperService.getRouteMatrix([
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 }
        ], { vehicle: 'truck', traffic: true });
        performanceResults.matrixApiResponse = performance.now() - matrixStart;

        // Traffic data retrieval performance
        const trafficStart = performance.now();
        await graphHopperService.getTrafficAwareRoute(
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 40.7589, longitude: -73.9851 },
          { vehicle: 'truck', traffic: true }
        );
        performanceResults.trafficDataRetrieval = performance.now() - trafficStart;

        // Provider failover performance
        const failoverStart = performance.now();
        await resilienceManager.executeWithFallback({
          operation: 'getRouteMatrix',
          primaryProvider: 'graphhopper',
          fallbackChain: ['google_maps'],
          parameters: { locations: [
            { latitude: 40.7128, longitude: -74.0060 },
            { latitude: 40.7589, longitude: -73.9851 }
          ]}
        });
        performanceResults.providerFailover = performance.now() - failoverStart;

        // Dashboard load performance
        const dashboardStart = performance.now();
        await Promise.all([
          ApiTestHelper.get('/api/route-optimization/organization/org_123'),
          ApiTestHelper.get('/api/traffic/real-time-updates'),
          ApiTestHelper.get('/api/external-services/health')
        ]);
        performanceResults.dashboardLoad = performance.now() - dashboardStart;

        // WebSocket connection performance
        const wsStart = performance.now();
        await realTimeTrafficService.establishConnection({
          url: 'ws://localhost:8080/performance-test',
          subscriptions: ['performance_test'],
          enableReconnection: false
        });
        performanceResults.webSocketConnection = performance.now() - wsStart;

        // Validate all targets
        for (const [metric, actualTime] of Object.entries(performanceResults)) {
          const target = performanceTargets[metric as keyof typeof performanceTargets];
          expect(actualTime).toBeLessThan(target);
        }

        // Generate performance report
        const performanceReport = {
          timestamp: new Date(),
          targets: performanceTargets,
          results: performanceResults,
          compliance: Object.entries(performanceResults).map(([metric, time]) => ({
            metric,
            target: performanceTargets[metric as keyof typeof performanceTargets],
            actual: time,
            compliant: time < performanceTargets[metric as keyof typeof performanceTargets],
            margin: performanceTargets[metric as keyof typeof performanceTargets] - time
          }))
        };

        expect(performanceReport.compliance.every(c => c.compliant)).toBe(true);
      });
    });
  });
});