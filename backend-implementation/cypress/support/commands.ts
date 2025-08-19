/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS CUSTOM COMMANDS
 * ============================================================================
 *
 * Main commands file that imports and organizes all custom Cypress commands
 * for comprehensive end-to-end dashboard testing. Includes utilities for
 * authentication, navigation, performance monitoring, and accessibility testing.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

/// <reference types="cypress" />

// Import all command modules
import './auth-commands';
import './dashboard-commands';
import './performance-commands';
import './accessibility-commands';
import './mobile-commands';

// Additional utility commands
Cypress.Commands.add('waitUntil', (checkFunction: () => boolean | Cypress.Chainable<boolean>, options: {
  timeout?: number;
  interval?: number;
  errorMsg?: string;
} = {}) => {
  const { timeout = 5000, interval = 100, errorMsg = 'Condition not met within timeout' } = options;
  
  const startTime = Date.now();
  
  const check = (): Cypress.Chainable<boolean> => {
    return cy.then(() => {
      const result = checkFunction();
      if (typeof result === 'boolean') {
        return result;
      }
      return result;
    }).then((result) => {
      if (result) {
        return true;
      }
      
      if (Date.now() - startTime > timeout) {
        throw new Error(errorMsg);
      }
      
      cy.wait(interval);
      return check();
    });
  };
  
  return check();
});

// Enhanced tab command for keyboard navigation testing
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject, options: { shift?: boolean } = {}) => {
  const tabKey = options.shift ? '{shift+tab}' : '{tab}';
  
  if (subject) {
    cy.wrap(subject).type(tabKey);
  } else {
    cy.focused().type(tabKey);
  }
});

