#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with TS1484 errors
const getTypeImportErrors = () => {
  try {
    const output = execSync('npx tsc --noEmit --skipLibCheck 2>&1 | grep "TS1484"', { encoding: 'utf8' });
    const lines = output.split('\n').filter(line => line.trim());
    
    const errors = [];
    for (const line of lines) {
      const match = line.match(/^([^(]+)\((\d+),(\d+)\).*'([^']+)' is a type/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          typeName: match[4]
        });
      }
    }
    return errors;
  } catch (error) {
    console.log('No TS1484 errors found or compilation succeeded');
    return [];
  }
};

// Fix type imports in a file
const fixTypeImports = (filePath, typeNames) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const typeName of typeNames) {
    // Pattern 1: import { TypeName } from '...'
    const pattern1 = new RegExp(`(import\\s*{)([^}]*?)\\b${typeName}\\b([^}]*?)(}\\s*from\\s*['"'][^'"]+['"])`, 'g');
    if (pattern1.test(content)) {
      content = content.replace(pattern1, (match, p1, p2, p3, p4) => {
        const imports = (p2 + p3).split(',').map(imp => imp.trim()).filter(imp => imp);
        const newImports = imports.map(imp => {
          if (imp === typeName) {
            return `type ${typeName}`;
          }
          return imp;
        });
        return `${p1} ${newImports.join(', ')} ${p4}`;
      });
      changed = true;
    }

    // Pattern 2: import { type TypeName } already exists - skip
    // Pattern 3: import TypeName (default import that's actually a type)
    const pattern3 = new RegExp(`(import\\s+)${typeName}(\\s+from\\s*['"'][^'"]+['"])`, 'g');
    if (pattern3.test(content)) {
      content = content.replace(pattern3, `$1type { ${typeName} }$2`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed type imports in: ${filePath}`);
  }
};

// Main execution
const main = () => {
  console.log('Fixing type-only imports...');
  
  const errors = getTypeImportErrors();
  if (errors.length === 0) {
    console.log('No type-only import errors found!');
    return;
  }

  console.log(`Found ${errors.length} type-only import errors`);

  // Group errors by file
  const errorsByFile = {};
  for (const error of errors) {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error.typeName);
  }

  // Fix each file
  for (const [filePath, typeNames] of Object.entries(errorsByFile)) {
    const uniqueTypeNames = [...new Set(typeNames)];
    fixTypeImports(filePath, uniqueTypeNames);
  }

  console.log('Type-only import fixes completed!');
};

main();