/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS PERFORMANCE COMMANDS
 * ============================================================================
 *
 * Custom Cypress commands for comprehensive performance testing including
 * load time measurement, real-time update monitoring, API response validation,
 * and resource usage analysis for dashboard performance optimization.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

// Performance measurement commands
Cypress.Commands.add('measureNavigationSpeed', (threshold = 1000) => {
  let startTime: number;
  
  cy.window().then((win) => {
    startTime = win.performance.now();
  });
  
  return cy.get('[data-testid="dashboard-container"]').should('be.visible').then(() => {
    cy.window().then((win) => {
      const endTime = win.performance.now();
      const navigationTime = endTime - startTime;
      
      expect(navigationTime).to.be.lessThan(threshold);
      cy.log(`Navigation completed in ${navigationTime.toFixed(2)}ms`);
      
      return cy.wrap(navigationTime);
    });
  });
});

Cypress.Commands.add('measureAPIResponseTime', (apiEndpoint: string, threshold = 500) => {
  let requestStart: number;
  
  cy.intercept('GET', `**${apiEndpoint}**`, (req) => {
    requestStart = Date.now();
  }).as('apiRequest');
  
  // Trigger API call (this will vary based on implementation)
  cy.get('[data-testid="refresh-data"]').click();
  
  cy.wait('@apiRequest').then((intercept) => {
    const responseTime = Date.now() - requestStart;
    
    expect(responseTime).to.be.lessThan(threshold);
    expect(intercept.response?.statusCode).to.eq(200);
    
    cy.log(`API ${apiEndpoint} responded in ${responseTime}ms`);
    
    return cy.wrap(responseTime);
  });
});

Cypress.Commands.add('measureChartRenderTime', (chartSelector: string, threshold = 2000) => {
  const startTime = Date.now();
  
  cy.get(chartSelector).should('be.visible').then(() => {
    // Wait for chart to be fully rendered
    cy.get(`${chartSelector} svg, ${chartSelector} canvas`).should('exist');
    
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).to.be.lessThan(threshold);
    cy.log(`Chart rendered in ${renderTime}ms`);
    
    return cy.wrap(renderTime);
  });
});

// Real-time performance monitoring
Cypress.Commands.add('monitorWebSocketLatency', (expectedLatency = 100) => {
  let messagesSent = 0;
  let messagesReceived = 0;
  let totalLatency = 0;
  
  cy.window().then((win) => {
    // Mock WebSocket for testing
    const originalWebSocket = win.WebSocket;
    
    const mockWebSocket = function(url: string) {
      const ws = new originalWebSocket(url);
      
      const originalSend = ws.send;
      ws.send = function(data) {
        messagesSent++;
        const timestamp = Date.now();
        
        // Add timestamp to message for latency calculation
        const messageWithTimestamp = JSON.stringify({
          ...JSON.parse(data.toString()),
          timestamp,
        });
        
        return originalSend.call(this, messageWithTimestamp);
      };
      
      ws.addEventListener('message', (event) => {
        messagesReceived++;
        try {
          const data = JSON.parse(event.data);
          if (data.timestamp) {
            const latency = Date.now() - data.timestamp;
            totalLatency += latency;
          }
        } catch (e) {
          // Handle non-JSON messages
        }
      });
      
      return ws;
    };
    
    // Replace WebSocket constructor
    win.WebSocket = mockWebSocket as any;
  });
  
  // Trigger WebSocket activity
  cy.get('[data-testid="realtime-update-trigger"]').click();
  
  // Wait for messages to be exchanged
  cy.wait(2000);
  
  cy.then(() => {
    if (messagesReceived > 0) {
      const averageLatency = totalLatency / messagesReceived;
      expect(averageLatency).to.be.lessThan(expectedLatency);
      cy.log(`Average WebSocket latency: ${averageLatency.toFixed(2)}ms`);
    }
  });
});

// Resource usage monitoring
Cypress.Commands.add('measureMemoryUsage', () => {
  cy.window().then((win) => {
    if ('memory' in win.performance) {
      const memory = (win.performance as any).memory;
      
      const memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
      
      // Log memory usage
      cy.log('Memory Usage:', JSON.stringify(memoryInfo, null, 2));
      
      // Assert memory usage is within reasonable bounds
      const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      expect(memoryUsageMB).to.be.lessThan(100); // Less than 100MB
      
      return cy.wrap(memoryInfo);
    } else {
      cy.log('Memory API not available in this browser');
      return cy.wrap(null);
    }
  });
});

Cypress.Commands.add('measureNetworkRequests', () => {
  const networkRequests: NetworkRequest[] = [];
  
  cy.intercept('**', (req) => {
    const startTime = Date.now();
    
    req.continue((res) => {
      const endTime = Date.now();
      
      networkRequests.push({
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: endTime - startTime,
        requestSize: JSON.stringify(req.body || '').length,
        responseSize: res.body ? res.body.length : 0,
      });
    });
  });
  
  // Perform dashboard operations that trigger network requests
  cy.get('[data-testid="refresh-dashboard"]').click();
  cy.wait(3000); // Allow requests to complete
  
  cy.then(() => {
    // Analyze network performance
    const slowRequests = networkRequests.filter(req => req.responseTime > 1000);
    const failedRequests = networkRequests.filter(req => req.statusCode >= 400);
    
    // Log network statistics
    cy.log(`Total requests: ${networkRequests.length}`);
    cy.log(`Slow requests (>1s): ${slowRequests.length}`);
    cy.log(`Failed requests: ${failedRequests.length}`);
    
    // Assert performance standards
    expect(slowRequests.length).to.be.lessThan(networkRequests.length * 0.1); // Less than 10% slow
    expect(failedRequests.length).to.eq(0); // No failed requests
    
    return cy.wrap({
      totalRequests: networkRequests.length,
      slowRequests: slowRequests.length,
      failedRequests: failedRequests.length,
      requests: networkRequests,
    });
  });
});

