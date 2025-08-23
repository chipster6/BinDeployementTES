/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SAMSARA FLEET MANAGEMENT SERVICE
 * ============================================================================
 *
 * Comprehensive Samsara fleet management integration supporting:
 * - Vehicle tracking and GPS integration
 * - Driver behavior monitoring and safety alerts
 * - Route optimization data integration
 * - Maintenance scheduling and vehicle diagnostics
 * - Real-time fleet visibility and reporting
 *
 * Features:
 * - Real-time vehicle location tracking
 * - Driver safety score monitoring
 * - Vehicle diagnostics and fault codes
 * - Fuel consumption tracking
 * - Route efficiency analysis
 * - Comprehensive fleet analytics
 * - Webhook handling for real-time events
 * - Geofencing and route deviation alerts
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import {
  BaseExternalService,
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";
import { logger } from "@/utils/logger";
import { AuditLog } from "@/models/AuditLog";

/**
 * Vehicle interface
 */
export interface SamsaraVehicle {
  id: string;
  externalIds?: Record<string, string>;
  name: string;
  notes?: string;
  staticAssignedDriverId?: string;
  vehicleType: "truck" | "van" | "car" | "trailer";
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  tags?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Driver interface
 */
export interface SamsaraDriver {
  id: string;
  externalIds?: Record<string, string>;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  staticAssignedVehicleId?: string;
  tags?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Vehicle location interface
 */
export interface VehicleLocation {
  vehicleId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: Date;
  address?: string;
  gpsOdometerMeters?: number;
}

/**
 * Driver safety event interface
 */
export interface DriverSafetyEvent {
  id: string;
  driverId: string;
  vehicleId: string;
  eventType:
    | "harsh_accel"
    | "harsh_brake"
    | "harsh_turn"
    | "speeding"
    | "following_too_close";
  severity: "minor" | "major" | "critical";
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  speedMph?: number;
  details?: Record<string, any>;
}

/**
 * Vehicle diagnostic interface
 */
export interface VehicleDiagnostic {
  vehicleId: string;
  timestamp: Date;
  engineStates: Array<{
    timeMs: number;
    value: string;
  }>;
  faultCodes: Array<{
    timeMs: number;
    dtcShortCode?: string;
    dtcDescription?: string;
    dtcId?: number;
  }>;
  engineHours?: number;
  fuelLevelPercent?: number;
  odometerMeters?: number;
}

/**
 * Route interface
 */
export interface SamsaraRoute {
  id: string;
  name: string;
  vehicleId?: string;
  driverId?: string;
  dispatchJobs: Array<{
    id: string;
    groupId?: string;
    arrivalTime?: Date;
    completedTime?: Date;
    dispatchAt?: Date;
    jobState:
      | "unassigned"
      | "scheduled"
      | "en_route"
      | "arrived"
      | "completed"
      | "skipped";
    destination: {
      latitude: number;
      longitude: number;
      address?: string;
      name?: string;
    };
    notes?: string;
  }>;
  startLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

/**
 * Webhook event interface
 */
export interface SamsaraWebhookEvent {
  eventId: string;
  eventType:
    | "vehicle_location"
    | "driver_safety"
    | "vehicle_diagnostic"
    | "route_completed"
    | "geofence_entry"
    | "geofence_exit";
  timestamp: number;
  data: {
    vehicleId?: string;
    driverId?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
    [key: string]: any;
  };
}

/**
 * Service configuration
 */
interface SamsaraConfig extends ExternalServiceConfig {
  apiToken: string;
  organizationId?: string;
  webhookSecret?: string;
}

/**
 * Samsara fleet management service implementation
 */
export class SamsaraService extends BaseExternalService {
  private apiToken: string;
  private organizationId?: string;
  private webhookSecret?: string;

  constructor(config: SamsaraConfig) {
    super({
      ...config,
      serviceName: "samsara",
      baseURL: "https://api.samsara.com",
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requests: 200, // Samsara's rate limit varies by endpoint
        window: 60, // per minute
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.apiToken = config.apiToken;
    this.organizationId = config.organizationId;
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    return `Bearer ${this.apiToken}`;
  }

  /**
   * Get fleet vehicles
   */
  public async getVehicles(
    options: {
      limit?: number;
      after?: string;
      tagIds?: string[];
    } = {},
  ): Promise<
    ApiResponse<{
      data: SamsaraVehicle[];
      hasNextPage: boolean;
      endCursor?: string;
    }>
  > {
    try {
      const params: Record<string, any> = {};
      if (options.limit) params.limit = options.limit;
      if (options.after) params.after = options.after;
      if (options.tagIds && options.tagIds.length > 0) {
        params.tagIds = options.tagIds.join(",");
      }

      const response = await this.get<{
        data: Array<{
          id: string;
          externalIds?: Record<string, string>;
          name: string;
          notes?: string;
          staticAssignedDriverId?: string;
          vehicleType: string;
          make?: string;
          model?: string;
          year?: number;
          vin?: string;
          licensePlate?: string;
          tags?: Array<{
            id: string;
            name: string;
          }>;
        }>;
        pagination: {
          hasNextPage: boolean;
          endCursor?: string;
        };
      }>("/fleet/vehicles", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve vehicles");
      }

      const vehicles: SamsaraVehicle[] = response.data.data.map((vehicle) => ({
        id: vehicle.id,
        externalIds: vehicle.externalIds,
        name: vehicle.name,
        notes: vehicle.notes,
        staticAssignedDriverId: vehicle.staticAssignedDriverId,
        vehicleType: vehicle.vehicleType as any,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        tags: vehicle.tags,
      }));

      return {
        success: true,
        data: {
          data: vehicles,
          hasNextPage: response.data.pagination.hasNextPage,
          endCursor: response.data.pagination.endCursor,
        },
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get vehicles", {
        error: error instanceof Error ? error?.message : String(error),
      });

      throw new Error(`Vehicle retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get fleet drivers
   */
  public async getDrivers(
    options: {
      limit?: number;
      after?: string;
      tagIds?: string[];
    } = {},
  ): Promise<
    ApiResponse<{
      data: SamsaraDriver[];
      hasNextPage: boolean;
      endCursor?: string;
    }>
  > {
    try {
      const params: Record<string, any> = {};
      if (options.limit) params.limit = options.limit;
      if (options.after) params.after = options.after;
      if (options.tagIds && options.tagIds.length > 0) {
        params.tagIds = options.tagIds.join(",");
      }

      const response = await this.get<{
        data: Array<{
          id: string;
          externalIds?: Record<string, string>;
          name: string;
          username?: string;
          email?: string;
          phone?: string;
          licenseNumber?: string;
          licenseState?: string;
          staticAssignedVehicleId?: string;
          tags?: Array<{
            id: string;
            name: string;
          }>;
        }>;
        pagination: {
          hasNextPage: boolean;
          endCursor?: string;
        };
      }>("/fleet/drivers", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve drivers");
      }

      const drivers: SamsaraDriver[] = response.data.data.map((driver) => ({
        id: driver.id,
        externalIds: driver.externalIds,
        name: driver.name,
        username: driver.username,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        licenseState: driver.licenseState,
        staticAssignedVehicleId: driver.staticAssignedVehicleId,
        tags: driver.tags,
      }));

      return {
        success: true,
        data: {
          data: drivers,
          hasNextPage: response.data.pagination.hasNextPage,
          endCursor: response.data.pagination.endCursor,
        },
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get drivers", {
        error: error instanceof Error ? error?.message : String(error),
      });

      throw new Error(`Driver retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get vehicle locations
   */
  public async getVehicleLocations(
    vehicleIds: string[],
    options: {
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<ApiResponse<VehicleLocation[]>> {
    try {
      const params: Record<string, any> = {
        vehicleIds: vehicleIds.join(","),
      };

      if (options.startTime) {
        params.startTime = options.startTime.toISOString();
      }

      if (options.endTime) {
        params.endTime = options.endTime.toISOString();
      }

      const response = await this.get<{
        data: Array<{
          vehicleId: string;
          location: {
            latitude: number;
            longitude: number;
          };
          heading?: number;
          speed?: number;
          time: string;
          address?: string;
          gpsOdometerMeters?: number;
        }>;
      }>("/fleet/vehicles/locations", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve vehicle locations");
      }

      const locations: VehicleLocation[] = response.data.data.map(
        (location) => ({
          vehicleId: location.vehicleId,
          location: location.location,
          heading: location.heading,
          speed: location.speed,
          timestamp: new Date(location.time),
          address: location.address,
          gpsOdometerMeters: location.gpsOdometerMeters,
        }),
      );

      return {
        success: true,
        data: locations,
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get vehicle locations", {
        error: error instanceof Error ? error?.message : String(error),
        vehicleIds,
      });

      throw new Error(`Vehicle location retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get driver safety events
   */
  public async getDriverSafetyEvents(
    options: {
      driverIds?: string[];
      vehicleIds?: string[];
      startTime?: Date;
      endTime?: Date;
      eventTypes?: string[];
    } = {},
  ): Promise<ApiResponse<DriverSafetyEvent[]>> {
    try {
      const params: Record<string, any> = {};

      if (options.driverIds && options.driverIds.length > 0) {
        params.driverIds = options.driverIds.join(",");
      }

      if (options.vehicleIds && options.vehicleIds.length > 0) {
        params.vehicleIds = options.vehicleIds.join(",");
      }

      if (options.startTime) {
        params.startTime = options.startTime.toISOString();
      }

      if (options.endTime) {
        params.endTime = options.endTime.toISOString();
      }

      if (options.eventTypes && options.eventTypes.length > 0) {
        params.eventTypes = options.eventTypes.join(",");
      }

      const response = await this.get<{
        data: Array<{
          id: string;
          driverId: string;
          vehicleId: string;
          eventType: string;
          severity: string;
          time: string;
          location: {
            latitude: number;
            longitude: number;
          };
          address?: string;
          speedMph?: number;
          details?: Record<string, any>;
        }>;
      }>("/safety/events", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve driver safety events");
      }

      const safetyEvents: DriverSafetyEvent[] = response.data.data.map(
        (event) => ({
          id: event.id,
          driverId: event.driverId,
          vehicleId: event.vehicleId,
          eventType: event.eventType as any,
          severity: event.severity as any,
          timestamp: new Date(event.time),
          location: event.location,
          address: event.address,
          speedMph: event.speedMph,
          details: event.details,
        }),
      );

      return {
        success: true,
        data: safetyEvents,
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get driver safety events", {
        error: error instanceof Error ? error?.message : String(error),
      });

      throw new Error(`Safety event retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get vehicle diagnostics
   */
  public async getVehicleDiagnostics(
    vehicleIds: string[],
    options: {
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<ApiResponse<VehicleDiagnostic[]>> {
    try {
      const params: Record<string, any> = {
        vehicleIds: vehicleIds.join(","),
      };

      if (options.startTime) {
        params.startTime = options.startTime.toISOString();
      }

      if (options.endTime) {
        params.endTime = options.endTime.toISOString();
      }

      const response = await this.get<{
        data: Array<{
          vehicleId: string;
          time: string;
          engineStates: Array<{
            timeMs: number;
            value: string;
          }>;
          faultCodes: Array<{
            timeMs: number;
            dtcShortCode?: string;
            dtcDescription?: string;
            dtcId?: number;
          }>;
          engineHours?: number;
          fuelLevelPercent?: number;
          odometerMeters?: number;
        }>;
      }>("/fleet/vehicles/diagnostics", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to retrieve vehicle diagnostics");
      }

      const diagnostics: VehicleDiagnostic[] = response.data.data.map(
        (diagnostic) => ({
          vehicleId: diagnostic.vehicleId,
          timestamp: new Date(diagnostic.time),
          engineStates: diagnostic.engineStates,
          faultCodes: diagnostic.faultCodes,
          engineHours: diagnostic.engineHours,
          fuelLevelPercent: diagnostic.fuelLevelPercent,
          odometerMeters: diagnostic.odometerMeters,
        }),
      );

      return {
        success: true,
        data: diagnostics,
        statusCode: 200,
        metadata: {
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error: unknown) {
      logger.error("Failed to get vehicle diagnostics", {
        error: error instanceof Error ? error?.message : String(error),
        vehicleIds,
      });

      throw new Error(`Vehicle diagnostics retrieval failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Create dispatch route
   */
  public async createDispatchRoute(
    route: Omit<SamsaraRoute, "id">,
  ): Promise<ApiResponse<{ id: string; name: string }>> {
    try {
      const routeData = {
        name: route.name,
        vehicleId: route.vehicleId,
        driverId: route.driverId,
        dispatchJobs: route.dispatchJobs.map((job) => ({
          id: job.id,
          groupId: job.groupId,
          arrivalTime: job.arrivalTime?.toISOString(),
          completedTime: job.completedTime?.toISOString(),
          dispatchAt: job.dispatchAt?.toISOString(),
          jobState: job.jobState,
          destination: {
            latitude: job.destination.latitude,
            longitude: job.destination.longitude,
            address: job.destination.address,
            name: job.destination.name,
          },
          notes: job.notes,
        })),
        startLocation: route.startLocation,
        endLocation: route.endLocation,
      };

      const response = await this.post<{
        id: string;
        name: string;
      }>("/fleet/dispatch/routes", routeData);

      if (!response.success || !response.data) {
        throw new Error("Failed to create dispatch route");
      }

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "route_created",
        resourceType: "samsara_route",
        resourceId: response.data.id,
        details: {
          routeName: response.data.name,
          vehicleId: route.vehicleId,
          driverId: route.driverId,
          jobCount: route.dispatchJobs.length,
        },
        ipAddress: "system",
        userAgent: "SamsaraService",
      });

      return {
        success: true,
        data: response.data,
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to create dispatch route", {
        error: error instanceof Error ? error?.message : String(error),
        routeName: route.name,
      });

      throw new Error(`Route creation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Update dispatch route
   */
  public async updateDispatchRoute(
    routeId: string,
    updates: Partial<Omit<SamsaraRoute, "id">>,
  ): Promise<ApiResponse<{ id: string; name: string }>> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.vehicleId) updateData.vehicleId = updates.vehicleId;
      if (updates.driverId) updateData.driverId = updates.driverId;
      if (updates.startLocation)
        updateData.startLocation = updates.startLocation;
      if (updates.endLocation) updateData.endLocation = updates.endLocation;

      if (updates.dispatchJobs) {
        updateData.dispatchJobs = updates.dispatchJobs.map((job) => ({
          id: job.id,
          groupId: job.groupId,
          arrivalTime: job.arrivalTime?.toISOString(),
          completedTime: job.completedTime?.toISOString(),
          dispatchAt: job.dispatchAt?.toISOString(),
          jobState: job.jobState,
          destination: job.destination,
          notes: job.notes,
        }));
      }

      const response = await this.patch<{
        id: string;
        name: string;
      }>(`/fleet/dispatch/routes/${routeId}`, updateData);

      if (!response.success || !response.data) {
        throw new Error("Failed to update dispatch route");
      }

      return {
        success: true,
        data: response.data,
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to update dispatch route", {
        error: error instanceof Error ? error?.message : String(error),
        routeId,
      });

      throw new Error(`Route update failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Process webhook event
   */
  public async processWebhookEvent(
    event: SamsaraWebhookEvent,
    signature?: string,
  ): Promise<
    ApiResponse<{ processed: boolean; eventId: string; eventType: string }>
  > {
    try {
      // Validate webhook signature if secret is provided
      if (this.webhookSecret && signature) {
        // Implementation would depend on Samsara's signature verification method
        // This is a placeholder for the actual verification logic
      }

      logger.info("Processing Samsara webhook event", {
        eventId: event.eventId,
        eventType: event.eventType,
        vehicleId: event.data.vehicleId,
        driverId: event.data.driverId,
      });

      // Process different event types
      switch (event.eventType) {
        case "vehicle_location":
          await this.handleVehicleLocationEvent(event);
          break;

        case "driver_safety":
          await this.handleDriverSafetyEvent(event);
          break;

        case "vehicle_diagnostic":
          await this.handleVehicleDiagnosticEvent(event);
          break;

        case "route_completed":
          await this.handleRouteCompletedEvent(event);
          break;

        case "geofence_entry":
        case "geofence_exit":
          await this.handleGeofenceEvent(event);
          break;

        default:
          logger.info("Unhandled webhook event type", {
            eventType: event.eventType,
          });
      }

      // Log audit event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: "webhook_processed",
        resourceType: "samsara_webhook",
        resourceId: event.eventId,
        details: {
          eventType: event.eventType,
          vehicleId: event.data.vehicleId,
          driverId: event.data.driverId,
          processed: true,
        },
        ipAddress: "samsara",
        userAgent: "SamsaraWebhook",
      });

      return {
        success: true,
        data: {
          processed: true,
          eventId: event.eventId,
          eventType: event.eventType,
        },
        statusCode: 200,
      };
    } catch (error: unknown) {
      logger.error("Failed to process Samsara webhook event", {
        error: error instanceof Error ? error?.message : String(error),
        eventId: event.eventId,
      });

      throw new Error(`Webhook processing failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Handle vehicle location webhook event
   */
  private async handleVehicleLocationEvent(
    event: SamsaraWebhookEvent,
  ): Promise<void> {
    logger.info("Vehicle location update", {
      eventId: event.eventId,
      vehicleId: event.data.vehicleId,
      location: event.data.location,
      address: event.data.address,
    });
  }

  /**
   * Handle driver safety webhook event
   */
  private async handleDriverSafetyEvent(
    event: SamsaraWebhookEvent,
  ): Promise<void> {
    logger.warn("Driver safety event", {
      eventId: event.eventId,
      driverId: event.data.driverId,
      vehicleId: event.data.vehicleId,
      eventType: event.data.eventType,
      severity: event.data.severity,
    });
  }

  /**
   * Handle vehicle diagnostic webhook event
   */
  private async handleVehicleDiagnosticEvent(
    event: SamsaraWebhookEvent,
  ): Promise<void> {
    logger.info("Vehicle diagnostic update", {
      eventId: event.eventId,
      vehicleId: event.data.vehicleId,
      faultCodes: event.data.faultCodes,
    });
  }

  /**
   * Handle route completed webhook event
   */
  private async handleRouteCompletedEvent(
    event: SamsaraWebhookEvent,
  ): Promise<void> {
    logger.info("Route completed", {
      eventId: event.eventId,
      vehicleId: event.data.vehicleId,
      driverId: event.data.driverId,
      routeId: event.data.routeId,
    });
  }

  /**
   * Handle geofence webhook event
   */
  private async handleGeofenceEvent(event: SamsaraWebhookEvent): Promise<void> {
    logger.info("Geofence event", {
      eventId: event.eventId,
      eventType: event.eventType,
      vehicleId: event.data.vehicleId,
      geofenceName: event.data.geofenceName,
    });
  }

  /**
   * Get service health status
   */
  public async getServiceHealth(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    lastCheck: Date;
    details?: any;
  }> {
    try {
      // Test API connectivity by getting organization info
      await this.get("/fleet/vehicles", { limit: 1 });

      return {
        service: "samsara",
        status: "healthy",
        lastCheck: new Date(),
      };
    } catch (error: unknown) {
      return {
        service: "samsara",
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error instanceof Error ? error?.message : String(error) },
      };
    }
  }
}

export default SamsaraService;
