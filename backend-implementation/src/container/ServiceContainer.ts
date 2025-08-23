/**
 * ============================================================================
 * SERVICE CONTAINER - DEPENDENCY INJECTION CONFIGURATION
 * ============================================================================
 *
 * Dependency injection container for AI Error Prediction decomposed services.
 * Implements Hub Authority requirements for dependency injection and service
 * lifecycle management.
 *
 * Hub Authority Requirements:
 * - Constructor dependency injection
 * - Service lifecycle management
 * - Interface-based dependency resolution
 * - Singleton service instances
 */

import { ErrorPredictionEngineService } from "../services/ai/ErrorPredictionEngineService";
import { MLModelManagementService } from "../services/ai/MLModelManagementService";
import { ErrorAnalyticsService } from "../services/ai/ErrorAnalyticsService";
import { ErrorCoordinationService } from "../services/ai/ErrorCoordinationService";

import type { IErrorPredictionEngine } from "../interfaces/ai/IErrorPredictionEngine";
import type { IMLModelManager } from "../interfaces/ai/IMLModelManager";
import type { IErrorAnalytics } from "../interfaces/ai/IErrorAnalytics";
import type { IErrorCoordination } from "../interfaces/ai/IErrorCoordination";

import { logger } from "@/utils/logger";

/**
 * Service container for dependency injection
 * Hub Authority Compliant: Interface-based service resolution
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of service container
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize all services with proper dependency injection
   * Hub Requirement: Constructor dependency injection
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info("Initializing service container with dependency injection");

      // Initialize services in dependency order

      // 1. ML Model Management Service (no dependencies)
      const mlModelManager = new MLModelManagementService();
      this.services.set("IMLModelManager", mlModelManager);
      this.services.set("MLModelManagementService", mlModelManager);

      // 2. Error Prediction Engine Service (depends on MLModelManager)
      const errorPredictionEngine = new ErrorPredictionEngineService(mlModelManager);
      this.services.set("IErrorPredictionEngine", errorPredictionEngine);
      this.services.set("ErrorPredictionEngineService", errorPredictionEngine);

      // 3. Error Analytics Service (no direct dependencies)
      const errorAnalytics = new ErrorAnalyticsService();
      this.services.set("IErrorAnalytics", errorAnalytics);
      this.services.set("ErrorAnalyticsService", errorAnalytics);

      // 4. Error Coordination Service (no direct dependencies)
      const errorCoordination = new ErrorCoordinationService();
      this.services.set("IErrorCoordination", errorCoordination);
      this.services.set("ErrorCoordinationService", errorCoordination);

      this.initialized = true;

      logger.info("Service container initialized successfully", {
        servicesRegistered: this.services.size,
        services: Array.from(this.services.keys()),
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Failed to initialize service container", {
        error: errorMessage,
      });
      throw new Error(`Service container initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Get service by interface or class name
   * Hub Requirement: Interface-based dependency resolution
   */
  public get<T>(serviceKey: string): T {
    if (!this.initialized) {
      throw new Error("Service container not initialized. Call initialize() first.");
    }

    const service = this.services.get(serviceKey);
    if (!service) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    return service as T;
  }

  /**
   * Get Error Prediction Engine Service
   * Hub Requirement: Type-safe service resolution
   */
  public getErrorPredictionEngine(): IErrorPredictionEngine {
    return this.get<IErrorPredictionEngine>("IErrorPredictionEngine");
  }

  /**
   * Get ML Model Manager Service
   * Hub Requirement: Type-safe service resolution
   */
  public getMLModelManager(): IMLModelManager {
    return this.get<IMLModelManager>("IMLModelManager");
  }

  /**
   * Get Error Analytics Service
   * Hub Requirement: Type-safe service resolution
   */
  public getErrorAnalytics(): IErrorAnalytics {
    return this.get<IErrorAnalytics>("IErrorAnalytics");
  }

  /**
   * Get Error Coordination Service
   * Hub Requirement: Type-safe service resolution
   */
  public getErrorCoordination(): IErrorCoordination {
    return this.get<IErrorCoordination>("IErrorCoordination");
  }

  /**
   * Check if service container is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service registry for debugging
   */
  public getServiceRegistry(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Shutdown services gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info("Shutting down service container");

      // Perform any cleanup needed for services
      // (In a real implementation, services might need cleanup)

      this.services.clear();
      this.initialized = false;

      logger.info("Service container shutdown completed");

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Error during service container shutdown", {
        error: errorMessage,
      });
    }
  }
}

// Export singleton instance for convenience
export const serviceContainer = ServiceContainer.getInstance();

// Export type-safe service getters for use in controllers
export const getErrorPredictionEngine = (): IErrorPredictionEngine => 
  serviceContainer.getErrorPredictionEngine();

export const getMLModelManager = (): IMLModelManager => 
  serviceContainer.getMLModelManager();

export const getErrorAnalytics = (): IErrorAnalytics => 
  serviceContainer.getErrorAnalytics();

export const getErrorCoordination = (): IErrorCoordination => 
  serviceContainer.getErrorCoordination();

export default ServiceContainer;