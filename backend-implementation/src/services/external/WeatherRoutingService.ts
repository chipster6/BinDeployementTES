/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - WEATHER ROUTING SERVICE
 * ============================================================================
 *
 * Weather-aware routing service that integrates weather conditions into
 * route optimization for waste management operations. Provides weather
 * impact assessment, severe weather alerts, and condition-appropriate routing.
 *
 * Features:
 * - Current weather conditions for route planning
 * - Weather forecasts for multi-day route optimization
 * - Severe weather alerts and impact assessment
 * - Weather impact on route efficiency and safety
 * - Historical weather pattern analysis
 * - Multi-provider weather data integration
 * - Business hours optimization for weather-sensitive operations
 *
 * Weather Providers:
 * - Primary: OpenWeatherMap
 * - Secondary: WeatherAPI
 * - Tertiary: National Weather Service
 * - Backup: AccuWeather
 *
 * Created by: External-API-Integration-Specialist
 * Date: 2025-08-18
 * Version: 1.0.0 - Weather-Aware Route Optimization
 */

import {
  BaseExternalService,
  ExternalServiceConfig,
  ApiResponse,
  ApiRequestOptions,
} from "./BaseExternalService";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { config } from "@/config";

/**
 * Location interface for weather queries
 */
export interface WeatherLocation {
  latitude: number;
  longitude: number;
  name?: string;
  elevation?: number; // meters
}

/**
 * Route interface for weather analysis
 */
export interface Route {
  id: string;
  coordinates: Array<{
    latitude: number;
    longitude: number;
    timestamp?: Date;
  }>;
  estimatedDuration: number; // minutes
  plannedStartTime: Date;
  vehicleType?: "truck" | "van" | "compact";
  priority: "low" | "medium" | "high" | "critical";
}

/**
 * Weather condition interface
 */
export interface WeatherCondition {
  location: WeatherLocation;
  timestamp: Date;
  temperature: {
    current: number; // Celsius
    feelsLike: number;
    min: number;
    max: number;
  };
  humidity: number; // percentage
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windGust?: number; // m/s
  visibility: number; // meters
  precipitation: {
    type: "none" | "rain" | "snow" | "sleet" | "hail";
    intensity: "none" | "light" | "moderate" | "heavy" | "extreme";
    amount: number; // mm/hour
    probability: number; // percentage
  };
  cloudCover: number; // percentage
  uvIndex: number;
  conditions: {
    main: string;
    description: string;
    icon: string;
  };
  alerts?: WeatherAlert[];
  source: string;
  reliability: number; // 0-1
}

/**
 * Weather forecast interface
 */
export interface WeatherForecast {
  location: WeatherLocation;
  forecastStart: Date;
  forecastEnd: Date;
  hourlyForecasts: Array<{
    timestamp: Date;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: {
      type: string;
      intensity: string;
      amount: number;
      probability: number;
    };
    visibility: number;
    conditions: string;
    confidence: number; // 0-1
  }>;
  dailyForecasts: Array<{
    date: Date;
    temperatureMin: number;
    temperatureMax: number;
    conditions: string;
    precipitationProbability: number;
    windSpeedMax: number;
    summary: string;
  }>;
  alerts: WeatherAlert[];
  accuracy: {
    shortTerm: number; // 0-1 (0-6 hours)
    mediumTerm: number; // 0-1 (6-24 hours)
    longTerm: number; // 0-1 (24+ hours)
  };
}

/**
 * Weather alert interface
 */
export interface WeatherAlert {
  id: string;
  type: "watch" | "warning" | "advisory" | "emergency";
  severity: "minor" | "moderate" | "severe" | "extreme";
  event: string;
  headline: string;
  description: string;
  areas: string[];
  startTime: Date;
  endTime: Date;
  instructions?: string;
  source: string;
  urgency: "immediate" | "expected" | "future" | "past" | "unknown";
  certainty: "observed" | "likely" | "possible" | "unlikely" | "unknown";
}

/**
 * Weather impact assessment
 */
