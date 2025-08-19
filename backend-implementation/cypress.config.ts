/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS E2E DASHBOARD TESTING CONFIGURATION
 * ============================================================================
 *
 * Comprehensive Cypress configuration for end-to-end dashboard testing across
 * all user roles, workflows, and business processes. Supports multi-environment
 * testing with performance monitoring and accessibility validation.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Base configuration
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    downloadsFolder: 'cypress/downloads',
    fixturesFolder: 'cypress/fixtures',
    
    // Dashboard testing optimizations
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: 15,
    screenshotOnRunFailure: true,
    
    // Timeouts for dashboard operations
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    
    // Performance monitoring
    taskTimeout: 60000,
    execTimeout: 60000,
    
    // Test isolation and cleanup
    testIsolation: true,
    
    // Environment variables for multi-environment testing
    env: {
      // Backend API configuration
      apiUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001',
      
      // Authentication configuration
      testUserEmail: 'cypress@test.com',
      testUserPassword: 'CypressTest123!',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      
      // Test data configuration
      testOrgId: '00000000-0000-0000-0000-000000000001',
      testCustomerId: '00000000-0000-0000-0000-000000000002',
      
      // Performance thresholds
      dashboardLoadThreshold: 2000, // 2 seconds
      navigationThreshold: 1000,    // 1 second
      realtimeUpdateThreshold: 100, // 100ms
      
      // Mobile breakpoints
      mobileWidth: 375,
      tabletWidth: 768,
      desktopWidth: 1280,
      
      // Accessibility configuration
      a11yStandard: 'WCAG21AA',
      
      // Feature flags
      enableWebSocket: true,
      enablePerformanceMonitoring: true,
      enableAccessibilityTesting: true,
      enableMobileResponsiveness: true,
    },
    
    setupNodeEvents(on, config) {
      // Performance monitoring plugin
      on('task', {
        performanceMetrics() {
          return {
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
          };
        },
      });
      
      // Screenshot management
      on('after:screenshot', (details) => {
        console.log('Screenshot taken:', details.path);
      });
      
      // Browser performance monitoring
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Enable Chrome DevTools Protocol for performance monitoring
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-web-security');
          launchOptions.args.push('--allow-running-insecure-content');
        }
        return launchOptions;
      });
      
      // Test result reporting
      on('after:run', (results) => {
        console.log('Dashboard E2E Test Results:', {
          totalTests: results.totalTests,
          totalPassed: results.totalPassed,
          totalFailed: results.totalFailed,
          totalDuration: results.totalDuration,
          browsers: results.browserName,
        });
      });
      
      // Dynamic configuration based on environment
      if (config.env.CI) {
        // CI environment optimizations
        config.video = false;
        config.screenshotOnRunFailure = true;
        config.viewportWidth = 1920;
        config.viewportHeight = 1080;
      }
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
  
  // Reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'cypress/reporter-config.json',
  },
  
  // Global configuration
  chromeWebSecurity: false,
  modifyObstructiveCode: false,
  experimentalStudio: true,
  experimentalWebKitSupport: true,
  
  // Retry configuration for dashboard tests
  retries: {
    runMode: 2,
    openMode: 0,
  },
  
  // Exclude patterns
  excludeSpecPattern: [
    '**/__snapshots__/*',
    '**/__image_snapshots__/*',
  ],
});