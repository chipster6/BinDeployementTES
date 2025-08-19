// User role enumeration matching backend
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin", 
  DISPATCHER = "dispatcher",
  OFFICE_STAFF = "office_staff",
  DRIVER = "driver",
  CUSTOMER = "customer",
  CUSTOMER_STAFF = "customer_staff",
}

// User status enumeration matching backend
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", 
  SUSPENDED = "suspended",
  LOCKED = "locked",
}

// User interface
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  mfa_enabled: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Authentication response
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refreshToken?: string;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

// Register data
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

// Bin type enums matching backend
export enum BinType {
  DUMPSTER = "dumpster",
  ROLL_OFF = "roll_off",
  COMPACTOR = "compactor",
  RECYCLING = "recycling",
  ORGANIC = "organic",
}

export enum BinStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  RETIRED = "retired",
  LOST = "lost",
}

export enum BinMaterial {
  STEEL = "steel",
  PLASTIC = "plastic",
  FIBERGLASS = "fiberglass",
}

// Enhanced Bin interface matching backend
export interface Bin {
  id: string;
  binNumber: string;
  customerId?: string;
  binType: BinType;
  size: string;
  capacityCubicYards?: number;
  material?: BinMaterial;
  color?: string;
  status: BinStatus;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  installationDate?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  gpsEnabled: boolean;
  sensorEnabled: boolean;
  fillLevelPercent?: number;
  createdAt: string;
  updatedAt: string;
}

// Customer status enums
export enum CustomerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
}

export enum ServiceType {
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  ON_DEMAND = "on_demand",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
}

// Enhanced Customer interface
export interface Customer {
  id: string;
  organizationName: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress: string;
  serviceAddress?: string;
  serviceType: ServiceType;
  billingCycle: BillingCycle;
  status: CustomerStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  accountBalance?: number;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

// Route and Vehicle Management Types
export enum RouteStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum VehicleStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  OUT_OF_SERVICE = "out_of_service",
}

export interface Route {
  id: string;
  routeName: string;
  driverId?: string;
  vehicleId?: string;
  status: RouteStatus;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  totalStops: number;
  completedStops: number;
  efficiency?: number;
  fuelConsumption?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  capacity: number;
  fuelLevel?: number;
  mileage?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  gpsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: UserStatus;
  currentRouteId?: string;
  currentVehicleId?: string;
  createdAt: string;
  updatedAt: string;
}

// Real-time and Analytics Types
export interface DashboardStats {
  totalBins: number;
  activeBins: number;
  completedCollections: number;
  pendingCollections: number;
  totalCustomers: number;
  activeDrivers: number;
  totalRevenue: number;
  newTickets: number;
  efficiency: number;
  fuelSavings: number;
}

export interface ServiceEvent {
  id: string;
  binId: string;
  routeId?: string;
  driverId?: string;
  eventType: string;
  scheduledAt: string;
  completedAt?: string;
  duration?: number;
  notes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export interface BinStatusUpdate {
  binId: string;
  fillLevelPercent: number;
  status: BinStatus;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface RouteUpdate {
  routeId: string;
  driverId: string;
  status: RouteStatus;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  completedStops: number;
  totalStops: number;
  timestamp: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// Security Operations Center (SOC) Types
export enum ThreatLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum IncidentStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum ThreatType {
  MALWARE = "malware",
  PHISHING = "phishing",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  DATA_BREACH = "data_breach",
  DDOS = "ddos",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
}

export interface ThreatDetection {
  id: string;
  threatType: ThreatType;
  level: ThreatLevel;
  sourceIp: string;
  targetAsset: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  status: IncidentStatus;
  confidence: number;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  threatLevel: ThreatLevel;
  incidentType: ThreatType;
  status: IncidentStatus;
  assignedTo?: string;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  timeline: IncidentTimelineEvent[];
  affectedAssets: string[];
  responseActions: ResponseAction[];
}

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  actor: string;
  severity: ThreatLevel;
}

export interface ResponseAction {
  id: string;
  action: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  executedBy?: string;
  executedAt?: string;
  automated: boolean;
}

export interface SecurityMetrics {
  threatsDetected: number;
  threatsBlocked: number;
  incidentsOpen: number;
  incidentsResolved: number;
  averageResponseTime: number;
  systemHealth: number;
  complianceScore: number;
  riskScore: number;
}

export interface IOC {
  id: string;
  type: "ip" | "domain" | "hash" | "url" | "email";
  value: string;
  threatLevel: ThreatLevel;
  description: string;
  source: string;
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  tags: string[];
}

export interface ComplianceStatus {
  framework: "GDPR" | "PCI_DSS" | "SOC2" | "HIPAA" | "ISO27001";
  status: "compliant" | "non_compliant" | "partial" | "unknown";
  score: number;
  lastAudit: string;
  nextAudit: string;
  issues: ComplianceIssue[];
}

export interface ComplianceIssue {
  id: string;
  control: string;
  description: string;
  severity: ThreatLevel;
  status: "open" | "in_progress" | "resolved";
  dueDate: string;
}

export interface ThreatIntelligence {
  ipReputation: {
    ip: string;
    reputation: number;
    category: string;
    country: string;
    lastSeen: string;
  }[];
  activeCampaigns: {
    name: string;
    description: string;
    threatLevel: ThreatLevel;
    indicators: IOC[];
  }[];
  emergingThreats: {
    name: string;
    description: string;
    cveId?: string;
    threatLevel: ThreatLevel;
    affectedSystems: string[];
  }[];
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  result: "success" | "failure" | "blocked";
  details: Record<string, any>;
}

// ============================================================================
// MONITORING & OBSERVABILITY TYPES
// ============================================================================

export interface MonitoringMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    bytes_in: number;
    bytes_out: number;
  };
  database_connections: number;
  active_sessions: number;
  error_rate: number;
  response_time: number;
}

