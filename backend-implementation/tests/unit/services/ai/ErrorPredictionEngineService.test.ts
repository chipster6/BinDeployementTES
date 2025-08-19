/**
 * ============================================================================
 * ERROR PREDICTION ENGINE SERVICE - COMPREHENSIVE UNIT TESTS
 * ============================================================================
 *
 * Hub Authority Compliant Testing Suite for ErrorPredictionEngineService
 * 
 * Hub Requirements:
 * - 90%+ unit test coverage
 * - <100ms prediction response time validation
 * - 1000+ predictions per minute throughput
 * - Security testing (JWT, RBAC, GDPR)
 * - Edge case and error scenario coverage
 *
 * Created by: Testing Validation Agent (Hub-Directed)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import { ErrorPredictionEngineService } from '@/services/ai/ErrorPredictionEngineService';
import { 
  PredictionContext, 
  ErrorPredictionResult, 
  AccuracyMetrics, 
  TestData 
} from '@/interfaces/ai/IErrorPredictionEngine';
import { BusinessImpact, SystemLayer } from '@/services/ErrorOrchestrationService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/config/redis');
jest.mock('@/middleware/errorHandler');

describe('ErrorPredictionEngineService - Hub Authority Compliance Tests', () => {
  let service: ErrorPredictionEngineService;
  let mockLogger: jest.Mocked<typeof logger>;

  // Test data generators
  const createValidPredictionContext = (overrides?: Partial<PredictionContext>): PredictionContext => ({
    predictionWindow: {
      start: new Date('2023-01-01T00:00:00Z'),
      end: new Date('2023-01-01T01:00:00Z'),
    },
    systemLayer: SystemLayer.APPLICATION,
    features: {
      errorRate: 0.05,
      requestVolume: 1000,
      responseTime: 250,
      cpuUsage: 0.7,
      memoryUsage: 0.6,
    },
    historicalData: [
      { timestamp: '2023-01-01T00:00:00Z', errorCount: 5, requestCount: 100 },
      { timestamp: '2023-01-01T00:15:00Z', errorCount: 3, requestCount: 120 },
    ],
    businessContext: {
      campaignActive: false,
      maintenanceScheduled: false,
      highTrafficExpected: false,
      criticalPeriod: false,
    },
    ...overrides,
  });

  const createValidTestData = (): TestData => ({
    features: [
      { errorRate: 0.05, requestVolume: 1000, responseTime: 250 },
      { errorRate: 0.08, requestVolume: 1200, responseTime: 300 },
    ],
    expectedOutcomes: [
      { errorCount: 5, businessImpact: BusinessImpact.LOW },
      { errorCount: 12, businessImpact: BusinessImpact.MEDIUM },
    ],
    timeRange: {
      start: new Date('2023-01-01T00:00:00Z'),
      end: new Date('2023-01-01T01:00:00Z'),
    },
  });

  beforeEach(() => {
    service = new ErrorPredictionEngineService();
    mockLogger = logger as jest.Mocked<typeof logger>;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Hub Requirement: <100ms Prediction Performance', () => {
    it('should generate prediction within 100ms performance target', async () => {
      // Arrange
      const context = createValidPredictionContext();
      const startTime = Date.now();

      // Act
      const result = await service.generatePrediction(context);
      const executionTime = Date.now() - startTime;

      // Assert - Hub Performance Requirement
      expect(executionTime).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result.executionTime).toBeLessThan(100);
      expect(result.predictionId).toMatch(/^pred_\d+_[a-z0-9]+$/);
    });

    it('should meet 1000+ predictions per minute throughput requirement', async () => {
      // Arrange
      const context = createValidPredictionContext();
      const batchSize = 20; // Test batch for performance validation
      const startTime = Date.now();

      // Act
      const predictions = await Promise.all(
        Array(batchSize).fill(null).map(() => service.generatePrediction(context))
      );
      const totalTime = Date.now() - startTime;

      // Assert - Hub Throughput Requirement
      const predictionsPerMinute = (batchSize / totalTime) * 60000;
      expect(predictionsPerMinute).toBeGreaterThan(1000);
      expect(predictions).toHaveLength(batchSize);
      predictions.forEach(prediction => {
        expect(prediction.executionTime).toBeLessThan(100);
      });
    });

    it('should cache prediction results for performance optimization', async () => {
      // Arrange
      const context = createValidPredictionContext();

      // Act - First call (should cache)
      const firstResult = await service.generatePrediction(context);
      const secondResult = await service.generatePrediction(context);

      // Assert - Caching behavior
      expect(firstResult.predictionId).toBeDefined();
      expect(secondResult.predictionId).toBeDefined();
      // Cache should improve performance on repeated calls
      expect(secondResult.executionTime).toBeLessThanOrEqual(firstResult.executionTime);
    });
  });

  describe('Hub Requirement: 85%+ Accuracy Ensemble Predictions', () => {
    it('should generate prediction with required accuracy confidence', async () => {
      // Arrange
      const context = createValidPredictionContext();

      // Act
      const result = await service.generatePrediction(context);

      // Assert - Hub Accuracy Requirement
      expect(result.predictions.errorCount.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(result.predictions.errorRate.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(result.predictions.businessImpact.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(result.dataQuality).toBeGreaterThanOrEqual(0.8);
    });

    it('should validate prediction accuracy against test data', async () => {
      // Arrange
      const testData = createValidTestData();

      // Act
      const accuracyMetrics = await service.validatePredictionAccuracy(testData);

      // Assert - Hub Accuracy Validation
      expect(accuracyMetrics.overall.accuracy).toBeGreaterThanOrEqual(0.85);
      expect(accuracyMetrics.overall.precision).toBeGreaterThanOrEqual(0.80);
      expect(accuracyMetrics.overall.recall).toBeGreaterThanOrEqual(0.80);
      expect(accuracyMetrics.overall.f1Score).toBeGreaterThanOrEqual(0.80);
    });

    it('should provide model contribution analysis for ensemble predictions', async () => {
      // Arrange
      const context = createValidPredictionContext();

      // Act
      const result = await service.generatePrediction(context);

      // Assert - Ensemble Model Validation
      expect(result.modelContributions).toBeDefined();
      expect(Object.keys(result.modelContributions)).toHaveLength(3); // RandomForest, GradientBoosting, NeuralNetwork
      
      // All contributions should sum to 1.0
      const totalContribution = Object.values(result.modelContributions).reduce((sum, val) => sum + val, 0);
      expect(totalContribution).toBeCloseTo(1.0, 2);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty features gracefully', async () => {
      // Arrange
      const context = createValidPredictionContext({
        features: {},
      });

      // Act & Assert
      await expect(service.generatePrediction(context)).rejects.toThrow(AppError);
    });

    it('should handle invalid prediction window', async () => {
      // Arrange
      const context = createValidPredictionContext({
        predictionWindow: {
          start: new Date('2023-01-01T01:00:00Z'),
          end: new Date('2023-01-01T00:00:00Z'), // End before start
        },
      });

      // Act & Assert
      await expect(service.generatePrediction(context)).rejects.toThrow(AppError);
    });

    it('should handle missing historical data', async () => {
      // Arrange
      const context = createValidPredictionContext({
        historicalData: [],
      });

      // Act
      const result = await service.generatePrediction(context);

      // Assert - Should use default values but still generate prediction
      expect(result).toBeDefined();
      expect(result.dataQuality).toBeLessThan(0.5); // Lower quality without historical data
    });

    it('should handle extreme feature values', async () => {
      // Arrange
      const context = createValidPredictionContext({
        features: {
          errorRate: 1.0, // 100% error rate
          requestVolume: 0, // No requests
          responseTime: -1, // Invalid response time
          cpuUsage: 2.0, // Over 100% CPU
          memoryUsage: -0.5, // Negative memory
        },
      });

      // Act
      const result = await service.generatePrediction(context);

      // Assert - Should handle extreme values gracefully
      expect(result).toBeDefined();
      expect(result.predictions.systemHealth.overallHealth).toBe('emergency');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should throw AppError when no active models available', async () => {
      // Arrange
      const context = createValidPredictionContext();
      // Mock scenario where no models are active
      jest.spyOn(service as any, 'getActiveModels').mockResolvedValue([]);

      // Act & Assert
      await expect(service.generatePrediction(context)).rejects.toThrow(
        new AppError('No active models available for prediction', 500)
      );
    });

    it('should handle model prediction failures gracefully', async () => {
      // Arrange
      const context = createValidPredictionContext();
      jest.spyOn(service as any, 'runEnsemblePrediction').mockRejectedValue(
        new Error('Model prediction failed')
      );

      // Act & Assert
      await expect(service.generatePrediction(context)).rejects.toThrow(AppError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Prediction generation failed'),
        expect.any(Object)
      );
    });

    it('should handle update model failure scenarios', async () => {
      // Arrange
      const invalidModelData = null;

      // Act & Assert
      await expect(service.updatePredictionModel(invalidModelData)).rejects.toThrow(AppError);
    });
  });

  describe('Batch Processing Capabilities', () => {
    it('should process batch predictions efficiently', async () => {
      // Arrange
      const contexts = Array(10).fill(null).map((_, index) => 
        createValidPredictionContext({
          features: { ...createValidPredictionContext().features, requestVolume: 1000 + index * 100 }
        })
      );
      const startTime = Date.now();

      // Act
      const results = await service.generateBatchPredictions(contexts);
      const totalTime = Date.now() - startTime;

      // Assert - Batch Performance
      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(500); // Batch should be faster than individual calls
      
      results.forEach((result, index) => {
        expect(result.predictionId).toBeDefined();
        expect(result.executionTime).toBeLessThan(100);
      });
    });

    it('should handle empty batch gracefully', async () => {
      // Act
      const results = await service.generateBatchPredictions([]);

      // Assert
      expect(results).toEqual([]);
    });

    it('should handle partial batch failures', async () => {
      // Arrange
      const validContext = createValidPredictionContext();
      const invalidContext = createValidPredictionContext({ features: {} });
      const contexts = [validContext, invalidContext, validContext];

      // Act & Assert
      await expect(service.generateBatchPredictions(contexts)).rejects.toThrow(AppError);
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide accurate performance metrics', async () => {
      // Arrange - Generate some predictions for metrics
      const context = createValidPredictionContext();
      await service.generatePrediction(context);
      await service.generatePrediction(context);

      // Act
      const performance = await service.getPredictionPerformance();

      // Assert - Hub Performance Monitoring
      expect(performance.averageResponseTime).toBeLessThan(100);
      expect(performance.accuracy).toBeGreaterThanOrEqual(0.85);
      expect(performance.throughput).toBeGreaterThan(0);
      expect(performance.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security and Data Privacy (GDPR Compliance)', () => {
    it('should not include personal data in prediction results', async () => {
      // Arrange
      const contextWithPII = createValidPredictionContext({
        features: {
          userId: '12345', // Simulated PII
          email: 'user@example.com', // Simulated PII
          errorRate: 0.05,
          requestVolume: 1000,
        } as any,
      });

      // Act
      const result = await service.generatePrediction(contextWithPII);

      // Assert - GDPR Compliance
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain('12345');
      expect(resultString).not.toContain('user@example.com');
      expect(result.features).not.toHaveProperty('userId');
      expect(result.features).not.toHaveProperty('email');
    });

    it('should anonymize data in feature importance analysis', async () => {
      // Arrange
      const context = createValidPredictionContext();

      // Act
      const result = await service.generatePrediction(context);

      // Assert - Data Anonymization
      expect(result.featureImportance).toBeDefined();
      Object.keys(result.featureImportance).forEach(feature => {
        expect(feature).not.toMatch(/user|email|phone|id|name/i);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should correctly map error rates to business impact', async () => {
      // Test low error rate scenario
      const lowErrorContext = createValidPredictionContext({
        features: { ...createValidPredictionContext().features, errorRate: 0.01 }
      });
      
      const lowResult = await service.generatePrediction(lowErrorContext);
      expect(lowResult.predictions.businessImpact.predicted).toBe(BusinessImpact.LOW);

      // Test high error rate scenario
      const highErrorContext = createValidPredictionContext({
        features: { ...createValidPredictionContext().features, errorRate: 0.15 }
      });
      
      const highResult = await service.generatePrediction(highErrorContext);
      expect(highResult.predictions.businessImpact.predicted).toBe(BusinessImpact.HIGH);
    });

    it('should consider business context in predictions', async () => {
      // Arrange
      const criticalPeriodContext = createValidPredictionContext({
        businessContext: {
          campaignActive: true,
          criticalPeriod: true,
          highTrafficExpected: true,
          maintenanceScheduled: false,
        },
      });

      // Act
      const result = await service.generatePrediction(criticalPeriodContext);

      // Assert - Business context should influence predictions
      expect(result.predictions.businessImpact.revenueAtRisk).toBeGreaterThan(0);
      expect(result.predictions.businessImpact.customersAffected).toBeGreaterThan(0);
    });
  });

  describe('System Health Predictions', () => {
    it('should generate accurate system layer predictions', async () => {
      // Arrange
      const context = createValidPredictionContext();

      // Act
      const result = await service.generatePrediction(context);

      // Assert - System Health Validation
      expect(result.predictions.systemHealth.overallHealth).toBeOneOf(['healthy', 'degraded', 'critical', 'emergency']);
      expect(result.predictions.systemHealth.systemPredictions).toBeDefined();
      
      Object.values(SystemLayer).forEach(layer => {
        if (result.predictions.systemHealth.systemPredictions[layer]) {
          const layerPrediction = result.predictions.systemHealth.systemPredictions[layer];
          expect(layerPrediction.health).toBeOneOf(['healthy', 'degraded', 'critical']);
          expect(layerPrediction.errorProbability).toBeGreaterThanOrEqual(0);
          expect(layerPrediction.errorProbability).toBeLessThanOrEqual(1);
          expect(layerPrediction.confidence).toBeGreaterThanOrEqual(0);
          expect(layerPrediction.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Trend Analysis', () => {
    it('should identify error trend patterns correctly', async () => {
      // Arrange - Increasing error trend
      const increasingTrendContext = createValidPredictionContext({
        historicalData: [
          { timestamp: '2023-01-01T00:00:00Z', errorCount: 2, requestCount: 100 },
          { timestamp: '2023-01-01T00:15:00Z', errorCount: 5, requestCount: 100 },
          { timestamp: '2023-01-01T00:30:00Z', errorCount: 8, requestCount: 100 },
        ],
      });

      // Act
      const result = await service.generatePrediction(increasingTrendContext);

      // Assert - Trend Detection
      expect(result.predictions.errorCount.trend).toBe('increasing');
    });
  });
});