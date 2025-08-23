#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixResponseHelperCalls(dir) {
  const files = fs.readdirSync(dir);
  let totalFiles = 0;
  let fixedFiles = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = fixResponseHelperCalls(filePath);
      totalFiles += result.totalFiles;
      fixedFiles += result.fixedFiles;
    } else if (file.endsWith('.ts')) {
      totalFiles++;
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Pattern: ResponseHelper.success(res, data, message, metadata) 
      // Should be: ResponseHelper.success(res, req, { data, message, metadata })
      const successPattern = /ResponseHelper\.success\(\s*res,\s*([^,]+),\s*(['"][^'"]*['"]|\`[^`]*\`),\s*(\{[^}]*\})\s*\);?/g;
      
      const successMatches = [...content.matchAll(successPattern)];
      if (successMatches.length > 0) {
        for (const match of successMatches) {
          const [fullMatch, dataArg, messageArg, metadataArg] = match;
          
          // Create the new success call format
          const newCall = `ResponseHelper.success(res, req, { 
            data: ${dataArg}, 
            message: ${messageArg}, 
            metadata: ${metadataArg} 
          });`;
          
          content = content.replace(fullMatch, newCall);
          modified = true;
        }
      }

      // Pattern: ResponseHelper.error(res, message, statusCode, metadata)
      // Should be: ResponseHelper.error(res, req, { message, statusCode, metadata })
      const errorPattern = /ResponseHelper\.error\(\s*res,\s*(['"][^'"]*['"]|\`[^`]*\`|[^,]+),\s*(\d+),?\s*(\{[^}]*\})?\s*\);?/g;
      
      const errorMatches = [...content.matchAll(errorPattern)];
      if (errorMatches.length > 0) {
        for (const match of errorMatches) {
          const [fullMatch, messageArg, statusCodeArg, metadataArg] = match;
          
          // Create the new error call format
          const newCall = metadataArg ? 
            `ResponseHelper.error(res, req, { message: ${messageArg}, statusCode: ${statusCodeArg}, metadata: ${metadataArg} });` :
            `ResponseHelper.error(res, req, { message: ${messageArg}, statusCode: ${statusCodeArg} });`;
          
          content = content.replace(fullMatch, newCall);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
        console.log(`Fixed ResponseHelper calls: ${filePath}`);
      }
    }
  }

  return { totalFiles, fixedFiles };
}

// Start fixing from src directory
const srcDir = path.join(__dirname, 'src');
const result = fixResponseHelperCalls(srcDir);

console.log(`\n=== RESPONSE HELPER FIXING COMPLETE ===`);
console.log(`Total TypeScript files processed: ${result.totalFiles}`);
console.log(`Files with ResponseHelper calls fixed: ${result.fixedFiles}`);