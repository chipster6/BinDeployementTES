/**
 * External Services Handler Port - Dependency Inversion Interface
 * 
 * Breaks circular dependency between jobQueue and ExternalServicesManager
 * by providing callback interfaces that jobQueue can use without importing
 * the concrete manager.
 */

export type WebhookProcessedMeta = {
  serviceName: string;
  processingResult: unknown;
  backgroundProcessed: boolean;
};

export interface ExternalServicesHandler {
  /**
   * Handle webhook processing completion
   */
  handleWebhookProcessed(eventId: string, meta: WebhookProcessedMeta): Promise<void>;
  
  /**
   * Get coordination data for frontend
   */
  getFrontendCoordinationData(): Promise<{
    services: Array<{ name: string; status: string }>;
    health: "healthy" | "degraded";
    timestamp: Date;
  }>;
  
  /**
   * Trigger cost optimization (optional)
   */
  triggerCostOptimization?(input: unknown): Promise<{ success: boolean; details?: unknown }>;
}