// Dashboard-specific performance tests
Cypress.Commands.add('testDashboardLoadPerformance', (role: string) => {
  const startTime = Date.now();
  
  // Navigate to role-specific dashboard
  cy.loginAsRole(role);
  
  // Measure initial load
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  
  const loadTime = Date.now() - startTime;
  const threshold = Cypress.env('dashboardLoadThreshold');
  
  expect(loadTime).to.be.lessThan(threshold);
  cy.log(`${role} dashboard loaded in ${loadTime}ms`);
  
  // Measure critical resources
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      firstByte: navigation.responseStart - navigation.requestStart,
      domInteractive: navigation.domInteractive - navigation.navigationStart,
      loadComplete: navigation.loadEventEnd - navigation.navigationStart,
    };
    
    cy.log('Dashboard Load Metrics:', JSON.stringify(metrics, null, 2));
    
    // Assert critical metrics
    expect(metrics.firstByte).to.be.lessThan(500); // TTFB < 500ms
    expect(metrics.domInteractive).to.be.lessThan(1500); // Interactive < 1.5s
    
    return cy.wrap(metrics);
  });
});

Cypress.Commands.add('testConcurrentUserLoad', (userCount = 5) => {
  const performanceResults: any[] = [];
  
  // Simulate multiple concurrent users
  for (let i = 0; i < userCount; i++) {
    cy.window().then((win) => {
      const iframe = win.document.createElement('iframe');
      iframe.src = win.location.href;
      iframe.style.display = 'none';
      win.document.body.appendChild(iframe);
      
      iframe.onload = () => {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          const navigation = iframeWindow.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          performanceResults.push({
            userId: i + 1,
            loadTime: navigation.loadEventEnd - navigation.navigationStart,
          });
        }
      };
    });
  }
  
  // Wait for all loads to complete
  cy.wait(10000);
  
  cy.then(() => {
    if (performanceResults.length > 0) {
      const averageLoadTime = performanceResults.reduce((sum, result) => sum + result.loadTime, 0) / performanceResults.length;
      const maxLoadTime = Math.max(...performanceResults.map(r => r.loadTime));
      
      cy.log(`Concurrent Load Test Results:`);
      cy.log(`Average Load Time: ${averageLoadTime.toFixed(2)}ms`);
      cy.log(`Max Load Time: ${maxLoadTime.toFixed(2)}ms`);
      
      // Assert performance under load
      expect(averageLoadTime).to.be.lessThan(Cypress.env('dashboardLoadThreshold') * 1.5);
      expect(maxLoadTime).to.be.lessThan(Cypress.env('dashboardLoadThreshold') * 2);
    }
    
    return cy.wrap(performanceResults);
  });
});

// Performance regression testing
Cypress.Commands.add('benchmarkDashboardPerformance', () => {
  const benchmark = {
    timestamp: Date.now(),
    role: 'admin', // Default role for benchmarking
    metrics: {} as any,
  };
  
  // Measure dashboard load performance
  cy.testDashboardLoadPerformance('admin').then((loadMetrics) => {
    benchmark.metrics.loadPerformance = loadMetrics;
  });
  
  // Measure navigation performance
  cy.get('[data-testid="fleet-management"]').click();
  cy.measureNavigationSpeed(1000).then((navTime) => {
    benchmark.metrics.navigationTime = navTime;
  });
  
  // Measure chart rendering performance
  cy.measureChartRenderTime('[data-testid="performance-chart"]', 2000).then((chartTime) => {
    benchmark.metrics.chartRenderTime = chartTime;
  });
  
  // Measure memory usage
  cy.measureMemoryUsage().then((memoryInfo) => {
    benchmark.metrics.memoryUsage = memoryInfo;
  });
  
  cy.then(() => {
    // Store benchmark results
    cy.task('storeBenchmark', benchmark);
    cy.log('Performance benchmark completed:', JSON.stringify(benchmark, null, 2));
    
    return cy.wrap(benchmark);
  });
});

// Interface definitions
interface NetworkRequest {
  url: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
}

// Declare additional performance commands
declare global {
  namespace Cypress {
    interface Chainable {
      measureNavigationSpeed(threshold?: number): Chainable<number>;
      measureAPIResponseTime(apiEndpoint: string, threshold?: number): Chainable<number>;
      measureChartRenderTime(chartSelector: string, threshold?: number): Chainable<number>;
      monitorWebSocketLatency(expectedLatency?: number): Chainable<Element>;
      measureMemoryUsage(): Chainable<any>;
      measureNetworkRequests(): Chainable<any>;
      testDashboardLoadPerformance(role: string): Chainable<any>;
      testConcurrentUserLoad(userCount?: number): Chainable<any>;
      benchmarkDashboardPerformance(): Chainable<any>;
    }
  }
}