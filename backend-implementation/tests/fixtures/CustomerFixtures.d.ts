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
export declare class CustomerFixtures {
    private counter;
    getCustomerData(overrides?: CustomerTestData): any;
    createCustomer(customerData?: CustomerTestData, transaction?: Transaction): Promise<Customer>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default CustomerFixtures;
//# sourceMappingURL=CustomerFixtures.d.ts.map