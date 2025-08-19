import { Express } from 'express';
import { User, UserRole } from '@/models/User';
export interface TestUser {
    user: User;
    token: string;
    refreshToken: string;
}
export interface ApiResponse<T = any> {
    status: number;
    body: {
        success: boolean;
        data?: T;
        message?: string;
        error?: any;
        errors?: any[];
    };
}
export declare class ApiTestHelper {
    private app;
    constructor(app: Express);
    generateTestToken(user: User, expiresIn?: string): string;
    createTestUserWithToken(role?: UserRole, userData?: Partial<any>): Promise<TestUser>;
    get(endpoint: string, token?: string, query?: Record<string, any>): Promise<ApiResponse>;
    post(endpoint: string, data?: any, token?: string, headers?: Record<string, string>): Promise<ApiResponse>;
    put(endpoint: string, data?: any, token?: string, headers?: Record<string, string>): Promise<ApiResponse>;
    patch(endpoint: string, data?: any, token?: string, headers?: Record<string, string>): Promise<ApiResponse>;
    delete(endpoint: string, token?: string, headers?: Record<string, string>): Promise<ApiResponse>;
    authenticate(email: string, password: string): Promise<ApiResponse<{
        token: string;
        refreshToken: string;
        user: any;
    }>>;
    testWithRoles(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: any, roles?: UserRole[]): Promise<Record<UserRole, ApiResponse>>;
    assertSuccess(response: ApiResponse, expectedStatus?: number): void;
    assertError(response: ApiResponse, expectedStatus: number, expectedMessage?: string): void;
    assertValidationError(response: ApiResponse, fieldErrors?: string[]): void;
    assertUnauthorized(response: ApiResponse): void;
    assertForbidden(response: ApiResponse): void;
    assertNotFound(response: ApiResponse): void;
    testPagination(endpoint: string, token: string, totalItems: number): Promise<void>;
    testRateLimit(endpoint: string, method?: 'GET' | 'POST', maxRequests?: number): Promise<void>;
    cleanup(): Promise<void>;
}
export default ApiTestHelper;
//# sourceMappingURL=ApiTestHelper.d.ts.map