export interface PrometheusMetric {
  metric: Record<string, string>;
  value: [number, string];
}

export interface AlertRule {
  id: string;
  name: string;
  expression: string;
  severity: "info" | "warning" | "critical";
  description: string;
  runbook_url?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  alert_name: string;
  severity: "info" | "warning" | "critical";
  status: "firing" | "resolved";
  started_at: string;
  resolved_at?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  description: string;
  runbook_url?: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  components: ComponentHealth[];
  last_updated: string;
}

export interface ComponentHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  response_time: number;
  last_check: string;
  details?: Record<string, any>;
}

// ============================================================================
// SECRETS MANAGEMENT TYPES
// ============================================================================

export interface SecretMetadata {
  name: string;
  created_at: string;
  updated_at: string;
  version: number;
  description?: string;
  tags?: Record<string, string>;
  expires_at?: string;
  rotation_enabled: boolean;
  last_rotation?: string;
  next_rotation?: string;
}

export interface VaultSecret {
  path: string;
  metadata: SecretMetadata;
  engine: "kv" | "database" | "pki" | "transit";
  lease_duration?: number;
  renewable?: boolean;
}

export interface DockerSecret {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  spec: {
    name: string;
    labels?: Record<string, string>;
  };
  version: {
    index: number;
  };
}

export interface SecretRotationConfig {
  secret_name: string;
  rotation_interval: number; // in hours
  auto_rotation: boolean;
  notification_emails: string[];
  pre_rotation_hook?: string;
  post_rotation_hook?: string;
}

export interface SecretAccessLog {
  id: string;
  secret_name: string;
  user_id: string;
  user_email: string;
  action: "read" | "write" | "delete" | "rotate";
  timestamp: string;
  ip_address: string;
  success: boolean;
  details?: Record<string, any>;
}

// ============================================================================
// DATABASE MIGRATION TYPES
// ============================================================================

export enum MigrationStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  ROLLED_BACK = "rolled_back"
}

export interface Migration {
  id: string;
  name: string;
  version: string;
  description: string;
  sql_up: string;
  sql_down: string;
  status: MigrationStatus;
  executed_at?: string;
  execution_time?: number;
  error_message?: string;
  rollback_available: boolean;
  created_at: string;
}

export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  target_version: string;
  migrations: Migration[];
  estimated_duration: number;
  risk_level: "low" | "medium" | "high";
  requires_downtime: boolean;
  backup_required: boolean;
  rollback_plan: string;
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface MigrationExecution {
  id: string;
  plan_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at?: string;
  completed_at?: string;
  progress: number; // 0-100
  current_migration?: string;
  error_message?: string;
  logs: MigrationLog[];
  can_rollback: boolean;
}

export interface MigrationLog {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  migration_name?: string;
  details?: Record<string, any>;
}

export interface DatabaseBackup {
  id: string;
  name: string;
  size: number;
  created_at: string;
  expires_at?: string;
  type: "full" | "incremental" | "differential";
  compression: "none" | "gzip" | "bzip2";
  encryption: boolean;
  status: "creating" | "completed" | "failed" | "expired";
  download_url?: string;
  checksum: string;
}

