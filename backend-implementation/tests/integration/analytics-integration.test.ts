/**
 * COMPREHENSIVE ANALYTICS INTEGRATION TESTS
 * Validates the complete analytics ecosystem integration
 * 
 * Tests:
 * - API endpoint functionality
 * - Service integration
 * - Caching performance
 * - WebSocket real-time streaming
 * - Role-based access control
 * - Performance targets validation
 * - Business impact metrics
 */

import request from 'supertest';
import WebSocket from 'ws';
import { app } from '../../src/app';
import { AdvancedAnalyticsService } from '../../src/services/AdvancedAnalyticsService';
import { PredictiveIntelligenceEngine } from '../../src/services/PredictiveIntelligenceEngine';
import { BusinessIntelligenceAnalyzer } from '../../src/services/BusinessIntelligenceAnalyzer';
import { CacheService } from '../../src/services/CacheService';
import { createTestUser, createTestOrganization, getTestJWT } from '../utils/testHelpers';

describe('Analytics Integration Tests', () => {
  let testUser: any;
  let testOrganization: any;
  let authToken: string;
  let advancedAnalytics: AdvancedAnalyticsService;
  let predictiveEngine: PredictiveIntelligenceEngine;
  let businessIntelligence: BusinessIntelligenceAnalyzer;

  beforeAll(async () => {
    // Setup test data
    testOrganization = await createTestOrganization();
    testUser = await createTestUser({
      organizationId: testOrganization.id,
      role: 'admin'
    });
    authToken = await getTestJWT(testUser);
    
    // Initialize services
    advancedAnalytics = new AdvancedAnalyticsService();
    predictiveEngine = new PredictiveIntelligenceEngine();
    businessIntelligence = new BusinessIntelligenceAnalyzer();
  });

  afterAll(async () => {
    // Cleanup test data
    await CacheService.clear();
  });

  describe('Advanced Analytics Service Integration', () => {
    test('should generate executive dashboard with performance targets', async () => {
      const startTime = Date.now();
      
      const dashboard = await advancedAnalytics.generateExecutiveDashboard({
        organizationId: testOrganization.id,
        period: 'monthly',
        includeForecasting: true,
        includeComparisons: true
      });
      
      const duration = Date.now() - startTime;
      
      // Performance validation - should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      
      // Data structure validation
      expect(dashboard).toHaveProperty('executiveMetrics');
      expect(dashboard).toHaveProperty('kpis');
      expect(dashboard).toHaveProperty('forecasting');
      expect(dashboard).toHaveProperty('comparisons');
      expect(dashboard).toHaveProperty('businessImpact');
      
      // Business impact validation
      expect(dashboard.businessImpact).toHaveProperty('revenueProjection');
      expect(dashboard.businessImpact).toHaveProperty('costOptimization');
      expect(dashboard.businessImpact).toHaveProperty('efficiencyGains');
      
      // Performance metrics validation
      expect(dashboard.executiveMetrics.responseTime).toBeLessThan(5000);
      expect(dashboard.executiveMetrics.dataFreshness).toBeGreaterThan(0);
    });

    test('should generate operational intelligence with real-time data', async () => {
      const startTime = Date.now();
      
      const intelligence = await advancedAnalytics.generateOperationalIntelligence({
        organizationId: testOrganization.id,
        includeRealTime: true,
        includePerformanceMetrics: true,
        includeCostAnalysis: true
      });
      
      const duration = Date.now() - startTime;
      
      // Performance validation - should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
      
      // Data structure validation
      expect(intelligence).toHaveProperty('operationalMetrics');
      expect(intelligence).toHaveProperty('realTimeData');
      expect(intelligence).toHaveProperty('performanceAnalysis');
      expect(intelligence).toHaveProperty('costAnalysis');
      
      // Real-time data validation
      expect(intelligence.realTimeData).toHaveProperty('timestamp');
      expect(intelligence.realTimeData).toHaveProperty('liveMetrics');
      expect(intelligence.realTimeData.dataLatency).toBeLessThan(1000);
    });

    test('should generate predictive customer analytics', async () => {
      const analytics = await advancedAnalytics.generatePredictiveCustomerAnalytics({
        organizationId: testOrganization.id,
        period: 'monthly',
        includeChurnPrediction: true,
        includeSatisfactionAnalysis: true
      });
      
      expect(analytics).toHaveProperty('churnPrediction');
      expect(analytics).toHaveProperty('satisfactionAnalysis');
      expect(analytics).toHaveProperty('customerSegmentation');
      
      // Validate prediction accuracy requirements
      expect(analytics.churnPrediction.accuracy).toBeGreaterThan(0.85);
      expect(analytics.churnPrediction.confidence).toBeGreaterThan(0.8);
    });

    test('should generate real-time analytics with streaming capability', async () => {
      const realTimeData = await advancedAnalytics.generateRealTimeAnalytics({
        organizationId: testOrganization.id,
        metrics: ['fleet', 'operations', 'performance'],
        refreshInterval: 30,
        includeHistory: true
      });
      
      expect(realTimeData).toHaveProperty('liveMetrics');
      expect(realTimeData).toHaveProperty('streamingEndpoints');
      expect(realTimeData).toHaveProperty('refreshConfiguration');
      expect(realTimeData).toHaveProperty('historicalData');
      
      // Validate streaming performance
      expect(realTimeData.refreshConfiguration.interval).toBe(30);
      expect(realTimeData.liveMetrics.latency).toBeLessThan(500);
    });
  });

  describe('Predictive Intelligence Engine Integration', () => {
    test('should generate demand forecasting with 85%+ accuracy', async () => {
      const forecasting = await predictiveEngine.generateDemandForecastingIntelligence({
        organizationId: testOrganization.id,
        forecastHorizon: 30,
        confidenceLevel: 0.85,
        scenarios: ['baseline', 'optimistic', 'pessimistic']
      });
      
      expect(forecasting).toHaveProperty('demandForecasts');
      expect(forecasting).toHaveProperty('scenarios');
      expect(forecasting).toHaveProperty('accuracyMetrics');
      expect(forecasting).toHaveProperty('businessImplications');
      
      // Validate accuracy targets
      expect(forecasting.accuracyMetrics.overallAccuracy).toBeGreaterThan(0.85);
      expect(forecasting.scenarios).toHaveLength(3);
    });

    test('should generate revenue optimization intelligence', async () => {
      const optimization = await predictiveEngine.generateRevenueOptimizationIntelligence({
        organizationId: testOrganization.id,
        analysisType: 'revenue',
        period: 'quarterly',
        includeOptimization: true
      });
      
      expect(optimization).toHaveProperty('revenueAnalysis');
      expect(optimization).toHaveProperty('optimizationOpportunities');
      expect(optimization).toHaveProperty('projectedImpact');
      
      // Validate $200K+ annual churn prevention target
      const projectedSavings = optimization.projectedImpact.churnPrevention.annualSavings;
      expect(projectedSavings).toBeGreaterThan(200000);
    });

    test('should generate operational predictive intelligence', async () => {
      const intelligence = await predictiveEngine.generateOperationalPredictiveIntelligence({
        organizationId: testOrganization.id,
        analysisType: 'operational',
        period: 'monthly',
        includeMaintenancePrediction: true
      });
      
      expect(intelligence).toHaveProperty('operationalPredictions');
      expect(intelligence).toHaveProperty('maintenanceForecasting');
      expect(intelligence).toHaveProperty('efficiencyOptimization');
      
      // Validate 30-50% operational efficiency improvement target
      const efficiencyGain = intelligence.efficiencyOptimization.projectedImprovement;
      expect(efficiencyGain).toBeGreaterThan(0.3);
      expect(efficiencyGain).toBeLessThan(0.65);
    });
  });

  describe('Business Intelligence Analyzer Integration', () => {
    test('should generate executive business intelligence', async () => {
      const intelligence = await businessIntelligence.generateExecutiveBusinessIntelligence({
        organizationId: testOrganization.id,
        analysisType: 'comprehensive',
        period: 'quarterly',
        includeRevenueAnalysis: true,
        includeCostAnalysis: true
      });
      
      expect(intelligence).toHaveProperty('executiveSummary');
      expect(intelligence).toHaveProperty('strategicInsights');
      expect(intelligence).toHaveProperty('businessMetrics');
      expect(intelligence).toHaveProperty('actionableRecommendations');
      
      // Validate $2M+ MRR growth targeting
      const mrrProjection = intelligence.businessMetrics.revenueProjections.mrrGrowth;
      expect(mrrProjection).toBeGreaterThan(2000000);
    });

    test('should generate strategic intelligence dashboard', async () => {
      const dashboard = await businessIntelligence.generateStrategicIntelligenceDashboard({
        organizationId: testOrganization.id,
        analysisType: 'strategic',
        period: 'quarterly',
        includeMarketAnalysis: true,
        includeInvestmentAnalysis: true
      });
      
      expect(dashboard).toHaveProperty('strategicOverview');
      expect(dashboard).toHaveProperty('marketIntelligence');
      expect(dashboard).toHaveProperty('investmentAnalysis');
      expect(dashboard).toHaveProperty('competitiveAnalysis');
    });
  });

  describe('Analytics API Endpoints Integration', () => {
    test('GET /api/v1/analytics/executive/metrics should return executive dashboard', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/executive/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          organizationId: testOrganization.id,
          period: 'monthly'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('executiveMetrics');
      expect(response.body.data).toHaveProperty('kpis');
      expect(response.body.data).toHaveProperty('forecasting');
      
      // Response time validation
      expect(response.header['x-response-time']).toBeDefined();
    });

    test('GET /api/v1/analytics/operations/metrics should return operational intelligence', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/operations/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: testOrganization.id })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('operationalMetrics');
      expect(response.body.data).toHaveProperty('realTimeData');
    });

    test('GET /api/v1/analytics/fleet/metrics should return fleet analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/fleet/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          organizationId: testOrganization.id,
          period: 'daily'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('operationalMetrics');
    });

    test('GET /api/v1/analytics/financial/metrics should return financial analysis', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/financial/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          organizationId: testOrganization.id,
          period: 'monthly'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('executiveSummary');
    });

    test('GET /api/v1/analytics/customers/analytics should return customer insights', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/customers/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: testOrganization.id })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('churnPrediction');
    });

    test('GET /api/v1/analytics/realtime/stream should return real-time data', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/realtime/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          organizationId: testOrganization.id,
          metrics: 'fleet,operations',
          interval: 30
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('liveMetrics');
    });

    test('POST /api/v1/analytics/predictions/generate should create predictions', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/predictions/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: testOrganization.id })
        .send({
          horizon: 30,
          confidence: 0.85,
          scenarios: ['baseline', 'optimistic'],
          includeInterventions: true
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('demandForecasts');
    });

    test('GET /api/v1/analytics/intelligence/strategic should return strategic intelligence', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/intelligence/strategic')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          organizationId: testOrganization.id,
          period: 'quarterly'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('strategicOverview');
    });
  });

  describe('Caching Performance Integration', () => {
    test('should implement intelligent caching with proper TTL values', async () => {
      // First request - should populate cache
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/v1/analytics/executive/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: testOrganization.id })
        .expect(200);
      const duration1 = Date.now() - startTime1;
      
      // Second request - should hit cache (much faster)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/v1/analytics/executive/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: testOrganization.id })
        .expect(200);
      const duration2 = Date.now() - startTime2;
      
      // Cache hit should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      expect(response1.body.data).toEqual(response2.body.data);
    });

    test('should support cache invalidation and refresh', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/cache/invalidate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationId: testOrganization.id })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.invalidated).toBe(true);
    });
  });

  describe('Role-Based Access Control Integration', () => {
    test('should restrict access based on user roles', async () => {
      // Create a limited role user
      const limitedUser = await createTestUser({
        organizationId: testOrganization.id,
        role: 'customer_service'
      });
      const limitedToken = await getTestJWT(limitedUser);
      
      // Should have access to customer analytics
      await request(app)
        .get('/api/v1/analytics/customers/analytics')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200);
      
      // Should NOT have access to executive metrics
      await request(app)
        .get('/api/v1/analytics/executive/metrics')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });

  describe('WebSocket Real-Time Streaming Integration', () => {
    test('should establish WebSocket connection and receive real-time data', (done) => {
      const ws = new WebSocket('ws://localhost:3000/ws/analytics');
      let messageReceived = false;
      
      ws.on('open', () => {
        // Subscribe to operational metrics
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'operational-metrics',
          timestamp: Date.now()
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'metric' && message.channel === 'operational-metrics') {
          expect(message).toHaveProperty('data');
          expect(message).toHaveProperty('timestamp');
          messageReceived = true;
        }
        
        if (message.type === 'status' && message.data.subscribed) {
          expect(message.data.subscribed).toBe('operational-metrics');
        }
      });
      
      // Wait for real-time data
      setTimeout(() => {
        expect(messageReceived).toBe(true);
        ws.close();
        done();
      }, 15000); // Wait 15 seconds for operational metrics update
    });

    test('should handle WebSocket subscriptions and unsubscriptions', (done) => {
      const ws = new WebSocket('ws://localhost:3000/ws/analytics');
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'fleet-status',
          timestamp: Date.now()
        }));
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            channel: 'fleet-status',
            timestamp: Date.now()
          }));
        }, 2000);
      });
      
      let subscribed = false;
      let unsubscribed = false;
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'status') {
          if (message.data.subscribed === 'fleet-status') {
            subscribed = true;
          }
          if (message.data.unsubscribed === 'fleet-status') {
            unsubscribed = true;
          }
        }
      });
      
      setTimeout(() => {
        expect(subscribed).toBe(true);
        expect(unsubscribed).toBe(true);
        ws.close();
        done();
      }, 5000);
    });
  });

  describe('Performance Targets Validation', () => {
    test('should meet response time performance targets', async () => {
      const endpoints = [
        '/api/v1/analytics/executive/metrics',
        '/api/v1/analytics/operations/metrics',
        '/api/v1/analytics/fleet/metrics',
        '/api/v1/analytics/performance/metrics'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ organizationId: testOrganization.id })
          .expect(200);
        
        const duration = Date.now() - startTime;
        
        // Each endpoint should respond within 5 seconds
        expect(duration).toBeLessThan(5000);
      }
    });

    test('should validate business impact metrics targets', async () => {
      const dashboard = await advancedAnalytics.generateExecutiveDashboard({
        organizationId: testOrganization.id,
        period: 'monthly',
        includeForecasting: true
      });
      
      const businessImpact = dashboard.businessImpact;
      
      // Validate $2M+ MRR growth target
      expect(businessImpact.revenueProjection.mrrGrowth).toBeGreaterThan(2000000);
      
      // Validate 30-50% operational efficiency improvement
      const efficiencyGain = businessImpact.efficiencyGains.operationalImprovement;
      expect(efficiencyGain).toBeGreaterThan(0.3);
      expect(efficiencyGain).toBeLessThan(0.65);
      
      // Validate $200K+ annual churn prevention savings
      expect(businessImpact.costOptimization.churnPreventionSavings).toBeGreaterThan(200000);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle service failures gracefully', async () => {
      // Test with invalid organization ID
      const response = await request(app)
        .get('/api/v1/analytics/executive/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId: 99999 })
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle rate limiting correctly', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/analytics/executive/metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ organizationId: testOrganization.id })
      );
      
      const responses = await Promise.allSettled(requests);
      
      // All requests should either succeed (200) or be rate limited (429)
      responses.forEach((response) => {
        if (response.status === 'fulfilled') {
          expect([200, 429]).toContain(response.value.status);
        }
      });
    });
  });
});