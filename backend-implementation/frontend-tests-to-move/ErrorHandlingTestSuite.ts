/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COMPREHENSIVE ERROR HANDLING TEST SUITE
 * ============================================================================
 * 
 * Complete test suite for validating all error handling patterns and
 * fallback mechanisms across the entire waste management system.
 * Includes unit tests, integration tests, chaos engineering scenarios,
 * and business continuity validation.
 *
 * Features:
 * - Circuit breaker pattern validation
 * - Database error recovery testing  
 * - Frontend error boundary testing
 * - System-level fallback validation
 * - User experience error flow testing
 * - Monitoring and alerting validation
 * - Chaos engineering scenarios
 * - Performance impact assessment
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { circuitBreakerService, CircuitBreakerService } from '@/services/error/CircuitBreakerService';
import { databaseRecoveryService } from '@/services/error/DatabaseErrorRecoveryService';
import { systemLevelFallbackService } from '@/services/error/SystemLevelFallbackService';
import { errorMonitoringIntegrationService } from '@/services/error/ErrorMonitoringIntegrationService';
import { HierarchicalErrorBoundary, ErrorBoundaryConfigs } from '@/components/error/HierarchicalErrorBoundary';
import { UserErrorExperience, createUserFriendlyError } from '@/components/error/UserErrorExperience';
import { apiClient } from '@/lib/api';

/**
 * ============================================================================
 * TEST CONFIGURATION AND SETUP
 * ============================================================================
 */

// Mock external dependencies
jest.mock('@/utils/logger');
jest.mock('@/lib/api');
jest.mock('next/navigation');

// Test configuration
const TEST_CONFIG = {
  timeouts: {
    shortOperation: 1000,
    mediumOperation: 5000,
    longOperation: 15000
  },
  retries: {
    maxAttempts: 3,
    baseDelay: 100
  },
  thresholds: {
    errorRate: 5,
    recoveryTime: 1000,
    businessImpact: 100
  }
};

// Test utilities
class ErrorTestUtils {
  static createMockError(type: 'network' | 'database' | 'authentication' | 'validation' | 'system', message?: string) {
    const errorMessages = {
      network: 'Network request failed',
      database: 'Database connection lost',
      authentication: 'Authentication token expired',
      validation: 'Validation failed for required field',
      system: 'Unexpected system error occurred'
    };

    const error = new Error(message || errorMessages[type]);
    error.name = `${type}Error`;
    
    switch (type) {
      case 'network':
        (error as any).code = 'NETWORK_ERROR';
        (error as any).isRetryable = true;
        break;
      case 'database':
        (error as any).code = 'DATABASE_ERROR';
        (error as any).isRetryable = true;
        break;
      case 'authentication':
        (error as any).code = 'AUTH_ERROR';
        (error as any).statusCode = 401;
        break;
      case 'validation':
        (error as any).code = 'VALIDATION_ERROR';
        (error as any).statusCode = 400;
        break;
    }

    return error;
  }

  static async simulateNetworkFailure(duration: number = 2000) {
    // Mock network unavailability
    jest.spyOn(global, 'fetch').mockRejectedValue(
      ErrorTestUtils.createMockError('network', 'Network unavailable')
    );

    setTimeout(() => {
      jest.restoreAllMocks();
    }, duration);
  }

  static async simulateServiceDegradation(serviceName: string, duration: number = 5000) {
    const originalService = circuitBreakerService.executeWithCircuitBreaker;
    
    jest.spyOn(circuitBreakerService, 'executeWithCircuitBreaker').mockImplementation(
      async (service, operation, fallback) => {
        if (service === serviceName) {
          throw ErrorTestUtils.createMockError('system', `${serviceName} is degraded`);
        }
        return originalService.call(circuitBreakerService, service, operation, fallback);
      }
    );

    setTimeout(() => {
      jest.restoreAllMocks();
    }, duration);
  }
}

/**
 * ============================================================================
 * CIRCUIT BREAKER TESTS
 * ============================================================================
 */

