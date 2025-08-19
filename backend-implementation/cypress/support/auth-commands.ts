/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS AUTHENTICATION COMMANDS
 * ============================================================================
 *
 * Custom Cypress commands for authentication workflows including role-based
 * login, MFA validation, session management, and security testing for all
 * user roles in the waste management dashboard system.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

// Authentication command implementations
Cypress.Commands.add('loginAsRole', (role: string, options: LoginOptions = {}) => {
  const credentials = getCredentialsForRole(role);
  
  cy.visit('/login');
  
  // Fill in credentials
  cy.get('[data-testid="email-input"]').type(credentials.email);
  cy.get('[data-testid="password-input"]').type(credentials.password);
  
  // Handle remember me option
  if (options.rememberMe) {
    cy.get('[data-testid="remember-me-checkbox"]').check();
  }
  
  // Submit login form
  cy.get('[data-testid="login-submit"]').click();
  
  // Handle MFA if required and not skipped
  if (!options.skipMFA && credentials.mfaEnabled) {
    cy.completeMFA(credentials.mfaSecret);
  }
  
  // Wait for redirect to dashboard
  cy.url().should('include', getDashboardUrlForRole(role));
  
  // Verify successful authentication
  cy.get('[data-testid="user-menu"]').should('be.visible');
  cy.get('[data-testid="user-role"]').should('contain', role.replace('_', ' '));
  
  // Store authentication state
  cy.window().then((win) => {
    win.localStorage.setItem('cypress-auth-role', role);
    win.localStorage.setItem('cypress-auth-timestamp', Date.now().toString());
  });
  
  cy.log(`Successfully logged in as ${role}`);
});

Cypress.Commands.add('completeMFA', (secret?: string) => {
  const mfaSecret = secret || Cypress.env('mfaSecret');
  
  // Wait for MFA challenge screen
  cy.get('[data-testid="mfa-challenge"]', { timeout: 10000 }).should('be.visible');
  
  // Generate TOTP code
  cy.task('generateTOTP', mfaSecret).then((token: string) => {
    // Enter MFA code
    cy.get('[data-testid="mfa-code-input"]').type(token);
    cy.get('[data-testid="mfa-submit"]').click();
    
    // Wait for MFA validation
    cy.get('[data-testid="mfa-challenge"]').should('not.exist');
  });
  
  cy.log('MFA challenge completed successfully');
});

Cypress.Commands.add('logout', () => {
  // Open user menu
  cy.get('[data-testid="user-menu"]').click();
  
  // Click logout
  cy.get('[data-testid="logout-button"]').click();
  
  // Confirm logout if required
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="logout-confirm"]').length > 0) {
      cy.get('[data-testid="logout-confirm"]').click();
    }
  });
  
  // Verify redirect to login page
  cy.url().should('include', '/login');
  
  // Verify user menu is not visible
  cy.get('[data-testid="user-menu"]').should('not.exist');
  
  // Clear authentication state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  cy.log('Successfully logged out');
});

// Helper function to get credentials for each role
function getCredentialsForRole(role: string) {
  const baseCredentials = {
    super_admin: {
      email: 'super.admin@test.com',
      password: 'SuperAdmin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    },
    admin: {
      email: 'admin@test.com',
      password: 'Admin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXQ',
    },
    fleet_manager: {
      email: 'fleet.manager@test.com',
      password: 'FleetManager123!',
      mfaEnabled: false,
      mfaSecret: null,
    },
    driver: {
      email: 'driver@test.com',
      password: 'Driver123!',
      mfaEnabled: false,
      mfaSecret: null,
    },
    customer: {
      email: 'customer@test.com',
      password: 'Customer123!',
      mfaEnabled: false,
      mfaSecret: null,
    },
    billing_admin: {
      email: 'billing.admin@test.com',
      password: 'BillingAdmin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXR',
    },
    support: {
      email: 'support@test.com',
      password: 'Support123!',
      mfaEnabled: false,
      mfaSecret: null,
    },
  };
  
  const credentials = baseCredentials[role as keyof typeof baseCredentials];
  
  if (!credentials) {
    throw new Error(`Unknown role: ${role}`);
  }
  
  return credentials;
}

// Helper function to get dashboard URL for each role
function getDashboardUrlForRole(role: string): string {
  const dashboardUrls = {
    super_admin: '/dashboard/admin',
    admin: '/dashboard/admin',
    fleet_manager: '/dashboard/fleet',
    driver: '/dashboard/driver',
    customer: '/dashboard/customer',
    billing_admin: '/dashboard/billing',
    support: '/dashboard/support',
  };
  
  return dashboardUrls[role as keyof typeof dashboardUrls] || '/dashboard';
}

// Advanced authentication commands
Cypress.Commands.add('loginWithAPI', (role: string) => {
  const credentials = getCredentialsForRole(role);
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: {
      email: credentials.email,
      password: credentials.password,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
    
    const { token, user } = response.body.data;
    
    // Store authentication token
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', token);
      win.localStorage.setItem('user', JSON.stringify(user));
    });
    
    // Set authorization header for subsequent requests
    cy.intercept('**', (req) => {
      req.headers['authorization'] = `Bearer ${token}`;
    });
  });
  
  cy.log(`API authentication completed for ${role}`);
});

