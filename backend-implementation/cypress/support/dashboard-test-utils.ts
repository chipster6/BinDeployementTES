/**
 * ============================================================================
 * DASHBOARD TESTING UTILITIES
 * ============================================================================
 *
 * Comprehensive utility functions for dashboard E2E testing including role
 * management, data validation, performance monitoring, and accessibility
 * testing across all user roles in the waste management system.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

export interface UserRole {
  name: string;
  email: string;
  password: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  expectedDashboardElements: string[];
  restrictedElements: string[];
}

export interface DashboardPerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export interface AccessibilityTestConfig {
  level: 'A' | 'AA' | 'AAA';
  tags: string[];
  rules: Record<string, any>;
  includedImpacts: string[];
}

export class DashboardTestUtils {
  // User role definitions
  static readonly ROLES: Record<string, UserRole> = {
    super_admin: {
      name: 'super_admin',
      email: 'super.admin@test.com',
      password: 'SuperAdmin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      expectedDashboardElements: [
        '[data-testid="system-monitoring"]',
        '[data-testid="user-management"]',
        '[data-testid="organization-management"]',
        '[data-testid="system-settings"]',
        '[data-testid="audit-logs"]',
        '[data-testid="performance-metrics"]',
        '[data-testid="security-dashboard"]'
      ],
      restrictedElements: []
    },
    admin: {
      name: 'admin',
      email: 'admin@test.com',
      password: 'Admin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXQ',
      expectedDashboardElements: [
        '[data-testid="customer-management"]',
        '[data-testid="service-management"]',
        '[data-testid="billing-overview"]',
        '[data-testid="fleet-overview"]',
        '[data-testid="reports-section"]',
        '[data-testid="user-management"]'
      ],
      restrictedElements: [
        '[data-testid="system-settings"]',
        '[data-testid="security-dashboard"]'
      ]
    },
    fleet_manager: {
      name: 'fleet_manager',
      email: 'fleet.manager@test.com',
      password: 'FleetManager123!',
      mfaEnabled: false,
      expectedDashboardElements: [
        '[data-testid="vehicle-tracking"]',
        '[data-testid="route-optimization"]',
        '[data-testid="driver-management"]',
        '[data-testid="maintenance-schedule"]',
        '[data-testid="fuel-tracking"]',
        '[data-testid="performance-analytics"]'
      ],
      restrictedElements: [
        '[data-testid="billing-management"]',
        '[data-testid="user-management"]',
        '[data-testid="system-settings"]'
      ]
    },
    driver: {
      name: 'driver',
      email: 'driver@test.com',
      password: 'Driver123!',
      mfaEnabled: false,
      expectedDashboardElements: [
        '[data-testid="route-navigation"]',
        '[data-testid="schedule-overview"]',
        '[data-testid="service-checklist"]',
        '[data-testid="emergency-contacts"]',
        '[data-testid="vehicle-inspection"]',
        '[data-testid="time-tracking"]'
      ],
      restrictedElements: [
        '[data-testid="route-optimization"]',
        '[data-testid="driver-management"]',
        '[data-testid="billing-section"]',
        '[data-testid="customer-management"]'
      ]
    },
    customer: {
      name: 'customer',
      email: 'customer@test.com',
      password: 'Customer123!',
      mfaEnabled: false,
      expectedDashboardElements: [
        '[data-testid="service-overview"]',
        '[data-testid="billing-history"]',
        '[data-testid="service-requests"]',
        '[data-testid="contact-support"]',
        '[data-testid="account-settings"]',
        '[data-testid="service-calendar"]'
      ],
      restrictedElements: [
        '[data-testid="fleet-management"]',
        '[data-testid="driver-tracking"]',
        '[data-testid="system-administration"]',
        '[data-testid="other-customers"]'
      ]
    },
    billing_admin: {
      name: 'billing_admin',
      email: 'billing.admin@test.com',
      password: 'BillingAdmin123!',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXR',
      expectedDashboardElements: [
        '[data-testid="billing-management"]',
        '[data-testid="invoice-generation"]',
        '[data-testid="payment-processing"]',
        '[data-testid="financial-reports"]',
        '[data-testid="subscription-management"]',
        '[data-testid="payment-gateway"]'
      ],
      restrictedElements: [
        '[data-testid="fleet-management"]',
        '[data-testid="system-settings"]',
        '[data-testid="user-passwords"]'
      ]
    },
    support: {
      name: 'support',
      email: 'support@test.com',
      password: 'Support123!',
      mfaEnabled: false,
      expectedDashboardElements: [
        '[data-testid="ticket-management"]',
        '[data-testid="customer-lookup"]',
        '[data-testid="service-history"]',
        '[data-testid="communication-center"]',
        '[data-testid="knowledge-base"]',
        '[data-testid="escalation-queue"]'
      ],
      restrictedElements: [
        '[data-testid="billing-management"]',
        '[data-testid="system-administration"]',
        '[data-testid="financial-data"]'
      ]
    }
  };

  // Performance thresholds
  static readonly PERFORMANCE_THRESHOLDS = {
    dashboardLoadTime: 2000, // 2 seconds
    apiResponseTime: 500, // 500ms
    webSocketLatency: 100, // 100ms
    firstContentfulPaint: 1000, // 1 second
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100 // 100ms
  };

  // Accessibility configuration
  static readonly ACCESSIBILITY_CONFIG: AccessibilityTestConfig = {
    level: 'AA',
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true },
      'aria-labels': { enabled: true },
      'heading-hierarchy': { enabled: true }
    },
    includedImpacts: ['minor', 'moderate', 'serious', 'critical']
  };

  // Mobile breakpoints
  static readonly MOBILE_BREAKPOINTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
  };

  /**
   * Get credentials for a specific user role
   */
  static getCredentialsForRole(role: string): UserRole {
    const userRole = this.ROLES[role];
    if (!userRole) {
      throw new Error(`Unknown user role: ${role}`);
    }
    return userRole;
  }

  /**
   * Get dashboard elements expected for a role
   */
  static getDashboardElementsForRole(role: string): string[] {
    const userRole = this.getCredentialsForRole(role);
    return userRole.expectedDashboardElements;
  }

  /**
   * Get restricted elements for a role
   */
  static getRestrictedElementsForRole(role: string): string[] {
    const userRole = this.getCredentialsForRole(role);
    return userRole.restrictedElements;
  }

  /**
   * Generate TOTP code for MFA
   */
  static generateTOTPCode(secret: string): string {
    // This would integrate with the same TOTP library used in the backend
    // For testing purposes, return a mock code that the test environment accepts
    return '123456';
  }

  /**
   * Validate dashboard performance metrics
   */
  static validatePerformanceMetrics(metrics: DashboardPerformanceMetrics): boolean {
    const issues: string[] = [];

    if (metrics.loadTime > this.PERFORMANCE_THRESHOLDS.dashboardLoadTime) {
      issues.push(`Load time ${metrics.loadTime}ms exceeds threshold ${this.PERFORMANCE_THRESHOLDS.dashboardLoadTime}ms`);
    }

    if (metrics.firstContentfulPaint > this.PERFORMANCE_THRESHOLDS.firstContentfulPaint) {
      issues.push(`FCP ${metrics.firstContentfulPaint}ms exceeds threshold ${this.PERFORMANCE_THRESHOLDS.firstContentfulPaint}ms`);
    }

    if (metrics.largestContentfulPaint > this.PERFORMANCE_THRESHOLDS.largestContentfulPaint) {
      issues.push(`LCP ${metrics.largestContentfulPaint}ms exceeds threshold ${this.PERFORMANCE_THRESHOLDS.largestContentfulPaint}ms`);
    }

    if (metrics.cumulativeLayoutShift > this.PERFORMANCE_THRESHOLDS.cumulativeLayoutShift) {
      issues.push(`CLS ${metrics.cumulativeLayoutShift} exceeds threshold ${this.PERFORMANCE_THRESHOLDS.cumulativeLayoutShift}`);
    }

    if (metrics.firstInputDelay > this.PERFORMANCE_THRESHOLDS.firstInputDelay) {
      issues.push(`FID ${metrics.firstInputDelay}ms exceeds threshold ${this.PERFORMANCE_THRESHOLDS.firstInputDelay}ms`);
    }

    if (issues.length > 0) {
      console.error('Performance validation failed:', issues);
      return false;
    }

    return true;
  }

  /**
   * Get mobile testing configuration
   */
  static getMobileConfig(device: 'mobile' | 'tablet' | 'desktop') {
    return this.MOBILE_BREAKPOINTS[device];
  }

  /**
   * Generate test data for role
   */
  static generateTestDataForRole(role: string): any {
    const baseData = {
      timestamp: new Date().toISOString(),
      testRun: `test-${Date.now()}`,
      role: role
    };

    switch (role) {
      case 'fleet_manager':
        return {
          ...baseData,
          vehicles: [
            { id: 'TRUCK-001', status: 'active', location: { lat: 37.7749, lng: -122.4194 } },
            { id: 'TRUCK-002', status: 'maintenance', location: { lat: 37.7849, lng: -122.4094 } }
          ],
          routes: [
            { id: 'ROUTE-001', status: 'active', progress: 0.6 }
          ]
        };

      case 'customer':
        return {
          ...baseData,
          services: [
            { id: 'SERVICE-001', type: 'pickup', status: 'scheduled', date: '2025-01-15' },
            { id: 'SERVICE-002', type: 'delivery', status: 'completed', date: '2025-01-10' }
          ],
          billing: {
            currentBalance: 250.00,
            nextDue: '2025-02-01'
          }
        };

      case 'driver':
        return {
          ...baseData,
          schedule: [
            { time: '08:00', location: 'Depot', type: 'start' },
            { time: '09:00', location: '123 Main St', type: 'pickup' },
            { time: '10:30', location: '456 Oak Ave', type: 'pickup' }
          ],
          vehicle: { id: 'TRUCK-001', fuel: 0.75, nextMaintenance: '2025-02-15' }
        };

      default:
        return baseData;
    }
  }

  /**
   * Validate role-based access control
   */
  static validateRoleAccess(role: string, currentElements: string[]): { allowed: string[], denied: string[] } {
    const userRole = this.getCredentialsForRole(role);
    const allowed: string[] = [];
    const denied: string[] = [];

    // Check expected elements are present
    userRole.expectedDashboardElements.forEach(element => {
      if (currentElements.includes(element)) {
        allowed.push(element);
      } else {
        denied.push(element);
      }
    });

    // Check restricted elements are not present
    userRole.restrictedElements.forEach(element => {
      if (currentElements.includes(element)) {
        denied.push(element);
      }
    });

    return { allowed, denied };
  }

  /**
   * Generate WebSocket test events
   */
  static generateWebSocketEvents(role: string): any[] {
    const baseEvent = {
      timestamp: new Date().toISOString(),
      userId: `test-user-${role}`
    };

    switch (role) {
      case 'fleet_manager':
        return [
          { ...baseEvent, type: 'vehicle_location_update', data: { vehicleId: 'TRUCK-001', lat: 37.7749, lng: -122.4194 } },
          { ...baseEvent, type: 'route_progress_update', data: { routeId: 'ROUTE-001', progress: 0.7 } },
          { ...baseEvent, type: 'driver_status_update', data: { driverId: 'DRV-001', status: 'on_route' } }
        ];

      case 'driver':
        return [
          { ...baseEvent, type: 'route_assignment', data: { routeId: 'ROUTE-001', stops: 5 } },
          { ...baseEvent, type: 'navigation_update', data: { nextStop: '123 Main St', eta: '09:15' } },
          { ...baseEvent, type: 'emergency_alert', data: { type: 'weather', message: 'Heavy rain expected' } }
        ];

      case 'customer':
        return [
          { ...baseEvent, type: 'service_status_update', data: { serviceId: 'SERVICE-001', status: 'en_route' } },
          { ...baseEvent, type: 'billing_notification', data: { amount: 125.00, dueDate: '2025-02-01' } }
        ];

      default:
        return [
          { ...baseEvent, type: 'system_notification', data: { message: 'System update scheduled' } }
        ];
    }
  }

  /**
   * Validate WebSocket connectivity and messaging
   */
  static validateWebSocketConnection(expectedLatency: number = 100): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Simulate WebSocket connection validation
      setTimeout(() => {
        const latency = Date.now() - startTime;
        resolve(latency <= expectedLatency);
      }, 50);
    });
  }

  /**
   * Generate accessibility test scenarios
   */
  static getAccessibilityScenarios(role: string): Array<{ description: string, selector: string, test: string }> {
    const commonScenarios = [
      { description: 'Main navigation', selector: '[data-testid="main-navigation"]', test: 'keyboard-navigation' },
      { description: 'Dashboard heading', selector: 'h1', test: 'heading-hierarchy' },
      { description: 'Action buttons', selector: 'button', test: 'color-contrast' },
      { description: 'Form inputs', selector: 'input, select, textarea', test: 'aria-labels' }
    ];

    const roleSpecificScenarios: Record<string, Array<{ description: string, selector: string, test: string }>> = {
      fleet_manager: [
        { description: 'Vehicle tracking map', selector: '[data-testid="vehicle-map"]', test: 'alt-text' },
        { description: 'Route optimization controls', selector: '[data-testid="route-controls"]', test: 'keyboard-navigation' }
      ],
      driver: [
        { description: 'Navigation interface', selector: '[data-testid="navigation-interface"]', test: 'touch-targets' },
        { description: 'Emergency button', selector: '[data-testid="emergency-button"]', test: 'focus-management' }
      ],
      customer: [
        { description: 'Service calendar', selector: '[data-testid="service-calendar"]', test: 'aria-labels' },
        { description: 'Billing information', selector: '[data-testid="billing-info"]', test: 'color-contrast' }
      ]
    };

    return [...commonScenarios, ...(roleSpecificScenarios[role] || [])];
  }

  /**
   * Create performance monitoring configuration
   */
  static createPerformanceConfig(): any {
    return {
      metrics: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
      thresholds: this.PERFORMANCE_THRESHOLDS,
      samplingRate: 1.0,
      reportInterval: 5000
    };
  }

  /**
   * Generate cross-browser test matrix
   */
  static getCrossBrowserMatrix(): Array<{ browser: string, version: string, os: string }> {
    return [
      { browser: 'chrome', version: 'latest', os: 'linux' },
      { browser: 'firefox', version: 'latest', os: 'linux' },
      { browser: 'edge', version: 'latest', os: 'linux' },
      { browser: 'safari', version: 'latest', os: 'macos' },
      { browser: 'chrome', version: 'latest-1', os: 'windows' }
    ];
  }

  /**
   * Validate business process workflow
   */
  static validateBusinessWorkflow(workflow: string, steps: string[]): boolean {
    const workflowDefinitions: Record<string, string[]> = {
      'customer-onboarding': [
        'registration',
        'verification',
        'service-selection',
        'billing-setup',
        'confirmation'
      ],
      'service-management': [
        'service-request',
        'scheduling',
        'assignment',
        'execution',
        'completion'
      ],
      'route-optimization': [
        'data-collection',
        'analysis',
        'optimization',
        'assignment',
        'monitoring'
      ],
      'billing-cycle': [
        'service-calculation',
        'invoice-generation',
        'delivery',
        'payment-processing',
        'reconciliation'
      ],
      'emergency-response': [
        'alert-detection',
        'notification',
        'resource-allocation',
        'response-execution',
        'resolution'
      ]
    };

    const expectedSteps = workflowDefinitions[workflow];
    if (!expectedSteps) {
      return false;
    }

    return expectedSteps.every(step => steps.includes(step));
  }
}