/**
 * Job Queue Port - Dependency Inversion Interface
 * 
 * Breaks circular dependency between ExternalServicesManager and jobQueue
 * by providing an abstraction that services can depend on.
 */

export interface JobQueuePort {
  /**
   * Enqueue a job with topic and payload
   */
  enqueue(topic: string, payload: unknown): Promise<void>;
  
  /**
   * Subscribe to queue events
   */
  on(event: string, handler: (msg: unknown) => void): void;
  
  /**
   * Get queue statistics
   */
  getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>;
}

export interface JobQueueHandler {
  /**
   * Handle job completion
   */
  onJobCompleted(jobId: string, result: unknown): Promise<void>;
  
  /**
   * Handle job failure
   */
  onJobFailed(jobId: string, error: Error): Promise<void>;
}