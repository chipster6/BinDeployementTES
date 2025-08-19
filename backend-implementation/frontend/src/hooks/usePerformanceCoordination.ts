"use client";

/**
 * ============================================================================
 * PERFORMANCE COORDINATION HOOK
 * ============================================================================
 *
 * Frontend hook for coordinating with Performance Specialist backend service.
 * Integrates real-time performance metrics and optimization recommendations.
 *
 * Coordination Points:
 * - Performance Specialist: Real-time backend metrics integration
 * - Database Architect: Query performance correlation
 * - Innovation Architect: AI-powered optimization insights
 * - External API: Real-time data streaming performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCachedAPI } from './useCachedAPI';
import { useOptimizedWebSocket } from './useOptimizedWebSocket';

/**
 * Backend Performance Metrics Interface (coordinated with Performance Specialist)
 */
export interface BackendPerformanceMetrics {
  timestamp: Date;
  database: {
    connectionPool: {
      utilization: number;
      status: "healthy" | "warning" | "critical";
      active: number;
      total: number;
      efficiency: number;
    };
    queryPerformance: {
      averageResponseTime: number;
      slowQueries: number;
      queriesPerSecond: number;
      p95ResponseTime: number;
    };
    optimization: {
      indexesOptimized: number;
      recommendationsCount: number;
      lastOptimizationRun: Date | null;
      performanceGrade: "optimal" | "good" | "needs_attention" | "critical";
    };
  };
  cache: {
    statistics: {
      hitRatio: number;
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
    };
    spatial: {
      hitRatio: number;
      averageQueryTime: number;
      totalSpatialQueries: number;
      spatialIndexEffectiveness: number;
    };
    redis: {
      status: "healthy" | "unhealthy";
      memoryUsage: string;
      responseTime: number;
    };
  };
  performance: {
    overallGrade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
    targetsMet: number;
    totalTargets: number;
    criticalIssues: number;
    improvementOpportunities: string[];
  };
  coordination: {
    databaseArchitectSync: boolean;
    lastCoordinationUpdate: Date;
    activeOptimizations: string[];
    pendingOptimizations: string[];
  };
}

/**
 * Optimization Recommendation Interface
 */
export interface OptimizationRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: "database" | "cache" | "spatial" | "application";
  title: string;
  description: string;
  estimatedImprovement: string;
  implementationEffort: "low" | "medium" | "high";
  coordinationRequired: boolean;
  databaseArchitectInvolvement: boolean;
}

/**
 * Performance Correlation Data (Frontend + Backend)
 */
export interface PerformanceCorrelation {
  frontendMetrics: {
    componentRenderTime: number;
    virtualScrollPerformance: number;
    memoryUsage: number;
    cacheHitRatio: number;
  };
  backendMetrics: {
    databaseResponseTime: number;
    cacheEfficiency: number;
    connectionPoolEfficiency: number;
    spatialQueryPerformance: number;
  };
  correlations: {
    frontendBackendLatency: number;
    cacheCoherence: number;
    overallPerformanceScore: number;
  };
  recommendations: OptimizationRecommendation[];
}

/**
 * Performance Coordination Configuration
 */
export interface PerformanceCoordinationConfig {
  enableRealTimeSync?: boolean;
  metricsUpdateInterval?: number; // milliseconds
  correlationThreshold?: number; // Performance correlation threshold
  autoOptimization?: boolean;
  debugMode?: boolean;
}

/**
 * Performance Coordination Hook
 */
