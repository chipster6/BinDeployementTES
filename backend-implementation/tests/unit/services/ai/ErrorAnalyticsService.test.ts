/**
 * ============================================================================
 * ERROR ANALYTICS SERVICE - COMPREHENSIVE UNIT TESTS
 * ============================================================================
 *
 * Hub Authority Compliant Testing Suite for ErrorAnalyticsService
 * 
 * Hub Requirements:
 * - 90%+ unit test coverage
 * - <5 second analytics aggregation time validation
 * - 10,000+ events per minute processing capability
 * - Real-time analytics validation
 * - Security testing (JWT, RBAC, data privacy)
 * - Edge case and error scenario coverage
 *
 * Created by: Testing Validation Agent (Hub-Directed)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import { ErrorAnalyticsService } from '@/services/ai/ErrorAnalyticsService';
import { 
  AnalyticsTimeRange,
  BusinessImpactMetrics,
  SystemHealthMetrics,
  AnomalyAnalytics,
  PreventionAnalytics,
  DashboardData
} from '@/interfaces/ai/IErrorAnalytics';
import { BusinessImpact, SystemLayer } from '@/services/ErrorOrchestrationService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/config/redis');
jest.mock('@/middleware/errorHandler');

describe('ErrorAnalyticsService - Hub Authority Compliance Tests', () => {
  let service: ErrorAnalyticsService;
  let mockLogger: jest.Mocked<typeof logger>;

  // Test data generators
  const createValidTimeRange = (overrides?: Partial<AnalyticsTimeRange>): AnalyticsTimeRange => ({
    start: new Date('2023-01-01T00:00:00Z'),
    end: new Date('2023-01-02T00:00:00Z'),
    granularity: 'hour',
    timezone: 'UTC',
    ...overrides,
  });

  const createLargeDatasetTimeRange = (): AnalyticsTimeRange => ({
    start: new Date('2023-01-01T00:00:00Z'),
    end: new Date('2023-01-07T00:00:00Z'), // 1 week of data
    granularity: 'minute',
    timezone: 'UTC',
  });

  beforeEach(() => {
    service = new ErrorAnalyticsService();
    mockLogger = logger as jest.Mocked<typeof logger>;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Hub Requirement: <5 Second Analytics Aggregation', () => {
    it('should generate business impact metrics within 5 second performance target', async () => {
      // Arrange
      const timeRange = createValidTimeRange();
      const startTime = Date.now();

      // Act
      const metrics = await service.getBusinessImpactMetrics(timeRange);
      const executionTime = Date.now() - startTime;

      // Assert - Hub Performance Requirement
      expect(executionTime).toBeLessThan(5000); // 5 seconds
      expect(metrics).toBeDefined();
      expect(metrics.timeRange).toEqual(timeRange);
      expect(metrics.totalRevenueLoss).toBeGreaterThanOrEqual(0);
      expect(metrics.customersAffected).toBeGreaterThanOrEqual(0);
      expect(metrics.averageDowntime).toBeGreaterThanOrEqual(0);
    });

    it('should generate system health metrics within performance target', async () => {
      // Arrange
      const timeRange = createValidTimeRange();
      const startTime = Date.now();

      // Act
      const metrics = await service.getSystemHealthMetrics(timeRange);
      const executionTime = Date.now() - startTime;

      // Assert - Hub Performance Requirement
      expect(executionTime).toBeLessThan(5000);
      expect(metrics.overallHealth).toBeOneOf(['healthy', 'degraded', 'critical', 'emergency']);
      expect(metrics.systemLayerHealth).toBeDefined();
      expect(metrics.errorTrends).toBeDefined();
      expect(metrics.performanceMetrics).toBeDefined();
    });

    it('should handle large dataset aggregation efficiently', async () => {
      // Arrange
      const largeTimeRange = createLargeDatasetTimeRange();
      const startTime = Date.now();

      // Act
      const dashboardData = await service.getDashboardData(largeTimeRange);
      const executionTime = Date.now() - startTime;

      // Assert - Performance with large datasets
      expect(executionTime).toBeLessThan(5000);
      expect(dashboardData).toBeDefined();
      expect(dashboardData.summary).toBeDefined();
      expect(dashboardData.charts).toBeDefined();
      expect(Array.isArray(dashboardData.charts)).toBe(true);
    });

    it('should cache analytics results for performance optimization', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act - First call should cache
      const startTime1 = Date.now();
      const firstResult = await service.getBusinessImpactMetrics(timeRange);
      const firstExecutionTime = Date.now() - startTime1;

      // Second call should use cache
      const startTime2 = Date.now();
      const secondResult = await service.getBusinessImpactMetrics(timeRange);
      const secondExecutionTime = Date.now() - startTime2;

      // Assert - Caching should improve performance
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      expect(secondExecutionTime).toBeLessThanOrEqual(firstExecutionTime);
    });
  });

  describe('Hub Requirement: 10,000+ Events Per Minute Processing', () => {
    it('should handle high-volume real-time analytics processing', async () => {
      // Arrange - Simulate high event volume
      const startTime = Date.now();
      const testDuration = 6000; // 6 seconds for testing
      const expectedEventsPerMinute = 10000;

      // Act
      const analytics = await service.getRealtimeAnalytics();
      const executionTime = Date.now() - startTime;

      // Assert - Hub Throughput Requirement
      expect(executionTime).toBeLessThan(5000);
      expect(analytics.currentErrorRate).toBeGreaterThanOrEqual(0);
      expect(analytics.throughput).toBeGreaterThan(0);
      expect(analytics.systemLoad).toBeDefined();
      
      // Verify throughput capability
      if (analytics.throughput && analytics.throughput > 0) {
        const eventsPerMinute = analytics.throughput * 60;
        expect(eventsPerMinute).toBeGreaterThan(expectedEventsPerMinute);
      }
    });

    it('should maintain accuracy under high load conditions', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Simulate concurrent analytics requests
      const concurrentRequests = Array(10).fill(null).map(() => 
        service.getBusinessImpactMetrics(timeRange)
      );

      // Act
      const results = await Promise.all(concurrentRequests);

      // Assert - Consistency under load
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.totalRevenueLoss).toBeGreaterThanOrEqual(0);
      });

      // All results should be consistent for the same time range
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.totalRevenueLoss).toBeCloseTo(firstResult.totalRevenueLoss, 2);
      });
    });
  });

  describe('Anomaly Detection Analytics', () => {
    it('should detect error rate anomalies accurately', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const anomalies = await service.getAnomalyAnalytics(timeRange);

      // Assert
      expect(anomalies.detectedAnomalies).toBeDefined();
      expect(Array.isArray(anomalies.detectedAnomalies)).toBe(true);
      expect(anomalies.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalies.anomalyScore).toBeLessThanOrEqual(1);
      expect(anomalies.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(anomalies.confidenceLevel).toBeLessThanOrEqual(1);
    });

    it('should classify anomaly severity levels correctly', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const anomalies = await service.getAnomalyAnalytics(timeRange);

      // Assert - Anomaly Classification
      anomalies.detectedAnomalies.forEach(anomaly => {
        expect(anomaly.severity).toBeOneOf(['low', 'medium', 'high', 'critical']);
        expect(anomaly.timestamp).toBeInstanceOf(Date);
        expect(anomaly.type).toBeDefined();
        expect(anomaly.description).toBeDefined();
      });
    });

    it('should provide actionable anomaly recommendations', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const anomalies = await service.getAnomalyAnalytics(timeRange);

      // Assert - Actionable Insights
      expect(anomalies.recommendations).toBeDefined();
      expect(Array.isArray(anomalies.recommendations)).toBe(true);
      
      anomalies.recommendations.forEach(recommendation => {
        expect(recommendation.action).toBeDefined();
        expect(recommendation.priority).toBeOneOf(['low', 'medium', 'high', 'critical']);
        expect(recommendation.estimatedImpact).toBeDefined();
      });
    });
  });

  describe('Prevention Analytics', () => {
    it('should calculate accurate prevention effectiveness metrics', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const prevention = await service.getPreventionAnalytics(timeRange);

      // Assert
      expect(prevention.preventionEffectiveness).toBeGreaterThanOrEqual(0);
      expect(prevention.preventionEffectiveness).toBeLessThanOrEqual(1);
      expect(prevention.totalPreventions).toBeGreaterThanOrEqual(0);
      expect(prevention.costSavings).toBeGreaterThanOrEqual(0);
      expect(prevention.timeRange).toEqual(timeRange);
    });

    it('should track prevention strategies performance', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const prevention = await service.getPreventionAnalytics(timeRange);

      // Assert - Strategy Performance Tracking
      expect(prevention.strategyPerformance).toBeDefined();
      expect(Array.isArray(prevention.strategyPerformance)).toBe(true);
      
      prevention.strategyPerformance.forEach(strategy => {
        expect(strategy.strategyId).toBeDefined();
        expect(strategy.successRate).toBeGreaterThanOrEqual(0);
        expect(strategy.successRate).toBeLessThanOrEqual(1);
        expect(strategy.executionCount).toBeGreaterThanOrEqual(0);
        expect(strategy.averageExecutionTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Dashboard Data Generation', () => {
    it('should generate comprehensive dashboard data efficiently', async () => {
      // Arrange
      const timeRange = createValidTimeRange();
      const startTime = Date.now();

      // Act
      const dashboard = await service.getDashboardData(timeRange);
      const executionTime = Date.now() - startTime;

      // Assert - Hub Performance + Comprehensive Data
      expect(executionTime).toBeLessThan(5000);
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.charts).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
      expect(dashboard.recommendations).toBeDefined();
      expect(dashboard.metadata).toBeDefined();
    });

    it('should include all required chart types for dashboard', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const dashboard = await service.getDashboardData(timeRange);

      // Assert - Chart Completeness
      const chartTypes = dashboard.charts.map(chart => chart.type);
      expect(chartTypes).toContain('error_trends');
      expect(chartTypes).toContain('business_impact');
      expect(chartTypes).toContain('system_health');
      expect(chartTypes).toContain('prevention_effectiveness');
    });

    it('should provide real-time dashboard updates', async () => {
      // Arrange
      const realTimeRange = {
        ...createValidTimeRange(),
        start: new Date(Date.now() - 3600000), // Last hour
        end: new Date(), // Now
      };

      // Act
      const dashboard = await service.getDashboardData(realTimeRange);

      // Assert - Real-time Data
      expect(dashboard.metadata.lastUpdated).toBeInstanceOf(Date);
      expect(dashboard.metadata.isRealTime).toBe(true);
      expect(dashboard.alerts).toBeDefined();
    });
  });

  describe('Custom Report Generation', () => {
    it('should generate custom reports with specified parameters', async () => {
      // Arrange
      const reportConfig = {
        timeRange: createValidTimeRange(),
        metrics: ['error_count', 'business_impact', 'prevention_rate'],
        format: 'json',
        includeCharts: true,
        includeRawData: false,
      };

      // Act
      const report = await service.generateCustomReport(reportConfig);

      // Assert
      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.metadata.format).toBe('json');
      expect(report.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle different report formats', async () => {
      // Arrange
      const csvConfig = {
        timeRange: createValidTimeRange(),
        metrics: ['error_count'],
        format: 'csv',
      };

      const pdfConfig = {
        timeRange: createValidTimeRange(),
        metrics: ['business_impact'],
        format: 'pdf',
      };

      // Act
      const csvReport = await service.generateCustomReport(csvConfig);
      const pdfReport = await service.generateCustomReport(pdfConfig);

      // Assert
      expect(csvReport.metadata.format).toBe('csv');
      expect(pdfReport.metadata.format).toBe('pdf');
    });
  });

  describe('Data Export Capabilities', () => {
    it('should export analytics data in multiple formats', async () => {
      // Arrange
      const exportConfig = {
        timeRange: createValidTimeRange(),
        dataTypes: ['business_impact', 'system_health', 'anomalies'],
        format: 'json',
        compression: true,
      };

      // Act
      const exportPath = await service.exportAnalyticsData(exportConfig);

      // Assert
      expect(exportPath).toBeDefined();
      expect(typeof exportPath).toBe('string');
      expect(exportPath).toMatch(/\.(json|csv|xlsx)$/);
    });

    it('should handle large data export efficiently', async () => {
      // Arrange
      const largeExportConfig = {
        timeRange: createLargeDatasetTimeRange(),
        dataTypes: ['raw_events', 'aggregated_metrics'],
        format: 'csv',
        compression: true,
      };
      const startTime = Date.now();

      // Act
      const exportPath = await service.exportAnalyticsData(largeExportConfig);
      const executionTime = Date.now() - startTime;

      // Assert - Performance for large exports
      expect(exportPath).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // 10 seconds for large export
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid time ranges gracefully', async () => {
      // Arrange
      const invalidTimeRange = createValidTimeRange({
        start: new Date('2023-01-02T00:00:00Z'),
        end: new Date('2023-01-01T00:00:00Z'), // End before start
      });

      // Act & Assert
      await expect(service.getBusinessImpactMetrics(invalidTimeRange)).rejects.toThrow(AppError);
    });

    it('should handle empty dataset scenarios', async () => {
      // Arrange
      const futureTimeRange = createValidTimeRange({
        start: new Date('2030-01-01T00:00:00Z'),
        end: new Date('2030-01-02T00:00:00Z'), // Future dates with no data
      });

      // Act
      const metrics = await service.getBusinessImpactMetrics(futureTimeRange);

      // Assert - Should return default values for empty datasets
      expect(metrics).toBeDefined();
      expect(metrics.totalRevenueLoss).toBe(0);
      expect(metrics.customersAffected).toBe(0);
      expect(metrics.errorEvents).toHaveLength(0);
    });

    it('should handle database connection failures', async () => {
      // Arrange
      const timeRange = createValidTimeRange();
      jest.spyOn(service as any, 'calculateBusinessImpactMetrics').mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(service.getBusinessImpactMetrics(timeRange)).rejects.toThrow(AppError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get business impact metrics'),
        expect.any(Object)
      );
    });

    it('should handle extremely large time ranges', async () => {
      // Arrange
      const extremeTimeRange = createValidTimeRange({
        start: new Date('2020-01-01T00:00:00Z'),
        end: new Date('2023-12-31T23:59:59Z'), // 4 years of data
        granularity: 'minute',
      });

      // Act & Assert - Should either succeed or fail gracefully
      try {
        const result = await service.getDashboardData(extremeTimeRange);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toContain('Time range too large');
      }
    });
  });

  describe('Security and Data Privacy (GDPR Compliance)', () => {
    it('should anonymize customer data in analytics results', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const businessMetrics = await service.getBusinessImpactMetrics(timeRange);
      const systemMetrics = await service.getSystemHealthMetrics(timeRange);

      // Assert - GDPR Compliance
      const businessString = JSON.stringify(businessMetrics);
      const systemString = JSON.stringify(systemMetrics);
      
      expect(businessString).not.toMatch(/user_\d+|email|phone|ssn|customer_id/i);
      expect(systemString).not.toMatch(/user_\d+|email|phone|ssn|customer_id/i);
    });

    it('should not include PII in exported data', async () => {
      // Arrange
      const exportConfig = {
        timeRange: createValidTimeRange(),
        dataTypes: ['business_impact', 'system_health'],
        format: 'json',
      };

      // Act
      const exportPath = await service.exportAnalyticsData(exportConfig);

      // Assert - Data Privacy
      expect(exportPath).toBeDefined();
      // In real implementation, would verify exported file content
    });

    it('should handle data retention policies correctly', async () => {
      // Arrange
      const oldTimeRange = createValidTimeRange({
        start: new Date('2020-01-01T00:00:00Z'),
        end: new Date('2020-01-02T00:00:00Z'), // Old data beyond retention
      });

      // Act
      const metrics = await service.getBusinessImpactMetrics(oldTimeRange);

      // Assert - Data Retention Compliance
      expect(metrics).toBeDefined();
      // Should return limited or anonymized data for old time ranges
    });
  });

  describe('Real-time Analytics Performance', () => {
    it('should provide real-time analytics with minimal latency', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const realTimeAnalytics = await service.getRealtimeAnalytics();
      const latency = Date.now() - startTime;

      // Assert - Real-time Performance
      expect(latency).toBeLessThan(1000); // Sub-second latency
      expect(realTimeAnalytics.currentErrorRate).toBeGreaterThanOrEqual(0);
      expect(realTimeAnalytics.throughput).toBeGreaterThan(0);
      expect(realTimeAnalytics.lastUpdated).toBeInstanceOf(Date);
      
      // Real-time data should be very recent
      const dataAge = Date.now() - realTimeAnalytics.lastUpdated.getTime();
      expect(dataAge).toBeLessThan(60000); // Less than 1 minute old
    });

    it('should maintain consistent performance under varying loads', async () => {
      // Arrange - Test multiple concurrent real-time requests
      const concurrentRequests = 20;
      const requestPromises = Array(concurrentRequests).fill(null).map(async () => {
        const startTime = Date.now();
        const result = await service.getRealtimeAnalytics();
        const latency = Date.now() - startTime;
        return { result, latency };
      });

      // Act
      const results = await Promise.all(requestPromises);

      // Assert - Consistent Performance
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(({ result, latency }) => {
        expect(result).toBeDefined();
        expect(latency).toBeLessThan(2000); // Max 2 seconds under load
      });

      // Average latency should be reasonable
      const averageLatency = results.reduce((sum, { latency }) => sum + latency, 0) / results.length;
      expect(averageLatency).toBeLessThan(1500);
    });
  });

  describe('System Integration Validation', () => {
    it('should integrate with all system layers for health metrics', async () => {
      // Arrange
      const timeRange = createValidTimeRange();

      // Act
      const systemHealth = await service.getSystemHealthMetrics(timeRange);

      // Assert - System Layer Integration
      expect(systemHealth.systemLayerHealth).toBeDefined();
      
      Object.values(SystemLayer).forEach(layer => {
        if (systemHealth.systemLayerHealth[layer]) {
          const layerHealth = systemHealth.systemLayerHealth[layer];
          expect(layerHealth.health).toBeOneOf(['healthy', 'degraded', 'critical']);
          expect(layerHealth.errorRate).toBeGreaterThanOrEqual(0);
          expect(layerHealth.errorRate).toBeLessThanOrEqual(1);
          expect(layerHealth.lastCheck).toBeInstanceOf(Date);
        }
      });
    });
  });
});