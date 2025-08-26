/**
 * External Services Adapter - Implementation of ExternalServicesHandler Port
 * 
 * This adapter implements the ExternalServicesHandler interface and delegates
 * to the concrete ExternalServicesManager, breaking the circular dependency
 * while maintaining full functionality.
 */

import type { ExternalServicesHandler, WebhookProcessedMeta } from "../ports/ExternalServicesHandler";
import { externalServicesManager } from "./ExternalServicesManager";

export class ExternalServicesAdapter implements ExternalServicesHandler {
  /**
   * Handle webhook processing completion
   */
  async handleWebhookProcessed(eventId: string, meta: WebhookProcessedMeta): Promise<void> {
    await externalServicesManager.broadcastCoordinationEvent({
      eventType: "webhook_received",
      serviceName: meta.serviceName,
      data: { 
        eventId, 
        processingResult: meta.processingResult, 
        backgroundProcessed: meta.backgroundProcessed 
      },
      timestamp: new Date(),
      severity: (meta.processingResult as any)?.success ? "info" : "warning",
    });
  }

  /**
   * Get coordination data for frontend
   */
  async getFrontendCoordinationData(): Promise<{
    services: Array<{ name: string; status: string }>;
    health: "healthy" | "degraded";
    timestamp: Date;
  }> {
    return externalServicesManager.getFrontendCoordinationData();
  }

  /**
   * Trigger cost optimization
   */
  async triggerCostOptimization(input: unknown): Promise<{ success: boolean; details?: unknown }> {
    return externalServicesManager.triggerCostOptimization?.(input) ?? { success: false };
  }
}