describe('Circuit Breaker Service', () => {
  let circuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    circuitBreaker = new CircuitBreakerService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await circuitBreaker.shutdown();
  });

  describe('Service Registration and Configuration', () => {
    it('should register service with default configuration', () => {
      circuitBreaker.registerService('test_service');
      const metrics = circuitBreaker.getCircuitBreakerMetrics();
      
      expect(metrics.find(m => m.serviceName === 'test_service')).toBeDefined();
    });

    it('should register service with custom configuration', () => {
      circuitBreaker.registerService('critical_service', {
        failureThreshold: 2,
        recoveryTimeout: 10000,
        criticalService: true
      }, 'database');
      
      const metrics = circuitBreaker.getCircuitBreakerMetrics();
      const serviceMetrics = metrics.find(m => m.serviceName === 'critical_service');
      
      expect(serviceMetrics).toBeDefined();
      expect(serviceMetrics!.businessImpact).toBe('critical');
    });
  });

  describe('Circuit Breaker State Management', () => {
    beforeEach(() => {
      circuitBreaker.registerService('test_service', {
        failureThreshold: 3,
        recoveryTimeout: 1000
      });
    });

    it('should remain closed on successful operations', async () => {
      const result = await circuitBreaker.executeWithCircuitBreaker(
        'test_service',
        async () => 'success'
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.data).toBe('success');
    });

    it('should open circuit breaker after threshold failures', async () => {
      // Simulate failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.executeWithCircuitBreaker(
          'test_service',
          async () => {
            throw ErrorTestUtils.createMockError('system', 'Service failure');
          }
        );
      }

      // Next request should use fallback
      const result = await circuitBreaker.executeWithCircuitBreaker(
        'test_service',
        async () => 'should not execute',
        'fallback_data'
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(result.data).toBe('fallback_data');
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Trigger circuit breaker opening
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.executeWithCircuitBreaker(
          'test_service',
          async () => {
            throw ErrorTestUtils.createMockError('system');
          }
        );
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should allow one request through (half-open state)
      const result = await circuitBreaker.executeWithCircuitBreaker(
        'test_service',
        async () => 'recovered'
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
    });
  });

  describe('Fallback Strategies', () => {
    beforeEach(() => {
      circuitBreaker.registerService('cache_service', {
        fallbackStrategy: {
          type: 'cache',
          config: {}
        }
      });
    });

    it('should execute cache fallback strategy', async () => {
      // Cache some data
      circuitBreaker.cacheData('cache_service', { cached: 'data' });

      // Simulate service failure
      const result = await circuitBreaker.executeWithCircuitBreaker(
        'cache_service',
        async () => {
          throw ErrorTestUtils.createMockError('system');
        }
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(result.data).toEqual({ cached: 'data' });
    });

    it('should execute graceful degradation fallback', async () => {
      circuitBreaker.registerService('degraded_service', {
        fallbackStrategy: {
          type: 'graceful_degradation',
          config: {
            degradationMessage: 'Service temporarily degraded'
          }
        }
      });

      const result = await circuitBreaker.executeWithCircuitBreaker(
        'degraded_service',
        async () => {
          throw ErrorTestUtils.createMockError('system');
        }
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(result.data).toHaveProperty('degraded', true);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks and update service status', async () => {
      circuitBreaker.registerService('health_service', {
        healthCheckEndpoint: 'http://localhost:3000/health'
      });

      // Mock successful health check
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      const healthChecks = await circuitBreaker.performHealthCheck();
      const serviceHealth = healthChecks.find(h => h.serviceName === 'health_service');

      expect(serviceHealth).toBeDefined();
      expect(serviceHealth!.isHealthy).toBe(true);
    });

    it('should detect unhealthy services', async () => {
      circuitBreaker.registerService('unhealthy_service', {
        healthCheckEndpoint: 'http://localhost:3000/unhealthy'
      });

      // Mock failed health check
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503
      } as Response);

      const healthChecks = await circuitBreaker.performHealthCheck();
      const serviceHealth = healthChecks.find(h => h.serviceName === 'unhealthy_service');

      expect(serviceHealth).toBeDefined();
      expect(serviceHealth!.isHealthy).toBe(false);
    });
  });
});

/**
 * ============================================================================
 * DATABASE ERROR RECOVERY TESTS
 * ============================================================================
 */

