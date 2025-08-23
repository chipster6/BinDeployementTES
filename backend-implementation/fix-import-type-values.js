const fs = require('fs');
const path = require('path');

const srcDir = './src';

function findTSFiles(dir) {
  let tsFiles = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        scanDir(itemPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        tsFiles.push(itemPath);
      }
    }
  }
  
  scanDir(dir);
  return tsFiles;
}

function fixImportTypes(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Define imports that are commonly used as values (not just types)
    const valueImports = [
      'Sequelize', 'QueryTypes', 'Transaction', 'Op', 'DataTypes',
      'Model', 'Association', 'FindOptions', 'CreateOptions', 'UpdateOptions', 'DestroyOptions',
      'Bin', 'User', 'Customer', 'Organization', 'Vehicle', 'Driver', 'Route', 'ServiceEvent',
      'UserProfile', 'UserSecurity', 'Permission', 'RolePermission', 'AuditLog',
      'Request', 'Response', 'NextFunction', 'Application',
      'Router', 'Express', 'RequestHandler', 'ErrorRequestHandler',
      'Socket', 'Server', 'Namespace', 'BroadcastOperator'
    ];
    
    // Fix import type statements for value imports
    for (const importName of valueImports) {
      // Pattern: import type { ImportName } from '...'
      const importTypePattern = new RegExp(`import type \\{([^}]*\\b${importName}\\b[^}]*)\\}`, 'g');
      const matches = [...content.matchAll(importTypePattern)];
      
      for (const match of matches) {
        const fullMatch = match[0];
        const importList = match[1];
        
        // Check if this import is actually used as a value in the file
        // Look for patterns like: new ImportName, ImportName.method(), extends ImportName, implements ImportName
        const valueUsagePatterns = [
          new RegExp(`\\bnew\\s+${importName}\\b`, 'g'),
          new RegExp(`\\b${importName}\\.[a-zA-Z_]`, 'g'),
          new RegExp(`\\bextends\\s+${importName}\\b`, 'g'),
          new RegExp(`\\bimplements\\s+${importName}\\b`, 'g'),
          new RegExp(`\\b${importName}\\s*\\(`, 'g'), // Function calls
          new RegExp(`\\b${importName}\\s*\\.\\s*(sync|authenticate|query|create|findOne|findAll|update|destroy|bulkCreate)`, 'g')
        ];
        
        const isUsedAsValue = valueUsagePatterns.some(pattern => pattern.test(content));
        
        if (isUsedAsValue) {
          // Split the import list to separate types from values
          const imports = importList.split(',').map(imp => imp.trim());
          const typeOnlyImports = [];
          const valueImports = [];
          
          for (const imp of imports) {
            const cleanImport = imp.replace(/^type\s+/, '').trim();
            if (valueImports.includes(cleanImport) || cleanImport === importName) {
              valueImports.push(cleanImport);
            } else {
              typeOnlyImports.push(`type ${cleanImport}`);
            }
          }
          
          // Reconstruct the import statement
          let newImportStatement = '';
          if (valueImports.length > 0 && typeOnlyImports.length > 0) {
            // Mixed import: import { Value1, Value2, type Type1, type Type2 } from '...'
            const allImports = [...valueImports, ...typeOnlyImports].join(', ');
            newImportStatement = fullMatch.replace(`import type {${importList}}`, `import { ${allImports} }`);
          } else if (valueImports.length > 0) {
            // All value imports: import { Value1, Value2 } from '...'
            newImportStatement = fullMatch.replace(`import type {${importList}}`, `import { ${valueImports.join(', ')} }`);
          }
          
          if (newImportStatement && newImportStatement !== fullMatch) {
            content = content.replace(fullMatch, newImportStatement);
            modified = true;
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed import type usage in: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return false;
}

// Process all TypeScript files
const tsFiles = findTSFiles(srcDir);
let fixedFiles = 0;

console.log(`Processing ${tsFiles.length} TypeScript files for import type fixes...`);

for (const file of tsFiles) {
  if (fixImportTypes(file)) {
    fixedFiles++;
  }
}

console.log(`Fixed import type usage in ${fixedFiles} files.`);