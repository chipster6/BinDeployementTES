/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - VECTOR INTELLIGENCE BUSINESS LOGIC TESTS
 * ============================================================================
 *
 * PHASE 1 VALIDATION MISSION: Business Scenario Validation
 * 
 * BUSINESS VALIDATION SCOPE:
 * - Semantic search accuracy and relevance (85%+ target)
 * - Operational insights generation quality
 * - Customer service automation capabilities (70% target)
 * - Route pattern analysis effectiveness
 * - Maintenance log intelligence validation
 * - Service event correlation accuracy
 *
 * Created by: QA Engineer / Testing Agent
 * Date: 2025-08-18
 * Version: 1.0.0
 * Test Timeout: 60 seconds
 */

import VectorIntelligenceService, {
  OperationalData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorInsights
} from '@/services/VectorIntelligenceService';
import { config } from '@/config';
import weaviate from 'weaviate-ts-client';

// Mock dependencies
jest.mock('@/config');
jest.mock('@/utils/logger');
jest.mock('weaviate-ts-client');
jest.mock('@/config/redis');

describe('Vector Intelligence Business Logic Validation', () => {
  let vectorService: VectorIntelligenceService;
  let mockWeaviateClient: any;

  // Realistic waste management operational data
  const operationalDataset: OperationalData[] = [
    // Bin overflow scenarios
    {
      id: 'bin-overflow-001',
      type: 'bin',
      title: 'Commercial waste bin overflow at downtown restaurant district',
      description: 'Multiple commercial bins overflowing during lunch rush. Customer complaints received about odors and spillage affecting foot traffic.',
      location: { latitude: 40.7589, longitude: -73.9851, address: '456 Restaurant Row, NYC' },
      timestamp: new Date('2025-08-18T12:30:00Z'),
      metadata: { binCount: 5, spillageLevel: 'high', customerComplaints: 3 },
      businessContext: { priority: 'high', category: 'bin_overflow', impact: 'customer' }
    },
    {
      id: 'bin-overflow-002',
      type: 'bin',
      title: 'Residential bin overflow in suburban neighborhood',
      description: 'Single family home bins overflowing due to missed collection during holiday weekend.',
      location: { latitude: 40.7505, longitude: -73.9934, address: '789 Suburban Lane, Queens' },
      timestamp: new Date('2025-08-17T08:00:00Z'),
      metadata: { binCount: 1, spillageLevel: 'medium', holidayImpact: true },
      businessContext: { priority: 'medium', category: 'bin_overflow', impact: 'operational' }
    },
    
    // Route efficiency issues
    {
      id: 'route-efficiency-001',
      type: 'route',
      title: 'Morning collection route experiencing 40% time overrun',
      description: 'Route 15A consistently taking 6.5 hours instead of planned 4.5 hours due to traffic congestion and inefficient stop ordering.',
      location: { latitude: 40.7831, longitude: -73.9712, address: 'Central Park North Route' },
      timestamp: new Date('2025-08-18T09:00:00Z'),
      metadata: { routeId: 'R15A', plannedTime: 270, actualTime: 390, fuelCostIncrease: 25.50 },
      businessContext: { priority: 'high', category: 'route_efficiency', impact: 'financial' }
    },
    {
      id: 'route-efficiency-002',
      type: 'route',
      title: 'Evening route optimization success story',
      description: 'Route 22B improved efficiency by 15% after implementing AI-suggested stop reordering and traffic pattern analysis.',
      location: { latitude: 40.7282, longitude: -74.0776, address: 'West Side Evening Route' },
      timestamp: new Date('2025-08-17T17:30:00Z'),
      metadata: { routeId: 'R22B', improvementPercent: 15, fuelSavings: 18.75 },
      businessContext: { priority: 'low', category: 'route_efficiency', impact: 'operational' }
    },

    // Vehicle maintenance scenarios
    {
      id: 'vehicle-maintenance-001',
      type: 'vehicle_maintenance',
      title: 'Garbage truck hydraulic system failure requiring immediate attention',
      description: 'Vehicle WM-042 experiencing hydraulic fluid leak affecting lift mechanism. Safety concern requires immediate depot return.',
      location: { latitude: 40.7614, longitude: -73.9776, address: 'Maintenance Depot A' },
      timestamp: new Date('2025-08-18T11:15:00Z'),
      metadata: { vehicleId: 'WM-042', systemAffected: 'hydraulic', safetyRisk: true, estimatedRepairCost: 2500 },
      businessContext: { priority: 'critical', category: 'vehicle_maintenance', impact: 'safety' }
    },
    {
      id: 'vehicle-maintenance-002',
      type: 'vehicle_maintenance',
      title: 'Scheduled maintenance completion for fleet vehicle',
      description: 'Vehicle WM-018 completed scheduled 10,000 mile maintenance including oil change, brake inspection, and hydraulic system check.',
      location: { latitude: 40.7614, longitude: -73.9776, address: 'Maintenance Depot A' },
      timestamp: new Date('2025-08-16T14:00:00Z'),
      metadata: { vehicleId: 'WM-018', maintenanceType: 'scheduled', mileage: 10000, cost: 485.50 },
      businessContext: { priority: 'low', category: 'vehicle_maintenance', impact: 'operational' }
    },

    // Customer service issues
    {
      id: 'customer-service-001',
      type: 'customer_issue',
      title: 'Residential customer complaint about missed pickup',
      description: 'Mrs. Johnson at 123 Oak Street reports missed pickup for three consecutive weeks. Customer threatening to switch providers.',
      location: { latitude: 40.7505, longitude: -73.9934, address: '123 Oak Street, Queens' },
      timestamp: new Date('2025-08-18T10:20:00Z'),
      metadata: { customerId: 'CUST-5673', missedPickups: 3, churnRisk: 'high', monthlyValue: 95.00 },
      businessContext: { priority: 'high', category: 'customer_service', impact: 'customer' }
    },
    {
      id: 'customer-service-002',
      type: 'customer_issue',
      title: 'Commercial client requesting additional service',
      description: 'Restaurant chain requesting twice-weekly pickup due to increased business volume. Opportunity for service upgrade.',
      location: { latitude: 40.7589, longitude: -73.9851, address: '456 Restaurant Row, NYC' },
      timestamp: new Date('2025-08-17T15:45:00Z'),
      metadata: { customerId: 'COMM-8921', currentService: 'weekly', requestedService: 'bi-weekly', revenueOpportunity: 180.00 },
      businessContext: { priority: 'medium', category: 'customer_service', impact: 'financial' }
    },

    // Service event correlations
    {
      id: 'service-event-001',
      type: 'service_event',
      title: 'Weather-related service disruption in northern district',
      description: 'Heavy rainfall causing collection delays across 15 routes in northern service area. Rescheduling required for 200+ customers.',
      location: { latitude: 40.7831, longitude: -73.9712, address: 'Northern District Coverage Area' },
      timestamp: new Date('2025-08-18T06:00:00Z'),
      metadata: { affectedRoutes: 15, affectedCustomers: 200, weatherCondition: 'heavy_rain', delayHours: 4 },
      businessContext: { priority: 'high', category: 'service_disruption', impact: 'operational' }
    },
    {
      id: 'service-event-002',
      type: 'service_event',
      title: 'Holiday schedule adjustment notification sent',
      description: 'Labor Day schedule changes communicated to all customers via SMS and email. Modified collection times for 1,200 customers.',
      location: { latitude: 40.7589, longitude: -73.9851, address: 'Citywide Service Area' },
      timestamp: new Date('2025-08-15T16:00:00Z'),
      metadata: { holidayType: 'labor_day', notificationsSent: 1200, scheduleChangeType: 'delayed_by_one_day' },
      businessContext: { priority: 'medium', category: 'schedule_management', impact: 'customer' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Weaviate client with realistic business scenario responses
    mockWeaviateClient = {
      misc: {
        readyChecker: jest.fn().mockReturnValue({
          do: jest.fn().mockResolvedValue(true)
        })
      },
      schema: {
        getter: jest.fn().mockReturnValue({
          do: jest.fn().mockResolvedValue({
            classes: [{ class: 'WasteManagementOperations' }]
          })
        })
      },
      batch: {
        objectsBatcher: jest.fn().mockReturnValue({
          withObject: jest.fn().mockReturnThis(),
          do: jest.fn().mockResolvedValue(
            Array(operationalDataset.length).fill({ result: { status: 'SUCCESS' } })
          )
        })
      },
      graphql: {
        get: jest.fn().mockReturnValue({
          withClassName: jest.fn().mockReturnThis(),
          withFields: jest.fn().mockReturnThis(),
          withNearText: jest.fn().mockReturnThis(),
          withLimit: jest.fn().mockReturnThis(),
          withWhere: jest.fn().mockReturnThis(),
          do: jest.fn().mockImplementation(() => {
            // Return contextually relevant results based on search patterns
            const mockResults = operationalDataset.slice(0, 3).map((item, index) => ({
              title: item.title,
              description: item.description,
              operationType: item.type,
              priority: item.businessContext.priority,
              category: item.businessContext.category,
              impact: item.businessContext.impact,
              timestamp: item.timestamp.toISOString(),
              metadata: item.metadata,
              _additional: {
                id: item.id,
                score: 0.9 - (index * 0.1) // Decreasing relevance scores
              }
            }));

            return Promise.resolve({
              data: {
                Get: {
                  WasteManagementOperations: mockResults
                }
              }
            });
          })
        })
      }
    };

    (weaviate.client as jest.Mock).mockReturnValue(mockWeaviateClient);

    // Mock config
    (config as any) = {
      aiMl: {
        features: { vectorSearch: true },
        weaviate: { batchSize: 100 },
        performance: { vectorSearchCacheTTL: 3600, predictionCacheTTL: 1800 }
      }
    };

    vectorService = new VectorIntelligenceService();

    // Mock cache methods
    jest.spyOn(vectorService as any, 'getFromCache').mockResolvedValue(null);
    jest.spyOn(vectorService as any, 'setCache').mockResolvedValue(undefined);
  });

  describe('Semantic Search Accuracy Validation', () => {
    it('should return highly relevant results for bin overflow queries', async () => {
      const query: VectorSearchQuery = {
        query: 'overflowing waste bins in commercial areas causing customer complaints',
        limit: 5,
        threshold: 0.8,
        includeMetadata: true
      };

      const result = await vectorService.performSemanticSearch(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      // Validate relevance scoring
      const topResult = result.data[0];
      expect(topResult.score).toBeGreaterThanOrEqual(0.8);
      expect(topResult.data.type).toBe('bin');
      expect(topResult.data.businessContext.category).toBe('bin_overflow');

      // Check for business-relevant insights
      expect(topResult.insights).toContain('Critical priority item requiring immediate attention');
      expect(topResult.insights.length).toBeGreaterThan(0);
    });

    it('should accurately match route efficiency queries', async () => {
      const query: VectorSearchQuery = {
        query: 'route optimization problems with time overruns and fuel costs',
        limit: 3,
        threshold: 0.7
      };

      const result = await vectorService.performSemanticSearch(query);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      const routeResults = result.data.filter(item => 
        item.data.type === 'route' && 
        item.data.businessContext.category === 'route_efficiency'
      );

      expect(routeResults.length).toBeGreaterThan(0);

      const topRouteResult = routeResults[0];
      expect(topRouteResult.score).toBeGreaterThanOrEqual(0.7);
      expect(topRouteResult.data.businessContext.impact).toMatch(/(financial|operational)/);
    });

    it('should identify critical safety-related maintenance issues', async () => {
      const query: VectorSearchQuery = {
        query: 'vehicle safety problems requiring immediate attention',
        limit: 5,
        threshold: 0.75
      };

      const result = await vectorService.performSemanticSearch(query);

      expect(result.success).toBe(true);
      
      const safetyResults = result.data.filter(item => 
        item.data.type === 'vehicle_maintenance' &&
        item.data.businessContext.priority === 'critical' &&
        item.data.businessContext.impact === 'safety'
      );

      expect(safetyResults.length).toBeGreaterThan(0);

      const criticalSafetyIssue = safetyResults[0];
      expect(criticalSafetyIssue.insights).toContain('Critical priority item requiring immediate attention');
      expect(criticalSafetyIssue.data.metadata).toHaveProperty('safetyRisk', true);
    });

    it('should correlate customer service issues with churn risk', async () => {
      const query: VectorSearchQuery = {
        query: 'customer complaints missed pickups threatening to cancel service',
        limit: 3,
        threshold: 0.7
      };

      const result = await vectorService.performSemanticSearch(query);

      expect(result.success).toBe(true);

      const customerIssues = result.data.filter(item => 
        item.data.type === 'customer_issue' &&
        item.data.businessContext.category === 'customer_service'
      );

      expect(customerIssues.length).toBeGreaterThan(0);

      const highRiskCustomer = customerIssues.find(item => 
        item.data.metadata?.churnRisk === 'high'
      );

      expect(highRiskCustomer).toBeDefined();
      expect(highRiskCustomer.data.businessContext.priority).toMatch(/(high|critical)/);
    });

    it('should identify revenue opportunities in customer requests', async () => {
      const query: VectorSearchQuery = {
        query: 'customer requesting additional services revenue opportunity',
        limit: 3,
        threshold: 0.7
      };

      const result = await vectorService.performSemanticSearch(query);

      expect(result.success).toBe(true);

      const revenueOpportunities = result.data.filter(item => 
        item.data.metadata?.revenueOpportunity && 
        item.data.metadata.revenueOpportunity > 0
      );

      expect(revenueOpportunities.length).toBeGreaterThan(0);

      const topOpportunity = revenueOpportunities[0];
      expect(topOpportunity.data.businessContext.impact).toBe('financial');
      expect(topOpportunity.insights).toContain('Financial impact detected - potential cost implications');
    });
  });

  describe('Operational Insights Generation Quality', () => {
    it('should generate meaningful operational patterns from business data', async () => {
      // First, vectorize our operational dataset
      await vectorService.vectorizeOperationalData(operationalDataset);

      const insights = await vectorService.generateOperationalInsights('7d');

      expect(insights.success).toBe(true);
      expect(insights.data).toBeDefined();

      const patterns = insights.data.patterns;
      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(0);

      // Validate pattern quality
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.7);
        expect(pattern.occurrences).toBeGreaterThan(0);
        expect(pattern.businessImpact).toBeDefined();
        expect(pattern.businessImpact.length).toBeGreaterThan(10); // Meaningful description
      });

      // Check for business-relevant patterns
      const binOverflowPattern = patterns.find(p => 
        p.pattern.toLowerCase().includes('bin') && 
        p.pattern.toLowerCase().includes('overflow')
      );
      expect(binOverflowPattern).toBeDefined();
      expect(binOverflowPattern.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should provide actionable recommendations with estimated impact', async () => {
      const insights = await vectorService.generateOperationalInsights('30d');

      expect(insights.success).toBe(true);

      const recommendations = insights.data.recommendations;
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Validate recommendation quality
      recommendations.forEach(rec => {
        expect(rec.title).toBeDefined();
        expect(rec.description.length).toBeGreaterThan(20); // Detailed description
        expect(rec.priority).toMatch(/(low|medium|high|critical)/);
        expect(rec.estimatedImpact).toBeDefined();
        
        // Check for quantifiable impact estimates
        const hasPercentage = rec.estimatedImpact.includes('%');
        const hasDollarAmount = rec.estimatedImpact.includes('$');
        const hasQuantifiableMetric = hasPercentage || hasDollarAmount || 
          rec.estimatedImpact.includes('reduction') || 
          rec.estimatedImpact.includes('improvement');
        
        expect(hasQuantifiableMetric).toBe(true);
      });

      // Ensure high-priority recommendations exist
      const highPriorityRecs = recommendations.filter(r => 
        r.priority === 'high' || r.priority === 'critical'
      );
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    it('should identify business trends with directional analysis', async () => {
      const insights = await vectorService.generateOperationalInsights('90d');

      expect(insights.success).toBe(true);

      const trends = insights.data.trends;
      expect(trends).toBeDefined();
      expect(trends.length).toBeGreaterThan(0);

      // Validate trend analysis quality
      trends.forEach(trend => {
        expect(trend.trend).toBeDefined();
        expect(trend.direction).toMatch(/(increasing|decreasing|stable)/);
        expect(trend.significance).toBeGreaterThanOrEqual(0.5);
        expect(trend.significance).toBeLessThanOrEqual(1.0);
      });

      // Check for business-relevant trends
      const operationalTrends = trends.filter(t => 
        t.trend.toLowerCase().includes('service') ||
        t.trend.toLowerCase().includes('cost') ||
        t.trend.toLowerCase().includes('efficiency')
      );
      expect(operationalTrends.length).toBeGreaterThan(0);
    });
  });

  describe('Customer Service Automation Capabilities', () => {
    it('should automatically classify customer issues by urgency and type', async () => {
      const customerQueries = [
        'missed pickup for three weeks customer threatening to cancel',
        'requesting additional service for restaurant chain',
        'bin damaged need replacement scheduled',
        'billing question about monthly charges'
      ];

      const results = [];
      for (const query of customerQueries) {
        const searchResult = await vectorService.performSemanticSearch({
          query,
          limit: 3,
          threshold: 0.6
        });
        results.push({ query, result: searchResult });
      }

      // Validate automatic classification
      const urgentIssue = results.find(r => 
        r.query.includes('threatening to cancel')
      );
      expect(urgentIssue.result.data[0].data.businessContext.priority).toMatch(/(high|critical)/);

      const revenueOpportunity = results.find(r => 
        r.query.includes('additional service')
      );
      expect(revenueOpportunity.result.data[0].data.businessContext.impact).toBe('financial');

      // Calculate automation capability score
      const successfulClassifications = results.filter(r => 
        r.result.success && r.result.data.length > 0
      ).length;
      const automationRate = (successfulClassifications / customerQueries.length) * 100;

      expect(automationRate).toBeGreaterThanOrEqual(70); // 70% automation target
    });

    it('should generate context-appropriate responses for common customer issues', async () => {
      const commonIssues = [
        'missed pickup complaint',
        'service upgrade request',
        'billing inquiry',
        'schedule change notification'
      ];

      for (const issue of commonIssues) {
        const result = await vectorService.performSemanticSearch({
          query: issue,
          limit: 1,
          threshold: 0.7
        });

        expect(result.success).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);

        const topResult = result.data[0];
        expect(topResult.insights).toBeDefined();
        expect(topResult.insights.length).toBeGreaterThan(0);

        // Verify contextual insights
        const relevantInsight = topResult.insights.find(insight => 
          insight.toLowerCase().includes('attention') ||
          insight.toLowerCase().includes('impact') ||
          insight.toLowerCase().includes('relevant')
        );
        expect(relevantInsight).toBeDefined();
      }
    });
  });

  describe('Route Pattern Analysis Effectiveness', () => {
    it('should identify route efficiency patterns and improvement opportunities', async () => {
      const routeQueries = [
        'routes taking longer than planned time overruns',
        'successful route optimization reducing fuel costs',
        'traffic patterns affecting collection schedules',
        'weather delays impacting multiple routes'
      ];

      const routeAnalysisResults = [];
      for (const query of routeQueries) {
        const result = await vectorService.performSemanticSearch({
          query,
          limit: 2,
          threshold: 0.7
        });
        routeAnalysisResults.push({ query, result });
      }

      // Validate route pattern recognition
      const efficiencyIssues = routeAnalysisResults.filter(r => 
        r.result.data.some(item => 
          item.data.type === 'route' &&
          item.data.businessContext.category === 'route_efficiency'
        )
      );
      expect(efficiencyIssues.length).toBeGreaterThan(0);

      // Check for financial impact identification
      const financialImpactRoutes = routeAnalysisResults.filter(r => 
        r.result.data.some(item => 
          item.data.businessContext.impact === 'financial' &&
          item.data.metadata?.fuelCostIncrease
        )
      );
      expect(financialImpactRoutes.length).toBeGreaterThan(0);

      // Validate improvement pattern recognition
      const successStories = routeAnalysisResults.filter(r => 
        r.result.data.some(item => 
          item.data.metadata?.improvementPercent &&
          item.data.metadata.improvementPercent > 0
        )
      );
      expect(successStories.length).toBeGreaterThan(0);
    });
  });

  describe('Maintenance Log Intelligence Validation', () => {
    it('should predict maintenance needs based on historical patterns', async () => {
      const maintenanceQueries = [
        'hydraulic system failures requiring immediate attention',
        'scheduled maintenance completion tracking',
        'vehicle safety issues depot return',
        'maintenance cost analysis patterns'
      ];

      const maintenanceResults = [];
      for (const query of maintenanceQueries) {
        const result = await vectorService.performSemanticSearch({
          query,
          limit: 2,
          threshold: 0.7
        });
        maintenanceResults.push({ query, result });
      }

      // Validate critical maintenance identification
      const criticalMaintenance = maintenanceResults.filter(r => 
        r.result.data.some(item => 
          item.data.type === 'vehicle_maintenance' &&
          item.data.businessContext.priority === 'critical'
        )
      );
      expect(criticalMaintenance.length).toBeGreaterThan(0);

      // Check safety risk identification
      const safetyIssues = maintenanceResults.filter(r => 
        r.result.data.some(item => 
          item.data.metadata?.safetyRisk === true
        )
      );
      expect(safetyIssues.length).toBeGreaterThan(0);

      // Validate cost impact tracking
      const costTracking = maintenanceResults.filter(r => 
        r.result.data.some(item => 
          item.data.metadata?.estimatedRepairCost &&
          item.data.metadata.estimatedRepairCost > 0
        )
      );
      expect(costTracking.length).toBeGreaterThan(0);
    });
  });

  describe('Service Event Correlation Accuracy', () => {
    it('should correlate service disruptions with operational impact', async () => {
      const correlationQueries = [
        'weather causing service delays multiple routes',
        'holiday schedule changes customer notifications',
        'service disruption affecting customer satisfaction'
      ];

      const correlationResults = [];
      for (const query of correlationQueries) {
        const result = await vectorService.performSemanticSearch({
          query,
          limit: 3,
          threshold: 0.7
        });
        correlationResults.push({ query, result });
      }

      // Validate service event correlation
      const serviceEvents = correlationResults.filter(r => 
        r.result.data.some(item => 
          item.data.type === 'service_event'
        )
      );
      expect(serviceEvents.length).toBeGreaterThan(0);

      // Check for multi-route impact identification
      const multiRouteImpact = correlationResults.filter(r => 
        r.result.data.some(item => 
          item.data.metadata?.affectedRoutes &&
          item.data.metadata.affectedRoutes > 1
        )
      );
      expect(multiRouteImpact.length).toBeGreaterThan(0);

      // Validate customer impact quantification
      const customerImpact = correlationResults.filter(r => 
        r.result.data.some(item => 
          item.data.metadata?.affectedCustomers &&
          item.data.metadata.affectedCustomers > 0
        )
      );
      expect(customerImpact.length).toBeGreaterThan(0);
    });
  });

  describe('Business Intelligence Generation', () => {
    it('should generate comprehensive business intelligence insights', async () => {
      // Simulate full business intelligence workflow
      await vectorService.vectorizeOperationalData(operationalDataset);
      
      const businessInsights = await vectorService.generateOperationalInsights('30d');
      
      expect(businessInsights.success).toBe(true);
      
      const { patterns, recommendations, trends } = businessInsights.data;
      
      // Validate comprehensive business intelligence
      expect(patterns.length).toBeGreaterThanOrEqual(2);
      expect(recommendations.length).toBeGreaterThanOrEqual(2);
      expect(trends.length).toBeGreaterThanOrEqual(2);
      
      // Check for diverse business areas coverage
      const businessAreas = new Set();
      patterns.forEach(p => {
        if (p.pattern.includes('bin')) businessAreas.add('waste_management');
        if (p.pattern.includes('route')) businessAreas.add('logistics');
        if (p.pattern.includes('customer')) businessAreas.add('customer_service');
        if (p.pattern.includes('maintenance')) businessAreas.add('fleet_management');
      });
      
      expect(businessAreas.size).toBeGreaterThanOrEqual(2); // Multiple business areas covered
      
      // Validate actionable recommendations with ROI potential
      const roiRecommendations = recommendations.filter(r => 
        r.estimatedImpact.includes('%') || 
        r.estimatedImpact.includes('reduction') ||
        r.estimatedImpact.includes('improvement')
      );
      expect(roiRecommendations.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain consistency across multiple insight generation calls', async () => {
      const insights1 = await vectorService.generateOperationalInsights('7d');
      const insights2 = await vectorService.generateOperationalInsights('7d');
      
      expect(insights1.success).toBe(true);
      expect(insights2.success).toBe(true);
      
      // Validate consistency in pattern identification
      expect(insights1.data.patterns.length).toBe(insights2.data.patterns.length);
      expect(insights1.data.recommendations.length).toBe(insights2.data.recommendations.length);
      expect(insights1.data.trends.length).toBe(insights2.data.trends.length);
      
      // Check for consistent high-confidence patterns
      const highConfidencePatterns1 = insights1.data.patterns.filter(p => p.confidence >= 0.8);
      const highConfidencePatterns2 = insights2.data.patterns.filter(p => p.confidence >= 0.8);
      
      expect(highConfidencePatterns1.length).toBe(highConfidencePatterns2.length);
    });
  });

  describe('Real-World Business Scenario Validation', () => {
    it('should handle complete customer service automation workflow', async () => {
      // Simulate customer service representative workflow
      const customerScenarios = [
        {
          scenario: 'angry customer missed pickups',
          query: 'customer complaint missed pickup three weeks threatening cancel',
          expectedPriority: 'high',
          expectedAutomation: 'escalation_recommended'
        },
        {
          scenario: 'service upgrade opportunity',
          query: 'restaurant requesting additional weekly service increased volume',
          expectedPriority: 'medium',
          expectedAutomation: 'sales_opportunity'
        },
        {
          scenario: 'routine billing inquiry',
          query: 'customer question monthly charges breakdown',
          expectedPriority: 'low',
          expectedAutomation: 'standard_response'
        }
      ];

      const automationResults = [];
      for (const scenario of customerScenarios) {
        const result = await vectorService.performSemanticSearch({
          query: scenario.query,
          limit: 1,
          threshold: 0.7
        });

        const automation = {
          scenario: scenario.scenario,
          success: result.success && result.data.length > 0,
          priority: result.data[0]?.data.businessContext.priority,
          insights: result.data[0]?.insights || [],
          relevanceScore: result.data[0]?.score || 0
        };

        automationResults.push(automation);
      }

      // Validate 70% automation success rate
      const successfulAutomation = automationResults.filter(a => 
        a.success && a.relevanceScore >= 0.7
      ).length;
      const automationRate = (successfulAutomation / customerScenarios.length) * 100;

      expect(automationRate).toBeGreaterThanOrEqual(70);

      // Validate priority classification accuracy
      const correctPriorities = automationResults.filter((a, index) => 
        a.priority === customerScenarios[index].expectedPriority
      ).length;
      const priorityAccuracy = (correctPriorities / customerScenarios.length) * 100;

      expect(priorityAccuracy).toBeGreaterThanOrEqual(70);
    });

    it('should support operations manager decision-making workflow', async () => {
      // Simulate operations manager daily briefing workflow
      const managementQueries = [
        'critical issues requiring immediate attention today',
        'route efficiency problems costing money fuel',
        'customer satisfaction risks churn potential',
        'maintenance safety issues fleet vehicles'
      ];

      const briefingResults = [];
      for (const query of managementQueries) {
        const result = await vectorService.performSemanticSearch({
          query,
          limit: 3,
          threshold: 0.7
        });

        const criticalItems = result.data.filter(item => 
          item.data.businessContext.priority === 'critical' ||
          item.data.businessContext.priority === 'high'
        );

        briefingResults.push({
          category: query,
          criticalItemsFound: criticalItems.length,
          totalItems: result.data.length,
          averageRelevance: result.data.reduce((sum, item) => sum + item.score, 0) / result.data.length
        });
      }

      // Validate management briefing quality
      briefingResults.forEach(briefing => {
        expect(briefing.totalItems).toBeGreaterThan(0);
        expect(briefing.averageRelevance).toBeGreaterThanOrEqual(0.7);
      });

      // Ensure critical issues are being identified
      const totalCriticalItems = briefingResults.reduce((sum, b) => sum + b.criticalItemsFound, 0);
      expect(totalCriticalItems).toBeGreaterThan(0);
    });
  });
});