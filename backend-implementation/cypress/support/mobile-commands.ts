/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - CYPRESS MOBILE RESPONSIVENESS COMMANDS
 * ============================================================================
 *
 * Custom Cypress commands for comprehensive mobile responsiveness testing
 * including touch interactions, responsive layouts, mobile navigation,
 * and device-specific optimizations for waste management dashboards.
 *
 * Created by: Testing Agent
 * Date: 2025-08-16
 * Version: 1.0.0
 */

// Mobile viewport testing
Cypress.Commands.add('testMobileLayout', () => {
  const mobileWidth = Cypress.env('mobileWidth') || 375;
  
  cy.viewport(mobileWidth, 667); // iPhone SE dimensions
  cy.wait(500); // Allow layout to adjust
  
  // Verify responsive design principles
  testResponsiveElements();
  testMobileNavigation();
  testTouchTargets();
  testMobileTypography();
  testMobileSpacing();
  
  cy.log('Mobile layout validation completed');
});

Cypress.Commands.add('testTabletLayout', () => {
  const tabletWidth = Cypress.env('tabletWidth') || 768;
  
  cy.viewport(tabletWidth, 1024); // iPad dimensions
  cy.wait(500); // Allow layout to adjust
  
  // Verify tablet-specific adaptations
  testTabletSpecificElements();
  testTabletNavigation();
  testTouchTargets();
  
  cy.log('Tablet layout validation completed');
});

Cypress.Commands.add('testDesktopLayout', () => {
  const desktopWidth = Cypress.env('desktopWidth') || 1280;
  
  cy.viewport(desktopWidth, 720);
  cy.wait(500); // Allow layout to adjust
  
  // Verify desktop-specific features
  testDesktopSpecificElements();
  testDesktopNavigation();
  testMouseInteractions();
  
  cy.log('Desktop layout validation completed');
});

// Touch interface testing
Cypress.Commands.add('validateTouch', () => {
  // Test touch targets meet minimum size requirements
  cy.get('button, [role="button"], a, input, select, textarea').each(($element) => {
    cy.wrap($element).then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      
      // WCAG AA minimum touch target: 44x44px
      if (rect.width > 0 && rect.height > 0) {
        expect(rect.width).to.be.at.least(44, `Touch target too small: ${rect.width}x${rect.height}`);
        expect(rect.height).to.be.at.least(44, `Touch target too small: ${rect.width}x${rect.height}`);
      }
    });
  });
  
  // Test touch interactions
  testSwipeGestures();
  testTouchScrolling();
  testPinchZoom();
  
  cy.log('Touch interface validation completed');
});

// Device orientation testing
Cypress.Commands.add('testDeviceOrientation', () => {
  // Test portrait mode (default)
  cy.viewport(375, 667);
  testLayoutAdaptation('portrait');
  
  // Test landscape mode
  cy.viewport(667, 375);
  testLayoutAdaptation('landscape');
  
  // Return to portrait
  cy.viewport(375, 667);
  
  cy.log('Device orientation testing completed');
});

// Responsive breakpoint testing
Cypress.Commands.add('testResponsiveBreakpoints', () => {
  const breakpoints = [
    { name: 'mobile-small', width: 320, height: 568 },
    { name: 'mobile-medium', width: 375, height: 667 },
    { name: 'mobile-large', width: 414, height: 896 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1280, height: 720 },
    { name: 'desktop-large', width: 1920, height: 1080 },
  ];
  
  breakpoints.forEach((breakpoint) => {
    cy.viewport(breakpoint.width, breakpoint.height);
    cy.wait(500); // Allow layout adjustment
    
    // Test critical elements visibility and functionality
    testCriticalElementsAtBreakpoint(breakpoint.name);
    
    cy.log(`Breakpoint ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) validated`);
  });
});

// Mobile-specific feature testing
Cypress.Commands.add('testMobileSpecificFeatures', () => {
  cy.viewport(375, 667);
  
  // Test mobile menu functionality
  testMobileMenuBehavior();
  
  // Test pull-to-refresh if implemented
  testPullToRefresh();
  
  // Test mobile-optimized forms
  testMobileFormExperience();
  
  // Test mobile notification handling
  testMobileNotifications();
  
  cy.log('Mobile-specific features testing completed');
});

// Helper functions for responsive testing
function testResponsiveElements() {
  // Check that main navigation adapts to mobile
  cy.get('[data-testid="main-navigation"]').should('be.visible');
  
  // Verify mobile-friendly header
  cy.get('[data-testid="mobile-header"]').should('be.visible');
  
  // Check that content stacks vertically on mobile
  cy.get('[data-testid="dashboard-grid"]').then(($grid) => {
    if ($grid.length > 0) {
      const gridStyles = window.getComputedStyle($grid[0]);
      const gridTemplate = gridStyles.gridTemplateColumns;
      
      // Should be single column on mobile
      expect(gridTemplate).to.not.include('repeat');
    }
  });
  
  // Verify text remains readable
  cy.get('body').should('have.css', 'font-size').and('match', /1[4-6]px/);
}

