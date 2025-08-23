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

function fixComplexOptionalChaining(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // More comprehensive patterns to fix remaining issues
    const patterns = [
      // Fix method call results with double optional chaining: .method()??.property
      { from: /(\.\w+\([^)]*\))\?\?\.(\w+)/g, to: '$1?.$2' },
      
      // Fix array access with double optional chaining: [index]??.property
      { from: /(\[[^\]]+\])\?\?\.(\w+)/g, to: '$1?.$2' },
      
      // Fix complex chained access: .method().get('key')??.property
      { from: /(\.\w+\([^)]*\))\?\?\.(\w+)/g, to: '$1?.$2' },
      
      // Fix generic access patterns: anything??.property
      { from: /([^?])\?\?\.(\w+)/g, to: '$1?.$2' },
      
      // Fix method calls with double optional: .method()??.anotherMethod()
      { from: /(\.\w+\([^)]*\))\?\?\.(\w+\s*\()/g, to: '$1?.$2' },
      
      // Fix array access patterns: arr[0]??.prop
      { from: /(\[[^\]]*\])\?\?\.(\w+)/g, to: '$1?.$2' },
    ];
    
    // Apply patterns iteratively until no more changes
    let iterations = 0;
    const maxIterations = 5;
    
    while (iterations < maxIterations) {
      let hasChanges = false;
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern.from, pattern.to);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
          modified = true;
        }
      }
      
      if (!hasChanges) break;
      iterations++;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed remaining optional chaining patterns in: ${filePath}`);
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

console.log(`Processing ${tsFiles.length} TypeScript files for remaining optional chaining issues...`);

for (const file of tsFiles) {
  if (fixComplexOptionalChaining(file)) {
    fixedFiles++;
  }
}

console.log(`Fixed remaining optional chaining patterns in ${fixedFiles} files.`);