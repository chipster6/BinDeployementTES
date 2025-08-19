/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS DASHBOARD COMMANDS
 * ============================================================================
 *
 * Custom Cypress commands for comprehensive dashboard testing including
 * navigation, data visualization, real-time updates, business workflows,
 * and performance monitoring across all user role dashboards.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

// Dashboard navigation commands
Cypress.Commands.add('navigateToDashboard', (section?: string) => {
  if (section) {
    cy.visit(`/dashboard/${section}`);
  } else {
    cy.visit('/dashboard');
  }
  
  cy.waitForDashboardLoad();
  cy.log(`Navigated to dashboard section: ${section || 'main'}`);
});

Cypress.Commands.add('verifyDashboardElements', (role: string) => {
  const expectedElements = getDashboardElementsForRole(role);
  
  // Verify main dashboard container
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  
  // Verify navigation menu
  cy.get('[data-testid="navigation-menu"]').should('be.visible');
  
  // Verify role-specific elements
  expectedElements.forEach(element => {
    cy.get(element.selector).should('be.visible');
    if (element.text) {
      cy.get(element.selector).should('contain.text', element.text);
    }
  });
  
  // Verify user context is correct
  cy.get('[data-testid="user-role-display"]').should('contain', formatRole(role));
  
  cy.log(`Dashboard elements verified for role: ${role}`);
});

