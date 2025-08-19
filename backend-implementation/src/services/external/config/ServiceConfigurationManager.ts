/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SERVICE CONFIGURATION MANAGER
 * ============================================================================
 *
 * Dedicated service for managing external service configurations.
 * Extracted from ExternalServicesManager for better separation of concerns.
 *
 * Responsibilities:
 * - Load and validate service configurations
 * - Manage environment variable access
 * - Handle configuration security and encryption
 * - Configuration validation and defaults
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-18
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";

/**
 * Service configuration interface
 */
export interface ServiceConfiguration {
  enabled: boolean;
  priority: number; // 1-10, higher is more critical
  fallbackEnabled: boolean;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  config: Record<string, any>;
}

/**
 * Configuration loader interface
 */
interface ConfigurationLoader {
  loadConfiguration(serviceName: string): Promise<ServiceConfiguration>;
  validateConfiguration(config: ServiceConfiguration): boolean;
}

/**
 * Service configuration definitions
 */
const SERVICE_DEFINITIONS = {
  stripe: {
    priority: 10,
    fallbackEnabled: false,
    requiredEnvVars: ['STRIPE_SECRET_KEY'],
    optionalEnvVars: ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  twilio: {
    priority: 8,
    fallbackEnabled: true,
    requiredEnvVars: ['TWILIO_ACCOUNT_SID'],
    optionalEnvVars: ['TWILIO_AUTH_TOKEN', 'TWILIO_WEBHOOK_AUTH_TOKEN'],
  },
  sendgrid: {
    priority: 7,
    fallbackEnabled: true,
    requiredEnvVars: ['SENDGRID_API_KEY'],
    optionalEnvVars: ['SENDGRID_WEBHOOK_KEY'],
  },
  samsara: {
    priority: 9,
    fallbackEnabled: false,
    requiredEnvVars: ['SAMSARA_API_TOKEN'],
    optionalEnvVars: ['SAMSARA_ORGANIZATION_ID', 'SAMSARA_WEBHOOK_SECRET'],
  },
  airtable: {
    priority: 5,
    fallbackEnabled: true,
    requiredEnvVars: ['AIRTABLE_PERSONAL_ACCESS_TOKEN'],
    optionalEnvVars: ['AIRTABLE_WEBHOOK_SECRET'],
  },
  maps: {
    priority: 8,
    fallbackEnabled: true,
    requiredEnvVars: [],
    optionalEnvVars: ['MAPBOX_ACCESS_TOKEN', 'GOOGLE_MAPS_API_KEY'],
    customValidation: (config: any) => !!(config.mapboxAccessToken || config.googleMapsApiKey),
  },
  // Security services
  threat_intelligence: {
    priority: 9,
    fallbackEnabled: false,
    requiredEnvVars: [],
    optionalEnvVars: [],
  },
  ip_reputation: {
    priority: 9,
    fallbackEnabled: false,
    requiredEnvVars: [],
    optionalEnvVars: [],
  },
  virustotal: {
    priority: 7,
    fallbackEnabled: true,
    requiredEnvVars: [],
    optionalEnvVars: ['VIRUSTOTAL_API_KEY'],
  },
  abuseipdb: {
    priority: 7,
    fallbackEnabled: true,
    requiredEnvVars: [],
    optionalEnvVars: ['ABUSEIPDB_API_KEY'],
  },
  misp: {
    priority: 6,
    fallbackEnabled: true,
    requiredEnvVars: [],
    optionalEnvVars: ['MISP_URL', 'MISP_API_KEY'],
    customValidation: (config: any) => !!(config.url && config.apiKey),
  },
} as const;

/**
 * Service Configuration Manager
 */
export class ServiceConfigurationManager implements ConfigurationLoader {
  private configurations: Map<string, ServiceConfiguration> = new Map();
  private isLoaded: boolean = false;

  /**
   * Load all service configurations
   */
  public async loadAllConfigurations(): Promise<Map<string, ServiceConfiguration>> {
    if (this.isLoaded) {
      return this.configurations;
    }

    const loadPromises = Object.keys(SERVICE_DEFINITIONS).map(serviceName =>
      this.loadConfiguration(serviceName)
    );

    const configurations = await Promise.all(loadPromises);
    
    Object.keys(SERVICE_DEFINITIONS).forEach((serviceName, index) => {
      this.configurations.set(serviceName, configurations[index]);
    });

    this.isLoaded = true;

    logger.info("Service configurations loaded", {
      totalConfigs: this.configurations.size,
      enabledServices: Array.from(this.configurations.entries()).filter(
        ([_, config]) => config.enabled,
      ).length,
    });

    return this.configurations;
  }

  /**
   * Load configuration for a specific service
   */
  public async loadConfiguration(serviceName: string): Promise<ServiceConfiguration> {
    const definition = SERVICE_DEFINITIONS[serviceName as keyof typeof SERVICE_DEFINITIONS];
    
    if (!definition) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const config = await this.buildServiceConfig(serviceName, definition);
    const isValid = this.validateConfiguration(config);

    if (!isValid) {
      logger.warn(`Configuration validation failed for ${serviceName}`, {
        config: this.sanitizeConfigForLogging(config),
      });
    }

    return config;
  }

  /**
   * Build service configuration from environment and defaults
   */
  private async buildServiceConfig(
    serviceName: string,
    definition: any
  ): Promise<ServiceConfiguration> {
    const config: Record<string, any> = {};

    // Load required environment variables
    const missingRequired: string[] = [];
    for (const envVar of definition.requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        config[this.envVarToConfigKey(envVar)] = value;
      } else {
        missingRequired.push(envVar);
      }
    }

    // Load optional environment variables
    for (const envVar of definition.optionalEnvVars) {
      const value = process.env[envVar];
      if (value) {
        config[this.envVarToConfigKey(envVar)] = value;
      }
    }

    // Add service-specific defaults
    this.addServiceDefaults(serviceName, config);

    // Determine if service is enabled
    const enabled = missingRequired.length === 0 && (
      !definition.customValidation || definition.customValidation(config)
    );

    return {
      enabled,
      priority: definition.priority,
      fallbackEnabled: definition.fallbackEnabled,
      monitoringEnabled: true,
      alertingEnabled: definition.priority >= 7, // Alert for high priority services
      config,
    };
  }

  /**
   * Convert environment variable name to config key
   */
  private envVarToConfigKey(envVar: string): string {
    return envVar.toLowerCase()
      .replace(/^[a-z]+_/, '') // Remove service prefix (e.g., STRIPE_)
      .replace(/_(.)/g, (_, letter) => letter.toUpperCase()); // Convert to camelCase
  }

  /**
   * Add service-specific default configurations
   */
  private addServiceDefaults(serviceName: string, config: Record<string, any>): void {
    switch (serviceName) {
      case 'sendgrid':
        config.defaultFromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@wastemanagement.com';
        config.defaultFromName = process.env.DEFAULT_FROM_NAME || 'Waste Management System';
        break;
      
      case 'maps':
        config.provider = process.env.MAPS_PROVIDER || 'mapbox';
        break;
      
      // Add other service-specific defaults as needed
    }
  }

  /**
   * Validate service configuration
   */
  public validateConfiguration(config: ServiceConfiguration): boolean {
    // Basic validation
    if (typeof config.enabled !== 'boolean') return false;
    if (typeof config.priority !== 'number' || config.priority < 1 || config.priority > 10) return false;
    if (typeof config.fallbackEnabled !== 'boolean') return false;
    if (typeof config.monitoringEnabled !== 'boolean') return false;
    if (typeof config.alertingEnabled !== 'boolean') return false;
    if (!config.config || typeof config.config !== 'object') return false;

    return true;
  }

  /**
   * Get configuration for specific service
   */
  public getConfiguration(serviceName: string): ServiceConfiguration | null {
    return this.configurations.get(serviceName) || null;
  }

  /**
   * Update configuration for a service
   */
  public updateConfiguration(serviceName: string, updates: Partial<ServiceConfiguration>): void {
    const current = this.configurations.get(serviceName);
    if (current) {
      const updated = { ...current, ...updates };
      if (this.validateConfiguration(updated)) {
        this.configurations.set(serviceName, updated);
        logger.info(`Configuration updated for ${serviceName}`);
      } else {
        throw new Error(`Invalid configuration update for ${serviceName}`);
      }
    } else {
      throw new Error(`Service ${serviceName} not found`);
    }
  }

  /**
   * Get all enabled service names
   */
  public getEnabledServices(): string[] {
    return Array.from(this.configurations.entries())
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name);
  }

  /**
   * Get services by priority level
   */
  public getServicesByPriority(minPriority: number): string[] {
    return Array.from(this.configurations.entries())
      .filter(([_, config]) => config.enabled && config.priority >= minPriority)
      .sort(([, a], [, b]) => b.priority - a.priority)
      .map(([name]) => name);
  }

  /**
   * Sanitize configuration for logging (remove sensitive data)
   */
  private sanitizeConfigForLogging(config: ServiceConfiguration): any {
    const sanitized = { ...config };
    const sensitiveKeys = ['secretKey', 'apiKey', 'authToken', 'webhookSecret'];
    
    for (const key of sensitiveKeys) {
      if (sanitized.config[key]) {
        sanitized.config[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Clear all configurations (for testing)
   */
  public clear(): void {
    this.configurations.clear();
    this.isLoaded = false;
  }
}

// Singleton instance
export const serviceConfigurationManager = new ServiceConfigurationManager();
export default ServiceConfigurationManager;