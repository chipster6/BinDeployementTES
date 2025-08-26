/**
 * Service Wiring - Composition Root
 * 
 * Configures dependency injection for services to break circular dependencies.
 * This is the only place where concrete implementations are wired together.
 */

import { jobQueue } from "./jobQueue";
import { ExternalServicesAdapter } from "./external/ExternalServicesAdapter";
import { ErrorMonitoringService } from './ErrorMonitoringService';
import { ErrorOrchestrationService } from './ErrorOrchestrationService';
import { makeSequelize } from "@/config/database.runtime";
import { makeDbMetrics } from "@/database/db-metrics.impl";
import { DatabasePerformanceMonitor } from "@/database/performance-monitor";
import { config } from "@/config";
import type { Sequelize } from "sequelize";

// Service singletons
let errorMonitoringService: ErrorMonitoringService | null = null;
let errorOrchestrationService: ErrorOrchestrationService | null = null;
let sequelizeInstance: Sequelize | null = null;
let databasePerformanceMonitor: DatabasePerformanceMonitor | null = null;

/**
 * Wire all service dependencies
 * Call this during app startup after service construction
 */
export function wireServices(): void {
  // Initialize database instance
  sequelizeInstance = makeSequelize(config);
  
  // Initialize database metrics port
  const dbMetrics = makeDbMetrics(sequelizeInstance);
  
  // Initialize performance monitor with metrics port
  databasePerformanceMonitor = DatabasePerformanceMonitor.getInstance(dbMetrics);
  
  // Break ExternalServicesManager ↔ jobQueue cycle
  jobQueue.setExternalServicesHandler(new ExternalServicesAdapter());
  
  // Break ErrorMonitoring ↔ ErrorOrchestration cycle
  errorMonitoringService = new ErrorMonitoringService();
  errorOrchestrationService = new ErrorOrchestrationService(errorMonitoringService);
}

/**
 * Get wired service instances
 */
export function getSequelizeInstance(): Sequelize {
  if (!sequelizeInstance) {
    throw new Error('Services not wired - call wireServices() first');
  }
  return sequelizeInstance;
}

export function getDatabasePerformanceMonitor(): DatabasePerformanceMonitor {
  if (!databasePerformanceMonitor) {
    throw new Error('Services not wired - call wireServices() first');
  }
  return databasePerformanceMonitor;
}

export function getErrorMonitoringService(): ErrorMonitoringService {
  if (!errorMonitoringService) {
    throw new Error('Services not wired - call wireServices() first');
  }
  return errorMonitoringService;
}

export function getErrorOrchestrationService(): ErrorOrchestrationService {
  if (!errorOrchestrationService) {
    throw new Error('Services not wired - call wireServices() first');
  }
  return errorOrchestrationService;
}

/**
 * Initialize services with proper wiring
 */
export async function initializeServices(): Promise<void> {
  // Wire dependencies first
  wireServices();
  
  // Then initialize services
  await jobQueue.initialize();
}