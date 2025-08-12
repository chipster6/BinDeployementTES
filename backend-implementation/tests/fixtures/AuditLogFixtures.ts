/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUDIT LOG TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { AuditLog } from '@/models/AuditLog';

export interface AuditLogTestData {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  metadata?: any;
}

export class AuditLogFixtures {
  private counter = 1;

  public getAuditLogData(overrides: AuditLogTestData = {}): any {
    const index = this.counter++;
    return {
      userId: overrides.userId || this.generateUUID(),
      action: overrides.action || 'test_action',
      entityType: overrides.entityType || 'TestEntity',
      entityId: overrides.entityId || this.generateUUID(),
      changes: overrides.changes || { field: `test_change_${index}` },
      metadata: overrides.metadata || { test: true, index },
    };
  }

  public async createAuditLog(logData: AuditLogTestData = {}, transaction?: Transaction): Promise<AuditLog> {
    const data = this.getAuditLogData(logData);
    return await AuditLog.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await AuditLog.destroy({ where: {}, force: true, transaction });
  }

  public resetCounter(): void { this.counter = 1; }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default AuditLogFixtures;