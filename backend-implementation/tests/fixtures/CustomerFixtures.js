"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerFixtures = void 0;
const Customer_1 = require("@/models/Customer");
class CustomerFixtures {
    constructor() {
        this.counter = 1;
    }
    getCustomerData(overrides = {}) {
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
    async createCustomer(customerData = {}, transaction) {
        const data = this.getCustomerData(customerData);
        return await Customer_1.Customer.create(data, { transaction });
    }
    async cleanup(transaction) {
        await Customer_1.Customer.destroy({ where: {}, force: true, transaction });
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
exports.CustomerFixtures = CustomerFixtures;
exports.default = CustomerFixtures;
//# sourceMappingURL=CustomerFixtures.js.map