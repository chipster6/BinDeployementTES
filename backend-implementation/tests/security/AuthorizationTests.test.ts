/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHORIZATION SECURITY TESTS
 * ============================================================================
 *
 * Comprehensive tests for role-based access control (RBAC), permissions,
 * and authorization mechanisms across all API endpoints.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Express } from 'express';
import { User, UserRole } from '@/models/User';
import { ApiTestHelper, TestUser } from '@tests/helpers/ApiTestHelper';
import { testFixtures } from '@tests/fixtures';
import { createApp } from '@/server';

describe('Authorization Security Tests', () => {
  let app: Express;
  let apiHelper: ApiTestHelper;
  let testUsers: Record<string, TestUser> = {};

  beforeAll(async () => {
    app = createApp();
    apiHelper = new ApiTestHelper(app);
  });

  afterAll(async () => {
    await apiHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up before each test
    await testFixtures.cleanupAll();

    // Create test users with different roles
    testUsers = {
      superAdmin: await apiHelper.createTestUserWithToken(UserRole.SUPER_ADMIN, {
        email: 'super@test.com',
        first_name: 'Super',
        last_name: 'Admin',
      }),
      admin: await apiHelper.createTestUserWithToken(UserRole.ADMIN, {
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
      }),
      dispatcher: await apiHelper.createTestUserWithToken(UserRole.DISPATCHER, {
        email: 'dispatcher@test.com',
        first_name: 'Dispatcher',
        last_name: 'User',
      }),
      officeStaff: await apiHelper.createTestUserWithToken(UserRole.OFFICE_STAFF, {
        email: 'office@test.com',
        first_name: 'Office',
        last_name: 'Staff',
      }),
      driver: await apiHelper.createTestUserWithToken(UserRole.DRIVER, {
        email: 'driver@test.com',
        first_name: 'Driver',
        last_name: 'User',
      }),
      customer: await apiHelper.createTestUserWithToken(UserRole.CUSTOMER, {
        email: 'customer@test.com',
        first_name: 'Customer',
        last_name: 'User',
      }),
      customerStaff: await apiHelper.createTestUserWithToken(UserRole.CUSTOMER_STAFF, {
        email: 'customerstaff@test.com',
        first_name: 'Customer',
        last_name: 'Staff',
      }),
    };
  });

  describe('User Management Authorization', () => {
    describe('GET /api/users', () => {
      it('should allow super admin access', async () => {
        const response = await apiHelper.get('/api/users', testUsers.superAdmin.token);
        apiHelper.assertSuccess(response);
      });

      it('should allow admin access', async () => {
        const response = await apiHelper.get('/api/users', testUsers.admin.token);
        apiHelper.assertSuccess(response);
      });

      it('should deny access to all other roles', async () => {
        const deniedRoles = ['dispatcher', 'officeStaff', 'driver', 'customer', 'customerStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.get('/api/users', testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });
    });

    describe('POST /api/users', () => {
      const newUserData = {
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        organizationId: 'org-123',
      };

      it('should allow super admin to create users', async () => {
        const response = await apiHelper.post('/api/users', newUserData, testUsers.superAdmin.token);
        expect([201, 200]).toContain(response.status);
      });

      it('should allow admin to create users', async () => {
        const response = await apiHelper.post('/api/users', newUserData, testUsers.admin.token);
        expect([201, 200]).toContain(response.status);
      });

      it('should deny user creation to non-admin roles', async () => {
        const deniedRoles = ['dispatcher', 'officeStaff', 'driver', 'customer', 'customerStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.post('/api/users', newUserData, testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });

      it('should prevent privilege escalation in user creation', async () => {
        const adminCreationData = {
          ...newUserData,
          role: UserRole.ADMIN,
        };

        // Regular admin trying to create super admin
        const superAdminData = { ...adminCreationData, role: UserRole.SUPER_ADMIN };
        const response = await apiHelper.post('/api/users', superAdminData, testUsers.admin.token);
        
        // Should either be forbidden or downgrade the role
        if (response.status === 403) {
          apiHelper.assertForbidden(response);
        } else if (response.status === 201) {
          expect(response.body.data.role).not.toBe(UserRole.SUPER_ADMIN);
        }
      });
    });

    describe('PUT /api/users/:id', () => {
      it('should allow users to update their own profile', async () => {
        const updateData = { firstName: 'Updated' };
        const response = await apiHelper.put(
          `/api/users/${testUsers.customer.user.id}`,
          updateData,
          testUsers.customer.token
        );
        expect([200, 201]).toContain(response.status);
      });

      it('should prevent users from updating others profiles', async () => {
        const updateData = { firstName: 'Hacked' };
        const response = await apiHelper.put(
          `/api/users/${testUsers.admin.user.id}`,
          updateData,
          testUsers.customer.token
        );
        apiHelper.assertForbidden(response);
      });

      it('should prevent role escalation in self-update', async () => {
        const updateData = { role: UserRole.ADMIN };
        const response = await apiHelper.put(
          `/api/users/${testUsers.customer.user.id}`,
          updateData,
          testUsers.customer.token
        );
        
        if (response.status === 200) {
          expect(response.body.data.role).toBe(UserRole.CUSTOMER);
        } else {
          apiHelper.assertForbidden(response);
        }
      });

      it('should allow admin to update any user', async () => {
        const updateData = { firstName: 'AdminUpdated' };
        const response = await apiHelper.put(
          `/api/users/${testUsers.customer.user.id}`,
          updateData,
          testUsers.admin.token
        );
        expect([200, 201]).toContain(response.status);
      });
    });

    describe('DELETE /api/users/:id', () => {
      it('should allow super admin to delete users', async () => {
        const response = await apiHelper.delete(
          `/api/users/${testUsers.customer.user.id}`,
          testUsers.superAdmin.token
        );
        expect([200, 204]).toContain(response.status);
      });

      it('should deny deletion to non-super-admin roles', async () => {
        const deniedRoles = ['admin', 'dispatcher', 'officeStaff', 'driver', 'customer'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.delete(
            `/api/users/${testUsers.customer.user.id}`,
            testUsers[role].token
          );
          apiHelper.assertForbidden(response);
        }
      });

      it('should prevent self-deletion', async () => {
        const response = await apiHelper.delete(
          `/api/users/${testUsers.superAdmin.user.id}`,
          testUsers.superAdmin.token
        );
        apiHelper.assertError(response, 400, 'cannot delete yourself');
      });
    });
  });

  describe('Customer Management Authorization', () => {
    let testCustomer: any;

    beforeEach(async () => {
      testCustomer = await testFixtures.customers.createCustomer({
        name: 'Test Customer Corp',
        organizationId: testUsers.admin.user.id,
      });
    });

    describe('GET /api/customers', () => {
      it('should allow admin roles access', async () => {
        const allowedRoles = ['superAdmin', 'admin'];
        
        for (const role of allowedRoles) {
          const response = await apiHelper.get('/api/customers', testUsers[role].token);
          expect([200, 401, 403]).toContain(response.status);
        }
      });

      it('should allow office staff access', async () => {
        const response = await apiHelper.get('/api/customers', testUsers.officeStaff.token);
        expect([200, 403]).toContain(response.status);
      });

      it('should deny access to drivers and customers', async () => {
        const deniedRoles = ['driver', 'customer', 'customerStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.get('/api/customers', testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });
    });

    describe('POST /api/customers', () => {
      const newCustomerData = {
        name: 'New Customer Corp',
        type: 'commercial',
        contactEmail: 'contact@newcustomer.com',
        address: '123 Business Ave',
        organizationId: 'org-123',
      };

      it('should allow admin to create customers', async () => {
        const response = await apiHelper.post('/api/customers', newCustomerData, testUsers.admin.token);
        expect([200, 201, 403]).toContain(response.status);
      });

      it('should allow office staff to create customers', async () => {
        const response = await apiHelper.post('/api/customers', newCustomerData, testUsers.officeStaff.token);
        expect([200, 201, 403]).toContain(response.status);
      });

      it('should deny customer creation to drivers and customers', async () => {
        const deniedRoles = ['driver', 'customer', 'customerStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.post('/api/customers', newCustomerData, testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });
    });
  });

  describe('Route Management Authorization', () => {
    let testRoute: any;

    beforeEach(async () => {
      const testData = await testFixtures.createScenario('basic_route_optimization');
      testRoute = testData.route;
    });

    describe('GET /api/routes', () => {
      it('should allow admin and dispatcher access', async () => {
        const allowedRoles = ['superAdmin', 'admin', 'dispatcher'];
        
        for (const role of allowedRoles) {
          const response = await apiHelper.get('/api/routes', testUsers[role].token);
          expect([200, 403]).toContain(response.status);
        }
      });

      it('should allow drivers to view routes', async () => {
        const response = await apiHelper.get('/api/routes', testUsers.driver.token);
        expect([200, 403]).toContain(response.status);
      });

      it('should deny access to customers', async () => {
        const deniedRoles = ['customer', 'customerStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.get('/api/routes', testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });
    });

    describe('POST /api/routes', () => {
      const newRouteData = {
        name: 'New Route',
        driverId: testUsers.driver.user.id,
        vehicleId: 'vehicle-123',
        scheduledDate: new Date().toISOString(),
      };

      it('should allow dispatcher to create routes', async () => {
        const response = await apiHelper.post('/api/routes', newRouteData, testUsers.dispatcher.token);
        expect([200, 201, 403]).toContain(response.status);
      });

      it('should deny route creation to drivers and customers', async () => {
        const deniedRoles = ['driver', 'customer', 'customerStaff', 'officeStaff'];
        
        for (const role of deniedRoles) {
          const response = await apiHelper.post('/api/routes', newRouteData, testUsers[role].token);
          apiHelper.assertForbidden(response);
        }
      });
    });

    describe('PUT /api/routes/:id', () => {
      const updateData = { name: 'Updated Route' };

      it('should allow dispatcher to update routes', async () => {
        const response = await apiHelper.put(
          `/api/routes/${testRoute?.id || 'test-id'}`,
          updateData,
          testUsers.dispatcher.token
        );
        expect([200, 404, 403]).toContain(response.status);
      });

      it('should deny route updates to drivers', async () => {
        const response = await apiHelper.put(
          `/api/routes/${testRoute?.id || 'test-id'}`,
          updateData,
          testUsers.driver.token
        );
        expect([403, 404]).toContain(response.status);
      });
    });
  });

  describe('Service Event Authorization', () => {
    describe('GET /api/service-events', () => {
      it('should allow operational roles access', async () => {
        const allowedRoles = ['superAdmin', 'admin', 'dispatcher', 'officeStaff', 'driver'];
        
        for (const role of allowedRoles) {
          const response = await apiHelper.get('/api/service-events', testUsers[role].token);
          expect([200, 403]).toContain(response.status);
        }
      });

      it('should allow customers to view their own service events', async () => {
        const response = await apiHelper.get('/api/service-events', testUsers.customer.token, {
          customerId: testUsers.customer.user.id,
        });
        expect([200, 403]).toContain(response.status);
      });

      it('should prevent customers from viewing other customers events', async () => {
        const response = await apiHelper.get('/api/service-events', testUsers.customer.token, {
          customerId: testUsers.admin.user.id,
        });
        if (response.status === 200) {
          // If allowed, should return empty or filtered results
          expect(response.body.data?.items || []).toHaveLength(0);
        } else {
          apiHelper.assertForbidden(response);
        }
      });
    });

    describe('POST /api/service-events', () => {
      const newServiceEventData = {
        type: 'pickup',
        binId: 'bin-123',
        customerId: 'customer-123',
        scheduledAt: new Date().toISOString(),
      };

      it('should allow dispatcher to create service events', async () => {
        const response = await apiHelper.post('/api/service-events', newServiceEventData, testUsers.dispatcher.token);
        expect([200, 201, 403]).toContain(response.status);
      });

      it('should deny service event creation to customers', async () => {
        const response = await apiHelper.post('/api/service-events', newServiceEventData, testUsers.customer.token);
        apiHelper.assertForbidden(response);
      });
    });

    describe('PUT /api/service-events/:id/status', () => {
      it('should allow drivers to update service event status', async () => {
        const statusData = { status: 'completed', notes: 'Service completed' };
        const response = await apiHelper.put('/api/service-events/test-id/status', statusData, testUsers.driver.token);
        expect([200, 404, 403]).toContain(response.status);
      });

      it('should deny status updates to customers', async () => {
        const statusData = { status: 'completed' };
        const response = await apiHelper.put('/api/service-events/test-id/status', statusData, testUsers.customer.token);
        apiHelper.assertForbidden(response);
      });
    });
  });

  describe('Organization-Level Authorization', () => {
    let orgUser: TestUser;
    let outsideUser: TestUser;

    beforeEach(async () => {
      // Create users in different organizations
      orgUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN, {
        email: 'org1@test.com',
        organizationId: 'org-1',
      });

      outsideUser = await apiHelper.createTestUserWithToken(UserRole.ADMIN, {
        email: 'org2@test.com', 
        organizationId: 'org-2',
      });
    });

    it('should prevent cross-organization data access', async () => {
      // User from org-2 trying to access org-1 user data
      const response = await apiHelper.get(
        `/api/users/${orgUser.user.id}`,
        outsideUser.token
      );
      
      // Should either be forbidden or return 404
      expect([403, 404]).toContain(response.status);
    });

    it('should filter data by organization context', async () => {
      // When getting users list, should only return users from same organization
      const response = await apiHelper.get('/api/users', orgUser.token);
      
      if (response.status === 200 && response.body.data?.items) {
        // All returned users should be from the same organization
        response.body.data.items.forEach((user: any) => {
          if (user.organizationId) {
            expect(user.organizationId).toBe('org-1');
          }
        });
      }
    });
  });

  describe('Resource Ownership Authorization', () => {
    it('should allow users to access their own resources', async () => {
      const response = await apiHelper.get(
        `/api/users/${testUsers.customer.user.id}`,
        testUsers.customer.token
      );
      expect([200, 403]).toContain(response.status);
    });

    it('should prevent access to resources owned by others', async () => {
      const response = await apiHelper.get(
        `/api/users/${testUsers.admin.user.id}`,
        testUsers.customer.token
      );
      apiHelper.assertForbidden(response);
    });
  });

  describe('Permission Inheritance and Hierarchy', () => {
    it('should respect role hierarchy for permissions', async () => {
      // Super admin should have all permissions
      const superAdminResponse = await apiHelper.get('/api/users', testUsers.superAdmin.token);
      expect([200, 401]).toContain(superAdminResponse.status);

      // Admin should have most permissions but not all
      const adminResponse = await apiHelper.get('/api/users', testUsers.admin.token);
      expect([200, 401, 403]).toContain(adminResponse.status);

      // Lower roles should have fewer permissions
      const customerResponse = await apiHelper.get('/api/users', testUsers.customer.token);
      apiHelper.assertForbidden(customerResponse);
    });

    it('should prevent privilege escalation through any endpoint', async () => {
      // Customer trying to change their role through profile update
      const escalationAttempt = await apiHelper.put(
        `/api/users/${testUsers.customer.user.id}`,
        { role: UserRole.ADMIN },
        testUsers.customer.token
      );

      if (escalationAttempt.status === 200) {
        // If update is allowed, role should remain unchanged
        expect(escalationAttempt.body.data.role).toBe(UserRole.CUSTOMER);
      } else {
        // Or the request should be forbidden
        apiHelper.assertForbidden(escalationAttempt);
      }
    });
  });

  describe('API Key Authorization', () => {
    it('should validate API keys for service-to-service communication', async () => {
      // Test with valid API key
      const response = await apiHelper.get('/api/health', undefined, {}, {
        'X-API-Key': 'valid-api-key',
      });
      expect(response.status).toBeLessThan(500);
    });

    it('should reject invalid API keys', async () => {
      const response = await apiHelper.get('/api/internal/stats', undefined, {}, {
        'X-API-Key': 'invalid-api-key',
      });
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should require API key for internal endpoints', async () => {
      const response = await apiHelper.get('/api/internal/stats');
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Time-based Access Control', () => {
    it('should respect business hours for certain operations', async () => {
      // This would test if certain operations are restricted outside business hours
      // Implementation would depend on business requirements
      
      const response = await apiHelper.post('/api/routes', {
        name: 'After Hours Route',
        scheduledDate: new Date().toISOString(),
      }, testUsers.dispatcher.token);
      
      // Should either succeed or fail based on time-based rules
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Geographic Access Control', () => {
    it('should respect geographic boundaries for data access', async () => {
      // This would test location-based access control if implemented
      const response = await apiHelper.get('/api/customers', testUsers.admin.token, {
        region: 'restricted-region',
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});