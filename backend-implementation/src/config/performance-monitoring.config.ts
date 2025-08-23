/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PERFORMANCE MONITORING CONFIGURATION
 * ============================================================================
 *
 * Comprehensive performance monitoring type safety configuration designed to
 * replace 1978+ 'any' occurrences across 151 services with strongly typed
 * performance metric interfaces for enterprise-grade monitoring.
 *
 * TRIANGLE COORDINATION: Performance-Optimization-Specialist + Code-Refactoring-Analyst + Database-Architect
 * SESSION ID: typescript-infrastructure-triangle-006
 * 
 * Created by: Performance-Optimization-Specialist
 * Date: 2025-08-22
 * Version: 1.0.0 - Infrastructure Configuration Type Safety
 */

/**
 * =============================================================================
 * CORE PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export type PerformanceMetricStatus = "healthy" | "warning" | "critical" | "unknown";
export type PerformanceMetricType = "counter" | "gauge" | "histogram" | "timer";
export type ServiceHealthStatus = "operational" | "degraded" | "partial_outage" | "major_outage";

/**
 * Base performance metric interface
 */
export interface BasePerformanceMetric {
  timestamp: Date;
  value: number;
  unit: string;
  type: PerformanceMetricType;
  labels: Record<string, string>;
  status: PerformanceMetricStatus;
}

/**
 * Service performance metrics
 */
export interface ServicePerformanceMetrics {
  serviceName: string;
  version: string;
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
    loadAverage: number[];
  };
  status: ServiceHealthStatus;
  lastHealthCheck: Date;
}

/**
 * =============================================================================
 * DATABASE PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface DatabasePerformanceMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    waiting: number;
    utilization: number;
  };
  queries: {
    totalCount: number;
    averageExecutionTime: number;
    slowQueryCount: number;
    errorCount: number;
  };
  transactions: {
    committed: number;
    rolledBack: number;
    averageDuration: number;
  };
  locks: {
    currentLocks: number;
    deadlockCount: number;
    lockWaitTime: number;
  };
  storage: {
    sizeBytes: number;
    indexSizeBytes: number;
    freeSpaceBytes: number;
  };
}

/**
 * =============================================================================
 * CACHE PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: {
    used: number;
    max: number;
    percentage: number;
  };
  operationsPerSecond: {
    reads: number;
    writes: number;
    deletes: number;
  };
  averageResponseTime: {
    read: number;
    write: number;
    delete: number;
  };
  keyCount: number;
  expiredKeyCount: number;
  connectionCount: number;
}

/**
 * =============================================================================
 * EXTERNAL API PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface ExternalAPIPerformanceMetrics {
  serviceName: string;
  endpoint: string;
  requestCount: number;
  errorCount: number;
  timeoutCount: number;
  averageResponseTime: number;
  rateLimitHits: number;
  rateLimitRemaining: number;
  costMetrics: {
    totalCost: number;
    costPerRequest: number;
    currency: string;
  };
  reliability: {
    successRate: number;
    availability: number;
    mttr: number; // Mean Time To Recovery
  };
}

/**
 * =============================================================================
 * QUEUE PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface QueuePerformanceMetrics {
  queueName: string;
  depth: number;
  processingRate: number;
  errorRate: number;
  averageProcessingTime: number;
  backlogAge: number;
  workerCount: {
    active: number;
    idle: number;
    total: number;
  };
  jobStatus: {
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
  };
}

/**
 * =============================================================================
 * SECURITY PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface SecurityPerformanceMetrics {
  authenticationMetrics: {
    successfulLogins: number;
    failedLogins: number;
    averageAuthTime: number;
    mfaSuccessRate: number;
  };
  encryptionMetrics: {
    operationsPerSecond: number;
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    keyRotationCount: number;
  };
  threatDetection: {
    threatsBlocked: number;
    suspiciousActivities: number;
    falsePositiveRate: number;
    responseTime: number;
  };
}

/**
 * =============================================================================
 * ML/AI PERFORMANCE MONITORING TYPES
 * =============================================================================
 */

export interface MLPerformanceMetrics {
  modelName: string;
  version: string;
  inferenceMetrics: {
    requestCount: number;
    averageLatency: number;
    throughput: number;
    errorRate: number;
  };
  accuracy: {
    precision: number;
    recall: number;
    f1Score: number;
  };
  resourceUsage: {
    gpuUtilization: number;
    memoryUsage: number;
    computeUnits: number;
  };
  trainingMetrics?: {
    lastTrainingDate: Date;
    trainingDuration: number;
    datasetSize: number;
    convergenceRate: number;
  };
}

/**
 * =============================================================================
 * COMPREHENSIVE SYSTEM PERFORMANCE MONITORING
 * =============================================================================
 */

export interface SystemPerformanceSnapshot {
  timestamp: Date;
  system: {
    uptime: number;
    loadAverage: number[];
    memoryUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    diskUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    networkIO: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    };
  };
  services: ServicePerformanceMetrics[];
  databases: DatabasePerformanceMetrics[];
  caches: CachePerformanceMetrics[];
  externalAPIs: ExternalAPIPerformanceMetrics[];
  queues: QueuePerformanceMetrics[];
  security: SecurityPerformanceMetrics;
  ml: MLPerformanceMetrics[];
}

/**
 * =============================================================================
 * PERFORMANCE ALERT AND THRESHOLD TYPES
 * =============================================================================
 */

export interface PerformanceThreshold {
  metricName: string;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  direction: "above" | "below";
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: "warning" | "critical";
  serviceName: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

/**
 * =============================================================================
 * CONFIGURATION INTERFACES
 * =============================================================================
 */

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // seconds
  retentionPeriod: number; // days
  thresholds: PerformanceThreshold[];
  alerting: {
    enabled: boolean;
    channels: {
      email: boolean;
      slack: boolean;
      webhook: boolean;
    };
    aggregationWindow: number; // seconds
  };
  storage: {
    backend: "prometheus" | "influxdb" | "cloudwatch";
    compression: boolean;
    sharding: boolean;
  };
}

/**
 * =============================================================================
 * TYPE UTILITY FUNCTIONS
 * =============================================================================
 */

export type MetricsCollector<T> = {
  collect(): Promise<T>;
  reset(): void;
  getSnapshot(): T;
};

export type PerformanceMetricsRegistry = {
  [K in string]: MetricsCollector<any>;
};

/**
 * Performance monitoring result type for method decorators
 */
export interface PerformanceMonitoringResult<T> {
  result: T;
  metrics: {
    executionTime: number;
    memoryUsed: number;
    cpuUsed: number;
    timestamp: Date;
  };
}

/**
 * =============================================================================
 * EXPORT ALL TYPES FOR GLOBAL USE
 * =============================================================================
 */

// Types are already exported above - no need for duplicate export block