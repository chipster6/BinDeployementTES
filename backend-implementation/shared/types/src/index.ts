/**
 * ============================================================================
 * SHARED TYPES - DOMAIN EVENTS & DTOS
 * ============================================================================
 * 
 * Shared TypeScript interfaces and types for the waste management system.
 * Provides common contracts between services during extraction.
 */

// =============================================================================
// DOMAIN ENTITIES (SHARED ACROSS SERVICES)  
// =============================================================================

export interface UserId {
  readonly value: string;
}

export interface CustomerId {
  readonly value: string;
}

export interface BinId {
  readonly value: string;
}

export interface RouteId {
  readonly value: string;
}

export interface OrganizationId {
  readonly value: string;
}

// =============================================================================
// SERVICE RESULT PATTERNS
// =============================================================================

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// =============================================================================
// DOMAIN EVENTS (EVENT-DRIVEN COMMUNICATION)
// =============================================================================

export interface DomainEvent {
  event_id: string;
  event_type: string;
  event_version: string;
  aggregate_id: string;
  aggregate_type: string;
  timestamp: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

// Customer Events
export interface CustomerCreatedEvent extends DomainEvent {
  event_type: 'customer.created';
  payload: {
    customer_id: string;
    organization_id: string;
    email: string;
    name: string;
    status: 'active' | 'inactive';
  };
}

export interface CustomerUpdatedEvent extends DomainEvent {
  event_type: 'customer.updated';
  payload: {
    customer_id: string;
    changes: Record<string, any>;
    previous_values: Record<string, any>;
  };
}

// Bin Events  
export interface BinCreatedEvent extends DomainEvent {
  event_type: 'bin.created';
  payload: {
    bin_id: string;
    customer_id: string;
    bin_type: string;
    capacity: number;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  };
}

export interface BinCapacityUpdatedEvent extends DomainEvent {
  event_type: 'bin.capacity.updated';
  payload: {
    bin_id: string;
    previous_level: number;
    current_level: number;
    capacity: number;
    needs_collection: boolean;
  };
}

export interface BinCollectedEvent extends DomainEvent {
  event_type: 'bin.collected';
  payload: {
    bin_id: string;
    route_id: string;
    collected_at: string;
    collected_by: string;
    volume_collected: number;
  };
}

// Route Events
export interface RouteOptimizedEvent extends DomainEvent {
  event_type: 'route.optimized';
  payload: {
    route_id: string;
    optimization_id: string;
    bin_ids: string[];
    estimated_duration: number;
    estimated_distance: number;
    optimization_score: number;
  };
}

export interface ServiceOrderScheduledEvent extends DomainEvent {
  event_type: 'service.order.scheduled';
  payload: {
    order_id: string;
    customer_id: string;
    route_id: string;
    scheduled_date: string;
    service_type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface PickupCompletedEvent extends DomainEvent {
  event_type: 'pickup.completed';
  payload: {
    pickup_id: string;
    route_id: string;
    bin_ids: string[];
    completed_at: string;
    driver_id: string;
    notes?: string;
  };
}

// External Service Events
export interface PaymentProcessedEvent extends DomainEvent {
  event_type: 'payment.processed';
  payload: {
    payment_id: string;
    customer_id: string;
    amount: number;
    currency: string;
    status: 'successful' | 'failed' | 'pending';
    external_reference: string;
  };
}

// =============================================================================
// API CONTRACT TYPES
// =============================================================================

// Auth Service Contracts
export interface AuthenticateRequest {
  email: string;
  password: string;
  mfa_code?: string;
}

export interface AuthenticateResponse {
  user: {
    id: string;
    email: string;
    role: string;
    organization_id: string;
  };
  token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthorizeRequest {
  token: string;
  required_permissions: string[];
}

export interface AuthorizeResponse {
  authorized: boolean;
  user_id: string;
  permissions: string[];
}

// Operations Service Contracts
export interface CreateCustomerRequest {
  email: string;
  name: string;
  organization_id: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface CreateBinRequest {
  customer_id: string;
  bin_type: 'residential' | 'commercial' | 'recycling' | 'compost';
  capacity: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// Spatial Service Contracts
export interface OptimizeRouteRequest {
  bins: Array<{
    id: string;
    location: { latitude: number; longitude: number };
    priority: number;
    time_window?: { start: string; end: string };
  }>;
  vehicles: Array<{
    id: string;
    capacity: number;
    start_location: { latitude: number; longitude: number };
    end_location?: { latitude: number; longitude: number };
  }>;
  constraints: {
    max_duration?: number;
    max_distance?: number;
    traffic_aware?: boolean;
  };
}

export interface OptimizeRouteResponse {
  route_id: string;
  optimized_routes: Array<{
    vehicle_id: string;
    stops: Array<{
      bin_id: string;
      arrival_time: string;
      service_duration: number;
      location: { latitude: number; longitude: number };
    }>;
    total_distance: number;
    total_duration: number;
    optimization_score: number;
  }>;
  metadata: {
    optimization_time_ms: number;
    algorithm_used: string;
    traffic_considered: boolean;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  service: string;
  trace_id?: string;
}

export interface ValidationError extends ServiceError {
  code: 'VALIDATION_ERROR';
  field_errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface AuthorizationError extends ServiceError {
  code: 'AUTHORIZATION_ERROR';
  required_permissions: string[];
  user_permissions: string[];
}

export interface NotFoundError extends ServiceError {
  code: 'NOT_FOUND';
  resource_type: string;
  resource_id: string;
}

// =============================================================================
// OBSERVABILITY TYPES
// =============================================================================

export interface TraceContext {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  baggage?: Record<string, string>;
}

export interface LogContext {
  service: string;
  operation: string;
  user_id?: string;
  organization_id?: string;
  trace_context?: TraceContext;
  [key: string]: any;
}