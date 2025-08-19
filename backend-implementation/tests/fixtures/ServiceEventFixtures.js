"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceEventFixtures = void 0;
const ServiceEvent_1 = require("@/models/ServiceEvent");
class ServiceEventFixtures {
    constructor() {
        this.counter = 1;
    }
    getServiceEventData(overrides = {}) {
        const index = this.counter++;
        return {
            type: overrides.type || 'pickup',
            binId: overrides.binId || this.generateUUID(),
            routeId: overrides.routeId || this.generateUUID(),
            customerId: overrides.customerId || this.generateUUID(),
            status: overrides.status || 'scheduled',
            scheduledAt: overrides.scheduledAt || new Date(),
            completedAt: overrides.completedAt || null,
        };
    }
    async createServiceEvent(eventData = {}, transaction) {
        const data = this.getServiceEventData(eventData);
        return await ServiceEvent_1.ServiceEvent.create(data, { transaction });
    }
    async cleanup(transaction) {
        await ServiceEvent_1.ServiceEvent.destroy({ where: {}, force: true, transaction });
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
exports.ServiceEventFixtures = ServiceEventFixtures;
exports.default = ServiceEventFixtures;
//# sourceMappingURL=ServiceEventFixtures.js.map