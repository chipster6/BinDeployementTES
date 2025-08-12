/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - API TEST HELPER
 * ============================================================================
 *
 * Helper utilities for API integration testing. Provides request/response
 * handling, authentication, and common testing patterns.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@/models/User';
import { testConfig } from '@tests/setup';

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

export class ApiTestHelper {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Generate JWT token for testing
   */
  public generateTestToken(user: User, expiresIn: string = '1h'): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.id, // Mock organization
      },
      testConfig.jwt.secret,
      { expiresIn }
    );
  }

  /**
   * Create a test user with token
   */
  public async createTestUserWithToken(
    role: UserRole = UserRole.CUSTOMER,
    userData: Partial<any> = {}
  ): Promise<TestUser> {
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

    const user = await User.create({
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

  /**
   * Make authenticated GET request
   */
  public async get(
    endpoint: string,
    token?: string,
    query: Record<string, any> = {}
  ): Promise<ApiResponse> {
    const req = request(this.app).get(endpoint).query(query);

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body,
    };
  }

  /**
   * Make authenticated POST request
   */
  public async post(
    endpoint: string,
    data: any = {},
    token?: string,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse> {
    const req = request(this.app)
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

  /**
   * Make authenticated PUT request
   */
  public async put(
    endpoint: string,
    data: any = {},
    token?: string,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse> {
    const req = request(this.app)
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

  /**
   * Make authenticated PATCH request
   */
  public async patch(
    endpoint: string,
    data: any = {},
    token?: string,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse> {
    const req = request(this.app)
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

  /**
   * Make authenticated DELETE request
   */
  public async delete(
    endpoint: string,
    token?: string,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse> {
    const req = request(this.app).delete(endpoint);

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

  /**
   * Test authentication endpoint
   */
  public async authenticate(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; refreshToken: string; user: any }>> {
    return this.post('/api/auth/login', { email, password });
  }

  /**
   * Test endpoint with different user roles
   */
  public async testWithRoles(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data: any = {},
    roles: UserRole[] = [UserRole.ADMIN, UserRole.USER, UserRole.CUSTOMER]
  ): Promise<Record<UserRole, ApiResponse>> {
    const results: Record<string, ApiResponse> = {};

    for (const role of roles) {
      const testUser = await this.createTestUserWithToken(role);
      
      let response: ApiResponse;
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

    return results as Record<UserRole, ApiResponse>;
  }

  /**
   * Assert successful response
   */
  public assertSuccess(response: ApiResponse, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
  }

  /**
   * Assert error response
   */
  public assertError(
    response: ApiResponse,
    expectedStatus: number,
    expectedMessage?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    
    if (expectedMessage) {
      expect(response.body.error || response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert validation error
   */
  public assertValidationError(
    response: ApiResponse,
    fieldErrors: string[] = []
  ): void {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    
    if (fieldErrors.length > 0) {
      expect(response.body.errors).toBeDefined();
      fieldErrors.forEach(field => {
        expect(response.body.errors.some((err: any) => err.field === field)).toBe(true);
      });
    }
  }

  /**
   * Assert unauthorized response
   */
  public assertUnauthorized(response: ApiResponse): void {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert forbidden response
   */
  public assertForbidden(response: ApiResponse): void {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert not found response
   */
  public assertNotFound(response: ApiResponse): void {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  }

  /**
   * Test pagination
   */
  public async testPagination(
    endpoint: string,
    token: string,
    totalItems: number
  ): Promise<void> {
    const pageSize = 10;
    const expectedPages = Math.ceil(totalItems / pageSize);

    // Test first page
    const firstPage = await this.get(endpoint, token, { page: 1, limit: pageSize });
    this.assertSuccess(firstPage);
    expect(firstPage.body.data.items).toHaveLength(Math.min(pageSize, totalItems));
    expect(firstPage.body.data.pagination.total).toBe(totalItems);
    expect(firstPage.body.data.pagination.pages).toBe(expectedPages);

    // Test last page if there are multiple pages
    if (expectedPages > 1) {
      const lastPage = await this.get(endpoint, token, { 
        page: expectedPages, 
        limit: pageSize 
      });
      this.assertSuccess(lastPage);
      const expectedLastPageItems = totalItems % pageSize || pageSize;
      expect(lastPage.body.data.items).toHaveLength(expectedLastPageItems);
    }

    // Test invalid page
    const invalidPage = await this.get(endpoint, token, { page: expectedPages + 1 });
    expect(invalidPage.body.data.items).toHaveLength(0);
  }

  /**
   * Test rate limiting
   */
  public async testRateLimit(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    maxRequests: number = 100
  ): Promise<void> {
    const testUser = await this.createTestUserWithToken();
    const requests = [];

    // Make concurrent requests
    for (let i = 0; i < maxRequests + 5; i++) {
      if (method === 'GET') {
        requests.push(this.get(endpoint, testUser.token));
      } else {
        requests.push(this.post(endpoint, {}, testUser.token));
      }
    }

    const responses = await Promise.all(requests);

    // Check if some requests were rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  }

  /**
   * Clean up test users
   */
  public async cleanup(): Promise<void> {
    // Clean up test users created by this helper
    await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.like]: 'test-%@example.com'
        }
      },
      force: true,
    });
  }
}

export default ApiTestHelper;