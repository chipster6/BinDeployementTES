/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES INDEX
 * ============================================================================
 *
 * Centralized export for all external service integrations.
 * Provides easy access to all external service classes and utilities.
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

export { BaseExternalService } from "./BaseExternalService";
export { default as StripeService } from "./StripeService";
export { default as TwilioService } from "./TwilioService";
export { default as SendGridService } from "./SendGridService";
export { default as SamsaraService } from "./SamsaraService";
export { default as AirtableService } from "./AirtableService";
export { default as MapsService } from "./MapsService";
export { default as WebhookSecurityService } from "./WebhookSecurityService";
export { default as ApiKeyRotationService, apiKeyRotationService } from "./ApiKeyRotationService";
export {
  ExternalServicesManager,
  externalServicesManager,
} from "./ExternalServicesManager";

export {
  WebhookCoordinationService,
  webhookCoordinationService,
} from "./WebhookCoordinationService";

export {
  ApiStatusMonitoringService,
  apiStatusMonitoringService,
} from "./ApiStatusMonitoringService";

export {
  CostOptimizationService,
  costOptimizationService,
} from "./CostOptimizationService";

// Threat Intelligence Services
export { default as VirusTotalService, virusTotalService } from "./VirusTotalService";
export { default as AbuseIPDBService, abuseIPDBService } from "./AbuseIPDBService";
export { default as MISPIntegrationService, mispIntegrationService } from "./MISPIntegrationService";
export { default as ThreatIntelligenceService, threatIntelligenceService } from "./ThreatIntelligenceService";
export { default as IPReputationService, ipReputationService } from "./IPReputationService";

// Enhanced Fallback and Business Continuity Services
export { 
  FallbackStrategyManager, 
  fallbackStrategyManager,
  ServicePriority,
  FallbackStrategyType,
  BusinessCriticality
} from "./FallbackStrategyManager";

export { 
  ServiceMeshManager, 
  serviceMeshManager,
  LoadBalancingStrategy
} from "./ServiceMeshManager";

export { 
  BusinessContinuityManager, 
  businessContinuityManager,
  IncidentLevel,
  BusinessImpactSeverity
} from "./BusinessContinuityManager";

// Type exports
export type {
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";

export type {
  StripeCustomerData,
  PaymentMethodData,
  SubscriptionData,
  InvoiceData,
  PaymentIntentData,
  StripeWebhookEvent,
} from "./StripeService";

export type {
  SmsMessage,
  SmsTemplate,
  BulkMessageRequest,
  TwilioWebhookPayload,
} from "./TwilioService";

export type {
  EmailMessage,
  EmailTemplate,
  Contact,
  EmailCampaign,
  SendGridWebhookEvent,
} from "./SendGridService";

export type {
  SamsaraVehicle,
  SamsaraDriver,
  VehicleLocation,
  DriverSafetyEvent,
  VehicleDiagnostic,
  SamsaraRoute,
  SamsaraWebhookEvent,
} from "./SamsaraService";

export type {
  AirtableRecord,
  TableConfig,
  SyncConfig,
  SyncResult,
  AirtableWebhookPayload,
} from "./AirtableService";

export type {
  Coordinate,
  Address,
  GeocodingResult,
  Route,
  DistanceMatrix,
  Isochrone,
  Geofence,
  TrafficData,
} from "./MapsService";

export type {
  WebhookVerificationResult,
  WebhookConfig,
  PayloadValidationRules,
} from "./WebhookSecurityService";

export type {
  ServiceStatus,
  ServiceConfiguration,
  ServiceMetrics,
} from "./ExternalServicesManager";

// Threat Intelligence Types
export type {
  ThreatIntelligenceResult,
  VirusTotalIPReport,
  VirusTotalDomainReport,
  VirusTotalFileReport,
  VirusTotalURLReport,
} from "./VirusTotalService";

export type {
  AbuseIPDBReport,
  AbuseIPDBBatchResult,
} from "./AbuseIPDBService";

export type {
  MISPEvent,
  MISPAttribute,
  MISPObject,
  MISPTag,
  IOCSearchRequest,
} from "./MISPIntegrationService";

export type {
  UnifiedThreatResult,
  ThreatFeedUpdate,
  ThreatIntelligenceMetrics,
} from "./ThreatIntelligenceService";

export type {
  IPReputationResult,
  IPBatchResult,
  IPReputationMetrics,
} from "./IPReputationService";

// Enhanced Fallback and Business Continuity Types
export type {
  FallbackProvider,
  FallbackStrategy,
  FallbackContext,
  FallbackResult,
  FallbackAnalytics
} from "./FallbackStrategyManager";

export type {
  ServiceMeshNode,
  ServiceMeshRoute,
  ServiceMeshCircuitBreaker,
  ServiceMeshHealthStatus,
  ServiceMeshMetrics,
  ServiceMeshTrafficPolicy,
  ServiceDependency
} from "./ServiceMeshManager";

export type {
  BusinessContinuityIncident,
  BusinessContinuityPlan,
  BusinessMetrics,
  BusinessHealthStatus
} from "./BusinessContinuityManager";
