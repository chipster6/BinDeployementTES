#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');

console.log('Removing remaining express-validator patterns...');

// Get all TypeScript controller files
const controllerFiles = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
  .map(file => path.join(controllersDir, file));

controllerFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    const originalContent = content;

    // Remove req.validationResult() calls and related validation code
    // Pattern: const errors = req.validationResult();
    content = content.replace(/const\s+errors\s*=\s*req\.validationResult\(\);?\s*\n?/g, '');
    
    // Pattern: if (!errors.isEmpty()) { ... }
    content = content.replace(/if\s*\(\s*!errors\.isEmpty\(\)\s*\)\s*{[\s\S]*?return;\s*}/g, '');
    
    // Remove body(), param(), query() validation chains
    content = content.replace(/^\s*(body|param|query)\([^)]*\)[^\n]*\n?/gm, '');
    
    // Remove standalone validation array patterns like: [body(...), body(...)]
    content = content.replace(/export\s+const\s+\w+Validation\s*=\s*\[[\s\S]*?\];?\s*\n?/g, '');
    
    // Remove validation middleware arrays at the end of functions
    content = content.replace(/\],?\s*$/m, '');

    if (content !== originalContent) {
      hasChanges = true;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${path.basename(filePath)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
  }
});

// Specific fixes for individual controllers
console.log('\nApplying specific controller fixes...');

// Fix AuthController - Replace validation arrays with simple route handlers
const authControllerPath = path.join(controllersDir, 'AuthController.ts');
if (fs.existsSync(authControllerPath)) {
  let content = fs.readFileSync(authControllerPath, 'utf8');
  
  // Remove validation export arrays
  content = content.replace(/export\s+const\s+\w+Validation[\s\S]*?;/g, '');
  
  // Clean up any remaining validation patterns
  content = content.replace(/\[[\s\S]*?body\([^)]*\)[\s\S]*?\]/g, '[]');
  
  fs.writeFileSync(authControllerPath, content, 'utf8');
  console.log('✅ Fixed AuthController validation patterns');
}

// Fix BinController - Similar fixes
const binControllerPath = path.join(controllersDir, 'BinController.ts');
if (fs.existsSync(binControllerPath)) {
  let content = fs.readFileSync(binControllerPath, 'utf8');
  
  // Replace validationResult calls with simple continue
  content = content.replace(/\/\/ Check validation results[\s\S]*?return;\s*}/g, '// No validation required');
  
  fs.writeFileSync(binControllerPath, content, 'utf8');
  console.log('✅ Fixed BinController validation patterns');
}

// Fix CustomerController - Similar fixes  
const customerControllerPath = path.join(controllersDir, 'CustomerController.ts');
if (fs.existsSync(customerControllerPath)) {
  let content = fs.readFileSync(customerControllerPath, 'utf8');
  
  // Replace validationResult calls with simple continue
  content = content.replace(/\/\/ Validate request[\s\S]*?return;\s*}/g, '// No validation required');
  
  fs.writeFileSync(customerControllerPath, content, 'utf8');
  console.log('✅ Fixed CustomerController validation patterns');
}

console.log('✅ Validation pattern cleanup complete!');