// ============================================================================
// EXTERNAL SERVICE TYPES
// ============================================================================

export enum ServiceStatus {
  OPERATIONAL = "operational",
  DEGRADED = "degraded",
  PARTIAL_OUTAGE = "partial_outage",
  MAJOR_OUTAGE = "major_outage",
  MAINTENANCE = "maintenance"
}

export interface ExternalServiceStatus {
  service_name: string;
  status: ServiceStatus;
  response_time: number;
  uptime: number;
  error_rate: number;
  last_incident?: string;
  user_friendly_message: string;
  technical_details?: string;
  impact_level: "none" | "low" | "medium" | "high" | "critical";
  estimated_resolution?: string;
  workaround_available: boolean;
  dependent_services: string[];
  timestamp: string;
}

export interface ServiceIncident {
  id: string;
  service_name: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "none" | "minor" | "major" | "critical";
  started_at: string;
  resolved_at?: string;
  updates: IncidentUpdate[];
  affected_components: string[];
}

export interface IncidentUpdate {
  id: string;
  timestamp: string;
  status: string;
  message: string;
  author: string;
}

export interface ServiceCostMetrics {
  service_name: string;
  current_month_cost: number;
  previous_month_cost: number;
  budget_limit: number;
  usage_units: number;
  cost_per_unit: number;
  projected_month_cost: number;
  optimization_opportunities: CostOptimization[];
  alerts: CostAlert[];
}

export interface CostOptimization {
  type: string;
  description: string;
  potential_savings: number;
  implementation_effort: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
}

export interface CostAlert {
  type: "budget_exceeded" | "usage_spike" | "cost_anomaly";
  severity: "info" | "warning" | "critical";
  message: string;
  threshold: number;
  current_value: number;
  timestamp: string;
}

export interface FallbackStrategy {
  service_name: string;
  fallback_type: "cache" | "mock" | "alternative_service" | "graceful_degradation";
  description: string;
  automatic: boolean;
  active: boolean;
  activated_at?: string;
  success_rate: number;
  performance_impact: number;
}

// ============================================================================
// AI/ML FEATURE MANAGEMENT TYPES
// ============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: "development" | "staging" | "production";
  rollout_percentage: number;
  target_users?: string[];
  target_roles?: UserRole[];
  conditions?: FeatureFlagCondition[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagCondition {
  type: "user_attribute" | "date_range" | "geographic" | "device_type";
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in_range";
  value: any;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  feature_flag_id: string;
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  start_date: string;
  end_date?: string;
  target_sample_size: number;
  current_sample_size: number;
  conversion_goal: string;
  variants: ABTestVariant[];
  results?: ABTestResults;
  created_by: string;
  created_at: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  percentage: number;
  configuration: Record<string, any>;
  participants: number;
  conversions: number;
}

export interface ABTestResults {
  test_id: string;
  winner?: string;
  confidence_level: number;
  statistical_significance: boolean;
  variant_performance: VariantPerformance[];
  insights: string[];
  recommendations: string[];
}

export interface VariantPerformance {
  variant_id: string;
  conversion_rate: number;
  confidence_interval: [number, number];
  p_value: number;
  effect_size: number;
}

export interface MLModelMetrics {
  model_name: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  throughput: number;
  error_rate: number;
  data_drift_score: number;
  concept_drift_score: number;
  last_trained: string;
  last_evaluated: string;
  prediction_count_24h: number;
}

export interface MLModelDeployment {
  id: string;
  model_name: string;
  version: string;
  environment: "development" | "staging" | "production";
  status: "deploying" | "active" | "inactive" | "failed";
  deployed_at: string;
  replicas: number;
  resource_allocation: {
    cpu: string;
    memory: string;
    gpu?: string;
  };
  auto_scaling: {
    enabled: boolean;
    min_replicas: number;
    max_replicas: number;
    target_cpu_utilization: number;
  };
  health_check: {
    endpoint: string;
    interval: number;
    timeout: number;
    success_threshold: number;
    failure_threshold: number;
  };
}

export interface AIPipelineRun {
  id: string;
  pipeline_name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  duration?: number;
  triggered_by: string;
  trigger_type: "manual" | "scheduled" | "event";
  steps: PipelineStep[];
  artifacts: PipelineArtifact[];
  logs: PipelineLog[];
}

export interface PipelineStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  duration?: number;
  output?: Record<string, any>;
  error_message?: string;
}