export function usePerformanceCoordination(config: PerformanceCoordinationConfig = {}) {
  const {
    enableRealTimeSync = true,
    metricsUpdateInterval = 5000,
    correlationThreshold = 0.7,
    autoOptimization = false,
    debugMode = false
  } = config;

  // State management
  const [backendMetrics, setBackendMetrics] = useState<BackendPerformanceMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [correlation, setCorrelation] = useState<PerformanceCorrelation | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<Array<{
    timestamp: Date;
    type: string;
    result: string;
    improvement: number;
  }>>([]);

  // Refs for performance tracking
  const lastUpdateRef = useRef<Date>(new Date());
  const frontendMetricsRef = useRef<any>(null);
  const correlationTimeoutRef = useRef<NodeJS.Timeout>();

  // Backend metrics fetching with caching
  const {
    data: backendMetricsData,
    isLoading: isLoadingBackend,
    error: backendError,
    refresh: refreshBackendMetrics
  } = useCachedAPI<BackendPerformanceMetrics>(
    '/api/performance/coordination/metrics',
    {},
    {
      ttl: metricsUpdateInterval,
      backgroundRefresh: true,
      staleWhileRevalidate: true
    }
  );

  // Optimization recommendations fetching
  const {
    data: recommendationsData,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refresh: refreshRecommendations
  } = useCachedAPI<OptimizationRecommendation[]>(
    '/api/performance/coordination/recommendations',
    {},
    {
      ttl: 30000, // 30 seconds
      backgroundRefresh: true
    }
  );

  // Real-time WebSocket integration for live performance updates
  const {
    data: realTimeMetrics,
    isConnected: isWebSocketConnected,
    error: webSocketError
  } = useOptimizedWebSocket('/ws/performance/coordination', {
    enabled: enableRealTimeSync,
    reconnectAttempts: 3,
    heartbeatInterval: 30000
  });

  // Update backend metrics when data is received
  useEffect(() => {
    if (backendMetricsData) {
      setBackendMetrics(backendMetricsData);
      lastUpdateRef.current = new Date();
      
      if (debugMode) {
        console.log('Backend metrics updated:', backendMetricsData);
      }
    }
  }, [backendMetricsData, debugMode]);

  // Update recommendations when data is received
  useEffect(() => {
    if (recommendationsData) {
      setRecommendations(recommendationsData);
      
      if (debugMode) {
        console.log('Optimization recommendations updated:', recommendationsData);
      }
    }
  }, [recommendationsData, debugMode]);

  // Handle real-time WebSocket updates
  useEffect(() => {
    if (realTimeMetrics && enableRealTimeSync) {
      // Merge real-time data with cached data
      setBackendMetrics(prev => ({
        ...prev,
        ...realTimeMetrics,
        timestamp: new Date()
      }));
      
      if (debugMode) {
        console.log('Real-time metrics received:', realTimeMetrics);
      }
    }
  }, [realTimeMetrics, enableRealTimeSync, debugMode]);

  // Frontend metrics integration function
  const updateFrontendMetrics = useCallback((frontendMetrics: {
    componentRenderTime: number;
    virtualScrollPerformance: number;
    memoryUsage: number;
    cacheHitRatio: number;
  }) => {
    frontendMetricsRef.current = frontendMetrics;
    
    // Trigger correlation calculation with debouncing
    if (correlationTimeoutRef.current) {
      clearTimeout(correlationTimeoutRef.current);
    }
    
    correlationTimeoutRef.current = setTimeout(() => {
      calculatePerformanceCorrelation();
    }, 500);
  }, []);

  // Performance correlation calculation
  const calculatePerformanceCorrelation = useCallback(() => {
    if (!backendMetrics || !frontendMetricsRef.current) return;

    const frontendMetrics = frontendMetricsRef.current;
    const backend = backendMetrics;

    // Extract backend metrics for correlation
    const backendData = {
      databaseResponseTime: backend.database.queryPerformance.averageResponseTime,
      cacheEfficiency: backend.cache.statistics.hitRatio,
      connectionPoolEfficiency: backend.database.connectionPool.efficiency,
      spatialQueryPerformance: backend.cache.spatial.averageQueryTime
    };

    // Calculate correlations
    const frontendBackendLatency = calculateLatencyCorrelation(
      frontendMetrics.componentRenderTime,
      backendData.databaseResponseTime
    );

    const cacheCoherence = calculateCacheCoherence(
      frontendMetrics.cacheHitRatio,
      backendData.cacheEfficiency
    );

    const overallPerformanceScore = calculateOverallScore(
      frontendMetrics,
      backendData,
      frontendBackendLatency,
      cacheCoherence
    );

    // Generate coordinated recommendations
    const coordinatedRecommendations = generateCoordinatedRecommendations(
      frontendMetrics,
      backendData,
      recommendations
    );

    const correlationData: PerformanceCorrelation = {
      frontendMetrics,
      backendMetrics: backendData,
      correlations: {
        frontendBackendLatency,
        cacheCoherence,
        overallPerformanceScore
      },
      recommendations: coordinatedRecommendations
    };

    setCorrelation(correlationData);

    if (debugMode) {
      console.log('Performance correlation calculated:', correlationData);
    }

    // Auto-optimization trigger
    if (autoOptimization && overallPerformanceScore < correlationThreshold) {
      triggerAutoOptimization(coordinatedRecommendations);
    }
  }, [backendMetrics, recommendations, correlationThreshold, autoOptimization, debugMode]);

  // Auto-optimization function
  const triggerAutoOptimization = useCallback(async (recs: OptimizationRecommendation[]) => {
    if (isOptimizing) return;

    const criticalRecommendations = recs.filter(r => 
      r.priority === 'critical' && 
      r.implementationEffort === 'low' &&
      !r.coordinationRequired
    );

    if (criticalRecommendations.length === 0) return;

    setIsOptimizing(true);

    try {
      for (const recommendation of criticalRecommendations) {
        const startTime = Date.now();
        
        // Execute optimization based on category
        await executeOptimization(recommendation);
        
        const executionTime = Date.now() - startTime;
        
        // Record optimization history
        setOptimizationHistory(prev => [...prev, {
          timestamp: new Date(),
          type: recommendation.title,
          result: 'success',
          improvement: calculateImprovementScore(recommendation)
        }]);

        if (debugMode) {
          console.log(`Auto-optimization completed: ${recommendation.title} (${executionTime}ms)`);
        }
      }

      // Refresh metrics after optimization
      setTimeout(() => {
        refreshBackendMetrics();
        refreshRecommendations();
      }, 1000);

    } catch (error) {
      console.error('Auto-optimization failed:', error);
      
      setOptimizationHistory(prev => [...prev, {
        timestamp: new Date(),
        type: 'auto-optimization',
        result: `failed: ${error.message}`,
        improvement: 0
      }]);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, refreshBackendMetrics, refreshRecommendations, debugMode]);

  // Manual optimization execution
  const executeOptimization = useCallback(async (recommendation: OptimizationRecommendation) => {
    setIsOptimizing(true);

    try {
      const response = await fetch('/api/performance/optimization/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: recommendation.category,
          title: recommendation.title,
          priority: recommendation.priority
        })
      });

      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setOptimizationHistory(prev => [...prev, {
        timestamp: new Date(),
        type: recommendation.title,
        result: 'success',
        improvement: result.improvement || 0
      }]);

      // Refresh metrics
      setTimeout(() => {
        refreshBackendMetrics();
        refreshRecommendations();
      }, 1000);

      return result;
    } catch (error) {
      setOptimizationHistory(prev => [...prev, {
        timestamp: new Date(),
        type: recommendation.title,
        result: `failed: ${error.message}`,
        improvement: 0
      }]);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [refreshBackendMetrics, refreshRecommendations]);

  // Performance benchmark function
  const runPerformanceBenchmark = useCallback(async () => {
    try {
      const response = await fetch('/api/performance/coordination/benchmark', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Benchmark failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update metrics with benchmark results
      setBackendMetrics(result.results);
      
      return result;
    } catch (error) {
      console.error('Performance benchmark failed:', error);
      throw error;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (correlationTimeoutRef.current) {
        clearTimeout(correlationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    backendMetrics,
    recommendations,
    correlation,
    isOptimizing,
    optimizationHistory,
    
    // Loading states
    isLoadingBackend,
    isLoadingRecommendations,
    isWebSocketConnected,
    
    // Errors
    backendError,
    recommendationsError,
    webSocketError,
    
    // Actions
    updateFrontendMetrics,
    executeOptimization,
    runPerformanceBenchmark,
    refreshBackendMetrics,
    refreshRecommendations,
    
    // Coordination status
    isCoordinated: backendMetrics?.coordination?.databaseArchitectSync || false,
    lastUpdate: lastUpdateRef.current,
    
    // Utilities
    getPerformanceGrade: () => backendMetrics?.performance?.overallGrade || 'F',
    getCriticalIssues: () => backendMetrics?.performance?.criticalIssues || 0,
    getTargetsMet: () => backendMetrics?.performance?.targetsMet || 0,
    getTotalTargets: () => backendMetrics?.performance?.totalTargets || 0
  };
}

// Helper functions
function calculateLatencyCorrelation(frontendTime: number, backendTime: number): number {
  const totalTime = frontendTime + backendTime;
  if (totalTime === 0) return 1;
  
  const correlation = Math.min(frontendTime, backendTime) / Math.max(frontendTime, backendTime);
  return Math.round(correlation * 100) / 100;
}

function calculateCacheCoherence(frontendHitRatio: number, backendHitRatio: number): number {
  const difference = Math.abs(frontendHitRatio - backendHitRatio);
  const coherence = 1 - (difference / Math.max(frontendHitRatio, backendHitRatio, 1));
  return Math.round(coherence * 100) / 100;
}

function calculateOverallScore(
  frontend: any,
  backend: any,
  latencyCorr: number,
  cacheCorr: number
): number {
  const frontendScore = (
    (frontend.virtualScrollPerformance / 100) * 0.3 +
    (1 - frontend.componentRenderTime / 100) * 0.3 +
    (frontend.cacheHitRatio) * 0.2 +
    (1 - frontend.memoryUsage / 500) * 0.2
  );

  const backendScore = (
    (1 - backend.databaseResponseTime / 1000) * 0.3 +
    (backend.cacheEfficiency) * 0.3 +
    (backend.connectionPoolEfficiency / 100) * 0.2 +
    (1 - backend.spatialQueryPerformance / 500) * 0.2
  );

  const correlationScore = (latencyCorr + cacheCorr) / 2;

  return Math.round(((frontendScore + backendScore) / 2 * correlationScore) * 100) / 100;
}

function generateCoordinatedRecommendations(
  frontend: any,
  backend: any,
  baseRecommendations: OptimizationRecommendation[]
): OptimizationRecommendation[] {
  const coordinated = [...baseRecommendations];

  // Add frontend-specific recommendations based on backend correlation
  if (frontend.componentRenderTime > 50 && backend.databaseResponseTime > 200) {
    coordinated.push({
      priority: "high",
      category: "application",
      title: "Frontend-Backend Latency Optimization",
      description: "High frontend render time correlates with slow database queries",
      estimatedImprovement: "30-50% overall response time improvement",
      implementationEffort: "medium",
      coordinationRequired: true,
      databaseArchitectInvolvement: true
    });
  }

  if (frontend.cacheHitRatio < 0.7 && backend.cacheEfficiency < 0.8) {
    coordinated.push({
      priority: "critical",
      category: "cache",
      title: "End-to-End Cache Strategy Optimization",
      description: "Poor cache performance across frontend and backend",
      estimatedImprovement: "60-80% cache performance improvement",
      implementationEffort: "high",
      coordinationRequired: true,
      databaseArchitectInvolvement: true
    });
  }

  return coordinated.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function calculateImprovementScore(recommendation: OptimizationRecommendation): number {
  const baseScorea = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5
  };
  
  const effort = {
    low: 1.5,
    medium: 1.0,
    high: 0.5
  };
  
  return baseScorea[recommendation.priority] * effort[recommendation.implementationEffort];
}

export default usePerformanceCoordination;