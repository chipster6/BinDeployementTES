/**
 * Database metrics port to break circular dependencies
 */

export interface DbMetricsPort {
  getPoolStats(): Promise<{
    idle: number;
    active: number;
    waiting: number;
    total: number;
  }>;
  
  getConnectionHealth(): Promise<{
    healthy: boolean;
    responseTime: number;
    lastCheck: Date;
  }>;
}