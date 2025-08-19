"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogFixtures = void 0;
const AuditLog_1 = require("@/models/AuditLog");
class AuditLogFixtures {
    constructor() {
        this.counter = 1;
    }
    getAuditLogData(overrides = {}) {
        const index = this.counter++;
        return {
            userId: overrides.userId || this.generateUUID(),
            action: overrides.action || 'test_action',
            entityType: overrides.entityType || 'TestEntity',
            entityId: overrides.entityId || this.generateUUID(),
            changes: overrides.changes || { field: `test_change_${index}` },
            metadata: overrides.metadata || { test: true, index },
        };
    }
    async createAuditLog(logData = {}, transaction) {
        const data = this.getAuditLogData(logData);
        return await AuditLog_1.AuditLog.create(data, { transaction });
    }
    async cleanup(transaction) {
        await AuditLog_1.AuditLog.destroy({ where: {}, force: true, transaction });
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
exports.AuditLogFixtures = AuditLogFixtures;
exports.default = AuditLogFixtures;
//# sourceMappingURL=AuditLogFixtures.js.map