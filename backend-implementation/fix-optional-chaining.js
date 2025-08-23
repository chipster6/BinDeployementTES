#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixOptionalChaining(dir) {
  const files = fs.readdirSync(dir);
  let totalFiles = 0;
  let fixedFiles = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = fixOptionalChaining(filePath);
      totalFiles += result.totalFiles;
      fixedFiles += result.fixedFiles;
    } else if (file.endsWith('.ts')) {
      totalFiles++;
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Common optional chaining patterns for undefined checks
      const patterns = [
        // req.body.property?.length -> req.body?.property?.length
        { from: /req\.body\.([a-zA-Z_$][a-zA-Z0-9_$]*)\?\.length/g, to: 'req.body?.$1?.length' },
        { from: /req\.query\.([a-zA-Z_$][a-zA-Z0-9_$]*)\?\.length/g, to: 'req.query?.$1?.length' },
        { from: /req\.params\.([a-zA-Z_$][a-zA-Z0-9_$]*)\?\.length/g, to: 'req.params?.$1?.length' },
        
        // Add null checks before property access
        { from: /(\w+)\.length \|\| 0/g, to: '$1?.length || 0' },
        { from: /(\w+)\.message/g, to: '$1?.message' },
        { from: /(\w+)\.stack/g, to: '$1?.stack' },
        
        // Common property access patterns that might be undefined
        { from: /\.([a-zA-Z_$][a-zA-Z0-9_$]*) \|\| ([\w'"'`\[\]{}]+)/g, to: '?.$1 || $2' }
      ];

      for (const { from, to } of patterns) {
        const original = content;
        content = content.replace(from, to);
        if (content !== original) {
          modified = true;
        }
      }

      // Fix specific undefined property access patterns
      const undefinedPatterns = [
        // Process property access that might be undefined
        /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*) \|\| (null|undefined)/g
      ];

      for (const pattern of undefinedPatterns) {
        const original = content;
        content = content.replace(pattern, '$1?.$2 || $3');
        if (content !== original) {
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
        console.log(`Fixed optional chaining: ${filePath}`);
      }
    }
  }

  return { totalFiles, fixedFiles };
}

// Start fixing from src directory
const srcDir = path.join(__dirname, 'src');
const result = fixOptionalChaining(srcDir);

console.log(`\n=== OPTIONAL CHAINING FIXING COMPLETE ===`);
console.log(`Total TypeScript files processed: ${result.totalFiles}`);
console.log(`Files with optional chaining fixed: ${result.fixedFiles}`);