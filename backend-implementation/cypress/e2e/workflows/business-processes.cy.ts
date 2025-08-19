/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - BUSINESS PROCESS E2E TESTS
 * ============================================================================
 *
 * Comprehensive end-to-end testing for critical business workflows including
 * customer onboarding, service management, route optimization, billing cycles,
 * and emergency response procedures.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

describe('Business Process Workflows', () => {
  beforeEach(() => {
    // Clean and seed comprehensive test data
    cy.cleanDatabase();
    cy.seedDatabase('business_process_test');
    
    // Mock external services
    cy.mockExternalServices();
    
    // Start performance monitoring
    cy.startPerformanceMonitoring();
  });

  afterEach(() => {
    // Capture performance metrics
    cy.endPerformanceMonitoring();
    
    // Clean up test data
    cy.cleanDatabase();
  });

  context('Customer Onboarding Process', () => {
    it('should complete full customer onboarding workflow', () => {
      // Admin initiates customer onboarding
      cy.loginAsRole('admin');
      
      // Step 1: Create customer organization
      cy.get('[data-testid="customer-management"]').click();
      cy.get('[data-testid="add-customer"]').click();
      
      const customerData = {
        organizationName: 'Test Corporation',
        contactEmail: 'contact@testcorp.com',
        contactPhone: '+1-555-0123',
        address: '123 Business Park Drive',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        serviceType: 'commercial',
        binCount: 5,
      };
      
      // Fill customer information
      cy.get('[data-testid="org-name-input"]').type(customerData.organizationName);
      cy.get('[data-testid="contact-email-input"]').type(customerData.contactEmail);
      cy.get('[data-testid="contact-phone-input"]').type(customerData.contactPhone);
      cy.get('[data-testid="address-input"]').type(customerData.address);
      cy.get('[data-testid="city-input"]').type(customerData.city);
      cy.get('[data-testid="state-select"]').select(customerData.state);
      cy.get('[data-testid="zip-input"]').type(customerData.zipCode);
      cy.get('[data-testid="service-type-select"]').select(customerData.serviceType);
      
      cy.get('[data-testid="submit-customer"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Customer created successfully');
      
      // Step 2: Configure service schedule
      cy.get('[data-testid="configure-service"]').click();
      cy.get('[data-testid="service-frequency"]').select('weekly');
      cy.get('[data-testid="service-day"]').select('monday');
      cy.get('[data-testid="service-time"]').type('08:00');
      cy.get('[data-testid="save-schedule"]').click();
      
      // Step 3: Assign bins and equipment
      cy.get('[data-testid="assign-bins"]').click();
      
      for (let i = 0; i < customerData.binCount; i++) {
        cy.get('[data-testid="add-bin"]').click();
        cy.get(`[data-testid="bin-type-${i}"]`).select('standard');
        cy.get(`[data-testid="bin-size-${i}"]`).select('32-gallon');
        cy.get(`[data-testid="bin-location-${i}"]`).type(`Location ${i + 1}`);
      }
      
      cy.get('[data-testid="save-bins"]').click();
      
      // Step 4: Create customer user account
      cy.get('[data-testid="create-customer-account"]').click();
      cy.get('[data-testid="customer-email-input"]').type('admin@testcorp.com');
      cy.get('[data-testid="customer-name-input"]').type('John Admin');
      cy.get('[data-testid="create-account"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Customer account created');
      
      // Step 5: Verify onboarding completion
      cy.get('[data-testid="onboarding-status"]').should('contain', 'Complete');
      cy.get('[data-testid="customer-dashboard-link"]').should('be.visible');
      
      // Verify customer can access their dashboard
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="service-schedule"]').should('be.visible');
      cy.get('[data-testid="bin-locations"]').should('contain', customerData.binCount);
      cy.get('[data-testid="next-service"]').should('contain', 'Monday');
    });

    it('should handle incomplete onboarding scenarios', () => {
      cy.loginAsRole('admin');
      
      // Start customer creation but don't complete
      cy.get('[data-testid="customer-management"]').click();
      cy.get('[data-testid="add-customer"]').click();
      
      cy.get('[data-testid="org-name-input"]').type('Incomplete Corp');
      cy.get('[data-testid="contact-email-input"]').type('incomplete@test.com');
      cy.get('[data-testid="submit-customer"]').click();
      
      // Verify incomplete status
      cy.get('[data-testid="onboarding-status"]').should('contain', 'Incomplete');
      cy.get('[data-testid="onboarding-checklist"]').should('be.visible');
      
      // Verify required steps are highlighted
      cy.get('[data-testid="schedule-pending"]').should('have.class', 'pending');
      cy.get('[data-testid="bins-pending"]').should('have.class', 'pending');
      cy.get('[data-testid="account-pending"]').should('have.class', 'pending');
    });

    it('should validate customer data requirements', () => {
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="customer-management"]').click();
      cy.get('[data-testid="add-customer"]').click();
      
      // Submit without required fields
      cy.get('[data-testid="submit-customer"]').click();
      
      // Verify validation errors
      cy.get('[data-testid="org-name-error"]').should('contain', 'Organization name is required');
      cy.get('[data-testid="contact-email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="address-error"]').should('contain', 'Address is required');
      
      // Test invalid email format
      cy.get('[data-testid="contact-email-input"]').type('invalid-email');
      cy.get('[data-testid="submit-customer"]').click();
      cy.get('[data-testid="contact-email-error"]').should('contain', 'Invalid email format');
    });
  });

  context('Service Management Workflow', () => {
    it('should complete service request to completion cycle', () => {
      // Customer creates service request
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="request-service"]').click();
      cy.get('[data-testid="service-type-select"]').select('special-pickup');
      cy.get('[data-testid="service-description"]').type('Large furniture disposal');
      cy.get('[data-testid="preferred-date"]').type('2024-12-31');
      cy.get('[data-testid="submit-request"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Service request submitted');
      
      // Get request ID for tracking
      cy.get('[data-testid="request-id"]').invoke('text').as('requestId');
      
      // Admin reviews and approves request
      cy.logout();
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="service-requests"]').click();
      cy.get('@requestId').then((requestId) => {
        cy.get(`[data-testid="request-${requestId}"]`).click();
      });
      
      cy.get('[data-testid="approve-request"]').click();
      cy.get('[data-testid="estimated-cost"]').type('150.00');
      cy.get('[data-testid="submit-approval"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Request approved');
      
      // Fleet manager assigns to route
      cy.logout();
      cy.loginAsRole('fleet_manager');
      
      cy.get('[data-testid="service-scheduling"]').click();
      cy.get('@requestId').then((requestId) => {
        cy.get(`[data-testid="request-${requestId}"]`).click();
      });
      
      cy.get('[data-testid="assign-to-route"]').click();
      cy.get('[data-testid="route-select"]').select('route-001');
      cy.get('[data-testid="driver-select"]').select('driver-001');
      cy.get('[data-testid="scheduled-time"]').type('14:00');
      cy.get('[data-testid="submit-assignment"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Service assigned to route');
      
      // Driver completes service
      cy.logout();
      cy.loginAsRole('driver');
      
      cy.get('[data-testid="today-routes"]').click();
      cy.get('@requestId').then((requestId) => {
        cy.get(`[data-testid="service-${requestId}"]`).click();
      });
      
      cy.get('[data-testid="arrive-at-location"]').click();
      cy.get('[data-testid="start-service"]').click();
      
      // Complete service with documentation
      cy.get('[data-testid="service-notes"]').type('Service completed successfully. Items collected.');
      cy.get('[data-testid="before-photo"]').selectFile('cypress/fixtures/before-service.jpg');
      cy.get('[data-testid="after-photo"]').selectFile('cypress/fixtures/after-service.jpg');
      cy.get('[data-testid="customer-signature"]').type('Customer Name');
      
      cy.get('[data-testid="complete-service"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Service completed');
      
      // Verify customer notification
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="service-history"]').click();
      cy.get('@requestId').then((requestId) => {
        cy.get(`[data-testid="service-${requestId}"]`).should('contain', 'Completed');
      });
      
      cy.get('[data-testid="service-photos"]').should('be.visible');
      cy.get('[data-testid="service-receipt"]').should('be.visible');
    });

    it('should handle service cancellations', () => {
      // Customer creates and then cancels service request
      cy.loginAsRole('customer');
      
      cy.createServiceRequest({
        customerId: 'current-customer',
        serviceType: 'emergency-pickup',
        location: {
          address: '123 Test Street',
          coordinates: [-122.4194, 37.7749],
        },
        scheduledDate: '2024-12-31',
        notes: 'Emergency service needed',
      });
      
      cy.get('[data-testid="cancel-request"]').click();
      cy.get('[data-testid="cancellation-reason"]').select('no-longer-needed');
      cy.get('[data-testid="confirm-cancellation"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Service request cancelled');
      
      // Verify admin sees cancellation
      cy.logout();
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="service-requests"]').click();
      cy.get('[data-testid="cancelled-requests"]').should('contain', 'Emergency service needed');
    });

    it('should handle service modifications', () => {
      cy.loginAsRole('customer');
      
      // Create initial service request
      cy.createServiceRequest({
        customerId: 'current-customer',
        serviceType: 'pickup',
        location: {
          address: '123 Original Street',
          coordinates: [-122.4194, 37.7749],
        },
        scheduledDate: '2024-12-31',
        notes: 'Original request',
      });
      
      // Modify the request
      cy.get('[data-testid="modify-request"]').click();
      cy.get('[data-testid="service-description"]').clear().type('Modified service request - additional items');
      cy.get('[data-testid="preferred-date"]').clear().type('2025-01-02');
      cy.get('[data-testid="submit-modification"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Service request updated');
      
      // Verify modification appears in admin view
      cy.logout();
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="service-requests"]').click();
      cy.get('[data-testid="modified-indicator"]').should('be.visible');
      cy.get('[data-testid="modification-history"]').should('contain', 'additional items');
    });
  });

  context('Route Optimization Workflow', () => {
    it('should complete route planning and optimization cycle', () => {
      cy.loginAsRole('fleet_manager');
      
      // Navigate to route planning
      cy.get('[data-testid="route-planning"]').click();
      
      // Create new route
      cy.get('[data-testid="create-route"]').click();
      cy.get('[data-testid="route-name"]').type('Test Route Alpha');
      cy.get('[data-testid="route-date"]').type('2024-12-31');
      cy.get('[data-testid="vehicle-select"]').select('truck-001');
      cy.get('[data-testid="driver-select"]').select('driver-001');
      
      // Add service stops
      const serviceStops = [
        { address: '123 First Street', priority: 'high' },
        { address: '456 Second Avenue', priority: 'medium' },
        { address: '789 Third Boulevard', priority: 'low' },
        { address: '321 Fourth Lane', priority: 'high' },
      ];
      
      serviceStops.forEach((stop, index) => {
        cy.get('[data-testid="add-stop"]').click();
        cy.get(`[data-testid="stop-address-${index}"]`).type(stop.address);
        cy.get(`[data-testid="stop-priority-${index}"]`).select(stop.priority);
      });
      
      cy.get('[data-testid="save-route"]').click();
      
      // Run optimization
      cy.get('[data-testid="optimize-route"]').click();
      cy.get('[data-testid="optimization-loading"]').should('be.visible');
      cy.get('[data-testid="optimization-loading"]').should('not.exist', { timeout: 30000 });
      
      // Verify optimization results
      cy.get('[data-testid="optimized-route"]').should('be.visible');
      cy.get('[data-testid="route-efficiency"]').should('contain', '%');
      cy.get('[data-testid="estimated-time"]').should('be.visible');
      cy.get('[data-testid="total-distance"]').should('be.visible');
      
      // Verify high priority stops are prioritized
      cy.get('[data-testid="route-stops"] .high-priority').should('appear.before', '.medium-priority');
      
      // Apply optimization
      cy.get('[data-testid="apply-optimization"]').click();
      cy.get('[data-testid="confirm-optimization"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Route optimization applied');
      
      // Verify driver can see optimized route
      cy.logout();
      cy.loginAsRole('driver');
      
      cy.get('[data-testid="assigned-routes"]').click();
      cy.get('[data-testid="route-Test Route Alpha"]').click();
      
      cy.get('[data-testid="optimized-stops"]').should('be.visible');
      cy.get('[data-testid="navigation-ready"]').should('be.visible');
    });

    it('should handle route modifications and re-optimization', () => {
      cy.loginAsRole('fleet_manager');
      
      // Create and optimize initial route
      cy.completeRouteOptimization();
      
      // Add emergency stop
      cy.get('[data-testid="add-emergency-stop"]').click();
      cy.get('[data-testid="emergency-address"]').type('999 Emergency Street');
      cy.get('[data-testid="emergency-priority"]').select('urgent');
      cy.get('[data-testid="add-stop"]').click();
      
      // Re-optimize with new stop
      cy.get('[data-testid="re-optimize"]').click();
      cy.get('[data-testid="optimization-loading"]').should('not.exist', { timeout: 30000 });
      
      // Verify emergency stop is prioritized
      cy.get('[data-testid="route-stops"] .urgent-priority').should('appear.before', '.high-priority');
      
      // Apply re-optimization
      cy.get('[data-testid="apply-optimization"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Route re-optimized');
    });

    it('should handle traffic and real-time adjustments', () => {
      cy.loginAsRole('fleet_manager');
      
      // Create route with real-time monitoring
      cy.completeRouteOptimization();
      
      // Simulate traffic incident
      cy.apiRequest('POST', '/api/test/traffic-incident', {
        body: {
          location: { lat: 37.7749, lng: -122.4194 },
          severity: 'high',
          expectedDelay: 30, // minutes
        },
      });
      
      // Wait for real-time update
      cy.waitForWebSocketUpdate();
      
      // Verify traffic alert appears
      cy.get('[data-testid="traffic-alert"]').should('be.visible');
      cy.get('[data-testid="suggested-reroute"]').should('be.visible');
      
      // Apply suggested reroute
      cy.get('[data-testid="apply-reroute"]').click();
      cy.get('[data-testid="confirm-reroute"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Route updated for traffic');
      
      // Verify driver receives update
      cy.logout();
      cy.loginAsRole('driver');
      
      cy.get('[data-testid="route-updates"]').should('contain', 'Traffic reroute applied');
    });
  });

  context('Billing Cycle Workflow', () => {
    it('should complete monthly billing cycle', () => {
      cy.loginAsRole('billing_admin');
      
      // Navigate to billing management
      cy.get('[data-testid="billing-management"]').click();
      
      // Initiate billing cycle
      cy.get('[data-testid="start-billing-cycle"]').click();
      cy.get('[data-testid="billing-period"]').select('monthly');
      cy.get('[data-testid="billing-date"]').type('2024-12-31');
      cy.get('[data-testid="submit-billing"]').click();
      
      // Wait for billing generation
      cy.get('[data-testid="billing-progress"]').should('be.visible');
      cy.get('[data-testid="billing-progress"]').should('not.exist', { timeout: 60000 });
      
      // Verify billing results
      cy.get('[data-testid="billing-summary"]').should('be.visible');
      cy.get('[data-testid="invoices-generated"]').should('contain', 'invoices generated');
      cy.get('[data-testid="total-amount"]').should('be.visible');
      
      // Review individual invoices
      cy.get('[data-testid="review-invoices"]').click();
      cy.get('[data-testid="invoices-table"]').should('be.visible');
      
      // Verify invoice details
      cy.get('[data-testid="invoice-item"]').first().click();
      cy.get('[data-testid="invoice-details"]').should('be.visible');
      cy.get('[data-testid="service-charges"]').should('be.visible');
      cy.get('[data-testid="invoice-total"]').should('be.visible');
      
      // Send invoices
      cy.get('[data-testid="send-invoices"]').click();
      cy.get('[data-testid="confirm-send"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Invoices sent successfully');
      
      // Verify customer receives invoice
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="billing-notifications"]').should('contain', 'New invoice available');
      cy.get('[data-testid="view-invoices"]').click();
      
      cy.get('[data-testid="recent-invoice"]').should('be.visible');
      cy.get('[data-testid="invoice-amount"]').should('be.visible');
      cy.get('[data-testid="due-date"]').should('be.visible');
    });

    it('should handle payment processing and reconciliation', () => {
      // Customer makes payment
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="view-invoices"]').click();
      cy.get('[data-testid="pay-invoice"]').first().click();
      
      // Process payment
      cy.processPayment(250.00);
      
      // Verify payment confirmation
      cy.get('[data-testid="payment-confirmation"]').should('be.visible');
      cy.get('[data-testid="payment-receipt"]').should('be.visible');
      
      // Billing admin reconciles payment
      cy.logout();
      cy.loginAsRole('billing_admin');
      
      cy.get('[data-testid="payment-reconciliation"]').click();
      cy.get('[data-testid="pending-payments"]').should('be.visible');
      
      // Match payment to invoice
      cy.get('[data-testid="payment-item"]').first().click();
      cy.get('[data-testid="match-invoice"]').click();
      cy.get('[data-testid="confirm-match"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Payment reconciled');
      
      // Verify invoice status updated
      cy.get('[data-testid="paid-invoices"]').should('contain', '$250.00');
    });

    it('should handle overdue accounts and collections', () => {
      cy.loginAsRole('billing_admin');
      
      // Simulate overdue invoices
      cy.apiRequest('POST', '/api/test/overdue-invoices', {
        body: {
          customerId: 'test-customer-1',
          daysPastDue: 30,
          amount: 500.00,
        },
      });
      
      // Navigate to collections
      cy.get('[data-testid="collections-management"]').click();
      cy.get('[data-testid="overdue-accounts"]').should('be.visible');
      
      // Send reminder notices
      cy.get('[data-testid="send-reminders"]').click();
      cy.get('[data-testid="reminder-template"]').select('first-notice');
      cy.get('[data-testid="send-notices"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Reminder notices sent');
      
      // Set up payment plans
      cy.get('[data-testid="overdue-account"]').first().click();
      cy.get('[data-testid="create-payment-plan"]').click();
      
      cy.get('[data-testid="payment-amount"]').type('125.00');
      cy.get('[data-testid="payment-frequency"]').select('weekly');
      cy.get('[data-testid="start-date"]').type('2024-12-31');
      cy.get('[data-testid="create-plan"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Payment plan created');
    });
  });

  context('Emergency Response Workflow', () => {
    it('should handle emergency service requests', () => {
      // Customer reports emergency
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="emergency-service"]').click();
      cy.get('[data-testid="emergency-type"]').select('hazardous-spill');
      cy.get('[data-testid="emergency-description"]').type('Chemical spill in parking lot - immediate attention needed');
      cy.get('[data-testid="contact-phone"]').type('+1-555-0199');
      cy.get('[data-testid="submit-emergency"]').click();
      
      cy.get('[data-testid="emergency-confirmation"]').should('be.visible');
      cy.get('[data-testid="response-eta"]').should('be.visible');
      
      // Dispatcher receives and processes emergency
      cy.logout();
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="emergency-alerts"]').should('be.visible');
      cy.get('[data-testid="emergency-queue"]').click();
      
      cy.get('[data-testid="emergency-item"]').first().click();
      cy.get('[data-testid="assign-emergency-crew"]').click();
      
      cy.get('[data-testid="crew-select"]').select('hazmat-team-1');
      cy.get('[data-testid="priority-level"]').select('critical');
      cy.get('[data-testid="dispatch-crew"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Emergency crew dispatched');
      
      // Crew responds to emergency
      cy.logout();
      cy.loginAsRole('driver');
      
      cy.get('[data-testid="emergency-response"]').should('be.visible');
      cy.get('[data-testid="accept-emergency"]').click();
      
      cy.get('[data-testid="emergency-details"]').should('be.visible');
      cy.get('[data-testid="safety-checklist"]').should('be.visible');
      
      // Complete safety checklist
      cy.get('[data-testid="safety-equipment"] input[type="checkbox"]').check();
      cy.get('[data-testid="hazmat-certified"]').check();
      cy.get('[data-testid="emergency-contacts"]').check();
      
      cy.get('[data-testid="respond-to-emergency"]').click();
      
      // Document emergency response
      cy.get('[data-testid="arrival-time"]').should('be.visible');
      cy.get('[data-testid="situation-assessment"]').type('Chemical spill contained. Area secured. Cleanup in progress.');
      cy.get('[data-testid="actions-taken"]').type('Applied absorbent material. Set up safety perimeter. Contacted hazmat disposal.');
      cy.get('[data-testid="completion-photo"]').selectFile('cypress/fixtures/emergency-cleanup.jpg');
      
      cy.get('[data-testid="complete-emergency"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Emergency response completed');
      
      // Verify customer notification
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="emergency-status"]').should('contain', 'Resolved');
      cy.get('[data-testid="response-summary"]').should('be.visible');
    });

    it('should escalate unresolved emergencies', () => {
      // Create emergency that requires escalation
      cy.loginAsRole('customer');
      
      cy.get('[data-testid="emergency-service"]').click();
      cy.get('[data-testid="emergency-type"]').select('fire-hazard');
      cy.get('[data-testid="emergency-description"]').type('Smoke coming from dumpster - possible fire');
      cy.get('[data-testid="submit-emergency"]').click();
      
      // Simulate time passing without response
      cy.wait(5000);
      
      // Admin checks escalation alerts
      cy.logout();
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="escalation-alerts"]').should('be.visible');
      cy.get('[data-testid="overdue-emergency"]').should('contain', 'fire-hazard');
      
      // Escalate to fire department
      cy.get('[data-testid="escalate-emergency"]').click();
      cy.get('[data-testid="escalation-type"]').select('fire-department');
      cy.get('[data-testid="escalation-notes"]').type('Potential fire hazard requires immediate fire department response');
      cy.get('[data-testid="submit-escalation"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Emergency escalated to fire department');
      
      // Verify escalation notification
      cy.get('[data-testid="escalation-log"]').should('contain', 'Fire Department notified');
    });
  });

  context('End-to-End Integration Testing', () => {
    it('should complete full customer lifecycle', () => {
      // Complete customer onboarding
      cy.loginAsRole('admin');
      
      // Create customer (abbreviated version)
      cy.get('[data-testid="customer-management"]').click();
      cy.get('[data-testid="add-customer"]').click();
      cy.get('[data-testid="org-name-input"]').type('Lifecycle Test Corp');
      cy.get('[data-testid="contact-email-input"]').type('lifecycle@test.com');
      cy.get('[data-testid="address-input"]').type('123 Lifecycle Lane');
      cy.get('[data-testid="submit-customer"]').click();
      
      // Configure service and create account
      cy.get('[data-testid="configure-service"]').click();
      cy.get('[data-testid="service-frequency"]').select('weekly');
      cy.get('[data-testid="save-schedule"]').click();
      
      cy.get('[data-testid="create-customer-account"]').click();
      cy.get('[data-testid="customer-email-input"]').type('admin@lifecycle.com');
      cy.get('[data-testid="create-account"]').click();
      
      // Customer uses service
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.createServiceRequest({
        customerId: 'current-customer',
        serviceType: 'pickup',
        location: {
          address: '123 Lifecycle Lane',
          coordinates: [-122.4194, 37.7749],
        },
        scheduledDate: '2024-12-31',
        notes: 'Regular service request',
      });
      
      // Service is completed (abbreviated)
      cy.logout();
      cy.loginAsRole('driver');
      // Simulate service completion
      cy.apiRequest('POST', '/api/test/complete-service', {
        body: { serviceId: 'test-service-1', status: 'completed' },
      });
      
      // Billing cycle processes payment
      cy.logout();
      cy.loginAsRole('billing_admin');
      
      // Generate invoice
      cy.get('[data-testid="generate-invoice"]').click();
      cy.get('[data-testid="submit-invoice"]').click();
      
      // Customer pays invoice
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.processPayment(150.00);
      
      // Verify complete lifecycle
      cy.get('[data-testid="service-history"]').should('contain', 'Completed');
      cy.get('[data-testid="payment-history"]').should('contain', '$150.00');
      cy.get('[data-testid="account-status"]').should('contain', 'Active');
    });

    it('should maintain data consistency across workflows', () => {
      // Create service request
      cy.loginAsRole('customer');
      cy.createServiceRequest({
        customerId: 'test-customer-1',
        serviceType: 'pickup',
        location: {
          address: '123 Consistency Street',
          coordinates: [-122.4194, 37.7749],
        },
        scheduledDate: '2024-12-31',
        notes: 'Consistency test',
      });
      
      // Verify data appears in all relevant dashboards
      cy.logout();
      cy.loginAsRole('admin');
      cy.get('[data-testid="service-requests"]').should('contain', 'Consistency test');
      
      cy.logout();
      cy.loginAsRole('fleet_manager');
      cy.get('[data-testid="pending-services"]').should('contain', 'Consistency test');
      
      cy.logout();
      cy.loginAsRole('billing_admin');
      cy.get('[data-testid="billable-services"]').should('contain', 'Consistency test');
    });
  });
});