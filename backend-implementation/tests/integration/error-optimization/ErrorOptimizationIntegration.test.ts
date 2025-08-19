/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ERROR OPTIMIZATION INTEGRATION TESTS
 * ============================================================================
 *
 * Comprehensive integration tests for error optimization system:
 * - Intelligent traffic routing during error scenarios
 * - Cost-aware fallback strategy implementation
 * - End-to-end error scenario handling
 * - Performance monitoring and analytics
 * - Budget protection mechanisms
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import request from 'supertest';
import { app } from '@/server';
import { 
  IntelligentTrafficRoutingService,
  RoutingStrategy,
  RoutingNode 
} from '@/services/external/IntelligentTrafficRoutingService';
import { 
  CostAwareFallbackService,
  BudgetPeriod,
  CostTier 
} from '@/services/external/CostAwareFallbackService';
import { 
  ErrorScenarioOptimizationService,
  ErrorScenarioType,
  OptimizationStrategy 
} from '@/services/external/ErrorScenarioOptimizationService';
import { 
  FallbackStrategyManager,
  ServicePriority,
  BusinessCriticality 
} from '@/services/external/FallbackStrategyManager';
import { redisClient } from '@/config/redis';
import { setupTestDatabase, teardownTestDatabase } from '@/tests/helpers/DatabaseTestHelper';

// Test configuration
const TEST_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
  organizationId: 'test-org-123',
  role: 'admin'
};

const TEST_AUTH_TOKEN = 'Bearer test-token-123';

// Mock authentication middleware
jest.mock('@/middleware/auth', () => ({
  auth: (req: any, res: any, next: any) => {
    req.user = TEST_USER;
    next();
  }
}));