export interface PipelineArtifact {
  name: string;
  type: "model" | "dataset" | "report" | "visualization";
  size: number;
  created_at: string;
  download_url: string;
  metadata: Record<string, any>;
}

export interface PipelineLog {
  timestamp: string;
  level: "debug" | "info" | "warning" | "error";
  step: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// PRODUCTION OPERATIONS TYPES
// ============================================================================

export interface DeploymentStatus {
  id: string;
  environment: "staging" | "production";
  version: string;
  status: "pending" | "deploying" | "completed" | "failed" | "rolling_back";
  started_at: string;
  completed_at?: string;
  deployed_by: string;
  rollback_available: boolean;
  health_checks: HealthCheck[];
  deployment_strategy: "blue_green" | "rolling" | "canary" | "recreate";
  progress: number;
  error_message?: string;
  logs: DeploymentLog[];
}

export interface HealthCheck {
  name: string;
  status: "pending" | "passing" | "failing";
  endpoint: string;
  expected_status: number;
  actual_status?: number;
  response_time?: number;
  error_message?: string;
  last_check: string;
}

export interface DeploymentLog {
  timestamp: string;
  level: "info" | "warning" | "error";
  component: string;
  message: string;
  details?: Record<string, any>;
}

export interface InfrastructureStatus {
  environment: "development" | "staging" | "production";
  services: ServiceStatus[];
  databases: DatabaseStatus[];
  cache: CacheStatus[];
  load_balancers: LoadBalancerStatus[];
  ssl_certificates: SSLCertificateStatus[];
  backup_status: BackupStatus;
  overall_health: "healthy" | "degraded" | "unhealthy";
  last_updated: string;
}

export interface ServiceStatus {
  name: string;
  status: "running" | "stopped" | "restarting" | "error";
  replicas: {
    desired: number;
    current: number;
    ready: number;
  };
  resource_usage: {
    cpu: number;
    memory: number;
    disk?: number;
  };
  last_restart: string;
  uptime: number;
}

export interface DatabaseStatus {
  name: string;
  type: "postgresql" | "redis" | "mongodb";
  status: "online" | "offline" | "maintenance";
  connections: {
    active: number;
    max: number;
  };
  performance: {
    queries_per_second: number;
    average_response_time: number;
    slow_queries: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  replication: {
    status: "healthy" | "lagging" | "broken";
    lag_seconds?: number;
  };
}

export interface CacheStatus {
  name: string;
  type: "redis" | "memcached";
  status: "online" | "offline";
  memory: {
    used: number;
    max: number;
    percentage: number;
  };
  performance: {
    hit_rate: number;
    operations_per_second: number;
    average_response_time: number;
  };
  connections: number;
  evictions: number;
}

export interface LoadBalancerStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  active_connections: number;
  backend_servers: BackendServer[];
  traffic_distribution: TrafficDistribution[];
  ssl_termination: boolean;
}

export interface BackendServer {
  id: string;
  status: "healthy" | "unhealthy" | "maintenance";
  response_time: number;
  active_connections: number;
  last_health_check: string;
}

export interface TrafficDistribution {
  server_id: string;
  percentage: number;
  requests_per_minute: number;
}

export interface SSLCertificateStatus {
  domain: string;
  issuer: string;
  valid_from: string;
  valid_until: string;
  days_until_expiry: number;
  status: "valid" | "expiring_soon" | "expired" | "invalid";
  auto_renewal: boolean;
}

export interface BackupStatus {
  last_backup: string;
  next_backup: string;
  status: "successful" | "failed" | "in_progress";
  retention_days: number;
  backup_size: number;
  available_backups: number;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface MonitoringWebSocketEvent extends WebSocketEvent {
  type: "metrics_update" | "alert_fired" | "alert_resolved" | "health_check_update";
  payload: MonitoringMetrics | Alert | ComponentHealth;
}

export interface SecurityWebSocketEvent extends WebSocketEvent {
  type: "threat_detected" | "incident_created" | "incident_updated" | "compliance_alert";
  payload: ThreatDetection | SecurityIncident | ComplianceIssue;
}

export interface MLWebSocketEvent extends WebSocketEvent {
  type: "model_deployed" | "pipeline_completed" | "feature_flag_toggled" | "ab_test_updated";
  payload: MLModelDeployment | AIPipelineRun | FeatureFlag | ABTest;
}

export interface OperationsWebSocketEvent extends WebSocketEvent {
  type: "deployment_started" | "deployment_completed" | "service_status_changed" | "backup_completed";
  payload: DeploymentStatus | ServiceStatus | BackupStatus;
}