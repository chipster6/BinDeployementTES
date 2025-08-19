"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiTestHelper = void 0;
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("@/models/User");
const setup_1 = require("@tests/setup");
class ApiTestHelper {
    constructor(app) {
        this.app = app;
    }
    generateTestToken(user, expiresIn = '1h') {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.id,
        }, setup_1.testConfig.jwt.secret, { expiresIn });
    }
    async createTestUserWithToken(role = User_1.UserRole.CUSTOMER, userData = {}) {
        const userDefaults = {
            email: `test-${Date.now()}@example.com`,
            password_hash: 'hashed-password',
            first_name: 'Test',
            last_name: 'User',
            role,
            status: 'active',
            mfa_enabled: false,
            failed_login_attempts: 0,
            password_changed_at: new Date(),
            gdpr_consent_given: true,
            gdpr_consent_date: new Date(),
        };
        const user = await User_1.User.create({
            ...userDefaults,
            ...userData,
        });
        const token = this.generateTestToken(user);
        const refreshToken = `refresh-token-${user.id}`;
        return {
            user,
            token,
            refreshToken,
        };
    }
    async get(endpoint, token, query = {}) {
        const req = (0, supertest_1.default)(this.app).get(endpoint).query(query);
        if (token) {
            req.set('Authorization', `Bearer ${token}`);
        }
        const response = await req;
        return {
            status: response.status,
            body: response.body,
        };
    }
    async post(endpoint, data = {}, token, headers = {}) {
        const req = (0, supertest_1.default)(this.app)
            .post(endpoint)
            .send(data)
            .set('Content-Type', 'application/json');
        if (token) {
            req.set('Authorization', `Bearer ${token}`);
        }
        Object.entries(headers).forEach(([key, value]) => {
            req.set(key, value);
        });
        const response = await req;
        return {
            status: response.status,
            body: response.body,
        };
    }
    async put(endpoint, data = {}, token, headers = {}) {
        const req = (0, supertest_1.default)(this.app)
            .put(endpoint)
            .send(data)
            .set('Content-Type', 'application/json');
        if (token) {
            req.set('Authorization', `Bearer ${token}`);
        }
        Object.entries(headers).forEach(([key, value]) => {
            req.set(key, value);
        });
        const response = await req;
        return {
            status: response.status,
            body: response.body,
        };
    }
    async patch(endpoint, data = {}, token, headers = {}) {
        const req = (0, supertest_1.default)(this.app)
            .patch(endpoint)
            .send(data)
            .set('Content-Type', 'application/json');
        if (token) {
            req.set('Authorization', `Bearer ${token}`);
        }
        Object.entries(headers).forEach(([key, value]) => {
            req.set(key, value);
        });
        const response = await req;
        return {
            status: response.status,
            body: response.body,
        };
    }
    async delete(endpoint, token, headers = {}) {
        const req = (0, supertest_1.default)(this.app).delete(endpoint);
        if (token) {
            req.set('Authorization', `Bearer ${token}`);
        }
        Object.entries(headers).forEach(([key, value]) => {
            req.set(key, value);
        });
        const response = await req;
        return {
            status: response.status,
            body: response.body,
        };
    }
    async authenticate(email, password) {
        return this.post('/api/auth/login', { email, password });
    }
    async testWithRoles(endpoint, method, data = {}, roles = [User_1.UserRole.ADMIN, User_1.UserRole.USER, User_1.UserRole.CUSTOMER]) {
        const results = {};
        for (const role of roles) {
            const testUser = await this.createTestUserWithToken(role);
            let response;
            switch (method) {
                case 'GET':
                    response = await this.get(endpoint, testUser.token);
                    break;
                case 'POST':
                    response = await this.post(endpoint, data, testUser.token);
                    break;
                case 'PUT':
                    response = await this.put(endpoint, data, testUser.token);
                    break;
                case 'PATCH':
                    response = await this.patch(endpoint, data, testUser.token);
                    break;
                case 'DELETE':
                    response = await this.delete(endpoint, testUser.token);
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }
            results[role] = response;
        }
        return results;
    }
    assertSuccess(response, expectedStatus = 200) {
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(true);
    }
    assertError(response, expectedStatus, expectedMessage) {
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(false);
        if (expectedMessage) {
            expect(response.body.error || response.body.message).toContain(expectedMessage);
        }
    }
    assertValidationError(response, fieldErrors = []) {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        if (fieldErrors.length > 0) {
            expect(response.body.errors).toBeDefined();
            fieldErrors.forEach(field => {
                expect(response.body.errors.some((err) => err.field === field)).toBe(true);
            });
        }
    }
    assertUnauthorized(response) {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    }
    assertForbidden(response) {
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    }
    assertNotFound(response) {
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    }
    async testPagination(endpoint, token, totalItems) {
        const pageSize = 10;
        const expectedPages = Math.ceil(totalItems / pageSize);
        const firstPage = await this.get(endpoint, token, { page: 1, limit: pageSize });
        this.assertSuccess(firstPage);
        expect(firstPage.body.data.items).toHaveLength(Math.min(pageSize, totalItems));
        expect(firstPage.body.data.pagination.total).toBe(totalItems);
        expect(firstPage.body.data.pagination.pages).toBe(expectedPages);
        if (expectedPages > 1) {
            const lastPage = await this.get(endpoint, token, {
                page: expectedPages,
                limit: pageSize
            });
            this.assertSuccess(lastPage);
            const expectedLastPageItems = totalItems % pageSize || pageSize;
            expect(lastPage.body.data.items).toHaveLength(expectedLastPageItems);
        }
        const invalidPage = await this.get(endpoint, token, { page: expectedPages + 1 });
        expect(invalidPage.body.data.items).toHaveLength(0);
    }
    async testRateLimit(endpoint, method = 'GET', maxRequests = 100) {
        const testUser = await this.createTestUserWithToken();
        const requests = [];
        for (let i = 0; i < maxRequests + 5; i++) {
            if (method === 'GET') {
                requests.push(this.get(endpoint, testUser.token));
            }
            else {
                requests.push(this.post(endpoint, {}, testUser.token));
            }
        }
        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }
    async cleanup() {
        await User_1.User.destroy({
            where: {
                email: {
                    [require('sequelize').Op.like]: 'test-%@example.com'
                }
            },
            force: true,
        });
    }
}
exports.ApiTestHelper = ApiTestHelper;
exports.default = ApiTestHelper;
//# sourceMappingURL=ApiTestHelper.js.map