/**
 * Service Wiring - Composition Root
 * 
 * Configures dependency injection for services to break circular dependencies.
 * This is the only place where concrete implementations are wired together.
 */

import { jobQueue } from "./jobQueue";
import { ExternalServicesAdapter } from "./external/ExternalServicesAdapter";

/**
 * Wire all service dependencies
 * Call this during app startup after service construction
 */
export function wireServices(): void {
  // Break ExternalServicesManager ↔ jobQueue cycle
  jobQueue.setExternalServicesHandler(new ExternalServicesAdapter());
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