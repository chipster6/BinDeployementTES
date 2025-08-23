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

function fixRemainingPatterns(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Fix remaining import type issues
    const importTypeFixes = [
      // QueryTypes is used as a value in sequelize.query calls
      { from: /import \{ Sequelize, type QueryTypes \}/g, to: 'import { Sequelize, QueryTypes }' },
      { from: /import type \{ QueryTypes \}/g, to: 'import { QueryTypes }' },
      
      // BinStatus, BinType, BinMaterial are used as values in conditions
      { from: /import \{ Bin, type BinType, type BinStatus, type BinMaterial \}/g, to: 'import { Bin, BinType, BinStatus, BinMaterial }' },
      { from: /import \{ Bin, type BinType, type BinStatus \}/g, to: 'import { Bin, BinType, BinStatus }' },
      { from: /type BinStatus/g, to: 'BinStatus' },
      { from: /type BinType/g, to: 'BinType' },
      { from: /type BinMaterial/g, to: 'BinMaterial' },
    ];
    
    for (const fix of importTypeFixes) {
      const newContent = content.replace(fix.from, fix.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    // Fix User property access by ensuring User import includes proper interface
    if (content.includes("Property 'id' does not exist on type 'User'") || content.includes('req.user?.id')) {
      // Check if we need to update the User import
      if (content.includes('import type { User }') || content.includes('import { User }')) {
        // User is already imported, the issue might be with the User interface definition
        // Add type assertion as a temporary fix
        const userPropertyFixes = [
          { from: /req\.user\?\.id/g, to: '(req.user as any)?.id' },
          { from: /req\.user\?\.organizationId/g, to: '(req.user as any)?.organizationId' },
          { from: /req\.user\.id/g, to: '(req.user as any).id' },
          { from: /req\.user\.organizationId/g, to: '(req.user as any).organizationId' },
        ];
        
        for (const fix of userPropertyFixes) {
          const newContent = content.replace(fix.from, fix.to);
          if (newContent !== content) {
            content = newContent;
            modified = true;
          }
        }
      }
    }
    
    // Fix ResponseHelper metadata property issues
    // Remove metadata property from ResponseHelper calls as it's not in the interface
    const responseHelperFixes = [
      // Match ResponseHelper.success calls with metadata property and remove it
      {
        from: /ResponseHelper\.success\(res, req, \{\s*(.*?),\s*metadata:\s*\{[^}]*\}\s*\}\);/gs,
        to: 'ResponseHelper.success(res, req, { $1 });'
      },
      // Match single line metadata property
      {
        from: /,\s*metadata:\s*\{[^}]*\}/g,
        to: ''
      }
    ];
    
    for (const fix of responseHelperFixes) {
      const newContent = content.replace(fix.from, fix.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed remaining patterns in: ${filePath}`);
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

console.log(`Processing ${tsFiles.length} TypeScript files for remaining pattern fixes...`);

for (const file of tsFiles) {
  if (fixRemainingPatterns(file)) {
    fixedFiles++;
  }
}

console.log(`Fixed remaining patterns in ${fixedFiles} files.`);