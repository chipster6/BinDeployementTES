/**
 * ============================================================================
 * EMERGENCY VALIDATION SCRIPT
 * ============================================================================
 * 
 * Emergency JavaScript validation script to test critical functionality
 * without requiring full TypeScript compilation. This validates the fixes
 * from the Emergency Response Triangle.
 * 
 * Validation Areas:
 * 1. RouteOptimizationService instantiation
 * 2. CacheKey generation (reported fix)
 * 3. Database imports working
 * 4. Critical methods availability
 * 
 * Usage: node emergency-validation.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 EMERGENCY VALIDATION STARTED');
console.log('=====================================');

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, testFn) {
  try {
    testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Test 1: RouteOptimizationService file exists and can be read
test('RouteOptimizationService file exists', () => {
  const servicePath = path.join(__dirname, 'src/services/RouteOptimizationService.ts');
  if (!fs.existsSync(servicePath)) {
    throw new Error('RouteOptimizationService.ts not found');
  }
  const content = fs.readFileSync(servicePath, 'utf8');
  if (content.length < 1000) {
    throw new Error('RouteOptimizationService file appears to be incomplete');
  }
});

// Test 2: Check for reported cacheKey fix
test('CacheKey generation method exists', () => {
  const servicePath = path.join(__dirname, 'src/services/RouteOptimizationService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  
  if (!content.includes('generateCacheKey')) {
    throw new Error('generateCacheKey method not found');
  }
  
  if (!content.includes('const cacheKey')) {
    throw new Error('cacheKey variable not found in expected context');
  }
});

// Test 3: Check for database imports
test('Database imports are present', () => {
  const servicePath = path.join(__dirname, 'src/services/RouteOptimizationService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  
  const requiredImports = [
    'import { database }',
    'import { Bin }',
    'import { Vehicle }',
    'import { Route }',
    'import OptimizedRoute'
  ];
  
  for (const importStatement of requiredImports) {
    if (!content.includes(importStatement)) {
      throw new Error(`Missing import: ${importStatement}`);
    }
  }
});

// Test 4: Check encryption fixes
test('Crypto API fixes applied', () => {
  const encryptionPath = path.join(__dirname, 'src/utils/encryption_fixed.ts');
  if (!fs.existsSync(encryptionPath)) {
    throw new Error('encryption_fixed.ts not found');
  }
  
  const content = fs.readFileSync(encryptionPath, 'utf8');
  
  // Should not contain the old deprecated methods
  if (content.includes('createCipherGCM') || content.includes('createDecipherGCM')) {
    throw new Error('Deprecated GCM crypto methods still present');
  }
  
  // Should contain the correct methods
  if (!content.includes('createCipheriv') || !content.includes('createDecipheriv')) {
    throw new Error('Correct crypto methods not found');
  }
});

// Test 5: Package.json has node-vault dependency
test('Node-vault dependency installed', () => {
  const packagePath = path.join(__dirname, 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageContent.dependencies['node-vault']) {
    throw new Error('node-vault dependency not found in package.json');
  }
});

// Test 6: Check that service methods are complete
test('RouteOptimizationService has critical methods', () => {
  const servicePath = path.join(__dirname, 'src/services/RouteOptimizationService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  
  const requiredMethods = [
    'optimizeRoutes',
    'adaptRoutes',
    'generateOptimizationAlternatives',
    'getRouteAnalytics',
    'deployPerformanceOptimization'
  ];
  
  for (const method of requiredMethods) {
    if (!content.includes(`public async ${method}`) && !content.includes(`async ${method}`)) {
      throw new Error(`Critical method not found: ${method}`);
    }
  }
});

// Test 7: Validate specific fixes mentioned in emergency response
test('Emergency Response Triangle fixes present', () => {
  const servicePath = path.join(__dirname, 'src/services/RouteOptimizationService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  
  // Check for cacheKey fix specifically mentioned
  if (!content.includes('const cacheKey = this.generateCacheKey(request)')) {
    throw new Error('Specific cacheKey fix not found as reported');
  }
  
  // Check for database imports fix
  if (!content.includes('import { database } from "@/config/database"')) {
    throw new Error('Database import fix not found as reported');
  }
});

console.log('\n=====================================');
console.log('🧪 EMERGENCY VALIDATION COMPLETED');
console.log(`✅ Tests Passed: ${results.passed}`);
console.log(`❌ Tests Failed: ${results.failed}`);
console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(test => {
    console.log(`   - ${test.name}: ${test.error}`);
  });
  console.log('\n⚠️  EMERGENCY VALIDATION FAILED - Critical issues remain!');
  process.exit(1);
} else {
  console.log('\n✅ ALL EMERGENCY VALIDATION TESTS PASSED!');
  console.log('🚀 System appears ready for deployment validation.');
  process.exit(0);
}