"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionFixtures = void 0;
const UserSession_1 = require("@/models/UserSession");
class UserSessionFixtures {
    constructor() {
        this.counter = 1;
    }
    getSessionData(overrides = {}) {
        const index = this.counter++;
        return {
            userId: overrides.userId || this.generateUUID(),
            token: overrides.token || `test-token-${index}-${Date.now()}`,
            expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isActive: overrides.isActive ?? true,
            metadata: overrides.metadata || {
                ip: '127.0.0.1',
                userAgent: 'Test User Agent',
                loginTime: new Date(),
            },
        };
    }
    async createSession(sessionData = {}, transaction) {
        const data = this.getSessionData(sessionData);
        return await UserSession_1.UserSession.create(data, { transaction });
    }
    async cleanup(transaction) {
        await UserSession_1.UserSession.destroy({ where: {}, force: true, transaction });
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
exports.UserSessionFixtures = UserSessionFixtures;
exports.default = UserSessionFixtures;
//# sourceMappingURL=UserSessionFixtures.js.map