Cypress.Commands.add('verifySessionSecurity', () => {
  // Check for secure session management
  cy.getCookies().then((cookies) => {
    const sessionCookie = cookies.find(cookie => 
      cookie.name.includes('session') || cookie.name.includes('auth')
    );
    
    if (sessionCookie) {
      expect(sessionCookie.secure).to.be.true;
      expect(sessionCookie.httpOnly).to.be.true;
      expect(sessionCookie.sameSite).to.eq('strict');
    }
  });
  
  // Check for proper token handling
  cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    if (token) {
      // Verify token is properly formatted (JWT)
      expect(token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    }
  });
  
  cy.log('Session security validation completed');
});

Cypress.Commands.add('testSessionTimeout', () => {
  // Simulate session timeout by manipulating token expiry
  cy.window().then((win) => {
    const expiredToken = generateExpiredToken();
    win.localStorage.setItem('authToken', expiredToken);
  });
  
  // Navigate to a protected route
  cy.visit('/dashboard');
  
  // Should be redirected to login due to expired session
  cy.url().should('include', '/login');
  cy.get('[data-testid="session-expired-message"]').should('be.visible');
  
  cy.log('Session timeout handling verified');
});

Cypress.Commands.add('testUnauthorizedAccess', (role: string, restrictedUrl: string) => {
  // Login as the specified role
  cy.loginAsRole(role);
  
  // Attempt to access restricted URL
  cy.visit(restrictedUrl, { failOnStatusCode: false });
  
  // Should be redirected or shown access denied
  cy.get('body').then(($body) => {
    const hasAccessDenied = $body.find('[data-testid="access-denied"]').length > 0;
    const isRedirected = !cy.url().should('include', restrictedUrl);
    
    expect(hasAccessDenied || isRedirected).to.be.true;
  });
  
  cy.log(`Unauthorized access prevention verified for ${role} accessing ${restrictedUrl}`);
});

// Role-based dashboard verification
Cypress.Commands.add('verifyRoleBasedDashboard', (role: string) => {
  const expectedElements = getRoleBasedDashboardElements(role);
  const restrictedElements = getRestrictedElementsForRole(role);
  
  // Verify role-specific elements are present
  expectedElements.forEach(selector => {
    cy.get(selector).should('be.visible');
  });
  
  // Verify restricted elements are not present
  restrictedElements.forEach(selector => {
    cy.get('body').then(($body) => {
      if ($body.find(selector).length > 0) {
        cy.get(selector).should('not.be.visible');
      }
    });
  });
  
  cy.log(`Role-based dashboard verification completed for ${role}`);
});

// Helper functions for role-based elements
function getRoleBasedDashboardElements(role: string): string[] {
  const elements = {
    super_admin: [
      '[data-testid="system-monitoring"]',
      '[data-testid="user-management"]',
      '[data-testid="security-dashboard"]',
      '[data-testid="performance-metrics"]',
    ],
    admin: [
      '[data-testid="organization-management"]',
      '[data-testid="fleet-overview"]',
      '[data-testid="performance-dashboard"]',
    ],
    fleet_manager: [
      '[data-testid="vehicle-tracking"]',
      '[data-testid="route-optimization"]',
      '[data-testid="driver-management"]',
    ],
    driver: [
      '[data-testid="route-navigation"]',
      '[data-testid="service-completion"]',
      '[data-testid="vehicle-status"]',
    ],
    customer: [
      '[data-testid="service-requests"]',
      '[data-testid="billing-summary"]',
      '[data-testid="account-settings"]',
    ],
    billing_admin: [
      '[data-testid="payment-processing"]',
      '[data-testid="invoice-management"]',
      '[data-testid="financial-reports"]',
    ],
    support: [
      '[data-testid="ticket-management"]',
      '[data-testid="customer-assistance"]',
      '[data-testid="system-status"]',
    ],
  };
  
  return elements[role as keyof typeof elements] || [];
}

function getRestrictedElementsForRole(role: string): string[] {
  // Define elements that should be restricted for each role
  const allAdminElements = [
    '[data-testid="system-monitoring"]',
    '[data-testid="user-management"]',
    '[data-testid="security-dashboard"]',
  ];
  
  const restrictedElements = {
    driver: allAdminElements,
    customer: allAdminElements,
    support: ['[data-testid="financial-reports"]'],
    fleet_manager: ['[data-testid="billing-management"]'],
    billing_admin: ['[data-testid="fleet-operations"]'],
    admin: ['[data-testid="super-admin-tools"]'],
    super_admin: [], // No restrictions for super admin
  };
  
  return restrictedElements[role as keyof typeof restrictedElements] || [];
}

// Utility function to generate expired JWT token for testing
function generateExpiredToken(): string {
  // This would normally use a JWT library, but for testing we'll use a mock
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    sub: 'test-user',
    role: 'customer',
  }));
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
}

// Interface definitions
interface LoginOptions {
  skipMFA?: boolean;
  rememberMe?: boolean;
  redirectTo?: string;
}

// Declare additional commands
declare global {
  namespace Cypress {
    interface Chainable {
      loginWithAPI(role: string): Chainable<Element>;
      verifySessionSecurity(): Chainable<Element>;
      testSessionTimeout(): Chainable<Element>;
      testUnauthorizedAccess(role: string, restrictedUrl: string): Chainable<Element>;
      verifyRoleBasedDashboard(role: string): Chainable<Element>;
    }
  }
}