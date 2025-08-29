#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Format OpenAPI contracts for consistency
 */
function formatOpenAPIContract(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(content);
    
    // Format with consistent indentation and structure
    const formatted = yaml.dump(parsed, {
      indent: 2,
      lineWidth: 120,
      noRefs: false,
      sortKeys: false
    });
    
    fs.writeFileSync(filePath, formatted);
    console.log(`✓ Formatted: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error formatting ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Validate OpenAPI contract structure
 */
function validateContract(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contract = yaml.load(content);
    
    const issues = [];
    
    // Basic structure validation
    if (!contract.openapi) issues.push('Missing openapi version');
    if (!contract.info) issues.push('Missing info section');
    if (!contract.paths) issues.push('Missing paths section');
    
    // Check for required headers in operations service
    if (filePath.includes('operations-service')) {
      const hasIdempotencySupport = JSON.stringify(contract).includes('Idempotency-Key');
      const hasETagSupport = JSON.stringify(contract).includes('If-Match');
      
      if (!hasIdempotencySupport) issues.push('Operations service should support Idempotency-Key header');
      if (!hasETagSupport) issues.push('Operations service should support If-Match header for concurrency control');
    }
    
    if (issues.length > 0) {
      console.warn(`⚠ Validation issues in ${filePath}:`);
      issues.forEach(issue => console.warn(`  - ${issue}`));
    } else {
      console.log(`✓ Validated: ${filePath}`);
    }
    
    return issues.length === 0;
  } catch (error) {
    console.error(`✗ Error validating ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Validate event examples
 */
function validateEventExamples() {
  const eventsDir = path.join(__dirname, '..', 'contracts', 'events', 'examples');
  
  if (!fs.existsSync(eventsDir)) {
    console.log('📝 No event examples directory found');
    return true;
  }
  
  const eventFiles = fs.readdirSync(eventsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(eventsDir, file));
  
  if (eventFiles.length === 0) {
    console.log('📝 No event examples found');
    return true;
  }
  
  console.log('🔍 Validating event examples...\n');
  
  let allValid = true;
  eventFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const event = JSON.parse(content);
      
      const issues = [];
      
      // Validate event envelope structure
      if (!event.event_id) issues.push('Missing event_id');
      if (!event.event_version) issues.push('Missing event_version');
      if (!event.occurred_at) issues.push('Missing occurred_at');
      if (!event.producer) issues.push('Missing producer');
      if (!event.data) issues.push('Missing data');
      
      // Validate UUID format for event_id
      if (event.event_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.event_id)) {
        issues.push('Invalid event_id UUID format');
      }
      
      // Validate ISO date format
      if (event.occurred_at && isNaN(Date.parse(event.occurred_at))) {
        issues.push('Invalid occurred_at date format');
      }
      
      if (issues.length > 0) {
        console.warn(`⚠ Validation issues in ${path.basename(file)}:`);
        issues.forEach(issue => console.warn(`  - ${issue}`));
        allValid = false;
      } else {
        console.log(`✓ Validated: ${path.basename(file)}`);
      }
    } catch (error) {
      console.error(`✗ Error validating ${path.basename(file)}:`, error.message);
      allValid = false;
    }
  });
  
  return allValid;
}

// Main execution
const contractsDir = path.join(__dirname, '..', 'contracts');
const contractFiles = fs.readdirSync(contractsDir)
  .filter(file => file.endsWith('.openapi.yaml') || file.endsWith('.yaml'))
  .map(file => path.join(contractsDir, file));

console.log('🔧 Formatting OpenAPI contracts...\n');

let allValid = true;
contractFiles.forEach(file => {
  const formatted = formatOpenAPIContract(file);
  const valid = validateContract(file);
  allValid = allValid && formatted && valid;
  console.log('');
});

// Validate event examples
const eventsValid = validateEventExamples();
allValid = allValid && eventsValid;

if (allValid) {
  console.log('\n✅ All contracts and events formatted and validated successfully');
  process.exit(0);
} else {
  console.log('\n❌ Some contracts or events have issues');
  process.exit(1);
}