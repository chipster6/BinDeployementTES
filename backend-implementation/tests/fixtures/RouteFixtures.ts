/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ROUTE TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { Route } from '@/models/Route';

export interface RouteTestData {
  name?: string;
  driverId?: string;
  vehicleId?: string;
  organizationId?: string;
  binIds?: string[];
  scheduledDate?: Date;
  status?: string;
}

export class RouteFixtures {
  private counter = 1;

  public getRouteData(overrides: RouteTestData = {}): any {
    const index = this.counter++;
    return {
      name: overrides.name || `Test Route ${index}`,
      driverId: overrides.driverId || this.generateUUID(),
      vehicleId: overrides.vehicleId || this.generateUUID(),
      organizationId: overrides.organizationId || this.generateUUID(),
      binIds: overrides.binIds || [this.generateUUID(), this.generateUUID()],
      scheduledDate: overrides.scheduledDate || new Date(),
      status: overrides.status || 'planned',
    };
  }

  public async createRoute(routeData: RouteTestData = {}, transaction?: Transaction): Promise<Route> {
    const data = this.getRouteData(routeData);
    return await Route.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await Route.destroy({ where: {}, force: true, transaction });
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

export default RouteFixtures;