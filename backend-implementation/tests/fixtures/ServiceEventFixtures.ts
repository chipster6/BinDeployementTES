/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SERVICE EVENT TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { ServiceEvent } from '@/models/ServiceEvent';

export interface ServiceEventTestData {
  type?: string;
  binId?: string;
  routeId?: string;
  customerId?: string;
  status?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}

export class ServiceEventFixtures {
  private counter = 1;

  public getServiceEventData(overrides: ServiceEventTestData = {}): any {
    const index = this.counter++;
    return {
      type: overrides.type || 'pickup',
      binId: overrides.binId || this.generateUUID(),
      routeId: overrides.routeId || this.generateUUID(),
      customerId: overrides.customerId || this.generateUUID(),
      status: overrides.status || 'scheduled',
      scheduledAt: overrides.scheduledAt || new Date(),
      completedAt: overrides.completedAt || null,
    };
  }

  public async createServiceEvent(eventData: ServiceEventTestData = {}, transaction?: Transaction): Promise<ServiceEvent> {
    const data = this.getServiceEventData(eventData);
    return await ServiceEvent.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await ServiceEvent.destroy({ where: {}, force: true, transaction });
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

export default ServiceEventFixtures;