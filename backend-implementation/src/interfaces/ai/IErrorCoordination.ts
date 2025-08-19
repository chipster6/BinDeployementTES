/**
 * ============================================================================
 * ERROR COORDINATION SERVICE INTERFACE
 * ============================================================================
 * 
 * Interface for cross-stream error coordination, orchestration, and 
 * multi-service error management supporting parallel development streams.
 * 
 * Hub Authority Requirements:
 * - Cross-stream error coordination
 * - Multi-service error orchestration
 * - Real-time error propagation prevention
 */

import { BusinessImpact, SystemLayer } from "../../services/ErrorOrchestrationService";

/**
 * Cross-stream coordination context
 */
export interface CoordinationContext {
  streamId: string;
  streamType: "error_orchestration" | "performance_optimization" | "security_testing" | "infrastructure";
  priority: "low" | "medium" | "high" | "critical";
  dependencies: string[]; // Other stream IDs
  businessContext: {
    impact: BusinessImpact;
    affectedServices: string[];
    estimatedCost: number;
  };
}

/**
 * Error coordination event
 */
export interface ErrorCoordinationEvent {
  eventId: string;
  timestamp: Date;
  sourceStream: string;
  eventType: "error_detected" | "cascade_warning" | "recovery_started" | "coordination_required";
  severity: "low" | "medium" | "high" | "critical";
  systemLayer: SystemLayer;
  details: {
    errorCode: string;
    message: string;
    affectedComponents: string[];
    propagationRisk: number; // 0-1
  };
  coordination: {
    requiresOrchestration: boolean;
    coordinationStreams: string[];
    isolationRequired: boolean;
  };
}

/**
 * Stream health status
 */
export interface StreamHealthStatus {
  streamId: string;
  health: "healthy" | "degraded" | "critical" | "offline";
  lastHeartbeat: Date;
  errorRate: number;
  processingLatency: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  dependencyStatus: Record<string, "healthy" | "degraded" | "critical">;
}

/**
 * Coordination strategy
 */
export interface CoordinationStrategy {
  strategyId: string;
  name: string;
  description: string;
  triggers: {
    errorThreshold: number;
    cascadeRisk: number;
    businessImpactLevel: BusinessImpact;
    affectedStreams: number;
  };
  actions: {
    isolateStreams: boolean;
    throttleProcessing: boolean;
    activateFailover: boolean;
    notifyStakeholders: boolean;
    escalateIncident: boolean;
  };
  rollbackStrategy: {
    automaticRollback: boolean;
    rollbackThreshold: number;
    rollbackSteps: string[];
  };
}

/**
 * Coordination result
 */
export interface CoordinationResult {
  coordinationId: string;
  timestamp: Date;
  strategy: string;
  success: boolean;
  executionTime: number;
  streamsAffected: string[];
  actions: {
    action: string;
    success: boolean;
    executionTime: number;
    details: Record<string, any>;
  }[];
  businessImpact: {
    prevented: boolean;
    estimatedSavings: number;
    affectedCustomers: number;
    downtimePrevented: number; // minutes
  };
}

/**
 * Error Coordination Service Interface
 * Hub Authority Requirement: Cross-stream error coordination
 */
export interface IErrorCoordination {
  /**
   * Register stream for coordination
   * Hub Requirement: Stream registration and health monitoring
   */
  registerStream(context: CoordinationContext): Promise<{
    streamId: string;
    registered: boolean;
    coordinationEndpoint: string;
  }>;

  /**
   * Unregister stream from coordination
   * Hub Requirement: Clean stream deregistration
   */
  unregisterStream(streamId: string): Promise<boolean>;

  /**
   * Coordinate error event across streams
   * Hub Requirement: Real-time cross-stream error coordination
   */
  coordinateErrorEvent(event: ErrorCoordinationEvent): Promise<CoordinationResult>;

  /**
   * Get stream health status
   * Hub Requirement: Stream health monitoring and status reporting
   */
  getStreamHealth(streamId: string): Promise<StreamHealthStatus>;

  /**
   * Get all registered streams health
   * Hub Requirement: Multi-stream health overview
   */
  getAllStreamsHealth(): Promise<Record<string, StreamHealthStatus>>;

  /**
   * Execute coordination strategy
   * Hub Requirement: Coordinated error response execution
   */
  executeCoordinationStrategy(strategyId: string, context: any): Promise<CoordinationResult>;

  /**
   * Prevent error cascade across streams
   * Hub Requirement: Cascade failure prevention
   */
  preventErrorCascade(sourceStream: string, error: any): Promise<{
    cascadePrevented: boolean;
    isolatedStreams: string[];
    mitigationActions: string[];
  }>;

  /**
   * Monitor cross-stream dependencies
   * Hub Requirement: Dependency health monitoring
   */
  monitorDependencies(streamId: string): Promise<{
    healthyDependencies: string[];
    degradedDependencies: string[];
    criticalDependencies: string[];
    overallDependencyHealth: number; // 0-1
  }>;

  /**
   * Get coordination analytics
   * Hub Requirement: Coordination performance analytics
   */
  getCoordinationAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    coordinationEvents: number;
    successRate: number;
    averageResponseTime: number;
    cascadesPrevented: number;
    businessImpactPrevented: number;
    streamParticipation: Record<string, number>;
  }>;

  /**
   * Create custom coordination strategy
   * Hub Requirement: Custom coordination strategy creation
   */
  createCoordinationStrategy(strategy: CoordinationStrategy): Promise<string>; // Returns strategyId

  /**
   * Update coordination strategy
   * Hub Requirement: Strategy configuration management
   */
  updateCoordinationStrategy(strategyId: string, updates: Partial<CoordinationStrategy>): Promise<boolean>;

  /**
   * Test coordination strategy
   * Hub Requirement: Strategy validation and testing
   */
  testCoordinationStrategy(strategyId: string, simulationParams: any): Promise<{
    testId: string;
    success: boolean;
    executionTime: number;
    simulationResults: any;
    recommendations: string[];
  }>;
}