/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS E2E SUPPORT CONFIGURATION
 * ============================================================================
 *
 * Main support file for Cypress E2E dashboard testing. Includes custom commands,
 * authentication helpers, performance monitoring, accessibility testing,
 * and mobile responsiveness validation.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

// Import necessary Cypress plugins and testing libraries
import '@testing-library/cypress/add-commands';
import 'cypress-axe';
import 'cypress-real-events';
import '@cypress/grep/support';

// Import custom command definitions
import './commands';
import './dashboard-commands';
import './auth-commands';
import './performance-commands';
import './accessibility-commands';
import './mobile-commands';

// Import enhanced utilities
import { DashboardTestUtils as EnhancedUtils } from './dashboard-test-utils';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Handle expected application errors during testing
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  // Don't fail tests on unhandled promise rejections in development
  if (err.message.includes('Unhandled promise rejection')) {
    console.warn('Unhandled promise rejection during test:', err);
    return false;
  }
  return true;
});

// Performance monitoring setup
beforeEach(() => {
  // Start performance monitoring for each test
  cy.window().then((win) => {
    // Mark test start for performance measurement
    win.performance.mark('cypress-test-start');
  });
  
  // Set up viewport for dashboard testing
  cy.viewport(Cypress.env('desktopWidth'), 720);
  
  // Inject axe-core for accessibility testing if enabled
  if (Cypress.env('enableAccessibilityTesting')) {
    cy.injectAxe();
  }
});

afterEach(() => {
  // Capture performance metrics after each test
  cy.window().then((win) => {
    win.performance.mark('cypress-test-end');
    win.performance.measure('cypress-test-duration', 'cypress-test-start', 'cypress-test-end');
    
    const measurements = win.performance.getEntriesByType('measure');
    const testDuration = measurements.find(m => m.name === 'cypress-test-duration');
    
    if (testDuration) {
      cy.log(`Test Duration: ${testDuration.duration.toFixed(2)}ms`);
    }
  });
  
  // Take screenshot on failure for debugging
  cy.on('fail', (err) => {
    cy.screenshot('test-failure');
    throw err;
  });
});

// Global commands for dashboard testing
declare global {
  namespace Cypress {
    interface Chainable {
      // Authentication commands
      loginAsRole(role: string, options?: LoginOptions): Chainable<Element>;
      completeMFA(secret?: string): Chainable<Element>;
      logout(): Chainable<Element>;
      
      // Dashboard navigation commands
      navigateToDashboard(section?: string): Chainable<Element>;
      waitForDashboardLoad(): Chainable<Element>;
      verifyDashboardElements(role: string): Chainable<Element>;
      
      // Performance monitoring commands
      measurePageLoad(threshold?: number): Chainable<Element>;
      measureNavigationSpeed(threshold?: number): Chainable<Element>;
      checkWebSocketConnection(): Chainable<Element>;
      
      // Accessibility testing commands
      checkA11y(context?: string, options?: any): Chainable<Element>;
      validateWCAG(level?: string): Chainable<Element>;
      
      // Mobile responsiveness commands
      testMobileLayout(): Chainable<Element>;
      testTabletLayout(): Chainable<Element>;
      testDesktopLayout(): Chainable<Element>;
      validateTouch(): Chainable<Element>;
      
      // Business workflow commands
      createServiceRequest(data: ServiceRequestData): Chainable<Element>;
      completeRouteOptimization(): Chainable<Element>;
      processPayment(amount: number): Chainable<Element>;
      generateReport(type: string): Chainable<Element>;
      
      // Data management commands
      seedTestData(scenario: string): Chainable<Element>;
      cleanupTestData(): Chainable<Element>;
      
      // Real-time feature testing
      waitForWebSocketUpdate(timeout?: number): Chainable<Element>;
      simulateGPSUpdate(coordinates: GPSCoordinates): Chainable<Element>;
      verifyRealTimeAlert(alertType: string): Chainable<Element>;
    }
  }
}

// Type definitions for custom commands
interface LoginOptions {
  skipMFA?: boolean;
  rememberMe?: boolean;
  redirectTo?: string;
}

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

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// Performance monitoring utilities
Cypress.Commands.add('measurePageLoad', (threshold = 2000) => {
  cy.window().then((win) => {
    const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart;
    expect(loadTime).to.be.lessThan(threshold);
    cy.log(`Page Load Time: ${loadTime}ms`);
  });
});

// Dashboard-specific utilities
Cypress.Commands.add('waitForDashboardLoad', () => {
  // Wait for main dashboard container to load
  cy.get('[data-testid="dashboard-container"]', { timeout: 10000 }).should('be.visible');
  
  // Wait for navigation menu to be ready
  cy.get('[data-testid="navigation-menu"]').should('be.visible');
  
  // Wait for any loading spinners to disappear
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
  
  // Ensure WebSocket connection is established if enabled
  if (Cypress.env('enableWebSocket')) {
    cy.checkWebSocketConnection();
  }
});

// Error handling and debugging utilities
Cypress.Commands.add('debugDashboard', () => {
  cy.window().then((win) => {
    // Log current URL and user state
    cy.log('Current URL:', win.location.href);
    
    // Log any console errors
    const errors = win.console.error.toString();
    if (errors) {
      cy.log('Console Errors:', errors);
    }
    
    // Take screenshot for debugging
    cy.screenshot('debug-dashboard-state');
  });
});

// Test data management
let testDataCleanupTasks: (() => void)[] = [];

Cypress.Commands.add('seedTestData', (scenario: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/test/seed`,
    body: { scenario },
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
    cy.wrap(response.body).as('testData');
  });
});

Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('apiUrl')}/api/test/cleanup`,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Execute any additional cleanup tasks
  testDataCleanupTasks.forEach(task => task());
  testDataCleanupTasks = [];
});

// Export utilities for use in test files
export const DashboardTestUtils = {
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    FLEET_MANAGER: 'fleet_manager',
    DRIVER: 'driver',
    CUSTOMER: 'customer',
    BILLING_ADMIN: 'billing_admin',
    SUPPORT: 'support',
  },
  
  PERFORMANCE_THRESHOLDS: {
    DASHBOARD_LOAD: 2000,
    NAVIGATION: 1000,
    REALTIME_UPDATE: 100,
    API_RESPONSE: 500,
  },
  
  TEST_SCENARIOS: {
    BASIC_CRUD: 'basic_crud',
    ROUTE_OPTIMIZATION: 'route_optimization',
    CUSTOMER_MANAGEMENT: 'customer_management',
    BILLING_CYCLE: 'billing_cycle',
    EMERGENCY_RESPONSE: 'emergency_response',
  },
};