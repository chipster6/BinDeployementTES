import { Transaction } from 'sequelize';
import { Driver } from '@/models/Driver';
export interface DriverTestData {
    userId?: string;
    licenseNumber?: string;
    licenseClass?: string;
    organizationId?: string;
    isActive?: boolean;
}
export declare class DriverFixtures {
    private counter;
    getDriverData(overrides?: DriverTestData): any;
    createDriver(driverData?: DriverTestData, transaction?: Transaction): Promise<Driver>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default DriverFixtures;
//# sourceMappingURL=DriverFixtures.d.ts.map