/**
 * External Services Handler Port - Dependency Inversion Interface
 * 
 * Breaks circular dependency between jobQueue and ExternalServicesManager
 * by providing callback interfaces that jobQueue can use without importing
 * the concrete manager.
 */

export interface ExternalServicesHandler {
  /**
   * Handle job completion for external services
   */
  handleJobCompletion(jobId: string, jobType: string, result: unknown): Promise<void>;
  
  /**
   * Handle job failure for external services
   */
  handleJobFailure(jobId: string, jobType: string, error: Error): Promise<void>;
  
  /**
   * Handle service health updates
   */
  handleServiceHealthUpdate(serviceName: string, health: ServiceHealthStatus): Promise<void>;
  
  /**
   * Handle webhook processing completion
   */
  handleWebhookProcessed(webhookId: string, result: WebhookProcessingResult): Promise<void>;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  errorRate?: number;
  details?: Record<string, unknown>;
}

export interface WebhookProcessingResult {
  success: boolean;
  processedAt: Date;
  duration: number;
  error?: string;
  metadata?: Record<string, unknown>;
}