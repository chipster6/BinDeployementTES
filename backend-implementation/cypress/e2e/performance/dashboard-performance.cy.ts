/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DASHBOARD PERFORMANCE E2E TESTS
 * ============================================================================
 *
 * Comprehensive performance testing for dashboard load times, responsiveness,
 * resource usage, and scalability across all user roles and device types.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { DashboardTestUtils } from '../../support/e2e';

describe('Dashboard Performance Testing', () => {
  beforeEach(() => {
    // Clean and seed performance test data
    cy.cleanDatabase();
    cy.seedDatabase('performance_test');
    
    // Mock external services for consistent performance
    cy.mockExternalServices();
  });

  afterEach(() => {
    // Clean up test data
    cy.cleanDatabase();
  });

  context('Dashboard Load Performance', () => {
    it('should meet load time requirements for all roles', () => {
      const performanceResults: any[] = [];
      
      Object.values(DashboardTestUtils.ROLES).forEach((role) => {
        cy.startPerformanceMonitoring();
        
        // Test dashboard load performance
        cy.testDashboardLoadPerformance(role).then((metrics) => {
          performanceResults.push({
            role,
            loadTime: metrics.loadComplete,
            firstByte: metrics.firstByte,
            domInteractive: metrics.domInteractive,
          });
        });
        
        cy.endPerformanceMonitoring();
        cy.logout();
      });
      
      cy.then(() => {
        // Analyze overall performance
        const averageLoadTime = performanceResults.reduce((sum, result) => 
          sum + result.loadTime, 0) / performanceResults.length;
        
        expect(averageLoadTime).to.be.lessThan(DashboardTestUtils.PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);
        
        // Log performance summary
        cy.log('Performance Summary:', JSON.stringify(performanceResults, null, 2));
      });
    });

    it('should maintain performance with large datasets', () => {
      // Seed large dataset
      cy.seedDatabase('large_dataset');
      
      cy.loginAsRole('admin');
      
      // Test performance with 1000+ customer records
      cy.get('[data-testid="customer-management"]').click();
      
      cy.measurePageLoad(3000); // Slightly higher threshold for large data
      
      // Test table performance
      cy.get('[data-testid="customers-table"]').should('be.visible');
      cy.verifyDataTable('customers');
      
      // Test search performance
      cy.get('[data-testid="search-input"]').type('test');
      
      cy.measureAPIResponseTime('/api/customers/search', 1000);
      
      // Test pagination performance
      cy.get('[data-testid="pagination-next"]').click();
      cy.measureNavigationSpeed(500);
    });

    it('should optimize initial paint and content visibility', () => {
      cy.loginAsRole('fleet_manager');
      
      cy.window().then((win) => {
        // Measure Core Web Vitals
        const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        // First Contentful Paint
        const paintEntries = win.performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        if (fcp) {
          expect(fcp.startTime).to.be.lessThan(1800); // Good FCP
          cy.log(`First Contentful Paint: ${fcp.startTime.toFixed(2)}ms`);
        }
        
        // Largest Contentful Paint
        const lcpEntries = win.performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          const lcp = lcpEntries[lcpEntries.length - 1];
          expect(lcp.startTime).to.be.lessThan(2500); // Good LCP
          cy.log(`Largest Contentful Paint: ${lcp.startTime.toFixed(2)}ms`);
        }
        
        // Time to Interactive
        const tti = navigation.domInteractive - navigation.navigationStart;
        expect(tti).to.be.lessThan(3800); // Good TTI
        cy.log(`Time to Interactive: ${tti.toFixed(2)}ms`);
      });
    });

    it('should handle concurrent user load', () => {
      // Test performance with multiple simultaneous users
      cy.testConcurrentUserLoad(10);
      
      // Verify server response times remain stable
      cy.measureAPIResponseTime('/api/dashboard/stats', 1000);
      cy.measureAPIResponseTime('/api/vehicles/status', 1000);
      cy.measureAPIResponseTime('/api/routes/active', 1000);
    });
  });

  context('Navigation and Interaction Performance', () => {
    it('should provide fast navigation between dashboard sections', () => {
      cy.loginAsRole('admin');
      
      const navigationTests = [
        { from: 'dashboard', to: 'user-management', selector: '[data-testid="user-management"]' },
        { from: 'user-management', to: 'fleet-overview', selector: '[data-testid="fleet-overview"]' },
        { from: 'fleet-overview', to: 'performance-metrics', selector: '[data-testid="performance-metrics"]' },
        { from: 'performance-metrics', to: 'dashboard', selector: '[data-testid="dashboard-home"]' },
      ];
      
      navigationTests.forEach((test) => {
        cy.get(test.selector).click();
        cy.measureNavigationSpeed(DashboardTestUtils.PERFORMANCE_THRESHOLDS.NAVIGATION);
        cy.waitForDashboardLoad();
      });
    });

    it('should render charts and visualizations efficiently', () => {
      cy.loginAsRole('admin');
      
      // Test performance chart rendering
      cy.get('[data-testid="performance-dashboard"]').click();
      
      // Measure chart load times
      cy.measureChartRenderTime('[data-testid="performance-chart"]', 2000);
      cy.measureChartRenderTime('[data-testid="revenue-chart"]', 2000);
      cy.measureChartRenderTime('[data-testid="usage-chart"]', 2000);
      
      // Test chart interactions
      cy.get('[data-testid="performance-chart"]').trigger('mouseover');
      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
      
      // Measure interaction responsiveness
      const startTime = Date.now();
      cy.get('[data-testid="performance-chart"]').click();
      cy.get('[data-testid="chart-details"]').should('be.visible').then(() => {
        const interactionTime = Date.now() - startTime;
        expect(interactionTime).to.be.lessThan(200);
      });
    });

    it('should handle form submissions efficiently', () => {
      cy.loginAsRole('admin');
      
      // Test customer creation form performance
      cy.get('[data-testid="add-customer"]').click();
      
      const customerData = {
        name: 'Performance Test Corp',
        email: 'perf@test.com',
        address: '123 Performance Street',
      };
      
      // Fill form
      cy.get('[data-testid="org-name-input"]').type(customerData.name);
      cy.get('[data-testid="contact-email-input"]').type(customerData.email);
      cy.get('[data-testid="address-input"]').type(customerData.address);
      
      // Measure form submission
      const startTime = Date.now();
      cy.get('[data-testid="submit-customer"]').click();
      
      cy.get('[data-testid="success-message"]').should('be.visible').then(() => {
        const submissionTime = Date.now() - startTime;
        expect(submissionTime).to.be.lessThan(2000);
        cy.log(`Form submission time: ${submissionTime}ms`);
      });
    });

    it('should optimize table operations and filtering', () => {
      cy.loginAsRole('admin');
      cy.get('[data-testid="customer-management"]').click();
      
      // Test table sorting performance
      const startTime = Date.now();
      cy.get('[data-testid="customers-table"] th').first().click();
      
      cy.get('[data-testid="customers-table"] tbody').should('be.visible').then(() => {
        const sortTime = Date.now() - startTime;
        expect(sortTime).to.be.lessThan(500);
        cy.log(`Table sort time: ${sortTime}ms`);
      });
      
      // Test filtering performance
      const filterStartTime = Date.now();
      cy.get('[data-testid="search-input"]').type('test');
      
      cy.get('[data-testid="filtered-results"]').should('be.visible').then(() => {
        const filterTime = Date.now() - filterStartTime;
        expect(filterTime).to.be.lessThan(300);
        cy.log(`Filter time: ${filterTime}ms`);
      });
    });
  });

  context('Resource Usage and Memory Management', () => {
    it('should maintain reasonable memory usage', () => {
      cy.loginAsRole('fleet_manager');
      
      // Initial memory measurement
      cy.measureMemoryUsage().then((initialMemory) => {
        // Navigate through multiple sections to stress test memory
        const sections = [
          'vehicle-tracking',
          'route-optimization', 
          'driver-management',
          'performance-monitoring',
          'live-tracking',
        ];
        
        sections.forEach((section) => {
          cy.get(`[data-testid="${section}"]`).click();
          cy.waitForDashboardLoad();
        });
        
        // Measure memory after navigation
        cy.measureMemoryUsage().then((finalMemory) => {
          if (initialMemory && finalMemory) {
            const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncreaseMB).to.be.lessThan(50);
            cy.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
          }
        });
      });
    });

    it('should efficiently manage network requests', () => {
      cy.loginAsRole('admin');
      
      // Monitor network requests
      cy.measureNetworkRequests().then((networkData) => {
        expect(networkData.totalRequests).to.be.lessThan(50); // Reasonable request count
        expect(networkData.slowRequests).to.be.lessThan(3); // Minimal slow requests
        expect(networkData.failedRequests).to.eq(0); // No failed requests
        
        cy.log(`Network requests: ${networkData.totalRequests}`);
        cy.log(`Slow requests: ${networkData.slowRequests}`);
      });
    });

    it('should handle resource cleanup on navigation', () => {
      cy.loginAsRole('fleet_manager');
      
      // Start live tracking (resource intensive)
      cy.get('[data-testid="live-tracking"]').click();
      cy.checkWebSocketConnection();
      
      // Navigate away
      cy.get('[data-testid="dashboard-home"]').click();
      
      // Verify WebSocket is properly cleaned up
      cy.window().then((win) => {
        const activeConnections = (win as any).activeWebSockets || [];
        expect(activeConnections.length).to.be.lessThan(2); // Only essential connections remain
      });
      
      // Verify no memory leaks from interval timers
      cy.window().then((win) => {
        const activeTimers = (win as any).activeTimers || [];
        expect(activeTimers.length).to.be.lessThan(3); // Minimal active timers
      });
    });
  });

  context('Mobile Performance Optimization', () => {
    it('should optimize performance for mobile devices', () => {
      // Test mobile performance
      cy.viewport(375, 667); // iPhone SE
      
      cy.loginAsRole('driver');
      
      // Measure mobile-specific performance
      cy.testDashboardLoadPerformance('driver').then((metrics) => {
        // Mobile should load within 3 seconds (slightly higher threshold)
        expect(metrics.loadComplete).to.be.lessThan(3000);
        
        // Mobile-specific metrics
        expect(metrics.firstByte).to.be.lessThan(800); // Mobile TTFB
        expect(metrics.domInteractive).to.be.lessThan(2000); // Mobile TTI
      });
      
      // Test touch interaction performance
      cy.validateTouch();
      
      // Test mobile navigation performance
      cy.get('[data-testid="mobile-menu-toggle"]').click();
      cy.measureNavigationSpeed(300); // Faster mobile navigation
    });

    it('should optimize images and assets for mobile', () => {
      cy.viewport(375, 667);
      cy.loginAsRole('customer');
      
      // Check image optimization
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'loading', 'lazy'); // Lazy loading
        
        // Check responsive images
        const srcset = $img.attr('srcset');
        if (srcset) {
          expect(srcset).to.include('375w'); // Mobile-appropriate sizes
        }
      });
      
      // Measure resource load efficiency
      cy.measureNetworkRequests().then((networkData) => {
        const totalSize = networkData.requests.reduce((sum, req) => sum + req.responseSize, 0);
        const totalSizeMB = totalSize / (1024 * 1024);
        
        // Mobile bundle should be under 2MB
        expect(totalSizeMB).to.be.lessThan(2);
        cy.log(`Mobile bundle size: ${totalSizeMB.toFixed(2)}MB`);
      });
    });

    it('should handle poor network conditions gracefully', () => {
      // Simulate slow 3G connection
      cy.intercept('**', (req) => {
        req.reply((res) => {
          // Add artificial delay to simulate slow connection
          return new Promise(resolve => {
            setTimeout(() => resolve(res), 1000);
          });
        });
      });
      
      cy.viewport(375, 667);
      cy.loginAsRole('driver');
      
      // Verify loading states are shown
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      // Verify progressive loading
      cy.get('[data-testid="critical-content"]').should('be.visible');
      
      // Wait for full load
      cy.waitForDashboardLoad();
      
      // Verify performance is still acceptable
      cy.measureDashboardPerformance();
    });
  });

  context('Performance Regression Testing', () => {
    it('should maintain performance benchmarks', () => {
      // Run comprehensive benchmark
      cy.benchmarkDashboardPerformance().then((benchmark) => {
        // Store benchmark for comparison
        cy.task('storeBenchmark', benchmark);
        
        // Verify against historical benchmarks
        cy.task('compareBenchmarks', benchmark).then((comparison: any) => {
          if (comparison.regressions && comparison.regressions.length > 0) {
            cy.log('Performance regressions detected:', comparison.regressions);
            
            // Fail test if significant regression
            comparison.regressions.forEach((regression: any) => {
              if (regression.degradation > 20) { // More than 20% slower
                throw new Error(`Performance regression: ${regression.metric} is ${regression.degradation}% slower`);
              }
            });
          }
        });
      });
    });

    it('should validate performance across browser updates', () => {
      // Test performance consistency
      const testRuns = 3;
      const results: any[] = [];
      
      for (let i = 0; i < testRuns; i++) {
        cy.loginAsRole('admin');
        cy.testDashboardLoadPerformance('admin').then((metrics) => {
          results.push(metrics.loadComplete);
        });
        cy.logout();
      }
      
      cy.then(() => {
        // Calculate performance consistency
        const average = results.reduce((sum, val) => sum + val, 0) / results.length;
        const variance = results.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / results.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = (standardDeviation / average) * 100;
        
        // Performance should be consistent (CV < 10%)
        expect(coefficientOfVariation).to.be.lessThan(10);
        cy.log(`Performance consistency (CV): ${coefficientOfVariation.toFixed(2)}%`);
      });
    });
  });

  context('Real-Time Performance Monitoring', () => {
    it('should monitor WebSocket performance impact', () => {
      cy.loginAsRole('fleet_manager');
      
      // Baseline performance without WebSocket
      cy.measureDashboardPerformance().then((baselineMetrics) => {
        // Enable WebSocket updates
        cy.checkWebSocketConnection();
        
        // Simulate high-frequency updates
        for (let i = 0; i < 20; i++) {
          cy.simulateGPSUpdate({
            latitude: 37.7749 + (i * 0.001),
            longitude: -122.4194 + (i * 0.001),
            accuracy: 5,
          });
        }
        
        // Wait for updates to process
        cy.wait(2000);
        
        // Measure performance with WebSocket load
        cy.measureDashboardPerformance().then((wsMetrics) => {
          // Performance degradation should be minimal
          const performanceImpact = wsMetrics.memoryUsage?.usedJSHeapSize! - baselineMetrics.memoryUsage?.usedJSHeapSize!;
          const impactMB = performanceImpact / (1024 * 1024);
          
          expect(impactMB).to.be.lessThan(10); // Less than 10MB impact
          cy.log(`WebSocket memory impact: ${impactMB.toFixed(2)}MB`);
        });
      });
    });

    it('should maintain performance during peak usage simulation', () => {
      // Simulate peak usage conditions
      cy.loginAsRole('admin');
      
      // Generate multiple simultaneous operations
      const operations = [
        () => cy.get('[data-testid="refresh-dashboard"]').click(),
        () => cy.get('[data-testid="customer-search"]').type('test'),
        () => cy.get('[data-testid="export-data"]').click(),
        () => cy.get('[data-testid="generate-report"]').click(),
      ];
      
      // Execute operations concurrently
      operations.forEach(operation => operation());
      
      // Measure system responsiveness
      cy.measureNavigationSpeed(2000); // Higher threshold for peak load
      
      // Verify system remains stable
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
      cy.get('[data-testid="error-state"]').should('not.exist');
    });
  });
});