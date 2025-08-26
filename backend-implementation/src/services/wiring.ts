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

// Service singletons
let errorMonitoringService: ErrorMonitoringService | null = null;
let errorOrchestrationService: ErrorOrchestrationService | null = null;

/**
 * Wire all service dependencies
 * Call this during app startup after service construction
 */
export function wireServices(): void {
  // Break ExternalServicesManager ↔ jobQueue cycle
  jobQueue.setExternalServicesHandler(new ExternalServicesAdapter());
  
  // Break ErrorMonitoring ↔ ErrorOrchestration cycle
  errorMonitoringService = new ErrorMonitoringService();
  errorOrchestrationService = new ErrorOrchestrationService(errorMonitoringService);
}

/**
 * Get wired service instances
 */
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