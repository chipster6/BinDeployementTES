"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleFixtures = void 0;
const Vehicle_1 = require("@/models/Vehicle");
class VehicleFixtures {
    constructor() {
        this.counter = 1;
    }
    getVehicleData(overrides = {}) {
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
    async createVehicle(vehicleData = {}, transaction) {
        const data = this.getVehicleData(vehicleData);
        return await Vehicle_1.Vehicle.create(data, { transaction });
    }
    async cleanup(transaction) {
        await Vehicle_1.Vehicle.destroy({ where: {}, force: true, transaction });
    }
    resetCounter() { this.counter = 1; }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.VehicleFixtures = VehicleFixtures;
exports.default = VehicleFixtures;
//# sourceMappingURL=VehicleFixtures.js.map