/**
 * ============================================================================
 * API TYPE DEFINITIONS
 * ============================================================================
 * 
 * Comprehensive type definitions for API interfaces, service results, and
 * common data structures used throughout the application
 */

import { Request, Response } from 'express';
import { User } from '@/models/User';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

// ============================================================================
// Service Result Types
// ============================================================================

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  message?: string;
  metadata?: Record<string, any>;
}

export interface ServiceError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  recoverable?: boolean;
  retryable?: boolean;
  retryAfter?: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
  organizationId?: string;
  roles?: string[];
  permissions?: string[];
  session?: any;
  token?: string;
}

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  validateResponse?: boolean;
  throwOnError?: boolean;
}

// ============================================================================
// Route Optimization Types
// ============================================================================

export interface RouteOptimizationRequest {
  vehicleId: string;
  startLocation: {
    latitude: number;
    longitude: number;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
  };
  waypoints: Array<{
    id: string;
    latitude: number;
    longitude: number;
    priority?: number;
    timeWindow?: {
      start: string;
      end: string;
    };
    serviceDuration?: number;
  }>;
  constraints?: {
    maxDistance?: number;
    maxDuration?: number;
    maxStops?: number;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    preferredRouteType?: 'fastest' | 'shortest' | 'eco';
  };
  optimization?: {
    algorithm?: 'genetic' | 'simulated_annealing' | 'nearest_neighbor' | 'clarke_wright';
    iterations?: number;
    populationSize?: number;
    mutationRate?: number;
  };
}

export interface RouteOptimizationResponse {
  success: boolean;
  optimizedRoute?: {
    vehicleId: string;
    totalDistance: number;
    totalDuration: number;
    totalCost?: number;
    waypoints: Array<{
      id: string;
      sequence: number;
      arrivalTime: string;
      departureTime: string;
      distance: number;
      duration: number;
    }>;
    polyline?: string;
    warnings?: string[];
  };
  error?: string;
  processingTime?: number;
  algorithm?: string;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface BaseSystemError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  action?: string;
  recoverable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityError extends BaseSystemError {
  type: 'authentication' | 'authorization' | 'validation' | 'encryption' | 'compliance';
  resource?: string;
  requiredPermissions?: string[];
  actualPermissions?: string[];
}

export interface ValidationError extends BaseSystemError {
  fields?: Record<string, string[]>;
  validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
    constraint?: string;
  }>;
}

// ============================================================================
// External Service Types
// ============================================================================

export interface ExternalServiceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitPerMinute?: number;
  healthCheckUrl?: string;
  fallbackProvider?: string;
  priority?: number;
  cost?: {
    perRequest?: number;
    monthly?: number;
    freeQuota?: number;
  };
}

export interface ServiceProvider {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'fallback';
  status: 'active' | 'degraded' | 'down' | 'maintenance';
  lastHealthCheck?: Date;
  successRate?: number;
  averageResponseTime?: number;
  config: ExternalServiceConfig;
}

export interface FallbackProvider {
  providerId: string;
  priority: number;
  conditions?: {
    errorCodes?: string[];
    maxResponseTime?: number;
    minSuccessRate?: number;
  };
}

export interface FallbackContext {
  primaryProvider: string;
  fallbackProvider: string;
  reason: string;
  errorCode?: string;
  timestamp: Date;
  attemptNumber: number;
  maxAttempts: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  timezone?: string;
}

export interface QueuePerformanceMetrics {
  queueName: string;
  jobsProcessed: number;
  jobsFailed: number;
  jobsPending: number;
  averageProcessingTime: number;
  peakProcessingTime: number;
  successRate: number;
  throughput: number;
  backlog: number;
  timestamp: Date;
}

// ============================================================================
// Real-time Event Types
// ============================================================================

export interface RealTimeErrorEvent {
  id: string;
  type: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  context?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface CrossStreamErrorContext {
  streamId: string;
  streamName: string;
  errorType: string;
  affectedStreams: string[];
  propagationPath: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationActions?: string[];
  recoveryTime?: number;
}

// ============================================================================
// Routing Decision Types
// ============================================================================

export interface RoutingDecision {
  id: string;
  timestamp: Date;
  algorithm: string;
  inputData: {
    vehicles: number;
    stops: number;
    constraints: Record<string, any>;
  };
  outputData: {
    routes: any[];
    totalDistance: number;
    totalTime: number;
    totalCost: number;
    efficiency: number;
  };
  performanceMetrics: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  confidence: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface IntelligentRoutingNode {
  id: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  priority: number;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  serviceDuration: number;
  demands?: Record<string, number>;
  skills?: string[];
  incompatibilities?: string[];
  cluster?: string;
  visited?: boolean;
  visitedAt?: Date;
  visitedBy?: string;
}

export interface SmartRoutingContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  timestamp: Date;
  routingParameters: {
    optimizationGoal: 'distance' | 'time' | 'cost' | 'balanced';
    constraints: Record<string, any>;
    preferences: Record<string, any>;
  };
  environmentalFactors?: {
    weather?: any;
    traffic?: any;
    events?: any[];
  };
  historicalPerformance?: {
    averageAccuracy: number;
    averageImprovement: number;
    totalOptimizations: number;
  };
}

// ============================================================================
// Coordination Strategy Types
// ============================================================================

export interface CoordinationStrategy {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'mesh' | 'hub' | 'hierarchical';
  agents: string[];
  priority: number;
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoff: number;
  };
  fallbackStrategy?: string;
  successCriteria?: {
    minAgentsSuccess: number;
    requiredAgents?: string[];
    timeLimit?: number;
  };
}

// ============================================================================
// ML Model Types
// ============================================================================

export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection' | 'forecasting';
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'xgboost' | 'prophet';
  status: 'training' | 'validating' | 'deployed' | 'deprecated' | 'failed';
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    rmse?: number;
    mae?: number;
    r2Score?: number;
  };
  deployedAt?: Date;
  lastUsed?: Date;
  endpoint?: string;
  inputSchema?: any;
  outputSchema?: any;
}

// ============================================================================
// Export utility type helpers
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
export type ErrorHandler = (error: Error, req: Request, res: Response, next: any) => void;
export type MiddlewareFunction = (req: Request, res: Response, next: any) => void;

// Type guards
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return obj && typeof obj.success === 'boolean';
}

export function isServiceResult<T>(obj: any): obj is ServiceResult<T> {
  return obj && typeof obj.success === 'boolean' && (obj.data !== undefined || obj.error !== undefined);
}

export function isAuthenticatedRequest(req: any): req is AuthenticatedRequest {
  return req && req.user !== undefined;
}
// Helper type for optional properties with exactOptionalPropertyTypes
export type OptionalProperty<T> = T | undefined;

// Updated response options for strict mode
export interface StrictSuccessResponseOptions<T = any> {
  data: T;
  message?: string | undefined;
  statusCode?: number | undefined;
}

export interface StrictErrorResponseOptions {
  message: string;
  statusCode?: number | undefined;
  errors?: any[] | undefined;
}
