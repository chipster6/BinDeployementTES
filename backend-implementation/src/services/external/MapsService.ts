/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MAPS SERVICE (MAPBOX/GOOGLE MAPS)
 * ============================================================================
 *
 * Comprehensive mapping and geocoding integration supporting:
 * - Route optimization and turn-by-turn navigation
 * - Geofencing for service areas and bin locations
 * - Address validation and geocoding
 * - Real-time traffic and route adjustments
 * - Integration with GPS tracking systems
 *
 * Features:
 * - Multi-provider support (Mapbox and Google Maps)
 * - Batch geocoding and reverse geocoding
 * - Distance matrix calculations
 * - Isochrone analysis for service areas
 * - Traffic-aware route optimization
 * - Geofence monitoring and alerts
 * - Comprehensive location analytics
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
 * Geographic coordinate interface
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Address interface
 */
export interface Address {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formattedAddress: string;
}

/**
 * Geocoding result interface
 */
export interface GeocodingResult {
  coordinates: Coordinate;
  address: Address;
  confidence: number;
  placeType: string[];
  relevance?: number;
  context?: Array<{
    id: string;
    text: string;
    shortCode?: string;
  }>;
}

/**
 * Route interface
 */
export interface Route {
  geometry: {
    coordinates: number[][];
    type: "LineString";
  };
  distance: number; // meters
  duration: number; // seconds
  steps: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: number[][];
      type: "LineString";
    };
    maneuver: {
      type: string;
      instruction: string;
      bearing_before?: number;
      bearing_after?: number;
      location: number[];
    };
    name?: string;
  }>;
  weight?: number;
  weightName?: string;
}

/**
 * Distance matrix result interface
 */
export interface DistanceMatrix {
  sources: Array<{
    location: number[];
    name?: string;
  }>;
  destinations: Array<{
    location: number[];
    name?: string;
  }>;
  durations: number[][]; // seconds
  distances: number[][]; // meters
}

/**
 * Isochrone interface
 */
export interface Isochrone {
  geometry: {
    coordinates: number[][][];
    type: "Polygon";
  };
  properties: {
    contour: number; // minutes or meters
    color?: string;
    opacity?: number;
  };
}

/**
 * Geofence interface
 */
export interface Geofence {
  id: string;
  name: string;
  geometry: {
    type: "Polygon" | "Circle";
    coordinates: number[][] | number[]; // Polygon coordinates or [lng, lat, radius]
  };
  properties?: Record<string, any>;
}

/**
 * Traffic data interface
 */
export interface TrafficData {
  route: Route;
  incidents: Array<{
    id: string;
    type: "accident" | "construction" | "closure" | "congestion";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    location: Coordinate;
    startTime?: Date;
    endTime?: Date;
  }>;
  currentTrafficLevel: "light" | "moderate" | "heavy" | "severe";
}

/**
 * Service configuration
 */
interface MapsConfig extends ExternalServiceConfig {
  provider: "mapbox" | "google";
  mapboxAccessToken?: string;
  googleMapsApiKey?: string;
  defaultProfile?: "driving" | "walking" | "cycling" | "driving-traffic";
}

/**
 * Maps service implementation supporting both Mapbox and Google Maps
 */
export class MapsService extends BaseExternalService {
  private provider: "mapbox" | "google";
  private mapboxAccessToken?: string;
  private googleMapsApiKey?: string;
  private defaultProfile: string;

  constructor(config: MapsConfig) {
    const baseURL =
      config.provider === "mapbox"
        ? "https://api.mapbox.com"
        : "https://maps.googleapis.com/maps/api";

    super({
      ...config,
      serviceName: `maps-${config.provider}`,
      baseURL,
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requests: config.provider === "mapbox" ? 600 : 50, // Per minute
        window: 60,
      },
    });