function testMobileNavigation() {
  // Test hamburger menu
  cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible').click();
  cy.get('[data-testid="mobile-menu"]').should('be.visible');
  
  // Test menu items are accessible
  cy.get('[data-testid="mobile-menu"] a').should('have.length.at.least', 1);
  
  // Test menu closes when item is selected
  cy.get('[data-testid="mobile-menu"] a').first().click();
  cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
}

function testTouchTargets() {
  // Verify all interactive elements meet touch target requirements
  const interactiveSelectors = [
    'button',
    '[role="button"]',
    'a',
    'input[type="submit"]',
    'input[type="button"]',
    '[data-testid*="button"]',
    '[data-testid*="link"]',
  ];
  
  interactiveSelectors.forEach((selector) => {
    cy.get(selector).each(($element) => {
      cy.wrap($element).then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          expect(rect.width).to.be.at.least(44);
          expect(rect.height).to.be.at.least(44);
        }
      });
    });
  });
}

function testMobileTypography() {
  // Check font sizes are appropriate for mobile
  cy.get('h1').should('have.css', 'font-size').and('match', /2[4-8]px/);
  cy.get('h2').should('have.css', 'font-size').and('match', /2[0-4]px/);
  cy.get('p, div').first().should('have.css', 'font-size').and('match', /1[4-6]px/);
  
  // Check line height for readability
  cy.get('p').first().should('have.css', 'line-height').and('match', /1\.[4-6]/);
}

function testMobileSpacing() {
  // Check margins and padding are appropriate for mobile
  cy.get('[data-testid="dashboard-container"]').should('have.css', 'padding');
  
  // Verify touch-friendly spacing between elements
  cy.get('button').then(($buttons) => {
    if ($buttons.length > 1) {
      const firstRect = $buttons[0].getBoundingClientRect();
      const secondRect = $buttons[1].getBoundingClientRect();
      
      const verticalGap = Math.abs(secondRect.top - firstRect.bottom);
      const horizontalGap = Math.abs(secondRect.left - firstRect.right);
      
      // Minimum 8px spacing between touch targets
      if (verticalGap > 0) expect(verticalGap).to.be.at.least(8);
      if (horizontalGap > 0) expect(horizontalGap).to.be.at.least(8);
    }
  });
}

function testTabletSpecificElements() {
  // Test tablet navigation (may be different from mobile)
  cy.get('[data-testid="tablet-navigation"]').should('exist');
  
  // Test that tablet uses appropriate grid layouts
  cy.get('[data-testid="dashboard-grid"]').then(($grid) => {
    if ($grid.length > 0) {
      const gridStyles = window.getComputedStyle($grid[0]);
      const gridTemplate = gridStyles.gridTemplateColumns;
      
      // Should have 2-3 columns on tablet
      expect(gridTemplate.split(' ')).to.have.length.at.least(2);
    }
  });
}

function testTabletNavigation() {
  // Tablet may have different navigation patterns
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="tablet-sidebar"]').length > 0) {
      cy.get('[data-testid="tablet-sidebar"]').should('be.visible');
    } else if ($body.find('[data-testid="tablet-menu-toggle"]').length > 0) {
      cy.get('[data-testid="tablet-menu-toggle"]').click();
      cy.get('[data-testid="tablet-menu"]').should('be.visible');
    }
  });
}

function testDesktopSpecificElements() {
  // Test desktop-only features
  cy.get('[data-testid="desktop-sidebar"]').should('be.visible');
  cy.get('[data-testid="desktop-header"]').should('be.visible');
  
  // Test hover states
  cy.get('button').first().trigger('mouseover');
  cy.get('button').first().should('have.css', 'cursor', 'pointer');
}

function testDesktopNavigation() {
  // Test full navigation menu
  cy.get('[data-testid="desktop-navigation"]').should('be.visible');
  cy.get('[data-testid="desktop-navigation"] a').should('have.length.at.least', 1);
  
  // Test dropdown menus
  cy.get('[data-testid="nav-dropdown"]').then(($dropdown) => {
    if ($dropdown.length > 0) {
      cy.wrap($dropdown).trigger('mouseover');
      cy.get('[data-testid="nav-dropdown-menu"]').should('be.visible');
    }
  });
}