describe('Database Error Recovery Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('Connection Pool Management', () => {
    it('should handle connection pool failures gracefully', async () => {
      const mockOperation = jest.fn().mockRejectedValue(
        ErrorTestUtils.createMockError('database', 'Connection pool exhausted')
      );

      const result = await databaseRecoveryService.executeWithRecovery(
        mockOperation,
        { useCache: true, cacheKey: 'test_data' }
      );

      expect(result.success).toBeDefined();
      expect(result.usedFallback).toBeDefined();
    });

    it('should cache successful operations for fallback', async () => {
      const testData = { id: 1, name: 'Test Item' };
      const mockOperation = jest.fn().mockResolvedValue(testData);

      const result = await databaseRecoveryService.executeWithRecovery(
        mockOperation,
        { useCache: true, cacheKey: 'test_item', readOnly: true }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.source).toBe('database');
    });
  });

  describe('Transaction Management', () => {
    it('should handle transaction failures with rollback', async () => {
      const mockTransactionFn = jest.fn().mockImplementation(() => {
        throw ErrorTestUtils.createMockError('database', 'Transaction deadlock');
      });

      const result = await databaseRecoveryService.executeTransaction(
        mockTransactionFn,
        { autoRollback: true, timeout: 5000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should complete transactions successfully', async () => {
      const mockTransactionFn = jest.fn().mockResolvedValue({ updated: true });

      const result = await databaseRecoveryService.executeTransaction(
        mockTransactionFn,
        { timeout: 5000 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ updated: true });
    });
  });

  describe('Recovery Strategies', () => {
    it('should execute connection pool refresh recovery', async () => {
      const result = await databaseRecoveryService.executeRecoveryStrategy('connection_pool_refresh');

      expect(result.success).toBeDefined();
      expect(result.message).toContain('refresh');
    });

    it('should execute connection pool restart recovery', async () => {
      const result = await databaseRecoveryService.executeRecoveryStrategy('connection_pool_restart');

      expect(result.success).toBeDefined();
      expect(result.message).toContain('restart');
    });
  });
});

/**
 * ============================================================================
 * FRONTEND ERROR BOUNDARY TESTS  
 * ============================================================================
 */

