/**
 * ============================================================================
 * ERROR COORDINATION SERVICE - COMPREHENSIVE UNIT TESTS
 * ============================================================================
 *
 * Hub Authority Compliant Testing Suite for ErrorCoordinationService
 * 
 * Hub Requirements:
 * - 90%+ unit test coverage
 * - <50ms coordination response time validation
 * - Cross-stream coordination functionality
 * - Stream health monitoring validation
 * - Security testing (JWT, RBAC, data privacy)
 * - Cascade prevention and error orchestration
 *
 * Created by: Testing Validation Agent (Hub-Directed)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import { ErrorCoordinationService } from '@/services/ai/ErrorCoordinationService';
import { 
  CoordinationContext,
  ErrorCoordinationEvent,
  StreamHealthStatus,
  CoordinationStrategy,
  CoordinationResult
} from '@/interfaces/ai/IErrorCoordination';
import { BusinessImpact, SystemLayer } from '@/services/ErrorOrchestrationService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/config/redis');
jest.mock('@/middleware/errorHandler');

describe('ErrorCoordinationService - Hub Authority Compliance Tests', () => {
  let service: ErrorCoordinationService;
  let mockLogger: jest.Mocked<typeof logger>;

  // Test data generators
  const createValidCoordinationContext = (overrides?: Partial<CoordinationContext>): CoordinationContext => ({
    streamId: 'stream_test_001',
    streamType: 'error_prediction',
    priority: 'medium',
    dependencies: ['stream_analytics_001', 'stream_model_001'],
    healthStatus: {
      status: 'healthy',
      lastHeartbeat: new Date(),
      errorRate: 0.02,
      processingLatency: 45,
    },
    metadata: {
      version: '1.0.0',
      capabilities: ['prediction', 'coordination'],
      resourceLimits: {
        maxMemory: 1024,
        maxCpu: 0.5,
      },
    },
    ...overrides,
  });

  const createValidErrorCoordinationEvent = (overrides?: Partial<ErrorCoordinationEvent>): ErrorCoordinationEvent => ({
    eventId: 'event_test_001',
    timestamp: new Date(),
    sourceStream: 'stream_test_001',
    eventType: 'error_spike',
    severity: 'medium',
    details: {
      errorCount: 25,
      errorRate: 0.08,
      affectedSystems: ['payment', 'authentication'],
      businessImpact: BusinessImpact.MEDIUM,
      estimatedRevenueLoss: 5000,
    },
    coordination: {
      requiresOrchestration: true,
      suggestedActions: ['throttle_traffic', 'activate_fallback'],
      coordinationScope: ['dependent_streams'],
      priority: 'high',
    },
    ...overrides,
  });

  const createValidCoordinationStrategy = (overrides?: Partial<CoordinationStrategy>): CoordinationStrategy => ({
    strategyId: 'strategy_test_001',
    name: 'Test Coordination Strategy',
    description: 'Test strategy for error coordination',
    triggers: {
      errorThreshold: 0.05,
      cascadeRisk: 0.7,
      businessImpactLevel: BusinessImpact.MEDIUM,
      affectedStreams: 2,
    },
    actions: {
      isolateStreams: true,
      throttleProcessing: false,
      activateFailover: true,
      notifyStakeholders: true,
      escalateIncident: false,
    },
    rollbackStrategy: {
      automaticRollback: true,
      rollbackThreshold: 0.9,
      rollbackSteps: ['restore_traffic', 'clear_isolation'],
    },
    ...overrides,
  });

  beforeEach(() => {
    service = new ErrorCoordinationService();
    mockLogger = logger as jest.Mocked<typeof logger>;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Hub Requirement: <50ms Coordination Response Time', () => {
    it('should coordinate error events within 50ms performance target', async () => {
      // Arrange
      const context = createValidCoordinationContext();
      const event = createValidErrorCoordinationEvent();
      
      // Register stream first
      await service.registerStream(context);
      
      const startTime = Date.now();

      // Act
      const result = await service.coordinateErrorEvent(event);
      const executionTime = Date.now() - startTime;

      // Assert - Hub Performance Requirement
      expect(executionTime).toBeLessThan(50); // 50ms
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(50);
      expect(result.coordinationId).toMatch(/^coord_\d+_[a-z0-9]+$/);
      expect(result.strategy).toBeDefined();
    });

    it('should register streams within performance target', async () => {
      // Arrange
      const context = createValidCoordinationContext();
      const startTime = Date.now();

      // Act
      const result = await service.registerStream(context);
      const executionTime = Date.now() - startTime;

      // Assert - Registration Performance
      expect(executionTime).toBeLessThan(50);
      expect(result.registered).toBe(true);
      expect(result.streamId).toBe(context.streamId);
      expect(result.coordinationEndpoint).toBeDefined();
    });

    it('should execute coordination strategies efficiently', async () => {
      // Arrange
      const strategy = createValidCoordinationStrategy();
      const event = createValidErrorCoordinationEvent();
      
      await service.createCoordinationStrategy(strategy);
      
      const startTime = Date.now();

      // Act
      const result = await service.executeCoordinationStrategy(strategy.strategyId, { event });
      const executionTime = Date.now() - startTime;

      // Assert - Strategy Execution Performance
      expect(executionTime).toBeLessThan(50);
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(50);
      expect(result.strategy).toBe(strategy.strategyId);
    });

    it('should handle concurrent coordination requests efficiently', async () => {
      // Arrange
      const contexts = Array(5).fill(null).map((_, index) => 
        createValidCoordinationContext({ streamId: `stream_test_${index}` })
      );
      const events = Array(5).fill(null).map((_, index) => 
        createValidErrorCoordinationEvent({ 
          eventId: `event_test_${index}`,
          sourceStream: `stream_test_${index}`
        })
      );

      // Register all streams
      await Promise.all(contexts.map(ctx => service.registerStream(ctx)));

      const startTime = Date.now();

      // Act - Concurrent coordination
      const results = await Promise.all(
        events.map(event => service.coordinateErrorEvent(event))
      );
      const totalTime = Date.now() - startTime;

      // Assert - Concurrent Performance
      expect(totalTime).toBeLessThan(100); // Total time for 5 concurrent operations
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.executionTime).toBeLessThan(50);
      });
    });
  });

  describe('Stream Registration and Management', () => {
    it('should register stream with complete context information', async () => {
      // Arrange
      const context = createValidCoordinationContext();

      // Act
      const result = await service.registerStream(context);

      // Assert
      expect(result.registered).toBe(true);
      expect(result.streamId).toBe(context.streamId);
      expect(result.coordinationEndpoint).toContain(context.streamId);
      expect(result.coordinationEndpoint).toMatch(/^https?:\/\/.+\/coordination\/.+$/);
    });

    it('should unregister stream successfully', async () => {
      // Arrange
      const context = createValidCoordinationContext();
      await service.registerStream(context);

      // Act
      const unregistered = await service.unregisterStream(context.streamId);

      // Assert
      expect(unregistered).toBe(true);
    });

    it('should handle unregistering non-existent stream gracefully', async () => {
      // Arrange
      const nonExistentStreamId = 'stream_nonexistent';

      // Act
      const result = await service.unregisterStream(nonExistentStreamId);

      // Assert
      expect(result).toBe(false);
    });

    it('should track stream dependencies correctly', async () => {
      // Arrange
      const context = createValidCoordinationContext({
        dependencies: ['dep_stream_1', 'dep_stream_2', 'dep_stream_3'],
      });

      // Act
      await service.registerStream(context);
      const health = await service.getStreamHealth(context.streamId);

      // Assert - Dependency Tracking
      expect(health.dependencyStatus).toBeDefined();
      expect(Object.keys(health.dependencyStatus)).toHaveLength(3);
      Object.values(health.dependencyStatus).forEach(status => {
        expect(status).toBeOneOf(['healthy', 'degraded', 'critical', 'offline']);
      });
    });
  });

  describe('Stream Health Monitoring', () => {
    it('should provide accurate stream health status', async () => {
      // Arrange
      const context = createValidCoordinationContext();
      await service.registerStream(context);

      // Act
      const health = await service.getStreamHealth(context.streamId);

      // Assert
      expect(health.streamId).toBe(context.streamId);
      expect(health.health).toBeOneOf(['healthy', 'degraded', 'critical', 'offline']);
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
      expect(health.errorRate).toBeGreaterThanOrEqual(0);
      expect(health.errorRate).toBeLessThanOrEqual(1);
      expect(health.processingLatency).toBeGreaterThan(0);
      expect(health.resourceUsage).toBeDefined();
      expect(health.resourceUsage.cpu).toBeGreaterThanOrEqual(0);
      expect(health.resourceUsage.memory).toBeGreaterThan(0);
    });

    it('should monitor all registered streams health', async () => {
      // Arrange
      const contexts = Array(3).fill(null).map((_, index) => 
        createValidCoordinationContext({ streamId: `stream_health_${index}` })
      );
      
      await Promise.all(contexts.map(ctx => service.registerStream(ctx)));

      // Act
      const allHealth = await service.getAllStreamsHealth();

      // Assert
      expect(Object.keys(allHealth)).toHaveLength(3);
      Object.entries(allHealth).forEach(([streamId, health]) => {
        expect(streamId).toMatch(/^stream_health_\d+$/);
        expect(health.health).toBeOneOf(['healthy', 'degraded', 'critical', 'offline']);
      });
    });

    it('should handle health check for non-existent stream', async () => {
      // Arrange
      const nonExistentStreamId = 'stream_nonexistent';

      // Act & Assert
      await expect(service.getStreamHealth(nonExistentStreamId)).rejects.toThrow(
        new AppError(`Stream ${nonExistentStreamId} not found`, 404)
      );
    });

    it('should cache health status for performance optimization', async () => {
      // Arrange
      const context = createValidCoordinationContext();
      await service.registerStream(context);

      // Act - First call should cache
      const health1 = await service.getStreamHealth(context.streamId);
      const health2 = await service.getStreamHealth(context.streamId);

      // Assert - Consistent cached results
      expect(health1.streamId).toBe(health2.streamId);
      expect(health1.health).toBe(health2.health);
    });
  });

  describe('Error Cascade Prevention', () => {
    it('should prevent error cascades effectively', async () => {
      // Arrange
      const sourceStream = 'stream_source';
      const dependentStreams = ['stream_dep_1', 'stream_dep_2'];
      
      // Register streams with dependencies
      await service.registerStream(createValidCoordinationContext({ 
        streamId: sourceStream 
      }));
      
      for (const depStream of dependentStreams) {
        await service.registerStream(createValidCoordinationContext({ 
          streamId: depStream,
          dependencies: [sourceStream]
        }));
      }

      const error = {
        type: 'critical_failure',
        severity: 'high',
        errorRate: 0.25,
      };

      // Act
      const prevention = await service.preventErrorCascade(sourceStream, error);

      // Assert - Cascade Prevention
      expect(prevention.cascadePrevented).toBe(true);
      expect(prevention.isolatedStreams).toBeDefined();
      expect(prevention.mitigationActions).toBeDefined();
      expect(prevention.mitigationActions.length).toBeGreaterThan(0);
    });

    it('should analyze cascade risk accurately', async () => {
      // Arrange
      const criticalStream = 'stream_critical';
      await service.registerStream(createValidCoordinationContext({ 
        streamId: criticalStream,
        priority: 'critical',
        dependencies: ['dep1', 'dep2', 'dep3', 'dep4'] // Many dependencies
      }));

      const highRiskError = {
        type: 'system_failure',
        severity: 'critical',
        errorRate: 0.5,
      };

      // Act
      const prevention = await service.preventErrorCascade(criticalStream, highRiskError);

      // Assert - High Risk Scenario
      expect(prevention.cascadePrevented).toBe(true);
      expect(prevention.isolatedStreams.length).toBeGreaterThan(0);
      expect(prevention.mitigationActions).toContain(
        expect.stringContaining('Activated circuit breakers')
      );
    });

    it('should handle cascade prevention for non-existent stream', async () => {
      // Arrange
      const nonExistentStreamId = 'stream_nonexistent';
      const error = { type: 'test_error' };

      // Act & Assert
      await expect(service.preventErrorCascade(nonExistentStreamId, error)).rejects.toThrow(
        new AppError(`Source stream ${nonExistentStreamId} not found`, 404)
      );
    });
  });

  describe('Dependency Monitoring', () => {
    it('should monitor stream dependencies comprehensively', async () => {
      // Arrange
      const streamId = 'stream_with_deps';
      const dependencies = ['dep_healthy', 'dep_degraded', 'dep_critical'];
      
      await service.registerStream(createValidCoordinationContext({ 
        streamId,
        dependencies
      }));

      // Mock different dependency health states
      for (const dep of dependencies) {
        await service.registerStream(createValidCoordinationContext({ 
          streamId: dep 
        }));
      }

      // Act
      const dependencyStatus = await service.monitorDependencies(streamId);

      // Assert
      expect(dependencyStatus.healthyDependencies).toBeDefined();
      expect(dependencyStatus.degradedDependencies).toBeDefined();
      expect(dependencyStatus.criticalDependencies).toBeDefined();
      expect(dependencyStatus.overallDependencyHealth).toBeGreaterThanOrEqual(0);
      expect(dependencyStatus.overallDependencyHealth).toBeLessThanOrEqual(1);

      // Total dependencies should match
      const totalDeps = dependencyStatus.healthyDependencies.length + 
                       dependencyStatus.degradedDependencies.length + 
                       dependencyStatus.criticalDependencies.length;
      expect(totalDeps).toBe(dependencies.length);
    });

    it('should handle stream with no dependencies', async () => {
      // Arrange
      const streamId = 'stream_no_deps';
      await service.registerStream(createValidCoordinationContext({ 
        streamId,
        dependencies: []
      }));

      // Act
      const dependencyStatus = await service.monitorDependencies(streamId);

      // Assert
      expect(dependencyStatus.overallDependencyHealth).toBe(1.0); // Perfect health with no deps
      expect(dependencyStatus.healthyDependencies).toHaveLength(0);
      expect(dependencyStatus.degradedDependencies).toHaveLength(0);
      expect(dependencyStatus.criticalDependencies).toHaveLength(0);
    });
  });

  describe('Coordination Strategy Management', () => {
    it('should create custom coordination strategy successfully', async () => {
      // Arrange
      const strategy = createValidCoordinationStrategy();

      // Act
      const strategyId = await service.createCoordinationStrategy(strategy);

      // Assert
      expect(strategyId).toBe(strategy.strategyId);
    });

    it('should update coordination strategy configuration', async () => {
      // Arrange
      const strategy = createValidCoordinationStrategy();
      await service.createCoordinationStrategy(strategy);
      
      const updates = {
        triggers: {
          errorThreshold: 0.10,
          cascadeRisk: 0.8,
          businessImpactLevel: BusinessImpact.HIGH,
          affectedStreams: 3,
        },
      };

      // Act
      const updated = await service.updateCoordinationStrategy(strategy.strategyId, updates);

      // Assert
      expect(updated).toBe(true);
    });

    it('should test coordination strategy with simulation', async () => {
      // Arrange
      const strategy = createValidCoordinationStrategy();
      await service.createCoordinationStrategy(strategy);
      
      const simulationParams = {
        errorRate: 0.15,
        affectedStreams: 3,
        businessImpact: BusinessImpact.HIGH,
      };

      // Act
      const testResult = await service.testCoordinationStrategy(strategy.strategyId, simulationParams);

      // Assert
      expect(testResult.testId).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(testResult.success).toBe(true);
      expect(testResult.executionTime).toBeGreaterThan(0);
      expect(testResult.simulationResults).toBeDefined();
      expect(Array.isArray(testResult.recommendations)).toBe(true);
    });

    it('should handle strategy validation errors', async () => {
      // Arrange
      const invalidStrategy = createValidCoordinationStrategy({
        strategyId: '', // Invalid empty ID
        name: '', // Invalid empty name
      });

      // Act & Assert
      await expect(service.createCoordinationStrategy(invalidStrategy)).rejects.toThrow(
        new AppError('Strategy must have strategyId and name', 400)
      );
    });

    it('should handle updating non-existent strategy', async () => {
      // Arrange
      const nonExistentStrategyId = 'strategy_nonexistent';
      const updates = { name: 'Updated Name' };

      // Act & Assert
      await expect(service.updateCoordinationStrategy(nonExistentStrategyId, updates)).rejects.toThrow(
        new AppError(`Coordination strategy ${nonExistentStrategyId} not found`, 404)
      );
    });
  });

  describe('Coordination Analytics', () => {
    it('should provide comprehensive coordination analytics', async () => {
      // Arrange
      const timeRange = {
        start: new Date('2023-01-01T00:00:00Z'),
        end: new Date('2023-01-02T00:00:00Z'),
      };

      // Simulate some coordination activity
      const context = createValidCoordinationContext();
      const event = createValidErrorCoordinationEvent();
      await service.registerStream(context);
      await service.coordinateErrorEvent(event);

      // Act
      const analytics = await service.getCoordinationAnalytics(timeRange);

      // Assert
      expect(analytics.coordinationEvents).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeLessThanOrEqual(100);
      expect(analytics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(analytics.cascadesPrevented).toBeGreaterThanOrEqual(0);
      expect(analytics.businessImpactPrevented).toBeGreaterThanOrEqual(0);
      expect(analytics.streamParticipation).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle coordination failures gracefully', async () => {
      // Arrange
      const event = createValidErrorCoordinationEvent({
        sourceStream: 'stream_nonexistent' // Non-existent source stream
      });

      // Act
      const result = await service.coordinateErrorEvent(event);

      // Assert - Should return failed coordination result, not throw
      expect(result.success).toBe(false);
      expect(result.strategy).toBe('error_fallback');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].success).toBe(false);
    });

    it('should handle strategy execution failures', async () => {
      // Arrange
      const nonExistentStrategyId = 'strategy_nonexistent';
      const context = { event: createValidErrorCoordinationEvent() };

      // Act & Assert
      await expect(service.executeCoordinationStrategy(nonExistentStrategyId, context)).rejects.toThrow(
        new AppError(`Coordination strategy ${nonExistentStrategyId} not found`, 404)
      );
    });

    it('should handle system overload scenarios', async () => {
      // Arrange - Register many streams to simulate overload
      const manyStreams = Array(100).fill(null).map((_, index) => 
        createValidCoordinationContext({ streamId: `stream_load_${index}` })
      );
      
      // Act - Should handle registration of many streams
      const registrationPromises = manyStreams.map(ctx => 
        service.registerStream(ctx).catch(error => ({ error }))
      );
      const results = await Promise.all(registrationPromises);

      // Assert - Most registrations should succeed
      const successfulRegistrations = results.filter(result => !result.error);
      expect(successfulRegistrations.length).toBeGreaterThan(manyStreams.length * 0.8); // 80% success rate
    });
  });

  describe('Security and Data Privacy (GDPR Compliance)', () => {
    it('should not expose sensitive stream data in coordination results', async () => {
      // Arrange
      const sensitiveContext = createValidCoordinationContext({
        metadata: {
          version: '1.0.0',
          capabilities: ['prediction'],
          credentials: 'secret_api_key_123', // Sensitive data
          internalId: 'internal_12345', // Sensitive data
        } as any,
      });
      
      await service.registerStream(sensitiveContext);
      const event = createValidErrorCoordinationEvent();

      // Act
      const result = await service.coordinateErrorEvent(event);

      // Assert - GDPR Compliance
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain('secret_api_key_123');
      expect(resultString).not.toContain('internal_12345');
    });

    it('should anonymize analytics data appropriately', async () => {
      // Arrange
      const timeRange = {
        start: new Date('2023-01-01T00:00:00Z'),
        end: new Date('2023-01-02T00:00:00Z'),
      };

      // Act
      const analytics = await service.getCoordinationAnalytics(timeRange);

      // Assert - Data Anonymization
      const analyticsString = JSON.stringify(analytics);
      expect(analyticsString).not.toMatch(/user_\d+|email|phone|ssn|customer_id/i);
    });
  });

  describe('Business Logic Validation', () => {
    it('should calculate business impact accurately for coordination', async () => {
      // Arrange
      const highImpactEvent = createValidErrorCoordinationEvent({
        details: {
          errorCount: 500,
          errorRate: 0.25,
          businessImpact: BusinessImpact.CRITICAL,
          estimatedRevenueLoss: 50000,
        } as any,
      });

      const context = createValidCoordinationContext();
      await service.registerStream(context);

      // Act
      const result = await service.coordinateErrorEvent(highImpactEvent);

      // Assert - Business Impact Calculation
      expect(result.businessImpact).toBeDefined();
      expect(result.businessImpact.prevented).toBe(true);
      expect(result.businessImpact.estimatedSavings).toBeGreaterThan(0);
      expect(result.businessImpact.affectedCustomers).toBeGreaterThanOrEqual(0);
      expect(result.businessImpact.downtimePrevented).toBeGreaterThan(0);
    });

    it('should prioritize coordination based on stream priority', async () => {
      // Arrange
      const criticalStream = createValidCoordinationContext({
        streamId: 'stream_critical',
        priority: 'critical',
      });
      
      const lowPriorityStream = createValidCoordinationContext({
        streamId: 'stream_low',
        priority: 'low',
      });

      await service.registerStream(criticalStream);
      await service.registerStream(lowPriorityStream);

      const criticalEvent = createValidErrorCoordinationEvent({
        sourceStream: 'stream_critical',
        severity: 'critical',
      });

      // Act
      const result = await service.coordinateErrorEvent(criticalEvent);

      // Assert - Critical streams should get priority handling
      expect(result.success).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should track coordination performance metrics accurately', async () => {
      // Arrange - Perform several coordinations to generate metrics
      const context = createValidCoordinationContext();
      await service.registerStream(context);

      const events = Array(5).fill(null).map((_, index) => 
        createValidErrorCoordinationEvent({ eventId: `event_${index}` })
      );

      // Act - Execute coordinations
      for (const event of events) {
        await service.coordinateErrorEvent(event);
      }

      const analytics = await service.getCoordinationAnalytics({
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      // Assert - Performance Metrics
      expect(analytics.coordinationEvents).toBeGreaterThan(0);
      expect(analytics.averageResponseTime).toBeLessThan(50); // Hub requirement
      expect(analytics.successRate).toBeGreaterThan(0);
    });
  });
});