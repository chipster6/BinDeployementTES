/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CUSTOMER TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { Customer } from '@/models/Customer';

export interface CustomerTestData {
  name?: string;
  type?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  organizationId?: string;
  primaryContactId?: string;
  isActive?: boolean;
}

export class CustomerFixtures {
  private counter = 1;

  public getCustomerData(overrides: CustomerTestData = {}): any {
    const index = this.counter++;
    return {
      name: overrides.name || `Test Customer ${index}`,
      type: overrides.type || 'residential',
      contactEmail: overrides.contactEmail || `customer${index}@example.com`,
      contactPhone: overrides.contactPhone || `+1555456${String(index).padStart(4, '0')}`,
      address: overrides.address || `${200 + index} Customer St, Test City, TS 12345`,
      organizationId: overrides.organizationId || this.generateUUID(),
      primaryContactId: overrides.primaryContactId || this.generateUUID(),
      isActive: overrides.isActive ?? true,
    };
  }

  public async createCustomer(customerData: CustomerTestData = {}, transaction?: Transaction): Promise<Customer> {
    const data = this.getCustomerData(customerData);
    return await Customer.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await Customer.destroy({ where: {}, force: true, transaction });
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

export default CustomerFixtures;