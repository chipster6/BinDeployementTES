"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinFixtures = void 0;
const Bin_1 = require("@/models/Bin");
class BinFixtures {
    constructor() {
        this.counter = 1;
    }
    getBinData(overrides = {}) {
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
    async createBin(binData = {}, transaction) {
        const data = this.getBinData(binData);
        return await Bin_1.Bin.create(data, { transaction });
    }
    async cleanup(transaction) {
        await Bin_1.Bin.destroy({ where: {}, force: true, transaction });
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
exports.BinFixtures = BinFixtures;
exports.default = BinFixtures;
//# sourceMappingURL=BinFixtures.js.map