describe('Error Optimization Integration Tests', () => {
  let fallbackManager: FallbackStrategyManager;
  let routingService: IntelligentTrafficRoutingService;
  let costService: CostAwareFallbackService;
  let optimizationService: ErrorScenarioOptimizationService;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Initialize services
    fallbackManager = new FallbackStrategyManager();
    routingService = new IntelligentTrafficRoutingService(fallbackManager, {} as any);
    costService = new CostAwareFallbackService(fallbackManager, routingService);
    optimizationService = new ErrorScenarioOptimizationService(
      fallbackManager,
      routingService,
      costService,
      {} as any
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await optimizationService?.shutdown();
    await costService?.shutdown();
    await routingService?.shutdown();
  });

  beforeEach(async () => {
    // Clean up Redis cache before each test
    await redisClient.flushdb();
  });

  describe('Error Scenario Handling', () => {
    it('should handle critical error scenario with revenue protection', async () => {
      const errorScenario = {
        scenarioType: ErrorScenarioType.SERVICE_UNAVAILABLE,
        serviceName: 'stripe',
        operation: 'process_payment',
        severity: 'critical',
        businessImpact: {
          revenueAtRisk: 5000,
          customerImpact: 'severe',
          operationalImpact: 'significant',
          timeToResolution: 10
        },
        errorDetails: {
          originalError: 'Payment service unavailable',
          failedProviders: ['stripe_primary'],
          retryAttempts: 2,
          errorPattern: 'connection_timeout',
          cascadingServices: []
        },
        budgetConstraints: {
          remainingBudget: 1000,
          maxAllowableCost: 0.05,
          budgetPeriod: 'daily',
          emergencyBudgetAvailable: true
        },
        performanceRequirements: {
          maxLatency: 300,
          minThroughput: 100,
          minSuccessRate: 99
        },
        metadata: {
          requestId: 'test-req-123',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          priority: ServicePriority.CRITICAL,
          businessCriticality: BusinessCriticality.REVENUE_BLOCKING
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/handle-scenario')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(errorScenario)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('decisionId');
      expect(response.body.data).toHaveProperty('selectedStrategy');
      expect(response.body.data.selectedStrategy).toBe(OptimizationStrategy.REVENUE_PROTECTION);
      expect(response.body.data).toHaveProperty('optimizationPlan');
      expect(response.body.data.optimizationPlan.primaryAction).toContain('premium');
      expect(response.body.data.metadata.confidenceScore).toBeGreaterThan(70);
    });

    it('should handle cost optimization scenario with budget constraints', async () => {
      const errorScenario = {
        scenarioType: ErrorScenarioType.COST_OVERRUN,
        serviceName: 'maps',
        operation: 'route_optimization',
        severity: 'medium',
        businessImpact: {
          revenueAtRisk: 100,
          customerImpact: 'minor',
          operationalImpact: 'minor',
          timeToResolution: 30
        },
        errorDetails: {
          originalError: 'Rate limit exceeded',
          failedProviders: ['mapbox_primary'],
          retryAttempts: 1,
          errorPattern: 'rate_limit',
          cascadingServices: []
        },
        budgetConstraints: {
          remainingBudget: 50,
          maxAllowableCost: 0.01,
          budgetPeriod: 'daily',
          emergencyBudgetAvailable: false
        },
        performanceRequirements: {
          maxLatency: 800,
          minThroughput: 50,
          minSuccessRate: 95
        },
        metadata: {
          requestId: 'test-req-124',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          priority: ServicePriority.MEDIUM,
          businessCriticality: BusinessCriticality.PERFORMANCE_OPTIMIZATION
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/handle-scenario')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(errorScenario)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedStrategy).toBe(OptimizationStrategy.COST_MINIMIZATION);
      expect(response.body.data.optimizationPlan.estimatedCost).toBeLessThan(errorScenario.budgetConstraints.maxAllowableCost);
    });

    it('should handle emergency scenario with all optimizations activated', async () => {
      const emergencyScenario = {
        scenarioType: ErrorScenarioType.EMERGENCY_SCENARIO,
        serviceName: 'samsara',
        operation: 'fleet_tracking',
        severity: 'critical',
        businessImpact: {
          revenueAtRisk: 15000,
          customerImpact: 'severe',
          operationalImpact: 'significant',
          timeToResolution: 5
        },
        errorDetails: {
          originalError: 'Complete fleet tracking failure',
          failedProviders: ['samsara_primary', 'samsara_backup'],
          retryAttempts: 3,
          errorPattern: 'system_failure',
          cascadingServices: ['route_optimization', 'driver_dispatch']
        },
        budgetConstraints: {
          remainingBudget: 2000,
          maxAllowableCost: 0.1,
          budgetPeriod: 'daily',
          emergencyBudgetAvailable: true
        },
        performanceRequirements: {
          maxLatency: 200,
          minThroughput: 200,
          minSuccessRate: 99.5
        },
        metadata: {
          requestId: 'test-req-125',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          priority: ServicePriority.CRITICAL,
          businessCriticality: BusinessCriticality.OPERATIONAL_CRITICAL
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/handle-scenario')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(emergencyScenario)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedStrategy).toBe(OptimizationStrategy.EMERGENCY_MODE);
      expect(response.body.data.optimizationPlan.primaryAction).toContain('activate_all');
      expect(response.body.data.metadata.optimizationLevel).toBe('comprehensive');
    });
  });

  describe('Intelligent Traffic Routing', () => {
    it('should make intelligent routing decision with performance optimization', async () => {
      const routingRequest = {
        serviceName: 'stripe',
        operation: 'process_payment',
        requestMetadata: {
          requestId: 'route-test-123',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          clientRegion: 'us-east-1',
          priority: ServicePriority.HIGH,
          businessCriticality: BusinessCriticality.REVENUE_BLOCKING,
          retryCount: 0,
          maxRetries: 3
        },
        errorHistory: {
          recentErrors: [],
          failurePatterns: []
        },
        budgetConstraints: {
          remainingBudget: 1000,
          costPerRequestLimit: 0.05,
          budgetPeriod: 'daily'
        },
        performanceContext: {
          currentLatency: 500,
          targetLatency: 300,
          currentThroughput: 100,
          targetThroughput: 200
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/routing-decision')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(routingRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('selectedNode');
      expect(response.body.data).toHaveProperty('routingStrategy');
      expect(response.body.data.selectedNode).toHaveProperty('nodeId');
      expect(response.body.data.selectedNode).toHaveProperty('providerName');
      expect(response.body.data.metadata.confidenceScore).toBeGreaterThan(0);
      expect(response.body.data.estimatedLatency).toBeLessThanOrEqual(routingRequest.performanceContext.targetLatency * 2);
    });

    it('should handle routing with error history and failed providers', async () => {
      const routingRequest = {
        serviceName: 'maps',
        operation: 'get_directions',
        requestMetadata: {
          requestId: 'route-test-124',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          clientRegion: 'us-west-2',
          priority: ServicePriority.MEDIUM,
          businessCriticality: BusinessCriticality.PERFORMANCE_OPTIMIZATION,
          retryCount: 2,
          maxRetries: 3
        },
        errorHistory: {
          recentErrors: [
            {
              nodeId: 'mapbox_primary',
              error: 'Rate limit exceeded',
              timestamp: new Date(),
              errorType: 'rate_limit'
            }
          ],
          failurePatterns: ['rate_limit_exceeded']
        },
        budgetConstraints: {
          remainingBudget: 100,
          costPerRequestLimit: 0.01,
          budgetPeriod: 'daily'
        },
        performanceContext: {
          currentLatency: 800,
          targetLatency: 600,
          currentThroughput: 50,
          targetThroughput: 100
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/routing-decision')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(routingRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedNode.nodeId).not.toBe('mapbox_primary');
      expect(response.body.data.fallbackPlan).toHaveProperty('primaryFallback');
    });
  });

  describe('Cost-Aware Fallback', () => {
    it('should make cost-aware fallback decision with budget protection', async () => {
      const fallbackRequest = {
        serviceName: 'twilio',
        operation: 'send_sms',
        originalRequest: {
          to: '+1234567890',
          message: 'Test message'
        },
        error: {
          message: 'Primary SMS service unavailable'
        },
        metadata: {
          requestId: 'fallback-test-123',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          retryCount: 1,
          maxRetries: 3
        },
        businessContext: {
          urgency: 'medium',
          customerFacing: true,
          revenueImpacting: false
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/cost-aware-fallback')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(fallbackRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('selectedProvider');
      expect(response.body.data).toHaveProperty('budgetImpact');
      expect(response.body.data).toHaveProperty('businessImpact');
      expect(response.body.data.budgetImpact.budgetUtilizationAfter).toBeLessThan(100);
      expect(response.body.data.costOptimizations).toBeInstanceOf(Array);
    });

    it('should activate emergency budget for revenue-impacting scenarios', async () => {
      const emergencyFallbackRequest = {
        serviceName: 'stripe',
        operation: 'process_refund',
        originalRequest: {
          amount: 10000,
          paymentId: 'payment-123'
        },
        error: {
          message: 'Payment processing service critical failure'
        },
        metadata: {
          requestId: 'fallback-test-124',
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          retryCount: 2,
          maxRetries: 3
        },
        businessContext: {
          urgency: 'critical',
          customerFacing: true,
          revenueImpacting: true
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/cost-aware-fallback')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(emergencyFallbackRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.businessImpact.revenueProtection).toBeGreaterThan(0);
      expect(response.body.data.emergencyMeasures?.activated).toBe(true);
    });
  });

  describe('Analytics and Monitoring', () => {
    it('should retrieve routing analytics for a service', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/routing-analytics/stripe')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('serviceName');
      expect(response.body.data).toHaveProperty('routingStrategy');
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('performanceImprovements');
      expect(response.body.data).toHaveProperty('nodeUtilization');
      expect(response.body.data.serviceName).toBe('stripe');
    });

    it('should retrieve cost monitoring data for a service', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/cost-monitoring/stripe')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('serviceName');
      expect(response.body.data).toHaveProperty('spending');
      expect(response.body.data).toHaveProperty('projections');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data.serviceName).toBe('stripe');
    });

    it('should retrieve comprehensive optimization analytics', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/optimization-analytics')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalServices');
      expect(response.body.data).toHaveProperty('totalOptimizations');
      expect(response.body.data).toHaveProperty('averageResolutionTime');
      expect(response.body.data).toHaveProperty('totalCostSavings');
      expect(response.body.data).toHaveProperty('scenarioBreakdown');
    });

    it('should retrieve active error scenarios', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/active-scenarios')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('scenarios');
      expect(response.body.data.scenarios).toBeInstanceOf(Array);
    });

    it('should generate comprehensive cost report', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/cost-report')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalServices');
      expect(response.body.data).toHaveProperty('totalBudget');
      expect(response.body.data).toHaveProperty('totalSpent');
      expect(response.body.data).toHaveProperty('overallUtilization');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('emergencyBudgetActivations');
    });

    it('should retrieve system status for routing and optimization', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/system-status')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('routing');
      expect(response.body.data).toHaveProperty('activeScenarios');
      expect(response.body.data.routing).toHaveProperty('totalServices');
      expect(response.body.data.activeScenarios).toHaveProperty('count');
    });
  });

  describe('Configuration Management', () => {
    it('should register new traffic distribution configuration', async () => {
      const trafficDistribution = {
        serviceName: 'test-service',
        distribution: {
          strategy: RoutingStrategy.COST_OPTIMIZED,
          nodes: [
            {
              nodeId: 'test_node_1',
              providerId: 'test_provider_1',
              providerName: 'Test Provider 1',
              region: 'us-east-1',
              endpoint: 'https://api.test1.com',
              weight: 60,
              maxConnections: 100,
              currentConnections: 0,
              averageResponseTime: 200,
              successRate: 99.0,
              costPerRequest: 0.01,
              healthScore: 90,
              lastHealthCheck: new Date(),
              circuitBreakerState: 'closed',
              capabilities: ['test_capability']
            },
            {
              nodeId: 'test_node_2',
              providerId: 'test_provider_2',
              providerName: 'Test Provider 2',
              region: 'us-west-2',
              endpoint: 'https://api.test2.com',
              weight: 40,
              maxConnections: 50,
              currentConnections: 0,
              averageResponseTime: 250,
              successRate: 98.5,
              costPerRequest: 0.008,
              healthScore: 85,
              lastHealthCheck: new Date(),
              circuitBreakerState: 'closed',
              capabilities: ['test_capability']
            }
          ],
          loadBalancing: {
            algorithm: 'cost_weighted',
            healthCheckInterval: 60,
            failoverThreshold: 5,
            retryBackoffMs: 1000,
            maxRetries: 3
          },
          costConstraints: {
            maxCostPerHour: 100,
            budgetAlertThreshold: 80,
            costOptimizationEnabled: true
          },
          geographicConstraints: {
            preferredRegions: ['us-east-1', 'us-west-2'],
            latencyThresholdMs: 500,
            regionFailoverEnabled: true
          },
          performanceTargets: {
            maxResponseTimeMs: 400,
            minSuccessRate: 95,
            maxErrorRate: 5
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/register-traffic-distribution')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(trafficDistribution)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceName).toBe('test-service');
      expect(response.body.data.registered).toBe(true);
    });

    it('should register budget allocation for a service', async () => {
      const budgetAllocation = {
        serviceName: 'test-budget-service',
        allocation: {
          serviceName: 'test-budget-service',
          totalBudget: 500,
          budgetPeriod: BudgetPeriod.DAILY,
          costTiers: [
            {
              tierId: 'tier_1',
              tierName: 'Standard Operations',
              maxCostPerRequest: 0.02,
              maxTotalCost: 300,
              budgetPeriod: BudgetPeriod.DAILY,
              performanceTargets: {
                maxLatencyMs: 500,
                minSuccessRate: 95,
                maxErrorRate: 5
              },
              allowedProviders: ['test_provider_1'],
              restrictions: [],
              escalationThreshold: 80
            }
          ] as CostTier[],
          emergencyBudget: {
            amount: 200,
            triggerConditions: ['service_failure'],
            approvalRequired: false,
            autoActivation: true
          },
          revenueProtection: {
            enabled: true,
            maxRevenueImpact: 1000,
            protectionThreshold: 90
          },
          costOptimization: {
            enabled: true,
            targetSavings: 20,
            optimizationStrategies: ['caching', 'rate_limiting']
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/register-budget-allocation')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(budgetAllocation)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceName).toBe('test-budget-service');
      expect(response.body.data.registered).toBe(true);
    });

    it('should handle invalid traffic distribution configuration', async () => {
      const invalidDistribution = {
        serviceName: 'invalid-service',
        distribution: {
          // Missing required fields
          nodes: []
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/register-traffic-distribution')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(invalidDistribution)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid distribution configuration');
    });

    it('should handle invalid budget allocation configuration', async () => {
      const invalidAllocation = {
        serviceName: 'invalid-budget-service',
        allocation: {
          // Missing required fields
          totalBudget: 'invalid'
        }
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/register-budget-allocation')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(invalidAllocation)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid budget allocation configuration');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status for error optimization services', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.services.routing).toBe('operational');
      expect(response.body.data.services.costManagement).toBe('operational');
      expect(response.body.data.services.optimization).toBe('operational');
      expect(response.body.data.services.fallbackManager).toBe('operational');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields in error scenario', async () => {
      const incompleteScenario = {
        serviceName: 'test-service'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/handle-scenario')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(incompleteScenario)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should handle missing required fields in routing decision', async () => {
      const incompleteRequest = {
        operation: 'test-operation'
        // Missing serviceName
      };

      const response = await request(app)
        .post('/api/v1/error-optimization/routing-decision')
        .set('Authorization', TEST_AUTH_TOKEN)
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service name and operation are required');
    });

    it('should handle invalid service name in analytics endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/error-optimization/routing-analytics/')
        .set('Authorization', TEST_AUTH_TOKEN)
        .expect(404);

      // Should return 404 for empty service name
    });
  });

  describe('Performance Testing', () => {
    it('should handle multiple concurrent error scenarios efficiently', async () => {
      const scenarios = Array.from({ length: 5 }, (_, i) => ({
        scenarioType: ErrorScenarioType.PERFORMANCE_DEGRADATION,
        serviceName: `test-service-${i}`,
        operation: 'test-operation',
        severity: 'medium',
        businessImpact: {
          revenueAtRisk: 1000,
          customerImpact: 'minor',
          operationalImpact: 'minor',
          timeToResolution: 15
        },
        errorDetails: {
          originalError: 'Service degradation',
          failedProviders: [`provider-${i}`],
          retryAttempts: 1,
          errorPattern: 'performance_issue',
          cascadingServices: []
        },
        budgetConstraints: {
          remainingBudget: 500,
          maxAllowableCost: 0.02,
          budgetPeriod: 'daily',
          emergencyBudgetAvailable: false
        },
        performanceRequirements: {
          maxLatency: 600,
          minThroughput: 75,
          minSuccessRate: 95
        },
        metadata: {
          requestId: `perf-test-${i}`,
          userId: TEST_USER.id,
          organizationId: TEST_USER.organizationId,
          priority: ServicePriority.MEDIUM,
          businessCriticality: BusinessCriticality.PERFORMANCE_OPTIMIZATION
        }
      }));

      const startTime = Date.now();
      
      const promises = scenarios.map(scenario =>
        request(app)
          .post('/api/v1/error-optimization/handle-scenario')
          .set('Authorization', TEST_AUTH_TOKEN)
          .send(scenario)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Performance requirement: should handle 5 concurrent scenarios in under 5 seconds
      expect(totalTime).toBeLessThan(5000);
      
      console.log(`Handled ${scenarios.length} concurrent scenarios in ${totalTime}ms`);
    });
  });
});

describe('Error Optimization Edge Cases', () => {
  it('should handle scenario with no available providers', async () => {
    const noProvidersScenario = {
      scenarioType: ErrorScenarioType.CASCADING_FAILURE,
      serviceName: 'unavailable-service',
      operation: 'critical-operation',
      severity: 'critical',
      businessImpact: {
        revenueAtRisk: 20000,
        customerImpact: 'severe',
        operationalImpact: 'significant',
        timeToResolution: 5
      },
      errorDetails: {
        originalError: 'All providers failed',
        failedProviders: ['provider1', 'provider2', 'provider3'],
        retryAttempts: 3,
        errorPattern: 'complete_failure',
        cascadingServices: ['dependent-service-1', 'dependent-service-2']
      },
      budgetConstraints: {
        remainingBudget: 10,
        maxAllowableCost: 0.001,
        budgetPeriod: 'daily',
        emergencyBudgetAvailable: true
      },
      performanceRequirements: {
        maxLatency: 100,
        minThroughput: 500,
        minSuccessRate: 99.9
      },
      metadata: {
        requestId: 'edge-case-1',
        userId: TEST_USER.id,
        organizationId: TEST_USER.organizationId,
        priority: ServicePriority.CRITICAL,
        businessCriticality: BusinessCriticality.REVENUE_BLOCKING
      }
    };

    const response = await request(app)
      .post('/api/v1/error-optimization/handle-scenario')
      .set('Authorization', TEST_AUTH_TOKEN)
      .send(noProvidersScenario)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.selectedStrategy).toBe(OptimizationStrategy.EMERGENCY_MODE);
    expect(response.body.data.emergencyMeasures?.activated).toBe(true);
  });

  it('should handle budget exhaustion scenario', async () => {
    const budgetExhaustionScenario = {
      scenarioType: ErrorScenarioType.BUDGET_EXHAUSTION,
      serviceName: 'expensive-service',
      operation: 'costly-operation',
      severity: 'high',
      businessImpact: {
        revenueAtRisk: 0,
        customerImpact: 'moderate',
        operationalImpact: 'moderate',
        timeToResolution: 60
      },
      errorDetails: {
        originalError: 'Budget limit reached',
        failedProviders: [],
        retryAttempts: 0,
        errorPattern: 'budget_limit',
        cascadingServices: []
      },
      budgetConstraints: {
        remainingBudget: 0,
        maxAllowableCost: 0,
        budgetPeriod: 'daily',
        emergencyBudgetAvailable: false
      },
      performanceRequirements: {
        maxLatency: 2000,
        minThroughput: 10,
        minSuccessRate: 80
      },
      metadata: {
        requestId: 'edge-case-2',
        userId: TEST_USER.id,
        organizationId: TEST_USER.organizationId,
        priority: ServicePriority.LOW,
        businessCriticality: BusinessCriticality.BACKGROUND_PROCESSING
      }
    };

    const response = await request(app)
      .post('/api/v1/error-optimization/handle-scenario')
      .set('Authorization', TEST_AUTH_TOKEN)
      .send(budgetExhaustionScenario)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.selectedStrategy).toBe(OptimizationStrategy.COST_MINIMIZATION);
    expect(response.body.data.optimizationPlan.estimatedCost).toBe(0);
  });
});