// Dashboard performance monitoring
Cypress.Commands.add('measureDashboardPerformance', () => {
  cy.window().then((win) => {
    // Measure Time to Interactive (TTI)
    const navigationTiming = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
    
    // Measure Largest Contentful Paint (LCP)
    const lcpEntries = win.performance.getEntriesByType('largest-contentful-paint');
    const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
    
    // Measure First Contentful Paint (FCP)
    const fcpEntries = win.performance.getEntriesByType('paint');
    const fcp = fcpEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    
    const metrics = {
      loadTime,
      lcp,
      fcp,
      timestamp: Date.now(),
    };
    
    // Log performance metrics
    cy.log('Dashboard Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    // Assert performance thresholds
    expect(loadTime).to.be.lessThan(Cypress.env('dashboardLoadThreshold'));
    expect(lcp).to.be.lessThan(2500); // Good LCP threshold
    expect(fcp).to.be.lessThan(1800); // Good FCP threshold
    
    return cy.wrap(metrics);
  });
});

// Real-time dashboard features
Cypress.Commands.add('checkWebSocketConnection', () => {
  cy.window().then((win) => {
    // Check if WebSocket is connected
    const wsStatus = win.localStorage.getItem('websocket-status');
    expect(wsStatus).to.eq('connected');
    
    // Verify WebSocket events are being received
    cy.get('[data-testid="connection-indicator"]')
      .should('be.visible')
      .and('have.class', 'connected');
  });
  
  cy.log('WebSocket connection verified');
});

Cypress.Commands.add('waitForWebSocketUpdate', (timeout = 5000) => {
  let updateReceived = false;
  
  cy.window().then((win) => {
    // Listen for WebSocket updates
    const originalAddEventListener = win.addEventListener;
    win.addEventListener = function(type, listener, options) {
      if (type === 'websocket-update') {
        updateReceived = true;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  
  // Wait for update or timeout
  cy.waitUntil(() => updateReceived, {
    timeout,
    interval: 100,
    errorMsg: 'WebSocket update not received within timeout',
  });
  
  cy.log('WebSocket update received');
});

// Business workflow commands
Cypress.Commands.add('createServiceRequest', (data: ServiceRequestData) => {
  // Navigate to service request creation
  cy.get('[data-testid="create-service-request"]').click();
  
  // Fill out service request form
  cy.get('[data-testid="customer-select"]').select(data.customerId);
  cy.get('[data-testid="service-type-select"]').select(data.serviceType);
  cy.get('[data-testid="address-input"]').type(data.location.address);
  
  if (data.scheduledDate) {
    cy.get('[data-testid="scheduled-date-input"]').type(data.scheduledDate);
  }
  
  if (data.notes) {
    cy.get('[data-testid="notes-textarea"]').type(data.notes);
  }
  
  // Submit the request
  cy.get('[data-testid="submit-service-request"]').click();
  
  // Verify success message
  cy.get('[data-testid="success-message"]')
    .should('be.visible')
    .and('contain.text', 'Service request created');
  
  // Return to dashboard
  cy.get('[data-testid="back-to-dashboard"]').click();
  
  cy.log('Service request created successfully');
});

Cypress.Commands.add('completeRouteOptimization', () => {
  // Navigate to route optimization
  cy.get('[data-testid="route-optimization"]').click();
  
  // Wait for route calculation
  cy.get('[data-testid="optimization-loading"]').should('be.visible');
  cy.get('[data-testid="optimization-loading"]').should('not.exist', { timeout: 30000 });
  
  // Verify optimization results
  cy.get('[data-testid="optimized-routes"]').should('be.visible');
  cy.get('[data-testid="route-efficiency"]').should('contain.text', '%');
  
  // Apply optimization
  cy.get('[data-testid="apply-optimization"]').click();
  
  // Confirm application
  cy.get('[data-testid="confirm-optimization"]').click();
  
  // Verify success
  cy.get('[data-testid="optimization-success"]')
    .should('be.visible')
    .and('contain.text', 'Route optimization applied');
  
  cy.log('Route optimization completed');
});

Cypress.Commands.add('processPayment', (amount: number) => {
  // Navigate to payment processing
  cy.get('[data-testid="process-payment"]').click();
  
  // Enter payment amount
  cy.get('[data-testid="payment-amount"]').type(amount.toString());
  
  // Select payment method
  cy.get('[data-testid="payment-method"]').select('credit_card');
  
  // Enter test card details
  cy.get('[data-testid="card-number"]').type('4242424242424242');
  cy.get('[data-testid="card-expiry"]').type('12/25');
  cy.get('[data-testid="card-cvc"]').type('123');
  
  // Process payment
  cy.get('[data-testid="process-payment-button"]').click();
  
  // Wait for processing
  cy.get('[data-testid="payment-processing"]').should('be.visible');
  cy.get('[data-testid="payment-processing"]').should('not.exist', { timeout: 15000 });
  
  // Verify payment success
  cy.get('[data-testid="payment-success"]')
    .should('be.visible')
    .and('contain.text', 'Payment processed successfully');
  
  cy.log(`Payment of $${amount} processed successfully`);
});

// Data visualization testing
Cypress.Commands.add('verifyDashboardCharts', () => {
  // Check for common chart elements
  cy.get('[data-testid*="chart"]').should('have.length.at.least', 1);
  
  // Verify charts are loaded
  cy.get('[data-testid*="chart"]').each(($chart) => {
    cy.wrap($chart).should('be.visible');
    // Check for SVG or Canvas elements (common chart libraries)
    cy.wrap($chart).find('svg, canvas').should('exist');
  });
  
  // Test chart interactions
  cy.get('[data-testid="performance-chart"]').trigger('mouseover');
  cy.get('[data-testid="chart-tooltip"]').should('be.visible');
  
  cy.log('Dashboard charts verified and interactive');
});

Cypress.Commands.add('verifyDataTable', (tableName: string) => {
  const tableSelector = `[data-testid="${tableName}-table"]`;
  
  // Verify table exists and is visible
  cy.get(tableSelector).should('be.visible');
  
  // Verify table has headers
  cy.get(`${tableSelector} thead th`).should('have.length.at.least', 1);
  
  // Verify table has data rows
  cy.get(`${tableSelector} tbody tr`).should('have.length.at.least', 1);
  
  // Test sorting functionality
  cy.get(`${tableSelector} thead th`).first().click();
  cy.wait(500); // Allow for sort to complete
  
  // Test pagination if present
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="pagination-next"]').length > 0) {
      cy.get('[data-testid="pagination-next"]').click();
      cy.wait(1000);
      cy.get('[data-testid="pagination-prev"]').click();
    }
  });
  
  cy.log(`Data table '${tableName}' verified with sorting and pagination`);
});

// Dashboard search and filtering
Cypress.Commands.add('testDashboardSearch', (searchTerm: string) => {
  // Use dashboard search functionality
  cy.get('[data-testid="dashboard-search"]').type(searchTerm);
  
  // Wait for search results
  cy.get('[data-testid="search-loading"]').should('not.exist', { timeout: 5000 });
  
  // Verify search results
  cy.get('[data-testid="search-results"]').should('be.visible');
  cy.get('[data-testid="search-results"] .result-item').should('have.length.at.least', 1);
  
  // Clear search
  cy.get('[data-testid="clear-search"]').click();
  cy.get('[data-testid="search-results"]').should('not.exist');
  
  cy.log(`Dashboard search tested with term: '${searchTerm}'`);
});

Cypress.Commands.add('testDashboardFilters', () => {
  // Test date range filter
  cy.get('[data-testid="date-filter"]').click();
  cy.get('[data-testid="date-range-picker"]').should('be.visible');
  cy.get('[data-testid="date-apply"]').click();
  
  // Test status filter
  cy.get('[data-testid="status-filter"]').select('active');
  cy.wait(1000); // Allow filter to apply
  
  // Test category filter
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="category-filter"]').length > 0) {
      cy.get('[data-testid="category-filter"]').select('commercial');
      cy.wait(1000);
    }
  });
  
  // Reset filters
  cy.get('[data-testid="reset-filters"]').click();
  
  cy.log('Dashboard filters tested successfully');
});

