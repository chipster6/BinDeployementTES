/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BIN TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { Bin } from '@/models/Bin';

export interface BinTestData {
  serialNumber?: string;
  type?: string;
  size?: number;
  customerId?: string;
  organizationId?: string;
  location?: any;
  isActive?: boolean;
}

export class BinFixtures {
  private counter = 1;

  public getBinData(overrides: BinTestData = {}): any {
    const index = this.counter++;
    return {
      serialNumber: overrides.serialNumber || `BIN-${String(index).padStart(6, '0')}`,
      type: overrides.type || 'standard',
      size: overrides.size || 32,
      customerId: overrides.customerId || this.generateUUID(),
      organizationId: overrides.organizationId || this.generateUUID(),
      location: overrides.location || {
        type: 'Point',
        coordinates: [-122.4194 + (Math.random() * 0.1), 37.7749 + (Math.random() * 0.1)]
      },
      isActive: overrides.isActive ?? true,
    };
  }

  public async createBin(binData: BinTestData = {}, transaction?: Transaction): Promise<Bin> {
    const data = this.getBinData(binData);
    return await Bin.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await Bin.destroy({ where: {}, force: true, transaction });
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

export default BinFixtures;