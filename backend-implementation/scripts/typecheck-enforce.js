#!/usr/bin/env node

/**
 * TypeScript Error Baseline Enforcement
 * 
 * Ensures TypeScript error count doesn't exceed the saved baseline.
 * Used as a regression gate in the TypeScript Zero-Error Remediation process.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(__dirname, '../types/ts-errors-baseline.json');

function getCurrentErrorCount() {
  try {
    const output = execSync('npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || echo 0', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      shell: true
    });
    return parseInt(output.trim()) || 0;
  } catch (error) {
    console.error('❌ Failed to get current error count:', error.message);
    process.exit(1);
  }
}

function getBaseline() {
  try {
    if (!fs.existsSync(BASELINE_FILE)) {
      console.log('📝 No baseline file found, creating initial baseline...');
      const currentErrors = getCurrentErrorCount();
      const baseline = {
        errorCount: currentErrors,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
      console.log(`✅ Created baseline with ${currentErrors} errors`);
      return baseline;
    }
    
    const baselineContent = fs.readFileSync(BASELINE_FILE, 'utf8');
    return JSON.parse(baselineContent);
  } catch (error) {
    console.error('❌ Failed to read baseline file:', error.message);
    process.exit(1);
  }
}

function updateBaseline(newErrorCount) {
  const baseline = {
    errorCount: newErrorCount,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(`📝 Updated baseline to ${newErrorCount} errors`);
}

function main() {
  const args = process.argv.slice(2);
  const shouldUpdate = args.includes('--update');
  
  console.log('🔍 Checking TypeScript error baseline...');
  
  const currentErrors = getCurrentErrorCount();
  const baseline = getBaseline();
  
  console.log(`Current errors: ${currentErrors}`);
  console.log(`Baseline errors: ${baseline.errorCount}`);
  console.log(`Baseline date: ${baseline.timestamp}`);
  
  if (shouldUpdate) {
    updateBaseline(currentErrors);
    console.log('✅ Baseline updated successfully');
    return;
  }
  
  if (currentErrors > baseline.errorCount) {
    console.error(`❌ REGRESSION DETECTED!`);
    console.error(`Current errors (${currentErrors}) exceed baseline (${baseline.errorCount})`);
    console.error(`Increase: +${currentErrors - baseline.errorCount} errors`);
    console.error('');
    console.error('To fix this:');
    console.error('1. Fix the TypeScript errors that were introduced');
    console.error('2. Or run: npm run typecheck:enforce -- --update (if intentional)');
    process.exit(1);
  }
  
  if (currentErrors < baseline.errorCount) {
    const improvement = baseline.errorCount - currentErrors;
    console.log(`🎉 IMPROVEMENT DETECTED!`);
    console.log(`Reduced errors by ${improvement} (${currentErrors} < ${baseline.errorCount})`);
    console.log('Consider updating baseline with: npm run typecheck:enforce -- --update');
  } else {
    console.log('✅ No regression detected - error count matches baseline');
  }
}

if (require.main === module) {
  main();
}