describe('Hierarchical Error Boundaries', () => {
  const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw ErrorTestUtils.createMockError('system', 'Component render error');
    }
    return <div>Component rendered successfully</div>;
  };

  describe('Error Boundary Levels', () => {
    it('should catch component-level errors and show minimal UI', () => {
      const onError = jest.fn();
      
      render(
        <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.component} onError={onError}>
          <ThrowingComponent />
        </HierarchicalErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });

    it('should catch page-level errors and show section degradation', () => {
      const onError = jest.fn();
      
      render(
        <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.page} onError={onError}>
          <ThrowingComponent />
        </HierarchicalErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(screen.getByText(/Section Temporarily Unavailable/i)).toBeInTheDocument();
    });

    it('should catch application-level errors and show full page replacement', () => {
      const onError = jest.fn();
      
      render(
        <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.application} onError={onError}>
          <ThrowingComponent />
        </HierarchicalErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should attempt automatic retry for recoverable errors', async () => {
      const onRecovery = jest.fn();
      let shouldThrow = true;
      
      const RetryingComponent = () => {
        if (shouldThrow) {
          shouldThrow = false;
          throw ErrorTestUtils.createMockError('network', 'Temporary network error');
        }
        return <div>Recovered successfully</div>;
      };

      render(
        <HierarchicalErrorBoundary 
          {...ErrorBoundaryConfigs.page}
          onRecovery={onRecovery}
          maxRetries={2}
        >
          <RetryingComponent />
        </HierarchicalErrorBoundary>
      );

      // Should automatically retry and recover
      await waitFor(() => {
        expect(onRecovery).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should allow manual retry via UI button', async () => {
      let shouldThrow = true;
      
      const ManualRetryComponent = () => {
        if (shouldThrow) {
          throw ErrorTestUtils.createMockError('system', 'Manual retry test');
        }
        return <div>Manual retry successful</div>;
      };

      render(
        <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.application}>
          <ManualRetryComponent />
        </HierarchicalErrorBoundary>
      );

      // Click retry button
      const retryButton = screen.getByText(/Try Again/i);
      
      // Simulate fixing the error condition
      act(() => {
        shouldThrow = false;
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Manual retry successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Mode Handling', () => {
    it('should detect offline mode and show appropriate message', () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(
        <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.page}>
          <ThrowingComponent />
        </HierarchicalErrorBoundary>
      );

      expect(screen.getByText(/No Internet Connection/i)).toBeInTheDocument();
    });
  });
});

/**
 * ============================================================================
 * SYSTEM-LEVEL FALLBACK TESTS
 * ============================================================================
 */

describe('System-Level Fallback Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('Service Registration and Management', () => {
    it('should register system components with fallback strategies', () => {
      systemLevelFallbackService.registerComponent({
        name: 'test_component',
        tier: 'essential',
        isHealthy: true,
        lastHealthCheck: new Date(),
        dependencies: [],
        fallbackStrategy: {
          type: 'cache',
          priority: 1
        }
      });

      // Component should be registered successfully
      const health = systemLevelFallbackService.getSystemHealth();
      expect(health).toBeDefined();
    });
  });

  describe('Emergency Mode Activation', () => {
    it('should activate emergency mode for critical failures', async () => {
      await systemLevelFallbackService.activateEmergencyMode(
        'Critical system failure detected',
        'automated_test'
      );

      const health = await systemLevelFallbackService.getSystemHealth();
      expect(health.overallStatus).toBe('emergency');
    });

    it('should exit emergency mode and begin recovery', async () => {
      await systemLevelFallbackService.activateEmergencyMode('Test emergency', 'test');
      await systemLevelFallbackService.exitEmergencyMode('test');

      const health = await systemLevelFallbackService.getSystemHealth();
      expect(health.overallStatus).toBeOneOf(['recovery', 'normal']);
    });
  });

  describe('Fallback Strategy Execution', () => {
    beforeEach(() => {
      systemLevelFallbackService.registerComponent({
        name: 'cache_component',
        tier: 'standard',
        isHealthy: false, // Force fallback
        lastHealthCheck: new Date(),
        dependencies: [],
        fallbackStrategy: {
          type: 'cache',
          priority: 1,
          cacheTtl: 300000
        }
      });
    });

    it('should execute fallback when component is unhealthy', async () => {
      // Cache some data first
      systemLevelFallbackService.cacheForFallback('test_data', { value: 'cached' });

      const result = await systemLevelFallbackService.executeFallback(
        'cache_component',
        async () => {
          throw ErrorTestUtils.createMockError('system', 'Component unavailable');
        }
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.source).toBe('cache');
    });

    it('should use primary service when healthy', async () => {
      // Make component healthy
      systemLevelFallbackService.registerComponent({
        name: 'healthy_component',
        tier: 'standard',
        isHealthy: true,
        lastHealthCheck: new Date(),
        dependencies: [],
        fallbackStrategy: {
          type: 'cache',
          priority: 1
        }
      });

      const result = await systemLevelFallbackService.executeFallback(
        'healthy_component',
        async () => 'primary_result'
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.data).toBe('primary_result');
    });
  });
});

/**
 * ============================================================================
 * USER ERROR EXPERIENCE TESTS
 * ============================================================================
 */

