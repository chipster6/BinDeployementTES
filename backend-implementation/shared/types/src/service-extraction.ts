/**
 * ============================================================================
 * SERVICE EXTRACTION TYPE DEFINITIONS
 * ============================================================================
 * 
 * Types and interfaces to ensure type safety during microservices extraction.
 * These types will be used during the service separation process.
 */

// =============================================================================
// SERVICE BOUNDARY DEFINITIONS
// =============================================================================

export interface ServiceBoundary {
  readonly service_name: string;
  readonly domain: string;
  readonly entities: string[];
  readonly events: string[];
  readonly dependencies: ServiceDependency[];
}

export interface ServiceDependency {
  readonly target_service: string;
  readonly dependency_type: 'sync' | 'async' | 'data';
  readonly coupling_strength: 'loose' | 'medium' | 'tight';
  readonly migration_priority: number;
}

// =============================================================================
// EXTRACTION VALIDATION TYPES
// =============================================================================

export interface ExtractionValidation {
  readonly service_name: string;
  readonly validation_status: 'pending' | 'in_progress' | 'passed' | 'failed';
  readonly type_safety_score: number;
  readonly missing_types: string[];
  readonly contract_compatibility: ContractCompatibility[];
  readonly dependency_issues: DependencyIssue[];
}

export interface ContractCompatibility {
  readonly contract_name: string;
  readonly version: string;
  readonly compatibility_status: 'compatible' | 'breaking' | 'deprecated';
  readonly breaking_changes: string[];
}

export interface DependencyIssue {
  readonly issue_type: 'circular' | 'missing' | 'version_mismatch' | 'coupling';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly suggested_resolution: string;
}

// =============================================================================
// MICROSERVICE TEMPLATE TYPES
// =============================================================================

export interface MicroserviceTemplate {
  readonly service_name: string;
  readonly port: number;
  readonly database_schema?: string;
  readonly required_env_vars: EnvironmentVariable[];
  readonly api_endpoints: ApiEndpointDefinition[];
  readonly event_subscriptions: EventSubscription[];
  readonly event_publications: EventPublication[];
}

export interface EnvironmentVariable {
  readonly name: string;
  readonly required: boolean;
  readonly default_value?: string;
  readonly description: string;
}

export interface ApiEndpointDefinition {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly path: string;
  readonly handler_function: string;
  readonly request_type?: string;
  readonly response_type: string;
  readonly authentication_required: boolean;
}

export interface EventSubscription {
  readonly event_type: string;
  readonly handler_function: string;
  readonly retry_policy: RetryPolicy;
}

export interface EventPublication {
  readonly event_type: string;
  readonly trigger_conditions: string[];
  readonly payload_schema: string;
}

export interface RetryPolicy {
  readonly max_retries: number;
  readonly backoff_strategy: 'linear' | 'exponential';
  readonly base_delay_ms: number;
  readonly max_delay_ms: number;
}

// =============================================================================
// SERVICE EXTRACTION PROCESS TYPES
// =============================================================================

export interface ExtractionPlan {
  readonly services: ServiceExtractionStep[];
  readonly total_estimated_hours: number;
  readonly risk_assessment: RiskAssessment;
  readonly rollback_strategy: RollbackStrategy;
}

export interface ServiceExtractionStep {
  readonly step_number: number;
  readonly service_name: string;
  readonly extraction_type: 'database_first' | 'api_first' | 'event_first';
  readonly estimated_hours: number;
  readonly prerequisites: string[];
  readonly validation_criteria: ValidationCriteria[];
  readonly rollback_plan: string;
}

export interface RiskAssessment {
  readonly overall_risk: 'low' | 'medium' | 'high';
  readonly technical_risks: TechnicalRisk[];
  readonly business_risks: BusinessRisk[];
  readonly mitigation_strategies: MitigationStrategy[];
}

export interface TechnicalRisk {
  readonly risk_type: 'data_consistency' | 'performance' | 'compatibility' | 'availability';
  readonly likelihood: 'low' | 'medium' | 'high';
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

export interface BusinessRisk {
  readonly risk_type: 'downtime' | 'data_loss' | 'feature_regression' | 'customer_impact';
  readonly likelihood: 'low' | 'medium' | 'high';
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

export interface MitigationStrategy {
  readonly risk_types: string[];
  readonly strategy: string;
  readonly implementation_effort: 'low' | 'medium' | 'high';
  readonly effectiveness: 'low' | 'medium' | 'high';
}

export interface ValidationCriteria {
  readonly criteria_type: 'functional' | 'performance' | 'security' | 'integration';
  readonly description: string;
  readonly acceptance_threshold: string;
  readonly test_method: string;
}

export interface RollbackStrategy {
  readonly rollback_triggers: string[];
  readonly rollback_steps: RollbackStep[];
  readonly data_recovery_plan: string;
  readonly estimated_rollback_time_minutes: number;
}

export interface RollbackStep {
  readonly step_number: number;
  readonly action: string;
  readonly estimated_time_minutes: number;
  readonly requires_downtime: boolean;
}

// =============================================================================
// INTER-SERVICE COMMUNICATION TYPES
// =============================================================================

export interface ServiceCommunicationPattern {
  readonly pattern_type: 'request_response' | 'event_driven' | 'saga' | 'cqrs';
  readonly reliability: 'at_most_once' | 'at_least_once' | 'exactly_once';
  readonly consistency_model: 'strong' | 'eventual' | 'weak';
  readonly timeout_ms: number;
  readonly circuit_breaker_config?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  readonly failure_threshold: number;
  readonly timeout_ms: number;
  readonly reset_timeout_ms: number;
  readonly monitoring_period_ms: number;
}