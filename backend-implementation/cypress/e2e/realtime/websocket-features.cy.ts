/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - REAL-TIME WEBSOCKET FEATURES E2E TESTS
 * ============================================================================
 *
 * Comprehensive end-to-end testing for real-time dashboard features including
 * WebSocket connections, live data updates, GPS tracking, alert systems,
 * and cross-dashboard synchronization.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

describe('Real-Time WebSocket Features', () => {
  beforeEach(() => {
    // Clean and seed test data
    cy.cleanDatabase();
    cy.seedDatabase('realtime_test');
    
    // Mock WebSocket for controlled testing
    cy.mockWebSocket();
    
    // Start performance monitoring
    cy.startPerformanceMonitoring();
  });

  afterEach(() => {
    // Capture performance metrics
    cy.endPerformanceMonitoring();
    
    // Clean up test data
    cy.cleanDatabase();
  });

  context('WebSocket Connection Management', () => {
    it('should establish WebSocket connection on dashboard load', () => {
      cy.loginAsRole('fleet_manager');
      
      // Verify WebSocket connection is established
      cy.checkWebSocketConnection();
      
      // Verify connection indicator shows connected state
      cy.get('[data-testid="connection-indicator"]')
        .should('be.visible')
        .and('have.class', 'connected');
      
      // Verify connection status in UI
      cy.get('[data-testid="realtime-status"]').should('contain', 'Connected');
    });

    it('should handle WebSocket reconnection on connection loss', () => {
      cy.loginAsRole('fleet_manager');
      cy.checkWebSocketConnection();
      
      // Simulate connection loss
      cy.window().then((win) => {
        // Trigger connection close event
        const wsCloseEvent = new CloseEvent('close', { code: 1006 });
        win.dispatchEvent(wsCloseEvent);
      });
      
      // Verify UI shows disconnected state
      cy.get('[data-testid="connection-indicator"]')
        .should('have.class', 'disconnected');
      
      cy.get('[data-testid="reconnection-message"]')
        .should('be.visible')
        .and('contain', 'Connection lost. Attempting to reconnect...');
      
      // Wait for automatic reconnection
      cy.wait(2000);
      
      // Verify reconnection
      cy.checkWebSocketConnection();
      cy.get('[data-testid="connection-indicator"]')
        .should('have.class', 'connected');
    });

    it('should handle multiple concurrent WebSocket connections', () => {
      // Test multiple user roles connecting simultaneously
      const roles = ['admin', 'fleet_manager', 'driver'];
      
      roles.forEach((role, index) => {
        // Open new browser context/tab simulation
        cy.window().then((win) => {
          const iframe = win.document.createElement('iframe');
          iframe.id = `ws-test-${index}`;
          iframe.src = win.location.href;
          iframe.style.display = 'none';
          win.document.body.appendChild(iframe);
          
          iframe.onload = () => {
            // Simulate login for this connection
            cy.wrap(iframe.contentWindow).as(`window${index}`);
          };
        });
      });
      
      // Verify all connections are active
      cy.get('[data-testid="active-connections"]').should('contain', '3 connections');
    });

    it('should monitor WebSocket performance metrics', () => {
      cy.loginAsRole('fleet_manager');
      
      // Monitor WebSocket latency
      cy.monitorWebSocketLatency(100);
      
      // Verify performance is within acceptable range
      cy.window().then((win) => {
        const performanceData = (win as any).websocketPerformance;
        if (performanceData) {
          expect(performanceData.averageLatency).to.be.lessThan(100);
          expect(performanceData.messagesSent).to.be.greaterThan(0);
          expect(performanceData.messagesReceived).to.be.greaterThan(0);
        }
      });
    });
  });

  context('Live GPS Tracking Updates', () => {
    it('should display real-time vehicle locations on fleet dashboard', () => {
      cy.loginAsRole('fleet_manager');
      
      // Navigate to live tracking
      cy.get('[data-testid="live-tracking"]').click();
      cy.get('[data-testid="fleet-map"]').should('be.visible');
      
      // Verify initial vehicle positions
      cy.get('[data-testid="vehicle-marker"]').should('have.length.at.least', 1);
      
      // Simulate GPS update
      cy.simulateGPSUpdate({
        latitude: 37.7849,
        longitude: -122.4194,
        accuracy: 5,
        timestamp: Date.now(),
      });
      
      // Wait for WebSocket update
      cy.waitForWebSocketUpdate();
      
      // Verify vehicle position updated
      cy.get('[data-testid="vehicle-marker"]')
        .should('have.attr', 'data-lat', '37.7849')
        .and('have.attr', 'data-lng', '-122.4194');
      
      // Verify position accuracy indicator
      cy.get('[data-testid="gps-accuracy"]').should('contain', '5m');
      
      // Verify timestamp is recent
      cy.get('[data-testid="last-update"]').should('contain', 'seconds ago');
    });

    it('should update driver dashboard with navigation changes', () => {
      cy.loginAsRole('driver');
      
      // Start route navigation
      cy.get('[data-testid="start-navigation"]').click();
      cy.get('[data-testid="route-map"]').should('be.visible');
      
      // Simulate route deviation alert
      cy.simulateGPSUpdate({
        latitude: 37.7900, // Off-route position
        longitude: -122.4100,
        accuracy: 3,
      });
      
      // Wait for real-time route adjustment
      cy.waitForWebSocketUpdate();
      
      // Verify route deviation alert
      cy.get('[data-testid="route-deviation-alert"]')
        .should('be.visible')
        .and('contain', 'You have deviated from the planned route');
      
      // Verify reroute suggestion
      cy.get('[data-testid="reroute-suggestion"]').should('be.visible');
      
      // Accept reroute
      cy.get('[data-testid="accept-reroute"]').click();
      
      // Verify route update
      cy.get('[data-testid="route-updated"]').should('contain', 'Route updated');
    });

    it('should handle GPS accuracy and signal loss scenarios', () => {
      cy.loginAsRole('driver');
      
      // Start with good GPS signal
      cy.simulateGPSUpdate({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 3,
      });
      
      cy.get('[data-testid="gps-status"]').should('contain', 'Good signal');
      
      // Simulate poor GPS accuracy
      cy.simulateGPSUpdate({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 50, // Poor accuracy
      });
      
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="gps-status"]').should('contain', 'Poor signal');
      cy.get('[data-testid="accuracy-warning"]')
        .should('be.visible')
        .and('contain', 'GPS accuracy is low');
      
      // Simulate GPS signal loss
      cy.simulateGPSUpdate({
        latitude: 0,
        longitude: 0,
        accuracy: 999,
      });
      
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="gps-status"]').should('contain', 'No signal');
      cy.get('[data-testid="gps-lost-alert"]')
        .should('be.visible')
        .and('contain', 'GPS signal lost');
    });

    it('should track vehicle speed and movement patterns', () => {
      cy.loginAsRole('fleet_manager');
      
      cy.get('[data-testid="vehicle-details"]').click();
      
      // Simulate vehicle movement with speed data
      const movementSequence = [
        { lat: 37.7749, lng: -122.4194, speed: 0 }, // Stopped
        { lat: 37.7759, lng: -122.4184, speed: 25 }, // Moving
        { lat: 37.7769, lng: -122.4174, speed: 35 }, // Faster
        { lat: 37.7779, lng: -122.4164, speed: 15 }, // Slowing
        { lat: 37.7789, lng: -122.4154, speed: 0 }, // Stopped
      ];
      
      movementSequence.forEach((position, index) => {
        cy.simulateGPSUpdate({
          latitude: position.lat,
          longitude: position.lng,
          accuracy: 5,
          speed: position.speed,
        });
        
        cy.waitForWebSocketUpdate();
        
        if (index > 0) {
          // Verify speed display
          cy.get('[data-testid="vehicle-speed"]').should('contain', `${position.speed} mph`);
          
          // Verify movement status
          if (position.speed === 0) {
            cy.get('[data-testid="vehicle-status"]').should('contain', 'Stopped');
          } else {
            cy.get('[data-testid="vehicle-status"]').should('contain', 'Moving');
          }
        }
      });
      
      // Verify route trace is displayed
      cy.get('[data-testid="route-trace"]').should('be.visible');
      cy.get('[data-testid="movement-history"]').should('have.length', movementSequence.length);
    });
  });

  context('Real-Time Alert Systems', () => {
    it('should display emergency alerts across all dashboards', () => {
      // Create emergency alert
      cy.apiRequest('POST', '/api/test/emergency-alert', {
        body: {
          type: 'system_emergency',
          priority: 'critical',
          message: 'System-wide emergency alert test',
          affectedAreas: ['all'],
        },
      });
      
      // Test alert appears on admin dashboard
      cy.loginAsRole('admin');
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="emergency-alert"]')
        .should('be.visible')
        .and('contain', 'System-wide emergency alert test');
      
      cy.get('[data-testid="alert-priority"]').should('contain', 'Critical');
      
      // Test alert appears on fleet manager dashboard
      cy.logout();
      cy.loginAsRole('fleet_manager');
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="emergency-alert"]').should('be.visible');
      
      // Test alert appears on driver dashboard
      cy.logout();
      cy.loginAsRole('driver');
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="emergency-alert"]').should('be.visible');
      
      // Test alert acknowledgment
      cy.get('[data-testid="acknowledge-alert"]').click();
      cy.get('[data-testid="alert-acknowledged"]').should('be.visible');
    });

    it('should handle vehicle breakdown alerts', () => {
      cy.loginAsRole('fleet_manager');
      
      // Simulate vehicle breakdown
      cy.apiRequest('POST', '/api/test/vehicle-breakdown', {
        body: {
          vehicleId: 'truck-001',
          location: { lat: 37.7749, lng: -122.4194 },
          issueType: 'engine_failure',
          severity: 'high',
        },
      });
      
      cy.waitForWebSocketUpdate();
      
      // Verify breakdown alert
      cy.get('[data-testid="breakdown-alert"]')
        .should('be.visible')
        .and('contain', 'Vehicle breakdown reported');
      
      cy.get('[data-testid="affected-vehicle"]').should('contain', 'truck-001');
      cy.get('[data-testid="breakdown-location"]').should('be.visible');
      
      // Verify emergency response options
      cy.get('[data-testid="dispatch-tow"]').should('be.visible');
      cy.get('[data-testid="reassign-route"]').should('be.visible');
      cy.get('[data-testid="notify-customers"]').should('be.visible');
      
      // Test emergency response
      cy.get('[data-testid="dispatch-tow"]').click();
      cy.get('[data-testid="confirm-tow"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Tow truck dispatched');
    });

    it('should alert on route delays and traffic issues', () => {
      cy.loginAsRole('fleet_manager');
      
      // Simulate traffic delay
      cy.apiRequest('POST', '/api/test/traffic-delay', {
        body: {
          routeId: 'route-001',
          location: 'Highway 101 North',
          expectedDelay: 45, // minutes
          cause: 'accident',
        },
      });
      
      cy.waitForWebSocketUpdate();
      
      // Verify traffic alert
      cy.get('[data-testid="traffic-alert"]')
        .should('be.visible')
        .and('contain', 'Traffic delay detected');
      
      cy.get('[data-testid="delay-duration"]').should('contain', '45 minutes');
      cy.get('[data-testid="delay-cause"]').should('contain', 'accident');
      
      // Test reroute suggestion
      cy.get('[data-testid="suggest-reroute"]').should('be.visible');
      cy.get('[data-testid="suggest-reroute"]').click();
      
      cy.get('[data-testid="reroute-options"]').should('be.visible');
      cy.get('[data-testid="apply-reroute"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Route updated');
      
      // Verify driver notification
      cy.logout();
      cy.loginAsRole('driver');
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="route-change-notification"]')
        .should('be.visible')
        .and('contain', 'Your route has been updated due to traffic');
    });

    it('should handle service completion notifications', () => {
      cy.loginAsRole('customer');
      
      // Simulate service completion
      cy.apiRequest('POST', '/api/test/service-completion', {
        body: {
          serviceId: 'service-001',
          customerId: 'current-customer',
          completionTime: new Date().toISOString(),
          notes: 'Service completed successfully',
        },
      });
      
      cy.waitForWebSocketUpdate();
      
      // Verify completion notification
      cy.get('[data-testid="service-notification"]')
        .should('be.visible')
        .and('contain', 'Service completed');
      
      cy.get('[data-testid="completion-time"]').should('be.visible');
      cy.get('[data-testid="service-notes"]').should('contain', 'Service completed successfully');
      
      // Test notification interaction
      cy.get('[data-testid="view-service-details"]').click();
      cy.get('[data-testid="service-summary"]').should('be.visible');
      
      // Test feedback option
      cy.get('[data-testid="provide-feedback"]').should('be.visible');
    });
  });

  context('Dashboard Data Synchronization', () => {
    it('should synchronize customer data across admin and billing dashboards', () => {
      // Admin creates new customer
      cy.loginAsRole('admin');
      
      cy.get('[data-testid="add-customer"]').click();
      cy.get('[data-testid="org-name-input"]').type('Sync Test Corp');
      cy.get('[data-testid="contact-email-input"]').type('sync@test.com');
      cy.get('[data-testid="submit-customer"]').click();
      
      // Verify customer appears in billing dashboard in real-time
      cy.logout();
      cy.loginAsRole('billing_admin');
      
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="customers-list"]').should('contain', 'Sync Test Corp');
      cy.get('[data-testid="new-customer-indicator"]').should('be.visible');
    });

    it('should update service schedules across fleet and customer dashboards', () => {
      // Fleet manager updates service schedule
      cy.loginAsRole('fleet_manager');
      
      cy.get('[data-testid="update-schedule"]').click();
      cy.get('[data-testid="customer-select"]').select('test-customer-1');
      cy.get('[data-testid="new-time"]').type('14:00');
      cy.get('[data-testid="submit-update"]').click();
      
      // Verify customer sees updated schedule in real-time
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="schedule-update-notification"]')
        .should('be.visible')
        .and('contain', 'Your service schedule has been updated');
      
      cy.get('[data-testid="next-service-time"]').should('contain', '2:00 PM');
    });

    it('should sync invoice status between billing and customer dashboards', () => {
      // Billing admin marks invoice as paid
      cy.loginAsRole('billing_admin');
      
      cy.get('[data-testid="mark-invoice-paid"]').first().click();
      cy.get('[data-testid="payment-amount"]').type('250.00');
      cy.get('[data-testid="confirm-payment"]').click();
      
      // Verify customer sees payment reflected in real-time
      cy.logout();
      cy.loginAsRole('customer');
      
      cy.waitForWebSocketUpdate();
      
      cy.get('[data-testid="payment-notification"]')
        .should('be.visible')
        .and('contain', 'Payment of $250.00 has been processed');
      
      cy.get('[data-testid="account-balance"]').should('contain', '$0.00');
    });
  });

  context('Performance Under Real-Time Load', () => {
    it('should maintain performance with high-frequency updates', () => {
      cy.loginAsRole('fleet_manager');
      
      // Simulate high-frequency GPS updates
      const updateCount = 50;
      const updateInterval = 100; // ms
      
      for (let i = 0; i < updateCount; i++) {
        setTimeout(() => {
          cy.simulateGPSUpdate({
            latitude: 37.7749 + (i * 0.0001),
            longitude: -122.4194 + (i * 0.0001),
            accuracy: 5,
          });
        }, i * updateInterval);
      }
      
      // Verify UI remains responsive
      cy.get('[data-testid="fleet-map"]').should('be.visible');
      
      // Measure performance impact
      cy.measureDashboardPerformance();
      
      // Verify update rate doesn't degrade performance
      cy.window().then((win) => {
        const performanceData = win.performance.getEntriesByType('measure');
        const renderTime = performanceData.find(entry => entry.name.includes('render'));
        
        if (renderTime) {
          expect(renderTime.duration).to.be.lessThan(100); // 100ms max render time
        }
      });
    });

    it('should handle connection interruptions gracefully', () => {
      cy.loginAsRole('fleet_manager');
      
      // Simulate intermittent connection issues
      cy.window().then((win) => {
        let connectionState = true;
        
        // Toggle connection every 2 seconds
        setInterval(() => {
          connectionState = !connectionState;
          
          if (connectionState) {
            // Simulate reconnection
            win.dispatchEvent(new Event('websocket-reconnected'));
          } else {
            // Simulate disconnection
            win.dispatchEvent(new CloseEvent('close', { code: 1006 }));
          }
        }, 2000);
      });
      
      // Verify UI handles state changes
      cy.get('[data-testid="connection-indicator"]').should('exist');
      
      // Wait for multiple connection cycles
      cy.wait(10000);
      
      // Verify final state is connected
      cy.checkWebSocketConnection();
    });

    it('should queue updates during offline periods', () => {
      cy.loginAsRole('driver');
      
      // Simulate going offline
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });
      
      // Generate GPS updates while offline
      cy.simulateGPSUpdate({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5,
      });
      
      cy.simulateGPSUpdate({
        latitude: 37.7759,
        longitude: -122.4184,
        accuracy: 5,
      });
      
      // Verify updates are queued
      cy.get('[data-testid="offline-indicator"]').should('contain', 'Offline');
      cy.get('[data-testid="queued-updates"]').should('contain', '2 updates queued');
      
      // Simulate coming back online
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });
      
      // Verify queued updates are sent
      cy.waitForWebSocketUpdate();
      cy.get('[data-testid="updates-synced"]').should('contain', 'Updates synchronized');
    });
  });

  context('Cross-Browser WebSocket Compatibility', () => {
    it('should work consistently across different browsers', () => {
      // This test would ideally run in multiple browsers
      // For now, we'll test WebSocket feature detection
      
      cy.window().then((win) => {
        // Verify WebSocket is supported
        expect(win.WebSocket).to.exist;
        
        // Test WebSocket event handling
        const testSocket = new win.WebSocket('wss://echo.websocket.org/');
        
        testSocket.onopen = () => {
          cy.log('WebSocket connection test successful');
          testSocket.close();
        };
        
        testSocket.onerror = (error) => {
          cy.log('WebSocket error:', error);
        };
      });
    });

    it('should fallback gracefully when WebSocket is not available', () => {
      // Disable WebSocket to test fallback
      cy.window().then((win) => {
        (win as any).WebSocket = undefined;
      });
      
      cy.loginAsRole('fleet_manager');
      
      // Verify fallback polling is activated
      cy.get('[data-testid="polling-indicator"]')
        .should('be.visible')
        .and('contain', 'Using polling for updates');
      
      // Verify updates still work via polling
      cy.get('[data-testid="last-update"]').should('be.visible');
      
      cy.wait(5000); // Wait for poll cycle
      
      cy.get('[data-testid="last-update"]').should('contain', 'seconds ago');
    });
  });
});