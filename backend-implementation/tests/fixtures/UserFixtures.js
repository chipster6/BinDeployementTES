"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFixtures = void 0;
const User_1 = require("@/models/User");
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserFixtures {
    constructor() {
        this.counter = 1;
    }
    getUserData(overrides = {}) {
        const index = this.counter++;
        return {
            email: overrides.email || `test.user${index}@example.com`,
            password: overrides.password || 'TestPassword123!',
            firstName: overrides.firstName || `TestUser${index}`,
            lastName: overrides.lastName || `LastName${index}`,
            phone: overrides.phone || `+1555123${String(index).padStart(4, '0')}`,
            role: overrides.role || User_1.UserRole.CUSTOMER,
            status: overrides.status || User_1.UserStatus.ACTIVE,
            organizationId: overrides.organizationId || this.generateUUID(),
            mfaEnabled: overrides.mfaEnabled || false,
            isActive: overrides.isActive ?? true,
            requiresPasswordChange: overrides.requiresPasswordChange || false,
            passwordChangedAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: null,
            gdprConsentGiven: true,
            gdprConsentDate: new Date(),
            dataRetentionUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
        };
    }
    async createUser(userData = {}, transaction) {
        const data = this.getUserData(userData);
        const saltRounds = 4;
        const passwordHash = await bcrypt_1.default.hash(data.password, saltRounds);
        const user = await User_1.User.create({
            email: data.email.toLowerCase(),
            password_hash: passwordHash,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            role: data.role,
            status: data.status,
            mfa_enabled: data.mfaEnabled,
            password_changed_at: data.passwordChangedAt,
            failed_login_attempts: data.failedLoginAttempts,
            locked_until: data.lockedUntil,
            last_login_at: data.lastLoginAt,
            gdpr_consent_given: data.gdprConsentGiven,
            gdpr_consent_date: data.gdprConsentDate,
            data_retention_until: data.dataRetentionUntil,
        }, { transaction });
        user.originalPassword = data.password;
        return user;
    }
    async createUsers(count, baseData = {}, transaction) {
        const users = [];
        for (let i = 0; i < count; i++) {
            const user = await this.createUser(baseData, transaction);
            users.push(user);
        }
        return users;
    }
    async createUserWithRole(role, organizationId, transaction) {
        return this.createUser({ role, organizationId }, transaction);
    }
    async createAdminUser(organizationId, transaction) {
        return this.createUser({
            role: User_1.UserRole.ADMIN,
            email: 'admin@test.com',
            organizationId,
        }, transaction);
    }
    async createDriverUser(organizationId, transaction) {
        return this.createUser({
            role: User_1.UserRole.DRIVER,
            email: `driver${this.counter}@test.com`,
            organizationId,
        }, transaction);
    }
    async createCustomerUser(organizationId, transaction) {
        return this.createUser({
            role: User_1.UserRole.CUSTOMER,
            email: `customer${this.counter}@test.com`,
            organizationId,
        }, transaction);
    }
    async createLockedUser(transaction) {
        return this.createUser({
            status: User_1.UserStatus.LOCKED,
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            failedLoginAttempts: 5,
        }, transaction);
    }
    async createMfaUser(transaction) {
        const user = await this.createUser({
            mfaEnabled: true,
        }, transaction);
        user.generateMfaSecret();
        await user.save({ transaction });
        return user;
    }
    getAuthTestScenarios() {
        return {
            validUser: {
                email: 'valid@test.com',
                password: 'ValidPassword123!',
                role: User_1.UserRole.CUSTOMER,
                status: User_1.UserStatus.ACTIVE,
            },
            invalidEmail: {
                email: 'invalid-email',
                password: 'ValidPassword123!',
            },
            invalidPassword: {
                email: 'valid@test.com',
                password: 'short',
            },
            lockedUser: {
                email: 'locked@test.com',
                password: 'ValidPassword123!',
                status: User_1.UserStatus.LOCKED,
            },
            inactiveUser: {
                email: 'inactive@test.com',
                password: 'ValidPassword123!',
                status: User_1.UserStatus.INACTIVE,
            },
        };
    }
    getPasswordTestCases() {
        return [
            { password: 'ValidPass123!', valid: true, description: 'Valid password' },
            { password: 'short', valid: false, description: 'Too short' },
            { password: '', valid: false, description: 'Empty password' },
            { password: 'nouppercase123!', valid: true, description: 'No uppercase (but still valid)' },
            { password: 'NOLOWERCASE123!', valid: true, description: 'No lowercase (but still valid)' },
            { password: 'NoNumbers!', valid: true, description: 'No numbers (but still valid)' },
            { password: 'NoSpecialChars123', valid: true, description: 'No special chars (but still valid)' },
            { password: 'VeryLongPasswordThatExceedsReasonableLimits123!@#$%^&*()_+-=[]{}|;:,.<>?', valid: true, description: 'Very long password' },
        ];
    }
    getRoleTestData() {
        return [
            { role: User_1.UserRole.SUPER_ADMIN, resource: 'users', action: 'delete', allowed: true },
            { role: User_1.UserRole.ADMIN, resource: 'users', action: 'create', allowed: true },
            { role: User_1.UserRole.ADMIN, resource: 'users', action: 'delete', allowed: false },
            { role: User_1.UserRole.DISPATCHER, resource: 'routes', action: 'update', allowed: true },
            { role: User_1.UserRole.DISPATCHER, resource: 'users', action: 'create', allowed: false },
            { role: User_1.UserRole.DRIVER, resource: 'routes', action: 'read', allowed: true },
            { role: User_1.UserRole.DRIVER, resource: 'customers', action: 'create', allowed: false },
            { role: User_1.UserRole.CUSTOMER, resource: 'invoices', action: 'read', allowed: true },
            { role: User_1.UserRole.CUSTOMER, resource: 'users', action: 'create', allowed: false },
        ];
    }
    async cleanup(transaction) {
        await User_1.User.destroy({
            where: {},
            force: true,
            transaction,
        });
    }
    resetCounter() {
        this.counter = 1;
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.UserFixtures = UserFixtures;
exports.default = UserFixtures;
//# sourceMappingURL=UserFixtures.js.map