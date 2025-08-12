/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DRIVER TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { Driver } from '@/models/Driver';

export interface DriverTestData {
  userId?: string;
  licenseNumber?: string;
  licenseClass?: string;
  organizationId?: string;
  isActive?: boolean;
}

export class DriverFixtures {
  private counter = 1;

  public getDriverData(overrides: DriverTestData = {}): any {
    const index = this.counter++;
    return {
      userId: overrides.userId || this.generateUUID(),
      licenseNumber: overrides.licenseNumber || `DL${String(index).padStart(8, '0')}`,
      licenseClass: overrides.licenseClass || 'CDL-A',
      organizationId: overrides.organizationId || this.generateUUID(),
      isActive: overrides.isActive ?? true,
    };
  }

  public async createDriver(driverData: DriverTestData = {}, transaction?: Transaction): Promise<Driver> {
    const data = this.getDriverData(driverData);
    return await Driver.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await Driver.destroy({ where: {}, force: true, transaction });
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

export default DriverFixtures;