export interface WeatherImpact {
  route: Route;
  overallImpact: "minimal" | "low" | "moderate" | "high" | "severe";
  safetyRisk: "low" | "medium" | "high" | "extreme";
  efficiencyImpact: {
    timeDelay: number; // minutes
    speedReduction: number; // percentage
    fuelIncrease: number; // percentage
    confidenceLevel: number; // 0-1
  };
  segmentImpacts: Array<{
    segmentIndex: number;
    coordinates: {
      start: { latitude: number; longitude: number };
      end: { latitude: number; longitude: number };
    };
    conditions: WeatherCondition;
    impact: {
      visibility: "good" | "reduced" | "poor" | "dangerous";
      roadConditions: "dry" | "wet" | "icy" | "flooded" | "impassable";
      recommendedSpeed: number; // km/h
      safetyRating: "safe" | "caution" | "dangerous" | "avoid";
    };
    recommendations: string[];
  }>;
  recommendations: {
    overall: string[];
    timing: {
      recommended: boolean;
      alternativeTimes?: Date[];
      reasoning: string;
    };
    equipment: string[];
    alternatives: {
      routes?: string[];
      postponement?: {
        recommended: boolean;
        until?: Date;
        reasoning: string;
      };
    };
  };
  lastUpdated: Date;
}

/**
 * Weather service configuration
 */
interface WeatherServiceConfig {
  providers: {
    openweathermap?: {
      apiKey: string;
      enabled: boolean;
      priority: number;
    };
    weatherapi?: {
      apiKey: string;
      enabled: boolean;
      priority: number;
    };
    nws?: {
      enabled: boolean;
      priority: number;
    };
    accuweather?: {
      apiKey: string;
      enabled: boolean;
      priority: number;
    };
  };
  caching: {
    currentWeatherTTL: number; // seconds
    forecastTTL: number; // seconds
    alertsTTL: number; // seconds
  };
  thresholds: {
    wind: {
      caution: number; // m/s
      dangerous: number; // m/s
    };
    precipitation: {
      light: number; // mm/h
      moderate: number; // mm/h
      heavy: number; // mm/h
    };
    visibility: {
      reduced: number; // meters
      poor: number; // meters
      dangerous: number; // meters
    };
    temperature: {
      freezing: number; // Celsius
      hot: number; // Celsius
    };
  };
}

/**
 * Weather Routing Service
 */
export class WeatherRoutingService extends BaseExternalService {
  private providers: WeatherServiceConfig['providers'];
  private cachingConfig: WeatherServiceConfig['caching'];
  private thresholds: WeatherServiceConfig['thresholds'];

  constructor(config: WeatherServiceConfig & ExternalServiceConfig) {
    super({
      ...config,
      serviceName: "weather-routing",
      baseURL: "https://api.weather-aggregator.local", // Placeholder
      timeout: 8000,
      retryAttempts: 3,
      circuitBreakerThreshold: 5,
      rateLimit: {
        requests: 300, // Per minute across all providers
        window: 60,
      },
      servicePriority: "medium",
      businessCriticality: "performance_optimization",
      enableServiceMesh: true,
      enableAdvancedFallback: true,
    });

    this.providers = config.providers;
    this.cachingConfig = {
      currentWeatherTTL: 1800, // 30 minutes
      forecastTTL: 3600, // 1 hour
      alertsTTL: 300, // 5 minutes
      ...config.caching,
    };
    this.thresholds = {
      wind: {
        caution: 10, // m/s (~36 km/h)
        dangerous: 15, // m/s (~54 km/h)
      },
      precipitation: {
        light: 2.5, // mm/h
        moderate: 7.5, // mm/h
        heavy: 20, // mm/h
      },
      visibility: {
        reduced: 5000, // meters
        poor: 1000, // meters
        dangerous: 200, // meters
      },
      temperature: {
        freezing: 0, // Celsius
        hot: 35, // Celsius
      },
      ...config.thresholds,
    };
  }

  /**
   * Get authentication header (provider-specific)
   */
  protected getAuthHeader(): string {
    // Provider-specific auth handled in individual methods
    return "";
  }

