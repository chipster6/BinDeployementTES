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