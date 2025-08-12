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
export {
  ExternalServicesManager,
  externalServicesManager,
} from "./ExternalServicesManager";

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
