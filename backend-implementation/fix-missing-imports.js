#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common missing imports for different patterns
const COMMON_IMPORTS = {
  'body': "import { body } from 'express-validator';",
  'query': "import { query } from 'express-validator';", 
  'param': "import { param } from 'express-validator';",
  'ValidationResult': "import { ValidationResult } from 'express-validator';",
  'validationResult': "import { validationResult } from 'express-validator';",
  'InferAttributes': "import { InferAttributes, InferCreationAttributes } from 'sequelize';",
  'InferCreationAttributes': "import { InferAttributes, InferCreationAttributes } from 'sequelize';"
};

// Get all files with TS2304 errors (cannot find name)
const getMissingImportErrors = () => {
  try {
    const output = execSync('npx tsc --noEmit --skipLibCheck 2>&1 | grep "TS2304"', { encoding: 'utf8' });
    const lines = output.split('\n').filter(line => line.trim());
    
    const errors = [];
    for (const line of lines) {
      const match = line.match(/^([^(]+)\((\d+),(\d+)\).*Cannot find name '([^']+)'/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          missingName: match[4]
        });
      }
    }
    return errors;
  } catch (error) {
    console.log('No TS2304 errors found or compilation succeeded');
    return [];
  }
};

// Fix missing imports in a file
const fixMissingImports = (filePath, missingNames) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const uniqueMissingNames = [...new Set(missingNames)];
  
  for (const missingName of uniqueMissingNames) {
    if (COMMON_IMPORTS[missingName]) {
      // Check if import already exists
      const importStatement = COMMON_IMPORTS[missingName];
      const existsPattern = new RegExp(missingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      
      // Don't add if already imported
      if (!content.includes(missingName) || content.includes(`import.*${missingName}`)) {
        continue;
      }
      
      // Find the last import statement to add after it
      const importLines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].trim().startsWith('import ') && 
            !importLines[i].includes('//') &&
            !importLines[i].includes('/*')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        importLines.splice(lastImportIndex + 1, 0, importStatement);
        content = importLines.join('\n');
        changed = true;
        console.log(`Added ${missingName} import to ${filePath}`);
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
};

// Also fix common validation patterns
const fixValidationPatterns = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix common validation issues
  // 1. Replace .withMessage() calls with proper Joi syntax
  if (content.includes('.withMessage(') && content.includes('import Joi from')) {
    // This file is mixing express-validator with Joi - needs manual review
    console.log(`WARNING: ${filePath} mixes express-validator and Joi - needs manual review`);
  }

  // 2. Fix InferAttributes usage
  if (content.includes('InferAttributes<') && !content.includes('import.*InferAttributes')) {
    const sequelizeImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"](sequelize|@sequelize\/core)['"]/);
    if (sequelizeImportMatch) {
      const imports = sequelizeImportMatch[1];
      if (!imports.includes('InferAttributes')) {
        const newImports = imports + ', InferAttributes, InferCreationAttributes';
        content = content.replace(sequelizeImportMatch[0], 
          `import { ${newImports} } from "${sequelizeImportMatch[2]}"`);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed validation patterns in: ${filePath}`);
  }
};

// Main execution
const main = () => {
  console.log('Fixing missing imports and validation patterns...');
  
  const errors = getMissingImportErrors();
  if (errors.length === 0) {
    console.log('No missing import errors found!');
    return;
  }

  console.log(`Found ${errors.length} missing import errors`);

  // Group errors by file
  const errorsByFile = {};
  for (const error of errors) {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error.missingName);
  }

  // Fix each file
  for (const [filePath, missingNames] of Object.entries(errorsByFile)) {
    fixMissingImports(filePath, missingNames);
    fixValidationPatterns(filePath);
  }

  console.log('Missing import fixes completed!');
};

main();