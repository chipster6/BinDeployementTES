"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverFixtures = void 0;
const Driver_1 = require("@/models/Driver");
class DriverFixtures {
    constructor() {
        this.counter = 1;
    }
    getDriverData(overrides = {}) {
        const index = this.counter++;
        return {
            userId: overrides.userId || this.generateUUID(),
            licenseNumber: overrides.licenseNumber || `DL${String(index).padStart(8, '0')}`,
            licenseClass: overrides.licenseClass || 'CDL-A',
            organizationId: overrides.organizationId || this.generateUUID(),
            isActive: overrides.isActive ?? true,
        };
    }
    async createDriver(driverData = {}, transaction) {
        const data = this.getDriverData(driverData);
        return await Driver_1.Driver.create(data, { transaction });
    }
    async cleanup(transaction) {
        await Driver_1.Driver.destroy({ where: {}, force: true, transaction });
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
exports.DriverFixtures = DriverFixtures;
exports.default = DriverFixtures;
//# sourceMappingURL=DriverFixtures.js.map