    this.provider = config.provider;
    this.mapboxAccessToken = config.mapboxAccessToken;
    this.googleMapsApiKey = config.googleMapsApiKey;
    this.defaultProfile = config?.defaultProfile || "driving";
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    if (this.provider === "mapbox") {
      return `Bearer ${this.mapboxAccessToken}`;
    }
    return ""; // Google Maps uses API key in query params
  }

  /**
   * Geocode an address to coordinates
   */
  public async geocodeAddress(
    address: string,
    options: {
      country?: string;
      proximity?: Coordinate;
      types?: string[];
      limit?: number;
    } = {},
  ): Promise<ApiResponse<GeocodingResult[]>> {
    try {
      logger.info("Geocoding address", {
        address,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxGeocode(address, options);
      } else {
        return this.googleGeocode(address, options);
      }
    } catch (error: unknown) {
      logger.error("Failed to geocode address", {
        error: error instanceof Error ? error?.message : String(error),
        address,
        provider: this.provider,
      });

      throw new Error(`Geocoding failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  public async reverseGeocode(
    coordinate: Coordinate,
    options: {
      types?: string[];
      language?: string;
    } = {},
  ): Promise<ApiResponse<GeocodingResult[]>> {
    try {
      logger.info("Reverse geocoding coordinates", {
        coordinate,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxReverseGeocode(coordinate, options);
      } else {
        return this.googleReverseGeocode(coordinate, options);
      }
    } catch (error: unknown) {
      logger.error("Failed to reverse geocode", {
        error: error instanceof Error ? error?.message : String(error),
        coordinate,
        provider: this.provider,
      });

      throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Get optimized route between coordinates
   */
  public async getRoute(
    coordinates: Coordinate[],
    options: {
      profile?: "driving" | "walking" | "cycling" | "driving-traffic";
      alternatives?: boolean;
      steps?: boolean;
      geometries?: "geojson" | "polyline" | "polyline6";
      overview?: "full" | "simplified" | "false";
      avoidTolls?: boolean;
      avoidHighways?: boolean;
      avoidFerries?: boolean;
    } = {},
  ): Promise<ApiResponse<Route[]>> {
    try {
      logger.info("Getting route", {
        waypoints: coordinates.length,
        profile: options?.profile || this.defaultProfile,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxDirections(coordinates, options);
      } else {
        return this.googleDirections(coordinates, options);
      }
    } catch (error: unknown) {
      logger.error("Failed to get route", {
        error: error instanceof Error ? error?.message : String(error),
        waypoints: coordinates.length,
        provider: this.provider,
      });

      throw new Error(`Route calculation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Calculate distance matrix between multiple points
   */
  public async getDistanceMatrix(
    sources: Coordinate[],
    destinations: Coordinate[],
    options: {
      profile?: string;
      annotations?: string[];
    } = {},
  ): Promise<ApiResponse<DistanceMatrix>> {
    try {
      logger.info("Calculating distance matrix", {
        sources: sources.length,
        destinations: destinations.length,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxMatrix(sources, destinations, options);
      } else {
        return this.googleMatrix(sources, destinations, options);
      }
    } catch (error: unknown) {
      logger.error("Failed to calculate distance matrix", {
        error: error instanceof Error ? error?.message : String(error),
        sources: sources.length,
        destinations: destinations.length,
        provider: this.provider,
      });

      throw new Error(`Distance matrix calculation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Generate isochrones for service area analysis
   */
  public async getIsochrones(
    center: Coordinate,
    contours: number[],
    options: {
      contoursUnit?: "minutes" | "meters";
      profile?: string;
      polygons?: boolean;
    } = {},
  ): Promise<ApiResponse<Isochrone[]>> {
    try {
      logger.info("Generating isochrones", {
        center,
        contours,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxIsochrones(center, contours, options);
      } else {
        throw new Error("Isochrones not supported by Google Maps API");
      }
    } catch (error: unknown) {
      logger.error("Failed to generate isochrones", {
        error: error instanceof Error ? error?.message : String(error),
        center,
        contours,
        provider: this.provider,
      });

      throw new Error(`Isochrone generation failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Check if point is within geofence
   */
  public isPointInGeofence(point: Coordinate, geofence: Geofence): boolean {
    if (geofence.geometry.type === "Circle") {
      const [centerLng, centerLat, radius] = geofence.geometry
        .coordinates as number[];
      const distance = this.calculateDistance(point, {
        latitude: centerLat,
        longitude: centerLng,
      });
      return distance <= radius;
    } else if (geofence.geometry.type === "Polygon") {
      return this.pointInPolygon(
        point,
        geofence.geometry.coordinates as number[][],
      );
    }

    return false;
  }

  /**
   * Optimize route for multiple stops (Traveling Salesman Problem)
   */
  public async optimizeRoute(
    depot: Coordinate,
    stops: Array<{
      coordinates: Coordinate;
      id?: string;
      timeWindow?: {
        start: Date;
        end: Date;
      };
      serviceTime?: number; // minutes
      priority?: number;
    }>,
    options: {
      profile?: string;
      maxTravelTime?: number; // minutes
      vehicleCapacity?: number;
      returnToDepot?: boolean;
    } = {},
  ): Promise<
    ApiResponse<{
      route: Route;
      optimizedOrder: number[];
      totalDistance: number;
      totalDuration: number;
      estimatedCost?: number;
    }>
  > {
    try {
      logger.info("Optimizing route", {
        depot,
        stops: stops.length,
        provider: this.provider,
      });

      if (this.provider === "mapbox") {
        return this.mapboxOptimization(depot, stops, options);
      } else {
        // Implement basic TSP for Google Maps
        return this.basicTSP(depot, stops, options);
      }
    } catch (error: unknown) {
      logger.error("Failed to optimize route", {
        error: error instanceof Error ? error?.message : String(error),
        stops: stops.length,
        provider: this.provider,
      });

      throw new Error(`Route optimization failed: ${error instanceof Error ? error?.message : String(error)}`);
    }
  }

  /**
   * Mapbox geocoding implementation
   */
  private async mapboxGeocode(
    address: string,
    options: any,
  ): Promise<ApiResponse<GeocodingResult[]>> {
    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
      limit: options?.limit || 5,
    };

    if (options.country) params.country = options.country;
    if (options.proximity) {
      params.proximity = `${options.proximity.longitude},${options.proximity.latitude}`;
    }
    if (options.types) params.types = options.types.join(",");

    const response = await this.get<{
      features: Array<{
        geometry: {
          coordinates: number[];
        };
        properties: {
          accuracy?: string;
          address?: string;
        };
        place_name: string;
        relevance: number;
        place_type: string[];
        context?: Array<{
          id: string;
          text: string;
          short_code?: string;
        }>;
      }>;
    }>(
      `/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
      params,
    );

    if (!response.success || !response.data) {
      throw new Error("Geocoding request failed");
    }

    const results: GeocodingResult[] = response.data.features.map(
      (feature) => ({
        coordinates: {
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        },
        address: this.parseMapboxAddress(feature.place_name),
        confidence: feature.relevance,
        placeType: feature.place_type,
        relevance: feature.relevance,
        context: feature.context,
      }),
    );

    return {
      success: true,
      data: results,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Google Maps geocoding implementation
   */
  private async googleGeocode(
    address: string,
    options: any,
  ): Promise<ApiResponse<GeocodingResult[]>> {
    const params: Record<string, any> = {
      key: this.googleMapsApiKey,
      address,
    };

    if (options.country) params.region = options.country;
    if (options.types) params.types = options.types.join("|");

    const response = await this.get<{
      status: string;
      results: Array<{
        geometry: {
          location: {
            lat: number;
            lng: number;
          };
        };
        formatted_address: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        types: string[];
      }>;
    }>("/geocode/json", params);

    if (!response.success || !response?.data || response.data.status !== "OK") {
      throw new Error(`Google geocoding failed: ${response.data?.status}`);
    }

    const results: GeocodingResult[] = response.data.results.map((result) => ({
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      address: this.parseGoogleAddress(
        result.formatted_address,
        result.address_components,
      ),
      confidence: 1.0, // Google doesn't provide confidence scores
      placeType: result.types,
    }));

    return {
      success: true,
      data: results,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Mapbox reverse geocoding implementation
   */
  private async mapboxReverseGeocode(
    coordinate: Coordinate,
    options: any,
  ): Promise<ApiResponse<GeocodingResult[]>> {
    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
    };

    if (options.types) params.types = options.types.join(",");

    const coordinateString = `${coordinate.longitude},${coordinate.latitude}`;
    const response = await this.get<{
      features: Array<{
        geometry: {
          coordinates: number[];
        };
        place_name: string;
        relevance: number;
        place_type: string[];
        context?: Array<{
          id: string;
          text: string;
          short_code?: string;
        }>;
      }>;
    }>(`/geocoding/v5/mapbox.places/${coordinateString}.json`, params);

    if (!response.success || !response.data) {
      throw new Error("Reverse geocoding request failed");
    }

    const results: GeocodingResult[] = response.data.features.map(
      (feature) => ({
        coordinates: {
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        },
        address: this.parseMapboxAddress(feature.place_name),
        confidence: feature.relevance,
        placeType: feature.place_type,
        relevance: feature.relevance,
        context: feature.context,
      }),
    );

    return {
      success: true,
      data: results,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Google Maps reverse geocoding implementation
   */
  private async googleReverseGeocode(
    coordinate: Coordinate,
    options: any,
  ): Promise<ApiResponse<GeocodingResult[]>> {
    const params: Record<string, any> = {
      key: this.googleMapsApiKey,
      latlng: `${coordinate.latitude},${coordinate.longitude}`,
    };

    if (options.types) params.result_type = options.types.join("|");
    if (options.language) params.language = options.language;

    const response = await this.get<{
      status: string;
      results: Array<{
        geometry: {
          location: {
            lat: number;
            lng: number;
          };
        };
        formatted_address: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        types: string[];
      }>;
    }>("/geocode/json", params);

    if (!response.success || !response?.data || response.data.status !== "OK") {
      throw new Error(
        `Google reverse geocoding failed: ${response.data?.status}`,
      );
    }

    const results: GeocodingResult[] = response.data.results.map((result) => ({
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      address: this.parseGoogleAddress(
        result.formatted_address,
        result.address_components,
      ),
      confidence: 1.0,
      placeType: result.types,
    }));

    return {
      success: true,
      data: results,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Mapbox directions implementation
   */
  private async mapboxDirections(
    coordinates: Coordinate[],
    options: any,
  ): Promise<ApiResponse<Route[]>> {
    const profile = options?.profile || this.defaultProfile;
    const coordinatesString = coordinates
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(";");

    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
      alternatives: options?.alternatives || false,
      steps: options.steps !== false,
      geometries: options?.geometries || "geojson",
      overview: options?.overview || "full",
    };

    const response = await this.get<{
      routes: Array<{
        geometry: any;
        distance: number;
        duration: number;
        legs: Array<{
          steps: Array<{
            distance: number;
            duration: number;
            geometry: any;
            maneuver: {
              type: string;
              instruction: string;
              bearing_before?: number;
              bearing_after?: number;
              location: number[];
            };
            name?: string;
          }>;
        }>;
        weight?: number;
        weight_name?: string;
      }>;
    }>(`/directions/v5/mapbox/${profile}/${coordinatesString}`, params);

    if (!response.success || !response.data) {
      throw new Error("Directions request failed");
    }

    const routes: Route[] = response.data.routes.map((route) => ({
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.legs.flatMap((leg) => leg.steps),
      weight: route.weight,
      weightName: route.weight_name,
    }));

    return {
      success: true,
      data: routes,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Google Maps directions implementation
   */
  private async googleDirections(
    coordinates: Coordinate[],
    options: any,
  ): Promise<ApiResponse<Route[]>> {
    const origin = `${coordinates[0].latitude},${coordinates[0].longitude}`;
    const destination = `${coordinates[coordinates.length - 1].latitude},${coordinates[coordinates.length - 1].longitude}`;

    const params: Record<string, any> = {
      key: this.googleMapsApiKey,
      origin,
      destination,
      alternatives: options?.alternatives || false,
    };

    if (coordinates.length > 2) {
      const waypoints = coordinates
        .slice(1, -1)
        .map((c) => `${c.latitude},${c.longitude}`)
        .join("|");
      params.waypoints = waypoints;
    }

    if (options.avoidTolls) params.avoid = "tolls";
    if (options.avoidHighways)
      params.avoid = params.avoid ? `${params.avoid}|highways` : "highways";
    if (options.avoidFerries)
      params.avoid = params.avoid ? `${params.avoid}|ferries` : "ferries";

    const response = await this.get<{
      status: string;
      routes: Array<{
        overview_polyline: {
          points: string;
        };
        legs: Array<{
          distance: {
            value: number;
          };
          duration: {
            value: number;
          };
          steps: Array<{
            distance: {
              value: number;
            };
            duration: {
              value: number;
            };
            html_instructions: string;
            maneuver?: string;
            start_location: {
              lat: number;
              lng: number;
            };
            end_location: {
              lat: number;
              lng: number;
            };
            polyline: {
              points: string;
            };
          }>;
        }>;
      }>;
    }>("/directions/json", params);

    if (!response.success || !response?.data || response.data.status !== "OK") {
      throw new Error(`Google directions failed: ${response.data?.status}`);
    }

    const routes: Route[] = response.data.routes.map((route) => {
      const totalDistance = route.legs.reduce(
        (sum, leg) => sum + leg.distance.value,
        0,
      );
      const totalDuration = route.legs.reduce(
        (sum, leg) => sum + leg.duration.value,
        0,
      );

      return {
        geometry: this.decodePolyline(route.overview_polyline.points),
        distance: totalDistance,
        duration: totalDuration,
        steps: route.legs.flatMap((leg) =>
          leg.steps.map((step) => ({
            distance: step.distance.value,
            duration: step.duration.value,
            geometry: this.decodePolyline(step.polyline.points),
            maneuver: {
              type: step?.maneuver || "straight",
              instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
              location: [step.start_location.lng, step.start_location.lat],
            },
          })),
        ),
      };
    });

    return {
      success: true,
      data: routes,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Mapbox matrix implementation
   */
  private async mapboxMatrix(
    sources: Coordinate[],
    destinations: Coordinate[],
    options: any,
  ): Promise<ApiResponse<DistanceMatrix>> {
    const profile = options?.profile || this.defaultProfile;
    const allCoordinates = [...sources, ...destinations];
    const coordinatesString = allCoordinates
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(";");

    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
      sources: sources.map((_, i) => i).join(";"),
      destinations: destinations.map((_, i) => sources.length + i).join(";"),
      annotations: options.annotations?.join(",") || "duration,distance",
    };

    const response = await this.get<{
      durations: number[][];
      distances: number[][];
      sources: Array<{
        location: number[];
        name?: string;
      }>;
      destinations: Array<{
        location: number[];
        name?: string;
      }>;
    }>(`/directions-matrix/v1/mapbox/${profile}/${coordinatesString}`, params);

    if (!response.success || !response.data) {
      throw new Error("Matrix request failed");
    }

    return {
      success: true,
      data: {
        sources: response.data.sources,
        destinations: response.data.destinations,
        durations: response.data.durations,
        distances: response.data.distances,
      },
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Google Maps distance matrix implementation
   */
  private async googleMatrix(
    sources: Coordinate[],
    destinations: Coordinate[],
    options: any,
  ): Promise<ApiResponse<DistanceMatrix>> {
    const origins = sources
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|");
    const destinationsList = destinations
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|");

    const params: Record<string, any> = {
      key: this.googleMapsApiKey,
      origins,
      destinations: destinationsList,
      units: "metric",
    };

    const response = await this.get<{
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          distance: {
            value: number;
          };
          duration: {
            value: number;
          };
        }>;
      }>;
    }>("/distancematrix/json", params);

    if (!response.success || !response?.data || response.data.status !== "OK") {
      throw new Error(
        `Google distance matrix failed: ${response.data?.status}`,
      );
    }

    const durations: number[][] = [];
    const distances: number[][] = [];

    response.data.rows.forEach((row, i) => {
      durations[i] = [];
      distances[i] = [];
      row.elements.forEach((element, j) => {
        durations[i][j] = element.status === "OK" ? element.duration.value : -1;
        distances[i][j] = element.status === "OK" ? element.distance.value : -1;
      });
    });

    return {
      success: true,
      data: {
        sources: sources.map((c) => ({ location: [c.longitude, c.latitude] })),
        destinations: destinations.map((c) => ({
          location: [c.longitude, c.latitude],
        })),
        durations,
        distances,
      },
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Mapbox isochrones implementation
   */
  private async mapboxIsochrones(
    center: Coordinate,
    contours: number[],
    options: any,
  ): Promise<ApiResponse<Isochrone[]>> {
    const profile = options?.profile || this.defaultProfile;
    const coordinateString = `${center.longitude},${center.latitude}`;

    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
      contours_minutes: contours.join(","),
      polygons: options.polygons !== false,
    };

    const response = await this.get<{
      features: Array<{
        geometry: {
          coordinates: number[][][];
          type: "Polygon";
        };
        properties: {
          contour: number;
          color?: string;
          opacity?: number;
        };
      }>;
    }>(`/isochrone/v1/mapbox/${profile}/${coordinateString}`, params);

    if (!response.success || !response.data) {
      throw new Error("Isochrone request failed");
    }

    const isochrones: Isochrone[] = response.data.features.map((feature) => ({
      geometry: feature.geometry,
      properties: feature.properties,
    }));

    return {
      success: true,
      data: isochrones,
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Mapbox optimization implementation
   */
  private async mapboxOptimization(
    depot: Coordinate,
    stops: any[],
    options: any,
  ): Promise<ApiResponse<any>> {
    const profile = options?.profile || this.defaultProfile;
    const allCoordinates = [depot, ...stops.map((s) => s.coordinates)];

    if (options.returnToDepot !== false) {
      allCoordinates.push(depot);
    }

    const coordinatesString = allCoordinates
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(";");

    const params: Record<string, any> = {
      access_token: this.mapboxAccessToken,
      source: "first",
      destination: options.returnToDepot !== false ? "last" : "any",
      roundtrip: options.returnToDepot !== false,
      geometries: "geojson",
      steps: true,
    };

    const response = await this.get<{
      code: string;
      trips: Array<{
        geometry: any;
        distance: number;
        duration: number;
        legs: Array<{
          steps: any[];
        }>;
      }>;
      waypoints: Array<{
        waypoint_index: number;
        trips_index: number;
        distance: number;
      }>;
    }>(`/optimized-trips/v1/mapbox/${profile}/${coordinatesString}`, params);

    if (!response.success || !response?.data || response.data.code !== "Ok") {
      throw new Error(`Optimization failed: ${response.data?.code}`);
    }

    const trip = response.data.trips[0];
    const optimizedOrder = response.data.waypoints.map(
      (wp) => wp.waypoint_index,
    );

    return {
      success: true,
      data: {
        route: {
          geometry: trip.geometry,
          distance: trip.distance,
          duration: trip.duration,
          steps: trip.legs.flatMap((leg) => leg.steps),
        },
        optimizedOrder,
        totalDistance: trip.distance,
        totalDuration: trip.duration,
      },
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Basic TSP implementation for Google Maps
   */
  private async basicTSP(
    depot: Coordinate,
    stops: any[],
    options: any,
  ): Promise<ApiResponse<any>> {
    // Implement nearest neighbor TSP algorithm
    const unvisited = new Set(stops.map((_, i) => i));
    const order: number[] = [];
    let currentLocation = depot;

    while (unvisited.size > 0) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;

      for (const i of unvisited) {
        const distance = this.calculateDistance(
          currentLocation,
          stops[i].coordinates,
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      order.push(nearestIndex);
      unvisited.delete(nearestIndex);
      currentLocation = stops[nearestIndex].coordinates;
    }

    // Get optimized route
    const routeCoordinates = [depot, ...order.map((i) => stops[i].coordinates)];
    if (options.returnToDepot !== false) {
      routeCoordinates.push(depot);
    }

    const routeResponse = await this.getRoute(routeCoordinates, {
      profile: options.profile,
      steps: true,
    });

    if (
      !routeResponse.success ||
      !routeResponse.data ||
      routeResponse.data.length === 0
    ) {
      throw new Error("Failed to get optimized route");
    }

    const route = routeResponse.data[0];

    return {
      success: true,
      data: {
        route,
        optimizedOrder: order,
        totalDistance: route.distance,
        totalDuration: route.duration,
      },
      statusCode: 200,
      metadata: {
        duration: 0,
        attempt: 1,
      },
    };
  }

  /**
   * Parse Mapbox address format
   */
  private parseMapboxAddress(placeName: string): Address {
    const parts = placeName.split(", ");
    return {
      formattedAddress: placeName,
      streetName: parts[0] || "",
      city: parts[1] || "",
      state: parts[2] || "",
      country: parts[parts.length - 1] || "",
    };
  }

  /**
   * Parse Google address format
   */
  private parseGoogleAddress(formatted: string, components: any[]): Address {
    const address: Address = { formattedAddress: formatted };

    components.forEach((component) => {
      if (component.types.includes("street_number")) {
        address.streetNumber = component.long_name;
      } else if (component.types.includes("route")) {
        address.streetName = component.long_name;
      } else if (component.types.includes("locality")) {
        address.city = component.long_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        address.state = component.short_name;
      } else if (component.types.includes("postal_code")) {
        address.postalCode = component.long_name;
      } else if (component.types.includes("country")) {
        address.country = component.short_name;
      }
    });

    return address;
  }

  /**
   * Decode Google polyline to GeoJSON
   */
  private decodePolyline(encoded: string): {
    coordinates: number[][];
    type: "LineString";
  } {
    const coords: number[][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coords.push([lng / 1e5, lat / 1e5]);
    }

    return {
      coordinates: coords,
      type: "LineString",
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLng = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
        Math.cos(this.toRadians(coord2.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if point is inside polygon
   */
  private pointInPolygon(point: Coordinate, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1]; // latitude
      const yi = polygon[i][0]; // longitude
      const xj = polygon[j][1];
      const yj = polygon[j][0];

      if (
        yi > point.longitude !== yj > point.longitude &&
        point.latitude < ((xj - xi) * (point.longitude - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
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
      // Test basic geocoding functionality
      await this.geocodeAddress("New York, NY", { limit: 1 });

      return {
        service: `maps-${this.provider}`,
        status: "healthy",
        lastCheck: new Date(),
      };
    } catch (error: unknown) {
      return {
        service: `maps-${this.provider}`,
        status: "unhealthy",
        lastCheck: new Date(),
        details: { error: error instanceof Error ? error?.message : String(error) },
      };
    }
  }
}

export default MapsService;