function testMouseInteractions() {
  // Test hover effects
  cy.get('button, [role="button"]').first().trigger('mouseover');
  cy.get('a').first().trigger('mouseover');
  
  // Test context menus if implemented
  cy.get('[data-testid="context-menu-trigger"]').then(($trigger) => {
    if ($trigger.length > 0) {
      cy.wrap($trigger).rightclick();
      cy.get('[data-testid="context-menu"]').should('be.visible');
    }
  });
}

function testSwipeGestures() {
  // Test swipe navigation if implemented
  cy.get('[data-testid="swipeable-container"]').then(($container) => {
    if ($container.length > 0) {
      cy.wrap($container)
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
        .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
        .trigger('touchend');
    }
  });
}

function testTouchScrolling() {
  // Test that scrolling works on touch devices
  cy.get('[data-testid="scrollable-container"]').then(($container) => {
    if ($container.length > 0) {
      cy.wrap($container).scrollTo('bottom');
      cy.wrap($container).scrollTo('top');
    }
  });
}

function testPinchZoom() {
  // Test pinch zoom behavior (should be disabled for dashboard)
  cy.get('meta[name="viewport"]').should('have.attr', 'content').and('include', 'user-scalable=no');
}

function testLayoutAdaptation(orientation: 'portrait' | 'landscape') {
  // Test that layout adapts appropriately to orientation
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  
  if (orientation === 'landscape') {
    // Landscape should utilize horizontal space better
    cy.get('[data-testid="dashboard-grid"]').then(($grid) => {
      if ($grid.length > 0) {
        const gridStyles = window.getComputedStyle($grid[0]);
        const gridTemplate = gridStyles.gridTemplateColumns;
        
        // Should have more columns in landscape
        expect(gridTemplate.split(' ')).to.have.length.at.least(2);
      }
    });
  }
}

function testCriticalElementsAtBreakpoint(breakpointName: string) {
  // Test that critical elements remain visible and functional
  cy.get('[data-testid="navigation-menu"]').should('be.visible');
  cy.get('[data-testid="user-menu"]').should('be.visible');
  
  // Test that text remains readable
  cy.get('body').should('have.css', 'font-size').and('match', /1[4-8]px/);
  
  // Test that buttons remain usable
  cy.get('button').first().should('be.visible').and('not.have.css', 'display', 'none');
}

function testMobileMenuBehavior() {
  // Test mobile menu toggle
  cy.get('[data-testid="mobile-menu-toggle"]').click();
  cy.get('[data-testid="mobile-menu"]').should('be.visible');
  
  // Test menu overlay behavior
  cy.get('[data-testid="menu-overlay"]').then(($overlay) => {
    if ($overlay.length > 0) {
      cy.wrap($overlay).click();
      cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
    }
  });
}

function testPullToRefresh() {
  // Test pull-to-refresh if implemented
  cy.get('[data-testid="pull-to-refresh-container"]').then(($container) => {
    if ($container.length > 0) {
      cy.wrap($container)
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 50 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 150 }] })
        .trigger('touchend');
      
      // Check for refresh indicator
      cy.get('[data-testid="refresh-indicator"]').should('be.visible');
    }
  });
}

function testMobileFormExperience() {
  // Test mobile-optimized forms
  cy.get('input').then(($inputs) => {
    if ($inputs.length > 0) {
      // Check for appropriate input types
      cy.wrap($inputs).each(($input) => {
        const type = $input.attr('type');
        if (type) {
          expect(['text', 'email', 'tel', 'number', 'password', 'search']).to.include(type);
        }
      });
      
      // Test keyboard behavior
      cy.get('input[type="email"]').then(($email) => {
        if ($email.length > 0) {
          cy.wrap($email).focus();
          // Email input should trigger email keyboard on mobile
        }
      });
    }
  });
}

function testMobileNotifications() {
  // Test mobile notification behavior
  cy.get('[data-testid="notification-trigger"]').then(($trigger) => {
    if ($trigger.length > 0) {
      cy.wrap($trigger).click();
      cy.get('[data-testid="mobile-notification"]').should('be.visible');
      
      // Test notification dismissal
      cy.get('[data-testid="dismiss-notification"]').click();
      cy.get('[data-testid="mobile-notification"]').should('not.be.visible');
    }
  });
}

// Declare additional mobile commands
declare global {
  namespace Cypress {
    interface Chainable {
      testMobileLayout(): Chainable<Element>;
      testTabletLayout(): Chainable<Element>;
      testDesktopLayout(): Chainable<Element>;
      validateTouch(): Chainable<Element>;
      testDeviceOrientation(): Chainable<Element>;
      testResponsiveBreakpoints(): Chainable<Element>;
      testMobileSpecificFeatures(): Chainable<Element>;
    }
  }
}