/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - WCAG COMPLIANCE E2E TESTS
 * ============================================================================
 *
 * Comprehensive accessibility testing for WCAG 2.1 AA compliance including
 * keyboard navigation, screen reader support, color contrast, focus management,
 * and inclusive design validation across all user dashboards.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import { DashboardTestUtils } from '../../support/e2e';

describe('WCAG 2.1 AA Compliance Testing', () => {
  beforeEach(() => {
    // Clean and seed accessibility test data
    cy.cleanDatabase();
    cy.seedDatabase('accessibility_test');
    
    // Inject axe-core for accessibility testing
    cy.injectAxe();
  });

  afterEach(() => {
    // Clean up test data
    cy.cleanDatabase();
  });

  context('WCAG 2.1 Level AA Compliance', () => {
    it('should pass WCAG AA validation for all user role dashboards', () => {
      Object.values(DashboardTestUtils.ROLES).forEach((role) => {
        cy.loginAsRole(role);
        
        // Validate main dashboard
        cy.validateWCAG('AA');
        
        // Test role-specific sections
        if (role === 'super_admin') {
          cy.get('[data-testid="system-monitoring"]').click();
          cy.validateWCAG('AA');
          
          cy.get('[data-testid="user-management"]').click();
          cy.validateWCAG('AA');
        } else if (role === 'fleet_manager') {
          cy.get('[data-testid="vehicle-tracking"]').click();
          cy.validateWCAG('AA');
          
          cy.get('[data-testid="route-optimization"]').click();
          cy.validateWCAG('AA');
        } else if (role === 'driver') {
          cy.get('[data-testid="route-navigation"]').click();
          cy.validateWCAG('AA');
        } else if (role === 'customer') {
          cy.get('[data-testid="service-history"]').click();
          cy.validateWCAG('AA');
        }
        
        cy.logout();
      });
    });

    it('should pass color contrast requirements', () => {
      cy.loginAsRole('admin');
      
      // Test color contrast on all interface elements
      cy.testColorContrast();
      
      // Test specific high-visibility elements
      cy.get('[data-testid="alert-critical"]').then(($alert) => {
        if ($alert.length > 0) {
          cy.checkA11y('[data-testid="alert-critical"]', {
            runOnly: {
              type: 'tag',
              values: ['color-contrast'],
            },
          });
        }
      });
      
      // Test status indicators
      cy.get('[data-testid="status-indicator"]').each(($indicator) => {
        cy.wrap($indicator).then(() => {
          cy.checkA11y($indicator[0], {
            runOnly: {
              type: 'tag', 
              values: ['color-contrast'],
            },
          });
        });
      });
      
      // Test chart colors
      cy.get('[data-testid="performance-chart"]').then(($chart) => {
        if ($chart.length > 0) {
          cy.checkA11y('[data-testid="performance-chart"]', {
            runOnly: {
              type: 'tag',
              values: ['color-contrast'],
            },
          });
        }
      });
    });

    it('should provide proper semantic structure', () => {
      cy.loginAsRole('admin');
      
      // Test heading hierarchy
      cy.get('h1').should('have.length', 1);
      cy.get('h1').should('contain.text', 'Dashboard'); // Main page heading
      
      // Check heading order
      let lastLevel = 0;
      cy.get('h1, h2, h3, h4, h5, h6').each(($heading) => {
        const level = parseInt($heading.prop('tagName').charAt(1));
        if (lastLevel > 0) {
          expect(level).to.be.at.most(lastLevel + 1);
        }
        lastLevel = level;
      });
      
      // Test landmark regions
      cy.get('header, [role="banner"]').should('exist');
      cy.get('nav, [role="navigation"]').should('exist');
      cy.get('main, [role="main"]').should('exist');
      cy.get('footer, [role="contentinfo"]').should('exist');
      
      // Test ARIA landmarks
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['landmark-one-main', 'region'],
        },
      });
    });

    it('should provide accessible form controls', () => {
      cy.loginAsRole('admin');
      
      // Navigate to form-heavy section
      cy.get('[data-testid="add-customer"]').click();
      
      // Test form labels
      cy.get('input, select, textarea').each(($input) => {
        const id = $input.attr('id');
        const ariaLabel = $input.attr('aria-label');
        const ariaLabelledBy = $input.attr('aria-labelledby');
        
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        } else {
          expect(ariaLabel || ariaLabelledBy).to.exist;
        }
      });
      
      // Test required field indicators
      cy.get('input[required], select[required], textarea[required]').each(($field) => {
        const ariaRequired = $field.attr('aria-required');
        const hasRequiredIndicator = $field.closest('.field-container').find('.required-indicator').length > 0;
        
        expect(ariaRequired === 'true' || hasRequiredIndicator).to.be.true;
      });
      
      // Test error message associations
      cy.get('[data-testid="submit-customer"]').click(); // Trigger validation
      
      cy.get('.error-message').each(($error) => {
        const errorId = $error.attr('id');
        if (errorId) {
          cy.get(`[aria-describedby*="${errorId}"]`).should('exist');
        }
      });
    });
  });

  context('Keyboard Navigation Testing', () => {
    it('should support complete keyboard navigation', () => {
      cy.loginAsRole('admin');
      
      // Test keyboard navigation
      cy.testKeyboardNavigation();
      
      // Test specific navigation patterns
      cy.get('body').tab(); // Start tabbing
      cy.focused().should('exist');
      
      // Test skip links
      cy.get('body').type('{tab}');
      cy.focused().then(($focused) => {
        if ($focused.text().includes('Skip to main content')) {
          cy.focused().type('{enter}');
          cy.focused().should('be.inside', 'main');
        }
      });
      
      // Test menu navigation
      cy.get('[data-testid="main-menu"] a').first().focus();
      cy.focused().type('{downarrow}');
      cy.focused().should('not.be', '[data-testid="main-menu"] a:first');
    });

    it('should handle modal focus management', () => {
      cy.loginAsRole('admin');
      
      // Open modal
      cy.get('[data-testid="open-modal"]').click();
      
      // Focus should move to modal
      cy.get('[role="dialog"]').should('be.visible');
      cy.focused().should('be.inside', '[role="dialog"]');
      
      // Tab should stay within modal
      cy.focused().tab();
      cy.focused().should('be.inside', '[role="dialog"]');
      
      // Test modal close with escape
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');
      
      // Focus should return to trigger
      cy.get('[data-testid="open-modal"]').should('have.focus');
    });

    it('should provide accessible dropdown navigation', () => {
      cy.loginAsRole('admin');
      
      // Test dropdown menu
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="user-dropdown"]').should('be.visible');
      
      // Test arrow key navigation
      cy.get('[data-testid="user-menu"]').type('{downarrow}');
      cy.focused().should('have.attr', 'role', 'menuitem');
      
      // Test menu item selection
      cy.focused().type('{enter}');
      
      // Menu should close
      cy.get('[data-testid="user-dropdown"]').should('not.be.visible');
    });

    it('should handle data table keyboard navigation', () => {
      cy.loginAsRole('admin');
      cy.get('[data-testid="customer-management"]').click();
      
      // Focus on table
      cy.get('[data-testid="customers-table"]').focus();
      
      // Test table navigation
      cy.get('[data-testid="customers-table"] tbody tr').first().focus();
      cy.focused().type('{downarrow}');
      cy.focused().should('not.be', '[data-testid="customers-table"] tbody tr:first');
      
      // Test row activation
      cy.focused().type('{enter}');
      cy.get('[data-testid="customer-details"]').should('be.visible');
    });
  });

  context('Screen Reader Support', () => {
    it('should provide comprehensive screen reader support', () => {
      cy.loginAsRole('fleet_manager');
      
      // Test screen reader structure
      cy.testScreenReaderSupport();
      
      // Test specific ARIA implementations
      cy.get('[role="tablist"]').then(($tablist) => {
        if ($tablist.length > 0) {
          // Test tab controls
          cy.wrap($tablist).find('[role="tab"]').should('have.attr', 'aria-controls');
          cy.wrap($tablist).find('[role="tab"][aria-selected="true"]').should('exist');
          
          // Test tabpanels
          cy.get('[role="tabpanel"]').should('have.attr', 'aria-labelledby');
        }
      });
      
      // Test live regions for dynamic content
      cy.get('[aria-live="polite"], [aria-live="assertive"]').should('exist');
      
      // Test status updates
      cy.simulateGPSUpdate({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5,
      });
      
      cy.get('[data-testid="status-update"]').should('have.attr', 'aria-live');
    });

    it('should provide meaningful alternative text', () => {
      cy.loginAsRole('customer');
      
      // Test alternative text
      cy.testAlternativeText();
      
      // Test specific image types
      cy.get('[data-testid="service-photo"]').each(($img) => {
        const alt = $img.attr('alt');
        expect(alt).to.exist;
        expect(alt).to.have.length.at.least(10); // Meaningful description
      });
      
      // Test icon labels
      cy.get('[data-testid*="icon"]').each(($icon) => {
        const ariaLabel = $icon.attr('aria-label');
        const ariaHidden = $icon.attr('aria-hidden');
        const title = $icon.attr('title');
        
        if (ariaHidden !== 'true') {
          expect(ariaLabel || title).to.exist;
        }
      });
    });

    it('should announce dynamic content changes', () => {
      cy.loginAsRole('driver');
      
      // Test route updates
      cy.get('[data-testid="route-updates"]').should('have.attr', 'aria-live', 'polite');
      
      // Simulate route change
      cy.apiRequest('POST', '/api/test/route-update', {
        body: { routeId: 'test-route', status: 'updated' },
      });
      
      // Verify announcement
      cy.get('[data-testid="route-announcement"]')
        .should('be.visible')
        .and('contain', 'Route has been updated');
      
      // Test alert announcements
      cy.get('[data-testid="alert-region"]').should('have.attr', 'aria-live', 'assertive');
    });
  });

  context('Focus Management', () => {
    it('should manage focus appropriately', () => {
      cy.loginAsRole('admin');
      
      // Test focus management
      cy.testFocusManagement();
      
      // Test page load focus
      cy.get('h1, [role="main"]').first().should('have.focus');
      
      // Test error focus management
      cy.get('[data-testid="add-customer"]').click();
      cy.get('[data-testid="submit-customer"]').click(); // Trigger validation
      
      // Focus should move to first error
      cy.get('.error').first().should('have.focus');
    });

    it('should provide visible focus indicators', () => {
      cy.loginAsRole('admin');
      
      // Test focus indicators
      cy.get('button, a, input, select, textarea, [tabindex="0"]').each(($element) => {
        cy.wrap($element).focus();
        
        // Check for visible focus indicator
        cy.wrap($element).should(($el) => {
          const styles = window.getComputedStyle($el[0]);
          const outline = styles.outline;
          const boxShadow = styles.boxShadow;
          
          // Should have outline or box-shadow for focus
          expect(outline !== 'none' || boxShadow !== 'none').to.be.true;
        });
      });
    });

    it('should handle focus trap in modals', () => {
      cy.loginAsRole('admin');
      
      // Open modal
      cy.get('[data-testid="open-settings"]').click();
      cy.get('[role="dialog"]').should('be.visible');
      
      // Find first and last focusable elements
      cy.get('[role="dialog"]').within(() => {
        cy.get('button, input, select, textarea, [tabindex="0"]').first().as('firstFocusable');
        cy.get('button, input, select, textarea, [tabindex="0"]').last().as('lastFocusable');
      });
      
      // Tab from last element should go to first
      cy.get('@lastFocusable').focus().tab();
      cy.get('@firstFocusable').should('have.focus');
      
      // Shift+tab from first should go to last
      cy.get('@firstFocusable').focus().tab({ shift: true });
      cy.get('@lastFocusable').should('have.focus');
    });
  });

  context('Mobile Accessibility', () => {
    it('should provide mobile accessibility support', () => {
      cy.testMobileAccessibility();
      
      // Test touch target sizes
      cy.viewport(375, 667);
      cy.loginAsRole('driver');
      
      cy.get('button, a, input, [role="button"]').each(($element) => {
        cy.wrap($element).then(($el) => {
          const rect = $el[0].getBoundingClientRect();
          
          // Touch targets should be at least 44x44px
          expect(rect.width).to.be.at.least(44);
          expect(rect.height).to.be.at.least(44);
        });
      });
      
      // Test mobile navigation accessibility
      cy.get('[data-testid="mobile-menu-toggle"]').should('have.attr', 'aria-expanded');
      cy.get('[data-testid="mobile-menu-toggle"]').click();
      cy.get('[data-testid="mobile-menu-toggle"]').should('have.attr', 'aria-expanded', 'true');
    });

    it('should support mobile screen readers', () => {
      cy.viewport(375, 667);
      cy.loginAsRole('customer');
      
      // Test mobile-specific ARIA labels
      cy.get('[data-testid="mobile-navigation"]').should('have.attr', 'aria-label');
      
      // Test swipe gesture alternatives
      cy.get('[data-testid="swipeable-content"]').then(($content) => {
        if ($content.length > 0) {
          // Should have button alternatives for swipe actions
          cy.get('[data-testid="swipe-left-button"]').should('exist');
          cy.get('[data-testid="swipe-right-button"]').should('exist');
        }
      });
    });
  });

  context('High Contrast and Visual Accessibility', () => {
    it('should support high contrast mode', () => {
      cy.loginAsRole('admin');
      
      // Simulate high contrast mode
      cy.get('body').invoke('addClass', 'high-contrast');
      
      // Test visibility in high contrast
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
      cy.get('button, a').should('be.visible');
      
      // Test focus indicators in high contrast
      cy.get('button').first().focus();
      cy.focused().should('be.visible');
      
      // Remove high contrast class
      cy.get('body').invoke('removeClass', 'high-contrast');
    });

    it('should support reduced motion preferences', () => {
      // Simulate reduced motion preference
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => {},
          }),
        });
      });
      
      cy.loginAsRole('fleet_manager');
      
      // Verify animations are reduced
      cy.get('[data-testid="animated-element"]').then(($element) => {
        if ($element.length > 0) {
          cy.wrap($element).should('have.css', 'animation-duration', '0.01ms');
        }
      });
    });

    it('should provide zoom and scaling support', () => {
      cy.loginAsRole('customer');
      
      // Test 200% zoom (WCAG requirement)
      cy.viewport(640, 480); // Simulate 200% zoom on 1280x960
      
      // Content should remain usable
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
      cy.get('[data-testid="navigation-menu"]').should('be.visible');
      
      // Text should remain readable
      cy.get('p, div').first().should('have.css', 'font-size').and('match', /\d+px/);
      
      // Interactive elements should remain accessible
      cy.get('button').first().click();
    });
  });

  context('Error Handling and User Guidance', () => {
    it('should provide accessible error messages', () => {
      cy.loginAsRole('admin');
      cy.get('[data-testid="add-customer"]').click();
      
      // Trigger validation errors
      cy.get('[data-testid="submit-customer"]').click();
      
      // Test error message accessibility
      cy.get('[role="alert"]').should('exist');
      cy.get('.error-message').each(($error) => {
        // Error should be associated with field
        const errorId = $error.attr('id');
        if (errorId) {
          cy.get(`[aria-describedby*="${errorId}"]`).should('exist');
        }
      });
      
      // Test error summary
      cy.get('[data-testid="error-summary"]').should('have.attr', 'role', 'alert');
    });

    it('should provide helpful guidance', () => {
      cy.loginAsRole('customer');
      
      // Test help text
      cy.get('[data-testid="complex-form"]').then(($form) => {
        if ($form.length > 0) {
          cy.get('[aria-describedby]').each(($field) => {
            const describedBy = $field.attr('aria-describedby');
            if (describedBy) {
              cy.get(`#${describedBy}`).should('exist');
            }
          });
        }
      });
      
      // Test instructional text
      cy.get('[data-testid="form-instructions"]').should('be.visible');
    });
  });

  context('Comprehensive Accessibility Audit', () => {
    it('should pass complete accessibility audit for critical user flows', () => {
      // Test complete customer service flow
      cy.loginAsRole('customer');
      
      // Step 1: Dashboard access
      cy.validateWCAG('AA');
      cy.testKeyboardNavigation();
      
      // Step 2: Service request creation
      cy.get('[data-testid="request-service"]').click();
      cy.validateWCAG('AA');
      
      // Step 3: Form completion
      cy.get('[data-testid="service-type-select"]').select('pickup');
      cy.validateWCAG('AA');
      
      // Step 4: Submission and confirmation
      cy.get('[data-testid="submit-request"]').click();
      cy.validateWCAG('AA');
      
      // Verify no accessibility violations throughout flow
      cy.checkA11y();
    });

    it('should maintain accessibility during dynamic updates', () => {
      cy.loginAsRole('fleet_manager');
      
      // Initial accessibility check
      cy.validateWCAG('AA');
      
      // Simulate dynamic content updates
      cy.simulateGPSUpdate({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5,
      });
      
      cy.waitForWebSocketUpdate();
      
      // Verify accessibility is maintained after updates
      cy.validateWCAG('AA');
      
      // Test screen reader announcements
      cy.get('[aria-live]').should('exist');
    });
  });
});