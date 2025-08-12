/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - VEHICLE TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { Vehicle } from '@/models/Vehicle';

export interface VehicleTestData {
  licensePlate?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  organizationId?: string;
  isActive?: boolean;
}

export class VehicleFixtures {
  private counter = 1;

  public getVehicleData(overrides: VehicleTestData = {}): any {
    const index = this.counter++;
    return {
      licensePlate: overrides.licensePlate || `TEST-${String(index).padStart(3, '0')}`,
      type: overrides.type || 'truck',
      make: overrides.make || 'TestMake',
      model: overrides.model || `TestModel${index}`,
      year: overrides.year || 2023,
      organizationId: overrides.organizationId || this.generateUUID(),
      isActive: overrides.isActive ?? true,
    };
  }

  public async createVehicle(vehicleData: VehicleTestData = {}, transaction?: Transaction): Promise<Vehicle> {
    const data = this.getVehicleData(vehicleData);
    return await Vehicle.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await Vehicle.destroy({ where: {}, force: true, transaction });
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

export default VehicleFixtures;