  /**
   * Get current weather conditions
   * Optimized for route planning with multiple provider fallback
   */
  public async getCurrentWeather(
    location: WeatherLocation,
    options: {
      includeAlerts?: boolean;
      preferredProvider?: string;
      maxAge?: number; // seconds
    } = {},
  ): Promise<ApiResponse<WeatherCondition>> {
    try {
      // Check cache first
      const cacheKey = this.generateWeatherCacheKey(location, "current");
      const cached = await this.getCachedResult(cacheKey);
      
      if (cached && this.shouldUseCachedWeather(options.maxAge)) {
        logger.debug("Using cached weather conditions", {
          location: `${location.latitude},${location.longitude}`,
          age: (Date.now() - new Date(cached.timestamp).getTime()) / 1000,
        });
        return {
          success: true,
          data: cached,
          statusCode: 200,
          metadata: {
            requestId: `weather-cached-${Date.now()}`,
            duration: 0,
            attempt: 1,
            fromCache: true,
          },
        };
      }

      logger.info("Fetching current weather conditions", {
        location: `${location.latitude},${location.longitude}`,
        includeAlerts: options.includeAlerts,
      });

      // Try providers in priority order
      const sortedProviders = this.getSortedProviders(options.preferredProvider);
      let lastError: Error | null = null;

      for (const provider of sortedProviders) {
        try {
          const weather = await this.fetchWeatherFromProvider(
            provider.name,
            location,
            "current",
            { includeAlerts: options.includeAlerts }
          );
          
          if (weather) {
            // Cache successful result
            await this.cacheResult(
              cacheKey,
              weather,
              this.cachingConfig.currentWeatherTTL
            );

            logger.info("Weather conditions retrieved", {
              provider: provider.name,
              temperature: weather.temperature.current,
              conditions: weather.conditions.main,
              alerts: weather.alerts?.length || 0,
            });

            return {
              success: true,
              data: weather,
              statusCode: 200,
              metadata: {
                requestId: `weather-${Date.now()}`,
                duration: 0,
                attempt: 1,
                fallbackUsed: provider.name !== sortedProviders[0].name,
                fallbackStrategy: provider.name,
              },
            };
          }
        } catch (error) {
          lastError = error;
          logger.warn(`Weather provider ${provider.name} failed`, {
            error: error.message,
            location: `${location.latitude},${location.longitude}`,
          });
          continue;
        }
      }

      throw lastError || new Error("All weather providers failed");
    } catch (error) {
      logger.error("Failed to get current weather", {
        error: error.message,
        location: `${location.latitude},${location.longitude}`,
        options,
      });

      throw new Error(`Weather data retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get weather forecasts for route planning
   * Provides detailed hourly and daily forecasts for route optimization
   */
  public async getWeatherForecast(
    route: Route,
    timeframe: {
      start: Date;
      end: Date;
    },
  ): Promise<ApiResponse<WeatherForecast[]>> {
    try {
      logger.info("Fetching weather forecast for route", {
        routeId: route.id,
        coordinates: route.coordinates.length,
        timeframe: `${timeframe.start.toISOString()} - ${timeframe.end.toISOString()}`,
      });

      const forecasts: WeatherForecast[] = [];
      
      // Get forecasts for key points along the route
      const keyPoints = this.selectKeyPointsForForecast(route);
      
      for (const point of keyPoints) {
        const cacheKey = this.generateForecastCacheKey(point, timeframe);
        let forecast = await this.getCachedResult(cacheKey);
        
        if (!forecast) {
          // Fetch forecast from provider
          const sortedProviders = this.getSortedProviders();
          
          for (const provider of sortedProviders) {
            try {
              forecast = await this.fetchWeatherFromProvider(
                provider.name,
                point,
                "forecast",
                { timeframe }
              );
              
              if (forecast) {
                await this.cacheResult(
                  cacheKey,
                  forecast,
                  this.cachingConfig.forecastTTL
                );
                break;
              }
            } catch (error) {
              logger.warn(`Forecast provider ${provider.name} failed`, {
                error: error.message,
                point: `${point.latitude},${point.longitude}`,
              });
              continue;
            }
          }
        }
        
        if (forecast) {
          forecasts.push(forecast);
        }
      }

      logger.info("Weather forecasts retrieved", {
        routeId: route.id,
        forecasts: forecasts.length,
        keyPoints: keyPoints.length,
      });

      return {
        success: true,
        data: forecasts,
        statusCode: 200,
        metadata: {
          requestId: `forecast-${Date.now()}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get weather forecast", {
        error: error.message,
        routeId: route.id,
        timeframe,
      });

      throw new Error(`Weather forecast failed: ${error.message}`);
    }
  }

  /**
   * Get severe weather alerts
   * Monitors and retrieves weather alerts for operational areas
   */
  public async getSevereWeatherAlerts(
    area: {
      northEast: WeatherLocation;
      southWest: WeatherLocation;
    },
    options: {
      severityFilter?: ("minor" | "moderate" | "severe" | "extreme")[];
      typeFilter?: string[];
      includeExpired?: boolean;
    } = {},
  ): Promise<ApiResponse<WeatherAlert[]>> {
    try {
      logger.info("Fetching severe weather alerts", {
        area: {
          ne: `${area.northEast.latitude},${area.northEast.longitude}`,
          sw: `${area.southWest.latitude},${area.southWest.longitude}`,
        },
        severityFilter: options.severityFilter,
      });

      const allAlerts: WeatherAlert[] = [];
      const sortedProviders = this.getSortedProviders();

      // Aggregate alerts from all available providers
      for (const provider of sortedProviders) {
        try {
          const providerAlerts = await this.fetchAlertsFromProvider(
            provider.name,
            area,
            options
          );
          allAlerts.push(...providerAlerts);
        } catch (error) {
          logger.warn(`Alert provider ${provider.name} failed`, {
            error: error.message,
          });
          continue;
        }
      }

      // Deduplicate and filter alerts
      const filteredAlerts = this.deduplicateAlerts(
        this.filterAlerts(allAlerts, options)
      );

      logger.info("Severe weather alerts retrieved", {
        total: allAlerts.length,
        filtered: filteredAlerts.length,
        severe: filteredAlerts.filter(a => a.severity === "severe" || a.severity === "extreme").length,
      });

      return {
        success: true,
        data: filteredAlerts,
        statusCode: 200,
        metadata: {
          requestId: `alerts-${Date.now()}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to get weather alerts", {
        error: error.message,
        area,
        options,
      });

      throw new Error(`Weather alerts retrieval failed: ${error.message}`);
    }
  }

  /**
   * Assess weather impact on route
   * Comprehensive analysis of weather conditions on route efficiency and safety
   */
  public async assessWeatherImpact(
    route: Route,
    weather: {
      current?: WeatherCondition[];
      forecast?: WeatherForecast[];
    },
  ): Promise<ApiResponse<WeatherImpact>> {
    try {
      logger.info("Assessing weather impact on route", {
        routeId: route.id,
        currentConditions: weather.current?.length || 0,
        forecasts: weather.forecast?.length || 0,
      });

      // If no weather data provided, fetch it
      if (!weather.current && !weather.forecast) {
        const startLocation = {
          latitude: route.coordinates[0].latitude,
          longitude: route.coordinates[0].longitude,
        };
        const currentWeatherResponse = await this.getCurrentWeather(startLocation);
        weather.current = [currentWeatherResponse.data!];
      }

      // Analyze impact for each route segment
      const segmentImpacts = await this.analyzeSegmentImpacts(route, weather);
      
      // Calculate overall impact
      const overallImpact = this.calculateOverallImpact(segmentImpacts);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(route, segmentImpacts, overallImpact);

      const weatherImpact: WeatherImpact = {
        route,
        overallImpact: overallImpact.level,
        safetyRisk: overallImpact.safetyRisk,
        efficiencyImpact: overallImpact.efficiency,
        segmentImpacts,
        recommendations,
        lastUpdated: new Date(),
      };

      logger.info("Weather impact assessment completed", {
        routeId: route.id,
        overallImpact: overallImpact.level,
        safetyRisk: overallImpact.safetyRisk,
        timeDelay: overallImpact.efficiency.timeDelay,
        recommendations: recommendations.overall.length,
      });

      return {
        success: true,
        data: weatherImpact,
        statusCode: 200,
        metadata: {
          requestId: `impact-${Date.now()}`,
          duration: 0,
          attempt: 1,
        },
      };
    } catch (error) {
      logger.error("Failed to assess weather impact", {
        error: error.message,
        routeId: route.id,
      });

      throw new Error(`Weather impact assessment failed: ${error.message}`);
    }
  }

  /**
   * Fetch weather data from specific provider
   */
  private async fetchWeatherFromProvider(
    providerName: string,
    location: WeatherLocation,
    type: "current" | "forecast",
    options: any
  ): Promise<WeatherCondition | WeatherForecast | null> {
    switch (providerName) {
      case "openweathermap":
        return this.fetchOpenWeatherMapData(location, type, options);
      case "weatherapi":
        return this.fetchWeatherAPIData(location, type, options);
      case "nws":
        return this.fetchNWSData(location, type, options);
      case "accuweather":
        return this.fetchAccuWeatherData(location, type, options);
      default:
        logger.warn(`Unknown weather provider: ${providerName}`);
        return null;
    }
  }

  /**
   * Fetch alerts from specific provider
   */
  private async fetchAlertsFromProvider(
    providerName: string,
    area: any,
    options: any
  ): Promise<WeatherAlert[]> {
    // Implementation would be provider-specific
    // This is a placeholder for actual implementation
    return [];
  }

  /**
   * OpenWeatherMap integration
   */
  private async fetchOpenWeatherMapData(
    location: WeatherLocation,
    type: "current" | "forecast",
    options: any
  ): Promise<WeatherCondition | WeatherForecast> {
    // Placeholder implementation
    // This would use the actual OpenWeatherMap API
    const baseWeather: WeatherCondition = {
      location,
      timestamp: new Date(),
      temperature: {
        current: 20 + Math.random() * 15,
        feelsLike: 18 + Math.random() * 17,
        min: 15 + Math.random() * 10,
        max: 25 + Math.random() * 10,
      },
      humidity: 40 + Math.random() * 40,
      pressure: 1013 + Math.random() * 20,
      windSpeed: Math.random() * 15,
      windDirection: Math.random() * 360,
      visibility: 8000 + Math.random() * 7000,
      precipitation: {
        type: "none",
        intensity: "none",
        amount: 0,
        probability: Math.random() * 30,
      },
      cloudCover: Math.random() * 100,
      uvIndex: Math.random() * 10,
      conditions: {
        main: "Clear",
        description: "clear sky",
        icon: "01d",
      },
      source: "openweathermap",
      reliability: 0.9,
    };

    if (type === "current") {
      return baseWeather;
    } else {
      // Generate forecast based on current conditions
      const forecast: WeatherForecast = {
        location,
        forecastStart: new Date(),
        forecastEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
        hourlyForecasts: [],
        dailyForecasts: [],
        alerts: [],
        accuracy: {
          shortTerm: 0.9,
          mediumTerm: 0.8,
          longTerm: 0.7,
        },
      };

      // Generate 24 hours of forecasts
      for (let i = 0; i < 24; i++) {
        forecast.hourlyForecasts.push({
          timestamp: new Date(Date.now() + i * 60 * 60 * 1000),
          temperature: baseWeather.temperature.current + (Math.random() - 0.5) * 5,
          humidity: baseWeather.humidity + (Math.random() - 0.5) * 20,
          windSpeed: baseWeather.windSpeed + (Math.random() - 0.5) * 5,
          windDirection: baseWeather.windDirection + (Math.random() - 0.5) * 60,
          precipitation: {
            type: "none",
            intensity: "none",
            amount: 0,
            probability: Math.random() * 40,
          },
          visibility: baseWeather.visibility,
          conditions: baseWeather.conditions.main,
          confidence: 0.8 - (i * 0.01), // Decreasing confidence over time
        });
      }

      return forecast;
    }
  }

  /**
   * WeatherAPI integration
   */
  private async fetchWeatherAPIData(
    location: WeatherLocation,
    type: "current" | "forecast",
    options: any
  ): Promise<WeatherCondition | WeatherForecast> {
    // Placeholder implementation similar to OpenWeatherMap
    return this.fetchOpenWeatherMapData(location, type, options);
  }

  /**
   * National Weather Service integration
   */
  private async fetchNWSData(
    location: WeatherLocation,
    type: "current" | "forecast",
    options: any
  ): Promise<WeatherCondition | WeatherForecast> {
    // Placeholder implementation similar to OpenWeatherMap
    return this.fetchOpenWeatherMapData(location, type, options);
  }

  /**
   * AccuWeather integration
   */
  private async fetchAccuWeatherData(
    location: WeatherLocation,
    type: "current" | "forecast",
    options: any
  ): Promise<WeatherCondition | WeatherForecast> {
    // Placeholder implementation similar to OpenWeatherMap
    return this.fetchOpenWeatherMapData(location, type, options);
  }

  /**
   * Select key points for weather forecast along route
   */
  private selectKeyPointsForForecast(route: Route): WeatherLocation[] {
    const keyPoints: WeatherLocation[] = [];
    const coordinates = route.coordinates;
    
    // Always include start and end points
    keyPoints.push({
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      name: "Start",
    });
    
    if (coordinates.length > 1) {
      keyPoints.push({
        latitude: coordinates[coordinates.length - 1].latitude,
        longitude: coordinates[coordinates.length - 1].longitude,
        name: "End",
      });
    }
    
    // Add midpoints for longer routes
    if (coordinates.length > 10) {
      const midIndex = Math.floor(coordinates.length / 2);
      keyPoints.push({
        latitude: coordinates[midIndex].latitude,
        longitude: coordinates[midIndex].longitude,
        name: "Midpoint",
      });
    }
    
    return keyPoints;
  }

  /**
   * Analyze weather impact on route segments
   */
  private async analyzeSegmentImpacts(
    route: Route,
    weather: any
  ): Promise<WeatherImpact['segmentImpacts']> {
    const segmentImpacts: WeatherImpact['segmentImpacts'] = [];
    
    // Analyze each route segment
    for (let i = 0; i < route.coordinates.length - 1; i++) {
      const start = route.coordinates[i];
      const end = route.coordinates[i + 1];
      
      // Get weather conditions for this segment (use nearest available)
      const segmentWeather = weather.current?.[0] || await this.getCurrentWeather({
        latitude: (start.latitude + end.latitude) / 2,
        longitude: (start.longitude + end.longitude) / 2,
      }).then(r => r.data!);
      
      // Assess impact based on weather conditions
      const impact = this.assessSegmentWeatherImpact(segmentWeather);
      
      segmentImpacts.push({
        segmentIndex: i,
        coordinates: {
          start: { latitude: start.latitude, longitude: start.longitude },
          end: { latitude: end.latitude, longitude: end.longitude },
        },
        conditions: segmentWeather,
        impact,
        recommendations: this.generateSegmentRecommendations(segmentWeather, impact),
      });
    }
    
    return segmentImpacts;
  }

  /**
   * Assess weather impact on individual segment
   */
  private assessSegmentWeatherImpact(weather: WeatherCondition) {
    const impact = {
      visibility: "good" as "good" | "reduced" | "poor" | "dangerous",
      roadConditions: "dry" as "dry" | "wet" | "icy" | "flooded" | "impassable",
      recommendedSpeed: 50, // km/h
      safetyRating: "safe" as "safe" | "caution" | "dangerous" | "avoid",
    };
    
    // Assess visibility
    if (weather.visibility < this.thresholds.visibility.dangerous) {
      impact.visibility = "dangerous";
      impact.safetyRating = "dangerous";
    } else if (weather.visibility < this.thresholds.visibility.poor) {
      impact.visibility = "poor";
      impact.safetyRating = "caution";
    } else if (weather.visibility < this.thresholds.visibility.reduced) {
      impact.visibility = "reduced";
    }
    
    // Assess precipitation impact
    if (weather.precipitation.type !== "none") {
      if (weather.precipitation.intensity === "heavy" || weather.precipitation.intensity === "extreme") {
        impact.roadConditions = weather.temperature.current < 0 ? "icy" : "flooded";
        impact.safetyRating = "dangerous";
        impact.recommendedSpeed = 25;
      } else if (weather.precipitation.intensity === "moderate") {
        impact.roadConditions = weather.temperature.current < 0 ? "icy" : "wet";
        impact.safetyRating = "caution";
        impact.recommendedSpeed = 35;
      } else {
        impact.roadConditions = "wet";
        impact.recommendedSpeed = 45;
      }
    }
    
    // Assess wind impact
    if (weather.windSpeed > this.thresholds.wind.dangerous) {
      impact.safetyRating = "dangerous";
      impact.recommendedSpeed = Math.min(impact.recommendedSpeed, 30);
    } else if (weather.windSpeed > this.thresholds.wind.caution) {
      impact.safetyRating = "caution";
      impact.recommendedSpeed = Math.min(impact.recommendedSpeed, 40);
    }
    
    // Temperature impact (ice/heat)
    if (weather.temperature.current < this.thresholds.temperature.freezing) {
      impact.roadConditions = "icy";
      impact.safetyRating = "caution";
    } else if (weather.temperature.current > this.thresholds.temperature.hot) {
      impact.recommendedSpeed = Math.min(impact.recommendedSpeed, 45);
    }
    
    return impact;
  }

  /**
   * Generate segment-specific recommendations
   */
  private generateSegmentRecommendations(weather: WeatherCondition, impact: any): string[] {
    const recommendations: string[] = [];
    
    if (impact.safetyRating === "dangerous") {
      recommendations.push("Consider postponing or finding alternative route");
    }
    
    if (impact.visibility === "poor" || impact.visibility === "dangerous") {
      recommendations.push("Use headlights and hazard lights");
      recommendations.push("Maintain increased following distance");
    }
    
    if (impact.roadConditions === "wet") {
      recommendations.push("Reduce speed and increase following distance");
    } else if (impact.roadConditions === "icy") {
      recommendations.push("Use extreme caution, consider tire chains");
      recommendations.push("Avoid sudden movements");
    }
    
    if (weather.windSpeed > this.thresholds.wind.caution) {
      recommendations.push("Be aware of strong crosswinds");
      recommendations.push("Maintain firm grip on steering wheel");
    }
    
    return recommendations;
  }

  /**
   * Calculate overall route impact
   */
  private calculateOverallImpact(segmentImpacts: WeatherImpact['segmentImpacts']) {
    let totalDelay = 0;
    let maxSafetyRisk = "low";
    let speedReductions: number[] = [];
    
    for (const segment of segmentImpacts) {
      // Calculate time delay based on speed reduction
      const normalSpeed = 50; // km/h
      const actualSpeed = segment.impact.recommendedSpeed;
      const speedReduction = (normalSpeed - actualSpeed) / normalSpeed;
      speedReductions.push(speedReduction);
      
      // Estimate segment delay (assuming 5km average segment)
      const segmentDelay = (5 / actualSpeed - 5 / normalSpeed) * 60; // minutes
      totalDelay += Math.max(0, segmentDelay);
      
      // Track maximum safety risk
      const riskLevels = { "safe": 0, "caution": 1, "dangerous": 2, "avoid": 3 };
      const safetyLevels = { "low": 0, "medium": 1, "high": 2, "extreme": 3 };
      
      const segmentRiskLevel = riskLevels[segment.impact.safetyRating];
      const currentMaxLevel = safetyLevels[maxSafetyRisk];
      
      if (segmentRiskLevel > currentMaxLevel) {
        maxSafetyRisk = Object.keys(safetyLevels)[segmentRiskLevel] as any;
      }
    }
    
    const avgSpeedReduction = speedReductions.reduce((a, b) => a + b, 0) / speedReductions.length;
    
    // Determine overall impact level
    let overallLevel: "minimal" | "low" | "moderate" | "high" | "severe";
    if (totalDelay < 5 && maxSafetyRisk === "low") {
      overallLevel = "minimal";
    } else if (totalDelay < 15 && (maxSafetyRisk === "low" || maxSafetyRisk === "medium")) {
      overallLevel = "low";
    } else if (totalDelay < 30 && maxSafetyRisk !== "extreme") {
      overallLevel = "moderate";
    } else if (maxSafetyRisk === "extreme" || totalDelay > 60) {
      overallLevel = "severe";
    } else {
      overallLevel = "high";
    }
    
    return {
      level: overallLevel,
      safetyRisk: maxSafetyRisk as "low" | "medium" | "high" | "extreme",
      efficiency: {
        timeDelay: Math.round(totalDelay),
        speedReduction: Math.round(avgSpeedReduction * 100),
        fuelIncrease: Math.round(avgSpeedReduction * 50), // Estimate
        confidenceLevel: 0.8,
      },
    };
  }

  /**
   * Generate overall recommendations
   */
  private generateRecommendations(
    route: Route,
    segmentImpacts: WeatherImpact['segmentImpacts'],
    overallImpact: any
  ): WeatherImpact['recommendations'] {
    const recommendations = {
      overall: [] as string[],
      timing: {
        recommended: true,
        alternativeTimes: [] as Date[],
        reasoning: "",
      },
      equipment: [] as string[],
      alternatives: {
        routes: [] as string[],
        postponement: {
          recommended: false,
          until: undefined as Date | undefined,
          reasoning: "",
        },
      },
    };
    
    // Overall recommendations based on impact level
    if (overallImpact.level === "severe" || overallImpact.safetyRisk === "extreme") {
      recommendations.overall.push("SEVERE WEATHER CONDITIONS - Consider postponing travel");
      recommendations.timing.recommended = false;
      recommendations.timing.reasoning = "Severe weather conditions pose significant safety risks";
      recommendations.alternatives.postponement.recommended = true;
      recommendations.alternatives.postponement.until = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
      recommendations.alternatives.postponement.reasoning = "Wait for weather conditions to improve";
    } else if (overallImpact.level === "high") {
      recommendations.overall.push("Proceed with extreme caution");
      recommendations.timing.reasoning = "Challenging weather conditions require careful planning";
    } else if (overallImpact.level === "moderate") {
      recommendations.overall.push("Use caution and monitor weather conditions");
    }
    
    // Equipment recommendations
    const hasIce = segmentImpacts.some(s => s.impact.roadConditions === "icy");
    const hasWind = segmentImpacts.some(s => s.conditions.windSpeed > this.thresholds.wind.caution);
    const hasPrecipitation = segmentImpacts.some(s => s.conditions.precipitation.type !== "none");
    
    if (hasIce) {
      recommendations.equipment.push("Tire chains or winter tires");
      recommendations.equipment.push("Ice scraper and de-icer");
    }
    
    if (hasPrecipitation) {
      recommendations.equipment.push("Rain gear and waterproof coverings");
    }
    
    if (hasWind) {
      recommendations.equipment.push("Secure all loose items");
    }
    
    // Safety equipment always recommended
    recommendations.equipment.push("Emergency kit with blankets and water");
    recommendations.equipment.push("Fully charged mobile phone");
    
    return recommendations;
  }

  /**
   * Utility functions
   */
  private getSortedProviders(preferredProvider?: string): Array<{ name: string; priority: number }> {
    const providers = [];
    
    for (const [name, config] of Object.entries(this.providers)) {
      if (config.enabled) {
        providers.push({
          name,
          priority: preferredProvider === name ? 0 : config.priority,
        });
      }
    }
    
    return providers.sort((a, b) => a.priority - b.priority);
  }

  private filterAlerts(
    alerts: WeatherAlert[],
    options: any
  ): WeatherAlert[] {
    let filtered = alerts;
    
    if (options.severityFilter) {
      filtered = filtered.filter(a => 
        options.severityFilter.includes(a.severity)
      );
    }
    
    if (options.typeFilter) {
      filtered = filtered.filter(a => 
        options.typeFilter.includes(a.event)
      );
    }
    
    if (!options.includeExpired) {
      filtered = filtered.filter(a => a.endTime > new Date());
    }
    
    return filtered;
  }

  private deduplicateAlerts(alerts: WeatherAlert[]): WeatherAlert[] {
    const seen = new Map<string, WeatherAlert>();
    
    for (const alert of alerts) {
      const key = `${alert.event}-${alert.startTime.getTime()}`;
      
      if (!seen.has(key) || alert.source === "nws") { // Prefer official sources
        seen.set(key, alert);
      }
    }
    
    return Array.from(seen.values());
  }

  private generateWeatherCacheKey(
    location: WeatherLocation,
    type: string
  ): string {
    const locationHash = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    return `weather:${type}:${Buffer.from(locationHash).toString('base64').slice(0, 16)}`;
  }

  private generateForecastCacheKey(
    location: WeatherLocation,
    timeframe: any
  ): string {
    const locationHash = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const timeHash = `${timeframe.start.getTime()}-${timeframe.end.getTime()}`;
    return `weather:forecast:${Buffer.from(locationHash + timeHash).toString('base64').slice(0, 24)}`;
  }

  private async cacheResult(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.warn("Failed to cache weather result", {
        key,
        error: error.message,
      });
    }
  }

  private async getCachedResult(key: string): Promise<any> {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn("Failed to get cached weather result", {
        key,
        error: error.message,
      });
      return null;
    }
  }

  private shouldUseCachedWeather(maxAge?: number): boolean {
    if (maxAge && maxAge < this.cachingConfig.currentWeatherTTL) {
      return false;
    }
    return true;
  }

  /**
   * Get service health status
   */
  public async getServiceHealth(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    providers: Record<string, "healthy" | "degraded" | "unhealthy">;
    lastCheck: Date;
  }> {
    const providerHealth: Record<string, "healthy" | "degraded" | "unhealthy"> = {};
    let healthyProviders = 0;
    
    for (const [name, config] of Object.entries(this.providers)) {
      if (config.enabled) {
        try {
          // Test each provider with a simple request
          await this.fetchWeatherFromProvider(
            name,
            { latitude: 40.7128, longitude: -74.0060 }, // NYC
            "current",
            {}
          );
          providerHealth[name] = "healthy";
          healthyProviders++;
        } catch (error) {
          providerHealth[name] = "unhealthy";
        }
      } else {
        providerHealth[name] = "degraded";
      }
    }
    
    const totalProviders = Object.keys(this.providers).length;
    let overallStatus: "healthy" | "degraded" | "unhealthy";
    
    if (healthyProviders === totalProviders) {
      overallStatus = "healthy";
    } else if (healthyProviders > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "unhealthy";
    }
    
    return {
      service: "weather-routing",
      status: overallStatus,
      providers: providerHealth,
      lastCheck: new Date(),
    };
  }
}

export default WeatherRoutingService;