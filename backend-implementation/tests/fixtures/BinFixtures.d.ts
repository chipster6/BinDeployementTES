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
export declare class BinFixtures {
    private counter;
    getBinData(overrides?: BinTestData): any;
    createBin(binData?: BinTestData, transaction?: Transaction): Promise<Bin>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default BinFixtures;
//# sourceMappingURL=BinFixtures.d.ts.map