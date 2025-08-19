/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - AUTHENTICATION WORKFLOW E2E TESTS
 * ============================================================================
 *
 * Comprehensive end-to-end testing for authentication workflows including
 * login flows, MFA validation, role-based redirection, session management,
 * and security features.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

describe('Authentication Workflows', () => {
  beforeEach(() => {
    // Clean up any existing sessions
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Seed authentication test data
    cy.seedDatabase('authentication_test');
  });

  afterEach(() => {
    // Clean up test data
    cy.cleanDatabase();
  });

  context('Basic Login Flow', () => {
    it('should handle successful login for all user roles', () => {
      const roles = [
        'super_admin',
        'admin', 
        'fleet_manager',
        'driver',
        'customer',
        'billing_admin',
        'support'
      ];

      roles.forEach((role) => {
        cy.visit('/login');
        
        // Perform login
        cy.loginAsRole(role);
        
        // Verify successful authentication
        cy.url().should('not.include', '/login');
        cy.get('[data-testid="user-menu"]').should('be.visible');
        cy.get('[data-testid="user-role"]').should('contain', role.replace('_', ' '));
        
        // Verify role-based dashboard redirect
        const expectedUrls = {
          super_admin: '/dashboard/admin',
          admin: '/dashboard/admin',
          fleet_manager: '/dashboard/fleet',
          driver: '/dashboard/driver',
          customer: '/dashboard/customer',
          billing_admin: '/dashboard/billing',
          support: '/dashboard/support',
        };
        
        cy.url().should('include', expectedUrls[role as keyof typeof expectedUrls]);
        
        // Logout for next iteration
        cy.logout();
      });
    });

    it('should handle login failures gracefully', () => {
      cy.visit('/login');
      
      // Test invalid credentials
      cy.get('[data-testid="email-input"]').type('invalid@test.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-submit"]').click();
      
      // Verify error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');
      
      // Verify user remains on login page
      cy.url().should('include', '/login');
      
      // Test empty credentials
      cy.get('[data-testid="email-input"]').clear();
      cy.get('[data-testid="password-input"]').clear();
      cy.get('[data-testid="login-submit"]').click();
      
      // Verify validation errors
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
    });

    it('should handle account lockout after failed attempts', () => {
      cy.visit('/login');
      
      const invalidCredentials = {
        email: 'admin@test.com',
        password: 'wrongpassword'
      };
      
      // Attempt login 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type(invalidCredentials.email);
        cy.get('[data-testid="password-input"]').clear().type(invalidCredentials.password);
        cy.get('[data-testid="login-submit"]').click();
        
        if (i < 4) {
          cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
        }
      }
      
      // Verify account lockout
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Account locked due to too many failed attempts');
      
      // Verify even correct credentials don't work
      cy.get('[data-testid="email-input"]').clear().type(invalidCredentials.email);
      cy.get('[data-testid="password-input"]').clear().type('Admin123!');
      cy.get('[data-testid="login-submit"]').click();
      
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Account locked');
    });
  });

  context('Multi-Factor Authentication (MFA)', () => {
    it('should enforce MFA for administrative roles', () => {
      const mfaRoles = ['super_admin', 'admin', 'billing_admin'];
      
      mfaRoles.forEach((role) => {
        cy.visit('/login');
        
        // Login with valid credentials
        const credentials = {
          super_admin: { email: 'super.admin@test.com', password: 'SuperAdmin123!' },
          admin: { email: 'admin@test.com', password: 'Admin123!' },
          billing_admin: { email: 'billing.admin@test.com', password: 'BillingAdmin123!' },
        };
        
        const creds = credentials[role as keyof typeof credentials];
        cy.get('[data-testid="email-input"]').type(creds.email);
        cy.get('[data-testid="password-input"]').type(creds.password);
        cy.get('[data-testid="login-submit"]').click();
        
        // Verify MFA challenge appears
        cy.get('[data-testid="mfa-challenge"]').should('be.visible');
        cy.get('[data-testid="mfa-code-input"]').should('be.visible');
        
        // Complete MFA
        cy.completeMFA();
        
        // Verify successful authentication
        cy.url().should('not.include', '/login');
        cy.get('[data-testid="user-menu"]').should('be.visible');
        
        cy.logout();
      });
    });

    it('should handle MFA code validation', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('admin@test.com');
      cy.get('[data-testid="password-input"]').type('Admin123!');
      cy.get('[data-testid="login-submit"]').click();
      
      // Wait for MFA challenge
      cy.get('[data-testid="mfa-challenge"]').should('be.visible');
      
      // Test invalid MFA code
      cy.get('[data-testid="mfa-code-input"]').type('000000');
      cy.get('[data-testid="mfa-submit"]').click();
      
      cy.get('[data-testid="mfa-error"]')
        .should('be.visible')
        .and('contain', 'Invalid verification code');
      
      // Test valid MFA code
      cy.completeMFA();
      
      // Verify successful authentication
      cy.url().should('include', '/dashboard');
    });

    it('should allow backup code usage', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('admin@test.com');
      cy.get('[data-testid="password-input"]').type('Admin123!');
      cy.get('[data-testid="login-submit"]').click();
      
      // Wait for MFA challenge
      cy.get('[data-testid="mfa-challenge"]').should('be.visible');
      
      // Click use backup code
      cy.get('[data-testid="use-backup-code"]').click();
      cy.get('[data-testid="backup-code-input"]').should('be.visible');
      
      // Enter backup code
      cy.get('[data-testid="backup-code-input"]').type('BACKUP123456');
      cy.get('[data-testid="backup-submit"]').click();
      
      // Verify successful authentication
      cy.url().should('include', '/dashboard');
    });
  });

  context('Password Reset Flow', () => {
    it('should handle password reset request', () => {
      cy.visit('/login');
      
      // Click forgot password
      cy.get('[data-testid="forgot-password"]').click();
      cy.url().should('include', '/forgot-password');
      
      // Enter email
      cy.get('[data-testid="reset-email-input"]').type('admin@test.com');
      cy.get('[data-testid="reset-submit"]').click();
      
      // Verify success message
      cy.get('[data-testid="reset-success"]')
        .should('be.visible')
        .and('contain', 'Password reset email sent');
    });

    it('should handle password reset completion', () => {
      // Simulate reset token (in real scenario this would come from email)
      const resetToken = 'test-reset-token-123';
      
      cy.visit(`/reset-password?token=${resetToken}`);
      
      // Enter new password
      cy.get('[data-testid="new-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-submit"]').click();
      
      // Verify success and redirect to login
      cy.get('[data-testid="reset-complete"]')
        .should('be.visible')
        .and('contain', 'Password reset successfully');
      
      cy.url().should('include', '/login');
      
      // Test login with new password
      cy.get('[data-testid="email-input"]').type('admin@test.com');
      cy.get('[data-testid="password-input"]').type('NewPassword123!');
      cy.get('[data-testid="login-submit"]').click();
      
      // Should proceed to MFA (for admin)
      cy.get('[data-testid="mfa-challenge"]').should('be.visible');
    });

    it('should validate password requirements', () => {
      const resetToken = 'test-reset-token-123';
      cy.visit(`/reset-password?token=${resetToken}`);
      
      // Test weak password
      cy.get('[data-testid="new-password-input"]').type('weak');
      cy.get('[data-testid="confirm-password-input"]').type('weak');
      cy.get('[data-testid="reset-password-submit"]').click();
      
      cy.get('[data-testid="password-error"]')
        .should('contain', 'Password must be at least 8 characters');
      
      // Test password mismatch
      cy.get('[data-testid="new-password-input"]').clear().type('StrongPassword123!');
      cy.get('[data-testid="confirm-password-input"]').clear().type('DifferentPassword123!');
      cy.get('[data-testid="reset-password-submit"]').click();
      
      cy.get('[data-testid="confirm-password-error"]')
        .should('contain', 'Passwords do not match');
    });
  });

  context('Session Management', () => {
    it('should maintain session across page refreshes', () => {
      cy.loginAsRole('admin');
      
      // Verify logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      
      // Refresh page
      cy.reload();
      
      // Verify still logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.url().should('include', '/dashboard');
    });

    it('should handle session timeout', () => {
      cy.loginAsRole('admin');
      
      // Simulate session timeout by clearing token
      cy.testSessionTimeout();
      
      // Should be redirected to login
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
    });

    it('should enforce concurrent session limits', () => {
      // Login from first session
      cy.loginAsRole('admin');
      cy.get('[data-testid="user-menu"]').should('be.visible');
      
      // Store session token
      cy.getLocalStorage('authToken').then((firstToken) => {
        // Simulate login from another device/browser
        cy.apiRequest('POST', '/api/auth/login', {
          body: {
            email: 'admin@test.com',
            password: 'Admin123!',
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
          
          // First session should be invalidated
          cy.visit('/dashboard');
          cy.url().should('include', '/login');
          cy.get('[data-testid="session-invalidated"]').should('be.visible');
        });
      });
    });

    it('should validate session security', () => {
      cy.loginAsRole('admin');
      cy.verifySessionSecurity();
    });
  });

  context('Role-Based Access Control', () => {
    it('should redirect users to appropriate dashboards', () => {
      const roleRedirects = {
        super_admin: '/dashboard/admin',
        admin: '/dashboard/admin',
        fleet_manager: '/dashboard/fleet',
        driver: '/dashboard/driver',
        customer: '/dashboard/customer',
        billing_admin: '/dashboard/billing',
        support: '/dashboard/support',
      };
      
      Object.entries(roleRedirects).forEach(([role, expectedUrl]) => {
        cy.loginAsRole(role);
        cy.url().should('include', expectedUrl);
        cy.logout();
      });
    });

    it('should prevent access to unauthorized pages', () => {
      // Test driver trying to access admin pages
      cy.loginAsRole('driver');
      cy.visit('/admin/users', { failOnStatusCode: false });
      cy.get('[data-testid="access-denied"]').should('be.visible');
      
      // Test customer trying to access fleet management
      cy.loginAsRole('customer');
      cy.visit('/fleet/vehicles', { failOnStatusCode: false });
      cy.get('[data-testid="access-denied"]').should('be.visible');
    });

    it('should show role-appropriate navigation', () => {
      // Test admin navigation
      cy.loginAsRole('admin');
      cy.get('[data-testid="admin-menu"]').should('be.visible');
      cy.get('[data-testid="driver-menu"]').should('not.exist');
      
      // Test driver navigation
      cy.loginAsRole('driver');
      cy.get('[data-testid="driver-menu"]').should('be.visible');
      cy.get('[data-testid="admin-menu"]').should('not.exist');
    });
  });

  context('Security Features', () => {
    it('should handle suspicious login attempts', () => {
      // Simulate login from unusual location
      cy.apiRequest('POST', '/api/auth/login', {
        body: {
          email: 'admin@test.com',
          password: 'Admin123!',
        },
        headers: {
          'X-Forwarded-For': '192.168.1.100', // Different IP
          'User-Agent': 'Suspicious Browser',
        },
      }).then((response) => {
        if (response.status === 200) {
          // Should trigger additional verification
          expect(response.body.requiresVerification).to.be.true;
        }
      });
    });

    it('should log authentication events', () => {
      cy.loginAsRole('admin');
      
      // Verify login event is logged
      cy.apiRequest('GET', '/api/admin/audit-logs?event=login').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.length.at.least(1);
        
        const loginEvent = response.body.data[0];
        expect(loginEvent.action).to.eq('user_login');
        expect(loginEvent.details.email).to.eq('admin@test.com');
      });
    });

    it('should handle CSRF protection', () => {
      // Attempt login without CSRF token
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/auth/login`,
        body: {
          email: 'admin@test.com',
          password: 'Admin123!',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Should be rejected without proper CSRF token
        expect(response.status).to.eq(403);
      });
    });
  });

  context('Remember Me Functionality', () => {
    it('should remember user login when enabled', () => {
      cy.visit('/login');
      
      // Login with remember me checked
      cy.loginAsRole('admin', { rememberMe: true });
      
      // Clear session storage but keep local storage
      cy.clearCookies();
      
      // Visit site again
      cy.visit('/dashboard');
      
      // Should automatically log in
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should not remember user when disabled', () => {
      cy.visit('/login');
      
      // Login without remember me
      cy.loginAsRole('admin', { rememberMe: false });
      
      // Clear session
      cy.clearCookies();
      cy.clearLocalStorage();
      
      // Visit site again
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  context('Mobile Authentication', () => {
    it('should work on mobile devices', () => {
      cy.viewport(375, 667); // Mobile viewport
      
      cy.visit('/login');
      
      // Verify mobile-friendly login form
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('have.css', 'font-size').and('match', /1[6-8]px/);
      
      // Test touch-friendly inputs
      cy.validateTouch();
      
      // Perform mobile login
      cy.loginAsRole('driver');
      
      // Verify mobile dashboard loads
      cy.get('[data-testid="mobile-dashboard"]').should('be.visible');
    });
  });
});