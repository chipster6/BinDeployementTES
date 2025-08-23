#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixCatchErrors(dir) {
  const files = fs.readdirSync(dir);
  let totalFiles = 0;
  let fixedFiles = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = fixCatchErrors(filePath);
      totalFiles += result.totalFiles;
      fixedFiles += result.fixedFiles;
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      totalFiles++;
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Pattern 1: } catch (error) { -> } catch (error: unknown) {
      const catchPattern = /} catch \(error\) \{/g;
      if (catchPattern.test(content)) {
        content = content.replace(/} catch \(error\) \{/g, '} catch (error: unknown) {');
        modified = true;
      }

      // Pattern 2: error.message -> error instanceof Error ? error.message : String(error)
      const errorMessagePattern = /(?<!error instanceof Error \? )error\.message/g;
      if (errorMessagePattern.test(content)) {
        content = content.replace(/(?<!error instanceof Error \? )error\.message/g, 
          'error instanceof Error ? error.message : String(error)');
        modified = true;
      }

      // Pattern 3: error.stack -> error instanceof Error ? error.stack : undefined
      const errorStackPattern = /(?<!error instanceof Error \? )error\.stack/g;
      if (errorStackPattern.test(content)) {
        content = content.replace(/(?<!error instanceof Error \? )error\.stack/g, 
          'error instanceof Error ? error.stack : undefined');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
        console.log(`Fixed: ${filePath}`);
      }
    }
  }

  return { totalFiles, fixedFiles };
}

// Start fixing from src directory
const srcDir = path.join(__dirname, 'src');
const result = fixCatchErrors(srcDir);

console.log(`\n=== CATCH ERROR FIXING COMPLETE ===`);
console.log(`Total TypeScript files processed: ${result.totalFiles}`);
console.log(`Files with catch errors fixed: ${result.fixedFiles}`);