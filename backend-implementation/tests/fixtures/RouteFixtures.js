"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteFixtures = void 0;
const Route_1 = require("@/models/Route");
class RouteFixtures {
    constructor() {
        this.counter = 1;
    }
    getRouteData(overrides = {}) {
        const index = this.counter++;
        return {
            name: overrides.name || `Test Route ${index}`,
            driverId: overrides.driverId || this.generateUUID(),
            vehicleId: overrides.vehicleId || this.generateUUID(),
            organizationId: overrides.organizationId || this.generateUUID(),
            binIds: overrides.binIds || [this.generateUUID(), this.generateUUID()],
            scheduledDate: overrides.scheduledDate || new Date(),
            status: overrides.status || 'planned',
        };
    }
    async createRoute(routeData = {}, transaction) {
        const data = this.getRouteData(routeData);
        return await Route_1.Route.create(data, { transaction });
    }
    async cleanup(transaction) {
        await Route_1.Route.destroy({ where: {}, force: true, transaction });
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
exports.RouteFixtures = RouteFixtures;
exports.default = RouteFixtures;
//# sourceMappingURL=RouteFixtures.js.map