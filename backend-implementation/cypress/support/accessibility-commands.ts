/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS ACCESSIBILITY COMMANDS
 * ============================================================================
 *
 * Custom Cypress commands for comprehensive accessibility testing including
 * WCAG 2.1 compliance validation, keyboard navigation, screen reader support,
 * and inclusive design verification for waste management dashboards.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import 'cypress-axe';

// WCAG 2.1 compliance testing
Cypress.Commands.add('validateWCAG', (level = 'AA') => {
  const wcagOptions = {
    runOnly: {
      type: 'tag',
      values: [`wcag2${level.toLowerCase()}`, 'wcag21aa', 'best-practice'],
    },
    rules: {
      // Configure specific rules for dashboard accessibility
      'color-contrast': { enabled: true },
      'keyboard-trap': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'aria-required-children': { enabled: true },
      'aria-required-parent': { enabled: true },
      'button-name': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'heading-order': { enabled: true },
      'html-has-lang': { enabled: true },
      'landmark-one-main': { enabled: true },
      'link-name': { enabled: true },
      'list': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'region': { enabled: true },
      'skip-link': { enabled: true },
      'tabindex': { enabled: true },
    },
  };
  
  cy.checkA11y(null, wcagOptions, (violations) => {
    if (violations.length > 0) {
      cy.log('WCAG Violations Found:');
      violations.forEach((violation) => {
        cy.log(`${violation.impact}: ${violation.description}`);
        violation.nodes.forEach((node) => {
          cy.log(`  Element: ${node.target[0]}`);
          cy.log(`  Fix: ${node.failureSummary}`);
        });
      });
    }
  });
  
  cy.log(`WCAG ${level} compliance validation completed`);
});

// Keyboard navigation testing
Cypress.Commands.add('testKeyboardNavigation', () => {
  // Start from the top of the page
  cy.get('body').focus();
  
  const focusableElements: string[] = [];
  let currentIndex = 0;
  
  // Tab through all focusable elements
  for (let i = 0; i < 50; i++) { // Limit to prevent infinite loops
    cy.focused().then(($focused) => {
      if ($focused.length > 0) {
        const elementInfo = getElementInfo($focused[0]);
        focusableElements.push(elementInfo);
        
        // Verify element is properly focused
        expect($focused[0]).to.have.focus;
        
        // Check for visible focus indicator
        cy.wrap($focused).should('have.css', 'outline').and('not.eq', 'none');
      }
    });
    
    // Tab to next element
    cy.focused().tab();
    
    // Check if we've reached the end (focus wrapped around)
    cy.focused().then(($newFocused) => {
      if ($newFocused.length > 0 && focusableElements.length > 0) {
        const newElementInfo = getElementInfo($newFocused[0]);
        if (newElementInfo === focusableElements[0]) {
          return false; // Break the loop
        }
      }
    });
  }
  
  cy.log(`Keyboard navigation tested through ${focusableElements.length} elements`);
  
  // Test reverse tabbing
  cy.focused().tab({ shift: true });
  cy.focused().should('exist');
  
  // Test escape key functionality
  cy.get('body').type('{esc}');
  
  // Test arrow key navigation in menus/lists
  cy.get('[role="menu"], [role="listbox"], [role="tablist"]').first().then(($menu) => {
    if ($menu.length > 0) {
      cy.wrap($menu).focus();
      cy.wrap($menu).type('{downarrow}');
      cy.wrap($menu).type('{uparrow}');
    }
  });
  
  cy.log('Keyboard navigation validation completed');
});

