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
export declare class VehicleFixtures {
    private counter;
    getVehicleData(overrides?: VehicleTestData): any;
    createVehicle(vehicleData?: VehicleTestData, transaction?: Transaction): Promise<Vehicle>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default VehicleFixtures;
//# sourceMappingURL=VehicleFixtures.d.ts.map