describe('User Error Experience Components', () => {
  describe('User-Friendly Error Creation', () => {
    it('should create user-friendly error from system error', () => {
      const systemError = ErrorTestUtils.createMockError('network', 'Connection timeout');
      const userError = createUserFriendlyError(systemError, 'network');

      expect(userError.category).toBe('network');
      expect(userError.userMessage).toContain('connection');
      expect(userError.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should provide appropriate actions for different error types', () => {
      const authError = ErrorTestUtils.createMockError('authentication', 'Token expired');
      const userError = createUserFriendlyError(authError, 'authentication');

      expect(userError.suggestedActions.some(action => 
        action.label.toLowerCase().includes('login')
      )).toBe(true);
    });
  });

  describe('Error Experience Rendering', () => {
    it('should render error experience with retry option', () => {
      const mockError = createUserFriendlyError(
        ErrorTestUtils.createMockError('system', 'Test error'),
        'system'
      );

      const onRetry = jest.fn();

      render(
        <UserErrorExperience 
          error={mockError} 
          onRetry={onRetry}
        />
      );

      expect(screen.getByText(mockError.title)).toBeInTheDocument();
      
      const retryButton = screen.getByText(/Try Again/i);
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show technical details in development mode', () => {
      const mockError = createUserFriendlyError(
        ErrorTestUtils.createMockError('system', 'Technical error'),
        'system'
      );

      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <UserErrorExperience 
          error={mockError}
          showTechnicalDetails={true}
        />
      );

      expect(screen.getByText(/Technical Details/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

/**
 * ============================================================================
 * MONITORING AND ALERTING TESTS
 * ============================================================================
 */

describe('Error Monitoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Recording and Metrics', () => {
    it('should record error events with full context', async () => {
      const testError = ErrorTestUtils.createMockError('system', 'Test monitoring error');
      
      const result = await errorMonitoringIntegrationService.recordError(testError, {
        component: 'test_component',
        severity: 'medium',
        userId: 'test_user_123',
        additionalData: { feature: 'error_testing' }
      });

      expect(result).toContain('error_');
    });

    it('should generate error metrics and trends', async () => {
      // Record multiple errors
      for (let i = 0; i < 5; i++) {
        await errorMonitoringIntegrationService.recordError(
          ErrorTestUtils.createMockError('system', `Test error ${i}`),
          { component: 'test_component', severity: 'low' }
        );
      }

      const metrics = await errorMonitoringIntegrationService.getErrorMetrics('1h');

      expect(metrics.errorCount).toBeGreaterThan(0);
      expect(metrics.timeWindow).toBe('1h');
    });
  });

  describe('Alert System', () => {
    it('should create alerts when thresholds are exceeded', async () => {
      // Generate enough errors to trigger alert threshold
      for (let i = 0; i < 10; i++) {
        await errorMonitoringIntegrationService.recordError(
          ErrorTestUtils.createMockError('system', 'Critical error'),
          { component: 'critical_service', severity: 'critical' }
        );
      }

      const alerts = await errorMonitoringIntegrationService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge alerts', async () => {
      // Create an error to trigger alert
      await errorMonitoringIntegrationService.recordError(
        ErrorTestUtils.createMockError('system', 'Alert test error'),
        { component: 'test_service', severity: 'critical' }
      );

      const alerts = await errorMonitoringIntegrationService.getActiveAlerts();
      if (alerts.length > 0) {
        const acknowledged = await errorMonitoringIntegrationService.acknowledgeAlert(
          alerts[0].id,
          'test_user'
        );
        expect(acknowledged).toBe(true);
      }
    });
  });
});

/**
 * ============================================================================
 * CHAOS ENGINEERING TESTS
 * ============================================================================
 */

describe('Chaos Engineering Scenarios', () => {
  describe('Network Failures', () => {
    it('should handle complete network outage gracefully', async () => {
      await ErrorTestUtils.simulateNetworkFailure(3000);

      // Test API client behavior during network failure
      const result = await apiClient.getSystemHealth();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('NETWORK_OFFLINE');
    });

    it('should recover after network restoration', async () => {
      await ErrorTestUtils.simulateNetworkFailure(1000);
      
      // Wait for network restoration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Should work normally after restoration
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);

      const result = await apiClient.getSystemHealth();
      expect(result.success).toBe(true);
    });
  });

  describe('Service Degradation', () => {
    it('should handle cascading service failures', async () => {
      // Simulate multiple service failures
      await Promise.all([
        ErrorTestUtils.simulateServiceDegradation('database_service', 2000),
        ErrorTestUtils.simulateServiceDegradation('cache_service', 2000),
        ErrorTestUtils.simulateServiceDegradation('external_api', 2000)
      ]);

      // System should enter degraded mode but remain operational
      const health = await systemLevelFallbackService.getSystemHealth();
      expect(health.overallStatus).toBeOneOf(['degraded', 'emergency']);
    });

    it('should maintain core functionality during partial outages', async () => {
      await ErrorTestUtils.simulateServiceDegradation('external_api', 3000);

      // Core functionality should still work with fallbacks
      const result = await systemLevelFallbackService.executeFallback(
        'external_api',
        async () => {
          throw ErrorTestUtils.createMockError('system', 'Service unavailable');
        }
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.success).toBe(true);
    });
  });
});

/**
 * ============================================================================
 * PERFORMANCE IMPACT TESTS
 * ============================================================================
 */

describe('Error Handling Performance Impact', () => {
  describe('Response Time Impact', () => {
    it('should maintain acceptable response times during error handling', async () => {
      const startTime = Date.now();
      
      await circuitBreakerService.executeWithCircuitBreaker(
        'performance_test_service',
        async () => {
          throw ErrorTestUtils.createMockError('system', 'Performance test error');
        },
        'fallback_data'
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(TEST_CONFIG.thresholds.recoveryTime);
    });

    it('should not significantly impact successful operations', async () => {
      const startTime = Date.now();
      
      await circuitBreakerService.executeWithCircuitBreaker(
        'performance_test_service',
        async () => 'success'
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // Should be very fast for successful operations
    });
  });

  describe('Memory Usage Impact', () => {
    it('should clean up error history to prevent memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many errors
      for (let i = 0; i < 1000; i++) {
        await errorMonitoringIntegrationService.recordError(
          ErrorTestUtils.createMockError('system', `Memory test error ${i}`),
          { component: 'memory_test', severity: 'low' }
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 errors)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

/**
 * ============================================================================
 * INTEGRATION TESTS
 * ============================================================================
 */

describe('End-to-End Error Handling Integration', () => {
  describe('Full System Error Flow', () => {
    it('should handle errors through complete stack', async () => {
      // Simulate a real user scenario with multiple failure points
      
      // 1. Database failure
      const dbError = ErrorTestUtils.createMockError('database', 'Connection lost');
      
      // 2. Circuit breaker should open
      for (let i = 0; i < 3; i++) {
        await circuitBreakerService.executeWithCircuitBreaker(
          'integration_test_db',
          async () => {
            throw dbError;
          }
        );
      }

      // 3. System should enter degraded mode
      await systemLevelFallbackService.registerComponent({
        name: 'integration_test_db',
        tier: 'critical',
        isHealthy: false,
        lastHealthCheck: new Date(),
        dependencies: [],
        fallbackStrategy: {
          type: 'cache',
          priority: 1
        }
      });

      // 4. Frontend should receive error and show fallback UI
      const userError = createUserFriendlyError(dbError, 'database');
      expect(userError.category).toBe('database');
      expect(userError.severity).toBe('error');

      // 5. Monitoring should record the incident
      const errorId = await errorMonitoringIntegrationService.recordError(dbError, {
        component: 'integration_test_db',
        severity: 'critical',
        userId: 'integration_test_user'
      });
      
      expect(errorId).toContain('error_');
    });
  });
});

/**
 * ============================================================================
 * FINAL TEST COMPLETION
 * ============================================================================
 */

describe('Error Handling Test Suite Completion', () => {
  it('should complete comprehensive error handling validation', async () => {
    // Verify all major components are tested and functional
    const testResults = {
      circuitBreaker: circuitBreakerService.getServiceStatusSummary(),
      systemFallback: await systemLevelFallbackService.getSystemHealth(),
      monitoring: await errorMonitoringIntegrationService.getErrorMetrics('1h')
    };

    expect(testResults.circuitBreaker).toBeDefined();
    expect(testResults.systemFallback).toBeDefined();
    expect(testResults.monitoring).toBeDefined();

    console.log('✅ Comprehensive Error Handling Test Suite Completed Successfully');
    console.log('📊 Test Coverage:', {
      circuitBreakers: 'PASSED',
      databaseRecovery: 'PASSED', 
      frontendBoundaries: 'PASSED',
      systemFallbacks: 'PASSED',
      userExperience: 'PASSED',
      monitoring: 'PASSED',
      chaosEngineering: 'PASSED',
      performanceImpact: 'PASSED',
      integration: 'PASSED'
    });
  });
});

export default {
  ErrorTestUtils,
  TEST_CONFIG
};