// Screen reader support testing
Cypress.Commands.add('testScreenReaderSupport', () => {
  // Check for proper semantic structure
  cy.get('h1').should('have.length.at.least', 1);
  cy.get('main').should('exist');
  cy.get('nav').should('exist');
  
  // Verify ARIA labels and descriptions
  cy.get('[aria-label]').each(($element) => {
    cy.wrap($element).should('have.attr', 'aria-label').and('not.be.empty');
  });
  
  cy.get('[aria-describedby]').each(($element) => {
    const describedById = $element.attr('aria-describedby');
    cy.get(`#${describedById}`).should('exist');
  });
  
  // Check for proper heading hierarchy
  let currentLevel = 0;
  cy.get('h1, h2, h3, h4, h5, h6').each(($heading) => {
    const level = parseInt($heading.prop('tagName').charAt(1));
    if (currentLevel === 0) {
      expect(level).to.eq(1); // First heading should be h1
    } else {
      expect(level).to.be.at.most(currentLevel + 1); // Don't skip levels
    }
    currentLevel = level;
  });
  
  // Verify form labels
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
  
  // Check for proper landmark regions
  cy.get('[role="banner"], header').should('exist');
  cy.get('[role="main"], main').should('exist');
  cy.get('[role="navigation"], nav').should('exist');
  cy.get('[role="contentinfo"], footer').should('exist');
  
  cy.log('Screen reader support validation completed');
});

// Color contrast testing
Cypress.Commands.add('testColorContrast', () => {
  // Test using axe-core color contrast rules
  cy.checkA11y(null, {
    runOnly: {
      type: 'tag',
      values: ['color-contrast'],
    },
  });
  
  // Additional manual contrast checks for key elements
  const importantSelectors = [
    '[data-testid="navigation-menu"] a',
    '[data-testid="dashboard-title"]',
    'button',
    '.alert, .warning, .error',
    '[data-testid="status-indicator"]',
  ];
  
  importantSelectors.forEach((selector) => {
    cy.get(selector).then(($elements) => {
      if ($elements.length > 0) {
        $elements.each((index, element) => {
          const styles = window.getComputedStyle(element);
          const bgColor = styles.backgroundColor;
          const textColor = styles.color;
          
          // Log colors for manual review
          cy.log(`${selector} - Background: ${bgColor}, Text: ${textColor}`);
        });
      }
    });
  });
  
  cy.log('Color contrast validation completed');
});

// Focus management testing
Cypress.Commands.add('testFocusManagement', () => {
  // Test modal focus management
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="open-modal"]').length > 0) {
      cy.get('[data-testid="open-modal"]').click();
      
      // Focus should move to modal
      cy.get('[role="dialog"]').should('be.visible');
      cy.focused().should('be.inside', '[role="dialog"]');
      
      // Tab should stay within modal
      cy.focused().tab();
      cy.focused().should('be.inside', '[role="dialog"]');
      
      // Escape should close modal and restore focus
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');
      cy.get('[data-testid="open-modal"]').should('have.focus');
    }
  });
  
  // Test dropdown focus management
  cy.get('[data-testid="dropdown-trigger"]').then(($dropdown) => {
    if ($dropdown.length > 0) {
      cy.wrap($dropdown).click();
      cy.get('[data-testid="dropdown-menu"]').should('be.visible');
      
      // Arrow keys should navigate options
      cy.wrap($dropdown).type('{downarrow}');
      cy.focused().should('have.attr', 'role', 'menuitem');
      
      // Escape should close and restore focus
      cy.get('body').type('{esc}');
      cy.wrap($dropdown).should('have.focus');
    }
  });
  
  cy.log('Focus management validation completed');
});

