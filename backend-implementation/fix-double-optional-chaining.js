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

function fixDoubleOptionalChaining(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Fix double optional chaining patterns
    const patterns = [
      // Fix ??.property to ?.property
      { from: /(\w+)\?\?\.(\w+)/g, to: '$1?.$2' },
      // Fix ??.method() to ?.method()
      { from: /(\w+)\?\?\.(\w+)\s*\(/g, to: '$1?.$2(' },
      // Fix array access with ??.[
      { from: /(\w+)\?\?\.\[/g, to: '$1?.[' },
    ];
    
    for (const pattern of patterns) {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed double optional chaining in: ${filePath}`);
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

console.log(`Processing ${tsFiles.length} TypeScript files...`);

for (const file of tsFiles) {
  if (fixDoubleOptionalChaining(file)) {
    fixedFiles++;
  }
}

console.log(`Fixed double optional chaining in ${fixedFiles} files.`);