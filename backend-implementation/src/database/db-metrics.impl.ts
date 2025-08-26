/**
 * Database metrics implementation
 */

import type { Sequelize } from 'sequelize';
import type { DbMetricsPort } from './ports/DbMetricsPort';

export function makeDbMetrics(db: Sequelize): DbMetricsPort {
  return {
    async getPoolStats() {
      // Get connection pool stats from Sequelize
      const pool = (db as any).connectionManager?.pool;
      
      return {
        idle: pool?.idle?.length || 0,
        active: pool?.used?.length || 0,
        waiting: pool?.pending?.length || 0,
        total: pool?.size || 0,
      };
    },

    async getConnectionHealth() {
      const start = Date.now();
      
      try {
        await db.authenticate();
        const responseTime = Date.now() - start;
        
        return {
          healthy: true,
          responseTime,
          lastCheck: new Date(),
        };
      } catch (error) {
        return {
          healthy: false,
          responseTime: Date.now() - start,
          lastCheck: new Date(),
        };
      }
    }
  };
}