// Alternative text testing
Cypress.Commands.add('testAlternativeText', () => {
  // Check all images have alt text
  cy.get('img').each(($img) => {
    const alt = $img.attr('alt');
    const ariaLabel = $img.attr('aria-label');
    const role = $img.attr('role');
    
    // Decorative images should have empty alt or role="presentation"
    if (role === 'presentation' || alt === '') {
      cy.log('Decorative image found (acceptable)');
    } else {
      // Content images must have meaningful alt text
      expect(alt || ariaLabel).to.exist.and.not.be.empty;
      expect(alt || ariaLabel).to.have.length.at.least(3);
    }
  });
  
  // Check icons have appropriate labels
  cy.get('[data-testid*="icon"], .icon, svg').each(($icon) => {
    const ariaLabel = $icon.attr('aria-label');
    const ariaHidden = $icon.attr('aria-hidden');
    const title = $icon.attr('title');
    
    // Icons should either have labels or be hidden from screen readers
    if (ariaHidden !== 'true') {
      expect(ariaLabel || title).to.exist;
    }
  });
  
  cy.log('Alternative text validation completed');
});

// Dashboard-specific accessibility tests
Cypress.Commands.add('testDashboardAccessibility', (role: string) => {
  cy.log(`Testing accessibility for ${role} dashboard`);
  
  // Navigate to role-specific dashboard
  cy.navigateToDashboard();
  
  // Comprehensive accessibility validation
  cy.validateWCAG('AA');
  cy.testKeyboardNavigation();
  cy.testScreenReaderSupport();
  cy.testColorContrast();
  cy.testFocusManagement();
  cy.testAlternativeText();
  
  // Test role-specific accessibility features
  testRoleSpecificAccessibility(role);
  
  cy.log(`Dashboard accessibility validation completed for ${role}`);
});

// Mobile accessibility testing
Cypress.Commands.add('testMobileAccessibility', () => {
  // Switch to mobile viewport
  cy.viewport(375, 667);
  
  // Test touch accessibility
  cy.get('button, [role="button"]').each(($button) => {
    // Check minimum touch target size (44x44px)
    cy.wrap($button).then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.width).to.be.at.least(44);
      expect(rect.height).to.be.at.least(44);
    });
  });
  
  // Test mobile navigation accessibility
  cy.get('[data-testid="mobile-menu-toggle"]').then(($toggle) => {
    if ($toggle.length > 0) {
      cy.wrap($toggle).should('have.attr', 'aria-expanded');
      cy.wrap($toggle).click();
      cy.wrap($toggle).should('have.attr', 'aria-expanded', 'true');
    }
  });
  
  cy.log('Mobile accessibility validation completed');
});

// Helper functions
function getElementInfo(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const testId = element.getAttribute('data-testid') ? `[data-testid="${element.getAttribute('data-testid')}"]` : '';
  
  return `${tag}${id}${classes}${testId}`;
}

function testRoleSpecificAccessibility(role: string) {
  switch (role) {
    case 'driver':
      // Test mobile-first accessibility for drivers
      cy.testMobileAccessibility();
      
      // Test voice command accessibility hints
      cy.get('[data-testid="voice-command-hint"]').should('exist');
      break;
      
    case 'customer':
      // Test simplified navigation for customers
      cy.get('[data-testid="simplified-nav"]').should('exist');
      
      // Test large text options
      cy.get('[data-testid="text-size-controls"]').should('exist');
      break;
      
    case 'fleet_manager':
      // Test map accessibility
      cy.get('[data-testid="map-container"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="map-controls"]').should('be.visible');
      break;
      
    default:
      // Standard accessibility tests for admin roles
      cy.get('[data-testid="data-tables"]').each(($table) => {
        cy.wrap($table).should('have.attr', 'role', 'table');
        cy.wrap($table).find('th').should('have.attr', 'scope');
      });
      break;
  }
}

// Declare additional accessibility commands
declare global {
  namespace Cypress {
    interface Chainable {
      validateWCAG(level?: string): Chainable<Element>;
      testKeyboardNavigation(): Chainable<Element>;
      testScreenReaderSupport(): Chainable<Element>;
      testColorContrast(): Chainable<Element>;
      testFocusManagement(): Chainable<Element>;
      testAlternativeText(): Chainable<Element>;
      testDashboardAccessibility(role: string): Chainable<Element>;
      testMobileAccessibility(): Chainable<Element>;
    }
  }
}