// Screenshot with context command
Cypress.Commands.add('screenshotWithContext', (name: string, context: any = {}) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}`;
  
  cy.log('Screenshot Context:', JSON.stringify(context, null, 2));
  cy.screenshot(filename);
});

// API testing utilities
Cypress.Commands.add('apiRequest', (method: string, url: string, options: any = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    failOnStatusCode: false,
  };
  
  // Add authentication token if available
  cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
  });
  
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    ...defaultOptions,
    ...options,
  });
});

// Database testing utilities
Cypress.Commands.add('seedDatabase', (scenario: string) => {
  return cy.apiRequest('POST', '/api/test/seed', {
    body: { scenario },
  }).then((response) => {
    expect(response.status).to.eq(200);
    return cy.wrap(response.body);
  });
});

Cypress.Commands.add('cleanDatabase', () => {
  return cy.apiRequest('DELETE', '/api/test/cleanup').then((response) => {
    expect(response.status).to.eq(200);
  });
});

// Error handling utilities
Cypress.Commands.add('handleExpectedError', (expectedMessage: string, action: () => void) => {
  let errorOccurred = false;
  
  cy.on('fail', (err) => {
    if (err.message.includes(expectedMessage)) {
      errorOccurred = true;
      return false; // Prevent test failure
    }
    throw err; // Re-throw unexpected errors
  });
  
  action();
  
  cy.then(() => {
    expect(errorOccurred).to.be.true;
  });
});

// Local storage utilities
Cypress.Commands.add('setLocalStorage', (key: string, value: any) => {
  cy.window().then((win) => {
    win.localStorage.setItem(key, JSON.stringify(value));
  });
});

Cypress.Commands.add('getLocalStorage', (key: string) => {
  return cy.window().then((win) => {
    const item = win.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  });
});

// Session management utilities
Cypress.Commands.add('preserveSession', (sessionName: string, setup: () => void) => {
  cy.session(sessionName, setup, {
    cacheAcrossSpecs: true,
  });
});

// Intercept utilities for testing
Cypress.Commands.add('mockExternalServices', () => {
  // Mock external API calls
  cy.intercept('POST', '**/api/stripe/**', { fixture: 'stripe-success.json' }).as('stripePayment');
  cy.intercept('POST', '**/api/twilio/**', { fixture: 'twilio-success.json' }).as('twilioSMS');
  cy.intercept('POST', '**/api/sendgrid/**', { fixture: 'sendgrid-success.json' }).as('sendgridEmail');
  cy.intercept('GET', '**/api/samsara/**', { fixture: 'samsara-vehicles.json' }).as('samsaraVehicles');
  cy.intercept('GET', '**/api/maps/**', { fixture: 'maps-route.json' }).as('mapsRoute');
  
  cy.log('External services mocked for testing');
});

// WebSocket testing utilities
Cypress.Commands.add('mockWebSocket', () => {
  cy.window().then((win) => {
    // Store original WebSocket
    const OriginalWebSocket = win.WebSocket;
    
    // Create mock WebSocket
    function MockWebSocket(url: string) {
      const ws = {
        url,
        readyState: 1, // OPEN
        send: cy.stub().as('webSocketSend'),
        close: cy.stub().as('webSocketClose'),
        addEventListener: cy.stub(),
        removeEventListener: cy.stub(),
        dispatchEvent: cy.stub(),
      };
      
      // Simulate connection
      setTimeout(() => {
        const openEvent = new Event('open');
        ws.addEventListener.withArgs('open').callsArgWith(1, openEvent);
      }, 100);
      
      return ws;
    }
    
    // Replace WebSocket
    win.WebSocket = MockWebSocket as any;
    
    // Store reference for cleanup
    (win as any).OriginalWebSocket = OriginalWebSocket;
  });
  
  cy.log('WebSocket mocked for testing');
});

// Performance monitoring utilities
Cypress.Commands.add('startPerformanceMonitoring', () => {
  cy.window().then((win) => {
    // Clear existing performance marks
    win.performance.clearMarks();
    win.performance.clearMeasures();
    
    // Mark test start
    win.performance.mark('test-start');
    
    // Store performance observer data
    (win as any).performanceData = {
      marks: [],
      measures: [],
      resources: [],
    };
  });
});

Cypress.Commands.add('endPerformanceMonitoring', () => {
  cy.window().then((win) => {
    // Mark test end
    win.performance.mark('test-end');
    win.performance.measure('test-duration', 'test-start', 'test-end');
    
    // Collect performance data
    const marks = win.performance.getEntriesByType('mark');
    const measures = win.performance.getEntriesByType('measure');
    const resources = win.performance.getEntriesByType('resource');
    
    const performanceData = {
      marks: marks.map(mark => ({ name: mark.name, startTime: mark.startTime })),
      measures: measures.map(measure => ({ 
        name: measure.name, 
        duration: measure.duration,
        startTime: measure.startTime,
      })),
      resourceCount: resources.length,
      totalResourceSize: resources.reduce((sum: number, resource: any) => {
        return sum + (resource.transferSize || 0);
      }, 0),
    };
    
    cy.log('Performance Data:', JSON.stringify(performanceData, null, 2));
    
    return cy.wrap(performanceData);
  });
});

// Test data management
Cypress.Commands.add('createTestUser', (userData: any) => {
  return cy.apiRequest('POST', '/api/test/users', {
    body: userData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return cy.wrap(response.body.data);
  });
});

Cypress.Commands.add('createTestOrganization', (orgData: any) => {
  return cy.apiRequest('POST', '/api/test/organizations', {
    body: orgData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return cy.wrap(response.body.data);
  });
});

// Declare additional utility commands
declare global {
  namespace Cypress {
    interface Chainable {
      waitUntil(
        checkFunction: () => boolean | Chainable<boolean>,
        options?: { timeout?: number; interval?: number; errorMsg?: string }
      ): Chainable<boolean>;
      
      tab(options?: { shift?: boolean }): Chainable<Element>;
      screenshotWithContext(name: string, context?: any): Chainable<Element>;
      
      apiRequest(method: string, url: string, options?: any): Chainable<any>;
      seedDatabase(scenario: string): Chainable<any>;
      cleanDatabase(): Chainable<any>;
      
      handleExpectedError(expectedMessage: string, action: () => void): Chainable<Element>;
      
      setLocalStorage(key: string, value: any): Chainable<Element>;
      getLocalStorage(key: string): Chainable<any>;
      
      preserveSession(sessionName: string, setup: () => void): Chainable<Element>;
      
      mockExternalServices(): Chainable<Element>;
      mockWebSocket(): Chainable<Element>;
      
      startPerformanceMonitoring(): Chainable<Element>;
      endPerformanceMonitoring(): Chainable<any>;
      
      createTestUser(userData: any): Chainable<any>;
      createTestOrganization(orgData: any): Chainable<any>;
    }
  }
}

// Export commonly used utilities
export const TestUtils = {
  generateTestEmail: (prefix = 'test') => `${prefix}+${Date.now()}@cypress.test`,
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  formatCurrency: (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount),
  getCurrentTimestamp: () => new Date().toISOString(),
};