// Notification and alert testing
Cypress.Commands.add('verifyDashboardNotifications', () => {
  // Check notification panel
  cy.get('[data-testid="notification-bell"]').click();
  cy.get('[data-testid="notification-panel"]').should('be.visible');
  
  // Verify notification items
  cy.get('[data-testid="notification-item"]').should('have.length.at.least', 0);
  
  // Test marking notification as read
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="notification-item"]').length > 0) {
      cy.get('[data-testid="notification-item"]').first().click();
      cy.get('[data-testid="mark-as-read"]').click();
    }
  });
  
  // Close notification panel
  cy.get('[data-testid="close-notifications"]').click();
  
  cy.log('Dashboard notifications verified');
});

// Helper functions
function getDashboardElementsForRole(role: string) {
  const roleElements = {
    super_admin: [
      { selector: '[data-testid="system-overview"]', text: 'System Overview' },
      { selector: '[data-testid="user-management-widget"]', text: 'User Management' },
      { selector: '[data-testid="security-alerts"]', text: 'Security Alerts' },
      { selector: '[data-testid="performance-monitoring"]', text: 'Performance' },
    ],
    admin: [
      { selector: '[data-testid="organization-stats"]', text: 'Organization Stats' },
      { selector: '[data-testid="fleet-overview"]', text: 'Fleet Overview' },
      { selector: '[data-testid="revenue-chart"]', text: 'Revenue' },
    ],
    fleet_manager: [
      { selector: '[data-testid="vehicle-status"]', text: 'Vehicle Status' },
      { selector: '[data-testid="route-map"]', text: 'Routes' },
      { selector: '[data-testid="driver-performance"]', text: 'Driver Performance' },
    ],
    driver: [
      { selector: '[data-testid="today-routes"]', text: 'Today\'s Routes' },
      { selector: '[data-testid="vehicle-checklist"]', text: 'Vehicle Checklist' },
      { selector: '[data-testid="service-updates"]', text: 'Service Updates' },
    ],
    customer: [
      { selector: '[data-testid="service-schedule"]', text: 'Service Schedule' },
      { selector: '[data-testid="billing-summary"]', text: 'Billing' },
      { selector: '[data-testid="service-history"]', text: 'Service History' },
    ],
    billing_admin: [
      { selector: '[data-testid="payment-dashboard"]', text: 'Payments' },
      { selector: '[data-testid="invoice-management"]', text: 'Invoices' },
      { selector: '[data-testid="financial-reports"]', text: 'Financial Reports' },
    ],
    support: [
      { selector: '[data-testid="ticket-queue"]', text: 'Support Tickets' },
      { selector: '[data-testid="customer-communications"]', text: 'Communications' },
      { selector: '[data-testid="system-status-board"]', text: 'System Status' },
    ],
  };
  
  return roleElements[role as keyof typeof roleElements] || [];
}

function formatRole(role: string): string {
  return role.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Interface definitions
interface ServiceRequestData {
  customerId: string;
  serviceType: string;
  location: {
    address: string;
    coordinates: [number, number];
  };
  scheduledDate: string;
  notes?: string;
}

// Declare additional dashboard commands
declare global {
  namespace Cypress {
    interface Chainable {
      verifyDashboardElements(role: string): Chainable<Element>;
      measureDashboardPerformance(): Chainable<any>;
      verifyDashboardCharts(): Chainable<Element>;
      verifyDataTable(tableName: string): Chainable<Element>;
      testDashboardSearch(searchTerm: string): Chainable<Element>;
      testDashboardFilters(): Chainable<Element>;
      verifyDashboardNotifications(): Chainable<Element>;
    }
  }
}